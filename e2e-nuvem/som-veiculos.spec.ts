import { expect, test } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

/**
 * 014c, parte 0: os sons dos veículos no jogo de verdade, num mundo da NUVEM (como as crianças
 * jogam), no site publicado (SITE=...) ou no local. A saída do som é medida de fora do jogo:
 * um analisador ligado em tudo o que chega na saída (destination) do AudioContext, e cada
 * AudioBufferSourceNode que começa a tocar (duração do clipe). A criança fica do lado de um
 * veículo andando; o RMS com os veículos ligados tem de ficar claramente acima do RMS com eles
 * calados (o resto do jogo, igual). Uso:
 *   SITE=https://terrario.tmdevlab.com npx playwright test -c playwright.nuvem.config.ts som-veiculos
 */
test.setTimeout(600_000);
const PASTA = 'capturas-014c/som';

test('veículos soam na nuvem', async ({ browser }) => {
  mkdirSync(PASTA, { recursive: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const id = `som-veiculos-${Date.now().toString(36)}`;
  await ctx.addInitScript((i) => {
    localStorage.setItem(
      'terrario:identidade',
      JSON.stringify({ id: i, chave: `chave-do-teste-na-nuvem-${i}-0123456789`, apelido: 'Som' }),
    );
    const w = window as unknown as {
      __inicios: { d: number; t: number }[];
      __analisadores: AnalyserNode[];
    };
    w.__inicios = [];
    w.__analisadores = [];
    const proto = AudioBufferSourceNode.prototype;
    const start = proto.start;
    proto.start = function (this: AudioBufferSourceNode, ...a: number[]) {
      w.__inicios.push({ d: Math.round((this.buffer?.duration ?? -1) * 1000) / 1000, t: performance.now() });
      if (w.__inicios.length > 2000) w.__inicios.shift();
      return (start as (...x: number[]) => void).apply(this, a);
    } as typeof proto.start;
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
  }, id);
  const p = await ctx.newPage();
  const erros: string[] = [];
  p.on('pageerror', (e) => erros.push(String(e)));
  p.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') console.log('console', m.text().slice(0, 300));
  });
  await p.goto('/?tema=cidade-grande');
  await p.waitForFunction(() => window.__brumaluz?.ready === true, undefined, { timeout: 240_000 });
  // mundo na nuvem, como as crianças jogam
  await p.evaluate(() => document.querySelector('.entrada')?.setAttribute('hidden', ''));
  await p.evaluate(() => window.dispatchEvent(new CustomEvent('brumaluz:amigos')));
  await p.locator('[data-abrir-para-amigos]').click({ timeout: 60_000 });
  await p.waitForURL(/sala=/, { timeout: 120_000 });
  await p.evaluate(() => document.querySelector('.entrada')?.setAttribute('hidden', ''));
  await p.waitForFunction(() => window.__brumaluz?.ready === true, undefined, { timeout: 240_000 });
  await p.keyboard.press('Escape');
  // o gesto que liga o som (um clique de verdade na tela)
  await p.mouse.click(640, 360);
  await p.waitForTimeout(1500);
  await p.mouse.click(640, 360);
  const rms = () =>
    p.evaluate(async () => {
      const w = window as unknown as { __analisadores: AnalyserNode[] };
      const an = w.__analisadores[w.__analisadores.length - 1];
      if (!an) return -1;
      const buf = new Float32Array(an.fftSize);
      let soma = 0;
      let n = 0;
      for (let k = 0; k < 20; k++) {
        an.getFloatTimeDomainData(buf);
        for (const v of buf) soma += v * v;
        n += buf.length;
        await new Promise((r) => setTimeout(r, 50));
      }
      return Math.sqrt(soma / n);
    });
  const relatorio: unknown[] = [];
  const estadoAudio = await p.evaluate(() => window.__brumaluz!.audio);
  relatorio.push({ estadoAudio });
  console.log('audio', JSON.stringify(estadoAudio));
  let ligado = 0;
  let calado = 0;
  let nLig = 0;
  let nCal = 0;
  for (let i = 0; i < 24; i++) {
    // fica do lado do veículo andando mais perto (na calçada, 2,5 blocos à direita dele)
    const lugar = await p.evaluate(() => {
      const e = window.__brumaluz!;
      const vs = (e.veiculos?.() ?? []).filter((v) => v.ativo && v.v > 0.5);
      const j = e.jogadorPes!();
      vs.sort((a, b) => Math.hypot(a.x - j[0], a.z - j[2]) - Math.hypot(b.x - j[0], b.z - j[2]));
      const v = vs[0];
      if (!v) return null;
      const hx = Math.cos(v.yaw);
      const hz = -Math.sin(v.yaw);
      e.teleportar!(v.x + hz * 2.6, v.z - hx * 2.6);
      return { id: v.id, tipo: v.tipo, v: v.v };
    });
    const calar = i % 2 === 1;
    await p.evaluate((c) => window.__brumaluz!.calarVeiculos?.(c), calar);
    await p.waitForTimeout(300);
    const r = await rms();
    const sv = await p.evaluate(() => window.__brumaluz!.somVeiculos?.() ?? null);
    const ev = await p.evaluate(() => (window.__brumaluz!.eventosVeiculos ?? []).slice(-5));
    if (calar) {
      calado += r;
      nCal++;
    } else {
      ligado += r;
      nLig++;
    }
    const linha = { i, lugar, calar, rms: r, sv: sv && { pronto: sv.pronto, motores: sv.motores, tocados: sv.tocados.slice(-6) }, ev };
    relatorio.push(linha);
    console.log(JSON.stringify(linha).slice(0, 600));
  }
  const inicios = await p.evaluate(() => (window as unknown as { __inicios: unknown[] }).__inicios.slice(-80));
  relatorio.push({ inicios, erros });
  const medias = { ligado: ligado / Math.max(1, nLig), calado: calado / Math.max(1, nCal) };
  relatorio.push({ medias });
  console.log('medias', JSON.stringify(medias));
  writeFileSync(`${PASTA}/nuvem-${Date.now()}.json`, JSON.stringify(relatorio, null, 1));
  await ctx.close();
  // os veículos ligados somam som de verdade à saída (pelo menos 3 dB acima de calados)
  expect(medias.ligado).toBeGreaterThan(medias.calado * 1.41);
});
