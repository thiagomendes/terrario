import { describe, expect, it } from 'vitest';
import { lerBytes, lerTexto } from './arquivos';
import {
  AMBIENTE_DO_LUGAR,
  CRUZA_S,
  ESPERA_FESTA,
  FESTA_SOME,
  LUGARES_FESTA,
  SONS_FESTA,
  andarPesos,
  criarSomBaile,
  lugarDaFesta,
  lugarQueToca,
  type LugarFesta,
} from '../../src/audio/somBaile';
import { NIVEL_EXTRAS, NIVEL_VOZES, ganhoExtra } from '../../src/audio/vozesGravadas';
import { NIVEL_TRILHA } from '../../src/audio/trilha';
import { criarGerador } from '../../src/audio/variacao';

/**
 * Spec 027 (T21): os sons da Noite das Fantasias. O pacote de vozes do tema (bichos, moradores, a
 * festa e o ambiente por lugar), a régua de volume (nenhum som acima de -12 LUFS momentâneo no
 * arquivo; as medidas do ebur128 em medidas-pacote.json) e o ambiente que cruza de um lugar para
 * o outro sem nunca deixar dois altos ao mesmo tempo.
 */
const TEMA = 'noite-das-fantasias';
const INDICE = JSON.parse(lerTexto('public/sons/indice.json')) as {
  temas: Record<string, { festa?: Record<string, { o: [number, number]; s: number }[]>; lugar?: Record<string, { o: [number, number] }[]> } & Record<string, unknown>>;
  tamanhos: Record<string, number>;
  ordem: string[];
};
const MEDIDAS = JSON.parse(lerTexto('.sdd/specs/027-mundo-halloween/referencia/fontes/medidas-pacote.json')) as {
  musica: { pacoteBytes: number; memoriaMB24k: number; mixes: Record<string, { picoDb: number; cortes: number }> };
  vozes: { pacoteBytes: number; lufsMomentaneoMax: number; arquivos: Record<string, { lufsMomentaneoMax: number; picoDb: number; cortes: number; seg: number }> };
};

const ZONAS = {
  praca: { x0: 0, z0: 0, x1: 10, z1: 10 },
  rua: { x0: 20, z0: 0, x1: 30, z1: 10 },
  vovo: { x0: 31, z0: 0, x1: 34, z1: 10 },
  bosque: { x0: 0, z0: 20, x1: 10, z1: 30 },
  castelo: { x0: 0, z0: 31, x1: 10, z1: 40 },
  horta: { x0: 20, z0: 20, x1: 30, z1: 30 },
  gramado: { x0: 0, z0: 11, x1: 10, z1: 19 },
  loja: { x0: 11, z0: 0, x1: 19, z1: 10 },
};

describe('o pacote de sons da festa', () => {
  const t = INDICE.temas[TEMA];
  it('o tema tem música e vozes no índice, os dois pacotes do tamanho dito e dentro das metas', () => {
    expect(INDICE.ordem).toContain(TEMA);
    for (const p of [`${TEMA}-musica.mp3`, `${TEMA}-vozes.mp3`]) {
      expect(lerBytes(`public/sons/pacotes/${p}`).byteLength, p).toBe(INDICE.tamanhos[p]);
      // menos de 2 MB de download por pacote
      expect(INDICE.tamanhos[p], p).toBeLessThan(2 * 1024 * 1024);
    }
    expect(MEDIDAS.musica.pacoteBytes).toBe(INDICE.tamanhos[`${TEMA}-musica.mp3`]);
    expect(MEDIDAS.vozes.pacoteBytes).toBe(INDICE.tamanhos[`${TEMA}-vozes.mp3`]);
    // menos de 15 MB de memória com a música toda aberta (a 24 kHz, a conta da 019)
    expect(MEDIDAS.musica.memoriaMB24k).toBeLessThan(15);
  });

  it('cada som da festa e de cada lugar tem fatias dentro do pacote, e o nível dele na régua', () => {
    const tamanho = INDICE.tamanhos[`${TEMA}-vozes.mp3`];
    for (const som of SONS_FESTA) {
      const l = t.festa?.[som];
      expect(l?.length, som).toBeGreaterThanOrEqual(1);
      for (const c of l!) expect(c.o[0] + c.o[1]).toBeLessThanOrEqual(tamanho);
      expect(NIVEL_EXTRAS[TEMA][`festa.${som}`], som).toBeDefined();
      expect(ganhoExtra(TEMA, 'festa', som)).toBeLessThan(1);
    }
    for (const l of LUGARES_FESTA)
      for (const s of AMBIENTE_DO_LUGAR[l].sons) {
        const lista = t.lugar?.[s.chave];
        expect(lista?.length, s.chave).toBeGreaterThanOrEqual(2);
        for (const c of lista!) expect(c.o[0] + c.o[1]).toBeLessThanOrEqual(tamanho);
        // o ambiente bem abaixo dos toques
        expect(NIVEL_EXTRAS[TEMA][`lugar.${s.chave}`], s.chave).toBeLessThanOrEqual(-15);
      }
    expect(NIVEL_VOZES[TEMA]).toBeDefined();
    expect(NIVEL_TRILHA[TEMA]).toBeDefined();
  });

  it('nenhum som acima de -12 LUFS momentâneo no arquivo, sem corte, e a música sem corte', () => {
    expect(MEDIDAS.vozes.lufsMomentaneoMax).toBeLessThanOrEqual(-12);
    for (const [id, m] of Object.entries(MEDIDAS.vozes.arquivos)) {
      expect(m.lufsMomentaneoMax, id).toBeLessThanOrEqual(-12);
      expect(m.picoDb, id).toBeLessThanOrEqual(-1);
      expect(m.cortes, id).toBe(0);
    }
    for (const [id, m] of Object.entries(MEDIDAS.musica.mixes)) {
      expect(m.cortes, id).toBe(0);
      expect(m.picoDb, id).toBeLessThan(-3);
    }
  });
});

