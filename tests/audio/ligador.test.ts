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
import {
  VARIACOES_AMOSTRA,
  sintetizarAmostra,
  type EventoMaterial,
} from '../../src/audio/amostras';
import type { GrupoMaterial } from '../../src/audio/materiais';
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
  buffers: Float32Array[] = [];
  fontes: { buffer: unknown }[] = [];
  createBuffer(_c: number, n: number) {
    const d = new Float32Array(n);
    this.buffers.push(d);
    return { getChannelData: () => d, dados: d };
  }
  createBufferSource() {
    const f = Object.assign(new FonteFalsa(), {
      buffer: null as unknown,
      loop: false,
      playbackRate: { value: 1 },
    });
    this.fontes.push(f);
    return f;
  }
}

/** A amostra tocada é a do material (alguma das variações) e não a de outro. */
function tocouAmostra(ctx: ContextoSom, ev: EventoMaterial, grupo: GrupoMaterial): boolean {
  const ultima = ctx.fontes[ctx.fontes.length - 1]?.buffer as { dados?: Float32Array } | undefined;
  if (!ultima?.dados) return false;
  for (let v = 0; v < VARIACOES_AMOSTRA; v++) {
    const ref = sintetizarAmostra(ev, grupo, v, ctx.sampleRate);
    if (ref.length === ultima.dados.length && ref.every((x, i) => x === ultima.dados![i])) {
      return true;
    }
  }
  return false;
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
  it('quebra de pedra usa a amostra de pedra, não a de madeira', async () => {
    const { ctx, barramento } = await preparar();
    barramento.emitir('quebra', { ...pos, bloco: Bloco.PEDRA_RACHADA });
    expect(tocouAmostra(ctx, 'quebra', 'pedra')).toBe(true);
    expect(tocouAmostra(ctx, 'quebra', 'madeira')).toBe(false);
  });

  it('colocação de madeira usa colocar de madeira', async () => {
    const { ctx, barramento } = await preparar();
    barramento.emitir('colocacao', { ...pos, bloco: Bloco.TABUAS });
    expect(tocouAmostra(ctx, 'colocar', 'madeira')).toBe(true);
    expect(tocouAmostra(ctx, 'colocar', 'pedra')).toBe(false);
  });

  it('golpe toca a amostra do material; recusa e slot, um tom cada', async () => {
    const { ctx, barramento } = await preparar();
    barramento.emitir('golpe', { ...pos, bloco: Bloco.TERRA_MUSGOSA });
    expect(tocouAmostra(ctx, 'golpe', 'terra')).toBe(true);
    expect(ctx.oscs).toHaveLength(0);
    let n = ctx.oscs.length;
    barramento.emitir('recusa', { motivo: 'x' });
    expect(perto(ctx.oscs[n].frequency.value, perfilDoSom('recusa', 'pedra').frequencia)).toBe(
      true,
    );
    n = ctx.oscs.length;
    barramento.emitir('slot', { indice: 2 });
    expect(perto(ctx.oscs[n].frequency.value, perfilDoSom('troca', 'pedra').frequencia)).toBe(true);
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
    expect(alvo.total()).toBe(4);
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
