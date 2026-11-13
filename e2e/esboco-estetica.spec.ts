import { test, type Browser, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { comecarGravacao, pararGravacao } from './gravarCena';

/**
 * Esboço 014d (`src/esboco/veiculosEstetica.ts`, com `?esboco=estetica`): os três estilos da
 * lataria firme (A "Fundido", B "Madeirinha", C "Miniatura", o do jogo) na Cidade Grande de
 * verdade, com a criança do lado: os quatro de lado (comparação), cada um de 3/4 pela frente e
 * de lado, a frota inteira de cada estilo em fila, de dia e de noite, no computador e no
 * celular; e o vídeo do estilo escolhido chegando, freando na zebra e fazendo a curva.
 * Só com ESBOCO_ESTETICA=1. ESTETICA_SO=policia,bombeiros limita os tipos; ESTETICA_PARTE=
 * vitrine|fila|video escolhe a parte; ESTETICA_RAPIDO=1 só o computador e de dia.
 */
declare const process: { env: Record<string, string | undefined> };
test.skip(!process.env.ESBOCO_ESTETICA, 'esboço só com ESBOCO_ESTETICA=1');
const PASTA = 'capturas-014d';
type V3 = [number, number, number];
type Tipo = 'taxi' | 'civil' | 'civilAzul' | 'policia' | 'onibusAzul' | 'sorvete' | 'ambulancia' | 'bombeiros';
type Versao = 'A' | 'B' | 'C';
const TIPOS: Tipo[] = ['policia', 'taxi', 'civil', 'onibusAzul', 'sorvete', 'ambulancia', 'bombeiros'];
const SO = process.env.ESTETICA_SO?.split(',') as Tipo[] | undefined;
const PARTE = process.env.ESTETICA_PARTE;
const RAPIDO = !!process.env.ESTETICA_RAPIDO;
const VERSOES: Versao[] = (process.env.ESTETICA_VERSOES?.split(',') as Versao[] | undefined) ?? ['A', 'B', 'C'];
const grande = (t: Tipo) => t === 'onibusAzul' || t === 'bombeiros';

async function abrir(browser: Browser, w: number, h: number) {
  mkdirSync(`${PASTA}/video-bruto`, { recursive: true });
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  await ctx.addInitScript(() => {
    try {
      localStorage.setItem(
        'terrario:config',
        JSON.stringify({ distancia: 6, mostrarFps: false, qualidade: 'alta', mostrarAtalhos: false }),
      );
    } catch {
      // sem armazenamento
    }
  });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => console.log('erro na página:', String(e)));
  await p.goto('/?tema=cidade-grande&esboco=estetica');
  await p.waitForFunction(() => window.__brumaluz?.ready === true && !!window.__estetica, undefined, {
    timeout: 240_000,
  });
  await p.evaluate(() => {
    document.querySelector<HTMLElement>('.entrada')?.setAttribute('hidden', '');
    const e = window.__brumaluz!;
    e.pausarDia = true;
    e.hora = 0.42;
    e.definirClima?.('limpo');
    const wj = window as unknown as { __camFixa: { p: number[]; a: number[]; fov?: number } | null };
    wj.__camFixa = null;
    e.cenaBabylon!().onBeforeCameraRenderObservable.add((c) => {
      const f = wj.__camFixa;
      if (!f) return;
      const cam = c as unknown as {
        position: { set(...a: number[]): void; clone(): { set(...a: number[]): unknown } };
        setTarget(v: unknown): void;
        fov: number;
      };
      cam.position.set(...f.p);
      const alvo = cam.position.clone();
      alvo.set(...f.a);
      cam.setTarget(alvo);
      cam.fov = f.fov ?? 0.8;
      // recorta a cena com a vista da câmera fixa (6b32d1e)
      (c.getScene() as unknown as { setTransformMatrix(a: unknown, b: unknown): void }).setTransformMatrix(
        (c as unknown as { getViewMatrix(f: boolean): unknown }).getViewMatrix(true),
        (c as unknown as { getProjectionMatrix(f: boolean): unknown }).getProjectionMatrix(true),
      );
    });
  });
  let antes = -1;
  for (let i = 0; i < 40; i++) {
    await p.waitForTimeout(1500);
    const n = await p.evaluate(() => window.__brumaluz!.chunksCarregados ?? 0);
    if (n === antes && n > 20) break;
    antes = n;
  }
  await p.evaluate(() => {
    const cena = document.getElementById('cena')!;
    for (const el of Array.from(document.body.querySelectorAll<HTMLElement>('*')))
      if (el !== cena && !el.contains(cena)) el.style.visibility = 'hidden';
  });
  return p;
}

