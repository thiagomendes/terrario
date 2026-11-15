/**
 * O público do Show da Vila (spec 026, pedido do dono: "uma multidão de 40 a 60 pessoas no
 * show"). Puro: o núcleo (onde cada morador da grade fica) e a tela (o povo de longe) leem daqui.
 *
 * - **A turma da grade:** 12 moradores de verdade (núcleo, corpo macio). No show ficam na grade
 *   da plateia, de frente para o palco; de noite sem show conversam em quatro rodinhas pelo campo
 *   (a rodinha muda de lugar de tempos em tempos); de dia só 4 ficam (dois na grade vendo a
 *   passagem de som, dois de papo), e os outros saem pelo portão do festival.
 * - **O povo de longe:** ~40 bonecos só da tela (`render/vila/plateia.ts`), atrás da turma,
 *   enchendo o campo até perto do portão. Só de noite.
 * - **Nada no caminho:** o caminho de cascalho do portão até a grade (e uma folga de cada lado),
 *   o corredor do cercadinho das lhamas até a grade, a volta até a escadinha do palco, o estojo
 *   do festival (f1) e o pé de cada peça ficam livres. Os lugares vêm do plano, nunca da malha.
 */
import type { PlanoVila } from './vilaNeon';
import { colunaTomadaNaVila } from './vilaNeon';
import { celulaTomadaPelaVila } from './vilaSolidos';
import { hash2 } from './noise';

type V3 = [number, number, number];
type V2 = [number, number];

/** Quantos moradores na turma da grade (os números deles vêm depois dos de posto). */
export const PUBLICO_GRADE = 12;
/** A rodinha muda de lugar a cada tanto (s), cada uma na sua vez. */
export const VOLTA_RODINHA = 26;
/** O povo de longe: no máximo tantos bonecos (o celular aguenta, a multidão lê cheia). */
export const MAX_FUNDO = 44;
/** Raio da rodinha de conversa (blocos). */
const RAIO_RODA = 1.05;
/** Quem fica de dia (vendo a passagem de som ou de papo). */
export const FICAM_DE_DIA: readonly number[] = [1, 4, 8, 10];

/** Os lugares da grade, no mapa (u, v): duas fileiras à esquerda do caminho, uma à direita. */
const GRADE_UV: readonly V2[] = [
  // rodinha 0 (no meio da esquerda)
  [47.2, 99.3],
  [49.6, 99.3],
  [48.4, 97.7],
  // rodinha 1 (perto do caminho)
  [52.0, 99.3],
  [54.4, 99.3],
  [53.2, 97.7],
  // rodinha 2 (à direita do caminho, antes do corredor das lhamas)
  [66.8, 99.3],
  [69.2, 99.3],
  [71.6, 99.3],
  // rodinha 3 (na ponta da esquerda)
  [42.4, 99.3],
  [44.8, 99.3],
  [43.6, 97.7],
];
/** As rodinhas da noite sem show: dois lugares cada (vão de um para o outro). */
const RODAS_UV: readonly [V2, V2][] = [
  [
    [47.5, 94.5],
    [50.5, 92.8],
  ],
  [
    [53.5, 89.5],
    [51.0, 87.8],
  ],
  [
    [69.0, 93.5],
    [71.0, 90.9],
  ],
  [
    [38.6, 96.2],
    [44.6, 96.6],
  ],
];
/** O portão do festival (onde quem sai some e quem chega aparece), no mapa. */
const PORTAO_UV: V2 = [60.5, 74.5];

