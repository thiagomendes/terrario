import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts', 'servidor/testes/**/*.test.ts'],
    exclude: ['e2e/**', 'node_modules/**'],
  },
});
