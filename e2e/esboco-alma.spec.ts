import { test, type Browser, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';

/**
 * Esboço da spec 023 "Alma do jogo" (`src/esboco/alma.ts`, só com `?esboco=alma`).
 * Só roda com ESBOCO_ALMA=1, na placa de vídeo (scripts/e2e-gpu.sh). Pasta: ESBOCO_PASTA.
 */
declare const process: { env: Record<string, string | undefined> };
const PASTA = process.env.ESBOCO_PASTA ?? 'test-results/esboco023';
test.skip(!process.env.ESBOCO_ALMA, 'esboço: só com ESBOCO_ALMA=1');
test.setTimeout(900_000);

export const CELULAR = {
  viewport: { width: 844, height: 390 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
};
export const COMPUTADOR = { viewport: { width: 1280, height: 720 } };

export async function abrir(browser: Browser, tema: string, celular: boolean, esboco = true) {
  const ctx = await browser.newContext(celular ? CELULAR : COMPUTADOR);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log(`erro na página: ${String(e)}`));
  page.on('console', (m) => {
    if (m.text().startsWith('alma')) console.log(m.text().slice(0, 1500));
  });
  await page.addInitScript(() => {
    try {
      localStorage.setItem(
        'terrario:config',
        JSON.stringify({ distancia: 4, mostrarFps: false, mostrarAtalhos: false }),
      );
    } catch {
      // sem armazenamento
    }
  });
  await page.goto(`/?tema=${tema}${esboco ? '&esboco=alma' : ''}`);
  await page.waitForFunction(() => window.__brumaluz?.ready === true, undefined, {
    timeout: 240_000,
  });
  await page.evaluate(() => {
    document.querySelector<HTMLElement>('.entrada')?.setAttribute('hidden', '');
    const e = window.__brumaluz!;
    e.pausarDia = true;
    e.hora = 0.42;
    e.definirClima?.('limpo');
    window.dispatchEvent(new Event('resize'));
  });
  await assentar(page);
  await olharAtividade(page);
  return page;
}

/** Vira a câmera para a atividade: a obra 1 na cidade, o sítio mais perto no Rancho. */
export async function olharAtividade(page: Page) {
  await page.evaluate(() => {
    const e = window.__brumaluz!;
    const plano = e.cidade?.();
    let alvo: [number, number, number] | null = null;
    if (plano) {
      const l = plano.lotes.find((q) => q.canteiro === 1);
      if (l) alvo = [l.x0 + 4, plano.h + 1, l.z0 + 4.5];
    } else {
      const [x, y, z] = e.posicao!;
      const p = (e.povoados?.() ?? []).sort((a, b) => Math.hypot(a.cx - x, a.cz - z) - Math.hypot(b.cx - x, b.cz - z))[0];
      if (p) alvo = [p.cx, Math.max(p.h, y), p.cz];
    }
    if (alvo) e.mirarPonto?.(...alvo);
  });
  await page.waitForTimeout(800);
}

export async function assentar(page: Page, minimo = 16) {
  let antes = -1;
  for (let i = 0; i < 30; i++) {
    await page.waitForTimeout(1500);
    const n = await page.evaluate(() => window.__brumaluz!.chunksCarregados ?? 0);
    if (n === antes && n >= minimo) break;
    antes = n;
  }
  await page.waitForTimeout(800);
}

export async function foto(page: Page, nome: string) {
  mkdirSync(PASTA, { recursive: true });
  await page.screenshot({ path: `${PASTA}/${nome}.png` });
}

(process.env.ESBOCO_BASE ? test : test.skip)('base: o HUD de hoje', async ({ browser }) => {
  for (const tema of ['cidade-grande', 'rancho-alegre'])
    for (const celular of [true, false]) {
      const page = await abrir(browser, tema, celular, false);
      await foto(page, `base-${tema}-${celular ? 'cel' : 'pc'}`);
      await page.context().close();
    }
});

/** Some os avisos de boas-vindas (eles cobrem o meio da tela nas fotos). */
async function semAvisos(page: Page) {
  await page.addStyleTag({ content: '.toast-area { display: none !important; }' });
}

const tocarOuClicar = async (page: Page, sel: string, celular: boolean) => {
  const l = page.locator(sel).first();
  if (celular) await l.tap();
  else await l.click();
  await page.waitForTimeout(500);
};

/** Estado de meio de caminho: algumas missões feitas, moedas, XP e pontos. */
const MEIO: Record<string, { crianca: Record<string, unknown>; mundo: Record<string, unknown> }> = {
  'cidade-grande': {
    crianca: { moedas: 23, xp: 130, pontos: { construtor: 21, explorador: 7, bichos: 6, fazendeiro: 9, cozinheiro: 4 }, fantasias: ['capacete-obra', 'caipira'], premium: ['tenis-cometa'], vestidos: { roupa: 'tenis-cometa' } },
    mundo: { feitas: ['c1', 'c2', 'c3'], fixada: 'c4', progresso: { c4: 0.45 } },
  },
  'rancho-alegre': {
    crianca: { moedas: 23, xp: 130, pontos: { construtor: 21, explorador: 7, bichos: 16, fazendeiro: 33, cozinheiro: 4 }, fantasias: ['capacete-obra', 'caipira'], premium: ['tenis-cometa'], vestidos: { roupa: 'tenis-cometa' } },
    mundo: { feitas: ['r1', 'r2', 'r3'], fixada: 'r4', progresso: { r4: 1, r6: 1 } },
  },
};

async function zerarAlma(page: Page) {
  await page.evaluate(() => window.__alma!.zerar());
}

(process.env.ESBOCO_FOTOS ? test : test.skip)('fotos: missões, baú, banca, vitrine e festas', async ({ browser }) => {
  const temas = (process.env.ESBOCO_TEMAS ?? 'cidade-grande,rancho-alegre').split(',');
  const aparelhos = (process.env.ESBOCO_APARELHOS ?? 'cel,pc').split(',');
  for (const tema of temas)
    for (const ap of aparelhos) {
      const celular = ap === 'cel';
      const page = await abrir(browser, tema, celular);
      await semAvisos(page);
      const n = (s: string) => `${tema === 'cidade-grande' ? 'cidade' : 'rancho'}-${ap}-${s}`;
      // 1. o quadro aparece sozinho na primeira vez: o prêmio antes de começar
      await page.waitForSelector('[data-alma-quadro]', { timeout: 20_000 });
      await page.waitForTimeout(1500);
      await foto(page, n('01-quadro'));
      await tocarOuClicar(page, '[data-alma-jogar]', celular);
      await page.waitForTimeout(900);
      await foto(page, n('02-hud'));
      // meio do caminho e as telas do baú
      await page.evaluate((m) => window.__alma!.definir(m as never), MEIO[tema]);
      await page.waitForTimeout(600);
      await foto(page, n('03-hud-meio'));
      await tocarOuClicar(page, '[data-alma-carteira]', celular);
      await page.waitForTimeout(1500);
      await foto(page, n('04-album'));
      await tocarOuClicar(page, '[data-alma-aba=nivel]', celular);
      await page.waitForTimeout(900);
      await foto(page, n('05-nivel'));
      await tocarOuClicar(page, '[data-alma-aba=habilidades]', celular);
      await foto(page, n('06-habilidades'));
      await tocarOuClicar(page, '[data-alma-aba=banca]', celular);
      await page.waitForTimeout(1000);
      await foto(page, n('07-banca'));
      await tocarOuClicar(page, '.alma-item.pode', celular);
      await page.waitForTimeout(700);
      await foto(page, n('08-banca-comprar'));
      await tocarOuClicar(page, '[data-alma-nao]', celular);
      await page.evaluate(() => window.__alma!.fechar());
      // a vitrine premium (pela roda do menu)
      await tocarOuClicar(page, '[data-botao-roda]', celular);
      await page.waitForTimeout(600);
      await foto(page, n('09-roda'));
      await tocarOuClicar(page, '[data-roda] [data-item=lojinha]', celular);
      await page.waitForTimeout(1600);
      await foto(page, n('10-vitrine'));
      await tocarOuClicar(page, '.alma-pcard[data-premium=dragao]', celular);
      await page.waitForTimeout(900);
      await foto(page, n('11-vitrine-dragao'));
      await page.evaluate(() => window.__alma!.fechar());
      // festa da missão (com estrela de habilidade) e a do nível
      await page.evaluate(() => window.__alma!.definir({ crianca: { xp: 92 } }));
      const fix = await page.evaluate(() => window.__alma!.mundoEst().fixada ?? window.__alma!.mundoEst().feitas[0]);
      await page.evaluate((id) => window.__alma!.progresso(id!, 99), fix);
      await page.waitForSelector('[data-alma-festa=missao]', { timeout: 10_000 });
      await page.waitForTimeout(tema === 'cidade-grande' ? 3600 : 1400);
      await page.waitForSelector('[data-alma-oba]', { timeout: 10_000 });
      await page.waitForTimeout(400);
      await foto(page, n('12-festa-missao'));
      await tocarOuClicar(page, '[data-alma-oba]', celular);
      await page.waitForSelector('[data-alma-festa=nivel]', { timeout: 15_000 });
      await page.waitForSelector('[data-alma-festa=nivel] [data-alma-oba]', { timeout: 10_000 });
      await page.waitForTimeout(500);
      await foto(page, n('13-festa-nivel'));
      await tocarOuClicar(page, '[data-alma-festa=nivel] [data-alma-oba]', celular);
      await page.waitForTimeout(2600);
      await foto(page, n('14-depois'));
      await page.context().close();
    }
});

// ------------------------------------------------------------------ vídeos (ESBOCO_VIDEO=1)
type V3 = [number, number, number];
type Fantasma = { x: number; y: number; z: number; bloco: number; canteiro: number };

async function abrirComVideo(browser: Browser, tema: string, celular: boolean) {
  const ctx = await browser.newContext({
    ...(celular ? CELULAR : COMPUTADOR),
    recordVideo: { dir: `${PASTA}/video-cru`, size: celular ? { width: 1266, height: 585 } : { width: 1280, height: 720 } },
  });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log(`erro na página: ${String(e)}`));
  page.on('console', (m) => {
    if (m.text().startsWith('alma')) console.log(m.text());
  });
  await page.addInitScript(() => {
    try {
      localStorage.setItem('terrario:config', JSON.stringify({ distancia: 4, mostrarFps: false, mostrarAtalhos: false }));
    } catch {
      // sem armazenamento
    }
  });
  await page.goto(`/?tema=${tema}&esboco=alma&semQuadro=1`);
  await page.waitForFunction(() => window.__brumaluz?.ready === true, undefined, { timeout: 240_000 });
  await page.evaluate(() => {
    document.querySelector<HTMLElement>('.entrada')?.setAttribute('hidden', '');
    const e = window.__brumaluz!;
    e.pausarDia = true;
    e.hora = 0.42;
    e.definirClima?.('limpo');
  });
  await semAvisos(page);
  await assentar(page);
  await olharAtividade(page);
  return page;
}

