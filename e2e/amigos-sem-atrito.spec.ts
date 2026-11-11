import { expect, test, type Browser, type Page } from '@playwright/test';
import { IDS_TEMAS } from './temas';

/**
 * Spec 011, amigos sem atrito: o mundo já nasce para jogar junto e entrar é um toque.
 * Mede toques e tempos de cada caminho (criar com amigos, link, código) e confere o
 * "parar de jogar com amigos" com o que os amigos construíram.
 */
async function jogador(
  browser: Browser,
  id: string,
  apelido: string,
  celular = false,
): Promise<Page> {
  const ctx = await browser.newContext(
    celular
      ? { viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true }
      : { viewport: { width: 1280, height: 720 } },
  );
  // a identidade só é criada uma vez (depois o jogo guarda o apelido que a criança escolher)
  await ctx.addInitScript(
    ([i, a]) => {
      if (localStorage.getItem('terrario:identidade')) return;
      localStorage.setItem(
        'terrario:identidade',
        JSON.stringify({ id: i, chave: `chave-de-teste-${i}-0123456789abcdef`, apelido: a }),
      );
    },
    [id, apelido],
  );
  const p = await ctx.newPage();
  p.on('pageerror', (e) => console.log(`[${id}] erro: ${String(e)}`));
  return p;
}
const pronto = (p: Page) =>
  p.waitForFunction(() => window.__brumaluz?.ready === true, null, { timeout: 180_000 });
const TECNICO = /websocket|erro \d|1006|exception|undefined|\bnull\b|NaN/i;

