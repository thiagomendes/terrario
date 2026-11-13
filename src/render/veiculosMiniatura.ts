/**
 * Os veículos da Cidade Grande em "miniatura" (014d, escolha do dono: o estilo C do esboço; antes
 * o 014c esculpia uma carroceria de "pão" e o dono achou redondo demais): carrinho de metal
 * fundido bem feito. Volumes que se leem de longe (capô, cabine com colunas, teto, para-choques,
 * grade, caixas de roda recortadas), painéis planos e quinas com bisel firme, nas proporções de
 * veículos de verdade, simplificadas. Mesmas rodas (lugar e raio), cores e escala de antes: o
 * movimento (suspensão, rolagem, esterço) não muda.
 *
 * Os estilos A ("Fundido", bisel leve) e B ("Madeirinha", médio) ficam só para o esboço
 * (`?esboco=estetica`). Cada modelo sai em duas versões: a de perto (detalhes, luzes por
 * instância) e a de longe (os mesmos volumes, cores e silhueta, sem bisel nem miudezas, com as
 * rodas e as luzes pintadas nela).
 */
import { Matrix } from '@babylonjs/core/Maths/math.vector';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { CreateSphereVertexData } from '@babylonjs/core/Meshes/Builders/sphereBuilder';
import { CreateCylinderVertexData } from '@babylonjs/core/Meshes/Builders/cylinderBuilder';
import { MEDIDAS, MODELO_DO_TIPO, type TipoVeiculo } from '../jogo/veiculos';
import type { Luz, Roda } from './veiculosModelos';
import { Pecas, caixa, deitada, noPlano, retangulo, solido, type Canto, type Item, type V2, type V3 } from './solidos';

/** Um modelo pronto (já na escala do jogo). */
export interface ModeloMiniatura {
  corpo: VertexData;
  luzes: Luz[];
  rodas: Roda[];
  triangulos: number;
  /** Entre-eixos (já na escala): a conta do esterço das rodas da frente. */
  entreEixos: number;
  /** A porta do ônibus: vértices de `ini` a `fim` (exclusivo). */
  porta?: { ini: number; fim: number };
}

export type IdEstilo = 'A' | 'B' | 'C';
export interface Estilo {
  id: IdEstilo;
  nome: string;
  /** Bisel das quinas dos volumes grandes e os passos dele. */
  b: number;
  sb: number;
  /** Raio dos cantos da silhueta (multiplicado pelo peso de cada canto) e os passos. */
  r: number;
  rs: number;
  /** Bisel das peças pequenas (para-choque, espelho, placa do táxi). */
  bp: number;
  /** Quanto a cabine entra para dentro em cima (tumblehome). */
  entra: number;
  /** Largura das colunas das janelas. */
  coluna: number;
  /** Para-lamas em aba em volta das rodas. */
  abas: boolean;
}

export const ESTILOS: Record<IdEstilo, Estilo> = {
  A: { id: 'A', nome: 'Fundido', b: 0.025, sb: 1, r: 0.04, rs: 1, bp: 0.01, entra: 0.1, coluna: 0.08, abas: false },
  B: { id: 'B', nome: 'Madeirinha', b: 0.14, sb: 3, r: 0.22, rs: 3, bp: 0.03, entra: 0.1, coluna: 0.11, abas: false },
  C: ESTILOS_C(),
};

export type TipoFirme = Exclude<TipoVeiculo, never>;

const VIDRO = '#9fd6ef';
const VIDRO_ESCURO = '#7fbfe0';
const CROMO = '#dfe3ea';
const CINZA = '#d9dde3';
const GRADE = '#2f3038';
const FRISO = '#24252c';

interface Obra {
  e: Estilo;
  p: Pecas;
  luzes: Luz[];
  rodas: Roda[];
  porta?: { ini: number; fim: number };
  /** A versão de longe: sem bisel nem miudezas, luzes e rodas pintadas na carroceria. */
  longe: boolean;
}

/** O estilo da versão de longe: o C sem bisel e com os cantos num passo só. */
const LONGE: Estilo = { ...ESTILOS_C(), b: 0, sb: 0, rs: 1, bp: 0, abas: false };
function ESTILOS_C(): Estilo {
  return { id: 'C', nome: 'Miniatura', b: 0.055, sb: 2, r: 0.12, rs: 3, bp: 0.016, entra: 0.14, coluna: 0.09, abas: true };
}
const novaObra = (e: Estilo, longe = false): Obra => ({ e: longe ? LONGE : e, p: new Pecas(), luzes: [], rodas: [], longe });
/** Miudezas (vincos, maçanetas, espelhos, degraus) só na versão de perto. */
const perto = (o: Obra) => !o.longe;
const R = (o: Obra, k: number) => o.e.r * k;
/** Canto do contorno com o raio do estilo. */
const k = (o: Obra, x: number, y: number, peso: number): Canto => ({ x, y, r: R(o, peso), seg: o.e.rs });
/** Volume grande: o contorno puxado na largura com o bisel do estilo. */
function volume(o: Obra, perfil: Item[], z1: number | ((y: number) => number), cor: string): void {
  const f = typeof z1 === 'number' ? () => z1 : z1;
  if (o.longe) perfil = perfil.map((it) => ('roda' in it ? { roda: { ...it.roda, seg: 6 } } : it));
  o.p.add(solido({ perfil, z0: (y) => -f(y), z1: f, bisel: o.e.b, segBisel: o.e.sb, cor }));
}
/** Peça pequena (para-choque, espelho, placa): caixa com o bisel das peças. */
function peca(o: Obra, x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, cor: string, peso = 0.5) {
  const menor = Math.min(x1 - x0, y1 - y0, z1 - z0);
  const b = Math.min(o.e.bp * 2, menor * 0.3);
  const r = Math.min(R(o, peso), (Math.min(x1 - x0, y1 - y0) / 2) * 0.9);
  if (o.longe) {
    o.p.add(caixa(x0, x1, y0, y1, z0, z1, 0, 0, cor));
    return;
  }
  o.p.add(caixa(x0, x1, y0, y1, z0, z1, Math.max(r, b + 0.005), b, cor, o.e.id === 'A' ? 1 : 2));
}
const PLACA_B = 0.006;
/** Decalque/vidro no lado: o contorno (x, y) colado na face z = ±zs(y), um tico para fora. */
function lateral(
  o: Obra,
  perfil: Item[],
  zs: number | ((y: number) => number),
  cor: string,
  lados: number[] = [-1, 1],
  sai = 0.014,
  bisel = PLACA_B,
): void {
  const f = typeof zs === 'number' ? () => zs : zs;
  if (o.longe) perfil = semCantos(perfil);
  for (const s of lados)
    o.p.add(
      solido({
        perfil,
        z0: s > 0 ? (y) => f(y) - 0.01 : (y) => -f(y) - sai,
        z1: s > 0 ? (y) => f(y) + sai : (y) => -f(y) + 0.01,
        bisel: o.longe ? 0 : bisel,
        segBisel: 1,
        cor,
      }),
    );
}
/**
 * Decalque/vidro numa face inclinada do contorno, de `a` para `b` (no sentido do contorno):
 * o perfil vem em (u = z do carro, v = distância de `a` ao longo da face).
 */
