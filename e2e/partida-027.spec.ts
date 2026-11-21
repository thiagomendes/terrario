import { expect, test } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { criarMundo, TAMANHOS } from './guia-palco';
import { abrir, acender, ate, foto, hora, ir, medir, plano } from './vila-noite-palco';

/**
 * Spec 027 (T00 e T22): as medidas de partida, na placa de vídeo (scripts/e2e-gpu.sh), só com
 * MEDIR_027=1. Gravam em `capturas-027/partida/` (ou `MEDIR_PASTA`):
 *
 * - **carregar:** do pedido do mundo até a cortina sair (`ready`: todo o chão pedido em volta de
 *   quem nasce já tem malha), no celular em pé com a CPU 4× mais lenta, três vezes (a mediana
 *   vale); o tema vem de `MEDIR_TEMA` (padrão: a Vila Neon, a régua da spec);
 * - **pior caso da Vila Neon:** do meio do campo do festival, de noite, olhando o palco por cima
 *   do público no meio da primeira música (o pior caso da 026), sem e com a CPU 4× mais lenta:
 *   quadros, chamadas de desenho e triângulos.
 */
declare const process: { env: Record<string, string | undefined> };
test.skip(!process.env.MEDIR_027, 'só com MEDIR_027=1');
test.setTimeout(1_500_000);
test.use({ actionTimeout: 30_000 });

const PASTA = process.env.MEDIR_PASTA ?? 'capturas-027/partida';
const TEMA = process.env.MEDIR_TEMA ?? 'vila-neon';
const LENTO = 4;
const NOITE = 0.96;

function gravar(nome: string, dados: unknown) {
  mkdirSync(PASTA, { recursive: true });
  writeFileSync(`${PASTA}/${nome}.json`, `${JSON.stringify(dados, null, 2)}\n`);
}

test(`carregar ${TEMA} no celular com a CPU ${LENTO}× mais lenta`, async ({ browser }) => {
  const tempos: { total: number; pagina: number; chunks: number }[] = [];
  for (let rodada = 0; rodada < 3; rodada++) {
    const ctx = await browser.newContext(TAMANHOS.empe);
    const page = await ctx.newPage();
    const id = `partida-${rodada}`;
    await criarMundo(page, id, TEMA, {}, 1337);
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: LENTO });
    const t0 = Date.now();
    await page.goto(`/?mundo=${id}`);
    await page.waitForFunction(() => window.__brumaluz?.ready === true, undefined, {
      timeout: 600_000,
      polling: 50,
    });
    const total = Date.now() - t0;
    const r = await page.evaluate(() => ({
      pagina: Math.round(performance.now()),
      chunks: window.__brumaluz!.chunksCarregados ?? 0,
    }));
    tempos.push({ total, ...r });
    console.log(`CARREGAR ${TEMA} rodada ${rodada}: ${total} ms (página ${r.pagina} ms, ${r.chunks} chunks)`);
    await ctx.close();
  }
  const ordenados = tempos.map((t) => t.total).sort((a, b) => a - b);
  const mediana = ordenados[1];
  gravar(`carregar-${TEMA}`, {
    tema: TEMA,
    tela: '390x844 (celular em pé)',
    cpu: `${LENTO}x mais lenta`,
    criterio: 'do goto do mundo até a cortina sair (window.__brumaluz.ready)',
    rodadas: tempos,
    medianaMs: mediana,
    quando: new Date().toISOString(),
  });
  console.log(`CARREGAR ${TEMA} mediana ${mediana} ms`);
  expect(tempos.every((t) => t.chunks > 0)).toBe(true);
});

test('o pior caso da Vila Neon, de noite, sem e com a CPU 4× mais lenta', async ({ browser }) => {
  test.skip(TEMA !== 'vila-neon', 'o pior caso medido aqui é o da Vila Neon');
  const page = await abrir(browser, 'partida-pior', 'empe', 3);
  const p = await plano(page);
  const H = p.h + 1;
  await hora(page, NOITE);
  await page.waitForTimeout(3000);
  // o show desta noite: a turma chega à grade na abertura, e no meio da primeira música a banda
  // está inteira no palco (o mesmo caminho do teste das medidas da 026)
  await acender(page);
  await ir(page, p.ox + 60.5, p.oz + 98.4, H + 0.2);
  await page.evaluate(() => window.__brumaluz!.apontar!(0, 0.1));
  await ate(page, 30);
  await page.evaluate(() => window.__brumaluz!.pularShow!(58));
  await ate(page, 59);
  // o pior caso: do meio do campo, olhando o palco por cima do público
  await ir(page, p.ox + 60.5, p.oz + 84, H + 0.2);
  await page.evaluate(() => window.__brumaluz!.apontar!(0, 0.02));
  await page.waitForTimeout(3000);
  const normal = await medir(page, 'partida-vila-pior-caso');
  await foto(page, 'vila-pior-caso', true);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: LENTO });
  await page.waitForTimeout(4000);
  const lento = await medir(page, 'partida-vila-pior-caso-cpu4');
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  gravar('pior-caso-vila-neon', {
    lugar: 'meio do campo do festival, de noite, olhando o palco por cima do público (show)',
    tela: '390x844 (celular em pé), distância 3',
    semDesacelerar: normal,
    cpu4: lento,
    quando: new Date().toISOString(),
  });
  expect(normal.desenhos).toBeGreaterThan(0);
  await page.context().close();
});
