/**
 * Os carros parados da Vila Neon (spec 026, rodada 2 do visual; pedido do dono: "muito mais bem
 * acabados, com os detalhes que caprichamos na Cidade Grande", e com cara de anos 80). São
 * modelos novos, só deste mundo (nada dos veículos da cidade é reaproveitado), no mesmo jeito
 * de carrinho de metal fundido: contorno de lado puxado na largura com bisel firme, caixas de
 * roda recortadas, painéis planos.
 *
 * - **hatch em cunha:** capô baixo, para-brisa deitado, traseira caída, faróis quadrados,
 *   para-choque preto com friso;
 * - **bolha:** o carrinho redondo, teto em arco, faróis redondos (de oito lados), para-choque
 *   de lâmina cromada;
 * - **van pão de forma:** de duas cores, cabine avançada, bagageiro no teto com a mala (a da
 *   banda é grafite com o raio vermelho e leva os estojos);
 * - **picape:** cabine quadrada e caçamba aberta com a carga.
 *
 * Detalhes de todos: calotas, para-choques, faróis e lanternas que acendem de noite (a malha
 * `noite` do chunk), janelas de vidro de verdade com o interior à vista (bancos, volante,
 * painel, os dadinhos de pelúcia no retrovisor), linhas das portas, maçanetas, retrovisores,
 * placa sem letra, frisos finos de duas cores (nunca arco-íris), antena de vareta.
 *
 * Cuidado legal: só a época, de forma genérica. Nenhum modelo de verdade tem estas proporções;
 * nada de logotipo, emblema nem desenho de grade de marca.
 *
 * As contas são feitas com x para a frente do carro, y para cima e z para o lado (como as peças
 * de `solidos.ts`); no fim vão para o referencial da peça (x para a direita, z para a frente).
 */
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { CreateCylinderVertexData } from '@babylonjs/core/Meshes/Builders/cylinderBuilder';
import {
  caixa,
  noPlano,
  orientar,
  Pecas,
  retangulo,
  solido,
  type Canto,
  type Item,
  type V2,
  type V3,
} from '../solidos';
import { COR, Ref, perfilRaio } from './ref';

const PNEU = '#26272e';
const CROMO = '#dfe3ea';
const CROMO_ESC = '#9aa0ac';
const PRETO = '#2a2b32';
const FRISO = '#24252c';
const BORRACHA = '#33343c';
const FAROL_DIA = '#f4f6f2';
const FAROL_NOITE = '#fff3c0';
const LANTERNA_DIA = '#b8242a';
const LANTERNA_NOITE = '#ff3a2e';
const PISCA = '#f0962a';
const PLACA = '#f2d24a';

/**
 * A versão de longe (a do celular a mais de ~24 blocos, como os veículos da cidade): bisel de
 * um gomo, rodas de menos lados, sem o interior e sem as pecinhas (placa, antena, dadinhos,
 * retrovisor, vincos), e o vidro vira uma lâmina escura do corpo (um material a menos).
 */
let longe = false;
/** Bem longe (a ~36 blocos): só o volume, as rodas e as luzes (um brinquedo pequenino na tela). */
let muitoLonge = false;
const VIDRO_LONGE = '#3e5266';

type Fz = number | ((y: number) => number);
const fz = (f: Fz) => (typeof f === 'number' ? () => f : f);

/** O carro em obra: o corpo, as luzes da noite e o vidro. */
interface Obra {
  c: Pecas;
  n: Pecas;
  v: Pecas;
}
const novaObra = (): Obra => ({ c: new Pecas(), n: new Pecas(), v: new Pecas() });

const k = (x: number, y: number, r = 0, seg = 2): Canto => ({ x, y, r, seg });

/** Volume grande: o contorno de lado puxado na largura (dos dois lados), com bisel. */
function vol(dst: Pecas, perfil: Item[], z: Fz, cor: string, b = 0.045, sb = 2): void {
  const f = fz(z);
  dst.add(
    solido({
      perfil,
      z0: (y) => -f(y),
      z1: f,
      bisel: muitoLonge ? 0 : b,
      segBisel: muitoLonge ? 0 : longe ? 1 : sb,
      cor,
    }),
  );
}

/** Peça colada no lado (z = ±zs), saindo `sai` para fora e `entra` para dentro. */
function lateral(
  dst: Pecas,
  perfil: Item[],
  zs: Fz,
  cor: string,
  sai = 0.014,
  lados: number[] = [-1, 1],
  entra = 0.01,
  bisel = 0.004,
): void {
  if (muitoLonge) return;
  const f = fz(zs);
  for (const s of lados)
    dst.add(
      solido({
        perfil,
        z0: s > 0 ? (y) => f(y) - entra : (y) => -f(y) - sai,
        z1: s > 0 ? (y) => f(y) + sai : (y) => -f(y) + entra,
        bisel: longe ? 0 : Math.min(bisel, (sai + entra) / 3),
        segBisel: longe ? 0 : 1,
        cor,
      }),
    );
}

/**
 * Peça colada numa face do contorno, de `a` para `b` (no sentido do contorno): o perfil vem em
 * (u = z do carro, v = distância de `a` ao longo da face).
 */
function naFace(
  dst: Pecas,
  a: V2,
  b: V2,
  perfil: Item[],
  cor: string,
  sai = 0.014,
  entra = 0.01,
): void {
  // bem longe só ficam as lentes acesas (o resto da face some no tamanho da tela)
  if (muitoLonge && cor !== FAROL_NOITE) return;
  const d = [b[0] - a[0], b[1] - a[1]];
  const l = Math.hypot(d[0], d[1]);
  const v: V3 = [d[0] / l, d[1] / l, 0];
  const n: V3 = [v[1], -v[0], 0];
  const bis = longe ? 0 : Math.min(0.004, (sai + entra) / 3);
  const vd = solido({ perfil, z0: -entra, z1: sai, bisel: bis, segBisel: bis > 0 ? 1 : 0, cor });
  dst.add(noPlano(vd, [a[0], a[1], 0], [0, 0, 1], v, n));
}

/** Caixa de brinquedo (x0..x1, y0..y1, z0..z1) com o canto e o bisel pequenos. */
function cx(
  dst: Pecas,
  x0: number,
  x1: number,
  y0: number,
  y1: number,
  z0: number,
  z1: number,
  cor: string,
  r = 0.02,
  b = 0.012,
): void {
  const menor = Math.min(x1 - x0, y1 - y0, z1 - z0);
  // de longe as pecinhas somem (placa, frisos miúdos, fechos)
  if (longe && Math.max(x1 - x0, y1 - y0, z1 - z0) < (muitoLonge ? 0.4 : 0.13)) return;
  const bb = Math.min(b, menor * 0.3);
  const rr = Math.min(Math.max(r, bb + 0.005), (Math.min(x1 - x0, y1 - y0) / 2) * 0.9);
  if (longe) dst.add(caixa(x0, x1, y0, y1, z0, z1, 0, 0, cor, 1));
  else dst.add(caixa(x0, x1, y0, y1, z0, z1, bb > 0 ? rr : 0, bb, cor, 1));
}