function naFace(o: Obra, a: V2, b: V2, perfil: Item[], cor: string, sai = 0.014): void {
  const d = [b[0] - a[0], b[1] - a[1]];
  const l = Math.hypot(d[0], d[1]);
  const v: V3 = [d[0] / l, d[1] / l, 0];
  const n: V3 = [v[1], -v[0], 0];
  if (o.longe) perfil = semCantos(perfil);
  const vd = solido({ perfil, z0: -0.01, z1: sai, bisel: o.longe ? 0 : PLACA_B, segBisel: 1, cor });
  o.p.add(noPlano(vd, [a[0], a[1], 0], [0, 0, 1], v, n));
}
/** De longe, os decalques e vidros de cantos vivos (poucos triângulos). */
const semCantos = (perfil: Item[]): Item[] => perfil.map((it) => ('roda' in it ? it : { x: it.x, y: it.y }));
/** Faixa que abraça um volume (vista de cima: retângulo com os cantos do bisel). */
function faixa(o: Obra, x0: number, x1: number, hw: number, y0: number, y1: number, cor: string): void {
  const g = 0.012;
  const rc = o.longe ? 0 : o.e.b + g;
  o.p.add(deitada(retangulo(x0 - g, -hw - g, x1 + g, hw + g, rc, Math.max(2, o.e.sb + 1)), y0, y1, o.longe ? 0 : 0.006, cor));
}
/** Retângulo trapézio (contorno com cantos `r`). */
const trap = (pts: V2[], r: number, seg = 2): Canto[] => pts.map(([x, y]) => ({ x, y, r, seg }));

/** O fundo da porta: o contorno de baixo contorna as caixas de roda (com folga). */
function painelSemRodas(x0: number, x1: number, y0: number, y1: number, rodas: { x: number; y: number; R: number }[]): Canto[] {
  const baixo = (x: number) => {
    let y = y0;
    for (const r of rodas) {
      const d = Math.abs(x - r.x);
      if (d < r.R) y = Math.max(y, r.y + Math.sqrt(r.R * r.R - d * d));
    }
    return y;
  };
  const pts: Canto[] = [];
  const n = 14;
  for (let i = 0; i <= n; i++) {
    const x = x0 + ((x1 - x0) * i) / n;
    pts.push({ x, y: baixo(x) });
  }
  pts.push({ x: x1, y: y1 }, { x: x0, y: y1 });
  return pts;
}

/** A linha que passa por cima das rodas (sobe em arco com folga), de x0 a x1, amostrada. */
function sobreRodas(x0: number, x1: number, y: number, rodas: { x: number; y: number; R: number }[], folga: number, n = 44): Canto[] {
  // (a de longe usa poucas amostras: quem chama passa n)
  const pts: Canto[] = [];
  for (let i = 1; i < n; i++) {
    const x = x0 + ((x1 - x0) * i) / n;
    let yy = y;
    for (const r of rodas) {
      const R1 = r.R + folga;
      const d = Math.abs(x - r.x);
      if (d < R1) yy = Math.max(yy, r.y + Math.sqrt(R1 * R1 - d * d));
    }
    pts.push({ x, y: yy, suave: true });
  }
  return pts;
}

/** Aba do para-lama (estilo C): um arco de lataria um tico para fora em volta da roda. */
function abaDaRoda(o: Obra, x: number, y: number, R0: number, chao: number, zs: number, cor: string, larg = 0.075): void {
  const R1 = R0 + larg;
  const a0 = Math.asin(Math.max(-0.99, (chao - y) / R1));
  const b0 = Math.asin(Math.max(-0.99, (chao - y) / R0));
  const pts: Canto[] = [];
  const n = 12;
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((Math.PI - 2 * a0) * i) / n;
    pts.push({ x: x + Math.cos(a) * R1, y: y + Math.sin(a) * R1 });
  }
  for (let i = n; i >= 0; i--) {
    const a = b0 + ((Math.PI - 2 * b0) * i) / n;
    pts.push({ x: x + Math.cos(a) * R0, y: y + Math.sin(a) * R0 });
  }
  for (const s of [-1, 1])
    o.p.add(
      solido({
        perfil: pts,
        z0: s > 0 ? zs - 0.02 : -zs - 0.03,
        z1: s > 0 ? zs + 0.03 : -zs + 0.02,
        bisel: 0.012,
        segBisel: 1,
        cor,
      }),
    );
}

/** Vincos (linhas das portas): risquinhos escuros no lado. */
function vinco(o: Obra, x: number, y0: number, y1: number, zs: number | ((y: number) => number)): void {
  if (!perto(o)) return;
  lateral(o, retangulo(x - 0.009, y0, x + 0.009, y1), zs, FRISO, [-1, 1], 0.02, 0);
}

