import { expect, test, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { abrirMundo, assentar } from './guia-palco';

/**
 * Spec 027 (T15): as comidas da festa na mão e na boca. Com `COMER_027=1` (na placa de vídeo),
 * cada comida (os quatro docinhos da forminha, o chocolate quente no gole de caneca e a poção de
 * canudinho) nas três mordidas, de frente e de lado, sem fantasia, com o chapéu de bruxa e com o
 * capuz da fantasminha, no entardecer, em `capturas-027/parte1/comer/`. Sempre: comer cada uma
 * acaba com ela (três mordidas) e a mão volta vazia.
 */
declare const process: { env: Record<string, string | undefined> };
test.setTimeout(900_000);
const PASTA = 'capturas-027/parte1/comer';
const COMIDAS = ['brigadeiro', 'beijinho', 'cajuzinho', 'surpresa_uva', 'chocolate_quente', 'pocao_uva'];

async function abrir(browser: import('@playwright/test').Browser, id: string): Promise<Page> {
  const page = await abrirMundo(browser, { id, tema: 'noite-das-fantasias', tamanho: 'pc' });
  await page.addStyleTag({ content: '.dica-mira, .toast-area { display: none !important; }' });
  await assentar(page);
  await page.evaluate(() => {
    const e = window.__brumaluz!;
    const p = e.baile!()!;
    e.pausarDia = true;
    e.hora = 0.7;
    e.voar?.(false);
    // no gramado da praça, longe das barracas (o toque é da comida)
    e.teleportar!(p.nascimento.x + 3, p.nascimento.z - 4, p.h + 1.2);
    e.apontar!(p.nascimento.olhar, 0.15);
  });
  await page.waitForTimeout(2500);
  return page;
}

test('cada comida da festa acaba em três mordidas', async ({ browser }) => {
  const page = await abrir(browser, 'comer-027');
  for (const item of COMIDAS) {
    await page.evaluate((item) => {
      const e = window.__brumaluz!;
      e.inventario!.definir(0, { item, qtd: 1 });
      e.selecionarSlot!(0);
    }, item);
    await page.waitForTimeout(400);
    await page.evaluate(() => window.__brumaluz!.comer!());
    await page.waitForFunction((item) => window.__brumaluz!.refeicao?.()?.item === item, item, { timeout: 3_000 });
    await page.waitForFunction(() => (window.__brumaluz!.refeicao?.()?.mordidas ?? 0) >= 3, undefined, {
      timeout: 5_000,
    });
    await page.waitForFunction(() => !window.__brumaluz!.inventario!.obter(0), undefined, { timeout: 5_000 });
    expect(await page.evaluate(() => window.__brumaluz!.inventario!.obter(0))).toBeNull();
    await page.waitForTimeout(1500);
  }
  await page.context().close();
});

test('as fotos: cada comida nas três mordidas, de frente e de lado, com o chapéu e o capuz', async ({ browser }) => {
  test.skip(!process.env.COMER_027, 'só com COMER_027=1');
  mkdirSync(PASTA, { recursive: true });
  const page = await abrir(browser, 'comer-027-fotos');
  await page.evaluate(() => {
    const cena = document.getElementById('cena')!;
    for (const el of Array.from(document.body.querySelectorAll<HTMLElement>('*')))
      if (el !== cena && !el.contains(cena)) el.style.visibility = 'hidden';
  });
  const yaw0 = await page.evaluate(() => {
    const e = window.__brumaluz!;
    const y = e.yawBoneco!();
    e.travarYaw!(y);
    return y;
  });
  const vestidos: [string, unknown][] = [
    ['sem', null],
    ['bruxinha', { id: 'bruxinha-festa', cor: 0 }],
    ['fantasminha', { id: 'fantasminha-festa', cor: 0 }],
  ];
  for (const [nomeV, fantasia] of vestidos) {
    await page.evaluate((f) => {
      window.__brumaluz!.personagem!.definir({ fantasia: f ?? undefined } as never);
    }, fantasia);
    await page.waitForTimeout(600);
    // sem fantasia, todas; com o chapéu e o capuz, um docinho, a caneca e a poção
    const lista = nomeV === 'sem' ? COMIDAS : ['brigadeiro', 'chocolate_quente', 'pocao_uva'];
    for (const item of lista)
      for (const [lado, da] of [
        ['frente', 0],
        // (de lado, um tico para a frente: o rosto e a comida na boca à vista)
        ['lado', -1.15],
      ] as const) {
        await page.evaluate((item) => {
          const e = window.__brumaluz!;
          e.inventario!.definir(0, { item, qtd: 1 });
          e.selecionarSlot!(0);
        }, item);
        await page.waitForTimeout(400);
        await page.evaluate(
          ({ yaw0, da }) => {
            const e = window.__brumaluz!;
            const f = e.modoFoto!;
            if (!f.ativo()) f.alternar();
            const pes = e.jogadorPes!();
            const a = yaw0 + da;
            f.posicionar!(pes[0] + Math.sin(a) * 1.5, pes[1] + 1.35, pes[2] + Math.cos(a) * 1.5);
            e.apontar!(a + Math.PI, 0.03);
            e.comer!();
          },
          { yaw0, da },
        );
        // na boca, em cada mordida (logo depois do "nhac": o pedaço que saiu aparece)
        let t0 = 0;
        for (const [k, ms] of [
          [1, 700],
          [2, 1300],
          [3, 1950],
        ] as const) {
          await page.waitForTimeout(ms - t0);
          t0 = ms;
          await page.screenshot({
            path: `${PASTA}/${item}-${nomeV}-${lado}-${k}.jpg`,
            type: 'jpeg',
            quality: 86,
          });
        }
        await page.waitForTimeout(3800 - t0);
      }
  }
  await page.context().close();
});
