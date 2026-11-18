import { test, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { abrirMundo, assentar, type Tamanho } from './guia-palco';
import { alvoDoToque, esperarDica } from './vila-alvo';

/**
 * Spec 032 (o portão visual): as fotos de comprar e comer, no celular em pé (de dia e de noite) e
 * deitado. Não confere nada: só tira as fotos para a revisão (`FOTOS_PASTA`, `FOTOS_HORA=noite`,
 * `FOTOS_TAMANHO=deitado`, `FOTOS_SO=comer|comprar|amigo`).
 *
 * - **comer:** cada comida de perto, de frente e de lado (o modo foto): levou à boca, as três
 *   mordidas, a carinha feliz; e a criança comendo vista de trás (a câmera do jogo);
 * - **comprar:** cada barraca antes do toque (a dica), na fichinha, no preparo, na entrega e
 *   depois (o lanche na mão), e a barrinha cheia.
 */
declare const process: { env: Record<string, string | undefined> };
test.setTimeout(1_800_000);
test.use({ actionTimeout: 30_000 });
const PASTA = process.env.FOTOS_PASTA ?? 'test-results/comprar-comer-fotos';
const NOITE = process.env.FOTOS_HORA === 'noite';
const TAMANHO = (process.env.FOTOS_TAMANHO ?? 'empe') as Tamanho;
const SO = process.env.FOTOS_SO ?? '';
const SUFIXO = `${TAMANHO}${NOITE ? '-noite' : ''}`;
const COMIDAS = (
  process.env.FOTOS_COMIDAS ??
  'cachorro_quente,pipoca,suco,vitamina,algodao_doce,fatia_bolo,maca,pao,carne_assada,peixe_assado,torta_abobora,ensopado,frutinhas,ovo_cozido'
).split(',');

async function abrir(browser: import('@playwright/test').Browser, id: string): Promise<Page> {
  mkdirSync(PASTA, { recursive: true });
  const page = await abrirMundo(browser, { id, tema: 'vila-neon', tamanho: TAMANHO });
  await page.addStyleTag({ content: '.dica-mira { display: none !important; }' });
  if (NOITE)
    await page.evaluate(() => {
      const e = window.__brumaluz!;
      e.pausarDia = true;
      e.hora = 0.96;
    });
  await assentar(page);
  await page.waitForFunction(() => !!window.__vila && !!window.__brumaluz?.vilaCompras, undefined, {
    timeout: 30_000,
  });
  return page;
}
const foto = (page: Page, nome: string) => page.screenshot({ path: `${PASTA}/${nome}-${SUFIXO}.png` });

test('comer: cada comida de perto, mordida por mordida', async ({ browser }) => {
  test.skip(!!SO && SO !== 'comer');
  const page = await abrir(browser, `fotos-comer-${SUFIXO}`);
  // num lugar aberto da pracinha, longe das barracas
  await page.evaluate(() => {
    const e = window.__brumaluz!;
    const p = e.vila!()!;
    e.voar?.(false);
    e.teleportar!(p.nascimento.x + 2, p.nascimento.z + 3, p.h + 1.2);
    e.apontar!(0.4, 0.15);
  });
  await page.waitForTimeout(1500);
  for (const item of COMIDAS) {
    await page.evaluate((item) => {
      const e = window.__brumaluz!;
      e.inventario!.definir(0, { item, qtd: 4 });
      e.selecionarSlot!(0);
    }, item);
    await page.waitForTimeout(700);
    for (const lado of ['frente', 'lado'] as const) {
      await page.evaluate((lado) => {
        const e = window.__brumaluz!;
        const f = e.modoFoto!;
        if (!f.ativo()) f.alternar();
        f.fov(38);
        f.selfie();
        if (lado === 'lado') {
          const pes = e.jogadorPes!();
          const yaw = e.yawBoneco?.() ?? 0;
          // de lado e um pouco à frente (o lado da mão direita, a da comida)
          const a = yaw - 1.2;
          f.posicionar!(pes[0] + Math.sin(a) * 2.2, pes[1] + 1.7, pes[2] + Math.cos(a) * 2.2);
          e.apontar!(a + Math.PI, 0.1);
        }
      }, lado);
      await page.waitForTimeout(900);
      await foto(page, `comer-${item}-${lado}-0-na-mao`);
      await page.evaluate(() => window.__brumaluz!.comer!());
      const marcos: [number, string][] = [
        [420, '1-leva'],
        [700, '2-mordida1'],
        [1300, '3-mordida2'],
        [1950, '4-mordida3'],
        [2500, '5-feliz'],
      ];
      let t0 = 0;
      for (const [ms, nome] of marcos) {
        await page.waitForTimeout(ms - t0);
        t0 = ms;
        await foto(page, `comer-${item}-${lado}-${nome}`);
      }
      await page.waitForTimeout(1200);
      // (a comida acabou: põe de novo para a próxima vista)
      await page.evaluate((item) => {
        const e = window.__brumaluz!;
        e.inventario!.definir(0, { item, qtd: 4 });
      }, item);
      await page.waitForTimeout(400);
    }
    await page.evaluate(() => {
      const f = window.__brumaluz!.modoFoto!;
      if (f.ativo()) f.alternar();
    });
  }
  // de trás, a câmera do jogo: a dica "Toque para comer" e a criança comendo
  await page.evaluate(() => {
    const e = window.__brumaluz!;
    e.inventario!.definir(0, { item: 'cachorro_quente', qtd: 2 });
    e.selecionarSlot!(0);
  });
  await page.waitForTimeout(2000);
  await foto(page, 'comer-jogo-0-dica');
  const mao = await page.evaluate(() => window.__brumaluz!.maoNaTela?.() ?? null);
  if (mao) await page.touchscreen.tap(mao.x, mao.y);
  for (const [ms, nome] of [
    [700, '1-mordida1'],
    [1250, '2-mordida2'],
    [2400, '3-feliz'],
  ] as const) {
    await page.waitForTimeout(ms === 700 ? 700 : ms === 1250 ? 550 : 1150);
    await foto(page, `comer-jogo-${nome}`);
  }
  await page.context().close();
});

test('comprar: cada barraca antes, no meio e depois', async ({ browser }) => {
  test.skip(!!SO && SO !== 'comprar');
  const page = await abrir(browser, `fotos-comprar-${SUFIXO}`);
  const balcoes = await page.evaluate(() => window.__brumaluz!.vilaCompras!.balcoes());
  const feitos = new Set<string>();
  for (const b of balcoes) {
    // (a barraca do lanche tem três lanches: as fotos do meio só no primeiro)
    const meio = !feitos.has(b.barraca);
    feitos.add(b.barraca);
    // de frente para a barraca, a 3 blocos, um pouco de lado (o boneco não tapa)
    await page.evaluate(
      ({ p, barraca }) => {
        const e = window.__brumaluz!;
        const plano = e.vila!()!;
        // de que lado fica o freguês: o contrário de onde a vendedora está
        const pecas = plano.pecas;
        void pecas;
        const lados: Record<string, [number, number]> = {
          lanche: [0, 3],
          lanchonete: [-1.2, 3],
          pipocaParque: [0.5, 3],
          algodao: [-0.5, 3],
          pipocaPracinha: [3, 0.4],
        };
        const [dx, dz] = lados[barraca] ?? [0, 3];
        e.voar?.(false);
        e.teleportar!(p[0] + dx, p[2] + dz, plano.h + 1.2);
        e.apontar!(Math.atan2(-dx, -dz) - 0.35, 0.15);
      },
      { p: b.p, barraca: b.barraca },
    );
    await page.waitForTimeout(1800);
    try {
      await esperarDica(page, b.chave, b.p, 20_000);
    } catch {
      // (fica a foto do que se via)
    }
    await foto(page, `comprar-${b.chave}-0-dica`);
    const t = await alvoDoToque(page, b.chave).catch(() => null);
    if (!t) continue;
    await page.touchscreen.tap(t.x, t.y);
    if (meio) {
      for (const [ms, nome] of [
        [300, '1-fichinha'],
        [900, '2-preparo'],
        [1350, '3-entrega'],
        [1520, '3b-pulinho'],
        [2050, '4-chegou'],
      ] as const) {
        const antes = [0, 300, 900, 1350, 1520][['1-fichinha', '2-preparo', '3-entrega', '3b-pulinho', '4-chegou'].indexOf(nome)];
        await page.waitForTimeout(ms - antes);
        await foto(page, `comprar-${b.chave}-${nome}`);
      }
    } else await page.waitForTimeout(2100);
    // o lanche na mão, de frente (o modo foto)
    await page.evaluate(() => {
      const f = window.__brumaluz!.modoFoto!;
      if (!f.ativo()) f.alternar();
      f.fov(40);
      f.selfie();
    });
    await page.waitForTimeout(900);
    await foto(page, `comprar-${b.chave}-5-na-mao`);
    await page.evaluate(() => {
      const f = window.__brumaluz!.modoFoto!;
      if (f.ativo()) f.alternar();
    });
    await page.waitForTimeout(600);
  }
  // a barrinha cheia
  const b = balcoes[0];
  await page.evaluate(
    ({ p }) => {
      const e = window.__brumaluz!;
      const plano = e.vila!()!;
      for (let i = 0; i < 9; i++) e.inventario!.definir(i, { item: 'graveto', qtd: 2 });
      e.teleportar!(p[0], p[2] + 3, plano.h + 1.2);
      e.apontar!(Math.PI - 0.35, 0.15);
    },
    { p: b.p },
  );
  await page.waitForTimeout(2500);
  const t = await alvoDoToque(page, b.chave).catch(() => null);
  if (t) {
    await page.touchscreen.tap(t.x, t.y);
    await page.waitForTimeout(500);
    await foto(page, 'comprar-barra-cheia');
  }
  await page.context().close();
});
