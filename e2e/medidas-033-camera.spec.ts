import { test, type Browser, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { Bloco } from '../src/world/blocks';
import { andarPelaTrilha, assentar, criarMundo } from './guia-palco';
import { gravarTela, navegadorJanelaGrande } from './gravarTela033';

/**
 * Esboço 033 (`?esboco=033`): no celular, a câmera começa mais afastada. Mede várias distâncias
 * de começo (a de hoje, 4,4 blocos, e +8 %, +15 %, +25 %, +35 %) no celular deitado e em pé.
 *
 * - ESBOCO_033=mira: a "criança simulada" da 022 (mesmas cenas, mesmos alvos, mesmo erro de dedo
 *   de 24 px, 2 sementes × 4 giros × 7 alvos × 4 cenas = 224 tentativas por distância);
 * - ESBOCO_033=fotos: o mesmo lugar, hoje e cada distância, lado a lado (rua da Vila Neon, dentro
 *   da Casa anos 80, Cidade Grande, a obra da 022 e um mundo aberto);
 * - ESBOCO_033=guia: a trilha de pegadas, a placa e a mãozinha da obra, hoje e a recomendada;
 * - ESBOCO_033=fps: quadros por segundo hoje e com a recomendada;
 * - ESBOCO_033=video: andando na rua da Vila Neon com a recomendada (vídeo da página).
 * TELAS=deitado,empe escolhe as telas; ZOOMS=4.4,5.06 escolhe as distâncias.
 */
declare const process: { env: Record<string, string | undefined> };
const QUAL = process.env.ESBOCO_033 ?? '';
test.skip(!QUAL, 'esboço só com ESBOCO_033');
test.setTimeout(5_400_000);
test.describe.configure({ mode: 'parallel' });
const PASTA = process.env.ESBOCO_PASTA ?? 'test-results/esboco-033';

const TELAS = {
  deitado: { viewport: { width: 844, height: 390 } },
  empe: { viewport: { width: 390, height: 844 } },
} as const;
type NomeTela = keyof typeof TELAS;
const telas = (process.env.TELAS ?? 'deitado,empe').split(',') as NomeTela[];
/** Hoje (4,4) e as candidatas: +8 %, +15 %, +25 %, +35 %. */
const ZOOMS = (process.env.ZOOMS ?? '4.4,4.75,5.06,5.5,5.94').split(',').map(Number);
/** A recomendada (deitado, em pé): ZOOM_REC=5.06,5.5. */
const REC = (process.env.ZOOM_REC ?? '4.75,5.06').split(',').map(Number);
const recDa = (t: NomeTela) => (t === 'empe' ? REC[1] : REC[0]);
const rotulo = (z: number) => (z === 4.4 ? 'hoje' : `${z.toFixed(2)}`);

type V3 = { x: number; y: number; z: number };
type Alvo =
  | { tipo: 'quebrar'; x: number; y: number; z: number }
  | { tipo: 'colocar'; x: number; y: number; z: number }
  | { tipo: 'fantasma'; x: number; y: number; z: number };
interface Cena {
  nome: string;
  pes: V3;
  yaw: number;
  alvos: Alvo[];
}

async function contexto(browser: Browser, tela: NomeTela, video?: string) {
  const t = TELAS[tela];
  const ctx = await browser.newContext({
    viewport: t.viewport,
    // SEM_MOBILE=1 nos vídeos: com isMobile o screencast perde 88 px de baixo
    isMobile: !process.env.SEM_MOBILE,
    hasTouch: true,
    // 2 (não 3, como na 022): duas páginas de 3× estouravam a memória da placa de 6 GB ("Unable
    // to create vertex buffer"); a mira é em px CSS, então a conta não muda
    deviceScaleFactor: Number(process.env.ESCALA ?? 2),
    ...(video ? { recordVideo: { dir: video, size: { width: t.viewport.width * 2, height: t.viewport.height * 2 } } } : {}),
  });
  const page = await ctx.newPage();
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
  return { ctx, page };
}

async function pronto(page: Page) {
  await page.waitForFunction(() => window.__brumaluz?.ready === true, undefined, {
    timeout: 240_000,
  });
  await page.evaluate(() => {
    document.querySelector<HTMLElement>('.entrada')?.setAttribute('hidden', '');
    document.body.classList.remove('tela-titulo');
    const e = window.__brumaluz!;
    e.pausarDia = true;
    e.hora = 0.42;
    e.definirClima?.('limpo');
    window.dispatchEvent(new Event('resize'));
  });
  await page.addStyleTag({ content: '.toast-area { display: none !important; }' });
}

/** Abre um tema novo (sem mundo gravado) com o esboço; `zoom` vira a distância de começo. */
async function abrirTema(browser: Browser, tela: NomeTela, tema: string, zoom?: number, video?: string) {
  const { ctx, page } = await contexto(browser, tela, video);
  const z = zoom ? `&zoomDeitado=${zoom}&zoomEmPe=${zoom}` : '';
  await page.goto(`/?tema=${tema}&esboco=033${z}`);
  await pronto(page);
  await assentar(page, 16);
  return { ctx, page };
}

/** Um bloco na mão (tábuas, pedra...): coloca nos blocos e enche os fantasmas da obra. */
async function blocoNaMao(page: Page) {
  await page.evaluate(() => {
    const e = window.__brumaluz!;
    e.darKit?.();
    const i = e.inventario as unknown as { obter(i: number): { item: string } | null };
    for (let k = 0; k < 9; k++) {
      const p = i.obter(k);
      if (p && /tabuas|pedra|terra|tijolo/.test(p.item)) {
        e.selecionarSlot!(k);
        return;
      }
    }
    e.selecionarSlot!(0);
  });
}

const zoomAgora = (page: Page, d: number) =>
  page.evaluate((d) => window.__brumaluz!.camera!.definirZoom(d), d);

/** As quatro cenas da 022, iguais (Cidade Grande, bem no alto, menos a obra). */
async function montarCenas(page: Page): Promise<Cena[]> {
  return page.evaluate(
    (B) => {
      const e = window.__brumaluz!;
      const p = e.cidade!()!;
      const caixa = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, b: number) => {
        for (let x = x0; x <= x1; x++)
          for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) e.definirBloco!(x, y, z, b);
      };
      const cenas: Cena[] = [];
      const Y = 114;
      const N = { x: Math.floor(p.nascimento.x), z: Math.floor(p.nascimento.z) };
      {
        const X = N.x + 40;
        const Z = N.z - 6;
        caixa(X - 6, Y - 1, Z - 6, X + 6, Y - 1, Z + 14, B.pedra);
        caixa(X - 6, Y, Z - 6, X + 6, Y + 10, Z + 14, 0);
        caixa(X - 1, Y, Z, X - 1, Y + 2, Z + 10, B.tijolo);
        caixa(X + 1, Y, Z, X + 1, Y + 2, Z + 10, B.tijolo);
        caixa(X - 1, Y + 3, Z, X + 1, Y + 3, Z + 10, B.tijolo);
        for (const [x, z] of [
          [X - 1, Z + 2],
          [X + 1, Z + 5],
          [X - 1, Z + 9],
        ])
          e.definirBloco!(x, Y + 1, z, B.tocha);
        caixa(X, Y, Z + 11, X, Y + 2, Z + 11, B.tijolo);
        cenas.push({
          nome: 'corredor',
          pes: { x: X + 0.5, y: Y, z: Z + 5.5 },
          yaw: 0,
          alvos: [
            { tipo: 'quebrar', x: X - 1, y: Y + 1, z: Z + 6 },
            { tipo: 'quebrar', x: X + 1, y: Y, z: Z + 4 },
            { tipo: 'quebrar', x: X + 1, y: Y + 2, z: Z + 7 },
            { tipo: 'quebrar', x: X, y: Y - 1, z: Z + 7 },
            { tipo: 'quebrar', x: X, y: Y + 3, z: Z + 6 },
            { tipo: 'colocar', x: X, y: Y, z: Z + 7 },
            { tipo: 'colocar', x: X, y: Y, z: Z + 3 },
          ],
        });
      }
      {
        const X = N.x + 56;
        const Z = N.z - 2;
        caixa(X - 6, Y - 1, Z - 8, X + 8, Y - 1, Z + 8, B.pedra);
        caixa(X - 6, Y, Z - 8, X + 8, Y + 10, Z + 8, 0);
        caixa(X - 1, Y, Z - 1, X + 3, Y + 2, Z + 3, B.tabuas);
        caixa(X, Y, Z, X + 2, Y + 2, Z + 2, 0);
        caixa(X - 1, Y + 3, Z - 1, X + 3, Y + 3, Z + 3, B.tabuas);
        caixa(X + 1, Y, Z - 1, X + 1, Y + 1, Z - 1, 0);
        e.definirBloco!(X + 3, Y + 1, Z + 1, B.vidro);
        e.definirBloco!(X, Y, Z, B.tocha);
        cenas.push({
          nome: 'casinha',
          pes: { x: X + 1.5, y: Y, z: Z + 1.5 },
          yaw: 0,
          alvos: [
            { tipo: 'quebrar', x: X - 1, y: Y + 1, z: Z + 1 },
            { tipo: 'quebrar', x: X + 3, y: Y + 1, z: Z + 2 },
            { tipo: 'quebrar', x: X + 1, y: Y + 2, z: Z + 3 },
            { tipo: 'quebrar', x: X, y: Y + 1, z: Z - 1 },
            { tipo: 'quebrar', x: X + 2, y: Y + 3, z: Z },
            { tipo: 'quebrar', x: X, y: Y - 1, z: Z + 2 },
            { tipo: 'colocar', x: X + 2, y: Y, z: Z + 2 },
          ],
        });
      }
      {
        const l = p.lotes.find((q) => q.canteiro === 1)!;
        const fs = (e.fantasmasPerto?.() ?? []).filter((f) => f.canteiro === 1);
        const fantasma = new Set(fs.map((f) => `${f.x},${f.y},${f.z}`));
        const yc = p.h + 1;
        let melhor: { x: number; z: number; n: number } | null = null;
        for (let x = l.x0 + 1; x < l.x0 + l.largura - 1; x++)
          for (let z = l.z0 + 1; z < l.z0 + l.profundidade - 1; z++) {
            if (fantasma.has(`${x},${yc},${z}`) || fantasma.has(`${x},${yc + 1},${z}`)) continue;
            if (e.bloco!(x, yc, z) !== 0 || e.bloco!(x, yc + 1, z) !== 0) continue;
            const parede = [
              [1, 0],
              [-1, 0],
              [0, 1],
              [0, -1],
            ].some(
              ([dx, dz]) =>
                e.bloco!(x + dx, yc + 1, z + dz) !== 0 && !fantasma.has(`${x + dx},${yc + 1},${z + dz}`),
            );
            if (!parede) continue;
            const n = fs.filter((f) => Math.hypot(f.x + 0.5 - (x + 0.5), f.z + 0.5 - (z + 0.5)) < 2.6).length;
            if (!melhor || n > melhor.n) melhor = { x, z, n };
          }
        const c = melhor ?? { x: l.x0 + 2, z: l.z0 + 2, n: 0 };
        const olhos = { x: c.x + 0.5, y: yc + 1.62, z: c.z + 0.5 };
        const perto = fs
          .map((f) => ({ f, d: Math.hypot(f.x + 0.5 - olhos.x, f.y + 0.5 - olhos.y, f.z + 0.5 - olhos.z) }))
          .filter((q) => q.d < 3.2 && q.d > 0.9)
          .sort((a, b) => a.d - b.d)
          .slice(0, 7);
        const mx = perto.reduce((s, q) => s + q.f.x + 0.5, 0) / Math.max(1, perto.length);
        const mz = perto.reduce((s, q) => s + q.f.z + 0.5, 0) / Math.max(1, perto.length);
        cenas.push({
          nome: 'obra',
          pes: { x: c.x + 0.5, y: yc, z: c.z + 0.5 },
          yaw: Math.atan2(mx - olhos.x, mz - olhos.z),
          alvos: perto.map((q) => ({ tipo: 'fantasma' as const, x: q.f.x, y: q.f.y, z: q.f.z })),
        });
      }
      {
        const X = N.x + 72;
        const Z = N.z - 2;
        caixa(X - 6, Y - 1, Z - 6, X + 6, Y - 1, Z + 6, B.grama);
        caixa(X - 6, Y, Z - 6, X + 6, Y + 10, Z + 6, 0);
        for (let dx = -2; dx <= 2; dx++)
          for (let dz = -2; dz <= 2; dz++) {
            if (Math.abs(dx) === 2 && Math.abs(dz) === 2) continue;
            e.definirBloco!(X + dx, Y + 2, Z + dz, B.folhas);
            e.definirBloco!(X + dx, Y + 3, Z + dz, B.folhas);
            if (Math.abs(dx) <= 1 && Math.abs(dz) <= 1) e.definirBloco!(X + dx, Y + 4, Z + dz, B.folhas);
          }
        for (const [dx, dz] of [
          [2, 1],
          [-2, -1],
          [1, -2],
          [-1, 2],
        ])
          e.definirBloco!(X + dx, Y + 1, Z + dz, B.folhas);
        caixa(X, Y, Z, X, Y + 3, Z, B.tronco);
        // 5 (a mais na 033): campo aberto, onde a câmera afastada não bate em nada (nas outras
        // quatro as paredes seguram a câmera perto); a criança olha para +z
        {
          const X5 = N.x + 92;
          const Z5 = N.z - 2;
          caixa(X5 - 8, Y - 1, Z5 - 8, X5 + 8, Y - 1, Z5 + 8, B.grama);
          caixa(X5 - 8, Y, Z5 - 8, X5 + 8, Y + 10, Z5 + 8, 0);
          caixa(X5 + 1, Y, Z5 + 3, X5 + 1, Y + 1, Z5 + 3, B.tabuas);
          e.definirBloco!(X5 - 2, Y, Z5 + 2, B.pedra);
          e.definirBloco!(X5, Y, Z5 + 4, B.pedra);
          cenas.push({
            nome: 'campo',
            pes: { x: X5 + 0.5, y: Y, z: Z5 + 0.5 },
            yaw: 0,
            alvos: [
              { tipo: 'quebrar', x: X5 + 1, y: Y + 1, z: Z5 + 3 },
              { tipo: 'quebrar', x: X5 - 2, y: Y, z: Z5 + 2 },
              { tipo: 'quebrar', x: X5, y: Y, z: Z5 + 4 },
              { tipo: 'quebrar', x: X5 - 1, y: Y - 1, z: Z5 + 2 },
              { tipo: 'colocar', x: X5, y: Y, z: Z5 + 2 },
              { tipo: 'colocar', x: X5 + 2, y: Y, z: Z5 + 1 },
              { tipo: 'colocar', x: X5 + 1, y: Y + 2, z: Z5 + 3 },
            ],
          });
        }
        cenas.push({
          nome: 'copa',
          pes: { x: X + 1.5, y: Y, z: Z + 0.5 },
          yaw: -Math.PI / 2,
          alvos: [
            { tipo: 'quebrar', x: X, y: Y + 1, z: Z },
            { tipo: 'quebrar', x: X + 1, y: Y + 2, z: Z - 1 },
            { tipo: 'quebrar', x: X + 2, y: Y + 1, z: Z + 1 },
            { tipo: 'quebrar', x: X + 1, y: Y - 1, z: Z + 2 },
            { tipo: 'quebrar', x: X + 2, y: Y + 2, z: Z },
            { tipo: 'colocar', x: X + 1, y: Y, z: Z - 1 },
            { tipo: 'colocar', x: X + 3, y: Y, z: Z + 1 },
          ],
        });
      }
      return cenas;
    },
    {
      pedra: Bloco.PEDREGULHO,
      tijolo: Bloco.TIJOLOS_PEDRA,
      tabuas: Bloco.TABUAS,
      vidro: Bloco.VIDRO,
      tocha: Bloco.TOCHA,
      grama: Bloco.TERRA_MUSGOSA,
      folhas: Bloco.FOLHAGEM,
      tronco: Bloco.MADEIRA_RETORCIDA,
    },
  );
}

