import { expect, test } from '@playwright/test';

async function pronto(page: import('@playwright/test').Page) {
  await page.waitForFunction(() => window.__brumaluz?.ready === true, undefined, {
    timeout: 120_000,
  });
}

test('edições, posição e hora sobrevivem a recarregar a página', async ({ page }) => {
  test.setTimeout(240_000);
  // spec 034: o "Meu primeiro mundo" na prévia do Doce Reino, de terreno natural no
  // nascimento (era do Bruma e Luz, que saiu; na Vila Neon, agora o padrão, o chão do bairro
  // é protegido e o bloco nem sai)
  await page.goto('/?tema=doce-reino');
  await pronto(page);
  await expect(page.locator('[data-mundo-atual]')).toContainText('Meu primeiro mundo');
  await page.evaluate(() => document.querySelector('.entrada')?.setAttribute('hidden', ''));
  await page.evaluate(() => window.__brumaluz!.apontar!(0, 1.2));
  await page.waitForFunction(() => {
    const r = window.__brumaluz!.rotacao;
    return !!r && Math.abs(r[0] - 1.2) < 1e-6 && window.__brumaluz!.alvo !== null;
  });
  const alvo = await page.evaluate(() => window.__brumaluz!.alvo);
  expect(alvo).not.toBeNull();
  const ok = await page.evaluate(() => window.__brumaluz!.interagir!('quebrar'));
  expect(ok).toBe(true);
  await page.evaluate(() => {
    window.__brumaluz!.pausarDia = true;
    window.__brumaluz!.hora = 0.61;
  });
  expect(await page.evaluate(() => window.__brumaluz!.salvar!(true))).toBe(true);

  await page.reload();
  await pronto(page);
  const bloco = await page.evaluate(({ x, y, z }) => window.__brumaluz!.bloco!(x, y, z), alvo!);
  expect(bloco).toBe(0);
  const hora = await page.evaluate(() => window.__brumaluz!.hora!);
  expect(hora).toBeGreaterThan(0.6);
  // o relógio volta a andar enquanto a página recarrega (WebGL por software é lento)
  expect(hora).toBeLessThan(0.7);
});

test('painel de mundos cria um mundo novo e abre nele', async ({ page }) => {
  test.setTimeout(240_000);
  await page.goto('/');
  await pronto(page);
  await page.locator('[data-abrir-mundos]').click();
  await expect(page.locator('[data-painel-mundos]')).toBeVisible();
  await expect(page.locator('[data-painel-mundos] [data-mundo]')).toHaveCount(1);
  await page.locator('[data-novo-nome]').fill('Ilha Teste');
  await page.locator('[data-novo-semente]').fill('99');
  await page.locator('[data-criar-mundo]').click();
  await page.waitForURL(/mundo=/);
  await pronto(page);
  await expect(page.locator('[data-mundo-atual]')).toContainText('Ilha Teste');
  expect(await page.evaluate(() => window.__brumaluz!.mundo!.semente)).toBe(99);
});
