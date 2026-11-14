import { expect, test, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';

/**
 * Fantasia e tesouro nunca se desenham um por cima do outro (023, achado do dono no iPhone):
 * a última escolha ganha e o que sai continua guardado em "Meus tesouros".
 *
 * - Vestindo a camiseta aquário, escolher o astronauta tira a camiseta (o bichinho fica).
 * - Vestir a camiseta por cima do astronauta tira a fantasia.
 * - A capa de estrelas por cima do herói tira só a capa do herói; escolher a capa do herói de
 *   novo tira a capa de estrelas.
 * - O que veio da lojinha (fora do editor) também tira a fantasia do boneco do jogo.
 * - Recarregar a página: tudo como ficou.
 * - O cartão da prateleira: o selo e o boneco cabem dentro do cartão, nos três tamanhos.
 *
 * ANTES=1 só tira as fotos (para comparar com o código de antes). Fotos em TESOUROS_PASTA.
 */
declare const process: { env: Record<string, string | undefined> };
const PASTA = process.env.TESOUROS_PASTA ?? 'test-results/tesouro-fantasia';
const CONFERIR = !process.env.ANTES;

const TAMANHOS = [
  { nome: 'empe', w: 390, h: 844, toque: true },
  { nome: 'deitado', w: 844, h: 390, toque: true },
  { nome: 'pc', w: 1280, h: 720, toque: false },
] as const;

type Perfil = {
  aplicarGanho(g: unknown): unknown;
  comprarPremium(id: string): unknown;
  vestirPremium(id: string, v: boolean): boolean;
  perfil: { premium: string[]; vestidos: Record<string, string> };
};
const vestidos = (page: Page) =>
  page.evaluate(
    () => (window as unknown as { __almaCrianca: Perfil }).__almaCrianca.perfil.vestidos,
  );
const noJogo = (page: Page) =>
  page.evaluate(() => {
    const a = window.__brumaluz!.personagem!.aparencia();
    return {
      fantasia: a.fantasia?.id ?? null,
      sem: a.fantasia?.sem ?? [],
      premium: a.premium ?? {},
    };
  });
const guardada = (page: Page) =>
  page.evaluate(() => {
    const a = JSON.parse(localStorage.getItem('terrario:aparencia') ?? '{}').aparencia ?? {};
    return { fantasia: a.fantasia?.id ?? null, sem: a.fantasia?.sem ?? [] };
  });

for (const t of TAMANHOS) {
  test.describe(t.nome, () => {
    test.use({
      viewport: { width: t.w, height: t.h },
      hasTouch: t.toque,
      isMobile: t.toque,
      deviceScaleFactor: t.toque ? 2 : 1,
    });
    test(`fantasia e tesouro (${t.nome})`, async ({ page }) => {
      test.setTimeout(420_000);
      mkdirSync(PASTA, { recursive: true });
      const erros: string[] = [];
      page.on('pageerror', (e) => erros.push(`pageerror: ${e.message}`));
      const tocar = async (sel: string) => {
        const l = page.locator(sel).first();
        await l.scrollIntoViewIfNeeded();
        await l.waitFor({ state: 'visible', timeout: 10_000 });
        if (t.toque) await l.tap({ timeout: 10_000 });
        else await l.click({ timeout: 10_000 });
      };
      const foto = async (nome: string, sel?: string) => {
        await page.waitForTimeout(900);
        if (sel)
          await page
            .locator(sel)
            .first()
            .screenshot({ path: `${PASTA}/${nome}-${t.nome}.png` });
        else await page.screenshot({ path: `${PASTA}/${nome}-${t.nome}.png` });
      };
      await page.addInitScript(() => {
        HTMLElement.prototype.requestPointerLock = function () {
          return Promise.resolve();
        } as typeof HTMLElement.prototype.requestPointerLock;
        localStorage.setItem(
          'terrario:config',
          JSON.stringify({ distancia: 4, mostrarFps: false, mostrarAtalhos: false }),
        );
      });
      const abrirJogo = async () => {
        await page.goto('/');
        await page.waitForFunction(() => window.__brumaluz?.ready === true, undefined, {
          timeout: 180_000,
        });
        await page.evaluate(() => {
          document.querySelector('.entrada')?.setAttribute('hidden', '');
          const e = window.__brumaluz!;
          e.pausarDia = true;
          e.hora = 0.42;
          e.definirClima?.('limpo');
        });
        await page.addStyleTag({ content: '.toast-area { display: none !important; }' });
        await page.waitForTimeout(800);
      };
      const abrirEditor = async () => {
        await page.keyboard.press('KeyC');
        await expect(page.locator('[data-painel-personagem]')).toBeVisible();
      };
      const fecharEditor = async () => {
        await tocar('[data-jogar]');
        await expect(page.locator('.entrada')).toBeHidden();
      };
      const carta = (id: string) => page.locator(`button[data-tesouro="${id}"]`);
      const fantasia = (id: string) => `button[data-fantasia="${id}"]`;

      await abrirJogo();
      // comprou a camiseta (veste sozinha) e o pinguim (bicho: nunca briga)
      await page.evaluate(() => {
        const p = (window as unknown as { __almaCrianca: Perfil }).__almaCrianca;
        p.aplicarGanho({ moedas: 300, xp: 0, pontos: {} });
        for (const id of ['camiseta-aquario', 'pinguim', 'capa-estrelas']) p.comprarPremium(id);
        p.vestirPremium('capa-estrelas', false);
      });
      await expect
        .poll(() => vestidos(page))
        .toEqual({ roupa: 'camiseta-aquario', bicho: 'pinguim' });

      await abrirEditor();
      await tocar('[data-aba="fantasias"]');
      await expect(carta('camiseta-aquario')).toHaveAttribute('aria-pressed', 'true');

      // ------------------------------------------------ o cartão da prateleira (bug 2)
      await page.locator('[data-tesouros]').scrollIntoViewIfNeeded();
      await page.waitForTimeout(600);
      const medidas = await page.evaluate(() =>
        [...document.querySelectorAll<HTMLElement>('button[data-tesouro]')].map((b) => {
          const r = b.getBoundingClientRect();
          const selo = b.querySelector('[data-tesouro-vestindo]')!.getBoundingClientRect();
          const cv = b.querySelector('canvas')!;
          const c = cv.getBoundingClientRect();
          // a área desenhada de verdade (object-fit: contain): a altura do boneco na tela
          const esc = Math.min(c.width / cv.width, c.height / cv.height);
          const dw = cv.width * esc;
          const dh = cv.height * esc;
          const ped = b.querySelector('.pedestal-t')!.getBoundingClientRect();
          return {
            id: b.dataset.tesouro,
            caixa: { l: r.left, t: r.top, r: r.right, b: r.bottom },
            selo: { l: selo.left, t: selo.top, r: selo.right, b: selo.bottom, w: selo.width },
            arte: {
              l: c.left + (c.width - dw) / 2,
              t: c.bottom - dh,
              r: c.left + (c.width + dw) / 2,
              b: c.bottom,
            },
            ped: { l: ped.left, t: ped.top, r: ped.right, b: ped.bottom + 4 },
          };
        }),
      );
      await foto('prateleira');
      await foto('prateleira-perto', '[data-tesouros]');
      if (CONFERIR)
        for (const m of medidas) {
          for (const [nome, x] of [
            ['arte', m.arte],
            ['pedestal', m.ped],
          ] as const) {
            expect(x.l, `${m.id} ${nome} esquerda`).toBeGreaterThanOrEqual(m.caixa.l - 0.5);
            expect(x.r, `${m.id} ${nome} direita`).toBeLessThanOrEqual(m.caixa.r + 0.5);
            expect(x.t, `${m.id} ${nome} topo`).toBeGreaterThanOrEqual(m.caixa.t - 0.5);
            expect(x.b, `${m.id} ${nome} baixo`).toBeLessThanOrEqual(m.caixa.b + 0.5);
          }
          if (m.selo.w > 0) {
            expect(m.selo.l, `${m.id} selo`).toBeGreaterThanOrEqual(m.caixa.l);
            expect(m.selo.t, `${m.id} selo`).toBeGreaterThanOrEqual(m.caixa.t);
            expect(m.selo.r, `${m.id} selo`).toBeLessThanOrEqual(m.caixa.r);
          }
        }

      // ------------------------------------------------ com a camiseta, escolhe o astronauta
      await tocar('[data-grupo-fantasia="temas"]');
      await tocar(fantasia('astronauta'));
      await expect.poll(async () => (await noJogo(page)).fantasia).toBe('astronauta');
      if (CONFERIR) {
        await expect(carta('camiseta-aquario')).toHaveAttribute('aria-pressed', 'false');
        await expect(carta('pinguim')).toHaveAttribute('aria-pressed', 'true');
        expect(await vestidos(page)).toEqual({ bicho: 'pinguim' });
        await expect.poll(async () => (await noJogo(page)).premium).toEqual({ bicho: 'pinguim' });
        // continua dela, só guardado
        expect(
          await page.evaluate(
            () => (window as unknown as { __almaCrianca: Perfil }).__almaCrianca.perfil.premium,
          ),
        ).toContain('camiseta-aquario');
      }
      await page.locator('[data-previa-personagem]').scrollIntoViewIfNeeded();
      await foto('astronauta-editor');
      await fecharEditor();
      await foto('astronauta-jogo');
      if (!CONFERIR) return;

      // ------------------------------------------------ a camiseta por cima: o astronauta sai
      await abrirEditor();
      await tocar('[data-aba="fantasias"]');
      await tocar('button[data-tesouro="camiseta-aquario"]');
      await expect(carta('camiseta-aquario')).toHaveAttribute('aria-pressed', 'true');
      await expect.poll(async () => (await noJogo(page)).fantasia).toBeNull();
      expect((await noJogo(page)).premium).toEqual({ roupa: 'camiseta-aquario', bicho: 'pinguim' });
      await expect(page.locator(fantasia('astronauta'))).toHaveAttribute('aria-pressed', 'false');
      expect((await guardada(page)).fantasia).toBeNull();
      await foto('camiseta-por-cima');

      // ------------------------------------------------ capa de estrelas e a capa do herói
      await tocar('[data-grupo-fantasia="herois"]');
      await tocar('[data-cartas="herois"] button[data-fantasia]');
      const heroi = (await noJogo(page)).fantasia;
      expect(heroi).not.toBeNull();
      expect(await vestidos(page)).toEqual({ bicho: 'pinguim' });
      await tocar('button[data-tesouro="capa-estrelas"]');
      await expect(carta('capa-estrelas')).toHaveAttribute('aria-pressed', 'true');
      // o herói fica, sem a capa dele
      await expect.poll(async () => (await noJogo(page)).sem).toContain('capa');
      expect((await noJogo(page)).fantasia).toBe(heroi);
      expect((await guardada(page)).sem).toContain('capa');
      await foto('heroi-com-capa-de-estrelas');
      // pôr a capa do herói de volta tira a capa de estrelas
      await tocar('button[data-peca-fantasia="capa"]');
      await expect(carta('capa-estrelas')).toHaveAttribute('aria-pressed', 'false');
      expect(await vestidos(page)).toEqual({ bicho: 'pinguim' });
      await expect.poll(async () => (await noJogo(page)).sem).not.toContain('capa');

      // ------------------------------------------------ da lojinha, com o editor fechado
      await fecharEditor();
      await page.evaluate(() =>
        (window as unknown as { __almaCrianca: Perfil }).__almaCrianca.vestirPremium(
          'camiseta-aquario',
          true,
        ),
      );
      await expect.poll(async () => (await noJogo(page)).fantasia).toBeNull();
      expect((await noJogo(page)).premium).toEqual({ roupa: 'camiseta-aquario', bicho: 'pinguim' });
      expect((await guardada(page)).fantasia).toBeNull();

      // ------------------------------------------------ recarregar: tudo como ficou
      // (e o guardado de antes da regra, fantasia com tesouro, se arruma: fica a fantasia)
      await page.evaluate(() => {
        const g = JSON.parse(localStorage.getItem('terrario:aparencia')!);
        g.aparencia.fantasia = { id: 'astronauta', cor: 0 };
        localStorage.setItem('terrario:aparencia', JSON.stringify(g));
      });
      await abrirJogo();
      await expect.poll(async () => (await noJogo(page)).fantasia).toBe('astronauta');
      await expect.poll(() => vestidos(page)).toEqual({ bicho: 'pinguim' });
      await expect.poll(async () => (await noJogo(page)).premium).toEqual({ bicho: 'pinguim' });
      await abrirEditor();
      await tocar('[data-aba="fantasias"]');
      await expect(carta('camiseta-aquario')).toHaveAttribute('aria-pressed', 'false');
      await expect(page.locator(fantasia('astronauta'))).toHaveAttribute('aria-pressed', 'true');
      expect(erros).toEqual([]);
    });
  });
}
