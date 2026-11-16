import { test, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { comecarGravacao, pararGravacao } from './gravarCena';
import { PASTA_CAPTURAS } from '../playwright.config';

/**
 * Spec 026 (Vila Neon): as fotos do bairro para a revisão (só com VILA_FOTOS=1, na placa de
 * vídeo: scripts/e2e-gpu.sh). `VILA_SO=nascer,palco` tira só as que começam com esses nomes;
 * `VILA_PASTA` muda a pasta (o test-results some a cada rodada).
 *
 * As de longe (do alto, a rua, o palco) andam com a criança escondida até o lugar, com a
 * distância de visão 8, para nenhum quadro mostrar chão faltando; as do nascer usam a
 * distância de sempre (3) e a câmera do jogo, como a criança vê.
 */
declare const process: { env: Record<string, string | undefined> };
test.skip(!process.env.VILA_FOTOS, 'só com VILA_FOTOS');
test.setTimeout(1_800_000);

const PASTA = process.env.VILA_PASTA ?? `${PASTA_CAPTURAS}/vila-neon`;
const SO = (process.env.VILA_SO ?? '').split(',').filter(Boolean);
const quer = (nome: string) => !SO.length || SO.some((s) => nome.startsWith(s));
type V3 = [number, number, number];

const IPHONE = {
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
};

const HORAS = { dia: 0.42, entardecer: 0.755, noite: 0.96 } as const;
type Hora = keyof typeof HORAS;

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
  await assentar(page);
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

async function hora(page: Page, h: Hora) {
  await page.evaluate((v) => {
    window.__brumaluz!.hora = v;
  }, HORAS[h]);
  await page.waitForTimeout(1500);
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
    // (mostrar de novo: o que foi escondido volta)
    if (!s)
      for (const m of window.__brumaluz!.cenaBabylon!().meshes)
        if (m.name.startsWith('personagem') || m.name.startsWith('braco')) m.isVisible = true;
  }, sim);
}

async function foto(page: Page, nome: string) {
  mkdirSync(PASTA, { recursive: true });
  await page.evaluate(() => {
    const cena = document.getElementById('cena')!;
    for (const el of Array.from(document.body.querySelectorAll<HTMLElement>('*')))
      if (el !== cena && !el.contains(cena)) el.style.visibility = 'hidden';
  });
  await page.screenshot({ path: `${PASTA}/${nome}.jpg`, quality: 88 });
  await page.evaluate(() => {
    for (const el of Array.from(document.body.querySelectorAll<HTMLElement>('*')))
      el.style.visibility = '';
  });
  const pecas = await page.evaluate(() => window.__brumaluz!.vilaPecas?.() ?? null);
  const cam = await page.evaluate(() => {
    const c = window.__brumaluz!.cenaBabylon!().activeCamera as unknown as {
      globalPosition: { x: number; y: number; z: number };
      getForwardRay(): { direction: { x: number; y: number; z: number } };
      fov: number;
    };
    const d = c.getForwardRay().direction;
    const r = (n: number) => Math.round(n * 100) / 100;
    const p = window.__brumaluz!.vila!()!;
    return `cam(u,alt,v)=${r(c.globalPosition.x - p.ox)},${r(c.globalPosition.y - p.h - 1)},${r(c.globalPosition.z - p.oz)} dir=${r(d.x)},${r(d.y)},${r(d.z)} fov=${r(c.fov)}`;
  });
  console.log(`CAM ${nome} ${cam}`);
  if (process.env.VILA_DEBUG) {
    const d = await page.evaluate(() => {
      const scene = window.__brumaluz!.cenaBabylon!();
      const m = scene.meshes.find((x) => x.name.startsWith('vila-quadro-')) as unknown as {
        name: string;
        getVerticesData(k: string): number[] | null;
        material: {
          emissiveTexture?: {
            getSize(): unknown;
            isReady(): boolean;
            getContext(): CanvasRenderingContext2D;
          } | null;
          diffuseTexture?: {
            getSize(): unknown;
            isReady(): boolean;
            getContext(): CanvasRenderingContext2D;
          } | null;
        };
      };
      if (!m) return 'sem quadro';
      const t = m.material.emissiveTexture ?? m.material.diffuseTexture;
      const c = t?.getContext();
      const w = c?.canvas.width ?? 0;
      const h = c?.canvas.height ?? 0;
      const px = c ? Array.from(c.getImageData(w >> 1, h >> 1, 1, 1).data) : null;
      let dif = 0;
      if (c) {
        const im = c.getImageData(0, 0, w, h).data;
        for (let i = 4; i < im.length; i += 4) if (im[i] !== im[0] || im[i + 1] !== im[1]) dif++;
      }
      return JSON.stringify({
        n: m.name,
        uv: m.getVerticesData('uv'),
        tam: t?.getSize(),
        pronto: t?.isReady(),
        w,
        h,
        px,
        dif,
      });
    });
    console.log(`DEBUG ${d}`);
  }
  console.log(
    `FOTO ${nome} pecas=${JSON.stringify(pecas && { ...pecas, sosias: pecas.sosias.map((s) => `${s.nome}:${s.visivel}`) })}`,
  );
}

