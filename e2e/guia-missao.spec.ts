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
  // spec 038: uns 8 s depois ele some sozinho, e o quadro não abre
  await expect(page.locator('[data-alma-missao]:not([hidden])')).toHaveCount(0, { timeout: 10_000 });
  expect(await page.locator('[data-alma-quadro]').count()).toBe(0);
  await abrirRoleta(page);
  await esperarItem(page, 'missoes');
  await esperarItem(page, 'bau');
  await page.screenshot({ path: `${PASTA}/convite-3-roda.png` });
  await tocar(page, '[data-botao-roda]');
  await page.waitForTimeout(500);
  // tocar no convite enquanto ele está à vista abre o quadro (o relógio de novo, para ele voltar)
  await page.evaluate(() => window.__guia!.conviteEm(1));
  await expect(page.locator('[data-alma-missao].convite')).toBeVisible({ timeout: 20_000 });
  await tocar(page, '[data-alma-missao].convite');
  await page.waitForSelector('[data-alma-quadro]', { timeout: 10_000 });
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${PASTA}/convite-4-quadro.png` });
  await page.context().close();
});

/**
 * Spec 038: o selinho e o convite não encostam em nada do canto (o mapinha, a mochila, a estrela,
 * os botões de cima, os amigos e as pílulas das informações abertas). Devolve as caixas que ficam
 * a menos de `folga` px do selinho (o aro do convite tem 6 px por fora).
 */
async function encostaNoCanto(page: Page, folga = 8): Promise<string[]> {
  return page.evaluate((folga) => {
    const selo = document.querySelector<HTMLElement>('[data-alma-missao]');
    if (!selo || selo.hidden) return ['sem selinho'];
    const s = selo.getBoundingClientRect();
    const vizinhos: Record<string, string> = {
      mapinha: '.minimapa',
      mochila: '[data-botao-mochila]',
      estrela: '[data-alma-carteira]',
      roda: '[data-botao-roda]',
      info: '[data-hud-info]',
      amigos: '.botao-amigos',
      som: '.hud .som',
      nome: '.hud [data-nome-jogador]',
      mundo: '.hud [data-info-mundo]',
    };
    const ruins: string[] = [];
    for (const [nome, sel] of Object.entries(vizinhos))
      for (const el of document.querySelectorAll<HTMLElement>(sel)) {
        const cs = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        if (cs.display === 'none' || cs.visibility === 'hidden' || r.width === 0 || r.height === 0) continue;
        const dx = Math.max(r.left - s.right, s.left - r.right, 0);
        const dy = Math.max(r.top - s.bottom, s.top - r.bottom, 0);
        if (Math.max(dx, dy) < folga)
          ruins.push(`${nome} (${Math.round(r.left)},${Math.round(r.top)} ${Math.round(r.width)}×${Math.round(r.height)})`);
      }
    return ruins;
  }, folga);
}

/**
 * Spec 038: com as informações abertas, as pílulas (som, nome, estação e clima) inteiras na tela e
 * sem encostar em nada do canto (o mapinha, a mochila, a estrela, os amigos, a bússola e o selinho
 * ou o convite). Devolve o que fica a menos de `folga` px de cada pílula.
 */
async function pilulasEncostam(page: Page, folga = 8): Promise<string[]> {
  return page.evaluate((folga) => {
    const visivel = (el: HTMLElement) => {
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return !el.hidden && cs.display !== 'none' && cs.visibility !== 'hidden' && r.width > 0 && r.height > 0;
    };
    const pilulas: Record<string, string> = {
      som: '.hud .som',
      nome: '.hud [data-nome-jogador]',
      mundo: '.hud [data-info-mundo]',
    };
    const vizinhos: Record<string, string> = {
      mapinha: '.minimapa',
      mochila: '[data-botao-mochila]',
      estrela: '[data-alma-carteira]',
      amigos: '.botao-amigos',
      selinho: '[data-alma-missao]',
      bussola: '.bussola',
      // (o "i" e a roda ficam de fora: as pílulas descem logo abaixo do botão que as abre, a 6 px,
      // de propósito, desde a 011)
    };
    const ruins: string[] = [];
    let vistas = 0;
    for (const [nome, sel] of Object.entries(pilulas)) {
      const p = document.querySelector<HTMLElement>(sel);
      if (!p || !visivel(p)) continue;
      vistas++;
      const s = p.getBoundingClientRect();
      if (s.left < 0 || s.top < 0 || s.right > innerWidth || s.bottom > innerHeight) ruins.push(`${nome} fora da tela`);
      for (const [outro, sv] of Object.entries(vizinhos))
        for (const el of document.querySelectorAll<HTMLElement>(sv)) {
          if (!visivel(el)) continue;
          const r = el.getBoundingClientRect();
          const dx = Math.max(r.left - s.right, s.left - r.right, 0);
          const dy = Math.max(r.top - s.bottom, s.top - r.bottom, 0);
          if (Math.max(dx, dy) < folga)
            ruins.push(`${nome} (${Math.round(s.left)},${Math.round(s.top)} ${Math.round(s.width)}×${Math.round(s.height)}) encosta em ${outro}`);
        }
    }
    if (vistas < 2) ruins.push(`só ${vistas} pílulas à vista`);
    return ruins;
  }, folga);
}

for (const tamanho of ['deitado', 'empe'] as const)
  test(`038: o convite aparece, some e não encosta no canto (${tamanho})`, async ({ browser }) => {
    test.setTimeout(400_000);
    const pasta = 'capturas-038/convite';
    mkdirSync(pasta, { recursive: true });
    const page = await abrirMundo(browser, {
      id: `convite-038-${tamanho}`,
      tema: 'cidade-grande',
      extras: MUNDOS.cidade.extras,
      tamanho,
    });
    await assentar(page);
    await page.evaluate(() => window.__guia!.conviteEm(2));
    await expect(page.locator('[data-alma-missao].convite')).toBeVisible({ timeout: 20_000 });
    const apareceu = Date.now();
    await page.waitForTimeout(1500);
    expect(await encostaNoCanto(page)).toEqual([]);
    await page.screenshot({ path: `${pasta}/${tamanho}-1-convite.jpg`, type: 'jpeg', quality: 85 });
    // some sozinho, uns 8 s depois de aparecer, sem abrir o quadro
    await expect(page.locator('[data-alma-missao]:not([hidden])')).toHaveCount(0, { timeout: 12_000 });
    const durou = (Date.now() - apareceu) / 1000;
    console.log(`convite (${tamanho}): à vista por uns ${durou.toFixed(1)} s`);
    expect(durou).toBeGreaterThan(6.5);
    expect(durou).toBeLessThan(11);
    expect(await page.locator('[data-alma-quadro]').count()).toBe(0);
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${pasta}/${tamanho}-2-sumiu.jpg`, type: 'jpeg', quality: 85 });
    // e não volta logo (no jogo, só daqui a 5 min brincando)
    await page.waitForTimeout(4000);
    expect(await page.locator('[data-alma-missao]:not([hidden])').count()).toBe(0);
    expect((await page.evaluate(() => window.__guia!.convite())).mostra).toBe(false);

    // com as informações abertas (as pílulas descem): o convite de novo, e nada se encosta
    await page.evaluate(() => window.__guia!.conviteEm(1));
    await expect(page.locator('[data-alma-missao].convite')).toBeVisible({ timeout: 20_000 });
    await tocar(page, '[data-hud-info]');
    await expect(page.locator('body')).toHaveClass(/hud-aberto/);
    await page.waitForTimeout(600);
    expect(await encostaNoCanto(page)).toEqual([]);
    expect(await pilulasEncostam(page)).toEqual([]);
    await page.screenshot({ path: `${pasta}/${tamanho}-3-informacoes-abertas.jpg`, type: 'jpeg', quality: 85 });
    await tocar(page, '[data-hud-info]');
    await expect(page.locator('body')).not.toHaveClass(/hud-aberto/);

    // a missão escolhida: o selinho fica (não some), no mesmo lugar livre
    await expect(page.locator('[data-alma-missao]:not([hidden])')).toHaveCount(0, { timeout: 12_000 });
    await escolherNaRoda(page, 'missoes');
    await page.waitForSelector('[data-alma-quadro]', { timeout: 10_000 });
    // (os cartões do quadro entram com um pulinho: o toque espera eles assentarem, como no alma.spec)
    await page.waitForTimeout(900);
    await tocar(page, '[data-alma-jogar]');
    await page.waitForFunction(() => !!document.querySelector('[data-alma-missao]:not([hidden])')?.getAttribute('data-missao'));
    await page.waitForTimeout(10_000);
    await expect(page.locator('[data-alma-missao]:not([hidden])')).toHaveCount(1);
    expect(await encostaNoCanto(page)).toEqual([]);
    await page.screenshot({ path: `${pasta}/${tamanho}-4-selinho-da-missao.jpg`, type: 'jpeg', quality: 85 });
    // e, com a missão, as informações abertas de novo: as pílulas e o selinho, nada se encosta
    await tocar(page, '[data-hud-info]');
    await expect(page.locator('body')).toHaveClass(/hud-aberto/);
    await page.waitForTimeout(600);
    expect(await encostaNoCanto(page)).toEqual([]);
    expect(await pilulasEncostam(page)).toEqual([]);
    await page.screenshot({ path: `${pasta}/${tamanho}-5-missao-informacoes-abertas.jpg`, type: 'jpeg', quality: 85 });
    await page.context().close();
  });
