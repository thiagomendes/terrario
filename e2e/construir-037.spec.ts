import { expect, test, type Browser, type Page } from '@playwright/test';
import { Bloco } from '../src/world/blocks';

/**
 * Spec 037 (T02): bloco nunca em cima de ninguém e só encostado. No aparelho (servidor local):
 * em cima da tocha não entra (no ar), no chão e em cima de bloco entra, em cima do bicho e do
 * peixe não entra (e o peixe não morre). Na nuvem: a Bia atravessa a célula andando, correndo
 * e pulando enquanto a Ana põe o bloco nela, em várias distâncias; ela nunca fica presa mais
 * de 1 s (o núcleo recusa ou o soltar tira).
 */
type P = { x: number; y: number; z: number };

async function jogador(browser: Browser, id: string, apelido: string): Promise<Page> {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
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
  await p.locator('.cartao-tema[data-tema="doce-reino"]').click();
  await p.locator('button[data-modo="criativo"]').click();
  await p.locator('[data-novo-nome]').fill(nome);
  await p.locator('[data-novo-semente]').fill('1337');
  await p.locator('[data-criar-mundo]').click();
  await p.waitForURL(/mundo=/);
  await pronto(p);
  await entrarNoJogo(p);
}

/**
 * Uma plataforma de pedra lisa (13 × 13) 8 blocos acima do terreno em volta, com o ar limpo em
 * cima: o chão de cima é Y e as células de ar começam em Y + 1. Vai pelo lote do criativo (que
 * não tem a regra de apoio, como colar uma construção).
 */
async function plataforma(p: Page): Promise<{ cx: number; cz: number; Y: number }> {
  const r = await p.evaluate((pedra) => {
    const e = window.__brumaluz!;
    const [px, , pz] = e.posicao!;
    const cx = Math.floor(px);
    const cz = Math.floor(pz);
    let alto = 0;
    for (let dx = -8; dx <= 8; dx++)
      for (let dz = -8; dz <= 8; dz++) {
        let y = 120;
        while (y > 2 && e.bloco!(cx + dx, y, cz + dz) === 0) y--;
        alto = Math.max(alto, y);
      }
    const Y = alto + 8;
    const lote: { x: number; y: number; z: number; v: number }[] = [];
    for (let dx = -6; dx <= 6; dx++)
      for (let dz = -6; dz <= 6; dz++) {
        lote.push({ x: cx + dx, y: Y, z: cz + dz, v: pedra });
        for (let dy = 1; dy <= 4; dy++) lote.push({ x: cx + dx, y: Y + dy, z: cz + dz, v: 0 });
      }
    e.editarLote!(lote);
    return { cx, cz, Y };
  }, Bloco.PEDRA_LISA);
  await expect
    .poll(() => p.evaluate((r) => window.__brumaluz!.bloco!(r.cx + 6, r.Y, r.cz + 6), r))
    .toBe(Bloco.PEDRA_LISA);
  return r;
}

const ir = (p: Page, x: number, z: number, y?: number) =>
  p.evaluate(({ x, y, z }) => window.__brumaluz!.teleportar!(x, z, y), { x, y, z });
const mirar = (p: Page, b: P, normal?: P) =>
  p.evaluate(({ b, n }) => window.__brumaluz!.mirarBloco!(b.x, b.y, b.z, n), { b, n: normal });
const blocoEm = (p: Page, b: P) => p.evaluate((b) => window.__brumaluz!.bloco!(b.x, b.y, b.z), b);
const colocar = (p: Page) => p.evaluate(() => window.__brumaluz!.interagir!('colocar'));
const naMao = (p: Page, bloco: number) =>
  p.evaluate((b) => {
    const e = window.__brumaluz!;
    e.inventario!.definir(0, { item: `bloco:${b}`, qtd: 64 });
    e.selecionarSlot!(0);
  }, bloco);
const CIMA = { x: 0, y: 1, z: 0 };

/** Mira até acertar (os chunks e a câmera podem demorar um quadro). */
async function mirarAte(p: Page, b: P, normal?: P) {
  await expect.poll(() => mirar(p, b, normal), { timeout: 15_000 }).toBe(true);
  await p.waitForTimeout(250);
}

