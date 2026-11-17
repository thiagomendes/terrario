import type { Profissao } from '../../world/povoado';
import { corpoDeMorador } from '../bruma-e-luz/povoado';
import type { PecaCriatura, PovoadoTema } from '../tipos';
import { pio } from '../rancho-alegre/vozes';
import { corDaPeca, fantasiaPorId } from '../../personagem/fantasias';

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

/**
 * A turma do show (spec 026, o público): 40 fãs da época, cada um com cabelo, pele,
 * roupa e chapéu próprios. Vistos de trás na plateia não podem virar um bolo de cabelo: metade de
 * boné ou faixa colorida, cabelos curtos e médios (só dois compridos), e as cores da camiseta, do
 * colete e da jaqueta trocando de um para o outro. Sem trocas: acenam e curtem o show.
 */
const FAS: readonly [string, 'f' | 'm', string, string, string, number, number][] = [
  // nome, gênero, pele, cabelo, fantasia, cor da fantasia, corte
  ['Duda', 'f', '#e0a882', '#5a3422', 'plateia-colete', 0, 1],
  ['Léo', 'm', '#c99064', '#1e1a22', 'plateia-bone', 0, 0],
  ['Nina', 'f', '#f4d2b4', '#e8c070', 'plateia-jaqueta', 0, 4],
  ['Caio', 'm', '#f0c8a0', '#b8541e', 'plateia-faixa', 0, 3],
  ['Jô', 'f', '#9a6844', '#1e1a22', 'plateia-bone-tras', 0, 6],
  ['Téo', 'm', '#e8b896', '#d8b060', 'plateia-colete', 1, 5],
  ['Lia', 'f', '#c99064', '#3a2418', 'plateia-jaqueta', 1, 7],
  ['Davi', 'm', '#6e4a2e', '#1e1a22', 'plateia-faixa', 1, 0],
  ['Malu', 'f', '#f0c8a0', '#a8401a', 'plateia-colete', 2, 3],
  ['Bento', 'm', '#b9825c', '#2e2018', 'plateia-bone', 2, 1],
  ['Isa', 'f', '#e0a882', '#4a2a1a', 'plateia-faixa', 2, 8],
  ['Nico', 'm', '#f4d2b4', '#6a4426', 'plateia-jaqueta', 2, 5],
  // os que se espalham pelo campo, atrás da grade (o público é de uns 20)
  ['Bela', 'f', '#f0c8a0', '#2e2018', 'plateia-bone', 1, 3],
  ['Vavá', 'm', '#9a6844', '#1e1a22', 'plateia-colete', 2, 0],
  ['Clara', 'f', '#e0a882', '#d8b060', 'plateia-faixa', 1, 6],
  ['Tuca', 'm', '#f4d2b4', '#a8401a', 'plateia-jaqueta', 0, 1],
  ['Tito', 'm', '#6e4a2e', '#1e1a22', 'plateia-bone-tras', 2, 5],
  ['Lara', 'f', '#c99064', '#3a2418', 'plateia-colete', 0, 7],
  ['Juca', 'm', '#e8b896', '#5a3422', 'plateia-faixa', 2, 3],
  ['Mari', 'f', '#b9825c', '#1e1a22', 'plateia-bone-tras', 1, 0],
  // os que vêm só para o show (16 nov 2026: o dobro na hora do show). Vistos de trás, da grade:
  // quase todos de camiseta ou moletom claros e vivos (o colete de brim e a jaqueta escura, que
  // de costas viram uma mancha azul-escura, ficam com os 20 de sempre), com viseira, boné ou
  // faixa colorida, e só dois de cabelo volumoso
  ['Pipo', 'm', '#e0a882', '#2e2018', 'plateia-viseira', 0, 1],
  ['Lulu', 'f', '#9a6844', '#1e1a22', 'plateia-moletom', 0, 3],
  ['Dedé', 'm', '#f4d2b4', '#b8541e', 'plateia-bone', 0, 5],
  ['Cacá', 'f', '#c99064', '#5a3422', 'plateia-faixa', 0, 6],
  ['Biel', 'm', '#6e4a2e', '#1e1a22', 'plateia-moletom', 1, 0],
  ['Tina', 'f', '#f0c8a0', '#d8b060', 'plateia-viseira', 1, 4],
  ['Nanda', 'f', '#b9825c', '#3a2418', 'plateia-bone-tras', 1, 8],
  ['Lipe', 'm', '#e8b896', '#4a2a1a', 'plateia-moletom', 3, 1],
  ['Gabi', 'f', '#e0a882', '#a8401a', 'plateia-colete', 1, 5],
  ['Tom', 'm', '#c99064', '#1e1a22', 'plateia-faixa', 2, 3],
  ['Vivi', 'f', '#f4d2b4', '#6a4426', 'plateia-bone', 2, 0],
  ['Joca', 'm', '#9a6844', '#2e2018', 'plateia-viseira', 2, 5],
  ['Lelê', 'f', '#6e4a2e', '#1e1a22', 'plateia-jaqueta', 2, 6],
  ['Fefê', 'm', '#f0c8a0', '#e8c070', 'plateia-moletom', 2, 0],
  ['Zuzu', 'f', '#e8b896', '#5a3422', 'plateia-viseira', 3, 1],
  ['Teca', 'f', '#c99064', '#2e2018', 'plateia-bone', 1, 5],
  ['Neco', 'm', '#b9825c', '#3a2418', 'plateia-bone-tras', 0, 3],
  ['Babi', 'f', '#f4d2b4', '#b8541e', 'plateia-faixa', 0, 7],
  ['Dinho', 'm', '#e0a882', '#1e1a22', 'plateia-viseira', 1, 5],
  ['Lalá', 'f', '#9a6844', '#3a2418', 'plateia-moletom', 0, 8],
];
/** A cor da manga (a principal) ou da calça da fantasia de um fã. */
function roupaDoFa(id: string, cor: number, parte: 'manga' | 'calca'): string {
  const def = fantasiaPorId(id);
  const r = def?.visual.feminino.roupa;
  const c = parte === 'manga' ? (r?.manga ?? r?.camisa) : r?.calca;
  return c ? corDaPeca({ id, cor }, c) : parte === 'manga' ? '#3a3944' : '#2a3350';
}
/**
 * Quem guia os carrinhos do bate-bate (spec 026, parte 2: a criança sozinha sempre tem com quem
 * bater): quatro da turma do bairro, de roupa clara e viva, cada um de um jeito (vila:66 a 69).
 */
