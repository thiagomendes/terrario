import { expect, test, type Page } from '@playwright/test';
import { temasPedidos } from './temas';

/**
 * Trilha gravada (spec 019, T03): começa sem segurar o mundo, troca de contexto no compasso
 * seguinte, segue o controle "Música" e mede, por tema, o que baixa e o que abre na memória.
 */

function coletarErros(page: Page): string[] {
  const erros: string[] = [];
  page.on('pageerror', (e) => erros.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') erros.push(`console.error: ${m.text()}`);
  });
  return erros;
}

const info = (page: Page) => page.evaluate(() => window.__brumaluz!.trilha!.info());

async function abrir(page: Page, url = '/'): Promise<void> {
  // marca quando o mundo ficou pronto (para comparar com a hora em que a música baixou)
  await page.addInitScript(() => {
    const w = window as unknown as { __prontoEm?: number; __brumaluz?: { ready?: boolean } };
    const olhar = () => {
      if (w.__brumaluz?.ready) w.__prontoEm = performance.now();
      else requestAnimationFrame(olhar);
    };
    requestAnimationFrame(olhar);
  });
  await page.goto(url);
  await page.waitForFunction(() => window.__brumaluz?.ready === true, undefined, {
    timeout: 120_000,
  });
}

async function ligarSom(page: Page): Promise<void> {
  await page.locator('.entrada').click();
  await expect
    .poll(() => page.evaluate(() => window.__brumaluz!.audio!.estado), { timeout: 10_000 })
    .toBe('ativo');
}

async function esperarGravada(page: Page): Promise<void> {
  await expect.poll(async () => (await info(page)).gravada, { timeout: 60_000 }).toBe(true);
}

/** Espera o relógio do áudio passar de t. */
async function esperarAte(page: Page, t: number): Promise<void> {
  await expect
    .poll(async () => (await info(page)).agora, { timeout: 60_000, intervals: [100] })
    .toBeGreaterThan(t);
}

test('a música começa num mundo novo sem segurar o mundo e abre só o que toca', async ({
  page,
}, ti) => {
  test.setTimeout(240_000);
  const erros = coletarErros(page);
  await abrir(page);
  // o pacote só começou a baixar depois de o mundo ficar pronto
  const tempos = await page.evaluate(() => {
    const pacote = performance
      .getEntriesByType('resource')
      .find((r) => r.name.includes('/sons/pacotes/') && r.name.includes('-musica.mp3'));
    return {
      prontoEm: (window as unknown as { __prontoEm?: number }).__prontoEm ?? null,
      pacoteEm: pacote?.startTime ?? null,
    };
  });
  // sem som, nada abre
  await expect.poll(async () => (await info(page)).fase, { timeout: 30_000 }).toBe('pronta');
  expect((await info(page)).medidas.abertos).toBe(0);
  if (tempos.pacoteEm !== null && tempos.prontoEm !== null)
    expect(tempos.pacoteEm).toBeGreaterThanOrEqual(tempos.prontoEm - 50);
  await ligarSom(page);
  const t0 = Date.now();
  await esperarGravada(page);
  const entrou = (Date.now() - t0) / 1000;
  const i = await info(page);
  await ti.attach('trilha-entrada', {
    body: JSON.stringify({ segundosParaEntrar: entrou, tempos, medidas: i.medidas }, null, 2),
    contentType: 'application/json',
  });
  expect(i.medidas.ids).toContain('base');
  expect(i.medidas.ids).not.toContain('perigo');
  expect(i.medidas.abertos).toBeLessThan(i.medidas.total);
  // a gravada sobe e soa
  await esperarAte(page, i.motor!.t0 + 2 * i.motor!.compasso + 0.2);
  const j = await info(page);
  expect(j.motor!.camadas.base).toBeGreaterThan(0.5);
  expect(j.motor!.fontes).toBeGreaterThan(0);
  expect(erros, erros.join('\n')).toEqual([]);
});

