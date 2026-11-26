// Estudo 037: a conta dos tesouros da mão na primeira pessoa
// (node .sdd/specs/037-construir-melhor/referencia/conta-tesouros.mjs)
//
// Tudo em blocos, com as medidas de verdade (o plano de `src/personagem/bonecoPremiumLojinha.ts`,
// na escala 1,15 do boneco). A câmera fica na origem, olhando para +z (x direita, y cima), com o
// olhar 0,1 rad para baixo (o das fotos). A mão de segurar vem da conta do ombro de cada tela
// (`src/render/contaOmbro.ts`, com os retângulos de verdade da interface medidos no jogo, T08b),
// no campo de dentro de cada tela (em pé 80°, deitado e computador 70°).
//
// Para cada jeito de segurar, a conta atira um raio por ponto da tela (uma grade de 4 px) e
// diz o que o tesouro cobre: a tela inteira, a faixa de cima, a mira (o meio da tela, 24 px) e a
// interface (os retângulos dos botões, da barra e do mapinha). E o quanto de cada parte cai
// dentro do quadro (o pano, as pontinhas, o cabo, o aro, a pipa e o fio).

import { acharOmbro, direcaoDoBraco, BRACO, FOV_BRACO } from '../../../../src/render/contaOmbro.ts';

const E = 1.15; // a escala do boneco
const GRAU = Math.PI / 180;
const PITCH = 0.1;

const INTERFACE = {
  emPe: [[7, 781, 383, 832], [8, 8, 52, 52], [266, 40, 380, 154], [18, 584, 146, 712], [230, 652, 298, 720], [308, 652, 376, 720], [60, 8, 104, 52], [328, 164, 376, 212], [112, 8, 156, 52]],
  deitado: [[157, 312, 687, 378], [8, 8, 52, 52], [740, 58, 834, 152], [14, 268, 126, 380], [714, 324, 770, 380], [778, 324, 834, 380], [60, 8, 104, 52], [782, 162, 830, 210], [112, 8, 156, 52]],
  computador: [[375, 642, 905, 708], [8, 8, 52, 52], [1104, 44, 1270, 210], [60, 8, 104, 52], [1218, 222, 1266, 270], [112, 8, 156, 52]],
};
const TELAS = {
  emPe: { w: 390, h: 844, botoes: 652, fov: 80 * GRAU },
  deitado: { w: 844, h: 390, botoes: 312, fov: 70 * GRAU },
  computador: { w: 1280, h: 720, botoes: 640, fov: 70 * GRAU },
};

