/**
 * Saneamento das mensagens do cliente (spec 010): na nuvem, qualquer um pode mandar
 * qualquer coisa. Antes de chegar às regras, cada comando tem que estar no formato
 * certo, com números finitos, inteiros onde precisa e tamanhos com teto; o que não
 * estiver é descartado. Nada aqui decide regra do jogo: só garante que a mensagem é
 * uma mensagem de verdade (e que nenhuma faz o servidor travar).
 */
import type { Slot } from '../jogo/inventario';
import { obterItem } from '../jogo/itens';
import type { Comando, MudancaSlot, Pos } from './protocolo';
import type { DadosMundo } from '../jogo/mundos';
import {
  MAX_DONOS,
  VALOR_MAXIMO,
  indiceDonoDe,
  semDono,
  type DonosExportados,
  type DonosMudados,
  type EdicoesExportadas,
} from '../world/edicoes';
import { ehGesto } from '../personagem/gestos';
import { normalizarAparencia } from '../personagem/aparencia';
import { limparApelido } from '../jogo/apelido';
import { MAX_MOEDAS } from '../jogo/alma';

/** Tamanho do mundo onde alguém pode estar (bem além de onde se joga). */
export const XZ_MAX = 30_000_000;
const Y_MIN = -64;
const Y_MAX = 512;
const SLOTS = 36;

/**
 * Aparência que viaja na rede: objeto pequeno, passado a limpo (spec 017: fantasia com id
 * desconhecido vira "sem fantasia" e cor fora da paleta vira a padrão). Null se não serve.
 */
export function sanearAparencia(a: unknown): Record<string, unknown> | null {
  if (!a || typeof a !== 'object' || Array.isArray(a)) return null;
  if (JSON.stringify(a).length > 4096) return null;
  // spec 014: os desbloqueios (capacete e colete do canteiro) não viajam: são do aparelho
  const out: Record<string, unknown> = { ...normalizarAparencia(a) };
  delete out.desbloqueios;
  return out;
}

const finito = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const inteiro = (v: unknown, min: number, max: number): v is number =>
  typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max;
const xz = (v: unknown): v is number => finito(v) && Math.abs(v) <= XZ_MAX;
const y = (v: unknown): v is number => finito(v) && v >= Y_MIN && v <= Y_MAX;
const celula = (p: Partial<Pos> | undefined): boolean =>
  !!p &&
  inteiro(p.x, -XZ_MAX, XZ_MAX) &&
  inteiro(p.y, Y_MIN, Y_MAX) &&
  inteiro(p.z, -XZ_MAX, XZ_MAX);
const texto = (v: unknown, max: number): v is string => typeof v === 'string' && v.length <= max;

/** Um slot de verdade: item que existe, quantidade inteira dentro da pilha, durabilidade inteira. */
export function slotValido(p: unknown): p is Slot {
  if (p === null) return true;
  if (!p || typeof p !== 'object') return false;
  const s = p as { item?: unknown; qtd?: unknown; dur?: unknown };
  if (!texto(s.item, 64)) return false;
  const def = obterItem(s.item);
  if (!def) return false;
  if (!inteiro(s.qtd, 1, def.pilha ?? 64)) return false;
  if (s.dur !== undefined && !inteiro(s.dur, 0, def.durabilidade ?? 0)) return false;
  return true;
}

function mudancasValidas(ms: unknown): ms is MudancaSlot[] {
  if (!Array.isArray(ms) || ms.length > 80) return false;
  const vistos = new Set<string>();
  for (const m of ms as Partial<MudancaSlot>[]) {
    if (!m || !['inv', 'bau', 'forn', 'tr'].includes(String(m.onde))) return false;
    if (!inteiro(m.i, 0, 63)) return false;
    // o mesmo slot duas vezes na mesma transação é truque (cada antes confere o estado velho)
    const k = `${m.onde}:${m.i}`;
    if (vistos.has(k)) return false;
    vistos.add(k);
    if (!slotValido(m.antes ?? null) || !slotValido(m.depois ?? null)) return false;
  }
  return true;
}

