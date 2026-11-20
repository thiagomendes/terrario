import { expect, test, type CDPSession, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { abrirMundo, assentar, type Tamanho } from './guia-palco';
import {
  ROLETA_ABERTA,
  esperarAssentar,
  itensDaRoleta,
  meioDaRoleta,
  roletaAberta,
  tocarComDedo,
} from './roleta-palco';

/**
 * Spec 033 (dono, 18 nov 2026): a roleta no lugar da roda do menu, com dedo de verdade (os
 * toques e arrastes pelo protocolo do Chromium), em pé e deitado:
 * abrir, arrastar, a volta sem fim, tocar num vizinho (rola até o meio), escolher, entrar em
 * Gestos, a plaquinha "Voltar" (com a carinha de Gestos) e "Fechar", tocar fora (sobe um nível;
 * na de cima, fecha), fechar sozinha em 8 s, e a barrinha, o joystick e os botões que dão
 * licença enquanto ela está aberta e voltam quando fecha.
 *
 * E a câmera do celular: começa a 5,06 blocos em pé e 4,75 deitado, virar o celular troca a de
 * começo (se a criança não mexeu na pinça) e a pinça continua.
 */
test.setTimeout(420_000);
test.use({ actionTimeout: 30_000 });
const PASTA = 'capturas-033/roleta';

const menu = (page: Page) => page.evaluate(() => window.__brumaluz!.gestos!.menu());

/** O meio da fileira (px CSS): onde fica o botão do meio. */
async function trilho(page: Page) {
  return page.evaluate(() => {
    const r = document.querySelector('[data-roleta] .bandeja')!.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + 8 + 48, top: r.top, bottom: r.bottom };
  });
}

async function tocarEm(cdp: CDPSession, page: Page, x: number, y: number) {
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  await page.waitForTimeout(90);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}

/**
 * O toque num botão: um toque de dedo de verdade no meio dele, o `tap()` do Playwright (encosta e
 * solta pelo protocolo do Chromium; `tocarComDedo`). Spec 034: com o `Input.synthesizeTapGesture`,
 * na placa de vídeo o botão da roda não abria o menu. Spec 034 (T14): na nuvem, sem placa de
 * vídeo (1 quadro por segundo), o encostar e o soltar chegam à página em quadros diferentes e
 * passam dos 600 ms que separam o toque do arraste parado, e a roleta fecha sozinha (8 s) antes
 * do passo seguinte: este teste se confere na placa de vídeo.
 */
async function tocarSeletor(_cdp: CDPSession, page: Page, sel: string) {
  await tocarComDedo(page, sel);
}

/** Um dedinho: encosta, arrasta `dx` em `ms` (devagar no começo e no fim) e solta. */
async function arrastar(cdp: CDPSession, page: Page, x: number, y: number, dx: number, ms: number) {
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  const passos = Math.max(4, Math.round(ms / 16));
  for (let i = 1; i <= passos; i++) {
    const f = 0.5 - Math.cos((i / passos) * Math.PI) / 2;
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: x + dx * f, y: y + Math.sin(i / 3) * 1.5 }],
    });
    await page.waitForTimeout(ms / passos);
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}

/** O que dá licença (a barrinha, o joystick e os botões): escondido agora? */
const licenca = (page: Page) =>
  page.evaluate(() =>
    ['.barra', '.toque .joystick', '.toque .botoes'].map((s) => {
      const el = document.querySelector<HTMLElement>(s);
      if (!el) return `${s}: sem`;
      const st = getComputedStyle(el);
      return `${s}: ${el.classList.contains('sob-roleta') && st.pointerEvents === 'none' ? 'escondido' : 'visivel'}`;
    }),
  );

const tudo = (estado: 'escondido' | 'visivel') => [
  `.barra: ${estado}`,
  `.toque .joystick: ${estado}`,
  `.toque .botoes: ${estado}`,
];

