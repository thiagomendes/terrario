/**
 * Vila Neon: pintores dos tiles (spec 026). A base é a do Rancho Alegre (madeira, pedra e
 * ferramentas de brinquedo), com o chão do bairro: grama verde forte de gramado de quintal,
 * terra marrom de canteiro e o paralelepípedo da rua de trás. Os blocos que só o bairro tem
 * têm a base em `src/art/atlas.ts` (T02) e, aqui, o desenho caprichado da Vila Neon (a pista de
 * ladrilho de vidro, a caixa de som de tela, a treliça em X, o alambrado bem vazado, a telha
 * colonial); dos blocos de rua que ele divide com a Cidade Grande, repinta só o que pede a cara
 * dos anos 80: os toldos listrados de duas cores (vermelho e branco, azul e branco), o globo do
 * poste mais quentinho e o concreto, que aqui é a chapa grafite do fliperama e do palco.
 */
import { hash2 } from '../../world/noise';
import { T, VAZIO, fbmT, ladoComTopo, rampa } from '../../art/atlas';
import type { Pintor } from '../tipos';
import { PINTORES_RANCHO } from '../rancho-alegre/pintores';

const GRAMA = ['#3c9a32', '#46a63a', '#50b142', '#5abd4a'];
const TERRA = ['#5a3e2c', '#664834', '#72523c', '#7e5c44'];

/**
 * Gramado do bairro: verde forte e cheio, aparado em faixas (uma faixa mais clara, outra mais
 * escura, como o cortador deixa), com um trevinho mais claro aqui e ali.
 */
const gramado: Pintor = (x, y, s) => {
  const r = hash2(x, y, s + 5);
  if (r > 0.992) return rampa(['#fff3c8'], 0, x, y, s);
  if (r > 0.96) return rampa(['#7acc5a'], 0, x, y, s);
  const faixa = (y >> 3) & 1 ? 0.16 : -0.1;
  return rampa(GRAMA, fbmT(x, y, 4, s) * 0.4 + hash2(x, y, s) * 0.4 + 0.1 + faixa, x, y, s);
};

/** Terra marrom de canteiro de quintal. */
const terraQuintal: Pintor = (x, y, s) => {
  const r = hash2(x, y, s + 3);
  if (r > 0.95) return rampa(['#9a7a5a'], 0, x, y, s);
  return rampa(TERRA, fbmT(x, y, 4, s) * 0.45 + hash2(x, y, s) * 0.55, x, y, s);
};

const gramadoLado = ladoComTopo(
  (x, y, s) => rampa(GRAMA, 0.3 + hash2(x, y, s) * 0.7, x, y, s),
  terraQuintal,
  '#2f7e28',
  2,
);

/** Paralelepípedo da rua de trás: pedrinhas cinza-quente em fileiras desencontradas. */
const paralelepipedo: Pintor = (x, y, s) => {
  const fila = y >> 2;
  const dx = (x + (fila & 1) * 2) & 3;
  if ((y & 3) === 3 || dx === 3) return rampa(['#5e5a58'], 0, x, y, s);
  const pedra = Math.floor((x + (fila & 1) * 2) / 4) + fila * 5;
  return rampa(
    ['#8e8a86', '#9a9692', '#a6a29e', '#b2aeaa'],
    hash2(pedra, fila, s + 11) * 0.6 + hash2(x, y, s) * 0.4,
    x,
    y,
    s,
  );
};

/** Toldo listrado de duas cores, listras largas de 4 (nunca mais de duas cores). */
const toldo =
  (a: string, b: string): Pintor =>
  (x, y, s) =>
    (x >> 2) % 2 === 0 ? rampa([a], hash2(x, y, s), x, y, s) : rampa([b], hash2(x, y, s), x, y, s);

/** Poste: o globo de luz quentinha (amarelo de lâmpada antiga) em cima da haste grafite. */
const poste: Pintor = (x, y, s) =>
  Math.hypot(x - 7.5, y - 5) < 4.2
    ? rampa(['#ffd77a', '#ffe08e'], hash2(x, y, s), x, y, s)
    : rampa(['#2e2d36', '#36353f'], hash2(x, y, s), x, y, s);

const GRAFITE = ['#34333d', '#3a3944', '#403f4a'];
const CROMO = ['#aeb3be', '#c2c7d2', '#d4d8e2', '#e6e9f0'];
const cor = (c: string) => (x: number, y: number, s: number) => rampa([c], 0, x, y, s);

