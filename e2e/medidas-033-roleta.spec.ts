import { test, type Browser, type CDPSession, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { assentar, criarMundo } from './guia-palco';
import { gravarTela, navegadorJanelaGrande } from './gravarTela033';

/**
 * Spec 033 (fotos e vídeo, não roda na suíte): a roleta do menu. Só com ESBOCO_ROLETA:
 * - fotos: em cada mundo (MUNDOS=vila-neon,cidade-grande,rancho-alegre,padrao), a câmera do
 *   começo com a roleta fechada, aberta (com "Fechar"), no meio do arraste, Gestos no meio,
 *   dentro de Gestos (com "Voltar"), o boneco dançando e o item do mundo (na Vila Neon, de
 *   patins, "Tirar patins"; onde há missões, "Missões"). Deitado e em pé, de dia e de noite
 *   (ROLETA_HORA=noite);
 * - video: uma sessão "de criança de 3 anos" (arrasta devagar, escolhe, entra em gestos, volta).
 * Toques e arrastes de dedo de verdade (pelo protocolo do Chromium).
 */
declare const process: { env: Record<string, string | undefined> };
const QUAL = process.env.ESBOCO_ROLETA ?? '';
test.skip(!QUAL, 'fotos só com ESBOCO_ROLETA');
test.setTimeout(1_800_000);
test.describe.configure({ mode: 'parallel' });
const PASTA = process.env.ESBOCO_PASTA ?? 'test-results/medidas-033';
const NOITE = process.env.ROLETA_HORA === 'noite';
const MUNDOS = (process.env.MUNDOS ?? 'vila-neon,cidade-grande,rancho-alegre,padrao').split(',');

const TELAS = {
  deitado: { width: 844, height: 390 },
  empe: { width: 390, height: 844 },
} as const;
type NomeTela = keyof typeof TELAS;
const telas = (process.env.TELAS ?? 'deitado,empe').split(',') as NomeTela[];

async function abrir(browser: Browser, tela: NomeTela, tema: string, video?: string) {
  const v = TELAS[tela];
  const ctx = await browser.newContext({
    viewport: v,
    // SEM_MOBILE=1 nos vídeos: com isMobile o screencast perde 88 px de baixo (onde fica a roleta)
    isMobile: !process.env.SEM_MOBILE,
    hasTouch: true,
    deviceScaleFactor: 2,
    ...(video ? { recordVideo: { dir: video, size: { width: v.width * 2, height: v.height * 2 } } } : {}),
  });
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
  const id = `m033-roleta-${tema}-${tela}`;
  await criarMundo(page, id, tema);
  await page.goto(`/?mundo=${id}`);
  await page.waitForFunction(() => window.__brumaluz?.ready === true, undefined, { timeout: 240_000 });
  await page.evaluate((noite) => {
    document.querySelector<HTMLElement>('.entrada')?.setAttribute('hidden', '');
    document.body.classList.remove('tela-titulo');
    const e = window.__brumaluz!;
    e.pausarDia = true;
    e.hora = noite ? 0.96 : 0.42;
    e.definirClima?.('limpo');
    window.dispatchEvent(new Event('resize'));
  }, NOITE);
  await page.addStyleTag({ content: '.toast-area, .dica-mira { display: none !important; }' });
  await assentar(page, 12);
  // a criança num lugar bonito: na Vila Neon e na Cidade Grande, a rua do nascimento; nos
  // outros, onde nasce
  await page.evaluate(() => {
    const e = window.__brumaluz!;
    const p = e.vila?.() ?? e.cidade?.();
    if (!p) return;
    e.voar?.(false);
    e.teleportar!(p.nascimento.x + 2, p.nascimento.z + 3, p.h + 1.2);
    e.apontar!(p.nascimento.olhar + 0.5, 0.32);
  });
  await page.waitForTimeout(2500);
  const cdp = await ctx.newCDPSession(page);
  return { ctx, page, cdp };
}

const hora = NOITE ? 'noite' : 'dia';
async function foto(page: Page, pasta: string, tela: NomeTela, nome: string) {
  mkdirSync(`${PASTA}/${pasta}`, { recursive: true });
  await page.screenshot({ path: `${PASTA}/${pasta}/${tela}-${hora}-${nome}.png` });
  const s = await page.evaluate(() => ({
    aberta: window.__brumaluz!.gestos!.menu(),
    meio: document.querySelector<HTMLElement>('[data-roleta]')?.dataset.meio ?? null,
    nome: document.querySelector('[data-nome-meio]')?.textContent ?? null,
    zoom: window.__brumaluz!.camera!.zoom(),
  }));
  console.log(`FOTO ${pasta} ${tela} ${hora} ${nome} ${JSON.stringify(s)}`);
}

const espera = (page: Page, ms: number) => page.waitForTimeout(ms);

/** O meio da bandeja (px CSS). */
async function bandeja(page: Page) {
  return page.evaluate(() => {
    const r = document.querySelector('[data-roleta] .bandeja')!.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + 8 + 48, w: r.width, top: r.top, bottom: r.bottom };
  });
}

/** Um dedo: encosta, arrasta `dx` em `ms` e (se `soltar`) solta. */
async function arrastar(
  cdp: CDPSession,
  page: Page,
  x: number,
  y: number,
  dx: number,
  ms: number,
  soltar = true,
) {
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  const passos = Math.max(4, Math.round(ms / 16));
  for (let i = 1; i <= passos; i++) {
    // devagar no começo e no fim (como um dedinho)
    const f = 0.5 - Math.cos((i / passos) * Math.PI) / 2;
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: x + dx * f, y: y + Math.sin(i / 3) * 1.5 }],
    });
    await page.waitForTimeout(ms / passos);
  }
  if (soltar) await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}
