import { expect, test, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';

/**
 * Spec 015 (decisão do dono: opção C do esboço dos menus, em todo aparelho). Em cima à
 * esquerda, informações e o botão da roda; embaixo do minimapa, só a mochila; o minimapa abre
 * o mapa grande. A roda tem Mapa, Diário, Personagem, Foto, Gestos, Tela cheia e Pausa;
 * "Gestos" troca pela roda de gestos com "Voltar" no meio; segurar o botão abre os gestos.
 */
const PASTA = 'test-results/gestos015';
mkdirSync(PASTA, { recursive: true });

async function entrar(page: Page) {
  // o teste usa o mouse livre (com o mouse preso na câmera, o clique vai todo para o jogo e a
  // criança usa as teclas); voltar da pausa prende o mouse, então aqui ele nunca prende
  await page.addInitScript(() => {
    HTMLElement.prototype.requestPointerLock = function () {
      return Promise.resolve();
    } as typeof HTMLElement.prototype.requestPointerLock;
  });
  await page.goto('/');
  await page.waitForFunction(() => window.__brumaluz?.ready === true, undefined, {
    timeout: 180_000,
  });
  await page.evaluate(() => {
    document.querySelector('.entrada')?.setAttribute('hidden', '');
    const e = window.__brumaluz!;
    e.pausarDia = true;
    e.hora = 0.42;
  });
  await page.waitForTimeout(1200);
}

const menu = (page: Page) => page.evaluate(() => window.__brumaluz!.gestos!.menu());

/** Volta ao jogo: fecha painel, modo foto, pausa e a tela do personagem. */
async function voltarAoJogo(page: Page) {
  for (let i = 0; i < 4; i++) {
    const aberto = await page.evaluate(() => {
      const e = window.__brumaluz!;
      if (e.modoFoto?.ativo()) e.modoFoto.alternar();
      const entrada = document.querySelector('.entrada');
      if (entrada && !entrada.hasAttribute('hidden')) entrada.setAttribute('hidden', '');
      return (
        !!document.body.dataset.overlay || !!document.querySelector('.modal-fundo:not([hidden])')
      );
    });
    if (!aberto) break;
    const fechar = page.locator('[data-fechar]:visible').first();
    if (await fechar.count()) await fechar.click();
    else await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
  }
  await page.evaluate(() => window.dispatchEvent(new Event('resize')));
  await page.waitForTimeout(300);
}

/** O que cada item abre (conferido no jogo). */
const ABRE: Record<string, (p: Page) => Promise<boolean>> = {
  mapa: (p) => p.evaluate(() => document.body.dataset.overlay === 'mapa'),
  diario: (p) => p.evaluate(() => !!document.querySelector('.modal-fundo:not([hidden])')),
  personagem: (p) =>
    p.evaluate(
      () =>
        !!document.querySelector('.entrada:not([hidden])') &&
        !!document.querySelector('[data-painel-personagem]')?.getClientRects().length,
    ),
  foto: (p) => p.evaluate(() => document.body.classList.contains('modo-foto')),
  pausa: (p) => p.evaluate(() => document.body.dataset.overlay === 'pausa'),
};

async function cadaItem(page: Page, tocar: boolean, nome: string) {
  const clicar = async (sel: string) =>
    tocar ? page.locator(sel).tap() : page.locator(sel).click();
  // o alto: informações, a roda ao lado; a mochila embaixo do minimapa
  for (const sel of ['[data-hud-info]', '[data-botao-roda]', '[data-botao-mochila]'])
    await expect(page.locator(sel)).toBeVisible();
  await expect(page.locator('.barra-atalhos')).toHaveCount(0);
  await expect(page.locator('.toque .topo button')).toHaveCount(0);

  await clicar('[data-botao-roda]');
  await expect.poll(() => menu(page)).toBe('menu');
  await page.waitForTimeout(400);
  const itens = await page
    .locator('.roda.aberta button.ativo')
    .evaluateAll((bs) => bs.map((b) => b.getAttribute('data-item')));
  expect(itens.filter((i) => i !== 'tela')).toEqual([
    'mapa',
    'diario',
    'personagem',
    'foto',
    'gestos',
    'pausa',
  ]);
  await page.screenshot({ path: `${PASTA}/menu-roda-${nome}.png` });
  await clicar('[data-botao-roda]');
  await expect.poll(() => menu(page)).toBe(null);

  for (const id of Object.keys(ABRE)) {
    await clicar('[data-botao-roda]');
    await expect.poll(() => menu(page)).toBe('menu');
    await page.waitForTimeout(350);
    await clicar(`.roda.aberta button.ativo[data-item="${id}"]`);
    await expect.poll(() => ABRE[id](page), { message: id }).toBe(true);
    await expect.poll(() => menu(page)).toBe(null);
    await voltarAoJogo(page);
  }

  // Gestos troca a roda no lugar, com Voltar no meio
  await clicar('[data-botao-roda]');
  await expect.poll(() => menu(page)).toBe('menu');
  await page.waitForTimeout(350);
  await clicar('.roda.aberta button.ativo[data-item="gestos"]');
  await expect.poll(() => menu(page)).toBe('gestos');
  await page.waitForTimeout(450);
  await expect(page.locator('.roda.aberta button.ativo')).toHaveCount(9);
  await page.screenshot({ path: `${PASTA}/menu-gestos-${nome}.png` });
  await clicar('.roda.aberta button.ativo[data-item="voltar"]');
  await expect.poll(() => menu(page)).toBe('menu');
  await page.waitForTimeout(350);
  await clicar('.roda.aberta button.ativo[data-item="gestos"]');
  await page.waitForTimeout(450);
  await clicar('.roda.aberta button.ativo[data-item="aplaudir"]');
  await expect
    .poll(() => page.evaluate(() => window.__brumaluz!.gestos!.local().gesto))
    .toBe('aplaudir');
  await expect.poll(() => menu(page)).toBe(null);

  // segurar o botão da roda abre os gestos direto
  const b = page.locator('[data-botao-roda]');
  await b.dispatchEvent('pointerdown', { pointerType: tocar ? 'touch' : 'mouse', isPrimary: true });
  await page.waitForTimeout(650);
  await b.dispatchEvent('pointerup', { pointerType: tocar ? 'touch' : 'mouse', isPrimary: true });
  await b.dispatchEvent('click');
  await expect.poll(() => menu(page)).toBe('gestos');
  await page.keyboard.press('Escape');
  await expect.poll(() => menu(page)).toBe(null);

  // a mochila a um toque; o minimapa abre o mapa grande
  await clicar('[data-botao-mochila]');
  await expect.poll(() => page.evaluate(() => document.body.dataset.overlay)).toBe('inventario');
  await voltarAoJogo(page);
  await clicar('[data-minimapa]');
  await expect.poll(() => page.evaluate(() => document.body.dataset.overlay)).toBe('mapa');
  await voltarAoJogo(page);
  await page.screenshot({ path: `${PASTA}/hud-${nome}.png` });
}

test('computador: menu de roda, cada item abre o seu, mochila e minimapa', async ({ page }) => {
  test.setTimeout(300_000);
  const erros: string[] = [];
  page.on('pageerror', (e) => erros.push(String(e)));
  await page.setViewportSize({ width: 1280, height: 720 });
  await entrar(page);
  // no computador a missão fica sempre à vista (abaixo dos botões); o botão de informações
  // mostra e esconde só as pílulas
  const missao = page.locator('[data-missao-atual]');
  await expect(missao).toBeVisible();
  await expect(page.locator('.hud .som')).toBeHidden();
  const caixas = await page.evaluate(() => {
    const c = (s: string) => document.querySelector(s)!.getBoundingClientRect();
    return { missao: c('.missao-hud'), roda: c('[data-botao-roda]'), info: c('[data-hud-info]') };
  });
  expect(caixas.missao.top).toBeGreaterThanOrEqual(
    Math.max(caixas.roda.bottom, caixas.info.bottom),
  );
  await page.locator('[data-hud-info]').click();
  await expect(page.locator('.hud .som')).toBeVisible();
  await expect(missao).toBeVisible();
  const aberto = await page.evaluate(() => ({
    som: document.querySelector('.hud .som')!.getBoundingClientRect(),
    missao: document.querySelector('.missao-hud')!.getBoundingClientRect(),
  }));
  expect(aberto.missao.top).toBeGreaterThanOrEqual(aberto.som.bottom);
  await page.screenshot({ path: `${PASTA}/hud-informacoes-computador.png` });
  await page.locator('[data-hud-info]').click();
  await expect(page.locator('.hud .som')).toBeHidden();
  await expect(missao).toBeVisible();
  await cadaItem(page, false, 'computador');
  // as teclas de sempre continuam, e G abre os gestos (os itens mostram a tecla)
  await page.keyboard.press('KeyG');
  await expect.poll(() => menu(page)).toBe('gestos');
  await expect(page.locator('.roda.aberta button.ativo[data-item="acenar"] kbd')).toHaveText('1');
  await page.keyboard.press('KeyG');
  await expect.poll(() => menu(page)).toBe(null);
  await page.locator('[data-botao-roda]').click();
  await expect(page.locator('.roda.aberta button.ativo[data-item="mapa"] kbd')).toHaveText('Tab');
  await expect(page.locator('.roda.aberta button.ativo[data-item="pausa"] kbd')).toHaveText('Esc');
  await page.keyboard.press('Escape');
  await expect.poll(() => menu(page)).toBe(null);
  await page.keyboard.press('KeyE');
  await expect.poll(() => page.evaluate(() => document.body.dataset.overlay)).toBe('inventario');
  expect(erros).toEqual([]);
});

test('celular: menu de roda pelo toque, segurar abre os gestos', async ({ browser }) => {
  test.setTimeout(300_000);
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await ctx.newPage();
  const erros: string[] = [];
  page.on('pageerror', (e) => erros.push(String(e)));
  await entrar(page);
  await page.evaluate(() => document.body.classList.add('toque-ativo'));
  await page.waitForTimeout(400);
  // celular em pé: a missão fica guardada no botão de informações (como antes)
  await expect(page.locator('[data-missao-atual]')).toBeHidden();
  await cadaItem(page, true, 'celular');
  // nada de selinho de tecla no toque
  await page.locator('[data-botao-roda]').tap();
  await page.waitForTimeout(400);
  expect(await page.locator('.roda.aberta button.ativo kbd:visible').count()).toBe(0);
  expect(erros).toEqual([]);
  await ctx.close();
});

test('celular deitado e tablet: o alto cabe sem cobrir nada', async ({ browser }) => {
  test.setTimeout(240_000);
  for (const [w, h] of [
    [844, 390],
    [768, 1024],
  ]) {
    const ctx = await browser.newContext({
      viewport: { width: w, height: h },
      hasTouch: true,
      isMobile: true,
    });
    const page = await ctx.newPage();
    await entrar(page);
    await page.evaluate(() => document.body.classList.add('toque-ativo'));
    await page.waitForTimeout(500);
    // fora do celular em pé, a missão fica à vista
    await expect(page.locator('[data-missao-atual]')).toBeVisible();
    const r = await page.evaluate(() => {
      const c = (s: string) => document.querySelector(s)?.getBoundingClientRect() ?? null;
      return {
        roda: c('[data-botao-roda]')!,
        mochila: c('[data-botao-mochila]')!,
        mini: c('[data-minimapa]')!,
        botoes: c('.toque .botoes')!,
      };
    });
    const sobre = (a: DOMRect, b: DOMRect) =>
      a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
    expect(sobre(r.mochila, r.mini)).toBe(false);
    expect(sobre(r.mochila, r.botoes)).toBe(false);
    expect(r.mochila.bottom).toBeLessThanOrEqual(h);
    await page.locator('[data-botao-roda]').tap();
    await page.waitForTimeout(450);
    await page.screenshot({ path: `${PASTA}/menu-roda-${w}x${h}.png` });
    await ctx.close();
  }
});
