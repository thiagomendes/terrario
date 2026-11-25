import { expect, test, type Page } from '@playwright/test';
import { Bloco } from '../src/world/blocks';

/**
 * Desempenho da spec 037 (T00 na main de antes, T05 no ramo). Só com MEDIR_DESEMPENHO=1 (e
 * E2E_SEM_VSYNC=1). Celular em pé (390x844, toque), CPU 4x (DESACELERAR_CPU).
 *
 * - **a cena** (DESEMPENHO_037=cena): a Vila Neon de dia, a câmera girando devagar por 8 s, em
 *   rodadas alternadas, na terceira pessoa e (no ramo) na primeira; depois a entrada e a saída da
 *   primeira pessoa (do pedido até a câmera chegar, e o maior quadro), o giro rápido da câmera
 *   (meia volta em 0,5 s) e o giro da tela (em pé, deitado e em pé de novo), com o maior quadro.
 * - **a parede** (DESEMPENHO_037=parede, só no ramo): uma parede de 5 blocos no chão com a raposa
 *   domada seguindo a criança; conta as recusas (o bloco que a regra nova não deixa entrar).
 *
 *   E2E_ENV="-u 1000:1000 -e HOME=/tmp -e MEDIR_DESEMPENHO=1 -e E2E_SEM_VSYNC=1" \
 *     scripts/e2e-gpu.sh e2e/desempenho-037.spec.ts --workers 1 --trace off
 */
declare const process: { env: Record<string, string | undefined> };
test.skip(!process.env.MEDIR_DESEMPENHO, 'medição só com MEDIR_DESEMPENHO');
test.describe.configure({ mode: 'serial' });
test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });

const SO = process.env.DESEMPENHO_037;
const LENTO = Number(process.env.DESACELERAR_CPU ?? 4);
const RODADAS = Number(process.env.RODADAS ?? 3);

type Api = { ligar(s: boolean): void; fracao(): number; ligada(): boolean };
const temPP = (page: Page) => page.evaluate(() => !!(window.__brumaluz as { primeiraPessoa?: unknown }).primeiraPessoa);

async function abrir(page: Page, url: string) {
  await page.addInitScript(() => {
    HTMLElement.prototype.requestPointerLock = function () {
      return Promise.resolve();
    } as typeof HTMLElement.prototype.requestPointerLock;
    try {
      // a distância e a qualidade de fábrica do celular
      localStorage.setItem('terrario:config', JSON.stringify({ mostrarFps: false, mostrarAtalhos: false }));
    } catch {
      // sem armazenamento
    }
  });
  await page.goto(url);
  await page.waitForFunction(() => window.__brumaluz?.ready === true, undefined, { timeout: 240_000 });
  await page.evaluate(() => {
    document.querySelector('.entrada')?.setAttribute('hidden', '');
    const e = window.__brumaluz!;
    e.pausarDia = true;
    e.hora = 0.42;
    e.definirClima?.('limpo');
  });
  await page.addStyleTag({ content: '.toast-area { display: none !important; }' });
  // espera os pedaços do mundo pararem de chegar
  let antes = -1;
  for (let i = 0; i < 60; i++) {
    await page.waitForTimeout(1500);
    const n = await page.evaluate(() => window.__brumaluz!.chunksCarregados ?? 0);
    if (n === antes && n >= 12) break;
    antes = n;
  }
  await page.waitForTimeout(2000);
  await page.evaluate(() => {
    (window as unknown as { __almaUi?: { hud: { fechar(): void } } }).__almaUi?.hud.fechar();
  });
  await page.waitForTimeout(500);
}

async function desacelerar(page: Page) {
  if (LENTO <= 1) return;
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: LENTO });
}

/** Põe a câmera de dentro (ou de fora) e espera chegar; devolve o tempo e o maior quadro. */
const trocar = (page: Page, sim: boolean) =>
  page.evaluate(
    (sim) =>
      new Promise<{ ms: number; maior: number }>((ok) => {
        const pp = (window.__brumaluz as unknown as { primeiraPessoa: Api }).primeiraPessoa;
        const t0 = performance.now();
        let antes = t0;
        let maior = 0;
        pp.ligar(sim);
        const f = () => {
          const agora = performance.now();
          maior = Math.max(maior, agora - antes);
          antes = agora;
          if (pp.fracao() === (sim ? 1 : 0) || agora - t0 > 5000) ok({ ms: Math.round(agora - t0), maior: Math.round(maior) });
          else requestAnimationFrame(f);
        };
        requestAnimationFrame(f);
      }),
    sim,
  );

