import { lerTexto } from './arquivos';
import { describe, expect, it } from 'vitest';
import { ligarAudio, somDoBloco } from '../../src/audio/ligador';
import { criarMotorAudio } from '../../src/audio/motor';
import {
  SONS_NOVOS_019,
  chuvaAudivel,
  observarSons,
  perfilDoSom,
  somDoTrovao,
  tocarSom,
  type EventoSom,
} from '../../src/audio/sons';
import { SOM_DO_GESTO, SONS_INTERFACE, ehSomInterface } from '../../src/audio/somInterface';
import { BRACADA_S, passoSomAgua, SOM_AGUA_INICIAL } from '../../src/audio/somAgua';
import {
  NIVEL_TRILHA,
  contextoNivel,
  nivelTrilha,
  ESTADO_TRILHA_INICIAL,
  type ContextoNivel,
} from '../../src/audio/trilha';
import { NIVEL_VOZES, ganhoVozGravada, GANHO_VOZ_GRAVADA } from '../../src/audio/vozesGravadas';
import {
  AUTORES_GRAVACOES,
  CREDITOS_SONS,
  acervoDoCredito,
  nomeDoAutor,
} from '../../src/audio/creditosSons';
import { IDS_GESTOS } from '../../src/personagem/gestos';
import { criarBarramento } from '../../src/player/eventos';
import { Bloco } from '../../src/world/blocks';
import '../../src/temas/todos';
import { obterTema } from '../../src/temas/index';
import { ContextoFalso, FonteFalsa, NoFalso } from './falso';

class Osc extends FonteFalsa {
  type = '';
  frequency = { value: 0 };
}
class Ctx extends ContextoFalso {
  sampleRate = 8000;
  createOscillator() {
    return new Osc();
  }
  createBiquadFilter() {
    return Object.assign(new NoFalso(), { type: '', frequency: { value: 0 }, Q: { value: 0 } });
  }
  createBuffer(_c: number, n: number) {
    const d = new Float32Array(n);
    return { getChannelData: () => d };
  }
  createBufferSource() {
    return Object.assign(new FonteFalsa(), {
      buffer: null,
      loop: false,
      playbackRate: { value: 1 },
    });
  }
}

async function motor() {
  const m = criarMotorAudio(() => new Ctx() as never);
  await m.ativar();
  return m;
}

const INDICE = JSON.parse(lerTexto('public/sons/indice.json')) as {
  creditos: Record<string, { autor?: string; acervo?: string }>;
  temas: Record<string, unknown>;
};

describe('volume da trilha por tema (NIVEL_TRILHA)', () => {
  it('todo tema do índice tem ajuste de dia e de noite, sempre para cima e com teto', () => {
    for (const id of Object.keys(INDICE.temas)) {
      const t = NIVEL_TRILHA[id];
      expect(t, id).toBeDefined();
      expect(t.dia, id).toBeDefined();
      expect(t.noite, id).toBeDefined();
      for (const db of Object.values(t)) {
        expect(db).toBeGreaterThanOrEqual(0);
        expect(db).toBeLessThan(9);
      }
    }
  });

  it('a noite e a caverna sobem mais que o dia (as camadas da noite são mais calmas)', () => {
    for (const [id, t] of Object.entries(NIVEL_TRILHA)) {
      expect(t.noite!, id).toBeGreaterThanOrEqual(t.dia!);
      expect(t.caverna!, id).toBeGreaterThanOrEqual(t.dia!);
    }
  });

  it('o contexto do ajuste: perigo só onde há perigo, caverna antes da hora', () => {
    const e = { ...ESTADO_TRILHA_INICIAL };
    expect(contextoNivel(e, true)).toBe('dia');
    expect(contextoNivel({ ...e, hora: 'tarde' }, true)).toBe('tarde');
    expect(contextoNivel({ ...e, caverna: true, hora: 'noite' }, true)).toBe('caverna');
    expect(contextoNivel({ ...e, perigo: true, caverna: true }, true)).toBe('perigo');
    expect(contextoNivel({ ...e, perigo: true, hora: 'noite' }, false)).toBe('noite');
  });

  it('ganho linear do ajuste; contexto que falta usa o dia, tema que falta é 1', () => {
    const c: ContextoNivel = 'noite';
    expect(nivelTrilha('bruma-e-luz', c)).toBeCloseTo(
      Math.pow(10, NIVEL_TRILHA['bruma-e-luz'].noite! / 20),
      9,
    );
    expect(nivelTrilha('rancho-alegre', 'perigo')).toBeCloseTo(
      Math.pow(10, NIVEL_TRILHA['rancho-alegre'].dia! / 20),
      9,
    );
    expect(nivelTrilha('tema-que-nao-existe', 'dia')).toBe(1);
  });
});

