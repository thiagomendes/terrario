/**
 * Nomes da Cidade Grande (spec 014). Até a T08 (o tema de verdade) a cidade usa os nomes
 * do Rancho Alegre para o que é de todo tema, com os bichos da cidade e os blocos novos.
 */
import { Bloco } from '../../world/blocks';
import type { TextosTema } from '../tipos';
import { TEXTOS_RANCHO } from '../rancho-alegre/textos';

/** Nomes dos blocos que só a cidade tem (os outros temas não precisam nomear). */
export const NOMES_BLOCOS_CIDADE: Readonly<Record<number, string>> = {
  [Bloco.ASFALTO]: 'Asfalto',
  [Bloco.FAIXA_RUA]: 'Faixa amarela',
  [Bloco.FAIXA_PEDESTRE]: 'Faixa de pedestre',
  [Bloco.CALCADA]: 'Calçada',
  [Bloco.CONCRETO]: 'Concreto',
  [Bloco.PEDRA_MARROM]: 'Pedra marrom',
  [Bloco.ESCADINHA_PEDRA]: 'Escadinha de pedra',
  [Bloco.PEDRA_CREME]: 'Pedra creme',
  [Bloco.FRISO_DOURADO]: 'Friso dourado',
  [Bloco.JANELA]: 'Janela grande',
  [Bloco.JANELA_ACESA]: 'Janela acesa',
  [Bloco.GRADE_FERRO]: 'Grade de ferro',
  [Bloco.LAJE_GRADE]: 'Laje de grade',
  [Bloco.POSTE]: 'Poste de luz',
  [Bloco.PLACA]: 'Placa',
  [Bloco.TOLDO_VERMELHO]: 'Toldo vermelho',
  [Bloco.TOLDO_VERDE]: 'Toldo verde',
  [Bloco.TAPUME]: 'Tapume',
  [Bloco.ESCADA_GRADE]: 'Escada de grade',
};

export const TEXTOS_CIDADE: TextosTema = {
  ...TEXTOS_RANCHO,
  blocos: {
    ...TEXTOS_RANCHO.blocos,
    [Bloco.TERRA_MUSGOSA]: 'Grama da praça',
    ...NOMES_BLOCOS_CIDADE,
  },
  itens: { ...TEXTOS_RANCHO.itens, colher_pedreiro: 'Colher de pedreiro' },
  criaturas: {
    cervo: 'Cachorro grande',
    coelho: 'Pombo da praça',
    peixe: 'Carpa do lago',
    espectro: 'Guaxinim travesso',
    raposa: 'Gato de rua',
  },
  diario: 'Caderno da cidade',
  boasVindas: 'Bem-vindo à Cidade Grande: ajude o pedreiro a construir',
  morte: 'Você cochilou no banco da praça',
  legendas: { trovao: 'Trovoada', criaturaNoturna: 'Trrr do guaxinim' },
};