const plano = (page: Page) =>
  page.evaluate(() => {
    const p = window.__brumaluz!.vila!()!;
    return {
      h: p.h,
      ox: p.ox,
      oz: p.oz,
      nascimento: p.nascimento,
      zonas: p.zonas,
      pontos: p.pontos,
    };
  });

/** Leva a criança (escondida) até (x, z) e espera o chão de lá. */
async function ir(page: Page, x: number, z: number, y?: number) {
  await page.evaluate(
    ([x, z, y]) => {
      const e = window.__brumaluz!;
      e.voar?.(true);
      e.teleportar!(x, z, y ?? undefined);
    },
    [x, z, y ?? null] as const,
  );
  await assentar(page, 20);
}

test('fotos do bairro (computador)', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await ctx.newPage();
  // o nascer, como a criança vê (distância de sempre)
  if (quer('nascer')) {
    await abrir(page, 3);
    for (const h of ['dia', 'entardecer', 'noite'] as Hora[]) {
      await hora(page, h);
      await foto(page, `nascer-${h}`);
    }
    await page.close();
  }
  const p2 = await ctx.newPage();
  await abrir(p2, 8);
  const p = await plano(p2);
  const H = p.h + 1;
  await esconderJogador(p2, true);
  const z = p.zonas;
  const meio = (r: { x0: number; z0: number; x1: number; z1: number }): [number, number] => [
    (r.x0 + r.x1) / 2,
    (r.z0 + r.z1) / 2,
  ];
  const tomadas: { nome: string; ir: [number, number]; cam: V3; alvo: V3; horas: Hora[] }[] = [
    {
      nome: 'alto',
      ir: [p.ox + 95, p.oz + 75],
      cam: [p.ox + 150, H + 46, p.oz + 128],
      alvo: [p.ox + 98, H, p.oz + 76],
      horas: ['dia', 'entardecer', 'noite'],
    },
    {
      nome: 'rua',
      ir: [p.ox + 60, p.oz + 64],
      cam: [p.ox + 96, H + 2.2, p.oz + 66],
      alvo: [p.ox + 60, H + 3, p.oz + 54],
      horas: ['dia', 'noite'],
    },
    {
      nome: 'palco',
      ir: meio(z.festival),
      cam: [p.pontos.passarela[0] - 1, H + 3, p.oz + 85],
      alvo: [p.pontos.passarela[0], H + 6.5, p.oz + 115],
      horas: ['dia', 'entardecer', 'noite'],
    },
    {
      nome: 'portao',
      ir: [p.ox + 60, p.oz + 66],
      cam: [p.ox + 66, H + 2.2, p.oz + 62],
      alvo: [p.ox + 59, H + 5, p.oz + 90],
      horas: ['dia', 'entardecer'],
    },
    {
      nome: 'fliperama',
      ir: meio(z.fliperama),
      cam: [p.ox + 128, H + 2.4, p.oz + 66],
      alvo: [p.ox + 138, H + 2, p.oz + 80],
      horas: ['dia', 'noite'],
    },
    {
      nome: 'rinque',
      ir: meio(z.rinque),
      cam: [p.ox + 127, H + 7, p.oz + 87],
      alvo: [p.ox + 141, H + 1, p.oz + 100],
      horas: ['dia', 'noite'],
    },
    {
      nome: 'pracinha',
      ir: meio(z.pracinha),
      cam: [p.ox + 126, H + 7, p.oz + 70],
      alvo: [p.ox + 111, H + 1, p.oz + 82],
      horas: ['dia'],
    },
    {
      nome: 'casas',
      ir: [p.ox + 100, p.oz + 110],
      cam: [p.ox + 98, H + 2.4, p.oz + 140],
      alvo: [p.ox + 106, H + 2, p.oz + 105],
      horas: ['dia'],
    },
    {
      nome: 'parque',
      ir: meio(z.parque),
      cam: [p.ox + 150, H + 12, p.oz + 62],
      alvo: [p.ox + 150, H, p.oz + 25],
      horas: ['dia'],
    },
  ];
  // os detalhes de perto (uma peça ou um canto por foto), de dia
  const det = (
    nome: string,
    cu: number,
    ca: number,
    cv: number,
    au: number,
    aa: number,
    av: number,
  ) =>
    tomadas.push({
      nome: `det-${nome}`,
      ir: [p.ox + au, p.oz + av],
      cam: [p.ox + cu, H + ca, p.oz + cv],
      alvo: [p.ox + au, H + aa, p.oz + av],
      horas: ['dia'],
    });
  det('banca', 22, 2, 63, 19, 2, 56);
  det('locadora', 33, 2.2, 66, 32.5, 3, 57);
  det('orelhao', 27.5, 1.6, 63, 24.5, 1.2, 59.5);
  det('carro', 38, 1.7, 65.5, 34.5, 0.8, 61.5);
  det('ponto', 45, 1.9, 65, 47, 1.4, 59);
  det('van', 80, 1.9, 66.5, 76.5, 1, 61.5);
  det('lanchonete', 80, 1.8, 62, 80, 1.5, 52);
  det('bateria', 61, 5.6, 108, 61, 5.4, 121);
  det('radio', 49, 2.6, 93.5, 42.5, 1.6, 92.5);
  det('fita', 63, 2.4, 80, 65.5, 1.7, 86.5);
  det('mesa', 70.5, 2.6, 92, 70.5, 1, 86.5);
  det('barracas', 38.5, 2.2, 83.5, 34.5, 1.5, 79);
  det('maquinas', 138, 1.9, 76.5, 138, 1.3, 83);
  det('patins', 135.5, 1.8, 85, 134.5, 1.2, 89.5);
  det('parquinho', 112.5, 3.2, 83.5, 119, 0.6, 88.5);
  det('quintal', 101, 2.6, 96.5, 106, 0.6, 101.5);
  det('mural', 112, 1.7, 79, 112.5, 1.7, 83.5);
  det('globo', 139, 3, 92.5, 139, 8, 99.5);
  // o salão do fliperama por dentro (o painel de pôsteres do fundo) e a rua com os carros
  tomadas.push({
    nome: 'fliperama-dentro',
    ir: meio(z.fliperama),
    cam: [p.ox + 137.2, H + 1.9, p.oz + 74.6],
    alvo: [p.ox + 138.4, H + 2.1, p.oz + 84],
    horas: ['dia', 'noite'],
  });
  tomadas.push({
    nome: 'rua-carros',
    ir: [p.ox + 60, p.oz + 64],
    cam: [p.ox + 86, H + 1.9, p.oz + 66.6],
    alvo: [p.ox + 60, H + 1.6, p.oz + 60.5],
    horas: ['dia', 'noite'],
  });
  // os três estojos dos instrumentos (um por zona)
  p.pontos.estojos.forEach(([x, , zz], i) =>
    tomadas.push({
      nome: `estojo-${i}`,
      ir: [x, zz],
      cam: [x + 2.6, H + 1.7, zz + 3.4],
      alvo: [x, H + 1.0, zz],
      horas: ['dia', 'noite'],
    }),
  );
  // os carros parados (rodada 2): cada modelo de perto, de três quartos, de dia e de noite
  const FRENTE: Record<number, [number, number]> = { 0: [0, 1], 1: [1, 0], 2: [0, -1], 3: [-1, 0] };
  const veic = (nome: string, u: number, v: number, dir: number, lado: number, tras = false) => {
    const [fu, fv] = FRENTE[dir];
    // o lado da rua (para onde a câmera fica): perpendicular à frente
    const [lu, lv] = [-fv * lado, fu * lado];
    const k = tras ? -1 : 1;
    tomadas.push({
      nome: `veic-${nome}${tras ? '-tras' : ''}`,
      ir: [p.ox + u, p.oz + v],
      cam: [
        p.ox + u + 0.5 + fu * 2.7 * k + lu * 3.0,
        H + 1.45,
        p.oz + v + 0.5 + fv * 2.7 * k + lv * 3.0,
      ],
      alvo: [p.ox + u + 0.5 + fu * 0.2 * k, H + 0.8, p.oz + v + 0.5 + fv * 0.2 * k],
      horas: ['dia', 'noite'],
    });
  };
  veic('hatch-bege', 8, 61, 1, 1);
  veic('bolha-azul', 34, 61, 1, 1);
  veic('van-rua', 76, 61, 1, 1);
  veic('hatch-vinho', 120, 68, 3, 1);
  veic('picape-branca', 160, 68, 3, 1);
  veic('bolha-mostarda', 20, 29, 1, 1);
  veic('hatch-branco', 60, 32, 3, 1);
  veic('picape-verde', 94, 40, 2, 1);
  veic('bolha-creme', 101, 122, 0, 1);
  veic('van-vinho', 101, 18, 0, 1);
  veic('van-banda', 82, 128, 3, 1);
  veic('hatch-vinho', 120, 68, 3, 1, true);
  veic('bolha-azul', 34, 61, 1, 1, true);
  veic('van-rua', 76, 61, 1, 1, true);
  veic('picape-branca', 160, 68, 3, 1, true);
  for (const t of tomadas) {
    if (!quer(t.nome)) continue;
    await ir(p2, t.ir[0], t.ir[1], H + 30);
    await camera(p2, t.cam, t.alvo);
    for (const h of t.horas) {
      await hora(p2, h);
      await foto(p2, `${t.nome}-${h}`);
    }
    await camera(p2, null);
  }
  await ctx.close();
});

