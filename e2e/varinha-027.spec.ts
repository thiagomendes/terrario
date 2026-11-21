import { expect, test, type Browser, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { criarMundo } from './guia-palco';

/**
 * Spec 027 (T16): a varinha de condão, com duas amigas na nuvem. A Ana, de bruxinha, toca no
 * chão: a mão sobe, saem as estrelinhas e nasce a florzinha; a Bia, perto, vê a mesma flor; em
 * ~4 s ela some nas duas telas e nada fica no mundo. Com `VARINHA_027=1`, as fotos (a mão
 * subindo com a flor nascendo e a flor aberta, no entardecer e de noite) em
 * `capturas-027/parte1/varinha/`.
 */
declare const process: { env: Record<string, string | undefined> };
const PASTA = 'capturas-027/parte1/varinha';

test('dois na nuvem: a Bia vê a florzinha da varinha da Ana, e ela some sozinha', async ({ browser }) => {
  test.setTimeout(600_000);
  const jogador = async (b: Browser, id: string, apelido: string): Promise<Page> => {
    const ctx = await b.newContext({ viewport: { width: 1280, height: 720 } });
    await ctx.addInitScript(
      ([i, a]) => {
        localStorage.setItem(
          'terrario:identidade',
          JSON.stringify({ id: i, chave: `chave-de-teste-${i}-0123456789abcdef`, apelido: a }),
        );
        localStorage.setItem(
          'terrario:config',
          JSON.stringify({ distancia: 4, mostrarFps: false, qualidade: 'alta', mostrarAtalhos: false }),
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
  const ana = await jogador(browser, 'ana-027-varinha', 'Ana');
  await criarMundo(ana, 'varinha-nuvem', 'noite-das-fantasias', {}, 1337);
  await ana.goto('/?mundo=varinha-nuvem');
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
  // a Ana de bruxinha (com a varinha)
  await ana.evaluate(() => window.__brumaluz!.personagem!.definir({ fantasia: { id: 'bruxinha-festa', cor: 0 } } as never));
  const bia = await jogador(browser, 'bia-027-varinha', 'Bia');
  await bia.goto(`/?sala=${codigo}`);
  await bia.locator('[data-entrar-mundo]').click({ timeout: 60_000 });
  await pronto(bia);
  await jogar(bia);
  for (const p of [ana, bia])
    await p.addStyleTag({ content: '.toast-area, .dica-mira { display: none !important; }' });
  // as duas na praça, a Bia a uns 3 blocos da Ana, olhando para onde a flor vai nascer
  const lugar = await ana.evaluate(() => {
    const b = window.__brumaluz!.baile!()!;
    return { x: b.nascimento.x, z: b.nascimento.z - 6, y: b.h + 1 };
  });
  const flor = { x: lugar.x + 0.5, y: lugar.y, z: lugar.z + 2.5 };
  await ana.evaluate(({ x, z, f }) => {
    const e = window.__brumaluz!;
    e.teleportar!(x, z);
    e.apontar!(Math.atan2(f.x - x, f.z - z), 0.35);
    // (de frente para onde a flor vai nascer, como quando a criança toca no chão à frente)
    e.travarYaw?.(Math.atan2(f.x - x, f.z - z));
  }, { x: lugar.x, z: lugar.z, f: flor });
  await bia.evaluate(({ x, z, f }) => {
    const e = window.__brumaluz!;
    e.teleportar!(x, z);
    e.apontar!(Math.atan2(f.x - x, f.z - z), 0.3);
  }, { x: lugar.x + 2.6, z: lugar.z + 4.6, f: flor });
  await bia.waitForFunction(
    () => (window.__brumaluz!.outrosJogadores?.() ?? []).some((o) => o.apelido === 'Ana'),
    null,
    { timeout: 60_000 },
  );
  await ana.waitForTimeout(2500);
  const fotos = !!process.env.VARINHA_027;
  if (fotos) {
    mkdirSync(PASTA, { recursive: true });
    // as câmeras das fotos: na tela da Ana, de 3/4 pela frente dela (a mão, a varinha e a flor);
    // na da Bia, de onde ela está, olhando a flor e a Ana
    const fixar = (p: Page, cam: { p: number[]; a: number[] }) =>
      p.evaluate((cam) => {
        const e = window.__brumaluz!;
        e.cenaBabylon!().onBeforeCameraRenderObservable.add((c) => {
          const k = c as unknown as {
            position: { set(...a: number[]): void; clone(): { set(...a: number[]): unknown } };
            setTarget(v: unknown): void;
          };
          k.position.set(...cam.p);
          const alvo = k.position.clone();
          alvo.set(...cam.a);
          k.setTarget(alvo);
          (c.getScene() as unknown as { setTransformMatrix(a: unknown, b: unknown): void }).setTransformMatrix(
            (c as unknown as { getViewMatrix(f: boolean): unknown }).getViewMatrix(true),
            (c as unknown as { getProjectionMatrix(f: boolean): unknown }).getProjectionMatrix(true),
          );
        });
      }, cam);
    const meio = [(lugar.x + flor.x) / 2, lugar.y + 0.7, (lugar.z + flor.z) / 2];
    await fixar(ana, { p: [lugar.x + 3.2, lugar.y + 1.6, lugar.z + 3.6], a: meio });
    // (por cima do ombro da Bia, um pouco atrás e para o lado: ela, a Ana e a flor)
    await fixar(bia, { p: [lugar.x + 5.6, lugar.y + 2.2, lugar.z + 4.2], a: meio });
  }
  for (const [hora, nome] of fotos
    ? ([
        [0.7, 'entardecer'],
        [0.85, 'noite'],
      ] as const)
    : ([[0.7, 'entardecer']] as const)) {
    for (const p of [ana, bia])
      await p.evaluate((h) => {
        window.__brumaluz!.hora = h;
      }, hora);
    await ana.waitForTimeout(800);
    await ana.evaluate((f) => window.__brumaluz!.varinha!(f.x, f.y, f.z), flor);
    // a flor nasce nas duas telas (a da Ana pelo evento do núcleo, como a da Bia)
    for (const p of [ana, bia])
      await p.waitForFunction(() => (window.__brumaluz!.floresVarinha?.()?.flores ?? 0) === 1, undefined, {
        timeout: 5_000,
      });
    if (fotos) {
      await ana.waitForTimeout(250);
      await ana.screenshot({ path: `${PASTA}/varinha-ana-nascendo-${nome}-pc.jpg`, type: 'jpeg', quality: 88 });
      await ana.waitForTimeout(900);
      await ana.screenshot({ path: `${PASTA}/varinha-ana-flor-${nome}-pc.jpg`, type: 'jpeg', quality: 88 });
      await bia.screenshot({ path: `${PASTA}/varinha-vista-pela-bia-${nome}-pc.jpg`, type: 'jpeg', quality: 88 });
    }
    // em ~4 s some sozinha, nas duas telas, e nenhuma peça fica
    for (const p of [ana, bia])
      await p.waitForFunction(() => window.__brumaluz!.floresVarinha?.()?.malhas === 0, undefined, {
        timeout: 6_000,
      });
    const ev = await bia.evaluate(() => window.__brumaluz!.eventosFlor ?? []);
    expect(ev.some((e) => e.quem === 'ana-027-varinha')).toBe(true);
    await ana.waitForTimeout(800);
  }
  await ana.context().close();
  await bia.context().close();
});
