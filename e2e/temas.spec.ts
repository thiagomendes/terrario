import { expect, test, type Page } from '@playwright/test';
import { OUTROS_TEMAS, TEMAS_E2E } from './temas';

const TEMAS = OUTROS_TEMAS;

async function pronto(page: Page) {
  await page.waitForFunction(() => window.__brumaluz?.ready === true, undefined, {
    timeout: 150_000,
  });
}

test('mundo antigo (gravado sem tema, como antes do Terrário) abre como Bruma e Luz', async ({
  page,
}) => {
  test.setTimeout(300_000);
  await page.goto('/');
  await pronto(page);
  // cria um mundo Lunar e depois apaga o campo de tema no índice gravado no banco,
  // deixando o registro igual ao de um mundo salvo antes dos temas
  await page.locator('[data-abrir-mundos]').click();
  await page.locator('.cartao-tema[data-tema="exploracao-lunar"]').click();
  await page.locator('[data-novo-nome]').fill('Mundo de antes');
  await page.locator('[data-criar-mundo]').click();
  await page.waitForURL(/mundo=/);
  await pronto(page);
  expect(await page.evaluate(() => window.__brumaluz!.tema)).toBe('exploracao-lunar');
  const mexeu = await page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        const req = indexedDB.open('brumaluz', 1);
        req.onsuccess = () => {
          const db = req.result;
          const tx = db.transaction('kv', 'readwrite');
          const kv = tx.objectStore('kv');
          let n = 0;
          const cur = kv.openCursor();
          cur.onsuccess = () => {
            const c = cur.result;
            if (!c) return;
            const v = c.value;
            const lista = Array.isArray(v)
              ? v
              : typeof v === 'string' && v.startsWith('[')
                ? JSON.parse(v)
                : null;
            if (lista && lista.some((m: { tema?: string }) => m && m.tema)) {
              for (const m of lista) delete m.tema;
              c.update(typeof v === 'string' ? JSON.stringify(lista) : lista);
              n++;
            }
            c.continue();
          };
          tx.oncomplete = () => resolve(n);
        };
      }),
  );
  expect(mexeu, 'índice de mundos não encontrado no banco').toBe(1);
  await page.reload();
  await pronto(page);
  expect(await page.evaluate(() => window.__brumaluz!.tema)).toBe('bruma-e-luz');
  await expect(page.locator('[data-mundo-atual]')).toContainText('Mundo de antes');
  await expect(page.locator('[data-mundo-atual]')).toContainText('Bruma e Luz');
});

test('cartões de tema: grupo de opções com teclado e alvos grandes', async ({ page }) => {
  test.setTimeout(200_000);
  await page.goto('/');
  await pronto(page);
  await page.locator('[data-abrir-mundos]').click();
  const cartoes = page.locator('[data-painel-mundos] .cartao-tema');
  await expect(cartoes).toHaveCount(TEMAS_E2E.length);
  await expect(cartoes.first()).toHaveAttribute('aria-checked', 'true');
  for (let i = 0; i < TEMAS_E2E.length; i++) {
    const caixa = await cartoes.nth(i).boundingBox();
    expect(caixa!.height).toBeGreaterThanOrEqual(44);
    expect(caixa!.width).toBeGreaterThanOrEqual(44);
  }
  await cartoes.first().focus();
  await page.keyboard.press('ArrowRight');
  await expect(cartoes.nth(1)).toHaveAttribute('aria-checked', 'true');
  await expect(cartoes.nth(1)).toBeFocused();
  await page.keyboard.press('End');
  await expect(cartoes.nth(TEMAS_E2E.length - 1)).toHaveAttribute('aria-checked', 'true');
  await page.keyboard.press('ArrowRight');
  await expect(cartoes.nth(0)).toHaveAttribute('aria-checked', 'true');
  // só um marcado por vez
  await expect(page.locator('.cartao-tema[aria-checked="true"]')).toHaveCount(1);
});

