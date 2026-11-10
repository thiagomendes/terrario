import { expect, test, type Page } from '@playwright/test';

/**
 * O bicho do iPhone: criar um mundo leva ao endereço dele e a tela ficava azul. Aqui, criar
 * pelo painel de mundos abre o mundo novo, com a tela de título e sem o "Carregando" preso.
 * Roda no Chromium e, com playwright.webkit.config.ts, no WebKit com um iPhone emulado.
 */
const pronto = (p: Page) =>
  p.waitForFunction(() => window.__brumaluz?.ready === true, undefined, { timeout: 240_000 });

test('criar um mundo abre o mundo novo (sem tela azul)', async ({ page }) => {
  test.setTimeout(480_000);
  page.on('pageerror', (e) => console.log(`erro na página: ${String(e)}`));
  await page.goto('/');
  await expect(page.locator('.entrada')).toBeVisible({ timeout: 120_000 });
  await expect(page.locator('[data-carregando]')).toHaveCount(0, { timeout: 20_000 });
  await pronto(page);
  await page.locator('[data-abrir-mundos]').click();
  await expect(page.locator('[data-painel-mundos]')).toBeVisible();
  await page.locator('[data-novo-nome]').fill('Ilha do iPhone');
  await page.locator('[data-criar-mundo]').click();
  await page.waitForURL(/mundo=/);
  // a página nova: o título com o mundo novo, e o "Carregando" já foi embora
  await expect(page.locator('[data-mundo-atual]')).toContainText('Ilha do iPhone', {
    timeout: 120_000,
  });
  await expect(page.locator('[data-carregando]')).toHaveCount(0, { timeout: 20_000 });
  await pronto(page);
  // e voltar ao primeiro mundo pelo painel também abre
  await page.locator('[data-abrir-mundos]').click();
  await page
    .locator('[data-painel-mundos] [data-mundo]', { hasText: 'Meu primeiro mundo' })
    .getByRole('button', { name: 'Jogar', exact: true })
    .click();
  await expect(page.locator('[data-mundo-atual]')).toContainText('Meu primeiro mundo', {
    timeout: 120_000,
  });
  await expect(page.locator('[data-carregando]')).toHaveCount(0, { timeout: 20_000 });
});
