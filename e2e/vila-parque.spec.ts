import { expect, test, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { abrirMundo, assentar } from './guia-palco';
import { abrirRoleta, escolherNaRoleta, esperarItem } from './roleta-palco';

/**
 * Spec 026 (parte 2, o Parque de diversões): "sentar e ser levado" e os brinquedos de tocar, no
 * celular deitado e em pé, com o dedo de verdade.
 *
 * - **roda-gigante:** o toque senta na cadeirinha de baixo; a criança sobe com ela, a câmera
 *   continua dela (arrastar gira), e ela desce sozinha no chão depois da volta;
 * - **carrossel:** o toque senta; o cavalinho sobe e desce girando; o toque toca o realejo;
 *   "Sair do brinquedo" aparece na roda só sentada, e desce do lado de fora;
 * - **bate-bate:** o toque no carrinho livre senta; o carrinho espera parado; "Sair do brinquedo"
 *   desce do lado de fora (guiar e bater de verdade: `vila-bate.spec.ts`);
 * - **os de tocar:** os balões, a argola, a pescaria, a pipoca e o algodão-doce respondem.
 */
declare const process: { env: Record<string, string | undefined> };
test.setTimeout(900_000);
test.use({ actionTimeout: 30_000 });
const PASTA = process.env.PARQUE_PASTA ?? 'test-results/vila-parque';

type P3 = [number, number, number];

/** Leva a criança para perto de um ponto do parque, olhando para ele. */
async function irPara(page: Page, alvo: P3, de: [number, number], pitch = -0.05): Promise<void> {
  await page.evaluate(
    ([alvo, de, pitch]) => {
      const e = window.__brumaluz!;
      const p = e.vila!()!;
      e.voar?.(false);
      e.teleportar!(de[0], de[1], p.h + 1.2);
      e.apontar!(Math.atan2(alvo[0] - de[0], alvo[2] - de[1]), pitch);
    },
    [alvo, de, pitch] as const,
  );
  await page.waitForTimeout(1500);
}

const parque = (page: Page) =>
  page.evaluate(() => {
    const q = window.__brumaluz!.vila!()!.pontos.parque;
    return { roda: q.roda, carrossel: q.carrossel, bate: q.bate };
  });
const sentado = (page: Page) => page.evaluate(() => window.__brumaluz!.vilaParque!.sentado());
const pes = (page: Page) => page.evaluate(() => window.__brumaluz!.jogadorPes!());
const chao = (page: Page) => page.evaluate(() => window.__brumaluz!.vila!()!.h + 1);
const alvoDeSentar = async (page: Page, b: number) => {
  const t = await page.evaluate((b) => window.__vila!.parque().sentar[b].t, b);
  expect(t, `o brinquedo ${b} na tela`).not.toBeNull();
  return t!;
};

/** Um dedo que desce em (x, y), anda (dx, dy) e sobe depois de `ms`. */
async function dedo(page: Page, x: number, y: number, dx: number, dy: number, ms: number) {
  // (o dedo de verdade do navegador: é ele que o controle de toque do jogo ouve)
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x, y, id: 7 }],
  });
  const passos = 10;
  for (let i = 1; i <= passos; i++) {
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: x + (dx * i) / passos, y: y + (dy * i) / passos, id: 7 }],
    });
    await page.waitForTimeout(ms / passos);
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await cdp.detach();
  await page.waitForTimeout(400);
}

