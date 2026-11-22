import type { Profissao } from '../../world/povoado';
import { corpoDeMorador } from '../base/povoado';
import type { PecaCriatura, PovoadoTema } from '../tipos';
import { pio } from '../rancho-alegre/vozes';
import { COR_BAILE } from './criaturas';
import { ESCALA_BENTO, N_BAILE } from '../../jogo/baile';

/**
 * A turma da Noite das Fantasias (spec 027, T10). As três profissões de sempre ganham nome e
 * desenho da festa: a confeiteira (cozinheiro), o marceneiro das casinhas tortas (construtor) e o
 * lanterneiro (ferreiro), que faz as lanternas do bosque. Eles moram nas casinhas da rua, com
 * mais dois vizinhos fantasiados (de gatinho e de morceguinho).
 *
 * Os moradores de posto (o núcleo põe cada um no seu, `src/nucleo/baile.ts`), todos com o boneco
 * do jogo e as peças de fantasia presas às juntas:
 * - a Vovó Zuleica, a bruxinha boa, uma senhora (o cabelo grisalho de coque, os óculos redondos,
 *   o vestido comprido), na varanda dela;
 * - o Conde Dudu, o vampirinho com medo do escuro (sem presas), com a lanterninha, na entrada do
 *   bosque;
 * - a Lulu, a fantasminha tímida, espiando da quina de uma casinha;
 * - o Bento, o monstrinho peludo grandão (maior que todo mundo), no palco;
 * - o Seu Jerônimo, o dono da horta (o cabelo grisalho em mechas, o lenço de festa e o broche
 *   de abóbora);
 * - a Tia Filó (a Barraca dos Doces) e o Seu Olavo (a Barraca das Canecas), que vendem.
 *
 * Os nomes são só deste mundo (nenhum está em outro povoado nem perto de um; Lulu, Bento e Dudu
 * ficam, aprovados pelo dono). Nada assusta: ninguém tem presa, cara brava ou roupa escura demais.
 */

/** Peças acima da cabeça (chapéu) ficam com o centro acima de 1,93 (`moradorBoneco`). */
const ACIMA = 1.935;
const C = COR_BAILE;

const MORADORES: Record<Profissao, PecaCriatura[]> = {
  // a confeiteira: vestido roxo, avental creme e a touquinha fofa de confeiteira
  cozinheiro: [
    ...corpoDeMorador({
      pele: '#e0a882',
      roupa: C.roxo,
      calca: C.roxoEscuro,
      sapato: '#3a2a4c',
      cabelo: '#4a2a1a',
    }),
    { t: [0.44, 0.5, 0.04], p: [0, 1.0, 0.155], cor: C.creme },
    { t: [0.44, 0.16, 0.42], p: [0, ACIMA + 0.03, 0], cor: C.creme, papel: 'cabeca' },
  ],
  // o marceneiro: camisa verde-oliva, macacão roxo e o chapéu de bruxo baixinho, de aba larga
  construtor: [
    ...corpoDeMorador({
      pele: '#b9825c',
      roupa: C.oliva,
      calca: C.roxo,
      sapato: '#3a2a20',
      cabelo: '#2e2018',
    }),
    { t: [0.56, 0.05, 0.54], p: [0, ACIMA, 0], cor: C.roxoEscuro, papel: 'cabeca' },
    { t: [0.32, 0.16, 0.32], p: [0, ACIMA + 0.1, 0], cor: C.roxoEscuro, papel: 'cabeca' },
    { t: [0.34, 0.04, 0.34], p: [0, ACIMA + 0.04, 0], cor: C.laranja, papel: 'cabeca' },
  ],
  // o lanterneiro: colete dourado sobre a camisa creme, calça oliva e a boina laranja
  ferreiro: [
    ...corpoDeMorador({
      pele: '#f0c8a0',
      roupa: C.creme,
      calca: C.olivaEscuro,
      sapato: '#3a2a4c',
      cabelo: '#8a5a2a',
    }),
    { t: [0.46, 0.5, 0.3], p: [0, 1.05, 0], cor: '#d8a53a' },
    { t: [0.52, 0.07, 0.5], p: [0, ACIMA, 0.02], cor: C.laranja, papel: 'cabeca' },
    { t: [0.09, 0.06, 0.09], p: [0, ACIMA + 0.06, 0], cor: C.laranjaEscuro, papel: 'cabeca' },
  ],
};

