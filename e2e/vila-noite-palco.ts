import { type Browser, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { criarMundo, TAMANHOS, type Tamanho } from './guia-palco';

/**
 * Spec 026: o palco dos testes de foto e vídeo da noite da Vila Neon (não é um teste): abre o
 * mundo, a câmera fixa, as fotos, as medidas do quadro, o relógio do show e o voo da câmera.
 */
declare const process: { env: Record<string, string | undefined> };
export type V3 = [number, number, number];
export const PASTA = process.env.VILA_PASTA ?? 'capturas-vila-noite';
const T0 = Date.now();
export const passo = (o: string) =>
  console.log(`PASSO ${((Date.now() - T0) / 1000).toFixed(0)} s ${o}`);

export async function abrir(
  browser: Browser,
  id: string,
  tamanho: Tamanho,
  distancia: number,
  feitas: string[] = ['f1'],
): Promise<Page> {
  const ctx = await browser.newContext(TAMANHOS[tamanho]);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log(`erro na página: ${String(e)}`));
  await page.addInitScript((d) => {
    try {
      localStorage.setItem(
        'terrario:config',
        JSON.stringify({ distancia: d, mostrarFps: false, mostrarAtalhos: false }),
      );
    } catch {
      // sem armazenamento
    }
  }, distancia);
  // a f1 já feita: a f3 está aberta no quadro
  await criarMundo(page, id, 'vila-neon', { alma: { local: { feitas } } }, 1337);
  // no computador, a resolução cheia (as fotos e o vídeo); no celular, a política de verdade
  await page.goto(`/?mundo=${id}${tamanho === 'pc' ? '&escala=1' : ''}`);
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
    const w = window as unknown as { __camFixa: { p: V3; a: V3 } | null; __esconder: string[] };
    w.__camFixa = null;
    w.__esconder = [];
    const scene = e.cenaBabylon!();
    scene.onBeforeCameraRenderObservable.add((c) => {
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
      (
        c.getScene() as unknown as { setTransformMatrix(a: unknown, b: unknown): void }
      ).setTransformMatrix(
        (c as unknown as { getViewMatrix(f: boolean): unknown }).getViewMatrix(true),
        (c as unknown as { getProjectionMatrix(f: boolean): unknown }).getProjectionMatrix(true),
      );
    });
    scene.onBeforeRenderObservable.add(() => {
      if (!w.__esconder.length) return;
      for (const m of scene.meshes)
        if (w.__esconder.some((p) => m.name.startsWith(p))) m.isVisible = false;
    });
  });
  await page.addStyleTag({
    content: '.toast-area, .dica-mira { display: none !important; }',
  });
  passo('abriu');
  await assentar(page);
  passo('assentou');
  return page;
}

export async function assentar(page: Page, minimo = 12) {
  let antes = -1;
  for (let i = 0; i < 40; i++) {
    await page.waitForTimeout(1500);
    const n = await page.evaluate(() => window.__brumaluz!.chunksCarregados ?? 0);
    if (n === antes && n >= minimo) break;
    antes = n;
  }
  await page.waitForTimeout(1500);
}

export const plano = (page: Page) =>
  page.evaluate(() => {
    const p = window.__brumaluz!.vila!()!;
    return { h: p.h, ox: p.ox, oz: p.oz, nascimento: p.nascimento, pontos: p.pontos };
  });

export async function hora(page: Page, h: number) {
  await page.evaluate((v) => {
    window.__brumaluz!.hora = v;
  }, h);
}

export async function camera(page: Page, p: V3 | null, a?: V3) {
  await page.evaluate(
    ([p, a]) => {
      (window as unknown as { __camFixa: unknown }).__camFixa = p ? { p, a } : null;
    },
    [p, a ?? null] as const,
  );
  await page.waitForTimeout(400);
}

export async function esconderJogador(page: Page, sim: boolean) {
  await page.evaluate((s) => {
    (window as unknown as { __esconder: string[] }).__esconder = s ? ['personagem', 'braco'] : [];
    if (!s)
      for (const m of window.__brumaluz!.cenaBabylon!().meshes)
        if (m.name.startsWith('personagem') || m.name.startsWith('braco')) m.isVisible = true;
  }, sim);
}

/** A foto só da cena (sem a interface) ou com ela (`ui`). */
export async function foto(page: Page, nome: string, ui = false) {
  mkdirSync(PASTA, { recursive: true });
  if (!ui)
    await page.evaluate(() => {
      const cena = document.getElementById('cena')!;
      for (const el of Array.from(document.body.querySelectorAll<HTMLElement>('*')))
        if (el !== cena && !el.contains(cena)) el.style.visibility = 'hidden';
    });
  await page.screenshot({ path: `${PASTA}/${nome}.jpg`, quality: 88 });
  if (!ui)
    await page.evaluate(() => {
      for (const el of Array.from(document.body.querySelectorAll<HTMLElement>('*')))
        el.style.visibility = '';
    });
  console.log(`FOTO ${nome}`);
}

