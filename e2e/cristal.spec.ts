import { expect, test, type Page } from '@playwright/test';

import { PASTA_CAPTURAS } from '../playwright.config';
import { telasDoFluxo } from './telas';

const VIEWPORTS = [
  { nome: 'desktop', width: 1920, height: 1080 },
  { nome: 'tablet', width: 820, height: 1180 },
  { nome: 'celular', width: 390, height: 844 },
];

const LIMITE_CANAL = 245;
const MAX_FRACAO_ESTOURADA = 0.01;
const SLOT_CRISTAL = 5;

async function apontar(page: Page, pitch: number) {
  await page.evaluate((p) => window.__brumaluz!.apontar!(0, p), pitch);
  await page.waitForFunction((p) => {
    const r = window.__brumaluz!.rotacao;
    return !!r && Math.abs(r[0] - p) < 1e-6 && Math.abs(r[1]) < 1e-6;
  }, pitch);
}

async function fracaoEstourada(
  page: Page,
  png: Awaited<ReturnType<Page['screenshot']>>,
): Promise<number> {
  return page.evaluate(
    async ({ base64, limite }) => {
      const bin = atob(base64);
      const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
      const bmp = await createImageBitmap(new Blob([bytes], { type: 'image/png' }));
      const canvas = document.createElement('canvas');
      canvas.width = bmp.width;
      canvas.height = bmp.height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(bmp, 0, 0);
      const dados = ctx.getImageData(0, 0, bmp.width, bmp.height).data;
      const total = bmp.width * bmp.height;
      let estourados = 0;
      for (let i = 0; i < total; i++) {
        const o = i * 4;
        if (dados[o] >= limite && dados[o + 1] >= limite && dados[o + 2] >= limite) {
          estourados++;
        }
      }
      return estourados / total;
    },
    { base64: png.toString('base64'), limite: LIMITE_CANAL },
  );
}

// o brilho do cristal não é leiaute: só o celular (ver e2e/telas.ts)
for (const vp of telasDoFluxo(VIEWPORTS, (v) => v.nome === 'celular')) {
  test(`cristal sem estouro em ${vp.nome}`, async ({ page }, testInfo) => {
    test.setTimeout(240_000);
    await page.setViewportSize({ width: vp.width, height: vp.height });
    const erros: string[] = [];
    page.on('pageerror', (e) => erros.push(`pageerror: ${e.message}`));
    page.on('console', (m) => {
      if (m.type() === 'error') erros.push(`console.error: ${m.text()}`);
    });
    const falhar = () => `Erros da página:\n${erros.join('\n')}`;

    // spec 034: no Doce Reino, de terreno natural no nascimento (o "Meu primeiro mundo" era do
    // Bruma e Luz, que saiu; na Vila Neon, agora o padrão, o bairro é plano e protegido)
    await page.goto('/?tema=doce-reino');
    await page.waitForFunction(() => window.__brumaluz?.ready === true, undefined, {
      timeout: 120_000,
    });
    // o mundo novo começa com a barra vazia: o teste põe o kit de blocos
    await page.evaluate(() => window.__brumaluz!.darKit?.());
    await page.waitForFunction(() => !!window.__brumaluz!.inventario?.obter(1));
    await page.evaluate(() => {
      document.querySelector<HTMLElement>('.entrada')?.setAttribute('hidden', '');
    });

    await page.evaluate((s) => window.__brumaluz!.selecionarSlot!(s), SLOT_CRISTAL);
    let colocados = 0;
    for (const pitch of [0.2, 0.3]) {
      await apontar(page, pitch);
      await expect
        .poll(() => page.evaluate(() => window.__brumaluz!.destaqueVisivel), { timeout: 30_000 })
        .toBe(true);
      const ok = await page.evaluate(() => window.__brumaluz!.interagir!('colocar'));
      if (ok) colocados++;
      await page.waitForTimeout(300);
    }
    expect(colocados, falhar()).toBeGreaterThan(0);

    let anterior = -1;
    await expect
      .poll(
        async () => {
          const atual = await page.evaluate(() => window.__brumaluz!.remalhasConcluidas!);
          const estavel = atual === anterior;
          anterior = atual;
          return estavel;
        },
        { timeout: 60_000, intervals: [500] },
      )
      .toBe(true);

    await apontar(page, 0.25);
    await page.waitForTimeout(500);
    const png = await page.screenshot({
      path: `${PASTA_CAPTURAS}/cristal-diante-da-camera-${vp.nome}.png`,
    });
    const fracao = await fracaoEstourada(page, png);
    expect(fracao, `fração de pixels estourados: ${fracao}\n${falhar()}`).toBeLessThanOrEqual(
      MAX_FRACAO_ESTOURADA,
    );

    const m = await page.evaluate(() => {
      const b = window.__brumaluz!;
      return {
        fps: b.fps,
        chunksCarregados: b.chunksCarregados,
        escalaResolucao: b.escalaResolucao,
      };
    });
    console.log(`METRICAS ${JSON.stringify({ viewport: vp.nome, fracao, ...m })}`);
    await testInfo.attach(`cristal-${vp.nome}`, {
      body: JSON.stringify({ viewport: vp.nome, fracaoEstourada: fracao, ...m }, null, 2),
      contentType: 'application/json',
    });
    expect(erros, falhar()).toEqual([]);
  });
}
