import { describe, expect, it } from 'vitest';
import {
  AMPLITUDE_ANDAR,
  AMPLITUDE_CORRER,
  CURVA_MAXIMA,
  LIMITE_CABECA,
  FRACAO_CABECA,
  atualizarCorpo,
  agachar,
  criarCorpo,
  yawDoMovimento,
  type EntradaCorpo,
} from '../../src/personagem/vida';
import { difAngulo } from '../../src/player/camera';
import { criarAnimador } from '../../src/player/animacao';
import type { CamadaPose } from '../../src/personagem/poses';

const dt = 1 / 60;
const parado: EntradaCorpo = {
  dt,
  vx: 0,
  vz: 0,
  correndo: false,
  noChao: true,
  alvoYaw: null,
  olharYaw: 0,
};
function rodar(c = criarCorpo(0), e: Partial<EntradaCorpo>, quadros: number) {
  let s = atualizarCorpo(c, { ...parado, ...e });
  for (let i = 1; i < quadros; i++) s = atualizarCorpo(c, { ...parado, ...e });
  return s;
}

describe('o corpo vira para onde anda', () => {
  it('gira suave para a direção do movimento, sem virar de uma vez', () => {
    const c = criarCorpo(0);
    const um = atualizarCorpo(c, { ...parado, vx: 4.3, vz: 0 });
    expect(um.yaw).toBeGreaterThan(0);
    expect(um.yaw).toBeLessThan((Math.PI / 2) * 0.3);
    const s = rodar(c, { vx: 4.3, vz: 0 }, 60);
    expect(s.yaw).toBeCloseTo(yawDoMovimento(4.3, 0), 2);
  });
  it('parado mantém a frente (não volta para a câmera)', () => {
    const c = criarCorpo(1.2);
    const s = rodar(c, { olharYaw: -2 }, 120);
    expect(s.yaw).toBeCloseTo(1.2, 6);
  });
  it('minerando vira para o bloco, mesmo andando para outro lado', () => {
    const s = rodar(criarCorpo(0), { vx: 0, vz: 4, alvoYaw: 2.5 }, 60);
    expect(Math.abs(difAngulo(s.yaw, 2.5))).toBeLessThan(0.02);
  });
  it('vira pelo caminho mais curto (de 3 para -3 passa por pi)', () => {
    const c = criarCorpo(3);
    const s = atualizarCorpo(c, { ...parado, vx: Math.sin(-3) * 4, vz: Math.cos(-3) * 4 });
    expect(Math.abs(difAngulo(3, s.yaw))).toBeLessThan(0.3);
  });
});

