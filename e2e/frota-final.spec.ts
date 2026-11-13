import { test, type Browser, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { comecarGravacao, pararGravacao } from './gravarCena';

/**
 * 014c: a frota no jogo de verdade. Com FROTA_FINAL=<rótulo>:
 * - desempenho (E2E_SEM_VSYNC=1): quadros por segundo, triângulos ativos e o custo dos veículos
 *   na praça olhando a rua, no celular (iPhone, nitidez 2 de 3) e no computador;
 * - FROTA_VIDEOS=1: vídeos seguindo o táxi, a polícia, a ambulância e os bombeiros (canvas).
 */
declare const process: { env: Record<string, string | undefined> };
test.skip(!process.env.FROTA_FINAL, 'só com FROTA_FINAL');
test.setTimeout(900_000);
const ROTULO = process.env.FROTA_FINAL ?? 'x';
const PASTA = 'capturas-014c/frota';

async function abrir(browser: Browser, celular: boolean) {
  const ctx = await browser.newContext(
    celular
      ? { viewport: { width: 428, height: 926 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true }
      : { viewport: { width: 1280, height: 720 } },
  );
  await ctx.addInitScript(() => {
    localStorage.setItem('terrario:config', JSON.stringify({ distancia: 3, mostrarFps: false, mostrarAtalhos: false }));
  });
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
    const c = e.cidade!()!;
    e.teleportar!(c.nascimento.x, c.nascimento.z);
    e.apontar!(c.nascimento.olhar, 0.05);
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

async function medir(p: Page, celular: boolean) {
  // atrás e acima do ônibus azul (id 2), seguindo-o: ele e os carros da volta dele à vista
  const seguir = () =>
    p.evaluate(() => {
      const e = window.__brumaluz!;
      const c = e.cidade!()!;
      const v = e.veiculos!().find((q) => q.id === 2)!;
      const hx = Math.cos(v.yaw);
      const hz = -Math.sin(v.yaw);
      e.voar?.(true);
      e.teleportar!(v.x - hx * 9, v.z - hz * 9, c.h + 7);
      e.apontar!(Math.atan2(hx, hz), -0.35);
    });
  await seguir();
  await p.waitForTimeout(3000);
  const t = setInterval(() => void seguir().catch(() => undefined), 700);
  try {
    return await medirAgora(p, celular);
  } finally {
    clearInterval(t);
  }
}

async function medirAgora(p: Page, celular: boolean) {
  return p.evaluate(async (cel) => {
    const e = window.__brumaluz!;
    const eng = e.cenaBabylon!().getEngine();
    if (cel) eng.setHardwareScalingLevel(1.5);
    const t0 = performance.now();
    let n = 0;
    await new Promise<void>((ok) => {
      const passo = () => {
        n++;
        if (performance.now() - t0 < 8000) requestAnimationFrame(passo);
        else ok();
      };
      requestAnimationFrame(passo);
    });
    const sc = e.cenaBabylon!();
    let tri = 0;
    const ativas = sc.getActiveMeshes();
    for (let i = 0; i < ativas.length; i++) tri += (ativas.data[i].getTotalIndices?.() ?? 0) / 3;
    const custo = (e as unknown as { custoVeiculos?: () => unknown }).custoVeiculos?.();
    return { fps: (n * 1000) / (performance.now() - t0), ativas: ativas.length, triangulos: Math.round(tri), custo };
  }, celular);
}

test('desempenho da frota (celular e computador)', async ({ browser }) => {
  test.skip(!!process.env.FROTA_VIDEOS, 'só a medida');
  mkdirSync(PASTA, { recursive: true });
  const out: Record<string, unknown> = {};
  for (const cel of [true, false]) {
    const p = await abrir(browser, cel);
    await p.waitForTimeout(3000);
    const r = await medir(p, cel);
    console.log('frota', ROTULO, cel ? 'celular' : 'computador', JSON.stringify(r).slice(0, 600));
    out[cel ? 'celular' : 'computador'] = r;
    await p.screenshot({ path: `${PASTA}/${ROTULO}-${cel ? 'celular' : 'computador'}-praca.jpg`, type: 'jpeg', quality: 85 });
    await p.context().close();
  }
  writeFileSync(`${PASTA}/desempenho-${ROTULO}.json`, JSON.stringify(out, null, 1));
});

test('vídeos da frota (seguindo cada um)', async ({ browser }) => {
  test.skip(!process.env.FROTA_VIDEOS, 'só com FROTA_VIDEOS');
  mkdirSync(`${PASTA}/video-bruto`, { recursive: true });
  const p = await abrir(browser, false);
  await p.evaluate(() => {
    const e = window.__brumaluz!;
    const wj = window as unknown as { __segue: number | null };
    wj.__segue = null;
    let cx = 0;
    let cz = 0;
    let pronto = false;
    e.cenaBabylon!().onBeforeCameraRenderObservable.add((c) => {
      const id = wj.__segue;
      if (id === null) return;
      const v = e.veiculos!().find((q) => q.id === id);
      if (!v) return;
      if (!pronto) {
        cx = v.x;
        cz = v.z;
        pronto = true;
      }
      cx += (v.x - cx) * 0.08;
      cz += (v.z - cz) * 0.08;
      const hx = Math.cos(v.yaw);
      const hz = -Math.sin(v.yaw);
      const cam = c as unknown as {
        position: { set(...a: number[]): void; clone(): { set(...a: number[]): unknown } };
        setTarget(t: unknown): void;
        fov: number;
      };
      const grande = v.tipo === 'bombeiros' || v.tipo.startsWith('onibus');
      const d = grande ? 8 : 6;
      // de lado (à esquerda, por cima da outra mão) e um pouco à frente
      cam.position.set(cx - hz * d + hx * 3, (e.cidade!()!.h + 1) + (grande ? 4 : 3), cz + hx * d + hz * 3);
      const alvo = cam.position.clone();
      alvo.set(cx, e.cidade!()!.h + 2, cz);
      cam.setTarget(alvo);
      cam.fov = 0.9;
      (c.getScene() as unknown as { setTransformMatrix(a: unknown, b: unknown): void }).setTransformMatrix(
        (c as unknown as { getViewMatrix(f: boolean): unknown }).getViewMatrix(true),
        (c as unknown as { getProjectionMatrix(f: boolean): unknown }).getProjectionMatrix(true),
      );
    });
  });
  await p.evaluate(() => {
    const cena = document.getElementById('cena')!;
    for (const el of Array.from(document.body.querySelectorAll<HTMLElement>('*')))
      if (el !== cena && !el.contains(cena)) el.style.visibility = 'hidden';
  });
  for (const [id, nome] of [
    [4, 'taxi'],
    [1, 'policia'],
    [7, 'ambulancia'],
    [9, 'bombeiros'],
  ] as const) {
    // a criança voa por cima do veículo (o chão em volta dele desenhado e o som cheio)
    await p.evaluate((i) => {
      const e = window.__brumaluz!;
      const v = e.veiculos!().find((q) => q.id === i)!;
      e.voar?.(true);
      e.teleportar!(v.x, v.z, e.cidade!()!.h + 9);
      (window as unknown as { __segue: number | null }).__segue = i;
    }, id);
    await p.waitForTimeout(2500);
    await comecarGravacao(p);
    for (let k = 0; k < 12; k++) {
      await p.waitForTimeout(1000);
      await p.evaluate((i) => {
        const e = window.__brumaluz!;
        const v = e.veiculos!().find((q) => q.id === i)!;
        e.teleportar!(v.x, v.z, e.cidade!()!.h + 9);
      }, id);
    }
    await pararGravacao(p, `${PASTA}/video-bruto/${nome}.webm`);
  }
  await p.context().close();
});
