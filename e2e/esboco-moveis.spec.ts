import { test, type Browser, type Page } from '@playwright/test';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { assentar, criarMundo, TAMANHOS, type Tamanho } from './guia-palco';

/**
 * Fotos do esboço da spec 039 (Móveis e utensílios) com o motor de verdade: o palco de
 * `src/esboco/moveis.ts`, que só existe com `?esboco=moveis`. Só para o esboço, na placa:
 *
 *   E2E_ENV="-e ESBOCO_039=empe,deitado,pc" scripts/e2e-gpu.sh \
 *     e2e/esboco-moveis.spec.ts --workers 2 --trace off
 *
 * - `provas`: as vistas para acertar as medidas (não vão para o dono);
 * - `empe`: o celular em pé (os cômodos de dia e de noite, de fora e de dentro, as duas versões
 *   da cama, do sofá e da TV, os toques em sequência, o custo) e a prancha;
 * - `deitado` e `pc`: o celular deitado e o computador (a casa inteira, os cômodos de dia e de
 *   noite, de dentro, e os toques).
 *
 * As fotos vão para capturas-039/esboco/ (MOVEIS_PASTA muda).
 */
declare const process: { env: Record<string, string | undefined> };
const QUAL = (process.env.ESBOCO_039 ?? '').split(',').filter(Boolean);
test.skip(!QUAL.length, 'fotos do esboço da 039 só com ESBOCO_039');
test.describe.configure({ mode: 'parallel' });

type V3 = [number, number, number];
const PASTA = process.env.MOVEIS_PASTA ?? 'capturas-039/esboco';
const DIA = 0.42;
const NOITE = 0.96;
const T0 = Date.now();
const passo = (o: string) => console.log(`PASSO ${((Date.now() - T0) / 1000).toFixed(0)} s ${o}`);

type Camera =
  | { tipo: 'olhar'; alvo: V3; yaw: number; pitch: number; largura: number; altura: number; fov: number }
  | { tipo: 'olho'; olho: V3; alvo: V3; fov: number };
interface Onde {
  x: number;
  z: number;
  yaw: number;
  pose: 'pe' | 'toca' | 'sentada' | 'deitada' | 'fora';
  assento?: number;
  dormindo?: boolean;
}
interface Cena {
  hora?: number;
  t?: number;
  toques?: Record<string, unknown>;
  crianca?: Onde;
  versao?: Record<string, string>;
  cam: Camera;
}

/**
 * No celular em pé a tela é estreita: as fotos de perto (menos de 5 de largura) chegam mais perto,
 * para o móvel encher a foto (os lados podem cortar um tico). Vale na hora da tomada.
 */
let estreita = 1;
const olhar = (alvo: V3, yaw: number, pitch: number, largura: number, altura: number, fov = 40): Camera => ({
  tipo: 'olhar',
  alvo,
  yaw,
  pitch,
  largura,
  altura,
  fov,
});
/** De dentro: os olhos a 1,62 (a primeira pessoa do jogo, 80° em pé). */
const olho = (o: [number, number], alvo: V3): Camera => ({ tipo: 'olho', olho: [o[0], 1.62, o[1]], alvo, fov: 80 });

/** Os cômodos (x do meio) e onde a criança fica em cada um nas fotos de longe. */
const COMODOS = {
  sala: {
    cam: (l: number) => olhar([-7.6, 0.9, 1.6], 0.32, 0.42, l, 3.6),
    dentro: olho([-4.6, -2.4], [-8.6, 0.6, 2.4]),
    crianca: { x: -7.0, z: 0.4, yaw: Math.PI + 0.3, pose: 'pe' } as Onde,
  },
  cozinha: {
    cam: (l: number) => olhar([0.6, 0.9, 1.8], -0.18, 0.42, l, 3.6),
    dentro: olho([3.6, -2.4], [-0.4, 0.7, 2.6]),
    crianca: { x: 0.0, z: 1.9, yaw: Math.PI - 0.2, pose: 'pe' } as Onde,
  },
  quarto: {
    cam: (l: number) => olhar([8.6, 0.9, 1.8], 0.2, 0.42, l, 3.6),
    dentro: olho([11.2, -2.3], [7.6, 0.5, 2.4]),
    crianca: { x: 9.0, z: 1.6, yaw: Math.PI - 0.4, pose: 'pe' } as Onde,
  },
} as const;
type Comodo = keyof typeof COMODOS;

