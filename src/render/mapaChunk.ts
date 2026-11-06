/** Mapa: cores de um chunk visto de cima (relevo e água), para o minimapa e o mapa grande. */
import { TAM_X, TAM_Z } from '../world/chunk';
import type { ProvedorBlocos } from '../world/provedor';
import { corDaColuna, topoDaColuna, type Rgb } from '../jogo/mapa';
import { corMediaDoBloco } from '../fx/cores';

/** Cores do chunk; null se o chunk ainda não chegou do worker (o mapa nunca gera terreno). */
export function amostrarMapaChunk(
  provedor: ProvedorBlocos,
  blocoEm: (x: number, y: number, z: number) => number,
  cx: number,
  cz: number,
): Uint8ClampedArray | null {
  // só chunks já entregues pelo worker: o mapa nunca gera terreno na thread principal
  if (!provedor.tem(cx, cz)) return null;
  const vizX = provedor.tem(cx - 1, cz);
  const vizZ = provedor.tem(cx, cz - 1);
  const out = new Uint8ClampedArray(TAM_X * TAM_Z * 4);
  const alturas = new Int32Array((TAM_X + 1) * (TAM_Z + 1));
  const topos: { bloco: number; y: number; agua: number }[] = [];
  for (let z = -1; z < TAM_Z; z++)
    for (let x = -1; x < TAM_X; x++) {
      const wx = cx * TAM_X + (x < 0 && !vizX ? 0 : x);
      const wz = cz * TAM_Z + (z < 0 && !vizZ ? 0 : z);
      const t = topoDaColuna((y) => blocoEm(wx, y, wz));
      alturas[(z + 1) * (TAM_X + 1) + (x + 1)] = t.y;
      if (x >= 0 && z >= 0) topos.push(t);
    }
  let k = 0;
  for (let z = 0; z < TAM_Z; z++)
    for (let x = 0; x < TAM_X; x++, k++) {
      const t = topos[k];
      const base = (corMediaDoBloco(t.bloco) ?? [20, 22, 30]) as Rgb;
      const no = alturas[z * (TAM_X + 1) + x];
      const c = corDaColuna(base, t.y, no, t.agua);
      out.set([c[0], c[1], c[2], 255], k * 4);
    }
  return out;
}
