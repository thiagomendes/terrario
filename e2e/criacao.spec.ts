import { expect, test, type Page } from '@playwright/test';

/**
 * Spec 013 (T03 e T04, critérios 3 e 7): criar bichos de verdade no Rancho Alegre, pelo mouse
 * no computador e pelo toque no celular. Segurar o trigo faz a vaca seguir; dar o trigo
 * solta corações e a vaca fica sendo criada, também depois de reabrir o mundo. À noite, a
 * coruja do Rancho é mansa: chega, pia e foge, e não machuca ninguém.
 */
async function pronto(page: Page) {
  await page.waitForFunction(() => window.__brumaluz?.ready === true, undefined, {
    timeout: 180_000,
  });
}

async function ranchoSobrevivencia(page: Page) {
  await page.goto('/');
  await pronto(page);
  await page.locator('[data-abrir-mundos]').click();
  await page.locator('.cartao-tema[data-tema="rancho-alegre"]').click();
  await page.locator('[data-modo="sobrevivencia"]').click();
  await page.locator('[data-novo-nome]').fill('Sítio');
  await page.locator('[data-criar-mundo]').click();
  await page.waitForURL(/mundo=/);
  await pronto(page);
  expect(await page.evaluate(() => window.__brumaluz!.tema)).toBe('rancho-alegre');
  await fecharEntrada(page);
}

async function fecharEntrada(page: Page) {
  await page.evaluate(() => {
    document.querySelector('.entrada')?.setAttribute('hidden', '');
    const e = window.__brumaluz!;
    e.pausarDia = true;
    e.hora = 0.4;
  });
}

/** Laje de pedra com ar em cima, em volta do jogador; devolve o centro e a altura dos pés. */
async function laje(page: Page) {
  return page.evaluate(async () => {
    const e = window.__brumaluz!;
    const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));
    const [x0, , z0] = e.posicao!;
    const fx = Math.floor(x0);
    const fz = Math.floor(z0);
    e.teleportar!(fx + 0.5, fz + 0.5);
    await espera(1500);
    const fy = Math.floor(e.posicao![1]);
    for (let dx = -7; dx <= 7; dx++)
      for (let dz = -7; dz <= 7; dz++) {
        e.definirBloco!(fx + dx, fy - 1, fz + dz, 45);
        for (let dy = 0; dy < 4; dy++) e.definirBloco!(fx + dx, fy + dy, fz + dz, 0);
      }
    e.teleportar!(fx + 0.5, fz + 0.5, fy);
    await espera(500);
    await e.sincronizar!();
    return { fx, fy, fz };
  });
}

