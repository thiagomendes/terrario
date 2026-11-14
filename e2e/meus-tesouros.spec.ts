import { expect, test, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';

/**
 * "Meus tesouros" (023, depois de publicada), nos três tamanhos: o editor de personagem mostra
 * o que a criança veste da lojinha (a prévia e as miniaturas) e mexer no cabelo, na cor ou no
 * modelo nunca tira o tesouro do boneco do jogo; a prateleira da aba Fantasias lista só o que
 * ela comprou, um toque veste e outro tira (o boneco do jogo, que vai aos amigos, acompanha);
 * a capa e o dragão trocam às claras; sem nada comprado, o bauzinho e a vitrine abrem a
 * lojinha. A tela de jogo não ganha botão novo. Capturas em TESOUROS_PASTA.
 */
declare const process: { env: Record<string, string | undefined> };
const PASTA = process.env.TESOUROS_PASTA ?? 'test-results/tesouros';

const TAMANHOS = [
  { nome: 'pc', w: 1280, h: 720, toque: false },
  { nome: 'deitado', w: 844, h: 390, toque: true },
  { nome: 'empe', w: 390, h: 844, toque: true },
] as const;

type Perfil = {
  aplicarGanho(g: unknown): unknown;
  comprarPremium(id: string): unknown;
  vestirPremium(id: string, v: boolean): boolean;
  perfil: { moedas: number; premium: string[]; vestidos: Record<string, string> };
};
const perfil = (page: Page) =>
  page.evaluate(() => (window as unknown as { __almaCrianca: Perfil }).__almaCrianca.perfil);
const premiumNoJogo = (page: Page) =>
  page.evaluate(() => window.__brumaluz!.personagem!.aparencia().premium ?? {});

/** Os botões e caixas da tela de jogo (para conferir que nada novo apareceu). */
const telaDeJogo = (page: Page) =>
  page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>('body *')]
      .filter((el) => {
        if (el.closest('.entrada, .toast-area, canvas')) return false;
        const cs = getComputedStyle(el);
        if (cs.position !== 'fixed' && cs.position !== 'absolute') return false;
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none';
      })
      .filter((el) => el.matches('button, [role=button]'))
      .map((el) => el.getAttribute('aria-label') ?? el.className)
      .sort(),
  );

