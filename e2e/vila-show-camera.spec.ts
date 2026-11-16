import { expect, test, type CDPSession, type Page } from '@playwright/test';
import { abrirMundo, assentar, escolherNaRoda, tocar, type Tamanho } from './guia-palco';
import { CHAMADO, INTRO, ROTEIRO, faseDoShow } from '../src/jogo/show';

/**
 * Spec 026 (o dono, 16 nov 2026: "depois de acender as 3 caixas a câmera parou de funcionar; só
 * andava, não dava para olhar em volta, e voltou quando a missão acabou"). A causa: no show, o
 * toque de quem estava no palco ou na plateia virava acorde e o `pointerdown` era engolido, então
 * o arrastar nunca chegava à câmera (e, no computador, o clique que prende o mouse também não).
 *
 * Aqui, como a criança: a f3 no selinho, de noite no palco, acende as três caixas com o dedo (ou
 * o mouse); a missão fecha na hora (a festa); fechada a festa, o arrastar gira a câmera já, e
 * continua girando a cada momento do show (a abertura, a entrada da banda, as músicas, a pausa,
 * o chamado e o fim). O toque curto nas músicas continua tocando o acorde, sem colocar bloco.
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

async function escolherF3(page: Page): Promise<void> {
  await page
    .waitForFunction(() => !document.body.dataset.overlay, undefined, { timeout: 15_000 })
    .catch(() => undefined);
  await escolherNaRoda(page, 'missoes');
  await page.waitForSelector('[data-alma-quadro]', { timeout: 20_000 });
  await page.waitForTimeout(800);
  await tocar(page, '[data-alma-jogar="f3"]');
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
  test(`Vila Neon (${tamanho}): depois das três caixas a câmera gira já e no show inteiro`, async ({
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
    await escolherF3(page);
    await page.evaluate(() => {
      window.__brumaluz!.hora = 0.9;
    });
    const plano = await page.evaluate(() => {
      const p = window.__brumaluz!.vila!()!;
      return { palco: p.pontos.palco, caixas: p.pontos.caixas };
    });
    if (process.env.CAMERA_DEPURAR) {
      page.on('console', (m) => console.log(`pagina: ${m.text()}`));
      await page.evaluate(() =>
        window.addEventListener(
          'pointerdown',
          (e) =>
            console.log(
              `pd ${e.clientX},${e.clientY} lock=${!!document.pointerLockElement} overlay=${document.body.dataset.overlay ?? ''} alvo=${(e.target as HTMLElement).className} caixas=${JSON.stringify(window.__vila!.caixas())}`,
            ),
          { capture: true },
        ),
      );
    }
    // as três caixas: a criança fica na frente de cada uma, de frente para ela, e toca
    for (let i = 0; i < 3; i++) {
      const [x, , z] = plano.caixas[i];
      await page.evaluate(
        ([x, z]) => {
          const e = window.__brumaluz!;
          e.teleportar!(x + 0.5, z - 1.35);
          e.apontar!(0, 0.25);
        },
        [x, z],
      );
      await page.waitForTimeout(1200);
      const alvo = await page
        .waitForFunction((i) => window.__vila!.caixas().find((c) => c.i === i)?.t ?? null, i, {
          timeout: 10_000,
        })
        .then((h) => h.jsonValue() as Promise<{ x: number; y: number }>);
      if (cdp) await page.touchscreen.tap(alvo.x, alvo.y);
      else {
        // no computador o mouse fica preso no jogo: a criança mira a caixa com o centro da tela
        const v = page.viewportSize()!;
        for (let k = 0; k < 10; k++) {
          const t = await page.evaluate(
            (i) => window.__vila!.caixas().find((c) => c.i === i)?.t ?? null,
            i,
          );
          if (!t) break;
          const dx = t.x - v.width / 2;
          const dy = t.y - v.height / 2;
          if (Math.hypot(dx, dy) < 12) break;
          await page.evaluate(
            ([dx, dy]) => {
              const e = window.__brumaluz!;
              const [p, y] = e.rotacao!;
              e.apontar!(y + dx * 0.0011, p + dy * 0.0011);
            },
            [dx, dy],
          );
          await page.waitForTimeout(250);
        }
        await page.mouse.click(v.width / 2, v.height / 2);
      }
      await page.waitForTimeout(900);
      const cx = await page.evaluate(() => window.__brumaluz!.vilaEstado!()?.cx);
      console.log(
        `câmera: ${tamanho} caixa ${i} em ${Math.round(alvo.x)},${Math.round(alvo.y)}: ${JSON.stringify(cx)}`,
      );
      if (i === 0) await page.screenshot({ path: `${PASTA}/${tamanho}-caixa.png` });
    }
    await page.waitForFunction(() => !!window.__brumaluz!.vilaEstado!()?.show, undefined, {
      timeout: 10_000,
    });
    // a missão fecha na hora: a festa aparece (com o show já começando atrás)
    await page.waitForSelector('[data-alma-festa]', { timeout: 15_000 });
    await page.screenshot({ path: `${PASTA}/${tamanho}-festa.png` });
    await fecharFesta(page);
    // a festa some e o jogo volta (os controles do toque reaparecem com o painel fechado)
    await page.waitForFunction(() => !document.body.dataset.overlay, undefined, {
      timeout: 10_000,
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
    const acordes = () =>
      page.evaluate(
        () => (window.__brumaluz!.eventosVila ?? []).filter((e) => e.e === 'vilaAcorde').length,
      );
    for (const [nome, s] of Object.entries(R)) {
      await page.evaluate((s) => window.__brumaluz!.pularShow!(s), s);
      await page.waitForTimeout(1500);
      const f = await fase(page);
      const giro = await arrastar(page, tamanho, cdp);
      console.log(`câmera: ${tamanho} ${nome} (${f}) girou ${giro.toFixed(2)} rad`);
      if (nome.startsWith('musica')) {
        // o toque curto toca o acorde (e não coloca bloco no palco)
        const a0 = await acordes();
        const v = page.viewportSize()!;
        if (cdp) await page.touchscreen.tap(v.width * 0.6, v.height * 0.4);
        else await page.mouse.click(v.width * 0.6, v.height * 0.4);
        await expect.poll(acordes, { timeout: 3000 }).toBeGreaterThan(a0);
        await page.screenshot({ path: `${PASTA}/${tamanho}-${nome}.png` });
      }
    }
    // o chamado: o toque dispara o acorde final; o fim do show, e a câmera ainda gira
    const v = page.viewportSize()!;
    if (cdp) await page.touchscreen.tap(v.width * 0.6, v.height * 0.4);
    else await page.mouse.click(v.width * 0.6, v.height * 0.4);
    await expect.poll(() => fase(page), { timeout: 8000 }).toBe('final');
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
