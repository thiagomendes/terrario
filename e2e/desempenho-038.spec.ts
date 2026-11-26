import { test, type Page } from '@playwright/test';
import { PREMIUM } from '../src/jogo/alma';

/**
 * Desempenho da spec 038 (T00 na main a217838, T06 no ramo, a main contra o ramo na mesma
 * rodada). Só com MEDIR_DESEMPENHO=1 (e E2E_SEM_VSYNC=1, para os quadros não pararem nos 60).
 * Vila Neon de dia, celular em pé (390x844, toque), CPU 4x mais lenta (DESACELERAR_CPU).
 *
 * Os três cenários da "Experiência medida", com 4 amigos à vista, parados e andando no lugar
 * (as pernas e os pedais mexendo), em rodadas alternadas (RODADAS, padrão 3):
 * - **ape:** a pé, sem brinquedo;
 * - **vestido:** a pé, com o brinquedo de pedal vestido (bicicletinha e carrinho), sem montar;
 * - **montados:** bicicletinha, bicicletinha, carrinho e carrinho; quando o catálogo tem a
 *   `motoquinha-dourada` (o ramo), as duas primeiras viram motoquinha.
 *
 * Por medida: quadros por segundo, p95, o quadro mais longo e as chamadas de desenho por quadro
 * (8 s girando a câmera devagar); por cenário, as malhas e as malhas ativas por boneco (a
 * diferença para a cena sem amigos, dividida por 4) e o quadro mais longo ao trocar de cenário.
 *
 *   E2E_ENV="-u 1000:1000 -e HOME=/tmp -e MEDIR_DESEMPENHO=1 -e E2E_SEM_VSYNC=1" \
 *     scripts/e2e-gpu.sh e2e/desempenho-038.spec.ts --workers 1 --trace off
 */
declare const process: { env: Record<string, string | undefined> };
test.skip(!process.env.MEDIR_DESEMPENHO, 'medição só com MEDIR_DESEMPENHO');
test.describe.configure({ mode: 'serial' });
test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });

const LENTO = Number(process.env.DESACELERAR_CPU ?? 4);
const RODADAS = Number(process.env.RODADAS ?? 3);
const MOTO = PREMIUM.some((p) => p.id === 'motoquinha-dourada');

const BASE: Record<string, Record<string, unknown>> = {
  lia: { corpo: 'feminino', cabeloEstilo: 5, cabeloCor: 1 },
  theo: { corpo: 'masculino', cabeloEstilo: 0 },
  bia: { corpo: 'feminino', cabeloEstilo: 2 },
  gui: { corpo: 'masculino', cabeloEstilo: 1 },
};
type Cenario = 'ape' | 'vestido' | 'montados';
const CENARIOS: Cenario[] = ['ape', 'vestido', 'montados'];
const BRINQUEDO: Record<Exclude<Cenario, 'ape'>, Record<string, string>> = {
  vestido: { lia: 'bicicletinha', theo: 'carrinho-pedal', bia: 'bicicletinha', gui: 'carrinho-pedal' },
  montados: MOTO
    ? { lia: 'motoquinha-dourada', theo: 'motoquinha-dourada', bia: 'bicicletinha', gui: 'carrinho-pedal' }
    : { lia: 'bicicletinha', theo: 'bicicletinha', bia: 'carrinho-pedal', gui: 'carrinho-pedal' },
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
    HTMLElement.prototype.requestPointerLock = function () {
      return Promise.resolve();
    } as typeof HTMLElement.prototype.requestPointerLock;
    try {
      // a distância e a qualidade de fábrica do celular
      localStorage.setItem('terrario:config', JSON.stringify({ mostrarFps: false, mostrarAtalhos: false }));
    } catch {
      // sem armazenamento
    }
  });
  await page.goto('/?tema=vila-neon');
  await page.waitForFunction(() => window.__brumaluz?.ready === true, undefined, { timeout: 240_000 });
  await page.evaluate(() => {
    document.querySelector('.entrada')?.setAttribute('hidden', '');
    const e = window.__brumaluz!;
    e.pausarDia = true;
    e.hora = 0.42;
    e.definirClima?.('limpo');
  });
  await page.addStyleTag({ content: '.toast-area { display: none !important; }' });
  // espera os pedaços do mundo pararem de chegar (senão a medida pega a geração do terreno)
  let antes = -1;
  for (let i = 0; i < 60; i++) {
    await page.waitForTimeout(1500);
    const n = await page.evaluate(() => window.__brumaluz!.chunksCarregados ?? 0);
    if (n === antes && n >= 12) break;
    antes = n;
  }
  await page.waitForTimeout(2000);
  // o quadro de missões abre sozinho na primeira visita: fecha (senão ele tapa a medida)
  await page.evaluate(() => {
    (window as unknown as { __almaUi?: { hud: { fechar(): void } } }).__almaUi?.hud.fechar();
  });
  await page.waitForTimeout(500);
}

async function desacelerar(page: Page) {
  if (LENTO <= 1) return;
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: LENTO });
}

const vigiar = (page: Page) =>
  page.evaluate(() => {
    const w = window as unknown as { __vigia?: { max: number; ativo: boolean } };
    const v = (w.__vigia = { max: 0, ativo: true });
    let ultimo = performance.now();
    const passo = () => {
      const agora = performance.now();
      v.max = Math.max(v.max, agora - ultimo);
      ultimo = agora;
      if (v.ativo) requestAnimationFrame(passo);
    };
    requestAnimationFrame(passo);
  });
