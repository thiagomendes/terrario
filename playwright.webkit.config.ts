import { defineConfig, devices } from '@playwright/test';
import base from './playwright.config';

/**
 * O WebKit (o motor do Safari e do Chrome do iPhone) com um iPhone emulado: abrir e criar
 * mundos, o "Carregando" e o vigia. Uso: npx playwright test -c playwright.webkit.config.ts
 * (desenha por software: o WebKit do Linux não usa a ponte da placa de vídeo).
 */
export default defineConfig({
  ...base,
  workers: 2,
  testMatch: [
    'carregando.spec.ts',
    'iphone.spec.ts',
    'trilha-iphone.spec.ts',
    'nitidez-celular.spec.ts',
    'som-veiculos.spec.ts',
  ],
  use: { baseURL: base.use?.baseURL },
  projects: [{ name: 'iphone-webkit', use: { ...devices['iPhone 13'] } }],
});
