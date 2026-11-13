/**
 * Esboço da spec 023: o estado de missões, moedinhas, habilidades e lojinha de UM mundo, para
 * UMA criança. Puro (sem DOM): no esboço mora no aparelho (localStorage, atrás do
 * `?esboco=alma`); na implementação de verdade, a mesma lógica mora no núcleo (`criarNucleo`),
 * que já é quem confere tudo no aparelho e na nuvem, e o cliente só mostra.
 *
 * Regras:
 * - toda missão aberta conta, esteja ou não "fixada" no HUD (nada se perde por escolher outra);
 * - nada expira e nada cai sozinho (sem prazo, sem sequência de dias);
 * - o prêmio sai sempre igual ao mostrado antes (moedinhas fixas, fantasia fixa);
 * - comprar só gasta as moedinhas deste mundo, por um preço fixo; nunca há troca entre jogadores.
 */
import {
  HABILIDADES,
  MISSOES_ABERTAS,
  MOEDAS_BIS,
  PONTOS_POR_MISSAO,
  lojaDoMundo,
  missoesDoMundo,
  nivelDe,
  type IdHabilidade,
  type ItemLoja,
  type Missao,
  type MundoAlma,
} from './dados';

export interface EstadoAlma {
  moedas: number;
  /** Missões feitas (ids), na ordem em que foram feitas. */
  feitas: string[];
  /** A missão fixada no HUD (a criança escolhe; null: nenhuma). */
  fixada: string | null;
  /** Progresso bruto de cada missão aberta (contagem ou fração de obra). */
  progresso: Record<string, number>;
  /** Pontos de cada habilidade (deste mundo). */
  pontos: Partial<Record<IdHabilidade, number>>;
  /** Itens comprados ou ganhos de presente (ids da lojinha). */
  meus: string[];
  /** Fantasias ganhas (vão com a criança para qualquer mundo, como o capacete da 014). */
  fantasias: string[];
  /** Quantas missões de bis foram feitas (depois de completar a lista). */
  bis: number;
}

export type EventoAlma =
  | { tipo: 'progresso'; missao: Missao; fracao: number }
  | { tipo: 'concluiu'; missao: Missao; moedas: number; fantasia?: string; bis?: boolean }
  | { tipo: 'nivel'; habilidade: IdHabilidade; nivel: number; libera: string };

export function estadoVazio(): EstadoAlma {
  return { moedas: 0, feitas: [], fixada: null, progresso: {}, pontos: {}, meus: [], fantasias: [], bis: 0 };
}

/** Lê o que veio guardado (ou da rede), jogando fora o que não conhece. */
export function normalizarEstado(v: unknown, mundo: MundoAlma): EstadoAlma {
  const e = estadoVazio();
  if (!v || typeof v !== 'object') return e;
  const o = v as Partial<EstadoAlma>;
  const ids = new Set(missoesDoMundo(mundo).map((m) => m.id));
  const loja = new Set(lojaDoMundo(mundo).map((i) => i.id));
  e.moedas = Math.max(0, Math.min(999, Math.floor(Number(o.moedas) || 0)));
  e.feitas = Array.isArray(o.feitas) ? o.feitas.filter((id) => ids.has(id)) : [];
  e.fixada = typeof o.fixada === 'string' && ids.has(o.fixada) ? o.fixada : null;
  if (o.progresso && typeof o.progresso === 'object')
    for (const [k, n] of Object.entries(o.progresso))
      if (ids.has(k) && Number.isFinite(n)) e.progresso[k] = Math.max(0, Number(n));
  if (o.pontos && typeof o.pontos === 'object')
    for (const h of HABILIDADES[mundo])
      if (Number.isFinite(o.pontos[h.id])) e.pontos[h.id] = Math.max(0, Number(o.pontos[h.id]));
  e.meus = Array.isArray(o.meus) ? o.meus.filter((id) => loja.has(id)) : [];
  e.fantasias = Array.isArray(o.fantasias) ? o.fantasias.filter((f) => typeof f === 'string') : [];
  e.bis = Math.max(0, Math.floor(Number(o.bis) || 0));
  return e;
}

