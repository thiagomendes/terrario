import { expect, test } from '@playwright/test';

/**
 * Spec 012, D1: o bloco quebrado some no mesmo quadro do clique, antes da malha nova do chunk
 * chegar (com a CPU 4× mais lenta, como num celular, a malha leva centenas de ms).
 */
test('bloco quebrado some na hora, mesmo com a malha nova atrasada', async ({ page }) => {
  test.setTimeout(240_000);
  await page.setViewportSize({ width: 800, height: 600 });
  await page.goto('/');
  await page.waitForFunction(() => window.__brumaluz?.ready === true, undefined, {
    timeout: 180_000,
  });
  // o mundo novo começa com a barra vazia: o teste põe o kit de blocos
  await page.evaluate(() => window.__brumaluz!.darKit?.());
  await page.waitForFunction(() => !!window.__brumaluz!.inventario?.obter(1));
  await page.evaluate(() => {
    document.querySelector<HTMLElement>('.entrada')?.setAttribute('hidden', '');
    const e = window.__brumaluz!;
    e.pausarDia = true;
    e.hora = 0.45;
  });
  await page.waitForTimeout(3000);
  // um bloco bem na frente da câmera, olhando para ele
  const alvo = await page.evaluate(() => {
    const e = window.__brumaluz!;
    e.apontar!(0, 0.9);
    return e.alvo;
  });
  expect(alvo).toBeTruthy();
  await page.waitForTimeout(500);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  const r = await page.evaluate(async (a) => {
    const e = window.__brumaluz!;
    const antes = e.remalhasConcluidas ?? 0;
    e.definirBloco!(a!.x, a!.y, a!.z, 0);
    // no quadro seguinte o bloco já não está na mira (o desenho e a mira concordam)
    await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)));
    const remalhou = (e.remalhasConcluidas ?? 0) > antes;
    return { remalhou, oculto: e.blocosOcultos?.() ?? [] };
  }, alvo);
  // a malha nova ainda não tinha chegado, e o bloco já estava na lista dos que somem
  expect(r.remalhou).toBe(false);
  expect(r.oculto).toContainEqual([alvo!.x, alvo!.y, alvo!.z]);
  // quando a malha chega, sai da lista
  await page.waitForFunction(
    () => (window.__brumaluz!.blocosOcultos?.() ?? []).length === 0,
    undefined,
    {
      timeout: 20_000,
    },
  );
});
