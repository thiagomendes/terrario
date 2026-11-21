/**
 * Spec 027 (T08): o macacão peludo do Bento (o monstrinho grandão da Noite das Fantasias), feito
 * uma vez e reaproveitado pela fantasia de Monstrinho Peludo da criança. Só dados, como o resto
 * do plano (personagem/boneco.ts): o pelo de tufos em volta do tronco, dos braços e das pernas,
 * a barriga clara, o capuz de monstro coberto de tufos (também no alto) com a franja que cai na
 * testa sem tapar os olhos, os chifrinhos redondos e os pezões de três dedinhos.
 *
 * O pelo vem em três versões, todas verde-musgo (o dono escolhe; só a forma dos tufos varia):
 * - 'tufos': tufos grandes e redondos (a recomendada, a que fica em uso se ele não escolher);
 * - 'miudos': tufos miúdos e cheios, como penugem;
 * - 'mechas': mechas compridas que escorrem para baixo.
 * Tudo fosco (nada de brilho de plástico no pelo), na tinta da fantasia.
 */
import type { MedidasBoneco } from './bonecoFantasia';
import type { Junta, Peca } from './boneco';

type V3 = [number, number, number];

export type EstiloPelo = 'tufos' | 'miudos' | 'mechas';
export const ESTILOS_PELO: readonly EstiloPelo[] = ['tufos', 'miudos', 'mechas'];

/**
 * A versão do pelo em uso (T08): a recomendada até o dono escolher outra. Trocar depois é só
 * trocar aqui.
 */
export const PELO_EM_USO: EstiloPelo = 'tufos';

let peloAgora: EstiloPelo = PELO_EM_USO;
/** Só para as fotos lado a lado da T08: o pelo dos próximos bonecos montados. */
export function definirPeloDeTeste(e: EstiloPelo | null): void {
  peloAgora = e ?? PELO_EM_USO;
}
export function peloEmUso(): EstiloPelo {
  return peloAgora;
}

/** O verde-musgo do pelo (oliva apagado: o verde-folha saturado puxava para planta). */
export const COR_PELO = '#6b7444';

/** Número de 0 a 1 que só depende de (a, b): o espalhado dos tufos sai sempre igual. */
const sorte = (a: number, b: number) => {
  const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return s - Math.floor(s);
};

/** O giro (x, y, z) que leva o "para cima" de uma peça para a direção `n`. */
function giroPara(n: V3): V3 {
  const l = Math.hypot(...n) || 1;
  const [x, y, z] = [n[0] / l, n[1] / l, n[2] / l];
  return [Math.acos(Math.max(-1, Math.min(1, y))), Math.atan2(x, z), 0];
}