/** Barra fina de a até b (a antena, o cordão dos dadinhos). */
function vareta(dst: Pecas, a: V3, b: V3, lado: number, cor: string): void {
  if (longe) return;
  const d: V3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const L = Math.hypot(d[0], d[1], d[2]) || 1e-6;
  const u: V3 = [d[0] / L, d[1] / L, d[2] / L];
  let p: V3 = Math.abs(u[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
  const dot = p[0] * u[0] + p[1] * u[1] + p[2] * u[2];
  p = [p[0] - dot * u[0], p[1] - dot * u[1], p[2] - dot * u[2]];
  const lp = Math.hypot(p[0], p[1], p[2]);
  p = [p[0] / lp, p[1] / lp, p[2] / lp];
  const q: V3 = [u[1] * p[2] - u[2] * p[1], u[2] * p[0] - u[0] * p[2], u[0] * p[1] - u[1] * p[0]];
  const vd = caixa(-lado / 2, lado / 2, 0, L, -lado / 2, lado / 2, 0, 0, cor, 1);
  dst.add(noPlano(vd, a, p, u, q));
}

/** Cilindro deitado no eixo z (roda, calota: o jogo já usa roda redonda). */
function cilZ(
  dst: Pecas,
  R: number,
  larg: number,
  x: number,
  y: number,
  z: number,
  cor: string,
  lados = 14,
): void {
  if (longe && R < (muitoLonge ? 0.25 : 0.1)) return;
  if (longe) lados = muitoLonge ? 6 : Math.max(6, (lados * 0.6) | 0);
  const vd = CreateCylinderVertexData({ height: larg, diameter: R * 2, tessellation: lados });
  const P = vd.positions as number[];
  const N = vd.normals as number[];
  for (let i = 0; i < P.length; i += 3) {
    const [a, b, c] = [P[i], P[i + 1], P[i + 2]];
    P[i] = a + x;
    P[i + 1] = c + y;
    P[i + 2] = b + z;
    const [n0, n1, n2] = [N[i], N[i + 1], N[i + 2]];
    N[i] = n0;
    N[i + 1] = n2;
    N[i + 2] = n1;
  }
  vd.uvs = null;
  dst.add(orientar(vd), cor);
}

/** Polígono de `n` lados (lente redonda de farol, facetada), em (u, v). */
function poligono(n: number, r: number, u: number, v: number): Canto[] {
  const pts: Canto[] = [];
  for (let i = 0; i < n; i++) {
    const a = ((i + 0.5) * 2 * Math.PI) / n;
    pts.push({ x: u + Math.cos(a) * r, y: v + Math.sin(a) * r });
  }
  return pts;
}

/** A roda: o pneu, a calota cromada com o anel e o miolo (dos dois lados do carro). */
function rodas(
  o: Obra,
  xs: number[],
  R: number,
  zFora: number,
  calota: 'lisa' | 'raiada' = 'lisa',
  faixaBranca = false,
): void {
  const larg = 0.24;
  for (const x of xs)
    for (const s of [-1, 1]) {
      const zc = s * (zFora - larg / 2);
      cilZ(o.c, R, larg, x, R, zc, PNEU, 12);
      const zf = s * zFora;
      if (faixaBranca) cilZ(o.c, R * 0.82, 0.02, x, R, zf, '#ece8dc', 12);
      cilZ(o.c, R * 0.66, 0.05, x, R, zf, CROMO, 10);
      if (calota === 'lisa') {
        // a calota lisa: o anel escuro e o miolo
        cilZ(o.c, R * 0.46, 0.07, x, R, zf, CROMO_ESC, 8);
        cilZ(o.c, R * 0.22, 0.1, x, R, zf, CROMO, 6);
      } else {
        // a calota raiada: quatro rasgos escuros em cruz e o miolo
        for (let i = 0; i < 4; i++) {
          const a = (i * Math.PI) / 2 + Math.PI / 4;
          const px = x + Math.cos(a) * R * 0.42;
          const py = R + Math.sin(a) * R * 0.42;
          const h = R * 0.13;
          cx(o.c, px - h, px + h, py - h, py + h, zf - 0.035, zf + 0.035, PRETO, 0, 0);
        }
        cilZ(o.c, R * 0.2, 0.1, x, R, zf, CROMO, 6);
      }
    }
}

/** Aba do para-lama: um arco de lataria um tico para fora em volta da roda. */
function abaDaRoda(
  dst: Pecas,
  x: number,
  y: number,
  R0: number,
  chao: number,
  zs: number,
  cor: string,
  larg = 0.06,
): void {
  const R1 = R0 + larg;
  const a0 = Math.asin(Math.max(-0.99, (chao - y) / R1));
  const b0 = Math.asin(Math.max(-0.99, (chao - y) / R0));
  const pts: Canto[] = [];
  const n = longe ? 4 : 8;
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((Math.PI - 2 * a0) * i) / n;
    pts.push({ x: x + Math.cos(a) * R1, y: y + Math.sin(a) * R1 });
  }
  for (let i = n; i >= 0; i--) {
    const a = b0 + ((Math.PI - 2 * b0) * i) / n;
    pts.push({ x: x + Math.cos(a) * R0, y: y + Math.sin(a) * R0 });
  }
  lateral(dst, pts, zs, cor, 0.028, [-1, 1], 0.02, 0.01);
}

/** A altura do chão da porta em x (sobe por cima da caixa de roda). */
function peDaPorta(x: number, y0: number, arcos: { x: number; y: number; R: number }[]): number {
  let y = y0;
  for (const r of arcos) {
    const R1 = r.R + 0.05;
    const d = Math.abs(x - r.x);
    if (d < R1) y = Math.max(y, r.y + Math.sqrt(R1 * R1 - d * d));
  }
  return y;
}

/** Vinco (a linha da porta): um risquinho escuro no lado. */
function vinco(o: Obra, x: number, y0: number, y1: number, zs: Fz): void {
  if (longe) return;
  lateral(o.c, retangulo(x - 0.009, y0, x + 0.009, y1), zs, FRISO, 0.016, [-1, 1], 0.01, 0);
}

/** Faixa no lado que pula as caixas de roda (o friso, a faixa de duas cores). */
function faixaLado(
  o: Obra,
  x0: number,
  x1: number,
  y0: number,
  y1: number,
  zs: Fz,
  cor: string,
  arcos: { x: number; y: number; R: number }[],
  sai = 0.016,
): void {
  // corta a faixa onde ela entraria na caixa de roda
  let trechos: [number, number][] = [[x0, x1]];
  for (const r of arcos) {
    const R1 = r.R + 0.07;
    const dy = y0 - r.y;
    if (dy >= R1) continue;
    const dx = Math.sqrt(R1 * R1 - Math.max(0, dy) ** 2);
    trechos = trechos.flatMap(([a, b]): [number, number][] => {
      const out: [number, number][] = [];
      if (a < r.x - dx) out.push([a, Math.min(b, r.x - dx)]);
      if (b > r.x + dx) out.push([Math.max(a, r.x + dx), b]);
      return out;
    });
  }
  for (const [a, b] of trechos)
    if (b - a > 0.03) lateral(o.c, retangulo(a, y0, b, y1), zs, cor, sai, [-1, 1], 0.01, 0);
}

/** A placa sem letra: amarela, de moldura escura (a cara das placas da época). */
function placa(o: Obra, x: number, y: number, frente: boolean): void {
  const s = frente ? 1 : -1;
  const a = Math.min(x, x + s * 0.02);
  cx(o.c, a, a + 0.02, y - 0.075, y + 0.075, -0.2, 0.2, PRETO, 0, 0);
  const p = Math.min(x + s * 0.02, x + s * 0.032);
  cx(o.c, p, p + 0.012, y - 0.058, y + 0.058, -0.18, 0.18, PLACA, 0, 0);
}

/** Farol quadrado com aro cromado na face da frente (a lente acende de noite). */
function farolQuadrado(o: Obra, a: V2, b: V2, u: number, v: number, w: number, h: number): void {
  naFace(o.c, a, b, retangulo(u - w / 2 - 0.025, v - h / 2 - 0.025, u + w / 2 + 0.025, v + h / 2 + 0.025, 0.02, 1), CROMO, 0.02);
  naFace(o.c, a, b, retangulo(u - w / 2, v - h / 2, u + w / 2, v + h / 2), FAROL_DIA, 0.03);
  naFace(o.n, a, b, retangulo(u - w / 2, v - h / 2, u + w / 2, v + h / 2), FAROL_NOITE, 0.034, -0.03);
}

/** Farol redondo (oito lados) com aro cromado. */
function farolRedondo(o: Obra, a: V2, b: V2, u: number, v: number, r: number): void {
  naFace(o.c, a, b, poligono(8, r + 0.03, u, v), CROMO, 0.022);
  naFace(o.c, a, b, poligono(8, r, u, v), FAROL_DIA, 0.034);
  naFace(o.n, a, b, poligono(8, r, u, v), FAROL_NOITE, 0.038, -0.034);
}

/** Lanterna de trás (vermelha, acende de noite) numa caixa. */
function lanterna(
  o: Obra,
  x: number,
  y0: number,
  y1: number,
  z0: number,
  z1: number,
  cor = LANTERNA_DIA,
  acesa = LANTERNA_NOITE,
): void {
  cx(o.c, x - 0.035, x + 0.005, y0, y1, z0, z1, cor, 0, 0);
  if (acesa) cx(o.n, x - 0.04, x - 0.034, y0, y1, z0, z1, acesa, 0, 0);
}

/** Retrovisor de fora: a haste e o espelho (cromado atrás). */
function retrovisores(o: Obra, x: number, y: number, zs: number, cor: string): void {
  if (longe) return;
  for (const s of [-1, 1]) {
    const z0 = s > 0 ? zs - 0.01 : -zs - 0.16;
    cx(o.c, x - 0.02, x + 0.03, y + 0.02, y + 0.06, z0, z0 + 0.17, PRETO, 0, 0);
    const ze = s > 0 ? zs + 0.05 : -zs - 0.19;
    cx(o.c, x - 0.05, x + 0.05, y, y + 0.12, ze, ze + 0.14, cor, 0.02, 0.012);
    cx(o.c, x - 0.058, x - 0.048, y + 0.015, y + 0.105, ze + 0.015, ze + 0.125, CROMO, 0, 0);
  }
}

/** Antena de vareta no para-lama, com a pontinha. */
function antena(o: Obra, x: number, y: number, z: number, alt = 0.82): void {
  if (longe) return;
  cx(o.c, x - 0.025, x + 0.025, y, y + 0.03, z - 0.025, z + 0.025, CROMO, 0, 0);
  vareta(o.c, [x, y + 0.02, z], [x - alt * 0.22, y + alt, z], 0.016, CROMO);
  cx(o.c, x - alt * 0.22 - 0.022, x - alt * 0.22 + 0.022, y + alt - 0.01, y + alt + 0.034, z - 0.022, z + 0.022, COR.vermelho, 0, 0);
}

/** Os dadinhos de pelúcia pendurados no retrovisor de dentro. */
function dadinhos(o: Obra, x: number, y: number, cor: string): void {
  if (longe) return;
  cx(o.c, x - 0.02, x + 0.02, y - 0.04, y, -0.09, 0.09, PRETO, 0, 0);
  vareta(o.c, [x, y - 0.03, 0], [x - 0.02, y - 0.17, -0.035], 0.012, '#f4f1ea');
  vareta(o.c, [x, y - 0.03, 0], [x - 0.01, y - 0.21, 0.04], 0.012, '#f4f1ea');
  cx(o.c, x - 0.055, x + 0.015, y - 0.235, y - 0.165, -0.07, 0, cor, 0.012, 0.01);
  cx(o.c, x - 0.045, x + 0.025, y - 0.275, y - 0.205, 0.005, 0.075, cor, 0.012, 0.01);
  // as pintinhas
  cx(o.c, x - 0.062, x - 0.054, y - 0.21, y - 0.19, -0.045, -0.025, '#ffffff', 0, 0);
  cx(o.c, x - 0.052, x - 0.044, y - 0.25, y - 0.23, 0.03, 0.05, '#ffffff', 0, 0);
}

/** Banco (assento e encosto com o apoio de cabeça): aparece pelo vidro. */
function banco(
  o: Obra,
  x: number,
  y: number,
  z0: number,
  z1: number,
  cor: string,
  alt = 0.4,
  apoio = true,
): void {
  if (longe) return;
  cx(o.c, x - 0.02, x + 0.4, y, y + 0.1, z0, z1, cor, 0.03, 0.02);
  cx(o.c, x - 0.1, x + 0.04, y, y + alt, z0, z1, cor, 0.04, 0.025);
  if (apoio) {
    const m = (z0 + z1) / 2;
    cx(o.c, x - 0.085, x + 0.025, y + alt + 0.02, y + alt + 0.14, m - 0.12, m + 0.12, cor, 0.03, 0.02);
    cx(o.c, x - 0.04, x - 0.02, y + alt - 0.01, y + alt + 0.03, m - 0.03, m + 0.03, CROMO_ESC, 0, 0);
  }
}

/** O volante (oito lados, de brinquedo) com a coluna, do lado do motorista. */
function volante(o: Obra, x: number, y: number, z: number, r = 0.15): void {
  if (longe) return;
  vareta(o.c, [x + 0.2, y - 0.14, z], [x, y, z], 0.04, PRETO);
  const aro = poligono(8, r, 0, 0);
  const vd = solido({ perfil: aro, z0: -0.02, z1: 0.02, bisel: 0.008, segBisel: 1, cor: PRETO });
  // o aro no plano (z, y) do carro, virado para o banco e um pouco deitado
  o.c.add(noPlano(vd, [x, y, z], [0, 0, 1], [0.34, 0.94, 0], [-0.94, 0.34, 0]));
  const miolo = solido({ perfil: poligono(8, r * 0.36, 0, 0), z0: -0.03, z1: 0.03, bisel: 0, segBisel: 0, cor: CROMO_ESC });
  o.c.add(noPlano(miolo, [x, y, z], [0, 0, 1], [0.34, 0.94, 0], [-0.94, 0.34, 0]));
}

/** Coluna da janela: o contorno (x, y) colado por dentro da linha do vidro, dos dois lados. */
function coluna(o: Obra, perfil: Item[], zc: Fz, cor: string, esp = 0.07): void {
  const f = fz(zc);
  for (const s of [-1, 1])
    o.c.add(
      solido({
        perfil,
        z0: s > 0 ? (y) => f(y) - esp : (y) => -f(y),
        z1: s > 0 ? f : (y) => -f(y) + esp,
        bisel: 0.012,
        segBisel: 1,
        cor,
      }),
    );
}

/** O vidro do lado (uma lâmina fina logo por dentro das colunas). */
function vidroLado(o: Obra, perfil: Item[], zc: Fz): void {
  const f = fz(zc);
  for (const s of [-1, 1])
    (longe ? o.c : o.v).add(
      solido({
        perfil,
        z0: s > 0 ? (y) => f(y) - 0.04 : (y) => -f(y) + 0.02,
        z1: s > 0 ? (y) => f(y) - 0.02 : (y) => -f(y) + 0.04,
        bisel: 0,
        segBisel: 0,
        cor: longe ? VIDRO_LONGE : '#ffffff',
      }),
    );
}

/** O vidro numa face inclinada (para-brisa, vidro de trás): de `a` para `b`, meia largura. */
function vidroFace(o: Obra, a: V2, b: V2, hw0: number, hw1: number, v0: number, v1: number): void {
  const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
  naFace(
    longe ? o.c : o.v,
    a,
    b,
    [
      { x: -hw0, y: v0 },
      { x: hw0, y: v0 },
      { x: hw1, y: l - v1 },
      { x: -hw1, y: l - v1 },
    ],
    longe ? VIDRO_LONGE : '#ffffff',
    -0.02,
    0.04,
  );
}

/** Os limpadores deitados no pé do para-brisa. */
function limpadores(o: Obra, a: V2, b: V2, hw: number): void {
  if (longe) return;
  for (const s of [-1, 1]) {
    const u0 = s > 0 ? 0.04 : -hw * 0.86;
    naFace(o.c, a, b, retangulo(u0, 0.03, u0 + hw * 0.82, 0.05), PRETO, 0.012, 0);
  }
}

/** Mala de viagem (para o bagageiro): a caixa, as duas cintas e a alça. */
function mala(
  o: Obra,
  x0: number,
  x1: number,
  y: number,
  alt: number,
  z0: number,
  z1: number,
  cor: string,
  cinta: string,
): void {
  cx(o.c, x0, x1, y, y + alt, z0, z1, cor, 0.04, 0.03);
  const L = x1 - x0;
  for (const f of [0.25, 0.75]) {
    const x = x0 + L * f;
    cx(o.c, x - 0.03, x + 0.03, y - 0.004, y + alt + 0.012, z0 - 0.012, z1 + 0.012, cinta, 0, 0);
  }
  const m = (x0 + x1) / 2;
  cx(o.c, m - 0.09, m + 0.09, y + alt * 0.4, y + alt * 0.62, z1, z1 + 0.035, cinta, 0, 0);
  for (const xq of [x0 + 0.02, x1 - 0.06])
    for (const zq of [z0 - 0.006, z1 - 0.034])
      cx(o.c, xq, xq + 0.04, y + alt - 0.04, y + alt + 0.008, zq, zq + 0.04, CROMO, 0, 0);
}

/** Bagageiro de teto: a grade cromada (dois trilhos, as travessas e os pezinhos). */
function bagageiro(o: Obra, x0: number, x1: number, y: number, hw: number, travessas = 4): void {
  for (const s of [-1, 1]) {
    cx(o.c, x0, x1, y + 0.07, y + 0.105, s * hw - 0.018, s * hw + 0.018, CROMO, 0, 0);
    for (const x of [x0 + 0.06, (x0 + x1) / 2, x1 - 0.06])
      cx(o.c, x - 0.02, x + 0.02, y - 0.01, y + 0.08, s * hw - 0.02, s * hw + 0.02, CROMO_ESC, 0, 0);
  }
  for (let i = 0; i < travessas; i++) {
    const x = x0 + 0.04 + ((x1 - x0 - 0.08) * i) / (travessas - 1);
    cx(o.c, x - 0.016, x + 0.016, y + 0.05, y + 0.082, -hw, hw, CROMO, 0, 0);
  }
}

// ------------------------------------------------------------------ o hatch em cunha

interface Pintura {
  cor: string;
  /** Os dois frisos finos do lado (nunca mais de duas cores). */
  friso: [string, string];
  banco: string;
  forro: string;
  dado: string;
  /** Teto de outra cor (o duas-cores da época). */
  teto?: string;
  /** Persiana no vidro de trás e aerofólio (o esportivo). */
  esporte?: boolean;
}

const PINTURAS_HATCH: Pintura[] = [
  // bege com frisos marrons, bancos caramelo
  { cor: '#dcc79c', friso: ['#7a4a2a', '#b5682e'], banco: '#b9783e', forro: '#6e4a30', dado: '#f4f1ea' },
  // vinho com frisos dourados e a persiana (o esportivo)
  { cor: '#8e2433', friso: ['#e8c040', '#f4ecdc'], banco: '#3a3540', forro: '#2c2a32', dado: '#f4f1ea', esporte: true },
  // branco com a faixa azul e vermelha
  { cor: '#f2efe6', friso: ['#2f6fd0', '#d8342c'], banco: '#5f7fa8', forro: '#3c4658', dado: '#e8302a' },
];

function hatch(o: Obra, p: Pintura): void {
  const W = 0.8;
  const CH = 0.25;
  const R = 0.31;
  const arcos = [
    { x: -1.06, y: R, R: 0.4 },
    { x: 1.08, y: R, R: 0.4 },
  ];
  const yb = 0.99;
  const yt = 1.5;
  // a parte de baixo: a cunha (capô baixo que sobe até o para-brisa) e a traseira reta
  const frenteA: V2 = [1.75, CH + 0.04];
  const frenteB: V2 = [1.78, 0.74];
  vol(
    o.c,
    [
      k(-1.7, CH, 0.04, 1),
      { roda: { ...arcos[0], chao: CH, seg: 8 } },
      { roda: { ...arcos[1], chao: CH, seg: 8 } },
      k(frenteA[0], CH, 0.04, 1),
      k(frenteB[0], frenteB[1], 0.04, 2),
      k(1.68, 0.83, 0.03, 1),
      k(0.62, yb, 0.03, 1),
      k(-1.52, yb + 0.01, 0.03, 1),
      k(-1.74, 0.95, 0.05, 2),
    ],
    W,
    p.cor,
  );
  for (const r of arcos) abaDaRoda(o.c, r.x, r.y, r.R, CH, W, p.cor);
  // a soleira escura embaixo das portas
  faixaLado(o, -1.66, 1.7, CH, CH + 0.07, W, BORRACHA, arcos, 0.02);
  // a cabine: colunas, teto e vidros (o interior aparece)
  const zc = (y: number) => 0.75 - (0.1 * Math.max(0, y - yb)) / (yt - yb);
  const A: V2 = [0.66, yb];
  const Ab: V2 = [0.14, yt];
  const Cb: V2 = [-1.04, yt];
  const C: V2 = [-1.66, yb + 0.01];
  const naLinha = (a: V2, b: V2, y: number): number => a[0] + ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]);
  const yf = yt - 0.075;
  // o teto
  vol(
    o.c,
    [k(naLinha(A, Ab, yf), yf), k(Ab[0], yt, 0.06, 2), k(Cb[0], yt, 0.07, 2), k(naLinha(C, Cb, yf), yf)],
    zc,
    p.teto ?? p.cor,
    0.04,
    2,
  );
  // as colunas: a do para-brisa, a do meio e a de trás (larga, de hatch)
  const colA = 0.085;
  coluna(o, [k(A[0], yb), k(naLinha(A, Ab, yf), yf), k(naLinha(A, Ab, yf) - colA, yf), k(A[0] - colA, yb)], zc, p.cor);
  coluna(o, [k(-0.26, yb), k(-0.26, yf), k(-0.35, yf), k(-0.35, yb)], zc, PRETO);
  const colC = 0.2;
  coluna(o, [k(C[0], C[1]), k(C[0] + colC, C[1]), k(naLinha(C, Cb, yf) + colC, yf), k(naLinha(C, Cb, yf), yf)], zc, p.cor);
  // a travessa de baixo do vidro de trás e a do para-brisa (a moldura)
  const jy0 = yb + 0.03;
  vidroLado(o, [k(A[0] - colA, jy0), k(naLinha(A, Ab, yf) - colA, yf), k(-0.26, yf), k(-0.26, jy0)], zc);
  vidroLado(o, [k(-0.35, jy0), k(-0.35, yf), k(naLinha(C, Cb, yf) + colC, yf), k(C[0] + colC, jy0)], zc);
  // a moldura fina preta dos vidros (o friso de borracha) e a calha cromada do teto
  lateral(o.c, [k(A[0] - 0.02, yb - 0.005), k(C[0] + 0.1, yb + 0.005), k(C[0] + 0.1, yb + 0.035), k(A[0] - 0.02, yb + 0.03)], zc, PRETO, 0.012, [-1, 1], 0.01, 0);
  lateral(o.c, [k(naLinha(A, Ab, yf) - 0.02, yf - 0.012), k(naLinha(C, Cb, yf) + 0.05, yf - 0.012), k(naLinha(C, Cb, yf) + 0.05, yf + 0.012), k(naLinha(A, Ab, yf) - 0.02, yf + 0.012)], zc, CROMO, 0.014, [-1, 1], 0.01, 0);
  const lA = Math.hypot(Ab[0] - A[0], Ab[1] - A[1]);
  vidroFace(o, A, Ab, zc(yb) - 0.09, zc(yf) - 0.09, 0.03, lA * 0.14);
  limpadores(o, A, Ab, zc(yb) - 0.12);
  const lC = Math.hypot(Cb[0] - C[0], Cb[1] - C[1]);
  vidroFace(o, Cb, C, zc(yf) - 0.1, zc(yb) - 0.1, lC * 0.12, 0.05);
  if (p.esporte) {
    // a persiana do vidro de trás (a cara do esportivo dos anos 80) e o aerofólio
    for (let i = 0; i < 5; i++) {
      const v = lC * (0.16 + i * 0.16);
      naFace(o.c, Cb, C, retangulo(-zc(yb) + 0.12, v, zc(yb) - 0.12, v + lC * 0.085), PRETO, 0.045, -0.02);
    }
    cx(o.c, -1.76, -1.6, yb + 0.02, yb + 0.07, -W + 0.06, W - 0.06, PRETO, 0.02, 0.012);
  }
  // o interior: o forro, o painel, o volante, os bancos e os dadinhos
  cx(o.c, -1.58, 0.6, yb - 0.01, yb + 0.012, -0.66, 0.66, p.forro, 0, 0);
  cx(o.c, 0.36, 0.62, yb, yb + 0.13, -0.64, 0.64, p.forro, 0.03, 0.02);
  volante(o, 0.24, yb + 0.2, 0.34, 0.13);
  for (const s of [-1, 1]) banco(o, -0.2, yb - 0.02, s > 0 ? 0.1 : -0.58, s > 0 ? 0.58 : -0.1, p.banco, 0.34);
  banco(o, -0.98, yb - 0.02, -0.6, 0.6, p.banco, 0.28, false);
  // a tampa do porta-malas por dentro (o bagagito)
  cx(o.c, -1.4, -1.02, yb, yb + 0.15, -0.62, 0.62, p.forro, 0.02, 0.012);
  dadinhos(o, 0.2, yf - 0.02, p.dado);
  // o lado: os dois frisos finos, o friso de borracha, as portas, a maçaneta e a tampa do tanque
  faixaLado(o, -1.68, 1.7, 0.6, 0.66, W, BORRACHA, arcos, 0.022);
  faixaLado(o, -1.6, 1.62, 0.875, 0.895, W, p.friso[0], [], 0.013);
  faixaLado(o, -1.6, 1.62, 0.835, 0.85, W, p.friso[1], [], 0.013);
  const cint = yb - 0.06;
  for (const x of [0.6, -0.3]) vinco(o, x, peDaPorta(x, CH + 0.07, arcos), cint, W);
  lateral(o.c, retangulo(-0.2, 0.76, -0.04, 0.8, 0.012, 1), W, CROMO, 0.028);
  lateral(o.c, retangulo(-1.24, 0.72, -1.12, 0.84, 0.02, 1), W, p.cor, 0.014, [1]);
  retrovisores(o, 0.5, yb + 0.02, W - 0.05, PRETO);
  // a frente: a grade preta de frisos, os faróis quadrados com o pisca do lado e o para-choque
  naFace(o.c, frenteA, frenteB, retangulo(-0.36, 0.2, 0.36, 0.42, 0.02, 1), PRETO, 0.012);
  for (let i = 0; i < 3; i++)
    naFace(o.c, frenteA, frenteB, retangulo(-0.33, 0.235 + i * 0.065, 0.33, 0.255 + i * 0.065), CROMO_ESC, 0.02);
  for (const s of [-1, 1]) {
    farolQuadrado(o, frenteA, frenteB, s * 0.54, 0.31, 0.26, 0.15);
    naFace(o.c, frenteA, frenteB, retangulo(s > 0 ? 0.7 : -0.76, 0.24, s > 0 ? 0.76 : -0.7, 0.38), PISCA, 0.024);
  }
  cx(o.c, 1.7, 1.86, 0.27, 0.45, -W - 0.03, W + 0.03, PRETO, 0.05, 0.03);
  cx(o.c, 1.84, 1.87, 0.37, 0.4, -W + 0.02, W - 0.02, CROMO, 0, 0);
  placa(o, 1.86, 0.33, true);
  // atrás: as lanternas largas (vermelho, âmbar e a ré branca), a placa e o para-choque
  for (const s of [-1, 1]) {
    const z0 = s > 0 ? 0.34 : -0.74;
    lanterna(o, -1.735, 0.74, 0.9, z0 + (s > 0 ? 0.12 : 0), z0 + (s > 0 ? 0.4 : 0.28));
    lanterna(o, -1.735, 0.74, 0.9, s > 0 ? z0 : z0 + 0.3, s > 0 ? z0 + 0.1 : z0 + 0.4, PISCA, '');
  }
  cx(o.c, -1.75, -1.725, 0.74, 0.9, -0.3, 0.3, PRETO, 0, 0);
  cx(o.c, -1.84, -1.68, 0.27, 0.45, -W - 0.03, W + 0.03, PRETO, 0.05, 0.03);
  cx(o.c, -1.855, -1.83, 0.37, 0.4, -W + 0.02, W - 0.02, CROMO, 0, 0);
  placa(o, -1.712, 0.6, false);
  antena(o, 0.98, 0.93, -0.6);
  rodas(o, [-1.06, 1.08], R, W - 0.015, p.esporte ? 'raiada' : 'lisa');
}

