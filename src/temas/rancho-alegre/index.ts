import type { QuadroCeu, Tema } from '../tipos';
import { CRIATURAS_RANCHO, MOVIMENTO_RANCHO } from './criaturas';
import { PINTORES_RANCHO } from './pintores';
import { POVOADO_RANCHO } from './povoado';
import { TEXTOS_RANCHO } from './textos';
import { VOZES_RANCHO } from './vozes';

/** Céu de interior: azul limpo de dia, amanhecer dourado e noite azul-marinho estrelada. */
const NOITE: Omit<QuadroCeu, 'h'> = {
  zen: [0.02, 0.03, 0.09],
  meio: [0.05, 0.07, 0.17],
  hor: [0.1, 0.13, 0.26],
  luz: [0.6, 0.7, 1],
  il: 0.24,
  ceu: [0.3, 0.36, 0.6],
  chao: [0.06, 0.06, 0.08],
  ic: 0.2,
  amb: [0.07, 0.08, 0.14],
  dens: 0.01,
};
const QUADROS_RANCHO: QuadroCeu[] = [
  { h: 0, ...NOITE },
  {
    h: 0.21,
    zen: [0.04, 0.05, 0.13],
    meio: [0.12, 0.11, 0.24],
    hor: [0.42, 0.26, 0.24],
    luz: [0.62, 0.66, 0.95],
    il: 0.26,
    ceu: [0.34, 0.34, 0.54],
    chao: [0.08, 0.07, 0.08],
    ic: 0.24,
    amb: [0.08, 0.08, 0.13],
    dens: 0.01,
  },
  {
    // amanhecer dourado (a hora do galo)
    h: 0.26,
    zen: [0.3, 0.46, 0.74],
    meio: [0.84, 0.72, 0.6],
    hor: [1, 0.74, 0.36],
    luz: [1, 0.76, 0.42],
    il: 1,
    ceu: [0.74, 0.7, 0.66],
    chao: [0.26, 0.2, 0.12],
    ic: 0.44,
    amb: [0.18, 0.15, 0.12],
    dens: 0.0085,
  },
  {
    h: 0.32,
    zen: [0.3, 0.54, 0.88],
    meio: [0.52, 0.74, 0.95],
    hor: [0.92, 0.9, 0.78],
    luz: [1, 0.92, 0.74],
    il: 1.7,
    ceu: [0.62, 0.76, 0.95],
    chao: [0.3, 0.3, 0.2],
    ic: 0.5,
    amb: [0.2, 0.22, 0.24],
    dens: 0.006,
  },
  {
    h: 0.5,
    zen: [0.26, 0.52, 0.92],
    meio: [0.5, 0.74, 0.97],
    hor: [0.78, 0.9, 1],
    luz: [1, 0.98, 0.9],
    il: 2.05,
    ceu: [0.66, 0.82, 0.98],
    chao: [0.34, 0.34, 0.24],
    ic: 0.55,
    amb: [0.22, 0.24, 0.26],
    dens: 0.005,
  },
  {
    // tarde de cigarra, sol cor de mel
    h: 0.68,
    zen: [0.28, 0.5, 0.86],
    meio: [0.58, 0.72, 0.9],
    hor: [1, 0.84, 0.6],
    luz: [1, 0.86, 0.6],
    il: 1.7,
    ceu: [0.64, 0.72, 0.88],
    chao: [0.32, 0.28, 0.18],
    ic: 0.5,
    amb: [0.2, 0.2, 0.22],
    dens: 0.0065,
  },
  {
    h: 0.74,
    zen: [0.22, 0.26, 0.52],
    meio: [0.78, 0.5, 0.5],
    hor: [1, 0.56, 0.28],
    luz: [1, 0.6, 0.3],
    il: 0.95,
    ceu: [0.62, 0.52, 0.62],
    chao: [0.24, 0.15, 0.1],
    ic: 0.42,
    amb: [0.15, 0.11, 0.12],
    dens: 0.0085,
  },
  {
    h: 0.79,
    zen: [0.04, 0.05, 0.13],
    meio: [0.1, 0.1, 0.22],
    hor: [0.3, 0.18, 0.26],
    luz: [0.6, 0.68, 0.98],
    il: 0.26,
    ceu: [0.32, 0.34, 0.56],
    chao: [0.07, 0.07, 0.08],
    ic: 0.24,
    amb: [0.08, 0.08, 0.13],
    dens: 0.01,
  },
  { h: 1, ...NOITE },
];

/**
 * Rancho Alegre: um sítio do interior. Pasto verdinho, terra vermelha, celeiro, silo,
 * lavoura em sulcos, açude com tilápias, vaca, galinha e cachorro de brinquedo, uma coruja
 * curiosa à noite, viola caipira com sanfona e os sons do campo (galo, mugido, cigarra e sapo).
 */
