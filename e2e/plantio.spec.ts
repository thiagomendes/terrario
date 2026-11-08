import { expect, test, type Page } from '@playwright/test';

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
      e.apontar!(Math.atan2(x - px, z - pz), -Math.atan2(y - py, Math.hypot(x - px, z - pz)));
      await espera(150);
      if (toque) e.controleDireto!.mirar!(innerWidth / 2, innerHeight / 2);
      // a dica olha a mira a cada 0,25 s
      await espera(700);
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
    for (let i = 0; i < 30 && !(e.inventario!.contar('trigo') > 0); i++) {
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
