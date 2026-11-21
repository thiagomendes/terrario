/**
 * Só na Cidade Grande (spec 014, decisão do dono de 12 nov 2026) e só na Vila Neon (spec 026):
 * o que um tema cria fica nele. O tema diz o que é só dele (`Tema.exclusivos`); a regra mora aqui, pura, para o
 * núcleo (que só conhece o estilo do mundo) e o cliente decidirem igual:
 * - geração: só o planejador da cidade põe os blocos da cidade;
 * - trocas, criativo e receitas: um mundo que não é da cidade não mostra (nem aceita) nada
 *   que seja exclusivo da cidade.
 */
import { Bloco } from '../world/blocks';
import { idDoBloco } from './itens';
import type { EstiloMundo } from '../temas/tipos';
import type { Receita } from './receitas';
import type { Troca } from './trocas';

export interface Exclusivos {
  /** Blocos que só o tema usa (e o item de cada um). */
  blocos: readonly number[];
  /** Itens que não são blocos (ferramentas, peças). */
  itens: readonly string[];
}

/** Spec 014: a colher de pedreiro (ferramenta que não gasta). */
export const COLHER_PEDREIRO = 'colher_pedreiro';

/**
 * Os blocos de rua (spec 014): a Cidade Grande e a Vila Neon (spec 026) têm os dois. Cada tema
 * pinta do seu jeito; o id é o mesmo.
 */
const BLOCOS_DE_RUA: readonly number[] = [
  Bloco.ASFALTO,
  Bloco.FAIXA_RUA,
  Bloco.FAIXA_PEDESTRE,
  Bloco.CALCADA,
  Bloco.CONCRETO,
  Bloco.PEDRA_MARROM,
  Bloco.ESCADINHA_PEDRA,
  Bloco.PEDRA_CREME,
  Bloco.FRISO_DOURADO,
  Bloco.JANELA,
  Bloco.JANELA_ACESA,
  Bloco.GRADE_FERRO,
  Bloco.LAJE_GRADE,
  Bloco.POSTE,
  Bloco.TOLDO_VERMELHO,
  Bloco.TOLDO_VERDE,
];

/**
 * Os blocos 84 em diante e a colher de pedreiro: só da Cidade Grande (os de rua também da
 * Vila Neon; a placa, o tapume, a escada de grade e a colher, só da cidade).
 */
export const EXCLUSIVOS_CIDADE: Exclusivos = {
  blocos: [...BLOCOS_DE_RUA, Bloco.PLACA, Bloco.TAPUME, Bloco.ESCADA_GRADE].sort((a, b) => a - b),
  itens: [COLHER_PEDREIRO],
};

/** Spec 026: os blocos 103 em diante, só da Vila Neon. */
export const BLOCOS_SO_DA_VILA: readonly number[] = [
  Bloco.PISO_PALCO,
  Bloco.CAIXA_SOM,
  Bloco.TRELICA,
  Bloco.PISTA_NEON,
  Bloco.LETREIRO_NEON,
  Bloco.PAREDE_POSTER,
  Bloco.REBOCO_ROSA,
  Bloco.REBOCO_AZUL,
  Bloco.REBOCO_AMARELO,
  Bloco.REBOCO_MENTA,
  Bloco.TELHA_COLONIAL,
  Bloco.GRADE_PLATEIA,
  Bloco.FAIXA_NEON,
  Bloco.ALAMBRADO,
];

/** Spec 026: o que a Vila Neon tem: os blocos de rua da cidade e os seus (103 em diante). */
/** Spec 026: a comida da barraca do lanche da Vila Neon (só daqui). */
export const CACHORRO_QUENTE = 'cachorro_quente';
export const SUCO = 'suco';
/**
 * Spec 026 (parte 2, etapa B): a vitamina da lanchonete (comida), a fita de vídeo da locadora
 * (na parte 3 ela passa na TV da casa) e a lhama de pelúcia, a prenda das barracas do parque.
 */
export const VITAMINA = 'vitamina';
export const FITA_VIDEO = 'fita_video';
export const PELUCIA = 'pelucia';
/**
 * Spec 026 (parte 3): os brinquedos do baú do quarto da Casa anos 80 (para levar e usar neste
 * mundo): o ioiô, o pião e o cubo de cores 2 × 2.
 */
export const IOIO = 'ioio';
export const PIAO = 'piao';
export const CUBO_CORES = 'cubo_cores';
/**
 * Parte 3, etapa B: o feno das lhamas (a f2 e a f7; antes era o feixe de trigo de todo tema, e
 * a criança via "+1 Feixe de trigo" com o desenho do trigo enquanto o cartão mostrava o fardo) e a
 * fatia de bolo de fubá da vovó (comida, a f12).
 */
