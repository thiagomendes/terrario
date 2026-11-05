import { describe, expect, it, beforeEach } from 'vitest';
import { criarMotorAudio } from '../../src/audio/motor';
import { GRUPOS_MATERIAL } from '../../src/audio/materiais';
import {
  EVENTOS_SOM,
  AMPLITUDE_TOM,
  AMPLITUDE_VOLUME,
  DURACAO_MAXIMA_SOM,
  iniciarAmbiente,
  perfilDoSom,
  reiniciarVariacao,
  tocarSom,
} from '../../src/audio/sons';
import { ContextoFalso, FonteFalsa, NoFalso } from './falso';

class ContextoSom extends ContextoFalso {
  sampleRate = 8000;
  fontes: FonteFalsa[] = [];
  createOscillator() {
    const o = Object.assign(new FonteFalsa(), { type: '', frequency: { value: 0 } });
    this.fontes.push(o);
    return o;
  }
  createBiquadFilter() {
    return Object.assign(new NoFalso(), { type: '', frequency: { value: 0 }, Q: { value: 0 } });
  }
  createBuffer(_c: number, n: number) {
    const d = new Float32Array(n);
    return { getChannelData: () => d };
  }
  createBufferSource() {
    const f = Object.assign(new FonteFalsa(), { buffer: null as unknown, loop: false });
    this.fontes.push(f);
    return f;
  }
}

async function motorAtivo() {
  const ctx = new ContextoSom();
  const motor = criarMotorAudio(() => ctx as never);
  await motor.ativar();
  return { ctx, motor };
}

beforeEach(() => reiniciarVariacao(42));

describe('tocarSom', () => {
  it('cria ao menos uma voz para cada evento', async () => {
    const { motor } = await motorAtivo();
    for (const ev of EVENTOS_SOM) {
      const antes = motor.vozes;
      const par = tocarSom(motor, ev, 'madeira');
      expect(par, ev).not.toBeNull();
      expect(motor.vozes, ev).toBe(antes + 1);
    }
  });

  it('não cria voz nem lança com motor inativo', () => {
    const motor = criarMotorAudio(() => new ContextoSom() as never);
    expect(tocarSom(motor, 'golpe')).toBeNull();
    expect(motor.vozes).toBe(0);
  });
});

describe('perfilDoSom', () => {
  it('é distinto entre os 6 grupos nos eventos de material', () => {
    for (const ev of ['golpe', 'quebra', 'colocar', 'passo', 'pulo', 'aterrissagem'] as const) {
      const chaves = GRUPOS_MATERIAL.map((g) => {
        const p = perfilDoSom(ev, g);
        return `${p.frequencia}|${p.filtroHz}`;
      });
      expect(new Set(chaves).size, ev).toBe(6);
    }
  });

  it('cristal ressoa mais agudo que a pedra', () => {
    for (const ev of ['golpe', 'quebra', 'colocar'] as const) {
      expect(perfilDoSom(ev, 'cristal').frequencia).toBeGreaterThan(
        perfilDoSom(ev, 'pedra').frequencia * 3,
      );
    }
  });
});

describe('variação e mistura', () => {
  it('chamadas seguidas variam e ficam nos limites do perfil', async () => {
    const { motor } = await motorAtivo();
    const perfil = perfilDoSom('golpe', 'pedra');
    let anterior = -1;
    const vistas = new Set<number>();
    for (let i = 0; i < 20; i++) {
      const p = tocarSom(motor, 'golpe', 'pedra')!;
      expect(p.variacao).not.toBe(anterior);
      anterior = p.variacao;
      vistas.add(p.variacao);
      expect(p.ganho).toBeGreaterThanOrEqual(perfil.ganho * (1 - AMPLITUDE_VOLUME) - 1e-9);
      expect(p.ganho).toBeLessThanOrEqual(perfil.ganho * (1 + AMPLITUDE_VOLUME) + 1e-9);
      expect(p.frequencia).toBeGreaterThan(perfil.frequencia * (1 - AMPLITUDE_TOM * 2));
      expect(p.frequencia).toBeLessThan(perfil.frequencia * (1 + AMPLITUDE_TOM * 2));
    }
    expect(vistas.size).toBeGreaterThan(1);
  });

  it('passo é mais baixo que golpe e todo ganho e duração são válidos', async () => {
    const { motor } = await motorAtivo();
    for (const g of GRUPOS_MATERIAL) {
      expect(perfilDoSom('passo', g).ganho).toBeLessThan(perfilDoSom('golpe', g).ganho);
    }
    for (const ev of EVENTOS_SOM) {
      for (const g of GRUPOS_MATERIAL) {
        const p = tocarSom(motor, ev, g)!;
        expect(p.ganho).toBeGreaterThan(0);
        expect(p.ganho).toBeLessThanOrEqual(1);
        expect(p.duracao).toBeGreaterThan(0);
        expect(p.duracao).toBeLessThan(DURACAO_MAXIMA_SOM);
      }
    }
  });
});

describe('iniciarAmbiente', () => {
  it('cria uma voz persistente de ganho até 0,08 e para', async () => {
    const { ctx, motor } = await motorAtivo();
    const antes = ctx.gains.length;
    const amb = iniciarAmbiente(motor);
    expect(motor.vozes).toBe(1);
    const novos = ctx.gains.slice(antes);
    expect(novos.length).toBe(1);
    expect(novos[0].gain.value).toBeLessThanOrEqual(0.08);
    expect(novos[0].gain.value).toBeGreaterThan(0);
    amb.parar();
    expect(motor.vozes).toBe(0);
    expect(ctx.fontes.every((f) => f.parada)).toBe(true);
  });

  it('sobrevive ao estouro do limite de vozes (prioridade alta)', async () => {
    const { ctx, motor } = await motorAtivo();
    const antes = ctx.fontes.length;
    const amb = iniciarAmbiente(motor);
    const fontesAmbiente = ctx.fontes.slice(antes);
    expect(fontesAmbiente.length).toBeGreaterThan(0);
    for (let i = 0; i < 15; i++) tocarSom(motor, 'golpe', 'pedra');
    expect(motor.vozes).toBeLessThanOrEqual(12);
    expect(fontesAmbiente.every((f) => !f.parada)).toBe(true);
    amb.parar();
  });

  it('com motor inativo não cria nada nem lança', () => {
    const motor = criarMotorAudio(() => new ContextoSom() as never);
    const amb = iniciarAmbiente(motor);
    expect(motor.vozes).toBe(0);
    expect(() => amb.parar()).not.toThrow();
  });
});
