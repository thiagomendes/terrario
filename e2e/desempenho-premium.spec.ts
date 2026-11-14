import { test, type Page } from '@playwright/test';

/**
 * Desempenho da spec 023 (T15): 4 amigos vestindo os premium (os 6 do catálogo entre eles, o
 * dragãozinho e a capa, o unicórnio e o pinguim seguindo) perto e à vista, girando a câmera
 * devagar, contra os mesmos 4 amigos sem premium. A criança também veste (tênis, capa e
 * unicórnio). Computador (1280x720) e celular (390x844, toque), com a CPU 4x mais lenta
 * (DESACELERAR_CPU, padrão 4). Só com MEDIR_DESEMPENHO=1 (e E2E_SEM_VSYNC=1).
 */
declare const process: { env: Record<string, string | undefined> };
test.skip(!process.env.MEDIR_DESEMPENHO, 'medição só com MEDIR_DESEMPENHO');
test.describe.configure({ mode: 'serial' });

const BASE: Record<string, Record<string, unknown>> = {
  lia: { corpo: 'feminino', cabeloEstilo: 5, cabeloCor: 1 },
  theo: { corpo: 'masculino', cabeloEstilo: 0 },
  bia: { corpo: 'feminino', cabeloEstilo: 2 },
  gui: { corpo: 'masculino', cabeloEstilo: 1 },
};
const PREMIUM: Record<string, Record<string, string>> = {
  lia: { roupa: 'tenis-cometa', fantasia: 'dragao', bicho: 'unicornio' },
  theo: { roupa: 'camiseta-aquario', costas: 'capa-estrelas', bicho: 'pinguim' },
  bia: { roupa: 'tenis-cometa', costas: 'capa-estrelas', bicho: 'unicornio' },
  gui: { roupa: 'camiseta-aquario', fantasia: 'dragao', bicho: 'pinguim' },
};
/** [id, ângulo em relação ao olhar, distância]: os quatro à vista, de perto a média distância. */
const LUGARES: [string, number, number][] = [
  ['lia', -0.25, 6],
  ['theo', 0.2, 8],
  ['bia', -0.05, 11],
  ['gui', 0.32, 14],
];

async function abrir(page: Page) {
  await page.addInitScript(() => {
    try {
      localStorage.setItem(
        'terrario:config',
        JSON.stringify({ distancia: 7, mostrarFps: true, qualidade: 'alta', mostrarAtalhos: false }),
      );
    } catch {
      // sem armazenamento
    }
  });
  await page.goto('/?tema=rancho-alegre');
  await page.waitForFunction(() => window.__brumaluz?.ready === true, undefined, { timeout: 240_000 });
  await page.evaluate(() => {
    document.querySelector('.entrada')?.setAttribute('hidden', '');
    const e = window.__brumaluz!;
    e.pausarDia = true;
    e.hora = 0.42;
    e.definirClima?.('limpo');
  });
  await page.waitForTimeout(12_000);
  // o quadro de missões abre sozinho na primeira visita: fecha (senão ele tapa a medida)
  await page.evaluate(() => {
    (window as unknown as { __almaUi?: { hud: { fechar(): void } } }).__almaUi?.hud.fechar();
  });
  await page.waitForTimeout(500);
}

/** Põe os amigos (com ou sem premium) e a criança (com ou sem premium). */
type Parte = 'tudo' | 'roupas' | 'bichos' | 'nada';
async function amigos(page: Page, parte: Parte | boolean) {
  const qual: Parte = parte === true ? 'tudo' : parte === false ? 'nada' : parte;
  const filtrado: Record<string, Record<string, string>> = {};
  for (const [id, p] of Object.entries(PREMIUM))
    filtrado[id] = Object.fromEntries(
      Object.entries(p).filter(([c]) =>
        qual === 'tudo' ? true : qual === 'bichos' ? c === 'bicho' : qual === 'roupas' ? c !== 'bicho' : false,
      ),
    );
  const comPremium = qual !== 'nada';
  await page.evaluate(
    ({ lugares, base, premium, comPremium }) => {
      const e = window.__brumaluz!;
      const w = window as unknown as { __intervaloAmigos?: number };
      if (w.__intervaloAmigos) clearInterval(w.__intervaloAmigos);
      e.personagem!.definir({
        premium: comPremium
          ? { roupa: 'tenis-cometa', costas: 'capa-estrelas', bicho: 'unicornio' }
          : undefined,
      } as never);
      const p = e.jogadorPes?.() ?? e.posicao!;
      const yaw = 0.3;
      e.apontar!(yaw, 0.15);
      const chao = (x: number, z: number) => {
        for (let y = 120; y > 2; y--)
          if (e.bloco!(Math.floor(x), y - 1, Math.floor(z)) && !e.bloco!(Math.floor(x), y, Math.floor(z)))
            return y;
        return p[1];
      };
      const postos = lugares.map(([id, ang, d]) => {
        const x = p[0] + Math.sin(yaw + ang) * d;
        const z = p[2] + Math.cos(yaw + ang) * d;
        return {
          id,
          aparencia: { ...base[id], ...(comPremium ? { premium: premium[id] } : {}) },
          x,
          y: chao(x, z),
          z,
          yaw: yaw + Math.PI,
        };
      });
      e.amigosDeTeste!([]);
      e.amigosDeTeste!(postos);
      w.__intervaloAmigos = setInterval(() => e.amigosDeTeste!(postos), 300) as unknown as number;
    },
    { lugares: LUGARES, base: BASE, premium: filtrado, comPremium },
  );
  await page.waitForTimeout(5000);
}

