import { test, type Page } from '@playwright/test';
import { escolherNaRoleta } from './roleta-palco';

/**
 * Desempenho da spec 036 (T00 na main de antes, T08 no ramo): na Vila Neon de dia, celular em
 * pé (390x844, toque), com a CPU 4x mais lenta (DESACELERAR_CPU, padrão 4). Só com
 * MEDIR_DESEMPENHO=1 (e E2E_SEM_VSYNC=1, para os quadros não pararem nos 60).
 *
 * - **a cena:** 4 amigos à vista, girando a câmera devagar por 8 s, em rodadas alternadas: sem
 *   nada, com os premium de hoje (os 6 da 023) e, no ramo, montados (um em cada brinquedo, com o
 *   boné, o pijama, as asas, o foguete e o passarinho) e a pé com os tesouros da mão (varinha,
 *   guarda-chuva e pipa). A primeira vez de cada um anota o quadro mais longo enquanto os bonecos
 *   se montam (a trava de vestir um premium pela primeira vez).
 * - **montar:** os 4 amigos montam e descem juntos, 4 vezes; o quadro mais longo em cada troca.
 * - **a vitrine:** a primeira abertura da página, do pedido até os cartões na tela e até as
 *   figuras do 3D prontas (DESEMPENHO_036=vitrine; o padrão roda as duas).
 *
 *   E2E_ENV="-u 1000:1000 -e HOME=/tmp -e MEDIR_DESEMPENHO=1 -e E2E_SEM_VSYNC=1" \
 *     scripts/e2e-gpu.sh e2e/desempenho-036.spec.ts --workers 1 --trace off
 */
declare const process: { env: Record<string, string | undefined> };
test.skip(!process.env.MEDIR_DESEMPENHO, 'medição só com MEDIR_DESEMPENHO');
test.describe.configure({ mode: 'serial' });
test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });

const SO = process.env.DESEMPENHO_036;
const LENTO = Number(process.env.DESACELERAR_CPU ?? 4);

const BASE: Record<string, Record<string, unknown>> = {
  lia: { corpo: 'feminino', cabeloEstilo: 5, cabeloCor: 1 },
  theo: { corpo: 'masculino', cabeloEstilo: 0 },
  bia: { corpo: 'feminino', cabeloEstilo: 2 },
  gui: { corpo: 'masculino', cabeloEstilo: 1 },
};
type Cenario = 'nada' | 'hoje' | 'andar' | 'montados' | 'mao';
const RODADAS = Number(process.env.RODADAS ?? 3);
const PREMIUM: Record<Exclude<Cenario, 'nada'>, Record<string, Record<string, string>>> = {
  // só os brinquedos de andar, montados (a medida da T05)
  andar: {
    lia: { andar: 'patinete-luz' },
    theo: { andar: 'carrinho-pedal' },
    bia: { andar: 'bicicletinha' },
    gui: { andar: 'nuvem-fofa' },
  },
  // os 6 de antes da 036, como na medida da 023
  hoje: {
    lia: { roupa: 'tenis-cometa', fantasia: 'dragao', bicho: 'unicornio' },
    theo: { roupa: 'camiseta-aquario', costas: 'capa-estrelas', bicho: 'pinguim' },
    bia: { roupa: 'tenis-cometa', costas: 'capa-estrelas', bicho: 'unicornio' },
    gui: { roupa: 'camiseta-aquario', fantasia: 'dragao', bicho: 'pinguim' },
  },
  // um em cada brinquedo, com os novos de cabeça, roupa, costas e bicho
  montados: {
    lia: { andar: 'patinete-luz', chapeu: 'bone-helice', roupa: 'pijama-nuvem', costas: 'asas-borboleta', bicho: 'passarinho-ombro' },
    theo: { andar: 'carrinho-pedal', chapeu: 'bone-helice', costas: 'mochila-foguete', bicho: 'passarinho-ombro' },
    bia: { andar: 'bicicletinha', roupa: 'pijama-nuvem', costas: 'asas-borboleta', bicho: 'unicornio' },
    gui: { andar: 'nuvem-fofa', chapeu: 'bone-helice', costas: 'mochila-foguete', bicho: 'passarinho-ombro' },
  },
  // a pé, com os tesouros da mão (montada, a mão fica guardada)
  mao: {
    lia: { mao: 'varinha-bolhas', chapeu: 'bone-helice', costas: 'asas-borboleta', bicho: 'passarinho-ombro' },
    theo: { mao: 'guarda-chuva-gotinhas', roupa: 'pijama-nuvem', costas: 'mochila-foguete' },
    bia: { mao: 'pipa-lacinhos', chapeu: 'bone-helice', costas: 'asas-borboleta' },
    gui: { mao: 'varinha-bolhas', roupa: 'pijama-nuvem', costas: 'mochila-foguete', bicho: 'passarinho-ombro' },
  },
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
      // a distância e a qualidade de fábrica do celular (as de uma criança de verdade)
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

/** Começa a anotar o quadro mais longo (até `pararVigia`). */
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

/** Põe os 4 amigos com o cenário (e `montado` quando pedido); devolve o quadro mais longo em 5 s. */
async function amigos(page: Page, cenario: Cenario, montado = cenario === 'montados' || cenario === 'andar'): Promise<number> {
  const premium = cenario === 'nada' ? null : PREMIUM[cenario];
  await vigiar(page);
  await page.evaluate(
    ({ lugares, base, premium, montado }) => {
      const e = window.__brumaluz!;
      const w = window as unknown as { __intervaloAmigos?: number };
      if (w.__intervaloAmigos) clearInterval(w.__intervaloAmigos);
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
            ...(premium ? { premium: premium[id] } : {}),
            ...(montado ? { montado: true } : {}),
          },
          x,
          y: chao(x, z),
          z,
          yaw: yaw + Math.PI,
        };
      });
      e.amigosDeTeste!(postos);
      w.__intervaloAmigos = setInterval(() => e.amigosDeTeste!(postos), 300) as unknown as number;
    },
    { lugares: LUGARES, base: BASE, premium, montado },
  );
  await page.waitForTimeout(5000);
  return pararVigia(page);
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
}

