/**
 * Spec 027 (T09): as peças novas das fantasias da Noite das Fantasias, só onde nenhuma das que
 * existem serve. Só dados, como o resto do plano (personagem/boneco.ts), presas às juntas do
 * boneco e marcadas com o apoio (o teste de encaixe mede o vão):
 * - o chapéu de bruxa (a aba mole, a fita e a copa em gomos que entorta até a ponta caída, com a
 *   bolinha na ponta);
 * - o lençol de capuz da fantasminha: a cúpula de pano com o furo oval do rosto (o rosto do
 *   boneco à mostra), a beirinha macia em volta do furo, o lençol em sino até os joelhos com a
 *   barra em pontas arredondadas e as mãozinhas de pano;
 * - a gola alta do vampirinho (a variação da `capa`): o pano curvo fechado atrás da cabeça, que
 *   abre dos dois lados do rosto, com o forro laranja por dentro;
 * - as orelhinhas de bichinho da `mascara` (de gatinho e de morceguinho).
 * O macacão de tufos do Bento está em bonecoPeludo.ts. Formas do esboço aprovado (20 nov).
 */
import type { MedidasBoneco } from './bonecoFantasia';
import type { Junta, Peca } from './boneco';

type V3 = [number, number, number];
type P2 = [number, number];

function por(
  pecas: Peca[],
  nome: string,
  junta: Junta,
  apoio: Peca['apoio'],
  forma: Peca['forma'],
  tamanho: V3,
  pos: V3,
  cor: string,
  extra: Partial<Peca> = {},
): void {
  pecas.push({ nome, junta, apoio, forma, tamanho, pos, cor, ...extra });
}

// ------------------------------------------------------------------ o chapéu de bruxa

/** O chapéu de bruxa: aba mole, fita, a copa em gomos entortando e a bolinha na ponta. */
export function chapeuDeBruxa(pecas: Peca[], m: MedidasBoneco, cor: string, fita: string, ponta: string): void {
  const b = m.baseChapeu;
  por(pecas, 'bruxa-aba', 'cabeca', 'cabeca', 'cilindro', [0.05, 0.66, 0.58], [0, b + 0.075, 0], cor, {
    rot: [0.05, 0, -0.05],
  });
  por(pecas, 'bruxa-fita', 'cabeca', 'cabeca', 'cilindro', [0.075, 0.372, 0.36], [0, b + 0.14, 0], fita);
  const gomos: Array<[number, number, number, number]> = [
    // altura, raio de baixo, raio de cima, giro (z)
    [0.2, 0.36, 0.3, 0],
    [0.17, 0.3, 0.22, 0.12],
    [0.15, 0.22, 0.15, 0.42],
    [0.13, 0.15, 0.085, 0.85],
    [0.1, 0.085, 0.05, 1.35],
  ];
  let base: V3 = [0, b + 0.1, 0];
  gomos.forEach(([h, rb, rc, g], i) => {
    const d: V3 = [-Math.sin(g), Math.cos(g), 0];
    const c: V3 = [base[0] + (d[0] * h) / 2, base[1] + (d[1] * h) / 2, base[2]];
    por(pecas, `bruxa-copa${i}`, 'cabeca', 'cabeca', 'cilindro', [h, rb, rc], c, cor, { rot: [0, 0, g] });
    // a junta entre dois gomos fica redonda (a copa entorta sem quina)
    if (i > 0) {
      const r = rb * 0.98;
      por(pecas, `bruxa-dobra${i}`, 'cabeca', 'cabeca', 'esfera', [r, r, r], [c[0] - (d[0] * h) / 2, c[1] - (d[1] * h) / 2, 0], cor);
    }
    base = [base[0] + d[0] * h * 0.92, base[1] + d[1] * h * 0.92, base[2]];
  });
  por(pecas, 'bruxa-ponta', 'cabeca', 'cabeca', 'esfera', [0.065, 0.065, 0.065], base, ponta);
}

// ------------------------------------------------------------------ o lençol de capuz

/** A forma da cúpula de pano (no espaço da cabeça): o meio, os raios e o furo oval do rosto. */
const CUPULA = { c: [0, 0.08, -0.02] as V3, R: [0.55, 0.58, 0.5] as V3, furo: { ax: 0.64, ay: 0.6, oy: 0.3 } };

