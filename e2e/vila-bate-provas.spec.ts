import { expect, test, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { comecarGravacao, pararGravacao } from './gravarCena';
import {
  abrir,
  assentar,
  camera,
  esconderJogador,
  foto,
  hora,
  ir,
  medir,
  passo,
  plano,
  salvarWav,
  PASTA,
  type V3,
} from './vila-noite-palco';

/**
 * Spec 026 (parte 2, o bate-bate de guiar): as provas para o dono (só com BATE_PROVAS=1, na
 * placa de vídeo: scripts/e2e-gpu.sh). `BATE_SO=fotos,video,medida,retratos,mastro` escolhe as
 * partes; a pasta é a `VILA_PASTA`.
 *
 * - **fotos:** a pista nova de dia e de noite;
 * - **video:** a criança chega, sobe no carrinho, guia, bate nos moradores e desce no tapete
 *   (celular deitado, com o som do jogo);
 * - **medida:** os quadros por segundo no celular em pé, olhando a pista e guiando nela;
 * - **retratos:** a câmera de cada brinquedo no celular em pé;
 * - **mastro:** o cavalinho do carrossel de lado (o mastro na frente de quem senta).
 */
declare const process: { env: Record<string, string | undefined> };
test.skip(!process.env.BATE_PROVAS, 'só com BATE_PROVAS');
test.setTimeout(1_500_000);
test.use({ actionTimeout: 30_000 });
const SO = (process.env.BATE_SO ?? '').split(',').filter(Boolean);
const quer = (s: string) => !SO.length || SO.includes(s);
const NOITE = 0.96;

const sentar = async (page: Page, b: number, nome: string) => {
  const t = await page.evaluate((b) => window.__vila!.parque().sentar[b].t, b);
  expect(t, `${nome} na tela`).not.toBeNull();
  await page.touchscreen.tap(t!.x, t!.y);
  await page.waitForFunction((nome) => window.__brumaluz!.vilaParque!.sentado()?.b === nome, nome);
};
const olhar = (page: Page, x: number, z: number, pitch: number) =>
  page.evaluate(
    ([x, z, pitch]) => {
      const e = window.__brumaluz!;
      const pes = e.jogadorPes!();
      e.apontar!(Math.atan2(x - pes[0], z - pes[2]), pitch);
    },
    [x, z, pitch] as const,
  );

/**
 * Guia o carrinho (o controle de verdade, pela câmera) dentro da página: atrás do carrinho de
 * morador mais perto até somar `batidas` batidas ('morador'), ou até o ponto (x, z).
 */
const guiar = (
  page: Page,
  alvo: { batidas: number } | { x: number; z: number },
  teto: number,
) =>
  page.evaluate(
    ([alvo, teto]) =>
      new Promise<boolean>((ok) => {
        const e = window.__brumaluz!;
        const vp = e.vilaParque!;
        const ctl = e.controleDireto!;
        const t0 = performance.now();
        const b0 = vp.bate().batidas;
        const vez = () => {
          const s = vp.sentado();
          const carros = vp.carros();
          if (!s || !carros) return ok(false);
          const eu = carros[s.i];
          let x: number;
          let z: number;
          let fim: boolean;
          let f = 1;
          if ('batidas' in alvo) {
            let m = carros[0];
            for (const c of carros.slice(1, 4))
              if (Math.hypot(c.x - eu.x, c.z - eu.z) < Math.hypot(m.x - eu.x, m.z - eu.z)) m = c;
            x = m.x;
            z = m.z;
            fim = vp.bate().batidas - b0 >= alvo.batidas;
          } else {
            x = alvo.x;
            z = alvo.z;
            const d = Math.hypot(x - eu.x, z - eu.z);
            fim = d < 0.45;
            f = Math.min(1, 0.35 + d / 4);
          }
          if (fim || performance.now() - t0 > teto) {
            ctl.mover(0, 0);
            return ok(fim);
          }
          const d = Math.atan2(x - eu.x, z - eu.z) - e.rotacao![1];
          ctl.mover(Math.cos(d) * f, Math.sin(d) * f);
          setTimeout(vez, 50);
        };
        vez();
      }),
    [alvo, teto] as const,
  );

async function gravar(page: Page, nome: string, seg: number, cena: () => Promise<void>) {
  mkdirSync(PASTA, { recursive: true });
  const som = page.evaluate((s) => window.__brumaluz!.gravarSom?.(s) ?? null, seg + 1);
  const t0 = Date.now();
  await comecarGravacao(page, 30);
  await cena();
  await page.waitForTimeout(Math.max(0, seg * 1000 - (Date.now() - t0)));
  await pararGravacao(page, `${PASTA}/${nome}.webm`);
  await page.evaluate(() => window.__brumaluz!.pararSom?.());
  const r = await som;
  if (r) salvarWav(r, `${PASTA}/${nome}.wav`);
  else console.log(`VIDEO ${nome} sem som`);
}

test('o bate-bate: as fotos da pista nova, de dia e de noite', async ({ browser }) => {
  test.skip(!quer('fotos'), 'só com fotos');
  const page = await abrir(browser, 'vila-bate-fotos', 'pc', 6, ['f1', 'f2', 'f4']);
  const p = await plano(page);
  const Y = p.h + 1;
  const m = (u: number, alt: number, v: number): V3 => [p.ox + u, Y + alt, p.oz + v];
  await esconderJogador(page, true);
  // (a criança, escondida, voa por cima da pista: com gente perto os carrinhos andam)
  await ir(page, p.ox + 137, p.oz + 24, Y + 26, true);
  await assentar(page, 20);
  const VISTAS: [string, V3, V3][] = [
    ['pista-do-alto', m(137.5, 17, 35), m(137.5, 0, 12)],
    ['pista-da-entrada', m(132.5, 2.7, 26), m(139, 1.2, 9)],
    ['pista-do-canto', m(123.2, 4.4, 22.5), m(141, 0.4, 10)],
    ['pista-por-dentro', m(128, 1.9, 16.5), m(141, 1, 11)],
    ['pista-e-parque', m(118, 14, 4), m(146, 0, 30)],
  ];
  for (const [quando, h] of [
    ['dia', 0.42],
    ['noite', NOITE],
  ] as const) {
    await hora(page, h);
    await page.waitForTimeout(2500);
    for (const [nome, de, para] of VISTAS) {
      await camera(page, de, para);
      await page.waitForTimeout(900);
      await foto(page, `${nome}-${quando}`);
    }
  }
  await page.context().close();
});

test('o bate-bate: o vídeo de quem guia e bate (deitado, com o som do jogo)', async ({ browser }) => {
  test.skip(!quer('video'), 'só com video');
  const page = await abrir(browser, 'vila-bate-video', 'deitado', 4, ['f1', 'f2', 'f4']);
  const p = await plano(page);
  const B = p.pontos.parque.bate;
  const Y = p.h + 1;
  await page.touchscreen.tap(420, 60);
  await page.waitForTimeout(500);
  passo('bate-bate');
  await hora(page, 0.42);
  const vaga = B.vagas[5];
  await ir(page, vaga[0] + 1.2, B.z1 + 6.5, Y + 0.2);
  await olhar(page, vaga[0], vaga[1] - 3, 0.16);
  await assentar(page, 20);
  await page.waitForTimeout(3000);
  await gravar(page, 'bate-bate-guiar', 38, async () => {
    // chega andando, toca no carrinho livre e sobe
    await page.evaluate(() => window.__brumaluz!.controleDireto!.mover(1, 0));
    await page.waitForTimeout(950);
    await page.evaluate(() => window.__brumaluz!.controleDireto!.mover(0, 0));
    await page.waitForTimeout(1300);
    await sentar(page, 2, 'bate');
    await page.waitForTimeout(2200);
    // guia atrás dos moradores e bate neles (quatro batidas, sem pressa)
    await guiar(page, { batidas: 2 }, 12_000);
    await foto(page, 'bate-bate-batida', true);
    await guiar(page, { batidas: 2 }, 10_000);
    // uma volta larga pela pista e a mureta do norte
    await guiar(page, { x: B.x1 - 4, z: B.z0 + 3 }, 6000);
    await guiar(page, { x: B.x0 + 5, z: B.z0 + 2.2 }, 7000);
    // volta para o tapete verde, para em cima dele e desce
    await guiar(page, { x: (B.tapete.x0 + B.tapete.x1) / 2, z: (B.tapete.z0 + B.tapete.z1) / 2 }, 9000);
    await page.waitForFunction(() => !window.__brumaluz!.vilaParque!.sentado(), undefined, {
      timeout: 8000,
    });
    await page.waitForTimeout(1500);
  });
  const b = await page.evaluate(() => window.__brumaluz!.vilaParque!.bate());
  console.log(`VIDEO bate-bate-guiar ${JSON.stringify(b)}`);
  await page.context().close();
});

test('celular em pé: as medidas na pista do bate-bate (olhando e guiando, de dia e de noite)', async ({
  browser,
}) => {
  test.skip(!quer('medida'), 'só com medida');
  const page = await abrir(browser, 'vila-bate-celular', 'empe', 3, ['f1', 'f2', 'f4']);
  const p = await plano(page);
  const B = p.pontos.parque.bate;
  const Y = p.h + 1;
  const lento = Number(process.env.DESACELERAR_CPU ?? 0);
  if (lento > 1) {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: lento });
  }
  const sufixo = lento > 1 ? `-cpu${lento}x` : '';
  const medidas: Record<string, number> = {};
  const logica: Record<string, number> = {};
  const m = async (nome: string) => {
    await page.waitForTimeout(2500);
    medidas[nome] = (await medir(page, `bate-${nome}${sufixo}`)).fps;
    logica[nome] = await page.evaluate(
      () => Math.round((window.__brumaluz!.logicaQuadroMs ?? 0) * 100) / 100,
    );
  };
  for (const [quando, h] of [
    ['dia', 0.42],
    ['noite', NOITE],
  ] as const) {
    await hora(page, h);
    // da ponta do caminho: a pista inteira à vista, os oito carrinhos, os quatro moradores
    await ir(page, B.saida[0], B.saida[2] + 3, Y + 0.2);
    await olhar(page, B.x, B.z, 0.1);
    await assentar(page, 12);
    await page.waitForFunction(() => {
      const c = window.__brumaluz!.vilaParque!.carros();
      return !!c && c.slice(0, 4).some((q) => q.vel > 0.5);
    });
    await m(`olhando-${quando}`);
    await foto(page, `celular-bate-olhando-${quando}`, true);
    // do canto, de comprido (o pior caso: a pista e o parque atrás)
    await ir(page, B.x0 - 1.5, B.z1 + 1.5, Y + 0.2);
    await olhar(page, B.x1, B.z0 + 10, 0.08);
    await assentar(page, 12);
    await m(`do-canto-${quando}`);
    // guiando no meio da pista, batendo
    await ir(page, B.vagas[5][0], B.z1 + 2.5, Y + 0.2);
    await olhar(page, B.vagas[5][0], B.vagas[5][1], 0.3);
    await page.waitForTimeout(1800);
    await sentar(page, 2, 'bate');
    await page.waitForTimeout(1500);
    const guiando = guiar(page, { batidas: 99 }, 14_000);
    await page.waitForTimeout(5000);
    await m(`guiando-${quando}`);
    await foto(page, `celular-bate-guiando-${quando}`, true);
    await guiando;
    await page.evaluate(() => window.__brumaluz!.vilaParque!.sair());
    await page.waitForFunction(() => !window.__brumaluz!.vilaParque!.sentado());
    await page.waitForTimeout(1500);
  }
  const prev = await page.evaluate(() => window.__brumaluz!.vilaParque!.bate());
  console.log(`MEDIDAS DO BATE-BATE${sufixo} ${JSON.stringify(medidas)}`);
  console.log(`LOGICA DO QUADRO (ms)${sufixo} ${JSON.stringify(logica)}`);
  console.log(`PREVISAO ${JSON.stringify(prev)}`);
  if (lento <= 1)
    for (const [k, v] of Object.entries(medidas)) expect(v, k).toBeGreaterThanOrEqual(45);
  await page.context().close();
});

