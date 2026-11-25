/**
 * Mira nos fantasmas da obra (spec 014, T06): uma conta pura, a mesma no teste e na cena.
 *
 * Os fantasmas são células vazias (o raio de sempre passa por elas). Aqui o raio pega o
 * fantasma em que bate e, no toque, o "ímã": o dedo que cai a até meio bloco de um fantasma
 * pega o fantasma mais perto do raio (nenhum toque "erra" por pouco). Um bloco de verdade na
 * frente tapa o fantasma de trás.
 */
export interface Ponto3 {
  x: number;
  y: number;
  z: number;
}

/** Onde o raio entra na caixa [c - folga, c + 1 + folga] (null: não bate). */
export function entradaNaCaixa(o: Ponto3, d: Ponto3, c: Ponto3, folga = 0): number | null {
  let t0 = -Infinity;
  let t1 = Infinity;
  for (const k of ['x', 'y', 'z'] as const) {
    const min = c[k] - folga;
    const max = c[k] + 1 + folga;
    if (Math.abs(d[k]) < 1e-9) {
      if (o[k] < min || o[k] > max) return null;
      continue;
    }
    let a = (min - o[k]) / d[k];
    let b = (max - o[k]) / d[k];
    if (a > b) [a, b] = [b, a];
    t0 = Math.max(t0, a);
    t1 = Math.min(t1, b);
    if (t0 > t1) return null;
  }
  if (t1 < 0) return null;
  return Math.max(0, t0);
}

/** Distância do centro da célula até a reta do raio (para o ímã escolher o mais perto). */
function distanciaAoRaio(o: Ponto3, d: Ponto3, c: Ponto3): number {
  const px = c.x + 0.5 - o.x;
  const py = c.y + 0.5 - o.y;
  const pz = c.z + 0.5 - o.z;
  const n = Math.hypot(d.x, d.y, d.z) || 1;
  const t = (px * d.x + py * d.y + pz * d.z) / n;
  return Math.sqrt(Math.max(0, px * px + py * py + pz * pz - t * t));
}

export interface OpcoesMiraObra {
  /** Até onde o raio vai (blocos, a partir da origem). */
  limite: number;
  /** Ímã: quanto a caixa de cada fantasma cresce (0,5 no toque; 0 na mira do centro). */
  ima: number;
  /** Onde o raio bate no primeiro bloco de verdade (Infinity: em nenhum). */
  solido: number;
  /** O fantasma está ao alcance das mãos (a regra do núcleo, com a folga do cliente)? */
  alcanca(c: Ponto3): boolean;
  /**
   * Spec 037: o fantasma já encosta num bloco? Só desempata entre os que o ímã pega (o
   * apoiado ganha do solto); nunca passa na frente do fantasma tocado em cheio.
   */
  apoiado?(c: Ponto3): boolean;
}

/**
 * O fantasma que o raio pega, ou null. Primeiro o que ele acerta em cheio (o mais perto);
 * senão, com o ímã, o de caixa crescida mais perto da reta do raio (o apoiado antes).
 */
export function fantasmaNoRaio<T extends Ponto3>(
  origem: Ponto3,
  direcao: Ponto3,
  fantasmas: readonly T[],
  op: OpcoesMiraObra,
): T | null {
  let melhor: T | null = null;
  let melhorT = Infinity;
  let ima: T | null = null;
  let imaD = Infinity;
  let imaApoiado = false;
  for (const f of fantasmas) {
    const t = entradaNaCaixa(origem, direcao, f, 0);
    if (t !== null && t <= op.limite && t <= op.solido + 1e-6 && t < melhorT && op.alcanca(f)) {
      melhor = f;
      melhorT = t;
      continue;
    }
    if (op.ima <= 0 || melhor) continue;
    const tf = entradaNaCaixa(origem, direcao, f, op.ima);
    if (tf === null || tf > op.limite || tf > op.solido + 1e-6 || !op.alcanca(f)) continue;
    const dr = distanciaAoRaio(origem, direcao, f);
    const apoiado = op.apoiado ? op.apoiado(f) : false;
    if ((apoiado && !imaApoiado) || (apoiado === imaApoiado && dr < imaD)) {
      ima = f;
      imaD = dr;
      imaApoiado = apoiado;
    }
  }
  return melhor ?? ima;
}
