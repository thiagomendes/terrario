import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { test, expect, type Browser, type Page } from '@playwright/test';
import { comecarGravacao, pararGravacao } from './gravarCena';

/**
 * Esboço da spec 037 (só com `?esboco=primeira-pessoa`): a primeira pessoa (a câmera nos olhos de
 * verdade, o braço do boneco girando no ombro fixo fora da beira direita, a mira seguindo o dedo).
 * Fora da suíte: tira as fotos e o vídeo para o dono e mede.
 *
 *   ESBOCO_PP=visao   (a visão à frente: a terceira pessoa de hoje e a primeira, antes e depois)
 *   ESBOCO_PP=toques  (20 toques em pontos diferentes da tela em pé; 10 cliques no computador)
 *   ESBOCO_PP=ritmo   (segurar para quebrar e colocar: um movimento do braço por evento do jogo)
 *   ESBOCO_PP=itens   (a folha dos itens na mão)
 *   ESBOCO_PP=video   (o vídeo em pé e as fotos)
 */
declare const process: { env: Record<string, string | undefined> };
const MODO = process.env.ESBOCO_PP;
const PASTA = 'capturas-037/esboco/final2';
test.skip(!MODO, 'esboço da primeira pessoa só com ESBOCO_PP');
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
  await page.goto('/?esboco=primeira-pessoa');
  await page.waitForFunction(
    () => window.__brumaluz?.ready === true && !!window.__primeiraPessoa,
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
  await page.evaluate(() => {
    const e = window.__brumaluz!;
    // 0 vazio; 1 tábuas (o bloco de pôr); 2 a picareta; 3 a maçã
    e.inventario!.definir(0, null);
    e.inventario!.definir(1, { item: 'bloco:7', qtd: 64 });
    e.inventario!.definir(2, { item: 'picareta_pedra', qtd: 1 });
    e.inventario!.definir(3, { item: 'maca', qtd: 8 });
    e.selecionarSlot!(0);
  });
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
async function irPara(p: Page, yaw: number, pitch: number, ms: number) {
  const [pi0, y0] = await rot(p);
  await girar(p, yaw - y0, pitch - pi0, ms);
}
const mover = (p: Page, f: number) =>
  p.evaluate((f) => window.__brumaluz!.controleDireto!.mover(f, 0), f);
const slot = (p: Page, i: number) => p.evaluate((i) => window.__brumaluz!.selecionarSlot!(i), i);
const entrar = async (p: Page) => {
  await p.click('[data-esb-olho]');
  await p.waitForTimeout(1500);
};

/** O que o toque no ponto (x, y) faria: o bloco que o raio acerta e a célula onde o novo entra. */
const prever = (p: Page, x: number, y: number) =>
  p.evaluate(
    ([x, y]) => {
      const e = window.__brumaluz!;
      const a = e.preverToque!(x, y).alvo;
      const pe = Math.floor(e.posicao![1] - 1.62 + 0.01);
      if (!a) return null;
      return { alvo: [a.x, a.y, a.z], cel: [a.x + a.normal.x, a.y + a.normal.y, a.z + a.normal.z], n: a.normal, pe };
    },
    [x, y] as const,
  );
const blocoEm = (p: Page, c: number[]) =>
  p.evaluate(([x, y, z]) => window.__brumaluz!.bloco!(x, y, z), c as [number, number, number]);

/**
 * A câmera que desenha a tela, no corpo do boneco: onde ela está em relação aos pés (para a
 * frente, para cima, para a direita), a inclinação e o campo de visão.
 */
const camera = (p: Page) =>
  p.evaluate(() => {
    const g = window.__brumaluz!.primeiraPessoa!;
    const j = g.jogador();
    const yaw = g.olhos.rotation.y;
    const v = g.visao.position;
    const dx = v.x - j.x;
    const dz = v.z - j.z;
    return {
      frente: +(dx * Math.sin(yaw) + dz * Math.cos(yaw)).toFixed(3),
      cima: +(v.y - j.y).toFixed(3),
      lado: +(dx * Math.cos(yaw) - dz * Math.sin(yaw)).toFixed(3),
      pitch: +g.visao.rotation.x.toFixed(3),
      fovV: +((g.visao.fov * 180) / Math.PI).toFixed(1),
    };
  });

const lerMedidas = (): Record<string, unknown> =>
  existsSync(`${PASTA}/medidas.json`) ? JSON.parse(readFileSync(`${PASTA}/medidas.json`, 'utf8')) : {};
const gravarMedidas = (parte: string, valor: unknown) => {
  mkdirSync(PASTA, { recursive: true });
  const m = lerMedidas();
  m[parte] = valor;
  writeFileSync(`${PASTA}/medidas.json`, JSON.stringify(m, null, 1));
};

test('esboço: a visão à frente, de fora e de dentro', async ({ browser }) => {
  test.skip(MODO !== 'visao', 'só com ESBOCO_PP=visao');
  mkdirSync(PASTA, { recursive: true });
  const { ctx, page: p } = await abrir(browser, 390, 844);
  await slot(p, 1);
  // a inclinação que o dono tinha no Doce Reino (a câmera de trás olhando o boneco de cima)
  await olhar(p, 0.6, 0.5);
  await p.waitForTimeout(900);
  const fora = await camera(p);
  await p.screenshot({ path: `${PASTA}/visao-terceira-pessoa.png` });
  await entrar(p);
  const dentro = await camera(p);
  await p.screenshot({ path: `${PASTA}/visao-primeira-pessoa.png` });
  console.log('câmera', JSON.stringify({ fora, dentro }));
  gravarMedidas('cameraMedidaNoJogo', { fora, dentro });
  await ctx.close();
});

/** Toca de verdade (o dedo na tela, pelo caminho de `src/ui/toque.ts`) e confere a célula. */
async function vinteToques(p: Page) {
  await slot(p, 1);
  await p.waitForTimeout(900);
  const [, y0] = await rot(p);
  const inicio = await p.evaluate(() => window.__brumaluz!.posicao!);
  const w = await p.evaluate(() => innerWidth);
  const h = await p.evaluate(() => innerHeight);
  // pontos espalhados na tela (fora do meio), acima dos botões e longe do olhinho
  const pontos: [number, number][] = [
    [0.3, 0.55],
    [0.7, 0.6],
    [0.5, 0.45],
    [0.25, 0.68],
    [0.62, 0.5],
  ];
  const vistas: [number, number][] = [
    [0, 0.45],
    [0.3, 0.3],
    [-0.3, 0.55],
  ];
  const toques: { ponto: number[]; cel: number[]; face: string; certo: boolean }[] = [];
  let tentativa = 0;
  let rodada = -1;
  while (toques.length < 20 && tentativa < 90) {
    if (tentativa % 15 === 0) {
      rodada++;
      await p.evaluate(
        ([x, z]) => window.__brumaluz!.teleportar!(x, z),
        [inicio[0] + Math.cos(y0) * 3 * rodada, inicio[2] - Math.sin(y0) * 3 * rodada] as const,
      );
      await p.waitForTimeout(700);
    }
    const [dy, pi] = vistas[Math.floor(tentativa / 5) % vistas.length];
    const [fx, fy] = pontos[tentativa % pontos.length];
    tentativa++;
    await irPara(p, y0 + dy, pi, 250);
    await p.waitForTimeout(200);
    const [x, y] = [Math.round(fx * w), Math.round(fy * h)];
    const m = await prever(p, x, y);
    if (!m) continue;
    // (a célula da própria criança não recebe bloco)
    const face = m.n.y > 0 ? (m.alvo[1] >= m.pe ? 'pilha' : 'chão') : 'parede';
    await p.touchscreen.tap(x, y);
    await p.waitForTimeout(450);
    const b = await blocoEm(p, m.cel);
    if (b === 0) {
      // nada entrou: o toque caiu na célula da criança (o jogo recusa) — não conta
      continue;
    }
    toques.push({ ponto: [x, y], cel: m.cel, face, certo: b === 7 });
  }
  const certos = toques.filter((t) => t.certo).length;
  const porFace: Record<string, number> = {};
  for (const t of toques) porFace[t.face] = (porFace[t.face] ?? 0) + 1;
  console.log(`toques: ${certos} de ${toques.length} na célula embaixo do dedo`, JSON.stringify(porFace));
  return { toques: toques.length, certos, porFace, lista: toques };
}

test('esboço: a mira segue o dedo (20 toques) e o clique (10 no computador)', async ({ browser }) => {
  test.skip(MODO !== 'toques', 'só com ESBOCO_PP=toques');
  {
    const { ctx, page: p } = await abrir(browser, 390, 844);
    await olhar(p, 0.6, 0.3);
    await entrar(p);
    const r = await vinteToques(p);
    gravarMedidas('toquesEmPe', r);
    await ctx.close();
    expect(r.toques).toBe(20);
    expect(r.certos).toBe(20);
  }
  {
    const { ctx, page: p } = await abrir(browser, 1280, 720, false);
    await olhar(p, 0.6, 0.3);
    await entrar(p);
    await slot(p, 1);
    await p.waitForTimeout(900);
    const lista: { ponto: number[]; cel: number[]; certo: boolean }[] = [];
    const pontos: [number, number][] = [
      [0.3, 0.6],
      [0.6, 0.55],
      [0.45, 0.7],
      [0.7, 0.65],
      [0.35, 0.5],
    ];
    let i = 0;
    while (lista.length < 10 && i < 30) {
      const [fx, fy] = pontos[i % pontos.length];
      if (i % 5 === 0) await girar(p, 0.5, 0, 300);
      i++;
      const [x, y] = [Math.round(fx * 1280), Math.round(fy * 720)];
      await p.mouse.move(x, y);
      await p.waitForTimeout(150);
      const m = await prever(p, x, y);
      if (!m) {
        console.log(`  clique ${x},${y}: sem alvo`);
        continue;
      }
      const embaixo = await p.evaluate(([x, y]) => {
        const el = document.elementFromPoint(x, y) as HTMLElement | null;
        return el ? `${el.tagName}.${el.className}` : '-';
      }, [x, y] as const);
      await p.mouse.click(x, y);
      await p.waitForTimeout(450);
      const b = await blocoEm(p, m.cel);
      if (b === 0) {
        const direto = await p.evaluate(([x, y]) => {
          const c = window.__brumaluz!.controleDireto!;
          c.mirar(x, y);
          c.tocar();
          c.soltarMira();
          return 0;
        }, [x, y] as const);
        await p.waitForTimeout(400);
        console.log(`  clique ${x},${y}: nada entrou em ${m.cel} (embaixo: ${embaixo}); pelo controle direto: ${await blocoEm(p, m.cel)} ${direto}`);
        continue;
      }
      lista.push({ ponto: [x, y], cel: m.cel, certo: b === 7 });
    }
    const travou = await p.evaluate(() => !!document.pointerLockElement);
    const certos = lista.filter((t) => t.certo).length;
    console.log(`cliques: ${certos} de ${lista.length}; mouse travado: ${travou}`);
    gravarMedidas('cliquesComputador', { cliques: lista.length, certos, mouseTravado: travou, lista });
    await p.screenshot({ path: `${PASTA}/computador-depois-dos-cliques.png` });
    await ctx.close();
    expect(lista.length).toBe(10);
    expect(certos).toBe(10);
    expect(travou).toBe(false);
  }
});

/**
 * Um mundo de sobrevivência novo, no aparelho, com o esboço ligado (no criativo o bloco quebra de
 * um golpe só: os golpes seguidos, com o som, são os da sobrevivência).
 */
async function abrirSobrevivencia(browser: Browser) {
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
    deviceScaleFactor: 2,
  });
  const p = await ctx.newPage();
  p.on('pageerror', (err) => console.log('erro na página:', String(err)));
  await p.goto('/');
  await p.waitForFunction(() => window.__brumaluz?.ready === true, undefined, { timeout: 180_000 });
  await p.locator('[data-abrir-mundos]').click();
  await p.locator('[data-modo="sobrevivencia"]').click();
  await p.locator('[data-novo-nome]').fill('Golpes');
  await p.locator('[data-criar-mundo]').click();
  await p.waitForURL(/mundo=/, { timeout: 60_000 });
  const url = new URL(p.url());
  url.searchParams.set('esboco', 'primeira-pessoa');
  await p.goto(url.toString());
  await p.waitForFunction(
    () => window.__brumaluz?.ready === true && !!window.__primeiraPessoa,
    undefined,
    { timeout: 180_000 },
  );
  await p.evaluate(() => {
    document.querySelector('.entrada')?.setAttribute('hidden', '');
    document.body.classList.remove('tela-titulo');
    document.body.classList.add('toque-ativo');
    const e = window.__brumaluz!;
    e.pausarDia = true;
    e.hora = 0.42;
    e.inventario!.definir(1, { item: 'bloco:7', qtd: 64 });
    e.inventario!.definir(2, { item: 'picareta_pedra', qtd: 1 });
  });
  await p.waitForTimeout(4000);
  console.log('modo', await p.evaluate(() => window.__brumaluz!.modo));
  return { ctx, page: p };
}

