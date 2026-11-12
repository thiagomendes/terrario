import { expect, test, type Page } from '@playwright/test';

/**
 * Spec 019 (T05): os sons novos tocam de verdade no jogo (o registro dos testes de tela,
 * `sonsTocados`, guarda `efeito:<som>`): a roda abre e fecha com "plop", o gesto tem o som
 * dele (aplaudir são palminhas), a mochila abre com o zíper, o cadeado é um "toc" e a água
 * colocada faz "chuá". E os créditos dos sons aparecem em Configurações → Áudio.
 */
async function pronto(page: Page) {
  await page.waitForFunction(() => window.__brumaluz?.ready === true, undefined, {
    timeout: 180_000,
  });
}

function coletarErros(page: Page): string[] {
  const erros: string[] = [];
  page.on('pageerror', (e) => erros.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') erros.push(`console.error: ${m.text()}`);
  });
  return erros;
}

const efeitos = (page: Page) =>
  page.evaluate(() => window.__brumaluz!.sonsTocados!().filter((s) => s.startsWith('efeito:')));

test('roda, gesto, mochila e cadeado com os sons novos', async ({ page }) => {
  test.setTimeout(300_000);
  const erros = coletarErros(page);
  await page.setViewportSize({ width: 1024, height: 600 });
  await page.goto('/');
  await pronto(page);
  // liga o som com o toque em "entrar"
  await page.locator('.entrada').click();
  await expect
    .poll(() => page.evaluate(() => window.__brumaluz!.audio!.estado), { timeout: 15_000 })
    .toBe('ativo');
  await page.evaluate(() => {
    document.querySelector('.entrada')?.setAttribute('hidden', '');
    window.__brumaluz!.pausarDia = true;
  });

  // a roda dos gestos: abre com "plop", o 1º… aplaudir (5) faz palminhas e a roda fecha
  await page.keyboard.press('KeyG');
  await expect.poll(() => efeitos(page)).toContain('efeito:rodaAbrir');
  await page.keyboard.press('Digit5');
  await expect.poll(() => efeitos(page)).toContain('efeito:palmas');
  await expect.poll(() => efeitos(page)).toContain('efeito:rodaFechar');

  // a mochila
  await page.waitForTimeout(400);
  await page.keyboard.press('KeyE');
  await expect.poll(() => page.evaluate(() => document.body.dataset.overlay)).toBe('inventario');
  await expect.poll(() => efeitos(page)).toContain('efeito:mochila');
  await page.keyboard.press('Escape');

  // pedidos da interface que vêm de outras telas (conquista, criar, festa, cadeado)
  for (const s of ['conquista', 'criar', 'festa', 'toc'])
    await page.evaluate(
      (s) => window.dispatchEvent(new CustomEvent('terrario:som', { detail: s })),
      s,
    );
  await expect
    .poll(() => efeitos(page))
    .toEqual(
      expect.arrayContaining(['efeito:conquista', 'efeito:criar', 'efeito:festa', 'efeito:toc']),
    );
  // um nome qualquer não toca nada
  const n = (await efeitos(page)).length;
  await page.evaluate(() =>
    window.dispatchEvent(new CustomEvent('terrario:som', { detail: 'trovao' })),
  );
  await page.waitForTimeout(300);
  expect((await efeitos(page)).length).toBe(n);
  expect(erros, erros.join('\n')).toEqual([]);
});

test('créditos dos sons em Configurações → Áudio', async ({ page }) => {
  test.setTimeout(240_000);
  const erros = coletarErros(page);
  await page.setViewportSize({ width: 390, height: 760 });
  await page.goto('/');
  await pronto(page);
  await expect(page.locator('.rodape-titulo span').first()).toContainText('gravadas');
  await page.locator('[data-abrir-config]').first().click();
  await page.locator('.abas [data-aba="audio"]').click();
  const cred = page.locator('[data-creditos-sons]');
  await expect(cred).toBeVisible();
  await cred.locator('summary').click();
  await expect(cred).toContainText('FluidR3_GM');
  await expect(cred).toContainText('Wikimedia Commons');
  await expect(cred).toContainText('BigSoundBank');
  // cabe no celular: nada passa da largura da tela
  const largura = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(largura).toBeLessThanOrEqual(390);
  await page.screenshot({ path: 'test-results/sons-resto/creditos.png' });
  expect(erros, erros.join('\n')).toEqual([]);
});
