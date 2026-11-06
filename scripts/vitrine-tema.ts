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
import { mkdirSync, writeFileSync } from 'node:fs';
import { novaImg, ponto, retangulo, poligono, salvarPngEm, iso, type Img, type V3 } from './iso';
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
  TERRENO_NATURAL,
} from '../src/world/chunk';
import { planoDaRegiao, PROFISSOES } from '../src/world/povoado';
import type { PecaCriatura } from '../src/temas/tipos';
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
function desenharModelos(modelos: PecaCriatura[][], nome: string): void {
  const w = 150;
  const img = novaImg(modelos.length * 300, 420, [120, 150, 190]);
  modelos.forEach((pecasModelo, i) => {
    const cx = 150 + i * 300;
    const cy = 360;
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
    for (const p of pecasModelo) {
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
      const prof = (x: number, y: number, z: number) =>
        b[0] + x * sx + (b[2] + z * sz) + (b[1] + y * sy) * 0.8;
      poligono(img, [P(0, 1, 0), P(1, 1, 0), P(1, 1, 1), P(0, 1, 1)], tinta(1), prof(0.5, 1, 0.5));
      poligono(
        img,
        [P(1, 1, 0), P(1, 1, 1), P(1, 0, 1), P(1, 0, 0)],
        tinta(0.72),
        prof(1, 0.5, 0.5),
      );
      poligono(
        img,
        [P(0, 1, 1), P(1, 1, 1), P(1, 0, 1), P(0, 0, 1)],
        tinta(0.86),
        prof(0.5, 0.5, 1),
      );
    }
  });
  salvarPng(img, nome);
}
{
  const tipos = Object.keys(tema.criaturas) as TipoCriatura[];
  desenharModelos(
    tipos.map((t) => tema.criaturas[t]),
    'criaturas.png',
  );
  writeFileSync(
    join(saida, 'criaturas.txt'),
    tipos.map((t, i) => `${i + 1}: ${t} = ${tema.textos.criaturas[t]}`).join('\n') +
      '\n(vista de 3/4: frente da criatura para baixo-direita)\n',
  );
  const pv = tema.povoado;
  if (pv) {
    desenharModelos(
      PROFISSOES.map((p) => pv.moradores[p]),
      'moradores.png',
    );
    writeFileSync(
      join(saida, 'moradores.txt'),
      PROFISSOES.map((p, i) => `${i + 1}: ${p} = ${pv.profissoes[p]}`).join('\n') +
        `\npovoado: ${pv.nome}\n`,
    );
  }
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
        const c = id === Bloco.AGUA ? tema.agua.fundoDia.map((v) => v * 255 + 40) : cores(id).topo;
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
          const corAgua = tema.agua.fundoDia.map((v) => v * 255 + 40);
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

// --- povoado ---------------------------------------------------------------------
{
  let plano: ReturnType<typeof planoDaRegiao> = null;
  for (let r = 0; r < 6 && !plano; r++)
    for (let rz = -r; rz <= r && !plano; rz++)
      for (let rx = -r; rx <= r && !plano; rx++)
        plano = planoDaRegiao(rx, rz, SEMENTE, TERRENO_NATURAL);
  if (plano) {
    const lado = 64;
    const w = 12;
    const img = novaImg(lado * w + 60, Math.round(lado * w * 0.75) + 160, [110, 140, 180]);
    const ox = img.w / 2;
    const oy = 140;
    const x0 = plano.cx - lado / 2;
    const z0 = plano.cz - lado / 2;
    const yMin = plano.h - 6;
    const yMax = plano.h + 12;
    for (let s2 = 0; s2 < lado * 2; s2++)
      for (let y = yMin; y <= yMax; y++)
        for (let x = 0; x < lado; x++) {
          const z = s2 - x;
          if (z < 0 || z >= lado) continue;
          const id = blocoEm(x0 + x, y, z0 + z);
          if (id === Bloco.AR) continue;
          const c = cores(id);
          const P = (a: number, b: number, d: number): [number, number] =>
            iso([x + a - lado / 2, y - plano.h + b, z + d - lado / 2], w, ox, oy + lado * w * 0.25);
          if (transparente(id)) {
            const t = c.lado;
            poligono(
              img,
              [P(0.2, 0.8, 0.5), P(0.8, 0.8, 0.5), P(0.8, 0, 0.5), P(0.2, 0, 0.5)],
              [...t, 255],
            );
            continue;
          }
          const vis = (dx: number, dy: number, dz: number) => {
            const v = blocoEm(x0 + x + dx, y + dy, z0 + z + dz);
            return (
              transparente(v) ||
              (v === Bloco.AGUA && id !== Bloco.AGUA) ||
              x + dx >= lado ||
              z + dz >= lado ||
              y + dy > yMax
            );
          };
          const sombra = (k: number, base: readonly number[]) => [
            base[0] * k,
            base[1] * k,
            base[2] * k,
            255,
          ];
          if (vis(0, 1, 0))
            poligono(img, [P(0, 1, 0), P(1, 1, 0), P(1, 1, 1), P(0, 1, 1)], sombra(1, c.topo));
          if (vis(1, 0, 0))
            poligono(img, [P(1, 1, 0), P(1, 1, 1), P(1, 0, 1), P(1, 0, 0)], sombra(0.72, c.lado));
          if (vis(0, 0, 1))
            poligono(img, [P(0, 1, 1), P(1, 1, 1), P(1, 0, 1), P(0, 0, 1)], sombra(0.86, c.lado));
        }
    salvarPng(img, 'povoado.png');
    writeFileSync(
      join(saida, 'povoado.txt'),
      `povoado ${plano.id}: centro ${plano.cx},${plano.cz} (altura ${plano.h}), ${plano.lotes.length} lotes: ` +
        plano.lotes.map((l) => `${l.tipo}${l.profissao ? '/' + l.profissao : ''}`).join(', ') +
        `\nformas: ${JSON.stringify(tema.mundo.povoado ?? 'padrão')}\n`,
    );
  } else console.log('nenhum povoado perto da origem');
}

console.log(`vitrine de ${tema.nome} pronta em ${saida}`);

function salvarPng(img: Img, nome: string): void {
  salvarPngEm(img, join(saida, nome));
}
