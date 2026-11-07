import { test, type Page } from '@playwright/test';

/**
 * Capturas do visual de brinquedo (spec 012) nos enquadramentos dos esboços de referência
 * (.sdd/specs/012-visual-brinquedo/referencia): primeira pessoa (picareta, minerando,
 * comendo), terceira pessoa por cima do ombro minerando, de frente e o editor de personagem.
 * Pesado: só roda com CAPTURAS_BRINQUEDO=1.
 */
declare const process: { env: Record<string, string | undefined> };
test.skip(!process.env.CAPTURAS_BRINQUEDO, 'capturas só com CAPTURAS_BRINQUEDO');
const PASTA = 'capturas-temas';

const pronto = (p: Page) =>
  p.waitForFunction(() => window.__brumaluz?.ready === true, undefined, { timeout: 180_000 });
const foto = (p: Page, nome: string) =>
  p.screenshot({ path: `${PASTA}/brinquedo-${nome}.jpg`, type: 'jpeg', quality: 82 });

test('boneco de brinquedo nos enquadramentos dos esboços', async ({ page }) => {
  test.setTimeout(400_000);
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');
  await pronto(page);
  await page.locator('[data-abrir-personagem]').click();
  await page.waitForTimeout(1500);
  await foto(page, 'editor');
  await page.evaluate(async () => {
    document.querySelector<HTMLElement>('.entrada')?.setAttribute('hidden', '');
    document.querySelector<HTMLElement>('[data-painel-personagem]')?.setAttribute('hidden', '');
    const e = window.__brumaluz!;
    e.pausarDia = true;
    e.hora = 0.42;
    e.definirClima?.('limpo');
    e.inventario!.definir(0, { item: 'picareta_ferro', qtd: 1 });
    e.inventario!.definir(1, { item: 'maca', qtd: 3 });
    e.selecionarSlot!(0);
    e.apontar!(0, 0.35);
  });
  await page.waitForTimeout(1500);
  await foto(page, '1a-pessoa-picareta');
  // golpe em curso: o meio do preparo
  const golpear = async (nome: string, espera: number) => {
    await page.evaluate(() => {
      const e = window.__brumaluz!;
      e.animar!('golpe');
    });
    await page.waitForTimeout(espera);
    await foto(page, nome);
  };
  await golpear('1a-pessoa-minerando', 60);
  await page.evaluate(() => {
    const e = window.__brumaluz!;
    e.selecionarSlot!(1);
  });
  await page.waitForTimeout(500);
  await page.evaluate(() => window.__brumaluz!.animar!('comer'));
  await page.waitForTimeout(500);
  await foto(page, '1a-pessoa-comendo');
  // terceira pessoa por cima do ombro, minerando
  await page.evaluate(() => {
    const e = window.__brumaluz!;
    e.selecionarSlot!(0);
    e.camera!.definir('terceira');
    e.apontar!(0, 0.25);
  });
  await page.waitForTimeout(1200);
  await foto(page, '3a-pessoa');
  await golpear('3a-pessoa-minerando', 60);
  // de frente
  await page.evaluate(() => {
    const e = window.__brumaluz!;
    e.camera!.definir('frente');
    e.apontar!(0, 0.15);
  });
  await page.waitForTimeout(1500);
  await foto(page, 'frente');
  await page.evaluate(() => window.__brumaluz!.animar!('pulo'));
  await page.waitForTimeout(90);
  await foto(page, 'frente-pulo');
});
