import { test, type Page } from '@playwright/test';
import {
  abrir,
  ate,
  camera,
  esconderJogador,
  foto,
  hora,
  ir,
  passo,
  plano,
  type V3,
} from './vila-noite-palco';
import { ROTEIRO } from '../src/jogo/show';
import { FRENTE_KEYTAR, LUGAR, TECLADO } from '../src/jogo/coreografia';

/**
 * Spec 026 (a tecladista, 16 nov 2026): as fotos de prova da tecladista (de perto no teclado,
 * de frente e de três quartos), do teclado de pendurar na frente do palco, das teclas acendendo,
 * dos arcos do rinque (de dia e de noite, um aceso e dois apagados) e da turma do show de costas.
 * Só com VILA_FOTOS=1, na placa de vídeo. `VILA_SO=show,arcos` escolhe as partes.
 */
declare const process: { env: Record<string, string | undefined> };
test.skip(!process.env.VILA_FOTOS, 'só com VILA_FOTOS');
test.setTimeout(1_200_000);
test.use({ actionTimeout: 30_000 });
const SO = (process.env.VILA_SO ?? '').split(',').filter(Boolean);
const quer = (s: string) => !SO.length || SO.includes(s);
const NOITE = 0.96;

const pular = (page: Page, s: number) => page.evaluate((s) => window.__brumaluz!.pularShow!(s), s);

/** Espera o show começar sozinho (de noite, com a criança no festival). */
async function esperarShow(page: Page) {
  for (let i = 0; i < 120; i++) {
    const tem = await page.evaluate(() => !!window.__brumaluz!.vilaEstado!()?.show);
    if (tem) return true;
    await page.waitForTimeout(1000);
  }
  return false;
}

test('a tecladista no show (o teclado, a mão no alto, o teclado de pendurar)', async ({
  browser,
}) => {
  test.skip(!quer('show'), 'só com show');
  const page = await abrir(browser, 'vila-tecladista', 'pc', 5);
  const p = await plano(page);
  const H = p.h + 1;
  const pal = p.pontos.palco;
  const topo = pal.y + 1;
  const w = (a: number, alt: number, b: number): V3 => [pal.x0 + a, topo + alt, pal.z0 + b];
  await hora(page, NOITE);
  await ir(page, p.ox + 60.5, p.oz + 86.5, H + 0.2);
  passo('esperando o show');
  const comecou = await esperarShow(page);
  console.log(`SHOW ${comecou}`);
  await esconderJogador(page, true);
  const [ta, tb] = LUGAR.tecladista;
  const frente = { p: w(ta, 1.5, tb - 3.6), a: w(ta, 1.05, tb) };
  const tres = { p: w(ta + 2.6, 2.1, tb - 2.9), a: w(ta, 1.0, tb) };
  const lado = { p: w(ta - 3.2, 1.6, tb - 0.6), a: w(ta, 1.05, tb - 0.4) };
  const m1 = ROTEIRO[0];
  const parte = (k: number, nome: string, vez = 0) =>
    ROTEIRO[k].partes.find((q) => q.pedaco === nome && q.vez === vez)!;
  const verso = m1.inicio + 6;
  const plateia = { p: [pal.x0 + ta - 2, H + 3.6, pal.z0 - 3] as V3, a: w(ta, 0.9, tb) };
  const cima = { p: w(ta + 0.6, 2.6, tb + 0.9), a: w(ta, 0.6, tb - 0.9) };
  await pular(page, verso - 1.5);
  for (const [nome, c, dt] of [
    ['teclado-frente', frente, 0],
    ['teclado-tres-quartos', tres, 0.7],
    ['teclado-lado', lado, 1.4],
    ['teclado-frente-b', frente, 2.1],
    ['teclado-da-plateia', plateia, 2.8],
    ['teclas-de-cima', cima, 3.5],
    ['teclas-de-cima-b', cima, 3.75],
  ] as const) {
    await camera(page, c.p, c.a);
    await ate(page, verso + dt);
    await foto(page, nome);
  }
  const refrao = parte(0, 'refrao').ini;
  await pular(page, refrao - 1.2);
  await camera(page, tres.p, tres.a);
  await ate(page, refrao + 1.6);
  await foto(page, 'teclado-mao-no-alto');
  // o teclado de pendurar: indo, na frente do palco e voltando
  const k = parte(1, 'refrao', 2);
  const [ka, kb] = FRENTE_KEYTAR;
  const kFrente = { p: w(ka, 1.5, kb - 3.8), a: w(ka, 1.0, kb) };
  const kTres = { p: w(ka - 2.6, 2.0, kb - 3.0), a: w(ka, 1.0, kb) };
  await pular(page, k.ini - 4);
  await camera(page, [pal.x0 + 22, topo + 3.5, pal.z0 + 4], w(ta - 3, 1, tb - 4));
  await ate(page, k.ini - 1.2);
  await foto(page, 'keytar-indo');
  await camera(page, kFrente.p, kFrente.a);
  await ate(page, k.ini + 3);
  await foto(page, 'keytar-frente');
  await camera(page, w(ka + 0.4, 1.3, kb - 2.1), w(ka, 0.85, kb));
  await ate(page, k.ini + 4);
  await foto(page, 'keytar-perto');
  await camera(page, kTres.p, kTres.a);
  await ate(page, k.ini + 5);
  await foto(page, 'keytar-tres-quartos');
  await camera(page, w(ka + 1.6, 1.4, kb + 1.2), w(ka, 0.85, kb));
  await ate(page, k.ini + 6);
  await foto(page, 'keytar-de-lado');
  const fimK = k.ini + k.compassos * ROTEIRO[1].compasso;
  await camera(page, [pal.x0 + 22, topo + 3.5, pal.z0 + 4], w(ta - 3, 1, tb - 4));
  await ate(page, fimK + 1.5);
  await foto(page, 'keytar-voltando');
  await camera(page, frente.p, frente.a);
  await ate(page, fimK + 6);
  await foto(page, 'keytar-guardado');
  // a turma do show de costas (do fundo da plateia) e o palco largo
  const pl = p.pontos.plateia;
  const mx = (pl.x0 + pl.x1) / 2;
  await pular(page, parte(1, 'verso', 1).ini);
  await camera(page, [mx, H + 3.2, pl.z0 - 5], [mx, H + 1, pl.z1]);
  await page.waitForTimeout(2500);
  await foto(page, 'turma-costas');
  await camera(page, [mx - 6, H + 2.2, pl.z0 - 2], [mx + 2, H + 0.9, pl.z1]);
  await page.waitForTimeout(600);
  await foto(page, 'turma-costas-perto');
  await camera(page, [mx + 8, H + 2.6, pl.z0 - 3], [mx - 2, H + 0.9, pl.z1]);
  await page.waitForTimeout(600);
  await foto(page, 'turma-costas-lado');
  await camera(page, [mx, topo + 2.5, pal.z0 + 6], [mx, H + 0.8, pl.z0]);
  await page.waitForTimeout(600);
  await foto(page, 'turma-de-frente');
  void TECLADO;
  await page.context().close();
});