for (const tamanho of ['deitado', 'empe'] as const) {
  test(`Vila Neon, ${tamanho}: o parque (roda-gigante, carrossel, bate-bate e os brinquedos de tocar)`, async ({
    browser,
  }) => {
    mkdirSync(PASTA, { recursive: true });
    const page = await abrirMundo(browser, {
      id: `vila-parque-${tamanho}`,
      tema: 'vila-neon',
      tamanho,
    });
    await assentar(page);
    const pq = await parque(page);
    const Y = await chao(page);
    const meio = { x: tamanho === 'deitado' ? 422 : 195, y: tamanho === 'deitado' ? 150 : 300 };

    // ---------------------------------------------------------------- o carrossel
    await irPara(
      page,
      [pq.carrossel.x, Y, pq.carrossel.z],
      [pq.carrossel.x, pq.carrossel.z - pq.carrossel.beira - 4],
    );
    await assentar(page, 9);
    // arrastar o dedo por cima do carrossel (virar a câmera) não senta
    let t = await alvoDeSentar(page, 1);
    await dedo(page, t.x, t.y, 80, 6, 260);
    expect(await sentado(page)).toBeNull();
    await irPara(
      page,
      [pq.carrossel.x, Y, pq.carrossel.z],
      [pq.carrossel.x, pq.carrossel.z - pq.carrossel.beira - 4],
    );
    t = await alvoDeSentar(page, 1);
    await page.touchscreen.tap(t.x, t.y);
    await page.waitForFunction(() => window.__brumaluz!.vilaParque!.sentado()?.b === 'carrossel');
    await page.waitForTimeout(900);
    // vai com o cavalinho: gira em volta do meio, na roda dos cavalinhos, acima do deque
    const a = await pes(page);
    await page.waitForTimeout(1500);
    const b = await pes(page);
    expect(Math.hypot(a[0] - pq.carrossel.x, a[2] - pq.carrossel.z)).toBeCloseTo(
      pq.carrossel.raio,
      1,
    );
    expect(Math.hypot(a[0] - b[0], a[2] - b[2])).toBeGreaterThan(1);
    expect(b[1]).toBeGreaterThanOrEqual(pq.carrossel.y - 0.01);
    await page.screenshot({ path: `${PASTA}/${tamanho}-carrossel-sentada.png` });
    // a câmera continua da criança: arrastar gira
    const yaw0 = await page.evaluate(() => window.__brumaluz!.rotacao![1]);
    await dedo(page, meio.x, meio.y, 120, 0, 300);
    const yaw1 = await page.evaluate(() => window.__brumaluz!.rotacao![1]);
    expect(Math.abs(yaw1 - yaw0)).toBeGreaterThan(0.1);
    expect((await sentado(page))?.b).toBe('carrossel');
    // o toque (sentada) toca o realejo e acende as lâmpadas
    await page.touchscreen.tap(meio.x, meio.y);
    await page.waitForFunction(() => window.__brumaluz!.parqueVila!()!.correndo);
    // "Sair do brinquedo" na roda (só sentada) desce do lado de fora
    await abrirRoleta(page);
    await esperarItem(page, 'sair-brinquedo');
    await page.screenshot({ path: `${PASTA}/${tamanho}-roda-do-menu-sair.png` });
    await escolherNaRoleta(page, 'sair-brinquedo');
    await page.waitForFunction(() => !window.__brumaluz!.vilaParque!.sentado());
    await page.waitForTimeout(1200);
    const fora = await pes(page);
    expect(Math.hypot(fora[0] - pq.carrossel.x, fora[2] - pq.carrossel.z)).toBeGreaterThan(
      pq.carrossel.beira + 0.6,
    );
    expect(Math.abs(fora[1] - Y)).toBeLessThan(0.3);
    // em pé, a roda do menu não tem o "Sair"
    await abrirRoleta(page);
    await esperarItem(page, 'mapa');
    await esperarItem(page, 'sair-brinquedo', false);
    await page.locator('.menu-hud.botao-roda').tap();
    await page.waitForFunction(() => !window.__brumaluz!.gestos!.roda());
    await page.waitForTimeout(400);

    // ---------------------------------------------------------------- o bate-bate
    // (guiar e bater de verdade, com o dedo no controle, é do `vila-bate.spec.ts`; aqui, o
    // subir no carrinho livre, o carrinho que espera parado e o "Sair do brinquedo" da roda)
    const vaga = pq.bate.vagas[5];
    await irPara(page, [vaga[0], Y, vaga[1]], [vaga[0], pq.bate.z1 + 3.2], 0.25);
    await assentar(page, 9);
    t = await alvoDeSentar(page, 2);
    await page.touchscreen.tap(t.x, t.y);
    await page.waitForFunction(() => window.__brumaluz!.vilaParque!.sentado()?.b === 'bate');
    await page.waitForTimeout(900);
    const c0 = await pes(page);
    await page.waitForTimeout(1500);
    const c1 = await pes(page);
    // o carrinho espera por ela: sem o controle, não sai do lugar (nada de andar sozinho)
    expect(Math.hypot(c0[0] - c1[0], c0[2] - c1[2])).toBeLessThan(0.2);
    expect(Math.hypot(c0[0] - vaga[0], c0[2] - vaga[1])).toBeLessThan(1.2);
    await page.screenshot({ path: `${PASTA}/${tamanho}-bate-no-carrinho.png` });
    // o toque não faz "tum" de mentira nem a tira do carrinho
    await page.touchscreen.tap(meio.x, meio.y);
    await page.waitForTimeout(400);
    expect((await sentado(page))?.b).toBe('bate');
    // "Sair do brinquedo" na roda desce do lado de fora da mureta
    await escolherNaRoleta(page, 'sair-brinquedo');
    await page.waitForFunction(() => !window.__brumaluz!.vilaParque!.sentado());
    await page.waitForTimeout(1200);
    const saiu = await pes(page);
    expect(saiu[2]).toBeGreaterThan(pq.bate.z1 + 1);
    expect(Math.abs(saiu[1] - Y)).toBeLessThan(0.3);

    // ---------------------------------------------------------------- os brinquedos de tocar
    const tocar = async (qual: string, de: [number, number], pronto: () => boolean | number) => {
      const alvo = await page.evaluate((qual) => {
        const q = window.__brumaluz!.vila!()!.pontos.parque as unknown as Record<string, P3>;
        return q[qual];
      }, qual);
      await irPara(page, alvo, [alvo[0] + de[0], alvo[2] + de[1]]);
      const t = await page.evaluate(
        // (há dois carrinhos de pipoca no bairro: vale o que está na tela)
        (qual) => window.__vila!.parque().tocar.find((q) => q.qual === qual && q.t)?.t ?? null,
        qual,
      );
      expect(t, `${qual} na tela`).not.toBeNull();
      const antes = await page.evaluate(() => window.__brumaluz!.parqueToques ?? 0);
      await page.touchscreen.tap(t!.x, t!.y);
      await page.waitForFunction(pronto);
      expect(await page.evaluate(() => window.__brumaluz!.parqueToques ?? 0)).toBe(antes + 1);
      await page.waitForTimeout(350);
      await page.screenshot({ path: `${PASTA}/${tamanho}-toque-${qual}.png` });
    };
    await tocar('baloes', [-3, -1], () => window.__brumaluz!.parqueVila!()!.baloes > 0.2);
    await tocar('algodao', [0, 3.5], () => window.__brumaluz!.parqueVila!()!.algodao > 0.1);
    await tocar('pipoca', [0, 3.5], () => (window.__brumaluz!.parqueToques ?? 0) > 0);
    await tocar('argola', [0, -4.5], () => {
      const p = window.__brumaluz!.parqueVila!()!;
      return p.argolasNoPino > 0;
    });
    await tocar('pescaria', [0, -4.5], () => window.__brumaluz!.parqueVila!()!.peixePulando);

    // ---------------------------------------------------------------- a roda-gigante
    await irPara(
      page,
      [pq.roda.x, Y + 3, pq.roda.z],
      [pq.roda.saida[0], pq.roda.saida[2] + 1.5],
      -0.2,
    );
    await assentar(page, 9);
    t = await alvoDeSentar(page, 0);
    await page.touchscreen.tap(t.x, t.y);
    await page.waitForFunction(() => window.__brumaluz!.vilaParque!.sentado()?.b === 'roda');
    const inicio = Date.now();
    // sobe com a cadeirinha
    await page.waitForFunction((y) => window.__brumaluz!.jogadorPes!()[1] > y + 6, Y, {
      timeout: 20_000,
    });
    // o toque dá o empurrãozinho e as lâmpadas piscam
    await page.touchscreen.tap(meio.x, meio.y);
    await page.waitForFunction(() => window.__brumaluz!.parqueVila!()!.piscando);
    await page.waitForFunction((y) => window.__brumaluz!.jogadorPes!()[1] > y + 13.5, Y, {
      timeout: 20_000,
    });
    await page.screenshot({ path: `${PASTA}/${tamanho}-roda-no-alto.png` });
    // a câmera continua dela lá em cima
    const r0 = await page.evaluate(() => window.__brumaluz!.rotacao![1]);
    await dedo(page, meio.x, meio.y, -120, 0, 300);
    const r1 = await page.evaluate(() => window.__brumaluz!.rotacao![1]);
    expect(Math.abs(r1 - r0)).toBeGreaterThan(0.1);
    // desce sozinha no chão, na frente da roda, depois da volta (uns 25 s)
    await page.waitForFunction(() => !window.__brumaluz!.vilaParque!.sentado(), undefined, {
      timeout: 40_000,
    });
    const dur = (Date.now() - inicio) / 1000;
    expect(dur).toBeGreaterThan(18);
    expect(dur).toBeLessThan(32);
    await page.waitForTimeout(1200);
    const noChao = await pes(page);
    expect(Math.hypot(noChao[0] - pq.roda.saida[0], noChao[2] - pq.roda.saida[2])).toBeLessThan(
      1.5,
    );
    expect(Math.abs(noChao[1] - Y)).toBeLessThan(0.3);
    await page.screenshot({ path: `${PASTA}/${tamanho}-roda-desceu.png` });
    await page.close();
  });
}
