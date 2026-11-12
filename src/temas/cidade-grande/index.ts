import type { Tema } from '../tipos';
import { EXCLUSIVOS_CIDADE } from '../../jogo/exclusivos';
import { CEU_CIDADE, QUADROS_CIDADE } from './ceu';
import { CRIATURAS_CIDADE, MOVIMENTO_CIDADE } from './criaturas';
import { PINTORES_CIDADE } from './pintores';
import { POVOADO_CIDADE } from './povoado';
import { TEXTOS_CIDADE } from './textos';
import { VOZES_CIDADE } from './vozes';

/**
 * Cidade Grande (spec 014): ruas em grade, avenidas, um parque com lago no meio, prédios de 2
 * a 6 andares de visitar e o canteiro de obras. Céu de cidade (horizonte leitoso de dia e
 * quentinho de noite, poucas estrelas), lago azul de parque, os bichos da cidade (cachorro
 * grande, pombo, carpa, guaxinim manso e o gato de rua, domado com peixe), a padeira, o
 * mecânico e o pedreiro, e o jazz leve de piano e baixo (gravado: o pacote da cidade).
 */
export function construirCidadeGrande(): Tema {
  return {
    id: 'cidade-grande',
    nome: 'Cidade Grande',
    lema: 'Ajude o pedreiro a construir a cidade',
    convite: 'Prédios de visitar, ruas, um parque com lago e um canteiro de obras!',
    cores: {
      acento: '#ffcf3a',
      fundoTitulo: ['#1f2a3a', '#121a26'],
      lema: '#fff4d6',
      logo: {
        topo: [255, 244, 214],
        meio: [255, 207, 58],
        base: [216, 67, 58],
        extrusao: [58, 46, 40],
        bruma: [214, 226, 240],
      },
    },
    textos: TEXTOS_CIDADE,
    pintores: PINTORES_CIDADE,
    emissivos: [
      'cristal',
      'cogumelo',
      'min_luzita',
      'tocha',
      'lanterna',
      'bloco_luzita',
      'fornalha_acesa',
      'abobora_rosto',
      'janela_acesa',
      'poste',
    ],
    quadrosCeu: QUADROS_CIDADE,
    ceu: CEU_CIDADE,
    // lago de parque: azul limpinho, um pouco mais verde que o açude
    agua: {
      fundoDia: [0.12, 0.44, 0.7],
      fundoNoite: [0.02, 0.05, 0.12],
      tinta: [0.8, 0.92, 1],
      opacidade: 0.78,
    },
    // a bruma dos vales, fraquinha e azulada (o ar da cidade)
    bruma: { cor: [0.92, 0.95, 1], forca: 0.45 },
    particulas: {
      // vaga-lumes de jardim à noite, pólen de ipê de dia
      vagalumeNoite: [1, 0.92, 0.5],
      vagalumeDia: [1, 0.86, 0.6],
      chuva: [0.78, 0.86, 1],
      neve: [1, 1, 1],
      folhas: [1, 0.78, 0.3],
      poeira: [0.7, 0.66, 0.62],
    },
    climaVisual: { chuva: 'gotas', neve: false, relampago: true, arcoIris: true },
    criaturas: CRIATURAS_CIDADE,
    movimento: MOVIMENTO_CIDADE,
    vozes: VOZES_CIDADE,
    mundo: {
      arvores: {
        // ipês e sibipirunas redondinhas; bétulas e pinheiros nos morros
        floresta: ['pirulito', 'carvalho', 'betula'],
        campos: ['pirulito', 'carvalho'],
        taiga: ['pinho', 'pinho', 'betula'],
        montanhas: ['pinho', 'carvalho'],
        pantano: ['lanterna'],
      },
      // a roda-gigante de um parque de diversões abandonado, fora da cidade
      estrutura: 'roda-gigante',
      crateras: 0,
      flora: 1,
      // a Cidade Grande (spec 014): uma cidade por mundo, em volta do nascimento
      povoado: {
        casa: 'duas-aguas',
        oficina: 'duas-aguas',
        deposito: 'duas-aguas',
        marco: 'fonte',
        planta: 'cidade',
      },
      // o guaxinim da noite é manso (como a coruja do Rancho)
      noite: 'mansa',
      // o gato de rua é domado com peixe (decisão do dono, 12 nov 2026)
      domar: 'peixe',
    },
    // jazz leve (a reserva sintetizada; a de verdade é o pacote gravado da cidade)
    musica: {
      timbre: { onda: 'triangle', brilho: 0.85, sustentacao: 0.8, coro: 4, sino: 'sine' },
      transporte: 0,
      paletas: {
        dia: {
          // Fá com sétima, Ré menor, Sol menor e Dó com sétima
          acordes: [
            [41, 57, 60, 64],
            [38, 53, 57, 60],
            [43, 53, 58, 62],
            [36, 52, 58, 62],
          ],
          melodia: [65, 69, 72, 74, 76, 77, 81],
          intervalo: 6,
          chanceNota: 0.55,
          pulso: [41, 0, 45, 0, 48, 0, 45, 0],
          ganhoPulso: 0.35,
        },
        noite: {
          acordes: [
            [41, 57, 60, 64],
            [46, 53, 57, 62],
            [45, 55, 60, 64],
            [38, 53, 57, 60],
          ],
          melodia: [69, 72, 74, 76, 79],
          intervalo: 10,
          chanceNota: 0.32,
        },
      },
    },
    materiais: {
      madeira: { base: 'madeira', tom: 0.98 },
      terra: { base: 'terra', tom: 0.95 },
      folhagem: { base: 'folhagem', tom: 1.05 },
    },
    natureza: {
      // passarinho de praça de dia, grilo de jardim à noite e a buzininha de brinquedo ao
      // longe (T09: `cidade`), tudo curto e nunca em laço
      passaros: 0.9,
      grilos: 0.8,
      tom: 1.05,
      vento: 0.7,
      cidade: { buzininha: 1 },
    },
    povoado: POVOADO_CIDADE,
    personagem: { acessorio: 'nenhum', roupaEstilo: 2, roupaCor: 3, calcaCor: 5 },
    // a cidade guia primeiro o canteiro (a criança nasce ao lado dele)
    primeiroCapitulo: undefined,
    exclusivos: EXCLUSIVOS_CIDADE,
  };
}