// ------------------------------------------------------------------ o carrinho bolha

const PINTURAS_BOLHA: Pintura[] = [
  // azul-céu com o friso branco
  { cor: '#7ec0ea', friso: ['#f6f4ee', '#2f6fd0'], banco: '#f1e6cf', forro: '#55708e', dado: '#f4f1ea' },
  // mostarda com o teto creme
  { cor: '#dba628', friso: ['#f4ecdc', '#7a4a2a'], banco: '#6e4a30', forro: '#4a3424', dado: '#e8302a', teto: '#f4ecdc' },
  // creme com o friso vinho
  { cor: '#f0e6cc', friso: ['#8e2433', '#dba628'], banco: '#9a3442', forro: '#5a2a32', dado: '#2f6fd0' },
];

function bolha(o: Obra, p: Pintura): void {
  const W = 0.78;
  const CH = 0.26;
  const R = 0.3;
  const arcos = [
    { x: -0.94, y: R, R: 0.39 },
    { x: 0.98, y: R, R: 0.39 },
  ];
  const yb = 1.0;
  const yt = 1.6;
  const frenteA: V2 = [1.5, 0.42];
  const frenteB: V2 = [1.42, 0.86];
  // o corpo redondo: a frente e a traseira de cantos largos
  vol(
    o.c,
    [
      k(-1.42, CH, 0.1, 2),
      { roda: { ...arcos[0], chao: CH, seg: 8 } },
      { roda: { ...arcos[1], chao: CH, seg: 8 } },
      k(1.46, CH, 0.1, 2),
      k(frenteA[0], frenteA[1], 0.06, 2),
      k(frenteB[0], frenteB[1], 0.12, 3),
      k(0.58, yb, 0.05, 2),
      k(-1.12, yb, 0.08, 2),
      k(-1.5, 0.84, 0.2, 3),
      k(-1.5, 0.44, 0.08, 2),
    ],
    W,
    p.cor,
    0.065,
    2,
  );
  for (const r of arcos) abaDaRoda(o.c, r.x, r.y, r.R, CH, W, p.cor, 0.07);
  // a cabine em arco: as colunas finas, o teto redondo e bastante vidro (a bolha)
  const zc = (y: number) => 0.73 - (0.17 * Math.max(0, y - yb)) / (yt - yb);
  const A: V2 = [0.6, yb];
  const A1: V2 = [0.36, 1.37];
  const C: V2 = [-1.14, yb];
  const C1: V2 = [-0.9, 1.34];
  const cTeto = p.teto ?? p.cor;
  vol(
    o.c,
    [k(A1[0], A1[1]), k(0.22, 1.53, 0.1, 2), k(-0.22, yt, 0.2, 3), k(-0.72, 1.53, 0.12, 2), k(C1[0], C1[1])],
    zc,
    cTeto,
    0.06,
    3,
  );
  coluna(o, [k(A[0], yb), k(A1[0], A1[1]), k(A1[0] - 0.075, A1[1]), k(A[0] - 0.075, yb)], zc, p.cor, 0.065);
  coluna(o, [k(-0.24, yb), k(-0.24, 1.36), k(-0.32, 1.355), k(-0.32, yb)], zc, p.cor, 0.065);
  coluna(o, [k(C[0], yb), k(C[0] + 0.085, yb), k(C1[0] + 0.085, C1[1]), k(C1[0], C1[1])], zc, p.cor, 0.065);
  const jy0 = yb + 0.03;
  vidroLado(o, [k(A[0] - 0.075, jy0), k(A1[0] - 0.075, A1[1] - 0.005), k(-0.24, 1.36), k(-0.24, jy0)], zc);
  vidroLado(o, [k(-0.32, jy0), k(-0.32, 1.355), k(C1[0] + 0.085, C1[1]), k(C[0] + 0.085, jy0)], zc);
  // a moldura cromada da linha das janelas
  lateral(o.c, [k(A[0] - 0.02, yb - 0.005), k(C[0] + 0.04, yb - 0.005), k(C[0] + 0.04, yb + 0.03), k(A[0] - 0.02, yb + 0.03)], zc, CROMO, 0.012, [-1, 1], 0.01, 0);
  vidroFace(o, A, A1, zc(yb) - 0.08, zc(A1[1]) - 0.08, 0.03, 0.01);
  limpadores(o, A, A1, zc(yb) - 0.12);
  vidroFace(o, C1, C, zc(C1[1]) - 0.09, zc(yb) - 0.09, 0.01, 0.04);
  // o interior
  cx(o.c, -1.08, 0.56, yb - 0.01, yb + 0.012, -0.64, 0.64, p.forro, 0, 0);
  cx(o.c, 0.36, 0.58, yb, yb + 0.12, -0.62, 0.62, p.forro, 0.03, 0.02);
  volante(o, 0.24, yb + 0.2, 0.32, 0.135);
  for (const s of [-1, 1]) banco(o, -0.16, yb - 0.02, s > 0 ? 0.08 : -0.56, s > 0 ? 0.56 : -0.08, p.banco, 0.32);
  banco(o, -0.86, yb - 0.02, -0.58, 0.58, p.banco, 0.26, false);
  dadinhos(o, 0.3, 1.4, p.dado);
  // o lado: o friso cromado na cintura, o friso fino de cor, a porta e a maçaneta
  faixaLado(o, -1.36, 1.38, 0.7, 0.735, W, CROMO, arcos, 0.02);
  faixaLado(o, -1.3, 1.34, 0.9, 0.925, W, p.friso[0], [], 0.013);
  faixaLado(o, -1.3, 1.34, 0.862, 0.876, W, p.friso[1], [], 0.013);
  for (const x of [0.56, -0.28]) vinco(o, x, peDaPorta(x, CH + 0.02, arcos), yb - 0.06, W);
  lateral(o.c, retangulo(-0.2, 0.79, -0.06, 0.83, 0.012, 1), W, CROMO, 0.028);
  retrovisores(o, 0.48, yb + 0.02, W - 0.05, CROMO);
  // a frente: os faróis redondos altos, a gradinha baixa de três frisos e o pisca
  for (const s of [-1, 1]) {
    farolRedondo(o, frenteA, frenteB, s * 0.5, 0.27, 0.115);
    naFace(o.c, frenteA, frenteB, retangulo(s > 0 ? 0.42 : -0.58, 0.02, s > 0 ? 0.58 : -0.42, 0.075, 0.015, 1), PISCA, 0.022);
  }
  naFace(o.c, frenteA, frenteB, retangulo(-0.26, 0.12, 0.26, 0.34, 0.03, 1), PRETO, 0.012);
  for (let i = 0; i < 3; i++)
    naFace(o.c, frenteA, frenteB, retangulo(-0.23, 0.15 + i * 0.062, 0.23, 0.172 + i * 0.062), CROMO, 0.02);
  // o para-choque de lâmina cromada com as duas garras
  cx(o.c, 1.46, 1.58, 0.29, 0.39, -W - 0.02, W + 0.02, CROMO, 0.04, 0.025);
  cx(o.c, -1.6, -1.48, 0.29, 0.39, -W - 0.02, W + 0.02, CROMO, 0.04, 0.025);
  for (const s of [-1, 1]) {
    cx(o.c, 1.5, 1.61, 0.26, 0.46, s * 0.36 - 0.04, s * 0.36 + 0.04, CROMO, 0.03, 0.02);
    cx(o.c, -1.63, -1.52, 0.26, 0.46, s * 0.36 - 0.04, s * 0.36 + 0.04, CROMO, 0.03, 0.02);
  }
  placa(o, 1.58, 0.34, true);
  // atrás: as lanternas redondas com aro, a placa e a maçaneta da tampa
  const trasA: V2 = [-1.5, 0.84];
  const trasB: V2 = [-1.5, 0.44];
  for (const s of [-1, 1]) {
    naFace(o.c, trasA, trasB, poligono(8, 0.115, s * 0.5, 0.23), CROMO, 0.02);
    naFace(o.c, trasA, trasB, poligono(8, 0.088, s * 0.5, 0.23), LANTERNA_DIA, 0.032);
    naFace(o.n, trasA, trasB, poligono(8, 0.088, s * 0.5, 0.23), LANTERNA_NOITE, 0.036, -0.032);
    naFace(o.c, trasA, trasB, poligono(8, 0.04, s * 0.26, 0.23), PISCA, 0.03);
  }
  placa(o, -1.502, 0.62, false);
  cx(o.c, -1.535, -1.5, 0.76, 0.79, -0.1, 0.1, CROMO, 0, 0);
  antena(o, 0.86, 0.95, -0.56, 0.74);
  rodas(o, [-0.94, 0.98], R, W - 0.015, 'lisa', true);
}

