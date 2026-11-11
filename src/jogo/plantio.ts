/**
 * Plantio (spec 013): as regras de arar, plantar, crescer e colher, puras e iguais em
 * todo tema. O núcleo confere com elas e o cliente prevê com elas (uma regra só, para a
 * previsão não piscar nem ser desfeita).
 */
import { Bloco, obterBloco } from '../world/blocks';
import { idDoBloco } from './itens';
import type { Drop } from './drops';
import type { Gerador } from '../audio/variacao';

export type TipoLavoura = 'trigo' | 'milho' | 'abobora';

export interface DefLavoura {
  tipo: TipoLavoura;
  /** Id do estágio 0 (os 4 estágios têm ids seguidos). */
  primeiro: number;
  semente: string;
  produto: string;
  /** Quantos produtos a planta madura solta (de min a max). */
  min: number;
  max: number;
}

export const LAVOURAS: Record<TipoLavoura, DefLavoura> = {
  trigo: {
    tipo: 'trigo',
    primeiro: Bloco.TRIGO_0,
    semente: 'semente_trigo',
    produto: 'trigo',
    min: 1,
    max: 2,
  },
  milho: {
    tipo: 'milho',
    primeiro: Bloco.MILHO_0,
    semente: 'semente_milho',
    produto: 'milho',
    min: 1,
    max: 3,
  },
  abobora: {
    tipo: 'abobora',
    primeiro: Bloco.ABOBOREIRA_0,
    semente: 'semente_abobora',
    produto: idDoBloco(Bloco.ABOBORA),
    min: 1,
    max: 1,
  },
};

/** Estágios de cada planta: 0 (semente) a 3 (madura). */
export const ESTAGIOS = 4;
export const ESTAGIO_MADURO = ESTAGIOS - 1;
/** Segundos de cada estágio na velocidade 1 (sol aberto, de dia): 3 passagens, 6 minutos. */
export const SEGUNDOS_POR_ESTAGIO = 120;
/** Luz de tocha ou lanterna que já conta como dia. */
export const LUZ_DE_DIA = 9;
/** Chance de a grama alta soltar uma semente de trigo. */
export const CHANCE_SEMENTE_GRAMA = 0.125;

const LISTA = Object.values(LAVOURAS);

/** A planta da lavoura deste bloco (qualquer estágio), ou null. */
export function lavouraDoBloco(b: number): DefLavoura | null {
  for (const l of LISTA) if (b >= l.primeiro && b < l.primeiro + ESTAGIOS) return l;
  return null;
}

export const ehLavoura = (b: number): boolean => lavouraDoBloco(b) !== null;

/** Estágio do bloco (0 a 3), ou -1 se não é lavoura. */
export function estagio(b: number): number {
  const l = lavouraDoBloco(b);
  return l ? b - l.primeiro : -1;
}

export const madura = (b: number): boolean => estagio(b) === ESTAGIO_MADURO;

/** Bloco do estágio seguinte, ou null (madura ou não é lavoura). */
export function proximoEstagio(b: number): number | null {
  const e = estagio(b);
  return e >= 0 && e < ESTAGIO_MADURO ? b + 1 : null;
}

/** Lavoura que a semente planta (estágio 0), ou null. */
export function lavouraDaSemente(item: string | null | undefined): DefLavoura | null {
  return LISTA.find((l) => l.semente === item) ?? null;
}

/** Planta baixa que dá lugar (grama alta, flor...): não é lavoura. */
export function plantaBaixa(b: number): boolean {
  return !!obterBloco(b)?.planta && !ehLavoura(b);
}

/** A enxada transforma este bloco em terra arada? (grama ou terra com ar ou planta baixa em cima) */
export function podeArar(alvo: number, acima: number): boolean {
  if (alvo !== Bloco.TERRA_MUSGOSA && alvo !== Bloco.TERRA) return false;
  return acima === Bloco.AR || plantaBaixa(acima);
}

