import { expect, test, type Browser, type Page } from '@playwright/test';

/**
 * Spec 017 (T04 e T05): a aba Fantasias do editor e a sugestão ao criar mundo, no computador
 * e no celular em pé. As capturas vão para FOTOS_FANTASIAS (ou test-results/screens).
 */
const PASTA = process.env.FOTOS_FANTASIAS ?? 'test-results/screens';
const GPU = !!process.env.E2E_GPU;

const TELAS = [
  { nome: 'desktop', viewport: { width: 1280, height: 720 }, toque: false },
  { nome: 'celular', viewport: { width: 390, height: 844 }, toque: true },
] as const;
type Tela = (typeof TELAS)[number];

async function novaPagina(browser: Browser, tela: Tela, testarSugestao = false) {
  const ctx = await browser.newContext({
    viewport: tela.viewport,
    hasTouch: tela.toque,
    isMobile: tela.toque,
  });
  if (testarSugestao)
    await ctx.addInitScript(() => localStorage.setItem('terrario:testar-sugestao', '1'));
  const page = await ctx.newPage();
  const erros: string[] = [];
  page.on('pageerror', (e) => erros.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') erros.push(`console.error: ${m.text()}`);
  });
  return { ctx, page, erros };
}

async function pronto(page: Page): Promise<void> {
  await page.waitForFunction(() => window.__brumaluz?.ready === true, undefined, {
    timeout: 150_000,
  });
}

const aparencia = (page: Page) => page.evaluate(() => window.__brumaluz!.personagem!.aparencia());
const painel = (page: Page) => page.locator('[data-painel-personagem]');
const carta = (page: Page, id: string) => painel(page).locator(`button[data-fantasia="${id}"]`);
const grupo = (page: Page, g: string) => painel(page).locator(`button[data-grupo-fantasia="${g}"]`);

async function semRolagemLateral(page: Page, onde: string): Promise<void> {
  const m = await page.evaluate(() => ({
    largura: document.documentElement.scrollWidth,
    janela: window.innerWidth,
  }));
  expect(m.largura, `rolagem lateral em ${onde}`).toBeLessThanOrEqual(m.janela);
}