/** Grade com frisos cromados e o farol com aro, na face da frente (de `a` para `b`). */
function frente(
  o: Obra,
  a: V2,
  b: V2,
  grade: { v0: number; v1: number; u: number; frisos: number },
  farol: { v: number; u: number; w: number; h: number },
): void {
  naFace(o, a, b, retangulo(-grade.u, grade.v0, grade.u, grade.v1, 0.03, 1), GRADE, 0.012);
  if (o.longe) {
    // de longe, os faróis pintados (a luz por instância é só da versão de perto)
    for (const s of [-1, 1]) {
      const uc = s * farol.u;
      naFace(o, a, b, retangulo(uc - farol.w / 2, farol.v - farol.h / 2, uc + farol.w / 2, farol.v + farol.h / 2), '#fff4d6', 0.02);
    }
    return;
  }
  for (let i = 1; i <= grade.frisos; i++) {
    const v = grade.v0 + ((grade.v1 - grade.v0) * i) / (grade.frisos + 1);
    naFace(o, a, b, retangulo(-grade.u * 0.92, v - 0.014, grade.u * 0.92, v + 0.014, 0.01, 1), CROMO, 0.024);
  }
  const d = [b[0] - a[0], b[1] - a[1]];
  const l = Math.hypot(d[0], d[1]);
  const n: V2 = [d[1] / l, -d[0] / l];
  for (const s of [-1, 1]) {
    const uc = s * farol.u;
    naFace(o, a, b, retangulo(uc - farol.w / 2 - 0.03, farol.v - farol.h / 2 - 0.03, uc + farol.w / 2 + 0.03, farol.v + farol.h / 2 + 0.03, 0.04, 2), CROMO, 0.014);
    const p: V2 = [a[0] + (d[0] / l) * farol.v, a[1] + (d[1] / l) * farol.v];
    o.luzes.push({ tipo: 'farol', pos: [p[0] + n[0] * 0.012, p[1] + n[1] * 0.012, uc], raio: [0.03, farol.h / 2, farol.w / 2] });
  }
}

function lanternas(o: Obra, x: number, y: number, z: number, w = 0.12, h = 0.075): void {
  if (o.longe) {
    for (const s of [-1, 1]) o.p.add(caixa(x - 0.03, x + 0.03, y - h, y + h, s * z - w, s * z + w, 0, 0, '#d8443c'));
    return;
  }
  for (const s of [-1, 1]) o.luzes.push({ tipo: 'lanterna', pos: [x, y, s * z], raio: [0.035, h, w] });
}

/** Barra de luzinhas no teto: base clara e as luzes (instâncias que piscam). */
function barraDeLuz(o: Obra, x: number, y: number, larg: number, cores: Luz['tipo'][]): void {
  peca(o, x - 0.15, x + 0.15, y, y + 0.08, -larg / 2, larg / 2, '#f4f5f8', 0.3);
  const PINTADA: Record<Luz['tipo'], string> = {
    farol: '#fff4d6',
    lanterna: '#d8443c',
    giroAzul: '#6fa8ff',
    giroBranco: '#e9f1ff',
    giroVermelho: '#ff6a5e',
  };
  cores.forEach((t, i) => {
    const z = (i - (cores.length - 1) / 2) * (larg / cores.length);
    const w = (larg / cores.length) * 0.44;
    if (o.longe) return o.p.add(caixa(x - 0.12, x + 0.12, y + 0.08, y + 0.2, z - w, z + w, 0, 0, PINTADA[t]));
    o.luzes.push({ tipo: t, pos: [x, y + 0.12, z], raio: [0.12, 0.065, (larg / cores.length) * 0.44] });
  });
}

function espelhos(o: Obra, x: number, y: number, zs: number, cor: string, alto = 0.13): void {
  if (!perto(o)) return;
  for (const s of [-1, 1]) {
    const z0 = s > 0 ? zs - 0.02 : -zs - 0.13;
    peca(o, x - 0.06, x + 0.07, y, y + alto, z0, z0 + 0.15, cor, 0.3);
  }
}

function fechar(o: Obra, tipo: TipoVeiculo, entreEixos: number): ModeloMiniatura {
  const e = MEDIDAS[MODELO_DO_TIPO[tipo]].escala;
  if (o.longe)
    // de longe, as rodas pintadas: um octógono escuro com o miolo claro
    for (const r of o.rodas) {
      const oito: Canto[] = [];
      const meio: Canto[] = [];
      for (let i = 0; i < 8; i++) {
        const a = ((i + 0.5) * Math.PI) / 4;
        oito.push({ x: r.x + Math.cos(a) * r.raio, y: r.raio + Math.sin(a) * r.raio });
        meio.push({ x: r.x + Math.cos(a) * r.raio * 0.45, y: r.raio + Math.sin(a) * r.raio * 0.45 });
      }
      const s = Math.sign(r.z);
      const z0 = r.z - r.raio * 0.3;
      const z1 = r.z + r.raio * 0.3;
      o.p.add(solido({ perfil: oito, z0, z1, bisel: 0, segBisel: 0, cor: '#2a2b33' }));
      o.p.add(solido({ perfil: meio, z0: s > 0 ? z1 - 0.01 : z0 - 0.02, z1: s > 0 ? z1 + 0.02 : z0 + 0.01, bisel: 0, segBisel: 0, cor: '#eef0f4' }));
    }
  const corpo = o.p.juntar();
  corpo.transform(Matrix.Scaling(e, e, e));
  return {
    corpo,
    luzes: o.luzes.map((l) => ({
      tipo: l.tipo,
      pos: [l.pos[0] * e, l.pos[1] * e, l.pos[2] * e],
      raio: [l.raio[0] * e, l.raio[1] * e, l.raio[2] * e],
    })),
    rodas: o.rodas.map((r) => ({ x: r.x * e, z: r.z * e, raio: r.raio * e })),
    triangulos: corpo.indices!.length / 3,
    entreEixos: entreEixos * e,
    porta: o.porta,
  };
}

// ------------------------------------------------------------------ sedã (táxi, carro, polícia)

