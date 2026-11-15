import { expect, test, type Browser, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import {
  abrirMundo,
  andarPelaTrilha,
  assentar,
  escolherNaRoda,
  tocar,
  type Tamanho,
} from './guia-palco';

/**
 * Spec 026 (Vila Neon, parte 1): as três missões de ponta a ponta, como uma criança: escolhe no
 * quadro, segue as pegadinhas com o joystick de verdade e toca onde a mãozinha mostra.
 * - f1: os três estojos (rua, pista, festival) → 4 moedinhas;
 * - f2: o feno aparece na mão perto das lhamas, e elas seguem até a grade → 5;
 * - f3: sobe a escadinha, acende as três caixas, o show começa e o toque do chamado dispara o
 *   acorde final → 6, com a festa depois do acorde.
 * Fotos (e quadros de vídeo com VILA_VIDEO=1) em VILA_PASTA.
 */
declare const process: { env: Record<string, string | undefined> };
const PASTA = process.env.VILA_PASTA ?? 'test-results/vila-neon';
const VIDEO = !!process.env.VILA_VIDEO;
mkdirSync(PASTA, { recursive: true });

async function abrir(browser: Browser, id: string, tamanho: Tamanho): Promise<Page> {
  const page = await abrirMundo(browser, { id, tema: 'vila-neon', tamanho });
  await page.addStyleTag({ content: '.dica-mira { display: none !important; }' });
  await assentar(page);
  await page.waitForFunction(() => !!window.__guia && !!window.__vila, undefined, {
    timeout: 30_000,
  });
  await page.waitForTimeout(1500);
  return page;
}

const moedasReais = (page: Page) =>
  page.evaluate(
    () =>
      (window as unknown as { __almaCrianca: { perfil: { moedas: number } } }).__almaCrianca.perfil
        .moedas,
  );

async function escolher(page: Page, id: string): Promise<void> {
  await page
    .waitForFunction(() => !document.body.dataset.overlay, undefined, { timeout: 15_000 })
    .catch(() => undefined);
  await escolherNaRoda(page, 'missoes');
  await page.waitForSelector('[data-alma-quadro]', { timeout: 20_000 });
  await page.waitForTimeout(800);
  await tocar(page, `[data-alma-jogar="${id}"]`);
  await page.waitForTimeout(2500);
}

async function festa(page: Page, foto?: string, teto = 40_000): Promise<void> {
  await page.waitForSelector('[data-alma-festa]', { timeout: teto });
  await page.waitForTimeout(2200);
  if (foto) await page.screenshot({ path: `${PASTA}/${foto}` });
  let livre = 0;
  for (let k = 0; k < 20 && livre < 3; k++) {
    await page.waitForTimeout(700);
    const ok = page.locator('[data-alma-festa] [data-alma-oba], [data-alma-festa] button');
    if (await ok.count()) {
      livre = 0;
      await ok
        .first()
        .tap()
        .catch(() => undefined);
      await page.waitForTimeout(900);
    } else if (!(await page.locator('[data-alma-festa]').count())) livre++;
  }
  await page.waitForTimeout(600);
}

const temFesta = (page: Page) =>
  page
    .locator('[data-alma-festa]')
    .count()
    .then((n) => n > 0);

async function filmar(page: Page, nome: string) {
  if (!VIDEO) return async () => undefined;
  const dir = `${PASTA}/quadros-${nome}`;
  mkdirSync(dir, { recursive: true });
  const t0 = Date.now();
  let vivo = true;
  let i = 0;
  const tempos: number[] = [];
  const laco = (async () => {
    while (vivo) {
      const t = Date.now();
      await page
        .screenshot({ path: `${dir}/${String(i).padStart(5, '0')}.jpg`, type: 'jpeg', quality: 82 })
        .then(() => tempos.push(Date.now() - t0))
        .then(() => i++)
        .catch(() => undefined);
      await page.waitForTimeout(Math.max(0, 125 - (Date.now() - t))).catch(() => undefined);
    }
  })();
  return async () => {
    vivo = false;
    await laco;
    writeFileSync(`${dir}/tempos.json`, JSON.stringify(tempos));
  };
}

/** f1: anda até cada estojo (ele vem sozinho), até a festa. */
async function f1(page: Page, pre: string): Promise<void> {
  for (let volta = 0; volta < 8 && !(await temFesta(page)); volta++) {
    const r = await andarPelaTrilha(page, 60_000);
    console.log(`vila: f1 trilha ${r.alvo} chegou=${r.chegou} ${r.s.toFixed(1)} s`);
    await page.waitForTimeout(1500);
    if (volta === 0) await page.screenshot({ path: `${PASTA}/${pre}-f1-estojo.png` });
  }
}

/** f2: até a lhama (o feno aparece na mão), depois até a grade; as lhamas vêm atrás. */
async function f2(page: Page, pre: string): Promise<void> {
  for (let volta = 0; volta < 8 && !(await temFesta(page)); volta++) {
    const r = await andarPelaTrilha(page, 60_000);
    console.log(`vila: f2 trilha ${r.alvo} chegou=${r.chegou} ${r.s.toFixed(1)} s`);
    if (r.alvo === 'grade') {
      // espera as lhamas chegarem atrás do feno (sem mexer)
      await page.waitForSelector('[data-alma-festa]', { timeout: 20_000 }).catch(() => undefined);
      await page.screenshot({ path: `${PASTA}/${pre}-f2-grade.png` });
    } else await page.waitForTimeout(1500);
  }
}

/** f3: sobe ao palco, acende as caixas pela mãozinha; no show, toca; no chamado, o final. */
async function f3(page: Page, pre: string): Promise<{ toques: number; finalQuem: string }> {
  let toques = 0;
  for (let volta = 0; volta < 10; volta++) {
    const acesas = await page.evaluate(() => window.__brumaluz!.vilaEstado?.()?.cx ?? []);
    if (acesas.every(Boolean) && acesas.length === 3) break;
    const r = await andarPelaTrilha(page, 60_000);
    console.log(`vila: f3 trilha ${r.alvo} chegou=${r.chegou} ${r.s.toFixed(1)} s`);
    // a mãozinha aponta a caixa apagada; a criança toca nela
    const m = await page
      .waitForFunction(() => window.__vila!.mao(), undefined, { timeout: 4000 })
      .then((h) => h.jsonValue() as Promise<{ x: number; y: number } | null>)
      .catch(() => null);
    if (!m) continue;
    if (toques === 0) await page.screenshot({ path: `${PASTA}/${pre}-f3-mao.png` });
    await page.touchscreen.tap(m.x, m.y);
    toques++;
    await page.waitForTimeout(1200);
  }
  // o show: a criança toca algumas vezes (qualquer toque toca um acorde)
  const v = page.viewportSize()!;
  await page.waitForTimeout(3000);
  await page.screenshot({ path: `${PASTA}/${pre}-f3-show.png` });
  for (let k = 0; k < 6; k++) {
    await page.touchscreen.tap(v.width * 0.5, v.height * 0.4);
    await page.waitForTimeout(700);
  }
  const acordes = await page.evaluate(
    () => (window.__brumaluz!.eventosVila ?? []).filter((e) => e.e === 'vilaAcorde').length,
  );
  console.log(`vila: acordes tocados ${acordes}`);
  expect(acordes).toBeGreaterThanOrEqual(3);
  // o chamado: espera o palco chamar e toca
  await page.waitForFunction(() => window.__vila!.show() === 'chamando', undefined, {
    timeout: 60_000,
  });
  await page.waitForTimeout(800);
  await page.touchscreen.tap(v.width * 0.5, v.height * 0.4);
  const fim = await page
    .waitForFunction(
      () => (window.__brumaluz!.eventosVila ?? []).find((e) => e.e === 'vilaFinal'),
      undefined,
      { timeout: 8000 },
    )
    .then((h) => h.jsonValue() as Promise<{ quem: string }>);
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${PASTA}/${pre}-f3-acorde-final.png` });
  return { toques, finalQuem: fim.quem };
}

test('Vila Neon, deitado: as três missões de ponta a ponta, com moedinhas de verdade', async ({
  browser,
}) => {
  test.setTimeout(900_000);
  const page = await abrir(browser, 'vila-missoes-deitado', 'deitado');
  const antes = await moedasReais(page);
  const parar = await filmar(page, 'deitado');
  let t0 = Date.now();
  await escolher(page, 'f1');
  await f1(page, 'deitado');
  await festa(page, 'deitado-f1-festa.png');
  console.log(`vila: f1 em ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  t0 = Date.now();
  await escolher(page, 'f2');
  await f2(page, 'deitado');
  await festa(page, 'deitado-f2-festa.png');
  console.log(`vila: f2 em ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  t0 = Date.now();
  await escolher(page, 'f3');
  const r = await f3(page, 'deitado');
  expect(r.finalQuem).not.toBe('auto');
  await festa(page, 'deitado-f3-festa.png');
  console.log(`vila: f3 em ${((Date.now() - t0) / 1000).toFixed(0)} s, toques ${r.toques}`);
  await parar();
  const depois = await moedasReais(page);
  console.log(`vila: moedinhas ${antes} -> ${depois}`);
  expect(depois - antes).toBeGreaterThanOrEqual(15);
  await page.context().close();
});

for (const id of ['f1', 'f2', 'f3'] as const)
  test(`Vila Neon, em pé: ${id} do brincar à festa`, async ({ browser }) => {
    test.setTimeout(600_000);
    const page = await abrir(browser, `vila-empe-${id}`, 'empe');
    // a f3 abre depois de uma das duas primeiras
    if (id === 'f3') {
      await escolher(page, 'f1');
      await f1(page, 'empe-antes');
      await festa(page);
    }
    const parar = await filmar(page, `empe-${id}`);
    await escolher(page, id);
    if (id === 'f1') await f1(page, 'empe');
    else if (id === 'f2') await f2(page, 'empe');
    else await f3(page, 'empe');
    await festa(page, `empe-${id}-festa.png`);
    await parar();
    await page.context().close();
  });
