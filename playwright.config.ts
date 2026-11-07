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
        // medição de desempenho: sem o teto de 60 quadros do monitor
        ...(process.env.E2E_SEM_VSYNC ? ['--disable-gpu-vsync', '--disable-frame-rate-limit'] : []),
      ],
    }
  : { args: ['--use-gl=angle', '--use-angle=swiftshader', '--ignore-gpu-blocklist'] };

export default defineConfig({
  testDir: 'e2e',
  // cada navegador desenha o 3D por software (SwiftShader), com muita CPU e mais de 1 GB:
  // com 8 de uma vez a máquina virtual do WSL (8 GB) estoura e os testes perdem o prazo
  workers: 3,
  outputDir: 'test-results',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    launchOptions: LANCAR,
  },
  webServer: [
    {
      command: 'npm run build && npm run preview -- --host 127.0.0.1 --port 4173 --strictPort',
      url: 'http://127.0.0.1:4173',
      reuseExistingServer: false,
      timeout: 180_000,
    },
    {
      // servidor de salas (spec 010) com armazém em memória e atalhos de teste
      command: 'node servidor/construir.mjs && node servidor/dist/index.mjs',
      url: 'http://127.0.0.1:8080/saude',
      reuseExistingServer: false,
      timeout: 120_000,
      env: { PORT: '8080', TERRARIO_DEPURACAO: '1' },
    },
  ],
});

// Pasta das capturas de tela gravadas pelos testes e2e.
export const PASTA_CAPTURAS = 'test-results/screens';