// ------------------------------------------------------------------ a van pão de forma

interface PinturaVan {
  baixo: string;
  cima: string;
  friso: string;
  banco: string;
  forro: string;
  banda?: boolean;
}

const PINTURAS_VAN: PinturaVan[] = [
  // a da rua: azul-céu embaixo e creme em cima
  { baixo: '#6fb2e2', cima: '#f4ecdc', friso: '#f6f4ee', banco: '#b9783e', forro: '#5a4636' },
  // a da banda: grafite com a faixa vermelha e o raio
  { baixo: COR.grafite, cima: COR.grafite2, friso: COR.vermelho, banco: '#8e2433', forro: '#24232a', banda: true },
  // a outra da rua: vinho embaixo e creme em cima
  { baixo: '#8e2433', cima: '#f4ecdc', friso: '#e8c040', banco: '#d8c8a8', forro: '#4a3424' },
];

function van(o: Obra, p: PinturaVan): void {
  const W = 0.92;
  const CH = 0.28;
  const R = 0.34;
  const arcos = [
    { x: -1.3, y: R, R: 0.44 },
    { x: 1.38, y: R, R: 0.44 },
  ];
  const yb = 1.08;
  const yj0 = 1.24;
  const yj1 = 1.8;
  const yt = 2.06;
  const frenteA: V2 = [2.08, CH + 0.06];
  const frenteB: V2 = [2.12, yb];
  // a parte de baixo (a cor de baixo), de frente reta e cantos arredondados
  vol(
    o.c,
    [
      k(-2.04, CH, 0.06, 2),
      { roda: { ...arcos[0], chao: CH, seg: 8 } },
      { roda: { ...arcos[1], chao: CH, seg: 8 } },
      k(frenteA[0], CH, 0.08, 2),
      k(frenteB[0], frenteB[1]),
      k(-2.08, yb),
    ],
    W,
    p.baixo,
    0.06,
    2,
  );
  for (const r of arcos) abaDaRoda(o.c, r.x, r.y, r.R, CH, W, p.baixo, 0.065);
  faixaLado(o, -2.0, 2.04, CH, CH + 0.07, W, BORRACHA, arcos, 0.02);
  // a parte de cima: a cinta embaixo das janelas, as colunas e o teto de pão de forma
  const zc = (y: number) => 0.92 - (0.07 * Math.max(0, y - yb)) / (yt - yb);
  // o para-brisa quase em pé: a linha da frente de cima
  const F0: V2 = [2.12, yb];
  const F1: V2 = [1.96, yj1];
  const naFrente = (y: number) => F0[0] + ((F1[0] - F0[0]) * (y - F0[1])) / (F1[1] - F0[1]);
  vol(o.c, [k(-2.08, yb), k(F0[0], yb), k(naFrente(yj0), yj0), k(-2.08, yj0)], zc, p.cima, 0.05, 2);
  vol(
    o.c,
    [k(-2.08, yj1), k(naFrente(yj1), yj1), k(1.84, yt, 0.16, 3), k(-2.0, yt, 0.14, 3)],
    zc,
    p.cima,
    0.07,
    3,
  );
  // o friso que separa as duas cores
  faixaLado(o, -2.06, 2.1, yb - 0.035, yb + 0.02, W, p.friso, [], 0.02);
  // as janelas: a da cabine e, na da rua, as duas de trás; a da banda é fechada atrás
  const colunas: [number, number][] = p.banda
    ? [
        [naFrente(yj0) - 0.1, naFrente(yj0)],
        [-2.08, 0.92],
      ]
    : [
        [naFrente(yj0) - 0.1, naFrente(yj0)],
        [0.84, 0.94],
        [-0.16, -0.06],
        [-1.16, -1.06],
        [-2.08, -1.96],
      ];
  colunas.forEach(([x0, x1], i) => {
    if (i === 0) {
      // a coluna do para-brisa acompanha a inclinação
      coluna(o, [k(naFrente(yj0) - 0.1, yj0), k(naFrente(yj0), yj0), k(naFrente(yj1), yj1), k(naFrente(yj1) - 0.1, yj1)], zc, p.cima, 0.08);
    } else if (p.banda && i === 1) {
      // o baú fechado da van da banda (a lataria inteira)
      vol(o.c, [k(x0, yj0), k(x1, yj0), k(x1, yj1), k(x0, yj1)], zc, p.cima, 0.04, 1);
    } else coluna(o, [k(x0, yj0), k(x1, yj0), k(x1, yj1), k(x0, yj1)], zc, p.cima, 0.08);
  });
  const janelas: [number, number][] = p.banda
    ? [[0.92, naFrente(yj0) - 0.1]]
    : [
        [0.94, naFrente(yj0) - 0.1],
        [-0.06, 0.84],
        [-1.06, -0.16],
        [-1.96, -1.16],
      ];
  janelas.forEach(([x0, x1], i) => {
    const topo = i === 0 ? naFrente(yj1) - 0.1 : x1;
    vidroLado(o, [k(x0, yj0), k(x1, yj0), k(topo, yj1), k(x0, yj1)], zc);
    // a moldura de borracha embaixo de cada janela
    lateral(o.c, retangulo(x0 - 0.02, yj0 - 0.012, x1 + 0.02, yj0 + 0.014), zc, PRETO, 0.012, [-1, 1], 0.01, 0);
  });
  // o para-brisa e o vidro de trás
  const lF = Math.hypot(F1[0] - F0[0], F1[1] - F0[1]);
  const v0 = ((yj0 - yb) / (yj1 - yb)) * lF;
  vidroFace(o, F0, F1, zc(yj0) - 0.1, zc(yj1) - 0.1, v0 + 0.01, 0.01);
  // as colunas do para-brisa vistas de frente e a travessa do meio (para-brisa de duas folhas)
  naFace(o.c, F0, F1, retangulo(-0.03, v0, 0.03, lF), p.cima, 0.012, 0.05);
  limpadores(o, [naFrente(yj0), yj0], F1, zc(yj0) - 0.14);
  if (!p.banda) {
    o.v.add(caixa(-2.07, -2.05, yj0 + 0.02, yj1 - 0.02, -0.66, 0.66, 0, 0, '#ffffff', 1));
  }
  // a traseira: a moldura do vidro (ou a tampa lisa) e a linha da porta de trás
  cx(o.c, -2.1, -2.06, yj0, yj1, -zc(yj0) + 0.02, -0.7, p.cima, 0, 0);
  cx(o.c, -2.1, -2.06, yj0, yj1, 0.7, zc(yj0) - 0.02, p.cima, 0, 0);
  if (p.banda) cx(o.c, -2.1, -2.06, yj0, yj1, -0.7, 0.7, p.cima, 0, 0);
  cx(o.c, -2.092, -2.078, 0.5, yj0, -0.012, 0.012, FRISO, 0, 0);
  cx(o.c, -2.1, -2.075, 0.86, 0.9, 0.06, 0.2, CROMO, 0, 0);
  // o interior: o forro, o painel, o volante grande deitado e os bancos inteiriços
  cx(o.c, -2.0, 1.96, yj0 - 0.02, yj0 + 0.004, -0.8, 0.8, p.forro, 0, 0);
  cx(o.c, 1.7, 1.98, yj0, yj0 + 0.1, -0.78, 0.78, p.forro, 0.03, 0.02);
  volante(o, 1.56, yj0 + 0.2, 0.42, 0.17);
  banco(o, 1.12, yj0 - 0.04, -0.74, 0.74, p.banco, 0.36, false);
  if (!p.banda) {
    banco(o, 0.1, yj0 - 0.04, -0.74, 0.74, p.banco, 0.34, false);
    banco(o, -0.9, yj0 - 0.04, -0.74, 0.74, p.banco, 0.34, false);
  }
  // o lado: a porta da cabine, a porta de correr com o trilho, a maçaneta e a tampa do tanque
  for (const x of [0.92, 1.96]) vinco(o, x, peDaPorta(x, CH + 0.07, arcos), yb - 0.05, W);
  for (const x of [-0.1]) vinco(o, x, CH + 0.08, yb - 0.05, W);
  lateral(o.c, retangulo(-0.08, 0.66, 0.9, 0.676), W, FRISO, 0.016, [1], 0.01, 0);
  lateral(o.c, retangulo(1.0, 0.88, 1.16, 0.92, 0.012, 1), W, CROMO, 0.028);
  lateral(o.c, retangulo(0.7, 0.88, 0.86, 0.92, 0.012, 1), W, CROMO, 0.028, [1]);
  lateral(o.c, retangulo(-1.9, 0.78, -1.78, 0.9, 0.02, 1), W, p.baixo, 0.014, [-1]);
  retrovisores(o, 1.92, yj0 + 0.06, W - 0.03, p.banda ? PRETO : CROMO);
  // a frente: os faróis redondos, o pisca em cima, a gradinha baixa e o para-choque cromado
  for (const s of [-1, 1]) {
    farolRedondo(o, frenteA, frenteB, s * 0.58, 0.42, 0.13);
    naFace(o.c, frenteA, frenteB, retangulo(s > 0 ? 0.5 : -0.66, 0.6, s > 0 ? 0.66 : -0.5, 0.655, 0.015, 1), PISCA, 0.022);
  }
  naFace(o.c, frenteA, frenteB, retangulo(-0.3, 0.3, 0.3, 0.52, 0.03, 1), PRETO, 0.012);
  for (let i = 0; i < 3; i++)
    naFace(o.c, frenteA, frenteB, retangulo(-0.27, 0.33 + i * 0.062, 0.27, 0.352 + i * 0.062), CROMO, 0.02);
  cx(o.c, 2.06, 2.2, 0.26, 0.4, -W - 0.03, W + 0.03, CROMO, 0.05, 0.03);
  cx(o.c, -2.18, -2.04, 0.26, 0.4, -W - 0.03, W + 0.03, CROMO, 0.05, 0.03);
  placa(o, 2.2, 0.33, true);
  placa(o, -2.055, 0.62, false);
  // atrás: as lanternas em pé (vermelho em cima, âmbar embaixo)
  for (const s of [-1, 1]) {
    const z0 = s > 0 ? 0.66 : -0.82;
    lanterna(o, -2.075, 0.74, 0.98, z0, z0 + 0.16);
    lanterna(o, -2.075, 0.58, 0.72, z0, z0 + 0.16, PISCA, '');
  }
  antena(o, 1.9, yj0 + 0.02, -0.84, 0.9);
  rodas(o, [-1.3, 1.38], R, W - 0.01, p.banda ? 'raiada' : 'lisa', !p.banda);
  // o bagageiro no teto
  bagageiro(o, -1.7, 0.7, yt - 0.01, 0.62, 5);
  const yr = yt + 0.09;
  if (p.banda) {
    // os estojos da banda: grafite com a faixa amarela, e o amplificador pequeno
    mala(o, -1.6, -0.5, yr, 0.26, -0.5, 0.1, '#3d3c48', '#ffd23d');
    mala(o, -0.4, 0.6, yr, 0.2, -0.2, 0.5, '#3d3c48', '#ffd23d');
    cx(o.c, -1.3, -0.8, yr, yr + 0.36, 0.16, 0.56, COR.grafite, 0.03, 0.02);
    cx(o.c, -1.305, -0.795, yr + 0.3, yr + 0.33, 0.15, 0.57, '#e8c040', 0, 0);
  } else {
    // a mala de viagem, a maleta e o colchonete enrolado
    mala(o, -1.55, -0.6, yr, 0.3, -0.5, 0.2, '#9a5a32', '#5a3418');
    mala(o, -0.45, 0.4, yr, 0.2, -0.1, 0.5, '#c8a45a', '#7a4a2a');
    cx(o.c, -1.5, -0.7, yr, yr + 0.24, 0.26, 0.5, '#2f8a4a', 0.1, 0.04);
    for (const x of [-1.34, -0.9]) cx(o.c, x - 0.03, x + 0.03, yr - 0.004, yr + 0.25, 0.25, 0.51, '#f4ecdc', 0, 0);
  }
}

