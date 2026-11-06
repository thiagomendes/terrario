/**
 * Cópia do mundo no cliente: o que a tela mostra enquanto o núcleo é o dono de verdade.
 *
 * - Inventário e contêiner aberto: as telas mexem na cópia como sempre; cada mudança vira
 *   uma transação (slot antes → depois). Quando o núcleo manda o estado oficial, as
 *   transações ainda não confirmadas são reaplicadas por cima, então nada pisca.
 * - Criaturas e itens no chão: chegam 20 vezes por segundo; a cópia anda suave até a
 *   posição nova, sem saltos.
 */
import type { Inventario, Slot } from '../jogo/inventario';
import type { EstadoFornalha } from '../jogo/fornalha';
import type {
  Comando,
  ConteinerVisto,
  CriaturaVista,
  ItemVisto,
  LocalSlot,
  MudancaSlot,
} from '../nucleo/protocolo';

const igual = (a: Slot, b: Slot) =>
  (a === null && b === null) ||
  (!!a && !!b && a.item === b.item && a.qtd === b.qtd && (a.dur ?? -1) === (b.dur ?? -1));
const copia = (p: Slot): Slot => (p ? { ...p } : null);

/** Lugar de slots que a cópia acompanha (inventário, baú ou fornalha aberta). */
interface Fonte {
  onde: LocalSlot;
  ler(i: number): Slot;
  gravar(i: number, p: Slot): void;
  tamanho: number;
}

export interface ConteinerReplica {
  tipo: 'bau' | 'fornalha';
  /** Id do comando que abriu (reabrir é outra abertura). */
  abertura: number;
  x: number;
  y: number;
  z: number;
  /** Baú: a lista que o painel mostra e edita (o mesmo objeto o tempo todo). */
  slots?: Slot[];
  /** Fornalha: o estado que o painel mostra e edita. */
  fornalha?: EstadoFornalha;
}

export function criarSincronizadorItens(
  inv: Inventario,
  enviar: (c: Comando) => void,
  proximoId: () => number,
) {
  let conteiner: ConteinerReplica | null = null;
  const base = new Map<LocalSlot, Slot[]>();
  let pendentes: { id: number; mudancas: MudancaSlot[] }[] = [];
  let aplicando = false;
  /** O que está nas mãos durante a tela de inventário: cursor (0) e grade de criação (1..9). */
  let transito: Omit<Fonte, 'onde'> | null = null;
  /** Aberturas que o jogador já fechou (chegam atrasadas: não abrem de novo). */
  let fechadasAte = 0;

  const fontes = (): Fonte[] => {
    const lista: Fonte[] = [
      {
        onde: 'inv',
        ler: (i) => inv.obter(i),
        gravar: (i, p) => inv.definir(i, p),
        tamanho: inv.slots.length,
      },
    ];
    const c = conteiner;
    if (c?.tipo === 'bau' && c.slots) {
      const s = c.slots;
      lista.push({
        onde: 'bau',
        ler: (i) => s[i] ?? null,
        gravar: (i, p) => {
          s[i] = p;
        },
        tamanho: s.length,
      });
    } else if (c?.tipo === 'fornalha' && c.fornalha) {
      const f = c.fornalha;
      const campos = ['entrada', 'combustivel', 'saida'] as const;
      lista.push({
        onde: 'forn',
        ler: (i) => f[campos[i]] ?? null,
        gravar: (i, p) => {
          f[campos[i]] = p;
        },
        tamanho: 3,
      });
    }
    if (transito) lista.push({ onde: 'tr', ...transito });
    return lista;
  };
  const fonte = (onde: LocalSlot) => fontes().find((f) => f.onde === onde);

  const fotografar = (f: Fonte) => Array.from({ length: f.tamanho }, (_, i) => copia(f.ler(i)));
  base.set('inv', fotografar(fontes()[0]));

  /** Compara a cópia com o último estado conhecido e manda o que a tela mudou. */
  function verificar(): void {
    if (aplicando) return;
    const mudancas: MudancaSlot[] = [];
    for (const f of fontes()) {
      const b = base.get(f.onde);
      if (!b) {
        base.set(f.onde, fotografar(f));
        continue;
      }
      for (let i = 0; i < f.tamanho; i++) {
        const atual = f.ler(i);
        if (!igual(atual, b[i] ?? null)) {
          mudancas.push({ onde: f.onde, i, antes: copia(b[i] ?? null), depois: copia(atual) });
          b[i] = copia(atual);
        }
      }
    }
    if (!mudancas.length) return;
    const id = proximoId();
    pendentes.push({ id, mudancas });
    enviar({ t: 'transacao', id, mudancas });
  }

  /** Estado oficial de um lugar, com as transações pendentes reaplicadas por cima. */
  function oficial(onde: LocalSlot, slots: Slot[], ack: number): Slot[] {
    pendentes = pendentes.filter((p) => p.id > ack);
    const novo = slots.map(copia);
    for (const p of pendentes)
      for (const m of p.mudancas)
        if (m.onde === onde && igual(novo[m.i] ?? null, m.antes)) novo[m.i] = copia(m.depois);
    return novo;
  }

  function gravarTudo(f: Fonte, novo: Slot[]): void {
    aplicando = true;
    try {
      for (let i = 0; i < f.tamanho; i++)
        if (!igual(f.ler(i), novo[i] ?? null)) f.gravar(i, copia(novo[i] ?? null));
    } finally {
      aplicando = false;
    }
    base.set(f.onde, novo.map(copia));
  }

  return {
    verificar,
    /** Liga o cursor e a grade da tela de inventário (entram nas transações). */
    definirTransito(f: Omit<Fonte, 'onde'>): void {
      transito = f;
      base.set('tr', fotografar({ onde: 'tr', ...f }));
    },
    /** Inventário oficial chegou do núcleo (com o trânsito, se uma transação foi recusada). */
    inventario(slots: Slot[], ackTransacao: number, tr?: Slot[]): void {
      verificar();
      gravarTudo(fontes()[0], oficial('inv', slots, ackTransacao));
      const t = fonte('tr');
      if (tr && t) gravarTudo(t, oficial('tr', tr, ackTransacao));
    },
    /** O jogador fechou a tela: aberturas até esta não abrem mais. */
    fechar(ate: number): void {
      verificar();
      fechadasAte = Math.max(fechadasAte, ate);
      conteiner = null;
      base.delete('bau');
      base.delete('forn');
    },
    /** Contêiner aberto mudou (null: fechou). Devolve a cópia que os painéis usam. */
    conteiner(v: ConteinerVisto | null, ackTransacao: number): ConteinerReplica | null {
      verificar();
      if (v && v.abertura <= fechadasAte) v = null;
      if (!v) {
        conteiner = null;
        base.delete('bau');
        base.delete('forn');
        return null;
      }
      const mesmo = conteiner?.abertura === v.abertura;
      if (!mesmo) {
        base.delete('bau');
        base.delete('forn');
        conteiner =
          v.tipo === 'bau'
            ? {
                tipo: 'bau',
                abertura: v.abertura,
                x: v.x,
                y: v.y,
                z: v.z,
                slots: v.slots.map(copia),
              }
            : {
                tipo: 'fornalha',
                abertura: v.abertura,
                x: v.x,
                y: v.y,
                z: v.z,
                fornalha: { ...v.fornalha },
              };
        const f = fonte(v.tipo === 'bau' ? 'bau' : 'forn');
        if (f) base.set(f.onde, fotografar(f));
        return conteiner;
      }
      const f = fonte(v.tipo === 'bau' ? 'bau' : 'forn');
      if (!f) return conteiner;
      if (v.tipo === 'bau') gravarTudo(f, oficial('bau', v.slots, ackTransacao));
      else {
        // o progresso da fornalha anda no núcleo; os slots seguem a mesma regra do baú
        const forn = conteiner!.fornalha!;
        const { entrada, combustivel, saida, ...resto } = v.fornalha;
        Object.assign(forn, resto);
        gravarTudo(f, oficial('forn', [entrada, combustivel, saida], ackTransacao));
      }
      return conteiner;
    },
    get conteinerAberto() {
      return conteiner;
    },
  };
}

