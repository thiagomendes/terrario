import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { criarMotorAudio } from '../../src/audio/motor';
import {
  ATRASO_AI,
  ATRASO_CODIFICADOR,
  TETO_VOZES_GRAVADAS,
  criarSorteio,
  criarVozesGravadas,
  inicioSemAtraso,
  somDoGolpe,
  tomVariado,
  type IndiceSons,
  type ReservaVozes,
} from '../../src/audio/vozesGravadas';
import { criarGerador } from '../../src/audio/variacao';
import { TIPOS_ANIMAIS } from '../../src/jogo/criaturas';
import type { PioCriatura } from '../../src/temas/tipos';
import { ContextoFalso, FonteFalsa, NoFalso } from './falso';

const INDICE = JSON.parse(readFileSync('public/sons/indice.json', 'utf8')) as IndiceSons & {
  ordem: string[];
  tamanhos: Record<string, number>;
};

class FonteBuffer extends FonteFalsa {
  buffer: unknown = null;
  playbackRate = { value: 1 };
  inicio: number[] = [];
  override start(quando?: number, offset?: number) {
    super.start();
    this.inicio = [quando ?? 0, offset ?? 0];
  }
}

class ContextoVoz extends ContextoFalso {
  fontes: FonteFalsa[] = [];
  buffers: FonteBuffer[] = [];
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
    const f = new FonteBuffer();
    this.buffers.push(f);
    return f;
  }
}

const PIO: PioCriatura = { onda: 'sine', de: 400, ate: 500, dur: 0.2, repeticoes: 1, intervalo: 0 };

function reservaFalsa(golpes: string[] = []): ReservaVozes {
  return { bicho: () => PIO, morador: () => PIO, golpe: () => golpes.push('golpe') };
}

async function montar(op: { falhar?: boolean; decodificarFalha?: boolean } = {}) {
  const ctx = new ContextoVoz();
  const motor = criarMotorAudio(() => ctx as never);
  await motor.ativar();
  // o buffer mudo que destrava o Safari não conta
  ctx.buffers.length = 0;
  // o "buffer" decodificado: 0,4 s de sobra além do nominal = só o atraso do codificador sai
  let relogio = 0;
  const tocados: string[] = [];
  const golpes: string[] = [];
  const baixados: string[] = [];
  const vozes = criarVozesGravadas({
    motor,
    tema: 'rancho-alegre',
    reserva: reservaFalsa(golpes),
    carregarIndice: async () => {
      if (op.falhar) throw new Error('sem rede');
      return INDICE;
    },
    baixar: async (url) => {
      baixados.push(url);
      if (op.falhar) throw new Error('sem rede');
      return new ArrayBuffer(600_000);
    },
    decodificar: async (b) => {
      if (op.decodificarFalha) throw new Error('codec');
      return { duration: b.byteLength / 6000 + 0.06 };
    },
    rng: criarGerador(7),
    agora: () => relogio,
    aoTocar: (id) => tocados.push(id),
  });
  const passar = (ms: number) => (relogio += ms);
  const esperar = () => new Promise((r) => setTimeout(r, 0));
  return { ctx, motor, vozes, tocados, golpes, baixados, passar, esperar };
}

describe('sorteio das versões', () => {
  it('nunca repete a mesma versão duas vezes seguidas', () => {
    const sortear = criarSorteio(criarGerador(3));
    for (const n of [2, 3, 5]) {
      let antes = -1;
      const vistos = new Set<number>();
      for (let i = 0; i < 400; i++) {
        const k = sortear(n, `lista${n}`);
        expect(k).not.toBe(antes);
        expect(k).toBeGreaterThanOrEqual(0);
        expect(k).toBeLessThan(n);
        vistos.add(k);
        antes = k;
      }
      expect(vistos.size).toBe(n);
    }
  });

  it('uma versão só sempre sai ela mesma; listas diferentes não se atrapalham', () => {
    const sortear = criarSorteio(criarGerador(9));
    expect(sortear(1, 'a')).toBe(0);
    expect(sortear(1, 'a')).toBe(0);
    const a = sortear(2, 'x');
    sortear(2, 'y');
    expect(sortear(2, 'x')).not.toBe(a);
  });

  it('o tom varia ±3%', () => {
    const rng = criarGerador(1);
    for (let i = 0; i < 200; i++) {
      const t = tomVariado(rng);
      expect(t).toBeGreaterThanOrEqual(0.97);
      expect(t).toBeLessThanOrEqual(1.03);
    }
  });
});

