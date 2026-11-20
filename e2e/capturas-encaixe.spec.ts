import { expect, test } from '@playwright/test';

import { PASTA_CAPTURAS } from '../playwright.config';

/**
 * Capturas do encaixe dos acessórios (spec 017, T01): o editor de personagem com os cabelos
 * que mais mudam o alto da cabeça (raspado, cacheado volumoso, coque e o curto com topete),
 * na aba de acessórios, onde cada miniatura mostra um chapéu no cabelo escolhido.
 * A pasta pode ser trocada por ENCAIXE_PASTA (antes/depois da correção).
 */
const PASTA = process.env.ENCAIXE_PASTA ?? `${PASTA_CAPTURAS}/encaixe`;

const CASOS = [
  { nome: 'raspado', modelo: 'ferreiro', cabeloEstilo: 3, acessorio: 'chapeu' },
  { nome: 'cacheado', modelo: 'herbolaria', cabeloEstilo: 4, acessorio: 'capacete' },
  { nome: 'coque', modelo: 'tecela', cabeloEstilo: 6, acessorio: 'capuz' },
  { nome: 'topete', modelo: 'andarilho', cabeloEstilo: 0, acessorio: 'chapeu-explorador' },
];

for (const caso of CASOS) {
  test(`encaixe dos acessórios com cabelo ${caso.nome}`, async ({ page }) => {
    test.setTimeout(180_000);
    await page.setViewportSize({ width: 1280, height: 900 });
    const erros: string[] = [];
    page.on('pageerror', (e) => erros.push(`pageerror: ${e.message}`));
    await page.addInitScript((c) => {
      localStorage.setItem(
        'terrario:aparencia',
        JSON.stringify({
          versao: 1,
          aparencia: { modelo: c.modelo, cabeloEstilo: c.cabeloEstilo, acessorio: c.acessorio },
        }),
      );
    }, caso);
    await page.goto('/');
    await page.waitForFunction(() => window.__brumaluz?.ready === true, undefined, {
      timeout: 120_000,
    });
    await page.locator('[data-abrir-personagem]').click();
    const painel = page.locator('[data-painel-personagem]');
    await expect(painel).toBeVisible();
    await page.locator('[data-aba="extra"]').click();
    // as miniaturas são desenhadas em fila, poucas por quadro
    await page.waitForTimeout(2500);
    await page.screenshot({ path: `${PASTA}/${caso.nome}.png` });
    expect(erros, erros.join('\n')).toEqual([]);
  });
}

/** Laje de pedra limpa em volta do jogador, de dia (campo limpo para as capturas). */
async function entrarNaLaje(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.waitForFunction(() => window.__brumaluz?.ready === true, undefined, {
    timeout: 120_000,
  });
  await page.evaluate(async () => {
    document.querySelector('.entrada')?.setAttribute('hidden', '');
    const e = window.__brumaluz!;
    e.pausarDia = true;
    e.hora = 0.42;
    const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));
    const [x0, , z0] = e.posicao!;
    const fx = Math.floor(x0);
    const fz = Math.floor(z0);
    e.teleportar!(fx + 0.5, fz + 0.5);
    await espera(1500);
    const fy = Math.floor(e.posicao![1]);
    for (let dx = -9; dx <= 9; dx++)
      for (let dz = -9; dz <= 9; dz++) {
        e.definirBloco!(fx + dx, fy - 1, fz + dz, 45);
        for (let dy = 0; dy < 5; dy++) e.definirBloco!(fx + dx, fy + dy, fz + dz, 0);
      }
    e.teleportar!(fx + 0.5, fz + 0.5, fy);
    await espera(600);
    await e.sincronizar!();
    e.camera?.definirZoom(4.2);
  });
}

