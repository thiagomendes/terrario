import { expect, test, type Browser, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { ARTE_CANTO } from '../src/ui/alma/arteCanto';
import {
  abrirMundo,
  andarPelaTrilha,
  assentar,
  escolherNaRoda,
  tocar,
  type Tamanho,
} from './guia-palco';

/**
 * Spec 031: as missões da Era dos Dinos e do Doce Reino. Fase 1 (o que se vê): o canto das
 * missões perto do nascer, o ninho de gravetos com os ovinhos de dino e os cartões do quadro
 * (o resultado à direita, a próxima missão aparecendo um pedacinho). Fotos em MISSOES_PASTA.
 */
declare const process: { env: Record<string, string | undefined> };
const PASTA = process.env.MISSOES_PASTA ?? 'test-results/missoes-dinos-doce';
mkdirSync(PASTA, { recursive: true });

async function abrir(browser: Browser, id: string, tema: string, tamanho: Tamanho): Promise<Page> {
  const page = await abrirMundo(browser, { id, tema, tamanho });
  await page.addStyleTag({ content: '.dica-mira { display: none !important; }' });
  await assentar(page);
  await page.waitForFunction(() => !!window.__guia, undefined, { timeout: 30_000 });
  await page.waitForTimeout(1500);
  return page;
}

/** Vira a câmera para o meio do canto (como a criança que olha em volta). */
async function olharCanto(page: Page, pitch = 0.32): Promise<void> {
  await page.evaluate((pitch) => {
    const e = window.__brumaluz!;
    const c = e.canto!()!;
    const p = e.jogadorPes!();
    e.apontar!(Math.atan2(c.x - p[0], c.z - p[2]) - 0.25, pitch);
  }, pitch);
  await page.waitForTimeout(900);
}

/** Leva o boneco para perto de um ponto, olhando para ele (as fotos de perto). */
async function chegarPerto(
  page: Page,
  alvo: [number, number, number],
  dist: number,
  lado: number,
  pitch: number,
): Promise<void> {
  await page.evaluate(
    ({ alvo, dist, lado, pitch }) => {
      const e = window.__brumaluz!;
      const c = e.canto!()!;
      const n = { x: c.x - Math.sin(c.yaw) * 12, z: c.z - Math.cos(c.yaw) * 12 };
      const a = Math.atan2(n.x - alvo[0], n.z - alvo[2]) + lado;
      const x = alvo[0] + Math.sin(a) * dist;
      const z = alvo[2] + Math.cos(a) * dist;
      e.teleportar!(x, z);
      e.apontar!(Math.atan2(alvo[0] - x, alvo[2] - z) - 0.3, pitch);
    },
    { alvo, dist, lado, pitch },
  );
  await page.waitForTimeout(1800);
}

async function quadro(page: Page, nome: string): Promise<void> {
  await escolherNaRoda(page, 'missoes');
  await page.waitForSelector('[data-alma-quadro]', { timeout: 20_000 });
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${PASTA}/${nome}-quadro.png` });
  await page.locator('[data-alma-quadro]').screenshot({ path: `${PASTA}/${nome}-cartoes.png` });
}

for (const [tema, nome, primeira] of [
  ['era-dos-dinos', 'dinos', 'd1'],
  ['doce-reino', 'doce', 'e1'],
] as const)
  for (const tamanho of ['deitado', 'empe'] as const)
    test(`fase 1: ${nome}, ${tamanho}: o canto, o quadro e o começo da trilha`, async ({
      browser,
    }) => {
      test.setTimeout(400_000);
      const page = await abrir(browser, `m031-${nome}-${tamanho}`, tema, tamanho);
      const canto = await page.evaluate(() => window.__brumaluz!.canto?.() ?? null);
      expect(canto).not.toBeNull();
      // o canto fica perto do nascer (a trilha curta)
      const d = await page.evaluate(() => {
        const e = window.__brumaluz!;
        const c = e.canto!()!;
        const p = e.jogadorPes!();
        return Math.hypot(c.x - p[0], c.z - p[2]);
      });
      console.log(`m031: ${nome} ${tamanho}: canto a ${d.toFixed(1)} blocos do nascer`);
      expect(d).toBeLessThan(18);
      await page.screenshot({ path: `${PASTA}/${nome}-${tamanho}-nascer.png` });
      await olharCanto(page);
      await page.screenshot({ path: `${PASTA}/${nome}-${tamanho}-canto.png` });
      await quadro(page, `${nome}-${tamanho}`);
      // o quadro: as duas da vez e a próxima só um pedacinho (Dinos tem 3)
      const n = await page.locator('[data-alma-quadro] .alma-oferta').count();
      expect(n).toBe(nome === 'dinos' ? 3 : 2);
      if (nome === 'dinos') {
        // o pedaço da próxima: pelo menos 60 px do desenho dela à vista, fora do X e da beira
        const m = await page.evaluate(() => {
          const g = document.querySelector('.alma-quadro')!.getBoundingClientRect();
          const t = document.querySelector('[data-missao-espera] .tarefa')!.getBoundingClientRect();
          const x = document
            .querySelector('[data-alma-quadro] > .alma-fechar')!
            .getBoundingClientRect();
          const SOME = 34;
          // a parte do desenho que se vê: dentro da grade, antes da beira que some
          const v = {
            l: Math.max(t.left, g.left),
            r: Math.min(t.right, g.right - SOME),
            t: Math.max(t.top, g.top),
            b: Math.min(t.bottom, g.bottom - (innerWidth <= 560 ? SOME : 0)),
          };
          // fora do X
          const livreX = x.bottom <= v.t || x.left >= v.r ? v.r - v.l : Math.max(x.left - v.l, 0);
          const livreY = v.b - v.t;
          return { livreX: Math.round(livreX), livreY: Math.round(livreY) };
        });
        console.log(`m031: ${tamanho}: pedaço da próxima à vista ${m.livreX} x ${m.livreY} px`);
        expect(Math.min(m.livreX, m.livreY)).toBeGreaterThanOrEqual(60);
      }
      await tocar(page, `[data-alma-jogar="${primeira}"]`);
      await page.waitForTimeout(3500);
      await page.screenshot({ path: `${PASTA}/${nome}-${tamanho}-trilha.png` });
      if (nome === 'dinos') {
        const ovos = await page.evaluate(
          () => window.__brumaluz!.itensNoChao!().filter((i) => i.item === 'ovo').length,
        );
        console.log(`m031: ovinhos no chão ${ovos}`);
        expect(ovos).toBe(3);
        // de 6 blocos o ovinho tem pelo menos ~48 px de altura na tela (a régua do consultor)
        const px = await page.evaluate(() => {
          const e = window.__brumaluz!;
          const o = e.canto!()!.ovos[0];
          const p = e.jogadorPes!();
          const d = Math.hypot(o[0] - p[0], o[2] - p[2]);
          const a = e.telaDoPonto!(o[0], o[1], o[2]);
          const b = e.telaDoPonto!(o[0], o[1] + 0.59, o[2]);
          return { d, h: a && b ? Math.abs(a.y - b.y) : 0 };
        });
        // a 6 blocos, na tela do celular (2 pixels por ponto)
        const a6 = (px.h * px.d) / 6;
        console.log(
          `m031: ${tamanho}: ovinho a ${px.d.toFixed(1)} blocos, ${px.h.toFixed(0)} pt; a 6 blocos ${a6.toFixed(0)} pt (${(a6 * 2).toFixed(0)} px)`,
        );
        expect(a6 * 2).toBeGreaterThanOrEqual(44);
      }
      // anda pela trilha de verdade (o joystick) até o lugar: a foto de quem chega
      const r = await andarPelaTrilha(page, 60_000);
      console.log(`m031: ${nome} ${tamanho}: chegou=${r.chegou} em ${r.s.toFixed(1)} s`);
      await page.waitForTimeout(1600);
      await page.screenshot({ path: `${PASTA}/${nome}-${tamanho}-chegou.png` });
      if (tamanho === 'deitado' && nome === 'doce') {
        // o bolo de perto, de frente (a mesa à direita do boneco)
        await page.evaluate(() => {
          const e = window.__brumaluz!;
          const m = e.canto!()!.mesa!;
          const p = e.jogadorPes!();
          const mx = (m.x0 + m.x1 + 1) / 2;
          const mz = (m.z0 + m.z1 + 1) / 2;
          e.apontar!(Math.atan2(mx - p[0], mz - p[2]) - 0.35, 0.45);
        });
        await page.waitForTimeout(1200);
        await page.screenshot({ path: `${PASTA}/doce-bolo-fantasma.png` });
      }
      if (tamanho === 'deitado' && nome === 'dinos') {
        // de perto: o ninho e os ovinhos (dinos), a mesa do bolo (doce)
        const c = canto!;
        const alvo: [number, number, number] = [c.ninho![0], c.ninho![1], c.ninho![2]];
        await chegarPerto(page, alvo, 5.5, 1.2, 0.55);
        await page.screenshot({ path: `${PASTA}/${nome}-perto.png` });
        {
          const k = c.caixa!;
          await chegarPerto(page, [(k.x0 + k.x1 + 1) / 2, k.y, (k.z0 + k.z1 + 1) / 2], 5, 0.6, 0.6);
          await page.screenshot({ path: `${PASTA}/dinos-caixa.png` });
        }
      }
      await page.context().close();
    });

test('fase 1: os desenhos novos, grandes (a folha para o consultor)', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 1200, height: 900 } });
  const page = await ctx.newPage();
  const caixas = Object.entries(ARTE_CANTO)
    .map(
      ([nome, svg]) =>
        `<div class="c"><div class="d">${svg}</div><div class="p">${svg}</div>${nome}</div>`,
    )
    .join('');
  await page.setContent(`<!doctype html><style>
    body { margin: 0; background: #f3e4c4; font: 700 12px system-ui; color: #5a3a22; }
    .f { display: flex; flex-wrap: wrap; gap: 14px; padding: 18px; }
    .c { width: 170px; display: grid; justify-items: center; gap: 4px; background: #fffaf0; border-radius: 16px; padding: 8px; box-shadow: 0 0 0 3px #f0d9b0; }
    .d { width: 128px; height: 128px; } .p { width: 34px; height: 34px; }
    svg { width: 100%; height: 100%; display: block; }
  </style><div class="f">${caixas}</div>`);
  await page.locator('.f').screenshot({ path: `${PASTA}/desenhos.png` });
  await ctx.close();
});

// ------------------------------------------------------------------ fase 2: de ponta a ponta
const VIDEO = !!process.env.MISSOES_VIDEO;
const moedasReais = (page: Page) =>
  page.evaluate(
    () =>
      (window as unknown as { __almaCrianca: { perfil: { moedas: number } } }).__almaCrianca.perfil
        .moedas,
  );

/** Filma a tela (~8 quadros por segundo) e grava o som do jogo junto (a montagem é à parte). */
async function filmar(page: Page, nome: string, segundos: number) {
  if (!VIDEO) return async () => undefined;
  const dir = `${PASTA}/quadros-${nome}`;
  mkdirSync(dir, { recursive: true });
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
    const r = await som.catch(() => null);
    if (!r) return console.log(`m031: ${nome} sem som`);
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

/** A mãozinha de agora (a do canto ou a do bolo) e quanto ela demorou desde a chegada. */
async function esperarMao(
  page: Page,
  teto = 4000,
): Promise<{ x: number; y: number; s: number } | null> {
  return page.evaluate(async (teto) => {
    const g = window.__guia!;
    const c = (window as unknown as { __canto: { mao(): { x: number; y: number } | null } })
      .__canto;
    const t0 = performance.now();
    let chegou = g.chegou() ? t0 : 0;
    while (performance.now() - t0 < teto) {
      if (!chegou && g.chegou()) chegou = performance.now();
      const m = c.mao() ?? g.mao();
      if (m && chegou) return { ...m, s: (performance.now() - chegou) / 1000 };
      await new Promise((r) => setTimeout(r, 50));
    }
    return null;
  }, teto);
}

async function festa(page: Page, foto?: string): Promise<void> {
  await page.waitForSelector('[data-alma-festa]', { timeout: 25_000 });
  await page.waitForTimeout(2200);
  if (foto) await page.screenshot({ path: `${PASTA}/${foto}` });
  // a festa da missão e as que vêm junto (o nível, a estrela da habilidade): ✓ em cada uma, até
  // a tela ficar sem festa por um tempinho
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

const feitaNoNucleo = (page: Page, id: string) =>
  page.evaluate(
    (id) =>
      !!document.querySelector('[data-alma-festa]') ||
      !window.__guia ||
      window.__guia.missao() !== id,
    id,
  );

/**
 * Faz a missão como uma criança: anda pela trilha (o joystick de verdade) e, no lugar, toca
 * onde a mãozinha mostra (o toque de verdade na tela). Devolve as medidas.
 */
async function fazer(
  page: Page,
  id: string,
  fotos: string,
): Promise<{ s: number; maos: number[]; toques: number }> {
  const t0 = Date.now();
  const maos: number[] = [];
  let toques = 0;
  let foto = 0;
  for (let volta = 0; volta < 30; volta++) {
    if (await page.locator('[data-alma-festa]').count()) break;
    if (await feitaNoNucleo(page, id)) break;
    const r = await andarPelaTrilha(page, 40_000);
    console.log(`m031: ${id} trilha ${r.alvo} chegou=${r.chegou} ${r.s.toFixed(1)} s`);
    if (id === 'd1') {
      // o ovinho vem sozinho para a mochila
      await page.waitForTimeout(1300);
      if (foto++ === 0) await page.screenshot({ path: `${PASTA}/${fotos}-ovo.png` });
      continue;
    }
    const m = await esperarMao(page);
    if (!m) {
      const dbg = await page.evaluate(() => {
        const e = window.__brumaluz!;
        const c = (window as unknown as { __canto: { alvos(): unknown[] } }).__canto;
        return JSON.stringify({
          chegou: window.__guia!.chegou(),
          alvo: window.__guia!.alvo()?.chave,
          lib: e.boloLiberado,
          fp: (e.fantasmasPerto?.() ?? []).length,
          alvos: c.alvos().length,
          ov: document.body.dataset.overlay ?? '',
          motivo: window.__guia!.motivoMao?.(),
          pes: e.jogadorPes!().map((v) => v.toFixed(1)),
        });
      });
      console.log(`m031: ${id} sem mãozinha ${dbg}`);
      await page.waitForTimeout(600);
      continue;
    }
    maos.push(m.s);
    if (foto++ === 0) {
      await page.waitForTimeout(700);
      await page.screenshot({ path: `${PASTA}/${fotos}-mao.png` });
    }
    // a criança toca onde a mãozinha mostra; a mãozinha pula para o próximo
    for (let k = 0; k < 12; k++) {
      if (await page.locator('[data-alma-festa]').count()) break;
      const p = await page.evaluate(() => {
        const c = (window as unknown as { __canto: { mao(): { x: number; y: number } | null } })
          .__canto;
        return c.mao() ?? window.__guia!.mao();
      });
      if (!p) break;
      await page.waitForTimeout(450);
      await page.touchscreen.tap(p.x, p.y);
      toques++;
      await page.waitForTimeout(id === 'e1' ? 750 : 1300);
    }
  }
  return { s: (Date.now() - t0) / 1000, maos, toques };
}

async function escolher(page: Page, id: string): Promise<void> {
  const ok = await page
    .waitForFunction(() => !document.body.dataset.overlay, undefined, { timeout: 15_000 })
    .then(() => true)
    .catch(() => false);
  if (!ok) {
    console.log(
      `m031: overlay preso: ${await page.evaluate(() => `${document.body.dataset.overlay} ${document.body.className}`)}`,
    );
    await page.screenshot({ path: `${PASTA}/preso-${id}.png` });
  }
  await escolherNaRoda(page, 'missoes');
  await page.waitForSelector('[data-alma-quadro]', { timeout: 20_000 });
  await page.waitForTimeout(800);
  await tocar(page, `[data-alma-jogar="${id}"]`);
}

async function ligarSom(page: Page): Promise<void> {
  const v = page.viewportSize()!;
  await page.touchscreen.tap(v.width / 2, v.height / 3);
  await page.waitForTimeout(600);
}

for (const [tema, nome, ids] of [
  ['era-dos-dinos', 'dinos', ['d1', 'd2', 'd3']],
  ['doce-reino', 'doce', ['e1', 'e2']],
] as const)
  test(`fase 2: ${nome}, deitado: todas as missões de ponta a ponta, com moedinhas de verdade`, async ({
    browser,
  }) => {
    test.setTimeout(600_000);
    const page = await abrir(browser, `m031-f2-${nome}`, tema, 'deitado');
    await ligarSom(page);
    const parar = await filmar(page, nome, 150);
    const antes = await moedasReais(page);
    let esperado = 0;
    for (const id of ids) {
      const t0 = Date.now();
      await escolher(page, id);
      await page.waitForTimeout(2500);
      const r = await fazer(page, id, `${nome}-${id}`);
      await festa(page, `${nome}-${id}-festa.png`);
      const s = (Date.now() - t0) / 1000;
      console.log(
        `m031: ${id} feita em ${s.toFixed(0)} s; mãozinha ${r.maos.map((q) => q.toFixed(2)).join(', ')} s; toques ${r.toques}`,
      );
      expect(s).toBeLessThan(120);
      for (const q of r.maos) expect(q).toBeLessThan(1.5);
      esperado += { d1: 4, d2: 5, d3: 6, e1: 8, e2: 7 }[id];
    }
    await parar();
    const depois = await moedasReais(page);
    console.log(`m031: ${nome} moedinhas ${antes} -> ${depois}`);
    expect(depois - antes).toBeGreaterThanOrEqual(esperado);
    await page.context().close();
  });

for (const [tema, nome, id, feitas] of [
  ['era-dos-dinos', 'dinos', 'd1', []],
  ['era-dos-dinos', 'dinos', 'd2', []],
  ['era-dos-dinos', 'dinos', 'd3', ['d1', 'd2']],
  ['doce-reino', 'doce', 'e1', []],
  ['doce-reino', 'doce', 'e2', []],
] as const)
  test(`fase 2: ${id}, em pé: do brincar à festa`, async ({ browser }) => {
    test.setTimeout(400_000);
    const page = await abrir(browser, `m031-empe-${id}`, tema, 'empe');
    await ligarSom(page);
    // as de antes já feitas (a d3 só abre depois das duas primeiras)
    for (const f of feitas) {
      await escolher(page, f);
      await page.waitForTimeout(2500);
      await fazer(page, f, `${nome}-${f}-empe-antes`);
      await festa(page);
    }
    const parar = await filmar(page, `empe-${id}`, 90);
    await escolher(page, id);
    await page.waitForTimeout(2500);
    const r = await fazer(page, id, `empe-${id}`);
    await festa(page, `empe-${id}-festa.png`);
    await parar();
    console.log(
      `m031: em pé ${id}: ${r.s.toFixed(0)} s, mãozinha ${r.maos.map((q) => q.toFixed(2)).join(', ')}`,
    );
    for (const q of r.maos) expect(q).toBeLessThan(1.5);
    await page.context().close();
  });
