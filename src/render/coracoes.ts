/**
 * Coraçõezinhos (spec 013): sobem do bicho que ganhou comida. Poucas peças fundidas, feitas
 * uma vez e reaproveitadas; plástico vermelho com um brilho próprio, sem transparência (some
 * encolhendo, como as pecinhas dos outros efeitos).
 */
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import type { Scene } from '@babylonjs/core/scene';
import { caixaArredondada, esfera } from './formas';

/** Corações vivos de uma vez (duas festas seguidas reaproveitam os mais velhos). */
const MAX = 10;
const DURACAO = 1.4;

export function criarCoracoes(scene: Scene, preparar: (m: Mesh) => void) {
  const mat = new StandardMaterial('coracao-mat', scene);
  mat.diffuseColor = new Color3(0.93, 0.22, 0.36);
  mat.emissiveColor = new Color3(0.45, 0.08, 0.16);
  mat.specularColor = new Color3(0.35, 0.35, 0.35);
  mat.specularPower = 40;
  const pecas: { m: Mesh; t: number; x: number; y: number; z: number; fase: number }[] = [];
  for (let i = 0; i < MAX; i++) {
    // dois lóbulos e a ponta (uma caixa girada 45°), numa peça só
    const a = esfera(`coracao-a-${i}`, scene, 0.06, mat, [1, 1, 0.7]);
    a.position.set(-0.052, 0.035, 0);
    const b = esfera(`coracao-b-${i}`, scene, 0.06, mat, [1, 1, 0.7]);
    b.position.set(0.052, 0.035, 0);
    const p = caixaArredondada(`coracao-p-${i}`, scene, 0.12, 0.12, 0.08, 0.015, mat, 2);
    p.rotation.z = Math.PI / 4;
    p.position.set(0, -0.03, 0);
    const m = Mesh.MergeMeshes([a, b, p], true, true)!;
    m.name = `coracao-${i}`;
    m.billboardMode = Mesh.BILLBOARDMODE_Y;
    m.setEnabled(false);
    preparar(m);
    pecas.push({ m, t: DURACAO, x: 0, y: 0, z: 0, fase: i * 1.7 });
  }
  let proxima = 0;
  return {
    /** Uma festinha de corações em volta de (x, y, z). */
    soltar(x: number, y: number, z: number, n = 5): void {
      for (let k = 0; k < n; k++) {
        const c = pecas[proxima];
        proxima = (proxima + 1) % MAX;
        const ang = (k / n) * Math.PI * 2;
        c.x = x + Math.cos(ang) * 0.3;
        c.z = z + Math.sin(ang) * 0.3;
        c.y = y;
        // os de trás nascem um tiquinho depois (sobem em fila, não num bloco só)
        c.t = -k * 0.12;
        c.m.setEnabled(false);
      }
    },
    atualizar(dt: number): void {
      for (const c of pecas) {
        if (c.t >= DURACAO) continue;
        c.t += dt;
        if (c.t < 0) continue;
        if (c.t >= DURACAO) {
          c.m.setEnabled(false);
          continue;
        }
        const u = c.t / DURACAO;
        if (!c.m.isEnabled()) c.m.setEnabled(true);
        c.m.position.set(c.x + Math.sin(c.t * 5 + c.fase) * 0.08, c.y + u * 1.1, c.z);
        // cresce rápido, pulsa e encolhe no fim
        const e = Math.min(1, c.t * 6) * (u > 0.7 ? 1 - (u - 0.7) / 0.3 : 1);
        const pulso = 1 + Math.sin(c.t * 14) * 0.08;
        c.m.scaling.setAll(Math.max(0.02, e * pulso * 1.3));
      }
    },
    /** Quantos estão na tela (testes). */
    get vivos(): number {
      return pecas.filter((c) => c.t >= 0 && c.t < DURACAO).length;
    },
  };
}
