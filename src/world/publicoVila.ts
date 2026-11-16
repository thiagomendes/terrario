/**
 * O público do Show da Vila (spec 026, dono: todos com a cara dos bonecos do jogo; 16 nov 2026: o
 * dobro na hora do show). Puro: o núcleo e a tela leem daqui onde cada um fica.
 *
 * - **A turma:** 40 moradores de verdade (núcleo, corpo macio). No show, uns na grade e os
 *   outros espalhados pelo campo atrás, de frente para o palco (nada de bloco apertado); os 20
 *   de sempre ficam pelo festival de noite, conversando em cinco rodinhas pelo campo (a rodinha
 *   muda de lugar de tempos em tempos), e os outros 20 só chegam para o show (pelo portão) e vão
 *   embora depois dele; de dia só 4 ficam (dois na grade, dois de papo), e os outros saem pelo
 *   portão do festival.
 * - **Nada no caminho:** o caminho de cascalho do portão até a grade (e uma folga de cada lado),
 *   o corredor do cercadinho das lhamas até a grade, a volta até a escadinha do palco, o estojo
 *   do festival (f1) e o pé de cada peça ficam livres. Os lugares vêm do plano, nunca da malha.
 */
import type { PlanoVila } from './vilaNeon';
import { colunaTomadaNaVila } from './vilaNeon';
import { celulaTomadaPelaVila } from './vilaSolidos';

type V3 = [number, number, number];
type V2 = [number, number];

/** Quantos moradores na turma do show (os números deles vêm depois dos de posto). */
export const PUBLICO_GRADE = 40;
/** Os primeiros tantos da turma ficam pelo festival de noite; os outros vêm só para o show. */
export const PUBLICO_DA_NOITE = 20;
/** A rodinha muda de lugar a cada tanto (s), cada uma na sua vez. */
export const VOLTA_RODINHA = 26;
/** Quantos em cada rodinha de papo (e quantas rodinhas). */
const NA_RODA = 4;
/** Raio da rodinha de conversa (blocos). */
const RAIO_RODA = 1.2;
/** Quem fica de dia (vendo a passagem de som ou de papo). */
export const FICAM_DE_DIA: readonly number[] = [1, 4, 9, 10];

/**
 * Os lugares no show, no mapa (u, v): seis na grade (dos dois lados do caminho), dois logo
 * atrás, e o resto espalhado pelo campo até perto do meio, com folga de um para o outro.
 */
const GRADE_UV: readonly V2[] = [
  // na grade
  [43.4, 99.2],
  [46.6, 99.2],
  [50.0, 99.2],
  [53.6, 99.2],
  [67.4, 99.2],
  [70.8, 99.2],
  // logo atrás
  [48.4, 97.4],
  [72.6, 97.6],
  // espalhados à esquerda do caminho
  [44.4, 95.4],
  [51.6, 95.0],
  [40.2, 97.0],
  [48.8, 93.0],
  [53.6, 91.4],
  [50.2, 88.4],
  [41.2, 88.6],
  [54.8, 86.2],
  // espalhados à direita (antes do corredor das lhamas)
  [69.0, 95.2],
  [72.8, 92.6],
  [67.4, 91.4],
  [70.6, 89.2],
  // os que vêm só para o show (16 nov 2026: o dobro), nos vãos entre os de sempre, mais perto
  // da grade, sem tapar o caminho, o corredor das lhamas, o estojo e o rádio
  [37.7, 99.3],
  [55.5, 98.1],
  [45.2, 97.6],
  [51.9, 97.5],
  [68.9, 97.6],
  [37.4, 96.8],
  [42.5, 96.8],
  [66.2, 96.8],
  [53.7, 96.4],
  [47.1, 95.5],
  [71.1, 95.5],
  [73.5, 95.5],
  [39.3, 94.8],
  [55.5, 95.0],
  [66.3, 94.4],
  [53.2, 93.6],
  [37.4, 93.1],
  [70.0, 93.1],
  [55.5, 92.6],
  [50.6, 91.9],
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
  [
    [41.5, 84.5],
    [44.5, 86.5],
  ],
];
/** O portão do festival (onde quem sai some e quem chega aparece), no mapa. */
const PORTAO_UV: V2 = [60.5, 74.5];

