import { describe, expect, it } from 'vitest';
import {
  ativarNoPrimeiroGesto,
  ligarAudio,
  teclaParaMudo,
  textoIndicador,
  type AlvoGesto,
} from '../../src/audio/ligador';
import { criarMotorAudio } from '../../src/audio/motor';
import { perfilDoSom } from '../../src/audio/sons';
import { criarBarramento } from '../../src/player/eventos';
import { Bloco } from '../../src/world/blocks';
import { ContextoFalso, FonteFalsa, NoFalso } from './falso';

class OscFalso extends FonteFalsa {
  type = '';
  frequency = { value: 0 };
}

class FiltroFalso extends NoFalso {
  type = '';
  frequency = { value: 0 };
  Q = { value: 0 };
}

class ContextoSom extends ContextoFalso {
  sampleRate = 8000;
  oscs: OscFalso[] = [];
  createOscillator() {
    const o = new OscFalso();
    this.oscs.push(o);
    return o;
  }
  createBiquadFilter() {
    return new FiltroFalso();
  }
  createBuffer(_c: number, n: number) {
    return { getChannelData: () => new Float32Array(n) };
  }
  createBufferSource() {
    return Object.assign(new FonteFalsa(), { buffer: null as unknown, loop: false });
  }
}

async function preparar() {
  const ctx = new ContextoSom();
  const motor = criarMotorAudio(() => ctx);
  await motor.ativar();
  const barramento = criarBarramento();
  ligarAudio(barramento, motor);
  return { ctx, motor, barramento };
}

const pos = { x: 1, y: 2, z: 3 };

function perto(freq: number, base: number) {
  return Math.abs(freq - base) / base < 0.25;
}

describe('ligarAudio', () => {
  it('quebra de pedra usa a quebra de pedra, não a de madeira', async () => {
    const { ctx, barramento } = await preparar();
    barramento.emitir('quebra', { ...pos, bloco: Bloco.PEDRA_RACHADA });
    const f = ctx.oscs[0].frequency.value;
    expect(perto(f, perfilDoSom('quebra', 'pedra').frequencia)).toBe(true);
    expect(perto(f, perfilDoSom('quebra', 'madeira').frequencia)).toBe(false);
  });

  it('colocação de madeira usa colocar de madeira', async () => {
    const { ctx, barramento } = await preparar();
    barramento.emitir('colocacao', { ...pos, bloco: Bloco.TABUAS });
    const f = ctx.oscs[0].frequency.value;
    expect(perto(f, perfilDoSom('colocar', 'madeira').frequencia)).toBe(true);
    expect(perto(f, perfilDoSom('colocar', 'pedra').frequencia)).toBe(false);
  });

  it('golpe, recusa e slot tocam uma voz cada', async () => {
    const { ctx, barramento } = await preparar();
    barramento.emitir('golpe', { ...pos, bloco: Bloco.TERRA_MUSGOSA });
    expect(ctx.oscs).toHaveLength(1);
    expect(perto(ctx.oscs[0].frequency.value, perfilDoSom('golpe', 'terra').frequencia)).toBe(true);
    barramento.emitir('recusa', { motivo: 'x' });
    expect(perto(ctx.oscs[1].frequency.value, perfilDoSom('recusa', 'pedra').frequencia)).toBe(
      true,
    );
    barramento.emitir('slot', { indice: 2 });
    expect(perto(ctx.oscs[2].frequency.value, perfilDoSom('troca', 'pedra').frequencia)).toBe(true);
  });

  it('com o áudio inativo não toca nem lança', () => {
    const ctx = new ContextoSom();
    const motor = criarMotorAudio(() => ctx);
    const barramento = criarBarramento();
    ligarAudio(barramento, motor);
    expect(() => barramento.emitir('slot', { indice: 0 })).not.toThrow();
    expect(ctx.oscs).toHaveLength(0);
  });
});

class AlvoFalso implements AlvoGesto {
  ouvintes = new Map<string, Set<() => void>>();
  addEventListener(tipo: string, f: () => void) {
    if (!this.ouvintes.has(tipo)) this.ouvintes.set(tipo, new Set());
    this.ouvintes.get(tipo)!.add(f);
  }
  removeEventListener(tipo: string, f: () => void) {
    this.ouvintes.get(tipo)?.delete(f);
  }
  disparar(tipo: string) {
    for (const f of [...(this.ouvintes.get(tipo) ?? [])]) f();
  }
  total() {
    return [...this.ouvintes.values()].reduce((s, c) => s + c.size, 0);
  }
}

describe('ativarNoPrimeiroGesto', () => {
  it('ativa uma vez no primeiro gesto e remove os ouvintes', () => {
    const alvo = new AlvoFalso();
    let chamadas = 0;
    ativarNoPrimeiroGesto(alvo, {
      ativar: () => {
        chamadas++;
        return Promise.resolve();
      },
    });
    expect(alvo.total()).toBe(2);
    alvo.disparar('keydown');
    alvo.disparar('pointerdown');
    alvo.disparar('keydown');
    expect(chamadas).toBe(1);
    expect(alvo.total()).toBe(0);
  });

  it('pointerdown também ativa', () => {
    const alvo = new AlvoFalso();
    let chamadas = 0;
    ativarNoPrimeiroGesto(alvo, {
      ativar: () => {
        chamadas++;
        return Promise.resolve();
      },
    });
    alvo.disparar('pointerdown');
    expect(chamadas).toBe(1);
  });
});

describe('teclaParaMudo e textoIndicador', () => {
  it('só KeyM muda o som', () => {
    expect(teclaParaMudo('KeyM')).toBe(true);
    expect(teclaParaMudo('KeyN')).toBe(false);
    expect(teclaParaMudo('m')).toBe(false);
  });

  it('textos do indicador', () => {
    expect(textoIndicador('inativo', false)).toBe('Som: ativa ao clicar');
    expect(textoIndicador('ativo', false)).toBe('Som: ligado');
    expect(textoIndicador('ativo', true)).toBe('Som: mudo');
    expect(textoIndicador('bloqueado', false)).toBe('Som: indisponível');
  });
});
