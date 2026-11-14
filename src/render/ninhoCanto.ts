/**
 * Spec 031: o ninho de gravetos do canto das missões da Era dos Dinos (feito aqui, peça por
 * peça, no jeito de brinquedo da 012). Fica por cima do fundo de folhas de ginkgo que a geração
 * põe: uma tigela baixa de gravetos trançados em duas voltas, uns galhinhos soltos para fora e
 * folhinhas verdes na borda. Os ovinhos que a criança pega são itens de verdade, em volta.
 *
 * Tudo vira três malhas (uma por cor), sem colisão, sem sombra projetada nem picking: a câmera
 * e o toque passam por ele.
 */
import type { Scene } from '@babylonjs/core/scene';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { criarPlasticos, cilindro, esfera, type Plasticos } from './formas';
import { hash2 } from '../world/noise';

const GRAVETO_ESCURO = '#5e3618';
const GRAVETO_MEDIO = '#8c5a2c';
const GRAVETO_CLARO = '#c4914f';
const PALHA = '#d9a64a';
const FOLHA = '#7cc35a';

export interface Ninho {
  malhas: Mesh[];
  descartar(): void;
}

/** O ninho com o meio em (x, y, z) (y: o chão onde ele assenta). */
export function criarNinho(scene: Scene, x: number, y: number, z: number): Ninho {
  const mats: Plasticos = criarPlasticos(scene, 'ninho-canto');
  const grupos = new Map<string, Mesh[]>();
  const juntar = (cor: string, m: Mesh) => {
    const g = grupos.get(cor) ?? [];
    g.push(m);
    grupos.set(cor, g);
  };
  const s = (i: number, k: number) => hash2(i, k, 3131);

  // a tigela: um anel gordo e alto de palha escura (o corpo do ninho), por baixo dos gravetos
  const corpo = MeshBuilder.CreateTorus(
    'ninho-corpo',
    { diameter: 1.95, thickness: 0.62, tessellation: 32 },
    scene,
  );
  corpo.scaling.y = 0.72;
  corpo.position.y = 0.2;
  juntar(GRAVETO_ESCURO, corpo);
  // o fundo de dentro: palhinha seca (por cima do bloco de ginkgo, um pouco mais escura)
  const fundo = cilindro('ninho-fundo', scene, 0.08, 0.72, 0.72, mats.cor(PALHA));
  fundo.position.y = 0.06;
  juntar(PALHA, fundo);

  // três voltas de gravetos cruzados (o trançado): cada um deitado na volta, inclinado para
  // um lado ou para o outro, alternando o claro e o médio (o escuro é o corpo, por baixo)
  for (const [volta, raio, alt, n] of [
    [0, 1.06, 0.1, 20],
    [1, 1.02, 0.26, 20],
    [2, 0.9, 0.42, 16],
  ] as const)
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + volta * 0.21;
      const cor = (i + volta) % 2 ? GRAVETO_CLARO : GRAVETO_MEDIO;
      const comp = 0.62 + s(i + 9, volta) * 0.3;
      const g = cilindro(`ninho-g${volta}-${i}`, scene, comp, 0.058, 0.044, mats.cor(cor));
      g.position.set(Math.cos(a) * raio, alt + (s(i, volta + 5) - 0.5) * 0.05, Math.sin(a) * raio);
      // deitado ao longo da volta (tangente), cruzando: um sobe, o outro desce
      g.rotation.set(Math.PI / 2, -a, (i % 2 ? 1 : -1) * 0.38 + (s(i, volta + 7) - 0.5) * 0.2);
      juntar(cor, g);
    }
  // galhinhos soltos saindo da borda, para cima e para fora (o ninho não fica certinho demais)
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + 0.4;
    const cor = i % 3 ? GRAVETO_CLARO : GRAVETO_MEDIO;
    const g = cilindro(`ninho-solto${i}`, scene, 0.5 + s(i, 31) * 0.2, 0.036, 0.02, mats.cor(cor));
    g.position.set(Math.cos(a) * 1.12, 0.42, Math.sin(a) * 1.12);
    g.rotation.set(Math.PI / 2 - 0.75, -a + 0.9, 0.35);
    juntar(cor, g);
  }
  // folhinhas de samambaia na borda
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + 0.2;
    const f = esfera(`ninho-folha${i}`, scene, 0.13, mats.cor(FOLHA, 0.2), [1.6, 0.32, 0.75]);
    f.position.set(Math.cos(a) * 1.0, 0.55, Math.sin(a) * 1.0);
    f.rotation.set(0, -a + 0.5, 0.25);
    juntar(FOLHA, f);
  }

  const malhas: Mesh[] = [];
  for (const [cor, lista] of grupos) {
    const m = Mesh.MergeMeshes(lista, true, true, undefined, false, false);
    if (!m) continue;
    m.name = `ninho-canto-${cor}`;
    m.material = mats.cor(cor, cor === FOLHA ? 0.2 : 0.12);
    m.position.set(x, y, z);
    m.isPickable = false;
    m.receiveShadows = true;
    m.freezeWorldMatrix();
    malhas.push(m);
  }
  return {
    malhas,
    descartar() {
      for (const m of malhas) m.dispose();
      mats.descartar();
    },
  };
}
