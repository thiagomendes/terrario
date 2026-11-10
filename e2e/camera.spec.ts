import { expect, test, type Browser, type Page } from '@playwright/test';
import { Bloco } from '../src/world/blocks';

/**
 * Spec 015: a câmera de terceira pessoa como no esboço aprovado. Zoom pela roda e pela
 * pinça, corpo solto da câmera (vira para onde anda) e a câmera voltando para trás dele,
 * desvio de paredes numa casinha (boneco meio transparente) e numa caverna, mira do centro
 * colocando e quebrando, e o toque mirando pelo dedo, no computador e no celular.
 */
function coletarErros(page: Page): string[] {
  const erros: string[] = [];
  page.on('pageerror', (e) => erros.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') erros.push(`console.error: ${m.text()}`);
  });
  return erros;
}

async function pronto(page: Page): Promise<void> {
  await page.waitForFunction(() => window.__brumaluz?.ready === true, undefined, {
    timeout: 180_000,
  });
  await page.evaluate(() => window.__brumaluz!.darKit?.());
  await page.waitForFunction(() => !!window.__brumaluz!.inventario?.obter(1));
  await page.evaluate(() => {
    document.querySelector<HTMLElement>('.entrada')?.setAttribute('hidden', '');
    window.__brumaluz!.pausarDia = true;
  });
}

async function abrir(page: Page): Promise<void> {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');
  await pronto(page);
}

