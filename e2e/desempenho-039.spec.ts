import { expect, test, type Page } from '@playwright/test';
import { Bloco } from '../src/world/blocks';

/**
 * Desempenho da spec 039 (T00 na main 1eeca93a, T08 com a main e o ramo alternados na mesma
 * sessão). Só com MEDIR_DESEMPENHO=1 (e E2E_SEM_VSYNC=1, para os quadros não pararem nos 60).
 * Celular em pé (390x844, toque), CPU 4x mais lenta (DESACELERAR_CPU).
 *
 * Os quatro cenários da "Experiência medida", cada medida numa página nova (o mesmo estado de
 * partida na main e no ramo), em rodadas alternadas (RODADAS, padrão 3): casa vazia, casa
 * mobiliada, Cidade Grande, povoado; depois a rodada seguinte.
 * - **casa-vazia:** uma casa de blocos (11 x 8 por dentro, com janelas e telhado) num tablado no
 *   alto da Vila Neon, a criança dentro, olhando para a parede do fundo;
 * - **casa-mobiliada:** a mesma casa com os oito móveis (sofá, cadeira, criado-mudo, abajur,
 *   tapete, pia, guarda-roupa e a cama nova), quando o ramo tem os blocos. Os de célula entram
 *   pelo lote (só a âncora; o núcleo monta o resto), o tapete pelo `colocar` com o item na mão.
 *   Na main a casa fica vazia (a régua: as duas casas iguais);
 * - **cidade:** a Cidade Grande vista de longe e do alto, olhando para o meio dos prédios (as
 *   camas das plantas contadas);
 * - **povoado:** o primeiro povoado do Doce Reino (casas com cama) visto de longe e do alto.
 *
 * Por medida: quadros por segundo, p95 e o quadro mais longo (8 s girando a câmera devagar), as
 * chamadas de desenho por quadro girando e paradas (2 s com a câmera parada). No fim, a mediana
 * de cada cenário e o maior quadro de todas as rodadas.
 *
 * DESEMPENHO_039=casa,cidade,povoado escolhe os cenários (casa liga a vazia e a mobiliada).
 *
 *   E2E_ENV="-u 1000:1000 -e HOME=/tmp -e MEDIR_DESEMPENHO=1 -e E2E_SEM_VSYNC=1" \
 *     scripts/e2e-gpu.sh e2e/desempenho-039.spec.ts --workers 1 --trace off
 */
declare const process: { env: Record<string, string | undefined> };
test.skip(!process.env.MEDIR_DESEMPENHO, 'medição só com MEDIR_DESEMPENHO');
test.describe.configure({ mode: 'serial' });
test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });

const LENTO = Number(process.env.DESACELERAR_CPU ?? 4);
const RODADAS = Number(process.env.RODADAS ?? 3);
const SO = process.env.DESEMPENHO_039?.split(',');
/**
 * A resolução fixa (`?escala=`), sem o ajuste automático do celular: com ele, cada página começa
 * num degrau diferente conforme os primeiros quadros, e a mesma cena dava de 39 a 66 quadros (a
 * medida da T08). Padrão 0,75 (o degrau de partida do celular); ESCALA=auto volta o ajuste.
 */
const ESCALA = process.env.ESCALA ?? '0.75';

/** Os blocos dos móveis do ramo (na main não existem: a casa mobiliada fica vazia). */
const B = Bloco as unknown as Record<string, number | undefined>;
const NOMES_MOVEIS = ['SOFA', 'CADEIRA', 'CRIADO_MUDO', 'ABAJUR', 'TAPETE', 'PIA', 'GUARDA_ROUPA', 'CAMA'] as const;
const TEM_MOVEIS = B.SOFA !== undefined && B.GUARDA_ROUPA !== undefined && B.TAPETE !== undefined;

/**
 * A disposição dentro da casa (dx, dz a partir do centro, no chão de dentro; direção 0: a frente
 * do móvel olha para -z, para a criança; as partes vão para +x e para +z). A parede do fundo
 * fica em dz = 4, a da frente em dz = -5, as dos lados em dx = -6 e 6.
 */