async function irPara(page: Page, c: Cena, giro = 0, pitch = 0.3, espera = 900) {
  await page.evaluate(
    ([c, giro, pitch]) => {
      const e = window.__brumaluz!;
      e.voar?.(false);
      e.teleportar!(c.pes.x, c.pes.z, c.pes.y);
      e.apontar!(c.yaw + giro, pitch);
    },
    [c, giro, pitch] as const,
  );
  await page.waitForTimeout(espera);
}

// ------------------------------------------------------------------------- criança simulada

function sorteio(semente: number) {
  let a = semente >>> 0;
  const u = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const normal = () => {
    const r = Math.sqrt(-2 * Math.log(Math.max(1e-9, u())));
    return r * Math.cos(2 * Math.PI * u());
  };
  return { u, normal };
}

/** Os pontos do alvo que a criança vê e que um toque acertaria (a mesma conta da 022). */
async function pontosVistos(page: Page, a: Alvo) {
  return page.evaluate((a) => {
    const e = window.__brumaluz!;
    const solido = (x: number, y: number, z: number) => {
      const b = e.bloco!(x, y, z);
      return b !== 0 && b !== 8 && b !== 9;
    };
    const faces: { c: { x: number; y: number; z: number }; n: [number, number, number] }[] = [];
    const D: [number, number, number][] = [
      [1, 0, 0],
      [-1, 0, 0],
      [0, 1, 0],
      [0, -1, 0],
      [0, 0, 1],
      [0, 0, -1],
    ];
    if (a.tipo === 'quebrar') {
      for (const n of D) if (!solido(a.x + n[0], a.y + n[1], a.z + n[2])) faces.push({ c: a, n });
    } else if (a.tipo === 'fantasma') {
      for (const n of D) faces.push({ c: a, n });
    } else {
      for (const k of D) {
        const v = { x: a.x + k[0], y: a.y + k[1], z: a.z + k[2] };
        if (solido(v.x, v.y, v.z)) faces.push({ c: v, n: [-k[0], -k[1], -k[2]] });
      }
    }
    const cam = e.camera!.posicao();
    const [ox, oy, oz] = e.posicao!;
    let caixa: [number, number, number, number] | null = null;
    const dBoneco = Math.hypot(ox - cam[0], oy - 0.7 - cam[1], oz - cam[2]);
    if (e.camera!.opacidadeBoneco() >= 0.7) {
      let x0 = Infinity,
        y0 = Infinity,
        x1 = -Infinity,
        y1 = -Infinity;
      for (const dx of [-0.3, 0.3])
        for (const dy of [-1.62, 0.2])
          for (const dz of [-0.3, 0.3]) {
            const s = e.telaDoPonto!(ox + dx, oy + dy, oz + dz);
            if (!s) continue;
            x0 = Math.min(x0, s.x);
            x1 = Math.max(x1, s.x);
            y0 = Math.min(y0, s.y);
            y1 = Math.max(y1, s.y);
          }
      if (x1 > x0) {
        const mx = (x1 - x0) * 0.12;
        const my = (y1 - y0) * 0.06;
        caixa = [x0 + mx, y0 + my, x1 - mx, y1 - my];
      }
    }
    // o tamanho do alvo na tela (px): a caixa dos 8 cantos do bloco
    let bx0 = Infinity,
      by0 = Infinity,
      bx1 = -Infinity,
      by1 = -Infinity;
    for (const dx of [0, 1])
      for (const dy of [0, 1])
        for (const dz of [0, 1]) {
          const s = e.telaDoPonto!(a.x + dx, a.y + dy, a.z + dz);
          if (!s) continue;
          bx0 = Math.min(bx0, s.x);
          bx1 = Math.max(bx1, s.x);
          by0 = Math.min(by0, s.y);
          by1 = Math.max(by1, s.y);
        }
    const tamanho = bx1 > bx0 ? Math.sqrt((bx1 - bx0) * (by1 - by0)) : 0;
    const canvas = document.getElementById('cena');
    const pontos: { sx: number; sy: number; w: [number, number, number] }[] = [];
    let naTela = 0;
    for (const f of faces) {
      for (let i = 0; i < 4; i++)
        for (let j = 0; j < 4; j++) {
          const u = 0.14 + i * 0.24;
          const v = 0.14 + j * 0.24;
          const p = [0, 0, 0];
          const eixos = [0, 1, 2].filter((k) => f.n[k] === 0);
          const k = [0, 1, 2].find((q) => f.n[q] !== 0)!;
          p[k] = f.n[k] > 0 ? 1.01 : -0.01;
          p[eixos[0]] = u;
          p[eixos[1]] = v;
          const w: [number, number, number] = [f.c.x + p[0], f.c.y + p[1], f.c.z + p[2]];
          const s = e.telaDoPonto!(w[0], w[1], w[2]);
          if (!s || !Number.isFinite(s.x) || !Number.isFinite(s.y)) continue;
          if (s.x < 2 || s.y < 2 || s.x > innerWidth - 2 || s.y > innerHeight - 2) continue;
          const sob = document.elementFromPoint(s.x, s.y);
          if (sob !== canvas && !sob?.classList.contains('olhar')) continue;
          naTela++;
          if (caixa && s.x > caixa[0] && s.x < caixa[2] && s.y > caixa[1] && s.y < caixa[3]) {
            const dw = Math.hypot(w[0] - cam[0], w[1] - cam[1], w[2] - cam[2]);
            if (dw > dBoneco) continue;
          }
          const r = e.preverToque!(s.x, s.y);
          if (!acerta(r, a)) continue;
          pontos.push({ sx: s.x, sy: s.y, w });
        }
    }
    return { pontos, naTela, tamanho };
    function acerta(r: ReturnType<NonNullable<typeof e.preverToque>>, a: Alvo): boolean {
      if (a.tipo === 'fantasma')
        return !!r.fantasma && r.fantasma.x === a.x && r.fantasma.y === a.y && r.fantasma.z === a.z;
      if (r.fantasma || !r.alvo) return false;
      if (a.tipo === 'quebrar') return r.alvo.x === a.x && r.alvo.y === a.y && r.alvo.z === a.z;
      return (
        r.alvo.x + r.alvo.normal.x === a.x &&
        r.alvo.y + r.alvo.normal.y === a.y &&
        r.alvo.z + r.alvo.normal.z === a.z
      );
    }
  }, a);
}