/** O corpo liso de quem veste uma fantasia do tema (a roupa vem dela; o cabelo e a pele, daqui). */
const corpoDe = (pele: string, cabelo: string, roupa: string, calca: string, sapato = '#2e2a3a') =>
  corpoDeMorador({ pele, roupa, calca, sapato, cabelo });

/** O cabelo grisalho de quem é mais velho (o mesmo tom claro das vovós dos outros povoados). */
const GRISALHO = '#d6d3de';

const POR_MORADOR: NonNullable<PovoadoTema['porMorador']> = {
  [`baile:${N_BAILE.vovo}`]: {
    nome: 'Vovó Zuleica',
    genero: 'f',
    titulo: 'Vovó',
    // o vestido verde-oliva comprido até os tornozelos, com a barra roxa (o jeito de vovó dos
    // povoados, como a Vó Zezé da Vila), o cabelo grisalho de coque
    pecas: [
      ...corpoDe('#f0c8a0', GRISALHO, '#5f7d34', '#4e6a2a', C.roxoEscuro),
      { t: [0.56, 0.5, 0.36], p: [0, 0.55, 0], cor: '#5f7d34' },
      { t: [0.58, 0.07, 0.38], p: [0, 0.33, 0], cor: C.roxo },
    ],
    fantasia: { id: 'vovo-zuleica', cor: 0 },
    cabelo: 6,
    semTrocas: true,
  },
  [`baile:${N_BAILE.dudu}`]: {
    nome: 'Conde Dudu',
    genero: 'm',
    titulo: 'Vampirinho',
    pecas: corpoDe('#e8b896', '#2a2234', '#f4ead8', '#3a2c50', '#2a2232'),
    fantasia: { id: 'conde-dudu', cor: 0 },
    cabelo: 1,
    semTrocas: true,
  },
  [`baile:${N_BAILE.lulu}`]: {
    nome: 'Lulu',
    genero: 'f',
    titulo: 'Fantasminha',
    pecas: corpoDe('#c99064', '#3a2418', '#f4efe4', '#c4b0e6', '#7a54b0'),
    fantasia: { id: 'lulu-fantasma', cor: 0 },
    cabelo: 4,
    semTrocas: true,
  },
  [`baile:${N_BAILE.bento}`]: {
    nome: 'Bento',
    genero: 'm',
    titulo: 'Monstrinho',
    pecas: corpoDe('#9a6844', '#2e2018', '#6b7444', '#6b7444', '#6b7444'),
    fantasia: { id: 'bento-peludo', cor: 0 },
    cabelo: 0,
    semTrocas: true,
    escala: ESCALA_BENTO,
  },
  [`baile:${N_BAILE.jeronimo}`]: {
    nome: 'Seu Jerônimo',
    genero: 'm',
    titulo: 'Dono da horta',
    pecas: corpoDe('#d9a47c', GRISALHO, '#c8463a', '#3f6aa8', '#6b4a2e'),
    fantasia: { id: 'jeronimo-horta', cor: 0 },
    cabelo: 0,
    semTrocas: true,
  },
  [`baile:${N_BAILE.filo}`]: {
    nome: 'Tia Filó',
    genero: 'f',
    titulo: 'Doceira',
    // a blusa creme, a saia laranja, o avental laranja de bolinhas creme e o lenço roxo na
    // cabeça, com o nozinho atrás
    pecas: [
      ...corpoDeMorador({
        pele: '#b07850',
        roupa: C.creme,
        calca: C.laranjaEscuro,
        sapato: C.roxoEscuro,
        cabelo: '#2a1c14',
      }),
      { t: [0.44, 0.52, 0.04], p: [0, 0.98, 0.155], cor: C.laranja },
      { t: [0.06, 0.06, 0.02], p: [-0.11, 1.1, 0.18], cor: C.creme },
      { t: [0.06, 0.06, 0.02], p: [0.1, 0.96, 0.18], cor: C.creme },
      { t: [0.06, 0.06, 0.02], p: [-0.06, 0.84, 0.18], cor: C.creme },
      { t: [0.06, 0.06, 0.02], p: [0.12, 1.16, 0.18], cor: C.creme },
      { t: [0.48, 0.1, 0.46], p: [0, ACIMA, 0], cor: C.roxo, papel: 'cabeca' },
      { t: [0.4, 0.06, 0.4], p: [0, ACIMA + 0.06, -0.02], cor: C.roxo, papel: 'cabeca' },
    ],
    cabelo: 8,
    semTrocas: true,
  },
  [`baile:${N_BAILE.olavo}`]: {
    nome: 'Seu Olavo',
    genero: 'm',
    titulo: 'Moço das canecas',
    // a camisa creme, o colete verde-oliva, a calça roxa e o chapeuzinho de mágico baixo (roxo,
    // com a fita laranja)
    pecas: [
      ...corpoDeMorador({
        pele: '#e0a882',
        roupa: C.creme,
        calca: C.roxoEscuro,
        sapato: '#2e2a3a',
        cabelo: '#6a4426',
      }),
      { t: [0.46, 0.5, 0.3], p: [0, 1.05, 0], cor: C.oliva },
      { t: [0.5, 0.04, 0.48], p: [0, ACIMA, 0], cor: C.roxoEscuro, papel: 'cabeca' },
      { t: [0.34, 0.2, 0.34], p: [0, ACIMA + 0.12, 0], cor: C.roxoEscuro, papel: 'cabeca' },
      { t: [0.35, 0.05, 0.35], p: [0, ACIMA + 0.05, 0], cor: C.laranja, papel: 'cabeca' },
    ],
    cabelo: 0,
    semTrocas: true,
  },
  // os vizinhos das casinhas da rua (na ordem das portas, a da Vovó fora): a dona Celeste de
  // gatinho, o marceneiro Abel, a confeiteira Dalva, o Nestor de morceguinho e o lanterneiro
  // Lauro. As três profissões têm as trocas da festa
  [`baile:${N_BAILE.rua}`]: {
    nome: 'Celeste',
    genero: 'f',
    titulo: 'Vizinha',
    // (portão da T24: a gatinha cinza clara, sem a máscara; de grafite com a máscara de
    // pontinhas, lembrava a ladra de máscara dos quadrinhos. A roupa do morador vem daqui)
    pecas: corpoDe('#e8b896', '#5a3422', '#a79db8', '#a79db8'),
    fantasia: { id: 'gatinho-festa', cor: 0 },
    cabelo: 5,
    semTrocas: true,
  },
  [`baile:${N_BAILE.rua + 1}`]: {
    nome: 'Abel',
    genero: 'm',
    titulo: 'Marceneiro',
    pecas: MORADORES.construtor,
    cabelo: 0,
  },
  [`baile:${N_BAILE.rua + 2}`]: {
    nome: 'Dalva',
    genero: 'f',
    titulo: 'Confeiteira',
    pecas: MORADORES.cozinheiro,
    cabelo: 4,
  },
  [`baile:${N_BAILE.rua + 3}`]: {
    nome: 'Nestor',
    genero: 'm',
    titulo: 'Vizinho',
    pecas: corpoDe('#9a6844', '#1e1a22', '#6a3e9c', '#46305e'),
    fantasia: { id: 'morceguinho-festa', cor: 0 },
    cabelo: 0,
    semTrocas: true,
  },
  [`baile:${N_BAILE.rua + 4}`]: {
    nome: 'Lauro',
    genero: 'm',
    titulo: 'Lanterneiro',
    pecas: MORADORES.ferreiro,
    cabelo: 1,
  },
};

