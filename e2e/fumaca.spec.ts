import { expect, test } from '@playwright/test';

import { PASTA_CAPTURAS } from '../playwright.config';

const VIEWPORTS = [
  { nome: 'desktop', width: 1920, height: 1080 },
  { nome: 'tablet', width: 820, height: 1180 },
  { nome: 'celular', width: 390, height: 844 },
];

interface Estado {
  ready: boolean;
  fps: number;
  chunksCarregados: number;
  escalaResolucao: number;
  posicao?: number[];
  rotacao?: number[];
}

for (const vp of VIEWPORTS) {
  test(`cena em ${vp.nome}`, async ({ page }, testInfo) => {
    test.setTimeout(180_000);
    await page.setViewportSize({ width: vp.width, height: vp.height });
    const erros: string[] = [];
    page.on('pageerror', (e) => erros.push(`pageerror: ${e.message}`));
    page.on('console', (m) => {
      if (m.type() === 'error') erros.push(`console.error: ${m.text()}`);
    });
    const falhar = () => `Erros da página:\n${erros.join('\n')}`;
    const ler = () => page.evaluate(() => (window as unknown as { __brumaluz: Estado }).__brumaluz);

    await page.goto('/');
    await expect(page.locator('#app')).toContainText('Brumaluz');
    await expect(page.locator('#app')).toContainText('Jogar');
    await page.waitForFunction(
      () => (window as unknown as { __brumaluz?: Estado }).__brumaluz?.ready === true,
      undefined,
      { timeout: 120_000 },
    );
    expect((await ler()).chunksCarregados, falhar()).toBeGreaterThan(0);
    await page.screenshot({ path: `${PASTA_CAPTURAS}/entrada-${vp.nome}.png` });

    // Esconde a tela de entrada para registrar a cena e simular o jogo.
    await page.evaluate(() => {
      document.querySelector<HTMLElement>('.entrada')?.setAttribute('hidden', '');
    });
    await page.screenshot({ path: `${PASTA_CAPTURAS}/cena-${vp.nome}.png` });

    const antes = await ler();
    await page.keyboard.down('KeyW');
    await page.keyboard.down('ShiftLeft');
    await page.waitForTimeout(1500);
    await page.keyboard.up('ShiftLeft');
    await page.keyboard.up('KeyW');
    await page.mouse.move(vp.width / 2, vp.height / 2);
    await page.mouse.move(vp.width / 2 + 150, vp.height / 2 + 40);
    await page.waitForTimeout(300);
    const depois = await ler();
    await page.screenshot({ path: `${PASTA_CAPTURAS}/cena-movida-${vp.nome}.png` });
    expect(depois.posicao, falhar()).not.toEqual(antes.posicao);

    if (vp.width === 390) {
      const medidas = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
      }));
      expect(medidas.scrollWidth).toBeLessThanOrEqual(medidas.innerWidth);
    }

    const metricas = {
      viewport: vp.nome,
      fps: depois.fps,
      chunksCarregados: depois.chunksCarregados,
      escalaResolucao: depois.escalaResolucao,
    };
    await testInfo.attach(`metricas-${vp.nome}`, {
      body: JSON.stringify(metricas, null, 2),
      contentType: 'application/json',
    });
    expect(erros, falhar()).toEqual([]);
  });
}
