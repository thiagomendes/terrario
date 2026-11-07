import { expect, test, type Page } from '@playwright/test';

/**
 * Pontos que o filho do dono achou jogando: trocar com o morador pelo toque sem bater
 * nele, segurar para comer, a porta inteira de uma vez, a barra de atalhos que não sobe
 * por cima dos avisos e a dica na mira.
 */
async function pronto(page: Page) {
  await page.waitForFunction(() => window.__brumaluz?.ready === true, undefined, {
    timeout: 180_000,
  });
}

async function mundoSobrevivencia(page: Page) {
  await page.goto('/');
  await pronto(page);
  await page.locator('[data-abrir-mundos]').click();
  await page.locator('[data-modo="sobrevivencia"]').click();
  await page.locator('[data-novo-nome]').fill('Ajustes');
  await page.locator('[data-criar-mundo]').click();
  await page.waitForURL(/mundo=/);
  await pronto(page);
  await page.evaluate(() => {
    document.querySelector('.entrada')?.setAttribute('hidden', '');
    const e = window.__brumaluz!;
    e.pausarDia = true;
    e.hora = 0.4;
  });
}

test('toque: o morador abre as trocas e não apanha; segurar com maçã come', async ({
  browser,
}) => {
  test.setTimeout(600_000);
  const ctx = await browser.newContext({
    viewport: { width: 1024, height: 600 },
    hasTouch: true,
  });
  const page = await ctx.newPage();
  const erros: string[] = [];
  page.on('pageerror', (e) => erros.push(String(e)));
  await mundoSobrevivencia(page);
  const p = await page.evaluate(() => window.__brumaluz!.povoados!()[0]);
  expect(p, 'nenhum povoado perto do nascimento').toBeTruthy();
  await page.evaluate((p) => window.__brumaluz!.teleportar!(p.cx + 2.5, p.cz + 2.5), p);
  await page.waitForFunction(
    () => (window.__brumaluz!.criaturas?.() ?? []).some((c) => c.tipo === 'morador'),
    undefined,
    { timeout: 150_000 },
  );
  // de frente para um morador, a 2 blocos, e um toque rápido
  const r = await page.evaluate(async () => {
    const e = window.__brumaluz!;
    let abriu = false;
    let dica = '';
    window.addEventListener('brumaluz:dicaMira', (ev) => {
      const t = String((ev as CustomEvent<string>).detail);
      if (t) dica = t;
    });
    for (let t = 0; t < 10 && !abriu; t++) {
      const m = (e.criaturas?.() ?? []).find((c) => c.tipo === 'morador')!;
      const [ex, , ez] = e.posicao!;
      const d = Math.hypot(m.x - ex, m.z - ez) || 1;
      e.teleportar!(m.x - ((m.x - ex) / d) * 2, m.z - ((m.z - ez) / d) * 2, m.y);
      await e.sincronizar?.();
      const [px, py, pz] = e.posicao!;
      const agora = (e.criaturas?.() ?? []).find((c) => c.id === m.id) ?? m;
      e.apontar!(
        Math.atan2(agora.x - px, agora.z - pz),
        -Math.atan2(agora.y + 1.1 - py, Math.hypot(agora.x - px, agora.z - pz)),
      );
      await new Promise((res) => setTimeout(res, 700));
      e.controleDireto!.tocar!();
      await new Promise((res) => setTimeout(res, 600));
      const painel = document.querySelector<HTMLElement>('[data-painel-trocas]');
      abriu = !!painel && !painel.hidden;
    }
    await e.sincronizar?.();
    const feridos = (e.criaturas?.() ?? []).filter(
      (c) => c.tipo === 'morador' && c.vida !== undefined && c.vida < 20,
    ).length;
    (window as any).__inventarioUI?.fechar();
    return { abriu, dica, feridos };
  });
  expect(r.abriu, 'o toque no morador abre as trocas').toBe(true);
  expect(r.feridos, 'nenhum morador apanhou').toBe(0);
  expect(r.dica).toMatch(/^Toque em .+ para trocar$/);
  await page.screenshot({ path: 'capturas-temas/ajuste-toque-morador.jpg', type: 'jpeg', quality: 80 });

  // com fome e uma maçã na mão: segurar come (e não quebra o chão)
  const comeu = await page.evaluate(async () => {
    const e = window.__brumaluz!;
    e.sobrevivencia!.dano(0);
    for (let i = 0; i < 75; i++) e.sobrevivencia!.pulo(true);
    await e.sincronizar?.();
    const fome0 = e.sobrevivencia!.estado.fome;
    e.inventario!.definir(0, { item: 'maca', qtd: 3 });
    e.selecionarSlot!(0);
    e.apontar!(0, 1.3); // olhando para o chão
    await e.sincronizar?.();
    const alvo = e.alvo;
    const blocoAntes = alvo ? e.bloco!(alvo.x, alvo.y, alvo.z) : -1;
    e.controleDireto!.mirar?.(512, 300);
    e.controleDireto!.quebrar(true);
    await new Promise((res) => setTimeout(res, 2000));
    e.controleDireto!.quebrar(false);
    e.controleDireto!.soltarMira?.();
    await e.sincronizar?.();
    return {
      fome0,
      fome1: e.sobrevivencia!.estado.fome,
      macas: e.inventario!.slots[0]?.qtd ?? 0,
      blocoIntacto: alvo ? e.bloco!(alvo.x, alvo.y, alvo.z) === blocoAntes : true,
    };
  });
  expect(comeu.fome0).toBeLessThan(20);
  expect(comeu.fome1).toBeGreaterThan(comeu.fome0);
  expect(comeu.macas).toBeLessThan(3);
  expect(comeu.blocoIntacto, 'segurar com comida não quebra o bloco').toBe(true);
  expect(erros).toEqual([]);
  await ctx.close();
});

