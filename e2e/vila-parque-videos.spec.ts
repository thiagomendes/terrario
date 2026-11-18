import { expect, test, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { comecarGravacao, pararGravacao } from './gravarCena';
import { abrirRoleta, escolherNaRoleta, esperarItem } from './roleta-palco';
import {
  abrir,
  assentar,
  foto,
  hora,
  ir,
  medir,
  passo,
  plano,
  salvarWav,
  PASTA,
} from './vila-noite-palco';

/**
 * Spec 026 (parte 2, o Parque de diversões): os vídeos dos três brinquedos com o som do jogo, as
 * fotos de quem anda neles e a medida do celular (só com PARQUE_VIDEOS=1, na placa de vídeo:
 * scripts/e2e-gpu.sh). `PARQUE_SO=roda,carrossel,bate,medida` escolhe as partes; a pasta é a
 * `VILA_PASTA`.
 */
declare const process: { env: Record<string, string | undefined> };
test.skip(!process.env.PARQUE_VIDEOS, 'só com PARQUE_VIDEOS');
test.setTimeout(1_500_000);
test.use({ actionTimeout: 30_000 });
const SO = (process.env.PARQUE_SO ?? '').split(',').filter(Boolean);
const quer = (s: string) => !SO.length || SO.includes(s);
const NOITE = 0.96;

const sentar = async (page: Page, b: number, nome: string) => {
  const t = await page.evaluate((b) => window.__vila!.parque().sentar[b].t, b);
  expect(t, `${nome} na tela`).not.toBeNull();
  await page.touchscreen.tap(t!.x, t!.y);
  await page.waitForFunction((nome) => window.__brumaluz!.vilaParque!.sentado()?.b === nome, nome);
};
const olhar = (page: Page, x: number, z: number, pitch: number) =>
  page.evaluate(
    ([x, z, pitch]) => {
      const e = window.__brumaluz!;
      const pes = e.jogadorPes!();
      e.apontar!(Math.atan2(x - pes[0], z - pes[2]), pitch);
    },
    [x, z, pitch] as const,
  );
/** Gira a câmera devagar (a criança olhando em volta), `seg` segundos, de `de` a `ate` (yaw). */
const girar = (page: Page, de: number, ate: number, pitch: number, seg: number) =>
  page.evaluate(
    ([de, ate, pitch, seg]) =>
      new Promise<void>((ok) => {
        const e = window.__brumaluz!;
        const t0 = performance.now();
        const giro = () => {
          const u = Math.min(1, (performance.now() - t0) / (seg * 1000));
          const k = u * u * (3 - 2 * u);
          e.apontar!(de + (ate - de) * k, pitch);
          if (u < 1) requestAnimationFrame(giro);
          else ok();
        };
        giro();
      }),
    [de, ate, pitch, seg] as const,
  );

async function gravar(page: Page, nome: string, seg: number, cena: () => Promise<void>) {
  mkdirSync(PASTA, { recursive: true });
  const som = page.evaluate((s) => window.__brumaluz!.gravarSom?.(s) ?? null, seg + 1);
  const t0 = Date.now();
  await comecarGravacao(page, 30);
  await cena();
  await page.waitForTimeout(Math.max(0, seg * 1000 - (Date.now() - t0)));
  await pararGravacao(page, `${PASTA}/${nome}.webm`);
  await page.evaluate(() => window.__brumaluz!.pararSom?.());
  const r = await som;
  if (r) salvarWav(r, `${PASTA}/${nome}.wav`);
  else console.log(`VIDEO ${nome} sem som`);
}

test('o parque: os vídeos dos três brinquedos (deitado, com o som do jogo)', async ({
  browser,
}) => {
  test.skip(!quer('roda') && !quer('carrossel'), 'só os vídeos');
  const page = await abrir(browser, 'vila-parque-videos', 'deitado', 4, ['f1', 'f2', 'f4']);
  const p = await plano(page);
  const pq = p.pontos.parque;
  const Y = p.h + 1;
  // o primeiro toque liga o som (no céu)
  await page.touchscreen.tap(420, 60);
  await page.waitForTimeout(500);

  if (quer('carrossel')) {
    passo('carrossel');
    await ir(page, pq.carrossel.x - 2, pq.carrossel.z - pq.carrossel.beira - 5, Y + 0.2);
    await olhar(page, pq.carrossel.x, pq.carrossel.z, -0.08);
    await assentar(page, 20);
    await page.waitForTimeout(4000);
    await gravar(page, 'carrossel', 34, async () => {
      // chega andando, toca no carrossel e senta
      await page.evaluate(() => window.__brumaluz!.controleDireto!.mover(1, 0));
      await page.waitForTimeout(900);
      await page.evaluate(() => window.__brumaluz!.controleDireto!.mover(0, 0));
      await page.waitForTimeout(900);
      await sentar(page, 1, 'carrossel');
      await page.waitForTimeout(6000);
      // o toque toca o realejo
      await page.touchscreen.tap(422, 150);
      await page.waitForTimeout(5000);
      await foto(page, 'carrossel-andando', true);
      const yaw = await page.evaluate(() => window.__brumaluz!.rotacao![1]);
      await girar(page, yaw, yaw + 1.6, 0.12, 8);
      await page.waitForTimeout(3000);
      // "Sair do brinquedo" na roda do menu
      await abrirRoleta(page);
      await esperarItem(page, 'sair-brinquedo');
      await page.waitForTimeout(900);
      await escolherNaRoleta(page, 'sair-brinquedo');
      await page.waitForFunction(() => !window.__brumaluz!.vilaParque!.sentado());
    });
  }

  // (o vídeo do bate-bate, que agora é de guiar, é do `vila-bate-provas.spec.ts`)

  if (quer('roda')) {
    passo('roda-gigante');
    await hora(page, 0.42);
    await ir(page, pq.roda.saida[0] + 1, pq.roda.saida[2] + 4, Y + 0.2);
    await olhar(page, pq.roda.x, pq.roda.z - 6, -0.24);
    await assentar(page, 20);
    await page.waitForTimeout(3000);
    await gravar(page, 'roda-gigante', 38, async () => {
      await page.waitForTimeout(2500);
      await sentar(page, 0, 'roda');
      // sobe (a câmera vai sozinha para trás da cadeirinha)
      await page.waitForFunction((y) => window.__brumaluz!.jogadorPes!()[1] > y + 10, Y, {
        timeout: 20_000,
      });
      // o toque: a roda dá o empurrãozinho e as lâmpadas piscam
      await page.touchscreen.tap(422, 150);
      await page.waitForFunction((y) => window.__brumaluz!.jogadorPes!()[1] > y + 14.5, Y, {
        timeout: 20_000,
      });
      await foto(page, 'roda-no-alto', true);
      await foto(page, 'roda-no-alto-sem-botoes');
      // lá do alto, olha o bairro em volta
      const yaw = await page.evaluate(() => window.__brumaluz!.rotacao![1]);
      await girar(page, yaw, yaw - 0.9, 0.36, 5);
      await girar(page, yaw - 0.9, yaw, 0.3, 4);
      await page.waitForFunction(() => !window.__brumaluz!.vilaParque!.sentado(), undefined, {
        timeout: 40_000,
      });
      await page.waitForTimeout(1500);
    });
    // de noite, lá do alto (a foto)
    await hora(page, NOITE);
    await page.waitForTimeout(2000);
    await ir(page, pq.roda.saida[0], pq.roda.saida[2] + 1.5, Y + 0.2);
    await olhar(page, pq.roda.x, pq.roda.z, -0.3);
    await page.waitForTimeout(2500);
    await sentar(page, 0, 'roda');
    await page.waitForFunction((y) => window.__brumaluz!.jogadorPes!()[1] > y + 14.6, Y, {
      timeout: 30_000,
    });
    await foto(page, 'roda-no-alto-noite', true);
    await foto(page, 'roda-no-alto-noite-sem-botoes');
  }
  await page.context().close();
});

test('celular em pé: as medidas no parque (de dia e de noite, andando nos brinquedos)', async ({
  browser,
}) => {
  test.skip(!quer('medida'), 'só com medida');
  const page = await abrir(browser, 'vila-parque-celular', 'empe', 3, ['f1', 'f2', 'f4']);
  const p = await plano(page);
  const pq = p.pontos.parque;
  const Y = p.h + 1;
  const lento = Number(process.env.DESACELERAR_CPU ?? 0);
  if (lento > 1) {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: lento });
  }
  const sufixo = lento > 1 ? `-cpu${lento}x` : '';
  const medidas: Record<string, number> = {};
  const m = async (nome: string) => {
    await page.waitForTimeout(2500);
    medidas[nome] = (await medir(page, `parque-${nome}${sufixo}`)).fps;
  };
  for (const [quando, h] of [
    ['dia', 0.42],
    ['noite', NOITE],
  ] as const) {
    await hora(page, h);
    // a entrada: o arco, o carrossel e a roda-gigante à vista
    await ir(page, p.ox + 133, p.oz + 62, Y + 0.2);
    await olhar(page, pq.carrossel.x + 6, pq.carrossel.z - 8, -0.1);
    await assentar(page, 12);
    await m(`entrada-${quando}`);
    await foto(page, `celular-entrada-${quando}`, true);
    // o passeio: o parque inteiro em volta (o pior caso do parque)
    await ir(page, p.ox + 128, p.oz + 37, Y + 0.2);
    await olhar(page, pq.roda.x, pq.roda.z, -0.12);
    await assentar(page, 12);
    await m(`passeio-${quando}`);
    await foto(page, `celular-passeio-${quando}`, true);
    // no alto da roda-gigante (a vista de cima)
    await ir(page, pq.roda.saida[0], pq.roda.saida[2] + 1.5, Y + 0.2);
    await olhar(page, pq.roda.x, pq.roda.z, -0.3);
    await page.waitForTimeout(2000);
    await sentar(page, 0, 'roda');
    await page.waitForFunction((y) => window.__brumaluz!.jogadorPes!()[1] > y + 14.4, Y, {
      timeout: 30_000,
    });
    medidas[`roda-${quando}`] = (await medir(page, `parque-roda-${quando}${sufixo}`)).fps;
    await foto(page, `celular-roda-no-alto-${quando}`, true);
    await page.evaluate(() => window.__brumaluz!.vilaParque!.sair());
    await page.waitForFunction(() => !window.__brumaluz!.vilaParque!.sentado());
    await page.waitForTimeout(1200);
  }
  console.log(`MEDIDAS DO PARQUE${sufixo} ${JSON.stringify(medidas)}`);
  // o parque não baixa o piso do celular (o mesmo do show: 45)
  if (lento <= 1)
    for (const [k, v] of Object.entries(medidas)) expect(v, k).toBeGreaterThanOrEqual(45);
  await page.context().close();
});
