/**
 * As luzes da Vila Neon (neon, lâmpadas, telas): uma malha só por chunk, com a cor de cada
 * pedaço numa paleta (uma textura de 64 × 1). A cor sai da textura acesa, e não do vértice,
 * para o brilho da noite (a camada de glow lê a textura acesa) sair da cor de cada tubo: o
 * neon rosa brilha rosa, a lâmpada brilha morna. Continua um material só para o bairro todo.
 */
import type { Scene } from '@babylonjs/core/scene';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { RawTexture } from '@babylonjs/core/Materials/Textures/rawTexture';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { Constants } from '@babylonjs/core/Engines/constants';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import type { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';

export interface PaletaLuz {
  material: StandardMaterial;
  /** Troca a cor dos vértices pelo ponto dela na paleta (uv). */
  aplicar(vd: VertexData): void;
  descartar(): void;
}

const N = 64;

export function criarPaletaLuz(scene: Scene, nome: string, comNevoa = true): PaletaLuz {
  const dados = new Uint8Array(N * 4);
  const tex = new RawTexture(
    dados,
    N,
    1,
    Constants.TEXTUREFORMAT_RGBA,
    scene,
    false,
    false,
    Texture.NEAREST_SAMPLINGMODE,
  );
  tex.wrapU = Texture.CLAMP_ADDRESSMODE;
  tex.wrapV = Texture.CLAMP_ADDRESSMODE;
  const material = new StandardMaterial(nome, scene);
  material.disableLighting = true;
  material.emissiveTexture = tex;
  material.emissiveColor = Color3.Black();
  material.diffuseColor = Color3.Black();
  material.specularColor = Color3.Black();
  material.fogEnabled = comNevoa;
  const indice = new Map<number, number>();
  return {
    material,
    aplicar(vd) {
      const C = vd.colors;
      const n = vd.positions!.length / 3;
      const uvs = new Float32Array(n * 2);
      let mudou = false;
      for (let i = 0; i < n; i++) {
        const r = C ? Math.round(C[i * 4] * 255) : 255;
        const g = C ? Math.round(C[i * 4 + 1] * 255) : 255;
        const b = C ? Math.round(C[i * 4 + 2] * 255) : 255;
        const k = (r << 16) | (g << 8) | b;
        let j = indice.get(k);
        if (j === undefined) {
          // paleta cheia (não acontece: o bairro usa umas 20 cores de luz): a última vale
          j = Math.min(indice.size, N - 1);
          indice.set(k, j);
          dados.set([r, g, b, 255], j * 4);
          mudou = true;
        }
        uvs[i * 2] = (j + 0.5) / N;
        uvs[i * 2 + 1] = 0.5;
      }
      if (mudou) tex.update(dados);
      vd.uvs = uvs;
      vd.colors = null;
    },
    descartar() {
      material.dispose();
      tex.dispose();
    },
  };
}
