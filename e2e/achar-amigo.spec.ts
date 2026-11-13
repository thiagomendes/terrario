import { expect, test, type Page } from '@playwright/test';
import { MORROS, abrir, esconder, foto, irPara, porAmigos } from './achar-amigo-palco';

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
        w.__amigosPostos[0].aparencia = { ...w.__amigosPostos[0].aparencia, fantasia: { id: 'dino', cor: 0 } };
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
  });
}
