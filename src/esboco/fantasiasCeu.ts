/**
 * Esboço da spec 027 (Noite das Fantasias): o céu e as texturas PROVISÓRIAS. Só roda com
 * `?esboco=fantasias` (ver `fantasias.ts`). O mundo-base é a Vila Neon (o id e a planta do
 * tema ficam iguais); aqui só se muda o objeto do tema na memória, antes da cena nascer:
 *
 * - o céu: o "dia" é um entardecer laranja dourado; a noite é roxa, com a lua grande, e
 *   nunca escura de verdade (o piso de luz da noite fica alto: o chão continua legível);
 * - a bruma rente ao chão, clarinha, e os vaga-lumes mornos;
 * - as texturas: tiles que o palco não usa (lãs, rebocos, telha colonial, toldos, cristal)
 *   repintados no estilo do atlas (telha roxa, tijolo torto, abóbora gigante, folhas laranja,
 *   o rosto aceso). Os blocos novos de verdade (telha roxa, tijolo torto, teia, folhas
 *   laranja) entram na implementação, com id próprio.
 *
 * Cores do mundo: roxo, laranja e verde-musgo. Nada de arco-íris.
 */
import { hash2 } from '../world/noise';
import { T, fbmT, folhasDe, ladoComTopo, rampa } from '../art/atlas';
import type { CeuTema, Pintor, QuadroCeu, Tema } from '../temas/tipos';

// ------------------------------------------------------------------ o céu

/** A noite roxa de brinquedo: a lua clareia o chão (nunca o escuro de verdade). */
const NOITE: Omit<QuadroCeu, 'h'> = {
  zen: [0.13, 0.06, 0.28],
  meio: [0.27, 0.13, 0.46],
  // o horizonte: um lilás aceso, com um fio de laranja das lanternas da vila
  hor: [0.52, 0.3, 0.6],
  luz: [0.72, 0.66, 1],
  il: 0.36,
  // a luz do céu da noite é lilás: o gramado fica musgo-arroxeado, não preto
  ceu: [0.42, 0.34, 0.72],
  chao: [0.12, 0.09, 0.16],
  ic: 0.4,
  amb: [0.13, 0.1, 0.2],
  dens: 0.0036,
};

/** A tarde dourada que dura o "dia" inteiro (o mundo mora no fim de tarde). */
const TARDE: Omit<QuadroCeu, 'h'> = {
  zen: [0.36, 0.38, 0.72],
  meio: [0.9, 0.66, 0.58],
  hor: [1, 0.76, 0.46],
  luz: [1, 0.82, 0.56],
  il: 1.45,
  ceu: [0.84, 0.72, 0.72],
  chao: [0.34, 0.25, 0.18],
  ic: 0.54,
  amb: [0.24, 0.19, 0.18],
  dens: 0.0024,
};

export const QUADROS_FANTASIAS: QuadroCeu[] = [
  { h: 0, ...NOITE },
  {
    // fim da madrugada: o roxo clareando para o lilás
    h: 0.21,
    zen: [0.18, 0.1, 0.34],
    meio: [0.36, 0.2, 0.5],
    hor: [0.66, 0.4, 0.58],
    luz: [0.84, 0.74, 0.98],
    il: 0.7,
    ceu: [0.58, 0.48, 0.74],
    chao: [0.2, 0.16, 0.2],
    ic: 0.56,
    amb: [0.22, 0.18, 0.26],
    dens: 0.0065,
  },
  {
    // o amanhecer já dourado
    h: 0.27,
    zen: [0.34, 0.34, 0.66],
    meio: [0.94, 0.62, 0.52],
    hor: [1, 0.7, 0.42],
    luz: [1, 0.78, 0.52],
    il: 1.3,
    ceu: [0.84, 0.68, 0.66],
    chao: [0.32, 0.24, 0.17],
    ic: 0.5,
    amb: [0.22, 0.18, 0.17],
    dens: 0.006,
  },
  { h: 0.34, ...TARDE },
  { h: 0.66, ...TARDE },
  {
    // o pôr: laranja forte embaixo, violeta em cima
    h: 0.74,
    zen: [0.3, 0.2, 0.54],
    meio: [0.84, 0.46, 0.5],
    hor: [1, 0.58, 0.3],
    luz: [1, 0.66, 0.42],
    il: 1.15,
    ceu: [0.78, 0.56, 0.66],
    chao: [0.3, 0.2, 0.16],
    ic: 0.5,
    amb: [0.22, 0.16, 0.2],
    dens: 0.0065,
  },
  {
    // o roxo chegando, com o resto do laranja no horizonte
    h: 0.8,
    zen: [0.15, 0.08, 0.32],
    meio: [0.32, 0.16, 0.48],
    hor: [0.68, 0.36, 0.48],
    luz: [0.8, 0.7, 1],
    il: 0.6,
    ceu: [0.56, 0.44, 0.76],
    chao: [0.2, 0.15, 0.22],
    ic: 0.58,
    amb: [0.23, 0.18, 0.3],
    dens: 0.0065,
  },
  { h: 1, ...NOITE },
];