function seda(e: Estilo, tipo: 'taxi' | 'civil' | 'policia', cor: string, longe = false): ModeloMiniatura {
  const o = novaObra(e, longe);
  e = o.e;
  const PRETO = '#2b2d35';
  const BRANCO = '#f7f8fb';
  const corpo = tipo === 'taxi' ? '#ffc21a' : tipo === 'policia' ? PRETO : cor;
  const cabine = tipo === 'policia' ? BRANCO : corpo;
  const W = 0.86;
  const CH = 0.34;
  const rodas = [
    { x: -0.9, y: 0.47, R: 0.55 },
    { x: 0.9, y: 0.47, R: 0.55 },
  ];
  // a parte de baixo: para-choques, capô baixando para a frente, a cintura e o porta-malas
  volume(
    o,
    [
      k(o, -1.5, CH, 0.5),
      { roda: { ...rodas[0], chao: CH } },
      { roda: { ...rodas[1], chao: CH } },
      k(o, 1.56, CH, 0.5),
      k(o, 1.6, 0.84, 1.1),
      k(o, 0.62, 1.12, 0.4),
      k(o, -1.16, 1.15, 0.4),
      k(o, -1.52, 1.08, 1.0),
    ],
    W,
    corpo,
  );
  if (e.abas) for (const r of rodas) abaDaRoda(o, r.x, r.y, r.R, CH, W, corpo);
  // a cabine: para-brisa deitado, teto reto, vidro de trás; entra para dentro em cima
  const yb = 1.06;
  const yt = 1.82;
  const zc = (y: number) => 0.77 - (e.entra * Math.max(0, y - yb)) / (yt - yb);
  const A: V2 = [0.68, yb];
  const Ab: V2 = [0.06, yt];
  const Cb: V2 = [-0.64, yt];
  const C: V2 = [-1.04, yb];
  volume(o, [{ x: C[0], y: yb }, { x: A[0], y: yb }, k(o, Ab[0], yt, 1.0), k(o, Cb[0], yt, 1.0)], zc, cabine);
  // janelas do lado: a da frente e a de trás, com a coluna do meio
  const xA = (y: number) => A[0] + ((Ab[0] - A[0]) * (y - yb)) / (yt - yb);
  const xC = (y: number) => C[0] + ((Cb[0] - C[0]) * (y - yb)) / (yt - yb);
  const cl = e.coluna;
  const j0 = 1.25;
  const j1 = yt - 0.1 - R(o, 1.0) * 0.35;
  const rj = Math.min(0.06, 0.025 + R(o, 0.25));
  lateral(o, trap([[-0.22 + cl / 2, j0], [xA(j0) - cl * 1.3, j0], [xA(j1) - cl * 1.3, j1], [-0.22 + cl / 2, j1]], rj), zc, VIDRO);
  lateral(o, trap([[xC(j0) + cl * 1.3, j0], [-0.22 - cl / 2, j0], [-0.22 - cl / 2, j1], [xC(j1) + cl * 1.3, j1]], rj), zc, VIDRO);
  // para-brisa e vidro de trás
  const vid = (a: V2, b: V2, v0: number, v1: number) => {
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const ya = (v: number) => a[1] + ((b[1] - a[1]) * v) / l;
    const hw0 = zc(ya(v0)) - cl * 1.1 - e.b;
    const hw1 = zc(ya(l - v1)) - cl * 1.1 - e.b;
    naFace(o, a, b, trap([[-hw0, v0], [hw0, v0], [hw1, l - v1], [-hw1, l - v1]], rj), VIDRO_ESCURO);
  };
  vid(A, Ab, 0.16, R(o, 1.0) + 0.08);
  vid(Cb, C, R(o, 1.0) + 0.08, 0.14);
  // portas: na polícia, brancas (o preto e branco clássico); os vincos e as maçanetas
  const cint = 1.12 - e.b - 0.02;
  const fundo = rodas.map((r) => ({ ...r, R: r.R + 0.06 }));
  if (tipo === 'policia') {
    lateral(o, painelSemRodas(-1.0, 0.6, 0.4, cint, fundo), W, BRANCO, [-1, 1], 0.012);
    const est: Canto[] = [];
    for (let i = 0; i < 10; i++) {
      const a = Math.PI / 2 + (i * Math.PI) / 5;
      const rr = i % 2 ? 0.055 : 0.13;
      est.push({ x: 0.2 + Math.cos(a) * rr, y: 0.74 + Math.sin(a) * rr });
    }
    lateral(o, est, W, '#ffd23f', [-1, 1], 0.026);
  }
  for (const x of [0.6, -0.22, -1.0]) {
    const pe = fundo.reduce((y, r) => (Math.abs(x - r.x) < r.R ? Math.max(y, r.y + Math.sqrt(r.R ** 2 - (x - r.x) ** 2)) : y), 0.4);
    vinco(o, x, pe, cint, W);
  }
  if (perto(o)) for (const x of [0.36, -0.46]) lateral(o, retangulo(x - 0.07, 0.95, x + 0.07, 0.99, 0.015, 1), W, CROMO, [-1, 1], 0.03);
  espelhos(o, 0.55, 1.12, W, corpo);
  // a frente: grade, faróis com aro e o para-choque; atrás, lanternas e para-choque
  frente(o, [1.56, CH], [1.6, 0.84], { v0: 0.2, v1: 0.38, u: 0.4, frisos: 2 }, { v: 0.39, u: 0.6, w: 0.24, h: 0.12 });
  peca(o, 1.48, 1.63, 0.28, 0.48, -0.89, 0.89, CINZA, 0.6);
  peca(o, -1.6, -1.44, 0.28, 0.48, -0.89, 0.89, CINZA, 0.6);
  lanternas(o, -1.535, 0.92, 0.6);
  if (tipo === 'taxi') {
    // a faixa xadrez nas portas e a placa no teto (de longe, uma faixa escura só)
    if (o.longe) lateral(o, retangulo(-0.98, cint - 0.1, 0.62, cint - 0.02), W, FRISO, [-1, 1], 0.014);
    else for (let i = 0; i < 16; i++) {
      const x0 = -0.98 + i * 0.1;
      lateral(o, retangulo(x0, cint - 0.12, x0 + 0.1, cint), W, i % 2 ? FRISO : '#fbf8ee', [-1, 1], 0.014, 0);
    }
    peca(o, -0.68, -0.08, yt - 0.03, yt + 0.04, -0.19, 0.19, FRISO, 0.2);
    peca(o, -0.66, -0.1, yt + 0.03, yt + 0.25, -0.17, 0.17, '#fff7d6', 0.6);
  }
  if (tipo === 'policia') barraDeLuz(o, -0.36, yt - 0.01, 1.04, ['giroAzul', 'giroBranco']);
  for (const x of [-0.9, 0.9]) for (const z of [-0.66, 0.66]) o.rodas.push({ x, z, raio: 0.47 });
  return fechar(o, tipo, 1.8);
}

