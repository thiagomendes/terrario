import { expect, test, type Page } from '@playwright/test';

/**
 * O selinho "Mostrar FPS e nitidez" não fica atrás da bússola (o dono viu no computador, 12 nov):
 * no computador ele vem logo abaixo dela; no celular estreito a bússola some e ele fica no alto.
 */
const pronto = (p: Page) =>
  p.waitForFunction(() => window.__brumaluz?.ready === true, undefined, { timeout: 240_000 });

async function abrir(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('terrario:config', JSON.stringify({ mostrarNitidez: true }));
  });
  await page.goto('/?tema=rancho-alegre');
  await pronto(page);
  await page.evaluate(() => document.querySelector<HTMLElement>('.entrada')?.setAttribute('hidden', ''));
  await page.waitForSelector('[data-nitidez]:not([hidden])', { timeout: 30_000 });
}

const caixa = (page: Page, sel: string) =>
  page.evaluate((s) => {
    const el = document.querySelector<HTMLElement>(s);
    if (!el || getComputedStyle(el).display === 'none') return null;
    const r = el.getBoundingClientRect();
    return r.width > 0 ? { top: r.top, bottom: r.bottom, left: r.left, right: r.right } : null;
  }, sel);

test('computador: o selinho fica abaixo da bússola, sem se cobrirem', async ({ page }) => {
  test.setTimeout(300_000);
  await page.setViewportSize({ width: 1280, height: 720 });
  await abrir(page);
  const b = await caixa(page, '.bussola');
  const s = await caixa(page, '[data-nitidez]');
  expect(b).not.toBeNull();
  expect(s).not.toBeNull();
  expect(s!.top).toBeGreaterThanOrEqual(b!.bottom);
  await page.screenshot({ path: 'test-results/selo-nitidez/pc.png' });
});

test('celular: sem bússola, o selinho fica no alto', async ({ browser }) => {
  test.setTimeout(300_000);
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true,
  });
  const page = await ctx.newPage();
  await abrir(page);
  expect(await caixa(page, '.bussola')).toBeNull();
  const s = await caixa(page, '[data-nitidez]');
  expect(s!.top).toBeLessThan(20);
  await page.screenshot({ path: 'test-results/selo-nitidez/cel.png' });
  await ctx.close();
});