const camera = (p: Page, pos: V3, alvo: V3, fov = 0.8) =>
  p.evaluate(
    ([a, b, f]) => {
      (window as unknown as { __camFixa: unknown }).__camFixa = { p: a, a: b, fov: f };
    },
    [pos, alvo, fov] as const,
  );

async function crianca(p: Page, x: number, z: number, olhar: [number, number]) {
  await p.evaluate(
    ([x2, z2, o]) => {
      const e = window.__brumaluz!;
      e.voar?.(false);
      e.teleportar!(x2, z2);
      const yaw = Math.atan2(o[0] - x2, o[1] - z2);
      e.apontar?.(yaw, 0);
      e.personagem?.girarCorpo?.(yaw);
    },
    [x, z, olhar] as const,
  );
}

const foto = (p: Page, nome: string) =>
  p.screenshot({ path: `${PASTA}/${nome}.jpg`, type: 'jpeg', quality: 88 });

async function vitrines(p: Page, disp: string, comNoite: boolean) {
  for (const tipo of SO ?? TIPOS) {
    const g = grande(tipo);
    // os três de lado, um atrás do outro (A na frente), com a criança na calçada
    const v = await p.evaluate(([t, vs]) => window.__estetica!.vitrine(t as Tipo, vs as Versao[]), [tipo, VERSOES] as const);
    const [mx, my, mz] = v.meio;
    const [rx, rz] = v.direita;
    const [fx, fz] = v.frente;
    const kx = mx + rx * 2.3;
    const kz = mz + rz * 2.3;
    const dLado = Math.max(7, v.comp * 0.62);
    const camLado: V3 = [mx - rx * dLado, my + (g ? 3.2 : 2.2), mz - rz * dLado];
    await crianca(p, kx, kz, [camLado[0], camLado[2]]);
    await p.waitForTimeout(900);
    await camera(p, camLado, [mx, my + (g ? 1.6 : 0.8), mz], 0.95);
    await p.waitForTimeout(700);
    await foto(p, `${disp}-${tipo}-comparacao-lado`);
    if (comNoite) {
      await p.evaluate(() => window.__estetica!.noite(true));
      await p.waitForTimeout(2500);
      const camN: V3 = [mx - rx * dLado * 0.8 + fx * dLado * 0.5, my + (g ? 3.4 : 2.4), mz - rz * dLado * 0.8 + fz * dLado * 0.5];
      await camera(p, camN, [mx, my + (g ? 1.5 : 0.7), mz], 0.95);
      await p.waitForTimeout(700);
      await foto(p, `${disp}-${tipo}-comparacao-noite`);
      await p.evaluate(() => window.__estetica!.noite(false));
      await p.waitForTimeout(1200);
    }
    // cada um sozinho: 3/4 pela frente e de lado, de perto, com a criança ao lado
    for (const versao of VERSOES) {
      const u = await p.evaluate(([t, vv]) => window.__estetica!.vitrine(t as Tipo, [vv as Versao]), [tipo, versao] as const);
      const [cx, cy, cz] = u.centros[0];
      // a criança na calçada, um pouco à frente do bico (à vista da câmera)
      const meio = (u.comp - 1.5) / 2;
      const k2x = cx + rx * 1.4 + fx * (meio + 0.8);
      const k2z = cz + rz * 1.4 + fz * (meio + 0.8);
      // os grandes: a câmera mais à frente do que de lado (do outro lado da rua há prédios)
      const d = g ? 7.2 : 4.6;
      const ld = g ? 3.9 : d * 0.72;
      const fd = g ? 6.4 : d * 0.78;
      const cam34: V3 = [cx - rx * ld + fx * fd, cy + (g ? 3.4 : 1.9), cz - rz * ld + fz * fd];
      await crianca(p, k2x, k2z, [cam34[0], cam34[2]]);
      await p.waitForTimeout(700);
      await camera(p, cam34, [cx + fx * 0.3, cy + (g ? 1.5 : 0.75), cz + fz * 0.3], 0.9);
      await p.waitForTimeout(600);
      await foto(p, `${disp}-${tipo}-${versao}-34`);
      if (!RAPIDO) {
        const dl = g ? 4.3 : d;
        const lado: V3 = [cx - rx * dl, cy + (g ? 2.2 : 1.15), cz - rz * dl];
        await camera(p, lado, [cx, cy + (g ? 1.6 : 0.8), cz], g ? 1.25 : 0.9);
        await p.waitForTimeout(500);
        await foto(p, `${disp}-${tipo}-${versao}-lado`);
      }
    }
  }
}

