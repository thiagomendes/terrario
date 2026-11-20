import type { Profissao } from '../../world/povoado';
import { naCabeca } from '../base/povoado';
import type { PecaCriatura, PovoadoTema } from '../tipos';

/**
 * Corpo de morador da altura do jogador (como o do Bruma e Luz), mas sem a franja no
 * alto da cabeça: o cabelo fica atrás e dos lados, à mostra embaixo do chapéu ou lenço.
 */
function corpoDeMorador(cores: {
  pele: string;
  roupa: string;
  calca: string;
  sapato: string;
  cabelo: string;
}): PecaCriatura[] {
  const olho = '#1a1420';
  return [
    // pernas
    { t: [0.2, 0.78, 0.22], p: [0.12, 0.39, 0], cor: cores.calca, papel: 'perna0' },
    { t: [0.2, 0.78, 0.22], p: [-0.12, 0.39, 0], cor: cores.calca, papel: 'perna1' },
    { t: [0.21, 0.12, 0.25], p: [0.12, 0.06, 0.02], cor: cores.sapato, papel: 'perna0' },
    { t: [0.21, 0.12, 0.25], p: [-0.12, 0.06, 0.02], cor: cores.sapato, papel: 'perna1' },
    // tronco e braços (o esquerdo balança com a perna direita)
    { t: [0.5, 0.66, 0.28], p: [0, 1.11, 0], cor: cores.roupa },
    { t: [0.16, 0.62, 0.18], p: [0.34, 1.12, 0], cor: cores.roupa, papel: 'perna1' },
    { t: [0.16, 0.62, 0.18], p: [-0.34, 1.12, 0], cor: cores.roupa, papel: 'perna0' },
    { t: [0.15, 0.14, 0.17], p: [0.34, 0.76, 0], cor: cores.pele, papel: 'perna1' },
    { t: [0.15, 0.14, 0.17], p: [-0.34, 0.76, 0], cor: cores.pele, papel: 'perna0' },
    // cabeça, cabelo atrás e dos lados, olhos e bochechas rosadas
    { t: [0.42, 0.42, 0.42], p: [0, 1.66, 0], cor: cores.pele, papel: 'cabeca' },
    { t: [0.44, 0.3, 0.1], p: [0, 1.72, -0.18], cor: cores.cabelo, papel: 'cabeca' },
    { t: [0.44, 0.14, 0.24], p: [0, 1.79, -0.1], cor: cores.cabelo, papel: 'cabeca' },
    { t: [0.08, 0.08, 0.02], p: [0.09, 1.67, 0.215], cor: olho, papel: 'cabeca' },
    { t: [0.08, 0.08, 0.02], p: [-0.09, 1.67, 0.215], cor: olho, papel: 'cabeca' },
    { t: [0.07, 0.04, 0.02], p: [0.15, 1.58, 0.215], cor: '#e88a7a', papel: 'cabeca' },
    { t: [0.07, 0.04, 0.02], p: [-0.15, 1.58, 0.215], cor: '#e88a7a', papel: 'cabeca' },
    { t: [0.12, 0.03, 0.02], p: [0, 1.56, 0.215], cor: '#7a3a2a', papel: 'cabeca' },
  ];
}

const PALHA = '#e8c66a';
const PALHA_ESCURA = '#c9a24a';

/** Chapéu de palha de aba larga, com fita colorida. */
function chapeuDePalha(fita: string): PecaCriatura[] {
  return [
    naCabeca([0.66, 0.05, 0.66], 1.9, PALHA),
    naCabeca([0.4, 0.16, 0.4], 2.0, PALHA_ESCURA),
    naCabeca([0.42, 0.05, 0.42], 1.95, fita),
  ];
}

/** Florzinhas de chita estampadas na frente do tronco. */
function estampa(cor: string, pontos: [number, number][], z = 0.145): PecaCriatura[] {
  return pontos.map(([x, y]) => ({ t: [0.08, 0.08, 0.02], p: [x, y, z], cor }));
}

/**
 * Moradores da mata: gente simples do interior, de chapéu de palha e roupa de chita.
 * O ferreiro tem avental de couro e martelo; a quituteira, lenço na cabeça, vestido
 * florido e avental branco; o carpinteiro, camisa xadrez, suspensório e cinto de
 * ferramentas.
 */
