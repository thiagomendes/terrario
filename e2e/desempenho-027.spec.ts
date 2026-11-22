import { expect, test, type Browser, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { criarMundo, TAMANHOS, type Tamanho } from './guia-palco';
import * as vila from './vila-noite-palco';

/**
 * Spec 027 (T22): o desempenho da parte 1 da Noite das Fantasias, na placa de vídeo
 * (scripts/e2e-gpu.sh), só com MEDIR_027=1. Grava em `capturas-027/parte1/desempenho/` (ou
 * `MEDIR_PASTA`). `MEDIR_SO=carregar,pior,vila,lugares` escolhe os grupos; `MEDIR_TELAS=empe,deitado,pc`
 * as telas. A régua da spec ("Experiência medida"): 60 quadros no computador; no celular com a CPU
 * 4× mais lenta, 45 no pior caso e 60 nos lugares; no pior caso, até 250 chamadas de desenho e 450
 * mil triângulos; carregar até 10% acima da Vila Neon, medida na mesma rodada.
 *
 * - **Carregar:** a Vila Neon e a festa alternadas, três vezes cada, no celular em pé com a CPU 4×
 *   mais lenta, do pedido do mundo até a cortina sair (a régua da T00).
 * - **O pior caso:** a praça de noite com tudo: os moradores, os bichos (os fantasminhas, os
 *   morceguinhos, as abóboras saltitantes e o sapinho), a criança com a sacola de doces, os
 *   lampiões de abóbora postos na praça e as duas amigas fantasiadas com a sacola na mão. Três
 *   rumos da praça; vale o pior.
 * - **A Vila Neon na mesma rodada:** o pior caso dela (o da T00), com a mesma medida.
 * - **Os lugares:** rua, Vovó, loja, bosque, castelinho, horta e gramado, no entardecer e de noite.
 *
 * A medida: os quadros contados pelo `requestAnimationFrame` em 5 s (e o pior quadro e o 95º), as
 * chamadas de desenho de cada quadro (a mediana), os triângulos do último quadro, a escala e os
 * efeitos que a política do celular tirou. A perda do contexto WebGL e as páginas que param mais
 * de 10 s são anotadas (vão para a T23).
 */
declare const process: { env: Record<string, string | undefined> };
test.skip(!process.env.MEDIR_027, 'só com MEDIR_027=1');
test.setTimeout(3_600_000);
test.use({ actionTimeout: 30_000 });

type V3 = [number, number, number];
const PASTA = process.env.MEDIR_PASTA ?? 'capturas-027/parte1/desempenho';
const SO = (process.env.MEDIR_SO ?? '').split(',').filter(Boolean);
const TELAS = ((process.env.MEDIR_TELAS ?? 'empe,deitado,pc').split(',') as Tamanho[]).filter(Boolean);
const quer = (g: string) => !SO.length || SO.includes(g);
const LENTO = 4;
const ENTARDECER = 0.7;
const NOITE = 0.86;
const TEMA = 'noite-das-fantasias';

function gravar(nome: string, dados: unknown) {
  mkdirSync(PASTA, { recursive: true });
  writeFileSync(`${PASTA}/${nome}.json`, `${JSON.stringify(dados, null, 2)}\n`);
}

/** Os avisos da página que interessam à T23 (o contexto WebGL perdido, a página parada). */
const avisos: string[] = [];
function vigiar(page: Page, rotulo: string) {
  page.on('pageerror', (e) => {
    avisos.push(`${rotulo} erro: ${String(e).slice(0, 200)}`);
    console.log(`erro na página (${rotulo}): ${String(e)}`);
  });
  page.on('console', (m) => {
    const t = m.text();
    if (/context lost|contextlost|Unable to create|CONTEXT_LOST/i.test(t)) {
      avisos.push(`${rotulo} console: ${t.slice(0, 200)}`);
      console.log(`WEBGL (${rotulo}): ${t}`);
    }
  });
}
async function ouvirContexto(page: Page) {
  await page.evaluate(() => {
    const c = document.getElementById('cena');
    const w = window as unknown as { __perdas: number };
    w.__perdas = 0;
    c?.addEventListener('webglcontextlost', () => {
      w.__perdas++;
      console.log('WEBGL contextlost no canvas');
    });
  });
}
const perdas = (page: Page) => page.evaluate(() => (window as unknown as { __perdas?: number }).__perdas ?? 0);

async function lentidao(page: Page, rate: number) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate });
  await cdp.detach();
}