/** Tudo ligado de um jeito que se lê de longe: de dia a TV ligada e a mesa posta; de noite as luzes. */
const toquesDoComodo = (noite: boolean) => ({
  tv: 1,
  canal: 0,
  geladeira: 0,
  som: false,
  fogao: false,
  abajur: noite,
  lua: noite,
  agua: false,
  pratos: true,
  guarda: 0,
  carrinho: false,
});
const DESLIGADO = { ...toquesDoComodo(false), tv: -1, pratos: false };

async function abrirPalco(browser: Browser, tamanho: Tamanho): Promise<Page> {
  const ctx = await browser.newContext(TAMANHOS[tamanho]);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log(`erro na página: ${String(e)}`));
  page.on('console', (m) => {
    if (m.text().startsWith('esboco')) console.log(m.text());
  });
  await page.addInitScript(() => {
    try {
      localStorage.setItem(
        'terrario:config',
        JSON.stringify({ distancia: 5, mostrarFps: false, qualidade: 'alta', mostrarAtalhos: false }),
      );
    } catch {
      // sem armazenamento: fica a distância padrão
    }
  });
  await criarMundo(page, 'moveis', 'vila-neon', {}, 1337);
  await page.goto(`/?mundo=moveis&esboco=moveis${tamanho === 'pc' ? '&escala=1' : ''}`);
  await page.waitForFunction(() => window.__brumaluz?.ready === true && !!window.__moveis, undefined, {
    timeout: 240_000,
  });
  await page.evaluate((h) => {
    document.querySelector<HTMLElement>('.entrada')?.setAttribute('hidden', '');
    const e = window.__brumaluz!;
    e.definirClima?.('limpo');
    window.__moveis!.hora(h);
    window.dispatchEvent(new Event('resize'));
  }, DIA);
  await assentar(page);
  const alvo = await page.evaluate(() => {
    const v = window.__brumaluz!.vila!()!;
    return [Math.round((v.plana.x0 + v.plana.x1) / 2), v.plana.z1 + 28] as const;
  });
  await page.evaluate(([x, z]) => window.__brumaluz!.teleportar!(x + 0.5, z + 0.5), alvo);
  await assentar(page);
  for (let i = 0; i < 40; i++) {
    const faltam = await page.evaluate(([x, z]) => {
      const e = window.__brumaluz!;
      let n = 0;
      for (let dx = -26; dx <= 26; dx += 6)
        for (let dz = -19; dz <= 19; dz += 6) {
          let tem = false;
          for (let y = 120; y > 1 && !tem; y--) tem = !!e.bloco!(x + dx, y, z + dz);
          if (!tem) n++;
        }
      return n;
    }, alvo);
    if (faltam === 0) break;
    await page.waitForTimeout(1500);
  }
  const O = await page.evaluate(() => window.__moveis!.montar());
  console.log(`palco ${JSON.stringify(O)}`);
  await page.waitForTimeout(tamanho === 'pc' ? 16000 : 12000);
  await page.evaluate(() => window.__moveis!.esconder(true));
  await page.evaluate(() => {
    const cena = document.getElementById('cena')!;
    for (const el of Array.from(document.body.querySelectorAll<HTMLElement>('*')))
      if (el !== cena && !el.contains(cena)) el.style.visibility = 'hidden';
  });
  passo(`montou ${tamanho}`);
  return page;
}

