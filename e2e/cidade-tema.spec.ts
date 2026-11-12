import { expect, test, type Browser, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { PASTA_CAPTURAS } from '../playwright.config';

/**
 * Spec 014, T08 a T10: o tema da Cidade Grande no jogo. Só roda com CIDADE_T08=1 (na GPU:
 * scripts/e2e-gpu.sh).
 *
 * - a primeira missão da cidade é a obra do primeiro canteiro (não "quebre troncos");
 * - capturas de dia, no entardecer e de noite: o céu e o horizonte de torres da calçada, os
 *   moradores andando, os bichos (cachorro grande, pombo, gato, carpa e guaxinim), a escada
 *   de incêndio, e o cachorro morando na casinha da obra 1 pronta; no computador e no celular;
 * - medida no celular na esquina do parque (canteiro aberto à vista): quadros, chamadas e
 *   triângulos com tudo, sem os fantasmas da obra e sem o horizonte.
 */
declare const process: { env: Record<string, string | undefined> };
test.skip(!process.env.CIDADE_T08, 'só com CIDADE_T08');
test.setTimeout(900_000);

const PASTA = process.env.CIDADE_PASTA ?? `${PASTA_CAPTURAS}/cidade-tema`;
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
    const w = window as unknown as {
      __camFixa: { p: V3; a: V3 } | null;
      __esconder: string[];
    };
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
    });
    // para a medida: esconde as malhas pelo começo do nome (fantasmas, horizonte)
    scene.onBeforeRenderObservable.add(() => {
      if (!w.__esconder.length) return;
      for (const m of scene.meshes)
        if (w.__esconder.some((p) => m.name.startsWith(p))) m.isVisible = false;
    });
  });
  await assentar(page);
}

async function assentar(page: Page, minimo = 15) {
  let antes = -1;
  for (let i = 0; i < 40; i++) {
    await page.waitForTimeout(1500);
    const n = await page.evaluate(() => window.__brumaluz!.chunksCarregados ?? 0);
    if (n === antes && n >= minimo) break;
    antes = n;
  }
  await page.waitForTimeout(1000);
}

async function hora(page: Page, h: number) {
  await page.evaluate((h) => {
    window.__brumaluz!.hora = h;
  }, h);
  await page.waitForTimeout(1800);
}

async function camera(page: Page, p: V3 | null, a?: V3) {
  await page.evaluate(
    ([p, a]) => {
      (window as unknown as { __camFixa: unknown }).__camFixa = p ? { p, a } : null;
    },
    [p, a ?? null] as const,
  );
  await page.waitForTimeout(500);
}

async function foto(page: Page, nome: string, hud = false) {
  mkdirSync(PASTA, { recursive: true });
  if (!hud)
    await page.evaluate(() => {
      const cena = document.getElementById('cena')!;
      for (const el of Array.from(document.body.querySelectorAll<HTMLElement>('*')))
        if (el !== cena && !el.contains(cena)) el.style.visibility = 'hidden';
    });
  await page.screenshot({ path: `${PASTA}/${nome}.jpg`, quality: 86 });
  if (!hud)
    await page.evaluate(() => {
      for (const el of Array.from(document.body.querySelectorAll<HTMLElement>('*')))
        el.style.visibility = '';
    });
  console.log(`CAPTURA ${nome}`);
}

const plano = (page: Page) =>
  page.evaluate(() => {
    const p = window.__brumaluz!.cidade!()!;
    return {
      h: p.h,
      ox: p.ox,
      oz: p.oz,
      parque: p.parque,
      lago: p.lago,
      nascimento: p.nascimento,
      praca: p.lotes.find((l) => l.uso === 'praca')!,
      canteiro1: p.lotes.find((l) => l.canteiro === 1)!,
      geminada: p.lotes
        .filter((l) => l.modelo === 'geminada' && (l.params?.andares ?? 0) >= 3)
        .sort(
          (a, b) =>
            Math.hypot(a.x0 - p.nascimento.x, a.z0 - p.nascimento.z) -
            Math.hypot(b.x0 - p.nascimento.x, b.z0 - p.nascimento.z),
        )[0],
    };
  });

/** A missão do cartão do diário no HUD (o título que a criança vê). */
const missaoNoHud = (page: Page) =>
  page.evaluate(() => document.querySelector('.missao-hud')?.textContent ?? '');