/** Espera as fotos dos cartões à vista e tira a captura. */
async function foto(page: Page, nome: string, tela: Tela): Promise<void> {
  await semRolagemLateral(page, nome);
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${PASTA}/${nome}-${tela.nome}.png` });
}

/** Toca no cartão e mede quanto a prévia leva para receber a foto nova (ms). */
async function vestirMedindo(page: Page, id: string): Promise<number> {
  return page.evaluate(
    (id) =>
      new Promise<number>((resolve) => {
        const previa = document.querySelector<HTMLCanvasElement>('[data-previa-personagem]')!;
        const proto = CanvasRenderingContext2D.prototype;
        const original = proto.drawImage;
        const inicio = performance.now();
        proto.drawImage = function (this: CanvasRenderingContext2D, ...args: unknown[]) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (original as any).apply(this, args);
          if (this.canvas === previa) {
            proto.drawImage = original;
            resolve(performance.now() - inicio);
          }
        } as typeof original;
        document.querySelector<HTMLButtonElement>(`button[data-fantasia="${id}"]`)!.click();
      }),
    id,
  );
}

for (const tela of TELAS) {
  test(`aba Fantasias: vestir, nome pelo corpo, cor, tirar e vestir de novo (${tela.nome})`, async ({
    browser,
  }) => {
    test.setTimeout(360_000);
    const { ctx, page, erros } = await novaPagina(browser, tela);
    await page.goto('/');
    await pronto(page);
    await page.locator('[data-abrir-personagem]').click();
    await expect(painel(page)).toBeVisible();
    // começa como menina
    await painel(page).locator('button[data-campo="corpo"][data-valor="feminino"]').click();
    const antes = await aparencia(page);
    expect(antes.fantasia).toBeUndefined();

    // a aba Fantasias vem antes das peças e tem nome para leitor de tela
    const abaFantasias = painel(page).locator('[data-aba="fantasias"]');
    await expect(abaFantasias).toHaveAttribute('aria-label', 'Fantasias');
    await expect(painel(page).locator('.abas [data-aba]').first()).toHaveAttribute(
      'data-aba',
      'fantasias',
    );
    // fotos só de quem está à vista: os cartões dos heróis ainda não foram pedidos
    const larguraHeroi = () =>
      page.evaluate(
        () =>
          document.querySelector<HTMLCanvasElement>('button[data-fantasia="heroi-mata"] canvas')!
            .width,
      );
    expect(await larguraHeroi()).toBe(300);
    await abaFantasias.click();
    await expect(painel(page).locator('[data-aba-painel="fantasias"]')).toBeVisible();
    // três abas sempre na mesma ordem; abre na Realeza da primeira vez
    await expect(painel(page).locator('[data-grupo-fantasia]')).toHaveText([
      'Realeza',
      'Heróis',
      'Dos temas',
    ]);
    await expect(grupo(page, 'realeza')).toHaveAttribute('aria-selected', 'true');
    await expect(carta(page, 'realeza-estrelas')).toHaveText('Princesa das Estrelas');
    // botões grandes o bastante para dedinhos
    for (const sel of ['[data-aba="fantasias"]', '[data-grupo-fantasia="herois"]']) {
      const caixa = await painel(page).locator(sel).boundingBox();
      expect(caixa!.height, sel).toBeGreaterThanOrEqual(44);
      expect(caixa!.width, sel).toBeGreaterThanOrEqual(44);
    }
    expect((await carta(page, 'realeza-flores').boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await foto(page, 'fantasias-realeza', tela);

    // vestir: um toque, a prévia recebe a foto nova logo
    // cinco toques (um deles de volta numa que já tem foto); vale a mediana: o primeiro paga
    // o preparo dos materiais e, com outros testes juntos, a placa de vídeo é dividida
    const tempos: number[] = [];
    for (const id of [
      'realeza-flores',
      'realeza-mar',
      'realeza-neve',
      'realeza-flores',
      'realeza-estrelas',
    ])
      tempos.push(await vestirMedindo(page, id));
    tempos.sort((a, b) => a - b);
    console.log(`vestir (${tela.nome}): ${tempos.map((t) => t.toFixed(0)).join(', ')} ms`);
    if (tela.nome === 'desktop') expect(tempos[2]).toBeLessThan(GPU ? 100 : 400);
    await expect(carta(page, 'realeza-estrelas')).toHaveAttribute('aria-pressed', 'true');
    await expect(carta(page, 'realeza-flores')).toHaveAttribute('aria-pressed', 'false');
    expect((await aparencia(page)).fantasia).toEqual({ id: 'realeza-estrelas', cor: 0 });
    await expect(page.locator('.nome-previa')).toHaveText('Princesa das Estrelas');
    // o look de baixo continua o da criança
    const { fantasia: _f, ...debaixo } = await aparencia(page);
    expect(debaixo).toEqual(antes);
    await foto(page, 'fantasias-vestida', tela);

    // trocar o corpo: a fantasia continua e o nome vira o do príncipe
    await painel(page).locator('[data-aba="corpo"]').click();
    await painel(page).locator('button[data-campo="corpo"][data-valor="masculino"]').click();
    expect((await aparencia(page)).fantasia?.id).toBe('realeza-estrelas');
    await abaFantasias.click();
    await expect(carta(page, 'realeza-estrelas')).toHaveText('Príncipe das Estrelas');
    await expect(page.locator('.nome-previa')).toHaveText('Príncipe das Estrelas');
    const lookMenino = await aparencia(page);

    // cor principal num toque; só o cartão vestido ganha foto nova (antes, espera as fotos
    // do corpo novo saírem da fila)
    await page.waitForTimeout(2000);
    const fotosCartas = await page.evaluate(() => {
      const w = window as unknown as { __cartasDesenhadas: Set<HTMLCanvasElement> };
      w.__cartasDesenhadas = new Set();
      const proto = CanvasRenderingContext2D.prototype;
      const original = proto.drawImage;
      proto.drawImage = function (this: CanvasRenderingContext2D, ...args: unknown[]) {
        if (this.canvas.closest('.carta')) w.__cartasDesenhadas.add(this.canvas);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (original as any).apply(this, args);
      } as typeof original;
      return true;
    });
    expect(fotosCartas).toBe(true);
    const cores = painel(page).locator('[data-cor-fantasia]');
    await expect(cores).toHaveCount(4);
    await cores.nth(2).click();
    await expect(cores.nth(2)).toHaveAttribute('aria-pressed', 'true');
    expect((await aparencia(page)).fantasia).toEqual({ id: 'realeza-estrelas', cor: 2 });
    await page.waitForTimeout(600);
    const redesenhadas = await page.evaluate(() =>
      [
        ...(window as unknown as { __cartasDesenhadas: Set<HTMLCanvasElement> }).__cartasDesenhadas,
      ].map((c) => c.closest<HTMLElement>('.carta')!.dataset.fantasia),
    );
    expect(
      redesenhadas.every((id) => id === 'realeza-estrelas'),
      redesenhadas.join(),
    ).toBe(true);

    // peça que sai e volta (a capa curta do príncipe)
    const capa = painel(page).locator('[data-peca-fantasia="capa-curta"]');
    await expect(capa).toHaveAttribute('aria-pressed', 'true');
    await capa.click();
    await expect(capa).toHaveAttribute('aria-pressed', 'false');
    expect((await aparencia(page)).fantasia?.sem).toEqual(['capa-curta']);
    await capa.click();
    expect((await aparencia(page)).fantasia?.sem).toBeUndefined();
    await foto(page, 'fantasias-principe-cor', tela);

    // tirar a fantasia volta exatamente ao look de antes; "Vestir de novo" veste a mesma
    const tirar = painel(page).locator('[data-tirar-fantasia]');
    await expect(tirar).toHaveText('Tirar fantasia');
    await tirar.click();
    const { fantasia: _g, ...lookSem } = lookMenino;
    expect(await aparencia(page)).toEqual(lookSem);
    await expect(tirar).toHaveText('Vestir de novo');
    await expect(carta(page, 'realeza-estrelas')).toHaveAttribute('aria-pressed', 'false');
    await tirar.click();
    expect((await aparencia(page)).fantasia).toEqual({ id: 'realeza-estrelas', cor: 2 });
    await expect(tirar).toHaveText('Tirar fantasia');

    // outras abas: heróis e dos temas (com o tema deste mundo primeiro)
    await grupo(page, 'herois').click();
    await expect(carta(page, 'heroi-relampago')).toHaveText('Herói Relâmpago');
    await expect.poll(larguraHeroi).not.toBe(300);
    await foto(page, 'fantasias-herois', tela);
    await grupo(page, 'herois').focus();
    await page.keyboard.press('ArrowRight');
    await expect(grupo(page, 'temas')).toHaveAttribute('aria-selected', 'true');
    await expect(grupo(page, 'temas')).toBeFocused();
    const secoes = painel(page).locator('[data-cartas="temas"] .secao');
    await expect(secoes.first()).toHaveText('Do seu mundo · Bruma e Luz');
    await expect(
      painel(page).locator('[data-cartas="temas"] button.carta').first(),
    ).toHaveAttribute('data-fantasia', 'lanterneira');
    await foto(page, 'fantasias-temas', tela);

    // teclado: Enter no cartão veste
    await carta(page, 'cientista').focus();
    await page.keyboard.press('Enter');
    expect((await aparencia(page)).fantasia?.id).toBe('cientista');
    await grupo(page, 'realeza').click();
    await carta(page, 'realeza-estrelas').click();
    await cores.nth(2).click();

    // recarregar: a fantasia e a aba usada voltam
    await page.reload();
    await pronto(page);
    expect((await aparencia(page)).fantasia).toEqual({ id: 'realeza-estrelas', cor: 2 });
    await page.locator('[data-abrir-personagem]').click();
    await abaFantasias.click();
    await expect(grupo(page, 'realeza')).toHaveAttribute('aria-selected', 'true');
    await expect(carta(page, 'realeza-estrelas')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.nome-previa')).toHaveText('Príncipe das Estrelas');
    // escolher uma roupa por baixo tira a fantasia (a mudança aparece na hora)
    await painel(page).locator('[data-aba="roupa"]').click();
    await painel(page).locator('button[data-campo="roupaEstilo"][data-valor="3"]').click();
    const depois = await aparencia(page);
    expect(depois.fantasia).toBeUndefined();
    expect(depois.roupaEstilo).toBe(3);
    expect(erros, erros.join('\n')).toEqual([]);
    await ctx.close();
  });

  test(`sugestão de fantasia ao criar mundo: Agora não e Sim, sem repetir (${tela.nome})`, async ({
    browser,
  }) => {
    test.setTimeout(420_000);
    const { ctx, page, erros } = await novaPagina(browser, tela, true);
    await page.goto('/');
    await pronto(page);
    // o primeiro mundo do jogo não foi criado pela criança: sem sugestão
    await page.waitForTimeout(1500);
    await expect(page.locator('[data-sugestao-fantasia]')).toHaveCount(0);

    const criarRancho = async (nome: string) => {
      await page.locator('[data-abrir-mundos]').click();
      await page.locator('.cartao-tema[data-tema="rancho-alegre"]').click();
      await page.locator('[data-novo-nome]').fill(nome);
      await page.locator('[data-criar-mundo]').click();
      await page.waitForURL(/mundo=/);
      await pronto(page);
    };
    const dialogo = page.locator('[data-sugestao-fantasia]');

    // Agora não: fecha e não volta neste mundo
    await criarRancho('Rancho um');
    await expect(dialogo).toBeVisible({ timeout: 20_000 });
    await expect(dialogo.locator('h2')).toHaveText('Quer vestir a fantasia do Rancho Alegre?');
    await expect(dialogo.locator('[data-dialogo-confirmar]')).toHaveText('Sim');
    await expect(dialogo.locator('[data-dialogo-cancelar]')).toHaveText('Agora não');
    for (const b of ['[data-dialogo-confirmar]', '[data-dialogo-cancelar]'])
      expect((await dialogo.locator(b).boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await foto(page, 'sugestao-fantasia', tela);
    const antes = await aparencia(page);
    await dialogo.locator('[data-dialogo-cancelar]').click();
    await expect(dialogo).toHaveCount(0);
    expect(await aparencia(page)).toEqual(antes);
    await page.reload();
    await pronto(page);
    await page.waitForTimeout(2000);
    await expect(dialogo).toHaveCount(0);

    // Sim: veste a do tema e abre o editor em "Dos temas", com o tema do mundo primeiro
    await criarRancho('Rancho dois');
    await expect(dialogo).toBeVisible({ timeout: 20_000 });
    await dialogo.locator('[data-dialogo-confirmar]').click();
    await expect(dialogo).toHaveCount(0);
    const vestida = await aparencia(page);
    expect(vestida.fantasia).toEqual({ id: 'fazendeira', cor: 0 });
    await expect(painel(page)).toBeVisible();
    await expect(painel(page).locator('[data-aba="fantasias"]')).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await expect(grupo(page, 'temas')).toHaveAttribute('aria-selected', 'true');
    const cartas = painel(page).locator('[data-cartas="temas"] button.carta');
    await expect(cartas.first()).toHaveAttribute('data-fantasia', 'fazendeira');
    await expect(cartas.nth(1)).toHaveAttribute('data-fantasia', 'vaqueira');
    await expect(cartas.first().locator('.selo')).toHaveClass(/meu/);
    await expect(cartas.nth(2).locator('.selo')).not.toHaveClass(/meu/);
    await expect(painel(page).locator('[data-cartas="temas"] .secao').first()).toHaveText(
      'Do seu mundo · Rancho Alegre',
    );
    await expect(cartas.first()).toHaveAttribute('aria-pressed', 'true');
    await foto(page, 'sugestao-sim-dos-temas', tela);
    // não repete no mesmo mundo
    await page.reload();
    await pronto(page);
    await page.waitForTimeout(2000);
    await expect(dialogo).toHaveCount(0);
    expect((await aparencia(page)).fantasia?.id).toBe('fazendeira');

    // outro mundo do mesmo tema com a fantasia já vestida: nem pergunta
    await criarRancho('Rancho três');
    await page.waitForTimeout(2500);
    await expect(dialogo).toHaveCount(0);
    expect(erros, erros.join('\n')).toEqual([]);
    await ctx.close();
  });
}
