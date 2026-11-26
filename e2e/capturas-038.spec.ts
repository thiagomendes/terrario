import { test, type Browser, type Page } from '@playwright/test';
import { mkdirSync, readFileSync } from 'node:fs';
import { assentar, criarMundo, TAMANHOS, type Tamanho } from './guia-palco';

/**
 * Spec 038 (Retoques e a moto dourada): as fotos das fases do artista, no jogo de verdade, num
 * gramado aplainado ao sul do bairro da Vila Neon. Só com CAPTURAS_038, na placa de vídeo:
 *
 *   E2E_ENV="-u 1000:1000 -e HOME=/tmp -e CAPTURAS_038=t02" \
 *     scripts/e2e-gpu.sh e2e/capturas-038.spec.ts --workers 1 --trace off
 *
 * - `t02`: os pés no pedal (de lado, pedalando, numa matriz de roupas e fantasias; o joelho de
 *   perto; as sequências de fotos da bicicletinha e do carrinho pedalando) e a bandeirinha (a
 *   sequência do carrinho andando). Os vídeos ficam como sequências de fotos (o mp4 do navegador
 *   de teste não abriu no celular do dono).
 */
declare const process: { env: Record<string, string | undefined> };
const QUAL = (process.env.CAPTURAS_038 ?? '').split(',').filter(Boolean);
test.skip(!QUAL.length, 'fotos da 038 só com CAPTURAS_038');
test.describe.configure({ mode: 'parallel' });

type V3 = [number, number, number];
const DIA = 0.42;
const NOITE = 0.96;
const MENINA = { corpo: 'feminino', cabeloEstilo: 5, rosto: 1, cabeloCor: 1, pele: 1, roupaEstilo: 6 };
const MENINO = { corpo: 'masculino', cabeloEstilo: 0, rosto: 0, cabeloCor: 0, pele: 2, roupaEstilo: 0 };

/** Abre um mundo criativo da Vila Neon e aplaina um gramado ao sul do bairro. */
async function abrirGramado(browser: Browser, tamanho: Tamanho): Promise<{ page: Page; O: V3 }> {
  const ctx = await browser.newContext(TAMANHOS[tamanho]);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log(`erro na página: ${String(e)}`));
  await page.addInitScript(() => {
    try {
      localStorage.setItem('terrario:config', JSON.stringify({ distancia: 5, mostrarFps: false, qualidade: 'alta', mostrarAtalhos: false }));
    } catch {
      // sem armazenamento
    }
  });
  await criarMundo(page, 'capturas-038', 'vila-neon', {}, 1337);
  await page.goto(`/?mundo=capturas-038${tamanho === 'pc' ? '&escala=1' : ''}`);
  await page.waitForFunction(() => window.__brumaluz?.ready === true, undefined, { timeout: 240_000 });
  await page.evaluate((h) => {
    document.querySelector<HTMLElement>('.entrada')?.setAttribute('hidden', '');
    const e = window.__brumaluz!;
    e.pausarDia = true;
    e.hora = h;
    e.definirClima?.('limpo');
    window.dispatchEvent(new Event('resize'));
  }, DIA);
  await assentar(page);
  const alvo = await page.evaluate(() => {
    const v = window.__brumaluz!.vila!()!;
    return [Math.round((v.plana.x0 + v.plana.x1) / 2), v.plana.z1 + 30] as const;
  });
  await page.evaluate(([x, z]) => window.__brumaluz!.teleportar!(x + 0.5, z + 0.5), alvo);
  await assentar(page);
  for (let i = 0; i < 40; i++) {
    const faltam = await page.evaluate(([x, z]) => {
      const e = window.__brumaluz!;
      let n = 0;
      for (let dx = -24; dx <= 24; dx += 6)
        for (let dz = -24; dz <= 24; dz += 6) {
          let tem = false;
          for (let y = 120; y > 1 && !tem; y--) tem = !!e.bloco!(x + dx, y, z + dz);
          if (!tem) n++;
        }
      return n;
    }, alvo);
    if (faltam === 0) break;
    await page.waitForTimeout(1500);
  }
  const O = await page.evaluate(([cx, cz]) => {
    const e = window.__brumaluz!;
    const alturas: number[] = [];
    for (let dx = -20; dx <= 20; dx += 5)
      for (let dz = -20; dz <= 20; dz += 5)
        for (let y = 120; y > 1; y--) {
          const b = e.bloco!(cx + dx, y, cz + dz);
          if (!b || [4, 5, 8, 9].includes(b)) continue;
          alturas.push(y);
          break;
        }
    alturas.sort((a, b) => a - b);
    const gy = alturas[Math.floor(alturas.length / 2)] ?? 64;
    const lote: { x: number; y: number; z: number; v: number }[] = [];
    for (let dx = -30; dx <= 30; dx++)
      for (let dz = -30; dz <= 30; dz++) {
        for (let y = gy - 3; y < gy; y++) lote.push({ x: cx + dx, y, z: cz + dz, v: 11 });
        lote.push({ x: cx + dx, y: gy, z: cz + dz, v: 1 });
        for (let y = gy + 1; y <= gy + 24; y++) lote.push({ x: cx + dx, y, z: cz + dz, v: 0 });
      }
    e.editarLote!(lote);
    const O: V3 = [cx + 0.5, gy + 1, cz + 0.5];
    e.teleportar!(O[0], O[2], O[1]);
    return O;
  }, alvo);
  await page.waitForTimeout(tamanho === 'pc' ? 6000 : 4000);
  await page.evaluate(() => {
    const cena = document.getElementById('cena')!;
    for (const el of Array.from(document.body.querySelectorAll<HTMLElement>('*')))
      if (el !== cena && !el.contains(cena)) el.style.visibility = 'hidden';
  });
  return { page, O };
}

