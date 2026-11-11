import { expect, test, type Browser, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';

/**
 * Dar um item a um amigo, como no Minecraft: jogar no chão e o amigo pega. Na janela do
 * inventário, a área "Soltar no chão" (clicar ou arrastar até ela) e clicar ou arrastar para
 * fora da janela; no jogo, Q joga um e Ctrl+Q a pilha; no toque, segurar um espaço da barra.
 * O item sai para a frente do boneco e quem jogou não pega de volta logo. No mundo com
 * amigos, a Ana joga e a Bia pega.
 */
const PASTA = 'test-results/dar-item';
mkdirSync(PASTA, { recursive: true });

type Pt = { x: number; y: number };

const pronto = (p: Page) =>
  p.waitForFunction(() => window.__brumaluz?.ready === true, undefined, { timeout: 180_000 });

async function novaPagina(
  browser: Browser,
  id: string,
  apelido: string,
  toque: false | { width: number; height: number } = false,
): Promise<Page> {
  const ctx = await browser.newContext(
    toque
      ? { viewport: toque, hasTouch: true, isMobile: true }
      : { viewport: { width: 1280, height: 720 } },
  );
  await ctx.addInitScript(
    ([id, apelido]) => {
      HTMLElement.prototype.requestPointerLock = function () {
        return Promise.resolve();
      } as typeof HTMLElement.prototype.requestPointerLock;
      localStorage.setItem(
        'terrario:identidade',
        JSON.stringify({ id, chave: `chave-de-teste-${id}-0123456789abcdef`, apelido }),
      );
    },
    [id, apelido],
  );
  const p = await ctx.newPage();
  p.on('pageerror', (e) => console.log(`[${apelido}] erro: ${String(e)}`));
  return p;
}

async function mundoSobrevivencia(page: Page, nuvem: boolean) {
  await page.goto('/');
  await pronto(page);
  await page.locator('[data-abrir-mundos]').click();
  await page.locator('[data-modo="sobrevivencia"]').click();
  await page.locator('[data-novo-nome]').fill('Presentes');
  if (nuvem) await page.locator('[data-com-amigos]').check();
  await page.locator('[data-criar-mundo]').click();
  await page.waitForURL(nuvem ? /sala=/ : /mundo=/, { timeout: 60_000 });
  await pronto(page);
  await page.evaluate(() => {
    document.querySelector('.entrada')?.setAttribute('hidden', '');
    window.__brumaluz!.pausarDia = true;
  });
  await page.evaluate(() => window.__brumaluz!.darKit!());
  await expect
    .poll(() => page.evaluate(() => window.__brumaluz!.inventario!.contar('bloco:4')))
    .toBe(64);
}

const contar = (page: Page, item: string) =>
  page.evaluate((item) => window.__brumaluz!.inventario!.contar(item), item);
const noChao = (page: Page, item: string) =>
  page.evaluate(
    (item) =>
      window.__brumaluz!.itensNoChao!()
        .filter((i) => i.item === item)
        .reduce((t, i) => t + i.qtd, 0),
    item,
  );
const overlay = (page: Page) => page.evaluate(() => document.body.dataset.overlay ?? '');
const centro = async (page: Page, sel: string): Promise<Pt> => {
  const b = (await page.locator(sel).first().boundingBox())!;
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
};
const slot = (i: number) => `.inventario .slot-inv[data-indice="${i}"]`;
const ZONA = '[data-soltar-chao]';

async function arrastarMouse(page: Page, de: Pt, ate: Pt) {
  await page.mouse.move(de.x, de.y);
  await page.mouse.down();
  for (let i = 1; i <= 10; i++) {
    await page.mouse.move(de.x + ((ate.x - de.x) * i) / 10, de.y + ((ate.y - de.y) * i) / 10);
    await page.waitForTimeout(16);
  }
  await page.mouse.up();
}

async function dedo(page: Page) {
  const cdp = await page.context().newCDPSession(page);
  const toque = (type: string, p?: Pt) =>
    cdp.send('Input.dispatchTouchEvent', {
      type,
      touchPoints: p ? [{ x: p.x, y: p.y, id: 1, radiusX: 4, radiusY: 4, force: 1 }] : [],
    } as never);
  return {
    async arrastar(de: Pt, ate: Pt) {
      await toque('touchStart', de);
      const n = Math.max(2, Math.min(12, Math.ceil(Math.hypot(ate.x - de.x, ate.y - de.y) / 18)));
      for (let i = 1; i <= n; i++) {
        await toque('touchMove', {
          x: de.x + ((ate.x - de.x) * i) / n,
          y: de.y + ((ate.y - de.y) * i) / n,
        });
        await page.waitForTimeout(16);
      }
      await toque('touchEnd');
    },
    async segurar(p: Pt, ms: number) {
      await toque('touchStart', p);
      await page.waitForTimeout(ms);
      await toque('touchEnd');
    },
  };
}

/** O item caiu na frente do boneco (no sentido para onde o corpo olha). */
async function naFrente(page: Page, item: string) {
  return page.evaluate((item) => {
    const e = window.__brumaluz!;
    const yaw = e.camera!.yawCorpo();
    const [x, , z] = e.posicao!;
    const it = e.itensNoChao!().find((i) => i.item === item)!;
    const dx = it.x - x;
    const dz = it.z - z;
    const d = Math.hypot(dx, dz);
    return { d, frente: (dx * Math.sin(yaw) + dz * Math.cos(yaw)) / Math.max(d, 1e-6) };
  }, item);
}

test('computador: Soltar no chão, fora da janela, Q e Ctrl+Q', async ({ browser }) => {
  test.setTimeout(300_000);
  const page = await novaPagina(browser, 'dar-mouse-e2e', 'Teo');
  const erros: string[] = [];
  page.on('pageerror', (e) => erros.push(String(e)));
  await mundoSobrevivencia(page, false);
  await page.keyboard.press('KeyE');
  await expect.poll(() => overlay(page)).toBe('inventario');
  await expect(page.locator(ZONA)).toBeVisible();
  await expect(page.locator(ZONA)).toHaveText(/Soltar no chão/);

  // 1. pega a pilha; botão direito na área solta um; clique esquerdo, o resto
  const s0 = await centro(page, slot(0));
  await page.mouse.click(s0.x, s0.y);
  await expect(page.locator(`${ZONA}.pronto`)).toBeVisible();
  await page.screenshot({ path: `${PASTA}/zona-pronta.png` });
  const z = await centro(page, ZONA);
  await page.mouse.click(z.x, z.y, { button: 'right' });
  await expect.poll(() => noChao(page, 'bloco:1')).toBe(1);
  await page.mouse.click(z.x, z.y);
  await expect.poll(() => noChao(page, 'bloco:1')).toBe(64);
  expect(await contar(page, 'bloco:1')).toBe(0);
  await expect(page.locator(`${ZONA}.pronto`)).toHaveCount(0);

  // 2. arrastar até a área
  await arrastarMouse(page, await centro(page, slot(1)), z);
  await expect.poll(() => noChao(page, 'bloco:2')).toBe(64);
  expect(await contar(page, 'bloco:2')).toBe(0);

  // 3. com algo na mão, clicar fora da janela joga no chão (a janela fica aberta)
  const s2 = await centro(page, slot(2));
  await page.mouse.click(s2.x, s2.y);
  await page.mouse.click(30, 360);
  await expect.poll(() => noChao(page, 'bloco:3')).toBe(64);
  expect(await overlay(page)).toBe('inventario');
  // 4. arrastar para fora da janela também
  await arrastarMouse(page, await centro(page, slot(6)), { x: 30, y: 300 });
  await expect.poll(() => noChao(page, 'bloco:5')).toBe(64);
  expect(await overlay(page)).toBe('inventario');
  // 5. sem nada na mão, clicar fora fecha
  await page.mouse.click(30, 360);
  await expect.poll(() => overlay(page)).toBe('');

  // 6. Q joga um do que está na mão, para a frente do boneco
  await page.keyboard.press('Digit4');
  await page.keyboard.press('KeyQ');
  await expect.poll(() => noChao(page, 'bloco:4')).toBe(1);
  expect(await contar(page, 'bloco:4')).toBe(63);
  await page.waitForTimeout(800);
  const f = await naFrente(page, 'bloco:4');
  console.log(`item jogado: ${f.d.toFixed(2)} blocos, alinhamento ${f.frente.toFixed(2)}`);
  expect(f.frente).toBeGreaterThan(0.7);
  expect(f.d).toBeGreaterThan(1.5);
  await page.screenshot({ path: `${PASTA}/q-na-frente.png` });
  // quem jogou não pega de volta (nem logo, nem parado no lugar)
  await page.waitForTimeout(3000);
  expect(await contar(page, 'bloco:4')).toBe(63);
  // 7. Ctrl+Q joga a pilha
  await page.keyboard.press('Control+KeyQ');
  await expect.poll(() => contar(page, 'bloco:4')).toBe(0);
  await expect.poll(() => noChao(page, 'bloco:4')).toBe(64);
  // 8. andando até lá, pega de volta (passou o tempo)
  await page.evaluate(() => {
    const e = window.__brumaluz!;
    const it = e.itensNoChao!().find((i) => i.item === 'bloco:4')!;
    e.teleportar!(it.x, it.z);
  });
  await expect.poll(() => contar(page, 'bloco:4'), { timeout: 10_000 }).toBe(64);
  expect(erros).toEqual([]);
  await page.context().close();
});

test('celular: arrastar até Soltar no chão e para fora; segurar a barra joga um', async ({
  browser,
}) => {
  test.setTimeout(300_000);
  const page = await novaPagina(browser, 'dar-toque-e2e', 'Teo', { width: 390, height: 844 });
  const erros: string[] = [];
  page.on('pageerror', (e) => erros.push(String(e)));
  await mundoSobrevivencia(page, false);
  await page.evaluate(() => document.body.classList.add('toque-ativo'));
  const d = await dedo(page);
  await page.locator('[data-botao-mochila]').dispatchEvent('click');
  await expect.poll(() => overlay(page)).toBe('inventario');
  await expect(page.locator('.ajuda-inv-toque')).toContainText('Soltar no chão');

  await d.arrastar(await centro(page, slot(0)), await centro(page, ZONA));
  await expect.poll(() => noChao(page, 'bloco:1')).toBe(64);
  await d.arrastar(await centro(page, slot(1)), { x: 8, y: 30 });
  await expect.poll(() => noChao(page, 'bloco:2')).toBe(64);
  expect(await overlay(page)).toBe('inventario');
  await page.screenshot({ path: `${PASTA}/celular-inventario.png` });
  await page.keyboard.press('Escape');
  await expect.poll(() => overlay(page)).toBe('');

  // no jogo: segurar um espaço da barra joga um dele
  await d.segurar(await centro(page, '.barra [data-slot="3"]'), 800);
  await expect.poll(() => noChao(page, 'bloco:4')).toBe(1);
  expect(await contar(page, 'bloco:4')).toBe(63);
  expect(await page.evaluate(() => window.__brumaluz!.slotAtivo)).toBe(3);
  // tocar rápido só escolhe
  await d.segurar(await centro(page, '.barra [data-slot="4"]'), 60);
  await page.waitForTimeout(600);
  expect(await contar(page, 'bloco:7')).toBe(64);
  expect(await page.evaluate(() => window.__brumaluz!.slotAtivo)).toBe(4);
  expect(erros).toEqual([]);
  await page.context().close();
});

test('mundo com amigos: a Ana joga, a Bia pega', async ({ browser }) => {
  test.setTimeout(400_000);
  const ana = await novaPagina(browser, 'ana-dar-e2e', 'Ana');
  await mundoSobrevivencia(ana, true);
  const codigo = await ana
    .locator('[data-codigo-mundo]')
    .getAttribute('data-codigo-mundo', { timeout: 30_000 });
  await ana.keyboard.press('Escape');
  await expect.poll(() => overlay(ana)).toBe('');

  const bia = await novaPagina(browser, 'bia-dar-e2e', 'Bia');
  await bia.goto(`/?sala=${codigo}`);
  await bia.locator('[data-entrar-mundo]').click({ timeout: 60_000 });
  await pronto(bia);
  await bia.evaluate(() => {
    document.querySelector('.entrada')?.setAttribute('hidden', '');
  });
  await ana.waitForFunction(
    () => (window.__brumaluz!.outrosJogadores?.() ?? []).some((o) => o.apelido === 'Bia'),
    null,
    { timeout: 30_000 },
  );
  // a Bia fica uns 3 blocos na frente do boneco da Ana
  const alvo = await ana.evaluate(() => {
    const e = window.__brumaluz!;
    const yaw = e.camera!.yawCorpo();
    const [x, , z] = e.posicao!;
    return { x: x + Math.sin(yaw) * 3, z: z + Math.cos(yaw) * 3 };
  });
  await bia.evaluate(({ x, z }) => window.__brumaluz!.teleportar!(x, z), alvo);
  await bia.waitForTimeout(1500);
  const antesBia = await contar(bia, 'bloco:4');

  await ana.bringToFront();
  await ana.keyboard.press('Digit4');
  await ana.keyboard.press('KeyQ');
  await expect.poll(() => contar(ana, 'bloco:4')).toBe(63);
  await expect.poll(() => contar(bia, 'bloco:4'), { timeout: 15_000 }).toBe(antesBia + 1);
  await bia.screenshot({ path: `${PASTA}/bia-pegou.png` });
  // a Ana não ganhou de volta
  await ana.waitForTimeout(2500);
  expect(await contar(ana, 'bloco:4')).toBe(63);
  await ana.context().close();
  await bia.context().close();
});