export const CEU_FANTASIAS: CeuTema = {
  estrelasDia: 0,
  corEstrelas: [1, 0.95, 0.86],
  densidadeEstrelas: 0.5,
  corSol: [1, 0.86, 0.6],
  tamanhoSol: 1.3,
  haloSol: 1.5,
  // a lua grande e morna, de livro de história
  corLua: [1, 0.95, 0.8],
  tamanhoLua: 2.6,
  corNuvens: [1, 0.9, 0.9],
  // poucas nuvens (de noite elas viram manchas escuras no roxo)
  fatorNuvens: 0.14,
  faixaCrepusculo: 1.6,
  corCrepusculo: [1, 0.56, 0.3],
  // a noite baixa a luz do chão (a Vila Neon desce a 0,09; aqui, nunca escuro de verdade)
  pisoNoite: 0.22,
  // o verde do gramado puxa para o lilás de noite, sem apagar
  verdeNoite: 0.75,
};

// ------------------------------------------------------------------ texturas provisórias

const cor = (c: string): Pintor => (x, y, s) => rampa([c], 0, x, y, s);

/** Gramado verde-musgo, com folhinhas laranja caídas aqui e ali. */
const MUSGO = ['#3c5424', '#445e28', '#4c682c', '#557230'];
const gramaMusgo: Pintor = (x, y, s) => {
  const r = hash2(x, y, s + 5);
  if (r > 0.988) return rampa(['#e8892c', '#f0a040'], hash2(x, y, s + 1), x, y, s);
  if (r > 0.965) return rampa(['#7c9a48'], 0, x, y, s);
  return rampa(MUSGO, fbmT(x, y, 4, s) * 0.45 + hash2(x, y, s) * 0.45 + 0.05, x, y, s);
};
const TERRA = ['#5a3e2c', '#664834', '#72523c', '#7e5c44'];
const terra: Pintor = (x, y, s) =>
  rampa(TERRA, fbmT(x, y, 4, s) * 0.45 + hash2(x, y, s) * 0.55, x, y, s);

/** Telha roxa: as fileiras de canudo desencontradas, com a sombra de cada uma. */
const telhaRoxa: Pintor = (x, y, s) => {
  const fila = y >> 2;
  const ly = y & 3;
  const cx = (x + (fila & 1) * 2) & 3;
  if (ly === 3) return cor('#3a2458')(x, y, s);
  if (cx === 0) return cor('#4a2e70')(x, y, s);
  const t = (cx === 1 ? 0.85 : cx === 2 ? 0.6 : 0.3) - ly * 0.12 + hash2(x, y, s) * 0.15;
  return rampa(['#5c3888', '#6a4498', '#7852a8', '#8862b8'], t, x, y, s);
};

/**
 * Tijolo torto: as fileiras sobem e descem um pixel a cada tijolo e os tijolos têm larguras
 * diferentes, como parede de casinha de história (torta, mas de blocos retos).
 */
const tijoloTorto =
  (cores: string[], argamassa: string): Pintor =>
  (x, y, s) => {
    // a fileira: 4 de altura, com o degrau de 1 pixel que muda a cada coluna de tijolo
    const col = Math.floor((x + ((y >> 2) & 1) * 3) / 6);
    const sobe = hash2(col, y >> 2, 71) > 0.5 ? 1 : 0;
    const yy = y + sobe;
    const fila = yy >> 2;
    if ((yy & 3) === 3) return cor(argamassa)(x, y, s);
    // as juntas de pé desencontradas e de largura variada (5, 6 ou 7)
    const larg = 5 + Math.floor(hash2(fila, 3, 13) * 3);
    const desl = Math.floor(hash2(fila, 7, 17) * larg);
    if ((x + desl) % larg === 0) return cor(argamassa)(x, y, s);
    const tijolo = Math.floor((x + desl) / larg) + fila * 7;
    return rampa(cores, hash2(tijolo, fila, s + 3) * 0.7 + hash2(x, y, s) * 0.3, x, y, s);
  };

