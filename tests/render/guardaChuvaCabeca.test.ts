import { describe, expect, it } from 'vitest';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Scene } from '@babylonjs/core/scene';
import { Matrix, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer';
import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import type { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { criarBoneco } from '../../src/render/boneco';
import { ESTILOS_CABELO, normalizarAparencia } from '../../src/personagem/aparencia';
import { calcularPose } from '../../src/personagem/poses';
import '../../src/temas/todos';

/**
 * Spec 036 (portão visual, pedido do revisor: "o guarda-chuva parece espetado no alto da
 * cabeça"): a mão levanta ao lado da cabeça, um pouco acima do ombro, e o cabo sobe dela; o pano
 * fica por cima, cobrindo a cabeça. De nenhum ângulo o cabo atravessa a cabeça ou o cabelo, nem
 * passa escondido atrás dela: nos 9 penteados dos dois corpos, parado, andando e correndo,
 * nenhuma parte do guarda-chuva fica dentro do contorno da cabeça (com o cabelo) visto de frente
 * e de costas, na altura e no fundo em que está (o que passa atrás ou na frente dela, a até um
 * palmo, conta).
 * E o pano cobre a cabeça (o meio dela fica debaixo do pano).
 *
 * O boneco de verdade (o desenho, num motor sem tela), com a pose do jogo aplicada quadro a
 * quadro. A cabeça vira gavetas de 4 cm de altura e 8 de fundo, cada uma com a largura dela; o guarda-chuva é
 * amostrado ao longo das arestas dos triângulos (o cabo é um cilindro: só as pontas dele não
 * diriam se ele atravessa).
 */
const quadros = (b: ReturnType<typeof criarBoneco>, modo: 'parado' | 'andando' | 'correndo', n: number, t0: number) => {
  for (let i = 0; i < n; i++) {
    const tempo = t0 + i / 60;
    const anda = modo !== 'parado';
    const corre = modo === 'correndo';
    const pose = calcularPose({
      andando: anda,
      correndo: corre,
      noAr: false,
      minerando: false,
      colocando: false,
      tempo,
      ...(anda
        ? { passo: { fase: tempo * Math.PI * 2 * (corre ? 2.2 : 1.6), amplitude: corre ? 0.8 : 0.55 }, inclina: corre ? 0.2 : 0.12, roll: 0.08 }
        : {}),
    });
    b.aplicarPose(pose, {
      dt: 1 / 60,
      olhar: 0,
      vista: { tempo, passada: corre ? 1.5 : anda ? 1 : 0, golpe: null, colocar: null, noAr: 0, comer: null },
    });
  }
};

const atualizar = (no: TransformNode) => {
  const cadeia: TransformNode[] = [];
  for (let n: TransformNode | null = no; n; n = n.parent as TransformNode | null) cadeia.unshift(n);
  for (const n of cadeia) n.computeWorldMatrix(true);
};

/** Os pontos da malha (com as arestas amostradas) no espaço da cabeça. */
function pontos(m: Mesh, paraCabeca: Matrix, arestas: number): Vector3[] {
  atualizar(m);
  const pos = m.getVerticesData(VertexBuffer.PositionKind)!;
  const ind = m.getIndices()!;
  const mat = m.getWorldMatrix().multiply(paraCabeca);
  const v = (i: number) => Vector3.TransformCoordinates(new Vector3(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]), mat);
  const out: Vector3[] = [];
  for (let t = 0; t < ind.length; t += 3) {
    const [a, b, c] = [v(ind[t]), v(ind[t + 1]), v(ind[t + 2])];
    for (const [p, q] of [
      [a, b],
      [b, c],
      [c, a],
    ])
      for (let k = 0; k <= arestas; k++) out.push(Vector3.Lerp(p, q, arestas ? k / arestas : 0));
  }
  return out;
}

const FOLGA = 0.03;
const FATIA = 0.04;
const FUNDO = 0.08;
const PERTO = 0.12;

describe('036 (portão): o guarda-chuva na mão, por cima da cabeça, sem encostar nela', () => {
  for (const corpo of ['feminino', 'masculino'] as const)
    it(`${corpo}: nada dentro do contorno da cabeça nos ${ESTILOS_CABELO} penteados, e o pano cobre a cabeça`, () => {
      const problemas: string[] = [];
      for (let cabeloEstilo = 0; cabeloEstilo < ESTILOS_CABELO; cabeloEstilo++) {
        const scene = new Scene(new NullEngine());
        const a = normalizarAparencia({ corpo, cabeloEstilo, premium: { mao: 'guarda-chuva-gotinhas' } });
        const b = criarBoneco(scene, a, 'p', undefined, true, true);
        b.posicionar(0, 0, 0, 0.7);
        const cabeca = scene.getTransformNodeByName('p-junta-cabeca') as TransformNode;
        const guarda = scene.meshes.filter((m) => m.name.startsWith('p-guarda')) as Mesh[];
        const daCabeca = scene.meshes.filter((m) => {
          if (m.name.startsWith('p-guarda')) return false;
          for (let n = m.parent; n; n = n.parent) if (n === cabeca) return true;
          return false;
        }) as Mesh[];
        expect(guarda.length).toBeGreaterThan(0);
        expect(daCabeca.length).toBeGreaterThan(0);
        let t = 0;
        let pior = Infinity;
        let onde = '';
        for (const modo of ['parado', 'andando', 'correndo'] as const) {
          quadros(b, modo, 90, t);
          t += 1.5;
          for (let k = 0; k < 8; k++) {
            quadros(b, modo, 7, t);
            t += 0.12;
            atualizar(cabeca);
            const paraCabeca = cabeca.getWorldMatrix().clone().invert();
            // a cabeça (com o cabelo) em gavetas de altura e de fundo, no espaço dela: a largura
            // de cada uma
            const fatias = new Map<string, [number, number]>();
            let topo = -Infinity;
            for (const m of daCabeca)
              for (const p of pontos(m, paraCabeca, 4)) {
                const i = `${Math.floor(p.y / FATIA)},${Math.floor(p.z / FUNDO)}`;
                const f = fatias.get(i) ?? [Infinity, -Infinity];
                fatias.set(i, [Math.min(f[0], p.x), Math.max(f[1], p.x)]);
                topo = Math.max(topo, p.y);
              }
            let cobreMeio = false;
            for (const m of guarda)
              for (const p of pontos(m, paraCabeca, 8)) {
                // as gavetas na altura do ponto (com a folga para cima e para baixo) e no fundo
                // dele, até um palmo para trás e para a frente: o cabo passando logo atrás da
                // cabeça parece espetado nela; o pano lá longe, atrás, não
                const gavetas: [number, number][] = [];
                for (const y of [p.y - FOLGA, p.y, p.y + FOLGA])
                  for (let z = Math.floor((p.z - PERTO) / FUNDO); z <= Math.floor((p.z + PERTO) / FUNDO); z++) {
                    const f = fatias.get(`${Math.floor(y / FATIA)},${z}`);
                    if (f) gavetas.push(f);
                  }
                for (const f of gavetas) {
                  const dentro = Math.min(p.x - f[0], f[1] - p.x);
                  if (-dentro < pior) {
                    pior = -dentro;
                    onde = `${modo} ${p.x.toFixed(2)},${p.y.toFixed(2)},${p.z.toFixed(2)} (${f[0].toFixed(2)}..${f[1].toFixed(2)})`;
                  }
                  if (dentro > -FOLGA)
                    problemas.push(
                      `cabelo ${cabeloEstilo} ${modo}: ${p.x.toFixed(2)},${p.y.toFixed(2)},${p.z.toFixed(2)} dentro da cabeça (${f[0].toFixed(2)}..${f[1].toFixed(2)})`,
                    );
                }
              }
            // o pano por cima do meio da cabeça: um triângulo dele, acima do topo, no prumo do meio
            for (const m of guarda) {
              const v = pontos(m, paraCabeca, 0);
              // (sem amostrar as arestas, cada triângulo dá os três cantos em seguida)
              for (let i = 0; i + 2 < v.length && !cobreMeio; i += 3) {
                const [a, b, c] = [v[i], v[i + 1], v[i + 2]];
                if (Math.min(a.y, b.y, c.y) <= topo) continue;
                const lado = (p: Vector3, q: Vector3) => (q.x - p.x) * -p.z - (q.z - p.z) * -p.x;
                const s = [lado(a, b), lado(b, c), lado(c, a)];
                if (s.every((x) => x >= 0) || s.every((x) => x <= 0)) cobreMeio = true;
              }
            }
            if (!cobreMeio) problemas.push(`cabelo ${cabeloEstilo} ${modo}: o pano não cobre o meio da cabeça`);
          }
        }
        if (process.env.DIAG) console.log(`DIAG ${corpo} cabelo ${cabeloEstilo}: a menor distância ao contorno ${pior.toFixed(3)} em ${onde}`);
        b.descartar();
        scene.dispose();
      }
      expect(problemas.slice(0, 6)).toEqual([]);
    });
});
