import { TAM_TILE, gerarAtlas, type Atlas } from '../art/atlas';
import { TETO_LUMINANCIA_EMISSIVA, luminancia } from '../render/emissivo';
import { obterBloco } from '../world/blocks';

let atlasPadrao: Atlas | undefined;

/** Cor média RGB (0 a 255) dos pixels opacos do tile do bloco; vazio para ar. */
export function corMediaDoBloco(id: number, atlas?: Atlas): [number, number, number] | undefined {
  const def = obterBloco(id);
  if (!def || !(def.solido || def.planta)) return undefined;
  const a = atlas ?? (atlasPadrao ??= gerarAtlas());
  const uv = a.uvDaFace(id, 'lado');
  if (!uv) return undefined;
  const ox = Math.round(uv.u0 * a.largura);
  const oy = Math.round(uv.v0 * a.altura);
  let r = 0;
  let g = 0;
  let b = 0;
  let n = 0;
  for (let y = 0; y < TAM_TILE; y++) {
    for (let x = 0; x < TAM_TILE; x++) {
      const i = ((oy + y) * a.largura + ox + x) * 4;
      if (a.pixels[i + 3] < 128) continue;
      r += a.pixels[i];
      g += a.pixels[i + 1];
      b += a.pixels[i + 2];
      n++;
    }
  }
  if (n === 0) return undefined;
  let cor: [number, number, number] = [r / n, g / n, b / n];
  const l = luminancia(cor[0], cor[1], cor[2]);
  const teto = TETO_LUMINANCIA_EMISSIVA * 0.95;
  if (def.emissivo && l > teto) {
    const f = teto / l;
    cor = [cor[0] * f, cor[1] * f, cor[2] * f];
  }
  return [Math.round(cor[0]), Math.round(cor[1]), Math.round(cor[2])];
}
