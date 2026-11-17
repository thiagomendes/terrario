import { test } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { ARTE_VILA } from '../src/ui/alma/arteVila';

/**
 * Spec 026 (parte 3B): a folha dos desenhos das missões da casa, em tamanho de cartão e de
 * bolinha, de dia e de noite (o fundo do quadro). Só com `ARTE_FOTOS=1`; a foto vai para
 * `ARTE_PASTA`.
 */
declare const process: { env: Record<string, string | undefined> };
const PASTA = process.env.ARTE_PASTA ?? 'test-results/arte-vila';
const NOMES = [
  'fitaVideo',
  'tvMadeira',
  'sessaoCinema',
  'fitaNaTv',
  'sofaCinema',
  'brinquedosEspalhados',
  'pegar',
  'bauArrumado',
  'ioioBolinha',
  'piaoBolinha',
  'cuboBolinha',
  'dicaGuardar',
  'rampaU',
  'skate',
  'cartaoRampa',
  'carimboSkate',
  'vitamina',
  'vovo',
  'vovoBolo',
  'fatiaBolo',
  'feno',
];

test('a folha dos desenhos da casa', async ({ page }) => {
  test.skip(!process.env.ARTE_FOTOS, 'só com ARTE_FOTOS=1');
  mkdirSync(PASTA, { recursive: true });
  const celula = (n: string) =>
    `<div style="display:inline-block;margin:6px;text-align:center;font:11px sans-serif;color:#555">
      <div style="width:128px;height:128px;background:#fff8ea;border-radius:14px">${ARTE_VILA[n] ?? 'FALTA'}</div>
      <div style="width:32px;height:32px;display:inline-block;background:#f3d9a4;border-radius:8px;margin-top:4px">${ARTE_VILA[n] ?? ''}</div>
      <div>${n}</div></div>`;
  await page.setViewportSize({ width: 1000, height: 900 });
  await page.setContent(
    `<style>svg{width:100%;height:100%}</style><body style="background:#e6b877;margin:8px">${NOMES.map(celula).join('')}</body>`,
  );
  await page.screenshot({ path: `${PASTA}/folha.png`, fullPage: true });
});