test('esboço: o golpe e o colocar no ritmo do jogo', async ({ browser }) => {
  test.skip(MODO !== 'ritmo', 'só com ESBOCO_PP=ritmo');
  const { ctx, page: p } = await abrirSobrevivencia(browser);
  await olhar(p, 0.6, 0.3);
  await entrar(p);
  // segurar para quebrar com a picareta: o mesmo caminho do dedo que segura (toque.ts), num
  // bloco de tábuas posto antes
  await irPara(p, 0.6, 0.95, 400);
  await slot(p, 1);
  await p.waitForTimeout(900);
  const posto = await prever(p, Math.round(390 * 0.55), Math.round(844 * 0.55));
  await p.touchscreen.tap(Math.round(390 * 0.55), Math.round(844 * 0.55));
  await p.waitForTimeout(600);
  console.log('posto', JSON.stringify(posto), posto ? await blocoEm(p, posto.cel) : -1);
  await slot(p, 2);
  await p.waitForTimeout(900);
  await p.evaluate(() => window.__primeiraPessoa!.zerarRitmo());
  await p.evaluate(() => {
    const c = window.__brumaluz!.controleDireto!;
    c.mirar(innerWidth * 0.55, innerHeight * 0.55);
    c.quebrar(true);
  });
  await p.waitForTimeout(1000);
  console.log(
    'quebrando',
    JSON.stringify(await prever(p, Math.round(390 * 0.55), Math.round(844 * 0.55))),
    JSON.stringify(await p.evaluate(() => window.__brumaluz!.mineracao)),
  );
  await p.waitForTimeout(1500);
  await p.evaluate(() => {
    const c = window.__brumaluz!.controleDireto!;
    c.quebrar(false);
    c.soltarMira();
  });
  await p.waitForTimeout(400);
  const golpes = await p.evaluate(() => window.__primeiraPessoa!.ritmo());
  // colocar: cinco toques seguidos, um empurrão cada
  await slot(p, 1);
  await p.waitForTimeout(900);
  await irPara(p, 0.6, 0.45, 300);
  await p.evaluate(() => window.__primeiraPessoa!.zerarRitmo());
  for (let i = 0; i < 5; i++) {
    await p.touchscreen.tap(Math.round(390 * (0.3 + i * 0.1)), Math.round(844 * 0.55));
    await p.waitForTimeout(350);
  }
  await p.waitForTimeout(400);
  const colocar = await p.evaluate(() => window.__primeiraPessoa!.ritmo());
  console.log('ritmo', JSON.stringify({ golpes, colocar }));
  gravarMedidas('ritmo', { segurandoParaQuebrar: golpes, colocandoCincoToques: colocar });
  await ctx.close();
  // (as tábuas quebram em três golpes de picareta)
  expect(golpes.golpes).toBeGreaterThanOrEqual(3);
  expect(golpes.balancos).toBe(golpes.golpes);
  expect(colocar.empurroes).toBe(colocar.colocacoes);
});

