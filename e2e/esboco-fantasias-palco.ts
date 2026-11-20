import type { Browser, Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { criarMundo, TAMANHOS, type Tamanho } from './guia-palco';

/**
 * O palco do esboço da spec 027 (Noite das Fantasias; não é um teste): grava um mundo da Vila
 * Neon (o mundo-base), abre com `?esboco=fantasias`, acha um lugar longe do bairro, monta os
 * lugares e esconde a interface e o jogador. Usado por `esboco-fantasias.spec.ts`.
 */
export type V3 = [number, number, number];
declare const process: { env: Record<string, string | undefined> };
export const PASTA = process.env.FANTASIAS_PASTA ?? 'capturas-027/esboco';
const T0 = Date.now();
export const passo = (o: string) =>
  console.log(`PASSO ${((Date.now() - T0) / 1000).toFixed(0)} s ${o}`);

async function assentar(page: Page, minimo = 20) {
  let antes = -1;
  for (let i = 0; i < 50; i++) {
    await page.waitForTimeout(2000);
    const n = await page.evaluate(() => window.__brumaluz!.chunksCarregados ?? 0);
    if (n === antes && n >= minimo) break;
    antes = n;
  }
  return antes;
}

export async function abrirPalco(browser: Browser, tamanho: Tamanho): Promise<Page> {
  const ctx = await browser.newContext(TAMANHOS[tamanho]);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log(`erro na página: ${String(e)}`));
  page.on('console', (m) => {
    if (m.text().startsWith('esboco')) console.log(m.text().slice(0, 1500));
  });
  await page.addInitScript(() => {
    try {
      localStorage.setItem(
        'terrario:config',
        JSON.stringify({ distancia: 7, mostrarFps: false, qualidade: 'alta', mostrarAtalhos: false }),
      );
    } catch {
      // sem armazenamento: fica a distância padrão
    }
  });
  await criarMundo(page, 'fantasias', 'vila-neon', {}, 1337);
  await page.goto(`/?mundo=fantasias&esboco=fantasias${tamanho === 'pc' ? '&escala=1' : ''}`);
  await page.waitForFunction(
    () => window.__brumaluz?.ready === true && !!window.__fantasias,
    undefined,
    { timeout: 240_000 },
  );
  await page.evaluate(() => {
    document.querySelector<HTMLElement>('.entrada')?.setAttribute('hidden', '');
    const e = window.__brumaluz!;
    e.definirClima?.('limpo');
    window.__fantasias!.hora(0.5);
    window.dispatchEvent(new Event('resize'));
  });
  await page.addStyleTag({ content: '.toast-area, .dica-mira { display: none !important; }' });
  passo(`abriu ${tamanho}`);
  await assentar(page, 12);
  // longe do bairro (o que ele construiu é protegido e as texturas dele foram repintadas), em
  // terra firme e mais ou menos plana
  const centro = await page.evaluate(() => {
    const v = window.__brumaluz!.vila!()!;
    return [v.ox + 90, v.oz + 75] as const;
  });
  // o lugar já achado para a semente 1337 (sem ruína nem torre no palco, em grama e plano: a
  // conta foi feita fora do jogo, com `estruturaDoChunk`); FANTASIAS_PROCURAR=1 procura de
  // novo, em anéis em volta do bairro
  const lugares: [number, number][] = [];
  if (!process.env.FANTASIAS_PROCURAR) lugares.push([-156, 436]);
  else {
    for (const r of [260, 340, 420, 500, 580])
      for (let k = 0; k < 16; k++) {
        const a = (k / 16) * Math.PI * 2 + r / 100;
        lugares.push([Math.round(Math.cos(a) * r), Math.round(Math.sin(a) * r)]);
      }
  }
  let melhor: { x: number; z: number; nota: number } | null = null;
  for (const [dx, dz] of lugares) {
    const x = centro[0] + dx;
    const z = centro[1] + dz;
    await page.evaluate(([x, z]) => window.__brumaluz!.teleportar!(x, z), [x, z] as const);
    await page.waitForTimeout(4000);
    // espera os pedaços de amostra chegarem (o chão existe em todas as colunas)
    for (let i = 0; i < 20; i++) {
      const prontas = await page.evaluate(
        ([x, z]) => {
          const e = window.__brumaluz!;
          let n = 0;
          for (let dx = -60; dx <= 60; dx += 20)
            for (let dz = -44; dz <= 44; dz += 22)
              for (let y = 120; y > 1; y--)
                if (e.bloco!(x + dx, y, z + dz)) {
                  n++;
                  break;
                }
          return n;
        },
        [x, z] as const,
      );
      if (prontas >= 35) break;
      await page.waitForTimeout(1500);
    }
    const r = await page.evaluate(
      ([x, z]) => {
        const e = window.__brumaluz!;
        // folha, tronco e mato não contam como chão
        const ARVORE = new Set([4, 5, 8, 9, 27, 28, 29, 30, 34, 35, 54, 55]);
        const alt: number[] = [];
        let agua = 0;
        let grama = 0;
        for (let dx = -60; dx <= 60; dx += 10)
          for (let dz = -44; dz <= 44; dz += 10)
            for (let y = 120; y > 1; y--) {
              const b = e.bloco!(x + dx, y, z + dz);
              if (!b || ARVORE.has(b)) continue;
              if (b === 67) agua++;
              else alt.push(y);
              if (b === 1) grama++;
              break;
            }
        // o que o mundo construiu (ruína, torre) não sai: nada protegido no miolo do palco
        let miolo = 0;
        let beira = 0;
        for (let dx = -82; dx <= 82; dx += 3)
          for (let dz = -68; dz <= 68; dz += 3)
            for (let y = 58; y < 100; y += 3) {
              const p = e.protecao!(x + dx, y, z + dz);
              if (p && p !== 'livre') {
                if (Math.abs(dx) <= 64 && Math.abs(dz) <= 50) miolo++;
                else beira++;
                break;
              }
            }
        alt.sort((a, b) => a - b);
        const total = alt.length + agua;
        return {
          agua,
          grama,
          total,
          desnivel: alt.length ? alt[Math.floor(alt.length * 0.9)] - alt[Math.floor(alt.length * 0.1)] : 99,
          miolo,
          beira,
        };
      },
      [x, z] as const,
    );
    console.log(`lugar ${dx},${dz} ${JSON.stringify(r)}`);
    const nota =
      r.miolo * 50 + r.beira * 2 + r.agua * 4 + r.desnivel * 3 + (r.total - r.grama) * 1.5;
    if (!melhor || nota < melhor.nota) melhor = { x, z, nota };
    if (r.miolo === 0 && r.beira <= 6 && r.agua <= 2 && r.desnivel < 10 && r.grama >= r.total * 0.8) {
      console.log(`lugar escolhido ${dx},${dz}`);
      melhor = { x, z, nota: -1 };
      break;
    }
  }
  if (melhor && melhor.nota >= 0) {
    console.log(`lugar sem par, o menos ruim: ${melhor.x - centro[0]},${melhor.z - centro[1]}`);
    await page.evaluate(([x, z]) => window.__brumaluz!.teleportar!(x, z), [melhor.x, melhor.z] as const);
  }
  await assentar(page);
  // o palco inteiro (e a margem) tem de ter chegado: coluna sem pedaço não seria aplainada
  for (let i = 0; i < 60; i++) {
    const faltam = await page.evaluate(() => {
      const e = window.__brumaluz!;
      const [px, , pz] = e.posicao!;
      let n = 0;
      for (let dx = -82; dx <= 82; dx += 8)
        for (let dz = -68; dz <= 68; dz += 8) {
          let tem = false;
          for (let y = 120; y > 1 && !tem; y--) tem = !!e.bloco!(Math.floor(px) + dx, y, Math.floor(pz) + dz);
          if (!tem) n++;
        }
      return n;
    });
    if (faltam === 0) break;
    if (i % 5 === 0) console.log(`esperando o chão: faltam ${faltam} colunas`);
    await page.waitForTimeout(1500);
  }
  await page.waitForTimeout(3000);
  const O = await page.evaluate(() => window.__fantasias!.montar());
  console.log(`palco ${JSON.stringify(O)}`);
  // (a malha dos pedaços refeita depois das edições demora mais no computador, em resolução
  // cheia: com menos espera, um pedaço da praça saía com o chão de antes)
  await page.waitForTimeout(20000);
  console.log(
    `conferindo ${JSON.stringify(
      await page.evaluate(([ox, y, oz]) => {
        const e = window.__brumaluz!;
        return {
          jogador: e.posicao,
          abobora: e.bloco!(ox + 53, y + 3, oz + 41),
          chao: e.bloco!(ox + 40, y + 1, oz + 40),
          palco: e.bloco!(ox + 37, y + 1, oz + 34),
        };
      }, [O.ox, O.y, O.oz] as const),
    )}`,
  );
  await page.evaluate(() => window.__fantasias!.esconder(true));
  // só o 3D na foto
  await page.evaluate(() => {
    const cena = document.getElementById('cena')!;
    for (const el of Array.from(document.body.querySelectorAll<HTMLElement>('*')))
      if (el !== cena && !el.contains(cena)) el.style.visibility = 'hidden';
  });
  passo(`montou ${tamanho}`);
  return page;
}

export const pontos = (page: Page) => page.evaluate(() => window.__fantasias!.pontos);

export async function hora(page: Page, h: number) {
  await page.evaluate((v) => window.__fantasias!.hora(v), h);
  await page.waitForTimeout(2500);
}

export async function camera(page: Page, pos: V3, alvo: V3, fov = 55) {
  await page.evaluate(([a, b, f]) => window.__fantasias!.camera(a, b, f), [pos, alvo, fov] as const);
  await page.waitForTimeout(1200);
}

export async function foto(page: Page, nome: string) {
  mkdirSync(PASTA, { recursive: true });
  await page.screenshot({ path: `${PASTA}/${nome}.jpg`, type: 'jpeg', quality: 85 });
  console.log(`FOTO ${nome}`);
}
