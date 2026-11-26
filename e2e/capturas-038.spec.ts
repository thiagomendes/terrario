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
 * - `t03`: a motoquinha dourada nas três telas, de dia e de noite, parada e andando; de frente,
 *   de lado e de costas; os pés nos apoios de perto; a sequência andando; o ícone, a figura e o
 *   provador na lojinha; e a bandeirinha do carrinho de perto (pedido do orquestrador).
 * - `t04`: a camiseta de aquário (Peixinhos de bolinhas) e o tênis-cometa (Violeta e ouro) de
 *   frente, de costas e de lado, de perto, de dia e de noite; as pegadas de luz; e os cartões da
 *   aba de roupa na lojinha.
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

// ------------------------------------------------------------------ T03
const PASTA_T03 = 'capturas-038/t03-moto';
const MOTO = 'motoquinha-dourada';

test('T03: a motoquinha parada e andando, de dia e de noite, de todos os lados (celular em pé)', async ({ browser }) => {
  test.skip(!QUAL.includes('t03'));
  test.setTimeout(1_200_000);
  const { page, O } = await abrirGramado(browser, 'empe');
  for (const [quando, hora] of [
    ['dia', DIA],
    ['noite', NOITE],
  ] as const) {
    await page.evaluate((h) => (window.__brumaluz!.hora = h), hora);
    for (const [quem, base] of [
      ['menino', MENINO],
      ['menina', MENINA],
    ] as const) {
      if (quem === 'menina' && quando === 'noite') continue;
      await noMeio(page, O, 0, 5);
      await montarNo(page, base, MOTO);
      await page.waitForTimeout(1500);
      for (const [vista, giro, alt] of [
        ['tres-quartos', 0.8, 0.7],
        ['lado', Math.PI / 2, 0.3],
        ['frente', 0, 0.4],
        ['costas', Math.PI, 0.5],
        ['outro-tres-quartos', -2.3, 0.6],
      ] as const) {
        if (quando === 'noite' && vista !== 'tres-quartos' && vista !== 'lado') continue;
        await estudio(page, 0.85, giro, 4.2, alt);
        await page.waitForTimeout(700);
        await foto(page, PASTA_T03, `${quem}-parada-${vista}-${quando}`);
      }
      // andando: a câmera do jogo; para trás e para o lado (o corpo vira de três-quartos) e de lado
      for (const [vista, frente, lado] of [
        ['andando-tres-quartos', -0.75, 0.66],
        ['andando-lado', 0, 1],
      ] as const) {
        await noMeio(page, O, 0, 5.2, 0.3);
        await page.waitForTimeout(600);
        await page.evaluate(([f, d]) => window.__brumaluz!.controleDireto!.mover(f, d), [frente, lado] as const);
        await page.waitForTimeout(1500);
        await foto(page, PASTA_T03, `${quem}-${vista}-${quando}`);
        await parar(page);
      }
    }
  }
  await page.evaluate((h) => (window.__brumaluz!.hora = h), DIA);
  // os pés nos apoios de perto, parada, nos dois lados
  await noMeio(page, O, 0, 5);
  await montarNo(page, MENINO, MOTO);
  await page.waitForTimeout(1500);
  for (const [vista, giro] of [
    ['lado', Math.PI / 2],
    ['outro-lado', -Math.PI / 2],
  ] as const) {
    await estudio(page, 0.45, giro, 1.8, 0.2);
    await page.waitForTimeout(700);
    await foto(page, PASTA_T03, `pes-nos-apoios-${vista}`);
  }
  // a sequência andando de lado (no lugar do vídeo)
  await noMeio(page, O, 0, 3.6, 0.15);
  await montarNo(page, MENINO, MOTO);
  await andarDeLado(page, 0.8);
  await page.waitForTimeout(1500);
  const nomes: string[] = [];
  for (let i = 0; i < 8; i++) {
    await foto(page, `${PASTA_T03}/sequencia`, `andando-${i + 1}`);
    nomes.push(`andando-${i + 1}`);
    await page.waitForTimeout(120);
  }
  await parar(page);
  await prancha(page, `${PASTA_T03}/sequencia`, nomes, 'moto-sequencia', 'A motoquinha andando (8 fotos seguidas)');
  // a lojinha: o cartão, o detalhe e o provador da motoquinha (a tela inteira, com a interface)
  await noMeio(page, O, 0, 5);
  await page.evaluate(() => window.__brumaluz!.personagem!.definir({ corpo: 'masculino', cabeloEstilo: 0, rosto: 0, cabeloCor: 0, pele: 2, roupaEstilo: 0 } as never));
  await page.evaluate(() => {
    for (const el of Array.from(document.body.querySelectorAll<HTMLElement>('*'))) el.style.visibility = '';
    window.dispatchEvent(new Event('brumaluz:lojinha'));
  });
  await page.locator('[data-alma-loja]').waitFor({ state: 'visible' });
  await page.locator('[data-alma-aba="andar"]').click();
  await page.waitForTimeout(2500);
  await foto(page, `${PASTA_T03}/lojinha`, 'vitrine-andar');
  await page.locator('[data-alma-prateleira][data-aba="andar"] .alma-lcard').last().click();
  await page.waitForTimeout(2000);
  await foto(page, `${PASTA_T03}/lojinha`, 'detalhe');
  const provar = page.locator('[data-alma-experimentar]');
  if (await provar.count()) {
    await provar.first().click();
    await page.waitForTimeout(2600);
    await foto(page, `${PASTA_T03}/lojinha`, 'provador');
  }
  await page.context().close();
});

