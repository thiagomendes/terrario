import { expect, test, type Page } from '@playwright/test';

/**
 * Povoados (spec 008): o jogador chega a um povoado, encontra os moradores, abre a
 * tela de trocas mirando num deles e troca com o mouse e com o teclado.
 */
async function pronto(page: Page) {
  await page.waitForFunction(() => window.__brumaluz?.ready === true, undefined, {
    timeout: 150_000,
  });
}

/** Itens para qualquer troca de qualquer profissão. */
const ITENS: [string, number][] = [
  ['bloco:12', 30],
  ['carvao', 10],
  ['graveto', 10],
  ['ferro_bruto', 6],
  ['peixe_cru', 6],
  ['carne_crua', 6],
  ['bloco:10', 6],
  ['bloco:65', 2],
  ['frutinhas', 20],
  ['bloco:4', 8],
  ['bloco:3', 12],
  ['bloco:46', 8],
  ['bloco:7', 12],
];

test('povoado: moradores, tela de trocas com mouse e teclado', async ({ page }) => {
  test.setTimeout(420_000);
  const erros: string[] = [];
  page.on('pageerror', (e) => erros.push(String(e)));
  await page.setViewportSize({ width: 1280, height: 800 });
  // spec 034: no Doce Reino, de povoados com trocas (o "Meu primeiro mundo" era do Bruma e
  // Luz, que saiu; a Vila Neon, agora o padrão, não tem povoado perto do nascimento)
  await page.goto('/?tema=doce-reino');
  await pronto(page);
  await page.evaluate(() => {
    document.querySelector('.entrada')?.setAttribute('hidden', '');
    const e = window.__brumaluz!;
    e.pausarDia = true;
    e.hora = 0.4;
  });
  const p = await page.evaluate(() => window.__brumaluz!.povoados!()[0]);
  expect(p, 'nenhum povoado perto do nascimento').toBeTruthy();
  // o aviso de chegada é rápido: guarda o evento antes de chegar
  await page.evaluate(() => {
    const w = window as unknown as { __chegou?: string };
    window.addEventListener(
      'brumaluz:povoado',
      (e) => (w.__chegou = (e as CustomEvent<string>).detail),
    );
  });
  // vai para um canto da praça (o marco fica no meio)
  await page.evaluate((p) => window.__brumaluz!.teleportar!(p.cx + 2.5, p.cz + 2.5), p);
  // moradores aparecem um por casa quando o chão do povoado carrega
  await page.waitForFunction(
    (n) =>
      (window.__brumaluz!.criaturas?.() ?? []).filter((c) => c.tipo === 'morador').length === n,
    p.moradores,
    { timeout: 120_000 },
  );
  // chegou ao povoado: o aviso (e a missão do diário) disparam
  const chegou = await page
    .waitForFunction(
      (id) =>
        (window as unknown as { __chegou?: string }).__chegou === id ||
        /encontrou|chegou/i.test(document.querySelector('.toast-area')?.textContent ?? ''),
      p.id,
      { timeout: 60_000 },
    )
    .then(() => true)
    .catch(() => false);
  const info = await page.evaluate(() => ({
    chegou: (window as unknown as { __chegou?: string }).__chegou,
    pos: window.__brumaluz!.posicao,
  }));
  expect(
    chegou,
    `sem aviso de chegada: ${JSON.stringify(info)} povoado ${p.id} em ${p.cx},${p.cz}`,
  ).toBe(true);
  // dá os itens e mira no morador mais perto, chegando bem perto dele
  await page.evaluate((itens) => {
    for (const [i, q] of itens) window.__brumaluz!.inventario!.adicionar(i, q);
  }, ITENS);
  const abriu = await page.evaluate(async () => {
    const e = window.__brumaluz!;
    for (let tentativa = 0; tentativa < 20; tentativa++) {
      const [ex, ey, ez] = e.posicao!;
      // alterna entre os moradores (algum pode estar dentro de casa, atrás da parede)
      const todos = (e.criaturas?.() ?? [])
        .filter((c) => c.tipo === 'morador')
        .sort((a, b) => Math.hypot(a.x - ex, a.z - ez) - Math.hypot(b.x - ex, b.z - ez));
      const m = todos[tentativa % Math.max(1, todos.length)];
      if (!m) return false;
      // a 2 blocos do morador, olhando para o peito dele
      const d = Math.hypot(m.x - ex, m.z - ez) || 1;
      e.teleportar!(m.x - ((m.x - ex) / d) * 2, m.z - ((m.z - ez) / d) * 2, m.y);
      await new Promise((r) => setTimeout(r, 400));
      const [px, py, pz] = e.posicao!;
      const dx = m.x - px;
      const dy = m.y + 1.1 - py;
      const dz = m.z - pz;
      e.mirarPonto!(px + dx, py + dy, pz + dz);
      await new Promise((r) => setTimeout(r, 400));
      e.controleDireto!.usar();
      await new Promise((r) => setTimeout(r, 300));
      const painel = document.querySelector<HTMLElement>('[data-painel-trocas]');
      if (painel && !painel.hidden) return true;
    }
    return false;
  });
  expect(abriu, 'a tela de trocas não abriu ao usar o morador').toBe(true);
  const painel = page.locator('[data-painel-trocas]');
  await expect(painel).toBeVisible();
  const botoes = painel.locator('button.fazer');
  const n = await botoes.count();
  expect(n).toBeGreaterThanOrEqual(3);
  // alvos grandes e rótulo para leitor de tela
  for (let i = 0; i < n; i++) {
    const b = await botoes.nth(i).boundingBox();
    expect(b!.height).toBeGreaterThanOrEqual(44);
    expect(await botoes.nth(i).getAttribute('aria-label')).toMatch(/receber/);
  }
  // retrato do inventário (uma troca 3 por 3 não muda o total, mas muda os itens)
  const contar = () => page.evaluate(() => JSON.stringify(window.__brumaluz!.inventario!.slots));
  // mouse: primeira troca
  const antes = await contar();
  await botoes.first().click();
  await page.waitForTimeout(300);
  expect(await contar()).not.toBe(antes);
  // teclado: segunda troca com Tab e Enter
  const meio = await contar();
  await botoes.nth(1).focus();
  await page.keyboard.press('Enter');
  await page.waitForTimeout(300);
  expect(await contar()).not.toBe(meio);
  // sem os itens: botão desabilitado
  await page.evaluate(() => {
    const inv = window.__brumaluz!.inventario!;
    for (let i = 0; i < inv.slots.length; i++) inv.definir(i, null);
  });
  await page.waitForTimeout(200);
  for (let i = 0; i < n; i++) await expect(botoes.nth(i)).toHaveAttribute('aria-disabled', 'true');
  // acionar uma troca sem itens (pelo teclado: o botão continua focável) mostra o aviso
  await botoes.first().focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.toast-area')).toContainText(/falta/i);
  await page.keyboard.press('Escape');
  await expect(painel).toBeHidden();
  expect(erros).toEqual([]);
});
