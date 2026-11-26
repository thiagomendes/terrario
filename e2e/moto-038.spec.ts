import { expect, test, type Browser, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { abrirMundo, assentar, criarMundo } from './guia-palco';
import { abrirRoleta, escolherNaRoleta, itensDaRoleta, meioDaRoleta, tocarNoMeio } from './roleta-palco';

/**
 * Spec 038 (T05): a motoquinha dourada ligada como os outros brinquedos de andar, e a camiseta e
 * o tênis redesenhados que não somem.
 *
 * - **Vila Neon, celular em pé:** achar a moto na lojinha (do toque na lojinha até o detalhe dela,
 *   no máximo 2 toques, a rolagem contando como um toque), na primeira visita e voltando de outra
 *   aba; comprar pela vitrine já monta, com o "vrum"; descer e montar pela roda (2 toques cada);
 *   "Meus tesouros" com a moto; recarregar com a moto comprada; recarregar com a camiseta e depois
 *   com o tênis vestidos (um de cada vez: os dois são da aba de roupa), com o desenho novo.
 * - **Duas crianças num mundo da nuvem** (o servidor local do e2e): a Bia vê a Ana montada na
 *   moto, e a Ana descer; a Ana recarrega com a camiseta e depois com o tênis, e os dois continuam
 *   com ela, também na tela da Bia.
 *
 *   E2E_ENV="-u 1000:1000 -e HOME=/tmp" scripts/e2e-gpu.sh e2e/moto-038.spec.ts --workers 2 --trace off
 */
test.setTimeout(900_000);
test.use({ actionTimeout: 30_000 });
const PASTA = 'capturas-038/t05-ligacao';
const MOTO = 'motoquinha-dourada';

type Perfil = {
  perfil: { moedas: number; premium: string[]; vestidos: Record<string, string> };
  aplicarGanho(g: { moedas: number; xp: number; pontos: Record<string, number> }): unknown;
  comprarPremium(id: string): { ok: boolean };
  vestirPremium(id: string, v: boolean): boolean;
};
const ganhar = (p: Page, moedas: number) =>
  p.evaluate((moedas) => {
    (window as unknown as { __almaCrianca: Perfil }).__almaCrianca.aplicarGanho({ moedas, xp: 0, pontos: {} });
  }, moedas);
const comprar = (p: Page, id: string) =>
  p.evaluate((id) => {
    const a = (window as unknown as { __almaCrianca: Perfil }).__almaCrianca;
    a.aplicarGanho({ moedas: 160, xp: 0, pontos: {} });
    return a.comprarPremium(id).ok;
  }, id);
const vestir = (p: Page, id: string) =>
  p.evaluate((id) => (window as unknown as { __almaCrianca: Perfil }).__almaCrianca.vestirPremium(id, true), id);
const perfil = (p: Page) => p.evaluate(() => (window as unknown as { __almaCrianca: Perfil }).__almaCrianca.perfil);
const montado = (p: Page) => p.evaluate(() => window.__brumaluz!.personagem!.montado!());
const premiumNoJogo = (p: Page) => p.evaluate(() => window.__brumaluz!.personagem!.aparencia().premium ?? {});
const sons = (p: Page) => p.evaluate(() => window.__brumaluz!.sonsTocados?.() ?? []);
const fotografar = async (p: Page, nome: string) => {
  await p.waitForTimeout(700);
  await p.screenshot({ path: `${PASTA}/${nome}.jpg`, type: 'jpeg', quality: 82 });
};
const tocarEl = async (p: Page, sel: string) => {
  const l = p.locator(sel).first();
  await l.waitFor({ state: 'visible', timeout: 10_000 });
  await l.tap({ timeout: 10_000 });
};

/**
 * O desenho novo no jogo de verdade (spec 038, T04): a faixa do tênis só no ouro (sem o azul de
 * antes, em 12 amostras de uma volta da luz) e o aquário sem o peixe laranja de antes (#ff8a1f),
 * com o amarelinho nadando.
 */
async function desenhoNovo(p: Page, peca: 'camiseta' | 'tenis') {
  return p.evaluate(async (peca) => {
    const scene = window.__brumaluz!.cenaBabylon!();
    if (peca === 'tenis') {
      const m = scene.materials.find((x) => x.name === 'premium-luz-cometa') as
        | { emissiveColor: { r: number; g: number; b: number } }
        | undefined;
      if (!m) return { achou: false, pior: 0 };
      let pior = 0;
      for (let i = 0; i < 12; i++) {
        const c = m.emissiveColor;
        pior = Math.max(pior, c.b / Math.max(0.01, c.r));
        await new Promise((ok) => setTimeout(ok, 200));
      }
      return { achou: true, pior };
    }
    const tex = scene.textures.find((t) => t.name === 'premium-aquario') as
      | { getContext(): CanvasRenderingContext2D; getSize(): { width: number; height: number } }
      | undefined;
    if (!tex) return { achou: false, laranja: 0, amarelo: 0 };
    const { width, height } = tex.getSize();
    const d = tex.getContext().getImageData(0, 0, width, height).data;
    const perto = (i: number, r: number, g: number, b: number, tol: number) =>
      Math.abs(d[i] - r) <= tol && Math.abs(d[i + 1] - g) <= tol && Math.abs(d[i + 2] - b) <= tol;
    let laranja = 0;
    let amarelo = 0;
    for (let i = 0; i < d.length; i += 4) {
      if (perto(i, 0xff, 0x8a, 0x1f, 8)) laranja++;
      if (perto(i, 0xff, 0xd2, 0x3a, 10)) amarelo++;
    }
    return { achou: true, laranja, amarelo };
  }, peca);
}
async function conferirDesenho(p: Page, peca: 'camiseta' | 'tenis') {
  // (a textura e a luz nascem com a primeira peça vestida, e o aquário redesenha 24 vezes por segundo)
  await expect.poll(async () => (await desenhoNovo(p, peca)).achou, { timeout: 20_000 }).toBe(true);
  const d = await desenhoNovo(p, peca);
  console.log(`desenho novo (${peca}): ${JSON.stringify(d)}`);
  if (peca === 'tenis') expect((d as { pior: number }).pior, 'a faixa do tênis sem azul').toBeLessThan(0.6);
  else {
    expect((d as { amarelo: number }).amarelo, 'o amarelinho nadando').toBeGreaterThan(40);
    // (o peixe laranja de antes era do tamanho do amarelinho, umas 700 casas; a beira do amarelinho
    // com a barbatana dá umas 20 casas parecidas)
    expect((d as { laranja: number }).laranja, 'sem o peixe laranja de antes').toBeLessThan(100);
  }
}

/**
 * Do toque na lojinha até o detalhe da moto: conta a aba (se a vitrine abriu em outra), a
 * rolagem (se o cartão não está inteiro à vista) e o toque no cartão.
 */
async function acharMoto(p: Page, rotulo: string): Promise<number> {
  let toques = 0;
  await escolherNaRoleta(p, 'lojinha');
  await expect(p.locator('[data-alma-loja]')).toBeVisible();
  if ((await p.locator('[data-alma-aba="andar"]').getAttribute('aria-selected')) !== 'true') {
    await tocarEl(p, '[data-alma-aba="andar"]');
    toques++;
  }
  const cartao = p.locator(`.alma-lcard[data-premium="${MOTO}"]`);
  await cartao.waitFor({ state: 'attached' });
  // (os cartões entram com um pulinho de 0,5 s)
  await p.waitForTimeout(900);
  const vista = await cartao.evaluate((c) => {
    const r = c.getBoundingClientRect();
    const pr = c.closest('[data-alma-prateleira]')!.getBoundingClientRect();
    const cima = Math.max(0, pr.top);
    const baixo = Math.min(innerHeight, pr.bottom);
    const aVista = Math.max(0, Math.min(r.bottom, baixo) - Math.max(r.top, cima));
    return { fracao: aVista / r.height, topo: r.top, base: r.bottom, altura: r.height, tela: innerHeight };
  });
  await fotografar(p, `achar-${rotulo}-vitrine`);
  if (vista.fracao < 0.999) {
    await cartao.scrollIntoViewIfNeeded();
    toques++;
  }
  await tocarEl(p, `.alma-lcard[data-premium="${MOTO}"]`);
  toques++;
  await expect(p.locator(`[data-alma-detalhe] .caixa[data-premium="${MOTO}"]`)).toBeVisible();
  console.log(
    `achar a moto (${rotulo}): ${toques} toques depois da lojinha; o cartão ${(vista.fracao * 100).toFixed(0)}% à vista ` +
      `(de ${vista.topo.toFixed(0)} a ${vista.base.toFixed(0)} px, altura ${vista.altura.toFixed(0)}, tela ${vista.tela})`,
  );
  return toques;
}

test('Vila Neon (celular em pé): achar, comprar, montar, descer e recarregar a moto; a camiseta e o tênis depois de recarregar', async ({
  browser,
}) => {
  mkdirSync(PASTA, { recursive: true });
  const page = await abrirMundo(browser, { id: 'moto-038', tema: 'vila-neon', tamanho: 'empe' });
  await assentar(page);
  await page.evaluate(() => {
    const e = window.__brumaluz!;
    e.voar?.(false);
    e.apontar!(0, -0.05);
  });
  await ganhar(page, 160);
  const recarregar = async () => {
    await page.reload();
    await page.waitForFunction(() => window.__brumaluz?.ready === true, undefined, { timeout: 240_000 });
    await page.evaluate(() => {
      document.querySelector<HTMLElement>('.entrada')?.setAttribute('hidden', '');
      const e = window.__brumaluz!;
      e.pausarDia = true;
      e.hora = 0.42;
    });
    await page.addStyleTag({ content: '.toast-area { display: none !important; }' });
    await page.waitForTimeout(1500);
  };

  // ------------------------------------------------ achar: na primeira visita e voltando de outra aba
  const primeira = await acharMoto(page, 'primeira-visita');
  expect(primeira, 'primeira visita: do toque na lojinha até o detalhe').toBeLessThanOrEqual(2);
  await tocarEl(page, '[data-alma-detalhe] .caixa > [data-alma-fechar]');
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-alma-loja]')).toHaveCount(0);
  // ela volta outro dia, e da última vez estava na aba de roupa (a vitrine abre nela)
  await page.evaluate(() =>
    localStorage.setItem('terrario:loja-novidades', JSON.stringify({ versao: 1, abriu: true, aba: 'roupa', vistos: [] })),
  );
  await recarregar();
  const voltando = await acharMoto(page, 'voltando-da-roupa');
  expect(voltando, 'voltando de outra aba: do toque na lojinha até o detalhe').toBeLessThanOrEqual(2);

  // ------------------------------------------------ comprar pela vitrine já monta, com o "vrum"
  const sons0 = (await sons(page)).length;
  await tocarEl(page, '[data-alma-detalhe] [data-alma-comprar]');
  await tocarEl(page, '[data-alma-confirmar] [data-alma-sim]');
  const oba = page.locator('[data-alma-festa] [data-alma-oba]');
  await oba.waitFor({ timeout: 8000 });
  await fotografar(page, '01-festa-da-moto');
  await oba.tap();
  await expect(page.locator('[data-alma-festa]')).toHaveCount(0, { timeout: 6000 });
  // (depois da festa ela volta ao jogo; se a vitrine ficou, ela fecha)
  await page.waitForTimeout(600);
  if (await page.locator('[data-alma-loja]').count()) await page.keyboard.press('Escape');
  await expect(page.locator('[data-alma-loja]')).toHaveCount(0, { timeout: 6000 });
  await page.waitForFunction((m) => window.__brumaluz!.personagem!.montado!() === m, MOTO, { timeout: 10_000 });
  expect((await perfil(page)).premium).toContain(MOTO);
  expect((await perfil(page)).moedas).toBe(20);
  expect(await page.evaluate(() => window.__brumaluz!.montadoNoDesenho!())).toBe(true);
  await page.waitForTimeout(500);
  const tocouAoComprar = (await sons(page)).slice(sons0);
  console.log(`sons ao comprar: ${tocouAoComprar.join(' ')}`);
  expect(tocouAoComprar).toContain('efeito:vrum');
  await fotografar(page, '02-comprou-ja-montada');

  // ------------------------------------------------ descer e montar pela roda (2 toques cada)
  await abrirRoleta(page);
  expect(await meioDaRoleta(page)).toBe('descer-brinquedo');
  await tocarNoMeio(page);
  await page.waitForFunction(() => window.__brumaluz!.personagem!.montado!() === null);
  expect((await premiumNoJogo(page)).andar).toBe(MOTO);
  await fotografar(page, '03-desceu');
  await abrirRoleta(page);
  expect(await meioDaRoleta(page)).toBe(`andar-${MOTO}`);
  await fotografar(page, '04-roda-com-a-moto');
  const sons1 = (await sons(page)).length;
  await tocarNoMeio(page);
  await page.waitForFunction((m) => window.__brumaluz!.personagem!.montado!() === m, MOTO);
  await page.waitForTimeout(400);
  const tocouAoMontar = (await sons(page)).slice(sons1);
  console.log(`sons ao montar: ${tocouAoMontar.join(' ')}`);
  // (o puf é de antes da 019 e não passa pelo observador; o "vrum" passa)
  expect(tocouAoMontar).toContain('efeito:vrum');
  // andando: só as rodinhas (nenhum "vrum" de motor)
  const sons2 = (await sons(page)).length;
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(2500);
  await page.keyboard.up('KeyW');
  const andando = (await sons(page)).slice(sons2);
  console.log(`sons andando de moto: ${andando.join(' ')}`);
  expect(andando).not.toContain('efeito:vrum');
  expect(andando).toContain('efeito:rodinha');
  await fotografar(page, '05-andando-de-moto');

  // ------------------------------------------------ "Meus tesouros" com a moto
  await page.keyboard.press('KeyC');
  await expect(page.locator('[data-painel-personagem]')).toBeVisible();
  await tocarEl(page, '[data-aba="fantasias"]');
  await expect(page.locator(`button[data-tesouro="${MOTO}"]`)).toBeVisible();
  await fotografar(page, '06-meus-tesouros');
  await tocarEl(page, '[data-jogar]');
  await expect(page.locator('.entrada')).toBeHidden();

  // ------------------------------------------------ recarregar: a moto continua comprada e vestida
  await recarregar();
  expect((await perfil(page)).premium).toContain(MOTO);
  expect(await montado(page)).toBeNull();
  expect((await premiumNoJogo(page)).andar).toBe(MOTO);
  await abrirRoleta(page);
  expect(await itensDaRoleta(page)).toContain(`andar-${MOTO}`);
  await tocarNoMeio(page);
  await page.waitForFunction((m) => window.__brumaluz!.personagem!.montado!() === m, MOTO);
  await fotografar(page, '07-recarregou-e-montou');

  // ------------------------------------------------ a camiseta e o tênis depois de recarregar
  expect(await comprar(page, 'camiseta-aquario')).toBe(true);
  expect(await comprar(page, 'tenis-cometa')).toBe(true);
  // (os dois são da aba de roupa: um de cada vez)
  expect(await vestir(page, 'camiseta-aquario')).toBe(true);
  await recarregar();
  expect((await perfil(page)).premium).toEqual(expect.arrayContaining([MOTO, 'camiseta-aquario', 'tenis-cometa']));
  expect((await premiumNoJogo(page)).roupa).toBe('camiseta-aquario');
  await conferirDesenho(page, 'camiseta');
  await fotografar(page, '08-recarregou-de-camiseta');
  expect(await vestir(page, 'tenis-cometa')).toBe(true);
  await recarregar();
  expect((await premiumNoJogo(page)).roupa).toBe('tenis-cometa');
  expect((await perfil(page)).premium).toEqual(expect.arrayContaining([MOTO, 'camiseta-aquario']));
  await conferirDesenho(page, 'tenis');
  await fotografar(page, '09-recarregou-de-tenis');
  await page.context().close();
});

