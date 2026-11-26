import { expect, test, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { abrirMundo, assentar } from './guia-palco';
import { Bloco } from '../src/world/blocks';

/** O limite do olhar para baixo de dentro (o `LIMITE_OLHAR_BAIXO` de `primeiraPessoa.ts`). */
const LIMITE_OLHAR_BAIXO = (75 * Math.PI) / 180;

/**
 * Conserto da 037 (o dono, jogando: "não precisaria enxergar ele de cima... é uma transição
 * feia"): de dentro, olhar para baixo aos poucos, nas três telas.
 * - o olhar nunca passa do limite (75°), e a câmera nem vira nem passa da vertical;
 * - nenhuma peça do próprio boneco aparece (nem o peito, nem a roupa, nem os sapatos): só o braço
 *   da frente, que fica na tela do começo ao fim, sem sair e voltar;
 * - no limite, a mira do meio quebra o bloco do chão logo à frente dos pés, e põe de volta.
 * As fotos olhando 0°, 45° e o limite vão para capturas-037/olhar-baixo/.
 *
 *   E2E_ENV="-u 1000:1000 -e HOME=/tmp" scripts/e2e-gpu.sh e2e/olhar-baixo-037.spec.ts --workers 2 --trace off
 */
test.setTimeout(600_000);
test.use({ actionTimeout: 30_000 });
const PASTA = 'capturas-037/olhar-baixo';
type C3 = [number, number, number];

/** Um campo de pedregulho limpo; a criança no meio, olhando para +z. Devolve a célula dos pés. */
async function montarCampo(p: Page): Promise<C3> {
  return p.evaluate(
    async ({ pedra }) => {
      const e = window.__brumaluz!;
      const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));
      e.voar?.(false);
      const [x0, , z0] = e.posicao!;
      const fx = Math.floor(x0);
      const fz = Math.floor(z0);
      const fy = Math.floor(e.posicao![1] - 1.62);
      const lote: { x: number; y: number; z: number; v: number }[] = [];
      for (let dx = -6; dx <= 6; dx++)
        for (let dz = -5; dz <= 8; dz++) {
          lote.push({ x: fx + dx, y: fy - 1, z: fz + dz, v: pedra });
          for (let dy = 0; dy < 7; dy++) lote.push({ x: fx + dx, y: fy + dy, z: fz + dz, v: 0 });
        }
      e.editarLote!(lote);
      await espera(300);
      e.teleportar!(fx + 0.5, fz + 0.5, fy);
      e.apontar!(0, 0.2);
      await espera(900);
      return [fx, fy, fz] as C3;
    },
    { pedra: Bloco.PEDREGULHO },
  );
}

for (const tamanho of ['empe', 'deitado', 'pc'] as const)
  test(`olhando para baixo de dentro (${tamanho}): para no limite, o corpo não aparece, a mão fica e o chão da frente se quebra e se põe`, async ({
    browser,
  }) => {
    const page = await abrirMundo(browser, { id: `pp-baixo-${tamanho}`, tema: 'doce-reino', tamanho });
    await assentar(page);
    const [fx, fy, fz] = await montarCampo(page);
    await page.evaluate(() => {
      const e = window.__brumaluz!;
      e.inventario!.definir(0, { item: 'picareta_pedra', qtd: 1 });
      e.inventario!.definir(1, { item: 'bloco:7', qtd: 64 });
      e.selecionarSlot!(1);
    });
    await page.evaluate(() => window.__brumaluz!.primeiraPessoa!.ligar(true));
    await page.waitForFunction(() => window.__brumaluz!.primeiraPessoa!.fracao() >= 1, undefined, { timeout: 15_000 });
    mkdirSync(PASTA, { recursive: true });
    // olhar para baixo aos poucos, de 0 a 89° (o controle deixa ir até 89°)
    const passos: Array<{ pedido: number; camera: number; corpo: string[]; mao: number }> = [];
    for (let graus = 0; graus <= 89; graus += 3) {
      const pedido = (graus * Math.PI) / 180;
      await page.evaluate((p) => window.__brumaluz!.apontar!(0, p), pedido);
      await page.waitForTimeout(90);
      passos.push(
        await page.evaluate((pedido) => {
          const e = window.__brumaluz!;
          const cena = e.cenaBabylon!();
          // as malhas do próprio boneco (o braço da frente é outro boneco, o "pp-braco")
          const corpo = cena.meshes
            .filter((m) => m.name.startsWith('personagem') && m.isEnabled() && m.isVisible && m.visibility > 0 && m.getTotalVertices() > 0)
            .map((m) => m.name);
          return { pedido, camera: e.primeiraPessoa!.camera().pitch, corpo, mao: e.primeiraPessoa!.maos().direita };
        }, pedido),
      );
      if (graus === 0 || graus === 45) await page.screenshot({ path: `${PASTA}/${tamanho}-${graus}.png` });
    }
    await page.screenshot({ path: `${PASTA}/${tamanho}-limite.png` });
    // no limite, a mira do meio: quebra o chão logo à frente dos pés e põe de volta
    const chao: C3 = [fx, fy - 1, fz + 1];
    await page.evaluate(() => {
      const e = window.__brumaluz!;
      e.selecionarSlot!(0);
      e.controleDireto!.quebrar(true);
    });
    const quebrou = await page
      .waitForFunction((q) => window.__brumaluz!.bloco!(q[0], q[1], q[2]) === 0, chao, { timeout: 8000 })
      .then(() => true)
      .catch(() => false);
    await page.evaluate(() => window.__brumaluz!.controleDireto!.quebrar(false));
    await page.screenshot({ path: `${PASTA}/${tamanho}-limite-quebrou.png` });
    await page.evaluate(() => window.__brumaluz!.selecionarSlot!(1));
    await page.waitForTimeout(400);
    await page.evaluate(() => window.__brumaluz!.controleDireto!.usar());
    await page.waitForTimeout(500);
    const pos = await page.evaluate((q) => window.__brumaluz!.bloco!(q[0], q[1], q[2]), chao);
    const medida = { limite: LIMITE_OLHAR_BAIXO, passos, quebrou, pos };
    writeFileSync(`${PASTA}/medidas-${tamanho}.json`, JSON.stringify(medida, null, 1));
    await page.context().close();
    // o olhar nunca passa do limite e cresce liso até ele (nada de salto nem de volta)
    let antes = -1;
    for (const s of passos) {
      expect(s.camera).toBeLessThanOrEqual(LIMITE_OLHAR_BAIXO + 0.002);
      expect(s.camera).toBeGreaterThanOrEqual(antes - 0.002);
      expect(s.camera - Math.max(0, antes)).toBeLessThan(0.08);
      antes = s.camera;
    }
    expect(antes).toBeCloseTo(LIMITE_OLHAR_BAIXO, 2);
    // nenhuma peça do próprio boneco aparece, e a mão da frente fica o tempo todo
    expect(passos.filter((s) => s.corpo.length).map((s) => `${Math.round((s.pedido * 180) / Math.PI)}°: ${s.corpo.join(', ')}`)).toEqual([]);
    expect(Math.min(...passos.map((s) => s.mao))).toBeGreaterThan(0.9);
    expect(quebrou).toBe(true);
    expect(pos).toBe(Bloco.TABUAS);
  });
