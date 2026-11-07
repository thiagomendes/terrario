import { hash2 } from '../world/noise';

/** Resolução da textura (filtrada, sem degrau de pixel: traço de brinquedo, spec 012). */
export const TAM_RACHADURA = 64;
export const ESTAGIOS_RACHADURA = 5;
const CAMINHANTES = 6;
const PASSOS_POR_ESTAGIO = 5;

/** RGBA 32x32: pixels escuros opacos nas rachaduras, transparente no resto. */
export function gerarTexturaRachadura(estagio: number, semente: number): Uint8ClampedArray {
  const e = Math.max(1, Math.min(ESTAGIOS_RACHADURA, Math.round(estagio)));
  const pixels = new Uint8ClampedArray(TAM_RACHADURA * TAM_RACHADURA * 4);
  const passos = e * PASSOS_POR_ESTAGIO;
  for (let c = 0; c < CAMINHANTES; c++) {
    const k = TAM_RACHADURA / 32;
    let x = (16 + (hash2(c, 1, semente) - 0.5) * 8) * k;
    let y = (16 + (hash2(c, 2, semente) - 0.5) * 8) * k;
    let ang = ((c + hash2(c, 3, semente) * 0.6) * Math.PI * 2) / CAMINHANTES;
    for (let p = 0; p < passos; p++) {
      ang += (hash2(c, 10 + p, semente) - 0.5) * 0.5;
      x += Math.cos(ang) * 0.8 * k;
      y += Math.sin(ang) * 0.8 * k;
      // traço macio e arredondado: um carimbo redondo com a borda esfumada
      const raio = 1.9;
      for (let dy = -3; dy <= 3; dy++)
        for (let dx = -3; dx <= 3; dx++) {
          const px = Math.floor(x) + dx;
          const py = Math.floor(y) + dy;
          if (px < 0 || py < 0 || px >= TAM_RACHADURA || py >= TAM_RACHADURA) continue;
          const d = Math.hypot(px + 0.5 - x, py + 0.5 - y);
          if (d > raio + 1) continue;
          const a = Math.round(215 * Math.min(1, Math.max(0, raio + 1 - d)));
          const i = (py * TAM_RACHADURA + px) * 4;
          if (a <= pixels[i + 3]) continue;
          pixels[i] = 70;
          pixels[i + 1] = 46;
          pixels[i + 2] = 34;
          pixels[i + 3] = a;
        }
    }
  }
  return pixels;
}

export function coberturaRachadura(pixels: Uint8ClampedArray): number {
  let n = 0;
  for (let i = 3; i < pixels.length; i += 4) if (pixels[i] > 0) n++;
  return n;
}
