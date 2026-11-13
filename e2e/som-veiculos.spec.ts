import { expect, test, type Page } from '@playwright/test';

/**
 * 014c, parte 0: os sons dos veículos SAEM de verdade no jogo (com a trilha, a natureza e as
 * falas nos volumes de fábrica, como as crianças jogam). Um analisador ligado em tudo o que
 * chega na saída do AudioContext mede o RMS antes e logo depois de cada toque (uí-uí, freio a
 * ar, buzina, musiquinha do sorvete) com a criança perto; e o motor de um carro andando ao lado
 * contra os veículos calados. Roda no Chromium (scripts/e2e-gpu.sh) e no iPhone emulado
 * (scripts/e2e-webkit.sh), onde o WebKit tiver som.
 */
test.setTimeout(600_000);

async function preparar(p: Page) {
  await p.addInitScript(() => {
    const w = window as unknown as { __analisadores: AnalyserNode[] };
    w.__analisadores = [];
    const connect = AudioNode.prototype.connect;
    const vistos = new WeakMap<BaseAudioContext, AnalyserNode>();
    AudioNode.prototype.connect = function (this: AudioNode, dest: unknown, ...resto: unknown[]) {
      const r = (connect as (...x: unknown[]) => unknown).call(this, dest, ...resto);
      if (dest instanceof AudioDestinationNode) {
        let an = vistos.get(this.context);
        if (!an) {
          an = this.context.createAnalyser();
          an.fftSize = 2048;
          vistos.set(this.context, an);
          w.__analisadores.push(an);
        }
        (connect as (...x: unknown[]) => unknown).call(this, an);
      }
      return r;
    } as typeof AudioNode.prototype.connect;
  });
}

/** RMS da saída por `ms` (o maior de janelas de 100 ms: o toque, não a média com o silêncio). */
const rms = (p: Page, ms: number) =>
  p.evaluate(async (dur) => {
    const w = window as unknown as { __analisadores: AnalyserNode[] };
    const an = w.__analisadores[w.__analisadores.length - 1];
    if (!an) return -1;
    const buf = new Float32Array(an.fftSize);
    const janelas: number[] = [];
    const t0 = performance.now();
    while (performance.now() - t0 < dur) {
      let soma = 0;
      let n = 0;
      for (let k = 0; k < 4; k++) {
        an.getFloatTimeDomainData(buf);
        for (const v of buf) soma += v * v;
        n += buf.length;
        await new Promise((r) => setTimeout(r, 25));
      }
      janelas.push(Math.sqrt(soma / n));
    }
    janelas.sort((a, b) => a - b);
    // a mediana de antes e o alto (80%) de depois saem da mesma conta: devolve os dois
    return janelas[Math.floor(janelas.length * 0.8)] ?? 0;
  }, ms);