async function foto(page: Page, pasta: string, nome: string) {
  mkdirSync(pasta, { recursive: true });
  await page.screenshot({ path: `${pasta}/${nome}.jpg`, type: 'jpeg', quality: 88 });
  console.log(`FOTO ${pasta}/${nome}`);
}

/** O jogador parado no meio do gramado, virado para `yaw`, a câmera do jogo atrás dele. */
async function noMeio(page: Page, O: V3, yaw: number, zoom: number, pitch = 0.3) {
  await page.evaluate(
    ({ O, yaw, zoom, pitch }) => {
      const e = window.__brumaluz!;
      if (e.modoFoto!.ativo()) e.modoFoto!.alternar();
      e.voar?.(false);
      const c = e.controleDireto!;
      c.mover(0, 0);
      for (const t of ['pular', 'correr', 'rapido'] as const) c.tecla(t, false);
      e.teleportar!(O[0], O[2], O[1]);
      e.camera?.definirZoom(zoom);
      e.apontar!(yaw, pitch);
    },
    { O, yaw, zoom, pitch },
  );
}

/** A câmera de estúdio (modo foto), olhando para a criança de `giro` em volta do corpo dela. */
async function estudio(page: Page, alvoY: number, giro: number, dist: number, alt: number) {
  await page.evaluate(
    ({ alvoY, giro, dist, alt }) => {
      const e = window.__brumaluz!;
      const [x, y, z] = e.jogadorPes!();
      const corpo = e.camera!.yawCorpo();
      if (!e.modoFoto!.ativo()) e.modoFoto!.alternar();
      const ang = corpo + giro;
      e.modoFoto!.posicionar!(x + Math.sin(ang) * dist, y + alvoY + alt, z + Math.cos(ang) * dist);
      e.apontar!(ang + Math.PI, Math.atan2(alt, dist));
    },
    { alvoY, giro, dist, alt },
  );
}

/** Veste e monta (a roda faz o mesmo: `personagem.montar`). */
async function montarNo(page: Page, base: object, id: string, extra: object = {}) {
  await page.evaluate(({ base, id, extra }) => window.__brumaluz!.personagem!.definir({ ...base, ...extra, premium: { andar: id } } as never), {
    base,
    id,
    extra,
  });
  await page.evaluate(() => window.__brumaluz!.personagem!.montar!());
  await page.waitForFunction((id) => window.__brumaluz!.personagem!.montado!() === id, id);
}

/** Anda de lado para a câmera do jogo (a criança fica de perfil e a câmera vai junto). */
const andarDeLado = (page: Page, v = 1) => page.evaluate((v) => window.__brumaluz!.controleDireto!.mover(0, v), v);
const parar = (page: Page) => page.evaluate(() => window.__brumaluz!.controleDireto!.mover(0, 0));

