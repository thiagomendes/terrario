import { test, type Browser, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { PASTA_CAPTURAS } from '../playwright.config';

/**
 * Spec 014, T04: a Cidade Grande de verdade (o planejador e os cinco prédios), sem o palco do
 * esboço. Só roda com CIDADE_T04=1 (na GPU: scripts/e2e-gpu.sh).
 *
 * - capturas: a cidade da calçada e do alto, cada prédio por fora (e um por dentro), de dia
 *   e de noite, no computador e no celular;
 * - medida: quadros por segundo, chamadas de desenho e triângulos à vista na esquina do
 *   parque, de dia e de noite, no computador, no celular emulado e com a CPU 4× mais lenta
 *   (DESACELERAR_CPU=4). Sem o teto de 60 do monitor com E2E_SEM_VSYNC=1.
 */
declare const process: { env: Record<string, string | undefined> };
test.skip(!process.env.CIDADE_T04, 'só com CIDADE_T04');

const PASTA = process.env.CIDADE_PASTA ?? `${PASTA_CAPTURAS}/cidade`;
type V3 = [number, number, number];

const IPHONE = {
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
};

async function abrir(page: Page, distancia: number, tema = 'cidade-grande') {
  page.on('pageerror', (e) => console.log(`erro na página: ${String(e)}`));
  await page.addInitScript((d: number) => {
    try {
      localStorage.setItem(
        'terrario:config',
        JSON.stringify({ distancia: d, mostrarFps: false, mostrarAtalhos: false }),
      );
    } catch {
      // sem armazenamento: a distância padrão
    }
  }, distancia);
  const lento = Number(process.env.DESACELERAR_CPU ?? 0);
  if (lento > 1) {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: lento });
  }
  await page.goto(`/?tema=${tema}`);
  await page.waitForFunction(() => window.__brumaluz?.ready === true, undefined, {
    timeout: 240_000,
  });
  await page.evaluate(() => {
    document.querySelector<HTMLElement>('.entrada')?.setAttribute('hidden', '');
    const e = window.__brumaluz!;
    e.pausarDia = true;
    e.hora = 0.42;
    e.definirClima?.('limpo');
    // câmera fixa para as capturas (null: a do jogo)
    const w = window as unknown as { __camFixa: { p: V3; a: V3 } | null };
    w.__camFixa = null;
    const scene = e.cenaBabylon!();
    scene.onBeforeCameraRenderObservable.add((c) => {
      const f = w.__camFixa;
      if (!f) return;
      const cam = c as unknown as {
        position: {
          set(x: number, y: number, z: number): void;
          clone(): { set(...a: number[]): unknown };
        };
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

/** Espera os chunks pararem de chegar. */
async function assentar(page: Page, minimo = 20) {
  let antes = -1;
  for (let i = 0; i < 40; i++) {
    await page.waitForTimeout(2000);
    const n = await page.evaluate(() => window.__brumaluz!.chunksCarregados ?? 0);
    if (n === antes && n >= minimo) break;
    antes = n;
  }
  await page.waitForTimeout(1500);
}

/** Pontos de interesse da cidade (do plano, o mesmo do jogo). */
async function pontos(page: Page) {
  return page.evaluate(() => {
    const p = window.__brumaluz!.cidade!()!;
    const H = p.h;
    const fachada = (
      l: (typeof p.lotes)[number],
      dist = 4,
      alt = 5,
    ): { cam: V3; alvo: V3; pe: V3 } => {
      const cx = l.x0 + l.largura / 2;
      const frenteZ = l.porta === 'n' ? l.z0 : l.z0 + l.profundidade;
      const sentido = l.porta === 'n' ? -1 : 1;
      const camZ = frenteZ + sentido * dist;
      return {
        cam: [cx - 9, H + alt, camZ],
        alvo: [cx, H + alt + 3, frenteZ - sentido * 2],
        pe: [cx - 12, H + 1, camZ],
      };
    };
    const perto = (u: (l: (typeof p.lotes)[number]) => boolean) =>
      p.lotes
        .filter(u)
        .sort(
          (a, b) =>
            Math.hypot(a.x0 - p.nascimento.x, a.z0 - p.nascimento.z) -
            Math.hypot(b.x0 - p.nascimento.x, b.z0 - p.nascimento.z),
        )[0];
    const predios: Record<string, { cam: V3; alvo: V3; pe: V3 }> = {
      geminada: fachada(perto((l) => l.modelo === 'geminada' && (l.params?.andares ?? 0) >= 3)),
      tijolo: fachada(perto((l) => l.uso === 'padaria')),
      deco: fachada(
        perto((l) => l.modelo === 'deco'),
        12,
        4,
      ),
      alto: fachada(
        perto((l) => l.modelo === 'alto'),
        13,
        4,
      ),
      escola: fachada(
        perto((l) => l.modelo === 'escola'),
        10,
        3,
      ),
    };
    // por dentro: o térreo de uma geminada, da porta para o fundo
    const g = perto((l) => l.modelo === 'geminada');
    const z0 = g.porta === 'n' ? g.z0 : g.z0 + 8;
    const s = g.porta === 'n' ? 1 : -1;
    const xs = g.porta === 'n' ? g.x0 : g.x0 + 7;
    const pk = p.parque;
    return {
      h: H,
      nascimento: [p.nascimento.x, H + 1, p.nascimento.z] as V3,
      olhar: p.nascimento.olhar,
      predios,
      dentro: {
        cam: [xs + s * 3.5, H + 3.8, z0 + s * 3.3] as V3,
        alvo: [xs + s * 2.5, H + 3.2, z0 + s * 7.5] as V3,
        pe: [xs + s * 4.5, H + 3, z0 + s * 5.5] as V3,
      },
      // rua: da calçada, ao longo da rua do nascimento
      rua: {
        cam: [p.nascimento.x - 24, H + 2.6, pk.z0 - 4.5] as V3,
        alvo: [p.nascimento.x + 20, H + 5, pk.z0 - 4.5] as V3,
        pe: [p.nascimento.x - 27, H + 1, pk.z0 - 3.5] as V3,
      },
      // avenida: do meio da avenida 1, olhando o parque e os prédios altos
      avenida: {
        cam: [pk.x0 - 4, H + 2.6, pk.z1 + 30] as V3,
        alvo: [pk.x0 - 4, H + 9, pk.z0 - 20] as V3,
        pe: [pk.x0 - 7, H + 1, pk.z1 + 33] as V3,
      },
      // do alto: em cima do parque, olhando a cidade inteira
      alto: {
        cam: [pk.x0 - 45, H + 70, pk.z1 + 55] as V3,
        alvo: [(pk.x0 + pk.x1) / 2, H, (pk.z0 + pk.z1) / 2] as V3,
        pe: [(pk.x0 + pk.x1) / 2, H + 1, (pk.z0 + pk.z1) / 2] as V3,
      },
      // esquina do parque: onde se mede (os prédios altos em volta)
      esquina: { pe: [pk.x0 - 4.5, H + 1, pk.z0 - 4.5] as V3, yaw: Math.atan2(1, -1) },
    };
  });
}

async function foto(
  page: Page,
  nome: string,
  v: { cam: V3; alvo: V3; pe: V3 },
  fov = 60,
  minimo = 10,
) {
  await page.evaluate(
    ({ v, fov }) => {
      const e = window.__brumaluz!;
      e.teleportar!(v.pe[0], v.pe[2], v.pe[1]);
      (window as unknown as { __camFixa: unknown }).__camFixa = { p: v.cam, a: v.alvo };
      const c = e.cenaBabylon!().activeCamera as unknown as { fov: number };
      c.fov = (fov * Math.PI) / 180;
    },
    { v, fov },
  );
  await assentar(page, minimo);
  // só o 3D na foto
  await page.evaluate(() => {
    const cena = document.getElementById('cena')!;
    for (const el of Array.from(document.body.querySelectorAll<HTMLElement>('*')))
      if (el !== cena && !el.contains(cena)) el.style.visibility = 'hidden';
  });
  mkdirSync(PASTA, { recursive: true });
  await page.screenshot({ path: `${PASTA}/${nome}.jpg`, quality: 88 });
  console.log(`CAPTURA ${nome}`);
}

async function noite(page: Page, ligada: boolean) {
  await page.evaluate((l) => {
    const e = window.__brumaluz!;
    e.hora = l ? 0.96 : 0.42;
  }, ligada);
  await page.waitForTimeout(1500);
}

test('capturas da cidade (computador)', async ({ page }) => {
  test.setTimeout(900_000);
  await page.setViewportSize({ width: 1280, height: 720 });
  await abrir(page, 8);
  const pt = await pontos(page);
  console.log(`CIDADE ${JSON.stringify({ h: pt.h, nascimento: pt.nascimento })}`);
  for (const n of [false, true]) {
    await noite(page, n);
    const q = n ? 'noite' : 'dia';
    await foto(page, `pc-ceu-${q}`, pt.alto, 60, 150);
    await foto(page, `pc-rua-${q}`, pt.rua);
    await foto(page, `pc-avenida-${q}`, pt.avenida);
    for (const [k, v] of Object.entries(pt.predios)) await foto(page, `pc-${k}-${q}`, v);
    await foto(page, `pc-dentro-${q}`, pt.dentro, 75);
  }
  // o nascimento, com a câmera do jogo (terceira pessoa)
  await noite(page, false);
  await page.evaluate(
    ({ n, o }) => {
      const e = window.__brumaluz!;
      (window as unknown as { __camFixa: unknown }).__camFixa = null;
      e.teleportar!(n[0], n[2], n[1]);
      e.apontar!(o, 0.1);
    },
    { n: pt.nascimento, o: pt.olhar },
  );
  await assentar(page, 10);
  await page.screenshot({ path: `${PASTA}/pc-nascimento.jpg`, quality: 88 });
});

async function celular(browser: Browser) {
  const ctx = await browser.newContext(IPHONE);
  const page = await ctx.newPage();
  return { ctx, page };
}

test('capturas da cidade (celular)', async ({ browser }) => {
  test.setTimeout(900_000);
  const { ctx, page } = await celular(browser);
  await abrir(page, 6);
  const pt = await pontos(page);
  for (const n of [false, true]) {
    await noite(page, n);
    const q = n ? 'noite' : 'dia';
    await foto(page, `cel-rua-${q}`, pt.rua, 70);
    await foto(page, `cel-ceu-${q}`, pt.alto, 70, 80);
    await foto(page, `cel-deco-${q}`, pt.predios.deco, 70);
    await foto(page, `cel-geminada-${q}`, pt.predios.geminada, 70);
  }
  await ctx.close();
});

/** Quadros, chamadas e triângulos por 6 s, parado e girando, com a câmera do jogo. */
async function medir(page: Page, rotulo: string, yaw0: number) {
  const um = (girar: boolean) =>
    page.evaluate(
      async ({ girar, yaw0 }) => {
        const e = window.__brumaluz!;
        const scene = e.cenaBabylon!();
        const amostras: number[] = [];
        let yaw = yaw0;
        let tri = 0;
        let triMax = 0;
        const fim = performance.now() + 6000;
        let ultimo = performance.now();
        let quadros = 0;
        const d0 = e.desenho!();
        await new Promise<void>((ok) => {
          const passo = () => {
            const agora = performance.now();
            quadros++;
            if (girar) {
              yaw += (agora - ultimo) * 0.0008;
              e.apontar!(yaw, 0.12);
            }
            const t = scene.getActiveIndices() / 3;
            tri += t;
            triMax = Math.max(triMax, t);
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
          triangulosMax: Math.round(triMax),
          escala: e.escalaResolucao,
          chunks: e.chunksCarregados,
          logicaMs: e.logicaQuadroMs,
        };
      },
      { girar, yaw0 },
    );
  const parado = await um(false);
  const girando = await um(true);
  console.log(`DESEMPENHO ${rotulo} ${JSON.stringify({ parado, girando })}`);
}

async function medirNaEsquina(page: Page, rotulo: string) {
  await abrir(page, 3);
  const pt = await pontos(page);
  await page.evaluate(
    ({ p, y }) => {
      const e = window.__brumaluz!;
      e.teleportar!(p[0], p[2], p[1]);
      e.apontar!(y, 0.12);
    },
    { p: pt.esquina.pe, y: pt.esquina.yaw },
  );
  await assentar(page, 10);
  await page.waitForTimeout(6000);
  for (const n of [false, true]) {
    await noite(page, n);
    await page.waitForTimeout(3000);
    await medir(page, `${rotulo}-${n ? 'noite' : 'dia'}`, pt.esquina.yaw);
  }
  // spec 014 (T15), CIDADE_AB=1: o mesmo, de dia, com os veículos escondidos (o custo deles)
  if (process.env.CIDADE_AB) {
    await noite(page, false);
    // o que está à vista, por começo de nome (as malhas ativas do quadro)
    console.log(
      `ATIVAS ${await page.evaluate(() => {
        const scene = window.__brumaluz!.cenaBabylon!();
        const n: Record<string, number> = {};
        for (const m of scene.getActiveMeshes().data) {
          const k = m.name.replace(/[-_]?\d.*$/, '');
          n[k] = (n[k] ?? 0) + 1;
        }
        const alvos = scene.customRenderTargets.map((t) => t.name);
        return JSON.stringify({
          n,
          alvos,
          veiculos: window.__brumaluz!.veiculos?.().filter((v) => v.visivel).length,
          custo: window.__brumaluz!.custoVeiculos?.(),
        });
      })}`,
    );
    await page.evaluate(() => {
      const scene = window.__brumaluz!.cenaBabylon!();
      const w = window as unknown as { __semVeiculos: boolean };
      w.__semVeiculos = true;
      scene.onBeforeRenderObservable.add(() => {
        for (const m of scene.meshes)
          if (m.name.startsWith('veiculo')) m.isVisible = !w.__semVeiculos;
      });
    });
    await page.waitForTimeout(3000);
    await medir(page, `${rotulo}-dia-sem-veiculos`, pt.esquina.yaw);
    // e de novo com eles (a primeira medida pode ter pegado o mundo ainda assentando)
    await page.evaluate(() => {
      (window as unknown as { __semVeiculos: boolean }).__semVeiculos = false;
    });
    await page.waitForTimeout(3000);
    await medir(page, `${rotulo}-dia-com-veiculos-de-novo`, pt.esquina.yaw);
  }
}

test('medida na esquina do parque (computador)', async ({ page }) => {
  test.setTimeout(600_000);
  await page.setViewportSize({ width: 1280, height: 720 });
  await medirNaEsquina(
    page,
    `pc${process.env.DESACELERAR_CPU ? `-cpu${process.env.DESACELERAR_CPU}` : ''}`,
  );
});

test('medida na esquina do parque (celular)', async ({ browser }) => {
  test.setTimeout(600_000);
  const { ctx, page } = await celular(browser);
  await page.addInitScript(() => document.documentElement.classList.add('toque'));
  await medirNaEsquina(
    page,
    `celular${process.env.DESACELERAR_CPU ? `-cpu${process.env.DESACELERAR_CPU}` : ''}`,
  );
  await ctx.close();
});

/** Referência: o mesmo, no nascimento do Rancho Alegre (o campo de antes da cidade). */
for (const tela of ['computador', 'celular'] as const)
  test(`medida de referência no Rancho (${tela})`, async ({ browser }) => {
    test.setTimeout(600_000);
    const ctx = await browser.newContext(
      tela === 'celular' ? IPHONE : { viewport: { width: 1280, height: 720 } },
    );
    const page = await ctx.newPage();
    await abrir(page, 3, 'rancho-alegre');
    await page.waitForTimeout(6000);
    const cpu = process.env.DESACELERAR_CPU ? `-cpu${process.env.DESACELERAR_CPU}` : '';
    for (const n of [false, true]) {
      await noite(page, n);
      await page.waitForTimeout(3000);
      await medir(page, `${tela}${cpu}-rancho-${n ? 'noite' : 'dia'}`, 0);
    }
    await ctx.close();
  });
