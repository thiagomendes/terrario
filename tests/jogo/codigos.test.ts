import { describe, expect, it } from 'vitest';
import { gerarCodigo, normalizarCodigo, PALAVRAS, TOTAL_CODIGOS } from '../../src/jogo/codigos';
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

  it('entende o que a criança digita do jeito dela', () => {
    expect(normalizarCodigo('lua cometa 48')).toBe('LUA-COMETA-48');
    expect(normalizarCodigo('  Lua-Cometa-8 ')).toBe('LUA-COMETA-08');
    expect(normalizarCodigo('LUACOMETA48')).toBeNull();
    expect(normalizarCodigo('leão tigre 3')).toBe('LEAO-TIGRE-03');
    expect(normalizarCodigo('lua cometa')).toBeNull();
    expect(normalizarCodigo('xyz abc 12')).toBeNull();
  });
});
