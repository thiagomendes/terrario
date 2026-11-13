import { test, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { abrirPalco, camera, pontosDoPalco, type V3 } from './esboco-palco';

/**
 * Esboço do tamanho dos veículos (014, ajustes): o dono achou o táxi e o ônibus pequenos perto
 * da criança. No palco da cidade (`?esboco=veiculos`), com os veículos aprovados (versão 3), a
 * mesma cena em cada opção: a criança ao lado do táxi, ao lado do ônibus e a rua, no computador
 * e no celular. Nada disto muda o jogo.
 *
 * - hoje: o tamanho do jogo (carro 0,9 do esboço, ônibus 0,75), ruas de hoje;
 * - A: tudo 1,3 vez maior, ruas de hoje (faixa de 2 blocos);
 * - B: faixas de 3 blocos (asfalto de 6), carro 1,6 vez e ônibus 1,8 vez o de hoje;
 * - C: ruas de hoje, carro 1,2 vez e o ônibus alto (dois andares), o dobro da criança.
 *
 * Só com ESBOCO_TAMANHOS=1: E2E_ENV="-e ESBOCO_TAMANHOS=1" scripts/e2e-gpu.sh e2e/esboco-tamanhos.spec.ts
 */
declare const process: { env: Record<string, string | undefined> };
test.skip(!process.env.ESBOCO_TAMANHOS, 'capturas do esboço só com ESBOCO_TAMANHOS');
const PASTA = process.env.TAMANHOS_PASTA ?? 'capturas-temas/esboco-tamanhos';
const foto = (page: Page, nome: string) =>
  page.screenshot({ path: `${PASTA}/${nome}.jpg`, type: 'jpeg', quality: 86 });

type Qual =
  | 'taxi'
  | 'onibus'
  | 'extra'
  | 'policia'
  | 'civil1'
  | 'civil2'
  | 'civil3'
  | 'civil4'
  | 'onibus2';

interface Opcao {
  nome: string;
  /** Escala da carroceria do esboço (o jogo de hoje: carro 0,9, ônibus 0,75, sorvete 0,86). */
  carro: number;
  onibus: [number, number];
  sorvete: number;
  /** Asfalto de 6 (faixas de 3) em vez de 4. */
  larga: boolean;
}

const OPCOES: Opcao[] = [
  { nome: 'hoje', carro: 0.9, onibus: [0.75, 0.75], sorvete: 0.86, larga: false },
  { nome: 'A', carro: 1.17, onibus: [0.975, 0.975], sorvete: 1.12, larga: false },
  { nome: 'B', carro: 1.44, onibus: [1.35, 1.35], sorvete: 1.38, larga: true },
  { nome: 'C', carro: 1.08, onibus: [0.9, 1.42], sorvete: 1.03, larga: false },
];

const CARROS: Qual[] = ['taxi', 'policia', 'civil1', 'civil2', 'civil3', 'civil4'];
/** Meio comprimento da carroceria do esboço (escala 1): carro, ônibus. */
const MEIO = { carro: 1.46, onibus: 2.78 };

async function escalar(page: Page, o: Opcao) {
  await page.evaluate(
    ([carros, c, ob, sv]) => {
      const v = window.__veiculos!;
      for (const q of carros) v.escalar(q as 'taxi', c);
      v.escalar('onibus', ob[0], ob[1]);
      v.escalar('onibus2', ob[0], ob[1]);
      v.escalar('extra', sv);
    },
    [CARROS, o.carro, o.onibus, o.sorvete] as const,
  );
}

/**
 * A avenida do palco (asfalto nas fileiras 32 a 35, calçadas de 4) com asfalto de 6 (31 a 36,
 * calçadas de 3) ou de volta ao de hoje. A faixa amarela fica no meio nas duas.
 */
async function avenida(page: Page, larga: boolean) {
  await page.evaluate((larga) => {
    const e = window.__brumaluz!;
    const [ox, Y, oz] = window.__esboco!.pontos.origem;
    const asfalto = e.bloco!(ox + 2, Y, oz + 34);
    const calcada = e.bloco!(ox + 2, Y, oz + 29);
    const lote: { x: number; y: number; z: number; v: number }[] = [];
    for (let x = 0; x < 120; x++) {
      if (x >= 57 && x <= 68) continue;
      for (const z of [31, 36])
        lote.push({ x: ox + x, y: Y, z: oz + z, v: larga ? asfalto : calcada });
    }
    e.editarLote!(lote);
  }, larga);
  await page.waitForTimeout(2500);
}

async function por(page: Page, lista: [Qual, number, number, number][]) {
  await page.evaluate((l) => {
    for (const [q, x, z, yaw] of l) window.__veiculos!.mover(q as 'taxi', x, z, yaw);
  }, lista);
}

test('esboço do tamanho dos veículos', async ({ page }) => {
  test.setTimeout(1_500_000);
  mkdirSync(PASTA, { recursive: true });
  await abrirPalco(page, 1280, 720, 'veiculos');
  await page.waitForFunction(() => !!window.__veiculos, undefined, { timeout: 60_000 });
  // os veículos provisórios do palco (de antes do esboço dos veículos) saem
  await page.evaluate(() => {
    const nomes = new Set([
      'taxi',
      'taxi-cabine',
      'taxi-teto',
      'taxi-luz',
      'taxi-xadrez',
      'farol',
      'roda',
      'calota',
      'onibus',
      'onibus-vidros',
      'coluna',
      'onibus-teto',
      'porta-onibus',
    ]);
    const cena = window.__brumaluz!.cenaBabylon!();
    for (const m of [...cena.meshes]) if (nomes.has(m.name)) m.dispose();
  });
  await page.evaluate(() => window.__veiculos!.frota());
  await page.waitForTimeout(1500);
  const pt = await pontosDoPalco(page);
  const [ox, oy, oz] = pt.origem;
  const Y = oy + 1;
  const medidas: Record<string, unknown> = {};
  for (const tela of ['computador', 'celular'] as const) {
    const cel = tela === 'celular';
    await page.setViewportSize(cel ? { width: 412, height: 860 } : { width: 1280, height: 720 });
    await page.evaluate(() => {
      window.dispatchEvent(new Event('resize'));
      window.__brumaluz!.cenaBabylon!().getEngine().resize();
    });
    await page.waitForTimeout(1500);
    // no celular em pé o campo de visão fixo é o da largura (o que cabe de lado a lado)
    await page.evaluate((c) => {
      const cam = window.__brumaluz!.cenaBabylon!().activeCamera!;
      cam.fovMode = c ? 1 : 0;
    }, cel);
    const fov = cel ? 62 : 50;
    for (const o of OPCOES) {
      await escalar(page, o);
      await avenida(page, o.larga);
      const L = oz + (o.larga ? 35.5 : 35.0);
      const O = oz + (o.larga ? 32.5 : 33.0);
      const kz = oz + (o.larga ? 37.6 : 36.7);
      const longe = ox - 400;
      const mc = MEIO.carro * o.carro;
      const mo = MEIO.onibus * o.onibus[0];
      // 1. a criança de pé na faixa, logo à frente do táxi, na mesma linha (o mesmo tanto da
      // câmera, que olha de lado, do outro lado da rua): a comparação de tamanho é justa
      const tx = ox + 80;
      await por(page, [
        ['taxi', tx, L, 0],
        ['onibus', longe, O, 0],
        ['onibus2', longe - 20, O, 0],
        ['policia', longe - 40, L, 0],
        ['civil1', longe - 60, L, 0],
        ['civil2', longe - 80, L, 0],
        ['civil3', longe - 100, L, 0],
        ['civil4', longe - 120, L, 0],
        ['extra', longe - 140, L, 0],
      ]);
      const kx = tx + mc + 0.8;
      await page.evaluate(([x, z]) => window.__esboco!.crianca(x, z, [x, z - 10], false), [
        kx,
        L,
      ] as const);
      await page.waitForTimeout(1200);
      const mt = (tx - mc + kx + 0.5) / 2;
      await camera(
        page,
        [mt, Y + 1.5, L - (cel ? 0.81 * (2 * mc + 2.5) : 7.5)],
        [mt, Y + 1.1, L],
        fov,
      );
      await foto(page, `${tela}-${o.nome}-taxi`);
      // 2. ao lado do ônibus
      const bx = ox + 80;
      await por(page, [
        ['taxi', longe, L, 0],
        ['onibus', bx, L, 0],
      ]);
      const kbx = bx + mo + 0.8;
      await page.evaluate(([x, z]) => window.__esboco!.crianca(x, z, [x, z - 10], false), [
        kbx,
        L,
      ] as const);
      await page.waitForTimeout(1200);
      const mb = (bx - mo + kbx + 0.5) / 2;
      await camera(
        page,
        [mb, Y + 1.8, cel ? L - 0.81 * (2 * mo + 2.5) : L - 8 - mo * 0.9],
        [mb, Y + 1.4, L],
        fov,
      );
      await foto(page, `${tela}-${o.nome}-onibus`);
      // 3. a rua: a criança na calçada olhando a avenida, os carros nas duas mãos
      await por(page, [
        ['taxi', ox + 82, L, 0],
        ['civil1', ox + 95, L, 0],
        ['policia', ox + 108, L, 0],
        ['onibus', ox + 92, O, Math.PI],
        ['civil2', ox + 104, O, Math.PI],
        ['extra', ox + 114, O, Math.PI],
      ]);
      await page.evaluate(([x, z]) => window.__esboco!.crianca(x, z, [x + 10, z - 2], false), [
        ox + 75,
        kz,
      ] as const);
      await page.waitForTimeout(1200);
      await camera(page, [ox + 69, Y + 3.0, kz + 0.2], [ox + 88, Y + 1.0, oz + 34], cel ? 62 : 58);
      await foto(page, `${tela}-${o.nome}-rua`);
      if (!cel) medidas[o.nome] = await page.evaluate(() => window.__veiculos!.medir());
    }
  }
  writeFileSync(`${PASTA}/medidas.json`, JSON.stringify(medidas, null, 1));
  await avenida(page, false);
});
