/**
 * Spec 038: uma cópia congelada das regras da `VERSAO_REDE` 18 de antes da moto dourada (a `main`
 * a217838, 26 nov 2026, com a 036 e a 037 no ar): o catálogo premium de 18 itens e 7 categorias,
 * os renomeados, o lugar dividido, o `normalizarPremium`, o `normalizarAparencia` (com o
 * `montado`), o `sanearAparencia` do servidor e, do aparelho, o `normalizarPerfilAlma` (com a
 * lista de "depois") e o carregar e salvar do perfil (com a chave à parte dos comprados).
 *
 * Não muda nunca: é a prova de que a 038 não precisa subir a versão da rede (um servidor ou um
 * site de antes lê o que a 038 manda e guarda, descarta só a moto e segue). Só os pedaços que a
 * 038 não toca (as paletas, os modelos, a fantasia, os desbloqueios) vêm do código de agora.
 */
import {
  ACESSORIOS,
  CORPOS,
  ESTILOS_CABELO,
  ESTILOS_ROSTO,
  ESTILOS_ROUPA,
  MAXIMO_DESBLOQUEIOS,
  PALETAS,
  TAMANHO_MAXIMO_NOME,
  aparenciaPadrao,
  ehDesbloqueio,
  ehModeloId,
  type Acessorio,
  type Corpo,
} from '../../src/personagem/aparencia';
import { normalizarFantasia } from '../../src/personagem/fantasias';
import { IDS_HABILIDADE, MAX_FANTASIAS_ALMA, MAX_MOEDAS } from '../../src/jogo/alma';

type Cat037 = 'roupa' | 'costas' | 'fantasia' | 'bicho' | 'andar' | 'chapeu' | 'mao';
const CATEGORIAS_037: readonly Cat037[] = [
  'roupa',
  'costas',
  'fantasia',
  'bicho',
  'andar',
  'chapeu',
  'mao',
];
/** O catálogo da a217838, na ordem dele (o id e a categoria: é o que as regras leem). */
const PREMIUM_037: Readonly<Record<string, Cat037>> = {
  'camiseta-aquario': 'roupa',
  'tenis-cometa': 'roupa',
  'capa-estrelas': 'costas',
  dragao: 'fantasia',
  pinguim: 'bicho',
  unicornio: 'bicho',
  'patinete-luz': 'andar',
  'carrinho-pedal': 'andar',
  bicicletinha: 'andar',
  'nuvem-fofa': 'andar',
  'passarinho-ombro': 'bicho',
  'bone-helice': 'chapeu',
  'pijama-nuvem': 'roupa',
  'asas-borboleta': 'costas',
  'mochila-foguete': 'costas',
  'varinha-bolhas': 'mao',
  'guarda-chuva-gotinhas': 'mao',
  'pipa-lacinhos': 'mao',
};
export const IDS_PREMIUM_037: readonly string[] = Object.keys(PREMIUM_037);
const RENOMEADOS_037: Readonly<Record<string, string>> = {
  'camiseta-arco-iris': 'camiseta-aquario',
};
const LUGAR_DIVIDIDO_037: Readonly<Partial<Record<Cat037, readonly Cat037[]>>> = {
  fantasia: ['costas', 'chapeu'],
  costas: ['fantasia'],
  chapeu: ['fantasia'],
};
const idAtual037 = (id: string) =>
  Object.hasOwn(RENOMEADOS_037, id) ? RENOMEADOS_037[id] : id;
const categoria037 = (id: string): Cat037 | undefined =>
  Object.hasOwn(PREMIUM_037, id) ? PREMIUM_037[id] : undefined;

export function normalizarPremium037(valor: unknown): Record<string, string> | undefined {
  if (typeof valor !== 'object' || valor === null || Array.isArray(valor)) return undefined;
  const v = valor as Record<string, unknown>;
  const out: Record<string, string> = {};
  for (const cat of CATEGORIAS_037) {
    const bruto = v[cat];
    if (typeof bruto !== 'string') continue;
    const id = idAtual037(bruto);
    if (categoria037(id) === cat) out[cat] = id;
  }
  if (out.fantasia) for (const cat of LUGAR_DIVIDIDO_037.fantasia ?? []) delete out[cat];
  return Object.keys(out).length ? out : undefined;
}

