import { expect, test, type Browser, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { criarMundo, TAMANHOS } from './guia-palco';

/**
 * Spec 027 (T11): o abraço do Bento.
 * - **As fotos** (só com ABRACO_027=1, na placa de vídeo): a criança toca no Bento, no palco da
 *   praça; os dois se abraçam. De lado (os dois de perfil: nada atravessando), por cima do
 *   ombro da criança (o Bento abraçando) e por trás do Bento (o rosto da criança), no entardecer
 *   e de noite, em `capturas-027/parte1/abraco/`.
 * - **Dois jogadores na nuvem** (sempre): a Ana toca no Bento e a Bia, perto, vê os dois
 *   abraçados (o Bento chega até a Ana na tela dela); a Ana anda e o abraço solta também na tela
 *   da Bia.
 */
declare const process: { env: Record<string, string | undefined> };
type V3 = [number, number, number];
const PASTA = process.env.ABRACO_PASTA ?? 'capturas-027/parte1/abraco';

/** Abre a câmera fixa (as fotos enquadram mudando a posição, nunca a abertura). */
async function cameraFixa(page: Page): Promise<void> {
  await page.evaluate(() => {
    const e = window.__brumaluz!;
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

/** O Bento à vista (o morador baile:3 com o boneco montado). */
async function bento(page: Page) {
  return page.evaluate(() => {
    const c = window.__brumaluz!.criaturas!().find((q) => q.morador === 'baile:3');
    if (!c) return null;
    const tem = window.__brumaluz!.cenaBabylon!().transformNodes.some((t) => t.name === `morador-${c.id}-junta-cabeca`);
    return tem ? { id: c.id, x: c.x, y: c.y, z: c.z } : null;
  });
}

async function esperarBento(page: Page) {
  let b = null;
  for (let i = 0; i < 90 && !b; i++) {
    await page.waitForTimeout(1000);
    b = await bento(page);
  }
  expect(b, 'o Bento no palco').not.toBeNull();
  return b!;
}

/** A criança no palco, na frente do Bento, e o toque nele. */
async function abracar(page: Page, b: { x: number; y: number; z: number }) {
  await page.evaluate((b) => {
    const e = window.__brumaluz!;
    e.mirarPonto!(b.x, b.y + 1.3, b.z);
    e.usarOuColocar!();
  }, b);
}

test.describe('spec 027 (T11): o abraço do Bento', () => {
  test('as fotos do abraço, de lado e de frente, de dia e de noite', async ({ browser }) => {
    test.skip(!process.env.ABRACO_027, 'só com ABRACO_027=1');
    test.setTimeout(600_000);
    const page = await (await browser.newContext(TAMANHOS.pc)).newPage();
    page.on('pageerror', (e) => console.log(`erro na página: ${String(e)}`));
    await page.addInitScript(() => {
      try {
        localStorage.setItem(
          'terrario:config',
          JSON.stringify({ distancia: 4, mostrarFps: false, mostrarAtalhos: false, qualidade: 'alta' }),
        );
      } catch {
        // sem armazenamento
      }
    });
    await criarMundo(page, 'fotos-abraco', 'noite-das-fantasias', {}, 1337);
    await page.goto('/?mundo=fotos-abraco&escala=1');
    await page.waitForFunction(() => window.__brumaluz?.ready === true, undefined, { timeout: 240_000 });
    await page.evaluate(() => {
      document.querySelector<HTMLElement>('.entrada')?.setAttribute('hidden', '');
      const e = window.__brumaluz!;
      e.pausarDia = true;
      e.hora = 0.7;
      e.definirClima?.('limpo');
    });
    await cameraFixa(page);
    await page.addStyleTag({ content: '.toast-area, .dica-mira { display: none !important; }' });
    const posto = await page.evaluate(() => window.__brumaluz!.baile!()!.pontos.postos.bento as V3);
    // a criança no palco, um bloco e pouco na frente do Bento (ao sul dele, de frente para ele)
    const cx = posto[0];
    const cz = posto[2] + 1.3;
    await page.evaluate(({ x, z }) => window.__brumaluz!.teleportar!(x, z), { x: cx, z: cz });
    await page.waitForTimeout(8000);
    const b = await esperarBento(page);
    await page.waitForTimeout(2000);
    await page.evaluate(() => {
      const cena = document.getElementById('cena')!;
      for (const el of Array.from(document.body.querySelectorAll<HTMLElement>('*')))
        if (el !== cena && !el.contains(cena)) el.style.visibility = 'hidden';
    });
    mkdirSync(PASTA, { recursive: true });
    /** As tomadas pelo lugar de verdade dos dois na tela (u: da criança para o Bento; p: de lado). */
    const tomada = (nome: string, c: V3, bb: V3): { p: V3; a: V3 } => {
      const dx = bb[0] - c[0];
      const dz = bb[2] - c[2];
      const d = Math.hypot(dx, dz) || 1;
      const u = [dx / d, dz / d];
      const p = [u[1], -u[0]];
      const meio: V3 = [(c[0] + bb[0]) / 2, c[1] + 1.15, (c[2] + bb[2]) / 2];
      const em = (fu: number, fp: number, h: number): V3 => [
        meio[0] + u[0] * fu + p[0] * fp,
        meio[1] + h,
        meio[2] + u[1] * fu + p[1] * fp,
      ];
      // de lado: os dois de perfil; por cima do ombro dela (o Bento de frente, abraçando); de
      // 3/4 do lado dele (o rostinho dela na barriga peluda)
      const lugar =
        nome === 'lado'
          ? em(0, 3.8, 0.3)
          : nome === 'lado-outro'
            ? em(0, -3.8, 0.3)
            : nome === 'frente-bento'
              ? em(-3.0, 1.4, 0.8)
              : em(1.4, 3.0, 0.2);
      return { p: lugar, a: meio };
    };
    for (const [hora, nomeHora] of [
      [0.7, 'entardecer'],
      [0.85, 'noite'],
    ] as const) {
      await page.evaluate((h) => {
        window.__brumaluz!.hora = h;
      }, hora);
      for (const nome of ['lado', 'lado-outro', 'frente-bento', 'frente-crianca']) {
        await abracar(page, b);
        // já encostados: a câmera vai para o lugar de verdade dos dois e a foto sai no balanço
        await page.waitForFunction(() => (window.__brumaluz!.abracoBaile?.()?.t ?? 0) > 0.45, undefined, {
          timeout: 10_000,
        });
        const est = (await page.evaluate(() => window.__brumaluz!.abracoBaile!()))!;
        const cam = tomada(nome, est.crianca, est.bento ?? [b.x, b.y, b.z]);
        await page.evaluate((cam) => {
          (window as unknown as { __camFixa: unknown }).__camFixa = cam;
        }, cam);
        await page.waitForFunction(() => (window.__brumaluz!.abracoBaile?.()?.t ?? 0) > 0.85, undefined, {
          timeout: 10_000,
        });
        await page.screenshot({ path: `${PASTA}/abraco-${nome}-${nomeHora}-pc.jpg`, type: 'jpeg', quality: 88 });
        // espera o abraço acabar (e o intervalo)
        await page.waitForFunction(() => !window.__brumaluz!.abracoBaile?.(), undefined, { timeout: 10_000 });
        await page.waitForTimeout(600);
        console.log(`FOTO abraco-${nome}-${nomeHora}`);
      }
    }
    await page.context().close();
  });

  test('dois na nuvem: a Bia vê o abraço da Ana, e o soltar', async ({ browser }) => {
    test.setTimeout(600_000);
    const jogador = async (b: Browser, id: string, apelido: string): Promise<Page> => {
      const ctx = await b.newContext({ viewport: { width: 960, height: 540 } });
      await ctx.addInitScript(
        ([i, a]) => {
          localStorage.setItem(
            'terrario:identidade',
            JSON.stringify({ id: i, chave: `chave-de-teste-${i}-0123456789abcdef`, apelido: a }),
          );
          localStorage.setItem(
            'terrario:config',
            JSON.stringify({ distancia: 4, mostrarFps: false, qualidade: 'baixa', mostrarAtalhos: false }),
          );
        },
        [id, apelido],
      );
      const p = await ctx.newPage();
      p.on('pageerror', (e) => console.log(`[${apelido}] erro: ${String(e)}`));
      return p;
    };
    const pronto = (p: Page) => p.waitForFunction(() => window.__brumaluz?.ready, null, { timeout: 180_000 });
    const jogar = (p: Page) =>
      p.evaluate(() => {
        document.querySelector('.entrada')?.setAttribute('hidden', '');
        const e = window.__brumaluz!;
        e.pausarDia = true;
        e.hora = 0.7;
        e.definirClima?.('limpo');
      });
    const ana = await jogador(browser, 'ana-027-abraco', 'Ana');
    // (um mundo da Noite das Fantasias de verdade: o ?tema= é só prévia e não vai para a nuvem)
    await criarMundo(ana, 'abraco-nuvem', 'noite-das-fantasias', {}, 1337);
    await ana.goto('/?mundo=abraco-nuvem');
    await pronto(ana);
    await jogar(ana);
    await ana.evaluate(() => window.dispatchEvent(new CustomEvent('brumaluz:amigos')));
    await ana.locator('[data-abrir-para-amigos]').click();
    await ana.waitForURL(/sala=/, { timeout: 60_000 });
    await pronto(ana);
    await jogar(ana);
    const codigo = await ana.locator('[data-codigo-mundo]').getAttribute('data-codigo-mundo', { timeout: 30_000 });
    await ana.keyboard.press('Escape');
    await ana.evaluate(() => document.querySelector<HTMLElement>('.amigos [data-fechar], .amigos .fechar')?.click());
    const bia = await jogador(browser, 'bia-027-abraco', 'Bia');
    await bia.goto(`/?sala=${codigo}`);
    await bia.locator('[data-entrar-mundo]').click({ timeout: 60_000 });
    await pronto(bia);
    await jogar(bia);
    // as duas no palco: a Ana na frente do Bento, a Bia do lado, a uns 3 blocos
    const posto = await ana.evaluate(() => window.__brumaluz!.baile!()!.pontos.postos.bento as V3);
    await ana.evaluate(({ x, z }) => window.__brumaluz!.teleportar!(x, z), { x: posto[0], z: posto[2] + 1.3 });
    await bia.evaluate(({ x, z }) => window.__brumaluz!.teleportar!(x, z), { x: posto[0] + 3, z: posto[2] + 1.5 });
    const bAna = await esperarBento(ana);
    await esperarBento(bia);
    await bia.waitForFunction(
      () => (window.__brumaluz!.outrosJogadores?.() ?? []).some((o) => o.apelido === 'Ana'),
      null,
      { timeout: 60_000 },
    );
    await ana.waitForTimeout(2000);
    await abracar(ana, bAna);
    // a Ana vê o abraço na tela dela
    await ana.waitForFunction(() => window.__brumaluz!.abracoBaile?.()?.quem === 'ana-027-abraco', undefined, {
      timeout: 10_000,
    });
    // a Bia também: o Bento chega até a Ana na tela dela (o peso sobe) e os dois se abraçam
    await bia.waitForFunction(
      () => {
        const a = window.__brumaluz!.abracoBaile?.();
        return !!a && a.quem === 'ana-027-abraco' && a.peso > 0.9;
      },
      undefined,
      { timeout: 10_000 },
    );
    mkdirSync(PASTA, { recursive: true });
    await bia.screenshot({ path: `${PASTA}/abraco-visto-pela-amiga.jpg`, type: 'jpeg', quality: 80 });
    // as duas no mundo da festa
    expect(await ana.evaluate(() => window.__brumaluz!.tema)).toBe('noite-das-fantasias');
    expect(await bia.evaluate(() => window.__brumaluz!.tema)).toBe('noite-das-fantasias');
    await ana.screenshot({ path: `${PASTA}/abraco-visto-pela-ana.jpg`, type: 'jpeg', quality: 80 });
    // acaba sozinho, nas duas telas
    for (const p of [ana, bia])
      await p.waitForFunction(() => !window.__brumaluz!.abracoBaile?.(), undefined, { timeout: 10_000 });
    // de novo, e a Ana anda no meio: solta na hora, também na tela da Bia
    await ana.waitForTimeout(800);
    await abracar(ana, bAna);
    await bia.waitForFunction(() => (window.__brumaluz!.abracoBaile?.()?.t ?? 0) > 0.3, undefined, {
      timeout: 10_000,
    });
    await ana.evaluate(({ x, z }) => window.__brumaluz!.teleportar!(x, z), { x: posto[0] - 2, z: posto[2] + 1.3 });
    // (o "soltou" do núcleo chega antes do fim do abraço, que leva 2 s)
    const t = await bia.waitForFunction(
      () => {
        const a = window.__brumaluz!.abracoBaile?.();
        return a?.solto ? a.t : null;
      },
      undefined,
      { timeout: 5_000, polling: 30 },
    );
    expect(await t.jsonValue()).toBeLessThan(1.9);
    await ana.context().close();
    await bia.context().close();
  });
});
