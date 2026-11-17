/**
 * As missões da Casa anos 80 no núcleo (spec 026, parte 3, etapa B). Puro (sem tela):
 * `criarVila` passa o que este módulo precisa, e ele vale igual no aparelho e na nuvem. Cada
 * criança tem o progresso dela (os "lugares" das missões, salvos com a alma de cada uma); o
 * núcleo confere a missão aberta e o alcance (a mesma conta da tela, `src/jogo/missoesCasa.ts`).
 *
 * - **f9 Sessão de cinema:** a fita na mochila acende a primeira bolinha; pôr a fita no
 *   videocassete (quem pôs e quem estava na sala com a fita dele) acende a segunda; quem se sentou
 *   no sofá durante o filme e ainda está na casa quando ele acaba ganha a terceira.
 * - **f10 Arrumar o quarto:** um toque no brinquedo espalhado põe ele na mão; o toque no baú,
 *   com ele na mão, guarda (a bolinha dele). Com a missão aberta, o baú só guarda (não dá).
 * - **f12 Bolo da vovó:** a vitamina na mochila acende a primeira bolinha; perto da vovó ela
 *   recebe a vitamina (com ou sem ela na mochila, nada se perde) e dá a fatia de bolo de fubá.
 * - A f11 (as voltas na rampa) é a chave `andou:rampa`, que o trilho da rampa já conta.
 *
 * Nenhuma moedinha por ação: as moedinhas vêm no fim da missão (alma). Nada vai salvo aqui além
 * dos lugares da alma: o brinquedo que estava na mão volta a estar espalhado (e na mão) ao abrir o
 * mundo, e quem estava no sofá no meio do filme põe a fita de novo.
 */
import type { PontosCasa } from '../world/vilaCasa';
import { dentroDaCasa, naSala, passaFilme, type EstadoCasa } from '../jogo/casa';
import { FATIA_BOLO, FITA_VIDEO, VITAMINA } from '../jogo/exclusivos';
import {
  BOLO,
  CINEMA,
  ESPALHADOS,
  F_BOLO,
  F_CINEMA,
  F_QUARTO,
  QUARTO,
  alcancaOEspalhado,
  pertoDaVovo,
  sentadoNoSofa,
} from '../jogo/missoesCasa';

export interface JogadorCasaMissoes {
  id: string;
  x: number;
  y: number;
  z: number;
  morto: boolean;
  aberta(missao: string): boolean;
  contar(item: string): number;
  darNaMao(item: string, qtd: number): void;
  tirar?(item: string, qtd: number): number;
  visitar?(uso: string): void;
  visitou?(uso: string): boolean;
}

export type EventoCasaMissoes =
  /** `quem` guardou no baú o brinquedo espalhado `i` (ioiô, pião, cubo). */
  | { e: 'vilaGuardou'; i: number; quem: string }
  /** A vovó recebeu a vitamina de `quem` e deu a fatia de bolo. */
  | { e: 'vilaBolo'; quem: string };

export type ComandoCasaMissoes = { a: 'brinquedo'; i: number };

export interface CtxCasaMissoes {
  casa: PontosCasa;
  agora(): number;
  jogadores(): JogadorCasaMissoes[];
  jogador(id: string): JogadorCasaMissoes | undefined;
  /** A sala de agora (o filme da fita). */
  sala(): EstadoCasa;
  espalhar(e: EventoCasaMissoes): void;
  sujar(): void;
}

