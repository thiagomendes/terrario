import { test, type Page } from '@playwright/test';
import { abrirPalco, camera, foto, hora, passo, type V3 } from './esboco-fantasias-palco';
import type { Tamanho } from './guia-palco';

/**
 * Fotos do esboço da spec 027 (Noite das Fantasias) com o motor de verdade: o palco de
 * `src/esboco/fantasias.ts`, que só existe com `?esboco=fantasias`. Pesado e só para o esboço:
 * roda com ESBOCO_027=1, na placa de vídeo (E2E_ENV="-e ESBOCO_027=1" scripts/e2e-gpu.sh
 * e2e/esboco-fantasias.spec.ts). As fotos vão para capturas-027/esboco/.
 *
 * Parte 1: o céu e os lugares. Cada lugar no entardecer (o "dia" do mundo) e de noite; as
 * tomadas (onde a câmera fica) são do próprio esboço, que sabe onde montou cada coisa.
 */
declare const process: { env: Record<string, string | undefined> };
test.skip(!process.env.ESBOCO_027, 'fotos do esboço só com ESBOCO_027');

/** O entardecer dourado (o dia do mundo) e a noite roxa com a lua baixa no leste. */
const ENTARDECER = 0.7;
const NOITE = 0.8;

const ORDEM = ['praca', 'barracas', 'rua', 'vovo', 'bosque', 'horta', 'panorama'];

async function fotografar(page: Page, t: Tamanho) {
  const tomadas = await page.evaluate(() => window.__fantasias!.tomadas);
  const tipo = t === 'empe' ? 'empe' : 'deitado';
  const so = process.env.FANTASIAS_SO?.split(',');
  for (const [qual, h] of [
    ['entardecer', ENTARDECER],
    ['noite', NOITE],
  ] as const) {
    await hora(page, h);
    await page.waitForTimeout(3000);
    for (const [i, nome] of ORDEM.entries()) {
      if (so && !so.includes(nome)) continue;
      const tm = tomadas[nome][tipo];
      await camera(page, tm.pos, tm.alvo, tm.fov);
      await foto(page, `${String(i + 1).padStart(2, '0')}-${nome}-${qual}-${t}`);
    }
    if (process.env.FANTASIAS_MAPA) {
      // o mapa visto de cima (só para conferir o leiaute, não vai para o dono)
      const [ox, y, oz] = await page.evaluate(() => window.__fantasias!.pontos.origem);
      const centro: V3 = [ox + 58, y, oz + 44];
      await camera(page, [centro[0], y + 150, centro[2] + 0.01], centro, 50);
      await foto(page, `00-mapa-${qual}-${t}`);
    }
  }
  // o bosque com as lanternas todas acesas (o "acender com um toque" de todas)
  const n = await page.evaluate(() => window.__fantasias!.lanternas().length);
  await page.evaluate((k) => {
    for (let i = 0; i < k; i++) window.__fantasias!.lanterna(i, true);
  }, n);
  await page.waitForTimeout(4000);
  const b = tomadas.bosque[tipo];
  await camera(page, b.pos, b.alvo, b.fov);
  await foto(page, `05-bosque-noite-todas-acesas-${t}`);
}

for (const t of ['empe', 'deitado', 'pc'] as const)
  test(`esboço da Noite das Fantasias: ${t}`, async ({ browser }) => {
    test.setTimeout(900_000);
    const page = await abrirPalco(browser, t);
    await fotografar(page, t);
    passo(`fotos ${t}`);
    await page.context().close();
  });