// ------------------------------------------------------------------ a picape

interface PinturaPicape {
  cor: string;
  faixa: [string, string];
  banco: string;
  forro: string;
}

const PINTURAS_PICAPE: PinturaPicape[] = [
  // branca com as duas faixas (laranja e marrom)
  { cor: '#f2efe6', faixa: ['#e0782a', '#7a4a2a'], banco: '#b9783e', forro: '#5a4636' },
  // verde-abacate com as faixas creme
  { cor: '#93a868', faixa: ['#f4ecdc', '#5c6e3c'], banco: '#d8c8a8', forro: '#4a5236' },
];

function picape(o: Obra, p: PinturaPicape): void {
  const W = 0.82;
  const CH = 0.27;
  const R = 0.33;
  const arcos = [
    { x: -1.12, y: R, R: 0.43 },
    { x: 1.14, y: R, R: 0.43 },
  ];
  const yb = 1.0;
  const yt = 1.56;
  const frenteA: V2 = [1.82, CH + 0.03];
  const frenteB: V2 = [1.85, 0.84];
  vol(
    o.c,
    [
      k(-1.84, CH, 0.04, 1),
      { roda: { ...arcos[0], chao: CH, seg: 8 } },
      { roda: { ...arcos[1], chao: CH, seg: 8 } },
      k(frenteA[0], CH, 0.04, 1),
      k(frenteB[0], frenteB[1], 0.04, 2),
      k(1.76, 0.93, 0.03, 1),
      k(0.6, yb, 0.03, 1),
      k(-1.86, yb, 0.03, 1),
    ],
    W,
    p.cor,
  );
  for (const r of arcos) abaDaRoda(o.c, r.x, r.y, r.R, CH, W, p.cor);
  faixaLado(o, -1.8, 1.78, CH, CH + 0.07, W, BORRACHA, arcos, 0.02);
  // a cabine quadrada (o vidro de trás em pé)
  const zc = (y: number) => 0.77 - (0.08 * Math.max(0, y - yb)) / (yt - yb);
  const A: V2 = [0.62, yb];
  const Ab: V2 = [0.22, yt];
  const Cb: V2 = [-0.46, yt];
  const C: V2 = [-0.54, yb];
  const naLinha = (a: V2, b: V2, y: number): number => a[0] + ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]);
  const yf = yt - 0.08;
  vol(o.c, [k(naLinha(A, Ab, yf), yf), k(Ab[0], yt, 0.06, 2), k(Cb[0], yt, 0.06, 2), k(naLinha(C, Cb, yf), yf)], zc, p.cor, 0.04, 2);
  coluna(o, [k(A[0], yb), k(naLinha(A, Ab, yf), yf), k(naLinha(A, Ab, yf) - 0.085, yf), k(A[0] - 0.085, yb)], zc, p.cor);
  coluna(o, [k(C[0], yb), k(C[0] + 0.12, yb), k(naLinha(C, Cb, yf) + 0.12, yf), k(naLinha(C, Cb, yf), yf)], zc, p.cor);
  const jy0 = yb + 0.03;
  vidroLado(o, [k(A[0] - 0.085, jy0), k(naLinha(A, Ab, yf) - 0.085, yf), k(naLinha(C, Cb, yf) + 0.12, yf), k(C[0] + 0.12, jy0)], zc);
  lateral(o.c, [k(A[0] - 0.02, yb - 0.005), k(C[0] + 0.02, yb - 0.005), k(C[0] + 0.02, yb + 0.03), k(A[0] - 0.02, yb + 0.03)], zc, PRETO, 0.012, [-1, 1], 0.01, 0);
  lateral(o.c, [k(naLinha(A, Ab, yf) - 0.02, yf - 0.012), k(naLinha(C, Cb, yf) + 0.02, yf - 0.012), k(naLinha(C, Cb, yf) + 0.02, yf + 0.012), k(naLinha(A, Ab, yf) - 0.02, yf + 0.012)], zc, CROMO, 0.014, [-1, 1], 0.01, 0);
  const lA = Math.hypot(Ab[0] - A[0], Ab[1] - A[1]);
  vidroFace(o, A, Ab, zc(yb) - 0.09, zc(yf) - 0.09, 0.03, lA * 0.15);
  limpadores(o, A, Ab, zc(yb) - 0.12);
  const lC = Math.hypot(Cb[0] - C[0], Cb[1] - C[1]);
  vidroFace(o, Cb, C, zc(yf) - 0.1, zc(yb) - 0.1, lC * 0.16, 0.04);
  // o interior
  cx(o.c, -0.5, 0.58, yb - 0.01, yb + 0.012, -0.68, 0.68, p.forro, 0, 0);
  cx(o.c, 0.36, 0.6, yb, yb + 0.13, -0.66, 0.66, p.forro, 0.03, 0.02);
  volante(o, 0.24, yb + 0.21, 0.34, 0.14);
  banco(o, -0.3, yb - 0.02, -0.62, 0.62, p.banco, 0.36, false);
  dadinhos(o, 0.26, yf - 0.02, '#e8302a');
  // a caçamba aberta: a borda, o fundo escuro, as ripas e a carga (caixote, isopor, bola)
  const cx0 = -1.8;
  const cx1 = -0.62;
  cx(o.c, cx0, cx1, yb - 0.005, yb + 0.01, -W + 0.09, W - 0.09, '#3a3b44', 0, 0);
  for (const s of [-1, 1]) cx(o.c, cx0 - 0.03, cx1 + 0.03, yb - 0.01, yb + 0.1, s > 0 ? W - 0.1 : -W + 0.01, s > 0 ? W - 0.01 : -W + 0.1, p.cor, 0.02, 0.012);
  cx(o.c, cx1 - 0.03, cx1 + 0.06, yb - 0.01, yb + 0.1, -W + 0.02, W - 0.02, p.cor, 0.02, 0.012);
  cx(o.c, cx0 - 0.05, cx0 + 0.04, yb - 0.01, yb + 0.1, -W + 0.02, W - 0.02, p.cor, 0.02, 0.012);
  for (let i = 0; i < 5; i++) {
    const z = -0.5 + i * 0.25;
    cx(o.c, cx0 + 0.06, cx1 - 0.04, yb + 0.008, yb + 0.02, z - 0.012, z + 0.012, '#55565f', 0, 0);
  }
  // o caixote de feira com as frutas
  cx(o.c, -1.66, -1.16, yb + 0.01, yb + 0.3, -0.56, -0.02, '#b8823e', 0.02, 0.012);
  for (const y of [0.08, 0.2]) cx(o.c, -1.67, -1.15, yb + y, yb + y + 0.035, -0.57, -0.01, '#8a5a30', 0, 0);
  for (const [x, z, c] of [
    [-1.56, -0.44, '#e8302a'],
    [-1.4, -0.42, '#f0962a'],
    [-1.26, -0.46, '#e8302a'],
    [-1.5, -0.2, '#f0962a'],
    [-1.32, -0.18, '#ffd23d'],
  ] as const)
    cx(o.c, x - 0.07, x + 0.07, yb + 0.26, yb + 0.37, z - 0.07, z + 0.07, c, 0.03, 0.025);
  // o isopor de tampa azul
  cx(o.c, -1.2, -0.76, yb + 0.01, yb + 0.3, 0.1, 0.56, '#f6f4ee', 0.03, 0.02);
  cx(o.c, -1.22, -0.74, yb + 0.3, yb + 0.37, 0.08, 0.58, '#2f8cff', 0.03, 0.02);
  // a bola de praia de gomos (facetada)
  cx(o.c, -1.68, -1.38, yb + 0.01, yb + 0.31, 0.16, 0.46, '#f6f4ee', 0.1, 0.08);
  cx(o.c, -1.685, -1.375, yb + 0.1, yb + 0.22, 0.155, 0.465, COR.vermelho, 0.03, 0.03);
  // o lado: as duas faixas (a de cor e a fina), a porta, a maçaneta e os ganchos da caçamba
  faixaLado(o, -1.78, 1.76, 0.62, 0.71, W, p.faixa[0], arcos, 0.014);
  faixaLado(o, -1.78, 1.76, 0.735, 0.76, W, p.faixa[1], arcos, 0.014);
  const cint = yb - 0.06;
  for (const x of [0.6, -0.56]) vinco(o, x, peDaPorta(x, CH + 0.07, arcos), cint, W);
  lateral(o.c, retangulo(-0.46, 0.84, -0.3, 0.88, 0.012, 1), W, CROMO, 0.028);
  lateral(o.c, retangulo(-0.86, 0.78, -0.74, 0.9, 0.02, 1), W, p.cor, 0.014, [1]);
  for (const x of [-1.6, -0.9]) lateral(o.c, retangulo(x - 0.03, yb - 0.1, x + 0.03, yb - 0.06), W, CROMO, 0.03);
  retrovisores(o, 0.5, yb + 0.02, W - 0.05, CROMO);
  // a frente: a grade cromada de frisos, os faróis quadrados e o para-choque de cromo
  naFace(o.c, frenteA, frenteB, retangulo(-0.4, 0.24, 0.4, 0.5, 0.02, 1), PRETO, 0.012);
  for (let i = 0; i < 4; i++)
    naFace(o.c, frenteA, frenteB, retangulo(-0.37, 0.265 + i * 0.058, 0.37, 0.287 + i * 0.058), CROMO, 0.02);
  for (const s of [-1, 1]) {
    farolQuadrado(o, frenteA, frenteB, s * 0.57, 0.39, 0.22, 0.2);
    naFace(o.c, frenteA, frenteB, retangulo(s > 0 ? 0.46 : -0.68, 0.19, s > 0 ? 0.68 : -0.46, 0.235), PISCA, 0.022);
  }
  cx(o.c, 1.78, 1.94, 0.27, 0.42, -W - 0.03, W + 0.03, CROMO, 0.04, 0.025);
  placa(o, 1.94, 0.345, true);
  // atrás: a tampa da caçamba com a linha, as lanternas em pé e o para-choque
  cx(o.c, -1.868, -1.852, 0.5, yb + 0.06, -W + 0.1, W - 0.1, p.cor, 0, 0);
  cx(o.c, -1.875, -1.865, 0.52, 0.535, -W + 0.12, W - 0.12, FRISO, 0, 0);
  cx(o.c, -1.885, -1.86, 0.84, 0.88, -0.1, 0.1, CROMO, 0, 0);
  for (const s of [-1, 1]) {
    const z0 = s > 0 ? W - 0.16 : -W + 0.02;
    lanterna(o, -1.86, 0.66, 0.92, z0, z0 + 0.14);
    lanterna(o, -1.86, 0.54, 0.64, z0, z0 + 0.14, PISCA, '');
  }
  cx(o.c, -1.96, -1.82, 0.27, 0.42, -W - 0.03, W + 0.03, CROMO, 0.04, 0.025);
  placa(o, -1.96, 0.345, false);
  antena(o, 1.0, 0.96, -0.62);
  rodas(o, [-1.12, 1.14], R, W - 0.01, 'raiada');
}

