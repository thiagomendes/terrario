import { expect, test } from '@playwright/test';
import { abrir, acender, assentar, ate, hora, ir, medir, plano } from './vila-noite-palco';

/**
 * Spec 026 (parte 3): as medidas do celular em pé com a casa e a pista de skate (só com
 * CASA_MEDIDA=1, na placa de vídeo). A casa por dentro (a sala e o quarto, a TV passando), a
 * rampa (com o skate no trilho), o parque e a rua, de dia e de noite, ficam nos 60 quadros; o
 * pior caso do festival (do meio do campo, olhando o palco por cima dos 40) não cai abaixo dos 53
 * de antes.
 */
declare const process: { env: Record<string, string | undefined> };
test.skip(!process.env.CASA_MEDIDA, 'só com CASA_MEDIDA');
test.setTimeout(1_200_000);

const NOITE = 0.96;

test('celular em pé: a casa, a rampa, o parque, a rua e o festival', async ({ browser }) => {
  // (parte 3B: com a f10 aberta, os brinquedos espalhados da casa entram na conta)
  const page = await abrir(browser, 'vila-casa-medida', 'empe', 3, [
    'f1',
    'f2',
    'f4',
    'f5',
    'f6',
    'f7',
    'f8',
    'f9',
  ]);
  const p = await plano(page);
  const Y = p.h + 1;
  const casa = p.pontos.casa;
  const R = p.pontos.skate.rampa;
  const medidas: Record<string, number> = {};
  const m = async (nome: string) => {
    await page.waitForTimeout(2500);
    medidas[nome] = (await medir(page, nome)).fps;
  };
  const olhar = (yaw: number, pitch: number) =>
    page.evaluate(([y, pi]) => window.__brumaluz!.apontar!(y, pi), [yaw, pitch] as const);
  for (const [quando, h] of [
    ['dia', 0.42],
    ['noite', NOITE],
  ] as const) {
    await hora(page, h);
    // a sala: a TV passando e o disco tocando
    await ir(page, casa.sofa.x + 0.4, casa.sofa.z + 2.4, Y + 0.2);
    await olhar(Math.PI, 0.8);
    await assentar(page, 12);
    await page.evaluate(() => {
      window.__brumaluz!.vilaCasa!.tocar('disco');
    });
    await m(`casa-sala-${quando}`);
    await page.evaluate(() => window.__brumaluz!.vilaCasa!.tocar('disco'));
    // o quarto, olhando a sala pela passagem
    await ir(page, casa.quarto.x0 + 2.5, casa.quarto.z0 + 9, Y + 0.2);
    await olhar(-Math.PI / 2 - 0.4, 0.8);
    await m(`casa-quarto-${quando}`);
    // a rampa, de skate, no trilho (vai e vem)
    await page.evaluate(() => window.__brumaluz!.vilaSkate!(true));
    await ir(page, R.x - 0.4, R.z, R.y + 0.2);
    await olhar(Math.PI / 2, 0.3);
    await assentar(page, 12);
    await page.evaluate(() => window.__brumaluz!.controleDireto!.mover(1, 0));
    await page.waitForFunction(() => !!window.__brumaluz!.vilaCasa!.estado().trilho.trilho, undefined, {
      timeout: 15_000,
    });
    await m(`rampa-trilho-${quando}`);
    await page.evaluate(() => window.__brumaluz!.controleDireto!.mover(0, 0));
    await page.waitForTimeout(4000);
    await page.evaluate(() => window.__brumaluz!.vilaSkate!(false));
    // o parque (a entrada: o arco, o carrossel e a roda à vista)
    const pq = p.pontos.parque;
    await ir(page, p.ox + 133, p.oz + 62, Y + 0.2);
    await page.evaluate(
      ([x, z]) => {
        const e = window.__brumaluz!;
        const pes = e.jogadorPes!();
        e.apontar!(Math.atan2(x - pes[0], z - pes[2]), -0.1);
      },
      [pq.carrossel.x + 6, pq.carrossel.z - 8] as const,
    );
    await assentar(page, 12);
    await m(`parque-entrada-${quando}`);
    // a Rua anos 80, da calçada da frente da casa (a casa, a locadora e a lanchonete à vista)
    await ir(page, p.ox + 40, p.oz + 64, Y + 0.2);
    await olhar(Math.PI * 0.85, 0.15);
    await assentar(page, 12);
    await m(`rua-${quando}`);
  }
  // o pior caso do festival: do meio do campo, olhando o palco por cima do público, no show
  await hora(page, NOITE);
  await acender(page);
  await ir(page, p.ox + 60.5, p.oz + 98.4, Y + 0.2);
  await olhar(0, 0.1);
  await assentar(page, 12);
  await ate(page, 30);
  await page.evaluate(() => window.__brumaluz!.pularShow!(58));
  await ate(page, 59);
  await ir(page, p.ox + 60.5, p.oz + 84, Y + 0.2);
  await olhar(0, 0.02);
  await page.waitForTimeout(3000);
  medidas['festival-pior-caso'] = (await medir(page, 'festival-pior-caso')).fps;
  console.log(`MEDIDAS DA PARTE 3 ${JSON.stringify(medidas)}`);
  for (const [k, v] of Object.entries(medidas))
    if (k !== 'festival-pior-caso') expect(v, k).toBeGreaterThanOrEqual(55);
  expect(medidas['festival-pior-caso']).toBeGreaterThanOrEqual(45);
  await page.context().close();
});
