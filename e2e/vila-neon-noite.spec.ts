import { expect, test, type Browser, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { comecarGravacao, pararGravacao } from './gravarCena';
import { criarMundo, escolherNaRoda, tocar, TAMANHOS, type Tamanho } from './guia-palco';

/**
 * Spec 026 (decisões do dono, 15 nov 2026): o show só de noite e o público do show. As fotos, as
 * medidas do celular e o vídeo da noite do show (só com VILA_FOTOS=1, na placa de vídeo:
 * scripts/e2e-gpu.sh). `VILA_SO=dia,noite,medida,video` escolhe as partes.
 *
 * - de dia: a passagem de som no palco, a lua no cartão da f3, no selinho e em cima do palco;
 * - a noite chega: o palco aquece; o show com a turma (uns 20, espalhados pelo campo; de longe, da
 *   grade, por trás e da grade virado para o povo);
 * - as medidas (peças, moradores, chamadas de desenho) no nascer e na grade no meio do show;
 * - o vídeo (~30 s, deitado) da noite do show com o público, com o som do jogo.
 */
declare const process: { env: Record<string, string | undefined> };
test.skip(!process.env.VILA_FOTOS, 'só com VILA_FOTOS');
test.setTimeout(1_500_000);
// um clique que nunca fica pronto falha em vez de travar o teste inteiro
test.use({ actionTimeout: 30_000 });
const T0 = Date.now();
const passo = (o: string) => console.log(`PASSO ${((Date.now() - T0) / 1000).toFixed(0)} s ${o}`);

const PASTA = process.env.VILA_PASTA ?? 'capturas-vila-noite';
const SO = (process.env.VILA_SO ?? '').split(',').filter(Boolean);
const quer = (s: string) => !SO.length || SO.includes(s);
type V3 = [number, number, number];
const DIA = 0.42;
const NOITE = 0.96;

async function abrir(
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

const plano = (page: Page) =>
  page.evaluate(() => {
    const p = window.__brumaluz!.vila!()!;
    return { h: p.h, ox: p.ox, oz: p.oz, nascimento: p.nascimento, pontos: p.pontos };
  });

async function hora(page: Page, h: number) {
  await page.evaluate((v) => {
    window.__brumaluz!.hora = v;
  }, h);
}

async function camera(page: Page, p: V3 | null, a?: V3) {
  await page.evaluate(
    ([p, a]) => {
      (window as unknown as { __camFixa: unknown }).__camFixa = p ? { p, a } : null;
    },
    [p, a ?? null] as const,
  );
  await page.waitForTimeout(400);
}

async function esconderJogador(page: Page, sim: boolean) {
  await page.evaluate((s) => {
    (window as unknown as { __esconder: string[] }).__esconder = s ? ['personagem', 'braco'] : [];
    if (!s)
      for (const m of window.__brumaluz!.cenaBabylon!().meshes)
        if (m.name.startsWith('personagem') || m.name.startsWith('braco')) m.isVisible = true;
  }, sim);
}

/** A foto só da cena (sem a interface) ou com ela (`ui`). */
async function foto(page: Page, nome: string, ui = false) {
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
async function medir(page: Page, nome: string) {
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

const decorrido = (page: Page) =>
  page.evaluate(() => {
    const e = window.__brumaluz!;
    const v = e.vilaEstado!();
    return v?.show ? e.vilaTempo!() - v.show.inicio : -1;
  });
async function ate(page: Page, seg: number) {
  for (let i = 0; i < 4000; i++) {
    const d = await decorrido(page);
    if (d < 0 || d >= seg) return d;
    await page.waitForTimeout(30);
  }
  return -1;
}

/** A criança (escondida ou não) em (x, z), no chão. */
async function ir(page: Page, x: number, z: number, y?: number, voar = false) {
  await page.evaluate(
    ([x, z, y, voar]) => {
      const e = window.__brumaluz!;
      e.voar?.(!!voar);
      e.teleportar!(x as number, z as number, (y as number | null) ?? undefined);
    },
    [x, z, y ?? null, voar] as const,
  );
}

/** As três caixas acesas, como a criança (no palco, perto de cada uma). */
async function acender(page: Page) {
  for (let i = 0; i < 3; i++) {
    await page.evaluate((i) => {
      const e = window.__brumaluz!;
      const p = e.vila!()!;
      const c = p.pontos.caixas[i];
      e.voar?.(true);
      e.teleportar!(c[0] + 0.5, c[2] - 1.2, p.pontos.palco.y + 1.3);
    }, i);
    await page.waitForTimeout(450);
    const ja = await page.evaluate((i) => window.__brumaluz!.vilaEstado!()?.cx[i] ?? false, i);
    if (!ja || i === 2)
      await page.evaluate((i) => window.__brumaluz!.vilaComando!({ a: 'caixa', i }), i);
    await page.waitForTimeout(350);
  }
}

async function voo(page: Page, pontos: { p: V3; a: V3 }[], seg: number) {
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

function salvarWav(r: { taxa: number; l: string; r: string }, caminho: string) {
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

test('o show só de noite e o público (fotos e vídeo)', async ({ browser }) => {
  const page = await abrir(browser, 'vila-noite-fotos', 'pc', 6);
  const p = await plano(page);
  const H = p.h + 1;
  const o = (u: number, alt: number, v: number): V3 => [p.ox + u, H + alt, p.oz + v];
  const pal = p.pontos.palco;
  const pass = p.pontos.passarela;
  const topo = pal.y + 1;
  // o primeiro toque liga o som (com o quadro, o toque no menu já liga; o clique na cena
  // prende o ponteiro e o menu não recebe mais o clique)
  if (!quer('dia')) {
    await page.mouse.click(640, 420);
    await page.waitForTimeout(500);
  }

  if (quer('dia')) {
    passo('dia');
    // o quadro de dia: a f3 com a lua
    await escolherNaRoda(page, 'missoes');
    await page.waitForSelector('[data-alma-quadro]', { timeout: 20_000 });
    await page.waitForTimeout(900);
    expect(await page.locator('[data-missao="f3"] [data-alma-lua]').count()).toBe(1);
    await foto(page, 'dia-quadro-lua', true);
    await tocar(page, '[data-alma-jogar="f3"]');
    await page.waitForTimeout(1500);
    // a criança no campo, olhando o palco: a passagem de som, a lua no selinho e no palco
    await ir(page, p.ox + 60.5, p.oz + 86.5, H + 0.2);
    await assentar(page, 20);
    await page.evaluate(() => window.__brumaluz!.apontar!(0, -0.02));
    await page.waitForTimeout(9000);
    expect(await page.evaluate(() => window.__guia!.esperando())).toBe(true);
    await foto(page, 'dia-palco-passagem-lua', true);
    // de perto: a banda afinando e a turma de dia (só quatro)
    await esconderJogador(page, true);
    await camera(page, o(54, 3.2, 92), [pass[0], topo + 1.2, pass[2] + 4]);
    await page.waitForTimeout(2500);
    await foto(page, 'dia-passagem-banda');
    await medir(page, 'campo-dia');
    await camera(page, null);
    await esconderJogador(page, false);
  }

  if (quer('noite') || quer('video')) {
    passo('noite chega');
    // a noite chega com a criança no campo: o palco aquece e o povo chega
    await ir(page, p.ox + 60.5, p.oz + 86.5, H + 0.2);
    await page.evaluate(() => window.__brumaluz!.apontar!(0, -0.02));
    await page.waitForTimeout(1500);
    await hora(page, NOITE);
    await page.waitForTimeout(2600);
    await foto(page, 'noite-chegou', true);
    const aq = await page.evaluate(() => window.__brumaluz!.showVila?.()?.aquecimentos ?? 0);
    console.log(`AQUECEU ${aq}`);
    expect(aq).toBeGreaterThanOrEqual(1);
    await page.waitForTimeout(24_000);
    await esconderJogador(page, true);
    await camera(page, o(60, 9, 76), [pass[0], topo + 2, pass[2] + 6]);
    await page.waitForTimeout(1500);
    await foto(page, 'noite-antes-do-show');
    await medir(page, 'campo-noite-antes');
  }

  if (quer('noite')) {
    passo('show');
    await acender(page);
    await ir(page, p.ox + 60.5, p.oz + 97.5, H + 0.2);
    await ate(page, 15);
    // de longe (de cima, atrás do campo)
    await camera(page, o(61, 8.5, 74.5), [pass[0], topo + 1.5, pass[2] + 5]);
    await page.waitForTimeout(800);
    await foto(page, 'noite-show-largo');
    // da grade (na altura da criança, de lado para a turma)
    await camera(page, o(63.6, 1.55, 98.6), [pass[0] - 9, topo + 1.4, pass[2] + 3]);
    await page.waitForTimeout(600);
    await foto(page, 'noite-show-grade');
    // por cima do povo, atrás da turma da grade: as costas, a grade, o palco e os feixes
    await camera(page, o(51, 3.6, 93.8), [pass[0] - 2, topo + 1, pass[2] + 4]);
    await page.waitForTimeout(600);
    await foto(page, 'noite-show-grade-palco');
    // da grade, virado para o povo: a festa de frente, até o portão
    await camera(page, o(61.5, 2.3, 99.2), [p.ox + 46, H + 0.9, p.oz + 92]);
    await page.waitForTimeout(600);
    await foto(page, 'noite-show-grade-povo');
    // o povo visto de trás (a criança chegando pelo campo)
    await camera(page, o(49, 2.3, 84.5), [pass[0] - 3, topo + 0.8, pass[2] + 2]);
    await page.waitForTimeout(600);
    await foto(page, 'noite-plateia-costas');
    await camera(page, o(71, 2.4, 89.5), [pass[0] - 5, topo + 0.4, pass[2] + 1]);
    await page.waitForTimeout(600);
    await foto(page, 'noite-plateia-costas-2');
    await ate(page, 20);
    await camera(page, o(61, 8.5, 74.5), [pass[0], topo + 1.5, pass[2] + 5]);
    await medir(page, 'show-largo');
    // a turma dança (de verdade, nas juntas): quantos de braço para o alto agora
    const bracos = await page.evaluate(() => {
      const nos = window.__brumaluz!.cenaBabylon!().transformNodes.filter((n) =>
        /^morador-\d+-junta-bracoD$/.test(n.name),
      );
      return nos.map((n) => Math.round(Math.abs(n.rotation.z) * 100) / 100);
    });
    console.log(`BRACOS ${JSON.stringify(bracos)}`);
    expect(bracos.filter((b) => b > 2).length).toBeGreaterThanOrEqual(5);
    // espera o show acabar sozinho (o acorde final vem em 4 s)
    for (let i = 0; i < 600 && (await decorrido(page)) >= 0; i++) await page.waitForTimeout(100);
  }

  if (quer('video')) {
    passo('video');
    // um show por noite: a noite seguinte (o dia do mundo vira), e as caixas acendem de novo
    await page.evaluate(() => {
      const e = window.__brumaluz!;
      e.definirDia!(e.dia!() + 1);
      e.hora = 0.42;
    });
    await page.waitForTimeout(1500);
    await hora(page, NOITE);
    await page.waitForTimeout(1500);
    for (let i = 0; i < 3; i++) {
      const ja = await page.evaluate((i) => window.__brumaluz!.vilaEstado!()?.cx[i] ?? false, i);
      if (!ja) continue;
      await page.evaluate((i) => {
        const e = window.__brumaluz!;
        const p = e.vila!()!;
        const c = p.pontos.caixas[i];
        e.voar?.(true);
        e.teleportar!(c[0] + 0.5, c[2] - 1.2, p.pontos.palco.y + 1.3);
      }, i);
      await page.waitForTimeout(450);
      await page.evaluate((i) => window.__brumaluz!.vilaComando!({ a: 'caixa', i }), i);
      await page.waitForTimeout(350);
    }
    await esconderJogador(page, true);
    const largo = { p: o(61, 8.5, 73.5), a: [pass[0], topo + 1.5, pass[2] + 5] as V3 };
    const costas = { p: o(50, 2.4, 82), a: [pass[0] - 2, topo + 0.8, pass[2] + 2] as V3 };
    const costas2 = { p: o(60.2, 2.2, 92.5), a: [pass[0] - 1, topo + 1, pass[2] + 3] as V3 };
    // atrás da turma da grade (as costas, o palco) e da grade virado para o povo (a festa de
    // frente); nada de câmera atravessando o palco
    const atras = { p: o(51, 3.6, 93.8), a: [pass[0] - 2, topo + 1, pass[2] + 4] as V3 };
    const povo = { p: o(61.5, 2.3, 99.2), a: [p.ox + 46, H + 0.9, p.oz + 92] as V3 };
    await camera(page, largo.p, largo.a);
    await acender(page);
    await ir(page, p.ox + 60.5, p.oz + 97.6, H + 0.2);
    await ate(page, 9.5);
    mkdirSync(PASTA, { recursive: true });
    const som = page.evaluate((s) => window.__brumaluz!.gravarSom?.(s) ?? null, 34);
    await comecarGravacao(page, 30);
    const t0 = Date.now();
    await voo(page, [largo, costas, costas2], 9);
    await voo(page, [costas2, atras], 4);
    await voo(page, [atras, povo], 6);
    await page.waitForTimeout(1500);
    await voo(page, [povo, atras], 5);
    // o acorde final pelo toque da criança (no chamado)
    await ate(page, 37.4);
    await page.evaluate(() => window.__brumaluz!.vilaComando!({ a: 'palco' }));
    await voo(page, [atras, largo], Math.max(2, 32 - (Date.now() - t0) / 1000));
    await pararGravacao(page, `${PASTA}/noite-show.webm`);
    await page.evaluate(() => window.__brumaluz!.pararSom?.());
    const r = await som;
    if (r) salvarWav(r, `${PASTA}/noite-show.wav`);
    else console.log('VIDEO sem som');
  }
  await page.context().close();
});

test('celular: o quadro em pé de dia (a lua) e as medidas no nascer e na grade', async ({
  browser,
}) => {
  test.skip(!quer('medida'), 'só com medida');
  const page = await abrir(browser, 'vila-noite-celular', 'empe', 3);
  const p = await plano(page);
  const H = p.h + 1;
  // o quadro em pé, de dia: a f3 com a lua
  await escolherNaRoda(page, 'missoes');
  await page.waitForSelector('[data-alma-quadro]', { timeout: 20_000 });
  await page.waitForTimeout(900);
  await page.locator('[data-missao="f3"]').scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  await foto(page, 'celular-quadro-dia-lua', true);
  await tocar(page, '[data-alma-jogar="f3"]');
  await page.waitForTimeout(2500);
  await foto(page, 'celular-nascer-dia-lua', true);
  // no nascer: as peças de dia e de noite (o povo é do festival: nada aqui)
  await medir(page, 'celular-nascer-dia');
  await hora(page, NOITE);
  await page.waitForTimeout(3000);
  await medir(page, 'celular-nascer-noite');
  // na grade, no meio do show
  await acender(page);
  await ir(page, p.ox + 60.5, p.oz + 98.4, H + 0.2);
  await page.evaluate(() => window.__brumaluz!.apontar!(0, 0.1));
  await assentar(page, 12);
  await ate(page, 14);
  await page.waitForTimeout(3000);
  await medir(page, 'celular-grade-show');
  await foto(page, 'celular-grade-show', true);
  // o pior caso: do meio do campo, olhando o palco por cima do público (os 20 e o palco à vista)
  await ir(page, p.ox + 60.5, p.oz + 84, H + 0.2);
  await page.evaluate(() => window.__brumaluz!.apontar!(0, 0.02));
  await page.waitForTimeout(2500);
  const povo = await medir(page, 'celular-grade-povo');
  await foto(page, 'celular-grade-povo', true);
  expect(povo.fps).toBeGreaterThanOrEqual(45);
  await page.context().close();
});

/**
 * O vídeo do show sozinho (decisão do dono, 15 nov 2026): todas as missões feitas, a noite já
 * aberta, a criança chega pela avenida, entra pelo portão e vai até a grade sem tocar em nada; as
 * caixas acendem uma a uma, a banda toca e a turma vai dançar na grade. ~30 s da cena (celular
 * deitado), com o som do jogo à parte (.wav); fotos com a interface. `VILA_SO=sozinho`.
 */
test('o show começa sozinho: a criança chega de noite e não toca em nada (vídeo)', async ({
  browser,
}) => {
  test.skip(!quer('sozinho'), 'só com VILA_SO=sozinho');
  const page = await abrir(browser, 'vila-show-sozinho', 'deitado', 4, ['f1', 'f2', 'f3']);
  const p = await plano(page);
  // o primeiro toque liga o som (no céu)
  await page.touchscreen.tap(420, 60);
  await page.waitForTimeout(500);
  // a criança na avenida, de frente para o portão do festival; a noite já aberta há um tempo
  await ir(page, p.ox + 60.5, p.oz + 62.5, p.h + 1.2);
  await page.evaluate(() => window.__brumaluz!.apontar!(0, 0.3));
  await hora(page, 0.82);
  await assentar(page, 20);
  await page.waitForTimeout(24_000);
  expect(await page.evaluate(() => window.__brumaluz!.vilaEstado!()?.show ?? null)).toBeNull();
  mkdirSync(PASTA, { recursive: true });
  const som = page.evaluate((s) => window.__brumaluz!.gravarSom?.(s) ?? null, 32);
  const t0 = Date.now();
  await comecarGravacao(page, 30);
  await page.waitForTimeout(1200);
  // anda até a grade (o joystick de verdade), sem tocar em nada
  await page.evaluate(
    (zAlvo) =>
      new Promise<void>((ok) => {
        const e = window.__brumaluz!;
        const ctl = e.controleDireto!;
        ctl.tecla('rapido', false);
        const passo = () => {
          const pes = e.jogadorPes!();
          if (pes[2] >= zAlvo) {
            ctl.mover(0, 0);
            ok();
            return;
          }
          e.apontar!(0, 0.3);
          ctl.mover(1, 0);
          setTimeout(passo, 60);
        };
        passo();
      }),
    p.oz + 97.2,
  );
  passo('chegou à grade');
  await page.waitForFunction(() => !!window.__brumaluz!.vilaEstado!()?.show, undefined, {
    timeout: 30_000,
  });
  passo('o show começou');
  await page.waitForTimeout(3000);
  await foto(page, 'sozinho-show-comecou', true);
  // olha devagar para a turma dançando e volta para o palco
  await page.evaluate(
    () =>
      new Promise<void>((ok) => {
        const e = window.__brumaluz!;
        const t0 = performance.now();
        const giro = () => {
          const u = Math.min(1, (performance.now() - t0) / 9000);
          e.apontar!(Math.sin(u * Math.PI) * 1.9, 0.22);
          if (u < 1) requestAnimationFrame(giro);
          else ok();
        };
        giro();
      }),
  );
  await foto(page, 'sozinho-show-turma', true);
  await page.waitForTimeout(Math.max(0, 31_000 - (Date.now() - t0)));
  await pararGravacao(page, `${PASTA}/sozinho.webm`);
  await page.evaluate(() => window.__brumaluz!.pararSom?.());
  const r = await som;
  if (r) salvarWav(r, `${PASTA}/sozinho.wav`);
  else console.log('VIDEO sem som');
  const acesas = await page.evaluate(() =>
    (window.__brumaluz!.eventosVila ?? [])
      .filter((e) => e.e === 'vilaCaixa')
      .map((e) => `${(e as { i: number }).i}:${e.quem}`),
  );
  console.log(`SOZINHO caixas ${JSON.stringify(acesas)}`);
  expect(acesas).toEqual(['0:auto', '1:auto', '2:auto']);
  await page.context().close();
});