/** Enche um fantasma da obra (mira de pertinho, como no teste do canteiro). */
async function encherUm(page: Page, lista: Fantasma[]): Promise<boolean> {
  for (const f of lista.slice(0, 6))
    for (const [dx, dz, dy] of [
      [0, -2.6, 1.2], [0, 2.6, 1.2], [-2.6, 0, 1.2], [2.6, 0, 1.2],
      [0, -1.8, 2.8], [0, 1.8, 2.8], [-1.8, 0, 2.8], [1.8, 0, 2.8],
    ]) {
      const ok = await page.evaluate(
        ([f, dx, dz, dy]) => {
          const e = window.__brumaluz!;
          e.voar?.(true);
          e.teleportar!(f.x + 0.5 + dx, f.z + 0.5 + dz, f.y + dy);
          e.mirarPonto!(f.x + 0.5, f.y + 0.5, f.z + 0.5);
          return !!e.fantasmaNaMira?.();
        },
        [f, dx, dz, dy] as const,
      );
      if (!ok) continue;
      const antes = await page.evaluate(() => window.__brumaluz!.obraColocados ?? 0);
      await page.evaluate(() => window.__brumaluz!.usarOuColocar!());
      await page.waitForTimeout(120);
      if ((await page.evaluate(() => window.__brumaluz!.obraColocados ?? 0)) > antes) return true;
    }
  return false;
}

