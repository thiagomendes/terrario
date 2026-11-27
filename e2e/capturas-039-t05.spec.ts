import { expect, test, type Browser, type Page } from '@playwright/test';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { Bloco } from '../src/world/blocks';
import { assentar, criarMundo, TAMANHOS, type Tamanho } from './guia-palco';

/**
 * Fotos da T05 da spec 039 (o desenho dos móveis), no jogo de verdade: uma casa de blocos com os
 * oito móveis da parte 1, a cama nova e a curtinha, o tapete com o sofá em cima, o abajur aceso
 * de noite, e cada móvel nas quatro direções numa vitrine no gramado. Só na placa:
 *
 *   E2E_ENV="-e FOTOS_039_T05=empe,deitado,pc" scripts/e2e-gpu.sh \
 *     e2e/capturas-039-t05.spec.ts --workers 2 --trace off
 *
 * - `provas`: as vistas para acertar (não vão para o dono);
 * - `empe`, `deitado`, `pc`: as três telas, de dia e de noite, de fora (a casa sem o teto e sem a
 *   parede da frente, como uma casa de bonecas) e de dentro (com o teto, na primeira pessoa);
 *   `empe` também faz a prancha.
 *
 * As fotos vão para capturas-039/t05/ (T05_PASTA muda).
 */
declare const process: { env: Record<string, string | undefined> };
const QUAL = (process.env.FOTOS_039_T05 ?? '').split(',').filter(Boolean);
test.skip(!QUAL.length, 'fotos da T05 da 039 só com FOTOS_039_T05');
test.describe.configure({ mode: 'parallel' });

type V3 = [number, number, number];
const PASTA = process.env.T05_PASTA ?? 'capturas-039/t05';
const DIA = 0.42;
const NOITE = 0.96;
const T0 = Date.now();
const passo = (o: string) => console.log(`PASSO ${((Date.now() - T0) / 1000).toFixed(0)} s ${o}`);

/** O metadado de uma parte do móvel: a direção nos bits 0 e 1 e a parte nos bits 2 a 4. */
const meta = (d: number, parte = 0) => (d & 3) | ((parte & 7) << 2);
const valor = (b: number, m = 0) => b | (m << 8);

/**
 * A casa (coordenadas da casa: x para a direita de quem olha da frente, z para o fundo): o chão
 * de x -12 a 12 e de z -3 a 4, a parede do fundo em z = 4, os lados em x = ±12 e as paredes do
 * meio em x = ±4 (de z 0 a 4). Três cômodos: a sala, o meio (a pia e as cadeiras) e o quarto.
 *
 * Cada móvel: a âncora (dx, dz) e a direção `d` de quem pôs (0 olhando para o fundo, +z): a
 * frente do móvel olha para quem pôs; o sofá, o tapete e o guarda-roupa crescem para a direita
 * dele; a cama cresce para a frente dele (a cabeceira na âncora).
 */
const MOVEIS_DA_CASA: Array<{ nome: string; b: number; dx: number; dz: number; d: number; parte?: number }> = [
  // a sala
  { nome: 'sofa', b: Bloco.SOFA, dx: -9, dz: 3, d: 0 },
  { nome: 'abajur', b: Bloco.ABAJUR, dx: -10, dz: 3, d: 0 },
  { nome: 'cadeira-sala', b: Bloco.CADEIRA, dx: -6, dz: 3, d: 0 },
  // o meio: a pia e as cadeiras
  { nome: 'pia', b: Bloco.PIA, dx: -2, dz: 3, d: 0 },
  { nome: 'cadeira', b: Bloco.CADEIRA, dx: 1, dz: 2, d: 1 },
  { nome: 'criado-meio', b: Bloco.CRIADO_MUDO, dx: 2, dz: 3, d: 0 },
  // o quarto: a cama nova (a cabeceira no fundo), o criado-mudo, o guarda-roupa e a curtinha
  { nome: 'cama', b: Bloco.CAMA, dx: 7, dz: 3, d: 2 },
  { nome: 'criado', b: Bloco.CRIADO_MUDO, dx: 6, dz: 3, d: 0 },
  { nome: 'guarda', b: Bloco.GUARDA_ROUPA, dx: 10, dz: 3, d: 0 },
  { nome: 'curtinha', b: Bloco.CAMA, dx: 9, dz: 0, d: 3, parte: 2 },
];
/** O tapete da sala: a âncora e a direção (cresce 3 para a direita e 2 para a frente). */
const TAPETES_DA_CASA: Array<{ dx: number; dz: number; d: number }> = [{ dx: -9, dz: 2, d: 0 }];

/** A vitrine no gramado, na frente da casa: cada móvel numa coluna, as quatro direções numa linha. */
const VITRINE = [
  { nome: 'sofa', b: Bloco.SOFA },
  { nome: 'cadeira', b: Bloco.CADEIRA },
  { nome: 'criado-mudo', b: Bloco.CRIADO_MUDO },
  { nome: 'abajur', b: Bloco.ABAJUR },
  { nome: 'pia', b: Bloco.PIA },
  { nome: 'guarda-roupa', b: Bloco.GUARDA_ROUPA },
  { nome: 'cama', b: Bloco.CAMA },
  { nome: 'tapete', b: Bloco.TAPETE },
];
const VITRINE_X0 = -7;
const VITRINE_PASSO = 5;
const VITRINE_Z0 = 9;
/** Cada móvel numa fileira (atrás da casa, de z 9 em diante, de 4 em 4), as quatro direções lado a lado. */
const vitrineEm = (i: number, d: number): [number, number] => [VITRINE_X0 + d * VITRINE_PASSO, VITRINE_Z0 + i * 4];