describe('o volume da trilha da festa (spec 027, T21)', () => {
  /**
   * T23: a régua da 019 (e2e/trilha-regua.spec.ts) compara o RMS da gravada com a trilha
   * sintetizada de antes da 019, e a festa (como a Vila Neon) veio depois e nunca tocou a
   * sintetizada: a "de hoje" dela é a reserva da T01. A gravada foi afinada como a da Vila (026,
   * T18): o volume percebido (LUFS) de cada mistura igual à média do Rancho e da Cidade com o
   * ajuste deles. Aqui fica a regra, pelas medidas dos dois pacotes:
   * nivel = média(LUFS_ref + NIVEL_TRILHA_ref) − LUFS_festa.
   */
  const REF = (
    JSON.parse(lerTexto('.sdd/specs/026-mundo-anos-80/referencia/fontes/medidas-pacote.json')) as {
      nivel: { lufs: Record<string, Record<string, number>> };
    }
  ).nivel.lufs;
  const LUFS_FESTA = (
    JSON.parse(lerTexto('.sdd/specs/027-mundo-halloween/referencia/fontes/medidas-pacote.json')) as {
      musica: { lufs: Record<string, number> };
    }
  ).musica.lufs;

  it('cada contexto no volume percebido do Rancho e da Cidade (décimo de dB)', () => {
    for (const c of ['dia', 'tarde', 'noite', 'caverna'] as const) {
      const ref = (['rancho-alegre', 'cidade-grande'] as const).map(
        (id) => REF[id][c] + (NIVEL_TRILHA[id][c] ?? NIVEL_TRILHA[id].dia ?? 0),
      );
      const alvo = (ref[0] + ref[1]) / 2 - LUFS_FESTA[c];
      expect(NIVEL_TRILHA[TEMA][c], c).toBeCloseTo(alvo, 1);
    }
  });
});