export const POVOADO_FANTASIAS: PovoadoTema = {
  nome: 'Turma da festa',
  profissoes: {
    cozinheiro: 'Confeiteira',
    construtor: 'Marceneiro',
    ferreiro: 'Lanterneiro',
  },
  nomes: ['Dalva', 'Odete', 'Celeste', 'Dorinha', 'Otávio', 'Abel', 'Lauro', 'Nestor', 'Nonô'],
  moradores: MORADORES,
  porMorador: POR_MORADOR,
  movimento: { saltita: 0.03, flutua: 0, ginga: 0.08 },
  vozes: {
    chamado: pio('triangle', 520, 640, 0.12, 2, 0.08, { vibrato: 6, ganho: 0.5 }),
    susto: pio('triangle', 760, 980, 0.1, 1, 0, { ganho: 0.5 }),
    contente: pio('sine', 620, 820, 0.08, 3, 0.06, { ganho: 0.5 }),
    obrigado: pio('sine', 700, 900, 0.12, 2, 0.08, { vibrato: 5, ganho: 0.5 }),
  },
  textos: {
    trocas: 'Trocas da festa',
    trocar: 'Trocar',
    faltam: 'Faltam coisinhas para essa troca',
    chegou: 'Você chegou à festa à fantasia!',
  },
};