interface Palco {
  page: Page;
  O: V3;
  tamanho: Tamanho;
}

async function abrirPalco(browser: Browser, tamanho: Tamanho): Promise<Palco> {
  const ctx = await browser.newContext(TAMANHOS[tamanho]);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log(`erro na página: ${String(e)}`));
  page.on('console', (m) => {
    if (m.text().startsWith('moveis')) console.log(m.text());
  });
  await page.addInitScript(() => {
    HTMLElement.prototype.requestPointerLock = function () {
      return Promise.resolve();
    } as typeof HTMLElement.prototype.requestPointerLock;
    try {
      localStorage.setItem(
        'terrario:config',
        JSON.stringify({ distancia: 5, mostrarFps: false, qualidade: 'alta', mostrarAtalhos: false }),
      );
    } catch {
      // sem armazenamento
    }
  });
  await criarMundo(page, 'moveis-t05', 'vila-neon', {}, 1337);
  await page.goto(`/?mundo=moveis-t05${tamanho === 'pc' ? '&escala=1' : ''}`);
  await page.waitForFunction(() => window.__brumaluz?.ready === true, undefined, { timeout: 240_000 });
  await page.evaluate((h) => {
    document.querySelector<HTMLElement>('.entrada')?.setAttribute('hidden', '');
    const e = window.__brumaluz!;
    e.pausarDia = true;
    e.hora = h;
    e.definirClima?.('limpo');
    (window as unknown as { __almaUi?: { hud: { fechar(): void } } }).__almaUi?.hud.fechar();
  }, DIA);
  await page.addStyleTag({ content: '.toast-area { display: none !important; }' });
  await assentar(page);
  const alvo = await page.evaluate(() => {
    const v = window.__brumaluz!.vila!()!;
    return [Math.round((v.plana.x0 + v.plana.x1) / 2), v.plana.z1 + 30] as const;
  });
  await page.evaluate(([x, z]) => window.__brumaluz!.teleportar!(x + 0.5, z + 0.5), alvo);
  await assentar(page);
  for (let i = 0; i < 40; i++) {
    const faltam = await page.evaluate(([x, z]) => {
      const e = window.__brumaluz!;
      let n = 0;
      for (let dx = -26; dx <= 26; dx += 6)
        for (let dz = -26; dz <= 19; dz += 6) {
          let tem = false;
          for (let y = 120; y > 1 && !tem; y--) tem = !!e.bloco!(x + dx, y, z + dz);
          if (!tem) n++;
        }
      return n;
    }, alvo);
    if (faltam === 0) break;
    await page.waitForTimeout(1500);
  }
  const O = await montarCasa(page);
  await mobiliar(page, O);
  await instalarCamera(page);
  // só o 3D na foto
  await page.evaluate(() => {
    const cena = document.getElementById('cena')!;
    for (const el of Array.from(document.body.querySelectorAll<HTMLElement>('*')))
      if (el !== cena && !el.contains(cena)) el.style.visibility = 'hidden';
  });
  passo(`montou ${tamanho}`);
  return { page, O, tamanho };
}

/** O gramado plano, a casa (sem o teto) e a vitrine; devolve o canto da casa (o chão de dentro). */
async function montarCasa(page: Page): Promise<V3> {
  return page.evaluate(
    ({ B }) => {
      const e = window.__brumaluz!;
      const [px, , pz] = e.posicao!;
      const cx = Math.floor(px);
      const cz = Math.floor(pz);
      const alturas: number[] = [];
      for (let dx = -20; dx <= 20; dx += 4)
        for (let dz = -14; dz <= 14; dz += 4)
          for (let y = 120; y > 1; y--) {
            const b = e.bloco!(cx + dx, y, cz + dz);
            if (!b || b === B.AGUA) continue;
            if (b === B.GRAMA_ALTA || b === B.FLOR || b === B.FOLHAGEM) continue;
            alturas.push(y);
            break;
          }
      alturas.sort((a, b) => a - b);
      const gy = alturas[Math.floor(alturas.length / 2)] ?? 64;
      const lote: { x: number; y: number; z: number; v: number }[] = [];
      const parede = (dx: number, dz: number) =>
        dz === 4 ? dx >= -12 && dx <= 12 : dz >= -3 && dz <= 4 && (dx === -12 || dx === 12 || ((dx === -4 || dx === 4) && dz >= 0));
      const janela = (dx: number, dz: number, y: number) => dz === 4 && y === 2 && [-6, 1, 2, 9].includes(dx);
      for (let dx = -26; dx <= 26; dx++)
        for (let dz = -14; dz <= 46; dz++) {
          const x = cx + dx;
          const z = cz + dz;
          for (let y = gy - 3; y < gy; y++) lote.push({ x, y, z, v: B.TERRA });
          const dentro = dx >= -12 && dx <= 12 && dz >= -3 && dz <= 4;
          lote.push({ x, y: gy, z, v: dentro ? B.TABUAS : B.TERRA_MUSGOSA });
          for (let y = 1; y <= 18; y++) {
            let v = 0;
            if (y <= 3 && parede(dx, dz)) v = janela(dx, dz, y) ? B.VIDRO : B.TABUAS_BETULA;
            lote.push({ x, y: gy + y, z, v });
          }
        }
      e.editarLote!(lote);
      e.teleportar!(cx + 0.5, cz - 6.5, gy + 1);
      return [cx, gy + 1, cz] as [number, number, number];
    },
    {
      B: {
        AGUA: Bloco.AGUA,
        GRAMA_ALTA: Bloco.GRAMA_ALTA,
        FLOR: Bloco.FLOR,
        FOLHAGEM: Bloco.FOLHAGEM,
        TERRA: Bloco.TERRA,
        TABUAS: Bloco.TABUAS,
        TERRA_MUSGOSA: Bloco.TERRA_MUSGOSA,
        TABUAS_BETULA: Bloco.TABUAS_BETULA,
        VIDRO: Bloco.VIDRO,
      },
    },
  );
}

