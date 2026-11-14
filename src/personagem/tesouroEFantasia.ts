/**
 * Fantasia (017) e tesouros da lojinha (023) nunca se desenham um por cima do outro: a última
 * escolha ganha, e o que sai do boneco continua guardado (o tesouro fica em "Meus tesouros",
 * a fantasia volta a ser só um cartão da aba).
 *
 * - Toda fantasia é roupa inteira (pinta a camisa, a calça e o sapato): a camiseta aquário, o
 *   tênis-cometa e o dragãozinho brigam com qualquer fantasia.
 * - A capa de estrelas só briga com a fantasia que usa as costas (uma capa dela, ou a mochila
 *   do traje espacial). Vestir a capa por cima tira só a capa da fantasia (é peça opcional); se
 *   a peça das costas não sai sozinha (a mochila do astronauta), sai a fantasia.
 * - O bichinho que segue (pinguim, unicórnio) não veste nada: fica com qualquer fantasia.
 */
import { premiumPorId } from '../jogo/alma';
import { tirarFantasia, type Aparencia, type PremiumVestido } from './aparencia';
import { pecasVestidas, type FantasiaVestida, type PecaFantasia, type TipoPeca } from './fantasias';

/** Peças de fantasia que ocupam as costas (onde vai a capa de estrelas). */
export const PECAS_DAS_COSTAS: readonly TipoPeca[] = [
  'capa',
  'capa-curta',
  'capa-folhas',
  'traje-espacial',
];

function pecasNasCostas(a: Pick<Aparencia, 'corpo'>, f: FantasiaVestida): PecaFantasia[] {
  return pecasVestidas(f, a.corpo).filter((p) => PECAS_DAS_COSTAS.includes(p.tipo));
}

/** Os tesouros vestidos que saem quando a criança escolhe esta fantasia (ou peça dela). */
export function tesourosQueSaem(
  a: Pick<Aparencia, 'corpo' | 'fantasia'>,
  vestidos: Readonly<PremiumVestido> | undefined,
): string[] {
  if (!a.fantasia || !vestidos) return [];
  const out: string[] = [];
  if (vestidos.roupa) out.push(vestidos.roupa);
  if (vestidos.fantasia) out.push(vestidos.fantasia);
  if (vestidos.costas && pecasNasCostas(a, a.fantasia).length) out.push(vestidos.costas);
  return out;
}

/**
 * A aparência depois de vestir o tesouro `id` por cima da fantasia: sem ela (roupa inteira) ou
 * sem a peça das costas. Sem briga, devolve a mesma aparência (o mesmo objeto).
 */
export function aoVestirTesouro(a: Aparencia, id: string): Aparencia {
  const p = premiumPorId(id);
  if (!p || !a.fantasia) return a;
  if (p.categoria === 'roupa' || p.categoria === 'fantasia') return tirarFantasia(a);
  if (p.categoria !== 'costas') return a;
  const costas = pecasNasCostas(a, a.fantasia);
  if (!costas.length) return a;
  if (costas.some((c) => !c.opcional)) return tirarFantasia(a);
  const sem = [...new Set([...(a.fantasia.sem ?? []), ...costas.map((c) => c.tipo)])];
  return { ...a, fantasia: { ...a.fantasia, sem } };
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