/**
 * Chapa grafite (o fliperama, o fundo do palco, os telhados escuros): painéis de 8 com a beira
 * de cima clara, a de baixo escura e um rebite em cada canto. Grafite, nunca preto puro.
 */
const chapaGrafite: Pintor = (x, y, s) => {
  const lx = x & 7;
  const ly = y & 7;
  if (lx === 7 || ly === 7) return cor('#26252d')(x, y, s);
  if (lx === 0 || ly === 0) return cor('#4a4954')(x, y, s);
  if ((lx === 1 || lx === 6) && (ly === 1 || ly === 6)) return cor('#5e5d69')(x, y, s);
  return rampa(GRAFITE, fbmT(x, y, 4, s) * 0.5 + hash2(x, y, s) * 0.5, x, y, s);
};

/** Pista quadriculada: o ladrilho rosa de vidro (com a beira e o brilho) e o grafite polido. */
const pistaNeon: Pintor = (x, y, s) => {
  const lx = x & 7;
  const ly = y & 7;
  if (lx === 7 || ly === 7) return cor('#201f27')(x, y, s);
  const rosa = ((x >> 3) + (y >> 3)) % 2 === 0;
  if (rosa) {
    if (lx === 0 || ly === 0) return cor('#ff9ad0')(x, y, s);
    if (lx === 6 || ly === 6) return cor('#e84f9c')(x, y, s);
    if ((lx === 1 || lx === 2) && ly === 1) return cor('#ffd0ea')(x, y, s);
    return rampa(
      ['#ff5fa8', '#ff6fb4', '#ff7cbc'],
      (12 - lx - ly) / 12 + hash2(x, y, s) * 0.2,
      x,
      y,
      s,
    );
  }
  if (lx === 0 || ly === 0) return cor('#4a4954')(x, y, s);
  if (lx === 5 && ly === 1) return cor('#6a6975')(x, y, s);
  return rampa(GRAFITE, hash2(x, y, s) * 0.6 + (12 - lx - ly) / 40, x, y, s);
};

/** Piso do palco: tábuas grafite compridas, juntas desencontradas e o prego claro nas pontas. */
const pisoPalco: Pintor = (x, y, s) => {
  const fila = y >> 2;
  const ly = y & 3;
  const junta = (fila * 7 + 3) % T;
  if (ly === 3) return cor('#24232b')(x, y, s);
  if (x === junta) return cor('#24232b')(x, y, s);
  if (ly === 1 && (x === (junta + 1) % T || x === (junta + T - 1) % T))
    return cor('#6a6975')(x, y, s);
  const t = hash2(x >> 3, fila, s) * 0.5 + hash2(x, y, s) * 0.3 + (ly === 0 ? 0.25 : 0);
  return rampa(GRAFITE, t, x, y, s);
};

/** Vidro de vitrine: limpo (vê-se a loja por dentro), com a moldura clara e um reflexo. */
const vitrine: Pintor = (x, y, s) => {
  if (x === 0 || y === 0 || x === T - 1 || y === T - 1) return rampa(CROMO, 0.8, x, y, s);
  // um reflexo curtinho no canto de cima (discreto: a vitrine é para ver o que tem dentro)
  if (x + y === 6 && x >= 2 && x <= 4) return cor('#f4fbff')(x, y, s);
  return VAZIO;
};

/** Caixa de som: a tela de pontinhos, o cone grande com o aro claro e os cantos de cromo. */
const caixaSom: Pintor = (x, y, s) => {
  const canto = (x <= 1 || x >= T - 2) && (y <= 1 || y >= T - 2);
  if (canto) return rampa(CROMO, (x + y) / 30, x, y, s);
  if (x === 0 || y === 0 || x === T - 1 || y === T - 1) return cor('#1f1e25')(x, y, s);
  const d = Math.hypot(x - 7.5, y - 7.5);
  if (d < 1.7) return rampa(['#8a8994', '#9c9ba6'], hash2(x, y, s), x, y, s);
  if (d < 4.6) {
    // o cone: mais claro de um lado, como a luz batendo
    const t = 0.3 + (x - y) / 24 + (d / 4.6) * 0.2;
    return rampa(['#3e3d48', '#484752', '#53525d', '#5e5d68'], t, x, y, s);
  }
  if (d < 5.5) return rampa(['#7a7984', '#8e8d98'], (x - y + 16) / 32, x, y, s);
  if (d < 6.4) return cor('#18171d')(x, y, s);
  // a tela: pontinhos claros na chapa grafite
  if ((x + y) % 2 === 0 && x > 1 && y > 1 && x < T - 2 && y < T - 2) return cor('#4c4b57')(x, y, s);
  return rampa(GRAFITE, hash2(x, y, s) * 0.5, x, y, s);
};

