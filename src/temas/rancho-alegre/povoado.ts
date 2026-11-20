import type { Profissao } from '../../world/povoado';
import { corpoDeMorador } from '../base/povoado';
import type { PecaCriatura, PovoadoTema } from '../tipos';
import { pio } from './vozes';

/**
 * Peças acima da cabeça (chapéu, boné) ficam com o centro acima de 1,93: o boneco de
 * brinquedo trata o que fica abaixo disso, colado na cabeça, como cabelo (`moradorBoneco`).
 */
const ACIMA = 1.935;

/** Tranças de lado, presas à cabeça. */
const trancas = (cor: string): PecaCriatura[] =>
  [1, -1].map((s) => ({
    t: [0.12, 0.19, 0.12],
    p: [s * 0.235, 1.57, -0.07],
    cor,
    forma: 'bola',
    papel: 'cabeca',
  }));

const MORADORES: Record<Profissao, PecaCriatura[]> = {
  // fazendeira: camisa vermelha, calça jeans, tranças e chapéu de palha
  cozinheiro: [
    ...corpoDeMorador({
      pele: '#e2b48c',
      roupa: '#d9483b',
      calca: '#3f6fb8',
      sapato: '#5a3a26',
      cabelo: '#a0522d',
    }),
    ...trancas('#a0522d'),
    // lencinho xadrez no pescoço
    { t: [0.26, 0.07, 0.05], p: [0, 1.41, 0.15], cor: '#ffd45a' },
  ],
  // carpinteiro: camisa verde, calça marrom, boné cor de tábua, cinto e martelo no cinto
  construtor: [
    ...corpoDeMorador({
      pele: '#c98b62',
      roupa: '#4caa3a',
      calca: '#6b4a3a',
      sapato: '#3a2a22',
      cabelo: '#3a2a1e',
    }),
    { t: [0.46, 0.14, 0.42], p: [0, ACIMA, 0], cor: '#7a4826', papel: 'cabeca' },
    { t: [0.3, 0.03, 0.18], p: [0, ACIMA, 0.25], cor: '#7a4826', papel: 'cabeca' },
    { t: [0.52, 0.05, 0.3], p: [0, 1.06, 0], cor: '#8a5a3a' },
    { t: [0.05, 0.22, 0.05], p: [0.2, 0.98, 0.17], cor: '#b88a5a' },
    { t: [0.13, 0.06, 0.07], p: [0.2, 1.08, 0.17], cor: '#6b6f78' },
  ],
  // ferreira: blusa roxa, avental de couro, tranças e a pinça pendurada
  ferreiro: [
    ...corpoDeMorador({
      pele: '#9a6644',
      roupa: '#5a4a6e',
      calca: '#3a3240',
      sapato: '#2a2026',
      cabelo: '#2e2018',
    }),
    ...trancas('#2e2018'),
    { t: [0.42, 0.5, 0.04], p: [0, 1.0, 0.155], cor: '#6b4527' },
    { t: [0.16, 0.1, 0.02], p: [0, 0.92, 0.18], cor: '#8a6038' },
    { t: [0.05, 0.24, 0.05], p: [-0.2, 0.96, 0.18], cor: '#6b6f78' },
  ],
};

export const POVOADO_RANCHO: PovoadoTema = {
  nome: 'Sítio dos vizinhos',
  profissoes: {
    cozinheiro: 'Fazendeira',
    construtor: 'Carpinteiro',
    ferreiro: 'Ferreira',
  },
  nomes: [
    'Rosa',
    'Cida',
    'Dita',
    'Zefa',
    'Nena',
    'Tonho',
    'Chico',
    'Zé',
    'Bento',
    'Tião',
    'Juca',
    'Tunico',
  ],
  moradores: MORADORES,
  // a fazendeira usa o mesmo chapéu de palha do jogador (aba redonda e fita vermelha)
  acessorios: { cozinheiro: 'chapeu-palha' },
  // passo firme de quem anda na roça, com um balancinho
  movimento: { saltita: 0.02, flutua: 0, ginga: 0.05 },
  vozes: {
    // "ô, de casa!"
    chamado: pio('triangle', 300, 420, 0.16, 2, 0.08, { vibrato: 5, ganho: 0.6 }),
    // "eita!"
    susto: pio('triangle', 520, 360, 0.18, 1, 0, { vibrato: 7, ganho: 0.65 }),
    // "hum, que bom!"
    contente: pio('sine', 330, 440, 0.22, 1, 0, { vibrato: 4, ganho: 0.6 }),
    // "brigado, viu!"
    obrigado: pio('triangle', 380, 560, 0.1, 3, 0.06, { ganho: 0.6 }),
  },
  textos: {
    trocas: 'Feira da roça',
    trocar: 'Trocar',
    faltam: 'Falta coisa pra essa troca',
    chegou: 'Você chegou num sítio dos vizinhos!',
  },
};
