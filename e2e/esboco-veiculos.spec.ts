import { test, type Page } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { abrirPalco, camera, pontosDoPalco } from './esboco-palco';

/**
 * Capturas do esboço dos veículos da spec 014 (`src/esboco/veiculos.ts`, com
 * `?esboco=veiculos`): quatro versões de táxi e ônibus na rua do palco da cidade, de dia, de
 * noite e no celular, e a mecânica (balanço, ônibus no ponto, criança na faixa, buzinadinha).
 * Só com ESBOCO_CIDADE=1: E2E_ENV="-e ESBOCO_CIDADE=1" scripts/e2e-gpu.sh e2e/esboco-veiculos.spec.ts
 */
declare const process: { env: Record<string, string | undefined> };
test.skip(!process.env.ESBOCO_CIDADE, 'capturas do esboço só com ESBOCO_CIDADE');
const PASTA = 'capturas-temas/esboco-veiculos';
const foto = (page: Page, nome: string) =>
  page.screenshot({ path: `${PASTA}/${nome}.jpg`, type: 'jpeg', quality: 84 });

test('esboço dos veículos', async ({ page }) => {
  test.setTimeout(900_000);
  await abrirPalco(page, 1280, 720, 'veiculos');
  await page.waitForFunction(() => !!window.__veiculos, undefined, { timeout: 60_000 });
  const pt = await pontosDoPalco(page);
  const [ox, oy, oz] = pt.origem;
  const Y = oy + 1;
  const custos: Record<string, unknown> = {};
  for (const v of [1, 2, 3, 4]) {
    await page.evaluate((n) => window.__veiculos!.mostrar(n), v);
    await page.waitForTimeout(1500);
    custos[`v${v}`] = await page.evaluate(() => window.__veiculos!.custo());
    const [tx, , tz] = await page.evaluate(() => window.__veiculos!.pontos.taxi);
    const [bx, , bz] = await page.evaluate(() => window.__veiculos!.pontos.onibus);
    await camera(page, [tx + 4.3, Y + 1.9, tz + 3.6], [tx, Y + 0.9, tz], 50);
    await foto(page, `v${v}-taxi`);
    await camera(page, [bx - 6.5, Y + 2.4, bz + 5.5], [bx - 0.5, Y + 1.3, bz], 52);
    await foto(page, `v${v}-onibus`);
    if (v === 3) {
      const [ex, , ez] = await page.evaluate(() => window.__veiculos!.pontos.extra);
      await camera(page, [ex + 4.3, Y + 2.2, ez + 3.8], [ex, Y + 1.4, ez], 52);
      await foto(page, 'v3-sorvete');
    }
    // o par na rua, um de frente para o outro (de noite os faróis se veem de lado e as poças de luz no asfalto)
    await page.evaluate(
      ([ox2, tz2, bz2]) => {
        const ve = window.__veiculos!;
        ve.mover('taxi', ox2 + 26.5, tz2, 0);
        ve.mover('onibus', ox2 + 38.5, bz2, Math.PI);
        window.__esboco!.crianca(ox2 + 8, tz2 + 16, [ox2 + 8, tz2 + 20], false);
      },
      [ox, tz, bz] as const,
    );
    await camera(page, [ox + 32.5, Y + 2.8, oz + 40.6], [ox + 32.5, Y + 1.0, oz + 33.8], 70);
    await foto(page, `v${v}-par-dia`);
    await page.evaluate(() => window.__veiculos!.noite(true));
    await page.waitForTimeout(4500);
    await camera(page, [ox + 32.5, Y + 2.8, oz + 40.6], [ox + 32.5, Y + 1.0, oz + 33.8], 70);
    await foto(page, `v${v}-noite`);
    await page.evaluate(() => window.__veiculos!.noite(false));
    await page.waitForTimeout(3500);
    // celular em pé: a criança na calçada, vista de trás (terceira pessoa)
    await page.evaluate(([x, z]) => window.__esboco!.crianca(x, z, [x + 8, z - 4], false), [
      ox + 26,
      oz + 38.3,
    ] as const);
    await page.setViewportSize({ width: 412, height: 860 });
    await page.evaluate(() => {
      window.dispatchEvent(new Event('resize'));
      window.__brumaluz!.cenaBabylon!().getEngine().resize();
    });
    await page.waitForTimeout(1500);
    await page.evaluate(
      ([ox2, tz2, bz2]) => {
        window.__veiculos!.mover('taxi', ox2 + 31.5, tz2, Math.PI);
        window.__veiculos!.mover('onibus', ox2 + 39.5, bz2, Math.PI);
      },
      [ox, tz, bz] as const,
    );
    await camera(page, [ox + 23.2, Y + 3.3, oz + 40.6], [ox + 34, Y + 1.0, oz + 34.2], 62);
    await foto(page, `v${v}-celular`);
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.evaluate(() => {
      window.dispatchEvent(new Event('resize'));
      window.__brumaluz!.cenaBabylon!().getEngine().resize();
    });
    await page.waitForTimeout(1200);
  }
  writeFileSync(`${PASTA}/custos.json`, JSON.stringify(custos, null, 1));

  // mecânica, com a versão 1
  await page.evaluate(() => window.__veiculos!.mostrar(1));
  await page.waitForTimeout(1500);
  const [tx, , tz] = await page.evaluate(() => window.__veiculos!.pontos.taxi);
  // o balanço de parar: normal, mergulha, volta um tiquinho
  for (const [nome, a, ach] of [
    ['balanco-1', 0, 0],
    ['balanco-2', 0.08, 0.04],
    ['balanco-3', -0.035, 0],
  ] as const) {
    await page.evaluate(([x, y]) => window.__veiculos!.balanco(x, y), [a, ach] as const);
    await camera(page, [tx + 0.4, Y + 1.2, tz + 5.4], [tx, Y + 0.9, tz], 44);
    await foto(page, `mecanica-${nome}`);
  }
  await page.evaluate(() => window.__veiculos!.balanco(0, 0));
  // o ônibus no ponto: chegando, porta aberta, saindo
  const [px, , pz] = pt.ponto;
  const cOnibus: [number, number, number] = [px + 8, Y + 3.0, pz + 4.2];
  const aOnibus: [number, number, number] = [px + 1.5, Y + 1.3, pz - 2];
  for (const [nome, dx, aberta, bal] of [
    ['onibus-chegando', -6, false, 0],
    ['onibus-porta-aberta', 1.5, true, 0.03],
    ['onibus-saindo', 9, false, -0.02],
  ] as const) {
    await page.evaluate(
      ([x, z, ab, b]) => {
        const v = window.__veiculos!;
        v.mover('onibus', x, z, 0);
        v.porta(ab);
        v.balanco(b);
      },
      [px + dx, oz + 34.9, aberta, bal] as const,
    );
    await camera(page, cOnibus, aOnibus, 60);
    await foto(page, `mecanica-${nome}`);
  }
  await page.evaluate(() => {
    window.__veiculos!.porta(false);
    window.__veiculos!.balanco(0);
  });
  // a criança na faixa: o táxi espera e dá um fom-fom
  const [zx, , zz] = pt.zebra;
  await page.evaluate(
    ([x, z, tz2]) => {
      window.__veiculos!.mover('taxi', x - 3.4, tz2, 0);
      window.__esboco!.crianca(x + 0.5, z, [x - 4, z], false);
      window.__veiculos!.balao('taxi', 'fom-fom!');
    },
    [zx, zz, tz] as const,
  );
  await camera(page, [zx - 7, oy + 7.5, zz + 4.6], [zx - 2.5, oy + 1, zz - 0.5], 58);
  await foto(page, 'mecanica-crianca-na-faixa');
  // o táxi passa por um morador e dá uma buzinadinha
  await page.evaluate(
    ([x, y, z]) => {
      const e = window.__brumaluz!;
      e.estatua!('morador', x, y, z - 4.6, 0, { profissao: 'cozinheiro', n: 1 });
      window.__veiculos!.mover('taxi', x - 1, z, 0);
      window.__veiculos!.balao('taxi', 'bi-bi!');
      window.__esboco!.crianca(x - 12, z + 4, [x, z], false);
    },
    [ox + 42, Y, oz + 34.9] as const,
  );
  await page.waitForTimeout(1200);
  await camera(page, [ox + 46.5, Y + 3.0, oz + 40], [ox + 41, Y + 1.3, oz + 32.5], 58);
  await foto(page, 'mecanica-buzinadinha');
});
