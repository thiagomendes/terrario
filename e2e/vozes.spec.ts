import { expect, test, type Page } from '@playwright/test';

/**
 * Spec 019 (T04): vozes gravadas no jogo. O golpe na criatura da noite (o Saci da Mata, que
 * soava como vidro) toca o baque de pano do porte dele e o "ai" gravado; a derrota é o "puf"
 * fofo (nunca mais o arbusto); o morador acena de volta com o cumprimento gravado, na voz do
 * gênero dele. O que tocou vem do registro dos testes de tela (`sonsTocados`).
 */
function coletarErros(page: Page): string[] {
  const erros: string[] = [];
  page.on('pageerror', (e) => erros.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') erros.push(`console.error: ${m.text()}`);
  });
  return erros;
}

async function pronto(page: Page) {
  await page.waitForFunction(() => window.__brumaluz?.ready === true, undefined, {
    timeout: 180_000,
  });
}

/** Liga o som (o toque em "entrar") e espera o pacote de vozes do tema. */
async function ligarSom(page: Page) {
  await page.locator('.entrada').click();
  await expect
    .poll(() => page.evaluate(() => window.__brumaluz!.audio!.estado), { timeout: 15_000 })
    .toBe('ativo');
  await expect
    .poll(() => page.evaluate(() => window.__brumaluz!.vozesGravadas!()), { timeout: 30_000 })
    .toMatchObject({ pronto: true, falhou: false });
  await page.evaluate(() => {
    document.querySelector('.entrada')?.setAttribute('hidden', '');
    window.__brumaluz!.pausarDia = true;
  });
}

async function mundoNovo(page: Page, temaId: string) {
  await page.goto('/');
  await pronto(page);
  await page.locator('[data-abrir-mundos]').click();
  await page.locator(`.cartao-tema[data-tema="${temaId}"]`).click();
  await page.locator('button[data-modo="criativo"]').click();
  await page.locator('[data-novo-nome]').fill('Vozes');
  await page.locator('[data-criar-mundo]').click();
  await page.waitForURL(/mundo=/);
  await pronto(page);
  expect(await page.evaluate(() => window.__brumaluz!.tema)).toBe(temaId);
}

/** Laje de pedra com ar em cima, em volta do jogador. */
async function laje(page: Page) {
  return page.evaluate(async () => {
    const e = window.__brumaluz!;
    const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));
    const [x0, , z0] = e.posicao!;
    const fx = Math.floor(x0);
    const fz = Math.floor(z0);
    e.teleportar!(fx + 0.5, fz + 0.5);
    await espera(1500);
    const fy = Math.floor(e.posicao![1]);
    for (let dx = -8; dx <= 8; dx++)
      for (let dz = -8; dz <= 8; dz++) {
        e.definirBloco!(fx + dx, fy - 1, fz + dz, 45);
        for (let dy = 0; dy < 4; dy++) e.definirBloco!(fx + dx, fy + dy, fz + dz, 0);
      }
    e.teleportar!(fx + 0.5, fz + 0.5, fy);
    await espera(500);
    await e.sincronizar!();
    return { fx, fy, fz };
  });
}