async function assentar(page: Page, minimo = 12) {
  let antes = -1;
  for (let i = 0; i < 60; i++) {
    await page.waitForTimeout(1500);
    const n = await page.evaluate(() => window.__brumaluz!.chunksCarregados ?? 0);
    if (n === antes && n >= minimo) break;
    antes = n;
  }
  await page.waitForTimeout(2000);
}

/** A medida de 5 s, parada (ver o comentário do começo). */
async function medir(page: Page, rotulo: string) {
  const t0 = Date.now();
  const m = await page.evaluate(async () => {
    const e = window.__brumaluz!;
    const scene = e.cenaBabylon!() as unknown as {
      getActiveIndices(): number;
      getEngine(): { getFps(): number; _gl: Record<string, unknown> };
      getActiveMeshes(): { length: number };
    };
    const eng = scene.getEngine();
    const gl = eng._gl as Record<string, (...a: unknown[]) => unknown>;
    const nomes = ['drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced'];
    const orig = nomes.map((n) => gl[n]);
    let conta = 0;
    nomes.forEach((n, i) => {
      gl[n] = function (this: unknown, ...a: unknown[]) {
        conta++;
        return orig[i].apply(this, a);
      };
    });
    const quadro = () => new Promise<number>((r) => requestAnimationFrame(r));
    await quadro();
    await quadro();
    conta = 0;
    const tempos: number[] = [];
    const desenhos: number[] = [];
    const tris: number[] = [];
    const inicio = performance.now();
    let ultimo = inicio;
    while (performance.now() - inicio < 5000) {
      const t = await quadro();
      tempos.push(t - ultimo);
      ultimo = t;
      desenhos.push(conta);
      tris.push(scene.getActiveIndices() / 3);
      conta = 0;
    }
    const total = performance.now() - inicio;
    nomes.forEach((n, i) => (gl[n] = orig[i]));
    // (o primeiro intervalo começa antes do primeiro quadro contado)
    tempos.shift();
    const ord = [...tempos].sort((a, b) => a - b);
    const d = [...desenhos].sort((a, b) => a - b);
    const crs = e.criaturas?.() ?? [];
    return {
      fps: Math.round((tempos.length / (total / 1000)) * 10) / 10,
      p95ms: Math.round(ord[Math.floor(ord.length * 0.95)] * 10) / 10,
      piorMs: Math.round(ord[ord.length - 1] * 10) / 10,
      desenhos: d[d.length >> 1],
      desenhosMax: d[d.length - 1],
      triangulos: Math.round(Math.max(...tris)),
      fpsBabylon: Math.round(eng.getFps()),
      escala: e.escalaResolucao,
      alivio: e.alivioEfeitos ?? 0,
      chunks: e.chunksCarregados,
      malhasAtivas: scene.getActiveMeshes().length,
      moradores: crs.filter((c) => c.morador || c.profissao).length,
      bichos: crs.filter((c) => !c.morador && !c.profissao).length,
      amigos: (e.outrosJogadores?.() ?? []).length,
    };
  });
  const segundos = (Date.now() - t0) / 1000;
  // (a página parada: 5 s de medida que levam mais de 15 s de relógio)
  if (segundos > 15) avisos.push(`${rotulo}: a medida de 5 s levou ${segundos.toFixed(0)} s de relógio`);
  console.log(`MEDIDA ${rotulo} ${JSON.stringify(m)}`);
  return m;
}
type Medida = Awaited<ReturnType<typeof medir>>;

/**
 * De onde vêm os triângulos do quadro: as malhas ativas agrupadas pelo nome (sem os números), com
 * os triângulos somados (as instâncias finas contam uma vez cada) e quantas são; as 25 maiores.
 */
