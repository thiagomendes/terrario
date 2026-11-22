import { expect, test, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { abrirMundo, assentar } from './guia-palco';

/**
 * Spec 027 (T21): o som da Noite das Fantasias na saída do jogo, gravado com o volume padrão
 * (`gravarSom`, a saída final do motor, com a trilha gravada tocando por baixo):
 *
 * - **a régua:** nenhum som acima de -12 LUFS momentâneo (BS.1770: filtro K, janela de 400 ms a
 *   cada 100 ms, as duas caixas somadas), a 2 blocos da fonte de cada som da festa, no
 *   entardecer (a trilha mais alta), e no meio da praça só com a música, no entardecer e de noite
 *   (a parte 1 não tem a banda; ela vem com a parte 2);
 * - **a trilha gravada da festa** toca (a fase "tocando", o pacote do tema) e cada som da festa é
 *   o gravado (`festa:<som>`), não a reserva;
 * - **o ambiente por lugar:** o lugar troca quando a criança anda da praça para o bosque, e o som
 *   solto que toca é o do lugar novo.
 *
 * As gravações (WAV) e as medidas ficam em `capturas-027/parte1/som/` (para ouvir).
 */
test.setTimeout(600_000);
const PASTA = 'capturas-027/parte1/som';
const SONS = ['campainha', 'lanterna', 'risadinha', 'confete', 'miau', 'ronrono', 'abraco', 'varinha', 'abobora'] as const;

/** LUFS momentâneo máximo de um estéreo (BS.1770-4, o filtro K com as duas seções). */
function lufsMomentaneoMax(l: Float64Array, r: Float64Array, fs: number): number {
  const biquad = (x: Float64Array, b: number[], a: number[]) => {
    const y = new Float64Array(x.length);
    let x1 = 0,
      x2 = 0,
      y1 = 0,
      y2 = 0;
    for (let i = 0; i < x.length; i++) {
      const v = (b[0] * x[i] + b[1] * x1 + b[2] * x2 - a[1] * y1 - a[2] * y2) / a[0];
      x2 = x1;
      x1 = x[i];
      y2 = y1;
      y1 = v;
      y[i] = v;
    }
    return y;
  };
  const kw = (x: Float64Array) => {
    const G = 3.99984385397;
    const Q = 0.7071752369554193;
    const fc = 1681.9744509555319;
    const A = 10 ** (G / 40);
    let w0 = (2 * Math.PI * fc) / fs;
    let al = Math.sin(w0) / (2 * Q);
    let c = Math.cos(w0);
    const y = biquad(
      x,
      [A * (A + 1 + (A - 1) * c + 2 * Math.sqrt(A) * al), -2 * A * (A - 1 + (A + 1) * c), A * (A + 1 + (A - 1) * c - 2 * Math.sqrt(A) * al)],
      [A + 1 - (A - 1) * c + 2 * Math.sqrt(A) * al, 2 * (A - 1 - (A + 1) * c), A + 1 - (A - 1) * c - 2 * Math.sqrt(A) * al],
    );
    w0 = (2 * Math.PI * 38.13547087613982) / fs;
    al = Math.sin(w0) / (2 * 0.5003270373253953);
    c = Math.cos(w0);
    return biquad(y, [(1 + c) / 2, -(1 + c), (1 + c) / 2], [1 + al, -2 * c, 1 - al]);
  };
  const kl = kw(l);
  const kr = kw(r);
  const blk = Math.round(0.4 * fs);
  const passo = Math.round(0.1 * fs);
  let max = -Infinity;
  for (let i = 0; i + blk <= kl.length; i += passo) {
    let s = 0;
    for (let k = i; k < i + blk; k++) s += kl[k] * kl[k] + kr[k] * kr[k];
    max = Math.max(max, -0.691 + 10 * Math.log10(s / blk + 1e-20));
  }
  return max;
}

interface Gravado {
  taxa: number;
  l: string;
  r: string;
}
function canais(g: Gravado): { l: Float64Array; r: Float64Array } {
  const ler = (b64: string) => {
    const b = Buffer.from(b64, 'base64');
    const x = new Float64Array(b.length / 2);
    for (let i = 0; i < x.length; i++) x[i] = b.readInt16LE(i * 2) / 32768;
    return x;
  };
  return { l: ler(g.l), r: ler(g.r) };
}
function salvarWav(g: Gravado, caminho: string): void {
  const l = Buffer.from(g.l, 'base64');
  const r = Buffer.from(g.r, 'base64');
  const n = Math.min(l.length, r.length) / 2;
  const b = Buffer.alloc(44 + n * 4);
  b.write('RIFF', 0);
  b.writeUInt32LE(36 + n * 4, 4);
  b.write('WAVE', 8);
  b.write('fmt ', 12);
  b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20);
  b.writeUInt16LE(2, 22);
  b.writeUInt32LE(g.taxa, 24);
  b.writeUInt32LE(g.taxa * 4, 28);
  b.writeUInt16LE(4, 32);
  b.writeUInt16LE(16, 34);
  b.write('data', 36);
  b.writeUInt32LE(n * 4, 40);
  for (let k = 0; k < n; k++) {
    b.writeInt16LE(l.readInt16LE(k * 2), 44 + k * 4);
    b.writeInt16LE(r.readInt16LE(k * 2), 46 + k * 4);
  }
  writeFileSync(caminho, b as unknown as string);
}

async function ligarSom(page: Page): Promise<void> {
  await page.evaluate(() => document.dispatchEvent(new Event('keydown')));
  await expect.poll(() => page.evaluate(() => window.__brumaluz!.audio!.estado), { timeout: 15_000 }).toBe('ativo');
  await expect
    .poll(() => page.evaluate(() => window.__brumaluz!.vozesGravadas?.().pronto ?? false), { timeout: 60_000 })
    .toBe(true);
  await expect
    .poll(() => page.evaluate(() => window.__brumaluz!.trilha?.info().fase), { timeout: 60_000 })
    .toBe('tocando');
}

