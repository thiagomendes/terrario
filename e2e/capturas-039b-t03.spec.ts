import { test, type Browser, type Page } from '@playwright/test';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { Bloco } from '../src/world/blocks';
import { assentar, criarMundo, TAMANHOS, type Tamanho } from './guia-palco';

/**
 * Fotos da T03 da spec 039b (o desenho da parte 2: o fogão, a geladeira, a mesa, a TV e o som),
 * no jogo de verdade: a casa da parte 1 com os treze móveis, de dia e de noite, de fora (sem o
 * teto, como uma casa de bonecas) e de dentro (com o teto, na primeira pessoa); cada toque em
 * sequência (a TV trocando de desenho, a geladeira abrindo, o fogão cozinhando, o som tocando) e o
 * prato na mesa; os cinco nas quatro direções (as costas também). Só na placa:
 *
 *   E2E_ENV="-e FOTOS_039B_T03=empe,deitado,pc" scripts/e2e-gpu.sh \
 *     e2e/capturas-039b-t03.spec.ts --workers 1 --trace off
 *
 * O que está ligado vem do núcleo (`moveisLigados`, ligado pelo toque da T04); aqui as fotos
 * mostram cada estado pelo `forcarLigados` do desenho, com o relógio do núcleo. As fotos vão para
 * capturas-039b/t03/ (T03_PASTA muda); `prancha` junta as principais.
 */
declare const process: { env: Record<string, string | undefined> };
const QUAL = (process.env.FOTOS_039B_T03 ?? '').split(',').filter(Boolean);
test.skip(!QUAL.length, 'fotos da T03 da 039b só com FOTOS_039B_T03');
test.describe.configure({ mode: 'parallel' });

type V3 = [number, number, number];
const PASTA = process.env.T03_PASTA ?? 'capturas-039b/t03';
const DIA = 0.42;
const NOITE = 0.96;
const meta = (d: number, parte = 0) => (d & 3) | ((parte & 7) << 2);
const valor = (b: number, m = 0) => b | (m << 8);

/**
 * A casa da parte 1 (x para a direita de quem olha da frente, z para o fundo; o fundo em z = 4,
 * as paredes do meio em x = ±4), agora com os treze móveis: na sala, a TV de frente para o sofá
 * e o som; no meio, a cozinha (o fogão, a pia e a geladeira no fundo) e a mesa com quatro
 * cadeiras; o quarto como era.
 */
const MOVEIS_DA_CASA: Array<{ b: number; dx: number; dz: number; d: number; parte?: number }> = [
  { b: Bloco.SOFA, dx: -9, dz: 3, d: 0 },
  { b: Bloco.ABAJUR, dx: -10, dz: 3, d: 0 },
  { b: Bloco.TV, dx: -9, dz: -1, d: 2 },
  { b: Bloco.SOM, dx: -5, dz: 3, d: 0 },
  { b: Bloco.FOGAO, dx: -3, dz: 3, d: 0 },
  { b: Bloco.PIA, dx: -2, dz: 3, d: 0 },
  { b: Bloco.GELADEIRA, dx: -1, dz: 3, d: 0 },
  { b: Bloco.MESA, dx: 0, dz: 1, d: 0 },
  { b: Bloco.CADEIRA, dx: 0, dz: 2, d: 0 },
  { b: Bloco.CADEIRA, dx: 1, dz: 2, d: 0 },
  { b: Bloco.CADEIRA, dx: 0, dz: 0, d: 2 },
  { b: Bloco.CADEIRA, dx: 1, dz: 0, d: 2 },
  { b: Bloco.CRIADO_MUDO, dx: 2, dz: 3, d: 0 },
  { b: Bloco.CAMA, dx: 7, dz: 3, d: 2 },
  { b: Bloco.CRIADO_MUDO, dx: 6, dz: 3, d: 0 },
  { b: Bloco.GUARDA_ROUPA, dx: 10, dz: 3, d: 0 },
  { b: Bloco.CAMA, dx: 9, dz: 0, d: 3, parte: 2 },
];
const TAPETES_DA_CASA = [{ dx: -9, dz: 2, d: 0 }];
const TV: V3 = [-9, 0, -1];
const SOM: V3 = [-5, 0, 3];
const FOGAO: V3 = [-3, 0, 3];
const GELADEIRA: V3 = [-1, 0, 3];
const MESA: V3 = [0, 0, 1];

