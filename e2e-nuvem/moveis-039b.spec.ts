import { expect, test, type Browser, type Page } from '@playwright/test';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

/**
 * Spec 039b (T05), na sala de teste da nuvem: a geladeira cheia e o fogão no meio voltam depois
 * de a sala dormir (o servidor dorme a sala vazia em 60 s: salva e sai da memória). Pede o
 * servidor da 039b (o 20) e um site da 039b: o publicado, ou o ramo compilado com o endereço da
 * nuvem (`VITE_SERVIDOR_URL`), para conferir o servidor antes de publicar o site.
 *
 * - **NUVEM_039B=antes:** a Ana abre um mundo para amigos, faz um tablado no alto, põe a geladeira
 *   e o fogão (pelo lote: só a âncora; o núcleo monta o resto), guarda 5 pipocas na geladeira e
 *   16 milhos no fogão (8 s cada: ele fica no meio quando a sala dorme). Grava a sala, a
 *   identidade de teste e as células em `capturas-039b/t05-nuvem/sala.json` e sai.
 * - **NUVEM_039B=depois** (90 s ou mais depois do antes): a mesma Ana volta pela sala. A geladeira
 *   tem as 5 pipocas; no fogão, os milhos que sobraram e as pipocas prontas somam 16.
 * - **NUVEM_039B=tudo:** as duas fases seguidas, com a espera no meio.
 *
 *   E2E_ENV="-u 1000:1000 -e HOME=/tmp -e NUVEM_039B=antes [-e SITE=...]" \
 *     scripts/e2e-gpu.sh -c playwright.nuvem.config.ts e2e-nuvem/moveis-039b.spec.ts --trace off
 */
declare const process: { env: Record<string, string | undefined> };
const FASE = process.env.NUVEM_039B ?? '';
const PASTA = 'capturas-039b/t05-nuvem';
const ARQUIVO = `${PASTA}/sala.json`;
const PEDRA_LISA = 45;
/** Os blocos da 039b (src/world/blocks.ts): o fogão e a geladeira. */
const FOGAO = 137;
const GELADEIRA = 138;
const PIPOCAS = 5;
const MILHOS = 16;
/** A sala vazia dorme em 60 s (ESPERA_VAZIA) e grava a cada 5 s: 90 s de folga. */
const DORMIR_MS = 90_000;

type P = { x: number; y: number; z: number };
type Sala = { codigo: string; id: string; chave: string; geladeira: P; fogao: P; quando: number };

async function jogador(browser: Browser, id: string, chave: string): Promise<Page> {
  // no computador: o painel usa o shift para mandar o item inteiro
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  await ctx.addInitScript(
    ([i, c]) => {
      localStorage.setItem('terrario:identidade', JSON.stringify({ id: i, chave: c, apelido: 'Ana' }));
      HTMLElement.prototype.requestPointerLock = function () {
        return Promise.resolve();
      } as typeof HTMLElement.prototype.requestPointerLock;
    },
    [id, chave],
  );
  const p = await ctx.newPage();
  p.on('pageerror', (e) => console.log(`[Ana] erro: ${String(e)}`));
  return p;
}
const pronto = (p: Page) => p.waitForFunction(() => window.__brumaluz?.ready === true, undefined, { timeout: 240_000 });
async function entrar(p: Page) {
  const botao = p.locator('[data-entrar-mundo]');
  await Promise.race([pronto(p), botao.waitFor({ timeout: 240_000 }).then(() => botao.click())]);
  await pronto(p);
  await p.evaluate(() => document.querySelector('.entrada')?.setAttribute('hidden', ''));
}
const ir = (p: Page, x: number, z: number, y?: number) =>
  p.evaluate(({ x, y, z }) => window.__brumaluz!.teleportar!(x, z, y), { x, y, z });
const overlay = (p: Page) => p.evaluate(() => document.body.dataset.overlay ?? '');
const itemEm = (p: Page, sel: string) =>
  p.evaluate((s) => {
    const el = document.querySelector<HTMLElement>(s);
    const item = el?.dataset.item ?? '';
    // a quantidade é o texto da etiqueta `.qtd` (vazia quando é 1)
    const n = Number(el?.querySelector('.qtd')?.textContent?.trim() || 0);
    return { item, qtd: item ? n || 1 : 0 };
  }, sel);
