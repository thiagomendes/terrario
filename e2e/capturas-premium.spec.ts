import { expect, test, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';

/**
 * Spec 023 (fase C): capturas dos premium no jogo de verdade, para revisar como foto de loja:
 * cada um na menina e no menino, de frente, de costas e de lado, perto (câmera de estúdio do
 * modo foto); o movimento (pegadas do tênis, asas batendo, capa correndo); os bichinhos na
 * vitrine, seguindo e de longe (12 blocos); os quadros do giro para o vídeo (PREMIUM_GIRO=1).
 * Pasta: PREMIUM_PASTA (padrão capturas-023c). Só um teste: PREMIUM_SO=vestidos|movimento|bichos.
 */
declare const process: { env: Record<string, string | undefined> };
const PASTA = process.env.PREMIUM_PASTA ?? 'capturas-023c';
const SO = process.env.PREMIUM_SO;
const GIRO = !!process.env.PREMIUM_GIRO;
const QUEM = {
  menina: { corpo: 'feminino', cabeloEstilo: 5, rosto: 1, cabeloCor: 1, pele: 1, roupaEstilo: 6 },
  menino: { corpo: 'masculino', cabeloEstilo: 0, rosto: 0, cabeloCor: 0, pele: 2, roupaEstilo: 0 },
} as const;
const VESTIVEIS: Array<[string, Record<string, string>]> = [
  ['camiseta', { roupa: 'camiseta-arco-iris' }],
  ['tenis', { roupa: 'tenis-cometa' }],
  ['capa', { costas: 'capa-estrelas' }],
  ['dragao', { fantasia: 'dragao' }],
];
type V3 = [number, number, number];
const RECORTE = { x: 340, y: 60, width: 600, height: 600 };

/** Laje de grama limpa em volta do jogador, de dia (campo limpo para as capturas). */
async function entrarNaLaje(page: Page) {
  await page.goto('/');
  await page.waitForFunction(() => window.__brumaluz?.ready === true, undefined, {
    timeout: 180_000,
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
    for (let dx = -18; dx <= 18; dx++)
      for (let dz = -18; dz <= 18; dz++) {
        e.definirBloco!(fx + dx, fy - 1, fz + dz, 1);
        for (let dy = 0; dy < 6; dy++) e.definirBloco!(fx + dx, fy + dy, fz + dz, 0);
      }
    e.teleportar!(fx + 0.5, fz + 0.5, fy);
    (window as unknown as { __laje: V3 }).__laje = [fx + 0.5, fy, fz + 0.5];
    await espera(600);
    await e.sincronizar!();
    e.camera?.definirZoom(3.2);
    e.apontar!(0, 0.1);
    document.body.classList.add('modo-foto');
    // a câmera de estúdio é a do modo foto: sem o painel dele nas capturas
    const st = document.createElement('style');
    st.textContent = '.painel-foto, .grade-foto, .flash-foto { display: none !important; }';
    document.head.append(st);
  });
}

async function vestir(page: Page, base: object, premium: Record<string, string> | undefined) {
  await page.evaluate(
    ({ base, premium }) => window.__brumaluz!.personagem!.definir({ ...base, premium } as never),
    { base, premium },
  );
}

/**
 * Câmera de estúdio (modo foto): olhando para `alvo` de `dist` blocos, do ângulo `ang` em volta
 * dele (0: do lado +z do mundo) e `alt` acima do alvo.
 */
async function estudio(page: Page, alvo: V3, ang: number, dist: number, alt: number) {
  await page.evaluate(
    ({ alvo, ang, dist, alt }) => {
      const e = window.__brumaluz!;
      if (!e.modoFoto!.ativo()) e.modoFoto!.alternar();
      const x = alvo[0] + Math.sin(ang) * dist;
      const z = alvo[2] + Math.cos(ang) * dist;
      e.modoFoto!.posicionar!(x, alvo[1] + alt, z);
      e.apontar!(ang + Math.PI, Math.atan2(alt, dist));
    },
    { alvo, ang, dist, alt },
  );
}

async function sairDoEstudio(page: Page) {
  await page.evaluate(() => {
    const e = window.__brumaluz!;
    if (e.modoFoto!.ativo()) e.modoFoto!.alternar();
    document.body.classList.add('modo-foto');
  });
}

/** O jogador parado no meio da laje. */
async function noMeio(page: Page): Promise<V3> {
  return page.evaluate(() => {
    const e = window.__brumaluz!;
    const l = (window as unknown as { __laje: V3 }).__laje;
    e.teleportar!(l[0], l[2], l[1]);
    return l;
  });
}

/** Para onde o corpo do jogador está virado (rad, como o giro da câmera de estúdio). */
async function yawDoCorpo(page: Page): Promise<number> {
  return page.evaluate(() => window.__brumaluz!.camera!.yawCorpo());
}

test('premium vestidos: menina e menino, de frente, de costas e de lado', async ({ page }) => {
  test.skip(!!SO && SO !== 'vestidos');
  test.setTimeout(900_000);
  mkdirSync(PASTA, { recursive: true });
  await page.setViewportSize({ width: 1280, height: 720 });
  const erros: string[] = [];
  page.on('pageerror', (e) => erros.push(`pageerror: ${e.message}`));
  await entrarNaLaje(page);
  const l = await noMeio(page);
  await page.waitForTimeout(1000);
  const corpo = await yawDoCorpo(page);
  for (const [quem, base] of Object.entries(QUEM))
    for (const [nome, premium] of VESTIVEIS) {
      await vestir(page, base, premium);
      const pes = nome === 'tenis';
      const alvo: V3 = [l[0], l[1] + (pes ? 0.28 : 1.0), l[2]];
      for (const [vista, giro] of [
        ['frente', 0],
        ['tres-quartos', 0.75],
        ['lado', Math.PI / 2],
        ['costas', Math.PI],
      ] as const) {
        await estudio(page, alvo, corpo + giro, pes ? 1.7 : 3.0, pes ? 0.32 : 0.55);
        await page.waitForTimeout(450);
        await page.screenshot({ path: `${PASTA}/${nome}-${quem}-${vista}.png`, clip: RECORTE });
      }
    }
  // o giro do dragão (quadros para o vídeo)
  if (GIRO) {
    await vestir(page, QUEM.menina, { fantasia: 'dragao' });
    mkdirSync(`${PASTA}/giro-dragao`, { recursive: true });
    for (let i = 0; i < 90; i++) {
      await estudio(page, [l[0], l[1] + 1.0, l[2]], corpo + (i / 90) * Math.PI * 2, 3.2, 0.6);
      await page.waitForTimeout(70);
      await page.screenshot({
        path: `${PASTA}/giro-dragao/${String(i).padStart(3, '0')}.jpg`,
        clip: RECORTE,
        type: 'jpeg',
        quality: 92,
      });
    }
  }
  await sairDoEstudio(page);
  expect(erros, erros.join('\n')).toEqual([]);
});

test('premium em movimento: pegadas, asas e capa correndo', async ({ page }) => {
  test.skip(!!SO && SO !== 'movimento');
  test.setTimeout(600_000);
  mkdirSync(PASTA, { recursive: true });
  await page.setViewportSize({ width: 1280, height: 720 });
  const erros: string[] = [];
  page.on('pageerror', (e) => erros.push(`pageerror: ${e.message}`));
  await entrarNaLaje(page);
  for (const [nome, premium, quem] of [
    ['tenis', { roupa: 'tenis-cometa' }, 'menina'],
    ['capa', { costas: 'capa-estrelas', roupa: 'camiseta-arco-iris' }, 'menino'],
    ['dragao', { fantasia: 'dragao', roupa: 'tenis-cometa' }, 'menina'],
  ] as const) {
    await noMeio(page);
    await vestir(page, QUEM[quem], premium);
    await page.evaluate(() => window.__brumaluz!.apontar!(0, 0.1));
    await page.waitForTimeout(500);
    // parado (as asas batem devagar)
    await page.screenshot({ path: `${PASTA}/mov-${nome}-parado.png` });
    for (const [k, dir] of [
      [0, 1],
      [1, -1],
    ] as const) {
      await page.evaluate((d) => {
        const c = window.__brumaluz!.controleDireto!;
        c.tecla('correr', true);
        c.mover(0, d);
      }, dir);
      await page.waitForTimeout(800);
      await page.screenshot({ path: `${PASTA}/mov-${nome}-correndo${k}.png` });
      await page.evaluate(() => {
        const c = window.__brumaluz!.controleDireto!;
        c.mover(0, 0);
        c.tecla('correr', false);
      });
      await page.waitForTimeout(700);
    }
    // pulo (anel de estrelinhas ao cair; asas fortes no ar)
    await page.evaluate(() => window.__brumaluz!.controleDireto!.tecla('pular', true));
    await page.waitForTimeout(260);
    await page.screenshot({ path: `${PASTA}/mov-${nome}-pulo.png` });
    await page.evaluate(() => window.__brumaluz!.controleDireto!.tecla('pular', false));
    await page.waitForTimeout(480);
    await page.screenshot({ path: `${PASTA}/mov-${nome}-caiu.png` });
    await page.waitForTimeout(800);
  }
  const ef = await page.evaluate(() => window.__brumaluz!.personagem!.efeitosPremium?.());
  expect(ef?.pegadas ?? 0).toBeGreaterThan(2);
  expect(erros, erros.join('\n')).toEqual([]);
});

test('bichinhos premium: vitrine, seguindo e de longe', async ({ page }) => {
  test.skip(!!SO && SO !== 'bichos');
  test.setTimeout(900_000);
  mkdirSync(PASTA, { recursive: true });
  await page.setViewportSize({ width: 1280, height: 720 });
  const erros: string[] = [];
  page.on('pageerror', (e) => erros.push(`pageerror: ${e.message}`));
  await entrarNaLaje(page);
  const l = await noMeio(page);
  // a vitrine: o bicho sozinho a uns blocos do jogador (que fica fora do quadro)
  const v: V3 = [l[0] + 6, l[1], l[2] + 6];
  for (const bicho of ['unicornio', 'pinguim'] as const) {
    await page.evaluate(
      ({ bicho, v }) => window.__brumaluz!.personagem!.vitrineBicho!(bicho, v[0], v[1], v[2], 0),
      { bicho, v },
    );
    const alto = bicho === 'unicornio' ? 0.75 : 0.45;
    const dist = bicho === 'unicornio' ? 2.6 : 1.8;
    for (const [vista, giro] of [
      ['frente', 0],
      ['tres-quartos', 0.75],
      ['lado', Math.PI / 2],
      ['costas', Math.PI * 0.82],
    ] as const) {
      await estudio(page, [v[0], v[1] + alto, v[2]], giro, dist, 0.45);
      await page.waitForTimeout(900);
      await page.screenshot({ path: `${PASTA}/${bicho}-${vista}.png`, clip: RECORTE });
    }
    if (GIRO) {
      mkdirSync(`${PASTA}/giro-${bicho}`, { recursive: true });
      for (let i = 0; i < 90; i++) {
        await estudio(page, [v[0], v[1] + alto, v[2]], (i / 90) * Math.PI * 2, dist, 0.45);
        await page.waitForTimeout(70);
        await page.screenshot({
          path: `${PASTA}/giro-${bicho}/${String(i).padStart(3, '0')}.jpg`,
          clip: RECORTE,
          type: 'jpeg',
          quality: 92,
        });
      }
    }
    await page.evaluate(() => window.__brumaluz!.personagem!.vitrineBicho!(null));
  }
  await sairDoEstudio(page);
  for (const [bicho, quem] of [
    ['unicornio', 'menina'],
    ['pinguim', 'menino'],
  ] as const) {
    await noMeio(page);
    await vestir(page, QUEM[quem], { bicho });
    await page.evaluate(() => window.__brumaluz!.apontar!(0, 0.1));
    await page.waitForTimeout(2500);
    const b = await page.evaluate(() => window.__brumaluz!.personagem!.bichoPremium?.());
    expect(b?.id).toBe(bicho);
    expect(b?.chamadas ?? 99).toBeLessThanOrEqual(6);
    // seguindo: a câmera de estúdio na frente dos dois
    const corpo = await yawDoCorpo(page);
    await estudio(page, [l[0], l[1] + 0.8, l[2]], corpo + 0.5, 4.2, 0.9);
    await page.waitForTimeout(900);
    await page.screenshot({ path: `${PASTA}/${bicho}-junto.png` });
    await sairDoEstudio(page);
    // de longe: um amigo com o mesmo bicho a 12 blocos da câmera, na frente dela
    await page.evaluate((bicho) => {
      const e = window.__brumaluz!;
      const [cx, , cz] = e.camera!.posicao();
      const [px, , pz] = e.posicao!;
      const py = (window as unknown as { __laje: V3 }).__laje[1];
      const dx = px - cx;
      const dz = pz - cz;
      const d = Math.hypot(dx, dz) || 1;
      const x = cx + (dx / d) * 12;
      const z = cz + (dz / d) * 12;
      e.amigosDeTeste!([
        {
          id: 'longe',
          aparencia: { corpo: 'feminino', cabeloEstilo: 2, premium: { bicho } },
          x: x - (dz / d) * 1.5,
          y: py,
          z: z + (dx / d) * 1.5,
          yaw: Math.atan2(cx - x, cz - z),
        },
      ]);
    }, bicho);
    await page.waitForTimeout(2500);
    await page.screenshot({ path: `${PASTA}/${bicho}-longe.png` });
    await page.evaluate(() => window.__brumaluz!.amigosDeTeste!([]));
    // correndo atrás e voltando
    await page.evaluate(() => {
      const c = window.__brumaluz!.controleDireto!;
      c.tecla('correr', true);
      c.mover(0, 1);
    });
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${PASTA}/${bicho}-correndo.png` });
    await page.evaluate(() => window.__brumaluz!.controleDireto!.mover(0, -1));
    await page.waitForTimeout(800);
    await page.evaluate(() => {
      const c = window.__brumaluz!.controleDireto!;
      c.mover(0, 0);
      c.tecla('correr', false);
    });
    await page.waitForTimeout(1800);
    // comemorar (o pinguim bate as asinhas; o unicórnio solta corações quando ela para perto)
    await page.evaluate(() => window.__brumaluz!.gestos!.fazer('comemorar' as never));
    await page.waitForTimeout(150);
    const c2 = await yawDoCorpo(page);
    await estudio(page, [l[0], l[1] + 0.8, l[2]], c2 + 0.5, 4.2, 0.9);
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${PASTA}/${bicho}-comemorar.png` });
    await page.waitForTimeout(1500);
    await sairDoEstudio(page);
  }
  expect(erros, erros.join('\n')).toEqual([]);
});

