import { expect, test, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { escolherNaRoleta } from './roleta-palco';

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

      // a roda do menu tem a lojinha e abre a vitrine (spec 036: na aba de andar, a primeira
      // visita depois da atualização), aberta em até 1 s (os cartões da aba na tela); as figuras
      // do 3D chegam logo depois (medido na página, quadro a quadro, desde o pedido da lojinha)
      await page.evaluate(() => {
        const w = window as unknown as { __tLoja: number; __tPronta: number; __tCartoes: number };
        w.__tLoja = w.__tPronta = w.__tCartoes = 0;
        const pronta = () => {
          if (!w.__tCartoes) {
            const c = document.querySelector('.alma-lcard');
            if (c && c.getBoundingClientRect().height > 0) w.__tCartoes = performance.now();
          }
          const cvs = [...document.querySelectorAll<HTMLCanvasElement>('.alma-lcard canvas')];
          const ok =
            cvs.length > 0 &&
            cvs.every((cv) => {
              const c = cv.getContext('2d');
              if (!c || !cv.width) return false;
              const d = c.getImageData(0, 0, cv.width, cv.height).data;
              let n = 0;
              for (let i = 3; i < d.length; i += 16) if (d[i] > 0) n++;
              return n > 50;
            });
          if (ok) w.__tPronta = performance.now();
          else requestAnimationFrame(pronta);
        };
        window.addEventListener(
          'brumaluz:lojinha',
          () => {
            w.__tLoja = performance.now();
            requestAnimationFrame(pronta);
          },
          { once: true },
        );
      });
      await escolherNaRoleta(page, 'lojinha');
      await expect(page.locator('[data-alma-loja]')).toBeVisible();
      await figurasProntas(page, '.alma-lcard');
      await page.waitForFunction(() => (window as unknown as { __tPronta: number }).__tPronta > 0);
      const [abriuEm, figurasEm] = await page.evaluate(() => {
        const w = window as unknown as { __tLoja: number; __tPronta: number; __tCartoes: number };
        return [w.__tCartoes - w.__tLoja, w.__tPronta - w.__tLoja];
      });
      console.log(
        `vitrine (${t.nome}): aberta em ${abriuEm.toFixed(0)} ms; figuras do 3D prontas em ${figurasEm.toFixed(0)} ms`,
      );
      expect(abriuEm).toBeLessThan(1000);
      expect(figurasEm).toBeLessThan(3000);
      await expect(page.locator('[data-alma-aba="andar"]')).toHaveAttribute('aria-selected', 'true');
      // os novos com a estrelinha (no cartão e na aba)
      await expect(page.locator('.alma-lcard [data-alma-novo]')).toHaveCount(4);
      await expect(page.locator('[data-alma-aba="andar"] [data-alma-novo]')).toHaveCount(1);
      await page.waitForTimeout(900);
      // spec 036: uma aba por lugar do corpo, só desenho; em cada aba, todos os cartões à vista
      // sem rolar (a prateleira não rola, nada sai da tela) e nada de relógio, contagem ou "só
      // restam": só números de preço e da carteira
      const POR_ABA: Record<string, number> = { andar: 4, roupa: 3, costas: 3, mao: 3, chapeu: 1, bicho: 3, fantasia: 1 };
      expect(await page.locator('[data-alma-aba]').evaluateAll((bs) => bs.map((b) => b.textContent?.trim() ?? ''))).toEqual(
        Array(7).fill(''),
      );
      for (const [aba, n] of Object.entries(POR_ABA)) {
        if (aba !== 'andar') await tocar(`[data-alma-aba="${aba}"]`);
        await expect(page.locator(`[data-alma-prateleira][data-aba="${aba}"] .alma-lcard`)).toHaveCount(n);
        await figurasProntas(page, '.alma-lcard');
        const textos = await page.locator('[data-alma-loja]').innerText();
        expect(textos.replace(/\s+/g, ' ').trim()).toMatch(/^[\d ]+$/);
        const caixas = await page.locator('.alma-lcard, [data-alma-aba]').evaluateAll((bs) =>
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
        const rola = await page
          .locator('[data-alma-prateleira]')
          .evaluate((p) => p.scrollHeight - p.clientHeight);
        expect(rola, `a aba ${aba} cabe sem rolar`).toBeLessThanOrEqual(1);
        // os cartões do mesmo tamanho de antes (o toque da criança não encolhe)
        const alturas = await page.locator('.alma-lcard').evaluateAll((bs) => bs.map((b) => b.getBoundingClientRect().height));
        for (const h of alturas) expect(h).toBeGreaterThanOrEqual(170);
        await page.waitForTimeout(600);
        await foto(`loja-1-vitrine-${aba}`);
      }
      // ver o detalhe tira a estrelinha (do cartão; da aba, quando é o último dela)
      await tocar('[data-alma-aba="chapeu"]');
      await expect(page.locator('[data-alma-aba="chapeu"] [data-alma-novo]')).toHaveCount(1);
      await tocar('.alma-lcard[data-premium="bone-helice"]');
      await expect(page.locator('[data-alma-detalhe] .caixa[data-premium="bone-helice"]')).toBeVisible();
      await tocar('[data-alma-detalhe] .caixa > [data-alma-fechar]');
      await expect(page.locator('.alma-lcard[data-premium="bone-helice"] [data-alma-novo]')).toHaveCount(0);
      await expect(page.locator('[data-alma-aba="chapeu"] [data-alma-novo]')).toHaveCount(0);

      // spec 036: o provador do brinquedo de andar, montada (só na tela dela)
      await tocar('[data-alma-aba="andar"]');
      await tocar('.alma-lcard[data-premium="bicicletinha"]');
      await tocar('[data-alma-detalhe] [data-alma-experimentar]');
      await expect(page.locator('[data-alma-provador="bicicletinha"]')).toBeVisible();
      await page.waitForTimeout(2200);
      expect(await page.evaluate(() => window.__brumaluz!.montadoNoDesenho!())).toBe(true);
      expect(await page.evaluate(() => window.__brumaluz!.personagem!.aparencia().montado ?? null)).toBe(null);
      await foto('loja-3m-provador-bicicletinha');
      await tocar('[data-alma-provador-voltar]');
      expect(await page.evaluate(() => window.__brumaluz!.montadoNoDesenho!())).toBe(false);
      await tocar('[data-alma-detalhe] .caixa > [data-alma-fechar]');
      // e o da pipa, voando lá atrás
      await tocar('[data-alma-aba="mao"]');
      await tocar('.alma-lcard[data-premium="pipa-lacinhos"]');
      await figurasProntas(page, '[data-alma-detalhe]');
      await page.waitForTimeout(500);
      await foto('loja-2p-detalhe-pipa');
      await tocar('[data-alma-detalhe] [data-alma-experimentar]');
      await expect(page.locator('[data-alma-provador="pipa-lacinhos"]')).toBeVisible();
      await page.waitForTimeout(2600);
      await foto('loja-3p-provador-pipa');
      await tocar('[data-alma-provador-voltar]');
      await tocar('[data-alma-detalhe] .caixa > [data-alma-fechar]');

      // o unicórnio (80) ainda não dá: o potinho e o brincar, sem pressa
      await tocar('[data-alma-aba="bicho"]');
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
      await tocar('[data-alma-aba="fantasia"]');
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
      // o tempo da festa no relógio da página: do clique no "sim" até o botão da festa entrar
      // na tela. Antes era o relógio do teste, com a espera do toque (o Playwright confere o
      // botão antes de tocar) e a sondagem de visível somadas, e ficava na beira de 3400 ms.
      await page.evaluate(() => {
        const w = window as unknown as { __festa: { ini: number; fim: number } };
        w.__festa = { ini: 0, fim: 0 };
        window.addEventListener(
          'click',
          (ev) => {
            if (!w.__festa.ini && (ev.target as Element | null)?.closest?.('[data-alma-sim]'))
              w.__festa.ini = performance.now();
          },
          { capture: true },
        );
        const vigia = new MutationObserver(() => {
          if (w.__festa.ini && document.querySelector('[data-alma-festa] [data-alma-oba]')) {
            w.__festa.fim = performance.now();
            vigia.disconnect();
          }
        });
        vigia.observe(document.body, { childList: true, subtree: true });
      });
      await tocar('[data-alma-confirmar] [data-alma-sim]');
      await expect(page.locator('[data-alma-festa="premium"]')).toBeVisible({ timeout: 4000 });
      await page.locator('[data-alma-festa] [data-alma-oba]').waitFor({ timeout: 4000 });
      const msFesta = await page.evaluate(() => {
        const w = window as unknown as { __festa: { ini: number; fim: number } };
        return w.__festa.fim - w.__festa.ini;
      });
      console.log(`lojinha: os botões da festa em ${Math.round(msFesta)} ms`);
      // os botões da festa em até 1,5 s (mais o voo das moedinhas do confirmar)
      expect(msFesta).toBeGreaterThan(0);
      expect(msFesta).toBeLessThan(3400);
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

      // reabre (na aba de onde saiu): o dragão é meu e estou vestindo; a capa (30) ainda não dá
      await escolherNaRoleta(page, 'lojinha');
      await expect(page.locator('[data-alma-aba="fantasia"]')).toHaveAttribute('aria-selected', 'true');
      await expect(page.locator('.alma-lcard[data-premium="dragao"][data-meu]')).toBeVisible();
      await expect(page.locator('.alma-lcard[data-premium="dragao"] [data-alma-no-boneco]')).toBeVisible();
      await figurasProntas(page, '.alma-lcard');
      await page.waitForTimeout(600);
      await foto('loja-9-vitrine-depois');
      await tocar('[data-alma-fechar]');
      // ganha mais e compra a capa: as asas e a capa dividem as costas, às claras
      await ganhar(page, 40);
      await escolherNaRoleta(page, 'lojinha');
      await tocar('[data-alma-aba="costas"]');
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
      await escolherNaRoleta(page, 'lojinha');
      await tocar('[data-alma-aba="fantasia"]');
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
