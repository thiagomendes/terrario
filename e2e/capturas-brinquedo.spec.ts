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
  // efeito de quebrar: pecinhas de plástico e confete (o bloco à frente, no chão)
  await page.evaluate(() => {
    const e = window.__brumaluz!;
    e.selecionarSlot!(0);
    e.apontar!(0, 0.5);
  });
  await page.waitForTimeout(400);
  const quebrar = () =>
    page.evaluate(() => {
      const e = window.__brumaluz!;
      const [x, y, z] = e.posicao!;
      for (const dx of [-1, 1])
        e.barramento!.emitir('quebra', {
          x: Math.floor(x) + dx,
          y: Math.floor(y) - 2,
          z: Math.floor(z) + 2,
          bloco: e.bloco!(Math.floor(x), Math.floor(y) - 2, Math.floor(z) + 2) || 1,
        });
    });
  await quebrar();
  await page.waitForTimeout(140);
  await foto(page, 'quebrar-1');
  await quebrar();
  await page.waitForTimeout(450);
  await foto(page, 'quebrar-2');
  // terceira pessoa por cima do ombro, minerando
  await page.evaluate(() => {
    const e = window.__brumaluz!;
    e.selecionarSlot!(0);
    e.camera!.definir('terceira');
    e.apontar!(0, 0.25);
  });
  await page.waitForTimeout(1200);
  await foto(page, '3a-pessoa');
  await page
    .locator('[data-minimapa]')
    .screenshot({ path: `${PASTA}/brinquedo-minimapa.png`, scale: 'device' });
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

const TEMAS = [
  'bruma-e-luz',
  'planeta-vivo',
  'mata-encantada',
  'doce-reino',
  'era-dos-dinos',
  'exploracao-lunar',
];
for (const id of TEMAS) {
  test(`bichos e moradores de brinquedo: ${id}`, async ({ page }) => {
    test.setTimeout(300_000);
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto(`/?tema=${id}`);
    await pronto(page);
    // os bichos do tema em fila, na frente do jogador (cervo, coelho, raposa e a noturna)
    await page.evaluate(async () => {
      document.querySelector<HTMLElement>('.entrada')?.setAttribute('hidden', '');
      const e = window.__brumaluz!;
      e.pausarDia = true;
      e.hora = 0.42;
      e.definirClima?.('limpo');
      e.camera!.definir('terceira');
      const [x, , z] = e.posicao!;
      const tipos = ['cervo', 'coelho', 'raposa', 'espectro'] as const;
      tipos.forEach((t, i) => e.invocar!(t, x - 3 + i * 2, 90, z + 5));
      e.apontar!(0, 0.3);
    });
    await page.waitForTimeout(4000);
    await foto(page, `bichos-${id}`);
    // um povoado: os moradores das três profissões
    const p = await page.evaluate(() => window.__brumaluz!.povoados!()[0]);
    if (!p) return;
    await page.evaluate((p) => window.__brumaluz!.teleportar!(p.cx + 2.5, p.cz + 2.5), p);
    await page.waitForFunction(
      () => (window.__brumaluz!.criaturas?.() ?? []).some((c) => c.tipo === 'morador'),
      undefined,
      { timeout: 120_000 },
    );
    await page.evaluate(async () => {
      const e = window.__brumaluz!;
      const m = (e.criaturas?.() ?? []).find((c) => c.tipo === 'morador')!;
      const [px, , pz] = e.posicao!;
      const d = Math.hypot(m.x - px, m.z - pz) || 1;
      e.teleportar!(m.x - ((m.x - px) / d) * 3, m.z - ((m.z - pz) / d) * 3, m.y);
      await new Promise((r) => setTimeout(r, 400));
      const [qx, qy, qz] = e.posicao!;
      e.apontar!(
        Math.atan2(m.x - qx, m.z - qz),
        -Math.atan2(m.y + 0.9 - qy, Math.hypot(m.x - qx, m.z - qz)),
      );
    });
    await page.waitForTimeout(2500);
    await foto(page, `morador-${id}`);
  });
}
