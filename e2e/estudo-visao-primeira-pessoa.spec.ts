import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { test, type Browser, type Page } from '@playwright/test';
import { comecarGravacao, pararGravacao } from './gravarCena';

/**
 * Estudo da spec 037: a escala da primeira pessoa (a altura dos olhos e o campo de visão). Abre
 * `?esboco=primeira-pessoa`, monta a mesma cena (um bloco com a face a 1,5 dos olhos e uma
 * parede a 3) e fotografa a grade de alturas e campos no celular em pé, medindo na tela o tamanho
 * do bloco. Não muda o jogo.
 *
 *   ESTUDO_VISAO=grade   (a grade e a prancha)
 *   ESTUDO_VISAO=final   (a recomendação aplicada: as fotos e o vídeo andando e colocando)
 */
declare const process: { env: Record<string, string | undefined> };
const MODO = process.env.ESTUDO_VISAO;
const PASTA = 'capturas-037/estudo-visao';
test.skip(!MODO, 'estudo da visão só com ESTUDO_VISAO');
test.describe.configure({ mode: 'serial' });
test.setTimeout(1_200_000);

/** Os olhos ficam 0,345 à frente dos pés (no esboço). */
const OLHOS_FRENTE = 0.345;

async function abrir(browser: Browser, w: number, h: number, toque = true) {
  const ctx = await browser.newContext({
    viewport: { width: w, height: h },
    hasTouch: toque,
    isMobile: toque,
    deviceScaleFactor: toque ? 2 : 1,
  });
  const page = await ctx.newPage();
  page.on('pageerror', (err) => console.log('erro na página:', String(err)));
  await page.goto('/?esboco=primeira-pessoa');
  await page.waitForFunction(
    () => window.__brumaluz?.ready === true && !!window.__primeiraPessoa,
    undefined,
    { timeout: 180_000 },
  );
  await page.evaluate((toque) => {
    document.querySelector('.entrada')?.setAttribute('hidden', '');
    document.body.classList.remove('tela-titulo');
    if (toque) document.body.classList.add('toque-ativo');
    const e = window.__brumaluz!;
    e.pausarDia = true;
    e.hora = 0.42;
    e.definirClima?.('limpo');
    e.inventario!.definir(0, null);
    e.inventario!.definir(1, { item: 'bloco:7', qtd: 64 });
    e.selecionarSlot!(1);
  }, toque);
  let antes = -1;
  for (let i = 0; i < 20; i++) {
    await page.waitForTimeout(1500);
    const n = await page.evaluate(() => window.__brumaluz!.chunksCarregados ?? 0);
    if (n === antes && n > 10) break;
    antes = n;
  }
  return { ctx, page };
}

/**
 * Monta a cena num chão plano: o bloco com a face a 1,5 dos olhos, a parede (3 de altura, 7 de
 * largura) a 3, e o boneco olhando para +z. Devolve as células para medir.
 */
async function montarCena(p: Page) {
  return p.evaluate((frente) => {
    const e = window.__brumaluz!;
    const [x0, , z0] = e.posicao!;
    // um lugar plano à frente: o chão (a primeira célula cheia de cima para baixo)
    const cx = Math.floor(x0) + 6;
    const cz = Math.floor(z0) + 6;
    let chao = 120;
    while (chao > 0 && !e.bloco!(cx, chao, cz)) chao--;
    const y = chao + 1;
    // limpa um corredor e monta
    for (let dx = -4; dx <= 4; dx++)
      for (let dz = -2; dz <= 6; dz++)
        for (let dy = 0; dy < 5; dy++) e.definirBloco!(cx + dx, y + dy, cz + dz, 0);
    for (let dx = -4; dx <= 4; dx++) for (let dz = -2; dz <= 6; dz++) e.definirBloco!(cx + dx, chao, cz + dz, 4);
    const bloco = [cx, y, cz + 2];
    e.definirBloco!(bloco[0], bloco[1], bloco[2], 7);
    for (let dx = -3; dx <= 3; dx++) for (let dy = 0; dy < 3; dy++) e.definirBloco!(cx + dx, y + dy, cz + 5, 43);
    // os pés: os olhos (0,345 à frente) ficam a 1,5 da face do bloco (z = cz + 2)
    e.teleportar!(cx + 0.5, cz + 2 - 1.5 - frente);
    return { bloco, chao, parede: cz + 5, cx, cz };
  }, OLHOS_FRENTE);
}