const MORADORES: Record<Profissao, PecaCriatura[]> = {
  ferreiro: [
    ...corpoDeMorador({
      pele: '#b07850',
      roupa: '#d23a3a',
      calca: '#3a4a7a',
      sapato: '#4a2e1c',
      cabelo: '#2a1a12',
    }),
    ...estampa('#ffd23f', [
      [-0.16, 1.36],
      [0.16, 1.36],
    ]),
    // avental de couro
    { t: [0.42, 0.6, 0.04], p: [0, 1.02, 0.16], cor: '#7a4a28' },
    { t: [0.42, 0.05, 0.03], p: [0, 1.3, 0.18], cor: '#5a341c' },
    // lenço amarelo no pescoço
    { t: [0.44, 0.07, 0.3], p: [0, 1.43, 0], cor: '#ffd23f' },
    // martelo na mão direita, cabo para a frente
    { t: [0.07, 0.07, 0.42], p: [-0.34, 0.76, 0.26], cor: '#8a5a34', papel: 'perna0' },
    { t: [0.13, 0.24, 0.14], p: [-0.34, 0.76, 0.5], cor: '#6a6e78', papel: 'perna0' },
    ...chapeuDePalha('#d23a3a'),
  ],
  cozinheiro: [
    ...corpoDeMorador({
      pele: '#e0a87c',
      roupa: '#f2a516',
      calca: '#f2a516',
      sapato: '#8a3a2a',
      cabelo: '#5a3018',
    }),
    // saia rodada de chita (fica parada, as pernas aparecem embaixo)
    { t: [0.6, 0.42, 0.38], p: [0, 0.6, 0], cor: '#f2a516' },
    ...estampa(
      '#e8457a',
      [
        [-0.2, 0.7],
        [0.04, 0.52],
        [0.2, 0.72],
      ],
      0.195,
    ),
    ...estampa('#e8457a', [
      [-0.17, 1.34],
      [0.17, 1.3],
    ]),
    // avental branco
    { t: [0.4, 0.66, 0.04], p: [0, 0.96, 0.2], cor: '#fbf6ea' },
    { t: [0.16, 0.12, 0.02], p: [0, 0.86, 0.225], cor: '#3aa65a' },
    // lenço verde na cabeça, com nó atrás
    naCabeca([0.46, 0.14, 0.46], 1.88, '#3aa65a'),
    naCabeca([0.46, 0.2, 0.1], 1.76, '#3aa65a', -0.2),
    naCabeca([0.14, 0.14, 0.08], 1.78, '#2e8a48', -0.27),
    ...estampa('#fbf6ea', [[0.12, 1.9]], 0.235),
  ],
  construtor: [
    ...corpoDeMorador({
      pele: '#8a5a3a',
      roupa: '#2f7fc4',
      calca: '#6a4a2e',
      sapato: '#3a2618',
      cabelo: '#1a1410',
    }),
    // xadrez da camisa
    ...estampa('#9ad0f0', [
      [-0.12, 1.34],
      [0.12, 1.2],
      [-0.12, 1.06],
      [0.12, 0.92],
    ]),
    // suspensórios verdes
    { t: [0.07, 0.62, 0.03], p: [-0.16, 1.12, 0.15], cor: '#3a8a3a' },
    { t: [0.07, 0.62, 0.03], p: [0.16, 1.12, 0.15], cor: '#3a8a3a' },
    // cinto de ferramentas com lápis e trena
    { t: [0.54, 0.1, 0.32], p: [0, 0.82, 0], cor: '#8a5a2a' },
    { t: [0.12, 0.12, 0.08], p: [0.18, 0.76, 0.18], cor: '#ffd23f' },
    { t: [0.04, 0.22, 0.04], p: [-0.16, 0.8, 0.18], cor: '#e85a2a' },
    // tábua debaixo do braço esquerdo
    { t: [0.08, 0.14, 0.8], p: [0.44, 0.8, 0.04], cor: '#d8a464', papel: 'perna1' },
    ...chapeuDePalha('#2f7fc4'),
  ],
};

export const POVOADO_MATA: PovoadoTema = {
  nome: 'Vila dos artesãos',
  profissoes: { ferreiro: 'Ferreiro', cozinheiro: 'Quituteira', construtor: 'Carpinteiro' },
  nomes: ['Zé', 'Tonho', 'Dita', 'Chico', 'Lila', 'Bento', 'Rosa', 'Juca', 'Nena', 'Tião', 'Cida'],
  moradores: MORADORES,
  movimento: { saltita: 0.02, flutua: 0, ginga: 0.06 },
  vozes: {
    // "ô de casa!": dois chamados que sobem
    chamado: {
      onda: 'triangle',
      de: 300,
      ate: 400,
      dur: 0.16,
      repeticoes: 2,
      intervalo: 0.09,
      ruido: 0.15,
      ganho: 0.7,
    },
    // "eita!"
    susto: {
      onda: 'triangle',
      de: 520,
      ate: 300,
      dur: 0.18,
      repeticoes: 1,
      intervalo: 0,
      ruido: 0.2,
    },
    // risadinha "hehe"
    contente: {
      onda: 'triangle',
      de: 360,
      ate: 460,
      dur: 0.09,
      repeticoes: 3,
      intervalo: 0.05,
      ganho: 0.65,
    },
    // "brigado, viu!"
    obrigado: {
      onda: 'triangle',
      de: 340,
      ate: 520,
      dur: 0.12,
      repeticoes: 3,
      intervalo: 0.06,
      ganho: 0.7,
    },
  },
  textos: {
    trocas: 'Feirinha de trocas',
    trocar: 'Trocar',
    faltam: 'Ainda faltam coisas para esta troca',
    chegou: 'Você chegou a uma vila dos artesãos',
  },
};