const DISPOSICAO: Record<Exclude<(typeof NOMES_MOVEIS)[number], 'TAPETE'>, [number, number]> = {
  GUARDA_ROUPA: [-5, 3],
  PIA: [-3, 3],
  SOFA: [-1, 3],
  CRIADO_MUDO: [2, 3],
  ABAJUR: [3, 3],
  // a cabeceira em dz = 2, o pé em dz = 3
  CAMA: [5, 2],
  CADEIRA: [-4, 0],
};
/** O tapete (3 x 2): a âncora no meio do quarto, na frente da criança. */
const TAPETE_EM: [number, number] = [-1, -1];
/**
 * Spec 039b (T03): os cinco da parte 2 na mesma casa (`casa-parte2`, todos desligados; e
 * `casa-parte2-ligada`, com a TV, o som, o fogão e a geladeira ligados pelo `forcarLigados` do
 * desenho). A meta, contra a `casa-mobiliada`: até +2 chamadas paradas desligados e até +4 ligados.
 */
const DISPOSICAO_PARTE2: Record<string, [number, number]> = {
  FOGAO: [-5, -2],
  GELADEIRA: [-4, -2],
  SOM: [-3, 0],
  MESA: [2, 0],
  TV: [4, -1],
};

type Cenario = 'casa-vazia' | 'casa-mobiliada' | 'casa-parte2' | 'casa-parte2-ligada' | 'cidade' | 'povoado';
const CENARIOS: Cenario[] = (
  ['casa-vazia', 'casa-mobiliada', 'casa-parte2', 'casa-parte2-ligada', 'cidade', 'povoado'] as Cenario[]
).filter(
  (c) =>
    !SO ||
    SO.includes(c) ||
    (c.startsWith('casa') && !c.startsWith('casa-parte2') && SO.includes('casa')) ||
    ((c === 'casa-mobiliada' || c.startsWith('casa-parte2')) && SO.includes('casa2')),
);

async function abrir(page: Page, url: string) {
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
  await page.goto(ESCALA === 'auto' ? url : `${url}&escala=${ESCALA}`);
  await page.waitForFunction(() => window.__brumaluz?.ready === true, undefined, { timeout: 240_000 });
  await page.evaluate(() => {
    document.querySelector('.entrada')?.setAttribute('hidden', '');
    const e = window.__brumaluz!;
    e.pausarDia = true;
    e.hora = 0.42;
    e.definirClima?.('limpo');
  });
  await page.addStyleTag({ content: '.toast-area { display: none !important; }' });
  await assentar(page);
  // o quadro de missões abre sozinho na primeira visita: fecha (senão ele tapa a medida)
  await page.evaluate(() => {
    (window as unknown as { __almaUi?: { hud: { fechar(): void } } }).__almaUi?.hud.fechar();
  });
  await page.waitForTimeout(500);
}

/** Espera os pedaços do mundo pararem de chegar (senão a medida pega a geração do terreno). */
async function assentar(page: Page) {
  let antes = -1;
  for (let i = 0; i < 60; i++) {
    await page.waitForTimeout(1500);
    const n = await page.evaluate(() => window.__brumaluz!.chunksCarregados ?? 0);
    if (n === antes && n >= 12) break;
    antes = n;
  }
  await page.waitForTimeout(2000);
}

async function desacelerar(page: Page) {
  if (LENTO <= 1) return;
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: LENTO });
}

/**
 * 8 s girando a câmera devagar em volta de `yaw` (com `pitch`): quadros, p95, o maior e as
 * chamadas por quadro; depois 2 s parada (as chamadas paradas).
 */
const medir = (page: Page, yaw: number, pitch: number, amplitude: number) =>
  page.evaluate(
    async ({ yaw, pitch, amplitude }) => {
      const e = window.__brumaluz!;
      const amostras: number[] = [];
      const ms = 8000;
      const t0 = performance.now();
      let ultimo = t0;
      const d0 = e.desenho?.();
      await new Promise<void>((ok) => {
        const passo = () => {
          const agora = performance.now();
          e.apontar!(yaw + Math.sin((agora - t0) / 1600) * amplitude, pitch);
          amostras.push(agora - ultimo);
          ultimo = agora;
          if (agora < t0 + ms) requestAnimationFrame(passo);
          else ok();
        };
        requestAnimationFrame(passo);
      });
      const d1 = e.desenho?.();
      const n = amostras.length;
      // parada: a câmera no meio do giro, 0,5 s para assentar e 2 s contando
      e.apontar!(yaw, pitch);
      await new Promise((ok) => setTimeout(ok, 500));
      let quadros = 0;
      const p0 = e.desenho?.();
      await new Promise<void>((ok) => {
        const t1 = performance.now();
        const passo = () => {
          quadros++;
          if (performance.now() < t1 + 2000) requestAnimationFrame(passo);
          else ok();
        };
        requestAnimationFrame(passo);
      });
      const p1 = e.desenho?.();
      const ordem = [...amostras].sort((a, b) => a - b);
      return {
        fps: Math.round((n / (ms / 1000)) * 10) / 10,
        p95ms: Math.round(ordem[Math.floor(n * 0.95)] * 10) / 10,
        maxMs: Math.round(ordem[n - 1]),
        desenhos: d0 && d1 ? Math.round((d1.chamadas - d0.chamadas) / n) : -1,
        desenhosParado: p0 && p1 && quadros ? Math.round((p1.chamadas - p0.chamadas) / quadros) : -1,
        malhas: p1?.malhas ?? -1,
        ativas: p1?.ativas ?? -1,
        // o ajuste sozinho do celular (a resolução e os efeitos tirados): explica as quedas
        escala: e.escalaResolucao,
        alivio: e.alivioEfeitos ?? 0,
      };
    },
    { yaw, pitch, amplitude },
  );

