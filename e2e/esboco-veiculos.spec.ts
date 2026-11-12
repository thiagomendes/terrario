import { test, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { abrirPalco, camera, pontosDoPalco } from './esboco-palco';

/**
 * Capturas do esboço dos veículos da spec 014 (`src/esboco/veiculos.ts`, com
 * `?esboco=veiculos`): quatro versões de táxi e ônibus na rua do palco da cidade, de dia, de
 * noite e no celular, e a mecânica (balanço, ônibus no ponto, criança na faixa, buzinadinha).
 * Só com ESBOCO_CIDADE=1: E2E_ENV="-e ESBOCO_CIDADE=1" scripts/e2e-gpu.sh e2e/esboco-veiculos.spec.ts
 */
declare const process: { env: Record<string, string | undefined> };
test.skip(!process.env.ESBOCO_CIDADE, 'capturas do esboço só com ESBOCO_CIDADE');
const PASTA = 'capturas-temas/esboco-veiculos-r2';
const foto = (page: Page, nome: string) =>
  page.screenshot({ path: `${PASTA}/${nome}.jpg`, type: 'jpeg', quality: 84 });

test('esboço dos veículos', async ({ page }) => {
  test.setTimeout(900_000);
  await abrirPalco(page, 1280, 720, 'veiculos');
  await page.waitForFunction(() => !!window.__veiculos, undefined, { timeout: 60_000 });
  const pt = await pontosDoPalco(page);
  const [ox, oy, oz] = pt.origem;
  const Y = oy + 1;
  // rodada 2: a família da versão 3 (carinha) na avenida em frente ao parque
  await page.evaluate(() => window.__veiculos!.frota());
  await page.waitForTimeout(1500);
  const custos = await page.evaluate(() => window.__veiculos!.custo());
  mkdirSync(PASTA, { recursive: true });
  writeFileSync(`${PASTA}/custos.json`, JSON.stringify(custos, null, 1));
  const L = oz + 34.9;
  const O = oz + 33.0;
  const v = (q: string) => page.evaluate((qq) => window.__veiculos!.pontos[qq as 'taxi']!, q);
  // de 3/4, um de cada vez no mesmo lugar da rua
  for (const [qual, nome, onibus] of [
    ['taxi', 'taxi', false],
    ['policia', 'policia', false],
    ['onibus', 'onibus-azul', true],
    ['onibus2', 'onibus-verde', true],
    ['extra', 'sorvete', false],
  ] as const) {
    const antes = await v(qual);
    await page.evaluate(([q, x, z]) => window.__veiculos!.mover(q as 'taxi', x, z, 0), [
      qual,
      ox + 34,
      L,
    ] as const);
    if (qual === 'policia') await page.evaluate(() => window.__veiculos!.giroflex(true));
    await camera(
      page,
      onibus ? [ox + 40, Y + 2.4, L + 5.2] : [ox + 38.3, Y + 1.9, L + 3.6],
      [ox + 34, Y + (onibus ? 1.3 : 0.9), L],
      onibus ? 56 : 50,
    );
    await foto(page, `${nome}`);
    if (qual === 'policia') await page.evaluate(() => window.__veiculos!.giroflex(false));
    await page.evaluate(([q, x, z, yaw]) => window.__veiculos!.mover(q as 'taxi', x, z, yaw), [
      qual,
      antes[0],
      antes[2],
      antes[2] === O ? Math.PI : 0,
    ] as const);
  }
  // as quatro cores do carro comum, em fila
  await page.evaluate(
    ([ox2, L2]) => {
      const ve = window.__veiculos!;
      ['civil1', 'civil2', 'civil3', 'civil4'].forEach((q, k) =>
        ve.mover(q as 'taxi', ox2 + 24 + k * 4, L2, 0),
      );
    },
    [ox, L] as const,
  );
  await camera(page, [ox + 41, Y + 2.3, L + 4.2], [ox + 31, Y + 0.8, L], 52);
  await foto(page, 'carros-cores');
  await page.evaluate(
    ([ox2, L2, O2]) => {
      const ve = window.__veiculos!;
      ve.mover('civil1', ox2 + 70, L2, 0);
      ve.mover('civil2', ox2 + 95, O2, Math.PI);
      ve.mover('civil3', ox2 + 112, L2, 0);
      ve.mover('civil4', ox2 + 117, L2, 0);
      window.__esboco!.crianca(ox2 + 83, O2 - 3.4, [ox2 + 85, O2 + 3], false);
    },
    [ox, L, O] as const,
  );
  // a frota na rua, de dia e de noite (a câmera do lado do parque, olhando a avenida)
  await page.waitForTimeout(6000);
  const cFrota: [number, number, number] = [ox + 93, Y + 6.5, oz + 24.5];
  const aFrota: [number, number, number] = [ox + 86, Y + 0.6, oz + 34];
  await camera(page, cFrota, aFrota, 80);
  await foto(page, 'frota-dia');
  await page.evaluate(() => window.__veiculos!.noite(true));
  await page.waitForTimeout(4500);
  await camera(page, cFrota, aFrota, 80);
  await foto(page, 'frota-noite');
  await page.evaluate(() => window.__veiculos!.noite(false));
  await page.waitForTimeout(3500);
  // celular em pé: a criança na calçada do parque, vista de trás
  await page.evaluate(([x, z]) => window.__esboco!.crianca(x, z, [x + 2, z + 6], false), [
    ox + 83,
    oz + 29.6,
  ] as const);
  await page.setViewportSize({ width: 412, height: 860 });
  await page.evaluate(() => {
    window.dispatchEvent(new Event('resize'));
    window.__brumaluz!.cenaBabylon!().getEngine().resize();
  });
  await page.waitForTimeout(1500);
  await camera(page, [ox + 81.5, Y + 3.3, oz + 24.2], [ox + 87, Y + 1.0, oz + 34], 64);
  await foto(page, 'celular');
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.evaluate(() => {
    window.dispatchEvent(new Event('resize'));
    window.__brumaluz!.cenaBabylon!().getEngine().resize();
  });
  await page.waitForTimeout(1200);
  // a polícia passa pela praça com um "uí-uí" baixinho e o giroflex piscando
  await page.evaluate(() => {
    window.__veiculos!.giroflex(true);
    window.__veiculos!.balao('policia', 'uí-uí');
  });
  await camera(page, [ox + 95, Y + 3.2, oz + 27], [ox + 90, Y + 1.2, oz + 35], 58);
  await foto(page, 'mecanica-policia-na-praca');
  await page.evaluate(() => {
    window.__veiculos!.giroflex(false);
    window.__veiculos!.balao('policia', null);
  });

  // mecânica, com o táxi e o ônibus azul da família
  const [tx, tz] = [ox + 34, L];
  await page.evaluate(([x, z]) => window.__veiculos!.mover('taxi', x, z, 0), [tx, tz] as const);
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
