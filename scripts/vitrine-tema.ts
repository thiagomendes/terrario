/**
 * Vitrine de um tema, sem abrir o jogo: gera PNGs para o autor do tema conferir.
 *
 *   npx vite-node scripts/vitrine-tema.ts <id-do-tema> <pasta-de-saida>
 *
 * Saída: tiles.png (todos os tiles, ampliados, na ordem de tiles.txt), blocos.png (cada
 * bloco em cubo isométrico com as texturas reais), criaturas.png (as 5 criaturas),
 * ceu.png (cores do céu hora a hora), mapa.png (vista de cima de 384x384 blocos) e
 * chunks.png (pedaços do mundo em 3D isométrico: árvores de cada bioma e a estrutura).
 */
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import '../src/temas/todos';
import { obterTema, temaExiste } from '../src/temas';
import { ativarTemaPuro } from '../src/temas/ativarPuro';
import { gerarAtlas, TAM_TILE, CELULA, PADDING } from '../src/art/atlas';
import { NOMES_TILES } from '../src/art/tiles';
import { REGISTRO_BLOCOS, Bloco } from '../src/world/blocks';
import { atmosferaNaHora } from '../src/render/atmosfera';
import {
  gerarChunk,
  indice,
  ALTURA,
  TAM_X,
  TAM_Z,
  alturaTerreno,
  biomaEm,
  NOMES_BIOMA,
  type Bioma,
} from '../src/world/chunk';
import { hash2 } from '../src/world/noise';
import type { TipoCriatura } from '../src/jogo/criaturas';

const [idTema, saida = 'vitrine'] = process.argv.slice(2);
if (!idTema || !temaExiste(idTema)) {
  console.error('uso: vite-node scripts/vitrine-tema.ts <id-do-tema> <pasta>');
  process.exit(1);
}
const tema = obterTema(idTema);
ativarTemaPuro(tema);
mkdirSync(saida, { recursive: true });