type Fantasma = { x: number; y: number; z: number; bloco: number; canteiro: number };

/** Enche a obra 1 inteira pelo clique direito de verdade, com a colher na mão. */
async function fazerObra1(page: Page) {
  await page.waitForFunction(
    () => {
      const i = window.__brumaluz!.inventario as unknown as {
        obter(i: number): { item: string } | null;
      };
      for (let k = 0; k < 9; k++) if (i.obter(k)?.item === 'colher_pedreiro') return true;
      return false;
    },
    undefined,
    { timeout: 30_000 },
  );
  await page.evaluate(() => {
    const e = window.__brumaluz!;
    const i = e.inventario as unknown as { obter(i: number): { item: string } | null };
    for (let k = 0; k < 9; k++) if (i.obter(k)?.item === 'colher_pedreiro') e.selecionarSlot!(k);
  });
  for (let volta = 0; volta < 90; volta++) {
    const lista: Fantasma[] = await page.evaluate(() =>
      (window.__brumaluz!.fantasmasPerto?.() ?? []).filter((f) => f.canteiro === 1),
    );
    if (!lista.length) break;
    let encheu = false;
    for (const f of lista.slice(0, 6)) {
      for (const [dx, dz, dy] of [
        [0, -2.6, 1.2],
        [0, 2.6, 1.2],
        [-2.6, 0, 1.2],
        [2.6, 0, 1.2],
        [0, -1.8, 2.8],
        [0, 1.8, 2.8],
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
        if ((await page.evaluate(() => window.__brumaluz!.obraColocados ?? 0)) > antes) {
          encheu = true;
          break;
        }
      }
      if (encheu) break;
    }
  }
  await page.waitForFunction(() => (window.__brumaluz!.obrasFeitas ?? []).includes(1), undefined, {
    timeout: 30_000,
  });
  await page.evaluate(() => window.__brumaluz!.voar?.(false));
}

async function cenasDaCidade(page: Page, pre: string, completo: boolean) {
  const p = await plano(page);
  const H = p.h;
  // a primeira missão, com o HUD (a criança acabou de nascer ao lado do canteiro)
  const missao = await missaoNoHud(page);
  console.log(`MISSAO ${pre} ${JSON.stringify(missao)}`);
  expect(missao).toContain('Casinha do cachorro');
  expect(missao).not.toMatch(/tora|tronco|lenha/i);
  await foto(page, `${pre}-missao-inicial`, true);

  // céu e horizonte: da calçada da avenida de fora, olhando para fora da cidade (e para
  // dentro, por cima dos prédios), na altura dos olhos
  const borda: V3 = [p.ox + 2, H + 1, p.parque.z0 - 8];
  for (const [q, h] of [
    ['dia', 0.42],
    ['entardecer', 0.755],
    ['noite', 0.96],
  ] as const) {
    await hora(page, h);
    await page.evaluate((b) => window.__brumaluz!.teleportar!(b[0], b[2], b[1]), borda);
    await camera(page, [borda[0] - 2, H + 2.6, borda[2]], [borda[0] - 40, H + 10, borda[2] + 6]);
    await assentar(page, 8);
    await foto(page, `${pre}-ceu-horizonte-fora-${q}`);
    await camera(
      page,
      [p.ox + 20, H + 2.6, p.parque.z0 - 4.5],
      [p.ox + 90, H + 14, p.parque.z0 - 4.5],
    );
    await foto(page, `${pre}-ceu-horizonte-rua-${q}`);
  }

  // a escada de incêndio (fina), de dia e de noite
  const g = p.geminada;
  const frenteZ = g.porta === 'n' ? g.z0 : g.z0 + g.profundidade;
  const sentido = g.porta === 'n' ? -1 : 1;
  for (const [q, h] of [
    ['dia', 0.42],
    ['noite', 0.96],
  ] as const) {
    await hora(page, h);
    await page.evaluate(([x, z, y]) => window.__brumaluz!.teleportar!(x, z, y), [
      g.x0 - 6,
      frenteZ + sentido * 3,
      H + 1,
    ] as V3);
    await camera(
      page,
      [g.x0 - 3, H + 4, frenteZ + sentido * 6],
      [g.x0 + 4, H + 7, frenteZ - sentido * 1],
    );
    await assentar(page, 8);
    await foto(page, `${pre}-escada-incendio-${q}`);
  }

  // moradores: na rua de trás da praça, de dia, depois de uns segundos andando
  await hora(page, 0.42);
  const pr = p.praca;
  await camera(page, null);
  await page.evaluate(([x, z, y]) => window.__brumaluz!.teleportar!(x, z, y), [
    pr.x0 + 4,
    pr.z0 - 3.5,
    H + 1,
  ] as V3);
  await page.waitForTimeout(25_000);
  const moradores = await page.evaluate(() =>
    (window.__brumaluz!.criaturas?.() ?? []).filter((c) => c.tipo === 'morador'),
  );
  console.log(
    `MORADORES ${pre} ${moradores.length} ${JSON.stringify(moradores.map((m) => m.profissao))}`,
  );
  expect(moradores.length).toBeGreaterThanOrEqual(3);
  const alvo = moradores
    .filter((m) => m.profissao !== 'construtor')
    .sort((a, b) => Math.hypot(a.x - pr.x0, a.z - pr.z0) - Math.hypot(b.x - pr.x0, b.z - pr.z0))[0];
  if (alvo) {
    await camera(page, [alvo.x - 3.5, alvo.y + 2.2, alvo.z - 3.5], [alvo.x, alvo.y + 1, alvo.z]);
    await foto(page, `${pre}-moradores-dia`);
  }
  // o pedreiro de capacete no canteiro
  const ped = moradores.find((m) => m.profissao === 'construtor');
  if (ped) {
    await camera(page, [ped.x + 3, ped.y + 2, ped.z + 3], [ped.x, ped.y + 1.1, ped.z]);
    await foto(page, `${pre}-pedreiro`);
  }
  // à noite eles entram em casa (as janelas acesas)
  await hora(page, 0.9);
  await camera(page, null);
  await page.waitForTimeout(20_000);
  const fora = await page.evaluate(
    () => (window.__brumaluz!.criaturas?.() ?? []).filter((c) => c.tipo === 'morador').length,
  );
  console.log(`MORADORES-NOITE ${pre} ${fora}`);
  await camera(page, [pr.x0 - 10, H + 3, pr.z0 - 3.5], [pr.x0 + 14, H + 4, pr.z0 - 4]);
  await foto(page, `${pre}-moradores-noite`);

  if (!completo) return;
  // os bichos da cidade, um ao lado do outro na calçada da praça (e a carpa no lago)
  await hora(page, 0.42);
  const bx = pr.x0 - 2;
  const bz = pr.z0 + pr.profundidade + 0.5;
  await page.evaluate(
    ([bx, bz, H, lx, lz]) => {
      const e = window.__brumaluz!;
      e.teleportar!(bx - 6, bz + 3, H + 1);
      e.invocar!('cervo', bx, H + 1, bz);
      e.invocar!('coelho', bx + 2.5, H + 1, bz);
      e.invocar!('coelho', bx + 3.2, H + 1, bz + 0.6);
      e.invocar!('raposa', bx + 5, H + 1, bz);
      e.invocar!('peixe', lx, H - 0.6, lz);
    },
    [bx, bz, H, p.lago.cx, p.lago.cz] as const,
  );
  await page.waitForTimeout(1200);
  await camera(page, [bx + 2.5, H + 2.4, bz + 4.5], [bx + 2.5, H + 1.2, bz]);
  await foto(page, `${pre}-bichos-dia`);
  await camera(page, [p.lago.cx + 2.5, H + 1.8, p.lago.cz + 2.5], [p.lago.cx, H - 0.5, p.lago.cz]);
  await page.evaluate(([x, z, y]) => window.__brumaluz!.teleportar!(x, z, y), [
    p.lago.cx + 4,
    p.lago.cz + 7,
    H + 1,
  ] as V3);
  await page.waitForTimeout(1500);
  await foto(page, `${pre}-carpa`);
  // à noite, no gramado do parque (longe das janelas acesas e dos postes): o guaxinim e,
  // ao lado, o cachorro grande e o gato, sólidos como de dia
  await hora(page, 0.96);
  const gx = p.lago.cx + 14;
  const gz = p.lago.cz - 9;
  await page.evaluate(
    ([gx, gz, H]) => {
      const e = window.__brumaluz!;
      e.teleportar!(gx - 6, gz + 4, H + 1);
      e.invocar!('espectro', gx, H + 1, gz);
      e.invocar!('cervo', gx + 2.2, H + 1, gz - 0.5);
      e.invocar!('raposa', gx - 1.8, H + 1, gz + 0.3);
    },
    [gx, gz, H] as const,
  );
  await page.waitForTimeout(1000);
  await camera(page, [gx + 0.3, H + 2.2, gz + 4.2], [gx + 0.3, H + 0.9, gz]);
  await foto(page, `${pre}-guaxinim-noite`);

  // o cachorro na casinha da obra 1 pronta
  await hora(page, 0.42);
  await camera(page, null);
  const c1 = p.canteiro1;
  await page.evaluate(([x, z, y]) => window.__brumaluz!.teleportar!(x, z, y), [
    c1.x0 + 4,
    c1.z0 + 4,
    H + 1,
  ] as V3);
  await page.waitForTimeout(2000);
  await fazerObra1(page);
  const fz = c1.porta === 'n' ? c1.z0 - 3 : c1.z0 + c1.profundidade + 3;
  await page.evaluate(([x, z, y]) => window.__brumaluz!.teleportar!(x, z, y), [
    c1.x0 + 4,
    fz,
    H + 1,
  ] as V3);
  await page.waitForFunction(
    ([x0, z0, w, d]) =>
      (window.__brumaluz!.criaturas?.() ?? []).some(
        (c) => c.tipo === 'cervo' && c.x >= x0 && c.x <= x0 + w && c.z >= z0 && c.z <= z0 + d,
      ),
    [c1.x0, c1.z0, c1.largura, c1.profundidade] as const,
    { timeout: 30_000 },
  );
  const cao = await page.evaluate(
    ([x0, z0, w, d]) =>
      (window.__brumaluz!.criaturas?.() ?? []).find(
        (c) => c.tipo === 'cervo' && c.x >= x0 && c.x <= x0 + w && c.z >= z0 && c.z <= z0 + d,
      )!,
    [c1.x0, c1.z0, c1.largura, c1.profundidade] as const,
  );
  void cao;
  // a festa (poeira e confete) acaba; a câmera fica na frente da casinha, de onde se vê a
  // abertura dela e o quintal (o cachorro mora ali dentro ou bem na porta)
  await page.waitForTimeout(8000);
  const vista = await page.evaluate(() => {
    const p = window.__brumaluz!.cidade!()!;
    const l = p.lotes.find((q) => q.canteiro === 1)!;
    const no = (s: number, f: number): [number, number] =>
      l.porta === 'n'
        ? [l.x0 + s + 0.5, l.z0 + f + 0.5]
        : [l.x0 + l.largura - 1 - s + 0.5, l.z0 + l.profundidade - 1 - f + 0.5];
    return { cam: no(4.2, -1.2), alvo: no(3, 3.6) };
  });
  const agora = await page.evaluate(
    ([x0, z0, w, d]) =>
      (window.__brumaluz!.criaturas?.() ?? []).find(
        (c) => c.tipo === 'cervo' && c.x >= x0 && c.x <= x0 + w && c.z >= z0 && c.z <= z0 + d,
      )!,
    [c1.x0, c1.z0, c1.largura, c1.profundidade] as const,
  );
  await camera(
    page,
    [vista.cam[0], H + 2.6, vista.cam[1]],
    [vista.alvo[0], H + 0.7, vista.alvo[1]],
  );
  console.log(`CACHORRO ${pre} ${JSON.stringify({ cachorro: [agora.x, agora.z], vista })}`);
  await foto(page, `${pre}-cachorro-casinha`);
  const missao2 = await missaoNoHud(page);
  console.log(`MISSAO-DEPOIS ${pre} ${JSON.stringify(missao2)}`);
}

test('tema da cidade: computador', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await abrir(page);
  await cenasDaCidade(page, 'pc', true);
});

