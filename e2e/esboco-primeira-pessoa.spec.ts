import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { test, type Browser, type Page } from '@playwright/test';
import { comecarGravacao, pararGravacao } from './gravarCena';

/**
 * Esboço da spec 037 (só com `?esboco=primeira-pessoa`): a câmera em primeira pessoa, num botão
 * com um olhinho, e as duas opções de braço que o dono compara (1, articulação leve; 2, sem
 * articulação). Não confere nada: tira as fotos e os vídeos para o dono escolher, em
 * capturas-037/esboco/opcoes/. Fora da suíte.
 *
 *   ESBOCO_PP=ajuste  (as poses das duas opções paradas, para acertar o braço)
 *   ESBOCO_PP=opcoes  (o mesmo roteiro nas duas opções: vídeo, fotos e a prancha)
 *   ESBOCO_PP=extras  (olhando para baixo, celular deitado e de noite)
 */
declare const process: { env: Record<string, string | undefined> };
const MODO = process.env.ESBOCO_PP;
const PASTA = 'capturas-037/esboco/opcoes';
test.skip(!MODO, 'esboço da primeira pessoa só com ESBOCO_PP');
test.describe.configure({ mode: 'serial' });
test.setTimeout(900_000);

type Opcao = '1' | '2';

async function abrir(browser: Browser, w: number, h: number, hora = 0.42) {
  const ctx = await browser.newContext({
    viewport: { width: w, height: h },
    hasTouch: true,
    isMobile: true,
    deviceScaleFactor: 2,
  });
  const page = await ctx.newPage();
  page.on('pageerror', (err) => console.log('erro na página:', String(err)));
  await page.goto('/?esboco=primeira-pessoa');
  await page.waitForFunction(
    () => window.__brumaluz?.ready === true && !!window.__primeiraPessoa,
    undefined,
    { timeout: 180_000 },
  );
  await page.evaluate((hora) => {
    document.querySelector('.entrada')?.setAttribute('hidden', '');
    document.body.classList.remove('tela-titulo');
    document.body.classList.add('toque-ativo');
    const e = window.__brumaluz!;
    e.pausarDia = true;
    e.hora = hora;
    e.definirClima?.('limpo');
  }, hora);
  let antes = -1;
  for (let i = 0; i < 20; i++) {
    await page.waitForTimeout(1500);
    const n = await page.evaluate(() => window.__brumaluz!.chunksCarregados ?? 0);
    if (n === antes && n > 10) break;
    antes = n;
  }
  await prepararBarra(page);
  return { ctx, page };
}

const olhar = (p: Page, yaw: number, pitch: number) =>
  p.evaluate(([y, pi]) => window.__brumaluz!.apontar!(y, pi), [yaw, pitch] as const);
const rot = (p: Page) => p.evaluate(() => window.__brumaluz!.rotacao as [number, number]);

/** Gira o olhar aos pouquinhos (como o dedo arrastando). */
async function girar(p: Page, dyaw: number, dpitch: number, ms: number) {
  const [pi0, y0] = await rot(p);
  const passos = Math.max(1, Math.round(ms / 50));
  for (let i = 1; i <= passos; i++) {
    const k = i / passos;
    const s = k * k * (3 - 2 * k);
    await olhar(p, y0 + dyaw * s, pi0 + dpitch * s);
    await p.waitForTimeout(50);
  }
}
const mover = (p: Page, f: number, d = 0) =>
  p.evaluate(([f, d]) => window.__brumaluz!.controleDireto!.mover(f, d), [f, d] as const);
const slot = (p: Page, i: number) => p.evaluate((i) => window.__brumaluz!.selecionarSlot!(i), i);
const opcao = (p: Page, o: Opcao) => p.evaluate((o) => window.__primeiraPessoa!.opcao(o), o);

async function prepararBarra(p: Page) {
  await p.evaluate(() => {
    const e = window.__brumaluz!;
    // 0 vazio; 1 tábuas (o bloco de pôr); 3 a maçã
    e.inventario!.definir(0, null);
    e.inventario!.definir(1, { item: 'bloco:7', qtd: 64 });
    e.inventario!.definir(2, { item: 'bloco:43', qtd: 64 });
    e.inventario!.definir(3, { item: 'maca', qtd: 8 });
    e.selecionarSlot!(0);
  });
}

