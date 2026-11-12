import { expect, test, type Browser, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { PASTA_CAPTURAS } from '../playwright.config';

/**
 * Spec 014, T06: o canteiro de obras de verdade, no jogo (cena, núcleo no trabalhador e a
 * malha). Na suíte de sempre desde a T11 (antes só com CANTEIRO_T06=1).
 *
 * - computador: a criança nasce ao lado do primeiro canteiro (os fantasmas à vista), o
 *   pedreiro dá a colher (ela fica na mão em até 3 s), o clique direito enche os fantasmas
 *   um por um até a casinha do cachorro ficar pronta: a obra vira parte da cidade (sem
 *   fantasmas, tapume nem andaime), a festa, a placa, o capacete desbloqueado e vestido;
 * - celular: toques de verdade na tela (com o ímã) enchem os fantasmas da obra seguinte;
 * - capturas de dia: fantasmas, metade, pronta, festa e a fantasia, nos dois.
 */
declare const process: { env: Record<string, string | undefined> };
// T11: entra na suíte de sempre (antes só com CANTEIRO_T06)
test.setTimeout(600_000);

const PASTA = process.env.CANTEIRO_PASTA ?? `${PASTA_CAPTURAS}/canteiro`;
type V3 = [number, number, number];

const IPHONE = {
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
};

async function abrir(page: Page) {
  page.on('pageerror', (e) => console.log(`erro na página: ${String(e)}`));
  await page.addInitScript(() => {
    try {
      localStorage.setItem(
        'terrario:config',
        JSON.stringify({ distancia: 3, mostrarFps: false, mostrarAtalhos: false }),
      );
    } catch {
      // sem armazenamento
    }
  });
  await page.goto('/?tema=cidade-grande');
  await page.waitForFunction(() => window.__brumaluz?.ready === true, undefined, {
    timeout: 240_000,
  });
  await page.evaluate(() => {
    document.querySelector<HTMLElement>('.entrada')?.setAttribute('hidden', '');
    const e = window.__brumaluz!;
    e.pausarDia = true;
    e.hora = 0.42;
    e.definirClima?.('limpo');
  });
  await page.evaluate(() => {
    // câmera fixa para as capturas (null: a do jogo)
    const w = window as unknown as { __camFixa: { p: V3; a: V3 } | null };
    w.__camFixa = null;
    window.__brumaluz!.cenaBabylon!().onBeforeCameraRenderObservable.add((c) => {
      const f = w.__camFixa;
      if (!f) return;
      const cam = c as unknown as {
        position: { set(...a: number[]): void; clone(): { set(...a: number[]): unknown } };
        setTarget(v: unknown): void;
      };
      cam.position.set(...f.p);
      const alvo = cam.position.clone();
      alvo.set(...f.a);
      cam.setTarget(alvo);
      // o Babylon já recortou a cena com a vista da câmera do jogo: refaz com a da câmera fixa
      (
        c.getScene() as unknown as { setTransformMatrix(a: unknown, b: unknown): void }
      ).setTransformMatrix(
        (c as unknown as { getViewMatrix(f: boolean): unknown }).getViewMatrix(true),
        (c as unknown as { getProjectionMatrix(f: boolean): unknown }).getProjectionMatrix(true),
      );
    });
  });
  await assentar(page);
}

/** Olha a obra do canteiro `n` da calçada, de lado e um pouco do alto (null: a câmera do jogo). */
async function olharObra(page: Page, n: number | null, dist = 9) {
  await page.evaluate(
    ([n, dist]) => {
      const w = window as unknown as { __camFixa: { p: V3; a: V3 } | null };
      if (n === null) {
        w.__camFixa = null;
        return;
      }
      const p = window.__brumaluz!.cidade!()!;
      const l = p.lotes.find((q) => q.canteiro === n)!;
      const cx = l.x0 + 4;
      const cz = l.z0 + 4.5;
      const s = l.porta === 'n' ? -1 : 1;
      w.__camFixa = { p: [cx - dist * 0.55, p.h + 5.5, cz + s * dist], a: [cx, p.h + 2, cz] };
    },
    [n, dist] as const,
  );
  await page.waitForTimeout(400);
}

async function assentar(page: Page, minimo = 20) {
  let antes = -1;
  for (let i = 0; i < 40; i++) {
    await page.waitForTimeout(1500);
    const n = await page.evaluate(() => window.__brumaluz!.chunksCarregados ?? 0);
    if (n === antes && n >= minimo) break;
    antes = n;
  }
  await page.waitForTimeout(1000);
}

async function capturar(page: Page, nome: string) {
  mkdirSync(PASTA, { recursive: true });
  await page.screenshot({ path: `${PASTA}/${nome}.png` });
}

type Fantasma = { x: number; y: number; z: number; bloco: number; canteiro: number };
const fantasmas = (page: Page, canteiro: number) =>
  page.evaluate(
    (n) => (window.__brumaluz!.fantasmasPerto?.() ?? []).filter((f) => f.canteiro === n),
    canteiro,
  );

/**
 * Voa parado ao lado de um fantasma (de cada lado, até a mira pegar um) e enche com o clique
 * direito de verdade. Devolve se encheu.
 */
async function encherUm(page: Page, lista: Fantasma[]): Promise<boolean> {
  for (const f of lista.slice(0, 6))
    for (const [dx, dz, dy] of [
      [0, -2.6, 1.2],
      [0, 2.6, 1.2],
      [-2.6, 0, 1.2],
      [2.6, 0, 1.2],
      [0, -1.8, 2.8],
      [0, 1.8, 2.8],
      [-1.8, 0, 2.8],
      [1.8, 0, 2.8],
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
      await page.waitForTimeout(140);
      if ((await page.evaluate(() => window.__brumaluz!.obraColocados ?? 0)) > antes) return true;
    }
  return false;
}

/** A colher do pedreiro na mão (em até 3 s depois de chegar perto). */
async function esperarColher(page: Page) {
  const t0 = Date.now();
  await page.waitForFunction(
    () => {
      const e = window.__brumaluz!;
      const i = e.inventario as unknown as {
        obter(i: number): { item: string } | null;
      };
      return (e.colherRecebida ?? 0) > 0 || !!i.obter(0);
    },
    undefined,
    { timeout: 20_000 },
  );
  return Date.now() - t0;
}

test('canteiro no computador: colher, encher, obra pronta, festa e capacete', async ({
  browser,
}: {
  browser: Browser;
}) => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await abrir(page);
  // ao nascer: o canteiro, os fantasmas e o pedreiro à vista
  const vistos = await page.evaluate(() => window.__brumaluz!.fantasmasObra ?? 0);
  expect(vistos).toBeGreaterThan(0);
  await capturar(page, 'pc-1-nascer-fantasmas');
  await olharObra(page, 1);
  await capturar(page, 'pc-1b-fantasmas');
  await olharObra(page, null);
  const esperou = await esperarColher(page);
  console.log(`colher na mão em ${esperou} ms`);
  const mao = await page.evaluate(() => {
    const e = window.__brumaluz!;
    const i = e.inventario as unknown as {
      obter(i: number): { item: string } | null;
      ativo?: number;
    };
    for (let k = 0; k < 9; k++) if (i.obter(k)?.item === 'colher_pedreiro') return k;
    return -1;
  });
  expect(mao).toBeGreaterThanOrEqual(0);
  await page.evaluate((k) => window.__brumaluz!.selecionarSlot!(k), mao);

  const inicio = await fantasmas(page, 1);
  expect(inicio.length).toBe(23);
  let feitos = 0;
  for (let volta = 0; volta < 80; volta++) {
    const lista = await fantasmas(page, 1);
    if (!lista.length) break;
    if (await encherUm(page, lista)) feitos++;
    if (feitos === 12) {
      await olharObra(page, 1);
      await capturar(page, 'pc-2-metade');
      await olharObra(page, null);
    }
  }
  console.log(`computador: ${feitos} blocos postos pelo clique`);
  // pronta: a obra vira parte da cidade, a festa e o capacete
  await page.waitForFunction(() => (window.__brumaluz!.obrasFeitas ?? []).includes(1), undefined, {
    timeout: 20_000,
  });
  await olharObra(page, 1);
  await page.waitForTimeout(200);
  await capturar(page, 'pc-3-festa');
  await page.waitForTimeout(4500);
  await capturar(page, 'pc-4-pronta');
  expect(await fantasmas(page, 1)).toEqual([]);
  // o capacete ficou na aparência (desbloqueio) e veste
  const desbloqueios = await page.evaluate(
    () => (window as unknown as { __desbloqueios?: () => string[] }).__desbloqueios?.() ?? [],
  );
  expect(desbloqueios).toContain('capacete-obra');
  await page.evaluate(() => {
    const e = window.__brumaluz!;
    e.personagem!.definir({ fantasia: { id: 'capacete-obra', cor: 0 } } as never);
    e.voar?.(false);
    const p = e.cidade!()!;
    e.teleportar!(p.nascimento.x, p.nascimento.z);
  });
  await page.waitForTimeout(1500);
  await page.evaluate(() => {
    const e = window.__brumaluz!;
    const p = e.cidade!()!;
    const w = window as unknown as { __camFixa: { p: V3; a: V3 } | null };
    const j = e.posicao!;
    w.__camFixa = {
      p: [
        p.nascimento.x + Math.sin(p.nascimento.olhar) * 3,
        j[1] + 0.4,
        p.nascimento.z + Math.cos(p.nascimento.olhar) * 3,
      ],
      a: [p.nascimento.x, j[1] - 0.2, p.nascimento.z],
    };
    e.personagem?.girarCorpo?.(p.nascimento.olhar);
  });
  await page.waitForTimeout(800);
  await capturar(page, 'pc-5-capacete');
  await page.close();
});

test('canteiro no celular: toques de verdade enchem os fantasmas', async ({
  browser,
}: {
  browser: Browser;
}) => {
  const ctx = await browser.newContext(IPHONE);
  const page = await ctx.newPage();
  await abrir(page);
  await capturar(page, 'cel-1-nascer-fantasmas');
  await olharObra(page, 1, 8);
  await capturar(page, 'cel-1b-fantasmas');
  await olharObra(page, null);
  await esperarColher(page);
  const lista = await fantasmas(page, 1);
  expect(lista.length).toBeGreaterThan(0);
  let cheios = 0;
  for (const f of lista.slice(0, 8)) {
    // a câmera de trás, olhando a obra: o toque cai perto do fantasma (nem sempre em cheio)
    await page.evaluate((f) => {
      const e = window.__brumaluz!;
      e.voar?.(true);
      e.teleportar!(f.x + 0.5, f.z + 0.5 - 3, f.y + 2.2);
      e.mirarPonto!(f.x + 0.5, f.y + 0.5, f.z + 0.5);
    }, f);
    await page.waitForTimeout(250);
    const p = await page.evaluate(
      (f) => window.__brumaluz!.telaDoPonto!(f.x + 0.5 + 0.35, f.y + 0.5, f.z + 0.5),
      f,
    );
    if (!p) continue;
    const antes = await page.evaluate(() => window.__brumaluz!.obraColocados ?? 0);
    await page.touchscreen.tap(p.x, p.y);
    await page.waitForTimeout(250);
    if ((await page.evaluate(() => window.__brumaluz!.obraColocados ?? 0)) > antes) cheios++;
  }
  console.log(`celular: ${cheios} fantasmas cheios por toque`);
  expect(cheios).toBeGreaterThanOrEqual(6);
  await olharObra(page, 1, 8);
  await capturar(page, 'cel-2-metade');
  await ctx.close();
});

export type { V3 };
