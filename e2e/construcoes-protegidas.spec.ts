import { mkdirSync } from 'node:fs';
import { expect, test, type Browser, type Page } from '@playwright/test';
import { Bloco } from '../src/world/blocks';

/**
 * Spec 016 (T03 e T04): construções protegidas com três jogadores na nuvem. A Ana é a dona
 * do mundo (criativo); a Bia e o Léo são amigos. Cada tela prevê com a mesma regra do
 * servidor: cadeadinho na mira, rachadura que nem começa e o aviso de criança; o bloco fica
 * igual nas três telas. No fim, o cadeado no contorno do dedo (celular).
 */
const PASTA = 'test-results/regras016';

type P = { x: number; y: number; z: number };

async function jogador(
  browser: Browser,
  id: string,
  apelido: string,
  celular = false,
): Promise<Page> {
  const ctx = await browser.newContext(
    celular
      ? { viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true }
      : { viewport: { width: 1280, height: 720 } },
  );
  await ctx.addInitScript(
    ([i, a]) => {
      localStorage.setItem(
        'terrario:identidade',
        JSON.stringify({ id: i, chave: `chave-de-teste-${i}-0123456789abcdef`, apelido: a }),
      );
    },
    [id, apelido],
  );
  const p = await ctx.newPage();
  p.on('pageerror', (e) => console.log(`[${apelido}] erro: ${String(e)}`));
  return p;
}
const pronto = (p: Page) =>
  p.waitForFunction(() => window.__brumaluz?.ready === true, null, { timeout: 180_000 });
const entrarNoJogo = (p: Page) =>
  p.evaluate(() => {
    document.querySelector('.entrada')?.setAttribute('hidden', '');
    const e = window.__brumaluz!;
    e.pausarDia = true;
    e.hora = 0.42;
  });

async function mundoCriativo(p: Page, nome: string) {
  await p.goto('/');
  await pronto(p);
  await p.locator('[data-abrir-mundos]').click();
  await p.locator('button[data-modo="criativo"]').click();
  await p.locator('[data-novo-nome]').fill(nome);
  await p.locator('[data-novo-semente]').fill('1337');
  await p.locator('[data-criar-mundo]').click();
  await p.waitForURL(/mundo=/);
  await pronto(p);
  await entrarNoJogo(p);
}

/**
 * Do lado de uma porta da vila: a passagem (de fora), a parede ao lado dela, onde ficar
 * para mirar a parede e um terreno livre longe do povoado.
 */
async function lugaresDaVila(p: Page) {
  const v = await p.evaluate(() => window.__brumaluz!.povoados!()[0]);
  expect(v, 'nenhum povoado perto do nascimento').toBeTruthy();
  await p.evaluate((v) => window.__brumaluz!.teleportar!(v.cx + 0.5, v.cz + 0.5), v);
  await p.waitForTimeout(6000);
  const l = await p.evaluate((v) => {
    const e = window.__brumaluz!;
    const viz = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ];
    for (let r = 2; r < 40; r++)
      for (let dx = -r; dx <= r; dx++)
        for (let dz = -r; dz <= r; dz++) {
          if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
          const x = v.cx + dx;
          const z = v.cz + dz;
          for (let y = v.h - 3; y <= v.h + 4; y++) {
            if (e.protecao!(x, y, z) !== 'passagem' || e.bloco!(x, y, z) !== 0) continue;
            if (e.bloco!(x, y - 1, z) === 0 || e.protecao!(x, y + 1, z) !== 'passagem') continue;
            // a parede encostada na passagem, e o lado oposto livre para recuar
            for (const [ax, az] of viz) {
              const w = { x: x + ax, y: y + 1, z: z + az };
              if (e.protecao!(w.x, w.y, w.z) !== 'estrutura' || e.bloco!(w.x, w.y, w.z) === 0)
                continue;
              const fica = { x: x - ax * 2, z: z - az * 2 };
              if (e.bloco!(fica.x, y, fica.z) !== 0 || e.bloco!(fica.x, y + 1, fica.z) !== 0)
                continue;
              return {
                passagem: { x, y, z },
                parede: w,
                normal: { x: -ax, y: 0, z: -az },
                fica: { x: fica.x + 0.5, y, z: fica.z + 0.5 },
              };
            }
          }
        }
    return null;
  }, v);
  expect(l, 'nenhuma parede ao lado de uma passagem').not.toBeNull();
  return { vila: v, ...l! };
}