test('T03: o pano da bandeira do carrinho de perto, parada e andando (celular em pé)', async ({ browser }) => {
  test.skip(!QUAL.includes('t03'));
  test.setTimeout(600_000);
  const { page, O } = await abrirGramado(browser, 'empe');
  // (pedido do orquestrador: a bandeira grande no quadro. Por trás ela fica de quina; de lado e um
  // tico por trás, o pano aparece inteiro)
  await noMeio(page, O, 0, 5);
  await montarNo(page, MENINA, 'carrinho-pedal');
  await page.waitForTimeout(1800);
  const band: string[] = [];
  // (pedido do orquestrador: a câmera atrás e de lado.) A câmera do jogo atrás, um tico do lado
  // do mastro e mais por cima: parada, o pano aponta para o lado (para a direita no quadro);
  // andando para a frente, ele vai para trás (para a câmera, descendo no quadro). Anda um pouco,
  // para e assenta: as fotos paradas; e depois anda de novo
  await noMeio(page, O, 0.35, 3.0, 0.85);
  await page.evaluate(() => window.__brumaluz!.controleDireto!.mover(1, 0));
  await page.waitForTimeout(1200);
  await parar(page);
  await page.waitForTimeout(2200);
  for (let i = 0; i < 3; i++) {
    await foto(page, `${PASTA_T03}/bandeira`, `parada-${i + 1}`);
    band.push(`parada-${i + 1}`);
    await page.waitForTimeout(300);
  }
  await page.evaluate(() => window.__brumaluz!.controleDireto!.mover(1, 0));
  await page.waitForTimeout(300);
  for (let i = 0; i < 9; i++) {
    await foto(page, `${PASTA_T03}/bandeira`, `andando-${i + 1}`);
    band.push(`andando-${i + 1}`);
    await page.waitForTimeout(110);
  }
  await parar(page);
  await prancha(page, `${PASTA_T03}/bandeira`, band, 'bandeira-de-perto', 'A bandeirinha de perto: parada (1 a 3) e andando (4 a 12)');
  await page.context().close();
});

