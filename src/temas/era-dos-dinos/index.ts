import type { Tema } from '../tipos';
import { QUADROS_CEU_DINOS } from './ceu';
import { CRIATURAS_DINOS, MOVIMENTO_DINOS, VOZES_DINOS } from './criaturas';
import { MUSICA_DINOS } from './musica';
import { PINTORES_DINOS } from './pintores';
import { POVOADO_DINOS } from './povoado';
import { TEXTOS_DINOS } from './textos';

let cache: Tema | null = null;

/**
 * Era dos Dinos: pré-história para pequenos paleontólogos. Samambaias gigantes,
 * araucárias e cicadáceas, basalto e terra vulcânica, fósseis e âmbar nas rochas,
 * vulcões sugeridos pelo horizonte quente e cinzas leves no ar.
 */
export function construirEraDosDinos(): Tema {
  if (cache) return cache;
  cache = {
    id: 'era-dos-dinos',
    nome: 'Era dos Dinos',
    lema: 'Samambaias gigantes, vulcões ao longe e fósseis esperando por você',
    convite:
      'Faça amizade com filhotes de dinossauro, cave fósseis e âmbar e acampe perto dos vulcões.',
    cores: {
      acento: '#ffb15c',
      fundoTitulo: ['#2c1a14', '#120a08'],
      lema: '#ffe6c4',
      logo: {
        topo: [214, 236, 150],
        meio: [255, 176, 72],
        base: [206, 92, 40],
        extrusao: [84, 38, 20],
        bruma: [255, 150, 90],
      },
    },
    textos: TEXTOS_DINOS,
    pintores: PINTORES_DINOS,
    emissivos: [
      'cristal',
      'cogumelo',
      'min_luzita',
      'folhas_lanterna',
      'tocha',
      'lanterna',
      'bloco_luzita',
      'fornalha_acesa',
      'abobora_rosto',
      'rocha_matriz',
    ],
    quadrosCeu: QUADROS_CEU_DINOS,
    ceu: {
      estrelasDia: 0,
      corEstrelas: [1, 0.9, 0.78],
      densidadeEstrelas: 0.6,
      corSol: [1, 0.9, 0.72],
      tamanhoSol: 1.25,
      haloSol: 1.4,
      // a Lua era um pouco mais perto naquele tempo: fica maior no céu
      corLua: [1, 0.9, 0.78],
      tamanhoLua: 1.35,
      corNuvens: [1, 0.9, 0.84],
      fatorNuvens: 1.15,
      faixaCrepusculo: 1.4,
    },
    agua: {
      fundoDia: [0.03, 0.34, 0.4],
      fundoNoite: [0.015, 0.05, 0.07],
      tinta: [0.75, 0.96, 0.86],
      opacidade: 0.72,
    },
    bruma: { cor: [1, 0.9, 0.82], forca: 0.85 },
    particulas: {
      // brasinhas à noite e cinzas leves de dia
      vagalumeNoite: [1, 0.66, 0.3],
      vagalumeDia: [0.82, 0.78, 0.74],
      chuva: [0.76, 0.86, 0.82],
      neve: [0.78, 0.75, 0.72],
      folhas: [0.38, 0.62, 0.26],
      poeira: [0.42, 0.34, 0.3],
    },
    climaVisual: { chuva: 'gotas', neve: true, relampago: true, arcoIris: true },
    criaturas: CRIATURAS_DINOS,
    movimento: MOVIMENTO_DINOS,
    vozes: VOZES_DINOS,
    mundo: {
      arvores: {
        floresta: ['samambaia', 'samambaia', 'araucaria', 'pinho'],
        campos: ['palmeira', 'samambaia'],
        taiga: ['pinho', 'araucaria', 'araucaria'],
        montanhas: ['pinho', 'araucaria'],
        pantano: ['palmeira', 'samambaia'],
      },
      estrutura: 'ninho',
      crateras: 0,
      flora: 1,
      povoado: { casa: 'tenda', oficina: 'tenda', deposito: 'modulo', marco: 'esqueleto' },
    },
    musica: MUSICA_DINOS,
    materiais: {
      terra: { tom: 0.85 },
      pedra: { tom: 0.8 },
      areia: { tom: 0.9 },
      madeira: { tom: 0.88 },
      folhagem: { tom: 0.8 },
      cristal: { tom: 0.85 },
    },
    natureza: { passaros: 0.6, grilos: 1.2, tom: 0.55 },
    povoado: POVOADO_DINOS,
    personagem: {
      modelo: 'exploradora',
      acessorio: 'chapeu-explorador',
      roupaEstilo: 4,
      roupaCor: 6,
      calcaCor: 4,
    },
  };
  return cache;
}