test('no aparelho: só encostado, e nunca em cima do bicho nem do peixe', async ({ browser }) => {
  test.setTimeout(300_000);
  const p = await jogador(browser, `ana-${Date.now().toString(36)}`, 'Ana');
  await mundoCriativo(p, 'Construir 037');
  const { cx, cz, Y } = await plataforma(p);
  await ir(p, cx - 1.5, cz + 0.5, Y + 1);
  await p.waitForTimeout(1500);

  // 1. no chão e em cima de um bloco: entra (encostado)
  await naMao(p, Bloco.TABUAS);
  const B = { x: cx, y: Y + 1, z: cz + 2 };
  await mirarAte(p, { ...B, y: Y }, CIMA);
  expect(await colocar(p)).toBe(true);
  await mirarAte(p, B, CIMA);
  expect(await colocar(p)).toBe(true);
  await p.waitForTimeout(800);
  expect(await blocoEm(p, B)).toBe(Bloco.TABUAS);
  expect(await blocoEm(p, { ...B, y: B.y + 1 })).toBe(Bloco.TABUAS);

  // 2. em cima da tocha: no ar, não entra (nem na tela, nem no núcleo)
  const A = { x: cx, y: Y + 1, z: cz };
  await naMao(p, Bloco.TOCHA);
  await mirarAte(p, { ...A, y: Y }, CIMA);
  expect(await colocar(p)).toBe(true);
  await expect.poll(() => blocoEm(p, A)).toBe(Bloco.TOCHA);
  await naMao(p, Bloco.TABUAS);
  await mirarAte(p, A, CIMA);
  expect(await colocar(p), 'a tela não prevê o bloco no ar').toBe(false);
  await p.waitForTimeout(800);
  expect(await blocoEm(p, { ...A, y: A.y + 1 })).toBe(0);

  // 3. em cima do bicho: não entra
  const D = { x: cx + 1, y: Y + 1, z: cz - 2 };
  await p.evaluate((d) => window.__brumaluz!.invocar!('cervo', d.x + 0.5, d.y, d.z + 0.5), D);
  await expect
    .poll(() =>
      p.evaluate(
        (d) =>
          window.__brumaluz!.criaturas!().some(
            (c) => c.tipo === 'cervo' && Math.floor(c.x) === d.x && Math.floor(c.z) === d.z,
          ),
        D,
      ),
    )
    .toBe(true);
  await mirarAte(p, { ...D, y: Y }, CIMA);
  expect(await colocar(p), 'a tela vê o cervo').toBe(false);
  await p.waitForTimeout(800);
  expect(await blocoEm(p, D)).toBe(0);

  // 4. o peixe numa piscininha de 3 × 3 no chão da plataforma (o fundo de pedra à vista pela
  // água): o bloco não entra em cima dele e ele não morre
  const E = { x: cx - 1, y: Y, z: cz + 4 };
  await p.evaluate(
    ({ e, agua, pedra }) => {
      const lote: { x: number; y: number; z: number; v: number }[] = [];
      for (let dx = -1; dx <= 1; dx++)
        for (let dz = -1; dz <= 1; dz++) {
          lote.push({ x: e.x + dx, y: e.y - 1, z: e.z + dz, v: pedra });
          lote.push({ x: e.x + dx, y: e.y, z: e.z + dz, v: agua });
        }
      window.__brumaluz!.editarLote!(lote);
    },
    { e: E, agua: Bloco.AGUA, pedra: Bloco.PEDRA_LISA },
  );
  await expect.poll(() => blocoEm(p, E)).toBe(Bloco.AGUA);
  await mirarAte(p, { ...E, y: E.y - 1 }, CIMA);
  const peixe = () =>
    p.evaluate(
      (e) =>
        window.__brumaluz!.criaturas!().find(
          (c) => c.tipo === 'peixe' && Math.floor(c.x) === e.x && Math.floor(c.z) === e.z,
        ) ?? null,
      E,
    );
  // o peixe nada: o toque vale com ele na célula (conferido no mesmo instante do toque)
  let resultado: boolean | 'saiu' = 'saiu';
  for (let tentativa = 0; tentativa < 5 && resultado === 'saiu'; tentativa++) {
    await p.evaluate(
      (e) => window.__brumaluz!.invocar!('peixe', e.x + 0.5, e.y + 0.3, e.z + 0.5),
      E,
    );
    await expect.poll(peixe).not.toBeNull();
    await mirar(p, { ...E, y: E.y - 1 }, CIMA);
    resultado = await p.evaluate((e) => {
      const b = window.__brumaluz!;
      const ali = b.criaturas!().some(
        (c) => c.tipo === 'peixe' && Math.floor(c.x) === e.x && Math.floor(c.z) === e.z,
      );
      return ali ? b.interagir!('colocar') : 'saiu';
    }, E);
  }
  expect(resultado, 'a tela vê o peixe').toBe(false);
  await p.waitForTimeout(3000);
  expect(await blocoEm(p, E)).toBe(Bloco.AGUA);
  const vivos = await p.evaluate(() =>
    window.__brumaluz!.criaturas!().filter((c) => c.tipo === 'peixe' && c.estado !== 'morrendo'),
  );
  const todos = await p.evaluate(
    () => window.__brumaluz!.criaturas!().filter((c) => c.tipo === 'peixe').length,
  );
  expect(vivos.length).toBeGreaterThanOrEqual(1);
  expect(vivos.length, 'nenhum peixe morreu').toBe(todos);
});

