import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import type { BaseTexture } from '@babylonjs/core/Materials/Textures/baseTexture';
import type { Scene } from '@babylonjs/core/scene';
import type { Atlas } from '../art/atlas';
import type { ItemSolto as ItemCompleto } from '../jogo/drops';
import { obterItem } from '../jogo/itens';
import { criarPlasticos } from './formas';
import { modeloNaMao } from './itensBrinquedo';

/** O que o desenho precisa de um item no chão. */
type ItemSolto = Pick<ItemCompleto, 'id' | 'item' | 'qtd' | 'x' | 'y' | 'z'>;

/**
 * Itens soltos de brinquedo (spec 012, A4): o mesmo modelo 3D que vai na mão (a ferramenta
 * inteira, a maçã, o lingote, o bloco de quina redonda com a tampa da grama) e as pecinhas das
 * plantas do mundo, girando e flutuando. Antes eram cubinhos de pixel e placas com o ícone.
 */
export function criarRenderItens(
  scene: Scene,
  _atlas: Atlas,
  _texAtlas: BaseTexture,
  _icone: (item: string) => string,
  excluirDoGlow: (m: Mesh) => void,
) {
  const mats = criarPlasticos(scene, 'item-solto');
  const itens = new Map<number, { no: TransformNode; malhas: Mesh[] }>();

  function criar(it: ItemSolto): { no: TransformNode; malhas: Mesh[] } {
    const no = new TransformNode(`item-${it.id}`, scene);
    const def = obterItem(it.item);
    const bloco = def?.bloco;
    const malhas: Mesh[] = [];
    const modelo = modeloNaMao(
      scene,
      mats,
      bloco !== undefined ? bloco : null,
      bloco === undefined ? it.item : null,
      `item-${it.id}`,
    );
    if (modelo) {
      modelo.no.parent = no;
      // a ferramenta inclinada, apoiada no chão; o resto um pouco maior que na mão
      if (modelo.ferramenta) {
        modelo.no.rotation.set(0, 0, -0.5);
        modelo.no.position.set(0.12, -0.12, 0);
        modelo.no.scaling.setAll(0.8);
      } else modelo.no.scaling.setAll(1.3);
      malhas.push(...modelo.malhas);
    }
    for (const m of malhas) {
      m.isPickable = false;
      m.receiveShadows = false;
      excluirDoGlow(m);
    }
    return { no, malhas };
  }

  return {
    atualizar(lista: readonly ItemSolto[], tempo: number): void {
      const vivos = new Set<number>();
      for (const it of lista) {
        vivos.add(it.id);
        let m = itens.get(it.id);
        if (!m) {
          m = criar(it);
          itens.set(it.id, m);
        }
        const bob = Math.sin(tempo * 2.5 + it.id) * 0.06;
        m.no.position.set(it.x, it.y + 0.14 + bob, it.z);
        m.no.rotation.y = tempo * 1.6 + it.id;
        m.no.scaling.setAll(it.qtd > 1 ? 1.15 : 1);
      }
      for (const [id, m] of itens) {
        if (vivos.has(id)) continue;
        for (const malha of m.malhas) malha.dispose();
        m.no.dispose();
        itens.delete(id);
      }
    },
  };
}
