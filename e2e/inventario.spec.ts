import { expect, test, type Browser, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';

/**
 * Bicho achado pelo dono: no mundo com amigos (sobrevivência, na nuvem), o que se fabricava
 * não ia para a mochila nem para a barra ao arrastar o resultado ("como se não deixasse
 * soltar ali"). A tela não dizia à nuvem qual receita fez; a conta dos itens não fechava e a
 * nuvem desfazia: o resultado sumia da mão e a madeira voltava para a grade.
 *
 * Aqui, com eventos de ponteiro de verdade (mouse e dedo), no mundo da nuvem: arrastar o
 * resultado para a mochila e para a barra, pelo livro de receitas, clicar e clicar,
 * Shift+clique, soltar no vão entre os espaços e em cima do resultado, fechar com algo na
 * mão e com a grade cheia. No mundo do aparelho: baú e fornalha, pelo mouse e pelo dedo.
 */
const PASTA = 'test-results/inventario';
mkdirSync(PASTA, { recursive: true });

const MADEIRA = 'bloco:4';
const TABUAS = 'bloco:7';
const AREIA = 'bloco:3';

type Pt = { x: number; y: number };

async function pronto(page: Page) {
  await page.waitForFunction(() => window.__brumaluz?.ready === true, undefined, {
    timeout: 180_000,
  });
}

async function novaPagina(
  browser: Browser,
  id: string,
  toque: false | { width: number; height: number },
): Promise<Page> {
  const ctx = await browser.newContext(
    toque
      ? { viewport: toque, hasTouch: true, isMobile: true }
      : { viewport: { width: 1280, height: 720 } },
  );
  await ctx.addInitScript((id) => {
    // o mouse fica livre (preso na câmera, o clique vai todo para o jogo)
    HTMLElement.prototype.requestPointerLock = function () {
      return Promise.resolve();
    } as typeof HTMLElement.prototype.requestPointerLock;
    localStorage.setItem(
      'terrario:identidade',
      JSON.stringify({ id, chave: `chave-de-teste-${id}-0123456789abcdef`, apelido: 'Teo' }),
    );
  }, id);
  const page = await ctx.newPage();
  return page;
}

/** Mundo novo de sobrevivência, na nuvem (com amigos) ou no aparelho. */
async function mundoSobrevivencia(page: Page, nuvem: boolean) {
  await page.goto('/');
  await pronto(page);
  await page.locator('[data-abrir-mundos]').click();
  await page.locator('[data-modo="sobrevivencia"]').click();
  await page.locator('[data-novo-nome]').fill('Mochila');
  if (nuvem) await page.locator('[data-com-amigos]').check();
  await page.locator('[data-criar-mundo]').click();
  await page.waitForURL(nuvem ? /sala=/ : /mundo=/, { timeout: 60_000 });
  await pronto(page);
  await page.evaluate(() => {
    document.querySelector('.entrada')?.setAttribute('hidden', '');
    window.__brumaluz!.pausarDia = true;
  });
  if (nuvem) {
    // o convite para os amigos abre sozinho na primeira vez: fecha
    await expect
      .poll(() => page.evaluate(() => document.body.dataset.overlay ?? ''), { timeout: 30_000 })
      .toBe('amigos');
    await page.keyboard.press('Escape');
    await expect.poll(() => page.evaluate(() => document.body.dataset.overlay ?? '')).toBe('');
  }
  expect(await page.evaluate(() => window.__brumaluz!.modo)).toBe('sobrevivencia');
  await page.evaluate(() => window.__brumaluz!.darKit!());
  await expect
    .poll(() => page.evaluate(() => window.__brumaluz!.inventario!.contar('bloco:4')))
    .toBe(64);
}

const estado = (page: Page) =>
  page.evaluate(() => {
    const inv = window.__brumaluz!.inventario!;
    return {
      slots: inv.slots.map((s) => (s ? `${s.item}x${s.qtd}` : '')),
      madeira: inv.contar('bloco:4'),
      tabuas: inv.contar('bloco:7'),
      grade: [...document.querySelectorAll<HTMLElement>('[data-grade-criacao]')].map(
        (e) => e.dataset.item ?? '',
      ),
      resultado: document.querySelector<HTMLElement>('[data-resultado-criacao]')?.dataset.item,
      naMao: !document.querySelector('.cursor-item')!.hasAttribute('hidden'),
    };
  });

/** Espera a nuvem responder (se ela desfizer, a cópia volta ao oficial aqui). */
async function assentar(page: Page) {
  // na nuvem não há "sincronizar" (só no mundo do aparelho): a ida e volta leva bem menos
  await page.evaluate(() => window.__brumaluz!.sincronizar?.().catch(() => undefined));
  await page.waitForTimeout(1200);
}

const centro = async (page: Page, sel: string): Promise<Pt> => {
  const b = (await page.locator(sel).first().boundingBox())!;
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
};
const slot = (i: number) => `.inventario .slot-inv[data-indice="${i}"]`;
const RESULTADO = '[data-resultado-criacao]';

// ---- mouse ----
async function arrastarMouse(page: Page, de: Pt, ate: Pt) {
  await page.mouse.move(de.x, de.y);
  await page.mouse.down();
  for (let i = 1; i <= 12; i++) {
    await page.mouse.move(de.x + ((ate.x - de.x) * i) / 12, de.y + ((ate.y - de.y) * i) / 12);
    await page.waitForTimeout(16);
  }
  await page.mouse.up();
}
async function clicarMouse(page: Page, p: Pt, opcoes: { shift?: boolean; direito?: boolean } = {}) {
  if (opcoes.shift) await page.keyboard.down('Shift');
  await page.mouse.click(p.x, p.y, { button: opcoes.direito ? 'right' : 'left' });
  if (opcoes.shift) await page.keyboard.up('Shift');
}

// ---- dedo (toques de verdade pelo protocolo do Chrome: viram pointer events de toque) ----
async function dedo(page: Page) {
  const cdp = await page.context().newCDPSession(page);
  const toque = (type: string, p?: Pt) =>
    cdp.send('Input.dispatchTouchEvent', {
      type,
      touchPoints: p ? [{ x: p.x, y: p.y, id: 1, radiusX: 4, radiusY: 4, force: 1 }] : [],
    } as never);
  return {
    async arrastar(de: Pt, ate: Pt) {
      await toque('touchStart', de);
      // um dedo que arrasta passa logo da folga do toque (senão vira "segurar": metade)
      const n = Math.max(2, Math.min(12, Math.ceil(Math.hypot(ate.x - de.x, ate.y - de.y) / 18)));
      for (let i = 1; i <= n; i++) {
        await toque('touchMove', {
          x: de.x + ((ate.x - de.x) * i) / n,
          y: de.y + ((ate.y - de.y) * i) / n,
        });
        await page.waitForTimeout(16);
      }
      await toque('touchEnd');
    },
    async tocar(p: Pt) {
      await toque('touchStart', p);
      await page.waitForTimeout(40);
      await toque('touchEnd');
    },
    async doisToques(p: Pt) {
      await this.tocar(p);
      await page.waitForTimeout(90);
      await this.tocar(p);
    },
  };
}

async function abrirInventario(page: Page, toque: boolean) {
  if (toque) await page.locator('[data-botao-mochila]').dispatchEvent('click');
  else await page.keyboard.press('KeyE');
  await expect.poll(() => page.evaluate(() => document.body.dataset.overlay)).toBe('inventario');
  await page.waitForTimeout(250);
}

/** Pelo livro de receitas: abre (se fechado) e toca/clica na receita das tábuas. */
async function tabuasPeloLivro(page: Page, toque: boolean) {
  if (!(await page.locator('.livro:not([hidden])').count())) {
    if (toque) await page.locator('[data-livro]').tap();
    else await page.locator('[data-livro]').click();
  }
  const r = page.locator('.livro [data-receita="tabuas"]');
  await r.scrollIntoViewIfNeeded();
  if (toque) await r.tap();
  else await r.click();
  await expect.poll(async () => (await estado(page)).resultado).toBe(TABUAS);
}

test('nuvem, computador: arrastar o que fabricou para a mochila e para a barra', async ({
  browser,
}) => {
  test.setTimeout(300_000);
  const page = await novaPagina(browser, 'inv-mouse-e2e', false);
  const erros: string[] = [];
  page.on('pageerror', (e) => erros.push(String(e)));
  await mundoSobrevivencia(page, true);
  await abrirInventario(page, false);

  // 1. madeira na grade à mão: pega a pilha, botão direito põe uma, devolve o resto
  await clicarMouse(page, await centro(page, slot(3)));
  await clicarMouse(page, await centro(page, '[data-grade-criacao="0"]'), { direito: true });
  await clicarMouse(page, await centro(page, slot(3)));
  await assentar(page);
  let s = await estado(page);
  expect(s.grade[0]).toBe(MADEIRA);
  expect(s.resultado).toBe(TABUAS);
  expect(s.naMao).toBe(false);

  // 2. arrastar o resultado até a mochila: as tábuas ficam lá (a nuvem não desfaz)
  await arrastarMouse(page, await centro(page, RESULTADO), await centro(page, slot(9)));
  await assentar(page);
  s = await estado(page);
  await page.screenshot({ path: `${PASTA}/nuvem-mouse-mochila.png` });
  expect(s.slots[9]).toBe(`${TABUAS}x4`);
  expect(s.grade[0]).toBe('');
  expect(s.naMao).toBe(false);
  expect(s.madeira).toBe(63);

  // 3. pelo livro de receitas, arrastar até a barra (o espaço 8 fica livre com Shift+clique)
  await clicarMouse(page, await centro(page, slot(8)), { shift: true });
  await assentar(page);
  expect((await estado(page)).slots[8]).toBe('');
  await tabuasPeloLivro(page, false);
  await arrastarMouse(page, await centro(page, RESULTADO), await centro(page, slot(8)));
  await assentar(page);
  s = await estado(page);
  expect(s.slots[8]).toBe(`${TABUAS}x4`);
  expect(s.madeira).toBe(62);

  // 4. clicar e clicar: pega o resultado, solta na mochila
  await tabuasPeloLivro(page, false);
  await clicarMouse(page, await centro(page, RESULTADO));
  await assentar(page);
  expect((await estado(page)).naMao).toBe(true);
  await clicarMouse(page, await centro(page, slot(11)));
  await assentar(page);
  s = await estado(page);
  expect(s.slots[11]).toBe(`${TABUAS}x4`);
  expect(s.naMao).toBe(false);

  // 5. Shift+clique no resultado: fabrica direto para a mochila
  const antes = s.tabuas;
  await tabuasPeloLivro(page, false);
  await clicarMouse(page, await centro(page, RESULTADO), { shift: true });
  await assentar(page);
  s = await estado(page);
  expect(s.tabuas).toBe(antes + 4);
  expect(s.madeira).toBe(60);
  expect(s.naMao).toBe(false);

  // 6. arrastar e soltar no vão entre dois espaços: nada some (fica na mão; fechar devolve)
  const a = (await page.locator(slot(9)).boundingBox())!;
  await arrastarMouse(page, await centro(page, slot(9)), { x: a.x + a.width + 2.5, y: a.y + 4 });
  await assentar(page);
  expect((await estado(page)).naMao).toBe(true);
  await page.keyboard.press('KeyE');
  await assentar(page);
  s = await estado(page);
  expect(s.tabuas).toBe(antes + 4);
  await abrirInventario(page, false);

  // 7. soltar em cima do resultado não fabrica de novo nem engole a pilha (antes, com
  // tábuas na mão, soltar ali fabricava mais quatro)
  await tabuasPeloLivro(page, false);
  const t0 = await estado(page);
  const pequena = t0.slots.findIndex((x) => x === `${TABUAS}x4`);
  expect(pequena).toBeGreaterThanOrEqual(0);
  await arrastarMouse(page, await centro(page, slot(pequena)), await centro(page, RESULTADO));
  await assentar(page);
  s = await estado(page);
  expect(s.grade).toEqual(t0.grade);
  expect(s.naMao).toBe(true);
  expect(s.tabuas).toBe(t0.tabuas - 4);
  await clicarMouse(page, await centro(page, slot(pequena)));

  // 8. fechar pelo X com madeira na grade: ela volta para a mochila
  await page.locator('.inventario > [data-fechar]').click();
  await assentar(page);
  s = await estado(page);
  expect(s.madeira).toBe(60);
  expect(s.tabuas).toBe(antes + 4);
  expect(s.naMao).toBe(false);
  await abrirInventario(page, false);
  s = await estado(page);
  expect(s.grade.every((g) => g === '')).toBe(true);
  expect(erros).toEqual([]);
  await page.context().close();
});

test('nuvem, celular: arrastar com o dedo o que fabricou', async ({ browser }) => {
  test.setTimeout(300_000);
  const page = await novaPagina(browser, 'inv-toque-e2e', { width: 390, height: 844 });
  const erros: string[] = [];
  page.on('pageerror', (e) => erros.push(String(e)));
  await mundoSobrevivencia(page, true);
  await page.evaluate(() => document.body.classList.add('toque-ativo'));
  await abrirInventario(page, true);
  const d = await dedo(page);

  // 1. pelo livro; arrastar o resultado com o dedo até a mochila
  await tabuasPeloLivro(page, true);
  await d.arrastar(await centro(page, RESULTADO), await centro(page, slot(9)));
  await assentar(page);
  let s = await estado(page);
  await page.screenshot({ path: `${PASTA}/nuvem-dedo-mochila.png` });
  expect(s.slots[9]).toBe(`${TABUAS}x4`);
  expect(s.grade.every((g) => g === '')).toBe(true);
  expect(s.madeira).toBe(63);
  expect(s.naMao).toBe(false);

  // 2. dois toques na barra liberam o espaço 8; arrastar o resultado até lá
  await d.doisToques(await centro(page, slot(8)));
  await assentar(page);
  expect((await estado(page)).slots[8]).toBe('');
  await tabuasPeloLivro(page, true);
  await d.arrastar(await centro(page, RESULTADO), await centro(page, slot(8)));
  await assentar(page);
  s = await estado(page);
  expect(s.slots[8]).toBe(`${TABUAS}x4`);
  expect(s.madeira).toBe(62);

  // 3. madeira na grade arrastando da barra; o resultado aparece
  await d.arrastar(await centro(page, slot(3)), await centro(page, '[data-grade-criacao="0"]'));
  await assentar(page);
  s = await estado(page);
  expect(s.grade[0]).toBe(MADEIRA);
  // a pilha toda foi para a grade: arrastar o resultado fabrica uma vez só
  await d.arrastar(await centro(page, RESULTADO), await centro(page, slot(13)));
  await assentar(page);
  s = await estado(page);
  await page.screenshot({ path: `${PASTA}/nuvem-dedo-grade-cheia.png` });
  expect(s.slots[13]).toBe(`${TABUAS}x4`);
  expect(s.grade[0]).toBe(MADEIRA);
  expect(s.naMao).toBe(false);
  // devolve a madeira da grade para a barra arrastando
  await d.arrastar(await centro(page, '[data-grade-criacao="0"]'), await centro(page, slot(3)));
  await assentar(page);
  s = await estado(page);
  expect(s.madeira).toBe(61);
  expect(s.grade[0]).toBe('');

  // 4. tocar e tocar: pega o resultado, solta na mochila
  await tabuasPeloLivro(page, true);
  await d.tocar(await centro(page, RESULTADO));
  await assentar(page);
  expect((await estado(page)).naMao).toBe(true);
  await d.tocar(await centro(page, slot(14)));
  await assentar(page);
  s = await estado(page);
  expect(s.slots[14]).toBe(`${TABUAS}x4`);
  expect(s.naMao).toBe(false);

  // 5. arrastar até o vão: nada muda
  const t0 = await estado(page);
  const a = (await page.locator(slot(9)).boundingBox())!;
  await d.arrastar(await centro(page, slot(9)), { x: a.x + a.width + 2.5, y: a.y + 4 });
  await assentar(page);
  s = await estado(page);
  expect(s.slots).toEqual(t0.slots);
  expect(s.naMao).toBe(false);

  // 6. fechar com algo na mão: volta para a mochila
  await d.tocar(await centro(page, slot(9)));
  await assentar(page);
  expect((await estado(page)).naMao).toBe(true);
  await page.keyboard.press('Escape');
  await expect.poll(() => page.evaluate(() => document.body.dataset.overlay ?? '')).toBe('');
  await assentar(page);
  s = await estado(page);
  expect(s.tabuas).toBe(t0.tabuas);
  expect(s.madeira).toBe(t0.madeira);
  // 7. tocar fora da janela com algo na mão joga no chão (dar a um amigo); sem nada, fecha
  await abrirInventario(page, true);
  const quatro = s.slots.findIndex((x) => x === `${TABUAS}x4`);
  await d.tocar(await centro(page, slot(quatro)));
  await assentar(page);
  await d.tocar({ x: 6, y: 6 });
  // as tábuas vão para o chão (logo: passados 2 s, quem jogou pode pegar de volta se
  // estiverem perto, num morro)
  await expect
    .poll(
      () =>
        page.evaluate(() =>
          window.__brumaluz!.itensNoChao!()
            .filter((i) => i.item === 'bloco:7')
            .reduce((t, i) => t + i.qtd, 0),
        ),
      { timeout: 1800, intervals: [100] },
    )
    .toBe(4);
  expect(await page.evaluate(() => document.body.dataset.overlay)).toBe('inventario');
  expect((await estado(page)).naMao).toBe(false);
  await d.tocar({ x: 6, y: 6 });
  await expect.poll(() => page.evaluate(() => document.body.dataset.overlay ?? '')).toBe('');
  expect(erros).toEqual([]);
  await page.context().close();
});

/** Põe um baú ou uma fornalha ao lado e abre (mundo do aparelho). */
async function abrirBloco(page: Page, bloco: number) {
  await page.evaluate(async (bloco) => {
    const e = window.__brumaluz!;
    const [x, y, z] = e.posicao!;
    const bx = Math.floor(x) + 1;
    const by = Math.floor(y);
    const bz = Math.floor(z);
    e.definirBloco!(bx, by, bz, bloco);
    await e.sincronizar!();
    window.dispatchEvent(
      new CustomEvent('brumaluz:usar', { detail: { bloco, x: bx, y: by, z: bz } }),
    );
  }, bloco);
  await expect.poll(() => page.evaluate(() => document.body.dataset.overlay)).toBe('inventario');
  await page.waitForTimeout(300);
}

for (const toque of [false, true]) {
  test(`aparelho, ${toque ? 'dedo' : 'mouse'}: baú e fornalha`, async ({ browser }) => {
    test.setTimeout(300_000);
    // tablet deitado: o baú e a mochila cabem sem rolar
    const page = await novaPagina(
      browser,
      `inv-bau-${toque ? 't' : 'm'}-e2e`,
      toque && { width: 1024, height: 768 },
    );
    const erros: string[] = [];
    page.on('pageerror', (e) => erros.push(String(e)));
    await mundoSobrevivencia(page, false);
    if (toque) await page.evaluate(() => document.body.classList.add('toque-ativo'));
    const d = await dedo(page);
    const arrastar = async (de: string, ate: string) =>
      toque
        ? d.arrastar(await centro(page, de), await centro(page, ate))
        : arrastarMouse(page, await centro(page, de), await centro(page, ate));
    const rapido = async (sel: string) =>
      toque
        ? d.doisToques(await centro(page, sel))
        : clicarMouse(page, await centro(page, sel), { shift: true });
    const bau = (i: number) => `[data-painel-bau] [data-externo="bau:${i}"]`;
    const conteudoBau = () =>
      page.evaluate(() =>
        [...document.querySelectorAll<HTMLElement>('[data-painel-bau] [data-externo]')].map(
          (e) => e.dataset.item ?? '',
        ),
      );

    // baú: barra → baú, baú → mochila, Shift das duas mãos
    await abrirBloco(page, 42);
    await arrastar(slot(0), bau(0));
    await assentar(page);
    expect((await conteudoBau())[0]).toBe('bloco:1');
    expect((await estado(page)).slots[0]).toBe('');
    await arrastar(bau(0), slot(20));
    await assentar(page);
    expect((await conteudoBau())[0]).toBe('');
    expect((await estado(page)).slots[20]).toBe('bloco:1x64');
    // Shift na mochila com o baú aberto: vai para o baú
    await rapido(slot(20));
    await assentar(page);
    expect((await conteudoBau())[0]).toBe('bloco:1');
    expect((await estado(page)).slots[20]).toBe('');
    // Shift no baú: volta para a mochila
    await rapido(bau(0));
    await assentar(page);
    expect((await conteudoBau())[0]).toBe('');
    expect((await estado(page)).slots.filter((x) => x === 'bloco:1x64').length).toBe(1);
    // soltar no vão do baú: nada some
    const a = (await page.locator(bau(1)).boundingBox())!;
    if (toque) await d.arrastar(await centro(page, slot(1)), { x: a.x - 2.5, y: a.y + 4 });
    else await arrastarMouse(page, await centro(page, slot(1)), { x: a.x - 2.5, y: a.y + 4 });
    await page.keyboard.press('Escape');
    await assentar(page);
    expect(await page.evaluate(() => window.__brumaluz!.inventario!.contar('bloco:2'))).toBe(64);
    await page.screenshot({ path: `${PASTA}/bau-${toque ? 'dedo' : 'mouse'}.png` });

    // fornalha: madeira no combustível arrastando, areia na entrada com Shift, a saída
    // arrastada para a mochila; soltar em cima da saída não pega nada
    await abrirBloco(page, 41);
    await arrastar(slot(3), '[data-externo="forn:comb"]');
    await rapido(slot(2));
    await assentar(page);
    const forn = () =>
      page.evaluate(() =>
        ['entrada', 'comb', 'saida'].map(
          (c) => document.querySelector<HTMLElement>(`[data-externo="forn:${c}"]`)!.dataset.item,
        ),
      );
    expect(await forn()).toEqual([AREIA, MADEIRA, '']);
    await expect.poll(async () => (await forn())[2], { timeout: 30_000 }).toBe('bloco:36');
    await arrastar(slot(4), '[data-externo="forn:saida"]');
    await assentar(page);
    expect((await estado(page)).naMao).toBe(!toque);
    if (!toque) await clicarMouse(page, await centro(page, slot(4)));
    await arrastar('[data-externo="forn:saida"]', slot(30));
    await assentar(page);
    expect((await estado(page)).slots[30]).toMatch(/^bloco:36x\d+$/);
    expect((await estado(page)).naMao).toBe(false);
    await page.screenshot({ path: `${PASTA}/fornalha-${toque ? 'dedo' : 'mouse'}.png` });
    expect(erros).toEqual([]);
    await page.context().close();
  });
}
