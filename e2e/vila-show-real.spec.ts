import { expect, test, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { comecarGravacao, pararGravacao } from './gravarCena';
import { abrirMundo, assentar, escolherNaRoda, tocar } from './guia-palco';
import {
  PASTA,
  abrir,
  acender,
  ate,
  camera,
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
import { CHAMADO, ESPERA_FINAL, INTRO, ROTEIRO } from '../src/jogo/show';
import { REVERENCIA, SAI_DO_PALCO } from '../src/jogo/coreografia';

/**
 * Spec 026, o show de verdade (o dono, 16 nov 2026): as fotos e os vídeos de prova (só com
 * VILA_FOTOS=1, na placa de vídeo). `VILA_SO=fotos,analise,video1,video2` escolhe as partes
 * (analise: a banda de perto, sem os feixes, para conferir quem está onde).
 *
 * - **fotos:** a abertura (o escuro, as varreduras, o raio acendendo, a contagem), a entrada da
 *   banda (na escadinha, o vocalista cumprimentando), as músicas (o refrão com o vocalista na
 *   frente, o solo na ponta, a ponte de costas) e o fim (os fogos, a reverência, a saída);
 * - **video1** (celular deitado, com a interface e o som): a criança acende as três caixas, a
 *   missão fecha, a câmera gira, desce do palco e assiste à abertura, à entrada e à primeira música;
 * - **video2** (a cena, com o som): o fim da primeira música, a pausa, o começo da segunda; o
 *   chamado, o acorde final pelo toque, os fogos, a reverência e a banda saindo.
 */
declare const process: { env: Record<string, string | undefined> };
test.skip(!process.env.VILA_FOTOS, 'só com VILA_FOTOS');
test.setTimeout(1_800_000);
test.use({ actionTimeout: 30_000 });
const SO = (process.env.VILA_SO ?? '').split(',').filter(Boolean);
const quer = (s: string) => !SO.length || SO.includes(s);
const NOITE = 0.96;

const pular = (page: Page, s: number) => page.evaluate((s) => window.__brumaluz!.pularShow!(s), s);

test('o show de verdade: as fotos de cada momento', async ({ browser }) => {
  test.skip(!quer('fotos'), 'só com fotos');
  const page = await abrir(browser, 'vila-show-fotos', 'pc', 6);
  const p = await plano(page);
  const H = p.h + 1;
  const o = (u: number, alt: number, v: number): V3 => [p.ox + u, H + alt, p.oz + v];
  const pal = p.pontos.palco;
  const pass = p.pontos.passarela;
  const topo = pal.y + 1;
  await hora(page, NOITE);
  await ir(page, p.ox + 60.5, p.oz + 86.5, H + 0.2);
  await page.waitForTimeout(25_000);
  await esconderJogador(page, true);
  const largo = { p: o(61, 9, 76), a: [pass[0], topo + 3, pass[2] + 6] as V3 };
  const grade = { p: o(61, 6.6, 95), a: [pass[0], topo + 1.2, pass[2] + 7] as V3 };
  const escada = { p: o(87, 6, 106), a: [p.ox + 77.5, topo + 0.3, p.oz + 113] as V3 };
  await camera(page, largo.p, largo.a);
  await page.waitForTimeout(1500);
  await foto(page, 'show-antes');
  await acender(page);
  await ir(page, p.ox + 60.5, p.oz + 90, H + 0.2);
  const momentos: [string, number, { p: V3; a: V3 }][] = [
    ['abertura-escuro', 1.8, largo],
    ['abertura-varre', 6.2, largo],
    ['abertura-raio', 10.5, largo],
    ['abertura-contagem', 15.05, largo],
    ['abertura-estouro', INTRO + 0.35, largo],
    ['entrada-escada', INTRO + 5.8, escada],
    ['entrada-palco', INTRO + 10, grade],
    ['entrada-cumprimento', INTRO + 17.5, grade],
  ];
  for (const [nome, s, c] of momentos) {
    await camera(page, c.p, c.a);
    await ate(page, s);
    await foto(page, nome);
  }
  const m1 = ROTEIRO[0];
  const parte = (k: number, nome: string, vez = 0) =>
    ROTEIRO[k].partes.find((q) => q.pedaco === nome && q.vez === vez)!;
  const cenas: [string, number, { p: V3; a: V3 }][] = [
    ['musica1-verso', m1.inicio + 6, grade],
    ['musica1-refrao', parte(0, 'refrao').ini + 6, grade],
    ['musica1-refrao-largo', parte(0, 'refrao').ini + 12, largo],
    ['musica1-solo', parte(0, 'solo').ini + 5, grade],
    ['musica2-ponte', parte(1, 'ponte').ini + 6, grade],
    ['musica3-refrao-juntas', parte(2, 'refrao', 1).ini + 6, grade],
  ];
  for (const [nome, s, c] of cenas) {
    await pular(page, s - 1.2);
    await camera(page, c.p, c.a);
    await ate(page, s);
    await page.waitForTimeout(150);
    await foto(page, nome);
  }
  await pular(page, CHAMADO + 1);
  await camera(page, grade.p, grade.a);
  await ate(page, CHAMADO + 1.5);
  await foto(page, 'chamado');
  await page.evaluate(() => window.__brumaluz!.vilaComando!({ a: 'palco' }));
  const F = await page.evaluate(() => window.__brumaluz!.vilaEstado!()!.show!.final ?? 0);
  void F;
  const desde = async (s: number) => {
    for (let i = 0; i < 400; i++) {
      const d = await page.evaluate(() => {
        const e = window.__brumaluz!;
        const sh = e.vilaEstado!()?.show;
        return sh?.final != null ? e.vilaTempo!() - sh.final : -1;
      });
      if (d >= s) return;
      await page.waitForTimeout(40);
    }
  };
  const fim: [string, number, { p: V3; a: V3 }][] = [
    ['fim-acorde', 0.35, largo],
    ['fim-fogos', 1.9, largo],
    ['fim-fogos-2', 3.4, largo],
    ['fim-reverencia', REVERENCIA + 0.9, grade],
    ['fim-saida', SAI_DO_PALCO + 4.5, escada],
  ];
  for (const [nome, s, c] of fim) {
    await camera(page, c.p, c.a);
    await desde(s);
    await foto(page, nome);
  }
  void ESPERA_FINAL;
  void medir;
  await page.context().close();
});

test('analise: a banda de perto, sem os feixes', async ({ browser }) => {
  test.skip(!quer('analise'), 'só com analise');
  const page = await abrir(browser, 'vila-show-analise', 'pc', 4);
  const p = await plano(page);
  const H = p.h + 1;
  const o = (u: number, alt: number, v: number): V3 => [p.ox + u, H + alt, p.oz + v];
  const pass = p.pontos.passarela;
  const topo = p.pontos.palco.y + 1;
  await hora(page, NOITE);
  await ir(page, p.ox + 60.5, p.oz + 86.5, H + 0.2);
  await page.waitForTimeout(20_000);
  await esconderJogador(page, true);
  await page.evaluate(() => {
    (window as unknown as { __esconder: string[] }).__esconder = [
      'personagem',
      'braco',
      'vila-show-feixes',
    ];
  });
  await acender(page);
  await ir(page, p.ox + 60.5, p.oz + 90, H + 0.2);
  const perto = { p: o(61, 4.6, 99.5), a: [pass[0], topo + 1.3, pass[2] + 9] as V3 };
  const alto = { p: o(61, 12, 100), a: [pass[0], topo, pass[2] + 9] as V3 };
  const m = ROTEIRO;
  const parte = (k: number, nome: string, vez = 0) =>
    m[k].partes.find((q) => q.pedaco === nome && q.vez === vez)!;
  const cenas: [string, number][] = [
    ['entrada-1', INTRO + 6],
    ['entrada-2', INTRO + 10],
    ['entrada-3', INTRO + 17.5],
    ['m1-verso', m[0].inicio + 6],
    ['m1-refrao-a', parte(0, 'refrao').ini + 4],
    ['m1-refrao-b', parte(0, 'refrao').ini + 12],
    ['m1-solo', parte(0, 'solo').ini + 5],
    ['pausa', m[0].fim + 3],
    ['m2-ponte', parte(1, 'ponte').ini + 6],
    ['m3-refrao-juntas', parte(2, 'refrao', 1).ini + 7],
    ['chamado', CHAMADO + 1],
  ];
  for (const [nome, t] of cenas) {
    await pular(page, t - 1.3);
    await camera(page, perto.p, perto.a);
    await ate(page, t);
    await foto(page, `analise-${nome}`);
    await camera(page, alto.p, alto.a);
    await page.waitForTimeout(100);
    await foto(page, `analise-${nome}-alto`);
  }
  await page.evaluate(() => window.__brumaluz!.vilaComando!({ a: 'palco' }));
  for (const [nome, s] of [
    ['fim-pulo', 1],
    ['fim-fila', REVERENCIA - 0.4],
    ['fim-reverencia', REVERENCIA + 0.9],
    ['fim-saida', SAI_DO_PALCO + 3],
  ] as const) {
    for (let i = 0; i < 400; i++) {
      const d = await page.evaluate(() => {
        const e = window.__brumaluz!;
        const sh = e.vilaEstado!()?.show;
        return sh?.final != null ? e.vilaTempo!() - sh.final : -1;
      });
      if (d >= s) break;
      await page.waitForTimeout(40);
    }
    await camera(page, perto.p, perto.a);
    await foto(page, `analise-${nome}`);
  }
  await page.context().close();
});

/** O vídeo da página (com a interface) e o som do jogo, juntos depois pelo ffmpeg. */
async function somDaPagina(page: Page, segundos: number) {
  const t = Date.now();
  const r = page.evaluate((s) => window.__brumaluz!.gravarSom?.(s) ?? null, segundos);
  return { t, r };
}

test('video1: acende as três caixas, a missão fecha, a câmera gira e o show começa (celular)', async ({
  browser,
}) => {
  test.skip(!quer('video1'), 'só com video1');
  mkdirSync(PASTA, { recursive: true });
  const nasceu = Date.now();
  const page = await abrirMundo(browser, {
    id: 'vila-show-video1',
    tema: 'vila-neon',
    tamanho: 'deitado',
    extras: { alma: { local: { feitas: ['f1'] } } },
    video: `${PASTA}/video1`,
  });
  await assentar(page);
  await page.waitForFunction(() => !!window.__guia && !!window.__vila, undefined, {
    timeout: 30_000,
  });
  const cdp = await page.context().newCDPSession(page);
  const arrastar = async (dx: number, passos = 26) => {
    const v = page.viewportSize()!;
    const x0 = v.width * (dx > 0 ? 0.45 : 0.8);
    const y0 = v.height * 0.4;
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x: x0, y: y0, id: 3 }],
    });
    for (let i = 1; i <= passos; i++) {
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ x: x0 + (dx * i) / passos, y: y0, id: 3 }],
      });
      await page.waitForTimeout(28);
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  };
  // o selinho com a f3; de noite
  await escolherNaRoda(page, 'missoes');
  await page.waitForSelector('[data-alma-quadro]', { timeout: 20_000 });
  await page.waitForTimeout(800);
  await tocar(page, '[data-alma-jogar="f3"]');
  await page.waitForTimeout(1200);
  await page.evaluate(() => {
    window.__brumaluz!.hora = 0.9;
  });
  const p = await page.evaluate(() => {
    const v = window.__brumaluz!.vila!()!;
    return { caixas: v.pontos.caixas, palco: v.pontos.palco };
  });
  // a criança já no palco, na frente da primeira caixa
  await page.evaluate(
    ([x, z]) => {
      const e = window.__brumaluz!;
      e.teleportar!(x + 0.5, z - 1.35);
      e.apontar!(0, 0.25);
    },
    [p.caixas[0][0], p.caixas[0][2]],
  );
  await page.waitForTimeout(22_000);
  const som = await somDaPagina(page, 95);
  const t0 = Date.now();
  // toca nas três (a mãozinha mostra), andando de uma para a outra
  for (let i = 0; i < 3; i++) {
    if (i > 0) {
      await page.evaluate(
        ([x, z]) =>
          new Promise<void>((ok) => {
            const e = window.__brumaluz!;
            const ctl = e.controleDireto!;
            const passo = () => {
              const pes = e.jogadorPes!();
              const dx = x + 0.5 - pes[0];
              const dz = z - 1.35 - pes[2];
              if (Math.hypot(dx, dz) < 0.5) {
                ctl.mover(0, 0);
                ok();
                return;
              }
              const [pp, yaw] = e.rotacao!;
              const alvo = Math.atan2(dx, dz);
              const d = Math.atan2(Math.sin(alvo - yaw), Math.cos(alvo - yaw));
              ctl.mover(Math.cos(d), Math.sin(d));
              void pp;
              setTimeout(passo, 40);
            };
            passo();
          }),
        [p.caixas[i][0], p.caixas[i][2]],
      );
      await page.evaluate(() => window.__brumaluz!.apontar!(0, 0.25));
      await page.waitForTimeout(500);
    }
    const alvo = await page
      .waitForFunction((i) => window.__vila!.caixas().find((c) => c.i === i)?.t ?? null, i, {
        timeout: 10_000,
      })
      .then((h) => h.jsonValue() as Promise<{ x: number; y: number }>);
    await page.waitForTimeout(700);
    await page.touchscreen.tap(alvo.x, alvo.y);
    await page.waitForTimeout(900);
  }
  passo('acendeu as três');
  await page.waitForSelector('[data-alma-festa]', { timeout: 15_000 });
  await page.waitForTimeout(3200);
  await page.locator('[data-alma-festa] [data-alma-oba]').tap();
  await page.waitForFunction(() => !document.body.dataset.overlay, undefined, { timeout: 10_000 });
  await page.waitForTimeout(400);
  // a câmera gira na hora: a criança olha em volta (o povo chegando), volta e fica na beira do
  // palco, ao lado da caixa, olhando o palco inteiro de lado (a banda sobe a escadinha bem ali)
  await arrastar(-260);
  await page.waitForTimeout(500);
  await arrastar(520, 40);
  await page.waitForTimeout(900);
  await arrastar(-300, 30);
  await page.evaluate(() => {
    const e = window.__brumaluz!;
    e.camera?.definirZoom(6);
    e.apontar!(-1.05, 0.2);
  });
  passo('assistindo');
  await ate(page, ROTEIRO[0].inicio + 22);
  await page.evaluate(() => window.__brumaluz!.pararSom?.());
  const r = await som.r;
  const fimS = (Date.now() - nasceu) / 1000;
  writeFileSync(
    `${PASTA}/video1/trecho.json`,
    JSON.stringify({ inicio: (t0 - nasceu) / 1000, fim: fimS, som: (som.t - nasceu) / 1000 }),
  );
  if (r) salvarWav(r, `${PASTA}/video1/som.wav`);
  await page.context().close();
  expect(r).toBeTruthy();
});

