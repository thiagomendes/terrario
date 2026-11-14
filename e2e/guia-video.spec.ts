import { test, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { abrirMundo, andarPelaTrilha, assentar, escolherNaRoda, tocar } from './guia-palco';

/**
 * Spec 030: os vídeos para o dono (só com GUIA_VIDEO=1): a c3 inteira no celular deitado e a
 * r1 no Rancho, com o som do jogo de verdade (gravado da saída do motor). Quadros a ~8 por
 * segundo em GUIA_PASTA/quadros-<nome>, com tempos.json e som.wav (a montagem é à parte).
 */
declare const process: { env: Record<string, string | undefined> };
const PASTA = process.env.GUIA_PASTA ?? 'test-results/guia-video';
const VIDEO = !!process.env.GUIA_VIDEO;

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

/** Filma a tela (~8 quadros por segundo) e grava o som do jogo junto. */
async function filmar(page: Page, nome: string, segundos: number) {
  const dir = `${PASTA}/quadros-${nome}`;
  mkdirSync(dir, { recursive: true });
  // o som: a saída do motor do jogo, desde agora
  const som = page.evaluate((s) => window.__brumaluz!.gravarSom!(s), segundos);
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
    const r = await som;
    if (!r) return console.log(`guia-video: ${nome} sem som`);
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

test('vídeo: c3 inteira no celular deitado, com som', async ({ browser }) => {
  test.skip(!VIDEO, 'só com GUIA_VIDEO=1');
  test.setTimeout(600_000);
  const page = await abrirMundo(browser, {
    id: 'guia-video-c3',
    tema: 'cidade-grande',
    extras: { obras: obrasFeitas([1, 2]), alma: alma(['c1', 'c2']) },
    tamanho: 'deitado',
  });
  await assentar(page);
  // o primeiro toque liga o som (como no celular)
  await page.touchscreen.tap(422, 200);
  await page.waitForTimeout(800);
  const parar = await filmar(page, 'c3', 85);
  await page.waitForTimeout(1500);
  await escolherNaRoda(page, 'missoes');
  await page.waitForSelector('[data-alma-quadro]', { timeout: 20_000 });
  await page.waitForTimeout(1500);
  await tocar(page, '[data-alma-jogar="c3"]');
  await page.waitForTimeout(3000);
  for (let k = 0; k < 3; k++) {
    const r = await andarPelaTrilha(page, 90_000);
    console.log(`guia-video: c3 ${r.alvo} ${r.s.toFixed(1)} s`);
    await page.waitForTimeout(1800);
  }
  await page.waitForSelector('[data-alma-festa]', { timeout: 20_000 });
  await page.waitForTimeout(2500);
  await tocar(page, '[data-alma-oba]');
  await page.waitForTimeout(4500);
  await parar();
  await page.context().close();
});

test('vídeo: r1 no Rancho, celular deitado, com som', async ({ browser }) => {
  test.skip(!VIDEO, 'só com GUIA_VIDEO=1');
  test.setTimeout(600_000);
  const page = await abrirMundo(browser, {
    id: 'guia-video-r1',
    tema: 'rancho-alegre',
    tamanho: 'deitado',
  });
  await assentar(page);
  await page.touchscreen.tap(422, 200);
  await page.waitForTimeout(800);
  const parar = await filmar(page, 'r1', 75);
  await page.waitForTimeout(1500);
  await escolherNaRoda(page, 'missoes');
  await page.waitForSelector('[data-alma-quadro]', { timeout: 20_000 });
  await page.waitForTimeout(1500);
  await tocar(page, '[data-alma-jogar="r1"]');
  await page.waitForTimeout(3000);
  const r = await andarPelaTrilha(page, 60_000);
  console.log(`guia-video: r1 ${r.alvo} ${r.s.toFixed(1)} s`);
  await page.waitForTimeout(1000);
  // colhe o que está maduro, devagar (como a criança), até a missão acabar
  const pular: string[] = [];
  for (let k = 0; k < 14; k++) {
    if (await page.locator('[data-alma-festa]').count()) break;
    const r = await page.evaluate(async (pular) => {
      const e = window.__brumaluz!;
      const [px, py, pz] = e.jogadorPes!();
      let melhor: [number, number, number] | null = null;
      for (let dx = -7; dx <= 7; dx++)
        for (let dz = -7; dz <= 7; dz++)
          for (let dy = -1; dy <= 1; dy++) {
            const x = Math.floor(px) + dx;
            const y = Math.floor(py) + dy;
            const z = Math.floor(pz) + dz;
            if (![72, 76].includes(e.bloco!(x, y, z)) || pular.includes(`${x},${y},${z}`)) continue;
            if (!melhor || Math.hypot(x - px, z - pz) < Math.hypot(melhor[0] - px, melhor[2] - pz))
              melhor = [x, y, z];
          }
      if (!melhor) return 'nada';
      const [x, y, z] = melhor;
      const d = Math.hypot(x + 0.5 - px, z + 0.5 - pz);
      // chega perto andando (pelo corredor), até uns 2 blocos
      for (let t = 0; t < 40; t++) {
        const q = e.jogadorPes!();
        const dd = Math.hypot(x + 0.5 - q[0], z + 0.5 - q[2]);
        if (dd < 2.2) break;
        e.apontar!(Math.atan2(x + 0.5 - q[0], z + 0.5 - q[2]), 0.5);
        e.controleDireto!.mover(0.6, 0);
        await new Promise((r) => setTimeout(r, 80));
      }
      e.controleDireto!.mover(0, 0);
      await new Promise((r) => setTimeout(r, 250));
      e.mirarPonto!(x + 0.5, y + 0.4, z + 0.5);
      e.minerar!(0.6, true);
      await new Promise((r) => setTimeout(r, 900));
      return [72, 76].includes(e.bloco!(x, y, z)) ? `não ${x},${y},${z}` : `colheu ${d.toFixed(1)}`;
    }, pular);
    if (r.startsWith('não ')) pular.push(r.slice(4));
    console.log(`guia-video: r1 ${r}`);
    if (r === 'nada') break;
    await page.waitForTimeout(1300);
  }
  await page.waitForSelector('[data-alma-festa]', { timeout: 20_000 }).catch(() => undefined);
  await page.waitForTimeout(2500);
  const oba = page.locator('[data-alma-oba]');
  if (await oba.count()) await oba.first().tap();
  await page.waitForTimeout(4500);
  await parar();
  await page.context().close();
});