/** Campo livre (terreno natural plano) ao lado do povoado, para os blocos dos amigos. */
async function campoLivre(p: Page, v: { cx: number; cz: number }): Promise<P> {
  const c = await p.evaluate((v) => {
    const e = window.__brumaluz!;
    for (let d = 40; d < 140; d += 4) {
      const x = v.cx + d;
      const z = v.cz;
      let y = 120;
      while (y > 2 && e.bloco!(x, y, z) === 0) y--;
      let ok = true;
      for (let dx = -3; dx <= 3 && ok; dx++)
        for (let dz = -3; dz <= 3 && ok; dz++)
          if (e.protecao!(x + dx, y, z + dz) !== 'livre') ok = false;
      if (ok) return { x, y: y + 1, z };
    }
    return null;
  }, v);
  expect(c, 'nenhum campo livre perto da vila').not.toBeNull();
  return c!;
}

const ir = (p: Page, x: number, z: number, y?: number) =>
  p.evaluate(({ x, y, z }) => window.__brumaluz!.teleportar!(x, z, y), { x, y, z });
const mirar = (p: Page, b: P, normal?: P) =>
  p.evaluate(({ b, n }) => window.__brumaluz!.mirarBloco!(b.x, b.y, b.z, n), { b, n: normal });
const blocoEm = (p: Page, b: P) => p.evaluate((b) => window.__brumaluz!.bloco!(b.x, b.y, b.z), b);
const aviso = (p: Page, texto: string) => p.locator(`.toast-area [data-texto="${texto}"]`);

/** Mira até acertar (os chunks e a câmera podem demorar um quadro). */
async function mirarAte(p: Page, b: P, normal?: P) {
  await expect.poll(() => mirar(p, b, normal), { timeout: 15_000 }).toBe(true);
  await p.waitForTimeout(250);
}

