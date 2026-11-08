import { test, type Browser, type Page } from '@playwright/test';
import { TEMAS_E2E, temasPedidos } from './temas';

/**
 * Capturas do jogar com amigos (spec 010) em todos os temas: o convite, a entrada pelo
 * código, o amigo no mundo com o apelido, a seta para o amigo longe e o minimapa.
 * Pesado: só roda com CAPTURAS_MULTI=1 (ou CAPTURAS_MULTI=<id>,<id>).
 */
declare const process: { env: Record<string, string | undefined> };
const pedido = process.env.CAPTURAS_MULTI;
const TEMAS = TEMAS_E2E.filter(([id]) => temasPedidos(pedido).includes(id));
test.skip(!pedido, 'capturas só com CAPTURAS_MULTI');
const PASTA = 'capturas-temas';

async function jogador(
  browser: Browser,
  id: string,
  apelido: string,
  vp = { width: 1280, height: 720 },
) {
  const ctx = await browser.newContext({ viewport: vp });
  await ctx.addInitScript(
    ([i, a]) => {
      localStorage.setItem(
        'terrario:identidade',
        JSON.stringify({ id: i, chave: `chave-de-captura-${i}-0123456789`, apelido: a }),
      );
    },
    [id, apelido],
  );
  return ctx.newPage();
}
const pronto = (p: Page) =>
  p.waitForFunction(() => window.__brumaluz?.ready, null, { timeout: 180_000 });
const jogar = (p: Page) =>
  p.evaluate(() => {
    document.querySelector('.entrada')?.setAttribute('hidden', '');
    const e = window.__brumaluz!;
    e.pausarDia = true;
    e.hora = 0.42;
    e.definirClima?.('limpo');
  });
const foto = (p: Page, nome: string) =>
  p.screenshot({ path: `${PASTA}/${nome}.jpg`, type: 'jpeg', quality: 82 });

for (const [id, nome] of TEMAS) {
  test(`amigos: ${id}`, async ({ browser }) => {
    test.setTimeout(900_000);
    const ana = await jogador(browser, `ana-${id}`, 'Ana');
    await ana.goto('/');
    await pronto(ana);
    // mundo novo no tema
    await ana.locator('[data-abrir-mundos]').click();
    await ana.locator(`.cartao-tema[data-tema="${id}"]`).click();
    await ana.locator('[data-novo-nome]').fill(`Amigos ${nome}`);
    await ana.locator('[data-criar-mundo]').click();
    await ana.waitForURL(/mundo=/);
    await pronto(ana);
    // título com "Entrar com código"
    await foto(ana, `${id}-titulo-codigo`);
    await jogar(ana);
    // Jogar com amigos (passo a passo) e o convite
    await ana.evaluate(() => window.dispatchEvent(new CustomEvent('brumaluz:amigos')));
    await ana.waitForTimeout(500);
    await foto(ana, `${id}-amigos-passos`);
    await ana.locator('[data-abrir-para-amigos]').click();
    await ana.waitForURL(/sala=/, { timeout: 90_000 });
    await pronto(ana);
    await jogar(ana);
    const codigo = await ana
      .locator('[data-codigo-mundo]')
      .getAttribute('data-codigo-mundo', { timeout: 30_000 });
    await ana.waitForTimeout(800);
    await foto(ana, `${id}-convite`);
    await ana.keyboard.press('Escape');

    // Bia entra pela tela "Entrar com código" (celular deitado)
    const bia = await jogador(browser, `bia-${id}`, 'Bia', { width: 844, height: 390 });
    await bia.goto('/');
    await pronto(bia);
    await bia.evaluate(() => window.dispatchEvent(new CustomEvent('brumaluz:entrarCodigo')));
    await bia.locator('[data-campo-codigo]').fill(codigo!.toLowerCase().replace(/-/g, ' '));
    await bia.waitForTimeout(400);
    await foto(bia, `${id}-entrar-codigo`);
    await bia.locator('[data-entrar]').click();
    await bia.waitForURL(/sala=/, { timeout: 60_000 });
    await pronto(bia);
    await jogar(bia);
    await ana.waitForFunction(
      () => (window.__brumaluz!.outrosJogadores?.() ?? []).length > 0,
      null,
      { timeout: 60_000 },
    );

    // Bia na frente da Ana, olhando para ela: o apelido flutua acima da cabeça
    const pa = await ana.evaluate(() => window.__brumaluz!.posicao!);
    await bia.evaluate(([x, z]) => window.__brumaluz!.teleportar!(x + 4, z), [pa[0], pa[2]]);
    await ana.evaluate(() => window.__brumaluz!.apontar!(Math.PI / 2, 0.05));
    await ana.waitForTimeout(6000);
    await foto(ana, `${id}-amigo`);

    // a Bia minera e coloca um bloco: a Ana vê o braço dela golpeando (spec 012)
    await bia.evaluate(() => {
      const e = window.__brumaluz!;
      e.apontar!(-Math.PI / 2, 0.7);
    });
    await bia.waitForTimeout(400);
    // golpes no ritmo de quem segura o botão (um a cada 250 ms)
    const minerando = bia.evaluate(async () => {
      const e = window.__brumaluz!;
      const [x, y, z] = e.posicao!;
      for (let i = 0; i < 12; i++) {
        e.barramento!.emitir('golpe', {
          x: Math.floor(x) - 1,
          y: Math.floor(y) - 2,
          z: Math.floor(z),
          bloco: 1,
        });
        await new Promise((r) => setTimeout(r, 250));
      }
    });
    for (const k of [1, 2, 3]) {
      await ana.waitForTimeout(370);
      await foto(ana, `${id}-amigo-minerando-${k}`);
    }
    await minerando;

    // Bia longe: seta na borda da tela e bolinha no minimapa
    await bia.evaluate(([x, z]) => window.__brumaluz!.teleportar!(x - 46, z + 20), [pa[0], pa[2]]);
    await ana.waitForTimeout(6000);
    await foto(ana, `${id}-seta-amigo`);
    await ana.context().close();
    await bia.context().close();
  });
}