for (const t of TAMANHOS) {
  test.describe(t.nome, () => {
    test.use({
      viewport: { width: t.w, height: t.h },
      hasTouch: t.toque,
      isMobile: t.toque,
      deviceScaleFactor: t.toque ? 2 : 1,
    });
    test(`meus tesouros (${t.nome})`, async ({ page }) => {
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
      const semRolagemLateral = async () => {
        const m = await page.evaluate(() => ({
          l: document.documentElement.scrollWidth,
          j: innerWidth,
        }));
        expect(m.l).toBeLessThanOrEqual(m.j);
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
      await page.waitForTimeout(1500);
      const jogoAntes = await telaDeJogo(page);
      await page.screenshot({ path: `${PASTA}/jogo-antes-${t.nome}.png` });

      const abrirEditor = async () => {
        await page.keyboard.press('KeyC');
        await expect(page.locator('[data-painel-personagem]')).toBeVisible();
      };
      const fecharEditor = async () => {
        await tocar('[data-jogar]');
        await expect(page.locator('.entrada')).toBeHidden();
      };

      // ---------------------------------------------------------------- nada comprado
      await abrirEditor();
      // a menina das capturas
      await tocar('[data-aba="corpo"]');
      await tocar('button[data-campo="corpo"][data-valor="feminino"]');
      await tocar('[data-aba="fantasias"]');
      const prateleira = page.locator('[data-tesouros]');
      await expect(prateleira).toBeVisible();
      await expect(prateleira).toHaveAttribute('data-vazio', 'true');
      await expect(page.locator('[data-tesouros-vazio]')).toBeVisible();
      await expect(page.locator('button[data-tesouro]')).toHaveCount(0);
      await semRolagemLateral();
      await foto('vazio');
      await foto('vazio-prateleira', '[data-tesouros]');
      // a vitrine abre a lojinha (o editor sai da frente)
      await tocar('[data-tesouros-lojinha]');
      await expect
        .poll(() =>
          page.evaluate(() =>
            (
              window as unknown as { __almaUi: { loja: { estado(): string } } }
            ).__almaUi.loja.estado(),
          ),
        )
        .toBe('vitrine');
      await expect(page.locator('.entrada')).toBeHidden();
      await page.evaluate(() =>
        (window as unknown as { __almaUi: { loja: { fechar(): void } } }).__almaUi.loja.fechar(),
      );

      // ---------------------------------------------------------------- comprou na lojinha
      await page.evaluate(() => {
        const p = (window as unknown as { __almaCrianca: Perfil }).__almaCrianca;
        p.aplicarGanho({ moedas: 200, xp: 0, pontos: {} });
        for (const id of ['camiseta-aquario', 'capa-estrelas', 'dragao', 'pinguim'])
          p.comprarPremium(id);
        // o dragão tirou a capa (as costas são uma só); o pinguim fica guardado
        p.vestirPremium('capa-estrelas', true);
        p.vestirPremium('pinguim', false);
      });
      await expect
        .poll(() => premiumNoJogo(page))
        .toEqual({ roupa: 'camiseta-aquario', costas: 'capa-estrelas' });

      // o editor mostra o que ela veste (a prévia e as miniaturas com a camiseta e a capa)
      await abrirEditor();
      await tocar('[data-aba="cabelo"]');
      const previaTem = () =>
        page.evaluate(() => {
          const c = document.querySelector<HTMLCanvasElement>('[data-previa-personagem]')!;
          const d = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data;
          let n = 0;
          for (let i = 3; i < d.length; i += 16) if (d[i] > 0) n++;
          return n;
        });
      await expect.poll(previaTem, { timeout: 20_000 }).toBeGreaterThan(100);
      await foto('editor-com-tesouro');

      // mexer no cabelo, na cor da roupa e no modelo nunca tira o tesouro do boneco do jogo
      await tocar('button[data-campo="cabeloEstilo"][data-valor="5"]');
      await tocar('button[data-campo="cabeloCor"][data-valor="1"]');
      expect(await premiumNoJogo(page)).toEqual({
        roupa: 'camiseta-aquario',
        costas: 'capa-estrelas',
      });
      await tocar('[data-aba="roupa"]');
      await tocar('button[data-campo="roupaCor"][data-valor="3"]');
      expect(await premiumNoJogo(page)).toEqual({
        roupa: 'camiseta-aquario',
        costas: 'capa-estrelas',
      });
      await tocar('[data-aba="corpo"]');
      await tocar('button[data-campo="modelo"]:not([aria-pressed="true"])');
      await tocar('button[data-campo="corpo"][data-valor="feminino"]');
      await tocar('[data-sortear]');
      await tocar('button[data-campo="corpo"][data-valor="feminino"]');
      await tocar('[data-aba="cabelo"]');
      await tocar('button[data-campo="cabeloEstilo"][data-valor="5"]');
      expect(await premiumNoJogo(page)).toEqual({
        roupa: 'camiseta-aquario',
        costas: 'capa-estrelas',
      });
      // o editor nunca guarda o tesouro na aparência dele (o perfil é quem sabe)
      expect(
        await page.evaluate(
          () => JSON.parse(localStorage.getItem('terrario:aparencia') ?? '{}').aparencia?.premium,
        ),
      ).toBeUndefined();

      // ---------------------------------------------------------------- a prateleira
      await tocar('[data-aba="fantasias"]');
      await expect(prateleira).toHaveAttribute('data-vazio', 'false');
      await expect(page.locator('button[data-tesouro]')).toHaveCount(4);
      await expect(page.locator('[data-tesouros-vazio]')).toBeHidden();
      const carta = (id: string) => page.locator(`button[data-tesouro="${id}"]`);
      await expect(carta('camiseta-aquario')).toHaveAttribute('aria-pressed', 'true');
      await expect(carta('capa-estrelas')).toHaveAttribute('aria-pressed', 'true');
      await expect(carta('dragao')).toHaveAttribute('aria-pressed', 'false');
      await expect(carta('pinguim')).toHaveAttribute('aria-pressed', 'false');
      // nenhuma palavra da loja nem inglês na prateleira
      const textos = await prateleira.evaluate((el) =>
        [
          el.textContent ?? '',
          ...[...el.querySelectorAll('*')].flatMap((x) => [
            x.getAttribute('aria-label') ?? '',
            x.getAttribute('title') ?? '',
          ]),
        ].join(' '),
      );
      expect(textos).toContain('Meus tesouros');
      expect(textos.toLowerCase()).not.toContain('premium');
      // dedinho: cada cartão com pelo menos 64 px
      for (const id of ['camiseta-aquario', 'pinguim']) {
        const c = await carta(id).boundingBox();
        expect(c!.width).toBeGreaterThanOrEqual(64);
        expect(c!.height).toBeGreaterThanOrEqual(64);
      }
      // a prateleira cabe no editor, sem rolar para o lado e sem tomar o painel
      const caixas = await page.evaluate(() => {
        const r = (s: string) => document.querySelector(s)!.getBoundingClientRect();
        return { p: r('[data-tesouros]'), painel: r('[data-painel-personagem]') };
      });
      expect(caixas.p.right).toBeLessThanOrEqual(caixas.painel.right + 1);
      expect(caixas.p.left).toBeGreaterThanOrEqual(caixas.painel.left - 1);
      expect(caixas.p.height).toBeLessThanOrEqual(Math.max(150, t.h * 0.36));
      await semRolagemLateral();
      await page.locator('[data-tesouros]').scrollIntoViewIfNeeded();
      await foto('prateleira');
      await foto('prateleira-perto', '[data-tesouros]');

      // vestir o dragão: a capa sai, às claras (o que sai → o que entra)
      await tocar('button[data-tesouro="dragao"]');
      await expect(page.locator('[data-tesouro-troca="capa-estrelas"]')).toBeVisible();
      await expect(carta('dragao')).toHaveAttribute('aria-pressed', 'true');
      await expect(carta('capa-estrelas')).toHaveAttribute('aria-pressed', 'false');
      expect((await perfil(page)).vestidos).toEqual({
        roupa: 'camiseta-aquario',
        fantasia: 'dragao',
      });
      // o boneco do jogo veste na hora (é ele que vai aos amigos, como na lojinha)
      await expect
        .poll(() => premiumNoJogo(page))
        .toEqual({ roupa: 'camiseta-aquario', fantasia: 'dragao' });
      await page.waitForTimeout(300);
      await foto('vestiu-dragao');
      await foto('vestiu-dragao-perto', '[data-tesouros]');

      // o pinguim também (bicho: nada sai)
      await tocar('button[data-tesouro="pinguim"]');
      await expect(carta('pinguim')).toHaveAttribute('aria-pressed', 'true');
      await expect(page.locator('[data-tesouro-troca]')).toBeHidden();

      // tocar de novo tira
      await tocar('button[data-tesouro="camiseta-aquario"]');
      await expect(carta('camiseta-aquario')).toHaveAttribute('aria-pressed', 'false');
      await expect
        .poll(() => premiumNoJogo(page))
        .toEqual({ fantasia: 'dragao', bicho: 'pinguim' });
      await foto('tirou-camiseta');

      // fechar e abrir de novo: tudo como ficou
      await fecharEditor();
      await expect
        .poll(() => premiumNoJogo(page))
        .toEqual({ fantasia: 'dragao', bicho: 'pinguim' });
      // a tela de jogo não ganhou botão novo
      expect(await telaDeJogo(page)).toEqual(jogoAntes);
      await page.screenshot({ path: `${PASTA}/jogo-depois-${t.nome}.png` });
      await abrirEditor();
      await expect(carta('dragao')).toHaveAttribute('aria-pressed', 'true');
      await expect(carta('camiseta-aquario')).toHaveAttribute('aria-pressed', 'false');
      expect(erros).toEqual([]);
    });
  });
}