test('fotos do bairro (celular em pé)', async ({ browser }) => {
  test.skip(!quer('celular'), 'só com celular');
  const ctx = await browser.newContext(IPHONE);
  const page = await ctx.newPage();
  await abrir(page, 3);
  for (const h of ['dia', 'noite'] as Hora[]) {
    await hora(page, h);
    await foto(page, `celular-nascer-${h}`);
  }
  await ctx.close();
});

// ------------------------------------------------------------------ o Show da Vila (rodada 2)

/** Segundos desde o começo do show (−1 sem show). */
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

/** Vai até cada caixa do palco e deixa as três acesas (ou apagadas). */
async function caixas(page: Page, acesas: boolean) {
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
    if (ja !== acesas)
      await page.evaluate((i) => window.__brumaluz!.vilaComando!({ a: 'caixa', i }), i);
    await page.waitForTimeout(350);
  }
}

/** As contas do quadro (triângulos, chamadas de desenho, o que o show tem à vista). */
async function medir(page: Page, nome: string) {
  const m = await page.evaluate(() => {
    const e = window.__brumaluz!;
    const scene = e.cenaBabylon!() as unknown as {
      getActiveIndices(): number;
      getActiveMeshes(): { length: number };
      getEngine(): { getFps(): number; _drawCalls?: { current: number; lastSecAverage: number } };
    };
    const eng = scene.getEngine();
    return {
      triangulos: Math.round(scene.getActiveIndices() / 3),
      malhas: scene.getActiveMeshes().length,
      desenhos: eng._drawCalls?.current ?? -1,
      fps: Math.round(eng.getFps()),
      show: e.showVila?.() ?? null,
      pecas: e.vilaPecas?.()?.triangulos ?? -1,
    };
  });
  console.log(`SHOW ${nome} ${JSON.stringify(m)}`);
}

