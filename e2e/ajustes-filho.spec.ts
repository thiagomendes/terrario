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
  // o mundo novo começa com a barra vazia: o teste põe o kit de blocos
  await page.evaluate(() => window.__brumaluz!.darKit?.());
  await page.waitForFunction(() => !!window.__brumaluz!.inventario?.obter(1));
}

/**
 * Spec 034: no Doce Reino, de povoado com trocas (era o "Meu primeiro mundo" do Bruma e Luz,
 * que saiu; na Vila Neon, agora o padrão, os moradores não trocam).
 */
async function mundoSobrevivencia(page: Page) {
  await page.goto('/');
  await pronto(page);
  await page.locator('[data-abrir-mundos]').click();
  await page.locator('.cartao-tema[data-tema="doce-reino"]').click();
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

test('toque: o morador abre as trocas e não apanha; segurar com maçã come', async ({ browser }) => {
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
      e.mirarPonto!(agora.x, agora.y + 1.1, agora.z);
      // no toque a dica segue o dedo: o dedo encosta no morador (como a criança faz)
      const pt = e.telaDoPonto!(agora.x, agora.y + 1.1, agora.z);
      if (pt) e.controleDireto!.mirar!(pt.x, pt.y);
      // a dica aparece com o dedo no morador (com 1 FPS pode levar uns segundos)
      for (let i = 0; i < 25 && !dica; i++) await new Promise((res) => setTimeout(res, 200));
      e.controleDireto!.tocar!();
      e.controleDireto!.soltarMira!();
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
  await page.screenshot({
    path: 'capturas-temas/ajuste-toque-morador.jpg',
    type: 'jpeg',
    quality: 80,
  });

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
    window.addEventListener('brumaluz:toast', (ev) =>
      avisos.push(String((ev as CustomEvent).detail)),
    );
    const espera = (ms: number) => new Promise((res) => setTimeout(res, ms));
    // de pé no chão, numa laje de pedra montada em volta
    const [x0, , z0] = e.posicao!;
    const fx = Math.floor(x0);
    const fz = Math.floor(z0);
    e.teleportar!(fx + 0.5, fz + 0.5);
    await espera(1500);
    const fy = Math.floor(e.posicao![1]);
    for (let dx = -1; dx <= 1; dx++)
      for (let dz = -1; dz <= 3; dz++) {
        e.definirBloco!(fx + dx, fy - 1, fz + dz, 3);
        for (let dy = 0; dy < 4; dy++) e.definirBloco!(fx + dx, fy + dy, fz + dz, 0);
      }
    e.teleportar!(fx + 0.5, fz + 0.5, fy);
    e.inventario!.definir(0, { item: 'bloco:57', qtd: 5 });
    e.selecionarSlot!(0);
    const alvos: string[] = [];
    const mirar = async (frente: number) => {
      const ok = () => {
        const a = e.alvo;
        return !!a && a.x === fx && a.y === fy - 1 && a.z === fz + frente;
      };
      // reaponta a cada tentativa (logo depois do teletransporte a posição ainda assenta)
      for (let i = 0; i < 40 && !ok(); i++) {
        // o centro da tela mira o topo do chão, na borda de perto (de cima e do lado do
        // ombro, a pedra em cima da porta tapa o meio do bloco: terceira pessoa, spec 015)
        e.mirarPonto!(fx + 0.5, fy - 0.05, fz + frente + 0.2);
        await espera(300);
      }
      const a = e.alvo;
      alvos.push(
        JSON.stringify({ a, p: e.posicao, piv: e.camera!.pivo(), rot: e.rotacao, fx, fy, fz, frente }),
      );
      return !!a && a.x === fx && a.y === fy - 1 && a.z === fz + frente;
    };
    const mirou1 = await mirar(1);
    e.interagir!('colocar');
    await e.sincronizar?.();
    const inteira = [e.bloco!(fx, fy, fz + 1), e.bloco!(fx, fy + 1, fz + 1)];
    // no mesmo lugar, agora com um bloco de pedra em cima
    e.definirBloco!(fx, fy, fz + 1, 0);
    e.definirBloco!(fx, fy + 1, fz + 1, 3);
    await e.sincronizar?.();
    const mirou2 = await mirar(1);
    e.interagir!('colocar');
    await e.sincronizar?.();
    return { alvos, mirou1, mirou2, inteira, semEspaco: e.bloco!(fx, fy, fz + 1), avisos };
  });
  expect(r.mirou1 && r.mirou2, `mirou o chão à frente ${r.alvos.join(' | ')}`).toBe(true);
  expect(r.inteira).toEqual([57, 57]);
  expect(r.semEspaco).toBe(0);
  expect(r.avisos).toContain('A porta precisa de 2 blocos de altura');
});

