import { mkdirSync } from 'node:fs';
import { test, type Browser, type Page } from '@playwright/test';
import { irPara, porAmigos } from './achar-amigo-palco';

/**
 * Spec 034 (T11): os ícones dos gestos no jogo (a direção A reforçada, aprovada pelo dono em
 * 20 nov 2026): a roleta de Gestos aberta, a carinha de Gestos no menu e na plaquinha "Voltar",
 * o balão em cima da cabeça (o de sempre e o de estrelinha) e as carinhas dos amigos (o aceno
 * de quem chama e o botão Chamar). Não confere nada: só tira as fotos para o portão visual, em
 * capturas-034/gestos-jogo/ (fora de test-results, que o Playwright limpa). Fora da suíte.
 *
 *   CAPTURAS_GESTOS=1 npx playwright test e2e/capturas-gestos.spec.ts
 *
 * `CAPTURAS_PASTA` troca a pasta (as mãos sem dedo foram para capturas-034/maos/).
 *
 * As folhas de escolha (as direções A, B e a A reforçada) ficam em capturas-034/gestos/: são o
 * registro do esboço, que saiu do código quando os ícones entraram no jogo.
 */
declare const process: { env: Record<string, string | undefined> };
const PASTA = process.env.CAPTURAS_PASTA ?? 'capturas-034/gestos-jogo';

test.skip(!process.env.CAPTURAS_GESTOS, 'capturas dos gestos só com CAPTURAS_GESTOS');
test.describe.configure({ mode: 'parallel' });

interface Tela {
  nome: string;
  viewport: { width: number; height: number };
  toque: boolean;
  noite?: boolean;
  /** Passa por todos os 11 gestos, um de cada vez no meio da roleta. */
  todos?: boolean;
}
const TELAS: Tela[] = [
  { nome: 'celular-dia', viewport: { width: 390, height: 844 }, toque: true, todos: true },
  { nome: 'celular-noite', viewport: { width: 390, height: 844 }, toque: true, noite: true },
  { nome: 'celular-deitado', viewport: { width: 844, height: 390 }, toque: true },
  { nome: 'computador', viewport: { width: 1280, height: 720 }, toque: false },
];

async function contexto(browser: Browser, t: Tela) {
  const ctx = await browser.newContext({
    viewport: t.viewport,
    hasTouch: t.toque,
    isMobile: t.toque,
    deviceScaleFactor: t.toque ? 2 : 1,
  });
  // a roleta fecha sozinha em 8 s sem toque, e no SwiftShader (1 quadro por segundo) só a foto
  // da tela já passa disso: nesta captura (não é teste de regra), o prazo de fechar vira 2 min
  await ctx.addInitScript(() => {
    const orig = window.setTimeout;
    window.setTimeout = ((f: TimerHandler, ms?: number, ...a: unknown[]) =>
      orig(f, ms === 8000 ? 120_000 : ms, ...a)) as typeof window.setTimeout;
  });
  return ctx;
}

async function entrar(page: Page, t: Tela) {
  await page.goto('/?escala=1');
  await page.waitForFunction(() => window.__brumaluz?.ready === true, undefined, {
    timeout: 180_000,
  });
  await page.evaluate(
    ({ noite, toque }) => {
      document.querySelector('.entrada')?.setAttribute('hidden', '');
      // sem a tela de título por trás (com ela, a roleta fecha sozinha)
      document.body.classList.remove('tela-titulo');
      if (toque) document.body.classList.add('toque-ativo');
      const e = window.__brumaluz!;
      e.pausarDia = true;
      e.hora = noite ? 0.96 : 0.42;
      e.definirClima?.('limpo');
    },
    { noite: !!t.noite, toque: t.toque },
  );
  await page.waitForTimeout(2500);
}

/** Espera a fileira assentar (prazo longo, ver `rolarDevagar`). */
const esperarAssentar = (page: Page) =>
  page.waitForFunction(
    () => document.querySelector<HTMLElement>('[data-roleta].aberta')?.dataset.parada !== undefined,
    undefined,
    { timeout: 90_000 },
  );
