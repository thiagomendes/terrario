import type { Tema } from '../tipos';
import { CEU_PLANETA, QUADROS_PLANETA } from './ceu';
import { CRIATURAS_PLANETA, MOVIMENTO_PLANETA, VOZES_PLANETA } from './criaturas';
import { EMISSIVOS_PLANETA, PINTORES_PLANETA } from './pintores';
import { TEXTOS_PLANETA } from './textos';

let tema: Tema | null = null;

/**
 * Planeta Vivo: expedição científica num planeta alienígena amigável — céu lilás com
 * dois sóis e um gigante gasoso de anéis, fungos do tamanho de árvores, rocha violeta,
 * cristais de energia e bichos curiosos. Só aparência, nomes e sons mudam.
 */
export function construirPlanetaVivo(): Tema {
  if (tema) return tema;
  tema = {
    id: 'planeta-vivo',
    nome: 'Planeta Vivo',
    lema: 'Explore um planeta de dois sóis, fungos gigantes e cristais de energia',
    convite:
      'Pouse num planeta lilás com dois sóis, fungos do tamanho de árvores e um robô-cão para ser seu amigo.',
    cores: {
      acento: '#8ef6e4',
      fundoTitulo: ['#2a1850', '#0e0a22'],
      lema: '#f2e6ff',
      logo: {
        topo: [214, 255, 246],
        meio: [120, 232, 214],
        base: [176, 108, 240],
        extrusao: [70, 36, 120],
        bruma: [255, 190, 236],
      },
    },
    textos: TEXTOS_PLANETA,
    pintores: PINTORES_PLANETA,
    emissivos: EMISSIVOS_PLANETA,
    quadrosCeu: QUADROS_PLANETA,
    ceu: CEU_PLANETA,
    agua: {
      fundoDia: [0.06, 0.12, 0.48],
      fundoNoite: [0.02, 0.02, 0.1],
      tinta: [0.85, 0.75, 1],
      opacidade: 0.78,
    },
    // névoa rosada dos vales
    bruma: { cor: [1, 0.85, 1], forca: 0.8 },
    particulas: {
      vagalumeNoite: [0.55, 1, 0.95],
      vagalumeDia: [1, 0.7, 0.95],
      chuva: [0.75, 0.8, 1],
      neve: [0.9, 0.88, 1],
      folhas: [0.95, 0.45, 0.75],
      poeira: [0.62, 0.5, 0.72],
    },
    climaVisual: { chuva: 'gotas', neve: true, relampago: true, arcoIris: true },
    criaturas: CRIATURAS_PLANETA,
    movimento: MOVIMENTO_PLANETA,
    vozes: VOZES_PLANETA,
    mundo: {
      arvores: {
        floresta: ['fungo', 'fungo', 'pirulito'],
        campos: ['pirulito', 'fungo'],
        taiga: ['cristal'],
        montanhas: ['cristal', 'fungo'],
        pantano: ['samambaia', 'lanterna'],
      },
      // torre de observação abandonada, com a caixa de amostras no pé
      estrutura: 'torre',
      crateras: 0,
      flora: 1,
    },
    musica: {
      // pads macios em coro (senoide desafinada) e sino em triângulo
      timbre: { onda: 'sine', brilho: 0.85, sustentacao: 1.6, coro: 12, sino: 'triangle' },
      transporte: 0,
      paletas: {
        // fá lídio: sonho de exploração
        dia: {
          acordes: [
            [53, 57, 60, 64],
            [55, 59, 62, 67],
            [50, 57, 60, 64],
            [52, 55, 59, 64],
          ],
          melodia: [72, 74, 76, 79, 81, 83, 84],
          intervalo: 9,
          chanceNota: 0.5,
        },
        // tons inteiros: flutuante, misterioso sem medo
        noite: {
          acordes: [
            [48, 52, 56, 62],
            [50, 54, 58, 64],
            [46, 52, 56, 60],
            [48, 54, 58, 62],
          ],
          melodia: [72, 74, 76, 78, 80, 82],
          intervalo: 12,
          chanceNota: 0.3,
        },
        // ré lídio quente
        deserto: {
          acordes: [
            [50, 54, 57, 61, 64],
            [52, 56, 59, 64],
            [47, 54, 59, 62],
            [49, 56, 61, 64],
          ],
          melodia: [74, 76, 78, 80, 81, 85],
          intervalo: 10,
          chanceNota: 0.5,
        },
        // mi lídio agudo e cristalino
        taiga: {
          acordes: [
            [52, 59, 63, 68],
            [54, 61, 64, 70],
            [47, 54, 63, 66],
            [49, 56, 59, 64],
          ],
          melodia: [88, 90, 92, 95, 97],
          intervalo: 13,
          chanceNota: 0.3,
        },
        pantano: {
          acordes: [
            [46, 50, 54, 60],
            [48, 52, 56, 62],
            [44, 50, 54, 58],
          ],
          melodia: [70, 72, 74, 76, 78, 80],
          intervalo: 10,
          chanceNota: 0.45,
        },
        caverna: {
          acordes: [
            [33, 40, 47],
            [35, 42],
            [31, 38, 45],
            [34, 41],
          ],
          melodia: [64, 66, 68, 71, 73],
          intervalo: 14,
          chanceNota: 0.22,
          gotas: true,
        },
        perigo: {
          acordes: [
            [45, 49, 53, 57],
            [44, 48, 52, 56],
          ],
          melodia: [69, 71, 73, 75],
          intervalo: 6,
          chanceNota: 0.25,
          pulso: [33, 33, 37, 33, 35, 33],
        },
      },
    },
    materiais: {
      terra: { tom: 1.15 },
      pedra: { tom: 0.85 },
      areia: { tom: 1.2 },
      // talo de fungo: esponjoso, mais fofo que madeira
      madeira: { tom: 0.75, base: 'folhagem' },
      folhagem: { tom: 1.25 },
      cristal: { tom: 1.3 },
    },
    // chilreios alienígenas agudos de dia; quase nenhum grilo à noite
    natureza: { passaros: 1, grilos: 0.2, tom: 1.3 },
    personagem: {
      modelo: 'exploradora',
      acessorio: 'mochila',
      roupaEstilo: 2,
      roupaCor: 9,
      calcaCor: 3,
    },
  };
  return tema;
}