test('contexto pelo gancho muda as camadas no compasso seguinte', async ({ page }) => {
  test.setTimeout(240_000);
  const erros = coletarErros(page);
  // spec 034: no Doce Reino, que tem a camada de perigo (era o "Meu primeiro mundo" do Bruma e
  // Luz, que saiu; a noite da Vila Neon, agora o padrão, é mansa e sem perigo)
  await abrir(page, '/?tema=doce-reino');
  await ligarSom(page);
  await esperarGravada(page);
  const i0 = await info(page);
  const bar = i0.motor!.compasso;
  await esperarAte(page, i0.motor!.t0 + 2 * bar + 0.3);
  await page.evaluate(() => window.__brumaluz!.trilha!.forcar({ caverna: true }));
  const i1 = await info(page);
  const troca = i1.motor!.troca!;
  expect(troca).not.toBeNull();
  // no começo de um compasso, e não mais que um compasso depois do pedido
  const n = (troca.compasso - i1.motor!.t0) / bar;
  expect(Math.abs(n - Math.round(n))).toBeLessThan(1e-6);
  expect(troca.compasso).toBeGreaterThan(troca.pedida);
  expect(troca.compasso - troca.pedida).toBeLessThanOrEqual(bar + 0.07);
  if (i1.agora < troca.compasso - 0.02) expect(i1.motor!.camadas.noite).toBe(0);
  expect(i1.motor!.alvo).toMatchObject({ base: 0.6, noite: 1, pingos: 1, fdia: 0 });
  await esperarAte(page, troca.compasso + 1.6 * bar);
  const i2 = await info(page);
  expect(i2.motor!.camadas).toMatchObject({ base: 0.6, noite: 1, pingos: 1, fdia: 0 });
  expect(i2.motor!.lp).toBe(1100);
  expect(i2.medidas.ids).toEqual(expect.arrayContaining(['noite', 'pingos']));
  // perigo (o Doce Reino tem): substitui tudo
  await page.evaluate(() => window.__brumaluz!.trilha!.forcar({ caverna: false, perigo: true }));
  const t3 = (await info(page)).motor!.troca!.compasso;
  await esperarAte(page, t3 + 1.6 * bar);
  const i3 = await info(page);
  expect(i3.motor!.camadas).toMatchObject({ perigo: 1, base: 0, noite: 0, pingos: 0 });
  // de volta ao mundo
  await page.evaluate(() => window.__brumaluz!.trilha!.forcar(null));
  const t4 = (await info(page)).motor!.troca!.compasso;
  await esperarAte(page, t4 + 1.6 * bar);
  expect((await info(page)).motor!.camadas.perigo).toBe(0);
  expect(erros, erros.join('\n')).toEqual([]);
});

test('o controle "Música" de Configurações muda o volume da gravada', async ({ page }) => {
  test.setTimeout(240_000);
  const erros = coletarErros(page);
  await abrir(page);
  await page.locator('[data-abrir-config]').click();
  await page.locator('[data-painel-config] [data-aba="audio"]').click();
  await expect
    .poll(() => page.evaluate(() => window.__brumaluz!.audio!.estado), { timeout: 10_000 })
    .toBe('ativo');
  await esperarGravada(page);
  const padrao = (await info(page)).volume!;
  const faixa = page.locator('[data-config="volumeMusica"] input[type="range"]');
  await faixa.fill('0.3');
  await expect.poll(async () => (await info(page)).volume).toBeCloseTo(padrao / 2, 5);
  await faixa.fill('0');
  await expect.poll(async () => (await info(page)).volume).toBe(0);
  // calada, a gravada para e solta as camadas (nada decodificado à toa)
  await expect.poll(async () => (await info(page)).gravada).toBe(false);
  expect((await info(page)).medidas.abertos).toBe(0);
  await faixa.fill('0.6');
  await expect.poll(async () => (await info(page)).volume).toBeCloseTo(padrao, 5);
  // e volta a entrar
  await esperarGravada(page);
  expect(erros, erros.join('\n')).toEqual([]);
});

const TEMAS = temasPedidos(process.env.TEMAS);

test('memória e download por tema, com todos os contextos tocados', async ({ page }, ti) => {
  test.setTimeout(120_000 + TEMAS.length * 120_000);
  const erros = coletarErros(page);
  const linhas: Record<string, unknown>[] = [];
  for (const id of TEMAS) {
    await abrir(page, `/?tema=${id}`);
    await ligarSom(page);
    await esperarGravada(page);
    const bar = (await info(page)).motor!.compasso;
    // passa por todos os contextos (o que o tema tem), um compasso e meio cada
    const ctxs = [
      { hora: 'tarde' },
      { hora: 'noite' },
      { chuva: 1 },
      { caverna: true },
      { mov: 2, amigos: true },
      { bioma: 'taiga' },
      { perigo: true },
      { lavoura: true },
    ] as const;
    for (const c of ctxs) {
      await page.evaluate((p) => window.__brumaluz!.trilha!.forcar(p), c);
      const t = (await info(page)).motor!.troca?.compasso ?? 0;
      await esperarAte(page, t + 0.5 * bar);
    }
    const tocados = (await info(page)).medidas;
    await page.evaluate(() => window.__brumaluz!.trilha!.abrirTudo());
    const tudo = (await info(page)).medidas;
    const linha = {
      tema: id,
      baixadoKB: Math.round(tudo.bytesBaixados / 1024),
      abertosTocandoMB: +(tocados.picoDecodificados / 1048576).toFixed(2),
      abertosTocando: `${tocados.abertos} de ${tocados.total}`,
      tudoAbertoMB: +(tudo.picoDecodificados / 1048576).toFixed(2),
    };
    linhas.push(linha);
    console.log(JSON.stringify(linha));
    expect(tudo.bytesBaixados, id).toBeLessThan(2 * 1024 * 1024);
    expect(tudo.picoDecodificados / 1048576, id).toBeLessThan(15);
  }
  await ti.attach('trilha-memoria', {
    body: JSON.stringify(linhas, null, 2),
    contentType: 'application/json',
  });
  expect(erros, erros.join('\n')).toEqual([]);
});
