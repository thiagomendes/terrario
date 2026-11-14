import { expect, test, type Browser, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { PASTA_CAPTURAS } from '../playwright.config';

/**
 * Spec 023 "Alma do jogo" (fase B): o HUD de verdade (carteira, nível, cartão da missão e o
 * quadro), o baú, a banca e as festas, na Cidade Grande e no Rancho Alegre, e a carteira em
 * todo mundo. Na placa de vídeo: scripts/e2e-gpu.sh. Capturas em ALMA_PASTA.
 */
declare const process: { env: Record<string, string | undefined> };
const PASTA = process.env.ALMA_PASTA ?? `${PASTA_CAPTURAS}/alma`;
test.setTimeout(600_000);

export const TAMANHOS = {
  pc: { viewport: { width: 1280, height: 720 } },
  deitado: {
    viewport: { width: 844, height: 390 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  },
  empe: {
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  },
} as const;
export type Tamanho = keyof typeof TAMANHOS;

/** Grava um mundo do tema direto no banco do jogo (como a paridade) e abre por ?mundo=. */
export async function criarMundo(page: Page, id: string, tema: string, semente = 1337) {
  await page.goto('/manifest.webmanifest');
  await page.evaluate(
    ({ id, tema, semente }) =>
      new Promise<void>((ok, erro) => {
        const req = indexedDB.open('brumaluz', 1);
        req.onupgradeneeded = () => req.result.createObjectStore('kv');
        req.onerror = () => erro(req.error);
        req.onsuccess = () => {
          const db = req.result;
          const tx = db.transaction('kv', 'readwrite');
          const kv = tx.objectStore('kv');
          const agora = 1_700_000_000_000;
          kv.put(
            [
              {
                id,
                nome: 'Alma',
                semente,
                modo: 'criativo',
                criadoEm: agora,
                jogadoEm: agora,
                versao: 2,
                tema,
              },
            ],
            'mundos',
          );
          kv.put({ versao: 1, edicoes: {}, jogador: null, hora: -1, extras: {} }, `mundo:${id}`);
          kv.put(2, 'formato');
          tx.oncomplete = () => {
            db.close();
            ok();
          };
          tx.onerror = () => erro(tx.error);
        };
      }),
    { id, tema, semente },
  );
}

/** Abre o jogo: num tema em prévia (`?tema=`) ou num mundo gravado (`mundo`). */
export async function abrir(
  browser: Browser,
  op: { tema?: string; mundo?: { id: string; tema: string }; tamanho?: Tamanho },
): Promise<Page> {
  const ctx = await browser.newContext(TAMANHOS[op.tamanho ?? 'pc']);
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
  if (op.mundo) {
    await criarMundo(page, op.mundo.id, op.mundo.tema);
    await page.goto(`/?mundo=${op.mundo.id}`);
  } else await page.goto(`/?tema=${op.tema ?? 'cidade-grande'}`);
  await page.waitForFunction(() => window.__brumaluz?.ready === true, undefined, {
    timeout: 240_000,
  });
  await page.evaluate(() => {
    document.querySelector<HTMLElement>('.entrada')?.setAttribute('hidden', '');
    const e = window.__brumaluz!;
    e.pausarDia = true;
    e.hora = 0.42;
    e.definirClima?.('limpo');
    window.dispatchEvent(new Event('resize'));
  });
  return page;
}

export async function assentar(page: Page, minimo = 12) {
  let antes = -1;
  for (let i = 0; i < 30; i++) {
    await page.waitForTimeout(1200);
    const n = await page.evaluate(() => window.__brumaluz!.chunksCarregados ?? 0);
    if (n === antes && n >= minimo) break;
    antes = n;
  }
  await page.waitForTimeout(600);
}

export async function foto(page: Page, nome: string) {
  mkdirSync(PASTA, { recursive: true });
  await page.screenshot({ path: `${PASTA}/${nome}.png` });
}

/** Os avisos de boas-vindas cobrem o meio da tela nas fotos. */
export async function semAvisos(page: Page) {
  await page.addStyleTag({ content: '.toast-area { display: none !important; }' });
}

/** As caixas da alma e as do HUD que elas não podem tapar (px CSS). */
async function caixas(page: Page) {
  return page.evaluate(() => {
    const vis = (el: Element) => {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return (
        r.width > 2 &&
        r.height > 2 &&
        cs.display !== 'none' &&
        cs.visibility !== 'hidden' &&
        Number(cs.opacity) > 0.05
      );
    };
    const caixa = (el: Element) => {
      const r = el.getBoundingClientRect();
      return {
        x: r.left,
        y: r.top,
        w: r.width,
        h: r.height,
        nome: (el.className || el.tagName).toString().slice(0, 40),
      };
    };
    const alma = Array.from(document.querySelectorAll('[data-alma-carteira], [data-alma-missao]'))
      .filter(vis)
      .map(caixa);
    const hud = Array.from(
      document.querySelectorAll(
        '.hud-info, .menu-hud, .bussola, .minimapa, .barra, [data-botao-mochila], .toque .joystick, .toque .botoes > *, .toque .topo > *, .toque .correr, .botao-amigos, .hud .chip-hud, .status .linha-icones',
      ),
    )
      .filter(vis)
      .filter((el) => !el.closest('[data-alma-carteira], [data-alma-missao]'))
      .map(caixa);
    return { alma, hud, W: innerWidth, H: innerHeight };
  });
}

function sobrepostas(c: Awaited<ReturnType<typeof caixas>>): string[] {
  const out: string[] = [];
  const folga = 2;
  for (const a of c.alma) {
    if (a.x < 0 || a.y < 0 || a.x + a.w > c.W || a.y + a.h > c.H)
      out.push(`${a.nome} fora da tela`);
    for (const b of c.hud) {
      const x = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
      const y = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
      if (x > folga && y > folga) out.push(`${a.nome} × ${b.nome}`);
    }
  }
  return out;
}

const almaUi = (page: Page) =>
  page.evaluate(() => {
    const u = (window as unknown as { __almaUi?: { vista(): unknown } }).__almaUi;
    return u?.vista() ?? null;
  });

test('HUD da alma: a carteira em todo mundo, o cartão onde há missões, nada tapa o HUD', async ({
  browser,
}) => {
  const falhas: string[] = [];
  const casos: Array<[string, Tamanho]> = [];
  for (const t of ['pc', 'deitado', 'empe'] as Tamanho[])
    for (const tema of ['cidade-grande', 'rancho-alegre', 'bruma-e-luz']) casos.push([tema, t]);
  for (const [tema, tamanho] of casos) {
    const page = await abrir(browser, { tema, tamanho });
    await semAvisos(page);
    await assentar(page);
    const missoes = tema !== 'bruma-e-luz';
    // o quadro abre sozinho na primeira visita (prévia: sempre): fecha para medir o HUD
    if (missoes) {
      await page.waitForSelector('[data-alma-quadro]', { timeout: 20_000 });
      await page.waitForTimeout(600);
      await foto(page, `quadro-${tema}-${tamanho}`);
      await page.locator('[data-alma-fechar]').first().click();
      await page.waitForTimeout(400);
    }
    await page.waitForSelector('[data-alma-carteira]', { timeout: 20_000 });
    if (missoes)
      await page.waitForSelector('[data-alma-missao]:not([hidden])', { timeout: 20_000 });
    await page.waitForTimeout(600);
    const c = await caixas(page);
    const nome = `hud-${tema}-${tamanho}`;
    await foto(page, nome);
    for (const s of sobrepostas(c)) falhas.push(`${nome}: ${s}`);
    // só a Cidade e o Rancho têm o cartão; o chip do diário sai deles
    expect(c.alma.length, nome).toBe(missoes ? 2 : 1);
    if (missoes) expect(await page.locator('.missao-hud:visible').count(), nome).toBe(0);
    expect(!!(await almaUi(page)), nome).toBe(missoes);
    await page.context().close();
  }
  expect(falhas).toEqual([]);
});

test('o quadro de missões aparece sozinho na primeira visita (até 3 s), e só nela', async ({
  browser,
}) => {
  for (const tamanho of ['pc', 'deitado', 'empe'] as Tamanho[])
    for (const tema of ['cidade-grande', 'rancho-alegre']) {
      const id = `alma-quadro-${tema}-${tamanho}`;
      const page = await abrir(browser, { mundo: { id, tema }, tamanho });
      await semAvisos(page);
      const t0 = Date.now();
      await page.waitForSelector('[data-alma-quadro]', { timeout: 15_000 });
      const ms = Date.now() - t0;
      console.log(`alma: quadro em ${ms} ms (${tema}, ${tamanho})`);
      expect(ms).toBeLessThan(3000);
      // o prêmio grande e as moedinhas à vista
      await expect(page.locator('[data-alma-quadro] .premio .alma-moedas').first()).toBeVisible();
      await page.waitForTimeout(900);
      await foto(page, `quadro-${tema}-${tamanho}`);
      // brincar: fixa a missão e o cartão mostra ela
      const alvo = page.locator('[data-alma-jogar]').last();
      const missao = await alvo.getAttribute('data-alma-jogar');
      if (tamanho === 'pc') await alvo.click();
      else await alvo.tap();
      await page.waitForFunction(
        (m) => document.querySelector('[data-alma-missao]')?.getAttribute('data-missao') === m,
        missao,
        { timeout: 5000 },
      );
      expect(await page.locator('[data-alma-quadro]').count()).toBe(0);
      await page.waitForTimeout(600);
      await foto(page, `cartao-${tema}-${tamanho}`);
      // reabrir o mesmo mundo: o quadro não abre de novo
      await page.evaluate(() => window.__brumaluz!.salvar?.());
      await page.reload();
      await page.waitForFunction(() => window.__brumaluz?.ready === true, undefined, {
        timeout: 240_000,
      });
      await page.evaluate(() =>
        document.querySelector<HTMLElement>('.entrada')?.setAttribute('hidden', ''),
      );
      await page.waitForSelector('[data-alma-missao]:not([hidden])', { timeout: 15_000 });
      await page.waitForTimeout(3500);
      expect(await page.locator('[data-alma-quadro]').count()).toBe(0);
      // e a fixada continua a do cartão (o núcleo guardou com o mundo)
      expect(await page.locator('[data-alma-missao]').getAttribute('data-missao')).toBe(missao);
      await page.context().close();
    }
});

/** Ganho de mentirinha só no perfil do aparelho (prévia: nada é guardado), para as fotos. */
async function darAoPerfil(
  page: Page,
  g: { moedas: number; xp: number; pontos?: Record<string, number> },
) {
  await page.evaluate((g) => {
    const p = (window as unknown as { __almaCrianca: { aplicarGanho(g: unknown): unknown } })
      .__almaCrianca;
    p.aplicarGanho({ pontos: {}, ...g });
  }, g);
  await page.waitForTimeout(2600);
}
const tocar = async (page: Page, sel: string, toque: boolean) => {
  const l = page.locator(sel).first();
  if (toque) await l.tap({ timeout: 15_000 });
  else await l.click({ timeout: 15_000 });
  await page.waitForTimeout(500);
};
/** O baú: no toque, a carteira; no computador, a tecla H (o ponteiro fica preso no jogo). */
async function abrirBau(page: Page, toque: boolean) {
  if (toque) return tocar(page, '[data-alma-carteira]', true);
  await page.keyboard.press('KeyH');
  await page.waitForSelector('[data-alma-painel]', { timeout: 5000 });
  await page.waitForTimeout(400);
}
const contar = (page: Page, item: string) =>
  page.evaluate((item) => window.__brumaluz!.inventario!.contar(item), item);

test('o baú: álbum, nível, habilidades e a banca de verdade (com a confirmação e as recusas)', async ({
  browser,
}) => {
  test.setTimeout(1_500_000);
  for (const tamanho of ['pc', 'deitado', 'empe'] as Tamanho[])
    for (const tema of ['cidade-grande', 'rancho-alegre', 'bruma-e-luz']) {
      const toque = tamanho !== 'pc';
      const page = await abrir(browser, { tema, tamanho });
      await semAvisos(page);
      await assentar(page);
      const n = (s: string) => `bau-${tema}-${tamanho}-${s}`;
      const missoes = tema !== 'bruma-e-luz';
      if (missoes) {
        await page.waitForSelector('[data-alma-quadro]', { timeout: 20_000 });
        await tocar(page, '[data-alma-fechar]', toque);
      }
      // sem moedinha: a banca mostra o potinho e a recusa calma
      await page.waitForSelector('[data-alma-carteira]', { timeout: 20_000 });
      await abrirBau(page, toque);
      const abas = await page
        .locator('[data-alma-aba]')
        .evaluateAll((l) => l.map((b) => b.getAttribute('data-alma-aba')));
      expect(abas).toEqual(
        missoes ? ['album', 'nivel', 'habilidades', 'banca'] : ['nivel', 'habilidades'],
      );
      if (missoes) {
        await foto(page, n('1-album'));
        await tocar(page, '[data-alma-aba="banca"]', toque);
        await tocar(page, '[data-alma-banca] [data-item]', toque);
        await page.waitForSelector('[data-alma-recusa="saldo"]');
        await foto(page, n('2-sem-moedas'));
        await tocar(page, '[data-alma-ta-bom]', toque);
        await tocar(page, '[data-alma-fechar]', toque);
      } else await tocar(page, '[data-alma-fechar]', toque);
      // meio de caminho: moedinhas, nível 3 e estrelas
      await darAoPerfil(page, {
        moedas: 20,
        xp: 130,
        pontos: { construtor: 21, explorador: 7, bichos: 16, fazendeiro: 33, cozinheiro: 4 },
      });
      await foto(page, n('3-hud'));
      await abrirBau(page, toque);
      await tocar(page, '[data-alma-aba="nivel"]', toque);
      await page.waitForTimeout(400);
      await foto(page, n('4-nivel'));
      await tocar(page, '[data-alma-aba="habilidades"]', toque);
      await foto(page, n('5-habilidades'));
      expect(await page.locator('[data-hab="fazendeiro"]').getAttribute('data-estrelas')).toBe('3');
      if (missoes) {
        // a banca de verdade: confirmar, o núcleo entrega no inventário, a carteira desconta
        await tocar(page, '[data-alma-aba="banca"]', toque);
        await foto(page, n('6-banca'));
        const item =
          tema === 'cidade-grande'
            ? { id: 'flores', bloco: 'bloco:9', qtd: 6 }
            : { id: 'feno', bloco: 'bloco:81', qtd: 4 };
        const antes = await contar(page, item.bloco);
        const saldo = Number(await page.locator('[data-alma-saldo]').first().textContent());
        await tocar(page, `[data-alma-banca] [data-item="${item.id}"]`, toque);
        await page.waitForSelector(`[data-alma-confirmar="${item.id}"]`);
        await foto(page, n('7-confirmar'));
        await tocar(page, '[data-alma-sim]', toque);
        await page.waitForSelector('[data-alma-painel="banca"]');
        await page.waitForFunction(
          ({ b, q }) => window.__brumaluz!.inventario!.contar(b) >= q,
          { b: item.bloco, q: antes + item.qtd },
          { timeout: 8000 },
        );
        // de novo, logo em seguida: a banca pede um tempinho (a ampulheta, sem bronca)
        await tocar(page, `[data-alma-banca] [data-item="${item.id}"]`, toque);
        await tocar(page, '[data-alma-sim]', toque);
        await page.waitForSelector('[data-alma-recusa="espera"]', { timeout: 6000 });
        await foto(page, n('9-espera'));
        await tocar(page, '[data-alma-ta-bom]', toque);
        expect((await page.locator('[data-alma-saldo]').first().textContent())?.trim()).toBe(
          String(saldo - 3),
        );
        await page.waitForTimeout(800);
        await foto(page, n('8-comprou'));
      }
      await tocar(page, '[data-alma-fechar]', toque);
      await page.context().close();
    }
});
