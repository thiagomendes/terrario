import { expect, test, type Page } from '@playwright/test';

const CAMPOS = [
  'modelo',
  'pele',
  'cabeloEstilo',
  'cabeloCor',
  'roupaEstilo',
  'roupaCor',
  'calcaCor',
  'acessorio',
];
const CHAVE = 'brumaluz:aparencia';

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
}

const aparencia = (page: Page) => page.evaluate(() => window.__brumaluz!.personagem!.aparencia());
const botao = (page: Page, campo: string, valor: string) =>
  page.locator(`[data-painel-personagem] button[data-campo="${campo}"][data-valor="${valor}"]`);

test('painel tem todos os campos na tela de entrada', async ({ page }) => {
  test.setTimeout(240_000);
  const erros = coletarErros(page);
  await abrir(page);
  await expect(page.locator('[data-painel-personagem]')).toBeVisible();
  await expect(page.locator('[data-painel-personagem] [data-campo="nome"]')).toBeVisible();
  for (const campo of CAMPOS) {
    const total = await page
      .locator(`[data-painel-personagem] button[data-campo="${campo}"]`)
      .count();
    expect(total, campo).toBeGreaterThan(1);
  }
  expect(erros, erros.join('\n')).toEqual([]);
});

test('escolhas no painel mudam a aparência e persistem após recarregar', async ({ page }) => {
  test.setTimeout(300_000);
  const erros = coletarErros(page);
  await abrir(page);
  const antes = await aparencia(page);

  await botao(page, 'modelo', 'musgueira').click();
  await botao(page, 'pele', '3').click();
  await botao(page, 'cabeloCor', '2').click();
  await botao(page, 'roupaCor', '2').click();
  await botao(page, 'calcaCor', '1').click();
  await botao(page, 'acessorio', 'capuz').click();
  await page.locator('[data-campo="nome"]').fill('Luzia');

  await expect(botao(page, 'pele', '3')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-nome-jogador]')).toHaveText('Luzia');
  const depois = await aparencia(page);
  expect(depois).not.toEqual(antes);
  expect(depois).toMatchObject({
    modelo: 'musgueira',
    pele: 3,
    cabeloCor: 2,
    roupaCor: 2,
    calcaCor: 1,
    acessorio: 'capuz',
    nome: 'Luzia',
  });
  const salvo = await page.evaluate((c) => window.localStorage.getItem(c), CHAVE);
  expect(JSON.parse(salvo!).versao).toBe(1);

  await abrir(page);
  expect(await aparencia(page)).toEqual(depois);
  await expect(page.locator('[data-nome-jogador]')).toHaveText('Luzia');
  await expect(botao(page, 'pele', '3')).toHaveAttribute('aria-pressed', 'true');
  expect(erros, erros.join('\n')).toEqual([]);
});

test('dado corrompido ou localStorage indisponível usa a aparência padrão', async ({ browser }) => {
  test.setTimeout(300_000);
  const base = await browser.newPage();
  const errosBase = coletarErros(base);
  await abrir(base);
  const padrao = await aparencia(base);
  expect(errosBase).toEqual([]);
  await base.close();

  const corrompido = await browser.newPage();
  const errosA = coletarErros(corrompido);
  await corrompido.addInitScript(
    ([c]) => window.localStorage.setItem(c, '{isso nao e json'),
    [CHAVE],
  );
  await abrir(corrompido);
  expect(await aparencia(corrompido)).toEqual(padrao);
  expect(errosA, errosA.join('\n')).toEqual([]);
  await corrompido.close();

  const indisponivel = await browser.newPage();
  const errosB = coletarErros(indisponivel);
  await indisponivel.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      get() {
        throw new DOMException('negado', 'SecurityError');
      },
    });
  });
  await abrir(indisponivel);
  expect(await aparencia(indisponivel)).toEqual(padrao);
  await botao(indisponivel, 'pele', '3').click();
  expect((await aparencia(indisponivel)).pele).toBe(3);
  expect(errosB, errosB.join('\n')).toEqual([]);
  await indisponivel.close();
});

test('tecla C reabre a entrada e digitar no painel não alterna a câmera', async ({ page }) => {
  test.setTimeout(240_000);
  const erros = coletarErros(page);
  await abrir(page);
  const entrada = page.locator('.entrada');
  const modo = () => page.evaluate(() => window.__brumaluz!.camera!.modo());
  await expect(entrada).toBeVisible();
  expect(await modo()).toBe('primeira');

  await page.locator('[data-campo="nome"]').click();
  await page.keyboard.type('Vavá 1M');
  await expect(page.locator('[data-campo="nome"]')).toHaveValue('Vavá 1M');
  expect(await modo()).toBe('primeira');

  // A barra de blocos fica por cima do botão em 1280x720, então o clique é despachado direto.
  await page.locator('[data-jogar]').dispatchEvent('click');
  await expect(entrada).toBeHidden();
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.keyboard.press('KeyC');
  await expect(entrada).toBeVisible();
  await expect(page.locator('[data-painel-personagem]')).toBeVisible();
  await page.locator('[data-campo="nome"]').focus();
  await page.keyboard.press('KeyV');
  expect(await modo()).toBe('primeira');
  expect(erros, erros.join('\n')).toEqual([]);
});
