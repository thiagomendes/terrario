/**
 * Spec 017 (T03): as peças das fantasias no boneco de brinquedo. Só dados, como o resto do
 * plano (personagem/boneco.ts): lê as peças da fantasia vestida (fantasias.ts) e acrescenta as
 * peças novas presas na junta certa, cada uma marcada com o apoio (o teste de encaixe mede o
 * vão entre ela e o boneco). Medidas e jeito como no esboço aprovado
 * (`.sdd/specs/017-fantasias/referencia/fantasias.html`).
 *
 * A fantasia veste o personagem da criança: corpo, pele, rosto e cabelo continuam os dela.
 * O que muda o rosto ou o cabelo é só o necessário para nada atravessar: a máscara traz os
 * olhos para a frente dela, e o que vai na cabeça diz como o cabelo fica por baixo.
 */
import type { Corpo } from './aparencia';
import { asasDragao, capuzDragao, corpoDragao, patasDragao } from './bonecoPremium';
import type { ModoCabelo, Peca } from './boneco';
import {
  clarear,
  corDaPeca,
  escurecer,
  fantasiaPorId,
  pecasVestidas,
  type FantasiaVestida,
  type PecaFantasia,
  type Simbolo,
  type TipoPeca,
} from './fantasias';

type P2 = [number, number];
type V3 = [number, number, number];

/** Medidas do boneco que as peças usam (as mesmas do plano). */
export interface MedidasBoneco {
  feminino: boolean;
  larg: number;
  troncoH: number;
  prof: number;
  /** Frente do peito (z). */
  frente: number;
  pernaH: number;
  quadril: number;
  xBraco: number;
  cab: { w: number; h: number; d: number };
  /** Alto da cabeça, alto da tampa de cabelo e onde os chapéus assentam (na cabeça). */
  topo: number;
  topoTampa: number;
  baseChapeu: number;
  zRosto: number;
  raspado: boolean;
  /** A tampa de cabelo (caixa de cantos redondos na cabeça): largura, altura, fundo, centro. */
  tampa: { w: number; h: number; d: number; y: number; raio: number };
}

/**
 * O contorno da tampa de cabelo no corte z (visto de frente): sobe pelo lado esquerdo desde
 * `yMin`, passa por cima e desce pelo direito. Cada ponto vem com a normal para fora.
 */
function contornoDaTampa(
  m: MedidasBoneco,
  z: number,
  yMin: number,
  passo: number,
): Array<{ p: P2; n: P2 }> {
  const t = m.tampa;
  const hx = t.w / 2;
  const hy = t.h / 2;
  const hz = t.d / 2;
  const r = Math.min(t.raio, hx, hy, hz);
  const fundo = Math.max(0, Math.abs(z) - (hz - r));
  const r2 = Math.sqrt(Math.max(0, r * r - fundo * fundo));
  // retângulo de dentro e o raio do canto neste corte
  const ix = hx - r;
  const iy = hy - r;
  const cy = t.y;
  const pontos: Array<{ p: P2; n: P2 }> = [];
  // caminho: lado esquerdo subindo, canto, topo, canto, lado direito descendo
  const trechos: Array<(u: number) => { p: P2; n: P2 }> = [];
  const yIni = Math.min(yMin, cy + iy);
  const lado = cy + iy - yIni;
  trechos.push((u) => ({ p: [-ix - r2, yIni + u * lado], n: [-1, 0] }));
  trechos.push((u) => {
    const a = Math.PI - (u * Math.PI) / 2;
    return {
      p: [-ix + Math.cos(a) * r2, cy + iy + Math.sin(a) * r2],
      n: [Math.cos(a), Math.sin(a)],
    };
  });
  trechos.push((u) => ({ p: [-ix + u * 2 * ix, cy + iy + r2], n: [0, 1] }));
  trechos.push((u) => {
    const a = Math.PI / 2 - (u * Math.PI) / 2;
    return {
      p: [ix + Math.cos(a) * r2, cy + iy + Math.sin(a) * r2],
      n: [Math.cos(a), Math.sin(a)],
    };
  });
  trechos.push((u) => ({ p: [ix + r2, cy + iy - u * lado], n: [1, 0] }));
  const comprimentos = [lado, (Math.PI / 2) * r2, 2 * ix, (Math.PI / 2) * r2, lado];
  const total = comprimentos.reduce((a, b) => a + b, 0);
  const n = Math.max(2, Math.round(total / passo));
  for (let i = 0; i <= n; i++) {
    let d = (i / n) * total;
    let k = 0;
    while (k < comprimentos.length - 1 && d > comprimentos[k]) d -= comprimentos[k++];
    pontos.push(trechos[k](comprimentos[k] > 0 ? Math.min(1, d / comprimentos[k]) : 0));
  }
  return pontos;
}

/** A roupa de baixo da fantasia, já em cores. */
export function roupaDaFantasia(
  f: FantasiaVestida,
  corpo: Corpo,
): { camisa: string; manga?: string; calca: string; sapato?: string } | null {
  const def = fantasiaPorId(f.id);
  if (!def) return null;
  const r = def.visual[corpo].roupa;
  return {
    camisa: corDaPeca(f, r.camisa),
    manga: r.manga ? corDaPeca(f, r.manga) : undefined,
    calca: corDaPeca(f, r.calca),
    sapato: r.sapato ? corDaPeca(f, r.sapato) : undefined,
  };
}

// ---------------------------------------------------------------------------
// Contornos das placas (no plano xy, centrados na caixa deles)

function centrar(pts: P2[]): P2[] {
  let x0 = Infinity;
  let x1 = -Infinity;
  let y0 = Infinity;
  let y1 = -Infinity;
  for (const [x, y] of pts) {
    x0 = Math.min(x0, x);
    x1 = Math.max(x1, x);
    y0 = Math.min(y0, y);
    y1 = Math.max(y1, y);
  }
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  return pts.map(([x, y]) => [x - cx, y - cy]);
}

/** Estrela de 5 pontas de raio r. */
export function perfilEstrela(r: number): P2[] {
  return centrar(
    Array.from({ length: 10 }, (_, i) => {
      const a = Math.PI / 2 + (i * Math.PI) / 5;
      const rr = i % 2 ? r * 0.45 : r;
      return [Math.cos(a) * rr, Math.sin(a) * rr] as P2;
    }),
  );
}

/** Raio (o do esboço) com a altura dada. */
export function perfilRaio(altura: number): P2[] {
  const k = altura / 0.2;
  return centrar(
    (
      [
        [0.02, 0.1],
        [-0.05, 0],
        [0, 0],
        [-0.03, -0.1],
        [0.06, 0.02],
        [0.01, 0.02],
        [0.05, 0.1],
      ] as P2[]
    ).map(([x, y]) => [x * k, y * k] as P2),
  );
}

/** Coração com a largura dada. */
export function perfilCoracao(largura: number): P2[] {
  const k = largura / 32;
  const pts: P2[] = [];
  for (let i = 0; i < 28; i++) {
    const t = (i / 28) * Math.PI * 2;
    pts.push([
      16 * Math.sin(t) ** 3 * k,
      (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) * k,
    ]);
  }
  return centrar(pts);
}

/** Folha (elipse pontuda) com a altura dada. */
export function perfilFolha(altura: number): P2[] {
  const pts: P2[] = [];
  for (let i = 0; i < 20; i++) {
    const t = (i / 20) * Math.PI * 2;
    // pontuda em cima e embaixo
    const l = Math.abs(Math.sin(t));
    pts.push([Math.sin(t) * 0.28 * altura * (0.6 + 0.4 * l), (Math.cos(t) * altura) / 2]);
  }
  return centrar(pts);
}

/** Concha (leque com o bico embaixo) de raio r. */
export function perfilConcha(r: number): P2[] {
  const pts: P2[] = [];
  for (let i = 0; i <= 8; i++) {
    const a = Math.PI * (i / 8);
    // a borda ondulada do leque
    const rr = r * (i % 2 ? 0.9 : 1);
    pts.push([Math.cos(a) * rr, Math.sin(a) * rr]);
  }
  pts.push([-r * 0.18, -r * 0.2], [r * 0.18, -r * 0.2]);
  // sentido anti-horário (do bico para a direita e por cima)
  return centrar([pts[pts.length - 1], ...pts.slice(0, -1)].reverse());
}

/** Triângulo de ponta para baixo (o lenço). */
function perfilLenco(w: number, h: number): P2[] {
  return centrar([
    [-w / 2, h / 2],
    [0, -h / 2],
    [w / 2, h / 2],
  ]);
}

/**
 * Pano da capa: estreito em cima (cabe entre os braços, que balançam sem entrar nele) e largo
 * embaixo, com as pontas de baixo arredondadas. Em cima no y = 0, descendo até −comprimento.
 */
function perfilCapa(cima: number, baixo: number, comprimento: number): P2[] {
  const r = Math.min(0.07, baixo / 6);
  const pts: P2[] = [
    [-cima / 2, 0],
    [cima / 2, 0],
  ];
  // lado direito descendo até a ponta redonda
  const meioBaixo = baixo / 2;
  pts.push([meioBaixo, -comprimento + r]);
  for (let i = 1; i <= 3; i++) {
    const a = (i / 4) * (Math.PI / 2);
    pts.push([meioBaixo - r + Math.cos(a) * r, -comprimento + r - Math.sin(a) * r]);
  }
  pts.push([0, -comprimento - 0.01]);
  for (let i = 3; i >= 1; i--) {
    const a = (i / 4) * (Math.PI / 2);
    pts.push([-meioBaixo + r - Math.cos(a) * r, -comprimento + r - Math.sin(a) * r]);
  }
  pts.push([-meioBaixo, -comprimento + r]);
  // sentido anti-horário
  return pts.reverse();
}

// ---------------------------------------------------------------------------

export interface FantasiaNoBoneco {
  /** Como o cabelo fica por baixo do que vai na cabeça (null: nada muda). */
  cabelo: ModoCabelo | null;
  /** No capuz de dino o rabo de cavalo sai por baixo; nos outros fica guardado. */
  rabo: 'guardar' | 'baixo';
}

const OURO = '#ffd45a';
const BRANCO = '#ffffff';

/**
 * Acrescenta as peças da fantasia vestida ao plano (e ajusta o que ela cobre: luvas nas
 * mãos, botas no lugar do sapato, olhos na frente da máscara). Devolve como o cabelo fica.
 */
