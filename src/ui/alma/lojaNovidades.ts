/**
 * Spec 036 (T06): o que a vitrine lembra neste aparelho, numa chave própria (fora do perfil da
 * criança): a aba de andar abre primeiro na primeira visita depois da atualização, depois a
 * vitrine abre na aba em que ela estava; e a estrelinha de "novo" de cada item da 036 fica até a
 * criança abrir o detalhe dele uma vez. Nada aqui muda preço, compra ou o que ela tem: é só a
 * lembrança da vitrine (perder a chave só traz as estrelinhas de volta).
 */
import { premiumPorId, type CategoriaPremium } from '../../jogo/alma';
import type { Armazenamento } from '../../personagem/persistencia';

export const CHAVE_LOJA_NOVIDADES = 'terrario:loja-novidades';
export const VERSAO_LOJA_NOVIDADES = 1;

/** Os itens com a estrelinha de novo: os da 036 e a motoquinha dourada (038). */
export const NOVOS_036: readonly string[] = [
  'patinete-luz',
  'carrinho-pedal',
  'bicicletinha',
  'nuvem-fofa',
  'passarinho-ombro',
  'bone-helice',
  'pijama-nuvem',
  'asas-borboleta',
  'mochila-foguete',
  'varinha-bolhas',
  'guarda-chuva-gotinhas',
  'pipa-lacinhos',
  'motoquinha-dourada',
];

/** As abas da vitrine, por lugar do corpo, na ordem da tela (a de andar primeiro). */
export const ABAS_LOJA: readonly CategoriaPremium[] = [
  'andar',
  'roupa',
  'costas',
  'mao',
  'chapeu',
  'bicho',
  'fantasia',
];

interface Guardado {
  versao: number;
  /** Já abriu a vitrine depois da 036 (a aba de andar não abre mais sozinha). */
  abriu: boolean;
  /** A aba em que a vitrine estava. */
  aba?: CategoriaPremium;
  /** Os novos que ela já viu de perto (o detalhe). */
  vistos: string[];
}

function ler(arm: Armazenamento | null): Guardado {
  const vazio: Guardado = { versao: VERSAO_LOJA_NOVIDADES, abriu: false, vistos: [] };
  if (!arm) return vazio;
  try {
    const bruto = arm.getItem(CHAVE_LOJA_NOVIDADES);
    if (typeof bruto !== 'string' || !bruto) return vazio;
    const d = JSON.parse(bruto) as Partial<Guardado> | null;
    if (!d || typeof d !== 'object') return vazio;
    const aba = ABAS_LOJA.includes(d.aba as CategoriaPremium) ? (d.aba as CategoriaPremium) : undefined;
    const vistos = Array.isArray(d.vistos)
      ? d.vistos.filter((v): v is string => typeof v === 'string' && NOVOS_036.includes(v))
      : [];
    return { versao: VERSAO_LOJA_NOVIDADES, abriu: d.abriu === true, aba, vistos };
  } catch {
    return vazio;
  }
}

function gravar(arm: Armazenamento | null, g: Guardado): void {
  try {
    arm?.setItem(CHAVE_LOJA_NOVIDADES, JSON.stringify(g));
  } catch {
    // sem armazenamento: a lembrança vive só nesta página
  }
}

export interface NovidadesLoja {
  /** A aba em que a vitrine abre agora (marca que ela já abriu). */
  abrir(): CategoriaPremium;
  /** A criança trocou de aba. */
  guardarAba(aba: CategoriaPremium): void;
  /** O item ainda tem a estrelinha de novo? */
  novo(id: string): boolean;
  /** A aba tem algum item com a estrelinha? */
  abaComNovo(aba: CategoriaPremium): boolean;
  /** Ela abriu o detalhe do item: a estrelinha sai (devolve se saiu agora). */
  ver(id: string): boolean;
}

export function criarNovidadesLoja(arm: Armazenamento | null): NovidadesLoja {
  // sem armazenamento (aba privada), a lembrança vive só na memória desta página
  let memoria = ler(arm);
  const atual = () => (arm ? ler(arm) : memoria);
  const salvar = (g: Guardado) => {
    memoria = g;
    gravar(arm, g);
  };
  const novo = (id: string) => NOVOS_036.includes(id) && !atual().vistos.includes(id);
  return {
    abrir() {
      const g = atual();
      const aba: CategoriaPremium = g.abriu ? (g.aba ?? 'andar') : 'andar';
      if (!g.abriu || g.aba !== aba) salvar({ ...g, abriu: true, aba });
      return aba;
    },
    guardarAba(aba) {
      const g = atual();
      if (g.aba !== aba) salvar({ ...g, abriu: true, aba });
    },
    novo,
    abaComNovo: (aba) => NOVOS_036.some((id) => premiumPorId(id)?.categoria === aba && novo(id)),
    ver(id) {
      if (!novo(id)) return false;
      const g = atual();
      salvar({ ...g, vistos: [...g.vistos, id] });
      return true;
    },
  };
}