const aberta = (page: Page) => page.evaluate(() => !!document.querySelector('[data-roleta].aberta'));
const fecharRoleta = async (page: Page) => {
  if (await aberta(page)) await page.evaluate(() => window.dispatchEvent(new Event('brumaluz:gestos')));
  await page.waitForFunction(() => !document.querySelector('[data-roleta].aberta'));
  await page.waitForTimeout(400);
};
/** Abre a roleta de Gestos (de novo, se fechou). */
const abrirGestos = async (page: Page) => {
  if (!(await aberta(page))) await page.evaluate(() => window.dispatchEvent(new Event('brumaluz:gestos')));
  await page.waitForSelector('[data-roleta].aberta');
  await esperarAssentar(page);
};
/**
 * Rola até `id` ficar no meio, pelas setas do teclado. Não pelo toque, como `rolarAte` de
 * roleta-palco: na tela de 2× do SwiftShader, com outro teste rodando junto, um quadro passa de
 * segundos, o toque chega à roleta com mais de 600 ms entre encostar e soltar e vira um arraste
 * parado (a fileira não anda). Aqui só se tiram fotos; o toque é conferido nos testes da roleta.
 */
async function rolarDevagar(page: Page, id: string) {
  const meio = () =>
    page.evaluate(() => document.querySelector<HTMLElement>('[data-roleta].aberta')?.dataset.meio ?? '');
  const assentar = () => esperarAssentar(page);
  const itens = await page.evaluate(() =>
    (document.querySelector<HTMLElement>('[data-roleta].aberta')?.dataset.itens ?? '').split(' '),
  );
  const n = itens.length;
  const i = itens.indexOf(id);
  if (i < 0) throw new Error(`a roleta não tem "${id}" (tem: ${itens.join(', ')})`);
  for (let volta = 0; volta <= n; volta++) {
    await assentar();
    const m = itens.indexOf(await meio());
    if (m === i) return;
    const d = (((i - m) % n) + n) % n;
    const lado = d <= n / 2 ? 1 : -1;
    const vizinho = itens[(((m + lado) % n) + n) % n];
    await page.keyboard.press(lado > 0 ? 'ArrowRight' : 'ArrowLeft');
    await page.waitForFunction(
      (v) => document.querySelector<HTMLElement>('[data-roleta].aberta')?.dataset.meio === v,
      vizinho,
      { timeout: 90_000 },
    );
  }
  throw new Error(`não chegou em "${id}"`);
}
/** O nível da criança (os presentes de nível entram na roleta; do 6 em diante, o balão tem estrelinha). */
const nivel = (page: Page, n: number) =>
  page.evaluate((n) => window.dispatchEvent(new CustomEvent('brumaluz:almaNivel', { detail: { nivel: n } })), n);