export function vestirFantasia(
  f: FantasiaVestida,
  corpo: Corpo,
  pecas: Peca[],
  m: MedidasBoneco,
): FantasiaNoBoneco {
  const vestidas = pecasVestidas(f, corpo);
  const tem = (t: TipoPeca) => vestidas.some((p) => p.tipo === t);
  const cor = (p: PecaFantasia) => corDaPeca(f, p.cor);
  const principal = corDaPeca(f, 'principal');
  const { larg, troncoH, prof, frente, quadril, cab, zRosto } = m;

  const por = (p: Peca) => pecas.push(p);
  const caixa = (
    nome: string,
    junta: Peca['junta'],
    apoio: Peca['apoio'],
    t: V3,
    pos: V3,
    c: string,
    raio = 0.04,
    extra: Partial<Peca> = {},
  ) => por({ nome, junta, apoio, forma: 'caixa', tamanho: t, raio, pos, cor: c, ...extra });
  const bola = (
    nome: string,
    junta: Peca['junta'],
    apoio: Peca['apoio'],
    r: number,
    pos: V3,
    c: string,
    esc: V3 = [1, 1, 1],
    extra: Partial<Peca> = {},
  ) =>
    por({
      nome,
      junta,
      apoio,
      forma: 'esfera',
      tamanho: [r * esc[0], r * esc[1], r * esc[2]],
      pos,
      cor: c,
      ...extra,
    });
  const cilindro = (
    nome: string,
    junta: Peca['junta'],
    apoio: Peca['apoio'],
    altura: number,
    rBaixo: number,
    rCima: number,
    pos: V3,
    c: string,
    extra: Partial<Peca> = {},
  ) =>
    por({
      nome,
      junta,
      apoio,
      forma: 'cilindro',
      tamanho: [altura, rBaixo, rCima],
      pos,
      cor: c,
      ...extra,
    });
  const placa = (
    nome: string,
    junta: Peca['junta'],
    apoio: Peca['apoio'],
    perfil: P2[],
    espessura: number,
    pos: V3,
    c: string,
    extra: Partial<Peca> = {},
  ) => {
    let w = 0;
    let h = 0;
    for (const [x, y] of perfil) {
      w = Math.max(w, Math.abs(x) * 2);
      h = Math.max(h, Math.abs(y) * 2);
    }
    por({
      nome,
      junta,
      apoio,
      forma: 'placa',
      tamanho: [w, h, espessura],
      perfil,
      pos,
      cor: c,
      ...extra,
    });
  };
  const anel = (
    nome: string,
    junta: Peca['junta'],
    apoio: Peca['apoio'],
    diametro: number,
    espessura: number,
    pos: V3,
    c: string,
    arco = 0,
    extra: Partial<Peca> = {},
  ) =>
    por({
      nome,
      junta,
      apoio,
      forma: 'anel',
      tamanho: [diametro, espessura, arco],
      pos,
      cor: c,
      ...extra,
    });

  /**
   * Uma florzinha de 5 pétalas virada para `ang` (giro em y: 0 olha para a frente), com o
   * miolo amarelo. `r`: raio da pétala.
   */
  const flor = (
    nome: string,
    junta: Peca['junta'],
    apoio: Peca['apoio'],
    centro: V3,
    c: string,
    r = 0.04,
    ang = 0,
  ) => {
    const ux = Math.cos(ang);
    const uz = -Math.sin(ang);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + Math.PI / 2;
      const px = Math.cos(a) * r * 1.15;
      const py = Math.sin(a) * r * 1.15;
      bola(
        `${nome}-petala${i}`,
        junta,
        apoio,
        r,
        [centro[0] + ux * px, centro[1] + py, centro[2] + uz * px],
        c,
        [1, 1, 0.5],
        { rot: [0, ang, 0], brilho: 0.28 },
      );
    }
    const nx = Math.sin(ang);
    const nz = Math.cos(ang);
    bola(
      `${nome}-miolo`,
      junta,
      apoio,
      r * 0.8,
      [centro[0] + nx * r * 0.3, centro[1], centro[2] + nz * r * 0.3],
      OURO,
      [1, 1, 0.6],
      { rot: [0, ang, 0], brilho: 0.28 },
    );
  };

  /** O símbolo da fantasia em pé, virado para a frente (placa, flor ou floco). */
  const simbolo = (
    s: Simbolo,
    nome: string,
    junta: Peca['junta'],
    apoio: Peca['apoio'],
    tam: number,
    pos: V3,
    c: string,
    espessura = 0.03,
  ) => {
    switch (s) {
      case 'estrela':
        return placa(nome, junta, apoio, perfilEstrela(tam / 2), espessura, pos, c, {
          brilho: 0.28,
        });
      case 'raio':
        return placa(nome, junta, apoio, perfilRaio(tam), espessura, pos, c, { brilho: 0.28 });
      case 'coracao':
        return placa(nome, junta, apoio, perfilCoracao(tam), espessura, pos, c, { brilho: 0.28 });
      case 'folha':
        return placa(nome, junta, apoio, perfilFolha(tam), espessura, pos, c, { brilho: 0.28 });
      case 'concha':
        return placa(nome, junta, apoio, perfilConcha(tam / 2), espessura, pos, c, {
          brilho: 0.28,
        });
      case 'flor':
        return flor(nome, junta, apoio, pos, c, tam / 4.5);
      case 'floco':
        for (let i = 0; i < 3; i++)
          caixa(`${nome}-${i}`, junta, apoio, [tam, tam * 0.13, espessura], pos, c, 0.012, {
            rot: [0, 0, (i * Math.PI) / 3],
            brilho: 0.28,
          });
        bola(
          `${nome}-meio`,
          junta,
          apoio,
          tam * 0.16,
          [pos[0], pos[1], pos[2] + 0.005],
          '#bfe8ff',
          [1, 1, 0.7],
        );
        return;
    }
  };

  // ---- ajustes no que a criança já veste ----
  if (tem('luvas')) {
    const c = cor(vestidas.find((p) => p.tipo === 'luvas')!);
    for (const p of pecas)
      if (/^braco[ED]-(mao|punho)$/.test(p.nome)) {
        p.cor = c;
        p.brilho = 0.35;
      }
  }
  if (tem('botas')) {
    const c = cor(vestidas.find((p) => p.tipo === 'botas')!);
    for (let i = pecas.length - 1; i >= 0; i--)
      if (/^perna[ED]-sapato$/.test(pecas[i].nome)) pecas.splice(i, 1);
    for (const lado of ['pernaE', 'pernaD'] as const) {
      caixa(`${lado}-bota`, lado, 'perna', [0.2, 0.2, 0.29], [0, -quadril + 0.1, 0.03], c, 0.06);
      caixa(
        `${lado}-bota-cano`,
        lado,
        'perna',
        [0.215, 0.045, 0.215],
        [0, -quadril + 0.19, 0.005],
        escurecer(c, 0.18),
        0.02,
      );
    }
  }
  if (tem('tenis-cano')) {
    // spec 026: o tênis de cano alto no lugar do sapato (sola branca, biqueira e cadarço)
    const c = cor(vestidas.find((p) => p.tipo === 'tenis-cano')!);
    for (let i = pecas.length - 1; i >= 0; i--)
      if (/^perna[ED]-sapato$/.test(pecas[i].nome)) pecas.splice(i, 1);
    const y0 = -quadril;
    for (const lado of ['pernaE', 'pernaD'] as const) {
      caixa(`${lado}-tenis`, lado, 'perna', [0.21, 0.11, 0.28], [0, y0 + 0.085, 0.03], c, 0.05);
      caixa(
        `${lado}-tenis-sola`,
        lado,
        'perna',
        [0.22, 0.045, 0.29],
        [0, y0 + 0.0225, 0.03],
        BRANCO,
        0.02,
      );
      caixa(
        `${lado}-tenis-bico`,
        lado,
        'perna',
        [0.2, 0.07, 0.07],
        [0, y0 + 0.075, 0.145],
        BRANCO,
        0.03,
      );
      caixa(`${lado}-tenis-cano`, lado, 'perna', [0.2, 0.14, 0.21], [0, y0 + 0.19, 0.005], c, 0.05);
      caixa(
        `${lado}-tenis-borda`,
        lado,
        'perna',
        [0.205, 0.03, 0.215],
        [0, y0 + 0.255, 0.005],
        BRANCO,
        0.012,
      );
      for (const k of [0, 1])
        caixa(
          `${lado}-tenis-cadarco${k}`,
          lado,
          'perna',
          [0.09, 0.018, 0.02],
          [0, y0 + 0.15 + k * 0.05, 0.113],
          BRANCO,
          0.006,
        );
    }
  }
  if (tem('mascara')) {
    // os olhos (com os cílios e o brilho) vêm para a frente da máscara, como no esboço
    for (const p of pecas)
      if (p.junta === 'cabeca' && /^(olho|brilho|cilio)/.test(p.nome))
        p.pos = [p.pos[0], p.pos[1], p.pos[2] + 0.04];
  }

  if (tem('cabelo-liso') || tem('colete-brim')) {
    // spec 026: o liso comprido do palco cai só até o meio das costas e não passa da largura
    // da cabeça (o colete, a correia da guitarra e a jaqueta aparecem por trás)
    for (const p of pecas)
      if (p.junta === 'cabeca' && p.nome === 'costas' && p.forma === 'caixa') {
        const cima = p.pos[1] + p.tamanho[1] / 2;
        const baixo = tem('colete-brim') ? -0.4 : -0.45;
        p.tamanho = [Math.min(p.tamanho[0], cab.w), cima - baixo, p.tamanho[2]];
        p.pos = [p.pos[0], (cima + baixo) / 2, p.pos[2]];
      }
  }
  if (tem('capa') || tem('capa-curta') || tem('capa-folhas')) {
    // com capa, o cabelo comprido das costas cai por cima da gola dela (termina acima do pano,
    // que levanta andando e correndo sem cortar o cabelo)
    for (const p of pecas)
      if (p.junta === 'cabeca' && p.nome === 'costas' && p.forma === 'caixa') {
        const cima = p.pos[1] + p.tamanho[1] / 2;
        const baixo = -0.2;
        p.tamanho = [p.tamanho[0], cima - baixo, p.tamanho[2]];
        p.pos = [p.pos[0], (cima + baixo) / 2, p.pos[2] - 0.01];
      }
  }

  let cabelo: ModoCabelo | null = null;
  let rabo: FantasiaNoBoneco['rabo'] = 'guardar';
  const sobreCabelo = (modo: ModoCabelo) => {
    // o que mais esconde o cabelo vence (bolha > capuz > chapéu)
    const ordem: ModoCabelo[] = ['chapeu', 'capuz', 'bolha'];
    if (!cabelo || ordem.indexOf(modo) > ordem.indexOf(cabelo)) cabelo = modo;
  };

  /**
   * Tiara: um arco liso por cima da tampa de cabelo, de orelha a orelha, no corte da frente
   * (como no esboço). A borda de dentro segue o contorno do cabelo, então o arco encosta nele
   * em todo o caminho, qualquer que seja o corte. `r`: meia largura do arco. Devolve o alto.
   */
  const arcoNaCabeca = (nome: string, c: string, r: number, z: number) => {
    const contorno = contornoDaTampa(m, z, m.tampa.y - m.tampa.h / 2 + 0.06, 0.035);
    // sem pontos repetidos nem três em linha (a placa triangula o contorno)
    const pontos: typeof contorno = [];
    for (const q of contorno) {
      const u = pontos[pontos.length - 1];
      if (u && Math.hypot(q.p[0] - u.p[0], q.p[1] - u.p[1]) < 0.012) continue;
      pontos.push(q);
    }
    const dentro = 0.006;
    const fora = 2 * r - dentro;
    const perfil: P2[] = [
      ...pontos.map(({ p: [x, y], n: [nx, ny] }): P2 => [x - nx * dentro, y - ny * dentro]),
      ...pontos
        .slice()
        .reverse()
        .map(({ p: [x, y], n: [nx, ny] }): P2 => [x + nx * fora, y + ny * fora]),
    ];
    let topo = -Infinity;
    for (const [, y] of perfil) topo = Math.max(topo, y);
    placa(nome, 'cabeca', 'cabeca', perfil, 2 * r, [0, 0, z], c, { brilho: 0.5 });
    return { topo };
  };

  /** Coroa assentada no cabelo, com pontas, pedrinhas e o símbolo na frente. */
  const coroa = (c: string, s: Simbolo | undefined) => {
    const base = m.baseChapeu + 0.07;
    const r = 0.25;
    cilindro('coroa-aro', 'cabeca', 'cabeca', 0.1, r, r, [0, base, 0], c, { brilho: 0.5 });
    const gemas = ['#ff5a8a', '#5ad8ff', '#7cff8a'];
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      cilindro(
        `coroa-ponta${i}`,
        'cabeca',
        'cabeca',
        0.14,
        0.06,
        0,
        [Math.sin(a) * (r - 0.05), base + 0.1, Math.cos(a) * (r - 0.05)],
        c,
        { brilho: 0.5 },
      );
      const ag = a + Math.PI / 5;
      bola(
        `coroa-gema${i}`,
        'cabeca',
        'cabeca',
        0.03,
        [Math.sin(ag) * (r + 0.005), base, Math.cos(ag) * (r + 0.005)],
        gemas[i % 3],
        [1, 1, 1],
        { brilho: 0.5 },
      );
    }
    if (s)
      simbolo(
        s,
        'coroa-simbolo',
        'cabeca',
        'cabeca',
        0.1,
        [0, base + 0.01, r + 0.015],
        s === 'floco' ? BRANCO : s === 'concha' ? '#ffd0e0' : s === 'flor' ? '#ff8fc8' : OURO,
        0.025,
      );
  };

  /** A varinha ou o cetro na mão esquerda (a direita segura os blocos e as ferramentas). */
  const naMao = (
    nome: string,
    c: string,
    s: Simbolo | undefined,
    grosso: number,
    cetro: boolean,
  ) => {
    const a = 1.1;
    const eixo: V3 = [0, Math.cos(a), Math.sin(a)];
    const comp = 0.38;
    const ini: V3 = [0, -0.01, 0.05];
    const centro: V3 = [ini[0], ini[1] + eixo[1] * (comp / 2), ini[2] + eixo[2] * (comp / 2)];
    cilindro(`${nome}-cabo`, 'maoE', 'mao', comp, grosso, grosso, centro, c, { rot: [a, 0, 0] });
    const ponta: V3 = [0, ini[1] + eixo[1] * (comp + 0.04), ini[2] + eixo[2] * (comp + 0.04)];
    if (cetro) {
      bola(
        `${nome}-bola`,
        'maoE',
        'mao',
        0.055,
        [0, ponta[1] - 0.01, ponta[2] - 0.02],
        OURO,
        [1, 1, 1],
        { brilho: 0.5 },
      );
      if (s)
        simbolo(
          s,
          `${nome}-simbolo`,
          'maoE',
          'mao',
          0.1,
          [0, ponta[1] + 0.02, ponta[2] + 0.04],
          s === 'floco' ? BRANCO : OURO,
          0.025,
        );
    } else if (s) {
      const corPonta =
        s === 'flor' ? '#ff8fc8' : s === 'concha' ? '#ffd0e0' : s === 'floco' ? BRANCO : OURO;
      // a ponta da varinha é sempre uma estrela ou o símbolo da princesa
      simbolo(
        s === 'floco' ? 'estrela' : s,
        `${nome}-ponta`,
        'maoE',
        'mao',
        0.17,
        ponta,
        corPonta,
        0.035,
      );
      if (s === 'floco')
        simbolo(
          'floco',
          `${nome}-floco`,
          'maoE',
          'mao',
          0.09,
          [ponta[0], ponta[1], ponta[2] + 0.025],
          BRANCO,
          0.02,
        );
    }
  };

  /** Pano da capa preso na junta da capa (atrás dos ombros), com a gola por cima. */
  const pano = (
    nome: string,
    c: string,
    cima: number,
    baixo: number,
    comprimento: number,
    espessura: number,
    z = 0,
  ) => {
    // o contorno já vai de y = 0 (na junta) até −comprimento; a frente do pano encosta nas
    // costas (que ficam 2 cm atrás da junta)
    placa(
      nome,
      'capa',
      'tronco',
      perfilCapa(cima, baixo, comprimento),
      espessura,
      [0, -0.005, -0.025 - espessura / 2 + z],
      c,
      { brilho: 0.28 },
    );
  };

  for (const p of vestidas) {
    const c = cor(p);
    switch (p.tipo) {
      // ------------------------------------------------------------ realeza
      case 'saia-camadas': {
        // sino em camadas preso na cintura: a de cima na cor, uma camada no meio e o babado
        // claro na barra, com as bolinhas; as pernas balançam por dentro
        const topoSaia = 0.06;
        const barra = -(quadril - 0.07);
        const h = topoSaia - barra;
        const rt = larg * 0.58;
        const rb = rt + 0.22;
        const R = (y: number) => rt + ((rb - rt) * (topoSaia - y)) / h;
        cilindro('saia-sino', 'saia', 'tronco', h, rb, rt, [0, (topoSaia + barra) / 2, 0], c, {
          brilho: 0.28,
        });
        const c1 = topoSaia - h * 0.3;
        const c2 = topoSaia - h * 0.6;
        cilindro(
          'saia-camada',
          'saia',
          'tronco',
          c1 - c2,
          R(c2) + 0.03,
          R(c1) - 0.01,
          [0, (c1 + c2) / 2, 0],
          escurecer(c, 0.08),
          { brilho: 0.28 },
        );
        const b1 = topoSaia - h * 0.78;
        cilindro(
          'saia-babado',
          'saia',
          'tronco',
          b1 - barra,
          R(barra) + 0.06,
          R(b1) - 0.01,
          [0, (b1 + barra) / 2, 0],
          clarear(c, 0.18),
          { brilho: 0.28 },
        );
        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * Math.PI * 2;
          const rr = R(barra) + 0.045;
          bola(
            `saia-perola${i}`,
            'saia',
            'tronco',
            0.04,
            [Math.sin(a) * rr, barra + 0.035, Math.cos(a) * rr],
            clarear(c, 0.45),
            [1, 1, 1],
            { brilho: 0.5 },
          );
        }
        // faixa na cintura e o botão dourado no peito
        caixa(
          'saia-faixa',
          'tronco',
          'tronco',
          [larg + 0.01, 0.06, prof + 0.01],
          [0, 0.04, 0],
          clarear(c, 0.5),
          0.03,
        );
        bola(
          'saia-botao',
          'tronco',
          'tronco',
          0.045,
          [0, troncoH * 0.72, frente],
          OURO,
          [1, 1, 0.5],
          { brilho: 0.5 },
        );
        break;
      }
      case 'mangas-bufantes':
        for (const lado of ['bracoE', 'bracoD'] as const)
          bola(`${lado}-bufante`, lado, 'braco', 0.112, [0, -0.025, 0], c, [1.1, 0.9, 1.1], {
            brilho: 0.28,
          });
        break;
      case 'coroa':
        coroa(c, p.simbolo);
        sobreCabelo('chapeu');
        break;
      case 'tiara': {
        const z = 0.29;
        const a = arcoNaCabeca('tiara', c, 0.032, z);
        // três florzinhas na frente do alto da tiara
        const flores: Array<[number, string]> = [
          [-0.15, '#ff5a8a'],
          [0, BRANCO],
          [0.15, '#ff8fc8'],
        ];
        for (const [x, cf] of flores)
          flor(
            `tiara-flor${x}`,
            'cabeca',
            'cabeca',
            [x, a.topo - 0.035 - Math.abs(x) * 0.15, z + 0.035],
            cf,
            0.04,
          );
        sobreCabelo('chapeu');
        break;
      }
      case 'enfeite-cabeca': {
        const z = 0.29;
        const a = arcoNaCabeca('enfeite-arco', c, 0.026, z);
        const s = p.simbolo ?? 'concha';
        if (s === 'concha') {
          // a concha do tamanho do esboço (leque de raio 0,18), em pé em cima do arco
          simbolo(
            'concha',
            'enfeite',
            'cabeca',
            'cabeca',
            0.36,
            [0, a.topo + 0.09, z],
            '#ffd0e0',
            0.045,
          );
          bola(
            'enfeite-perola',
            'cabeca',
            'cabeca',
            0.048,
            [0.19, a.topo - 0.012, z + 0.03],
            BRANCO,
            [1, 1, 1],
            { brilho: 0.5 },
          );
        } else simbolo(s, 'enfeite', 'cabeca', 'cabeca', 0.24, [0, a.topo + 0.1, z], BRANCO, 0.03);
        sobreCabelo('chapeu');
        break;
      }
      case 'varinha':
        naMao('varinha', c, p.simbolo, 0.018, false);
        break;
      case 'cetro':
        naMao('cetro', c, p.simbolo, 0.022, true);
        break;
      case 'casaco-faixa': {
        // casaco um pouco abaixo da cintura, com barra dourada, cinto, faixa atravessada,
        // medalha com o símbolo, gola alta e dragonas
        const fundoCasaco = -0.08;
        caixa(
          'casaco',
          'tronco',
          'tronco',
          [larg + 0.02, troncoH - fundoCasaco, prof + 0.02],
          [0, (troncoH + fundoCasaco) / 2, 0],
          c,
          0.12,
        );
        caixa(
          'casaco-barra',
          'tronco',
          'tronco',
          [larg + 0.03, 0.04, prof + 0.03],
          [0, fundoCasaco + 0.03, 0],
          OURO,
          0.02,
          { brilho: 0.5 },
        );
        caixa(
          'casaco-cinto',
          'tronco',
          'tronco',
          [larg + 0.03, 0.055, prof + 0.03],
          [0, 0.07, 0],
          escurecer(principal, 0.55),
          0.02,
        );
        caixa(
          'casaco-fivela',
          'tronco',
          'tronco',
          [0.08, 0.065, 0.025],
          [0, 0.07, frente + 0.025],
          OURO,
          0.012,
          { brilho: 0.5 },
        );
        caixa(
          'casaco-faixa',
          'tronco',
          'tronco',
          [0.09, troncoH * 1.25, 0.025],
          [0.01, troncoH * 0.52, frente + 0.018],
          BRANCO,
          0.012,
          { rot: [0, 0, 0.72] },
        );
        caixa(
          'casaco-faixa-ouro',
          'tronco',
          'tronco',
          [0.04, troncoH * 1.25, 0.012],
          [0.01, troncoH * 0.52, frente + 0.034],
          OURO,
          0.006,
          { rot: [0, 0, 0.72], brilho: 0.5 },
        );
        bola(
          'casaco-medalha',
          'tronco',
          'tronco',
          0.055,
          [-0.11, troncoH * 0.7, frente + 0.02],
          OURO,
          [1, 1, 0.4],
          { brilho: 0.5 },
        );
        if (p.simbolo)
          simbolo(
            p.simbolo,
            'casaco-simbolo',
            'tronco',
            'tronco',
            0.075,
            [-0.11, troncoH * 0.7, frente + 0.045],
            p.simbolo === 'flor' ? '#ff8fc8' : BRANCO,
            0.02,
          );
        caixa(
          'casaco-gola',
          'tronco',
          'tronco',
          [larg * 0.72, 0.06, prof * 0.86],
          [0, troncoH + 0.005, 0],
          OURO,
          0.025,
          { brilho: 0.5 },
        );
        for (const lado of ['bracoE', 'bracoD'] as const) {
          caixa(`${lado}-dragona`, lado, 'braco', [0.16, 0.05, 0.16], [0, 0.04, 0], OURO, 0.02, {
            brilho: 0.5,
          });
          caixa(
            `${lado}-dragona-punho`,
            lado,
            'braco',
            [0.145, 0.055, 0.155],
            [0, -0.215, 0],
            clarear(principal, 0.5),
            0.02,
          );
        }
        break;
      }
      case 'capa-curta': {
        // capa curta com gola de pelúcia e forro dourado
        const comp = 0.46;
        pano('capa-pano', c, 0.36, 0.52, comp, 0.035);
        pano('capa-forro', OURO, 0.32, 0.46, comp - 0.04, 0.012, -0.03);
        for (let i = 0; i < 6; i++)
          bola(
            `capa-pelucia${i}`,
            'capa',
            'tronco',
            0.05,
            [-0.15 + i * 0.06, 0.015, -0.035],
            BRANCO,
            [1, 1, 1],
            { brilho: 0.28 },
          );
        for (let i = 0; i < 7; i++)
          bola(
            `capa-barra${i}`,
            'capa',
            'tronco',
            0.035,
            [-0.21 + i * 0.07, -comp + 0.03, -0.045],
            BRANCO,
            [1, 1, 0.8],
            { brilho: 0.28 },
          );
        break;
      }
      // ------------------------------------------------------------ heróis
      case 'capa': {
        const emb = corDaPeca(f, 'emblema');
        const comp = Math.min(0.66, quadril + troncoH - 0.1);
        pano('capa-pano', c, 0.36, 0.62, comp, 0.04);
        caixa('capa-gola', 'capa', 'tronco', [0.4, 0.075, 0.13], [0, 0.015, -0.035], emb, 0.035);
        for (const s of [-1, 1])
          bola(
            `capa-broche${s}`,
            'capa',
            'tronco',
            0.045,
            [s * 0.16, 0.03, 0.085],
            emb,
            [1, 1, 0.8],
            { brilho: 0.5 },
          );
        break;
      }
      case 'mascara': {
        // faixa em volta da cabeça na altura dos olhos (a da heroína tem pontinhas)
        caixa(
          'mascara',
          'cabeca',
          'cabeca',
          [cab.w + 0.02, 0.15, cab.d + 0.02],
          [0, -0.015, 0],
          c,
          0.19,
        );
        if (m.feminino)
          for (const s of [-1, 1])
            caixa(
              `mascara-ponta${s}`,
              'cabeca',
              'cabeca',
              [0.13, 0.07, 0.05],
              [s * 0.3, 0.05, zRosto - 0.035],
              c,
              0.025,
              { rot: [0, s * 0.35, s * 0.55] },
            );
        break;
      }
      case 'emblema': {
        // fundo branco; símbolo claro (estrela branca) vai num fundo da cor escura
        const claro =
          parseInt(c.slice(1, 3), 16) + parseInt(c.slice(3, 5), 16) + parseInt(c.slice(5, 7), 16) >
          680;
        caixa(
          'emblema-fundo',
          'tronco',
          'tronco',
          [0.26, 0.24, 0.02],
          [0, troncoH * 0.55, frente + 0.005],
          claro ? escurecer(principal, 0.4) : BRANCO,
          0.08,
        );
        if (p.simbolo)
          simbolo(
            p.simbolo,
            'emblema',
            'tronco',
            'tronco',
            p.simbolo === 'raio' ? 0.19 : 0.17,
            [0, troncoH * 0.55, frente + 0.025],
            c,
            0.025,
          );
        break;
      }
      case 'cinto':
        caixa(
          'cinto',
          'tronco',
          'tronco',
          [larg + 0.015, 0.07, prof + 0.015],
          [0, 0.04, 0],
          c,
          0.03,
        );
        caixa(
          'cinto-fivela',
          'tronco',
          'tronco',
          [0.1, 0.08, 0.03],
          [0, 0.04, frente + 0.012],
          escurecer(principal, 0.3),
          0.02,
        );
        break;
      case 'luvas':
      case 'botas':
        // já entraram no lugar da mão e do sapato
        break;
      // ------------------------------------------------------------ dos temas
      case 'camisa-xadrez':
        for (let i = 0; i < 4; i++)
          caixa(
            `xadrez${i}`,
            'tronco',
            'tronco',
            [larg + 0.01, 0.025, prof + 0.01],
            [0, 0.06 + i * 0.1, 0],
            c,
            0.012,
          );
        for (const s of [-1, 1])
          caixa(
            `xadrez-v${s}`,
            'tronco',
            'tronco',
            [0.025, troncoH - 0.04, prof + 0.012],
            [s * larg * 0.3, troncoH / 2, 0],
            c,
            0.012,
          );
        for (const lado of ['bracoE', 'bracoD'] as const)
          for (const y of [-0.05, -0.15])
            caixa(`${lado}-xadrez${y}`, lado, 'braco', [0.14, 0.022, 0.15], [0, y, 0], c, 0.01);
        break;
      case 'macacao':
        caixa(
          'macacao',
          'tronco',
          'tronco',
          [larg + 0.02, 0.15, prof + 0.02],
          [0, 0.05, 0],
          c,
          0.05,
        );
        caixa(
          'macacao-peito',
          'tronco',
          'tronco',
          [0.28, 0.2, 0.03],
          [0, 0.18, frente + 0.01],
          c,
          0.03,
        );
        for (const s of [-1, 1]) {
          caixa(
            `macacao-alca${s}`,
            'tronco',
            'tronco',
            [0.06, 0.18, 0.03],
            [s * 0.11, 0.33, frente + 0.01],
            c,
            0.015,
          );
          caixa(
            `macacao-alca-costas${s}`,
            'tronco',
            'tronco',
            [0.06, 0.34, 0.03],
            [s * 0.11, 0.25, -frente - 0.01],
            c,
            0.015,
          );
          caixa(
            `macacao-alca-ombro${s}`,
            'tronco',
            'tronco',
            [0.06, 0.035, prof + 0.04],
            [s * 0.11, troncoH + 0.0, 0],
            c,
            0.015,
          );
          bola(
            `macacao-botao${s}`,
            'tronco',
            'tronco',
            0.025,
            [s * 0.11, 0.26, frente + 0.028],
            OURO,
            [1, 1, 0.6],
            { brilho: 0.5 },
          );
        }
        break;
      case 'chapeu-palha': {
        const b = m.baseChapeu;
        cilindro('palha-aba', 'cabeca', 'cabeca', 0.05, 0.64, 0.64, [0, b + 0.08, 0], c);
        cilindro('palha-copa', 'cabeca', 'cabeca', 0.26, 0.36, 0.3, [0, b + 0.21, 0], c);
        cilindro('palha-fita', 'cabeca', 'cabeca', 0.07, 0.365, 0.36, [0, b + 0.13, 0], '#d9483b');
        sobreCabelo('chapeu');
        break;
      }
      case 'colete-lenco':
        for (const s of [-1, 1])
          caixa(
            `colete${s}`,
            'tronco',
            'tronco',
            [larg * 0.34, troncoH * 0.92, prof + 0.02],
            [s * larg * 0.33, troncoH * 0.47, 0],
            c,
            0.06,
          );
        placa(
          'lenco',
          'tronco',
          'tronco',
          perfilLenco(0.2, 0.15),
          0.025,
          [0, troncoH - 0.085, frente + 0.01],
          '#d9483b',
        );
        bola(
          'lenco-no',
          'tronco',
          'tronco',
          0.04,
          [0, troncoH - 0.02, frente - 0.005],
          '#d9483b',
          [1.2, 1, 1],
        );
        break;
      case 'chapeu-vaqueiro': {
        const b = m.baseChapeu;
        cilindro('vaqueiro-aba', 'cabeca', 'cabeca', 0.045, 0.56, 0.56, [0, b + 0.09, 0], c, {
          rot: [0.1, 0, 0],
        });
        for (const s of [-1, 1])
          caixa(
            `vaqueiro-aba-lado${s}`,
            'cabeca',
            'cabeca',
            [0.2, 0.04, 0.5],
            [s * 0.5, b + 0.14, 0],
            c,
            0.02,
            { rot: [0, 0, s * 0.7] },
          );
        cilindro('vaqueiro-copa', 'cabeca', 'cabeca', 0.28, 0.33, 0.28, [0, b + 0.23, 0], c);
        cilindro(
          'vaqueiro-fita',
          'cabeca',
          'cabeca',
          0.05,
          0.335,
          0.325,
          [0, b + 0.14, 0],
          '#3b2a1e',
        );
        sobreCabelo('chapeu');
        break;
      }
      case 'traje-espacial':
        caixa(
          'traje-painel',
          'tronco',
          'tronco',
          [0.22, 0.14, 0.03],
          [0, troncoH * 0.55, frente + 0.01],
          '#3b4250',
          0.03,
        );
        for (const [x, cl] of [
          [-0.06, '#ff5a5a'],
          [0, '#ffd45a'],
          [0.06, '#5aff8a'],
        ] as const)
          bola(
            `traje-luz${x}`,
            'tronco',
            'tronco',
            0.022,
            [x, troncoH * 0.55, frente + 0.03],
            cl,
            [1, 1, 0.5],
            { brilho: 0.9 },
          );
        caixa(
          'traje-mochila',
          'tronco',
          'tronco',
          [0.36, 0.4, 0.18],
          [0, troncoH * 0.5, -prof / 2 - 0.085],
          '#d6dde2',
          0.08,
        );
        anel('traje-gola', 'tronco', 'tronco', 0.62, 0.08, [0, troncoH + 0.005, 0], '#d6dde2', 0, {
          brilho: 0.5,
        });
        break;
      case 'capacete-bolha':
        bola('bolha', 'cabeca', 'cabeca', 1, [0.0, 0.07, 0], c, [0.55, 0.53, 0.53], {
          alfa: 0.28,
          brilho: 0.9,
        });
        sobreCabelo('bolha');
        break;
      // spec 023: o dragãozinho da lojinha premium (peças em bonecoPremium.ts)
      case 'capuz-dragao':
        capuzDragao(pecas, m, c);
        // o capuz desce até a nuca: o rabo de cavalo fica guardado dentro dele
        sobreCabelo('capuz');
        break;
      case 'corpo-dragao':
        corpoDragao(pecas, m, principal, c);
        break;
      case 'asas-dragao':
        asasDragao(pecas, m);
        break;
      case 'patas-dragao':
        patasDragao(pecas, m, c);
        break;
      case 'capuz-dino': {
        // capuz em cima da cabeça (o rosto e o cabelo de baixo ficam de fora), com olhinhos,
        // dentinhos na frente e espinhos nas costas; barriga clara e rabo
        const capH = 0.32;
        const capY = m.topoTampa + 0.035 - capH / 2;
        const capD = cab.d + 0.1;
        caixa(
          'dino-capuz',
          'cabeca',
          'cabeca',
          [cab.w + 0.14, capH, capD],
          [0, capY, -0.02],
          c,
          0.1,
        );
        const baixo = capY - capH / 2;
        for (let i = 0; i < 5; i++)
          cilindro(
            `dino-dente${i}`,
            'cabeca',
            'cabeca',
            0.06,
            0.035,
            0,
            [-0.28 + i * 0.14, baixo - 0.012, capD / 2 - 0.06],
            BRANCO,
            { rot: [Math.PI, 0, 0] },
          );
        const cimaCapuz = capY + capH / 2;
        for (const s of [-1, 1]) {
          bola(
            `dino-olho${s}`,
            'cabeca',
            'cabeca',
            0.075,
            [s * 0.18, cimaCapuz - 0.02, capD / 2 - 0.1],
            BRANCO,
            [1, 1, 0.75],
          );
          bola(
            `dino-pupila${s}`,
            'cabeca',
            'cabeca',
            0.035,
            [s * 0.18, cimaCapuz - 0.01, capD / 2 - 0.045],
            '#231a28',
            [1, 1, 0.6],
            { brilho: 0.5 },
          );
        }
        const escuro = escurecer(c, 0.3);
        for (let i = 0; i < 4; i++) {
          const z = 0.02 - i * 0.12;
          const y = i < 3 ? cimaCapuz : cimaCapuz - 0.07;
          cilindro(
            `dino-espinho${i}`,
            'cabeca',
            'cabeca',
            0.13 - i * 0.015,
            0.065 - i * 0.006,
            0,
            [0, y + 0.03, z - 0.02],
            escuro,
            { rot: [-0.35 - (i === 3 ? 0.6 : 0), 0, 0] },
          );
        }
        caixa(
          'dino-barriga',
          'tronco',
          'tronco',
          [0.3, 0.3, 0.03],
          [0, troncoH * 0.42, frente + 0.005],
          corDaPeca(f, 'emblema'),
          0.08,
        );
        for (let i = 0; i < 4; i++)
          bola(
            `dino-rabo${i}`,
            'rabo',
            'tronco',
            0.1 - i * 0.018,
            [0, -0.0 - i * 0.035, -0.05 - i * 0.105],
            i === 3 ? escuro : c,
          );
        sobreCabelo('capuz');
        rabo = 'baixo';
        break;
      }
      case 'avental-doce': {
        caixa(
          'avental-doce',
          'tronco',
          'tronco',
          [0.36, 0.38, 0.03],
          [0, 0.17, frente + 0.01],
          c,
          0.05,
        );
        caixa(
          'avental-lacos',
          'tronco',
          'tronco',
          [larg + 0.01, 0.04, prof + 0.01],
          [0, 0.1, 0],
          c,
          0.02,
        );
        const granulado = ['#ff5a8a', '#5ad8ff', '#ffd45a', '#7cff8a'];
        for (let i = 0; i < 8; i++)
          caixa(
            `avental-granulado${i}`,
            'tronco',
            'tronco',
            [0.05, 0.015, 0.02],
            [-0.12 + (i % 4) * 0.08, 0.07 + Math.floor(i / 4) * 0.12, frente + 0.03],
            granulado[i % 4],
            0.006,
            { rot: [0, 0, i * 1.1] },
          );
        break;
      }
      case 'touca-chef': {
        const b = m.baseChapeu;
        cilindro('touca-faixa', 'cabeca', 'cabeca', 0.12, 0.38, 0.38, [0, b + 0.04, 0], c);
        for (const [x, z] of [
          [-0.12, 0],
          [0.12, 0],
          [0, 0.1],
          [0, -0.1],
        ] as const)
          bola(`touca${x}${z}`, 'cabeca', 'cabeca', 0.17, [x, b + 0.24, z], c, [1, 0.9, 1], {
            brilho: 0.28,
          });
        bola(
          'touca-cereja',
          'cabeca',
          'cabeca',
          0.06,
          [0, b + 0.43, 0],
          corDaPeca(f, 'emblema'),
          [1, 1, 1],
          { brilho: 0.28 },
        );
        sobreCabelo('chapeu');
        break;
      }
      case 'jaleco': {
        const fundo = -0.08;
        caixa(
          'jaleco',
          'tronco',
          'tronco',
          [larg + 0.03, troncoH - fundo, prof + 0.03],
          [0, (troncoH + fundo) / 2, 0],
          c,
          0.12,
        );
        caixa(
          'jaleco-abertura',
          'tronco',
          'tronco',
          [0.016, troncoH - fundo - 0.06, 0.01],
          [0, (troncoH + fundo) / 2, frente + 0.015],
          escurecer(c, 0.25),
          0.005,
        );
        for (const s of [-1, 1])
          caixa(
            `jaleco-lapela${s}`,
            'tronco',
            'tronco',
            [0.07, 0.16, 0.02],
            [s * 0.06, troncoH - 0.1, frente + 0.018],
            clarear(c, 0.5),
            0.01,
            { rot: [0, 0, -s * 0.35] },
          );
        caixa(
          'jaleco-bolso',
          'tronco',
          'tronco',
          [0.1, 0.12, 0.02],
          [0.13, troncoH * 0.55, frente + 0.018],
          escurecer(c, 0.1),
          0.015,
        );
        cilindro(
          'jaleco-caneta',
          'tronco',
          'tronco',
          0.1,
          0.012,
          0.012,
          [0.11, troncoH * 0.55 + 0.06, frente + 0.03],
          corDaPeca(f, 'emblema'),
        );
        break;
      }
      case 'oculos':
        for (const x of [-0.15, 0.15])
          anel(`oculos${x}`, 'cabeca', 'cabeca', 0.19, 0.026, [x, -0.04, zRosto + 0.03], c, 0, {
            rot: [Math.PI / 2, 0, 0],
          });
        caixa(
          'oculos-ponte',
          'cabeca',
          'cabeca',
          [0.12, 0.022, 0.022],
          [0, -0.03, zRosto + 0.03],
          c,
          0.008,
        );
        for (const s of [-1, 1])
          caixa(
            `oculos-haste${s}`,
            'cabeca',
            'cabeca',
            [0.022, 0.022, 0.3],
            [s * (cab.w / 2 + 0.005), -0.04, zRosto - 0.14],
            c,
            0.008,
          );
        break;
      case 'coroa-folhas': {
        const y = m.baseChapeu + 0.04;
        anel('folhas-aro', 'cabeca', 'cabeca', 0.74, 0.07, [0, y, 0], c);
        const cores = ['#ff8fc8', BRANCO, OURO];
        for (let i = 0; i < 7; i++) {
          const a = (i / 7) * Math.PI * 2;
          flor(
            `folhas-flor${i}`,
            'cabeca',
            'cabeca',
            [Math.sin(a) * 0.395, y + 0.03, Math.cos(a) * 0.395],
            cores[i % 3],
            0.04,
            a,
          );
          const af = a + Math.PI / 7;
          placa(
            `folhas-folha${i}`,
            'cabeca',
            'cabeca',
            perfilFolha(0.12),
            0.02,
            [Math.sin(af) * 0.39, y + 0.02, Math.cos(af) * 0.39],
            c,
            { rot: [0, af, 1.1] },
          );
        }
        sobreCabelo('chapeu');
        break;
      }
      case 'capa-folhas': {
        // capa de folhas presas num cipó atrás dos ombros: duas em cima (cabe entre os
        // braços), três no meio e duas embaixo
        cilindro('capa-cipo', 'capa', 'tronco', 0.36, 0.025, 0.025, [0, 0.0, -0.03], '#3f8a2c', {
          rot: [0, 0, Math.PI / 2],
        });
        const fileiras: Array<{ y: number; xs: number[]; tam: number }> = [
          { y: -0.16, xs: [-0.09, 0.09], tam: 0.32 },
          { y: -0.38, xs: [-0.17, 0, 0.17], tam: 0.32 },
          { y: -0.56, xs: [-0.1, 0.1], tam: 0.26 },
        ];
        let i = 0;
        for (const fl of fileiras)
          for (const x of fl.xs) {
            placa(
              `capa-folha${i}`,
              'capa',
              'tronco',
              perfilFolha(fl.tam),
              0.025,
              [x, fl.y, -0.045 - (i % 2) * 0.012],
              i % 2 ? c : escurecer(c, 0.2),
              { brilho: 0.28 },
            );
            i++;
          }
        break;
      }
      case 'capuz-lanterneira': {
        // capuz aberto na frente (como o capuz de hoje), com a ponta caída atrás e a borda
        // escura em volta do rosto
        const capW = cab.w + 0.12;
        const capH = cab.h + 0.1;
        const capD = cab.d + 0.13;
        const capY = 0.05;
        const capZ = -0.025;
        caixa(
          'lanterneira-capuz',
          'cabeca',
          'cabeca',
          [capW, 0.14, capD],
          [0, capY + capH / 2 - 0.07, capZ],
          c,
          0.07,
        );
        caixa(
          'lanterneira-capuz-costas',
          'cabeca',
          'cabeca',
          [capW, capH, 0.14],
          [0, capY, capZ - capD / 2 + 0.07],
          c,
          0.07,
        );
        for (const s of [-1, 1])
          caixa(
            `lanterneira-capuz-lado${s}`,
            'cabeca',
            'cabeca',
            [0.1, capH, capD],
            [s * (capW / 2 - 0.05), capY, capZ],
            c,
            0.05,
          );
        caixa(
          'lanterneira-borda',
          'cabeca',
          'cabeca',
          [capW + 0.01, 0.07, 0.07],
          [0, capY + capH / 2 - 0.05, capZ + capD / 2 - 0.03],
          escurecer(c, 0.25),
          0.03,
        );
        cilindro(
          'lanterneira-ponta',
          'cabeca',
          'cabeca',
          0.3,
          0.12,
          0.02,
          [0, capY + capH / 2 - 0.08, capZ - capD / 2 - 0.08],
          c,
          { rot: [-2.0, 0, 0] },
        );
        sobreCabelo('capuz');
        break;
      }
      case 'capacete-obra': {
        // spec 014: capacete de obra de brinquedo (o prêmio do canteiro): cúpula redonda
        // assentada no cabelo, aba fininha em volta, bico curto na frente e o friso no meio
        const b = m.baseChapeu;
        cilindro('obra-aba', 'cabeca', 'cabeca', 0.045, 0.45, 0.45, [0, b + 0.075, 0], c, {
          brilho: 0.45,
        });
        bola('obra-cupula', 'cabeca', 'cabeca', 0.37, [0, b + 0.08, 0], c, [1, 0.74, 1.06], {
          brilho: 0.45,
        });
        bola(
          'obra-friso',
          'cabeca',
          'cabeca',
          0.37,
          [0, b + 0.095, 0],
          escurecer(c, 0.08),
          [0.2, 0.76, 1.08],
          { brilho: 0.45 },
        );
        caixa('obra-bico', 'cabeca', 'cabeca', [0.44, 0.04, 0.16], [0, b + 0.07, 0.44], c, 0.02, {
          rot: [0.18, 0, 0],
          brilho: 0.45,
        });
        sobreCabelo('chapeu');
        break;
      }
      case 'bone-tras':
      case 'bone': {
        // spec 014 (T11): boné de brinquedo: copa redonda assentada no cabelo, a faixa em
        // volta, o botãozinho em cima e a pala curta e arredondada na frente
        const b = m.baseChapeu;
        bola('bone-copa', 'cabeca', 'cabeca', 0.37, [0, b + 0.07, -0.01], c, [1, 0.7, 1.06], {
          brilho: 0.4,
        });
        cilindro('bone-faixa', 'cabeca', 'cabeca', 0.05, 0.375, 0.38, [0, b + 0.045, -0.01], c, {
          brilho: 0.4,
        });
        bola(
          'bone-botao',
          'cabeca',
          'cabeca',
          0.05,
          [0, b + 0.33, -0.01],
          escurecer(c, 0.12),
          [1, 0.6, 1],
        );
        // (spec 026: o da roadie, virado para trás: a pala nas costas)
        const tras = p.tipo === 'bone-tras' ? -1 : 1;
        caixa(
          'bone-pala',
          'cabeca',
          'cabeca',
          [0.4, 0.035, 0.24],
          [0, b + 0.05, 0.45 * tras],
          c,
          0.1,
          {
            rot: [0.14 * tras, 0, 0],
            brilho: 0.4,
          },
        );
        sobreCabelo('chapeu');
        break;
      }
      case 'colete-obra': {
        // spec 014: colete laranja de obra, com duas faixas claras que brilham (sem marca)
        const faixa = '#eef2f4';
        const alto = troncoH * 0.92;
        const meio = troncoH * 0.47;
        for (const s of [-1, 1]) {
          caixa(
            `obra-colete${s}`,
            'tronco',
            'tronco',
            [larg * 0.34, alto, prof + 0.02],
            [s * larg * 0.33, meio, 0],
            c,
            0.05,
          );
          for (const y of [0.3, 0.6])
            caixa(
              `obra-faixa${s}${y}`,
              'tronco',
              'tronco',
              [larg * 0.345, 0.045, prof + 0.035],
              [s * larg * 0.33, troncoH * y, 0],
              faixa,
              0.012,
              { brilho: 0.6 },
            );
        }
        caixa(
          'obra-colete-costas',
          'tronco',
          'tronco',
          [larg * 0.4, alto, 0.03],
          [0, meio, -frente - 0.005],
          c,
          0.012,
        );
        for (const y of [0.3, 0.6])
          caixa(
            `obra-faixa-costas${y}`,
            'tronco',
            'tronco',
            [larg * 0.41, 0.045, 0.04],
            [0, troncoH * y, -frente - 0.005],
            faixa,
            0.012,
            { brilho: 0.6 },
          );
        break;
      }
      // ------------------------------------------------------------ spec 023 (Rancho)
      case 'camisa-festa': {
        // camisa xadrez de festa junina: o xadrez em duas cores (branco e o dourado do
        // emblema), a sianinha em zigue-zague no peito e nos punhos e florzinhas bordadas
        const ouro = corDaPeca(f, 'emblema');
        for (let i = 0; i < 3; i++)
          caixa(
            `festa-xadrez${i}`,
            'tronco',
            'tronco',
            [larg + 0.01, 0.026, prof + 0.01],
            [0, 0.07 + i * 0.12, 0],
            c,
            0.012,
          );
        for (const x of [-0.3, 0.3])
          caixa(
            `festa-xadrez-v${x}`,
            'tronco',
            'tronco',
            [0.026, troncoH - 0.04, prof + 0.012],
            [x * larg, troncoH / 2, 0],
            c,
            0.012,
          );
        // a sianinha atravessa o peito (frente) em zigue-zague
        const ySia = troncoH * 0.66;
        const n = 10;
        const largSia = larg * 0.84;
        const passo = largSia / n;
        for (let i = 0; i < n; i++) {
          const x = -largSia / 2 + passo * (i + 0.5);
          caixa(
            `festa-sianinha${i}`,
            'tronco',
            'tronco',
            [passo * 1.35, 0.024, 0.016],
            [x, ySia, frente + 0.012],
            i % 2 ? ouro : '#5cbf4f',
            0.006,
            { rot: [0, 0, i % 2 ? 0.75 : -0.75], brilho: 0.3 },
          );
        }
        // florzinhas bordadas acima da sianinha (rosa, branca, rosa)
        for (const [x, cf] of [
          [-0.2, '#ff8fc8'],
          [0, BRANCO],
          [0.2, '#ff8fc8'],
        ] as const)
          flor(
            `festa-bordado${x}`,
            'tronco',
            'tronco',
            [x * larg * 1.1, troncoH * 0.82, frente + 0.016],
            cf,
            0.022,
          );
        for (const lado of ['bracoE', 'bracoD'] as const) {
          for (const y of [-0.06, -0.15])
            caixa(
              `${lado}-festa-xadrez${y}`,
              lado,
              'braco',
              [0.142, 0.024, 0.152],
              [0, y, 0],
              c,
              0.01,
            );
          caixa(
            `${lado}-festa-punho`,
            lado,
            'braco',
            [0.146, 0.03, 0.156],
            [0, -0.22, 0],
            ouro,
            0.012,
            { brilho: 0.3 },
          );
        }
        break;
      }
      case 'remendos': {
        // os remendos coloridos nos joelhos da calça (com a borda costurada mais escura)
        const cores = [c, '#5cbf4f'];
        (['pernaE', 'pernaD'] as const).forEach((lado, i) => {
          const y = -m.pernaH * (i ? 0.56 : 0.5);
          const giro = i ? -0.22 : 0.18;
          caixa(
            `${lado}-remendo-borda`,
            lado,
            'perna',
            [0.105, 0.105, 0.016],
            [0.005, y, 0.094],
            escurecer(cores[i], 0.35),
            0.012,
            { rot: [0, 0, giro] },
          );
          caixa(
            `${lado}-remendo`,
            lado,
            'perna',
            [0.085, 0.085, 0.02],
            [0.005, y, 0.098],
            cores[i],
            0.01,
            { rot: [0, 0, giro] },
          );
        });
        break;
      }
      case 'chapeu-festa': {
        // o chapéu de palha da festa: aba larga com a palha desfiada em volta, a fita da cor
        // da camisa com uma flor e um remendo azul na copa
        const b = m.baseChapeu;
        const palhaEscura = escurecer(c, 0.2);
        cilindro('festa-aba', 'cabeca', 'cabeca', 0.045, 0.66, 0.66, [0, b + 0.08, 0], c);
        for (let i = 0; i < 20; i++) {
          const a = (i / 20) * Math.PI * 2;
          caixa(
            `festa-palha${i}`,
            'cabeca',
            'cabeca',
            [0.05, 0.02, 0.07],
            [Math.sin(a) * 0.675, b + 0.075 - (i % 2) * 0.008, Math.cos(a) * 0.675],
            i % 2 ? palhaEscura : c,
            0.008,
            { rot: [i % 2 ? 0.25 : -0.15, a, 0] },
          );
        }
        cilindro('festa-copa', 'cabeca', 'cabeca', 0.26, 0.36, 0.3, [0, b + 0.21, 0], c);
        cilindro(
          'festa-fita',
          'cabeca',
          'cabeca',
          0.075,
          0.366,
          0.358,
          [0, b + 0.13, 0],
          principal,
        );
        const af = 0.55;
        flor(
          'festa-flor',
          'cabeca',
          'cabeca',
          [Math.sin(af) * 0.375, b + 0.135, Math.cos(af) * 0.375],
          '#ff8fc8',
          0.04,
          af,
        );
        const ar = -0.7;
        caixa(
          'festa-remendo',
          'cabeca',
          'cabeca',
          [0.12, 0.1, 0.02],
          [Math.sin(ar) * 0.335, b + 0.25, Math.cos(ar) * 0.335],
          '#5aa8e8',
          0.012,
          { rot: [-0.18, ar, 0.15] },
        );
        sobreCabelo('chapeu');
        break;
      }
      case 'franjas': {
        // franjas de couro penduradas na barra do colete do peão
        for (const s of [-1, 1])
          for (let i = 0; i < 4; i++)
            caixa(
              `franja${s}${i}`,
              'tronco',
              'tronco',
              [0.024, 0.085, 0.018],
              [s * larg * 0.33 + (i - 1.5) * 0.045, -0.02 - (i % 2) * 0.01, frente + 0.012],
              i % 2 ? c : escurecer(c, 0.15),
              0.008,
              { rot: [0, 0, (i - 1.5) * 0.08] },
            );
        break;
      }
      case 'estrela-peao': {
        // a estrela de campeão no peito (dourada, brilhante, com o rebite no meio)
        const x = larg * 0.33;
        const y = troncoH * 0.64;
        placa(
          'peao-estrela-fundo',
          'tronco',
          'tronco',
          perfilEstrela(0.1),
          0.02,
          [x, y, frente + 0.02],
          escurecer(c, 0.3),
          { brilho: 0.4 },
        );
        placa(
          'peao-estrela',
          'tronco',
          'tronco',
          perfilEstrela(0.085),
          0.025,
          [x, y + 0.004, frente + 0.035],
          c,
          { brilho: 0.7 },
        );
        bola(
          'peao-estrela-rebite',
          'tronco',
          'tronco',
          0.022,
          [x, y, frente + 0.05],
          clarear(c, 0.5),
          [1, 1, 0.6],
          { brilho: 0.8 },
        );
        break;
      }
      case 'fivela-campeao': {
        // o cinto de couro com a fivela grande de campeão (ouro e a estrela no meio)
        const ouro = corDaPeca(f, 'emblema');
        caixa(
          'campeao-cinto',
          'tronco',
          'tronco',
          [larg + 0.015, 0.07, prof + 0.015],
          [0, 0.04, 0],
          c,
          0.03,
        );
        caixa(
          'campeao-fivela',
          'tronco',
          'tronco',
          [0.17, 0.115, 0.03],
          [0, 0.045, frente + 0.015],
          ouro,
          0.04,
          { brilho: 0.7 },
        );
        placa(
          'campeao-fivela-estrela',
          'tronco',
          'tronco',
          perfilEstrela(0.04),
          0.012,
          [0, 0.047, frente + 0.034],
          principal,
          { brilho: 0.4 },
        );
        break;
      }
      case 'chapeu-peao': {
        // o chapéu de peão claro, de abas viradas, com a faixa dourada e a estrela na frente
        const b = m.baseChapeu;
        const ouro = corDaPeca(f, 'emblema');
        cilindro('peao-aba', 'cabeca', 'cabeca', 0.045, 0.58, 0.58, [0, b + 0.09, 0], c, {
          rot: [0.1, 0, 0],
        });
        for (const s of [-1, 1])
          caixa(
            `peao-aba-lado${s}`,
            'cabeca',
            'cabeca',
            [0.2, 0.04, 0.52],
            [s * 0.52, b + 0.15, 0],
            c,
            0.02,
            { rot: [0, 0, s * 0.75] },
          );
        cilindro('peao-copa', 'cabeca', 'cabeca', 0.28, 0.33, 0.28, [0, b + 0.23, 0], c);
        bola('peao-copa-topo', 'cabeca', 'cabeca', 0.28, [0, b + 0.365, 0], c, [1, 0.22, 1]);
        cilindro('peao-faixa', 'cabeca', 'cabeca', 0.055, 0.334, 0.326, [0, b + 0.14, 0], ouro, {
          brilho: 0.6,
        });
        placa(
          'peao-chapeu-estrela',
          'cabeca',
          'cabeca',
          perfilEstrela(0.065),
          0.03,
          [0, b + 0.25, 0.305],
          ouro,
          { rot: [-0.18, 0, 0], brilho: 0.7 },
        );
        sobreCabelo('chapeu');
        break;
      }
      // ------------------------------------------------------------ spec 026: Vila Neon
      case 'jaqueta-tachas': {
        // jaqueta aberta: a camiseta aparece no meio, lapelas e gola azuis, tachinhas
        // redondas de prata (nunca espeto) nas lapelas e nos ombros
        const fundo = -0.08;
        const h = troncoH - fundo;
        const yc = (troncoH + fundo) / 2;
        const azul = corDaPeca(f, 'emblema');
        const tachinha = '#e2e6ee';
        caixa('jaqueta', 'tronco', 'tronco', [larg + 0.03, h, prof + 0.03], [0, yc, 0], c, 0.12);
        caixa(
          'jaqueta-barra',
          'tronco',
          'tronco',
          [larg + 0.04, 0.05, prof + 0.04],
          [0, fundo + 0.025, 0],
          escurecer(c, 0.3),
          0.03,
        );
        caixa(
          'jaqueta-camiseta',
          'tronco',
          'tronco',
          [0.16, h - 0.07, 0.012],
          [0, yc + 0.03, frente + 0.02],
          roupaDaFantasia(f, corpo)?.camisa ?? '#e8302a',
          0.005,
        );
        for (const s of [-1, 1]) {
          caixa(
            `jaqueta-lapela${s}`,
            'tronco',
            'tronco',
            [0.08, 0.22, 0.02],
            [s * 0.12, troncoH - 0.12, frente + 0.022],
            azul,
            0.012,
            { rot: [0, 0, -s * 0.28] },
          );
          caixa(
            `jaqueta-gola${s}`,
            'tronco',
            'tronco',
            [0.11, 0.06, 0.13],
            [s * 0.15, troncoH + 0.005, frente - 0.06],
            azul,
            0.025,
          );
          for (let k = 0; k < 3; k++)
            bola(
              `jaqueta-tacha${s}-${k}`,
              'tronco',
              'tronco',
              0.022,
              [s * (0.105 + k * 0.026), troncoH - 0.05 - k * 0.07, frente + 0.036],
              tachinha,
              [1, 1, 0.6],
              { brilho: 0.6 },
            );
        }
        for (const lado of ['bracoE', 'bracoD'] as const) {
          const sx = lado === 'bracoE' ? -1 : 1;
          for (let k = 0; k < 3; k++)
            bola(
              `${lado}-tacha${k}`,
              lado,
              'braco',
              0.02,
              [sx * 0.071, -0.01 - k * 0.055, 0],
              tachinha,
              [0.6, 1, 1],
              { brilho: 0.6 },
            );
        }
        break;
      }
      case 'faixa-braco':
        caixa('faixa-braco', 'bracoD', 'braco', [0.15, 0.05, 0.16], [0, -0.07, 0], c, 0.02);
        break;
      case 'munhequeira':
        caixa('munhequeira', 'bracoE', 'braco', [0.16, 0.07, 0.17], [0, -0.2, 0], c, 0.025);
        for (const z of [-0.045, 0, 0.045])
          bola(
            `munhequeira-tacha${z}`,
            'bracoE',
            'braco',
            0.017,
            [-0.081, -0.2, z],
            '#e2e6ee',
            [0.6, 1, 1],
            { brilho: 0.6 },
          );
        break;
      case 'faixa-testa':
        // a faixa fina e lisa na testa, logo abaixo do cabelo (o cabelo dos lados cobre o resto)
        caixa(
          'faixa-testa',
          'cabeca',
          'cabeca',
          [cab.w + 0.025, 0.05, cab.d + 0.025],
          [0, 0.085, 0],
          c,
          0.19,
        );
        break;
      case 'cabelo-liso': {
        // o comprido e liso (o boneco usa o corte liso até os ombros, que nunca passa do
        // boneco): a franja reta na frente, na cor do cabelo da criança
        const tampa = pecas.find((q) => q.nome === 'cabelo' && q.junta === 'cabeca');
        const corCabelo = tampa?.cor ?? '#1e1a22';
        const t = m.tampa;
        caixa(
          'liso-franja',
          'cabeca',
          'cabeca',
          [cab.w * 0.8, 0.09, 0.05],
          [0, t.y - t.h / 2 + 0.065, t.d / 2 + 0.005],
          corCabelo,
          0.03,
        );
        break;
      }
      case 'moletom-ombro': {
        // o moletom largo de ombro caído: gola canoa torta, a alcinha branca no ombro de fora,
        // a listra branca no peito e a barra canelada
        const fundo = -0.08;
        const topoM = troncoH + 0.02;
        caixa(
          'moletom',
          'tronco',
          'tronco',
          [larg + 0.06, topoM - fundo, prof + 0.06],
          [0, (topoM + fundo) / 2, 0],
          c,
          0.13,
        );
        caixa(
          'moletom-barra',
          'tronco',
          'tronco',
          [larg + 0.07, 0.07, prof + 0.07],
          [0, fundo + 0.035, 0],
          escurecer(c, 0.14),
          0.03,
        );
        caixa(
          'moletom-listra',
          'tronco',
          'tronco',
          [larg + 0.065, 0.06, prof + 0.065],
          [0, troncoH * 0.55, 0],
          BRANCO,
          0.03,
        );
        caixa(
          'moletom-gola',
          'tronco',
          'tronco',
          [larg * 0.72, 0.035, prof * 0.72],
          [0.03, topoM + 0.005, 0],
          escurecer(c, 0.16),
          0.03,
          { rot: [0, 0, 0.12] },
        );
        caixa(
          'moletom-alca',
          'tronco',
          'tronco',
          [0.05, 0.03, 0.13],
          [-larg * 0.3, topoM + 0.01, 0],
          BRANCO,
          0.01,
        );
        break;
      }
      case 'polainas':
        for (const lado of ['pernaE', 'pernaD'] as const)
          for (let k = 0; k < 3; k++)
            caixa(
              `${lado}-polaina${k}`,
              lado,
              'perna',
              [0.215 - k * 0.008, 0.055, 0.225 - k * 0.008],
              [0, -quadril + 0.15 + k * 0.05, 0.005],
              k % 2 ? escurecer(c, 0.12) : c,
              0.03,
            );
        break;
      case 'viseira': {
        // a viseira: a faixa em volta do cabelo e a aba na frente
        const t = m.tampa;
        const y = t.y - t.h / 2 + 0.06;
        caixa(
          'viseira-faixa',
          'cabeca',
          'cabeca',
          [t.w + 0.03, 0.07, t.d + 0.03],
          [0, y, 0],
          c,
          Math.min(0.17, t.raio + 0.015),
        );
        caixa(
          'viseira-aba',
          'cabeca',
          'cabeca',
          [0.46, 0.03, 0.24],
          [0, y - 0.01, t.d / 2 + 0.11],
          c,
          0.08,
          { rot: [0.12, 0, 0], brilho: 0.4 },
        );
        break;
      }
      case 'joelheiras':
        for (const lado of ['pernaE', 'pernaD'] as const) {
          const y = -m.pernaH * 0.5;
          caixa(
            `${lado}-joelheira-tira`,
            lado,
            'perna',
            [0.18, 0.035, 0.19],
            [0, y, 0],
            '#2e2d36',
            0.012,
          );
          caixa(`${lado}-joelheira`, lado, 'perna', [0.19, 0.12, 0.06], [0, y, 0.105], c, 0.03);
          caixa(
            `${lado}-joelheira-capa`,
            lado,
            'perna',
            [0.13, 0.07, 0.03],
            [0, y, 0.14],
            BRANCO,
            0.015,
          );
        }
        break;
      case 'colete-brim': {
        // o colete de brim aberto, com os remendos de estrela e de raio
        const fundo = -0.06;
        const h = troncoH - fundo;
        const yc = (troncoH + fundo) / 2;
        caixa(
          'colete-brim',
          'tronco',
          'tronco',
          [larg + 0.035, h, prof + 0.035],
          [0, yc, 0],
          c,
          0.12,
        );
        caixa(
          'colete-brim-meio',
          'tronco',
          'tronco',
          [0.14, h - 0.04, 0.012],
          [0, yc + 0.02, frente + 0.022],
          roupaDaFantasia(f, corpo)?.camisa ?? principal,
          0.005,
        );
        caixa(
          'colete-brim-costura',
          'tronco',
          'tronco',
          [larg + 0.04, 0.02, prof + 0.04],
          [0, fundo + 0.04, 0],
          escurecer(c, 0.25),
          0.008,
        );
        placa(
          'colete-remendo-estrela',
          'tronco',
          'tronco',
          perfilEstrela(0.055),
          0.02,
          [-0.13, troncoH * 0.62, frente + 0.03],
          '#ffe14a',
          { brilho: 0.28 },
        );
        placa(
          'colete-remendo-raio',
          'tronco',
          'tronco',
          perfilRaio(0.11),
          0.02,
          [0.13, troncoH * 0.3, frente + 0.03],
          '#e8302a',
          { brilho: 0.28 },
        );
        break;
      }
      case 'guitarra-raio': {
        // a guitarra-raio pendurada na frente, atravessada (o cabelo comprido escondia ela nas
        // costas): o corpo é um raio gordinho (forma inventada, nunca um V), braço grosso
        // subindo para a esquerda, a mão com as tarraxas e a correia cruzando o peito
        const zc = frente + 0.05;
        const gordo = perfilRaio(0.34).map(([x, y]): P2 => [x * 1.45, y]);
        placa(
          'guitarra-borda',
          'tronco',
          'tronco',
          gordo.map(([x, y]): P2 => [x * 1.12, y * 1.12]),
          0.04,
          [0.03, troncoH * 0.16, zc - 0.005],
          '#ffe14a',
          { brilho: 0.3 },
        );
        placa(
          'guitarra-corpo',
          'tronco',
          'tronco',
          gordo,
          0.06,
          [0.03, troncoH * 0.16, zc + 0.005],
          c,
          { brilho: 0.4 },
        );
        const a = 1.0;
        const comp = 0.36;
        const base: V3 = [-0.02, troncoH * 0.16 + 0.1, zc];
        const meio: V3 = [
          base[0] - Math.sin(a) * comp * 0.5,
          base[1] + Math.cos(a) * comp * 0.5,
          zc,
        ];
        const ponta: V3 = [base[0] - Math.sin(a) * comp, base[1] + Math.cos(a) * comp, zc];
        caixa('guitarra-braco', 'tronco', 'tronco', [0.07, comp, 0.04], meio, '#c58a4c', 0.015, {
          rot: [0, 0, a],
        });
        caixa('guitarra-mao', 'tronco', 'tronco', [0.11, 0.12, 0.05], ponta, c, 0.02, {
          rot: [0, 0, a],
        });
        caixa(
          'guitarra-correia',
          'tronco',
          'tronco',
          [0.045, troncoH * 1.05, 0.012],
          [0, troncoH * 0.5, frente + 0.03],
          '#2e2d36',
          0.006,
          { rot: [0, 0, 0.72] },
        );
        caixa(
          'guitarra-correia-costas',
          'tronco',
          'tronco',
          [0.045, troncoH * 1.05, 0.012],
          [0, troncoH * 0.5, -prof / 2 - 0.03],
          '#2e2d36',
          0.006,
          { rot: [0, 0, -0.72] },
        );
        break;
      }
      case 'lanterna': {
        // a lanterna acesa na mão, um pouco à frente (aparece de frente, como no esboço);
        // tinta de sempre, sem a tinta funda da fantasia: ela é a luz
        const z = 0.085;
        caixa('lanterna-corpo', 'maoE', 'mao', [0.18, 0.2, 0.18], [0, -0.19, z], c, 0.06, {
          brilho: 0.9,
          viva: false,
        });
        caixa('lanterna-tampa', 'maoE', 'mao', [0.2, 0.04, 0.2], [0, -0.075, z], '#3b2a1e', 0.014);
        caixa('lanterna-fundo', 'maoE', 'mao', [0.2, 0.035, 0.2], [0, -0.3, z], '#3b2a1e', 0.014);
        anel('lanterna-alca', 'maoE', 'mao', 0.13, 0.022, [0, -0.045, z * 0.5], '#5a4a3a', 0, {
          rot: [0, Math.PI / 2, Math.PI / 2],
        });
        break;
      }
    }
  }
  return { cabelo, rabo };
}

