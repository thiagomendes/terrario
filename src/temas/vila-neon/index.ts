import type { Tema } from '../tipos';
import { EXCLUSIVOS_VILA } from '../../jogo/exclusivos';
import { CEU_VILA, QUADROS_VILA } from './ceu';
import { CRIATURAS_VILA, MOVIMENTO_VILA } from './criaturas';
import { MASCARAS_VILA, PINTORES_VILA } from './pintores';
import { POVOADO_VILA } from './povoado';
import { TEXTOS_VILA } from './textos';
import { VOZES_VILA } from './vozes';

/**
 * Vila Neon (spec 026): o bairro dos anos 80, de brinquedo. A rua com a banca, a locadora e a
 * lanchonete, a pracinha onde a criança nasce, o rinque com os patins, o fliperama e o
 * Festival Trovão com o palco do show. Céu de entardecer magenta e noite roxa em que o chão
 * escurece de verdade (a luz vem do palco, do neon e das janelas), a lhama de franja e o
 * ouricinho do moicano, a roadie, o guitarrista e a moça do lanche, e o synth-pop dos anos 80.
 * Mais metal que pop: grafite, cromo, vermelho e azul-elétrico, com amarelo nas luzes.
 */
export function construirVilaNeon(): Tema {
  return {
    id: 'vila-neon',
    nome: 'Vila Neon',
    lema: 'O bairro anos 80 com o show do Festival Trovão',
    convite: 'Um bairro com rinque de patins, fliperama e um show de rock no palco!',
    cores: {
      acento: '#ffe14a',
      fundoTitulo: ['#2e2d36', '#1c1b22'],
      lema: '#d4d8e2',
      logo: {
        topo: [255, 225, 74],
        meio: [232, 48, 42],
        base: [47, 140, 255],
        extrusao: [46, 45, 54],
        bruma: [212, 216, 226],
      },
    },
    textos: TEXTOS_VILA,
    pintores: PINTORES_VILA,
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
      // os neons do bairro (a pista só nos quadrados rosa: `mascarasBrilho`)
      'pista_neon',
      'letreiro_neon',
      'faixa_neon',
    ],
    mascarasBrilho: MASCARAS_VILA,
    quadrosCeu: QUADROS_VILA,
    ceu: CEU_VILA,
    // o lago da pracinha: azul limpinho
    agua: {
      fundoDia: [0.1, 0.42, 0.74],
      fundoNoite: [0.04, 0.03, 0.12],
      tinta: [0.82, 0.88, 1],
      opacidade: 0.78,
    },
    // a bruma dos vales, fraquinha e lilás (o roxo do anoitecer)
    bruma: { cor: [0.96, 0.9, 1], forca: 0.4 },
    particulas: {
      // vaga-lumes de quintal à noite, pólen de dia
      vagalumeNoite: [1, 0.9, 0.5],
      vagalumeDia: [1, 0.88, 0.62],
      chuva: [0.8, 0.84, 1],
      neve: [1, 1, 1],
      folhas: [1, 0.74, 0.3],
      poeira: [0.72, 0.66, 0.7],
    },
    // o arco-íris do céu continua (a regra do dono é só para roupa e objeto)
    climaVisual: { chuva: 'gotas', neve: false, relampago: true, arcoIris: true },
    criaturas: CRIATURAS_VILA,
    movimento: MOVIMENTO_VILA,
    vozes: VOZES_VILA,
    mundo: {
      arvores: {
        // as árvores do gerador do jogo (nunca a pirulito redonda: identidade visual)
        floresta: ['carvalho', 'betula'],
        campos: ['carvalho', 'betula'],
        taiga: ['pinho', 'pinho', 'betula'],
        montanhas: ['pinho', 'carvalho'],
        pantano: ['carvalho'],
      },
      // a torre de vigia longe do bairro (a roda-gigante é do parque da parte 2)
      estrutura: 'torre',
      crateras: 0,
      flora: 1,
      // a Vila Neon: um bairro por mundo, em volta do nascimento (`src/world/vilaNeon.ts`)
      povoado: {
        casa: 'duas-aguas',
        oficina: 'duas-aguas',
        deposito: 'duas-aguas',
        marco: 'fonte',
        planta: 'bairro',
      },
      // o ouricinho da noite é manso: faz "tsc-tsc", enrola e rola para longe
      noite: 'mansa',
    },
    // synth-pop dos anos 80 (a reserva sintetizada, até a trilha gravada do bairro chegar)
    musica: {
      timbre: { onda: 'sawtooth', brilho: 0.8, sustentacao: 0.6, coro: 9, sino: 'square' },
      transporte: 0,
      paletas: {
        dia: {
          // Dó, Sol, Lá menor e Fá: a volta do synth-pop
          acordes: [
            [36, 52, 55, 60],
            [43, 50, 55, 59],
            [45, 52, 57, 60],
            [41, 53, 57, 60],
          ],
          melodia: [72, 74, 76, 79, 81, 84],
          intervalo: 5,
          chanceNota: 0.6,
          pulso: [36, 0, 36, 0, 43, 0, 36, 43],
          ganhoPulso: 0.45,
        },
        noite: {
          acordes: [
            [45, 52, 57, 60],
            [41, 53, 57, 60],
            [36, 52, 55, 60],
            [43, 50, 55, 59],
          ],
          melodia: [69, 72, 74, 76, 79],
          intervalo: 9,
          chanceNota: 0.32,
        },
      },
    },
    materiais: {
      madeira: { base: 'madeira', tom: 1.02 },
      terra: { base: 'terra', tom: 0.97 },
      folhagem: { base: 'folhagem', tom: 1.04 },
    },
    natureza: {
      // passarinho de quintal de dia e grilo à noite, curtos e nunca em laço; sem buzininha
      passaros: 0.85,
      grilos: 0.85,
      tom: 1.03,
      vento: 0.7,
    },
    povoado: POVOADO_VILA,
    personagem: { acessorio: 'nenhum', roupaEstilo: 2, roupaCor: 1, calcaCor: 5 },
    exclusivos: EXCLUSIVOS_VILA,
  };
}