async function celular(browser: Browser) {
  const ctx = await browser.newContext({
    viewport: { width: 844, height: 390 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await ctx.newPage();
  const erros = coletarErros(page);
  await page.goto('/');
  await pronto(page);
  await expect(page.locator('[data-toque]')).toBeVisible();
  return { ctx, page, erros };
}

/** Um lugar alto no ar (sem nada em volta), longe das árvores: o mundo fica só o que o teste faz. */
async function noAr(page: Page): Promise<{ x: number; y: number; z: number }> {
  return page.evaluate((pedra) => {
    const e = window.__brumaluz!;
    const [x, y, z] = e.posicao!;
    const fx = Math.floor(x) + 40;
    const fz = Math.floor(z);
    const fy = Math.min(110, Math.floor(y) + 30);
    // um chão de pedra 25x13 para ficar em pé e andar
    for (let dx = -12; dx <= 12; dx++)
      for (let dz = -6; dz <= 6; dz++) e.definirBloco!(fx + dx, fy - 1, fz + dz, pedra);
    e.teleportar!(fx + 0.5, fz + 0.5, fy);
    return { x: fx, y: fy, z: fz };
  }, Bloco.PEDREGULHO);
}

/** A câmera (com a bolinha de 0,15 em volta) não toca nenhum bloco que a barra. */
const cameraForaDeBloco = (page: Page) =>
  page.evaluate(() => {
    const e = window.__brumaluz!;
    const [cx, cy, cz] = e.camera!.posicao();
    for (const dx of [-0.15, 0, 0.15])
      for (const dy of [-0.15, 0, 0.15])
        for (const dz of [-0.15, 0, 0.15]) {
          const b = e.bloco!(Math.floor(cx + dx), Math.floor(cy + dy), Math.floor(cz + dz));
          if (b !== 0) return false;
        }
    return true;
  });

test('roda do mouse aproxima e afasta (2,5 a 7); em cima da barra troca o item', async ({
  page,
}) => {
  test.setTimeout(240_000);
  const erros = coletarErros(page);
  await abrir(page);
  await noAr(page);
  const zoom = () => page.evaluate(() => window.__brumaluz!.camera!.zoom());
  const z0 = await zoom();
  const slot0 = await page.evaluate(() => window.__brumaluz!.slotAtivo);
  await page.mouse.move(640, 300);
  await page.mouse.wheel(0, -100);
  await expect.poll(zoom).toBeCloseTo(z0 - 0.5, 5);
  for (let i = 0; i < 12; i++) await page.mouse.wheel(0, -100);
  await expect.poll(zoom).toBe(2.5);
  for (let i = 0; i < 14; i++) await page.mouse.wheel(0, 100);
  await expect.poll(zoom).toBe(7);
  // a câmera chega na distância pedida (campo aberto, sem parede)
  await expect
    .poll(() => page.evaluate(() => window.__brumaluz!.camera!.distancia()), { timeout: 10_000 })
    .toBeGreaterThan(6.8);
  // a roda no mundo não trocou o item
  expect(await page.evaluate(() => window.__brumaluz!.slotAtivo)).toBe(slot0);
  const barra = await page.locator('.barra').boundingBox();
  await page.mouse.move(barra!.x + barra!.width / 2, barra!.y + barra!.height / 2);
  await page.mouse.wheel(0, 100);
  await expect.poll(() => page.evaluate(() => window.__brumaluz!.slotAtivo)).not.toBe(slot0);
  expect(await zoom()).toBe(7);
  expect(erros, erros.join('\n')).toEqual([]);
});

test('corpo solto da câmera: vira para onde anda e a câmera volta para trás dele', async ({
  page,
}) => {
  test.setTimeout(240_000);
  const erros = coletarErros(page);
  await abrir(page);
  await noAr(page);
  // olha para +z e chega de novo (o boneco chega de costas para a câmera)
  await page.evaluate(() => {
    const e = window.__brumaluz!;
    e.apontar!(0, 0.3);
    const [x, y, z] = e.posicao!;
    e.teleportar!(x, z, y - 1.62);
  });
  await page.waitForTimeout(400);
  const ler = () =>
    page.evaluate(() => ({
      corpo: window.__brumaluz!.camera!.yawCorpo(),
      camera: window.__brumaluz!.rotacao![1],
    }));
  const dif = (a: number, b: number) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
  // parado, o corpo fica de costas para a câmera
  expect(dif((await ler()).corpo, 0)).toBeLessThan(0.05);
  // girar a câmera não gira o corpo
  await page.evaluate(() => window.__brumaluz!.apontar!(1.2, 0.3));
  await page.waitForTimeout(500);
  expect(dif((await ler()).corpo, 0)).toBeLessThan(0.05);
  await page.evaluate(() => window.__brumaluz!.apontar!(0, 0.3));
  // andando na diagonal (frente e direita), o corpo vira para lá, suave
  await page.keyboard.down('KeyW');
  await page.keyboard.down('KeyD');
  await page.waitForTimeout(60);
  const logo = await ler();
  // virou um pouco, não de uma vez
  expect(dif(logo.corpo, Math.PI / 4)).toBeGreaterThan(0.1);
  await page.waitForTimeout(700);
  await page.keyboard.up('KeyW');
  await page.keyboard.up('KeyD');
  const andou = await ler();
  expect(dif(andou.corpo, Math.PI / 4)).toBeLessThan(0.35);
  // a câmera não girou junto (menos de 1,4 s sem mexer nela)
  expect(dif(andou.camera, 0)).toBeLessThan(0.02);
  // inclina ao andar e respira parado (o corpo vivo está ligado)
  const corpo = await page.evaluate(() => window.__brumaluz!.personagem!.corpo());
  expect(corpo).not.toBeNull();
  // andando de lado sem mexer na câmera: depois de 1,4 s ela começa a voltar para trás do boneco
  await page.evaluate(() => {
    const e = window.__brumaluz!;
    const [x, , z] = e.posicao!;
    e.teleportar!(x - 3, z, e.posicao![1] - 1.62);
    e.apontar!(0, 0.3);
  });
  await page.keyboard.down('KeyD');
  await page.waitForTimeout(1000);
  expect(dif((await ler()).camera, 0)).toBeLessThan(0.02);
  await page.waitForTimeout(1600);
  await page.keyboard.up('KeyD');
  const voltou = await ler();
  expect(dif(voltou.camera, 0)).toBeGreaterThan(0.1);
  expect(erros, erros.join('\n')).toEqual([]);
});

test('casinha: a câmera chega perto sem entrar na parede e o boneco fica meio transparente', async ({
  page,
}) => {
  test.setTimeout(240_000);
  const erros = coletarErros(page);
  await abrir(page);
  const c = await noAr(page);
  await page.waitForTimeout(800);
  // longe de paredes: opaco
  await expect
    .poll(() => page.evaluate(() => window.__brumaluz!.camera!.opacidadeBoneco()))
    .toBe(1);
  await page.evaluate(
    ({ c, B }) => {
      const e = window.__brumaluz!;
      for (let dx = -2; dx <= 2; dx++)
        for (let dz = -2; dz <= 2; dz++) {
          const borda = Math.abs(dx) === 2 || Math.abs(dz) === 2;
          for (let dy = 0; dy < 3; dy++)
            if (borda) e.definirBloco!(c.x + dx, c.y + dy, c.z + dz, dy === 1 ? B.vidro : B.tabuas);
          e.definirBloco!(c.x + dx, c.y + 3, c.z + dz, B.folhas);
        }
      e.teleportar!(c.x + 0.5, c.z + 0.5, c.y);
    },
    { c, B: { tabuas: Bloco.TABUAS, vidro: Bloco.VIDRO, folhas: Bloco.FOLHAGEM } },
  );
  for (const [yaw, pitch] of [
    [0, 0.3],
    [1.3, 0.6],
    [2.6, -0.4],
    [-2, 1.2],
    [0.8, -1.1],
  ]) {
    await page.evaluate(([y, p]) => window.__brumaluz!.apontar!(y, p), [yaw, pitch]);
    await page.waitForTimeout(350);
    expect(await cameraForaDeBloco(page), `yaw ${yaw} pitch ${pitch}`).toBe(true);
    expect(await page.evaluate(() => window.__brumaluz!.camera!.desviando())).toBe(true);
  }
  await expect
    .poll(() => page.evaluate(() => window.__brumaluz!.camera!.opacidadeBoneco()))
    .toBeLessThan(1);
  const op = await page.evaluate(() => window.__brumaluz!.camera!.opacidadeBoneco());
  expect(op).toBeGreaterThanOrEqual(0.2);
  // saindo da casa (teleporte para fora), volta ao normal
  await page.evaluate((c) => window.__brumaluz!.teleportar!(c.x + 0.5, c.z + 3.5 + 5, c.y + 6), c);
  await page.evaluate(() => window.__brumaluz!.apontar!(0, 0.3));
  await expect
    .poll(() => page.evaluate(() => window.__brumaluz!.camera!.opacidadeBoneco()), {
      timeout: 10_000,
    })
    .toBe(1);
  expect(erros, erros.join('\n')).toEqual([]);
});

test('caverna: em volta toda, a câmera nunca fica dentro de um bloco', async ({ page }) => {
  test.setTimeout(240_000);
  const erros = coletarErros(page);
  await abrir(page);
  const c = await noAr(page);
  // túnel de pedra 3x3 com uma curva
  await page.evaluate(
    ({ c, pedra }) => {
      const e = window.__brumaluz!;
      for (let dx = -4; dx <= 4; dx++)
        for (let dy = -1; dy <= 4; dy++)
          for (let dz = -6; dz <= 6; dz++) {
            const tunel = (Math.abs(dx) <= 1 || (dz >= 2 && dz <= 4)) && dy >= 0 && dy <= 2;
            e.definirBloco!(c.x + dx, c.y + dy, c.z + dz, tunel ? 0 : pedra);
          }
      e.teleportar!(c.x + 0.5, c.z + 0.5, c.y);
    },
    { c, pedra: Bloco.PEDREGULHO },
  );
  for (let i = 0; i < 12; i++) {
    const yaw = (i / 12) * Math.PI * 2;
    const pitch = [-1.1, 0.2, 1.3][i % 3];
    await page.evaluate(([y, p]) => window.__brumaluz!.apontar!(y, p), [yaw, pitch]);
    await page.waitForTimeout(250);
    expect(await cameraForaDeBloco(page), `yaw ${yaw} pitch ${pitch}`).toBe(true);
  }
  // andando dentro da caverna (a câmera vem atrás sem atravessar)
  await page.evaluate(() => window.__brumaluz!.apontar!(0, 0.2));
  await page.keyboard.down('KeyW');
  for (let i = 0; i < 6; i++) {
    await page.waitForTimeout(150);
    expect(await cameraForaDeBloco(page)).toBe(true);
  }
  await page.keyboard.up('KeyW');
  expect(erros, erros.join('\n')).toEqual([]);
});

test('mira do centro: coloca e quebra o bloco do centro em terceira pessoa', async ({ page }) => {
  test.setTimeout(240_000);
  const erros = coletarErros(page);
  await abrir(page);
  const c = await noAr(page);
  // o bloco do chão dois passos à frente
  const alvo = { x: c.x, y: c.y - 1, z: c.z + 2 };
  const mirou = await page.evaluate(
    (a) => window.__brumaluz!.mirarBloco!(a.x, a.y, a.z, { x: 0, y: 1, z: 0 }),
    alvo,
  );
  expect(mirou).toBe(true);
  await page.evaluate(() => window.__brumaluz!.selecionarSlot!(1));
  expect(await page.evaluate(() => window.__brumaluz!.interagir!('colocar'))).toBe(true);
  await expect
    .poll(() => page.evaluate((a) => window.__brumaluz!.bloco!(a.x, a.y + 1, a.z), alvo))
    .not.toBe(0);
  // mira o bloco novo e quebra; o corpo vira para ele
  await page.evaluate(() => window.__brumaluz!.apontar!(Math.PI, 0.3));
  await page.waitForTimeout(200);
  expect(await page.evaluate((a) => window.__brumaluz!.mirarBloco!(a.x, a.y + 1, a.z), alvo)).toBe(
    true,
  );
  const r = await page.evaluate(() => window.__brumaluz!.minerar!(2, true));
  expect(r.quebrou).toBe(true);
  // minerando, o corpo virou para o bloco (na frente do boneco, em +z)
  await expect
    .poll(() =>
      page.evaluate(() => {
        const y = window.__brumaluz!.camera!.yawCorpo();
        return Math.abs(Math.atan2(Math.sin(y), Math.cos(y)));
      }),
    )
    .toBeLessThan(0.6);
  // fora do alcance (contado dos olhos): nada na mira
  await page.evaluate(() => window.__brumaluz!.apontar!(0, -0.2));
  await expect.poll(() => page.evaluate(() => window.__brumaluz!.alvo)).toBeNull();
  expect(erros, erros.join('\n')).toEqual([]);
});

test('celular: pinça aproxima e afasta, arrastar gira e tocar coloca no ponto', async ({
  browser,
}) => {
  test.setTimeout(240_000);
  const { ctx, page, erros } = await celular(browser);
  const c = await noAr(page);
  await page.evaluate(() => window.__brumaluz!.apontar!(0, 0.5));
  await page.waitForTimeout(500);
  const zoom = () => page.evaluate(() => window.__brumaluz!.camera!.zoom());
  const z0 = await zoom();
  // dois dedos na tela: abrir aproxima (a câmera chega perto), fechar afasta
  const pinca = (de: number, para: number) =>
    page.evaluate(
      ([de, para]) => {
        const el = document.querySelector<HTMLElement>('[data-toque] .olhar')!;
        const cx = 420;
        const cy = 200;
        const ev = (tipo: string, id: number, x: number) =>
          el.dispatchEvent(
            new PointerEvent(tipo, {
              pointerId: id,
              pointerType: 'touch',
              clientX: x,
              clientY: cy,
              bubbles: true,
              isPrimary: id === 11,
            }),
          );
        ev('pointerdown', 11, cx - de);
        ev('pointerdown', 12, cx + de);
        for (let i = 1; i <= 8; i++) {
          const d = de + ((para - de) * i) / 8;
          ev('pointermove', 11, cx - d);
          ev('pointermove', 12, cx + d);
        }
        ev('pointerup', 11, cx - para);
        ev('pointerup', 12, cx + para);
      },
      [de, para],
    );
  await pinca(40, 120);
  await expect.poll(zoom).toBeLessThan(z0 - 0.5);
  const perto = await zoom();
  await pinca(120, 30);
  await expect.poll(zoom).toBeGreaterThan(perto + 0.5);
  // a pinça não colocou nem quebrou nada
  expect(await page.evaluate(() => window.__brumaluz!.mineracao!.segurando)).toBe(false);
  // arrastar gira a câmera (e não o corpo)
  const yaw0 = await page.evaluate(() => window.__brumaluz!.rotacao![1]);
  const corpo0 = await page.evaluate(() => window.__brumaluz!.camera!.yawCorpo());
  await page.evaluate(() => {
    const el = document.querySelector<HTMLElement>('[data-toque] .olhar')!;
    const ev = (tipo: string, x: number) =>
      el.dispatchEvent(
        new PointerEvent(tipo, {
          pointerId: 21,
          pointerType: 'touch',
          clientX: x,
          clientY: 200,
          bubbles: true,
        }),
      );
    ev('pointerdown', 500);
    for (let i = 1; i <= 10; i++) ev('pointermove', 500 + i * 12);
    ev('pointerup', 620);
  });
  await expect.poll(() => page.evaluate(() => window.__brumaluz!.rotacao![1])).not.toBe(yaw0);
  expect(await page.evaluate(() => window.__brumaluz!.camera!.yawCorpo())).toBeCloseTo(corpo0, 3);
  // tocar no chão na frente do boneco coloca o bloco ali (mira pelo dedo, a partir do boneco)
  await page.evaluate(() => window.__brumaluz!.apontar!(0, 0.55));
  await page.evaluate(() => window.__brumaluz!.selecionarSlot!(1));
  await page.waitForTimeout(500);
  // o ponto da tela do chão 2 blocos à frente
  const ponto = await page.evaluate(
    (c) => window.__brumaluz!.telaDoPonto?.(c.x + 0.5, c.y, c.z + 2.5),
    c,
  );
  expect(ponto).toBeTruthy();
  await page.touchscreen.tap(ponto!.x, ponto!.y);
  await expect
    .poll(() => page.evaluate((c) => window.__brumaluz!.bloco!(c.x, c.y, c.z + 2), c))
    .not.toBe(0);
  expect(erros, erros.join('\n')).toEqual([]);
  await ctx.close();
});
