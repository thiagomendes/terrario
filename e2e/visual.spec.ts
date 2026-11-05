import { expect, test, type Page } from '@playwright/test';

import { PASTA_CAPTURAS } from '../playwright.config';

const VIEWPORTS = [
  { nome: 'desktop', width: 1920, height: 1080 },
  { nome: 'tablet', width: 820, height: 1180 },
  { nome: 'celular', width: 390, height: 844 },
];

async function apontar(page: Page, pitch: number) {
  await page.evaluate((p) => window.__brumaluz!.apontar!(0, p), pitch);
  await page.waitForFunction((p) => {
    const r = window.__brumaluz!.rotacao;
    return !!r && Math.abs(r[0] - p) < 1e-6 && Math.abs(r[1]) < 1e-6;
  }, pitch);
}

for (const vp of VIEWPORTS) {
  test(`capturas visuais e desempenho em ${vp.nome}`, async ({ page }, testInfo) => {
    test.setTimeout(240_000);
    await page.setViewportSize({ width: vp.width, height: vp.height });
    const erros: string[] = [];
    page.on('pageerror', (e) => erros.push(`pageerror: ${e.message}`));
    page.on('console', (m) => {
      if (m.type() === 'error') erros.push(`console.error: ${m.text()}`);
    });
    const falhar = () => `Erros da página:\n${erros.join('\n')}`;
    const foto = (nome: string) =>
      page.screenshot({ path: `${PASTA_CAPTURAS}/${nome}-${vp.nome}.png` });

    await page.goto('/');
    await page.waitForFunction(() => window.__brumaluz?.ready === true, undefined, {
      timeout: 120_000,
    });
    await page.evaluate(() => {
      document.querySelector<HTMLElement>('.entrada')?.setAttribute('hidden', '');
    });

    // Barra: inteira dentro do viewport, sem rolagem lateral.
    const barra = page.locator('[role="toolbar"]');
    await expect(barra).toBeVisible();
    await page.keyboard.press('Digit3');
    const slots = page.locator('[role="toolbar"] [data-slot]');
    expect(await slots.count()).toBe(6);
    const caixas = [await barra.boundingBox()];
    for (let i = 0; i < 6; i++) caixas.push(await slots.nth(i).boundingBox());
    for (const c of caixas) {
      expect(c, falhar()).not.toBeNull();
      expect(c!.x).toBeGreaterThanOrEqual(0);
      expect(c!.y).toBeGreaterThanOrEqual(0);
      expect(c!.x + c!.width).toBeLessThanOrEqual(vp.width);
      expect(c!.y + c!.height).toBeLessThanOrEqual(vp.height);
    }
    const medidas = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
    }));
    expect(medidas.scrollWidth).toBeLessThanOrEqual(medidas.innerWidth);
    await foto('barra');

    // Alvo destacado.
    await apontar(page, 0.6);
    await expect
      .poll(() => page.evaluate(() => window.__brumaluz!.destaqueVisivel), { timeout: 30_000 })
      .toBe(true);
    await foto('alvo-destacado');

    // Dez edições: quebra e colocação alternadas.
    const malhasAntes = await page.evaluate(() => window.__brumaluz!.malhasAtivas!);
    let maxAplicadas = 0;
    let colocadoOk = false;
    for (let i = 0; i < 10; i++) {
      await apontar(page, 0.6);
      const modo: 'quebrar' | 'colocar' = i % 2 === 0 ? 'quebrar' : 'colocar';
      const ok = await page.evaluate((m) => window.__brumaluz!.interagir!(m), modo);
      if (modo === 'colocar' && ok) colocadoOk = true;
      for (let k = 0; k < 5; k++) {
        const n = await page.evaluate(() => window.__brumaluz!.aplicadasNoUltimoQuadro!);
        maxAplicadas = Math.max(maxAplicadas, n);
        await page.waitForTimeout(40);
      }
    }
    expect(colocadoOk, falhar()).toBe(true);
    // Aguarda a fila esvaziar: remalhas concluídas estabilizam.
    let anterior = -1;
    await expect
      .poll(
        async () => {
          const atual = await page.evaluate(() => window.__brumaluz!.remalhasConcluidas!);
          const estavel = atual === anterior;
          anterior = atual;
          maxAplicadas = Math.max(
            maxAplicadas,
            await page.evaluate(() => window.__brumaluz!.aplicadasNoUltimoQuadro!),
          );
          return estavel;
        },
        { timeout: 60_000, intervals: [500] },
      )
      .toBe(true);
    const malhasDepois = await page.evaluate(() => window.__brumaluz!.malhasAtivas!);
    expect(malhasDepois, falhar()).toBeLessThanOrEqual(malhasAntes);
    expect(maxAplicadas, falhar()).toBeLessThanOrEqual(2);
    await foto('bloco-colocado');

    // Vegetação: olhar para o horizonte.
    await apontar(page, 0.05);
    await page.waitForTimeout(500);
    await foto('vegetacao');

    const m = await page.evaluate(() => {
      const b = window.__brumaluz!;
      return {
        fps: b.fps,
        chunksCarregados: b.chunksCarregados,
        escalaResolucao: b.escalaResolucao,
        malhasAtivas: b.malhasAtivas,
        remalhaMs: b.remalhaMs,
      };
    });
    await testInfo.attach(`desempenho-${vp.nome}`, {
      body: JSON.stringify({ viewport: vp.nome, ...m }, null, 2),
      contentType: 'application/json',
    });
    expect(erros, falhar()).toEqual([]);
  });
}