describe('atraso do codificador', () => {
  it('pula até 1105 amostras quando a fatia decodificada sobra', () => {
    expect(inicioSemAtraso(0.5, 0.5)).toBe(0);
    expect(inicioSemAtraso(0.504, 0.5)).toBe(0);
    expect(inicioSemAtraso(0.52, 0.5)).toBeCloseTo(0.02, 6);
    expect(inicioSemAtraso(0.9, 0.5)).toBeCloseTo(ATRASO_CODIFICADOR, 6);
  });
});

describe('índice das vozes (conjunto aprovado)', () => {
  it('todo bicho dos 7 temas tem chamado, susto, contente e "ai", e baque e derrota no comum', () => {
    expect(INDICE.ordem).toHaveLength(7);
    for (const t of INDICE.ordem) {
      const v = INDICE.temas[t].vozes!;
      const pacote = INDICE.tamanhos[`${t}-vozes.mp3`];
      for (const slot of TIPOS_ANIMAIS) {
        const c = v.criaturas.find((x) => x.slot === slot)!;
        expect(c, `${t} ${slot}`).toBeDefined();
        for (const m of ['chamado', 'susto', 'contente', 'ai'] as const) {
          expect(c.momentos[m].length, `${t} ${slot} ${m}`).toBeGreaterThanOrEqual(2);
          for (const clip of c.momentos[m])
            expect(clip.o[0] + clip.o[1]).toBeLessThanOrEqual(pacote);
        }
        const g = somDoGolpe(v, slot)!;
        expect(INDICE.comum.baque[g.baque], `${t} ${slot} baque ${g.baque}`).toBeDefined();
        expect(INDICE.comum.derrota[g.derrota], `${t} ${slot} derrota`).toBeDefined();
        // o vidro de antes nunca mais: nenhum bicho bate como cristal
        expect(g.material).not.toBe('cristal');
        expect(g.porte).toBe(c.porte);
      }
      for (const gen of ['feminino', 'masculino'] as const)
        for (const m of ['cumprimento', 'contente', 'obrigado', 'surpresa'] as const)
          expect(v.moradores[gen][m].length, `${t} ${gen} ${m}`).toBeGreaterThanOrEqual(2);
    }
  });

  it('material e porte de cada bicho saem do índice do tema', () => {
    const de = (t: string, s: (typeof TIPOS_ANIMAIS)[number]) =>
      somDoGolpe(INDICE.temas[t].vozes, s)!;
    expect(de('rancho-alegre', 'cervo')).toMatchObject({ material: 'pelo', porte: 'grande' });
    expect(de('rancho-alegre', 'coelho')).toMatchObject({ material: 'pena', porte: 'pequeno' });
    expect(de('rancho-alegre', 'espectro')).toMatchObject({ material: 'pena', porte: 'medio' });
    expect(de('mata-encantada', 'espectro')).toMatchObject({ material: 'pano', porte: 'medio' });
    expect(de('exploracao-lunar', 'cervo')).toMatchObject({ material: 'lata', derrota: 'robo' });
    expect(de('doce-reino', 'raposa')).toMatchObject({ material: 'crocante' });
    for (const t of INDICE.ordem)
      expect(de(t, 'peixe')).toMatchObject({ material: 'agua', derrota: 'plop' });
    // tudo diferente do baque único de terra de antes
    const materiais = new Set(
      INDICE.ordem.flatMap((t) => TIPOS_ANIMAIS.map((s) => de(t, s).material)),
    );
    expect(materiais.size).toBeGreaterThanOrEqual(6);
  });
});