/**
 * As poses paradas das duas opções, lado a lado, para acertar o braço (segurando, colocando,
 * acenando, comendo, de mão vazia andando). ESBOCO_PP=ajuste
 */
test('esboço da primeira pessoa: as poses das duas opções (ajuste)', async ({ browser }) => {
  test.skip(MODO !== 'ajuste', 'só com ESBOCO_PP=ajuste');
  const pasta = `${PASTA}/ajuste`;
  mkdirSync(pasta, { recursive: true });
  const { ctx, page: p } = await abrir(browser, 390, 844);
  await olhar(p, 0.6, 0.25);
  await slot(p, 1);
  await p.click('[data-esb-olho]');
  await p.waitForTimeout(1500);
  for (const o of ['1', '2'] as const) {
    await opcao(p, o);
    for (const pose of ['SEGURAR', 'ALCANCAR', 'ACENAR', 'COMER'] as const) {
      // o aceno de mão vazia, a maçã na boca, o bloco nas outras
      await slot(p, pose === 'ACENAR' ? 0 : pose === 'COMER' ? 3 : 1);
      await p.evaluate((x) => window.__primeiraPessoa!.forcar(x), pose);
      await p.waitForTimeout(900);
      await p.screenshot({ path: `${pasta}/${o}-${pose}.png` });
      console.log(o, pose, JSON.stringify(await p.evaluate(() => window.__primeiraPessoa!.tela())));
    }
  }
  await p.evaluate(() => window.__primeiraPessoa!.forcar(null));
  console.log('custo', JSON.stringify(await p.evaluate(() => window.__primeiraPessoa!.custo())));
  await ctx.close();
});

/** O mesmo roteiro nas duas opções: anda com o bloco, pula, põe dois blocos, acena, come, olha. */
async function roteiro(browser: Browser, o: Opcao) {
  const { ctx, page: p } = await abrir(browser, 390, 844);
  const f = (n: string) => p.screenshot({ path: `${PASTA}/${o}-${n}.png` });
  await opcao(p, o);
  await olhar(p, 0.6, 0.2);
  await slot(p, 1);
  await p.waitForTimeout(1200);
  await comecarGravacao(p);
  // entra pela cabeça com o olhinho, já com o bloco na mão
  await p.waitForTimeout(500);
  await p.click('[data-esb-olho]');
  await p.waitForTimeout(1300);
  await f('00-parado-com-bloco');
  const custo = await p.evaluate(() => window.__primeiraPessoa!.custo());
  // 1) anda com o bloco
  await mover(p, 0.6);
  await p.waitForTimeout(900);
  await f('01-andando-com-bloco');
  await p.waitForTimeout(500);
  await mover(p, 0);
  await p.waitForTimeout(700);
  // 2) pula e pousa
  await p.evaluate(() => window.__brumaluz!.controleDireto!.tecla('pular', true));
  await p.waitForTimeout(200);
  await p.evaluate(() => window.__brumaluz!.controleDireto!.tecla('pular', false));
  await p.waitForTimeout(60);
  await f('02-pulando');
  await p.waitForTimeout(1300);
  // 3) olha para o chão da frente e põe dois blocos (tocando no meio, onde está o pontinho)
  await girar(p, 0, 0.3, 500);
  await p.waitForTimeout(600);
  await f('03-mira');
  for (let i = 0; i < 2; i++) {
    const celula = await p.evaluate(() => window.__primeiraPessoa!.mira());
    await p.evaluate(() => {
      const c = window.__brumaluz!.controleDireto!;
      c.mirar(innerWidth / 2, innerHeight / 2);
      c.tocar();
      c.soltarMira();
    });
    await p.waitForTimeout(90);
    if (i === 0) await f('04-colocando');
    await p.waitForTimeout(700);
    const entrou = celula
      ? await p.evaluate(([x, y, z]) => window.__brumaluz!.bloco!(x, y, z), celula)
      : -1;
    console.log(`opção ${o}, bloco ${i + 1}: célula ${JSON.stringify(celula)}, bloco lá agora: ${entrou}`);
    if (i === 0) {
      await girar(p, 0.4, 0, 400);
      await p.waitForTimeout(400);
    }
  }
  // (vira para o lado: os blocos postos saem da frente)
  await girar(p, 1.1, -0.3, 900);
  await p.waitForTimeout(300);
  // 4) acena de mão vazia (a mão entra, abana e sai)
  await slot(p, 0);
  await p.waitForTimeout(700);
  await p.evaluate(() => window.__brumaluz!.gestos!.fazer('acenar'));
  await p.waitForTimeout(800);
  await f('05-acenando');
  await p.waitForTimeout(1500);
  // 5) troca para a maçã e come
  await slot(p, 3);
  await p.waitForTimeout(1000);
  await p.evaluate(() => window.__brumaluz!.comer!());
  await p.waitForTimeout(700);
  await f('06-comendo');
  await p.waitForTimeout(2200);
  // 6) olha em volta (a câmera solta) e sai pela cabeça
  await slot(p, 1);
  await girar(p, 1.3, -0.15, 1300);
  await p.waitForTimeout(200);
  await f('07-olhando-em-volta');
  await girar(p, -0.9, 0.15, 1000);
  await p.waitForTimeout(400);
  await p.click('[data-esb-olho]');
  await p.waitForTimeout(1400);
  await pararGravacao(p, `${PASTA}/opcao-${o}.webm`);
  await ctx.close();
  return custo;
}

