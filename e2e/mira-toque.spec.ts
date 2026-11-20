import { mkdirSync } from 'node:fs';
import { expect, test, type Browser, type Page } from '@playwright/test';
import { Bloco } from '../src/world/blocks';

/**
 * Mira pelo dedo no celular: o toque age no bloco embaixo do dedo (não no da mira do centro),
 * o destaque acompanha o dedo, o boneco vira para o bloco tocado e o toque longe demais
 * avisa sem palavras (anel cinza tremendo e um som baixinho) e não muda nada.
 */
const PASTA = 'test-results/mira-toque';
const ROTULO = process.env.CAPTURA_ROTULO ?? 'depois';

function coletarErros(page: Page): string[] {
  const erros: string[] = [];
  page.on('pageerror', (e) => erros.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') erros.push(`console.error: ${m.text()}`);
  });
  return erros;
}

async function pronto(page: Page) {
  await page.waitForFunction(() => window.__brumaluz?.ready === true, undefined, {
    timeout: 180_000,
  });
}

/** Celular em pé (412×860), mundo de sobrevivência com semente fixa. */
async function celular(browser: Browser) {
  const ctx = await browser.newContext({
    viewport: { width: 412, height: 860 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await ctx.newPage();
  const erros = coletarErros(page);
  await page.goto('/');
  await pronto(page);
  await page.locator('[data-abrir-mundos]').click();
  // spec 034: no Doce Reino, de terreno natural no nascimento (era o tema padrão, o Bruma e
  // Luz, que saiu; na Vila Neon, agora o padrão, o chão do bairro é protegido)
  await page.locator('.cartao-tema[data-tema="doce-reino"]').click();
  await page.locator('[data-modo="sobrevivencia"]').click();
  await page.locator('[data-novo-nome]').fill('Dedo');
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
  await expect(page.locator('[data-toque]')).toBeVisible();
  return { ctx, page, erros };
}

interface Campo {
  x: number;
  y: number;
  z: number;
}

/**
 * Uma laje de pedra no ar livre com uma faixa de grama à frente e à esquerda do boneco;
 * o boneco olha para +z, um pouco para baixo (a mira do centro cai na pedra do meio).
 */
async function montarCampo(page: Page): Promise<Campo> {
  const c = await page.evaluate(
    async ({ pedra, grama }) => {
      const e = window.__brumaluz!;
      const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));
      const [x0, , z0] = e.posicao!;
      const fx = Math.floor(x0);
      const fz = Math.floor(z0);
      e.teleportar!(fx + 0.5, fz + 0.5);
      await espera(1500);
      const fy = Math.floor(e.posicao![1]);
      for (let dx = -6; dx <= 6; dx++)
        for (let dz = -6; dz <= 16; dz++) {
          e.definirBloco!(fx + dx, fy - 1, fz + dz, pedra);
          for (let dy = 0; dy < 6; dy++) e.definirBloco!(fx + dx, fy + dy, fz + dz, 0);
        }
      // faixa de grama à esquerda (x+), dois e três passos à frente
      for (let dx = 1; dx <= 3; dx++)
        for (let dz = 1; dz <= 3; dz++) e.definirBloco!(fx + dx, fy - 1, fz + dz, grama);
      e.teleportar!(fx + 0.5, fz + 0.5, fy);
      await espera(400);
      e.apontar!(0, 0.5);
      await espera(800);
      return { x: fx, y: fy, z: fz };
    },
    { pedra: Bloco.PEDREGULHO, grama: Bloco.TERRA_MUSGOSA },
  );
  await page.evaluate(() => window.__brumaluz!.sincronizar?.());
  return c;
}

/** Ponto da tela no meio do topo do bloco (x, y, z). */
async function telaDoTopo(page: Page, b: Campo) {
  const p = await page.evaluate(
    (b) => window.__brumaluz!.telaDoPonto!(b.x + 0.5, b.y + 1, b.z + 0.5),
    b,
  );
  expect(p).toBeTruthy();
  return p!;
}

/** Dedo encostando na tela (sem soltar) ou soltando, pelos eventos de ponteiro. */
function dedo(page: Page, tipo: 'pointerdown' | 'pointerup', x: number, y: number) {
  return page.evaluate(
    ({ tipo, x, y }) => {
      const el = document.querySelector<HTMLElement>('[data-toque] .olhar')!;
      el.dispatchEvent(
        new PointerEvent(tipo, {
          pointerId: 41,
          pointerType: 'touch',
          clientX: x,
          clientY: y,
          bubbles: true,
          isPrimary: true,
        }),
      );
    },
    { tipo, x, y },
  );
}

test('capturas do destaque no celular (sem dedo, dedo num bloco, dedo longe)', async ({
  browser,
}) => {
  test.setTimeout(300_000);
  mkdirSync(PASTA, { recursive: true });
  const { ctx, page, erros } = await celular(browser);
  const c = await montarCampo(page);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${PASTA}/${ROTULO}-1-sem-dedo.png` });
  // dedo na grama à esquerda (a mira do centro está na pedra)
  const g = await telaDoTopo(page, { x: c.x + 2, y: c.y - 1, z: c.z + 2 });
  await dedo(page, 'pointerdown', g.x, g.y);
  await page.waitForTimeout(120);
  await page.screenshot({ path: `${PASTA}/${ROTULO}-2-dedo-na-grama.png` });
  await dedo(page, 'pointerup', g.x, g.y);
  await page.waitForTimeout(400);
  // dedo segurando numa pedra longe (fora do alcance)
  const l = await telaDoTopo(page, { x: c.x - 1, y: c.y - 1, z: c.z + 12 });
  await dedo(page, 'pointerdown', l.x, l.y);
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${PASTA}/${ROTULO}-3-dedo-longe.png` });
  await dedo(page, 'pointerup', l.x, l.y);
  await page.waitForTimeout(200);
  expect(erros, erros.join('\n')).toEqual([]);
  await ctx.close();
});

