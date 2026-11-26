import { test, type Browser, type Page } from '@playwright/test';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { comecarGravacao, pararGravacao } from './gravarCena';
import { assentar, criarMundo, TAMANHOS, type Tamanho } from './guia-palco';

/**
 * Fotos do esboço da spec 038 (Retoques e a moto dourada) com o motor de verdade: o palco de
 * `src/esboco/retoques.ts`, que só existe com `?esboco=retoques`. Só para o esboço, na placa:
 *
 *   E2E_ENV="-u 1000:1000 -e HOME=/tmp -e ESBOCO_038=empe,deitado,pc" scripts/e2e-gpu.sh \
 *     e2e/esboco-retoques.spec.ts --workers 2 --trace off
 *
 * - `provas`: as vistas de lado para acertar as medidas (não vão para o dono);
 * - `empe`: o celular em pé (todas as versões parada e andando, de dia e de noite, de fora e de
 *   dentro), a medida pé–pedal e a prancha;
 * - `deitado` e `pc`: o celular deitado e o computador, e os dois vídeos (no computador).
 *
 * As fotos vão para capturas-038/esboco/ (RETOQUES_PASTA muda).
 */
declare const process: { env: Record<string, string | undefined> };
const QUAL = (process.env.ESBOCO_038 ?? '').split(',').filter(Boolean);
test.skip(!QUAL.length, 'fotos do esboço da 038 só com ESBOCO_038');

type V3 = [number, number, number];
const PASTA = process.env.RETOQUES_PASTA ?? 'capturas-038/esboco';
const DIA = 0.42;
const NOITE = 0.96;
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
  dentro?: { olhar: number };
  raioX?: boolean;
}
type Item =
  | { tipo: 'moto'; versao: 'motoca' | 'triciclo' }
  | { tipo: 'pedal'; versao: 'bici' | 'carrinho'; antes?: boolean }
  | { tipo: 'tenis'; versao: 'hoje' | 'violeta' | 'noite' }
  | { tipo: 'camiseta'; versao: 'hoje' | 'bolinhas' | 'cavalinho' };

/** Cada versão do esboço, na ordem da prancha (a recomendada primeiro). */
const ITENS: Array<{ nome: string; item: Item }> = [
  { nome: 'moto-motoca', item: { tipo: 'moto', versao: 'motoca' } },
  { nome: 'moto-triciclo', item: { tipo: 'moto', versao: 'triciclo' } },
  { nome: 'pedal-bici-hoje', item: { tipo: 'pedal', versao: 'bici', antes: true } },
  { nome: 'pedal-bici', item: { tipo: 'pedal', versao: 'bici' } },
  { nome: 'pedal-carrinho-hoje', item: { tipo: 'pedal', versao: 'carrinho', antes: true } },
  { nome: 'pedal-carrinho', item: { tipo: 'pedal', versao: 'carrinho' } },
  { nome: 'tenis-hoje', item: { tipo: 'tenis', versao: 'hoje' } },
  { nome: 'tenis-violeta', item: { tipo: 'tenis', versao: 'violeta' } },
  { nome: 'tenis-noite', item: { tipo: 'tenis', versao: 'noite' } },
  { nome: 'camiseta-hoje', item: { tipo: 'camiseta', versao: 'hoje' } },
  { nome: 'camiseta-bolinhas', item: { tipo: 'camiseta', versao: 'bolinhas' } },
  { nome: 'camiseta-cavalinho', item: { tipo: 'camiseta', versao: 'cavalinho' } },
];
const SO = process.env.RETOQUES_SO?.split(',');
const escolhidos = () => ITENS.filter((i) => !SO || SO.some((s) => i.nome.startsWith(s)));