function limparNome(valor: unknown): string {
  if (typeof valor !== 'string') return '';
  return valor.trim().slice(0, TAMANHO_MAXIMO_NOME).trim();
}
function indice(valor: unknown, tamanho: number, padrao: number): number {
  const ok = typeof valor === 'number' && Number.isInteger(valor) && valor >= 0 && valor < tamanho;
  return ok ? valor : padrao;
}
function limparDesbloqueios(valor: unknown): string[] {
  if (!Array.isArray(valor)) return [];
  const lista: string[] = [];
  for (const v of valor) {
    if (lista.length >= MAXIMO_DESBLOQUEIOS) break;
    if (ehDesbloqueio(v) && !lista.includes(v)) lista.push(v);
  }
  return lista;
}

/** O `normalizarAparencia` de antes: o site de antes desenha o amigo com isto. */
export function normalizarAparencia037(entrada: unknown): Record<string, unknown> {
  const obj: Record<string, unknown> =
    typeof entrada === 'object' && entrada !== null ? (entrada as Record<string, unknown>) : {};
  const base = aparenciaPadrao(ehModeloId(obj.modelo) ? obj.modelo : 'andarilho');
  const a: Record<string, unknown> = {
    nome: limparNome(obj.nome),
    modelo: base.modelo,
    pele: indice(obj.pele, PALETAS.pele.length, base.pele),
    corpo: CORPOS.includes(obj.corpo as Corpo) ? (obj.corpo as Corpo) : base.corpo,
    rosto: indice(obj.rosto, ESTILOS_ROSTO, base.rosto),
    cabeloEstilo: indice(obj.cabeloEstilo, ESTILOS_CABELO, base.cabeloEstilo),
    cabeloCor: indice(obj.cabeloCor, PALETAS.cabelo.length, base.cabeloCor),
    roupaEstilo: indice(obj.roupaEstilo, ESTILOS_ROUPA, base.roupaEstilo),
    roupaCor: indice(obj.roupaCor, PALETAS.roupa.length, base.roupaCor),
    calcaCor: indice(obj.calcaCor, PALETAS.calca.length, base.calcaCor),
    acessorio: ACESSORIOS.includes(obj.acessorio as Acessorio)
      ? (obj.acessorio as Acessorio)
      : base.acessorio,
  };
  const fantasia = normalizarFantasia(obj.fantasia, a.corpo as Corpo);
  if (fantasia) a.fantasia = fantasia;
  const desbloqueios = limparDesbloqueios(obj.desbloqueios);
  if (desbloqueios.length) a.desbloqueios = desbloqueios;
  const premium = normalizarPremium037(obj.premium);
  if (premium) a.premium = premium;
  if (obj.patins === true) a.patins = true;
  else if (obj.skate === true) a.skate = true;
  if (obj.montado === true && premium?.andar && !a.patins && !a.skate) a.montado = true;
  if (obj.etiqueta === 'cor' || obj.etiqueta === 'estrela') a.etiqueta = obj.etiqueta;
  if (obj.balao === 'estrela') a.balao = 'estrela';
  return a;
}

/** O `sanearAparencia` do servidor de antes (null: o jogador entra sem aparência). */
export function sanearAparencia037(a: unknown): Record<string, unknown> | null {
  if (!a || typeof a !== 'object' || Array.isArray(a)) return null;
  if (JSON.stringify(a).length > 4096) return null;
  const out: Record<string, unknown> = { ...normalizarAparencia037(a) };
  delete out.desbloqueios;
  return out;
}

const r2 = (v: number) => Math.round(v * 100) / 100;
const objeto = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v);
const numero = (v: unknown, max = 1e7) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.min(max, n)) : 0;
};
const MAX_DEPOIS_037 = 64;
const bemFormado037 = (v: unknown): v is string =>
  typeof v === 'string' && v.length <= 40 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v);

function separarComprados037(...listas: unknown[]): { premium: string[]; depois: string[] } {
  const premium: string[] = [];
  const depois: string[] = [];
  for (const lista of listas) {
    if (!Array.isArray(lista)) continue;
    for (const bruto of lista) {
      if (typeof bruto !== 'string') continue;
      const id = idAtual037(bruto);
      if (categoria037(id)) {
        if (!premium.includes(id)) premium.push(id);
      } else if (bemFormado037(id) && !depois.includes(id) && depois.length < MAX_DEPOIS_037)
        depois.push(id);
    }
  }
  return { premium, depois };
}

