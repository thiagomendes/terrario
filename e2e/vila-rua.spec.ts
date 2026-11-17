import { expect, test, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { abrirMundo, assentar } from './guia-palco';
import { alvoDoToque, esperarDica as esperarDicaAqui } from './vila-alvo';

/**
 * Spec 026 (parte 2, etapa B): os toques da Rua anos 80, no celular em pé e deitado, com o dedo
 * de verdade. Cada coisa tem a dica de toque; arrastar o dedo por cima (virar a câmera) não toca.
 *
 * - **o orelhão:** toca e uma voz boba atende (uma de seis falas, em roda);
 * - **a locadora:** o toque na parede de fitas põe uma fita de vídeo na mochila (uma só);
 * - **a lanchonete:** o toque no balcão e a moça entrega uma vitamina (até duas);
 * - **a banca:** o toque mostra uma revista inventada grande, sem texto; outro toque fecha;
 * - **a bicicleta:** a campainha.
 */
declare const process: { env: Record<string, string | undefined> };
test.setTimeout(600_000);
test.use({ actionTimeout: 30_000 });
const PASTA = process.env.RUA_PASTA ?? 'test-results/vila-rua';
const NOITE = process.env.RUA_HORA === 'noite';

type P3 = [number, number, number];

/**
 * Leva a criança para perto de um ponto da rua, olhando para ele (um pouco de lado: o boneco fica
 * à esquerda na tela e não tapa a coisa).
 */
async function irPara(
  page: Page,
  alvo: P3,
  de: [number, number],
  pitch = 0.1,
  desvio = -0.3,
): Promise<void> {
  await page.evaluate(
    ([alvo, de, pitch, desvio]) => {
      const e = window.__brumaluz!;
      const p = e.vila!()!;
      e.voar?.(false);
      e.teleportar!(de[0], de[1], p.h + 1.2);
      e.apontar!(Math.atan2(alvo[0] - de[0], alvo[2] - de[1]) + desvio, pitch);
    },
    [alvo, de, pitch, desvio] as const,
  );
  await page.waitForTimeout(1500);
}
const tem = (page: Page, item: string) =>
  page.evaluate((item) => {
    const inv = window.__brumaluz!.inventario!;
    let n = 0;
    for (let i = 0; i < 36; i++) {
      const s = inv.obter(i);
      if (s?.item === item) n += s.qtd;
    }
    return n;
  }, item);
const toques = (page: Page) =>
  page.evaluate(() => window.__brumaluz!.vilaMissoes!.estado().toquesDaRua);
/** A dica de toque de `chave` aparece (a câmera ajeita a inclinação) com o texto certo. */
async function esperarDica(page: Page, chave: string, texto: string): Promise<void> {
  const p = await page.evaluate(
    (chave) => window.__vila!.toques().find((q) => q.chave === chave)?.p ?? null,
    chave,
  );
  expect(p, `o toque ${chave} existe`).not.toBeNull();
  await esperarDicaAqui(page, chave, p!);
  expect(await page.evaluate(() => window.__vila!.dica()?.texto)).toBe(texto);
}
/** Um dedo que desce em (x, y), anda (dx, dy) e sobe depois de `ms` (virar a câmera). */
async function arrastar(page: Page, x: number, y: number, dx: number, dy: number, ms: number) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x, y, id: 7 }],
  });
  for (let i = 1; i <= 10; i++) {
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: x + (dx * i) / 10, y: y + (dy * i) / 10, id: 7 }],
    });
    await page.waitForTimeout(ms / 10);
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await cdp.detach();
  await page.waitForTimeout(400);
}