for (const [w, h] of [
  [1024, 600],
  [800, 600],
  [1180, 640],
]) {
  // spec 015 (opção C do menu): a barra de atalhos de baixo saiu; o botão da roda e a mochila
  // ficam no alto, dentro da tela, sem cobrir o minimapa nem um ao outro
  test(`menu do alto em ${w}×${h}: roda e mochila na tela, sem cobrir o minimapa`, async ({
    page,
  }) => {
    test.setTimeout(240_000);
    await page.setViewportSize({ width: w, height: h });
    await page.goto('/');
    await pronto(page);
    await page.evaluate(() => document.querySelector('.entrada')?.setAttribute('hidden', ''));
    await page.waitForTimeout(800);
    const r = await page.evaluate(() => {
      const caixa = (s: string) => document.querySelector(s)!.getBoundingClientRect();
      return {
        roda: caixa('[data-botao-roda]'),
        mochila: caixa('[data-botao-mochila]'),
        info: caixa('[data-hud-info]'),
        mini: caixa('[data-minimapa]'),
        barra: document.querySelector('.barra-atalhos'),
      };
    });
    const sobrepoe = (a: DOMRect, b: DOMRect) =>
      a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
    expect(r.barra).toBeNull();
    for (const b of [r.roda, r.mochila, r.info]) {
      expect(b.width).toBeGreaterThanOrEqual(44);
      expect(b.right).toBeLessThanOrEqual(w);
      expect(b.bottom).toBeLessThanOrEqual(h);
    }
    expect(sobrepoe(r.roda, r.info)).toBe(false);
    expect(sobrepoe(r.mochila, r.mini)).toBe(false);
    expect(r.mochila.top).toBeGreaterThanOrEqual(r.mini.bottom);
    await page.screenshot({
      path: `capturas-temas/ajuste-menu-${w}x${h}.jpg`,
      type: 'jpeg',
      quality: 75,
    });
  });
}

test('vidro: dá para ver o lado de fora de dentro de uma casa de pedra', async ({ page }) => {
  test.setTimeout(300_000);
  await page.setViewportSize({ width: 960, height: 540 });
  await page.goto('/');
  await pronto(page);
  await page.evaluate(async () => {
    document.querySelector('.entrada')?.setAttribute('hidden', '');
    const e = window.__brumaluz!;
    e.pausarDia = true;
    e.hora = 0.42;
    const [x, y, z] = e.posicao!;
    const [fx, fy, fz] = [Math.floor(x), Math.floor(y - 1.62), Math.floor(z)];
    for (let dx = -2; dx <= 2; dx++)
      for (let dz = -2; dz <= 2; dz++)
        for (let dy = 0; dy <= 3; dy++) {
          const borda = Math.abs(dx) === 2 || Math.abs(dz) === 2 || dy === 3;
          e.definirBloco!(fx + dx, fy + dy, fz + dz, borda ? 3 : 0);
        }
    for (let dx = -1; dx <= 1; dx++)
      for (let dy = 1; dy <= 2; dy++) e.definirBloco!(fx + dx, fy + dy, fz + 2, 36);
    e.apontar!(0, 0);
  });
  await page.waitForTimeout(8000);
  await page.screenshot({
    path: 'capturas-temas/ajuste-vidro-dentro.jpg',
    type: 'jpeg',
    quality: 80,
  });
});
