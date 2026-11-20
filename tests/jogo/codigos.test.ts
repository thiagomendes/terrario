import { describe, expect, it } from 'vitest';
import {
  gerarCodigo,
  normalizarCodigo,
  PALAVRAS,
  PALAVRAS_SO_DE_LEITURA,
  TOTAL_CODIGOS,
} from '../../src/jogo/codigos';
import { criarGerador } from '../../src/audio/variacao';

describe('códigos de sala', () => {
  it('têm pelo menos 4 milhões de combinações e palavras únicas, sem acento', () => {
    expect(new Set(PALAVRAS).size).toBe(PALAVRAS.length);
    expect(TOTAL_CODIGOS).toBeGreaterThanOrEqual(4_000_000);
    for (const p of PALAVRAS) expect(p).toMatch(/^[A-Z]{2,10}$/);
  });

  it('saem no formato PALAVRA-PALAVRA-NN e voltam iguais pela leitura', () => {
    const rng = criarGerador(5);
    const vistos = new Set<string>();
    for (let i = 0; i < 2000; i++) {
      const c = gerarCodigo(rng);
      expect(c).toMatch(/^[A-Z]+-[A-Z]+-\d\d$/);
      expect(normalizarCodigo(c)).toBe(c);
      vistos.add(c);
    }
    // quase nenhum repetido em 2000 sorteios
    expect(vistos.size).toBeGreaterThan(1990);
  });

  it('o sorteio nunca gera BRUMA, e um código antigo com BRUMA continua entrando', () => {
    // spec 034 (decisão do dono, 20 nov 2026)
    expect(PALAVRAS).not.toContain('BRUMA');
    expect(PALAVRAS_SO_DE_LEITURA).toEqual(['BRUMA']);
    // nenhuma palavra de leitura volta para o sorteio
    for (const p of PALAVRAS_SO_DE_LEITURA) expect(PALAVRAS).not.toContain(p);
    // o sorteio passa por todas as posições da lista (um sorteio em cada ponta e no meio)
    for (const v of [0, 0.25, 0.5, 0.75, 0.9999]) {
      const c = gerarCodigo(() => v);
      expect(c).not.toContain('BRUMA');
    }
    const rng = criarGerador(34);
    for (let i = 0; i < 20_000; i++) expect(gerarCodigo(rng)).not.toContain('BRUMA');
    expect(normalizarCodigo('BRUMA-LUA-12')).toBe('BRUMA-LUA-12');
    expect(normalizarCodigo('lua bruma 7')).toBe('LUA-BRUMA-07');
    expect(normalizarCodigo('bruma bruma 7')).toBe('BRUMA-BRUMA-07');
  });

  it('entende o que a criança digita do jeito dela', () => {
    expect(normalizarCodigo('lua cometa 48')).toBe('LUA-COMETA-48');
    expect(normalizarCodigo('  Lua-Cometa-8 ')).toBe('LUA-COMETA-08');
    expect(normalizarCodigo('LUACOMETA48')).toBeNull();
    expect(normalizarCodigo('leão tigre 3')).toBe('LEAO-TIGRE-03');
    expect(normalizarCodigo('lua cometa')).toBeNull();
    expect(normalizarCodigo('xyz abc 12')).toBeNull();
  });
});
