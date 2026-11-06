import type { FormasPovoado, Profissao } from '../../world/povoado';
import type { PecaCriatura, PovoadoTema } from '../tipos';

const BRANCO = '#eef0f5';
const CINZA = '#b8bec9';
const ESCURO = '#4a505c';

/**
 * Astronauta em traje branco, da altura do jogador. A cor da profissão aparece nas luvas,
 * nas faixas dos ombros e dos joelhos e no painel do peito. O rosto aparece atrás do
 * visor de vidro. O braço esquerdo balança com a perna direita.
 */
function astronauta(cores: { detalhe: string; pele: string; olho?: string }): PecaCriatura[] {
  const d = cores.detalhe;
  const olho = cores.olho ?? '#1a1a24';
  return [
    // pernas, faixa no joelho e botas
    { t: [0.22, 0.76, 0.24], p: [0.13, 0.4, 0], cor: BRANCO, papel: 'perna0' },
    { t: [0.22, 0.76, 0.24], p: [-0.13, 0.4, 0], cor: BRANCO, papel: 'perna1' },
    { t: [0.23, 0.06, 0.25], p: [0.13, 0.5, 0], cor: d, papel: 'perna0' },
    { t: [0.23, 0.06, 0.25], p: [-0.13, 0.5, 0], cor: d, papel: 'perna1' },
    { t: [0.24, 0.14, 0.3], p: [0.13, 0.07, 0.02], cor: ESCURO, papel: 'perna0' },
    { t: [0.24, 0.14, 0.3], p: [-0.13, 0.07, 0.02], cor: ESCURO, papel: 'perna1' },
    // tronco, cinto, painel do peito e mochila de oxigênio
    { t: [0.56, 0.68, 0.32], p: [0, 1.12, 0], cor: BRANCO },
    { t: [0.58, 0.08, 0.34], p: [0, 0.82, 0], cor: CINZA },
    { t: [0.26, 0.16, 0.03], p: [0, 1.24, 0.17], cor: d },
    { t: [0.06, 0.06, 0.02], p: [0.07, 1.25, 0.19], cor: '#6ff0ff', brilho: 1 },
    { t: [0.06, 0.06, 0.02], p: [-0.04, 1.25, 0.19], cor: '#ff5a5a', brilho: 0.9 },
    { t: [0.46, 0.58, 0.18], p: [0, 1.16, -0.25], cor: CINZA },
    { t: [0.1, 0.4, 0.06], p: [0.14, 1.16, -0.35], cor: d },
    // braços, faixa no ombro e luvas
    { t: [0.17, 0.6, 0.2], p: [0.37, 1.12, 0], cor: BRANCO, papel: 'perna1' },
    { t: [0.17, 0.6, 0.2], p: [-0.37, 1.12, 0], cor: BRANCO, papel: 'perna0' },
    { t: [0.18, 0.08, 0.21], p: [0.37, 1.34, 0], cor: d, papel: 'perna1' },
    { t: [0.18, 0.08, 0.21], p: [-0.37, 1.34, 0], cor: d, papel: 'perna0' },
    { t: [0.18, 0.15, 0.21], p: [0.37, 0.76, 0], cor: d, papel: 'perna1' },
    { t: [0.18, 0.15, 0.21], p: [-0.37, 0.76, 0], cor: d, papel: 'perna0' },
    // capacete, rosto atrás do visor e reflexo
    { t: [0.54, 0.5, 0.5], p: [0, 1.72, 0], cor: BRANCO, papel: 'cabeca' },
    { t: [0.56, 0.06, 0.52], p: [0, 1.5, 0], cor: CINZA, papel: 'cabeca' },
    { t: [0.38, 0.26, 0.02], p: [0, 1.71, 0.255], cor: cores.pele, papel: 'cabeca' },
    { t: [0.08, 0.1, 0.02], p: [0.09, 1.73, 0.27], cor: olho, papel: 'cabeca' },
    { t: [0.08, 0.1, 0.02], p: [-0.09, 1.73, 0.27], cor: olho, papel: 'cabeca' },
    { t: [0.08, 0.04, 0.02], p: [0.15, 1.66, 0.27], cor: '#ff9ab0', papel: 'cabeca' },
    { t: [0.08, 0.04, 0.02], p: [-0.15, 1.66, 0.27], cor: '#ff9ab0', papel: 'cabeca' },
    {
      t: [0.44, 0.32, 0.03],
      p: [0, 1.71, 0.28],
      cor: '#bfe6ff',
      alfa: 0.18,
      brilho: 0.2,
      papel: 'cabeca',
    },
    { t: [0.07, 0.05, 0.01], p: [-0.14, 1.82, 0.3], cor: '#ffffff', brilho: 0.8, papel: 'cabeca' },
  ];
}

