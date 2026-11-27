import { expect, test, type Browser, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { Bloco } from '../src/world/blocks';
import { celulasDoMovel, metaDoMovel } from '../src/jogo/moveis';
import { TEMPO_FUNDIR } from '../src/jogo/receitas';
import { abrirMundo, type Tamanho } from './guia-palco';

/**
 * Spec 039b (T04): a tela e os sons da parte 2 dos móveis (o fogão, a geladeira, a mesa, a TV e o
 * aparelho de som), na placa.
 *
 * - **Montar:** a aba "casa" do livro tem os treze móveis; a mesa da casa se monta.
 * - **Pôr e tocar** (no aparelho, no computador): os cinco à mão, inteiros; a geladeira abre o
 *   painel dela (9 lugares, só comida: o graveto fica na mochila), guarda e tira; o fogão cozinha
 *   o milho (vira pipoca) e a saída se tira; a TV passa os desenhos; o som toca a musiquinha; ao
 *   recarregar, a comida da geladeira volta.
 * - **Com amigas** (a sala do servidor local): quem chega vê o desenho que a TV está passando, e a
 *   mesa com duas sentadas: a comida da mão de uma alimenta as duas, com o coraçãozinho.
 *
 * Fotos em capturas-039b/t04/.
 */
const PASTA = 'capturas-039b/t04';
mkdirSync(PASTA, { recursive: true });

type P = { x: number; y: number; z: number };
const CIMA = { x: 0, y: 1, z: 0 };
const T0 = Date.now();
const passo = (o: string) => console.log(`PASSO ${((Date.now() - T0) / 1000).toFixed(0)} s ${o}`);

/** Uma laje de pedra (15 × 15) acima do terreno, com o ar limpo em cima (o chão é Y). */
async function plataforma(p: Page): Promise<{ cx: number; cz: number; Y: number }> {
  const r = await p.evaluate((pedra) => {
    const e = window.__brumaluz!;
    const [px, , pz] = e.posicao!;
    const cx = Math.floor(px);
    const cz = Math.floor(pz);
    let alto = 0;
    for (let dx = -9; dx <= 9; dx++)
      for (let dz = -9; dz <= 9; dz++) {
        let y = 120;
        while (y > 2 && e.bloco!(cx + dx, y, cz + dz) === 0) y--;
        alto = Math.max(alto, y);
      }
    const Y = alto + 6;
    const lote: { x: number; y: number; z: number; v: number }[] = [];
    for (let dx = -7; dx <= 7; dx++)
      for (let dz = -7; dz <= 7; dz++) {
        lote.push({ x: cx + dx, y: Y, z: cz + dz, v: pedra });
        for (let dy = 1; dy <= 4; dy++) lote.push({ x: cx + dx, y: Y + dy, z: cz + dz, v: 0 });
      }
    e.editarLote!(lote);
    return { cx, cz, Y };
  }, Bloco.PEDRA_LISA);
  await expect
    .poll(() => p.evaluate((r) => window.__brumaluz!.bloco!(r.cx + 7, r.Y, r.cz + 7), r))
    .toBe(Bloco.PEDRA_LISA);
  await ir(p, r.cx + 0.5, r.cz - 5.5, r.Y + 1);
  await p.waitForTimeout(800);
  return r;
}

const ir = (p: Page, x: number, z: number, y?: number) =>
  p.evaluate(({ x, y, z }) => window.__brumaluz!.teleportar!(x, z, y), { x, y, z });
const mirar = (p: Page, b: P, normal?: P) =>
  p.evaluate(({ b, n }) => window.__brumaluz!.mirarBloco!(b.x, b.y, b.z, n), { b, n: normal });
async function mirarAte(p: Page, b: P, normal?: P) {
  await expect.poll(() => mirar(p, b, normal), { timeout: 15_000 }).toBe(true);
  await p.waitForTimeout(200);
}
const naMao = (p: Page, item: string, qtd = 64, slot = 0) =>
  p.evaluate(
    ({ item, qtd, slot }) => {
      const e = window.__brumaluz!;
      e.inventario!.definir(slot, { item, qtd });
      e.selecionarSlot!(slot);
    },
    { item, qtd, slot },
  );
const celulas = (p: Page, cs: P[]) =>
  p.evaluate(
    (cs) => cs.map((c) => [window.__brumaluz!.bloco!(c.x, c.y, c.z), window.__brumaluz!.meta!(c.x, c.y, c.z)]),
    cs,
  );
const esperado = (b: number, d: number, cs: { parte: number }[]) => cs.map((c) => [b, metaDoMovel(d, c.parte)]);

/** Põe à mão o móvel `b` com a âncora em `a`, olhando para +z (a criança atrás dele). */
async function porAMao(p: Page, b: number, a: P): Promise<boolean> {
  await naMao(p, `bloco:${b}`);
  await ir(p, a.x + 0.5, a.z - 2.5, a.y);
  await p.waitForTimeout(300);
  await mirarAte(p, { ...a, y: a.y - 1 }, CIMA);
  return p.evaluate((a) => {
    const e = window.__brumaluz!;
    e.mirarBloco!(a.x, a.y - 1, a.z, { x: 0, y: 1, z: 0 } as never);
    return e.interagir!('colocar') as unknown as boolean;
  }, a);
}
/** Toca no móvel (de frente para ele, a 2,5 blocos). */
async function tocar(p: Page, c: P) {
  await ir(p, c.x + 0.5, c.z - 2.5, c.y);
  await p.waitForTimeout(250);
  await mirarAte(p, c);
  await p.evaluate((c) => {
    const e = window.__brumaluz!;
    e.mirarBloco!(c.x, c.y, c.z);
    e.usarOuColocar!();
  }, c);
}
const overlay = (p: Page) => p.evaluate(() => document.body.dataset.overlay ?? '');
const centro = async (p: Page, sel: string) => {
  const b = (await p.locator(sel).first().boundingBox())!;
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
};
async function clicar(p: Page, sel: string, shift = false) {
  const c = await centro(p, sel);
  if (shift) await p.keyboard.down('Shift');
  await p.mouse.click(c.x, c.y);
  if (shift) await p.keyboard.up('Shift');
  await p.waitForTimeout(150);
}
const slotInv = (i: number) => `.inventario .slot-inv[data-indice="${i}"]`;
const itemEm = (p: Page, sel: string) =>
  p.evaluate((s) => document.querySelector<HTMLElement>(s)?.dataset.item ?? '', sel);

async function abrirNoComputador(browser: Browser, id: string, tamanho: Tamanho = 'pc') {
  const p = await abrirMundo(browser, { id, tema: 'doce-reino', tamanho });
  await p.addInitScript(() => {
    HTMLElement.prototype.requestPointerLock = function () {
      return Promise.resolve();
    } as typeof HTMLElement.prototype.requestPointerLock;
  });
  await p.waitForTimeout(1500);
  return p;
}

test('montar: a aba casa do livro tem os treze móveis, e a mesa da casa se monta', async ({ browser }) => {
  test.setTimeout(300_000);
  const p = await abrirNoComputador(browser, 'moveis-039b-montar', 'empe');
  const erros: string[] = [];
  p.on('pageerror', (e) => erros.push(String(e)));
  await p.evaluate(() => document.body.classList.add('toque-ativo'));
  await p.evaluate(() => {
    const e = window.__brumaluz!;
    e.inventario!.definir(0, { item: 'bloco:7', qtd: 3 });
    e.inventario!.definir(1, { item: 'graveto', qtd: 2 });
  });
  await p.evaluate((mesa) => {
    window.dispatchEvent(new CustomEvent('brumaluz:usar', { detail: { bloco: mesa, x: 0, y: 0, z: 0 } }));
  }, Bloco.MESA_TRABALHO);
  await expect.poll(() => overlay(p)).toBe('inventario');
  await p.locator('[data-livro]').tap();
  await p.locator('.livro [data-aba-categoria="casa"]').tap();
  const receitas = await p
    .locator('.livro [data-receita]')
    .evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.receita));
  expect(new Set(receitas)).toEqual(
    new Set(['cama', 'sofa', 'cadeira', 'tapete', 'abajur', 'criado_mudo', 'guarda_roupa', 'pia', 'geladeira', 'fogao', 'mesa_casa', 'tv', 'som']),
  );
  await p.locator('.livro [data-receita="mesa_casa"]').tap();
  await expect
    .poll(() => p.evaluate(() => document.querySelector<HTMLElement>('[data-resultado-criacao]')?.dataset.item))
    .toBe(`bloco:${Bloco.MESA}`);
  await p.waitForTimeout(3000);
  await p.screenshot({ path: `${PASTA}/mesa-de-montar-casa-empe.png` });
  expect(erros).toEqual([]);
  await p.context().close();
});

