import { expect, test, type Browser, type Page } from '@playwright/test';

/**
 * Spec 010, critério 1: dois navegadores no mesmo mundo. Ana leva o mundo dela para a
 * nuvem pelo painel "Jogar com amigos"; Bia entra pelo link com o código; o que uma faz
 * a outra vê, as duas veem as mesmas criaturas e cada uma vê a outra no mundo.
 */
async function jogador(browser: Browser, id: string, apelido: string): Promise<Page> {
  const ctx = await browser.newContext({ viewport: { width: 960, height: 540 } });
  await ctx.addInitScript(
    ([i, a]) => {
      localStorage.setItem(
        'terrario:identidade',
        JSON.stringify({ id: i, chave: `chave-de-teste-${i}-0123456789abcdef`, apelido: a }),
      );
    },
    [id, apelido],
  );
  const p = await ctx.newPage();
  p.on('pageerror', (e) => console.log(`[${apelido}] erro: ${String(e)}`));
  return p;
}
const pronto = (p: Page) =>
  p.waitForFunction(() => window.__brumaluz?.ready, null, { timeout: 180_000 });
const entrarNoJogo = (p: Page) =>
  p.evaluate(() => {
    document.querySelector('.entrada')?.setAttribute('hidden', '');
    window.__brumaluz!.pausarDia = true;
  });