/** Junta uma sequência de fotos numa prancha (para ver no celular, no lugar do vídeo). */
async function prancha(page: Page, pasta: string, nomes: string[], destino: string, titulo: string, colunas = 4) {
  const imgs = nomes.map((n, i) => `<figure><img src="data:image/jpeg;base64,${readFileSync(`${pasta}/${n}.jpg`, 'base64')}"><figcaption>${i + 1}</figcaption></figure>`).join('');
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
    body { margin: 0; background: #fbf6ec; font-family: system-ui, sans-serif; color: #3a2f4a; width: 1080px; }
    h1 { margin: 18px 22px 8px; font-size: 30px; }
    .g { display: grid; grid-template-columns: repeat(${colunas}, 1fr); gap: 10px; padding: 0 22px 22px; }
    figure { margin: 0; position: relative; } img { width: 100%; border-radius: 12px; display: block; }
    figcaption { position: absolute; left: 8px; top: 6px; background: #fff; border-radius: 99px; padding: 2px 10px; font-weight: 700; }
  </style></head><body><h1>${titulo}</h1><div class="g">${imgs}</div></body></html>`;
  const p2 = await page.context().browser()!.newPage({ viewport: { width: 1080, height: 800 } });
  await p2.setContent(html, { waitUntil: 'load' });
  await p2.screenshot({ path: `${pasta}/${destino}.jpg`, type: 'jpeg', quality: 86, fullPage: true });
  await p2.close();
  console.log(`FOTO ${pasta}/${destino}`);
}

// ------------------------------------------------------------------ T02
const PASTA_T02 = 'capturas-038/t02-pes';

/** A matriz de roupas e fantasias da perna (as que cobrem a perna e o pé). */
const ROUPAS: Array<[string, object]> = [
  ['menino-tunica', MENINO],
  ['menina-saia', MENINA],
  ['menina-vestido', { ...MENINA, roupaEstilo: 8 }],
  ['tenis-cometa', { ...MENINO, premium: { roupa: 'tenis-cometa' } }],
  ['pijama-nuvem', { ...MENINA, premium: { roupa: 'pijama-nuvem' } }],
  ['roqueira-tenis-de-cano', { ...MENINA, fantasia: { id: 'roqueira-palco', cor: 0 } }],
  ['patinadora-joelheira', { ...MENINA, fantasia: { id: 'patinadora', cor: 0 } }],
  ['danca-polainas', { ...MENINA, fantasia: { id: 'danca-neon', cor: 0 } }],
  ['realeza-botas', { ...MENINA, fantasia: { id: 'realeza-flores', cor: 0 } }],
  ['caipira-remendo', { ...MENINO, fantasia: { id: 'caipira', cor: 0 } }],
  ['monstrinho-peludo', { ...MENINO, fantasia: { id: 'monstrinho-peludo', cor: 0 } }],
  ['dragaozinho', { ...MENINO, premium: { fantasia: 'dragao' } }],
];

test('T02: os pés no pedal, de lado, numa matriz de roupas e fantasias (celular em pé)', async ({ browser }) => {
  test.skip(!QUAL.includes('t02'));
  test.setTimeout(1_500_000);
  const { page, O } = await abrirGramado(browser, 'empe');
  const pasta = `${PASTA_T02}/matriz`;
  for (const [nome, base] of ROUPAS) {
    const { premium, ...resto } = base as { premium?: Record<string, string> };
    for (const id of ['bicicletinha', 'carrinho-pedal'] as const) {
      if (id === 'carrinho-pedal' && !['menino-tunica', 'menina-vestido', 'monstrinho-peludo', 'tenis-cometa'].includes(nome)) continue;
      await noMeio(page, O, 0, 4.2, 0.18);
      await montarNo(page, resto, id, premium ? { premium } : {});
      // (o premium da roupa ou da fantasia continua junto com o brinquedo)
      if (premium)
        await page.evaluate(({ resto, premium, id }) => window.__brumaluz!.personagem!.definir({ ...resto, montado: true, premium: { ...premium, andar: id } } as never), {
          resto,
          premium,
          id,
        });
      await page.waitForTimeout(1200);
      await andarDeLado(page, 0.8);
      // duas fotos em pontos diferentes da volta do pedal (a perna mais dobrada e a mais esticada)
      for (const k of [0, 1]) {
        await page.waitForTimeout(k === 0 ? 1400 : 330);
        await foto(page, pasta, `${nome}-${id === 'bicicletinha' ? 'bici' : 'carrinho'}-${k + 1}`);
      }
      await parar(page);
    }
  }
  await page.context().close();
});

test('T02: o joelho de perto, as sequências pedalando e a bandeirinha (celular em pé)', async ({ browser }) => {
  test.skip(!QUAL.includes('t02'));
  test.setTimeout(1_200_000);
  const { page, O } = await abrirGramado(browser, 'empe');
  // o joelho de perto, parada (de lado e de três-quartos), na bicicletinha e no carrinho
  for (const [nome, base] of [
    ['menino', MENINO],
    ['menina-saia', MENINA],
  ] as const)
    for (const id of ['bicicletinha', 'carrinho-pedal'] as const) {
      await noMeio(page, O, 0, 4.2);
      await montarNo(page, base, id);
      await andarDeLado(page, 0.8);
      await page.waitForTimeout(900);
      await parar(page);
      await page.waitForTimeout(1500);
      for (const [vista, giro, alt] of [
        ['lado', Math.PI / 2, 0.15],
        ['tres-quartos', 0.9, 0.5],
        ['outro-lado', -Math.PI / 2, 0.15],
      ] as const) {
        await estudio(page, 0.55, giro, 1.7, alt);
        await page.waitForTimeout(700);
        await foto(page, PASTA_T02, `joelho-${nome}-${id === 'bicicletinha' ? 'bici' : 'carrinho'}-${vista}`);
      }
    }
  // as sequências: 8 fotos seguidas, de lado, pedalando (no lugar do vídeo)
  for (const [nome, id, hora] of [
    ['bici', 'bicicletinha', DIA],
    ['carrinho', 'carrinho-pedal', DIA],
    ['bici-noite', 'bicicletinha', NOITE],
  ] as const) {
    await page.evaluate((h) => (window.__brumaluz!.hora = h), hora);
    await noMeio(page, O, 0, 3.4, 0.12);
    await montarNo(page, MENINO, id);
    await andarDeLado(page, 0.7);
    await page.waitForTimeout(1500);
    const nomes: string[] = [];
    for (let i = 0; i < 8; i++) {
      await foto(page, `${PASTA_T02}/sequencia`, `${nome}-${i + 1}`);
      nomes.push(`${nome}-${i + 1}`);
      await page.waitForTimeout(90);
    }
    await parar(page);
    await prancha(page, `${PASTA_T02}/sequencia`, nomes, `${nome}-sequencia`, `Pedalando: ${nome} (8 fotos seguidas)`);
  }
  await page.evaluate((h) => (window.__brumaluz!.hora = h), DIA);
  // a bandeirinha: parada, arrancando e andando, de três-quartos por trás
  await noMeio(page, O, 0, 5, 0.3);
  await montarNo(page, MENINA, 'carrinho-pedal');
  await page.waitForTimeout(1500);
  const nomes: string[] = [];
  await foto(page, `${PASTA_T02}/bandeira`, 'parada');
  nomes.push('parada');
  await page.evaluate(() => window.__brumaluz!.controleDireto!.mover(0.6, 0.8));
  for (let i = 0; i < 11; i++) {
    await page.waitForTimeout(160);
    await foto(page, `${PASTA_T02}/bandeira`, `andando-${i + 1}`);
    nomes.push(`andando-${i + 1}`);
  }
  await parar(page);
  await prancha(page, `${PASTA_T02}/bandeira`, nomes, 'bandeira-sequencia', 'A bandeirinha: parada e andando (12 fotos seguidas)');
  await page.context().close();
});

test('T02: deitado e no computador, pedalando de dia e de noite', async ({ browser }) => {
  test.skip(!QUAL.includes('t02'));
  test.setTimeout(900_000);
  for (const tamanho of ['deitado', 'pc'] as const) {
    const { page, O } = await abrirGramado(browser, tamanho);
    for (const [quando, hora] of [
      ['dia', DIA],
      ['noite', NOITE],
    ] as const) {
      await page.evaluate((h) => (window.__brumaluz!.hora = h), hora);
      for (const [nome, id, base] of [
        ['bici', 'bicicletinha', MENINO],
        ['carrinho', 'carrinho-pedal', MENINA],
      ] as const) {
        await noMeio(page, O, 0, 4.6, 0.25);
        await montarNo(page, base, id);
        await page.evaluate(() => window.__brumaluz!.controleDireto!.mover(-0.5, 0.85));
        await page.waitForTimeout(1600);
        await foto(page, `${PASTA_T02}/${tamanho === 'pc' ? 'computador' : 'deitado'}`, `${nome}-${quando}`);
        await parar(page);
      }
    }
    await page.context().close();
  }
});
