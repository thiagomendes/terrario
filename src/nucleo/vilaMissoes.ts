/**
 * As missões do parque e os toques da Rua anos 80 no núcleo (spec 026, parte 2, etapa B). Puro
 * (sem tela): `criarVila` passa o que este módulo precisa, e ele vale igual no aparelho e na
 * nuvem. Cada criança tem o progresso dela; o núcleo confere a missão aberta e o alcance de cada
 * toque (a mesma conta da tela, `src/jogo/missoesParque.ts`).
 *
 * - **f5 Bilhete do parque:** o passeio inteiro (`andou:roda`, `andou:carrossel`, `andou:bate`)
 *   carimba o bilhete de quem tem a missão aberta (cada carimbo é um "lugar" da missão: a bolinha
 *   de cada brinquedo acende no lugar dela).
 * - **f6 Balões fugidos:** o toque no balão, de perto, conta (`pegou:balao`) e o balão desce até a
 *   mão; devolvidos os três, a Dona Flor dá um balão para levar (salvo com o mundo).
 * - **f7 Lanche das lhamas:** o toque no fardo põe o feno na mão; o toque no cocho, com feno, põe
 *   o feno nele (`lanche:feno`), e as duas lhamas da fazendinha vêm comer e pulam.
 * - **f8 Prenda para a vovó:** a argola e a pescaria (um toque em cada: sempre acerta), a lhama
 *   de pelúcia na mão e a entrega à vovó, no portãozinho da Casa anos 80 (é só chegar perto).
 * - **A rua:** a fita de vídeo da locadora vai para a mochila (a vitamina da lanchonete, desde a
 *   spec 032, se compra: `vilaCompras.ts`).
 *
 * Nenhuma moedinha por ação: as moedinhas vêm no fim da missão (alma). Nada de tempo, nada que
 * se perde: sem a pelúcia na mochila a vovó recebe a prenda do mesmo jeito.
 */
import type { PontosParque } from '../world/vilaParque';
import type { PontosRua } from '../world/vilaNeon';
import type { Criatura } from '../jogo/criaturas';
import { FENO, FITA_VIDEO, PELUCIA } from '../jogo/exclusivos';
import {
  ALCANCE_BARRACA,
  ALCANCE_COCHO,
  ALCANCE_FARDO,
  ALCANCE_LOJA,
  CHAVE_BALAO,
  CHAVE_LANCHE,
  F_BALOES,
  F_BILHETE,
  F_LANCHE,
  F_PRENDA,
  FENO_ANTIGO,
  MAX_FITAS,
  N_BALOES,
  PERTO_DA_VOVO,
  PRENDAS,
  alcancaOBalao,
  carimboDoPasseio,
  fenoNaMochila,
  pertoDe,
} from '../jogo/missoesParque';
/** Quantas crianças com o balão de presente vão salvas com o mundo. */
const MAX_BALOES_SALVOS = 64;
/** As lhamas ficam no cocho por tantos segundos depois de cada braçada de feno. */
const TEMPO_NO_COCHO = 16;
/** A que distância do meio da sua metade do cocho a lhama para (a cabeça fica em cima dele). */
const PERTO_DO_COCHO = 1.15;

export interface JogadorMissoes {
  id: string;
  x: number;
  y: number;
  z: number;
  morto: boolean;
  aberta(missao: string): boolean;
  contar(item: string): number;
  darNaMao(item: string, qtd: number): void;
  dar(item: string, qtd: number): number;
  /** Tira da mochila; devolve quantos tirou. */
  tirar?(item: string, qtd: number): number;
  /** Um "lugar" das missões de lugares (o carimbo do bilhete, o passo da prenda). */
  visitar?(uso: string): void;
  visitou?(uso: string): boolean;
}

export type EventoMissoes =
  /** O balão fugido `i` desceu até a mão de `quem` (`presente`: era o terceiro, ela ganhou um). */
  | { e: 'vilaBalao'; i: number; quem: string; presente?: true }
  /** A argola (0) ou a pescaria (1) de `quem` (`pelucia`: ganhou a prenda). */
  | { e: 'vilaPrenda'; i: number; quem: string; pelucia?: true }
  /** A vovó recebeu a prenda de `quem`. */
  | { e: 'vilaVovo'; quem: string }
  /** O feno no cocho (`fim`: a segunda braçada, as lhamas fazem a festa). */
  | { e: 'vilaLanche'; quem: string; fim?: true };

export type ComandoMissoes =
  | { a: 'balao'; i: number }
  | { a: 'prenda'; i: number }
  | { a: 'feno' | 'cocho' | 'fita' };

