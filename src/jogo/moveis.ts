/**
 * Spec 039: os móveis de várias células, numa tabela só, pura. O núcleo (servidor local e
 * nuvem), a previsão do cliente, a colisão e o desenho leem daqui.
 *
 * - **A âncora** é a parte 0, a célula do toque. Só ela viaja no `colocar`; as outras partes
 *   saem desta tabela, da direção e da âncora, sempre no núcleo.
 * - **O metadado** de cada célula: a direção nos bits 0 e 1 (a mesma da porta e da cama: para
 *   onde a criança olhava ao pôr; o colar só gira estes) e a parte nos bits 2 a 4.
 * - **Quebrar** qualquer parte leva o móvel inteiro. `movelEm` lê a peça, acha a âncora e só
 *   aceita as células com o mesmo bloco, a mesma direção, a parte esperada e o mesmo dono.
 * - **A peça solta** (a parte sem a âncora certa, ou a âncora sem as partes) não é móvel: sem
 *   desenho, sem colisão e sem item; ao abrir o mundo, vira ar.
 *
 * A direção `d`: a frente de quem pôs é `vetor(d)` (0 +z, 1 +x, 2 -z, 3 -x) e a direita dele é
 * `vetor(d + 1)` (olhando para +z, a direita é +x). As partes são contadas em células para a
 * direita, para cima e para a frente, a partir da âncora.
 */
import { Bloco } from '../world/blocks';

/** Caixa em coordenadas locais da célula, de 0 a 1 (a mesma de `world/formas.ts`). */
export type CaixaMovel = readonly [number, number, number, number, number, number];

export interface FormaMovel {
  /** Células para a direita, para a frente e para cima de quem põe. */
  largura: number;
  fundo: number;
  altura: number;
  /** [direita, cima, frente] de cada parte, a partir da âncora, na ordem do metadado. */
  partes: readonly (readonly [number, number, number])[];
  /**
   * As caixas de colisão de cada parte, com a criança olhando para +z (a frente do móvel olha
   * para ela, em -z). A colisão vai até 1,0: o encosto que passa disso é só desenho.
   */
  caixas: readonly (readonly CaixaMovel[])[];
  /**
   * A parte que é um móvel inteiro sozinha, numa célula (a cama curtinha: a cama de antes onde a
   * nova não coube). As caixas dela vêm depois das das partes.
   */
  curtinha?: number;
}

const P = 1 / 16;
const cheia: CaixaMovel = [0, 0, 0, 1, 1, 1];

/** O assento (0,62) e o encosto (até 1,0) do lado de trás. */
const assento = (x0: number, x1: number, z0: number, z1: number): CaixaMovel[] => [
  [x0, 0, z0, x1, 10 * P, z1],
  [x0, 10 * P, z1 - 3 * P, x1, 1, z1],
];

const SOFA: FormaMovel = {
  largura: 2,
  fundo: 1,
  altura: 1,
  partes: [
    [0, 0, 0],
    [1, 0, 0],
  ],
  caixas: [assento(0, 1, P, 1), assento(0, 1, P, 1)],
};
const CADEIRA: FormaMovel = {
  largura: 1,
  fundo: 1,
  altura: 1,
  partes: [[0, 0, 0]],
  caixas: [assento(2 * P, 14 * P, 2 * P, 14 * P)],
};
const CRIADO_MUDO: FormaMovel = {
  largura: 1,
  fundo: 1,
  altura: 1,
  partes: [[0, 0, 0]],
  caixas: [[[P, 0, P, 15 * P, 12 * P, 15 * P]]],
};
const ABAJUR: FormaMovel = {
  largura: 1,
  fundo: 1,
  altura: 2,
  partes: [
    [0, 0, 0],
    [0, 1, 0],
  ],
  // o pé (a base e a haste) e a cúpula
  caixas: [[[5 * P, 0, 5 * P, 11 * P, 1, 11 * P]], [[3 * P, 0, 3 * P, 13 * P, 10 * P, 13 * P]]],
};
const PIA: FormaMovel = {
  largura: 1,
  fundo: 1,
  altura: 2,
  partes: [
    [0, 0, 0],
    [0, 1, 0],
  ],
  // a bancada inteira e a torneira atrás
  caixas: [[cheia], [[6 * P, 0, 11 * P, 10 * P, 6 * P, 15 * P]]],
};
const GUARDA_ROUPA: FormaMovel = {
  largura: 2,
  fundo: 1,
  altura: 2,
  partes: [
    [0, 0, 0],
    [1, 0, 0],
    [0, 1, 0],
    [1, 1, 0],
  ],
  caixas: [[cheia], [cheia], [cheia], [cheia]],
};

