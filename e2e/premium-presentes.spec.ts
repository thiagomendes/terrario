import { expect, test, type Browser, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';

/**
 * Spec 023 (fase C): os presentes de nível de verdade (T09) e os premium vistos pelos amigos
 * na nuvem (T10). Capturas em PREMIUM_PASTA (padrão capturas-023c).
 *
 * - presentes: a festa do nível com o presente; a roda com o pulo de estrela e a reverência;
 *   as tintas lilás e menta na aba Fantasias; a moldura de flores no modo foto; o balão com
 *   estrelinha; a etiqueta do amigo; o troféu do nível 10 no álbum.
 * - nuvem: a Ana compra e veste, a Bia vê em até 1 s (e o contrário), com as capturas das duas
 *   telas.
 */
declare const process: { env: Record<string, string | undefined> };
const PASTA = process.env.PREMIUM_PASTA ?? 'capturas-023c';
const SO = process.env.PREMIUM_SO;

type Perfil = {
  aplicarGanho(g: unknown): unknown;
  comprarPremium(id: string): { ok: boolean };
  vestirPremium(id: string, vestir: boolean): boolean;
  perfil: { xp: number; moedas: number; vestidos: Record<string, string> };
};

async function ganhar(page: Page, g: Record<string, unknown>) {
  await page.evaluate((g) => {
    const p = (window as unknown as { __almaCrianca: Perfil }).__almaCrianca;
    p.aplicarGanho({ pontos: {}, ...g });
  }, g);
}

/** Fecha as festas da fila com o "oba" (fotografa a primeira que tiver `foto`). */
async function fecharFestas(page: Page, foto?: string) {
  for (let i = 0; i < 12; i++) {
    const oba = page.locator('[data-alma-festa] [data-alma-oba]');
    try {
      await oba.first().waitFor({ timeout: 4000 });
    } catch {
      return;
    }
    if (foto && i === 0) {
      await page.waitForTimeout(600);
      await page.screenshot({ path: `${PASTA}/${foto}.png` });
    }
    await oba.first().click();
    await page.waitForTimeout(500);
  }
}

test('presentes de nível de verdade', async ({ page }) => {
  test.skip(!!SO && SO !== 'presentes');
  test.setTimeout(600_000);
  mkdirSync(PASTA, { recursive: true });
  await page.setViewportSize({ width: 1280, height: 720 });
  const erros: string[] = [];
  page.on('pageerror', (e) => erros.push(`pageerror: ${e.message}`));
  await page.addInitScript(() => {
    localStorage.setItem(
      'terrario:config',
      JSON.stringify({ distancia: 3, mostrarFps: false, mostrarAtalhos: false }),
    );
  });
  await page.goto('/');
  await page.waitForFunction(() => window.__brumaluz?.ready === true, undefined, {
    timeout: 180_000,
  });
  await page.evaluate(() => {
    document.querySelector('.entrada')?.setAttribute('hidden', '');
    const e = window.__brumaluz!;
    e.pausarDia = true;
    e.hora = 0.42;
  });
  await page.addStyleTag({ content: '.toast-area { display: none !important; }' });
  await page.waitForTimeout(1500);

  // nível 2: a festa com a etiqueta colorida (e as moedinhas do presente)
  await ganhar(page, { xp: 41 });
  await fecharFestas(page, 'presente-nivel2-festa');
  let a = await page.evaluate(() => window.__brumaluz!.personagem!.aparencia());
  expect(a.etiqueta).toBe('cor');
  // nível 3: o pulo de estrela entra na roda
  await ganhar(page, { xp: 60 });
  await fecharFestas(page, 'presente-nivel3-festa');
  // até o 10: lilás, moldura, balão, etiqueta com estrela, reverência, menta, troféu
  await ganhar(page, { xp: 1000 });
  await fecharFestas(page, 'presente-nivel-muitos-festa');
  a = await page.evaluate(() => window.__brumaluz!.personagem!.aparencia());
  expect(a.etiqueta).toBe('estrela');
  expect(a.balao).toBe('estrela');

  // a roda de gestos com os 10 (G abre)
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('brumaluz:gestos')));
  await page.waitForTimeout(700);
  await expect(page.locator('.roda button.ativo')).toHaveCount(11);
  await page.screenshot({ path: `${PASTA}/presente-roda-10-gestos.png` });
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('brumaluz:gestos')));
  await page.waitForTimeout(500);
  // o pulo de estrela e a reverência, com o balão de estrelinha
  for (const g of ['pulo-estrela', 'reverencia'] as const) {
    await page.evaluate(() => {
      const e = window.__brumaluz!;
      const [cx, , cz] = e.camera!.posicao();
      const [px, , pz] = e.posicao!;
      e.personagem!.girarCorpo?.(Math.atan2(cx - px, cz - pz) - e.camera!.yawCorpo());
    });
    await page.waitForTimeout(400);
    await page.evaluate((g) => window.__brumaluz!.gestos!.fazer(g as never), g);
    await page.waitForTimeout(g === 'reverencia' ? 1150 : 420);
    await page.screenshot({ path: `${PASTA}/presente-gesto-${g}.png` });
    await page.waitForTimeout(2200);
  }

  // o amigo com a etiqueta com estrela e o balão (amigo de teste perto)
  await page.evaluate(() => {
    const e = window.__brumaluz!;
    const [cx, , cz] = e.camera!.posicao();
    const [px, py, pz] = e.jogadorPes!();
    const dx = px - cx;
    const dz = pz - cz;
    const d = Math.hypot(dx, dz) || 1;
    e.amigosDeTeste!([
      {
        id: 'Bia',
        aparencia: { corpo: 'feminino', cabeloEstilo: 2, etiqueta: 'estrela', balao: 'estrela' },
        x: px + (dz / d) * 2.2 + (dx / d) * 1,
        y: py,
        z: pz - (dx / d) * 2.2 + (dz / d) * 1,
        yaw: Math.atan2(-dx, -dz),
      },
      {
        id: 'Caio',
        aparencia: { corpo: 'masculino', cabeloEstilo: 0, etiqueta: 'cor' },
        x: px - (dz / d) * 2.2 + (dx / d) * 1,
        y: py,
        z: pz + (dx / d) * 2.2 + (dz / d) * 1,
        yaw: Math.atan2(-dx, -dz),
      },
    ]);
  });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${PASTA}/presente-etiquetas-amigos.png` });
  await page.evaluate(() => window.__brumaluz!.amigosDeTeste!([]));

  // as tintas lilás e menta na aba Fantasias (o editor, com uma fantasia vestida)
  await page.evaluate(() =>
    window.__brumaluz!.personagem!.definir({ fantasia: { id: 'heroi-estrela', cor: 90 } } as never),
  );
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${PASTA}/presente-tinta-lilas-no-jogo.png` });

  // a moldura de flores no modo foto
  await page.keyboard.press('KeyP');
  await page.waitForTimeout(600);
  const moldura = page.locator('[data-moldura-foto]');
  await expect(moldura).toBeVisible();
  await moldura.evaluate((b) => (b as HTMLButtonElement).click());
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${PASTA}/presente-moldura-foto.png` });
  await page.keyboard.press('KeyP');
  await page.waitForTimeout(500);
  expect(erros, erros.join('\n')).toEqual([]);
});

// ------------------------------------------------------------------ nuvem
async function jogador(browser: Browser, id: string, apelido: string, aparencia: object) {
  const ctx = await browser.newContext({ viewport: { width: 960, height: 600 } });
  await ctx.addInitScript(
    ([i, a, ap]) => {
      localStorage.setItem(
        'terrario:identidade',
        JSON.stringify({ id: i, chave: `chave-de-teste-${i}-0123456789abcdef`, apelido: a }),
      );
      localStorage.setItem(
        'terrario:config',
        JSON.stringify({ distancia: 4, mostrarFps: false, mostrarAtalhos: false }),
      );
      localStorage.setItem('terrario:aparencia', JSON.stringify({ versao: 1, aparencia: ap }));
      // carteira cheia para a compra (até a 024 a carteira mora no aparelho); ao reabrir, fica
      if (!localStorage.getItem('terrario:alma-crianca'))
        localStorage.setItem(
        'terrario:alma-crianca',
        JSON.stringify({ versao: 1, moedas: 300, xp: 0, pontos: {}, premium: [], vestidos: {}, fantasias: [] }),
      );
    },
    [id, apelido, aparencia] as const,
  );
  const p = await ctx.newPage();
  p.on('pageerror', (e) => console.log(`[${apelido}] erro: ${String(e)}`));
  return p;
}
const pronto = (p: Page) =>
  p.waitForFunction(() => window.__brumaluz?.ready, null, { timeout: 180_000 });
const jogar = (p: Page) =>
  p.evaluate(() => {
    document.querySelector('.entrada')?.setAttribute('hidden', '');
    const e = window.__brumaluz!;
    e.pausarDia = true;
    e.hora = 0.42;
    e.definirClima?.('limpo');
  });

test('dois na nuvem: cada uma vê o premium da outra em até 1 s', async ({ browser }) => {
  test.skip(!!SO && SO !== 'nuvem');
  test.setTimeout(900_000);
  mkdirSync(PASTA, { recursive: true });
  const ana = await jogador(browser, 'ana-023c', 'Ana', { corpo: 'feminino', cabeloEstilo: 5, pele: 1 });
  await ana.goto('/?tema=rancho-alegre');
  await pronto(ana);
  await jogar(ana);
  await ana.evaluate(() => window.dispatchEvent(new CustomEvent('brumaluz:amigos')));
  await ana.locator('[data-abrir-para-amigos]').evaluate((b) => (b as HTMLElement).click(), undefined, {
    timeout: 60_000,
  });
  await ana.waitForURL(/sala=/, { timeout: 60_000 });
  await pronto(ana);
  await jogar(ana);
  const codigo = await ana
    .locator('[data-codigo-mundo]')
    .getAttribute('data-codigo-mundo', { timeout: 30_000 });
  await ana.keyboard.press('Escape');
  await ana.evaluate(() =>
    document.querySelector<HTMLElement>('.amigos [data-fechar], .amigos .fechar')?.click(),
  );
  const bia = await jogador(browser, 'bia-023c', 'Bia', { corpo: 'masculino', cabeloEstilo: 0, pele: 3 });
  await bia.goto(`/?sala=${codigo}`);
  await bia.locator('[data-entrar-mundo]').evaluate((b) => (b as HTMLElement).click(), undefined, {
    timeout: 60_000,
  });
  await pronto(bia);
  await jogar(bia);
  const ve = (p: Page) =>
    p.evaluate(() => ({
      outros: (window.__brumaluz!.outrosJogadores?.() ?? []).map((o) => o.apelido),
      pes: window.__brumaluz!.jogadorPes!(),
    }));
  console.log('ana', JSON.stringify(await ve(ana)), 'bia', JSON.stringify(await ve(bia)));
  await ana.waitForFunction(
    () => (window.__brumaluz!.outrosJogadores?.() ?? []).some((o) => o.apelido === 'Bia'),
    null,
    { timeout: 60_000 },
  );
  // a Bia do lado da Ana, as duas olhando uma para a outra
  const [x, , z] = await ana.evaluate(() => window.__brumaluz!.jogadorPes!());
  await bia.evaluate(([x, z]) => window.__brumaluz!.teleportar!(x + 3, z + 1), [x, z] as const);
  await ana.waitForTimeout(2500);

  const vestirE = async (p: Page, ids: string[]) =>
    p.evaluate((ids) => {
      const perfil = (window as unknown as { __almaCrianca: Perfil }).__almaCrianca;
      for (const id of ids) perfil.comprarPremium(id);
      return performance.now();
    }, ids);
  /** Quanto tempo até a outra tela ver o premium no amigo (ms). */
  const ateVer = async (p: Page, apelido: string, id: string) =>
    p.evaluate(
      ([apelido, id]) =>
        new Promise<number>((ok) => {
          const t0 = performance.now();
          const olhar = () => {
            const o = (window.__brumaluz!.outrosJogadores?.() ?? []).find(
              (x) => x.apelido === apelido,
            ) as { aparencia?: string } | undefined;
            if (o?.aparencia?.includes(id)) return ok(performance.now() - t0);
            if (performance.now() - t0 > 5000) return ok(99999);
            requestAnimationFrame(olhar);
          };
          olhar();
        }),
      [apelido, id] as const,
    );
  const [, tBia] = await Promise.all([
    vestirE(ana, ['dragao', 'unicornio', 'tenis-cometa']),
    ateVer(bia, 'Ana', 'dragao'),
  ]);
  console.log('a Bia viu o premium da Ana em', tBia.toFixed(0), 'ms');
  expect(tBia).toBeLessThan(1000);
  const [, tAna] = await Promise.all([
    vestirE(bia, ['capa-estrelas', 'pinguim', 'camiseta-arco-iris']),
    ateVer(ana, 'Bia', 'capa-estrelas'),
  ]);
  console.log('a Ana viu o premium da Bia em', tAna.toFixed(0), 'ms');
  expect(tAna).toBeLessThan(1000);
  await ana.waitForTimeout(2500);
  // o quadro de missões da primeira visita fecha e os avisos saem (as capturas são das amigas)
  for (const p of [ana, bia]) {
    await p.evaluate(() =>
      document.querySelectorAll<HTMLElement>('[data-alma-fechar]').forEach((b) => b.click()),
    );
    await p.addStyleTag({ content: '.toast-area { display: none !important; }' });
  }
  // cada uma olha para a outra
  for (const [p, quem] of [
    [ana, 'ana'],
    [bia, 'bia'],
  ] as const) {
    await p.evaluate(() => {
      const e = window.__brumaluz!;
      const o = (e.outrosJogadores?.() ?? [])[0];
      const [x, , z] = e.jogadorPes!();
      if (o) e.apontar!(Math.atan2(o.x - x, o.z - z), 0.25);
    });
    await p.waitForTimeout(1200);
    await p.screenshot({ path: `${PASTA}/nuvem-${quem}-ve-a-amiga.png` });
  }
  // reabrir: o premium comprado continua vestido
  await ana.reload();
  await pronto(ana);
  const v = await ana.evaluate(() => window.__brumaluz!.personagem!.aparencia().premium);
  expect(v).toEqual({ fantasia: 'dragao', bicho: 'unicornio', roupa: 'tenis-cometa' });
  await ana.context().close();
  await bia.context().close();
});
