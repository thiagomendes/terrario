import type { Browser, Page } from '@playwright/test';

/**
 * Spec 030: o palco dos testes do guia da missão (não é um teste): grava um mundo do tema
 * com as missões de antes feitas, abre no tamanho pedido e espera o mundo assentar.
 */
export const TAMANHOS = {
  pc: { viewport: { width: 1280, height: 720 } },
  deitado: { viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  empe: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
} as const;
export type Tamanho = keyof typeof TAMANHOS;

export async function criarMundo(
  page: Page,
  id: string,
  tema: string,
  extras: Record<string, unknown> = {},
  semente = 1337,
): Promise<void> {
  await page.goto('/manifest.webmanifest');
  await page.evaluate(
    ({ id, tema, extras, semente }) =>
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
            [{ id, nome: 'Guia', semente, modo: 'criativo', criadoEm: agora, jogadoEm: agora, versao: 2, tema }],
            'mundos',
          );
          kv.put({ versao: 1, edicoes: {}, jogador: null, hora: -1, extras }, `mundo:${id}`);
          kv.put(2, 'formato');
          tx.oncomplete = () => {
            db.close();
            ok();
          };
          tx.onerror = () => erro(tx.error);
        };
      }),
    { id, tema, extras, semente },
  );
}

export async function assentar(page: Page, minimo = 12): Promise<void> {
  let antes = -1;
  for (let i = 0; i < 30; i++) {
    await page.waitForTimeout(1200);
    const n = await page.evaluate(() => window.__brumaluz!.chunksCarregados ?? 0);
    if (n === antes && n >= minimo) break;
    antes = n;
  }
  await page.waitForTimeout(600);
}

/** Abre um mundo gravado no tamanho pedido, sem a tela de entrada, de dia e sem avisos. */
export async function abrirMundo(
  browser: Browser,
  op: { id: string; tema: string; extras?: Record<string, unknown>; tamanho: Tamanho },
): Promise<Page> {
  const ctx = await browser.newContext(TAMANHOS[op.tamanho]);
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
  await criarMundo(page, op.id, op.tema, op.extras ?? {});
  await page.goto(`/?mundo=${op.id}`);
  await page.waitForFunction(() => window.__brumaluz?.ready === true, undefined, { timeout: 240_000 });
  await page.evaluate(() => {
    document.querySelector<HTMLElement>('.entrada')?.setAttribute('hidden', '');
    const e = window.__brumaluz!;
    e.pausarDia = true;
    e.hora = 0.42;
    e.definirClima?.('limpo');
    window.dispatchEvent(new Event('resize'));
  });
  await page.addStyleTag({ content: '.toast-area { display: none !important; }' });
  return page;
}

/** Toca num elemento (toque de verdade no celular, clique no computador). */
export async function tocar(page: Page, seletor: string): Promise<void> {
  const el = page.locator(seletor).first();
  await el.waitFor({ state: 'visible', timeout: 20_000 });
  const toque = await page.evaluate(() => matchMedia('(pointer: coarse)').matches);
  if (toque) await el.tap();
  else await el.click();
}

/** Abre a roda do menu e escolhe um item. */
export async function escolherNaRoda(page: Page, item: string): Promise<void> {
  await tocar(page, '.menu-hud');
  await tocar(page, `.roda.aberta button.ativo[data-item="${item}"]`);
}
