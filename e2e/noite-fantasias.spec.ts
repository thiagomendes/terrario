import { expect, test, type Browser, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { abrirMundo, assentar, type Tamanho } from './guia-palco';

/**
 * Spec 027: as missões n1 a n5 da Noite das Fantasias na tela, com o dedo de verdade.
 *
 * - **T18 (o núcleo e a previsão):** o dedo na campainha abre a porta e põe o docinho na sacola
 *   (a sacola vazia já está na mão quando a n1 abre); o dedo na lanterna do bosque acende na hora
 *   (a previsão do cliente, antes do quadro do núcleo), e a bolinha da n2 acende. As fotos do
 *   cartão da missão andando (no entardecer e de noite) em `capturas-027/parte1/missoes/`.
 */
declare const process: { env: Record<string, string | undefined> };
test.setTimeout(900_000);
test.use({ actionTimeout: 30_000 });
const PASTA = 'capturas-027/parte1/missoes';

type Aberta = { id: string; feito: number; meta: number; usos?: string[] };

async function abrir(browser: Browser, id: string, tamanho: Tamanho, hora: number, feitas: string[] = []): Promise<Page> {
  mkdirSync(PASTA, { recursive: true });
  const page = await abrirMundo(browser, {
    id,
    tema: 'noite-das-fantasias',
    tamanho,
    extras: { alma: { local: { feitas } } },
  });
  await page.addStyleTag({ content: '.dica-mira { display: none !important; }' });
  await page.evaluate((h) => {
    const e = window.__brumaluz!;
    e.pausarDia = true;
    e.hora = h;
  }, hora);
  await assentar(page);
  await page.waitForFunction(() => !!window.__guia && !!window.__brumaluz!.baileEstado?.(), undefined, {
    timeout: 60_000,
  });
  await page.waitForTimeout(1200);
  return page;
}
const aberta = (page: Page, id: string) =>
  page.evaluate(
    (id) =>
      (window as unknown as { __almaUi: { vista(): { abertas: Aberta[] } | null } }).__almaUi
        .vista()
        ?.abertas.find((a) => a.id === id) ?? null,
    id,
  );
const naMochila = (page: Page, item: string) =>
  page.evaluate((item) => {
    const inv = window.__brumaluz!.inventario!;
    let n = 0;
    for (let i = 0; i < 36; i++) {
      const s = inv.obter(i);
      if (s?.item === item) n += s.qtd;
    }
    return n;
  }, item);
/** Vai até perto do ponto (os pés em `pes`) olhando para `alvo`. */
async function irOlhando(page: Page, pes: [number, number], alvo: [number, number, number], pitch = 0.2): Promise<void> {
  await page.evaluate(
    ({ pes, alvo, pitch }) => {
      const e = window.__brumaluz!;
      const b = e.baile!()!;
      e.voar?.(false);
      e.teleportar!(pes[0], pes[1], b.h + 1.2);
      e.apontar!(Math.atan2(alvo[0] - pes[0], alvo[2] - pes[1]), pitch);
    },
    { pes, alvo, pitch },
  );
  await page.waitForTimeout(1600);
}
/** O dedo no ponto do mundo (toque de verdade no celular, clique no computador). */
async function tocarNoMundo(page: Page, p: [number, number, number]): Promise<void> {
  const t = await page.evaluate((p) => window.__brumaluz!.telaDoPonto!(p[0], p[1], p[2]), p);
  expect(t, 'o ponto está na tela').not.toBeNull();
  const toque = await page.evaluate(() => matchMedia('(pointer: coarse)').matches);
  if (toque) await page.touchscreen.tap(t!.x, t!.y);
  else await page.mouse.click(t!.x, t!.y);
}

for (const [tamanho, hora, nome] of [
  ['deitado', 0.7, 'entardecer'],
  ['empe', 0.86, 'noite'],
] as const)
  test(`T18: a campainha dá o docinho e a lanterna acende na hora (${tamanho}, ${nome})`, async ({ browser }) => {
    const page = await abrir(browser, `t18-${tamanho}`, tamanho, hora);
    // a sacola vazia foi para a mão quando a n1 abriu
    await page.waitForFunction(
      () => {
        const inv = window.__brumaluz!.inventario!;
        for (let i = 0; i < 9; i++) if (inv.obter(i)?.item === 'sacola_vazia') return true;
        return false;
      },
      undefined,
      { timeout: 20_000 },
    );
    const plano = await page.evaluate(() => {
      const b = window.__brumaluz!.baile!()!;
      return { portas: b.pontos.portas, lanternas: b.pontos.lanternas, h: b.h };
    });
    // n1: duas portas com o dedo (a sacola enche)
    for (const [k, i] of [0, 3].entries()) {
      const p = plano.portas[i];
      const dir = [[0, 1], [1, 0], [0, -1], [-1, 0]][p.dir];
      await irOlhando(page, [p.x + dir[0] * 2.2, p.z + dir[1] * 2.2], [p.x, p.y + 1.1, p.z]);
      await tocarNoMundo(page, [p.x, p.y + 1.1, p.z]);
      await page.waitForFunction(
        (i) => (window.__brumaluz!.eventosBaile ?? []).some((e) => e.e === 'bailePorta' && e.i === i && 'doce' in e),
        i,
        { timeout: 10_000 },
      );
      await page.waitForFunction((k) => {
        const inv = window.__brumaluz!.inventario!;
        for (let s = 0; s < 9; s++) if (inv.obter(s)?.item === 'sacola_doces' && inv.obter(s)!.qtd === k + 1) return true;
        return false;
      }, k, { timeout: 10_000 });
      expect((await aberta(page, 'n1'))?.feito).toBe(k + 1);
    }
    expect(await naMochila(page, 'sacola_vazia')).toBe(0);
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${PASTA}/t18-n1-${tamanho}-${nome}.jpg`, type: 'jpeg', quality: 88 });
    // n2: o dedo na lanterna acende na hora (a previsão), antes do núcleo responder
    const l = plano.lanternas[1];
    await irOlhando(page, [l[0] + 2.5, l[2] + 1], [l[0], l[1], l[2]], 0.1);
    const antes = await page.evaluate(() => window.__brumaluz!.baileEstado!()!.ln[1]);
    expect(antes).toBe(false);
    await tocarNoMundo(page, [l[0], l[1], l[2]]);
    const previu = await page.evaluate(() => window.__brumaluz!.baileReplica!().acesa(1, performance.now() / 1000));
    expect(previu).toBe(true);
    await page.waitForFunction(() => window.__brumaluz!.baileEstado!()!.ln[1] === true, undefined, { timeout: 10_000 });
    await page.waitForFunction(
      () =>
        ((window as unknown as { __almaUi: { vista(): { abertas: Aberta[] } | null } }).__almaUi
          .vista()
          ?.abertas.find((a) => a.id === 'n2')?.feito ?? 0) === 1,
      undefined,
      { timeout: 10_000 },
    );
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${PASTA}/t18-n2-${tamanho}-${nome}.jpg`, type: 'jpeg', quality: 88 });
    await page.context().close();
  });
