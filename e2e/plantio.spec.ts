import { expect, test, type Page } from '@playwright/test';
import { PASTA_CAPTURAS } from '../playwright.config';

/**
 * Spec 013 (T02, critérios 1 e 7): arar, plantar, crescer e colher de verdade, pelo mouse
 * no computador e pelo toque num celular. A lavoura cresce pelo atalho de teste
 * (`crescerLavoura`), com a mesma conta do núcleo.
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
  await page.locator('[data-novo-nome]').fill('Roça');
  // semente fixa: arar a grama alta às vezes solta uma semente de trigo (1 em 8, sorteio da
  // semente do mundo) e ela vinha para a mochila, deixando 3 sementes em vez de 2. Nesta,
  // a primeira grama arada não solta nada
  await page.locator('[data-novo-semente]').fill('4242');
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

/** Arar → plantar → crescer → colher, com o gesto do aparelho (clique direito ou toque). */
async function roca(page: Page, toque: boolean) {
  return page.evaluate(async (toque) => {
    const e = window.__brumaluz!;
    const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));
    const dicas: string[] = [];
    const avisos: string[] = [];
    const eventos: string[] = [];
    window.addEventListener('brumaluz:dicaMira', (ev) => {
      dicas.push(String((ev as CustomEvent).detail ?? ''));
    });
    window.addEventListener('brumaluz:toast', (ev) =>
      avisos.push(String((ev as CustomEvent).detail)),
    );
    for (const n of ['arou', 'plantou', 'colheu'])
      window.addEventListener(`brumaluz:${n}`, () => eventos.push(n));
    // uma laje de pedra no chão, com uma grama (e grama alta em cima) à frente
    const [x0, , z0] = e.posicao!;
    const fx = Math.floor(x0);
    const fz = Math.floor(z0);
    e.teleportar!(fx + 0.5, fz + 0.5);
    await espera(1500);
    const fy = Math.floor(e.posicao![1]);
    for (let dx = -1; dx <= 3; dx++)
      for (let dz = -1; dz <= 1; dz++) {
        e.definirBloco!(fx + dx, fy - 1, fz + dz, 45);
        for (let dy = 0; dy < 5; dy++) e.definirBloco!(fx + dx, fy + dy, fz + dz, 0);
      }
    const F = { x: fx + 2, y: fy - 1, z: fz };
    const C = { x: fx + 2, y: fy, z: fz };
    e.definirBloco!(F.x, F.y, F.z, 1);
    e.definirBloco!(C.x, C.y, C.z, 8);
    // outra grama ao lado, sem arar
    e.definirBloco!(F.x, F.y, F.z + 1, 1);
    e.teleportar!(fx + 0.5, fz + 0.5, fy);
    e.inventario!.definir(0, { item: 'enxada_madeira', qtd: 1, dur: 60 });
    e.inventario!.definir(1, { item: 'semente_trigo', qtd: 3 });
    e.inventario!.definir(2, { item: 'semente_milho', qtd: 2 });
    await espera(500);
    await e.sincronizar!();
    const mirar = async (x: number, y: number, z: number) => {
      const [px, py, pz] = e.posicao!;
      e.mirarPonto!(x, y, z);
      await espera(150);
      if (toque) e.controleDireto!.mirar!(innerWidth / 2, innerHeight / 2);
      // a dica olha a mira a cada 0,25 s; com a máquina ocupada (mundo ainda carregando),
      // os quadros demoram: espera a dica mudar, até 5 s
      const n = dicas.length;
      await espera(700);
      for (let i = 0; i < 43 && dicas.length === n; i++) await espera(100);
    };
    const usar = () => (toque ? e.controleDireto!.tocar!() : e.controleDireto!.usar!());
    const r: Record<string, unknown> = {};

    // 1. enxada na grama alta: ara a grama de baixo
    e.selecionarSlot!(0);
    await mirar(C.x + 0.5, C.y + 0.3, C.z + 0.5);
    r.dicaArar = dicas.at(-1);
    usar();
    r.previsto = e.bloco!(F.x, F.y, F.z);
    await e.sincronizar!();
    r.arado = e.bloco!(F.x, F.y, F.z);
    r.semGrama = e.bloco!(C.x, C.y, C.z);
    r.enxada = e.inventario!.obter(0)?.dur;

    // 2. semente na grama ao lado (não arada): aviso de criança, nada muda
    e.selecionarSlot!(2);
    await mirar(F.x + 0.5, F.y + 1, F.z + 1.5);
    usar();
    await e.sincronizar!();
    r.recusou = e.bloco!(F.x, F.y + 1, F.z + 1);
    r.avisos = [...avisos];

    // 3. semente na terra arada
    e.selecionarSlot!(1);
    await mirar(F.x + 0.5, F.y + 1, F.z + 0.5);
    r.dicaPlantar = dicas.at(-1);
    usar();
    r.plantouNaHora = e.bloco!(C.x, C.y, C.z);
    await e.sincronizar!();
    r.plantou = e.bloco!(C.x, C.y, C.z);
    r.sementes = e.inventario!.obter(1)?.qtd;

    // 4. cresce até madura (a conta do núcleo, sem esperar 6 minutos)
    e.crescerLavoura!(900);
    await e.sincronizar!();
    await espera(300);
    r.madura = e.bloco!(C.x, C.y, C.z);

    // 5. colher: segurar (toque) ou o botão esquerdo
    await mirar(C.x + 0.5, C.y + 0.3, C.z + 0.5);
    r.dicaColher = dicas.at(-1);
    if (toque) e.controleDireto!.mirar!(innerWidth / 2, innerHeight / 2);
    // segura bem mais que o necessário: a terra arada de baixo não pode ir junto
    e.controleDireto!.quebrar(true);
    await espera(1500);
    e.controleDireto!.quebrar(false);
    e.controleDireto!.soltarMira?.();
    await e.sincronizar!();
    r.colhido = e.bloco!(C.x, C.y, C.z);
    r.terraFica = e.bloco!(F.x, F.y, F.z);
    // os itens pulam e vêm para a mochila
    // (o trigo e a semente da colheita chegam em quadros diferentes: espera os dois)
    const colheu = () =>
      e.inventario!.contar('trigo') > 0 && e.inventario!.contar('semente_trigo') >= 3;
    for (let i = 0; i < 30 && !colheu(); i++) {
      if (i === 10) e.teleportar!(C.x + 0.5, C.z + 0.5, C.y);
      await espera(200);
    }
    r.trigo = e.inventario!.contar('trigo');
    r.sementesDepois = e.inventario!.contar('semente_trigo');
    r.eventos = [...eventos];
    r.particulas = e.fx?.particulas ?? 0;
    return r;
  }, toque);
}

