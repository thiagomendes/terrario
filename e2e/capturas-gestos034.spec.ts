import { mkdirSync, writeFileSync } from 'node:fs';
import { test, type Page } from '@playwright/test';
import { esperarAssentar, rolarAte } from './roleta-palco';

/**
 * Spec 034 (T10): as folhas dos ícones dos gestos, as variantes soltas e o jogo no celular com
 * cada direção (a roleta de Gestos aberta e o balão em cima da cabeça). Fica em
 * capturas-034/gestos/ (fora de test-results, que o Playwright limpa).
 *
 * - CAPTURAS_GESTOS=1: a direção A reforçada (A2, a escolhida pelo dono em 20 nov 2026): a folha
 *   `folha-A2.png` (hoje, a A de antes e a A2), as variantes `A2-*` e o celular com a A2.
 * - CAPTURAS_GESTOS=AB: a folha de antes, com as direções A e B, e o celular com cada uma.
 *
 *   CAPTURAS_GESTOS=1 npx playwright test e2e/capturas-gestos034.spec.ts
 */
declare const process: { env: Record<string, string | undefined> };
const PASTA = 'capturas-034/gestos';
const QUAIS = process.env.CAPTURAS_GESTOS;

test.skip(!QUAIS, 'capturas dos gestos só com CAPTURAS_GESTOS');

/** Desenha cada SVG solto em 256 px (fundo transparente) e grava o PNG; o SVG também, se pedir. */
async function gravarVariantes(page: Page, comSvg: (nome: string) => boolean) {
  const variantes = await page.evaluate(() => window.__esbocoGestos!.variantes!);
  for (const [nome, svg] of Object.entries(variantes)) {
    if (comSvg(nome)) writeFileSync(`${PASTA}/variantes/${nome}.svg`, svg);
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
}

if (QUAIS === 'AB')
  test('a folha dos gestos e as variantes soltas', async ({ page }) => {
    test.setTimeout(240_000);
    mkdirSync(`${PASTA}/variantes`, { recursive: true });
    await page.setViewportSize({ width: 1500, height: 900 });
    await page.goto('/?esboco=gestos034');
    await page.waitForFunction(() => window.__esbocoGestos?.pronto === true, undefined, {
      timeout: 180_000,
    });
    await page.screenshot({ path: `${PASTA}/folha.png`, fullPage: true });
    // o SVG solto só da A (o da B é a foto dentro de um SVG: o PNG basta)
    await gravarVariantes(page, (nome) => nome.startsWith('A-'));
  });
else
  test('a folha da direção A reforçada e as variantes soltas', async ({ page }) => {
    test.setTimeout(240_000);
    mkdirSync(`${PASTA}/variantes`, { recursive: true });
    await page.setViewportSize({ width: 1500, height: 900 });
    await page.goto('/?esboco=gestos034&folha=A2');
    await page.waitForFunction(() => window.__esbocoGestos?.pronto === true, undefined, {
      timeout: 180_000,
    });
    await page.screenshot({ path: `${PASTA}/folha-A2.png`, fullPage: true });
    await gravarVariantes(page, () => true);
  });

async function noJogo(page: Page, direcao: string) {
  await page.goto(`/?esboco=gestos034&direcao=${direcao}&escala=1`);
  await page.waitForFunction(() => window.__brumaluz?.ready === true, undefined, {
    timeout: 180_000,
  });
  await page.evaluate(() => {
    document.querySelector('.entrada')?.setAttribute('hidden', '');
    // sem a tela de título por trás (com ela, a roda de gestos fecha sozinha)
    document.body.classList.remove('tela-titulo');
    document.body.classList.add('toque-ativo');
    const e = window.__brumaluz!;
    e.pausarDia = true;
    e.hora = 0.42;
  });
  await page.waitForTimeout(2500);
}

for (const direcao of QUAIS === 'AB' ? ['A', 'B'] : ['A2'])
  test(`celular com a direção ${direcao}: a roleta de Gestos e o balão`, async ({ browser }) => {
    test.setTimeout(300_000);
    const ctx = await browser.newContext({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true,
    });
    // a roleta fecha sozinha em 8 s sem toque, e no SwiftShader (1 quadro por segundo) só a foto
    // da tela já passa disso: nesta captura (não é teste de regra), o prazo de fechar vira 2 min
    await ctx.addInitScript(() => {
      const orig = window.setTimeout;
      window.setTimeout = ((f: TimerHandler, ms?: number, ...a: unknown[]) =>
        orig(f, ms === 8000 ? 120_000 : ms, ...a)) as typeof window.setTimeout;
    });
    const page = await ctx.newPage();
    await noJogo(page, direcao);
    const aberta = () => page.evaluate(() => !!document.querySelector('[data-roleta].aberta'));
    // abre de novo se fechou
    const abrirGestos = async () => {
      if (!(await aberta()))
        await page.evaluate(() => window.dispatchEvent(new Event('brumaluz:gestos')));
      await page.waitForSelector('[data-roleta].aberta');
      await esperarAssentar(page);
    };
    await abrirGestos();
    await page.screenshot({ path: `${PASTA}/roleta-${direcao}.png` });
    await abrirGestos();
    await rolarAte(page, 'comemorar');
    await page.screenshot({ path: `${PASTA}/roleta-${direcao}-comemorar.png` });
    // o balão em cima da cabeça (a roleta fechada antes)
    if (await aberta()) await page.evaluate(() => window.dispatchEvent(new Event('brumaluz:gestos')));
    await page.waitForTimeout(400);
    await page.evaluate(() => window.__brumaluz!.gestos!.fazer('acenar'));
    await page.waitForTimeout(700);
    await page.screenshot({ path: `${PASTA}/balao-${direcao}.png` });
    await ctx.close();
  });
