import { describe, expect, it } from 'vitest';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Scene } from '@babylonjs/core/scene';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { criarBoneco } from '../../src/render/boneco';
import { criarPersonagem } from '../../src/render/personagem';
import { IDS_MODELOS, aparenciaPadrao, normalizarAparencia } from '../../src/personagem/aparencia';
import { calcularPose } from '../../src/personagem/poses';
import { PES, temPes, IDS_ANDAR } from '../../src/personagem/brinquedoAndar';
import { SOLA, medidaDaPerna } from '../../src/personagem/joelho';
import { planoBoneco } from '../../src/personagem/boneco';
import { criarAnimador } from '../../src/player/animacao';
import type { Personagem } from '../../src/render/personagem';
import '../../src/temas/todos';

/**
 * Spec 038 (T02): os pés no pedal, medidos pelo `aplicarPose` de verdade (com a suavização), num
 * motor sem tela. Nos 7 modelos e em cada brinquedo de pedal ou de apoio:
 * - numa volta inteira andando e parada em 8 pontos da volta, com quadros de 1/60 e de 1/20 s;
 * - pelo caminho dos amigos também (o animador do amigo e o personagem do jogo);
 * - a sola (o ponto dela que pisa) fica a no máximo 0,02 bloco do alto do pedal ou do apoio, e
 *   a sola fica a no máximo 35° do chão.
 */
const COM_PES = IDS_ANDAR.filter((id) => temPes(id));
const LONGE = 0.02;
const INCLINA = (35 * Math.PI) / 180;

function atualizar(no: TransformNode): void {
  const cadeia: TransformNode[] = [];
  for (let n: TransformNode | null = no; n; n = n.parent as TransformNode | null) cadeia.unshift(n);
  for (const n of cadeia) n.computeWorldMatrix(true);
}
const no = (scene: Scene, nome: string) => scene.getTransformNodeByName(nome) as TransformNode;

/** A sola de cada pé e o alto do pedal (ou do apoio) dele, no mundo, e a inclinação da sola. */
function medir(scene: Scene, prefixo: string, id: string, quadril: number, coxa: number, pontaZ: number) {
  const pes = PES[id as keyof typeof PES]!;
  const res: Array<{ d: number; inclina: number }> = [];
  for (const lado of ['E', 'D'] as const) {
    const joelho = no(scene, `${prefixo}-junta-joelho${lado}`);
    atualizar(joelho);
    // (a sola por onde o pé pode pisar no pedal redondo, do meio do pé à ponta: um segmento)
    const s0 = Vector3.TransformCoordinates(new Vector3(0, -(quadril - coxa), SOLA.de), joelho.getWorldMatrix());
    const s1 = Vector3.TransformCoordinates(new Vector3(0, -(quadril - coxa), SOLA.ate), joelho.getWorldMatrix());
    void pontaZ;
    const baixo = Vector3.TransformNormal(new Vector3(0, -1, 0), joelho.getWorldMatrix()).normalize();
    const s = lado === 'E' ? -1 : 1;
    let alvo: Vector3;
    const escala = no(scene, `${prefixo}-escala`).scaling.y;
    if (pes.tipo === 'pedal') {
      const pedal = no(scene, `${prefixo}-junta-andarPedal`);
      atualizar(pedal);
      alvo = Vector3.TransformCoordinates(new Vector3(s * pes.x, s * pes.raio, 0), pedal.getWorldMatrix()).add(
        new Vector3(0, pes.raioPedal * escala, 0),
      );
    } else {
      const prancha = no(scene, `${prefixo}-junta-prancha`);
      atualizar(prancha);
      alvo = Vector3.TransformCoordinates(new Vector3(...pes[lado]), prancha.getWorldMatrix());
    }
    const u = s1.subtract(s0);
    const f = Math.max(0, Math.min(1, Vector3.Dot(alvo.subtract(s0), u) / u.lengthSquared()));
    const perto = s0.add(u.scale(f));
    res.push({ d: Vector3.Distance(perto, alvo), inclina: Math.acos(Math.max(-1, Math.min(1, -baixo.y))) });
  }
  return res;
}

/** Quadros de pose de quem anda (ou parado), como o jogo: o passo, o giro do tronco, o corpo. */
function quadros(b: Personagem, andando: boolean, n: number, dt: number, t0: number): number {
  let t = t0;
  for (let i = 0; i < n; i++) {
    t += dt;
    const pose = calcularPose({
      andando,
      correndo: false,
      noAr: false,
      minerando: false,
      colocando: false,
      tempo: t,
      ...(andando ? { passo: { fase: t * Math.PI * 2 * 1.6, amplitude: 0.55 }, inclina: 0.12, roll: 0.08 } : {}),
    });
    b.aplicarPose(pose, { dt, olhar: 0, vista: { tempo: t, passada: andando ? 0.75 : 0, golpe: null, colocar: null, noAr: 0, comer: null } });
  }
  return t;
}