// ------------------------------------------------------------------ ônibus de dois andares

function onibus(e: Estilo, longe = false, AZUL = '#2f7fd8'): ModeloMiniatura {
  const o = novaObra(e, longe);
  e = o.e;
  const BRANCO = '#f7f5ef';
  const CH = 0.34;
  const rodas = [
    { x: -1.75, y: 0.52, R: 0.62 },
    { x: 1.75, y: 0.52, R: 0.62 },
  ];
  // a saia azul (com as caixas de roda) e a caixa branca dos dois andares por cima
  volume(
    o,
    [
      k(o, -2.84, CH, 0.5),
      { roda: { ...rodas[0], chao: CH } },
      { roda: { ...rodas[1], chao: CH } },
      k(o, 2.88, CH, 0.5),
      k(o, 2.88, 1.34, 0.3),
      k(o, -2.84, 1.34, 0.3),
    ],
    0.99,
    AZUL,
  );
  if (e.abas) for (const r of rodas) abaDaRoda(o, r.x, r.y, r.R, CH, 0.99, AZUL, 0.08);
  const zb = (y: number) => 0.975 - (0.03 * Math.max(0, y - 1.3)) / 2.7;
  const frenteX = (y: number) => 2.86 - (0.03 * (y - 1.3)) / 2.7;
  volume(o, [{ x: -2.82, y: 1.3 }, { x: 2.86, y: 1.3 }, k(o, 2.83, 4.0, 2.0), k(o, -2.8, 4.0, 2.0)], zb, BRANCO);
  faixa(o, -2.81, frenteX(2.7), zb(2.7), 2.6, 2.82, AZUL);
  // janelas dos dois andares (a porta fica do lado direito, o da calçada, atrás da roda da frente)
  const cols: [number, number][] = [
    [-2.45, -1.55],
    [-1.4, -0.5],
    [-0.35, 0.55],
    [0.7, 1.6],
    [1.75, 2.55],
  ];
  const direitaBaixo: [number, number][] = [
    [-2.45, -1.55],
    [-1.4, -0.5],
    [-0.35, 0.12],
    [1.2, 2.55],
  ];
  const rj = Math.min(0.08, 0.03 + R(o, 0.3));
  for (const [a, b] of cols) lateral(o, retangulo(a, 1.6, b, 2.3, rj), zb, VIDRO, [1]);
  for (const [a, b] of direitaBaixo) lateral(o, retangulo(a, 1.6, b, 2.3, rj), zb, VIDRO, [-1]);
  for (const [a, b] of cols) lateral(o, retangulo(a, 3.06, b, 3.72, rj), zb, VIDRO);
  // a porta (de vidro, duas folhas) desliza para trás no ponto
  const ini = o.p.marca;
  lateral(o, retangulo(0.3, 0.44, 1.06, 2.34, 0.05), zb, '#cfe8f5', [-1], 0.022);
  lateral(o, retangulo(0.672, 0.44, 0.688, 2.34), zb, FRISO, [-1], 0.03);
  o.porta = { ini, fim: o.p.marca };
  // a frente reta com o para-brisa grande, o letreiro e o vidro de cima
  const fa: V2 = [2.86, 1.3];
  const fb: V2 = [2.83, 4.0];
  const L = Math.hypot(fb[0] - fa[0], fb[1] - fa[1]);
  naFace(o, fa, fb, retangulo(-0.84, 0.26, 0.84, 1.2, rj), VIDRO_ESCURO);
  naFace(o, fa, fb, retangulo(-0.62, 1.58, 0.62, 1.78, 0.03), FRISO);
  naFace(o, fa, fb, retangulo(-0.55, 1.62, 0.55, 1.74, 0.02), '#ffcf5a', 0.022);
  naFace(o, fa, fb, retangulo(-0.84, 1.84, 0.84, Math.min(2.44, L - R(o, 2.0) - 0.06), rj), VIDRO_ESCURO);
  frente(o, [2.88, CH], [2.88, 1.34], { v0: 0.28, v1: 0.56, u: 0.5, frisos: 2 }, { v: 0.72, u: 0.7, w: 0.26, h: 0.14 });
  peca(o, 2.8, 2.96, 0.28, 0.56, -0.97, 0.97, CINZA, 0.6);
  peca(o, -2.94, -2.76, 0.28, 0.56, -0.97, 0.97, CINZA, 0.6);
  espelhos(o, 2.84, 2.05, 0.975, FRISO, 0.3);
  // atrás: o vidro de cima e a grade do motor
  naFace(o, [-2.8, 4.0], [-2.82, 1.3], retangulo(-0.8, Math.max(0.34, R(o, 2.0) + 0.06), 0.8, 0.92, rj), VIDRO_ESCURO);
  naFace(o, [-2.84, 1.34], [-2.84, CH], retangulo(-0.5, 0.3, 0.5, 0.6, 0.03), GRADE);
  lanternas(o, -2.855, 1.04, 0.72, 0.12, 0.09);
  for (const x of [-1.75, 1.75]) for (const z of [-0.8, 0.8]) o.rodas.push({ x, z, raio: 0.52 });
  return fechar(o, 'onibusAzul', 3.5);
}

// ------------------------------------------------------------------ bombeiros

