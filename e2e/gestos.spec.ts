import { expect, test, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';

/**
 * Spec 015 (T04, critério 5): os 8 gestos. A roda abre com G (computador) e pelo botão da
 * roda no alto (Gestos, ou segurando o botão); com ela aberta, 1 a 8 escolhem; o boneco faz o gesto, o balão com o
 * ícone aparece em cima da cabeça; andar interrompe. O mundo responde: o morador perto acena
 * de volta e "chamar" traz o bicho criado e a raposa domada.
 */
const PASTA = 'test-results/gestos015';
mkdirSync(PASTA, { recursive: true });
const IDS = [
  'acenar',
  'cumprimentar',
  'chamar',
  'comemorar',
  'aplaudir',
  'dancar',
  'apontar',
  'sentar',
] as const;

async function pronto(page: Page) {
  await page.waitForFunction(() => window.__brumaluz?.ready === true, undefined, {
    timeout: 180_000,
  });
}

async function entrar(page: Page) {
  await page.goto('/');
  await pronto(page);
  await page.evaluate(() => {
    document.querySelector('.entrada')?.setAttribute('hidden', '');
    const e = window.__brumaluz!;
    e.pausarDia = true;
    e.hora = 0.42;
  });
}

/** Laje de pedra com ar em cima, em volta do jogador (campo limpo para as capturas). */
async function laje(page: Page, raio = 9) {
  return page.evaluate(async (raio) => {
    const e = window.__brumaluz!;
    const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));
    const [x0, , z0] = e.posicao!;
    const fx = Math.floor(x0);
    const fz = Math.floor(z0);
    e.teleportar!(fx + 0.5, fz + 0.5);
    await espera(1500);
    const fy = Math.floor(e.posicao![1]);
    for (let dx = -raio; dx <= raio; dx++)
      for (let dz = -raio; dz <= raio; dz++) {
        e.definirBloco!(fx + dx, fy - 1, fz + dz, 45);
        for (let dy = 0; dy < 5; dy++) e.definirBloco!(fx + dx, fy + dy, fz + dz, 0);
      }
    e.teleportar!(fx + 0.5, fz + 0.5, fy);
    await espera(600);
    await e.sincronizar!();
    return { fx, fy, fz };
  }, raio);
}

const local = (page: Page) => page.evaluate(() => window.__brumaluz!.gestos!.local());
const rodaAberta = (page: Page) => page.evaluate(() => window.__brumaluz!.gestos!.roda());