async function resultado(page: Page, a: Alvo, x: number, y: number) {
  return page.evaluate(
    ([a, x, y]) => {
      const r = window.__brumaluz!.preverToque!(x, y);
      let ok = false;
      if (a.tipo === 'fantasma')
        ok = !!r.fantasma && r.fantasma.x === a.x && r.fantasma.y === a.y && r.fantasma.z === a.z;
      else if (!r.fantasma && r.alvo) {
        ok =
          a.tipo === 'quebrar'
            ? r.alvo.x === a.x && r.alvo.y === a.y && r.alvo.z === a.z
            : r.alvo.x + r.alvo.normal.x === a.x &&
              r.alvo.y + r.alvo.normal.y === a.y &&
              r.alvo.z + r.alvo.normal.z === a.z;
      }
      return ok ? 'acerto' : r.fantasma || r.alvo ? 'erro' : 'nada';
    },
    [a, x, y] as const,
  );
}

const CUSTO_TOQUE = 1.2;
const CUSTO_VIRAR = 2.0;
const MAX_TOQUES = 4;
const MAX_VIRADAS = 3;
/** Erro do dedo de 3–4 anos (~4 mm; px CSS), o mesmo da 022. */
const SIGMA_DEDO = 24;

interface Tentativa {
  cena: string;
  zoom: number;
  alvo: number;
  giro: number;
  semente: number;
  acertou: boolean;
  primeiro: boolean;
  toques: number;
  viradas: number;
  erros: number;
  tempo: number;
  visivelInicio: number;
  /** O tamanho do alvo na tela no primeiro toque (px). */
  tamanho: number;
}