const soltarDedo = (cdp: CDPSession) =>
  cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });

async function tocarEm(cdp: CDPSession, page: Page, x: number, y: number) {
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  await page.waitForTimeout(90);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}
async function tocarSeletor(cdp: CDPSession, page: Page, sel: string) {
  const r = await page.locator(sel).first().boundingBox();
  if (!r) throw new Error(`sem ${sel}`);
  await tocarEm(cdp, page, r.x + r.width / 2, r.y + r.height / 2);
}
const meio = (page: Page) =>
  page.evaluate(() => document.querySelector<HTMLElement>('[data-roleta]')?.dataset.meio ?? '');

/** Arrasta um item por vez até `id` ficar no meio (no máximo 14 arrastes). */
async function rolarAte(cdp: CDPSession, page: Page, id: string, lado = -1) {
  for (let i = 0; i < 14 && (await meio(page)) !== id; i++) {
    const b = await bandeja(page);
    await arrastar(cdp, page, b.x, b.y, lado * 70, 480);
    await espera(page, 420);
  }
}

for (const tela of telas)
  for (const mundo of MUNDOS)
    test(`roleta: as fotos, ${mundo}, ${tela}`, async ({ browser }) => {
      test.skip(QUAL !== 'fotos');
      const { ctx, page, cdp } = await abrir(browser, tela, mundo);
      // na Vila Neon, de patins: o item do mundo ("Tirar patins") aparece na roleta
      if (mundo === 'vila-neon') {
        await page.evaluate(() => window.__brumaluz!.vilaPatins?.(true));
        await espera(page, 900);
      }
      await foto(page, mundo, tela, '01-comeco-fechada');
      await tocarSeletor(cdp, page, '[data-botao-roda]');
      await espera(page, 700);
      await foto(page, mundo, tela, '02-aberta-fechar');
      // no meio do arraste (o dedo segurando, a fileira entre dois itens)
      let b = await bandeja(page);
      await arrastar(cdp, page, b.x + 40, b.y, -60, 400, false);
      await espera(page, 120);
      await foto(page, mundo, tela, '03-arrastando');
      await soltarDedo(cdp);
      await espera(page, 700);
      // o item do mundo
      const itens = await page.evaluate(
        () => document.querySelector<HTMLElement>('[data-roleta]')?.dataset.itens ?? '',
      );
      const doMundo = ['tirar-patins', 'missoes'].find((i) => itens.split(' ').includes(i));
      if (doMundo) {
        await rolarAte(cdp, page, doMundo);
        await foto(page, mundo, tela, `04-item-do-mundo-${doMundo}`);
      }
      await rolarAte(cdp, page, 'gestos', 1);
      await foto(page, mundo, tela, '05-meio-gestos');
      b = await bandeja(page);
      await tocarEm(cdp, page, b.x, b.y);
      await espera(page, 900);
      await foto(page, mundo, tela, '06-gestos-voltar');
      await rolarAte(cdp, page, 'dancar');
      await foto(page, mundo, tela, '07-gestos-dancar');
      await tocarEm(cdp, page, b.x, b.y);
      await espera(page, 1000);
      await foto(page, mundo, tela, '08-boneco-dancando');
      await ctx.close();
    });

for (const tela of telas)
  test(`roleta: o vídeo da criança de 3 anos, ${tela}`, async () => {
    test.skip(QUAL !== 'video');
    const browser = await navegadorJanelaGrande();
    const { ctx, page, cdp } = await abrir(browser, tela, 'vila-neon');
    const parar = await gravarTela(page, `${PASTA}/quadros-roleta-${tela}`, TELAS[tela].width * 2, TELAS[tela].height * 2);
    await espera(page, 800);
    await tocarSeletor(cdp, page, '[data-botao-roda]');
    await espera(page, 1200);
    let b = await bandeja(page);
    // arrasta devagar para um lado, para, arrasta de volta (olhando os desenhos)
    await arrastar(cdp, page, b.x + 30, b.y, -90, 900);
    await espera(page, 1000);
    await arrastar(cdp, page, b.x - 20, b.y, -70, 700);
    await espera(page, 1100);
    await arrastar(cdp, page, b.x - 30, b.y, 150, 1100);
    await espera(page, 1200);
    // um toque no vizinho: ele vem para o meio
    await tocarEm(cdp, page, b.x + 100, b.y);
    await espera(page, 1200);
    await rolarAte(cdp, page, 'gestos', 1);
    await espera(page, 800);
    b = await bandeja(page);
    await tocarEm(cdp, page, b.x, b.y);
    await espera(page, 1500);
    await arrastar(cdp, page, b.x + 30, b.y, -80, 800);
    await espera(page, 1200);
    // volta pela plaquinha e entra de novo
    await tocarSeletor(cdp, page, '[data-roleta] .voltar');
    await espera(page, 1500);
    await tocarEm(cdp, page, b.x, b.y);
    await espera(page, 1300);
    await rolarAte(cdp, page, 'dancar');
    await espera(page, 900);
    await tocarEm(cdp, page, b.x, b.y);
    await espera(page, 4200);
    await parar();
    await ctx.close();
    await browser.close();
  });
