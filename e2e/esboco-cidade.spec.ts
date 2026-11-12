import { test, type Page } from '@playwright/test';
import { abrirPalco, camera, pontosDoPalco } from './esboco-palco';

/**
 * Capturas do esboço da spec 014 (Cidade Grande) com o motor de verdade: o palco de
 * `src/esboco/cidade.ts`, que só existe com `?esboco=cidade`. Pesado e só para o esboço:
 * roda com ESBOCO_CIDADE=1 (de preferência na GPU: E2E_ENV="-e ESBOCO_CIDADE=1"
 * scripts/e2e-gpu.sh e2e/esboco-cidade.spec.ts). As fotos vão para capturas-temas/esboco-cidade/.
 */
declare const process: { env: Record<string, string | undefined> };
test.skip(!process.env.ESBOCO_CIDADE, 'capturas do esboço só com ESBOCO_CIDADE');
const PASTA = 'capturas-temas/esboco-cidade';

const abrir = (page: Page, w: number, h: number) => abrirPalco(page, w, h);
const p = pontosDoPalco;
const cam = camera;
const foto = (page: Page, nome: string) =>
  page.screenshot({ path: `${PASTA}/${nome}.jpg`, type: 'jpeg', quality: 84 });

test('esboço da Cidade Grande: computador', async ({ page }) => {
  test.setTimeout(600_000);
  await abrir(page, 1280, 720);
  const pt = await p(page);
  const [cx, cy, cz] = pt.canteiro;
  // 1. canteiro: só os fantasmas, a criança com a colher e o pedreiro
  await page.evaluate(([x, z, ox, oz]) => window.__esboco!.crianca(x, z, [ox, oz]), [
    cx + 4.1,
    cz + 1.7,
    cx + 1.0,
    cz + 7.5,
  ] as const);
  await page.waitForTimeout(1500);
  await cam(page, [cx + 1.2, cy + 3.4, cz + 8.6], [cx + 1.6, cy + 1.0, cz + 1.6], 52);
  await foto(page, 'canteiro-1-fantasmas');
  await page.evaluate(() => window.__esboco!.canteiro(1));
  await page.waitForTimeout(2500);
  await foto(page, 'canteiro-2-metade');
  await page.evaluate(() => window.__esboco!.canteiro(2));
  await page.waitForTimeout(3000);
  await foto(page, 'canteiro-3-pronta');
  // 2. obras prontas: ponto de ônibus e sorveteria
  const [px, py, pz] = pt.ponto;
  await page.evaluate(([x, z]) => window.__esboco!.crianca(x, z, [x, z + 4], false), [
    px + 2,
    pz - 6,
  ] as const);
  await cam(page, [px + 7.5, py + 2.3, pz + 0.6], [px + 1.6, py + 1.5, pz + 0.9], 58);
  await foto(page, 'obra-ponto-de-onibus');
  const [sx, sy, sz] = pt.sorveteria;
  await cam(page, [sx + 7, sy + 3.2, sz - 6], [sx + 2, sy + 1.8, sz + 2], 55);
  await foto(page, 'obra-sorveteria');
  // 3. os prédios
  const [gx, gy, gz] = pt.geminada;
  await cam(page, [gx + 19, gy + 2.4, gz + 17.6], [gx + 9, gy + 10, gz + 4], 74);
  await foto(page, 'predio-geminadas');
  const [dx, dy, dz] = pt.deco;
  await cam(page, [dx + 16, dy + 3, dz + 19], [dx + 4, dy + 15, dz + 4], 70);
  await foto(page, 'predio-art-deco');
  // 4. a quadra vista da calçada, de dia e de noite
  const [ox, oy, oz] = pt.origem;
  await cam(page, [ox + 28, oy + 2.4, oz + 39.2], [ox + 30, oy + 11, oz + 18], 74);
  await foto(page, 'rua-dia');
  await cam(page, [ox + 40, oy + 2.4, oz + 39], [ox + 80, oy + 9, oz + 26], 72);
  await foto(page, 'rua-esquina-dia');
  await page.evaluate(() => window.__esboco!.noite(true));
  await page.waitForTimeout(5000);
  await cam(page, [ox + 28, oy + 2.4, oz + 39.2], [ox + 30, oy + 11, oz + 18], 74);
  await foto(page, 'rua-noite');
  await cam(page, [ox + 40, oy + 2.4, oz + 39], [ox + 80, oy + 9, oz + 26], 72);
  await foto(page, 'rua-esquina-noite');
  await page.evaluate(() => window.__esboco!.noite(false));
  await page.waitForTimeout(4000);
  // 5. táxi e ônibus; o táxi parado antes da criança na faixa
  await cam(page, [ox + 35, oy + 3.0, oz + 40.5], [ox + 27, oy + 1.4, oz + 34], 55);
  await foto(page, 'veiculos-parados');
  const [zx, , zz] = pt.zebra;
  await page.evaluate(([x, z]) => window.__esboco!.crianca(x, z, [x - 4, z], false), [
    zx + 0.5,
    zz,
  ] as const);
  await cam(page, [zx - 7, oy + 7.5, zz + 4.6], [zx - 2.5, oy + 1, zz - 0.5], 58);
  await foto(page, 'veiculos-cruzamento');
  // 6. a cidade de um pouco mais alto
  await cam(page, [ox + 28, oy + 48, oz + 92], [ox + 64, oy, oz + 30], 62);
  await foto(page, 'cidade-do-alto');
});

test('esboço da Cidade Grande: celular em pé', async ({ page }) => {
  test.setTimeout(600_000);
  await abrir(page, 412, 860);
  const pt = await p(page);
  const [cx, cy, cz] = pt.canteiro;
  await page.evaluate(([x, z, ox, oz]) => window.__esboco!.crianca(x, z, [ox, oz]), [
    cx + 4.1,
    cz + 1.7,
    cx + 1.0,
    cz + 7.5,
  ] as const);
  await page.waitForTimeout(1500);
  await cam(page, [cx + 1.5, cy + 6.5, cz + 13.5], [cx + 1.5, cy + 0.8, cz + 2.2], 66);
  await foto(page, 'celular-canteiro-fantasmas');
  await page.evaluate(() => window.__esboco!.canteiro(2));
  await page.waitForTimeout(3000);
  await foto(page, 'celular-canteiro-pronta');
  const [ox, oy, oz] = pt.origem;
  await cam(page, [ox + 31, oy + 2.4, oz + 39], [ox + 31, oy + 12, oz + 22], 72);
  await foto(page, 'celular-rua-dia');
  await page.evaluate(() => window.__esboco!.noite(true));
  await page.waitForTimeout(5000);
  await cam(page, [ox + 31, oy + 2.4, oz + 39], [ox + 31, oy + 12, oz + 22], 72);
  await foto(page, 'celular-rua-noite');
});