/**
 * Spec 026: os patins de quatro rodas nos pés (os do suporte da pista, na Vila Neon): a bota
 * branca de cano alto no lugar do sapato, a base, as quatro rodinhas e o freio da frente. As
 * rodinhas ficam por baixo da bota, no chão (o boneco não sobe).
 */
export function vestirPatins(pecas: Peca[], m: MedidasBoneco, corRodas = '#ff6fb4'): void {
  for (let i = pecas.length - 1; i >= 0; i--)
    if (/^perna[ED]-(sapato|bota|tenis)/.test(pecas[i].nome)) pecas.splice(i, 1);
  const y0 = -m.quadril;
  for (const lado of ['pernaE', 'pernaD'] as const) {
    const por = (p: Omit<Peca, 'junta' | 'apoio'>) =>
      pecas.push({ ...p, junta: lado, apoio: 'perna' });
    por({
      nome: `${lado}-patins-bota`,
      forma: 'caixa',
      tamanho: [0.21, 0.12, 0.27],
      raio: 0.05,
      pos: [0, y0 + 0.155, 0.03],
      cor: BRANCO,
    });
    por({
      nome: `${lado}-patins-cano`,
      forma: 'caixa',
      tamanho: [0.2, 0.14, 0.21],
      raio: 0.05,
      pos: [0, y0 + 0.26, 0.005],
      cor: BRANCO,
    });
    por({
      nome: `${lado}-patins-borda`,
      forma: 'caixa',
      tamanho: [0.205, 0.03, 0.215],
      raio: 0.012,
      pos: [0, y0 + 0.325, 0.005],
      cor: corRodas,
    });
    por({
      nome: `${lado}-patins-base`,
      forma: 'caixa',
      tamanho: [0.17, 0.03, 0.29],
      raio: 0.01,
      pos: [0, y0 + 0.085, 0.03],
      cor: '#b8bcc8',
    });
    por({
      nome: `${lado}-patins-freio`,
      forma: 'caixa',
      tamanho: [0.07, 0.06, 0.06],
      raio: 0.02,
      pos: [0, y0 + 0.06, 0.19],
      cor: '#2e2d36',
    });
    for (const z of [-0.07, 0.13])
      for (const x of [-0.075, 0.075])
        por({
          nome: `${lado}-patins-roda${x}${z}`,
          forma: 'cilindro',
          tamanho: [0.045, 0.045, 0.045],
          pos: [x, y0 + 0.045, z],
          cor: corRodas,
          rot: [0, 0, Math.PI / 2],
          brilho: 0.3,
        });
  }
}