export function criarMissoesDaCasa(ctx: CtxCasaMissoes) {
  const c = ctx.casa;
  /** O brinquedo espalhado que cada criança pegou e ainda não guardou: `${id}:${i}`. */
  const pegos = new Set<string>();
  /** Quem se sentou no sofá durante o filme (id → o fim do filme). */
  const sentou = new Map<string, number>();
  /** O fim do último filme já conferido (o fim conta uma vez). */
  let filmeVisto = 0;

  const passo = (j: JogadorCasaMissoes, uso: string) => {
    if (j.visitar && j.visitou && !j.visitou(uso)) j.visitar(uso);
  };

  function pegar(j: JogadorCasaMissoes, i: number): void {
    if (!(i >= 0 && i < ESPALHADOS.length) || !j.aberta(F_QUARTO) || !j.visitou) return;
    if (j.visitou(QUARTO[i]) || pegos.has(`${j.id}:${i}`)) return;
    if (!alcancaOEspalhado(c, i, j.x, j.y, j.z)) return;
    pegos.add(`${j.id}:${i}`);
    if (pegos.size > 512) pegos.delete(pegos.values().next().value as string);
    // (quem já tinha um igual, do baú, fica com o dele: na mão é o mesmo)
    if (j.contar(ESPALHADOS[i]) < 1) j.darNaMao(ESPALHADOS[i], 1);
    ctx.sujar();
  }

  /** O toque no baú com a f10 aberta: guarda o que pegou. Devolve se a missão cuidou do toque. */
  function guardar(j: JogadorCasaMissoes): boolean {
    if (!j.aberta(F_QUARTO) || !j.visitou || !j.visitar) return false;
    let guardou = false;
    ESPALHADOS.forEach((item, i) => {
      const k = `${j.id}:${i}`;
      if (!pegos.has(k)) return;
      // (sem ele na mochila, guarda do mesmo jeito: nada se perde)
      j.tirar?.(item, 1);
      pegos.delete(k);
      ctx.espalhar({ e: 'vilaGuardou', i, quem: j.id });
      passo(j, QUARTO[i]);
      guardou = true;
    });
    if (guardou) ctx.sujar();
    // (com a missão aberta o baú só guarda: dar e guardar ao mesmo tempo confundia)
    return true;
  }

  /** O filme começou pela fita de `id`: o passo do videocassete dele e de quem tem fita na sala. */
  function fitaPosta(id: string): void {
    for (const j of ctx.jogadores()) {
      if (j.morto || !j.aberta(F_CINEMA)) continue;
      if (j.id !== id && !(naSala(c, j.x, j.z) && j.contar(FITA_VIDEO) > 0)) continue;
      passo(j, CINEMA[0]);
      passo(j, CINEMA[1]);
    }
  }

  function cuidarDoCinema(): void {
    const s = ctx.sala();
    const t = ctx.agora();
    if (passaFilme(s, t)) {
      for (const j of ctx.jogadores()) {
        if (j.morto || !j.aberta(F_CINEMA) || !j.visitou?.(CINEMA[1])) continue;
        if (sentadoNoSofa(c, j.x, j.y, j.z)) sentou.set(j.id, s.filme);
      }
      return;
    }
    if (s.filme <= 0 || s.filme === filmeVisto) return;
    // o filme acabou: quem se sentou durante ele e ainda está na casa vê o fim
    filmeVisto = s.filme;
    for (const [id, fim] of [...sentou]) {
      if (fim !== s.filme) continue;
      sentou.delete(id);
      const j = ctx.jogador(id);
      if (!j || j.morto || !j.aberta(F_CINEMA) || !dentroDaCasa(c, j.x, j.z, 0.5)) continue;
      passo(j, CINEMA[2]);
    }
    for (const [id, fim] of [...sentou]) if (fim < s.filme) sentou.delete(id);
  }

  function cuidarDoBolo(): void {
    for (const j of ctx.jogadores()) {
      if (j.morto || !j.visitou || !j.aberta(F_BOLO) || j.visitou(BOLO[1])) continue;
      if (j.contar(VITAMINA) > 0) passo(j, BOLO[0]);
      if (!j.visitou(BOLO[0]) || !pertoDaVovo(c, j.x, j.y, j.z)) continue;
      j.tirar?.(VITAMINA, 1);
      j.darNaMao(FATIA_BOLO, 1);
      ctx.espalhar({ e: 'vilaBolo', quem: j.id });
      passo(j, BOLO[1]);
    }
  }

  return {
    comando(id: string, cmd: ComandoCasaMissoes): void {
      const j = ctx.jogador(id);
      if (!j || j.morto) return;
      if (cmd.a === 'brinquedo') pegar(j, cmd.i);
    },
    /** O toque no baú: com a f10 aberta a missão cuida dele (devolve true). */
    bau(id: string): boolean {
      const j = ctx.jogador(id);
      return !!j && !j.morto && guardar(j);
    },
    fitaPosta,
    /** A cada passo do núcleo (umas 4 vezes por segundo basta). */
    passo(n: number): void {
      if (n % 5 !== 1) return;
      for (const j of ctx.jogadores())
        if (!j.morto && j.aberta(F_CINEMA) && j.contar(FITA_VIDEO) > 0) passo(j, CINEMA[0]);
      cuidarDoCinema();
      cuidarDoBolo();
    },
    /** Os brinquedos espalhados que este jogador pegou e ainda não guardou. */
    pegosDe: (id: string): [boolean, boolean, boolean] => [
      pegos.has(`${id}:0`),
      pegos.has(`${id}:1`),
      pegos.has(`${id}:2`),
    ],
    /** Testes. */
    sentados: () => new Map(sentou),
  };
}

export type MissoesDaCasa = ReturnType<typeof criarMissoesDaCasa>;
