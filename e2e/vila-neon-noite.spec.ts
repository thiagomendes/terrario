import { expect, test } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { comecarGravacao, pararGravacao } from './gravarCena';
import { escolherNaRoda, tocar } from './guia-palco';
import {
  PASTA,
  abrir,
  acender,
  assentar,
  ate,
  camera,
  decorrido,
  esconderJogador,
  foto,
  hora,
  ir,
  medir,
  passo,
  plano,
  salvarWav,
  voo,
  type V3,
} from './vila-noite-palco';
import { CHAMADO, ESPERA_FINAL } from '../src/jogo/show';

/**
 * Spec 026 (decisões do dono, 15 nov 2026): o show só de noite e o público do show. As fotos, as
 * medidas do celular e o vídeo da noite do show (só com VILA_FOTOS=1, na placa de vídeo:
 * scripts/e2e-gpu.sh). `VILA_SO=dia,noite,medida,video` escolhe as partes.
 *
 * - de dia: o palco vazio (a banda de papo na frente da van, atrás do palco: 16 nov 2026);
 * - a noite chega: o palco aquece; o show sozinho com a turma (uns 40, espalhados pelo campo; de
 *   longe, da grade, por trás e da grade virado para o povo);
 * - as medidas (peças, moradores, chamadas de desenho) no nascer e na grade no meio do show;
 * - o vídeo (~30 s, deitado) da noite do show com o público, com o som do jogo.
 *
 * (O show de verdade, de uns 6 min, tem os vídeos e as fotos dele em vila-show-real.spec.ts;
 * aqui o relógio do show é pulado com o atalho dos testes para chegar ao fim.)
 */
declare const process: { env: Record<string, string | undefined> };
test.skip(!process.env.VILA_FOTOS, 'só com VILA_FOTOS');
test.setTimeout(1_500_000);
// um clique que nunca fica pronto falha em vez de travar o teste inteiro
test.use({ actionTimeout: 30_000 });

const SO = (process.env.VILA_SO ?? '').split(',').filter(Boolean);
const quer = (s: string) => !SO.length || SO.includes(s);
const NOITE = 0.96;