test('três amigos na nuvem: casa da vila, parede do amigo, passagem, baú, fornalha, porta e bicho', async ({
  browser,
}) => {
  test.setTimeout(900_000);
  mkdirSync(PASTA, { recursive: true });
  const sufixo = Date.now().toString(36);

  // a Ana cria um mundo criativo e leva para a nuvem
  const ana = await jogador(browser, `ana-${sufixo}`, 'Ana');
  await mundoCriativo(ana, 'Vila da Ana');
  await ana.evaluate(() => window.dispatchEvent(new CustomEvent('brumaluz:amigos')));
  await ana.locator('[data-abrir-para-amigos]').click();
  await ana.waitForURL(/sala=/, { timeout: 60_000 });
  await pronto(ana);
  await entrarNoJogo(ana);
  const codigo = await ana
    .locator('[data-codigo-mundo]')
    .getAttribute('data-codigo-mundo', { timeout: 30_000 });
  await ana.keyboard.press('Escape');

  const bia = await jogador(browser, `bia-${sufixo}`, 'Bia');
  const leo = await jogador(browser, `leo-${sufixo}`, 'Léo');
  for (const p of [bia, leo]) {
    await p.goto(`/?sala=${codigo}`);
    await p.locator('[data-entrar-mundo]').click({ timeout: 60_000 });
    await pronto(p);
    await entrarNoJogo(p);
  }
  const todos = [ana, bia, leo];
  for (const p of [bia, leo])
    await expect(ana.evaluate(() => window.__brumaluz!.voce)).resolves.not.toBe(
      await p.evaluate(() => window.__brumaluz!.voce),
    );

  // 1. a casa da vila: nem a dona, no criativo, quebra
  const L = await lugaresDaVila(ana);
  console.log(`vila: ${JSON.stringify(L)}`);
  for (const p of todos) await ir(p, L.fica.x, L.fica.z, L.fica.y);
  await ana.waitForTimeout(5000);
  await mirarAte(ana, L.parede, L.normal);
  expect(await ana.evaluate(() => window.__brumaluz!.protecaoNaMira!())).toEqual({
    motivo: 'mundo',
    lugar: 'vila',
  });
  await expect.poll(() => ana.evaluate(() => window.__brumaluz!.cadeado!.visivel)).toBe(true);
  await ana.screenshot({ path: `${PASTA}/1-ana-cadeado-casa-da-vila.png` });
  const paredeAntes = await blocoEm(ana, L.parede);
  // medida: o custo de mirar e minerar no bloco protegido (a conta da regra por quadro)
  const r = await ana.evaluate(() => window.__brumaluz!.minerar!(1.5));
  expect(r.quebrou).toBe(false);
  expect(r.estagio).toBe(0);
  await expect(aviso(ana, 'Essa casa é da vila. Que tal construir a sua?')).toBeVisible();
  await ana.screenshot({ path: `${PASTA}/2-ana-aviso-casa-da-vila.png` });
  await ana.waitForTimeout(1200);
  for (const p of todos) expect(await blocoEm(p, L.parede)).toBe(paredeAntes);

  // 2. a passagem: o Léo tenta tapar a porta da casa
  await leo.evaluate((b) => {
    const e = window.__brumaluz!;
    e.inventario!.definir(0, { item: `bloco:${b}`, qtd: 64 });
    e.selecionarSlot!(0);
  }, Bloco.TABUAS);
  const chao = { ...L.passagem, y: L.passagem.y - 1 };
  await mirarAte(leo, chao, { x: 0, y: 1, z: 0 });
  await leo.evaluate(() => window.__brumaluz!.controleDireto!.usar());
  await expect(aviso(leo, 'Aqui é passagem: deixa livre para todo mundo passar.')).toBeVisible();
  await leo.screenshot({ path: `${PASTA}/3-leo-aviso-passagem.png` });
  await leo.waitForTimeout(1200);
  for (const p of todos) expect(await blocoEm(p, L.passagem)).toBe(0);

  // 3. a parede da Bia num campo livre: o Léo não quebra; a dona desfaz
  const C = await campoLivre(ana, L.vila);
  const B = { x: C.x + 2, y: C.y, z: C.z };
  const Q = { x: C.x + 2, y: C.y, z: C.z + 2 };
  const D = { x: C.x + 2, y: C.y, z: C.z - 2 };
  const F = { x: C.x + 1, y: C.y, z: C.z + 3 };
  for (const p of todos) await ir(p, C.x - 1.5, C.z + 0.5);
  await bia.waitForTimeout(4000);
  // a Bia constrói (de novo, se o servidor ainda não tinha a posição nova dela e recusou)
  const construir = () =>
    bia.evaluate(
      ({ B, Q, D, F, tabuas, bau, porta, fornalha }) => {
        const e = window.__brumaluz!;
        e.definirBloco!(B.x, B.y, B.z, tabuas);
        e.definirBloco!(B.x, B.y + 1, B.z, tabuas);
        e.definirBloco!(Q.x, Q.y, Q.z, bau);
        e.definirBloco!(F.x, F.y, F.z, fornalha);
        e.definirBloco!(D.x, D.y, D.z, porta, 3);
        e.definirBloco!(D.x, D.y + 1, D.z, porta, 3);
      },
      {
        B,
        Q,
        D,
        F,
        tabuas: Bloco.TABUAS,
        bau: Bloco.BAU,
        porta: Bloco.PORTA,
        fornalha: Bloco.FORNALHA,
      },
    );
  await expect
    .poll(
      async () => {
        const ok = await bia.evaluate(
          ({ B, F }) =>
            [B, F].every(
              (b) => window.__brumaluz!.donoDoBloco!(b.x, b.y, b.z) === window.__brumaluz!.voce,
            ),
          { B, F },
        );
        if (!ok) await construir();
        return ok;
      },
      { timeout: 40_000, intervals: [3000] },
    )
    .toBe(true);
  for (const p of todos)
    await p.waitForFunction((B) => window.__brumaluz!.donoDoBloco!(B.x, B.y, B.z) !== null, B, {
      timeout: 15_000,
    });
  await mirarAte(leo, B, { x: -1, y: 0, z: 0 });
  expect(await leo.evaluate(() => window.__brumaluz!.protecaoNaMira!())).toEqual({
    motivo: 'amigo',
    dono: 'Bia',
  });
  await expect.poll(() => leo.evaluate(() => window.__brumaluz!.cadeado!.visivel)).toBe(true);
  await leo.screenshot({ path: `${PASTA}/4-leo-cadeado-parede-da-bia.png` });
  const rl = await leo.evaluate(() => window.__brumaluz!.minerar!(1.5));
  expect(rl).toMatchObject({ quebrou: false, estagio: 0 });
  await expect(aviso(leo, 'Essa parede é da Bia.')).toBeVisible();
  await leo.screenshot({ path: `${PASTA}/5-leo-aviso-parede-da-bia.png` });
  await leo.waitForTimeout(1200);
  for (const p of todos) expect(await blocoEm(p, B)).toBe(Bloco.TABUAS);
  // a Ana, dona do mundo, desfaz (e vê o aviso discreto)
  await mirarAte(ana, B, { x: -1, y: 0, z: 0 });
  expect(await ana.evaluate(() => window.__brumaluz!.cadeado!.visivel)).toBe(false);
  const ra = await ana.evaluate(() => window.__brumaluz!.minerar!(1.5));
  expect(ra.quebrou).toBe(true);
  await expect(aviso(ana, 'Você tirou um bloco da Bia.')).toBeVisible();
  await ana.screenshot({ path: `${PASTA}/6-ana-tirou-bloco-da-bia.png` });
  for (const p of todos)
    await p.waitForFunction((B) => window.__brumaluz!.bloco!(B.x, B.y, B.z) === 0, B, {
      timeout: 15_000,
    });

  // 4. o baú da Bia: o Léo não abre; a dona abre
  await mirarAte(leo, Q, { x: -1, y: 0, z: 0 });
  await leo.evaluate(() => window.__brumaluz!.controleDireto!.usar());
  await expect(aviso(leo, 'Esse baú é da Bia.')).toBeVisible();
  await leo.waitForTimeout(1500);
  expect(await leo.evaluate(() => document.body.dataset.overlay ?? '')).toBe('');
  await leo.screenshot({ path: `${PASTA}/7-leo-aviso-bau-da-bia.png` });
  await mirarAte(ana, Q, { x: -1, y: 0, z: 0 });
  await ana.evaluate(() => window.__brumaluz!.controleDireto!.usar());
  await expect(ana.locator('.painel-conteiner').first()).toBeVisible({ timeout: 15_000 });
  await ana.keyboard.press('Escape');

  // 4b. a fornalha da Bia segue o baú (decisão do dono): cadeado e aviso para o Léo; a dona abre
  await mirarAte(leo, F, { x: -1, y: 0, z: 0 });
  await expect.poll(() => leo.evaluate(() => window.__brumaluz!.cadeado!.visivel)).toBe(true);
  await leo.evaluate(() => window.__brumaluz!.controleDireto!.usar());
  await expect(aviso(leo, 'Essa fornalha é da Bia.')).toBeVisible();
  await leo.waitForTimeout(1500);
  expect(await leo.evaluate(() => document.body.dataset.overlay ?? '')).toBe('');
  await leo.screenshot({ path: `${PASTA}/7b-leo-aviso-fornalha-da-bia.png` });
  await mirarAte(ana, F, { x: -1, y: 0, z: 0 });
  await ana.evaluate(() => window.__brumaluz!.controleDireto!.usar());
  await expect(ana.locator('.painel-fornalha').first()).toBeVisible({ timeout: 15_000 });
  await ana.keyboard.press('Escape');

  // 5. a porta da Bia: o Léo abre e fecha, mas não quebra
  await mirarAte(leo, D, { x: -1, y: 0, z: 0 });
  await leo.evaluate(() => window.__brumaluz!.controleDireto!.usar());
  for (const p of todos)
    await p.waitForFunction(
      ([D, aberta]) => window.__brumaluz!.bloco!(D.x, D.y, D.z) === aberta,
      [D, Bloco.PORTA_ABERTA] as const,
      { timeout: 15_000 },
    );
  await mirarAte(leo, D);
  await leo.evaluate(() => window.__brumaluz!.controleDireto!.usar());
  await leo.waitForFunction(
    ([D, fechada]) => window.__brumaluz!.bloco!(D.x, D.y, D.z) === fechada,
    [D, Bloco.PORTA] as const,
    { timeout: 15_000 },
  );
  await mirarAte(leo, D);
  expect((await leo.evaluate(() => window.__brumaluz!.minerar!(1.5))).quebrou).toBe(false);
  await leo.waitForTimeout(1000);
  for (const p of todos) expect(await blocoEm(p, D)).toBe(Bloco.PORTA);

  // 6. o bicho da Bia: o Léo chama e ele fica; a Bia chama e ele vem
  await leo.evaluate((C) => window.__brumaluz!.teleportar!(C.x - 8.5, C.z + 0.5), C);
  await bia.evaluate((C) => window.__brumaluz!.teleportar!(C.x + 0.5, C.z + 10.5), C);
  await bia.waitForTimeout(1500);
  await bia.evaluate(
    (C) => window.__brumaluz!.invocar!('cervo', C.x + 0.5, C.y + 1, C.z + 0.5, { criado: true }),
    C,
  );
  const vaca = async (p: Page) =>
    p.evaluate(() => (window.__brumaluz!.criaturas!() ?? []).find((c) => c.criado) ?? null);
  await expect.poll(() => vaca(leo), { timeout: 15_000 }).not.toBeNull();
  const posLeo = await leo.evaluate(() => window.__brumaluz!.posicao!);
  const longe = (c: { x: number; z: number }, p: number[]) => Math.hypot(c.x - p[0], c.z - p[2]);
  const d0 = longe((await vaca(leo))!, posLeo);
  await leo.evaluate(() => window.__brumaluz!.gestos!.fazer('chamar'));
  await expect(aviso(leo, 'Esse bichinho é da Bia.')).toBeVisible({ timeout: 10_000 });
  await leo.screenshot({ path: `${PASTA}/8-leo-aviso-bichinho-da-bia.png` });
  await leo.waitForTimeout(4000);
  const d1 = longe((await vaca(leo))!, posLeo);
  console.log(`vaca da Bia até o Léo: antes ${d0.toFixed(1)}, depois de chamar ${d1.toFixed(1)}`);
  expect(d1).toBeGreaterThan(Math.min(d0 - 3, 4.5));
  const posBia = await bia.evaluate(() => window.__brumaluz!.posicao!);
  await bia.evaluate(() => window.__brumaluz!.gestos!.fazer('chamar'));
  await expect
    .poll(async () => longe((await vaca(bia))!, posBia), { timeout: 12_000 })
    .toBeLessThan(4);
});

