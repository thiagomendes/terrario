import { CABELOS_LONGOS, MODELOS, SAIAS, type Aparencia } from './aparencia';

export type NomeParte =
  | 'cabeca'
  | 'tronco'
  | 'bracoEsquerdo'
  | 'bracoDireito'
  | 'pernaEsquerda'
  | 'pernaDireita'
  | 'cabelo'
  /** Rabo de cavalo ou coque. */
  | 'penteado'
  /** Saia de vestido ou de blusa e saia. */
  | 'saia'
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
  const feminino = aparencia.corpo === 'feminino';
  // corpo feminino: ombros e braços mais finos
  const larguraTronco = feminino ? Math.min(def.larguraTronco, 0.44) : def.larguraTronco;
  const larguraBraco = feminino ? 0.16 : LARGURA_BRACO;
  const topoTronco = pernas + alturaTronco;
  const larguraPerna = larguraTronco / 2;
  const xBraco = larguraTronco / 2 + larguraBraco / 2;
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
      tamanho: [larguraBraco, centro(alturaTronco), larguraBraco],
      posicao: [-centro(xBraco), centro(pernas + alturaTronco / 2), 0],
      pivo: [-centro(xBraco), centro(topoTronco), 0],
    },
    {
      nome: 'bracoDireito',
      tamanho: [larguraBraco, centro(alturaTronco), larguraBraco],
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

  // cabelo: casca sobre a cabeça; nos cortes longos ela desce pelos ombros e costas
  // (a frente tem abertura para o rosto, ver textura)
  const longo = CABELOS_LONGOS[aparencia.cabeloEstilo];
  if (longo !== undefined) {
    const lado = LADO_CABECA + (aparencia.cabeloEstilo === 4 ? 0.1 : 0.06);
    const altura = ALTURA_CABECA + 0.04 + longo;
    partes.push({
      nome: 'cabelo',
      tamanho: [lado, centro(altura), lado],
      posicao: [0, centro(topoTronco + ALTURA_CABECA + 0.04 - altura / 2), -0.01],
      pivo: [0, centro(topoTronco), 0],
    });
  } else {
    const alturaCabelo = [0.1, 0.16, 0.22, 0.05, 0.2, 0.08, 0.08][aparencia.cabeloEstilo] ?? 0.1;
    const folga = aparencia.cabeloEstilo === 3 ? 0.02 : 0.04;
    partes.push({
      nome: 'cabelo',
      tamanho: [LADO_CABECA + folga, alturaCabelo, LADO_CABECA + folga],
      posicao: [0, centro(topoTronco + ALTURA_CABECA - alturaCabelo / 2), 0],
      pivo: [0, centro(topoTronco), 0],
    });
  }
  if (aparencia.cabeloEstilo === 5) {
    // rabo de cavalo alto, preso atrás da cabeça
    partes.push({
      nome: 'penteado',
      tamanho: [0.12, 0.4, 0.12],
      posicao: [0, centro(topoTronco + ALTURA_CABECA - 0.2), -(LADO_CABECA / 2 + 0.07)],
      pivo: [0, centro(topoTronco), 0],
    });
  } else if (aparencia.cabeloEstilo === 6) {
    // coque no alto da cabeça
    partes.push({
      nome: 'penteado',
      tamanho: [0.18, 0.12, 0.16],
      posicao: [0, centro(topoTronco + ALTURA_CABECA + 0.02), -0.17],
      pivo: [0, centro(topoTronco), 0],
    });
  }

  // saia: dos quadris para baixo, um pouco mais larga que o tronco
  const saia = SAIAS[aparencia.roupaEstilo];
  if (saia !== undefined) {
    const alturaSaia = centro(pernas * saia + 0.06);
    partes.push({
      nome: 'saia',
      tamanho: [larguraTronco + 0.08, alturaSaia, PROFUNDIDADE_TRONCO + 0.1],
      posicao: [0, centro(pernas + 0.06 - alturaSaia / 2), 0],
      pivo: [0, centro(pernas), 0],
    });
  }

  const naCabeca = (tamanho: [number, number, number], y: number, z = 0): Parte => ({
    nome: 'acessorio',
    tamanho,
    posicao: [0, centro(topoTronco + y), z],
    pivo: [0, centro(topoTronco), 0],
  });
  const noCorpo = (tamanho: [number, number, number], y: number, z: number): Parte => ({
    nome: 'acessorio',
    tamanho,
    posicao: [0, centro(y), z],
    pivo: [0, centro(topoTronco), 0],
  });
  switch (aparencia.acessorio) {
    case 'capuz':
      partes.push(
        naCabeca([LADO_CABECA + 0.1, 0.3, LADO_CABECA + 0.1], ALTURA_CABECA - 0.15, -0.02),
      );
      break;
    case 'chapeu':
      // copa e aba (duas caixas)
      partes.push(naCabeca([LADO_CABECA + 0.04, 0.16, LADO_CABECA + 0.04], ALTURA_CABECA + 0.06));
      partes.push(naCabeca([LADO_CABECA + 0.28, 0.04, LADO_CABECA + 0.28], ALTURA_CABECA - 0.01));
      break;
    case 'oculos':
      // na altura dos olhos, um pouco à frente do rosto
      partes.push(naCabeca([LADO_CABECA + 0.03, 0.08, LADO_CABECA + 0.03], ALTURA_CABECA * 0.47));
      break;
    case 'cachecol':
      partes.push(
        noCorpo([larguraTronco - 0.04, 0.1, PROFUNDIDADE_TRONCO + 0.06], topoTronco - 0.03, 0),
      );
      break;
    case 'mochila':
      partes.push(
        noCorpo(
          [larguraTronco - 0.1, alturaTronco * 0.62, 0.16],
          pernas + alturaTronco * 0.55,
          -(PROFUNDIDADE_TRONCO / 2 + 0.08),
        ),
      );
      break;
    case 'capacete':
      // capacete de astronauta: casca maior que a cabeça, visor aberto na frente
      partes.push(
        naCabeca(
          [LADO_CABECA + 0.1, ALTURA_CABECA + 0.08, LADO_CABECA + 0.1],
          ALTURA_CABECA / 2 + 0.02,
        ),
      );
      break;
    case 'chapeu-explorador':
      // copa alta e aba larga
      partes.push(naCabeca([LADO_CABECA + 0.05, 0.18, LADO_CABECA + 0.05], ALTURA_CABECA + 0.07));
      partes.push(naCabeca([LADO_CABECA + 0.34, 0.04, LADO_CABECA + 0.34], ALTURA_CABECA - 0.01));
      break;
    case 'touca-chef':
      partes.push(naCabeca([LADO_CABECA + 0.06, 0.3, LADO_CABECA + 0.06], ALTURA_CABECA + 0.13));
      break;
    case 'coroa-flores':
      partes.push(naCabeca([LADO_CABECA + 0.06, 0.08, LADO_CABECA + 0.06], ALTURA_CABECA - 0.02));
      break;
    case 'avental':
      // na frente do tronco, do peito até um pouco abaixo da cintura
      partes.push(
        noCorpo(
          [larguraTronco - 0.06, alturaTronco * 0.8 + 0.12, 0.03],
          pernas + alturaTronco * 0.4 - 0.06,
          PROFUNDIDADE_TRONCO / 2 + 0.02,
        ),
      );
      break;
    case 'lanterna':
      partes.push({
        nome: 'acessorio',
        tamanho: [0.14, 0.2, 0.14],
        posicao: [-centro(xBraco), centro(pernas + 0.05), 0.2],
        pivo: [-centro(xBraco), centro(topoTronco), 0],
      });
      break;
    default:
      break;
  }
  // capacete fechado: o cabelo fica todo dentro (nada vaza pela casca)
  if (aparencia.acessorio === 'capacete')
    return partes.filter((p) => p.nome !== 'cabelo' && p.nome !== 'penteado');
  return partes;
}