async function detalhe(page: Page, rotulo: string) {
  const d = await page.evaluate(() => {
    const scene = window.__brumaluz!.cenaBabylon!() as unknown as {
      getActiveMeshes(): { length: number; data: { name: string; getTotalIndices(): number; thinInstanceCount?: number; material?: { name: string } | null }[] };
    };
    const a = scene.getActiveMeshes();
    const grupos = new Map<string, { tri: number; n: number; mat: string }>();
    for (let i = 0; i < a.length; i++) {
      const m = a.data[i];
      const chave = m.name.replace(/[-_]?\d+(\.\d+)?/g, '#');
      const g = grupos.get(chave) ?? { tri: 0, n: 0, mat: m.material?.name ?? '' };
      g.tri += (m.getTotalIndices() / 3) * Math.max(1, m.thinInstanceCount ?? 0);
      g.n++;
      grupos.set(chave, g);
    }
    // e cada morador e cada bicho (o tipo ou o posto)
    const quem = new Map((window.__brumaluz!.criaturas?.() ?? []).map((c) => [c.id, c.morador ?? c.profissao ?? c.tipo]));
    const porSer = new Map<string, number>();
    for (let i = 0; i < a.length; i++) {
      const m = a.data[i];
      const r = /^(morador|criatura)-(\d+)/.exec(m.name);
      if (!r) continue;
      const k = `${r[1]} ${quem.get(Number(r[2])) ?? '?'} #${r[2]}`;
      porSer.set(k, (porSer.get(k) ?? 0) + (m.getTotalIndices() / 3) * Math.max(1, m.thinInstanceCount ?? 0));
    }
    return {
      grupos: [...grupos]
        .sort((x, y) => y[1].tri - x[1].tri)
        .slice(0, 25)
        .map(([nome, g]) => ({ nome, triangulos: Math.round(g.tri), malhas: g.n, material: g.mat })),
      seres: [...porSer].sort((x, y) => y[1] - x[1]).map(([k, t]) => `${k}: ${Math.round(t)}`),
    };
  });
  console.log(`DETALHE ${rotulo} ${JSON.stringify(d)}`);
  return d;
}

async function abrirFesta(browser: Browser, tamanho: Tamanho, id: string): Promise<Page> {
  const ctx = await browser.newContext(TAMANHOS[tamanho]);
  const page = await ctx.newPage();
  vigiar(page, `${id}`);
  await page.addInitScript(() => {
    try {
      localStorage.setItem('terrario:config', JSON.stringify({ distancia: 3, mostrarFps: false, mostrarAtalhos: false }));
    } catch {
      // sem armazenamento
    }
  });
  await criarMundo(page, id, TEMA, {}, 1337);
  await page.goto(`/?mundo=${id}`);
  await page.waitForFunction(() => window.__brumaluz?.ready === true, undefined, { timeout: 600_000 });
  await ouvirContexto(page);
  await page.evaluate(() => {
    document.querySelector<HTMLElement>('.entrada')?.setAttribute('hidden', '');
    const e = window.__brumaluz!;
    e.pausarDia = true;
    e.hora = 0.7;
    e.definirClima?.('limpo');
  });
  await page.addStyleTag({ content: '.toast-area, .dica-mira { display: none !important; }' });
  await assentar(page);
  return page;
}

async function foto(page: Page, nome: string) {
  mkdirSync(PASTA, { recursive: true });
  await page.screenshot({ path: `${PASTA}/${nome}.jpg`, type: 'jpeg', quality: 84 });
}

/** A criança em (x, z) no chão da festa, olhando para (ax, az). */
const ir = (page: Page, x: number, z: number, ax: number, az: number, pitch = 0.12) =>
  page.evaluate(
    ({ x, z, ax, az, pitch }) => {
      const e = window.__brumaluz!;
      e.voar?.(false);
      e.teleportar!(x, z, e.baile!()!.h + 1.2);
      e.apontar!(Math.atan2(ax - x, az - z), pitch);
    },
    { x, z, ax, az, pitch },
  );

