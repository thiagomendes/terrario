/**
 * As letras das plantas (spec 014): uma legenda só para todos os modelos, para quem lê as
 * camadas não precisar decorar uma por prédio. Cada modelo troca só as letras de parede e
 * de enfeite (`M`, `D`) pela pedra dele.
 */
import { Bloco } from '../blocks';
import type { Legenda } from './formato';

/** Blocos dos prédios (os da cidade, ids 84 em diante: só existem no tema da cidade). */
export const BLOCOS_PREDIO = {
  pedraMarrom: Bloco.PEDRA_MARROM,
  escadinha: Bloco.ESCADINHA_PEDRA,
  pedraCreme: Bloco.PEDRA_CREME,
  friso: Bloco.FRISO_DOURADO,
  concreto: Bloco.CONCRETO,
  janela: Bloco.JANELA,
  janelaAcesa: Bloco.JANELA_ACESA,
  grade: Bloco.GRADE_FERRO,
  lajeGrade: Bloco.LAJE_GRADE,
  escadaGrade: Bloco.ESCADA_GRADE,
  toldoVermelho: Bloco.TOLDO_VERMELHO,
  toldoVerde: Bloco.TOLDO_VERDE,
  placa: Bloco.PLACA,
  poste: Bloco.POSTE,
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
 * - `X` mesa, `K` baú, `F` fornalha acesa, `i` lampião (tocha) em cima da mesa
 * - spec 039, a cama de duas células: a cabeceira em maiúscula e o pé em minúscula, ao lado,
 *   para onde ele vai: `B`/`b` o pé para +s, `Q`/`q` para -s, `R`/`r` para a rua (-f)
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
    B: { b: Bloco.CAMA, d: 1, parte: 0 },
    b: { b: Bloco.CAMA, d: 1, parte: 1 },
    Q: { b: Bloco.CAMA, d: 3, parte: 0 },
    q: { b: Bloco.CAMA, d: 3, parte: 1 },
    R: { b: Bloco.CAMA, d: 2, parte: 0 },
    r: { b: Bloco.CAMA, d: 2, parte: 1 },
    X: { b: Bloco.MESA_TRABALHO, d: 1 },
    K: { b: Bloco.BAU, d: 1 },
    F: { b: Bloco.FORNALHA_ACESA, d: 2 },
    i: { b: Bloco.TOCHA },
  };
}
