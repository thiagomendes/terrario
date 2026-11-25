import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { test, expect, type Browser, type Page } from '@playwright/test';
import { comecarGravacao, pararGravacao } from './gravarCena';

/**
 * Spec 037 (T04): o braço, a mão e os itens da primeira pessoa, como código de verdade
 * (`src/render/bracoPrimeiraPessoa.ts`), com a câmera de verdade da T03 (`primeiraPessoa.ts`,
 * ligada pelo olhinho da roda; aqui, direto pela `primeiraPessoa.ligar`). Fora da suíte: as fotos, o vídeo, a folha dos
 * itens e as conferências (o item sai da tela na volta, o "não" curtinho, o ombro fora).
 *
 *   T04=fotos   (em pé, deitado e no computador, de dia e de noite; a volta e o "não")
 *   T04=video   (o vídeo em pé)
 *   T04=itens   (a folha dos itens na mão)
 */
declare const process: { env: Record<string, string | undefined> };
const MODO = process.env.T04;
const PASTA = 'capturas-037/t04';
test.skip(!MODO, 'T04 só com T04');
test.describe.configure({ mode: 'serial' });
test.setTimeout(1_200_000);

async function abrir(browser: Browser, w: number, h: number, toque = true, hora = 0.42) {
  const ctx = await browser.newContext({
    viewport: { width: w, height: h },
    hasTouch: toque,
    isMobile: toque,
    deviceScaleFactor: toque ? 2 : 1,
  });
  const page = await ctx.newPage();
  page.on('pageerror', (err) => console.log('erro na página:', String(err)));
  await page.goto('/');
  await page.waitForFunction(
    () => window.__brumaluz?.ready === true && !!window.__brumaluz.primeiraPessoa,
    undefined,
    { timeout: 180_000 },
  );
  await page.evaluate(
    ([hora, toque]) => {
      document.querySelector('.entrada')?.setAttribute('hidden', '');
      document.body.classList.remove('tela-titulo');
      if (toque) document.body.classList.add('toque-ativo');
      const e = window.__brumaluz!;
      e.pausarDia = true;
      e.hora = hora as number;
      e.definirClima?.('limpo');
      e.inventario!.definir(0, null);
      e.inventario!.definir(1, { item: 'bloco:7', qtd: 64 });
      e.inventario!.definir(2, { item: 'picareta_pedra', qtd: 1 });
      e.inventario!.definir(3, { item: 'maca', qtd: 8 });
      e.inventario!.definir(4, { item: 'enxada_madeira', qtd: 1 });
      e.selecionarSlot!(1);
    },
    [hora, toque] as const,
  );
  let antes = -1;
  for (let i = 0; i < 20; i++) {
    await page.waitForTimeout(1500);
    const n = await page.evaluate(() => window.__brumaluz!.chunksCarregados ?? 0);
    if (n === antes && n > 10) break;
    antes = n;
  }
  return { ctx, page };
}

const olhar = (p: Page, yaw: number, pitch: number) =>
  p.evaluate(([y, pi]) => window.__brumaluz!.apontar!(y, pi), [yaw, pitch] as const);
const slot = (p: Page, i: number) => p.evaluate((i) => window.__brumaluz!.selecionarSlot!(i), i);
const ligarPP = (p: Page, sim: boolean) =>
  p.evaluate((sim) => window.__brumaluz!.primeiraPessoa!.ligar(sim), sim);
const entrar = async (p: Page) => {
  await ligarPP(p, true);
  await p.waitForTimeout(1600);
};
/** O braço de verdade está na tela? (o osso dele e quantas peças acesas tem). */
const bracoAceso = (p: Page) =>
  p.evaluate(() => {
    const s = window.__brumaluz!.cenaBabylon!();
    const osso = s.getTransformNodeByName('pp-braco-osso');
    const pecas = osso ? osso.getChildMeshes(false).filter((m) => m.isEnabled()).length : 0;
    return { osso: !!osso?.isEnabled(), pecas };
  });
/** As peças do item na mão do boneco de verdade, acesas (a terceira pessoa). */
const itemDoBoneco = (p: Page) =>
  p.evaluate(() => {
    const s = window.__brumaluz!.cenaBabylon!();
    const pega = s.getTransformNodeByName('personagem-pega');
    return pega ? pega.getChildMeshes(false).filter((m) => m.isEnabled() && m.isVisible).length : -1;
  });

