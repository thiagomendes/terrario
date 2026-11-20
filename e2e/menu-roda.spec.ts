import { expect, test, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import {
  ROLETA_ABERTA,
  abrirRoleta,
  escolherNaRoleta,
  esperarAssentar,
  itensDaRoleta,
  meioDaRoleta,
  rolarAte,
  tocarNaPlaquinha,
  toqueRapido,
} from './roleta-palco';

/**
 * Spec 015 (decisão do dono: opção C do esboço dos menus, em todo aparelho). Em cima à
 * esquerda, informações e o botão do menu; embaixo do minimapa, só a mochila; o minimapa abre
 * o mapa grande. O menu tem Mapa, Diário, Personagem, Lojinha (023), Foto, Gestos, Tela cheia e
 * Pausa; "Gestos" troca pelos gestos com "Voltar"; segurar o botão abre os gestos.
 *
 * Spec 033: o menu é a roleta de baixo (no lugar da roda em volta do boneco).
 */
const PASTA = 'test-results/gestos015';
mkdirSync(PASTA, { recursive: true });

/**
 * Spec 034: na Exploração Lunar, o mundo sem missões, com o diário à vista e o menu de sempre
 * (o "Meu primeiro mundo" era do Bruma e Luz, que saiu; a Vila Neon, agora o padrão, tem as
 * missões e o baú na roda e o diário recolhido). O teste da Vila Neon, no fim, abre a Vila.
 */
const MUNDO = '/?tema=exploracao-lunar';

async function entrar(page: Page) {
  // o teste usa o mouse livre (com o mouse preso na câmera, o clique vai todo para o jogo e a
  // criança usa as teclas); voltar da pausa prende o mouse, então aqui ele nunca prende
  await page.addInitScript(() => {
    HTMLElement.prototype.requestPointerLock = function () {
      return Promise.resolve();
    } as typeof HTMLElement.prototype.requestPointerLock;
  });
  await page.goto(MUNDO);
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
  // spec 030: o baú da criança
  bau: (p) => p.evaluate(() => !!document.querySelector('[data-alma-painel]')),
  // spec 023: a lojinha premium
  lojinha: (p) => p.evaluate(() => !!document.querySelector('[data-alma-loja]')),
  foto: (p) => p.evaluate(() => document.body.classList.contains('modo-foto')),
  pausa: (p) => p.evaluate(() => document.body.dataset.overlay === 'pausa'),
};

async function cadaItem(page: Page, tocar: boolean, nome: string) {
  // spec 034 (T14): o toque rápido que não depende do relógio da máquina (roleta-palco.ts);
  // ele toca com o dedo ou clica com o mouse pelo ponteiro da página, que é o do aparelho
  expect(await page.evaluate(() => matchMedia('(pointer: coarse)').matches)).toBe(tocar);
  const clicar = (sel: string) => toqueRapido(page, sel);
  // o alto: informações, a roda ao lado; a mochila embaixo do minimapa
  for (const sel of ['[data-hud-info]', '[data-botao-roda]', '[data-botao-mochila]'])
    await expect(page.locator(sel)).toBeVisible();
  await expect(page.locator('.barra-atalhos')).toHaveCount(0);
  await expect(page.locator('.toque .topo button')).toHaveCount(0);

  await clicar('[data-botao-roda]');
  await expect.poll(() => menu(page)).toBe('menu');
  await esperarAssentar(page);
  const itens = await itensDaRoleta(page);
  expect(itens.filter((i) => i !== 'tela')).toEqual([
    'mapa',
    'diario',
    'personagem',
    // spec 030: o baú (a carteira) mora na roda (as "Missões" só onde há missões)
    'bau',
    'lojinha',
    'foto',
    'gestos',
    'casa',
    'pausa',
  ]);
  await page.screenshot({ path: `${PASTA}/menu-roda-${nome}.png` });
  await clicar('[data-botao-roda]');
  await expect.poll(() => menu(page)).toBe(null);

  for (const id of Object.keys(ABRE)) {
    await escolherNaRoleta(page, id);
    await expect.poll(() => ABRE[id](page), { message: id }).toBe(true);
    await expect.poll(() => menu(page)).toBe(null);
    await voltarAoJogo(page);
  }

  // Gestos troca a roleta no lugar, com a plaquinha "Voltar" (a carinha de Gestos)
  await escolherNaRoleta(page, 'gestos');
  await expect.poll(() => menu(page)).toBe('gestos');
  await esperarAssentar(page);
  expect(await itensDaRoleta(page)).toHaveLength(8);
  await expect(page.locator(`${ROLETA_ABERTA} .voltar.ativo`)).toContainText('Voltar');
  await page.screenshot({ path: `${PASTA}/menu-gestos-${nome}.png` });
  await tocarNaPlaquinha(page);
  await expect.poll(() => menu(page)).toBe('menu');
  await expect(page.locator(`${ROLETA_ABERTA} .voltar.ativo`)).toContainText('Fechar');
  await escolherNaRoleta(page, 'gestos', 'aplaudir');
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
  await rolarAte(page, 'acenar');
  await expect(page.locator(`${ROLETA_ABERTA} .item[data-item="acenar"] kbd`)).toHaveText('1');
  await page.keyboard.press('KeyG');
  await expect.poll(() => menu(page)).toBe(null);
  await abrirRoleta(page);
  await rolarAte(page, 'mapa');
  await expect(page.locator(`${ROLETA_ABERTA} .item[data-item="mapa"] kbd`)).toHaveText('Tab');
  await rolarAte(page, 'pausa');
  await expect(page.locator(`${ROLETA_ABERTA} .item[data-item="pausa"] kbd`)).toHaveText('Esc');
  await rolarAte(page, 'mapa');
  await page.keyboard.press('Escape');
  await expect.poll(() => menu(page)).toBe(null);
  // pelo teclado: Enter no botão leva o foco para a roleta (o do meio), as setas andam a
  // fileira e fechar devolve o foco ao botão
  await page.locator('[data-botao-roda]').focus();
  await page.keyboard.press('Enter');
  await expect.poll(() => menu(page)).toBe('menu');
  const focado = () =>
    page.evaluate(() => (document.activeElement as HTMLElement | null)?.dataset.item ?? null);
  await esperarAssentar(page);
  await expect.poll(focado).toBe('mapa');
  await page.keyboard.press('ArrowRight');
  await esperarAssentar(page);
  await expect.poll(focado).toBe('diario');
  expect(await meioDaRoleta(page)).toBe('diario');
  await page.keyboard.press('ArrowLeft');
  await esperarAssentar(page);
  await expect.poll(focado).toBe('mapa');
  // a rodinha do mouse também anda um item (e não aproxima a câmera)
  const zoom0 = await page.evaluate(() => window.__brumaluz!.camera!.zoom());
  const caixa = (await page.locator(`${ROLETA_ABERTA} .item.meio`).boundingBox())!;
  await page.mouse.move(caixa.x + caixa.width / 2, caixa.y + caixa.height / 2);
  await page.mouse.wheel(0, 120);
  await esperarAssentar(page);
  await expect.poll(() => meioDaRoleta(page)).toBe('diario');
  expect(await page.evaluate(() => window.__brumaluz!.camera!.zoom())).toBe(zoom0);
  // arrastar devagar com o mouse para a esquerda traz o seguinte
  const b = (await page.locator(`${ROLETA_ABERTA} .bandeja`).boundingBox())!;
  const y = b.y + 8 + 48;
  await page.mouse.move(b.x + b.width / 2 + 40, y);
  await page.mouse.down();
  for (let i = 1; i <= 16; i++) {
    await page.mouse.move(b.x + b.width / 2 + 40 - i * 5, y);
    await page.waitForTimeout(30);
  }
  await page.waitForTimeout(150);
  await page.mouse.up();
  await esperarAssentar(page);
  await expect.poll(() => meioDaRoleta(page)).toBe('personagem');
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowLeft');
  await esperarAssentar(page);
  expect(await meioDaRoleta(page)).toBe('mapa');
  await page.keyboard.press('Escape');
  await expect.poll(() => menu(page)).toBe(null);
  expect(
    await page.evaluate(() => document.activeElement?.hasAttribute('data-botao-roda') ?? false),
  ).toBe(true);
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
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
  await toqueRapido(page, '[data-botao-roda]');
  await esperarAssentar(page);
  expect(await page.locator(`${ROLETA_ABERTA} .item kbd:visible`).count()).toBe(0);
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
    await toqueRapido(page, '[data-botao-roda]');
    await page.waitForTimeout(450);
    await page.screenshot({ path: `${PASTA}/menu-roda-${w}x${h}.png` });
    await ctx.close();
  }
});

