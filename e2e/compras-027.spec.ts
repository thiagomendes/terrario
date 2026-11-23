import { expect, test, type Browser, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { abrirMundo, assentar, type Tamanho } from './guia-palco';
import { telasDoFluxo } from './telas';

/**
 * Spec 027 (T14): comprar nas barracas da Noite das Fantasias com o dedo de verdade, deitado e
 * em pé: em cada balcão (os três docinhos da Tia Filó, o chocolate quente e a poção do Seu
 * Olavo, a surpresa de uva do Seu Jerônimo), a dica "Toque para comprar" com o desenho do
 * docinho, o toque, a entrega (a fichinha, quem vende pega no balcão e entrega) e o lanche na
 * barrinha. Com `COMPRAS_027=1`, as fotos de cada barraca comprando (no computador, no
 * entardecer e de noite) em `capturas-027/parte1/compras/`.
 */
declare const process: { env: Record<string, string | undefined> };
test.setTimeout(900_000);
test.use({ actionTimeout: 30_000 });

type Balcao = { chave: string; barraca: string; item: string; vendedora: number; p: [number, number, number] };
const PASTA = 'capturas-027/parte1/compras';

async function abrir(browser: Browser, id: string, tamanho: Tamanho): Promise<Page> {
  const page = await abrirMundo(browser, { id, tema: 'noite-das-fantasias', tamanho });
  await page.addStyleTag({ content: '.dica-mira, .toast-area { display: none !important; }' });
  await assentar(page);
  await page.waitForFunction(() => !!window.__brumaluz?.baileCompras, undefined, { timeout: 30_000 });
  return page;
}
const naBarra = (page: Page, item: string) =>
  page.evaluate((item) => {
    const inv = window.__brumaluz!.inventario!;
    let n = 0;
    for (let i = 0; i < 9; i++) {
      const s = inv.obter(i);
      if (s?.item === item) n += s.qtd;
    }
    return n;
  }, item);
/** A câmera fixa das fotos (`__camFixa`: posição e alvo; null volta a câmera do jogo). */
async function cameraFixa(page: Page): Promise<void> {
  await page.evaluate(() => {
    const e = window.__brumaluz!;
    type V3 = [number, number, number];
    const w = window as unknown as { __camFixa: { p: V3; a: V3 } | null };
    w.__camFixa = null;
    e.cenaBabylon!().onBeforeCameraRenderObservable.add((c) => {
      const f = w.__camFixa;
      if (!f) return;
      const cam = c as unknown as {
        position: { set(...a: number[]): void; clone(): { set(...a: number[]): unknown } };
        setTarget(v: unknown): void;
      };
      cam.position.set(...f.p);
      const alvo = cam.position.clone();
      alvo.set(...f.a);
      cam.setTarget(alvo);
      (c.getScene() as unknown as { setTransformMatrix(a: unknown, b: unknown): void }).setTransformMatrix(
        (c as unknown as { getViewMatrix(f: boolean): unknown }).getViewMatrix(true),
        (c as unknown as { getProjectionMatrix(f: boolean): unknown }).getProjectionMatrix(true),
      );
    });
  });
}
/** Na frente do balcão, do lado do freguês, olhando para o lanche (um tico de lado). */
async function irAoBalcao(page: Page, b: Balcao, de = 2.5, lado = 0.15): Promise<void> {
  await page.evaluate(
    ({ b, de, lado }) => {
      const e = window.__brumaluz!;
      const plano = e.baile!()!;
      const tipo = b.barraca === 'horta' ? 'bancada' : 'barraca';
      const q = plano.pecas.find(
        (q) => q.tipo === tipo && (tipo === 'bancada' || q.n === (b.barraca === 'doces' ? 0 : 1)),
      )!;
      const a = (q.dir * Math.PI) / 2;
      const f = [Math.sin(a), Math.cos(a)];
      const d = [Math.cos(a), -Math.sin(a)];
      const x = b.p[0] + f[0] * de + d[0] * lado;
      const z = b.p[2] + f[1] * de + d[1] * lado;
      e.voar?.(false);
      e.teleportar!(x, z, plano.h + 1.2);
      e.apontar!(Math.atan2(b.p[0] - x, b.p[2] - z), 0.25);
    },
    { b, de, lado },
  );
  await page.waitForTimeout(1500);
}
/** Espera a vendedora (o morador do balcão) à vista na tela. */
async function esperarVendedora(page: Page, n: number): Promise<void> {
  await page.waitForFunction(
    (n) =>
      (window.__brumaluz!.criaturas?.() ?? []).some((c) => c.morador === `baile:${n}`),
    n,
    { timeout: 60_000 },
  );
  await page.waitForTimeout(800);
}
/** Compra com o dedo: a dica, o toque, a entrega e o lanche na barrinha (e as fotos). */
async function comprar(page: Page, b: Balcao, fotos?: string): Promise<number> {
  await irAoBalcao(page, b);
  await esperarVendedora(page, b.vendedora);
  await page.waitForFunction((chave) => window.__brumaluz!.dicaBaile?.()?.chave === chave, b.chave, {
    timeout: 15_000,
  });
  expect(await page.evaluate(() => window.__brumaluz!.dicaBaile!()!.texto)).toBe('Toque para comprar');
  if (fotos) await page.screenshot({ path: `${fotos}-1-dica.jpg`, type: 'jpeg', quality: 88 });
  const antes = await naBarra(page, b.item);
  // na mão, a pilha do mesmo lanche ou um espaço livre da barrinha: o lanche comprado vai para
  // a mão (a regra da 032)
  await page.evaluate((item) => {
    const e = window.__brumaluz!;
    const inv = e.inventario!;
    let k = -1;
    for (let i = 0; i < 9 && k < 0; i++) if (inv.obter(i)?.item === item) k = i;
    for (let i = 0; i < 9 && k < 0; i++) if (!inv.obter(i)) k = i;
    if (k >= 0) e.selecionarSlot!(k);
  }, b.item);
  await page.waitForTimeout(200);
  const t = await page.evaluate(() => window.__brumaluz!.dicaBaile!()!.t);
  const t0 = Date.now();
  if (fotos) await page.mouse.click(t.x, t.y);
  else await page.touchscreen.tap(t.x, t.y);
  await page.waitForFunction(() => (window.__brumaluz!.baileCompras!.estado() ?? []).length > 0, undefined, {
    timeout: 5_000,
  });
  if (fotos) {
    // de 3/4, do lado: a vendedora estica o braço com o lanche para a criança
    await page.evaluate((p) => {
      const e = window.__brumaluz!;
      const pes = e.jogadorPes!()!;
      const m = [(pes[0] + p[0]) / 2, pes[1] + 1.1, (pes[2] + p[2]) / 2];
      const u = [p[0] - pes[0], p[2] - pes[2]];
      const d = Math.hypot(u[0], u[1]) || 1;
      void m;
      void d;
      // (a criança de frente para o balcão; a câmera do jogo gira um tico para o lado e sobe: a
      // cabeça dela não tapa a mão, o lanche e quem vende)
      e.travarYaw!(Math.atan2(u[0], u[1]));
      e.apontar!(Math.atan2(u[0], u[1]) - 0.62, 0.34);
    }, b.p);
    await page.waitForTimeout(1050);
    await page.screenshot({ path: `${fotos}-2-entrega.jpg`, type: 'jpeg', quality: 88 });
  }
  await page.waitForFunction(
    ([item, n]) => {
      const inv = window.__brumaluz!.inventario!;
      let q = 0;
      for (let i = 0; i < 9; i++) if (inv.obter(i)?.item === item) q += inv.obter(i)!.qtd;
      return q > n;
    },
    [b.item, antes] as const,
    { timeout: 6_000 },
  );
  const ms = Date.now() - t0;
  const naMao = await page.evaluate(() => {
    const e = window.__brumaluz!;
    return e.inventario!.obter(e.slotAtivo ?? 0)?.item ?? null;
  });
  expect(naMao).toBe(b.item);
  await page.waitForTimeout(700);
  if (fotos) {
    await page.screenshot({ path: `${fotos}-3-na-mao.jpg`, type: 'jpeg', quality: 88 });
    await page.evaluate(() => {
      (window as unknown as { __camFixa: unknown }).__camFixa = null;
      window.__brumaluz!.travarYaw!(null);
    });
  }
  return ms;
}

// fluxo: só o celular em pé (ver e2e/telas.ts)
for (const tamanho of telasDoFluxo(['deitado', 'empe'] as const))
  test(`${tamanho}: comprar em cada barraca da festa, com o dedo`, async ({ browser }) => {
    const page = await abrir(browser, `compras-027-${tamanho}`, tamanho);
    const balcoes = (await page.evaluate(() => window.__brumaluz!.baileCompras!.balcoes())) as unknown as Balcao[];
    expect(balcoes.map((b) => b.chave)).toEqual([
      'compra-brigadeiro',
      'compra-beijinho',
      'compra-cajuzinho',
      'compra-chocolate',
      'compra-pocao',
      'compra-uva',
    ]);
    for (const b of balcoes) {
      const ms = await comprar(page, b);
      console.log(`COMPRA ${tamanho} ${b.chave} ${ms} ms`);
      // do toque até a mão: o número da 032 (1,6 ± 0,2 s, com a folga da rede local)
      expect(ms).toBeLessThan(2600);
    }
    await page.context().close();
  });

test('as fotos das barracas comprando, no entardecer e de noite', async ({ browser }) => {
  test.skip(!process.env.COMPRAS_027, 'só com COMPRAS_027=1');
  mkdirSync(PASTA, { recursive: true });
  const page = await abrir(browser, 'compras-027-fotos', 'pc');
  await cameraFixa(page);
  const balcoes = (await page.evaluate(() => window.__brumaluz!.baileCompras!.balcoes())) as unknown as Balcao[];
  for (const [hora, nome] of [
    [0.7, 'entardecer'],
    [0.85, 'noite'],
  ] as const) {
    await page.evaluate((h) => {
      const e = window.__brumaluz!;
      e.pausarDia = true;
      e.hora = h;
    }, hora);
    // um de cada barraca: o brigadeiro, o chocolate quente e a surpresa de uva (de noite, a poção)
    for (const i of nome === 'noite' ? [0, 4, 5] : [0, 3, 5]) {
      const b = balcoes[i];
      await comprar(page, b, `${PASTA}/${b.chave.replace('compra-', '')}-${nome}-pc`);
      await page.evaluate(() => {
        const e = window.__brumaluz!;
        e.teleportar!(e.baile!()!.nascimento.x, e.baile!()!.nascimento.z, e.baile!()!.h + 1.2);
      });
      await page.waitForTimeout(1500);
    }
  }
  await page.context().close();
});