// ---------------------------------------------------------------------------------- carregar
test('carregar: a Vila Neon e a festa na mesma rodada, no celular com a CPU 4× mais lenta', async ({ browser }) => {
  test.skip(!quer('carregar'), 'só com carregar');
  const tempos: Record<string, { total: number; pagina: number; chunks: number }[]> = { 'vila-neon': [], [TEMA]: [] };
  for (let rodada = 0; rodada < 3; rodada++)
    for (const tema of ['vila-neon', TEMA]) {
      const ctx = await browser.newContext(TAMANHOS.empe);
      const page = await ctx.newPage();
      vigiar(page, `carregar-${tema}-${rodada}`);
      const id = `t22-carregar-${tema}-${rodada}`;
      await criarMundo(page, id, tema, {}, 1337);
      const cdp = await ctx.newCDPSession(page);
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: LENTO });
      const t0 = Date.now();
      await page.goto(`/?mundo=${id}`);
      await page.waitForFunction(() => window.__brumaluz?.ready === true, undefined, { timeout: 600_000, polling: 50 });
      const total = Date.now() - t0;
      const r = await page.evaluate(() => ({
        pagina: Math.round(performance.now()),
        chunks: window.__brumaluz!.chunksCarregados ?? 0,
      }));
      tempos[tema].push({ total, ...r });
      console.log(`CARREGAR ${tema} rodada ${rodada}: ${total} ms (página ${r.pagina} ms, ${r.chunks} chunks)`);
      await ctx.close();
    }
  const mediana = (l: { total: number }[]) => l.map((t) => t.total).sort((a, b) => a - b)[1];
  const mv = mediana(tempos['vila-neon']);
  const mf = mediana(tempos[TEMA]);
  const razao = Math.round((mf / mv) * 1000) / 1000;
  gravar('carregar', {
    tela: '390x844 (celular em pé)',
    cpu: `${LENTO}x mais lenta`,
    criterio: 'do goto do mundo até a cortina sair (window.__brumaluz.ready); Vila e festa alternadas',
    rodadas: tempos,
    medianaVilaMs: mv,
    medianaFestaMs: mf,
    razao,
    meta: 'festa até 1,10 da Vila',
    quando: new Date().toISOString(),
  });
  console.log(`CARREGAR medianas: Vila ${mv} ms, festa ${mf} ms, razão ${razao}`);
  expect(tempos[TEMA].every((t) => t.chunks > 0)).toBe(true);
});

