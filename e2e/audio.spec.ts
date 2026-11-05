import { expect, test, type Page } from '@playwright/test';

function coletarErros(page: Page): string[] {
  const erros: string[] = [];
  page.on('pageerror', (e) => erros.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') erros.push(`console.error: ${m.text()}`);
  });
  return erros;
}

async function abrir(page: Page): Promise<void> {
  await page.goto('/');
  await page.waitForFunction(() => window.__brumaluz?.ready === true, undefined, {
    timeout: 120_000,
  });
}

test('áudio: inativo antes do gesto e ativo ou bloqueado depois do clique', async ({ page }) => {
  test.setTimeout(240_000);
  const erros = coletarErros(page);
  await abrir(page);

  const antes = await page.evaluate(() => window.__brumaluz!.audio!);
  expect(antes.estado).toBe('inativo');
  expect(antes.vozes).toBe(0);

  await page.locator('.entrada').click();
  await expect
    .poll(() => page.evaluate(() => window.__brumaluz!.audio!.estado), { timeout: 10_000 })
    .toMatch(/^(ativo|bloqueado)$/);
  expect(erros, erros.join('\n')).toEqual([]);
});

test('rajada de 30 eventos respeita 64 partículas e 12 vozes', async ({ page }, testInfo) => {
  test.setTimeout(240_000);
  const erros = coletarErros(page);
  await abrir(page);
  await page.locator('.entrada').click();
  await expect
    .poll(() => page.evaluate(() => window.__brumaluz!.audio!.estado), { timeout: 10_000 })
    .toMatch(/^(ativo|bloqueado)$/);

  const r = await page.evaluate(async () => {
    const g = window.__brumaluz!;
    const quadro = () => new Promise((res) => requestAnimationFrame(() => res(null)));
    const p0 = g.posicao ?? [8, 45, 8];
    let maxPart = 0;
    let maxVozes = 0;
    const amostrar = () => {
      maxPart = Math.max(maxPart, g.fx!.particulas);
      maxVozes = Math.max(maxVozes, g.audio!.vozes);
    };
    for (let i = 0; i < 30; i++) {
      const dados = { x: Math.floor(p0[0]) + (i % 5), y: 30, z: Math.floor(p0[2]), bloco: 2 };
      g.barramento!.emitir(i % 2 === 0 ? 'quebra' : 'colocacao', dados);
      amostrar();
    }
    for (let i = 0; i < 20; i++) {
      await quadro();
      amostrar();
    }
    return { maxPart, maxVozes, fps: g.fps };
  });

  await testInfo.attach('desempenho-rajada', {
    body: JSON.stringify({ fps: r.fps, particulasMax: r.maxPart, vozesMax: r.maxVozes }, null, 2),
    contentType: 'application/json',
  });
  expect(r.maxPart).toBeGreaterThan(0);
  expect(r.maxPart).toBeLessThanOrEqual(64);
  expect(r.maxVozes).toBeLessThanOrEqual(12);
  expect(erros, erros.join('\n')).toEqual([]);
});
