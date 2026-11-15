import { test, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
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
      horas: ['dia', 'noite'],
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
