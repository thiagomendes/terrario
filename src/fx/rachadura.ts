import { hash2 } from '../world/noise';

export const TAM_RACHADURA = 32;
export const ESTAGIOS_RACHADURA = 5;
const CAMINHANTES = 6;
const PASSOS_POR_ESTAGIO = 5;

/** RGBA 32x32: pixels escuros opacos nas rachaduras, transparente no resto. */
export function gerarTexturaRachadura(estagio: number, semente: number): Uint8ClampedArray {
  const e = Math.max(1, Math.min(ESTAGIOS_RACHADURA, Math.round(estagio)));
  const pixels = new Uint8ClampedArray(TAM_RACHADURA * TAM_RACHADURA * 4);
  const passos = e * PASSOS_POR_ESTAGIO;
  for (let c = 0; c < CAMINHANTES; c++) {
    let x = 16 + (hash2(c, 1, semente) - 0.5) * 8;
    let y = 16 + (hash2(c, 2, semente) - 0.5) * 8;
    let ang = ((c + hash2(c, 3, semente) * 0.6) * Math.PI * 2) / CAMINHANTES;
    for (let p = 0; p < passos; p++) {
      ang += (hash2(c, 10 + p, semente) - 0.5) * 0.5;
      x += Math.cos(ang) * 0.8;
      y += Math.sin(ang) * 0.8;
      const px = Math.floor(x);
      const py = Math.floor(y);
      if (px < 0 || py < 0 || px >= TAM_RACHADURA || py >= TAM_RACHADURA) continue;
      const i = (py * TAM_RACHADURA + px) * 4;
      pixels[i] = 12;
      pixels[i + 1] = 10;
      pixels[i + 2] = 18;
      pixels[i + 3] = 255;
    }
  }
  return pixels;
}

export function coberturaRachadura(pixels: Uint8ClampedArray): number {
  let n = 0;
  for (let i = 3; i < pixels.length; i += 4) if (pixels[i] === 255) n++;
  return n;
}