async function foto(page: Page, nome: string, pasta: string) {
  mkdirSync(pasta, { recursive: true });
  await page.screenshot({ path: `${pasta}/${nome}.jpg`, type: 'jpeg', quality: 88 });
  console.log(`FOTO ${nome}`);
}

async function tomada(page: Page, c: Cena) {
  if (c.cam.tipo === 'olhar' && c.cam.largura < 5)
    c = { ...c, cam: { ...c.cam, largura: c.cam.largura * estreita, altura: c.cam.altura * estreita } };
  await page.evaluate(
    (c) => {
      const m = window.__moveis!;
      if (c.versao) m.versao(c.versao as never);
      m.hora(c.hora ?? 0.42);
      m.tocar((c.toques ?? {}) as never);
      if (c.crianca) m.crianca(c.crianca as never);
      m.tempo(c.t ?? 1.5);
      m.enquadrar(c.cam as never);
    },
    c,
  );
  await page.waitForTimeout(700);
}

// ------------------------------------------------------------------ as cenas
/** Os cômodos de fora (de dia e de noite) e de dentro, numa tela. */
async function comodos(page: Page, pasta: string, largura: number) {
  for (const [nome, c] of Object.entries(COMODOS) as Array<[Comodo, (typeof COMODOS)[Comodo]]>) {
    for (const [hora, h] of [
      ['dia', DIA],
      ['noite', NOITE],
    ] as const) {
      await tomada(page, { hora: h, toques: toquesDoComodo(hora === 'noite'), crianca: c.crianca, cam: c.cam(largura) });
      await foto(page, `${nome}-${hora}`, pasta);
    }
    await tomada(page, { hora: DIA, toques: toquesDoComodo(false), crianca: { ...c.crianca, pose: 'fora' }, cam: c.dentro });
    await foto(page, `${nome}-dentro-dia`, pasta);
    await tomada(page, { hora: NOITE, toques: toquesDoComodo(true), crianca: { ...c.crianca, pose: 'fora' }, cam: c.dentro });
    await foto(page, `${nome}-dentro-noite`, pasta);
  }
}

const CAM_TV = olhar([-10.0, 1.0, 0.8], 1.35, 0.22, 3.6, 2.3);
const CAM_GELADEIRA = olhar([-2.1, 1.0, 3.1], 0.3, 0.22, 3.2, 2.4);
const CAM_SOM = olhar([-5.8, 0.85, 3.2], 0.25, 0.2, 2.6, 2.2);
const CAM_CAMA = olhar([7.5, 0.55, 3.0], 0.75, 0.52, 3.0, 2.0);
const CAM_FOGAO = olhar([-0.7, 1.0, 3.4], -0.3, 0.45, 2.0, 1.6);

