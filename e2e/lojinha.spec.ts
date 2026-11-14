import { expect, test, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';

/**
 * Spec 023 (T14): a lojinha premium de ponta a ponta, nos três tamanhos (computador, celular
 * deitado e em pé, os dois no toque): a roda do menu abre a vitrine; as figuras são o 3D de
 * verdade; falta moedinha mostra o potinho e o brincar (sem pressa); o provador veste só na
 * tela e gira a câmera; confirmar com ✗ e ✓; a festa premium na fila; ao fechar, vestido; o
 * cartão vira "é meu" e "vestindo"; vestir e tirar; a capa e o dragão trocam às claras;
 * reabrir o jogo mantém tudo. Capturas em LOJA_PASTA (padrão capturas-023d); com LOJA_VIDEO=1
 * grava o vídeo do computador (para o relatório).
 */
declare const process: { env: Record<string, string | undefined> };
const PASTA = process.env.LOJA_PASTA ?? 'capturas-023d';
const SO = process.env.LOJA_SO;
const VIDEO = !!process.env.LOJA_VIDEO;

const TAMANHOS = [
  { nome: 'pc', w: 1280, h: 720, toque: false },
  { nome: 'deitado', w: 844, h: 390, toque: true },
  { nome: 'empe', w: 390, h: 844, toque: true },
] as const;

type Perfil = {
  aplicarGanho(g: unknown): unknown;
  perfil: { moedas: number; premium: string[]; vestidos: Record<string, string> };
};

async function entrar(page: Page) {
  await page.addInitScript(() => {
    HTMLElement.prototype.requestPointerLock = function () {
      return Promise.resolve();
    } as typeof HTMLElement.prototype.requestPointerLock;
    try {
      localStorage.setItem(
        'terrario:config',
        JSON.stringify({ distancia: 4, mostrarFps: false, mostrarAtalhos: false }),
      );
    } catch {
      // sem armazenamento
    }
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
    // a menina da captura (o boneco de verdade nas figuras da lojinha)
    e.personagem!.definir({ corpo: 'feminino', cabeloEstilo: 5, cabeloCor: 1, pele: 1, rosto: 1 } as never);
  });
  await page.addStyleTag({ content: '.toast-area { display: none !important; }' });
  await page.waitForTimeout(1500);
}

const perfil = (page: Page) =>
  page.evaluate(() => (window as unknown as { __almaCrianca: Perfil }).__almaCrianca.perfil);

async function ganhar(page: Page, moedas: number) {
  await page.evaluate((moedas) => {
    (window as unknown as { __almaCrianca: Perfil }).__almaCrianca.aplicarGanho({
      moedas,
      xp: 0,
      pontos: {},
    });
  }, moedas);
  await page.waitForTimeout(400);
}

/** As figuras da vitrine são fotos do 3D de verdade (canvas com pixels, não desenho vazio). */
async function figurasProntas(page: Page, sel: string) {
  await expect
    .poll(
      () =>
        page.evaluate((sel) => {
          const cvs = [...document.querySelectorAll<HTMLCanvasElement>(`${sel} canvas`)];
          if (!cvs.length) return 0;
          return cvs.filter((cv) => {
            const c = cv.getContext('2d');
            if (!c || !cv.width) return false;
            const d = c.getImageData(0, 0, cv.width, cv.height).data;
            let n = 0;
            for (let i = 3; i < d.length; i += 16) if (d[i] > 0) n++;
            return n > 50;
          }).length / cvs.length;
        }, sel),
      { timeout: 20_000 },
    )
    .toBe(1);
}

if (VIDEO) test.use({ video: { mode: 'on', size: { width: 1280, height: 720 } } });

for (const t of TAMANHOS) {
  test.describe(t.nome, () => {
    test.use({
      viewport: { width: t.w, height: t.h },
      hasTouch: t.toque,
      isMobile: t.toque,
      deviceScaleFactor: t.toque ? 2 : 1,
    });
    test(`lojinha premium (${t.nome})`, async ({ page }) => {
      test.skip(!!SO && SO !== t.nome);
      test.setTimeout(600_000);
      mkdirSync(PASTA, { recursive: true });
      const erros: string[] = [];
      page.on('pageerror', (e) => erros.push(`pageerror: ${e.message}`));
      const tocar = async (sel: string) => {
        const l = page.locator(sel).first();
        await l.waitFor({ state: 'visible', timeout: 10_000 });
        if (t.toque) await l.tap({ timeout: 10_000 });
        else await l.click({ timeout: 10_000 });
      };
      const foto = (nome: string) => page.screenshot({ path: `${PASTA}/${nome}-${t.nome}.png` });
      await entrar(page);
      await ganhar(page, 70);

      // a roda do menu tem a lojinha e abre a vitrine
      await tocar('[data-botao-roda]');
      await page.waitForTimeout(450);
      await tocar('.roda.aberta button.ativo[data-item="lojinha"]');
      await expect(page.locator('[data-alma-loja]')).toBeVisible();
      await expect(page.locator('.alma-lcard')).toHaveCount(6);
      await figurasProntas(page, '.alma-lcard');
      await page.waitForTimeout(900);
      // nada de relógio, contagem ou "só restam": só números de preço e da carteira
      const textos = await page.locator('[data-alma-loja]').innerText();
      expect(textos.replace(/\s+/g, ' ').trim()).toMatch(/^[\d ]+$/);
      // tudo dentro da tela, sem rolar (os seis cartões à vista)
      const caixas = await page.locator('.alma-lcard').evaluateAll((bs) =>
        bs.map((b) => {
          const r = b.getBoundingClientRect();
          return [r.left, r.top, r.right, r.bottom];
        }),
      );
      for (const [l, tp, r, b] of caixas) {
        expect(l).toBeGreaterThanOrEqual(0);
        expect(tp).toBeGreaterThanOrEqual(0);
        expect(r).toBeLessThanOrEqual(t.w);
        expect(b).toBeLessThanOrEqual(t.h);
      }
      await foto('loja-1-vitrine');

      // o unicórnio (80) ainda não dá: o potinho e o brincar, sem pressa
      await tocar('.alma-lcard[data-premium="unicornio"]');
      await expect(page.locator('[data-alma-detalhe] [data-alma-falta]')).toBeVisible();
      await expect(page.locator('[data-alma-detalhe] [data-alma-comprar]')).toHaveCount(0);
      await figurasProntas(page, '[data-alma-detalhe]');
      await page.waitForTimeout(500);
      await foto('loja-2-falta-unicornio');
      // experimentar mesmo assim: o unicórnio aparece ao lado e a câmera gira
      await tocar('[data-alma-detalhe] [data-alma-experimentar]');
      await expect(page.locator('[data-alma-provador]')).toBeVisible();
      await expect(page.locator('[data-alma-loja]')).toHaveCount(0);
      await page.waitForTimeout(2600);
      const b = await page.evaluate(() => window.__brumaluz!.personagem!.bichoPremium?.());
      expect(b?.id).toBe('unicornio');
      // só na tela da criança: a aparência de verdade (a que vai pela rede) não mudou
      const ap = await page.evaluate(() => window.__brumaluz!.personagem!.aparencia().premium);
      expect(ap?.bicho).toBeUndefined();
      await foto('loja-3-provador-unicornio');
      await page.waitForTimeout(2200);
      await foto('loja-3b-provador-unicornio');
      await tocar('[data-alma-provador-voltar]');
      await expect(page.locator('[data-alma-detalhe] .caixa[data-premium="unicornio"]')).toBeVisible();
      expect(await page.evaluate(() => window.__brumaluz!.personagem!.bichoPremium?.() ?? null)).toBe(null);
      expect(await page.evaluate(() => window.__brumaluz!.modoFoto!.ativo())).toBe(false);
      await tocar('[data-alma-detalhe] .caixa > [data-alma-fechar]');

      // o dragãozinho (55) dá: detalhe, provador, comprar, confirmar, festa, vestido
      await tocar('.alma-lcard[data-premium="dragao"]');
      await expect(page.locator('[data-alma-detalhe] [data-alma-comprar]')).toBeVisible();
      await figurasProntas(page, '[data-alma-detalhe]');
      await page.waitForTimeout(500);
      await foto('loja-4-detalhe-dragao');
      await tocar('[data-alma-detalhe] [data-alma-experimentar]');
      await page.waitForTimeout(1800);
      // a barra do provador cabe na tela (o comprar não sai pela borda)
      const barra = await page.locator('[data-alma-provador]').boundingBox();
      expect(barra!.x).toBeGreaterThanOrEqual(0);
      expect(barra!.x + barra!.width).toBeLessThanOrEqual(t.w);
      await foto('loja-5-provador-dragao');
      await page.waitForTimeout(2500);
      await foto('loja-5b-provador-dragao');
      await tocar('[data-alma-provador-comprar]');
      await expect(page.locator('[data-alma-confirmar="dragao"]')).toBeVisible();
      await page.waitForTimeout(500);
      await foto('loja-6-confirmar');
      // ✗ volta sem gastar
      await tocar('[data-alma-confirmar] [data-alma-nao]');
      expect((await perfil(page)).moedas).toBe(70);
      await tocar('[data-alma-detalhe] [data-alma-comprar]');
      const t0 = Date.now();
      await tocar('[data-alma-confirmar] [data-alma-sim]');
      await expect(page.locator('[data-alma-festa="premium"]')).toBeVisible({ timeout: 4000 });
      await page.locator('[data-alma-festa] [data-alma-oba]').waitFor({ timeout: 4000 });
      // os botões da festa em até 1,5 s (mais o voo das moedinhas do confirmar)
      expect(Date.now() - t0).toBeLessThan(3400);
      await page.waitForTimeout(500);
      await foto('loja-7-festa');
      const p1 = await perfil(page);
      expect(p1.moedas).toBe(15);
      expect(p1.premium).toContain('dragao');
      expect(p1.vestidos.fantasia).toBe('dragao');
      await tocar('[data-alma-festa] [data-alma-oba]');
      await expect(page.locator('[data-alma-festa]')).toHaveCount(0, { timeout: 4000 });
      await page.waitForTimeout(700);
      expect(
        await page.evaluate(() => window.__brumaluz!.personagem!.aparencia().premium?.fantasia),
      ).toBe('dragao');
      await foto('loja-8-vestido');

      // reabre: o dragão é meu e estou vestindo; a capa (30) ainda não dá com 15
      await tocar('[data-botao-roda]');
      await page.waitForTimeout(450);
      await tocar('.roda.aberta button.ativo[data-item="lojinha"]');
      await expect(page.locator('.alma-lcard[data-premium="dragao"][data-meu]')).toBeVisible();
      await expect(page.locator('.alma-lcard[data-premium="dragao"] [data-alma-no-boneco]')).toBeVisible();
      await figurasProntas(page, '.alma-lcard');
      await page.waitForTimeout(600);
      await foto('loja-9-vitrine-depois');
      await tocar('[data-alma-fechar]');
      // ganha mais e compra a capa: as asas e a capa dividem as costas, às claras
      await ganhar(page, 40);
      await tocar('[data-botao-roda]');
      await page.waitForTimeout(450);
      await tocar('.roda.aberta button.ativo[data-item="lojinha"]');
      await tocar('.alma-lcard[data-premium="capa-estrelas"]');
      await expect(page.locator('[data-alma-detalhe] [data-alma-troca="dragao"]')).toBeVisible();
      await figurasProntas(page, '[data-alma-detalhe]');
      await page.waitForTimeout(500);
      await foto('loja-10-troca-capa');
      await tocar('[data-alma-detalhe] [data-alma-comprar]');
      await tocar('[data-alma-confirmar] [data-alma-sim]');
      await page.locator('[data-alma-festa] [data-alma-oba]').waitFor({ timeout: 6000 });
      await tocar('[data-alma-festa] [data-alma-oba]');
      await expect(page.locator('[data-alma-festa]')).toHaveCount(0, { timeout: 4000 });
      const p2 = await perfil(page);
      expect(p2.vestidos).toEqual({ costas: 'capa-estrelas' });
      // vestir o dragão de novo pelo cartão (tira a capa); depois tirar
      await tocar('[data-botao-roda]');
      await page.waitForTimeout(450);
      await tocar('.roda.aberta button.ativo[data-item="lojinha"]');
      await tocar('.alma-lcard[data-premium="dragao"]');
      await expect(page.locator('[data-alma-detalhe] [data-alma-troca="capa-estrelas"]')).toBeVisible();
      await tocar('[data-alma-detalhe] [data-alma-vestir-premium]');
      expect((await perfil(page)).vestidos).toEqual({ fantasia: 'dragao' });
      await expect(page.locator('.alma-lcard[data-premium="dragao"].vestido')).toBeVisible();
      await tocar('[data-alma-detalhe] [data-alma-vestir-premium]');
      expect((await perfil(page)).vestidos).toEqual({});
      await page.keyboard.press('Escape');
      await expect(page.locator('[data-alma-loja]')).toHaveCount(0);
      expect(await page.evaluate(() => document.body.dataset.overlay ?? null)).toBe(null);

      // reabrir o jogo mantém o que comprou
      if (t.nome === 'pc') {
        await page.evaluate(() =>
          (window as unknown as { __almaCrianca: { vestirPremium(i: string, v: boolean): void } }).__almaCrianca.vestirPremium('capa-estrelas', true),
        );
        await page.reload();
        await page.waitForFunction(() => window.__brumaluz?.ready === true, undefined, {
          timeout: 180_000,
        });
        const p3 = await perfil(page);
        expect(p3.premium.sort()).toEqual(['capa-estrelas', 'dragao']);
        expect(p3.vestidos).toEqual({ costas: 'capa-estrelas' });
        await expect
          .poll(() =>
            page.evaluate(() => window.__brumaluz!.personagem!.aparencia().premium?.costas),
          )
          .toBe('capa-estrelas');
      }
      expect(erros, erros.join('\n')).toEqual([]);
      if (VIDEO && t.nome === 'pc') {
        const v = page.video();
        await page.close();
        await v?.saveAs(`${PASTA}/video-lojinha-pc.webm`);
      }
    });
  });
}