test('T04: as fotos nas três telas, de dia e de noite; a volta e o "não"', async ({ browser }) => {
  test.skip(MODO !== 'fotos', 'só com T04=fotos');
  mkdirSync(PASTA, { recursive: true });
  const medidas: Record<string, unknown> = {};
  for (const [nome, w, h, toque] of [
    ['em-pe', 390, 844, true],
    ['deitado', 844, 390, true],
    ['computador', 1280, 720, false],
  ] as const)
    for (const [quando, hora] of [
      ['dia', 0.42],
      ['noite', 0.95],
    ] as const) {
      const { ctx, page: p } = await abrir(browser, w, h, toque, hora);
      await olhar(p, 0.6, 0.4);
      await entrar(p);
      await p.waitForTimeout(400);
      await p.screenshot({ path: `${PASTA}/${nome}-${quando}-bloco.png` });
      const braco = await p.evaluate(() => {
        const pp = window.__brumaluz!.primeiraPessoa!;
        return { tela: pp.tela(), custo: pp.custo() };
      });
      if (quando === 'dia') {
        await slot(p, 2);
        await p.waitForTimeout(900);
        await p.screenshot({ path: `${PASTA}/${nome}-${quando}-picareta.png` });
      }
      medidas[`${nome}-${quando}`] = braco;
      if (nome === 'em-pe' && quando === 'dia') {
        // o "não" curtinho: a enxada na pedra da praça (não ara) é uma recusa de colocar
        await slot(p, 4);
        await p.waitForTimeout(900);
        await olhar(p, 0.6, 0.6);
        await p.waitForTimeout(300);
        const giros: number[] = [];
        await p.evaluate(() => {
          const c = window.__brumaluz!.controleDireto!;
          c.mirar(innerWidth * 0.5, innerHeight * 0.55);
          c.tocar();
          c.soltarMira();
        });
        for (let i = 0; i < 8; i++) {
          giros.push(
            await p.evaluate(() => {
              const s = window.__brumaluz!.cenaBabylon!();
              const m = s.getTransformNodeByName('pp-braco-junta-maoD');
              return +(m?.rotationQuaternion?.toEulerAngles().z ?? 0).toFixed(3);
            }),
          );
          await p.waitForTimeout(35);
        }
        medidas.naoDeDentro = { giroDaMao: giros };
        // a volta para a terceira pessoa: o braço e o item saem da tela; o item volta ao boneco
        await slot(p, 1);
        await p.waitForTimeout(900);
        const antesDaVolta = await bracoAceso(p);
        await ligarPP(p, false);
        await p.waitForTimeout(1500);
        const depois = await bracoAceso(p);
        const noBoneco = await itemDoBoneco(p);
        await p.screenshot({ path: `${PASTA}/em-pe-dia-voltou-para-terceira.png` });
        medidas.volta = { antesDaVolta, depois, pecasDoItemNoBoneco: noBoneco };
        console.log('volta', JSON.stringify(medidas.volta));
        expect(antesDaVolta.osso).toBe(true);
        expect(depois.osso).toBe(false);
        expect(noBoneco).toBeGreaterThan(0);
        // o "não" na terceira pessoa: o mesmo balanço no item da mão do boneco
        await slot(p, 4);
        await p.waitForTimeout(600);
        const fora: number[] = [];
        await p.evaluate(() => {
          const c = window.__brumaluz!.controleDireto!;
          c.mirar(innerWidth * 0.5, innerHeight * 0.62);
          c.tocar();
          c.soltarMira();
        });
        for (let i = 0; i < 8; i++) {
          fora.push(
            await p.evaluate(() => {
              const s = window.__brumaluz!.cenaBabylon!();
              return +(s.getTransformNodeByName('personagem-pega')?.rotation.z ?? 0).toFixed(3);
            }),
          );
          await p.waitForTimeout(35);
        }
        medidas.naoDeFora = { giroDoItem: fora };
        console.log('não', JSON.stringify({ dentro: giros, fora }));
        // (o balanço: o giro da mão e o do item variam no "não")
        expect(Math.max(...giros) - Math.min(...giros)).toBeGreaterThan(0.1);
        expect(Math.max(...fora) - Math.min(...fora)).toBeGreaterThan(0.1);
      }
      await ctx.close();
    }
  writeFileSync(`${PASTA}/medidas.json`, JSON.stringify(medidas, null, 1));
});

