import { test, type Browser, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { comecarGravacao, pararGravacao } from './gravarCena';

/**
 * 014c: o passo dos bichos da Cidade Grande ao lado dos do Rancho Alegre. Um desfile sem
 * cérebro (`desfile`, só nos testes de tela) leva cada bicho por um caminho fixo: anda reto de
 * lado para a câmera, para e respira, vira no lugar e volta fazendo curvas. Fotos de cada um
 * no meio do passo (computador e celular), o grupo com a criança, e um vídeo por bicho (os
 * .webm de cada trecho, gravados do canvas, vão para PASTA/video-bruto; o mp4 sai pelo ffmpeg).
 * Só com BICHOS_PASSO=1 (BICHOS_ROTULO=antes|depois separa as rodadas).
 */
declare const process: { env: Record<string, string | undefined> };
test.skip(!process.env.BICHOS_PASSO, 'capturas do passo só com BICHOS_PASSO=1');
test.describe.configure({ mode: 'serial' });
const ROTULO = process.env.BICHOS_ROTULO ?? 'depois';
const PASTA = `capturas-014c/bichos-${ROTULO}`;

type Tipo = 'cervo' | 'coelho' | 'raposa' | 'espectro';
interface Bicho {
  tipo: Tipo;
  nome: string;
  /** Rapidez do passeio (blocos/s, a do jogo vagando) e distância da câmera. */
  v: number;
  dist: number;
}
const CIDADE: Bicho[] = [
  { tipo: 'cervo', nome: 'cachorro-grande', v: 1.3, dist: 3.4 },
  { tipo: 'raposa', nome: 'gato', v: 1.7, dist: 2.6 },
  { tipo: 'coelho', nome: 'pombo', v: 1.1, dist: 2.0 },
  { tipo: 'espectro', nome: 'guaxinim', v: 1.3, dist: 2.5 },
];
const RANCHO: Bicho[] = [
  { tipo: 'cervo', nome: 'vaca', v: 1.3, dist: 3.8 },
  { tipo: 'raposa', nome: 'cachorro', v: 1.7, dist: 2.8 },
  { tipo: 'coelho', nome: 'galinha', v: 1.1, dist: 2.0 },
];

async function abrir(browser: Browser, tema: string, _gravar: boolean, w = 1280, h = 720) {
  mkdirSync(`${PASTA}/video-bruto`, { recursive: true });
  const ctx = await browser.newContext({
    viewport: { width: w, height: h },
  });
  await ctx.addInitScript(() => {
    try {
      localStorage.setItem(
        'terrario:config',
        JSON.stringify({ distancia: 5, mostrarFps: false, qualidade: 'alta', mostrarAtalhos: false }),
      );
    } catch {
      // sem armazenamento
    }
  });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => console.log('erro na página:', String(e)));
  await p.goto(`/?tema=${tema}`);
  await p.waitForFunction(() => window.__brumaluz?.ready === true, undefined, { timeout: 240_000 });
  await p.evaluate(() => {
    document.querySelector<HTMLElement>('.entrada')?.setAttribute('hidden', '');
    const e = window.__brumaluz!;
    e.pausarDia = true;
    e.hora = 0.42;
    e.definirClima?.('limpo');
    // câmera fixa das capturas, recortando a cena com a vista dela (commit 6b32d1e)
    const wj = window as unknown as { __camFixa: { p: number[]; a: number[] } | null };
    wj.__camFixa = null;
    e.cenaBabylon!().onBeforeCameraRenderObservable.add((c) => {
      const f = wj.__camFixa;
      if (!f) return;
      const cam = c as unknown as {
        position: { set(...a: number[]): void; clone(): { set(...a: number[]): unknown } };
        setTarget(v: unknown): void;
      };
      cam.position.set(...f.p);
      // lente mais fechada: o bicho grande na foto, sem deformar
      (c as unknown as { fov: number }).fov = 0.62;
      const alvo = cam.position.clone();
      alvo.set(...f.a);
      cam.setTarget(alvo);
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
  // só o 3D na tela
  await p.evaluate(() => {
    const cena = document.getElementById('cena')!;
    for (const el of Array.from(document.body.querySelectorAll<HTMLElement>('*')))
      if (el !== cena && !el.contains(cena)) el.style.visibility = 'hidden';
  });
  return p;
}

/** Um trecho plano e livre perto da criança: a origem, o rumo da pista e a altura do chão. */
async function pista(p: Page) {
  // na cidade, no parque (longe do trânsito): a criança vai para lá antes
  const parque = await p.evaluate(() => {
    const c = window.__brumaluz!.cidade?.();
    if (!c) return null;
    const r = c.parque;
    return [(r.x0 + r.x1) / 2, (r.z0 + r.z1) / 2] as [number, number];
  });
  if (parque) {
    await p.evaluate(([x, z]) => window.__brumaluz!.teleportar!(x, z), parque);
    await p.waitForTimeout(6000);
  }
  return p.evaluate(() => {
    const e = window.__brumaluz!;
    const [px, py, pz] = e.jogadorPes!();
    const chao = (x: number, z: number) => {
      for (let y = Math.floor(py) + 3; y > Math.floor(py) - 6; y--) if (e.bloco!(x, y, z)) return y;
      return -99;
    };
    let melhor: { ox: number; oz: number; ux: number; uz: number; y: number; nota: number } | null = null;
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2;
      const ux = Math.sin(a);
      const uz = Math.cos(a);
      for (const recuo of [2, 4, 6]) {
        const ox = px + ux * recuo;
        const oz = pz + uz * recuo;
        const y0 = chao(Math.floor(ox), Math.floor(oz));
        let nota = 0;
        for (let s = -1; s <= 10; s++)
          for (let w = -3; w <= 3; w++) {
            const x = Math.floor(ox + ux * s - uz * w);
            const z = Math.floor(oz + uz * s + ux * w);
            if (chao(x, z) === y0 && !e.bloco!(x, y0 + 1, z) && !e.bloco!(x, y0 + 2, z)) nota++;
          }
        if (!melhor || nota > melhor.nota) melhor = { ox, oz, ux, uz, y: y0 + 1, nota };
      }
    }
    return melhor!;
  });
}

/**
 * Leva os bichos pelo caminho por `seg` segundos (a câmera acompanha o `segue`, de lado):
 * anda 7 blocos, para 3 s, vira no lugar e volta fazendo curvas.
 */
async function desfilar(
  p: Page,
  pi: Awaited<ReturnType<typeof pista>>,
  bichos: { tipo: Tipo; v: number; w: number }[],
  seg: number,
  segue: { dist: number; i: number } | null,
  fotos: { t: number; nome: string }[] = [],
  pasta = PASTA,
) {
  const tirar = fotos.slice();
  await p.evaluate(
    ([pi2, bs, seg2, sg]) => {
      const e = window.__brumaluz!;
      const wj = window as unknown as {
        __camFixa: { p: number[]; a: number[] } | null;
        __desfileT: number;
        __desfileFim: boolean;
      };
      const t0 = performance.now();
      wj.__desfileFim = false;
      // cada desfile com ids novos (o desenho do bicho é guardado pelo id)
      const w2 = window as unknown as { __desfileN?: number };
      const base = (w2.__desfileN = (w2.__desfileN ?? 0) + 1) * 10;
      const lugar = (b: (typeof bs)[number], t: number) => {
        const L = 7;
        const ta = L / b.v;
        let s: number;
        let w = 0;
        let rumo = 0;
        if (t < ta) s = b.v * t;
        else if (t < ta + 3) s = L;
        else if (t < ta + 4.4) {
          s = L;
          const f = (t - ta - 3) / 1.4;
          rumo = Math.PI * (0.5 - 0.5 * Math.cos(f * Math.PI));
        } else {
          const tt = t - ta - 4.4;
          s = Math.max(-1, L - b.v * tt);
          w = Math.sin(tt * 1.1) * 0.9;
          const dw = Math.cos(tt * 1.1) * 0.9 * 1.1;
          rumo = Math.PI - Math.atan2(dw, b.v);
        }
        const { ox, oz, ux, uz } = pi2;
        const ww = b.w + w;
        const x = ox + ux * s - uz * ww;
        const z = oz + uz * s + ux * ww;
        // rumo 0 = ao longo da pista; vira em volta do eixo vertical
        const dx = ux * Math.cos(rumo) - uz * Math.sin(rumo);
        const dz = uz * Math.cos(rumo) + ux * Math.sin(rumo);
        return { x, z, yaw: Math.atan2(dx, dz) };
      };
      const passo = () => {
        const t = (performance.now() - t0) / 1000;
        wj.__desfileT = t;
        if (t > seg2) {
          wj.__desfileFim = true;
          return;
        }
        const lista = bs.map((b, i) => {
          const l = lugar(b, t);
          return { id: base + i, tipo: b.tipo, x: l.x, y: pi2.y, z: l.z, yaw: l.yaw };
        });
        e.desfile!(lista);
        if (sg) {
          const l = lista[sg.i];
          const { ux, uz } = pi2;
          // de lado e um pouco à frente, na altura do bicho
          wj.__camFixa = {
            p: [l.x + uz * sg.dist * 1.25 + ux * 0.8, pi2.y + sg.dist * 0.3, l.z - ux * sg.dist * 1.25 + uz * 0.8],
            a: [l.x, pi2.y + sg.dist * 0.11, l.z],
          };
        }
        requestAnimationFrame(passo);
      };
      requestAnimationFrame(passo);
    },
    [pi, bichos, seg, segue] as const,
  );
  for (;;) {
    const { t, fim } = await p.evaluate(() => {
      const wj = window as unknown as { __desfileT: number; __desfileFim: boolean };
      return { t: wj.__desfileT ?? 0, fim: wj.__desfileFim };
    });
    if (fim) break;
    if (tirar.length && t >= tirar[0].t) {
      const f = tirar.shift()!;
      await p.screenshot({ path: `${pasta}/${f.nome}.jpg`, type: 'jpeg', quality: 86 });
      continue;
    }
    await p.waitForTimeout(40);
  }
}

async function tema(browser: Browser, id: string, bichos: Bicho[], prefixo: string) {
  const p = await abrir(browser, id, true);
  const pi = await pista(p);
  console.log(prefixo, 'pista', JSON.stringify(pi));
  await p.evaluate(([ux, uz]) => window.__brumaluz!.apontar!(Math.atan2(ux, uz), 0.1), [pi.ux, pi.uz] as const);
  for (const [i, b] of bichos.entries()) {
    const ta = 7 / b.v;
    await comecarGravacao(p);
    await desfilar(p, pi, [{ tipo: b.tipo, v: b.v, w: 0 }], ta + 4.4 + 5, { dist: b.dist, i: 0 }, [
      { t: ta * 0.55, nome: `${prefixo}-${b.nome}-andando` },
      { t: ta + 2.2, nome: `${prefixo}-${b.nome}-parado` },
      { t: ta + 3.7, nome: `${prefixo}-${b.nome}-virando` },
    ]);
    await pararGravacao(p, `${PASTA}/video-bruto/${prefixo}-${b.nome}.webm`);
    void i;
  }
  // o grupo com a criança, de 3/4 (dia e noite)
  const grupo = bichos.map((b, i) => ({ tipo: b.tipo, v: 1.2, w: (i - (bichos.length - 1) / 2) * 1.3 }));
  const fixa = (alto: number, recuo: number) =>
    p.evaluate(
      ([pi2, al, rc]) => {
        const wj = window as unknown as { __camFixa: { p: number[]; a: number[] } | null };
        const { ox, oz, ux, uz, y } = pi2;
        wj.__camFixa = {
          p: [ox + ux * 3 + uz * rc - ux * 2.5, y + al, oz + uz * 3 - ux * rc - uz * 2.5],
          a: [ox + ux * 3, y + 0.5, oz + uz * 3],
        };
      },
      [pi, alto, recuo] as const,
    );
  await fixa(2.6, 6.5);
  await comecarGravacao(p);
  await desfilar(p, pi, grupo, 5, null, [{ t: 2.4, nome: `${prefixo}-grupo-dia` }]);
  await pararGravacao(p, `${PASTA}/video-bruto/${prefixo}-grupo.webm`);
  await p.evaluate(() => {
    window.__brumaluz!.hora = 0.95;
  });
  await p.waitForTimeout(2500);
  await fixa(2.6, 6.5);
  await desfilar(p, pi, grupo, 4, null, [{ t: 2.4, nome: `${prefixo}-grupo-noite` }]);
  await p.context().close();
  // celular deitado: o grupo e cada bicho de perto
  const c = await abrir(browser, id, false, 844, 390);
  const pc = await pista(c);
  await c.evaluate(([ux, uz]) => window.__brumaluz!.apontar!(Math.atan2(ux, uz), 0.1), [pc.ux, pc.uz] as const);
  await c.evaluate(
    ([pi2]) => {
      const wj = window as unknown as { __camFixa: { p: number[]; a: number[] } | null };
      const { ox, oz, ux, uz, y } = pi2;
      wj.__camFixa = {
        p: [ox + ux * 3 + uz * 6 - ux * 2.5, y + 2.4, oz + uz * 3 - ux * 6 - uz * 2.5],
        a: [ox + ux * 3, y + 0.5, oz + uz * 3],
      };
    },
    [pc] as const,
  );
  await desfilar(c, pc, grupo, 5, null, [{ t: 2.4, nome: `${prefixo}-celular-grupo` }]);
  for (const b of bichos) {
    const ta = 7 / b.v;
    await desfilar(c, pc, [{ tipo: b.tipo, v: b.v, w: 0 }], ta * 0.6, { dist: b.dist * 0.9, i: 0 }, [
      { t: ta * 0.55, nome: `${prefixo}-celular-${b.nome}` },
    ]);
  }
  await c.context().close();
}

test('passo dos bichos: cidade', async ({ browser }) => {
  test.setTimeout(900_000);
  await tema(browser, 'cidade-grande', CIDADE, 'cidade');
});

test('passo dos bichos: rancho', async ({ browser }) => {
  test.setTimeout(900_000);
  await tema(browser, 'rancho-alegre', RANCHO, 'rancho');
});

/**
 * O cachorro da casinha, no jogo de verdade (o bicho do núcleo, com o cérebro dele): a criança
 * enche a obra 1 com a colher do pedreiro, o cachorro vem morar e passeia no quintal.
 */
test('passo dos bichos: o cachorro da casinha', async ({ browser }) => {
  test.setTimeout(900_000);
  const p = await abrir(browser, 'cidade-grande', true);
  await p.waitForFunction(
    () => {
      const e = window.__brumaluz!;
      const i = e.inventario as unknown as { obter(i: number): { item: string } | null };
      return (e.colherRecebida ?? 0) > 0 || !!i.obter(0);
    },
    undefined,
    { timeout: 30_000 },
  );
  const mao = await p.evaluate(() => {
    const i = window.__brumaluz!.inventario as unknown as { obter(i: number): { item: string } | null };
    for (let k = 0; k < 9; k++) if (i.obter(k)?.item === 'colher_pedreiro') return k;
    return 0;
  });
  await p.evaluate((k) => window.__brumaluz!.selecionarSlot!(k), mao);
  for (let volta = 0; volta < 120; volta++) {
    const lista = await p.evaluate(() =>
      (window.__brumaluz!.fantasmasPerto?.() ?? []).filter((f) => f.canteiro === 1),
    );
    if (!lista.length) break;
    let pos = false;
    for (const f of lista.slice(0, 6)) {
      for (const [dx, dz, dy] of [
        [0, -2.6, 1.2],
        [0, 2.6, 1.2],
        [-2.6, 0, 1.2],
        [2.6, 0, 1.2],
        [0, -1.8, 2.8],
        [0, 1.8, 2.8],
      ]) {
        const ok = await p.evaluate(
          ([f2, a, b, c]) => {
            const e = window.__brumaluz!;
            e.voar?.(true);
            e.teleportar!(f2.x + 0.5 + a, f2.z + 0.5 + b, f2.y + c);
            e.mirarPonto!(f2.x + 0.5, f2.y + 0.5, f2.z + 0.5);
            return !!e.fantasmaNaMira?.();
          },
          [f, dx, dz, dy] as const,
        );
        if (!ok) continue;
        await p.evaluate(() => window.__brumaluz!.usarOuColocar!());
        await p.waitForTimeout(140);
        pos = true;
        break;
      }
      if (pos) break;
    }
  }
  await p.waitForFunction(() => (window.__brumaluz!.obrasFeitas ?? []).includes(1), undefined, {
    timeout: 30_000,
  });
  // a criança desce na calçada em frente e espera o cachorro chegar
  const lote = await p.evaluate(() => {
    const e = window.__brumaluz!;
    const c = e.cidade!()!;
    const l = c.lotes.find((q) => q.canteiro === 1)!;
    const s = l.porta === 'n' ? -1 : 1;
    e.voar?.(false);
    e.teleportar!(l.x0 + 4, l.z0 + 4.5 + s * 7);
    return { cx: l.x0 + 4, cz: l.z0 + 4.5, s, h: c.h + 1 };
  });
  await p.waitForFunction(
    () => (window.__brumaluz!.criaturas?.() ?? []).some((c) => c.tipo === 'cervo'),
    undefined,
    { timeout: 60_000 },
  );
  await p.evaluate((l) => {
    const wj = window as unknown as { __camFixa: { p: number[]; a: number[] } | null };
    wj.__camFixa = { p: [l.cx - 5, l.h + 3.4, l.cz + l.s * 9.5], a: [l.cx, l.h + 0.6, l.cz] };
  }, lote);
  await comecarGravacao(p);
  for (let k = 0; k < 4; k++) {
    await p.waitForTimeout(3000);
    await p.screenshot({ path: `${PASTA}/cidade-casinha-${k + 1}.jpg`, type: 'jpeg', quality: 86 });
  }
  await p.waitForTimeout(3000);
  await pararGravacao(p, `${PASTA}/video-bruto/cidade-casinha.webm`);
  await p.context().close();
});