// ------------------------------------------------------------------ vetores
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a) => mul(a, 1 / Math.hypot(...a));
/** Do mundo (o boneco: x direita, y cima, z frente) para a câmera, com o olhar `p` para baixo. */
const doMundo = (v, p = PITCH) => [v[0], v[1] * Math.cos(p) + v[2] * Math.sin(p), -v[1] * Math.sin(p) + v[2] * Math.cos(p)];
/** Uma base (u, eixo, w) com o eixo dado. */
function base(eixo) {
  const a = norm(eixo);
  const t = Math.abs(a[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  const u = norm(cross(t, a));
  const w = cross(a, u);
  return { u, a, w };
}

// ------------------------------------------------------------------ as peças (em blocos)
/** Um tesouro vira uma lista de peças: triângulos, tubos (segmento + raio) e bolas. */
function guardaChuva(mao, eixoMundo, escala, p = PITCH) {
  const k = E * escala;
  const R = 1.02 * k;
  const BASE = 1.16 * k;
  const ALT = 0.38 * k;
  const { u, a, w } = base(doMundo(eixoMundo, p));
  const pt = (x, y, z) => add(mao, add(add(mul(u, x), mul(a, y)), mul(w, z)));
  const topo = pt(0, BASE + ALT, 0);
  const tris = [];
  const pontas = [];
  for (let i = 0; i < 8; i++) {
    const a0 = (i / 8) * Math.PI * 2;
    const a1 = ((i + 1) / 8) * Math.PI * 2;
    const b = pt(Math.cos(a0) * R, BASE, Math.sin(a0) * R);
    const c = pt(Math.cos(a1) * R, BASE, Math.sin(a1) * R);
    tris.push({ p: [topo, b, c], parte: 'pano' });
    pontas.push(b);
  }
  return {
    tris,
    tubos: [{ a: pt(0, -0.05 * k, 0), b: pt(0, BASE + ALT, 0), r: 0.02 * k, parte: 'cabo' }],
    pontos: { pontinhas: pontas, cabo: [0, 0.25, 0.5, 0.75, 1].map((t) => pt(0, t * BASE, 0)) },
  };
}

function varinha(mao, eixoCam, escala) {
  const k = E * escala;
  const { u, a, w } = base(eixoCam);
  const pt = (x, y, z) => add(mao, add(add(mul(u, x), mul(a, y)), mul(w, z)));
  // o aro: um anel de raio 0,1, de frente para a câmera o quanto der (no plano que contém o eixo)
  const centro = pt(0, 0.47 * k, 0);
  const aro = [];
  for (let i = 0; i < 16; i++) {
    const t = (i / 16) * Math.PI * 2;
    aro.push(add(centro, add(mul(a, Math.cos(t) * 0.1 * k), mul(u, Math.sin(t) * 0.1 * k))));
  }
  const tubos = [{ a: pt(0, 0.02 * k, 0), b: pt(0, 0.38 * k, 0), r: 0.025 * k, parte: 'cabo' }];
  for (let i = 0; i < 16; i++) tubos.push({ a: aro[i], b: aro[(i + 1) % 16], r: 0.015 * k, parte: 'aro' });
  return { tris: [], tubos, pontos: { aro, cabo: [pt(0, 0.1 * k, 0), pt(0, 0.38 * k, 0)] } };
}

/** A pipa: o losango (0,6 × 0,82) com a ponta de baixo em `pe`, de frente para a câmera, e o fio. */
function pipa(mao, pe, escala = 1) {
  const k = E * escala;
  const B = pe;
  const T = add(pe, [0, 0.82 * k, 0]);
  const C = add(pe, [0, 0.55 * k, 0]);
  const Ee = add(C, [-0.3 * k, 0, 0]);
  const D = add(C, [0.3 * k, 0, 0]);
  const tris = [
    { p: [T, Ee, C], parte: 'pipa' },
    { p: [T, C, D], parte: 'pipa' },
    { p: [Ee, B, C], parte: 'pipa' },
    { p: [C, B, D], parte: 'pipa' },
  ];
  const rabo = [];
  for (let i = 0; i < 4; i++) rabo.push(add(pe, [0, -(0.22 + i * 0.24) * k, 0]));
  return {
    tris,
    tubos: [
      // (o fio: 1 px de largura na tela, contado à parte)
      { a: mao, b: B, r: 0.004, parte: 'fio' },
      { a: B, b: rabo[3], r: 0.03 * k, parte: 'rabo' },
    ],
    pontos: { pipa: [T, Ee, D, B, C], fio: [0.25, 0.5, 0.75, 1].map((t) => add(mao, mul(sub(B, mao), t))) },
  };
}

// ------------------------------------------------------------------ o raio
function raioTri(o, d, [a, b, c]) {
  const e1 = sub(b, a);
  const e2 = sub(c, a);
  const pv = cross(d, e2);
  const det = dot(e1, pv);
  if (Math.abs(det) < 1e-9) return Infinity;
  const tv = sub(o, a);
  const u = dot(tv, pv) / det;
  if (u < 0 || u > 1) return Infinity;
  const qv = cross(tv, e1);
  const v = dot(d, qv) / det;
  if (v < 0 || u + v > 1) return Infinity;
  const t = dot(e2, qv) / det;
  return t > 0.1 ? t : Infinity;
}
function raioTubo(o, d, { a, b, r }) {
  // a menor distância entre o raio e o segmento
  const u = sub(b, a);
  const w0 = sub(o, a);
  const A = dot(d, d);
  const B = dot(d, u);
  const C = dot(u, u);
  const D = dot(d, w0);
  const Ee = dot(u, w0);
  const den = A * C - B * B;
  let sc = den > 1e-9 ? (B * Ee - C * D) / den : 0;
  let tc = den > 1e-9 ? (A * Ee - B * D) / den : Ee / C;
  tc = Math.max(0, Math.min(1, tc));
  sc = Math.max(0, (B * tc - D) / A);
  const p = add(o, mul(d, sc));
  const q = add(a, mul(u, tc));
  return Math.hypot(...sub(p, q)) <= r && sc > 0.1 ? sc : Infinity;
}

/** Onde um ponto da câmera cai na tela (px), ou null atrás dela. */
function naTela(p, t) {
  if (p[2] <= 0.1) return null;
  const tanV = Math.tan(t.fov / 2);
  const tanH = tanV * (t.w / t.h);
  return [(t.w / 2) * (1 + p[0] / (p[2] * tanH)), (t.h / 2) * (1 - p[1] / (p[2] * tanV))];
}
const dentro = (q, t) => q && q[0] >= 0 && q[0] <= t.w && q[1] >= 0 && q[1] <= t.h;

function medir(obj, nomeTela) {
  const t = TELAS[nomeTela];
  const ui = INTERFACE[nomeTela];
  const tanV = Math.tan(t.fov / 2);
  const tanH = tanV * (t.w / t.h);
  const PASSO = 4;
  let total = 0;
  let cobre = 0;
  let cima = 0;
  let cimaTotal = 0;
  let mira = 0;
  let naUi = 0;
  const porParte = {};
  for (let y = PASSO / 2; y < t.h; y += PASSO)
    for (let x = PASSO / 2; x < t.w; x += PASSO) {
      const d = norm([((x / t.w) * 2 - 1) * tanH, (1 - (y / t.h) * 2) * tanV, 1]);
      let perto = Infinity;
      let parte = null;
      for (const tri of obj.tris) {
        const s = raioTri([0, 0, 0], d, tri.p);
        if (s < perto) [perto, parte] = [s, tri.parte];
      }
      for (const tubo of obj.tubos) {
        if (tubo.parte === 'fio') continue;
        const s = raioTubo([0, 0, 0], d, tubo);
        if (s < perto) [perto, parte] = [s, tubo.parte];
      }
      total++;
      const topo = y < t.h * 0.25;
      if (topo) cimaTotal++;
      if (!parte) continue;
      cobre++;
      porParte[parte] = (porParte[parte] ?? 0) + 1;
      if (topo) cima++;
      if (Math.abs(x - t.w / 2) < 12 && Math.abs(y - t.h / 2) < 12) mira++;
      if (ui.some((q) => x >= q[0] && x <= q[2] && y >= q[1] && y <= q[3])) naUi++;
    }
  const visto = {};
  for (const [nome, pts] of Object.entries(obj.pontos)) {
    const n = pts.filter((p) => dentro(naTela(p, t), t)).length;
    visto[nome] = `${n}/${pts.length}`;
  }
  const pct = (n, de) => `${((100 * n) / de).toFixed(1)}%`;
  return {
    tela: pct(cobre, total),
    faixaDeCima: pct(cima, cimaTotal),
    mira: mira ? 'TAPA' : 'livre',
    interface: pct(naUi, total),
    partes: Object.fromEntries(Object.entries(porParte).map(([k, v]) => [k, pct(v, total)])),
    dentroDoQuadro: visto,
  };
}

// ------------------------------------------------------------------ a mão de cada tela
function maoDe(nomeTela) {
  const t = TELAS[nomeTela];
  const r = acharOmbro({ w: t.w, h: t.h, botoes: t.botoes, obstaculos: INTERFACE[nomeTela] });
  const d = direcaoDoBraco(r.segurar[0], r.segurar[1]);
  const m = add(r.ombro, mul(d, BRACO));
  // o braço é medido em 70° e aparece igual em qualquer campo de dentro (o suporte escala x e y)
  const s = Math.tan(t.fov / 2) / Math.tan(FOV_BRACO / 2);
  return { mao: [m[0] * s, m[1] * s, m[2]], maoPx: r.maoPx };
}

// ------------------------------------------------------------------ os jeitos de segurar
// (eixos do guarda-chuva no mundo do boneco; os da varinha, na câmera, como no jogo)
const JEITOS = {
  'guarda-chuva hoje (miniatura 0,38, inclinado para a frente e a direita)': (m) =>
    guardaChuva(m, [0.1, 0.92, 0.3], 0.38),
  'guarda-chuva A: tamanho de verdade, cabo em pé (o pano por cima da cabeça)': (m) =>
    guardaChuva(m, [0, 1, 0], 1),
  'guarda-chuva A2: tamanho de verdade, cabo 12° para a frente (a beira do pano entra no alto)': (m) =>
    guardaChuva(m, [0, Math.cos(12 * GRAU), Math.sin(12 * GRAU)], 1),
  'guarda-chuva B: tamanho de verdade, cabo 30° para a frente (o pano vira um telhado)': (m) =>
    guardaChuva(m, [0, Math.cos(30 * GRAU), Math.sin(30 * GRAU)], 1),
  'guarda-chuva estudo A: de verdade, 8° para a frente e 8° para fora': (m) =>
    guardaChuva(m, [Math.sin(8 * GRAU), Math.cos(8 * GRAU) * Math.cos(8 * GRAU), Math.sin(8 * GRAU)], 1),
  'guarda-chuva estudo B: de verdade, 4° para a frente e 32° para fora': (m) =>
    guardaChuva(m, [Math.sin(32 * GRAU), Math.cos(4 * GRAU) * Math.cos(32 * GRAU), Math.sin(4 * GRAU)], 1),
  'varinha hoje = A: de verdade, subindo da mão para a frente e o meio': (m) => varinha(m, [-0.28, 0.9, 0.34], 1),
  'varinha B: no alto, o aro na frente do rosto, à direita (de soprar)': (m) => varinha(m, [-0.5, 0.75, 0.45], 1),
  'pipa hoje = A: na frente, no alto, a 3,4 (presa à câmera)': (m, t) => {
    const tanV = Math.tan(t.fov / 2);
    const tanH = tanV * (t.w / t.h);
    return pipa(m, [-0.15 * 3.4 * tanH, 0.36 * 3.4 * tanV, 3.4]);
  },
  'pipa B: onde ela voa de fora (atrás e no alto), só o fio sobe da mão': (m) =>
    pipa(m, doMundo([-1.09, 2.82 - 1.62, -1.55])),
  'pipa C: longe na frente e no alto, no tamanho de verdade (a 7 blocos)': (m) => pipa(m, doMundo([-1.2, 3.2, 7])),
};

/**
 * O deitado da opção A do estudo (a barra no alto, a mão de 76 px no canto de baixo à direita): a
 * mão em (781, 229) px, achada pela conta do ombro do ramo do estudo (`alvoPx` 76).
 */
TELAS.deitadoA = { ...TELAS.deitado };
INTERFACE.deitadoA = [[165, 6, 695, 72], [8, 8, 52, 52], [60, 8, 104, 52], [112, 8, 156, 52], [8, 58, 102, 152], [110, 104, 158, 152], [14, 268, 126, 380], [714, 324, 770, 380], [778, 324, 834, 380], [280, 80, 580, 104]];
function maoDeitadoA() {
  const t = TELAS.deitadoA;
  const tanV = Math.tan(t.fov / 2);
  const tanH = tanV * (t.w / t.h);
  const z = (0.098 * t.h) / (76 * tanV);
  return { mao: [(781 / (t.w / 2) - 1) * z * tanH, (1 - 229 / (t.h / 2)) * z * tanV, z], maoPx: 76 };
}

const saida = {};
for (const nomeTela of Object.keys(TELAS)) {
  const { mao, maoPx } = nomeTela === 'deitadoA' ? maoDeitadoA() : maoDe(nomeTela);
  saida[nomeTela] = { mao: mao.map((v) => +v.toFixed(3)), maoPx, jeitos: {} };
  for (const [nome, f] of Object.entries(JEITOS)) saida[nomeTela].jeitos[nome] = medir(f(mao, TELAS[nomeTela]), nomeTela);
}
console.log(JSON.stringify(saida, null, 1));