/** A vitrine atrás da casa: os cinco novos, cada um numa fileira, nas quatro direções. */
const VITRINE = [
  { nome: 'fogao', b: Bloco.FOGAO },
  { nome: 'geladeira', b: Bloco.GELADEIRA },
  { nome: 'mesa', b: Bloco.MESA },
  { nome: 'tv', b: Bloco.TV },
  { nome: 'som', b: Bloco.SOM },
];
const VITRINE_X0 = -7;
const VITRINE_PASSO = 5;
const VITRINE_Z0 = 9;
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
  await page.addInitScript(() => {
    HTMLElement.prototype.requestPointerLock = function () {
      return Promise.resolve();
    } as typeof HTMLElement.prototype.requestPointerLock;
    try {
      localStorage.setItem('terrario:config', JSON.stringify({ distancia: 5, mostrarFps: false, qualidade: 'alta', mostrarAtalhos: false }));
    } catch {
      // sem armazenamento
    }
  });
  await criarMundo(page, 'moveis-t03', 'vila-neon', {}, 1337);
  await page.goto(`/?mundo=moveis-t03${tamanho === 'pc' ? '&escala=1' : ''}`);
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
  await page.evaluate(() => {
    const cena = document.getElementById('cena')!;
    for (const el of Array.from(document.body.querySelectorAll<HTMLElement>('*')))
      if (el !== cena && !el.contains(cena)) el.style.visibility = 'hidden';
  });
  return { page, O, tamanho };
}

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

async function mobiliar(page: Page, O: V3) {
  const lote: { x: number; y: number; z: number; v: number }[] = [];
  for (const m of MOVEIS_DA_CASA) lote.push({ x: O[0] + m.dx, y: O[1], z: O[2] + m.dz, v: valor(m.b, meta(m.d, m.parte ?? 0)) });
  VITRINE.forEach((m, i) => {
    for (let d = 0; d < 4; d++) {
      const [dx, dz] = vitrineEm(i, d);
      lote.push({ x: O[0] + dx, y: O[1], z: O[2] + dz, v: valor(m.b, meta(d)) });
    }
  });
  // o tapete da sala primeiro (o sofá vai por cima), pelo colocar
  await page.evaluate((b) => {
    const e = window.__brumaluz!;
    e.inventario!.definir(0, { item: `bloco:${b}`, qtd: 4 });
    e.selecionarSlot!(0);
  }, Bloco.TAPETE);
  for (const t of TAPETES_DA_CASA) {
    const x = O[0] + t.dx;
    const z = O[2] + t.dz;
    await page.evaluate(({ x, z, y }) => window.__brumaluz!.teleportar!(x + 0.5, z + 0.5 - 2.2, y), { x, z, y: O[1] });
    await page.waitForTimeout(600);
    const mirou = await page.evaluate(({ x, z, y }) => window.__brumaluz!.mirarBloco!(x, y - 1, z, { x: 0, y: 1, z: 0 }), { x, z, y: O[1] });
    if (mirou) await page.evaluate(() => window.__brumaluz!.interagir!('colocar'));
    await page.waitForTimeout(400);
  }
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

async function instalarCamera(page: Page) {
  await page.evaluate(() => {
    const w = window as unknown as { __camFoto: { p: number[]; a: number[]; fov: number } | null; __semJogador: boolean };
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
        if (m.name.startsWith('personagem') || m.name.startsWith('braco') || m.name.startsWith('pp-')) m.isVisible = !w.__semJogador;
    });
  });
}