// ---------------------------------------------------------------------------------- o pior caso
for (const tamanho of TELAS)
  test(`o pior caso: a praça de noite com tudo (${tamanho})`, async ({ browser }) => {
    test.skip(!quer('pior'), 'só com pior');
    const page = await abrirFesta(browser, tamanho, `t22-pior-${tamanho}`);
    const p = await page.evaluate(() => {
      const b = window.__brumaluz!.baile!()!;
      return { h: b.h, nascimento: b.nascimento, abobora: b.pontos.abobora, barracas: b.pontos.barracas, portas: b.pontos.portas, palco: b.pontos.palco };
    });
    const Y = p.h + 1;
    await page.evaluate((v) => (window.__brumaluz!.hora = v), NOITE);
    // a sacola de doces: três campainhas (a criança fica com três docinhos na sacola)
    for (const i of [0, 1, 2]) {
      const q = p.portas[i];
      await ir(page, q.x, q.z, q.x, q.z - 1);
      await page.waitForTimeout(1500);
      await page.evaluate((i) => window.__brumaluz!.baileMissao!({ a: 'campainha', i } as never), i);
      await page.waitForTimeout(2600);
    }
    await page.waitForFunction(
      () => {
        const e = window.__brumaluz!;
        const inv = e.inventario!;
        for (let s = 0; s < 9; s++)
          if (inv.obter(s)?.item === 'sacola_doces') {
            e.selecionarSlot!(s);
            return true;
          }
        return false;
      },
      undefined,
      { timeout: 15_000 },
    );
    // a criança no sul da praça (onde nasce), e o que a praça tem de mais pesado em volta dela
    const [nx, nz] = [p.nascimento.x, p.nascimento.z];
    await ir(page, nx, nz, p.abobora.x, p.abobora.z);
    await assentar(page);
    await page.evaluate(
      ({ nx, nz, Y, ax, az }) => {
        const e = window.__brumaluz!;
        // os lampiões de abóbora que a criança põe (doze, em roda na praça)
        for (let k = 0; k < 12; k++) {
          const a = (k / 12) * Math.PI * 2;
          const x = Math.floor(ax + Math.sin(a) * 10);
          const z = Math.floor(az + Math.cos(a) * 10);
          if (!e.bloco!(x, Y, z)) e.definirBloco!(x, Y, z, 66);
        }
        // os bichos da noite em volta (os fantasminhas de longe, como nascem: 18 a 30 blocos)
        const em = (tipo: string, ang: number, r: number) =>
          e.invocar!(tipo as never, nx + Math.sin(ang) * r, Y + (tipo === 'espectro' ? 1 : 0), nz - Math.cos(ang) * r);
        [-0.5, -0.2, 0.25, 0.55].forEach((a, i) => em('espectro', a, 18 + i * 4));
        [-0.35, 0.1, 0.4].forEach((a, i) => em('coelho', a, 8 + i * 3));
        [-0.15, 0.3].forEach((a, i) => em('cervo', a, 6 + i * 3));
        em('raposa', 0.05, 7);
        // as duas amigas fantasiadas, com a sacola na mão (dois e três docinhos)
        e.amigosDeTeste!([
          { id: 'amiga-ana', aparencia: { corpo: 'feminino', cabeloEstilo: 5, pele: 1, fantasia: { id: 'bruxinha-festa', cor: 0 } }, x: nx - 1.6, y: Y, z: nz - 2.4, yaw: Math.PI, mao: 'sacola_doces', maoQtd: 2 },
          { id: 'amiga-bia', aparencia: { corpo: 'feminino', cabeloEstilo: 2, pele: 3, fantasia: { id: 'fantasminha-festa', cor: 0 } }, x: nx + 1.8, y: Y, z: nz - 2.0, yaw: Math.PI, mao: 'sacola_doces', maoQtd: 3 },
        ]);
      },
      { nx, nz, Y, ax: p.abobora.x, az: p.abobora.z },
    );
    await page.waitForTimeout(6000);
    // três rumos: a abóbora com o palco atrás (norte), as barracas (oeste), a loja e a rua (nordeste)
    const b0 = p.barracas[0];
    const rumos: [string, number, number][] = [
      ['norte', p.abobora.x, p.abobora.z],
      ['oeste', b0.x, b0.z],
      ['nordeste', nx + 20, nz - 22],
    ];
    const lento = tamanho !== 'pc';
    const medidas: Record<string, { normal: Medida; cpu4?: Medida; detalhe: unknown }> = {};
    for (const [rumo, ax, az] of rumos) {
      await ir(page, nx, nz, ax, az);
      await page.waitForTimeout(3000);
      const normal = await medir(page, `pior-${rumo}-${tamanho}`);
      const det = await detalhe(page, `pior-${rumo}-${tamanho}`);
      let cpu4: Medida | undefined;
      if (lento) {
        await lentidao(page, LENTO);
        await page.waitForTimeout(5000);
        cpu4 = await medir(page, `pior-${rumo}-${tamanho}-cpu4`);
        await lentidao(page, 1);
        await page.waitForTimeout(2000);
      }
      medidas[rumo] = { normal, ...(cpu4 ? { cpu4 } : {}), detalhe: det };
      await foto(page, `pior-${rumo}-${tamanho}`);
    }
    const pior = Object.entries(medidas).sort((a, b) => (a[1].cpu4 ?? a[1].normal).fps - (b[1].cpu4 ?? b[1].normal).fps)[0];
    gravar(`pior-caso-${tamanho}`, {
      lugar: 'a praça de noite, do sul (onde a criança nasce), com tudo',
      tela: `${tamanho}, distância 3`,
      tudo: 'moradores de posto e vizinhos; 4 fantasminhas, 3 morceguinhos, 2 abóboras saltitantes e 1 sapinho; a criança com a sacola de 3 docinhos; 12 lampiões de abóbora postos em roda; as duas amigas fantasiadas com a sacola',
      medidas,
      piorRumo: pior[0],
      perdasDoContexto: await perdas(page),
      avisos: avisos.filter((a) => a.includes(`t22-pior-${tamanho}`) || a.includes(`-${tamanho}`)),
      quando: new Date().toISOString(),
    });
    expect(pior[1].normal.desenhos).toBeGreaterThan(0);
    await page.context().close();
  });

