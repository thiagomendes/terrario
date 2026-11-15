import type { Browser, Page } from '@playwright/test';

/**
 * Spec 030: o palco dos testes do guia da missão (não é um teste): grava um mundo do tema
 * com as missões de antes feitas, abre no tamanho pedido e espera o mundo assentar.
 */
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
declare const process: { env: Record<string, string | undefined> };
/** Tamanho do vídeo da página (vezes a tela): menor pesa menos na gravação. */
const ESCALA_VIDEO = Number(process.env.VIDEO_ESCALA ?? 2);

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
            [
              {
                id,
                nome: 'Guia',
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
  op: {
    id: string;
    tema: string;
    extras?: Record<string, unknown>;
    tamanho: Tamanho;
    /** Grava o vídeo da página (com a interface) nesta pasta, no dobro do tamanho da tela. */
    video?: string;
  },
): Promise<Page> {
  const t = TAMANHOS[op.tamanho];
  const ctx = await browser.newContext(
    op.video
      ? {
          ...t,
          recordVideo: {
            dir: op.video,
            size: {
              width: Math.round(t.viewport.width * ESCALA_VIDEO),
              height: Math.round(t.viewport.height * ESCALA_VIDEO),
            },
          },
        }
      : t,
  );
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
  await tocar(page, '.menu-hud:visible');
  await tocar(page, `.roda.aberta button.ativo[data-item="${item}"]`);
}

/**
 * Anda pela trilha com o controle de verdade (joystick inteiro, sem correr, sem teleporte),
 * como uma criança que segue as pegadinhas, até chegar no alvo de agora. Devolve o tempo.
 */
export async function andarPelaTrilha(
  page: Page,
  teto = 120_000,
): Promise<{ s: number; chegou: boolean; alvo: string | null }> {
  return page.evaluate(async (teto) => {
    const e = window.__brumaluz!;
    const g = window.__guia!;
    const ctl = e.controleDireto!;
    const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));
    const ini = performance.now();
    const chave = g.alvo()?.chave ?? null;
    ctl.tecla('rapido', false);
    let parado = 0;
    let desvio = 0;
    let lado = 1;
    let ultimo = e.jogadorPes!();
    let chegou = false;
    for (;;) {
      if (performance.now() - ini > teto) break;
      const a = g.alvo();
      if (!a || a.chave !== chave || g.chegou()) {
        chegou = !!chave && (g.chegou() || !a || a.chave !== chave);
        break;
      }
      // pulo repetido no modo criativo liga o voo: a criança anda no chão
      if (ctl.voando()) e.voar?.(false);
      const rota = g.caminho();
      const p = e.jogadorPes!();
      if (rota.length < 2) {
        await espera(100);
        continue;
      }
      let i = 0;
      let d2 = Infinity;
      for (let k = 0; k < rota.length; k++) {
        const q = (rota[k][0] - p[0]) ** 2 + (rota[k][2] - p[2]) ** 2;
        if (q < d2) {
          d2 = q;
          i = k;
        }
      }
      const prox = rota[Math.min(rota.length - 1, i + 3)];
      const fim = i >= rota.length - 2;
      const [tx, tz] = fim ? [a.x, a.z] : [prox[0], prox[2]];
      // vira o olhar aos poucos (como o dedo de uma criança, sem tranco)
      const quer = Math.atan2(tx - p[0], tz - p[2]);
      const yaw = e.rotacao?.[1] ?? quer;
      let dy = quer - yaw;
      dy = Math.atan2(Math.sin(dy), Math.cos(dy));
      e.apontar!(yaw + Math.max(-0.15, Math.min(0.15, dy)), 0.38);
      if (parado > 8 && desvio <= 0) {
        desvio = 12;
        lado = -lado;
      }
      if (desvio > 0) desvio--;
      ctl.mover(desvio > 0 ? 0.5 : 1, desvio > 0 ? lado : 0);
      const andou = Math.hypot(p[0] - ultimo[0], p[2] - ultimo[2]);
      parado = andou < 0.05 ? parado + 1 : 0;
      ultimo = p;
      ctl.tecla('pular', (prox && prox[1] > p[1] + 0.4) || parado > 4);
      await espera(60);
    }
    ctl.mover(0, 0);
    ctl.tecla('pular', false);
    return { s: (performance.now() - ini) / 1000, chegou, alvo: chave };
  }, teto);
}

/** O que a carteira mostra (moedinhas). */
export async function moedasNoCanto(page: Page): Promise<number> {
  return Number(await page.locator('[data-alma-moedas]').textContent());
}