/** 8 s girando a câmera devagar: quadros, o p95, o maior e as chamadas por quadro. */
const medir = (page: Page) =>
  page.evaluate(async () => {
    const e = window.__brumaluz!;
    const amostras: number[] = [];
    const ms = 8000;
    const t0 = performance.now();
    let ultimo = t0;
    const d0 = e.desenho?.();
    await new Promise<void>((ok) => {
      const passo = () => {
        const agora = performance.now();
        e.apontar!(0.3 + Math.sin((agora - t0) / 1600) * 0.35, 0.05);
        amostras.push(agora - ultimo);
        ultimo = agora;
        if (agora < t0 + ms) requestAnimationFrame(passo);
        else ok();
      };
      requestAnimationFrame(passo);
    });
    const d1 = e.desenho?.();
    const n = amostras.length;
    const ordem = [...amostras].sort((a, b) => a - b);
    return {
      fps: Math.round((n / (ms / 1000)) * 10) / 10,
      p95ms: Math.round(ordem[Math.floor(n * 0.95)] * 10) / 10,
      maxMs: Math.round(ordem[n - 1]),
      desenhos: d0 && d1 ? Math.round((d1.chamadas - d0.chamadas) / n) : undefined,
    };
  });

/** Meia volta da câmera em 0,5 s, ida e volta: o maior quadro. */
const giroRapido = (page: Page) =>
  page.evaluate(
    () =>
      new Promise<number>((ok) => {
        const e = window.__brumaluz!;
        const t0 = performance.now();
        let antes = t0;
        let maior = 0;
        const f = () => {
          const agora = performance.now();
          maior = Math.max(maior, agora - antes);
          antes = agora;
          const t = (agora - t0) / 500;
          e.apontar!(0.3 + Math.PI * (t <= 1 ? t : Math.max(0, 2 - t)), 0.05);
          if (t < 2) requestAnimationFrame(f);
          else ok(Math.round(maior));
        };
        requestAnimationFrame(f);
      }),
  );

/** Anota o maior quadro enquanto `fazer` roda (e mais `depoisMs`). */
async function maiorQuadro(page: Page, fazer: () => Promise<void>, depoisMs = 1500): Promise<number> {
  await page.evaluate(() => {
    const w = window as unknown as { __vigia?: { max: number; ativo: boolean } };
    const v = (w.__vigia = { max: 0, ativo: true });
    let ultimo = performance.now();
    const passo = () => {
      const agora = performance.now();
      v.max = Math.max(v.max, agora - ultimo);
      ultimo = agora;
      if (v.ativo) requestAnimationFrame(passo);
    };
    requestAnimationFrame(passo);
  });
  await fazer();
  await page.waitForTimeout(depoisMs);
  return page.evaluate(() => {
    const v = (window as unknown as { __vigia: { max: number; ativo: boolean } }).__vigia;
    v.ativo = false;
    return Math.round(v.max);
  });
}

test('a cena na Vila Neon: terceira e primeira pessoa, entrar, sair e girar', async ({ page }) => {
  test.skip(!!SO && SO !== 'cena');
  test.setTimeout(900_000);
  await abrir(page, '/?tema=vila-neon');
  const pp = await temPP(page);
  await desacelerar(page);
  const medidas: Record<string, unknown[]> = { terceira: [], primeira: [] };
  const entrada: unknown[] = [];
  const saida: unknown[] = [];
  const giro: Record<string, number[]> = { terceira: [], primeira: [] };
  for (let r = 0; r < RODADAS; r++) {
    medidas.terceira.push(await medir(page));
    giro.terceira.push(await giroRapido(page));
    if (!pp) continue;
    entrada.push(await trocar(page, true));
    await page.waitForTimeout(800);
    medidas.primeira.push(await medir(page));
    giro.primeira.push(await giroRapido(page));
    saida.push(await trocar(page, false));
    await page.waitForTimeout(800);
  }
  // o giro da tela (em pé, deitado e em pé), na câmera de fora e (no ramo) na de dentro
  const tela: Record<string, number> = {};
  const girarTela = async () => {
    await page.setViewportSize({ width: 844, height: 390 });
    await page.waitForTimeout(1500);
    await page.setViewportSize({ width: 390, height: 844 });
  };
  tela.terceira = await maiorQuadro(page, girarTela);
  if (pp) {
    await trocar(page, true);
    await page.waitForTimeout(800);
    tela.primeira = await maiorQuadro(page, girarTela);
    await trocar(page, false);
  }
  console.log(`DESEMPENHO-037 cena ${JSON.stringify({ pp, medidas, entrada, saida, giro, tela })}`);
});

