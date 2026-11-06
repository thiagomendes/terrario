import type { Tema } from '../tipos';
import { QUADROS_MATA } from './ceu';
import { CRIATURAS_MATA } from './criaturas';
import { PALETAS_MATA, TIMBRE_MATA } from './musica';
import { EMISSIVOS_MATA, PINTORES_MATA } from './pintores';
import { TEXTOS_MATA } from './textos';
import { MOVIMENTO_MATA, VOZES_MATA } from './vozes';

/**
 * Mata Encantada: mata atlântica com folclore leve. Ipês floridos, jequitibás,
 * araucárias e palmeiras; terra roxa e granito; pedras preciosas brasileiras nas grutas;
 * capivara, sapo-cururu, lambari, o Saci travesso e o lobo-guará amigo.
 */
export function construirMataEncantada(): Tema {
  return {
    id: 'mata-encantada',
    nome: 'Mata Encantada',
    lema: 'Explore a mata, conheça os bichos e brinque com o Saci',
    convite: 'Ipês floridos, cachoeiras, pedras preciosas e um Saci que adora pregar peças.',
    cores: {
      acento: '#ffd23f',
      fundoTitulo: ['#123220', '#07160e'],
      lema: '#f2ffe0',
      logo: {
        topo: [255, 240, 150],
        meio: [246, 200, 60],
        base: [60, 150, 70],
        extrusao: [22, 66, 34],
        bruma: [255, 176, 214],
      },
    },
    textos: TEXTOS_MATA,
    pintores: PINTORES_MATA,
    emissivos: [...EMISSIVOS_MATA],
    quadrosCeu: QUADROS_MATA,
    ceu: {
      estrelasDia: 0,
      corEstrelas: [1, 0.96, 0.86],
      densidadeEstrelas: 0.62,
      corSol: [1, 0.95, 0.8],
      tamanhoSol: 1.1,
      haloSol: 1.25,
      corLua: [1, 0.97, 0.88],
      tamanhoLua: 1.15,
      corNuvens: [0.95, 0.98, 0.97],
      fatorNuvens: 1.2,
      faixaCrepusculo: 1.2,
    },
    agua: {
      fundoDia: [0.03, 0.27, 0.42],
      fundoNoite: [0.01, 0.05, 0.08],
      tinta: [0.72, 0.95, 0.92],
      opacidade: 0.72,
    },
    bruma: { cor: [0.9, 1, 0.92], forca: 1.3 },
    particulas: {
      vagalumeNoite: [0.86, 1, 0.3],
      vagalumeDia: [1, 0.62, 0.82],
      chuva: [0.8, 0.9, 0.92],
      neve: [0.92, 0.97, 1],
      folhas: [0.95, 0.76, 0.18],
      poeira: [0.5, 0.26, 0.2],
    },
    climaVisual: { chuva: 'gotas', neve: true, relampago: true, arcoIris: true },
    criaturas: CRIATURAS_MATA,
    movimento: MOVIMENTO_MATA,
    vozes: VOZES_MATA,
    mundo: {
      // pântano sem forma: a figueira de sempre, com raízes/cipós pendurados
      arvores: {
        floresta: ['carvalho', 'carvalho', 'pirulito'],
        campos: ['palmeira'],
        taiga: ['araucaria', 'araucaria', 'pinho'],
        montanhas: ['araucaria', 'pinho'],
      },
      estrutura: 'circulo',
      crateras: 0,
      flora: 1,
    },
    musica: { timbre: TIMBRE_MATA, transporte: 0, paletas: PALETAS_MATA },
    materiais: {
      terra: { tom: 0.9 },
      pedra: { tom: 0.95 },
      areia: { tom: 1.1 },
      madeira: { tom: 0.9 },
      folhagem: { tom: 1.15 },
      cristal: { tom: 1.2 },
    },
    natureza: { passaros: 1.6, grilos: 1.5, tom: 1.05 },
    personagem: { acessorio: 'chapeu-explorador', roupaEstilo: 4, roupaCor: 11, calcaCor: 4 },
  };
}
