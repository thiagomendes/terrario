import { test, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { PASTA_CAPTURAS } from '../playwright.config';

/**
 * Spec 026 (parte 2, o Parque de diversões): as fotos do parque para a revisão (só com
 * PARQUE_FOTOS=1, na placa de vídeo: scripts/e2e-gpu.sh). `PARQUE_SO=entrada,roda` tira só as
 * que começam com esses nomes; `PARQUE_PASTA` muda a pasta.
 */
declare const process: { env: Record<string, string | undefined> };
test.skip(!process.env.PARQUE_FOTOS, 'só com PARQUE_FOTOS');
test.setTimeout(1_800_000);

const PASTA = process.env.PARQUE_PASTA ?? `${PASTA_CAPTURAS}/vila-parque`;
const SO = (process.env.PARQUE_SO ?? '').split(',').filter(Boolean);
const quer = (nome: string) => !SO.length || SO.some((s) => nome.startsWith(s));
type V3 = [number, number, number];
const HORAS = { dia: 0.42, entardecer: 0.755, noite: 0.96 } as const;

async function assentar(page: Page, minimo = 12) {
  let antes = -1;
  for (let i = 0; i < 40; i++) {
    await page.waitForTimeout(1500);
    const n = await page.evaluate(() => window.__brumaluz!.chunksCarregados ?? 0);
    if (n === antes && n >= minimo) break;
    antes = n;
  }
  await page.waitForTimeout(1500);
}

async function abrir(page: Page, distancia: number) {
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
  await page.goto('/?tema=vila-neon');
  await page.waitForFunction(() => window.__brumaluz?.ready === true, undefined, {
    timeout: 240_000,
  });
  await page.evaluate(() => {
    document.querySelector<HTMLElement>('.entrada')?.setAttribute('hidden', '');
    const e = window.__brumaluz!;
    e.pausarDia = true;
    e.hora = 0.42;
    e.definirClima?.('limpo');
    const w = window as unknown as { __camFixa: { p: V3; a: V3 } | null; __esconder: boolean };
    w.__camFixa = null;
    w.__esconder = false;
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
      if (!w.__esconder) return;
      for (const m of scene.meshes)
        if (m.name.startsWith('personagem') || m.name.startsWith('braco')) m.isVisible = false;
    });
  });
  await assentar(page);
}

/** Leva a criança (escondida) para (u, v) do mapa e fixa a câmera: de `p` olhando para `a` (u, altura, v). */
async function cena(page: Page, pe: [number, number], p: V3, a: V3, hora: keyof typeof HORAS) {
  await page.evaluate(
    ([pe, p, a, h]) => {
      const e = window.__brumaluz!;
      const pl = e.vila!()!;
      const m = (q: V3): V3 => [pl.ox + q[0], pl.h + 1 + q[1], pl.oz + q[2]];
      const w = window as unknown as { __camFixa: unknown; __esconder: boolean };
      e.hora = h;
      e.voar?.(true);
      e.teleportar!(pl.ox + pe[0], pl.oz + pe[1], pl.h + 30);
      w.__esconder = true;
      w.__camFixa = { p: m(p), a: m(a) };
    },
    [pe, p, a, HORAS[hora]] as const,
  );
  await assentar(page, 20);
}

async function foto(page: Page, nome: string) {
  mkdirSync(PASTA, { recursive: true });
  await page.evaluate(() => {
    const cena = document.getElementById('cena')!;
    for (const el of Array.from(document.body.querySelectorAll<HTMLElement>('*')))
      if (el !== cena && !el.contains(cena)) el.style.visibility = 'hidden';
  });
  await page.screenshot({ path: `${PASTA}/${nome}.jpg`, quality: 90 });
  await page.evaluate(() => {
    for (const el of Array.from(document.body.querySelectorAll<HTMLElement>('*')))
      el.style.visibility = '';
  });
  const p = await page.evaluate(() => window.__brumaluz!.parqueVila?.() ?? null);
  console.log(`${nome}: ${JSON.stringify(p)}`);
}

/** As vistas do parque: [nome, onde a criança fica (u, v), a câmera (u, altura, v), o alvo]. */
const VISTAS: [string, [number, number], V3, V3][] = [
  ['entrada', [133, 48], [133, 2.2, 66], [136, 4.5, 40]],
  ['passeio', [140, 36], [127, 2.4, 37], [160, 6, 28]],
  ['roda', [158, 36], [160, 3, 44], [160, 9.5, 26]],
  ['roda-de-lado', [158, 34], [146, 5, 36], [160, 9, 26]],
  ['carrossel', [142, 40], [133, 2.6, 34], [142, 3.4, 43]],
  ['carrossel-perto', [142, 40], [146, 2.2, 36], [141, 2.8, 43]],
  ['bate-bate', [134, 22], [134, 3.2, 26], [134, 1.5, 14]],
  ['bate-bate-perto', [134, 20], [128, 2.6, 21.5], [135, 1.2, 14]],
  ['barracas', [154, 32], [156.5, 2.2, 29], [156.5, 2.2, 37]],
  ['argola', [151, 32], [151.5, 2.3, 31.5], [151.5, 1.8, 37]],
  ['pescaria', [161, 32], [161.5, 2.3, 31.5], [161.5, 1.6, 37]],
  ['pipoca-e-algodao', [141, 32], [141, 2.0, 33], [141, 1.6, 28]],
  ['baloes', [136, 50], [133, 1.9, 49], [137, 2.6, 52]],
  ['fazendinha', [162, 47], [158, 3.2, 49], [171, 1, 47]],
  ['do-alto', [150, 30], [128, 30, 70], [150, 0, 28]],
  ['do-alto-da-roda', [160, 26], [163, 18, 22], [110, 0, 70]],
];

test('Vila Neon: as fotos do Parque de diversões', async ({ page }) => {
  await abrir(page, Number(process.env.PARQUE_DIST ?? 6));
  for (const h of ['dia', 'noite'] as const)
    for (const [nome, pe, p, a] of VISTAS) {
      if (!quer(nome)) continue;
      if (h === 'noite' && process.env.PARQUE_SEM_NOITE) continue;
      await cena(page, pe, p, a, h);
      await foto(page, `${nome}-${h}`);
    }
});