export function construirRanchoAlegre(): Tema {
  return {
    id: 'rancho-alegre',
    nome: 'Rancho Alegre',
    lema: 'Plante, colha e cuide dos bichos do sítio',
    convite: 'Vaca, galinha, cachorro, lavoura de milho e um moinho de vento girando!',
    cores: {
      acento: '#ffc93a',
      fundoTitulo: ['#3a2414', '#1e140c'],
      lema: '#fff2d0',
      logo: {
        topo: [255, 246, 214],
        meio: [255, 201, 58],
        base: [217, 72, 59],
        extrusao: [110, 44, 24],
        bruma: [255, 226, 160],
      },
    },
    textos: TEXTOS_RANCHO,
    pintores: PINTORES_RANCHO,
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
    quadrosCeu: QUADROS_RANCHO,
    ceu: {
      estrelasDia: 0,
      corEstrelas: [1, 0.96, 0.86],
      densidadeEstrelas: 0.8,
      corSol: [1, 0.94, 0.78],
      tamanhoSol: 1.15,
      haloSol: 1.2,
      corLua: [1, 0.97, 0.9],
      tamanhoLua: 1.15,
      corNuvens: [1, 1, 1],
      fatorNuvens: 0.85,
      faixaCrepusculo: 1.3,
      corCrepusculo: [1, 0.66, 0.24],
    },
    // açude azul de brinquedo, limpinho
    agua: {
      fundoDia: [0.14, 0.46, 0.78],
      fundoNoite: [0.02, 0.05, 0.12],
      tinta: [0.78, 0.92, 1],
      opacidade: 0.78,
    },
    bruma: { cor: [1, 0.95, 0.85], forca: 0.6 },
    particulas: {
      // vaga-lumes amarelo-esverdeados à noite, pólen dourado de dia
      vagalumeNoite: [0.9, 1, 0.4],
      vagalumeDia: [1, 0.9, 0.55],
      chuva: [0.76, 0.86, 1],
      neve: [1, 1, 1],
      folhas: [0.95, 0.78, 0.2],
      poeira: [0.72, 0.5, 0.34],
    },
    climaVisual: { chuva: 'gotas', neve: false, relampago: true, arcoIris: true },
    criaturas: CRIATURAS_RANCHO,
    movimento: MOVIMENTO_RANCHO,
    vozes: VOZES_RANCHO,
    mundo: {
      arvores: {
        // ipês e pomar redondinho perto das casas, eucaliptos na mata
        floresta: ['carvalho', 'pirulito', 'betula'],
        campos: ['pirulito', 'carvalho'],
        taiga: ['araucaria', 'araucaria', 'pinho'],
        montanhas: ['araucaria', 'carvalho'],
        pantano: ['lanterna'],
      },
      // TODO(013, após a junção): 'espantalho' (a estrutura rara do sítio)
      estrutura: 'casinha',
      crateras: 0,
      flora: 1,
      // TODO(013, após a junção): planta: 'sitio' e marco: 'moinho'
      // casa da fazenda, oficina de telhado de duas águas e o silo redondo, em volta do poço
      povoado: { casa: 'duas-aguas', oficina: 'duas-aguas', deposito: 'redonda', marco: 'poco' },
    },
    // viola caipira (sino de corda dedilhada) e sanfona (acordes de palheta com o "musette")
    musica: {
      timbre: { onda: 'sawtooth', brilho: 0.75, sustentacao: 0.7, coro: 7, sino: 'triangle' },
      transporte: 0,
      paletas: {
        dia: {
          acordes: [
            [43, 55, 59, 62],
            [48, 55, 60, 64],
            [50, 57, 62, 66],
            [43, 55, 59, 62],
          ],
          // terças paralelas de moda de viola em sol maior
          melodia: [67, 71, 69, 72, 71, 74, 76, 79],
          intervalo: 6,
          chanceNota: 0.6,
          pulso: [43, 0, 50, 0, 43, 0, 50, 0],
          ganhoPulso: 0.45,
        },
        noite: {
          acordes: [
            [40, 52, 55, 59],
            [36, 48, 55, 60],
            [43, 50, 55, 59],
            [38, 50, 54, 57],
          ],
          melodia: [64, 67, 69, 71, 74, 76],
          intervalo: 10,
          chanceNota: 0.35,
        },
        deserto: {
          acordes: [
            [45, 52, 57, 61],
            [50, 57, 62, 66],
            [52, 59, 64, 68],
            [45, 52, 57, 61],
          ],
          melodia: [69, 71, 73, 76, 78, 81],
          intervalo: 7,
          chanceNota: 0.5,
        },
        taiga: {
          acordes: [
            [38, 50, 54, 57],
            [43, 50, 55, 59],
            [40, 52, 55, 59],
            [36, 48, 55, 60],
          ],
          melodia: [74, 76, 78, 81, 83, 86],
          intervalo: 11,
          chanceNota: 0.35,
        },
        pantano: {
          acordes: [
            [40, 52, 55, 59],
            [45, 52, 57, 60],
            [43, 50, 55, 59],
            [38, 50, 53, 57],
          ],
          melodia: [64, 67, 69, 72, 74],
          intervalo: 9,
          chanceNota: 0.4,
        },
        caverna: {
          acordes: [
            [31, 38],
            [36, 43],
            [33, 40],
            [38, 45],
          ],
          melodia: [62, 64, 67, 69, 71],
          intervalo: 13,
          chanceNota: 0.25,
          gotas: true,
        },
        perigo: {
          acordes: [
            [40, 47, 52, 55],
            [39, 46, 51, 54],
          ],
          melodia: [64, 66, 67, 71],
          intervalo: 6,
          chanceNota: 0.3,
          pulso: [28, 28, 35, 28, 31, 28],
        },
      },
    },
    // madeira de tábua, pedra de morro, terra fofa e capim
    materiais: {
      madeira: { base: 'madeira', tom: 0.95 },
      terra: { base: 'terra', tom: 0.95 },
      folhagem: { base: 'folhagem', tom: 1.05 },
    },
    natureza: {
      passaros: 1.1,
      grilos: 1,
      tom: 1,
      roca: { galo: 1, mugido: 1, cigarra: 1, sapo: 1 },
    },
    povoado: POVOADO_RANCHO,
    personagem: { acessorio: 'chapeu-palha', roupaEstilo: 4, roupaCor: 10, calcaCor: 5 },
  };
}
