import type { Profissao } from '../../world/povoado';
import type { PecaCriatura, PovoadoTema } from '../tipos';

/**
 * Morador em blocos, da altura do jogador. Braços e pernas usam perna0/perna1
 * (o braço esquerdo balança com a perna direita, como numa caminhada).
 */
export function corpoDeMorador(cores: {
  pele: string;
  roupa: string;
  calca: string;
  sapato: string;
  cabelo: string;
  olho?: string;
}): PecaCriatura[] {
  const olho = cores.olho ?? '#1a1420';
  return [
    // pernas
    { t: [0.2, 0.78, 0.22], p: [0.12, 0.39, 0], cor: cores.calca, papel: 'perna0' },
    { t: [0.2, 0.78, 0.22], p: [-0.12, 0.39, 0], cor: cores.calca, papel: 'perna1' },
    { t: [0.21, 0.12, 0.25], p: [0.12, 0.06, 0.02], cor: cores.sapato, papel: 'perna0' },
    { t: [0.21, 0.12, 0.25], p: [-0.12, 0.06, 0.02], cor: cores.sapato, papel: 'perna1' },
    // tronco e braços
    { t: [0.5, 0.66, 0.28], p: [0, 1.11, 0], cor: cores.roupa },
    { t: [0.16, 0.62, 0.18], p: [0.34, 1.12, 0], cor: cores.roupa, papel: 'perna1' },
    { t: [0.16, 0.62, 0.18], p: [-0.34, 1.12, 0], cor: cores.roupa, papel: 'perna0' },
    { t: [0.15, 0.14, 0.17], p: [0.34, 0.76, 0], cor: cores.pele, papel: 'perna1' },
    { t: [0.15, 0.14, 0.17], p: [-0.34, 0.76, 0], cor: cores.pele, papel: 'perna0' },
    // cabeça, cabelo e olhos
    { t: [0.42, 0.42, 0.42], p: [0, 1.66, 0], cor: cores.pele, papel: 'cabeca' },
    { t: [0.44, 0.12, 0.44], p: [0, 1.85, -0.01], cor: cores.cabelo, papel: 'cabeca' },
    { t: [0.44, 0.24, 0.1], p: [0, 1.74, -0.18], cor: cores.cabelo, papel: 'cabeca' },
    { t: [0.07, 0.07, 0.02], p: [0.09, 1.68, 0.215], cor: olho, papel: 'cabeca' },
    { t: [0.07, 0.07, 0.02], p: [-0.09, 1.68, 0.215], cor: olho, papel: 'cabeca' },
  ];
}

/** Acessório na cabeça (chapéu, touca, capacete), preso à cabeça. */
export function naCabeca(t: [number, number, number], y: number, cor: string, z = 0): PecaCriatura {
  return { t, p: [0, y, z], cor, papel: 'cabeca' };
}

const MORADORES: Record<Profissao, PecaCriatura[]> = {
  // ferreiro: avental de couro e luvas escuras
  ferreiro: [
    ...corpoDeMorador({
      pele: '#c98b62',
      roupa: '#5a4a6e',
      calca: '#3a3240',
      sapato: '#2a2026',
      cabelo: '#2e2018',
    }),
    { t: [0.44, 0.62, 0.04], p: [0, 1.02, 0.155], cor: '#6b4527' },
  ],
  // cozinheiro: touca e avental claros
  cozinheiro: [
    ...corpoDeMorador({
      pele: '#e2b48c',
      roupa: '#7a5a8a',
      calca: '#4a3e58',
      sapato: '#3a2a22',
      cabelo: '#7a4a28',
    }),
    naCabeca([0.4, 0.22, 0.4], 1.98, '#f4f0e8'),
    { t: [0.42, 0.5, 0.04], p: [0, 0.98, 0.155], cor: '#ece6dc' },
  ],
  // construtor: lanterna pendurada no cinto e chapéu de aba
  construtor: [
    ...corpoDeMorador({
      pele: '#9a6644',
      roupa: '#3e6a64',
      calca: '#3a3a44',
      sapato: '#2a2422',
      cabelo: '#1a1410',
    }),
    naCabeca([0.56, 0.05, 0.56], 1.89, '#4a3a2a'),
    naCabeca([0.4, 0.14, 0.4], 1.96, '#4a3a2a'),
    { t: [0.12, 0.16, 0.12], p: [0.2, 0.8, 0.18], cor: '#ffb84a', brilho: 0.9 },
  ],
};

export const POVOADO_BRUMA: PovoadoTema = {
  nome: 'Aldeia das lanternas',
  profissoes: { ferreiro: 'Ferreira', cozinheiro: 'Cozinheiro', construtor: 'Construtora' },
  nomes: ['Lia', 'Teo', 'Mira', 'Davi', 'Nina', 'Caio', 'Bia', 'Rui', 'Luz', 'Ivo'],
  moradores: MORADORES,
  movimento: { saltita: 0, flutua: 0, ginga: 0.04 },
  vozes: {
    chamado: {
      onda: 'triangle',
      de: 260,
      ate: 320,
      dur: 0.18,
      repeticoes: 2,
      intervalo: 0.08,
      ruido: 0.2,
      ganho: 0.7,
    },
    susto: {
      onda: 'triangle',
      de: 420,
      ate: 260,
      dur: 0.2,
      repeticoes: 1,
      intervalo: 0,
      ruido: 0.25,
    },
    contente: {
      onda: 'triangle',
      de: 280,
      ate: 380,
      dur: 0.16,
      repeticoes: 2,
      intervalo: 0.06,
      ganho: 0.7,
    },
    obrigado: {
      onda: 'triangle',
      de: 300,
      ate: 420,
      dur: 0.14,
      repeticoes: 3,
      intervalo: 0.05,
      ganho: 0.7,
    },
  },
  textos: {
    trocas: 'Trocas',
    trocar: 'Trocar',
    faltam: 'Faltam itens para esta troca',
    chegou: 'Você encontrou uma aldeia das lanternas',
  },
};