for (const t of TELAS)
  test(`gestos no jogo: ${t.nome}`, async ({ browser }) => {
    // no SwiftShader, com outros testes rodando junto, a 0 a 1 quadro por segundo
    test.setTimeout(t.todos ? 1_800_000 : 1_200_000);
    mkdirSync(PASTA, { recursive: true });
    const ctx = await contexto(browser, t);
    const page = await ctx.newPage();
    await entrar(page, t);
    // o balão de sempre (nível 1)
    await page.evaluate(() => window.__brumaluz!.gestos!.fazer('acenar'));
    await page.waitForTimeout(700);
    await page.screenshot({ path: `${PASTA}/balao-${t.nome}.png` });
    // todos os 11 (o roqueiro é da Vila) e o balão de estrelinha (nível 8)
    await nivel(page, 8);
    await page.waitForTimeout(1600);
    await page.evaluate(() => window.__brumaluz!.gestos!.fazer('reverencia'));
    await page.waitForTimeout(700);
    await page.screenshot({ path: `${PASTA}/balao-estrela-${t.nome}.png` });
    await page.waitForTimeout(2500);
    // o menu com a carinha de Gestos no meio
    await page.evaluate(() => window.dispatchEvent(new Event('brumaluz:gestos')));
    await page.waitForSelector('[data-roleta].aberta');
    await esperarAssentar(page);
    await page.locator('[data-roleta].aberta .voltar').first().click({ force: true });
    await page.waitForFunction(
      () => document.querySelector<HTMLElement>('[data-roleta].aberta')?.dataset.itens?.includes('mapa'),
    );
    await esperarAssentar(page);
    await rolarDevagar(page, 'gestos');
    await page.screenshot({ path: `${PASTA}/menu-${t.nome}.png` });
    // a roleta de Gestos (com "Voltar" e a carinha em cima)
    await fecharRoleta(page);
    await abrirGestos(page);
    await page.screenshot({ path: `${PASTA}/roleta-${t.nome}.png` });
    await abrirGestos(page);
    await rolarDevagar(page, 'comemorar');
    await page.screenshot({ path: `${PASTA}/roleta-${t.nome}-comemorar.png` });
    if (t.todos) {
      // cada gesto no meio (só a bandeja da roleta)
      const ids = await page.evaluate(() =>
        (document.querySelector<HTMLElement>('[data-roleta].aberta')?.dataset.itens ?? '').split(' '),
      );
      for (const id of ids) {
        await abrirGestos(page);
        await rolarDevagar(page, id);
        const caixa = await page.locator('[data-roleta].aberta .bandeja').boundingBox();
        await page.screenshot({
          path: `${PASTA}/roleta-${t.nome}-${id}.png`,
          clip: { x: 0, y: caixa!.y - 70, width: t.viewport.width, height: caixa!.height + 70 },
        });
      }
    }
    await ctx.close();
  });

test('carinhas dos amigos: o aceno de quem chama e o botão Chamar', async ({ browser }) => {
  test.setTimeout(1_200_000);
  mkdirSync(PASTA, { recursive: true });
  // só no celular em pé (é onde o aceno e o botão ficam menores)
  for (const t of [TELAS[0]]) {
    const ctx = await contexto(browser, t);
    const page = await ctx.newPage();
    // na Vila (o mundo de sempre), na praça da entrada; os amigos de mentirinha seguem na tela
    // (o quadro do núcleo local não traz ninguém), como no palco do achar-amigo
    await entrar(page, t);
    await page.evaluate(() => {
      const w = window as unknown as { __amigosPostos?: unknown[] };
      setInterval(() => {
        if (w.__amigosPostos?.length) window.__brumaluz!.amigosDeTeste!(w.__amigosPostos as never);
      }, 300);
    });
    const [x, , z] = await page.evaluate(() => window.__brumaluz!.posicao!);
    const b = await irPara(page, [x, z], 0.6);
    await page.waitForTimeout(2500);
    // a Lia longe, do lado: a carinha presa na borda, chamando (com o aceno em cima)
    await porAmigos(page, b, [['lia', -1.6, 40]]);
    await page.waitForTimeout(2500);
    // o chamado dura 6 s, e a 1 quadro por segundo a foto passa disso: ele se repete a cada 2 s
    await page.evaluate(() => {
      window.__brumaluz!.acharAmigo!.chamado('lia');
      setInterval(() => window.__brumaluz!.acharAmigo!.chamado('lia'), 2000);
    });
    await page.waitForSelector('.carinha-amigo.chamando .mao', { state: 'visible', timeout: 20_000 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${PASTA}/carinhas-${t.nome}.png` });
    // de perto: a carinha chamando e o botão Chamar
    const c = await page.locator('.carinha-amigo.chamando').boundingBox();
    if (c)
      await page.screenshot({
        path: `${PASTA}/carinhas-${t.nome}-perto.png`,
        clip: {
          x: Math.max(0, c.x - 30),
          y: Math.max(0, c.y - 40),
          width: Math.min(160, t.viewport.width - Math.max(0, c.x - 30)),
          height: 160,
        },
      });
    const bc = await page.locator('.botao-chamar').boundingBox();
    if (bc)
      await page.screenshot({
        path: `${PASTA}/chamar-${t.nome}-perto.png`,
        clip: { x: Math.max(0, bc.x - 20), y: Math.max(0, bc.y - 20), width: bc.width + 40, height: bc.height + 40 },
      });
    await ctx.close();
  }
});