test('fotos e vídeo do show', async ({ browser }) => {
  // VILA_SO=show (tudo), show-noite, show-entardecer ou show-video
  const querShow = (qual: string) =>
    !SO.length || SO.includes('show') || SO.includes(`show-${qual}`);
  test.skip(!!SO.length && !SO.some((x) => x.startsWith('show')), 'só com show');
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await ctx.newPage();
  await abrir(page, 8);
  const p = await plano(page);
  const H = p.h + 1;
  const pal = p.pontos.palco;
  const pass = p.pontos.passarela;
  const topo = pal.y + 1;
  await esconderJogador(page, true);
  await ir(page, pass[0], pal.z0 + 8, topo + 0.3);
  // o primeiro toque liga o som
  await page.mouse.click(640, 420);
  await page.waitForTimeout(500);
  // (de um lado do caminho: o poste das bandeirolas não fica na frente do palco)
  const plateia: [V3, V3] = [
    [pass[0] - 6.5, H + 3.4, pal.z0 - 13],
    [pass[0], H + 7.2, pal.z0 + 9],
  ];
  const perto: [V3, V3] = [
    [pass[0] + 5.5, topo + 1.5, pal.z0 - 5.5],
    [pass[0] - 0.4, topo + 1.5, pal.z0 + 2.5],
  ];
  const doPalco: [V3, V3] = [
    [pal.x0 + 7, topo + 3.4, pal.z1 - 3],
    [pass[0] + 2, topo + 0.4, pal.z0 - 6],
  ];
  const lado: [V3, V3] = [
    [pal.x1 + 16, H + 5, pal.z0 - 12],
    [pass[0] + 2, H + 7, pal.z0 + 8],
  ];
  const clique = async (nome: string) => {
    await foto(page, nome);
    await medir(page, nome);
  };
  /** Um show inteiro com as fotos de uma hora. */
  const umShow = async (h: Hora, completo: boolean) => {
    await hora(page, h);
    await caixas(page, false);
    await camera(page, ...plateia);
    if (completo) await clique(`show-antes-${h}`);
    await caixas(page, true);
    await camera(page, ...plateia);
    await ate(page, 10.7);
    await clique(`show-meio-${h}`);
    if (completo) {
      await ate(page, 14.7);
      await clique(`show-meio2-${h}`);
      await camera(page, ...perto);
      await ate(page, 18.2);
      await clique(`show-vocalista-${h}`);
      // o plano médio: o vocalista batendo cabeça, o cabelo preto e liso acompanhando
      await camera(
        page,
        [pass[0] + 1.5, topo + 1.45, pass[2] - 3.1],
        [pass[0], topo + 1.15, pass[2]],
      );
      await ate(page, 18.7);
      await clique(`show-medio-${h}`);
      // a câmera de verdade do jogo, com a criança na grade da plateia
      await camera(page, null);
      await esconderJogador(page, false);
      await page.evaluate(
        ([x, z, y]) => {
          const e = window.__brumaluz!;
          e.voar?.(false);
          e.teleportar!(x, z, y);
        },
        [pass[0] - 2.6, p.pontos.plateia.z1 - 3, H + 0.2] as const,
      );
      await page.waitForTimeout(900);
      await page.evaluate(([x, y, z]) => window.__brumaluz!.mirarPonto?.(x, y, z), [
        pass[0] - 3.4,
        topo + 1.6,
        pass[2],
      ] as const);
      await ate(page, 20.2);
      await clique(`show-grade-${h}`);
      await esconderJogador(page, true);
      await page.evaluate(() => window.__brumaluz!.voar?.(true));
      await camera(page, ...doPalco);
      await ate(page, 22.7);
      await clique(`show-do-palco-${h}`);
      await camera(page, ...lado);
      await ate(page, 28.7);
      await clique(`show-de-lado-${h}`);
      await camera(page, ...plateia);
    }
    await ate(page, 37.2);
    await clique(`show-chamado-${h}`);
    await ate(page, 37.9);
    // o toque da criança dispara o acorde final
    // (o acorde final vem sozinho: o relógio do show pula até ele)
    await page.evaluate(() => window.__brumaluz!.pularShow!(1e4));
    await page.waitForTimeout(140);
    await foto(page, `show-final-1-${h}`);
    await foto(page, `show-final-2-${h}`);
    await medir(page, `show-final-2-${h}`);
    await page.waitForTimeout(500);
    await foto(page, `show-final-3-${h}`);
    await page.waitForTimeout(1200);
    await foto(page, `show-final-4-${h}`);
    // espera o show acabar (o aplauso)
    for (let i = 0; i < 300 && (await decorrido(page)) >= 0; i++) await page.waitForTimeout(100);
    await clique(`show-depois-${h}`);
  };
  if (querShow('noite')) await umShow('noite', true);
  if (querShow('entardecer')) await umShow('entardecer', false);
  // (de dia não tem show: decisão do dono, o show é só de noite; ver vila-neon-noite.spec.ts)
  if (!querShow('video')) return void (await ctx.close());

  // o vídeo: o fim do show de noite (a música, o chamado, o acorde final e o aplauso), com o
  // som do jogo de verdade (a saída do motor) e o desenho da cena
  await hora(page, 'noite');
  await caixas(page, false);
  await camera(page, ...plateia);
  await caixas(page, true);
  await camera(page, ...plateia);
  await ate(page, 27.5);
  mkdirSync(PASTA, { recursive: true });
  const som = page.evaluate((s) => window.__brumaluz!.gravarSom?.(s) ?? null, 16);
  await comecarGravacao(page, 30);
  await ate(page, 37.4);
  // (o acorde final vem sozinho: o relógio do show pula até ele)
  await page.evaluate(() => window.__brumaluz!.pularShow!(1e4));
  await page.waitForTimeout(6200);
  await pararGravacao(page, `${PASTA}/show.webm`);
  const r = await som;
  if (r) {
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
    writeFileSync(`${PASTA}/show.wav`, b as unknown as string);
  } else console.log('SHOW sem som');
  await ctx.close();
});