test('video2: a pausa entre as músicas e o fim do show', async ({ browser }) => {
  test.skip(!quer('video2'), 'só com video2');
  const page = await abrir(browser, 'vila-show-video2', 'pc', 6);
  const p = await plano(page);
  const H = p.h + 1;
  const o = (u: number, alt: number, v: number): V3 => [p.ox + u, H + alt, p.oz + v];
  const pass = p.pontos.passarela;
  const topo = p.pontos.palco.y + 1;
  await page.mouse.click(640, 420);
  await hora(page, NOITE);
  await ir(page, p.ox + 60.5, p.oz + 86.5, H + 0.2);
  await page.waitForTimeout(25_000);
  await esconderJogador(page, true);
  const largo = { p: o(61, 9, 76), a: [pass[0], topo + 3, pass[2] + 6] as V3 };
  const grade = { p: o(61, 8.2, 93), a: [pass[0], topo + 1.6, pass[2] + 7] as V3 };
  const lado = { p: o(47, 7.5, 96), a: [pass[0] + 1, topo + 1.4, pass[2] + 7] as V3 };
  const escada = { p: o(87, 6, 106), a: [p.ox + 77.5, topo + 0.3, p.oz + 113] as V3 };
  const ceu = { p: o(61, 15, 84), a: [pass[0], topo + 9, pass[2] + 10] as V3 };
  await camera(page, grade.p, grade.a);
  await acender(page);
  await ir(page, p.ox + 60.5, p.oz + 88, H + 0.2);
  mkdirSync(PASTA, { recursive: true });
  // 1. o fim da primeira música, a pausa (a banda acena, o povo aplaude) e a segunda começando
  const m1 = ROTEIRO[0];
  await pular(page, m1.fim - 9);
  await ate(page, m1.fim - 8.6);
  let som = page.evaluate((s) => window.__brumaluz!.gravarSom?.(s) ?? null, 26);
  await comecarGravacao(page, 30);
  await voo(page, [grade, lado], 9);
  await voo(page, [lado, largo], 8);
  await voo(page, [largo, grade], 8);
  await pararGravacao(page, `${PASTA}/video2-pausa.webm`);
  await page.evaluate(() => window.__brumaluz!.pararSom?.());
  let r = await som;
  if (r) salvarWav(r, `${PASTA}/video2-pausa.wav`);
  // 2. o chamado, o toque da criança, o acorde final, os fogos, a reverência e a saída
  await pular(page, CHAMADO - 2.5);
  await camera(page, largo.p, largo.a);
  await camera(page, largo.p, largo.a);
  await ate(page, CHAMADO - 2);
  som = page.evaluate((s) => window.__brumaluz!.gravarSom?.(s) ?? null, 30);
  await comecarGravacao(page, 30);
  await ate(page, CHAMADO + 1.6);
  await page.evaluate(() => window.__brumaluz!.vilaComando!({ a: 'palco' }));
  await voo(page, [largo, ceu], 1.2);
  await voo(page, [ceu, ceu], 5.4);
  await voo(page, [ceu, grade], 4.4);
  await voo(page, [grade, grade], 6);
  await voo(page, [grade, escada], 4);
  await voo(page, [escada, escada], 7.5);
  await pararGravacao(page, `${PASTA}/video2-fim.webm`);
  await page.evaluate(() => window.__brumaluz!.pararSom?.());
  r = await som;
  if (r) salvarWav(r, `${PASTA}/video2-fim.wav`);
  await page.context().close();
});