test('T03: a motoquinha deitado e no computador, de dia e de noite', async ({ browser }) => {
  test.skip(!QUAL.includes('t03'));
  test.setTimeout(900_000);
  for (const tamanho of ['deitado', 'pc'] as const) {
    const { page, O } = await abrirGramado(browser, tamanho);
    const pasta = `${PASTA_T03}/${tamanho === 'pc' ? 'computador' : 'deitado'}`;
    for (const [quando, hora] of [
      ['dia', DIA],
      ['noite', NOITE],
    ] as const) {
      await page.evaluate((h) => (window.__brumaluz!.hora = h), hora);
      await noMeio(page, O, 0, 4.6, 0.25);
      await montarNo(page, MENINO, MOTO);
      await page.waitForTimeout(1500);
      await estudio(page, 0.85, 0.8, 4.4, 0.7);
      await page.waitForTimeout(700);
      await foto(page, pasta, `parada-${quando}`);
      await noMeio(page, O, 0, 4.6, 0.25);
      await page.evaluate(() => window.__brumaluz!.controleDireto!.mover(-0.5, 0.85));
      await page.waitForTimeout(1600);
      await foto(page, pasta, `andando-${quando}`);
      await parar(page);
    }
    await page.context().close();
  }
});

// ------------------------------------------------------------------ T04
const PASTA_T04 = 'capturas-038/t04-camiseta-tenis';

test('T04: a camiseta e o tênis de frente, de costas e de lado, de perto, de dia e de noite (celular em pé)', async ({ browser }) => {
  test.skip(!QUAL.includes('t04'));
  test.setTimeout(900_000);
  const { page, O } = await abrirGramado(browser, 'empe');
  for (const [quando, hora] of [
    ['dia', DIA],
    ['noite', NOITE],
  ] as const) {
    await page.evaluate((h) => (window.__brumaluz!.hora = h), hora);
    for (const [nome, base, premium, alvoY, perto] of [
      ['camiseta', MENINA, { roupa: 'camiseta-aquario' }, 0.95, 2.3],
      ['tenis', MENINO, { roupa: 'tenis-cometa' }, 0.3, 1.7],
    ] as const) {
      await noMeio(page, O, 0, 5);
      await page.evaluate(({ base, premium }) => window.__brumaluz!.personagem!.definir({ ...base, premium } as never), { base, premium });
      await page.waitForTimeout(1500);
      for (const [vista, giro, dist, alt, y] of [
        ['frente', 0, 4.2, 0.4, 0.9],
        ['costas', Math.PI, 4.2, 0.4, 0.9],
        ['lado', Math.PI / 2, 4.2, 0.4, 0.9],
        ['perto', 0.35, perto, 0.25, alvoY],
        ['perto-lado', Math.PI / 2 + 0.3, perto, 0.2, alvoY],
      ] as const) {
        if (quando === 'noite' && !vista.startsWith('perto') && vista !== 'frente') continue;
        await estudio(page, y, giro, dist, alt);
        await page.waitForTimeout(700);
        await foto(page, PASTA_T04, `${nome}-${vista}-${quando}`);
      }
    }
  }
  // as pegadas de luz do tênis (ouro e violeta), andando, com a câmera do jogo por trás
  await page.evaluate((h) => (window.__brumaluz!.hora = h), NOITE);
  await noMeio(page, O, 0, 4.4, 0.5);
  await page.evaluate(({ base }) => window.__brumaluz!.personagem!.definir({ ...base, premium: { roupa: 'tenis-cometa' } } as never), { base: MENINO });
  await page.waitForTimeout(1000);
  await page.evaluate(() => window.__brumaluz!.controleDireto!.mover(1, 0));
  await page.waitForTimeout(1600);
  await foto(page, PASTA_T04, 'tenis-pegadas-noite');
  await parar(page);
  await page.evaluate((h) => (window.__brumaluz!.hora = h), DIA);
  // os cartões da aba de roupa na lojinha (as figuras do 3D de verdade)
  await noMeio(page, O, 0, 5);
  await page.evaluate(() => {
    for (const el of Array.from(document.body.querySelectorAll<HTMLElement>('*'))) el.style.visibility = '';
    window.dispatchEvent(new Event('brumaluz:lojinha'));
  });
  await page.locator('[data-alma-loja]').waitFor({ state: 'visible' });
  await page.locator('[data-alma-aba="roupa"]').click();
  await page.waitForTimeout(2500);
  await foto(page, `${PASTA_T04}/lojinha`, 'vitrine-roupa');
  await page.context().close();
});