/** O `normalizarPerfilAlma` do aparelho de antes (o site que voltou atrás lê e grava com ele). */
export function normalizarPerfilAlma037(v: unknown): Record<string, unknown> & {
  premium: string[];
  depois: string[];
  vestidos: Record<string, string>;
} {
  const c = {
    versao: 1,
    moedas: 0,
    xp: 0,
    pontos: {} as Record<string, number>,
    premium: [] as string[],
    vestidos: {} as Record<string, string>,
    depois: [] as string[],
    fantasias: [] as string[],
    ganhou: 0,
    gastou: 0,
  };
  if (!objeto(v)) return c;
  c.moedas = Math.floor(numero(v.moedas, MAX_MOEDAS));
  c.xp = r2(numero(v.xp));
  if (objeto(v.pontos))
    for (const h of IDS_HABILIDADE)
      if (v.pontos[h] !== undefined) c.pontos[h] = r2(numero(v.pontos[h]));
  const comprados = separarComprados037(v.premium, v.depois);
  c.premium = comprados.premium;
  c.depois = comprados.depois;
  if (objeto(v.vestidos))
    for (const [cat, bruto] of Object.entries(v.vestidos)) {
      if (typeof bruto !== 'string') continue;
      const id = idAtual037(bruto);
      if (c.premium.includes(id) && categoria037(id) === cat) c.vestidos[cat] = id;
    }
  if (c.vestidos.fantasia) for (const cat of LUGAR_DIVIDIDO_037.fantasia ?? []) delete c.vestidos[cat];
  c.fantasias = Array.isArray(v.fantasias)
    ? [
        ...new Set(v.fantasias.filter((f): f is string => typeof f === 'string' && f.length <= 40)),
      ].slice(0, MAX_FANTASIAS_ALMA)
    : [];
  c.ganhou = Math.floor(numero(v.ganhou, 1e9));
  c.gastou = Math.floor(numero(v.gastou, 1e9));
  return c;
}

// ------------------------------------------------------------------ o perfil no aparelho de antes
interface Loja037 {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
}
const CHAVE_PERFIL_037 = 'terrario:alma-crianca';
const CHAVE_COMPRADOS_037 = 'terrario:alma-comprados';
const MAX_COMPRADOS_037 = 128;

function lerComprados037(loja: Loja037): string[] {
  try {
    const bruto = loja.getItem(CHAVE_COMPRADOS_037);
    if (typeof bruto !== 'string' || !bruto) return [];
    const dado: unknown = JSON.parse(bruto);
    const ids = Array.isArray(dado) ? dado : (dado as { ids?: unknown } | null)?.ids;
    return Array.isArray(ids) ? ids.filter(bemFormado037).slice(0, MAX_COMPRADOS_037) : [];
  } catch {
    return [];
  }
}

/** O `carregarPerfilAlma` do site de antes. */
export function carregarPerfilAlma037(loja: Loja037): ReturnType<typeof normalizarPerfilAlma037> {
  let guardado: unknown;
  try {
    const bruto = loja.getItem(CHAVE_PERFIL_037);
    guardado = typeof bruto === 'string' ? JSON.parse(bruto) : undefined;
  } catch {
    guardado = undefined;
  }
  const comprados = lerComprados037(loja);
  if (!comprados.length) return normalizarPerfilAlma037(guardado);
  const base = objeto(guardado) ? guardado : {};
  const premium = Array.isArray(base.premium) ? base.premium : [];
  return normalizarPerfilAlma037({ ...base, premium: [...premium, ...comprados] });
}

/** O `salvarPerfilAlma` do site de antes (a lista à parte só ganha). */
export function salvarPerfilAlma037(loja: Loja037, p: unknown): void {
  const limpo = normalizarPerfilAlma037(p);
  loja.setItem(CHAVE_PERFIL_037, JSON.stringify(limpo));
  const ids = lerComprados037(loja);
  const antes = ids.length;
  for (const id of [...limpo.premium, ...limpo.depois])
    if (!ids.includes(id) && ids.length < MAX_COMPRADOS_037) ids.push(id);
  if (ids.length !== antes) loja.setItem(CHAVE_COMPRADOS_037, JSON.stringify({ versao: 1, ids }));
}