/** O comando, se for válido; senão null (descartado). */
export function sanear(c: unknown): Comando | null {
  if (!c || typeof c !== 'object') return null;
  const o = c as Record<string, unknown> & { t?: unknown };
  if (o.seq !== undefined && !inteiro(o.seq, 0, Number.MAX_SAFE_INTEGER)) return null;
  if (o.id !== undefined && !inteiro(o.id, 0, Number.MAX_SAFE_INTEGER)) return null;
  switch (o.t) {
    case 'jogador': {
      const ok =
        xz(o.x) &&
        y(o.y) &&
        xz(o.z) &&
        finito(o.yaw) &&
        finito(o.pitch) &&
        y(o.olhos) &&
        finito(o.vel) &&
        Math.abs(o.vel as number) < 1000 &&
        inteiro(o.slot, 0, SLOTS - 1) &&
        inteiro(o.pulos, 0, 40) &&
        inteiro(o.golpes, 0, 60) &&
        Array.isArray(o.quedas) &&
        (o.quedas as unknown[]).length <= 8 &&
        (o.quedas as unknown[]).every((q) => finito(q) && q >= 0 && q <= 600) &&
        (o.raio === undefined || inteiro(o.raio, 1, 12));
      return ok ? (o as unknown as Comando) : null;
    }
    case 'quebrar':
    case 'arar':
      return celula(o as Partial<Pos>) &&
        inteiro(o.id, 0, Number.MAX_SAFE_INTEGER) &&
        inteiro(o.slot, 0, SLOTS - 1)
        ? (o as unknown as Comando)
        : null;
    case 'colocar':
      return celula(o as Partial<Pos>) &&
        inteiro(o.id, 0, Number.MAX_SAFE_INTEGER) &&
        inteiro(o.bloco, 0, 255) &&
        inteiro(o.meta, 0, 255) &&
        inteiro(o.slot, 0, SLOTS - 1) &&
        (o.extras === undefined ||
          (Array.isArray(o.extras) &&
            // só a metade de cima da porta (o núcleo confere que é a célula de cima)
            o.extras.length <= 1 &&
            (o.extras as Pos[]).every((e) => celula(e))))
        ? (o as unknown as Comando)
        : null;
    case 'editar':
      return inteiro(o.id, 0, Number.MAX_SAFE_INTEGER) &&
        Array.isArray(o.lote) &&
        o.lote.length <= 4096 &&
        (o.lote as (Pos & { v: unknown })[]).every((e) => celula(e) && inteiro(e.v, 0, 65535))
        ? (o as unknown as Comando)
        : null;
    case 'usar':
      return celula(o as Partial<Pos>) ? (o as unknown as Comando) : null;
    case 'conferir':
      return inteiro(o.id, 0, Number.MAX_SAFE_INTEGER) &&
        Array.isArray(o.celulas) &&
        o.celulas.length <= 500 &&
        (o.celulas as Pos[]).every((e) => celula(e))
        ? (o as unknown as Comando)
        : null;
    case 'transacao':
      return inteiro(o.id, 0, Number.MAX_SAFE_INTEGER) &&
        mudancasValidas(o.mudancas) &&
        (o.fabricou === undefined ||
          (Array.isArray(o.fabricou) &&
            o.fabricou.length <= 10 &&
            (o.fabricou as { receita: unknown; vezes: unknown }[]).every(
              (f) => texto(f?.receita, 64) && inteiro(f?.vezes, 1, 64),
            )))
        ? (o as unknown as Comando)
        : null;
    case 'soltar':
      return Array.isArray(o.itens) &&
        o.itens.length <= 40 &&
        (o.itens as unknown[]).every((p) => p !== null && slotValido(p)) &&
        xz(o.x) &&
        y(o.y) &&
        xz(o.z) &&
        (o.jogar === undefined ||
          (typeof o.jogar === 'object' &&
            o.jogar !== null &&
            Number.isFinite((o.jogar as { yaw?: unknown }).yaw) &&
            ((o.jogar as { slot?: unknown }).slot === undefined ||
              inteiro((o.jogar as { slot?: unknown }).slot, 0, SLOTS - 1))))
        ? (o as unknown as Comando)
        : null;
    case 'atacar':
    case 'domar':
    case 'alimentar':
      return inteiro(o.criatura, 0, Number.MAX_SAFE_INTEGER) && inteiro(o.slot, 0, SLOTS - 1)
        ? (o as unknown as Comando)
        : null;
    case 'falar':
      return inteiro(o.criatura, 0, Number.MAX_SAFE_INTEGER) ? (o as unknown as Comando) : null;
    case 'trocar':
      return inteiro(o.criatura, 0, Number.MAX_SAFE_INTEGER) &&
        texto(o.profissao, 32) &&
        texto(o.troca, 64)
        ? (o as unknown as Comando)
        : null;
    case 'comer':
      return inteiro(o.slot, 0, SLOTS - 1) ? (o as unknown as Comando) : null;
    case 'almaFixar':
      // spec 023: o id de uma missão (o núcleo confere que está aberta), ou null
      return o.missao === null || texto(o.missao, 16) ? (o as unknown as Comando) : null;
    case 'comprarBanca':
      // spec 023: o id de um item da banca e o saldo do aparelho (inteiro, com teto)
      return texto(o.item, 32) && inteiro(o.saldo, 0, MAX_MOEDAS)
        ? (o as unknown as Comando)
        : null;
    case 'vila':
      // spec 026: a caixa do palco (0 a 2); nada mais vai junto (o show é só para ver: o toque
      // no palco de antes não existe mais)
      if (o.a === 'caixa' && inteiro(o.i, 0, 2))
        return { t: 'vila', a: 'caixa', i: o.i } as unknown as Comando;
      // spec 026 (parte 2): o parque (sentar no brinquedo 0 a 2, sair, o empurrão)
      if (o.a === 'sentar' && inteiro(o.b, 0, 2))
        return { t: 'vila', a: 'sentar', b: o.b } as unknown as Comando;
      if (o.a === 'sair' || o.a === 'roda') return { t: 'vila', a: o.a } as unknown as Comando;
      // o controle do carrinho do bate-bate: o rumo (-100 a 100) e o número dele
      if (o.a === 'guiar' && inteiro(o.x, -100, 100) && inteiro(o.z, -100, 100) && inteiro(o.n, 1, 2 ** 31))
        return { t: 'vila', a: 'guiar', x: o.x, z: o.z, n: o.n } as unknown as Comando;
      // spec 026 (parte 2, etapa B): o balão fugido (0 a 2), a barraca de prendas (0 a argola, 1
      // a pescaria), o feno do fardo, o cocho e a fita da locadora
      if (o.a === 'balao' && inteiro(o.i, 0, 2))
        return { t: 'vila', a: 'balao', i: o.i } as unknown as Comando;
      if (o.a === 'prenda' && inteiro(o.i, 0, 1))
        return { t: 'vila', a: 'prenda', i: o.i } as unknown as Comando;
      if (o.a === 'feno' || o.a === 'cocho' || o.a === 'fita')
        return { t: 'vila', a: o.a } as unknown as Comando;
      // spec 032: comprar o lanche de uma barraca (o índice do lugar de comprar)
      if (o.a === 'comprar' && inteiro(o.i, 0, 15))
        return { t: 'vila', a: 'comprar', i: o.i } as unknown as Comando;
      // spec 026 (parte 3): a TV, o videocassete, o disco e o baú da casa; o trilho da rampa
      if (o.a === 'tv' || o.a === 'videocassete' || o.a === 'disco' || o.a === 'bau')
        return { t: 'vila', a: o.a } as unknown as Comando;
      if (o.a === 'rampa' && (o.l === 1 || o.l === -1))
        return { t: 'vila', a: 'rampa', l: o.l } as unknown as Comando;
      // parte 3B: o brinquedo espalhado do quarto (0 a 2)
      if (o.a === 'brinquedo' && inteiro(o.i, 0, 2))
        return { t: 'vila', a: 'brinquedo', i: o.i } as unknown as Comando;
      return null;
    case 'baile':
      // spec 027 (T14): comprar o lanche de uma barraca da festa (o índice do lugar de comprar)
      if (o.a === 'comprar' && inteiro(o.i, 0, 15))
        return { t: 'baile', a: 'comprar', i: o.i } as unknown as Comando;
      // spec 027 (T16): a varinha no ponto do chão tocado (números finitos, no mundo)
      if (o.a === 'varinha' && [o.x, o.y, o.z].every((v) => typeof v === 'number' && Number.isFinite(v) && Math.abs(v) < 1e7))
        return { t: 'baile', a: 'varinha', x: o.x, y: o.y, z: o.z } as unknown as Comando;
      return null;
    case 'pularPerto':
      // spec 021: só o id de um amigo (texto curto)
      return texto(o.alvo, 64) ? (o as unknown as Comando) : null;
    case 'renascer':
    case 'voltarCasa':
    case 'chamarAmigos':
    case 'fecharConteiner':
      return o as unknown as Comando;
    case 'salvar':
      return inteiro(o.pedido, 0, Number.MAX_SAFE_INTEGER) ? (o as unknown as Comando) : null;
    case 'pausar':
      return typeof o.pausar === 'boolean' ? (o as unknown as Comando) : null;
    case 'depurar':
      return o.d && typeof o.d === 'object' ? (o as unknown as Comando) : null;
    case 'gesto':
      // spec 015: só um dos 8 gestos
      return inteiro(o.id, 0, Number.MAX_SAFE_INTEGER) && ehGesto(o.gesto)
        ? (o as unknown as Comando)
        : null;
    case 'aparencia': {
      // só um objeto pequeno (a aparência são umas poucas escolhas), já passado a limpo
      const aparencia = sanearAparencia(o.aparencia);
      return aparencia ? ({ ...o, aparencia } as unknown as Comando) : null;
    }
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Mundo salvo (auditoria 013): "levar para a nuvem" sobe o salvamento do aparelho como
// veio. Um bicho em x = 1e300 travava o servidor (cada passo gerava terreno lá). Tudo o que
// tem posição passa pelos mesmos limites dos comandos; o que estiver fora sai.

/** Altura em que bicho e item solto podem estar (o mundo tem 128 de altura). */
const Y_CORPO_MIN = 0;
const Y_CORPO_MAX = 256;
const MAX_CRIATURAS_SALVAS = 64;
const MAX_ITENS_SALVOS = 400;
const MAX_CONTEINERES = 20_000;
const MAX_LAVOURA = 100_000;
const MAX_SEM_POVOADO = 4096;
/** O cercado do sítio tem uns 5×5; mais do que isto não é cercado. */
const CERCA_MAX = 64;

const objeto = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v);

/** Um ponto dentro do mundo (bicho ou item solto). */
function corpoValido(v: unknown): boolean {
  if (!objeto(v)) return false;
  return xz(v.x) && xz(v.z) && finito(v.y) && v.y >= Y_CORPO_MIN && v.y <= Y_CORPO_MAX;
}

/** Posição salva do jogador (x, y, z dentro do mundo), ou null. */
export function posicaoSalvaValida<T>(p: T): T | null {
  if (!objeto(p)) return null;
  return xz(p.x) && y(p.y) && xz(p.z) ? p : null;
}

const CHAVE_CELULA = /^(-?\d{1,9}),(-?\d{1,4}),(-?\d{1,9})$/;
/** Chave "x,y,z" de uma célula dentro do mundo. */
export function chaveCelulaValida(k: string): boolean {
  const m = CHAVE_CELULA.exec(k);
  return (
    !!m &&
    Math.abs(Number(m[1])) <= XZ_MAX &&
    Number(m[2]) >= 0 &&
    Number(m[2]) < 256 &&
    Math.abs(Number(m[3])) <= XZ_MAX
  );
}
const CHAVE_PAR = /^(-?\d{1,9}),(-?\d{1,9})$/;
function chavePar(k: string, max: number): boolean {
  const m = CHAVE_PAR.exec(k);
  return !!m && Math.abs(Number(m[1])) <= max && Math.abs(Number(m[2])) <= max;
}

/** Só as entradas com chave de célula válida (no máximo `max`). */
function porCelula(v: unknown, max: number): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (!objeto(v)) return out;
  let n = 0;
  for (const [k, val] of Object.entries(v)) {
    if (n >= max) break;
    if (!chaveCelulaValida(k)) continue;
    out[k] = val;
    n++;
  }
  return out;
}