test('o show só de noite e o público (fotos e vídeo)', async ({ browser }) => {
  const page = await abrir(browser, 'vila-noite-fotos', 'pc', 6);
  const p = await plano(page);
  const H = p.h + 1;
  const o = (u: number, alt: number, v: number): V3 => [p.ox + u, H + alt, p.oz + v];
  const pal = p.pontos.palco;
  const pass = p.pontos.passarela;
  const topo = pal.y + 1;
  // o primeiro toque liga o som (com o quadro, o toque no menu já liga; o clique na cena
  // prende o ponteiro e o menu não recebe mais o clique)
  if (!quer('dia')) {
    await page.mouse.click(640, 420);
    await page.waitForTimeout(500);
  }

  if (quer('dia')) {
    passo('dia');
    // a criança no campo, olhando o palco: de dia o palco fica vazio (a banda está na van)
    await ir(page, p.ox + 60.5, p.oz + 86.5, H + 0.2);
    await assentar(page, 20);
    await page.evaluate(() => window.__brumaluz!.apontar!(0, -0.02));
    await page.waitForTimeout(9000);
    await foto(page, 'dia-palco-vazio', true);
    const naBanda = await page.evaluate(() => {
      const e = window.__brumaluz!;
      const pal = e.vila!()!.pontos.palco;
      return (e.criaturas?.() ?? []).filter(
        (c) =>
          (c as { profissao?: string }).profissao &&
          c.y > pal.y + 0.5 &&
          c.x >= pal.x0 &&
          c.x <= pal.x1 + 1 &&
          c.z >= pal.z0 &&
          c.z <= pal.z1 + 1,
      ).length;
    });
    expect(naBanda).toBe(0);
    // de perto: o palco vazio e a turma de dia (só quatro); atrás do palco, a banda na van
    await esconderJogador(page, true);
    await camera(page, o(54, 3.2, 92), [pass[0], topo + 1.2, pass[2] + 4]);
    await page.waitForTimeout(2500);
    await foto(page, 'dia-palco-vazio-perto');
    await camera(page, o(88, 4.5, 118), o(82, 1.2, 124.5));
    await page.waitForTimeout(2500);
    await foto(page, 'dia-banda-na-van');
    await medir(page, 'campo-dia');
    await camera(page, null);
    await esconderJogador(page, false);
  }

  if (quer('noite') || quer('video')) {
    passo('noite chega');
    // a noite chega com a criança no campo: o palco aquece e o povo chega
    await ir(page, p.ox + 60.5, p.oz + 86.5, H + 0.2);
    await page.evaluate(() => window.__brumaluz!.apontar!(0, -0.02));
    await page.waitForTimeout(1500);
    await hora(page, NOITE);
    await page.waitForTimeout(2600);
    await foto(page, 'noite-chegou', true);
    const aq = await page.evaluate(() => window.__brumaluz!.showVila?.()?.aquecimentos ?? 0);
    console.log(`AQUECEU ${aq}`);
    expect(aq).toBeGreaterThanOrEqual(1);
    await page.waitForTimeout(24_000);
    await esconderJogador(page, true);
    await camera(page, o(60, 9, 76), [pass[0], topo + 2, pass[2] + 6]);
    await page.waitForTimeout(1500);
    await foto(page, 'noite-antes-do-show');
    await medir(page, 'campo-noite-antes');
  }

  if (quer('noite')) {
    passo('show');
    await acender(page);
    await ir(page, p.ox + 60.5, p.oz + 97.5, H + 0.2);
    // no meio da primeira música (a banda no palco)
    await page.evaluate(() => window.__brumaluz!.pularShow!(60));
    await ate(page, 61);
    // de longe (de cima, atrás do campo)
    await camera(page, o(61, 8.5, 74.5), [pass[0], topo + 1.5, pass[2] + 5]);
    await page.waitForTimeout(800);
    await foto(page, 'noite-show-largo');
    // da grade (na altura da criança, de lado para a turma)
    await camera(page, o(63.6, 1.55, 98.6), [pass[0] - 9, topo + 1.4, pass[2] + 3]);
    await page.waitForTimeout(600);
    await foto(page, 'noite-show-grade');
    // por cima do povo, atrás da turma da grade: as costas, a grade, o palco e os feixes
    await camera(page, o(51, 3.6, 93.8), [pass[0] - 2, topo + 1, pass[2] + 4]);
    await page.waitForTimeout(600);
    await foto(page, 'noite-show-grade-palco');
    // da grade, virado para o povo: a festa de frente, até o portão
    await camera(page, o(61.5, 2.3, 99.2), [p.ox + 46, H + 0.9, p.oz + 92]);
    await page.waitForTimeout(600);
    await foto(page, 'noite-show-grade-povo');
    // o povo visto de trás (a criança chegando pelo campo)
    await camera(page, o(49, 2.3, 84.5), [pass[0] - 3, topo + 0.8, pass[2] + 2]);
    await page.waitForTimeout(600);
    await foto(page, 'noite-plateia-costas');
    await camera(page, o(71, 2.4, 89.5), [pass[0] - 5, topo + 0.4, pass[2] + 1]);
    await page.waitForTimeout(600);
    await foto(page, 'noite-plateia-costas-2');
    await ate(page, 66);
    await camera(page, o(61, 8.5, 74.5), [pass[0], topo + 1.5, pass[2] + 5]);
    await medir(page, 'show-largo');
    // a turma dança (de verdade, nas juntas): quantos de braço para o alto agora
    const bracos = await page.evaluate(() => {
      const nos = window.__brumaluz!.cenaBabylon!().transformNodes.filter((n) =>
        /^morador-\d+-junta-bracoD$/.test(n.name),
      );
      return nos.map((n) => Math.round(Math.abs(n.rotation.z) * 100) / 100);
    });
    console.log(`BRACOS ${JSON.stringify(bracos)}`);
    expect(bracos.filter((b) => b > 2).length).toBeGreaterThanOrEqual(5);
    // espera o show acabar sozinho (pulando para o chamado: o acorde final vem sozinho no fim dele)
    await page.evaluate((s) => window.__brumaluz!.pularShow!(s), CHAMADO - 1);
    for (let i = 0; i < 600 && (await decorrido(page)) >= 0; i++) await page.waitForTimeout(100);
  }

  if (quer('video')) {
    passo('video');
    // um show por noite: a noite seguinte (o dia do mundo vira), e o show vem de novo, sozinho
    await page.evaluate(() => {
      const e = window.__brumaluz!;
      e.definirDia!(e.dia!() + 1);
      e.hora = 0.42;
    });
    await page.waitForTimeout(1500);
    await hora(page, NOITE);
    await page.waitForTimeout(1500);
    await esconderJogador(page, true);
    const largo = { p: o(61, 8.5, 73.5), a: [pass[0], topo + 1.5, pass[2] + 5] as V3 };
    const costas = { p: o(50, 2.4, 82), a: [pass[0] - 2, topo + 0.8, pass[2] + 2] as V3 };
    const costas2 = { p: o(60.2, 2.2, 92.5), a: [pass[0] - 1, topo + 1, pass[2] + 3] as V3 };
    // atrás da turma da grade (as costas, o palco) e da grade virado para o povo (a festa de
    // frente); nada de câmera atravessando o palco
    const atras = { p: o(51, 3.6, 93.8), a: [pass[0] - 2, topo + 1, pass[2] + 4] as V3 };
    const povo = { p: o(61.5, 2.3, 99.2), a: [p.ox + 46, H + 0.9, p.oz + 92] as V3 };
    await camera(page, largo.p, largo.a);
    await acender(page);
    await ir(page, p.ox + 60.5, p.oz + 97.6, H + 0.2);
    await page.evaluate(() => window.__brumaluz!.pularShow!(70));
    await ate(page, 71);
    mkdirSync(PASTA, { recursive: true });
    const som = page.evaluate((s) => window.__brumaluz!.gravarSom?.(s) ?? null, 34);
    await comecarGravacao(page, 30);
    const t0 = Date.now();
    await voo(page, [largo, costas, costas2], 9);
    await voo(page, [costas2, atras], 4);
    await voo(page, [atras, povo], 6);
    await page.waitForTimeout(1500);
    await voo(page, [povo, atras], 5);
    // o acorde final, que vem sozinho no fim do chamado
    await page.evaluate((s) => window.__brumaluz!.pularShow!(s), CHAMADO + ESPERA_FINAL - 1.5);
    await voo(page, [atras, largo], Math.max(2, 32 - (Date.now() - t0) / 1000));
    await pararGravacao(page, `${PASTA}/noite-show.webm`);
    await page.evaluate(() => window.__brumaluz!.pararSom?.());
    const r = await som;
    if (r) salvarWav(r, `${PASTA}/noite-show.wav`);
    else console.log('VIDEO sem som');
  }
  await page.context().close();
});