type Medida = Awaited<ReturnType<typeof medir>>;
const medidas: Partial<Record<Cenario, Medida[]>> = {};
const notas: Partial<Record<Cenario, unknown>> = {};

/** A casa de blocos num tablado no alto (pelo lote: longe das construções protegidas). */
async function montarCasa(page: Page) {
  const casa = await page.evaluate(
    ({ PEDRA_LISA, TABUAS, TABUAS_BETULA, VIDRO }) => {
      const e = window.__brumaluz!;
      const [px, , pz] = e.posicao!;
      const cx = Math.floor(px);
      const cz = Math.floor(pz);
      let alto = 0;
      for (let dx = -10; dx <= 10; dx++)
        for (let dz = -10; dz <= 10; dz++) {
          let y = 120;
          while (y > 2 && e.bloco!(cx + dx, y, cz + dz) === 0) y--;
          alto = Math.max(alto, y);
        }
      const Y = alto + 8;
      const lote: { x: number; y: number; z: number; v: number }[] = [];
      const parede = (dx: number, dz: number) =>
        ((dx === -6 || dx === 6) && dz >= -5 && dz <= 4) || ((dz === -5 || dz === 4) && dx >= -6 && dx <= 6);
      const janela = (dx: number, dz: number, dy: number) =>
        dy === 2 && ((dz === 4 && (dx === -2 || dx === 1)) || ((dx === -6 || dx === 6) && dz === 0));
      for (let dx = -10; dx <= 10; dx++)
        for (let dz = -10; dz <= 10; dz++) {
          const x = cx + dx;
          const z = cz + dz;
          const dentro = dx >= -6 && dx <= 6 && dz >= -5 && dz <= 4;
          lote.push({ x, y: Y, z, v: dentro ? TABUAS : PEDRA_LISA });
          for (let dy = 1; dy <= 7; dy++) {
            let v = 0;
            if (dy <= 4 && parede(dx, dz)) v = janela(dx, dz, dy) ? VIDRO : TABUAS_BETULA;
            else if (dy === 5 && dentro) v = TABUAS;
            lote.push({ x, y: Y + dy, z, v });
          }
        }
      e.editarLote!(lote);
      return { cx, cz, Y };
    },
    { PEDRA_LISA: Bloco.PEDRA_LISA, TABUAS: Bloco.TABUAS, TABUAS_BETULA: Bloco.TABUAS_BETULA, VIDRO: Bloco.VIDRO },
  );
  // o telhado no canto oposto já entrou
  await expect
    .poll(() => page.evaluate((c) => window.__brumaluz!.bloco!(c.cx + 6, c.Y + 5, c.cz + 4), casa), { timeout: 30_000 })
    .toBe(Bloco.TABUAS);
  // a criança dentro, perto da parede da frente, olhando para o fundo (+z)
  await page.evaluate(
    (c) => {
      const e = window.__brumaluz!;
      e.teleportar!(c.cx + 0.5, c.cz - 2.5, c.Y + 1);
      e.apontar!(0, 0.1);
    },
    casa,
  );
  await page.waitForTimeout(1500);
  return casa;
}