/** O campo do festival antes da grade (u0, v0, u1, v1, inclusivo): onde o público anda. */
const CAMPO = { u0: 26, v0: 73, u1: 89, v1: 99 } as const;
/** Ninguém fica nestas faixas: o caminho, as lhamas, a escadinha e as barracas. */
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
  /** Os lugares do show (pés) de cada morador da turma. */
  grade: readonly V3[];
  /** As rodinhas (dois lugares cada) e o portão. */
  rodas: readonly [V3, V3][];
  portao: V3;
  /** O meio do campo (quem está a ~52 blocos daqui traz a turma). */
  meio: V2;
  /** A célula (do mundo) é livre para pisar no campo do festival? */
  livre(x: number, z: number): boolean;
  /** O ponto (do mundo) cai numa faixa que fica sempre livre (o caminho, as lhamas, o estojo)? */
  naFaixaLivre(x: number, z: number): boolean;
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

  return {
    plano: p,
    grade: GRADE_UV.map(([u, v]) => W(u, v)),
    rodas: RODAS_UV.map(([a, b]) => [W(a[0], a[1]), W(b[0], b[1])] as [V3, V3]),
    portao: W(PORTAO_UV[0], PORTAO_UV[1]),
    meio: [p.ox + 57, p.oz + 92],
    livre,
    naFaixaLivre: (x, z) => {
      const u = x - p.ox;
      const v = z - p.oz;
      return (
        LIVRES.some((r) => u >= r.u0 && u <= r.u1 && v >= r.v0 && v <= r.v1) ||
        RODAS_LIVRES.some(([cu, cv, raio]) => Math.hypot(u - cu, v - cv) < raio)
      );
    },
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

/** Qual rodinha (0 a 4) e qual lugar dela (0 a 3) é o morador k da turma. */
export const rodaDe = (k: number): [number, number] => [
  Math.floor(k / NA_RODA) % RODAS_UV.length,
  k % NA_RODA,
];

/** Onde o morador k da turma fica agora. */
export function lugarDoPublico(pub: PublicoVila, k: number, m: MomentoPublico): LugarPublico {
  const g = pub.grade[k];
  if (m.show) return { alvo: g, olhar: [g[0], g[2] + 20], modo: 'grade' };
  // os que vêm só para o show vão embora depois dele (e nem chegam antes)
  if (k >= PUBLICO_DA_NOITE) return { alvo: null, olhar: null, modo: 'fora' };
  const dia = !m.noite;
  if (dia && !FICAM_DE_DIA.includes(k)) return { alvo: null, olhar: null, modo: 'fora' };
  // de dia, dois na grade vendo a passagem de som
  if (dia && (k === FICAM_DE_DIA[0] || k === FICAM_DE_DIA[1]))
    return { alvo: g, olhar: [g[0], g[2] + 20], modo: 'grade' };
  const [r, s] = rodaDe(k);
  // a rodinha vai de um lugar para o outro, cada uma na sua vez (de dia, fica parada)
  const vez = dia ? 0 : Math.floor((m.t + r * (VOLTA_RODINHA / 4)) / VOLTA_RODINHA) % 2;
  const c = pub.rodas[r][vez];
  const a = (s / NA_RODA) * Math.PI * 2 + r * 0.7;
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
  const livreI = (i: number) =>
    pub.livre(p.ox + u0 + (i % nu) + 0.5, p.oz + v0 + ((i / nu) | 0) + 0.5);
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

// ------------------------------------------------------------------ o festival sem bichos
/**
 * O festival sem bichos soltos (o dono, 16 nov 2026: "os bichos invadem o show e o passarinho
 * canta por cima da música"): o campo, a plateia, o palco e os bastidores, dentro do alambrado.
 * Nenhum bicho solto entra (o portão também fica fechado para eles) e quem já está dentro sai a
 * pé pelo portão. As lhamas do cercadinho (que moram ali), quem segue a comida na mão de alguém,
 * os bichos criados e os moradores não contam (`populacao.ts` decide quem é solto).
 */
export interface ZonaSemBichos {
  /** O ponto (mundo) fica no festival? */
  dentro(x: number, z: number): boolean;
  /** O caminho a pé de (x, z) até fora do festival, pelo portão (os pontos, o último já fora). */
  saida(x: number, z: number): V2[];
}

const zonas = new WeakMap<PlanoVila, ZonaSemBichos>();

export function zonaSemBichos(p: PlanoVila): ZonaSemBichos {
  let z0 = zonas.get(p);
  if (z0) return z0;
  const f = p.zonas.festival;
  const pub = publicoDaVila(p);
  const dentro = (x: number, z: number) =>
    x >= f.x0 - 1 && x < f.x1 + 2 && z >= f.z0 - 1 && z < f.z1 + 2;
  // o portão: o meio dele por dentro e um ponto na calçada da avenida, fora
  const portao: V2 = [pub.portao[0], pub.portao[2]];
  const fora: V2 = [pub.portao[0], f.z0 - 3.5];
  // atrás da grade (o palco e os bastidores) primeiro vai para o corredor do lado dele
  const grade = p.oz + 99.5;
  const oeste: V2 = [p.ox + 30.5, p.oz + 97.5];
  const leste: V2 = [p.ox + 86.5, p.oz + 97.5];
  z0 = {
    dentro,
    saida(x, z) {
      const pts: V2[] = [];
      let de: V2 = [x, z];
      if (z > grade) {
        const lado = x - p.ox < 60 ? oeste : leste;
        pts.push([lado[0], Math.min(z, p.oz + 106)], lado);
        de = lado;
      }
      pts.push(...caminhoNoFestival(pub, de, portao), portao, fora);
      return pts;
    },
  };
  zonas.set(p, z0);
  return z0;
}