interface Olhar {
  alvo: V3;
  yaw: number;
  pitch: number;
  largura: number;
  altura: number;
  fov?: number;
}
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
    f = { a, p: [a[0] + Math.sin(q.yaw) * cp * dist, a[1] + Math.sin(q.pitch) * dist, a[2] - Math.cos(q.yaw) * cp * dist], fov };
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
async function foto(p: Palco, nome: string, sub: string, espera = 900) {
  const pasta = `${PASTA}/${sub}`;
  mkdirSync(pasta, { recursive: true });
  await p.page.waitForTimeout(espera);
  await p.page.screenshot({ path: `${pasta}/${nome}.jpg`, type: 'jpeg', quality: 88 });
  console.log(`FOTO ${sub}/${nome}`);
}
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

/** O que está ligado agora (pelo desenho; as âncoras em coordenadas da casa). */
type Ligar = Partial<Record<'tv' | 'som' | 'fogao' | 'geladeira', number | boolean>>;
async function ligar(p: Palco, l: Ligar) {
  await p.page.evaluate(
    ({ O, l, A }) => {
      const at = (a: number[]) => ({ x: O[0] + a[0], y: O[1] + a[1], z: O[2] + a[2] });
      const lista: unknown[] = [];
      // (o "desde" muda com o programa: a TV começa o desenho novo do começo)
      if (typeof l.tv === 'number') lista.push({ tipo: 'tv', ...at(A.tv), programa: l.tv, desde: l.tv * 7 });
      if (l.som) lista.push({ tipo: 'som', ...at(A.som), programa: 0, desde: 0 });
      if (l.fogao) lista.push({ tipo: 'fogao', ...at(A.fogao), receita: 'carne_assada', progresso: 0.5 });
      if (l.geladeira) lista.push({ tipo: 'geladeira', ...at(A.geladeira) });
      (window.__brumaluz!.moveis! as unknown as { forcarLigados(l: unknown[] | null): void }).forcarLigados(lista);
    },
    { O: p.O, l, A: { tv: TV, som: SOM, fogao: FOGAO, geladeira: GELADEIRA } },
  );
}
async function prato(p: Palco, item: string, quantos: number) {
  await p.page.evaluate(
    ({ O, M, item, quantos }) =>
      (window.__brumaluz!.moveis! as unknown as { prato(x: number, y: number, z: number, i: string, q: number): void }).prato(
        O[0] + M[0],
        O[1],
        O[2] + M[2],
        item,
        quantos,
      ),
    { O: p.O, M: MESA, item, quantos },
  );
}
async function assento(p: Palco, a: { x: number; z: number; d: number; px: number; pz: number } | null) {
  await p.page.evaluate(
    ({ a, O }) => window.__brumaluz!.meuAssento!(a ? { x: O[0] + a.x, y: O[1], z: O[2] + a.z, d: a.d, px: O[0] + a.px, pz: O[2] + a.pz } : null),
    { a, O: p.O },
  );
  await p.page.waitForTimeout(500);
}