test('celular em pé: a câmera de cada brinquedo (os retratos)', async ({ browser }) => {
  test.skip(!quer('retratos'), 'só com retratos');
  const page = await abrir(browser, 'vila-bate-retratos', 'empe', 4, ['f1', 'f2', 'f4']);
  const p = await plano(page);
  const pq = p.pontos.parque;
  const Y = p.h + 1;
  // o carrossel
  await ir(page, pq.carrossel.x, pq.carrossel.z - pq.carrossel.beira - 4, Y + 0.2);
  await olhar(page, pq.carrossel.x, pq.carrossel.z, -0.05);
  await assentar(page, 12);
  await sentar(page, 1, 'carrossel');
  await page.waitForTimeout(3500);
  await foto(page, 'retrato-carrossel', true);
  await page.waitForTimeout(4500);
  await foto(page, 'retrato-carrossel-2', true);
  await page.evaluate(() => window.__brumaluz!.vilaParque!.sair());
  await page.waitForFunction(() => !window.__brumaluz!.vilaParque!.sentado());
  await page.waitForTimeout(1200);
  // o bate-bate
  const B = pq.bate;
  await ir(page, B.vagas[5][0], B.z1 + 2.5, Y + 0.2);
  await olhar(page, B.vagas[5][0], B.vagas[5][1], 0.3);
  await assentar(page, 12);
  await sentar(page, 2, 'bate');
  await page.waitForTimeout(2600);
  await foto(page, 'retrato-bate-na-vaga', true);
  await guiar(page, { batidas: 1 }, 12_000);
  await foto(page, 'retrato-bate-batida', true);
  await guiar(page, { x: B.x, z: B.z }, 6000);
  await page.waitForTimeout(600);
  await foto(page, 'retrato-bate-guiando', true);
  await page.evaluate(() => window.__brumaluz!.vilaParque!.sair());
  await page.waitForFunction(() => !window.__brumaluz!.vilaParque!.sentado());
  await page.waitForTimeout(1200);
  // a roda-gigante
  await ir(page, pq.roda.saida[0], pq.roda.saida[2] + 1.5, Y + 0.2);
  await olhar(page, pq.roda.x, pq.roda.z, -0.3);
  await assentar(page, 12);
  await sentar(page, 0, 'roda');
  await page.waitForFunction((y) => window.__brumaluz!.jogadorPes!()[1] > y + 6, Y, {
    timeout: 30_000,
  });
  await foto(page, 'retrato-roda-subindo', true);
  await page.waitForFunction((y) => window.__brumaluz!.jogadorPes!()[1] > y + 14.4, Y, {
    timeout: 30_000,
  });
  await foto(page, 'retrato-roda-no-alto', true);
  await page.context().close();
});

