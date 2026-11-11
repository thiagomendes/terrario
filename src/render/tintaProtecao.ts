/**
 * Tinta da proteção (spec 016, só nos testes de tela): pinta por cima das células
 * protegidas em volta de um ponto, uma cor por tipo, para as capturas mostrarem o que a
 * regra protege. Uma malha só, com cor por vértice, refeita a cada chamada.
 */
import type { Scene } from '@babylonjs/core/scene';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { ALTURA } from '../world/chunk';
import { Protecao, type ProtecaoMundo } from '../world/protecao';

/** Cor de cada tipo (o livre não pinta). */
const CORES: Record<number, [number, number, number]> = {
  [Protecao.ESTRUTURA]: [1, 0.25, 0.2],
  [Protecao.USAVEL]: [0.2, 0.55, 1],
  [Protecao.LAVOURA]: [0.3, 0.95, 0.3],
  [Protecao.CHAO]: [1, 0.8, 0.15],
  [Protecao.PASSAGEM]: [0.85, 0.3, 1],
};

/** As 6 faces do cubo unitário (4 cantos cada, em ordem para dois triângulos). */
const FACES: number[][][] = [
  [
    [0, 0, 0],
    [0, 1, 0],
    [1, 1, 0],
    [1, 0, 0],
  ],
  [
    [1, 0, 1],
    [1, 1, 1],
    [0, 1, 1],
    [0, 0, 1],
  ],
  [
    [0, 0, 1],
    [0, 1, 1],
    [0, 1, 0],
    [0, 0, 0],
  ],
  [
    [1, 0, 0],
    [1, 1, 0],
    [1, 1, 1],
    [1, 0, 1],
  ],
  [
    [0, 1, 0],
    [0, 1, 1],
    [1, 1, 1],
    [1, 1, 0],
  ],
  [
    [0, 0, 1],
    [0, 0, 0],
    [1, 0, 0],
    [1, 0, 1],
  ],
];

export interface TintaProtecao {
  /** Pinta num raio (blocos) em volta de (x, z); raio 0 apaga. Devolve as células pintadas. */
  pintar(x: number, z: number, raio: number, so?: Protecao[]): number;
}

export function criarTintaProtecao(scene: Scene, prot: () => ProtecaoMundo): TintaProtecao {
  let malha: Mesh | null = null;
  const mat = new StandardMaterial('tinta-protecao', scene);
  mat.disableLighting = true;
  mat.emissiveColor = new Color3(1, 1, 1);
  mat.alpha = 0.38;
  mat.backFaceCulling = false;
  return {
    pintar(x0, z0, raio, so) {
      malha?.dispose();
      malha = null;
      if (raio <= 0) return 0;
      const p = prot();
      const pos: number[] = [];
      const cor: number[] = [];
      const ind: number[] = [];
      const e = 0.02;
      let n = 0;
      const r = Math.min(64, Math.floor(raio));
      const cx = Math.floor(x0);
      const cz = Math.floor(z0);
      for (let x = cx - r; x <= cx + r; x++)
        for (let z = cz - r; z <= cz + r; z++)
          for (let y = 1; y < ALTURA; y++) {
            const v = p.em(x, y, z);
            if (v === Protecao.LIVRE || (so && !so.includes(v))) continue;
            const c = CORES[v];
            n++;
            for (const f of FACES) {
              const b = pos.length / 3;
              for (const [dx, dy, dz] of f) {
                pos.push(
                  x + dx * (1 + 2 * e) - e,
                  y + dy * (1 + 2 * e) - e,
                  z + dz * (1 + 2 * e) - e,
                );
                cor.push(c[0], c[1], c[2], 1);
              }
              ind.push(b, b + 1, b + 2, b, b + 2, b + 3);
            }
          }
      if (!n) return 0;
      const vd = new VertexData();
      vd.positions = pos;
      vd.colors = cor;
      vd.indices = ind;
      malha = new Mesh('tinta-protecao', scene);
      vd.applyToMesh(malha);
      malha.useVertexColors = true;
      malha.hasVertexAlpha = false;
      malha.material = mat;
      malha.isPickable = false;
      return n;
    },
  };
}
