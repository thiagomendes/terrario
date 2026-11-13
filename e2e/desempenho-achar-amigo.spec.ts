import { test, type Page } from '@playwright/test';

/**
 * Desempenho da spec 021 "Achar o amigo": 7 amigos fantasiados (o gancho `amigosDeTeste`),
 * 2 à vista e 5 fora da tela (as carinhas na borda), girando a câmera devagar; depois com a
 * trilha de estrelinhas acesa até o mais longe. Computador (1280x720) e celular (390x844,
 * toque), com a CPU 4x mais lenta (DESACELERAR_CPU, padrão 4). Roda igual na versão de antes
 * (sem a 021: só os bonecos), para comparar. Só com MEDIR_DESEMPENHO=1 (e E2E_SEM_VSYNC=1).
 */
declare const process: { env: Record<string, string | undefined> };
test.skip(!process.env.MEDIR_DESEMPENHO, 'medição só com MEDIR_DESEMPENHO');
test.describe.configure({ mode: 'serial' });

const AMIGOS: Record<string, Record<string, unknown>> = {
  lia: { corpo: 'feminino', cabeloEstilo: 5, cabeloCor: 1, fantasia: { id: 'fazendeira', cor: 0 } },
  theo: { corpo: 'masculino', cabeloEstilo: 0, fantasia: { id: 'dino', cor: 0 } },
  bia: { corpo: 'feminino', cabeloEstilo: 2, fantasia: { id: 'realeza-flores', cor: 0 } },
  gui: { corpo: 'masculino', cabeloEstilo: 1, fantasia: { id: 'astronauta', cor: 0 } },
  nina: { corpo: 'feminino', cabeloEstilo: 7, fantasia: { id: 'heroi-coracao', cor: 1 } },
  davi: { corpo: 'masculino', cabeloEstilo: 4, fantasia: { id: 'vaqueira', cor: 0 } },
  malu: { corpo: 'feminino', cabeloEstilo: 3, fantasia: { id: 'confeiteira', cor: 0 } },
};
/** [id, ângulo em relação ao olhar, distância]: 2 à vista, 5 fora da tela. */
const LUGARES: [string, number, number][] = [
  ['malu', 0.15, 9],
  ['nina', -0.2, 14],
  ['lia', -1.6, 45],
  ['theo', 1.5, 55],
  ['bia', Math.PI, 38],
  ['gui', -2.5, 120],
  ['davi', 1.0, 60],
];

async function abrir(page: Page, celular: boolean) {
  const lento = Number(process.env.DESACELERAR_CPU ?? 4);
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
  // os amigos em volta, no chão
  await page.evaluate(
    ({ lugares, aparencias }) => {
      const e = window.__brumaluz!;
      const p = (e as unknown as { jogadorPes?: () => number[] }).jogadorPes?.() ?? [
        e.posicao![0],
        e.posicao![1] - 1.62,
        e.posicao![2],
      ];
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
        return { id, aparencia: aparencias[id], x, y: chao(x, z), z, yaw: 0 };
      });
      e.amigosDeTeste!(postos);
      setInterval(() => e.amigosDeTeste!(postos), 300);
    },
    { lugares: LUGARES, aparencias: AMIGOS },
  );
  await page.waitForTimeout(4000);
  if (lento > 1) {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: lento });
  }
  void celular;
}

/** Mede 8 s girando a câmera devagar (as carinhas correm pela borda). */
async function medir(page: Page) {
  return page.evaluate(async () => {
    const e = window.__brumaluz!;
    const am = (e as unknown as { acharAmigo?: { custoMs(): number; estrelas(): { estrelas: number } } }).acharAmigo;
    const amostras: number[] = [];
    let yaw = 0.3;
    const ms = 8000;
    const fim = performance.now() + ms;
    let ultimo = performance.now();
    const d0 = e.desenho?.();
    const logica: number[] = [];
    const custo: number[] = [];
    await new Promise<void>((ok) => {
      const passo = () => {
        const agora = performance.now();
        yaw += (agora - ultimo) * 0.0003;
        e.apontar!(yaw, 0.2);
        amostras.push(agora - ultimo);
        ultimo = agora;
        logica.push(e.logicaQuadroMs ?? 0);
        if (am) custo.push(am.custoMs());
        if (agora < fim) requestAnimationFrame(passo);
        else ok();
      };
      requestAnimationFrame(passo);
    });
    const d1 = e.desenho?.();
    const media = (a: number[]) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);
    amostras.sort((a, b) => a - b);
    return {
      fps: Math.round((amostras.length / (ms / 1000)) * 10) / 10,
      p95ms: Math.round(amostras[Math.floor(amostras.length * 0.95)] * 10) / 10,
      logicaMs: Math.round(media(logica) * 100) / 100,
      camadaMs: am ? Math.round(media(custo) * 1000) / 1000 : null,
      desenhos: d0 && d1 ? Math.round((d1.chamadas - d0.chamadas) / amostras.length) : undefined,
      estrelas: am?.estrelas().estrelas ?? null,
    };
  });
}

for (const celular of [false, true]) {
  const pre = celular ? 'celular' : 'computador';
  test.describe(pre, () => {
    if (celular) test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
    else test.use({ viewport: { width: 1280, height: 720 } });
    test(`7 amigos e a trilha (${pre})`, async ({ page }) => {
      test.setTimeout(600_000);
      await abrir(page, celular);
      // a mesma sessão com a camada das carinhas desligada (a versão de antes não tem)
      const ligar = (sim: boolean) =>
        page.evaluate((sim) => {
          const am = (window.__brumaluz as unknown as { acharAmigo?: { ligar(s: boolean): void } }).acharAmigo;
          am?.ligar(sim);
          return !!am;
        }, sim);
      const tem = await ligar(false);
      const semCamada = tem ? await medir(page) : null;
      await ligar(true);
      const amigos = await medir(page);
      const temTrilha = await page.evaluate(() => {
        const am = (window.__brumaluz as unknown as { acharAmigo?: { trilha(id: string): number; caminhoMs(): number } }).acharAmigo;
        if (!am) return null;
        const passos = am.trilha('davi');
        const ms = am.caminhoMs();
        // de novo, já com tudo compilado
        am.trilha('davi');
        return { passos, ms, ms2: am.caminhoMs() };
      });
      const trilha = temTrilha ? await medir(page) : null;
      const partes = await page.evaluate(() => (window.__brumaluz as unknown as { acharAmigo?: { partesMs(): number[] } }).acharAmigo?.partesMs());
      console.log(`PARTES ${pre} ${JSON.stringify(partes)}`);
      const carinhas = await page.evaluate(() => document.querySelectorAll('.carinha-amigo:not([hidden]), .montinho-amigos:not([hidden])').length);
      console.log(`DESEMPENHO-021 ${pre} ${JSON.stringify({ semCamada, amigos, trilha, caminho: temTrilha, carinhas })}`);
    });
  });
}
