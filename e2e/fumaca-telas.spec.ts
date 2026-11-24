import { expect, test } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { PASTA_CAPTURAS } from '../playwright.config';
import { TAMANHOS, abrirMundo, assentar, type Tamanho } from './guia-palco';
import { caixasDoHud, foraDaTela, sobrepostas } from './leiaute';

/**
 * A foto de leiaute da fumaça (dono, 22 nov 2026): a Vila Neon (o mundo padrão) aberta em cada
 * uma das três telas, com o HUD de verdade. Confere o que quebra primeiro quando a interface
 * muda: o 3D cobre a tela sem rolagem, nada do HUD sai da área visível, a carteira e o selinho
 * não tapam o HUD, e o controle de toque aparece no celular. A foto fica em
 * `test-results/screens/fumaca-telas/`.
 */
const PASTA = `${PASTA_CAPTURAS}/fumaca-telas`;

for (const tamanho of ['empe', 'deitado', 'pc'] as Tamanho[])
  test(`leiaute da Vila Neon (${tamanho})`, async ({ browser }) => {
    test.setTimeout(240_000);
    mkdirSync(PASTA, { recursive: true });
    const page = await abrirMundo(browser, { id: `fumaca-telas-${tamanho}`, tema: 'vila-neon', tamanho });
    const erros: string[] = [];
    page.on('pageerror', (e) => erros.push(String(e)));
    await assentar(page);
    await page.waitForSelector('[data-alma-carteira]', { timeout: 30_000 });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${PASTA}/${tamanho}.png` });

    const { width, height } = TAMANHOS[tamanho].viewport;
    const tela = await page.evaluate(() => {
      const r = document.getElementById('cena')!.getBoundingClientRect();
      const d = document.documentElement;
      return {
        cobre: r.left <= 0 && r.top <= 0 && r.right >= innerWidth && r.bottom >= innerHeight,
        rolaX: d.scrollWidth > innerWidth,
        rolaY: d.scrollHeight > innerHeight,
        W: innerWidth,
        H: innerHeight,
      };
    });
    expect([tela.W, tela.H], 'a área visível é a da tela').toEqual([width, height]);
    expect(tela.cobre, 'o 3D cobre a tela inteira').toBe(true);
    expect(tela.rolaX, 'sem rolagem de lado').toBe(false);
    expect(tela.rolaY, 'sem rolagem para baixo').toBe(false);

    const c = await caixasDoHud(page);
    expect(c.hud.length, 'o HUD aparece').toBeGreaterThanOrEqual(3);
    expect(c.alma.length, 'a carteira aparece').toBeGreaterThanOrEqual(1);
    expect([...sobrepostas(c), ...foraDaTela(c)], 'nada do HUD tapado nem cortado').toEqual([]);
    if (tamanho !== 'pc') await expect(page.locator('.toque .joystick')).toBeVisible();
    expect(erros, erros.join('\n')).toEqual([]);
    await page.context().close();
  });