function conferir(r: Record<string, unknown>, toque: boolean) {
  expect(r.dicaArar).toBe(toque ? 'Toque na grama para arar' : 'Clique direito: arar');
  // a previsão aparece na hora, e o núcleo confirma
  expect(r.previsto).toBe(68);
  expect(r.arado).toBe(68);
  expect(r.semGrama).toBe(0);
  expect(r.enxada).toBe(59);
  expect(r.recusou).toBe(0);
  expect(r.avisos).toContain('A semente precisa de terra arada. Use a enxada na grama.');
  expect(r.dicaPlantar).toBe(
    toque ? 'Toque na terra arada para plantar' : 'Clique direito: plantar',
  );
  expect(r.plantouNaHora).toBe(69);
  expect(r.plantou).toBe(69);
  expect(r.sementes).toBe(2);
  expect(r.madura).toBe(72);
  expect(r.dicaColher).toBe(toque ? 'Segure para colher' : 'Clique para colher');
  expect(r.colhido).toBe(0);
  expect(r.terraFica).toBe(68);
  expect(r.trigo as number).toBeGreaterThanOrEqual(1);
  expect(r.sementesDepois as number).toBeGreaterThanOrEqual(3);
  expect(r.eventos).toEqual(['arou', 'plantou', 'colheu']);
}

test('roça no computador: arar, plantar, crescer e colher', async ({ page }) => {
  test.setTimeout(400_000);
  const erros: string[] = [];
  page.on('pageerror', (e) => erros.push(String(e)));
  await page.setViewportSize({ width: 1024, height: 600 });
  await mundoSobrevivencia(page);
  const r = await roca(page, false);
  conferir(r, false);
  expect(erros).toEqual([]);
});

