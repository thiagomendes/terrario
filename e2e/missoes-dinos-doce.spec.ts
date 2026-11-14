import { expect, test, type Browser, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { ARTE_CANTO } from '../src/ui/alma/arteCanto';
import {
  abrirMundo,
  andarPelaTrilha,
  assentar,
  escolherNaRoda,
  tocar,
  type Tamanho,
} from './guia-palco';

/**
 * Spec 031: as missões da Era dos Dinos e do Doce Reino. Fase 1 (o que se vê): o canto das
 * missões perto do nascer, o ninho de gravetos com os ovinhos de dino e os cartões do quadro
 * (o resultado à direita, a próxima missão aparecendo um pedacinho). Fotos em MISSOES_PASTA.
 */
declare const process: { env: Record<string, string | undefined> };
const PASTA = process.env.MISSOES_PASTA ?? 'test-results/missoes-dinos-doce';
mkdirSync(PASTA, { recursive: true });

async function abrir(browser: Browser, id: string, tema: string, tamanho: Tamanho): Promise<Page> {
  const page = await abrirMundo(browser, { id, tema, tamanho });
  await page.addStyleTag({ content: '.dica-mira { display: none !important; }' });
  await assentar(page);
  await page.waitForFunction(() => !!window.__guia, undefined, { timeout: 30_000 });
  await page.waitForTimeout(1500);
  return page;
}

/** Vira a câmera para o meio do canto (como a criança que olha em volta). */
async function olharCanto(page: Page, pitch = 0.32): Promise<void> {
  await page.evaluate((pitch) => {
    const e = window.__brumaluz!;
    const c = e.canto!()!;
    const p = e.jogadorPes!();
    e.apontar!(Math.atan2(c.x - p[0], c.z - p[2]) - 0.25, pitch);
  }, pitch);
  await page.waitForTimeout(900);
}

/** Leva o boneco para perto de um ponto, olhando para ele (as fotos de perto). */
async function chegarPerto(
  page: Page,
  alvo: [number, number, number],
  dist: number,
  lado: number,
  pitch: number,
): Promise<void> {
  await page.evaluate(
    ({ alvo, dist, lado, pitch }) => {
      const e = window.__brumaluz!;
      const c = e.canto!()!;
      const n = { x: c.x - Math.sin(c.yaw) * 12, z: c.z - Math.cos(c.yaw) * 12 };
      const a = Math.atan2(n.x - alvo[0], n.z - alvo[2]) + lado;
      const x = alvo[0] + Math.sin(a) * dist;
      const z = alvo[2] + Math.cos(a) * dist;
      e.teleportar!(x, z);
      e.apontar!(Math.atan2(alvo[0] - x, alvo[2] - z) - 0.3, pitch);
    },
    { alvo, dist, lado, pitch },
  );
  await page.waitForTimeout(1800);
}

async function quadro(page: Page, nome: string): Promise<void> {
  await escolherNaRoda(page, 'missoes');
  await page.waitForSelector('[data-alma-quadro]', { timeout: 20_000 });
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${PASTA}/${nome}-quadro.png` });
  await page.locator('[data-alma-quadro]').screenshot({ path: `${PASTA}/${nome}-cartoes.png` });
}

for (const [tema, nome, primeira] of [
  ['era-dos-dinos', 'dinos', 'd1'],
  ['doce-reino', 'doce', 'e1'],
] as const)
  for (const tamanho of ['deitado', 'empe'] as const)
    test(`fase 1: ${nome}, ${tamanho}: o canto, o quadro e o começo da trilha`, async ({
      browser,
    }) => {
      test.setTimeout(400_000);
      const page = await abrir(browser, `m031-${nome}-${tamanho}`, tema, tamanho);
      const canto = await page.evaluate(() => window.__brumaluz!.canto?.() ?? null);
      expect(canto).not.toBeNull();
      // o canto fica perto do nascer (a trilha curta)
      const d = await page.evaluate(() => {
        const e = window.__brumaluz!;
        const c = e.canto!()!;
        const p = e.jogadorPes!();
        return Math.hypot(c.x - p[0], c.z - p[2]);
      });
      console.log(`m031: ${nome} ${tamanho}: canto a ${d.toFixed(1)} blocos do nascer`);
      expect(d).toBeLessThan(18);
      await page.screenshot({ path: `${PASTA}/${nome}-${tamanho}-nascer.png` });
      await olharCanto(page);
      await page.screenshot({ path: `${PASTA}/${nome}-${tamanho}-canto.png` });
      await quadro(page, `${nome}-${tamanho}`);
      // o quadro: as duas da vez e a próxima só um pedacinho (Dinos tem 3)
      const n = await page.locator('[data-alma-quadro] .alma-oferta').count();
      expect(n).toBe(nome === 'dinos' ? 3 : 2);
      await tocar(page, `[data-alma-jogar="${primeira}"]`);
      await page.waitForTimeout(3500);
      await page.screenshot({ path: `${PASTA}/${nome}-${tamanho}-trilha.png` });
      if (nome === 'dinos') {
        const ovos = await page.evaluate(
          () => window.__brumaluz!.itensNoChao!().filter((i) => i.item === 'ovo').length,
        );
        console.log(`m031: ovinhos no chão ${ovos}`);
        expect(ovos).toBe(3);
      }
      // anda pela trilha de verdade (o joystick) até o lugar: a foto de quem chega
      const r = await andarPelaTrilha(page, 60_000);
      console.log(`m031: ${nome} ${tamanho}: chegou=${r.chegou} em ${r.s.toFixed(1)} s`);
      await page.waitForTimeout(1600);
      await page.screenshot({ path: `${PASTA}/${nome}-${tamanho}-chegou.png` });
      if (tamanho === 'deitado' && nome === 'doce') {
        // o bolo de perto, de frente (a mesa à direita do boneco)
        await page.evaluate(() => {
          const e = window.__brumaluz!;
          const m = e.canto!()!.mesa!;
          const p = e.jogadorPes!();
          const mx = (m.x0 + m.x1 + 1) / 2;
          const mz = (m.z0 + m.z1 + 1) / 2;
          e.apontar!(Math.atan2(mx - p[0], mz - p[2]) - 0.35, 0.45);
        });
        await page.waitForTimeout(1200);
        await page.screenshot({ path: `${PASTA}/doce-bolo-fantasma.png` });
      }
      if (tamanho === 'deitado' && nome === 'dinos') {
        // de perto: o ninho e os ovinhos (dinos), a mesa do bolo (doce)
        const c = canto!;
        const alvo: [number, number, number] = [c.ninho![0], c.ninho![1], c.ninho![2]];
        await chegarPerto(page, alvo, 5.5, 1.2, 0.55);
        await page.screenshot({ path: `${PASTA}/${nome}-perto.png` });
        {
          const k = c.caixa!;
          await chegarPerto(page, [(k.x0 + k.x1 + 1) / 2, k.y, (k.z0 + k.z1 + 1) / 2], 5, 0.6, 0.6);
          await page.screenshot({ path: `${PASTA}/dinos-caixa.png` });
        }
      }
      await page.context().close();
    });

test('fase 1: os desenhos novos, grandes (a folha para o consultor)', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 1200, height: 900 } });
  const page = await ctx.newPage();
  const caixas = Object.entries(ARTE_CANTO)
    .map(
      ([nome, svg]) =>
        `<div class="c"><div class="d">${svg}</div><div class="p">${svg}</div>${nome}</div>`,
    )
    .join('');
  await page.setContent(`<!doctype html><style>
    body { margin: 0; background: #f3e4c4; font: 700 12px system-ui; color: #5a3a22; }
    .f { display: flex; flex-wrap: wrap; gap: 14px; padding: 18px; }
    .c { width: 170px; display: grid; justify-items: center; gap: 4px; background: #fffaf0; border-radius: 16px; padding: 8px; box-shadow: 0 0 0 3px #f0d9b0; }
    .d { width: 128px; height: 128px; } .p { width: 34px; height: 34px; }
    svg { width: 100%; height: 100%; display: block; }
  </style><div class="f">${caixas}</div>`);
  await page.locator('.f').screenshot({ path: `${PASTA}/desenhos.png` });
  await ctx.close();
});
