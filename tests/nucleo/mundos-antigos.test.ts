import { describe, expect, it } from 'vitest';
import { criarNucleo } from '../../src/nucleo/nucleo';
import type { DadosMundo } from '../../src/jogo/mundos';
import { Bloco } from '../../src/world/blocks';
import { empacotar } from '../../src/world/edicoes';

/**
 * Spec 009, critério 5: mundos salvos antes do servidor local abrem iguais. O formato
 * gravado é o mesmo; o núcleo lê cada parte e devolve a mesma coisa ao salvar.
 */
function salvoAntigo(): DadosMundo {
  return {
    versao: 1,
    edicoes: {
      '3,5': [
        [16661, Bloco.TABUAS],
        [16662, empacotar(Bloco.PORTA, 2)],
      ],
    },
    jogador: { x: 51.5, y: 70, z: 82.5, yaw: 1.2, pitch: 0.1 },
    hora: 0.71,
    extras: {
      inventario: {
        slots: [
          { item: 'picareta_pedra', qtd: 1, dur: 90 },
          { item: 'carvao', qtd: 12 },
        ],
        ativo: 1,
      },
      conteineres: {
        baus: { '10,70,10': [{ item: 'maca', qtd: 3 }, ...Array(26).fill(null)] },
        fornalhas: {
          '12,70,10': {
            entrada: { item: 'ferro_bruto', qtd: 2 },
            combustivel: { item: 'carvao', qtd: 1 },
            saida: null,
            queima: 0,
            queimaTotal: 0,
            progresso: 0,
          },
        },
      },
      sobrevivencia: {
        vida: 14,
        fome: 11,
        saturacao: 2,
        ar: 10,
        exaustao: 0.5,
        morto: false,
        invulneravel: 0,
      },
      spawn: { x: 40.5, z: 80.5 },
      clima: {
        tipo: 'chuva',
        restante: 120,
        nuvens: 0.8,
        chuva: 0.7,
        neblina: 0.1,
        raios: 0,
        arco: 0,
      },
      dia: 7,
      itensSoltos: [{ item: 'graveto', qtd: 3, x: 50.5, y: 71, z: 80.5 }],
      criaturas: { raposas: [{ x: 52, y: 70, z: 83, vida: 10 }] },
      povoados: { semPovoado: ['0,0', '0,1'] },
      // do cliente: o núcleo não mexe
      diario: { feitas: ['primeiros-passos'], contadores: { 'quebrou:tronco': 4 } },
      marcadores: [{ id: 1, nome: 'Casa', x: 50, z: 80, cor: '#fff' }],
    },
  };
}

describe('mundos antigos no núcleo', () => {
  it('abre e devolve as mesmas partes do mundo', () => {
    const d = salvoAntigo();
    const n = criarNucleo({
      semente: 1337,
      modo: 'sobrevivencia',
      versaoMundo: 2,
      dados: d,
      confiarNoCliente: true,
    });
    n.conectar('local');
    const s = n.salvar();
    expect(s.edicoes).toEqual(d.edicoes);
    expect(s.hora).toBeCloseTo(d.hora, 10);
    expect(s.extras['dia']).toBe(7);
    expect(s.extras['spawn']).toEqual(d.extras['spawn']);
    expect(s.extras['povoados']).toEqual(d.extras['povoados']);
    expect((s.extras['inventario'] as { slots: unknown[] }).slots.slice(0, 2)).toEqual(
      (d.extras['inventario'] as { slots: unknown[] }).slots,
    );
    const c = s.extras['conteineres'] as {
      baus: Record<string, unknown[]>;
      fornalhas: Record<string, { entrada: unknown }>;
    };
    expect(c.baus['10,70,10'][0]).toEqual({ item: 'maca', qtd: 3 });
    expect(c.fornalhas['12,70,10'].entrada).toEqual({ item: 'ferro_bruto', qtd: 2 });
    expect(s.extras['sobrevivencia']).toMatchObject({ vida: 14, fome: 11 });
    expect(s.extras['clima']).toMatchObject({ tipo: 'chuva' });
    expect(s.extras['itensSoltos']).toEqual([
      { item: 'graveto', qtd: 3, dur: undefined, x: 50.5, y: 71, z: 80.5 },
    ]);
    expect((s.extras['criaturas'] as { raposas: unknown[] }).raposas).toHaveLength(1);
    // o que é do cliente não passa pelo núcleo
    expect(s.extras['diario']).toBeUndefined();
    expect(s.extras['marcadores']).toBeUndefined();
  });

  it('mundo de antes dos povoados congela as regiões editadas e as do jogador', () => {
    const d = salvoAntigo();
    delete d.extras['povoados'];
    const n = criarNucleo({
      semente: 1337,
      modo: 'criativo',
      versaoMundo: 1,
      dados: d,
      confiarNoCliente: true,
    });
    const sem = (n.salvar().extras['povoados'] as { semPovoado: string[] }).semPovoado;
    // região do chunk editado (3,5) e as 9 em volta do jogador
    expect(sem).toContain('0,0');
    expect(sem.length).toBeGreaterThanOrEqual(9);
  });

  it('o jogador volta com vida, fome e inventário do salvamento', () => {
    const d = salvoAntigo();
    const n = criarNucleo({
      semente: 1337,
      modo: 'sobrevivencia',
      versaoMundo: 2,
      dados: d,
      confiarNoCliente: true,
    });
    n.conectar('local');
    const q = n.quadros().get('local')!;
    expect(q.sobrevivencia).toMatchObject({ vida: 14, fome: 11 });
    expect(q.inventario?.slots[1]).toEqual({ item: 'carvao', qtd: 12 });
    expect(q.ambiente.dia).toBe(7);
  });
});