test('celular: o cadeado aparece no contorno do dedo e a rachadura nem começa', async ({
  browser,
}) => {
  test.setTimeout(400_000);
  mkdirSync(PASTA, { recursive: true });
  const p = await jogador(browser, `cel-${Date.now().toString(36)}`, 'Nina', true);
  await mundoCriativo(p, 'Dedo na vila');
  await expect(p.locator('[data-toque]')).toBeVisible();
  const L = await lugaresDaVila(p);
  await ir(p, L.fica.x, L.fica.z, L.fica.y);
  await p.waitForTimeout(4000);
  await mirarAte(p, L.parede, L.normal);
  await p.waitForTimeout(600);
  // o dedo no meio da face da parede
  const t = await p.evaluate(
    ({ w, n }) =>
      window.__brumaluz!.telaDoPonto!(w.x + 0.5 + n.x * 0.5, w.y + 0.5, w.z + 0.5 + n.z * 0.5),
    { w: L.parede, n: L.normal },
  );
  expect(t).toBeTruthy();
  await p.evaluate((t) => window.__brumaluz!.controleDireto!.mirar(t!.x, t!.y), t);
  await expect
    .poll(() => p.evaluate(() => window.__brumaluz!.destaque!()), { timeout: 5_000 })
    .toEqual(L.parede);
  await expect.poll(() => p.evaluate(() => window.__brumaluz!.cadeado!.visivel)).toBe(true);
  const cad = await p.evaluate(() => window.__brumaluz!.cadeado!);
  // em cima do bloco que o dedo pegou (perto do dedo, nunca no meio da tela)
  expect(Math.hypot(cad.x - t!.x, cad.y - t!.y)).toBeLessThan(140);
  await p.screenshot({ path: `${PASTA}/9-celular-cadeado-no-dedo.png` });
  // segurar o dedo: nada de rachadura, o aviso aparece e a parede fica
  const antes = await blocoEm(p, L.parede);
  await p.evaluate(() => window.__brumaluz!.controleDireto!.quebrar(true));
  await p.waitForTimeout(1500);
  expect(await p.evaluate(() => window.__brumaluz!.rachadura!.visivel)).toBe(false);
  await expect(aviso(p, 'Essa casa é da vila. Que tal construir a sua?')).toBeVisible();
  await p.screenshot({ path: `${PASTA}/10-celular-aviso-casa-da-vila.png` });
  await p.evaluate(() => window.__brumaluz!.controleDireto!.quebrar(false));
  await p.evaluate(() => window.__brumaluz!.controleDireto!.soltarMira());
  expect(await blocoEm(p, L.parede)).toBe(antes);
  await p.waitForTimeout(300);
  expect(await p.evaluate(() => window.__brumaluz!.cadeado!.visivel)).toBe(false);
});