test('capuz do dragão: os dois bonecos, todos os penteados, em volta', async ({ page }) => {
  test.skip(!!SO && SO !== 'capuz');
  test.setTimeout(900_000);
  mkdirSync(`${PASTA}/capuz`, { recursive: true });
  await page.setViewportSize({ width: 1280, height: 720 });
  const erros: string[] = [];
  page.on('pageerror', (e) => erros.push(`pageerror: ${e.message}`));
  await entrarNaLaje(page);
  const l = await noMeio(page);
  await page.waitForTimeout(1000);
  const corpo = await yawDoCorpo(page);
  for (const [quem, base] of Object.entries(QUEM))
    for (let cabelo = 0; cabelo < 9; cabelo++) {
      await vestir(page, { ...base, cabeloEstilo: cabelo }, { fantasia: 'dragao' });
      for (const [vista, giro] of [
        ['frente', 0],
        ['quina', 0.8],
        ['lado', Math.PI / 2],
        ['costas', Math.PI],
      ] as const) {
        await estudio(page, [l[0], l[1] + 1.35, l[2]], corpo + giro, 2.0, 0.35);
        await page.waitForTimeout(250);
        await page.screenshot({
          path: `${PASTA}/capuz/${quem}-cabelo${cabelo}-${vista}.png`,
          clip: { x: 440, y: 110, width: 400, height: 400 },
        });
      }
    }
  await sairDoEstudio(page);
  expect(erros, erros.join('\n')).toEqual([]);
});

