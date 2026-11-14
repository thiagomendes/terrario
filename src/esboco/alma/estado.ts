/**
 * Esboço da spec 023 (rodada 2): as regras, puras (sem DOM). Dois estados:
 *
 * - `EstadoCrianca` (universal, vai com a criança para todo mundo): a carteira, o XP e o nível,
 *   as habilidades, os premium comprados e o que está vestido, as fantasias ganhas;
 * - `EstadoMundo` (de cada mundo): as missões feitas, a fixada no HUD e o progresso.
 *
 * No esboço os dois moram no aparelho (localStorage, ao lado da aparência). Na implementação de
 * verdade a mesma lógica mora no núcleo, que confere cada ganho (ver o relatório do esboço).
 *
 * Regras: toda missão aberta conta; nada expira e nada cai sozinho; o prêmio sai igual ao
 * mostrado; comprar é por preço fixo e só gasta a carteira da própria criança.
 */
import {
  BANCA,
  HABILIDADES,
  MISSOES_ABERTAS,
  MOEDAS_BIS,
  PONTOS_POR_MISSAO,
  PREMIUM,
  PRESENTES_NIVEL,
  XP_MISSAO,
  estrelasDe,
  missoesDoMundo,
  nivelDoXp,
  type CategoriaPremium,
  type IdHabilidade,
  type Missao,
  type MundoAlma,
  type PresenteNivel,
} from './dados';

export interface EstadoCrianca {
  moedas: number;
  xp: number;
  pontos: Partial<Record<IdHabilidade, number>>;
  /** Premium comprados (ids). */
  premium: string[];
  /** O premium vestido de cada categoria. */
  vestidos: Partial<Record<CategoriaPremium, string>>;
  /** Fantasias ganhas nas missões (o capacete da cidade, a caipira do Rancho...). */
  fantasias: string[];
}

export interface EstadoMundo {
  feitas: string[];
  fixada: string | null;
  progresso: Record<string, number>;
  bis: number;
}

export type EventoAlma =
  | { tipo: 'progresso'; missao: Missao; fracao: number }
  | { tipo: 'concluiu'; missao: Missao; moedas: number; fantasia?: string; bis?: boolean }
  | { tipo: 'xp'; ganho: number; xp: number }
  | { tipo: 'nivel'; nivel: number; presente?: PresenteNivel }
  | { tipo: 'estrela'; habilidade: IdHabilidade; estrelas: number };

export function criancaVazia(): EstadoCrianca {
  return { moedas: 0, xp: 0, pontos: {}, premium: [], vestidos: {}, fantasias: [] };
}
export function mundoVazio(): EstadoMundo {
  return { feitas: [], fixada: null, progresso: {}, bis: 0 };
}

const num = (v: unknown, max = 1e6) => Math.max(0, Math.min(max, Number(v) || 0));

/** Lê o que veio guardado (ou da rede), jogando fora o que não conhece. */
export function normalizarCrianca(v: unknown): EstadoCrianca {
  const c = criancaVazia();
  if (!v || typeof v !== 'object') return c;
  const o = v as Partial<EstadoCrianca>;
  c.moedas = Math.floor(num(o.moedas, 9999));
  c.xp = num(o.xp);
  for (const h of HABILIDADES)
    if (o.pontos && Number.isFinite(o.pontos[h.id])) c.pontos[h.id] = num(o.pontos[h.id]);
  const ids = new Set(PREMIUM.map((p) => p.id));
  c.premium = Array.isArray(o.premium) ? o.premium.filter((p) => ids.has(p)) : [];
  if (o.vestidos && typeof o.vestidos === 'object')
    for (const [cat, id] of Object.entries(o.vestidos))
      if (c.premium.includes(id as string) && PREMIUM.find((p) => p.id === id)?.categoria === cat)
        c.vestidos[cat as CategoriaPremium] = id as string;
  c.fantasias = Array.isArray(o.fantasias)
    ? o.fantasias.filter((f) => typeof f === 'string').slice(0, 32)
    : [];
  return c;
}

export function normalizarMundo(v: unknown, mundo: MundoAlma): EstadoMundo {
  const e = mundoVazio();
  if (!v || typeof v !== 'object') return e;
  const o = v as Partial<EstadoMundo>;
  const ids = new Set(missoesDoMundo(mundo).map((m) => m.id));
  e.feitas = Array.isArray(o.feitas) ? o.feitas.filter((id) => ids.has(id)) : [];
  e.fixada = typeof o.fixada === 'string' && ids.has(o.fixada) ? o.fixada : null;
  if (o.progresso && typeof o.progresso === 'object')
    for (const [k, n] of Object.entries(o.progresso)) if (ids.has(k)) e.progresso[k] = num(n);
  e.bis = Math.floor(num(o.bis));
  return e;
}

