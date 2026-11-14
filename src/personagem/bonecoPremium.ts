/**
 * Spec 023 (T11 e T12): as peças dos premium vestidos no boneco de brinquedo. Só dados, como o
 * resto do plano (boneco.ts e bonecoFantasia.ts): forma, tamanho, cor, a junta, e o que é só
 * dos premium (a luz própria que se anima, as listras que correm, o degradê e as asas num nó
 * próprio). A montagem e a animação ficam em render/boneco.ts, render/premiumLuzes.ts e
 * render/premiumMundo.ts.
 *
 * O premium tem que se ver além de tudo que se ganha no jogo: cada peça leva luz própria, um
 * degradê, ouro de verdade e um detalhe que só ele tem. Nada de modelo pronto: tudo feito aqui.
 *
 * - **Camiseta arco-íris:** as sete listras correm devagar pela camiseta e pelas mangas; a gola,
 *   os punhos e a barra são de pérola acesa; a estrelinha de ouro no peito.
 * - **Tênis-cometa:** sola branca grossa com a faixa de luz que corre o arco-íris, o cano
 *   violeta, a biqueira, a língua rosa, os cadarços e o cometa de ouro com a cauda colorida dos
 *   dois lados.
 * - **Capa de estrelas:** veludo azul-noite que vira violeta embaixo, a barra de ouro, a lua e
 *   as estrelas que piscam em três tempos, a gola e os broches de estrela.
 * - **Dragãozinho** (fantasia, pela 017): o capuz refeito (focinho com narinas, dentinhos,
 *   olhos com sobrancelha de escama, chifres de ouro grandes e curvos, barbatanas), os espinhos
 *   da cabeça às costas e ao rabo, a barriga de escamas, as asas e as patinhas com garras.
 */
import type { Junta, Peca, SubjuntaPremium } from './boneco';
import type { MedidasBoneco } from './bonecoFantasia';
import { perfilCoracao, perfilEstrela, perfilFolha } from './bonecoFantasia';
import type { PremiumVestido } from './aparencia';

type V3 = [number, number, number];
type P2 = [number, number];

// ------------------------------------------------------------------ cores
const OURO = '#ffc93d';
const OURO_FUNDO = '#e8a21e';
const BRANCO = '#fbfbff';
const PEROLA = '#fff4fb';