async function tentar(page: Page, c: Cena, a: Alvo, giro: number, semente: number) {
  const r = sorteio(semente);
  await irPara(page, c, giro, 0.3, 1300);
  let toques = 0;
  let viradas = 0;
  let erros = 0;
  let tempo = 0;
  let visivelInicio = -1;
  let tamanho = 0;
  while (toques < MAX_TOQUES) {
    const v = await pontosVistos(page, a);
    if (visivelInicio < 0) visivelInicio = v.pontos.length;
    if (!v.pontos.length) {
      if (viradas >= MAX_VIRADAS) break;
      viradas++;
      tempo += CUSTO_VIRAR;
      await page.evaluate(
        ([a, ruidoYaw, ruidoPitch]) => {
          const e = window.__brumaluz!;
          const [x, y, z] = e.posicao!;
          const dx = a.x + 0.5 - x;
          const dy = a.y + 0.5 - y;
          const dz = a.z + 0.5 - z;
          const yaw = Math.atan2(dx, dz) + ruidoYaw;
          const pitch = Math.min(1.2, Math.max(-0.3, -Math.atan2(dy, Math.hypot(dx, dz)) * 0.8 + 0.25 + ruidoPitch));
          e.apontar!(yaw, pitch);
        },
        [a, r.normal() * 0.35, r.normal() * 0.15] as const,
      );
      await page.waitForTimeout(700);
      continue;
    }
    if (!tamanho) tamanho = v.tamanho;
    const mx = v.pontos.reduce((s, p) => s + p.sx, 0) / v.pontos.length;
    const my = v.pontos.reduce((s, p) => s + p.sy, 0) / v.pontos.length;
    let m = v.pontos[0];
    for (const p of v.pontos) if (Math.hypot(p.sx - mx, p.sy - my) < Math.hypot(m.sx - mx, m.sy - my)) m = p;
    toques++;
    tempo += CUSTO_TOQUE;
    const res = await resultado(page, a, m.sx + r.normal() * SIGMA_DEDO, m.sy + r.normal() * SIGMA_DEDO);
    if (res === 'acerto')
      return { acertou: true, primeiro: toques === 1, toques, viradas, erros, tempo, visivelInicio, tamanho };
    if (res === 'erro') erros++;
  }
  return { acertou: false, primeiro: false, toques, viradas, erros, tempo: tempo + 3, visivelInicio, tamanho };
}