export const FENO = 'feno';
export const FATIA_BOLO = 'fatia_bolo';
/** Spec 032: o algodão-doce do parque (comida, comprado do Seu Chico). */
export const ALGODAO_DOCE = 'algodao_doce';
export const EXCLUSIVOS_VILA: Exclusivos = {
  blocos: [...BLOCOS_DE_RUA, ...BLOCOS_SO_DA_VILA],
  itens: [
    CACHORRO_QUENTE,
    SUCO,
    VITAMINA,
    FITA_VIDEO,
    PELUCIA,
    IOIO,
    PIAO,
    CUBO_CORES,
    FENO,
    FATIA_BOLO,
    ALGODAO_DOCE,
  ],
};

/**
 * Spec 027: os blocos 117 em diante, só da Noite das Fantasias. Este mundo não usa os blocos de
 * rua da Cidade e da Vila (decisão do orquestrador): tem janela, toldinho e caminho próprios.
 */
export const BLOCOS_SO_DO_BAILE: readonly number[] = [
  Bloco.TELHA_ROXA,
  Bloco.TIJOLO_TORTO,
  Bloco.TEIA_BARBANTE,
  Bloco.FOLHAS_LARANJA,
  Bloco.TABUA_MUSGO,
  Bloco.PEDRINHA_LILAS,
  Bloco.TABUA_ROXA,
  Bloco.JANELA_TORTA,
  Bloco.JANELA_TORTA_ACESA,
  Bloco.TOLDINHO,
  Bloco.CALDEIRAO,
];
/**
 * Spec 027 (T14): as comidas das barracas da festa (só deste mundo): os três docinhos da Tia
 * Filó e a surpresa de uva do Seu Jerônimo (cada um na forminha com três), o chocolate quente e
 * a poção de uva do Seu Olavo.
 */
export const BRIGADEIRO = 'brigadeiro';
export const BEIJINHO = 'beijinho';
export const CAJUZINHO = 'cajuzinho';
export const SURPRESA_UVA = 'surpresa_uva';
export const CHOCOLATE_QUENTE = 'chocolate_quente';
export const POCAO_UVA = 'pocao_uva';
export const EXCLUSIVOS_BAILE: Exclusivos = {
  blocos: BLOCOS_SO_DO_BAILE,
  itens: [BRIGADEIRO, BEIJINHO, CAJUZINHO, SURPRESA_UVA, CHOCOLATE_QUENTE, POCAO_UVA],
};

/**
 * Exclusivos por planta do povoado (o núcleo e o servidor só conhecem o estilo do mundo):
 * a planta 'cidade' é a Cidade Grande; a 'bairro', a Vila Neon; a 'baile', a Noite das
 * Fantasias. Um item pode ser de mais de uma planta (os blocos de rua).
 */
const POR_PLANTA: Readonly<Record<string, Exclusivos>> = {
  cidade: EXCLUSIVOS_CIDADE,
  bairro: EXCLUSIVOS_VILA,
  baile: EXCLUSIVOS_BAILE,
};

/** Item -> plantas dos mundos donos dele. */
const DONOS: ReadonlyMap<string, ReadonlySet<string>> = (() => {
  const m = new Map<string, Set<string>>();
  const marcar = (item: string, planta: string) => {
    let donos = m.get(item);
    if (!donos) m.set(item, (donos = new Set()));
    donos.add(planta);
  };
  for (const [planta, ex] of Object.entries(POR_PLANTA)) {
    for (const b of ex.blocos) marcar(idDoBloco(b), planta);
    for (const i of ex.itens) marcar(i, planta);
  }
  return m;
})();

/** Bloco exclusivo de algum tema? (ids 84 em diante: a cidade e o bairro) */
export function blocoExclusivo(b: number): boolean {
  return DONOS.has(idDoBloco(b));
}

/** O item existe neste mundo? Exclusivo só nos mundos dos temas donos dele. */
export function itemNoMundo(item: string, estilo: EstiloMundo): boolean {
  const donos = DONOS.get(item);
  return donos === undefined || donos.has(estilo.povoado?.planta ?? 'vila');
}

/** O bloco existe neste mundo? */
export function blocoNoMundo(b: number, estilo: EstiloMundo): boolean {
  return itemNoMundo(idDoBloco(b), estilo);
}

/** A troca existe neste mundo (nada do que ela pede ou dá é de outro tema)? */
export function trocaNoMundo(t: Troca, estilo: EstiloMundo): boolean {
  const planta = estilo.povoado?.planta ?? 'vila';
  if (t.planta !== undefined && t.planta !== planta) return false;
  // a roça que o pedreiro da cidade não faz também não entra no bairro (sem roça na Vila Neon)
  // nem na vila da festa (o marceneiro de lá troca os blocos das casinhas tortas)
  if (t.foraDaCidade && (planta === 'cidade' || planta === 'bairro' || planta === 'baile'))
    return false;
  return itemNoMundo(t.receber.item, estilo) && t.dar.every((d) => itemNoMundo(d.item, estilo));
}

/** A receita existe neste mundo (resultado e ingredientes)? */
export function receitaNoMundo(r: Receita, estilo: EstiloMundo): boolean {
  if (!itemNoMundo(r.resultado.item, estilo)) return false;
  const ingredientes = r.ingredientes ?? Object.values(r.chaves ?? {});
  return ingredientes.every((i) => i.startsWith('#') || itemNoMundo(i, estilo));
}
