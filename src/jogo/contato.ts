/**
 * O encontro da criança com os bichos e moradores (spec 026, o pedido do dono: "o personagem
 * atravessando objetos e bichos"). Em todo tema, do mesmo jeito:
 *
 * - **Na tela (o boneco):** o corpo de cada bicho é o retângulo do desenho dele, girado para onde
 *   ele olha. O boneco que entra nele é empurrado para fora devagarinho, de lado (escorrega em
 *   volta do bicho, como quem passa por um cachorro deitado): nunca uma parede que prende. De
 *   frente, o empurrão puxa para o lado em que o boneco já está, e ele contorna sozinho.
 * - **No núcleo (o bicho):** o bicho encostado numa criança dá passagem: sai devagar para o lado
 *   de lá, se o chão deixa. Num corredor, a lhama que segue o feno anda para trás em vez de
 *   tampar a saída.
 *
 * Puro: o núcleo (servidor local e nuvem) e a tela usam as mesmas contas.
 */
import { colideCorpo, type Solido } from '../player/fisica';
import type { TipoSer } from './criaturas';

/** O corpo de um ser no chão: o retângulo do desenho, girado (frente = (sen yaw, cos yaw)). */
export interface CorpoNoChao {
  x: number;
  y: number;
  z: number;
  /** Altura do corpo. */
  alt: number;
  /** Meia frente e meio lado do retângulo. */
  frente: number;
  lado: number;
  /** O meio do retângulo fica tanto à frente do centro do ser (a cabeça vai mais longe). */
  meio?: number;
  yaw: number;
}

export interface Contato {
  /** Quanto entrou (blocos). */
  pen: number;
  /** Para onde sair (unitário, no chão). */
  nx: number;
  nz: number;
}

/**
 * O quadrado de quem anda (centro x, z e meia largura mw) entra no corpo? Eixos separadores
 * (os dois do mundo e os dois do corpo): a menor entrada e a direção para sair por ela.
 */
export function contatoComCorpo(x: number, z: number, mw: number, c: CorpoNoChao): Contato | null {
  const fx = Math.sin(c.yaw);
  const fz = Math.cos(c.yaw);
  const meio = c.meio ?? 0;
  const cx = c.x + fx * meio;
  const cz = c.z + fz * meio;
  const dx = x - cx;
  const dz = z - cz;
  let melhor: Contato | null = null;
  for (const [ax, az] of [
    [1, 0],
    [0, 1],
    [fx, fz],
    [fz, -fx],
  ]) {
    const d = dx * ax + dz * az;
    const rq = mw * (Math.abs(ax) + Math.abs(az));
    const rc = c.frente * Math.abs(ax * fx + az * fz) + c.lado * Math.abs(ax * fz - az * fx);
    const pen = rq + rc - Math.abs(d);
    if (pen <= 0) return null;
    if (!melhor || pen < melhor.pen - 1e-9) {
      const s = d >= 0 ? 1 : -1;
      melhor = { pen, nx: ax * s, nz: az * s };
    }
  }
  return melhor;
}

/** Até quanto o empurrão tira o boneco de dentro de um bicho (blocos por segundo). */
export const VEL_DESENCOSTAR = 9;
/** Quanto o empurrão cresce com a entrada (por segundo): com 0,15 de entrada, 4,5 b/s. */
const GANHO_DESENCOSTAR = 30;
/** De frente para o bicho, quanto do empurrão vai para o lado (o boneco contorna). */
const DE_LADO = 0.7;

/**
 * Tira o boneco (pés em e.y, meia largura mw, altura alt) de dentro dos corpos, devagarinho e
 * de lado. `mx, mz`: para onde a criança está andando (o rumo do controle; 0 parada). O boneco
 * só vai para onde o mundo deixa (`s`); se nada deixa, fica (nunca entra num bloco).
 * Devolve quanto andou.
 */
export function desencostar(
  e: { x: number; y: number; z: number },
  corpos: readonly CorpoNoChao[],
  dt: number,
  s: Solido,
  mw: number,
  alt: number,
  mx = 0,
  mz = 0,
): number {
  let andou = 0;
  for (const c of corpos) {
    if (e.y >= c.y + c.alt || e.y + alt <= c.y) continue;
    const k = contatoComCorpo(e.x, e.z, mw, c);
    if (!k) continue;
    const passo = Math.min(k.pen, Math.min(VEL_DESENCOSTAR, k.pen * GANHO_DESENCOSTAR) * dt);
    let ux = k.nx;
    let uz = k.nz;
    // andando contra o bicho: parte do empurrão vai para o lado em que o boneco já está
    const contra = -(mx * k.nx + mz * k.nz);
    if (contra > 0.3) {
      const tx = -k.nz;
      const tz = k.nx;
      const lado = (e.x - c.x) * tx + (e.z - c.z) * tz;
      const sinal = Math.abs(lado) > 0.02 ? Math.sign(lado) : c.yaw >= 0 ? 1 : -1;
      ux += tx * sinal * DE_LADO * contra;
      uz += tz * sinal * DE_LADO * contra;
      const n = Math.hypot(ux, uz);
      ux /= n;
      uz /= n;
    }
    const dx = ux * passo;
    const dz = uz * passo;
    const livre = (x: number, z: number) => !colideCorpo(s, x, e.y, z, mw, alt);
    if (livre(e.x + dx, e.z + dz)) {
      e.x += dx;
      e.z += dz;
    } else if (livre(e.x + dx, e.z)) e.x += dx;
    else if (livre(e.x, e.z + dz)) e.z += dz;
    else continue;
    andou += passo;
  }
  return andou;
}

/**
 * O corpo de cada tipo para o núcleo (meia frente, meio lado): o meio-termo dos desenhos dos
 * temas (o núcleo não conhece o desenho; a tela usa o do tema). O bicho encostado nisso dá
 * passagem. O peixe fica de fora (na água).
 */
export const CORPO_DO_SER: Record<TipoSer, [number, number]> = {
  cervo: [0.8, 0.38],
  coelho: [0.3, 0.2],
  peixe: [0.28, 0.15],
  espectro: [0.4, 0.36],
  raposa: [0.6, 0.25],
  morador: [0.3, 0.3],
};

/**
 * As medidas do corpo no desenho de um tema (as peças do bicho, com a frente em +z): meia
 * frente, meio lado e quanto o meio do retângulo fica à frente do centro (a cabeça vai mais
 * longe que o rabo). Nunca menor que a caixa de colisão do jogo (`mw`).
 */
export function corpoDoDesenho(
  pecas: readonly { t: readonly number[]; p: readonly number[] }[] | undefined,
  mw: number,
): [frente: number, lado: number, meio: number] {
  let frente = 0;
  let tras = 0;
  let lado = 0;
  for (const q of pecas ?? []) {
    frente = Math.max(frente, q.p[2] + q.t[2] / 2);
    tras = Math.max(tras, -(q.p[2] - q.t[2] / 2));
    lado = Math.max(lado, Math.abs(q.p[0]) + q.t[0] / 2);
  }
  if (frente + tras < 2 * mw) frente = tras = mw;
  return [(frente + tras) / 2 + 0.02, Math.max(lado, mw * 0.8) + 0.02, (frente - tras) / 2];
}

/** Quão rápido o bicho dá passagem (blocos por segundo). */
export const VEL_DAR_PASSAGEM = 3;
/**
 * O bicho já dá passagem com a criança a menos disto do corpo dele (blocos): encostada,
 * empurrando, ele vai andando para trás e ela passa (num corredor, a lhama não tampa a saída).
 */
export const FOLGA_PASSAGEM = 0.25;
