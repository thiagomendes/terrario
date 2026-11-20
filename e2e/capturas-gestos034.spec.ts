import { mkdirSync, writeFileSync } from 'node:fs';
import { test, type Page } from '@playwright/test';
import { esperarAssentar, rolarAte } from './roleta-palco';

/**
 * Spec 034 (T10): a folha dos ícones dos gestos (A: o boneco do jogo desenhado; B: foto do
 * boneco do jogo), as variantes soltas e o jogo no celular com cada direção (a roleta de Gestos
 * aberta e o balão em cima da cabeça). Só roda com CAPTURAS_GESTOS=1:
 *   CAPTURAS_GESTOS=1 npx playwright test e2e/capturas-gestos034.spec.ts
 * Fica em capturas-034/gestos/ (fora de test-results, que o Playwright limpa).
 */
declare const process: { env: Record<string, string | undefined> };
const PASTA = 'capturas-034/gestos';

test.skip(!process.env.CAPTURAS_GESTOS, 'capturas dos gestos só com CAPTURAS_GESTOS');

test('a folha dos gestos e as variantes soltas', async ({ page }) => {
  test.setTimeout(240_000);
  mkdirSync(`${PASTA}/variantes`, { recursive: true });
  await page.setViewportSize({ width: 1500, height: 900 });
  await page.goto('/?esboco=gestos034');
  await page.waitForFunction(() => window.__esbocoGestos?.pronto === true, undefined, {
    timeout: 180_000,
  });
  await page.screenshot({ path: `${PASTA}/folha.png`, fullPage: true });
  // as variantes soltas: cada SVG desenhado em 256 px, com fundo transparente
  const variantes = await page.evaluate(() => window.__esbocoGestos!.variantes!);
  for (const [nome, svg] of Object.entries(variantes)) {
    // o SVG solto só da A (o da B é a foto dentro de um SVG: o PNG basta)
    if (nome.startsWith('A-')) writeFileSync(`${PASTA}/variantes/${nome}.svg`, svg);
    const png = await page.evaluate(async (svg) => {
      const img = new Image();
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
      await img.decode();
      const c = document.createElement('canvas');
      c.width = 256;
      c.height = 256;
      c.getContext('2d')!.drawImage(img, 0, 0, 256, 256);
      return c.toDataURL('image/png').split(',')[1];
    }, svg);
    writeFileSync(`${PASTA}/variantes/${nome}.png`, png, 'base64');
  }
});

async function noJogo(page: Page, direcao: 'A' | 'B') {
  await page.goto(`/?esboco=gestos034&direcao=${direcao}&escala=1`);
  await page.waitForFunction(() => window.__brumaluz?.ready === true, undefined, {
    timeout: 180_000,
  });
  await page.evaluate(() => {
    document.querySelector('.entrada')?.setAttribute('hidden', '');
    document.body.classList.add('toque-ativo');
    const e = window.__brumaluz!;
    e.pausarDia = true;
    e.hora = 0.42;
  });
  await page.waitForTimeout(2500);
}

for (const direcao of ['A', 'B'] as const)
  test(`celular com a direção ${direcao}: a roleta de Gestos e o balão`, async ({ browser }) => {
    test.setTimeout(300_000);
    const ctx = await browser.newContext({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true,
    });
    const page = await ctx.newPage();
    await noJogo(page, direcao);
    await page.evaluate(() => window.dispatchEvent(new Event('brumaluz:gestos')));
    await page.waitForSelector('[data-roleta].aberta');
    await esperarAssentar(page);
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${PASTA}/roleta-${direcao}.png` });
    await rolarAte(page, 'comemorar');
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${PASTA}/roleta-${direcao}-comemorar.png` });
    // o balão em cima da cabeça
    await page.evaluate(() => window.dispatchEvent(new Event('brumaluz:gestos')));
    await page.waitForTimeout(400);
    await page.evaluate(() => window.__brumaluz!.gestos!.fazer('acenar'));
    await page.waitForTimeout(700);
    await page.screenshot({ path: `${PASTA}/balao-${direcao}.png` });
    await ctx.close();
  });