/** Os toques em sequência (cada um com 3 ou 4 fotos). */
async function toques(page: Page, pasta: string) {
  const naTv: Onde = { x: -9.2, z: -0.1, yaw: -0.85, pose: 'toca' };
  const seqTv: Array<[string, number, number, number]> = [
    ['1-desligada', -1, 0, 0.5],
    ['2-ligando', 0.3, 0, 0.6],
    ['3-ligando', 0.7, 0, 0.9],
    ['4-ligada', 1, 0, 2.2],
    ['5-outro-canal', 1, 2, 2.6],
  ];
  for (const [n, tv, canal, t] of seqTv) {
    await tomada(page, { toques: { ...DESLIGADO, tv, canal }, crianca: n === '4-ligada' || n === '5-outro-canal' ? { ...naTv, pose: 'pe' } : naTv, t, cam: CAM_TV });
    await foto(page, `toque-tv-${n}`, pasta);
  }
  const naGeladeira: Onde = { x: -1.0, z: 2.2, yaw: -0.86, pose: 'toca' };
  for (const [n, k] of [
    ['1-fechada', 0],
    ['2-abrindo', 0.35],
    ['3-abrindo', 0.7],
    ['4-aberta', 1],
  ] as const) {
    await tomada(page, { toques: { ...DESLIGADO, geladeira: k }, crianca: naGeladeira, cam: CAM_GELADEIRA });
    await foto(page, `toque-geladeira-${n}`, pasta);
  }
  const noSom: Onde = { x: -6.5, z: 2.5, yaw: 0.75, pose: 'toca' };
  for (const [n, toca, t] of [
    ['1-parado', false, 0],
    ['2-tocando', true, 0.35],
    ['3-tocando', true, 1.05],
    ['4-tocando', true, 1.75],
  ] as const) {
    await tomada(page, { toques: { ...DESLIGADO, som: toca }, crianca: toca ? { ...noSom, pose: 'pe' } : noSom, t, cam: CAM_SOM });
    await foto(page, `toque-som-${n}`, pasta);
  }
  const deitada = (dormindo: boolean): Onde => ({ x: 7.5, z: 3.6, yaw: Math.PI, pose: 'deitada', assento: 0.34, dormindo });
  for (const [n, c, h, lua] of [
    ['1-em-pe', { x: 6.5, z: 1.9, yaw: 0.9, pose: 'toca' } as Onde, DIA, false],
    ['2-deitada', deitada(false), DIA, false],
    ['3-noite', deitada(true), NOITE, true],
  ] as const) {
    await tomada(page, { hora: h, toques: { ...DESLIGADO, lua }, crianca: c, cam: CAM_CAMA });
    await foto(page, `toque-cama-${n}`, pasta);
  }
  // o fogão aceso (as bocas, a tampa pulando e o vapor)
  for (const [n, f, t] of [
    ['1-apagado', false, 0],
    ['2-aceso', true, 0.6],
  ] as const) {
    await tomada(page, { toques: { ...DESLIGADO, fogao: f }, crianca: { x: -0.4, z: 2.3, yaw: 0, pose: 'fora' }, t, cam: CAM_FOGAO });
    await foto(page, `toque-fogao-${n}`, pasta);
  }
}

/** As duas versões da cama, do sofá e da TV (de perto, de dia). */
async function versoes(page: Page, pasta: string) {
  const fora: Onde = { x: 0, z: -2, yaw: 0, pose: 'fora' };
  for (const v of ['a', 'b'] as const) {
    await tomada(page, { versao: { cama: v, sofa: v, tv: v }, toques: DESLIGADO, crianca: fora, cam: CAM_CAMA });
    await foto(page, `cama-${v}`, pasta);
    await tomada(page, { toques: DESLIGADO, crianca: { x: 7.5, z: 3.6, yaw: Math.PI, pose: 'deitada', assento: v === 'a' ? 0.34 : 0.36 }, cam: CAM_CAMA });
    await foto(page, `cama-${v}-deitada`, pasta);
    // de frente e de costas (nenhuma forma estranha de nenhum lado)
    await tomada(page, { toques: DESLIGADO, crianca: fora, cam: olhar([7.5, 0.55, 3.0], 0, 0.3, 2.4, 1.6) });
    await foto(page, `cama-${v}-frente`, pasta);
    await tomada(page, { toques: DESLIGADO, crianca: { x: -8, z: 3.3, yaw: Math.PI, pose: 'sentada', assento: 0.49 }, cam: olhar([-8, 0.95, 3.4], 0.35, 0.22, 2.9, 2.4) });
    await foto(page, `sofa-${v}-sentada`, pasta);
    await tomada(page, { toques: DESLIGADO, crianca: fora, cam: olhar([-8, 0.5, 3.5], 0.35, 0.28, 2.8, 1.5) });
    await foto(page, `sofa-${v}`, pasta);
    await tomada(page, { toques: { ...DESLIGADO, tv: 1, canal: 1 }, crianca: fora, t: 1.8, cam: olhar([-10.5, 0.85, 1.0], 1.05, 0.2, 2.4, 1.9) });
    await foto(page, `tv-${v}`, pasta);
  }
  await page.evaluate(() => window.__moveis!.versao({ cama: 'a', sofa: 'a', tv: 'a' }));
}