/** Câmera fixa olhando a obra do canteiro n (null: a câmera do jogo). */
async function camFixa(page: Page, n: number | null, dist = 10) {
  await page.evaluate(
    ([n, dist]) => {
      const w = window as unknown as {
        __camFixa?: { p: V3; a: V3 } | null;
        __camLigada?: boolean;
        __camOrbita?: { c: V3; r: number; h: number; a0: number; vel: number; t0: number; alvo: V3 } | null;
      };
      if (!w.__camLigada) {
        w.__camLigada = true;
        window.__brumaluz!.cenaBabylon!().onBeforeCameraRenderObservable.add((c) => {
          const o = w.__camOrbita;
          if (o) {
            const a = o.a0 + ((performance.now() - o.t0) / 1000) * o.vel;
            w.__camFixa = { p: [o.c[0] + Math.sin(a) * o.r, o.c[1] + o.h, o.c[2] + Math.cos(a) * o.r], a: o.alvo };
          }
          const f = w.__camFixa;
          if (!f) return;
          const cam = c as unknown as { position: { set(...a: number[]): void; clone(): { set(...a: number[]): unknown } }; setTarget(v: unknown): void };
          cam.position.set(...f.p);
          const alvo = cam.position.clone();
          alvo.set(...f.a);
          cam.setTarget(alvo);
          (c.getScene() as unknown as { setTransformMatrix(a: unknown, b: unknown): void }).setTransformMatrix(
            (c as unknown as { getViewMatrix(f: boolean): unknown }).getViewMatrix(true),
            (c as unknown as { getProjectionMatrix(f: boolean): unknown }).getProjectionMatrix(true),
          );
        });
      }
      if (n === null) {
        w.__camFixa = null;
        return;
      }
      const p = window.__brumaluz!.cidade!()!;
      const l = p.lotes.find((q) => q.canteiro === n)!;
      const cx = l.x0 + 4;
      const cz = l.z0 + 4.5;
      const s = l.porta === 'n' ? -1 : 1;
      w.__camFixa = { p: [cx - dist * 0.5, p.h + 5, cz + s * dist], a: [cx, p.h + 1.5, cz] };
    },
    [n, dist] as const,
  );
}

