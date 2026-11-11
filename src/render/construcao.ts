import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Vector3, Vector4 } from '@babylonjs/core/Maths/math.vector';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import type { BaseTexture } from '@babylonjs/core/Materials/Textures/baseTexture';
import type { LinesMesh } from '@babylonjs/core/Meshes/linesMesh';
import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import type { Scene } from '@babylonjs/core/scene';
import type { Atlas, FaceBloco } from '../art/atlas';
import type { Ponto } from '../jogo/construcao';

const COR_NORMAL = new Color3(0.25, 0.25, 0.25);
/** Spec 016: o fantasma onde o bloco não vai (mel, como o contorno do que não quebra). */
const COR_PROIBIDO = new Color3(0.85, 0.5, 0.12);

/** Prévia fantasma do bloco a colocar e caixa de seleção do modo construção. */
export function criarVisualConstrucao(
  scene: Scene,
  atlas: Atlas,
  texAtlas: BaseTexture,
  excluir: (m: Mesh) => void,
) {
  const mat = new StandardMaterial('fantasma', scene);
  mat.diffuseTexture = texAtlas;
  mat.alpha = 0.38;
  mat.specularColor = Color3.Black();
  mat.emissiveColor = COR_NORMAL.clone();
  mat.ambientColor = Color3.White();
  let fantasma: Mesh | null = null;
  let blocoFantasma = -1;

  function criarFantasma(bloco: number): void {
    fantasma?.dispose();
    const faces: FaceBloco[] = ['frente', 'lado', 'lado', 'lado', 'topo', 'base'];
    const faceUV = faces.map((f) => {
      const uv = atlas.uvDaFace(bloco, f) ?? atlas.uvDoBloco(bloco);
      return uv ? new Vector4(uv.u0, uv.v1, uv.u1, uv.v0) : new Vector4(0, 0, 1, 1);
    });
    fantasma = MeshBuilder.CreateBox('fantasma', { size: 1.002, faceUV }, scene);
    fantasma.material = mat;
    fantasma.isPickable = false;
    fantasma.renderingGroupId = 0;
    excluir(fantasma);
    blocoFantasma = bloco;
  }

  let caixa: LinesMesh | null = null;
  let chaveCaixa = '';
  function definirCaixa(a: Ponto | null, b: Ponto | null, cor: Color3): void {
    const k = a && b ? `${a.x},${a.y},${a.z}|${b.x},${b.y},${b.z}|${cor.toHexString()}` : '';
    if (k === chaveCaixa) return;
    chaveCaixa = k;
    caixa?.dispose();
    caixa = null;
    if (!a || !b) return;
    const x0 = Math.min(a.x, b.x) - 0.01;
    const y0 = Math.min(a.y, b.y) - 0.01;
    const z0 = Math.min(a.z, b.z) - 0.01;
    const x1 = Math.max(a.x, b.x) + 1.01;
    const y1 = Math.max(a.y, b.y) + 1.01;
    const z1 = Math.max(a.z, b.z) + 1.01;
    const v = (x: number, y: number, z: number) => new Vector3(x, y, z);
    const linhas = [
      [v(x0, y0, z0), v(x1, y0, z0), v(x1, y0, z1), v(x0, y0, z1), v(x0, y0, z0)],
      [v(x0, y1, z0), v(x1, y1, z0), v(x1, y1, z1), v(x0, y1, z1), v(x0, y1, z0)],
      [v(x0, y0, z0), v(x0, y1, z0)],
      [v(x1, y0, z0), v(x1, y1, z0)],
      [v(x1, y0, z1), v(x1, y1, z1)],
      [v(x0, y0, z1), v(x0, y1, z1)],
    ];
    caixa = MeshBuilder.CreateLineSystem('selecao', { lines: linhas }, scene);
    caixa.color = cor;
    caixa.isPickable = false;
    caixa.renderingGroupId = 1;
    excluir(caixa);
  }

  return {
    /** Mostra o fantasma do bloco em p (ou esconde com bloco nulo). */
    /**
     * Mostra o fantasma do bloco em p (ou esconde com bloco nulo). `proibido` (spec 016): ali
     * não vai (passagem, construção do mundo): o fantasma fica de mel e mais apagado.
     */
    fantasma(p: Ponto | null, bloco: number | null, tempo: number, proibido = false): void {
      if (!p || !bloco) {
        fantasma?.setEnabled(false);
        return;
      }
      if (bloco !== blocoFantasma) criarFantasma(bloco);
      fantasma!.setEnabled(true);
      fantasma!.position.set(p.x + 0.5, p.y + 0.5, p.z + 0.5);
      mat.emissiveColor.copyFrom(proibido ? COR_PROIBIDO : COR_NORMAL);
      mat.alpha = (proibido ? 0.2 : 0.3) + Math.sin(tempo * 4) * 0.08;
    },
    caixa: definirCaixa,
  };
}
