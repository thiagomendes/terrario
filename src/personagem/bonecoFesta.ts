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
    const NV = 10;
    const NU = 24;
    const pos: number[] = [];
    const ind: number[] = [];
    for (let i = 0; i <= NV; i++)
      for (let j = 0; j <= NU; j++) {
        const t = i / NV;
        const u = -1 + (2 * j) / NU;
        // (um tico mais alta e mais aberta que a do esboço: na cabeça grande do boneco, a gola
        // do esboço sumia atrás dela vista de frente)
        const r = 0.46 + 0.12 * t ** 1.5 - dr;
        const th = u * (1.26 + 0.22 * t);
        const y = troncoH - 0.04 + (0.5 - baixa) * t + 0.07 * t * Math.abs(u) ** 2;
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
  // (a base da orelha assenta no alto do cabelo, sem entrar nele: no raspado, entrava)
  const y = m.topoTampa + (tipo === 'gatinho' ? 0.066 : 0.078);
  const perfil = tipo === 'gatinho' ? perfilOrelhaGato() : perfilOrelhaMorcego();
  const k = tipo === 'gatinho' ? 0.6 : 0.62;
  for (const s of [-1, 1]) {
    // (bem nos cantos de cima da cabeça: o coque e o topete no meio ficam livres entre elas)
    const x = s * (m.cab.w / 2 - 0.08);
    por(pecas, `orelha-${tipo}${s}`, 'cabeca', 'cabeca', 'placa', [0.2, 0.3, 0.05], [x, y, -0.02], cor, {
      perfil,
      rot: [0, 0, -s * (tipo === 'gatinho' ? 0.22 : 0.35)],
    });
    por(pecas, `orelha-${tipo}-dentro${s}`, 'cabeca', 'cabeca', 'placa', [0.12, 0.18, 0.02], [x, y - 0.005, 0.02], dentro, {
      perfil: perfil.map(([px, py]) => [px * k, py * k] as P2),
      rot: [0, 0, -s * (tipo === 'gatinho' ? 0.22 : 0.35)],
    });
  }
}