test('computador: O abre e fecha a roda do menu, soltando o mouse sem a pausa', async ({
  page,
}) => {
  test.setTimeout(300_000);
  const erros: string[] = [];
  page.on('pageerror', (e) => erros.push(String(e)));
  await page.setViewportSize({ width: 1280, height: 720 });
  // mouse preso de mentirinha (o navegador do teste não prende de verdade): prender e soltar
  // avisam o jogo como o navegador avisa
  await page.addInitScript(() => {
    let preso: Element | null = null;
    Object.defineProperty(document, 'pointerLockElement', { get: () => preso });
    const avisar = () => document.dispatchEvent(new Event('pointerlockchange'));
    HTMLElement.prototype.requestPointerLock = function (this: HTMLElement) {
      preso = this;
      setTimeout(avisar, 0);
      return Promise.resolve();
    } as typeof HTMLElement.prototype.requestPointerLock;
    document.exitPointerLock = () => {
      if (!preso) return;
      preso = null;
      setTimeout(avisar, 0);
    };
  });
  await page.goto(MUNDO);
  await page.waitForFunction(() => window.__brumaluz?.ready === true, undefined, {
    timeout: 180_000,
  });
  const preso = () => page.evaluate(() => document.pointerLockElement?.id ?? null);
  const pausa = () => page.evaluate(() => document.body.dataset.overlay === 'pausa');
  // entrar no jogo prende o mouse
  await page.evaluate(() => {
    document.querySelector('.entrada')?.setAttribute('hidden', '');
    document.getElementById('cena')!.requestPointerLock();
  });
  await expect.poll(preso).toBe('cena');
  await page.waitForTimeout(800);
  // o selinho do botão da roda mostra a tecla
  await expect(page.locator('[data-botao-roda] kbd')).toHaveText('O');

  // O: a roda abre, o mouse solta e a pausa não aparece; O de novo: fecha e prende
  await page.keyboard.press('KeyO');
  await expect.poll(() => menu(page)).toBe('menu');
  await expect.poll(preso).toBe(null);
  await page.waitForTimeout(400);
  expect(await pausa()).toBe(false);
  await page.screenshot({ path: `${PASTA}/menu-roda-tecla-o.png` });
  await page.keyboard.press('KeyO');
  await expect.poll(() => menu(page)).toBe(null);
  await expect.poll(preso).toBe('cena');
  expect(await pausa()).toBe(false);

  // Esc também fecha e prende de novo
  await page.keyboard.press('KeyO');
  await expect.poll(() => menu(page)).toBe('menu');
  await expect.poll(preso).toBe(null);
  await page.keyboard.press('Escape');
  await expect.poll(() => menu(page)).toBe(null);
  await expect.poll(preso).toBe('cena');
  await page.waitForTimeout(400);
  expect(await pausa()).toBe(false);

  // um item que abre uma tela (o mapa): o mouse fica solto, com o mapa por cima
  await page.keyboard.press('KeyO');
  await expect.poll(() => menu(page)).toBe('menu');
  await escolherNaRoleta(page, 'mapa');
  await expect.poll(() => page.evaluate(() => document.body.dataset.overlay)).toBe('mapa');
  await page.waitForTimeout(400);
  expect(await preso()).toBe(null);
  await page.keyboard.press('Tab');
  await expect
    .poll(() => page.evaluate(() => document.body.dataset.overlay ?? null))
    .not.toBe('mapa');

  // digitando num campo, O é só a letra
  await page.evaluate(() => {
    const i = document.createElement('input');
    i.id = 'campo-teste';
    document.body.append(i);
    i.focus();
  });
  await page.keyboard.press('KeyO');
  await page.waitForTimeout(300);
  expect(await menu(page)).toBe(null);
  expect(await page.inputValue('#campo-teste')).toBe('o');
  expect(erros).toEqual([]);
});

test('Vila Neon: a roda de gestos ganha o roqueiro (só neste mundo)', async ({ page }) => {
  await page.addInitScript(() => {
    HTMLElement.prototype.requestPointerLock = function () {
      return Promise.resolve();
    } as typeof HTMLElement.prototype.requestPointerLock;
  });
  await page.goto('/?tema=vila-neon');
  await page.waitForFunction(() => window.__brumaluz?.ready === true, undefined, {
    timeout: 180_000,
  });
  await page.evaluate(() => document.querySelector('.entrada')?.setAttribute('hidden', ''));
  await page.waitForTimeout(1500);
  await voltarAoJogo(page);
  await escolherNaRoleta(page, 'gestos');
  await expect.poll(() => menu(page)).toBe('gestos');
  await esperarAssentar(page);
  const itens = await itensDaRoleta(page);
  console.log(`gestos da Vila Neon: ${itens.length} itens: ${itens.join(', ')}`);
  // os 8 de sempre e o roqueiro
  expect(itens).toContain('roqueiro');
  expect(itens).toHaveLength(9);
  await page.screenshot({ path: `${PASTA}/menu-gestos-vila-neon.png` });
});