/** Segurar o trigo, a vaca vir atrás, dar o trigo (clique direito ou toque). */
async function vaca(page: Page, toque: boolean) {
  const { fx, fy, fz } = await laje(page);
  return page.evaluate(
    async ({ toque, fx, fy, fz }) => {
      const e = window.__brumaluz!;
      const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));
      const dicas: string[] = [];
      const avisos: string[] = [];
      const eventos: string[] = [];
      window.addEventListener('brumaluz:dicaMira', (ev) =>
        dicas.push(String((ev as CustomEvent).detail ?? '')),
      );
      window.addEventListener('brumaluz:toast', (ev) =>
        avisos.push(String((ev as CustomEvent).detail)),
      );
      window.addEventListener('brumaluz:criou', () => eventos.push('criou'));
      const bichos = () => e.criaturas!().filter((c) => c.tipo === 'cervo');
      /**
       * Mira na vaca até aparecer a dica esperada (a vaca anda e, com a máquina ocupada, os
       * quadros demoram): reaponta para onde ela está a cada 0,3 s, até 8 s.
       */
      const mirarEm = async (id: number, quer: (d: string) => boolean) => {
        const n = dicas.length;
        for (let i = 0; i < 26; i++) {
          const c = e.criaturas!().find((b) => b.id === id)!;
          const [px, py, pz] = e.posicao!;
          const ty = c.y + 0.8;
          e.apontar!(
            Math.atan2(c.x - px, c.z - pz),
            -Math.atan2(ty - py, Math.hypot(c.x - px, c.z - pz)),
          );
          await espera(150);
          if (toque) e.controleDireto!.mirar!(innerWidth / 2, innerHeight / 2);
          await espera(150);
          // a dica olha a mira a cada 0,25 s
          if (i >= 2 && dicas.slice(n).some(quer)) break;
        }
      };
      const r: Record<string, unknown> = {};
      // a mão vazia, a vaca logo ali na frente: a dica ensina a segurar o trigo
      e.selecionarSlot!(3);
      const antes = new Set(bichos().map((c) => c.id));
      e.invocar!('cervo', fx + 0.5, fy, fz + 2.6);
      let id = -1;
      for (let i = 0; i < 40 && id < 0; i++) {
        await espera(100);
        // a que nasceu onde foi invocada (no Rancho, a vaca do curral de um sítio perto ou
        // uma que nasce sozinha também é nova, mas está longe)
        id =
          bichos().find(
            (c) => !antes.has(c.id) && Math.hypot(c.x - (fx + 0.5), c.z - (fz + 2.6)) < 1.5,
          )?.id ?? -1;
      }
      r.nasceu = id > 0;
      await mirarEm(id, (d) => d.startsWith('Segure'));
      // a vaca pode dar um passo para fora da mira: vale a dica que apareceu mirando nela
      r.dicaSeguir = dicas.find((d) => d.startsWith('Segure'));
      // o jogador fica a uns 5 blocos da vaca (ela passeou enquanto a dica aparecia: conta
      // de onde ela está agora, dentro da laje) e pega o trigo: ela vem e para a uns 2 blocos
      {
        const v0 = e.criaturas!().find((c) => c.id === id)!;
        let melhor: [number, number] = [fx + 0.5, fz - 4.5];
        let erro = Infinity;
        for (let dx = -6; dx <= 6; dx++)
          for (let dz = -6; dz <= 6; dz++) {
            const d = Math.hypot(fx + dx + 0.5 - v0.x, fz + dz + 0.5 - v0.z);
            if (Math.abs(d - 5) < erro) {
              erro = Math.abs(d - 5);
              melhor = [fx + dx + 0.5, fz + dz + 0.5];
            }
          }
        e.teleportar!(melhor[0], melhor[1], fy);
      }
      e.inventario!.definir(0, { item: 'trigo', qtd: 5 });
      e.selecionarSlot!(0);
      await e.sincronizar!();
      await espera(6000);
      const v = e.criaturas!().find((c) => c.id === id)!;
      const [px, , pz] = e.posicao!;
      r.distSeguindo = Math.hypot(v.x - px, v.z - pz);
      r.estadoSeguindo = v.estado;
      // dar o trigo
      await mirarEm(id, (d) => d.includes(' dar '));
      r.dicaDar = dicas.filter((d) => d.includes(' dar ')).at(-1);
      toque ? e.controleDireto!.tocar!() : e.controleDireto!.usar!();
      let coracoes = 0;
      for (let i = 0; i < 20; i++) {
        await espera(50);
        coracoes = Math.max(coracoes, e.coracoes?.() ?? 0);
      }
      await e.sincronizar!();
      if (toque) e.controleDireto!.soltarMira?.();
      r.coracoes = coracoes;
      r.criado = e.criaturas!().find((c) => c.id === id)?.criado;
      r.trigo = e.inventario!.contar('trigo');
      r.eventos = [...eventos];
      r.avisos = [...avisos];
      // solta o trigo: ela para e fica em casa
      e.selecionarSlot!(3);
      await espera(2000);
      r.estadoSolta = e.criaturas!().find((c) => c.id === id)?.estado;
      return r;
    },
    { toque, fx, fy, fz },
  );
}

function conferir(r: Record<string, unknown>, toque: boolean) {
  expect(r.nasceu).toBe(true);
  expect(r.dicaSeguir).toBe('Segure feixe de trigo para a vaca malhada seguir você');
  expect(r.estadoSeguindo).toBe('seguir');
  expect(r.distSeguindo as number).toBeLessThan(3.2);
  expect(r.dicaDar).toBe(
    toque
      ? 'Toque para dar feixe de trigo à vaca malhada'
      : 'Clique direito (ou F): dar feixe de trigo à vaca malhada',
  );
  expect(r.coracoes as number).toBeGreaterThan(0);
  expect(r.criado).toBe(true);
  expect(r.trigo).toBe(4);
  expect(r.eventos).toEqual(['criou']);
  expect(r.avisos).toContain('Vaca malhada virou seu bichinho!');
  expect(r.estadoSolta).not.toBe('seguir');
}

