import { expect, test, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { abrirMundo, assentar } from './guia-palco';

/**
 * Spec 026, o pedido do dono ("notei em vários momentos o personagem atravessando objetos e
 * bichos"), no jogo de verdade: o boneco anda para cima do carro, da barraca do lanche, do
 * carrinho de pipoca, do rádio gigante e de uma lhama. Para encostado nas peças (o corpo nunca
 * entra na caixa) e passa pela lhama de lado, sem atravessar. Com VILA_VIDEO=1, grava o vídeo
 * da página em VILA_PASTA (o clipe `colisao.mp4`).
 */
declare const process: { env: Record<string, string | undefined> };
const PASTA = process.env.VILA_PASTA ?? 'test-results/vila-colisao';
const VIDEO = !!process.env.VILA_VIDEO;
mkdirSync(PASTA, { recursive: true });

interface Medida {
  /** A pior entrada do corpo numa caixa de peça (blocos). */
  caixa: number;
  /** A pior entrada num bicho e quanto tempo seguido ele ficou dentro (s). */
  bicho: number;
  dentroS: number;
  /** A folga final até a peça (blocos) e onde o boneco parou. */
  pes: number[];
}

/**
 * Leva o boneco a (x, z), olhando para (ax, az), e anda para lá por `ms` (o controle de
 * verdade: o mesmo do joystick). Mede a cada quadro.
 */
async function andarAte(
  page: Page,
  de: [number, number],
  para: [number, number],
  ms: number,
  passar = false,
): Promise<Medida> {
  return page.evaluate(
    async ({ de, para, ms, passar }) => {
      const e = window.__brumaluz!;
      const ctl = e.controleDireto!;
      const espera = (t: number) => new Promise((r) => setTimeout(r, t));
      ctl.mover(0, 0);
      e.teleportar!(de[0], de[1]);
      const yaw = Math.atan2(para[0] - de[0], para[1] - de[1]);
      e.apontar!(yaw, 0.32);
      await espera(900);
      const caixas = e.caixasDasPecas!();
      const m = { caixa: 0, bicho: 0, dentroS: 0, pes: [0, 0, 0] };
      let dentroDesde = -1;
      const t0 = performance.now();
      // anda pelo menos `ms` e continua até chegar: parado contra a peça (o encosto) ou, na
      // lhama, depois do ponto de chegada (24 nov: com a placa ocupada por outro teste, os
      // quadros caem, o boneco anda menos por segundo e parava 0,7 a 1,6 bloco antes do carro
      // só porque o tempo fixo acabou)
      const longe = Math.hypot(para[0] - de[0], para[1] - de[1]);
      const ux = (para[0] - de[0]) / longe;
      const uz = (para[1] - de[1]) / longe;
      let ultimo: number[] = e.jogadorPes!();
      let paradoDesde = -1;
      const chegou = (p: number[], agora: number) => {
        if (passar) return (p[0] - de[0]) * ux + (p[2] - de[1]) * uz >= longe;
        const andou = Math.hypot(p[0] - ultimo[0], p[2] - ultimo[2]);
        ultimo = p;
        if (andou > 0.005) paradoDesde = -1;
        else if (paradoDesde < 0) paradoDesde = agora;
        return paradoDesde >= 0 && agora - paradoDesde > 400;
      };
      for (;;) {
        const decorrido = performance.now() - t0;
        if (decorrido > 20_000) break;
        if (decorrido >= ms && chegou(e.jogadorPes!(), performance.now())) break;
        const p = e.jogadorPes!();
        // vira para o alvo enquanto não passou dele (na lhama, segue reto depois)
        if (!passar) {
          const quer = Math.atan2(para[0] - p[0], para[1] - p[2]);
          e.apontar!(quer, 0.32);
        }
        ctl.mover(1, 0);
        for (const c of caixas) {
          const entra = Math.min(
            p[0] + 0.3 - c[0],
            c[3] - (p[0] - 0.3),
            p[2] + 0.3 - c[2],
            c[5] - (p[2] - 0.3),
            p[1] + 1.8 - c[1],
            c[4] - p[1],
          );
          m.caixa = Math.max(m.caixa, entra);
        }
        const b = e.dentroDeBicho!();
        m.bicho = Math.max(m.bicho, b.pen);
        const agora = performance.now();
        if (b.pen > 0.15) {
          if (dentroDesde < 0) dentroDesde = agora;
          m.dentroS = Math.max(m.dentroS, (agora - dentroDesde) / 1000);
        } else dentroDesde = -1;
        await espera(16);
      }
      ctl.mover(0, 0);
      m.pes = e.jogadorPes!();
      await espera(500);
      return m;
    },
    { de, para, ms, passar },
  );
}

test('Vila Neon: o boneco bate no carro, na barraca, no carrinho e no rádio, e passa pela lhama sem atravessar', async ({
  browser,
}) => {
  test.setTimeout(400_000);
  const t0 = Date.now();
  const page = await abrirMundo(browser, {
    id: 'vila-colisao',
    tema: 'vila-neon',
    tamanho: 'empe',
    video: VIDEO ? `${PASTA}/video` : undefined,
  });
  await page.addStyleTag({ content: '.dica-mira { display: none !important; }' });
  await assentar(page);
  await page.waitForFunction(() => !!window.__vila, undefined, { timeout: 30_000 });
  const v = await page.evaluate(() => {
    const p = window.__brumaluz!.vila!()!;
    const ach = (tipo: string, n?: number) => {
      const q = p.pecas.find((x) => x.tipo === tipo && (n === undefined || x.n === n))!;
      return [q.x, q.z, q.dir] as [number, number, number];
    };
    return {
      carro: ach('carro', 0),
      pipoca: ach('pipoca'),
      radio: ach('radio-gigante'),
      barraca: ach('balcao', 2),
      cercado: p.pontos.cercado,
      h: p.h,
    };
  });
  const inicio = (Date.now() - t0) / 1000;
  const r: Record<string, Medida> = {};
  // o carro (de lado na avenida, o comprimento em x): vem da rua, do sul
  r.carro = await andarAte(
    page,
    [v.carro[0] + 0.4, v.carro[1] + 4.5],
    [v.carro[0] + 0.4, v.carro[1]],
    2600,
  );
  // a barraca do lanche: o balcão da frente (blocos), vindo do campo
  r.barraca = await andarAte(
    page,
    [v.barraca[0], v.barraca[1] + 3.6],
    [v.barraca[0], v.barraca[1]],
    2400,
  );
  // o carrinho de pipoca da pracinha (a frente olha para o leste)
  r.pipoca = await andarAte(
    page,
    [v.pipoca[0] + 4, v.pipoca[1]],
    v.pipoca.slice(0, 2) as [number, number],
    2400,
  );
  // o rádio gigante (a frente olha para o leste)
  r.radio = await andarAte(
    page,
    [v.radio[0] + 5, v.radio[1] + 0.3],
    [v.radio[0], v.radio[1] + 0.3],
    2800,
  );
  // a lhama do cercadinho: espera ela nascer, mira nela e segue reto, passando por ela
  const mx = (v.cercado.x0 + v.cercado.x1 + 1) / 2;
  const mz = (v.cercado.z0 + v.cercado.z1 + 1) / 2;
  await page.evaluate(([x, z]) => window.__brumaluz!.teleportar!(x, z), [mx, mz + 3]);
  await page.waitForFunction(
    () => (window.__brumaluz!.criaturas?.() ?? []).some((c) => c.tipo === 'cervo'),
    undefined,
    { timeout: 30_000 },
  );
  await page.waitForTimeout(1500);
  const lhama = await page.evaluate(() => {
    const p = window.__brumaluz!.jogadorPes!();
    return (window.__brumaluz!.criaturas?.() ?? [])
      .filter((c) => c.tipo === 'cervo')
      .sort((a, b) => Math.hypot(a.x - p[0], a.z - p[2]) - Math.hypot(b.x - p[0], b.z - p[2]))[0];
  });
  const dx = lhama.x - mx;
  const dz = lhama.z - (mz + 3);
  const d = Math.hypot(dx, dz) || 1;
  r.lhama = await andarAte(
    page,
    [lhama.x - (dx / d) * 3.5, lhama.z - (dz / d) * 3.5],
    [lhama.x + (dx / d) * 3, lhama.z + (dz / d) * 3],
    3000,
    true,
  );
  const fim = (Date.now() - t0) / 1000;
  console.log(`colisão: ${JSON.stringify(r)}`);
  if (VIDEO) writeFileSync(`${PASTA}/trecho.json`, JSON.stringify({ inicio, fim, som: inicio }));
  await page.context().close();
  for (const [k, m] of Object.entries(r)) {
    // o corpo nunca entra numa caixa de peça
    expect(m.caixa, `${k}: entrou na peça`).toBeLessThanOrEqual(0.01);
    // nunca fica dentro de um bicho mais que um instante
    expect(m.dentroS, `${k}: dentro do bicho`).toBeLessThan(0.5);
  }
  // encostou de verdade: o boneco parou rente (nada de ar que segura)
  expect(Math.abs(r.carro.pes[2] - 0.3 - (v.carro[1] + 0.92))).toBeLessThan(0.08);
  expect(Math.abs(r.radio.pes[0] - 0.3 - (v.radio[0] + 0.72))).toBeLessThan(0.08);
});