for (const tela of telas)
  test(`mira: a criança simulada, ${tela}`, async ({ browser }) => {
    test.skip(QUAL !== 'mira');
    const giros = [0, Math.PI / 2, Math.PI, -Math.PI / 2];
    const sementes = (process.env.SEMENTES ?? '11,23').split(',').map(Number);
    const { ctx, page } = await abrirTema(browser, tela, 'cidade-grande');
    await blocoNaMao(page);
    const cenas = await montarCenas(page);
    const todas: Tentativa[] = [];
    const so = (process.env[`CENAS_${tela}`] ?? process.env.CENAS)?.split(',');
    for (const c of cenas.filter((q) => !so || so.includes(q.nome))) {
      await irPara(page, c, 0, 0.3, 2500);
      await assentar(page, 8);
      for (const zoom of ZOOMS) {
        await zoomAgora(page, zoom);
        await irPara(page, c, 0, 0.3, 1500);
        console.log(
          `DIST ${tela} ${c.nome} ${zoom} ${(await page.evaluate(() => window.__brumaluz!.camera!.distancia())).toFixed(2)}`,
        );
        for (let i = 0; i < c.alvos.length; i++)
          for (const giro of giros)
            for (const s of sementes) {
              const semente = s * 1000 + i * 10 + giros.indexOf(giro);
              const t = await tentar(page, c, c.alvos[i], giro, semente);
              todas.push({ cena: c.nome, zoom, alvo: i, giro, semente, ...t });
            }
        const minhas = todas.filter((t) => t.cena === c.nome && t.zoom === zoom);
        const ac = minhas.filter((t) => t.acertou);
        console.log(
          `MIRA ${tela} ${c.nome} ${zoom} acertos ${ac.length}/${minhas.length} primeiro ${
            minhas.filter((t) => t.primeiro).length
          } erros ${minhas.reduce((s, t) => s + t.erros, 0)} px ${(
            minhas.reduce((s, t) => s + t.tamanho, 0) / minhas.length
          ).toFixed(1)}`,
        );
      }
    }
    mkdirSync(PASTA, { recursive: true });
    writeFileSync(`${PASTA}/mira-${tela}${process.env.MIRA_SUFIXO ?? ''}.json`, JSON.stringify(todas));
    // o resumo por distância (as quatro cenas juntas)
    for (const zoom of ZOOMS) {
      const m = todas.filter((t) => t.zoom === zoom);
      const n = m.length;
      console.log(
        `RESUMO ${tela} ${zoom} n ${n} primeiro ${((100 * m.filter((t) => t.primeiro).length) / n).toFixed(1)}% acerto ${(
          (100 * m.filter((t) => t.acertou).length) / n
        ).toFixed(1)}% erros/tent ${(m.reduce((s, t) => s + t.erros, 0) / n).toFixed(2)} visto ${(
          (100 * m.filter((t) => t.visivelInicio > 0).length) / n
        ).toFixed(1)}% px ${(m.reduce((s, t) => s + t.tamanho, 0) / n).toFixed(1)}`,
      );
    }
    await ctx.close();
  });

