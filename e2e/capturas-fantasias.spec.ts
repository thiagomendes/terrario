import { expect, test, type Page } from '@playwright/test';

import { PASTA_CAPTURAS } from '../playwright.config';

/**
 * Capturas das fantasias no jogo (spec 017, T03): cada fantasia na menina (rabo de cavalo e
 * cílios) e no menino (curto com topete), de frente e de costas, e o movimento (correndo,
 * sentado, comemorando) para ver a capa e a saia balançando sem atravessar. Para comparar
 * com o esboço aprovado. A pasta pode ser trocada por FANTASIAS_PASTA.
 */
declare const process: { env: Record<string, string | undefined> };
const PASTA = process.env.FANTASIAS_PASTA ?? `${PASTA_CAPTURAS}/fantasias`;

const IDS = [
  'realeza-flores',
  'realeza-estrelas',
  'realeza-mar',
  'realeza-neve',
  'heroi-relampago',
  'heroi-estrela',
  'heroi-coracao',
  'heroi-mata',
  'fazendeira',
  'vaqueira',
  'astronauta',
  'dino',
  'confeiteira',
  'cientista',
  'guardia-mata',
  'lanterneira',
];
const QUEM = {
  menina: { corpo: 'feminino', cabeloEstilo: 5, rosto: 1, cabeloCor: 1, pele: 1 },
  menino: { corpo: 'masculino', cabeloEstilo: 0, rosto: 0, cabeloCor: 0, pele: 2 },
} as const;

/** Laje de pedra limpa em volta do jogador, de dia (campo limpo para as capturas). */
async function entrarNaLaje(page: Page) {
  await page.goto('/');
  await page.waitForFunction(() => window.__brumaluz?.ready === true, undefined, {
    timeout: 120_000,
  });
  await page.evaluate(async () => {
    document.querySelector('.entrada')?.setAttribute('hidden', '');
    const e = window.__brumaluz!;
    e.pausarDia = true;
    e.hora = 0.42;
    const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));
    const [x0, , z0] = e.posicao!;
    const fx = Math.floor(x0);
    const fz = Math.floor(z0);
    e.teleportar!(fx + 0.5, fz + 0.5);
    await espera(1500);
    const fy = Math.floor(e.posicao![1]);
    for (let dx = -9; dx <= 9; dx++)
      for (let dz = -9; dz <= 9; dz++) {
        e.definirBloco!(fx + dx, fy - 1, fz + dz, 45);
        for (let dy = 0; dy < 5; dy++) e.definirBloco!(fx + dx, fy + dy, fz + dz, 0);
      }
    e.teleportar!(fx + 0.5, fz + 0.5, fy);
    await espera(600);
    await e.sincronizar!();
    e.camera?.definirZoom(3.6);
    e.apontar!(0, 0.12);
    // sem os botões e avisos por cima (como no modo foto)
    document.body.classList.add('modo-foto');
  });
}

/** Recorte em volta do boneco do jogador (com a câmera da laje). */
async function recorte(_page: Page) {
  return { x: 400, y: 220, width: 480, height: 500 };
}

test('fantasias na menina e no menino, de frente e de costas', async ({ page }) => {
  test.setTimeout(600_000);
  await page.setViewportSize({ width: 1280, height: 720 });
  const erros: string[] = [];
  page.on('pageerror', (e) => erros.push(`pageerror: ${e.message}`));
  await entrarNaLaje(page);
  await page.waitForTimeout(1200);
  for (const [quem, base] of Object.entries(QUEM))
    for (const id of IDS) {
      await page.evaluate(
        ({ base, id }) =>
          window.__brumaluz!.personagem!.definir({
            ...base,
            fantasia: { id, cor: 0 },
          } as never),
        { base, id },
      );
      for (const [vista, giro] of [
        ['frente', Math.PI * 0.82],
        ['costas', -0.55],
      ] as const) {
        await page.evaluate((g) => window.__brumaluz!.personagem!.girarCorpo?.(g), giro);
        await page.waitForTimeout(450);
        await page.screenshot({
          path: `${PASTA}/${id}-${quem}-${vista}.png`,
          clip: await recorte(page),
        });
      }
    }
  expect(erros, erros.join('\n')).toEqual([]);
});

