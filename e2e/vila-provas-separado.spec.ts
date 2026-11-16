import { expect, test, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { comecarGravacao, pararGravacao } from './gravarCena';
import { abrirMundo, andarPelaTrilha, assentar, escolherNaRoda, tocar } from './guia-palco';
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
  plano,
  salvarWav,
  voo,
  type V3,
} from './vila-noite-palco';
import { ENTRADA, INTRO, ROTEIRO } from '../src/jogo/show';
import { LUGAR, paraOMundo } from '../src/jogo/coreografia';

/**
 * Spec 026, o show separado das missões (o dono, 16 nov 2026): as provas (só com VILA_FOTOS=1,
 * na placa de vídeo). `VILA_SO=rinque,show,fotos` escolhe as partes.
 * - **rinque:** a f4 de ponta a ponta, como a criança: as pegadinhas até o suporte, o toque que
 *   calça os patins, e as pegadinhas por dentro dos três arcos, com o som do jogo;
 * - **show:** a banda que sobe da coxia pela escadinha na abertura, a tecladista no teclado, o
 *   teclado de pendurar, e o público de 40, com o som do show (sem passarinho);
 * - **fotos:** o palco vazio de dia, os arcos de dia e de noite, o público de trás e da grade.
 */
declare const process: { env: Record<string, string | undefined> };
test.skip(!process.env.VILA_FOTOS, 'só com VILA_FOTOS');
test.setTimeout(1_500_000);
test.use({ actionTimeout: 30_000 });
const SO = (process.env.VILA_SO ?? '').split(',').filter(Boolean);
const quer = (s: string) => !SO.length || SO.includes(s);

/** Anda (o joystick de verdade) até (x, z), no máximo `teto` ms. */
async function andarAte(page: Page, x: number, z: number, teto = 12_000) {
  await page.evaluate(
    ([x, z, teto]) =>
      new Promise<void>((ok) => {
        const e = window.__brumaluz!;
        const ctl = e.controleDireto!;
        const t0 = performance.now();
        const passo = () => {
          const pes = e.jogadorPes!();
          const dx = x - pes[0];
          const dz = z - pes[2];
          if (Math.hypot(dx, dz) < 0.6 || performance.now() - t0 > teto) {
            ctl.mover(0, 0);
            ok();
            return;
          }
          const yaw = e.rotacao![1];
          const alvo = Math.atan2(dx, dz);
          const d = Math.atan2(Math.sin(alvo - yaw), Math.cos(alvo - yaw));
          ctl.mover(Math.cos(d), Math.sin(d));
          setTimeout(passo, 40);
        };
        passo();
      }),
    [x, z, teto] as const,
  );
}

async function somDe(page: Page, s: number) {
  return page.evaluate((s) => window.__brumaluz!.gravarSom?.(s) ?? null, s);
}

