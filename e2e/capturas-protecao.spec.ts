import { expect, test, type Page } from '@playwright/test';

/**
 * Spec 016 (T01): capturas da proteção do mundo. A tinta de teste pinta por cima das
 * células protegidas (vermelho: estrutura; azul: usável; verde: lavoura; amarelo: chão;
 * roxo: passagem). Pesado: só roda com CAPTURAS_PROTECAO=1.
 */
declare const process: { env: Record<string, string | undefined> };
test.skip(!process.env.CAPTURAS_PROTECAO, 'capturas da proteção só com CAPTURAS_PROTECAO');

const PASTA = 'capturas-protecao';

async function abrir(page: Page, id: string) {
  await page.goto(`/?tema=${id}`);
  await page.waitForFunction(() => window.__brumaluz?.ready === true, undefined, {
    timeout: 180_000,
  });
  await page.evaluate(() => {
    document.querySelector<HTMLElement>('.entrada')?.setAttribute('hidden', '');
    const e = window.__brumaluz!;
    e.pausarDia = true;
    e.hora = 0.42;
    e.definirClima!('limpo' as never);
  });
}

for (const id of ['rancho-alegre', 'bruma-e-luz'] as const) {
  test(`proteção do mundo: ${id}`, async ({ page }) => {
    test.setTimeout(600_000);
    const erros: string[] = [];
    page.on('pageerror', (e) => erros.push(String(e)));
    await page.setViewportSize({ width: 1280, height: 720 });
    await abrir(page, id);
    const p = await page.evaluate(() => window.__brumaluz!.povoados!()[0]);
    expect(p, 'nenhum povoado perto do nascimento').toBeTruthy();
    // ao sul da praça, olhando o povoado
    await page.evaluate((p) => {
      const e = window.__brumaluz!;
      e.teleportar!(p.cx + 0.5, p.cz - 20.5);
      e.apontar!(0, 0.3);
    }, p);
    await page.waitForTimeout(9000);
    const amostra = await page.evaluate((p) => {
      const e = window.__brumaluz!;
      return {
        chaoPraca: e.protecao!(p.cx + 3, p.h - 1, p.cz + 3),
        longe: e.protecao!(p.cx + 60, p.h, p.cz + 60),
      };
    }, p);
    expect(amostra.chaoPraca).toBe('chao');
    await page.screenshot({ path: `${PASTA}/${id}-sem-tinta.png` });
    const n = await page.evaluate(() => window.__brumaluz!.tingirProtecao!(40));
    expect(n).toBeGreaterThan(500);
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${PASTA}/${id}-com-tinta.png` });
    // só as passagens e os usáveis (o que o T03 deixa usar e não deixa tapar)
    await page.evaluate(() =>
      window.__brumaluz!.tingirProtecao!(40, ['passagem', 'usavel', 'lavoura']),
    );
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${PASTA}/${id}-passagens.png` });
    expect(erros).toEqual([]);
  });
}
