import { expect, test, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { PASTA_CAPTURAS } from '../playwright.config';

/**
 * Spec 029, etapa 1: a página escondida de medida (?medir=webgpu). Só com MEDIR_WEBGPU=1.
 * - sem WebGPU (fingido com semwebgpu=1): diz isso com clareza e ainda mede o WebGL2;
 * - com WebGPU (E2E_WEBGPU=1 ou swiftshader no contêiner): as três rodadas, um quadro de
 *   cada modo para comparar a aparência e o resultado lado a lado.
 * Os números daqui não valem como medida (navegador de teste); valem os do aparelho.
 */
declare const process: { env: Record<string, string | undefined> };
test.skip(!process.env.MEDIR_WEBGPU, 'só com MEDIR_WEBGPU');
test.setTimeout(1_200_000);
const PASTA = `${PASTA_CAPTURAS}/medida-webgpu`;
const SEGUNDOS = process.env.MEDIR_SEGUNDOS ?? '6';

async function abrir(page: Page, extra: string) {
  await page.setViewportSize({ width: 1280, height: 720 });
  page.on('pageerror', (e) => console.log('erro na página:', String(e)));
  page.on('console', (m) => {
    if (m.type() === 'error' || /WebGPU|glslang|twgsl/i.test(m.text()))
      console.log(`[${m.type()}]`, m.text().slice(0, 300));
  });
  await page.goto(
    `/?medir=webgpu&segundos=${SEGUNDOS}&aquecer=2&segurar=2500${extra}${process.env.MEDIR_EXTRA ?? ''}`,
  );
  await expect(page.locator('[data-tela=inicio] [data-comecar]')).toBeVisible({ timeout: 30_000 });
}

/** Espera a rodada chegar ao fim da medida (o quadro fica na tela por um instante). */
async function quadroDa(page: Page, etapa: string, nome: string) {
  // a página troca a cada rodada: pergunta de novo até a rodada certa chegar ao fim
  const fim = Date.now() + 600_000;
  for (;;) {
    const ok = await page
      .evaluate(
        (e) => (window as unknown as { __medidaQuadro?: string }).__medidaQuadro === e,
        etapa,
      )
      .catch(() => false);
    if (ok) break;
    if (Date.now() > fim) throw new Error(`a rodada ${etapa} não chegou ao fim`);
    await page.waitForTimeout(250);
  }
  await page.screenshot({ path: `${PASTA}/${nome}.jpg`, type: 'jpeg', quality: 85 });
}

async function resultado(page: Page, nome: string) {
  await expect(page.locator('[data-tela=resultado][data-pronto]')).toBeVisible({
    timeout: 900_000,
  });
  await page.screenshot({ path: `${PASTA}/${nome}.png`, fullPage: true });
  const sessao = await page.evaluate(() => JSON.parse(decodeURIComponent(location.hash.slice(3))));
  writeFileSync(`${PASTA}/${nome}.json`, JSON.stringify(sessao, null, 2));
  console.log(nome, JSON.stringify(sessao));
  return sessao as {
    cap: { webgpu: boolean; motivo?: string };
    res: Record<string, { ok: boolean; fps?: number; erro?: string }>;
    desligados: string[];
    convertidos: string[];
    errosEfeito: Record<string, string>;
  };
}

test('sem WebGPU: avisa e mede só o WebGL2, sem quebrar', async ({ page }) => {
  mkdirSync(PASTA, { recursive: true });
  await abrir(page, '&semwebgpu=1');
  await expect(page.locator('.cap.nao')).toContainText('Sem WebGPU');
  await page.locator('[data-comecar]').click();
  await quadroDa(page, 'webgl2', 'sem-webgpu-quadro-webgl2');
  const s = await resultado(page, 'sem-webgpu-resultado');
  expect(s.cap.webgpu).toBe(false);
  expect(s.res.webgl2?.ok).toBe(true);
  expect(s.res.webgl2?.fps).toBeGreaterThan(0);
  expect(s.res.webgpu).toBeUndefined();
  await expect(page.locator('.cartao')).toHaveCount(1);
});

test('com WebGPU: as três rodadas e o resultado lado a lado', async ({ page }) => {
  mkdirSync(PASTA, { recursive: true });
  await abrir(page, process.env.MEDIR_COMPAT ? '&compat=1' : '');
  const tem = await page.locator('.cap.sim').count();
  if (!tem) {
    const motivo = await page.locator('.cap').textContent();
    console.log('sem WebGPU neste navegador:', motivo);
    test.skip(true, `sem WebGPU neste navegador: ${motivo}`);
  }
  await page.locator('[data-comecar]').click();
  await quadroDa(page, 'webgl2', 'com-webgpu-quadro-webgl2');
  await quadroDa(page, 'webgpu', 'com-webgpu-quadro-webgpu');
  await quadroDa(page, 'snapshot', 'com-webgpu-quadro-snapshot');
  const s = await resultado(page, 'com-webgpu-resultado');
  expect(s.cap.webgpu).toBe(true);
  expect(s.res.webgl2?.ok).toBe(true);
  // o WebGPU pode falhar neste navegador, mas a página tem de dizer por quê e seguir
  expect(s.res.webgpu).toBeDefined();
  if (!s.res.webgpu.ok) expect(s.res.webgpu.erro).toBeTruthy();
  await expect(page.locator('.cartao')).toHaveCount(3);
});