/** Treliça cromada: o quadro de tubo e as duas diagonais em X, o resto vazado. */
const trelica: Pintor = (x, y, s) => {
  const quadro = x <= 1 || y <= 1 || x >= T - 2 || y >= T - 2;
  const d1 = Math.abs(x - y) <= 1;
  const d2 = Math.abs(x + y - (T - 1)) <= 1;
  if (!quadro && !d1 && !d2) return VAZIO;
  // o brilho do tubo: a beira de cima e da esquerda mais clara
  let t = 0.5;
  if (quadro) t = x === 0 || y === 0 || x === T - 2 || y === T - 2 ? 0.85 : 0.3;
  else if (d1) t = x > y ? 0.3 : x === y ? 0.9 : 0.6;
  else t = x + y > T - 1 ? 0.3 : x + y === T - 1 ? 0.9 : 0.6;
  return rampa(CROMO, t + hash2(x, y, s) * 0.12, x, y, s);
};

/**
 * Alambrado: a tela de arame em losangos largos (bem vazada: de longe não vira uma parede
 * cinza e o palco se vê através dela), com o cano de cima e o mourão.
 */
const alambrado: Pintor = (x, y, s) => {
  if (y <= 1) return rampa(CROMO, y === 0 ? 0.7 : 0.3, x, y, s);
  if (x <= 1) return rampa(CROMO, x === 0 ? 0.7 : 0.3, x, y, s);
  const arame = (x + y) % 8 === 0 || (x - y + 16) % 8 === 0;
  if (!arame) return VAZIO;
  return rampa(['#9aa0aa', '#b0b6c0', '#c4cad4'], hash2(x, y, s), x, y, s);
};

/** Grade da plateia: o quadro de tubo de aço e as barras em pé, com a faixa vermelha em cima. */
const gradePlateia: Pintor = (x, y, s) => {
  if (y <= 2) return rampa(['#d8302a', '#e8403a'], hash2(x, y, s), x, y, s);
  return x % 4 === 1
    ? rampa(['#d8dce4', '#e6eaf2'], hash2(x, y, s), x, y, s)
    : rampa(['#8e949e', '#9aa0aa', '#a6acb6'], hash2(x, y, s), x, y, s);
};

/** Telha colonial: os canudos de barro em fileiras desencontradas, com a sombra de cada uma. */
const telhaColonial: Pintor = (x, y, s) => {
  const fila = y >> 2;
  const ly = y & 3;
  const cx = (x + (fila & 1) * 2) & 3;
  if (ly === 3) return cor('#7e3418')(x, y, s);
  if (cx === 0) return cor('#9c4420')(x, y, s);
  const t = (cx === 1 ? 0.85 : cx === 2 ? 0.6 : 0.3) - ly * 0.12 + hash2(x, y, s) * 0.15;
  return rampa(['#b8542a', '#c8622e', '#d87238', '#e68848'], t, x, y, s);
};

export const PINTORES_VILA: Record<string, Pintor> = {
  ...PINTORES_RANCHO,
  grama_topo: gramado,
  grama_lado: gramadoLado,
  terra: terraQuintal,
  pedregulho: paralelepipedo,
  toldo_vermelho: toldo('#e8302a', '#f6f4ee'),
  toldo_verde: toldo('#2f8cff', '#f6f4ee'),
  poste,
  // os blocos do bairro com o capricho da Vila Neon
  concreto: chapaGrafite,
  piso_palco: pisoPalco,
  vidro: vitrine,
  pista_neon: pistaNeon,
  caixa_som: caixaSom,
  trelica,
  alambrado,
  grade_plateia: gradePlateia,
  telha_colonial: telhaColonial,
};

/** Só os quadrados rosa da pista acendem (o grafite fica apagado). */
export const MASCARAS_VILA: Record<string, (x: number, y: number) => boolean> = {
  pista_neon: (x, y) => (x & 7) !== 7 && (y & 7) !== 7 && ((x >> 3) + (y >> 3)) % 2 === 0,
};