test('T04: a camiseta e o tênis deitado e no computador', async ({ browser }) => {
  test.skip(!QUAL.includes('t04'));
  test.setTimeout(600_000);
  for (const tamanho of ['deitado', 'pc'] as const) {
    const { page, O } = await abrirGramado(browser, tamanho);
    for (const [nome, base, premium] of [
      ['camiseta', MENINA, { roupa: 'camiseta-aquario' }],
      ['tenis', MENINO, { roupa: 'tenis-cometa' }],
    ] as const) {
      await noMeio(page, O, 0, 5);
      await page.evaluate(({ base, premium }) => window.__brumaluz!.personagem!.definir({ ...base, premium } as never), { base, premium });
      await page.waitForTimeout(1500);
      await estudio(page, 0.8, 0.5, 3.4, 0.4);
      await page.waitForTimeout(700);
      await foto(page, `${PASTA_T04}/${tamanho === 'pc' ? 'computador' : 'deitado'}`, `${nome}-dia`);
    }
    await page.context().close();
  }
});

// ------------------------------------------------------------------ T09 (o portão visual)
const PASTA_T09 = 'capturas-038/t09';

test('T09: os consertos do portão visual (celular em pé)', async ({ browser }) => {
  test.skip(!QUAL.includes('t09'));
  test.setTimeout(1_500_000);
  const { page, O } = await abrirGramado(browser, 'empe');
  /** Monta com a roupa ou a fantasia (o premium da roupa junto com o brinquedo). */
  const montarCom = async (base: object, id: string) => {
    const { premium, ...resto } = base as { premium?: Record<string, string> };
    await noMeio(page, O, 0, 4.2, 0.18);
    await montarNo(page, resto, id);
    if (premium)
      await page.evaluate(({ resto, premium, id }) => window.__brumaluz!.personagem!.definir({ ...resto, montado: true, premium: { ...premium, andar: id } } as never), {
        resto,
        premium,
        id,
      });
    await page.waitForTimeout(1000);
  };
  // 1. o tênis-cometa pedalando, de lado, na bicicletinha e no carrinho (as cores de hoje)
  for (const [nome, id] of [
    ['bici', 'bicicletinha'],
    ['carrinho', 'carrinho-pedal'],
  ] as const) {
    await montarCom({ ...MENINO, premium: { roupa: 'tenis-cometa' } }, id);
    await andarDeLado(page, 0.8);
    for (const k of [0, 1]) {
      await page.waitForTimeout(k === 0 ? 1400 : 330);
      await foto(page, PASTA_T09, `1-tenis-cometa-${nome}-${k + 1}`);
    }
    await parar(page);
    await estudio(page, 0.4, Math.PI / 2, 1.9, 0.15);
    await page.waitForTimeout(700);
    await foto(page, PASTA_T09, `1-tenis-cometa-${nome}-perto`);
  }
  // as pegadas (o rastro) de noite, a pé
  await page.evaluate((h) => (window.__brumaluz!.hora = h), NOITE);
  await noMeio(page, O, 0, 4.4, 0.5);
  await page.evaluate(() => window.__brumaluz!.personagem!.definir({ corpo: 'masculino', cabeloEstilo: 0, premium: { roupa: 'tenis-cometa' } } as never));
  await page.waitForTimeout(800);
  await page.evaluate(() => window.__brumaluz!.controleDireto!.mover(1, 0));
  await page.waitForTimeout(1600);
  await foto(page, PASTA_T09, '1-tenis-cometa-pegadas-noite');
  await parar(page);
  await page.evaluate((h) => (window.__brumaluz!.hora = h), DIA);
  // 3 e 7. a saia, o vestido, o vestido de realeza e o tênis de cano da roqueira, montados
  for (const [nome, base, id] of [
    ['menina-saia', MENINA, 'bicicletinha'],
    ['menina-saia-moto', MENINA, 'motoquinha-dourada'],
    ['menina-vestido', { ...MENINA, roupaEstilo: 8 }, 'bicicletinha'],
    ['realeza', { ...MENINA, fantasia: { id: 'realeza-flores', cor: 0 } }, 'bicicletinha'],
    ['roqueira', { ...MENINA, fantasia: { id: 'roqueira-palco', cor: 0 } }, 'bicicletinha'],
  ] as const) {
    await montarCom(base, id);
    await andarDeLado(page, 0.8);
    for (const k of [0, 1]) {
      await page.waitForTimeout(k === 0 ? 1400 : 330);
      await foto(page, PASTA_T09, `3-${nome}-pedalando-${k + 1}`);
    }
    await parar(page);
    await page.waitForTimeout(1200);
    for (const [vista, giro, alt] of [
      ['lado', Math.PI / 2, 0.2],
      ['tres-quartos', 0.8, 0.5],
    ] as const) {
      await estudio(page, 0.55, giro, 2.2, alt);
      await page.waitForTimeout(700);
      await foto(page, PASTA_T09, `3-${nome}-${vista}`);
    }
  }
  // 4. a sola do tênis de perto, em pé (a pé)
  await noMeio(page, O, 0, 5);
  await page.evaluate(() => window.__brumaluz!.personagem!.definir({ corpo: 'masculino', cabeloEstilo: 0, premium: { roupa: 'tenis-cometa' } } as never));
  await page.waitForTimeout(1200);
  for (const [vista, giro] of [
    ['frente', 0.35],
    ['lado', Math.PI / 2],
    ['costas', Math.PI - 0.4],
  ] as const) {
    await estudio(page, 0.25, giro, 1.6, 0.3);
    await page.waitForTimeout(700);
    await foto(page, PASTA_T09, `4-tenis-sola-${vista}`);
  }
  // 5. a bandeirinha com a câmera da criança (atrás dela), parada e andando
  await noMeio(page, O, 0, 5, 0.3);
  await montarNo(page, MENINA, 'carrinho-pedal');
  await page.waitForTimeout(1500);
  const band: string[] = [];
  for (let i = 0; i < 2; i++) {
    await foto(page, `${PASTA_T09}/bandeira`, `parada-${i + 1}`);
    band.push(`parada-${i + 1}`);
    await page.waitForTimeout(300);
  }
  await page.evaluate(() => window.__brumaluz!.controleDireto!.mover(1, 0));
  await page.waitForTimeout(300);
  for (let i = 0; i < 10; i++) {
    await foto(page, `${PASTA_T09}/bandeira`, `andando-${i + 1}`);
    band.push(`andando-${i + 1}`);
    await page.waitForTimeout(140);
  }
  await parar(page);
  await prancha(page, `${PASTA_T09}/bandeira`, band, '5-bandeira-camera-da-crianca', 'A bandeirinha com a câmera da criança: parada (1 e 2) e andando (3 a 12)');
  // 8. a moto: os pés nos apoios, de lado
  await montarCom(MENINO, 'motoquinha-dourada');
  await page.waitForTimeout(800);
  for (const [vista, giro] of [
    ['lado', Math.PI / 2],
    ['outro-lado', -Math.PI / 2],
  ] as const) {
    await estudio(page, 0.45, giro, 1.9, 0.2);
    await page.waitForTimeout(700);
    await foto(page, PASTA_T09, `8-moto-pes-nos-apoios-${vista}`);
  }
  await estudio(page, 0.85, Math.PI / 2, 4.2, 0.3);
  await page.waitForTimeout(700);
  await foto(page, PASTA_T09, '8-moto-lado');
  await page.context().close();
});