test('voltar para casa: pela pausa e pela roda, com o aviso de esperar um pouquinho', async ({
  browser,
}) => {
  test.setTimeout(300_000);
  mkdirSync(PASTA, { recursive: true });
  const p = await jogador(browser, `casa-${Date.now().toString(36)}`, 'Duda');
  await mundoCriativo(p, 'Casa da Duda');
  await p.waitForTimeout(3000);
  // a cama (o ponto de renascer) fica onde ela está; depois ela vai longe
  const casa = await p.evaluate(() => {
    const e = window.__brumaluz!;
    const [x, , z] = e.posicao!;
    e.definirSpawn!(x, z);
    return { x, z };
  });
  await ir(p, casa.x + 150, casa.z + 40);
  await p.waitForTimeout(3000);
  const longe = (c: number[]) => Math.hypot(c[0] - casa.x, c[2] - casa.z);
  expect(longe(await p.evaluate(() => window.__brumaluz!.posicao!))).toBeGreaterThan(100);
  // pela pausa
  await p.evaluate(() => window.dispatchEvent(new CustomEvent('brumaluz:pausar')));
  await expect(p.locator('[data-pausa-casa]')).toBeVisible();
  await p.screenshot({ path: `${PASTA}/11-pausa-voltar-para-casa.png` });
  await p.locator('[data-pausa-casa]').click();
  await expect(aviso(p, 'Voltando para casa!')).toBeVisible();
  await expect
    .poll(async () => longe(await p.evaluate(() => window.__brumaluz!.posicao!)), {
      timeout: 15_000,
    })
    .toBeLessThan(12);
  // pela roda, logo em seguida: espera um pouquinho
  // (o canvas fica por cima no headless com o ponteiro preso: o clique vai direto no botão)
  await p.locator('[data-botao-roda]').dispatchEvent('click');
  await p.waitForTimeout(400);
  await expect(p.locator('.roda.aberta button.ativo[data-item="casa"]')).toBeVisible();
  await p.screenshot({ path: `${PASTA}/12-roda-para-casa.png` });
  await p.locator('.roda.aberta button.ativo[data-item="casa"]').dispatchEvent('click');
  await expect(aviso(p, 'Espera um pouquinho para voltar de novo.')).toBeVisible();
});