/** As contas do quadro: triângulos, chamadas de desenho, peças, o povo e a turma. */
export async function medir(page: Page, nome: string) {
  await page.waitForTimeout(1200);
  const m = await page.evaluate(async () => {
    const e = window.__brumaluz!;
    const scene = e.cenaBabylon!() as unknown as {
      getActiveIndices(): number;
      getEngine(): { getFps(): number; _gl: Record<string, unknown> };
    };
    const eng = scene.getEngine();
    // as chamadas de desenho de um quadro: conta as chamadas do WebGL entre dois quadros
    const gl = eng._gl as Record<string, (...a: unknown[]) => unknown>;
    const nomes = ['drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced'];
    const orig = nomes.map((n) => gl[n]);
    let conta = 0;
    nomes.forEach((n, i) => {
      gl[n] = function (this: unknown, ...a: unknown[]) {
        conta++;
        return orig[i].apply(this, a);
      };
    });
    const quadro = () => new Promise((r) => requestAnimationFrame(r));
    await quadro();
    const medidas: number[] = [];
    for (let k = 0; k < 5; k++) {
      conta = 0;
      await quadro();
      medidas.push(conta);
    }
    nomes.forEach((n, i) => (gl[n] = orig[i]));
    medidas.sort((a, b) => a - b);
    const turma = (e.criaturas?.() ?? []).filter((c) => (c as { profissao?: string }).profissao);
    return {
      triangulos: Math.round(scene.getActiveIndices() / 3),
      desenhos: medidas[2],
      fps: Math.round(eng.getFps()),
      pecas: e.vilaPecas?.()?.triangulos ?? -1,
      moradores: turma.length,
      turma: e.showVila?.()?.turma ?? null,
    };
  });
  console.log(`MEDIDA ${nome} ${JSON.stringify(m)}`);
  return m;
}

export const decorrido = (page: Page) =>
  page.evaluate(() => {
    const e = window.__brumaluz!;
    const v = e.vilaEstado!();
    return v?.show ? e.vilaTempo!() - v.show.inicio : -1;
  });
export async function ate(page: Page, seg: number) {
  for (let i = 0; i < 4000; i++) {
    const d = await decorrido(page);
    if (d < 0 || d >= seg) return d;
    await page.waitForTimeout(30);
  }
  return -1;
}

/** A criança (escondida ou não) em (x, z), no chão. */
export async function ir(page: Page, x: number, z: number, y?: number, voar = false) {
  await page.evaluate(
    ([x, z, y, voar]) => {
      const e = window.__brumaluz!;
      e.voar?.(!!voar);
      e.teleportar!(x as number, z as number, (y as number | null) ?? undefined);
    },
    [x, z, y ?? null, voar] as const,
  );
}

/**
 * O show desta noite (spec 026, 16 nov 2026: o show é do bairro, sozinho, toda noite): a criança
 * na grade, de noite, espera as caixas acenderem sozinhas e o show começar. Precisa já ser noite.
 */
export async function acender(page: Page) {
  await page.evaluate(() => {
    const e = window.__brumaluz!;
    const p = e.vila!()!;
    const g = p.pontos.plateia;
    e.voar?.(false);
    e.teleportar!((g.x0 + g.x1) / 2 + 0.5, g.z1 - 1.5, p.h + 1.2);
  });
  await page.waitForFunction(() => !!window.__brumaluz!.vilaEstado!()?.show, undefined, {
    timeout: 90_000,
    polling: 250,
  });
}

export async function voo(page: Page, pontos: { p: V3; a: V3 }[], seg: number) {
  await page.evaluate(
    ([pontos, seg]) =>
      new Promise<void>((ok) => {
        const w = window as unknown as { __camFixa: { p: number[]; a: number[] } | null };
        const t0 = performance.now();
        const passo = () => {
          const u = Math.min(1, (performance.now() - t0) / 1000 / seg);
          const x = u * (pontos.length - 1);
          const i = Math.min(pontos.length - 2, Math.floor(x));
          let f = x - i;
          f = f * f * (3 - 2 * f);
          const A = pontos[i];
          const B = pontos[i + 1];
          const m = (a: number[], b: number[]) => a.map((v, k) => v + (b[k] - v) * f);
          w.__camFixa = { p: m(A.p, B.p), a: m(A.a, B.a) };
          if (u < 1) requestAnimationFrame(passo);
          else ok();
        };
        passo();
      }),
    [pontos, seg] as const,
  );
}

export function salvarWav(r: { taxa: number; l: string; r: string }, caminho: string) {
  const l = Buffer.from(r.l, 'base64');
  const rr = Buffer.from(r.r, 'base64');
  const n = Math.min(l.length, rr.length) / 2;
  const b = Buffer.alloc(44 + n * 4);
  b.write('RIFF', 0);
  b.writeUInt32LE(36 + n * 4, 4);
  b.write('WAVE', 8);
  b.write('fmt ', 12);
  b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20);
  b.writeUInt16LE(2, 22);
  b.writeUInt32LE(r.taxa, 24);
  b.writeUInt32LE(r.taxa * 4, 28);
  b.writeUInt16LE(4, 32);
  b.writeUInt16LE(16, 34);
  b.write('data', 36);
  b.writeUInt32LE(n * 4, 40);
  for (let k = 0; k < n; k++) {
    b.writeInt16LE(l.readInt16LE(k * 2), 44 + k * 4);
    b.writeInt16LE(rr.readInt16LE(k * 2), 46 + k * 4);
  }
  writeFileSync(caminho, b as unknown as string);
}