test('capa, saia e rabo em movimento (correndo, sentado, comemorando)', async ({ page }) => {
  test.setTimeout(600_000);
  await page.setViewportSize({ width: 1280, height: 720 });
  const erros: string[] = [];
  page.on('pageerror', (e) => erros.push(`pageerror: ${e.message}`));
  await entrarNaLaje(page);
  await page.waitForTimeout(1000);
  const casos = [
    ['heroi-estrela', 'menina'],
    ['heroi-relampago', 'menino'],
    ['realeza-flores', 'menina'],
    ['realeza-estrelas', 'menino'],
    ['dino', 'menina'],
    ['guardia-mata', 'menino'],
  ] as const;
  for (const [id, quem] of casos) {
    await page.evaluate(
      ({ base, id }) =>
        window.__brumaluz!.personagem!.definir({ ...base, fantasia: { id, cor: 0 } } as never),
      { base: QUEM[quem], id },
    );
    await page.evaluate(() => window.__brumaluz!.personagem!.girarCorpo?.(0));
    await page.waitForTimeout(400);
    // correndo de lado (para a direita da câmera), indo e voltando na laje
    for (const [k, dir] of [
      [0, 1],
      [1, -1],
    ] as const) {
      await page.evaluate((d) => {
        const c = window.__brumaluz!.controleDireto!;
        c.tecla('correr', true);
        c.mover(0, d);
      }, dir);
      await page.waitForTimeout(650);
      await page.screenshot({ path: `${PASTA}/mov-${id}-${quem}-correndo${k}.png` });
      await page.evaluate(() => {
        const c = window.__brumaluz!.controleDireto!;
        c.mover(0, 0);
        c.tecla('correr', false);
      });
      await page.waitForTimeout(500);
    }
    for (const [g, ms] of [
      ['sentar', 1200],
      ['comemorar', 520],
      ['dancar', 900],
    ] as const) {
      await page.evaluate(() => window.__brumaluz!.personagem!.girarCorpo?.(Math.PI * 0.75));
      await page.evaluate((g) => window.__brumaluz!.gestos!.fazer(g as never), g);
      await page.waitForTimeout(ms);
      await page.screenshot({
        path: `${PASTA}/mov-${id}-${quem}-${g}.png`,
        clip: await recorte(page),
      });
      if (g === 'sentar') {
        await page.evaluate(() => window.__brumaluz!.controleDireto!.mover(1, 0));
        await page.waitForTimeout(120);
        await page.evaluate(() => window.__brumaluz!.controleDireto!.mover(0, 0));
      }
      await page.waitForTimeout(3300 - ms);
    }
  }
  expect(erros, erros.join('\n')).toEqual([]);
});

test('quatro amigos fantasiados na tela', async ({ page }) => {
  test.setTimeout(300_000);
  await page.setViewportSize({ width: 1280, height: 720 });
  const erros: string[] = [];
  page.on('pageerror', (e) => erros.push(`pageerror: ${e.message}`));
  await entrarNaLaje(page);
  await page.evaluate(() => {
    const e = window.__brumaluz!;
    const [x, y, z] = e.posicao!;
    const amigos = [
      ['a', { corpo: 'feminino', cabeloEstilo: 2, fantasia: { id: 'realeza-flores', cor: 0 } }],
      ['b', { corpo: 'masculino', cabeloEstilo: 1, fantasia: { id: 'heroi-relampago', cor: 0 } }],
      ['c', { corpo: 'feminino', cabeloEstilo: 7, fantasia: { id: 'heroi-coracao', cor: 1 } }],
      ['d', { corpo: 'masculino', cabeloEstilo: 4, fantasia: { id: 'realeza-mar', cor: 0 } }],
    ] as const;
    e.amigosDeTeste!(
      amigos.map(([id, ap], i) => ({
        id,
        aparencia: ap as Record<string, unknown>,
        x: x - 2.4 + i * 1.6,
        y,
        z: z + 3,
        yaw: Math.PI,
      })),
    );
  });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${PASTA}/amigos.png` });
  expect(erros, erros.join('\n')).toEqual([]);
});