async function clicar(p: Page, sel: string, shift = false) {
  const b = (await p.locator(sel).first().boundingBox())!;
  if (shift) await p.keyboard.down('Shift');
  await p.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
  if (shift) await p.keyboard.up('Shift');
  await p.waitForTimeout(200);
}
const slotInv = (i: number) => `.inventario .slot-inv[data-indice="${i}"]`;
/** Toca no móvel (de frente para ele, a 2,5 blocos) e espera o painel. */
async function tocar(p: Page, c: P, painel: string) {
  await ir(p, c.x + 0.5, c.z - 2.5, c.y);
  await p.waitForTimeout(400);
  await expect.poll(() => p.evaluate((c) => window.__brumaluz!.mirarBloco!(c.x, c.y, c.z), c), { timeout: 15_000 }).toBe(true);
  await p.evaluate((c) => {
    const e = window.__brumaluz!;
    e.mirarBloco!(c.x, c.y, c.z);
    e.usarOuColocar!();
  }, c);
  await expect.poll(() => overlay(p), { timeout: 15_000 }).toBe('inventario');
  await expect(p.locator(painel)).toBeVisible();
}
async function fechar(p: Page) {
  await p.keyboard.press('Escape');
  await expect.poll(() => overlay(p)).not.toBe('inventario');
}
/** O que há na geladeira (os 9 lugares) e no fogão (a entrada e a saída). */
async function conteudo(p: Page, s: Pick<Sala, 'geladeira' | 'fogao'>) {
  await tocar(p, s.geladeira, '[data-painel-gel]');
  const gel: { item: string; qtd: number }[] = [];
  for (let i = 0; i < 9; i++) gel.push(await itemEm(p, `[data-externo="gel:${i}"]`));
  await fechar(p);
  await tocar(p, s.fogao, '[data-painel-fogao]');
  const entrada = await itemEm(p, '[data-externo="fog:entrada"]');
  const saida = await itemEm(p, '[data-externo="fog:saida"]');
  await fechar(p);
  return { gel: gel.filter((g) => g.item), entrada, saida };
}

async function antes(browser: Browser): Promise<Sala> {
  mkdirSync(PASTA, { recursive: true });
  const sufixo = Date.now().toString(36);
  const id = `ana-039b-${sufixo}`;
  const chave = `chave-do-teste-na-nuvem-${id}-0123456789`;
  const ana = await jogador(browser, id, chave);
  await ana.goto('/');
  await pronto(ana);
  await ana.evaluate(() => document.querySelector('.entrada')?.setAttribute('hidden', ''));
  await ana.evaluate(() => window.dispatchEvent(new CustomEvent('brumaluz:amigos')));
  await ana.locator('[data-abrir-para-amigos]').click();
  await ana.waitForURL(/sala=/, { timeout: 120_000 });
  await pronto(ana);
  const codigo = await ana.locator('[data-codigo-mundo]').getAttribute('data-codigo-mundo', { timeout: 60_000 });
  console.log(`sala de teste: ${codigo}`);
  await ana.keyboard.press('Escape');
  await ana.waitForTimeout(3000);
  // o tablado no alto (longe das construções protegidas), 11 x 11, com o ar em cima
  const { cx, cz, Y } = await ana.evaluate((pedra) => {
    const e = window.__brumaluz!;
    const [px, , pz] = e.posicao!;
    const cx = Math.floor(px);
    const cz = Math.floor(pz);
    let alto = 0;
    for (let dx = -6; dx <= 6; dx++)
      for (let dz = -6; dz <= 6; dz++) {
        let y = 120;
        while (y > 2 && e.bloco!(cx + dx, y, cz + dz) === 0) y--;
        alto = Math.max(alto, y);
      }
    const Y = alto + 6;
    const lote: { x: number; y: number; z: number; v: number }[] = [];
    for (let dx = -5; dx <= 5; dx++)
      for (let dz = -5; dz <= 5; dz++) {
        lote.push({ x: cx + dx, y: Y, z: cz + dz, v: pedra });
        for (let dy = 1; dy <= 3; dy++) lote.push({ x: cx + dx, y: Y + dy, z: cz + dz, v: 0 });
      }
    e.editarLote!(lote);
    return { cx, cz, Y };
  }, PEDRA_LISA);
  await expect.poll(() => ana.evaluate((c) => window.__brumaluz!.bloco!(c.cx + 5, c.Y, c.cz + 5), { cx, cz, Y }), { timeout: 30_000 }).toBe(PEDRA_LISA);
  const geladeira = { x: cx - 3, y: Y + 1, z: cz + 2 };
  const fogao = { x: cx + 2, y: Y + 1, z: cz + 2 };
  await ir(ana, cx + 0.5, cz - 3.5, Y + 1);
  await ana.waitForTimeout(1000);
  // as âncoras com a direção 0 (o núcleo monta o resto)
  await ana.evaluate(
    (l) => window.__brumaluz!.editarLote!(l),
    [
      { ...geladeira, v: GELADEIRA },
      { ...fogao, v: FOGAO },
    ],
  );
  for (const [c, b] of [
    [geladeira, GELADEIRA],
    [fogao, FOGAO],
  ] as const)
    await expect.poll(() => ana.evaluate((c) => window.__brumaluz!.bloco!(c.x, c.y, c.z), c), { timeout: 30_000 }).toBe(b);
  // a comida na mochila e, pelo painel, para dentro
  await ana.evaluate(
    ({ pipocas, milhos }) => {
      const e = window.__brumaluz!;
      e.inventario!.definir(0, { item: 'pipoca', qtd: pipocas });
      e.inventario!.definir(1, { item: 'milho', qtd: milhos });
    },
    { pipocas: PIPOCAS, milhos: MILHOS },
  );
  await ana.waitForTimeout(1000);
  await tocar(ana, geladeira, '[data-painel-gel]');
  await clicar(ana, slotInv(0), true);
  await expect.poll(() => itemEm(ana, '[data-externo="gel:0"]')).toEqual({ item: 'pipoca', qtd: PIPOCAS });
  await fechar(ana);
  await tocar(ana, fogao, '[data-painel-fogao]');
  await clicar(ana, slotInv(1), true);
  await expect.poll(() => itemEm(ana, '[data-externo="fog:entrada"]').then((e) => e.item)).toBe('milho');
  await expect.poll(() => ana.evaluate(() => window.__brumaluz!.ligados!().some((e) => e.tipo === 'fogao'))).toBe(true);
  await ana.screenshot({ path: `${PASTA}/antes-fogao.jpg`, type: 'jpeg', quality: 80 });
  await fechar(ana);
  const c = await conteudo(ana, { geladeira, fogao });
  console.log(`NUVEM-039B antes ${JSON.stringify(c)}`);
  expect(c.gel).toEqual([{ item: 'pipoca', qtd: PIPOCAS }]);
  const sala: Sala = { codigo: codigo!, id, chave, geladeira, fogao, quando: Date.now() };
  writeFileSync(ARQUIVO, JSON.stringify(sala, null, 2));
  console.log(`gravado ${ARQUIVO}: ${JSON.stringify(sala)}`);
  // um tempo para o servidor gravar, e a Ana sai (a sala fica vazia e dorme em 60 s)
  await ana.waitForTimeout(6000);
  await ana.context().close();
  return sala;
}

