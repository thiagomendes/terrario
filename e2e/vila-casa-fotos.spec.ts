import { test, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { abrirMundo, assentar } from './guia-palco';

/**
 * Spec 026 (parte 3): as fotos da Casa anos 80 e da pista de skate com a câmera do jogo (a de
 * terceira pessoa, a da criança), para a revisão. Só com CASA_FOTOS=1, na placa de vídeo
 * (scripts/e2e-gpu.sh). `CASA_SO=sala,quarto` tira só as que começam com esses nomes;
 * `CASA_PASTA` muda a pasta; `CASA_TAMANHO=deitado` fotografa deitado; `CASA_HORA=noite`.
 */
declare const process: { env: Record<string, string | undefined> };
test.skip(!process.env.CASA_FOTOS, 'só com CASA_FOTOS');
test.setTimeout(1_800_000);

const PASTA = process.env.CASA_PASTA ?? 'test-results/vila-casa-fotos';
const SO = (process.env.CASA_SO ?? '').split(',').filter(Boolean);
const quer = (nome: string) => !SO.length || SO.some((s) => nome.startsWith(s));
const TAMANHO = (process.env.CASA_TAMANHO ?? 'empe') as 'empe' | 'deitado';
const NOITE = process.env.CASA_HORA === 'noite';
type V3 = [number, number, number];

/** A criança em (u, v) do mapa, olhando para (u, v), com a câmera nesta inclinação. */
async function por(page: Page, pe: [number, number], olha: [number, number], pitch: number) {
  await page.evaluate(
    ([pe, olha, pitch]) => {
      const e = window.__brumaluz!;
      const p = e.vila!()!;
      e.voar?.(false);
      e.teleportar!(p.ox + pe[0], p.oz + pe[1], p.h + 1.2);
      e.apontar!(Math.atan2(olha[0] - pe[0], olha[1] - pe[1]), pitch);
    },
    [pe, olha, pitch] as const,
  );
  await page.waitForTimeout(1600);
}

async function foto(page: Page, nome: string) {
  mkdirSync(PASTA, { recursive: true });
  await page.screenshot({ path: `${PASTA}/${TAMANHO}-${nome}${NOITE ? '-noite' : ''}.png` });
  const e = await page.evaluate(() => ({
    casa: window.__brumaluz!.vilaCasa?.estado() ?? null,
    fps: Math.round(window.__brumaluz!.fps ?? 0),
  }));
  console.log(`${nome}: ${JSON.stringify(e)}`);
}

/** As vistas: [nome, onde a criança fica (u, v), para onde olha (u, v), a inclinação]. */
const VISTAS: [string, [number, number], [number, number], number][] = [
  ['fora-frente', [52.5, 61], [52.5, 50], 0.2],
  ['porta', [52.5, 55.5], [52.5, 48], 0.25],
  ['sala-entrando', [52.5, 51], [49.5, 40], 0.4],
  ['sala-tv', [49.5, 43], [49.5, 37], 0.4],
  ['sala-sofa', [50, 48.5], [49.5, 45], 0.5],
  ['sala-discos', [47.5, 41.5], [44, 41.5], 0.4],
  ['sala-oeste', [53, 40], [44, 46], 0.4],
  ['quarto', [55.5, 44], [59, 42], 0.4],
  ['quarto-fundo', [58.5, 50], [59, 40], 0.4],
  ['quarto-bau', [59, 45.5], [62, 45.5], 0.4],
  ['rampa-fora', [164.5, 112], [164.5, 124], 0.2],
  ['rampa-suporte', [163, 115], [160.5, 114.5], 0.3],
  ['rampa-fundo', [164.5, 126], [170, 124], 0.25],
  ['rampa-lado', [164.5, 116.5], [164.5, 124], 0.35],
  ['rampa-bmx', [169, 136], [173, 135], 0.3],
];

test('Vila Neon: as fotos da casa e da pista de skate', async ({ browser }) => {
  const page = await abrirMundo(browser, { id: `vila-casa-fotos-${TAMANHO}`, tema: 'vila-neon', tamanho: TAMANHO });
  await page.addStyleTag({ content: '.dica-mira { display: none !important; }' });
  if (NOITE)
    await page.evaluate(() => {
      const e = window.__brumaluz!;
      e.pausarDia = true;
      e.hora = 0.96;
    });
  await assentar(page);
  await page.waitForFunction(() => !!window.__vila, undefined, { timeout: 30_000 });
  for (const [nome, pe, olha, pitch] of VISTAS) {
    if (!quer(nome)) continue;
    await por(page, pe, olha, pitch);
    if (nome.startsWith('rampa')) await assentar(page, 9);
    await page.waitForTimeout(900);
    await foto(page, nome);
  }
  void (0 as unknown as V3);
});