// ------------------------------------------------------------------ os brinquedos de tocar (T19)

test('fotos dos brinquedos', async ({ browser }) => {
  test.skip(!!SO.length && !SO.some((x) => x.startsWith('brinq')), 'só com brinq');
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await ctx.newPage();
  await abrir(page, 6);
  const p = await plano(page);
  const H = p.h + 1;
  await page.mouse.click(640, 420);
  const maquinas = await page.evaluate(() =>
    window.__brumaluz!.vila!()!
      .pecas.filter((q) => q.tipo === 'maquina')
      .sort((a, b) => (a.n ?? 0) - (b.n ?? 0))
      .map((q) => [q.x, q.y, q.z] as V3),
  );
  const toca = (qual: 'fliperama' | 'radio' | 'fita', i = 0) =>
    page.evaluate(([q, i]) => window.__brumaluz!.vilaBrinquedo!(q, i), [qual, i] as const);
  const estado = async (nome: string) =>
    console.log(
      `BRINQ ${nome} ${JSON.stringify(await page.evaluate(() => window.__brumaluz!.brinquedosVila?.()))}`,
    );
  await esconderJogador(page, true);
  // o fliperama: três máquinas tocadas, de perto
  const [mx, , mz] = maquinas[2];
  await ir(page, mx, mz - 3, H + 0.2);
  for (const h of ['dia', 'noite'] as Hora[]) {
    await hora(page, h);
    await camera(page, [mx + 0.3, H + 2.1, mz - 3.2], [mx, H + 1.7, mz]);
    await toca('fliperama', 1);
    await toca('fliperama', 2);
    await toca('fliperama', 3);
    await page.waitForTimeout(900);
    await foto(page, `brinq-fliperama-${h}`);
    await estado(`fliperama-${h}`);
    await camera(page, [maquinas[2][0], H + 1.95, mz - 1.6], [maquinas[2][0], H + 1.9, mz]);
    await toca('fliperama', 2);
    await page.waitForTimeout(2000);
    await foto(page, `brinq-tela-${h}`);
  }
  // o toque de verdade (o dedo na tela da máquina, pelo caminho da interface): a tela mexe
  await camera(page, null);
  await page.evaluate(([x, z, y]) => window.__brumaluz!.teleportar!(x, z, y), [
    mx,
    mz - 3,
    H + 0.2,
  ] as const);
  await page.waitForTimeout(800);
  await page.evaluate(([x, y, z]) => window.__brumaluz!.mirarPonto?.(x, y, z), [
    mx,
    H + 1.9,
    mz,
  ] as const);
  await page.waitForTimeout(3600);
  const naTela = await page.evaluate(
    ([x, y, z]) => window.__brumaluz!.telaDoPonto?.(x, y, z) ?? null,
    [mx, H + 1.9, mz] as const,
  );
  console.log(`BRINQ toque-tela ${JSON.stringify(naTela)}`);
  if (naTela) await page.mouse.click(naTela.x, naTela.y);
  await page.waitForTimeout(400);
  const depois = await page.evaluate(() => window.__brumaluz!.brinquedosVila?.()?.telas ?? 0);
  console.log(`BRINQ toque-tela telas=${depois}`);
  if (depois < 1) throw new Error('o toque na máquina não fez a tela mexer');
  // o rádio gigante ligado (as notinhas) e a fita rebobinando
  const [rx, , rz] = p.pontos.radio;
  await ir(page, rx, rz, H + 0.2);
  for (const h of ['dia', 'noite'] as Hora[]) {
    await hora(page, h);
    await camera(page, [rx + 6.5, H + 2.4, rz + 1.2], [rx, H + 1.6, rz]);
    await toca('radio');
    await page.waitForTimeout(2600);
    await foto(page, `brinq-radio-${h}`);
    await estado(`radio-${h}`);
    await toca('radio');
  }
  const [fx, , fz] = p.pontos.fita;
  await ir(page, fx, fz, H + 0.2);
  for (const h of ['dia', 'noite'] as Hora[]) {
    await hora(page, h);
    await camera(page, [fx - 2.6, H + 2.6, fz - 4.6], [fx - 0.4, H + 1.6, fz - 0.6]);
    await toca('fita');
    await page.waitForTimeout(600);
    await foto(page, `brinq-fita-${h}`);
    await estado(`fita-${h}`);
  }
  // o ladrilho da pista acende sob os pés (a criança à vista, andando)
  await esconderJogador(page, false);
  const r = p.pontos.rinque;
  const cxR = Math.floor((r.x0 + r.x1) / 2) + 0.5;
  const czR = Math.floor((r.z0 + r.z1) / 2) + 0.5;
  await page.evaluate(() => window.__brumaluz!.voar?.(false));
  for (const h of ['noite'] as Hora[]) {
    await hora(page, h);
    await camera(page, [cxR + 4, H + 3.2, czR - 4], [cxR, H + 0.3, czR]);
    for (let k = 0; k < 4; k++) {
      await page.evaluate(([x, z]) => window.__brumaluz!.teleportar!(x, z), [
        cxR - 2 + k,
        czR,
      ] as const);
      await page.waitForTimeout(120);
    }
    await foto(page, `brinq-ladrilho-${h}`);
    await estado(`ladrilho-${h}`);
  }
  await ctx.close();
});

