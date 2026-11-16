import { expect, test, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { abrirMundo, assentar } from './guia-palco';

/**
 * Spec 026 (os acertos do dono, 16 nov 2026):
 *
 * - **Os patins são uma escolha:** ninguém entra no mundo de patins (nem com o mundo salvo de
 *   patins, nem com a fantasia Patinadora), entrar no rinque não calça, arrastar o dedo por cima
 *   do suporte não calça; o toque no suporte calça, outro toque tira, e "Tirar patins" aparece na
 *   roda só de patins e tira em qualquer lugar.
 * - **A roda sem encosto:** na Vila Neon, com a roda mais cheia (o menu com as missões, o baú, a
 *   lojinha e "Tirar patins"; os gestos com os presentes de nível e o roqueiro), nenhum botão e
 *   nenhum nome encosta em outro nem sai da tela, no celular em pé e deitado, em tela pequena e
 *   no computador (as caixas de verdade, medidas na página).
 */
declare const process: { env: Record<string, string | undefined> };
test.setTimeout(600_000);
test.use({ actionTimeout: 30_000 });
const PASTA = process.env.VILA_PASTA ?? 'test-results/vila-ajustes';

const dePatins = (page: Page) =>
  page.evaluate(() => !!window.__brumaluz!.personagem?.aparencia().patins);

/** O ponto do suporte dos patins na tela (com a criança na frente dele, olhando para ele). */
async function irAoSuporte(page: Page): Promise<{ x: number; y: number }> {
  await page.evaluate(() => {
    const e = window.__brumaluz!;
    const p = e.vila!()!;
    const [x, , z] = p.pontos.patins;
    e.voar?.(false);
    e.teleportar!(x, z - 1.2, p.h + 1.2);
    e.apontar!(0, -0.1);
  });
  await page.waitForTimeout(1200);
  const t = await page.evaluate(() => {
    const e = window.__brumaluz!;
    const [x, y, z] = e.vila!()!.pontos.patins;
    return e.telaDoPonto!(x, y + 1, z);
  });
  expect(t).not.toBeNull();
  return t!;
}

/** Um dedo que desce em (x, y), anda (dx, dy) e sobe depois de `ms` (o toque de verdade da tela). */
async function dedo(page: Page, x: number, y: number, dx: number, dy: number, ms: number) {
  await page.evaluate(
    async ([x, y, dx, dy, ms]) => {
      const alvo = document.getElementById('cena')!;
      const ev = (tipo: string, cx: number, cy: number) =>
        alvo.dispatchEvent(
          new PointerEvent(tipo, {
            pointerId: 41,
            pointerType: 'touch',
            isPrimary: true,
            clientX: cx,
            clientY: cy,
            bubbles: true,
            cancelable: true,
          }),
        );
      ev('pointerdown', x, y);
      const passos = 6;
      for (let i = 1; i <= passos; i++) {
        await new Promise((r) => setTimeout(r, ms / passos));
        if (dx || dy) ev('pointermove', x + (dx * i) / passos, y + (dy * i) / passos);
      }
      ev('pointerup', x + dx, y + dy);
    },
    [x, y, dx, dy, ms] as const,
  );
  await page.waitForTimeout(500);
}

test('Vila Neon: os patins são uma escolha (o suporte calça e tira; a roda tira)', async ({
  browser,
}) => {
  mkdirSync(PASTA, { recursive: true });
  // o mundo salvo de antes, com a criança de patins: ela entra sem eles
  const page = await abrirMundo(browser, {
    id: 'vila-patins',
    tema: 'vila-neon',
    extras: { patins: true, alma: { local: { feitas: ['f1', 'f2'] } } },
    tamanho: 'deitado',
  });
  await assentar(page);
  expect(await dePatins(page)).toBe(false);

  // a fantasia Patinadora não calça sozinha
  await page.evaluate(() =>
    window.__brumaluz!.personagem!.definir({ fantasia: { id: 'patinadora', cor: 0 } } as never),
  );
  await page.waitForTimeout(600);
  expect(await dePatins(page)).toBe(false);

  // entrar no rinque e andar pela pista não calça
  await page.evaluate(() => {
    const e = window.__brumaluz!;
    const p = e.vila!()!;
    const r = p.pontos.rinque;
    e.teleportar!((r.x0 + r.x1) / 2 + 0.5, (r.z0 + r.z1) / 2 + 0.5, p.h + 1.2);
  });
  await page.waitForTimeout(1500);
  expect(await dePatins(page)).toBe(false);

  // na frente do suporte: o dedo que arrasta por cima dele (virar a câmera) não calça, nem o
  // dedo que fica parado nele
  let t = await irAoSuporte(page);
  await dedo(page, t.x, t.y, 90, 10, 240);
  expect(await dePatins(page)).toBe(false);
  t = await irAoSuporte(page);
  await dedo(page, t.x, t.y, 0, 0, 1200);
  expect(await dePatins(page)).toBe(false);
  expect(await page.evaluate(() => window.__brumaluz!.patinsTrocas ?? 0)).toBe(0);

  // o toque de verdade calça (com a festinha) ...
  t = await irAoSuporte(page);
  await page.touchscreen.tap(t.x, t.y);
  await page.waitForFunction(() => !!window.__brumaluz!.personagem?.aparencia().patins);
  expect(await page.evaluate(() => window.__brumaluz!.patinsTrocas)).toBe(1);
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${PASTA}/patins-calcou.png` });
  // ... e o outro toque tira
  await page.waitForTimeout(900);
  t = await irAoSuporte(page);
  await page.touchscreen.tap(t.x, t.y);
  await page.waitForFunction(() => !window.__brumaluz!.personagem?.aparencia().patins);
  expect(await page.evaluate(() => window.__brumaluz!.patinsTrocas)).toBe(2);

  // sem patins a roda não tem "Tirar patins"
  await page.waitForTimeout(700);
  await page.locator('.menu-hud.botao-roda').tap();
  await page.waitForSelector('.roda.aberta button.ativo[data-item="mapa"]');
  expect(await page.locator('.roda.aberta button.ativo[data-item="tirar-patins"]').count()).toBe(0);
  await page.locator('.menu-hud.botao-roda').tap();
  await page.waitForFunction(() => !window.__brumaluz!.gestos!.roda());
  await page.waitForTimeout(500);

  // calça de novo e sai do rinque de patins (a escolha foi dela: continuam no pé), andando e
  // correndo como sempre
  t = await irAoSuporte(page);
  await page.touchscreen.tap(t.x, t.y);
  await page.waitForFunction(() => !!window.__brumaluz!.personagem?.aparencia().patins);
  await page.evaluate(() => {
    const e = window.__brumaluz!;
    const p = e.vila!()!;
    e.teleportar!(p.nascimento.x, p.nascimento.z, p.h + 1.2);
  });
  await page.waitForTimeout(1500);
  expect(await dePatins(page)).toBe(true);

  // longe do rinque, a roda tem "Tirar patins" (só agora), e ele tira
  await page.locator('.menu-hud.botao-roda').tap();
  const tirar = page.locator('.roda.aberta button.ativo[data-item="tirar-patins"]');
  await tirar.waitFor({ state: 'visible' });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${PASTA}/patins-roda.png` });
  await tirar.tap();
  await page.waitForFunction(() => !window.__brumaluz!.personagem?.aparencia().patins);
  expect(await page.evaluate(() => window.__brumaluz!.patinsTrocas)).toBe(4);
  await page.waitForTimeout(700);
  expect(await page.evaluate(() => window.__brumaluz!.gestos!.roda())).toBe(false);
  await page.close();
});

