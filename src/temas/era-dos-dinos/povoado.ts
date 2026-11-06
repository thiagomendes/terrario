import type { Profissao } from '../../world/povoado';
import type { PecaCriatura, PovoadoTema } from '../tipos';
import { corpoDeMorador, naCabeca } from '../bruma-e-luz/povoado';

/** Colete de expedição: duas faixas na frente do tronco, com bolsinhos. */
function colete(cor: string, bolso: string): PecaCriatura[] {
  return [
    { t: [0.17, 0.6, 0.04], p: [0.165, 1.12, 0.155], cor },
    { t: [0.17, 0.6, 0.04], p: [-0.165, 1.12, 0.155], cor },
    { t: [0.54, 0.6, 0.2], p: [0, 1.12, -0.05], cor },
    { t: [0.12, 0.1, 0.03], p: [0.165, 1.02, 0.18], cor: bolso },
    { t: [0.12, 0.1, 0.03], p: [-0.165, 1.02, 0.18], cor: bolso },
  ];
}

/** Chapéu de explorador: aba larga, copa e fita. */
function chapeu(aba: string, fita: string): PecaCriatura[] {
  return [
    naCabeca([0.66, 0.05, 0.66], 1.9, aba),
    naCabeca([0.44, 0.16, 0.44], 2.0, aba),
    naCabeca([0.46, 0.05, 0.46], 1.95, fita),
  ];
}

/** Cinto marrom na cintura. */
const CINTO: PecaCriatura = { t: [0.52, 0.07, 0.3], p: [0, 0.81, 0], cor: '#5a3a22' };

const MORADORES: Record<Profissao, PecaCriatura[]> = {
  // ferramenteira: avental de couro, óculos de proteção no chapéu e martelinho na mão
  ferreiro: [
    ...corpoDeMorador({
      pele: '#c98b62',
      roupa: '#d8c7a0',
      calca: '#6a5a40',
      sapato: '#3a2618',
      cabelo: '#2e2018',
    }),
    ...chapeu('#8a6238', '#3a2618'),
    // óculos de proteção na frente do chapéu
    naCabeca([0.3, 0.08, 0.04], 2.0, '#4fa8b0', 0.23),
    { t: [0.44, 0.6, 0.04], p: [0, 1.0, 0.155], cor: '#7a4a2a' },
    CINTO,
    // martelinho de paleontólogo na mão direita
    { t: [0.05, 0.05, 0.34], p: [0.34, 0.74, 0.2], cor: '#6b4527', papel: 'perna1' },
    { t: [0.08, 0.22, 0.09], p: [0.34, 0.76, 0.38], cor: '#8a8e96', papel: 'perna1' },
  ],
  // cozinheiro do acampamento: lenço vermelho na cabeça, avental branco e concha
  cozinheiro: [
    ...corpoDeMorador({
      pele: '#e2b48c',
      roupa: '#5f7a3a',
      calca: '#6a5a40',
      sapato: '#3a2a22',
      cabelo: '#7a4a28',
    }),
    naCabeca([0.46, 0.12, 0.46], 1.9, '#c8432c'),
    naCabeca([0.12, 0.1, 0.1], 1.86, '#c8432c', -0.26),
    // lenço no pescoço
    { t: [0.52, 0.09, 0.32], p: [0, 1.41, 0.01], cor: '#ffb15c' },
    { t: [0.42, 0.52, 0.04], p: [0, 0.97, 0.155], cor: '#f2ece0' },
    // concha na mão direita
    { t: [0.05, 0.05, 0.3], p: [0.34, 0.76, 0.2], cor: '#b8bcc4', papel: 'perna1' },
    { t: [0.16, 0.1, 0.16], p: [0.34, 0.74, 0.42], cor: '#b8bcc4', papel: 'perna1' },
  ],
  // construtora de tendas: chapéu de explorador clássico, colete cáqui e lupa
  construtor: [
    ...corpoDeMorador({
      pele: '#9a6644',
      roupa: '#e8dcc0',
      calca: '#7a6a4a',
      sapato: '#3a2618',
      cabelo: '#1a1410',
    }),
    ...chapeu('#c9a86a', '#6a4a2a'),
    ...colete('#8a7a3e', '#6a5c2c'),
    CINTO,
    // lupa na mão direita: cabo e lente
    { t: [0.05, 0.18, 0.05], p: [0.34, 0.66, 0.12], cor: '#6b4527', papel: 'perna1' },
    { t: [0.24, 0.24, 0.04], p: [0.34, 0.47, 0.12], cor: '#d9a440', papel: 'perna1' },
    { t: [0.16, 0.16, 0.05], p: [0.34, 0.47, 0.12], cor: '#bfe8f0', papel: 'perna1' },
    // mochila de lona nas costas
    { t: [0.36, 0.44, 0.14], p: [0, 1.14, -0.21], cor: '#7a5a34' },
  ],
};

export const POVOADO_DINOS: PovoadoTema = {
  nome: 'Acampamento dos paleontólogos',
  profissoes: {
    ferreiro: 'Ferramenteira',
    cozinheiro: 'Cozinheiro',
    construtor: 'Montadora de tendas',
  },
  nomes: ['Ana', 'Leo', 'Duda', 'Gui', 'Tati', 'Beto', 'Mel', 'Juca', 'Iris', 'Otto', 'Lara'],
  moradores: MORADORES,
  movimento: { saltita: 0, flutua: 0, ginga: 0.05 },
  vozes: {
    chamado: {
      onda: 'triangle',
      de: 220,
      ate: 300,
      dur: 0.18,
      repeticoes: 2,
      intervalo: 0.09,
      ruido: 0.15,
      ganho: 0.7,
    },
    susto: {
      onda: 'triangle',
      de: 460,
      ate: 240,
      dur: 0.2,
      repeticoes: 1,
      intervalo: 0,
      ruido: 0.2,
    },
    contente: {
      onda: 'triangle',
      de: 250,
      ate: 360,
      dur: 0.15,
      repeticoes: 2,
      intervalo: 0.06,
      ganho: 0.7,
    },
    obrigado: {
      onda: 'triangle',
      de: 280,
      ate: 400,
      dur: 0.13,
      repeticoes: 3,
      intervalo: 0.05,
      ganho: 0.7,
    },
  },
  textos: {
    trocas: 'Trocas da expedição',
    trocar: 'Trocar',
    faltam: 'Faltam itens para esta troca',
    chegou: 'Você encontrou um acampamento de paleontólogos',
  },
};
