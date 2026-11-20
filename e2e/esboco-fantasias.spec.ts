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
      // (de noite, a tomada própria da noite quando há: a rua e o panorama olham para a lua)
      const tm = (qual === 'noite' && tomadas[`${nome}Noite`] ? tomadas[`${nome}Noite`] : tomadas[nome])[tipo];
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

/**
 * Parte 2: os moradores fantasiados (os cinco lado a lado na praça e cada um no seu lugar) e
 * os bichos, de tarde e de noite, com a animação parada num instante bonito.
 */
const FOTOS_GENTE: Array<[string, string]> = [
  ['10-moradores-fila', 'morador-fila'],
  ['11-vovo-tufinho', 'morador-vovo'],
  ['12-dudu-bosque', 'morador-dudu'],
  ['13-lulu-espiando', 'morador-lulu'],
  ['14-bento-palco', 'morador-bento'],
  ['15-jeronimo-horta', 'morador-jeronimo'],
  ['16-bichos-morcegos', 'bicho-morcegos'],
  ['16-bichos-fantasminhas', 'bicho-fantasminhas'],
  ['16-bichos-abobrinhas', 'bicho-abobrinhas'],
  ['16-bichos-tufinho', 'bicho-tufinho'],
  // (só para conferir a gola da capa por trás: não vai para o dono)
  ...(process.env.FANTASIAS_DEBUG ? [['99-debug-dudu-costas', 'morador-duduCostas'] as [string, string]] : []),
];

async function fotografarGente(page: Page, t: Tamanho) {
  await page.waitForFunction(() => window.__fantasias!.gentePronta(), undefined, { timeout: 60_000 });
  await page.evaluate(() => {
    window.__fantasias!.animar(false);
    window.__fantasias!.fovFixo(true);
  });
  const tomadas = await page.evaluate(() => window.__fantasias!.tomadas);
  const tipo = t === 'empe' ? 'empe' : 'deitado';
  const so = process.env.FANTASIAS_SO?.split(',');
  for (const [qual, h] of [
    ['entardecer', ENTARDECER],
    ['noite', NOITE],
  ] as const) {
    await hora(page, h);
    await page.waitForTimeout(2000);
    for (const [nome, tomada] of FOTOS_GENTE) {
      if (so && !so.some((s) => nome.includes(s))) continue;
      const fila = tomada === 'morador-fila';
      await page.evaluate((f) => window.__fantasias!.moradores(f ? 'fila' : 'lugares'), fila);
      const tm = tomadas[tomada][tipo];
      await camera(page, tm.pos, tm.alvo, tm.fov);
      await foto(page, `${nome}-${qual}-${t}`);
    }
  }
  await page.evaluate(() => window.__fantasias!.moradores('lugares'));
}

for (const t of ['empe', 'deitado', 'pc'] as const)
  test(`moradores e bichos da Noite das Fantasias: ${t}`, async ({ browser }) => {
    test.setTimeout(900_000);
    const page = await abrirPalco(browser, t);
    await fotografarGente(page, t);
    passo(`fotos da gente ${t}`);
    await page.context().close();
  });

for (const t of ['empe', 'deitado', 'pc'] as const)
  test(`esboço da Noite das Fantasias: ${t}`, async ({ browser }) => {
    test.setTimeout(900_000);
    const page = await abrirPalco(browser, t);
    await fotografar(page, t);
    passo(`fotos ${t}`);
    await page.context().close();
  });