test('rinque: a volta no rinque de patins (vídeo)', async ({ browser }) => {
  test.skip(!quer('rinque'), 'só com rinque');
  // (no celular deitado: o dedo de verdade no suporte, como a criança)
  const page = await abrirMundo(browser, {
    id: 'vila-prova-rinque',
    tema: 'vila-neon',
    tamanho: 'deitado',
    extras: { alma: { local: { feitas: ['f1'] } } },
  });
  await page.addStyleTag({ content: '.dica-mira { display: none !important; }' });
  await assentar(page);
  await page.waitForFunction(() => !!window.__guia && !!window.__vila, undefined, {
    timeout: 30_000,
  });
  await page.waitForTimeout(1500);
  // (o toque no menu já liga o som; o clique na cena prenderia o ponteiro antes do menu)
  await escolherNaRoda(page, 'missoes');
  await page.waitForSelector('[data-alma-quadro]', { timeout: 20_000 });
  await page.waitForTimeout(800);
  mkdirSync(PASTA, { recursive: true });
  const gravar = !process.env.SEM_GRAVAR;
  const som = gravar ? somDe(page, 75) : Promise.resolve(null);
  if (gravar) await comecarGravacao(page, 30);
  // escolheu a volta no rinque: a câmera vira para as pegadinhas, que nascem até o suporte
  await tocar(page, '[data-alma-jogar="f4"]');
  await page.waitForTimeout(4500);
  const t0 = Date.now();
  let arcos = 0;
  for (let volta = 0; volta < 14; volta++) {
    const festa = await page.locator('[data-alma-festa]').count();
    if (festa) break;
    const r = await andarPelaTrilha(page, 50_000);
    console.log(`PROVA trilha ${r.alvo} chegou=${r.chegou} ${r.s.toFixed(1)} s`);
    if (r.alvo === 'patins') {
      await page.waitForTimeout(600);
      if (await page.evaluate(() => !!window.__brumaluz!.personagem?.aparencia().patins)) continue;
      const t = await page.evaluate(() => {
        const e = window.__brumaluz!;
        const [x, y, z] = e.vila!()!.pontos.patins;
        return e.telaDoPonto!(x, y + 1, z);
      });
      await page.touchscreen.tap(t!.x, t!.y);
      await page.waitForFunction(() => !!window.__brumaluz!.personagem?.aparencia().patins);
      // o guia troca o alvo para o primeiro arco (confere a cada 1,5 s)
      await page.waitForFunction(() => window.__guia!.alvo()?.chave !== 'patins', undefined, {
        timeout: 8000,
      });
      await page.waitForTimeout(500);
    } else {
      if (r.alvo?.startsWith('arco')) arcos++;
      // o guia troca de alvo a cada 1,5 s: espera ele achar o próximo arco
      await page.waitForTimeout(1600);
    }
  }
  // a festa (na interface); depois mais uma volta de patins, por dentro dos três arcos acesos
  await page.waitForTimeout(3500);
  for (let k = 0; k < 20 && (await page.locator('[data-alma-festa]').count()); k++) {
    const ok = page.locator('[data-alma-festa] [data-alma-oba], [data-alma-festa] button');
    if (await ok.count())
      await ok
        .first()
        .tap()
        .catch(() => undefined);
    await page.waitForTimeout(700);
  }
  const a = await page.evaluate(() => window.__brumaluz!.vila!()!.pontos.arcos);
  const volta: [number, number][] = [
    [a[0].x, a[0].z - 3.5],
    [a[0].x, a[0].z + 3.5],
    [a[1].x - 3.5, a[1].z],
    [a[1].x + 3.5, a[1].z],
    [a[2].x, a[2].z + 3.5],
    [a[2].x, a[2].z - 3.5],
    [(a[0].x + a[2].x) / 2, a[0].z - 3.5],
  ];
  for (const [x, z] of volta) await andarAte(page, x, z);
  await page.waitForTimeout(3500);
  if (gravar) await pararGravacao(page, `${PASTA}/rinque.webm`);
  await page.evaluate(() => window.__brumaluz!.pararSom?.());
  const r = await som;
  if (r) salvarWav(r, `${PASTA}/rinque.wav`);
  console.log(`PROVA rinque ${((Date.now() - t0) / 1000).toFixed(0)} s, arcos ${arcos}`);
  expect(
    await page.evaluate(
      () => (window.__brumaluz!.eventosVila ?? []).filter((e) => e.e === 'vilaArco').length,
    ),
  ).toBeGreaterThanOrEqual(3);
  await page.context().close();
});

test('show: a banda sobe da coxia, a tecladista e o público de 40 (vídeo)', async ({ browser }) => {
  test.skip(!quer('show'), 'só com show');
  const page = await abrir(browser, 'vila-prova-show', 'pc', 6);
  const p = await plano(page);
  const H = p.h + 1;
  const o = (u: number, alt: number, v: number): V3 => [p.ox + u, H + alt, p.oz + v];
  const pal = p.pontos.palco;
  const topo = pal.y + 1;
  const pass = p.pontos.passarela;
  await page.mouse.click(640, 120);
  await hora(page, 0.9);
  await acender(page);
  await ir(page, p.ox + 60.5, p.oz + 97.6, H + 0.2);
  await esconderJogador(page, true);
  // a coxia e a escadinha de lado (a banda esperando, depois subindo)
  const coxia = { p: o(86, 4.8, 104), a: o(80.8, 1.6, 114.5) };
  const escada = { p: o(84.6, 6.8, 100.2), a: o(76, 3.2, 110.5) };
  const tw = paraOMundo(pal, LUGAR.tecladista[0], LUGAR.tecladista[1], 3);
  const teclado = {
    p: [tw[0] - 1.2, tw[1] + 2.0, tw[2] - 4.2] as V3,
    a: [tw[0], tw[1] + 1.2, tw[2]] as V3,
  };
  const frente = { p: o(60.5, 5.6, 101.2), a: [pass[0], topo + 1.1, pass[2] + 5] as V3 };
  const costas = { p: o(52, 3.4, 86), a: [pass[0], topo + 0.8, pass[2] + 3] as V3 };
  const largo = { p: o(61, 9, 75), a: [pass[0], topo + 1.5, pass[2] + 5] as V3 };
  const grade = { p: o(61.5, 2.3, 99.3), a: o(47, 0.9, 92) };
  await camera(page, coxia.p, coxia.a);
  await ate(page, INTRO - 3.5);
  mkdirSync(PASTA, { recursive: true });
  const som = somDe(page, 62);
  await comecarGravacao(page, 30);
  // a entrada: da coxia pela escadinha (uns 16 s)
  await voo(page, [coxia, escada], 7);
  await page.waitForTimeout(6500);
  await voo(page, [escada, teclado], 4);
  // a tecladista chega ao teclado e a primeira música começa
  await ate(page, INTRO + ENTRADA + 3.5);
  await page.waitForTimeout(3000);
  await voo(page, [teclado, frente], 3);
  // o teclado de pendurar: o último refrão da segunda música
  const r2 = ROTEIRO[1].partes.filter((q) => q.pedaco === 'refrao')[2];
  await page.evaluate((s) => window.__brumaluz!.pularShow!(s), r2.ini + 1.5);
  await ate(page, r2.ini + 2);
  await page.waitForTimeout(5500);
  await voo(page, [frente, costas], 4);
  await voo(page, [costas, largo], 4);
  await voo(page, [largo, grade], 4);
  await page.waitForTimeout(2500);
  await pararGravacao(page, `${PASTA}/show.webm`);
  await page.evaluate(() => window.__brumaluz!.pararSom?.());
  const r = await som;
  if (r) salvarWav(r, `${PASTA}/show.wav`);
  const n = await page.evaluate(
    () =>
      (window.__brumaluz!.criaturas?.() ?? []).filter(
        (c) => (c as { profissao?: string }).profissao,
      ).length,
  );
  console.log(`PROVA show moradores ${n}`);
  await page.context().close();
});