// ------------------------------------------------------------------- as cenas da mira, de perto

for (const tela of telas)
  test(`cenas: as cenas da mira em cada distância, ${tela}`, async ({ browser }) => {
    test.skip(QUAL !== 'cenas');
    const { ctx, page } = await abrirTema(browser, tela, 'cidade-grande');
    await blocoNaMao(page);
    const cenas = await montarCenas(page);
    const so = (process.env[`CENAS_${tela}`] ?? process.env.CENAS)?.split(',');
    for (const c of cenas.filter((q) => !so || so.includes(q.nome))) {
      await irPara(page, c, 0, 0.3, 2500);
      await assentar(page, 8);
      // os blocos da cena estão lá? (o núcleo recusa edição em terreno protegido)
      const conferido = await page.evaluate((c) => {
        const e = window.__brumaluz!;
        return c.alvos.map((a) => (a.tipo === 'quebrar' ? e.bloco!(a.x, a.y, a.z) : -1));
      }, c);
      console.log(`CENA ${tela} ${c.nome} blocos dos alvos ${JSON.stringify(conferido)}`);
      for (const zoom of ZOOMS) {
        await zoomAgora(page, zoom);
        await irPara(page, c, 0, 0.3, 1800);
        const d = await page.evaluate(() => window.__brumaluz!.camera!.distancia());
        console.log(`CENA ${tela} ${c.nome} ${zoom} distância de verdade ${d.toFixed(2)}`);
        await foto(page, `${tela}-cena-${c.nome}-${rotulo(zoom)}`);
      }
    }
    await ctx.close();
  });

// ---------------------------------------------------------------------------------- fotos

async function foto(page: Page, nome: string) {
  mkdirSync(`${PASTA}/fotos`, { recursive: true });
  await page.screenshot({ path: `${PASTA}/fotos/${nome}.png` });
}

/** Cada zoom no mesmo lugar: `por` põe a criança lá (depois do zoom). */
async function cadaZoom(page: Page, tela: NomeTela, lugar: string, por: () => Promise<void>) {
  for (const zoom of ZOOMS) {
    await zoomAgora(page, zoom);
    await por();
    await page.waitForTimeout(1800);
    const info = await page.evaluate(() => ({
      zoom: window.__brumaluz!.camera!.zoom(),
      dist: window.__brumaluz!.camera!.distancia(),
    }));
    console.log(`FOTO ${tela} ${lugar} ${zoom} ${JSON.stringify(info)}`);
    await foto(page, `${tela}-${lugar}-${rotulo(zoom)}`);
  }
}

