import type { Profissao } from '../../world/povoado';
import { corpoDeMorador, naCabeca } from '../bruma-e-luz/povoado';
import type { PecaCriatura, PioCriatura, PovoadoTema } from '../tipos';

/** Bochechas rosadas e sorrisinho (presos à cabeça). */
function carinha(sorriso: string, bochecha = '#ff8aa8'): PecaCriatura[] {
  return [
    { t: [0.08, 0.05, 0.02], p: [0.15, 1.6, 0.215], cor: bochecha, papel: 'cabeca' },
    { t: [0.08, 0.05, 0.02], p: [-0.15, 1.6, 0.215], cor: bochecha, papel: 'cabeca' },
    { t: [0.12, 0.03, 0.02], p: [0, 1.56, 0.215], cor: sorriso, papel: 'cabeca' },
  ];
}

/** Biscoito de gengibre: corpo todo de massa assada, com o glacê branco por cima. */
const BISCOITO = '#c47a3c';
const GLACE = '#fffaf4';

const MORADORES: Record<Profissao, PecaCriatura[]> = {
  // colhereira: blusa de morango, avental de chocolate, lenço rosa e colherona de pau
  ferreiro: [
    ...corpoDeMorador({
      pele: '#f2c8a2',
      roupa: '#ff7aaa',
      calca: '#7a4a8e',
      sapato: '#5a2e1e',
      cabelo: '#8a4a26',
    }),
    ...carinha('#a8445a'),
    // lenço amarrado com bolinhas de glacê
    naCabeca([0.46, 0.12, 0.46], 1.9, '#ff5a96'),
    { t: [0.06, 0.06, 0.02], p: [0.1, 1.9, 0.235], cor: GLACE, papel: 'cabeca' },
    { t: [0.06, 0.06, 0.02], p: [-0.12, 1.92, 0.235], cor: GLACE, papel: 'cabeca' },
    // avental de chocolate com bolso de caramelo
    { t: [0.44, 0.66, 0.04], p: [0, 1.0, 0.155], cor: '#6a3a22' },
    { t: [0.18, 0.12, 0.02], p: [0, 0.9, 0.18], cor: '#e8a25a' },
    // colherona de pau na mão direita, erguida à frente (balança com o braço)
    { t: [0.07, 0.6, 0.07], p: [0.34, 0.98, 0.2], cor: '#e0a868', papel: 'perna1' },
    { t: [0.22, 0.26, 0.1], p: [0.34, 1.38, 0.2], cor: '#f2c48a', papel: 'perna1' },
    { t: [0.14, 0.16, 0.02], p: [0.34, 1.38, 0.255], cor: '#c88a4a', papel: 'perna1' },
  ],
  // confeiteiro: touca alta de chef, blusa de menta, avental branco e lacinho rosa
  cozinheiro: [
    ...corpoDeMorador({
      pele: '#e8b48a',
      roupa: '#6ad2b8',
      calca: '#f4a6c8',
      sapato: '#7a3e2a',
      cabelo: '#4a2a1a',
    }),
    ...carinha('#8a3a4a'),
    // touca de chef: faixa e copa fofinha
    naCabeca([0.44, 0.1, 0.44], 1.92, '#f4eee8'),
    naCabeca([0.5, 0.16, 0.5], 2.05, '#ffffff'),
    naCabeca([0.58, 0.14, 0.58], 2.18, '#ffffff'),
    // avental branco com coração de morango
    { t: [0.44, 0.6, 0.04], p: [0, 0.98, 0.155], cor: '#fffaf6' },
    { t: [0.12, 0.1, 0.02], p: [0, 1.06, 0.18], cor: '#ff5a86' },
    // lacinho rosa no pescoço
    { t: [0.22, 0.08, 0.04], p: [0, 1.4, 0.16], cor: '#ff5a96' },
  ],
  // construtor: bonequinho de biscoito com glacê, botões de bala e capacete de bala de limão
  construtor: [
    ...corpoDeMorador({
      pele: BISCOITO,
      roupa: BISCOITO,
      calca: BISCOITO,
      sapato: BISCOITO,
      cabelo: '#b46c32',
      olho: '#2a140c',
    }),
    ...carinha(GLACE, '#ff7a9a'),
    // glacê nos punhos e nos tornozelos
    { t: [0.18, 0.06, 0.2], p: [0.34, 0.88, 0], cor: GLACE, papel: 'perna1' },
    { t: [0.18, 0.06, 0.2], p: [-0.34, 0.88, 0], cor: GLACE, papel: 'perna0' },
    { t: [0.18, 0.06, 0.2], p: [0.34, 1.3, 0], cor: GLACE, papel: 'perna1' },
    { t: [0.18, 0.06, 0.2], p: [-0.34, 1.3, 0], cor: GLACE, papel: 'perna0' },
    { t: [0.22, 0.06, 0.24], p: [0.12, 0.2, 0], cor: GLACE, papel: 'perna0' },
    { t: [0.22, 0.06, 0.24], p: [-0.12, 0.2, 0], cor: GLACE, papel: 'perna1' },
    // gola de glacê ondulada
    { t: [0.52, 0.06, 0.3], p: [0, 1.42, 0], cor: GLACE },
    // botões de bala de goma
    { t: [0.09, 0.09, 0.03], p: [0, 1.3, 0.15], cor: '#ff4a72' },
    { t: [0.09, 0.09, 0.03], p: [0, 1.12, 0.15], cor: '#5ad6a0' },
    { t: [0.09, 0.09, 0.03], p: [0, 0.94, 0.15], cor: '#ffd23a' },
    // cinto de alcaçuz com fivela de caramelo
    { t: [0.52, 0.07, 0.3], p: [0, 0.82, 0], cor: '#4a2a5e' },
    { t: [0.1, 0.08, 0.02], p: [0, 0.82, 0.16], cor: '#f2b04a' },
    // capacete de bala de limão com listra de morango
    naCabeca([0.5, 0.16, 0.5], 1.94, '#ffd23a'),
    naCabeca([0.6, 0.04, 0.62], 1.87, '#ffc21a', 0.04),
    naCabeca([0.08, 0.17, 0.52], 1.95, '#ff5a86'),
  ],
};