async function criadosDepoisDeReabrir(page: Page) {
  expect(await page.evaluate(() => window.__brumaluz!.salvar!(true))).toBe(true);
  await page.reload();
  await pronto(page);
  await fecharEntrada(page);
  await page.waitForFunction(() =>
    (window.__brumaluz!.criaturas?.() ?? []).some((c) => c.tipo === 'cervo' && c.criado),
  );
  return page.evaluate(
    () => window.__brumaluz!.criaturas!().filter((c) => c.tipo === 'cervo' && c.criado).length,
  );
}

test('criação no computador: a vaca segue o trigo, ganha o trigo e fica sendo sua', async ({
  page,
}) => {
  test.setTimeout(400_000);
  const erros: string[] = [];
  page.on('pageerror', (e) => erros.push(String(e)));
  await page.setViewportSize({ width: 1024, height: 600 });
  await ranchoSobrevivencia(page);
  const r = await vaca(page, false);
  conferir(r, false);
  expect(await criadosDepoisDeReabrir(page)).toBe(1);
  expect(erros).toEqual([]);
});

test('criação no celular: tocar na vaca com o trigo dá a comida', async ({ browser }) => {
  test.setTimeout(400_000);
  const ctx = await browser.newContext({
    viewport: { width: 412, height: 860 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await ctx.newPage();
  const erros: string[] = [];
  page.on('pageerror', (e) => erros.push(String(e)));
  await ranchoSobrevivencia(page);
  await page.evaluate(() => document.body.classList.add('toque-ativo'));
  const r = await vaca(page, true);
  conferir(r, true);
  expect(await criadosDepoisDeReabrir(page)).toBe(1);
  expect(erros).toEqual([]);
  await ctx.close();
});

test('noite no Rancho: a coruja chega, pia e foge, e não machuca', async ({ page }) => {
  test.setTimeout(400_000);
  const erros: string[] = [];
  page.on('pageerror', (e) => erros.push(String(e)));
  await page.setViewportSize({ width: 1024, height: 600 });
  await ranchoSobrevivencia(page);
  const { fx, fy, fz } = await laje(page);
  const r = await page.evaluate(
    async ({ fx, fy, fz }) => {
      const e = window.__brumaluz!;
      const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));
      const missoes: string[] = [];
      e.hora = 0;
      await espera(800);
      const vida0 = e.sobrevivencia!.estado.vida;
      const corujas = () => e.criaturas!().filter((c) => c.tipo === 'espectro');
      const antes = new Set(corujas().map((c) => c.id));
      e.invocar!('espectro', fx + 0.5, fy, fz + 6.5);
      let id = -1;
      for (let i = 0; i < 40 && id < 0; i++) {
        await espera(100);
        // a invocada (à noite outras nascem sozinhas, mais longe)
        id =
          corujas().find(
            (c) => !antes.has(c.id) && Math.hypot(c.x - (fx + 0.5), c.z - (fz + 6.5)) < 2,
          )?.id ?? -1;
      }
      window.addEventListener('brumaluz:espantou', () => missoes.push('espantou'));
      // anda até ela, devagar, várias vezes (ela foge e volta curiosa)
      let menor = Infinity;
      const estados = new Set<string>();
      for (let i = 0; i < 60; i++) {
        const c = e.criaturas!().find((b) => b.id === id);
        if (!c) break;
        estados.add(String(c.estado));
        const [px, , pz] = e.posicao!;
        const d = Math.hypot(c.x - px, c.z - pz);
        menor = Math.min(menor, d);
        if (d > 1.5) {
          const nx = Math.min(Math.max(px + ((c.x - px) / d) * 0.6, fx - 6), fx + 6);
          const nz = Math.min(Math.max(pz + ((c.z - pz) / d) * 0.6, fz - 6), fz + 6);
          e.teleportar!(nx, nz, fy);
        }
        await espera(250);
      }
      return {
        achou: id > 0,
        vida0,
        vida: e.sobrevivencia!.estado.vida,
        menor,
        estados: [...estados],
        espantou: missoes.length > 0,
      };
    },
    { fx, fy, fz },
  );
  expect(r.achou).toBe(true);
  expect(r.vida).toBe(r.vida0);
  expect(r.estados).not.toContain('perseguir');
  expect(r.estados).toContain('fugir');
  expect(r.espantou).toBe(true);
  expect(erros).toEqual([]);
});