test('esboço da primeira pessoa: as duas opções, o mesmo roteiro', async ({ browser }) => {
  test.skip(MODO !== 'opcoes', 'só com ESBOCO_PP=opcoes');
  mkdirSync(PASTA, { recursive: true });
  const custos: Record<string, unknown> = {};
  for (const o of ['1', '2'] as const) custos[o] = await roteiro(browser, o);
  console.log('custos', JSON.stringify(custos));
  writeFileSync(`${PASTA}/medidas.json`, JSON.stringify({ custos }, null, 2));
});

test('esboço da primeira pessoa: a prancha 1 contra 2', async ({ browser }) => {
  test.skip(MODO !== 'opcoes' && MODO !== 'prancha', 'só com ESBOCO_PP=opcoes');
  const momentos: [string, string][] = [
    ['01-andando-com-bloco', 'Andando com o bloco'],
    ['02-pulando', 'Pulando'],
    ['04-colocando', 'Colocando'],
    ['05-acenando', 'Acenando'],
    ['06-comendo', 'Comendo a maçã'],
  ];
  const img = (n: string) =>
    existsSync(`${PASTA}/${n}.png`)
      ? `data:image/png;base64,${readFileSync(`${PASTA}/${n}.png`, 'base64')}`
      : '';
  const nomes: Record<Opcao, string> = { '1': 'Articulação leve', '2': 'Sem articulação' };
  const linhas = (['1', '2'] as const)
    .map(
      (o) =>
        `<div class="v"><b>${o}</b><span>${nomes[o]}</span></div>` +
        momentos.map(([m]) => `<img src="${img(`${o}-${m}`)}">`).join(''),
    )
    .join('');
  const ctx = await browser.newContext({ viewport: { width: 1500, height: 900 } });
  const page = await ctx.newPage();
  await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>
    body { margin: 0; padding: 16px; background: #f4efe4; font: 600 16px system-ui, sans-serif; color: #333; }
    h1 { font-size: 20px; margin: 0 0 12px; }
    .g { display: grid; grid-template-columns: 90px repeat(${momentos.length}, 1fr); gap: 8px; align-items: center; }
    .g img { width: 100%; border-radius: 10px; display: block; }
    .v { text-align: center; display: grid; gap: 4px; }
    .v b { font-size: 34px; }
    .v span { font-size: 13px; }
    .t { text-align: center; font-size: 14px; }
  </style></head><body><h1>Primeira pessoa: o braço, opção 1 contra opção 2 (celular em pé, de dia)</h1>
  <div class="g"><div></div>${momentos.map(([, t]) => `<div class="t">${t}</div>`).join('')}${linhas}</div></body></html>`);
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${PASTA}/prancha.png`, fullPage: true });
  await ctx.close();
});