for (const tamanho of ['empe', 'deitado'] as const) {
  test(`Vila Neon, ${tamanho}: os toques da Rua anos 80 (orelhão, fita, vitamina, revista, campainha)`, async ({
    browser,
  }) => {
    mkdirSync(PASTA, { recursive: true });
    const page = await abrirMundo(browser, {
      id: `vila-rua-${tamanho}`,
      tema: 'vila-neon',
      tamanho,
    });
    const erros: string[] = [];
    page.on('pageerror', (e) => erros.push(String(e)));
    await page.addStyleTag({ content: '.dica-mira { display: none !important; }' });
    // (`RUA_HORA=noite`: as fotos de noite, com a hora parada)
    if (NOITE)
      await page.evaluate(() => {
        const e = window.__brumaluz!;
        e.pausarDia = true;
        e.hora = 0.96;
      });
    await assentar(page);
    await page.waitForFunction(() => !!window.__vila, undefined, { timeout: 30_000 });
    const rua = await page.evaluate(() => window.__brumaluz!.vila!()!.pontos.rua);
    const foto = (nome: string) =>
      page.screenshot({ path: `${PASTA}/${tamanho}-${nome}${NOITE ? '-noite' : ''}.png` });
    /** A foto do boneco de frente (o que está na mão à vista) e a câmera de volta. */
    const fotoDeFrente = async (nome: string) => {
      const antes = await page.evaluate(() => window.__brumaluz!.rotacao ?? [0, 0]);
      // (de cima: a câmera passa por cima dos carros e dos balcões em volta)
      await page.evaluate((y) => window.__brumaluz!.apontar!(y + Math.PI - 0.6, 0.42), antes[1]);
      // (logo: parado, o boneco acaba virando para onde a câmera olha)
      await page.waitForTimeout(450);
      await foto(nome);
      await page.evaluate(([p, y]) => window.__brumaluz!.apontar!(y, p), [antes[0], antes[1]] as const);
      await page.waitForTimeout(400);
    };

    // ---------------------------------------------------------------- o orelhão
    // (um pouco de lado: o boneco não tapa o orelhão na câmera)
    const deOrelhao: [number, number] = [rua.orelhao[0] + 1.9, rua.orelhao[2] + 3.2];
    await irPara(page, [rua.orelhao[0], 0, rua.orelhao[2]], deOrelhao);
    await assentar(page, 9);
    await esperarDica(page, 'orelhao', 'Toque para ligar');
    await foto('1-orelhao-dica');
    let t = await alvoDoToque(page, 'orelhao');
    // arrastar o dedo por cima (virar a câmera) não liga
    const antes = await toques(page);
    await arrastar(page, t.x, t.y, 90, 8, 260);
    expect(await toques(page)).toBe(antes);
    await irPara(page, [rua.orelhao[0], 0, rua.orelhao[2]], deOrelhao);
    const falas = new Set<number>();
    for (let k = 0; k < 3; k++) {
      t = await alvoDoToque(page, 'orelhao');
      await page.touchscreen.tap(t.x, t.y);
      await page.waitForFunction((n) => window.__brumaluz!.vilaMissoes!.estado().toquesDaRua > n, antes + k);
      const fala = await page.evaluate(() => window.__brumaluz!.vilaMissoes!.estado().falaDoOrelhao);
      expect(fala).toBeGreaterThanOrEqual(0);
      expect(fala).toBeLessThan(6);
      falas.add(fala);
      if (k === 0) {
        await page.waitForTimeout(500);
        await foto('2-orelhao-tocando');
      }
      // (a dica some depois do toque: a tela fica limpa)
      expect(await page.evaluate(() => window.__vila!.dica())).toBeNull();
      await page.waitForTimeout(2800);
    }
    // cada ligação, uma fala diferente
    expect(falas.size).toBe(3);

    // ---------------------------------------------------------------- a locadora
    await irPara(page, [rua.fitas[0], 0, rua.fitas[2]], [rua.fitas[0] + 0.5, rua.fitas[2] + 3.2]);
    await assentar(page, 9);
    await esperarDica(page, 'fitas', 'Toque para pegar');
    await foto('3-locadora-dica');
    expect(await tem(page, 'fita_video')).toBe(0);
    t = await alvoDoToque(page, 'fitas');
    await page.touchscreen.tap(t.x, t.y);
    await page.waitForFunction(() => {
      const inv = window.__brumaluz!.inventario!;
      for (let i = 0; i < 9; i++) if (inv.obter(i)?.item === 'fita_video') return true;
      return false;
    });
    await page.waitForTimeout(1500);
    await foto('4-locadora-fita-na-mao');
    await fotoDeFrente('4b-locadora-fita-de-frente');
    // outro toque não enche a mochila de fitas
    await page.evaluate(() => {
      const e = window.__brumaluz!;
      const p = e.jogadorPes!();
      e.teleportar!(p[0] + 9, p[2], p[1] + 0.2);
    });
    await page.waitForTimeout(600);
    await irPara(page, [rua.fitas[0], 0, rua.fitas[2]], [rua.fitas[0] + 0.5, rua.fitas[2] + 3.2]);
    t = await alvoDoToque(page, 'fitas');
    await page.touchscreen.tap(t.x, t.y);
    await page.waitForTimeout(1500);
    expect(await tem(page, 'fita_video')).toBe(1);

    // ---------------------------------------------------------------- a lanchonete
    // (de lado, no meio da lanchonete: a câmera tem lugar e a moça fica à vista)
    await irPara(
      page,
      [rua.balcao[0], 0, rua.balcao[2]],
      [rua.balcao[0] - 2.6, rua.balcao[2] + 3.0],
      0.1,
      -0.6,
    );
    await assentar(page, 9);
    await esperarDica(page, 'vitamina', 'Toque para pedir');
    await foto('5-lanchonete-dica');
    for (let k = 0; k < 3; k++) {
      t = await alvoDoToque(page, 'vitamina');
      await page.touchscreen.tap(t.x, t.y);
      await page.waitForTimeout(1500);
      if (k === 0) {
        await foto('6-lanchonete-vitamina-na-mao');
        await fotoDeFrente('6b-lanchonete-vitamina-de-frente');
      }
    }
    // (a moça entrega até duas: o toque não enche a mochila)
    expect(await tem(page, 'vitamina')).toBe(2);
    // é comida de verdade (come-se como as outras)
    expect(
      await page.evaluate(() => {
        const inv = window.__brumaluz!.inventario!;
        for (let i = 0; i < 9; i++) if (inv.obter(i)?.item === 'vitamina') return i;
        return -1;
      }),
    ).toBeGreaterThanOrEqual(0);

    // ---------------------------------------------------------------- a banca
    await irPara(page, [rua.revistas[0], 0, rua.revistas[2]], [rua.revistas[0] + 0.5, rua.revistas[2] + 3.6]);
    await assentar(page, 9);
    await esperarDica(page, 'revista', 'Toque para ver');
    await foto('7-banca-dica');
    const capas = new Set<string>();
    for (let k = 0; k < 2; k++) {
      t = await alvoDoToque(page, 'revista');
      await page.touchscreen.tap(t.x, t.y);
      await page.waitForSelector('[data-revista]', { state: 'visible' });
      await page.waitForTimeout(900);
      expect(await page.evaluate(() => window.__vila!.revista())).toBe(true);
      // a capa cabe inteira na tela e não tem nenhuma letra
      const capa = await page.evaluate(() => {
        const el = document.querySelector<HTMLElement>('[data-revista] [data-capa]');
        const r = el?.getBoundingClientRect();
        return {
          n: el?.dataset.capa ?? '',
          texto: (document.querySelector('[data-revista]')?.textContent ?? '').trim(),
          letras: document.querySelectorAll('[data-revista] text, [data-revista] tspan').length,
          dentro:
            !!r && r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight,
          larg: r?.width ?? 0,
        };
      });
      expect(capa.texto).toBe('');
      expect(capa.letras).toBe(0);
      expect(capa.dentro).toBe(true);
      expect(capa.larg).toBeGreaterThan(180);
      capas.add(capa.n);
      await foto(`8-banca-revista-${k + 1}`);
      // um toque em qualquer lugar fecha
      await page.touchscreen.tap(60, 200);
      await page.waitForFunction(() => !window.__vila!.revista());
      await page.waitForTimeout(700);
      expect(await page.evaluate(() => document.body.dataset.overlay ?? '')).toBe('');
      // (para a dica e o toque voltarem, ela se afasta e chega de novo)
      await page.evaluate(() => {
        const e = window.__brumaluz!;
        const p = e.jogadorPes!();
        e.teleportar!(p[0] + 10, p[2] + 3, p[1] + 0.2);
      });
      await page.waitForTimeout(500);
      await irPara(page, [rua.revistas[0], 0, rua.revistas[2]], [rua.revistas[0] + 0.5, rua.revistas[2] + 3.6]);
    }
    // cada vez, uma capa diferente
    expect(capas.size).toBe(2);

    // ---------------------------------------------------------------- a campainha da bicicleta
    const bici = rua.bicicletas[0];
    await irPara(page, [bici[0], 0, bici[2]], [bici[0] + 0.3, bici[2] + 2.6], 0.3);
    await assentar(page, 9);
    const n0 = await toques(page);
    t = await alvoDoToque(page, 'bici-0');
    await page.touchscreen.tap(t.x, t.y);
    await page.waitForFunction((n) => window.__brumaluz!.vilaMissoes!.estado().toquesDaRua > n, n0);
    await foto('9-bicicleta');
    // nada fica na tela: longe de tudo, nenhuma dica
    await page.evaluate(() => {
      const e = window.__brumaluz!;
      const q = e.vila!()!;
      e.teleportar!(q.nascimento.x, q.nascimento.z, q.h + 1.2);
    });
    await page.waitForTimeout(1500);
    expect(await page.evaluate(() => window.__vila!.dica())).toBeNull();
    expect(erros).toEqual([]);
    await page.close();
  });
}
