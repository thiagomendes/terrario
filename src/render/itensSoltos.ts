import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Vector4 } from '@babylonjs/core/Maths/math.vector';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import type { BaseTexture } from '@babylonjs/core/Materials/Textures/baseTexture';
import type { Scene } from '@babylonjs/core/scene';
import type { Atlas, FaceBloco } from '../art/atlas';
import type { ItemSolto } from '../jogo/drops';
import { obterItem } from '../jogo/itens';
import { obterBloco } from '../world/blocks';

/** Desenha os itens soltos: cubinhos girando para blocos, placas com o ícone para o resto. */
export function criarRenderItens(
  scene: Scene,
  atlas: Atlas,
  texAtlas: BaseTexture,
  icone: (item: string) => string,
  excluirDoGlow: (m: Mesh) => void,
) {
  const matBloco = new StandardMaterial('item-solto-bloco', scene);
  matBloco.diffuseTexture = texAtlas;
  matBloco.specularColor = Color3.Black();
  matBloco.ambientColor = Color3.White();
  matBloco.emissiveColor = new Color3(0.08, 0.08, 0.08);
  const matsIcone = new Map<string, StandardMaterial>();
  const malhas = new Map<number, Mesh>();

  function materialIcone(item: string): StandardMaterial {
    let m = matsIcone.get(item);
    if (!m) {
      m = new StandardMaterial(`item-icone-${item}`, scene);
      const t = new Texture(icone(item), scene, true, true, Texture.NEAREST_SAMPLINGMODE);
      t.hasAlpha = true;
      m.diffuseTexture = t;
      m.useAlphaFromDiffuseTexture = true;
      m.backFaceCulling = false;
      m.specularColor = Color3.Black();
      m.ambientColor = Color3.White();
      m.emissiveColor = new Color3(0.15, 0.15, 0.15);
      matsIcone.set(item, m);
    }
    return m;
  }

  function criar(it: ItemSolto): Mesh {
    const def = obterItem(it.item);
    const bloco = def?.bloco;
    let m: Mesh;
    const planta =
      bloco !== undefined && (obterBloco(bloco)?.planta || obterBloco(bloco)?.forma === 'cruz');
    if (bloco !== undefined && !planta) {
      const faces: FaceBloco[] = ['frente', 'lado', 'lado', 'lado', 'topo', 'base'];
      const faceUV = faces.map((f) => {
        const uv = atlas.uvDaFace(bloco, f) ?? atlas.uvDoBloco(bloco);
        return uv ? new Vector4(uv.u0, uv.v1, uv.u1, uv.v0) : new Vector4(0, 0, 1, 1);
      });
      m = MeshBuilder.CreateBox(`item-${it.id}`, { size: 0.25, faceUV }, scene);
      m.material = matBloco;
    } else {
      m = MeshBuilder.CreatePlane(`item-${it.id}`, { size: 0.42 }, scene);
      m.material = materialIcone(it.item);
    }
    m.isPickable = false;
    m.receiveShadows = false;
    excluirDoGlow(m);
    return m;
  }

  return {
    atualizar(itens: readonly ItemSolto[], tempo: number): void {
      const vivos = new Set<number>();
      for (const it of itens) {
        vivos.add(it.id);
        let m = malhas.get(it.id);
        if (!m) {
          m = criar(it);
          malhas.set(it.id, m);
        }
        const bob = Math.sin(tempo * 2.5 + it.id) * 0.06;
        m.position.set(it.x, it.y + 0.08 + bob, it.z);
        m.rotation.y = tempo * 1.6 + it.id;
        const s = it.qtd > 1 ? 1.15 : 1;
        m.scaling.setAll(s);
      }
      for (const [id, m] of malhas) {
        if (vivos.has(id)) continue;
        m.dispose();
        malhas.delete(id);
      }
    },
  };
}