/** O tamanho do bloco na tela (os oito cantos projetados pela câmera que desenha), em % da tela. */
const medirBloco = (p: Page, b: number[]) =>
  p.evaluate((b) => {
    const e = window.__brumaluz!;
    const xs: number[] = [];
    const ys: number[] = [];
    for (const dx of [0, 1]) for (const dy of [0, 1]) for (const dz of [0, 1]) {
      const q = e.telaDoPonto!(b[0] + dx, b[1] + dy, b[2] + dz);
      if (q) {
        xs.push(q.x);
        ys.push(q.y);
      }
    }
    return {
      alturaPct: +(((Math.max(...ys) - Math.min(...ys)) / innerHeight) * 100).toFixed(1),
      larguraPct: +(((Math.max(...xs) - Math.min(...xs)) / innerWidth) * 100).toFixed(1),
      altoPx: Math.round(Math.min(...ys)),
    };
  }, b);

const pitchDeEntrada = (fovV: number) => Math.atan(Math.tan(((fovV / 2) * Math.PI) / 180) / 3);

test('estudo da visão: a grade de alturas e campos (celular em pé)', async ({ browser }) => {
  test.skip(MODO !== 'grade', 'só com ESTUDO_VISAO=grade');
  mkdirSync(PASTA, { recursive: true });
  const { ctx, page: p } = await abrir(browser, 390, 844);
  const cena = await montarCena(p);
  await p.waitForTimeout(1500);
  await p.evaluate(() => window.__brumaluz!.apontar!(0, 0.2));
  await p.click('[data-esb-olho]');
  await p.waitForTimeout(1800);
  const medidas: Record<string, unknown> = {};
  for (const h of [1.21, 1.45, 1.62])
    for (const f of [70, 80, 90]) {
      await p.evaluate(([h, f]) => window.__primeiraPessoa!.ajustarCamera(h, f), [h, f] as const);
      await p.evaluate((pi) => window.__brumaluz!.apontar!(0, pi), pitchDeEntrada(f));
      await p.waitForTimeout(700);
      const nome = `grade-h${String(h).replace('.', '_')}-fov${f}`;
      await p.screenshot({ path: `${PASTA}/${nome}.png` });
      medidas[nome] = { altura: h, fovV: f, pitch: +pitchDeEntrada(f).toFixed(3), bloco: await medirBloco(p, cena.bloco) };
      console.log(nome, JSON.stringify(medidas[nome]));
    }
  writeFileSync(`${PASTA}/medidas-grade.json`, JSON.stringify({ cena, medidas }, null, 1));
  await ctx.close();
  // a referência: olhos a 1,62, 70° na vertical, olhando reto, no computador 16:9
  {
    const { ctx: c2, page: q } = await abrir(browser, 1280, 720, false);
    const cena2 = await montarCena(q);
    await q.waitForTimeout(1500);
    await q.evaluate(() => window.__brumaluz!.apontar!(0, 0));
    await q.click('[data-esb-olho]');
    await q.waitForTimeout(1800);
    await q.evaluate(() => window.__primeiraPessoa!.ajustarCamera(1.62, 70));
    await q.evaluate(() => window.__brumaluz!.apontar!(0, 0));
    await q.waitForTimeout(700);
    await q.screenshot({ path: `${PASTA}/referencia-computador-h1_62-fov70.png` });
    console.log('referência', JSON.stringify(await medirBloco(q, cena2.bloco)));
    await c2.close();
  }
  // a prancha
  const c3 = await browser.newContext({ viewport: { width: 1500, height: 900 } });
  const f = await c3.newPage();
  const img = (n: string) => `data:image/png;base64,${readFileSync(`${PASTA}/${n}.png`, 'base64')}`;
  let linhas = '';
  for (const h of [1.21, 1.45, 1.62]) {
    linhas += `<div class="r">olhos a ${String(h).replace('.', ',')}</div>`;
    for (const fv of [70, 80, 90]) {
      const nome = `grade-h${String(h).replace('.', '_')}-fov${fv}`;
      const m = (medidas[nome] as { bloco: { alturaPct: number; larguraPct: number } }).bloco;
      linhas += `<div class="c"><img src="${img(nome)}"><b>${fv}° · bloco a 1,5: ${m.alturaPct}% da altura, ${m.larguraPct}% da largura</b></div>`;
    }
  }
  await f.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>
    body { margin: 0; padding: 14px; background: #f4efe4; font: 600 13px system-ui, sans-serif; color: #333; }
    h1 { font-size: 18px; margin: 0 0 4px; } p { margin: 0 0 10px; font-weight: 500; }
    .g { display: grid; grid-template-columns: 90px repeat(3, 1fr); gap: 8px; align-items: center; }
    .c { background: #fff; border-radius: 8px; padding: 5px; text-align: center; }
    .c img { width: 100%; display: block; border-radius: 6px; } .c b { display: block; margin-top: 4px; }
    .r { font-size: 15px; text-align: center; }
  </style></head><body><h1>Primeira pessoa: a altura dos olhos e o campo de visão (celular em pé)</h1>
  <p>A mesma cena: um bloco de tábuas com a face a 1,5 dos olhos e uma parede de tijolos a 3. Colunas: o campo vertical (70°, 80°, 90°); linhas: a altura dos olhos. O olhar entra com o horizonte no terço de cima.</p>
  <div class="g">${linhas}</div></body></html>`);
  await f.waitForTimeout(400);
  await f.screenshot({ path: `${PASTA}/prancha-grade.png`, fullPage: true });
  await c3.close();
});

test('estudo da visão: a recomendação aplicada (fotos e vídeo)', async ({ browser }) => {
  test.skip(MODO !== 'final', 'só com ESTUDO_VISAO=final');
  mkdirSync(PASTA, { recursive: true });
  const { ctx, page: p } = await abrir(browser, 390, 844);
  const cena = await montarCena(p);
  await p.waitForTimeout(1500);
  await p.evaluate(() => window.__brumaluz!.apontar!(0, 0.5));
  await p.waitForTimeout(800);
  await comecarGravacao(p);
  await p.waitForTimeout(400);
  await p.click('[data-esb-olho]');
  await p.waitForTimeout(1600);
  await p.screenshot({ path: `${PASTA}/recomendada-cena.png` });
  const bloco = await medirBloco(p, cena.bloco);
  const vigia = await p.evaluate(() => window.__primeiraPessoa!.ponta());
  // vira para trás (a praça aberta), anda e põe blocos tocando no chão à frente
  const rot = await p.evaluate(() => window.__brumaluz!.rotacao as [number, number]);
  for (let i = 1; i <= 20; i++) {
    await p.evaluate(([y, pi]) => window.__brumaluz!.apontar!(y, pi), [rot[1] + Math.PI * (i / 20), rot[0]] as const);
    await p.waitForTimeout(40);
  }
  await p.evaluate(() => window.__brumaluz!.controleDireto!.mover(0.6, 0));
  await p.waitForTimeout(1600);
  await p.screenshot({ path: `${PASTA}/recomendada-andando.png` });
  await p.evaluate(() => window.__brumaluz!.controleDireto!.mover(0, 0));
  await p.waitForTimeout(500);
  const pontos: [number, number][] = [
    [0.45, 0.6],
    [0.6, 0.6],
    [0.5, 0.52],
  ];
  for (const [fx, fy] of pontos) {
    await p.touchscreen.tap(Math.round(390 * fx), Math.round(844 * fy));
    await p.waitForTimeout(150);
    if (fx === 0.45) await p.screenshot({ path: `${PASTA}/recomendada-colocando.png` });
    await p.waitForTimeout(700);
  }
  await p.waitForTimeout(400);
  await p.screenshot({ path: `${PASTA}/recomendada-depois-de-colocar.png` });
  await p.evaluate(() => window.__brumaluz!.controleDireto!.mover(0.6, 0));
  await p.waitForTimeout(1200);
  await p.evaluate(() => window.__brumaluz!.controleDireto!.mover(0, 0));
  await p.waitForTimeout(500);
  await pararGravacao(p, `${PASTA}/recomendada-andando-e-colocando.webm`);
  const ponta = await p.evaluate(() => window.__primeiraPessoa!.ponta());
  console.log('recomendada', JSON.stringify({ bloco, vigia, ponta }));
  const anterior = existsSync(`${PASTA}/medidas-recomendada.json`) ? JSON.parse(readFileSync(`${PASTA}/medidas-recomendada.json`, 'utf8')) : {};
  writeFileSync(`${PASTA}/medidas-recomendada.json`, JSON.stringify({ ...anterior, emPe: { bloco, ombroFora: ponta } }, null, 1));
  await ctx.close();
  for (const [nome, w, h, toque] of [
    ['deitado', 844, 390, true],
    ['computador', 1280, 720, false],
  ] as const) {
    const { ctx: c2, page: q } = await abrir(browser, w, h, toque);
    const cena2 = await montarCena(q);
    await q.waitForTimeout(1500);
    await q.evaluate(() => window.__brumaluz!.apontar!(0, 0.5));
    await q.click('[data-esb-olho]');
    await q.waitForTimeout(1800);
    await q.screenshot({ path: `${PASTA}/recomendada-${nome}.png` });
    console.log(nome, JSON.stringify(await medirBloco(q, cena2.bloco)));
    await c2.close();
  }
});