test('celular: o quadro em pé (a f4) e as medidas no nascer e na grade', async ({ browser }) => {
  test.skip(!quer('medida'), 'só com medida');
  const page = await abrir(browser, 'vila-noite-celular', 'empe', 3);
  const p = await plano(page);
  const H = p.h + 1;
  // o quadro em pé, de dia: a f4 (a volta no rinque) inteira, sem lua nem espera
  await escolherNaRoda(page, 'missoes');
  await page.waitForSelector('[data-alma-quadro]', { timeout: 20_000 });
  await page.waitForTimeout(900);
  await page.locator('[data-missao="f4"]').scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  await foto(page, 'celular-quadro-dia-f4', true);
  await tocar(page, '[data-alma-jogar="f4"]');
  await page.waitForTimeout(2500);
  await foto(page, 'celular-nascer-dia-f4', true);
  // no nascer: as peças de dia e de noite (o povo é do festival: nada aqui)
  await medir(page, 'celular-nascer-dia');
  await hora(page, NOITE);
  await page.waitForTimeout(3000);
  await medir(page, 'celular-nascer-noite');
  // na grade, no meio do show
  await acender(page);
  await ir(page, p.ox + 60.5, p.oz + 98.4, H + 0.2);
  await page.evaluate(() => window.__brumaluz!.apontar!(0, 0.1));
  await assentar(page, 12);
  // no meio da primeira música: a banda inteira no palco, os feixes e as estrelinhas do refrão
  // (a turma chega à grade na abertura e na entrada)
  await ate(page, 30);
  await page.evaluate(() => window.__brumaluz!.pularShow!(58));
  await ate(page, 59);
  await page.waitForTimeout(3000);
  await medir(page, 'celular-grade-show');
  await foto(page, 'celular-grade-show', true);
  // o pior caso: do meio do campo, olhando o palco por cima do público (os 40 e o palco à vista)
  await ir(page, p.ox + 60.5, p.oz + 84, H + 0.2);
  await page.evaluate(() => window.__brumaluz!.apontar!(0, 0.02));
  await page.waitForTimeout(2500);
  const povo = await medir(page, 'celular-grade-povo');
  await foto(page, 'celular-grade-povo', true);
  expect(povo.fps).toBeGreaterThanOrEqual(45);
  await page.context().close();
});