test('pôr e tocar no aparelho: a geladeira guarda (só comida), o fogão cozinha, a TV e o som ligam, e a geladeira volta ao recarregar', async ({ browser }) => {
  test.setTimeout(480_000);
  const p = await abrirNoComputador(browser, 'moveis-039b-tocar');
  const erros: string[] = [];
  p.on('pageerror', (e) => erros.push(String(e)));
  const { cx, cz, Y } = await plataforma(p);
  const y = Y + 1;
  const M = {
    geladeira: { x: cx - 5, y, z: cz },
    fogao: { x: cx - 2, y, z: cz },
    tv: { x: cx + 1, y, z: cz },
    som: { x: cx + 5, y, z: cz },
    mesa: { x: cx - 1, y, z: cz + 4 },
  };
  const blocos = { geladeira: Bloco.GELADEIRA, fogao: Bloco.FOGAO, tv: Bloco.TV, som: Bloco.SOM, mesa: Bloco.MESA } as const;
  for (const k of Object.keys(M) as (keyof typeof M)[]) {
    expect(await porAMao(p, blocos[k], M[k]), k).toBe(true);
    const cs = celulasDoMovel(blocos[k], M[k].x, M[k].y, M[k].z, 0);
    await expect.poll(() => celulas(p, cs), { message: k }).toEqual(esperado(blocos[k], 0, cs));
  }
  passo('os cinco postos');
  await naMao(p, 'pipoca', 5, 0);
  await naMao(p, 'graveto', 3, 1);
  await naMao(p, 'milho', 4, 2);

  // a geladeira: o toque abre o painel dela, com o ícone
  await tocar(p, M.geladeira);
  await expect.poll(() => overlay(p)).toBe('inventario');
  await expect(p.locator('[data-painel-gel]')).toBeVisible();
  await expect(p.locator('[data-painel-gel] .icone-conteiner')).toBeVisible();
  // o graveto não entra (nem por um quadro): fica na mochila
  await clicar(p, slotInv(1), true);
  expect(await p.evaluate(() => window.__brumaluz!.inventario!.contar('graveto'))).toBe(3);
  for (let i = 0; i < 9; i++) expect(await itemEm(p, `[data-externo="gel:${i}"]`), `gel:${i}`).not.toBe('graveto');
  // nem pelo cursor: pega o graveto e solta no lugar da geladeira
  await clicar(p, slotInv(1));
  await clicar(p, '[data-externo="gel:4"]');
  expect(await itemEm(p, '[data-externo="gel:4"]')).toBe('');
  await clicar(p, slotInv(1));
  // a pipoca entra (shift: vai para a geladeira)
  await clicar(p, slotInv(0), true);
  await expect.poll(() => itemEm(p, '[data-externo="gel:0"]')).toBe('pipoca');
  await p.waitForTimeout(800);
  await p.screenshot({ path: `${PASTA}/geladeira-pc.png` });
  await p.keyboard.press('Escape');
  await expect.poll(() => overlay(p)).toBe('');
  // reabre: a pipoca continua lá (o núcleo guardou)
  await tocar(p, M.geladeira);
  await expect(p.locator('[data-painel-gel]')).toBeVisible();
  await expect.poll(() => itemEm(p, '[data-externo="gel:0"]')).toBe('pipoca');
  // tirar: shift no lugar da geladeira volta para a mochila (tira uma pipoca e deixa as outras)
  expect(await p.evaluate(() => window.__brumaluz!.inventario!.contar('pipoca'))).toBe(0);
  await clicar(p, '[data-externo="gel:0"]', true);
  await expect.poll(() => p.evaluate(() => window.__brumaluz!.inventario!.contar('pipoca'))).toBe(5);
  // guarda de novo, para o recarregar
  await clicar(p, slotInv(0), true);
  await expect.poll(() => itemEm(p, '[data-externo="gel:0"]')).toBe('pipoca');
  await p.keyboard.press('Escape');
  passo('geladeira');

  // o fogão: o milho na entrada; a pedra não entra; a pipoca sai
  await tocar(p, M.fogao);
  await expect(p.locator('[data-painel-fogao]')).toBeVisible();
  await clicar(p, slotInv(1), true);
  expect(await itemEm(p, '[data-externo="fog:entrada"]')).toBe('');
  await clicar(p, slotInv(2), true);
  await expect.poll(() => itemEm(p, '[data-externo="fog:entrada"]')).toBe('milho');
  // cozinhando: o fogão entra na lista dos ligados (o anel e o vapor, para todos perto)
  await expect
    .poll(() => p.evaluate(() => window.__brumaluz!.ligados!().some((e) => e.tipo === 'fogao')))
    .toBe(true);
  await p.waitForTimeout(1500);
  await p.screenshot({ path: `${PASTA}/fogao-cozinhando-pc.png` });
  await expect
    .poll(() => itemEm(p, '[data-externo="fog:saida"]'), { timeout: (TEMPO_FUNDIR + 6) * 1000 })
    .toBe('pipoca');
  // a saída não aceita item posto: a pipoca da mão não entra
  // tira a pipoca pronta (para o cursor e da mão para a mochila)
  await clicar(p, '[data-externo="fog:saida"]');
  await clicar(p, slotInv(5));
  await expect.poll(() => p.evaluate(() => window.__brumaluz!.inventario!.contar('pipoca'))).toBeGreaterThanOrEqual(1);
  await p.keyboard.press('Escape');
  passo('fogão');

  // a TV: liga no primeiro desenho; o toque seguinte (depois da esperinha) passa para o próximo
  await tocar(p, M.tv);
  const tv = () => p.evaluate(() => window.__brumaluz!.ligados!().find((e) => e.tipo === 'tv') ?? null);
  await expect.poll(tv, { timeout: 2000 }).toMatchObject({ programa: 0 });
  await p.waitForTimeout(2500);
  await tocar(p, M.tv);
  await expect.poll(tv, { timeout: 4000 }).toMatchObject({ programa: 1 });
  // o som: toca a musiquinha (o motor de som da página de teste pode estar parado: confere a lista)
  await tocar(p, M.som);
  await expect
    .poll(() => p.evaluate(() => window.__brumaluz!.ligados!().some((e) => e.tipo === 'som')), { timeout: 2000 })
    .toBe(true);
  await ir(p, cx + 0.5, cz - 4.5, y);
  await p.waitForTimeout(1500);
  await p.screenshot({ path: `${PASTA}/tv-e-som-ligados-pc.png` });
  passo('tv e som');

  // a mesa: sem ninguém sentado em volta, o "não" e nada sai da mochila
  await naMao(p, 'pipoca', 3, 0);
  await tocar(p, M.mesa);
  await p.waitForTimeout(1200);
  expect(await p.evaluate(() => window.__brumaluz!.inventario!.contar('pipoca'))).toBeGreaterThanOrEqual(3);
  expect(await p.evaluate(() => window.__brumaluz!.pratosVistos!())).toBe(0);

  // recarregar: a pipoca da geladeira volta
  expect(await p.evaluate(() => window.__brumaluz!.salvar!(false))).toBe(true);
  await p.reload();
  await p.waitForFunction(() => window.__brumaluz?.ready === true, undefined, { timeout: 240_000 });
  await p.evaluate(() => document.querySelector('.entrada')?.setAttribute('hidden', ''));
  await p.waitForTimeout(1500);
  await tocar(p, M.geladeira);
  await expect(p.locator('[data-painel-gel]')).toBeVisible({ timeout: 10_000 });
  await expect.poll(() => itemEm(p, '[data-externo="gel:0"]')).toBe('pipoca');
  expect(erros).toEqual([]);
  await p.context().close();
});

