import { describe, expect, it } from 'vitest';
import {
  ALTURA_VOAR,
  RIGIDEZ_VOO,
  adiantar,
  passoMola,
  querVoar,
  type Mola,
} from '../../src/render/seguirVoando';

/**
 * Spec 036 (T02): o unicórnio voando junto segue liso. A criança voa de lado a 11 e a 20 blocos
 * por segundo, com quadros de tamanhos que variam (o celular), e o bicho nunca dá um pulo maior
 * que o passo dela, nem fica para trás, nem treme.
 */
function voar(vel: number, quadros: number[]) {
  const m: Mola = { x: -1.2, y: 10, z: -1.5, vx: 0, vy: 0, vz: 0 };
  const k = adiantar(RIGIDEZ_VOO);
  let cx = 0;
  const passos: number[] = [];
  let maiorAtraso = 0;
  // o tranco: o quanto a velocidade de subir e descer muda de um quadro para o outro
  let sobeDesce = 0;
  let vyAntes: number | null = null;
  let t = 0;
  for (const dt of quadros) {
    t += dt;
    cx += vel * dt;
    // a criança sobe e desce um tico (o voo de verdade não é uma linha)
    const cy = 12 + Math.sin(t * 0.8) * 0.6;
    const antes = [m.x, m.y, m.z];
    passoMola(m, [cx - 1.2 + vel * k, cy, -1.5], RIGIDEZ_VOO, dt);
    passos.push(Math.hypot(m.x - antes[0], m.y - antes[1], m.z - antes[2]) / (vel * dt));
    const vy = (m.y - antes[1]) / dt;
    if (t > 1.5) {
      maiorAtraso = Math.max(maiorAtraso, Math.abs(cx - 1.2 - m.x));
      if (vyAntes !== null) sobeDesce = Math.max(sobeDesce, Math.abs(vy - vyAntes));
    }
    vyAntes = vy;
  }
  return { maiorPasso: Math.max(...passos.slice(30)), maiorAtraso, sobeDesce };
}

describe('036 T02: o unicórnio voando junto', () => {
  // 6 s de quadros: 60 por segundo com tropeços de 30 e de 20 (o celular cansado)
  const quadros = Array.from({ length: 360 }, (_, i) => (i % 17 === 0 ? 0.05 : i % 5 === 0 ? 1 / 30 : 1 / 60));
  for (const vel of [11, 20])
    it(`a ${vel} blocos por segundo: sem salto, sem ficar para trás, sem tremer`, () => {
      const r = voar(vel, quadros);
      // (o passo do bicho em cada quadro nunca passa muito do passo da criança)
      expect(r.maiorPasso).toBeLessThan(1.35);
      expect(r.maiorAtraso).toBeLessThan(0.6);
      // (menos de 0,1 bloco por segundo de um quadro para o outro: nada de tranco)
      expect(r.sobeDesce).toBeLessThan(0.1);
    });

  it('a mola chega ao lugar sem passar do ponto', () => {
    const m: Mola = { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0 };
    let passou = false;
    for (let i = 0; i < 120; i++) {
      passoMola(m, [3, 0, 0], RIGIDEZ_VOO, 1 / 60);
      if (m.x > 3 + 1e-9) passou = true;
    }
    expect(passou).toBe(false);
    expect(m.x).toBeGreaterThan(2.97);
  });

  it('a mola é estável com o quadro mais longo', () => {
    const m: Mola = { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0 };
    for (let i = 0; i < 40; i++) passoMola(m, [5, 0, 0], RIGIDEZ_VOO, 0.25);
    expect(m.x).toBeCloseTo(5, 3);
  });

  it('um pulo comum não liga o voo; bem no alto liga; perto do chão desliga', () => {
    expect(querVoar(false, 1.45)).toBe(false);
    expect(querVoar(false, ALTURA_VOAR + 0.1)).toBe(true);
    expect(querVoar(false, null)).toBe(true);
    // voando, só desce quando chega perto do chão (nada de liga e desliga no meio)
    expect(querVoar(true, 1.6)).toBe(true);
    expect(querVoar(true, 0.6)).toBe(false);
  });
});
