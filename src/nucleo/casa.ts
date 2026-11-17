/**
 * A Casa anos 80 e a rampa de skate no núcleo (spec 026, parte 3). Puro (sem tela): `criarVila`
 * passa o que este módulo precisa, e ele vale igual no aparelho e na nuvem.
 *
 * - **A TV e o disco da sala são de todos** (`src/jogo/casa.ts`): o toque na TV troca o canal
 *   para quem está na sala, a fita da locadora no videocassete passa o filme de 20 s e o toque no
 *   toca-discos liga e desliga a musiquinha. A sala tem uma esperinha entre duas trocas (ninguém
 *   troca sem parar por cima do outro) e o filme passa até o fim. Nada vai salvo: ao abrir o mundo
 *   a TV está no primeiro canal e o disco parado.
 * - **O baú de brinquedos** dá o ioiô, o pião e o cubo de cores (um de cada), na mão.
 * - **O trilho da rampa é do núcleo** (como a cadeira de um brinquedo do parque): a criança de
 *   skate, no fundo, perto do pé de uma curva, pede o trilho; o núcleo confere e marca de que lado
 *   e quando começou. Onde ela está é conta do relógio (`src/jogo/rampa.ts`); no fim do trilho ela
 *   fica livre no pé da outra curva (a tela pede o próximo, se ela segura o controle). Quem some
 *   ou vai para longe solta o trilho. O trilho inteiro conta a chave `andou:rampa`.
 */
import type { PontosCasa } from '../world/vilaCasa';
import type { PontosRampa } from '../world/vilaRampa';
import {
  alcancaATv,
  alcancaOBau,
  alcancaODisco,
  casaNova,
  casaParaARede,
  porAFita,
  proximoDoBau,
  trocarCanal,
  virarODisco,
  type CasaNaRede,
  type EstadoCasa,
} from '../jogo/casa';
import {
  duracaoDoTrilho,
  lugarNoTrilho,
  podeEntrar,
  trilhoParaARede,
  type Trilho,
  type TrilhoNaRede,
} from '../jogo/rampa';
import { FITA_VIDEO } from '../jogo/exclusivos';

export interface JogadorCasa {
  id: string;
  x: number;
  y: number;
  z: number;
  morto: boolean;
  /** De skate (a aparência: só na Vila Neon)? */
  skate: boolean;
  contar(item: string): number;
  darNaMao(item: string, qtd: number): void;
  /** O próximo lugar que ele mandar vale (saiu do trilho da rampa). */
  soltar?(): void;
}

export interface CtxCasa {
  casa: PontosCasa;
  skate: PontosRampa;
  agora(): number;
  jogador(id: string): JogadorCasa | undefined;
  evento(id: string, chave: string, qtd?: number): void;
  sujar(): void;
}

export type ComandoCasa =
  | { a: 'tv' | 'videocassete' | 'disco' | 'bau' }
  /** O trilho da rampa: para que lado (+1 a curva do leste, -1 a do oeste). */
  | { a: 'rampa'; l: number };

/** Longe do trilho por mais que isto (blocos), a criança soltou o trilho (foi para outro lugar). */
export const LONGE_DO_TRILHO = 5;
/** A chave do trilho inteiro (para as missões da etapa B). */
export const CHAVE_RAMPA = 'andou:rampa';

export function criarCasaNucleo(ctx: CtxCasa) {
  let sala: EstadoCasa = casaNova();
  const trilhos = new Map<string, Trilho>();
  const rampa = ctx.skate.rampa;

  function mudar(novo: EstadoCasa | null): void {
    if (!novo) return;
    sala = novo;
    ctx.sujar();
  }

  function entrarNoTrilho(j: JogadorCasa, l: number): void {
    if (!j.skate || trilhos.has(j.id)) return;
    if (!podeEntrar(rampa, j.x, j.y, j.z, l)) return;
    const s0 = Math.max(-rampa.meia, Math.min(rampa.meia, j.x - rampa.x));
    trilhos.set(j.id, { lado: l > 0 ? 1 : -1, s0, z: j.z, desde: ctx.agora() });
    ctx.sujar();
  }

  function largar(id: string, soltar: boolean): void {
    if (!trilhos.delete(id)) return;
    if (soltar) ctx.jogador(id)?.soltar?.();
    ctx.sujar();
  }

  return {
    comando(id: string, c: ComandoCasa): void {
      const j = ctx.jogador(id);
      if (!j || j.morto) return;
      const t = ctx.agora();
      const c0 = ctx.casa;
      if (c.a === 'tv') {
        if (alcancaATv(c0, j.x, j.z)) mudar(trocarCanal(sala, t));
      } else if (c.a === 'videocassete') {
        if (alcancaATv(c0, j.x, j.z) && j.contar(FITA_VIDEO) > 0) mudar(porAFita(sala, t));
      } else if (c.a === 'disco') {
        if (alcancaODisco(c0, j.x, j.z)) mudar(virarODisco(sala, t));
      } else if (c.a === 'bau') {
        if (!alcancaOBau(c0, j.x, j.z)) return;
        const item = proximoDoBau((i) => j.contar(i));
        if (item) j.darNaMao(item, 1);
      } else if (c.a === 'rampa') entrarNoTrilho(j, c.l);
    },
    /** A cada passo do núcleo (umas 4 vezes por segundo basta): o fim dos trilhos. */
    passo(): void {
      if (!trilhos.size) return;
      const t = ctx.agora();
      for (const [id, tr] of [...trilhos]) {
        const j = ctx.jogador(id);
        if (!j || j.morto) {
          largar(id, false);
          continue;
        }
        const f = t - tr.desde;
        if (f >= duracaoDoTrilho(rampa, tr)) {
          // o trilho inteiro: ela fica livre no pé da outra curva
          ctx.evento(id, CHAVE_RAMPA);
          largar(id, true);
          continue;
        }
        // foi para longe por outro caminho (pulou para um amigo, voltou para casa)
        const l = lugarNoTrilho(rampa, tr, t);
        if (f > 1 && Math.hypot(j.x - l.x, j.z - l.z) > LONGE_DO_TRILHO) largar(id, false);
      }
    },
    vistaCasa: (): CasaNaRede => casaParaARede(sala),
    /** Quem está no trilho da rampa (o quadro: `id` → [lado, s0, z, desde]). */
    vistaRampa(): Record<string, TrilhoNaRede> | undefined {
      if (!trilhos.size) return undefined;
      const r: Record<string, TrilhoNaRede> = {};
      for (const [id, tr] of trilhos) r[id] = trilhoParaARede(tr);
      return r;
    },
    /** Testes. */
    sala: () => ({ ...sala }),
    trilhos: () => new Map(trilhos),
  };
}

export type CasaNucleo = ReturnType<typeof criarCasaNucleo>;
