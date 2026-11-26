import { expect, test, type Browser, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';

/**
 * Spec 038 (T05), no site publicado e na sala de teste da nuvem: a camiseta de aquário e o
 * tênis-cometa não somem. A Ana abre um mundo para amigos, a Bia entra pelo código; a Ana compra
 * os dois (um de cada vez vestido: são da aba de roupa), recarrega, e continua com eles, também na
 * tela da Bia (o servidor da nuvem passa a aparência a limpo e não tira nada).
 *
 * Com `NUVEM_038=publicada` (depois de a 038 sair no site e no servidor), confere também o desenho
 * novo (a faixa do tênis sem o azul, o aquário sem o peixe laranja) e a motoquinha: a Bia vê a Ana
 * montada, e depois de recarregar a moto continua comprada. Antes disso, o servidor da nuvem é o de
 * antes da 038 e tira a moto da aparência (o `versao-038.test.ts` prova esse caso).
 *
 *   SITE=https://... npx playwright test -c playwright.nuvem.config.ts e2e-nuvem/retoques-038.spec.ts
 *   (na placa: E2E_ENV="-u 1000:1000 -e HOME=/tmp -e SITE=..." scripts/e2e-gpu.sh -c playwright.nuvem.config.ts e2e-nuvem/retoques-038.spec.ts)
 */
declare const process: { env: Record<string, string | undefined> };
const PUBLICADA = process.env.NUVEM_038 === 'publicada';
const PASTA = 'capturas-038/t05-ligacao/nuvem';
const MOTO = 'motoquinha-dourada';

type Perfil = {
  perfil: { moedas: number; premium: string[]; vestidos: Record<string, string> };
  aplicarGanho(g: { moedas: number; xp: number; pontos: Record<string, number> }): unknown;
  comprarPremium(id: string): { ok: boolean };
  vestirPremium(id: string, v: boolean): boolean;
};
const comprar = (p: Page, id: string) =>
  p.evaluate((id) => {
    const a = (window as unknown as { __almaCrianca: Perfil }).__almaCrianca;
    a.aplicarGanho({ moedas: 160, xp: 0, pontos: {} });
    return a.comprarPremium(id).ok;
  }, id);
const vestir = (p: Page, id: string) =>
  p.evaluate((id) => (window as unknown as { __almaCrianca: Perfil }).__almaCrianca.vestirPremium(id, true), id);
const perfil = (p: Page) => p.evaluate(() => (window as unknown as { __almaCrianca: Perfil }).__almaCrianca.perfil);
const premiumNoJogo = (p: Page) => p.evaluate(() => window.__brumaluz!.personagem!.aparencia().premium ?? {});

async function jogador(browser: Browser, id: string, apelido: string): Promise<Page> {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await ctx.addInitScript(
    ([i, a]) => {
      localStorage.setItem(
        'terrario:identidade',
        JSON.stringify({ id: i, chave: `chave-do-teste-na-nuvem-${i}-0123456789`, apelido: a }),
      );
    },
    [id, apelido],
  );
  const p = await ctx.newPage();
  p.on('pageerror', (e) => console.log(`[${apelido}] erro: ${String(e)}`));
  return p;
}
const pronto = (p: Page) => p.waitForFunction(() => window.__brumaluz?.ready === true, undefined, { timeout: 240_000 });
/** Entra (pelo botão de entrar, quando a página pede) e espera o jogo. */
async function entrar(p: Page) {
  const botao = p.locator('[data-entrar-mundo]');
  await Promise.race([pronto(p), botao.waitFor({ timeout: 240_000 }).then(() => botao.click())]);
  await pronto(p);
  await p.evaluate(() => document.querySelector('.entrada')?.setAttribute('hidden', ''));
}

/** O desenho novo (o mesmo do `e2e/moto-038.spec.ts`), na cena de quem vê. */
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
        pior = Math.max(pior, m.emissiveColor.b / Math.max(0.01, m.emissiveColor.r));
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

test('na nuvem: a camiseta e o tênis continuam depois de recarregar (e, publicada, a moto)', async ({ browser }) => {
  test.setTimeout(900_000);
  mkdirSync(PASTA, { recursive: true });
  const sufixo = Date.now().toString(36);
  const ana = await jogador(browser, `ana-038-${sufixo}`, 'Ana');
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
  const bia = await jogador(browser, `bia-038-${sufixo}`, 'Bia');
  await bia.goto(`/?sala=${codigo}`);
  await entrar(bia);
  const anaNaSala = () =>
    bia.waitForFunction(() => (window.__brumaluz!.outrosJogadores?.() ?? []).some((q) => q.apelido === 'Ana'), null, {
      timeout: 90_000,
    });
  await anaNaSala();
  /** A Bia espera ver a Ana assim (um campo do premium, ou `montado`). */
  const ve = (campo: string, valor: string) =>
    bia.waitForFunction(
      ([campo, valor]) => {
        const a = (window.__brumaluz!.outrosJogadores?.() ?? []).find((q) => q.apelido === 'Ana') as
          | { montado?: boolean; aparencia?: string }
          | undefined;
        if (!a) return false;
        if (campo === 'montado') return String(!!a.montado) === valor;
        const p = (JSON.parse(a.aparencia || '{}') as { premium?: Record<string, string> }).premium ?? {};
        return p[campo] === valor;
      },
      [campo, valor] as const,
      { timeout: 30_000 },
    );
  const recarregarAna = async () => {
    await ana.reload();
    await entrar(ana);
    await anaNaSala();
    await ana.waitForTimeout(2000);
  };
  const conferirDesenho = async (peca: 'camiseta' | 'tenis') => {
    await expect.poll(async () => (await desenhoNovo(bia, peca)).achou, { timeout: 20_000 }).toBe(true);
    const d = await desenhoNovo(bia, peca);
    // (antes da 038 publicada, só anota: é a medida do desenho de antes, para comparar)
    console.log(`desenho (${peca}, ${PUBLICADA ? 'publicada' : 'antes da 038'}): ${JSON.stringify(d)}`);
    if (!PUBLICADA) return;
    if (peca === 'tenis') expect((d as { pior: number }).pior).toBeLessThan(0.6);
    else {
      expect((d as { amarelo: number }).amarelo).toBeGreaterThan(40);
      // (o peixe laranja de antes dava centenas de casas; a beira do amarelinho, umas 20)
      expect((d as { laranja: number }).laranja).toBeLessThan(100);
    }
  };

  // a camiseta: comprada, vestida; a Ana recarrega e continua com ela (e a Bia vê)
  expect(await comprar(ana, 'camiseta-aquario')).toBe(true);
  expect(await comprar(ana, 'tenis-cometa')).toBe(true);
  expect(await vestir(ana, 'camiseta-aquario')).toBe(true);
  await ve('roupa', 'camiseta-aquario');
  await recarregarAna();
  expect((await premiumNoJogo(ana)).roupa).toBe('camiseta-aquario');
  expect((await perfil(ana)).premium).toEqual(expect.arrayContaining(['camiseta-aquario', 'tenis-cometa']));
  await ve('roupa', 'camiseta-aquario');
  await conferirDesenho('camiseta');
  await bia.screenshot({ path: `${PASTA}/bia-ve-ana-de-camiseta.jpg`, type: 'jpeg', quality: 80 });

  // o tênis, do mesmo jeito
  expect(await vestir(ana, 'tenis-cometa')).toBe(true);
  await ve('roupa', 'tenis-cometa');
  await recarregarAna();
  expect((await premiumNoJogo(ana)).roupa).toBe('tenis-cometa');
  await ve('roupa', 'tenis-cometa');
  await conferirDesenho('tenis');
  await bia.screenshot({ path: `${PASTA}/bia-ve-ana-de-tenis.jpg`, type: 'jpeg', quality: 80 });

  // a motoquinha (só com a 038 publicada: o servidor de antes a tira da aparência)
  if (PUBLICADA) {
    expect(await comprar(ana, MOTO)).toBe(true);
    await ana.waitForFunction((m) => window.__brumaluz!.personagem!.montado!() === m, MOTO);
    await ve('montado', 'true');
    await ve('andar', MOTO);
    await bia.screenshot({ path: `${PASTA}/bia-ve-ana-na-moto.jpg`, type: 'jpeg', quality: 80 });
    await recarregarAna();
    expect((await perfil(ana)).premium).toContain(MOTO);
    expect((await premiumNoJogo(ana)).andar).toBe(MOTO);
    await ve('andar', MOTO);
    expect((await premiumNoJogo(ana)).roupa).toBe('tenis-cometa');
  }
  await ana.context().close();
  await bia.context().close();
});
