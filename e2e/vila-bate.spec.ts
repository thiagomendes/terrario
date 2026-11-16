import { expect, test, type CDPSession, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { abrirMundo, assentar } from './guia-palco';

/**
 * Spec 026 (parte 2, o bate-bate de guiar; dono, 16 nov 2026: "guiar o carrinho e bater no outro
 * de fato"), no celular deitado e em pé, com o dedo de verdade no controle:
 *
 * - perto de um carrinho livre a dica "Toque para andar" aparece; o toque no carrinho senta;
 * - o controle guia: o carrinho vai para onde o dedo aponta, devagar, e a câmera vai atrás;
 * - bate de verdade num carrinho de morador (os para-choques se tocam, o "tum", as estrelinhas) e
 *   na mureta, sem nunca sair da pista nem descer do carrinho;
 * - arrastar o outro dedo gira a câmera (é dela), guiando ao mesmo tempo;
 * - parar no tapete verde da saída desce (e empurrar o controle nunca desce).
 */
declare const process: { env: Record<string, string | undefined> };
test.setTimeout(900_000);
test.use({ actionTimeout: 30_000 });
const PASTA = process.env.BATE_PASTA ?? 'test-results/vila-bate';

/** Os dedos de verdade do navegador (o controle de toque do jogo ouve estes). */
class Dedos {
  private pontos = new Map<number, { x: number; y: number }>();
  constructor(private cdp: CDPSession) {}
  private mandar(type: 'touchStart' | 'touchMove' | 'touchEnd') {
    return this.cdp.send('Input.dispatchTouchEvent', {
      type,
      touchPoints: [...this.pontos].map(([id, p]) => ({ id, x: p.x, y: p.y })),
    });
  }
  async descer(id: number, x: number, y: number) {
    this.pontos.set(id, { x, y });
    await this.mandar('touchStart');
  }
  async mover(id: number, x: number, y: number) {
    if (!this.pontos.has(id)) return this.descer(id, x, y);
    this.pontos.set(id, { x, y });
    await this.mandar('touchMove');
  }
  async subir(id: number) {
    if (!this.pontos.delete(id)) return;
    // (o "touchEnd" leva os dedos que ficaram: só o que saiu da lista sobe)
    await this.mandar('touchEnd');
  }
}

interface Estado {
  i: number;
  yaw: number;
  carros: { x: number; z: number; yaw: number; vel: number }[];
  batidas: number;
  maiorErro: number;
}
const estado = (page: Page) =>
  page.evaluate((): Estado | null => {
    const e = window.__brumaluz!;
    const s = e.vilaParque!.sentado();
    const carros = e.vilaParque!.carros();
    if (!s || !carros) return null;
    const b = e.vilaParque!.bate();
    return {
      i: s.i,
      yaw: e.rotacao![1],
      carros: carros.map((c) => ({ x: c.x, z: c.z, yaw: c.yaw, vel: c.vel })),
      batidas: b.batidas,
      maiorErro: b.maiorErro,
    };
  });

for (const tamanho of ['deitado', 'empe'] as const) {
  test(`Vila Neon, ${tamanho}: o bate-bate de guiar (o dedo no controle, a batida de verdade, a saída no tapete)`, async ({
    browser,
  }) => {
    mkdirSync(PASTA, { recursive: true });
    const page = await abrirMundo(browser, {
      id: `vila-bate-${tamanho}`,
      tema: 'vila-neon',
      tamanho,
    });
    const erros: string[] = [];
    page.on('pageerror', (e) => erros.push(String(e)));
    await assentar(page);
    const { B, Y } = await page.evaluate(() => {
      const p = window.__brumaluz!.vila!()!;
      return { B: p.pontos.parque.bate, Y: p.h + 1 };
    });
    const R = 0.96;
    const dentro = (c: { x: number; z: number }) =>
      c.x >= B.x0 + R - 0.05 && c.x <= B.x1 - R + 0.05 && c.z >= B.z0 + R - 0.05 && c.z <= B.z1 - R + 0.05;

    // ---------------------------------------------------------------- chegar e sentar
    const vaga = B.vagas[5];
    await page.evaluate(
      ([x, z, y, vz]) => {
        const e = window.__brumaluz!;
        e.voar?.(false);
        e.teleportar!(x, z + 3.2, y + 0.2);
        e.apontar!(Math.atan2(0, vz - (z + 3.2)), 0.25);
      },
      [vaga[0], B.z1, Y, vaga[1]] as const,
    );
    await assentar(page, 9);
    // a pista viva: os moradores guiam os carrinhos deles (bonecos de verdade, sentados)
    await page.waitForFunction(() => {
      const c = window.__brumaluz!.vilaParque!.carros();
      return !!c && c.slice(0, 4).some((q) => q.vel > 0.5);
    });
    await page.waitForFunction(() => window.__vila!.dica()?.texto === 'Toque para andar', undefined, {
      timeout: 15_000,
    });
    await page.screenshot({ path: `${PASTA}/${tamanho}-1-dica.png` });
    const alvo = await page.evaluate(() => window.__vila!.parque().sentar[2].t);
    expect(alvo, 'o carrinho livre na tela').not.toBeNull();
    await page.touchscreen.tap(alvo!.x, alvo!.y);
    await page.waitForFunction(() => window.__brumaluz!.vilaParque!.sentado()?.b === 'bate');
    await page.waitForFunction(() => window.__vila!.dica()?.chave === 'bate-guiar');
    expect((await page.evaluate(() => window.__vila!.dica()!.texto)).startsWith('Empurre')).toBe(true);
    await page.waitForTimeout(1600);
    // (a dica de guiar fica até ela sair do lugar, sem a mãozinha de tocar)
    expect(await page.evaluate(() => window.__vila!.dica()?.chave)).toBe('bate-guiar');
    expect(
      await page.evaluate(
        () => document.querySelector('[data-dica-toque="mao"]')?.classList.contains('mostra'),
      ),
    ).toBe(false);
    await page.screenshot({ path: `${PASTA}/${tamanho}-2-sentada.png` });
    const e0 = (await estado(page))!;
    expect(e0.i).toBeGreaterThanOrEqual(4);
    // parada, o carrinho espera; a câmera foi para trás dele (olhando para a pista, o norte)
    expect(e0.carros[e0.i].vel).toBeLessThan(0.1);
    expect(Math.cos(e0.yaw - Math.PI)).toBeGreaterThan(0.9);

    // ---------------------------------------------------------------- o dedo no controle
    const joy = (await page.locator('.toque .joystick').boundingBox())!;
    const jc = { x: joy.x + joy.width / 2, y: joy.y + joy.height / 2 };
    const raio = joy.width / 2 - 4;
    const dedos = new Dedos(await page.context().newCDPSession(page));
    /** Aponta o controle para o rumo do mundo (x, z), com a força de 0 a 1. */
    const apontar = async (e: Estado, x: number, z: number, f = 1) => {
      const rumo = Math.atan2(x, z);
      const d = rumo - e.yaw;
      await dedos.mover(1, jc.x + Math.sin(d) * raio * f, jc.y - Math.cos(d) * raio * f);
    };
    // para a frente: o carrinho sai da vaga e entra na pista, devagar
    await dedos.descer(1, jc.x, jc.y);
    await dedos.mover(1, jc.x, jc.y - raio);
    let maiorVel = 0;
    for (let k = 0; k < 16; k++) {
      await page.waitForTimeout(100);
      maiorVel = Math.max(maiorVel, (await estado(page))!.carros[e0.i].vel);
    }
    const e1 = (await estado(page))!;
    expect(e1.carros[e1.i].z).toBeLessThan(e0.carros[e0.i].z - 2.5);
    expect(maiorVel).toBeGreaterThan(2.5);
    expect(maiorVel).toBeLessThan(3.6);
    // a dica de guiar some sozinha (nada fica na tela enquanto ela brinca)
    expect(await page.evaluate(() => window.__vila!.dica())).toBeNull();
    await page.screenshot({ path: `${PASTA}/${tamanho}-3-guiando.png` });

    // ---------------------------------------------------------------- a batida de verdade
    // vai atrás do carrinho de morador mais perto até bater nele
    let menor = Infinity;
    let bateu: Estado | null = null;
    const inicio = Date.now();
    while (!bateu && Date.now() - inicio < 60_000) {
      const e = (await estado(page))!;
      expect(e, 'continua no carrinho').not.toBeNull();
      const eu = e.carros[e.i];
      expect(dentro(eu)).toBe(true);
      let m = e.carros[0];
      for (const c of e.carros.slice(1, 4))
        if (Math.hypot(c.x - eu.x, c.z - eu.z) < Math.hypot(m.x - eu.x, m.z - eu.z)) m = c;
      for (let j = 0; j < e.carros.length; j++)
        if (j !== e.i) menor = Math.min(menor, Math.hypot(e.carros[j].x - eu.x, e.carros[j].z - eu.z));
      if (e.batidas > e1.batidas) {
        const tum = await page.evaluate(
          (i) =>
            (window.__brumaluz!.eventosVila ?? []).some(
              (ev) => ev.e === 'parqueTum' && ev.alvo >= 0 && (ev.de === i || ev.alvo === i),
            ),
          e.i,
        );
        if (tum) bateu = e;
      }
      await apontar(e, m.x - eu.x, m.z - eu.z);
      await page.waitForTimeout(70);
    }
    expect(bateu, 'bateu num carrinho de morador').not.toBeNull();
    // os para-choques se tocaram de verdade: nunca um dentro do outro (nem um vão de mentira)
    expect(menor).toBeGreaterThan(2 * R - 0.25);
    expect(menor).toBeLessThan(2 * R + 0.25);
    await page.waitForFunction(() => window.__brumaluz!.parqueVila!()!.estrelinhas > 0, undefined, {
      timeout: 5000,
    }).catch(() => undefined);
    await page.screenshot({ path: `${PASTA}/${tamanho}-4-batida.png` });

    // ---------------------------------------------------------------- a mureta e a câmera
    // empurra o controle contra a mureta do norte por seis segundos: bate, volta, nunca sai
    for (let k = 0; k < 60; k++) {
      const e = (await estado(page))!;
      expect(dentro(e.carros[e.i])).toBe(true);
      await apontar(e, 0, -1);
      await page.waitForTimeout(100);
    }
    expect((await estado(page))!.i).toBe(e0.i);
    // o outro dedo arrasta a câmera enquanto ela guia: gira, e continua no carrinho
    const meio = tamanho === 'deitado' ? { x: 520, y: 150 } : { x: 230, y: 300 };
    const y0 = (await estado(page))!.yaw;
    await dedos.descer(2, meio.x, meio.y);
    for (let k = 1; k <= 8; k++) {
      await dedos.mover(2, meio.x + k * 14, meio.y);
      await page.waitForTimeout(30);
    }
    const y1 = (await estado(page))!.yaw;
    await dedos.subir(2);
    expect(Math.abs(Math.atan2(Math.sin(y1 - y0), Math.cos(y1 - y0)))).toBeGreaterThan(0.1);
    expect(await page.evaluate(() => window.__brumaluz!.vilaParque!.sentado()?.b)).toBe('bate');

    // ---------------------------------------------------------------- a saída no tapete
    const tap = { x: (B.tapete.x0 + B.tapete.x1) / 2, z: (B.tapete.z0 + B.tapete.z1) / 2 + 0.1 };
    const t0 = Date.now();
    let chegou = false;
    while (!chegou && Date.now() - t0 < 60_000) {
      const e = await estado(page);
      if (!e) break;
      const eu = e.carros[e.i];
      const d = Math.hypot(tap.x - eu.x, tap.z - eu.z);
      if (d < 0.45) chegou = true;
      else await apontar(e, tap.x - eu.x, tap.z - eu.z, Math.min(1, 0.35 + d / 4));
      await page.waitForTimeout(70);
    }
    expect(chegou, 'chegou ao tapete da saída').toBe(true);
    // solta o controle em cima do tapete: a dica diz o que fazer e, um segundo depois, ela desce
    await dedos.subir(1);
    await page.waitForFunction(() => window.__vila!.dica()?.chave === 'bate-sair', undefined, {
      timeout: 3000,
    });
    expect(await page.evaluate(() => window.__vila!.dica()!.texto)).toBe('Pare aqui para sair');
    await page.screenshot({ path: `${PASTA}/${tamanho}-5-tapete.png` });
    await page.waitForFunction(() => !window.__brumaluz!.vilaParque!.sentado(), undefined, {
      timeout: 6000,
    });
    await page.waitForTimeout(1300);
    const fora = await page.evaluate(() => window.__brumaluz!.jogadorPes!());
    expect(Math.hypot(fora[0] - B.saida[0], fora[2] - B.saida[2])).toBeLessThan(1.2);
    expect(Math.abs(fora[1] - Y)).toBeLessThan(0.3);
    await page.screenshot({ path: `${PASTA}/${tamanho}-6-desceu.png` });
    // a previsão do carrinho concordou com o núcleo o passeio inteiro (o acerto nunca foi um pulo)
    const b = await page.evaluate(() => window.__brumaluz!.vilaParque!.bate());
    expect(b.maiorErro).toBeLessThan(1);
    expect(b.batidas).toBeGreaterThanOrEqual(2);
    // o carrinho vazio volta sozinho para a vaga
    await page.waitForFunction(
      ([i, x, z]) => {
        const c = window.__brumaluz!.vilaParque!.carros()?.[i];
        return !!c && Math.hypot(c.x - x, c.z - z) < 0.4;
      },
      [e0.i, B.vagas[e0.i][0], B.vagas[e0.i][1]] as const,
      { timeout: 40_000 },
    );
    expect(erros).toEqual([]);
    await page.close();
  });
}
