import { expect, test, type Browser, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { PASTA_CAPTURAS } from '../playwright.config';
import { escolherNaRoleta } from './roleta-palco';

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
    const alma = Array.from(document.querySelectorAll('[data-alma-carteira], [data-alma-missao], [data-guia-placa]'))
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

/** Spec 030: o quadro de missões mora na roda do menu (ele nunca abre sozinho). */
async function abrirQuadro(page: Page, toque: boolean) {
  const clicar = async (sel: string) => {
    const l = page.locator(sel).first();
    await l.waitFor({ state: 'visible', timeout: 15_000 });
    if (toque) await l.tap();
    else await l.click();
  };
  // no computador a roda abre pela tecla O (o ponteiro fica preso no jogo)
  if (toque) await clicar('[data-botao-roda]');
  else await page.keyboard.press('KeyO');
  await escolherNaRoleta(page, 'missoes');
  await page.waitForSelector('[data-alma-quadro]', { timeout: 15_000 });
}

const almaUi = (page: Page) =>
  page.evaluate(() => {
    const u = (window as unknown as { __almaUi?: { vista(): unknown } }).__almaUi;
    return u?.vista() ?? null;
  });

test('HUD da alma: a carteira em todo mundo, o selinho e a placa onde há missões, nada tapa o HUD', async ({
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
    // spec 030: nada abre sozinho; o quadro vem pela roda e o "brincar" acende o selinho
    await page.waitForSelector('[data-alma-carteira]', { timeout: 20_000 });
    await page.waitForTimeout(2500);
    expect(await page.locator('[data-alma-quadro]').count(), tema).toBe(0);
    if (missoes) {
      await abrirQuadro(page, tamanho !== 'pc');
      await page.waitForTimeout(600);
      await foto(page, `quadro-${tema}-${tamanho}`);
      const j = page.locator('[data-alma-jogar]').first();
      if (tamanho === 'pc') await j.click();
      else await j.tap();
      await page.waitForSelector('[data-alma-missao]:not([hidden])', { timeout: 20_000 });
      await page.waitForTimeout(2500);
    }
    const c = await caixas(page);
    const nome = `hud-${tema}-${tamanho}`;
    await foto(page, nome);
    for (const s of sobrepostas(c)) falhas.push(`${nome}: ${s}`);
    // só a Cidade e o Rancho têm o selinho (e a placa, se o lugar está à vista)
    expect(c.alma.length, nome).toBeGreaterThanOrEqual(missoes ? 2 : 1);
    expect(c.alma.length, nome).toBeLessThanOrEqual(missoes ? 3 : 1);
    if (missoes) expect(await page.locator('.missao-hud:visible').count(), nome).toBe(0);
    expect(!!(await almaUi(page)), nome).toBe(missoes);
    await page.context().close();
  }
  expect(falhas).toEqual([]);
});

test('030: o quadro nunca abre sozinho; vem pela roda; o selinho guarda a missão escolhida', async ({
  browser,
}) => {
  for (const tamanho of ['pc', 'deitado', 'empe'] as Tamanho[])
    for (const tema of ['cidade-grande', 'rancho-alegre']) {
      const id = `alma-quadro-${tema}-${tamanho}`;
      const page = await abrir(browser, { mundo: { id, tema }, tamanho });
      await semAvisos(page);
      await page.waitForSelector('[data-alma-carteira]', { timeout: 20_000 });
      await page.waitForTimeout(4000);
      expect(await page.locator('[data-alma-quadro]').count()).toBe(0);
      expect(await page.locator('[data-alma-missao]:not([hidden])').count()).toBe(0);
      await abrirQuadro(page, tamanho !== 'pc');
      // o prêmio grande e as moedinhas à vista
      await expect(page.locator('[data-alma-quadro] .premio .alma-moedas').first()).toBeVisible();
      await page.waitForTimeout(900);
      await foto(page, `quadro-${tema}-${tamanho}`);
      // brincar: fixa a missão e o selinho mostra ela
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
      await foto(page, `selinho-${tema}-${tamanho}`);
      // reabrir o mesmo mundo: nada abre, e a fixada continua no selinho (o núcleo guardou)
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
  // os níveis novos fazem festa (uma de cada vez): fecha cada uma com o "oba"
  for (let i = 0; i < 12; i++) {
    const oba = page.locator('[data-alma-festa] [data-alma-oba]');
    try {
      await oba.first().waitFor({ timeout: 6000 });
    } catch {
      break;
    }
    await oba.first().click({ force: true });
    await page.waitForTimeout(900);
  }
  await page.waitForTimeout(1500);
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
      void missoes;
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

// ---------------------------------------------------------------- T08: o laço até a festa
const RITMO = Number(process.env.ALMA_RITMO ?? 6000);
type Fantasma = { x: number; y: number; z: number; bloco: number; canteiro: number };

/** Nunca duas festas por cima uma da outra; quanto o botão de cada uma demora (a cada 50 ms). */
async function vigiarFestas(page: Page) {
  await page.evaluate(() => {
    const w = window as unknown as {
      __festasJuntas: number;
      __festaBotao: Record<string, number>;
    };
    w.__festasJuntas = 0;
    w.__festaBotao = {};
    let atual: Element | null = null;
    let t0 = 0;
    setInterval(() => {
      const f = document.querySelectorAll('[data-alma-festa]');
      w.__festasJuntas = Math.max(w.__festasJuntas, f.length);
      const el = f[0] ?? null;
      if (el !== atual) {
        atual = el;
        t0 = performance.now();
      }
      const tipo = el?.getAttribute('data-alma-festa');
      if (el && tipo && !(tipo in w.__festaBotao) && el.querySelector('[data-alma-oba]'))
        w.__festaBotao[tipo] = performance.now() - t0;
    }, 50);
  });
}

/** Espera a festa e o botão, confere quanto ele demorou, fotografa e fecha com um toque. */
async function festa(
  page: Page,
  tipo: string,
  nome: string,
  toque: boolean,
  botao = '[data-alma-oba]',
) {
  await page.waitForSelector(`[data-alma-festa="${tipo}"] [data-alma-oba]`, { timeout: 30_000 });
  const ms = await page.evaluate(
    (t) => (window as unknown as { __festaBotao: Record<string, number> }).__festaBotao[t],
    tipo,
  );
  console.log(`alma: botões da festa ${tipo} em ${Math.round(ms)} ms`);
  // spec: até 2,5 s (missão com até 5 moedas) e 1,7 s (nível), com a folga da amostragem
  expect(ms).toBeLessThan(tipo === 'missao' ? 2600 : 1850);
  await page.waitForTimeout(500);
  await foto(page, nome);
  await tocar(page, `[data-alma-festa="${tipo}"] ${botao}`, toque);
  await page.waitForSelector(`[data-alma-festa="${tipo}"]`, { state: 'detached', timeout: 5000 });
}

/**
 * Vídeo para o relatório (ALMA_VIDEO=1): quadros da tela em sequência (o vídeo do Playwright
 * corta a parte de baixo na placa de vídeo). Devolve o "parar".
 */
function filmar(page: Page, nome: string): () => Promise<void> {
  if (!process.env.ALMA_VIDEO) return async () => undefined;
  const dir = `${PASTA}/quadros-${nome}`;
  mkdirSync(dir, { recursive: true });
  let vivo = true;
  let i = 0;
  const laco = (async () => {
    while (vivo) {
      const t = Date.now();
      await page
        .screenshot({
          path: `${dir}/${String(i++).padStart(5, '0')}.jpg`,
          type: 'jpeg',
          quality: 80,
        })
        .catch(() => undefined);
      await page.waitForTimeout(Math.max(0, 100 - (Date.now() - t))).catch(() => undefined);
    }
  })();
  return async () => {
    vivo = false;
    await laco;
  };
}

/** Enche um fantasma da obra pela mira (como no teste do canteiro, spec 014). */
async function encherUm(page: Page, lista: Fantasma[]): Promise<boolean> {
  for (const f of lista.slice(0, 6))
    for (const [dx, dz, dy] of [
      [0, -2.6, 1.2],
      [0, 2.6, 1.2],
      [-2.6, 0, 1.2],
      [2.6, 0, 1.2],
      [0, -1.8, 2.8],
      [0, 1.8, 2.8],
    ]) {
      const ok = await page.evaluate(
        ([f, dx, dz, dy]) => {
          const e = window.__brumaluz!;
          e.voar?.(true);
          e.teleportar!(f.x + 0.5 + dx, f.z + 0.5 + dz, f.y + dy);
          e.mirarPonto!(f.x + 0.5, f.y + 0.5, f.z + 0.5);
          return !!e.fantasmaNaMira?.();
        },
        [f, dx, dz, dy] as const,
      );
      if (!ok) continue;
      const antes = await page.evaluate(() => window.__brumaluz!.obraColocados ?? 0);
      await page.evaluate(() => window.__brumaluz!.usarOuColocar!());
      await page.waitForTimeout(140);
      if ((await page.evaluate(() => window.__brumaluz!.obraColocados ?? 0)) > antes) return true;
    }
  return false;
}

test('laço da Cidade: c1 no ritmo de criança até o capacete, a festa da missão e a do nível', async ({
  browser,
}) => {
  test.setTimeout(900_000);
  const ctx = await browser.newContext({
    ...TAMANHOS.pc,
  });
  const page = await ctx.newPage();
  await page.goto('/?tema=cidade-grande');
  await page.waitForFunction(() => window.__brumaluz?.ready === true, undefined, {
    timeout: 240_000,
  });
  await page.evaluate(() => {
    document.querySelector<HTMLElement>('.entrada')?.setAttribute('hidden', '');
    const e = window.__brumaluz!;
    e.pausarDia = true;
    e.hora = 0.42;
    e.definirClima?.('limpo');
  });
  await semAvisos(page);
  await assentar(page);
  await vigiarFestas(page);
  const t0 = Date.now();
  await abrirQuadro(page, false);
  await page.waitForTimeout(1500);
  await tocar(page, '[data-alma-jogar="c1"]', false);
  // a colher do pedreiro na mão
  await page.waitForFunction(() => (window.__brumaluz!.colherRecebida ?? 0) > 0, undefined, {
    timeout: 30_000,
  });
  const mao = await page.evaluate(() => {
    const i = window.__brumaluz!.inventario as unknown as {
      obter(i: number): { item: string } | null;
    };
    for (let k = 0; k < 9; k++) if (i.obter(k)?.item === 'colher_pedreiro') return k;
    return 0;
  });
  await page.evaluate((k) => window.__brumaluz!.selecionarSlot!(k), mao);
  let postos = 0;
  let parar = async () => undefined as void;
  const obraTotal = (
    await page.evaluate(() =>
      (window.__brumaluz!.fantasmasPerto?.() ?? []).filter((f) => f.canteiro === 1),
    )
  ).length;
  for (let volta = 0; volta < 80; volta++) {
    const lista = await page.evaluate(() =>
      (window.__brumaluz!.fantasmasPerto?.() ?? []).filter((f) => f.canteiro === 1),
    );
    if (!lista.length) break;
    // a mira pegou um morador e abriu as trocas: fecha (a criança fecharia)
    if (
      await page.evaluate(
        () => !!document.body.dataset.overlay && !document.querySelector('[data-alma-festa]'),
      )
    ) {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
    }
    if (await encherUm(page, lista)) {
      postos++;
      // a bolinha do cartão andou (o núcleo mandou) e faz o plim
      if (postos === 5) await foto(page, 'laco-cidade-1-cartao-andando');
      if (postos === obraTotal - 3) parar = filmar(page, 'cidade');
      await page.waitForTimeout(RITMO);
    }
  }
  await festa(page, 'missao', 'laco-cidade-2-festa-missao', false, '[data-alma-vestir]');
  const minutos = (Date.now() - t0) / 60_000;
  console.log(`alma: c1 em ${minutos.toFixed(1)} min (${postos} blocos, um a cada ${RITMO} ms)`);
  if (RITMO >= 6000) expect(minutos).toBeLessThan(3);
  // o nível 2 vem logo depois (na fila, sem sobrepor)
  await festa(page, 'nivel', 'laco-cidade-3-festa-nivel', false);
  await page.waitForTimeout(2500);
  await parar();
  await foto(page, 'laco-cidade-4-depois');
  const juntas = await page.evaluate(
    () => (window as unknown as { __festasJuntas: number }).__festasJuntas,
  );
  expect(juntas).toBe(1);
  // c1 dá 3 e o nível 2 dá 2; o capacete vestido
  expect(await page.locator('[data-alma-moedas]').textContent()).toBe('5');
  expect(await page.locator('[data-alma-carteira]').getAttribute('data-nivel')).toBe('2');
  const vestida = await page.evaluate(
    () => window.__brumaluz!.personagem!.aparencia().fantasia?.id,
  );
  expect(vestida).toBe('capacete-obra');
  await ctx.close();
});

test('laço do Rancho: r1 até a Caipira, e reabrir o jogo mantém tudo', async ({ browser }) => {
  test.setTimeout(900_000);
  const id = 'alma-laco-rancho';
  const ctx = await browser.newContext({
    ...TAMANHOS.deitado,
  });
  const page = await ctx.newPage();
  await criarMundo(page, id, 'rancho-alegre');
  await page.goto(`/?mundo=${id}`);
  await page.waitForFunction(() => window.__brumaluz?.ready === true, undefined, {
    timeout: 240_000,
  });
  await page.evaluate(() => {
    document.querySelector<HTMLElement>('.entrada')?.setAttribute('hidden', '');
    const e = window.__brumaluz!;
    e.pausarDia = true;
    e.hora = 0.42;
    e.definirClima?.('limpo');
  });
  await semAvisos(page);
  await assentar(page);
  await vigiarFestas(page);
  const t0 = Date.now();
  await abrirQuadro(page, true);
  await page.waitForTimeout(1500);
  await tocar(page, '[data-alma-jogar="r1"]', true);
  // uma roça madura na frente da criança (5 pés de trigo maduro)
  const pes = await page.evaluate(() => {
    const e = window.__brumaluz!;
    const [x0, y0, z0] = e.posicao!;
    const x = Math.floor(x0);
    const y = Math.floor(y0);
    const z = Math.floor(z0) + 3;
    const out: [number, number, number][] = [];
    for (let i = -2; i <= 2; i++) {
      for (let dz = 0; dz < 2; dz++)
        for (let dy = 0; dy < 4; dy++) e.definirBloco!(x + i, y + dy, z + dz - 1, 0);
      e.definirBloco!(x + i, y - 1, z, 68);
      e.definirBloco!(x + i, y, z, 0);
      out.push([x + i, y, z]);
    }
    return out;
  });
  await page.waitForTimeout(1000);
  await page.evaluate((pes) => {
    const e = window.__brumaluz!;
    for (const [x, y, z] of pes) e.definirBloco!(x, y, z, 72);
  }, pes);
  await page.waitForTimeout(1500);
  await foto(page, 'laco-rancho-1-roca');
  const pararR = filmar(page, 'rancho');
  for (const [x, y, z] of pes) {
    await page.evaluate(
      ([x, y, z]) => {
        const e = window.__brumaluz!;
        e.mirarPonto!(x + 0.5, y + 0.4, z + 0.5);
        e.minerar!(0.6, true);
      },
      [x, y, z] as const,
    );
    await page.waitForTimeout(RITMO);
  }
  await festa(page, 'missao', 'laco-rancho-2-festa-caipira', true, '[data-alma-vestir]');
  const minutos = (Date.now() - t0) / 60_000;
  console.log(`alma: r1 em ${minutos.toFixed(1)} min`);
  expect(minutos).toBeLessThan(3);
  // r1 dá 20 XP e as 5 colheitas 10: ainda no nível 1 (o 2 vem com 40), sem festa de nível
  await page.waitForTimeout(2500);
  await pararR();
  expect(await page.locator('[data-alma-festa]').count()).toBe(0);
  await foto(page, 'laco-rancho-4-depois');
  expect(await page.evaluate(() => window.__brumaluz!.personagem!.aparencia().fantasia?.id)).toBe(
    'caipira',
  );
  const moedas = await page.locator('[data-alma-moedas]').textContent();
  expect(Number(moedas)).toBe(3);
  // reabrir: a carteira, o nível, a fantasia e a missão feita continuam
  await page.evaluate(() => window.__brumaluz!.salvar?.());
  await page.reload();
  await page.waitForFunction(() => window.__brumaluz?.ready === true, undefined, {
    timeout: 240_000,
  });
  await page.evaluate(() =>
    document.querySelector<HTMLElement>('.entrada')?.setAttribute('hidden', ''),
  );
  await page.waitForSelector('[data-alma-carteira]', { timeout: 20_000 });
  await page.waitForTimeout(2000);
  expect(await page.locator('[data-alma-moedas]').textContent()).toBe(moedas);
  expect(await page.locator('[data-alma-carteira]').getAttribute('data-nivel')).toBe('1');
  // a r1 acabou: nenhuma missão escolhida (o selinho só volta com outro "brincar")
  expect(await page.locator('[data-alma-missao]:not([hidden])').count()).toBe(0);
  await abrirBau(page, true);
  await page.waitForSelector('[data-alma-painel="album"]');
  expect(await page.locator('[data-missao="r1"].feita').count()).toBe(1);
  expect(await page.locator('[data-fantasia="caipira"].tem').count()).toBe(1);
  await foto(page, 'laco-rancho-5-reaberto-album');
  await ctx.close();
});