test('golpe no Saci: baque de pano e "ai" gravados (sem vidro); derrota com "puf"', async ({
  page,
}, testInfo) => {
  test.setTimeout(420_000);
  const erros = coletarErros(page);
  await page.setViewportSize({ width: 1024, height: 600 });
  await mundoNovo(page, 'mata-encantada');
  await ligarSom(page);
  const { fx, fy, fz } = await laje(page);
  const r = await page.evaluate(
    async ({ fx, fy, fz }) => {
      const e = window.__brumaluz!;
      const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));
      e.hora = 0;
      await espera(500);
      const sacis = () => e.criaturas!().filter((c) => c.tipo === 'espectro');
      const antes = new Set(sacis().map((c) => c.id));
      e.invocar!('espectro', fx + 0.5, fy, fz + 2.5);
      let id = -1;
      for (let i = 0; i < 40 && id < 0; i++) {
        await espera(100);
        id = sacis().find((c) => !antes.has(c.id))?.id ?? -1;
      }
      const tocadosAntes = e.sonsTocados!().length;
      let golpes = 0;
      let primeiroGolpe: string[] = [];
      for (let i = 0; i < 60; i++) {
        const c = e.criaturas!().find((b) => b.id === id);
        if (!c || c.estado === 'morrendo') break;
        // fica do lado dele (o golpe empurra) e bate
        e.teleportar!(c.x - 1.2, c.z, fy);
        await espera(120);
        e.atacarCriatura!(id);
        golpes++;
        await espera(450);
        if (golpes === 1) primeiroGolpe = e.sonsTocados!().slice(tocadosAntes);
      }
      await espera(800);
      return {
        id,
        golpes,
        primeiroGolpe,
        tocados: e.sonsTocados!().slice(tocadosAntes),
        vivo: e.criaturas!().some((b) => b.id === id && b.estado !== 'morrendo'),
      };
    },
    { fx, fy, fz },
  );
  await testInfo.attach('sons-tocados', {
    body: JSON.stringify(r, null, 2),
    contentType: 'application/json',
  });
  expect(r.id).toBeGreaterThan(0);
  expect(r.vivo).toBe(false);
  // o Saci é médio e de pano no índice (`mata-encantada` → espectro → `pano.medio`)
  expect(r.primeiroGolpe).toEqual(
    expect.arrayContaining(['gravada:baque:pano.medio', 'gravada:ai:espectro']),
  );
  expect(r.tocados.some((t) => t.includes('cristal'))).toBe(false);
  expect(r.tocados.filter((t) => t.startsWith('sintese:'))).toEqual([]);
  expect(r.tocados).toContain('gravada:derrota:puf_medio');
  // derrota não é mais o susto de novo nem o arbusto
  expect(r.tocados.indexOf('gravada:derrota:puf_medio')).toBeGreaterThan(0);
  expect(erros, erros.join('\n')).toEqual([]);
});

test('o morador acena de volta com o cumprimento gravado', async ({ page }) => {
  test.setTimeout(420_000);
  const erros = coletarErros(page);
  await page.setViewportSize({ width: 1024, height: 600 });
  await page.goto('/');
  await pronto(page);
  await ligarSom(page);
  await page.evaluate(() => (window.__brumaluz!.hora = 0.42));
  const p = await page.evaluate(() => window.__brumaluz!.povoados!()[0]);
  expect(p, 'nenhum povoado perto do nascimento').toBeTruthy();
  await page.evaluate((p) => window.__brumaluz!.teleportar!(p.cx + 2.5, p.cz + 2.5), p);
  await page.waitForFunction(
    () => (window.__brumaluz!.criaturas?.() ?? []).some((c) => c.tipo === 'morador'),
    undefined,
    { timeout: 120_000 },
  );
  let cumprimentou: string | undefined;
  for (let tentativa = 0; tentativa < 6 && !cumprimentou; tentativa++) {
    const n0 = await page.evaluate(
      async ({ cx, cz, tentativa }) => {
        const e = window.__brumaluz!;
        const m = e.criaturas!()
          .filter((c) => c.tipo === 'morador')
          .sort((a, b) => Math.hypot(a.x - cx, a.z - cz) - Math.hypot(b.x - cx, b.z - cz))[
          tentativa % 2
        ];
        const d = Math.hypot(cx - m.x, cz - m.z) || 1;
        e.teleportar!(m.x + ((cx - m.x) / d) * 3.5, m.z + ((cz - m.z) / d) * 3.5);
        await new Promise((r) => setTimeout(r, 900));
        await e.sincronizar!();
        return e.sonsTocados!().length;
      },
      { cx: p.cx, cz: p.cz, tentativa },
    );
    await page.waitForTimeout(1000);
    await page.evaluate(() => window.__brumaluz!.gestos!.fazer('acenar'));
    cumprimentou = await page
      .waitForFunction(
        (n0) => {
          const e = window.__brumaluz!;
          // a voz veio junto com o aceno de volta (não é um chamado qualquer de longe)
          if (!e.gestos!.moradores().some((m) => m.gesto === 'acenar')) return undefined;
          return e.sonsTocados!()
            .slice(n0)
            .find((t) => /^gravada:morador:(feminino|masculino):cumprimento$/.test(t));
        },
        n0,
        { timeout: 5000 },
      )
      .then((h) => h.jsonValue() as Promise<string>)
      .catch(() => undefined);
  }
  expect(cumprimentou).toMatch(/^gravada:morador:(feminino|masculino):cumprimento$/);
  expect(erros, erros.join('\n')).toEqual([]);
});
