import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  // cada navegador desenha o 3D por software (SwiftShader), com muita CPU e mais de 1 GB:
  // com 8 de uma vez a máquina virtual do WSL (8 GB) estoura e os testes perdem o prazo
  workers: 3,
  outputDir: 'test-results',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    launchOptions: {
      args: ['--use-gl=angle', '--use-angle=swiftshader', '--ignore-gpu-blocklist'],
    },
  },
  webServer: {
    command: 'npm run build && npm run preview -- --host 127.0.0.1 --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: false,
    timeout: 180_000,
  },
});

// Pasta das capturas de tela gravadas pelos testes e2e.
export const PASTA_CAPTURAS = 'test-results/screens';
