import type { Profissao } from '../../world/povoado';
import { corpoDeMorador } from '../bruma-e-luz/povoado';
import type { PecaCriatura, PovoadoTema } from '../tipos';
import { pio } from '../rancho-alegre/vozes';

/**
 * Peças acima da cabeça (capacete, boné) ficam com o centro acima de 1,93: o boneco de
 * brinquedo trata o que fica abaixo disso, colado na cabeça, como cabelo (`moradorBoneco`).
 */
const ACIMA = 1.935;

const MORADORES: Record<Profissao, PecaCriatura[]> = {
  // padeira: dólmã branco, avental amarelinho, rabo de cavalo e a touca de chef (acessório)
  cozinheiro: [
    ...corpoDeMorador({
      pele: '#d9a27a',
      roupa: '#f4f1ea',
      calca: '#4a5a8a',
      sapato: '#3a2a22',
      cabelo: '#5a3220',
    }),
    { t: [0.14, 0.22, 0.14], p: [0, 1.62, -0.25], cor: '#5a3220', forma: 'bola', papel: 'cabeca' },
    { t: [0.44, 0.46, 0.04], p: [0, 1.0, 0.155], cor: '#ffd45a' },
    { t: [0.16, 0.08, 0.02], p: [0, 0.94, 0.18], cor: '#f0a830' },
  ],
  // pedreiro: camisa branca, calça jeans e cinto de ferramentas; o capacete amarelo e o colete
  // laranja são as peças de fantasia que a criança ganha no canteiro (`fantasias`, abaixo):
  // o mesmo capacete redondo de aba curta, não um chapéu
  construtor: [
    ...corpoDeMorador({
      pele: '#b9825c',
      roupa: '#f2f0ea',
      calca: '#3f6fb8',
      sapato: '#4a3426',
      cabelo: '#2e2018',
    }),
    // cinto com a colher de pedreiro
    { t: [0.52, 0.06, 0.3], p: [0, 0.86, 0], cor: '#6b4a3a' },
    { t: [0.06, 0.16, 0.03], p: [0.2, 0.8, 0.16], cor: '#9aa0a8' },
  ],
  // mecânico: macacão azul e a chave inglesa no bolso; o boné vermelho de brinquedo é a peça de
  // fantasia `bone` (`fantasias`, abaixo)
  ferreiro: [
    ...corpoDeMorador({
      pele: '#8a5a3c',
      roupa: '#3a6ab0',
      calca: '#2f5a9a',
      sapato: '#2a2026',
      cabelo: '#1e1612',
    }),
    // as alças do macacão
    { t: [0.07, 0.5, 0.3], p: [0.13, 1.15, 0], cor: '#2a4f8e' },
    { t: [0.07, 0.5, 0.3], p: [-0.13, 1.15, 0], cor: '#2a4f8e' },
    { t: [0.3, 0.18, 0.04], p: [0, 1.0, 0.155], cor: '#2a4f8e' },
    { t: [0.05, 0.2, 0.04], p: [-0.12, 1.0, 0.18], cor: '#b7bec8' },
  ],
};

export const POVOADO_CIDADE: PovoadoTema = {
  nome: 'Bairro da praça',
  profissoes: {
    cozinheiro: 'Padeira',
    construtor: 'Pedreiro',
    ferreiro: 'Mecânico',
  },
  nomes: [
    'Ana',
    'Bia',
    'Duda',
    'Tati',
    'Lara',
    'Mel',
    'Leo',
    'Gui',
    'Beto',
    'Nico',
    'Davi',
    'Caio',
  ],
  moradores: MORADORES,
  // a padeira usa a touca de chef do jogador
  acessorios: { cozinheiro: 'touca-chef' },
  // o pedreiro veste o capacete e o colete de obra (camisa branca: a segunda cor do colete)
  fantasias: {
    construtor: { id: 'colete-obra', cor: 1 },
    ferreiro: { id: 'mecanico-cidade', cor: 0 },
  },
  // passo ligeiro de quem anda na calçada
  movimento: { saltita: 0.02, flutua: 0, ginga: 0.04 },
  vozes: {
    // "oi, oi!"
    chamado: pio('triangle', 340, 470, 0.13, 2, 0.08, { vibrato: 5, ganho: 0.6 }),
    // "opa!"
    susto: pio('triangle', 540, 380, 0.16, 1, 0, { vibrato: 7, ganho: 0.62 }),
    // "que legal!"
    contente: pio('sine', 360, 480, 0.2, 1, 0, { vibrato: 4, ganho: 0.6 }),
    // "valeu!"
    obrigado: pio('triangle', 400, 600, 0.1, 3, 0.06, { ganho: 0.6 }),
  },
  textos: {
    trocas: 'Lojinhas da cidade',
    trocar: 'Trocar',
    faltam: 'Falta coisa pra essa troca',
    chegou: 'Você chegou no bairro da praça!',
  },
};
