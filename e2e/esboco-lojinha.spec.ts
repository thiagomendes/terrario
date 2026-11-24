import { test, type Browser, type Page } from '@playwright/test';
import { mkdirSync, readFileSync } from 'node:fs';
import { comecarGravacao, pararGravacao } from './gravarCena';
import { criarMundo, TAMANHOS, type Tamanho } from './guia-palco';

/**
 * Fotos do esboço da spec 036 (Lojinha maior) com o motor de verdade: o palco de
 * `src/esboco/lojinha.ts`, que só existe com `?esboco=lojinha`. Só para o esboço: roda com
 * ESBOCO_036=1, na placa de vídeo:
 *
 *   E2E_ENV="-u 1000:1000 -e HOME=/tmp -e ESBOCO_036=1" scripts/e2e-gpu.sh \
 *     e2e/esboco-lojinha.spec.ts --workers 2 --trace off
 *
 * As fotos vão para capturas-036/esboco/ (LOJINHA_PASTA muda). LOJINHA_SO=patinete,coroa tira
 * só esses; LOJINHA_YAW gira a criança parada (rad).
 */
declare const process: { env: Record<string, string | undefined> };
test.skip(!process.env.ESBOCO_036, 'fotos do esboço só com ESBOCO_036');

type V3 = [number, number, number];
const PASTA = process.env.LOJINHA_PASTA ?? 'capturas-036/esboco';
const SO = process.env.LOJINHA_SO?.split(',');
const YAW = Number(process.env.LOJINHA_YAW ?? 0);
const DIA = 0.42;
const T0 = Date.now();
const passo = (o: string) => console.log(`PASSO ${((Date.now() - T0) / 1000).toFixed(0)} s ${o}`);

interface Enquadre {
  ang: number;
  dist: number;
  alt: number;
  alvoY: number;
  fov: number;
  lado?: number;
  frente?: number;
  segue?: boolean;
  entreBicho?: boolean;
}
interface Cand {
  rodada?: number;
  numero: number;
  id: string;
  tipo: string;
  nome: string;
  preco: number;
  efeito: string;
}

/** A foto principal de cada tipo: de três-quartos, perto (celular em pé). */
const PRINCIPAL: Record<string, Enquadre> = {
  andar: { ang: 0.8, dist: 4.7, alt: 0.65, alvoY: 0.85, fov: 42 },
  bicho: { ang: 0.55, dist: 4.9, alt: 0.7, alvoY: 0.7, fov: 42, lado: 0.42, frente: 0.28 },
  passarinho: { ang: 0.75, dist: 3.7, alt: 0.35, alvoY: 1.15, fov: 40, lado: 0.2 },
  chapeu: { ang: 0.6, dist: 3.7, alt: 0.45, alvoY: 1.3, fov: 40 },
  nuvem: { ang: 0.8, dist: 5.0, alt: 0.65, alvoY: 1.0, fov: 42 },
  roupa: { ang: 0.55, dist: 4.5, alt: 0.5, alvoY: 0.9, fov: 42 },
  // (quase de frente: as duas asas aparecem dos dois lados)
  borboleta: { ang: 0.22, dist: 4.7, alt: 0.5, alvoY: 0.95, fov: 42 },
  foguete: { ang: 2.0, dist: 4.4, alt: 0.5, alvoY: 0.9, fov: 42 },
  mao: { ang: 0.6, dist: 4.6, alt: 0.35, alvoY: 1.15, fov: 44 },
  // rodada 2
  oculos: { ang: 0.5, dist: 3.0, alt: 0.25, alvoY: 1.35, fov: 40 },
  guardachuva: { ang: 0.6, dist: 5.2, alt: 0.45, alvoY: 1.3, fov: 42 },
  pipa: { ang: 0.35, dist: 6.4, alt: 0.3, alvoY: 1.75, fov: 44 },
};
/** Rodada 2: o rastro de florzinhas só aparece andando (a foto principal dele é andando). */
const RASTRO: Enquadre = { ang: 0.85, dist: 7.0, alt: 1.6, alvoY: 0.6, fov: 44, frente: -0.5, segue: true };
const RODADA = process.env.LOJINHA_RODADA === '2' ? 2 : 1;
const enquadreDe = (c: Cand): Enquadre => PRINCIPAL[c.id] ?? PRINCIPAL[c.tipo];

