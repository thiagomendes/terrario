import { expect, test, type Page } from '@playwright/test';

const TEMAS = [
  ['planeta-vivo', 'Planeta Vivo'],
  ['mata-encantada', 'Mata Encantada'],
  ['doce-reino', 'Doce Reino'],
  ['era-dos-dinos', 'Era dos Dinos'],
  ['exploracao-lunar', 'Exploração Lunar'],
] as const;

async function pronto(page: Page) {
  await page.waitForFunction(() => window.__brumaluz?.ready === true, undefined, {
    timeout: 150_000,
  });
}

test('mundo antigo (sem tema) abre como Bruma e Luz', async ({ page }) => {
  test.setTimeout(200_000);
  await page.goto('/');
  await pronto(page);
  expect(await page.evaluate(() => window.__brumaluz!.tema)).toBe('bruma-e-luz');
  await expect(page.locator('[data-mundo-atual]')).toContainText('Bruma e Luz');
});

test('cartões de tema: grupo de opções com teclado e alvos grandes', async ({ page }) => {
  test.setTimeout(200_000);
  await page.goto('/');
  await pronto(page);
  await page.locator('[data-abrir-mundos]').click();
  const cartoes = page.locator('[data-painel-mundos] .cartao-tema');
  await expect(cartoes).toHaveCount(6);
  await expect(cartoes.first()).toHaveAttribute('aria-checked', 'true');
  for (let i = 0; i < 6; i++) {
    const caixa = await cartoes.nth(i).boundingBox();
    expect(caixa!.height).toBeGreaterThanOrEqual(44);
    expect(caixa!.width).toBeGreaterThanOrEqual(44);
  }
  await cartoes.first().focus();
  await page.keyboard.press('ArrowRight');
  await expect(cartoes.nth(1)).toHaveAttribute('aria-checked', 'true');
  await expect(cartoes.nth(1)).toBeFocused();
  await page.keyboard.press('End');
  await expect(cartoes.nth(5)).toHaveAttribute('aria-checked', 'true');
  await page.keyboard.press('ArrowRight');
  await expect(cartoes.nth(0)).toHaveAttribute('aria-checked', 'true');
  // só um marcado por vez
  await expect(page.locator('.cartao-tema[aria-checked="true"]')).toHaveCount(1);
});

test('vitrine do título abre a criação já com o tema mostrado', async ({ page }) => {
  test.setTimeout(200_000);
  await page.goto('/');
  await pronto(page);
  const vitrine = page.locator('[data-vitrine-temas]');
  await expect(vitrine).toBeVisible();
  const tema = await vitrine.getAttribute('data-tema');
  await vitrine.click();
  await expect(page.locator('[data-painel-mundos]')).toBeVisible();
  await expect(page.locator(`.cartao-tema[data-tema="${tema}"]`)).toHaveAttribute(
    'aria-checked',
    'true',
  );
});

for (const [id, nome] of TEMAS) {
  test(`cria, joga, salva e reabre um mundo ${nome}`, async ({ page }) => {
    test.setTimeout(420_000);
    const erros: string[] = [];
    page.on('pageerror', (e) => erros.push(String(e)));
    page.on('console', (m) => {
      if (m.type() === 'error') erros.push(m.text());
    });
    await page.goto('/');
    await pronto(page);
    await page.locator('[data-abrir-mundos]').click();
    await page.locator(`.cartao-tema[data-tema="${id}"]`).click();
    await page.locator('[data-novo-nome]').fill(`Teste ${nome}`);
    await page.locator('[data-criar-mundo]').click();
    await page.waitForURL(/mundo=/);
    await pronto(page);
    expect(await page.evaluate(() => window.__brumaluz!.tema)).toBe(id);
    await expect(page.locator('[data-mundo-atual]')).toContainText(nome);
    // joga: quebra o bloco mirado e salva
    await page.evaluate(() => document.querySelector('.entrada')?.setAttribute('hidden', ''));
    await page.evaluate(() => window.__brumaluz!.apontar!(0, 1.2));
    await page.waitForFunction(() => window.__brumaluz!.alvo !== null);
    const alvo = await page.evaluate(() => window.__brumaluz!.alvo);
    expect(await page.evaluate(() => window.__brumaluz!.interagir!('quebrar'))).toBe(true);
    expect(await page.evaluate(() => window.__brumaluz!.salvar!(true))).toBe(true);
    await page.reload();
    await pronto(page);
    expect(await page.evaluate(() => window.__brumaluz!.tema)).toBe(id);
    const b = await page.evaluate(({ x, y, z }) => window.__brumaluz!.bloco!(x, y, z), alvo!);
    expect(b).toBe(0);
    // nenhum nome do Bruma e Luz na interface do mundo (barra de itens e informações)
    const textoHud = await page.evaluate(
      () =>
        [...document.querySelectorAll('[aria-label], [title]')]
          .map((e) => `${e.getAttribute('aria-label') ?? ''} ${e.getAttribute('title') ?? ''}`)
          .join(' ') +
        ' ' +
        (window.__brumaluz!.infoMundo ?? ''),
    );
    for (const p of ['bruma', 'luzita', 'musgo', 'retorcid', 'espectro'])
      expect(textoHud.toLowerCase(), `vazou "${p}"`).not.toContain(p);
    expect(erros.filter((e) => !/favicon|AudioContext/i.test(e))).toEqual([]);
  });
}