/**
 * O tapete: 3 × 2, rente ao chão, numa camada própria (`jogo/tapetes.ts`). Ele não ocupa a
 * célula: o sofá, a cadeira e os blocos vão por cima. A parte `f * 3 + r` fica `r` para a
 * direita e `f` para a frente.
 */
export const FORMA_TAPETE: FormaMovel = {
  largura: 3,
  fundo: 2,
  altura: 0,
  partes: [
    [0, 0, 0],
    [1, 0, 0],
    [2, 0, 0],
    [0, 0, 1],
    [1, 0, 1],
    [2, 0, 1],
  ],
  caixas: [[], [], [], [], [], []],
};

/**
 * A cama nova (1 × 2: a cabeceira é a âncora e o pé vai para a frente de quem põe; a curtinha
 * é a parte 2, sozinha numa célula). A cama de uma célula dos mundos de antes passa pela
 * conversão do núcleo (`nucleo/camas.ts`) antes da regra da peça solta: vira a nova ou a curtinha.
 */
export const FORMA_CAMA: FormaMovel & { curtinha: number } = {
  largura: 1,
  fundo: 2,
  altura: 1,
  partes: [
    [0, 0, 0],
    [0, 0, 1],
  ],
  caixas: [[[0, 0, 0, 1, 9 * P, 1]], [[0, 0, 0, 1, 9 * P, 1]], [[0, 0, 0, 1, 9 * P, 1]]],
  curtinha: 2,
};
/** Spec 039: a parte da cama curtinha (a de antes, numa célula só). */
export const PARTE_CURTINHA = FORMA_CAMA.curtinha;

/**
 * Os nomes dos móveis, os mesmos em todos os mundos (o conjunto é geral; os temáticos ficam
 * para a "Riqueza nos mundos antigos"). Os temas espalham isto na tabela de nomes deles.
 */
export const NOMES_MOVEIS: Readonly<Record<number, string>> = {
  [Bloco.SOFA]: 'sofá',
  [Bloco.CADEIRA]: 'cadeira',
  [Bloco.CRIADO_MUDO]: 'criado-mudo',
  [Bloco.ABAJUR]: 'abajur',
  [Bloco.TAPETE]: 'tapete',
  [Bloco.PIA]: 'pia',
  [Bloco.GUARDA_ROUPA]: 'guarda-roupa',
  [Bloco.ABAJUR_ACESO]: 'abajur aceso',
  [Bloco.CRIADO_MUDO_ACESO]: 'criado-mudo aceso',
};

/** Os móveis de célula da parte 1 (o aceso tem a forma do apagado). */
const MOVEIS: ReadonlyMap<number, FormaMovel> = new Map([
  [Bloco.SOFA, SOFA],
  [Bloco.CADEIRA, CADEIRA],
  [Bloco.CRIADO_MUDO, CRIADO_MUDO],
  [Bloco.CRIADO_MUDO_ACESO, CRIADO_MUDO],
  [Bloco.ABAJUR, ABAJUR],
  [Bloco.ABAJUR_ACESO, ABAJUR],
  [Bloco.PIA, PIA],
  [Bloco.GUARDA_ROUPA, GUARDA_ROUPA],
  // spec 039 (T03): a cama de duas células (e a curtinha)
  [Bloco.CAMA, FORMA_CAMA],
]);

