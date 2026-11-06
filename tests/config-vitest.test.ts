import { describe, expect, it } from 'vitest';
import config from '../vitest.config';

describe('vitest.config', () => {
  it('limita include aos testes de lógica e do servidor e exclui e2e', () => {
    const test = config.test ?? {};
    // lógica do jogo em tests/ e do servidor da nuvem em servidor/testes/ (spec 010)
    expect(test.include).toEqual(['tests/**/*.test.ts', 'servidor/testes/**/*.test.ts']);
    expect(test.exclude).toContain('e2e/**');
  });
});