/** O teto da casa (para as fotos de dentro) ou sem ele (as de fora). */
async function teto(page: Page, O: V3, com: boolean) {
  await page.evaluate(
    ({ O, com, T }) => {
      const lote: { x: number; y: number; z: number; v: number }[] = [];
      for (let dx = -12; dx <= 12; dx++) for (let dz = -3; dz <= 4; dz++) lote.push({ x: O[0] + dx, y: O[1] + 3, z: O[2] + dz, v: com ? T : 0 });
      window.__brumaluz!.editarLote!(lote);
    },
    { O, com, T: Bloco.TABUAS },
  );
  await page.waitForTimeout(2500);
}

/** Os móveis da casa e da vitrine (só a âncora; o núcleo monta o resto) e os tapetes. */
async function mobiliar(page: Page, O: V3) {
  const lote: { x: number; y: number; z: number; v: number }[] = [];
  for (const m of MOVEIS_DA_CASA) lote.push({ x: O[0] + m.dx, y: O[1], z: O[2] + m.dz, v: valor(m.b, meta(m.d, m.parte ?? 0)) });
  VITRINE.forEach((m, i) => {
    if (m.b === Bloco.TAPETE) return;
    for (let d = 0; d < 4; d++) {
      const [dx, dz] = vitrineEm(i, d);
      lote.push({ x: O[0] + dx, y: O[1], z: O[2] + dz, v: valor(m.b, meta(d)) });
    }
  });
  // os tapetes primeiro (o sofá vai por cima), pelo colocar, com o item na mão: a criança atrás
  // da âncora, olhando na direção dele
  const tapetes = [
    ...TAPETES_DA_CASA.map((t) => ({ x: O[0] + t.dx, z: O[2] + t.dz, d: t.d })),
    ...[0, 1, 2, 3].map((d) => {
      const [dx, dz] = vitrineEm(VITRINE.length - 1, d);
      return { x: O[0] + dx, z: O[2] + dz, d };
    }),
  ];
  await page.evaluate((b) => {
    const e = window.__brumaluz!;
    e.inventario!.definir(0, { item: `bloco:${b}`, qtd: 16 });
    e.selecionarSlot!(0);
  }, Bloco.TAPETE);
  for (const t of tapetes) {
    const [vx, vz] = [
      [0, 1],
      [1, 0],
      [0, -1],
      [-1, 0],
    ][t.d];
    await page.evaluate(
      ({ t, vx, vz, y }) => {
        const e = window.__brumaluz!;
        e.teleportar!(t.x + 0.5 - vx * 2.2, t.z + 0.5 - vz * 2.2, y);
      },
      { t, vx, vz, y: O[1] },
    );
    await page.waitForTimeout(600);
    const mirou = await page.evaluate(({ t, y }) => window.__brumaluz!.mirarBloco!(t.x, y - 1, t.z, { x: 0, y: 1, z: 0 }), { t, y: O[1] });
    const pos = mirou && (await page.evaluate(() => window.__brumaluz!.interagir!('colocar')));
    console.log(`moveis tapete ${t.x},${t.z} d${t.d} mirou ${mirou} pos ${pos}`);
    await page.waitForTimeout(400);
  }
  // (a mão vazia: a criança das fotos não segura o tapete)
  await page.evaluate(() => {
    const e = window.__brumaluz!;
    e.inventario!.definir(0, null);
    e.selecionarSlot!(0);
  });
  await page.evaluate((l) => window.__brumaluz!.editarLote!(l), lote);
  await page.waitForTimeout(3000);
  const faltam = await page.evaluate(
    (l) => l.filter((m) => (window.__brumaluz!.bloco!(m.x, m.y, m.z) | (window.__brumaluz!.meta!(m.x, m.y, m.z) << 8)) !== m.v).length,
    lote,
  );
  console.log(`moveis postos ${lote.length - faltam}/${lote.length}`);
  await page.evaluate((O) => window.__brumaluz!.teleportar!(O[0] + 0.5, O[2] - 6.5, O[1]), O);
  await page.waitForTimeout(2500);
}

