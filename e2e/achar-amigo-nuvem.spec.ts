import { expect, test, type Browser, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { MORROS, PASTA, esperarChunks, foto } from './achar-amigo-palco';

/**
 * Spec 021 "Achar o amigo" com dois jogadores de verdade na nuvem (servidor de salas do
 * teste): a carinha da Bia na tela da Ana sem tapar o HUD; tocar acende a trilha; segurar
 * leva a Ana para o lado da Bia pelo núcleo (puf, virada para ela, acenando); pular de novo
 * logo em seguida balança "não"; a Bia aperta Chamar e a carinha dela pulsa na tela da Ana,
 * com o botão da Bia dormindo. Computador e celular (a Ana).
 */
test.describe.configure({ mode: 'serial' });

async function jogador(
  browser: Browser,
  id: string,
  apelido: string,
  op: { viewport: { width: number; height: number }; toque?: boolean },
  aparencia?: Record<string, unknown>,
): Promise<Page> {
  const ctx = await browser.newContext({
    viewport: op.viewport,
    ...(op.toque ? { hasTouch: true, isMobile: true, deviceScaleFactor: 2 } : {}),
  });
  await ctx.addInitScript(
    ([i, a]) => {
      localStorage.setItem(
        'terrario:identidade',
        JSON.stringify({ id: i, chave: `chave-de-teste-${i}-0123456789abcdef`, apelido: a }),
      );
      localStorage.setItem(
        'terrario:config',
        JSON.stringify({ distancia: 7, mostrarFps: true, qualidade: 'alta', mostrarAtalhos: false }),
      );
    },
    [id, apelido],
  );
  if (aparencia)
    await ctx.addInitScript((a) => {
      localStorage.setItem('terrario:aparencia', JSON.stringify({ versao: 1, aparencia: a }));
    }, aparencia);
  const p = await ctx.newPage();
  p.on('pageerror', (e) => console.log(`[${apelido}] erro: ${String(e)}`));
  return p;
}
const pronto = (p: Page) =>
  p.waitForFunction(() => window.__brumaluz?.ready, null, { timeout: 180_000 });
const ressincronizacoes = (p: Page) =>
  p.evaluate(() => window.__brumaluz?.ressincronizacoes ?? 0);
const jogar = (p: Page) =>
  p.evaluate(() => {
    document.querySelector('.entrada')?.setAttribute('hidden', '');
    const e = window.__brumaluz!;
    e.pausarDia = true;
    e.hora = 0.42;
    e.definirClima?.('limpo');
  });

/** Põe o jogador num chão aberto perto de (x, z), olhando para yaw. */
async function chaoAberto(p: Page, x0: number, z0: number, yaw: number) {
  return p.evaluate(
    ([x0, z0, yaw]) => {
      const e = window.__brumaluz!;
      const folhas = [5, 28, 30, 35, 55];
      for (let r = 0; r < 40; r += 2)
        for (let k = 0; k < 16; k++) {
          const x = Math.floor(x0 + Math.cos((k / 16) * Math.PI * 2) * r) + 0.5;
          const z = Math.floor(z0 + Math.sin((k / 16) * Math.PI * 2) * r) + 0.5;
          for (let y = 120; y > 2; y--) {
            const de = e.bloco!(Math.floor(x), y - 1, Math.floor(z));
            if (!de) continue;
            if (de === 67 || folhas.includes(de)) break;
            let aberto = true;
            for (let dx = -2; dx <= 2 && aberto; dx++)
              for (let dz = -2; dz <= 2 && aberto; dz++)
                for (let dy = 0; dy < 3; dy++) {
                  const bl = e.bloco!(Math.floor(x) + dx, y + dy, Math.floor(z) + dz);
                  if (bl && bl !== 8 && bl !== 9 && bl !== 54) {
                    aberto = false;
                    break;
                  }
                }
            if (!aberto) break;
            e.teleportar!(x, z, y);
            e.apontar!(yaw, 0.18);
            return [x, y, z] as [number, number, number];
          }
        }
      return null;
    },
    [x0, z0, yaw] as const,
  );
}

const TELAS = [
  { pre: 'computador', viewport: { width: 1280, height: 720 }, toque: false },
  { pre: 'celular', viewport: { width: 390, height: 844 }, toque: true },
] as const;

for (const tela of TELAS) {
  test(`dois na nuvem: carinha, trilha, pular e chamar (${tela.pre})`, async ({ browser }) => {
    test.setTimeout(900_000);
    mkdirSync(PASTA, { recursive: true });
    const pre = `nuvem-${tela.pre}`;
    const ana = await jogador(browser, `ana-021-${tela.pre}`, 'Ana', tela);
    await ana.goto('/?tema=rancho-alegre');
    await pronto(ana);
    await jogar(ana);
    await ana.evaluate(() => window.dispatchEvent(new CustomEvent('brumaluz:amigos')));
    await ana.locator('[data-abrir-para-amigos]').click();
    await ana.waitForURL(/sala=/, { timeout: 60_000 });
    await pronto(ana);
    await jogar(ana);
    const codigo = await ana
      .locator('[data-codigo-mundo]')
      .getAttribute('data-codigo-mundo', { timeout: 30_000 });
    await ana.keyboard.press('Escape');
    await ana.evaluate(() => document.querySelector<HTMLElement>('.amigos [data-fechar], .amigos .fechar')?.click());

    // a Bia de fazendeira (a Ana vê a cabeça dela na carinha)
    const bia = await jogador(
      browser,
      `bia-021-${tela.pre}`,
      'Bia',
      { viewport: { width: 960, height: 540 } },
      { corpo: 'feminino', cabeloEstilo: 5, cabeloCor: 1, pele: 1, fantasia: { id: 'fazendeira', cor: 0 } },
    );
    await bia.goto(`/?sala=${codigo}`);
    await bia.locator('[data-entrar-mundo]').click({ timeout: 60_000 });
    await pronto(bia);
    await jogar(bia);
    await ana.waitForFunction(
      () => (window.__brumaluz!.outrosJogadores?.() ?? []).some((o) => o.apelido === 'Bia'),
      null,
      { timeout: 60_000 },
    );

    // os dois no Rancho com morros; a Bia a ~55 blocos, à esquerda da Ana
    await ana.evaluate(([x, z]) => window.__brumaluz!.teleportar!(x, z), MORROS);
    await esperarChunks(ana);
    const pa = await chaoAberto(ana, MORROS[0], MORROS[1], 0.6);
    expect(pa).not.toBeNull();
    const yaw = 0.6;
    const bx = pa![0] + Math.sin(yaw - 1.9) * 55;
    const bz = pa![2] + Math.cos(yaw - 1.9) * 55;
    await bia.evaluate(([x, z]) => window.__brumaluz!.teleportar!(x, z), [bx, bz] as const);
    await esperarChunks(bia);
    await chaoAberto(bia, bx, bz, 0);
    await ana.waitForTimeout(3000);
    await ana.evaluate((y) => window.__brumaluz!.apontar!(y, 0.18), yaw);
    await ana.waitForTimeout(1500);

    // ---- a carinha da Bia na borda, sem tapar o HUD
    const v = await foto(ana, `${pre}-1-carinha-bia`);
    const cara = v.find((x) => x.tipo === 'carinha');
    expect(cara, 'a carinha da Bia aparece').toBeTruthy();
    const idBia = cara!.ids[0];

    // ---- tocar: trilha
    if (tela.toque) await ana.touchscreen.tap(cara!.x, cara!.y);
    else await ana.mouse.click(cara!.x, cara!.y);
    await ana.waitForTimeout(400);
    const passos = await ana.evaluate(() => window.__brumaluz!.acharAmigo!.caminho().length);
    console.log('achar nuvem trilha passos', passos);
    expect(passos).toBeGreaterThan(10);
    await ana.evaluate((y) => window.__brumaluz!.apontar!(y, 0.42), yaw - 1.0);
    await ana.waitForTimeout(1500);
    await foto(ana, `${pre}-3-trilha`);

    // ---- segurar: o anel enche (quadro parado para a foto) e, de verdade, pula
    await ana.evaluate((y) => window.__brumaluz!.apontar!(y, 0.18), yaw);
    await ana.waitForTimeout(800);
    const c2 = (await ana.evaluate(() => window.__brumaluz!.acharAmigo!.vistos())).find((x) => x.tipo === 'carinha')!;
    await ana.evaluate((id) => window.__brumaluz!.acharAmigo!.segurar(id, 0.65), idBia);
    await ana.waitForTimeout(150);
    await foto(ana, `${pre}-4-pular-segurando`);
    await ana.evaluate(() => window.__brumaluz!.acharAmigo!.segurar(null));
    const t0 = Date.now();
    if (tela.toque) {
      // o dedo segurando (toque de verdade pelo protocolo do navegador)
      const cdp = await ana.context().newCDPSession(ana);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: c2.x, y: c2.y }] });
      await ana.waitForTimeout(1050);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    } else {
      await ana.mouse.move(c2.x, c2.y);
      await ana.mouse.down();
      await ana.waitForTimeout(1050);
      await ana.mouse.up();
    }
    await ana.waitForTimeout(80);
    await ana.screenshot({ path: `${PASTA}/${pre}-4-pular-poeira-saindo.jpg`, quality: 88 });
    await ana.waitForFunction(() => window.__brumaluz!.acharAmigo!.pulos() > 0, null, { timeout: 5000 });
    await ana.waitForTimeout(420);
    await ana.screenshot({ path: `${PASTA}/${pre}-4-pular-poeira-chegando.jpg`, quality: 88 });
    const dist = await ana.evaluate(() => {
      const e = window.__brumaluz!;
      const [x, , z] = e.jogadorPes!();
      const b = (e.outrosJogadores?.() ?? []).find((o) => o.apelido === 'Bia')!;
      return Math.hypot(b.x - x, b.z - z);
    });
    console.log('achar nuvem pulou em', Date.now() - t0, 'ms, ficou a', dist.toFixed(1), 'blocos');
    expect(dist).toBeLessThan(9);
    expect(Date.now() - t0).toBeLessThan(2500);
    await ana.waitForTimeout(500);
    const aceno = await ana.evaluate(() => window.__brumaluz!.gestos!.local().gesto);
    expect(aceno).toBe('acenar');
    await foto(ana, `${pre}-4-pular-ao-lado-acenando`);
    // o servidor ficou com a posição nova (nada de puxar de volta)
    await ana.waitForTimeout(2500);
    const dist2 = await ana.evaluate(() => {
      const e = window.__brumaluz!;
      const [x, , z] = e.jogadorPes!();
      const b = (e.outrosJogadores?.() ?? []).find((o) => o.apelido === 'Bia')!;
      return Math.hypot(b.x - x, b.z - z);
    });
    expect(dist2).toBeLessThan(9);

    // ---- pular de novo logo em seguida: "não" (intervalo de 10 s)
    await ana.evaluate(() => window.__brumaluz!.teleportar!(window.__brumaluz!.jogadorPes!()[0] + 30, window.__brumaluz!.jogadorPes!()[2]));
    await ana.waitForTimeout(1500);
    await ana.evaluate((id) => window.__brumaluz!.acharAmigo!.pular(id), idBia);
    await ana.waitForTimeout(150);
    const nao = await ana.evaluate(() => !!document.querySelector('.carinha-amigo.nao'));
    expect(nao).toBe(true);
    await foto(ana, `${pre}-4-pular-nao`);

    // ---- a Bia chama: a carinha dela pulsa na tela da Ana; o botão dela dorme
    await bia.locator('.botao-chamar').click();
    await bia.waitForTimeout(400);
    await bia.screenshot({ path: `${PASTA}/${pre}-5-chamar-apertou-bia.jpg`, quality: 88 });
    await expect(bia.locator('.botao-chamar.dormindo')).toBeVisible();
    await ana.waitForFunction(() => window.__brumaluz!.acharAmigo!.chamando() !== null, null, { timeout: 5000 });
    await ana.waitForTimeout(600);
    const vc = await foto(ana, `${pre}-5-chamar-recebendo`);
    expect(vc.find((x) => x.chamando)).toBeTruthy();
    // apertar de novo dormindo não manda nada
    const antes = await bia.evaluate(() => window.__brumaluz!.acharAmigo!.chamadas());
    await bia.locator('.botao-chamar').click({ force: true });
    expect(await bia.evaluate(() => window.__brumaluz!.acharAmigo!.chamadas())).toBe(antes);
    // spec 035: na entrada normal, a rede de segurança não ressincroniza nunca
    expect(await ressincronizacoes(ana), 'a Ana não ressincronizou').toBe(0);
    expect(await ressincronizacoes(bia), 'a Bia não ressincronizou').toBe(0);
    await ana.context().close();
    await bia.context().close();
  });
}