export function metaDa(m: Missao): number {
  return m.conta.tipo === 'evento' ? m.conta.meta : m.conta.tipo === 'lugares' ? m.conta.usos.length : 1;
}

export function fracaoDa(e: EstadoMundo, m: Missao): number {
  if (e.feitas.includes(m.id)) return 1;
  return Math.min(1, (e.progresso[m.id] ?? 0) / metaDa(m));
}

/** As missões abertas: as primeiras não feitas, mais as "devagar" já começadas. */
export function abertas(e: EstadoMundo, mundo: MundoAlma): Missao[] {
  const faltam = missoesDoMundo(mundo).filter((m) => !e.feitas.includes(m.id));
  const primeiras = faltam.slice(0, MISSOES_ABERTAS);
  const devagar = faltam.filter(
    (m) => m.devagar && !primeiras.includes(m) && (e.progresso[m.id] ?? 0) > 0,
  );
  return [...primeiras, ...devagar];
}

export function missaoDoHud(e: EstadoMundo, mundo: MundoAlma): Missao | null {
  const lista = abertas(e, mundo);
  return lista.find((m) => m.id === e.fixada) ?? lista[0] ?? null;
}

// ------------------------------------------------------------------ ganhos
function ganharXp(c: EstadoCrianca, qtd: number, ev: EventoAlma[]): void {
  if (qtd <= 0) return;
  const antes = nivelDoXp(c.xp).nivel;
  c.xp += qtd;
  ev.push({ tipo: 'xp', ganho: qtd, xp: c.xp });
  const depois = nivelDoXp(c.xp).nivel;
  for (let n = antes + 1; n <= depois; n++) {
    const presente = PRESENTES_NIVEL.find((p) => p.nivel === n);
    if (presente) c.moedas += presente.moedas;
    ev.push({ tipo: 'nivel', nivel: n, presente });
  }
}

function somarPontos(c: EstadoCrianca, id: IdHabilidade, qtd: number, ev: EventoAlma[]): void {
  const antes = estrelasDe(c.pontos[id] ?? 0).estrelas;
  c.pontos[id] = (c.pontos[id] ?? 0) + qtd;
  const depois = estrelasDe(c.pontos[id]!).estrelas;
  for (let n = antes + 1; n <= depois; n++) ev.push({ tipo: 'estrela', habilidade: id, estrelas: n });
}

function concluir(c: EstadoCrianca, e: EstadoMundo, m: Missao, ev: EventoAlma[]): void {
  e.feitas.push(m.id);
  delete e.progresso[m.id];
  c.moedas += m.moedas;
  if (m.fantasia && !c.fantasias.includes(m.fantasia)) c.fantasias.push(m.fantasia);
  if (e.fixada === m.id) e.fixada = null;
  ev.push({ tipo: 'concluiu', missao: m, moedas: m.moedas, fantasia: m.fantasia });
  somarPontos(c, m.habilidade, PONTOS_POR_MISSAO, ev);
  ganharXp(c, XP_MISSAO, ev);
}

/** XP e pontos de habilidade das ações soltas (as mesmas chaves do diário). */
export const GANHO_DE_EVENTO: Record<string, { xp: number; hab?: [IdHabilidade, number] }> = {
  'obra:bloco': { xp: 1, hab: ['construtor', 0.2] },
  colocou: { xp: 0.2, hab: ['construtor', 0.1] },
  'visitou:lugar': { xp: 5, hab: ['explorador', 1] },
  'criou:coelho': { xp: 4, hab: ['bichos', 1] },
  'criou:cervo': { xp: 4, hab: ['bichos', 1] },
  colheu: { xp: 2, hab: ['fazendeiro', 0.5] },
  'colheu:minha': { xp: 2, hab: ['fazendeiro', 0.5] },
  plantou: { xp: 1, hab: ['fazendeiro', 0.25] },
  'coletou:ovo': { xp: 3, hab: ['bichos', 0.5] },
  'fabricou:pao': { xp: 5, hab: ['cozinheiro', 1] },
  'fundiu:pipoca': { xp: 4, hab: ['cozinheiro', 1] },
  'trocou:cozinheiro': { xp: 3, hab: ['cozinheiro', 1] },
  'trocou:ferreiro': { xp: 3 },
  'trocou:construtor': { xp: 3, hab: ['construtor', 0.5] },
};

