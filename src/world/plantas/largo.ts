/**
 * Os prédios largos da cidade (spec 014), num lote de 16 × 9 (dois lotes): a esquina art
 * déco (5 e 6 andares, pedra creme, friso dourado em cada andar, topo em degraus), o prédio
 * alto do centro (6 andares, terraço com caixa d'água e baú) e a escola (2 andares). Os três
 * usam o mesmo andar-tipo, com a pedra e as janelas de cada um.
 *
 * A fachada da frente (f = 1) dá para a rua e a do lado (s = 15) para a avenida: o planejador
 * espelha o prédio quando a avenida fica do outro lado. O térreo é no nível da calçada
 * (`chao = 0`). A escada de dentro sobe pela coluna s = 1 (um lance por andar, para o fundo)
 * até o terraço; o resto do andar é um apartamento (ou a sala de aula) de 13 × 6.
 */
import { Bloco } from '../blocks';
import { caixaDagua } from './geminada';
import { LOJAS } from './tijolo';
import {
  acenderJanelas,
  espelhar,
  pintarCamadas,
  plantaVazia,
  por,
  type Camada,
  type Legenda,
  type ParametrosPredio,
  type Planta,
} from './formato';
import { BLOCOS_PREDIO, legendaComum } from './paleta';

export const LARGURA_LARGO = 16;
export const PROFUNDIDADE_LARGO = 9;

const TERREO: Camada[] = [
  [
    '                ',
    'MMMMMMMMMMMMMMMM',
    'MTTTTTTTTTTTTTTM',
    'MTTTTTTTTTTTTTTM',
    'MTTTTTTTTTTTTTTM',
    'MTTTTTTTTTTTTTTM',
    'MTTTTTTTTTTTTTTM',
    'MTTTTTTTTTTTTTTM',
    'MMMMMMMMMMMMMMMM',
  ],
  [
    '                ',
    'MJJJPJJJJJJJJJJM',
    'M..............J',
    'M..............M',
    'ME.............J',
    'M..............J',
    'M.........UuV..M',
    'M.........K....J',
    'MMMMMMMMMMMMMMMM',
  ],
  [
    '                ',
    'MJJJPJJJJJJJJJJM',
    'M..............J',
    'M..............M',
    'M..............J',
    'ME.............J',
    'M.........i....M',
    'M..............J',
    'MMMMMMMMMMMMMMMM',
  ],
  [
    'tttttttttttttttt',
    'DDDDDDDDDDDDDDDD',
    'M..............D',
    'M..............D',
    'M..............D',
    'M..............D',
    'ME.............D',
    'M..............D',
    'MMMMMMMMMMMMMMMD',
  ],
];

const ANDAR: Camada[] = [
  [
    '                ',
    'DDDDDDDDDDDDDDDD',
    'DTTTTTTTTTTTTTTD',
    'DTTTTTTTTTTTTTTD',
    'D.TTTTTTTTTTTTTD',
    'D.TTTTTTTTTTTTTD',
    'D.TTTTTTTTTTTTTD',
    'DETTTTTTTTTTTTTD',
    'DDDDDDDDDDDDDDDD',
  ],
  [
    '                ',
    'MJJMJJMJJMJJMJJM',
    'M..............J',
    'M..............M',
    'ME.............J',
    'M..............J',
    'M.........K....M',
    'M........qQX...J',
    'MMMMMMMMMMMMMMMM',
  ],
  [
    '                ',
    'MJJMJJMJJMJJMJJM',
    'M..............J',
    'M..............M',
    'M..............J',
    'ME.............J',
    'M..............M',
    'M..............J',
    'MMMMMMMMMMMMMMMM',
  ],
  [
    '                ',
    'MJJMJJMJJMJJMJJM',
    'M..............J',
    'M..............M',
    'M..............J',
    'M..............J',
    'ME.............M',
    'M..............J',
    'MMMMMMMMMMMMMMMM',
  ],
];

const TELHADO: Camada[] = [
  [
    'DDDDDDDDDDDDDDDD',
    'CCCCCCCCCCCCCCCC',
    'CCCCCCCCCCCCCCCC',
    'CCCCCCCCCCCCCCCC',
    'C.CCCCCCCCCCCCCC',
    'C.CCCCCCCCCCCCCC',
    'C.CCCCCCCCCCCCCC',
    'CECCCCCCCCCCCCCC',
    'CCCCCCCCCCCCCCCC',
  ],
  [
    'MMMMMMMMMMMMMMMM',
    'M              M',
    'M              M',
    'M              M',
    'M.#            M',
    'M.#            M',
    'M.#            M',
    'M              M',
    'MMMMMMMMMMMMMMMM',
  ],
];

export type ModeloLargo = 'deco' | 'alto' | 'escola';