function bichoCriado(b: Record<string, unknown>): Record<string, unknown> {
  const out = { ...b };
  const casa = b.casa;
  if (!(Array.isArray(casa) && casa.length === 2 && xz(casa[0]) && xz(casa[1]))) delete out.casa;
  const cerca = b.cerca;
  const cercaOk =
    typeof b.curral === 'string' &&
    b.curral.length <= 64 &&
    Array.isArray(cerca) &&
    cerca.length === 4 &&
    cerca.every((v) => xz(v)) &&
    cerca[0] <= cerca[2] &&
    cerca[1] <= cerca[3] &&
    cerca[2] - cerca[0] <= CERCA_MAX &&
    cerca[3] - cerca[1] <= CERCA_MAX;
  if (!cercaOk) {
    delete out.curral;
    delete out.cerca;
  }
  return out;
}

/**
 * Os extras do mundo salvo com tudo o que tem posição dentro do mundo: bichos criados e
 * raposas domadas, itens soltos, baús e fornalhas, lavoura, ponto de nascer e regiões sem
 * povoado. Entrada que não serve sai (o resto do mundo abre normalmente). O núcleo passa
 * todo salvamento por aqui ao abrir; o servidor, ao receber um mundo do aparelho.
 */
export function sanearExtras(e: unknown): Record<string, unknown> {
  if (!objeto(e)) return {};
  const out: Record<string, unknown> = { ...e };
  if ('criaturas' in out) {
    const c = objeto(out.criaturas) ? out.criaturas : {};
    const lista = (v: unknown) =>
      Array.isArray(v) ? v.slice(0, MAX_CRIATURAS_SALVAS).filter(corpoValido) : [];
    out.criaturas = {
      ...c,
      raposas: lista(c.raposas),
      criados: (lista(c.criados) as Record<string, unknown>[]).map(bichoCriado),
    };
  }
  if ('itensSoltos' in out)
    out.itensSoltos = Array.isArray(out.itensSoltos)
      ? out.itensSoltos.slice(0, MAX_ITENS_SALVOS).filter(corpoValido)
      : [];
  if ('conteineres' in out) {
    const c = objeto(out.conteineres) ? out.conteineres : {};
    out.conteineres = {
      ...c,
      baus: porCelula(c.baus, MAX_CONTEINERES),
      fornalhas: porCelula(c.fornalhas, MAX_CONTEINERES),
    };
  }
  if ('lavoura' in out) {
    const l = porCelula(out.lavoura, MAX_LAVOURA);
    for (const k of Object.keys(l)) if (!finito(l[k])) delete l[k];
    out.lavoura = l;
  }
  if ('spawn' in out) {
    const sp = out.spawn;
    if (!(objeto(sp) && xz(sp.x) && xz(sp.z))) delete out.spawn;
  }
  if ('donos' in out) out.donos = sanearDonos(out.donos);
  if ('alma' in out) {
    // spec 023: { [jogador]: estado } (o núcleo passa cada um a limpo com o mundo dele)
    const a = out.alma;
    if (!objeto(a) || Object.keys(a).length > 256 || JSON.stringify(a).length > 512_000)
      delete out.alma;
  }
  if ('obras' in out) {
    const o = sanearObras(out.obras);
    if (Object.keys(o).length) out.obras = o;
    else delete out.obras;
  }
  if ('povoados' in out) {
    const p = objeto(out.povoados) ? out.povoados : {};
    if (Array.isArray(p.semPovoado))
      out.povoados = {
        ...p,
        semPovoado: p.semPovoado
          .slice(0, MAX_SEM_POVOADO)
          .filter((k): k is string => typeof k === 'string' && chavePar(k, XZ_MAX / 128 + 1)),
      };
    else delete out.povoados;
  }
  return out;
}