const pararVigia = (page: Page) =>
  page.evaluate(() => {
    const v = (window as unknown as { __vigia: { max: number; ativo: boolean } }).__vigia;
    v.ativo = false;
    return Math.round(v.max);
  });

/** Malhas na cena e malhas ativas no último quadro. */
const contar = (page: Page) =>
  page.evaluate(() => {
    const d = window.__brumaluz!.desenho!();
    return { malhas: d.malhas, ativas: d.ativas };
  });

/**
 * Põe os 4 amigos no cenário (null tira todos), parados ou andando no lugar; espera os bonecos
 * se montarem e devolve o quadro mais longo nesses 5 s.
 */
async function amigos(page: Page, cenario: Cenario | null, andando: boolean): Promise<number> {
  await vigiar(page);
  await page.evaluate(
    ({ lugares, base, brinquedo, montado, vel }) => {
      const e = window.__brumaluz!;
      const w = window as unknown as { __intervaloAmigos?: number };
      if (w.__intervaloAmigos) clearInterval(w.__intervaloAmigos);
      if (!lugares.length) {
        e.amigosDeTeste!([]);
        return;
      }
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
          aparencia: {
            ...base[id],
            ...(brinquedo ? { premium: { andar: brinquedo[id] } } : {}),
            ...(montado ? { montado: true } : {}),
          },
          x,
          y: chao(x, z),
          z,
          yaw: yaw + Math.PI,
          vel,
        };
      });
      e.amigosDeTeste!(postos);
      w.__intervaloAmigos = setInterval(() => e.amigosDeTeste!(postos), 300) as unknown as number;
    },
    {
      lugares: cenario ? LUGARES : [],
      base: BASE,
      brinquedo: cenario && cenario !== 'ape' ? BRINQUEDO[cenario] : null,
      montado: cenario === 'montados',
      vel: andando ? 2.5 : 0,
    },
  );
  await page.waitForTimeout(5000);
  return pararVigia(page);
}

/** Mede 8 s girando a câmera devagar, de um lado para o outro, com os amigos à vista. */
const medir = (page: Page) =>
  page.evaluate(async () => {
    const e = window.__brumaluz!;
    const amostras: number[] = [];
    const ms = 8000;
    const t0 = performance.now();
    let ultimo = t0;
    const d0 = e.desenho?.();
    await new Promise<void>((ok) => {
      const passo = () => {
        const agora = performance.now();
        e.apontar!(0.3 + Math.sin((agora - t0) / 1600) * 0.35, 0.18);
        amostras.push(agora - ultimo);
        ultimo = agora;
        if (agora < t0 + ms) requestAnimationFrame(passo);
        else ok();
      };
      requestAnimationFrame(passo);
    });
    const d1 = e.desenho?.();
    const n = amostras.length;
    const ordem = [...amostras].sort((a, b) => a - b);
    return {
      fps: Math.round((n / (ms / 1000)) * 10) / 10,
      p95ms: Math.round(ordem[Math.floor(n * 0.95)] * 10) / 10,
      maxMs: Math.round(ordem[n - 1]),
      desenhos: d0 && d1 ? Math.round((d1.chamadas - d0.chamadas) / n) : undefined,
    };
  });

test('4 amigos a pé, com o brinquedo vestido e montados (Vila Neon de dia, celular em pé)', async ({ page }) => {
  test.setTimeout(1_200_000);
  await abrir(page);
  // as malhas sem amigos (a régua das malhas por boneco), antes de desacelerar
  await amigos(page, null, false);
  const semAmigos = await contar(page);
  await desacelerar(page);
  type Medida = Awaited<ReturnType<typeof medir>>;
  const medidas: Record<string, Medida[]> = {};
  const troca: Record<string, number[]> = {};
  const porBoneco: Record<string, { malhas: number; ativas: number }> = {};
  // rodadas alternadas: o aquecimento não pesa num cenário só
  for (let r = 0; r < RODADAS; r++)
    for (const c of CENARIOS)
      for (const andando of [false, true]) {
        const k = `${c}${andando ? '-andando' : '-parados'}`;
        (troca[k] ??= []).push(await amigos(page, c, andando));
        if (r === 0 && !andando) {
          const n = await contar(page);
          porBoneco[c] = {
            malhas: Math.round(((n.malhas - semAmigos.malhas) / 4) * 10) / 10,
            ativas: Math.round(((n.ativas - semAmigos.ativas) / 4) * 10) / 10,
          };
        }
        (medidas[k] ??= []).push(await medir(page));
      }
  const mediana = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
  const resumo: Record<string, { fps: number; desenhos: number; maxMs: number; trocaMaxMs: number }> = {};
  for (const [k, ms] of Object.entries(medidas))
    resumo[k] = {
      fps: mediana(ms.map((m) => m.fps)),
      desenhos: mediana(ms.map((m) => m.desenhos ?? 0)),
      maxMs: Math.max(...ms.map((m) => m.maxMs)),
      trocaMaxMs: Math.max(...troca[k]),
    };
  console.log(
    `DESEMPENHO-038 ${JSON.stringify({ moto: MOTO, brinquedos: BRINQUEDO, semAmigos, porBoneco, resumo, medidas, troca })}`,
  );
});
