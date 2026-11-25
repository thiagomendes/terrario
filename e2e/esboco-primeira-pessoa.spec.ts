import { mkdirSync, writeFileSync } from 'node:fs';
import { test, expect, type Browser, type Page } from '@playwright/test';
import { comecarGravacao, pararGravacao } from './gravarCena';

/**
 * Esboço da spec 037 (só com `?esboco=primeira-pessoa`): a primeira pessoa final, a recomendação
 * do estudo do braço (a câmera nos olhos de verdade, o braço do boneco girando no ombro fixo fora
 * da beira direita). Fora da suíte: tira as fotos e o vídeo para o dono e mede a mira.
 *
 *   ESBOCO_PP=final  (o vídeo em pé, as fotos, deitado e de noite)
 *   ESBOCO_PP=mira   (20 toques na mira em pé e deitado, o alcance de colocar e o ombro fora)
 */
declare const process: { env: Record<string, string | undefined> };
const MODO = process.env.ESBOCO_PP;
const PASTA = 'capturas-037/esboco/final';
test.skip(!MODO, 'esboço da primeira pessoa só com ESBOCO_PP');
test.describe.configure({ mode: 'serial' });
test.setTimeout(1_200_000);

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
  await page.evaluate(() => {
    const e = window.__brumaluz!;
    // 0 vazio; 1 tábuas (o bloco de pôr); 3 a maçã
    e.inventario!.definir(0, null);
    e.inventario!.definir(1, { item: 'bloco:7', qtd: 64 });
    e.inventario!.definir(2, { item: 'bloco:43', qtd: 64 });
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
/** Toca no meio da tela, onde está o pontinho (o mesmo toque do dedo). */
const tocarNoMeio = (p: Page) =>
  p.evaluate(() => {
    const c = window.__brumaluz!.controleDireto!;
    c.mirar(innerWidth / 2, innerHeight / 2);
    c.tocar();
    c.soltarMira();
  });

/** O que a mira mostra agora: a célula do contorno e o que o raio acerta (o bloco e a face). */
const verMira = (p: Page) =>
  p.evaluate(() => {
    const e = window.__brumaluz!;
    const cel = window.__primeiraPessoa!.mira();
    const prev = e.preverToque!(innerWidth / 2, innerHeight / 2);
    const pe = Math.floor(e.posicao![1] - 1.62 + 0.01);
    return {
      cel,
      alvo: prev.alvo ? { y: prev.alvo.y, n: prev.alvo.normal } : null,
      pe,
    };
  });

/**
 * A mira: 20 toques seguidos no pontinho, no chão, nas paredes dos blocos postos e em cima das
 * pilhas. Cada toque tem de pôr o bloco exatamente na célula do contorno.
 */
async function vinteToques(p: Page, nome: string) {
  await slot(p, 1);
  await p.waitForTimeout(900);
  const [, y0] = await rot(p);
  const inicio = await p.evaluate(() => window.__brumaluz!.posicao!);
  // cada rodada num lugar livre da praça: o chão a dois passos, a parede (o lado do bloco posto)
  // e o alto da pilha (em cima dele), e de novo, subindo a obra
  const vistas: [number, number][] = [
    [0, 0.55],
    [0, 0.3],
    [0, 0.62],
    [0, 0.25],
    [0, 0.5],
  ];
  const toques: { cel: number[]; face: string; certo: boolean }[] = [];
  let tentativa = 0;
  let rodada = -1;
  while (toques.length < 20 && tentativa < 80) {
    if (tentativa % vistas.length === 0) {
      rodada++;
      // (de lado, três passos por rodada: a obra da rodada anterior fica fora do caminho)
      await p.evaluate(
        ([x, z]) => window.__brumaluz!.teleportar!(x, z),
        [inicio[0] + Math.cos(y0) * 3 * rodada, inicio[2] - Math.sin(y0) * 3 * rodada] as const,
      );
      await p.waitForTimeout(700);
    }
    const [dy, pi] = vistas[tentativa % vistas.length];
    tentativa++;
    await irPara(p, y0 + dy, pi, 300);
    await p.waitForTimeout(250);
    const m = await verMira(p);
    if (!m.cel || !m.alvo) {
      console.log(`  vista ${dy}/${pi}: sem mira`, JSON.stringify(m), JSON.stringify(await rot(p)));
      continue;
    }
    // a face que o raio acerta: o alto do chão, o lado de um bloco (parede) ou o alto de um
    // bloco posto (pilha)
    const face = m.alvo.n.y > 0 ? (m.alvo.y >= m.pe ? 'pilha' : 'chão') : 'parede';
    await tocarNoMeio(p);
    await p.waitForTimeout(450);
    const b = await p.evaluate(
      ([x, y, z]) => window.__brumaluz!.bloco!(x, y, z),
      m.cel as [number, number, number],
    );
    toques.push({ cel: m.cel, face, certo: b === 7 });
  }
  const certos = toques.filter((t) => t.certo).length;
  const porFace: Record<string, number> = {};
  for (const t of toques) porFace[t.face] = (porFace[t.face] ?? 0) + 1;
  console.log(`mira ${nome}: ${certos} de ${toques.length} na célula do contorno`, JSON.stringify(porFace));
  return { toques: toques.length, certos, porFace, lista: toques };
}

/**
 * O alcance de colocar: varrendo o olhar do pé para longe no chão plano, num leque de rumos, a
 * célula mais longe que a mira do meio da tela ainda aceita, medida dos olhos do controle (a mesma
 * conta do núcleo). (Num rumo só, a reta do raio passa por células diferentes de fora e de dentro
 * e a mais longe pode cair 0,5 antes: o leque cobre as células do limite nos dois jeitos.)
 */
async function alcance(p: Page) {
  const [, y0] = await rot(p);
  let maior = 0;
  for (let dy = -0.15; dy <= 0.151; dy += 0.03)
  // (passos finos no olhar raso: lá cada passo pula muito chão)
  for (let pi = 0.3; pi >= 0.0; pi -= 0.004) {
    await olhar(p, y0 + dy, pi);
    await p.waitForTimeout(20);
    const [d, onde] = await p.evaluate(() => {
      const e = window.__brumaluz!;
      const a = e.preverToque!(innerWidth / 2, innerHeight / 2).alvo;
      if (!a) return [0, ''] as const;
      const [x, y, z] = e.posicao!;
      return [Math.hypot(a.x + 0.5 - x, a.y + 0.5 - y, a.z + 0.5 - z), `${a.x},${a.y},${a.z}`] as const;
    });
    if (process.env.ESBOCO_PP_DEPURAR && pi < 0.3) console.log(`  alcance ${pi.toFixed(3)}: ${d.toFixed(2)} ${onde}`);
    maior = Math.max(maior, d);
  }
  return +maior.toFixed(2);
}

test('esboço final da primeira pessoa: a mira, o alcance e o ombro', async ({ browser }) => {
  test.skip(MODO !== 'mira', 'só com ESBOCO_PP=mira');
  mkdirSync(PASTA, { recursive: true });
  const medidas: Record<string, unknown> = {};
  for (const [nome, w, h] of [
    ['emPe', 390, 844],
    ['deitado', 844, 390],
  ] as const) {
    const { ctx, page: p } = await abrir(browser, w, h);
    // o alcance de hoje (terceira pessoa) e o da primeira pessoa, do mesmo lugar e rumo
    await olhar(p, 0.6, 0.3);
    await slot(p, 1);
    await p.waitForTimeout(800);
    const alcanceHoje = await alcance(p);
    await olhar(p, 0.6, 0.3);
    await p.click('[data-esb-olho]');
    await p.waitForTimeout(1500);
    const alcanceDentro = await alcance(p);
    await p.evaluate(() => window.__primeiraPessoa!.zerarPonta());
    const toques = await vinteToques(p, nome);
    const braco = await p.evaluate(() => window.__primeiraPessoa!.tela());
    const ponta = await p.evaluate(() => window.__primeiraPessoa!.ponta());
    medidas[nome] = {
      alcance: {
        regra: 'dos olhos do controle: o ponto atingido até 6,5 (ALCANCE_TOQUE) e o centro do bloco até 7,5 (ALCANCE_REGRAS − FOLGA); o núcleo aceita 8',
        hojeTerceiraPessoa: alcanceHoje,
        deDentro: alcanceDentro,
      },
      mira: toques,
      braco,
      ombroFora: ponta,
    };
    console.log(nome, 'alcance hoje', alcanceHoje, 'de dentro', alcanceDentro, 'braço', JSON.stringify(braco), 'ombro', JSON.stringify(ponta));
    await ctx.close();
    expect(toques.toques).toBe(20);
    expect(toques.certos).toBe(20);
    // a regra é a mesma (dos olhos do controle: o ponto atingido até 6,5 e o centro até 7,5; o
    // núcleo aceita 8): de dentro não alcança menos que hoje nem passa do que o núcleo aceita
    expect(alcanceDentro).toBeGreaterThanOrEqual(alcanceHoje - 0.05);
    expect(alcanceDentro).toBeLessThanOrEqual(7.5);
    expect(ponta.menorFolgaPx).toBeGreaterThan(0);
  }
  writeFileSync(`${PASTA}/medidas.json`, JSON.stringify(medidas, null, 1));
});

test('esboço final da primeira pessoa: o vídeo e as fotos', async ({ browser }) => {
  test.skip(MODO !== 'final', 'só com ESBOCO_PP=final');
  mkdirSync(PASTA, { recursive: true });
  const { ctx, page: p } = await abrir(browser, 390, 844);
  const f = (n: string) => p.screenshot({ path: `${PASTA}/${n}.png` });
  await olhar(p, 0.6, 0.2);
  await slot(p, 1);
  await p.waitForTimeout(1200);
  await comecarGravacao(p);
  // entra pela cabeça com o olhinho, com o bloco na mão
  await p.waitForTimeout(500);
  await p.click('[data-esb-olho]');
  await p.waitForTimeout(1300);
  await p.evaluate(() => window.__primeiraPessoa!.zerarPonta());
  // anda com o bloco
  await mover(p, 0.6);
  await p.waitForTimeout(900);
  await f('01-andando-com-bloco');
  await p.waitForTimeout(500);
  await mover(p, 0);
  await p.waitForTimeout(700);
  // a mira: olha para o chão da frente
  const [, y0] = await rot(p);
  await irPara(p, y0, 0.55, 600);
  await p.waitForTimeout(600);
  await f('02-mira');
  // três blocos: no chão (a dois passos), na parede (o lado dele) e em cima da pilha
  await tocarNoMeio(p);
  await p.waitForTimeout(110);
  await f('03-colocando');
  await p.waitForTimeout(800);
  await irPara(p, y0, 0.3, 500);
  await p.waitForTimeout(500);
  await tocarNoMeio(p);
  await p.waitForTimeout(900);
  await irPara(p, y0, 0.62, 600);
  await p.waitForTimeout(500);
  await tocarNoMeio(p);
  await p.waitForTimeout(900);
  // vira para o lado (os blocos saem da frente) e pula
  await irPara(p, y0 + 1.1, 0.15, 900);
  await p.waitForTimeout(400);
  await p.evaluate(() => window.__brumaluz!.controleDireto!.tecla('pular', true));
  await p.waitForTimeout(200);
  await p.evaluate(() => window.__brumaluz!.controleDireto!.tecla('pular', false));
  await p.waitForTimeout(60);
  await f('04-pulando');
  await p.waitForTimeout(1300);
  // acena de mão vazia (a mão entra, abana e sai)
  await slot(p, 0);
  await p.waitForTimeout(800);
  await p.evaluate(() => window.__brumaluz!.gestos!.fazer('acenar'));
  await p.waitForTimeout(800);
  await f('05-acenando');
  await p.waitForTimeout(1500);
  // come a maçã
  await slot(p, 3);
  await p.waitForTimeout(1000);
  await p.evaluate(() => window.__brumaluz!.comer!());
  await p.waitForTimeout(900);
  await f('06-comendo');
  await p.waitForTimeout(2400);
  // olha em volta, olha bem para baixo (o próprio corpo) e sai pela cabeça
  await slot(p, 1);
  await girar(p, 1.2, 0, 1200);
  await girar(p, -0.8, 0, 800);
  await irPara(p, y0 + 1.5, 1.5, 900);
  await p.waitForTimeout(700);
  await f('07-olhando-para-baixo');
  await irPara(p, y0 + 1.5, 0.2, 800);
  await p.waitForTimeout(300);
  await p.click('[data-esb-olho]');
  await p.waitForTimeout(1400);
  await pararGravacao(p, `${PASTA}/primeira-pessoa.webm`);
  const ponta = await p.evaluate(() => window.__primeiraPessoa!.ponta());
  const custo = await p.evaluate(() => window.__primeiraPessoa!.custo());
  console.log('ombro fora no vídeo', JSON.stringify(ponta), 'custo', JSON.stringify(custo));
  await ctx.close();
  expect(ponta.menorFolgaPx).toBeGreaterThan(0);
  // deitado e de noite, segurando o bloco
  for (const [nome, w, h, hora] of [
    ['deitado-segurando', 844, 390, 0.42],
    ['noite-segurando', 390, 844, 0.95],
  ] as const) {
    const { ctx: c2, page: q } = await abrir(browser, w, h, hora);
    await olhar(q, 0.6, 0.2);
    await slot(q, 1);
    await q.click('[data-esb-olho]');
    await q.waitForTimeout(1800);
    await q.screenshot({ path: `${PASTA}/${nome}.png` });
    await c2.close();
  }
});
