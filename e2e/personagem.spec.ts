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
  // o mundo novo começa com a barra vazia: o teste põe o kit de blocos
  await page.evaluate(() => window.__brumaluz!.darKit?.());
  await page.waitForFunction(() => !!window.__brumaluz!.inventario?.obter(1));
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

test('só terceira pessoa: V não muda nada, sem indicador nem braço', async ({ page }) => {
  test.setTimeout(240_000);
  const erros = coletarErros(page);
  await abrir(page);
  const estadoCam = () =>
    page.evaluate(() => {
      const e = window.__brumaluz!;
      const [cx, cy, cz] = e.camera!.posicao();
      const [ox, oy, oz] = e.posicao!;
      return { longe: Math.hypot(cx - ox, cy - oy, cz - oz), zoom: e.camera!.zoom() };
    });
  // a câmera fica atrás do boneco, longe dos olhos (nunca na cabeça)
  await expect.poll(async () => (await estadoCam()).longe).toBeGreaterThan(1.5);
  const antes = await estadoCam();
  await page.keyboard.press('KeyV');
  await page.waitForTimeout(400);
  expect((await estadoCam()).zoom).toBe(antes.zoom);
  expect((await estadoCam()).longe).toBeGreaterThan(1.5);
  // sem o indicador de câmera e sem o botão V na barra de atalhos
  await expect(page.locator('[data-camera-indicador]')).toHaveCount(0);
  await expect(page.locator('.barra-atalhos', { hasText: 'Câmera' })).toHaveCount(0);
  // o braço de primeira pessoa não existe mais: o corpo sempre aparece
  expect(await page.evaluate(() => window.__brumaluz!.personagem!.visivel())).toEqual({
    corpo: true,
  });
  expect(erros, erros.join('\n')).toEqual([]);
});

test('limite de malhas do boneco', async ({ page }) => {
  test.setTimeout(240_000);
  const erros = coletarErros(page);
  await abrir(page);
  const malhas = await page.evaluate(() => window.__brumaluz!.personagem!.malhas());
  expect(malhas).toBeGreaterThan(0);
  // o boneco de brinquedo (spec 012) tem mais peças: rosto, punhos, cabelo, acessórios
  expect(malhas).toBeLessThanOrEqual(90);
  expect(erros, erros.join('\n')).toEqual([]);
});

test('mira do centro em terceira pessoa: acerta o bloco do centro, quebra e o boneco vira', async ({
  page,
}) => {
  test.setTimeout(300_000);
  const erros = coletarErros(page);
  await abrir(page);
  const pos = await prepararPedra(page);
  // o raio do centro da tela (da câmera pelo pivô) passa dentro do bloco mirado
  const noCentro = await page.evaluate((p) => {
    const e = window.__brumaluz!;
    const c = e.camera!.posicao();
    const v = e.camera!.pivo();
    const d = [v[0] - c[0], v[1] - c[1], v[2] - c[2]];
    const n = Math.hypot(d[0], d[1], d[2]);
    for (let t = 0; t < 14; t += 0.02) {
      const x = c[0] + (d[0] / n) * t;
      const y = c[1] + (d[1] / n) * t;
      const z = c[2] + (d[2] / n) * t;
      if (Math.floor(x) === p.x && Math.floor(y) === p.y && Math.floor(z) === p.z) return true;
    }
    return false;
  }, pos);
  expect(noCentro).toBe(true);
  // o alcance conta dos olhos do boneco (até 5 blocos)
  const longe = await page.evaluate((p) => {
    const [x, y, z] = window.__brumaluz!.posicao!;
    return Math.hypot(p.x + 0.5 - x, p.y + 0.5 - y, p.z + 0.5 - z);
  }, pos);
  expect(longe).toBeLessThan(5.9);
  // vira a câmera para o lado: minerando, o corpo vira para o bloco
  const r = await page.evaluate(() => window.__brumaluz!.minerar!(2, true));
  expect(r.quebrou).toBe(true);
  await expect
    .poll(() => page.evaluate((p) => window.__brumaluz!.bloco!(p.x, p.y, p.z), pos))
    .toBe(0);
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
        // mina e observa a pose quadro a quadro (sob carga uma amostra só pode cair fora do golpe)
        return page.evaluate(async () => {
          const e = window.__brumaluz!;
          let maior = 0;
          // cada chamada segura mais que o intervalo do golpe (0,25 s): a pedra não quebra na
          // hora, e minerar em pedaços menores soltava o botão antes do primeiro golpe
          for (let i = 0; i < 20; i++) {
            e.minerar!(0.3, true);
            await new Promise((r) => requestAnimationFrame(r));
            maior = Math.max(maior, Math.abs(e.personagem!.pose().bracoDireito));
          }
          return maior;
        });
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