/** Mistura duas cores "#rrggbb" (t de 0 a 1). */
export function misturarCor(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const k = Math.max(0, Math.min(1, t));
  const c = [16, 8, 0].map((s) => {
    const x = (pa >> s) & 255;
    const y = (pb >> s) & 255;
    return Math.round(x + (y - x) * k);
  });
  return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

// ------------------------------------------------------------------ peças
/** Quem junta as peças (o plano do boneco). */
export class Pecas {
  constructor(readonly lista: Peca[]) {}
  por(p: Peca): void {
    this.lista.push(p);
  }
  caixa(
    nome: string,
    junta: Junta,
    apoio: Peca['apoio'],
    t: V3,
    pos: V3,
    cor: string,
    raio = 0.04,
    extra: Partial<Peca> = {},
  ): void {
    this.por({ nome, junta, apoio, forma: 'caixa', tamanho: t, raio, pos, cor, ...extra });
  }
  bola(
    nome: string,
    junta: Junta,
    apoio: Peca['apoio'],
    r: number,
    pos: V3,
    cor: string,
    esc: V3 = [1, 1, 1],
    extra: Partial<Peca> = {},
  ): void {
    this.por({
      nome,
      junta,
      apoio,
      forma: 'esfera',
      tamanho: [r * esc[0], r * esc[1], r * esc[2]],
      pos,
      cor,
      ...extra,
    });
  }
  cone(
    nome: string,
    junta: Junta,
    apoio: Peca['apoio'],
    h: number,
    rb: number,
    rc: number,
    pos: V3,
    cor: string,
    extra: Partial<Peca> = {},
  ): void {
    this.por({ nome, junta, apoio, forma: 'cilindro', tamanho: [h, rb, rc], pos, cor, ...extra });
  }
  placa(
    nome: string,
    junta: Junta,
    apoio: Peca['apoio'],
    perfil: P2[],
    espessura: number,
    pos: V3,
    cor: string,
    extra: Partial<Peca> = {},
  ): void {
    let w = 0;
    let h = 0;
    for (const [x, y] of perfil) {
      w = Math.max(w, Math.abs(x) * 2);
      h = Math.max(h, Math.abs(y) * 2);
    }
    this.por({
      nome,
      junta,
      apoio,
      forma: 'placa',
      tamanho: [w, h, espessura],
      perfil,
      pos,
      cor,
      ...extra,
    });
  }
  anel(
    nome: string,
    junta: Junta,
    apoio: Peca['apoio'],
    diametro: number,
    espessura: number,
    pos: V3,
    cor: string,
    extra: Partial<Peca> = {},
  ): void {
    this.por({
      nome,
      junta,
      apoio,
      forma: 'anel',
      tamanho: [diametro, espessura, 0],
      pos,
      cor,
      ...extra,
    });
  }
  /** Tira as peças cujo nome casa (devolve quantas saíram). */
  tirar(re: RegExp): number {
    let n = 0;
    for (let i = this.lista.length - 1; i >= 0; i--)
      if (re.test(this.lista[i].nome)) {
        this.lista.splice(i, 1);
        n++;
      }
    return n;
  }
}

/** Gira um vetor como o Babylon gira a peça (z, depois x, depois y). */
export function girar(v: V3, rot: V3): V3 {
  let [x, y, z] = v;
  const [rx, ry, rz] = rot;
  let c = Math.cos(rz);
  let s = Math.sin(rz);
  [x, y] = [x * c - y * s, x * s + y * c];
  c = Math.cos(rx);
  s = Math.sin(rx);
  [y, z] = [y * c - z * s, y * s + z * c];
  c = Math.cos(ry);
  s = Math.sin(ry);
  [x, z] = [x * c + z * s, -x * s + z * c];
  return [x, y, z];
}

/**
 * Um chifre ou espinho curvo em gomos: cada gomo é um cone que continua do fim do outro,
 * dobrando um pouco mais. Devolve a ponta.
 */
function chifreCurvo(
  P: Pecas,
  nome: string,
  junta: Junta,
  apoio: Peca['apoio'],
  base: V3,
  rot0: V3,
  dobra: V3,
  gomos: number,
  comp: number,
  r0: number,
  cor: (i: number) => string,
  extra: Partial<Peca> = {},
): V3 {
  let p: V3 = [...base];
  let rot: V3 = [...rot0];
  for (let i = 0; i < gomos; i++) {
    const h = comp / gomos;
    const ra = r0 * (1 - i / gomos);
    const rb = r0 * (1 - (i + 1) / gomos) + 0.004;
    const meio = girar([0, h / 2, 0], rot);
    const centro: V3 = [p[0] + meio[0], p[1] + meio[1], p[2] + meio[2]];
    P.cone(`${nome}${i}`, junta, apoio, h * 1.08, ra, rb, centro, cor(i), { rot: [...rot], ...extra });
    const fim = girar([0, h, 0], rot);
    p = [p[0] + fim[0], p[1] + fim[1], p[2] + fim[2]];
    rot = [rot[0] + dobra[0], rot[1] + dobra[1], rot[2] + dobra[2]];
  }
  return p;
}

// ------------------------------------------------------------------ o premium no plano
/**
 * Acrescenta os premium de roupa e de costas ao plano (por cima do look e da fantasia). As
 * peças de cada um chegam nas tarefas seguintes (T11 e T12).
 */
export function vestirPremiumNoPlano(
  _premium: PremiumVestido,
  _lista: Peca[],
  _m: MedidasBoneco,
  _comFantasia: boolean,
): void {}
