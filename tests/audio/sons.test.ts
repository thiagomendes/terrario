import { describe, expect, it, beforeEach } from 'vitest';
import { criarMotorAudio } from '../../src/audio/motor';
import { GRUPOS_MATERIAL } from '../../src/audio/materiais';
import {
  EVENTOS_SOM,
  AMPLITUDE_TOM,
  AMPLITUDE_VOLUME,
  DURACAO_MAXIMA_SOM,
  GANHO_MAXIMO_AMBIENTE,
  iniciarAmbiente,
  perfilDoSom,
  reiniciarVariacao,
  tocarSom,
  comecarEParar,
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
    for (const ev of EVENTOS_SOM) {
      const { motor } = await motorAtivo();
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
  it('cria uma voz persistente com ganho mestre limitado e para tudo', async () => {
    const { ctx, motor } = await motorAtivo();
    const antes = ctx.gains.length;
    let agendar: (() => void) | null = null;
    const relogio = {
      setInterval: (f: () => void) => {
        agendar = f;
        return 1;
      },
      clearInterval: () => {
        agendar = null;
      },
    };
    const amb = iniciarAmbiente(motor, relogio);
    expect(motor.vozes).toBe(1);
    const mestre = ctx.gains[antes];
    expect(mestre.gain.value).toBeLessThanOrEqual(GANHO_MAXIMO_AMBIENTE);
    expect(mestre.gain.value).toBeGreaterThan(0);
    // o agendador cria notas e bichos sem novas vozes no motor
    ctx.currentTime = 10;
    agendar!();
    expect(motor.vozes).toBe(1);
    amb.definirNoite(1);
    ctx.currentTime = 20;
    agendar!();
    amb.parar();
    expect(agendar).toBeNull();
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

describe('trilha adaptativa', () => {
  it('troca de paleta por contexto e agenda pulso no perigo e gotas na caverna', async () => {
    const { ctx, motor } = await motorAtivo();
    let agendar: (() => void) | null = null;
    const amb = iniciarAmbiente(motor, {
      setInterval: (f: () => void) => {
        agendar = f;
        return 1;
      },
      clearInterval: () => undefined,
    });
    expect(amb.contexto).toBe('dia');
    amb.definirContexto('perigo');
    expect(amb.contexto).toBe('perigo');
    const antes = ctx.fontes.length;
    ctx.currentTime = 5;
    agendar!();
    expect(ctx.fontes.length).toBeGreaterThan(antes);
    amb.definirContexto('caverna');
    ctx.currentTime = 9;
    agendar!();
    amb.parar();
    expect(ctx.fontes.every((f) => f.parada)).toBe(true);
  });
});

describe('nenhum som fica preso (grilo contínuo)', () => {
  it('hora inválida: a fonte nem começa', () => {
    const f = new FonteFalsa();
    comecarEParar(f, Number.NaN, 1);
    expect(f.iniciada).toBe(false);
    comecarEParar(f, 1, Number.NaN);
    expect(f.iniciada).toBe(false);
  });
  it('se o parar agendado falhar, a fonte para e desliga na hora', () => {
    const f = new FonteFalsa();
    let tentativas = 0;
    f.stop = (t?: number) => {
      tentativas++;
      if (t !== undefined) throw new Error('recusado');
      f.parada = true;
    };
    comecarEParar(f, 0, 0.5);
    expect(f.iniciada).toBe(true);
    expect(f.parada).toBe(true);
    expect(tentativas).toBe(2);
  });
});

describe('sons do campo (Rancho Alegre)', () => {
  it('galo, mugido, cigarra e sapo: curtos, na hora certa, nunca em laço e parados no fim', async () => {
    const { definirTemaAtivo } = await import('../../src/temas/ativo');
    const { obterTema, TEMA_PADRAO } = await import('../../src/temas');
    await import('../../src/temas/todos');
    definirTemaAtivo(obterTema('rancho-alegre'));
    try {
      const { ctx, motor } = await motorAtivo();
      let agendar: (() => void) | null = null;
      const amb = iniciarAmbiente(motor, {
        setInterval: (f: () => void) => {
          agendar = f;
          return 1;
        },
        clearInterval: () => undefined,
      });
      const lacos = ctx.fontes.filter((f) => (f as { loop?: boolean }).loop).length;
      const tipos = new Set<string>();
      // um dia inteiro, de 0,2 em 0,2 s, passando pela madrugada, manhã, tarde e noite
      for (let i = 0; i < 6000; i++) {
        const h = (i / 6000 + 0.2) % 1;
        amb.definirHora(h);
        amb.definirNoite(h < 0.24 || h > 0.78 ? 1 : 0);
        ctx.currentTime = i * 0.2;
        agendar!();
      }
      for (const f of ctx.fontes) tipos.add((f as { type?: string }).type ?? '');
      // só o vento e a chuva são contínuos: nenhum som do campo fica em laço
      expect(ctx.fontes.filter((f) => (f as { loop?: boolean }).loop).length).toBe(lacos);
      // cigarra e sapo usam onda quadrada, galo e mugido dente de serra
      expect(tipos.has('square')).toBe(true);
      expect(tipos.has('sawtooth')).toBe(true);
      amb.parar();
      expect(ctx.fontes.every((f) => f.parada)).toBe(true);
    } finally {
      definirTemaAtivo(obterTema(TEMA_PADRAO));
    }
  });

  it('nos outros temas nada muda (sem sons do campo)', async () => {
    const { obterTema, temasDisponiveis } = await import('../../src/temas');
    await import('../../src/temas/todos');
    for (const id of temasDisponiveis())
      if (id !== 'rancho-alegre') expect(obterTema(id).natureza.roca, id).toBeUndefined();
  });
});
