import type { Profissao } from '../../world/povoado';
import { corpoDeMorador } from '../bruma-e-luz/povoado';
import type { PecaCriatura, PovoadoTema } from '../tipos';
import { pio } from '../rancho-alegre/vozes';

/**
 * Peças acima da cabeça (boné, viseira) ficam com o centro acima de 1,93: o boneco de
 * brinquedo trata o que fica abaixo disso, colado na cabeça, como cabelo (`moradorBoneco`).
 */
const ACIMA = 1.935;

/**
 * Os moradores da Vila Neon (spec 026, "Os moradores"): a roadie do palco (construtor), o
 * guitarrista (ferreiro) e a moça do lanche (cozinheiro). Arquétipos da época, de brinquedo:
 * nenhum é pessoa de verdade. O vocalista, a dançarina e o patinador vestem as fantasias do tema.
 */
/** O corpo liso de quem veste uma fantasia do tema (a roupa vem dela; o cabelo e a pele, daqui). */
const corpoDe = (pele: string, cabelo: string, roupa: string, calca: string) =>
  corpoDeMorador({ pele, roupa, calca, sapato: '#2e2d36', cabelo });

/** A roadie: o corpo e o fone de técnico com a fita crepe (o boné vem da fantasia dela). */
const ROADIE: PecaCriatura[] = [
  ...corpoDeMorador({
    pele: '#b9825c',
    roupa: '#3a3944',
    calca: '#6b7a3a',
    sapato: '#2e2d36',
    cabelo: '#2e2018',
  }),
  { t: [0.52, 0.06, 0.3], p: [0, 0.86, 0], cor: '#2e2d36' },
  { t: [0.12, 0.12, 0.05], p: [0.19, 0.84, 0.17], cor: '#efe6c8', forma: 'bola' },
  { t: [0.06, 0.15, 0.15], p: [0.235, 1.66, 0], cor: '#2e2d36', papel: 'cabeca' },
  { t: [0.06, 0.15, 0.15], p: [-0.235, 1.66, 0], cor: '#2e2d36', papel: 'cabeca' },
];

const MORADORES: Record<Profissao, PecaCriatura[]> = {
  // moça do lanche: camiseta vermelha, avental branco e a viseira vermelha
  cozinheiro: [
    ...corpoDeMorador({
      pele: '#e0a882',
      roupa: '#e8302a',
      calca: '#3a6fb8',
      sapato: '#f4f1ea',
      cabelo: '#4a2a1a',
    }),
    { t: [0.46, 0.08, 0.44], p: [0, ACIMA, 0], cor: '#e8302a', papel: 'cabeca' },
    { t: [0.32, 0.03, 0.18], p: [0, ACIMA, 0.27], cor: '#c8221e', papel: 'cabeca' },
    { t: [0.44, 0.5, 0.04], p: [0, 1.0, 0.155], cor: '#fbfaf4' },
    { t: [0.16, 0.08, 0.02], p: [0, 0.92, 0.18], cor: '#ffe14a' },
  ],
  // roadie: boné amarelo virado para trás, camiseta grafite, bermuda verde-oliva e o rolo de
  // fita crepe no cinto
  construtor: [
    ...corpoDeMorador({
      pele: '#b9825c',
      roupa: '#3a3944',
      calca: '#6b7a3a',
      sapato: '#2e2d36',
      cabelo: '#2e2018',
    }),
    { t: [0.46, 0.14, 0.42], p: [0, ACIMA, 0], cor: '#ffe14a', papel: 'cabeca' },
    { t: [0.3, 0.03, 0.18], p: [0, ACIMA, -0.25], cor: '#f0c832', papel: 'cabeca' },
    { t: [0.52, 0.06, 0.3], p: [0, 0.86, 0], cor: '#2e2d36' },
    { t: [0.12, 0.12, 0.05], p: [0.19, 0.84, 0.17], cor: '#efe6c8', forma: 'bola' },
  ],
  // guitarrista: camiseta azul lisa e calça vermelha; o colete de brim com os remendos, a faixa
  // azul no braço e a guitarra-raio nas costas vêm da fantasia dela (guitarrista-vila)
  ferreiro: corpoDeMorador({
    pele: '#f0c8a0',
    roupa: '#2f8cff',
    calca: '#e8302a',
    sapato: '#2e2d36',
    cabelo: '#f2d27a',
  }),
};

