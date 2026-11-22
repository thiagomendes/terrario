import { test } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { ARTE as ARTE_VILA } from '../src/ui/alma/arte';
import { ARTE_FESTA } from '../src/ui/alma/arteFesta';
import { MISSOES } from '../src/jogo/alma';

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

/**
 * Spec 027 (portão da T24): os desenhos das cinco missões da festa, uma linha por missão (o
 * principal, o selo, o resultado e a placa), grandes e a 28 px, o tamanho da figura no quadro do
 * celular. A foto vai para `ARTE_PASTA/t19-desenhos-28px.png`.
 */
test('a folha dos desenhos das missões da festa, a 28 px', async ({ page }) => {
  test.skip(!process.env.ARTE_FOTOS, 'só com ARTE_FOTOS=1');
  mkdirSync(PASTA, { recursive: true });
  const desenho = (n: string) => ARTE_FESTA[n] ?? ARTE_VILA[n] ?? '';
  const missoes = MISSOES.filter((m) => m.mundo === 'noite-das-fantasias');
  const celula = (n: string) =>
    `<div style="display:inline-block;margin:6px;text-align:center;font:11px sans-serif;color:#555;vertical-align:top">
      <div style="width:96px;height:96px;background:#fff8ea;border-radius:14px">${desenho(n)}</div>
      <div style="width:28px;height:28px;display:inline-block;background:#f3d9a4;border-radius:7px;margin-top:4px">${desenho(n)}</div>
      <div>${n}</div></div>`;
  const linha = (m: (typeof missoes)[number]) => {
    const d = m.desenho as unknown as Record<string, string>;
    const nomes = [d.principal, d.selo, d.resultado, d.placa].filter((n) => n && !n.startsWith('item:'));
    return `<div style="margin:4px 0"><b style="display:inline-block;width:40px;font:700 14px sans-serif;color:#5a3a22;vertical-align:top;margin-top:40px">${m.id}</b>${nomes.map(celula).join('')}</div>`;
  };
  await page.setViewportSize({ width: 560, height: 800 });
  await page.setContent(
    `<style>svg{width:100%;height:100%;display:block}</style><body style="background:#e6b877;margin:8px">${missoes.map(linha).join('')}</body>`,
  );
  await page.screenshot({ path: `${PASTA}/t19-desenhos-28px.png`, fullPage: true });
});