test('fotos: o palco vazio de dia, os arcos, o público', async ({ browser }) => {
  test.skip(!quer('fotos'), 'só com fotos');
  const page = await abrir(browser, 'vila-prova-fotos', 'pc', 6);
  const p = await plano(page);
  const H = p.h + 1;
  const o = (u: number, alt: number, v: number): V3 => [p.ox + u, H + alt, p.oz + v];
  const pal = p.pontos.palco;
  const topo = pal.y + 1;
  const pass = p.pontos.passarela;
  // de dia: o palco vazio e a banda na van
  await ir(page, p.ox + 60.5, p.oz + 86, H + 0.2);
  await esconderJogador(page, true);
  await page.waitForTimeout(8000);
  await camera(page, o(60.5, 4, 88), [pass[0], topo + 1.5, pass[2] + 6]);
  await page.waitForTimeout(2500);
  await foto(page, 'dia-palco-vazio');
  await camera(page, o(86.5, 3.6, 116.5), o(82, 1.2, 124.5));
  await page.waitForTimeout(2500);
  await foto(page, 'dia-banda-na-van');
  // os arcos do rinque de dia (a criança passa num)
  const ar = p.pontos.arcos;
  await ir(page, ar[0].x, ar[0].z - 4, H + 0.2);
  await page.waitForTimeout(6000);
  await camera(page, [ar[1].x + 2, H + 7, ar[1].z - 15], [ar[1].x, H + 1, ar[1].z - 4]);
  await page.waitForTimeout(2500);
  await foto(page, 'arcos-dia');
  // de noite: um aceso (a criança de patins passou), dois apagados
  await page.evaluate(() => window.__brumaluz!.vilaPatins?.(true));
  await hora(page, 0.9);
  await page.evaluate((a) => window.__brumaluz!.teleportar!(a.x + 0.2, a.z - 2), ar[0]);
  await page.waitForTimeout(800);
  for (let k = 0; k <= 16; k++) {
    await page.evaluate(
      ([x, z]) => window.__brumaluz!.teleportar!(x, z),
      [ar[0].x + 0.2, ar[0].z - 2 + k * 0.25],
    );
    await page.waitForTimeout(60);
  }
  await page.waitForTimeout(3000);
  await camera(page, [ar[1].x + 2, H + 7, ar[1].z - 15], [ar[1].x, H + 1, ar[1].z - 4]);
  await page.waitForTimeout(2500);
  await foto(page, 'arcos-noite');
  await camera(page, [ar[0].x + 3, H + 2.2, ar[0].z - 5.5], [ar[0].x, H + 2.2, ar[0].z]);
  await page.waitForTimeout(1500);
  await foto(page, 'arco-aceso-perto');
  // o show e o público de 40: de trás e da grade
  await acender(page);
  await ir(page, p.ox + 60.5, p.oz + 97.6, H + 0.2);
  // os 20 que vêm só para o show chegam pelo portão na abertura e na entrada
  await ate(page, 32);
  await page.evaluate(() => window.__brumaluz!.pularShow!(58));
  await ate(page, 60);
  await esconderJogador(page, true);
  await camera(page, o(52, 3.4, 84), [pass[0], topo + 0.8, pass[2] + 3]);
  await page.waitForTimeout(1500);
  await foto(page, 'publico-de-tras');
  await camera(page, o(61, 9, 75), [pass[0], topo + 1.5, pass[2] + 5]);
  await page.waitForTimeout(1200);
  await foto(page, 'publico-largo');
  await camera(page, o(60.5, 2.6, 99.4), o(48, 1.0, 88));
  await page.waitForTimeout(1200);
  await foto(page, 'publico-da-grade');
  await camera(page, o(60.5, 2.6, 99.4), o(71, 1.0, 88));
  await page.waitForTimeout(1200);
  await foto(page, 'publico-da-grade-2');
  await page.context().close();
});
