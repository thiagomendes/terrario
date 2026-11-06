// Junta o servidor num arquivo só (servidor/dist/index.mjs) para a imagem do container.
import { build } from 'esbuild';
await build({
  entryPoints: ['servidor/src/index.ts'],
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'esm',
  outfile: 'servidor/dist/index.mjs',
  // bibliotecas de Node em CommonJS precisam de require dentro do ESM
  banner: {
    js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);",
  },
  sourcemap: true,
  logLevel: 'warning',
});
console.log('servidor/dist/index.mjs pronto');