test('porta: um clique põe as duas metades; sem espaço, avisa e não põe meia porta', async ({
  page,
}) => {
  test.setTimeout(300_000);
  await page.setViewportSize({ width: 1024, height: 600 });
  await page.goto('/');
  await pronto(page);
  const r = await page.evaluate(async () => {
    document.querySelector('.entrada')?.setAttribute('hidden', '');
    const e = window.__brumaluz!;
    const avisos: string[] = [];
    window.addEventListener('brumaluz:toast', (ev) => avisos.push(String((ev as CustomEvent).detail)));
    const [x, y, z] = e.posicao!;
    const fx = Math.floor(x);
    const fz = Math.floor(z);
    const fy = Math.floor(y);
    // chão firme 2 blocos à frente, com espaço livre em cima
    for (let dy = 0; dy < 4; dy++) e.definirBloco!(fx, fy + dy, fz + 2, 0);
    e.definirBloco!(fx, fy - 1, fz + 2, 3);
    e.inventario!.definir(0, { item: 'bloco:57', qtd: 5 });
    e.selecionarSlot!(0);
    const mirar = () => {
      const [px, py, pz] = e.posicao!;
      const dz = fz + 2.5 - pz;
      const dx = fx + 0.5 - px;
      e.apontar!(Math.atan2(dx, dz), -Math.atan2(fy - (py + 1.62), Math.hypot(dx, dz)));
    };
    mirar();
    await e.sincronizar?.();
    e.interagir!('colocar');
    await e.sincronizar?.();
    const inteira = [e.bloco!(fx, fy, fz + 2), e.bloco!(fx, fy + 1, fz + 2)];
    // de novo, agora com um bloco de pedra logo acima
    e.definirBloco!(fx, fy, fz + 2, 0);
    e.definirBloco!(fx, fy + 1, fz + 2, 3);
    await e.sincronizar?.();
    mirar();
    await e.sincronizar?.();
    e.interagir!('colocar');
    await e.sincronizar?.();
    return { inteira, semEspaco: e.bloco!(fx, fy, fz + 2), avisos };
  });
  expect(r.inteira).toEqual([57, 57]);
  expect(r.semEspaco).toBe(0);
  expect(r.avisos).toContain('A porta precisa de 2 blocos de altura');
});

for (const [w, h] of [
  [1024, 600],
  [800, 600],
  [1180, 640],
]) {
  test(`barra de atalhos em ${w}×${h} não cobre os avisos nem a missão`, async ({ page }) => {
    test.setTimeout(240_000);
    await page.setViewportSize({ width: w, height: h });
    await page.goto('/');
    await pronto(page);
    await page.evaluate(() => document.querySelector('.entrada')?.setAttribute('hidden', ''));
    await page.waitForTimeout(800);
    const r = await page.evaluate(() => {
      const barra = document.querySelector('.barra-atalhos')!.getBoundingClientRect();
      // o mais baixo dos avisos do canto de cima (missão incluída)
      let fundo = 0;
      for (const el of document.querySelectorAll<HTMLElement>('body *')) {
        const cs = getComputedStyle(el);
        if (cs.position !== 'fixed' || el.closest('.barra-atalhos')) continue;
        const b = el.getBoundingClientRect();
        if (b.width === 0 || b.left > 300 || b.top > 260 || b.height > 300) continue;
        fundo = Math.max(fundo, b.bottom);
      }
      return { topo: barra.top, fundo };
    });
    expect(r.topo).toBeGreaterThan(r.fundo);
    await page.screenshot({ path: `capturas-temas/ajuste-barra-${w}x${h}.jpg`, type: 'jpeg', quality: 75 });
  });
}