// ---------------------------------------------------------------- com amigas (a sala do servidor)
async function jogador(browser: Browser, id: string, apelido: string, tamanho: Tamanho): Promise<Page> {
  const ctx = await browser.newContext(
    tamanho === 'pc'
      ? { viewport: { width: 1280, height: 720 } }
      : { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  );
  await ctx.addInitScript(
    ([i, a]) => {
      localStorage.setItem(
        'terrario:identidade',
        JSON.stringify({ id: i, chave: `chave-de-teste-${i}-0123456789abcdef`, apelido: a }),
      );
    },
    [id, apelido],
  );
  const p = await ctx.newPage();
  p.on('pageerror', (e) => console.log(`[${apelido}] erro: ${String(e)}`));
  return p;
}
const pronto = (p: Page) =>
  p.waitForFunction(() => window.__brumaluz?.ready === true, null, { timeout: 180_000 });
const entrarNoJogo = (p: Page) =>
  p.evaluate(() => {
    document.querySelector('.entrada')?.setAttribute('hidden', '');
    const e = window.__brumaluz!;
    e.pausarDia = true;
    e.hora = 0.42;
  });

test('com amigas: quem chega vê o desenho da TV, e a mesa com duas sentadas come junto', async ({ browser }) => {
  test.setTimeout(600_000);
  const sufixo = Date.now().toString(36);
  const ana = await jogador(browser, `ana-${sufixo}`, 'Ana', 'empe');
  await ana.goto('/');
  await pronto(ana);
  await ana.locator('[data-abrir-mundos]').click();
  await ana.locator('.cartao-tema[data-tema="doce-reino"]').click();
  await ana.locator('button[data-modo="criativo"]').click();
  await ana.locator('[data-novo-nome]').fill('Mesa da casa');
  await ana.locator('[data-novo-semente]').fill('1337');
  await ana.locator('[data-criar-mundo]').click();
  await ana.waitForURL(/mundo=/);
  await pronto(ana);
  await entrarNoJogo(ana);
  await ana.evaluate(() => window.dispatchEvent(new CustomEvent('brumaluz:amigos')));
  await ana.locator('[data-abrir-para-amigos]').click();
  await ana.waitForURL(/sala=/, { timeout: 60_000 });
  await pronto(ana);
  await entrarNoJogo(ana);
  const codigo = await ana.locator('[data-codigo-mundo]').getAttribute('data-codigo-mundo', { timeout: 30_000 });
  await ana.keyboard.press('Escape');
  const { cx, cz, Y } = await plataforma(ana);
  const y = Y + 1;
  // a mesa (olhando para -z, crescendo para -x) com uma cadeira de cada lado; a TV atrás
  const MESA = { x: cx, y, z: cz };
  const TV = { x: cx + 1, y, z: cz + 5 };
  await ana.evaluate(
    ({ m, tv, b }) =>
      window.__brumaluz!.editarLote!([
        { ...m, v: b.mesa | (2 << 8) },
        { x: m.x - 1, y: m.y, z: m.z - 1, v: b.cadeira | (0 << 8) },
        { x: m.x, y: m.y, z: m.z + 1, v: b.cadeira | (2 << 8) },
        { ...tv, v: b.tv | (2 << 8) },
      ]),
    { m: MESA, tv: TV, b: { mesa: Bloco.MESA, cadeira: Bloco.CADEIRA, tv: Bloco.TV } },
  );
  await expect.poll(() => celulas(ana, [MESA, TV])).toEqual([
    [Bloco.MESA, metaDoMovel(2, 0)],
    [Bloco.TV, metaDoMovel(2, 0)],
  ]);
  // a Ana liga a TV antes de a Bia chegar
  await tocar(ana, TV);
  const tvDe = (p: Page) => p.evaluate(() => window.__brumaluz!.ligados!().find((e) => e.tipo === 'tv') ?? null);
  await expect.poll(() => tvDe(ana), { timeout: 4000 }).toMatchObject({ programa: 0 });
  const desde = (await tvDe(ana)) as { desde: number };
  // a Bia chega: vê o mesmo desenho, do mesmo começo
  const bia = await jogador(browser, `bia-${sufixo}`, 'Bia', 'empe');
  await bia.goto(`/?sala=${codigo}`);
  await bia.locator('[data-entrar-mundo]').click({ timeout: 60_000 });
  await pronto(bia);
  await entrarNoJogo(bia);
  await ir(bia, cx + 0.5, cz - 3.5, y);
  await expect.poll(() => tvDe(bia), { timeout: 20_000 }).toMatchObject({ programa: 0, desde: desde.desde });
  passo('a TV para quem chega');

  // as duas sentam (cada uma numa cadeira em volta da mesa)
  const cadeiraAna = { x: MESA.x - 1, y, z: MESA.z - 1 };
  const cadeiraBia = { x: MESA.x, y, z: MESA.z + 1 };
  const sentar = async (p: Page, c: P, de: P) => {
    await ir(p, de.x, de.z, y);
    await p.waitForTimeout(400);
    await mirarAte(p, c);
    await p.evaluate((c) => {
      const e = window.__brumaluz!;
      e.mirarBloco!(c.x, c.y, c.z);
      e.usarOuColocar!();
    }, c);
    await expect.poll(() => p.evaluate(() => window.__brumaluz!.moveisTela!().assento), { timeout: 5000 }).not.toBeNull();
  };
  await sentar(ana, cadeiraAna, { x: cadeiraAna.x + 0.5, y, z: cadeiraAna.z - 2 });
  await sentar(bia, cadeiraBia, { x: cadeiraBia.x + 0.5, y, z: cadeiraBia.z + 2.5 });
  await ana.waitForTimeout(1200);
  // a Ana põe a pipoca da mão na mesa: as duas comem (o prato e os coraçõezinhos para as duas)
  await naMao(ana, 'pipoca', 2, 0);
  await ana.evaluate((m) => {
    const e = window.__brumaluz!;
    e.mirarBloco!(m.x, m.y, m.z);
    e.usarOuColocar!();
  }, MESA);
  await expect.poll(() => ana.evaluate(() => window.__brumaluz!.pratosVistos!()), { timeout: 5000 }).toBe(1);
  await expect.poll(() => bia.evaluate(() => window.__brumaluz!.pratosVistos!()), { timeout: 5000 }).toBe(1);
  await ana.waitForTimeout(300);
  await ana.screenshot({ path: `${PASTA}/mesa-comendo-junto-ana-empe.png` });
  await bia.screenshot({ path: `${PASTA}/mesa-comendo-junto-bia-empe.png` });
  await ana.context().close();
  await bia.context().close();
});