/** A câmera das fotos (por cima da do jogo): `window.__camFoto` com o olho, o alvo e o campo. */
async function instalarCamera(page: Page) {
  await page.evaluate(() => {
    const w = window as unknown as {
      __camFoto: { p: number[]; a: number[]; fov: number } | null;
      __semJogador: boolean;
    };
    w.__camFoto = null;
    w.__semJogador = false;
    const scene = window.__brumaluz!.cenaBabylon!();
    scene.onBeforeCameraRenderObservable.add((cam) => {
      const f = w.__camFoto;
      if (!f) return;
      const c = cam as unknown as {
        fov: number;
        position: { set(x: number, y: number, z: number): void; clone(): { set(x: number, y: number, z: number): unknown } };
        setTarget(v: unknown): void;
        getViewMatrix(f: boolean): unknown;
        minZ: number;
      };
      c.fov = f.fov;
      c.minZ = 0.05;
      c.position.set(f.p[0], f.p[1], f.p[2]);
      const alvo = c.position.clone();
      alvo.set(f.a[0], f.a[1], f.a[2]);
      c.setTarget(alvo);
      c.getViewMatrix(true);
      scene.updateTransformMatrix(true);
    });
    scene.onBeforeRenderObservable.add(() => {
      for (const m of scene.meshes)
        if (m.name.startsWith('personagem') || m.name.startsWith('braco') || m.name.startsWith('pp-'))
          m.isVisible = !w.__semJogador;
    });
  });
}

interface Olhar {
  /** O alvo (coordenadas da casa), de onde olhar (yaw 0: da frente, -z), a inclinação e o que cabe. */
  alvo: V3;
  yaw: number;
  pitch: number;
  largura: number;
  altura: number;
  fov?: number;
}
/** Põe a câmera das fotos para caber `largura` × `altura` em volta do alvo, nesta tela. */
async function olhar(p: Palco, q: Olhar | null, semJogador = true) {
  const vp = TAMANHOS[p.tamanho].viewport;
  const aspecto = vp.width / vp.height;
  let f: { p: number[]; a: number[]; fov: number } | null = null;
  if (q) {
    const fov = ((q.fov ?? 40) * Math.PI) / 180;
    const hfov = 2 * Math.atan(Math.tan(fov / 2) * aspecto);
    const dist = Math.max(q.largura / 2 / Math.tan(hfov / 2), q.altura / 2 / Math.tan(fov / 2));
    const a = [p.O[0] + q.alvo[0], p.O[1] + q.alvo[1], p.O[2] + q.alvo[2]];
    const cp = Math.cos(q.pitch);
    f = {
      a,
      p: [a[0] + Math.sin(q.yaw) * cp * dist, a[1] + Math.sin(q.pitch) * dist, a[2] - Math.cos(q.yaw) * cp * dist],
      fov,
    };
  }
  await p.page.evaluate(
    ({ f, sem }) => {
      const w = window as unknown as { __camFoto: unknown; __semJogador: boolean };
      w.__camFoto = f;
      w.__semJogador = sem;
    },
    { f, sem: semJogador },
  );
}

async function hora(p: Palco, h: number) {
  await p.page.evaluate((h) => {
    window.__brumaluz!.hora = h;
  }, h);
}

async function foto(p: Palco, nome: string, sub: string) {
  const pasta = `${PASTA}/${sub}`;
  mkdirSync(pasta, { recursive: true });
  await p.page.waitForTimeout(900);
  await p.page.screenshot({ path: `${pasta}/${nome}.jpg`, type: 'jpeg', quality: 88 });
  console.log(`FOTO ${sub}/${nome}`);
}

const CASA: Olhar = { alvo: [0.5, 0.9, 1.0], yaw: 0, pitch: 0.42, largura: 26, altura: 5 };
const COMODO = {
  sala: { alvo: [-7.6, 0.9, 1.6], yaw: 0.3, pitch: 0.42, largura: 8.4, altura: 3.6 },
  meio: { alvo: [0.4, 0.9, 1.6], yaw: -0.1, pitch: 0.42, largura: 8.4, altura: 3.6 },
  quarto: { alvo: [8.6, 0.9, 1.6], yaw: 0.15, pitch: 0.42, largura: 8.4, altura: 3.6 },
} satisfies Record<string, Olhar>;
const vitrineOlhar = (i: number): Olhar => ({
  alvo: [VITRINE_X0 + 1.5 * VITRINE_PASSO + 1, 0.7, VITRINE_Z0 + i * 4 + 0.5],
  yaw: Math.PI - 0.15,
  pitch: 0.95,
  largura: 4 * VITRINE_PASSO,
  altura: 3.2,
  fov: 40,
});