/** Em movimento: a câmera acompanha a criança no caminho (de três-quartos pela frente). */
const MOVIMENTO: Record<string, Enquadre> = {
  andar: { ang: 0.6, dist: 5.0, alt: 0.85, alvoY: 0.8, fov: 44, segue: true },
  bicho: { ang: 0.3, dist: 6.6, alt: 1.25, alvoY: 0.75, fov: 44, entreBicho: true, segue: true },
  passarinho: { ang: 0.7, dist: 3.3, alt: 0.35, alvoY: 1.15, fov: 42, lado: 0.15, segue: true },
};
/** No vídeo (computador, deitado): mais aberto, para ver o bichinho e o caminho. */
const VIDEO: Record<string, Enquadre> = {
  andar: { ang: 0.65, dist: 5.2, alt: 1.0, alvoY: 0.8, fov: 40, segue: true },
  bicho: { ang: 0.6, dist: 5.6, alt: 1.3, alvoY: 0.65, fov: 40, entreBicho: true, segue: true },
  passarinho: { ang: 0.7, dist: 3.6, alt: 0.5, alvoY: 1.15, fov: 40, lado: 0.1, segue: true },
};

async function assentar(page: Page, minimo = 12) {
  let antes = -1;
  for (let i = 0; i < 40; i++) {
    await page.waitForTimeout(1500);
    const n = await page.evaluate(() => window.__brumaluz!.chunksCarregados ?? 0);
    if (n === antes && n >= minimo) break;
    antes = n;
  }
}

async function abrirPalco(browser: Browser, tamanho: Tamanho): Promise<Page> {
  const ctx = await browser.newContext(TAMANHOS[tamanho]);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log(`erro na página: ${String(e)}`));
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
  await criarMundo(page, 'lojinha', 'vila-neon', {}, 1337);
  await page.goto(`/?mundo=lojinha&esboco=lojinha${tamanho === 'pc' ? '&escala=1' : ''}`);
  await page.waitForFunction(() => window.__brumaluz?.ready === true && !!window.__lojinha, undefined, {
    timeout: 240_000,
  });
  await page.evaluate((h) => {
    document.querySelector<HTMLElement>('.entrada')?.setAttribute('hidden', '');
    const e = window.__brumaluz!;
    e.definirClima?.('limpo');
    window.__lojinha!.hora(h);
    window.dispatchEvent(new Event('resize'));
  }, DIA);
  await assentar(page);
  // o palco: ao sul do bairro da Vila Neon, com as casas lá atrás
  const alvo = await page.evaluate(() => {
    const v = window.__brumaluz!.vila!()!;
    return [Math.round((v.plana.x0 + v.plana.x1) / 2), v.plana.z1 + 26] as const;
  });
  await page.evaluate(([x, z]) => window.__brumaluz!.teleportar!(x + 0.5, z + 0.5), alvo);
  await assentar(page);
  // o chão em volta tem de ter chegado (coluna sem pedaço não seria aplainada)
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
  const O = await page.evaluate(() => window.__lojinha!.montar());
  console.log(`palco ${JSON.stringify(O)}`);
  await page.waitForTimeout(tamanho === 'pc' ? 20000 : 12000);
  await page.evaluate((y) => {
    window.__lojinha!.virar(y);
    window.__lojinha!.esconder(true);
  }, YAW);
  // só o 3D na foto
  await page.evaluate(() => {
    const cena = document.getElementById('cena')!;
    for (const el of Array.from(document.body.querySelectorAll<HTMLElement>('*')))
      if (el !== cena && !el.contains(cena)) el.style.visibility = 'hidden';
  });
  passo(`montou ${tamanho}`);
  return page;
}

const nomeArquivo = (c: Cand) => `${String(c.numero).padStart(2, '0')}-${c.id}`;

async function foto(page: Page, nome: string, pasta = PASTA) {
  mkdirSync(pasta, { recursive: true });
  await page.screenshot({ path: `${pasta}/${nome}.jpg`, type: 'jpeg', quality: 88 });
  console.log(`FOTO ${nome}`);
}