export const POVOADO_VILA: PovoadoTema = {
  nome: 'Turma do bairro',
  profissoes: {
    cozinheiro: 'Moça do lanche',
    construtor: 'Roadie',
    ferreiro: 'Guitarrista',
  },
  nomes: [
    'Kika',
    'Lili',
    'Bia',
    'Tati',
    'Mel',
    'Dani',
    'Cris',
    'Rafa',
    'Dudu',
    'Zeca',
    'Beto',
    'Gui',
  ],
  moradores: MORADORES,
  // spec 026 (T08): os moradores de posto do bairro, cada um com nome e roupa própria; a roupa
  // do vocalista, da dançarina e do patinador vem das fantasias do tema (F5)
  porMorador: {
    'vila:0': {
      nome: 'Rafa',
      genero: 'm',
      titulo: 'Vocalista',
      // cabelo preto, liso e comprido (nunca maior que o boneco), a faixa fina na testa, a
      // jaqueta de tachinhas, a faixa no braço, a munhequeira e o tênis de cano alto
      pecas: corpoDe('#e0b090', '#1e1a22', '#3a3944', '#2a3350'),
      fantasia: { id: 'roqueira-palco', cor: 0 },
      cabelo: 2,
      semTrocas: true,
    },
    'vila:1': {
      nome: 'Kika',
      genero: 'f',
      titulo: 'Roadie',
      pecas: ROADIE,
      fantasia: { id: 'roadie-vila', cor: 0 },
    },
    'vila:2': {
      nome: 'Lili',
      genero: 'f',
      titulo: 'Guitarrista',
      pecas: MORADORES.ferreiro,
      fantasia: { id: 'guitarrista-vila', cor: 0 },
      cabelo: 2,
    },
    'vila:3': { nome: 'Bia', genero: 'f', titulo: 'Moça do lanche', pecas: MORADORES.cozinheiro },
    'vila:4': {
      nome: 'Mel',
      genero: 'f',
      titulo: 'Dançarina',
      pecas: corpoDe('#c99064', '#4a3326', '#ff6fb4', '#2e2a48'),
      fantasia: { id: 'danca-neon', cor: 0 },
      semTrocas: true,
    },
    'vila:5': {
      nome: 'Zeca',
      genero: 'm',
      titulo: 'Patinador',
      // de azul e branco, a viseira laranja, as joelheiras e os patins
      pecas: corpoDe('#9a6844', '#2e2018', '#2f8cff', '#f6f4ee'),
      fantasia: { id: 'patinadora', cor: 0 },
      cabelo: 0,
      semTrocas: true,
    },
    'vila:6': {
      nome: 'Tati',
      genero: 'f',
      titulo: 'Moça da lanchonete',
      pecas: MORADORES.cozinheiro,
    },
    'vila:7': { nome: 'Beto', genero: 'm', titulo: 'Moço da banca', pecas: MORADORES.construtor },
  },
  // passo animado de quem anda ouvindo música
  movimento: { saltita: 0.03, flutua: 0, ginga: 0.06 },
  vozes: {
    // "e aí!"
    chamado: pio('triangle', 360, 500, 0.12, 2, 0.08, { vibrato: 5, ganho: 0.6 }),
    // "opa!"
    susto: pio('triangle', 560, 390, 0.15, 1, 0, { vibrato: 7, ganho: 0.62 }),
    // "irado!"
    contente: pio('sine', 380, 520, 0.2, 1, 0, { vibrato: 4, ganho: 0.6 }),
    // "valeu!"
    obrigado: pio('triangle', 420, 620, 0.1, 3, 0.06, { ganho: 0.6 }),
  },
  textos: {
    trocas: 'Trocas do bairro',
    trocar: 'Trocar',
    faltam: 'Falta coisa pra essa troca',
    chegou: 'Você chegou na Vila Neon!',
  },
};
