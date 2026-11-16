import { expect, test, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { abrirMundo, assentar, escolherNaRoda } from './guia-palco';
import { missoesDoMundo, type MundoAlma } from '../src/jogo/alma';

/**
 * Dono, 16 nov 2026 (Vila Neon): "fiz as missões pela estrela e depois o jogo ficou me oferecendo
 * as mesmas, já feitas; tocar no aviso abria a mesma missão". O convite (o baú com "?" que
 * aparece depois de um tempo brincando sem missão) só convida para missão que a criança ainda
 * não fez neste mundo. Com tudo feito, o jogo não oferece nada (e o quadro nunca abre sozinho).
 * Vale para todo mundo com missões: aqui a Vila Neon e o Rancho Alegre.
 */
declare const process: { env: Record<string, string | undefined> };
test.setTimeout(600_000);
test.use({ actionTimeout: 30_000 });
const PASTA = process.env.VILA_PASTA ?? 'test-results/convite';

const convite = (page: Page) =>
  page.evaluate(() => ({
    ...window.__guia!.convite(),
    selo: !document.querySelector<HTMLElement>('[data-alma-missao]')?.hidden,
    classe: document.querySelector('[data-alma-missao]')?.className ?? '',
    quadro: !!document.querySelector('[data-alma-quadro]'),
  }));

for (const [tema, mundo] of [
  ['vila-neon', 'vila-neon'],
  ['rancho-alegre', 'rancho-alegre'],
] as const) {
  const todas = missoesDoMundo(mundo as MundoAlma).map((m) => m.id);

  test(`${tema}: com tudo feito, o jogo não oferece missão nenhuma`, async ({ browser }) => {
    mkdirSync(PASTA, { recursive: true });
    expect(todas.length).toBeGreaterThan(0);
    const page = await abrirMundo(browser, {
      id: `convite-feitas-${tema}`,
      tema,
      extras: { alma: { local: { feitas: todas } } },
      tamanho: 'deitado',
    });
    await assentar(page);
    await page.waitForFunction(() => !!window.__guia, undefined, { timeout: 30_000 });
    // o convite em 2 s de brincadeira (no jogo são 2 min): passa muito mais que isso e nada
    await page.evaluate(() => window.__guia!.conviteEm(2));
    for (let i = 0; i < 6; i++) {
      await page.waitForTimeout(2000);
      const c = await convite(page);
      expect(c.mostra, `depois de ${(i + 1) * 2} s`).toBe(false);
      expect(c.selo).toBe(false);
      expect(c.quadro).toBe(false);
    }
    // o relógio nem conta (não há para o que convidar)
    expect((await convite(page)).segundos).toBe(0);
    await page.screenshot({ path: `${PASTA}/oferta-tudo-feito-${tema}.png` });
    // quem abre "Missões" na roda por conta própria ainda acha o bis (nada abriu sozinho)
    await escolherNaRoda(page, 'missoes');
    await page.waitForTimeout(900);
    await page.screenshot({ path: `${PASTA}/oferta-tudo-feito-${tema}-quadro-pela-roda.png` });
    await page.context().close();
  });

  test(`${tema}: faltando uma, o convite aparece (para a que falta) e o quadro não abre sozinho`, async ({
    browser,
  }) => {
    mkdirSync(PASTA, { recursive: true });
    const falta = todas[todas.length - 1];
    const page = await abrirMundo(browser, {
      id: `convite-falta-${tema}`,
      tema,
      extras: { alma: { local: { feitas: todas.slice(0, -1) } } },
      tamanho: 'deitado',
    });
    await assentar(page);
    await page.waitForFunction(() => !!window.__guia, undefined, { timeout: 30_000 });
    await page.evaluate(() => window.__guia!.conviteEm(2));
    await page.waitForFunction(() => window.__guia!.convite().mostra, undefined, {
      timeout: 20_000,
    });
    const c = await convite(page);
    expect(c.selo).toBe(true);
    expect(c.classe).toContain('convite');
    expect(c.quadro).toBe(false);
    await page.screenshot({ path: `${PASTA}/oferta-falta-uma-${tema}.png` });
    // o toque no convite abre o quadro, e nele só a missão que falta (nenhuma já feita)
    await page.locator('[data-alma-missao]').tap();
    await page.waitForSelector('[data-alma-quadro]');
    const ofertas = await page.evaluate(() =>
      Array.from(document.querySelectorAll<HTMLElement>('[data-alma-quadro] [data-alma-jogar]')).map(
        (b) => b.dataset.almaJogar,
      ),
    );
    expect(ofertas).toEqual([falta]);
    await page.context().close();
  });
}
