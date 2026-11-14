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

export function carregarPerfilAlma(armazenamento: Armazenamento | null): PerfilAlma {
  if (!armazenamento) return perfilAlmaVazio();
  try {
    const bruto = armazenamento.getItem(CHAVE_ALMA_CRIANCA);
    return typeof bruto === 'string' ? normalizarPerfilAlma(JSON.parse(bruto)) : perfilAlmaVazio();
  } catch {
    return perfilAlmaVazio();
  }
}

export function salvarPerfilAlma(armazenamento: Armazenamento | null, p: PerfilAlma): boolean {
  if (!armazenamento) return false;
  try {
    armazenamento.setItem(CHAVE_ALMA_CRIANCA, JSON.stringify(normalizarPerfilAlma(p)));
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
