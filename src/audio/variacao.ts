export type Gerador = () => number;

export function criarGerador(semente: number): Gerador {
  let estado = semente >>> 0;
  return () => {
    estado = (estado + 0x6d2b79f5) >>> 0;
    let t = estado;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function criarVariador(semente: number, n = 4): () => number {
  const rng = criarGerador(semente);
  let ultimo = -1;
  return () => {
    if (n <= 1) return 0;
    let indice = Math.floor(rng() * n);
    if (indice === ultimo) indice = (indice + 1 + Math.floor(rng() * (n - 1))) % n;
    ultimo = indice;
    return indice;
  };
}

export function jitter(rng: Gerador, centro: number, amplitude: number): number {
  return centro + (rng() * 2 - 1) * amplitude;
}