/** O assento da criança (coordenadas da casa; null: em pé, fora da cena). */
interface Assento {
  x: number;
  z: number;
  d: number;
  px: number;
  pz: number;
  deitado?: boolean;
}
async function assento(p: Palco, a: Assento | null) {
  await p.page.evaluate(
    ({ a, O }) => {
      const e = window.__brumaluz!;
      e.meuAssento!(
        a ? { x: O[0] + a.x, y: O[1], z: O[2] + a.z, d: a.d, px: O[0] + a.px, pz: O[2] + a.pz, ...(a.deitado ? { deitado: true } : {}) } : null,
      );
    },
    { a, O: p.O },
  );
  await p.page.waitForTimeout(500);
}
const NO_SOFA: Assento = { x: -9, z: 3, d: 0, px: -8.5, pz: 3.5 };
const NA_CADEIRA: Assento = { x: 1, z: 2, d: 1, px: 1.5, pz: 2.5 };
const NA_CAMA: Assento = { x: 7, z: 3, d: 2, px: 7.5, pz: 3.0, deitado: true };
const NA_CURTINHA: Assento = { x: 9, z: 0, d: 3, px: 9.5, pz: 0.5, deitado: true };
const POSES: Array<[string, Assento, Olhar]> = [
  ['sentada-sofa', NO_SOFA, { alvo: [-8, 0.9, 3.2], yaw: 0.35, pitch: 0.25, largura: 3.2, altura: 2.4 }],
  ['sentada-cadeira', NA_CADEIRA, { alvo: [1.5, 0.9, 2.5], yaw: -0.6, pitch: 0.25, largura: 2.4, altura: 2.2 }],
  ['deitada-cama', NA_CAMA, { alvo: [7.5, 0.6, 3.0], yaw: 0.75, pitch: 0.55, largura: 3.0, altura: 2.0 }],
  ['deitada-curtinha', NA_CURTINHA, { alvo: [9.5, 0.6, 0.5], yaw: 0.5, pitch: 0.55, largura: 2.2, altura: 1.8 }],
  ['deitada-sofa', { ...NO_SOFA, deitado: true }, { alvo: [-8, 0.7, 3.2], yaw: 0.3, pitch: 0.45, largura: 3.0, altura: 2.0 }],
];

// ------------------------------------------------------------------ provas
test('provas: a casa, os cômodos e a vitrine', async ({ browser }) => {
  test.skip(!QUAL.includes('provas'), 'só com FOTOS_039_T05=provas');
  test.setTimeout(900_000);
  const p = await abrirPalco(browser, 'pc');
  await olhar(p, CASA);
  await foto(p, 'casa-dia', 'provas');
  for (const [n, q] of Object.entries(COMODO)) {
    await olhar(p, q);
    await foto(p, `${n}-dia`, 'provas');
  }
  VITRINE.forEach(() => undefined);
  for (let i = 0; i < VITRINE.length; i++) {
    await olhar(p, vitrineOlhar(i));
    await foto(p, `vitrine-${VITRINE[i].nome}`, 'provas');
  }
  for (const [n, a, q] of POSES) {
    await assento(p, a);
    await olhar(p, q, false);
    await foto(p, n, 'provas');
    console.log(
      `moveis pose ${n} ${JSON.stringify(
        await p.page.evaluate(() => {
          const s = window.__brumaluz!.cenaBabylon!();
          const ms = s.meshes.filter((m) => m.name.startsWith('personagem') && m.isEnabled());
          const m = ms[0];
          const cab = s.transformNodes.find((n) => n.name === 'personagem-junta-cabeca');
          let raiz = cab as unknown as { parent: unknown; name: string; position: unknown; rotation: unknown; scaling: unknown } | undefined;
          while (raiz && raiz.parent) raiz = raiz.parent as typeof raiz;
          return {
            cab: cab ? [cab.getAbsolutePosition().x, cab.getAbsolutePosition().y, cab.getAbsolutePosition().z] : null,
            raiz: raiz ? { nome: raiz.name, p: raiz.position, r: raiz.rotation, s: raiz.scaling } : null,
            nomes: ms.map((x) => x.name).slice(0, 12),
            n: ms.length,
            vis: ms.filter((x) => x.isVisible).length,
            nome: m?.name,
            pos: m ? [m.getAbsolutePosition().x, m.getAbsolutePosition().y, m.getAbsolutePosition().z] : null,
            mexe: window.__brumaluz!.moveis!.mexendo(),
          };
        }),
      )}`,
    );
  }
  await assento(p, null);
  await hora(p, NOITE);
  await p.page.evaluate(
    ({ O, b }) => window.__brumaluz!.editarLote!([{ x: O[0] - 10, y: O[1], z: O[2] + 3, v: b }]),
    { O: p.O, b: Bloco.ABAJUR_ACESO },
  );
  await p.page.waitForTimeout(2000);
  await olhar(p, COMODO.sala);
  await foto(p, 'sala-noite', 'provas');
  console.log(`MOVEIS ${JSON.stringify(await p.page.evaluate(() => window.__brumaluz!.moveis!.contagem()))}`);
  await p.page.context().close();
});

// ------------------------------------------------------------------ as três telas
/** Acende (ou apaga) o abajur e o criado-mudo do quarto: o mesmo bloco com o id do aceso. */
async function luzes(p: Palco, acesas: boolean) {
  await p.page.evaluate(
    ({ O, l }) => window.__brumaluz!.editarLote!(l.map((m) => ({ x: O[0] + m.dx, y: O[1], z: O[2] + m.dz, v: m.v }))),
    {
      O: p.O,
      l: [
        { dx: -10, dz: 3, v: valor(acesas ? Bloco.ABAJUR_ACESO : Bloco.ABAJUR, meta(0)) },
        { dx: 6, dz: 3, v: valor(acesas ? Bloco.CRIADO_MUDO_ACESO : Bloco.CRIADO_MUDO, meta(0)) },
      ],
    },
  );
  await p.page.waitForTimeout(2500);
}