/** O campo do festival antes da grade (u0, v0, u1, v1, inclusivo): onde o público anda. */
const CAMPO = { u0: 26, v0: 73, u1: 89, v1: 99 } as const;
/** Ninguém fica (nem o povo de longe) nestas faixas: o caminho, as lhamas, a escadinha. */
const LIVRES: readonly { u0: number; v0: number; u1: number; v1: number }[] = [
  // o caminho de cascalho do portão até a grade, com uma folga de cada lado
  { u0: 56.4, v0: 72, u1: 65.6, v1: 101 },
  // o cercadinho, o corredor das lhamas até a grade e a volta até a escadinha do palco
  { u0: 74, v0: 72, u1: 92, v1: 112 },
  // as barracas do lanche e das camisetas, e a moça do lanche na frente
  { u0: 30.5, v0: 74, u1: 39, v1: 89 },
];
/** O estojo do festival (f1) e o rádio gigante: uma roda livre em volta. */
const RODAS_LIVRES: readonly [number, number, number][] = [
  [46.5, 90.5, 2.6],
  [42.5, 92.5, 3.2],
];

export interface PublicoVila {
  plano: PlanoVila;
  /** Os lugares da grade (pés) de cada morador da turma. */
  grade: readonly V3[];
  /** As rodinhas (dois lugares cada) e o portão. */
  rodas: readonly [V3, V3][];
  portao: V3;
  /** O meio do campo (quem está a ~52 blocos daqui traz a turma). */
  meio: V2;
  /** O povo de longe: [x, z, giro, semente] de cada boneco (só na tela). */
  fundo: readonly [number, number, number, number][];
  /** A célula (do mundo) é livre para pisar no campo do festival? */
  livre(x: number, z: number): boolean;
}

const cache = new WeakMap<PlanoVila, PublicoVila>();

/** O público do bairro (sempre o mesmo para o mesmo plano). */
export function publicoDaVila(p: PlanoVila): PublicoVila {
  let pub = cache.get(p);
  if (!pub) {
    pub = montar(p);
    cache.set(p, pub);
  }
  return pub;
}

function montar(p: PlanoVila): PublicoVila {
  const Y = p.h + 1;
  const W = (u: number, v: number): V3 => [p.ox + u, Y, p.oz + v];
  const tomada = (x: number, z: number) =>
    colunaTomadaNaVila(p, x, z) ||
    celulaTomadaPelaVila(p, x, Y, z) ||
    celulaTomadaPelaVila(p, x, Y + 1, z);
  // a grade de pisar do campo (célula livre: sem bloco, sem peça)
  const nu = CAMPO.u1 - CAMPO.u0 + 1;
  const nv = CAMPO.v1 - CAMPO.v0 + 1;
  const livreCel = new Uint8Array(nu * nv);
  for (let v = CAMPO.v0; v <= CAMPO.v1; v++)
    for (let u = CAMPO.u0; u <= CAMPO.u1; u++)
      livreCel[(v - CAMPO.v0) * nu + (u - CAMPO.u0)] = tomada(p.ox + u, p.oz + v) ? 0 : 1;
  const livre = (x: number, z: number) => {
    const u = Math.floor(x) - p.ox;
    const v = Math.floor(z) - p.oz;
    if (u < CAMPO.u0 || u > CAMPO.u1 || v < CAMPO.v0 || v > CAMPO.v1) return false;
    return livreCel[(v - CAMPO.v0) * nu + (u - CAMPO.u0)] === 1;
  };

  // o povo de longe: uma grade com sorteio de leve, fora das faixas livres e longe de peças
  const fundo: [number, number, number, number][] = [];
  const longeDe = (u: number, v: number) => {
    for (const r of LIVRES) if (u >= r.u0 && u <= r.u1 && v >= r.v0 && v <= r.v1) return false;
    for (const [cu, cv, raio] of RODAS_LIVRES) if (Math.hypot(u - cu, v - cv) < raio) return false;
    // nem em cima das rodinhas e da grade da turma
    for (const [gu, gv] of GRADE_UV) if (Math.hypot(u - gu, v - gv) < 1.3) return false;
    for (const [a, b] of RODAS_UV)
      for (const [cu, cv] of [a, b]) if (Math.hypot(u - cu, v - cv) < RAIO_RODA + 0.75) return false;
    // a folga do corpo: nada sólido na célula nem colado nela
    for (const [du, dv] of [
      [0, 0],
      [0.45, 0],
      [-0.45, 0],
      [0, 0.45],
      [0, -0.45],
    ])
      if (!livre(p.ox + u + du, p.oz + v + dv)) return false;
    return true;
  };
  for (let v = 96.2; v >= 79; v -= 1.6)
    for (let u = 40.2; u <= 73; u += 1.55) {
      const k = fundo.length;
      const j = hash2(Math.round(u * 10), Math.round(v * 10), p.semente + 7310);
      const ju = u + (j - 0.5) * 0.6 + ((Math.round(v * 10) / 15.5) % 2) * 0.7;
      const jv = v + (hash2(Math.round(v * 10), Math.round(u * 10), p.semente + 7311) - 0.5) * 0.5;
      if (!longeDe(ju, jv)) continue;
      // mais gente perto da grade, mais espaçado perto do portão
      const fica = 0.95 - ((96.5 - jv) / 18) * 0.8;
      if (hash2(Math.round(ju * 10), Math.round(jv * 10), p.semente + 7312) > fica) continue;
      // virados para o palco, com um tiquinho de giro cada um
      const giro = (hash2(k, 3, p.semente + 7313) - 0.5) * 0.5;
      fundo.push([p.ox + ju, p.oz + jv, giro, hash2(k, 4, p.semente + 7314)]);
    }
  // no máximo MAX_FUNDO (sobram os de perto da grade)
  fundo.sort((a, b) => b[1] - a[1] || a[0] - b[0]);
  fundo.length = Math.min(fundo.length, MAX_FUNDO);

  return {
    plano: p,
    grade: GRADE_UV.map(([u, v]) => W(u, v)),
    rodas: RODAS_UV.map(([a, b]) => [W(a[0], a[1]), W(b[0], b[1])] as [V3, V3]),
    portao: W(PORTAO_UV[0], PORTAO_UV[1]),
    meio: [p.ox + 57, p.oz + 92],
    fundo,
    livre,
  };
}

