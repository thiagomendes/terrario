import { expect, test, type Browser, type Page } from '@playwright/test';

/**
 * No site publicado: Ana abre o mundo para amigos, Bia entra pelo link do convite.
 * Mede do toque no link até a Bia estar jogando e vendo a Ana, e procura mensagem
 * técnica na tela.
 */
async function jogador(browser: Browser, id: string, apelido: string, celular = false) {
  const ctx = await browser.newContext(
    celular
      ? { viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true }
      : { viewport: { width: 1280, height: 720 } },
  );
  await ctx.addInitScript(
    ([i, a]) => {
      localStorage.setItem(
        'terrario:identidade',
        JSON.stringify({ id: i, chave: `chave-do-teste-na-nuvem-${i}-0123456789`, apelido: a }),
      );
    },
    [id, apelido],
  );
  return ctx.newPage();
}
const pronto = (p: Page, ms = 240_000) =>
  p.waitForFunction(() => window.__brumaluz?.ready === true, undefined, { timeout: ms });
const TECNICO = /websocket|erro \d|1006|exception|undefined|null|NaN/i;

test('convite pelo link no site publicado: do link até jogando junto', async ({ browser }) => {
  test.setTimeout(900_000);
  const sufixo = Date.now().toString(36);
  const ana = await jogador(browser, `ana-nuvem-${sufixo}`, 'Ana');
  await ana.goto('/');
  await pronto(ana);
  await ana.evaluate(() => document.querySelector('.entrada')?.setAttribute('hidden', ''));
  await ana.evaluate(() => window.dispatchEvent(new CustomEvent('brumaluz:amigos')));
  const t0 = Date.now();
  await ana.locator('[data-abrir-para-amigos]').click();
  await ana.waitForURL(/sala=/, { timeout: 120_000 });
  await pronto(ana);
  const codigo = await ana
    .locator('[data-codigo-mundo]')
    .getAttribute('data-codigo-mundo', { timeout: 60_000 });
  const levar = Date.now() - t0;
  console.log(`levar para a nuvem e reabrir: ${levar} ms (código ${codigo})`);
  await ana.screenshot({ path: 'capturas-temas/nuvem-convite.jpg', type: 'jpeg', quality: 80 });
  await ana.keyboard.press('Escape');

  // Bia, no "celular", abre o link do convite
  const bia = await jogador(browser, `bia-nuvem-${sufixo}`, 'Bia', true);
  const t1 = Date.now();
  await bia.goto(`/?sala=${codigo}`);
  await pronto(bia);
  const jogando = Date.now() - t1;
  await bia.waitForFunction(
    () => (window.__brumaluz!.outrosJogadores?.() ?? []).length > 0,
    undefined,
    { timeout: 60_000 },
  );
  const vendo = Date.now() - t1;
  console.log(`link até jogando: ${jogando} ms; até ver a Ana: ${vendo} ms`);
  await bia.waitForTimeout(3000);
  await bia.screenshot({ path: 'capturas-temas/nuvem-bia-entrou.jpg', type: 'jpeg', quality: 80 });

  // um bloco da Ana chega para a Bia
  const cel = await ana.evaluate(() => {
    const e = window.__brumaluz!;
    const [x, y, z] = e.posicao!;
    const c = { x: Math.floor(x) + 2, y: Math.floor(y), z: Math.floor(z) };
    e.definirBloco!(c.x, c.y, c.z, 7);
    return c;
  });
  const t2 = Date.now();
  await bia.waitForFunction(({ x, y, z }) => window.__brumaluz!.bloco!(x, y, z) === 7, cel, {
    timeout: 30_000,
  });
  console.log(`bloco da Ana chegou na Bia em ${Date.now() - t2} ms`);

  // nenhuma mensagem técnica visível
  for (const p of [ana, bia]) {
    const texto = await p.evaluate(() => document.body.innerText);
    expect(texto).not.toMatch(TECNICO);
  }
  console.log(
    `RESULTADO ${JSON.stringify({ levarMs: levar, linkAteJogandoMs: jogando, linkAteVerAnaMs: vendo })}`,
  );
  await ana.context().close();
  await bia.context().close();
});
