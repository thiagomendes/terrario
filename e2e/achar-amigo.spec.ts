import { expect, test, type Page } from '@playwright/test';
import { MATA, MORROS, abrir, andarTrilha, esconder, foto, irPara, porAmigos, voltar } from './achar-amigo-palco';

/**
 * Spec 021 "Achar o amigo", no jogo de verdade, com amigos de mentirinha (o gancho de teste
 * `amigosDeTeste`: os bonecos de verdade, com fantasia, sem rede). O pulo e o chamar de
 * verdade, pelo núcleo, ficam em `achar-amigo-nuvem.spec.ts` (dois jogadores na nuvem).
 *
 * Computador (1280x720) e celular (390x844 e 844x390, toque), de dia, no Rancho com morros.
 * Cada captura confere que nenhuma carinha tapa o HUD.
 */
test.describe.configure({ mode: 'serial' });

const vistos = (page: Page) => page.evaluate(() => window.__brumaluz!.acharAmigo!.vistos());

const TELAS = [
  { pre: 'computador', viewport: { width: 1280, height: 720 }, toque: false },
  { pre: 'celular', viewport: { width: 390, height: 844 }, toque: true },
  { pre: 'celular-deitado', viewport: { width: 844, height: 390 }, toque: true },
] as const;

for (const tela of TELAS) {
  test.describe(tela.pre, () => {
    if (tela.toque)
      test.use({ viewport: tela.viewport, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
    else test.use({ viewport: tela.viewport });

    test(`carinha na borda (${tela.pre})`, async ({ page }) => {
      test.setTimeout(600_000);
      const pre = tela.pre;
      await abrir(page);
      const b = await irPara(page, MORROS, 0.6);
      await page.waitForTimeout(2500);
      // longe, do lado esquerdo: carinha presa na borda esquerda
      await porAmigos(page, b, [['lia', -1.9, 60]]);
      await page.waitForTimeout(2500);
      let v = await foto(page, `${pre}-1-carinha-longe`);
      expect(v.map((x) => x.tipo)).toEqual(['carinha']);
      expect(v[0].x).toBeLessThan(tela.viewport.width / 2);
      const longe = v[0].r;
      // perto: maior
      await porAmigos(page, b, [['lia', 1.5, 18]]);
      await page.waitForTimeout(900);
      v = await foto(page, `${pre}-1-carinha-perto`);
      expect(v[0].r).toBeGreaterThan(longe);
      expect(v[0].x).toBeGreaterThan(tela.viewport.width / 2);
      // atrás: vai para baixo
      await porAmigos(page, b, [['lia', Math.PI - 0.5, 40]]);
      await page.waitForTimeout(900);
      v = await foto(page, `${pre}-1-carinha-atras`);
      expect(v[0].y).toBeGreaterThan(tela.viewport.height / 2);
      // à vista: sem carinha
      await porAmigos(page, b, [['lia', 0.12, 16]]);
      await page.waitForTimeout(900);
      v = await foto(page, `${pre}-1-a-vista-sem-carinha`);
      expect(v).toEqual([]);
      // perto de verdade (< 12 blocos), atrás: sem carinha
      await porAmigos(page, b, [['lia', Math.PI, 8]]);
      await page.waitForTimeout(900);
      expect(await vistos(page)).toEqual([]);
      // escondida pelo morro: a carinha em cima dela, sem seta
      const esc = await esconder(page, b, 'lia', 30, 60);
      console.log('achar escondida em', esc);
      if (esc) {
        await page.waitForTimeout(600);
        v = await foto(page, `${pre}-1-carinha-tapada-morro`);
        expect(v[0]?.borda).toBe(false);
      }
      // troca de fantasia ao vivo: a foto muda
      await porAmigos(page, b, [['lia', -1.9, 60]]);
      await page.waitForTimeout(1500);
      const antes = await page.evaluate(() => {
        const c = document.querySelector<HTMLCanvasElement>('.carinha-amigo[data-amigo="lia"] canvas');
        return c?.toDataURL().length ?? 0;
      });
      await page.evaluate(() => {
        const w = window as unknown as { __amigosPostos: { aparencia: Record<string, unknown> }[] };
        // (spec 034: a patinadora no lugar do Dino, que saiu)
        w.__amigosPostos[0].aparencia = { ...w.__amigosPostos[0].aparencia, fantasia: { id: 'patinadora', cor: 0 } };
      });
      await page.waitForTimeout(1500);
      const depois = await page.evaluate(() => {
        const c = document.querySelector<HTMLCanvasElement>('.carinha-amigo[data-amigo="lia"] canvas');
        return c?.toDataURL().length ?? 0;
      });
      expect(antes).toBeGreaterThan(0);
      expect(depois).not.toBe(antes);
      await foto(page, `${pre}-1-carinha-trocou-fantasia`);
    });

    test(`muitos amigos (${tela.pre})`, async ({ page }) => {
      test.setTimeout(600_000);
      const pre = tela.pre;
      await abrir(page);
      const b = await irPara(page, MORROS, 0.6);
      await page.waitForTimeout(2000);
      await porAmigos(page, b, [
        ['lia', -1.6, 45],
        ['theo', 1.5, 55],
        ['bia', Math.PI, 38],
        ['gui', -2.5, 120],
        ['nina', 2.4, 130],
        ['davi', 1.0, 150],
        ['malu', 0.1, 7],
      ]);
      await page.waitForTimeout(3000);
      let v = await foto(page, `${pre}-6-muitos-padrao`);
      expect(v.length).toBeLessThanOrEqual(3);
      expect(v.some((x) => x.ids.includes('malu')), 'perto não tem carinha').toBe(false);
      await expect(page.locator('.botao-bandeja')).toBeVisible();
      await porAmigos(page, b, [
        ['lia', -1.5, 45],
        ['theo', -1.65, 70],
        ['bia', -1.4, 95],
        ['gui', -1.75, 120],
        ['nina', 1.6, 40],
        ['davi', Math.PI - 0.3, 60],
        ['malu', 0.1, 7],
      ]);
      await page.waitForTimeout(1500);
      v = await foto(page, `${pre}-6-muitos-montinho`);
      expect(v.length).toBeLessThanOrEqual(3);
      expect(v.some((x) => x.tipo === 'montinho')).toBe(true);
      await page.locator('.botao-bandeja').click();
      await page.waitForTimeout(600);
      await expect(page.locator('.bandeja-amigos .cara')).toHaveCount(7);
      // do mais perto ao mais longe; a Malu (perto) com a bolinha verde
      await expect(page.locator('.bandeja-amigos .cara').first()).toHaveAttribute('data-amigo', 'malu');
      await expect(page.locator('.bandeja-amigos .cara.perto')).toHaveCount(1);
      await foto(page, `${pre}-6-muitos-bandeja`);
      await page.locator('.bandeja-amigos .cara[data-amigo="bia"]').click();
      await page.waitForTimeout(800);
      v = await foto(page, `${pre}-6-muitos-escolhido`);
      expect(v.filter((x) => x.tipo === 'carinha').map((x) => x.ids[0])).toEqual(['bia']);
      expect(v.filter((x) => x.tipo === 'pontinho').length).toBeGreaterThan(0);
      expect(v.find((x) => x.ids[0] === 'bia')?.escolhido).toBe(true);
      // tocar no escolhido de novo, na bandeja, desfaz
      await page.locator('.botao-bandeja').click();
      await page.locator('.bandeja-amigos .cara[data-amigo="bia"]').click();
      await page.waitForTimeout(600);
      expect(await page.evaluate(() => window.__brumaluz!.acharAmigo!.escolhido())).toBeNull();
      // o pontinho é tocável: tocar escolhe
      await page.evaluate(() => window.__brumaluz!.acharAmigo!.escolher('bia'));
      await page.waitForTimeout(600);
      const pt = (await vistos(page)).find((x) => x.tipo === 'pontinho');
      if (pt) {
        if (tela.toque) await page.touchscreen.tap(pt.x, pt.y);
        else await page.mouse.click(pt.x, pt.y);
        await page.waitForTimeout(500);
        expect(await page.evaluate(() => window.__brumaluz!.acharAmigo!.escolhido())).toBe(pt.ids[0]);
      }
    });

    test(`trilha de estrelinhas (${tela.pre})`, async ({ page }) => {
      test.setTimeout(600_000);
      const pre = tela.pre;
      await abrir(page);
      const b = await irPara(page, MORROS, 0.6);
      await page.waitForTimeout(2000);
      // a Lia escondida atrás do morro, a ~40 blocos; a criança olha para o lado
      const esc = (await esconder(page, b, 'lia', 34, 56)) ?? [0.1, 40];
      console.log('achar escondida em', esc);
      await page.evaluate((yaw) => window.__brumaluz!.apontar!(yaw, 0.3), b.yaw - 1.3);
      await page.waitForTimeout(900);
      // o toque de verdade na carinha acende a trilha
      const v = (await page.evaluate(() => window.__brumaluz!.acharAmigo!.vistos())).find((x) => x.ids[0] === 'lia');
      expect(v).toBeTruthy();
      if (tela.toque) await page.touchscreen.tap(v!.x, v!.y);
      else await page.mouse.click(v!.x, v!.y);
      await page.waitForTimeout(300);
      const passos = await page.evaluate(() => window.__brumaluz!.acharAmigo!.caminho().length);
      const ms = await page.evaluate(() => window.__brumaluz!.acharAmigo!.caminhoMs());
      console.log('achar trilha passos', passos, 'procura ms', ms.toFixed(1));
      expect(passos).toBeGreaterThan(10);
      // olhando um pouco para baixo, na direção dela: a trilha no chão
      await page.evaluate((yaw) => window.__brumaluz!.apontar!(yaw, 0.42), b.yaw + esc[0] * 0.6);
      await page.waitForTimeout(1500);
      const est = await page.evaluate(() => window.__brumaluz!.acharAmigo!.estrelas());
      expect(est.malhas).toBe(1);
      expect(est.estrelas).toBeGreaterThan(5);
      expect(est.estrelas).toBeLessThanOrEqual(300);
      await foto(page, `${pre}-3-trilha-inicio`);
      await andarTrilha(page, 0.45);
      await page.waitForTimeout(300);
      await foto(page, `${pre}-3-trilha-meio`);
      await andarTrilha(page, 0.86);
      await page.waitForTimeout(200);
      await foto(page, `${pre}-3-trilha-chegando`);
      // o robô que só segue a trilha chega em menos de 20 s
      await voltar(page, b);
      await page.evaluate(() => window.__brumaluz!.acharAmigo!.trilha('lia'));
      const s = await andarTrilha(page, 1, 30);
      const fim = await page.evaluate(() => {
        const e = window.__brumaluz!;
        const [x, , z] = e.jogadorPes!();
        const a = (e.outrosJogadores!() ?? []).find((o) => o.id === 'lia')!;
        return Math.hypot(a.x - x, a.z - z);
      });
      console.log('achar robô chegou em', s.toFixed(1), 's, a', fim.toFixed(1), 'blocos');
      expect(s).toBeLessThan(20);
      expect(fim).toBeLessThan(4);
      // chegou: a trilha se apaga
      await page.waitForTimeout(1800);
      expect((await page.evaluate(() => window.__brumaluz!.acharAmigo!.estrelas())).estrelas).toBe(0);
      // na mata fechada
      const m = await irPara(page, MATA, 0.3);
      await page.waitForTimeout(2000);
      await porAmigos(page, m, [['lia', 0.05, 26], ['theo', -0.45, 34]]);
      await page.waitForTimeout(1200);
      await foto(page, `${pre}-1-carinha-mata`);
      await page.evaluate(() => window.__brumaluz!.acharAmigo!.trilha('lia'));
      await page.evaluate((yaw) => window.__brumaluz!.apontar!(yaw, 0.42), m.yaw);
      await page.waitForTimeout(1800);
      await foto(page, `${pre}-3-trilha-mata`);
    });
  });
}