function bombeiros(e: Estilo, longe = false): ModeloMiniatura {
  const o = novaObra(e, longe);
  e = o.e;
  const VERMELHO = '#e2392f';
  const BRANCO = '#f7f5ef';
  const CH = 0.36;
  const rT = { x: -1.75, y: 0.52, R: 0.62 };
  const rF = { x: 1.75, y: 0.52, R: 0.62 };
  // o chassi escuro aparece no vão entre a cabine e a carroceria
  peca(o, -2.7, 2.7, 0.36, 0.74, -0.6, 0.6, '#2c2d35', 0.2);
  // a carroceria dos equipamentos e a cabine avançada (frente reta), separadas
  volume(o, [k(o, -2.82, CH, 0.5), { roda: { ...rT, chao: CH } }, k(o, 1.02, CH, 0.3), k(o, 1.02, 2.3, 0.6), k(o, -2.82, 2.3, 0.6)], 0.97, VERMELHO);
  const fa: V2 = [2.88, 1.7];
  const fb: V2 = [2.78, 2.95];
  volume(o, [k(o, 1.1, CH, 0.3), { roda: { ...rF, chao: CH } }, k(o, 2.86, CH, 0.5), k(o, fa[0], fa[1], 0.3), k(o, fb[0], fb[1], 1.4), k(o, 1.1, 2.95, 0.8)], 0.98, VERMELHO);
  if (e.abas) {
    abaDaRoda(o, rT.x, rT.y, rT.R, CH, 0.97, VERMELHO, 0.08);
    abaDaRoda(o, rF.x, rF.y, rF.R, CH, 0.98, VERMELHO, 0.08);
  }
  // a faixa branca e o teto branco da cabine
  faixa(o, -2.82, 1.02, 0.97, 1.16, 1.32, BRANCO);
  faixa(o, 1.1, 2.875, 0.98, 1.16, 1.32, BRANCO);
  o.p.add(deitada(retangulo(1.06, -0.995, 2.7, 0.995, R(o, 0.6) + 0.02, 2), 2.88, 3.0, Math.min(0.03, o.e.bp * 2), BRANCO));
  // o para-brisa em duas partes, as janelas das portas e os vincos
  const L = Math.hypot(fb[0] - fa[0], fb[1] - fa[1]);
  const rj = Math.min(0.07, 0.03 + R(o, 0.3));
  const topoPb = L - R(o, 1.4) - 0.07;
  for (const s of [-1, 1]) naFace(o, fa, fb, retangulo(s > 0 ? 0.05 : -0.84, 0.14, s > 0 ? 0.84 : -0.05, topoPb, rj), VIDRO_ESCURO);
  lateral(o, retangulo(1.98, 1.86, 2.6, 2.7, rj), 0.98, VIDRO);
  lateral(o, retangulo(1.26, 1.86, 1.8, 2.7, rj), 0.98, VIDRO);
  for (const x of [1.89, 1.18]) vinco(o, x, x > 1.5 ? 1.15 : 0.5, 2.82, 0.98);
  espelhos(o, 2.74, 1.86, 0.98, FRISO, 0.36);
  // a frente: grade grande, faróis e o para-choque largo
  frente(o, [2.86, CH], fa, { v0: 0.44, v1: 1.12, u: 0.5, frisos: 4 }, { v: 0.64, u: 0.76, w: 0.24, h: 0.2 });
  peca(o, 2.8, 2.98, 0.3, 0.66, -1.0, 1.0, CINZA, 0.6);
  // os armários (portas de enrolar) dos lados, com os vincos e o puxador
  const armarios: [number, number, number, number][] = [
    [-1.08, -0.14, 0.56, 2.12],
    [-0.02, 0.9, 0.56, 2.12],
    [-2.36, -1.14, 1.3, 2.12],
    [-2.74, -2.44, 0.56, 2.12],
  ];
  for (const [x0, x1, y0, y1] of armarios) {
    lateral(o, retangulo(x0, y0, x1, y1, Math.min(0.05, 0.02 + R(o, 0.2))), 0.97, '#d9dce3', [-1, 1], 0.02);
    const n = o.longe ? 0 : Math.round((y1 - y0) / 0.2);
    for (let i = 1; i < n; i++) {
      const y = y0 + ((y1 - y0) * i) / n;
      lateral(o, retangulo(x0 + 0.04, y - 0.008, x1 - 0.04, y + 0.008), 0.97, '#aeb3bf', [-1, 1], 0.026, 0);
    }
    if (perto(o)) lateral(o, retangulo(x0 + 0.1, y0 + 0.05, x1 - 0.1, y0 + 0.1, 0.02), 0.97, CROMO, [-1, 1], 0.036);
  }
  // a escada em cima (trilhos e degraus), nos apoios; a barra de luzes na cabine
  const yE = 3.06;
  for (const z of [-0.36, 0.36]) peca(o, -2.8, 2.28, yE, yE + 0.1, z - 0.045, z + 0.045, CROMO, 0.2);
  for (let i = 0; i < (o.longe ? 0 : 13); i++) {
    const x = -2.66 + i * 0.39;
    // degraus: caixinhas lisas (são muitos; o bisel não aparece nesse tamanho)
    o.p.add(caixa(x - 0.03, x + 0.03, yE + 0.02, yE + 0.08, -0.33, 0.33, 0, 0, '#c9ced8'));
  }
  peca(o, -2.6, -2.2, 2.3, 2.44, -0.5, 0.5, '#9aa0ab', 0.3);
  peca(o, -2.48, -2.32, 2.44, yE, -0.1, 0.1, '#9aa0ab', 0.2);
  peca(o, 1.36, 1.52, 3.0, yE, -0.45, 0.45, '#9aa0ab', 0.2);
  barraDeLuz(o, 2.48, 3.0, 1.2, ['giroVermelho', 'giroBranco', 'giroVermelho']);
  lanternas(o, -2.835, 1.0, 0.72, 0.12, 0.09);
  for (const x of [-1.75, 1.75]) for (const z of [-0.8, 0.8]) o.rodas.push({ x, z, raio: 0.52 });
  return fechar(o, 'bombeiros', 3.5);
}

// ------------------------------------------------------------------ ambulância (cabine + baú)

