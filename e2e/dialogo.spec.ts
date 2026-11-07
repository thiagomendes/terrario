import { expect, test } from '@playwright/test';

/** Spec 012: renomear e excluir mundo usam o diálogo de brinquedo, não a janela do navegador. */
test('renomear mundo pelo diálogo de brinquedo', async ({ page }) => {
  test.setTimeout(240_000);
  let nativo = false;
  page.on('dialog', async (d) => {
    nativo = true;
    await d.dismiss();
  });
  await page.goto('/');
  await page.waitForFunction(() => window.__brumaluz?.ready === true, undefined, {
    timeout: 180_000,
  });
  await page.locator('[data-abrir-mundos]').click();
  await page.locator('.cartao-mundo-item button', { hasText: 'Renomear' }).first().click();
  const campo = page.locator('[data-dialogo-campo]');
  await expect(campo).toBeVisible();
  await expect(campo).toBeFocused();
  await campo.fill('Mundo da Bia');
  await page.locator('[data-dialogo-confirmar]').click();
  await expect(page.locator('[data-dialogo]')).toHaveCount(0);
  await expect(page.locator('.cartao-mundo-item .nome').first()).toHaveText('Mundo da Bia');
  // Esc cancela sem mudar nada
  await page.locator('.cartao-mundo-item button', { hasText: 'Renomear' }).first().click();
  await page.locator('[data-dialogo-campo]').fill('Outro');
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-dialogo]')).toHaveCount(0);
  await expect(page.locator('.cartao-mundo-item .nome').first()).toHaveText('Mundo da Bia');
  expect(nativo).toBe(false);
});
