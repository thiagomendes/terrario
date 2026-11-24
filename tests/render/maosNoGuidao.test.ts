import { describe, expect, it } from 'vitest';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Scene } from '@babylonjs/core/scene';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { criarBoneco } from '../../src/render/boneco';
import { normalizarAparencia } from '../../src/personagem/aparencia';
import { calcularPose } from '../../src/personagem/poses';
import { GUIDAO, IDS_ANDAR } from '../../src/personagem/brinquedoAndar';
import '../../src/temas/todos';

/**
 * Spec 036 (T05, acerto do dono: "as mãos não seguram o guidão"): montada, as duas mãos fecham
 * nos punhos do guidão (o patinete e a bicicletinha) e no volante (o carrinho), parada e
 * andando (no impulso do patinete e no pedal), nos dois corpos. Na nuvem, as mãos descansam na
 * almofada. E o brinquedo não balança com o passo (o volante firme): só a nuvem boia.
 *
 * O boneco de verdade (o desenho, num motor sem tela), com a pose do jogo de quem anda (a fase do
 * passo, o giro do tronco e a inclinação do corpo vivo) aplicada quadro a quadro.
 */
const quadros = (b: ReturnType<typeof criarBoneco>, andando: boolean, n: number, t0 = 0) => {
  for (let i = 0; i < n; i++) {
    const tempo = t0 + i / 60;
    const pose = calcularPose({
      andando,
      correndo: false,
      noAr: false,
      minerando: false,
      colocando: false,
      tempo,
      ...(andando ? { passo: { fase: tempo * Math.PI * 2 * 1.6, amplitude: 0.55 }, inclina: 0.12, roll: 0.08 } : {}),
    });
    b.aplicarPose(pose, {
      dt: 1 / 60,
      olhar: 0,
      vista: { tempo, passada: andando ? 1 : 0, golpe: null, colocar: null, noAr: 0, comer: null },
    });
  }
};

function noMundo(scene: Scene, prefixo: string, local: readonly [number, number, number]): Vector3 {
  const prancha = scene.getTransformNodeByName(`${prefixo}-junta-prancha`) as TransformNode;
  prancha.computeWorldMatrix(true);
  return Vector3.TransformCoordinates(new Vector3(...local), prancha.getWorldMatrix());
}

function mao(scene: Scene, prefixo: string, lado: 'E' | 'D'): Vector3 {
  const no = scene.getTransformNodeByName(`${prefixo}-junta-mao${lado}`) as TransformNode;
  const cadeia: TransformNode[] = [];
  for (let n: TransformNode | null = no; n; n = n.parent as TransformNode | null) cadeia.unshift(n);
  for (const n of cadeia) n.computeWorldMatrix(true);
  return no.getAbsolutePosition().clone();
}

describe('spec 036 (T05): montada, as mãos no guidão e o brinquedo firme', () => {
  for (const corpo of ['feminino', 'masculino'] as const)
    for (const id of IDS_ANDAR)
      it(`${corpo}, ${id}: as mãos fecham nos punhos, parada e andando`, () => {
        const scene = new Scene(new NullEngine());
        const a = normalizarAparencia({ corpo, premium: { andar: id }, montado: true });
        const b = criarBoneco(scene, a, 'p', undefined, true, true);
        b.posicionar(0, 0, 0, 0.7);
        const g = GUIDAO[id];
        const longe: string[] = [];
        for (const andando of [false, true]) {
          quadros(b, andando, 90);
          // amostras ao longo de um ciclo inteiro (o impulso do patinete leva 1,3 s)
          for (let k = 0; k < 16; k++) {
            quadros(b, andando, 6, 1.5 + k * 0.1);
            for (const lado of ['E', 'D'] as const) {
              const alvo = noMundo(scene, 'p', g[lado]);
              const d = Vector3.Distance(mao(scene, 'p', lado), alvo);
              if (d > g.folga) longe.push(`${andando ? 'andando' : 'parada'} mão ${lado}: ${d.toFixed(3)}`);
            }
          }
        }
        expect(longe.slice(0, 6)).toEqual([]);
        scene.dispose();
      });

  it.each(['carrinho-pedal', 'patinete-luz', 'bicicletinha'] as const)('%s: o brinquedo não balança com o passo (o volante e o guidão firmes)', (id) => {
    const scene = new Scene(new NullEngine());
    const b = criarBoneco(scene, normalizarAparencia({ premium: { andar: id }, montado: true }), 'q', undefined, true, true);
    b.posicionar(0, 0, 0, 0);
    const ref = GUIDAO[id].D;
    quadros(b, true, 60);
    const p0 = noMundo(scene, 'q', ref);
    let maior = 0;
    for (let k = 0; k < 30; k++) {
      quadros(b, true, 3, 1 + k * 0.05);
      maior = Math.max(maior, Vector3.Distance(noMundo(scene, 'q', ref), p0));
    }
    expect(maior).toBeLessThan(1e-6);
    scene.dispose();
  });
});