export interface CtxMissoes {
  parque: PontosParque;
  rua: PontosRua;
  /** Onde a vovó espera. */
  avo: readonly [number, number, number];
  /** Os pés no chão do bairro. */
  chao: number;
  /** O que veio salvo (quem tem o balão de presente). */
  salvo: unknown;
  agora(): number;
  jogadores(): JogadorMissoes[];
  jogador(id: string): JogadorMissoes | undefined;
  criaturas(): readonly Criatura[];
  /** As lhamas da fazendinha (ids das criaturas). */
  lhamas(): readonly number[];
  evento(id: string, chave: string, qtd?: number): void;
  espalhar(e: EventoMissoes): void;
  sujar(): void;
}

export function criarMissoesDoParque(ctx: CtxMissoes) {
  const pq = ctx.parque;
  /** Os balões que cada criança já pegou nesta rodada: `${id}:${i}`. */
  const pegos = new Set<string>();
  /** Quem tem o balão de presente da Dona Flor (salvo com o mundo). */
  const comBalao = new Set<string>(
    Array.isArray(ctx.salvo)
      ? ctx.salvo
          .filter((s): s is string => typeof s === 'string' && s.length <= 64)
          .slice(0, MAX_BALOES_SALVOS)
      : [],
  );
  /** As braçadas de feno de cada criança (a segunda é a festa). */
  const bracadas = new Map<string, number>();
  /** Os pulinhos de alegria das lhamas que ainda vão acontecer. */
  let pulos: { id: number; t: number }[] = [];

  const todosPegos = (id: string) => {
    for (let i = 0; i < N_BALOES; i++) if (!pegos.has(`${id}:${i}`)) return false;
    return true;
  };
  const soltarBaloes = (id: string) => {
    let mudou = false;
    for (let i = 0; i < N_BALOES; i++) mudou = pegos.delete(`${id}:${i}`) || mudou;
    return mudou;
  };
  /**
   * A missão aberta de novo (o bis) com os três já pegos: os balões fugiram outra vez. Devolve
   * se mudou.
   */
  const rodadaNova = (j: JogadorMissoes) =>
    j.aberta(F_BALOES) && todosPegos(j.id) ? soltarBaloes(j.id) : false;

  function pegarBalao(j: JogadorMissoes, i: number): void {
    if (!(i >= 0 && i < N_BALOES) || !j.aberta(F_BALOES)) return;
    rodadaNova(j);
    const k = `${j.id}:${i}`;
    if (pegos.has(k)) return;
    if (!alcancaOBalao(pq, ctx.chao, i, ctx.agora(), j.x, j.z) || Math.abs(j.y - ctx.chao) > 4)
      return;
    pegos.add(k);
    const fim = todosPegos(j.id);
    if (fim) {
      comBalao.delete(j.id);
      comBalao.add(j.id);
      if (comBalao.size > MAX_BALOES_SALVOS)
        comBalao.delete(comBalao.values().next().value as string);
    }
    ctx.evento(j.id, CHAVE_BALAO);
    ctx.espalhar({ e: 'vilaBalao', i, quem: j.id, ...(fim ? { presente: true as const } : {}) });
    ctx.sujar();
  }

  function brincarNaBarraca(j: JogadorMissoes, i: number): void {
    if ((i !== 0 && i !== 1) || !j.aberta(F_PRENDA) || !j.visitar || !j.visitou) return;
    if (!pertoDe(i === 0 ? pq.argola : pq.pescaria, j.x, j.z, ALCANCE_BARRACA)) return;
    if (j.visitou(PRENDAS[i])) return;
    j.visitar(PRENDAS[i]);
    const ganhou = j.visitou(PRENDAS[0]) && j.visitou(PRENDAS[1]);
    if (ganhou && j.contar(PELUCIA) < 1) j.darNaMao(PELUCIA, 1);
    ctx.espalhar({
      e: 'vilaPrenda',
      i,
      quem: j.id,
      ...(ganhou ? { pelucia: true as const } : {}),
    });
  }

  /** Quem chega perto da vovó com a prenda ganha: ela recebe (com ou sem a pelúcia na mochila). */
  function cuidarDaVovo(): void {
    for (const j of ctx.jogadores()) {
      if (j.morto || !j.visitar || !j.visitou || !j.aberta(F_PRENDA)) continue;
      if (!pertoDe(ctx.avo, j.x, j.z, PERTO_DA_VOVO) || Math.abs(j.y - ctx.avo[1]) > 3) continue;
      if (!j.visitou(PRENDAS[0]) || !j.visitou(PRENDAS[1]) || j.visitou(PRENDAS[2])) continue;
      j.tirar?.(PELUCIA, 1);
      j.visitar(PRENDAS[2]);
      ctx.espalhar({ e: 'vilaVovo', quem: j.id });
    }
  }

  function pegarFeno(j: JogadorMissoes): void {
    if (!j.aberta(F_LANCHE) || fenoNaMochila((i) => j.contar(i)) > 0) return;
    if (!pertoDe(pq.fardo, j.x, j.z, ALCANCE_FARDO)) return;
    j.darNaMao(FENO, 1);
  }

  function porNoCocho(j: JogadorMissoes): void {
    if (!j.aberta(F_LANCHE) || !j.tirar || fenoNaMochila((i) => j.contar(i)) < 1) return;
    if (!pertoDe(pq.cocho, j.x, j.z, ALCANCE_COCHO)) return;
    // (o feno de agora primeiro; o trigo de um mundo salvo antes também vale)
    if (j.tirar(FENO, 1) < 1 && j.tirar(FENO_ANTIGO, 1) < 1) return;
    const n = (bracadas.get(j.id) ?? 0) + 1;
    bracadas.set(j.id, n);
    if (bracadas.size > 256) bracadas.delete(bracadas.keys().next().value as string);
    const fim = n % 2 === 0;
    // as lhamas da fazendinha vêm comer (cada uma de um lado do cocho) e pulam de alegria
    const t = ctx.agora();
    const ids = ctx.lhamas();
    const [cx, , cz] = pq.cocho;
    // cada uma vem para uma metade do cocho e para com a cabeça em cima dele (elas moram para o
    // leste e o norte: chegam por lá, e o canto do noroeste, de quem vem da porteira, fica livre
    // para a criança chegar com a segunda braçada)
    const metades: [number, number][] = [
      [cx + 0.45, cz],
      [cx - 0.45, cz],
    ];
    ids.forEach((id, k) => {
      const c = ctx.criaturas().find((q) => q.id === id && q.estado !== 'morrendo');
      if (!c) return;
      const [x, z] = metades[k % metades.length];
      c.chamado = { x, z, t: TEMPO_NO_COCHO, perto: PERTO_DO_COCHO };
      for (let p = 0; p < (fim ? 4 : 2); p++) pulos.push({ id, t: t + 2.4 + p * 0.7 + k * 0.25 });
    });
    ctx.evento(j.id, CHAVE_LANCHE);
    ctx.espalhar({ e: 'vilaLanche', quem: j.id, ...(fim ? { fim: true as const } : {}) });
  }

  function cuidarDosPulos(): void {
    if (!pulos.length) return;
    const t = ctx.agora();
    const fica: typeof pulos = [];
    for (const p of pulos) {
      if (t < p.t) {
        fica.push(p);
        continue;
      }
      const c = ctx.criaturas().find((q) => q.id === p.id && q.estado !== 'morrendo');
      if (!c) continue;
      // (ainda no ar do pulinho de antes: espera cair)
      if (!c.noChao) {
        if (t - p.t < 2) fica.push(p);
        continue;
      }
      c.vy = 4.4;
      c.noChao = false;
    }
    pulos = fica;
  }

  function pegarNaLoja(j: JogadorMissoes): void {
    if (!pertoDe(ctx.rua.fitas, j.x, j.z, ALCANCE_LOJA)) return;
    if (j.contar(FITA_VIDEO) >= MAX_FITAS) return;
    j.dar(FITA_VIDEO, 1);
  }

  return {
    comando(id: string, c: ComandoMissoes): void {
      const j = ctx.jogador(id);
      if (!j || j.morto) return;
      if (c.a === 'balao') pegarBalao(j, c.i);
      else if (c.a === 'prenda') brincarNaBarraca(j, c.i);
      else if (c.a === 'feno') pegarFeno(j);
      else if (c.a === 'cocho') porNoCocho(j);
      else pegarNaLoja(j);
    },
    /** O passeio inteiro num brinquedo do parque: o carimbo do bilhete de quem tem a missão. */
    passeio(id: string, chave: string): void {
      const carimbo = carimboDoPasseio(chave);
      const j = carimbo ? ctx.jogador(id) : undefined;
      if (!carimbo || !j || !j.aberta(F_BILHETE) || !j.visitar || j.visitou?.(carimbo)) return;
      j.visitar(carimbo);
    },
    /** A cada passo do núcleo. */
    passo(n: number): void {
      cuidarDosPulos();
      if (n % 5 === 4) cuidarDaVovo();
    },
    /** A missão dos balões foi escolhida de novo por `id`: com os três pegos, fogem outra vez. */
    preparar(id: string): void {
      const j = ctx.jogador(id);
      if (j && rodadaNova(j)) ctx.sujar();
    },
    /** Os balões fugidos que este jogador já pegou. */
    pegosDe(id: string): [boolean, boolean, boolean] {
      const j = ctx.jogador(id);
      if (j) rodadaNova(j);
      return [pegos.has(`${id}:0`), pegos.has(`${id}:1`), pegos.has(`${id}:2`)];
    },
    /** Quem, dos que estão no mundo, leva o balão de presente. */
    comBalao(): string[] {
      const out: string[] = [];
      for (const j of ctx.jogadores()) if (comBalao.has(j.id)) out.push(j.id);
      return out;
    },
    salvar: (): string[] => [...comBalao],
  };
}

export type MissoesDoParque = ReturnType<typeof criarMissoesDoParque>;