for (const tamanho of ['empe', 'deitado'] as Tamanho[])
  test(`roleta com o dedo, ${tamanho}`, async ({ browser }) => {
    mkdirSync(PASTA, { recursive: true });
    const page = await abrirMundo(browser, { id: `roleta-${tamanho}`, tema: 'padrao', tamanho });
    const erros: string[] = [];
    page.on('pageerror', (e) => erros.push(String(e)));
    await page.evaluate(() => document.body.classList.add('toque-ativo'));
    await assentar(page);
    const cdp = await page.context().newCDPSession(page);
    const tela = page.viewportSize()!;
    const foto = (nome: string) => page.screenshot({ path: `${PASTA}/${tamanho}-${nome}.png` });

    // o joystick (onde fica antes de abrir): a plaquinha nunca cobre
    const joy = (await page.locator('.toque .joystick').boundingBox())!;
    expect(await licenca(page)).toEqual(tudo('visivel'));

    // abrir pelo botão de cima: a roleta embaixo, a barrinha e os controles dão licença
    await tocarSeletor(cdp, page, '[data-botao-roda]');
    await expect.poll(() => menu(page)).toBe('menu');
    await esperarAssentar(page);
    // a bandeja sobe de leve ao abrir (0,24 s)
    await page.waitForTimeout(500);
    await expect.poll(() => licenca(page)).toEqual(tudo('escondido'));
    const itens = await itensDaRoleta(page);
    expect(itens[0]).toBe('mapa');
    expect(await meioDaRoleta(page)).toBe('mapa');
    const t = await trilho(page);
    expect(t.bottom).toBeLessThanOrEqual(tela.height);
    expect(t.bottom).toBeGreaterThan(tela.height - 30);
    // o do meio: 96 px, com o nome embaixo; o vizinho a 78 %
    const meio = (await page.locator(`${ROLETA_ABERTA} .item.meio`).boundingBox())!;
    expect(Math.round(meio.width)).toBe(96);
    await expect(page.locator(`${ROLETA_ABERTA} [data-nome-meio]`)).toHaveText('Mapa');
    const viz = (await page.locator(`${ROLETA_ABERTA} .item[data-item="${itens[1]}"]`).boundingBox())!;
    expect(viz.width / meio.width).toBeCloseTo(0.78, 1);
    // a plaquinha "Fechar": em pé no meio, deitado à esquerda; nunca no joystick
    const placa = page.locator(`${ROLETA_ABERTA} .voltar.ativo`);
    await expect(placa).toContainText('Fechar');
    await page.waitForTimeout(400);
    const pb = (await placa.boundingBox())!;
    if (tamanho === 'empe') expect(Math.abs(pb.x + pb.width / 2 - tela.width / 2)).toBeLessThan(3);
    else expect(pb.x + pb.width).toBeLessThan(tela.width / 3);
    // (o joystick some enquanto a roleta está aberta; a plaquinha fica longe da bolinha dele,
    // a metade do meio do poço, onde o polegar encosta)
    const nucleo = {
      x: joy.x + joy.width / 4,
      y: joy.y + joy.height / 4,
      w: joy.width / 2,
      h: joy.height / 2,
    };
    const cobre =
      pb.x < nucleo.x + nucleo.w && nucleo.x < pb.x + pb.width && pb.y < nucleo.y + nucleo.h && nucleo.y < pb.y + pb.height;
    expect(cobre).toBe(false);
    expect(pb.y + pb.height).toBeLessThanOrEqual(t.top);
    expect(pb.height).toBeGreaterThanOrEqual(56);
    await foto('1-aberta');

    // arrastar para a esquerda traz o seguinte (um quarto de passo já anda)
    await arrastar(cdp, page, t.x + 40, t.y, -70, 480);
    await esperarAssentar(page);
    expect(await meioDaRoleta(page)).toBe(itens[1]);
    // e de volta, e mais uma para a direita: a volta sem fim (do primeiro vai para o último)
    await arrastar(cdp, page, t.x - 40, t.y, 70, 480);
    await esperarAssentar(page);
    expect(await meioDaRoleta(page)).toBe('mapa');
    await arrastar(cdp, page, t.x - 40, t.y, 70, 480);
    await esperarAssentar(page);
    expect(await meioDaRoleta(page)).toBe(itens[itens.length - 1]);
    await foto('2-volta-sem-fim');

    // tocar num vizinho rola até ele (não escolhe); tocar no meio escolhe
    await tocarSeletor(cdp, page, `${ROLETA_ABERTA} .item[data-item="mapa"]`);
    await esperarAssentar(page);
    expect(await meioDaRoleta(page)).toBe('mapa');
    expect(await menu(page)).toBe('menu');
    // até Gestos, um vizinho por vez (como a criança)
    for (let i = 0; i < itens.length && (await meioDaRoleta(page)) !== 'gestos'; i++) {
      const m = itens.indexOf(await meioDaRoleta(page));
      await tocarSeletor(cdp, page, `${ROLETA_ABERTA} .item[data-item="${itens[(m + 1) % itens.length]}"]`);
      await esperarAssentar(page);
    }
    expect(await meioDaRoleta(page)).toBe('gestos');
    await tocarSeletor(cdp, page, `${ROLETA_ABERTA} .item.meio`);
    await expect.poll(() => menu(page)).toBe('gestos');
    await esperarAssentar(page);
    // dentro de Gestos: "Voltar" com a carinha de Gestos, no mesmo lugar da "Fechar"
    await expect(placa).toContainText('Voltar');
    await expect(placa.locator('.pai svg')).toHaveCount(1);
    await page.waitForTimeout(500);
    const pv = (await placa.boundingBox())!;
    if (tamanho === 'empe') expect(Math.abs(pv.x + pv.width / 2 - tela.width / 2)).toBeLessThan(3);
    else expect(Math.abs(pv.x - pb.x)).toBeLessThan(2);
    expect(Math.abs(pv.y - pb.y)).toBeLessThan(2);
    await foto('3-gestos');
    // a plaquinha volta para o menu
    await tocarSeletor(cdp, page, `${ROLETA_ABERTA} .voltar.ativo`);
    await expect.poll(() => menu(page)).toBe('menu');
    await expect(placa).toContainText('Fechar');
    // a fileira do menu volta correndo de lado e para em Gestos (de onde a criança veio)
    await esperarAssentar(page);
    expect(await meioDaRoleta(page)).toBe('gestos');
    // de novo em Gestos; tocar fora sobe um nível e, de novo, fecha
    await tocarSeletor(cdp, page, `${ROLETA_ABERTA} .item.meio`);
    await expect.poll(() => menu(page)).toBe('gestos');
    await page.waitForTimeout(500);
    await tocarEm(cdp, page, tela.width / 2, tamanho === 'empe' ? 280 : 120);
    await expect.poll(() => menu(page)).toBe('menu');
    await page.waitForTimeout(300);
    await tocarEm(cdp, page, tela.width / 2, tamanho === 'empe' ? 280 : 120);
    await expect.poll(() => menu(page)).toBe(null);
    // fechou: a barrinha e os controles voltam (e o toque fora não mexeu no mundo)
    await expect.poll(() => licenca(page)).toEqual(tudo('visivel'));
    expect(await page.evaluate(() => window.__brumaluz!.mineracao!.segurando)).toBe(false);

    // "Fechar" fecha
    await tocarSeletor(cdp, page, '[data-botao-roda]');
    await expect.poll(() => menu(page)).toBe('menu');
    await page.waitForTimeout(500);
    await tocarSeletor(cdp, page, `${ROLETA_ABERTA} .voltar.ativo`);
    await expect.poll(() => menu(page)).toBe(null);
    await expect.poll(() => licenca(page)).toEqual(tudo('visivel'));

    // fecha sozinha em 8 s (sem mexer)
    await tocarSeletor(cdp, page, '[data-botao-roda]');
    await expect.poll(() => menu(page)).toBe('menu');
    const t0 = Date.now();
    await expect.poll(() => roletaAberta(page), { timeout: 12_000 }).toBe(false);
    const durou = (Date.now() - t0) / 1000;
    console.log(`ROLETA ${tamanho} fechou sozinha em ${durou.toFixed(1)} s`);
    expect(durou).toBeGreaterThan(7);
    expect(durou).toBeLessThan(10);
    await expect.poll(() => licenca(page)).toEqual(tudo('visivel'));

    // escolher um gesto: o boneco dança e a roleta fecha
    await tocarSeletor(cdp, page, '[data-botao-roda]');
    await esperarAssentar(page);
    expect(await meioDaRoleta(page)).toBe('gestos');
    await tocarSeletor(cdp, page, `${ROLETA_ABERTA} .item.meio`);
    await expect.poll(() => menu(page)).toBe('gestos');
    const gestos = await itensDaRoleta(page);
    for (let i = 0; i < gestos.length && (await meioDaRoleta(page)) !== 'dancar'; i++) {
      await esperarAssentar(page);
      const m = gestos.indexOf(await meioDaRoleta(page));
      await tocarSeletor(cdp, page, `${ROLETA_ABERTA} .item[data-item="${gestos[(m + 1) % gestos.length]}"]`);
      await esperarAssentar(page);
    }
    await tocarSeletor(cdp, page, `${ROLETA_ABERTA} .item.meio`);
    await expect.poll(() => page.evaluate(() => window.__brumaluz!.gestos!.local().gesto)).toBe('dancar');
    await expect.poll(() => menu(page)).toBe(null);
    await foto('4-dancando');
    expect(erros).toEqual([]);
    await page.context().close();
  });