// ------------------------------------------------------------------ onde cada um fica

export interface MomentoPublico {
  /** Noite de show (`noiteDeShow`). */
  noite: boolean;
  /** O show tocando (do começo ao fim do aplauso). */
  show: boolean;
  /** O relógio do núcleo (s). */
  t: number;
}

export interface LugarPublico {
  /** Onde ficar (null: não fica; sai pelo portão). */
  alvo: V3 | null;
  /** Para onde olhar quando chega (o palco, o meio da rodinha). */
  olhar: V2 | null;
  modo: 'grade' | 'roda' | 'fora';
}

/** Qual rodinha (0 a 3) e qual lugar dela (0 a 2) é o morador k da turma. */
export const rodaDe = (k: number): [number, number] => [Math.floor(k / 3) % 4, k % 3];

/** Onde o morador k da turma fica agora. */
export function lugarDoPublico(pub: PublicoVila, k: number, m: MomentoPublico): LugarPublico {
  const g = pub.grade[k];
  if (m.show) return { alvo: g, olhar: [g[0], g[2] + 20], modo: 'grade' };
  const dia = !m.noite;
  if (dia && !FICAM_DE_DIA.includes(k)) return { alvo: null, olhar: null, modo: 'fora' };
  // de dia, dois na grade vendo a passagem de som
  if (dia && (k === FICAM_DE_DIA[0] || k === FICAM_DE_DIA[1]))
    return { alvo: g, olhar: [g[0], g[2] + 20], modo: 'grade' };
  const [r, s] = rodaDe(k);
  // a rodinha vai de um lugar para o outro, cada uma na sua vez (de dia, fica parada)
  const vez = dia ? 0 : Math.floor((m.t + r * (VOLTA_RODINHA / 4)) / VOLTA_RODINHA) % 2;
  const c = pub.rodas[r][vez];
  const a = (s / 3) * Math.PI * 2 + r * 0.7;
  const alvo: V3 = [c[0] + Math.sin(a) * RAIO_RODA, c[1], c[2] + Math.cos(a) * RAIO_RODA];
  return { alvo, olhar: [c[0], c[2]], modo: 'roda' };
}

