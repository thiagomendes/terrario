/**
 * Boneco de brinquedo (spec 012, estilo B): o plano das peças de um personagem a partir da
 * aparência escolhida no editor. Só dados (forma, tamanho, cor, posição e em que junta a
 * peça está presa); a montagem em 3D fica em render/boneco.ts. Medidas do esboço aprovado
 * (`.sdd/specs/012-visual-brinquedo/referencia/personagem.html`), em blocos, antes da
 * escala final; origem nos pés, frente para +z.
 */
import { MODELOS, PALETAS, type Aparencia } from './aparencia';
import type { Pose } from './poses';

export type Junta =
  | 'corpo'
  | 'tronco'
  | 'cabeca'
  | 'topete'
  | 'bracoE'
  | 'bracoD'
  | 'maoE'
  | 'maoD'
  | 'pernaE'
  | 'pernaD';

export type FormaPeca = 'caixa' | 'esfera' | 'cilindro' | 'anel';

export interface Peca {
  nome: string;
  junta: Junta;
  forma: FormaPeca;
  /**
   * caixa: largura, altura, profundidade; esfera: raio × escala (x, y, z);
   * cilindro: altura, raio de baixo, raio de cima; anel: diâmetro, espessura, (sem uso).
   */
  tamanho: [number, number, number];
  /** Raio dos cantos (só caixa). */
  raio?: number;
  pos: [number, number, number];
  rot?: [number, number, number];
  cor: string;
  /** Brilho do plástico (0 fosco). */
  brilho?: number;
  /**
   * Enfeite (acessório, e as fantasias da spec 017): onde ele se apoia. O teste de encaixe
   * mede a distância entre cada enfeite e essa parte do boneco (nada solto, nada atravessando).
   */
  apoio?: 'cabeca' | 'tronco' | 'mao';
}

export interface PlanoBoneco {
  juntas: Record<Junta, { pai: Junta | null; pos: [number, number, number] }>;
  pecas: Peca[];
  /** Escala final (o boneco preenche a altura do jogador, 1,8 bloco de colisão). */
  escala: number;
  /** Cores usadas pelos ícones e retratos. */
  cores: { pele: string; roupa: string; punho: string; calca: string; cabelo: string };
  /** Roupa sem manga: o braço é pele até a mão. */
  semManga: boolean;
}

export const ESCALA_BONECO = 1.15;

/** Mistura duas cores em hex (t = 0 → a, 1 → b). */
export function misturar(a: string, b: string, t: number): string {
  const pa = hex(a);
  const pb = hex(b);
  const c = pa.map((v, i) => Math.round(v + (pb[i] - v) * t));
  return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}
