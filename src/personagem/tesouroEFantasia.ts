/**
 * Fantasia (017) e tesouros da lojinha (023) nunca se desenham um por cima do outro: a última
 * escolha ganha, e o que sai do boneco continua guardado (o tesouro fica em "Meus tesouros",
 * a fantasia volta a ser só um cartão da aba).
 *
 * - Toda fantasia é roupa inteira (pinta a camisa, a calça e o sapato): os premium de roupa
 *   (a camiseta aquário, o tênis-cometa, o pijama de nuvem) e o dragãozinho brigam com qualquer
 *   fantasia.
 * - Os premium das costas (a capa de estrelas, as asas de borboleta, a mochila-foguete) só
 *   brigam com a fantasia que usa as costas (uma capa dela, ou a mochila do traje espacial).
 * - Spec 036: o boné de hélice só briga com a fantasia que tem peça na cabeça
 *   (`PECAS_DA_CABECA`), e o premium da mão (a varinha de bolhas, o guarda-chuva, a pipa) só com
 *   a fantasia de varinha ou de cetro (`PECAS_DA_MAO`).
 * - Vestir o premium por cima tira só a peça da fantasia que briga (é peça opcional); se a peça
 *   não sai sozinha (a mochila do astronauta, o capuz do monstrinho), sai a fantasia inteira.
 * - O bichinho (pinguim, unicórnio, passarinho) e o brinquedo de andar não vestem nada da
 *   fantasia: ficam com qualquer uma.
 *
 * `oQueSai` é a regra única de "o que sai" (premium e fantasia): a lojinha, o provador, "Meus
 * tesouros" e o editor mostram o que ela devolve, e as funções de vestir aplicam o mesmo.
 */
import { premiumPorId, saiAoVestir, type CategoriaPremium } from '../jogo/alma';
import {
  tirarFantasia,
  type Acessorio,
  type Aparencia,
  type PremiumVestido,
} from './aparencia';
import { pecasVestidas, type FantasiaVestida, type PecaFantasia, type TipoPeca } from './fantasias';

/** Peças de fantasia que ocupam as costas (onde vão a capa, as asas e a mochila-foguete). */
export const PECAS_DAS_COSTAS: readonly TipoPeca[] = [
  'capa',
  'capa-curta',
  'capinha-morcego',
  'traje-espacial',
];

/**
 * Spec 036: peças de fantasia que ocupam a cabeça (onde vai o boné de hélice), a lista única.
 * Ficam de fora o que cabe por baixo do boné: a máscara, os óculos, o cabelo da roqueira e a
 * faixa da testa (T03, pelas fotos em `capturas-036/t03-pecas/cabeca/`: ela fica na testa,
 * debaixo da aba, como uma faixa debaixo de um boné de verdade). A tiara e o enfeite de cabeça
 * entraram: o arco e a concha atravessavam a cúpula do boné.
 */
export const PECAS_DA_CABECA: readonly TipoPeca[] = [
  'coroa',
  'tiara',
  'enfeite-cabeca',
  'chapeu-palha',
  'chapeu-vaqueiro',
  'capacete-bolha',
  'touca-chef',
  'capacete-obra',
  'bone',
  'chapeu-festa',
  'chapeu-peao',
  'capuz-dragao',
  'viseira',
  'bone-tras',
  'capuz-monstro',
  'chapeu-bruxa',
  'lencol-capuz',
  'orelhas-gatinho',
  'orelhas-morceguinho',
];

/** Spec 036: peças de fantasia seguradas na mão esquerda (onde vai o premium da mão). */
export const PECAS_DA_MAO: readonly TipoPeca[] = ['varinha', 'cetro'];

/** As peças de fantasia que brigam com cada lugar de premium (o resto não briga com peça). */
const PECAS_DO_LUGAR: Partial<Record<CategoriaPremium, readonly TipoPeca[]>> = {
  costas: PECAS_DAS_COSTAS,
  chapeu: PECAS_DA_CABECA,
  mao: PECAS_DA_MAO,
};
/** Lugares em que o premium briga com a fantasia inteira (ela é roupa inteira). */
const BRIGA_COM_TODA: readonly CategoriaPremium[] = ['roupa', 'fantasia'];

/** O que sai do boneco: um tesouro, a fantasia inteira ou só uma peça dela. */
export type Saida =
  | { tipo: 'premium'; id: string }
  | { tipo: 'fantasia'; id: string }
  | { tipo: 'peca'; fantasia: string; peca: TipoPeca };

/** A escolha da criança: um tesouro da lojinha ou uma fantasia (com as peças que ela tirou). */
export type Escolha = { premium: string } | { fantasia: FantasiaVestida };

function pecasNoLugar(
  corpo: Aparencia['corpo'],
  f: FantasiaVestida,
  cat: CategoriaPremium,
): PecaFantasia[] {
  const lista = PECAS_DO_LUGAR[cat];
  return lista ? pecasVestidas(f, corpo).filter((p) => lista.includes(p.tipo)) : [];
}

/** O que sai da fantasia vestida quando entra um premium deste lugar. */
function daFantasia(
  corpo: Aparencia['corpo'],
  f: FantasiaVestida,
  cat: CategoriaPremium,
): Saida[] {
  if (BRIGA_COM_TODA.includes(cat)) return [{ tipo: 'fantasia', id: f.id }];
  const pecas = pecasNoLugar(corpo, f, cat);
  if (!pecas.length) return [];
  if (pecas.some((p) => !p.opcional)) return [{ tipo: 'fantasia', id: f.id }];
  return pecas.map((p) => ({ tipo: 'peca', fantasia: f.id, peca: p.tipo }));
}

