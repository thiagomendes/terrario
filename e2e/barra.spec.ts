import { expect, test } from '@playwright/test';

const VIEWPORTS = [
  { nome: 'desktop', width: 1280, height: 720 },
  { nome: 'celular', width: 390, height: 844 },
];

for (const vp of VIEWPORTS) {
  test(`barra de blocos em ${vp.nome}`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: vp.width, height: vp.height });
    const erros: string[] = [];
    page.on('pageerror', (e) => erros.push(`pageerror: ${e.message}`));
    page.on('console', (m) => {
      if (m.type() === 'error') erros.push(`console.error: ${m.text()}`);
    });
    await page.goto('/');

    const barra = page.locator('[role="toolbar"]');
    await expect(barra).toHaveAttribute('aria-label', 'Barra de blocos');
    const botoes = barra.locator('[data-slot]');
    await expect(botoes).toHaveCount(6);

    for (let i = 0; i < 6; i++) {
      const nome = await botoes.nth(i).getAttribute('aria-label');
      expect(nome).toMatch(/^[^\d]+\(tecla \d\)$/);
      const render = await botoes
        .nth(i)
        .locator('.icone')
        .evaluate((el) => getComputedStyle(el).imageRendering);
      expect(render).toBe('pixelated');
      const caixa = await botoes.nth(i).boundingBox();
      expect(caixa!.width).toBeGreaterThanOrEqual(44);
      expect(caixa!.height).toBeGreaterThanOrEqual(44);
    }

    await expect(barra.locator('[aria-pressed="true"]')).toHaveCount(1);
    await expect(botoes.nth(0)).toHaveAttribute('aria-pressed', 'true');
    await botoes.nth(2).click();
    await expect(botoes.nth(2)).toHaveAttribute('aria-pressed', 'true');
    await expect(barra.locator('[aria-pressed="true"]')).toHaveCount(1);
    const borda = await botoes.nth(2).evaluate((el) => getComputedStyle(el).borderTopColor);
    expect(borda).toBe('rgb(255, 179, 92)');

    const caixa = await barra.boundingBox();
    const centro = caixa!.x + caixa!.width / 2;
    expect(Math.abs(centro - vp.width / 2)).toBeLessThanOrEqual(2);
    expect(caixa!.y + caixa!.height).toBeGreaterThan(vp.height - 40);

    const medidas = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(medidas.scrollWidth).toBeLessThanOrEqual(medidas.clientWidth);
    expect(erros).toEqual([]);
  });
}