interface CaixaTela {
  item: string;
  parte: 'botao' | 'nome';
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/** As caixas de verdade dos botões e dos nomes da roda aberta (px da tela). */
const caixas = (page: Page) =>
  page.evaluate(() => {
    const out: CaixaTela[] = [];
    for (const b of Array.from(
      document.querySelectorAll<HTMLElement>('.roda.aberta button.ativo'),
    )) {
      const item = b.dataset.item ?? '';
      const rb = b.getBoundingClientRect();
      out.push({ item, parte: 'botao', x0: rb.left, y0: rb.top, x1: rb.right, y1: rb.bottom });
      const n = b.querySelector<HTMLElement>('.nome');
      if (n) {
        const rn = n.getBoundingClientRect();
        out.push({ item, parte: 'nome', x0: rn.left, y0: rn.top, x1: rn.right, y1: rn.bottom });
      }
    }
    return out;
  });

/** Os pares que encostam (itens diferentes) e o que sai da tela. */
function conferir(cs: CaixaTela[], largura: number, altura: number) {
  const encostos: string[] = [];
  for (let i = 0; i < cs.length; i++)
    for (let j = i + 1; j < cs.length; j++) {
      const a = cs[i];
      const b = cs[j];
      if (a.item === b.item) continue;
      // (meio px de folga: as caixas da tela vêm arredondadas)
      if (a.x0 < b.x1 - 0.5 && b.x0 < a.x1 - 0.5 && a.y0 < b.y1 - 0.5 && b.y0 < a.y1 - 0.5)
        encostos.push(`${a.item}/${a.parte} × ${b.item}/${b.parte}`);
    }
  const fora = cs
    .filter((c) => c.x0 < 0 || c.y0 < 0 || c.x1 > largura || c.y1 > altura)
    .map((c) => `${c.item}/${c.parte}`);
  return { encostos, fora };
}

async function conferirRodas(page: Page, nome: string, largura: number, altura: number) {
  await page.setViewportSize({ width: largura, height: altura });
  await page.evaluate(() => window.dispatchEvent(new Event('resize')));
  await page.waitForTimeout(700);
  const botao = page.locator('.menu-hud.botao-roda');
  // o menu (com "Tirar patins": a criança está de patins)
  await botao.dispatchEvent('click');
  await page.waitForSelector('.roda.aberta button.ativo[data-item="tirar-patins"]');
  await page.waitForTimeout(650);
  let cs = await caixas(page);
  const itensMenu = new Set(cs.map((c) => c.item)).size;
  let r = conferir(cs, largura, altura);
  await page.screenshot({ path: `${PASTA}/roda-menu-${nome}.png` });
  console.log(`RODA ${nome} ${largura}x${altura} menu itens=${itensMenu} ${JSON.stringify(r)}`);
  expect(itensMenu).toBeGreaterThanOrEqual(11);
  expect(r.encostos).toEqual([]);
  expect(r.fora).toEqual([]);
  // os gestos (com os presentes de nível e o roqueiro)
  await page.locator('.roda.aberta button.ativo[data-item="gestos"]').dispatchEvent('click');
  await page.waitForSelector('.roda.aberta button.ativo[data-item="roqueiro"]');
  await page.waitForTimeout(650);
  cs = await caixas(page);
  const itensGestos = new Set(cs.map((c) => c.item)).size;
  r = conferir(cs, largura, altura);
  await page.screenshot({ path: `${PASTA}/roda-gestos-${nome}.png` });
  console.log(`RODA ${nome} ${largura}x${altura} gestos itens=${itensGestos} ${JSON.stringify(r)}`);
  // 11 gestos e o "Voltar" no meio
  expect(itensGestos).toBe(12);
  expect(r.encostos).toEqual([]);
  expect(r.fora).toEqual([]);
  // (o pedido de gestos com a roda de gestos aberta fecha a roda)
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('brumaluz:gestos')));
  await page.waitForFunction(() => !window.__brumaluz!.gestos!.roda());
  await page.waitForTimeout(300);
}