test('4 amigos de premium juntos (o dragão, a capa, o unicórnio e o pinguim)', async ({ page }) => {
  test.skip(!!SO && SO !== 'amigos');
  test.setTimeout(600_000);
  mkdirSync(PASTA, { recursive: true });
  await page.setViewportSize({ width: 1280, height: 720 });
  const erros: string[] = [];
  page.on('pageerror', (e) => erros.push(`pageerror: ${e.message}`));
  await entrarNaLaje(page);
  const l = await noMeio(page);
  const corpo = await yawDoCorpo(page);
  // os quatro amigos em meia-lua na frente da criança; a câmera do outro lado, olhando para eles
  await page.evaluate(
    ({ l, corpo }) => {
      const e = window.__brumaluz!;
      const fx = Math.sin(corpo);
      const fz = Math.cos(corpo);
      const lx = Math.cos(corpo);
      const lz = -Math.sin(corpo);
      const amigos = [
        ['lia', { corpo: 'feminino', cabeloEstilo: 5, cabeloCor: 1, premium: { roupa: 'tenis-cometa', fantasia: 'dragao', bicho: 'unicornio' } }, -2.4, 4.2],
        ['theo', { corpo: 'masculino', cabeloEstilo: 0, premium: { roupa: 'camiseta-arco-iris', costas: 'capa-estrelas', bicho: 'pinguim' } }, -0.8, 3.4],
        ['bia', { corpo: 'feminino', cabeloEstilo: 2, premium: { roupa: 'tenis-cometa', costas: 'capa-estrelas', bicho: 'unicornio' } }, 0.8, 3.4],
        ['gui', { corpo: 'masculino', cabeloEstilo: 1, premium: { roupa: 'camiseta-arco-iris', fantasia: 'dragao', bicho: 'pinguim' } }, 2.4, 4.2],
      ] as const;
      e.amigosDeTeste!(
        amigos.map(([id, aparencia, lado, frente]) => ({
          id,
          aparencia: aparencia as never,
          x: l[0] + fx * frente + lx * lado,
          y: l[1],
          z: l[2] + fz * frente + lz * lado,
          // de quina para a câmera (a capa e as asas aparecem)
          yaw: corpo + (lado < 0 ? 0.45 : -0.45),
        })),
      );
    },
    { l, corpo },
  );
  await page.waitForTimeout(3500);
  await estudio(page, [l[0] + Math.sin(corpo) * 3.6, l[1] + 0.9, l[2] + Math.cos(corpo) * 3.6], corpo, 5.4, 1.5);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${PASTA}/amigos-4-premium.png` });
  await estudio(page, [l[0] + Math.sin(corpo) * 3.6, l[1] + 0.9, l[2] + Math.cos(corpo) * 3.6], corpo + 0.7, 5.4, 1.3);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${PASTA}/amigos-4-premium-quina.png` });
  await sairDoEstudio(page);
  expect(erros, erros.join('\n')).toEqual([]);
});
