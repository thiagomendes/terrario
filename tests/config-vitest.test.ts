import { describe, expect, it } from 'vitest';
import config from '../vitest.config';

describe('vitest.config', () => {
  it('limita include a tests e exclui e2e', () => {
    const test = config.test ?? {};
    expect(test.include).toEqual(['tests/**/*.test.ts']);
    expect(test.exclude).toContain('e2e/**');
  });
});
