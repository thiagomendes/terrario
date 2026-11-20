import { test, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

/**
 * Esboço da spec 021 "Achar o amigo" (`src/esboco/amigos.ts`, só com `?esboco=amigos`).
 * Só roda com ESBOCO_AMIGOS=1, na placa de vídeo (scripts/e2e-gpu.sh). Fotos no computador
 * (1280x720) e no celular (390x844, toque) de cada ideia, de dia, no Rancho com morro e mata;
 * vídeos curtos com ESBOCO_VIDEO=1. Pasta: ESBOCO_PASTA (padrão test-results/esboco021).
 */
declare const process: { env: Record<string, string | undefined> };
const PASTA = process.env.ESBOCO_PASTA ?? 'test-results/esboco021';
type V3 = [number, number, number];

test.skip(!process.env.ESBOCO_AMIGOS, 'esboço: só com ESBOCO_AMIGOS=1');
const SONDA = !!process.env.ESBOCO_SONDA;
const VIDEO = !!process.env.ESBOCO_VIDEO;
test.describe.configure({ mode: 'serial' });

/** Os 7 amigos (sala de 8): cada um com a fantasia e o cabelo dele. */
const AMIGOS: Record<string, Record<string, unknown>> = {
  lia: { corpo: 'feminino', cabeloEstilo: 5, cabeloCor: 1, pele: 1, rosto: 1, fantasia: { id: 'fazendeira', cor: 0 } },
  // spec 034: o Dino saiu com a Era dos Dinos
  theo: { corpo: 'masculino', cabeloEstilo: 0, cabeloCor: 0, pele: 2, fantasia: { id: 'roqueira-palco', cor: 0 } },
  bia: { corpo: 'feminino', cabeloEstilo: 2, cabeloCor: 3, pele: 0, fantasia: { id: 'realeza-flores', cor: 0 } },
  gui: { corpo: 'masculino', cabeloEstilo: 1, cabeloCor: 2, pele: 3, fantasia: { id: 'astronauta', cor: 0 } },
  nina: { corpo: 'feminino', cabeloEstilo: 7, cabeloCor: 4, pele: 2, fantasia: { id: 'heroi-coracao', cor: 1 } },
  davi: { corpo: 'masculino', cabeloEstilo: 4, cabeloCor: 1, pele: 1, fantasia: { id: 'vaqueira', cor: 0 } },
  malu: { corpo: 'feminino', cabeloEstilo: 3, cabeloCor: 0, pele: 4, fantasia: { id: 'confeiteira', cor: 0 } },
};

async function abrir(page: Page, celular: boolean) {
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
  page.on('pageerror', (err) => console.log('erro na página:', String(err)));
  page.on('console', (m) => {
    if (m.text().startsWith('esboco')) console.log(m.text().slice(0, 1500));
  });
  await page.goto('/?tema=rancho-alegre&esboco=amigos');
  await page.waitForFunction(() => window.__brumaluz?.ready === true && !!window.__amigos, undefined, {
    timeout: 180_000,
  });
  await page.evaluate(() => {
    document.querySelector('.entrada')?.setAttribute('hidden', '');
    const e = window.__brumaluz!;
    e.pausarDia = true;
    e.hora = 0.42;
    e.definirClima?.('limpo');
  });
  void celular;
}

async function esperarChunks(page: Page) {
  let antes = -1;
  for (let i = 0; i < 40; i++) {
    await page.waitForTimeout(1500);
    const n = await page.evaluate(() => window.__brumaluz!.chunksCarregados ?? 0);
    if (n === antes && n > 20) break;
    antes = n;
  }
}

/** Procura no gerador (sem carregar) um lugar com morro e mata, longe de povoado. */
async function procurarLugar(page: Page): Promise<[number, number]> {
  const fixo = process.env.ESBOCO_LUGAR;
  if (fixo) {
    const [x, z] = fixo.split(',').map(Number);
    return [x, z];
  }
  const r = await page.evaluate(() => {
    const e = window.__brumaluz!;
    const folhas = new Set([5, 28, 30, 35, 55]);
    const out: { x: number; z: number; nota: number; desnivel: number; mata: number; agua: number; areia: number }[] = [];
    const [x0, , z0] = e.posicao!;
    for (let i = -7; i <= 7; i++)
      for (let j = -7; j <= 7; j++) {
        const cx = Math.round(x0 + i * 140);
        const cz = Math.round(z0 + j * 140);
        const alt: number[] = [];
        let mata = 0;
        let agua = 0;
        let areia = 0;
        let n = 0;
        for (let dx = -40; dx <= 40; dx += 5)
          for (let dz = -40; dz <= 40; dz += 5) {
            n++;
            for (let y = 110; y > 2; y--) {
              const b = e.blocoGerado!(cx + dx, y, cz + dz);
              if (!b) continue;
              if (folhas.has(b)) {
                mata++;
                continue;
              }
              if (b === 67) agua++;
              else alt.push(y);
              if ([3, 23, 24, 25, 26].includes(b)) areia++;
              break;
            }
          }
        const desnivel = alt.length ? Math.max(...alt) - Math.min(...alt) : 0;
        const fm = mata / n;
        const fa = agua / n;
        const fr = areia / n;
        const nota = -Math.abs(desnivel - 15) - Math.abs(fm - 0.35) * 30 - fa * 60 - fr * 40;
        out.push({ x: cx, z: cz, nota, desnivel, mata: fm, agua: fa, areia: fr });
      }
    const pov = e.povoados?.() ?? [];
    return out
      .filter((o) => pov.every((p) => Math.hypot(p.cx - o.x, p.cz - o.z) > 150))
      .sort((a, b) => b.nota - a.nota)
      .slice(0, 6);
  });
  console.log('esboco lugares', JSON.stringify(r));
  (procurarLugar as unknown as { todos: typeof r }).todos = r;
  return [r[0].x, r[0].z];
}


(SONDA ? test : test.skip)('lugar: morro e mata no Rancho', async ({ page }) => {
  test.setTimeout(600_000);
  await page.setViewportSize({ width: 1280, height: 720 });
  await abrir(page, false);
  await procurarLugar(page);
  const todos = (procurarLugar as unknown as { todos: { x: number; z: number }[] }).todos;
  mkdirSync(PASTA, { recursive: true });
  for (const [c, l] of todos.slice(0, 4).entries()) {
    await page.evaluate(([x, z]) => window.__brumaluz!.teleportar!(x, z), [l.x, l.z] as const);
    await esperarChunks(page);
    for (const [k, yaw] of [0, Math.PI].entries()) {
      await page.evaluate((yaw) => window.__brumaluz!.apontar!(yaw, 0.25), yaw);
      await page.waitForTimeout(1000);
      await page.screenshot({ path: `${PASTA}/sonda-${c}-${k}.png` });
    }
  }
});

/** Rancho com morros e árvores soltas (achado pela sonda) e a mata fechada. */
const MORROS: [number, number] = [642, -593];
const MATA: [number, number] = [782, 807];

interface Base {
  x: number;
  y: number;
  z: number;
  yaw: number;
}

/** Vai para perto de (x, z), num chão aberto (nada em volta até 4 blocos), olhando para yaw. */
async function irPara(page: Page, [x, z]: [number, number], yaw: number): Promise<Base> {
  await page.evaluate(([x, z]) => window.__brumaluz!.teleportar!(x, z), [x, z] as const);
  await esperarChunks(page);
  const b = await page.evaluate(
    ([x0, z0, yaw]) => {
      const e = window.__brumaluz!;
      const am = window.__amigos!;
      for (let r = 0; r < 40; r += 2)
        for (let k = 0; k < 16; k++) {
          const x = Math.floor(x0 + Math.cos((k / 16) * Math.PI * 2) * r) + 0.5;
          const z = Math.floor(z0 + Math.sin((k / 16) * Math.PI * 2) * r) + 0.5;
          const y = am.chao(x, z);
          if (y === null) continue;
          let aberto = true;
          const raio = r < 16 ? 4 : 2;
          for (let dx = -raio; dx <= raio && aberto; dx++)
            for (let dz = -raio; dz <= raio && aberto; dz++)
              for (let dy = 0; dy < 3; dy++) {
                const bl = e.bloco!(Math.floor(x) + dx, y + dy, Math.floor(z) + dz);
                // ar, capim e flor não contam
                if (bl && bl !== 8 && bl !== 9 && bl !== 54) {
                  aberto = false;
                  break;
                }
              }
          if (!aberto) continue;
          e.teleportar!(x, z, y);
          e.apontar!(yaw, 0.18);
          return { x, y, z, yaw };
        }
      return null;
    },
    [x, z, yaw] as const,
  );
  if (!b) throw new Error('sem chão aberto');
  await page.waitForTimeout(800);
  return b;
}

async function voltar(page: Page, b: Base) {
  await page.evaluate((b) => {
    const e = window.__brumaluz!;
    e.teleportar!(b.x, b.z, b.y);
    e.apontar!(b.yaw, 0.18);
  }, b);
  await page.waitForTimeout(700);
}

/** Amigos em volta: [id, ângulo em relação ao olhar (rad, + à direita), distância]. */
async function porAmigos(page: Page, b: Base, lista: [string, number, number][]) {
  return page.evaluate(
    ({ b, lista, aparencias }) =>
      window.__amigos!.por(
        lista.map(([id, ang, d]) => ({
          id,
          aparencia: aparencias[id],
          x: b.x + Math.sin(b.yaw + ang) * d,
          z: b.z + Math.cos(b.yaw + ang) * d,
          // virados para o jogador
          yaw: Math.atan2(-Math.sin(b.yaw + ang), -Math.cos(b.yaw + ang)),
        })),
      ),
    { b, lista, aparencias: AMIGOS },
  );
}

/** Procura, na frente, um lugar onde o amigo fica escondido (morro, árvore). */
async function esconder(page: Page, b: Base, id: string, d0: number, d1: number) {
  for (let d = d0; d <= d1; d += 6)
    for (const ang of [0.05, -0.15, 0.25, -0.3, 0.4]) {
      await porAmigos(page, b, [[id, ang, d]]);
      await page.waitForTimeout(450);
      const t = await page.evaluate((id) => window.__amigos!.tapado(id), id);
      if (t) return [ang, d] as const;
    }
  return null;
}

let n = 0;
async function foto(page: Page, nome: string) {
  mkdirSync(PASTA, { recursive: true });
  // confere que nenhuma carinha tapa o HUD
  const bate = await page.evaluate(() => {
    const am = window.__amigos!;
    const ps = am.proibidos();
    const out: string[] = [];
    for (const v of am.vistos())
      for (const p of ps) {
        const cx = Math.max(p.x, Math.min(v.x, p.x + p.w));
        const cy = Math.max(p.y, Math.min(v.y, p.y + p.h));
        if (v.tipo !== 'montinho' && Math.hypot(v.x - cx, v.y - cy) < v.r) out.push(`${v.id} x ${p.nome}`);
      }
    return { out, vistos: am.vistos() };
  });
  console.log('esboco foto', nome, JSON.stringify(bate.vistos.map((v) => [v.id, v.tipo, Math.round(v.x), Math.round(v.y), Math.round(v.r)])), bate.out.length ? 'TAPA: ' + bate.out.join(', ') : '');
  await page.screenshot({ path: `${PASTA}/${nome}.png` });
  n++;
}

for (const celular of [false, true]) {
  const pre = celular ? 'celular' : 'computador';
  test.describe(pre, () => {
    if (celular) test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
    else test.use({ viewport: { width: 1280, height: 720 } });
    test(`ideias no ${pre}`, async ({ page }) => {
      test.skip(SONDA);
      test.setTimeout(900_000);
      await abrir(page, celular);
      // ------------------------------------------------ 1: carinha na borda (Rancho com morros)
      const b = await irPara(page, MORROS, 0.6);
      await page.waitForTimeout(2500);
      await porAmigos(page, b, [['lia', -1.9, 60]]);
      await page.waitForTimeout(2500);
      await foto(page, `${pre}-1-carinha-longe`);
      await porAmigos(page, b, [['lia', 1.5, 18]]);
      await page.waitForTimeout(900);
      await foto(page, `${pre}-1-carinha-perto`);
      await porAmigos(page, b, [['lia', Math.PI - 0.5, 40]]);
      await page.waitForTimeout(900);
      await foto(page, `${pre}-1-carinha-atras`);
      await porAmigos(page, b, [['lia', 0.12, 16]]);
      await page.waitForTimeout(900);
      await foto(page, `${pre}-1-a-vista-sem-carinha`);
      // ------------------------------------------------ 3: trilha de estrelinhas
      const esc = (await esconder(page, b, 'lia', 34, 56)) ?? [0.1, 40];
      console.log('esboco escondida em', esc);
      await page.waitForTimeout(600);
      await foto(page, `${pre}-1-carinha-tapada-morro`);
      const passos = await page.evaluate(() => window.__amigos!.trilha('lia'));
      console.log('esboco trilha passos', passos);
      // olhando um pouco mais para baixo: a trilha no chão
      await page.evaluate((yaw) => window.__brumaluz!.apontar!(yaw, 0.42), b.yaw + esc[0] * 0.6);
      await page.waitForTimeout(1800);
      await foto(page, `${pre}-3-trilha-inicio`);
      await page.evaluate(() => window.__amigos!.andarTrilha(0.45));
      await page.waitForTimeout(400);
      await foto(page, `${pre}-3-trilha-meio`);
      await page.evaluate(() => window.__amigos!.andarTrilha(0.86));
      await page.waitForTimeout(300);
      await foto(page, `${pre}-3-trilha-chegando`);
      await page.evaluate(() => window.__amigos!.trilha(null));
      // ------------------------------------------------ 4: pular para perto
      await voltar(page, b);
      await porAmigos(page, b, [['lia', -1.2, 50]]);
      await page.waitForTimeout(1200);
      await page.evaluate(() => window.__amigos!.segurar('lia', 0.65));
      await page.waitForTimeout(200);
      await foto(page, `${pre}-4-pular-segurando`);
      await page.evaluate(() => window.__amigos!.segurar(null));
      await page.evaluate(() => window.__amigos!.pular('lia', 'poeira'));
      await page.waitForTimeout(180);
      await foto(page, `${pre}-4-pular-poeira-saindo`);
      await page.waitForTimeout(1200);
      const lugar = page.evaluate(() => window.__amigos!.pular('lia'));
      await page.waitForTimeout(520);
      await foto(page, `${pre}-4-pular-poeira-chegando`);
      console.log('esboco pulou para', JSON.stringify(await lugar));
      await page.waitForTimeout(900);
      await foto(page, `${pre}-4-pular-ao-lado-acenando`);
      // ------------------------------------------------ 5: chamar
      await voltar(page, b);
      await porAmigos(page, b, [['lia', 2.3, 45]]);
      await page.waitForTimeout(1200);
      await page.locator('.esb-botao.chamar').click();
      await page.waitForTimeout(650);
      await foto(page, `${pre}-5-chamar-apertou`);
      await page.waitForTimeout(1500);
      await page.evaluate(() => window.__amigos!.chamado('lia'));
      await page.waitForTimeout(800);
      await foto(page, `${pre}-5-chamar-recebendo`);
      await page.waitForTimeout(6000);
      // ------------------------------------------------ muitos amigos (7)
      await porAmigos(page, b, [
        ['lia', -1.6, 45],
        ['theo', 1.5, 55],
        ['bia', Math.PI, 38],
        ['gui', -2.5, 120],
        ['nina', 2.4, 130],
        ['davi', 1.0, 150],
        ['malu', 0.1, 7],
      ]);
      await page.waitForTimeout(3000);
      await foto(page, `${pre}-6-muitos-padrao`);
      await porAmigos(page, b, [
        ['lia', -1.5, 45],
        ['theo', -1.65, 70],
        ['bia', -1.4, 95],
        ['gui', -1.75, 120],
        ['nina', 1.6, 40],
        ['davi', Math.PI - 0.3, 60],
        ['malu', 0.1, 7],
      ]);
      await page.waitForTimeout(1200);
      await foto(page, `${pre}-6-muitos-montinho`);
      await page.locator('.esb-botao.bandeja').click();
      await page.waitForTimeout(500);
      await foto(page, `${pre}-6-muitos-bandeja`);
      await page.locator('.esb-bandeja .cara[data-id="bia"]').click();
      await page.waitForTimeout(700);
      await foto(page, `${pre}-6-muitos-escolhido`);
      // ------------------------------------------------ 2: balão (para comparar) e a mata fechada
      await page.evaluate(() => window.__amigos!.escolher(null));
      await porAmigos(page, b, [
        ['lia', -0.5, 60],
        ['theo', 0.35, 90],
      ]);
      await page.evaluate(() => window.__amigos!.modo('balao'));
      await page.waitForTimeout(1500);
      await foto(page, `${pre}-2-balao-morros`);
      const m = await irPara(page, MATA, 0.3);
      await page.waitForTimeout(2500);
      const pm = await porAmigos(page, m, [['lia', 0.05, 26], ['theo', -0.45, 34]]);
      console.log('esboco mata', JSON.stringify(m), JSON.stringify(pm));
      await page.waitForTimeout(800);
      await page.evaluate(() => window.__amigos!.modo('balao'));
      await page.waitForTimeout(1500);
      await foto(page, `${pre}-2-balao-mata`);
      await page.evaluate(() => window.__amigos!.modo('carinhas'));
      await page.waitForTimeout(800);
      await foto(page, `${pre}-1-carinha-mata`);
      await page.evaluate(() => window.__amigos!.trilha('lia'));
      await page.waitForTimeout(1800);
      await foto(page, `${pre}-3-trilha-mata`);
    });
  });
}

/** Vídeos curtos (computador): virar com a carinha, seguir a trilha, pular. */
(VIDEO ? test : test.skip)('vídeos', async ({ browser }) => {
  test.setTimeout(900_000);
  mkdirSync(PASTA, { recursive: true });
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: { dir: `${PASTA}/video-bruto`, size: { width: 1280, height: 720 } },
  });
  const t0 = Date.now();
  const page = await ctx.newPage();
  const marcas: Record<string, [number, number]> = {};
  const marca = (nome: string, ini: number) => (marcas[nome] = [(ini - t0) / 1000, (Date.now() - t0) / 1000]);
  await abrir(page, false);
  const b = await irPara(page, MORROS, 0.6);
  await page.waitForTimeout(2500);
  // ---- virar: a carinha corre pela borda e some quando a Lia aparece
  await porAmigos(page, b, [['lia', -1.9, 45], ['theo', 2.2, 70]]);
  await page.waitForTimeout(2500);
  let ini = Date.now();
  await page.evaluate(async (yaw0) => {
    const e = window.__brumaluz!;
    const t = performance.now();
    for (;;) {
      const f = (performance.now() - t) / 8000;
      if (f >= 1) break;
      e.apontar!(yaw0 - Math.sin(f * Math.PI) * 2.4, 0.18);
      await new Promise((r) => setTimeout(r, 30));
    }
  }, b.yaw);
  marca('virar', ini);
  // ---- trilha: toque de verdade na carinha e a caminhada
  await voltar(page, b);
  const esc = (await esconder(page, b, 'lia', 26, 40)) ?? [0.1, 30];
  void esc;
  await page.evaluate((yaw) => window.__brumaluz!.apontar!(yaw - 1.2, 0.18), b.yaw);
  await page.waitForTimeout(1500);
  ini = Date.now();
  await page.waitForTimeout(600);
  const v = await page.evaluate(() => window.__amigos!.vistos().find((x) => x.id === 'lia'));
  if (v) await page.mouse.click(v.x, v.y);
  else await page.evaluate(() => window.__amigos!.trilha('lia'));
  await page.waitForTimeout(1600);
  await page.evaluate(() => window.__amigos!.andarTrilha(0.97));
  await page.waitForTimeout(1500);
  marca('trilha', ini);
  // ---- pular: segurar de verdade a carinha
  await voltar(page, b);
  await porAmigos(page, b, [['lia', -1.5, 70]]);
  await page.waitForTimeout(1500);
  ini = Date.now();
  await page.waitForTimeout(500);
  const w = await page.evaluate(() => window.__amigos!.vistos().find((x) => x.id === 'lia'));
  if (w) {
    await page.mouse.move(w.x, w.y);
    await page.mouse.down();
    await page.waitForTimeout(1100);
    await page.mouse.up();
  } else await page.evaluate(() => window.__amigos!.pular('lia'));
  await page.waitForTimeout(3000);
  marca('pular', ini);
  const caminho = await page.video()!.path();
  await ctx.close();
  console.log('esboco video', caminho, JSON.stringify(marcas));
  writeFileSync(`${PASTA}/video-marcas.json`, JSON.stringify({ caminho, marcas }));
});

export type { V3 };