const CASA: Olhar = { alvo: [0.5, 0.9, 1.0], yaw: 0, pitch: 0.42, largura: 26, altura: 5 };
const SALA: Olhar = { alvo: [-8, 0.9, 1.2], yaw: 0.3, pitch: 0.5, largura: 8.4, altura: 4.4 };
const COZINHA: Olhar = { alvo: [-0.8, 0.9, 1.8], yaw: -0.1, pitch: 0.42, largura: 7.6, altura: 3.8 };
const PERTO = {
  // (a TV olha para o fundo, para o sofá: a câmera de cima, de dentro da sala, por cima da parede)
  tv: { alvo: [-9.0, 1.1, -0.5], yaw: Math.PI - 0.25, pitch: 0.6, largura: 2.4, altura: 2.0 },
  som: { alvo: [-4.5, 0.4, 3.4], yaw: -0.35, pitch: 0.4, largura: 1.5, altura: 1.4 },
  fogao: { alvo: [-2.5, 0.8, 3.4], yaw: 0.25, pitch: 0.45, largura: 1.7, altura: 1.8 },
  geladeira: { alvo: [-0.5, 1.0, 3.4], yaw: -0.35, pitch: 0.3, largura: 2.4, altura: 2.6 },
  mesa: { alvo: [1, 0.9, 1.5], yaw: 0.5, pitch: 0.55, largura: 3.4, altura: 2.6 },
} satisfies Record<string, Olhar>;
const vitrineOlhar = (i: number, costas = false): Olhar => ({
  alvo: [VITRINE_X0 + 1.5 * VITRINE_PASSO + 1, 0.8, VITRINE_Z0 + i * 4 + 0.5],
  yaw: costas ? 0.15 : Math.PI - 0.15,
  pitch: 0.75,
  largura: 4 * VITRINE_PASSO,
  altura: 3.4,
});

async function telas(p: Palco, sub: string, vitrine: boolean) {
  // de fora (sem o teto), de dia: a casa e os cômodos com os treze móveis
  await olhar(p, CASA);
  await foto(p, 'casa-dia', sub);
  await olhar(p, SALA);
  await foto(p, 'sala-dia', sub);
  await olhar(p, COZINHA);
  await foto(p, 'cozinha-dia', sub);
  // cada toque em sequência
  await olhar(p, PERTO.tv);
  await foto(p, 'tv-0-desligada', sub);
  for (const prog of [0, 1, 2, 3]) {
    await ligar(p, { tv: prog });
    await foto(p, `tv-${prog + 1}-desenho-${prog}`, sub, 1600);
  }
  await ligar(p, {});
  await foto(p, 'tv-5-desligou', sub);
  await olhar(p, PERTO.geladeira);
  await foto(p, 'geladeira-0-fechada', sub);
  await ligar(p, { geladeira: true });
  await foto(p, 'geladeira-1-abrindo', sub, 150);
  await foto(p, 'geladeira-2-aberta', sub, 900);
  await olhar(p, { ...PERTO.geladeira, yaw: 0.55 });
  await foto(p, 'geladeira-3-aberta-de-lado', sub);
  await ligar(p, {});
  await olhar(p, PERTO.fogao);
  await foto(p, 'fogao-0-desligado', sub);
  await ligar(p, { fogao: true });
  await foto(p, 'fogao-1-cozinhando', sub, 1200);
  await foto(p, 'fogao-2-cozinhando', sub, 700);
  await ligar(p, {});
  await olhar(p, PERTO.som);
  await foto(p, 'som-0-parado', sub);
  await ligar(p, { som: true });
  await foto(p, 'som-1-tocando', sub, 1000);
  await foto(p, 'som-2-tocando', sub, 600);
  await ligar(p, {});
  // a mesa: sentada e a comida posta
  await assento(p, { x: 0, z: 2, d: 0, px: 0.5, pz: 2.5 });
  await olhar(p, PERTO.mesa, false);
  await foto(p, 'mesa-0-sentada', sub);
  await prato(p, 'carne_assada', 2);
  await foto(p, 'mesa-1-prato', sub, 1300);
  await assento(p, null);
  // de noite, com tudo ligado
  await hora(p, NOITE);
  await luzes(p, true);
  await ligar(p, { tv: 1, som: true, fogao: true, geladeira: true });
  await olhar(p, CASA);
  await foto(p, 'casa-noite', sub, 1500);
  await olhar(p, SALA);
  await foto(p, 'sala-noite', sub);
  await olhar(p, COZINHA);
  await foto(p, 'cozinha-noite', sub);
  // a contagem com tudo ligado
  const custo = await p.page.evaluate(() => window.__brumaluz!.moveis!.contagem());
  writeFileSync(`${PASTA}/${sub}/custo-ligados.json`, JSON.stringify(custo, null, 1));
  await ligar(p, {});
  await luzes(p, false);
  await hora(p, DIA);
  // as quatro direções e as costas
  if (vitrine)
    for (let i = 0; i < VITRINE.length; i++) {
      await olhar(p, vitrineOlhar(i));
      await foto(p, `vitrine-${VITRINE[i].nome}`, sub);
      await olhar(p, vitrineOlhar(i, true));
      await foto(p, `vitrine-${VITRINE[i].nome}-costas`, sub);
    }
  // de dentro, com o teto, na primeira pessoa: de dia e de noite, com a TV e a cozinha ligadas
  await teto(p.page, p.O, true);
  await ligar(p, { tv: 2, fogao: true, geladeira: true });
  await deDentro(p, -5.6, 2.4, [-9, 1.0, -1]);
  await foto(p, 'sala-dentro-dia', sub);
  await deDentro(p, 1.5, -2.2, [-1.5, 0.8, 3]);
  await foto(p, 'cozinha-dentro-dia', sub);
  await hora(p, NOITE);
  await luzes(p, true);
  await deDentro(p, -5.6, 2.4, [-9, 1.0, -1]);
  await foto(p, 'sala-dentro-noite', sub);
  await deDentro(p, 1.5, -2.2, [-1.5, 0.8, 3]);
  await foto(p, 'cozinha-dentro-noite', sub);
  await ligar(p, {});
  await luzes(p, false);
  await hora(p, DIA);
  // os ícones na barra e o móvel na mão
  await p.page.evaluate((bs) => {
    const e = window.__brumaluz!;
    bs.forEach((b, i) => e.inventario!.definir(i, { item: `bloco:${b}`, qtd: 1 }));
    e.selecionarSlot!(3);
    for (const el of Array.from(document.body.querySelectorAll<HTMLElement>('*'))) el.style.visibility = '';
  }, [Bloco.FOGAO, Bloco.GELADEIRA, Bloco.MESA, Bloco.TV, Bloco.SOM]);
  await deDentro(p, 2.6, -2.2, [-0.5, 0.7, 2.8]);
  await foto(p, 'barra-e-mao', sub, 4000);
  await p.page.evaluate(() => window.__brumaluz!.primeiraPessoa!.ligar(false));
  await teto(p.page, p.O, false);
}