/** Dois dedos na área do olhar: abrir aproxima, fechar afasta. */
async function pinca(page: Page, de: number, para: number) {
  await page.evaluate(
    ([de, para]) => {
      const el = document.querySelector<HTMLElement>('[data-toque] .olhar')!;
      const cx = innerWidth / 2;
      const cy = innerHeight * 0.4;
      const ev = (tipo: string, id: number, x: number) =>
        el.dispatchEvent(
          new PointerEvent(tipo, {
            pointerId: id,
            pointerType: 'touch',
            clientX: x,
            clientY: cy,
            bubbles: true,
            isPrimary: id === 11,
          }),
        );
      ev('pointerdown', 11, cx - de);
      ev('pointerdown', 12, cx + de);
      for (let i = 1; i <= 8; i++) {
        const d = de + ((para - de) * i) / 8;
        ev('pointermove', 11, cx - d);
        ev('pointermove', 12, cx + d);
      }
      ev('pointerup', 11, cx - para);
      ev('pointerup', 12, cx + para);
    },
    [de, para],
  );
}

test('câmera do celular: começa mais afastada (5,06 em pé, 4,75 deitado) e a pinça continua', async ({
  browser,
}) => {
  const page = await abrirMundo(browser, { id: 'roleta-camera', tema: 'padrao', tamanho: 'empe' });
  await assentar(page);
  const zoom = () => page.evaluate(() => window.__brumaluz!.camera!.zoom());
  expect(await zoom()).toBeCloseTo(5.06, 5);
  // virou o celular sem mexer na pinça: a de começo deitado
  await page.setViewportSize({ width: 844, height: 390 });
  await page.evaluate(() => window.dispatchEvent(new Event('resize')));
  await expect.poll(zoom).toBeCloseTo(4.75, 5);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => window.dispatchEvent(new Event('resize')));
  await expect.poll(zoom).toBeCloseTo(5.06, 5);
  // a pinça aproxima e afasta, dentro de 2,5 a 7
  await pinca(page, 40, 120);
  await expect.poll(zoom).toBeLessThan(5.06 - 0.5);
  const perto = await zoom();
  await pinca(page, 120, 30);
  await expect.poll(zoom).toBeGreaterThan(perto + 0.5);
  const escolhido = await zoom();
  expect(escolhido).toBeGreaterThanOrEqual(2.5);
  expect(escolhido).toBeLessThanOrEqual(7);
  // depois da pinça, virar o celular não muda a distância que a criança escolheu
  await page.setViewportSize({ width: 844, height: 390 });
  await page.evaluate(() => window.dispatchEvent(new Event('resize')));
  await page.waitForTimeout(500);
  expect(await zoom()).toBeCloseTo(escolhido, 5);
  await page.context().close();
});

test('câmera do computador: a de sempre', async ({ browser }) => {
  const page = await abrirMundo(browser, { id: 'roleta-camera-pc', tema: 'padrao', tamanho: 'pc' });
  await assentar(page);
  expect(await page.evaluate(() => window.__brumaluz!.camera!.zoom())).toBeCloseTo(3.8, 5);
  await page.context().close();
});
