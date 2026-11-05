/** Hash inteiro determinístico de (x, y, semente), resultado em [0, 1). */
export function hash2(x: number, y: number, semente: number): number {
  let h =
    (Math.imul(x | 0, 374761393) +
      Math.imul(y | 0, 668265263) +
      Math.imul(semente | 0, 2147483647)) |
    0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h = Math.imul(h ^ (h >>> 16), 2246822519);
  h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}

function suave(t: number): number {
  return t * t * (3 - 2 * t);
}

/** Ruído de valor 2D suave em [0, 1). */
export function ruido2(x: number, y: number, semente: number): number {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = suave(x - x0);
  const fy = suave(y - y0);
  const a = hash2(x0, y0, semente);
  const b = hash2(x0 + 1, y0, semente);
  const c = hash2(x0, y0 + 1, semente);
  const d = hash2(x0 + 1, y0 + 1, semente);
  const topo = a + (b - a) * fx;
  const base = c + (d - c) * fx;
  return topo + (base - topo) * fy;
}

/** Soma de oitavas, normalizada em [0, 1). */
export function fbm2(x: number, y: number, semente: number, oitavas = 4): number {
  let soma = 0;
  let amp = 1;
  let freq = 1;
  let total = 0;
  for (let i = 0; i < oitavas; i++) {
    soma += ruido2(x * freq, y * freq, semente + i * 101) * amp;
    total += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return soma / total;
}
