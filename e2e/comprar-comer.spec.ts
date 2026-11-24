import { expect, test, type Browser, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { abrirMundo, assentar, criarMundo, type Tamanho } from './guia-palco';
import { alvoDoToque, diagnostico, esperarDica } from './vila-alvo';
import { telasDoFluxo } from './telas';

/**
 * Spec 032: comprar e comer com o dedo de verdade, no celular em pé e deitado.
 *
 * - **comprar:** cada barraca da Vila Neon (os três lanches da Bia, a vitamina da Tati, a pipoca e
 *   o algodão-doce do Seu Chico, a pipoca da Dona Cida): a dica "Toque para comprar", o toque, a
 *   entrega (a fichinha, o preparo, o pulinho) e o lanche na barrinha;
 * - **comer no criativo:** a dica "Toque para comer" na comida da mão, o toque nela e as três
 *   mordidas (a comida acaba);
 * - **comer na sobrevivência:** com fome, a fome sobe;
 * - **a barrinha cheia:** nada é comprado, nada sai da mão, o aviso aparece;
 * - **com amigos:** a Bia vê a Ana comprar (a entrega) e comer (as mordidas na comida certa).
 */
declare const process: { env: Record<string, string | undefined> };
test.setTimeout(900_000);
test.use({ actionTimeout: 30_000 });

type Balcao = { chave: string; barraca: string; item: string; p: [number, number, number] };

async function abrir(browser: Browser, id: string, tamanho: Tamanho, modo?: 'sobrevivencia'): Promise<Page> {
  const page = await abrirMundo(browser, { id, tema: 'vila-neon', tamanho, modo });
  await page.addStyleTag({ content: '.dica-mira { display: none !important; }' });
  await assentar(page);
  await page.waitForFunction(() => !!window.__vila && !!window.__brumaluz?.vilaCompras, undefined, {
    timeout: 30_000,
  });
  return page;
}
const naBarra = (page: Page, item: string) =>
  page.evaluate((item) => {
    const inv = window.__brumaluz!.inventario!;
    let n = 0;
    for (let i = 0; i < 9; i++) {
      const s = inv.obter(i);
      if (s?.item === item) n += s.qtd;
    }
    return n;
  }, item);
/** De frente para o lugar de comprar, do lado do freguês, um pouco de lado. */
async function irAoBalcao(page: Page, b: Balcao): Promise<void> {
  await page.evaluate(
    ({ p, barraca }) => {
      const e = window.__brumaluz!;
      const plano = e.vila!()!;
      const lados: Record<string, [number, number]> = {
        // (bem na frente de cada lanche do balcão da Bia: a dica é a do lanche mais perto)
        lanche: [0, 2.6],
        lanchonete: [-1.2, 3],
        // (no balcão dos carrinhos do parque: mais longe, a dica é a do brinquedo ao lado)
        pipocaParque: [0.4, 2.4],
        algodao: [-0.4, 2.4],
        pipocaPracinha: [3, 0.4],
      };
      const [dx, dz] = lados[barraca] ?? [0, 3];
      e.voar?.(false);
      e.teleportar!(p[0] + dx, p[2] + dz, plano.h + 1.2);
      e.apontar!(Math.atan2(-dx, -dz) - 0.35, 0.15);
    },
    { p: b.p, barraca: b.barraca },
  );
  await page.waitForTimeout(1500);
}
/** Compra com o dedo: a dica, o toque, a entrega e o lanche na barrinha. */
async function comprar(page: Page, b: Balcao): Promise<number> {
  await irAoBalcao(page, b);
  await esperarDica(page, b.chave, b.p);
  expect(await page.evaluate(() => window.__vila!.dica()?.texto)).toBe('Toque para comprar');
  const antes = await naBarra(page, b.item);
  const t = await alvoDoToque(page, b.chave);
  const t0 = Date.now();
  await page.touchscreen.tap(t.x, t.y);
  // a entrega começa (todos veem) e o lanche chega na barrinha em ~1,6 s
  await page
    .waitForFunction(() => (window.__brumaluz!.vilaCompras!.estado() ?? []).length > 0, undefined, {
      timeout: 5_000,
    })
    .catch(async (erro) => {
      // onde o dedo tocou e o que a tela via (para achar a causa)
      console.log(`compra: ${b.chave} não começou; toque em ${JSON.stringify(t)}; ${await diagnostico(page, b.chave)}`);
      throw erro;
    });
  await page.waitForFunction(
    ([item, n]) => {
      const inv = window.__brumaluz!.inventario!;
      let q = 0;
      for (let i = 0; i < 9; i++) if (inv.obter(i)?.item === item) q += inv.obter(i)!.qtd;
      return q > n;
    },
    [b.item, antes] as const,
    { timeout: 6_000 },
  );
  const ms = Date.now() - t0;
  // na mão (o espaço escolhido da barrinha)
  const naMao = await page.evaluate(() => {
    const e = window.__brumaluz!;
    return e.inventario!.obter(e.slotAtivo ?? 0)?.item ?? null;
  });
  expect(naMao).toBe(b.item);
  await page.waitForTimeout(700);
  return ms;
}
/** Come a comida da mão com o dedo: a dica, o toque na comida e as três mordidas. */
async function comer(page: Page, item: string): Promise<void> {
  // longe das barracas (o toque é da comida)
  await page.evaluate(() => {
    const e = window.__brumaluz!;
    const p = e.vila!()!;
    e.teleportar!(p.nascimento.x + 2, p.nascimento.z + 3, p.h + 1.2);
    e.apontar!(0.4, 0.15);
  });
  await page.waitForFunction(() => window.__dicaComer?.estado()?.texto === 'Toque para comer', undefined, {
    timeout: 15_000,
  });
  const antes = await naBarra(page, item);
  const t = await page.evaluate(() => window.__dicaComer!.estado()!.t);
  await page.touchscreen.tap(t.x, t.y);
  await page.waitForFunction((item) => window.__brumaluz!.refeicao?.()?.item === item, item, {
    timeout: 3_000,
  });
  // a dica some enquanto come (no quadro seguinte)
  await page.waitForFunction(() => window.__dicaComer!.estado() === null, undefined, { timeout: 1_000 });
  await page.waitForFunction(() => (window.__brumaluz!.refeicao?.()?.mordidas ?? 0) >= 3, undefined, {
    timeout: 4_000,
  });
  await page.waitForFunction(
    ([item, n]) => {
      const inv = window.__brumaluz!.inventario!;
      let q = 0;
      for (let i = 0; i < 9; i++) if (inv.obter(i)?.item === item) q += inv.obter(i)!.qtd;
      return q === n - 1;
    },
    [item, antes] as const,
    { timeout: 4_000 },
  );
  await page.waitForTimeout(1200);
}

// fluxo: só o celular em pé (ver e2e/telas.ts)
for (const tamanho of telasDoFluxo(['empe', 'deitado'] as const)) {
  test(`${tamanho}: comprar cada lanche da Vila e comer no criativo, com o dedo`, async ({ browser }) => {
    const page = await abrir(browser, `comprar-comer-${tamanho}`, tamanho);
    const erros: string[] = [];
    page.on('pageerror', (e) => erros.push(String(e)));
    const balcoes = (await page.evaluate(() => window.__brumaluz!.vilaCompras!.balcoes())) as readonly Balcao[];
    expect(balcoes.length).toBe(7);
    const tempos: number[] = [];
    for (const b of balcoes) {
      tempos.push(await comprar(page, b));
      // cada lanche se come (o primeiro de cada um)
      if (b.chave !== 'compra-pipoca-parque' && b.chave !== 'compra-pipoca-pracinha') {
        await page.evaluate((item) => {
          const e = window.__brumaluz!;
          for (let i = 0; i < 9; i++) if (e.inventario!.obter(i)?.item === item) e.selecionarSlot!(i);
        }, b.item);
        await comer(page, b.item);
      }
    }
    console.log(`do toque até a barrinha (ms): ${tempos.join(', ')}`);
    for (const ms of tempos) expect(ms).toBeLessThan(2600);
    expect(erros).toEqual([]);
    await page.context().close();
  });
}

test('sobrevivência: comprar e comer com fome, a fome sobe', async ({ browser }) => {
  const page = await abrir(browser, 'comprar-comer-sobrevivencia', 'empe', 'sobrevivencia');
  const b = ((await page.evaluate(() => window.__brumaluz!.vilaCompras!.balcoes())) as readonly Balcao[])[1];
  await comprar(page, b);
  await page.evaluate(async () => {
    const e = window.__brumaluz!;
    for (let i = 0; i < 120; i++) e.sobrevivencia!.pulo(true);
    await e.sincronizar?.();
  });
  await page.waitForTimeout(800);
  const fome0 = await page.evaluate(() => window.__brumaluz!.sobrevivencia!.estado.fome);
  expect(fome0).toBeLessThan(20);
  await comer(page, b.item);
  const fome1 = await page.evaluate(() => window.__brumaluz!.sobrevivencia!.estado.fome);
  expect(fome1).toBeGreaterThan(fome0);
  await page.context().close();
});

test('a barrinha cheia: nada é comprado, nada sai da mão, o aviso aparece', async ({ browser }) => {
  const page = await abrir(browser, 'comprar-comer-cheia', 'empe');
  const b = ((await page.evaluate(() => window.__brumaluz!.vilaCompras!.balcoes())) as readonly Balcao[])[2];
  await page.evaluate(() => {
    const e = window.__brumaluz!;
    for (let i = 0; i < 9; i++) e.inventario!.definir(i, { item: 'graveto', qtd: 2 });
  });
  await irAoBalcao(page, b);
  await esperarDica(page, b.chave, b.p);
  const antes = await page.evaluate(() => JSON.stringify(window.__brumaluz!.inventario!.slots.slice(0, 9)));
  const t = await alvoDoToque(page, b.chave);
  await page.touchscreen.tap(t.x, t.y);
  await page.waitForFunction(
    () => [...document.querySelectorAll('.dica-toque.mostra')].some((el) => el.textContent?.includes('A barrinha está cheia')),
    undefined,
    { timeout: 5_000 },
  );
  await page.waitForTimeout(2500);
  expect(await page.evaluate(() => JSON.stringify(window.__brumaluz!.inventario!.slots.slice(0, 9)))).toBe(antes);
  await page.context().close();
});

test('medida (COMPRAR_MEDIDA=1): os quadros no celular durante a compra e a refeição', async ({ browser }) => {
  test.skip(!process.env.COMPRAR_MEDIDA, 'só com COMPRAR_MEDIDA');
  const { abrir: abrirMedida, medir } = await import('./vila-noite-palco');
  const page = await abrirMedida(browser, 'comprar-medida', 'empe', 3);
  await assentar(page, 12);
  const medidas: Record<string, number> = {};
  const balcoes = (await page.evaluate(() => window.__brumaluz!.vilaCompras!.balcoes())) as readonly Balcao[];
  for (const [quando, h] of [
    ['dia', 0.42],
    ['noite', 0.96],
  ] as const) {
    await page.evaluate((h) => {
      const e = window.__brumaluz!;
      e.pausarDia = true;
      e.hora = h;
    }, h);
    for (const b of [balcoes[0], balcoes[4], balcoes[6]]) {
      await irAoBalcao(page, b);
      await page.waitForTimeout(1500);
      // a entrega e, logo depois, as mordidas: as migalhas, os corações e o lanche que pula
      const i = balcoes.indexOf(b);
      await page.evaluate((i) => {
        const e = window.__brumaluz!;
        for (let k = 0; k < 9; k++) e.inventario!.definir(k, null);
        e.vilaCompras!.comprar(i);
      }, i);
      await page.waitForTimeout(700);
      medidas[`${b.barraca}-entrega-${quando}`] = (await medir(page, `${b.barraca}-entrega-${quando}`)).fps;
      await page.waitForTimeout(1800);
      await page.evaluate(() => window.__brumaluz!.comer!());
      await page.waitForTimeout(200);
      medidas[`${b.barraca}-comendo-${quando}`] = (await medir(page, `${b.barraca}-comendo-${quando}`)).fps;
    }
  }
  console.log(`MEDIDAS DA 032 ${JSON.stringify(medidas)}`);
  for (const [k, v] of Object.entries(medidas)) expect(v, k).toBeGreaterThanOrEqual(55);
  await page.context().close();
});

async function jogador(browser: Browser, id: string, apelido: string): Promise<Page> {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await ctx.addInitScript(
    ([i, a]) => {
      localStorage.setItem(
        'terrario:identidade',
        JSON.stringify({ id: i, chave: `chave-de-teste-${i}-0123456789abcdef`, apelido: a }),
      );
      localStorage.setItem(
        'terrario:config',
        JSON.stringify({ distancia: 3, mostrarFps: false, mostrarAtalhos: false }),
      );
    },
    [id, apelido],
  );
  const p = await ctx.newPage();
  p.on('pageerror', (e) => console.log(`[${apelido}] erro: ${String(e)}`));
  return p;
}
const pronto = (p: Page) => p.waitForFunction(() => window.__brumaluz?.ready, null, { timeout: 240_000 });
const entrarNoJogo = (p: Page) =>
  p.evaluate(() => {
    document.querySelector('.entrada')?.setAttribute('hidden', '');
    window.__brumaluz!.pausarDia = true;
    window.__brumaluz!.hora = 0.42;
  });

test('com amigos: a Bia vê a Ana comprar e comer', async ({ browser }) => {
  const PASTA = process.env.AMIGOS_PASTA ?? 'capturas-032/amigos';
  mkdirSync(PASTA, { recursive: true });
  const ana = await jogador(browser, 'ana-comprar', 'Ana');
  await criarMundo(ana, 'comprar-amigos', 'vila-neon');
  await ana.goto('/?mundo=comprar-amigos');
  await pronto(ana);
  await entrarNoJogo(ana);
  await ana.evaluate(() => window.dispatchEvent(new CustomEvent('brumaluz:amigos')));
  await ana.locator('[data-abrir-para-amigos]').click();
  await ana.waitForURL(/sala=/, { timeout: 60_000 });
  await pronto(ana);
  await entrarNoJogo(ana);
  const codigo = await ana.locator('[data-codigo-mundo]').getAttribute('data-codigo-mundo', { timeout: 30_000 });
  await ana.keyboard.press('Escape');
  const bia = await jogador(browser, 'bia-comprar', 'Bia');
  await bia.goto(`/?sala=${codigo}`);
  await bia.locator('[data-entrar-mundo]').click({ timeout: 60_000 });
  await pronto(bia);
  await entrarNoJogo(bia);
  for (const [p, outra] of [
    [ana, 'Bia'],
    [bia, 'Ana'],
  ] as const)
    await p.waitForFunction(
      (o) => (window.__brumaluz!.outrosJogadores?.() ?? []).some((q) => q.apelido === o),
      outra,
      { timeout: 90_000 },
    );
  for (const p of [ana, bia]) {
    await p.addStyleTag({ content: '.dica-mira { display: none !important; }' });
    await p.waitForFunction(() => !!window.__brumaluz?.vilaCompras, undefined, { timeout: 30_000 });
  }
  const anaId = await bia.evaluate(() => window.__brumaluz!.outrosJogadores!().find((o) => o.apelido === 'Ana')!.id);
  const b = ((await ana.evaluate(() => window.__brumaluz!.vilaCompras!.balcoes())) as readonly Balcao[])[1];
  // a Bia fica do lado, olhando a barraca
  await bia.evaluate(
    ({ p }) => {
      const e = window.__brumaluz!;
      e.voar?.(false);
      e.teleportar!(p[0] + 3.5, p[2] + 4.5, e.vila!()!.h + 1.2);
      e.apontar!(Math.atan2(-3.5, -4.5), 0.2);
    },
    { p: b.p },
  );
  await assentar(bia, 6);
  await comprar(ana, b);
  // a Bia viu a entrega da Ana
  await bia.waitForFunction(
    (id) => (window.__brumaluz!.eventosVila ?? []).some((e) => e.e === 'vilaCompra' && (e as { quem: string }).quem === id),
    anaId,
    { timeout: 10_000 },
  );
  // a Ana come (o dedo na comida); a Bia vê as mordidas no cachorro-quente. As duas na pracinha,
  // a Bia de frente para a Ana (a foto mostra a Ana comendo)
  const lugar = await ana.evaluate(() => {
    const e = window.__brumaluz!;
    const p = e.vila!()!;
    for (let i = 0; i < 9; i++) if (e.inventario!.obter(i)?.item === 'cachorro_quente') e.selecionarSlot!(i);
    e.teleportar!(p.nascimento.x + 2, p.nascimento.z + 3, p.h + 1.2);
    e.apontar!(0, 0.15);
    return [p.nascimento.x + 2, p.nascimento.z + 3, p.h + 1.2] as const;
  });
  await bia.evaluate((l) => {
    const e = window.__brumaluz!;
    e.teleportar!(l[0] + 0.6, l[1] + 3.6, l[2]);
    e.apontar!(Math.atan2(-0.6, -3.6), 0.2);
  }, lugar);
  await ana.waitForTimeout(2500);
  await ana.evaluate(() => window.__brumaluz!.comer!());
  await bia.waitForFunction((id) => window.__brumaluz!.refeicaoDoAmigo?.(id)?.item === 'cachorro_quente', anaId, {
    timeout: 8_000,
  });
  // (a foto do aparelho da Bia: a câmera livre dela na frente da Ana, que está comendo)
  await bia.addStyleTag({ content: '.painel-foto, .grade-foto, .flash-foto { display: none !important; }' });
  await bia.evaluate((l) => {
    const e = window.__brumaluz!;
    const f = e.modoFoto!;
    if (!f.ativo()) f.alternar();
    f.posicionar!(l[0] + 0.5, l[2] + 1.5, l[1] + 2.3);
    e.apontar!(Math.PI + 0.2, 0.08);
  }, lugar);
  await bia.waitForTimeout(250);
  await bia.screenshot({ path: `${PASTA}/bia-ve-ana-comer.png` });
  await bia.waitForFunction((id) => (window.__brumaluz!.refeicaoDoAmigo?.(id)?.mordidas ?? 0) >= 2, anaId, {
    timeout: 5_000,
  });
  await bia.screenshot({ path: `${PASTA}/bia-ve-ana-comer-2.png` });
  await ana.context().close();
  await bia.context().close();
});
