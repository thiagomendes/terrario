import { expect, test, type Page } from '@playwright/test';

import { PASTA_CAPTURAS } from '../playwright.config';

const VIEWPORTS = [
  { nome: 'desktop', width: 1280, height: 720 },
  { nome: 'tablet', width: 768, height: 1024 },
  { nome: 'celular', width: 390, height: 844 },
];

const SLOT_PEDRA = 1;

for (const vp of VIEWPORTS) {
  test(`capturas de personagem em ${vp.nome}`, async ({ page }, testInfo) => {
    test.setTimeout(240_000);
    await page.setViewportSize({ width: vp.width, height: vp.height });
    const erros: string[] = [];
    page.on('pageerror', (e) => erros.push(`pageerror: ${e.message}`));
    page.on('console', (m) => {
      if (m.type() === 'error') erros.push(`console.error: ${m.text()}`);
    });
    const falhar = () => `Erros da página:\n${erros.join('\n')}`;
    const semRolagemLateral = async (estado: string) => {
      const medidas = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
      }));
      expect(medidas.scrollWidth, `rolagem lateral em ${estado}`).toBeLessThanOrEqual(
        medidas.innerWidth,
      );
    };
    const foto = async (nome: string) => {
      await semRolagemLateral(nome);
      await page.screenshot({ path: `${PASTA_CAPTURAS}/${nome}-${vp.nome}.png` });
    };

    await page.goto('/');
    await page.waitForFunction(() => window.__brumaluz?.ready === true, undefined, {
      timeout: 120_000,
    });
    // o mundo novo começa com a barra vazia: o teste põe o kit de blocos
    await page.evaluate(() => window.__brumaluz!.darKit?.());
    await page.waitForFunction(() => !!window.__brumaluz!.inventario?.obter(1));

    // Painel de personalização na tela "Personagem" do título.
    await page.locator('[data-abrir-personagem]').click();
    const painel = page.locator('[data-painel-personagem]');
    await expect(painel).toBeVisible();
    await foto('painel-personagem');

    await page.evaluate(() => {
      document.querySelector<HTMLElement>('.entrada')?.setAttribute('hidden', '');
    });
    await page.evaluate((s) => window.__brumaluz!.selecionarSlot!(s), SLOT_PEDRA);
    await expect.poll(() => page.evaluate(() => window.__brumaluz!.personagem!.maoBloco())).toBe(2);
    await page.evaluate(() => window.__brumaluz!.apontar!(0, 0.3));

    // Só terceira pessoa (spec 015): o boneco visível com o bloco na mão.
    expect(await page.evaluate(() => window.__brumaluz!.personagem!.visivel())).toEqual({
      corpo: true,
    });
    expect(await page.evaluate(() => window.__brumaluz!.personagem!.malhasMao())).toBeGreaterThan(
      0,
    );
    await page.waitForTimeout(800);
    await foto('terceira-pessoa-personagem');

    const dados = await page.evaluate(() => ({
      malhas: window.__brumaluz!.personagem!.malhas(),
      fps: window.__brumaluz!.fps,
    }));
    expect(dados.malhas).toBeGreaterThan(0);
    await testInfo.attach(`personagem-${vp.nome}`, {
      body: JSON.stringify({ viewport: vp.nome, ...dados }, null, 2),
      contentType: 'application/json',
    });
    expect(erros, falhar()).toEqual([]);
  });
}