for (const tela of telas)
  test(`fotos: os cinco lugares, ${tela}`, async ({ browser }) => {
    test.skip(QUAL !== 'fotos');
    // Vila Neon: a rua (do nascimento, para a rua) e dentro da Casa anos 80
    {
      const { ctx, page } = await abrirTema(browser, tela, 'vila-neon');
      await page.addStyleTag({ content: '.dica-mira { display: none !important; }' });
      const rua = async () =>
        page.evaluate(() => {
          const e = window.__brumaluz!;
          const p = e.vila!()!;
          e.voar?.(false);
          e.teleportar!(p.nascimento.x + 2, p.nascimento.z + 3, p.h + 1.2);
          e.apontar!(p.nascimento.olhar, 0.3);
        });
      await rua();
      await assentar(page, 9);
      await cadaZoom(page, tela, 'vila-rua', rua);
      // a casa: sai, põe o zoom (a casa usa o maior entre ele e o dela), entra
      const casa = async () => {
        await page.evaluate(() => {
          const e = window.__brumaluz!;
          const p = e.vila!()!;
          e.teleportar!(p.ox + 52.5, p.oz + 61, p.h + 1.2);
        });
        await page.waitForTimeout(700);
        await page.evaluate(() => {
          const e = window.__brumaluz!;
          const p = e.vila!()!;
          e.teleportar!(p.ox + 52.5, p.oz + 51, p.h + 1.2);
          e.apontar!(Math.atan2(49.5 - 52.5, 40 - 51), 0.4);
        });
      };
      for (const zoom of ZOOMS) {
        await page.evaluate(() => {
          const e = window.__brumaluz!;
          const p = e.vila!()!;
          e.teleportar!(p.ox + 52.5, p.oz + 61, p.h + 1.2);
        });
        await page.waitForTimeout(900);
        await zoomAgora(page, zoom);
        await casa();
        await page.waitForTimeout(2200);
        const info = await page.evaluate(() => ({
          zoom: window.__brumaluz!.camera!.zoom(),
          dist: window.__brumaluz!.camera!.distancia(),
        }));
        console.log(`FOTO ${tela} vila-casa ${zoom} ${JSON.stringify(info)}`);
        await foto(page, `${tela}-vila-casa-${rotulo(zoom)}`);
      }
      await ctx.close();
    }
    // Cidade Grande: a rua do nascimento e a obra encostada no tapume (a cena apertada da 022)
    {
      const { ctx, page } = await abrirTema(browser, tela, 'cidade-grande');
      await page.addStyleTag({ content: '.dica-mira { display: none !important; }' });
      const rua = async () =>
        page.evaluate(() => {
          const e = window.__brumaluz!;
          const p = e.cidade!()!;
          e.voar?.(false);
          // um pouco além de onde nasce (bem no nascimento um banco de pedra tapava o boneco)
          e.teleportar!(p.nascimento.x + 2, p.nascimento.z + 3, p.h + 1.2);
          e.apontar!((p.nascimento.olhar ?? 0) + 0.6, 0.3);
        });
      await rua();
      await assentar(page, 9);
      await cadaZoom(page, tela, 'cidade-rua', rua);
      await blocoNaMao(page);
      const cenas = await montarCenas(page);
      const obra = cenas.find((c) => c.nome === 'obra')!;
      await irPara(page, obra, 0, 0.3, 2500);
      await assentar(page, 8);
      await cadaZoom(page, tela, 'cidade-obra', () => irPara(page, obra, Math.PI * 0.75, 0.4, 200));
      // de frente para os blocos azuis (encostada no tapume, como a criança enche a obra)
      await cadaZoom(page, tela, 'cidade-obra-frente', () => irPara(page, obra, 0, 0.35, 200));
      await ctx.close();
    }
    // mundo aberto: o Rancho Alegre, de onde nasce
    {
      const { ctx, page } = await abrirTema(browser, tela, 'rancho-alegre');
      await page.addStyleTag({ content: '.dica-mira { display: none !important; }' });
      const ini = await page.evaluate(() => ({ p: window.__brumaluz!.jogadorPes!(), r: window.__brumaluz!.rotacao! }));
      const aqui = async () =>
        page.evaluate((ini) => {
          const e = window.__brumaluz!;
          e.teleportar!(ini.p[0], ini.p[2], ini.p[1] + 0.2);
          e.apontar!(ini.r[1], 0.3);
        }, ini);
      await cadaZoom(page, tela, 'rancho-aberto', aqui);
      await ctx.close();
    }
  });

// ---------------------------------------------------------------- a trilha, a placa e a mão

for (const tela of telas)
  test(`guia: pegadas, placa e mãozinha de longe, ${tela}`, async ({ browser }) => {
    test.skip(QUAL !== 'guia');
    // c3 (passeio): as pegadas e a placa do lugar; c1 (obra): a mãozinha no canteiro
    for (const missao of (process.env.GUIA_MISSOES ?? 'c3,c1').split(','))
    for (const zoom of [4.4, recDa(tela)]) {
      const { ctx, page } = await contexto(browser, tela);
      const id = `e033-guia-${tela}-${missao}-${zoom}`;
      await criarMundo(page, id, 'cidade-grande', {
        alma: { local: { feitas: missao === 'c3' ? ['c1', 'c2'] : [] } },
      });
      await page.goto(`/?mundo=${id}&esboco=033&zoomDeitado=${zoom}&zoomEmPe=${zoom}`);
      await pronto(page);
      await assentar(page);
      await page.evaluate(() => window.dispatchEvent(new CustomEvent('brumaluz:missoes')));
      await page.waitForSelector('[data-alma-quadro]', { timeout: 20_000 });
      await page.waitForTimeout(500);
      await page.locator(`[data-alma-jogar="${missao}"]`).first().tap();
      await page.waitForFunction(() => (window.__guia?.pegadas() ?? 0) > 0, undefined, { timeout: 15_000 });
      await page.waitForTimeout(2200);
      await foto(page, `${tela}-guia-${missao}-trilha-${rotulo(zoom)}`);
      const placa = await page.evaluate(() => window.__guia!.caixaPlaca());
      console.log(`GUIA ${tela} ${missao} ${zoom} placa ${JSON.stringify(placa)} pegadas ${await page.evaluate(() => window.__guia!.pegadas())}`);
      if (missao === 'c1') {
        const r = await andarPelaTrilha(page, 150_000);
        console.log(`GUIA ${tela} ${missao} ${zoom} andou ${JSON.stringify(r)}`);
        // na obra: a mãozinha vem tocar num bloco azul (foto no meio do toque dela)
        await page.waitForFunction(() => !!window.__guia?.mao(), undefined, { timeout: 30_000 }).catch(() => undefined);
        await page.waitForTimeout(1000);
        await foto(page, `${tela}-guia-${missao}-mao-${rotulo(zoom)}`);
        console.log(`GUIA ${tela} ${missao} ${zoom} mão ${JSON.stringify(await page.evaluate(() => window.__guia!.mao()))}`);
      }
      await ctx.close();
    }
  });

