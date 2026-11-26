/**
 * Spec 038 (T02): o joelho do boneco, só nos brinquedos de pedal e de apoio (a bicicletinha, o
 * carrinho de pedal e a motoquinha). Só dados e contas, sem desenho:
 * - `dividirPernas`: a perna, que é uma peça só do quadril ao sapato, vira a coxa (na junta da
 *   perna) e a canela com o sapato (num nó próprio, o joelho, dentro da perna). Esticada, é a
 *   mesma perna de antes: as duas caixas se cruzam no joelho. As roupas da perna vão junto: a
 *   peça vai para a canela pelo nome (o sapato, a bota, o tênis, a polaina, a pantufa, a
 *   joelheira) ou pelo ponto mais baixo dela;
 * - `pernaAte`: o giro da perna e do joelho que leva a sola até um ponto (o pedal, o apoio), com
 *   o joelho dobrando para a frente, como criança sentada. A conta é exata sempre que o ponto
 *   está ao alcance; fora dele, a perna estica na direção do ponto.
 *
 * Quem chama: `planoBoneco` (dividir, quando há brinquedo de pedal ou apoio vestido) e
 * `render/boneco.aplicarPose` (a conta, a cada quadro, depois da suavização).
 */
import type { Peca, PlanoBoneco, SubjuntaPremium } from './boneco';

type V3 = [number, number, number];

/** A medida da perna com joelho (no espaço da perna, antes da escala do boneco). */
export interface MedidaPerna {
  /** Do quadril ao joelho (o joelho fica bem embaixo do quadril). */
  coxa: number;
  /** Do quadril à sola. */
  quadril: number;
  /** O ponto da sola que pisa no pedal: um tico para a frente do meio do sapato. */
  pontaZ: number;
}

/** O ponto da sola que pisa (para a frente do meio do sapato, onde fica a bola do pé). */
export const PONTA_DO_PE = 0.06;
/** Quanto a coxa e a canela se cruzam no joelho (esticada, nenhuma fresta aparece). */
const CRUZA = 0.05;

/**
 * A medida da perna de um plano (a coxa é 60% da perna, até 0,15). A perna sai do quadril (o
 * plano põe o quadril 0,1 acima do alto da perna), e não da caixa dela, que a divisão encurta.
 */
export function medidaDaPerna(pl: PlanoBoneco): MedidaPerna {
  const quadril = pl.juntas.pernaE.pos[1];
  const pernaH = quadril - 0.1;
  return { coxa: Math.min(0.15, pernaH * 0.6), quadril, pontaZ: PONTA_DO_PE };
}

/** O que vai com a canela pelo nome (as peças do pé e o que fica no joelho). */
const DA_CANELA = /(sapato|bota|tenis|polaina|pantufa|pata|dedo|garra|meia|joelheira|remendo|barra)/;

/** A altura de baixo e a de cima da peça (aproximada pelo maior lado, se ela está girada). */
function alturas(p: Peca): [number, number] {
  const [w, h, d] = p.tamanho;
  let meia: number;
  if (p.forma === 'esfera') meia = p.rot ? Math.max(w, h, d) : h;
  else if (p.forma === 'cilindro') meia = p.rot ? Math.max(h / 2, w, d) : h / 2;
  else meia = (p.rot ? Math.max(w, h, d) : h) / 2;
  return [p.pos[1] - meia, p.pos[1] + meia];
}

/**
 * A perna vira coxa e canela. A caixa da perna vira duas, que se cruzam no joelho; o resto vai
 * para a canela pelo nome ou pelo ponto mais baixo (o meio dela abaixo do joelho). O degradê
 * (`pintar`) é corrigido pelo deslocamento: a cor de cada ponto fica a mesma.
 */