/** A forma do móvel de célula (undefined: não é móvel; o tapete não é de célula). */
export function formaDoMovel(b: number): FormaMovel | undefined {
  return MOVEIS.get(b);
}

/** O bloco é um móvel de várias células (de célula)? */
export function ehMovel(b: number): boolean {
  return MOVEIS.has(b);
}

/** O metadado de uma parte: a direção nos bits 0 e 1, a parte nos bits 2 a 4. */
export function metaDoMovel(d: number, parte: number): number {
  return (d & 3) | ((parte & 7) << 2);
}
export function parteDoMeta(meta: number): number {
  return (meta >> 2) & 7;
}
/** O metadado é de uma âncora (parte 0, nada nos bits de cima)? */
export function ehMetaDeAncora(meta: number): boolean {
  return meta >> 2 === 0;
}

/**
 * A peça de `b` com este metadado começa um móvel inteiro (a âncora; ou a cama curtinha, que é
 * inteira numa célula)? É o que o lote do criativo aceita.
 */
export function ehAncora(b: number, meta: number): boolean {
  if (ehMetaDeAncora(meta)) return true;
  const f = MOVEIS.get(b);
  return f?.curtinha !== undefined && meta >> 5 === 0 && parteDoMeta(meta) === f.curtinha;
}

/** As células do móvel que começa em (x, y, z) com este metadado (a curtinha: só ela). */
export function celulasDaAncora(
  b: number,
  x: number,
  y: number,
  z: number,
  meta: number,
): CelulaDoMovel[] {
  const f = MOVEIS.get(b);
  if (f?.curtinha !== undefined && parteDoMeta(meta) === f.curtinha)
    return [{ x, y, z, parte: f.curtinha }];
  return celulasDoMovel(b, x, y, z, meta & 3);
}

/** Vetor (dx, dz) da direção `d` (o mesmo de `world/formas.ts`). */
export function vetorDoMovel(d: number): readonly [number, number] {
  return vetor(d);
}
function vetor(d: number): readonly [number, number] {
  switch (d & 3) {
    case 1:
      return [1, 0];
    case 2:
      return [0, -1];
    case 3:
      return [-1, 0];
    default:
      return [0, 1];
  }
}

export interface Celula {
  x: number;
  y: number;
  z: number;
}
export interface CelulaDoMovel extends Celula {
  parte: number;
}

/** As células de uma forma com a âncora em (x, y, z), olhando para `d` (a âncora primeiro). */
export function celulasDaForma(
  f: FormaMovel,
  x: number,
  y: number,
  z: number,
  d: number,
): CelulaDoMovel[] {
  const [fx, fz] = vetor(d);
  const [rx, rz] = vetor(d + 1);
  return f.partes.map(([r, u, fr], parte) => ({
    x: x + r * rx + fr * fx,
    y: y + u,
    z: z + r * rz + fr * fz,
    parte,
  }));
}

/**
 * Spec 039 (T03): a cama nova pintada pela geração (povoados, sítio): a cabeceira (a âncora)
 * em (x, y, z), olhando para `d`, e o pé na célula da frente, cada uma com a parte no metadado.
 */
export function pintarCama(
  em: (x: number, y: number, z: number, id: number, meta: number) => void,
  x: number,
  y: number,
  z: number,
  d: number,
): void {
  for (const c of celulasDaForma(FORMA_CAMA, x, y, z, d))
    em(c.x, c.y, c.z, Bloco.CAMA, metaDoMovel(d, c.parte));
}

/** As células do móvel `b` com a âncora em (x, y, z) (vazio se não for móvel). */
export function celulasDoMovel(
  b: number,
  x: number,
  y: number,
  z: number,
  d: number,
): CelulaDoMovel[] {
  const f = MOVEIS.get(b);
  return f ? celulasDaForma(f, x, y, z, d) : [];
}

