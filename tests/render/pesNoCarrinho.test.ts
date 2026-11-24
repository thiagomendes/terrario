import { describe, expect, it } from 'vitest';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Scene } from '@babylonjs/core/scene';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer';
import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import type { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { criarBoneco } from '../../src/render/boneco';
import { normalizarAparencia } from '../../src/personagem/aparencia';
import { calcularPose } from '../../src/personagem/poses';
import '../../src/temas/todos';

/**
 * Spec 036 (portão visual, o revisor: "os sapatos aparecem por cima do capô, na frente do volante,
 * e as pernas atravessam o carro"): sentada no carrinho de pedal, as pernas e os pés ficam dentro
 * da carroceria, parada e pedalando, nos dois corpos: abaixo da beira das laterais e do capô, e por
 * dentro das laterais.
 *
 * O boneco de verdade (o desenho, num motor sem tela), com a pose do jogo quadro a quadro; as
 * pernas medidas pelos cantos das malhas delas, no espaço da prancha (o chão do brinquedo).
 */
const quadros = (b: ReturnType<typeof criarBoneco>, andando: boolean, n: number, t0: number) => {
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

const atualizar = (no: TransformNode) => {
  const cadeia: TransformNode[] = [];
  for (let n: TransformNode | null = no; n; n = n.parent as TransformNode | null) cadeia.unshift(n);
  for (const n of cadeia) n.computeWorldMatrix(true);
};

/** A beira de cima das laterais e do capô (y) e o lado de dentro das laterais (x), na prancha. */
const BEIRA_Y = 0.43;
const DENTRO_X = 0.29;

describe('036 (portão): no carrinho de pedal, as pernas ficam dentro da carroceria', () => {
  for (const corpo of ['feminino', 'masculino'] as const)
    it(`${corpo}: parada e pedalando, nada da perna nem do pé passa da beira`, () => {
      const scene = new Scene(new NullEngine());
      const b = criarBoneco(scene, normalizarAparencia({ corpo, premium: { andar: 'carrinho-pedal' }, montado: true }), 'p', undefined, true, true);
      b.posicionar(0, 0, 0, 0.7);
      const prancha = scene.getTransformNodeByName('p-junta-prancha') as TransformNode;
      const pernas = scene.meshes.filter((m) => /^p-perna[ED]-fundida$/.test(m.name)) as Mesh[];
      expect(pernas.length).toBe(2);
      const fora: string[] = [];
      let t = 0;
      for (const andando of [false, true]) {
        quadros(b, andando, 90, t);
        t += 1.5;
        for (let k = 0; k < 12; k++) {
          quadros(b, andando, 5, t);
          t += 0.083;
          atualizar(prancha);
          const paraPrancha = prancha.getWorldMatrix().clone().invert();
          let alto = -Infinity;
          let largo = 0;
          for (const m of pernas) {
            atualizar(m);
            const mat = m.getWorldMatrix().multiply(paraPrancha);
            const pos = m.getVerticesData(VertexBuffer.PositionKind)!;
            for (let i = 0; i < pos.length; i += 3) {
              const p = Vector3.TransformCoordinates(new Vector3(pos[i], pos[i + 1], pos[i + 2]), mat);
              // (só o que fica na frente do assento: a coxa sobre o assento é a criança sentada)
              if (p.z < 0.02) continue;
              alto = Math.max(alto, p.y);
              largo = Math.max(largo, Math.abs(p.x));
            }
          }
          if (alto > BEIRA_Y || largo > DENTRO_X)
            fora.push(`${andando ? 'pedalando' : 'parada'}: alto ${alto.toFixed(3)}, largo ${largo.toFixed(3)}`);
        }
      }
      expect(fora.slice(0, 4)).toEqual([]);
      scene.dispose();
    });
});
