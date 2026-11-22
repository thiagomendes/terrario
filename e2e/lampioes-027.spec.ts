import { expect, test, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { criarMundo, TAMANHOS } from './guia-palco';

/**
 * Spec 027 (T06): o lampião de abóbora posto vira a peça arredondada em todos os mundos, com o
 * rosto do tema, e o lampião e o caldeirão postos são instanciados por pedaço. Na placa de vídeo:
 * - cem lampiões e cem caldeirões postos num pedaço à vista somam no máximo duas chamadas de
 *   desenho a mais (as chamadas de um quadro, contadas no WebGL);
 * - as fotos do lampião do Rancho (a carinha de festa junina dele) e o da festa (o sorriso de
 *   olhos redondos), em `capturas-027/parte1/`.
 */
test.setTimeout(600_000);
type V3 = [number, number, number];

async function abrir(page: Page, id: string, tema: string) {
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
  await criarMundo(page, id, tema, {}, 1337);
  await page.goto(`/?mundo=${id}&escala=1`);
  await page.waitForFunction(() => window.__brumaluz?.ready === true, undefined, { timeout: 240_000 });
  await page.evaluate(() => {
    document.querySelector<HTMLElement>('.entrada')?.setAttribute('hidden', '');
    const e = window.__brumaluz!;
    e.pausarDia = true;
    e.hora = 0.42;
    e.definirClima?.('limpo');
    const w = window as unknown as { __camFixa: { p: V3; a: V3 } | null };
    w.__camFixa = null;
    e.cenaBabylon!().onBeforeCameraRenderObservable.add((c) => {
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
      (c.getScene() as unknown as { setTransformMatrix(a: unknown, b: unknown): void }).setTransformMatrix(
        (c as unknown as { getViewMatrix(f: boolean): unknown }).getViewMatrix(true),
        (c as unknown as { getProjectionMatrix(f: boolean): unknown }).getProjectionMatrix(true),
      );
    });
  });
  await page.addStyleTag({ content: '.toast-area, .dica-mira { display: none !important; }' });
  await page.waitForTimeout(3000);
}

/** As chamadas de desenho de um quadro (a mediana de 5). */
async function chamadas(page: Page): Promise<number> {
  return page.evaluate(async () => {
    const scene = window.__brumaluz!.cenaBabylon!() as unknown as {
      getEngine(): { _gl: Record<string, (...a: unknown[]) => unknown> };
    };
    const gl = scene.getEngine()._gl;
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
    const m: number[] = [];
    for (let k = 0; k < 5; k++) {
      conta = 0;
      await quadro();
      m.push(conta);
    }
    nomes.forEach((n, i) => (gl[n] = orig[i]));
    m.sort((a, b) => a - b);
    return m[2];
  });
}

test('cem lampiões e cem caldeirões postos num pedaço: no máximo duas chamadas a mais', async ({ browser }) => {
  const ctx = await browser.newContext(TAMANHOS.pc);
  const page = await ctx.newPage();
  await abrir(page, 'lampioes-festa', 'noite-das-fantasias');
  // um chunk do gramado da festa, à vista de cima
  const alvo = await page.evaluate(() => {
    const b = window.__brumaluz!.baile!()!;
    const x0 = Math.floor((b.ox + 100) / 16) * 16;
    const z0 = Math.floor((b.oz + 100) / 16) * 16;
    return { x0, z0, h: b.h };
  });
  const cam: V3 = [alvo.x0 + 8, alvo.h + 30, alvo.z0 - 10];
  const olha: V3 = [alvo.x0 + 8, alvo.h, alvo.z0 + 8];
  await page.evaluate(
    ([x, z, y]) => {
      const e = window.__brumaluz!;
      e.voar?.(true);
      e.teleportar!(x, z, y);
    },
    [alvo.x0 + 8, alvo.z0 + 8, alvo.h + 30] as const,
  );
  await page.evaluate(([p, a]) => {
    (window as unknown as { __camFixa: unknown }).__camFixa = { p, a };
  }, [cam, olha] as const);
  await page.waitForTimeout(4000);
  // T23: a cena assentada antes de medir. Os bichos vão nascendo em volta depois do teleporte
  // (cada bicho de longe são 2 chamadas): medido logo aos 4 s, o "antes" saía 7 a 9 chamadas abaixo
  // do que a cena tem uns segundos depois, sem lampião nenhum, e a diferença caía nos lampiões.
  // Agora o "antes" sai com três leituras seguidas (a 2 s uma da outra) com o mesmo número de
  // bichos e as chamadas a no máximo 1 uma da outra.
  const bichos = () => page.evaluate(() => (window.__brumaluz!.criaturas?.() ?? []).length);
  const leituras: [number, number][] = [];
  for (let k = 0; k < 20; k++) {
    leituras.push([await chamadas(page), await bichos()]);
    const u = leituras.slice(-3);
    if (
      u.length === 3 &&
      u.every(([, b]) => b === u[0][1]) &&
      Math.max(...u.map(([c]) => c)) - Math.min(...u.map(([c]) => c)) <= 1
    )
      break;
    await page.waitForTimeout(2000);
  }
  console.log(`LAMPIOES leituras antes ${JSON.stringify(leituras)}`);
  // mesmo assentada, a cena oscila 1 ou 2 chamadas (um bicho que entra ou sai da vista): o antes
  // e o depois são a mediana de 5 leituras, a 1 s uma da outra
  const chamadasNoTempo = async () => {
    const m: number[] = [];
    for (let k = 0; k < 5; k++) {
      m.push(await chamadas(page));
      await page.waitForTimeout(1000);
    }
    console.log(`LAMPIOES leituras ${JSON.stringify(m)}`);
    return [...m].sort((a, b) => a - b)[2];
  };
  const antes = await chamadasNoTempo();
  const bichosAntes = await bichos();
  const contaAntes = await page.evaluate(() => window.__brumaluz!.lampioes!());
  // cem lampiões e cem caldeirões, em cima do chão do chunk (duas camadas no ar)
  await page.evaluate((a) => {
    const lote: { x: number; y: number; z: number; v: number }[] = [];
    for (let i = 0; i < 100; i++) {
      const x = a.x0 + (i % 10) + 1;
      const z = a.z0 + Math.floor(i / 10) + 1;
      lote.push({ x, y: a.h + 6, z, v: 66 });
      lote.push({ x, y: a.h + 8, z, v: 127 });
    }
    window.__brumaluz!.editarLote!(lote);
  }, alvo);
  await page.waitForTimeout(4000);
  const depois = await chamadasNoTempo();
  const bichosDepois = await bichos();
  const conta = await page.evaluate(() => window.__brumaluz!.lampioes!());
  console.log(
    `LAMPIOES chamadas ${antes} -> ${depois}; bichos ${bichosAntes} -> ${bichosDepois}; ${JSON.stringify(contaAntes)} -> ${JSON.stringify(conta)}`,
  );
  // a conta só vale com os mesmos bichos na cena (cada um muda as chamadas)
  expect(bichosDepois, 'um bicho nasceu ou sumiu no meio da medida').toBe(bichosAntes);
  expect(conta.lampioes - contaAntes.lampioes).toBe(100);
  expect(conta.caldeiroes - contaAntes.caldeiroes).toBe(100);
  expect(depois - antes).toBeLessThanOrEqual(2);
  mkdirSync('capturas-027/parte1', { recursive: true });
  await page.screenshot({ path: 'capturas-027/parte1/lampioes-cem-pc.jpg', quality: 85 });
  await ctx.close();
});

for (const [tema, nome] of [
  ['rancho-alegre', 'rancho'],
  ['noite-das-fantasias', 'festa'],
  ['vila-neon', 'vila'],
] as const)
  test(`o lampião posto no ${nome}: a peça arredondada com o rosto do tema`, async ({ browser }) => {
    const ctx = await browser.newContext(TAMANHOS.pc);
    const page = await ctx.newPage();
    await abrir(page, `lampiao-${nome}`, tema);
    const n = await page.evaluate(() => {
      const e = window.__brumaluz!;
      const [x, y, z] = e.jogadorPes!();
      return { x: Math.floor(x), y: Math.floor(y), z: Math.floor(z) };
    });
    // três lampiões de frente para a câmera (o rosto para +z) e um caldeirão só na festa
    await page.evaluate(
      ([n, festa]) => {
        const lote = [-1, 0, 1].map((dx) => ({ x: n.x + dx * 2, y: n.y + 3, z: n.z + 4, v: 66 }));
        if (festa) lote.push({ x: n.x + 4, y: n.y + 3, z: n.z + 4, v: 127 });
        window.__brumaluz!.editarLote!(lote);
      },
      [n, tema === 'noite-das-fantasias'] as const,
    );
    await page.waitForTimeout(3000);
    await page.evaluate(([p, a]) => {
      (window as unknown as { __camFixa: unknown }).__camFixa = { p, a };
    }, [[n.x + 0.5, n.y + 3.8, n.z + 8.6], [n.x + 0.5, n.y + 3.4, n.z + 4.5]] as const);
    await page.waitForTimeout(1500);
    for (const [qual, h] of [
      ['dia', 0.42],
      ['noite', 0.95],
    ] as const) {
      await page.evaluate((v) => {
        window.__brumaluz!.hora = v;
      }, h);
      await page.waitForTimeout(2500);
      mkdirSync('capturas-027/parte1', { recursive: true });
      await page.screenshot({ path: `capturas-027/parte1/lampiao-${nome}-${qual}-pc.jpg`, quality: 88 });
    }
    const c = await page.evaluate(() => window.__brumaluz!.lampioes!());
    expect(c.lampioes).toBeGreaterThanOrEqual(3);
    await ctx.close();
  });