test('tema da cidade: celular', async ({ browser }: { browser: Browser }) => {
  const ctx = await browser.newContext(IPHONE);
  const page = await ctx.newPage();
  await page.addInitScript(() => document.documentElement?.classList.add('toque'));
  await abrir(page);
  await cenasDaCidade(page, 'cel', false);
  await ctx.close();
});

/** Quadros, chamadas e triângulos por 6 s, parado, com a câmera do jogo. */
async function medir(page: Page, rotulo: string) {
  const r = await page.evaluate(async () => {
    const e = window.__brumaluz!;
    const scene = e.cenaBabylon!();
    let tri = 0;
    let quadros = 0;
    const amostras: number[] = [];
    let ultimo = performance.now();
    const fim = ultimo + 6000;
    const d0 = e.desenho!();
    await new Promise<void>((ok) => {
      const passo = () => {
        const agora = performance.now();
        quadros++;
        tri += scene.getActiveIndices() / 3;
        amostras.push(agora - ultimo);
        ultimo = agora;
        if (agora < fim) requestAnimationFrame(passo);
        else ok();
      };
      requestAnimationFrame(passo);
    });
    const d1 = e.desenho!();
    amostras.sort((a, b) => a - b);
    return {
      fps: Math.round((quadros / 6) * 10) / 10,
      p95ms: Math.round(amostras[Math.floor(amostras.length * 0.95)] * 10) / 10,
      chamadas: Math.round((d1.chamadas - d0.chamadas) / quadros),
      triangulos: Math.round(tri / quadros),
      escala: e.escalaResolucao,
      horizonte: e.horizonte?.() ?? null,
      fantasmas: e.fantasmasObra ?? 0,
    };
  });
  console.log(`DESEMPENHO ${rotulo} ${JSON.stringify(r)}`);
  return r;
}