test('os arcos do rinque (de dia e de noite, um aceso)', async ({ browser }) => {
  test.skip(!quer('arcos'), 'só com arcos');
  const page = await abrir(browser, 'vila-arcos', 'pc', 5, ['f1', 'f2', 'f3']);
  const p = await plano(page);
  const arcos = p.pontos.arcos;
  const a0 = arcos[0];
  const r = p.pontos.rinque;
  const mx = (r.x0 + r.x1) / 2;
  await ir(page, mx, r.z0 - 6, a0.y + 0.2);
  await page.waitForTimeout(3000);
  await esconderJogador(page, true);
  const geral = { p: [mx, a0.y + 9, r.z0 - 8] as V3, a: [mx, a0.y + 1, (r.z0 + r.z1) / 2] as V3 };
  const perto = (q: (typeof arcos)[number]) =>
    q.eixo === 'x'
      ? { p: [q.x + 2.2, q.y + 2.4, q.z - 6.5] as V3, a: [q.x, q.y + 2.2, q.z] as V3 }
      : { p: [q.x - 6.5, q.y + 2.4, q.z - 2.2] as V3, a: [q.x, q.y + 2.2, q.z] as V3 };
  await camera(page, geral.p, geral.a);
  await page.waitForTimeout(1500);
  await foto(page, 'arcos-dia');
  await camera(page, perto(a0).p, perto(a0).a);
  await page.waitForTimeout(800);
  await foto(page, 'arco-dia-perto');
  // de noite: a criança de patins passa pelo arco 0 (fica aceso para ela)
  await hora(page, 0.9);
  await page.evaluate(() => window.__brumaluz!.vilaPatins!(true));
  await page.waitForTimeout(800);
  await ir(page, a0.x, a0.z - 2.5, a0.y + 0.2);
  await page.waitForTimeout(600);
  await ir(page, a0.x, a0.z, a0.y + 0.2);
  await page.waitForTimeout(250);
  await camera(page, perto(a0).p, perto(a0).a);
  await page.waitForTimeout(150);
  await foto(page, 'arco-piscando');
  await ir(page, a0.x, a0.z + 3, a0.y + 0.2);
  await page.waitForTimeout(2500);
  const acesos = await page.evaluate(() => window.__brumaluz!.vilaEstado!()?.arcos ?? null);
  console.log(`ARCOS ${JSON.stringify(acesos)}`);
  await ir(page, mx, r.z0 - 6, a0.y + 0.2);
  await page.waitForTimeout(1500);
  await camera(page, geral.p, geral.a);
  await page.waitForTimeout(800);
  await foto(page, 'arcos-noite');
  await camera(page, perto(a0).p, perto(a0).a);
  await page.waitForTimeout(500);
  await foto(page, 'arco-noite-aceso');
  await camera(page, perto(arcos[2]).p, perto(arcos[2]).a);
  await page.waitForTimeout(500);
  await foto(page, 'arco-noite-apagado');
  await camera(page, perto(arcos[1]).p, perto(arcos[1]).a);
  await page.waitForTimeout(500);
  await foto(page, 'arco-noite-apagado-fundo');
  await page.context().close();
});