/** O que a regra do móvel precisa ler (o núcleo e o cliente dão a sua cópia do mundo). */
export interface LeitorMoveis {
  bloco(x: number, y: number, z: number): number;
  meta(x: number, y: number, z: number): number;
  /** Quem pôs (qualquer valor comparável: o id, ou null para o mundo e o dono do mundo). */
  dono(x: number, y: number, z: number): unknown;
}

export interface MovelAchado {
  bloco: number;
  d: number;
  ancora: Celula;
  /** Todas as células, a âncora primeiro, cada uma com a parte. */
  celulas: CelulaDoMovel[];
}

/**
 * O móvel inteiro de que a célula (x, y, z) faz parte, ou null (não é móvel, ou é peça solta).
 * Todas as células têm de ter o mesmo bloco, a mesma direção, a parte esperada e o mesmo dono.
 */
export function movelEm(l: LeitorMoveis, x: number, y: number, z: number): MovelAchado | null {
  const b = l.bloco(x, y, z);
  const f = MOVEIS.get(b);
  if (!f) return null;
  const meta = l.meta(x, y, z);
  const parte = parteDoMeta(meta);
  if (meta >> 5 !== 0) return null;
  const d = meta & 3;
  // a cama curtinha é um móvel inteiro numa célula só
  if (f.curtinha !== undefined && parte === f.curtinha)
    return { bloco: b, d, ancora: { x, y, z }, celulas: [{ x, y, z, parte }] };
  if (parte >= f.partes.length) return null;
  // a âncora: volta da célula da parte pelo deslocamento dela
  const [fx, fz] = vetor(d);
  const [rx, rz] = vetor(d + 1);
  const [r, u, fr] = f.partes[parte];
  const ax = x - r * rx - fr * fx;
  const ay = y - u;
  const az = z - r * rz - fr * fz;
  const celulas = celulasDaForma(f, ax, ay, az, d);
  const dono = l.dono(x, y, z);
  for (const c of celulas) {
    if (c.y < 0 || l.bloco(c.x, c.y, c.z) !== b) return null;
    if (l.meta(c.x, c.y, c.z) !== metaDoMovel(d, c.parte)) return null;
    if (l.dono(c.x, c.y, c.z) !== dono) return null;
  }
  return { bloco: b, d, ancora: { x: ax, y: ay, z: az }, celulas };
}

/** A célula é uma peça de móvel sem o móvel inteiro em volta (não é móvel: some ao abrir). */
export function pecaSolta(l: LeitorMoveis, x: number, y: number, z: number): boolean {
  const b = l.bloco(x, y, z);
  // o id do tapete numa célula (só por truque) também é peça solta
  if (b === Bloco.TAPETE) return true;
  return MOVEIS.has(b) && movelEm(l, x, y, z) === null;
}

/** O abajur e o criado-mudo: o toque acende e apaga (o id do outro estado, ou null). */
export function acesoOuApagado(b: number): number | null {
  switch (b) {
    case Bloco.ABAJUR:
      return Bloco.ABAJUR_ACESO;
    case Bloco.ABAJUR_ACESO:
      return Bloco.ABAJUR;
    case Bloco.CRIADO_MUDO:
      return Bloco.CRIADO_MUDO_ACESO;
    case Bloco.CRIADO_MUDO_ACESO:
      return Bloco.CRIADO_MUDO;
    default:
      return null;
  }
}

/**
 * As caixas de colisão de uma parte, ainda sem girar (null: não é móvel). A peça solta não
 * chega aqui: quem lê o mundo confere com `movelEm` antes.
 */
export function caixasDaParte(b: number, meta: number): readonly CaixaMovel[] | null {
  const f = MOVEIS.get(b);
  if (!f) return null;
  return f.caixas[parteDoMeta(meta)] ?? [];
}