// ------------------------------------------------------------------ provador dos premium (ESBOCO_PROVA=1)
/** Câmera fixa em p olhando a (null: a câmera do jogo). */
async function camEm(page: Page, p: V3 | null, a?: V3) {
  await page.evaluate(
    ([p, a]) => {
      const w = window as unknown as {
        __camFixa?: { p: V3; a: V3 } | null;
        __camLigada?: boolean;
        __camOrbita?: { c: V3; r: number; h: number; a0: number; vel: number; t0: number; alvo: V3 } | null;
      };
      if (!w.__camLigada) {
        w.__camLigada = true;
        window.__brumaluz!.cenaBabylon!().onBeforeCameraRenderObservable.add((c) => {
          const o = w.__camOrbita;
          if (o) {
            const a = o.a0 + ((performance.now() - o.t0) / 1000) * o.vel;
            w.__camFixa = { p: [o.c[0] + Math.sin(a) * o.r, o.c[1] + o.h, o.c[2] + Math.cos(a) * o.r], a: o.alvo };
          }
          const f = w.__camFixa;
          if (!f) return;
          const cam = c as unknown as { position: { set(...a: number[]): void; clone(): { set(...a: number[]): unknown } }; setTarget(v: unknown): void };
          cam.position.set(...f.p);
          const alvo = cam.position.clone();
          alvo.set(...f.a);
          cam.setTarget(alvo);
          (c.getScene() as unknown as { setTransformMatrix(a: unknown, b: unknown): void }).setTransformMatrix(
            (c as unknown as { getViewMatrix(f: boolean): unknown }).getViewMatrix(true),
            (c as unknown as { getProjectionMatrix(f: boolean): unknown }).getProjectionMatrix(true),
          );
        });
      }
      w.__camFixa = p && a ? { p, a } : null;
    },
    [p, a ?? null] as const,
  );
  await page.waitForTimeout(300);
}