test('a cena com 4 amigos e o montar (Vila Neon de dia, celular em pé)', async ({ page }) => {
  test.skip(!!SO && SO !== 'cena');
  test.setTimeout(900_000);
  await abrir(page);
  // a régua: sem desacelerar, sem nada
  await amigos(page, 'nada');
  const semDesacelerar = await medir(page);
  await desacelerar(page);
  // o ramo sabe dos novos? (na main de antes, os de andar e da mão não existem)
  const novos = await page.evaluate(() => {
    const e = window.__brumaluz!;
    return typeof (e.personagem as { montado?: unknown } | undefined)?.montado === 'function';
  });
  const cenarios: Cenario[] = novos ? ['nada', 'hoje', 'andar', 'montados', 'mao'] : ['nada', 'hoje'];
  const medidas: Record<string, unknown[]> = {};
  const primeiraVez: Record<string, number[]> = {};
  // rodadas alternadas: o aquecimento não pesa num lado só
  for (let r = 0; r < RODADAS; r++)
    for (const c of cenarios) {
      const trava = await amigos(page, c);
      (primeiraVez[c] ??= []).push(trava);
      (medidas[c] ??= []).push(await medir(page));
    }
  // montar e descer: os 4 juntos, 4 vezes cada (já vestidos: só acende o brinquedo)
  const montar: number[] = [];
  const descer: number[] = [];
  if (novos) {
    await amigos(page, 'montados', false);
    for (let k = 0; k < 6; k++) {
      montar.push(await amigos(page, 'montados', true));
      descer.push(await amigos(page, 'montados', false));
    }
  }
  console.log(`DESEMPENHO-036 cena ${JSON.stringify({ novos, semDesacelerar, medidas, primeiraVez, montar, descer })}`);
});

test('a vitrine na primeira abertura (celular em pé)', async ({ page }) => {
  test.skip(!!SO && SO !== 'vitrine');
  test.setTimeout(600_000);
  await abrir(page);
  await desacelerar(page);
  await page.waitForTimeout(2000);
  await page.evaluate(() => {
    const w = window as unknown as { __tLoja: number; __tPronta: number; __tCartoes: number; __maxQ: number };
    w.__tLoja = w.__tPronta = w.__tCartoes = w.__maxQ = 0;
    let ultimo = 0;
    const pronta = () => {
      const agora = performance.now();
      if (ultimo) w.__maxQ = Math.max(w.__maxQ, agora - ultimo);
      ultimo = agora;
      if (!w.__tCartoes) {
        const c = document.querySelector('.alma-lcard');
        if (c && c.getBoundingClientRect().height > 0) w.__tCartoes = agora;
      }
      const cvs = [...document.querySelectorAll<HTMLCanvasElement>('.alma-lcard canvas')];
      const ok =
        cvs.length > 0 &&
        cvs.every((cv) => {
          const c = cv.getContext('2d');
          if (!c || !cv.width) return false;
          const d = c.getImageData(0, 0, cv.width, cv.height).data;
          let n = 0;
          for (let i = 3; i < d.length; i += 16) if (d[i] > 0) n++;
          return n > 50;
        });
      if (ok) w.__tPronta = agora;
      else requestAnimationFrame(pronta);
    };
    window.addEventListener(
      'brumaluz:lojinha',
      () => {
        w.__tLoja = performance.now();
        requestAnimationFrame(pronta);
      },
      { once: true },
    );
  });
  await escolherNaRoleta(page, 'lojinha');
  await page.waitForFunction(() => (window as unknown as { __tPronta: number }).__tPronta > 0, undefined, {
    timeout: 60_000,
  });
  const r = await page.evaluate(() => {
    const w = window as unknown as { __tLoja: number; __tPronta: number; __tCartoes: number; __maxQ: number };
    return {
      cartoesMs: Math.round(w.__tCartoes - w.__tLoja),
      figurasMs: Math.round(w.__tPronta - w.__tLoja),
      maiorQuadroMs: Math.round(w.__maxQ),
      cartoes: document.querySelectorAll('.alma-lcard').length,
    };
  });
  console.log(`DESEMPENHO-036 vitrine ${JSON.stringify(r)}`);
});