/** Um evento do jogo: conta nas missões abertas, no XP e nas habilidades. Muda `c` e `e`. */
export function registrar(
  c: EstadoCrianca,
  e: EstadoMundo,
  mundo: MundoAlma,
  chave: string,
  qtd = 1,
): EventoAlma[] {
  const ev: EventoAlma[] = [];
  for (const m of abertas(e, mundo)) {
    if (m.conta.tipo !== 'evento' || m.conta.chave !== chave) continue;
    e.progresso[m.id] = Math.min(m.conta.meta, (e.progresso[m.id] ?? 0) + qtd);
    if (e.progresso[m.id] >= m.conta.meta) concluir(c, e, m, ev);
    else ev.push({ tipo: 'progresso', missao: m, fracao: fracaoDa(e, m) });
  }
  const g = GANHO_DE_EVENTO[chave];
  if (g) {
    if (g.hab) somarPontos(c, g.hab[0], g.hab[1] * qtd, ev);
    ganharXp(c, g.xp * qtd, ev);
  }
  return ev;
}

/** Obra e lugares: o progresso vem pronto (fração da obra, ou quantos lugares). */
export function definirProgresso(
  c: EstadoCrianca,
  e: EstadoMundo,
  mundo: MundoAlma,
  id: string,
  valor: number,
): EventoAlma[] {
  const m = abertas(e, mundo).find((x) => x.id === id);
  if (!m) return [];
  const ev: EventoAlma[] = [];
  const meta = metaDa(m);
  if (valor <= (e.progresso[id] ?? 0)) return ev;
  e.progresso[id] = Math.min(meta, valor);
  if (e.progresso[id] >= meta) concluir(c, e, m, ev);
  else ev.push({ tipo: 'progresso', missao: m, fracao: fracaoDa(e, m) });
  return ev;
}

/** Depois de toda a lista: missão de bis (as mesmas, de novo), só com moedinhas e XP. */
export function concluirBis(c: EstadoCrianca, e: EstadoMundo, mundo: MundoAlma, id: string): EventoAlma[] {
  const m = missoesDoMundo(mundo).find((x) => x.id === id);
  if (!m || abertas(e, mundo).length > 0) return [];
  e.bis++;
  c.moedas += MOEDAS_BIS;
  const ev: EventoAlma[] = [{ tipo: 'concluiu', missao: m, moedas: MOEDAS_BIS, bis: true }];
  ganharXp(c, XP_MISSAO / 2, ev);
  return ev;
}

// ------------------------------------------------------------------ compras
export type RecusaCompra = 'nao-existe' | 'ja-tem' | 'faltam-moedas';

/** Premium: preço fixo, um de cada, só com a carteira. Muda `c`. */
export function comprarPremium(
  c: EstadoCrianca,
  id: string,
): { ok: true } | { ok: false; motivo: RecusaCompra } {
  const p = PREMIUM.find((x) => x.id === id);
  if (!p) return { ok: false, motivo: 'nao-existe' };
  if (c.premium.includes(id)) return { ok: false, motivo: 'ja-tem' };
  if (c.moedas < p.preco) return { ok: false, motivo: 'faltam-moedas' };
  c.moedas -= p.preco;
  c.premium.push(id);
  // comprou, já veste (a criança quer ver na hora)
  c.vestidos[p.categoria] = id;
  return { ok: true };
}

/** Banca do mundo: só itens do tema deste mundo; pode comprar de novo (vem mais um pacote). */
export function comprarBanca(
  c: EstadoCrianca,
  mundo: MundoAlma,
  id: string,
): { ok: true } | { ok: false; motivo: RecusaCompra } {
  const it = BANCA.find((x) => x.id === id && x.mundo === mundo);
  if (!it) return { ok: false, motivo: 'nao-existe' };
  if (c.moedas < it.preco) return { ok: false, motivo: 'faltam-moedas' };
  c.moedas -= it.preco;
  return { ok: true };
}

/** Veste ou tira um premium já comprado. */
export function vestirPremium(c: EstadoCrianca, id: string, vestir: boolean): boolean {
  const p = PREMIUM.find((x) => x.id === id);
  if (!p || !c.premium.includes(id)) return false;
  if (vestir) c.vestidos[p.categoria] = id;
  else if (c.vestidos[p.categoria] === id) delete c.vestidos[p.categoria];
  return true;
}