test('os veículos se ouvem: toques e motor sobem a saída de verdade', async ({ page, browserName }, ti) => {
  const erros: string[] = [];
  page.on('pageerror', (e) => erros.push(String(e)));
  await preparar(page);
  await page.goto('/?tema=cidade-grande');
  await page.waitForFunction(() => window.__brumaluz?.ready === true, undefined, { timeout: 240_000 });
  // o gesto que liga o som (toque no título, como o do iPhone; depois entra no jogo)
  await page.locator('.entrada').click({ position: { x: 4, y: 4 }, timeout: 30_000 });
  await expect
    .poll(() => page.evaluate(() => window.__brumaluz!.audio!.estado), { timeout: 20_000 })
    .toMatch(/^(ativo|bloqueado)$/);
  const estado = await page.evaluate(() => window.__brumaluz!.audio!.estado);
  test.skip(estado !== 'ativo', 'navegador de teste sem som');
  await page.evaluate(() => {
    document.querySelector<HTMLElement>('.entrada')?.setAttribute('hidden', '');
    const e = window.__brumaluz!;
    e.pausarDia = true;
    e.hora = 0.42;
    e.definirClima?.('limpo');
  });
  await expect
    .poll(() => page.evaluate(() => window.__brumaluz!.somVeiculos?.().pronto ?? false), {
      timeout: 120_000,
    })
    .toBe(true);
  // perto do sorvete (a musiquinha usa a distância dele)
  await page.evaluate(() => {
    const e = window.__brumaluz!;
    const s = (e.veiculos?.() ?? []).find((v) => v.tipo === 'sorvete');
    if (s) e.teleportar!(s.x + 2.5, s.z + 2.5);
  });
  await page.waitForTimeout(4000);
  const medidas: Record<string, { antes: number; depois: number; db: number }> = {};
  for (const [qual, ms] of [
    ['uiui', 900],
    ['freio', 700],
    ['buzina', 450],
    ['sorvete', 2500],
  ] as const) {
    // a rua sem os motores, para o toque ficar contra a trilha e a natureza
    await page.evaluate(() => window.__brumaluz!.calarVeiculos?.(true));
    await page.waitForTimeout(500);
    const antes = await rms(page, 1200);
    await page.evaluate(() => window.__brumaluz!.calarVeiculos?.(false));
    await page.evaluate((q) => {
      const e = window.__brumaluz!;
      // o sorvete anda: a criança chega do lado dele antes da musiquinha
      const s = (e.veiculos?.() ?? []).find((v) => v.tipo === 'sorvete');
      if (q === 'sorvete' && s) e.teleportar!(s.x + 2, s.z + 2);
    }, qual);
    if (qual === 'sorvete') await page.waitForTimeout(400);
    await page.evaluate((q) => {
      const e = window.__brumaluz!;
      if (q === 'sorvete') e.tocarSorvete?.('frase');
      else e.tocarToqueVeiculo?.(q);
    }, qual);
    await page.waitForTimeout(80);
    const depois = await rms(page, ms);
    const db = 20 * Math.log10(depois / Math.max(1e-6, antes));
    medidas[qual] = { antes, depois, db };
    console.log('toque', qual, JSON.stringify(medidas[qual]));
    await page.waitForTimeout(qual === 'sorvete' ? 6000 : 800);
  }
  // o motor: ao lado de um carro andando, ligado contra calado
  let lig = 0;
  let cal = 0;
  for (let i = 0; i < 8; i++) {
    await page.evaluate(() => {
      const e = window.__brumaluz!;
      const vs = (e.veiculos?.() ?? []).filter((v) => v.ativo && v.v > 1 && v.tipo !== 'sorvete');
      const j = e.jogadorPes!();
      vs.sort((a, b) => Math.hypot(a.x - j[0], a.z - j[2]) - Math.hypot(b.x - j[0], b.z - j[2]));
      const v = vs[0];
      if (!v) return;
      const hx = Math.cos(v.yaw);
      const hz = -Math.sin(v.yaw);
      e.teleportar!(v.x + hz * 2.6, v.z - hx * 2.6);
    });
    await page.evaluate((c) => window.__brumaluz!.calarVeiculos?.(c), i % 2 === 1);
    await page.waitForTimeout(400);
    const r = await rms(page, 900);
    if (i % 2 === 1) cal += r;
    else lig += r;
  }
  medidas.motor = { antes: cal / 4, depois: lig / 4, db: 20 * Math.log10(lig / Math.max(1e-6, cal)) };
  console.log('motor', JSON.stringify(medidas.motor));
  await ti.attach('som-veiculos', { body: JSON.stringify(medidas, null, 1), contentType: 'application/json' });
  console.log('RESULTADO', JSON.stringify(medidas));
  // cada toque bem acima da rua; o motor perto também
  expect(medidas.uiui.db).toBeGreaterThan(8);
  expect(medidas.freio.db).toBeGreaterThan(8);
  expect(medidas.buzina.db).toBeGreaterThan(8);
  expect(medidas.sorvete.db).toBeGreaterThan(5);
  // no WebKit do teste (desenho por software, poucos quadros) a criança chega atrasada ao carro
  expect(medidas.motor.db).toBeGreaterThan(browserName === 'webkit' ? 0.5 : 3);
  expect(erros, erros.join('\n')).toEqual([]);
});
