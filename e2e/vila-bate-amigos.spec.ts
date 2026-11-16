import { expect, test, type Browser, type Page } from '@playwright/test';
import { criarMundo } from './guia-palco';

/**
 * Spec 026 (parte 2, o bate-bate de guiar), dois navegadores no mesmo mundo da nuvem: a Ana e a
 * Bia sobem cada uma num carrinho; a Ana guia (as teclas W, A, S e D do computador) e bate no
 * carrinho da Bia de verdade. O núcleo da nuvem é quem simula: as duas telas veem a mesma batida
 * e os mesmos carrinhos, e a previsão da Ana concorda com o servidor.
 */
async function jogador(browser: Browser, id: string, apelido: string): Promise<Page> {
  const ctx = await browser.newContext({ viewport: { width: 960, height: 540 } });
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
  const p = await ctx.newPage();
  p.on('pageerror', (e) => console.log(`[${apelido}] erro: ${String(e)}`));
  return p;
}
const pronto = (p: Page) =>
  p.waitForFunction(() => window.__brumaluz?.ready, null, { timeout: 240_000 });
const entrarNoJogo = (p: Page) =>
  p.evaluate(() => {
    document.querySelector('.entrada')?.setAttribute('hidden', '');
    window.__brumaluz!.pausarDia = true;
    window.__brumaluz!.hora = 0.42;
  });
const carros = (p: Page) =>
  p.evaluate(() => (window.__brumaluz!.vilaParque!.carros() ?? []).map((c) => [c.x, c.z]));

/** Vai para a calçadinha atrás da vaga `i` e sobe no carrinho livre mais perto (o dela). */
async function subir(p: Page, i: number): Promise<number> {
  await p.evaluate((i) => {
    const e = window.__brumaluz!;
    const pl = e.vila!()!;
    const B = pl.pontos.parque.bate;
    e.voar?.(false);
    e.teleportar!(B.vagas[i][0], B.z1 + 2.2, pl.h + 1.2);
    e.apontar!(Math.PI, 0.3);
  }, i);
  await p.waitForFunction(() => !!window.__brumaluz!.vilaParque?.carros(), null, { timeout: 60_000 });
  await p.waitForFunction(() => window.__brumaluz!.vilaParque!.carrinhoLivre() >= 0, null, {
    timeout: 30_000,
  });
  await p.waitForTimeout(800);
  await p.evaluate(() => window.__brumaluz!.vilaParque!.sentar(2));
  await p.waitForFunction(() => window.__brumaluz!.vilaParque!.sentado()?.b === 'bate', null, {
    timeout: 20_000,
  });
  await p.waitForTimeout(1500);
  return p.evaluate(() => window.__brumaluz!.vilaParque!.sentado()!.i);
}

