import { test, type Browser, type CDPSession, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { assentar, criarMundo } from './guia-palco';
import { gravarTela, navegadorJanelaGrande } from './gravarTela033';

/**
 * Esboço 033 (`?esboco=033`): a roleta no lugar da roda do menu. Só com ESBOCO_ROLETA:
 * - fotos: fechada, aberta, no meio do arraste, o meio com o nome, a volta sem fim, os gestos
 *   (com a abinha Voltar), o terceiro nível (&nivel3=1), voltar pela abinha e tocando fora, e o
 *   boneco fazendo o gesto. Deitado e em pé, de dia e de noite (ROLETA_HORA=noite);
 * - variantes: onde fica (baixo, acima, meio) e o tamanho do meio (80, 96, 112);
 * - video: uma sessão "de criança de 3 anos" (arrasta devagar, escolhe, entra em gestos, volta).
 * Toques e arrastes de dedo de verdade (pelo protocolo do Chromium).
 */
declare const process: { env: Record<string, string | undefined> };
const QUAL = process.env.ESBOCO_ROLETA ?? '';
test.skip(!QUAL, 'esboço só com ESBOCO_ROLETA');
test.setTimeout(1_800_000);
test.describe.configure({ mode: 'parallel' });
const PASTA = process.env.ESBOCO_PASTA ?? 'test-results/esboco-033';
const NOITE = process.env.ROLETA_HORA === 'noite';

const TELAS = {
  deitado: { width: 844, height: 390 },
  empe: { width: 390, height: 844 },
} as const;
type NomeTela = keyof typeof TELAS;
const telas = (process.env.TELAS ?? 'deitado,empe').split(',') as NomeTela[];

async function abrir(
  browser: Browser,
  tela: NomeTela,
  tema: string,
  extra = '',
  video?: string,
) {
  const v = TELAS[tela];
  const ctx = await browser.newContext({
    viewport: v,
    // SEM_MOBILE=1 nos vídeos: com isMobile o screencast perde 88 px de baixo (onde fica a roleta)
    isMobile: !process.env.SEM_MOBILE,
    hasTouch: true,
    deviceScaleFactor: 2,
    ...(video ? { recordVideo: { dir: video, size: { width: v.width * 2, height: v.height * 2 } } } : {}),
  });
  const t0 = Date.now();
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
  const id = `e033-roleta-${tema}-${tela}`;
  await criarMundo(page, id, tema);
  await page.goto(`/?mundo=${id}&esboco=033${extra}`);
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
  // a criança num lugar bonito: na Vila Neon, a rua do nascimento; nos outros, onde nasce
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
  return { ctx, page, cdp, t0 };
}

const hora = NOITE ? 'noite' : 'dia';
async function foto(page: Page, tela: NomeTela, nome: string) {
  mkdirSync(`${PASTA}/roleta`, { recursive: true });
  await page.screenshot({ path: `${PASTA}/roleta/${tela}-${hora}-${nome}.png` });
  const s = await page.evaluate(() => ({
    aberta: window.__brumaluz!.gestos!.menu(),
    meio: document.querySelector<HTMLElement>('[data-roleta]')?.dataset.meio ?? null,
    nome: document.querySelector('[data-nome-meio]')?.textContent ?? null,
  }));
  console.log(`FOTO ${tela} ${hora} ${nome} ${JSON.stringify(s)}`);
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
  test(`roleta: as fotos, ${tela}`, async ({ browser }) => {
    test.skip(QUAL !== 'fotos');
    const { ctx, page, cdp } = await abrir(browser, tela, 'vila-neon');
    await foto(page, tela, '01-fechada');
    await tocarSeletor(cdp, page, '[data-botao-roda]');
    await espera(page, 700);
    await foto(page, tela, '02-aberta');
    // no meio do arraste (o dedo segurando, a fileira entre dois itens)
    let b = await bandeja(page);
    await arrastar(cdp, page, b.x + 40, b.y, -60, 400, false);
    await espera(page, 120);
    await foto(page, tela, '03-arrastando');
    await soltarDedo(cdp);
    await espera(page, 700);
    await foto(page, tela, '04-assentou');
    await rolarAte(cdp, page, 'personagem');
    await foto(page, tela, '05-meio-personagem');
    // a volta sem fim: para a direita a partir do primeiro (Mapa), o último (Pausa) aparece
    await rolarAte(cdp, page, 'mapa', 1);
    b = await bandeja(page);
    await arrastar(cdp, page, b.x, b.y, 70, 260);
    await espera(page, 600);
    await foto(page, tela, '06-volta-sem-fim');
    await rolarAte(cdp, page, 'gestos', 1);
    await foto(page, tela, '07-meio-gestos');
    await tocarEm(cdp, page, b.x, b.y);
    await espera(page, 140);
    await foto(page, tela, '08-entrando-em-gestos');
    await espera(page, 700);
    await foto(page, tela, '09-gestos');
    await rolarAte(cdp, page, 'dancar');
    await foto(page, tela, '10-gestos-dancar');
    // voltar pela abinha
    await tocarSeletor(cdp, page, '[data-roleta] .voltar');
    await espera(page, 700);
    await foto(page, tela, '11-voltou-pela-abinha');
    // de novo em gestos e voltar tocando fora (no céu, longe da bandeja)
    await tocarEm(cdp, page, b.x, b.y);
    await espera(page, 800);
    await tocarEm(cdp, page, TELAS[tela].width / 2, tela === 'empe' ? 300 : 130);
    await espera(page, 700);
    await foto(page, tela, '12-voltou-tocando-fora');
    await tocarEm(cdp, page, TELAS[tela].width / 2, tela === 'empe' ? 300 : 130);
    await espera(page, 700);
    await foto(page, tela, '13-fechou-tocando-fora');
    // escolher um gesto: o boneco dança
    await tocarSeletor(cdp, page, '[data-botao-roda]');
    await espera(page, 600);
    await rolarAte(cdp, page, 'gestos', 1);
    b = await bandeja(page);
    await tocarEm(cdp, page, b.x, b.y);
    await espera(page, 800);
    await rolarAte(cdp, page, 'dancar');
    await tocarEm(cdp, page, b.x, b.y);
    await espera(page, 150);
    await foto(page, tela, '14-escolheu-dancar');
    await espera(page, 900);
    await foto(page, tela, '15-boneco-dancando');
    await ctx.close();
    // o terceiro nível (Gestos > Festa)
    {
      const { ctx, page, cdp } = await abrir(browser, tela, 'vila-neon', '&nivel3=1');
      await tocarSeletor(cdp, page, '[data-botao-roda]');
      await espera(page, 600);
      await rolarAte(cdp, page, 'gestos', 1);
      const b = await bandeja(page);
      await tocarEm(cdp, page, b.x, b.y);
      await espera(page, 800);
      await rolarAte(cdp, page, 'festa', 1);
      await foto(page, tela, '16-nivel3-festa-no-meio');
      await tocarEm(cdp, page, b.x, b.y);
      await espera(page, 800);
      await foto(page, tela, '17-nivel3-festa');
      await ctx.close();
    }
    // os outros mundos (a mesma roleta em todos)
    for (const tema of ['cidade-grande', 'rancho-alegre']) {
      const { ctx, page, cdp } = await abrir(browser, tela, tema);
      await tocarSeletor(cdp, page, '[data-botao-roda]');
      await espera(page, 700);
      await foto(page, tela, `18-mundo-${tema}`);
      await ctx.close();
    }
  });

test('roleta: depurar o toque', async ({ browser }) => {
  test.skip(QUAL !== 'depurar');
  const { ctx, page, cdp } = await abrir(browser, 'deitado', 'vila-neon');
  await page.evaluate(() => {
    const w = window as unknown as { __log: string[] };
    w.__log = [];
    for (const t of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel', 'click', 'touchstart', 'touchend'])
      window.addEventListener(
        t,
        (e) => {
          const el = e.target as Element;
          const p = e as PointerEvent;
          w.__log.push(`${t} ${el?.className?.toString?.() ?? el?.nodeName} ${p.clientX ?? ''},${p.clientY ?? ''}`);
        },
        true,
      );
  });
  await tocarSeletor(cdp, page, '[data-botao-roda]');
  await espera(page, 700);
  const b = await bandeja(page);
  console.log(`BANDEJA ${JSON.stringify(b)}`);
  console.log(`NO PONTO ${await page.evaluate(([x, y]) => document.elementFromPoint(x, y)?.className.toString(), [b.x, b.y])}`);
  await tocarEm(cdp, page, b.x, b.y);
  await espera(page, 600);
  console.log(`MENU1 ${await page.evaluate(() => window.__brumaluz!.gestos!.menu())}`);
  await page.touchscreen.tap(b.x, b.y);
  await espera(page, 600);
  console.log(`LOG ${JSON.stringify(await page.evaluate(() => (window as unknown as { __log: string[] }).__log))}`);
  console.log(`MENU ${await page.evaluate(() => window.__brumaluz!.gestos!.menu())}`);
  await ctx.close();
});

for (const tela of telas)
  test(`roleta: as variantes, ${tela}`, async ({ browser }) => {
    test.skip(QUAL !== 'variantes');
    const variantes: [string, string][] = [
      ['lugar-baixo', '&roletaLugar=baixo'],
      ['lugar-acima', '&roletaLugar=acima'],
      ['lugar-meio', '&roletaLugar=meio'],
      ['tam-80', '&roletaTam=80'],
      ['tam-112', '&roletaTam=112'],
      ['roda-de-hoje', '&menu=roda'],
    ];
    for (const [nome, extra] of variantes) {
      const { ctx, page, cdp } = await abrir(browser, tela, 'vila-neon', extra);
      await tocarSeletor(cdp, page, '[data-botao-roda]');
      await espera(page, 800);
      if (nome !== 'roda-de-hoje') await rolarAte(cdp, page, 'gestos', 1);
      await foto(page, tela, `v-${nome}`);
      if (nome !== 'roda-de-hoje') {
        const b = await bandeja(page);
        await tocarEm(cdp, page, b.x, b.y);
        await espera(page, 800);
        await foto(page, tela, `v-${nome}-gestos`);
      }
      await ctx.close();
    }
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
    // volta pela abinha e entra de novo
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