/** Robô de cozinha: caixa branca, tela de rosto sorridente e antena. */
function robo(detalhe: string): PecaCriatura[] {
  const tela = '#6ff0ff';
  return [
    // pernas de metal com pés largos
    { t: [0.18, 0.7, 0.2], p: [0.14, 0.42, 0], cor: '#8a9099', papel: 'perna0' },
    { t: [0.18, 0.7, 0.2], p: [-0.14, 0.42, 0], cor: '#8a9099', papel: 'perna1' },
    { t: [0.26, 0.12, 0.32], p: [0.14, 0.06, 0.03], cor: ESCURO, papel: 'perna0' },
    { t: [0.26, 0.12, 0.32], p: [-0.14, 0.06, 0.03], cor: ESCURO, papel: 'perna1' },
    // corpo em caixa, faixa e luzinhas
    { t: [0.6, 0.66, 0.36], p: [0, 1.1, 0], cor: '#f0f2f5' },
    { t: [0.62, 0.06, 0.38], p: [0, 0.8, 0], cor: detalhe },
    { t: [0.62, 0.06, 0.38], p: [0, 1.4, 0], cor: detalhe },
    { t: [0.07, 0.07, 0.02], p: [-0.18, 1.3, 0.19], cor: '#ffcf3a', brilho: 1 },
    // braços com garras
    { t: [0.14, 0.56, 0.16], p: [0.38, 1.12, 0], cor: '#a0a6b0', papel: 'perna1' },
    { t: [0.14, 0.56, 0.16], p: [-0.38, 1.12, 0], cor: '#a0a6b0', papel: 'perna0' },
    { t: [0.2, 0.14, 0.2], p: [0.38, 0.78, 0], cor: detalhe, papel: 'perna1' },
    { t: [0.2, 0.14, 0.2], p: [-0.38, 0.78, 0], cor: detalhe, papel: 'perna0' },
    // pescoço e cabeça com tela de rosto
    { t: [0.16, 0.08, 0.16], p: [0, 1.47, 0], cor: '#8a9099' },
    { t: [0.52, 0.4, 0.42], p: [0, 1.7, 0], cor: '#f4f5f8', papel: 'cabeca' },
    { t: [0.42, 0.28, 0.02], p: [0, 1.7, 0.215], cor: '#1a2230', papel: 'cabeca' },
    { t: [0.1, 0.1, 0.01], p: [0.1, 1.75, 0.23], cor: tela, brilho: 1.2, papel: 'cabeca' },
    { t: [0.1, 0.1, 0.01], p: [-0.1, 1.75, 0.23], cor: tela, brilho: 1.2, papel: 'cabeca' },
    { t: [0.2, 0.04, 0.01], p: [0, 1.635, 0.23], cor: tela, brilho: 1.2, papel: 'cabeca' },
    { t: [0.03, 0.03, 0.01], p: [0.115, 1.665, 0.23], cor: tela, brilho: 1.2, papel: 'cabeca' },
    { t: [0.03, 0.03, 0.01], p: [-0.115, 1.665, 0.23], cor: tela, brilho: 1.2, papel: 'cabeca' },
    { t: [0.06, 0.04, 0.01], p: [0.16, 1.66, 0.23], cor: '#ff8ab8', brilho: 0.7, papel: 'cabeca' },
    { t: [0.06, 0.04, 0.01], p: [-0.16, 1.66, 0.23], cor: '#ff8ab8', brilho: 0.7, papel: 'cabeca' },
    // orelhas de parafuso
    { t: [0.06, 0.14, 0.14], p: [0.29, 1.7, 0], cor: '#8a9099', papel: 'cabeca' },
    { t: [0.06, 0.14, 0.14], p: [-0.29, 1.7, 0], cor: '#8a9099', papel: 'cabeca' },
  ];
}

const LARANJA = '#f07a2a';
const VERDE = '#4ac88a';
const AMARELO = '#ffcf3a';

