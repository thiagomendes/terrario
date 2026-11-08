import { atlasParaCanvas, gerarAtlas, TAM_TILE, type Atlas } from '../art/atlas';
import { obterBloco } from '../world/blocks';
import { obterItem } from '../jogo/itens';
import { pintarIconeItem } from '../art/itens';

let atlas: Atlas | null = null;
let fonte: HTMLCanvasElement | null = null;
const cache = new Map<string, string>();

function base() {
  if (!atlas) {
    atlas = gerarAtlas();
    fonte = atlasParaCanvas(atlas);
  }
  return { atlas: atlas!, fonte: fonte! };
}

/** Desenha o bloco em perspectiva isométrica (topo e dois lados sombreados). */
export function desenharIsometrico(
  ctx: CanvasRenderingContext2D,
  fonte: CanvasImageSource,
  faces: { topo: [number, number]; lado: [number, number] },
  tam: number,
): void {
  const T = TAM_TILE;
  ctx.imageSmoothingEnabled = false;
  const a = tam / 2;
  const q = tam / 4;
  const sombra = (f: number) => {
    ctx.fillStyle = `rgba(0,0,0,${f})`;
    ctx.fillRect(0, 0, T, T);
  };
  ctx.save();
  ctx.setTransform(a / T, q / T, -a / T, q / T, a, 0);
  ctx.drawImage(fonte, faces.topo[0], faces.topo[1], T, T, 0, 0, T, T);
  ctx.restore();
  ctx.save();
  ctx.setTransform(a / T, q / T, 0, a / T, 0, q);
  ctx.drawImage(fonte, faces.lado[0], faces.lado[1], T, T, 0, 0, T, T);
  sombra(0.22);
  ctx.restore();
  ctx.save();
  ctx.setTransform(a / T, -q / T, 0, a / T, a, a);
  ctx.drawImage(fonte, faces.lado[0], faces.lado[1], T, T, 0, 0, T, T);
  sombra(0.4);
  ctx.restore();
}

/** Ícones de brinquedo desenhados do modelo 3D (spec 012); valem sobre os de pixel. */
const brinquedo = new Map<string, string>();
export const EVENTO_ICONES = 'brumaluz:icones';

/** Recebe um lote de ícones de brinquedo e avisa a interface para redesenhar. */
export function definirIconesBrinquedo(lote: Map<string, string>): void {
  for (const [id, url] of lote) brinquedo.set(id, url);
  window.dispatchEvent(new CustomEvent(EVENTO_ICONES));
}

/** Ícone do item como data URL (64x64), com cache. */
export function iconeDoItem(item: string): string {
  const deBrinquedo = brinquedo.get(item);
  if (deBrinquedo) return deBrinquedo;
  const pronto = cache.get(item);
  if (pronto) return pronto;
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const ctx = c.getContext('2d');
  const def = obterItem(item);
  if (ctx && def) {
    if (def.bloco !== undefined && def.tipo === 'bloco') {
      const { atlas, fonte } = base();
      const px = (uv: { u0: number; v0: number }): [number, number] => [
        Math.round(uv.u0 * atlas.largura),
        Math.round(uv.v0 * atlas.altura),
      ];
      const lado = atlas.uvDaFace(def.bloco, 'lado');
      const topo = atlas.uvDaFace(def.bloco, 'topo');
      const b = obterBloco(def.bloco);
      if (lado && topo) {
        if (b?.planta || b?.forma === 'cruz') {
          ctx.imageSmoothingEnabled = false;
          const [x, y] = px(lado);
          ctx.drawImage(fonte, x, y, TAM_TILE, TAM_TILE, 6, 6, 52, 52);
        } else {
          desenharIsometrico(ctx, fonte, { topo: px(topo), lado: px(lado) }, 64);
        }
      }
    } else {
      pintarIconeItem(ctx, def);
    }
  }
  const url = c.toDataURL();
  cache.set(item, url);
  return url;
}

const cacheTextura = new Map<string, string>();
/** Tile do bloco (16x16) como data URL, para fundos pixelados da interface. */
export function texturaDoBloco(bloco: number, face: 'lado' | 'topo' = 'lado'): string {
  const chave = `${bloco}:${face}`;
  const pronto = cacheTextura.get(chave);
  if (pronto) return pronto;
  const { atlas, fonte } = base();
  const uv = atlas.uvDaFace(bloco, face);
  const c = document.createElement('canvas');
  c.width = TAM_TILE;
  c.height = TAM_TILE;
  const ctx = c.getContext('2d');
  if (ctx && uv) {
    ctx.drawImage(
      fonte,
      Math.round(uv.u0 * atlas.largura),
      Math.round(uv.v0 * atlas.altura),
      TAM_TILE,
      TAM_TILE,
      0,
      0,
      TAM_TILE,
      TAM_TILE,
    );
  }
  const url = c.toDataURL();
  cacheTextura.set(chave, url);
  return url;
}