/** Criatura como a cena a desenha: posição suavizada até a última vista do núcleo. */
export interface CriaturaCliente extends CriaturaVista {
  alvo: CriaturaVista;
}

export interface ItemCliente extends ItemVisto {
  alvo: ItemVisto;
}

function aproximar<T extends { x: number; y: number; z: number }>(
  atual: T,
  alvo: { x: number; y: number; z: number },
  k: number,
): void {
  // longe demais (teleporte, nasceu agora): vai direto
  if (Math.abs(alvo.x - atual.x) + Math.abs(alvo.y - atual.y) + Math.abs(alvo.z - atual.z) > 6) {
    atual.x = alvo.x;
    atual.y = alvo.y;
    atual.z = alvo.z;
    return;
  }
  atual.x += (alvo.x - atual.x) * k;
  atual.y += (alvo.y - atual.y) * k;
  atual.z += (alvo.z - atual.z) * k;
}

/** Lista que chega do núcleo, guardada por id, com movimento suave entre os quadros. */
export function criarReplicaCriaturas() {
  const porId = new Map<number, CriaturaCliente>();
  let lista: CriaturaCliente[] = [];
  let vistas: CriaturaVista[] = [];
  return {
    receber(novas: CriaturaVista[]): void {
      vistas = novas;
      const vivas = new Set<number>();
      for (const v of novas) {
        vivas.add(v.id);
        const c = porId.get(v.id);
        if (c) {
          const { x, y, z, yaw } = c;
          Object.assign(c, v, { x, y, z, yaw, alvo: v });
        } else porId.set(v.id, { ...v, alvo: v });
      }
      for (const id of porId.keys()) if (!vivas.has(id)) porId.delete(id);
      lista = [...porId.values()];
    },
    /** Anda as posições desenhadas na direção das últimas vistas. */
    atualizar(dt: number): void {
      const k = Math.min(1, dt * 14);
      for (const c of lista) {
        aproximar(c, c.alvo, k);
        let d = c.alvo.yaw - c.yaw;
        d = Math.atan2(Math.sin(d), Math.cos(d));
        c.yaw += d * k;
      }
    },
    get lista(): readonly CriaturaCliente[] {
      return lista;
    },
    /** Posições exatas do último quadro (testes e depuração). */
    get vistas(): readonly CriaturaVista[] {
      return vistas;
    },
  };
}

export function criarReplicaItens() {
  const porId = new Map<number, ItemCliente>();
  let lista: ItemCliente[] = [];
  return {
    receber(novos: ItemVisto[]): void {
      const vivos = new Set<number>();
      for (const v of novos) {
        vivos.add(v.id);
        const it = porId.get(v.id);
        if (it) {
          it.qtd = v.qtd;
          it.alvo = v;
        } else porId.set(v.id, { ...v, alvo: v });
      }
      for (const id of porId.keys()) if (!vivos.has(id)) porId.delete(id);
      lista = [...porId.values()];
    },
    atualizar(dt: number): void {
      const k = Math.min(1, dt * 18);
      for (const it of lista) aproximar(it, it.alvo, k);
    },
    get lista(): readonly ItemCliente[] {
      return lista;
    },
  };
}