// ------------------------------------------------------------------ rodada 3: moradores e fantasias

test('fotos dos moradores e das fantasias', async ({ browser }) => {
  test.skip(!!SO.length && !SO.some((x) => x.startsWith('gente')), 'só com gente');
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await ctx.newPage();
  await abrir(page, 5);
  const p = await plano(page);
  await hora(page, 'dia');
  await esconderJogador(page, true);
  // os moradores de posto, de perto (o boneco onde ele estiver agora)
  const moradores = async () =>
    page.evaluate(() =>
      (window.__brumaluz!.criaturas?.() ?? []).filter((c) => c.tipo === 'morador'),
    );
  for (const [nome, posto] of Object.entries(p.pontos.postos)) {
    await ir(page, posto[0], posto[2] - 3, posto[1] + 0.5);
    await page.waitForTimeout(1500);
    const perto = (await moradores())
      .map((c) => ({ c, d: Math.hypot(c.x - posto[0], c.z - posto[2]) }))
      .sort((a, b) => a.d - b.d)[0];
    const [x, y, z] = perto && perto.d < 6 ? [perto.c.x, perto.c.y, perto.c.z] : posto;
    for (const [lado, dx, dz] of [
      ['frente', 0.9, -2.3],
      ['costas', -1.1, 2.2],
    ] as const) {
      await camera(page, [x + dx, y + 1.35, z + dz], [x, y + 0.85, z]);
      await page.waitForTimeout(300);
      await foto(page, `gente-${nome}-${lado}`);
    }
  }
  // as fantasias da Vila Neon na criança (de frente e de costas) e os patins
  await esconderJogador(page, false);
  await page.evaluate(() => (window as unknown as { __esconder: string[] }).__esconder.splice(0));
  const [nx, nz] = [p.nascimento.x, p.nascimento.z];
  await ir(page, nx, nz);
  await page.evaluate(() => window.__brumaluz!.voar?.(false));
  await page.waitForTimeout(1500);
  const vestir = (parcial: Record<string, unknown>) =>
    page.evaluate((a) => {
      const e = window.__brumaluz!;
      e.personagem!.definir(a as never);
      e.personagem!.girarCorpo?.(0);
    }, parcial);
  const pose = [
    { nome: 'roqueira', a: { corpo: 'feminino', fantasia: { id: 'roqueira-palco', cor: 0 } } },
    { nome: 'roqueiro', a: { corpo: 'masculino', fantasia: { id: 'roqueira-palco', cor: 0 } } },
    {
      nome: 'roqueira-sem-cabelo',
      a: { corpo: 'feminino', fantasia: { id: 'roqueira-palco', cor: 0, sem: ['cabelo-liso'] } },
    },
    { nome: 'danca', a: { corpo: 'feminino', fantasia: { id: 'danca-neon', cor: 0 } } },
    { nome: 'patinadora', a: { corpo: 'feminino', fantasia: { id: 'patinadora', cor: 0 } } },
    { nome: 'patins-sem-fantasia', a: { corpo: 'masculino', fantasia: undefined, patins: true } },
  ];
  for (const f of pose) {
    await vestir(f.a);
    await page.waitForTimeout(700);
    const pes = await page.evaluate(() => window.__brumaluz!.jogadorPes!());
    // a frente do corpo (o boneco olha para o seno e o cosseno do giro dele)
    const yaw = await page.evaluate(() => window.__brumaluz!.camera?.yawCorpo() ?? 0);
    const [fx, fz] = [Math.sin(yaw), Math.cos(yaw)];
    for (const [lado, k, de] of [
      ['frente', 2.4, 0.7],
      ['costas', -2.3, -0.8],
    ] as const) {
      const cam: V3 = [pes[0] + fx * k + fz * de, pes[1] + 1.3, pes[2] + fz * k - fx * de];
      await camera(page, cam, [pes[0], pes[1] + 0.8, pes[2]]);
      await page.waitForTimeout(300);
      await foto(page, `gente-fantasia-${f.nome}-${lado}`);
    }
  }
  await ctx.close();
});

