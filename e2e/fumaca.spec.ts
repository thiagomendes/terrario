import { expect, test } from '@playwright/test';

import { PASTA_CAPTURAS } from '../playwright.config';

test('abre a pagina sem erros', async ({ page }) => {
  const erros: string[] = [];
  page.on('pageerror', (e) => erros.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') erros.push(`console.error: ${m.text()}`);
  });
  await page.goto('/');
  await expect(page.locator('#app')).toContainText('Brumaluz');
  await page.screenshot({ path: `${PASTA_CAPTURAS}/fumaca.png` });
  expect(erros).toEqual([]);
});
