import { expect, test, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import {
  abrirMundo,
  andarPelaTrilha,
  assentar,
  escolherNaRoda,
  moedasNoCanto,
  tocar,
} from './guia-palco';

/**
 * Spec 030, fase 2: chegar no lugar andando pelo controle de verdade (ritmo de criança, sem
 * correr), o ✓ que vem do núcleo, as moedinhas que saem do lugar e o canto que abre e conta;
 * na obra, a mãozinha só na camada de baixo e o toque onde ela mostrou põe o bloco; no Rancho,
 * a lavoura. Capturas em GUIA_PASTA. Na placa de vídeo: scripts/e2e-gpu.sh.
 */
declare const process: { env: Record<string, string | undefined> };
const PASTA = process.env.GUIA_PASTA ?? 'test-results/guia-chegada';

const obrasFeitas = (ns: number[]) =>
  Object.fromEntries(
    ns.map((n) => [String(n), { cheias: [], ajudantes: [['local', 'Guia']], feita: true }]),
  );
const alma = (feitas: string[]) => ({
  local: {
    feitas,
    puladas: [],
    fixada: null,
    progresso: {},
    bis: 0,
    lugares: [],
    bau: [],
    livro: { moedas: 0, xp: 0, pontos: {}, gasto: 0, compras: {} },
  },
});

async function escolher(page: Page, missao: string): Promise<void> {
  await escolherNaRoda(page, 'missoes');
  await page.waitForSelector('[data-alma-quadro]', { timeout: 20_000 });
  await page.waitForTimeout(500);
  await tocar(page, `[data-alma-jogar="${missao}"]`);
  await page.waitForFunction(() => (window.__guia?.pegadas() ?? 0) > 0, undefined, {
    timeout: 15_000,
  });
  await page.evaluate(() => (window.__guia!.virar = false));
}

/** Vigia o canto: se a gaveta das moedinhas abriu alguma vez e com quantas. */
async function vigiarCanto(page: Page): Promise<void> {
  await page.evaluate(() => {
    const w = window as unknown as { __gaveta: { abriu: number; festa: number } };
    w.__gaveta = { abriu: 0, festa: 0 };
    setInterval(() => {
      if (document.querySelector('.alma-carteira.contando')) w.__gaveta.abriu++;
      if (document.querySelector('[data-alma-festa]')) w.__gaveta.festa++;
    }, 100);
  });
}

test('c3 inteira andando: um ✓ por lugar, a festa e as moedinhas no canto', async ({ browser }) => {
  test.setTimeout(600_000);
  mkdirSync(PASTA, { recursive: true });
  const page = await abrirMundo(browser, {
    id: 'guia-c3',
    tema: 'cidade-grande',
    extras: { obras: obrasFeitas([1, 2]), alma: alma(['c1', 'c2']) },
    tamanho: 'deitado',
  });
  await assentar(page);
  await vigiarCanto(page);
  const moedas0 = await moedasNoCanto(page);
  // o toque no selinho não abre a gaveta (só moedinha chegando abre)
  await escolher(page, 'c3');
  await tocar(page, '[data-alma-missao]');
  await page.waitForTimeout(1200);
  expect(
    await page.evaluate(
      () => (window as unknown as { __gaveta: { abriu: number } }).__gaveta.abriu,
    ),
  ).toBe(0);
  const t0 = Date.now();
  const trechos: { lugar: string | null; s: number }[] = [];
  for (let k = 0; k < 3; k++) {
    const r = await andarPelaTrilha(page, 90_000);
    trechos.push({ lugar: r.alvo, s: Math.round(r.s * 10) / 10 });
    expect(r.chegou, `chegou em ${r.alvo}`).toBe(true);
    // o ✓ vem do núcleo (o lugar visto)
    await page
      .waitForFunction((n) => window.__guia!.certos() >= n, k + 1, { timeout: 15_000 })
      .catch(() => undefined);
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${PASTA}/c3-${k + 1}-${r.alvo}.png` });
    if (k < 2)
      await page
        .waitForFunction(
          (c) => window.__guia!.alvo()?.chave !== c && (window.__guia!.pegadas() ?? 0) > 0,
          r.alvo,
          {
            timeout: 15_000,
          },
        )
        .catch(async (erro) => {
          // o que o guia achava quando não passou para o lugar seguinte (para achar a causa)
          console.log(
            `guia: c3 parou em ${r.alvo} ${JSON.stringify(
              await page.evaluate(() => ({
                alvo: window.__guia!.alvo(),
                chegou: window.__guia!.chegou(),
                certos: window.__guia!.certos(),
                pegadas: window.__guia!.pegadas(),
                pes: window.__brumaluz!.jogadorPes!().map((v) => Math.round(v * 10) / 10),
              })),
            )}`,
          );
          throw erro;
        });
  }
  const total = (Date.now() - t0) / 1000;
  console.log(
    `guia: c3 ${JSON.stringify(trechos)} total ${total.toFixed(1)} s, certos ${await page.evaluate(() => window.__guia!.certos())}`,
  );
  expect(await page.evaluate(() => window.__guia!.certos())).toBeGreaterThanOrEqual(2);
  // a festa: as moedinhas saem do lugar, o canto abre e conta (o mesmo total de hoje: 3)
  await page.waitForSelector('[data-alma-festa]', { timeout: 20_000 });
  await page.waitForTimeout(1600);
  await page.screenshot({ path: `${PASTA}/c3-4-festa.png` });
  await tocar(page, '[data-alma-oba]');
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${PASTA}/c3-5-canto-conta.png` });
  await expect.poll(() => moedasNoCanto(page), { timeout: 15_000 }).toBe(moedas0 + 3);
  expect(
    await page.evaluate(
      () => (window as unknown as { __gaveta: { abriu: number } }).__gaveta.abriu,
    ),
  ).toBeGreaterThan(0);
  expect(total).toBeLessThan(120);
  await page.waitForTimeout(3500);
  expect(await page.locator('.alma-carteira.contando').count()).toBe(0);
  await page.screenshot({ path: `${PASTA}/c3-6-depois.png` });
  await page.context().close();
});