test('esboço: a folha dos itens na mão', async ({ browser }) => {
  test.skip(MODO !== 'itens', 'só com ESBOCO_PP=itens');
  const pasta = `${PASTA}/itens`;
  mkdirSync(pasta, { recursive: true });
  const { ctx, page: p } = await abrir(browser, 390, 844);
  await olhar(p, 0.6, 0.15);
  await entrar(p);
  const todos = await p.evaluate(() => window.__primeiraPessoa!.itens());
  // os itens que não são bloco, todos; dos blocos, um de cada forma (as formas do registro)
  const blocos = [7, 43, 9, 37, 56, 57, 59, 60, 61, 82, 98, 10];
  const lista = [
    ...blocos.map((b) => `bloco:${b}`).filter((id) => todos.some((t) => t.id === id)),
    ...todos.filter((t) => t.tipo !== 'bloco').map((t) => t.id),
  ];
  const feitos: string[] = [];
  for (const id of lista) {
    await p.evaluate((id) => {
      const e = window.__brumaluz!;
      e.inventario!.definir(5, { item: id, qtd: 1 });
      e.selecionarSlot!(5);
    }, id);
    await p.waitForTimeout(750);
    const nome = id.replace(/[^a-z0-9_]/gi, '_');
    await p.screenshot({ path: `${pasta}/${nome}.png`, clip: { x: 130, y: 260, width: 260, height: 420 } });
    feitos.push(id);
    // (troca de item pelo vazio entre um e outro: cada um entra do zero)
    await p.evaluate(() => window.__brumaluz!.selecionarSlot!(0));
    await p.waitForTimeout(250);
  }
  // os tesouros da mão (ficam na mão esquerda de verdade, no alto): olhando para a frente e para cima
  for (const mao of ['varinha-bolhas', 'guarda-chuva-gotinhas', 'pipa-lacinhos']) {
    await p.evaluate((mao) => {
      const g = window.__brumaluz!.primeiraPessoa!;
      window.__brumaluz!.personagem!.definir({ ...g.aparencia(), premium: { mao } } as never);
    }, mao);
    await p.waitForTimeout(1200);
    await irPara(p, 0.6, 0.15, 300);
    await p.waitForTimeout(500);
    await p.screenshot({ path: `${pasta}/tesouro-${mao}-frente.png` });
    await irPara(p, 0.6, -0.6, 500);
    await p.waitForTimeout(500);
    await p.screenshot({ path: `${pasta}/tesouro-${mao}-cima.png` });
    await irPara(p, 0.6, 0.15, 500);
  }
  await ctx.close();
  // a folha
  const c2 = await browser.newContext({ viewport: { width: 1600, height: 900 } });
  const f = await c2.newPage();
  const img = (n: string) => `data:image/png;base64,${readFileSync(`${pasta}/${n}.png`, 'base64')}`;
  const celulas = feitos
    .map((id) => `<div class="c"><img src="${img(id.replace(/[^a-z0-9_]/gi, '_'))}"><b>${id}</b></div>`)
    .join('');
  await f.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>
    body { margin: 0; padding: 12px; background: #f4efe4; font: 600 11px system-ui, sans-serif; color: #333; }
    h1 { font-size: 18px; margin: 0 0 8px; }
    .g { display: grid; grid-template-columns: repeat(12, 1fr); gap: 6px; }
    .c { background: #fff; border-radius: 8px; padding: 4px; text-align: center; }
    .c img { width: 100%; display: block; border-radius: 6px; }
    .c b { display: block; margin-top: 2px; overflow-wrap: anywhere; }
  </style></head><body><h1>Primeira pessoa: cada item na mão (celular em pé, o canto de baixo à direita)</h1>
  <div class="g">${celulas}</div></body></html>`);
  await f.waitForTimeout(400);
  await f.screenshot({ path: `${PASTA}/folha-dos-itens.png`, fullPage: true });
  await c2.close();
  console.log('itens na folha', feitos.length);
});

test('esboço: o vídeo em pé (andar, olhar à frente, colocar, segurar para quebrar)', async ({ browser }) => {
  test.skip(MODO !== 'video', 'só com ESBOCO_PP=video');
  mkdirSync(PASTA, { recursive: true });
  const { ctx, page: p } = await abrir(browser, 390, 844);
  const f = (n: string) => p.screenshot({ path: `${PASTA}/${n}.png` });
  await slot(p, 1);
  // de fora, olhando o boneco de cima (como o dono estava)
  await olhar(p, 0.6, 0.5);
  await p.waitForTimeout(1200);
  await comecarGravacao(p);
  await p.waitForTimeout(500);
  // entra: o olhar vai para a frente
  await p.click('[data-esb-olho]');
  await p.waitForTimeout(1500);
  await f('01-entrou-olhando-a-frente');
  await p.evaluate(() => window.__primeiraPessoa!.zerarPonta());
  // anda com o bloco, olhando à frente
  await mover(p, 0.6);
  await p.waitForTimeout(1400);
  await f('02-andando-com-bloco');
  await mover(p, 0);
  await p.waitForTimeout(600);
  // põe três blocos tocando em pontos diferentes da tela (chão, parede, pilha)
  const [, y0] = await rot(p);
  await irPara(p, y0, 0.45, 500);
  await p.waitForTimeout(400);
  for (const [fx, fy] of [
    [0.4, 0.58],
    [0.42, 0.52],
    [0.4, 0.46],
  ] as const) {
    await p.touchscreen.tap(Math.round(390 * fx), Math.round(844 * fy));
    await p.waitForTimeout(120);
    if (fy === 0.58) await f('03-colocando-onde-tocou');
    await p.waitForTimeout(700);
  }
  // segura para quebrar com a picareta (os golpes no ritmo do som)
  await slot(p, 2);
  await p.waitForTimeout(900);
  await f('04-picareta-na-mao');
  await p.evaluate(() => {
    const c = window.__brumaluz!.controleDireto!;
    c.mirar(innerWidth * 0.4, innerHeight * 0.46);
    c.quebrar(true);
  });
  await p.waitForTimeout(500);
  await f('05-golpe');
  await p.waitForTimeout(1800);
  await p.evaluate(() => {
    const c = window.__brumaluz!.controleDireto!;
    c.quebrar(false);
    c.soltarMira();
  });
  await p.waitForTimeout(600);
  // olha à frente e em volta, e sai pela cabeça
  await slot(p, 1);
  await irPara(p, y0 + 1.0, 0.3, 1200);
  await p.waitForTimeout(400);
  await f('06-olhando-a-frente');
  await girar(p, -1.6, 0, 1400);
  await p.waitForTimeout(300);
  await p.click('[data-esb-olho]');
  await p.waitForTimeout(1400);
  await pararGravacao(p, `${PASTA}/primeira-pessoa.webm`);
  const ponta = await p.evaluate(() => window.__primeiraPessoa!.ponta());
  console.log('ombro fora no vídeo', JSON.stringify(ponta));
  await ctx.close();
  expect(ponta.menorFolgaPx).toBeGreaterThan(0);
  for (const [nome, w, h, toque, hora] of [
    ['deitado-segurando', 844, 390, true, 0.42],
    ['noite-segurando', 390, 844, true, 0.95],
    ['computador-segurando', 1280, 720, false, 0.42],
  ] as const) {
    const { ctx: c2, page: q } = await abrir(browser, w, h, toque, hora);
    await olhar(q, 0.6, 0.5);
    await slot(q, 1);
    await q.click('[data-esb-olho]');
    await q.waitForTimeout(1800);
    await q.screenshot({ path: `${PASTA}/${nome}.png` });
    await c2.close();
  }
});