/** A fantasia vestida briga com o premium deste lugar? */
function brigaComFantasia(
  corpo: Aparencia['corpo'],
  f: FantasiaVestida,
  cat: CategoriaPremium,
): boolean {
  return BRIGA_COM_TODA.includes(cat) || pecasNoLugar(corpo, f, cat).length > 0;
}

/**
 * A regra única de "o que sai" ao escolher `escolha`, com a aparência `a` (o corpo e a fantasia
 * vestida) e os tesouros `vestidos`:
 * - um tesouro: o tesouro que divide o lugar com ele (`saiAoVestir`) e, da fantasia, ela
 *   inteira ou só a peça que briga;
 * - uma fantasia (com as peças que ela tirou): os tesouros que brigam com ela. A fantasia de
 *   antes não entra na lista: trocar de fantasia é só trocar (a aba Fantasias).
 * Na ordem: os tesouros primeiro, depois a fantasia ou as peças dela. Nada sai: lista vazia.
 */
export function oQueSai(
  a: Pick<Aparencia, 'corpo' | 'fantasia'>,
  vestidos: Readonly<PremiumVestido> | undefined,
  escolha: Escolha,
): Saida[] {
  if ('premium' in escolha) {
    const p = premiumPorId(escolha.premium);
    if (!p) return [];
    const out: Saida[] = saiAoVestir(vestidos ?? {}, p.id).map((id) => ({
      tipo: 'premium',
      id,
    }));
    if (a.fantasia) out.push(...daFantasia(a.corpo, a.fantasia, p.categoria));
    return out;
  }
  const f = escolha.fantasia;
  if (!vestidos) return [];
  const out: Saida[] = [];
  for (const [cat, id] of Object.entries(vestidos) as [CategoriaPremium, string][])
    if (id && brigaComFantasia(a.corpo, f, cat)) out.push({ tipo: 'premium', id });
  return out;
}

/** Os ids dos tesouros numa lista do que sai. */
export const tesourosDaSaida = (s: readonly Saida[]): string[] =>
  s.flatMap((x) => (x.tipo === 'premium' ? [x.id] : []));

/**
 * A aparência sem o que sai da fantasia (ela inteira, ou as peças, que entram em `sem`). Sem
 * nada da fantasia na lista, devolve a mesma aparência (o mesmo objeto). Os tesouros da lista
 * saem pelo perfil da criança (`vestirPremium`), não aqui.
 */
export function tirarDaFantasia(a: Aparencia, saidas: readonly Saida[]): Aparencia {
  if (!a.fantasia) return a;
  const id = a.fantasia.id;
  if (saidas.some((s) => s.tipo === 'fantasia' && s.id === id)) return tirarFantasia(a);
  const pecas = saidas.flatMap((s) => (s.tipo === 'peca' && s.fantasia === id ? [s.peca] : []));
  if (!pecas.length) return a;
  const sem = [...new Set([...(a.fantasia.sem ?? []), ...pecas])];
  return { ...a, fantasia: { ...a.fantasia, sem } };
}

/** Os tesouros vestidos que saem quando a criança escolhe esta fantasia (ou peça dela). */
export function tesourosQueSaem(
  a: Pick<Aparencia, 'corpo' | 'fantasia'>,
  vestidos: Readonly<PremiumVestido> | undefined,
): string[] {
  if (!a.fantasia) return [];
  return tesourosDaSaida(oQueSai(a, vestidos, { fantasia: a.fantasia }));
}

/**
 * A aparência depois de vestir o tesouro `id` por cima da fantasia: sem ela (roupa inteira) ou
 * sem a peça que briga. Sem briga, devolve a mesma aparência (o mesmo objeto).
 */
export function aoVestirTesouro(a: Aparencia, id: string): Aparencia {
  if (!a.fantasia) return a;
  return tirarDaFantasia(a, oQueSai(a, undefined, { premium: id }));
}

/** Os tesouros vestidos que ficam com esta fantasia (as miniaturas e a vista do editor). */
export function semOsQueSaem(a: Aparencia): Aparencia {
  const sai = tesourosQueSaem(a, a.premium);
  if (!sai.length || !a.premium) return a;
  const premium: PremiumVestido = {};
  for (const [cat, id] of Object.entries(a.premium) as [keyof PremiumVestido, string][])
    if (!sai.includes(id)) premium[cat] = id;
  const out: Aparencia = { ...a };
  if (Object.keys(premium).length) out.premium = premium;
  else delete out.premium;
  return out;
}

/** Spec 036: os enfeites do look que vão na cabeça (somem debaixo do boné de hélice). */
export const ACESSORIOS_DA_CABECA: readonly Acessorio[] = [
  'capuz',
  'chapeu',
  'capacete',
  'chapeu-explorador',
  'touca-chef',
  'coroa-flores',
  'chapeu-palha',
];

/**
 * O enfeite do look some debaixo do tesouro que vai no mesmo lugar, como a mochila debaixo da
 * capa: a mochila debaixo do premium das costas, o chapéu e o capuz debaixo do boné (spec 036) e
 * a lanterna debaixo do premium da mão (spec 036). O enfeite continua guardado no look.
 */
export function acessorioEscondido(a: Pick<Aparencia, 'acessorio' | 'premium'>): boolean {
  const p = a.premium;
  if (!p) return false;
  if (a.acessorio === 'mochila') return !!p.costas;
  if (a.acessorio === 'lanterna') return !!p.mao;
  return ACESSORIOS_DA_CABECA.includes(a.acessorio) && !!p.chapeu;
}
