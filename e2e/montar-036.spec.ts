import { expect, test, type Browser, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { abrirMundo, assentar, criarMundo } from './guia-palco';
import {
  abrirRoleta,
  esperarItem,
  escolherNaRoleta,
  itensDaRoleta,
  meioDaRoleta,
  tocarNaPlaquinha,
  tocarNoMeio,
} from './roleta-palco';

/**
 * Spec 036 (T04): montar e descer dos brinquedos de andar.
 *
 * - **Vila Neon, celular em pé:** sem brinquedo comprado a roda não muda; comprar já monta; a roda
 *   abre no "Descer" (2 toques) e, a pé, no brinquedo (2 toques, o brinquedo em menos de 0,5 s, com
 *   o puf); montar e descer não refazem o boneco; o tesouro da mão se guarda e volta; o toque no
 *   carrossel faz descer antes de sentar (nenhum quadro com as duas coisas); sentada, a roda não
 *   tem o brinquedo; recarregar entra a pé.
 * - **Rancho Alegre, duas crianças na nuvem:** a Bia vê a Ana montar e descer sem o boneco dela
 *   ser refeito; a internet da Ana cai e volta, e a Bia continua vendo a Ana montada.
 *
 *   E2E_ENV="-u 1000:1000 -e HOME=/tmp" scripts/e2e-gpu.sh e2e/montar-036.spec.ts --workers 1 --trace off
 */
test.setTimeout(900_000);
test.use({ actionTimeout: 30_000 });
const PASTA = 'capturas-036/t04-montar';

type Perfil = {
  perfil: { moedas: number; premium: string[]; vestidos: Record<string, string> };
  aplicarGanho(g: { moedas: number; xp: number; pontos: Record<string, number> }): unknown;
  comprarPremium(id: string): { ok: boolean };
  vestirPremium(id: string, v: boolean): boolean;
};
const comprar = (p: Page, id: string, moedas = 300) =>
  p.evaluate(
    ([id, moedas]) => {
      const a = (window as unknown as { __almaCrianca: Perfil }).__almaCrianca;
      a.aplicarGanho({ moedas: moedas as number, xp: 0, pontos: {} });
      return a.comprarPremium(id as string).ok;
    },
    [id, moedas] as const,
  );
const montado = (p: Page) => p.evaluate(() => window.__brumaluz!.personagem!.montado!());
const noDesenho = (p: Page) => p.evaluate(() => window.__brumaluz!.montadoNoDesenho!());
const refeito = (p: Page) => p.evaluate(() => window.__brumaluz!.bonecoRefeito ?? 0);
const aparencia = (p: Page) => p.evaluate(() => window.__brumaluz!.personagem!.aparencia());
const fotografar = async (p: Page, nome: string) => {
  await p.waitForTimeout(700);
  await p.screenshot({ path: `${PASTA}/${nome}.png` });
};
/** Anota quando o dedo encostou (o começo do toque) e quando ela montou ou desceu. */
const vigiarTempo = (p: Page) =>
  p.evaluate(() => {
    const w = window as unknown as { __tToque: number; __tMontou: number };
    w.__tToque = w.__tMontou = 0;
    const toque = () => (w.__tToque = performance.now());
    document.addEventListener('pointerdown', toque, { capture: true, once: true });
    window.addEventListener('brumaluz:montar', () => (w.__tMontou = performance.now()), { once: true });
  });
const tempoDoToque = (p: Page) =>
  p.evaluate(() => {
    const w = window as unknown as { __tToque: number; __tMontou: number };
    return w.__tMontou - w.__tToque;
  });

test('Vila Neon (celular em pé): montar e descer pela roda; o carrossel faz descer antes de sentar', async ({
  browser,
}) => {
  mkdirSync(PASTA, { recursive: true });
  const page = await abrirMundo(browser, { id: 'montar-036', tema: 'vila-neon', tamanho: 'empe' });
  await assentar(page);
  const pq = await page.evaluate(() => window.__brumaluz!.vila!()!.pontos.parque.carrossel);
  const Y = await page.evaluate(() => window.__brumaluz!.vila!()!.h + 1);
  // um lugar aberto da praça, perto do carrossel, olhando para ele
  const irPerto = () =>
    page.evaluate(
      ([x, z, beira]) => {
        const e = window.__brumaluz!;
        e.voar?.(false);
        e.teleportar!(x, z - beira - 4, e.vila!()!.h + 1.2);
        e.apontar!(0, -0.05);
      },
      [pq.x, pq.z, pq.beira] as const,
    );
  await irPerto();
  await page.waitForTimeout(1500);

  // sem brinquedo comprado: a roda não muda
  await abrirRoleta(page);
  const semNada = await itensDaRoleta(page);
  expect(semNada.some((i) => i.startsWith('andar-') || i === 'descer-brinquedo')).toBe(false);
  await tocarNaPlaquinha(page);

  // comprar já monta (com o puf), e o boneco aparece montado
  const trocas0 = await page.evaluate(() => window.__brumaluz!.montarTrocas ?? 0);
  expect(await comprar(page, 'bicicletinha')).toBe(true);
  await page.waitForFunction(() => window.__brumaluz!.personagem!.montado!() === 'bicicletinha');
  expect(await noDesenho(page)).toBe(true);
  expect(await page.evaluate(() => window.__brumaluz!.montarTrocas)).toBe(trocas0 + 1);
  await fotografar(page, '01-comprou-ja-montada');

  // montada, a roda abre no "Descer": 2 toques (abrir e tocar no meio), sem refazer o boneco
  const r0 = await refeito(page);
  await abrirRoleta(page);
  expect(await meioDaRoleta(page)).toBe('descer-brinquedo');
  expect(await itensDaRoleta(page)).not.toContain('andar-bicicletinha');
  await fotografar(page, '02-roda-descer');
  await vigiarTempo(page);
  await tocarNoMeio(page);
  await page.waitForFunction(() => window.__brumaluz!.personagem!.montado!() === null);
  expect(await noDesenho(page)).toBe(false);
  expect(await tempoDoToque(page)).toBeLessThan(500);
  expect(await refeito(page)).toBe(r0);
  expect((await aparencia(page)).premium?.andar).toBe('bicicletinha');
  await fotografar(page, '03-desceu');

  // a pé, a roda abre no brinquedo: 2 toques, o brinquedo em menos de 0,5 s, sem refazer
  await abrirRoleta(page);
  expect(await meioDaRoleta(page)).toBe('andar-bicicletinha');
  expect(await itensDaRoleta(page)).not.toContain('descer-brinquedo');
  await fotografar(page, '04-roda-montar');
  await vigiarTempo(page);
  await tocarNoMeio(page);
  await page.waitForFunction(() => window.__brumaluz!.montadoNoDesenho!());
  const dt = await tempoDoToque(page);
  console.log(`montar: ${dt.toFixed(0)} ms do toque até o brinquedo aparecer`);
  expect(dt).toBeLessThan(500);
  expect(await refeito(page)).toBe(r0);
  await fotografar(page, '05-montada-pela-roda');

  // montada, ela anda e pula como a pé (a mesma física: o brinquedo é só enfeite)
  const a0 = await page.evaluate(() => window.__brumaluz!.jogadorPes!());
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(1200);
  await page.keyboard.up('KeyW');
  const a1 = await page.evaluate(() => window.__brumaluz!.jogadorPes!());
  expect(Math.hypot(a1[0] - a0[0], a1[2] - a0[2])).toBeGreaterThan(1);
  expect(await montado(page)).toBe('bicicletinha');

  // de noite
  await page.evaluate(() => (window.__brumaluz!.hora = 0.96));
  await fotografar(page, '06-montada-noite');
  await page.evaluate(() => (window.__brumaluz!.hora = 0.42));

  // o tesouro da mão: montada, ele se guarda; ao descer, volta
  expect(await comprar(page, 'guarda-chuva-gotinhas')).toBe(true);
  await page.waitForTimeout(400);
  expect(await montado(page)).toBe('bicicletinha');
  expect((await aparencia(page)).premium?.mao).toBeUndefined();
  await page.evaluate(() => window.__brumaluz!.personagem!.descer!());
  await page.waitForFunction(() => window.__brumaluz!.personagem!.aparencia().premium?.mao === 'guarda-chuva-gotinhas');
  await fotografar(page, '07-desceu-guarda-chuva-volta');
  await page.evaluate(() => window.__brumaluz!.personagem!.montar!());
  expect(await montado(page)).toBe('bicicletinha');
  expect((await aparencia(page)).premium?.mao).toBeUndefined();

  // o toque no carrossel: desce antes de sentar (em nenhum quadro ela está sentada e montada)
  await irPerto();
  await assentar(page, 9);
  expect(await montado(page)).toBe('bicicletinha');
  await page.evaluate(() => {
    const w = window as unknown as { __juntos: boolean; __vigia: boolean };
    w.__juntos = false;
    w.__vigia = true;
    const e = window.__brumaluz!;
    const f = () => {
      if (e.vilaParque!.sentado() && e.personagem!.montado!()) w.__juntos = true;
      if (w.__vigia) requestAnimationFrame(f);
    };
    requestAnimationFrame(f);
  });
  const t = await page.evaluate(() => window.__vila!.parque().sentar[1].t);
  expect(t, 'o carrossel na tela').not.toBeNull();
  await page.touchscreen.tap(t!.x, t!.y);
  await page.waitForFunction(() => window.__brumaluz!.vilaParque!.sentado()?.b === 'carrossel');
  expect(await montado(page)).toBeNull();
  expect(await page.evaluate(() => (window as unknown as { __juntos: boolean }).__juntos)).toBe(false);
  await page.waitForTimeout(900);
  await fotografar(page, '08-carrossel-desceu-antes');
  // sentada, a roda não tem o brinquedo (só o "Sair do brinquedo")
  await abrirRoleta(page);
  const sentada = await itensDaRoleta(page);
  expect(sentada).toContain('sair-brinquedo');
  expect(sentada.some((i) => i.startsWith('andar-') || i === 'descer-brinquedo')).toBe(false);
  await escolherNaRoleta(page, 'sair-brinquedo');
  await page.waitForFunction(() => !window.__brumaluz!.vilaParque!.sentado());
  await page.evaluate(() => ((window as unknown as { __vigia: boolean }).__vigia = false));
  await page.waitForTimeout(1500);
  // fora do carrossel, o brinquedo volta à roda (ela não monta sozinha)
  expect(await montado(page)).toBeNull();
  await abrirRoleta(page);
  await esperarItem(page, 'andar-bicicletinha');
  await tocarNaPlaquinha(page);

  // voando ela desce sozinha (e, voando, a roda não tem o brinquedo)
  expect(await page.evaluate(() => window.__brumaluz!.personagem!.montar!())).toBe(true);
  expect(await montado(page)).toBe('bicicletinha');
  await page.evaluate(() => window.__brumaluz!.voar!(true));
  await page.waitForFunction(() => window.__brumaluz!.personagem!.montado!() === null);
  expect(await page.evaluate(() => window.__brumaluz!.personagem!.motivoSemMontar!())).toBe('voando');
  await page.evaluate(() => window.__brumaluz!.voar!(false));
  void Y;

  // recarregar: entra a pé, com a bicicletinha vestida
  await page.reload();
  await page.waitForFunction(() => window.__brumaluz?.ready === true, undefined, { timeout: 240_000 });
  await page.waitForTimeout(1500);
  expect(await montado(page)).toBeNull();
  expect((await aparencia(page)).premium?.andar).toBe('bicicletinha');
  await page.context().close();
});

// ------------------------------------------------------------------ duas crianças na nuvem
/** A página pode perder a internet de verdade (o mesmo roteiro da `entrada-nuvem.spec.ts`). */
function redeDaPagina() {
  const Original = window.WebSocket;
  let semRede = false;
  const abertas: WebSocket[] = [];
  class ComRede extends Original {
    constructor(url: string | URL, protocolos?: string | string[]) {
      super(semRede ? 'ws://127.0.0.1:9/' : url, protocolos);
      abertas.push(this);
    }
  }
  window.WebSocket = ComRede;
  (window as unknown as { __e2eRede: { cortar(): void; voltar(): void } }).__e2eRede = {
    cortar() {
      semRede = true;
      for (const s of abertas.splice(0)) if (s.readyState <= Original.OPEN) s.close();
    },
    voltar() {
      semRede = false;
    },
  };
}
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
  await ctx.addInitScript(redeDaPagina);
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
/** O que a Bia vê da Ana: montada (no perfil e no desenho) e quantas vezes o boneco foi refeito. */
const anaNaBia = (bia: Page) =>
  bia.evaluate(() => {
    const a = (window.__brumaluz!.outrosJogadores?.() ?? []).find((q) => q.apelido === 'Ana') as
      | { montado: boolean; montadoNoDesenho: boolean; refeitos: number }
      | undefined;
    return a ? { montado: a.montado, desenho: a.montadoNoDesenho, refeitos: a.refeitos } : null;
  });

test('Rancho Alegre na nuvem: a amiga vê montar e descer sem refazer o boneco, e depois da queda', async ({
  browser,
}) => {
  mkdirSync(PASTA, { recursive: true });
  const ana = await jogador(browser, 'ana-montar', 'Ana');
  await criarMundo(ana, 'montar-amigos', 'rancho-alegre');
  await ana.goto('/?mundo=montar-amigos');
  await pronto(ana);
  await entrarNoJogo(ana);
  await ana.evaluate(() => window.dispatchEvent(new CustomEvent('brumaluz:amigos')));
  await ana.locator('[data-abrir-para-amigos]').click();
  await ana.waitForURL(/sala=/, { timeout: 60_000 });
  await pronto(ana);
  await entrarNoJogo(ana);
  const codigo = await ana.locator('[data-codigo-mundo]').getAttribute('data-codigo-mundo', { timeout: 30_000 });
  await ana.keyboard.press('Escape');
  const bia = await jogador(browser, 'bia-montar', 'Bia');
  await bia.goto(`/?sala=${codigo}`);
  await bia.locator('[data-entrar-mundo]').click({ timeout: 60_000 });
  await pronto(bia);
  await entrarNoJogo(bia);
  await bia.waitForFunction(
    () => (window.__brumaluz!.outrosJogadores?.() ?? []).some((q) => q.apelido === 'Ana'),
    null,
    { timeout: 90_000 },
  );
  // a Ana na frente da Bia, um pouco de lado (o boneco da Bia não a tapa), de lado para a câmera
  const olharAna = async () => {
    const [x, y, z] = await bia.evaluate(() => window.__brumaluz!.jogadorPes!());
    await ana.evaluate(
      ([x, y, z]) => {
        const e = window.__brumaluz!;
        e.voar?.(false);
        e.teleportar!(x + 4, z + 5, y + 0.3);
        e.apontar!(-Math.PI / 2, 0.1);
      },
      [x, y, z] as const,
    );
    // (a câmera da Bia olha entre ela e a Ana: o boneco da Bia fica no meio, a Ana à direita)
    await bia.evaluate(() => {
      window.__brumaluz!.voar?.(false);
      window.__brumaluz!.apontar!(Math.atan2(1.2, 5), 0.25);
    });
    await bia.waitForTimeout(2000);
  };
  await ana.evaluate(() => {
    window.__brumaluz!.voar?.(false);
    window.__brumaluz!.apontar!(Math.PI, 0.1);
  });
  await olharAna();

  // a Ana compra o patinete: já monta, e a Bia vê
  expect(await comprar(ana, 'patinete-luz')).toBe(true);
  await ana.waitForFunction(() => window.__brumaluz!.personagem!.montado!() === 'patinete-luz');
  await bia.waitForFunction(
    () => (window.__brumaluz!.outrosJogadores?.() ?? []).some((q) => q.apelido === 'Ana' && (q as { montado?: boolean }).montado),
    null,
    { timeout: 20_000 },
  );
  const visto0 = (await anaNaBia(bia))!;
  expect(visto0.desenho).toBe(true);
  await olharAna();
  await bia.screenshot({ path: `${PASTA}/10-bia-ve-ana-montada.png` });
  await ana.screenshot({ path: `${PASTA}/11-ana-montada.png` });

  // a Ana desce e monta pela roda (2 toques cada): a Bia vê, sem o boneco ser refeito
  for (const [item, quer] of [
    ['descer-brinquedo', false],
    ['andar-patinete-luz', true],
  ] as const) {
    await ana.waitForTimeout(700);
    await abrirRoleta(ana);
    expect(await meioDaRoleta(ana)).toBe(item);
    await tocarNoMeio(ana);
    await bia.waitForFunction(
      (quer) =>
        (window.__brumaluz!.outrosJogadores?.() ?? []).some(
          (q) => q.apelido === 'Ana' && !!(q as { montado?: boolean }).montado === quer,
        ),
      quer,
      { timeout: 20_000 },
    );
    const v = (await anaNaBia(bia))!;
    expect(v.desenho).toBe(quer);
    expect(v.refeitos, 'o boneco da Ana não foi refeito na tela da Bia').toBe(visto0.refeitos);
    if (!quer) await bia.screenshot({ path: `${PASTA}/12-bia-ve-ana-a-pe.png` });
  }

  // a internet da Ana cai e volta: a Bia continua vendo a Ana montada (a aparência de agora vai
  // de novo depois do bem-vindo)
  await ana.evaluate(() => (window as unknown as { __e2eRede: { cortar(): void } }).__e2eRede.cortar());
  await ana.waitForTimeout(4000);
  await ana.evaluate(() => (window as unknown as { __e2eRede: { voltar(): void } }).__e2eRede.voltar());
  await ana.waitForFunction(() => (window.__brumaluz?.outrosJogadores?.() ?? []).some((q) => q.apelido === 'Bia'), null, {
    timeout: 90_000,
  });
  await ana.waitForTimeout(3000);
  expect(await montado(ana)).toBe('patinete-luz');
  await bia.waitForFunction(
    () => (window.__brumaluz!.outrosJogadores?.() ?? []).some((q) => q.apelido === 'Ana' && (q as { montado?: boolean }).montado),
    null,
    { timeout: 30_000 },
  );
  expect((await anaNaBia(bia))!.desenho).toBe(true);
  await olharAna();
  await bia.screenshot({ path: `${PASTA}/13-bia-ve-ana-montada-depois-da-queda.png` });
  await ana.context().close();
  await bia.context().close();
});
