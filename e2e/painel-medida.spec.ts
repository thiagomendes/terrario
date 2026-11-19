import { expect, test } from '@playwright/test';

/**
 * Spec 034 (T01): o painel de medida da janela, escondido nas Configurações. Cinco toques
 * seguidos no título "Configurações" abrem; quatro não. Em pé e deitado, cada medida aparece
 * na coluna da posição; o botão grande fecha.
 */
test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

const MEDIDAS = [
  'inner',
  'client',
  'vv',
  'vv-topo-escala',
  'screen',
  'dpr',
  'seguro',
  'modos',
  'app',
  'tamanho-canvas',
  'canvas',
  'canvas-pixels',
  'conteiner',
  'body',
  'html',
];

test('cinco toques no título das Configurações abrem o painel de medida', async ({ page }) => {
  test.setTimeout(480_000);
  const erros: string[] = [];
  page.on('pageerror', (e) => erros.push(String(e)));
  await page.goto('/');
  await page.waitForFunction(() => window.__brumaluz?.ready === true, undefined, {
    timeout: 240_000,
  });
  await page.locator('[data-abrir-config]').tap();
  const titulo = page.locator('[data-painel-config] header h2');
  await expect(titulo).toHaveText('Configurações');
  const painel = page.locator('[data-painel-medida]');

  // o toque de verdade no título chega como `pointerup` (o evento que o gesto conta)
  await page.evaluate(() => {
    const w = window as unknown as { __toques: number };
    w.__toques = 0;
    document
      .querySelector('[data-painel-config] header h2')!
      .addEventListener('pointerup', () => w.__toques++);
  });
  await titulo.tap();
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { __toques: number }).__toques))
    .toBe(1);
  await expect(painel).toHaveCount(0);

  // Os toques seguidos vão juntos: aqui, sem placa de vídeo, cada tap() do Playwright espera
  // um quadro do jogo e chega segundos depois do anterior (no aparelho são décimos)
  const tocar = (n: number) =>
    page.evaluate((n) => {
      const h = document.querySelector('[data-painel-config] header h2')!;
      for (let i = 0; i < n; i++)
        h.dispatchEvent(
          new PointerEvent('pointerup', { bubbles: true, isPrimary: true, pointerType: 'touch' }),
        );
    }, n);
  // quatro toques não abrem
  await page.waitForTimeout(1500);
  await tocar(4);
  await page.waitForTimeout(1500);
  await expect(painel).toHaveCount(0);

  // cinco seguidos abrem
  await tocar(5);
  await expect(painel).toBeVisible({ timeout: 10_000 });
  await expect(painel.getByRole('heading', { name: 'Medidas da janela' })).toBeVisible();
  for (const m of MEDIDAS)
    await expect(painel.locator(`[data-medida="${m}"][data-posicao="empe"]`)).not.toHaveText('');
  await expect(painel.locator('[data-medida="inner"][data-posicao="empe"]')).toHaveText(
    '390 × 844',
  );
  await expect(painel.locator('[data-medida="tamanho-canvas"][data-posicao="empe"]')).toHaveText(
    '390 × 844',
  );
  // no Chromium do teste não há área segura: os quatro lados são 0
  await expect(painel.locator('[data-medida="seguro"][data-posicao="empe"]')).toHaveText(
    '0 · 0 · 0 · 0',
  );
  await expect(painel.locator('[data-medida="modos"][data-posicao="empe"]')).toHaveText(
    'não existe · não · não',
  );
  await expect(painel.locator('[data-medida="canvas"][data-posicao="empe"]')).toContainText(
    '390 × 844',
  );
  // deitado ainda não foi medido
  await expect(painel.locator('[data-medida="inner"][data-posicao="deitado"]')).toHaveText('');
  await expect(painel).toContainText('Gire o aparelho para medir a outra posição.');
  await page.screenshot({ path: 'capturas-034/painel-medida-em-pe.png' });

  // gira: a coluna de deitado se enche e a de em pé guarda a última medida
  await page.setViewportSize({ width: 844, height: 390 });
  await expect(painel.locator('[data-medida="inner"][data-posicao="deitado"]')).toHaveText(
    '844 × 390',
    { timeout: 10_000 },
  );
  for (const m of MEDIDAS)
    await expect(painel.locator(`[data-medida="${m}"][data-posicao="deitado"]`)).not.toHaveText('');
  await expect(painel.locator('[data-medida="inner"][data-posicao="empe"]')).toHaveText(
    '390 × 844',
  );
  // a leitura do meio do giro (a janela já deitada, a tela ainda não) não entra na coluna
  await expect(painel.locator('[data-medida="screen"][data-posicao="empe"]')).toHaveText(
    '390 × 844',
  );
  await expect(painel).toContainText('As duas posições já foram medidas.');
  await page.screenshot({ path: 'capturas-034/painel-medida-deitado.png' });

  // o botão grande fecha; as Configurações continuam abertas
  await painel.getByRole('button', { name: 'Fechar', exact: true }).tap();
  await expect(painel).toBeHidden();
  await expect(page.locator('[data-painel-config]')).toBeVisible();
  expect(erros, erros.join('\n')).toEqual([]);
});