for (const [tamanho, telas] of [
  [
    'empe',
    [
      ['celular-em-pe', 390, 844],
      ['celular-pequeno-em-pe', 360, 640],
      ['celular-bem-pequeno-em-pe', 320, 568],
      ['celular-deitado', 844, 390],
      ['celular-pequeno-deitado', 667, 375],
      ['celular-bem-pequeno-deitado', 568, 320],
    ],
  ],
  [
    'pc',
    [
      ['computador', 1280, 720],
      ['computador-pequeno', 1024, 600],
    ],
  ],
] as const)
  test(`Vila Neon, ${tamanho}: na roda mais cheia nada encosta em nada`, async ({ browser }) => {
    mkdirSync(PASTA, { recursive: true });
    const page = await abrirMundo(browser, {
      id: `vila-roda-${tamanho}`,
      tema: 'vila-neon',
      extras: { alma: { local: { feitas: ['f1'] } } },
      tamanho,
    });
    await assentar(page);
    // a roda mais cheia: de patins (o item a mais) e no nível dos dois gestos de presente
    await page.evaluate(() => {
      window.__brumaluz!.vilaPatins!(true);
      window.dispatchEvent(new CustomEvent('brumaluz:almaNivel', { detail: { nivel: 10 } }));
    });
    await page.waitForTimeout(800);
    for (const [nome, l, a] of telas) await conferirRodas(page, nome, l, a);
    await page.close();
  });