function ambulancia(e: Estilo, longe = false): ModeloMiniatura {
  const o = novaObra(e, longe);
  e = o.e;
  const BRANCO = '#f8f8fb';
  const VERMELHO = '#e8473f';
  const CH = 0.32;
  const rT = { x: -1.05, y: 0.42, R: 0.5 };
  const rF = { x: 1.1, y: 0.42, R: 0.5 };
  // o baú alto e largo atrás
  volume(o, [k(o, -1.72, CH, 0.5), { roda: { ...rT, chao: CH } }, k(o, 0.44, CH, 0.3), k(o, 0.44, 2.02, 0.8), k(o, -1.72, 2.02, 0.8)], 0.88, BRANCO);
  // a cabine na frente, mais baixa e estreita: capô, para-brisa e teto
  const zc = (y: number) => 0.8 - (e.entra * 0.6 * Math.max(0, y - 1.1)) / 0.68;
  const pa: V2 = [1.34, 1.1];
  const pb: V2 = [0.98, 1.76];
  volume(o, [{ x: 0.3, y: CH }, { roda: { ...rF, chao: CH } }, k(o, 1.88, CH, 0.5), k(o, 1.9, 0.92, 1.0), k(o, pa[0], pa[1], 0.4), k(o, pb[0], pb[1], 1.0), { x: 0.3, y: 1.78 }], zc, BRANCO);
  if (e.abas) {
    abaDaRoda(o, rT.x, rT.y, rT.R, CH, 0.88, BRANCO);
    abaDaRoda(o, rF.x, rF.y, rF.R, CH, 0.8, BRANCO);
  }
  // a faixa vermelha no baú e nas portas da cabine; a cruz dos lados e no teto
  faixa(o, -1.72, 0.44, 0.88, 1.0, 1.2, VERMELHO);
  lateral(o, retangulo(0.46, 0.96, 1.22, 1.06, 0.01), zc, VERMELHO, [-1, 1], 0.012);
  for (const [w, h] of [
    [0.46, 0.15],
    [0.15, 0.46],
  ]) {
    lateral(o, retangulo(-0.64 - w / 2, 1.58 - h / 2, -0.64 + w / 2, 1.58 + h / 2, 0.02), 0.88, VERMELHO, [-1, 1], 0.02);
    o.p.add(deitada(retangulo(-0.7 - w / 2, -h / 2, -0.7 + w / 2, h / 2, 0.02, 1), 2.0, 2.034, 0.004, VERMELHO));
  }
  // para-brisa e a janela da porta
  const rj = Math.min(0.06, 0.025 + R(o, 0.25));
  const L = Math.hypot(pb[0] - pa[0], pb[1] - pa[1]);
  const v1 = L - R(o, 1.0) - 0.06;
  const hwA = zc(1.15) - e.coluna - e.b;
  const hwB = zc(pa[1] + ((pb[1] - pa[1]) * v1) / L) - e.coluna - e.b;
  naFace(o, pa, pb, trap([[-hwA, 0.08], [hwA, 0.08], [hwB, v1], [-hwB, v1]], rj), VIDRO_ESCURO);
  const xW = (y: number) => pa[0] + ((pb[0] - pa[0]) * (y - pa[1])) / (pb[1] - pa[1]);
  const j1 = 1.66;
  lateral(o, trap([[0.52, 1.2], [xW(1.2) - e.coluna * 1.3, 1.2], [xW(j1) - e.coluna * 1.3, j1], [0.52, j1]], rj), zc, VIDRO);
  vinco(o, 0.48, 0.92, 1.66, zc);
  espelhos(o, 1.0, 1.2, 0.8, FRISO, 0.22);
  // atrás: as duas portas com janelinhas e o vinco do meio
  for (const s of [-1, 1]) naFace(o, [-1.72, 2.02], [-1.72, CH], retangulo(s > 0 ? 0.1 : -0.44, 0.3, s > 0 ? 0.44 : -0.1, 0.7, rj), VIDRO);
  naFace(o, [-1.72, 2.02], [-1.72, CH], retangulo(-0.008, 0.1, 0.008, 1.55), FRISO, 0.02);
  barraDeLuz(o, 0.24, 2.02, 0.92, ['giroVermelho', 'giroBranco', 'giroVermelho']);
  frente(o, [1.88, CH], [1.9, 0.92], { v0: 0.22, v1: 0.4, u: 0.3, frisos: 2 }, { v: 0.44, u: 0.56, w: 0.22, h: 0.13 });
  peca(o, 1.8, 2.0, 0.26, 0.48, -0.82, 0.82, CINZA, 0.6);
  peca(o, -1.86, -1.62, 0.26, 0.46, -0.88, 0.88, CINZA, 0.6);
  lanternas(o, -1.735, 0.95, 0.66, 0.08, 0.1);
  for (const x of [-1.05, 1.1]) for (const z of [-0.7, 0.7]) o.rodas.push({ x, z, raio: 0.42 });
  return fechar(o, 'sorvete', 2.15);
}

// ------------------------------------------------------------------ sorvete (furgão de uma peça)