/** Os oito móveis na casa (só no ramo); devolve o que entrou. */
async function mobiliar(page: Page, casa: { cx: number; cz: number; Y: number }) {
  const lote = Object.entries(DISPOSICAO).map(([nome, [dx, dz]]) => ({
    nome,
    x: casa.cx + dx,
    y: casa.Y + 1,
    z: casa.cz + dz,
    // a âncora com a direção 0 (a parte 0): o núcleo monta as outras partes
    v: B[nome]!,
  }));
  await page.evaluate((l) => window.__brumaluz!.editarLote!(l.map(({ x, y, z, v }) => ({ x, y, z, v }))), lote);
  for (const m of lote)
    await expect
      .poll(() => page.evaluate((m) => window.__brumaluz!.bloco!(m.x, m.y, m.z), m), {
        timeout: 15_000,
        message: `o ${m.nome} entrou`,
      })
      .toBe(m.v);
  // o tapete pelo colocar, com o item na mão, mirando o chão de dentro
  const [tx, tz] = TAPETE_EM;
  await page.evaluate((b) => {
    const e = window.__brumaluz!;
    e.inventario!.definir(0, { item: `bloco:${b}`, qtd: 4 });
    e.selecionarSlot!(0);
    e.apontar!(0, 0.1);
  }, B.TAPETE!);
  await page.waitForTimeout(500);
  await expect
    .poll(
      () =>
        page.evaluate(
          (c) => window.__brumaluz!.mirarBloco!(c.x, c.y, c.z, { x: 0, y: 1, z: 0 }),
          { x: casa.cx + tx, y: casa.Y, z: casa.cz + tz },
        ),
      { timeout: 15_000 },
    )
    .toBe(true);
  const tapete = await page.evaluate(() => window.__brumaluz!.interagir!('colocar'));
  expect(tapete, 'o tapete entrou').toBe(true);
  await page.evaluate(() => window.__brumaluz!.apontar!(0, 0.1));
  await page.waitForTimeout(2000);
  return [...lote.map((m) => m.nome), 'TAPETE'];
}

/** Leva a criança para um ponto no alto (num bloco de apoio) olhando para (ax, az). */
async function verDeLonge(page: Page, x: number, z: number, y: number, ax: number, az: number) {
  await page.evaluate(
    ({ x, z, y, P }) => {
      const e = window.__brumaluz!;
      e.editarLote!([{ x: Math.floor(x), y: y - 1, z: Math.floor(z), v: P }]);
      e.teleportar!(x, z, y);
    },
    { x, z, y, P: Bloco.PEDRA_LISA },
  );
  const yaw = Math.atan2(ax - x, az - z);
  await page.evaluate((yaw) => window.__brumaluz!.apontar!(yaw, 0.35), yaw);
  await assentar(page);
  return yaw;
}

/** As camas na caixa (as das plantas e das casas, para provar que estão na vista). */
const contarCamas = (page: Page, x0: number, z0: number, x1: number, z1: number, y0: number, y1: number) =>
  page.evaluate(
    ({ x0, z0, x1, z1, y0, y1, CAMA }) => {
      const e = window.__brumaluz!;
      let n = 0;
      for (let x = x0; x <= x1; x++)
        for (let z = z0; z <= z1; z++) for (let y = y0; y <= y1; y++) if (e.bloco!(x, y, z) === CAMA) n++;
      return n;
    },
    { x0, z0, x1, z1, y0, y1, CAMA: Bloco.CAMA },
  );