/** Meta de uma missão (as de obra contam a fração, 0 a 1). */
export function metaDa(m: Missao): number {
  return m.conta.tipo === 'evento' ? m.conta.meta : m.conta.tipo === 'lugares' ? m.conta.usos.length : 1;
}

export function fracaoDa(e: EstadoAlma, m: Missao): number {
  if (e.feitas.includes(m.id)) return 1;
  return Math.min(1, (e.progresso[m.id] ?? 0) / metaDa(m));
}

/**
 * As missões abertas: as MISSOES_ABERTAS primeiras não feitas, na ordem da lista, mais as
 * "devagar" já começadas (elas esperam a natureza e correm por baixo das outras).
 */
export function abertas(e: EstadoAlma, mundo: MundoAlma): Missao[] {
  const faltam = missoesDoMundo(mundo).filter((m) => !e.feitas.includes(m.id));
  const primeiras = faltam.slice(0, MISSOES_ABERTAS);
  const devagar = faltam.filter((m) => m.devagar && !primeiras.includes(m) && (e.progresso[m.id] ?? 0) > 0);
  return [...primeiras, ...devagar];
}

/** A missão fixada no HUD, se ainda aberta; senão a primeira aberta. */
export function missaoDoHud(e: EstadoAlma, mundo: MundoAlma): Missao | null {
  const lista = abertas(e, mundo);
  return lista.find((m) => m.id === e.fixada) ?? lista[0] ?? null;
}

export function nivelDaHabilidade(e: EstadoAlma, mundo: MundoAlma, id: IdHabilidade) {
  const h = HABILIDADES[mundo].find((x) => x.id === id)!;
  return { h, ...nivelDe(h, e.pontos[id] ?? 0) };
}

/** Item liberado na prateleira (sem cadeado)? */
export function liberado(e: EstadoAlma, mundo: MundoAlma, item: ItemLoja): boolean {
  if (!item.precisa) return true;
  return nivelDaHabilidade(e, mundo, item.precisa.habilidade).nivel >= item.precisa.nivel;
}

function somarPontos(e: EstadoAlma, mundo: MundoAlma, id: IdHabilidade, qtd: number, ev: EventoAlma[]) {
  const antes = nivelDaHabilidade(e, mundo, id).nivel;
  e.pontos[id] = (e.pontos[id] ?? 0) + qtd;
  const { h, nivel } = nivelDaHabilidade(e, mundo, id);
  for (let n = antes + 1; n <= nivel; n++) {
    const libera = h.niveis[n - 1].libera;
    // presente de nível: vai direto para a criança (não passa pela lojinha)
    const item = lojaDoMundo(mundo).find((i) => i.id === libera);
    if (item?.presente && !e.meus.includes(item.id)) e.meus.push(item.id);
    ev.push({ tipo: 'nivel', habilidade: id, nivel: n, libera });
  }
}

function concluir(e: EstadoAlma, mundo: MundoAlma, m: Missao, ev: EventoAlma[]) {
  e.feitas.push(m.id);
  delete e.progresso[m.id];
  e.moedas += m.moedas;
  if (m.fantasia && !e.fantasias.includes(m.fantasia)) e.fantasias.push(m.fantasia);
  if (e.fixada === m.id) e.fixada = null;
  ev.push({ tipo: 'concluiu', missao: m, moedas: m.moedas, fantasia: m.fantasia });
  somarPontos(e, mundo, m.habilidade, PONTOS_POR_MISSAO, ev);
}

/**
 * Um evento do jogo (a mesma chave do diário: 'colheu', 'plantou', 'criou:coelho'...).
 * Conta nas missões abertas daquele tipo e nos pontos das habilidades. Muda `e`.
 */