/** Pedra de cada prédio: parede (`M`) e o friso de cada andar (`D`). */
const PEDRAS: Record<ModeloLargo, [number, number]> = {
  deco: [BLOCOS_PREDIO.pedraCreme, BLOCOS_PREDIO.friso],
  alto: [BLOCOS_PREDIO.concreto, BLOCOS_PREDIO.pedraCreme],
  escola: [Bloco.TIJOLOS, BLOCOS_PREDIO.pedraCreme],
};

/** A escola tem janelas largas de sala de aula; o andar dela tem carteiras, não cama. */
function janelasDaEscola(c: Camada[]): Camada[] {
  return c.map((camada) =>
    camada.map((l) =>
      l === 'MJJMJJMJJMJJMJJM' ? 'MJJJJMJJJJMJJJJM' : l.replace('qQX', '.XX').replace('K', 'X'),
    ),
  );
}

export function legendaDoLargo(modelo: ModeloLargo, p: ParametrosPredio): Legenda {
  const [parede, friso] = PEDRAS[modelo];
  const loja = LOJAS[p.vende ?? 'padaria'];
  const escola = modelo === 'escola';
  return {
    ...legendaComum(parede, friso),
    // a esquina art déco tem o toldo verde do esboço; os outros, o sorteado
    t: {
      b:
        modelo === 'deco' || p.corToldo === 'verde'
          ? BLOCOS_PREDIO.toldoVerde
          : BLOCOS_PREDIO.toldoVermelho,
    },
    U: { b: escola ? Bloco.MESA_TRABALHO : loja.U, d: 1 },
    u: { b: escola ? Bloco.MESA_TRABALHO : loja.u, d: 1 },
    V: { b: escola ? Bloco.MESA_TRABALHO : loja.V, d: 1 },
  };
}

export function predioLargo(modelo: ModeloLargo, params: ParametrosPredio): Planta {
  const n =
    modelo === 'escola' ? 2 : modelo === 'alto' ? 6 : Math.max(5, Math.min(6, params.andares));
  const telhado = 4 * n;
  const coroa = modelo === 'deco' ? 9 : 5;
  const p = plantaVazia(modelo, LARGURA_LARGO, PROFUNDIDADE_LARGO, telhado + coroa, {
    ...params,
    andares: n,
    loja: modelo !== 'escola',
    caixaDagua: modelo === 'alto',
    vende: params.vende ?? 'padaria',
  });
  p.chao = 0;
  const leg = legendaDoLargo(modelo, p.params);
  const escola = modelo === 'escola';
  pintarCamadas(p, 0, escola ? janelasDaEscola(TERREO) : TERREO, leg);
  for (let k = 1; k < n; k++) pintarCamadas(p, 4 * k, escola ? janelasDaEscola(ANDAR) : ANDAR, leg);
  pintarCamadas(p, telhado, TELHADO, leg);
  const [parede, friso] = PEDRAS[modelo];
  if (modelo === 'deco') {
    // topo em degraus: três volumes cada vez menores e a agulha dourada
    const degrau = (s0: number, f0: number, s1: number, f1: number, y0: number, alto: number) => {
      for (let y = y0; y < y0 + alto; y++)
        for (let s = s0; s <= s1; s++)
          for (let f = f0; f <= f1; f++) por(p, s, f, y, y === y0 + alto - 1 ? friso : parede);
    };
    degrau(4, 3, 11, 6, telhado + 1, 3);
    degrau(5, 4, 10, 5, telhado + 4, 3);
    degrau(7, 4, 8, 5, telhado + 7, 2);
  } else if (modelo === 'alto') {
    // o terraço do prédio mais alto: caixa d'água e um baú (com bancos de frente para a rua)
    caixaDagua(p, 11, 3, telhado + 1);
    por(p, 8, 7, telhado + 1, Bloco.BAU, 2);
    for (const s of [5, 6]) por(p, s, 3, telhado + 1, Bloco.ESCADA, 0);
  }
  // a placa da loja do térreo (a escola não tem)
  if (!escola) {
    const desenho = LOJAS[p.params.vende!].placa;
    por(p, 8, 0, 4, BLOCOS_PREDIO.placa, 2 | (desenho << 2));
  }
  p.comodos.push({ andar: 0, s0: 2, f0: 2, s1: 14, f1: 7, pes: 1 });
  for (let k = 1; k < n; k++)
    p.comodos.push({
      andar: k,
      s0: 2,
      f0: 2,
      s1: 14,
      f1: 7,
      pes: 4 * k + 1,
      ...(escola ? {} : { cama: [10, 7] as [number, number] }),
    });
  p.porta = [4, 1, 1];
  p.terraco = telhado + 1;
  acenderJanelas(p, BLOCOS_PREDIO.janela, BLOCOS_PREDIO.janelaAcesa, (y) => y >> 2);
  return params.espelho ? espelhar(p) : p;
}