test('encaixe dos braços e pernas no jogador (gestos e passada)', async ({ page }) => {
  test.setTimeout(240_000);
  await page.setViewportSize({ width: 1280, height: 720 });
  const erros: string[] = [];
  page.on('pageerror', (e) => erros.push(`pageerror: ${e.message}`));
  await entrarNaLaje(page);
  await page.evaluate(() => window.__brumaluz!.apontar!(0, 0.08));
  await page.waitForTimeout(1500);
  await page.evaluate(() => window.__brumaluz!.personagem!.girarCorpo?.(Math.PI * 0.75));
  const meio: Record<string, number> = { acenar: 700, comemorar: 520, dancar: 900, sentar: 1200 };
  for (const id of Object.keys(meio)) {
    await page.evaluate((id) => window.__brumaluz!.gestos!.fazer(id as never), id);
    await page.waitForTimeout(meio[id]);
    await page.screenshot({ path: `${PASTA}/gesto-${id}.png` });
    if (id === 'sentar') {
      await page.evaluate(() => window.__brumaluz!.controleDireto!.mover(1, 0));
      await page.waitForTimeout(150);
      await page.evaluate(() => window.__brumaluz!.controleDireto!.mover(0, 0));
    }
    await page.waitForTimeout(3300 - meio[id]);
  }
  // a passada de lado (correndo para a direita da câmera)
  await page.evaluate(() => window.__brumaluz!.controleDireto!.mover(1, 0));
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${PASTA}/passada.png` });
  await page.evaluate(() => window.__brumaluz!.controleDireto!.mover(0, 0));
  expect(erros, erros.join('\n')).toEqual([]);
});

test('encaixe no morador do povoado', async ({ page }) => {
  test.setTimeout(300_000);
  await page.setViewportSize({ width: 1280, height: 720 });
  const erros: string[] = [];
  page.on('pageerror', (e) => erros.push(`pageerror: ${e.message}`));
  await page.goto('/');
  await page.waitForFunction(() => window.__brumaluz?.ready === true, undefined, {
    timeout: 120_000,
  });
  await page.evaluate(() => {
    document.querySelector('.entrada')?.setAttribute('hidden', '');
    window.__brumaluz!.pausarDia = true;
    window.__brumaluz!.hora = 0.42;
  });
  const p = await page.evaluate(() => window.__brumaluz!.povoados!()[0]);
  expect(p, 'nenhum povoado perto do nascimento').toBeTruthy();
  await page.evaluate((p) => window.__brumaluz!.teleportar!(p.cx + 2.5, p.cz + 2.5), p);
  await page.waitForFunction(
    () => (window.__brumaluz!.criaturas?.() ?? []).some((c) => c.tipo === 'morador'),
    undefined,
    { timeout: 120_000 },
  );
  for (let i = 0; i < 2; i++) {
    await page.evaluate(
      async ({ cx, cz, i }) => {
        const e = window.__brumaluz!;
        const m = e.criaturas!()
          .filter((c) => c.tipo === 'morador')
          .sort((a, b) => Math.hypot(a.x - cx, a.z - cz) - Math.hypot(b.x - cx, b.z - cz))[i];
        const d = Math.hypot(cx - m.x, cz - m.z) || 1;
        const px = m.x + ((cx - m.x) / d) * 2.2;
        const pz = m.z + ((cz - m.z) / d) * 2.2;
        e.teleportar!(px, pz);
        await new Promise((r) => setTimeout(r, 900));
        // a câmera de lado, para o jogador não tapar o morador
        e.apontar!(Math.atan2(m.x - px, m.z - pz) + 0.75, 0.12);
        e.camera?.definirZoom(3.2);
        await e.sincronizar!();
      },
      { cx: p.cx, cz: p.cz, i },
    );
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${PASTA}/morador-${i}.png` });
  }
  expect(erros, erros.join('\n')).toEqual([]);
});

/**
 * Enfeites dos moradores de cada tema (spec 017, T01): visor, óculos, gravata, botões,
 * crachás e antenas encostados no boneco. Para cada profissão, três moradores parados (de
 * frente, de perfil e de três quartos), de perto. ENCAIXE_TEMAS escolhe os temas (`<id>,<id>`).
 */
const TEMAS_MORADORES = (
  process.env.ENCAIXE_TEMAS ??
  // spec 034: os cinco temas que ficam
  'vila-neon,cidade-grande,doce-reino,exploracao-lunar,rancho-alegre'
).split(',');
for (const tema of TEMAS_MORADORES)
  test(`encaixe dos enfeites dos moradores: ${tema}`, async ({ page }) => {
    test.setTimeout(300_000);
    await page.setViewportSize({ width: 1280, height: 720 });
    const erros: string[] = [];
    page.on('pageerror', (e) => erros.push(`pageerror: ${e.message}`));
    await page.goto(`/?tema=${tema}`);
    await page.waitForFunction(() => window.__brumaluz?.ready === true, undefined, {
      timeout: 120_000,
    });
    // os avisos de cima tapariam as cabeças
    await page.addStyleTag({ content: '.toast-area { display: none !important; }' });
    const base = await page.evaluate(async () => {
      document.querySelector('.entrada')?.setAttribute('hidden', '');
      const e = window.__brumaluz!;
      e.pausarDia = true;
      e.hora = 0.42;
      e.definirClima?.('limpo');
      const [x0, , z0] = e.posicao!.map(Math.floor);
      const y = 110;
      // uma laje de pedra no alto para cada profissão, longe uma da outra
      for (let dx = -6; dx <= 34; dx++)
        for (let dz = -3; dz <= 8; dz++) {
          e.definirBloco!(x0 + dx, y, z0 + dz, 45);
          for (let dy = 1; dy < 5; dy++) e.definirBloco!(x0 + dx, y + dy, z0 + dz, 0);
        }
      return { x0, y, z0 };
    });
    const profissoes = ['ferreiro', 'cozinheiro', 'construtor'] as const;
    for (let k = 0; k < profissoes.length; k++) {
      await page.evaluate(
        async ({ x0, y, z0, profissao, k }) => {
          const e = window.__brumaluz!;
          const x = x0 + 0.5 + k * 14;
          // o jogador num buraco de dois blocos: a cabeça dele fica abaixo dos moradores
          for (let dy = -1; dy <= 0; dy++) e.definirBloco!(Math.floor(x), y + dy, z0, 0);
          e.definirBloco!(Math.floor(x), y - 2, z0, 45);
          e.teleportar!(x, z0 + 0.5, y - 1);
          await new Promise((r) => setTimeout(r, 600));
          await e.sincronizar!();
          // de frente, de perfil (o vão aparece de lado) e de três quartos
          const z = z0 + 3.8;
          e.estatua!('morador', x - 1.3, y + 1, z, Math.PI + 0.25, { profissao, n: 1 });
          e.estatua!('morador', x, y + 1, z, Math.PI / 2, { profissao, n: 4 });
          e.estatua!('morador', x + 1.3, y + 1, z, Math.PI - 0.7, { profissao, n: 7 });
          e.apontar!(0, -0.32);
          e.camera?.definirZoom(2.2);
        },
        { ...base, profissao: profissoes[k], k },
      );
      await page.waitForTimeout(1800);
      await page.screenshot({ path: `${PASTA}/morador-${tema}-${profissoes[k]}.png` });
    }
    expect(erros, erros.join('\n')).toEqual([]);
  });