export function registrar(e: EstadoAlma, mundo: MundoAlma, chave: string, qtd = 1): EventoAlma[] {
  const ev: EventoAlma[] = [];
  for (const m of abertas(e, mundo)) {
    if (m.conta.tipo !== 'evento' || m.conta.chave !== chave) continue;
    e.progresso[m.id] = Math.min(m.conta.meta, (e.progresso[m.id] ?? 0) + qtd);
    if (e.progresso[m.id] >= m.conta.meta) concluir(e, mundo, m, ev);
    else ev.push({ tipo: 'progresso', missao: m, fracao: fracaoDa(e, m) });
  }
  const pontos = PONTOS_DE_EVENTO[mundo][chave];
  if (pontos) somarPontos(e, mundo, pontos[0], pontos[1] * qtd, ev);
  return ev;
}

/** Ações soltas que fazem a habilidade subir (fora a missão feita). */
const PONTOS_DE_EVENTO: Record<MundoAlma, Record<string, [IdHabilidade, number]>> = {
  'cidade-grande': {
    'obra:bloco': ['construtor', 0.2],
    'visitou:lugar': ['explorador', 1],
    'carinho': ['bichos', 1],
    'colocou:flor': ['fazendeiro', 1],
    'trocou:cozinheiro': ['mundo', 1],
    'trocou:ferreiro': ['mundo', 1],
    'trocou:construtor': ['mundo', 1],
  },
  'rancho-alegre': {
    colocou: ['construtor', 0.1],
    'visitou:lugar': ['explorador', 1],
    'criou:coelho': ['bichos', 1],
    'criou:cervo': ['bichos', 1],
    colheu: ['fazendeiro', 0.5],
    'colheu:minha': ['fazendeiro', 0.5],
    'fabricou:pao': ['mundo', 1],
    'fundiu:pipoca': ['mundo', 1],
  },
};

/** Obra e lugares: o progresso vem pronto (fração da obra, ou quantos lugares). */
export function definirProgresso(e: EstadoAlma, mundo: MundoAlma, id: string, valor: number): EventoAlma[] {
  const m = abertas(e, mundo).find((x) => x.id === id);
  if (!m) return [];
  const ev: EventoAlma[] = [];
  const meta = metaDa(m);
  const antes = e.progresso[id] ?? 0;
  if (valor <= antes) return ev;
  e.progresso[id] = Math.min(meta, valor);
  if (e.progresso[id] >= meta) concluir(e, mundo, m, ev);
  else ev.push({ tipo: 'progresso', missao: m, fracao: fracaoDa(e, m) });
  return ev;
}

/** Depois de toda a lista: uma missão de bis (as mesmas, de novo), só com moedinhas. */
export function concluirBis(e: EstadoAlma, mundo: MundoAlma, id: string): EventoAlma[] {
  const m = missoesDoMundo(mundo).find((x) => x.id === id);
  if (!m || abertas(e, mundo).length > 0) return [];
  e.bis++;
  e.moedas += MOEDAS_BIS;
  return [{ tipo: 'concluiu', missao: m, moedas: MOEDAS_BIS, bis: true }];
}

export type RecusaCompra = 'nao-existe' | 'trancado' | 'ja-tem' | 'presente' | 'faltam-moedas';

/** Compra por preço fixo: só com moedinhas deste mundo, só item liberado. Muda `e`. */
export function comprar(e: EstadoAlma, mundo: MundoAlma, id: string): { ok: true } | { ok: false; motivo: RecusaCompra } {
  const item = lojaDoMundo(mundo).find((i) => i.id === id);
  if (!item) return { ok: false, motivo: 'nao-existe' };
  if (item.presente) return { ok: false, motivo: 'presente' };
  if (!liberado(e, mundo, item)) return { ok: false, motivo: 'trancado' };
  // fantasia e bicho: um só; enfeite e item: pode comprar de novo (vem mais um pacote)
  if ((item.tipo === 'fantasia' || item.tipo === 'bicho') && e.meus.includes(id)) return { ok: false, motivo: 'ja-tem' };
  if (e.moedas < item.preco) return { ok: false, motivo: 'faltam-moedas' };
  e.moedas -= item.preco;
  if (!e.meus.includes(id)) e.meus.push(id);
  return { ok: true };
}
