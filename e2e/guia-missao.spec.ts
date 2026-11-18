import { expect, test, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { abrirMundo, assentar, escolherNaRoda, tocar, type Tamanho } from './guia-palco';
import { abrirRoleta, esperarItem } from './roleta-palco';

/**
 * Spec 030 "Guia da missão" nos dois mundos com missões. Nada abre ao entrar; o quadro vem
 * pela roda do menu; o "brincar" acende a trilha de pegadinhas (nascendo nos pés) e a placa do
 * alvo; o selinho com o desenho da missão fica no canto ao lado da estrela. Capturas em
 * GUIA_PASTA (celular deitado e em pé, Cidade e Rancho). Na placa de vídeo: scripts/e2e-gpu.sh.
 */
declare const process: { env: Record<string, string | undefined> };
const PASTA = process.env.GUIA_PASTA ?? 'test-results/guia';

const MUNDOS = {
  cidade: {
    tema: 'cidade-grande',
    missao: 'c3',
    extras: { alma: { local: { feitas: ['c1', 'c2'] } } },
  },
  rancho: { tema: 'rancho-alegre', missao: 'r1', extras: {} },
} as const;

/**
 * As pegadas inteiras à vista: dentro da tela, fora das caixas do HUD, fora do boneco (a caixa
 * dele na tela) e sem bloco entre a câmera e elas.
 */
async function pegadasVisiveis(page: Page): Promise<number> {
  return page.evaluate(() => {
    const e = window.__brumaluz!;
    const g = window.__guia!;
    const [px, py, pz] = e.jogadorPes!();
    const c = e.camera!.posicao();
    const pts = [0, 0.9, 1.8].flatMap((dy) =>
      [-0.45, 0.45].flatMap((dx) =>
        [-0.45, 0.45].map((dz) => e.telaDoPonto!(px + dx, py + dy, pz + dz)),
      ),
    );
    const ok = pts.filter((q): q is { x: number; y: number } => !!q);
    const boneco = {
      x0: Math.min(...ok.map((q) => q.x)),
      x1: Math.max(...ok.map((q) => q.x)),
      y0: Math.min(...ok.map((q) => q.y)),
      y1: Math.max(...ok.map((q) => q.y)),
    };
    const hud = [
      ...document.querySelectorAll<HTMLElement>(
        '.barra, .minimapa, .bussola, .toque .joystick, .toque .botoes > *, .alma-carteira, .alma-missao, .menu-hud',
      ),
    ]
      .map((el) => el.getBoundingClientRect())
      .filter((r) => r.width > 4);
    let n = 0;
    for (const [x, y, z] of g.vistas()) {
      const t = e.telaDoPonto!(x, y + 0.05, z);
      if (!t || t.x < 4 || t.y < 4 || t.x > innerWidth - 4 || t.y > innerHeight - 4) continue;
      if (t.x > boneco.x0 && t.x < boneco.x1 && t.y > boneco.y0 && t.y < boneco.y1) continue;
      if (hud.some((r) => t.x > r.left && t.x < r.right && t.y > r.top && t.y < r.bottom)) continue;
      // nada no caminho da câmera até a pegada
      const d = Math.hypot(x - c[0], y + 0.05 - c[1], z - c[2]);
      let tapada = false;
      for (let k = 0.5; k < d - 0.4; k += 0.25) {
        const f = k / d;
        const b = e.bloco!(
          Math.floor(c[0] + (x - c[0]) * f),
          Math.floor(c[1] + (y + 0.05 - c[1]) * f),
          Math.floor(c[2] + (z - c[2]) * f),
        );
        if (b !== 0) {
          tapada = true;
          break;
        }
      }
      if (!tapada) n++;
    }
    return n;
  });
}

async function escolherMissao(page: Page, missao: string): Promise<number> {
  await escolherNaRoda(page, 'missoes');
  await page.waitForSelector('[data-alma-quadro]', { timeout: 20_000 });
  await page.waitForTimeout(500);
  console.log(
    `guia: olhar antes ${JSON.stringify(await page.evaluate(() => window.__brumaluz!.rotacao))}`,
  );
  const t0 = await page.evaluate(() => performance.now());
  await tocar(page, `[data-alma-jogar="${missao}"]`);
  return t0;
}

for (const [nome, m] of Object.entries(MUNDOS))
  for (const tamanho of ['deitado', 'empe'] as Tamanho[])
    test(`guia: ${nome} no celular ${tamanho} (nada abre, roda, trilha, placa, selinho)`, async ({
      browser,
    }) => {
      test.setTimeout(400_000);
      mkdirSync(PASTA, { recursive: true });
      const page = await abrirMundo(browser, {
        id: `guia-${nome}-${tamanho}`,
        tema: m.tema,
        extras: m.extras,
        tamanho,
      });
      await assentar(page);
      // nada abre sozinho ao entrar
      await page.waitForTimeout(3000);
      expect(await page.locator('[data-alma-quadro]').count()).toBe(0);
      expect(await page.locator('[data-alma-missao]').isHidden()).toBe(true);
      await page.screenshot({ path: `${PASTA}/${nome}-${tamanho}-1-entrou.png` });

      const t0 = await escolherMissao(page, m.missao);
      // a trilha nasce em até 300 ms (depois da resposta do núcleo) e começa nos pés
      await page.waitForFunction(() => (window.__guia?.pegadas() ?? 0) > 0, undefined, {
        timeout: 15_000,
      });
      const nasceu = await page.evaluate(() => performance.now());
      console.log(`guia: ${nome} ${tamanho} trilha em ${Math.round(nasceu - t0)} ms`);
      await expect(page.locator('[data-alma-missao]')).toHaveAttribute('data-missao', m.missao);
      await page.waitForTimeout(2200);
      const medida = await page.evaluate(() => {
        const g = window.__guia!;
        const p = window.__brumaluz!.jogadorPes!();
        const f = g.primeira();
        return {
          pegadas: g.pegadas(),
          alvo: g.alvo(),
          placa: g.placa(),
          viradas: g.viradas(),
          olhar: window.__brumaluz!.rotacao?.map((v) => Math.round(v * 100) / 100),
          luzes: g.luzes(),
          placaCaixa: g.caixaPlaca(),
          dosPes: f ? Math.hypot(f[0] - p[0], f[2] - p[2]) : null,
        };
      });
      const inteiras = await pegadasVisiveis(page);
      await page.screenshot({ path: `${PASTA}/${nome}-${tamanho}-2-trilha.png` });
      console.log(
        `guia: ${nome} ${tamanho} ${JSON.stringify(medida)} inteiras à vista: ${inteiras}`,
      );
      expect(medida.pegadas).toBeGreaterThan(5);
      expect(medida.luzes).toBeGreaterThan(2);
      // a trilha à vista começa ~1,5 bloco adiante dos pés (as de baixo dele, o boneco tapa)
      expect(medida.dosPes).not.toBeNull();
      expect(medida.dosPes!).toBeGreaterThan(1);
      expect(medida.dosPes!).toBeLessThan(2.4);
      expect(inteiras).toBeGreaterThanOrEqual(3);
      if (medida.placaCaixa) expect(medida.placaCaixa.h).toBeLessThanOrEqual(64 * 1.25);
      // a rota vista do alto (para a revisão: o desenho da trilha, sem zigue-zague)
      const antes = await page.evaluate(() => {
        const e = window.__brumaluz!;
        const r = e.rotacao!;
        const z = e.camera!.zoom();
        e.camera!.definirZoom(14);
        e.apontar!(r[1], 1.0);
        return { yaw: r[1], pitch: r[0], z };
      });
      await page.waitForTimeout(1200);
      await page.screenshot({ path: `${PASTA}/${nome}-${tamanho}-2b-do-alto.png` });
      await page.evaluate((a) => {
        const e = window.__brumaluz!;
        e.camera!.definirZoom(a.z);
        e.apontar!(a.yaw, a.pitch);
      }, antes);
      await page.waitForTimeout(800);
      await page
        .locator('[data-alma-carteira]')
        .screenshot({ path: `${PASTA}/${nome}-${tamanho}-3-estrela.png` });
      await page
        .locator('[data-alma-missao]')
        .screenshot({ path: `${PASTA}/${nome}-${tamanho}-3-selinho.png` });
      // a criança anda um pouco para o lado (fora da rota): a trilha continua nascendo nos pés
      await page.evaluate(() => {
        const e = window.__brumaluz!;
        const [x, y, z] = e.jogadorPes!();
        e.teleportar!(x + 2, z + 1.5, y);
      });
      await page.waitForTimeout(1500);
      const fora = await page.evaluate(() => {
        const p = window.__brumaluz!.jogadorPes!();
        const f = window.__guia!.primeira();
        return f ? Math.hypot(f[0] - p[0], f[2] - p[2]) : null;
      });
      console.log(`guia: ${nome} ${tamanho} fora da rota, primeira pegada a ${fora?.toFixed(2)}`);
      expect(fora).not.toBeNull();
      expect(fora!).toBeLessThan(2.4);
      await page.screenshot({ path: `${PASTA}/${nome}-${tamanho}-4-fora-da-rota.png` });
      // o selinho repete a ondinha
      await tocar(page, '[data-alma-missao]');
      await page.waitForTimeout(400);
      await page.screenshot({ path: `${PASTA}/${nome}-${tamanho}-5-ondinha.png` });
      await page.context().close();
    });

test('guia: o convite (o baú com "?") e a roda com "Missões" e "Baú"', async ({ browser }) => {
  test.setTimeout(400_000);
  mkdirSync(PASTA, { recursive: true });
  const page = await abrirMundo(browser, {
    id: 'guia-convite',
    tema: 'cidade-grande',
    extras: MUNDOS.cidade.extras,
    tamanho: 'deitado',
  });
  await assentar(page);
  await page.evaluate(() => window.__guia!.conviteEm(4));
  await expect(page.locator('[data-alma-missao].convite')).toBeVisible({ timeout: 20_000 });
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${PASTA}/convite-1-brilha.png` });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${PASTA}/convite-2-quieto.png` });
  await abrirRoleta(page);
  await esperarItem(page, 'missoes');
  await esperarItem(page, 'bau');
  await page.screenshot({ path: `${PASTA}/convite-3-roda.png` });
  await tocar(page, '[data-botao-roda]');
  await page.waitForTimeout(500);
  // tocar no convite abre o quadro
  await tocar(page, '[data-alma-missao].convite');
  await page.waitForSelector('[data-alma-quadro]', { timeout: 10_000 });
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${PASTA}/convite-4-quadro.png` });
  await page.context().close();
});