/** A casca da abóbora gigante: laranja liso com o vinco do gomo na beira. */
const aboboraGigante: Pintor = (x, y, s) => {
  if (x === 0 || x === T - 1) return rampa(['#d0681a', '#d8701e'], hash2(x, y, s), x, y, s);
  const brilho = x >= 4 && x <= 6 && y >= 3 && y <= 9 ? 0.25 : 0;
  return rampa(
    ['#f0861f', '#f69228', '#fb9e34', '#ffab42'],
    hash2(x, y, s) * 0.5 + fbmT(x, y, 2, s) * 0.3 + brilho,
    x,
    y,
    s,
  );
};
/** O gomo mais escuro da abóbora gigante. */
const gomoAbobora: Pintor = (x, y, s) =>
  rampa(['#d86e1c', '#e07822', '#e68228'], hash2(x, y, s) * 0.6 + fbmT(x, y, 2, s) * 0.4, x, y, s);
/** O cabinho e a folha: verde-musgo com as fibras. */
const cabinho: Pintor = (x, y, s) =>
  rampa(
    ['#465e24', '#506a2a', '#5a7630', '#668236'],
    (x % 4 === 0 ? 0 : 0.4) + hash2(x, y, s) * 0.5,
    x,
    y,
    s,
  );
/** O entalhe do rosto de dia (apagado): o miolo marrom-alaranjado, fundo e sem susto. */
const entalhe: Pintor = (x, y, s) =>
  rampa(['#3e1c0a', '#48220c', '#52280e'], hash2(x, y, s) * 0.5 + (1 - y / 15) * 0.4, x, y, s);
/** O rosto aceso de noite: a luz amarela da vela, mais clara no meio. */
const rostoAceso: Pintor = (x, y, s) => {
  const d = Math.hypot(x - 7.5, y - 7.5) / 9;
  return rampa(['#ffe9a0', '#ffdc78', '#ffcb52', '#ffb43a'], d + hash2(x, y, s) * 0.15, x, y, s);
};

/** A lanterna do bosque: a armação roxa-escura e o vidro aceso. */
const armacao = (x: number, y: number) =>
  x <= 1 || x >= T - 2 || y <= 1 || y >= T - 2 || x === 7 || x === 8;
const lanternaAcesa: Pintor = (x, y, s) => {
  if (armacao(x, y)) return rampa(['#3a2a4c', '#46345a'], hash2(x, y, s), x, y, s);
  const d = Math.hypot(x - 7.5, y - 8) / 7;
  return rampa(['#ffe9a0', '#ffd46a', '#ffbe48'], d + hash2(x, y, s) * 0.2, x, y, s);
};
const lanternaApagada: Pintor = (x, y, s) => {
  if (armacao(x, y)) return rampa(['#3a2a4c', '#46345a'], hash2(x, y, s), x, y, s);
  // o vidro de dia (apagado): âmbar acinzentado, com o reflexo no canto
  if (x + y === 6 && x >= 2 && x <= 4) return cor('#d8d0c0')(x, y, s);
  return rampa(['#8c7c66', '#968670', '#a0907a'], hash2(x, y, s) * 0.6 + y / 40, x, y, s);
};

/** Toldo de duas cores, listras largas de 4 (nunca mais de duas cores). */
const toldo =
  (a: string, b: string): Pintor =>
  (x, y, s) =>
    (x >> 2) % 2 === 0 ? rampa([a], hash2(x, y, s), x, y, s) : rampa([b], hash2(x, y, s), x, y, s);

/** A cortina do palco: veludo roxo com as dobras em pé. */
const cortina: Pintor = (x, y, s) => {
  const dobra = Math.cos(((x % 5) / 5) * Math.PI * 2) * 0.5 + 0.5;
  return rampa(['#3e2262', '#4a2a74', '#563486', '#643e96'], dobra * 0.8 + hash2(x, y, s) * 0.2, x, y, s);
};

/** O caminho de pedrinha lilás-acinzentada da vila (paralelepípedo desencontrado). */
const pedrinha: Pintor = (x, y, s) => {
  const fila = y >> 2;
  const dx = (x + (fila & 1) * 2) & 3;
  if ((y & 3) === 3 || dx === 3) return cor('#5a5068')(x, y, s);
  const pedra = Math.floor((x + (fila & 1) * 2) / 4) + fila * 5;
  return rampa(
    ['#7c7290', '#887e9c', '#948aa8', '#a096b2'],
    hash2(pedra, fila, s + 11) * 0.6 + hash2(x, y, s) * 0.4,
    x,
    y,
    s,
  );
};

/** A janela acesa: moldura roxa-escura, a luz morna de dentro e a cortininha laranja. */
const molduraJanela = (x: number, y: number) =>
  x <= 1 || x >= T - 2 || y <= 1 || y >= T - 2 || x === 7 || x === 8 || y === 7 || y === 8;
