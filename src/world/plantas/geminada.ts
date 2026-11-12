/**
 * Casa geminada de pedra marrom (spec 014): 2 a 4 andares num lote de 8 × 9, com a
 * escadinha de pedra na frente da porta, a escada de incêndio de grade na fachada (sobe da
 * calçada ao terraço) e, se sorteada, a caixa d'água de madeira no telhado.
 *
 * O térreo fica dois degraus acima da calçada (a escadinha), em cima de uma fundação
 * maciça. Cada andar tem 4 blocos (o piso e 3 livres) e um apartamento de 5 × 5 por dentro
 * com cama, mesa (com lampião) e baú; a escada de dentro ocupa a coluna do lado (um lance
 * por andar, sempre subindo para o fundo, com a volta pelo apartamento). O piso de cima
 * é aberto sobre os três primeiros degraus: quem sobe meio bloco não bate a cabeça.
 */
import {
  CORES_PORTA,
  acenderJanelas,
  espelhar,
  limpar,
  pintarCamadas,
  plantaVazia,
  por,
  type Camada,
  type Legenda,
  type ParametrosPredio,
  type Planta,
} from './formato';
import { BLOCOS_PREDIO, legendaComum } from './paleta';
import { Bloco } from '../blocks';

export const LARGURA_GEMINADA = 8;
export const PROFUNDIDADE_GEMINADA = 9;

/** Fundação (y = 0): a escadinha começa na calçada, a escada de incêndio também. */
const FUNDACAO: Camada[] = [
  [
    ' e  }   ',
    ' M      ',
    'MMMMMMMM',
    'MMMMMMMM',
    'MMMMMMMM',
    'MMMMMMMM',
    'MMMMMMMM',
    'MMMMMMMM',
    'MMMMMMMM',
  ],
];

/** Térreo: porta no alto da escadinha; cama, baú e mesa no fundo. */
const TERREO: Camada[] = [
  [
    '     }  ',
    ' e      ',
    'MMMMMMMM',
    'MTTTTTTM',
    'MTTTTTTM',
    'MTTTTTTM',
    'MTTTTTTM',
    'MTTTTTTM',
    'MMMMMMMM',
  ],
  [
    '      } ',
    '        ',
    'MPMJJMJM',
    'M......M',
    'M.....EM',
    'M......M',
    'M......M',
    'MBKX...M',
    'MMJJJJMM',
  ],
  [
    '       }',
    '        ',
    'MPMJJMJM',
    'M......M',
    'M......M',
    'M.....EM',
    'M......M',
    'M..i...M',
    'MMJJJJMM',
  ],
  [
    '   _}   ',
    '   _____',
    'MpMMMMMM',
    'M......M',
    'M......M',
    'M......M',
    'M.....EM',
    'M......M',
    'MMMMMMMM',
  ],
];

/** Andar-tipo (repete do 1º andar até o último): piso furado em cima do lance de baixo. */
const ANDAR: Camada[] = [
  [
    '     }  ',
    '        ',
    'MMMMMMMM',
    'MTTTTTTM',
    'MTTTTT.M',
    'MTTTTT.M',
    'MTTTTT.M',
    'MTTTTTEM',
    'MMMMMMMM',
  ],
  [
    '      } ',
    '        ',
    'MJJMMJJM',
    'MX.....M',
    'M.....EM',
    'M......M',
    'MK.....M',
    'MB.....M',
    'MMJJJJMM',
  ],
  [
    '       }',
    '        ',
    'MJJMMJJM',
    'M......M',
    'M......M',
    'M.....EM',
    'M......M',
    'M......M',
    'MMJJJJMM',
  ],
  [
    '   _}   ',
    '   _____',
    'MMMMMMMM',
    'M......M',
    'M......M',
    'M......M',
    'M.....EM',
    'M......M',
    'MMMMMMMM',
  ],
];

