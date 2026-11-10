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

/** Tamanho do mundo onde alguém pode estar (bem além de onde se joga). */
const XZ_MAX = 30_000_000;
const Y_MIN = -64;
const Y_MAX = 512;
const SLOTS = 36;

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
            o.extras.length <= 2 &&
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
        xz(o.z)
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
    case 'renascer':
    case 'fecharConteiner':
      return o as unknown as Comando;
    case 'salvar':
      return inteiro(o.pedido, 0, Number.MAX_SAFE_INTEGER) ? (o as unknown as Comando) : null;
    case 'pausar':
      return typeof o.pausar === 'boolean' ? (o as unknown as Comando) : null;
    case 'depurar':
      return o.d && typeof o.d === 'object' ? (o as unknown as Comando) : null;
    case 'aparencia':
      // só um objeto pequeno (a aparência são umas poucas escolhas)
      return o.aparencia &&
        typeof o.aparencia === 'object' &&
        !Array.isArray(o.aparencia) &&
        JSON.stringify(o.aparencia).length <= 4096
        ? (o as unknown as Comando)
        : null;
    default:
      return null;
  }
}