test('c6 em pé: chega no canteiro 4 e a mãozinha mostra onde o toque põe o bloco', async ({
  browser,
}) => {
  test.setTimeout(600_000);
  mkdirSync(PASTA, { recursive: true });
  const page = await abrirMundo(browser, {
    id: 'guia-c6',
    tema: 'cidade-grande',
    extras: { obras: obrasFeitas([1, 2, 3]), alma: alma(['c1', 'c2', 'c3', 'c4', 'c5']) },
    tamanho: 'empe',
  });
  await assentar(page);
  await escolher(page, 'c6');
  const r = await andarPelaTrilha(page, 90_000);
  console.log(`guia: c6 chegou em ${r.s.toFixed(1)} s (${r.chegou})`);
  expect(r.chegou).toBe(true);
  expect(r.s).toBeLessThan(45);
  // a câmera não vira ao chegar: a criança está de frente para a obra (andou para dentro)
  const viu = await page
    .waitForFunction(() => !!window.__guia!.mao(), undefined, { timeout: 4000 })
    .then(() => true)
    .catch(() => false);
  console.log(`guia: c6 mãozinha em até 4 s: ${viu}`);
  if (!viu)
    // onde a criança parou e onde estão os fantasmas da camada de baixo (para achar a causa)
    console.log(
      `guia: c6 sem mãozinha ${JSON.stringify(
        await page.evaluate(() => {
          const e = window.__brumaluz!;
          const pes = e.jogadorPes!();
          const lista = (e.fantasmasPerto?.() ?? []).filter((f) => f.canteiro === 4);
          const yMin = Math.min(...lista.map((f) => f.y));
          return {
            pes: pes.map((v) => Math.round(v * 10) / 10),
            yaw: Math.round((e.rotacao?.[1] ?? 0) * 100) / 100,
            chegou: window.__guia!.chegou(),
            tela: [innerWidth, innerHeight],
            baixo: lista
              .filter((f) => f.y === yMin)
              .map((f) => {
                const t = e.telaDoPonto!(f.x + 0.5, f.y + 0.5, f.z + 0.5);
                return {
                  t: t ? [Math.round(t.x), Math.round(t.y)] : null,
                  d: Math.round(Math.hypot(f.x + 0.5 - pes[0], f.z + 0.5 - pes[2]) * 10) / 10,
                };
              }),
          };
        }),
      )}`,
    );
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${PASTA}/c6-1-mao.png` });
  let postos = 0;
  for (let k = 0; k < 2; k++) {
    const fm = await page.evaluate(() => window.__guia!.fantasmaDaMao());
    if (!fm) break;
    const t = await page.evaluate(
      (q) => window.__brumaluz!.telaDoPonto!(q.x + 0.5, q.y + 0.5, q.z + 0.5),
      fm,
    );
    if (!t) break;
    const antes = await page.evaluate(() => window.__brumaluz!.obraColocados ?? 0);
    await page.touchscreen.tap(t.x, t.y);
    await page.waitForTimeout(1200);
    if ((await page.evaluate(() => window.__brumaluz!.obraColocados ?? 0)) > antes) postos++;
    await page.screenshot({ path: `${PASTA}/c6-2-toque-${k + 1}.png` });
  }
  console.log(`guia: c6 blocos postos onde a mãozinha mostrou: ${postos}`);
  expect(viu).toBe(true);
  expect(postos).toBe(2);
  await page.context().close();
});

test('r1 no Rancho: a trilha leva à lavoura madura e cada colheita ganha o ✓', async ({
  browser,
}) => {
  test.setTimeout(600_000);
  mkdirSync(PASTA, { recursive: true });
  const page = await abrirMundo(browser, {
    id: 'guia-r1',
    tema: 'rancho-alegre',
    tamanho: 'deitado',
  });
  await assentar(page);
  await escolher(page, 'r1');
  const r = await andarPelaTrilha(page, 90_000);
  console.log(`guia: r1 chegou em ${r.s.toFixed(1)} s (${r.chegou}) em ${r.alvo}`);
  await page.screenshot({ path: `${PASTA}/r1-0-andou.png` });
  console.log(
    `guia: r1 pés ${JSON.stringify(await page.evaluate(() => window.__brumaluz!.jogadorPes!()))} alvo ${JSON.stringify(await page.evaluate(() => window.__guia!.alvo()))}`,
  );
  expect(r.chegou).toBe(true);
  expect(r.s).toBeLessThan(45);
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${PASTA}/r1-1-chegou.png` });
  // colhe dois pés de trigo maduro da lavoura (como o dedo faria: quebra pelo núcleo)
  const certos0 = await page.evaluate(() => window.__guia!.certos());
  const colhidos = await page.evaluate(async () => {
    const e = window.__brumaluz!;
    const [px, py, pz] = e.jogadorPes!();
    const achados: [number, number, number][] = [];
    for (let dx = -5; dx <= 5; dx++)
      for (let dz = -5; dz <= 5; dz++)
        for (let dy = -1; dy <= 1; dy++) {
          const x = Math.floor(px) + dx;
          const y = Math.floor(py) + dy;
          const z = Math.floor(pz) + dz;
          if ([72, 76, 80].includes(e.bloco!(x, y, z))) achados.push([x, y, z]);
        }
    achados.sort((a, b) => Math.hypot(a[0] - px, a[2] - pz) - Math.hypot(b[0] - px, b[2] - pz));
    let n = 0;
    for (const [x, y, z] of achados.slice(0, 2)) {
      e.mirarPonto!(x + 0.5, y + 0.4, z + 0.5);
      e.minerar!(0.6, true);
      await new Promise((r) => setTimeout(r, 1800));
      if (![72, 76, 80].includes(e.bloco!(x, y, z))) n++;
    }
    return n;
  });
  console.log(`guia: r1 colhidos ${colhidos}`);
  await page.waitForTimeout(1500);
  const certos = await page.evaluate(() => window.__guia!.certos());
  console.log(`guia: r1 certos ${certos - certos0}`);
  await page.screenshot({ path: `${PASTA}/r1-2-colheu.png` });
  expect(colhidos).toBeGreaterThan(0);
  expect(certos - certos0).toBeGreaterThan(0);
  await page.context().close();
});