// ------------------------------------------------------------------ provas
test('provas: as vistas para acertar as medidas', async ({ browser }) => {
  test.skip(!QUAL.includes('provas'), 'só com ESBOCO_039=provas');
  test.setTimeout(900_000);
  const page = await abrirPalco(browser, 'pc');
  const pasta = `${PASTA}/provas`;
  await tomada(page, { toques: toquesDoComodo(false), crianca: COMODOS.sala.crianca, cam: olhar([0.5, 0.9, 1.0], 0, 0.4, 26, 5) });
  await foto(page, 'casa', pasta);
  await comodos(page, pasta, 8.4);
  await toques(page, pasta);
  await versoes(page, pasta);
  // de costas e de lado (a geladeira aberta e o guarda-roupa aberto)
  await tomada(page, { toques: { ...DESLIGADO, guarda: 1 }, crianca: { x: 0, z: -2, yaw: 0, pose: 'fora' }, cam: olhar([11, 1.0, 3.3], -0.3, 0.2, 2.6, 2.3) });
  await foto(page, 'guarda-aberto', pasta);
  await tomada(page, { toques: { ...DESLIGADO, agua: true, carrinho: true }, crianca: { x: 0, z: -2, yaw: 0, pose: 'fora' }, t: 1, cam: olhar([-1.5, 1.0, 3.4], 0.2, 0.5, 1.6, 1.4) });
  await foto(page, 'pia-agua', pasta);
  await tomada(page, { toques: { ...DESLIGADO, carrinho: true }, crianca: { x: 0, z: -2, yaw: 0, pose: 'fora' }, t: 1, cam: olhar([-7.5, 0.1, 1.0], 0.1, 0.9, 3.3, 2.2) });
  await foto(page, 'tapete', pasta);
  console.log(`CUSTO ${JSON.stringify(await page.evaluate(() => window.__moveis!.custo()))}`);
  await page.context().close();
});

// ------------------------------------------------------------------ o celular em pé
test('celular em pé: os cômodos, as versões, os toques e a prancha', async ({ browser }) => {
  test.skip(!QUAL.includes('empe'), 'só com ESBOCO_039=empe');
  test.setTimeout(2_400_000);
  estreita = 0.72;
  const page = await abrirPalco(browser, 'empe');
  const pasta = `${PASTA}/empe`;
  await comodos(page, pasta, 6.4);
  passo('cômodos');
  await versoes(page, pasta);
  passo('versões');
  await toques(page, pasta);
  passo('toques');
  await tomada(page, { toques: { ...DESLIGADO, guarda: 1 }, crianca: { x: 0, z: -2, yaw: 0, pose: 'fora' }, cam: olhar([11, 1.0, 3.3], -0.3, 0.2, 2.6, 2.3) });
  await foto(page, 'toque-guarda-roupa', pasta);
  await tomada(page, { toques: { ...DESLIGADO, agua: true }, crianca: { x: 0, z: -2, yaw: 0, pose: 'fora' }, t: 1, cam: olhar([-1.5, 1.0, 3.4], 0.2, 0.5, 1.6, 1.4) });
  await foto(page, 'toque-pia', pasta);
  await tomada(page, { toques: { ...DESLIGADO, carrinho: true }, crianca: { x: 0, z: -2, yaw: 0, pose: 'fora' }, t: 1, cam: olhar([-7.5, 0.1, 1.0], 0.1, 0.9, 3.3, 2.2) });
  await foto(page, 'toque-tapete', pasta);
  // o custo de cada móvel, com tudo ligado (o pior caso)
  const custo = await page.evaluate(() => {
    const m = window.__moveis!;
    m.tocar({ tv: 1, geladeira: 1, som: true, fogao: true, abajur: true, lua: true, agua: true, pratos: true, guarda: 1, carrinho: true });
    m.tempo(0.8);
    return m.custo();
  });
  writeFileSync(`${PASTA}/custo.json`, JSON.stringify(custo, null, 1));
  await prancha(page);
  await page.context().close();
});