/** Olhando para baixo, celular deitado e de noite, nas duas opções. ESBOCO_PP=extras */
test('esboço da primeira pessoa: olhando para baixo, deitado e de noite', async ({ browser }) => {
  test.skip(MODO !== 'extras', 'só com ESBOCO_PP=extras');
  mkdirSync(PASTA, { recursive: true });
  // olhando para baixo (em pé, de dia)
  {
    const { ctx, page: p } = await abrir(browser, 390, 844);
    await olhar(p, 0.6, 0.2);
    await p.click('[data-esb-olho]');
    await p.waitForTimeout(1500);
    await girar(p, 0, 0.9, 700);
    await p.waitForTimeout(700);
    await p.screenshot({ path: `${PASTA}/extra-olhando-para-baixo-meio.png` });
    await girar(p, 0, 0.5, 500);
    await p.waitForTimeout(700);
    await p.screenshot({ path: `${PASTA}/extra-olhando-para-baixo.png` });
    console.log('olhando para baixo', JSON.stringify(await rot(p)));
    await ctx.close();
  }
  // deitado, segurando o bloco, nas duas opções
  {
    const { ctx, page: p } = await abrir(browser, 844, 390);
    await olhar(p, 0.6, 0.2);
    await slot(p, 1);
    await p.click('[data-esb-olho]');
    await p.waitForTimeout(1500);
    for (const o of ['1', '2'] as const) {
      await opcao(p, o);
      await p.waitForTimeout(800);
      await p.screenshot({ path: `${PASTA}/extra-deitado-${o}-segurando-bloco.png` });
      console.log('deitado', o, JSON.stringify(await p.evaluate(() => window.__primeiraPessoa!.tela())));
    }
    await ctx.close();
  }
  // nada treme: a mão andando, quadro a quadro (o passo só sobe e desce, nada de lado)
  {
    const { ctx, page: p } = await abrir(browser, 390, 844);
    await olhar(p, 0.6, 0.2);
    await slot(p, 1);
    await p.click('[data-esb-olho]');
    await p.waitForTimeout(1500);
    const medidas: Record<string, unknown> = {};
    for (const o of ['1', '2'] as const) {
      await opcao(p, o);
      await p.waitForTimeout(600);
      await mover(p, 0.6);
      await p.waitForTimeout(500);
      const pts = await p.evaluate(
        () =>
          new Promise<[number, number][]>((r) => {
            const out: [number, number][] = [];
            const t0 = performance.now();
            const passo = () => {
              out.push(window.__primeiraPessoa!.tela().mao);
              if (performance.now() - t0 < 2000) requestAnimationFrame(passo);
              else r(out);
            };
            requestAnimationFrame(passo);
          }),
      );
      await mover(p, 0);
      await p.waitForTimeout(800);
      const xs = pts.map((q) => q[0]);
      const ys = pts.map((q) => q[1]);
      let salto = 0;
      for (let i = 1; i + 1 < pts.length; i++)
        for (const k of [0, 1]) salto = Math.max(salto, Math.abs(pts[i + 1][k] - 2 * pts[i][k] + pts[i - 1][k]));
      medidas[o] = {
        quadros: pts.length,
        ladoPx: Math.max(...xs) - Math.min(...xs),
        sobeDescePx: Math.max(...ys) - Math.min(...ys),
        maiorTrancoPx: salto,
      };
    }
    console.log('andando com o bloco', JSON.stringify(medidas));
    writeFileSync(`${PASTA}/andando-quadro-a-quadro.json`, JSON.stringify(medidas, null, 2));
    await ctx.close();
  }
  // de noite, segurando o bloco, nas duas opções
  {
    const { ctx, page: p } = await abrir(browser, 390, 844, 0.95);
    await olhar(p, 0.6, 0.2);
    await slot(p, 1);
    await p.click('[data-esb-olho]');
    await p.waitForTimeout(1500);
    for (const o of ['1', '2'] as const) {
      await opcao(p, o);
      await p.waitForTimeout(800);
      await p.screenshot({ path: `${PASTA}/extra-noite-${o}-segurando-bloco.png` });
    }
    await ctx.close();
  }
});
