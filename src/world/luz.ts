import { Bloco, REGISTRO_BLOCOS } from './blocks';
import { ALTURA, TAM_X, TAM_Z, indice } from './chunk';

export const LUZ_MAXIMA = 15;

/** Bloqueia toda a luz. */
const OPACO = new Uint8Array(256);
/** Atenuação extra ao atravessar (água, folhas, gelo). */
const ATENUA = new Uint8Array(256);
/** Luz emitida. */
const EMITE = new Uint8Array(256);
for (const b of REGISTRO_BLOCOS) {
  OPACO[b.id] = b.opaco ? 1 : 0;
  EMITE[b.id] = b.luz ?? 0;
  if (b.liquido) ATENUA[b.id] = 2;
  else if (b.folhas) ATENUA[b.id] = 1;
  else if (b.id === Bloco.GELO) ATENUA[b.id] = 1;
}
// blocos que emitem mas são opacos (cristal, luzita) não deixam a luz passar
OPACO[255] = 0;

export interface VizinhosLuz {
  xNeg?: Uint8Array;
  xPos?: Uint8Array;
  zNeg?: Uint8Array;
  zPos?: Uint8Array;
  /** Diagonais (cantos): sem eles, a luz e a sombra de canto vazam na divisa. */
  xNegZNeg?: Uint8Array;
  xPosZNeg?: Uint8Array;
  xNegZPos?: Uint8Array;
  xPosZPos?: Uint8Array;
}

const M = 14; // margem em volta do chunk (luz máxima 15)
const RX = TAM_X + 2 * M;
const RZ = TAM_Z + 2 * M;
const TAM = RX * RZ * ALTURA;

export interface MapaLuz {
  /** Luz do céu (0 a 15) em coordenadas locais do chunk, aceitando -16..31. */
  ceu(x: number, y: number, z: number): number;
  /** Luz de blocos (0 a 15). */
  bloco(x: number, y: number, z: number): number;
}

const REG = new Uint8Array(TAM);
const CEU = new Uint8Array(TAM);
const LUZ = new Uint8Array(TAM);
const FILA = new Int32Array(TAM * 2);

const ri = (x: number, y: number, z: number) => (y * RZ + (z + M)) * RX + (x + M);

/**
 * Calcula a luz do céu e dos blocos para o chunk e uma margem de 16 blocos,
 * usando os 8 vizinhos (diretos e diagonais); regiões sem dados contam como ar aberto.
 */