describe('volume das vozes por tema (NIVEL_VOZES)', () => {
  it('todo tema com vozes gravadas tem os 4 grupos, e o ganho sai da tabela', () => {
    const comVozes = Object.keys(INDICE.temas).filter(
      (id) => !!(INDICE.temas[id] as { vozes?: unknown }).vozes,
    );
    expect(comVozes.length).toBe(8);
    // spec 026: a Vila Neon fica com a voz sintetizada do tema (sem pacote de vozes nem tabela)
    expect((INDICE.temas['vila-neon'] as { vozes?: unknown }).vozes).toBeUndefined();
    expect(NIVEL_VOZES['vila-neon']).toBeUndefined();
    for (const id of comVozes) {
      for (const g of ['bichos', 'moradores', 'baque', 'derrota'] as const) {
        const db = NIVEL_VOZES[id]?.[g];
        expect(db, `${id} ${g}`).toBeDefined();
        expect(Math.abs(db!)).toBeLessThan(12);
        expect(ganhoVozGravada(id, g)).toBeCloseTo(Math.pow(10, db! / 20), 9);
      }
    }
    expect(ganhoVozGravada('tema-que-nao-existe', 'bichos')).toBe(GANHO_VOZ_GRAVADA);
  });
});

describe('sons novos da spec 019 (T05)', () => {
  it('cada um toca, é curto e nenhum passa do golpe de bloco', async () => {
    const m = await motor();
    const golpe = perfilDoSom('golpe', 'pedra').ganho;
    for (const ev of SONS_NOVOS_019) {
      const p = tocarSom(m, ev);
      expect(p, ev).not.toBeNull();
      expect(p!.duracao, ev).toBeLessThan(2);
      expect(perfilDoSom(ev, 'pedra').ganho, ev).toBeLessThanOrEqual(golpe);
    }
  });

  it('o observador dos testes de tela vê o que tocou', async () => {
    const m = await motor();
    const vistos: EventoSom[] = [];
    observarSons((e) => vistos.push(e));
    tocarSom(m, 'toc');
    tocarSom(m, 'palmas');
    observarSons(null);
    tocarSom(m, 'toc');
    expect(vistos).toEqual(['toc', 'palmas']);
  });

  it('todo gesto tem som, e os sons de interface existem', () => {
    for (const g of IDS_GESTOS) expect(SONS_NOVOS_019).toContain(SOM_DO_GESTO[g]);
    expect(SOM_DO_GESTO.aplaudir).toBe('palmas');
    expect(SOM_DO_GESTO.chamar).toBe('assobio');
    for (const s of SONS_INTERFACE) {
      expect(SONS_NOVOS_019).toContain(s);
      expect(ehSomInterface(s)).toBe(true);
    }
    expect(ehSomInterface('trovao')).toBe(false);
  });

  it('a água tem o chuá dela (não é mais pedra); o resto segue o material', () => {
    expect(somDoBloco('colocar', Bloco.AGUA).evento).toBe('agua');
    expect(somDoBloco('quebra', Bloco.AGUA).evento).toBe('agua');
    expect(somDoBloco('quebra', Bloco.TABUAS)).toEqual({ evento: 'quebra', grupo: 'madeira' });
  });

  it('a recusa fica calada quando o cadeado já tocou o "toc"', async () => {
    const m = await motor();
    const b = criarBarramento();
    let calar = true;
    ligarAudio(b, m, { calarRecusa: () => calar });
    const antes = m.vozes;
    b.emitir('recusa', { motivo: 'colocar' });
    expect(m.vozes).toBe(antes);
    calar = false;
    b.emitir('recusa', { motivo: 'colocar' });
    expect(m.vozes).toBe(antes + 1);
  });

  it('tempestade: pipoca no Doce, estalo de rádio na Lua, trovão no resto; sem chiado no vácuo', () => {
    const ids = ['doce-reino', 'exploracao-lunar', 'bruma-e-luz'];
    const porId = Object.fromEntries(ids.map((id) => [id, obterTema(id)]));
    expect(somDoTrovao(porId['doce-reino'].natureza)).toBe('pipoca');
    expect(somDoTrovao(porId['exploracao-lunar'].natureza)).toBe('estalo');
    expect(somDoTrovao(porId['bruma-e-luz'].natureza)).toBe('trovao');
    expect(chuvaAudivel(porId['exploracao-lunar'].natureza, 1, false)).toBe(0);
    expect(chuvaAudivel(porId['bruma-e-luz'].natureza, 0.8, false)).toBe(0.8);
    expect(chuvaAudivel(porId['bruma-e-luz'].natureza, 0.8, true)).toBeCloseTo(0.2, 9);
    // a Lua não tem clarão, mas a legenda da tempestade solar agora aparece com o estalo
    expect(porId['exploracao-lunar'].climaVisual.relampago).toBe(false);
  });
});