/** Uma obra do canteiro como vai no salvamento (spec 014, `extras.obras`). */
export interface ObraSalva {
  /** Índices das células da planta já cheias. */
  cheias: number[];
  /** Quem pôs pelo menos um bloco: [id, apelido], na ordem em que chegaram. */
  ajudantes: [string, string][];
  feita?: true;
}

/** Ajudantes guardados por obra (a placa mostra 4; a recompensa vai para todos). */
export const MAX_AJUDANTES_OBRA = 64;

/**
 * Spec 014: as obras do canteiro passadas a limpo (canteiro de 1 a 6, células com índice
 * inteiro, ajudantes com id e apelido curtos). O resto sai.
 */
export function sanearObras(v: unknown): Record<string, ObraSalva> {
  const out: Record<string, ObraSalva> = {};
  if (!objeto(v)) return out;
  for (const [k, o] of Object.entries(v)) {
    const n = Number(k);
    if (!Number.isInteger(n) || n < 1 || n > 6 || String(n) !== k || !objeto(o)) continue;
    const cheias = Array.isArray(o.cheias)
      ? [...new Set((o.cheias as unknown[]).filter((i): i is number => inteiro(i, 0, 255)))]
      : [];
    const vistos = new Set<string>();
    const ajudantes: [string, string][] = [];
    if (Array.isArray(o.ajudantes))
      for (const a of (o.ajudantes as unknown[]).slice(0, MAX_AJUDANTES_OBRA)) {
        if (!Array.isArray(a) || typeof a[0] !== 'string' || !ID_DONO.test(a[0])) continue;
        if (vistos.has(a[0])) continue;
        vistos.add(a[0]);
        ajudantes.push([a[0], typeof a[1] === 'string' ? limparApelido(a[1]) : '']);
      }
    out[k] = { cheias, ajudantes, ...(o.feita === true ? { feita: true as const } : {}) };
  }
  return out;
}