test('vitrine do título abre a criação já com o tema mostrado', async ({ page }) => {
  test.setTimeout(200_000);
  await page.goto('/');
  await pronto(page);
  const vitrine = page.locator('[data-vitrine-temas]');
  await expect(vitrine).toBeVisible();
  // mouse em cima pausa o revezamento: o tema lido é o que vai ser clicado
  await vitrine.hover();
  const tema = await vitrine.getAttribute('data-tema');
  await vitrine.click();
  await expect(page.locator('[data-painel-mundos]')).toBeVisible();
  await expect(page.locator(`.cartao-tema[data-tema="${tema}"]`)).toHaveAttribute(
    'aria-checked',
    'true',
  );
});

for (const [id, nome] of TEMAS) {
  test(`cria, joga, salva e reabre um mundo ${nome}`, async ({ page }) => {
    test.setTimeout(420_000);
    const erros: string[] = [];
    page.on('pageerror', (e) => erros.push(String(e)));
    page.on('console', (m) => {
      if (m.type() === 'error') erros.push(m.text());
    });
    await page.goto('/');
    await pronto(page);
    await page.locator('[data-abrir-mundos]').click();
    await page.locator(`.cartao-tema[data-tema="${id}"]`).click();
    await page.locator('[data-novo-nome]').fill(`Teste ${nome}`);
    await page.locator('[data-criar-mundo]').click();
    await page.waitForURL(/mundo=/);
    await pronto(page);
    expect(await page.evaluate(() => window.__brumaluz!.tema)).toBe(id);
    await expect(page.locator('[data-mundo-atual]')).toContainText(nome);
    // joga: quebra o bloco mirado e salva
    await page.evaluate(() => document.querySelector('.entrada')?.setAttribute('hidden', ''));
    await page.evaluate(() => window.__brumaluz!.apontar!(0, 1.2));
    await page.waitForFunction(() => window.__brumaluz!.alvo !== null);
    const alvo = await page.evaluate(() => window.__brumaluz!.alvo);
    expect(await page.evaluate(() => window.__brumaluz!.interagir!('quebrar'))).toBe(true);
    expect(await page.evaluate(() => window.__brumaluz!.salvar!(true))).toBe(true);
    await page.reload();
    await pronto(page);
    expect(await page.evaluate(() => window.__brumaluz!.tema)).toBe(id);
    const b = await page.evaluate(({ x, y, z }) => window.__brumaluz!.bloco!(x, y, z), alvo!);
    expect(b).toBe(0);
    // nenhum nome do Bruma e Luz na interface do mundo (barra de itens e informações)
    const textoHud = await page.evaluate(
      () =>
        [...document.querySelectorAll('[aria-label], [title]')]
          // a tela de título fica de fora (a vitrine mostra todos os temas de propósito)
          .filter((e) => !e.closest('.entrada'))
          .map((e) => `${e.getAttribute('aria-label') ?? ''} ${e.getAttribute('title') ?? ''}`)
          .join(' ') +
        ' ' +
        (window.__brumaluz!.infoMundo ?? ''),
    );
    // e nos textos visíveis (avisos, barra, informações do mundo)
    // (a tela de título fica de fora: a vitrine mostra todos os temas de propósito)
    const visivel = await page.evaluate(() => {
      document.querySelector('.entrada')?.setAttribute('hidden', '');
      return document.body.innerText;
    });
    for (const p of ['bruma', 'luzita', 'musgo', 'retorcid', 'espectro'])
      expect(visivel.toLowerCase(), `vazou "${p}" na tela`).not.toContain(p);
    for (const p of ['bruma', 'luzita', 'musgo', 'retorcid', 'espectro'])
      expect(textoHud.toLowerCase(), `vazou "${p}"`).not.toContain(p);
    expect(erros.filter((e) => !/favicon|AudioContext/i.test(e))).toEqual([]);
  });
}