// ---------------------------------------------------------------------------------- a Vila na mesma rodada
for (const tamanho of TELAS)
  test(`a Vila Neon na mesma rodada: o pior caso dela (${tamanho})`, async ({ browser }) => {
    test.skip(!quer('vila'), 'só com vila');
    const page = await vila.abrir(browser, `t22-vila-${tamanho}`, tamanho, 3);
    vigiar(page, `vila-${tamanho}`);
    const p = await vila.plano(page);
    const H = p.h + 1;
    await vila.hora(page, 0.96);
    await page.waitForTimeout(3000);
    // (o mesmo caminho da T00: a turma chega à grade e, no meio da primeira música, a banda inteira)
    await vila.acender(page);
    await vila.ir(page, p.ox + 60.5, p.oz + 98.4, H + 0.2);
    await page.evaluate(() => window.__brumaluz!.apontar!(0, 0.1));
    await vila.ate(page, 30);
    await page.evaluate(() => window.__brumaluz!.pularShow!(58));
    await vila.ate(page, 59);
    await vila.ir(page, p.ox + 60.5, p.oz + 84, H + 0.2);
    await page.evaluate(() => window.__brumaluz!.apontar!(0, 0.02));
    await page.waitForTimeout(3000);
    const normal = await medir(page, `vila-pior-${tamanho}`);
    const det = await detalhe(page, `vila-pior-${tamanho}`);
    let cpu4: Medida | undefined;
    if (tamanho !== 'pc') {
      await lentidao(page, LENTO);
      await page.waitForTimeout(5000);
      cpu4 = await medir(page, `vila-pior-${tamanho}-cpu4`);
      await lentidao(page, 1);
    }
    await foto(page, `vila-pior-${tamanho}`);
    gravar(`vila-pior-caso-${tamanho}`, {
      lugar: 'Vila Neon: meio do campo do festival, de noite, olhando o palco por cima do público (o pior caso da T00)',
      tela: `${tamanho}, distância 3`,
      normal,
      ...(cpu4 ? { cpu4 } : {}),
      detalhe: det,
      quando: new Date().toISOString(),
    });
    expect(normal.desenhos).toBeGreaterThan(0);
    await page.context().close();
  });

// ---------------------------------------------------------------------------------- os lugares
for (const tamanho of TELAS)
  test(`os lugares no entardecer e de noite (${tamanho})`, async ({ browser }) => {
    test.skip(!quer('lugares'), 'só com lugares');
    const page = await abrirFesta(browser, tamanho, `t22-lugares-${tamanho}`);
    const p = await page.evaluate(() => {
      const b = window.__brumaluz!.baile!()!;
      const q = b.pontos;
      return { h: b.h, oz: b.oz, portas: q.portas, trilha: q.trilha, loja: q.loja, castelo: q.castelo, portaoHorta: q.portaoHorta, estacao: q.estacao };
    });
    const vovo = p.portas.find((q) => q.vovo)!;
    const tr = p.trilha;
    // (os pés e o olhar de cada lugar: os das fotos da T07, com a câmera do jogo atrás da criança)
    const lugares: [string, [number, number], [number, number]][] = [
      ['rua', [vovo.x + 2, p.oz + 42], [vovo.x, vovo.z + 6]],
      ['vovo', [vovo.x + 2, vovo.z + 9], [vovo.x, vovo.z - 2]],
      ['loja', [p.loja[0] - 10, p.loja[2] - 3], [p.loja[0] + 3, p.loja[2] + 1]],
      ['bosque', [tr[1][0] + 1.5, tr[1][1] - 0.5], [tr[3][0], tr[3][1]]],
      ['castelo', [tr[4][0] + 1, tr[4][1] - 1], [p.castelo[0] + 2, p.castelo[2] + 4]],
      ['horta', [p.portaoHorta[0] - 4, p.portaoHorta[2] - 6], [p.portaoHorta[0] + 8, p.portaoHorta[2] + 12]],
      ['gramado', [p.estacao[0] + 2, p.estacao[2] - 6], [p.estacao[0], p.estacao[2] + 16]],
    ];
    const lento = tamanho !== 'pc';
    const medidas: Record<string, Medida> = {};
    for (const [qual, h] of [
      ['entardecer', ENTARDECER],
      ['noite', NOITE],
    ] as const) {
      await page.evaluate((v) => (window.__brumaluz!.hora = v), h);
      for (const [nome, pes, alvo] of lugares) {
        await ir(page, pes[0], pes[1], alvo[0], alvo[1]);
        await assentar(page);
        if (lento) {
          await lentidao(page, LENTO);
          await page.waitForTimeout(5000);
        }
        medidas[`${nome}-${qual}`] = await medir(page, `${nome}-${qual}-${tamanho}${lento ? '-cpu4' : ''}`);
        if (lento) await lentidao(page, 1);
        if (qual === 'noite') await foto(page, `lugar-${nome}-${qual}-${tamanho}`);
      }
    }
    gravar(`lugares-${tamanho}`, {
      tela: `${tamanho}, distância 3`,
      cpu: lento ? `${LENTO}x mais lenta` : 'sem desacelerar',
      medidas,
      perdasDoContexto: await perdas(page),
      avisos: avisos.filter((a) => a.includes(`-${tamanho}`)),
      quando: new Date().toISOString(),
    });
    expect(Object.keys(medidas)).toHaveLength(14);
    await page.context().close();
  });