/** Edições com chave de chunk e células válidas (o resto sai). */
export function sanearEdicoes(ed: unknown): EdicoesExportadas {
  const out: EdicoesExportadas = {};
  if (!objeto(ed)) return out;
  const maxChunk = Math.ceil(XZ_MAX / 16) + 1;
  for (const [k, lista] of Object.entries(ed)) {
    if (!chavePar(k, maxChunk) || !Array.isArray(lista)) continue;
    const boas = (lista as unknown[]).filter(
      (p): p is [number, number] =>
        Array.isArray(p) &&
        p.length === 2 &&
        inteiro(p[0], 0, 16 * 16 * 128 - 1) &&
        inteiro(p[1], 0, VALOR_MAXIMO),
    );
    if (boas.length) out[k] = boas;
  }
  return out;
}

/** Id de quem joga (o mesmo formato que o servidor aceita na entrada). */
const ID_DONO = /^[A-Za-z0-9_-]{1,64}$/;

/**
 * Spec 016: a tabela de donos (quem colocou blocos) passada a limpo. A posição de cada um é
 * o índice gravado nas edições, então entrada que não serve vira lugar vazio (vale o dono do
 * mundo), sem mexer na posição das outras; id repetido também.
 */
export function sanearDonos(d: unknown): DonosExportados {
  if (!Array.isArray(d)) return [];
  const vistos = new Set<string>();
  return d.slice(0, MAX_DONOS).map((e): [string, string] => {
    const par = Array.isArray(e) ? (e as unknown[]) : [];
    const id = par[0];
    if (typeof id !== 'string' || !ID_DONO.test(id) || vistos.has(id)) return ['', ''];
    vistos.add(id);
    const apelido = typeof par[1] === 'string' ? limparApelido(par[1]) : '';
    return [id, apelido];
  });
}