test('T04: o vídeo em pé', async ({ browser }) => {
  test.skip(MODO !== 'video', 'só com T04=video');
  mkdirSync(PASTA, { recursive: true });
  const { ctx, page: p } = await abrir(browser, 390, 844);
  await olhar(p, 0.6, 0.45);
  await p.waitForTimeout(800);
  await comecarGravacao(p);
  await p.waitForTimeout(400);
  await entrar(p);
  await p.evaluate(() => {
    window.__brumaluz!.primeiraPessoa!.zerarPonta();
    window.__brumaluz!.primeiraPessoa!.zerarRitmo();
  });
  // anda com o bloco
  await p.evaluate(() => window.__brumaluz!.controleDireto!.mover(0.6, 0));
  await p.waitForTimeout(1400);
  await p.evaluate(() => window.__brumaluz!.controleDireto!.mover(0, 0));
  await p.waitForTimeout(500);
  // põe três blocos tocando na tela
  for (const [fx, fy] of [
    [0.45, 0.62],
    [0.6, 0.6],
    [0.5, 0.52],
  ] as const) {
    await p.touchscreen.tap(Math.round(390 * fx), Math.round(844 * fy));
    await p.waitForTimeout(800);
  }
  // segura para quebrar com a picareta
  await slot(p, 2);
  await p.waitForTimeout(900);
  await p.evaluate(() => {
    const c = window.__brumaluz!.controleDireto!;
    c.mirar(innerWidth * 0.5, innerHeight * 0.52);
    c.quebrar(true);
  });
  await p.waitForTimeout(1500);
  await p.evaluate(() => {
    const c = window.__brumaluz!.controleDireto!;
    c.quebrar(false);
    c.soltarMira();
  });
  await p.waitForTimeout(500);
  // pula, acena de mão vazia, come a maçã
  await p.evaluate(() => window.__brumaluz!.controleDireto!.tecla('pular', true));
  await p.waitForTimeout(200);
  await p.evaluate(() => window.__brumaluz!.controleDireto!.tecla('pular', false));
  await p.waitForTimeout(1200);
  await slot(p, 0);
  await p.waitForTimeout(700);
  await p.evaluate(() => window.__brumaluz!.gestos!.fazer('acenar'));
  await p.waitForTimeout(2000);
  await slot(p, 3);
  await p.waitForTimeout(900);
  await p.evaluate(() => window.__brumaluz!.comer!());
  await p.waitForTimeout(3200);
  // volta para a terceira pessoa com o bloco na mão
  await slot(p, 1);
  await p.waitForTimeout(900);
  await ligarPP(p, false);
  await p.waitForTimeout(1600);
  await pararGravacao(p, `${PASTA}/primeira-pessoa-t04.webm`);
  const ponta = await p.evaluate(() => window.__brumaluz!.primeiraPessoa!.ponta());
  const ritmo = await p.evaluate(() => window.__brumaluz!.primeiraPessoa!.ritmo());
  console.log('vídeo', JSON.stringify({ ponta, ritmo }));
  await ctx.close();
  expect(ponta.menorFolgaPx).toBeGreaterThan(0);
  expect(ritmo.empurroes).toBe(ritmo.colocacoes);
  expect(ritmo.balancos).toBe(ritmo.golpes);
});

test('T04: a folha dos itens na mão', async ({ browser }) => {
  test.skip(MODO !== 'itens', 'só com T04=itens');
  const pasta = `${PASTA}/itens`;
  mkdirSync(pasta, { recursive: true });
  const { ctx, page: p } = await abrir(browser, 390, 844);
  await olhar(p, 0.6, 0.15);
  await entrar(p);
  const todos = await p.evaluate(() => window.__brumaluz!.primeiraPessoa!.itens());
  const blocos = [7, 43, 9, 37, 56, 57, 59, 60, 61, 82, 98, 10];
  const lista = [
    ...blocos.map((b) => `bloco:${b}`).filter((id) => todos.some((t) => t.id === id)),
    ...todos.filter((t) => t.tipo !== 'bloco').map((t) => t.id),
  ];
  const feitos: string[] = [];
  const pecas: Record<string, number> = {};
  for (const id of lista) {
    await p.evaluate((id) => {
      const e = window.__brumaluz!;
      e.inventario!.definir(5, { item: id, qtd: 1 });
      e.selecionarSlot!(5);
    }, id);
    await p.waitForTimeout(750);
    const nome = id.replace(/[^a-z0-9_]/gi, '_');
    await p.screenshot({ path: `${pasta}/${nome}.png`, clip: { x: 130, y: 260, width: 260, height: 420 } });
    pecas[id] = await p.evaluate(() => {
      const s = window.__brumaluz!.cenaBabylon!();
      const pega = s.getTransformNodeByName('pp-braco-pega');
      return pega ? pega.getChildMeshes(false).filter((m) => m.isEnabled()).length : -1;
    });
    feitos.push(id);
    await p.evaluate(() => window.__brumaluz!.selecionarSlot!(0));
    await p.waitForTimeout(250);
  }
  console.log('peças por item', JSON.stringify(pecas));
  writeFileSync(`${PASTA}/pecas.json`, JSON.stringify(pecas, null, 1));
  await ctx.close();
  const c2 = await browser.newContext({ viewport: { width: 1600, height: 900 } });
  const f = await c2.newPage();
  const img = (n: string) => `data:image/png;base64,${readFileSync(`${pasta}/${n}.png`, 'base64')}`;
  await f.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>
    body { margin: 0; padding: 12px; background: #f4efe4; font: 600 11px system-ui, sans-serif; color: #333; }
    h1 { font-size: 18px; margin: 0 0 8px; }
    .g { display: grid; grid-template-columns: repeat(12, 1fr); gap: 6px; }
    .c { background: #fff; border-radius: 8px; padding: 4px; text-align: center; }
    .c img { width: 100%; display: block; border-radius: 6px; }
    .c b { display: block; margin-top: 2px; overflow-wrap: anywhere; }
  </style></head><body><h1>T04: cada item na mão da primeira pessoa (celular em pé)</h1>
  <div class="g">${feitos.map((id) => `<div class="c"><img src="${img(id.replace(/[^a-z0-9_]/gi, '_'))}"><b>${id}</b></div>`).join('')}</div></body></html>`);
  await f.waitForTimeout(400);
  await f.screenshot({ path: `${PASTA}/folha-dos-itens.png`, fullPage: true });
  await c2.close();
});