async function semHud(page: Page, sem: boolean) {
  await page.evaluate((sem) => {
    let st = document.getElementById('sem-hud');
    if (!st) {
      st = document.createElement('style');
      st.id = 'sem-hud';
      document.head.appendChild(st);
    }
    // T00 (023): só a tela do jogo volta a aparecer. Com `canvas { visible }` toda tela escondida
    // voltava, e a figurinha do prêmio do cartão da missão (a Caipira) "flutuava no céu"
    st.textContent = sem ? 'body > *:not(canvas):not(#cena):not(.alma-festa):not(.alma-fundo) { visibility: hidden !important; } canvas#cena, .alma-festa canvas, .alma-fundo canvas { visibility: visible !important; }' : '';
  }, sem);
}

/** Vai para um lugar plano perto do sítio e veste os três premium. */
export async function vestirPremium(page: Page, comAmigo: boolean) {
  const lugar = await clareira(page);
  await page.evaluate(() => {
    window.__brumaluz!.personagem!.definir({ fantasia: { id: 'dragao', cor: 0 } } as never);
  });
  await page.waitForTimeout(600);
  await page.evaluate(() => window.__alma!.premium('eu', ['tenis-cometa', 'dragao', 'unicornio']));
  if (comAmigo) {
    await page.evaluate(([x, y, z]) => {
      window.__brumaluz!.amigosDeTeste!([
        {
          id: 'lia',
          aparencia: { corpo: 'feminino', cabeloEstilo: 5, cabeloCor: 1, pele: 1, rosto: 1, fantasia: { id: 'dragao', cor: 0 } },
          x: x + 2.6, y, z: z + 1.2, yaw: Math.PI,
        },
      ]);
    }, lugar);
    await page.waitForTimeout(1200);
    await page.evaluate(([x, , z]) => window.__alma!.premium('lia', ['tenis-cometa', 'dragao', 'unicornio'], [x + 2.6, z + 1.2]), lugar);
  }
  await page.waitForTimeout(2500);
  return lugar;
}