test('o carrossel: o mastro na frente de quem senta (de lado, de frente e de cima, com cabelos e fantasias)', async ({
  browser,
}) => {
  test.skip(!quer('mastro'), 'só com mastro');
  const page = await abrir(browser, 'vila-bate-mastro', 'pc', 4, ['f1', 'f2', 'f4']);
  const p = await plano(page);
  const c = p.pontos.parque.carrossel;
  const Y = p.h + 1;
  // a câmera vai junto do cavalinho: de lado, de frente e de cima (em relação ao corpo de quem senta)
  await page.evaluate(() => {
    const e = window.__brumaluz!;
    const w = window as unknown as {
      __camFixa: unknown;
      __junto: { lado: number; alt: number; frente: number } | null;
    };
    w.__junto = null;
    e.cenaBabylon!().onBeforeRenderObservable.add(() => {
      const j = w.__junto;
      const l = e.vilaParque?.lugar();
      if (!j || !l) return;
      const fx = Math.sin(l.yaw);
      const fz = Math.cos(l.yaw);
      w.__camFixa = {
        p: [l.x + fx * j.frente + fz * j.lado, l.y + j.alt, l.z + fz * j.frente - fx * j.lado],
        a: [l.x + fx * 0.3, l.y + 0.55, l.z + fz * 0.3],
      };
    });
  });
  const junto = (lado: number, alt: number, frente: number) =>
    page.evaluate(
      (j) => {
        (window as unknown as { __junto: unknown }).__junto = j;
      },
      { lado, alt, frente },
    );
  const vestir = (a: Record<string, unknown>) =>
    page.evaluate((a) => window.__brumaluz!.personagem!.definir(a as never), a);
  const GENTE: [string, Record<string, unknown>][] = [
    ['de-sempre', {}],
    ['roqueira', { corpo: 'feminino', fantasia: { id: 'roqueira-palco', cor: 0 } }],
    ['roqueiro', { corpo: 'masculino', fantasia: { id: 'roqueira-palco', cor: 0 } }],
    ['cabelo-7', { corpo: 'feminino', fantasia: undefined, cabeloEstilo: 7 }],
    ['cabelo-5', { corpo: 'feminino', fantasia: undefined, cabeloEstilo: 5 }],
    ['cabelo-3', { corpo: 'masculino', fantasia: undefined, cabeloEstilo: 3 }],
  ];
  // dois cavalinhos (o branco e o caramelo): senta de dois lados do carrossel
  for (const [k, lado] of [
    [0, -1],
    [1, 1],
  ] as const) {
    await junto(0, 0, 0);
    await page.evaluate(() => {
      (window as unknown as { __junto: unknown; __camFixa: unknown }).__junto = null;
      (window as unknown as { __camFixa: unknown }).__camFixa = null;
    });
    await ir(page, c.x + lado * (c.beira + 3 + k), c.z + k * 1.3, Y + 0.2);
    await olhar(page, c.x, c.z, -0.05);
    await assentar(page, 12);
    await page.evaluate(() => window.__brumaluz!.vilaParque!.sentar(1));
    await page.waitForFunction(() => window.__brumaluz!.vilaParque!.sentado()?.b === 'carrossel');
    const i = await page.evaluate(() => window.__brumaluz!.vilaParque!.sentado()!.i);
    await page.waitForTimeout(1200);
    for (const [nome, a] of k === 0 ? GENTE : GENTE.slice(0, 2)) {
      await vestir(a);
      await page.waitForTimeout(900);
      for (const [vista, cam] of [
        ['lado', [2.3, 0.7, 0.3]],
        ['frente', [0.9, 0.9, 2.4]],
        ['cima', [0.5, 2.6, -0.4]],
      ] as const) {
        await junto(cam[0], cam[1], cam[2]);
        await page.waitForTimeout(450);
        await foto(page, `mastro-cavalinho${i}-${nome}-${vista}`);
      }
      // o sobe e desce: mais uma de lado, um segundo e meio depois (a outra ponta do balanço)
      await junto(2.3, 0.7, 0.3);
      await page.waitForTimeout(1600);
      await foto(page, `mastro-cavalinho${i}-${nome}-lado-2`);
    }
    await page.evaluate(() => window.__brumaluz!.vilaParque!.sair());
    await page.waitForFunction(() => !window.__brumaluz!.vilaParque!.sentado());
    await page.waitForTimeout(1300);
  }
  await page.context().close();
});
