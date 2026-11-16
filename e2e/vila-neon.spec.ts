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
import { ROTEIRO } from '../src/jogo/show';

/**
 * Spec 026 (Vila Neon, parte 1): as três missões de ponta a ponta, como uma criança: escolhe no
 * quadro, segue as pegadinhas com o joystick de verdade e toca onde precisa.
 * - f1: os três estojos (rua, pista, festival) → 4 moedinhas;
 * - f2: o feno aparece na mão perto das lhamas, e elas seguem até a grade → 5;
 * - f4 (a volta no rinque, 16 nov 2026): as pegadinhas levam ao suporte dos patins, um toque
 *   calça, e depois a cada arco de neon da pista; passar por dentro dos três → 6, com a festa.
 * Fotos (e quadros de vídeo com VILA_VIDEO=1) em VILA_PASTA.
 */
declare const process: { env: Record<string, string | undefined> };
const PASTA = process.env.VILA_PASTA ?? 'test-results/vila-neon';
const VIDEO = !!process.env.VILA_VIDEO;
mkdirSync(PASTA, { recursive: true });

/** Quando cada página nasceu (o vídeo do Playwright começa ali). */
const nasceu = new WeakMap<Page, number>();

async function abrir(browser: Browser, id: string, tamanho: Tamanho): Promise<Page> {
  const t0 = Date.now();
  const page = await abrirMundo(browser, {
    id,
    tema: 'vila-neon',
    tamanho,
    video: VIDEO ? `${PASTA}/video-${id}` : undefined,
  });
  nasceu.set(page, t0);
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

async function escolher(page: Page, id: string, foto?: string): Promise<void> {
  await page
    .waitForFunction(() => !document.body.dataset.overlay, undefined, { timeout: 15_000 })
    .catch(() => undefined);
  await escolherNaRoda(page, 'missoes');
  await page.waitForSelector('[data-alma-quadro]', { timeout: 20_000 });
  await page.waitForTimeout(800);
  if (foto) {
    await page
      .locator(`[data-missao="${id}"]`)
      .scrollIntoViewIfNeeded()
      .catch(() => undefined);
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${PASTA}/${foto}` });
  }
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
  // o vídeo é o da página (o Playwright grava com a interface); aqui vai o som do jogo de
  // verdade e onde o trecho começa no vídeo
  // (o som do jogo só existe depois do primeiro toque: espera ele nascer e anota quando a
  // gravação começou de verdade, para casar com o vídeo)
  const som = page
    .evaluate(async () => {
      const e = window.__brumaluz!;
      const w = window as unknown as { __somInicio?: number };
      for (let i = 0; i < 1500; i++) {
        const t = Date.now();
        const p = e.gravarSom?.(900) ?? Promise.resolve(null);
        const r = await Promise.race([
          p,
          new Promise((ok) => setTimeout(() => ok('gravando'), 250)),
        ]);
        if (r === 'gravando') {
          w.__somInicio = t;
          return await p;
        }
        if (r) return r as Awaited<typeof p>;
        await new Promise((ok) => setTimeout(ok, 200));
      }
      return null;
    })
    .catch(() => null);
  const inicio = (Date.now() - (nasceu.get(page) ?? Date.now())) / 1000;
  return async () => {
    const t0 = nasceu.get(page) ?? Date.now();
    const fim = (Date.now() - t0) / 1000;
    const somT = await page.evaluate(
      () => (window as unknown as { __somInicio?: number }).__somInicio ?? 0,
    );
    writeFileSync(
      `${dir}/trecho.json`,
      JSON.stringify({ inicio, fim, som: somT ? (somT - t0) / 1000 : inicio }),
    );
    await page.evaluate(() => window.__brumaluz!.pararSom?.()).catch(() => undefined);
    const r = await som;
    if (!r) return void console.log(`vila: ${nome} sem som`);
    const l = Buffer.from(r.l, 'base64');
    const rr = Buffer.from(r.r, 'base64');
    const n = Math.min(l.length, rr.length) / 2;
    const b = Buffer.alloc(44 + n * 4);
    b.write('RIFF', 0);
    b.writeUInt32LE(36 + n * 4, 4);
    b.write('WAVE', 8);
    b.write('fmt ', 12);
    b.writeUInt32LE(16, 16);
    b.writeUInt16LE(1, 20);
    b.writeUInt16LE(2, 22);
    b.writeUInt32LE(r.taxa, 24);
    b.writeUInt32LE(r.taxa * 4, 28);
    b.writeUInt16LE(4, 32);
    b.writeUInt16LE(16, 34);
    b.write('data', 36);
    b.writeUInt32LE(n * 4, 40);
    for (let k = 0; k < n; k++) {
      b.writeInt16LE(l.readInt16LE(k * 2), 44 + k * 4);
      b.writeInt16LE(rr.readInt16LE(k * 2), 46 + k * 4);
    }
    writeFileSync(`${dir}/som.wav`, b as unknown as string);
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

/**
 * f4: as pegadinhas levam ao suporte dos patins; a criança toca nele (calça); depois a cada arco
 * apagado, até a festa. Devolve quantas vezes os arcos piscaram (passou por dentro).
 */
async function f4(page: Page, pre: string): Promise<{ arcos: number }> {
  for (let volta = 0; volta < 10 && !(await temFesta(page)); volta++) {
    const r = await andarPelaTrilha(page, 60_000);
    console.log(`vila: f4 trilha ${r.alvo} chegou=${r.chegou} ${r.s.toFixed(1)} s`);
    if (r.alvo === 'patins') {
      // o toque no suporte calça os patins (como a criança: o dedo em cima dele)
      await page.waitForTimeout(800);
      const t = await page.evaluate(() => {
        const e = window.__brumaluz!;
        const [x, y, z] = e.vila!()!.pontos.patins;
        return e.telaDoPonto!(x, y + 1, z);
      });
      expect(t).not.toBeNull();
      await page.touchscreen.tap(t!.x, t!.y);
      await page.waitForFunction(
        () => !!window.__brumaluz!.personagem?.aparencia().patins,
        undefined,
        {
          timeout: 8000,
        },
      );
      await page.waitForTimeout(1200);
      await page.screenshot({ path: `${PASTA}/${pre}-f4-patins.png` });
    } else {
      await page.waitForTimeout(900);
      if (volta === 1) await page.screenshot({ path: `${PASTA}/${pre}-f4-arco.png` });
    }
  }
  const arcos = await page.evaluate(
    () => (window.__brumaluz!.eventosVila ?? []).filter((e) => e.e === 'vilaArco').length,
  );
  return { arcos };
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
  await escolher(page, 'f4', 'deitado-f4-quadro.png');
  const r = await f4(page, 'deitado');
  await festa(page, 'deitado-f4-festa.png');
  expect(r.arcos).toBeGreaterThanOrEqual(3);
  console.log(`vila: f4 em ${((Date.now() - t0) / 1000).toFixed(0)} s, arcos ${r.arcos}`);
  await parar();
  const depois = await moedasReais(page);
  console.log(`vila: moedinhas ${antes} -> ${depois}`);
  expect(depois - antes).toBeGreaterThanOrEqual(15);
  await page.context().close();
});

for (const id of ['f1', 'f2', 'f4'] as const)
  test(`Vila Neon, em pé: ${id} do brincar à festa`, async ({ browser }) => {
    test.setTimeout(600_000);
    const page = await abrir(browser, `vila-empe-${id}`, 'empe');
    // a f4 abre depois de uma das duas primeiras
    if (id === 'f4') {
      await escolher(page, 'f1');
      await f1(page, 'empe-antes');
      await festa(page);
    }
    const parar = await filmar(page, `empe-${id}`);
    await escolher(page, id, `empe-${id}-quadro.png`);
    if (id === 'f1') await f1(page, 'empe');
    else if (id === 'f2') await f2(page, 'empe');
    else await f4(page, 'empe');
    await festa(page, `empe-${id}-festa.png`);
    await parar();
    await page.context().close();
  });

/**
 * O que o dono viu (15 nov 2026, iPhone): "fiz todas as missões, mas o show não começou; a galera
 * só ficava ali em rodas, só saía som de passarinho". Agora: a f1 e a f2 feitas, a criança na
 * grade da plateia, o relógio de verdade correndo até a noite, e ninguém toca em nada: as caixas
 * acendem uma a uma, a banda toca, a turma vai para a grade e dança, a natureza baixa.
 */
test('Vila Neon, deitado: de noite no festival, sem tocar em nada, o show começa sozinho', async ({
  browser,
}) => {
  test.setTimeout(600_000);
  const page = await abrirMundo(browser, {
    id: 'vila-show-sozinho',
    tema: 'vila-neon',
    tamanho: 'deitado',
    extras: { alma: { local: { feitas: ['f1', 'f2'] } } },
  });
  await page.addStyleTag({ content: '.dica-mira { display: none !important; }' });
  await assentar(page);
  await page.waitForFunction(() => !!window.__vila, undefined, { timeout: 30_000 });
  // o primeiro toque liga o som (no céu, longe de tudo)
  await page.touchscreen.tap(420, 60);
  const pl = await page.evaluate(() => window.__brumaluz!.vila!()!.pontos.plateia);
  await page.evaluate((g) => {
    const e = window.__brumaluz!;
    e.teleportar!((g.x0 + g.x1) / 2 + 0.5, g.z1 - 1.5);
    e.apontar!(0, 0.12);
    // o fim da tarde, e o relógio de verdade correndo (a noite chega sozinha)
    e.hora = 0.725;
    e.pausarDia = false;
  }, pl);
  await page.waitForTimeout(4000);
  await page.screenshot({ path: `${PASTA}/sozinho-entardecer.png` });
  expect(await page.evaluate(() => window.__brumaluz!.vilaEstado!()?.show ?? null)).toBeNull();
  // a noite chega; nenhum toque: espera o show (a noite aberta há uns 20 s, e uma folga)
  const t0 = Date.now();
  await page.waitForFunction(() => !!window.__brumaluz!.vilaEstado!()?.show, undefined, {
    timeout: 120_000,
  });
  console.log(`vila: show sozinho depois de ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  const acesas = await page.evaluate(() =>
    (window.__brumaluz!.eventosVila ?? [])
      .filter((e) => e.e === 'vilaCaixa')
      .map((e) => `${(e as { i: number }).i}:${e.quem}`),
  );
  expect(acesas).toEqual(['0:auto', '1:auto', '2:auto']);
  // a abertura e a entrada (uns 38 s); a turma vai para a grade; depois, a primeira música
  await page.waitForTimeout(16_000);
  await page.evaluate((s) => window.__brumaluz!.pularShow!(s), ROTEIRO[0].inicio + 4);
  await page.waitForTimeout(3000);
  await page.screenshot({ path: `${PASTA}/sozinho-show.png` });
  const r = await page.evaluate(() => {
    const e = window.__brumaluz!;
    const som = e.somVila?.();
    const nos = e.cenaBabylon!().transformNodes.filter((n) =>
      /^morador-\d+-junta-bracoD$/.test(n.name),
    );
    return {
      fase: window.__vila!.show(),
      som: som ? { show: !!som.show, calarNatureza: som.calarNatureza, pronto: som.pronto } : null,
      bracos: nos.map((n) => Math.round(Math.abs(n.rotation.z) * 100) / 100),
    };
  });
  console.log(`vila: show sozinho ${JSON.stringify(r)}`);
  expect(r.fase).toBe('tocando');
  // a turma dança (de verdade, nas juntas): uns de braço para o alto
  expect(r.bracos.filter((b) => b > 2).length).toBeGreaterThanOrEqual(5);
  if (r.som?.pronto) {
    expect(r.som.show).toBe(true);
    expect(r.som.calarNatureza).toBeGreaterThan(0.5);
  }
  // nenhum bicho solto no festival, e ninguém chama por cima da música
  const bichos = await page.evaluate(() => {
    const e = window.__brumaluz!;
    const f = e.vila!()!.zonas.festival;
    return (e.criaturas?.() ?? []).filter(
      (c) =>
        !(c as { profissao?: string }).profissao &&
        (c as { tipo?: string }).tipo !== 'cervo' &&
        c.x >= f.x0 &&
        c.x <= f.x1 + 1 &&
        c.z >= f.z0 &&
        c.z <= f.z1 + 1,
    ).length;
  });
  expect(bichos).toBe(0);
  expect(await page.evaluate(() => window.__brumaluz!.silencioDoShow?.() ?? false)).toBe(true);
  await page.context().close();
});