const PILOTOS: typeof FAS = [
  ['Rafa', 'm', '#c99064', '#1e1a22', 'plateia-bone', 0, 0],
  ['Mel', 'f', '#f4d2b4', '#a8401a', 'plateia-moletom', 0, 3],
  ['Dudu', 'm', '#6e4a2e', '#1e1a22', 'plateia-viseira', 2, 5],
  ['Bia', 'f', '#e0a882', '#3a2418', 'plateia-moletom', 3, 6],
];
const turma = (
  lista: typeof FAS,
  n0: number,
  titulo: string,
): NonNullable<PovoadoTema['porMorador']> =>
  Object.fromEntries(
    lista.map(([nome, genero, pele, cabelo, id, cor, corte], k) => [
      `vila:${n0 + k}`,
      {
        nome,
        genero,
        titulo,
        pecas: corpoDe(pele, cabelo, roupaDoFa(id, cor, 'manga'), roupaDoFa(id, cor, 'calca')),
        fantasia: { id, cor },
        cabelo: corte,
        semTrocas: true as const,
      },
    ]),
  );
const TURMA: NonNullable<PovoadoTema['porMorador']> = Object.fromEntries(
  FAS.map(([nome, genero, pele, cabelo, id, cor, corte], k) => [
    `vila:${8 + k}`,
    {
      nome,
      genero,
      titulo: 'Fã do show',
      // a roupa do corpo é a da fantasia (16 nov 2026): o boneco do morador troca a cor da
      // manga e da calça pelas do corpo, e com o grafite fixo de antes a camiseta, o moletom e a
      // jaqueta de toda a turma saíam grafite (de costas, a plateia era uma mancha escura)
      pecas: corpoDe(pele, cabelo, roupaDoFa(id, cor, 'manga'), roupaDoFa(id, cor, 'calca')),
      fantasia: { id, cor },
      cabelo: corte,
      semTrocas: true as const,
    },
  ]),
);

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
    // spec 026 (o público do show): a turma (vila:8 a vila:47), cada um de um jeito
    ...TURMA,
    // spec 026 (parte 2): quem guia os carrinhos do bate-bate (vila:66 a vila:69)
    ...turma(PILOTOS, 66, 'Piloto do bate-bate'),
    // spec 026 (o show de verdade): o baterista, a baixista e a tecladista, que entram com a banda
    'vila:60': {
      nome: 'Gui',
      genero: 'm',
      titulo: 'Baterista',
      pecas: corpoDe('#c99064', '#1e1a22', '#2e2d36', '#3a6fb8'),
      fantasia: { id: 'baterista-vila', cor: 0 },
      cabelo: 1,
      semTrocas: true,
    },
    'vila:61': {
      nome: 'Dani',
      genero: 'f',
      titulo: 'Baixista',
      pecas: corpoDe('#9a6844', '#2e2018', '#22c2b0', '#24232a'),
      fantasia: { id: 'baixista-vila', cor: 0 },
      cabelo: 4,
      semTrocas: true,
    },
    'vila:62': {
      nome: 'Nina Lua',
      genero: 'f',
      titulo: 'Tecladista',
      // o paletó amarelo de ombreiras, a gravata fina e os óculos escuros quadrados; o cabelo
      // castanho-escuro de franja de lado (o corte da época, rente à cabeça). A roupa do corpo é
      // o amarelo do paletó (o boneco troca a cor da manga pela do corpo)
      pecas: corpoDe('#e8b896', '#3a2418', '#f4d03f', '#2b2a33'),
      fantasia: { id: 'tecladista-vila', cor: 0 },
      cabelo: 1,
      semTrocas: true,
    },
    // spec 026 (parte 2): os moradores do Parque de diversões
    'vila:63': {
      nome: 'Seu Chico',
      genero: 'm',
      titulo: 'Pipoqueiro',
      // camisa branca, o avental de listras vermelhas, a gravatinha e o chapéu de papel
      pecas: [
        ...corpoDeMorador({
          pele: '#d9a47c',
          roupa: '#f6f4ee',
          calca: '#3a3944',
          sapato: '#2e2d36',
          cabelo: '#b8b4ae',
        }),
        { t: [0.44, 0.5, 0.04], p: [0, 1.0, 0.155], cor: '#fbfaf4' },
        { t: [0.07, 0.5, 0.02], p: [-0.13, 1.0, 0.178], cor: '#e8302a' },
        { t: [0.07, 0.5, 0.02], p: [0.13, 1.0, 0.178], cor: '#e8302a' },
        { t: [0.14, 0.07, 0.03], p: [0, 1.3, 0.17], cor: '#e8302a' },
        { t: [0.4, 0.16, 0.36], p: [0, ACIMA + 0.04, 0], cor: '#fbfaf4', papel: 'cabeca' },
        { t: [0.42, 0.05, 0.38], p: [0, ACIMA - 0.02, 0], cor: '#e8302a', papel: 'cabeca' },
      ],
      cabelo: 0,
    },
    'vila:64': {
      nome: 'Duda',
      genero: 'm',
      titulo: 'Moço do bate-bate',
      // camiseta turquesa, bermuda grafite, o boné amarelo de aba para a frente e o apito
      pecas: [
        ...corpoDeMorador({
          pele: '#9a6844',
          roupa: '#22c2b0',
          calca: '#3a3944',
          sapato: '#f4f1ea',
          cabelo: '#1e1a22',
        }),
        { t: [0.46, 0.1, 0.44], p: [0, ACIMA, 0], cor: '#ffe14a', papel: 'cabeca' },
        { t: [0.34, 0.03, 0.2], p: [0, ACIMA - 0.02, 0.28], cor: '#f0c81e', papel: 'cabeca' },
        { t: [0.07, 0.07, 0.04], p: [0, 1.12, 0.17], cor: '#d4d8e2' },
        { t: [0.03, 0.2, 0.02], p: [0, 1.24, 0.16], cor: '#e8302a' },
      ],
      cabelo: 0,
    },
    'vila:65': {
      nome: 'Dona Flor',
      genero: 'f',
      titulo: 'Vendedora de balões',
      // blusa amarela, saia azul, o chapéu de palha de fita vermelha e o avental curto
      pecas: [
        ...corpoDeMorador({
          pele: '#c99064',
          roupa: '#ffd23d',
          calca: '#2f6fd0',
          sapato: '#f4f1ea',
          cabelo: '#4a2a1a',
        }),
        { t: [0.62, 0.04, 0.6], p: [0, ACIMA - 0.01, 0], cor: '#e8cf8e', papel: 'cabeca' },
        { t: [0.4, 0.14, 0.38], p: [0, ACIMA + 0.03, 0], cor: '#e8cf8e', papel: 'cabeca' },
        { t: [0.42, 0.05, 0.4], p: [0, ACIMA + 0.02, 0], cor: '#e8302a', papel: 'cabeca' },
        { t: [0.42, 0.22, 0.04], p: [0, 0.82, 0.155], cor: '#fbfaf4' },
      ],
      cabelo: 4,
      semTrocas: true,
    },
    // spec 026 (parte 2, etapa B): a vovó que espera a prenda na porta da Casa anos 80
    'vila:70': {
      nome: 'Vó Zezé',
      genero: 'f',
      titulo: 'Vovó',
      // o cabelo grisalho de coque, os óculos redondos, o casaquinho lilás aberto na blusa
      // creme com dois botõezinhos, a saia comprida azul-petróleo e o aventalzinho creme
      pecas: [
        ...corpoDeMorador({
          pele: '#e8b896',
          roupa: '#b9a2e6',
          calca: '#1f8a8c',
          sapato: '#6a4a3a',
          cabelo: '#c9c6cf',
        }),
        { t: [0.2, 0.6, 0.03], p: [0, 1.13, 0.15], cor: '#fbf3e0' },
        { t: [0.05, 0.05, 0.02], p: [0, 1.22, 0.172], cor: '#b9a2e6' },
        { t: [0.05, 0.05, 0.02], p: [0, 1.04, 0.172], cor: '#b9a2e6' },
        { t: [0.56, 0.5, 0.36], p: [0, 0.55, 0], cor: '#1f8a8c' },
        { t: [0.32, 0.3, 0.03], p: [0, 0.6, 0.19], cor: '#fbf3e0' },
      ],
      acessorio: 'oculos',
      cabelo: 6,
      semTrocas: true,
    },
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
