/**
 * Plantas dos prédios da Cidade Grande (spec 014): os modelos paramétricos e o que o
 * planejador precisa para escolher um por lote.
 */
export * from './formato';
export {
  casaGeminada,
  legendaDaGeminada,
  LARGURA_GEMINADA,
  PROFUNDIDADE_GEMINADA,
} from './geminada';
export { legendaComum, BLOCOS_PREDIO } from './paleta';
export { alcancaveis, alcancaRetangulo, chegaAoTerraco, comodoLivre } from './conferir';
