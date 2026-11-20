import { TILES_EMISSIVOS } from '../../art/atlas';
import { QUADROS_CEU_BASE } from '../../render/atmosfera';
import { textosOriginais } from '../originais';
import type { Tema } from '../tipos';
import { CRIATURAS_BASE } from './criaturas';
import { MUNDO_BASE } from './mundo';
import { MOVIMENTO_BASE, VOZES_BASE } from './vozes';
import { POVOADO_BASE } from './povoado';

let base: Tema | null = null;

/**
 * A base (spec 034): o tema de antes de qualquer ativação e a reserva de quem não registra os
 * temas (scripts, testes, servidor). É um tema completo, mas não se escolhe: não aparece em
 * lugar nenhum da tela. Os valores reproduzem o jogo de antes dos temas (há teste de
 * paridade, `tests/temas/paridade-base.test.ts`): as criaturas, os movimentos e as vozes daqui
 * são a reserva genérica.
 */
export function temaBase(): Tema {
  if (base) return base;
  base = {
    id: 'base',
    nome: 'Base',
    lema: 'Explore, construa e brinque',
    convite: 'Florestas, cavernas e bichos para conhecer.',
    cores: {
      acento: '#ffc46b',
      fundoTitulo: ['#1b1230', '#0c0814'],
      lema: '#efe3ff',
      logo: {
        topo: [255, 243, 196],
        meio: [255, 204, 110],
        base: [232, 132, 44],
        extrusao: [122, 58, 18],
        bruma: [214, 190, 255],
      },
    },
    textos: textosOriginais(),
    pintores: {},
    emissivos: [...TILES_EMISSIVOS],
    quadrosCeu: QUADROS_CEU_BASE,
    ceu: {
      estrelasDia: 0,
      corEstrelas: [0.85, 0.88, 1],
      densidadeEstrelas: 0.5,
      corSol: [1, 1, 1],
      tamanhoSol: 1,
      haloSol: 1,
      corLua: [1, 1, 1],
      tamanhoLua: 1,
      corNuvens: [1, 1, 1],
      fatorNuvens: 1,
      faixaCrepusculo: 1,
    },
    agua: {
      fundoDia: [0.03, 0.22, 0.45],
      fundoNoite: [0.015, 0.04, 0.09],
      tinta: [0.7, 0.88, 1.0],
      opacidade: 0.74,
    },
    bruma: { cor: [1, 1, 1], forca: 1 },
    particulas: {
      vagalumeNoite: [0.75, 1, 0.45],
      vagalumeDia: [1, 0.85, 0.5],
      chuva: [0.78, 0.84, 0.95],
      neve: [1, 1, 1],
      folhas: [0.32, 0.58, 0.22],
      poeira: [150 / 255, 140 / 255, 130 / 255],
    },
    climaVisual: { chuva: 'gotas', neve: true, relampago: true, arcoIris: true },
    criaturas: CRIATURAS_BASE,
    movimento: MOVIMENTO_BASE,
    vozes: VOZES_BASE,
    mundo: MUNDO_BASE,
    musica: {
      timbre: { onda: 'triangle', brilho: 1, sustentacao: 1, coro: 0 },
      transporte: 0,
    },
    materiais: {},
    natureza: { passaros: 1, grilos: 1, tom: 1 },
    povoado: POVOADO_BASE,
    personagem: {},
  };
  return base;
}