async function filas(p: Page, disp: string, comNoite: boolean) {
  for (const versao of VERSOES) {
    const f = await p.evaluate((vv) => window.__estetica!.fila(vv as Versao), versao);
    const [mx, my, mz] = f.meio;
    const [rx, rz] = f.direita;
    const [fx, fz] = f.frente;
    const k0 = [0, 1, 2].map((i) => (f.pontos[3][i] + f.pontos[4][i]) / 2);
    // a criança na outra mão da rua, ao lado da polícia (do lado da câmera, à vista)
    await crianca(p, k0[0] - rx * 1.7, k0[2] - rz * 1.7, [mx - rx * 10, mz - rz * 10]);
    await p.waitForTimeout(900);
    const d = f.comp * 0.7;
    const cam: V3 = [mx - rx * d + fx * 1.5, my + d * 0.28, mz - rz * d + fz * 1.5];
    await camera(p, cam, [mx + fx * 1.5, my + 0.9, mz + fz * 1.5], disp === 'celular' ? 0.95 : 0.8);
    await p.waitForTimeout(800);
    await foto(p, `${disp}-fila-${versao}`);
    if (comNoite) {
      await p.evaluate(() => window.__estetica!.noite(true));
      await p.waitForTimeout(2500);
      await foto(p, `${disp}-fila-${versao}-noite`);
      await p.evaluate(() => window.__estetica!.noite(false));
      await p.waitForTimeout(1200);
    }
  }
}

test('esboço da estética: vitrines, filas e custo', async ({ browser }) => {
  test.setTimeout(1_800_000);
  const p = await abrir(browser, 1280, 720);
  const custo = await p.evaluate(() => window.__estetica!.custo());
  writeFileSync(`${PASTA}/custos.json`, JSON.stringify(custo, null, 1));
  console.log('custo', JSON.stringify(custo));
  if (PARTE !== 'fila' && PARTE !== 'video') await vitrines(p, 'pc', !RAPIDO);
  if (PARTE !== 'vitrine' && PARTE !== 'video') await filas(p, 'pc', !RAPIDO);
  if (!RAPIDO && PARTE !== 'video') {
    await p.setViewportSize({ width: 844, height: 390 });
    await p.evaluate(() => window.__brumaluz!.cenaBabylon!().getEngine().resize());
    await p.waitForTimeout(1200);
    if (PARTE !== 'fila') await vitrines(p, 'celular', false);
    if (PARTE !== 'vitrine') await filas(p, 'celular', false);
  }
  await p.context().close();
});

test('esboço da estética: a curva (vídeo)', async ({ browser }) => {
  test.skip(PARTE !== 'video', 'vídeo só com ESTETICA_PARTE=video');
  test.setTimeout(900_000);
  const p = await abrir(browser, 1280, 720);
  const versao = (process.env.ESTETICA_VIDEO ?? 'C') as Versao;
  for (const tipo of (SO ?? ['policia', 'bombeiros', 'taxi']) as Tipo[]) {
    const info = await p.evaluate(([t, v]) => window.__estetica!.dirigir(t as Tipo, v as Versao), [tipo, versao] as const);
    const [px, py, pz] = info.parada;
    const [rx, rz] = info.direita;
    const [fx, fz] = info.frente;
    await crianca(p, px + fx * 3.2 + rx * 2.4, pz + fz * 3.2 + rz * 2.4, [px, pz]);
    await p.evaluate(
      ([r, f, y, g]) => {
        const wj = window as unknown as { __camFixa: { p: number[]; a: number[]; fov?: number } | null };
        let cx = 0;
        let cz = 0;
        let pronto = false;
        const d = g ? 5.6 : 4.6;
        const passo = () => {
          const s = window.__estetica!.estado();
          if (s.fase === 'nada') return;
          if (!pronto) {
            cx = s.x;
            cz = s.z;
            pronto = true;
          }
          cx += (s.x - cx) * 0.12;
          cz += (s.z - cz) * 0.12;
          wj.__camFixa = {
            p: [cx - r[0] * d + f[0] * 2.4, y + (g ? 3.6 : 2.4), cz - r[1] * d + f[1] * 2.4],
            a: [cx, y + (g ? 1.3 : 0.8), cz],
            fov: g ? 1.05 : 0.9,
          };
          if (!s.fim) requestAnimationFrame(passo);
        };
        requestAnimationFrame(passo);
      },
      [info.direita, info.frente, py, grande(tipo)] as const,
    );
    await comecarGravacao(p);
    await p.waitForFunction(() => window.__estetica!.estado().fim, undefined, { timeout: 60_000, polling: 100 });
    await p.waitForTimeout(300);
    await pararGravacao(p, `${PASTA}/video-bruto/${tipo}-${versao}.webm`);
  }
  await p.context().close();
});