export function dividirPernas(pl: PlanoBoneco): MedidaPerna {
  const m = medidaDaPerna(pl);
  const { coxa } = m;
  const novas: Peca[] = [];
  for (const lado of ['pernaE', 'pernaD'] as const) {
    const joelho = { nome: (lado === 'pernaE' ? 'joelhoE' : 'joelhoD') as SubjuntaPremium, pivo: [0, -coxa, 0] as V3 };
    for (const p of pl.pecas) {
      if (p.junta !== lado || p.subjunta) continue;
      const curto = p.nome.slice(lado.length + 1);
      if (curto === 'perna' && p.forma === 'caixa') {
        const [w, h, d] = p.tamanho;
        const baixo = p.pos[1] - h / 2;
        const hCoxa = coxa + CRUZA;
        const hCanela = -coxa - baixo + CRUZA;
        // (a canela um tico mais fina: dobrada, a quina dela fica por dentro da coxa)
        novas.push({
          ...p,
          nome: `${lado}-canela`,
          tamanho: [w * 0.98, hCanela, d * 0.98],
          pos: [p.pos[0], CRUZA - hCanela / 2, p.pos[2]],
          subjunta: joelho,
        });
        p.tamanho = [w, hCoxa, d];
        p.pos = [p.pos[0], -hCoxa / 2, p.pos[2]];
        continue;
      }
      const [y0, y1] = alturas(p);
      const meio = (y0 + y1) / 2;
      // (portão: o que fica todo acima do joelho fica na coxa, mesmo com nome de sapato, como a
      // borda do tênis de cano da roqueira; na canela, ele girava para dentro da coxa dobrada)
      if (y0 >= -coxa - 0.005) continue;
      // o cano que passa do joelho (o tênis de cano, a bota) se divide como a perna: a parte de
      // cima fica na coxa e a de baixo vai com a canela, as duas se cruzando um tico no joelho
      if (y1 > -coxa + 0.005 && p.forma === 'caixa' && !p.rot && DA_CANELA.test(curto)) {
        const cruza = CRUZA / 2;
        const hCima = y1 - (-coxa - cruza);
        const hBaixo = -coxa + cruza - y0;
        const pintar = p.pintar;
        novas.push({ ...p, nome: `${p.nome}-cima`, tamanho: [p.tamanho[0], hCima, p.tamanho[2]], pos: [p.pos[0], y1 - hCima / 2, p.pos[2]] });
        p.tamanho = [p.tamanho[0] * 0.98, hBaixo, p.tamanho[2] * 0.98];
        p.pos = [p.pos[0], y0 + hBaixo / 2 + coxa, p.pos[2]];
        p.subjunta = joelho;
        if (pintar) p.pintar = (x, y, z) => pintar(x, y - coxa, z);
        continue;
      }
      if (!(DA_CANELA.test(curto) || meio < -coxa)) continue;
      p.pos = [p.pos[0], p.pos[1] + coxa, p.pos[2]];
      p.subjunta = joelho;
      const pintar = p.pintar;
      if (pintar) p.pintar = (x, y, z) => pintar(x, y - coxa, z);
    }
  }
  pl.pecas.push(...novas);
  // a saia e o vestido da roupa (presos ao tronco) passam para a junta da saia, no mesmo lugar:
  // montada, ela se ajeita por cima das coxas dobradas (`render/boneco`); a pé, ela acompanha o
  // tronco como antes
  for (const p of pl.pecas) if (p.junta === 'tronco' && p.nome === 'saia') {
    p.junta = 'saia';
    p.nome = SAIA_DA_ROUPA;
  }
  return m;
}

/** O nome da saia (ou do vestido) da roupa depois de passar para a junta da saia. */
export const SAIA_DA_ROUPA = 'saia-da-roupa';

/**
 * A perna com joelho até o ponto `T` (no espaço do corpo, relativo ao quadril): o giro da perna
 * (x para a frente e para trás, z para o lado) e o do joelho (x, para trás), com o joelho
 * dobrando para a frente. O giro do Babylon é z, depois x.
 */
export function pernaAte(T: V3, m: MedidaPerna): { x: number; z: number; joelho: number } {
  return pernaAteCom(T, m, m.pontaZ);
}

/**
 * A sola por onde o pé pisa no pedal redondo (do calcanhar à ponta, no espaço do sapato) e a
 * inclinação que a sola procura (rad; negativo é a ponta um tico para baixo, como quem pedala).
 */
export const SOLA = { de: -0.09, ate: 0.15, inclinacao: -0.12 } as const;

/**
 * Como `pernaAte`, mas o pé pisa no pedal pelo ponto da sola que deixa a sola mais perto da
 * inclinação de quem pedala: sem tornozelo, o sapato acompanha a canela, e é a sola que rola por
 * cima do pedal redondo (do meio do pé à ponta), em vez de o sapato virar com a volta. Contínuo:
 * o ponto anda devagar pela sola, nada salta. Devolve também o ponto escolhido (`ponta`).
 */
export function pernaNoPedal(T: V3, m: MedidaPerna): { x: number; z: number; joelho: number; ponta: number } {
  const g = (b: number) => {
    const r = pernaAteCom(T, m, b);
    return { r, d: r.x + r.joelho - SOLA.inclinacao };
  };
  let lo: number = SOLA.de;
  let hi: number = SOLA.ate;
  let a = g(lo);
  const c = g(hi);
  if (Math.sign(a.d) === Math.sign(c.d)) return Math.abs(a.d) <= Math.abs(c.d) ? { ...a.r, ponta: lo } : { ...c.r, ponta: hi };
  for (let i = 0; i < 14; i++) {
    const meio = (lo + hi) / 2;
    const e = g(meio);
    if (Math.sign(e.d) === Math.sign(a.d)) {
      lo = meio;
      a = e;
    } else hi = meio;
  }
  const b = (lo + hi) / 2;
  return { ...pernaAteCom(T, m, b), ponta: b };
}

function pernaAteCom(T: V3, m: MedidaPerna, b: number): { x: number; z: number; joelho: number } {
  const Lt = m.coxa;
  const a = m.quadril - m.coxa;
  const Ls = Math.hypot(a, b);
  const dist = Math.hypot(T[0], T[1], T[2]);
  const D = Math.max(Math.abs(Lt - Ls) + 0.02, Math.min(Lt + Ls - 0.0005, dist));
  const q = (D * D - Lt * Lt - Ls * Ls) / (2 * Lt);
  const phi = Math.atan2(b, a);
  const k = phi + Math.acos(Math.max(-1, Math.min(1, q / Ls)));
  const uy = -Lt - a * Math.cos(k) - b * Math.sin(k);
  const uz = -a * Math.sin(k) + b * Math.cos(k);
  const f = D / Math.max(1e-6, dist);
  const z = Math.asin(Math.max(-1, Math.min(1, (-T[0] * f) / uy)));
  const bruto = Math.atan2(T[2], T[1]) - Math.atan2(uz, uy * Math.cos(z));
  return { x: Math.atan2(Math.sin(bruto), Math.cos(bruto)), z, joelho: k };
}