test('computador: G abre a roda, 1 a 8 escolhem, balão, andar interrompe; capturas', async ({
  page,
}) => {
  test.setTimeout(420_000);
  const erros: string[] = [];
  page.on('pageerror', (e) => erros.push(String(e)));
  await page.setViewportSize({ width: 1280, height: 720 });
  await entrar(page);
  await laje(page);
  await page.evaluate(() => window.__brumaluz!.apontar!(0, 0.25));
  await page.waitForTimeout(800);

  // G abre: 8 botões em volta do meio da tela
  const slot0 = await page.evaluate(() => window.__brumaluz!.slotAtivo);
  await page.keyboard.press('KeyG');
  await expect.poll(() => rodaAberta(page)).toBe(true);
  const botoes = page.locator('.roda.aberta button.ativo');
  await expect(botoes).toHaveCount(9); // 8 gestos e o Voltar no meio
  await page.waitForTimeout(350);
  const caixa = await botoes.first().boundingBox();
  expect(caixa!.width).toBeGreaterThanOrEqual(56);
  await page.screenshot({ path: `${PASTA}/roda-computador.png` });

  // 1 = acenar: o boneco acena e o balão aparece; a barra de itens não muda
  await page.keyboard.press('Digit1');
  await expect.poll(() => local(page)).toEqual({ gesto: 'acenar', balao: 'acenar' });
  expect(await page.evaluate(() => window.__brumaluz!.slotAtivo)).toBe(slot0);
  await expect.poll(() => rodaAberta(page)).toBe(false);
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${PASTA}/acenar-costas-computador.png` });
  // o balão some depois de 2 s; o gesto acaba sozinho
  await expect.poll(() => local(page), { timeout: 5000 }).toEqual({ gesto: null, balao: null });

  // fechada, os números voltam a ser da barra
  await page.keyboard.press('Digit3');
  await expect.poll(() => page.evaluate(() => window.__brumaluz!.slotAtivo)).toBe(2);
  expect((await local(page)).gesto).toBeNull();

  // Esc fecha; tocar fora fecha; e ela fecha sozinha
  await page.keyboard.press('KeyG');
  await expect.poll(() => rodaAberta(page)).toBe(true);
  await page.keyboard.press('Escape');
  await expect.poll(() => rodaAberta(page)).toBe(false);
  await page.keyboard.press('KeyG');
  await expect.poll(() => rodaAberta(page)).toBe(true);
  await page.mouse.click(40, 360);
  await expect.poll(() => rodaAberta(page)).toBe(false);
  await page.keyboard.press('KeyG');
  await expect.poll(() => rodaAberta(page)).toBe(true);
  await expect.poll(() => rodaAberta(page), { timeout: 9000 }).toBe(false);

  // o botão da roda no alto: Gestos, e clicar no gesto faz
  await page.locator('[data-botao-roda]').click();
  await expect.poll(() => rodaAberta(page)).toBe(true);
  await page.waitForTimeout(350);
  await page.locator('.roda.aberta button.ativo[data-item="gestos"]').click();
  await page.waitForTimeout(450);
  await page.locator('.roda.aberta button.ativo[data-item="dancar"]').click();
  await expect.poll(async () => (await local(page)).gesto).toBe('dancar');
  // andar interrompe
  await page.evaluate(() => window.__brumaluz!.controleDireto!.mover(1, 0));
  await expect.poll(async () => (await local(page)).gesto).toBeNull();
  await page.evaluate(() => window.__brumaluz!.controleDireto!.mover(0, 0));
  await page.waitForTimeout(1300);

  // sentar fica até andar
  expect(await page.evaluate(() => window.__brumaluz!.gestos!.fazer('sentar'))).toBe(true);
  await page.waitForTimeout(3500);
  expect((await local(page)).gesto).toBe('sentar');
  await page.evaluate(() => window.__brumaluz!.controleDireto!.mover(1, 0));
  await expect.poll(async () => (await local(page)).gesto).toBeNull();
  await page.evaluate(() => window.__brumaluz!.controleDireto!.mover(0, 0));
  // limite de repetição: dois seguidos, só o primeiro vale
  await page.waitForTimeout(1300);
  expect(
    await page.evaluate(() => [
      window.__brumaluz!.gestos!.fazer('aplaudir'),
      window.__brumaluz!.gestos!.fazer('comemorar'),
    ]),
  ).toEqual([true, false]);

  // capturas de cada gesto, de frente (o boneco virado para a câmera) e no meio do gesto
  await page.waitForTimeout(2200);
  await page.evaluate(() => window.__brumaluz!.personagem!.girarCorpo?.(Math.PI * 0.78));
  const meio: Record<string, number> = {
    acenar: 700,
    cumprimentar: 380,
    chamar: 700,
    comemorar: 520,
    aplaudir: 700,
    dancar: 900,
    apontar: 700,
    sentar: 1200,
  };
  for (const id of IDS) {
    await page.evaluate((id) => window.__brumaluz!.gestos!.fazer(id), id);
    await page.waitForTimeout(meio[id]);
    await page.screenshot({ path: `${PASTA}/gesto-${id}-computador.png` });
    // espera acabar (sentar: anda um tiquinho para levantar)
    if (id === 'sentar') {
      await page.evaluate(() => window.__brumaluz!.controleDireto!.mover(1, 0));
      await page.waitForTimeout(150);
      await page.evaluate(() => window.__brumaluz!.controleDireto!.mover(0, 0));
    }
    await page.waitForTimeout(3300 - meio[id]);
  }
  await page.evaluate(() => window.__brumaluz!.personagem!.girarCorpo?.(0));
  expect(erros).toEqual([]);
});

test('celular: segurar o botão da roda abre os gestos e o toque escolhe', async ({ browser }) => {
  test.setTimeout(300_000);
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await ctx.newPage();
  const erros: string[] = [];
  page.on('pageerror', (e) => erros.push(String(e)));
  await entrar(page);
  await page.evaluate(() => document.body.classList.add('toque-ativo'));
  await laje(page);
  await page.waitForTimeout(800);
  const botaoRoda = page.locator('[data-botao-roda]');
  await expect(botaoRoda).toBeVisible();
  const segurar = async () => {
    await botaoRoda.dispatchEvent('pointerdown', { pointerType: 'touch', isPrimary: true });
    await page.waitForTimeout(650);
    await botaoRoda.dispatchEvent('pointerup', { pointerType: 'touch', isPrimary: true });
    await botaoRoda.dispatchEvent('click');
  };
  await segurar();
  await expect.poll(() => rodaAberta(page)).toBe(true);
  await page.waitForTimeout(450);
  // botões grandes (alvo de toque) que cabem na tela
  for (const b of await page.locator('.roda.aberta button.ativo:not(.voltar)').all()) {
    const c = (await b.boundingBox())!;
    expect(c.width).toBeGreaterThanOrEqual(60);
    expect(c.x).toBeGreaterThanOrEqual(0);
    expect(c.x + c.width).toBeLessThanOrEqual(390);
  }
  await page.screenshot({ path: `${PASTA}/roda-celular.png` });
  await page.locator('.roda.aberta button.ativo[data-item="comemorar"]').tap();
  await expect.poll(() => local(page)).toEqual({ gesto: 'comemorar', balao: 'comemorar' });
  await expect.poll(() => rodaAberta(page)).toBe(false);
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${PASTA}/comemorar-celular.png` });
  // tocar fora fecha (e não mexe no mundo)
  await page.waitForTimeout(1200);
  await segurar();
  await expect.poll(() => rodaAberta(page)).toBe(true);
  await page.touchscreen.tap(30, 760);
  await expect.poll(() => rodaAberta(page)).toBe(false);
  expect(erros).toEqual([]);
  await ctx.close();
});