// ------------------------------------------------------------------ a entrada

/** Leva a obra (x para a frente) para o referencial da peça (z para a frente). */
function entregar(r: Ref, o: Obra): void {
  const levar = (pecas: Pecas, destino: Pecas) => {
    for (const vd of pecas.partes) {
      const P = vd.positions as number[];
      const N = vd.normals as number[];
      for (let i = 0; i < P.length; i += 3) {
        [P[i], P[i + 2]] = [P[i + 2], P[i]];
        [N[i], N[i + 2]] = [N[i + 2], N[i]];
      }
      r.levar(orientar(vd), destino);
    }
  };
  levar(o.c, r.d.corpo);
  levar(o.n, r.d.noite);
  levar(o.v, r.d.vidro);
}

/** O carro parado: `n` par é o hatch em cunha, ímpar o carrinho bolha (três pinturas cada). */
export function carroVila(r: Ref, n: number, deLonge: boolean | 2 = false): void {
  const o = novaObra();
  const qual = (n >> 1) % 3;
  longe = !!deLonge;
  muitoLonge = deLonge === 2;
  try {
    if (n % 2 === 0) hatch(o, PINTURAS_HATCH[qual]);
    else bolha(o, PINTURAS_BOLHA[qual]);
  } finally {
    longe = false;
    muitoLonge = false;
  }
  entregar(r, o);
}