/** Mede 8 s girando a câmera devagar, de um lado para o outro, com os amigos à vista. */
async function medir(page: Page) {
  return page.evaluate(async () => {
    const e = window.__brumaluz!;
    const amostras: number[] = [];
    const ms = 8000;
    const t0 = performance.now();
    let ultimo = t0;
    const d0 = e.desenho?.();
    const logica: number[] = [];
    await new Promise<void>((ok) => {
      const passo = () => {
        const agora = performance.now();
        e.apontar!(0.3 + Math.sin((agora - t0) / 1600) * 0.35, 0.18);
        amostras.push(agora - ultimo);
        ultimo = agora;
        logica.push(e.logicaQuadroMs ?? 0);
        if (agora < t0 + ms) requestAnimationFrame(passo);
        else ok();
      };
      requestAnimationFrame(passo);
    });
    const d1 = e.desenho?.();
    const media = (a: number[]) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);
    amostras.sort((a, b) => a - b);
    const ef = e.personagem?.efeitosPremium?.();
    return {
      fps: Math.round((amostras.length / (ms / 1000)) * 10) / 10,
      p95ms: Math.round(amostras[Math.floor(amostras.length * 0.95)] * 10) / 10,
      logicaMs: Math.round(media(logica) * 100) / 100,
      desenhos: d0 && d1 ? Math.round((d1.chamadas - d0.chamadas) / amostras.length) : undefined,
      efeitos: ef,
    };
  });
}

for (const celular of [false, true]) {
  const pre = celular ? 'celular' : 'computador';
  test.describe(pre, () => {
    if (celular)
      test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
    else test.use({ viewport: { width: 1280, height: 720 } });
    test(`4 amigos com premium (${pre})`, async ({ page }) => {
      test.setTimeout(900_000);
      await abrir(page);
      const lento = Number(process.env.DESACELERAR_CPU ?? 4);
      if (lento > 1) {
        const cdp = await page.context().newCDPSession(page);
        await cdp.send('Emulation.setCPUThrottlingRate', { rate: lento });
      }
      // duas rodadas alternadas (sem, com, sem, com): o aquecimento não pesa num lado só
      const sem: unknown[] = [];
      const com: unknown[] = [];
      for (let r = 0; r < 2; r++) {
        await amigos(page, false);
        sem.push(await medir(page));
        await amigos(page, true);
        com.push(await medir(page));
      }
      // de onde vem o custo: só as roupas (capa, dragão, tênis, camiseta) ou só os bichos
      const partes: Record<string, unknown> = {};
      if (process.env.PREMIUM_PARTES)
        for (const parte of ['roupas', 'bichos'] as const) {
          await amigos(page, parte);
          partes[parte] = await medir(page);
        }
      if (process.env.PREMIUM_PARTES) await amigos(page, true);
      if (process.env.PREMIUM_FOTO) {
        await page.evaluate(() => window.__brumaluz!.apontar!(0.3, 0.12));
        await page.waitForTimeout(800);
      }
      if (process.env.PREMIUM_FOTO)
        await page.screenshot({ path: `${process.env.PREMIUM_FOTO}/amigos-premium-${pre}.png` });
      console.log(`DESEMPENHO-023 ${pre} ${JSON.stringify({ sem, com, partes })}`);
    });
  });
}