test('o morador perto acena de volta', async ({ page }) => {
  test.setTimeout(420_000);
  const erros: string[] = [];
  page.on('pageerror', (e) => erros.push(String(e)));
  await page.setViewportSize({ width: 1280, height: 720 });
  await entrar(page);
  const p = await page.evaluate(() => window.__brumaluz!.povoados!()[0]);
  expect(p, 'nenhum povoado perto do nascimento').toBeTruthy();
  await page.evaluate((p) => window.__brumaluz!.teleportar!(p.cx + 2.5, p.cz + 2.5), p);
  await page.waitForFunction(
    () => (window.__brumaluz!.criaturas?.() ?? []).some((c) => c.tipo === 'morador'),
    undefined,
    { timeout: 120_000 },
  );
  // chega a uns 4 blocos de um morador perto da praça (lugar aberto), olhando para ele
  let respondeu = false;
  for (let tentativa = 0; tentativa < 6 && !respondeu; tentativa++) {
    const alvo = await page.evaluate(
      async ({ cx, cz, tentativa }) => {
        const e = window.__brumaluz!;
        const m = e.criaturas!()
          .filter((c) => c.tipo === 'morador')
          .sort((a, b) => Math.hypot(a.x - cx, a.z - cz) - Math.hypot(b.x - cx, b.z - cz))[
          tentativa % 2
        ];
        const d = Math.hypot(cx - m.x, cz - m.z) || 1;
        const px = m.x + ((cx - m.x) / d) * 4;
        const pz = m.z + ((cz - m.z) / d) * 4;
        e.teleportar!(px, pz);
        await new Promise((r) => setTimeout(r, 900));
        // a câmera atrás do jogador, olhando o morador um pouco de lado (yaw: atan2(dx, dz))
        e.apontar!(Math.atan2(m.x - px, m.z - pz) + 0.35, 0.35);
        await e.sincronizar!();
        return m.id;
      },
      { cx: p.cx, cz: p.cz, tentativa },
    );
    await page.waitForTimeout(1300);
    await page.evaluate(() => window.__brumaluz!.gestos!.fazer('acenar'));
    respondeu = await page
      .waitForFunction(
        (id) =>
          window
            .__brumaluz!.gestos!.moradores()
            .some((m) => m.id === id && m.gesto === 'acenar' && m.balao === 'acenar'),
        alvo,
        { timeout: 4000 },
      )
      .then(() => true)
      .catch(() => false);
  }
  expect(respondeu).toBe(true);
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${PASTA}/morador-acena-de-volta-computador.png` });
  expect(erros).toEqual([]);
});

test('chamar traz o bicho criado e a raposa domada', async ({ page }) => {
  test.setTimeout(300_000);
  const erros: string[] = [];
  page.on('pageerror', (e) => erros.push(String(e)));
  await page.setViewportSize({ width: 1280, height: 720 });
  await entrar(page);
  const { fx, fy, fz } = await laje(page, 13);
  await page.evaluate(
    ({ fx, fy, fz }) => {
      const e = window.__brumaluz!;
      e.invocar!('cervo', fx + 10.5, fy, fz + 0.5, { criado: true });
      e.invocar!('raposa', fx - 9.5, fy, fz + 6.5, { domada: true });
      e.apontar!(Math.PI / 2, 0.3);
    },
    { fx, fy, fz },
  );
  await page.waitForTimeout(1500);
  const distancias = () =>
    page.evaluate(() => {
      const e = window.__brumaluz!;
      const [x, , z] = e.posicao!;
      const bichos = e.criaturas!().filter((c) => c.criado || c.domada);
      return bichos.map((c) => ({ tipo: c.tipo, d: Math.hypot(c.x - x, c.z - z) }));
    });
  const antes = await distancias();
  expect(antes.find((b) => b.tipo === 'cervo')!.d).toBeGreaterThan(6);
  await page.screenshot({ path: `${PASTA}/chamar-antes-computador.png` });
  expect(await page.evaluate(() => window.__brumaluz!.gestos!.fazer('chamar'))).toBe(true);
  await expect
    .poll(async () => (await distancias()).every((b) => b.d < 3.4), { timeout: 15_000 })
    .toBe(true);
  await page.screenshot({ path: `${PASTA}/chamar-depois-computador.png` });
  expect(erros).toEqual([]);
});