// ------------------------------------------------------------------ duas crianças na nuvem
async function jogador(browser: Browser, id: string, apelido: string): Promise<Page> {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await ctx.addInitScript(
    ([i, a]) => {
      localStorage.setItem(
        'terrario:identidade',
        JSON.stringify({ id: i, chave: `chave-de-teste-${i}-0123456789abcdef`, apelido: a }),
      );
      localStorage.setItem('terrario:config', JSON.stringify({ distancia: 3, mostrarFps: false, mostrarAtalhos: false }));
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
/** O que a Bia vê da Ana: montada e o que ela veste (pela aparência passada a limpo). */
const anaNaBia = (bia: Page) =>
  bia.evaluate(() => {
    const a = (window.__brumaluz!.outrosJogadores?.() ?? []).find((q) => q.apelido === 'Ana') as
      | { montado: boolean; montadoNoDesenho: boolean; aparencia: string }
      | undefined;
    if (!a) return null;
    const ap = JSON.parse(a.aparencia || '{}') as { premium?: Record<string, string> };
    return { montado: a.montado, desenho: a.montadoNoDesenho, premium: ap.premium ?? {} };
  });

test('num mundo da nuvem: a amiga vê a moto; a camiseta e o tênis continuam depois de recarregar', async ({ browser }) => {
  mkdirSync(PASTA, { recursive: true });
  const ana = await jogador(browser, 'ana-moto', 'Ana');
  await criarMundo(ana, 'moto-amigos', 'vila-neon');
  await ana.goto('/?mundo=moto-amigos');
  await pronto(ana);
  await entrarNoJogo(ana);
  await ana.evaluate(() => window.dispatchEvent(new CustomEvent('brumaluz:amigos')));
  await ana.locator('[data-abrir-para-amigos]').click();
  await ana.waitForURL(/sala=/, { timeout: 60_000 });
  await pronto(ana);
  await entrarNoJogo(ana);
  const codigo = await ana.locator('[data-codigo-mundo]').getAttribute('data-codigo-mundo', { timeout: 30_000 });
  await ana.keyboard.press('Escape');
  const bia = await jogador(browser, 'bia-moto', 'Bia');
  await bia.goto(`/?sala=${codigo}`);
  await bia.locator('[data-entrar-mundo]').click({ timeout: 60_000 });
  await pronto(bia);
  await entrarNoJogo(bia);
  await bia.waitForFunction(() => (window.__brumaluz!.outrosJogadores?.() ?? []).some((q) => q.apelido === 'Ana'), null, {
    timeout: 90_000,
  });
  // as duas lado a lado, a Bia olhando para a Ana
  const juntar = async () => {
    const [x, y, z] = await ana.evaluate(() => window.__brumaluz!.jogadorPes!());
    await ana.evaluate(() => {
      window.__brumaluz!.voar?.(false);
      window.__brumaluz!.apontar!(-Math.PI / 2, 0.1);
    });
    await bia.evaluate(
      ([x, y, z]) => {
        const e = window.__brumaluz!;
        e.voar?.(false);
        e.teleportar!(x - 1.5, z - 5, y + 0.2);
        e.apontar!(Math.atan2(1.5, 5), 0.28);
      },
      [x, y, z] as const,
    );
    await bia.waitForTimeout(2200);
  };
  const ve = (cond: string) =>
    bia.waitForFunction(
      (cond) => {
        const a = (window.__brumaluz!.outrosJogadores?.() ?? []).find((q) => q.apelido === 'Ana') as
          | { montado?: boolean; aparencia?: string }
          | undefined;
        if (!a) return false;
        const p = (JSON.parse(a.aparencia || '{}') as { premium?: Record<string, string> }).premium ?? {};
        const [campo, valor] = cond.split('=');
        if (campo === 'montado') return String(!!a.montado) === valor;
        return p[campo] === valor;
      },
      cond,
      { timeout: 30_000 },
    );

  // a Ana compra a moto: já monta, e a Bia vê
  expect(await comprar(ana, MOTO)).toBe(true);
  await ana.waitForFunction((m) => window.__brumaluz!.personagem!.montado!() === m, MOTO);
  await ve('montado=true');
  await ve(`andar=${MOTO}`);
  await juntar();
  expect((await anaNaBia(bia))!.desenho).toBe(true);
  await bia.screenshot({ path: `${PASTA}/10-nuvem-bia-ve-ana-na-moto.jpg`, type: 'jpeg', quality: 82 });
  // desce pela roda: a Bia vê a pé
  await abrirRoleta(ana);
  expect(await meioDaRoleta(ana)).toBe('descer-brinquedo');
  await tocarNoMeio(ana);
  await ve('montado=false');

  // a camiseta, depois o tênis: a Ana recarrega a sala, e os dois continuam (também para a Bia)
  const recarregarAna = async () => {
    await ana.reload();
    const entrar = ana.locator('[data-entrar-mundo]');
    await Promise.race([pronto(ana), entrar.waitFor({ timeout: 240_000 }).then(() => entrar.click())]);
    await pronto(ana);
    await entrarNoJogo(ana);
    await bia.waitForFunction(() => (window.__brumaluz!.outrosJogadores?.() ?? []).some((q) => q.apelido === 'Ana'), null, {
      timeout: 90_000,
    });
  };
  expect(await comprar(ana, 'camiseta-aquario')).toBe(true);
  expect(await comprar(ana, 'tenis-cometa')).toBe(true);
  expect(await vestir(ana, 'camiseta-aquario')).toBe(true);
  await ve('roupa=camiseta-aquario');
  await recarregarAna();
  expect((await premiumNoJogo(ana)).roupa).toBe('camiseta-aquario');
  expect((await perfil(ana)).premium).toEqual(expect.arrayContaining([MOTO, 'camiseta-aquario', 'tenis-cometa']));
  await ve('roupa=camiseta-aquario');
  await conferirDesenho(bia, 'camiseta');
  await juntar();
  await bia.screenshot({ path: `${PASTA}/11-nuvem-recarregou-de-camiseta.jpg`, type: 'jpeg', quality: 82 });
  expect(await vestir(ana, 'tenis-cometa')).toBe(true);
  await ve('roupa=tenis-cometa');
  await recarregarAna();
  expect((await premiumNoJogo(ana)).roupa).toBe('tenis-cometa');
  await ve('roupa=tenis-cometa');
  await ve(`andar=${MOTO}`);
  await conferirDesenho(bia, 'tenis');
  await juntar();
  await bia.screenshot({ path: `${PASTA}/12-nuvem-recarregou-de-tenis.jpg`, type: 'jpeg', quality: 82 });
  await ana.context().close();
  await bia.context().close();
});
