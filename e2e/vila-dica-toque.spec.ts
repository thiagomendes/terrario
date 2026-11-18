import { expect, test, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { abrirMundo, assentar } from './guia-palco';

/**
 * A dica de toque (pedido do dono, 16 nov 2026: no suporte dos patins "tem que adivinhar"): perto
 * do suporte dos patins, a mãozinha toca nele e o balãozinho mostra os patins com a setinha de
 * calçar (descalça) ou de tirar (de patins); some quando a criança usa ou vai embora, e volta
 * quando ela volta. O mesmo nos três brinquedos de sentar do parque.
 */
declare const process: { env: Record<string, string | undefined> };
test.setTimeout(600_000);
test.use({ actionTimeout: 30_000 });
const PASTA = process.env.PARQUE_PASTA ?? 'test-results/vila-dica';

const dica = (page: Page) => page.evaluate(() => window.__vila!.dica());
const esperarDica = (page: Page, chave: string | null) =>
  page.waitForFunction((c) => (window.__vila!.dica()?.chave ?? null) === c, chave, {
    timeout: 15_000,
  });
async function irAoSuporte(page: Page, longe = 1.6) {
  await page.evaluate((longe) => {
    const e = window.__brumaluz!;
    const p = e.vila!()!;
    const [x, , z] = p.pontos.patins;
    e.voar?.(false);
    e.teleportar!(x, z - longe, p.h + 1.2);
    e.apontar!(0, -0.05);
  }, longe);
  await page.waitForTimeout(900);
}

for (const tamanho of ['deitado', 'empe'] as const)
  test(`Vila Neon, ${tamanho}: a dica de toque no suporte dos patins e nos brinquedos do parque`, async ({
    browser,
  }) => {
    mkdirSync(PASTA, { recursive: true });
    const page = await abrirMundo(browser, {
      id: `vila-dica-${tamanho}`,
      tema: 'vila-neon',
      tamanho,
    });
    await assentar(page);
    // longe de tudo: nenhuma dica na tela (spec 032: só a do carrinho de pipoca da Dona Cida, a
    // primeira barraca, ao lado de onde a criança nasce)
    expect([null, 'compra-pipoca-pracinha']).toContain((await dica(page))?.chave ?? null);

    // perto do suporte, descalça: "calçar"
    await irAoSuporte(page);
    await esperarDica(page, 'patins-calcar');
    expect((await dica(page))!.texto).toBe('Toque para calçar');
    await page.waitForTimeout(1300);
    await page.screenshot({ path: `${PASTA}/${tamanho}-dica-calcar.png` });
    // a dica não é botão: o toque no suporte calça como sempre, e ela some
    const t = (await dica(page))!.t;
    await page.touchscreen.tap(t.x, t.y);
    await page.waitForFunction(() => !!window.__brumaluz!.personagem?.aparencia().patins);
    await esperarDica(page, null);
    // foi embora e voltou, de patins: "tirar"
    await irAoSuporte(page, 12);
    await page.waitForTimeout(600);
    expect(await dica(page)).toBeNull();
    await irAoSuporte(page);
    await esperarDica(page, 'patins-tirar');
    expect((await dica(page))!.texto).toBe('Toque para tirar');
    await page.waitForTimeout(1300);
    await page.screenshot({ path: `${PASTA}/${tamanho}-dica-tirar.png` });
    const t2 = (await dica(page))!.t;
    await page.touchscreen.tap(t2.x, t2.y);
    await page.waitForFunction(() => !window.__brumaluz!.personagem?.aparencia().patins);
    await esperarDica(page, null);

    // os brinquedos de sentar do parque: "andar"
    const lugares = await page.evaluate(() => {
      const q = window.__brumaluz!.vila!()!.pontos.parque;
      return [
        { b: 0, x: q.roda.saida[0], z: q.roda.saida[2] + 0.5, ax: q.roda.x, az: q.roda.z },
        {
          b: 1,
          x: q.carrossel.x,
          z: q.carrossel.z - q.carrossel.beira - 3,
          ax: q.carrossel.x,
          az: q.carrossel.z,
        },
        // (o bate-bate é de guiar: a dica é do carrinho livre, na beira da pista)
        {
          b: 2,
          x: q.bate.vagas[5][0],
          z: q.bate.z1 + 3.2,
          ax: q.bate.vagas[5][0],
          az: q.bate.vagas[5][1],
          olhar: 0.25,
        },
      ];
    });
    for (const l of lugares) {
      await page.evaluate((l) => {
        const e = window.__brumaluz!;
        e.teleportar!(l.x, l.z, e.vila!()!.h + 1.2);
        e.apontar!(Math.atan2(l.ax - l.x, l.az - l.z), (l as { olhar?: number }).olhar ?? -0.1);
      }, l);
      await assentar(page, 9);
      await esperarDica(page, `sentar-${l.b}`);
      expect((await dica(page))!.texto).toBe('Toque para andar');
      await page.waitForTimeout(1300);
      await page.screenshot({ path: `${PASTA}/${tamanho}-dica-brinquedo-${l.b}.png` });
    }
    // o toque na dica do bate-bate senta, e sentada a dica de tocar vira a de guiar (sem a mãozinha)
    const t3 = (await dica(page))!.t;
    await page.touchscreen.tap(t3.x, t3.y);
    await page.waitForFunction(() => window.__brumaluz!.vilaParque!.sentado()?.b === 'bate');
    await esperarDica(page, 'bate-guiar');
    expect((await dica(page))!.texto).toBe('Empurre o controle para guiar');
    // desceu ali mesmo: a dica não volta até ela se afastar
    await page.evaluate(() => window.__brumaluz!.vilaParque!.sair());
    await page.waitForFunction(() => !window.__brumaluz!.vilaParque!.sentado());
    await page.waitForTimeout(2000);
    expect(await dica(page)).toBeNull();
    await page.close();
  });