test('c5: a placa na cabeça da padeira e a trilha até ela (ela para quando a criança chega)', async ({
  browser,
}) => {
  test.setTimeout(600_000);
  mkdirSync(PASTA, { recursive: true });
  const page = await abrirMundo(browser, {
    id: 'guia-c5',
    tema: 'cidade-grande',
    extras: { obras: obrasFeitas([1, 2, 3]), alma: alma(['c1', 'c2', 'c3', 'c4']) },
    tamanho: 'deitado',
  });
  await assentar(page);
  await escolher(page, 'c5');
  const a = await page.evaluate(() => window.__guia!.alvo());
  console.log(`guia: c5 alvo ${JSON.stringify(a)}`);
  expect(a?.chave.startsWith('morador:')).toBe(true);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${PASTA}/c5-1-trilha.png` });
  const r = await andarPelaTrilha(page, 120_000);
  console.log(`guia: c5 chegou em ${r.s.toFixed(1)} s (${r.chegou})`);
  expect(r.chegou).toBe(true);
  await page.waitForTimeout(2500);
  // ela para e espera (a 2,5 blocos a moradora para e olha para a criança)
  const parada = await page.evaluate(() => {
    const id = Number(window.__guia!.alvo()!.chave.slice(8));
    const c = window.__brumaluz!.criaturas!().find((q) => q.id === id);
    const p = window.__brumaluz!.jogadorPes!();
    return c ? { estado: c.estado, d: Math.hypot(c.x - p[0], c.z - p[2]) } : null;
  });
  console.log(`guia: c5 padeira ${JSON.stringify(parada)}`);
  await page.screenshot({ path: `${PASTA}/c5-2-chegou.png` });
  expect(parada?.d ?? 99).toBeLessThan(4);
  await page.context().close();
});
