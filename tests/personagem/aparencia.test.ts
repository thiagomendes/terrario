import { describe, expect, it } from 'vitest';
import {
  IDS_MODELOS,
  MODELOS,
  aparenciaPadrao,
  aplicarModelo,
  normalizarAparencia,
} from '../../src/personagem/aparencia';

describe('aparência', () => {
  it('tem 4 modelos distintos em opções e proporções', () => {
    expect(IDS_MODELOS).toEqual(['andarilho', 'herbolaria', 'lanterneiro', 'musgueira']);
    const opcoes = new Set(IDS_MODELOS.map((m) => JSON.stringify(MODELOS[m].opcoes)));
    const prop = new Set(
      IDS_MODELOS.map((m) => `${MODELOS[m].larguraTronco}/${MODELOS[m].comprimentoPernas}`),
    );
    expect(opcoes.size).toBe(4);
    expect(prop.size).toBe(4);
  });

  it('aplicarModelo troca opções e mantém o nome', () => {
    const base = { ...aparenciaPadrao('andarilho'), nome: 'Ira' };
    const novo = aplicarModelo(base, 'lanterneiro');
    expect(novo.nome).toBe('Ira');
    expect(novo.modelo).toBe('lanterneiro');
    expect(novo.acessorio).toBe('lanterna');
  });

  it('corta e limpa o nome', () => {
    const r = normalizarAparencia({ nome: '  ' + 'a'.repeat(20) + '  ' });
    expect(r.nome).toBe('a'.repeat(16));
    expect(normalizarAparencia({ nome: 'ab' + ' '.repeat(14) + 'cd' }).nome).toBe('ab');
  });

  it('índice ou id inválido volta ao padrão do modelo', () => {
    const r = normalizarAparencia({
      modelo: 'musgueira',
      pele: 9,
      roupaCor: -1,
      calcaCor: 1.5,
      acessorio: 'x',
    });
    expect(r).toEqual(aparenciaPadrao('musgueira'));
    expect(normalizarAparencia({ modelo: 'zzz' }).modelo).toBe('andarilho');
  });

  it('aceita índices válidos', () => {
    expect(normalizarAparencia({ modelo: 'andarilho', pele: 4, acessorio: 'capuz' })).toMatchObject(
      {
        pele: 4,
        acessorio: 'capuz',
      },
    );
  });

  it('nunca lança e é idempotente', () => {
    const entradas: unknown[] = [
      null,
      undefined,
      7,
      'texto',
      {},
      [],
      { nome: 5, pele: 'a', modelo: {} },
      { nome: ' x ' },
    ];
    for (const e of entradas) {
      const um = normalizarAparencia(e);
      expect(normalizarAparencia(um)).toEqual(um);
    }
  });
});