/** Os enquadres de cada tipo (celular em pé): de três-quartos, de lado, de perto e de dentro. */
const Q = {
  montado: { ang: 0.8, dist: 5.6, alt: 0.8, alvoY: 0.9, fov: 42 },
  montadoAndando: { ang: 0.62, dist: 5.8, alt: 1.0, alvoY: 0.9, fov: 44, segue: true },
  lado: { ang: Math.PI / 2, dist: 5.4, alt: 0.35, alvoY: 0.9, fov: 40 },
  ladoAndando: { ang: Math.PI / 2, dist: 5.4, alt: 0.35, alvoY: 0.9, fov: 40, segue: true },
  pes: { ang: Math.PI / 2, dist: 3.3, alt: 0.15, alvoY: 0.5, fov: 40, segue: true },
  pesRaioX: { ang: 1.0, dist: 3.4, alt: 1.3, alvoY: 0.4, fov: 40, segue: true, raioX: true },
  roupa: { ang: 0.55, dist: 5.4, alt: 0.6, alvoY: 0.95, fov: 42 },
  roupaAndando: { ang: 0.6, dist: 5.6, alt: 0.8, alvoY: 0.95, fov: 44, segue: true },
  tenis: { ang: 0.7, dist: 2.4, alt: 0.35, alvoY: 0.25, fov: 40 },
  camiseta: { ang: 0.25, dist: 2.9, alt: 0.1, alvoY: 0.85, fov: 40 },
  dentroMontado: { ang: 0, dist: 0, alt: 0, alvoY: 0, fov: 70, dentro: { olhar: 0.55 } },
  dentroRoupa: { ang: 0, dist: 0, alt: 0, alvoY: 0, fov: 70, dentro: { olhar: 1.25 } },
} satisfies Record<string, Enquadre>;
/** Os pés de perto: de lado na bicicletinha e na motoca; o carrinho de cima, com a lataria clarinha. */
const pesDe = (i: Item): Enquadre => (i.tipo === 'pedal' && i.versao === 'carrinho' ? Q.pesRaioX : Q.pes);

