import { MODELOS, type Aparencia } from './aparencia';

export type NomeParte =
  | 'cabeca'
  | 'tronco'
  | 'bracoEsquerdo'
  | 'bracoDireito'
  | 'pernaEsquerda'
  | 'pernaDireita'
  | 'cabelo'
  | 'acessorio';

export interface Parte {
  nome: NomeParte;
  /** Largura, altura e profundidade da caixa, em blocos. */
  tamanho: [number, number, number];
  /** Centro da caixa, com origem nos pés e x centrado no corpo. */
  posicao: [number, number, number];
  /** Ponto de rotação (ombro, quadril, pescoço), no mesmo espaço da posição. */
  pivo: [number, number, number];
}

export const ALTURA_CORPO = 1.8;
export const ALTURA_CABECA = 0.4;
export const LADO_CABECA = 0.4;
export const LARGURA_BRACO = 0.2;
export const PROFUNDIDADE_TRONCO = 0.25;

const centro = (valor: number): number => Math.round(valor * 1e6) / 1e6;

export function montarPartes(aparencia: Aparencia): Parte[] {
  const def = MODELOS[aparencia.modelo];
  const pernas = def.comprimentoPernas;
  const alturaTronco = ALTURA_CORPO - ALTURA_CABECA - pernas;
  const larguraTronco = def.larguraTronco;
  const topoTronco = pernas + alturaTronco;
  const larguraPerna = larguraTronco / 2;
  const xBraco = larguraTronco / 2 + LARGURA_BRACO / 2;
  const xPerna = larguraPerna / 2;
  const yCabeca = topoTronco + ALTURA_CABECA / 2;

  const partes: Parte[] = [
    {
      nome: 'cabeca',
      tamanho: [LADO_CABECA, ALTURA_CABECA, LADO_CABECA],
      posicao: [0, centro(yCabeca), 0],
      pivo: [0, centro(topoTronco), 0],
    },
    {
      nome: 'tronco',
      tamanho: [larguraTronco, centro(alturaTronco), PROFUNDIDADE_TRONCO],
      posicao: [0, centro(pernas + alturaTronco / 2), 0],
      pivo: [0, centro(pernas), 0],
    },
    {
      nome: 'bracoEsquerdo',
      tamanho: [LARGURA_BRACO, centro(alturaTronco), LARGURA_BRACO],
      posicao: [-centro(xBraco), centro(pernas + alturaTronco / 2), 0],
      pivo: [-centro(xBraco), centro(topoTronco), 0],
    },
    {
      nome: 'bracoDireito',
      tamanho: [LARGURA_BRACO, centro(alturaTronco), LARGURA_BRACO],
      posicao: [centro(xBraco), centro(pernas + alturaTronco / 2), 0],
      pivo: [centro(xBraco), centro(topoTronco), 0],
    },
    {
      nome: 'pernaEsquerda',
      tamanho: [centro(larguraPerna), pernas, LARGURA_BRACO],
      posicao: [-centro(xPerna), centro(pernas / 2), 0],
      pivo: [-centro(xPerna), pernas, 0],
    },
    {
      nome: 'pernaDireita',
      tamanho: [centro(larguraPerna), pernas, LARGURA_BRACO],
      posicao: [centro(xPerna), centro(pernas / 2), 0],
      pivo: [centro(xPerna), pernas, 0],
    },
  ];

  const alturaCabelo = [0.1, 0.16, 0.22][aparencia.cabeloEstilo] ?? 0.1;
  partes.push({
    nome: 'cabelo',
    tamanho: [LADO_CABECA + 0.04, alturaCabelo, LADO_CABECA + 0.04],
    posicao: [0, centro(topoTronco + ALTURA_CABECA - alturaCabelo / 2), 0],
    pivo: [0, centro(topoTronco), 0],
  });

  if (aparencia.acessorio === 'capuz') {
    partes.push({
      nome: 'acessorio',
      tamanho: [LADO_CABECA + 0.1, 0.3, LADO_CABECA + 0.1],
      posicao: [0, centro(topoTronco + ALTURA_CABECA - 0.15), -0.02],
      pivo: [0, centro(topoTronco), 0],
    });
  } else if (aparencia.acessorio === 'lanterna') {
    partes.push({
      nome: 'acessorio',
      tamanho: [0.14, 0.2, 0.14],
      posicao: [-centro(xBraco), centro(pernas + 0.05), 0.2],
      pivo: [-centro(xBraco), centro(topoTronco), 0],
    });
  }
  return partes;
}