test('criar com amigos, entrar pelo link e pelo código, e parar de jogar com amigos', async ({
  browser,
}) => {
  test.setTimeout(900_000);
  const sufixo = Date.now().toString(36);

  // 1. Ana cria um mundo já com amigos, sem apelido no aparelho
  const ana = await jogador(browser, `ana-${sufixo}`, '');
  await ana.goto('/');
  await pronto(ana);
  await ana.locator('[data-abrir-mundos]').click();
  await ana.locator('.form-novo [data-tema="exploracao-lunar"]').click();
  await ana.locator('[data-novo-nome]').fill('Base da Ana');
  await ana.locator('[data-com-amigos]').check();
  // nome sugerido do tema já preenchido (nunca "Jogador")
  const sugerido = await ana.locator('[data-novo-apelido]').inputValue();
  expect(sugerido).toMatch(/Lunar$/);
  expect(sugerido).not.toMatch(/Jogador/);
  await ana.locator('[data-novo-apelido]').fill('Ana');
  const t0 = Date.now();
  await ana.locator('[data-criar-mundo]').click();
  // o convite aparece no mundo, sem tela intermediária para tocar
  const codigo = await ana
    .locator('[data-painel-amigos] [data-codigo-mundo]')
    .getAttribute('data-codigo-mundo', { timeout: 120_000 });
  const ateCodigo = Date.now() - t0;
  console.log(`criar com amigos até o código na tela: ${ateCodigo} ms (${codigo})`);
  expect(codigo).toMatch(/^[A-Z]+-[A-Z]+-\d\d$/);
  await expect(ana.locator('[data-painel-amigos] .qr img')).toBeVisible();
  await expect(ana.locator('[data-esperando]')).toBeVisible();
  // a tela de título não aparece em mundo com amigos
  await expect(ana.locator('.entrada')).toBeHidden();
  await ana.screenshot({
    path: 'capturas-temas/amigos-convite-no-mundo.jpg',
    type: 'jpeg',
    quality: 80,
  });

  // 2. Bia, no celular, abre o link: prévia do mundo e um toque em "Entrar"
  const bia = await jogador(browser, `bia-${sufixo}`, '', true);
  await bia.goto(`/?sala=${codigo}`);
  await expect(bia.locator('[data-tela-entrar] h2')).toHaveText('Entrar no mundo de Ana', {
    timeout: 60_000,
  });
  await expect(bia.locator('[data-tela-entrar]')).toContainText('Base da Ana');
  await expect(bia.locator('[data-tela-entrar]')).toContainText('Exploração Lunar');
  await bia.screenshot({
    path: 'capturas-temas/amigos-entrar-pelo-link.jpg',
    type: 'jpeg',
    quality: 80,
  });
  // a criança apaga o nome: o jogo usa o sugerido do tema
  await bia.locator('[data-entrar-apelido]').fill('');
  const t1 = Date.now();
  await bia.locator('[data-entrar-mundo]').tap();
  await pronto(bia);
  const linkAteJogando = Date.now() - t1;
  console.log(`link: do toque em Entrar até jogando: ${linkAteJogando} ms`);
  await expect(bia.locator('.entrada')).toBeHidden();
  await bia.waitForTimeout(1500);
  await bia.screenshot({
    path: 'capturas-temas/amigos-bia-no-mundo-celular.jpg',
    type: 'jpeg',
    quality: 80,
  });
  // o som já foi liberado pelo toque em "Entrar"
  await expect
    .poll(() => bia.evaluate(() => window.__brumaluz!.audio?.estado), { timeout: 10_000 })
    .toBe('ativo');

  // a Ana vê a Bia chegar no cartão (brilhando) e no botão de amigos, com o nome sugerido
  await expect(ana.locator('[data-lista-jogadores] li')).toHaveCount(2, { timeout: 5_000 });
  const nomeBia = await ana.locator('[data-lista-jogadores] li').nth(1).innerText();
  console.log(`nome da Bia no cartão da Ana: ${nomeBia}`);
  expect(nomeBia).toMatch(/Lunar/);
  expect(nomeBia).not.toMatch(/Jogador/);
  await ana.locator('[data-comecar-a-jogar]').click();
  await expect(ana.locator('[data-botao-amigos]')).toHaveAttribute('data-quantos', '2');

  // 3. Caio entra digitando o código na tela de título: código e um toque
  const caio = await jogador(browser, `caio-${sufixo}`, 'Caio');
  await caio.goto('/');
  await pronto(caio);
  await caio.locator('[data-entrar-com-codigo]').click();
  await caio.locator('[data-campo-codigo]').fill(codigo!.toLowerCase().replace(/-/g, ' '));
  await caio.locator('[data-entrar]').click();
  await caio.waitForURL(/sala=/, { timeout: 60_000 });
  await pronto(caio);
  // sem segundo "Jogar": já está no mundo
  await expect(caio.locator('.entrada')).toBeHidden();
  await expect(caio.locator('[data-tela-entrar]')).toHaveCount(0);
  // entrou direto (sem toque nesta página): a tela cheia entra no primeiro clique no jogo
  expect(await caio.evaluate(() => !!document.fullscreenElement)).toBe(false);
  await caio.mouse.click(400, 300);
  await expect
    .poll(() => caio.evaluate(() => !!document.fullscreenElement), { timeout: 5_000 })
    .toBe(true);
  await expect(ana.locator('[data-botao-amigos]')).toHaveAttribute('data-quantos', '3', {
    timeout: 5_000,
  });

  // a Bia constrói: depois de parar, a construção dela fica no mundo da Ana
  const cel = await bia.evaluate(() => {
    const e = window.__brumaluz!;
    const [x, y, z] = e.posicao!;
    const c = { x: Math.floor(x) + 2, y: Math.floor(y), z: Math.floor(z) };
    e.definirBloco!(c.x, c.y, c.z, 7);
    return c;
  });
  await ana.waitForFunction(({ x, y, z }) => window.__brumaluz!.bloco!(x, y, z) === 7, cel, {
    timeout: 30_000,
  });

  // 4. Ana para de jogar com amigos: o mundo volta inteiro para o aparelho dela
  // (pela pausa ou pelo botão fixo: o navegador de teste solta o mouse e a pausa abre)
  await ana.evaluate(() => window.dispatchEvent(new CustomEvent('brumaluz:amigos')));
  await ana.locator('[data-devolver-mundo]').click();
  await ana.locator('[data-dialogo-confirmar]').click();
  await ana.waitForURL(/mundo=/, { timeout: 60_000 });
  await pronto(ana);
  expect(new URL(ana.url()).searchParams.get('sala')).toBeNull();
  await ana.waitForFunction(({ x, y, z }) => window.__brumaluz!.bloco!(x, y, z) === 7, cel, {
    timeout: 60_000,
  });
  // os amigos recebem uma despedida gentil, sem nada técnico
  for (const p of [bia, caio]) {
    await expect(p.locator('[data-carregando-nuvem]')).toContainText('levou este mundo de volta', {
      timeout: 30_000,
    });
    expect(await p.locator('[data-carregando-nuvem]').innerText()).not.toMatch(TECNICO);
  }
  // na lista da Ana o mundo não tem mais o selo, e o código deixou de valer
  await ana.locator('[data-abrir-mundos]').click();
  await expect(ana.locator('.cartao-mundo-item', { hasText: 'Base da Ana' })).toBeVisible();
  await expect(
    ana.locator('.cartao-mundo-item', { hasText: 'Base da Ana' }).locator('[data-selo-amigos]'),
  ).toHaveCount(0);
  const dani = await jogador(browser, `dani-${sufixo}`, 'Dani');
  await dani.goto(`/?sala=${codigo}`);
  await expect(dani.locator('[data-tela-entrar]')).toContainText('Esse código não existe', {
    timeout: 60_000,
  });

  console.log(`MEDIDAS ${JSON.stringify({ ateCodigo, linkAteJogando })}`);
  // critérios de tempo (GPU da máquina de teste)
  expect(ateCodigo).toBeLessThan(15_000);
  expect(linkAteJogando).toBeLessThan(15_000);
});