describe('o ambiente por lugar', () => {
  it('cada zona do plano cai num lugar (a loja e o gramado na praça; a Vovó na rua; o castelinho no bosque)', () => {
    expect(lugarDaFesta(ZONAS, 5, 5)).toBe('praca');
    expect(lugarDaFesta(ZONAS, 15, 5)).toBe('praca');
    expect(lugarDaFesta(ZONAS, 5, 15)).toBe('praca');
    expect(lugarDaFesta(ZONAS, 25, 5)).toBe('rua');
    expect(lugarDaFesta(ZONAS, 32, 5)).toBe('rua');
    expect(lugarDaFesta(ZONAS, 5, 25)).toBe('bosque');
    expect(lugarDaFesta(ZONAS, 5, 35)).toBe('bosque');
    expect(lugarDaFesta(ZONAS, 25, 25)).toBe('horta');
    expect(lugarDaFesta(ZONAS, 50, 50)).toBeNull();
  });

  it('cruza em ~1,5 s e nunca deixa dois lugares altos ao mesmo tempo', () => {
    const pesos: Record<LugarFesta, number> = { praca: 1, rua: 0, bosque: 0, horta: 0 };
    let t = 0;
    while (t < CRUZA_S + 0.2) {
      andarPesos(pesos, 'rua', 0.05);
      t += 0.05;
      const altos = LUGARES_FESTA.filter((l) => pesos[l] > 0.5);
      expect(altos.length).toBeLessThanOrEqual(1);
    }
    expect(pesos.rua).toBe(1);
    expect(pesos.praca).toBe(0);
    // no meio da cruzada, quem toca é um lugar só, com o volume do peso dele
    const meio: Record<LugarFesta, number> = { praca: 0.6, rua: 0.4, bosque: 0, horta: 0 };
    expect(lugarQueToca(meio)).toEqual({ lugar: 'praca', peso: 0.6 });
  });

  it('o som solto sai do lugar de agora, com o volume da natureza; o grilo só de noite', () => {
    const tocou: { secao: string; chave: string; v: number; grupo: string }[] = [];
    const sb = criarSomBaile({
      zonas: ZONAS,
      extra: (secao, chave, v, grupo) => {
        tocou.push({ secao, chave, v, grupo });
        return true;
      },
      natureza: () => 0.5,
      rng: criarGerador(7),
    });
    for (let i = 0; i < 600; i++) sb.quadro(0.1, { x: 5, z: 25 }, 0);
    expect(tocou.length).toBeGreaterThan(3);
    expect(tocou.every((q) => q.secao === 'lugar' && q.grupo === 'ambiente')).toBe(true);
    // de dia no bosque: só a corujinha (o grilo é da noite)
    expect(tocou.every((q) => q.chave === 'corujinha')).toBe(true);
    expect(Math.max(...tocou.map((q) => q.v))).toBeLessThanOrEqual(0.5);
    tocou.length = 0;
    for (let i = 0; i < 600; i++) sb.quadro(0.1, { x: 5, z: 25 }, 1);
    expect(tocou.some((q) => q.chave === 'grilo')).toBe(true);
    // fora de todo lugar, nada
    tocou.length = 0;
    for (let i = 0; i < 300; i++) sb.quadro(0.1, { x: 80, z: 80 }, 1);
    expect(tocou.filter((q) => q.v > 0.05).length).toBeLessThanOrEqual(1);
    expect(sb.info().lugar).toBeNull();
  });
});

describe('os toques da festa', () => {
  function criar(temPacote = true) {
    const tocou: { chave: string; v: number }[] = [];
    const reserva: string[] = [];
    let agora = 0;
    const sb = criarSomBaile({
      zonas: ZONAS,
      extra: (_s, chave, v) => {
        if (!temPacote) return false;
        tocou.push({ chave, v });
        return true;
      },
      reserva: (som) => reserva.push(som),
      natureza: () => 1,
      rng: criarGerador(3),
      agora: () => agora,
    });
    return { sb, tocou, reserva, passar: (ms: number) => (agora += ms) };
  }

  it('soam pela distância: cheio perto, some longe; o da própria criança sempre', () => {
    const { sb, tocou, passar } = criar();
    expect(sb.tocar('campainha', { x: 2, z: 0 }, { x: 0, z: 0 })).toBe(true);
    expect(tocou.at(-1)).toEqual({ chave: 'campainha', v: 1 });
    passar(1000);
    expect(sb.tocar('campainha', { x: FESTA_SOME + 1, z: 0 }, { x: 0, z: 0 })).toBe(false);
    passar(1000);
    expect(sb.tocar('varinha', null, null)).toBe(true);
    expect(tocou.at(-1)?.v).toBe(1);
  });

  it('nada vira metralhadora: o mesmo som espera o intervalo dele', () => {
    const { sb, tocou, passar } = criar();
    expect(sb.tocar('lanterna', null, null)).toBe(true);
    expect(sb.tocar('lanterna', null, null)).toBe(false);
    passar(ESPERA_FESTA.lanterna + 1);
    expect(sb.tocar('lanterna', null, null)).toBe(true);
    expect(tocou).toHaveLength(2);
  });

  it('sem o pacote, a reserva de antes', () => {
    const { sb, reserva } = criar(false);
    expect(sb.tocar('risadinha', null, null)).toBe(false);
    expect(reserva).toEqual(['risadinha']);
  });
});