describe('sons da água (somAgua)', () => {
  it('cair na água espirra; entrar andando não', () => {
    const caindo = passoSomAgua(SOM_AGUA_INICIAL, { naAgua: true, vy: -6, velHoriz: 0, dt: 0.016 });
    expect(caindo.sons).toEqual(['agua']);
    const andando = passoSomAgua(SOM_AGUA_INICIAL, { naAgua: true, vy: 0, velHoriz: 3, dt: 0.016 });
    expect(andando.sons).toEqual([]);
  });

  it('nadando: uma braçada a cada tanto; boiando parado, nada', () => {
    let e = { naAgua: true, desde: 0 };
    let n = 0;
    for (let i = 0; i < 100; i++) {
      const r = passoSomAgua(e, { naAgua: true, vy: 0, velHoriz: 2, dt: 0.02 });
      e = r.estado;
      n += r.sons.length;
    }
    expect(n).toBe(Math.floor(2 / BRACADA_S));
    e = { naAgua: true, desde: 0 };
    for (let i = 0; i < 100; i++) {
      const r = passoSomAgua(e, { naAgua: true, vy: 0, velHoriz: 0.2, dt: 0.02 });
      e = r.estado;
      expect(r.sons).toEqual([]);
    }
  });
});

describe('créditos dos sons', () => {
  it('a lista de autores é a dos créditos do índice (nem falta nem sobra)', () => {
    const doIndice = new Map<string, Set<string>>();
    for (const c of Object.values(INDICE.creditos)) {
      const acervo = acervoDoCredito(c);
      const nome = c.autor && nomeDoAutor(c.autor);
      if (!acervo || !nome) continue;
      if (!doIndice.has(acervo)) doIndice.set(acervo, new Set());
      doIndice.get(acervo)!.add(nome.toLowerCase());
    }
    const nossos = new Map(
      Object.entries(AUTORES_GRAVACOES).map(([a, l]) => [
        a,
        new Set(l.map((n) => n.toLowerCase())),
      ]),
    );
    expect([...nossos.keys()].sort()).toEqual([...doIndice.keys()].sort());
    for (const [a, s] of doIndice) expect([...nossos.get(a)!].sort(), a).toEqual([...s].sort());
  });

  it('cita o banco da música com a licença e nenhum link', () => {
    const texto = CREDITOS_SONS.map((g) => `${g.texto} ${(g.autores ?? []).join(' ')}`).join(' ');
    expect(texto).toContain('FluidR3_GM');
    expect(texto).toContain('MIT');
    expect(texto).toContain('CC0');
    expect(texto).not.toMatch(/https?:\/\//);
  });
});
