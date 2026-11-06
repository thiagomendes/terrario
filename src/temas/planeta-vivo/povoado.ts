import type { Profissao } from '../../world/povoado';
import type { PecaCriatura, PovoadoTema } from '../tipos';

interface CoresAlien {
  pele: string;
  /** Tom mais escuro da pele (mãos, pescoço). */
  sombra: string;
  roupa: string;
  calca: string;
  bota: string;
  /** Bolinha brilhante na ponta das antenas. */
  luz: string;
}

/**
 * Alienígena cabeçudo da altura do jogador: perninhas curtas, macacão de pesquisa,
 * cabeçona com olhões, bochechas e sorriso, e duas antenas com bolinhas de luz.
 * O braço esquerdo balança com a perna direita (papéis trocados).
 */
function corpoDeAlien(c: CoresAlien, antenaX = 0.2, antenaBase = 1.79): PecaCriatura[] {
  const haste = 0.26;
  const yHaste = antenaBase + haste / 2;
  const yBola = antenaBase + haste + 0.05;
  return [
    // perninhas e botas
    { t: [0.18, 0.5, 0.2], p: [0.12, 0.35, 0], cor: c.calca, papel: 'perna0' },
    { t: [0.18, 0.5, 0.2], p: [-0.12, 0.35, 0], cor: c.calca, papel: 'perna1' },
    { t: [0.22, 0.12, 0.27], p: [0.12, 0.06, 0.03], cor: c.bota, papel: 'perna0' },
    { t: [0.22, 0.12, 0.27], p: [-0.12, 0.06, 0.03], cor: c.bota, papel: 'perna1' },
    // tronco (macacão) e braços
    { t: [0.5, 0.54, 0.3], p: [0, 0.88, 0], cor: c.roupa },
    { t: [0.14, 0.48, 0.16], p: [0.33, 0.9, 0], cor: c.roupa, papel: 'perna1' },
    { t: [0.14, 0.48, 0.16], p: [-0.33, 0.9, 0], cor: c.roupa, papel: 'perna0' },
    { t: [0.15, 0.13, 0.17], p: [0.33, 0.6, 0], cor: c.sombra, papel: 'perna1' },
    { t: [0.15, 0.13, 0.17], p: [-0.33, 0.6, 0], cor: c.sombra, papel: 'perna0' },
    // pescoço fininho e cabeçona
    { t: [0.16, 0.1, 0.16], p: [0, 1.19, 0], cor: c.sombra },
    { t: [0.7, 0.58, 0.58], p: [0, 1.5, 0], cor: c.pele, papel: 'cabeca' },
    // olhões com brilho
    { t: [0.2, 0.22, 0.04], p: [0.15, 1.54, 0.3], cor: '#ffffff', papel: 'cabeca' },
    { t: [0.2, 0.22, 0.04], p: [-0.15, 1.54, 0.3], cor: '#ffffff', papel: 'cabeca' },
    { t: [0.11, 0.13, 0.04], p: [0.13, 1.52, 0.315], cor: '#1a1030', papel: 'cabeca' },
    { t: [0.11, 0.13, 0.04], p: [-0.13, 1.52, 0.315], cor: '#1a1030', papel: 'cabeca' },
    { t: [0.04, 0.04, 0.01], p: [0.1, 1.56, 0.338], cor: '#ffffff', papel: 'cabeca' },
    { t: [0.04, 0.04, 0.01], p: [-0.16, 1.56, 0.338], cor: '#ffffff', papel: 'cabeca' },
    // bochechas e sorrisão
    { t: [0.09, 0.05, 0.04], p: [0.27, 1.4, 0.3], cor: '#ff8ac0', papel: 'cabeca' },
    { t: [0.09, 0.05, 0.04], p: [-0.27, 1.4, 0.3], cor: '#ff8ac0', papel: 'cabeca' },
    { t: [0.16, 0.04, 0.04], p: [0, 1.33, 0.3], cor: '#7a2050', papel: 'cabeca' },
    { t: [0.04, 0.04, 0.04], p: [0.1, 1.36, 0.3], cor: '#7a2050', papel: 'cabeca' },
    { t: [0.04, 0.04, 0.04], p: [-0.1, 1.36, 0.3], cor: '#7a2050', papel: 'cabeca' },
    // antenas com bolinhas de luz
    { t: [0.05, haste, 0.05], p: [antenaX, yHaste, 0], cor: c.sombra, papel: 'antena' },
    { t: [0.05, haste, 0.05], p: [-antenaX, yHaste, 0], cor: c.sombra, papel: 'antena' },
    { t: [0.12, 0.12, 0.12], p: [antenaX, yBola, 0], cor: c.luz, brilho: 1, papel: 'antena' },
    { t: [0.12, 0.12, 0.12], p: [-antenaX, yBola, 0], cor: c.luz, brilho: 1, papel: 'antena' },
  ];
}