/** As entradas mudadas da tabela de donos (o quadro), passadas a limpo. */
export function sanearDonosMudados(d: unknown): DonosMudados {
  if (!Array.isArray(d)) return [];
  const out: DonosMudados = [];
  for (const e of d.slice(0, MAX_DONOS)) {
    if (!Array.isArray(e)) continue;
    const [i, id, a] = e as unknown[];
    if (!Number.isInteger(i) || (i as number) < 1 || (i as number) > MAX_DONOS) continue;
    if (typeof id !== 'string' || (id !== '' && !ID_DONO.test(id))) continue;
    out.push([i as number, id, typeof a === 'string' ? limparApelido(a) : '']);
  }
  return out;
}

/** Edições com índice de dono fora da tabela ficam com o dono do mundo (índice 0). */
function donosDentroDaTabela(ed: EdicoesExportadas, tamanho: number): void {
  for (const lista of Object.values(ed))
    for (let i = 0; i < lista.length; i++)
      if (indiceDonoDe(lista[i][1]) > tamanho) lista[i] = [lista[i][0], semDono(lista[i][1])];
}

/** O mundo salvo inteiro (de um aparelho): edições, jogador e extras dentro dos limites. */
export function sanearDadosMundo(d: unknown): DadosMundo {
  const o = objeto(d) ? (d as Partial<DadosMundo>) : {};
  const edicoes = sanearEdicoes(o.edicoes);
  const extras = sanearExtras(o.extras);
  const donos = Array.isArray(extras.donos) ? (extras.donos as DonosExportados) : [];
  donosDentroDaTabela(edicoes, donos.length);
  return {
    ...o,
    versao: 1,
    edicoes,
    jogador: posicaoSalvaValida(o.jogador ?? null),
    // a hora vai de 0 a 1 (negativa: o núcleo começa na hora de sempre)
    hora: finito(o.hora) && o.hora >= 0 && o.hora < 1 ? o.hora : -1,
    extras,
  };
}
