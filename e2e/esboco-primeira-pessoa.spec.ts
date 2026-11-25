import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { test, type Browser, type Page } from '@playwright/test';
import { comecarGravacao, pararGravacao } from './gravarCena';

/**
 * Esboço da spec 037 (só com `?esboco=primeira-pessoa`): a câmera em primeira pessoa, num botão
 * com um olhinho, em três variantes (A, B e C). Não confere nada: tira as fotos e os vídeos
 * para o dono escolher, em capturas-037/esboco/. Fora da suíte.
 *
 *   ESBOCO_PP=fotos  (só as fotos de conferência)
 *   ESBOCO_PP=tudo   (as fotos, o vídeo de cada variante e a foto deitado)
 */
declare const process: { env: Record<string, string | undefined> };
const MODO = process.env.ESBOCO_PP;
const PASTA = 'capturas-037/esboco';
test.skip(!MODO, 'esboço da primeira pessoa só com ESBOCO_PP');
test.describe.configure({ mode: 'serial' });
test.setTimeout(900_000);

type Variante = 'A' | 'B' | 'C';

async function abrir(browser: Browser, w: number, h: number) {
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
  await page.evaluate(() => {
    document.querySelector('.entrada')?.setAttribute('hidden', '');
    document.body.classList.remove('tela-titulo');
    document.body.classList.add('toque-ativo');
    const e = window.__brumaluz!;
    e.pausarDia = true;
    e.hora = 0.42;
    e.definirClima?.('limpo');
  });
  let antes = -1;
  for (let i = 0; i < 20; i++) {
    await page.waitForTimeout(1500);
    const n = await page.evaluate(() => window.__brumaluz!.chunksCarregados ?? 0);
    if (n === antes && n > 10) break;
    antes = n;
  }
  // a barra: o bloco de grama, a maçã e um bloco de tijolo (para trocar de item)
  const slots = await page.evaluate(() => {
    const e = window.__brumaluz!;
    const s = [];
    for (let i = 0; i < 9; i++) s.push(e.inventario!.obter(i)?.item ?? '-');
    return s;
  });
  console.log('barra', slots.join(' '));
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

async function prepararBarra(p: Page) {
  await p.evaluate(() => {
    const e = window.__brumaluz!;
    // 0 vazio; 1 tábuas e 2 tijolos (os blocos de pôr); 3 a maçã
    e.inventario!.definir(0, null);
    e.inventario!.definir(1, { item: 'bloco:7', qtd: 64 });
    e.inventario!.definir(2, { item: 'bloco:43', qtd: 64 });
    e.inventario!.definir(3, { item: 'maca', qtd: 8 });
    e.selecionarSlot!(0);
  });
}

async function foto(p: Page, nome: string) {
  await p.screenshot({ path: `${PASTA}/${nome}.png` });
}

async function rodarVariante(p: Page, v: Variante, gravar: boolean, inicio: number[]) {
  await p.evaluate((v) => {
    window.__primeiraPessoa!.variante(v);
    window.__primeiraPessoa!.primeira(false);
  }, v);
  // todas as variantes começam no mesmo lugar (para comparar lado a lado)
  await p.evaluate(([x, z]) => window.__brumaluz!.teleportar!(x, z), [inicio[0], inicio[2]]);
  await p.waitForTimeout(1500);
  await prepararBarra(p);
  await olhar(p, 0.6, 0.25);
  await p.waitForTimeout(1200);
  if (gravar) await comecarGravacao(p);
  // 1) entra pela cabeça com o olhinho
  await p.waitForTimeout(600);
  await p.click('[data-esb-olho]');
  await p.waitForTimeout(350);
  await foto(p, `${v}-01-entrando`);
  await p.waitForTimeout(900);
  await foto(p, `${v}-02-dentro-mao-vazia`);
  // 2) anda de mão vazia
  // (devagar: a caminhada inteira cabe na praça, sem chegar no balanço)
  await mover(p, 0.6);
  await p.waitForTimeout(900);
  await foto(p, `${v}-03-andando-mao-vazia`);
  await p.waitForTimeout(300);
  await mover(p, 0);
  // 3) olha para baixo: o corpo, os pés e a sombra
  await girar(p, 0, 1.3, 900);
  await p.waitForTimeout(500);
  await foto(p, `${v}-04-olhando-para-baixo`);
  console.log('olhando para baixo', JSON.stringify(await p.evaluate(() => [window.__brumaluz!.rotacao, window.__brumaluz!.posicao])));
  await girar(p, 0, -1.1, 800);
  // 4) acena (a mão entra e sai)
  await p.evaluate(() => window.__brumaluz!.gestos!.fazer('acenar'));
  await p.waitForTimeout(700);
  await foto(p, `${v}-05-acenando`);
  await p.waitForTimeout(1600);
  // 5) pega o bloco de grama: a mão sobe com ele
  await slot(p, 1);
  await p.waitForTimeout(800);
  await foto(p, `${v}-06-segurando-bloco`);
  const custo = await p.evaluate(() => window.__primeiraPessoa!.custo());
  // anda com o bloco
  await mover(p, 0.6);
  await p.waitForTimeout(800);
  await foto(p, `${v}-07-andando-com-bloco`);
  await mover(p, 0);
  await p.waitForTimeout(500);
  // 6) olha para o chão da frente e coloca o bloco
  await girar(p, 0, 0.55, 500);
  await p.waitForTimeout(300);
  await p.evaluate(() => window.__brumaluz!.controleDireto!.usar());
  await p.waitForTimeout(60);
  await foto(p, `${v}-08-colocando`);
  await p.waitForTimeout(900);
  await p.evaluate(() => window.__brumaluz!.controleDireto!.usar());
  await p.waitForTimeout(1000);
  await girar(p, 0, -0.55, 500);
  // 7) troca de item: o tijolo, depois a maçã
  await slot(p, 2);
  await p.waitForTimeout(250);
  await foto(p, `${v}-09-trocando`);
  await p.waitForTimeout(900);
  await slot(p, 3);
  await p.waitForTimeout(900);
  await foto(p, `${v}-10-segurando-maca`);
  // 8) come a maçã
  await p.evaluate(() => window.__brumaluz!.comer!());
  await p.waitForTimeout(600);
  await foto(p, `${v}-11-comendo`);
  await p.waitForTimeout(2200);
  // 9) pula e pousa
  await p.evaluate(() => window.__brumaluz!.controleDireto!.tecla('pular', true));
  await p.waitForTimeout(200);
  await p.evaluate(() => window.__brumaluz!.controleDireto!.tecla('pular', false));
  await p.waitForTimeout(1300);
  // 10) gira a câmera solta (o mesmo controle) e sai pela cabeça
  await girar(p, 1.4, 0, 1400);
  await p.click('[data-esb-olho]');
  await p.waitForTimeout(350);
  await foto(p, `${v}-12-saindo`);
  await p.waitForTimeout(1400);
  if (gravar) await pararGravacao(p, `${PASTA}/variante-${v}.webm`);
  console.log(`variante ${v}: custo`, JSON.stringify(custo));
  return custo;
}

/**
 * A variante A refinada (dono, 24 nov): o braço menor e com cotovelo, sem balanço de lado, com
 * mola; a mira de colocar (o contorno na célula e a conferência de que o bloco entra ali); a
 * câmera solta de dentro (arrastar para olhar para os lados, para cima e para baixo).
 *   ESBOCO_PP=a2
 */
test('esboço da primeira pessoa: a variante A refinada (A2)', async ({ browser }) => {
  test.skip(MODO !== 'a2', 'só com ESBOCO_PP=a2');
  const pasta = `${PASTA}/A2`;
  mkdirSync(pasta, { recursive: true });
  const { ctx, page: p } = await abrir(browser, 390, 844);
  const f = (n: string) => p.screenshot({ path: `${pasta}/${n}.png` });
  await prepararBarra(p);
  await olhar(p, 0.6, 0.25);
  await p.waitForTimeout(1200);
  await comecarGravacao(p);
  // entra pela cabeça
  await p.waitForTimeout(500);
  await p.click('[data-esb-olho]');
  await p.waitForTimeout(1300);
  // a câmera solta, de dentro: arrastar para os lados, para cima e para baixo (o controle de hoje)
  const arrastar = async (dx: number, dy: number, passos: number) => {
    await p.evaluate(() => window.__brumaluz!.controleDireto!.arrastar(true));
    for (let i = 0; i < passos; i++) {
      await p.evaluate(([x, y]) => window.__brumaluz!.controleDireto!.olhar(x, y), [dx, dy] as const);
      await p.waitForTimeout(40);
    }
    await p.evaluate(() => window.__brumaluz!.controleDireto!.arrastar(false));
  };
  const r0 = await rot(p);
  await arrastar(14, 0, 20);
  const r1 = await rot(p);
  await arrastar(-14, 0, 20);
  await arrastar(0, -10, 18);
  const r2 = await rot(p);
  await f('A2-01-olhando-para-cima');
  await arrastar(0, 10, 36);
  const r3 = await rot(p);
  await p.waitForTimeout(400);
  await f('A2-02-olhando-para-baixo');
  await arrastar(0, -10, 16);
  console.log('câmera solta (pitch, yaw):', JSON.stringify({ r0, direita: r1, cima: r2, baixo: r3 }));
  // anda de mão vazia (nada aparece), acena
  await mover(p, 0.6);
  await p.waitForTimeout(1000);
  await mover(p, 0);
  await p.evaluate(() => window.__brumaluz!.gestos!.fazer('acenar'));
  await p.waitForTimeout(700);
  await f('A2-03-acenando');
  await p.waitForTimeout(1600);
  // pega o bloco: o braço com cotovelo, baixo e de lado
  await slot(p, 1);
  await p.waitForTimeout(900);
  await f('A2-04-segurando-bloco');
  await mover(p, 0.6);
  await p.waitForTimeout(900);
  await mover(p, 0);
  // pula e pousa (a mola do braço)
  await p.evaluate(() => window.__brumaluz!.controleDireto!.tecla('pular', true));
  await p.waitForTimeout(200);
  await p.evaluate(() => window.__brumaluz!.controleDireto!.tecla('pular', false));
  await p.waitForTimeout(1300);
  // a mira: olha para o chão da frente, o contorno mostra onde o bloco vai entrar
  await girar(p, 0, 0.5, 500);
  await p.waitForTimeout(500);
  await f('A2-05-mira-antes-do-toque');
  for (let i = 0; i < 3; i++) {
    const celula = await p.evaluate(() => window.__primeiraPessoa!.mira());
    // toca no meio da tela (onde está o pontinho): o bloco tem que entrar na célula do contorno
    await p.evaluate(() => {
      const c = window.__brumaluz!.controleDireto!;
      c.mirar(innerWidth / 2, innerHeight / 2);
      c.tocar();
      c.soltarMira();
    });
    await p.waitForTimeout(120);
    if (i === 0) await f('A2-06-colocando');
    await p.waitForTimeout(600);
    const entrou = celula
      ? await p.evaluate(([x, y, z]) => window.__brumaluz!.bloco!(x, y, z), celula)
      : -1;
    console.log(`mira ${i + 1}: célula ${JSON.stringify(celula)}, bloco lá agora: ${entrou}`);
    await girar(p, 0.35, 0, 400);
    await p.waitForTimeout(300);
  }
  await girar(p, 0, -0.5, 500);
  // troca para a maçã e come
  await slot(p, 3);
  await p.waitForTimeout(900);
  await p.evaluate(() => window.__brumaluz!.comer!());
  await p.waitForTimeout(2600);
  // gira e sai pela cabeça
  await girar(p, 1.2, 0, 1200);
  await p.click('[data-esb-olho]');
  await p.waitForTimeout(1600);
  await pararGravacao(p, `${pasta}/variante-A2.webm`);
  console.log('custo', JSON.stringify(await p.evaluate(() => window.__primeiraPessoa!.custo())));
  await ctx.close();
});

test('esboço da primeira pessoa: celular em pé, de dia', async ({ browser }) => {
  test.skip(MODO === 'a2', 'não na A2');
  mkdirSync(PASTA, { recursive: true });
  const { ctx, page } = await abrir(browser, 390, 844);
  const custos: Record<string, unknown> = {};
  const variantes: Variante[] = MODO === 'fotos' ? ['A', 'C'] : ['A', 'B', 'C'];
  const inicio = await page.evaluate(() => window.__brumaluz!.posicao!);
  for (const v of variantes) custos[v] = await rodarVariante(page, v, MODO === 'tudo', inicio);
  const gl = await page.evaluate(() => {
    const s = window.__brumaluz!;
    return { fps: s.fps };
  });
  writeFileSync(`${PASTA}/medidas.json`, JSON.stringify({ custos, gl }, null, 2));
  await ctx.close();
});

test('esboço da primeira pessoa: a prancha para comparar', async ({ browser }) => {
  test.skip(MODO !== 'tudo', 'só no modo tudo');
  const momentos: [string, string][] = [
    ['03-andando-mao-vazia', 'Andando, mão vazia'],
    ['04-olhando-para-baixo', 'Olhando para baixo'],
    ['05-acenando', 'Acenando'],
    ['06-segurando-bloco', 'Segurando o bloco'],
    ['08-colocando', 'Colocando'],
    ['11-comendo', 'Comendo'],
  ];
  const img = (n: string) =>
    existsSync(`${PASTA}/${n}.png`)
      ? `data:image/png;base64,${readFileSync(`${PASTA}/${n}.png`, 'base64')}`
      : '';
  const linhas = (['A', 'B', 'C'] as const)
    .map(
      (v) =>
        `<div class="v">${v}</div>` +
        momentos.map(([m]) => `<img src="${img(`${v}-${m}`)}">`).join(''),
    )
    .join('');
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await ctx.newPage();
  await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>
    body { margin: 0; padding: 16px; background: #f4efe4; font: 600 16px system-ui, sans-serif; color: #333; }
    h1 { font-size: 20px; margin: 0 0 12px; }
    .g { display: grid; grid-template-columns: 40px repeat(${momentos.length}, 1fr); gap: 8px; align-items: center; }
    .g img { width: 100%; border-radius: 10px; display: block; }
    .v { font-size: 28px; text-align: center; }
    .t { text-align: center; font-size: 14px; }
  </style></head><body><h1>Primeira pessoa: as variantes A, B e C (celular em pé, de dia)</h1>
  <div class="g"><div></div>${momentos.map(([, t]) => `<div class="t">${t}</div>`).join('')}${linhas}</div></body></html>`);
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${PASTA}/prancha.png`, fullPage: true });
  await ctx.close();
});

test('esboço da primeira pessoa: celular deitado', async ({ browser }) => {
  test.skip(MODO !== 'tudo', 'só no modo tudo');
  const { ctx, page } = await abrir(browser, 844, 390);
  await prepararBarra(page);
  await page.evaluate(() => window.__primeiraPessoa!.variante('A'));
  await olhar(page, 0.6, 0.25);
  await page.click('[data-esb-olho]');
  await page.waitForTimeout(1500);
  await slot(page, 1);
  await page.waitForTimeout(1200);
  await foto(page, 'deitado-A-segurando-bloco');
  await girar(page, 0, 1.1, 800);
  await page.waitForTimeout(600);
  await foto(page, 'deitado-A-olhando-para-baixo');
  await ctx.close();
});
