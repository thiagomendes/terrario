import { expect, test, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { abrirMundo, assentar } from './guia-palco';
import { alvoDoToque, esperarDica as esperarDicaAqui } from './vila-alvo';

/**
 * Spec 026 (parte 3): a pista de skate, no celular em pé e deitado, com o dedo de verdade. A
 * criança pega o skate do suporte (a dica de toque), anda até o fundo da rampa em U e só segura
 * o controle: o skate sobe a curva, para lá em cima com o "clac", vira, desce e atravessa o fundo
 * (o trilho é do núcleo); segurando, vai e vem; soltando, para. Depois guarda o skate no suporte.
 * As fotos vão para `SKATE_PASTA` (com `SKATE_HORA=noite`, de noite).
 */
declare const process: { env: Record<string, string | undefined> };
test.setTimeout(600_000);
test.use({ actionTimeout: 30_000 });
const PASTA = process.env.SKATE_PASTA ?? 'capturas-026c/skate';
const NOITE = process.env.SKATE_HORA === 'noite';
const SO_TAMANHO = process.env.SKATE_TAMANHO;

async function esperarDica(page: Page, chave: string, texto: string): Promise<void> {
  const p = await page.evaluate(
    (chave) => window.__vila!.toques().find((q) => q.chave === chave)?.p ?? null,
    chave,
  );
  expect(p, `o toque ${chave} existe`).not.toBeNull();
  await esperarDicaAqui(page, chave, p!);
  expect(await page.evaluate(() => window.__vila!.dica()?.texto)).toBe(texto);
}
const fase = (page: Page) =>
  page.evaluate(() => window.__brumaluz!.vilaCasa!.estado().trilho.fase);

for (const tamanho of ['empe', 'deitado'] as const) {
  if (SO_TAMANHO && SO_TAMANHO !== tamanho) continue;
  test(`Vila Neon, ${tamanho}: o skate na rampa em U (pegar, subir, parar lá em cima, descer, vai e vem)`, async ({
    browser,
  }) => {
    mkdirSync(PASTA, { recursive: true });
    const page = await abrirMundo(browser, { id: `vila-skate-${tamanho}`, tema: 'vila-neon', tamanho });
    const erros: string[] = [];
    page.on('pageerror', (e) => erros.push(String(e)));
    await page.addStyleTag({ content: '.dica-mira { display: none !important; }' });
    if (NOITE)
      await page.evaluate(() => {
        const e = window.__brumaluz!;
        e.pausarDia = true;
        e.hora = 0.96;
      });
    const pl = await page.evaluate(() => {
      const p = window.__brumaluz!.vila!()!;
      return { skate: p.pontos.skate, h: p.h, postos: p.pontos.postos };
    });
    const R = pl.skate.rampa;
    const foto = (nome: string) =>
      page.screenshot({ path: `${PASTA}/${tamanho}-${nome}${NOITE ? '-noite' : ''}.png` });

    // ---------------------------------------------------------------- o suporte dos skates
    const sk = pl.skate.suporte;
    await page.evaluate(
      ([sk, h]) => {
        const e = window.__brumaluz!;
        e.voar?.(false);
        e.teleportar!(sk[0] + 2.6, sk[2] + 1.0, h + 1.2);
        e.apontar!(Math.atan2(-2.6, -1.0) - 0.25, 0.25);
      },
      [sk, pl.h] as const,
    );
    await assentar(page, 9);
    await esperarDica(page, 'skate', 'Toque para pegar');
    const noSuporte = () =>
      page.evaluate(
        () =>
          (window.__brumaluz!.vilaCasa!.estado() as unknown as { skatesNoSuporte: number })
            .skatesNoSuporte,
      );
    expect(await noSuporte()).toBe(3);
    await foto('1-suporte-dica');
    const t = await alvoDoToque(page, 'skate');
    await page.touchscreen.tap(t.x, t.y);
    await page.waitForFunction(() => !!window.__brumaluz!.personagem!.aparencia().skate);
    await page.waitForTimeout(1200);
    // o skate turquesa saiu do suporte: está nos pés da criança
    expect(await noSuporte()).toBe(2);
    await foto('2-de-skate');
    await page.evaluate(
      ([sk]) => {
        const e = window.__brumaluz!;
        const p = e.jogadorPes!();
        e.apontar!(Math.atan2(sk[0] - p[0], sk[2] - p[2]) + 0.35, 0.3);
      },
      [sk] as const,
    );
    await page.waitForTimeout(900);
    await foto('2b-suporte-sem-um');
    // de frente, com o skate nos pés
    await page.evaluate(() => {
      const e = window.__brumaluz!;
      e.apontar!(e.rotacao![1] + Math.PI - 0.5, 0.35);
    });
    await page.waitForTimeout(800);
    await foto('3-de-skate-de-frente');

    // ---------------------------------------------------------------- a rampa: só segurar
    await page.evaluate(
      ([R]) => {
        const e = window.__brumaluz!;
        e.voar?.(false);
        e.teleportar!(R.x - 0.4, R.z, R.y + 0.2);
        // olhando para a curva do leste (+x)
        e.apontar!(Math.PI / 2, 0.3);
      },
      [R] as const,
    );
    await page.waitForTimeout(1500);
    await foto('4-no-fundo');
    await page.evaluate(() => window.__brumaluz!.controleDireto!.mover(1, 0));
    await page.waitForFunction(() => window.__brumaluz!.vilaCasa!.estado().trilho.fase === 'sobe', undefined, {
      timeout: 10_000,
    });
    await page.waitForTimeout(300);
    await foto('5-subindo');
    await page.waitForFunction(() => window.__brumaluz!.vilaCasa!.estado().trilho.fase === 'alto', undefined, {
      timeout: 6000,
    });
    await page.waitForTimeout(150);
    await foto('6-la-em-cima');
    console.log(
      'skate: câmera lá em cima',
      JSON.stringify(
        await page.evaluate(() => {
          const c = window.__brumaluz!.vilaCasa!.estado();
          return { dist: c.camDist, rot: window.__brumaluz!.rotacao };
        }),
      ),
    );
    // lá em cima a criança está na curva, perto da borda (mais alta que o fundo)
    expect((await page.evaluate(() => window.__brumaluz!.jogadorPes!()))[1]).toBeGreaterThan(R.y + 0.7);
    await page.waitForFunction(() => window.__brumaluz!.vilaCasa!.estado().trilho.fase === 'desce', undefined, {
      timeout: 6000,
    });
    await page.waitForTimeout(250);
    await foto('7-descendo');
    const lado1 = await page.evaluate(() => window.__brumaluz!.vilaCasa!.estado().trilho.trilho!.lado);
    // segurando o controle, vai e vem: o próximo trilho é para o outro lado
    await page.waitForFunction(
      (l) => {
        const t = window.__brumaluz!.vilaCasa!.estado().trilho.trilho;
        return !!t && t.lado === -l;
      },
      lado1,
      { timeout: 12_000 },
    );
    await page.waitForFunction(() => window.__brumaluz!.vilaCasa!.estado().trilho.fase === 'alto', undefined, {
      timeout: 6000,
    });
    await foto('8-la-em-cima-do-outro-lado');
    // de lado (olhando ao longo da rampa, de fora da ponta dela): o U, a borda de cromo, o
    // grafite da parede da ponta e a criança no meio do vai e vem
    // (a câmera atrás da criança, na linha de quem olha do meio da ponta da rampa, de longe)
    const deLado = () =>
      page.evaluate(
        ([R]) => {
          const e = window.__brumaluz!;
          const p = e.jogadorPes!();
          e.apontar!(Math.atan2(p[0] - R.x, p[2] - (R.z0 - 7)), 0.22);
        },
        [R] as const,
      );
    for (const [f, nome] of [
      ['sobe', 'de-lado-subindo'],
      ['alto', 'de-lado-la-em-cima'],
      ['desce', 'de-lado-descendo'],
    ] as const) {
      await page.waitForFunction((f) => window.__brumaluz!.vilaCasa!.estado().trilho.fase === f, f, {
        timeout: 12_000,
      });
      await deLado();
      await page.waitForTimeout(f === 'alto' ? 120 : 200);
      await deLado();
      await foto(nome);
    }
    // e de longe, de fora da ponta da rampa (a câmera de foto, parada no meio do U): o U inteiro,
    // a borda de cromo, o grafite e a criança subindo e lá em cima (sem o painel da foto)
    await page.addStyleTag({ content: '.painel-foto { display: none !important; }' });
    // (o trilho que começou vai até o fim sozinho: solta o controle, que no modo foto andaria
    // com a câmera)
    await page.waitForFunction(() => window.__brumaluz!.vilaCasa!.estado().trilho.fase === 'sobe', undefined, {
      timeout: 12_000,
    });
    await page.evaluate(
      ([R]) => {
        const e = window.__brumaluz!;
        e.controleDireto!.mover(0, 0);
        e.modoFoto!.alternar();
        e.modoFoto!.fov(85);
        e.modoFoto!.posicionar!(R.x, R.y + 5.2, R.z0 - 14);
        e.apontar!(0, Math.atan2(4.4, R.z - R.z0 + 14));
      },
      [R] as const,
    );
    await page.waitForTimeout(150);
    await foto('u-subindo');
    await page.waitForFunction(() => window.__brumaluz!.vilaCasa!.estado().trilho.fase === 'alto', undefined, {
      timeout: 6000,
    });
    await page.waitForTimeout(120);
    await foto('u-la-em-cima');
    await page.evaluate(() => window.__brumaluz!.modoFoto!.alternar());
    // soltou: para no fundo, de pé no skate
    await page.evaluate(() => window.__brumaluz!.controleDireto!.mover(0, 0));
    await page.waitForFunction(() => window.__brumaluz!.vilaCasa!.estado().trilho.trilho === null, undefined, {
      timeout: 10_000,
    });
    await page.waitForTimeout(1500);
    expect(await fase(page)).toBeNull();
    const p = await page.evaluate(() => window.__brumaluz!.jogadorPes!());
    expect(Math.abs(p[1] - R.y)).toBeLessThan(0.3);
    expect(Math.abs(p[0] - R.x)).toBeLessThanOrEqual(R.meia + 0.1);
    await foto('9-parou');

    // ---------------------------------------------------------------- os moradores e a BMX
    await page.evaluate(
      ([b, h]) => {
        const e = window.__brumaluz!;
        e.teleportar!(b[0] - 2.8, b[2] - 0.6, h + 1.2);
        e.apontar!(Math.atan2(2.8, 0.6), 0.3);
      },
      [pl.postos.bmx, pl.h] as const,
    );
    await page.waitForTimeout(1600);
    await foto('10-bmx');

    // ---------------------------------------------------------------- guardar no suporte
    await page.evaluate(
      ([sk, h]) => {
        const e = window.__brumaluz!;
        e.teleportar!(sk[0] + 2.6, sk[2] + 1.0, h + 1.2);
        e.apontar!(Math.atan2(-2.6, -1.0) - 0.25, 0.25);
      },
      [sk, pl.h] as const,
    );
    await page.waitForTimeout(1200);
    await esperarDica(page, 'skate-guardar', 'Toque para guardar');
    await foto('11-guardar-dica');
    const t2 = await alvoDoToque(page, 'skate-guardar');
    await page.touchscreen.tap(t2.x, t2.y);
    await page.waitForFunction(() => !window.__brumaluz!.personagem!.aparencia().skate);
    expect(erros).toEqual([]);
    await page.close();
  });
}