const MORADORES: Record<Profissao, PecaCriatura[]> = {
  // mecânica: detalhes laranja, óculos de solda no capacete e chave inglesa no cinto
  ferreiro: [
    ...astronauta({ detalhe: LARANJA, pele: '#e2b48c' }),
    { t: [0.46, 0.08, 0.06], p: [0, 1.88, 0.23], cor: '#2a2c33', papel: 'cabeca' },
    { t: [0.12, 0.07, 0.03], p: [0.1, 1.88, 0.265], cor: '#ffb84a', brilho: 0.6, papel: 'cabeca' },
    { t: [0.12, 0.07, 0.03], p: [-0.1, 1.88, 0.265], cor: '#ffb84a', brilho: 0.6, papel: 'cabeca' },
    { t: [0.06, 0.3, 0.06], p: [0.24, 0.7, 0.19], cor: '#c8ccd4' },
    { t: [0.14, 0.07, 0.06], p: [0.24, 0.86, 0.19], cor: '#c8ccd4' },
  ],
  // chef-robô: robô de faixas verdes com chapéu de cozinheiro e avental
  cozinheiro: [
    ...robo(VERDE),
    { t: [0.34, 0.16, 0.34], p: [0, 1.98, 0], cor: '#ffffff', papel: 'cabeca' },
    { t: [0.44, 0.12, 0.44], p: [0, 2.12, 0], cor: '#ffffff', papel: 'cabeca' },
    { t: [0.44, 0.5, 0.03], p: [0, 1.0, 0.195], cor: '#e8f8ee' },
    { t: [0.14, 0.1, 0.02], p: [0, 1.02, 0.21], cor: VERDE },
  ],
  // engenheira: detalhes amarelos, lanterna acesa no capacete e antena de rádio
  construtor: [
    ...astronauta({ detalhe: AMARELO, pele: '#b27a52' }),
    { t: [0.16, 0.1, 0.06], p: [0, 1.92, 0.22], cor: '#3a3e48', papel: 'cabeca' },
    { t: [0.12, 0.07, 0.02], p: [0, 1.92, 0.255], cor: '#fff6c0', brilho: 1.2, papel: 'cabeca' },
    { t: [0.03, 0.26, 0.03], p: [0.2, 2.06, -0.08], cor: '#c8ccd4', papel: 'cabeca' },
    { t: [0.06, 0.06, 0.06], p: [0.2, 2.2, -0.08], cor: '#ff4a4a', brilho: 0.9, papel: 'cabeca' },
    { t: [0.18, 0.16, 0.1], p: [-0.2, 0.74, 0.2], cor: AMARELO },
  ],
};

export const POVOADO_LUNAR: PovoadoTema = {
  nome: 'Colônia lunar',
  profissoes: { ferreiro: 'Mecânica', cozinheiro: 'Chef-robô', construtor: 'Engenheira' },
  nomes: [
    'Vega',
    'Nico',
    'Lia',
    'Bip',
    'Tito',
    'Ana',
    'Rex',
    'Zara',
    'Kiko',
    'Lara',
    'Ori',
    'Juno',
  ],
  moradores: MORADORES,
  // passos leves de gravidade baixa: um pulinho a cada passo
  movimento: { saltita: 0.08, flutua: 0, ginga: 0.03 },
  // vozes de rádio: chiado e bipes curtos
  vozes: {
    chamado: {
      onda: 'square',
      de: 520,
      ate: 620,
      dur: 0.1,
      repeticoes: 2,
      intervalo: 0.08,
      ruido: 0.35,
      ganho: 0.35,
    },
    susto: {
      onda: 'sawtooth',
      de: 760,
      ate: 340,
      dur: 0.18,
      repeticoes: 1,
      intervalo: 0,
      ruido: 0.4,
      ganho: 0.4,
    },
    contente: {
      onda: 'triangle',
      de: 600,
      ate: 900,
      dur: 0.1,
      repeticoes: 2,
      intervalo: 0.06,
      ruido: 0.2,
      ganho: 0.5,
    },
    obrigado: {
      onda: 'square',
      de: 700,
      ate: 1050,
      dur: 0.08,
      repeticoes: 3,
      intervalo: 0.05,
      ruido: 0.15,
      ganho: 0.35,
    },
  },
  textos: {
    trocas: 'Trocas da colônia',
    trocar: 'Trocar',
    faltam: 'Faltam itens para esta troca',
    chegou: 'Você encontrou uma colônia lunar',
  },
};

/** Casas em cúpula, oficina e depósito em módulos e uma antena parabólica na praça. */
export const FORMAS_POVOADO_LUNAR: FormasPovoado = {
  casa: 'cupula',
  oficina: 'modulo',
  deposito: 'modulo',
  marco: 'antena',
};
