import { expect, test, type Page } from '@playwright/test';

const PEDRA = 2;
const SLOT_PEDRA = 1;
const SLOT_OUTRO = 3;

function coletarErros(page: Page): string[] {
  const erros: string[] = [];
  page.on('pageerror', (e) => erros.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') erros.push(`console.error: ${m.text()}`);
  });
  return erros;
}

async function abrir(page: Page): Promise<void> {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');
  await page.waitForFunction(() => window.__brumaluz?.ready === true, undefined, {
    timeout: 120_000,
  });
  await page.evaluate(() => {
    document.querySelector<HTMLElement>('.entrada')?.setAttribute('hidden', '');
  });
}

async function apontar(page: Page, yaw: number, pitch: number): Promise<void> {
  await page.evaluate(([y, p]) => window.__brumaluz!.apontar!(y, p), [yaw, pitch]);
  await page.waitForFunction(
    ([y, p]) => {
      const r = window.__brumaluz!.rotacao;
      return !!r && Math.abs(r[0] - p) < 1e-6 && Math.abs(r[1] - y) < 1e-6;
    },
    [yaw, pitch],
  );
  await expect
    .poll(() => page.evaluate(() => window.__brumaluz!.alvo), { timeout: 30_000 })
    .not.toBeNull();
}

const modo = (page: Page) => page.evaluate(() => window.__brumaluz!.camera!.modo());
const indicador = (page: Page) => page.locator('[data-camera-indicador]').innerText();

// Coloca pedra na face apontada, mira nela de novo e devolve o alvo.
async function prepararPedra(page: Page) {
  await apontar(page, 0, 0.6);
  await page.evaluate((s) => window.__brumaluz!.selecionarSlot!(s), SLOT_PEDRA);
  const ok = await page.evaluate(() => window.__brumaluz!.interagir!('colocar'));
  expect(ok).toBe(true);
  await apontar(page, 0, 0.6);
  await expect
    .poll(() =>
      page.evaluate(() => {
        const a = window.__brumaluz!.alvo;
        return a ? window.__brumaluz!.bloco!(a.x, a.y, a.z) : -1;
      }),
    )
    .toBe(PEDRA);
  const a = await page.evaluate(() => window.__brumaluz!.alvo!);
  return { x: a.x, y: a.y, z: a.z };
}

test('KeyV alterna o modo e o indicador', async ({ page }) => {
  test.setTimeout(240_000);
  const erros = coletarErros(page);
  await abrir(page);
  expect(await modo(page)).toBe('primeira');
  expect(await indicador(page)).toContain('1ª pessoa');
  await page.keyboard.press('KeyV');
  await expect.poll(() => modo(page)).toBe('terceira');
  await expect.poll(() => indicador(page)).toContain('3ª pessoa');
  await page.keyboard.press('KeyV');
  await expect.poll(() => modo(page)).toBe('primeira');
  await expect.poll(() => indicador(page)).toContain('1ª pessoa');
  expect(erros, erros.join('\n')).toEqual([]);
});

test('visibilidade por modo e limite de malhas', async ({ page }) => {
  test.setTimeout(240_000);
  const erros = coletarErros(page);
  await abrir(page);
  const vis = () => page.evaluate(() => window.__brumaluz!.personagem!.visivel());
  expect(await vis()).toEqual({ braco: true, corpo: false });
  await page.keyboard.press('KeyV');
  await expect.poll(() => modo(page)).toBe('terceira');
  expect(await vis()).toEqual({ braco: false, corpo: true });
  const malhas = await page.evaluate(() => window.__brumaluz!.personagem!.malhas());
  expect(malhas).toBeGreaterThan(0);
  expect(malhas).toBeLessThanOrEqual(20);
  expect(erros, erros.join('\n')).toEqual([]);
});