test('roça no celular: tocar ara e planta, segurar colhe', async ({ browser }) => {
  test.setTimeout(400_000);
  const ctx = await browser.newContext({
    viewport: { width: 412, height: 860 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await ctx.newPage();
  const erros: string[] = [];
  page.on('pageerror', (e) => erros.push(String(e)));
  await mundoSobrevivencia(page);
  await page.evaluate(() => document.body.classList.add('toque-ativo'));
  const r = await roca(page, true);
  conferir(r, true);
  expect(erros).toEqual([]);
  await ctx.close();
});

/**
 * O HUD do Rancho Alegre no celular em pé (412×860): a dica da mira, os corações, o aviso
 * de recusa e a missão do diário (que começa pela roça) não se cobrem nem cobrem a barra e
 * os controles de toque. Grava as capturas para conferir de olho.
 */
test('HUD do Rancho no celular: dicas, corações e avisos sem cobrir nada', async ({ browser }) => {
  test.setTimeout(400_000);
  const ctx = await browser.newContext({
    viewport: { width: 412, height: 860 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await ctx.newPage();
  const erros: string[] = [];
  page.on('pageerror', (e) => erros.push(String(e)));
  await page.goto('/');
  await pronto(page);
  await page.locator('[data-abrir-mundos]').click();
  await page.locator('.cartao-tema[data-tema="rancho-alegre"]').click();
  await page.locator('[data-modo="sobrevivencia"]').click();
  await page.locator('[data-novo-nome]').fill('Roça no celular');
  await page.locator('[data-criar-mundo]').click();
  await page.waitForURL(/mundo=/);
  await pronto(page);
  await page.evaluate(() => {
    document.querySelector('.entrada')?.setAttribute('hidden', '');
    document.body.classList.add('toque-ativo');
    const e = window.__brumaluz!;
    e.pausarDia = true;
    e.hora = 0.4;
  });
  // o diário do Rancho guia primeiro pela roça
  await expect(page.locator('[data-missao-atual]')).toContainText('Terra fofinha');
  const alvos = await page.evaluate(async () => {
    const e = window.__brumaluz!;
    const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));
    const [x0, , z0] = e.posicao!;
    const fx = Math.floor(x0);
    const fz = Math.floor(z0);
    e.teleportar!(fx + 0.5, fz + 0.5);
    await espera(1500);
    const fy = Math.floor(e.posicao![1]);
    for (let dx = -2; dx <= 3; dx++)
      for (let dz = -2; dz <= 2; dz++) {
        e.definirBloco!(fx + dx, fy - 1, fz + dz, 45);
        for (let dy = 0; dy < 5; dy++) e.definirBloco!(fx + dx, fy + dy, fz + dz, 0);
      }
    e.definirBloco!(fx + 2, fy - 1, fz, 1);
    e.teleportar!(fx + 0.5, fz + 0.5, fy);
    e.inventario!.definir(0, { item: 'enxada_madeira', qtd: 1, dur: 60 });
    e.inventario!.definir(1, { item: 'semente_trigo', qtd: 3 });
    e.inventario!.definir(2, { item: 'trigo', qtd: 5 });
    e.selecionarSlot!(0);
    await espera(500);
    await e.sincronizar!();
    return { fx, fy, fz };
  });
  const mirar = (x: number, y: number, z: number) =>
    page.evaluate(
      async ([x, y, z]) => {
        const e = window.__brumaluz!;
        const [px, py, pz] = e.posicao!;
        e.mirarPonto!(x, y, z);
        await new Promise((r) => setTimeout(r, 150));
        e.controleDireto!.mirar!(innerWidth / 2, innerHeight / 2);
        await new Promise((r) => setTimeout(r, 900));
      },
      [x, y, z],
    );
  /** Caixas visíveis que não podem se cobrir (a dica, os avisos, a barra, os corações...). */
  const sobreposicoes = () =>
    page.evaluate(() => {
      const nomes: [string, string][] = [
        ['dica', '.dica-mira.visivel'],
        ['aviso', '.toast-area > *'],
        ['barra', '[role="toolbar"]'],
        ['status', '.status'],
        ['missao', '.missao-hud'],
        ['minimapa', '.minimapa'],
        ['joystick', '.toque .joystick'],
        ['botoes', '.toque .botoes > *'],
        ['info', '[data-hud-info]'],
      ];
      const caixas: { n: string; r: DOMRect }[] = [];
      for (const [n, sel] of nomes)
        for (const el of document.querySelectorAll<HTMLElement>(sel)) {
          const cs = getComputedStyle(el);
          const r = el.getBoundingClientRect();
          if (cs.display === 'none' || cs.visibility === 'hidden' || r.width === 0) continue;
          if (Number(cs.opacity) < 0.05) continue;
          caixas.push({ n, r });
        }
      const ruins: string[] = [];
      for (let i = 0; i < caixas.length; i++)
        for (let j = i + 1; j < caixas.length; j++) {
          const a = caixas[i].r;
          const b = caixas[j].r;
          const w = Math.min(a.right, b.right) - Math.max(a.left, b.left);
          const h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
          if (w > 2 && h > 2 && caixas[i].n !== caixas[j].n)
            ruins.push(`${caixas[i].n} × ${caixas[j].n} (${Math.round(w)}×${Math.round(h)})`);
        }
      for (const c of caixas)
        if (c.r.left < -1 || c.r.right > innerWidth + 1 || c.r.bottom > innerHeight + 1)
          ruins.push(`${c.n} fora da tela`);
      return { ruins, vistos: caixas.map((c) => c.n) };
    });

  const { fx, fy, fz } = alvos;
  // 1. enxada na grama: a dica de arar abaixo da mira
  await mirar(fx + 2.5, fy - 0.5, fz + 0.5);
  await expect(page.locator('.dica-mira')).toHaveText('Toque na grama para arar');
  const s1 = await sobreposicoes();
  await page.screenshot({ path: `${PASTA_CAPTURAS}/rancho-celular-arar.png` });
  // no celular em pé, a missão fica recolhida no botão de informações (spec 011)
  expect(s1.vistos).toEqual(expect.arrayContaining(['dica', 'barra', 'status', 'joystick']));
  expect(s1.ruins).toEqual([]);

  // 2. semente na pedra: o aviso de criança aparece sem cobrir a dica nem a missão
  await page.evaluate(() => window.__brumaluz!.selecionarSlot!(1));
  await mirar(fx + 1.5, fy - 0.5, fz + 1.5);
  await page.evaluate(() => window.__brumaluz!.controleDireto!.tocar!());
  // confere e mede logo que o aviso entra: ele some sozinho em 2,7 s, e com a suíte inteira
  // rodando (1 quadro por segundo) só a captura de tela já pode levar mais que isso
  await expect(page.locator('.toast-area')).toContainText('A semente precisa de terra arada');
  // espera o aviso acabar de surgir (0,27 s de entrada), como a criança o vê
  await page.waitForFunction(
    () =>
      [...document.querySelectorAll<HTMLElement>('.toast-area > *')].some(
        (t) => t.textContent?.includes('terra arada') && Number(getComputedStyle(t).opacity) > 0.9,
      ),
    undefined,
    { polling: 50, timeout: 2_500 },
  );
  const s2 = await sobreposicoes();
  await page.screenshot({ path: `${PASTA_CAPTURAS}/rancho-celular-aviso.png` });
  expect(s2.vistos).toContain('aviso');
  expect(s2.ruins).toEqual([]);

  // 3. machucado: os corações (meia vida) com o trigo na mão
  await page.evaluate(async () => {
    const e = window.__brumaluz!;
    e.selecionarSlot!(2);
    e.sobrevivencia!.dano(7);
    await new Promise((r) => setTimeout(r, 900));
  });
  const s3 = await sobreposicoes();
  await page.screenshot({ path: `${PASTA_CAPTURAS}/rancho-celular-coracoes.png` });
  expect(s3.ruins).toEqual([]);

  // 4. as informações abertas: a missão da roça aparece sem cobrir o minimapa nem a mira
  await page.locator('[data-hud-info]').tap();
  await expect(page.locator('[data-missao-atual]')).toBeVisible();
  await page.waitForTimeout(400);
  const s4 = await sobreposicoes();
  await page.screenshot({ path: `${PASTA_CAPTURAS}/rancho-celular-missao.png` });
  expect(s4.vistos).toContain('missao');
  expect(s4.ruins).toEqual([]);
  expect(erros).toEqual([]);
  await ctx.close();
});