// --- imagem e PNG ------------------------------------------------------------
interface Img {
  w: number;
  h: number;
  px: Uint8ClampedArray;
}
function novaImg(w: number, h: number, fundo: [number, number, number] = [24, 22, 30]): Img {
  const px = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    px[i * 4] = fundo[0];
    px[i * 4 + 1] = fundo[1];
    px[i * 4 + 2] = fundo[2];
    px[i * 4 + 3] = 255;
  }
  return { w, h, px };
}
function ponto(img: Img, x: number, y: number, c: readonly number[]): void {
  x = Math.floor(x);
  y = Math.floor(y);
  if (x < 0 || y < 0 || x >= img.w || y >= img.h) return;
  const a = (c[3] ?? 255) / 255;
  if (a <= 0) return;
  const i = (y * img.w + x) * 4;
  img.px[i] = img.px[i] * (1 - a) + c[0] * a;
  img.px[i + 1] = img.px[i + 1] * (1 - a) + c[1] * a;
  img.px[i + 2] = img.px[i + 2] * (1 - a) + c[2] * a;
}
function retangulo(img: Img, x: number, y: number, w: number, h: number, c: readonly number[]) {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) ponto(img, x + i, y + j, c);
}
/** Preenche um polígono convexo (pontos em ordem). */
function poligono(img: Img, pts: [number, number][], c: readonly number[]): void {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const [x, y] of pts) {
    x0 = Math.min(x0, x);
    y0 = Math.min(y0, y);
    x1 = Math.max(x1, x);
    y1 = Math.max(y1, y);
  }
  for (let y = Math.floor(y0); y <= Math.ceil(y1); y++)
    for (let x = Math.floor(x0); x <= Math.ceil(x1); x++) {
      const px = x + 0.5;
      const py = y + 0.5;
      let dentro = true;
      let sinal = 0;
      for (let k = 0; k < pts.length; k++) {
        const [ax, ay] = pts[k];
        const [bx, by] = pts[(k + 1) % pts.length];
        const cr = (bx - ax) * (py - ay) - (by - ay) * (px - ax);
        if (Math.abs(cr) < 1e-9) continue;
        const s = Math.sign(cr);
        if (sinal === 0) sinal = s;
        else if (s !== sinal) {
          dentro = false;
          break;
        }
      }
      if (dentro) ponto(img, x, y, c);
    }
}
const TABELA_CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc(b: Uint8Array): number {
  let c = 0xffffffff;
  for (const v of b) c = TABELA_CRC[(c ^ v) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function salvarPng(img: Img, nome: string): void {
  const linhas = new Uint8Array(img.h * (img.w * 4 + 1));
  for (let y = 0; y < img.h; y++) {
    linhas[y * (img.w * 4 + 1)] = 0;
    linhas.set(img.px.subarray(y * img.w * 4, (y + 1) * img.w * 4), y * (img.w * 4 + 1) + 1);
  }
  const pedaco = (tipo: string, dados: Uint8Array) => {
    const b = new Uint8Array(12 + dados.length);
    const v = new DataView(b.buffer);
    v.setUint32(0, dados.length);
    for (let i = 0; i < 4; i++) b[4 + i] = tipo.charCodeAt(i);
    b.set(dados, 8);
    v.setUint32(8 + dados.length, crc(b.subarray(4, 8 + dados.length)));
    return b;
  };
  const ihdr = new Uint8Array(13);
  const v = new DataView(ihdr.buffer);
  v.setUint32(0, img.w);
  v.setUint32(4, img.h);
  ihdr.set([8, 6, 0, 0, 0], 8);
  const partes = [
    new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
    pedaco('IHDR', ihdr),
    pedaco('IDAT', new Uint8Array(deflateSync(linhas))),
    pedaco('IEND', new Uint8Array()),
  ];
  const total = new Uint8Array(partes.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of partes) {
    total.set(p, o);
    o += p.length;
  }
  writeFileSync(join(saida, nome), total);
  console.log('gravado', join(saida, nome));
}

// --- atlas e tiles -----------------------------------------------------------
const atlas = gerarAtlas(1337);
function texel(nome: string, u: number, v: number): [number, number, number, number] {
  const i = NOMES_TILES.indexOf(nome);
  const porLinha = Math.floor(atlas.largura / CELULA);
  const ox = (i % porLinha) * CELULA + PADDING;
  const oy = Math.floor(i / porLinha) * CELULA + PADDING;
  const k = ((oy + v) * atlas.largura + ox + u) * 4;
  return [atlas.pixels[k], atlas.pixels[k + 1], atlas.pixels[k + 2], atlas.pixels[k + 3]];
}
function corMedia(nome: string): [number, number, number] {
  let r = 0;
  let g = 0;
  let b = 0;
  let n = 0;
  for (let v = 0; v < TAM_TILE; v++)
    for (let u = 0; u < TAM_TILE; u++) {
      const p = texel(nome, u, v);
      if (p[3] < 128) continue;
      r += p[0];
      g += p[1];
      b += p[2];
      n++;
    }
  return n ? [r / n, g / n, b / n] : [255, 0, 255];
}

{
  const esc = 4;
  const col = 12;
  const lado = TAM_TILE * esc + 6;
  const img = novaImg(col * lado + 6, Math.ceil(NOMES_TILES.length / col) * lado + 6);
  const lista: string[] = [];
  NOMES_TILES.forEach((nome, i) => {
    const x0 = 6 + (i % col) * lado;
    const y0 = 6 + Math.floor(i / col) * lado;
    // xadrez atrás (para ver a transparência)
    for (let v = 0; v < TAM_TILE * esc; v++)
      for (let u = 0; u < TAM_TILE * esc; u++)
        ponto(img, x0 + u, y0 + v, ((u >> 3) + (v >> 3)) % 2 ? [70, 70, 80] : [50, 50, 60]);
    for (let v = 0; v < TAM_TILE; v++)
      for (let u = 0; u < TAM_TILE; u++)
        retangulo(img, x0 + u * esc, y0 + v * esc, esc, esc, texel(nome, u, v));
    const repintado = tema.pintores[nome] ? '' : '  (base)';
    lista.push(
      `${String(i).padStart(3)} linha ${Math.floor(i / col) + 1} col ${(i % col) + 1}: ${nome}${repintado}`,
    );
  });
  salvarPng(img, 'tiles.png');
  writeFileSync(join(saida, 'tiles.txt'), lista.join('\n') + '\n');
}

// --- projeção isométrica -------------------------------------------------------
type V3 = [number, number, number];
function iso(p: V3, w: number, cx: number, cy: number): [number, number] {
  return [cx + (p[0] - p[2]) * w * 0.5, cy + (p[0] + p[2]) * w * 0.25 - p[1] * w * 0.5];
}
const SOMBRA = { topo: 1, x: 0.72, z: 0.86 };

/** Face texturizada (topo, +x ou +z) de um cubo unitário em (bx, by, bz). */
function faceTexturizada(
  img: Img,
  tile: string,
  face: 'topo' | 'x' | 'z',
  b: V3,
  w: number,
  cx: number,
  cy: number,
): void {
  const n = TAM_TILE;
  for (let v = 0; v < n; v++)
    for (let u = 0; u < n; u++) {
      const t = texel(tile, u, v);
      if (t[3] < 128) continue;
      const a = u / n;
      const a2 = (u + 1) / n;
      const c = v / n;
      const c2 = (v + 1) / n;
      let cantos: V3[];
      if (face === 'topo')
        cantos = [
          [b[0] + a, b[1] + 1, b[2] + c],
          [b[0] + a2, b[1] + 1, b[2] + c],
          [b[0] + a2, b[1] + 1, b[2] + c2],
          [b[0] + a, b[1] + 1, b[2] + c2],
        ];
      else if (face === 'x')
        cantos = [
          [b[0] + 1, b[1] + 1 - c, b[2] + 1 - a],
          [b[0] + 1, b[1] + 1 - c, b[2] + 1 - a2],
          [b[0] + 1, b[1] + 1 - c2, b[2] + 1 - a2],
          [b[0] + 1, b[1] + 1 - c2, b[2] + 1 - a],
        ];
      else
        cantos = [
          [b[0] + a, b[1] + 1 - c, b[2] + 1],
          [b[0] + a2, b[1] + 1 - c, b[2] + 1],
          [b[0] + a2, b[1] + 1 - c2, b[2] + 1],
          [b[0] + a, b[1] + 1 - c2, b[2] + 1],
        ];
      const k = SOMBRA[face];
      poligono(
        img,
        cantos.map((p) => iso(p, w, cx, cy)),
        [t[0] * k, t[1] * k, t[2] * k, 255],
      );
    }
}

function tilesDoBloco(id: number) {
  const b = REGISTRO_BLOCOS[id];
  return b.tiles;
}

{
  const blocos = REGISTRO_BLOCOS.filter((b) => b.id !== Bloco.AR && b.tiles.lado !== 'vazio');
  const w = 64;
  const col = 10;
  const passoX = 96;
  const passoY = 100;
  const img = novaImg(col * passoX + 20, Math.ceil(blocos.length / col) * passoY + 20);
  const lista: string[] = [];
  blocos.forEach((b, i) => {
    const cx = 20 + (i % col) * passoX + 38;
    const cy = 20 + Math.floor(i / col) * passoY + 30;
    const t = tilesDoBloco(b.id);
    faceTexturizada(img, t.topo, 'topo', [0, 0, 0], w * 0.7, cx, cy);
    faceTexturizada(img, t.lado, 'x', [0, 0, 0], w * 0.7, cx, cy);
    faceTexturizada(img, t.frente ?? t.lado, 'z', [0, 0, 0], w * 0.7, cx, cy);
    lista.push(
      `${String(i).padStart(3)} linha ${Math.floor(i / col) + 1} col ${(i % col) + 1}: [${b.id}] ${b.nome}`,
    );
  });
  salvarPng(img, 'blocos.png');
  writeFileSync(join(saida, 'blocos.txt'), lista.join('\n') + '\n');
}

// --- criaturas -----------------------------------------------------------------
function hexCor(c: string): [number, number, number] {
  const n = parseInt(c.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
{
  const tipos = Object.keys(tema.criaturas) as TipoCriatura[];
  const w = 150;
  const img = novaImg(tipos.length * 300, 360, [120, 150, 190]);
  tipos.forEach((tipo, i) => {
    const cx = 150 + i * 300;
    const cy = 300;
    // sombra no chão
    poligono(
      img,
      [
        iso([-0.6, 0, -0.6], w, cx, cy),
        iso([0.6, 0, -0.6], w, cx, cy),
        iso([0.6, 0, 0.6], w, cx, cy),
        iso([-0.6, 0, 0.6], w, cx, cy),
      ],
      [90, 120, 150, 255],
    );
    const pecas = [...tema.criaturas[tipo]].sort(
      (a, b) => a.p[0] + a.p[2] - (b.p[0] + b.p[2]) || a.p[1] - b.p[1],
    );
    for (const p of pecas) {
      const [sx, sy, sz] = p.t;
      const b: V3 = [p.p[0] - sx / 2, p.p[1] - sy / 2, p.p[2] - sz / 2];
      const base = hexCor(p.cor);
      const alfa = Math.round((p.alfa ?? 1) * 255);
      const brilho = p.brilho ?? 0;
      const tinta = (k: number) => [
        Math.min(255, base[0] * (k + brilho * 0.5)),
        Math.min(255, base[1] * (k + brilho * 0.5)),
        Math.min(255, base[2] * (k + brilho * 0.5)),
        alfa,
      ];
      const P = (x: number, y: number, z: number) =>
        iso([b[0] + x * sx, b[1] + y * sy, b[2] + z * sz], w, cx, cy);
      poligono(img, [P(0, 1, 0), P(1, 1, 0), P(1, 1, 1), P(0, 1, 1)], tinta(1));
      poligono(img, [P(1, 1, 0), P(1, 1, 1), P(1, 0, 1), P(1, 0, 0)], tinta(0.72));
      poligono(img, [P(0, 1, 1), P(1, 1, 1), P(1, 0, 1), P(0, 0, 1)], tinta(0.86));
    }
  });
  salvarPng(img, 'criaturas.png');
  writeFileSync(
    join(saida, 'criaturas.txt'),
    tipos.map((t, i) => `${i + 1}: ${t} = ${tema.textos.criaturas[t]}`).join('\n') +
      '\n(vista de 3/4: frente da criatura para baixo-direita)\n',
  );
}

// --- céu -----------------------------------------------------------------------
{
  const horas = 48;
  const img = novaImg(horas * 20, 200);
  for (let i = 0; i < horas; i++) {
    const a = atmosferaNaHora(i / horas);
    const faixas: [readonly number[], number][] = [
      [a.ceuZenite, 50],
      [a.ceuMeio, 40],
      [a.ceuHorizonte, 40],
      [a.nevoa, 20],
      [a.luz.map((v) => v * Math.min(1, a.intensidadeLuz)), 25],
      [a.ambiente, 25],
    ];
    let y = 0;
    for (const [c, h] of faixas) {
      retangulo(img, i * 20, y, 20, h, [
        Math.min(255, c[0] * 255),
        Math.min(255, c[1] * 255),
        Math.min(255, c[2] * 255),
        255,
      ]);
      y += h;
    }
  }
  salvarPng(img, 'ceu.png');
  writeFileSync(
    join(saida, 'ceu.txt'),
    'colunas: 48 meias horas a partir da meia-noite (0h à esquerda, meio-dia no meio)\n' +
      'faixas de cima para baixo: zênite, meio, horizonte, névoa, luz do sol/lua (x intensidade), ambiente\n' +
      'astros (sol, lua, planeta, estrelas de dia) não aparecem aqui: só no jogo\n',
  );
}

// --- mundo ---------------------------------------------------------------------
const SEMENTE = 1337;
const cacheChunks = new Map<string, Uint8Array>();
function chunk(cx: number, cz: number): Uint8Array {
  const k = `${cx},${cz}`;
  let c = cacheChunks.get(k);
  if (!c) {
    c = gerarChunk(cx, cz, SEMENTE);
    cacheChunks.set(k, c);
  }
  return c;
}
function blocoEm(x: number, y: number, z: number): number {
  if (y < 0 || y >= ALTURA) return Bloco.AR;
  const cx = Math.floor(x / TAM_X);
  const cz = Math.floor(z / TAM_Z);
  return chunk(cx, cz)[indice(x - cx * TAM_X, y, z - cz * TAM_Z)];
}
const corTopo = new Map<number, [number, number, number]>();
const corLado = new Map<number, [number, number, number]>();
function cores(id: number) {
  if (!corTopo.has(id)) {
    const t = tilesDoBloco(id);
    corTopo.set(id, corMedia(t.topo));
    corLado.set(id, corMedia(t.lado));
  }
  return { topo: corTopo.get(id)!, lado: corLado.get(id)! };
}
const transparente = (id: number) => {
  const b = REGISTRO_BLOCOS[id];
  return !b || id === Bloco.AR || b.planta || (b.forma !== undefined && b.forma !== 'cubo');
};

{
  // vista de cima: cor do topo do bloco mais alto, sombreada pela altura
  const N = 384;
  const img = novaImg(N, N);
  for (let z = 0; z < N; z++)
    for (let x = 0; x < N; x++) {
      const wx = x - N / 2;
      const wz = z - N / 2;
      for (let y = ALTURA - 1; y > 0; y--) {
        const id = blocoEm(wx, y, wz);
        if (id === Bloco.AR) continue;
        const c = id === Bloco.AGUA ? [40, 90, 170] : cores(id).topo;
        const k = 0.6 + (y - 50) / 80;
        ponto(img, x, z, [c[0] * k, c[1] * k, c[2] * k, 255]);
        break;
      }
    }
  salvarPng(img, 'mapa.png');
}

/** Encontra chunks interessantes: um por bioma com árvore e um com a estrutura. */
function procurarChunks(): { cx: number; cz: number; rotulo: string }[] {
  const achados: { cx: number; cz: number; rotulo: string }[] = [];
  const vistos = new Set<Bioma>();
  let estrutura = false;
  for (let r = 0; r < 60 && (vistos.size < 7 || !estrutura); r++)
    for (let cz = -r; cz <= r; cz++)
      for (let cx = -r; cx <= r; cx++) {
        if (Math.max(Math.abs(cx), Math.abs(cz)) !== r) continue;
        const wx = cx * TAM_X + 8;
        const wz = cz * TAM_Z + 8;
        const b = biomaEm(wx, wz, SEMENTE, alturaTerreno(wx, wz, SEMENTE));
        if (!estrutura && hash2(cx, cz, SEMENTE + 6060) <= 0.035) {
          const c = chunk(cx, cz);
          let bau = false;
          for (let i = 0; i < c.length && !bau; i++) bau = c[i] === Bloco.BAU;
          if (bau) {
            estrutura = true;
            achados.push({ cx, cz, rotulo: `estrutura (${NOMES_BIOMA[b]})` });
            continue;
          }
        }
        if (vistos.has(b) || b === 'oceano') continue;
        vistos.add(b);
        achados.push({ cx, cz, rotulo: NOMES_BIOMA[b] });
      }
  return achados;
}

{
  const lista = procurarChunks();
  const w = 14;
  const larg = 32 * w + 40;
  const alt = 520;
  const col = 4;
  const img = novaImg(col * larg, Math.ceil(lista.length / col) * alt, [110, 140, 180]);
  const rotulos: string[] = [];
  lista.forEach(({ cx, cz, rotulo }, i) => {
    const ox = (i % col) * larg + larg / 2;
    const oy = Math.floor(i / col) * alt + 120;
    const x0 = cx * TAM_X;
    const z0 = cz * TAM_Z;
    let topoMax = 0;
    for (let z = 0; z < 16; z++)
      for (let x = 0; x < 16; x++)
        for (let y = ALTURA - 1; y > 0; y--)
          if (blocoEm(x0 + x, y, z0 + z) !== Bloco.AR) {
            topoMax = Math.max(topoMax, y);
            break;
          }
    const yMin = Math.max(1, topoMax - 22);
    for (let s = 0; s < 32; s++)
      for (let y = yMin; y <= topoMax + 1; y++)
        for (let x = 0; x < 16; x++) {
          const z = s - x;
          if (z < 0 || z >= 16) continue;
          const id = blocoEm(x0 + x, y, z0 + z);
          if (id === Bloco.AR) continue;
          const c = cores(id);
          const P = (a: number, b: number, d: number): [number, number] =>
            iso([x + a, y - yMin + b, z + d], w, ox, oy + 200);
          const alfa = id === Bloco.AGUA ? 170 : 255;
          const planta = transparente(id);
          if (planta) {
            // planta: cruz simples
            const t = c.lado;
            poligono(
              img,
              [P(0.15, 0.85, 0.15), P(0.85, 0.85, 0.85), P(0.85, 0, 0.85), P(0.15, 0, 0.15)],
              [...t, 255],
            );
            poligono(
              img,
              [P(0.85, 0.85, 0.15), P(0.15, 0.85, 0.85), P(0.15, 0, 0.85), P(0.85, 0, 0.15)],
              [t[0] * 0.8, t[1] * 0.8, t[2] * 0.8, 255],
            );
            continue;
          }
          const vis = (dx: number, dy: number, dz: number) => {
            const v = blocoEm(x0 + x + dx, y + dy, z0 + z + dz);
            return (
              transparente(v) ||
              (v === Bloco.AGUA && id !== Bloco.AGUA) ||
              x + dx > 15 ||
              z + dz > 15
            );
          };
          const sombra = (k: number, base: number[]) => [
            base[0] * k,
            base[1] * k,
            base[2] * k,
            alfa,
          ];
          const corAgua = [50, 110, 190];
          const ct = id === Bloco.AGUA ? corAgua : c.topo;
          const cl = id === Bloco.AGUA ? corAgua : c.lado;
          if (vis(0, 1, 0))
            poligono(img, [P(0, 1, 0), P(1, 1, 0), P(1, 1, 1), P(0, 1, 1)], sombra(1, ct));
          if (vis(1, 0, 0))
            poligono(img, [P(1, 1, 0), P(1, 1, 1), P(1, 0, 1), P(1, 0, 0)], sombra(0.72, cl));
          if (vis(0, 0, 1))
            poligono(img, [P(0, 1, 1), P(1, 1, 1), P(1, 0, 1), P(0, 0, 1)], sombra(0.86, cl));
        }
    rotulos.push(
      `${i + 1} (linha ${Math.floor(i / col) + 1}, col ${(i % col) + 1}): chunk ${cx},${cz} — ${rotulo}`,
    );
  });
  salvarPng(img, 'chunks.png');
  writeFileSync(join(saida, 'chunks.txt'), rotulos.join('\n') + '\n');
}

console.log(`vitrine de ${tema.nome} pronta em ${saida}`);
