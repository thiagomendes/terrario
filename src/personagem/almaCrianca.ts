/**
 * Spec 023 (T02): o perfil da criança no aparelho (`terrario:alma-crianca`, ao lado de
 * `terrario:aparencia`): a carteira de moedinhas, o XP, as habilidades, as fantasias ganhas nas
 * missões e os premium. Vale em todo mundo; até a 024 mora aqui, e aí vai para a conta da
 * família (o formato guardado é o `PerfilAlma` com `versao`, pronto para a migração).
 *
 * O aparelho nunca inventa ganho: só aplica o que o núcleo mandou (evento `alma`), desconta o
 * preço que o núcleo confirmou (evento `almaCompra`) e cuida da lojinha premium (a carteira é
 * do aparelho até a 024). Cada mudança relê o guardado antes (duas abas não apagam uma à outra).
 */
import {
  aplicarGanho,
  comprarPremium,
  descontar,
  nivelDoXp,
  normalizarPerfilAlma,
  perfilAlmaVazio,
  vestirPremium,
  type Ganho,
  type MudancaPerfil,
  type PerfilAlma,
  type RecusaPremium,
} from '../jogo/alma';
import type { Armazenamento } from './persistencia';

export const CHAVE_ALMA_CRIANCA = 'terrario:alma-crianca';
/**
 * Spec 036: os ids de todo premium comprado neste aparelho, à parte do perfil. O código de antes
 * da 036 não conhece esta chave e nunca a toca: se o site voltar atrás, ele joga fora do perfil
 * o item que não conhece, mas o id continua aqui, e o site de novo o devolve ao ler (as duas
 * chaves se unem na leitura). Só cresce: o que foi comprado não sai.
 */
export const CHAVE_ALMA_COMPRADOS = 'terrario:alma-comprados';
export const VERSAO_COMPRADOS = 1;
/** Teto da lista à parte (os 18 de hoje, os que vierem e folga). */
export const MAX_COMPRADOS = 128;

function lerComprados(armazenamento: Armazenamento): string[] {
  try {
    const bruto = armazenamento.getItem(CHAVE_ALMA_COMPRADOS);
    if (typeof bruto !== 'string' || !bruto) return [];
    const dado: unknown = JSON.parse(bruto);
    const ids = Array.isArray(dado) ? dado : (dado as { ids?: unknown } | null)?.ids;
    return Array.isArray(ids)
      ? ids.filter((i): i is string => typeof i === 'string').slice(0, MAX_COMPRADOS)
      : [];
  } catch {
    return [];
  }
}

export function carregarPerfilAlma(armazenamento: Armazenamento | null): PerfilAlma {
  if (!armazenamento) return perfilAlmaVazio();
  let guardado: unknown;
  try {
    const bruto = armazenamento.getItem(CHAVE_ALMA_CRIANCA);
    guardado = typeof bruto === 'string' ? JSON.parse(bruto) : undefined;
  } catch {
    guardado = undefined;
  }
  const comprados = lerComprados(armazenamento);
  if (!comprados.length) return normalizarPerfilAlma(guardado);
  // os comprados à parte entram no perfil (o perfil guardado vem primeiro, na ordem dele)
  const base =
    guardado && typeof guardado === 'object' && !Array.isArray(guardado)
      ? (guardado as Record<string, unknown>)
      : {};
  const premium = Array.isArray(base.premium) ? base.premium : [];
  return normalizarPerfilAlma({ ...base, premium: [...premium, ...comprados] });
}

export function salvarPerfilAlma(armazenamento: Armazenamento | null, p: PerfilAlma): boolean {
  if (!armazenamento) return false;
  try {
    const limpo = normalizarPerfilAlma(p);
    armazenamento.setItem(CHAVE_ALMA_CRIANCA, JSON.stringify(limpo));
    // a lista à parte só ganha (o que já estava nela fica, mesmo que o perfil não tenha)
    const ids = lerComprados(armazenamento);
    const antes = ids.length;
    for (const id of [...limpo.premium, ...limpo.depois])
      if (!ids.includes(id) && ids.length < MAX_COMPRADOS) ids.push(id);
    if (ids.length !== antes)
      armazenamento.setItem(
        CHAVE_ALMA_COMPRADOS,
        JSON.stringify({ versao: VERSAO_COMPRADOS, ids }),
      );
    return true;
  } catch {
    return false;
  }
}

