import { expect, test, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { abrirMundo, assentar } from './guia-palco';
import { alvoDoToque, esperarDica as esperarDicaAqui } from './vila-alvo';

/**
 * Spec 026 (parte 3): a Casa anos 80 por dentro, no celular em pé e deitado, com o dedo de
 * verdade. A criança entra pela porta andando (o telhado some e a câmera olha a casa de cima,
 * nunca dentro de uma parede) e toca em tudo, cada coisa com a dica de toque:
 *
 * - **a TV** troca o canal (os quatro desenhos inventados, em roda);
 * - **o toca-discos** liga e desliga a musiquinha;
 * - **o telefone de disco** toca e a voz boba atende;
 * - **o sofá**: ela senta (o pulinho e o gesto de sentar), do lado da vovó;
 * - **os brinquedos do quarto**: o ioiô, o pião, o cubo de cores e o robô, cada um faz o que faz;
 * - **o baú** dá o ioiô, o pião e o cubo para levar;
 * - **a fita da locadora** no videocassete passa o filme de 20 s.
 *
 * As fotos vão para `CASA_PASTA` (com `CASA_HORA=noite`, de noite).
 */
declare const process: { env: Record<string, string | undefined> };
test.setTimeout(900_000);
test.use({ actionTimeout: 30_000 });
const PASTA = process.env.CASA_PASTA ?? 'capturas-026c/casa';
const NOITE = process.env.CASA_HORA === 'noite';
const SO_TAMANHO = process.env.CASA_TAMANHO;

type P3 = [number, number, number];

/** Leva a criança para (x, z) do mundo, olhando para o ponto `alvo`, um pouco de lado. */
async function irPara(page: Page, alvo: P3, de: [number, number], desvio = -0.25) {
  await page.evaluate(
    ([alvo, de, desvio]) => {
      const e = window.__brumaluz!;
      const p = e.vila!()!;
      e.voar?.(false);
      e.teleportar!(de[0], de[1], p.h + 1.2);
      e.apontar!(Math.atan2(alvo[0] - de[0], alvo[2] - de[1]) + desvio, 0.9);
    },
    [alvo, de, desvio] as const,
  );
  await page.waitForTimeout(1400);
}
const sala = (page: Page) => page.evaluate(() => window.__brumaluz!.vilaCasa!.sala());
const casa = (page: Page) => page.evaluate(() => window.__brumaluz!.vilaCasa!.estado());
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
/** A dica `chave` aparece com o texto certo. */
async function esperarDica(page: Page, chave: string, texto: string): Promise<void> {
  const p = await page.evaluate(
    (chave) => window.__vila!.toques().find((q) => q.chave === chave)?.p ?? null,
    chave,
  );
  expect(p, `o toque ${chave} existe`).not.toBeNull();
  await esperarDicaAqui(page, chave, p!);
  expect(await page.evaluate(() => window.__vila!.dica()?.texto)).toBe(texto);
}
async function tocar(page: Page, chave: string): Promise<void> {
  const t = await alvoDoToque(page, chave);
  await page.touchscreen.tap(t.x, t.y);
}
/** A câmera lá dentro nunca fica dentro de um bloco, nem colada na criança. */
async function cameraBoa(page: Page, onde: string): Promise<void> {
  const c = await casa(page);
  expect(c.camLivre, `${onde}: a câmera fora dos blocos`).toBe(true);
  expect(c.camDist, `${onde}: a câmera não cola na criança`).toBeGreaterThan(2.4);
}

for (const tamanho of ['empe', 'deitado'] as const) {
  if (SO_TAMANHO && SO_TAMANHO !== tamanho) continue;
  test(`Vila Neon, ${tamanho}: a Casa anos 80 por dentro (entrar, cada toque, sentar, a fita na TV)`, async ({
    browser,
  }) => {
    mkdirSync(PASTA, { recursive: true });
    const page = await abrirMundo(browser, { id: `vila-casa-${tamanho}`, tema: 'vila-neon', tamanho });
    const erros: string[] = [];
    page.on('pageerror', (e) => erros.push(String(e)));
    await page.addStyleTag({ content: '.dica-mira { display: none !important; }' });
    if (NOITE)
      await page.evaluate(() => {
        const e = window.__brumaluz!;
        e.pausarDia = true;
        e.hora = 0.96;
      });
    await assentar(page);
    await page.waitForFunction(() => !!window.__vila && !!window.__brumaluz!.vilaCasa, undefined, {
      timeout: 30_000,
    });
    const P = await page.evaluate(() => window.__brumaluz!.vila!()!.pontos.casa);
    const foto = (nome: string) =>
      page.screenshot({ path: `${PASTA}/${tamanho}-${nome}${NOITE ? '-noite' : ''}.png` });

    // ---------------------------------------------------------------- entrar pela porta, andando
    await page.evaluate((porta) => {
      const e = window.__brumaluz!;
      const p = e.vila!()!;
      e.voar?.(false);
      e.teleportar!(porta[0], porta[2] + 4.5, p.h + 1.2);
      e.apontar!(Math.PI, 0.3);
    }, P.porta);
    await assentar(page, 9);
    await foto('0-fora');
    expect(await page.evaluate(() => window.__brumaluz!.vilaCasa!.dentro())).toBe(false);
    await page.evaluate(() => window.__brumaluz!.controleDireto!.mover(1, 0));
    await page.waitForFunction(() => window.__brumaluz!.vilaCasa!.dentro(), undefined, {
      timeout: 15_000,
    });
    await page.waitForTimeout(700);
    await page.evaluate(() => window.__brumaluz!.controleDireto!.mover(0, 0));
    await page.waitForTimeout(2200);
    // o telhado sumiu e a câmera está por cima, livre
    expect((await casa(page)).corte).toBe(true);
    await cameraBoa(page, 'entrou');
    await foto('1-entrou');

    // ---------------------------------------------------------------- a TV troca o canal
    await irPara(page, P.tela, [P.tv[0] + 1.2, P.tv[2] + 4.2]);
    await esperarDica(page, 'tv', 'Toque para trocar o canal');
    await cameraBoa(page, 'tv');
    await foto('2-tv-dica');
    expect((await sala(page)).canal).toBe(0);
    for (let k = 1; k <= 4; k++) {
      await tocar(page, 'tv');
      await page.waitForFunction((k) => window.__brumaluz!.vilaCasa!.sala().canal === k % 4, k, {
        timeout: 10_000,
      });
      await page.waitForTimeout(900);
      expect((await casa(page)).tela).toBe(`canal${k % 4}`);
      await foto(`3-tv-canal-${(k % 4) + 1}`);
      await page.waitForTimeout(500);
    }

    // ---------------------------------------------------------------- o toca-discos
    await irPara(page, P.prato, [P.discos[0] + 2.4, P.discos[2] + 1.2], -0.2);
    await esperarDica(page, 'disco', 'Toque para ouvir');
    await foto('4-disco-dica');
    await tocar(page, 'disco');
    await page.waitForFunction(() => window.__brumaluz!.vilaCasa!.sala().disco >= 0);
    await page.waitForTimeout(1600);
    expect((await casa(page)).disco).toBe(true);
    await foto('5-disco-tocando');
    await page.waitForTimeout(800);
    await tocar(page, 'disco');
    await page.waitForFunction(() => window.__brumaluz!.vilaCasa!.sala().disco < 0);

    // ---------------------------------------------------------------- o telefone de disco
    const antes = await page.evaluate(() => window.__brumaluz!.vilaMissoes!.estado().toquesDaRua);
    await irPara(page, P.fone, [P.telefone[0] + 0.6, P.telefone[2] + 2.0], -0.2);
    await esperarDica(page, 'telefone', 'Toque para ligar');
    await foto('6-telefone-dica');
    await tocar(page, 'telefone');
    await page.waitForFunction(() => window.__brumaluz!.vilaCasa!.estado().telefone);
    await page.waitForTimeout(450);
    await foto('7-telefone-tocando');
    await page.waitForTimeout(1300);
    await foto('8-telefone-atendeu');
    expect(await page.evaluate(() => window.__brumaluz!.vilaMissoes!.estado().toquesDaRua)).toBe(antes + 1);
    await page.waitForTimeout(1500);

    // ---------------------------------------------------------------- o sofá (do lado da vovó)
    const sofa = P.sofa;
    await irPara(page, [sofa.x, P.y, sofa.z], [sofa.x - 0.6, sofa.z + 2.4], 0.15);
    await esperarDica(page, 'sofa', 'Toque para sentar');
    await foto('9-sofa-dica');
    await tocar(page, 'sofa');
    await page.waitForFunction(
      (s) => {
        const p = window.__brumaluz!.jogadorPes!();
        return s.assentos.slice(1).some((a) => Math.hypot(a.x - p[0], a.z - p[2]) < 0.4 && Math.abs(a.y - p[1]) < 0.2);
      },
      sofa,
      { timeout: 10_000 },
    );
    await page.waitForTimeout(1400);
    await foto('10-sentada');
    // de frente: a criança sentada do lado da vovó, olhando a TV
    await page.evaluate((s) => window.__brumaluz!.apontar!(s.yaw + Math.PI - 0.5, 0.75), sofa);
    await page.waitForTimeout(900);
    await foto('11-sentada-de-frente');
    // a vovó continua no assento dela (nunca uma por cima da outra)
    const pes = await page.evaluate(() => window.__brumaluz!.jogadorPes!());
    const a0 = sofa.assentos[0];
    expect(Math.hypot(pes[0] - a0.x, pes[2] - a0.z)).toBeGreaterThan(0.8);
    // andar desce do sofá
    await page.evaluate(() => window.__brumaluz!.controleDireto!.mover(-1, 0));
    await page.waitForTimeout(700);
    await page.evaluate(() => window.__brumaluz!.controleDireto!.mover(0, 0));
    await page.waitForTimeout(400);
    expect((await page.evaluate(() => window.__brumaluz!.jogadorPes!()))[1]).toBeLessThan(P.y + 0.2);

    // ---------------------------------------------------------------- os brinquedos do quarto
    // (de onde o brinquedo da vez é o mais perto: a dica é sempre a da coisa mais perto)
    const brinquedos: [string, P3, [number, number], number][] = [
      ['ioio', P.ioio, [P.ioio[0] - 0.05, P.ioio[2] + 2.0], 600],
      ['piao', P.piao, [P.piao[0] - 1.2, P.piao[2] + 1.5], 1500],
      ['cubo', P.cubo, [P.cubo[0] - 1.25, P.cubo[2] + 1.35], 200],
      ['robo', P.robo, [P.robo[0] - 0.6, P.robo[2] + 2.1], 1000],
    ];
    for (const [chave, onde, de, ms] of brinquedos) {
      await irPara(page, onde, de, 0.2);
      await esperarDica(page, chave, 'Toque para brincar');
      await cameraBoa(page, chave);
      await foto(`12-${chave}-dica`);
      const antesC = (await casa(page)).cubo;
      await tocar(page, chave);
      await page.waitForFunction(
        ([chave, antesC]) => {
          const c = window.__brumaluz!.vilaCasa!.estado() as unknown as Record<string, unknown>;
          return chave === 'cubo' ? (c.cubo as number) > (antesC as number) : !!c[chave as string];
        },
        [chave, antesC] as const,
        { timeout: 10_000 },
      );
      await page.waitForTimeout(ms);
      await foto(`13-${chave}-brincando`);
      console.log(
        `casa: ${chave}`,
        JSON.stringify(
          await page.evaluate(() => {
            const e = window.__brumaluz!;
            const c = e.vilaCasa!.estado() as unknown as Record<string, unknown>;
            return {
              paredes: c.paredes,
              pes: e.jogadorPes!(),
              rot: e.rotacao,
              cam: e.camera!.posicao(),
              r: e.vila!()!.pontos.casa.paredes,
            };
          }),
        ),
      );
      await page.waitForTimeout(chave === 'piao' ? 3200 : 2000);
    }

    // ---------------------------------------------------------------- o baú dá os brinquedos
    await irPara(page, P.bau, [P.bau[0] - 2.0, P.bau[2] + 0.8], 0.1);
    await esperarDica(page, 'bau', 'Toque para pegar');
    await foto('14-bau-dica');
    for (const item of ['ioio', 'piao', 'cubo_cores']) {
      await tocar(page, 'bau');
      await page.waitForFunction((item) => {
        const inv = window.__brumaluz!.inventario!;
        for (let i = 0; i < 36; i++) if (inv.obter(i)?.item === item) return true;
        return false;
      }, item);
      await page.waitForTimeout(1300);
      if (item === 'ioio') await foto('15-bau-ioio-na-mao');
    }
    expect(await tem(page, 'piao')).toBe(1);
    expect(await tem(page, 'cubo_cores')).toBe(1);
    // com os três, o baú não chama mais (a dica some)
    expect(await page.evaluate(() => window.__vila!.toques().some((q) => q.chave === 'bau'))).toBe(false);

    // ---------------------------------------------------------------- a fita da locadora na TV
    const rua = await page.evaluate(() => window.__brumaluz!.vila!()!.pontos.rua);
    await irPara(page, rua.fitas, [rua.fitas[0] + 0.5, rua.fitas[2] + 3.2], -0.3);
    await page.evaluate(() => window.__brumaluz!.apontar!(window.__brumaluz!.rotacao![1], 0.1));
    await assentar(page, 9);
    await esperarDica(page, 'fitas', 'Toque para pegar');
    await tocar(page, 'fitas');
    await page.waitForFunction(() => {
      const inv = window.__brumaluz!.inventario!;
      for (let i = 0; i < 36; i++) if (inv.obter(i)?.item === 'fita_video') return true;
      return false;
    });
    await page.waitForTimeout(1200);
    await irPara(page, P.tela, [P.tv[0] + 1.0, P.tv[2] + 3.6], 0.2);
    await esperarDica(page, 'videocassete', 'Toque para pôr a fita');
    await foto('16-videocassete-dica');
    await tocar(page, 'videocassete');
    await page.waitForFunction(() => window.__brumaluz!.vilaCasa!.sala().filme > 0, undefined, {
      timeout: 10_000,
    });
    for (const [s, nome] of [
      [1.0, 'contagem'],
      [3.5, 'passeio'],
      [8.0, 'corrida'],
      [13.0, 'passarinho'],
      [16.5, 'abraco'],
      [18.7, 'fim'],
    ] as const) {
      // (no relógio do núcleo: o quanto do filme já passou)
      await page.waitForFunction(
        (s) => {
          const e = window.__brumaluz!;
          return e.vilaTempo!() - (e.vilaCasa!.sala().filme - 20) >= s;
        },
        s,
        { polling: 50 },
      );
      expect((await casa(page)).tela).toBe('filme');
      await foto(`17-filme-${nome}`);
    }
    // a fita continua na mochila
    expect(await tem(page, 'fita_video')).toBe(1);
    expect(erros).toEqual([]);
    await page.close();
  });
}
