import { expect, test, type Browser, type Page } from '@playwright/test';
import { criarMundo } from './guia-palco';

/**
 * Spec 026 (parte 3), dois navegadores no mesmo mundo da nuvem: a Ana e a Bia na sala da Casa
 * anos 80. A TV e o disco são da sala, de todos: o canal que a Ana troca aparece na tela da Bia,
 * a Bia logo em seguida não troca por cima (a esperinha da sala) e, passada a esperinha, troca para
 * as duas; o disco que a Bia liga toca para as duas. Na rampa, a Bia vê a Ana no trilho.
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
const canal = (p: Page) => p.evaluate(() => window.__brumaluz!.vilaCasa!.sala().canal);
/** A criança na sala, entre o sofá e a TV. */
const naSala = (p: Page, dx: number) =>
  p.evaluate((dx) => {
    const e = window.__brumaluz!;
    const c = e.vila!()!.pontos.casa;
    e.voar?.(false);
    e.teleportar!(c.tv[0] + dx, c.tv[2] + 4.5, c.y + 0.2);
    e.apontar!(Math.PI, 0.9);
  }, dx);

test('dois navegadores na sala da casa: a TV e o disco são de todos, com a esperinha', async ({
  browser,
}) => {
  test.setTimeout(900_000);
  const ana = await jogador(browser, 'ana-casa', 'Ana');
  await criarMundo(ana, 'vila-casa-amigos', 'vila-neon');
  await ana.goto('/?mundo=vila-casa-amigos');
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
  const bia = await jogador(browser, 'bia-casa', 'Bia');
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

  await naSala(ana, -1);
  await naSala(bia, 1.2);
  await ana.waitForTimeout(2500);
  expect(await canal(ana)).toBe(0);
  expect(await canal(bia)).toBe(0);
  // a Ana troca o canal: as duas veem o canal 2
  await ana.evaluate(() => window.__brumaluz!.vilaCasa!.tocar('tv'));
  for (const p of [ana, bia])
    await p.waitForFunction(() => window.__brumaluz!.vilaCasa!.sala().canal === 1, null, {
      timeout: 10_000,
    });
  // a Bia logo em seguida: a esperinha da sala segura (ninguém troca por cima do outro)
  await bia.evaluate(() => window.__brumaluz!.vilaCasa!.tocar('tv'));
  await bia.waitForTimeout(800);
  expect(await canal(bia)).toBe(1);
  expect(await canal(ana)).toBe(1);
  // passada a esperinha, a Bia troca: as duas veem o canal 3
  await bia.waitForTimeout(700);
  await bia.evaluate(() => window.__brumaluz!.vilaCasa!.tocar('tv'));
  for (const p of [ana, bia])
    await p.waitForFunction(() => window.__brumaluz!.vilaCasa!.sala().canal === 2, null, {
      timeout: 10_000,
    });
  await ana.waitForTimeout(1200);
  // as duas telas mostram o mesmo desenho
  expect((await ana.evaluate(() => window.__brumaluz!.vilaCasa!.estado().tela))).toBe('canal2');
  expect((await bia.evaluate(() => window.__brumaluz!.vilaCasa!.estado().tela))).toBe('canal2');
  // a Bia liga o disco: toca para as duas
  await bia.evaluate(() => {
    const e = window.__brumaluz!;
    const c = e.vila!()!.pontos.casa;
    e.teleportar!(c.discos[0] + 2, c.discos[2], c.y + 0.2);
  });
  await bia.waitForTimeout(800);
  await bia.evaluate(() => window.__brumaluz!.vilaCasa!.tocar('disco'));
  for (const p of [ana, bia])
    await p.waitForFunction(() => window.__brumaluz!.vilaCasa!.sala().disco >= 0, null, {
      timeout: 10_000,
    });
  await ana.screenshot({ path: 'capturas-026c/amigos-ana.png' });
  await bia.screenshot({ path: 'capturas-026c/amigos-bia.png' });

  // na rampa: a Ana de skate no trilho, a Bia vê a Ana subir a curva
  await ana.evaluate(() => {
    const e = window.__brumaluz!;
    const R = e.vila!()!.pontos.skate.rampa;
    e.vilaSkate!(true);
    e.teleportar!(R.x - 0.4, R.z, R.y + 0.2);
    e.apontar!(Math.PI / 2, 0.3);
  });
  await bia.evaluate(() => {
    const e = window.__brumaluz!;
    const R = e.vila!()!.pontos.skate.rampa;
    e.teleportar!(R.x, R.z1 + 4, R.y + 0.2);
    e.apontar!(Math.PI, 0.3);
  });
  await ana.waitForTimeout(3000);
  await ana.evaluate(() => window.__brumaluz!.controleDireto!.mover(1, 0));
  await bia.waitForFunction(
    () => {
      const e = window.__brumaluz!;
      const R = e.vila!()!.pontos.skate.rampa;
      const a = (e.outrosJogadores?.() ?? []).find((q) => q.apelido === 'Ana');
      return !!a && a.y > R.y + 0.6;
    },
    null,
    { timeout: 20_000 },
  );
  await bia.screenshot({ path: 'capturas-026c/amigos-bia-ve-ana-na-rampa.png' });
  await ana.evaluate(() => window.__brumaluz!.controleDireto!.mover(0, 0));
  await ana.context().close();
  await bia.context().close();
});