function sorvete(e: Estilo, longe = false): ModeloMiniatura {
  const o = novaObra(e, longe);
  e = o.e;
  const ROSA = '#ffd1e0';
  const ROSA_FORTE = '#ff9ec4';
  const CH = 0.3;
  const rT = { x: -1.05, y: 0.42, R: 0.5 };
  const rF = { x: 1.1, y: 0.42, R: 0.5 };
  // a saia rosa forte sobe em arco por cima das rodas (os para-lamas)
  volume(
    o,
    [
      k(o, -1.74, CH, 0.5),
      { roda: { ...rT, chao: CH } },
      { roda: { ...rF, chao: CH } },
      k(o, 1.88, CH, 0.5),
      k(o, 1.88, 0.74, 0.3),
      ...sobreRodas(-1.74, 1.88, 0.74, [rT, rF], 0.1, o.longe ? 14 : 44).reverse(),
      k(o, -1.74, 0.74, 0.3),
    ],
    0.87,
    ROSA_FORTE,
  );
  if (e.abas) for (const r of [rT, rF]) abaDaRoda(o, r.x, r.y, r.R, CH, 0.87, ROSA_FORTE);
  const pa: V2 = [1.26, 1.14];
  const pb: V2 = [0.74, 1.94];
  const W = 0.855;
  volume(o, [{ x: -1.72, y: 0.7 }, ...sobreRodas(-1.72, 1.86, 0.7, [rT, rF], 0.04, o.longe ? 14 : 44), { x: 1.86, y: 0.7 }, k(o, 1.86, 1.0, 1.0), k(o, pa[0], pa[1], 0.4), k(o, pb[0], pb[1], 1.2), k(o, -1.72, 1.94, 1.2)], W, ROSA);
  // para-brisa e as janelas da cabine
  const rj = Math.min(0.06, 0.025 + R(o, 0.25));
  const L = Math.hypot(pb[0] - pa[0], pb[1] - pa[1]);
  const hw = W - e.coluna - e.b;
  naFace(o, pa, pb, retangulo(-hw, 0.08, hw, L - R(o, 1.2) - 0.06, rj), VIDRO_ESCURO);
  const xW = (y: number) => pa[0] + ((pb[0] - pa[0]) * (y - pa[1])) / (pb[1] - pa[1]);
  const j1 = 1.8;
  lateral(o, trap([[0.4, 1.24], [xW(1.24) - e.coluna * 1.3, 1.24], [xW(j1) - e.coluna * 1.3, j1], [0.4, j1]], rj), W, VIDRO);
  vinco(o, 0.34, 0.74, 1.82, W);
  // o balcão do sorvete (lado direito, o da calçada): moldura, janelinha creme e o balcão
  lateral(o, retangulo(-1.31, 0.96, 0.18, 1.68, 0.05), W, '#ffffff', [-1], 0.012);
  lateral(o, retangulo(-1.25, 1.02, 0.12, 1.62, 0.04), W, '#fff6e0', [-1], 0.022);
  peca(o, -1.33, 0.2, 0.94, 1.0, -W - 0.16, -W + 0.02, '#ffffff', 0.2);
  // o toldo listrado
  const listras = o.longe ? 0 : 8;
  for (let i = 0; i < listras; i++) {
    const x0 = -1.38 + (i * 1.64) / listras;
    const x1 = x0 + 1.64 / listras;
    const P: number[] = [];
    const I: number[] = [];
    const nu = 2;
    const nv = 4;
    for (let j = 0; j <= nv; j++) {
      const v = j / nv;
      for (let q = 0; q <= nu; q++) {
        const x = x0 + ((x1 - x0) * q) / nu;
        const y = 1.86 - 0.22 * Math.sin((v * Math.PI) / 2) - 0.03 * Math.sin(((x - x0) / (x1 - x0)) * Math.PI);
        P.push(x, y, -W - 0.42 * v);
      }
    }
    for (let j = 0; j < nv; j++)
      for (let q = 0; q < nu; q++) {
        const a = j * (nu + 1) + q;
        const b = a + 1;
        const c = a + nu + 1;
        const d = c + 1;
        I.push(a, b, c, b, d, c, a, c, b, b, c, d);
      }
    const N: number[] = [];
    VertexData.ComputeNormals(P, I, N);
    const vd = new VertexData();
    vd.positions = P;
    vd.indices = I;
    vd.normals = N;
    o.p.add(vd, i % 2 ? '#ffffff' : '#ff6fa8');
  }
  // a casquinha em cima, num pratinho, com duas bolas e a cereja
  const prato = CreateCylinderVertexData({ height: 0.1, diameter: 0.86, tessellation: 14 });
  prato.transform(Matrix.Translation(-0.4, 1.98, 0));
  o.p.add(prato, '#ffffff');
  const cone = CreateCylinderVertexData({ height: 0.95, diameterTop: 0.66, diameterBottom: 0.06, tessellation: 12 });
  cone.transform(Matrix.Translation(-0.4, 2.5, 0));
  o.p.add(cone, '#e0a75e');
  const bola = (r: number, cor: string, c: V3, seg: number) => {
    const vd = CreateSphereVertexData({ diameter: 2 * r, segments: seg });
    vd.transform(Matrix.Scaling(1, 0.9, 1).multiply(Matrix.Translation(...c)));
    o.p.add(vd, cor);
  };
  bola(0.36, '#ff9ec4', [-0.4, 3.04, 0], o.longe ? 4 : 8);
  bola(0.28, '#fff2c2', [-0.4, 3.42, 0], o.longe ? 4 : 8);
  bola(0.085, '#e8473f', [-0.4, 3.72, 0], 4);
  // a frente (faróis no alto do nariz, grade na saia) e os para-choques
  frente(o, [1.88, CH], [1.88, 0.74], { v0: 0.18, v1: 0.38, u: 0.3, frisos: 1 }, { v: 0.56, u: 0.58, w: 0.22, h: 0.13 });
  peca(o, 1.8, 2.0, 0.24, 0.44, -0.84, 0.84, CINZA, 0.6);
  peca(o, -1.88, -1.64, 0.24, 0.44, -0.87, 0.87, CINZA, 0.6);
  naFace(o, [-1.72, 1.94], [-1.72, 0.7], retangulo(-0.5, Math.max(0.1, R(o, 1.2) + 0.06), 0.5, 0.5, rj), VIDRO);
  lanternas(o, -1.735, 1.0, 0.62, 0.08, 0.1);
  for (const x of [-1.05, 1.1]) for (const z of [-0.7, 0.7]) o.rodas.push({ x, z, raio: 0.42 });
  return fechar(o, 'sorvete', 2.15);
}

function construir(tipo: TipoFirme, e: Estilo, cor: string, longe: boolean): ModeloMiniatura {
  return tipo === 'taxi' || tipo === 'civil' || tipo === 'policia'
    ? seda(e, tipo, cor, longe)
    : tipo === 'onibusAzul'
      ? onibus(e, longe)
      : tipo === 'onibusVerde'
        ? onibus(e, longe, '#45b56b')
        : tipo === 'bombeiros'
          ? bombeiros(e, longe)
          : tipo === 'ambulancia'
            ? ambulancia(e, longe)
            : sorvete(e, longe);
}

const feitos = new Map<string, ModeloMiniatura>();
/** O modelo do tipo no estilo (feito uma vez; quem usa copia os dados). */
export function modeloFirme(tipo: TipoFirme, estilo: IdEstilo, cor = '#3f7fe0'): ModeloMiniatura {
  const chave = `${tipo}|${estilo}|${cor}`;
  let m = feitos.get(chave);
  if (!m) feitos.set(chave, (m = construir(tipo, ESTILOS[estilo], cor, false)));
  return m;
}

/** A versão de longe do estilo C (os mesmos volumes e cores, sem miudezas; rodas e luzes pintadas). */
export function modeloLonge(tipo: TipoFirme, cor = '#3f7fe0'): VertexData {
  return construir(tipo, ESTILOS.C, cor, true).corpo;
}
