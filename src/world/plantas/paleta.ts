/**
 * As letras das plantas (spec 014): uma legenda só para todos os modelos, para quem lê as
 * camadas não precisar decorar uma por prédio. Cada modelo troca só as letras de parede e
 * de enfeite (`M`, `D`) pela pedra dele.
 */
import { Bloco } from '../blocks';
import type { Legenda } from './formato';

/** Blocos dos prédios (os da cidade entram na T02; até lá, os parecidos que já existem). */
export const BLOCOS_PREDIO = {
  pedraMarrom: Bloco.TIJOLOS,
  escadinha: Bloco.ESCADA,
  pedraCreme: Bloco.ARENITO,
  friso: Bloco.LA_AMARELA,
  concreto: Bloco.PEDRA_LISA,
  janela: Bloco.VIDRO,
  janelaAcesa: Bloco.BLOCO_LUZITA,
  grade: Bloco.CERCA,
  lajeGrade: Bloco.LAJE,
  escadaGrade: Bloco.ESCADA,
  toldoVermelho: Bloco.LA_VERMELHA,
  toldoVerde: Bloco.LA_VERDE,
  placa: Bloco.TABUAS,
} as const;

/**
 * Legenda comum. Maiúsculas são parede e piso; as setas e chaves dão a direção dos degraus:
 * - `.` vão livre (o ar de dentro: enfeitar pode)
 * - `M` parede do modelo, `D` enfeite do modelo (friso, cornija), `C` concreto (lajes)
 * - `T` piso de tábuas, `J` janela grande, `L` janela acesa, `P` porta (de frente para a rua)
 * - `p` moldura da porta (a cor sorteada), `t` toldo (a cor sorteada)
 * - `E` degrau da escada de dentro (sobe para o fundo), `e` escadinha de pedra da frente
 * - `}` e `{` degraus da escada de incêndio (sobem para +s e para -s), `_` patamar de grade
 * - `#` grade de ferro (parapeito, corrimão), `|` perna de pau (caixa d'água)
 * - `W` e `w` tábuas da caixa d'água (aduela clara e cinta escura), `m` tampa
 * - `B` cama, `X` mesa, `K` baú, `F` fornalha acesa, `i` lampião (tocha) em cima da mesa
 */
export function legendaComum(parede: number, enfeite: number = parede): Legenda {
  return {
    '.': { b: Bloco.AR },
    M: { b: parede },
    D: { b: enfeite },
    C: { b: BLOCOS_PREDIO.concreto },
    T: { b: Bloco.TABUAS },
    J: { b: BLOCOS_PREDIO.janela },
    L: { b: BLOCOS_PREDIO.janelaAcesa },
    P: { b: Bloco.PORTA, d: 2 },
    p: { b: Bloco.LA_VERMELHA },
    t: { b: BLOCOS_PREDIO.toldoVermelho },
    E: { b: Bloco.ESCADA, d: 0 },
    e: { b: BLOCOS_PREDIO.escadinha, d: 0 },
    '}': { b: BLOCOS_PREDIO.escadaGrade, d: 1 },
    '{': { b: BLOCOS_PREDIO.escadaGrade, d: 3 },
    _: { b: BLOCOS_PREDIO.lajeGrade },
    '#': { b: BLOCOS_PREDIO.grade },
    '|': { b: Bloco.CERCA },
    W: { b: Bloco.TABUAS },
    w: { b: Bloco.TABUAS_PINHO },
    m: { b: Bloco.LAJE },
    B: { b: Bloco.CAMA },
    X: { b: Bloco.MESA_TRABALHO, d: 1 },
    K: { b: Bloco.BAU, d: 1 },
    F: { b: Bloco.FORNALHA_ACESA, d: 2 },
    i: { b: Bloco.TOCHA },
  };
}
