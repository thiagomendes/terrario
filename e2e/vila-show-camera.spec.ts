import { expect, test, type CDPSession, type Page } from '@playwright/test';
import { abrirMundo, assentar, escolherNaRoda, tocar, type Tamanho } from './guia-palco';
import { CHAMADO, INTRO, ROTEIRO, faseDoShow } from '../src/jogo/show';

/**
 * Spec 026 (o dono, 16 nov 2026: "depois de acender as 3 caixas a câmera parou de funcionar; só
 * andava, não dava para olhar em volta, e voltou quando a missão acabou"). A causa: no show, o
 * toque de quem estava no palco ou na plateia virava acorde e o `pointerdown` era engolido, então
 * o arrastar nunca chegava à câmera (e, no computador, o clique que prende o mouse também não).
 *
 * Agora (16 nov 2026) o show é do bairro e só para ver: a criança fica na grade de noite, sem
 * tocar em nada, o show começa sozinho; o arrastar gira a câmera em cada momento do show (a
 * abertura, a entrada da banda, as músicas, a pausa, o chamado e o fim) e o toque curto não toca
 * acorde nem dispara o fim (o acorde final vem sozinho).
 */
declare const process: { env: Record<string, string | undefined> };
const PASTA = process.env.VILA_PASTA ?? 'test-results/vila-show-camera';

const yaw = (page: Page) => page.evaluate(() => window.__brumaluz!.rotacao![1]);
/** A fase do show agora (pelo estado e o relógio do núcleo que a tela recebe). */
const fase = (page: Page) =>
  page
    .evaluate(() => {
      const e = window.__brumaluz!;
      return { show: e.vilaEstado!()?.show ?? null, t: e.vilaTempo!() };
    })
    .then((r) => (r.show ? faseDoShow(r.show, r.t) : null));

async function escolherF4(page: Page): Promise<void> {
  await page
    .waitForFunction(() => !document.body.dataset.overlay, undefined, { timeout: 15_000 })
    .catch(() => undefined);
  await escolherNaRoda(page, 'missoes');
  await page.waitForSelector('[data-alma-quadro]', { timeout: 20_000 });
  await page.waitForTimeout(800);
  await tocar(page, '[data-alma-jogar="f4"]');
  await page.waitForTimeout(1500);
}

/** Fecha a festa da missão (o "Oba!"), como a criança. */
async function fecharFesta(page: Page): Promise<void> {
  for (let k = 0; k < 30; k++) {
    const ok = page.locator('[data-alma-festa] [data-alma-oba]');
    if (await ok.count()) {
      await tocar(page, '[data-alma-festa] [data-alma-oba]');
      await page.waitForTimeout(700);
    } else if (!(await page.locator('[data-alma-festa]').count())) return;
    else await page.waitForTimeout(400);
  }
}

/** Gira a câmera: no celular, um dedo de verdade arrastando; no computador, o mouse preso. */
async function arrastar(page: Page, tamanho: Tamanho, cdp: CDPSession | null): Promise<number> {
  const antes = await yaw(page);
  if (cdp) {
    const v = page.viewportSize()!;
    const x0 = v.width * 0.62;
    const y0 = v.height * 0.42;
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x: x0, y: y0, id: 7 }],
    });
    for (let i = 1; i <= 12; i++) {
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ x: x0 + i * 14, y: y0, id: 7 }],
      });
      await page.waitForTimeout(16);
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  } else {
    // o mouse preso no jogo (o navegador de teste não prende de verdade): o movimento gira
    await page.evaluate(() => {
      for (let i = 0; i < 10; i++)
        document.dispatchEvent(new MouseEvent('mousemove', { movementX: 14, movementY: 0 }));
    });
  }
  void tamanho;
  await expect.poll(() => yaw(page), { timeout: 3000 }).not.toBeCloseTo(antes, 3);
  return Math.abs((await yaw(page)) - antes);
}