test('a parede de 5 blocos com a raposa domada seguindo', async ({ page }) => {
  test.skip(!!SO && SO !== 'parede');
  test.setTimeout(600_000);
  await abrir(page, '/?tema=doce-reino');
  test.skip(!(await temPP(page)), 'a regra nova é do ramo');
  // uma plataforma de pedra lisa com o ar limpo em cima (pelo lote, que não tem a regra de apoio)
  const { cx, cz, Y } = await page.evaluate((pedra) => {
    const e = window.__brumaluz!;
    const [px, , pz] = e.posicao!;
    const cx = Math.floor(px);
    const cz = Math.floor(pz);
    let alto = 0;
    for (let dx = -8; dx <= 8; dx++)
      for (let dz = -8; dz <= 8; dz++) {
        let y = 120;
        while (y > 2 && e.bloco!(cx + dx, y, cz + dz) === 0) y--;
        alto = Math.max(alto, y);
      }
    const Y = alto + 8;
    const lote: { x: number; y: number; z: number; v: number }[] = [];
    for (let dx = -7; dx <= 7; dx++)
      for (let dz = -7; dz <= 7; dz++) {
        lote.push({ x: cx + dx, y: Y, z: cz + dz, v: pedra });
        for (let dy = 1; dy <= 4; dy++) lote.push({ x: cx + dx, y: Y + dy, z: cz + dz, v: 0 });
      }
    e.editarLote!(lote);
    return { cx, cz, Y };
  }, Bloco.PEDRA_LISA);
  await expect
    .poll(() => page.evaluate((r) => window.__brumaluz!.bloco!(r.cx + 7, r.Y, r.cz + 7), { cx, cz, Y }))
    .toBe(Bloco.PEDRA_LISA);
  await page.evaluate(
    ({ x, y, z }) => window.__brumaluz!.teleportar!(x, z, y),
    { x: cx - 2.5, y: Y + 1, z: cz - 1.5 },
  );
  await page.evaluate((b) => {
    const e = window.__brumaluz!;
    e.inventario!.definir(0, { item: `bloco:${b}`, qtd: 64 });
    e.selecionarSlot!(0);
  }, Bloco.TABUAS);
  await page.waitForTimeout(1500);
  // a raposa domada, ao lado dela
  await page.evaluate(
    ({ x, y, z }) => window.__brumaluz!.invocar!('raposa', x, y, z, { domada: true }),
    { x: cx - 1.5, y: Y + 1, z: cz - 2.5 },
  );
  await page.waitForTimeout(2000);
  // a parede: 5 células seguidas em z = cz + 1, de x = cx - 2 a cx + 2; a criança anda ao lado
  // dela (em z = cz - 1), um passo por bloco, e a raposa vem atrás
  let recusas = 0;
  const raposaPerto: number[] = [];
  const parede: { x: number; ok: boolean; tentativas: number }[] = [];
  for (let i = 0; i < 5; i++) {
    const x = cx - 2 + i;
    await page.evaluate(({ x, y, z }) => window.__brumaluz!.teleportar!(x, z, y), { x: x + 0.5, y: Y + 1, z: cz - 0.5 });
    await page.waitForTimeout(1200);
    let ok = false;
    let t = 0;
    for (; t < 6 && !ok; t++) {
      await expect
        .poll(() => page.evaluate(({ x, y, z }) => window.__brumaluz!.mirarBloco!(x, y, z, { x: 0, y: 1, z: 0 }), { x, y: Y, z: cz + 1 }), {
          timeout: 15_000,
        })
        .toBe(true);
      const r = await page.evaluate(() => window.__brumaluz!.interagir!('colocar'));
      await page.waitForTimeout(700);
      const b = await page.evaluate(({ x, y, z }) => window.__brumaluz!.bloco!(x, y, z), { x, y: Y + 1, z: cz + 1 });
      ok = !!r && b === Bloco.TABUAS;
      if (!ok) {
        recusas++;
        await page.waitForTimeout(1000);
      }
    }
    const d = await page.evaluate(
      ({ x, z }) => {
        const f = window.__brumaluz!.criaturas!().find((c) => c.tipo === 'raposa');
        return f ? Math.round(Math.hypot(f.x - x, f.z - z) * 10) / 10 : -1;
      },
      { x: x + 0.5, z: cz - 0.5 },
    );
    raposaPerto.push(d);
    parede.push({ x, ok, tentativas: t });
  }
  // a raposa não ficou presa num bloco
  const presa = await page.evaluate(() => {
    const e = window.__brumaluz!;
    const f = e.criaturas!().find((c) => c.tipo === 'raposa');
    return f ? e.bloco!(Math.floor(f.x), Math.floor(f.y + 0.2), Math.floor(f.z)) !== 0 : null;
  });
  console.log(`DESEMPENHO-037 parede ${JSON.stringify({ recusas, parede, raposaPerto, presa })}`);
});