async function depois(browser: Browser, sala: Sala) {
  const falta = sala.quando + DORMIR_MS - Date.now();
  if (falta > 0) {
    console.log(`esperando a sala dormir: ${Math.round(falta / 1000)} s`);
    await new Promise((ok) => setTimeout(ok, falta));
  }
  const ana = await jogador(browser, sala.id, sala.chave);
  await ana.goto(`/?sala=${sala.codigo}`);
  await entrar(ana);
  await ir(ana, sala.geladeira.x + 3.5, sala.geladeira.z - 5.5, sala.geladeira.y);
  await expect.poll(() => ana.evaluate((c) => window.__brumaluz!.bloco!(c.x, c.y, c.z), sala.geladeira), { timeout: 60_000 }).toBe(GELADEIRA);
  await ana.waitForTimeout(2000);
  const c = await conteudo(ana, sala);
  console.log(`NUVEM-039B depois ${JSON.stringify({ sala: sala.codigo, ...c })}`);
  await ana.screenshot({ path: `${PASTA}/depois.jpg`, type: 'jpeg', quality: 80 });
  // a geladeira cheia como ficou
  expect(c.gel).toEqual([{ item: 'pipoca', qtd: PIPOCAS }]);
  // o fogão: nada sumiu (o milho que sobrou e a pipoca pronta somam os 16)
  const milho = c.entrada.item === 'milho' ? c.entrada.qtd : 0;
  const pipoca = c.saida.item === 'pipoca' ? c.saida.qtd : 0;
  expect(c.entrada.item === '' || c.entrada.item === 'milho').toBe(true);
  expect(milho + pipoca).toBe(MILHOS);
  await ana.context().close();
}

test('a geladeira cheia e o fogão no meio voltam depois de a sala dormir', async ({ browser }) => {
  test.skip(!['antes', 'depois', 'tudo'].includes(FASE), 'só com NUVEM_039B=antes, depois ou tudo');
  test.setTimeout(900_000);
  const sala = FASE === 'depois' ? (JSON.parse(readFileSync(ARQUIVO, 'utf8')) as Sala) : await antes(browser);
  if (FASE !== 'antes') await depois(browser, sala);
});
