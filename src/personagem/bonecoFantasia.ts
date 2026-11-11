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
  if (tem('mascara')) {
    // os olhos (com os cílios e o brilho) vêm para a frente da máscara, como no esboço
    for (const p of pecas)
      if (p.junta === 'cabeca' && /^(olho|brilho|cilio)/.test(p.nome))
        p.pos = [p.pos[0], p.pos[1], p.pos[2] + 0.04];
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
   * Tiara: uma fileira de contas por cima da tampa de cabelo, de orelha a orelha, no corte da
   * frente (encosta no cabelo em todo o caminho, qualquer que seja o corte). Devolve o alto.
   */
  const arcoNaCabeca = (nome: string, c: string, r: number, z: number) => {
    const contorno = contornoDaTampa(m, z, m.tampa.y - m.tampa.h / 2 + 0.06, r * 1.5);
    let topo = -Infinity;
    contorno.forEach(({ p: [x, y], n: [nx, ny] }, i) => {
      const k = r - 0.008;
      bola(`${nome}${i}`, 'cabeca', 'cabeca', r, [x + nx * k, y + ny * k, z], c, [1, 1, 1], {
        brilho: 0.5,
      });
      topo = Math.max(topo, y + ny * k + r);
    });
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
        const a = arcoNaCabeca('tiara', c, 0.03, z);
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
          simbolo(
            'concha',
            'enfeite',
            'cabeca',
            'cabeca',
            0.26,
            [0, a.topo + 0.06, z],
            '#ffd0e0',
            0.035,
          );
          bola(
            'enfeite-perola',
            'cabeca',
            'cabeca',
            0.04,
            [0.13, a.topo - 0.01, z + 0.02],
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
      case 'lanterna': {
        caixa('lanterna-corpo', 'maoE', 'mao', [0.14, 0.16, 0.14], [0, -0.16, 0.04], c, 0.05, {
          brilho: 0.9,
        });
        caixa(
          'lanterna-tampa',
          'maoE',
          'mao',
          [0.16, 0.035, 0.16],
          [0, -0.065, 0.04],
          '#3b2a1e',
          0.012,
        );
        caixa(
          'lanterna-fundo',
          'maoE',
          'mao',
          [0.16, 0.03, 0.16],
          [0, -0.25, 0.04],
          '#3b2a1e',
          0.012,
        );
        anel('lanterna-alca', 'maoE', 'mao', 0.12, 0.02, [0, -0.04, 0.04], '#5a4a3a', 0, {
          rot: [0, Math.PI / 2, Math.PI / 2],
        });
        break;
      }
    }
  }
  return { cabelo, rabo };
}