// ------------------------------------------------------------------ o caminho a pé
/** O segmento de a até b passa só por chão livre (com a folga do corpo)? */
function retoLivre(pub: PublicoVila, a: V2, b: V2, folga = 0.34): boolean {
  const d = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const n = Math.max(1, Math.ceil(d / 0.2));
  for (let i = 0; i <= n; i++) {
    const x = a[0] + ((b[0] - a[0]) * i) / n;
    const z = a[1] + ((b[1] - a[1]) * i) / n;
    for (const [dx, dz] of [
      [folga, 0],
      [-folga, 0],
      [0, folga],
      [0, -folga],
    ])
      if (!pub.livre(x + dx, z + dz)) return false;
  }
  return true;
}

/**
 * O caminho a pé pelo campo de `de` até `para` (busca na grade de células livres, depois
 * esticada em linhas retas): os pontos do meio, sem o primeiro e sem o último (o morador vai
 * neles e depois ao posto). Determinístico. Sem caminho, vazio (vai reto, e o anti-trava cuida).
 */
export function caminhoNoFestival(pub: PublicoVila, de: V2, para: V2): V2[] {
  if (retoLivre(pub, de, para)) return [];
  const p = pub.plano;
  const u0 = CAMPO.u0;
  const v0 = CAMPO.v0;
  const nu = CAMPO.u1 - u0 + 1;
  const nv = CAMPO.v1 - v0 + 1;
  const idx = (x: number, z: number) => {
    const u = Math.floor(x) - p.ox - u0;
    const v = Math.floor(z) - p.oz - v0;
    return u < 0 || v < 0 || u >= nu || v >= nv ? -1 : v * nu + u;
  };
  const livreI = (i: number) => pub.livre(p.ox + u0 + (i % nu) + 0.5, p.oz + v0 + ((i / nu) | 0) + 0.5);
  /** A célula livre mais perto (o lugar pode cair colado numa peça). */
  const perto = (x: number, z: number) => {
    let i = idx(x, z);
    if (i >= 0 && livreI(i)) return i;
    let melhor = -1;
    let dm = Infinity;
    for (let dz = -2; dz <= 2; dz++)
      for (let dx = -2; dx <= 2; dx++) {
        const j = idx(x + dx, z + dz);
        if (j < 0 || !livreI(j)) continue;
        const d = Math.hypot(dx, dz);
        if (d < dm) {
          dm = d;
          melhor = j;
        }
      }
    i = melhor;
    return i;
  };
  const a = perto(de[0], de[1]);
  const b = perto(para[0], para[1]);
  if (a < 0 || b < 0) return [];
  const veio = new Int32Array(nu * nv).fill(-2);
  veio[a] = -1;
  const fila = [a];
  const VIZ = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
  ];
  for (let q = 0; q < fila.length && veio[b] === -2; q++) {
    const i = fila[q];
    const u = i % nu;
    const v = (i / nu) | 0;
    for (const [du, dv] of VIZ) {
      const uu = u + du;
      const vv = v + dv;
      if (uu < 0 || vv < 0 || uu >= nu || vv >= nv) continue;
      const j = vv * nu + uu;
      if (veio[j] !== -2 || !livreI(j)) continue;
      // na diagonal, sem cortar a quina
      if (du && dv && (!livreI(v * nu + uu) || !livreI(vv * nu + u))) continue;
      veio[j] = i;
      fila.push(j);
    }
  }
  if (veio[b] === -2) return [];
  const celulas: V2[] = [];
  for (let i = b; i !== -1; i = veio[i])
    celulas.push([p.ox + u0 + (i % nu) + 0.5, p.oz + v0 + ((i / nu) | 0) + 0.5]);
  celulas.reverse();
  // estica: de cada ponto, o mais longe que se vê em linha reta
  const out: V2[] = [];
  let atual: V2 = de;
  let i = 0;
  while (i < celulas.length && !retoLivre(pub, atual, para)) {
    let j = celulas.length - 1;
    while (j > i && !retoLivre(pub, atual, celulas[j])) j--;
    atual = celulas[j];
    out.push(atual);
    i = j + 1;
  }
  return out;
}