test('dois navegadores no mesmo mundo: convite, entrada pelo link e tudo sincronizado', async ({
  browser,
}) => {
  test.setTimeout(600_000);
  const ana = await jogador(browser, 'ana-e2e', 'Ana');
  await ana.goto('/');
  await pronto(ana);
  await entrarNoJogo(ana);
  // Ana abre o painel e leva o mundo para a nuvem
  await ana.evaluate(() => window.dispatchEvent(new CustomEvent('brumaluz:amigos')));
  await ana.locator('[data-abrir-para-amigos]').click();
  await ana.waitForURL(/sala=/, { timeout: 60_000 });
  await pronto(ana);
  await entrarNoJogo(ana);
  // o convite abre sozinho na primeira vez, com o código ilustrado e o QR Code
  const codigo = await ana
    .locator('[data-codigo-mundo]')
    .getAttribute('data-codigo-mundo', { timeout: 30_000 });
  expect(codigo).toMatch(/^[A-Z]+-[A-Z]+-\d\d$/);
  await expect(ana.locator('.amigos .qr img')).toBeVisible();
  await ana.screenshot({ path: 'test-results/screens/multiplayer-convite.png' });
  await ana.keyboard.press('Escape');

  // Bia entra pelo link
  const bia = await jogador(browser, 'bia-e2e', 'Bia');
  const t0 = Date.now();
  await bia.goto(`/?sala=${codigo}`);
  // spec 011: a prévia do mundo (de quem é, quem está) e um toque em "Entrar"
  await expect(bia.locator('[data-tela-entrar] h2')).toHaveText('Entrar no mundo de Ana', {
    timeout: 60_000,
  });
  await expect(bia.locator('[data-quem-esta]')).toContainText('Ana');
  await bia.locator('[data-entrar-mundo]').click();
  await pronto(bia);
  const entrada = Date.now() - t0;
  console.log(`do link até o mundo pronto (WebGL por software): ${entrada} ms`);
  await entrarNoJogo(bia);

  // cada uma vê a outra
  await ana.waitForFunction(
    () => (window.__brumaluz!.outrosJogadores?.() ?? []).some((o) => o.apelido === 'Bia'),
    null,
    { timeout: 30_000 },
  );
  await bia.waitForFunction(
    () => (window.__brumaluz!.outrosJogadores?.() ?? []).some((o) => o.apelido === 'Ana'),
    null,
    { timeout: 30_000 },
  );

  // o item na mão aparece no boneco de quem entrou pelo código (bug visto em família;
  // desde a spec 015 o jogo é só em terceira pessoa: a mão é a do boneco)
  const pecasMao = await bia.evaluate(async () => {
    const e = window.__brumaluz!;
    e.inventario!.definir(0, { item: 'picareta_ferro', qtd: 1 });
    e.selecionarSlot!(0);
    await new Promise((r) => setTimeout(r, 600));
    return {
      mao: e.personagem!.malhasMao(),
      visivel: e.personagem!.visivel(),
    };
  });
  console.log(`mão da Bia: ${JSON.stringify(pecasMao)}`);
  expect(pecasMao.visivel.corpo).toBe(true);
  expect(pecasMao.mao).toBeGreaterThan(0);

  // Ana quebra um bloco perto dela: Bia vê
  const cel = await ana.evaluate(() => {
    const e = window.__brumaluz!;
    const [x, y, z] = e.posicao!.map(Math.floor);
    for (let yy = y; yy > y - 6; yy--)
      if (e.bloco!(x + 1, yy, z) !== 0) return { x: x + 1, y: yy, z };
    return null;
  });
  expect(cel).not.toBeNull();
  const antes = await bia.evaluate(({ x, y, z }) => window.__brumaluz!.bloco!(x, y, z), cel!);
  expect(antes).not.toBe(0);
  const t1 = Date.now();
  await ana.evaluate(({ x, y, z }) => window.__brumaluz!.definirBloco!(x, y, z, 0), cel!);
  await bia.waitForFunction(({ x, y, z }) => window.__brumaluz!.bloco!(x, y, z) === 0, cel!, {
    timeout: 15_000,
  });
  console.log(`bloco quebrado por Ana chegou para Bia em ${Date.now() - t1} ms`);

  // Bia coloca um bloco: Ana vê
  await bia.evaluate(({ x, y, z }) => window.__brumaluz!.definirBloco!(x, y, z, 7), cel!);
  await ana.waitForFunction(({ x, y, z }) => window.__brumaluz!.bloco!(x, y, z) === 7, cel!, {
    timeout: 15_000,
  });

  // spec 012: Bia golpeia (no ritmo de quem segura o botão); Ana vê o boneco dela golpeando
  const golpes = bia.evaluate(async () => {
    const e = window.__brumaluz!;
    for (let i = 0; i < 12; i++) {
      e.barramento!.emitir('golpe', { x: 0, y: 0, z: 0, bloco: 1 });
      await new Promise((r) => setTimeout(r, 250));
    }
  });
  const viuGolpe = await ana.evaluate(async () => {
    const e = window.__brumaluz!;
    const t0 = performance.now();
    let viu = false;
    while (performance.now() - t0 < 6000 && !viu) {
      viu = (e.outrosJogadores?.() ?? []).some((o) => o.apelido === 'Bia' && o.golpeando);
      await new Promise((r) => requestAnimationFrame(r));
    }
    return viu;
  });
  await golpes;
  expect(viuGolpe).toBe(true);

  // as mesmas criaturas, no mesmo lugar (até 1 bloco de diferença)
  await ana.waitForTimeout(3000);
  // lidas ao mesmo tempo e comparadas pela identidade de cada criatura
  const [ca, cb] = await Promise.all([
    ana.evaluate(() => window.__brumaluz!.criaturas!()),
    bia.evaluate(() => window.__brumaluz!.criaturas!()),
  ]);
  const comuns = ca.filter((a) =>
    cb.some((b) => b.id === a.id && Math.hypot(a.x - b.x, a.z - b.z) < 1.5),
  );
  console.log(
    `criaturas: Ana vê ${ca.length}, Bia vê ${cb.length}, no mesmo lugar ${comuns.length}`,
  );
  if (ca.length) expect(comuns.length).toBeGreaterThanOrEqual(Math.min(ca.length, cb.length) - 1);
  // o mesmo dia e a mesma hora
  const ha = await ana.evaluate(() => window.__brumaluz!.hora!);
  const hb = await bia.evaluate(() => window.__brumaluz!.hora!);
  expect(Math.abs(ha - hb)).toBeLessThan(0.002);

  await bia.screenshot({ path: 'test-results/screens/multiplayer-bia-ve-ana.png' });
  await ana.screenshot({ path: 'test-results/screens/multiplayer-ana-ve-bia.png' });
});

test('código que não existe: mensagem para criança e volta ao mundo do aparelho', async ({
  browser,
}) => {
  test.setTimeout(240_000);
  const caio = await jogador(browser, 'caio-e2e', 'Caio');
  await caio.goto('/?sala=LUA-COMETA-01');
  // spec 011: o motivo aparece no próprio cartão de entrar, nunca numa tela nova vazia
  await expect(caio.locator('[data-tela-entrar]')).toContainText('Esse código não existe', {
    timeout: 60_000,
  });
  // nada de termos técnicos na tela
  const texto = await caio.locator('[data-tela-entrar]').innerText();
  expect(texto).not.toMatch(/erro \d|websocket|1006|undefined|null/i);
  await caio.locator('[data-voltar-meu-mundo]').click();
  await pronto(caio);
});