// ---------------------------------------------------------------------------------- fps

async function medir(page: Page, girar: boolean) {
  return page.evaluate(async (girar) => {
    const e = window.__brumaluz!;
    const amostras: number[] = [];
    let yaw = e.rotacao![1];
    const pitch = e.rotacao![0];
    const fim = performance.now() + 5000;
    let ultimo = performance.now();
    await new Promise<void>((ok) => {
      const passo = () => {
        const agora = performance.now();
        if (girar) {
          yaw += (agora - ultimo) * 0.0008;
          e.apontar!(yaw, pitch);
        }
        amostras.push(agora - ultimo);
        ultimo = agora;
        if (agora < fim) requestAnimationFrame(passo);
        else ok();
      };
      requestAnimationFrame(passo);
    });
    amostras.sort((a, b) => a - b);
    return {
      fps: Math.round((amostras.length / 5) * 10) / 10,
      p95ms: Math.round(amostras[Math.floor(amostras.length * 0.95)] * 10) / 10,
    };
  }, girar);
}

for (const tela of telas)
  test(`fps: hoje e a recomendada, ${tela}`, async ({ browser }) => {
    test.skip(QUAL !== 'fps');
    const lento = Number(process.env.DESACELERAR_CPU ?? 4);
    // uma sessão por mundo; hoje e a recomendada se alternam 3 vezes (a mediana de cada)
    for (const tema of ['vila-neon', 'cidade-grande']) {
      const { ctx, page } = await abrirTema(browser, tela, tema);
      await page.evaluate(() => {
        const e = window.__brumaluz!;
        const p = e.vila?.() ?? e.cidade?.();
        if (!p) return;
        e.teleportar!(p.nascimento.x + 2, p.nascimento.z + 3, p.h + 1.2);
        e.apontar!((p.nascimento as { olhar?: number }).olhar ?? 0, 0.3);
      });
      await assentar(page, 9);
      const cdp = await page.context().newCDPSession(page);
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: lento });
      await page.waitForTimeout(4000);
      const r: Record<string, { parado: number[]; girando: number[] }> = {};
      for (let volta = 0; volta < 3; volta++)
        for (const zoom of [4.4, recDa(tela)]) {
          await zoomAgora(page, zoom);
          await page.waitForTimeout(1500);
          const parado = await medir(page, false);
          const girando = await medir(page, true);
          const q = (r[zoom] ??= { parado: [], girando: [] });
          q.parado.push(parado.fps);
          q.girando.push(girando.fps);
          console.log(`FPS-VOLTA ${tela} ${tema} ${zoom} ${parado.fps} ${girando.fps}`);
        }
      const med = (v: number[]) => [...v].sort((a, b) => a - b)[Math.floor(v.length / 2)];
      for (const [zoom, q] of Object.entries(r))
        console.log(`FPS ${tela} ${tema} ${zoom} parado ${med(q.parado)} girando ${med(q.girando)}`);
      await ctx.close();
    }
  });

// --------------------------------------------------------------------------------- vídeo

for (const tela of telas)
  test(`vídeo: andando na Vila Neon com a recomendada, ${tela}`, async () => {
    test.skip(QUAL !== 'video');
    const browser = await navegadorJanelaGrande();
    const { ctx, page } = await abrirTema(browser, tela, 'vila-neon', recDa(tela));
    await page.addStyleTag({ content: '.dica-mira { display: none !important; }' });
    await page.evaluate(() => {
      const e = window.__brumaluz!;
      const p = e.vila!()!;
      e.teleportar!(p.nascimento.x + 2, p.nascimento.z + 3, p.h + 1.2);
      e.apontar!(p.nascimento.olhar, 0.3);
    });
    await assentar(page, 9);
    const v = TELAS[tela].viewport;
    const parar = await gravarTela(page, `${PASTA}/quadros-camera-${tela}`, v.width * 2, v.height * 2);
    // anda pela rua com o joystick de verdade (o controle direto), vira devagar e volta
    await page.evaluate(async () => {
      const e = window.__brumaluz!;
      const ctl = e.controleDireto!;
      const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));
      const y0 = e.rotacao![1];
      ctl.mover(1, 0);
      for (let i = 0; i < 60; i++) {
        e.apontar!(y0 + Math.sin(i / 20) * 0.5, 0.3);
        await espera(60);
      }
      ctl.mover(0, 0);
      await espera(600);
      for (let i = 0; i < 50; i++) {
        e.apontar!(y0 + (i / 50) * Math.PI, 0.3 + 0.2 * Math.sin((i / 50) * Math.PI));
        await espera(60);
      }
      ctl.mover(1, 0);
      await espera(2500);
      ctl.mover(0, 0);
      await espera(800);
    });
    await parar();
    await ctx.close();
    await browser.close();
  });