describe('tocador de vozes gravadas', () => {
  it('antes do pacote chegar, toca a voz sintetizada (nada fica mudo)', async () => {
    const { vozes, tocados, ctx } = await montar();
    vozes.bicho('cervo', 'chamado');
    expect(tocados).toEqual(['sintese:chamado:cervo']);
    expect(ctx.fontes.length).toBeGreaterThan(0);
  });

  it('se o pacote falhar, segue na síntese, sem lançar', async () => {
    const { vozes, tocados, golpes, esperar } = await montar({ falhar: true });
    vozes.carregar();
    await esperar();
    await esperar();
    expect(vozes.falhou).toBe(true);
    expect(vozes.pronto).toBe(false);
    vozes.golpe('espectro');
    vozes.morador('feminino', 'cumprimento');
    expect(golpes).toEqual(['golpe']);
    expect(tocados).toEqual([
      'sintese:baque:espectro',
      'sintese:ai:espectro',
      'sintese:morador:feminino:cumprimento',
    ]);
  });

  it('se a fatia não decodificar, cai na síntese', async () => {
    const { vozes, tocados, esperar } = await montar({ decodificarFalha: true });
    vozes.carregar();
    await esperar();
    vozes.bicho('coelho', 'contente');
    await esperar();
    expect(tocados).toEqual(['sintese:contente:coelho']);
  });

  it('com o pacote: baixa o do tema e o comum, decodifica no primeiro toque e guarda', async () => {
    const { vozes, tocados, baixados, ctx, passar, esperar } = await montar();
    vozes.carregar();
    vozes.carregar();
    await esperar();
    expect(vozes.pronto).toBe(true);
    expect(baixados).toEqual([
      '/sons/pacotes/rancho-alegre-vozes.mp3',
      '/sons/pacotes/comum-vozes.mp3',
    ]);
    expect(vozes.decodificadas).toBe(0);
    vozes.bicho('cervo', 'chamado', { quem: 1 });
    await esperar();
    expect(tocados).toEqual(['gravada:chamado:cervo']);
    const f = ctx.buffers[0];
    expect(f.playbackRate.value).toBeGreaterThanOrEqual(0.97);
    expect(f.playbackRate.value).toBeLessThanOrEqual(1.03);
    // a fatia sobrou 0,06 s: começa depois do atraso do codificador
    expect(f.inicio[1]).toBeCloseTo(ATRASO_CODIFICADOR, 5);
    const n = vozes.decodificadas;
    for (let i = 0; i < 6; i++) {
      passar(3000);
      vozes.bicho('cervo', 'chamado', { quem: 1 });
      await esperar();
    }
    // 3 versões do chamado da vaca: no máximo 3 fatias abertas
    expect(vozes.decodificadas - n).toBeLessThanOrEqual(2);
  });

  it('golpe: o baque do material do bicho e o "ai" logo depois (nada de cristal)', async () => {
    const { vozes, tocados, ctx, esperar } = await montar();
    vozes.carregar();
    await esperar();
    vozes.golpe('espectro', { quem: 9 });
    await esperar();
    expect(tocados).toEqual(['gravada:baque:pena.medio', 'gravada:ai:espectro']);
    const [baque, ai] = ctx.buffers;
    expect(ai.inicio[0] - baque.inicio[0]).toBeCloseTo(ATRASO_AI, 5);
    vozes.derrota('peixe');
    await esperar();
    expect(tocados.at(-1)).toBe('gravada:derrota:plop');
  });

  it('o mesmo bicho não repete o mesmo momento sem esperar', async () => {
    const { vozes, tocados, passar } = await montar();
    vozes.bicho('raposa', 'chamado', { quem: 4 });
    vozes.bicho('raposa', 'chamado', { quem: 4 });
    vozes.bicho('raposa', 'chamado', { quem: 5 });
    expect(tocados).toHaveLength(2);
    passar(2100);
    vozes.bicho('raposa', 'chamado', { quem: 4 });
    expect(tocados).toHaveLength(3);
  });

  it('teto de 8 vozes: a mais velha sai para a nova entrar', async () => {
    const { vozes, ctx, esperar } = await montar();
    vozes.carregar();
    await esperar();
    for (let i = 0; i < TETO_VOZES_GRAVADAS + 3; i++) vozes.bicho('coelho', 'chamado', { quem: i });
    await esperar();
    const tocando = ctx.buffers.filter((f) => !f.parada);
    expect(ctx.buffers).toHaveLength(TETO_VOZES_GRAVADAS + 3);
    expect(tocando).toHaveLength(TETO_VOZES_GRAVADAS);
    // as primeiras é que pararam
    expect(ctx.buffers.slice(0, 3).every((f) => f.parada)).toBe(true);
  });

  it('as vozes vão no grupo "vozes"; baque e derrota nos efeitos', async () => {
    const { vozes, ctx, esperar, motor } = await montar();
    vozes.carregar();
    await esperar();
    motor.definirVolume('vozes', 0.5);
    vozes.golpe('cervo', { quem: 2 });
    await esperar();
    // gains: mestre, efeitos, passos, ambiente, vozes (nessa ordem), depois os de cada toque
    const [, efeitos, , , grupoVozes] = ctx.gains;
    expect(grupoVozes.gain.value).toBeCloseTo(0.5);
    const saidaBaque = ctx.buffers[0].conectados[0] as NoFalso;
    const saidaAi = ctx.buffers[1].conectados[0] as NoFalso;
    expect(saidaBaque.conectados[0]).toBe(efeitos);
    expect(saidaAi.conectados[0]).toBe(grupoVozes);
  });

  it('liberar solta o pacote: volta para a síntese até baixar de novo', async () => {
    const { vozes, tocados, esperar } = await montar();
    vozes.carregar();
    await esperar();
    expect(vozes.pronto).toBe(true);
    vozes.liberar();
    expect(vozes.pronto).toBe(false);
    vozes.bicho('cervo', 'susto');
    expect(tocados).toEqual(['sintese:susto:cervo']);
    vozes.carregar();
    await esperar();
    expect(vozes.pronto).toBe(true);
  });
});