const montadoDe = (i: Item) => i.tipo === 'moto' || i.tipo === 'pedal';

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
  await criarMundo(page, 'retoques', 'vila-neon', {}, 1337);
  await page.goto(`/?mundo=retoques&esboco=retoques${tamanho === 'pc' ? '&escala=1' : ''}`);
  await page.waitForFunction(() => window.__brumaluz?.ready === true && !!window.__retoques, undefined, {
    timeout: 240_000,
  });
  await page.evaluate((h) => {
    document.querySelector<HTMLElement>('.entrada')?.setAttribute('hidden', '');
    const e = window.__brumaluz!;
    e.definirClima?.('limpo');
    window.__retoques!.hora(h);
    window.dispatchEvent(new Event('resize'));
  }, DIA);
  await assentar(page);
  const alvo = await page.evaluate(() => {
    const v = window.__brumaluz!.vila!()!;
    return [Math.round((v.plana.x0 + v.plana.x1) / 2), v.plana.z1 + 26] as const;
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
  const O = await page.evaluate(() => window.__retoques!.montar());
  console.log(`palco ${JSON.stringify(O)}`);
  await page.waitForTimeout(tamanho === 'pc' ? 20000 : 12000);
  await page.evaluate(() => window.__retoques!.esconder(true));
  // só o 3D na foto
  await page.evaluate(() => {
    const cena = document.getElementById('cena')!;
    for (const el of Array.from(document.body.querySelectorAll<HTMLElement>('*')))
      if (el !== cena && !el.contains(cena)) el.style.visibility = 'hidden';
  });
  passo(`montou ${tamanho}`);
  return page;
}

async function foto(page: Page, nome: string, pasta = PASTA) {
  mkdirSync(pasta, { recursive: true });
  await page.screenshot({ path: `${pasta}/${nome}.jpg`, type: 'jpeg', quality: 88 });
  console.log(`FOTO ${nome}`);
}

async function tomada(page: Page, item: Item, modo: 'parado' | 'andando', t: number, q: Enquadre, hora = DIA) {
  await page.evaluate(
    ({ item, modo, t, q, hora }) => {
      const r = window.__retoques!;
      r.hora(hora);
      r.mostrar(item as never);
      r.cena(modo, t, false);
      r.enquadrar(q);
    },
    { item, modo, t, q, hora },
  );
  await page.waitForTimeout(900);
}

// ------------------------------------------------------------------ provas (para acertar)
test('provas: as vistas de lado para acertar as medidas', async ({ browser }) => {
  test.skip(!QUAL.includes('provas'), 'só com ESBOCO_038=provas');
  test.setTimeout(900_000);
  const page = await abrirPalco(browser, 'empe');
  const pasta = `${PASTA}/provas`;
  for (const { nome, item } of escolhidos()) {
    if (montadoDe(item)) {
      await tomada(page, item, 'parado', 1.2, Q.lado);
      await foto(page, `${nome}-lado`, pasta);
      await tomada(page, item, 'parado', 1.2, Q.montado);
      await foto(page, `${nome}-tres-quartos`, pasta);
      await tomada(page, item, 'andando', 2.4, pesDe(item));
      await foto(page, `${nome}-pes`, pasta);
      await tomada(page, item, 'parado', 1.2, Q.dentroMontado);
      await foto(page, `${nome}-dentro`, pasta);
    } else {
      await tomada(page, item, 'parado', 1.2, Q.roupa);
      await foto(page, `${nome}`, pasta);
      await tomada(page, item, 'parado', 1.2, item.tipo === 'tenis' ? Q.tenis : Q.camiseta);
      await foto(page, `${nome}-perto`, pasta);
    }
  }
  const medidas = [];
  for (const { item } of escolhidos())
    if (item.tipo === 'pedal' || (item.tipo === 'moto' && item.versao === 'triciclo')) {
      const m = await page.evaluate((item) => {
        window.__retoques!.mostrar(item as never);
        const r = window.__retoques!.medirPedal(72);
        return r && { item: r.item, E: r.E, D: r.D };
      }, item);
      medidas.push(m);
    }
  console.log(`MEDIDAS ${JSON.stringify(medidas)}`);
  await page.context().close();
});

// ------------------------------------------------------------------ o celular em pé
test('celular em pé: cada versão parada e andando, de dia e de noite, de fora e de dentro', async ({ browser }) => {
  test.skip(!QUAL.includes('empe'), 'só com ESBOCO_038=empe');
  test.setTimeout(2_400_000);
  const page = await abrirPalco(browser, 'empe');
  const pasta = `${PASTA}/empe`;
  for (const { nome, item } of escolhidos()) {
    const m = montadoDe(item);
    const hoje = (item.tipo === 'pedal' && item.antes) || ((item.tipo === 'tenis' || item.tipo === 'camiseta') && item.versao === 'hoje');
    for (const [hora, h] of [
      ['dia', DIA],
      ['noite', NOITE],
    ] as const) {
      if (hoje && hora === 'noite') continue;
      await tomada(page, item, 'parado', 1.6, m ? Q.montado : Q.roupa, h);
      await foto(page, `${nome}-parado-${hora}`, pasta);
      await tomada(page, item, 'andando', 2.6, m ? Q.montadoAndando : Q.roupaAndando, h);
      await foto(page, `${nome}-andando-${hora}`, pasta);
    }
    if (m) {
      await tomada(page, item, 'andando', 2.6, Q.ladoAndando);
      await foto(page, `${nome}-andando-lado-dia`, pasta);
      if (item.tipo === 'pedal' || item.versao === 'triciclo') {
        await tomada(page, item, 'andando', 2.6, pesDe(item));
        await foto(page, `${nome}-pes-dia`, pasta);
      }
      if (!hoje) {
        await tomada(page, item, 'parado', 1.6, Q.dentroMontado);
        await foto(page, `${nome}-dentro-dia`, pasta);
      }
    } else {
      await tomada(page, item, 'parado', 1.6, item.tipo === 'tenis' ? Q.tenis : Q.camiseta);
      await foto(page, `${nome}-perto-dia`, pasta);
      if (!hoje) {
        await tomada(page, item, 'parado', 1.6, item.tipo === 'tenis' ? Q.tenis : Q.camiseta, NOITE);
        await foto(page, `${nome}-perto-noite`, pasta);
      }
      await tomada(page, item, 'parado', 1.6, Q.dentroRoupa);
      await foto(page, `${nome}-dentro-dia`, pasta);
    }
  }
  passo('fotos em pé');
  // a medida pé–pedal de uma volta inteira (72 amostras), hoje e com o joelho
  const medidas: unknown[] = [];
  for (const { item } of escolhidos())
    if (item.tipo === 'pedal' || (item.tipo === 'moto' && item.versao === 'triciclo')) {
      const r = await page.evaluate((item) => {
        window.__retoques!.mostrar(item as never);
        return window.__retoques!.medirPedal(72);
      }, item);
      if (r) medidas.push(r);
    }
  if (medidas.length) writeFileSync(`${PASTA}/medida-pe-pedal.json`, JSON.stringify(medidas, null, 1));
  passo('medida');
  if (!SO) await prancha(page);
  await page.context().close();
});

// ------------------------------------------------------------------ o celular deitado e o computador
for (const tamanho of ['deitado', 'pc'] as const)
  test(`${tamanho}: cada versão andando de dia e parada de noite${tamanho === 'pc' ? ', e os vídeos' : ''}`, async ({ browser }) => {
    test.skip(!QUAL.includes(tamanho), `só com ESBOCO_038=${tamanho}`);
    test.setTimeout(1_800_000);
    const page = await abrirPalco(browser, tamanho);
    const pasta = `${PASTA}/${tamanho === 'pc' ? 'computador' : 'deitado'}`;
    const longe = (q: Enquadre): Enquadre => ({ ...q, dist: q.dist * 0.85, fov: q.fov * 0.8 });
    for (const { nome, item } of escolhidos()) {
      const hoje = (item.tipo === 'pedal' && item.antes) || ((item.tipo === 'tenis' || item.tipo === 'camiseta') && item.versao === 'hoje');
      if (hoje) continue;
      const m = montadoDe(item);
      await tomada(page, item, 'andando', 2.6, longe(m ? Q.montadoAndando : Q.roupaAndando));
      await foto(page, `${nome}-andando-dia`, pasta);
      await tomada(page, item, 'parado', 1.6, longe(m ? Q.montado : Q.roupa), NOITE);
      await foto(page, `${nome}-parado-noite`, pasta);
      await tomada(page, item, 'parado', 1.6, m ? Q.dentroMontado : Q.dentroRoupa);
      await foto(page, `${nome}-dentro-dia`, pasta);
    }
    passo(`fotos ${tamanho}`);
    if (tamanho !== 'pc' || SO) {
      await page.context().close();
      return;
    }
    // os vídeos: a moto andando (as duas versões) e os pés pedalando (de lado, de perto)
    const filmar = async (arquivo: string, trechos: Array<{ item: Item; q: Enquadre; s: number; hora?: number }>) => {
      await comecarGravacao(page);
      for (const tr of trechos) {
        await page.evaluate(
          ({ item, q, hora }) => {
            const r = window.__retoques!;
            r.hora(hora);
            r.mostrar(item as never);
            r.cena('andando', 0.5, true);
            r.enquadrar(q);
          },
          { item: tr.item, q: tr.q, hora: tr.hora ?? DIA },
        );
        await page.waitForTimeout(tr.s * 1000);
      }
      await pararGravacao(page, `${PASTA}/${arquivo}`);
      console.log(`VIDEO ${arquivo}`);
    };
    const video = { ang: 0.7, dist: 4.4, alt: 0.9, alvoY: 0.7, fov: 40, segue: true };
    await filmar('video-moto-andando.webm', [
      { item: { tipo: 'moto', versao: 'motoca' }, q: video, s: 6 },
      { item: { tipo: 'moto', versao: 'motoca' }, q: { ...Q.ladoAndando, fov: 34 }, s: 3 },
      { item: { tipo: 'moto', versao: 'triciclo' }, q: video, s: 6 },
      { item: { tipo: 'moto', versao: 'triciclo' }, q: { ...Q.ladoAndando, fov: 34 }, s: 3 },
      { item: { tipo: 'moto', versao: 'motoca' }, q: video, s: 4, hora: NOITE },
    ]);
    const pes = { ...Q.pes, dist: 2.6, fov: 36 };
    await filmar('video-pes-pedalando.webm', [
      { item: { tipo: 'pedal', versao: 'bici', antes: true }, q: pes, s: 4 },
      { item: { tipo: 'pedal', versao: 'bici' }, q: pes, s: 5 },
      { item: { tipo: 'pedal', versao: 'carrinho', antes: true }, q: { ...Q.pesRaioX, raioX: false }, s: 4 },
      { item: { tipo: 'pedal', versao: 'carrinho' }, q: Q.pesRaioX, s: 5 },
      { item: { tipo: 'moto', versao: 'triciclo' }, q: pes, s: 4 },
    ]);
    passo('vídeos');
    await page.context().close();
  });

// ------------------------------------------------------------------ a prancha
/**
 * A prancha para o dono escolher pelo celular: uma imagem comprida, um item por faixa, as versões
 * lado a lado (a recomendada primeiro), com o nome, o preço proposto (só a moto) e uma linha do
 * porquê.
 */
async function prancha(page: Page) {
  const v = await page.evaluate(() => window.__retoques!.versoes);
  const img = (n: string) => `data:image/jpeg;base64,${readFileSync(`${PASTA}/empe/${n}.jpg`, 'base64')}`;
  const cartao = (arq: string, titulo: string, sub: string, rec = false, extra = '') =>
    `<figure class="${rec ? 'rec' : ''}">${rec ? '<div class="selo">recomendada</div>' : ''}<img src="${img(arq)}">${extra ? `<img class="mini" src="${img(extra)}">` : ''}
      <figcaption><b>${titulo}</b><span>${sub}</span></figcaption></figure>`;
  const motos = v.motos
    .map((m, i) => cartao(`moto-${m.id}-parado-dia`, m.nome, `${m.preco} moedinhas (proposta)`, i === 0, `moto-${m.id}-andando-noite`))
    .join('');
  const tenis = v.tenis
    .map((t, i) => cartao(`tenis-${t.id}-perto-dia`, t.nome, i === 0 ? 'como está hoje' : '20 moedinhas, o mesmo preço', i === 1))
    .join('');
  const cam = v.camisetas
    .map((c, i) => cartao(`camiseta-${c.id}-perto-dia`, c.nome, i === 0 ? 'como está hoje' : '15 moedinhas, o mesmo preço', i === 1))
    .join('');
  const pedal = [
    cartao('pedal-bici-hoje-pes-dia', 'Bicicletinha hoje', 'o pé passa longe do pedal'),
    cartao('pedal-bici-pes-dia', 'Bicicletinha nova', 'o pé encosta no pedal', true),
    cartao('pedal-carrinho-hoje-andando-dia', 'Carrinho hoje', 'os sapatos saem pelo capô'),
    cartao('pedal-carrinho-pes-dia', 'Carrinho novo', 'os pés nos pedais, embaixo do painel', true),
  ].join('');
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
    body { margin: 0; background: #fbf6ec; font-family: system-ui, sans-serif; color: #3a2f4a; width: 1080px; }
    h1 { margin: 26px 30px 2px; font-size: 40px; }
    h2 { margin: 30px 30px 10px; font-size: 32px; }
    p.sub { margin: 0 30px 8px; font-size: 22px; color: #6a5d7a; }
    .linha { display: flex; gap: 16px; padding: 0 30px; }
    figure { position: relative; margin: 0; flex: 1; background: #fff; border-radius: 22px; padding: 10px; box-shadow: 0 3px 10px rgba(60,40,80,.12); border: 4px solid transparent; }
    figure.rec { border-color: #f2b632; }
    figure img { width: 100%; border-radius: 14px; display: block; }
    figure img.mini { position: absolute; right: 18px; top: 18px; width: 34%; border: 3px solid #fff; box-shadow: 0 2px 8px rgba(0,0,0,.25); }
    figcaption { display: flex; flex-direction: column; gap: 4px; padding: 10px 6px 4px; }
    figcaption b { font-size: 26px; }
    figcaption span { font-size: 21px; color: #6a5d7a; }
    .selo { position: absolute; z-index: 2; left: 20px; top: 20px; background: #f2b632; color: #3a2a00; font-weight: 700; font-size: 20px; padding: 6px 14px; border-radius: 999px; }
  </style></head><body>
    <h1>038 · Retoques e a moto dourada</h1>
    <p class="sub">Esboço para escolher. A recomendada tem a borda dourada.</p>
    <h2>1. A moto dourada</h2><p class="sub">De dia; no cantinho, andando de noite. O preço é proposta.</p>
    <div class="linha">${motos}</div>
    <h2>2. A camiseta de aquário</h2><p class="sub">Quem já comprou continua com ela; só muda o desenho.</p>
    <div class="linha">${cam}</div>
    <h2>3. O tênis de 20 moedinhas</h2><p class="sub">Sem arco-íris: duas cores só.</p>
    <div class="linha">${tenis}</div>
    <h2>4. Os pés no pedal</h2><p class="sub">Hoje e com o joelho dobrando, o pé acompanhando o pedal.</p>
    <div class="linha">${pedal}</div>
    <div style="height:30px"></div>
  </body></html>`;
  const p2 = await page.context().browser()!.newPage({ viewport: { width: 1080, height: 800 } });
  await p2.setContent(html, { waitUntil: 'load' });
  await p2.screenshot({ path: `${PASTA}/00-prancha.jpg`, type: 'jpeg', quality: 86, fullPage: true });
  await p2.close();
  console.log('FOTO 00-prancha');
}