describe('spec 038 (T02): os pés no pedal e no apoio', () => {
  for (const id of COM_PES)
    for (const dt of [1 / 60, 1 / 20])
      it(`${id}, quadros de ${dt === 1 / 60 ? '1/60' : '1/20'} s: nos 7 modelos, a sola no pedal andando e parada`, () => {
        const ruins: string[] = [];
        let maior = 0;
        const graus: string[] = [];
        for (const modelo of IDS_MODELOS) {
          let gMin = 99;
          let gMax = 0;
          const anotar = (inc: number) => {
            gMin = Math.min(gMin, (inc * 180) / Math.PI);
            gMax = Math.max(gMax, (inc * 180) / Math.PI);
          };
          const scene = new Scene(new NullEngine());
          const a = normalizarAparencia({ ...aparenciaPadrao(modelo), premium: { andar: id }, montado: true });
          const m = medidaDaPerna(planoBoneco(a));
          const b = criarBoneco(scene, a, 'p', undefined, true, true);
          b.posicionar(3, 10, -2, 0.7);
          let t = quadros(b, true, Math.round(1.5 / dt), dt, 0);
          // andando: uma volta inteira (a bicicletinha leva ~1,5 s por volta, o carrinho ~2 s)
          for (let k = 0; k < 48; k++) {
            t = quadros(b, true, Math.max(1, Math.round(0.05 / dt)), dt, t);
            for (const r of medir(scene, 'p', id, m.quadril, m.coxa, m.pontaZ)) {
              maior = Math.max(maior, r.d);
              anotar(r.inclina);
              if (r.d > LONGE || r.inclina > INCLINA) ruins.push(`${modelo} andando: ${r.d.toFixed(3)} ${((r.inclina * 180) / Math.PI).toFixed(0)}°`);
            }
          }
          // parada em 8 pontos da volta: anda um pouco, para e assenta
          for (let k = 0; k < 8; k++) {
            t = quadros(b, true, Math.max(1, Math.round((0.11 + k * 0.07) / dt)), dt, t);
            t = quadros(b, false, Math.round(1.5 / dt), dt, t);
            for (const r of medir(scene, 'p', id, m.quadril, m.coxa, m.pontaZ)) {
              maior = Math.max(maior, r.d);
              anotar(r.inclina);
              if (r.d > LONGE || r.inclina > INCLINA) ruins.push(`${modelo} parada ${k}: ${r.d.toFixed(3)} ${((r.inclina * 180) / Math.PI).toFixed(0)}°`);
            }
          }
          graus.push(`${modelo} ${gMin.toFixed(0)}° a ${gMax.toFixed(0)}°`);
          scene.dispose();
        }
        expect(ruins.slice(0, 8), `a sola de cada modelo: ${graus.join('; ')}`).toEqual([]);
        expect(maior).toBeLessThan(LONGE);
      });

  it.each(COM_PES)('%s: pelo caminho dos amigos (o animador e o personagem do jogo), a sola no pedal', (id) => {
    const scene = new Scene(new NullEngine());
    const a = normalizarAparencia({ ...aparenciaPadrao('andarilho'), premium: { andar: id }, montado: true });
    const m = medidaDaPerna(planoBoneco(a));
    const p = criarPersonagem(scene, a);
    const anim = criarAnimador(0);
    const ruins: string[] = [];
    for (let i = 0; i < 240; i++) {
      const dt = i % 3 === 0 ? 1 / 20 : 1 / 60;
      const v = i < 160 ? 3.2 : 0;
      const pose = anim.atualizar(dt, { velocidadeHoriz: v, correndo: false, noChao: true, vx: 0, vz: v });
      p.aplicarPose(pose, { dt, olhar: 0, vista: anim.vista() });
      p.posicionar(0, 5, i * 0.05, anim.yaw());
      if (i < 40) continue;
      for (const r of medir(scene, 'personagem', id, m.quadril, m.coxa, m.pontaZ))
        if (r.d > LONGE) ruins.push(`quadro ${i}: ${r.d.toFixed(3)}`);
    }
    expect(ruins.slice(0, 6)).toEqual([]);
    scene.dispose();
  });
});
