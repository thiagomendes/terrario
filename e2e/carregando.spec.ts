import { expect, test, type Page } from '@playwright/test';

/**
 * O "Carregando o mundo…" do index.html (bicho do iPhone: a tela ficava azul e vazia ao abrir
 * um mundo). Aparece antes de qualquer JS, some quando o jogo mostra a tela dele em todo
 * caminho, e o vigia recarrega uma vez só; se ainda travar, mostra "Tentar de novo".
 */

const carregando = (p: Page) => p.locator('[data-carregando]');

test('aparece antes do jogo e some quando a tela de título aparece', async ({ page }) => {
  test.setTimeout(180_000);
  // segura o módulo do jogo: só o HTML puro, como no primeiro instante da página
  let soltar!: () => void;
  const segurar = new Promise<void>((r) => (soltar = r));
  await page.route(/\/(assets|src)\/.*\.(js|ts)(\?.*)?$/, async (rota) => {
    await segurar;
    await rota.continue();
  });
  await page.goto('/', { waitUntil: 'commit' });
  await expect(carregando(page)).toBeVisible();
  await expect(carregando(page)).toContainText('Carregando o mundo');
  soltar();
  await expect(page.locator('.entrada')).toBeVisible({ timeout: 120_000 });
  await expect(carregando(page)).toHaveCount(0, { timeout: 20_000 });
  // depois de abrir, a marca do vigia não fica na sessão
  expect(await page.evaluate(() => sessionStorage.getItem('terrario:vigia'))).toBeNull();
});

test('some também na entrada pelo link da sala', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('/?sala=LUA-COMETA-01');
  await expect(page.locator('[data-tela-entrar]')).toBeVisible({ timeout: 60_000 });
  await expect(carregando(page)).toHaveCount(0, { timeout: 20_000 });
});

test('o vigia recarrega uma vez só e depois mostra "Tentar de novo"', async ({ page }) => {
  test.setTimeout(120_000);
  // o defeito do WebKit, à força: o banco nunca responde
  await page.addInitScript(() => {
    const n = Number(sessionStorage.getItem('teste:aberturas') ?? '0') + 1;
    sessionStorage.setItem('teste:aberturas', String(n));
    const f = indexedDB as unknown as { open: unknown; databases: unknown };
    f.open = () => ({});
    f.databases = () => new Promise(() => undefined);
  });
  await page.goto('/?vigia=1500');
  const botao = page.locator('[data-tentar-de-novo]');
  await expect(botao).toBeVisible({ timeout: 30_000 });
  await expect(carregando(page)).toContainText('demorando');
  const aberturas = () => page.evaluate(() => Number(sessionStorage.getItem('teste:aberturas')));
  // a primeira abertura e uma recarga do vigia; nada de ciclo
  expect(await aberturas()).toBe(2);
  await page.waitForTimeout(4_000);
  expect(await aberturas()).toBe(2);
  await expect(botao).toBeVisible();
  // o botão tenta de novo (uma abertura a mais) e, ainda travado, volta ao botão
  await botao.click();
  await expect.poll(aberturas, { timeout: 20_000 }).toBe(3);
});

test('erro na abertura vira "Tentar de novo", nunca a tela vazia', async ({ page }) => {
  test.setTimeout(60_000);
  // sem WebGL: o 3D não monta
  await page.addInitScript(() => {
    HTMLCanvasElement.prototype.getContext = () => null;
  });
  await page.goto('/');
  await expect(page.locator('[data-tentar-de-novo]')).toBeVisible({ timeout: 30_000 });
  await expect(carregando(page)).toContainText('Algo travou');
});

test('voltar pelo navegador não devolve um mundo sem 3D', async ({ page }) => {
  test.setTimeout(240_000);
  await page.goto('/');
  await page.waitForFunction(() => window.__brumaluz?.ready === true, undefined, {
    timeout: 120_000,
  });
  // marca a página: se o navegador a devolver da memória (bfcache), ela tem de recarregar,
  // porque o 3D foi desmontado ao sair
  await page.evaluate(() => ((window as unknown as { __marca?: number }).__marca = 1));
  await page.goto('/manifest.webmanifest');
  await page.goBack();
  await page.waitForFunction(() => window.__brumaluz?.ready === true, undefined, {
    timeout: 120_000,
  });
  expect(await page.evaluate(() => (window as unknown as { __marca?: number }).__marca)).toBe(
    undefined,
  );
  await expect(carregando(page)).toHaveCount(0, { timeout: 20_000 });
});