/** A van pão de forma: 0 e 2 as da rua, 1 a da banda (grafite, com o raio vermelho). */
export function vanVila(r: Ref, n: number, deLonge: boolean | 2 = false): void {
  const o = novaObra();
  const p = PINTURAS_VAN[n % PINTURAS_VAN.length];
  longe = !!deLonge;
  muitoLonge = deLonge === 2;
  try {
    van(o, p);
  } finally {
    longe = false;
    muitoLonge = false;
  }
  entregar(r, o);
  if (p.banda)
    // o raio vermelho de beira amarela dos dois lados do baú
    for (const q of [1, 3]) {
      const s = r.sub(q === 1 ? 0.9 : -0.9, 1.5, -0.62, q);
      s.placa(perfilRaio(0.9), 0.03, 0, 0, 0, COR.amarelo);
      s.placa(perfilRaio(0.7), 0.03, 0.012, 0, 0.012, COR.vermelho);
    }
}

/** A picape de caçamba aberta (duas pinturas). */
export function picapeVila(r: Ref, n: number, deLonge: boolean | 2 = false): void {
  const o = novaObra();
  longe = !!deLonge;
  muitoLonge = deLonge === 2;
  try {
    picape(o, PINTURAS_PICAPE[n % PINTURAS_PICAPE.length]);
  } finally {
    longe = false;
    muitoLonge = false;
  }
  entregar(r, o);
}

/** Triângulos de cada modelo (medida para o orçamento do celular). */
export function triangulosDosCarros(deLonge: boolean | 2 = false): Record<string, number> {
  const conta = (f: (o: Obra) => void) => {
    const o = novaObra();
    longe = !!deLonge;
    muitoLonge = deLonge === 2;
    try {
      f(o);
    } finally {
      longe = false;
    }
    return [o.c, o.n, o.v].reduce(
      (t, p) => t + p.partes.reduce((s, vd: VertexData) => s + vd.indices!.length / 3, 0),
      0,
    );
  };
  return {
    hatch: conta((o) => hatch(o, PINTURAS_HATCH[0])),
    bolha: conta((o) => bolha(o, PINTURAS_BOLHA[0])),
    van: conta((o) => van(o, PINTURAS_VAN[0])),
    picape: conta((o) => picape(o, PINTURAS_PICAPE[0])),
  };
}