/** De dentro, na primeira pessoa: a criança em (x, z) olhando para (ax, ay, az) (coordenadas da casa). */
async function deDentro(p: Palco, x: number, z: number, alvo: V3) {
  await olhar(p, null, false);
  await p.page.evaluate(
    ({ O, x, z, alvo }) => {
      const e = window.__brumaluz!;
      e.primeiraPessoa!.ligar(true);
      e.teleportar!(O[0] + x, O[2] + z, O[1]);
      const dx = alvo[0] - x;
      const dz = alvo[2] - z;
      const dy = alvo[1] - 1.5;
      e.apontar!(Math.atan2(dx, dz), Math.atan2(-dy, Math.hypot(dx, dz)));
    },
    { O: p.O, x, z, alvo },
  );
  await p.page.waitForTimeout(1500);
}
const DENTRO: Array<[string, number, number, V3]> = [
  ['sala', -5.2, -2.2, [-8.6, 0.5, 2.8]],
  ['meio', 2.6, -2.2, [-0.5, 0.7, 2.8]],
  ['quarto', 11.2, -2.2, [7.8, 0.4, 2.6]],
];

async function telas(p: Palco, sub: string, comVitrine: boolean) {
  // de fora (sem o teto): a casa e os cômodos de dia, com a criança em pé no quarto
  await assento(p, null);
  await olhar(p, CASA);
  await foto(p, 'casa-dia', sub);
  for (const [n, q] of Object.entries(COMODO)) {
    await olhar(p, q);
    await foto(p, `${n}-dia`, sub);
  }
  // a criança sentada e deitada (o mesmo boneco do jogo)
  for (const [n, a, q] of POSES) {
    await assento(p, a);
    await olhar(p, q, false);
    await foto(p, `${n}-dia`, sub);
    if (a.deitado) {
      // nada do corpo passa da coberta (pelos lados e pelos pés), e a coberta é a macia
      const m = await p.page.evaluate(() => window.__brumaluz!.moveis!.mexendo().filter((x) => Object.keys(x.deitados).length));
      console.log(`COBERTA ${sub} ${n} ${JSON.stringify(m.map((x) => ({ fora: x.fora, coberta: x.coberta, caixas: x.caixas })))}`);
      expect.soft(m.length).toBe(1);
      expect.soft(m[0]?.coberta).toBe(true);
      expect.soft(m[0]?.fora).toBeLessThanOrEqual(0.01);
      // e de outro lado (nada atravessa nada)
      // (de cima, do lado oposto: a casa não tem a parede da frente, mas tem as outras)
      await olhar(p, { ...q, yaw: -q.yaw * 0.8, pitch: 1.0 }, false);
      await foto(p, `${n}-outro-lado`, sub);
    }
  }
  // o que mexe (só na tela de quem tocou; a T06 liga ao toque): as portas do guarda-roupa e a água
  await assento(p, null);
  await p.page.evaluate((O) => {
    const m = window.__brumaluz!.moveis!;
    m.portas(O[0] + 10, O[1], O[2] + 3, true);
    m.agua(O[0] - 2, O[1], O[2] + 3, true);
  }, p.O);
  await p.page.waitForTimeout(1200);
  await olhar(p, { alvo: [11, 1.0, 3.1], yaw: -0.25, pitch: 0.2, largura: 2.8, altura: 2.4 });
  await foto(p, 'guarda-aberto-dia', sub);
  // (a pia de frente, a câmera um tico acima da bancada: a água caindo e a cuba à vista)
  await olhar(p, { alvo: [-1.5, 1.05, 3.4], yaw: 0, pitch: 0.32, largura: 1.5, altura: 1.4 });
  await foto(p, 'pia-agua-dia', sub);
  // o criado-mudo de dia, de perto (a lua em crescente apagada)
  await olhar(p, { alvo: [6.5, 0.7, 3.4], yaw: 0.35, pitch: 0.3, largura: 1.4, altura: 1.3 });
  await foto(p, 'criado-dia', sub);
  await p.page.evaluate((O) => {
    const m = window.__brumaluz!.moveis!;
    m.portas(O[0] + 10, O[1], O[2] + 3, false);
    m.agua(O[0] - 2, O[1], O[2] + 3, false);
  }, p.O);
  await p.page.waitForTimeout(1000);
  // de noite: o abajur e o criado-mudo acesos, a criança dormindo na cama
  await hora(p, NOITE);
  await luzes(p, true);
  await olhar(p, CASA);
  await foto(p, 'casa-noite', sub);
  await olhar(p, COMODO.sala);
  await foto(p, 'sala-noite', sub);
  await assento(p, NA_CAMA);
  await olhar(p, COMODO.quarto, false);
  await foto(p, 'quarto-noite', sub);
  await olhar(p, POSES[2][2], false);
  await foto(p, 'deitada-cama-noite', sub);
  await assento(p, { ...NO_SOFA, deitado: true });
  await olhar(p, POSES[4][2], false);
  await foto(p, 'deitada-sofa-noite', sub);
  await assento(p, NA_CURTINHA);
  await olhar(p, POSES[3][2], false);
  await foto(p, 'deitada-curtinha-noite', sub);
  await assento(p, null);
  await olhar(p, { alvo: [6.5, 0.7, 3.4], yaw: 0.35, pitch: 0.3, largura: 1.4, altura: 1.3 });
  await foto(p, 'criado-noite', sub);
  // cada móvel nas quatro direções (de dia)
  await hora(p, DIA);
  if (comVitrine)
    for (let i = 0; i < VITRINE.length; i++) {
      await olhar(p, vitrineOlhar(i));
      await foto(p, `vitrine-${VITRINE[i].nome}`, sub);
    }
  // as costas da pia e do guarda-roupa (na vitrine, os de direção 0 olham para a casa)
  const [pcx, pcz] = vitrineEm(4, 0);
  await olhar(p, { alvo: [pcx + 0.5, 0.75, pcz + 0.5], yaw: Math.PI - 0.5, pitch: 0.25, largura: 1.8, altura: 1.7 });
  await foto(p, 'pia-costas', sub);
  const [gcx, gcz] = vitrineEm(5, 0);
  await olhar(p, { alvo: [gcx + 1, 1.0, gcz + 0.5], yaw: Math.PI - 0.5, pitch: 0.2, largura: 2.8, altura: 2.4 });
  await foto(p, 'guarda-costas', sub);
  // de dentro, na primeira pessoa, com o teto
  await teto(p.page, p.O, true);
  for (const [n, x, z, a] of DENTRO) {
    await deDentro(p, x, z, a);
    await foto(p, `${n}-dentro-dia`, sub);
  }
  await hora(p, NOITE);
  for (const [n, x, z, a] of [DENTRO[0], DENTRO[2]]) {
    await deDentro(p, x, z, a);
    await foto(p, `${n}-dentro-noite`, sub);
  }
  // os ícones na barra e o móvel na mão (de dentro, com a interface à vista)
  await hora(p, DIA);
  await p.page.evaluate((bs) => {
    const e = window.__brumaluz!;
    bs.forEach((b, i) => e.inventario!.definir(i, { item: `bloco:${b}`, qtd: 1 }));
    e.selecionarSlot!(0);
    for (const el of Array.from(document.body.querySelectorAll<HTMLElement>('*'))) el.style.visibility = '';
  }, [Bloco.SOFA, Bloco.CAMA, Bloco.CADEIRA, Bloco.CRIADO_MUDO, Bloco.ABAJUR, Bloco.TAPETE, Bloco.PIA, Bloco.GUARDA_ROUPA]);
  await deDentro(p, -5.2, -2.2, [-8.6, 0.0, 1.0]);
  await foto(p, 'barra-e-mao', sub);
  // o catálogo do criativo na aba casa (os ícones de brinquedo chegam aos poucos)
  try {
    await p.page.evaluate(() => document.body.classList.add('toque-ativo'));
    await p.page.locator('[data-botao-mochila]').dispatchEvent('click');
    await p.page.waitForTimeout(800);
    await p.page.locator('.catalogo [data-aba-categoria="casa"]').dispatchEvent('click');
    await p.page.waitForTimeout(5000);
    await foto(p, 'catalogo-casa', sub);
    await p.page.locator('[data-botao-mochila]').dispatchEvent('click');
    await p.page.keyboard.press('Escape');
    await p.page.waitForTimeout(800);
  } catch (e) {
    console.log(`moveis sem o catálogo: ${String(e).slice(0, 200)}`);
  }
  await p.page.evaluate(() => {
    const e = window.__brumaluz!;
    for (let i = 0; i < 9; i++) e.inventario!.definir(i, null);
    const cena = document.getElementById('cena')!;
    for (const el of Array.from(document.body.querySelectorAll<HTMLElement>('*')))
      if (el !== cena && !el.contains(cena)) el.style.visibility = 'hidden';
  });
  // o quarto de noite, de dentro, com tudo apagado (nunca escuro total)
  await luzes(p, false);
  await hora(p, NOITE);
  await deDentro(p, DENTRO[2][1], DENTRO[2][2], DENTRO[2][3]);
  await foto(p, 'quarto-dentro-noite-apagado', sub);
  await p.page.evaluate(() => window.__brumaluz!.primeiraPessoa!.ligar(false));
  await teto(p.page, p.O, false);
  await hora(p, DIA);
}

