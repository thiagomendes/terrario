import { expect, test, type Browser, type Page } from '@playwright/test';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

/**
 * Spec 039 (T08), no site publicado e na sala de teste da nuvem: um mundo da nuvem salvo pela
 * `main` (o servidor 18, as camas de uma célula) abre no servidor da 039 com as camas convertidas,
 * sem nada sumir. Em duas fases, com a sala no meio:
 *
 * - **NUVEM_039=antes** (com o site e o servidor de antes da 039 no ar): a Ana abre um mundo para
 *   amigos, faz um tablado no alto e põe duas camas de uma célula olhando para +z: a A com a
 *   frente livre e a B com uma tábua na frente. Grava o código da sala, a identidade da Ana e as
 *   células em `capturas-039/t08-nuvem/sala.json` e sai (a sala dorme e salva).
 * - **NUVEM_039=depois** (com o servidor da 039 publicado; o site também, para a tela ler o pé):
 *   a mesma Ana volta pela sala gravada. A A virou a cama nova (a cabeceira com a parte 0 e o pé
 *   na frente com a parte 1), a B virou a curtinha (a parte 2) e a tábua da frente continua; o
 *   tablado está inteiro.
 *
 *   E2E_ENV="-u 1000:1000 -e HOME=/tmp -e NUVEM_039=antes" \
 *     scripts/e2e-gpu.sh -c playwright.nuvem.config.ts e2e-nuvem/camas-039.spec.ts --trace off
 *   (depois de publicar o servidor e o site: o mesmo com NUVEM_039=depois)
 */
declare const process: { env: Record<string, string | undefined> };
const FASE = process.env.NUVEM_039;
const PASTA = 'capturas-039/t08-nuvem';
const ARQUIVO = `${PASTA}/sala.json`;
const CAMA = 56;
const TABUAS = 7;
const PEDRA_LISA = 45;

type Sala = {
  codigo: string;
  id: string;
  chave: string;
  Y: number;
  cx: number;
  cz: number;
  quando: string;
};