/** Vai para uma clareira plana e aberta perto do sítio. */
export async function clareira(page: Page): Promise<V3> {
  const lugar = await page.evaluate(() => {
    const e = window.__brumaluz!;
    const [x, y, z] = e.posicao!;
    const p = (e.povoados?.() ?? []).sort((a, b) => Math.hypot(a.cx - x, a.cz - z) - Math.hypot(b.cx - x, b.cz - z))[0];
    // procura uma clareira plana de 7x7 perto do sítio
    const alturaEm = (xx: number, zz: number) => {
      for (let yy = 100; yy > 20; yy--) {
        const b = e.bloco!(xx, yy, zz);
        if (b && ![8, 9, 10, 54, 67].includes(b) && !(b >= 69 && b <= 80)) return yy;
      }
      return -1;
    };
    const cx0 = p ? p.cx : Math.floor(x);
    const cz0 = p ? p.cz : Math.floor(z);
    let melhor: [number, number, number] = [cx0, alturaEm(cx0, cz0) + 1, cz0];
    let nota = -1e9;
    const livre = (xx: number, yy: number, zz: number) => {
      for (let k = 1; k <= 3; k++) {
        const b = e.bloco!(xx, yy + k, zz);
        if (b && ![8, 9].includes(b)) return false;
      }
      return true;
    };
    for (let dx = -48; dx <= 48; dx += 3)
      for (let dz = -48; dz <= 48; dz += 3) {
        const d = Math.hypot(dx, dz);
        if (d < 14) continue;
        const cx = cx0 + dx;
        const cz = cz0 + dz;
        const h = alturaEm(cx, cz);
        if (h < 0 || e.bloco!(cx, h, cz) === 67) continue;
        let ruim = 0;
        for (let a = -6; a <= 6; a += 2)
          for (let b = -6; b <= 6; b += 2) {
            ruim += Math.abs(alturaEm(cx + a, cz + b) - h) * 3;
            if (!livre(cx + a, h, cz + b)) ruim += 8;
            if (e.bloco!(cx + a, alturaEm(cx + a, cz + b), cz + b) === 67) ruim += 6;
          }
        const n = -ruim - d * 0.25;
        if (n > nota) {
          nota = n;
          melhor = [cx + 0.5, h + 1, cz + 0.5];
        }
      }
    e.voar?.(false);
    e.teleportar!(melhor[0], melhor[2], melhor[1]);
    return melhor;
  });
  await assentar(page);
  return lugar as V3;
}

(process.env.ESBOCO_PROVA ? test : test.skip)('provador: os três premium no mundo', async ({ browser }) => {
  for (const ap of (process.env.ESBOCO_APARELHOS ?? 'pc,cel').split(',')) {
    const page = await abrir(browser, 'rancho-alegre', ap === 'cel');
    await page.evaluate(() => window.__alma!.fechar());
    await semAvisos(page);
    const [x, y, z] = await vestirPremium(page, true);
    await page.evaluate(() => window.__brumaluz!.apontar?.(Math.PI, 0));
    await page.waitForTimeout(800);
    // de lado: a criança de dragãozinho, o tênis e o unicórnio (sem o HUD, como foto de loja)
    await semHud(page, true);
    await camEm(page, [x + 4.2, y + 1.6, z - 3.2], [x + 0.6, y + 0.7, z - 0.4]);
    await page.waitForTimeout(1200);
    await foto(page, `prova-${ap}-1-lado`);
    await camEm(page, [x - 1.6, y + 1.5, z + 2.2], [x, y + 0.9, z]);
    await page.waitForTimeout(400);
    await foto(page, `prova-${ap}-2-asas`);
    await camEm(page, [x + 0.9, y + 0.55, z - 1.1], [x, y + 0.15, z]);
    await page.waitForTimeout(300);
    await foto(page, `prova-${ap}-3-tenis`);
    const pet = await page.evaluate(() => {
      const n = window.__brumaluz!.cenaBabylon!().transformNodes.find((t) => t.name === 'premium-unicornio')!;
      return [n.position.x, n.position.y, n.position.z, n.rotation.y] as [number, number, number, number];
    });
    {
      // do outro lado do bichinho (a criança fica atrás dele), um pouco de lado
      let ux = pet[0] - x;
      let uz = pet[2] - z;
      const l = Math.hypot(ux, uz) || 1;
      ux /= l;
      uz /= l;
      // de lado, um pouco à frente do bichinho (ele olha para a criança): a cara de três quartos
      const vx = -ux;
      const vz = -uz;
      await camEm(page, [pet[0] + vx * 1.1 - vz * 2.1, pet[1] + 0.85, pet[2] + vz * 1.1 + vx * 2.1], [pet[0] + vx * 0.25, pet[1] + 0.5, pet[2] + vz * 0.25]);
    }
    await page.waitForTimeout(300);
    await foto(page, `prova-${ap}-4-unicornio`);
    // a amiga, vista pela câmera do jogo (com o HUD)
    await semHud(page, false);
    await camEm(page, null);
    await page.evaluate(([x, z]) => window.__brumaluz!.mirarPonto!(x + 2.6, 0, z + 1.2), [x, z] as const);
    await page.evaluate(([x, y, z]) => window.__brumaluz!.mirarPonto!(x + 2.6, y + 0.8, z + 1.2), [x, y, z] as const);
    await page.waitForTimeout(800);
    await foto(page, `prova-${ap}-5-amiga`);
    // andando: pegadas de luz, asas batendo, o unicórnio trotando atrás
    await page.evaluate(() => window.__brumaluz!.amigosDeTeste!([]));
    // câmera parada à frente e de lado: a criança vem andando e deixa as pegadas de luz
    const yaw = await page.evaluate(() => window.__brumaluz!.rotacao![1]);
    const fx = Math.sin(yaw);
    const fz = Math.cos(yaw);
    await semHud(page, true);
    await camEm(page, [x + fx * 5.5 - fz * 2.6, y + 1.6, z + fz * 5.5 + fx * 2.6], [x + fx * 2.2, y + 0.6, z + fz * 2.2]);
    await page.evaluate(() => window.__brumaluz!.controleDireto!.mover(1, 0));
    await page.waitForTimeout(900);
    await foto(page, `prova-${ap}-6-andando`);
    await page.evaluate(() => window.__brumaluz!.controleDireto!.tecla('pular', true));
    await page.waitForTimeout(250);
    await foto(page, `prova-${ap}-7-pulo`);
    await page.evaluate(() => {
      const c = window.__brumaluz!.controleDireto!;
      c.tecla('pular', false);
      c.mover(0, 0);
    });
    await page.waitForTimeout(400);
    {
      // parou: a câmera à frente da criança (o unicórnio chega e solta coraçõezinhos)
      const r = await page.evaluate(() => {
        const e = window.__brumaluz!;
        const [x, , z] = e.posicao!;
        const n = e.cenaBabylon!().transformNodes
          .filter((t) => t.name === 'personagem' && !t.parent)
          .sort((a, b) => Math.hypot(a.position.x - x, a.position.z - z) - Math.hypot(b.position.x - x, b.position.z - z))[0];
        return [n.position.x, n.position.y, n.position.z, n.rotation.y] as [number, number, number, number];
      });
      const gx = Math.sin(r[3]);
      const gz = Math.cos(r[3]);
      await camEm(page, [r[0] + gx * 3.4 - gz * 1.6, r[1] + 1.5, r[2] + gz * 3.4 + gx * 1.6], [r[0] - gx * 0.6, r[1] + 0.7, r[2] - gz * 0.6]);
    }
    await page.waitForTimeout(1100);
    await foto(page, `prova-${ap}-8-parou`);
    await semHud(page, false);
    await page.context().close();
  }
});