test('medida: a que distância dos olhos caem os toques no chão (câmera de trás)', async ({
  browser,
}) => {
  test.setTimeout(300_000);
  const { ctx, page, erros } = await celular(browser);
  await montarCampo(page);
  const medidas: Record<string, unknown> = {};
  for (const pitch of [0.25, 0.5]) {
    await page.evaluate((p) => window.__brumaluz!.apontar!(0, p), pitch);
    await page.waitForTimeout(800);
    // a área livre da tela (entre o minimapa e os controles de baixo)
    medidas[`pitch ${pitch}`] = await page.evaluate(() => {
      const e = window.__brumaluz!;
      const d: number[] = [];
      for (let y = 140; y <= 600; y += 20)
        for (let x = 20; x <= 392; x += 24) {
          const a = e.alvoDoDedo!(x, y);
          if (a) d.push(a.distancia);
        }
      d.sort((a, b) => a - b);
      const q = (f: number) => Math.round(d[Math.floor(f * (d.length - 1))] * 10) / 10;
      const ate = (r: number) => Math.round((100 * d.filter((v) => v <= r).length) / d.length);
      return {
        pontos: d.length,
        mediana: q(0.5),
        p25: q(0.25),
        p75: q(0.75),
        ate5: `${ate(5)}%`,
        ate6_5: `${ate(6.5)}%`,
        ate8: `${ate(8)}%`,
      };
    });
  }
  console.log('distâncias dos toques no chão:', JSON.stringify(medidas));
  test.info().annotations.push({ type: 'medidas', description: JSON.stringify(medidas) });
  expect(erros, erros.join('\n')).toEqual([]);
  await ctx.close();
});