async function tomada(page: Page, id: string, modo: 'parado' | 'andando', t: number, q: Enquadre) {
  await page.evaluate(
    ({ id, modo, t, q }) => {
      const l = window.__lojinha!;
      l.vestir(id as never);
      l.cena(modo, t, false);
      l.enquadrar(q);
    },
    { id, modo, t, q },
  );
  await page.waitForTimeout(900);
}

test('esboço da Lojinha maior: as fotos de cada candidato (celular em pé)', async ({ browser }) => {
  test.skip(RODADA === 2, 'só a rodada 2');
  test.setTimeout(1_200_000);
  const page = await abrirPalco(browser, 'empe');
  const cands: Cand[] = (await page.evaluate((): Cand[] => [...window.__lojinha!.candidatos])).filter((c) => !c.rodada);
  for (const c of cands) {
    if (SO && !SO.includes(c.id)) continue;
    // a foto principal: parada, um instante depois (as bolhas e a fumacinha já saíram)
    await tomada(page, c.id, 'parado', 2.6, enquadreDe(c));
    await foto(page, nomeArquivo(c));
    if (process.env.LOJINHA_COSTAS) {
      // (só para conferir por trás: não vai para o dono)
      const q = enquadreDe(c);
      for (const [n, a] of [
        ['costas', Math.PI],
        ['frente', 0],
        ['direita', Math.PI / 2],
        ['esquerda', -Math.PI / 2],
      ] as const) {
        await tomada(page, c.id, 'parado', 2.6, { ...q, ang: a, lado: 0, frente: 0 });
        await foto(page, `99-${nomeArquivo(c)}-${n}`);
      }
    }
    if (c.tipo === 'andar' || c.tipo === 'bicho') {
      const q = c.id === 'passarinho' ? MOVIMENTO.passarinho : MOVIMENTO[c.tipo];
      await tomada(page, c.id, 'andando', c.tipo === 'andar' ? 2.2 : 3.4, q);
      await foto(page, `${nomeArquivo(c)}-andando`);
    }
  }
  if (!SO) await prancha(page, cands, PASTA, 'Lojinha maior: 16 candidatos', 'Para escolher 12. Preço fixo de cada um embaixo da foto.');
  passo('fotos');
  await page.context().close();
});

/**
 * Rodada 2 (24 nov): os 4 candidatos novos (17 a 20) para fechar os 12, a prancha só deles e o
 * passarinho refeito mais para fora no ombro. Pasta: capturas-036/esboco/rodada2.
 */
test('esboço da Lojinha maior, rodada 2: os 4 novos e o passarinho refeito', async ({ browser }) => {
  test.skip(RODADA !== 2, 'só com LOJINHA_RODADA=2');
  test.setTimeout(900_000);
  const pasta = `${PASTA}/rodada2`;
  const page = await abrirPalco(browser, 'empe');
  const todos: Cand[] = await page.evaluate((): Cand[] => [...window.__lojinha!.candidatos]);
  const novos = todos.filter((c) => c.rodada === 2);
  for (const c of novos) {
    if (SO && !SO.includes(c.id)) continue;
    if (c.id === 'florzinhas') await tomada(page, c.id, 'andando', 3.2, RASTRO);
    else await tomada(page, c.id, 'parado', 2.6, enquadreDe(c));
    await foto(page, nomeArquivo(c), pasta);
  }
  const pass = todos.find((c) => c.id === 'passarinho')!;
  if (!SO || SO.includes('passarinho')) {
    await tomada(page, pass.id, 'parado', 2.6, { ...enquadreDe(pass), ang: 0.45 });
    await foto(page, `${nomeArquivo(pass)}-refeito`, pasta);
    // de frente, para ver o vão entre o passarinho e a cabeça
    await tomada(page, pass.id, 'parado', 2.6, { ...enquadreDe(pass), ang: 0.15, lado: 0.1 });
    await foto(page, `${nomeArquivo(pass)}-refeito-frente`, pasta);
    await tomada(page, pass.id, 'andando', 3.4, MOVIMENTO.passarinho);
    await foto(page, `${nomeArquivo(pass)}-refeito-andando`, pasta);
  }
  if (!SO) await prancha(page, novos, pasta, 'Lojinha maior, rodada 2: 4 candidatos', 'Para escolher 2 e fechar os 12. Preço fixo de cada um embaixo da foto.');
  passo('rodada 2');
  await page.context().close();
});