const ir = (page: Page, x: number, z: number, yaw = 0) =>
  page.evaluate(
    ({ x, z, yaw }) => {
      const e = window.__brumaluz!;
      e.voar?.(false);
      e.teleportar!(x, z, e.baile!()!.h + 1.2);
      e.apontar!(yaw, 0.1);
    },
    { x, z, yaw },
  );

test('T21: a trilha e os sons da festa na saída do jogo, a régua de -12 LUFS e o ambiente por lugar', async ({ browser }) => {
  mkdirSync(PASTA, { recursive: true });
  const page = await abrirMundo(browser, { id: 'som-027', tema: 'noite-das-fantasias', tamanho: 'pc' });
  await assentar(page);
  await ligarSom(page);
  const plano = await page.evaluate(() => {
    const b = window.__brumaluz!.baile!()!;
    return { nasce: b.nascimento, zonas: b.zonas, trilha: b.pontos.trilha };
  });
  const medidas: Record<string, number> = {};
  const gravar = async (nome: string, segundos: number, depois?: () => Promise<unknown>) => {
    const p = page.evaluate((s) => window.__brumaluz!.gravarSom!(s), segundos);
    await page.waitForTimeout(150);
    if (depois) await depois();
    const g = (await p) as Gravado | null;
    expect(g, nome).not.toBeNull();
    salvarWav(g!, `${PASTA}/${nome}.wav`);
    const { l, r } = canais(g!);
    medidas[nome] = Math.round(lufsMomentaneoMax(l, r, g!.taxa) * 10) / 10;
    console.log(`LUFS ${nome} ${medidas[nome]}`);
    return medidas[nome];
  };

  // ------------------------------------------------ a trilha no meio da praça (entardecer e noite)
  const hora = (h: number) =>
    page.evaluate((h) => {
      const e = window.__brumaluz!;
      e.pausarDia = true;
      e.hora = h;
    }, h);
  await ir(page, plano.nasce.x, plano.nasce.z, plano.nasce.olhar);
  for (const [h, nome] of [
    [0.62, 'entardecer'],
    [0.86, 'noite'],
  ] as const) {
    await hora(h);
    // (a troca de contexto espera o compasso e sobe em 1 compasso: uns 6 s)
    await page.waitForTimeout(7000);
    const info = await page.evaluate(() => window.__brumaluz!.trilha!.info());
    expect(info.tema).toBe('noite-das-fantasias');
    expect(info.gravada).toBe(true);
    await gravar(`praca-${nome}`, 12);
  }

  // ------------------------------------------------ cada som da festa a 2 blocos (com a trilha do entardecer)
  await hora(0.62);
  await page.waitForTimeout(7000);
  for (const som of SONS) {
    await ir(page, plano.nasce.x, plano.nasce.z, plano.nasce.olhar);
    await page.waitForTimeout(400);
    const antes = (await page.evaluate(() => window.__brumaluz!.sonsTocados!())).length;
    await gravar(`festa-${som}`, 3.2, () =>
      page.evaluate(
        ({ som, x, z }) => window.__brumaluz!.tocarFesta!(som, { x: x + 2, z }),
        { som, x: plano.nasce.x, z: plano.nasce.z },
      ),
    );
    const tocados = (await page.evaluate(() => window.__brumaluz!.sonsTocados!())).slice(antes);
    expect(tocados, som).toContain(`festa:${som}`);
  }

  // ------------------------------------------------ o ambiente por lugar: da praça para o bosque, de noite
  await hora(0.86);
  await ir(page, plano.nasce.x, plano.nasce.z, plano.nasce.olhar);
  await page.waitForTimeout(2500);
  expect(await page.evaluate(() => window.__brumaluz!.somBaile!()!.lugar)).toBe('praca');
  const b = plano.zonas.bosque;
  const [bx, bz] = plano.trilha[Math.floor(plano.trilha.length / 2)];
  expect(bx >= b.x0 && bx <= b.x1 && bz >= b.z0 && bz <= b.z1, 'o meio do caminho do bosque fica no bosque').toBe(true);
  await ir(page, bx, bz);
  // (na cruzada de ~1,5 s, o som solto ainda pode vir da praça, baixinho: conta depois dela)
  await page.waitForTimeout(2000);
  const antes = (await page.evaluate(() => window.__brumaluz!.sonsTocados!())).length;
  await gravar('bosque-noite', 20);
  const info = await page.evaluate(() => window.__brumaluz!.somBaile!()!);
  expect(info.lugar).toBe('bosque');
  expect(info.pesos.bosque).toBe(1);
  expect(info.pesos.praca).toBe(0);
  const soltos = (await page.evaluate(() => window.__brumaluz!.sonsTocados!()))
    .slice(antes)
    .filter((s) => s.startsWith('ambiente:'));
  console.log(`SONS bosque ${(await page.evaluate(() => window.__brumaluz!.sonsTocados!())).slice(antes).join(' ')}`);
  expect(soltos.length).toBeGreaterThan(0);
  expect(soltos.every((s) => s.startsWith('ambiente:bosque:'))).toBe(true);

  writeFileSync(`${PASTA}/medidas-lufs.json`, JSON.stringify(medidas, null, 1));
  // a régua: nenhum som acima de -12 LUFS momentâneo na saída do jogo
  for (const [nome, m] of Object.entries(medidas)) expect(m, nome).toBeLessThanOrEqual(-12);
  await page.context().close();
});