// ------------------------------------------------------------------ vídeos da rodada 2 (ESBOCO_VIDEO=premium,loja,nivel)
(process.env.ESBOCO_VIDEO?.includes('premium') ? test : test.skip)('vídeo: os premium em movimento', async ({ browser }) => {
  const page = await abrirComVideo(browser, 'rancho-alegre', true);
  const [x, y, z] = await vestirPremium(page, false);
  await semHud(page, true);
  await page.evaluate(() => window.__brumaluz!.apontar?.(Math.PI, 0));
  await page.waitForTimeout(600);
  const yaw = await page.evaluate(() => window.__brumaluz!.rotacao![1]);
  const fx = Math.sin(yaw);
  const fz = Math.cos(yaw);
  // de lado, à frente: a criança vem andando, pula e para; o unicórnio vem atrás
  await camEm(page, [x + fx * 6 - fz * 3.2, y + 1.7, z + fz * 6 + fx * 3.2], [x + fx * 2.6, y + 0.6, z + fz * 2.6]);
  await page.waitForTimeout(1200);
  await page.evaluate(() => window.__brumaluz!.controleDireto!.mover(1, 0));
  await page.waitForTimeout(1300);
  await page.evaluate(() => window.__brumaluz!.controleDireto!.tecla('pular', true));
  await page.waitForTimeout(300);
  await page.evaluate(() => window.__brumaluz!.controleDireto!.tecla('pular', false));
  await page.waitForTimeout(700);
  await page.evaluate(() => window.__brumaluz!.controleDireto!.mover(0, 0));
  await page.waitForTimeout(2200);
  // a câmera dá a volta devagar (asas batendo parado, o unicórnio olhando e fazendo charme)
  // os pés da criança: a raiz do boneco mais perto da posição
  const p = await page.evaluate(() => {
    const e = window.__brumaluz!;
    const [x, , z] = e.posicao!;
    const r = e.cenaBabylon!().transformNodes
      .filter((n) => n.name === 'personagem' && !n.parent)
      .sort((a, b) => Math.hypot(a.position.x - x, a.position.z - z) - Math.hypot(b.position.x - x, b.position.z - z))[0];
    return [r.position.x, r.position.y, r.position.z] as V3;
  });
  await page.evaluate(
    ([p, yaw, fx, fz]) => {
      (window as unknown as { __camOrbita: unknown }).__camOrbita = {
        c: p, r: 3.8, h: 1.5, a0: (yaw as number) + 0.9, vel: 0.42, t0: performance.now(),
        alvo: [p[0] - (fx as number) * 0.6, p[1] + 0.75, p[2] - (fz as number) * 0.6],
      };
    },
    [p, yaw, fx, fz] as const,
  );
  await page.waitForTimeout(7000);
  await page.context().close();
});