async function cenario(page: Page, c: Cenario): Promise<{ yaw: number; pitch: number; amplitude: number; nota: unknown }> {
  if (c === 'casa-vazia' || c === 'casa-mobiliada') {
    await abrir(page, '/?tema=vila-neon');
    const casa = await montarCasa(page);
    const moveis = c === 'casa-mobiliada' && TEM_MOVEIS ? await mobiliar(page, casa) : [];
    return { yaw: 0, pitch: 0.1, amplitude: 0.35, nota: { moveis } };
  }
  if (c === 'casa-parte2' || c === 'casa-parte2-ligada') {
    await abrir(page, '/?tema=vila-neon');
    const casa = await montarCasa(page);
    const moveis = await mobiliar(page, casa);
    const lote = Object.entries(DISPOSICAO_PARTE2).map(([nome, [dx, dz]]) => ({ nome, x: casa.cx + dx, y: casa.Y + 1, z: casa.cz + dz, v: B[nome]! }));
    await page.evaluate((l) => window.__brumaluz!.editarLote!(l.map(({ x, y, z, v }) => ({ x, y, z, v }))), lote);
    for (const m of lote)
      await expect
        .poll(() => page.evaluate((m) => window.__brumaluz!.bloco!(m.x, m.y, m.z), m), { timeout: 15_000, message: `o ${m.nome} entrou` })
        .toBe(m.v);
    if (c === 'casa-parte2-ligada')
      await page.evaluate((l) => {
        const at = (n: string) => l.find((m) => m.nome === n)!;
        const p = (n: string) => ({ x: at(n).x, y: at(n).y, z: at(n).z });
        (window.__brumaluz!.moveis! as unknown as { forcarLigados(l: unknown[]): void }).forcarLigados([
          { tipo: 'tv', ...p('TV'), programa: 1, desde: 0 },
          { tipo: 'som', ...p('SOM'), programa: 0, desde: 0 },
          { tipo: 'fogao', ...p('FOGAO'), receita: 'carne_assada', progresso: 0.5 },
          { tipo: 'geladeira', ...p('GELADEIRA') },
        ]);
      }, lote);
    await page.waitForTimeout(2000);
    return { yaw: 0, pitch: 0.1, amplitude: 0.35, nota: { moveis: [...moveis, ...lote.map((m) => m.nome)], ligados: c === 'casa-parte2-ligada' } };
  }
  if (c === 'cidade') {
    await abrir(page, '/?tema=cidade-grande');
    const p = await page.evaluate(() => {
      const c = window.__brumaluz!.cidade!()!;
      const predios = c.lotes.filter((l) => l.modelo);
      const xs = predios.map((l) => l.x0 + l.largura / 2);
      const zs = predios.map((l) => l.z0 + l.profundidade / 2);
      const m = (v: number[]) => v.reduce((a, b) => a + b, 0) / v.length;
      return {
        h: c.h,
        ax: m(xs),
        az: m(zs),
        predios: predios.length,
        caixa: [Math.min(...xs) - 9, Math.min(...zs) - 9, Math.max(...xs) + 9, Math.max(...zs) + 9],
      };
    });
    const yaw = await verDeLonge(page, p.ax - 32.5, p.az - 32.5, p.h + 20, p.ax, p.az);
    const [x0, z0, x1, z1] = p.caixa.map(Math.round);
    const camas = await contarCamas(page, x0, z0, x1, z1, p.h, p.h + 40);
    return { yaw, pitch: 0.35, amplitude: 0.2, nota: { predios: p.predios, camas } };
  }
  await abrir(page, '/?tema=doce-reino');
  const p = await page.evaluate(() => window.__brumaluz!.povoados!()[0]);
  if (!p) throw new Error('sem povoado perto do nascimento');
  const yaw = await verDeLonge(page, p.cx - 24.5, p.cz - 24.5, p.h + 14, p.cx, p.cz);
  const camas = await contarCamas(
    page,
    Math.round(p.cx - 24),
    Math.round(p.cz - 24),
    Math.round(p.cx + 24),
    Math.round(p.cz + 24),
    p.h - 2,
    p.h + 12,
  );
  return { yaw, pitch: 0.35, amplitude: 0.2, nota: { povoado: p.id, moradores: p.moradores, camas } };
}

// rodadas alternadas, cada medida numa página nova
for (let r = 0; r < RODADAS; r++)
  for (const c of CENARIOS)
    test(`${c}, rodada ${r + 1} (celular em pé, CPU ${LENTO}x)`, async ({ page }) => {
      test.setTimeout(600_000);
      // na main (antes da 039b) os cinco da parte 2 não existem: o cenário fica de fora
      test.skip(c.startsWith('casa-parte2') && B.FOGAO === undefined, 'sem os móveis da parte 2');
      const { yaw, pitch, amplitude, nota } = await cenario(page, c);
      await desacelerar(page);
      await page.waitForTimeout(1000);
      const m = await medir(page, yaw, pitch, amplitude);
      (medidas[c] ??= []).push(m);
      notas[c] ??= nota;
      console.log(`DESEMPENHO-039 ${c} ${r + 1} ${JSON.stringify({ ...m, nota })}`);
    });

test('o resumo', () => {
  const mediana = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
  const resumo: Record<string, unknown> = {};
  for (const [c, ms] of Object.entries(medidas))
    resumo[c] = {
      fps: mediana(ms.map((m) => m.fps)),
      p95ms: mediana(ms.map((m) => m.p95ms)),
      desenhos: mediana(ms.map((m) => m.desenhos)),
      desenhosParado: mediana(ms.map((m) => m.desenhosParado)),
      maxMs: Math.max(...ms.map((m) => m.maxMs)),
    };
  console.log(`DESEMPENHO-039 resumo ${JSON.stringify({ moveis: TEM_MOVEIS, resumo, notas })}`);
});
