import { test, type Browser, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { MORROS, PASTA, abrir, andarTrilha, esconder, esperarChunks, irPara, porAmigos, voltar } from './achar-amigo-palco';

/**
 * Vídeos curtos da spec 021 (computador, 1280x720): a carinha correndo pela borda ao virar,
 * a trilha seguida (o toque de verdade na carinha e a caminhada pelo controle de verdade) e o
 * pulo para perto de verdade, na nuvem (segurar com o mouse). Só com ACHAR_VIDEO=1. Os .webm
 * e as marcas de tempo vão para PASTA/video-bruto (o mp4 sai pelo ffmpeg do contêiner).
 */
declare const process: { env: Record<string, string | undefined> };
test.skip(!process.env.ACHAR_VIDEO, 'vídeos só com ACHAR_VIDEO=1');
test.describe.configure({ mode: 'serial' });

async function gravar(browser: Browser, nome: string, corpo: (p: Page, marca: () => void) => Promise<void>) {
  mkdirSync(`${PASTA}/video-bruto`, { recursive: true });
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: { dir: `${PASTA}/video-bruto`, size: { width: 1280, height: 720 } },
  });
  const p = await ctx.newPage();
  const t0 = Date.now();
  let ini = 0;
  await corpo(p, () => (ini = (Date.now() - t0) / 1000));
  const fim = (Date.now() - t0) / 1000;
  const caminho = await p.video()!.path();
  await ctx.close();
  writeFileSync(`${PASTA}/video-bruto/${nome}.json`, JSON.stringify({ caminho, ini, fim }));
  console.log('achar video', nome, caminho, ini, fim);
}

test('vídeo 1: a carinha ao virar', async ({ browser }) => {
  test.setTimeout(600_000);
  await gravar(browser, 'video-1-carinha-ao-virar', async (page, marca) => {
    await abrir(page);
    const b = await irPara(page, MORROS, 0.6);
    await page.waitForTimeout(2500);
    await porAmigos(page, b, [['lia', -1.9, 45], ['theo', 2.2, 70]]);
    await page.waitForTimeout(2500);
    marca();
    await page.evaluate(async (yaw0) => {
      const e = window.__brumaluz!;
      const t = performance.now();
      for (;;) {
        const f = (performance.now() - t) / 9000;
        if (f >= 1) break;
        e.apontar!(yaw0 - Math.sin(f * Math.PI) * 2.4, 0.18);
        await new Promise((r) => setTimeout(r, 30));
      }
    }, b.yaw);
  });
});

test('vídeo 2: a trilha seguida', async ({ browser }) => {
  test.setTimeout(600_000);
  await gravar(browser, 'video-2-trilha-seguida', async (page, marca) => {
    await abrir(page);
    const b = await irPara(page, MORROS, 0.6);
    await page.waitForTimeout(2000);
    await esconder(page, b, 'lia', 30, 50);
    await page.evaluate((yaw) => window.__brumaluz!.apontar!(yaw - 1.2, 0.25), b.yaw);
    await page.waitForTimeout(1500);
    marca();
    await page.waitForTimeout(700);
    const v = (await page.evaluate(() => window.__brumaluz!.acharAmigo!.vistos())).find((x) => x.ids[0] === 'lia');
    if (v) {
      await page.mouse.move(v.x, v.y, { steps: 8 });
      await page.mouse.click(v.x, v.y);
    } else await page.evaluate(() => window.__brumaluz!.acharAmigo!.trilha('lia'));
    await page.waitForTimeout(1600);
    await andarTrilha(page, 1, 25);
    await page.waitForTimeout(2000);
    void voltar;
  });
});

test('vídeo 3: pular para perto (na nuvem)', async ({ browser }) => {
  test.setTimeout(900_000);
  // a Bia entra num contexto sem gravação; a Ana grava
  const novo = async (id: string, apelido: string, gravar: boolean) => {
    const ctx = await browser.newContext({
      viewport: gravar ? { width: 1280, height: 720 } : { width: 800, height: 450 },
      ...(gravar ? { recordVideo: { dir: `${PASTA}/video-bruto`, size: { width: 1280, height: 720 } } } : {}),
    });
    await ctx.addInitScript(
      ([i, a]) => {
        localStorage.setItem('terrario:identidade', JSON.stringify({ id: i, chave: `chave-de-teste-${i}-0123456789abcdef`, apelido: a }));
        localStorage.setItem('terrario:config', JSON.stringify({ distancia: 7, mostrarFps: false, qualidade: 'alta', mostrarAtalhos: false }));
        if (a === 'Bia')
          localStorage.setItem('terrario:aparencia', JSON.stringify({ versao: 1, aparencia: { corpo: 'feminino', cabeloEstilo: 5, cabeloCor: 1, pele: 1, fantasia: { id: 'fazendeira', cor: 0 } } }));
      },
      [id, apelido],
    );
    return ctx.newPage();
  };
  const pronto = (p: Page) => p.waitForFunction(() => window.__brumaluz?.ready, null, { timeout: 180_000 });
  const jogar = (p: Page) =>
    p.evaluate(() => {
      document.querySelector('.entrada')?.setAttribute('hidden', '');
      const e = window.__brumaluz!;
      e.pausarDia = true;
      e.hora = 0.42;
      e.definirClima?.('limpo');
    });
  const ana = await novo('ana-021-video', 'Ana', true);
  const t0 = Date.now();
  await ana.goto('/?tema=rancho-alegre');
  await pronto(ana);
  await jogar(ana);
  await ana.evaluate(() => window.dispatchEvent(new CustomEvent('brumaluz:amigos')));
  await ana.locator('[data-abrir-para-amigos]').click();
  await ana.waitForURL(/sala=/, { timeout: 60_000 });
  await pronto(ana);
  await jogar(ana);
  const codigo = await ana.locator('[data-codigo-mundo]').getAttribute('data-codigo-mundo', { timeout: 30_000 });
  await ana.keyboard.press('Escape');
  const bia = await novo('bia-021-video', 'Bia', false);
  await bia.goto(`/?sala=${codigo}`);
  await bia.locator('[data-entrar-mundo]').click({ timeout: 60_000 });
  await pronto(bia);
  await jogar(bia);
  await ana.evaluate(([x, z]) => window.__brumaluz!.teleportar!(x, z), MORROS);
  await esperarChunks(ana);
  const pa = await ana.evaluate(() => window.__brumaluz!.jogadorPes!());
  await bia.evaluate(([x, z]) => window.__brumaluz!.teleportar!(x, z), [pa[0] + Math.sin(0.6 - 1.7) * 60, pa[2] + Math.cos(0.6 - 1.7) * 60] as const);
  await esperarChunks(bia);
  await ana.evaluate(() => window.__brumaluz!.apontar!(0.6, 0.18));
  await ana.waitForTimeout(2500);
  const ini = (Date.now() - t0) / 1000;
  await ana.waitForTimeout(800);
  const v = (await ana.evaluate(() => window.__brumaluz!.acharAmigo!.vistos())).find((x) => x.tipo === 'carinha');
  if (v) {
    await ana.mouse.move(v.x, v.y, { steps: 10 });
    await ana.mouse.down();
    await ana.waitForTimeout(1100);
    await ana.mouse.up();
  }
  await ana.waitForTimeout(3500);
  const fim = (Date.now() - t0) / 1000;
  const caminho = await ana.video()!.path();
  await ana.context().close();
  await bia.context().close();
  writeFileSync(`${PASTA}/video-bruto/video-3-pular-para-perto.json`, JSON.stringify({ caminho, ini, fim }));
  console.log('achar video pular', caminho, ini, fim);
});
