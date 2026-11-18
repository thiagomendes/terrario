import { test, type Page } from '@playwright/test';
import { mkdirSync, readdirSync, readFileSync } from 'node:fs';
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
// (fora de test-results: o Playwright limpa essa pasta a cada rodada)
const PASTA = process.env.FOTOS_PASTA ?? 'capturas-032/fotos';
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
  await page.addStyleTag({
    content:
      '.dica-mira, .painel-foto, .grade-foto, .flash-foto, .moldura-foto { display: none !important; }',
  });
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

/**
 * A folha de fotos (para a revisão): as fotos que começam com `prefixo`, lado a lado, pequenas,
 * com o nome embaixo de cada uma.
 */
async function folha(browser: import('@playwright/test').Browser, prefixo: string, nome: string, largura = 210): Promise<void> {
  const arquivos = readdirSync(PASTA)
    .filter((a) => a.startsWith(prefixo) && a.endsWith(`-${SUFIXO}.png`))
    .sort();
  if (!arquivos.length) return;
  const page = await browser.newPage({ viewport: { width: largura * 6 + 40, height: 400 } });
  const cels = arquivos
    .map(
      (a) =>
        `<figure><img src="data:image/png;base64,${readFileSync(`${PASTA}/${a}`, 'base64')}"><figcaption>${a.replace(prefixo, '').replace(`-${SUFIXO}.png`, '')}</figcaption></figure>`,
    )
    .join('');
  await page.setContent(
    `<style>body{margin:8px;background:#222;font:12px sans-serif;color:#eee;display:flex;flex-wrap:wrap;gap:4px}figure{margin:0;width:${largura}px}img{width:100%;display:block}figcaption{text-align:center}</style>${cels}`,
  );
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${PASTA}/folha-${nome}-${SUFIXO}.png`, fullPage: true });
  await page.close();
}

test('comer: cada comida de perto, mordida por mordida', async ({ browser }) => {
  test.skip(!!SO && SO !== 'comer');
  const page = await abrir(browser, `fotos-comer-${SUFIXO}`);
  // num lugar aberto da pracinha, longe das barracas
  await page.evaluate(() => {
    const e = window.__brumaluz!;
    const p = e.vila!()!;
    e.voar?.(false);
    e.teleportar!(p.nascimento.x, p.nascimento.z, p.h + 1.2);
    e.apontar!(p.nascimento.olhar, 0.15);
  });
  await page.waitForTimeout(1500);
  for (const item of COMIDAS) {
    await page.evaluate((item) => {
      const e = window.__brumaluz!;
      // (um só: depois da refeição a mão fica vazia, como de verdade)
      e.inventario!.definir(0, { item, qtd: 1 });
      e.selecionarSlot!(0);
    }, item);
    await page.waitForTimeout(700);
    const yaw0 = await page.evaluate(() => {
      const e = window.__brumaluz!;
      const y = e.yawBoneco!();
      e.travarYaw!(y);
      return y;
    });
    for (const lado of ['frente', 'lado'] as const) {
      await page.evaluate(
        ({ lado, yaw0 }) => {
          const e = window.__brumaluz!;
          const f = e.modoFoto!;
          if (!f.ativo()) f.alternar();
          const pes = e.jogadorPes!();
          // de frente, ou de lado e um pouco à frente (o lado da mão direita, a da comida)
          const a = lado === 'lado' ? yaw0 - 0.7 : yaw0;
          const d = 1.9;
          f.posicionar!(pes[0] + Math.sin(a) * d, pes[1] + 1.45, pes[2] + Math.cos(a) * d);
          e.apontar!(a + Math.PI, 0.06);
        },
        { lado, yaw0 },
      );
      await page.waitForTimeout(900);
      await foto(page, `comer-${item}-${lado}-0-na-mao`);
      await page.evaluate(() => window.__brumaluz!.comer!());
      const marcos: [number, string][] = [
        // (a foto sai uns 0,25 s depois de pedida)
        [330, '1-leva'],
        [620, '2-mordida1'],
        [1220, '3-mordida2'],
        [1870, '4-mordida3'],
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
        e.inventario!.definir(0, { item, qtd: 1 });
      }, item);
      await page.waitForTimeout(400);
    }
    await page.evaluate(() => {
      const e = window.__brumaluz!;
      e.travarYaw!(null);
      const f = e.modoFoto!;
      if (f.ativo()) f.alternar();
    });
  }
  // de trás, a câmera do jogo: a dica "Toque para comer" e a criança comendo (longe do carrinho
  // da Dona Cida: perto da barraca a dica de comprar vem antes)
  await page.evaluate(() => {
    const e = window.__brumaluz!;
    const p = e.vila!()!;
    e.teleportar!(p.nascimento.x + 2, p.nascimento.z + 3, p.h + 1.2);
    e.apontar!(0.4, 0.15);
    e.inventario!.definir(0, { item: 'cachorro_quente', qtd: 1 });
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
  for (const item of COMIDAS) await folha(browser, `comer-${item}-`, `comer-${item}`);
  await folha(browser, 'comer-jogo-', 'comer-jogo');
});

test('ajuste: a comida na boca (o braço e a comida na mão), parado na primeira mordida', async ({ browser }) => {
  test.skip(SO !== 'ajuste');
  const page = await abrir(browser, `fotos-ajuste-${SUFIXO}`);
  await page.evaluate(() => {
    const e = window.__brumaluz!;
    const p = e.vila!()!;
    e.voar?.(false);
    e.teleportar!(p.nascimento.x, p.nascimento.z, p.h + 1.2);
    e.apontar!(p.nascimento.olhar, 0.15);
  });
  await page.waitForTimeout(2500);
  const yaw0 = await page.evaluate(() => {
    const e = window.__brumaluz!;
    const y = e.yawBoneco!();
    e.travarYaw!(y);
    return y;
  });
  const grade = JSON.parse(process.env.AJUSTE_GRADE ?? '[{}]') as {
    braco?: number;
    abre?: number;
    folga?: number;
    rumo?: [number, number, number];
  }[];
  for (const [k, g] of grade.entries()) for (const item of COMIDAS)
    for (const [lado, da] of [
      ['frente', 0],
      ['dir', -0.7],
      ['esq', 0.7],
    ] as const) {
      await page.evaluate(
        ({ g, item }) => {
          const e = window.__brumaluz!;
          const a = e.ajusteComer!;
          if (g.braco !== undefined) a.pose.braco = g.braco;
          if (g.abre !== undefined) a.pose.abre = g.abre;
          if (g.folga !== undefined) a.boca.folga = g.folga;
          if (g.rumo) a.boca.rumo = g.rumo;
          e.inventario!.definir(0, { item, qtd: 4 });
          e.selecionarSlot!(0);
        },
        { g, item },
      );
      await page.waitForTimeout(400);
      await page.evaluate(
        ({ yaw0, da }) => {
          const e = window.__brumaluz!;
          const f = e.modoFoto!;
          if (!f.ativo()) f.alternar();
          const pes = e.jogadorPes!();
          const a = yaw0 + da;
          f.posicionar!(pes[0] + Math.sin(a) * 1.7, pes[1] + 1.4, pes[2] + Math.cos(a) * 1.7);
          e.apontar!(a + Math.PI, 0.04);
          e.comer!();
        },
        { yaw0, da },
      );
      await page.waitForTimeout(Number(process.env.AJUSTE_MS ?? 820));
      await foto(page, `ajuste-${k}-${item}-${lado}`);
      await page.waitForTimeout(3600 - Number(process.env.AJUSTE_MS ?? 820));
    }
  await page.context().close();
  await folha(browser, 'ajuste-', 'ajuste');
});

test('vídeo: comprar a pipoca da Dona Cida e comer (para o dono)', async ({ browser }) => {
  test.skip(SO !== 'video');
  const pasta = `${PASTA}/video`;
  mkdirSync(pasta, { recursive: true });
  const page = await abrirMundo(browser, { id: `video-comprar-${SUFIXO}`, tema: 'vila-neon', tamanho: TAMANHO, video: pasta });
  await page.addStyleTag({ content: '.dica-mira { display: none !important; }' });
  if (NOITE)
    await page.evaluate(() => {
      const e = window.__brumaluz!;
      e.pausarDia = true;
      e.hora = 0.96;
    });
  await assentar(page);
  await page.waitForFunction(() => !!window.__brumaluz?.vilaCompras, undefined, { timeout: 30_000 });
  const b = (await page.evaluate(() => window.__brumaluz!.vilaCompras!.balcoes())).find(
    (q) => q.chave === (process.env.VIDEO_BALCAO ?? 'compra-cachorro'),
  )!;
  const lados: Record<string, [number, number]> = {
    lanche: [0.6, 3],
    lanchonete: [-1.2, 3],
    pipocaParque: [0.5, 3],
    algodao: [-0.5, 3],
    pipocaPracinha: [3.2, 1.0],
  };
  const [dx, dz] = lados[b.barraca] ?? [0, 3];
  await page.evaluate(
    ({ p, dx, dz }) => {
      const e = window.__brumaluz!;
      e.voar?.(false);
      e.teleportar!(p[0] + dx, p[2] + dz, e.vila!()!.h + 1.2);
      e.apontar!(Math.atan2(-dx, -dz) - 0.3, 0.42);
    },
    { p: b.p, dx, dz },
  );
  await page.waitForTimeout(2500);
  await esperarDica(page, b.chave, b.p, 20_000).catch(() => undefined);
  await page.waitForTimeout(1200);
  const t = await alvoDoToque(page, b.chave);
  await page.touchscreen.tap(t.x, t.y);
  await page.waitForTimeout(3000);
  // uns passos para trás (longe da barraca, a dica de comer aparece)
  await page.evaluate(() => window.__brumaluz!.controleDireto!.mover(-1, 0));
  await page.waitForTimeout(1300);
  await page.evaluate(() => window.__brumaluz!.controleDireto!.mover(0, 0));
  // a dica de comer e o toque na comida
  await page.waitForFunction(() => !!window.__dicaComer?.estado(), undefined, { timeout: 10_000 }).catch(() => undefined);
  await page.waitForTimeout(900);
  const m = await page.evaluate(() => window.__dicaComer?.estado()?.t ?? window.__brumaluz!.maoNaTela?.() ?? null);
  if (m) await page.touchscreen.tap(m.x, m.y);
  await page.waitForTimeout(4000);
  await page.context().close();
});

test('comprar: cada barraca antes, no meio e depois', async ({ browser }) => {
  test.skip(!!SO && SO !== 'comprar');
  const page = await abrir(browser, `fotos-comprar-${SUFIXO}`);
  const balcoes = await page.evaluate(() => window.__brumaluz!.vilaCompras!.balcoes());
  for (const [i, b] of balcoes.entries()) {
    // de frente para a barraca, um pouco de lado (o boneco não tapa), de mãos vazias
    await page.evaluate(
      ({ p, barraca }) => {
        const e = window.__brumaluz!;
        const plano = e.vila!()!;
        for (let k = 0; k < 36; k++) e.inventario!.definir(k, null);
        const lados: Record<string, [number, number]> = {
          // (de viés: atrás de quem está de frente para o balcão fica a barraca das camisetas)
          lanche: [0, 2.6],
          lanchonete: [-1.2, 3],
          pipocaParque: [0.5, 3],
          algodao: [-0.5, 3],
          pipocaPracinha: [2.6, 0.6],
        };
        const [dx, dz] = lados[barraca] ?? [0, 3];
        e.voar?.(false);
        e.teleportar!(p[0] + dx, p[2] + dz, plano.h + 1.2);
        // (na barraca da Bia, a de camisetas fica logo atrás: a câmera vê de mais de cima)
        e.apontar!(Math.atan2(-dx, -dz) - 0.3, barraca === 'lanche' ? 0.62 : 0.45);
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
    // a entrega de perto (o modo foto, sem a tela do jogo): o corpo parado de frente para a
    // barraca, a câmera de lado e um pouco de cima, a criança e a vendedora na mesma foto
    const yaw0 = await page.evaluate((p) => {
      const e = window.__brumaluz!;
      const pes = e.jogadorPes!();
      const y = Math.atan2(p[0] - pes[0], p[2] - pes[2]);
      e.travarYaw!(y);
      return y;
    }, b.p);
    await page.waitForTimeout(500);
    await page.evaluate(
      ({ yaw0, i }) => {
        const e = window.__brumaluz!;
        const f = e.modoFoto!;
        if (!f.ativo()) f.alternar();
        const pes = e.jogadorPes!();
        // por cima do ombro, alto: atrás da criança fica o caminho por onde ela chegou (livre),
        // e de cima se vê a mão dela, o balcão e a vendedora
        // (baixo o bastante para ver por baixo do toldo das barracas, de lado o bastante para a
        // cabeça da criança não tapar a mão)
        // de lado e de longe (no celular em pé a tela é estreita): a criança, o lanche que pula e a
        // vendedora na mesma foto
        const a = yaw0 + 1.45;
        const cx = pes[0] + Math.sin(yaw0) * 1.3 + Math.sin(a) * 5.6;
        const cz = pes[2] + Math.cos(yaw0) * 1.3 + Math.cos(a) * 5.6;
        const cy = pes[1] + 2.3;
        f.posicionar!(cx, cy, cz);
        const tx = pes[0] + Math.sin(yaw0) * 1.6;
        const tz = pes[2] + Math.cos(yaw0) * 1.6;
        e.apontar!(Math.atan2(tx - cx, tz - cz), Math.atan2(cy - (pes[1] + 1.1), Math.hypot(tx - cx, tz - cz)));
        e.vilaCompras!.comprar(i);
      },
      { yaw0, i },
    );
    let t0 = 0;
    for (const [ms, nome] of [
      [320, '1-fichinha'],
      [950, '2-preparo'],
      [1280, '3-entrega'],
      [1470, '4-pulinho'],
      [2100, '5-chegou'],
    ] as const) {
      await page.waitForTimeout(ms - t0);
      t0 = ms;
      await foto(page, `comprar-${b.chave}-${nome}`);
    }
    // o lanche na mão, de frente, o corpo inteiro
    await page.evaluate((yaw0) => {
      const e = window.__brumaluz!;
      const f = e.modoFoto!;
      const pes = e.jogadorPes!();
      const a = yaw0 - 0.5;
      f.posicionar!(pes[0] + Math.sin(a) * 2.6, pes[1] + 1.3, pes[2] + Math.cos(a) * 2.6);
      e.apontar!(a + Math.PI, 0.12);
    }, yaw0);
    await page.waitForTimeout(900);
    await foto(page, `comprar-${b.chave}-6-na-mao`);
    await page.evaluate(() => {
      const e = window.__brumaluz!;
      e.travarYaw!(null);
      const f = e.modoFoto!;
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
  for (const b of balcoes) await folha(browser, `comprar-${b.chave}-`, `comprar-${b.chave}`);
});