// ------------------------------------------------------------------ o vídeo do passeio (T22)

/**
 * Um voo de câmera pelos pontos (cada um com a hora do dia), em `seg` segundos, macio entre
 * eles; a criança (escondida) vai junto embaixo da câmera, para o som do bairro ser o do lugar.
 */
async function voo(page: Page, pontos: { p: V3; a: V3; h: number }[], seg: number) {
  await page.evaluate(
    ([pontos, seg]) =>
      new Promise<void>((ok) => {
        const e = window.__brumaluz!;
        const w = window as unknown as { __camFixa: { p: number[]; a: number[] } | null };
        const t0 = performance.now();
        let ultimoTp = -1;
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
          e.hora = A.h + (B.h - A.h) * f;
          if (performance.now() - ultimoTp > 600) {
            ultimoTp = performance.now();
            e.teleportar!(w.__camFixa.p[0], w.__camFixa.p[2], w.__camFixa.p[1] + 0.5);
          }
          if (u < 1) requestAnimationFrame(passo);
          else ok();
        };
        passo();
      }),
    [pontos, seg] as const,
  );
}

test('vídeo do passeio e do show', async ({ browser }) => {
  test.skip(!SO.includes('tour'), 'só com tour');
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await ctx.newPage();
  await abrir(page, 8);
  const p = await plano(page);
  const H = p.h + 1;
  const o = (u: number, alt: number, v: number): V3 => [p.ox + u, H + alt, p.oz + v];
  const pal = p.pontos.palco;
  const pass = p.pontos.passarela;
  const topo = pal.y + 1;
  await esconderJogador(page, true);
  await ir(page, p.ox + 95, p.oz + 75, H + 30);
  await assentar(page, 40);
  // o primeiro toque liga o som
  await page.mouse.click(640, 420);
  await page.waitForTimeout(800);
  // as caixas apagadas (o show começa só no fim do passeio)
  await caixas(page, false);
  const dia = HORAS.dia;
  const tarde = HORAS.entardecer;
  const noite = HORAS.noite;
  const pontos = [
    // a pracinha onde a criança nasce, o letreiro e o mural
    { p: o(124, 3, 66), a: o(112, 2.5, 84), h: dia },
    { p: o(104, 2.6, 70), a: o(80, 2, 60), h: dia },
    // a Rua anos 80: os carros, a banca, a locadora e a lanchonete
    { p: o(84, 2.2, 66.5), a: o(60, 1.6, 60.5), h: dia },
    { p: o(46, 2.4, 66), a: o(26, 2, 58), h: dia },
    // por cima do bairro até o fliperama e o rinque
    { p: o(70, 22, 90), a: o(130, 0, 84), h: dia + 0.06 },
    { p: o(128, 2.4, 66), a: o(138, 2, 80), h: tarde - 0.04 },
    { p: o(127, 7, 87), a: o(141, 1, 100), h: tarde },
    // o festival no fim de tarde, de cima, e a noite chegando
    { p: o(98, 26, 72), a: o(60, 6, 112), h: tarde + 0.06 },
    { p: o(60, 6, 84), a: o(60, 7, 114), h: noite },
  ];
  mkdirSync(PASTA, { recursive: true });
  const som = page.evaluate(() => window.__brumaluz!.gravarSom?.(120) ?? null);
  await comecarGravacao(page, 30);
  await voo(page, pontos, 24);
  // o show de noite: as três caixas acendem e a banda toca
  await caixas(page, true);
  await page.evaluate(([x, z, y]) => window.__brumaluz!.teleportar!(x, z, y), [
    pass[0],
    pal.z0 - 6,
    H + 0.3,
  ] as const);
  const plateia = {
    p: [pass[0] - 6.5, H + 3.4, pal.z0 - 13] as V3,
    a: [pass[0], H + 7.2, pal.z0 + 9] as V3,
    h: noite,
  };
  const medio = {
    p: [pass[0] + 1.5, topo + 1.45, pass[2] - 3.1] as V3,
    a: [pass[0], topo + 1.15, pass[2]] as V3,
    h: noite,
  };
  const lado = {
    p: [pal.x1 + 16, H + 5, pal.z0 - 12] as V3,
    a: [pass[0] + 2, H + 7, pal.z0 + 8] as V3,
    h: noite,
  };
  await camera(page, plateia.p, plateia.a);
  await ate(page, 6);
  // devagar até o vocalista batendo cabeça, depois de lado, e de volta à plateia
  await page.evaluate(([x, z, y]) => window.__brumaluz!.teleportar!(x, z, y), [
    pass[0],
    pal.z0 - 6,
    H + 0.3,
  ] as const);
  await voo(page, [plateia, medio, medio], 9);
  await voo(page, [medio, lado], 7);
  await voo(page, [lado, plateia], 6);
  // a criança na plateia (o toque dela é que dispara o acorde final)
  await page.evaluate(([x, z, y]) => window.__brumaluz!.teleportar!(x, z, y), [
    pass[0] - 3,
    p.pontos.plateia.z1 - 2,
    H + 0.3,
  ] as const);
  await ate(page, 37.3);
  // (o acorde final vem sozinho: o relógio do show pula até ele)
  await page.evaluate(() => window.__brumaluz!.pularShow!(1e4));
  await page.waitForTimeout(8000);
  await pararGravacao(page, `${PASTA}/passeio.webm`);
  await page.evaluate(() => window.__brumaluz!.pararSom?.());
  const r = await som;
  if (r) {
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
    writeFileSync(`${PASTA}/passeio.wav`, b as unknown as string);
  } else console.log('PASSEIO sem som');
  await ctx.close();
});