/** A semente pode ir nesta célula? (terra arada embaixo, lugar livre) */
export function podePlantar(abaixo: number, alvo: number): boolean {
  return abaixo === Bloco.TERRA_ARADA && (alvo === Bloco.AR || plantaBaixa(alvo));
}

/** Pode pôr este bloco por cima do que está no lugar? (lavoura nunca é apagada) */
export function substituivel(atual: number): boolean {
  const d = obterBloco(atual);
  return !d || d.id === Bloco.AR || !!d.liquido || (!!d.planta && !ehLavoura(atual));
}

export interface CondicoesCrescer {
  /** 0 de dia, 1 noite fechada (noiteNaHora). */
  noite: number;
  /** Céu aberto em cima da planta. */
  ceuAberto: boolean;
  /** Luz de tocha, lanterna... (0 a 15). Só é consultada quando não está claro de sol. */
  luz: () => number;
  /** Chovendo no mundo. */
  chuva: boolean;
}

/**
 * Velocidade de crescer (1 = sol aberto de dia). À noite ou no escuro, metade; perto de
 * luz 9 ou mais, como de dia; chuva (com céu aberto) 1,5 vez.
 */
export function velocidadeCrescimento(c: CondicoesCrescer): number {
  const sol = c.noite < 0.5 && c.ceuAberto;
  const claro = sol || c.luz() >= LUZ_DE_DIA;
  const base = claro ? 1 : 0.5;
  return c.chuva && c.ceuAberto ? base * 1.5 : base;
}

/**
 * O que a colheita solta. Madura: o produto e 1 a 2 sementes. Verde: a semente de volta
 * (nunca se perde o que se plantou).
 */
export function colheita(b: number, rng: Gerador): Drop[] {
  const l = lavouraDoBloco(b);
  if (!l) return [];
  if (!madura(b)) return [{ item: l.semente, qtd: 1 }];
  const produto = l.min + Math.floor(rng() * (l.max - l.min + 1));
  const sementes = 1 + Math.floor(rng() * 2);
  return [
    { item: l.produto, qtd: produto },
    { item: l.semente, qtd: sementes },
  ];
}

/** Aviso de criança quando a semente vai fora da terra arada. */
export const AVISO_SEMENTE = 'A semente precisa de terra arada. Use a enxada na grama.';

interface Pos {
  x: number;
  y: number;
  z: number;
}

/**
 * Onde a enxada ara com a mira em `a`: o próprio bloco, ou o de baixo quando a mira pega a
 * grama alta (ou a flor) em cima da grama. Null: ali não ara.
 */
export function alvoDaEnxada(
  a: Pos,
  bloco: (x: number, y: number, z: number) => number,
): Pos | null {
  const b = bloco(a.x, a.y, a.z);
  if (plantaBaixa(b) && podeArar(bloco(a.x, a.y - 1, a.z), b))
    return { x: a.x, y: a.y - 1, z: a.z };
  return podeArar(b, bloco(a.x, a.y + 1, a.z)) ? { x: a.x, y: a.y, z: a.z } : null;
}

/**
 * Onde a semente vai com a mira em `a`: em cima da terra arada mirada (por qualquer face: a
 * criança toca a beirada do canteiro e espera que plante nele), ou no lugar da grama alta
 * (ou flor) que está em cima dela. Null: não é canteiro, vale a regra comum de colocar.
 */
export function alvoDaSemente(
  a: Pos,
  bloco: (x: number, y: number, z: number) => number,
): Pos | null {
  const b = bloco(a.x, a.y, a.z);
  if (b === Bloco.TERRA_ARADA) return { x: a.x, y: a.y + 1, z: a.z };
  if (plantaBaixa(b) && bloco(a.x, a.y - 1, a.z) === Bloco.TERRA_ARADA)
    return { x: a.x, y: a.y, z: a.z };
  return null;
}

/** Ferramenta é enxada? */
export const ehEnxada = (f: { tipo: string } | undefined): boolean => f?.tipo === 'enxada';