for (const tamanho of ['deitado', 'pc'] as const)
  test(`Vila Neon (${tamanho}): no show, a câmera gira o tempo todo e o toque não muda nada`, async ({
    browser,
  }) => {
    test.setTimeout(600_000);
    const page = await abrirMundo(browser, {
      id: `vila-camera-${tamanho}`,
      tema: 'vila-neon',
      tamanho,
      extras: { alma: { local: { feitas: ['f1'] } } },
    });
    await assentar(page);
    await page.waitForFunction(() => !!window.__guia && !!window.__vila, undefined, {
      timeout: 30_000,
    });
    const cdp = tamanho === 'pc' ? null : await page.context().newCDPSession(page);
    // a f4 no selinho (qualquer missão: o show é do bairro), de noite, a criança na grade
    await escolherF4(page);
    await page.evaluate(() => {
      const e = window.__brumaluz!;
      e.hora = 0.9;
      const g = e.vila!()!.pontos.plateia;
      e.teleportar!((g.x0 + g.x1) / 2 + 0.5, g.z1 - 1.5);
      e.apontar!(0, 0.15);
    });
    // ninguém toca em nada: o show começa sozinho
    await page.waitForFunction(() => !!window.__brumaluz!.vilaEstado!()?.show, undefined, {
      timeout: 90_000,
    });
    // no computador, a câmera gira com o mouse preso: o navegador de teste não prende, então
    // o teste finge que prendeu (e conta quem pediu para prender)
    if (tamanho === 'pc')
      await page.evaluate(() => {
        const cena = document.querySelector('canvas')!;
        const w = window as unknown as { __prender: number };
        w.__prender = 0;
        HTMLCanvasElement.prototype.requestPointerLock = function () {
          w.__prender++;
          return Promise.resolve();
        } as typeof HTMLCanvasElement.prototype.requestPointerLock;
        Object.defineProperty(document, 'pointerLockElement', {
          get: () => cena,
          configurable: true,
        });
      });
    // a câmera gira já, na abertura do show
    expect(await fase(page)).toBe('intro');
    await arrastar(page, tamanho, cdp);
    await page.screenshot({ path: `${PASTA}/${tamanho}-abertura.png` });
    // e em cada momento do show (o atalho dos testes pula o relógio do show)
    const R = {
      entrada: INTRO + 6,
      musica1: ROTEIRO[0].inicio + 20,
      pausa: ROTEIRO[0].fim + 3,
      musica2: ROTEIRO[1].inicio + 30,
      chamado: CHAMADO + 0.5,
    };
    const eventos = () =>
      page.evaluate(
        () => (window.__brumaluz!.eventosVila ?? []).filter((e) => e.e !== 'vilaArco').length,
      );
    for (const [nome, s] of Object.entries(R)) {
      await page.evaluate((s) => window.__brumaluz!.pularShow!(s), s);
      await page.waitForTimeout(1500);
      const f = await fase(page);
      const giro = await arrastar(page, tamanho, cdp);
      console.log(`câmera: ${tamanho} ${nome} (${f}) girou ${giro.toFixed(2)} rad`);
      if (nome.startsWith('musica') || nome === 'chamado') {
        // o toque curto não toca nada nem dispara o fim (o show é só para ver)
        const e0 = await eventos();
        const v = page.viewportSize()!;
        if (cdp) await page.touchscreen.tap(v.width * 0.6, v.height * 0.4);
        else await page.mouse.click(v.width * 0.6, v.height * 0.4);
        await page.waitForTimeout(1500);
        expect(await eventos()).toBe(e0);
        expect(await fase(page)).not.toBe('final');
        await page.screenshot({ path: `${PASTA}/${tamanho}-${nome}.png` });
      }
    }
    // o acorde final vem sozinho no fim do chamado; e a câmera ainda gira
    await expect.poll(() => fase(page), { timeout: 30_000 }).toBe('final');
    const fim = await page.evaluate(
      () =>
        (window.__brumaluz!.eventosVila ?? []).find((e) => e.e === 'vilaFinal') as
          | { quem: string }
          | undefined,
    );
    expect(fim?.quem).toBe('auto');
    await page.waitForTimeout(4000);
    await arrastar(page, tamanho, cdp);
    if (tamanho === 'pc') {
      // o clique no jogo durante o show ainda chega a quem prende o mouse
      const w = await page.evaluate(() => (window as unknown as { __prender: number }).__prender);
      console.log(`câmera: pc pedidos para prender o mouse ${w}`);
      expect(w).toBeGreaterThan(0);
    }
    await page.context().close();
  });
