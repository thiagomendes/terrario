/**
 * Spec 036: uma cópia congelada das regras da `VERSAO_REDE` 18 de antes da lojinha maior (a
 * `main` ff958e3, 24 nov 2026): o catálogo premium de 6 itens e 4 categorias, o
 * `normalizarPremium`, o `normalizarAparencia`, o `sanearAparencia` do servidor e o
 * `normalizarPerfilAlma` do aparelho. É o que um navegador ou um servidor de antes roda.
 *
 * Não muda nunca: é a prova de que a 036 não precisa subir a versão da rede (um de antes lê o
 * que a 036 manda e guarda, descarta o que não conhece, e segue). Só os pedaços que a 036 não
 * tocou (as paletas, os modelos, a fantasia, os desbloqueios) vêm do código de agora.
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

type Cat18 = 'roupa' | 'costas' | 'fantasia' | 'bicho';
const CATEGORIAS_18: readonly Cat18[] = ['roupa', 'costas', 'fantasia', 'bicho'];
const PREMIUM_18: Readonly<Record<string, Cat18>> = {
  'camiseta-aquario': 'roupa',
  'tenis-cometa': 'roupa',
  'capa-estrelas': 'costas',
  dragao: 'fantasia',
  pinguim: 'bicho',
  unicornio: 'bicho',
};
const RENOMEADOS_18: Readonly<Record<string, string>> = {
  'camiseta-arco-iris': 'camiseta-aquario',
};
const idAtual18 = (id: string) => (Object.hasOwn(RENOMEADOS_18, id) ? RENOMEADOS_18[id] : id);
const categoria18 = (id: string): Cat18 | undefined =>
  Object.hasOwn(PREMIUM_18, id) ? PREMIUM_18[id] : undefined;

export function normalizarPremium18(valor: unknown): Record<string, string> | undefined {
  if (typeof valor !== 'object' || valor === null || Array.isArray(valor)) return undefined;
  const v = valor as Record<string, unknown>;
  const out: Record<string, string> = {};
  for (const cat of CATEGORIAS_18) {
    const bruto = v[cat];
    if (typeof bruto !== 'string') continue;
    const id = idAtual18(bruto);
    if (categoria18(id) === cat) out[cat] = id;
  }
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

export function normalizarAparencia18(entrada: unknown): Record<string, unknown> {
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
  const premium = normalizarPremium18(obj.premium);
  if (premium) a.premium = premium;
  if (obj.patins === true) a.patins = true;
  else if (obj.skate === true) a.skate = true;
  if (obj.etiqueta === 'cor' || obj.etiqueta === 'estrela') a.etiqueta = obj.etiqueta;
  if (obj.balao === 'estrela') a.balao = 'estrela';
  return a;
}

/** O `sanearAparencia` do servidor 18 de antes (null: o jogador entra sem aparência). */
export function sanearAparencia18(a: unknown): Record<string, unknown> | null {
  if (!a || typeof a !== 'object' || Array.isArray(a)) return null;
  if (JSON.stringify(a).length > 4096) return null;
  const out: Record<string, unknown> = { ...normalizarAparencia18(a) };
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

/** O `normalizarPerfilAlma` do aparelho de antes (o site que voltou atrás lê e grava com ele). */
export function normalizarPerfilAlma18(v: unknown): Record<string, unknown> {
  const c = {
    versao: 1,
    moedas: 0,
    xp: 0,
    pontos: {} as Record<string, number>,
    premium: [] as string[],
    vestidos: {} as Record<string, string>,
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
  c.premium = Array.isArray(v.premium)
    ? [
        ...new Set(
          v.premium
            .filter((p): p is string => typeof p === 'string')
            .map(idAtual18)
            .filter((p) => !!categoria18(p)),
        ),
      ]
    : [];
  if (objeto(v.vestidos))
    for (const [cat, bruto] of Object.entries(v.vestidos)) {
      if (typeof bruto !== 'string') continue;
      const id = idAtual18(bruto);
      if (c.premium.includes(id) && categoria18(id) === cat) c.vestidos[cat] = id;
    }
  if (c.vestidos.fantasia) delete c.vestidos.costas;
  c.fantasias = Array.isArray(v.fantasias)
    ? [
        ...new Set(v.fantasias.filter((f): f is string => typeof f === 'string' && f.length <= 40)),
      ].slice(0, MAX_FANTASIAS_ALMA)
    : [];
  c.ganhou = Math.floor(numero(v.ganhou, 1e9));
  c.gastou = Math.floor(numero(v.gastou, 1e9));
  return c;
}