function hex(c: string): [number, number, number] {
  const v = parseInt(c.slice(1), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}
const escurecer = (c: string, t: number) => misturar(c, '#000000', t);
const clarear = (c: string, t: number) => misturar(c, '#ffffff', t);

/** As roupas com saia (estilo → comprimento como fração da perna). */
const SAIA: Record<number, number> = { 6: 0.55, 7: 0.5, 8: 0.95 };

export function planoBoneco(a: Aparencia): PlanoBoneco {
  const def = MODELOS[a.modelo] ?? MODELOS.andarilho;
  const feminino = a.corpo === 'feminino';
  const pele = PALETAS.pele[a.pele] ?? PALETAS.pele[0];
  const cabelo = PALETAS.cabelo[a.cabeloCor] ?? PALETAS.cabelo[0];
  const roupa = PALETAS.roupa[a.roupaCor] ?? PALETAS.roupa[0];
  const calca = PALETAS.calca[a.calcaCor] ?? PALETAS.calca[0];
  const sapato = escurecer(misturar(calca, '#5a3a22', 0.5), 0.25);
  const detalhe = clarear(roupa, 0.45);
  const punho = escurecer(roupa, 0.22);

  // proporções: o modelo e o corpo variam um pouco a largura e o comprimento das pernas
  const larg = Math.max(
    0.38,
    Math.min(0.52, (feminino ? 0.42 : 0.46) + (def.larguraTronco - 0.5) * 0.35),
  );
  const pernaH = 0.24 + (def.comprimentoPernas - 0.7) * 0.4;
  const quadril = pernaH + 0.1;
  const troncoH = 0.42;
  const prof = 0.34;
  const cab = { w: 0.72, h: 0.68, d: 0.65 };
  const yCab = troncoH + 0.33;
  // o ombro fica um pouco para dentro do lado do tronco: o braço sai encaixado (spec 017)
  const xBraco = larg / 2 + 0.05;
  const xPerna = larg * 0.24;

  const juntas: PlanoBoneco['juntas'] = {
    corpo: { pai: null, pos: [0, 0, 0] },
    pernaE: { pai: 'corpo', pos: [-xPerna, quadril, 0] },
    pernaD: { pai: 'corpo', pos: [xPerna, quadril, 0] },
    tronco: { pai: 'corpo', pos: [0, quadril, 0] },
    bracoE: { pai: 'tronco', pos: [-xBraco, troncoH - 0.08, 0] },
    bracoD: { pai: 'tronco', pos: [xBraco, troncoH - 0.08, 0] },
    maoE: { pai: 'bracoE', pos: [0, -0.27, 0] },
    maoD: { pai: 'bracoD', pos: [0, -0.27, 0] },
    cabeca: { pai: 'tronco', pos: [0, yCab, 0] },
    topete: { pai: 'cabeca', pos: [0.1, cab.h / 2 - 0.01, 0.16] },
  };
  const pecas: Peca[] = [];
  const caixa = (
    nome: string,
    junta: Junta,
    t: [number, number, number],
    pos: [number, number, number],
    cor: string,
    raio = 0.06,
    extra: Partial<Peca> = {},
  ) => pecas.push({ nome, junta, forma: 'caixa', tamanho: t, raio, pos, cor, ...extra });
  const bola = (
    nome: string,
    junta: Junta,
    r: number,
    pos: [number, number, number],
    cor: string,
    esc: [number, number, number] = [1, 1, 1],
    extra: Partial<Peca> = {},
  ) =>
    pecas.push({
      nome,
      junta,
      forma: 'esfera',
      tamanho: [r * esc[0], r * esc[1], r * esc[2]],
      pos,
      cor,
      ...extra,
    });

  // pernas e sapatos
  for (const lado of ['pernaE', 'pernaD'] as const) {
    caixa(`${lado}-perna`, lado, [0.17, pernaH, 0.18], [0, -pernaH / 2, 0], calca, 0.07);
    caixa(`${lado}-sapato`, lado, [0.21, 0.13, 0.28], [0, -quadril + 0.065, 0.03], sapato, 0.06);
  }
  // quadril (spec 017, pedido do dono): a peça de montar onde as pernas encaixam. A boca de
  // cima da perna gira dentro dele, e nenhuma fresta abre entre a perna e o tronco andando,
  // correndo, pulando ou sentado
  caixa('quadril', 'tronco', [larg - 0.02, 0.16, prof - 0.03], [0, -0.04, 0], calca, 0.05);

  // tronco e roupa
  const estilo = a.roupaEstilo;
  const corPeito = estilo === 4 ? detalhe : roupa; // colete: camisa clara por baixo
  caixa('peito', 'tronco', [larg, troncoH, prof], [0, troncoH / 2, 0], corPeito, 0.13);
  const frente = prof / 2 + 0.005;
  switch (estilo) {
    case 0: // túnica: barra mais comprida e cinto
      caixa('tunica-barra', 'tronco', [larg + 0.02, 0.12, prof + 0.02], [0, 0.03, 0], roupa, 0.05);
      caixa(
        'cinto',
        'tronco',
        [larg + 0.025, 0.05, prof + 0.025],
        [0, 0.11, 0],
        escurecer(roupa, 0.45),
        0.02,
      );
      caixa('fivela', 'tronco', [0.07, 0.05, 0.02], [0, 0.11, frente + 0.01], '#f2d16b', 0.015);
      break;
    case 1: // avental
      caixa(
        'avental',
        'tronco',
        [larg * 0.7, troncoH * 0.85, 0.03],
        [0, troncoH * 0.45, frente],
        '#efe6d2',
        0.02,
      );
      break;
    case 2: // jaqueta aberta com camiseta por dentro
      caixa(
        'camiseta',
        'tronco',
        [larg * 0.36, troncoH * 0.92, 0.02],
        [0, troncoH / 2, frente],
        detalhe,
        0.015,
      );
      caixa(
        'gola',
        'tronco',
        [larg * 0.72, 0.06, prof + 0.02],
        [0, troncoH - 0.03, 0],
        escurecer(roupa, 0.2),
        0.03,
      );
      break;
    case 3: // listrada
      for (let i = 0; i < 3; i++)
        caixa(
          `listra${i}`,
          'tronco',
          [larg + 0.01, 0.045, prof + 0.01],
          [0, 0.08 + i * 0.12, 0],
          detalhe,
          0.02,
        );
      break;
    case 4: // colete sobre a camisa
      for (const s of [-1, 1])
        caixa(
          `colete${s}`,
          'tronco',
          [larg * 0.34, troncoH * 0.9, prof + 0.02],
          [s * larg * 0.33, troncoH * 0.47, 0],
          roupa,
          0.06,
        );
      break;
    case 5: // bandoleira na diagonal
      caixa(
        'bandoleira',
        'tronco',
        [0.07, troncoH * 1.25, prof + 0.03],
        [0, troncoH / 2, 0],
        '#8a5a32',
        0.025,
        { rot: [0, 0, 0.75] },
      );
      caixa(
        'fivela',
        'tronco',
        [0.06, 0.06, 0.02],
        [0.04, troncoH * 0.55, frente + 0.015],
        '#f2d16b',
        0.015,
      );
      break;
    default:
      break;
  }
  if (estilo !== 1 && estilo !== 2 && estilo !== 5)
    caixa(
      'bolso',
      'tronco',
      [0.16, 0.1, 0.02],
      [estilo === 4 ? 0.1 : 0, 0.14, frente],
      estilo === 4 ? roupa : detalhe,
      0.03,
    );
  const saia = SAIA[estilo];
  if (saia) {
    const corSaia = estilo === 7 ? calca : roupa;
    const altSaia = pernaH * saia + 0.06;
    pecas.push({
      nome: 'saia',
      junta: 'tronco',
      forma: 'cilindro',
      tamanho: [altSaia, larg * 0.62, larg * 0.5],
      pos: [0, -altSaia / 2 + 0.06, 0],
      cor: corSaia,
    });
  }

  // braços: manga, punho e a mão redonda (sem manga: braço de pele)
  const semManga = estilo === 1; // avental de ferreiro: braços de fora
  const corManga = semManga ? pele : estilo === 4 ? detalhe : roupa;
  for (const lado of ['bracoE', 'bracoD'] as const) {
    caixa(`${lado}-manga`, lado, [0.13, 0.26, 0.14], [0, -0.1, 0], corManga, 0.06);
    // ombro redondo no eixo do braço: o braço gira em volta dele e nunca descola do tronco
    // (acenar, comemorar, dançar)
    bola(`${lado}-ombro`, lado, 0.068, [0, 0, 0], corManga, [1, 0.9, 1]);
    if (!semManga)
      caixa(
        `${lado}-punho`,
        lado,
        [0.145, 0.045, 0.155],
        [0, -0.215, 0],
        escurecer(corManga, 0.22),
        0.02,
      );
    bola(`${lado}-mao`, lado === 'bracoE' ? 'maoE' : 'maoD', 0.085, [0, 0, 0], pele);
  }

  // cabeça e rosto
  caixa('cabeca', 'cabeca', [cab.w, cab.h, cab.d], [0, 0, 0], pele, 0.18);
  const zRosto = cab.d / 2 + 0.005;
  const olhos: Array<[number, number]> = [
    [-0.15, -0.04],
    [0.15, -0.04],
  ];
  for (const [x, y] of olhos) {
    bola(`olho${x}`, 'cabeca', 0.075, [x, y, zRosto], '#231a28', [0.85, 1.1, 0.4], { brilho: 0.6 });
    bola(
      `brilho${x}`,
      'cabeca',
      0.024,
      [x + 0.025, y + 0.04, zRosto + 0.025],
      '#ffffff',
      [1, 1, 0.4],
      { brilho: 0.2 },
    );
    bola(
      `bochecha${x}`,
      'cabeca',
      0.05,
      [x * 1.45, -0.15, zRosto - 0.01],
      misturar(pele, '#ff7a7a', 0.55),
      [1.3, 0.75, 0.25],
      { brilho: 0 },
    );
  }
  const r = a.rosto;
  const cilios = r === 1 || r === 3;
  const sardas = r === 2 || r === 3;
  if (cilios)
    for (const [x, y] of olhos)
      caixa(
        `cilio${x}`,
        'cabeca',
        [0.12, 0.03, 0.03],
        [x + (x < 0 ? -0.01 : 0.01), y + 0.1, zRosto],
        '#231a28',
        0.012,
        { rot: [0, 0, x < 0 ? 0.2 : -0.2] },
      );
  if (sardas)
    for (const [x, y] of [
      [-0.24, -0.11],
      [-0.2, -0.14],
      [-0.27, -0.15],
      [0.24, -0.11],
      [0.2, -0.14],
      [0.27, -0.15],
    ] as const)
      bola(
        `sarda${x}${y}`,
        'cabeca',
        0.012,
        [x, y, zRosto + 0.005],
        escurecer(pele, 0.35),
        [1, 1, 0.4],
        { brilho: 0 },
      );
  bola(
    'boca',
    'cabeca',
    0.035,
    [0, -0.18, zRosto],
    cilios ? '#c85a6a' : '#9a4a3c',
    [1.4, 0.55, 0.3],
  );
  if (r === 4)
    caixa(
      'barba',
      'cabeca',
      [cab.w * 0.86, 0.2, 0.12],
      [0, -cab.h / 2 + 0.06, cab.d / 2 - 0.03],
      cabelo,
      0.08,
    );
  if (r === 5)
    caixa('bigode', 'cabeca', [0.2, 0.05, 0.05], [0, -0.13, zRosto + 0.01], cabelo, 0.022);

  // cabelo: uma tampa por cima e a forma de cada corte
  const e = a.cabeloEstilo;
  const topo = cab.h / 2;
  const tampaH = e === 3 ? 0.14 : 0.3;
  /** Alto da tampa de cabelo (o raspado é bem mais baixo que os outros cortes). */
  const topoTampa = topo + (e === 3 ? 0.03 : 0.07);
  /**
   * Onde os chapéus assentam: as medidas deles foram feitas para o cabelo comum (tampa em
   * topo + 0,07); no raspado tudo desce junto, senão o chapéu fica solto acima da cabeça.
   */
  const baseChapeu = topo + (topoTampa - (topo + 0.07));
  caixa(
    'cabelo',
    'cabeca',
    [cab.w + (e === 3 ? 0.02 : 0.05), tampaH, cab.d + (e === 3 ? 0.02 : 0.05)],
    [0, topo - tampaH / 2 + (e === 3 ? 0.03 : 0.07), 0],
    cabelo,
    e === 3 ? 0.06 : 0.15,
  );
  if (e !== 3)
    caixa(
      'nuca',
      'cabeca',
      [cab.w + 0.05, cab.h * 0.62, 0.16],
      [0, 0.02, -cab.d / 2 + 0.05],
      cabelo,
      0.07,
    );
  switch (e) {
    case 0: // curto, com topete
      bola('topete', 'topete', 0.12, [0, 0, 0], cabelo, [1.3, 0.8, 1]);
      break;
    case 1: // franja de lado
      caixa(
        'franja',
        'cabeca',
        [cab.w * 0.62, 0.12, 0.1],
        [-0.1, topo - 0.14, cab.d / 2],
        cabelo,
        0.05,
        { rot: [0, 0, 0.18] },
      );
      break;
    case 2: // longo liso até os ombros
      for (const s of [-1, 1])
        caixa(
          `lado${s}`,
          'cabeca',
          [0.12, cab.h * 1.05, cab.d * 0.8],
          [s * (cab.w / 2 + 0.03), -0.12, -0.04],
          cabelo,
          0.06,
        );
      caixa(
        'costas',
        'cabeca',
        [cab.w + 0.08, cab.h * 1.15, 0.14],
        [0, -0.16, -cab.d / 2 + 0.02],
        cabelo,
        0.07,
      );
      break;
    case 4: // cacheado volumoso
      for (const [x, y, z, rr] of [
        [-0.3, 0.18, 0.05, 0.16],
        [0.3, 0.18, 0.05, 0.16],
        [0, 0.32, 0.1, 0.18],
        [-0.2, 0.3, -0.18, 0.17],
        [0.2, 0.3, -0.18, 0.17],
        [-0.36, -0.05, -0.1, 0.14],
        [0.36, -0.05, -0.1, 0.14],
        [0, 0.2, -0.3, 0.18],
      ] as const)
        bola(`cacho${x}${y}${z}`, 'cabeca', rr, [x, y, z], cabelo);
      break;
    case 5: // rabo de cavalo alto
      bola(
        'rabo-preso',
        'cabeca',
        0.07,
        [0, topo - 0.04, -cab.d / 2 - 0.02],
        escurecer(cabelo, 0.2),
      );
      caixa(
        'rabo',
        'cabeca',
        [0.16, 0.42, 0.14],
        [0, topo - 0.28, -cab.d / 2 - 0.08],
        cabelo,
        0.07,
        { rot: [-0.25, 0, 0] },
      );
      break;
    case 6: // coque
      bola('coque', 'cabeca', 0.15, [0, topo + 0.12, -0.08], cabelo);
      break;
    case 7: // tranças
      for (const s of [-1, 1])
        for (let i = 0; i < 4; i++)
          bola(
            `tranca${s}${i}`,
            'cabeca',
            0.07 - i * 0.006,
            [s * (cab.w / 2 - 0.02), -0.12 - i * 0.12, -0.06],
            cabelo,
          );
      break;
    case 8: // chanel
      for (const s of [-1, 1])
        caixa(
          `chanel${s}`,
          'cabeca',
          [0.1, cab.h * 0.75, cab.d * 0.85],
          [s * (cab.w / 2 + 0.02), 0.02, -0.02],
          cabelo,
          0.05,
        );
      caixa(
        'chanel-franja',
        'cabeca',
        [cab.w * 0.86, 0.1, 0.08],
        [0, topo - 0.13, cab.d / 2],
        cabelo,
        0.04,
      );
      break;
    default:
      break;
  }

  // acessórios
  const antesDosEnfeites = pecas.length;
  switch (a.acessorio) {
    case 'capuz': {
      // capuz aberto na frente: topo, costas e lados, com o rosto de fora (antes era uma
      // caixa inteira por cima da cabeça, que tapava os olhos)
      const corCapuz = escurecer(roupa, 0.15);
      const capW = cab.w + 0.12;
      const capH = cab.h + 0.1;
      const capD = cab.d + 0.13;
      const capY = 0.05;
      const capZ = -0.025;
      caixa(
        'capuz',
        'cabeca',
        [capW, 0.14, capD],
        [0, capY + capH / 2 - 0.07, capZ],
        corCapuz,
        0.07,
      );
      caixa(
        'capuz-costas',
        'cabeca',
        [capW, capH, 0.14],
        [0, capY, capZ - capD / 2 + 0.07],
        corCapuz,
        0.07,
      );
      for (const s of [-1, 1])
        caixa(
          `capuz-lado${s}`,
          'cabeca',
          [0.1, capH, capD],
          [s * (capW / 2 - 0.05), capY, capZ],
          corCapuz,
          0.05,
        );
      break;
    }
    case 'lanterna':
      pecas.push({
        nome: 'lanterna-alca',
        junta: 'maoE',
        forma: 'anel',
        tamanho: [0.12, 0.02, 0],
        pos: [0, -0.05, 0.04],
        rot: [0, Math.PI / 2, 0],
        cor: '#5a4a3a',
      });
      bola('lanterna', 'maoE', 0.075, [0, -0.15, 0.04], '#ffd36a', [1, 1.15, 1], { brilho: 0.8 });
      caixa('lanterna-tampa', 'maoE', [0.12, 0.04, 0.12], [0, -0.07, 0.04], '#5a4a3a', 0.015);
      break;
    case 'chapeu':
      pecas.push({
        nome: 'chapeu-aba',
        junta: 'cabeca',
        forma: 'cilindro',
        tamanho: [0.05, 0.56, 0.56],
        pos: [0, baseChapeu + 0.1, 0],
        cor: '#8a5a32',
      });
      pecas.push({
        nome: 'chapeu-copa',
        junta: 'cabeca',
        forma: 'cilindro',
        tamanho: [0.24, 0.3, 0.27],
        pos: [0, baseChapeu + 0.24, 0],
        cor: '#8a5a32',
      });
      caixa('chapeu-fita', 'cabeca', [0.62, 0.05, 0.62], [0, baseChapeu + 0.16, 0], roupa, 0.02);
      break;
    case 'mochila':
      caixa(
        'mochila',
        'tronco',
        [larg * 0.78, troncoH * 0.95, 0.2],
        [0, troncoH * 0.5, -prof / 2 - 0.09],
        '#c98a4a',
        0.08,
      );
      caixa(
        'mochila-bolso',
        'tronco',
        [larg * 0.5, troncoH * 0.35, 0.06],
        [0, troncoH * 0.32, -prof / 2 - 0.2],
        escurecer('#c98a4a', 0.15),
        0.03,
      );
      break;
    case 'cachecol':
      pecas.push({
        nome: 'cachecol',
        junta: 'tronco',
        forma: 'anel',
        tamanho: [0.42, 0.1, 0],
        pos: [0, troncoH + 0.02, 0],
        cor: '#d8483a',
      });
      caixa(
        'cachecol-ponta',
        'tronco',
        [0.1, 0.24, 0.06],
        [0.1, troncoH - 0.12, frente + 0.03],
        '#d8483a',
        0.03,
      );
      break;
    case 'oculos':
      for (const [x, y] of olhos)
        pecas.push({
          nome: `oculos${x}`,
          junta: 'cabeca',
          forma: 'anel',
          tamanho: [0.17, 0.022, 0],
          pos: [x, y, zRosto + 0.03],
          rot: [Math.PI / 2, 0, 0],
          cor: '#2a2630',
        });
      caixa(
        'oculos-ponte',
        'cabeca',
        [0.12, 0.02, 0.02],
        [0, -0.03, zRosto + 0.03],
        '#2a2630',
        0.008,
      );
      break;
    case 'capacete':
      bola('capacete', 'cabeca', cab.w * 0.56, [0, topo - 0.06, 0], '#f2c94c', [1, 0.62, 1.02], {
        brilho: 0.5,
      });
      bola(
        'capacete-luz',
        'cabeca',
        0.07,
        [0, topo + 0.05, cab.d / 2 + 0.02],
        '#fff6c8',
        [1, 1, 0.5],
        { brilho: 0.8 },
      );
      break;
    case 'chapeu-explorador':
      pecas.push({
        nome: 'explorador-aba',
        junta: 'cabeca',
        forma: 'cilindro',
        tamanho: [0.04, 0.6, 0.6],
        pos: [0, baseChapeu + 0.06, 0],
        cor: '#d9c08a',
      });
      bola(
        'explorador-copa',
        'cabeca',
        0.3,
        [0, baseChapeu + 0.08, 0],
        '#d9c08a',
        [1.15, 0.55, 1.1],
      );
      caixa(
        'explorador-fita',
        'cabeca',
        [0.66, 0.05, 0.62],
        [0, baseChapeu + 0.12, 0],
        '#7a5a32',
        0.02,
      );
      break;
    case 'avental':
      caixa(
        'acess-avental',
        'tronco',
        [larg * 0.72, troncoH * 0.9, 0.03],
        [0, troncoH * 0.42, frente + 0.01],
        '#efe6d2',
        0.02,
      );
      break;
    case 'touca-chef':
      pecas.push({
        nome: 'touca-faixa',
        junta: 'cabeca',
        forma: 'cilindro',
        tamanho: [0.12, 0.38, 0.38],
        pos: [0, baseChapeu + 0.04, 0],
        cor: '#ffffff',
      });
      for (const [x, z] of [
        [-0.12, 0],
        [0.12, 0],
        [0, 0.1],
        [0, -0.1],
      ] as const)
        bola(`touca${x}${z}`, 'cabeca', 0.17, [x, baseChapeu + 0.24, z], '#ffffff', [1, 0.9, 1], {
          brilho: 0.1,
        });
      break;
    case 'chapeu-palha':
      // chapéu de palha da roça: aba larga redonda, copa e fita vermelha (spec 013)
      pecas.push({
        nome: 'palha-aba',
        junta: 'cabeca',
        forma: 'cilindro',
        tamanho: [0.05, 0.64, 0.64],
        pos: [0, baseChapeu + 0.08, 0],
        cor: '#f0cf6a',
      });
      pecas.push({
        nome: 'palha-copa',
        junta: 'cabeca',
        forma: 'cilindro',
        tamanho: [0.26, 0.36, 0.3],
        pos: [0, baseChapeu + 0.21, 0],
        cor: '#f0cf6a',
      });
      pecas.push({
        nome: 'palha-fita',
        junta: 'cabeca',
        forma: 'cilindro',
        tamanho: [0.07, 0.365, 0.36],
        pos: [0, baseChapeu + 0.13, 0],
        cor: '#d9483b',
      });
      break;
    case 'coroa-flores':
      for (let i = 0; i < 8; i++) {
        const ang = (i / 8) * Math.PI * 2;
        bola(
          `flor${i}`,
          'cabeca',
          0.06,
          [Math.sin(ang) * 0.36, baseChapeu + 0.04, Math.cos(ang) * 0.33],
          ['#ff6f9c', '#ffd34d', '#b18cff', '#ffffff'][i % 4],
        );
      }
      break;
    default:
      break;
  }
  const apoio: Peca['apoio'] =
    a.acessorio === 'lanterna'
      ? 'mao'
      : a.acessorio === 'mochila' || a.acessorio === 'cachecol' || a.acessorio === 'avental'
        ? 'tronco'
        : 'cabeca';
  for (let i = antesDosEnfeites; i < pecas.length; i++) pecas[i].apoio = apoio;
  const modo: ModoCabelo | null =
    a.acessorio === 'capuz' || a.acessorio === 'capacete'
      ? a.acessorio
      : apoio === 'cabeca' && a.acessorio !== 'oculos' && a.acessorio !== 'nenhum'
        ? 'chapeu'
        : null;
  if (modo) ajeitarCabeloDebaixo(pecas, modo, topoTampa, cab);

  return {
    juntas,
    pecas,
    escala: ESCALA_BONECO,
    cores: { pele, roupa: corManga, punho: semManga ? pele : punho, calca, cabelo },
    semManga,
  };
}

/**
 * O cabelo debaixo do enfeite (spec 017, T01): nada de cabelo atravessando o chapéu, o
 * capacete ou o capuz. Debaixo de chapéu, os cachos de cima baixam até a tampa e o coque vira
 * um coque baixo na nuca; dentro do capacete e do capuz o cabelo de cima fica guardado (só o
 * que cai abaixo dele continua aparecendo).
 */
export type ModoCabelo = 'chapeu' | 'capuz' | 'capacete';

export function ajeitarCabeloDebaixo(
  pecas: Peca[],
  modo: ModoCabelo,
  topoTampa: number,
  cab: { w: number; h: number; d: number },
): void {
  const chapeu = modo === 'chapeu';
  const capuz = modo === 'capuz';
  const capacete = modo === 'capacete';
  const guardar = (p: Peca): boolean => {
    if (p.apoio || p.junta === 'corpo') return false;
    const n = p.nome;
    if (capuz) return /^(topete|coque|cacho|rabo)/.test(n);
    if (capacete)
      return (
        /^(cabelo|topete|franja|chanel-franja|coque|rabo-preso)/.test(n) ||
        (n.startsWith('cacho') && p.pos[1] > 0.1)
      );
    return false;
  };
  for (let i = pecas.length - 1; i >= 0; i--) if (guardar(pecas[i])) pecas.splice(i, 1);
  for (const p of pecas) {
    if (p.apoio) continue;
    if (chapeu && p.nome.startsWith('cacho'))
      // o cacho de cima não passa da tampa (o chapéu assenta nela)
      p.pos = [p.pos[0], Math.min(p.pos[1], topoTampa - p.tamanho[1]), p.pos[2]];
    if (chapeu && p.nome === 'coque') {
      p.tamanho = [0.13, 0.13, 0.13];
      p.pos = [0, -0.02, -cab.d / 2 - 0.07];
    }
    if (capuz && /^(lado|chanel-?\d|tranca)/.test(p.nome)) {
      // o cabelo dos lados fica por dentro do capuz e cai por baixo dele
      const borda = cab.w / 2 + 0.04;
      const meio = p.forma === 'caixa' ? p.tamanho[0] / 2 : p.tamanho[0];
      const x = Math.sign(p.pos[0]) * Math.min(Math.abs(p.pos[0]), borda - meio);
      p.pos = [x, p.pos[1], p.pos[2]];
    }
  }
}

/** Altura do boneco no jogo (blocos), do pé ao topo da cabeça. */
export function alturaBoneco(a: Aparencia): number {
  const p = planoBoneco(a);
  return (p.juntas.tronco.pos[1] + p.juntas.cabeca.pos[1] + 0.34) * p.escala;
}

/**
 * O ponto mais alto do boneco (blocos), contando cabelo e chapéu: as fotos do editor enquadram
 * até aqui, senão a copa do chapéu, o coque e os cachos saem cortados (e a aba parece solta).
 */
export function topoBoneco(a: Aparencia): number {
  const p = planoBoneco(a);
  let topo = 0;
  for (const peca of p.pecas) {
    let y = peca.pos[1];
    for (let j: Junta | null = peca.junta; j; j = p.juntas[j].pai) y += p.juntas[j].pos[1];
    const meiaAltura =
      peca.forma === 'esfera'
        ? peca.tamanho[1]
        : peca.forma === 'cilindro'
          ? peca.tamanho[0] / 2
          : peca.tamanho[1] / 2;
    topo = Math.max(topo, y + meiaAltura);
  }
  return topo * p.escala;
}

/** Giro de cada junta numa pose (rad, x/y/z como no Babylon), mais a altura e a mola do corpo. */
export interface RotacoesPose {
  corpo: [number, number, number];
  tronco: [number, number, number];
  cabeca: [number, number, number];
  topete: [number, number, number];
  bracoD: [number, number, number];
  bracoE: [number, number, number];
  pernaD: [number, number, number];
  pernaE: [number, number, number];
  corpoY: number;
  escala: number;
}

/**
 * Para onde cada junta do boneco gira numa pose (o render/boneco.ts suaviza entre quadros;
 * o teste de encaixe confere que nada se solta nessas poses). `olhar`: pitch da câmera.
 */
export function rotacoesDaPose(pose: Pose, olhar: number, segurando: boolean): RotacoesPose {
  // no gesto, braço e cabeça não seguem o sobe e desce da câmera (spec 015)
  const semGesto = 1 - Math.min(1, Math.max(0, pose.pesoGesto ?? 0));
  const olho = Math.max(-0.9, Math.min(0.9, olhar)) * semGesto;
  // no golpe o braço mira para onde o jogador olha (bloco no chão, na parede ou no alto):
  // quem vê o amigo minerar enxerga o braço indo no bloco certo
  const noGolpe = Math.min(1, Math.abs(pose.bracoDireito) / 0.6);
  const mira = olho * 0.75 * noGolpe;
  return {
    corpoY: pose.corpoY ?? pose.tronco,
    escala: pose.escala ?? 1,
    corpo: [pose.corpoX ?? 0, 0, pose.corpoZ ?? 0],
    tronco: [pose.troncoX ?? 0, pose.troncoY ?? 0, pose.troncoZ ?? 0],
    pernaD: [pose.pernaDireita, 0, 0],
    pernaE: [pose.pernaEsquerda, 0, 0],
    // segurando algo, o antebraço fica um pouco à frente; "abre" positivo leva o braço para
    // fora (o direito fica em +x: z positivo o afasta do corpo; o esquerdo, em −x, z negativo)
    bracoD: [
      pose.bracoDireito - (segurando ? 0.32 : 0) + mira,
      pose.bracoDireitoGiro ?? 0,
      0.06 + (pose.bracoDireitoAbre ?? 0),
    ],
    bracoE: [
      pose.bracoEsquerdo,
      pose.bracoEsquerdoGiro ?? 0,
      -0.06 - (pose.bracoEsquerdoAbre ?? 0),
    ],
    // a cabeça acompanha o olhar da câmera e compensa a inclinação do tronco
    cabeca: [
      pose.cabeca + olho * 0.75 - (pose.troncoX ?? 0),
      pose.cabecaGiro ?? 0,
      pose.cabecaLado ?? 0,
    ],
    topete: [pose.topete ?? 0, 0, 0],
  };
}