// ------------------------------------------------------------------ a mistura do show na grade

/** O som gravado da página (`gravarSom`) num .wav estéreo de 16 bits. */
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

/**
 * A régua da mistura do show (o dono: "a música da banda bem baixinha, até o passarinho mais
 * alto"): a criança na grade da plateia, de dia (com os passarinhos). Grava `antes.wav` (7 s de
 * cada: tudo, só a trilha, só a natureza; de dia e de noite) e `show.wav` + `show.webm` (o show
 * inteiro na câmera do jogo, o acorde final pelo toque e a volta da natureza). `marcas.json` diz
 * onde cada trecho começa, para medir com o ebur128 do ffmpeg.
 */
test('som do show na grade', async ({ browser }) => {
  test.skip(!SO.includes('grade'), 'só com grade');
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await ctx.newPage();
  await abrir(page, 8);
  const p = await plano(page);
  const H = p.h + 1;
  const pal = p.pontos.palco;
  const pass = p.pontos.passarela;
  const topo = pal.y + 1;
  const naGrade = async () => {
    await page.evaluate(
      ([x, z, y]) => {
        const e = window.__brumaluz!;
        e.voar?.(false);
        e.teleportar!(x, z, y);
      },
      [pass[0] - 2.6, p.pontos.plateia.z1 - 3, H + 0.2] as const,
    );
    await page.waitForTimeout(900);
    await page.evaluate(([x, y, z]) => window.__brumaluz!.mirarPonto?.(x, y, z), [
      pass[0] - 3.4,
      topo + 1.6,
      pass[2],
    ] as const);
  };
  await ir(page, pass[0], pal.z0 + 8, topo + 0.3);
  await page.mouse.click(640, 420);
  await page.waitForTimeout(500);
  await caixas(page, false);
  await naGrade();
  await page.waitForTimeout(4000);
  mkdirSync(PASTA, { recursive: true });
  const vol = (m: number | null, n: number | null) =>
    page.evaluate(([m, n]) => window.__brumaluz!.volumesAmbiente?.(m, n), [m, n] as const);
  // 1. antes do show: 6 trechos de 7 s
  const somA = page.evaluate(() => window.__brumaluz!.gravarSom?.(44) ?? null);
  for (const h of ['dia', 'noite'] as Hora[]) {
    await page.evaluate((v) => (window.__brumaluz!.hora = v), HORAS[h]);
    await vol(null, null);
    await page.waitForTimeout(7000);
    await vol(null, 0);
    await page.waitForTimeout(7000);
    await vol(0, null);
    await page.waitForTimeout(7000);
  }
  await vol(null, null);
  await page.evaluate(() => window.__brumaluz!.pararSom?.());
  const ra = await somA;
  if (ra) salvarWav(ra, `${PASTA}/antes.wav`);
  else console.log('GRADE sem som');
  // 2. o show no fim do entardecer (o show é só de noite, decisão do dono; o entardecer roxo já
  // vale), com a criança na grade
  await page.evaluate((v) => (window.__brumaluz!.hora = v), HORAS.entardecer);
  await page.waitForTimeout(3000);
  await caixas(page, true);
  await naGrade();
  const somB = page.evaluate(() => window.__brumaluz!.gravarSom?.(70) ?? null);
  const d0 = await decorrido(page);
  await comecarGravacao(page, 30);
  // dois toques no palco no refrão (o acorde da criança tem de se ouvir por cima da banda)
  const toques: number[] = [];
  for (const t of [24, 28]) {
    toques.push(await ate(page, t));
    // (o acorde final vem sozinho: o relógio do show pula até ele)
    await page.evaluate(() => window.__brumaluz!.pularShow!(1e4));
  }
  const tapa = await ate(page, 37.9);
  // (o acorde final vem sozinho: o relógio do show pula até ele)
  await page.evaluate(() => window.__brumaluz!.pularShow!(1e4));
  for (let i = 0; i < 300 && (await decorrido(page)) >= 0; i++) await page.waitForTimeout(100);
  await page.waitForTimeout(9000);
  await pararGravacao(page, `${PASTA}/show.webm`);
  await page.evaluate(() => window.__brumaluz!.pararSom?.());
  const rb = await somB;
  if (rb) salvarWav(rb, `${PASTA}/show.wav`);
  writeFileSync(
    `${PASTA}/marcas.json`,
    JSON.stringify({ showNoInicioDaGravacao: d0, toques, toque: tapa }),
  );
  console.log(`GRADE show em ${d0} s quando a gravação começou; toque em ${tapa}`);
  await ctx.close();
});