for (const tamanho of ['empe', 'deitado', 'pc'] as const)
  test(`${tamanho}: a casa mobiliada de dia e de noite, de fora e de dentro, as poses e a vitrine`, async ({ browser }) => {
    test.skip(!QUAL.includes(tamanho), `só com FOTOS_039_T05=${tamanho}`);
    test.setTimeout(1_800_000);
    const p = await abrirPalco(browser, tamanho);
    const sub = tamanho === 'pc' ? 'computador' : tamanho;
    // (a vitrine das quatro direções no deitado e no computador: em pé, as quatro não cabem lado a lado)
    await telas(p, sub, tamanho !== 'empe');
    // o custo dos móveis com a casa e a vitrine à vista (os pedaços montados)
    const custo = await p.page.evaluate(() => window.__brumaluz!.moveis!.contagem());
    writeFileSync(`${PASTA}/${sub}/custo.json`, JSON.stringify(custo, null, 1));
    console.log(`MOVEIS ${sub} ${JSON.stringify(custo)}`);
    await p.page.context().close();
  });

// ------------------------------------------------------------------ a prancha
test('prancha: junta as fotos das três telas (depois delas)', async ({ browser }) => {
  test.skip(!QUAL.includes('prancha'), 'só com FOTOS_039_T05=prancha');
  await prancha(browser);
});
async function prancha(browser: Browser) {
  const img = (n: string) =>
    existsSync(`${PASTA}/empe/${n}.jpg`) ? `data:image/jpeg;base64,${readFileSync(`${PASTA}/empe/${n}.jpg`, 'base64')}` : '';
  const imgPc = (n: string) =>
    existsSync(`${PASTA}/computador/${n}.jpg`) ? `data:image/jpeg;base64,${readFileSync(`${PASTA}/computador/${n}.jpg`, 'base64')}` : '';
  const q = (src: string, legenda: string) => `<figure><img src="${src}"><figcaption>${legenda}</figcaption></figure>`;
  const linha = (xs: string[], cls = '') => `<div class="linha ${cls}">${xs.join('')}</div>`;
  const pc = existsSync(`${PASTA}/computador/casa-dia.jpg`);
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
    body { margin: 0; background: #fbf6ec; font-family: system-ui, sans-serif; color: #3a2f4a; width: 1080px; }
    h1 { margin: 22px 26px 2px; font-size: 36px; }
    h2 { margin: 20px 26px 8px; font-size: 26px; }
    p.sub { margin: 0 26px 8px; font-size: 19px; color: #6a5d7a; }
    .linha { display: flex; gap: 10px; padding: 0 26px; margin-bottom: 8px; }
    figure { margin: 0; flex: 1; background: #fff; border-radius: 14px; padding: 5px; box-shadow: 0 2px 8px rgba(60,40,80,.12); }
    figure img { width: 100%; border-radius: 10px; display: block; }
    figcaption { font-size: 16px; color: #6a5d7a; padding: 4px 4px 1px; }
  </style></head><body>
    <h1>039 · os móveis: o portão visual, 2ª volta</h1>
    <p class="sub">Deitar e sentar refeitos, as costas da pia e do guarda-roupa, os ícones, a lua do criado-mudo e a luz do quarto. A casa sem o teto para as fotos de fora; com o teto, de dentro.</p>
    <h2>Deitada no sofá (de noite, sem cama)</h2>
    ${linha([q(img('deitada-sofa-dia'), 'a mantinha creme do pescoço aos pés'), q(img('deitada-sofa-noite'), 'de noite'), ...(pc ? [q(imgPc('deitada-sofa-noite'), 'de noite, no computador')] : [])])}
    <h2>A cama curtinha e a cama nova</h2>
    ${linha([q(img('deitada-curtinha-dia'), 'curtinha'), q(img('deitada-curtinha-noite'), 'curtinha de noite'), q(img('deitada-cama-dia'), 'cama nova'), q(img('deitada-cama-noite'), 'dormindo de noite')])}
    ${pc ? linha([q(imgPc('deitada-curtinha-dia'), 'curtinha, computador'), q(imgPc('deitada-cama-dia'), 'cama nova, computador')]) : ''}
    <h2>Sentada</h2>
    ${linha([q(img('sentada-sofa-dia'), 'no sofá, no meio do lugar'), q(img('sentada-cadeira-dia'), 'na cadeira'), ...(pc ? [q(imgPc('sentada-sofa-dia'), 'no sofá, computador')] : [])])}
    <h2>As costas, a água, a lua e os ícones</h2>
    ${linha([q(img('pia-costas'), 'a pia de costas'), q(img('guarda-costas'), 'o guarda-roupa de costas'), q(img('pia-agua-dia'), 'a água da pia'), q(img('criado-dia'), 'a lua apagada'), q(img('criado-noite'), 'a lua acesa')])}
    ${linha([q(img('barra-e-mao'), 'os ícones na barra e o sofá na mão'), q(img('catalogo-casa'), 'o catálogo na aba casa'), q(img('quarto-dentro-noite'), 'o quarto de noite, a lua acesa'), q(img('quarto-dentro-noite-apagado'), 'o quarto de noite, tudo apagado')])}
    <h2>A casa</h2>
    ${linha([q(img('sala-dia'), 'sala'), q(img('meio-dia'), 'a pia e as cadeiras'), q(img('quarto-dia'), 'quarto'), q(img('sala-noite'), 'sala de noite')])}
    <div style="height:16px"></div>
  </body></html>`;
  const p2 = await browser.newPage({ viewport: { width: 1080, height: 800 } });
  await p2.setContent(html, { waitUntil: 'load' });
  await p2.screenshot({ path: `${PASTA}/00-prancha.jpg`, type: 'jpeg', quality: 80, fullPage: true });
  console.log(`FOTO 00-prancha (${await p2.evaluate(() => document.body.scrollHeight)} px)`);
  await p2.close();
}