export function calcularLuz(blocos: Uint8Array, viz: VizinhosLuz = {}): MapaLuz {
  // buffers reaproveitados entre chamadas (o resultado vale até a próxima chamada)
  const reg = REG.fill(0);
  const ceu = CEU.fill(0);
  const luz = LUZ.fill(0);
  // 1) monta a região
  const fontes: [Uint8Array | undefined, number, number][] = [
    [blocos, 0, 0],
    [viz.xNeg, -TAM_X, 0],
    [viz.xPos, TAM_X, 0],
    [viz.zNeg, 0, -TAM_Z],
    [viz.zPos, 0, TAM_Z],
    [viz.xNegZNeg, -TAM_X, -TAM_Z],
    [viz.xPosZNeg, TAM_X, -TAM_Z],
    [viz.xNegZPos, -TAM_X, TAM_Z],
    [viz.xPosZPos, TAM_X, TAM_Z],
  ];
  for (const [b, ox, oz] of fontes) {
    if (!b) continue;
    for (let y = 0; y < ALTURA; y++)
      for (let z = 0; z < TAM_Z; z++) {
        const rz = z + oz;
        if (rz < -M || rz >= TAM_Z + M) continue;
        for (let x = 0; x < TAM_X; x++) {
          const rx = x + ox;
          if (rx < -M || rx >= TAM_X + M) continue;
          reg[ri(rx, y, rz)] = b[indice(x, y, z)];
        }
      }
  }
  // 2) luz do céu descendo pelas colunas
  const fila = FILA;
  let ini = 0;
  let fim = 0;
  // acima do terreno mais alto da região tudo é 15: a semeadura só precisa ir até lá
  let topoMax = 0;
  for (let z = -M; z < TAM_Z + M; z++)
    for (let x = -M; x < TAM_X + M; x++) {
      let l = LUZ_MAXIMA;
      for (let y = ALTURA - 1; y >= 0; y--) {
        const i = ri(x, y, z);
        const id = reg[i];
        if (OPACO[id] || ATENUA[id]) topoMax = Math.max(topoMax, y + 1);
        if (OPACO[id]) break;
        l = Math.max(0, l - ATENUA[id]);
        if (l === 0) break;
        ceu[i] = l;
      }
    }
  // semeia a propagação nas bordas entre claro e escuro
  const passoY = RX * RZ;
  for (let y = 0; y <= Math.min(ALTURA - 1, topoMax + 1); y++)
    for (let z = -M; z < TAM_Z + M; z++)
      for (let x = -M; x < TAM_X + M; x++) {
        const i = ri(x, y, z);
        const l = ceu[i];
        if (l < 2) continue;
        const temEscuro =
          (x > -M && ceu[i - 1] < l - 1 && !OPACO[reg[i - 1]]) ||
          (x < TAM_X + M - 1 && ceu[i + 1] < l - 1 && !OPACO[reg[i + 1]]) ||
          (z > -M && ceu[i - RX] < l - 1 && !OPACO[reg[i - RX]]) ||
          (z < TAM_Z + M - 1 && ceu[i + RX] < l - 1 && !OPACO[reg[i + RX]]) ||
          (y > 0 && ceu[i - passoY] < l - 1 && !OPACO[reg[i - passoY]]);
        if (temEscuro) fila[fim++] = i;
      }
  propagar(ceu, reg, fila, ini, fim);

  // 3) luz de blocos (tochas, cristais, lanternas...)
  ini = 0;
  fim = 0;
  const fimEmissores = Math.min(ALTURA, topoMax + 2) * RX * RZ;
  for (let i = 0; i < fimEmissores; i++) {
    const e = EMITE[reg[i]];
    if (e > 0) {
      luz[i] = e;
      fila[fim++] = i;
    }
  }
  propagar(luz, reg, fila, ini, fim, true);

  const ler = (arr: Uint8Array) => (x: number, y: number, z: number) => {
    if (y >= ALTURA) return arr === ceu ? LUZ_MAXIMA : 0;
    if (y < 0 || x < -M || x >= TAM_X + M || z < -M || z >= TAM_Z + M) return 0;
    return arr[ri(x, y, z)];
  };
  return { ceu: ler(ceu), bloco: ler(luz) };
}

function propagar(
  luz: Uint8Array,
  reg: Uint8Array,
  fila: Int32Array,
  inicio: number,
  fimInicial: number,
  fontesOpacas = false,
): void {
  let ini = inicio;
  let fim = fimInicial;
  const passoY = RX * RZ;
  while (ini < fim) {
    const i = fila[ini++];
    const l = luz[i];
    if (l <= 1) continue;
    const x = (i % RX) - M;
    const z = (Math.floor(i / RX) % RZ) - M;
    const y = Math.floor(i / passoY);
    const tentar = (j: number) => {
      const id = reg[j];
      if (OPACO[id]) return;
      const nl = l - 1 - ATENUA[id];
      if (nl > luz[j]) {
        luz[j] = nl;
        if (fim < fila.length) fila[fim++] = j;
      }
    };
    void fontesOpacas;
    if (x > -M) tentar(i - 1);
    if (x < TAM_X + M - 1) tentar(i + 1);
    if (z > -M) tentar(i - RX);
    if (z < TAM_Z + M - 1) tentar(i + RX);
    if (y > 0) tentar(i - passoY);
    if (y < ALTURA - 1) tentar(i + passoY);
  }
}