async function jogador(browser: Browser, id: string, chave: string): Promise<Page> {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await ctx.addInitScript(
    ([i, c]) => {
      localStorage.setItem('terrario:identidade', JSON.stringify({ id: i, chave: c, apelido: 'Ana' }));
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
const celula = (p: Page, x: number, y: number, z: number) =>
  p.evaluate(({ x, y, z }) => ({ b: window.__brumaluz!.bloco!(x, y, z), meta: window.__brumaluz!.meta?.(x, y, z) ?? 0 }), { x, y, z });

test('antes: o mundo da nuvem com as camas de uma célula (o servidor de antes da 039)', async ({ browser }) => {
  test.skip(FASE !== 'antes', 'só com NUVEM_039=antes');
  test.setTimeout(600_000);
  mkdirSync(PASTA, { recursive: true });
  const sufixo = Date.now().toString(36);
  const id = `ana-039-${sufixo}`;
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
  // o tablado no alto (longe das construções protegidas), 9 x 9, com o ar em cima
  const lugar = await ana.evaluate(
    ({ PEDRA_LISA }) => {
      const e = window.__brumaluz!;
      const [px, , pz] = e.posicao!;
      const cx = Math.floor(px);
      const cz = Math.floor(pz);
      let alto = 0;
      for (let dx = -5; dx <= 5; dx++)
        for (let dz = -5; dz <= 5; dz++) {
          let y = 120;
          while (y > 2 && e.bloco!(cx + dx, y, cz + dz) === 0) y--;
          alto = Math.max(alto, y);
        }
      const Y = alto + 6;
      const lote: { x: number; y: number; z: number; v: number }[] = [];
      for (let dx = -4; dx <= 4; dx++)
        for (let dz = -4; dz <= 4; dz++) {
          lote.push({ x: cx + dx, y: Y, z: cz + dz, v: PEDRA_LISA });
          for (let dy = 1; dy <= 3; dy++) lote.push({ x: cx + dx, y: Y + dy, z: cz + dz, v: 0 });
        }
      e.editarLote!(lote);
      return { cx, cz, Y };
    },
    { PEDRA_LISA },
  );
  const { cx, cz, Y } = lugar;
  await expect.poll(() => celula(ana, cx + 4, Y, cz + 4).then((c) => c.b), { timeout: 30_000 }).toBe(PEDRA_LISA);
  await ana.evaluate(({ x, y, z }) => window.__brumaluz!.teleportar!(x, z, y), { x: cx + 0.5, y: Y + 1, z: cz - 2.5 });
  await ana.waitForTimeout(1500);
  // A: a cama olhando para +z (direção 0) com a frente livre; B: com uma tábua na frente
  await ana.evaluate(
    ({ cx, cz, Y, CAMA, TABUAS }) => {
      const e = window.__brumaluz!;
      e.editarLote!([
        { x: cx - 2, y: Y + 1, z: cz, v: CAMA },
        { x: cx + 2, y: Y + 1, z: cz, v: CAMA },
        { x: cx + 2, y: Y + 1, z: cz + 1, v: TABUAS },
      ]);
    },
    { cx, cz, Y, CAMA, TABUAS },
  );
  await expect.poll(() => celula(ana, cx + 2, Y + 1, cz + 1).then((c) => c.b), { timeout: 30_000 }).toBe(TABUAS);
  // o de antes: as duas camas de uma célula, a frente da A em ar
  expect(await celula(ana, cx - 2, Y + 1, cz)).toEqual({ b: CAMA, meta: 0 });
  expect((await celula(ana, cx - 2, Y + 1, cz + 1)).b).toBe(0);
  expect((await celula(ana, cx + 2, Y + 1, cz)).b).toBe(CAMA);
  await ana.screenshot({ path: `${PASTA}/antes.jpg`, type: 'jpeg', quality: 80 });
  const sala: Sala = { codigo: codigo!, id, chave, Y, cx, cz, quando: new Date().toISOString() };
  writeFileSync(ARQUIVO, JSON.stringify(sala, null, 2));
  console.log(`gravado ${ARQUIVO}: ${JSON.stringify(sala)}`);
  // um tempo para o servidor gravar, e a Ana sai (a sala dorme e salva)
  await ana.waitForTimeout(5000);
  await ana.context().close();
});

test('depois: as camas viram a nova ou a curtinha, e nada some (o servidor da 039)', async ({ browser }) => {
  test.skip(FASE !== 'depois', 'só com NUVEM_039=depois');
  test.setTimeout(600_000);
  const sala = JSON.parse(readFileSync(ARQUIVO, 'utf8')) as Sala;
  const { cx, cz, Y } = sala;
  const ana = await jogador(browser, sala.id, sala.chave);
  await ana.goto(`/?sala=${sala.codigo}`);
  await entrar(ana);
  await ana.evaluate(({ x, y, z }) => window.__brumaluz!.teleportar!(x, z, y), { x: cx + 0.5, y: Y + 1, z: cz - 2.5 });
  await expect.poll(() => celula(ana, cx + 4, Y, cz + 4).then((c) => c.b), { timeout: 60_000 }).toBe(PEDRA_LISA);
  await ana.waitForTimeout(2000);
  const a = await celula(ana, cx - 2, Y + 1, cz);
  const aPe = await celula(ana, cx - 2, Y + 1, cz + 1);
  const b = await celula(ana, cx + 2, Y + 1, cz);
  const bFrente = await celula(ana, cx + 2, Y + 1, cz + 1);
  const tablado = await ana.evaluate(
    ({ cx, cz, Y }) => {
      let n = 0;
      for (let dx = -4; dx <= 4; dx++) for (let dz = -4; dz <= 4; dz++) if (window.__brumaluz!.bloco!(cx + dx, Y, cz + dz) !== 0) n++;
      return n;
    },
    { cx, cz, Y },
  );
  console.log(`NUVEM-039 ${JSON.stringify({ sala: sala.codigo, a, aPe, b, bFrente, tablado })}`);
  await ana.screenshot({ path: `${PASTA}/depois.jpg`, type: 'jpeg', quality: 80 });
  // A: a cama nova (a cabeceira na parte 0, olhando para +z; o pé na frente, parte 1)
  expect(a).toEqual({ b: CAMA, meta: 0 });
  expect(aPe).toEqual({ b: CAMA, meta: 1 << 2 });
  // B: a curtinha (parte 2), e a tábua da frente continua
  expect(b).toEqual({ b: CAMA, meta: 2 << 2 });
  expect(bFrente.b).toBe(TABUAS);
  expect(tablado).toBe(81);
  await ana.context().close();
});