/** Uma mudança do perfil: o que entrou (ganho) ou saiu (compra), para o HUD e as festas. */
export type AvisoPerfil =
  | { tipo: 'ganho'; mudanca: MudancaPerfil }
  | { tipo: 'gasto'; preco: number; item: string }
  | { tipo: 'premium'; id: string };

export interface PerfilCrianca {
  /** Cópia do perfil de agora. */
  readonly perfil: PerfilAlma;
  /** Soma o ganho que o núcleo mandou (e as fantasias das missões concluídas). */
  aplicarGanho(g: Ganho, fantasias?: readonly string[]): MudancaPerfil;
  /** Desconta o preço da banca que o núcleo confirmou. */
  descontarBanca(item: string, preco: number): void;
  /** Lojinha premium: compra (com a carteira do aparelho, até a 024). */
  comprarPremium(id: string): { ok: true } | { ok: false; motivo: RecusaPremium };
  vestirPremium(id: string, vestir: boolean): boolean;
  /** Avisa a cada mudança (o HUD, as festas). Devolve o "parar de ouvir". */
  ouvir(f: (p: PerfilAlma, aviso: AvisoPerfil) => void): () => void;
}

export function criarPerfilCrianca(armazenamento: Armazenamento | null): PerfilCrianca {
  // sem armazenamento (aba privada), o perfil vive só nesta página
  let memoria = carregarPerfilAlma(armazenamento);
  const ouvintes = new Set<(p: PerfilAlma, aviso: AvisoPerfil) => void>();
  const ler = () => (armazenamento ? carregarPerfilAlma(armazenamento) : memoria);
  function mudar<T>(f: (p: PerfilAlma) => T, aviso: (r: T) => AvisoPerfil | null): T {
    const p = ler();
    const r = f(p);
    memoria = normalizarPerfilAlma(p);
    salvarPerfilAlma(armazenamento, memoria);
    const a = aviso(r);
    if (a) for (const o of ouvintes) o(normalizarPerfilAlma(memoria), a);
    return r;
  }
  return {
    get perfil() {
      return normalizarPerfilAlma(ler());
    },
    aplicarGanho: (g, fantasias = []) =>
      mudar(
        (p) => aplicarGanho(p, g, fantasias),
        (m) => ({ tipo: 'ganho', mudanca: m }),
      ),
    descontarBanca: (item, preco) =>
      mudar(
        (p) => descontar(p, preco),
        () => ({ tipo: 'gasto', preco, item }),
      ),
    comprarPremium: (id) =>
      mudar(
        (p) => comprarPremium(p, id),
        (r) => (r.ok ? { tipo: 'premium', id } : null),
      ),
    vestirPremium: (id, vestir) =>
      mudar(
        (p) => vestirPremium(p, id, vestir),
        (r) => (r ? { tipo: 'premium', id } : null),
      ),
    ouvir(f) {
      ouvintes.add(f);
      return () => ouvintes.delete(f);
    },
  };
}

/**
 * O nível da criança neste aparelho (a roda de gestos, as tintas e os enfeites leem daqui, sem
 * depender de quem criou o perfil). Sem perfil (prévia, testes), nível 1.
 */
export function nivelDaCrianca(): number {
  const p = (globalThis as { __almaCrianca?: PerfilCrianca }).__almaCrianca?.perfil;
  return p ? nivelDoXp(p.xp).nivel : 1;
}

/** Os presentes de nível que mudam a aparência (os amigos veem): etiqueta e balão. */
export function enfeitesDoNivel(nivel: number): { etiqueta?: 'cor' | 'estrela'; balao?: 'estrela' } {
  return {
    etiqueta: nivel >= 7 ? 'estrela' : nivel >= 2 ? 'cor' : undefined,
    balao: nivel >= 6 ? 'estrela' : undefined,
  };
}