test('o toque age no bloco embaixo do dedo: ara, planta, quebra; longe avisa e não muda nada', async ({
  browser,
}) => {
  test.setTimeout(400_000);
  const { ctx, page, erros } = await celular(browser);
  const c = await montarCampo(page);
  // um canteiro alto (grama em cima da laje) à direita: dá para tocar a beirada dele
  const alto = { x: c.x - 1, y: c.y, z: c.z + 2 };
  await page.evaluate(
    ({ alto, grama }) => {
      const e = window.__brumaluz!;
      e.definirBloco!(alto.x, alto.y, alto.z, grama);
      e.inventario!.definir(0, { item: 'enxada_madeira', qtd: 1, dur: 60 });
      e.inventario!.definir(1, { item: 'semente_trigo', qtd: 3 });
      e.selecionarSlot!(0);
    },
    { alto, grama: Bloco.TERRA_MUSGOSA },
  );
  await page.evaluate(() => window.__brumaluz!.sincronizar!());
  await page.waitForTimeout(600);
  const bloco = (b: Campo) => page.evaluate((b) => window.__brumaluz!.bloco!(b.x, b.y, b.z), b);
  const G = { x: c.x + 2, y: c.y - 1, z: c.z + 2 };

  // a dica da mira no toque: sem dedo, a mira do centro não vale (nem na grama, de enxada)
  await page.evaluate(() => {
    const w = window as unknown as { dicas: string[] };
    w.dicas = [];
    window.addEventListener('brumaluz:dicaMira', (ev) =>
      w.dicas.push(String((ev as CustomEvent).detail ?? '')),
    );
  });
  const ultimaDica = () =>
    page.evaluate(() => (window as unknown as { dicas: string[] }).dicas.at(-1) ?? '');
  const Hc = { x: c.x + 3, y: c.y - 1, z: c.z + 1 };
  await page.evaluate((h) => window.__brumaluz!.mirarPonto!(h.x + 0.5, h.y + 1, h.z + 0.5), Hc);
  await page.waitForTimeout(400);
  expect((await page.evaluate(() => window.__brumaluz!.alvo))?.x).toBe(Hc.x);
  await page.waitForTimeout(700);
  expect(await ultimaDica()).toBe('');
  await page.evaluate(() => window.__brumaluz!.apontar!(0, 0.5));
  await page.waitForTimeout(800);
  // com o dedo parado na grama, a dica fala dela; soltou, some
  const pd = await telaDoTopo(page, { x: c.x + 2, y: c.y - 1, z: c.z + 2 });
  await page.evaluate((p) => window.__brumaluz!.controleDireto!.mirar(p.x, p.y), pd);
  await expect.poll(ultimaDica).toBe('Toque na grama para arar');
  await page.evaluate(() => window.__brumaluz!.controleDireto!.soltarMira());
  await expect.poll(ultimaDica).toBe('');

  // sem dedo na tela, nada de contorno no bloco da mira do centro
  await expect.poll(() => page.evaluate(() => window.__brumaluz!.destaque!())).toBeNull();
  const centro = await page.evaluate(() => window.__brumaluz!.alvo);
  expect(centro && centro.x === G.x && centro.z === G.z).toBeFalsy();

  // dedo encostado na grama: o contorno vai para ela
  const pg = await telaDoTopo(page, G);
  expect(await page.evaluate((p) => window.__brumaluz!.alvoDoDedo!(p.x, p.y), pg)).toMatchObject({
    ...G,
    alcanca: true,
  });
  // (toque rápido: encosta, espera dois quadros, lê o contorno e solta antes de virar "segurar")
  const comDedo = await page.evaluate(async (p) => {
    const el = document.querySelector<HTMLElement>('[data-toque] .olhar')!;
    const ev = (tipo: string) =>
      el.dispatchEvent(
        new PointerEvent(tipo, {
          pointerId: 42,
          pointerType: 'touch',
          clientX: p.x,
          clientY: p.y,
          bubbles: true,
          isPrimary: true,
        }),
      );
    const quadro = () => new Promise((r) => requestAnimationFrame(r));
    ev('pointerdown');
    await quadro();
    await quadro();
    const d = window.__brumaluz!.destaque!();
    ev('pointerup');
    return d;
  }, pg);
  expect(comDedo).toEqual(G);
  // soltou: o contorno some de novo
  await expect.poll(() => page.evaluate(() => window.__brumaluz!.destaque!())).toBeNull();
  // aquele toque (com a enxada) já arou a grama tocada, não a do centro
  await expect.poll(() => bloco(G)).toBe(Bloco.TERRA_ARADA);
  // o corpo virou para o bloco tocado
  const virou = await page.evaluate((G) => {
    const e = window.__brumaluz!;
    const [px, , pz] = e.posicao!;
    const quer = Math.atan2(G.x + 0.5 - px, G.z + 0.5 - pz);
    const y = e.camera!.yawCorpo();
    return Math.abs(Math.atan2(Math.sin(y - quer), Math.cos(y - quer)));
  }, G);
  expect(virou).toBeLessThan(0.5);

  // semente: tocar o canteiro arado planta nele
  await page.evaluate(() => window.__brumaluz!.selecionarSlot!(1));
  await page.waitForTimeout(300);
  await page.touchscreen.tap(pg.x, pg.y);
  await expect.poll(() => bloco({ ...G, y: G.y + 1 })).toBe(Bloco.TRIGO_0);

  // canteiro alto: a enxada ara tocando a beirada, a semente planta tocando a beirada
  const beirada = await page.evaluate(
    (b) => window.__brumaluz!.telaDoPonto!(b.x + 0.5, b.y + 0.45, b.z),
    alto,
  );
  expect(beirada).toBeTruthy();
  await page.evaluate(() => window.__brumaluz!.selecionarSlot!(0));
  await page.waitForTimeout(300);
  await page.touchscreen.tap(beirada!.x, beirada!.y);
  await expect.poll(() => bloco(alto)).toBe(Bloco.TERRA_ARADA);
  await page.evaluate(() => window.__brumaluz!.selecionarSlot!(1));
  await page.waitForTimeout(300);
  await page.touchscreen.tap(beirada!.x, beirada!.y);
  await expect.poll(() => bloco({ ...alto, y: alto.y + 1 })).toBe(Bloco.TRIGO_0);

  // segurar quebra o bloco embaixo do dedo (uma grama que não está no centro)
  const H = { x: c.x + 3, y: c.y - 1, z: c.z + 1 };
  await page.evaluate(() => window.__brumaluz!.selecionarSlot!(2));
  const ph = await telaDoTopo(page, H);
  await dedo(page, 'pointerdown', ph.x, ph.y);
  await expect.poll(() => bloco(H), { timeout: 15_000 }).toBe(Bloco.AR);
  await dedo(page, 'pointerup', ph.x, ph.y);

  // longe demais: o anel fica cinza e balança, e nada muda (nem a semente sai da mão)
  await page.evaluate(() => window.__brumaluz!.selecionarSlot!(1));
  const L = { x: c.x - 1, y: c.y - 1, z: c.z + 12 };
  const pl = await telaDoTopo(page, L);
  const dl = await page.evaluate((p) => window.__brumaluz!.alvoDoDedo!(p.x, p.y), pl);
  expect(dl).toMatchObject({ ...L, alcanca: false });
  const sementes = await page.evaluate(() => window.__brumaluz!.inventario!.obter(1)?.qtd);
  await page.touchscreen.tap(pl.x, pl.y);
  await expect(page.locator('[data-toque] .anel.longe.visivel')).toBeVisible();
  await page.waitForTimeout(800);
  await expect(page.locator('[data-toque] .anel.visivel')).toHaveCount(0);
  expect(await bloco(L)).toBe(Bloco.PEDREGULHO);
  expect(await bloco({ ...L, y: L.y + 1 })).toBe(Bloco.AR);
  expect(await page.evaluate(() => window.__brumaluz!.inventario!.obter(1)?.qtd)).toBe(sementes);
  // segurando longe: o anel fica cinza enquanto o dedo estiver lá, e nada quebra
  await dedo(page, 'pointerdown', pl.x, pl.y);
  await expect(page.locator('[data-toque] .anel.longe.visivel')).toBeVisible();
  await page.waitForTimeout(1200);
  await dedo(page, 'pointerup', pl.x, pl.y);
  expect(await bloco(L)).toBe(Bloco.PEDREGULHO);
  expect(erros, erros.join('\n')).toEqual([]);
  await ctx.close();
});
