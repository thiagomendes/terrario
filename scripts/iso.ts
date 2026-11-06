/** Rotinas mínimas de imagem para as vitrines (PNG, polígonos, projeção isométrica). */
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';

// --- imagem e PNG ------------------------------------------------------------
export interface Img {
  w: number;
  h: number;
  px: Uint8ClampedArray;
  /** Profundidade por pixel (maior = mais perto), usada quando o polígono informa a sua. */
  z?: Float32Array;
}
export function novaImg(w: number, h: number, fundo: [number, number, number] = [24, 22, 30]): Img {
  const px = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    px[i * 4] = fundo[0];
    px[i * 4 + 1] = fundo[1];
    px[i * 4 + 2] = fundo[2];
    px[i * 4 + 3] = 255;
  }
  return { w, h, px };
}
export function ponto(img: Img, x: number, y: number, c: readonly number[]): void {
  x = Math.floor(x);
  y = Math.floor(y);
  if (x < 0 || y < 0 || x >= img.w || y >= img.h) return;
  const a = (c[3] ?? 255) / 255;
  if (a <= 0) return;
  const i = (y * img.w + x) * 4;
  img.px[i] = img.px[i] * (1 - a) + c[0] * a;
  img.px[i + 1] = img.px[i + 1] * (1 - a) + c[1] * a;
  img.px[i + 2] = img.px[i + 2] * (1 - a) + c[2] * a;
}
export function retangulo(
  img: Img,
  x: number,
  y: number,
  w: number,
  h: number,
  c: readonly number[],
) {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) ponto(img, x + i, y + j, c);
}
/** Preenche um polígono convexo (pontos em ordem). */
export function poligono(
  img: Img,
  pts: [number, number][],
  c: readonly number[],
  prof?: number,
): void {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const [x, y] of pts) {
    x0 = Math.min(x0, x);
    y0 = Math.min(y0, y);
    x1 = Math.max(x1, x);
    y1 = Math.max(y1, y);
  }
  for (let y = Math.floor(y0); y <= Math.ceil(y1); y++)
    for (let x = Math.floor(x0); x <= Math.ceil(x1); x++) {
      const px = x + 0.5;
      const py = y + 0.5;
      let dentro = true;
      let sinal = 0;
      for (let k = 0; k < pts.length; k++) {
        const [ax, ay] = pts[k];
        const [bx, by] = pts[(k + 1) % pts.length];
        const cr = (bx - ax) * (py - ay) - (by - ay) * (px - ax);
        if (Math.abs(cr) < 1e-9) continue;
        const s = Math.sign(cr);
        if (sinal === 0) sinal = s;
        else if (s !== sinal) {
          dentro = false;
          break;
        }
      }
      if (!dentro) continue;
      if (prof !== undefined) {
        if (x < 0 || y < 0 || x >= img.w || y >= img.h) continue;
        img.z ??= new Float32Array(img.w * img.h).fill(-Infinity);
        const i = y * img.w + x;
        if (prof < img.z[i]) continue;
        img.z[i] = prof;
      }
      ponto(img, x, y, c);
    }
}
const TABELA_CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc(b: Uint8Array): number {
  let c = 0xffffffff;
  for (const v of b) c = TABELA_CRC[(c ^ v) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
export function salvarPngEm(img: Img, caminho: string): void {
  const linhas = new Uint8Array(img.h * (img.w * 4 + 1));
  for (let y = 0; y < img.h; y++) {
    linhas[y * (img.w * 4 + 1)] = 0;
    linhas.set(img.px.subarray(y * img.w * 4, (y + 1) * img.w * 4), y * (img.w * 4 + 1) + 1);
  }
  const pedaco = (tipo: string, dados: Uint8Array) => {
    const b = new Uint8Array(12 + dados.length);
    const v = new DataView(b.buffer);
    v.setUint32(0, dados.length);
    for (let i = 0; i < 4; i++) b[4 + i] = tipo.charCodeAt(i);
    b.set(dados, 8);
    v.setUint32(8 + dados.length, crc(b.subarray(4, 8 + dados.length)));
    return b;
  };
  const ihdr = new Uint8Array(13);
  const v = new DataView(ihdr.buffer);
  v.setUint32(0, img.w);
  v.setUint32(4, img.h);
  ihdr.set([8, 6, 0, 0, 0], 8);
  const partes = [
    new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
    pedaco('IHDR', ihdr),
    pedaco('IDAT', new Uint8Array(deflateSync(linhas))),
    pedaco('IEND', new Uint8Array()),
  ];
  const total = new Uint8Array(partes.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of partes) {
    total.set(p, o);
    o += p.length;
  }
  writeFileSync(caminho, total);
  console.log('gravado', caminho);
}

// --- projeção isométrica -------------------------------------------------------
export type V3 = [number, number, number];
export function iso(p: V3, w: number, cx: number, cy: number): [number, number] {
  return [cx + (p[0] - p[2]) * w * 0.5, cy + (p[0] + p[2]) * w * 0.25 - p[1] * w * 0.5];
}