// ------------------------------------------------------------------ o celular deitado e o computador
for (const tamanho of ['deitado', 'pc'] as const)
  test(`${tamanho}: a casa inteira, os cômodos de dia e de noite, de dentro e os toques`, async ({ browser }) => {
    test.skip(!QUAL.includes(tamanho), `só com ESBOCO_039=${tamanho}`);
    test.setTimeout(1_800_000);
    const page = await abrirPalco(browser, tamanho);
    const pasta = `${PASTA}/${tamanho === 'pc' ? 'computador' : 'deitado'}`;
    for (const [hora, h] of [
      ['dia', DIA],
      ['noite', NOITE],
    ] as const) {
      await tomada(page, { hora: h, toques: toquesDoComodo(hora === 'noite'), crianca: COMODOS.quarto.crianca, cam: olhar([0.5, 0.9, 1.2], 0, 0.42, 25.5, 4.5) });
      await foto(page, `casa-${hora}`, pasta);
    }
    await comodos(page, pasta, 8.6);
    await toques(page, pasta);
    await page.context().close();
  });

// ------------------------------------------------------------------ a prancha
async function prancha(page: Page) {
  void page;
  const img = (n: string) => `data:image/jpeg;base64,${readFileSync(`${PASTA}/empe/${n}.jpg`, 'base64')}`;
  const cartao = (arq: string, titulo: string, sub: string, rec = false) =>
    `<figure class="${rec ? 'rec' : ''}">${rec ? '<div class="selo">recomendada</div>' : ''}<img src="${img(arq)}">
      <figcaption><b>${titulo}</b><span>${sub}</span></figcaption></figure>`;
  const quadro = (arq: string, legenda: string) =>
    `<figure class="seq"><img src="${img(arq)}"><figcaption><span>${legenda}</span></figcaption></figure>`;
  const linha = (xs: string[]) => `<div class="linha">${xs.join('')}</div>`;
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
    body { margin: 0; background: #fbf6ec; font-family: system-ui, sans-serif; color: #3a2f4a; width: 1080px; }
    h1 { margin: 26px 30px 2px; font-size: 40px; }
    h2 { margin: 30px 30px 10px; font-size: 32px; }
    p.sub { margin: 0 30px 10px; font-size: 22px; color: #6a5d7a; }
    .linha { display: flex; gap: 14px; padding: 0 30px; margin-bottom: 12px; }
    figure { position: relative; margin: 0; flex: 1; background: #fff; border-radius: 22px; padding: 10px; box-shadow: 0 3px 10px rgba(60,40,80,.12); border: 4px solid transparent; }
    figure.rec { border-color: #f2b632; }
    figure.seq { padding: 6px; border-radius: 16px; border-width: 2px; }
    figure img { width: 100%; border-radius: 14px; display: block; }
    figcaption { display: flex; flex-direction: column; gap: 4px; padding: 10px 6px 4px; }
    figcaption b { font-size: 26px; }
    figcaption span { font-size: 21px; color: #6a5d7a; }
    figure.seq figcaption span { font-size: 19px; }
    .selo { position: absolute; z-index: 2; left: 20px; top: 20px; background: #f2b632; color: #3a2a00; font-weight: 700; font-size: 20px; padding: 6px 14px; border-radius: 999px; }
  </style></head><body>
    <h1>039 · Móveis e utensílios</h1>
    <p class="sub">Esboço para escolher. A recomendada tem a borda dourada. A casinha está sem teto e sem a parede da frente, como uma casa de bonecas, só para ver os móveis.</p>
    <h2>1. Os três cômodos</h2><p class="sub">A sala, a cozinha e o quarto, de dia e de noite.</p>
    ${linha([quadro('sala-dia', 'sala de dia'), quadro('cozinha-dia', 'cozinha de dia'), quadro('quarto-dia', 'quarto de dia')])}
    ${linha([quadro('sala-noite', 'sala de noite'), quadro('cozinha-noite', 'cozinha de noite'), quadro('quarto-noite', 'quarto de noite')])}
    <h2>2. De dentro (primeira pessoa)</h2>
    ${linha([quadro('sala-dentro-dia', 'sala'), quadro('cozinha-dentro-dia', 'cozinha'), quadro('quarto-dentro-noite', 'quarto de noite')])}
    <h2>3. A cama nova (dois blocos)</h2><p class="sub">Com a cara do ícone da barra; a criança deitada debaixo do cobertor.</p>
    ${linha([cartao('cama-a', 'Cama do ícone', 'madeira, cobertor vermelho de retalhos', true), cartao('cama-b', 'Cama de estrelas', 'azul, cabeceira de montinhos')])}
    ${linha([cartao('cama-a-deitada', 'Cama do ícone', 'deitada', true), cartao('cama-b-deitada', 'Cama de estrelas', 'deitada')])}
    <h2>4. O sofá</h2>
    ${linha([cartao('sofa-a-sentada', 'Sofá gordinho', 'coral, de almofadas e rolos', true), cartao('sofa-b-sentada', 'Sofá de blocos', 'menta, baixo, capitonê')])}
    <h2>5. A TV</h2>
    ${linha([cartao('tv-a', 'TV de rack', 'tela larga de moldura azul', true), cartao('tv-b', 'TV de pezinhos', 'caixote manteiga, um bloco')])}
    <h2>6. Os toques</h2><p class="sub">Um toque e o móvel faz uma coisa só, sem texto.</p>
    <p class="sub"><b>A TV liga</b> (a luz abre do meio e o desenho aparece; outro toque troca o desenho)</p>
    ${linha([quadro('toque-tv-1-desligada', '1'), quadro('toque-tv-2-ligando', '2'), quadro('toque-tv-3-ligando', '3'), quadro('toque-tv-4-ligada', '4')])}
    <p class="sub"><b>A geladeira abre</b> (a luz de dentro acende e aparece a comidinha)</p>
    ${linha([quadro('toque-geladeira-1-fechada', '1'), quadro('toque-geladeira-2-abrindo', '2'), quadro('toque-geladeira-3-abrindo', '3'), quadro('toque-geladeira-4-aberta', '4')])}
    <p class="sub"><b>O som toca</b> (os alto-falantes pulam e as notinhas sobem)</p>
    ${linha([quadro('toque-som-1-parado', '1'), quadro('toque-som-2-tocando', '2'), quadro('toque-som-3-tocando', '3'), quadro('toque-som-4-tocando', '4')])}
    <p class="sub"><b>Deitar na cama</b> (de noite, a luminária de lua acende)</p>
    ${linha([quadro('toque-cama-1-em-pe', '1'), quadro('toque-cama-2-deitada', '2'), quadro('toque-cama-3-noite', '3')])}
    <p class="sub"><b>E os outros:</b> o fogão acende as bocas e a tampa pula, a pia abre a água, o guarda-roupa abre, o carrinho dá a volta no tapete</p>
    ${linha([quadro('toque-fogao-2-aceso', 'fogão'), quadro('toque-pia', 'pia'), quadro('toque-guarda-roupa', 'guarda-roupa'), quadro('toque-tapete', 'tapete')])}
    <div style="height:30px"></div>
  </body></html>`;
  const p2 = await page.context().browser()!.newPage({ viewport: { width: 1080, height: 800 } });
  await p2.setContent(html, { waitUntil: 'load' });
  await p2.screenshot({ path: `${PASTA}/00-prancha.jpg`, type: 'jpeg', quality: 84, fullPage: true });
  await p2.close();
  console.log('FOTO 00-prancha');
}