/** Telhado (o terraço): laje, mureta da pedra da casa e o vão da escada com grade em volta. */
const TELHADO: Camada[] = [
  [
    '        ',
    'DDDDC   ',
    'CCCCCCCC',
    'CCCCCCCC',
    'CCCCCC.C',
    'CCCCCC.C',
    'CCCCCC.C',
    'CCCCCCEC',
    'CCCCCCCC',
  ],
  [
    '        ',
    'MMMM    ',
    'M      M',
    'M      M',
    'M    #.M',
    'M    #.M',
    'M    #.M',
    'M      M',
    'MMMMMMMM',
  ],
];

/** Legenda da geminada: pedra marrom, cornija de concreto e a cor da moldura da porta. */
export function legendaDaGeminada(corPorta: number): Legenda {
  return {
    ...legendaComum(BLOCOS_PREDIO.pedraMarrom, BLOCOS_PREDIO.concreto),
    p: { b: CORES_PORTA[corPorta & 3] },
  };
}

export function casaGeminada(params: ParametrosPredio): Planta {
  const n = Math.max(2, Math.min(4, params.andares));
  const telhado = 1 + 4 * n;
  const p = plantaVazia('geminada', LARGURA_GEMINADA, PROFUNDIDADE_GEMINADA, telhado + 6, {
    ...params,
    andares: n,
    loja: false,
  });
  const leg = legendaDaGeminada(params.corPorta);
  pintarCamadas(p, 0, FUNDACAO, leg);
  pintarCamadas(p, 1, TERREO, leg);
  for (let k = 1; k < n; k++) pintarCamadas(p, 1 + 4 * k, ANDAR, leg);
  pintarCamadas(p, telhado, TELHADO, leg);
  escadaDeIncendioNoTopo(p, telhado - 1);
  if (params.caixaDagua) caixaDagua(p, 1, 4, telhado + 1);
  for (let k = 0; k < n; k++) {
    p.comodos.push({ andar: k, s0: 1, f0: 3, s1: 5, f1: 7, pes: 2 + 4 * k, cama: [1, 7] });
  }
  p.porta = [1, 2, 2];
  p.terraco = telhado + 1;
  acenderJanelas(p, BLOCOS_PREDIO.janela, BLOCOS_PREDIO.janelaAcesa, (y) =>
    Math.floor((y - 1) / 4),
  );
  return params.espelho ? espelhar(p) : p;
}

/**
 * O último patamar da escada de incêndio (y = `y`, uma abaixo da laje do telhado): em vez de
 * um lance novo pela frente, dois degraus junto da fachada levam ao terraço (a frente do
 * telhado não pode passar por cima do patamar: a cabeça de quem está nele bate).
 */
function escadaDeIncendioNoTopo(p: Planta, y: number): void {
  // o lance da frente que começaria aqui não existe
  limpar(p, 3, 0, y);
  limpar(p, 4, 0, y);
  for (const s of [3, 4, 5]) limpar(p, s, 1, y);
  // do patamar (s = 7) sobe de lado até o terraço
  por(p, 6, 1, y, BLOCOS_PREDIO.escadaGrade, 3);
  por(p, 5, 1, y + 1, BLOCOS_PREDIO.escadaGrade, 3);
}

/**
 * Caixa d'água de madeira (3 × 3): quatro pernas de pau, o barril de tábuas com uma cinta
 * escura e a tampa. `(s0, f0)` é o canto; `y` é a primeira célula acima da laje.
 */
export function caixaDagua(p: Planta, s0: number, f0: number, y: number): void {
  for (const [ds, df] of [
    [0, 0],
    [2, 0],
    [0, 2],
    [2, 2],
  ])
    por(p, s0 + ds, f0 + df, y, Bloco.CERCA);
  for (let ds = 0; ds < 3; ds++)
    for (let df = 0; df < 3; df++) {
      por(p, s0 + ds, f0 + df, y + 1, Bloco.TABUAS);
      por(p, s0 + ds, f0 + df, y + 2, Bloco.TABUAS_PINHO);
      if (ds === 1 && df === 1) por(p, s0 + ds, f0 + df, y + 3, Bloco.LAJE);
    }
}
