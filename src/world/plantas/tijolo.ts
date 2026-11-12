/**
 * Prédio de tijolo com lojinha no térreo (spec 014): 3 ou 4 andares num lote de 8 × 9. O
 * térreo fica no nível da calçada (a planta pinta o piso dele, `chao = 0`): vitrine, porta,
 * toldo listrado por cima e a placa com o desenho do que a loja vende (pão, chave inglesa,
 * tijolo, sorvete). Em cima, um apartamento de 5 × 6 por andar; a escada de dentro é a mesma
 * da geminada (um lance por andar, subindo para o fundo) e chega ao terraço.
 */
import { Bloco } from '../blocks';
import { caixaDagua } from './geminada';
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
  type Vende,
} from './formato';
import { BLOCOS_PREDIO, legendaComum } from './paleta';

export const LARGURA_TIJOLO = 8;
export const PROFUNDIDADE_TIJOLO = 9;

/** Térreo: a loja (vitrine e porta na frente, o que ela vende no fundo). */
const TERREO: Camada[] = [
  [
    '        ',
    'MMMMMMMM',
    'MTTTTTTM',
    'MTTTTTTM',
    'MTTTTTTM',
    'MTTTTTTM',
    'MTTTTTTM',
    'MTTTTTTM',
    'MMMMMMMM',
  ],
  [
    '        ',
    'MPJJJJJM',
    'M......M',
    'M......M',
    'M.....EM',
    'MU.....M',
    'Mu.....M',
    'MV.....M',
    'MMJJJJMM',
  ],
  [
    '        ',
    'MPJJJJJM',
    'M......M',
    'M......M',
    'M......M',
    'Mi....EM',
    'M......M',
    'M......M',
    'MMJJJJMM',
  ],
  [
    'tttttttt',
    'MDDDDDDM',
    'M......M',
    'M......M',
    'M......M',
    'M......M',
    'M.....EM',
    'M......M',
    'MMMMMMMM',
  ],
];

/** Andar-tipo: o apartamento, com o piso aberto em cima do lance de baixo. */
const ANDAR: Camada[] = [
  [
    '        ',
    'MMMMMMMM',
    'MTTTTTTM',
    'MTTTTTTM',
    'MTTTTT.M',
    'MTTTTT.M',
    'MTTTTT.M',
    'MTTTTTEM',
    'MMMMMMMM',
  ],
  [
    '        ',
    'MJJMMJJM',
    'M......M',
    'MX.....M',
    'M.....EM',
    'M......M',
    'MK.....M',
    'MB.....M',
    'MMJJJJMM',
  ],
  [
    '        ',
    'MJJMMJJM',
    'M......M',
    'M......M',
    'M......M',
    'M.....EM',
    'M......M',
    'M......M',
    'MMJJJJMM',
  ],
  [
    '        ',
    'MDDDDDDM',
    'M......M',
    'M......M',
    'M......M',
    'M......M',
    'M.....EM',
    'M......M',
    'MMMMMMMM',
  ],
];

/** Telhado: cornija, mureta de tijolo e o vão da escada com grade em volta. */
const TELHADO: Camada[] = [
  [
    'DDDDDDDD',
    'CCCCCCCC',
    'CCCCCCCC',
    'CCCCCCCC',
    'CCCCCC.C',
    'CCCCCC.C',
    'CCCCCC.C',
    'CCCCCCEC',
    'CCCCCCCC',
  ],
  [
    'MMMMMMMM',
    'M      M',
    'M      M',
    'M      M',
    'M    #.M',
    'M    #.M',
    'M    #.M',
    'M      M',
    'MMMMMMMM',
  ],
];

/** O que fica no fundo da loja (`U`, `u`, `V`) e o desenho da placa. */
export const LOJAS: Record<Vende, { U: number; u: number; V: number; placa: number }> = {
  // padaria: forno aceso, o balcão (baú) e a mesa
  padaria: { U: Bloco.FORNALHA_ACESA, u: Bloco.BAU, V: Bloco.MESA_TRABALHO, placa: 1 },
  // oficina mecânica: a fornalha do ferreiro, a bancada e o baú das peças
  oficina: { U: Bloco.FORNALHA, u: Bloco.MESA_TRABALHO, V: Bloco.BAU, placa: 2 },
  // loja de construção: a bancada e dois baús de material
  construcao: { U: Bloco.MESA_TRABALHO, u: Bloco.BAU, V: Bloco.BAU, placa: 3 },
  // sorveteria (enfeite): o balcão gelado (baú), a mesa e a fornalha... de casquinha
  sorveteria: { U: Bloco.BAU, u: Bloco.MESA_TRABALHO, V: Bloco.BAU, placa: 4 },
};

export function legendaDoTijolo(p: ParametrosPredio): Legenda {
  const loja = LOJAS[p.vende ?? 'padaria'];
  return {
    ...legendaComum(Bloco.TIJOLOS, BLOCOS_PREDIO.concreto),
    t: { b: p.corToldo === 'verde' ? BLOCOS_PREDIO.toldoVerde : BLOCOS_PREDIO.toldoVermelho },
    U: { b: loja.U, d: 1 },
    u: { b: loja.u, d: 1 },
    V: { b: loja.V, d: 1 },
  };
}

export function predioDeTijolo(params: ParametrosPredio): Planta {
  const n = Math.max(3, Math.min(4, params.andares));
  const telhado = 4 * n;
  const p = plantaVazia('tijolo', LARGURA_TIJOLO, PROFUNDIDADE_TIJOLO, telhado + 6, {
    ...params,
    andares: n,
    loja: true,
    vende: params.vende ?? 'padaria',
  });
  p.chao = 0;
  const leg = legendaDoTijolo(p.params);
  pintarCamadas(p, 0, TERREO, leg);
  for (let k = 1; k < n; k++) pintarCamadas(p, 4 * k, ANDAR, leg);
  pintarCamadas(p, telhado, TELHADO, leg);
  // a placa da loja na fachada, em cima do toldo, virada para a rua
  por(p, 4, 0, 4, BLOCOS_PREDIO.placa, 2 | (LOJAS[p.params.vende!].placa << 2));
  if (params.caixaDagua) caixaDagua(p, 1, 4, telhado + 1);
  p.comodos.push({ andar: 0, s0: 1, f0: 2, s1: 5, f1: 7, pes: 1 });
  for (let k = 1; k < n; k++)
    p.comodos.push({ andar: k, s0: 1, f0: 2, s1: 5, f1: 7, pes: 4 * k + 1, cama: [1, 7] });
  p.porta = [1, 1, 1];
  p.terraco = telhado + 1;
  acenderJanelas(p, BLOCOS_PREDIO.janela, BLOCOS_PREDIO.janelaAcesa, (y) => y >> 2);
  return params.espelho ? espelhar(p) : p;
}
