import { defineConfig } from '@playwright/test';

/**
 * Como o navegador de teste desenha o 3D: por padrão por software (SwiftShader, igual em
 * qualquer máquina); com E2E_GPU=1, na placa de vídeo pela ponte do WSL (scripts/e2e-gpu.sh),
 * bem mais rápido e com muito menos CPU.
 */
const LANCAR = process.env.E2E_GPU
  ? {
      ignoreDefaultArgs: ['--headless'],
      args: [
        '--headless=new',
        '--enable-gpu',
        '--ignore-gpu-blocklist',
        '--disable-software-rasterizer',
        '--use-gl=angle',
        '--use-angle=gl-egl',
      ],
    }
  : { args: ['--use-gl=angle', '--use-angle=swiftshader', '--ignore-gpu-blocklist'] };

/**
 * Teste contra o site publicado e o servidor da nuvem (spec 010, critério 12): sem
 * servidor local. Uso: npx playwright test -c playwright.nuvem.config.ts
 */
export default defineConfig({
  testDir: 'e2e-nuvem',
  workers: 1,
  outputDir: 'test-results/nuvem',
  use: {
    baseURL: process.env.SITE ?? 'https://yellow-field-0d32c420f.5.azurestaticapps.net',
    launchOptions: LANCAR,
  },
});