test('na nuvem: a amiga andando, correndo e pulando nunca fica presa no bloco', async ({
  browser,
}) => {
  test.setTimeout(600_000);
  const sufixo = Date.now().toString(36);
  const ana = await jogador(browser, `ana-${sufixo}`, 'Ana');
  await mundoCriativo(ana, 'Construir na nuvem');
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
  await bia.goto(`/?sala=${codigo}`);
  await bia.locator('[data-entrar-mundo]').click({ timeout: 60_000 });
  await pronto(bia);
  await entrarNoJogo(bia);

  const { cx, cz, Y } = await plataforma(ana);
  // a Ana de lado, olhando para a célula X; a Bia atravessa X ao longo de x
  const X = { x: cx, y: Y + 1, z: cz };
  await ir(ana, cx + 0.5, cz - 2.5, Y + 1);
  await ir(bia, cx - 4.5, cz + 0.5, Y + 1);
  await expect.poll(() => blocoEm(bia, { x: cx + 6, y: Y, z: cz + 6 })).toBe(Bloco.PEDRA_LISA);
  await ana.waitForTimeout(1500);
  await naMao(ana, Bloco.TABUAS);
  await mirarAte(ana, { ...X, y: Y }, CIMA);

  type Rodada = { jeito: string; d: number; maxPreso: number; entrou: boolean; passou: boolean };
  const rodadas: Rodada[] = [];
  for (const jeito of ['andando', 'correndo', 'pulando'] as const)
    for (const d of [2, 1.4, 1, 0.6]) {
      // a célula vazia de novo, a Bia no começo do caminho, olhando para o fim
      await ana.evaluate((x) => window.__brumaluz!.definirBloco!(x.x, x.y, x.z, 0), X);
      await expect.poll(() => blocoEm(bia, X)).toBe(0);
      await ir(bia, cx - 4.5, cz + 0.5, Y + 1);
      await bia.waitForTimeout(400);
      await bia.evaluate(
        ({ x, y, z, tabuas }) => {
          const e = window.__brumaluz!;
          e.mirarPonto!(x, y, z);
          // quanto tempo seguido o corpo dela fica dentro de uma tábua (as células do corpo)
          const w = window as unknown as {
            __preso037?: { max: number; desde: number | null; id: number };
          };
          if (w.__preso037) clearInterval(w.__preso037.id);
          const m = { max: 0, desde: null as number | null, id: 0 };
          m.id = window.setInterval(() => {
            const [px, py, pz] = e.posicao!;
            const pe = py - 1.62;
            let dentro = false;
            for (let ix = Math.floor(px - 0.3 + 1e-3); ix <= Math.floor(px + 0.3 - 1e-3); ix++)
              for (let iy = Math.floor(pe + 1e-3); iy <= Math.floor(pe + 1.8 - 1e-3); iy++)
                for (let iz = Math.floor(pz - 0.3 + 1e-3); iz <= Math.floor(pz + 0.3 - 1e-3); iz++)
                  if (e.bloco!(ix, iy, iz) === tabuas) dentro = true;
            const agora = performance.now();
            if (dentro) {
              m.desde ??= agora;
              m.max = Math.max(m.max, agora - m.desde);
            } else m.desde = null;
          }, 20);
          w.__preso037 = m;
        },
        { x: cx + 6.5, y: Y + 2.6, z: cz + 0.5, tabuas: Bloco.TABUAS },
      );
      await bia.evaluate((jeito) => {
        const c = window.__brumaluz!.controleDireto!;
        if (jeito === 'correndo') c.tecla('correr', true);
        if (jeito === 'pulando') c.tecla('pular', true);
        c.mover(1, 0);
      }, jeito);
      // quando o centro da Bia chega a d da célula, a Ana põe o bloco
      let pos = 0;
      const t0 = Date.now();
      let pos0 = -Infinity;
      while (Date.now() - t0 < 4000) {
        pos = await bia.evaluate(() => window.__brumaluz!.posicao![0]);
        if (pos0 === -Infinity && X.x + 0.5 - pos <= d) {
          pos0 = pos;
          await colocar(ana);
        }
        if (pos > X.x + 3) break;
        await bia.waitForTimeout(16);
      }
      await bia.waitForTimeout(600);
      await bia.evaluate(() => {
        const c = window.__brumaluz!.controleDireto!;
        c.mover(0, 0);
        c.tecla('correr', false);
        c.tecla('pular', false);
      });
      const maxPreso = await bia.evaluate(
        () => (window as unknown as { __preso037: { max: number } }).__preso037.max,
      );
      const entrou = (await blocoEm(bia, X)) === Bloco.TABUAS;
      rodadas.push({ jeito, d, maxPreso, entrou, passou: pos > X.x + 3 });
    }
  console.log(JSON.stringify(rodadas));
  for (const r of rodadas) expect(r.maxPreso, `${r.jeito} a ${r.d}`).toBeLessThan(1000);
  // o teste passou pelas duas coisas: o bloco recusado (ela passou pela célula vazia) e o
  // bloco que entrou antes dela chegar
  expect(rodadas.some((r) => !r.entrou && r.passou)).toBe(true);
  expect(rodadas.some((r) => r.entrou)).toBe(true);
});