/**
 * A cúpula de pano em volta da cabeça: um ovo sem o fundo (o pescoço), a frente um tico achatada
 * (a beira do furo rente ao rosto, sem cara de capacete), o furo oval do rosto e o alto do pano
 * puxado e caído de lado. A malha é feita em anéis em volta do eixo do rosto: o primeiro anel é a
 * beira do furo, exata e lisa. Devolve a malha e a beira.
 */
function cupula(): { pos: number[]; ind: number[]; beira: V3[] } {
  const { c, R, furo } = CUPULA;
  const corte = 0.74;
  const ci = Math.cos(furo.oy);
  const si = Math.sin(furo.oy);
  const dirDe = (rho: number, th: number): V3 => {
    const x = Math.sin(rho) * Math.cos(th);
    const y = Math.sin(rho) * Math.sin(th);
    const z = Math.cos(rho);
    return [x, y * ci - z * si, y * si + z * ci];
  };
  const sup = (d: V3): V3 => {
    let x = c[0] + R[0] * d[0];
    let y = c[1] + R[1] * d[1];
    let z = c[2] + R[2] * d[2];
    if (z > c[2]) z = c[2] + (z - c[2]) * 0.9;
    if (d[1] > 0.5) {
      const s = (d[1] - 0.5) / 0.5;
      y += 0.24 * s * s;
      x -= 0.2 * s * s * s;
      z -= 0.04 * s * s;
    }
    return [x, y, z];
  };
  const beiraAng = (th: number) => 1 / Math.sqrt((Math.cos(th) / furo.ax) ** 2 + (Math.sin(th) / furo.ay) ** 2);
  const NA = 22;
  const NB = 48;
  const pos: number[] = [];
  const ind: number[] = [];
  const baixos: boolean[] = [];
  for (let i = 0; i <= NA; i++)
    for (let j = 0; j <= NB; j++) {
      const th = (j / NB) * Math.PI * 2;
      const r0 = beiraAng(th);
      const d = dirDe(r0 + (Math.PI - r0) * (i / NA), th);
      pos.push(...sup(d));
      baixos.push(d[1] < -corte);
    }
  const idx = (i: number, j: number) => i * (NB + 1) + j;
  for (let i = 0; i < NA; i++)
    for (let j = 0; j < NB; j++) {
      const q = [idx(i, j), idx(i + 1, j), idx(i + 1, j + 1), idx(i, j + 1)];
      // (o pescoço fica aberto: a cúpula para um tico abaixo do queixo)
      if (q.every((v) => baixos[v])) continue;
      ind.push(q[0], q[2], q[1], q[0], q[3], q[2]);
    }
  const beira: V3[] = [];
  for (let j = 0; j <= NB; j++) {
    const th = (j / NB) * Math.PI * 2;
    beira.push(sup(dirDe(beiraAng(th), th)));
  }
  return { pos, ind, beira };
}

