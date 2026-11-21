import type { Tema } from '../tipos';
import { CEU_FANTASIAS, QUADROS_FANTASIAS } from './ceu';
import { CRIATURAS_FANTASIAS, MOVIMENTO_FANTASIAS } from './criaturas';
import { MASCARAS_FANTASIAS, PINTORES_FANTASIAS } from './pintores';
import { POVOADO_FANTASIAS } from './povoado';
import { TEXTOS_FANTASIAS } from './textos';
import { VOZES_FANTASIAS } from './vozes';

/**
 * Noite das Fantasias (spec 027): a festa à fantasia de uma vila de brinquedo. A Praça da
 * Abóbora (a abóbora gigante sorridente, o palco e as barracas), a Rua das Casinhas Tortas, o
 * Bosque das Lanternas, a Horta do Seu Jerônimo, a Casa da Vovó Zuleica, a Loja de Fantasias e o
 * Castelinho do Vampirinho. O "dia" é um entardecer laranja dourado e a noite é roxa, com a lua
 * grande e as lanternas acesas, nunca escura de verdade. Cores roxo, laranja, verde-oliva e
 * dourado; nada de arco-íris, caveira, susto ou escuro total.
 */
export function construirNoiteDasFantasias(): Tema {
  return {
    id: 'noite-das-fantasias',
    nome: 'Noite das Fantasias',
    lema: 'A festa à fantasia da vila, com lanternas e docinhos',
    convite: 'Uma festa à fantasia com abóbora gigante, lanternas e fantasminhas fofos!',
    cores: {
      acento: '#ffa94a',
      fundoTitulo: ['#3a2458', '#24163a'],
      lema: '#f3e4ff',
      logo: {
        topo: [255, 169, 74],
        meio: [155, 110, 220],
        base: [106, 62, 156],
        extrusao: [58, 36, 88],
        bruma: [243, 228, 255],
      },
    },
    textos: TEXTOS_FANTASIAS,
    pintores: PINTORES_FANTASIAS,
    emissivos: [
      'cristal',
      'cogumelo',
      'min_luzita',
      'tocha',
      'lanterna',
      'bloco_luzita',
      'fornalha_acesa',
      'abobora_rosto',
    ],
    mascarasBrilho: MASCARAS_FANTASIAS,
    quadrosCeu: QUADROS_FANTASIAS,
    ceu: CEU_FANTASIAS,
    // o laguinho do bosque: lilás-azulado de livro de história
    agua: {
      fundoDia: [0.22, 0.36, 0.62],
      fundoNoite: [0.1, 0.06, 0.22],
      tinta: [0.9, 0.84, 1],
      opacidade: 0.78,
    },
    // a névoa baixa clarinha, quase branca com um toque lilás, rente ao chão
    bruma: { cor: [1, 0.95, 1.02], forca: 1 },
    particulas: {
      // vaga-lumes mornos de noite, e o pólen dourado da tarde
      vagalumeNoite: [1, 0.86, 0.42],
      vagalumeDia: [1, 0.8, 0.46],
      chuva: [0.84, 0.8, 1],
      neve: [1, 1, 1],
      folhas: [0.95, 0.52, 0.18],
      poeira: [0.74, 0.66, 0.74],
    },
    // sem arco-íris neste mundo, nem no céu (cores roxo, laranja e verde-oliva)
    climaVisual: { chuva: 'gotas', neve: false, relampago: false, arcoIris: false },
    criaturas: CRIATURAS_FANTASIAS,
    movimento: MOVIMENTO_FANTASIAS,
    vozes: VOZES_FANTASIAS,
    mundo: {
      arvores: {
        // as árvores do gerador do jogo (nunca a pirulito redonda)
        floresta: ['carvalho', 'betula'],
        campos: ['carvalho', 'betula'],
        taiga: ['pinho', 'betula'],
        montanhas: ['carvalho', 'pinho'],
        pantano: ['carvalho'],
      },
      estrutura: 'torre',
      crateras: 0,
      flora: 1,
      // a vila da festa: uma por mundo, em volta do nascimento (`src/world/noiteFantasias.ts`)
      povoado: {
        casa: 'duas-aguas',
        oficina: 'duas-aguas',
        deposito: 'duas-aguas',
        marco: 'fonte',
        planta: 'baile',
      },
      // o fantasminha de lençol da noite é manso: flutua, ri e vai embora, nunca assusta
      noite: 'mansa',
    },
    // a reserva sintetizada (a trilha gravada da festa vem na T21): travessa, em escala maior
    musica: {
      timbre: { onda: 'triangle', brilho: 0.7, sustentacao: 0.5, coro: 6, sino: 'sine' },
      transporte: 0,
      paletas: {
        dia: {
          // Fá, Dó, Ré menor e Sib: a ciranda de xilofone
          acordes: [
            [41, 53, 57, 60],
            [36, 52, 55, 60],
            [38, 50, 53, 57],
            [34, 50, 53, 58],
          ],
          melodia: [72, 74, 77, 79, 81, 84],
          intervalo: 5,
          chanceNota: 0.55,
          pulso: [41, 0, 0, 36, 0, 0, 38, 0],
          ganhoPulso: 0.35,
        },
        noite: {
          acordes: [
            [38, 50, 53, 57],
            [34, 50, 53, 58],
            [41, 53, 57, 60],
            [36, 52, 55, 60],
          ],
          melodia: [69, 72, 74, 77, 79],
          intervalo: 8,
          chanceNota: 0.35,
        },
      },
    },
    materiais: {
      madeira: { base: 'madeira', tom: 1.04 },
      terra: { base: 'terra', tom: 0.98 },
      folhagem: { base: 'folhagem', tom: 1.06 },
    },
    natureza: {
      // grilo de noite e passarinho de tarde, curtos e nunca em laço; sem trovão alto
      passaros: 0.7,
      grilos: 1,
      tom: 1.04,
      vento: 0.6,
    },
    povoado: POVOADO_FANTASIAS,
    personagem: { acessorio: 'nenhum', roupaEstilo: 2, roupaCor: 6, calcaCor: 5 },
  };
}