for (const tamanho of ['empe', 'deitado', 'pc'] as const)
  test(`${tamanho}: os treze móveis, os toques, de dia e de noite, de fora e de dentro`, async ({ browser }) => {
    test.skip(!QUAL.includes(tamanho), `só com FOTOS_039B_T03=${tamanho}`);
    test.setTimeout(1_800_000);
    const p = await abrirPalco(browser, tamanho);
    const sub = tamanho === 'pc' ? 'computador' : tamanho;
    const parado = await p.page.evaluate(() => window.__brumaluz!.moveis!.contagem());
    mkdirSync(`${PASTA}/${sub}`, { recursive: true });
    writeFileSync(`${PASTA}/${sub}/custo-parado.json`, JSON.stringify(parado, null, 1));
    await telas(p, sub, tamanho !== 'empe');
    await p.page.context().close();
  });

test('prancha: junta as fotos (depois das três telas)', async ({ browser }) => {
  test.skip(!QUAL.includes('prancha'), 'só com FOTOS_039B_T03=prancha');
  const img = (n: string, s = 'empe') => (existsSync(`${PASTA}/${s}/${n}.jpg`) ? `data:image/jpeg;base64,${readFileSync(`${PASTA}/${s}/${n}.jpg`, 'base64')}` : '');
  const q = (src: string, legenda: string) => (src ? `<figure><img src="${src}"><figcaption>${legenda}</figcaption></figure>` : '');
  const linha = (xs: string[]) => `<div class="linha">${xs.join('')}</div>`;
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
    body { margin: 0; background: #fbf6ec; font-family: system-ui, sans-serif; color: #3a2f4a; width: 1080px; }
    h1 { margin: 22px 26px 2px; font-size: 34px; }
    h2 { margin: 18px 26px 8px; font-size: 24px; }
    p.sub { margin: 0 26px 8px; font-size: 18px; color: #6a5d7a; }
    .linha { display: flex; gap: 10px; padding: 0 26px; margin-bottom: 8px; }
    figure { margin: 0; flex: 1; background: #fff; border-radius: 14px; padding: 5px; box-shadow: 0 2px 8px rgba(60,40,80,.12); }
    figure img { width: 100%; border-radius: 10px; display: block; }
    figcaption { font-size: 15px; color: #6a5d7a; padding: 4px 4px 1px; }
  </style></head><body>
    <h1>039b · T03: o fogão, a geladeira, a mesa, a TV e o som</h1>
    <p class="sub">A casa com os treze móveis (sem o teto, como uma casa de bonecas), cada toque em sequência, de dia e de noite.</p>
    <h2>A casa (computador)</h2>
    ${linha([q(img('casa-dia', 'computador'), 'de dia'), q(img('casa-noite', 'computador'), 'de noite, tudo ligado')])}
    <h2>A TV: cada toque passa um desenho, o quinto desliga</h2>
    ${linha([q(img('tv-0-desligada'), 'desligada'), q(img('tv-1-desenho-0'), 'a joaninha'), q(img('tv-2-desenho-1'), 'o barquinho'), q(img('tv-3-desenho-2'), 'o trenzinho'), q(img('tv-4-desenho-3'), 'as ovelhinhas')])}
    <h2>A geladeira, o fogão e o som</h2>
    ${linha([q(img('geladeira-0-fechada'), 'fechada'), q(img('geladeira-1-abrindo'), 'abrindo'), q(img('geladeira-2-aberta'), 'aberta'), q(img('fogao-0-desligado'), 'o fogão'), q(img('fogao-1-cozinhando'), 'cozinhando')])}
    ${linha([q(img('som-0-parado'), 'o som parado'), q(img('som-1-tocando'), 'tocando'), q(img('mesa-0-sentada'), 'à mesa'), q(img('mesa-1-prato'), 'a comida posta')])}
    <h2>De fora e de dentro</h2>
    ${linha([q(img('sala-dia'), 'sala'), q(img('cozinha-dia'), 'cozinha'), q(img('sala-noite'), 'sala de noite'), q(img('cozinha-noite'), 'cozinha de noite')])}
    ${linha([q(img('sala-dentro-dia'), 'sala, de dentro'), q(img('cozinha-dentro-dia'), 'cozinha, de dentro'), q(img('sala-dentro-noite'), 'sala de noite'), q(img('cozinha-dentro-noite'), 'cozinha de noite')])}
    <h2>As quatro direções e as costas (computador)</h2>
    ${linha([q(img('vitrine-fogao', 'computador'), 'fogão'), q(img('vitrine-geladeira', 'computador'), 'geladeira'), q(img('vitrine-mesa', 'computador'), 'mesa')])}
    ${linha([q(img('vitrine-tv', 'computador'), 'TV'), q(img('vitrine-som', 'computador'), 'som'), q(img('vitrine-tv-costas', 'computador'), 'TV de costas')])}
    <h2>Os ícones e a mão</h2>
    ${linha([q(img('barra-e-mao'), 'na barra, a TV na mão'), q(img('barra-e-mao', 'deitado'), 'deitado')])}
    <div style="height:16px"></div>
  </body></html>`;
  const p2 = await browser.newPage({ viewport: { width: 1080, height: 800 } });
  await p2.setContent(html, { waitUntil: 'load' });
  await p2.screenshot({ path: `${PASTA}/00-prancha.jpg`, type: 'jpeg', quality: 80, fullPage: true });
  console.log(`FOTO 00-prancha (${await p2.evaluate(() => document.body.scrollHeight)} px)`);
  await p2.close();
});