const janelaAcesa: Pintor = (x, y, s) => {
  if (molduraJanela(x, y)) return rampa(['#4a3266', '#54397a'], hash2(x, y, s), x, y, s);
  const lx = x % 8;
  if (lx === 2 || lx === 6) return rampa(['#e07a2a', '#e88838'], hash2(x, y, s), x, y, s);
  const d = Math.hypot((x % 8) - 4, (y % 8) - 4) / 3;
  return rampa(['#ffe6a0', '#ffd87e', '#ffc95e'], d + hash2(x, y, s) * 0.2, x, y, s);
};

/** O rosto do lampião de abóbora: olhos redondos e o sorriso de festa (nada de dente). */
const olhoRosto = (x: number, y: number) =>
  y >= 4 && y <= 6 && ((x >= 3 && x <= 5) || (x >= 10 && x <= 12)) && !(y === 4 && (x === 3 || x === 5 || x === 10 || x === 12));
const bocaRosto = (x: number, y: number) =>
  (y === 9 && (x === 3 || x === 12)) || (y === 10 && x >= 4 && x <= 11) || (y === 11 && x >= 5 && x <= 10);
const casca: Pintor = (x, y, s) =>
  rampa(
    x % 4 === 1 ? ['#c8621a', '#d26c1e'] : ['#f08a24', '#f6962e', '#fca23a'],
    hash2(x, y, s) * 0.6 + fbmT(x, y, 2, s) * 0.4,
    x,
    y,
    s,
  );
const aboboraRosto: Pintor = (x, y, s) =>
  olhoRosto(x, y) || bocaRosto(x, y)
    ? rampa(['#ffd860', '#ffe58a'], hash2(x, y, s), x, y, s)
    : casca(x, y, s);

export const PINTORES_FANTASIAS: Record<string, Pintor> = {
  grama_topo: gramaMusgo,
  grama_lado: ladoComTopo(
    (x, y, s) => rampa(MUSGO, 0.3 + hash2(x, y, s) * 0.7, x, y, s),
    terra,
    '#3c5822',
    2,
  ),
  // as copas: musgo na beira do palco, laranja e dourado no bosque
  folhas: folhasDe(['#3e5a26', '#48662c', '#527232', '#5e7e3a', '#6a8a42'], 0.13),
  folhas_outono: folhasDe(['#c4521a', '#d4641e', '#e27624', '#ec8a2c', '#f4a03a'], 0.15),
  folhas_betula: folhasDe(['#b8782a', '#c48632', '#d0943a', '#daa244'], 0.15),
  telha_colonial: telhaRoxa,
  reboco_amarelo: tijoloTorto(['#b8743c', '#c27e44', '#cc8a4e', '#d69658'], '#8a5a36'),
  reboco_menta: tijoloTorto(['#6a7a4a', '#748452', '#7e8e5a', '#889862'], '#4e5a36'),
  reboco_rosa: cortina,
  la_laranja: aboboraGigante,
  la_vermelha: gomoAbobora,
  la_verde: cabinho,
  la_preta: entalhe,
  // o rosto aceso vai na faixa de neon (brilha sem acender o chão em volta)
  faixa_neon: rostoAceso,
  lanterna: lanternaAcesa,
  la_branca: lanternaApagada,
  toldo_vermelho: toldo('#f0862a', '#f8ecd6'),
  toldo_verde: toldo('#6a3e9c', '#f8ecd6'),
  pedregulho: pedrinha,
  janela_acesa: janelaAcesa,
  abobora_rosto: aboboraRosto,
};

/** Só o rosto do lampião acende (a casca não brilha). */
export const MASCARAS_FANTASIAS: Record<string, (x: number, y: number) => boolean> = {
  abobora_rosto: (x, y) => olhoRosto(x, y) || bocaRosto(x, y),
};

/** Muda o tema ativo na memória (antes da cena: o atlas e o céu leem dele). */
export function aplicarCeuETexturas(t: Tema): void {
  t.quadrosCeu = QUADROS_FANTASIAS;
  t.ceu = CEU_FANTASIAS;
  // a névoa baixa clarinha, quase branca com um toque lilás
  t.bruma = { cor: [1, 0.95, 1.02], forca: 1 };
  t.particulas = {
    ...t.particulas,
    // vaga-lumes mornos de noite, e o pólen dourado da tarde
    vagalumeNoite: [1, 0.86, 0.42],
    vagalumeDia: [1, 0.8, 0.46],
    folhas: [0.95, 0.52, 0.18],
  };
  // o arco-íris do céu fica de fora deste mundo (cores roxo, laranja e musgo)
  t.climaVisual = { ...t.climaVisual, arcoIris: false };
  Object.assign(t.pintores, PINTORES_FANTASIAS);
  t.mascarasBrilho = { ...(t.mascarasBrilho ?? {}), ...MASCARAS_FANTASIAS };
}