(process.env.ESBOCO_VIDEO?.includes('loja') ? test : test.skip)('vídeo: a lojinha, o provador e a compra', async ({ browser }) => {
  const page = await abrirComVideo(browser, 'rancho-alegre', true);
  await clareira(page);
  await page.evaluate(() => window.__alma!.definir({ crianca: { moedas: 62, xp: 130 } }));
  await page.waitForTimeout(800);
  const tap = async (sel: string, ms = 1200) => {
    await page.locator(sel).first().tap();
    await page.waitForTimeout(ms);
  };
  await tap('[data-botao-roda]', 900);
  await tap('[data-roda] [data-item=lojinha]', 2200);
  await page.locator('.alma-prateleira').evaluate((el) => el.scrollTo({ left: 520, behavior: 'smooth' }));
  await page.waitForTimeout(1200);
  await tap('.alma-pcard[data-premium=dragao]', 1500);
  await tap('[data-alma-experimentar]', 5200);
  await tap('[data-alma-provador-comprar]', 1100);
  await tap('[data-alma-sim]', 300);
  await page.waitForSelector('[data-alma-festa=premium] [data-alma-oba]', { timeout: 10_000 });
  await page.waitForTimeout(900);
  await tap('[data-alma-festa=premium] [data-alma-oba]', 3500);
  await page.context().close();
});

(process.env.ESBOCO_VIDEO?.includes('nivel') ? test : test.skip)('vídeo: missão, prêmio e presente de nível', async ({ browser }) => {
  const page = await abrirComVideo(browser, 'rancho-alegre', true);
  await page.evaluate(() => window.__alma!.definir({ crianca: { xp: 30, moedas: 4 } }));
  await page.waitForTimeout(600);
  await page.evaluate(() => window.__alma!.quadro());
  await page.waitForTimeout(2200);
  await page.locator('[data-alma-jogar]').first().tap();
  await page.waitForTimeout(1200);
  for (let i = 0; i < 5; i++) {
    await page.evaluate(() => window.__alma!.registrar('colheu'));
    await page.waitForTimeout(700);
  }
  await page.waitForSelector('[data-alma-festa=missao] [data-alma-vestir]', { timeout: 10_000 });
  await page.waitForTimeout(900);
  await page.locator('[data-alma-vestir]').tap();
  await page.waitForSelector('[data-alma-festa=nivel] [data-alma-oba]', { timeout: 15_000 });
  await page.waitForTimeout(1200);
  await page.locator('[data-alma-festa=nivel] [data-alma-oba]').tap();
  await page.waitForTimeout(3200);
  await page.context().close();
});