/** A prancha: os candidatos lado a lado, numerados, com o nome e o preço (uma imagem só). */
async function prancha(page: Page, cands: Cand[], pasta: string, titulo: string, sub: string) {
  const cel = cands
    .map((c) => {
      const b64 = readFileSync(`${pasta}/${nomeArquivo(c)}.jpg`, 'base64');
      return `<figure><div class="num">${c.numero}</div><img src="data:image/jpeg;base64,${b64}">
        <figcaption><b>${c.nome}</b><span>${c.preco} moedinhas</span></figcaption></figure>`;
    })
    .join('');
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
    body { margin: 0; background: #fbf6ec; font-family: system-ui, sans-serif; color: #3a2f4a; }
    h1 { margin: 22px 28px 4px; font-size: 30px; }
    p { margin: 0 28px 16px; font-size: 18px; color: #6a5d7a; }
    .grade { display: grid; grid-template-columns: repeat(4, 300px); gap: 18px; padding: 0 28px 28px; }
    figure { margin: 0; position: relative; background: #fff; border-radius: 18px; overflow: hidden;
      box-shadow: 0 3px 0 rgba(0,0,0,0.06), 0 6px 16px rgba(60,40,90,0.12); }
    img { display: block; width: 300px; height: 470px; object-fit: cover; object-position: 50% 30%; }
    .num { position: absolute; left: 10px; top: 10px; width: 46px; height: 46px; border-radius: 50%;
      background: #ffcf3a; color: #3a2f4a; font-weight: 800; font-size: 26px; display: grid; place-items: center;
      box-shadow: 0 2px 0 rgba(0,0,0,0.15); }
    figcaption { padding: 10px 14px 12px; display: flex; flex-direction: column; gap: 2px; }
    figcaption b { font-size: 20px; }
    figcaption span { font-size: 16px; color: #8a6a1a; font-weight: 700; }
  </style></head><body><h1>${titulo}</h1>
  <p>${sub}</p><div class="grade">${cel}</div></body></html>`;
  const ctx = await page.context().browser()!.newContext({ viewport: { width: 1338, height: 900 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  await p.setContent(html);
  await p.waitForTimeout(500);
  await p.screenshot({ path: `${pasta}/00-prancha.jpg`, type: 'jpeg', quality: 90, fullPage: true });
  console.log('FOTO 00-prancha');
  await ctx.close();
}

test('esboço da Lojinha maior: o vídeo dos de andar e dos bichinhos (computador)', async ({ browser }) => {
  test.skip(!!SO || !!process.env.LOJINHA_SEM_VIDEO || RODADA === 2, 'só as fotos');
  test.setTimeout(900_000);
  const page = await abrirPalco(browser, 'pc');
  const cands = (await page.evaluate((): Cand[] => [...window.__lojinha!.candidatos])).filter(
    (c) => c.tipo === 'andar' || c.tipo === 'bicho',
  );
  mkdirSync(`${PASTA}/videos`, { recursive: true });
  const roteiro: string[] = [];
  // cada um ~4,4 s no caminho; a gravação é uma só, do primeiro ao último
  await page.evaluate((q) => {
    const l = window.__lojinha!;
    l.vestir('patinete');
    l.cena('andando', 0.4, false);
    l.enquadrar(q);
  }, VIDEO.andar);
  await page.waitForTimeout(1500);
  await comecarGravacao(page);
  const t0 = Date.now();
  for (const c of cands) {
    const q = c.id === 'passarinho' ? VIDEO.passarinho : VIDEO[c.tipo];
    roteiro.push(`${((Date.now() - t0) / 1000).toFixed(1)} s: ${c.numero} ${c.nome}`);
    await page.evaluate(
      ({ id, q }) => {
        const l = window.__lojinha!;
        l.vestir(id as never);
        l.cena('andando', 0.4, true);
        l.enquadrar(q);
      },
      { id: c.id, q },
    );
    await page.waitForTimeout(4400);
  }
  await pararGravacao(page, `${PASTA}/videos/lojinha.webm`);
  console.log(`ROTEIRO\n${roteiro.join('\n')}`);
  passo('vídeo');
  await page.context().close();
});

export type { V3 };