for (const tela of ['celular', 'computador'] as const)
  test(`medida no centro com o canteiro aberto (${tela})`, async ({ browser }) => {
    const ctx = await browser.newContext(
      tela === 'celular' ? IPHONE : { viewport: { width: 1280, height: 720 } },
    );
    const page = await ctx.newPage();
    if (tela === 'celular')
      await page.addInitScript(() => document.documentElement?.classList.add('toque'));
    const lento = Number(process.env.DESACELERAR_CPU ?? 0);
    if (lento > 1) {
      const cdp = await page.context().newCDPSession(page);
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: lento });
    }
    await abrir(page);
    const p = await plano(page);
    // no centro, onde a criança nasce: o canteiro aberto (fantasmas) ao lado e o parque na frente
    const pe: V3 = [p.nascimento.x, p.h + 1, p.nascimento.z];
    const c1 = p.canteiro1;
    await page.evaluate(
      ([pe, cx, cz]) => {
        const e = window.__brumaluz!;
        e.teleportar!(pe[0], pe[2], pe[1]);
        e.apontar!(Math.atan2(cx - pe[0], cz - pe[2]), 0.1);
      },
      [pe, c1.x0 + 4, c1.z0 + 4] as const,
    );
    await assentar(page, 10);
    await page.waitForTimeout(6000);
    const cpu = lento > 1 ? `-cpu${lento}` : '';
    for (const [q, h] of [
      ['dia', 0.42],
      ['noite', 0.96],
    ] as const) {
      await hora(page, h);
      await page.waitForTimeout(2500);
      const tudo = await medir(page, `${tela}${cpu}-${q}-tudo`);
      expect(tudo.fantasmas).toBeGreaterThan(0);
      await page.evaluate(() => {
        (window as unknown as { __esconder: string[] }).__esconder = ['fantasmas-'];
      });
      await page.waitForTimeout(1500);
      await medir(page, `${tela}${cpu}-${q}-sem-fantasmas`);
      await page.evaluate(() => {
        (window as unknown as { __esconder: string[] }).__esconder = ['horizonte-'];
      });
      await page.waitForTimeout(1500);
      await medir(page, `${tela}${cpu}-${q}-sem-horizonte`);
      await page.evaluate(() => {
        const w = window as unknown as { __esconder: string[] };
        w.__esconder = [];
        const scene = window.__brumaluz!.cenaBabylon!();
        for (const m of scene.meshes)
          if (m.name.startsWith('fantasmas-') || m.name.startsWith('horizonte-'))
            m.isVisible = true;
      });
      await page.waitForTimeout(1500);
    }
    await ctx.close();
  });