describe('peso no movimento', () => {
  it('arranque e freada suaves: a passada cresce e some aos poucos', () => {
    const c = criarCorpo(0);
    const a1 = atualizarCorpo(c, { ...parado, vz: 4.3 }).amplitude;
    const a10 = rodar(c, { vz: 4.3 }, 30).amplitude;
    expect(a1).toBeLessThan(a10);
    expect(a10).toBeCloseTo(AMPLITUDE_ANDAR, 1);
    const f1 = atualizarCorpo(c, parado).amplitude;
    expect(f1).toBeGreaterThan(0);
    expect(rodar(c, {}, 60).amplitude).toBeLessThan(0.01);
  });
  it('correr: passada maior e mais rápida, e inclina mais para a frente', () => {
    const andar = rodar(criarCorpo(0), { vz: 4.3 }, 90);
    const cA = criarCorpo(0);
    const correr = rodar(cA, { vz: 7, correndo: true }, 90);
    expect(correr.amplitude).toBeCloseTo(AMPLITUDE_CORRER, 1);
    expect(correr.amplitude).toBeGreaterThan(andar.amplitude);
    expect(correr.inclina).toBeGreaterThan(andar.inclina * 2);
    expect(correr.inclina).toBeLessThan(0.25);
    // fase anda mais rápido correndo
    const f0 = cA.fase;
    atualizarCorpo(cA, { ...parado, vz: 7, correndo: true });
    const passoCorrer = cA.fase - f0;
    const cB = criarCorpo(0);
    rodar(cB, { vz: 4.3 }, 90);
    const g0 = cB.fase;
    atualizarCorpo(cB, { ...parado, vz: 4.3 });
    expect(passoCorrer).toBeGreaterThan(cB.fase - g0);
  });
  it('na curva inclina para dentro, sem passar do teto', () => {
    const c = criarCorpo(0);
    rodar(c, { vz: 5 }, 60);
    // vira para a direita (+x): roll para o lado de dentro (negativo como no esboço)
    let max = 0;
    for (let i = 0; i < 20; i++) {
      const s = atualizarCorpo(c, { ...parado, vx: 5, vz: 0 });
      max = Math.max(max, Math.abs(s.roll));
    }
    expect(max).toBeGreaterThan(0.03);
    expect(max).toBeLessThanOrEqual(CURVA_MAXIMA);
  });
  it('no ar não dá passada e a agachadinha some em ~0,2 s', () => {
    const c = criarCorpo(0);
    agachar(c, 1);
    expect(atualizarCorpo(c, { ...parado, vz: 4, noChao: false }).amplitude).toBe(0);
    expect(c.agacha).toBeGreaterThan(0.8);
    rodar(c, {}, 12);
    expect(c.agacha).toBe(0);
  });
  it('a cabeça acompanha a câmera só um pouco (±0,5)', () => {
    const s = rodar(criarCorpo(0), { olharYaw: 2 }, 240);
    expect(s.cabeca).toBeCloseTo(LIMITE_CABECA * FRACAO_CABECA, 2);
    const t = rodar(criarCorpo(0), { olharYaw: -0.2 }, 240);
    expect(t.cabeca).toBeCloseTo(-0.2 * FRACAO_CABECA, 2);
  });
  it('determinístico: mesma entrada, mesmo resultado', () => {
    const a = rodar(criarCorpo(0.3), { vx: 2, vz: 3, correndo: true }, 50);
    const b = rodar(criarCorpo(0.3), { vx: 2, vz: 3, correndo: true }, 50);
    expect(a).toEqual(b);
  });
});

describe('animador com vida', () => {
  it('posiciona pelo yaw do corpo (solto da câmera) e inclina ao correr', () => {
    const a = criarAnimador(0);
    for (let i = 0; i < 90; i++)
      a.atualizar(dt, {
        velocidadeHoriz: 7,
        correndo: true,
        noChao: true,
        vx: 7,
        vz: 0,
        olharYaw: 0,
      });
    expect(a.yaw()).toBeCloseTo(Math.PI / 2, 1);
    expect(a.pose().corpoX).toBeGreaterThan(0.1);
  });
  it('pulo agacha o corpo (corpoY e escala baixam) e volta', () => {
    const a = criarAnimador(0);
    const mov = { velocidadeHoriz: 0, correndo: false, noChao: true, vx: 0, vz: 0 };
    a.atualizar(dt, mov);
    a.evento('pulo');
    const p = a.atualizar(dt, mov);
    expect(p.corpoY!).toBeLessThan(-0.05);
    expect(p.escala!).toBeLessThan(1);
    for (let i = 0; i < 30; i++) a.atualizar(dt, mov);
    expect(a.pose().corpoY!).toBeGreaterThan(-0.01);
  });
  it('camada de gesto: aplica por cima da pose e sai sozinha ao devolver null', () => {
    const a = criarAnimador(0);
    const mov = { velocidadeHoriz: 0, correndo: false, noChao: true, vx: 0, vz: 0 };
    let quadros = 0;
    const acenar: CamadaPose = (base, info) => {
      quadros++;
      if (info.andando || quadros > 3) return null;
      return { ...base, bracoDireitoAbre: 2.6 };
    };
    a.definirCamada(acenar);
    expect(a.atualizar(dt, mov).bracoDireitoAbre).toBe(2.6);
    expect(a.camada()).toBe(acenar);
    a.atualizar(dt, mov);
    a.atualizar(dt, mov);
    expect(a.atualizar(dt, mov).bracoDireitoAbre).not.toBe(2.6);
    expect(a.camada()).toBeNull();
  });
});