function hex(c: string): V3 {
  const v = parseInt(c.slice(1), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}
function misturar(a: string, b: string, t: number): string {
  const pa = hex(a);
  const pb = hex(b);
  return `#${pa.map((v, i) => Math.round(v + (pb[i] - v) * t).toString(16).padStart(2, '0')).join('')}`;
}

/** O jeito de cada versão: tamanho do tufo, quantos por volta, as gotas e o achatado. */
interface Jeito {
  /** Tamanho do tufo (1 = o do esboço aprovado). */
  tam: number;
  /** Quantos tufos numa volta do tronco, e as fileiras do tronco. */
  volta: number;
  fileiras: number;
  /** As gotas de cada tufo: raio, avanço ao longo do pelo, afastamento da superfície, escala. */
  gotas: Array<[number, number, number, V3]>;
  /** Quantos tufos numa volta do braço e da perna, e as fileiras. */
  voltaMembro: number;
  fileirasBraco: number;
  fileirasPerna: number;
  /** Fileiras do capuz: [latitude, tufos na volta]. */
  capuz: Array<[number, number]>;
}

const JEITOS: Record<EstiloPelo, Jeito> = {
  // grandes e redondos: três gotas cheias, pouco achatadas, a ponta virando para fora
  tufos: {
    tam: 1.25,
    volta: 20,
    fileiras: 4,
    gotas: [
      [0.075, 0, 0.012, [1.1, 1.0, 0.78]],
      [0.056, 0.058, 0.03, [1.05, 1.0, 0.82]],
      [0.034, 0.094, 0.05, [1, 1, 0.9]],
    ],
    voltaMembro: 7,
    fileirasBraco: 3,
    fileirasPerna: 2,
    capuz: [
      [1.3, 5],
      [0.95, 10],
      [0.55, 13],
      [0.15, 15],
      [-0.25, 14],
    ],
  },
  // miúdos e cheios: muitos tufinhos pequenos, bem juntos, como penugem
  miudos: {
    tam: 0.72,
    volta: 34,
    fileiras: 7,
    gotas: [
      [0.075, 0, 0.006, [1.15, 1.0, 0.6]],
      [0.052, 0.06, 0.02, [1.1, 1.0, 0.62]],
      [0.03, 0.095, 0.036, [1, 1, 0.8]],
    ],
    voltaMembro: 11,
    fileirasBraco: 5,
    fileirasPerna: 3,
    capuz: [
      [1.38, 6],
      [1.12, 14],
      [0.82, 20],
      [0.5, 24],
      [0.18, 26],
      [-0.14, 26],
      [-0.45, 22],
    ],
  },
  // mechas compridas: quatro gotas finas escorrendo para baixo, a ponta afinando
  mechas: {
    tam: 1,
    volta: 22,
    fileiras: 4,
    gotas: [
      [0.06, 0, 0.006, [1.0, 1.0, 0.55]],
      [0.052, 0.07, 0.014, [0.95, 1.25, 0.55]],
      [0.042, 0.14, 0.022, [0.9, 1.35, 0.6]],
      [0.03, 0.2, 0.032, [0.85, 1.2, 0.7]],
    ],
    voltaMembro: 8,
    fileirasBraco: 3,
    fileirasPerna: 2,
    capuz: [
      [1.3, 5],
      [0.98, 11],
      [0.62, 15],
      [0.26, 17],
      [-0.12, 17],
    ],
  },
};

/** O centro e os raios do capuz de monstro (na junta da cabeça). */
const CAPUZ_C: V3 = [0, 0.1, -0.2];
const CAPUZ_R: V3 = [0.53, 0.56, 0.48];

/**
 * O macacão de tufos (tronco, braços e pernas) com a barriga clara. `cor` é o verde-musgo da
 * fantasia; os três tons do pelo saem dele.
 */
export function macacaoDeTufos(pecas: Peca[], m: MedidasBoneco, cor: string, estilo = peloAgora): void {
  const j = JEITOS[estilo];
  const tons = [cor, misturar(cor, '#ffffff', 0.06), misturar(cor, '#000000', 0.07)];
  const { troncoH, prof, frente, larg } = m;
  const tufo = criarTufo(pecas, j, tons);
  // a roupa de baixo no verde do pelo, na tinta de sempre e fosca, como os tufos (na tinta da
  // fantasia, o espaço linear, o verde entre os tufos ficava mais escuro que eles)
  for (const p of pecas)
    if (p.cor.toLowerCase() === cor.toLowerCase()) {
      p.viva = false;
      p.brilho = 0;
    }
  // a barriga clara e fosca
  pecas.push({
    nome: 'peludo-barriga',
    junta: 'tronco',
    apoio: 'tronco',
    forma: 'esfera',
    tamanho: [0.2 * larg * 2.0, 0.2 * 0.95, 0.2 * 0.32],
    pos: [0, troncoH * 0.56, frente - 0.03],
    cor: misturar(cor, '#e8e4c0', 0.55),
    brilho: 0,
    viva: false,
  });
  // o tronco: fileiras desencontradas em volta (dos ombros até o quadril), a barriga livre
  for (let f = 0; f < j.fileiras; f++) {
    const y = troncoH + 0.01 - (f * (troncoH * 0.82)) / Math.max(1, j.fileiras - 1);
    for (let q = 0; q < j.volta; q++) {
      const t = ((q + (f % 2) * 0.5) / j.volta) * Math.PI * 2;
      const x = Math.sin(t) * (larg / 2 + 0.005);
      const z = Math.cos(t) * (prof / 2 + 0.005);
      if (z > 0 && Math.abs(x) < larg * 0.3 && f > 0) continue;
      tufo('tronco', 'tronco', [x, y, z], [Math.sin(t), f === 0 ? 0.5 : 0, Math.cos(t)]);
    }
  }
  // os braços e as pernas: tufos em volta
  for (const lado of ['bracoE', 'bracoD'] as const)
    for (let f = 0; f < j.fileirasBraco; f++)
      for (let q = 0; q < j.voltaMembro; q++) {
        const t = ((q + (f % 2) * 0.5) / j.voltaMembro) * Math.PI * 2;
        const y = 0.02 - (f * 0.24) / Math.max(1, j.fileirasBraco - 1);
        tufo(lado, 'braco', [Math.sin(t) * 0.085, y, Math.cos(t) * 0.085], [Math.sin(t), 0, Math.cos(t)], 0.85);
      }
  for (const lado of ['pernaE', 'pernaD'] as const)
    for (let f = 0; f < j.fileirasPerna; f++)
      for (let q = 0; q < j.voltaMembro; q++) {
        const t = ((q + f * 0.5) / j.voltaMembro) * Math.PI * 2;
        const y = -0.02 - (f * 0.18) / Math.max(1, j.fileirasPerna - 1);
        tufo(lado, 'perna', [Math.sin(t) * 0.095, y, Math.cos(t) * 0.095], [Math.sin(t), 0, Math.cos(t)], 0.9);
      }
}

/**
 * O capuz de monstro: a bola fosca por trás e por cima da cabeça, coberta de tufos em toda a
 * volta, também no alto; na frente, a moldura do rosto e a franja que cai na testa (acima dos
 * olhos); os chifrinhos redondos saindo do pelo.
 */
export function capuzDeMonstro(pecas: Peca[], m: MedidasBoneco, cor: string, estilo = peloAgora): void {
  const j = JEITOS[estilo];
  const tons = [cor, misturar(cor, '#ffffff', 0.06), misturar(cor, '#000000', 0.07)];
  const tufo = criarTufo(pecas, j, tons);
  // o cabelo inteiro fica guardado dentro do capuz (a franja do cabelo virava uma faixa marrom
  // em cima dos olhos)
  for (let i = pecas.length - 1; i >= 0; i--) {
    const q = pecas[i];
    if (
      (q.junta === 'cabeca' || q.junta === 'topete') &&
      /^(cabelo|topete|franja|chanel|coque|rabo|cacho|costas|tranca|mecha|trança)/.test(q.nome)
    )
      pecas.splice(i, 1);
  }
  pecas.push({
    nome: 'peludo-capuz',
    junta: 'cabeca',
    apoio: 'cabeca',
    forma: 'esfera',
    tamanho: CAPUZ_R,
    pos: CAPUZ_C,
    cor,
    brilho: 0,
    viva: false,
  });
  const naCasca = (fi: number, u: number) => {
    const p: V3 = [
      CAPUZ_C[0] + CAPUZ_R[0] * Math.cos(fi) * Math.sin(u),
      CAPUZ_C[1] + CAPUZ_R[1] * Math.sin(fi),
      CAPUZ_C[2] + CAPUZ_R[2] * Math.cos(fi) * Math.cos(u),
    ];
    const n: V3 = [
      (p[0] - CAPUZ_C[0]) / CAPUZ_R[0] ** 2,
      (p[1] - CAPUZ_C[1]) / CAPUZ_R[1] ** 2,
      (p[2] - CAPUZ_C[2]) / CAPUZ_R[2] ** 2,
    ];
    return { p, n };
  };
  // o tufo do cocuruto (o alto do capuz não fica liso)
  const topo = naCasca(Math.PI / 2 - 0.02, 0);
  tufo('cabeca', 'cabeca', topo.p, [0, 1, -0.25], 1.1);
  for (const [fi, nq] of j.capuz)
    for (let q = 0; q < nq; q++) {
      const uu = ((q + (nq % 2) * 0.5) / nq) * Math.PI * 2;
      // (na frente, só por cima e dos lados do rosto: o rosto fica livre)
      if (Math.cos(uu) > 0.5 && fi < 0.85) continue;
      const { p, n } = naCasca(fi, uu);
      tufo('cabeca', 'cabeca', p, n, 1.12);
    }
  // a moldura do rosto: tufos em volta da abertura, de orelha a orelha (o queixo livre)
  for (let q = 0; q < 14; q++) {
    const t = (q / 14) * Math.PI * 2 + 0.2;
    if (Math.sin(t) < -0.75) continue;
    tufo('cabeca', 'cabeca', [Math.cos(t) * 0.4, -0.03 + Math.sin(t) * 0.37, 0.25], [Math.cos(t), Math.sin(t), 0.45], 0.8);
  }
  // a franja de pelo que cai na testa, sem tapar os olhos: presa na beira de cima do rosto e
  // virada mais para cima, curtinha (só a pontinha desce na testa)
  for (let q = 0; q < 7; q++) {
    const x = -0.3 + q * 0.1;
    tufo('cabeca', 'cabeca', [x, m.topo + 0.01 - Math.abs(x) * 0.08, m.zRosto - 0.01], [0, 0.85, 0.55], 0.72);
  }
  for (const s of [-1, 1]) {
    // os chifrinhos: curtos e redondos, um tico para fora (laranja apagado, fosco)
    const h = naCasca(1.05, s * 0.5);
    pecas.push({
      nome: `peludo-chifre${s}`,
      junta: 'cabeca',
      apoio: 'cabeca',
      forma: 'caixa',
      // (mais altos onde os tufos são grandes: os chifrinhos sempre saem do pelo)
      tamanho: [0.1, 0.13 + 0.06 * j.tam, 0.1],
      raio: 0.05,
      pos: [h.p[0] + s * 0.02, h.p[1] + 0.02 + 0.07 * j.tam, h.p[2]],
      rot: [0, 0, -s * 0.38],
      cor: '#d9863c',
      brilho: 0,
      viva: false,
    });
  }
}

/** Os pezões: no lugar do sapato, pés grandes e redondos com três dedinhos claros. */
export function pezoes(pecas: Peca[], m: MedidasBoneco, cor: string): void {
  for (let i = pecas.length - 1; i >= 0; i--) if (/^perna[ED]-sapato$/.test(pecas[i].nome)) pecas.splice(i, 1);
  const claro = misturar(cor, '#e8e4c0', 0.45);
  for (const lado of ['pernaE', 'pernaD'] as const) {
    const y = -m.quadril + 0.085;
    pecas.push({
      nome: `${lado}-sapato`,
      junta: lado,
      apoio: 'perna',
      forma: 'caixa',
      tamanho: [0.25, 0.16, 0.36],
      raio: 0.07,
      pos: [0, y, 0.05],
      cor: misturar(cor, '#000000', 0.12),
      brilho: 0,
      viva: false,
    });
    for (const x of [-0.07, 0, 0.07])
      pecas.push({
        nome: `${lado}-dedo${x}`,
        junta: lado,
        apoio: 'perna',
        forma: 'esfera',
        tamanho: [0.045, 0.036, 0.036],
        pos: [x, y - 0.02, 0.22],
        cor: claro,
        brilho: 0,
        viva: false,
      });
  }
}

/**
 * O tufo de pelúcia: gotas encavaladas deitadas na superfície, escorrendo para baixo como pelo
 * penteado, e só a pontinha virando para fora (espetado para fora, o tufo parecia minhoca).
 */
function criarTufo(pecas: Peca[], j: Jeito, tons: string[]) {
  let k = pecas.filter((p) => p.nome.startsWith('peludo-tufo')).length;
  return (junta: Junta, apoio: Peca['apoio'], base: V3, n: V3, tam = 1) => {
    const ln = Math.hypot(...n) || 1;
    const nn: V3 = [n[0] / ln, n[1] / ln, n[2] / ln];
    const t0: V3 = [nn[1] * nn[0], -1 + nn[1] * nn[1], nn[1] * nn[2]];
    const lt = Math.hypot(...t0);
    // (no alto do capuz, o pelo escorre para trás)
    const tg: V3 = lt > 0.25 ? [t0[0] / lt, t0[1] / lt, t0[2] / lt] : [0, -0.2, -1];
    const d0: V3 = [tg[0] + nn[0] * 0.3, tg[1] + nn[1] * 0.3, tg[2] + nn[2] * 0.3];
    const ld = Math.hypot(...d0) || 1;
    const d: V3 = [d0[0] / ld, d0[1] / ld, d0[2] / ld];
    const s = tam * j.tam * (0.9 + sorte(k, 13) * 0.25);
    const cor = tons[k % 3];
    const rot = giroPara(d);
    j.gotas.forEach(([r, fd, fn, esc], g) => {
      pecas.push({
        nome: `peludo-tufo${k}-${g}`,
        junta,
        apoio,
        forma: 'esfera',
        tamanho: [r * s * esc[0], r * s * esc[1], r * s * esc[2]],
        pos: [
          base[0] + (d[0] * fd + nn[0] * fn) * s,
          base[1] + (d[1] * fd + nn[1] * fn) * s,
          base[2] + (d[2] * fd + nn[2] * fn) * s,
        ],
        rot,
        cor,
        brilho: 0,
        viva: false,
      });
    });
    k++;
  };
}