const MORADORES: Record<Profissao, PecaCriatura[]> = {
  // mecânica: alien turquesa de macacão laranja, óculos de solda na testa e chave na mão
  ferreiro: [
    ...corpoDeAlien({
      pele: '#6fd8c0',
      sombra: '#3a9a88',
      roupa: '#ff9a4a',
      calca: '#c0603a',
      bota: '#4a3060',
      luz: '#ffe27a',
    }),
    { t: [0.72, 0.08, 0.6], p: [0, 1.71, 0], cor: '#4a3060', papel: 'cabeca' },
    { t: [0.16, 0.13, 0.03], p: [0.15, 1.71, 0.305], cor: '#5af0ff', brilho: 0.8, papel: 'cabeca' },
    {
      t: [0.16, 0.13, 0.03],
      p: [-0.15, 1.71, 0.305],
      cor: '#5af0ff',
      brilho: 0.8,
      papel: 'cabeca',
    },
    // cinto de ferramentas
    { t: [0.52, 0.08, 0.32], p: [0, 0.66, 0], cor: '#4a3060' },
    { t: [0.12, 0.12, 0.06], p: [0.13, 0.66, 0.17], cor: '#8a96aa' },
    // chave inglesa na mão direita
    { t: [0.06, 0.3, 0.06], p: [0.33, 0.5, 0.1], cor: '#c8d2e0', papel: 'perna1' },
    { t: [0.14, 0.07, 0.07], p: [0.33, 0.36, 0.1], cor: '#c8d2e0', papel: 'perna1' },
  ],
  // chef estelar: alien lilás de touca alta (antenas saindo dos lados) e avental branco
  cozinheiro: [
    ...corpoDeAlien(
      {
        pele: '#c8a0ff',
        sombra: '#9070d0',
        roupa: '#5a8ae0',
        calca: '#3e5aa8',
        bota: '#2a2050',
        luz: '#ff8ad0',
      },
      0.31,
      1.7,
    ),
    { t: [0.48, 0.08, 0.46], p: [0, 1.82, 0], cor: '#f4ecff', papel: 'cabeca' },
    { t: [0.42, 0.22, 0.4], p: [0, 1.97, 0], cor: '#ffffff', papel: 'cabeca' },
    // avental com bolso rosa
    { t: [0.42, 0.52, 0.04], p: [0, 0.82, 0.16], cor: '#fff4fa' },
    { t: [0.14, 0.1, 0.02], p: [0, 0.76, 0.185], cor: '#ff8ac0' },
    // colher de pau na mão esquerda
    { t: [0.05, 0.3, 0.05], p: [-0.33, 0.48, 0.1], cor: '#ffb070', papel: 'perna0' },
    { t: [0.1, 0.1, 0.08], p: [-0.33, 0.32, 0.1], cor: '#ffb070', papel: 'perna0' },
  ],
  // engenheiro: alien verde-limão de capacete amarelo, macacão azul-petróleo e tablet brilhante
  construtor: [
    ...corpoDeAlien(
      {
        pele: '#a8e86a',
        sombra: '#6ab040',
        roupa: '#2f8a9a',
        calca: '#24606e',
        bota: '#3a2a50',
        luz: '#8ef6e4',
      },
      0.18,
      1.89,
    ),
    { t: [0.74, 0.14, 0.62], p: [0, 1.82, 0], cor: '#ffd36e', papel: 'cabeca' },
    { t: [0.74, 0.04, 0.14], p: [0, 1.76, 0.34], cor: '#f0a830', papel: 'cabeca' },
    { t: [0.12, 0.1, 0.02], p: [0, 1.82, 0.315], cor: '#ff9a4a', brilho: 0.6, papel: 'cabeca' },
    // faixas refletoras e tablet
    { t: [0.52, 0.06, 0.32], p: [0, 1.0, 0], cor: '#ffd36e' },
    { t: [0.52, 0.06, 0.32], p: [0, 0.72, 0], cor: '#ffd36e' },
    { t: [0.2, 0.26, 0.04], p: [0.33, 0.56, 0.13], cor: '#1a2440', papel: 'perna1' },
    { t: [0.16, 0.2, 0.02], p: [0.33, 0.56, 0.155], cor: '#5af0d0', brilho: 1, papel: 'perna1' },
  ],
};

export const POVOADO_PLANETA: PovoadoTema = {
  nome: 'Posto de pesquisa',
  profissoes: { ferreiro: 'Mecânica', cozinheiro: 'Chef estelar', construtor: 'Engenheiro' },
  nomes: [
    'Zib',
    'Plim',
    'Blup',
    'Zuzu',
    'Quark',
    'Nebi',
    'Glim',
    'Tuti',
    'Bop',
    'Lulo',
    'Ziza',
    'Pipo',
  ],
  moradores: MORADORES,
  // passinho saltitante de quem acha tudo divertido
  movimento: { saltita: 0.05, flutua: 0, ginga: 0.06 },
  vozes: {
    // "bli-blip?"
    chamado: {
      onda: 'sine',
      de: 520,
      ate: 880,
      dur: 0.12,
      repeticoes: 2,
      intervalo: 0.07,
      vibrato: 7,
      ganho: 0.6,
    },
    // "uiii!"
    susto: {
      onda: 'triangle',
      de: 900,
      ate: 1500,
      dur: 0.18,
      repeticoes: 1,
      intervalo: 0,
      ganho: 0.6,
    },
    // "blop-blop-blop"
    contente: {
      onda: 'sine',
      de: 440,
      ate: 760,
      dur: 0.08,
      repeticoes: 3,
      intervalo: 0.05,
      ganho: 0.6,
    },
    // "zi-buuu!" agradecido, subindo
    obrigado: {
      onda: 'sine',
      de: 600,
      ate: 1200,
      dur: 0.14,
      repeticoes: 2,
      intervalo: 0.06,
      vibrato: 10,
      ganho: 0.6,
    },
  },
  textos: {
    trocas: 'Trocas',
    trocar: 'Trocar',
    faltam: 'Faltam itens para esta troca',
    chegou: 'Você encontrou um posto de pesquisa alienígena!',
  },
};
