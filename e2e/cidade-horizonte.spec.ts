import { test, type Browser } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

/**
 * 014c: a ponta do mundo na Cidade Grande, no iPhone do dono (nitidez 2 de 3), olhando por uma
 * avenida comprida. Antes o chão carregado parava a uns 25–30 blocos e os carrinhos vinham do
 * nada, "voando" do horizonte até achar uma rua. Fotos com HORIZONTE_ROTULO=antes|depois.
 * Com HORIZONTE_FPS=1 (e E2E_SEM_VSYNC=1) mede os quadros por segundo em cada distância de
 * visão (2 a 5 pedaços), a mesma cena, para saber quanto custa cada +16 blocos.
 */
declare const process: { env: Record<string, string | undefined> };
test.skip(!process.env.HORIZONTE_ROTULO && !process.env.HORIZONTE_FPS, 'só com HORIZONTE_ROTULO ou HORIZONTE_FPS');
test.setTimeout(900_000);
const PASTA = 'capturas-014c/horizonte';

async function abrir(browser: Browser, distancia: number) {
  const ctx = await browser.newContext({
    viewport: { width: 428, height: 926 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
  });
  await ctx.addInitScript((d) => {
    localStorage.setItem(
      'terrario:config',
      JSON.stringify({ distancia: d, mostrarFps: true, mostrarAtalhos: false }),
    );
  }, distancia);
  const p = await ctx.newPage();
  p.on('pageerror', (e) => console.log('erro na página:', String(e)));
  await p.goto('/?tema=cidade-grande');
  await p.waitForFunction(() => window.__brumaluz?.ready === true, undefined, { timeout: 240_000 });
  await p.evaluate(() => {
    document.querySelector<HTMLElement>('.entrada')?.setAttribute('hidden', '');
    const e = window.__brumaluz!;
    e.pausarDia = true;
    e.hora = 0.42;
    e.definirClima?.('limpo');
    // a avenida do meio, do começo da cidade, olhando ao longo dela
    const c = e.cidade!()!;
    const x = c.ox + 40 * 2 + 4;
    e.teleportar!(x - 2.5, c.oz + 6);
    e.apontar!(0, 0.02);
  });
  // o dono joga com nitidez 2 de 3 (meia escala num iPhone de densidade 3)
  await p.evaluate(() => {
    const eng = window.__brumaluz!.cenaBabylon!().getEngine();
    (window as unknown as { __nitidez: number }).__nitidez = 1;
    eng.setHardwareScalingLevel(1.5);
  });
  let antes = -1;
  for (let i = 0; i < 40; i++) {
    await p.waitForTimeout(1500);
    const n = await p.evaluate(() => window.__brumaluz!.chunksCarregados ?? 0);
    if (n === antes && n > 4) break;
    antes = n;
  }
  return p;
}

test('a avenida no iPhone: fotos', async ({ browser }) => {
  test.skip(!process.env.HORIZONTE_ROTULO, 'fotos só com HORIZONTE_ROTULO');
  const rotulo = process.env.HORIZONTE_ROTULO!;
  mkdirSync(PASTA, { recursive: true });
  const p = await abrir(browser, 3);
  for (let k = 0; k < 4; k++) {
    await p.waitForTimeout(2500);
    await p.evaluate(() => window.__brumaluz!.cenaBabylon!().getEngine().setHardwareScalingLevel(1.5));
    await p.screenshot({ path: `${PASTA}/${rotulo}-avenida-${k + 1}.jpg`, type: 'jpeg', quality: 85 });
  }
  // de cima, para ver a ponta do chão carregado e os carrinhos perto dela
  await p.evaluate(() => window.__brumaluz!.apontar!(0, -0.35));
  await p.waitForTimeout(1500);
  await p.screenshot({ path: `${PASTA}/${rotulo}-avenida-de-cima.jpg`, type: 'jpeg', quality: 85 });
  const info = await p.evaluate(() => ({
    nitidez: document.querySelector('[data-nitidez]')?.textContent ?? '',
    chunks: window.__brumaluz!.chunksCarregados,
  }));
  console.log('info', JSON.stringify(info));
  await p.context().close();
});

test('a avenida no iPhone: quadros por distância', async ({ browser }) => {
  test.skip(!process.env.HORIZONTE_FPS, 'medida só com HORIZONTE_FPS');
  mkdirSync(PASTA, { recursive: true });
  const linhas: unknown[] = [];
  for (const d of [2, 3, 4, 5]) {
    const p = await abrir(browser, d);
    await p.waitForTimeout(3000);
    const r = await p.evaluate(async () => {
      const eng = window.__brumaluz!.cenaBabylon!().getEngine();
      eng.setHardwareScalingLevel(1.5);
      const t0 = performance.now();
      let n = 0;
      await new Promise<void>((ok) => {
        const passo = () => {
          n++;
          if (performance.now() - t0 < 6000) requestAnimationFrame(passo);
          else ok();
        };
        requestAnimationFrame(passo);
      });
      const des = window.__brumaluz!.desenho?.();
      const sc = window.__brumaluz!.cenaBabylon!();
      let tri = 0;
      for (const m of sc.getActiveMeshes().data.slice(0, sc.getActiveMeshes().length))
        tri += (m.getTotalIndices?.() ?? 0) / 3;
      return { fps: (n * 1000) / (performance.now() - t0), chamadas: des?.chamadas, ativas: des?.ativas, triangulos: Math.round(tri) };
    });
    const linha = { distancia: d, blocos: d * 16, ...r };
    console.log('fps', JSON.stringify(linha));
    linhas.push(linha);
    await p.context().close();
  }
  writeFileSync(`${PASTA}/fps-por-distancia-${process.env.HORIZONTE_FPS}.json`, JSON.stringify(linhas, null, 1));
});