const TEMAS = IDS_TEMAS;

test('capturas: convite e entrar pelo link em todos os temas, no computador e no celular', async ({
  browser,
}) => {
  test.skip(!process.env.CAPTURAS_BRINQUEDO, 'capturas só com CAPTURAS_BRINQUEDO');
  test.setTimeout(900_000);
  const sufixo = Date.now().toString(36);
  for (const tema of TEMAS) {
    const dono = await jogador(browser, `dono-${tema}-${sufixo}`, 'Luiza');
    await dono.goto('/');
    await pronto(dono);
    await dono.locator('[data-abrir-mundos]').click();
    await dono.locator(`.form-novo [data-tema="${tema}"]`).click();
    await dono.locator('[data-novo-nome]').fill(`Mundo de ${tema}`);
    await dono.locator('[data-com-amigos]').check();
    await dono.locator('[data-criar-mundo]').click();
    const codigo = await dono
      .locator('[data-painel-amigos] [data-codigo-mundo]')
      .getAttribute('data-codigo-mundo', { timeout: 120_000 });
    await dono.waitForTimeout(1500);
    await dono.screenshot({
      path: `capturas-temas/amigos-convite-${tema}.jpg`,
      type: 'jpeg',
      quality: 80,
    });
    for (const celular of [false, true]) {
      const visita = await jogador(browser, `visita-${tema}-${celular}-${sufixo}`, '', celular);
      await visita.goto(`/?sala=${codigo}`);
      await expect(visita.locator('[data-entrar-mundo]')).toBeVisible({ timeout: 60_000 });
      await visita.waitForTimeout(800);
      await visita.screenshot({
        path: `capturas-temas/amigos-entrar-${tema}-${celular ? 'celular' : 'computador'}.jpg`,
        type: 'jpeg',
        quality: 80,
      });
      // alvos de toque de 44 px ou mais
      for (const sel of ['[data-entrar-mundo]', '[data-entrar-apelido]']) {
        const caixa = await visita.locator(sel).boundingBox();
        expect(caixa!.height).toBeGreaterThanOrEqual(44);
      }
      await visita.context().close();
    }
    await dono.context().close();
  }
});

test('lista de mundos: ligar e parar de jogar com amigos sem entrar no mundo', async ({
  browser,
}) => {
  test.setTimeout(600_000);
  const sufixo = Date.now().toString(36);
  const ana = await jogador(browser, `ana-lista-${sufixo}`, 'Ana');
  await ana.goto('/');
  await pronto(ana);
  // um bloco no mundo do aparelho, para conferir que ele vai e volta
  const cel = await ana.evaluate(() => {
    const e = window.__brumaluz!;
    const [x, y, z] = e.posicao!;
    const c = { x: Math.floor(x) + 2, y: Math.floor(y), z: Math.floor(z) };
    e.definirBloco!(c.x, c.y, c.z, 7);
    return c;
  });
  await ana.waitForTimeout(500);
  await ana.locator('[data-abrir-mundos]').click();
  await ana.locator('.cartao-mundo-item.atual [data-ligar-amigos]').click();
  const codigo = await ana
    .locator('[data-painel-amigos] [data-codigo-mundo]')
    .getAttribute('data-codigo-mundo', { timeout: 120_000 });
  expect(codigo).toMatch(/^[A-Z]+-[A-Z]+-\d\d$/);
  await ana.waitForFunction(({ x, y, z }) => window.__brumaluz!.bloco!(x, y, z) === 7, cel, {
    timeout: 60_000,
  });
  // volta ao começo (outro mundo do aparelho) e para pela lista, sem entrar no mundo
  await ana.goto('/');
  await pronto(ana);
  await ana.locator('[data-abrir-mundos]').click();
  const item = ana.locator('.cartao-mundo-item', { has: ana.locator('[data-selo-amigos]') });
  await expect(item).toHaveCount(1);
  await item.locator('[data-parar-amigos]').click();
  await ana.locator('[data-dialogo-confirmar]').click();
  await expect(ana.locator('[data-selo-amigos]')).toHaveCount(0, { timeout: 60_000 });
  // o mundo voltou com o bloco, e o código morreu
  const id = await ana
    .locator('.cartao-mundo-item', { has: ana.locator('[data-ligar-amigos]') })
    .first()
    .getAttribute('data-mundo');
  expect(id).toBeTruthy();
  const dani = await jogador(browser, `dani-lista-${sufixo}`, 'Dani');
  await dani.goto(`/?sala=${codigo}`);
  await expect(dani.locator('[data-tela-entrar]')).toContainText('Esse código não existe', {
    timeout: 60_000,
  });
});