test('dois navegadores no bate-bate: a Ana guia e bate no carrinho da Bia, e as duas telas veem a mesma batida', async ({
  browser,
}) => {
  test.setTimeout(900_000);
  const ana = await jogador(browser, 'ana-bate', 'Ana');
  await criarMundo(ana, 'vila-bate-amigos', 'vila-neon');
  await ana.goto('/?mundo=vila-bate-amigos');
  await pronto(ana);
  await entrarNoJogo(ana);
  await ana.evaluate(() => window.dispatchEvent(new CustomEvent('brumaluz:amigos')));
  await ana.locator('[data-abrir-para-amigos]').click();
  await ana.waitForURL(/sala=/, { timeout: 60_000 });
  await pronto(ana);
  await entrarNoJogo(ana);
  const codigo = await ana
    .locator('[data-codigo-mundo]')
    .getAttribute('data-codigo-mundo', { timeout: 30_000 });
  await ana.keyboard.press('Escape');
  const bia = await jogador(browser, 'bia-bate', 'Bia');
  await bia.goto(`/?sala=${codigo}`);
  await bia.locator('[data-entrar-mundo]').click({ timeout: 60_000 });
  await pronto(bia);
  await entrarNoJogo(bia);
  for (const [p, outra] of [
    [ana, 'Bia'],
    [bia, 'Ana'],
  ] as const)
    await p.waitForFunction(
      (o) => (window.__brumaluz!.outrosJogadores?.() ?? []).some((q) => q.apelido === o),
      outra,
      { timeout: 90_000 },
    );

  // cada uma no seu carrinho: a Ana à esquerda do tapete da saída, a Bia à direita
  const ia = await subir(ana, 5);
  const ib = await subir(bia, 6);
  expect(ia).toBe(5);
  expect(ib).toBe(6);
  // as duas telas sabem quem está em qual carrinho
  for (const p of [ana, bia])
    await p.waitForFunction(
      () => Object.values(window.__brumaluz!.vilaEstado!()?.parque?.s ?? {}).filter((q) => q[0] === 2).length === 2,
    );
  const B = await ana.evaluate(() => window.__brumaluz!.vila!()!.pontos.parque.bate);

  // a Ana guia com as teclas do computador: W leva o carrinho para a frente (a câmera está atrás dele)
  const a0 = (await carros(ana))[ia];
  await ana.keyboard.down('KeyW');
  await ana.waitForTimeout(1300);
  await ana.keyboard.up('KeyW');
  await ana.waitForTimeout(900);
  const a1 = (await carros(ana))[ia];
  expect(a1[1]).toBeLessThan(a0[1] - 2);
  // a Bia vê o carrinho da Ana no mesmo lugar (o núcleo da nuvem é quem anda os carrinhos)
  await bia.waitForTimeout(500);
  const a1NaBia = (await carros(bia))[ia];
  expect(Math.hypot(a1NaBia[0] - a1[0], a1NaBia[1] - a1[1])).toBeLessThan(0.35);

  // agora vai para cima do carrinho da Bia (parado na vaga) até bater nele
  const b0 = (await carros(bia))[ib];
  const bateu = await ana.evaluate(
    ([ib]) =>
      new Promise<boolean>((ok) => {
        const e = window.__brumaluz!;
        const vp = e.vilaParque!;
        const t0 = performance.now();
        const vez = () => {
          const s = vp.sentado();
          const c = vp.carros();
          if (!s || !c) return ok(false);
          // (a batida dos dois, contada pelo núcleo da nuvem: as dos moradores não valem aqui)
          const fim = (e.eventosVila ?? []).some(
            (ev) =>
              ev.e === 'parqueTum' && [ev.de, ev.alvo].includes(s.i) && [ev.de, ev.alvo].includes(ib),
          );
          if (fim || performance.now() - t0 > 40_000) {
            e.controleDireto!.mover(0, 0);
            return ok(fim);
          }
          const d = Math.atan2(c[ib].x - c[s.i].x, c[ib].z - c[s.i].z) - e.rotacao![1];
          e.controleDireto!.mover(Math.cos(d), Math.sin(d));
          setTimeout(vez, 50);
        };
        vez();
      }),
    [ib] as const,
  );
  expect(bateu, 'a Ana bateu no carrinho da Bia').toBe(true);
  // a Bia recebe a batida de verdade: o evento do núcleo com os dois carrinhos, o "tum" na tela
  // dela e o carrinho dela empurrado para fora da vaga (com ela dentro)
  await bia.waitForFunction(
    ([ia, ib]) =>
      (window.__brumaluz!.eventosVila ?? []).some(
        (ev) =>
          ev.e === 'parqueTum' && [ev.de, ev.alvo].includes(ia) && [ev.de, ev.alvo].includes(ib),
      ),
    [ia, ib] as const,
    { timeout: 10_000 },
  );
  expect(await bia.evaluate(() => window.__brumaluz!.vilaParque!.bate().batidas)).toBeGreaterThan(0);
  await bia.waitForTimeout(700);
  const b1 = (await carros(bia))[ib];
  expect(Math.hypot(b1[0] - b0[0], b1[1] - b0[1])).toBeGreaterThan(0.12);
  const pesBia = await bia.evaluate(() => window.__brumaluz!.jogadorPes!());
  expect(Math.hypot(pesBia[0] - b1[0], pesBia[2] - b1[1])).toBeLessThan(0.3);
  expect(await bia.evaluate(() => window.__brumaluz!.vilaParque!.sentado()?.b)).toBe('bate');
  await ana.screenshot({ path: 'test-results/screens/bate-amigos-ana.png' });
  await bia.screenshot({ path: 'test-results/screens/bate-amigos-bia.png' });

  // a Bia também guia, e as duas telas continuam de acordo
  await bia.keyboard.down('KeyW');
  await bia.waitForTimeout(1500);
  await bia.keyboard.up('KeyW');
  await ana.waitForTimeout(1500);
  const naAna = await carros(ana);
  const naBia = await carros(bia);
  for (const i of [ia, ib])
    expect(Math.hypot(naAna[i][0] - naBia[i][0], naAna[i][1] - naBia[i][1]), `carrinho ${i}`).toBeLessThan(0.4);
  // ninguém saiu da pista, e a previsão de cada uma concordou com o servidor (nenhum pulo)
  for (const c of naAna) {
    expect(c[0]).toBeGreaterThan(B.x0 + 0.9);
    expect(c[0]).toBeLessThan(B.x1 - 0.9);
    expect(c[1]).toBeGreaterThan(B.z0 + 0.9);
    expect(c[1]).toBeLessThan(B.z1 - 0.9);
  }
  for (const p of [ana, bia]) {
    const prev = await p.evaluate(() => window.__brumaluz!.vilaParque!.bate());
    console.log(`previsão: ${JSON.stringify(prev)}`);
    expect(prev.maiorErro).toBeLessThan(1.5);
    expect(prev.pendentes).toBeLessThan(12);
  }
  await ana.context().close();
  await bia.context().close();
});
