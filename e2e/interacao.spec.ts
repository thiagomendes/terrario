import { expect, test, type Page } from '@playwright/test';

async function apontar(page: Page, pitch: number) {
  await page.evaluate((p) => window.__brumaluz!.apontar!(0, p), pitch);
  await page.waitForFunction((p) => {
    const r = window.__brumaluz!.rotacao;
    return !!r && Math.abs(r[0] - p) < 1e-6 && Math.abs(r[1]) < 1e-6;
  }, pitch);
}

const BLOCOS_SLOTS = [1, 2, 3, 4, 7, 6];

test('interação por ganchos: apontar, quebrar, colocar e trocar slot', async ({ page }) => {
  test.setTimeout(180_000);
  const erros: string[] = [];
  page.on('pageerror', (e) => erros.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') erros.push(`console.error: ${m.text()}`);
  });

  await page.goto('/');
  await page.waitForFunction(() => window.__brumaluz?.ready === true, undefined, {
    timeout: 120_000,
  });

  // Apontar para o terreno à frente.
  await apontar(page, 0.6);
  await expect
    .poll(() => page.evaluate(() => window.__brumaluz!.destaqueVisivel), { timeout: 30_000 })
    .toBe(true);
  const alvo = await page.evaluate(() => window.__brumaluz!.alvo);
  expect(alvo).not.toBeNull();

  // Quebrar.
  const antes = await page.evaluate(() => ({
    remalhas: window.__brumaluz!.remalhasConcluidas!,
    chunks: window.__brumaluz!.chunksCarregados,
  }));
  const quebrou = await page.evaluate(() => window.__brumaluz!.interagir!('quebrar'));
  expect(quebrou).toBe(true);
  await page.waitForFunction((n) => window.__brumaluz!.remalhasConcluidas! > n, antes.remalhas, {
    timeout: 60_000,
  });
  const blocoQuebrado = await page.evaluate(
    (a) => window.__brumaluz!.bloco!(a!.x, a!.y, a!.z),
    alvo,
  );
  expect(blocoQuebrado).toBe(0);
  expect(await page.evaluate(() => window.__brumaluz!.chunksCarregados)).toBe(antes.chunks);

  // Colocar o bloco do slot na face apontada.
  await apontar(page, 0.6);
  const alvo2 = await page.evaluate(() => window.__brumaluz!.alvo);
  expect(alvo2).not.toBeNull();
  await page.evaluate(() => window.__brumaluz!.selecionarSlot!(5));
  const colocou = await page.evaluate(() => window.__brumaluz!.interagir!('colocar'));
  expect(colocou).toBe(true);
  const colocado = await page.evaluate(
    (a) => window.__brumaluz!.bloco!(a!.x + a!.normal.x, a!.y + a!.normal.y, a!.z + a!.normal.z),
    alvo2,
  );
  expect(colocado).toBe(BLOCOS_SLOTS[5]);

  // Apontar para os próprios pés recusa a colocação.
  await apontar(page, 1.55);
  const noPe = await page.evaluate(() => window.__brumaluz!.interagir!('colocar'));
  expect(noPe).toBe(false);

  // Teclas 1 a 9.
  const botoes = page.locator('[role="toolbar"] [data-slot]');
  for (let i = 0; i < 9; i++) {
    await page.keyboard.press(`Digit${i + 1}`);
    await expect(botoes.nth(i)).toHaveAttribute('aria-pressed', 'true');
    expect(await page.evaluate(() => window.__brumaluz!.slotAtivo)).toBe(i);
  }

  // Roda do mouse: avança e volta ao início.
  await page.mouse.move(600, 300);
  await page.keyboard.press('Digit1');
  await page.mouse.wheel(0, 100);
  await expect(botoes.nth(1)).toHaveAttribute('aria-pressed', 'true');
  expect(await page.evaluate(() => window.__brumaluz!.slotAtivo)).toBe(1);
  await page.mouse.wheel(0, -100);
  await expect(botoes.nth(0)).toHaveAttribute('aria-pressed', 'true');
  await page.mouse.wheel(0, -100);
  await expect(botoes.nth(8)).toHaveAttribute('aria-pressed', 'true');
  expect(await page.evaluate(() => window.__brumaluz!.slotAtivo)).toBe(8);

  expect(erros, erros.join('\n')).toEqual([]);
});