const pio = (
  onda: PioCriatura['onda'],
  de: number,
  ate: number,
  dur: number,
  repeticoes = 1,
  intervalo = 0,
  extra: Partial<PioCriatura> = {},
): PioCriatura => ({ onda, de, ate, dur, repeticoes, intervalo, ...extra });

export const POVOADO_DOCE: PovoadoTema = {
  nome: 'Vilarejo dos confeiteiros',
  profissoes: {
    ferreiro: 'Colhereira',
    cozinheiro: 'Confeiteiro',
    construtor: 'Construtor de casinhas',
  },
  nomes: [
    'Mel',
    'Bala',
    'Pipoca',
    'Jujuba',
    'Bombom',
    'Paçoca',
    'Quindim',
    'Canela',
    'Suspiro',
    'Biju',
    'Cocada',
    'Fofura',
  ],
  moradores: MORADORES,
  // passinho saltitante e um balancinho alegre
  movimento: { saltita: 0.03, flutua: 0, ginga: 0.07 },
  vozes: {
    // "oiê!" cantado
    chamado: pio('sine', 520, 680, 0.14, 2, 0.07, { vibrato: 6, ganho: 0.65 }),
    // "ai!" fininho
    susto: pio('triangle', 820, 560, 0.16, 1, 0, { vibrato: 10, ganho: 0.7 }),
    // "hum!" gostoso
    contente: pio('sine', 460, 620, 0.2, 1, 0, { vibrato: 5, ganho: 0.6 }),
    // "brigadão!" em três notinhas que sobem
    obrigado: pio('sine', 560, 840, 0.1, 3, 0.05, { ganho: 0.65 }),
  },
  textos: {
    trocas: 'Docinhos por docinhos',
    trocar: 'Trocar',
    faltam: 'Faltam ingredientes para esta troca',
    chegou: 'Você encontrou um vilarejo dos confeiteiros!',
  },
};
