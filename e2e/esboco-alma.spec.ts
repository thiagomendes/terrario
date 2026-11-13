import { test, type Browser, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';

/**
 * Esboço da spec 023 "Alma do jogo" (`src/esboco/alma.ts`, só com `?esboco=alma`).
 * Só roda com ESBOCO_ALMA=1, na placa de vídeo (scripts/e2e-gpu.sh). Pasta: ESBOCO_PASTA.
 */
declare const process: { env: Record<string, string | undefined> };
const PASTA = process.env.ESBOCO_PASTA ?? 'test-results/esboco023';
test.skip(!process.env.ESBOCO_ALMA, 'esboço: só com ESBOCO_ALMA=1');
test.describe.configure({ mode: 'serial' });
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

/** Estado de meio de caminho: algumas missões feitas, moedas, pontos (para o álbum cheio de vida). */
const MEIO: Record<string, Record<string, unknown>> = {
  'cidade-grande': {
    moedas: 7,
    feitas: ['c1', 'c2', 'c3'],
    fixada: 'c4',
    progresso: { c4: 0.45, c5: 0 },
    pontos: { construtor: 9, explorador: 5, bichos: 2, fazendeiro: 0, mundo: 3 },
    meus: ['pao-presente'],
    fantasias: ['capacete-obra'],
  },
  'rancho-alegre': {
    moedas: 8,
    feitas: ['r1', 'r2', 'r3'],
    fixada: 'r4',
    progresso: { r4: 1, r5: 0, r6: 1 },
    pontos: { construtor: 2, explorador: 1, bichos: 7, fazendeiro: 8, mundo: 1 },
    meus: [],
    fantasias: ['caipira'],
  },
};

(process.env.ESBOCO_FOTOS ? test : test.skip)('fotos: as 4 partes nos 2 mundos', async ({ browser }) => {
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
      await foto(page, n('1-quadro'));
      // começa a primeira: o cartão vai para o HUD
      await tocarOuClicar(page, '[data-alma-jogar]', celular);
      await page.waitForTimeout(900);
      await foto(page, n('2-hud'));
      // meio do caminho (estado de mentirinha) e as telas do baú
      await page.evaluate((m) => window.__alma!.definir(m as never), MEIO[tema]);
      await page.waitForTimeout(400);
      await foto(page, n('3-hud-meio'));
      await tocarOuClicar(page, '[data-alma-bau]', celular);
      await page.waitForTimeout(1500);
      await foto(page, n('4-album'));
      await tocarOuClicar(page, '[data-alma-aba=habilidades]', celular);
      await foto(page, n('5-habilidades'));
      await tocarOuClicar(page, '[data-alma-aba=loja]', celular);
      await page.waitForTimeout(1200);
      await foto(page, n('6-loja'));
      // compra: o cartão de confirmar
      const pode = page.locator('.alma-item.pode').first();
      if (await pode.count()) {
        if (celular) await pode.tap();
        else await pode.click();
        await page.waitForTimeout(900);
        await foto(page, n('7-comprar'));
        await tocarOuClicar(page, '[data-alma-sim]', celular);
        await page.waitForTimeout(1200);
        await foto(page, n('8-comprou'));
      }
      await page.evaluate(() => window.__alma!.fechar());
      // a festa: termina a missão fixada
      const fix = await page.evaluate(() => window.__alma!.estado().fixada);
      await page.evaluate((id) => window.__alma!.progresso(id!, 99), fix);
      await page.waitForSelector('[data-alma-festa]', { timeout: 10_000 });
      await page.waitForTimeout(tema === 'cidade-grande' ? 3800 : 1500);
      await foto(page, n('9-festa'));
      await page.waitForSelector('[data-alma-oba]', { timeout: 10_000 });
      await page.waitForTimeout(500);
      await foto(page, n('10-festa-botoes'));
      await tocarOuClicar(page, '[data-alma-oba]', celular);
      await page.waitForTimeout(2500);
      await foto(page, n('11-depois'));
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
      const w = window as unknown as { __camFixa?: { p: V3; a: V3 } | null; __camLigada?: boolean };
      if (!w.__camLigada) {
        w.__camLigada = true;
        window.__brumaluz!.cenaBabylon!().onBeforeCameraRenderObservable.add((c) => {
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

(process.env.ESBOCO_VIDEO?.includes('cidade') ? test : test.skip)('vídeo: missão da casinha do cachorro', async ({ browser }) => {
  const page = await abrirComVideo(browser, 'cidade-grande', true);
  // colher na mão (o pedreiro dá ao chegar perto)
  await page.waitForFunction(() => (window.__brumaluz!.colherRecebida ?? 0) > 0, undefined, { timeout: 30_000 }).catch(() => undefined);
  await page.waitForTimeout(800);
  await page.evaluate(() => window.__alma!.quadro());
  await page.waitForTimeout(2600);
  await page.locator('[data-alma-jogar]').first().tap();
  await page.waitForTimeout(1600);
  await camFixa(page, 1);
  for (let i = 0; i < 40; i++) {
    const lista = (await page.evaluate(() => window.__brumaluz!.fantasmasPerto?.() ?? [])).filter((f) => f.canteiro === 1);
    if (!lista.length) break;
    if (!(await encherUm(page, lista))) break;
    await page.waitForTimeout(160);
  }
  await page.waitForSelector('[data-alma-festa]', { timeout: 20_000 });
  await camFixa(page, null);
  await page.waitForSelector('[data-alma-vestir]', { timeout: 15_000 });
  await page.waitForTimeout(900);
  await page.locator('[data-alma-vestir]').tap();
  await page.waitForTimeout(3500);
  await page.evaluate(() => window.__brumaluz!.apontar?.(window.__brumaluz!.rotacao![1], 0.15));
  await page.waitForTimeout(1500);
  await foto(page, 'video-cidade-fim');
  await page.context().close();
});

(process.env.ESBOCO_VIDEO?.includes('rancho') ? test : test.skip)('vídeo: missão da colheita', async ({ browser }) => {
  const page = await abrirComVideo(browser, 'rancho-alegre', true);
  // os pés maduros da lavoura do sítio mais perto
  const maduros = await page.evaluate(() => {
    const e = window.__brumaluz!;
    const [x0, , z0] = e.posicao!;
    const r: [number, number, number][] = [];
    for (let dx = -60; dx <= 60; dx++)
      for (let dz = -60; dz <= 60; dz++)
        for (let y = 90; y > 20; y--) {
          const b = e.bloco!(Math.floor(x0) + dx, y, Math.floor(z0) + dz);
          if (b === 72 || b === 76) {
            r.push([Math.floor(x0) + dx, y, Math.floor(z0) + dz]);
            break;
          }
          if (b && b !== 8 && b !== 9) break;
        }
    return r;
  });
  console.log('alma maduros', maduros.length);
  maduros.sort((a, b) => a[0] - b[0] || a[2] - b[2]);
  const [mx, my, mz] = maduros[0];
  await page.evaluate(([x, y, z]) => {
    const e = window.__brumaluz!;
    e.teleportar!(x + 0.5, z - 2.5, y);
    e.mirarPonto!(x + 0.5, y + 0.4, z + 0.5);
  }, [mx, my, mz] as const);
  await page.waitForTimeout(1500);
  await page.evaluate(() => window.__alma!.quadro());
  await page.waitForTimeout(2600);
  await page.locator('[data-alma-jogar]').first().tap();
  await page.waitForTimeout(1600);
  let colhidos = 0;
  for (const [x, y, z] of maduros.slice(0, 12)) {
    if (colhidos >= 5) break;
    await page.evaluate(([x, y, z]) => {
      const e = window.__brumaluz!;
      e.teleportar!(x + 0.5, z - 2.2, y);
      e.mirarPonto!(x + 0.5, y + 0.4, z + 0.5);
    }, [x, y, z] as const);
    await page.waitForTimeout(500);
    const ok = await page.evaluate(() => window.__brumaluz!.minerar!(1.2).quebrou);
    if (ok) colhidos++;
    await page.waitForTimeout(900);
  }
  console.log('alma colhidos', colhidos);
  await page.waitForSelector('[data-alma-festa]', { timeout: 20_000 });
  await page.waitForSelector('[data-alma-vestir]', { timeout: 15_000 });
  await page.waitForTimeout(900);
  await page.locator('[data-alma-vestir]').tap();
  await page.waitForTimeout(3500);
  await foto(page, 'video-rancho-fim');
  await page.context().close();
});

(process.env.ESBOCO_VIDEO?.includes('bau') ? test : test.skip)('vídeo: o baú (álbum, habilidades e lojinha)', async ({ browser }) => {
  const page = await abrirComVideo(browser, 'cidade-grande', true);
  await page.evaluate((m) => window.__alma!.definir(m as never), MEIO['cidade-grande']);
  await page.waitForTimeout(1200);
  const tap = async (sel: string, ms = 1400) => {
    await page.locator(sel).first().tap();
    await page.waitForTimeout(ms);
  };
  await tap('[data-alma-bau]', 2600);
  await tap('[data-alma-aba=habilidades]', 1800);
  await tap('.alma-hab[data-hab=explorador]', 1600);
  await tap('.alma-hab[data-hab=bichos]', 1600);
  await tap('[data-alma-aba=loja]', 2200);
  await tap('.alma-item.pode', 1800);
  await tap('[data-alma-sim]', 2400);
  await tap('.alma-item.trancado', 2200);
  await tap('[data-alma-fechar]', 1200);
  await page.context().close();
});