/** Um tubo fino ao longo de um caminho fechado (a beirinha macia do furo do capuz). */
function tubo(caminho: V3[], raio: number, lados = 6): { pos: number[]; ind: number[] } {
  const pos: number[] = [];
  const ind: number[] = [];
  const n = caminho.length;
  for (let i = 0; i < n; i++) {
    const a = caminho[(i - 1 + n) % n];
    const b = caminho[(i + 1) % n];
    const t: V3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const lt = Math.hypot(...t) || 1;
    const tt: V3 = [t[0] / lt, t[1] / lt, t[2] / lt];
    // uma normal qualquer perpendicular à tangente, e a outra pelo produto vetorial
    const ref: V3 = Math.abs(tt[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0];
    const u0: V3 = [tt[1] * ref[2] - tt[2] * ref[1], tt[2] * ref[0] - tt[0] * ref[2], tt[0] * ref[1] - tt[1] * ref[0]];
    const lu = Math.hypot(...u0) || 1;
    const u: V3 = [u0[0] / lu, u0[1] / lu, u0[2] / lu];
    const v: V3 = [tt[1] * u[2] - tt[2] * u[1], tt[2] * u[0] - tt[0] * u[2], tt[0] * u[1] - tt[1] * u[0]];
    for (let k = 0; k < lados; k++) {
      const ang = (k / lados) * Math.PI * 2;
      const cs = Math.cos(ang) * raio;
      const sn = Math.sin(ang) * raio;
      const p = caminho[i];
      pos.push(p[0] + u[0] * cs + v[0] * sn, p[1] + u[1] * cs + v[1] * sn, p[2] + u[2] * cs + v[2] * sn);
    }
  }
  for (let i = 0; i < n; i++)
    for (let k = 0; k < lados; k++) {
      const a = i * lados + k;
      const b = i * lados + ((k + 1) % lados);
      const c = ((i + 1) % n) * lados + k;
      const d = ((i + 1) % n) * lados + ((k + 1) % lados);
      ind.push(a, c, b, b, c, d);
    }
  return { pos, ind };
}

/**
 * O lençol de fantasminha: a cúpula do capuz com o furo do rosto e a beirinha, o sino até os
 * joelhos com a barra em pontas arredondadas e as mãozinhas de pano. O cabelo fica guardado.
 */
export function lencolDeCapuz(pecas: Peca[], m: MedidasBoneco, cor: string): void {
  for (let i = pecas.length - 1; i >= 0; i--) {
    const q = pecas[i];
    if (
      (q.junta === 'cabeca' || q.junta === 'topete') &&
      /^(cabelo|nuca|topete|franja|lado|costas|cacho|rabo|coque|tranca|chanel|mecha)/.test(q.nome)
    )
      pecas.splice(i, 1);
  }
  const cup = cupula();
  por(pecas, 'lencol-capuz', 'cabeca', 'cabeca', 'malha', [1.1, 1.3, 1], [0, 0, 0], cor, {
    malha: { pos: cup.pos, ind: cup.ind },
    brilho: 0.05,
  });
  // (o caminho da beira, fechado: sem o ponto repetido do fim)
  const beira = tubo(cup.beira.slice(0, -1), 0.02);
  por(pecas, 'lencol-beira', 'cabeca', 'cabeca', 'malha', [1, 1, 0.1], [0, 0, 0], cor, {
    malha: beira,
    brilho: 0.05,
  });
  // o sino: dos ombros (debaixo da beira da cúpula) até os joelhos
  // (a tampinha encosta nos ombros: mais alta, o sino ficava solto do corpo)
  const yTopo = m.troncoH - 0.005;
  const yBaixo = -m.quadril + 0.17;
  const NV = 14;
  const NU = 56;
  const pos: number[] = [];
  const ind: number[] = [];
  for (let i = 0; i <= NV; i++) {
    const t = i / NV;
    for (let j = 0; j <= NU; j++) {
      const u = (j / NU) * Math.PI * 2;
      // as pontas da barra: arredondadas, descendo (7 pontas em volta)
      const onda = (0.5 + 0.5 * Math.cos(7 * u)) ** 0.55;
      const k = t ** 0.75;
      const rx = 0.31 + 0.27 * k;
      const rz = 0.27 + 0.21 * k;
      const dobra = 1 + 0.035 * t * Math.cos(7 * u);
      const y = yTopo + (yBaixo - yTopo) * t - 0.11 * onda * t ** 5;
      pos.push(Math.sin(u) * rx * dobra, y, Math.cos(u) * rz * dobra);
    }
  }
  for (let i = 0; i < NV; i++)
    for (let j = 0; j < NU; j++) {
      const a0 = i * (NU + 1) + j;
      const b0 = (i + 1) * (NU + 1) + j;
      ind.push(a0, b0, b0 + 1, a0, b0 + 1, a0 + 1);
    }
  // a tampinha de cima (os ombros), fechando o sino debaixo da cúpula
  const meio = pos.length / 3;
  pos.push(0, yTopo + 0.01, 0);
  for (let j = 0; j < NU; j++) ind.push(meio, j + 1, j);
  por(pecas, 'lencol-sino', 'tronco', 'tronco', 'malha', [1.2, 1.2, 1], [0, 0, 0], cor, {
    malha: { pos, ind },
    brilho: 0.05,
  });
  // as mãozinhas cobertas pelo lençol: tocos redondos de pano no fim das mangas de fantasma
  for (const q of pecas) {
    if (/^braco[ED]-(punho|manga)$/.test(q.nome)) q.cor = cor;
    if (/^braco[ED]-mao$/.test(q.nome)) {
      q.cor = cor;
      q.tamanho = [0.1, 0.105, 0.1];
    }
  }
}

// ------------------------------------------------------------------ a gola alta

/**
 * A gola alta de vampirinho (a variação da `capa`): fechada atrás da cabeça, abrindo dos dois
 * lados do rosto (bem por fora do cabelo), do alto dos ombros até a altura dos olhos, as pontas
 * de cima redondas; o forro por dentro, um tico menor.
 */
export function golaAlta(pecas: Peca[], m: MedidasBoneco, cor: string, forro: string): void {
  const { troncoH } = m;
  const fazer = (dr: number, baixa: number) => {
    const NV = 12;
    const NU = 28;
    const pos: number[] = [];
    const ind: number[] = [];
    for (let i = 0; i <= NV; i++)
      for (let j = 0; j <= NU; j++) {
        const t = i / NV;
        const u = -1 + (2 * j) / NU;
        // T10 (decisão do orquestrador): bem mais alta e mais aberta que a do esboço. Na cabeça
        // grande do boneco, a gola do esboço sumia atrás dela vista de frente; agora o pano sobe
        // até a altura do alto da cabeça e abre em leque dos dois lados, com as duas pontas de
        // cima levantadas: de frente, o vampirinho se reconhece pela gola atrás da cabeça
        const r = 0.46 + 0.22 * t ** 1.4 - dr;
        const th = u * (1.22 + 0.3 * t);
        const y = troncoH - 0.04 + (0.74 - baixa) * t + 0.16 * t ** 2 * Math.abs(u) ** 2.2;
        pos.push(r * Math.sin(th), y, -r * Math.cos(th));
      }
    for (let i = 0; i < NV; i++)
      for (let j = 0; j < NU; j++) {
        const a0 = i * (NU + 1) + j;
        const b0 = (i + 1) * (NU + 1) + j;
        ind.push(a0, b0 + 1, b0, a0, a0 + 1, b0 + 1);
      }
    return { pos, ind };
  };
  por(pecas, 'gola-alta', 'tronco', 'tronco', 'malha', [1, 0.5, 1], [0, 0, 0], cor, { malha: fazer(0, 0) });
  por(pecas, 'gola-alta-forro', 'tronco', 'tronco', 'malha', [1, 0.5, 1], [0, 0, 0], forro, {
    malha: fazer(0.016, 0.02),
  });
  // a pala que liga a gola aos ombros (debaixo da nuca, sem entrar na cabeça), funda o bastante
  // para chegar no pano da gola atrás (nos modelos de tronco mais fino, a gola ficava solta)
  por(pecas, 'gola-pala', 'tronco', 'tronco', 'caixa', [m.larg + 0.1, 0.06, 0.42], [0, troncoH - 0.035, -m.prof / 2 - 0.17], cor, {
    raio: 0.03,
  });
}

// ------------------------------------------------------------------ as orelhinhas

/** Orelha de gatinho: o triângulo de pontas redondas. */
function perfilOrelhaGato(): P2[] {
  const pts: P2[] = [];
  const cantos: P2[] = [
    [-0.09, -0.07],
    [0.09, -0.07],
    [0.0, 0.1],
  ];
  for (let k = 0; k < 3; k++) {
    const [ax, ay] = cantos[k];
    const [bx, by] = cantos[(k + 1) % 3];
    for (let i = 0; i < 6; i++) {
      const t = i / 6;
      pts.push([ax + (bx - ax) * t, ay + (by - ay) * t]);
    }
  }
  return pts;
}

/** Orelha de morceguinho: maior, redonda em cima, com a pontinha (nada de asa de morcego feia). */
function perfilOrelhaMorcego(): P2[] {
  const pts: P2[] = [];
  for (let i = 0; i <= 16; i++) {
    const a = Math.PI * (i / 16);
    pts.push([Math.cos(a) * 0.1, Math.sin(a) * 0.15 + 0.0]);
  }
  pts.push([-0.08, -0.08], [0.08, -0.08]);
  return pts.reverse();
}

/** As orelhinhas de bichinho em cima da cabeça (vão com a `mascara` de gatinho ou de morceguinho). */
export function orelhasDeBichinho(pecas: Peca[], m: MedidasBoneco, tipo: 'gatinho' | 'morceguinho', cor: string, dentro: string): void {
  // T10 (decisão do orquestrador): as orelhinhas um tanto maiores (de longe, na cabeça grande
  // do boneco, sumiam); a base continua assentada no alto do cabelo, sem entrar nele
  const g = tipo === 'gatinho' ? 1.35 : 1.3;
  const y = m.topoTampa + (tipo === 'gatinho' ? 0.066 : 0.078) * g;
  const perfil = (tipo === 'gatinho' ? perfilOrelhaGato() : perfilOrelhaMorcego()).map(
    ([px, py]) => [px * g, py * g] as P2,
  );
  const k = tipo === 'gatinho' ? 0.6 : 0.62;
  for (const s of [-1, 1]) {
    // (bem nos cantos de cima da cabeça: o coque e o topete no meio ficam livres entre elas)
    // (maiores, ficam um tico mais para os cantos: o coque do meio continua livre entre elas)
    const x = s * (m.cab.w / 2 - 0.07);
    por(pecas, `orelha-${tipo}${s}`, 'cabeca', 'cabeca', 'placa', [0.2 * g, 0.3 * g, 0.05], [x, y, -0.02], cor, {
      perfil,
      rot: [0, 0, -s * (tipo === 'gatinho' ? 0.22 : 0.35)],
    });
    por(pecas, `orelha-${tipo}-dentro${s}`, 'cabeca', 'cabeca', 'placa', [0.12 * g, 0.18 * g, 0.02], [x, y - 0.005, 0.02], dentro, {
      perfil: perfil.map(([px, py]) => [px * k, py * k] as P2),
      rot: [0, 0, -s * (tipo === 'gatinho' ? 0.22 : 0.35)],
    });
  }
}

// ------------------------------------------------------------------ os moradores (T10)

/** O contorno de uma placa (a largura e a altura que o plano guarda só como informação). */
function placa(pecas: Peca[], nome: string, junta: Junta, apoio: Peca['apoio'], perfil: P2[], esp: number, pos: V3, cor: string, extra: Partial<Peca> = {}): void {
  let w = 0;
  let h = 0;
  for (const [x, y] of perfil) {
    w = Math.max(w, Math.abs(x) * 2);
    h = Math.max(h, Math.abs(y) * 2);
  }
  por(pecas, nome, junta, apoio, 'placa', [w, h, esp], pos, cor, { perfil, ...extra });
}

/**
 * O xale da Vovó Zuleica (do esboço aprovado): o triângulo nas costas, o pano por cima de cada
 * ombro e as duas pontas caindo na frente, dos lados do peito, com a franjinha clara na beira.
 * O pescoço fica livre (nada perto do queixo).
 */
export function xale(pecas: Peca[], m: MedidasBoneco, cor: string, franja: string): void {
  const { troncoH, prof, frente, larg } = m;
  const bT = troncoH * 0.72;
  placa(
    pecas,
    'xale-costas',
    'tronco',
    'tronco',
    [
      [-(larg / 2 + 0.02), bT / 2],
      [larg / 2 + 0.02, bT / 2],
      [0.04, -bT / 2],
      [-0.04, -bT / 2],
    ],
    0.03,
    [0, troncoH - 0.03 - bT / 2, -prof / 2 - 0.016],
    cor,
  );
  for (let k = 0; k <= 6; k++) {
    const t = k / 6;
    for (const s of [-1, 1])
      por(pecas, `xale-franja-costas${s}${k}`, 'tronco', 'tronco', 'esfera', [0.018, 0.027, 0.0144], [s * ((larg / 2 + 0.02) * (1 - t) + 0.04 * t), troncoH - 0.03 - bT * t - 0.012, -prof / 2 - 0.024], franja);
  }
  for (const s of [-1, 1]) {
    const x = s * (larg / 2 - 0.075);
    por(pecas, `xale-ombro${s}`, 'tronco', 'tronco', 'caixa', [0.12, 0.05, prof + 0.05], [x, troncoH - 0.035, 0], cor, { raio: 0.022 });
    por(pecas, `xale-ponta${s}`, 'tronco', 'tronco', 'caixa', [0.11, troncoH * 0.62, 0.035], [x, troncoH * 0.67, frente + 0.016], cor, { raio: 0.02 });
    for (const dx of [-0.035, 0, 0.035])
      por(pecas, `xale-franja${s}${dx}`, 'tronco', 'tronco', 'esfera', [0.018, 0.0288, 0.0144], [x + dx, troncoH * 0.36 - 0.012, frente + 0.016], franja);
  }
}

/** Os óculos redondos de vovó (a armação dourada, como no esboço), na frente dos olhos. */
export function oculosRedondos(pecas: Peca[], m: MedidasBoneco, cor: string): void {
  const z = m.zRosto + 0.03;
  for (const x of [-0.15, 0.15])
    por(pecas, `oculos-r${x}`, 'cabeca', 'cabeca', 'anel', [0.18, 0.022, 0], [x, -0.04, z], cor, {
      rot: [Math.PI / 2, 0, 0],
    });
  por(pecas, 'oculos-r-ponte', 'cabeca', 'cabeca', 'caixa', [0.12, 0.022, 0.022], [0, -0.03, z], cor, { raio: 0.008 });
}

/**
 * As sobrancelhas grisalhas de quem é mais velho (a Vovó, o Seu Jerônimo): dois risquinhos
 * macios acima dos olhos, um tico caídos para fora (o jeito bonzinho).
 */
export function sobrancelhas(pecas: Peca[], m: MedidasBoneco, cor: string): void {
  for (const s of [-1, 1])
    por(pecas, `sobrancelha${s}`, 'cabeca', 'cabeca', 'caixa', [0.12, 0.034, 0.03], [s * 0.15, 0.085, m.zRosto - 0.004], cor, {
      raio: 0.014,
      rot: [0, 0, s * 0.16],
    });
}

/**
 * A lanterninha do Conde Dudu, pendurada na mão esquerda: a alça, a tampinha de telhado, o
 * vidro aceso de luz própria (brilha sem espalhar luz na roupa: nenhuma luz da cena, e fora do
 * brilho que borra) e as quatro grades roxas.
 */
export function lanterninha(pecas: Peca[], cor: string): void {
  const z = 0.04;
  por(pecas, 'lanterninha-alca', 'maoE', 'mao', 'anel', [0.12, 0.022, 0], [0, -0.06, z], cor, { rot: [0, Math.PI / 2, 0] });
  por(pecas, 'lanterninha-telhado', 'maoE', 'mao', 'cilindro', [0.06, 0.1, 0.03], [0, -0.105, z], cor);
  por(pecas, 'lanterninha-tampa', 'maoE', 'mao', 'caixa', [0.15, 0.04, 0.15], [0, -0.15, z], cor, { raio: 0.018 });
  por(pecas, 'lanterninha-vidro', 'maoE', 'mao', 'caixa', [0.118, 0.15, 0.118], [0, -0.245, z], '#ffd27a', {
    raio: 0.02,
    luz: 'vela',
  });
  por(pecas, 'lanterninha-fundo', 'maoE', 'mao', 'caixa', [0.15, 0.04, 0.15], [0, -0.34, z], cor, { raio: 0.018 });
  for (const [gx, gz] of [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ])
    por(pecas, `lanterninha-grade${gx}${gz}`, 'maoE', 'mao', 'caixa', [0.022, 0.17, 0.022], [gx * 0.062, -0.245, z + gz * 0.062], cor, { raio: 0.008 });
}

/**
 * O detalhe de festa do Seu Jerônimo, que o separa do fazendeiro do Rancho: o lenço roxo de
 * festa no pescoço (por cima das alças do macacão), o broche de abóbora sorridente no peito e a
 * fita do chapéu de palha em roxo e laranja.
 */
export function lencoEBroche(pecas: Peca[], m: MedidasBoneco, roxo: string, laranja: string): void {
  const { troncoH, frente } = m;
  const z = frente + 0.03;
  placa(
    pecas,
    'lenco-festa',
    'tronco',
    'tronco',
    [
      [-0.085, 0.07],
      [0, -0.08],
      [0.085, 0.07],
    ],
    0.026,
    [0, troncoH - 0.09, z],
    roxo,
  );
  por(pecas, 'lenco-festa-no', 'tronco', 'tronco', 'esfera', [0.046, 0.04, 0.034], [0, troncoH - 0.025, z - 0.004], roxo);
  // o broche: a abóbora redondinha de gomos, o cabinho verde e os olhinhos e o sorriso
  const bx = -0.075;
  const by = 0.2;
  const bz = frente + 0.045;
  por(pecas, 'broche', 'tronco', 'tronco', 'esfera', [0.05, 0.043, 0.026], [bx, by, bz], laranja);
  por(pecas, 'broche-cabo', 'tronco', 'tronco', 'caixa', [0.014, 0.024, 0.012], [bx, by + 0.048, bz], '#5f7d34', { raio: 0.005 });
  for (const s of [-1, 1])
    por(pecas, `broche-olho${s}`, 'tronco', 'tronco', 'esfera', [0.008, 0.009, 0.004], [bx + s * 0.017, by + 0.008, bz + 0.024], '#3a2418');
  por(pecas, 'broche-boca', 'tronco', 'tronco', 'caixa', [0.026, 0.007, 0.004], [bx, by - 0.015, bz + 0.024], '#3a2418', { raio: 0.003 });
  for (const q of pecas) if (q.nome === 'palha-fita') q.cor = roxo;
  // a listrinha laranja na fita roxa (duas cores, nunca na ordem do arco-íris)
  const fita = pecas.find((q) => q.nome === 'palha-fita');
  if (fita)
    por(pecas, 'palha-fita-listra', 'cabeca', 'cabeca', 'cilindro', [0.022, fita.tamanho[1] + 0.004, fita.tamanho[2] + 0.004], fita.pos, laranja);
}

/**
 * O cabelo grisalho do Seu Jerônimo debaixo do chapéu de palha: mechas dos lados e na nuca,
 * nunca uma faixa contínua em volta da cabeça (a tampa de cabelo, que aparecia como uma faixa
 * branca debaixo da aba, sai), e o chapéu assentado um pouco mais baixo, rente à cabeça.
 */
export function mechasGrisalhas(pecas: Peca[], m: MedidasBoneco, cor: string): void {
  for (let i = pecas.length - 1; i >= 0; i--) {
    const q = pecas[i];
    if (
      (q.junta === 'cabeca' || q.junta === 'topete') &&
      !q.apoio &&
      /^(cabelo|nuca|topete|franja|lado|costas|cacho|rabo|coque|tranca|chanel|mecha)/.test(q.nome)
    )
      pecas.splice(i, 1);
  }
  // o chapéu desce o que a tampa de cabelo tinha de altura (a aba encosta no alto da cabeça)
  const desce = m.baseChapeu + 0.06 - m.topo;
  for (const q of pecas)
    if (q.junta === 'cabeca' && /^palha-/.test(q.nome)) q.pos = [q.pos[0], q.pos[1] - desce, q.pos[2]];
  const { cab, topo } = m;
  for (const s of [-1, 1]) {
    // dos lados, atrás de onde ficaria a orelha: duas mechas, a de cima maior
    por(pecas, `mecha-lado${s}`, 'cabeca', 'cabeca', 'esfera', [0.06, 0.1, 0.1], [s * (cab.w / 2 - 0.005), topo - 0.12, -0.08], cor);
    por(pecas, `mecha-lado-baixo${s}`, 'cabeca', 'cabeca', 'esfera', [0.05, 0.075, 0.08], [s * (cab.w / 2 - 0.008), topo - 0.25, -0.13], cor);
    // na nuca: dois tufinhos de cada lado, com o vão no meio (nada de faixa)
    por(pecas, `mecha-nuca${s}`, 'cabeca', 'cabeca', 'esfera', [0.1, 0.09, 0.06], [s * 0.15, topo - 0.13, -cab.d / 2 - 0.005], cor);
  }
  por(pecas, 'mecha-nuca-baixo', 'cabeca', 'cabeca', 'esfera', [0.1, 0.07, 0.05], [0, topo - 0.26, -cab.d / 2 - 0.004], cor);
}