test('alvo e quebra iguais nos dois modos', async ({ page }) => {
  test.setTimeout(300_000);
  const erros = coletarErros(page);
  await abrir(page);
  // o alvo vem dos olhos: é o mesmo nos dois modos (medido antes de editar o mundo)
  const alvos: { x: number; y: number; z: number }[] = [];
  await apontar(page, 0, 0.6);
  for (const m of ['primeira', 'terceira'] as const) {
    await page.evaluate((v) => window.__brumaluz!.camera!.definir(v), m);
    await expect.poll(() => modo(page)).toBe(m);
    const a = await page.evaluate(() => window.__brumaluz!.alvo!);
    alvos.push({ x: a.x, y: a.y, z: a.z });
  }
  expect(alvos[1]).toEqual(alvos[0]);
  for (const m of ['primeira', 'terceira'] as const) {
    await page.evaluate((v) => window.__brumaluz!.camera!.definir(v), m);
    await expect.poll(() => modo(page)).toBe(m);
    const pos = await prepararPedra(page);
    const r = await page.evaluate(() => window.__brumaluz!.minerar!(2, true));
    expect(r.quebrou, `modo ${m}`).toBe(true);
    await expect
      .poll(() => page.evaluate((p) => window.__brumaluz!.bloco!(p.x, p.y, p.z), pos))
      .toBe(0);
  }
  expect(erros, erros.join('\n')).toEqual([]);
});

test('pose neutra parado, muda ao minerar e mão acompanha o slot', async ({ page }) => {
  test.setTimeout(300_000);
  const erros = coletarErros(page);
  await abrir(page);
  const pose = () => page.evaluate(() => window.__brumaluz!.personagem!.pose());

  await expect
    .poll(async () => {
      const p = await pose();
      return Math.abs(p.bracoDireito) + Math.abs(p.bracoEsquerdo) + Math.abs(p.pernaDireita);
    })
    .toBeCloseTo(0, 5);

  let pedra = await prepararPedra(page);
  await expect
    .poll(
      async () => {
        const quebrado = await page.evaluate(
          (p) => window.__brumaluz!.bloco!(p.x, p.y, p.z) === 0,
          pedra,
        );
        if (quebrado) pedra = await prepararPedra(page);
        await page.evaluate(() => window.__brumaluz!.minerar!(0.05, true));
        return page.evaluate(() => Math.abs(window.__brumaluz!.personagem!.pose().bracoDireito));
      },
      { timeout: 60_000 },
    )
    .toBeGreaterThan(0.3);

  await page.evaluate((s) => window.__brumaluz!.selecionarSlot!(s), SLOT_PEDRA);
  await expect
    .poll(() => page.evaluate(() => window.__brumaluz!.personagem!.maoBloco()))
    .toBe(PEDRA);
  const antes = await page.evaluate(() => window.__brumaluz!.personagem!.maoBloco());
  await page.evaluate((s) => window.__brumaluz!.selecionarSlot!(s), SLOT_OUTRO);
  await expect
    .poll(() => page.evaluate(() => window.__brumaluz!.personagem!.maoBloco()))
    .not.toBe(antes);
  const outro = await page.evaluate(() => window.__brumaluz!.personagem!.maoBloco());
  expect(typeof outro).toBe('number');
  expect(erros, erros.join('\n')).toEqual([]);
});

test('definir muda a aparência', async ({ page }) => {
  test.setTimeout(240_000);
  const erros = coletarErros(page);
  await abrir(page);
  const antes = await page.evaluate(() => window.__brumaluz!.personagem!.aparencia());
  await page.evaluate(() =>
    window.__brumaluz!.personagem!.definir({ modelo: 'musgueira', pele: 3, roupaCor: 2 }),
  );
  const depois = await page.evaluate(() => window.__brumaluz!.personagem!.aparencia());
  expect(depois.modelo).toBe('musgueira');
  expect(depois.pele).toBe(3);
  expect(depois.roupaCor).toBe(2);
  expect(depois).not.toEqual(antes);
  expect(erros, erros.join('\n')).toEqual([]);
});
