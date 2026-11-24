import { test, type Browser, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { comecarGravacao, pararGravacao } from './gravarCena';
import { assentar, criarMundo, TAMANHOS, type Tamanho } from './guia-palco';

/**
 * Spec 036 (Lojinha maior): as fotos das fases do artista, no jogo de verdade (não no esboço),
 * num gramado aplainado ao sul do bairro da Vila Neon. Só com CAPTURAS_036, na placa de vídeo:
 *
 *   E2E_ENV="-u 1000:1000 -e HOME=/tmp -e CAPTURAS_036=t02 -e T02_FASE=depois" \
 *     scripts/e2e-gpu.sh e2e/capturas-036.spec.ts --workers 1 --trace off
 *
 * - `t02`: o Unicórnio-pônei parado, trotando, pulando e voando, de dia e de noite (celular em
 *   pé), o vídeo voando (computador) e a medida do tremor; `T02_FASE` é a subpasta (antes ou
 *   depois do conserto).
 * - `t03`: as peças novas no boneco (ver o teste de baixo).
 */
declare const process: { env: Record<string, string | undefined> };
const QUAL = (process.env.CAPTURAS_036 ?? '').split(',').filter(Boolean);
test.skip(!QUAL.length, 'fotos da 036 só com CAPTURAS_036');

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
      localStorage.setItem(
        'terrario:config',
        JSON.stringify({ distancia: 5, mostrarFps: false, qualidade: 'alta', mostrarAtalhos: false }),
      );
    } catch {
      // sem armazenamento
    }
  });
  await criarMundo(page, 'capturas-036', 'vila-neon', {}, 1337);
  await page.goto(`/?mundo=capturas-036${tamanho === 'pc' ? '&escala=1' : ''}`);
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
    // a altura do chão: a mediana das colunas em volta
    const alturas: number[] = [];
    for (let dx = -20; dx <= 20; dx += 5)
      for (let dz = -20; dz <= 20; dz += 5)
        for (let y = 120; y > 1; y--) {
          const b = e.bloco!(cx + dx, y, cz + dz);
          // (folhas, troncos, flores e água não são chão)
          if (!b || [4, 5, 8, 9].includes(b)) continue;
          alturas.push(y);
          break;
        }
    alturas.sort((a, b) => a - b);
    const gy = alturas[Math.floor(alturas.length / 2)] ?? 64;
    const lote: { x: number; y: number; z: number; v: number }[] = [];
    for (let dx = -24; dx <= 24; dx++)
      for (let dz = -24; dz <= 24; dz++) {
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
  // só o 3D na foto
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
async function noMeio(page: Page, O: V3, yaw: number, zoom: number, pitch = 0.32) {
  await page.evaluate(
    ({ O, yaw, zoom, pitch }) => {
      const e = window.__brumaluz!;
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

/**
 * Câmera de estúdio (modo foto): olhando para `alvo` de `dist` blocos, do ângulo `ang` em volta
 * dele (0: do lado +z do mundo) e `alt` acima do alvo.
 */
async function estudio(page: Page, alvo: V3, ang: number, dist: number, alt: number) {
  await page.evaluate(
    ({ alvo, ang, dist, alt }) => {
      const e = window.__brumaluz!;
      if (!e.modoFoto!.ativo()) e.modoFoto!.alternar();
      const x = alvo[0] + Math.sin(ang) * dist;
      const z = alvo[2] + Math.cos(ang) * dist;
      e.modoFoto!.posicionar!(x, alvo[1] + alt, z);
      e.apontar!(ang + Math.PI, Math.atan2(alt, dist));
    },
    { alvo, ang, dist, alt },
  );
}

async function sairDoEstudio(page: Page) {
  await page.evaluate(() => {
    const e = window.__brumaluz!;
    if (e.modoFoto!.ativo()) e.modoFoto!.alternar();
  });
}

async function vestir(page: Page, base: object, premium: Record<string, string>) {
  await page.evaluate(
    ({ base, premium }) => window.__brumaluz!.personagem!.definir({ ...base, premium } as never),
    { base, premium },
  );
}

/**
 * O tremor, medido quadro a quadro durante `ms`: o maior pulo do bicho de um quadro para o
 * outro (fora o andar da criança), quantas vezes ele "teleportou" (mais de 1 bloco num quadro)
 * e o sobe e desce médio (a segunda diferença da altura).
 */
async function medirTremor(page: Page, ms: number) {
  return page.evaluate(
    (ms) =>
      new Promise<{ quadros: number; saltos: number; maiorPasso: number; sobeDesce: number; altura: number }>((ok) => {
        const e = window.__brumaluz!;
        const ys: number[] = [];
        const ps: Array<[number, number, number]> = [];
        let alt = 0;
        const ini = performance.now();
        const quadro = () => {
          const b = e.personagem!.bichoPremium?.();
          const j = e.jogadorPes?.() ?? e.posicao!;
          if (b) {
            ys.push(b.y);
            ps.push([b.x, b.y, b.z]);
            alt = Math.max(alt, j[1] - b.y);
          }
          if (performance.now() - ini < ms) requestAnimationFrame(quadro);
          else {
            let saltos = 0;
            let maior = 0;
            for (let i = 1; i < ps.length; i++) {
              const d = Math.hypot(ps[i][0] - ps[i - 1][0], ps[i][1] - ps[i - 1][1], ps[i][2] - ps[i - 1][2]);
              if (d > 1) saltos++;
              maior = Math.max(maior, d);
            }
            let s = 0;
            for (let i = 2; i < ys.length; i++) s += Math.abs(ys[i] - 2 * ys[i - 1] + ys[i - 2]);
            ok({
              quadros: ps.length,
              saltos,
              maiorPasso: +maior.toFixed(3),
              sobeDesce: +(s / Math.max(1, ys.length - 2)).toFixed(4),
              altura: +alt.toFixed(2),
            });
          }
        };
        requestAnimationFrame(quadro);
      }),
    ms,
  );
}

/** Sobe voando (criativo) `s` segundos e vai de lado, para a direita da câmera. */
async function voarDeLado(page: Page, subir: number) {
  await page.evaluate(() => {
    const e = window.__brumaluz!;
    e.voar!(true);
    e.controleDireto!.tecla('pular', true);
  });
  await page.waitForTimeout(subir);
  await page.evaluate(() => {
    const c = window.__brumaluz!.controleDireto!;
    c.tecla('pular', false);
    c.mover(0, 1);
  });
}

// ------------------------------------------------------------------------------ T02
test('T02: o Unicórnio-pônei parado, trotando, pulando e voando (celular em pé)', async ({ browser }) => {
  test.skip(!QUAL.includes('t02'));
  test.setTimeout(900_000);
  const pasta = `capturas-036/t02-unicornio/${process.env.T02_FASE ?? 'depois'}`;
  const { page, O } = await abrirGramado(browser, 'empe');
  await vestir(page, MENINA, { bicho: 'unicornio' });
  const medidas: Record<string, unknown> = {};
  for (const [quando, hora] of [
    ['dia', DIA],
    ['noite', NOITE],
  ] as const) {
    await page.evaluate((h) => (window.__brumaluz!.hora = h), hora);
    // parado: a câmera de estúdio de três-quartos, a criança e o unicórnio juntos
    await noMeio(page, O, 0, 5);
    await page.waitForTimeout(3500);
    const corpo = await page.evaluate(() => window.__brumaluz!.camera!.yawCorpo());
    const b = await page.evaluate(() => window.__brumaluz!.personagem!.bichoPremium?.());
    const meio: V3 = b ? [(O[0] + b.x) / 2, O[1] + 0.85, (O[2] + b.z) / 2] : [O[0], O[1] + 0.85, O[2]];
    await estudio(page, meio, corpo + 0.9, 4.6, 0.7);
    await page.waitForTimeout(700);
    await foto(page, pasta, `parado-${quando}`);
    // o unicórnio de perto (a borda e o brilho do chifre)
    if (b) {
      await estudio(page, [b.x, b.y + 0.95, b.z], corpo + 1.3, 2.6, 0.35);
      await page.waitForTimeout(500);
      await foto(page, pasta, `perto-${quando}`);
    }
    await sairDoEstudio(page);
    // trotando: a criança anda de lado (para a direita da câmera), a câmera do jogo atrás
    await noMeio(page, O, 0, 6.5, 0.38);
    await page.waitForTimeout(1500);
    await page.evaluate(() => window.__brumaluz!.controleDireto!.mover(0.35, 1));
    await page.waitForTimeout(1300);
    await foto(page, pasta, `trotando-${quando}`);
    await page.evaluate(() => window.__brumaluz!.controleDireto!.mover(0, 0));
    await page.waitForTimeout(900);
    // pulando: os dois pulam juntos
    await page.evaluate(() => window.__brumaluz!.controleDireto!.tecla('pular', true));
    await page.waitForTimeout(240);
    await foto(page, pasta, `pulando-${quando}`);
    await page.evaluate(() => window.__brumaluz!.controleDireto!.tecla('pular', false));
    await page.waitForTimeout(1200);
    // voando: sobe uns 10 blocos e vai de lado
    await noMeio(page, O, 0, 7, 0.3);
    await page.waitForTimeout(1500);
    await voarDeLado(page, 1300);
    await page.waitForTimeout(1200);
    await foto(page, pasta, `voando-${quando}`);
    medidas[`voando-${quando}`] = await medirTremor(page, 3000);
    await page.waitForTimeout(200);
    await foto(page, pasta, `voando2-${quando}`);
    // parada no ar: o unicórnio de perto, boiando do lado dela
    await page.evaluate(() => window.__brumaluz!.controleDireto!.mover(0, 0));
    await page.waitForTimeout(1600);
    const bv = await page.evaluate(() => window.__brumaluz!.personagem!.bichoPremium?.());
    medidas[`no-ar-${quando}`] = bv;
    if (bv) {
      const c = await page.evaluate(() => window.__brumaluz!.camera!.yawCorpo());
      await estudio(page, [bv.x, bv.y + 0.8, bv.z], c + 1.1, 4.2, 0.6);
      await page.waitForTimeout(600);
      await foto(page, pasta, `voando-perto-${quando}`);
      await sairDoEstudio(page);
    }
    await noMeio(page, O, 0, 5);
    await page.waitForTimeout(2500);
  }
  // o tremor parado no chão, para comparar
  await page.evaluate((h) => (window.__brumaluz!.hora = h), DIA);
  medidas.parado = await medirTremor(page, 2000);
  writeFileSync(`${pasta}/tremor.json`, JSON.stringify(medidas, null, 2));
  console.log(`TREMOR ${JSON.stringify(medidas)}`);
  await page.context().close();
});

test('T02: o vídeo do Unicórnio-pônei voando (computador)', async ({ browser }) => {
  test.skip(!QUAL.includes('t02') || !!process.env.SEM_VIDEO);
  test.setTimeout(600_000);
  const pasta = `capturas-036/t02-unicornio/${process.env.T02_FASE ?? 'depois'}`;
  mkdirSync(pasta, { recursive: true });
  const { page, O } = await abrirGramado(browser, 'pc');
  await vestir(page, MENINA, { bicho: 'unicornio' });
  await noMeio(page, O, 0, 7, 0.3);
  await page.waitForTimeout(3000);
  await comecarGravacao(page);
  // trota um pouco, sobe voando, vai de lado e volta, e desce
  await page.evaluate(() => window.__brumaluz!.controleDireto!.mover(0.3, 1));
  await page.waitForTimeout(1500);
  await page.evaluate(() => window.__brumaluz!.controleDireto!.mover(0, 0));
  await voarDeLado(page, 1400);
  await page.waitForTimeout(2600);
  await page.evaluate(() => window.__brumaluz!.controleDireto!.mover(0, -1));
  await page.waitForTimeout(2600);
  await page.evaluate(() => {
    const c = window.__brumaluz!.controleDireto!;
    c.mover(0, 0);
    c.tecla('correr', true);
  });
  await page.waitForTimeout(1500);
  await page.evaluate(() => {
    const e = window.__brumaluz!;
    e.controleDireto!.tecla('correr', false);
    e.voar!(false);
  });
  await page.waitForTimeout(2500);
  await pararGravacao(page, `${pasta}/voando.webm`);
  await page.context().close();
});

export type { V3 };