/**
 * O vídeo do show sozinho (decisão do dono, 15 nov 2026): todas as missões feitas, a noite já
 * aberta, a criança chega pela avenida, entra pelo portão e vai até a grade sem tocar em nada; as
 * caixas acendem uma a uma, a banda toca e a turma vai dançar na grade. ~30 s da cena (celular
 * deitado), com o som do jogo à parte (.wav); fotos com a interface. `VILA_SO=sozinho`.
 */
test('o show começa sozinho: a criança chega de noite e não toca em nada (vídeo)', async ({
  browser,
}) => {
  test.skip(!quer('sozinho'), 'só com VILA_SO=sozinho');
  const page = await abrir(browser, 'vila-show-sozinho', 'deitado', 4, ['f1', 'f2', 'f3']);
  const p = await plano(page);
  // o primeiro toque liga o som (no céu)
  await page.touchscreen.tap(420, 60);
  await page.waitForTimeout(500);
  // a criança na avenida, de frente para o portão do festival; a noite já aberta há um tempo
  await ir(page, p.ox + 60.5, p.oz + 62.5, p.h + 1.2);
  await page.evaluate(() => window.__brumaluz!.apontar!(0, 0.3));
  await hora(page, 0.82);
  await assentar(page, 20);
  await page.waitForTimeout(24_000);
  expect(await page.evaluate(() => window.__brumaluz!.vilaEstado!()?.show ?? null)).toBeNull();
  mkdirSync(PASTA, { recursive: true });
  const som = page.evaluate((s) => window.__brumaluz!.gravarSom?.(s) ?? null, 32);
  const t0 = Date.now();
  await comecarGravacao(page, 30);
  await page.waitForTimeout(1200);
  // anda até a grade (o joystick de verdade), sem tocar em nada
  await page.evaluate(
    (zAlvo) =>
      new Promise<void>((ok) => {
        const e = window.__brumaluz!;
        const ctl = e.controleDireto!;
        ctl.tecla('rapido', false);
        const passo = () => {
          const pes = e.jogadorPes!();
          if (pes[2] >= zAlvo) {
            ctl.mover(0, 0);
            ok();
            return;
          }
          e.apontar!(0, 0.3);
          ctl.mover(1, 0);
          setTimeout(passo, 60);
        };
        passo();
      }),
    p.oz + 97.2,
  );
  passo('chegou à grade');
  await page.waitForFunction(() => !!window.__brumaluz!.vilaEstado!()?.show, undefined, {
    timeout: 30_000,
  });
  passo('o show começou');
  await page.waitForTimeout(3000);
  await foto(page, 'sozinho-show-comecou', true);
  // olha devagar para a turma dançando e volta para o palco
  await page.evaluate(
    () =>
      new Promise<void>((ok) => {
        const e = window.__brumaluz!;
        const t0 = performance.now();
        const giro = () => {
          const u = Math.min(1, (performance.now() - t0) / 9000);
          e.apontar!(Math.sin(u * Math.PI) * 1.9, 0.22);
          if (u < 1) requestAnimationFrame(giro);
          else ok();
        };
        giro();
      }),
  );
  await foto(page, 'sozinho-show-turma', true);
  await page.waitForTimeout(Math.max(0, 31_000 - (Date.now() - t0)));
  await pararGravacao(page, `${PASTA}/sozinho.webm`);
  await page.evaluate(() => window.__brumaluz!.pararSom?.());
  const r = await som;
  if (r) salvarWav(r, `${PASTA}/sozinho.wav`);
  else console.log('VIDEO sem som');
  const acesas = await page.evaluate(() =>
    (window.__brumaluz!.eventosVila ?? [])
      .filter((e) => e.e === 'vilaCaixa')
      .map((e) => `${(e as { i: number }).i}:${e.quem}`),
  );
  console.log(`SOZINHO caixas ${JSON.stringify(acesas)}`);
  expect(acesas).toEqual(['0:auto', '1:auto', '2:auto']);
  await page.context().close();
});
