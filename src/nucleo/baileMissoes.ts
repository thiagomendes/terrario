/**
 * As missões n1 a n5 da Noite das Fantasias no núcleo (spec 027, T18). Puro (sem tela):
 * `criarBaile` passa o que este módulo precisa, e ele vale igual no aparelho e na nuvem.
 *
 * Os objetos das missões são um só no mundo (as portas, as lanternas, a Lulu, a abóbora da
 * porta, o Tufinho), mas cada criança tem o progresso dela, como em `vilaMissoes.ts`. O núcleo
 * confere a missão aberta, o passo e o alcance de cada toque (a regra da spec, seção 10, "O
 * progresso de cada criança"):
 *
 * - **n1 Doces ou travessuras:** cada criança tem a lista das portas dela. O toque na campainha
 *   abre a porta para todos (2 s); conta para quem tocou se a n1 está aberta e a porta ainda não
 *   é dela (a de um amigo que acabou de abrir conta igual). Cada porta nova é a bolinha seguinte
 *   e põe um docinho na sacola de quem tocou; a terceira porta de cada criança é a "travessura"
 *   (o fantasminha do confete de folhinhas, sem susto), e o doce vem igual. A sacola vai vazia
 *   para a mão quando a n1 abre.
 * - **n2 O Conde Dudu tem medo do escuro:** as lanternas acesas são do mundo. A lanterna já acesa
 *   conta (e pisca) para quem tem a n2 aberta e ainda não contou com ela nesta rodada. As
 *   lanternas só se apagam quando alguém escolhe a n2 de novo e mais ninguém na sala tem a n2
 *   aberta.
 * - **n3 Esconde-esconde com a Lulu:** a Lulu escondida é uma cópia só na tela de quem procura,
 *   no esconderijo do passo dela (os lugares da alma); achar conta só para quem achou.
 * - **n4 Abóbora de carinha:** a plantinha do canteiro marcado é de cada criança (plantar, regar,
 *   em 5 s vira abóbora, colher); a carinha na bancada; o lampião na porta da Vovó, um só no
 *   mundo (o último posto fica), conta para quem põe e para quem também está no último passo a
 *   até 4 blocos da porta.
 * - **n5 O gato da Vovó sumiu:** o Tufinho é um só. Foge para a horta quando alguém abre a n5 e
 *   ele está em casa, sem seguir ninguém; segue uma criança por vez (a que chamou); a entrega
 *   conta para todos com a n5 aberta a até 6 blocos da Vovó. Quem ficou longe da entrega ganha a
 *   cópia "fugida" na horta, só na tela dela, que segue a criança de volta até a Vovó.
 * - **A uva da parreirinha** se colhe a qualquer hora (um toque, uma uva, até 8 na mochila).
 *
 * Nenhuma moedinha por ação (as moedinhas vêm no fim da missão, pela alma). Nada que se perde:
 * sem a abóbora ou o lampião na mochila, a bancada e a porta aceitam do mesmo jeito.
 */
import type { PlanoBaile } from '../world/noiteFantasias';
import { idDoBloco } from '../jogo/itens';
import { Bloco } from '../world/blocks';
import { LAMPIOES_CARINHA, SACOLA_DOCES, SACOLA_VAZIA } from '../jogo/exclusivos';
import {
  CARINHAS,
  CHAVE_LANTERNA,
  MISSOES_BAILE as M,
  M_ABOBORA,
  M_DOCES,
  M_LANTERNAS,
  M_LULU,
  M_TUFINHO,
  USOS_ABOBORA,
  USOS_DOCES,
  USOS_LULU,
  USOS_TUFINHO,
  passoEmOrdem,
  pertoNoChao,
  prontaParaColher,
  type BaileVista,
  type FaseHorta,
  type TufinhoVista,
} from '../jogo/baile';

/** A abóbora colhida (o bloco de abóbora do jogo, na mão). */
const ABOBORA = idDoBloco(Bloco.ABOBORA);
/** A uva da parreirinha (o item `frutinhas`, com o nome do tema). */
const UVA = 'frutinhas';
/** Quantas crianças cada lista salva guarda (as mais recentes). */
const MAX_SALVOS = 64;

export interface JogadorMissoesBaile {
  id: string;
  x: number;
  y: number;
  z: number;
  morto: boolean;
  aberta(missao: string): boolean;
  contar(item: string): number;
  /** Põe na mão (ou na mochila) e avisa a tela. */
  darNaMao(item: string, qtd: number): void;
  /** Põe na mochila (junto da pilha que já existe); devolve o que não coube. */
  dar(item: string, qtd: number): number;
  /** Tira da mochila; devolve quantos tirou. */
  tirar(item: string, qtd: number): number;
  /**
   * Um docinho na sacola de doces (a cheia ganha um, a vazia vira a cheia no mesmo espaço, sem
   * sacola uma nova na mão); o aviso da tela é o docinho (`doce`).
   */
  porNaSacola(doce: string): void;
  visitar(uso: string): void;
  visitou(uso: string): boolean;
}

export type EventoMissoesBaile =
  /**
   * n1: a porta `i` abriu (2 s, para todos). `doce`: contou para `quem` (um docinho na sacola);
   * `travessura`: a porta do fantasminha do confete (o doce vem igual).
   */
  | { e: 'bailePorta'; i: number; quem: string; doce?: true; travessura?: true }
  /** n2: a lanterna `i` acendeu (`acendeu`) ou piscou; `conta`: contou para `quem`. */
  | { e: 'baileLanterna'; i: number; quem: string; acendeu?: true; conta?: true }
  /** n2: as lanternas se apagaram (a n2 escolhida de novo, ninguém mais com ela aberta). */
  | { e: 'baileApagou' }
  /** n3: `quem` achou a Lulu no esconderijo `k`. */
  | { e: 'baileLulu'; quem: string; k: number }
  /** n4: a plantinha de `quem` (plantou, regou, colheu), a carinha escolhida e o lampião posto. */
  | { e: 'baileHorta'; quem: string; f: 'plantou' | 'regou' | 'colheu' }
  | { e: 'baileCarinha'; quem: string; c: number }
  | { e: 'baileLampiao'; quem: string; c: number }
  /**
   * n5: o Tufinho de verdade mudou (fugiu, seguiu `quem`, chegou em casa com `quem`); `copia`: é a
   * cópia da tela de `quem` (só ela vê).
   */
  | { e: 'baileTufinho'; o: TufinhoVista['o']; quem?: string; copia?: true; miou?: true };

export type ComandoMissoesBaile =
  | { a: 'campainha' | 'lanterna'; i: number }
  | { a: 'carinha'; c: number }
  | { a: 'lulu' | 'horta' | 'lampiao' | 'tufinho' | 'uva' };

export interface CtxMissoesBaile {
  plano: PlanoBaile;
  salvo: unknown;
  agora(): number;
  jogadores(): JogadorMissoesBaile[];
  jogador(id: string): JogadorMissoesBaile | undefined;
  /** O ganho de uma ação (a chave do diário e das missões de ação). */
  evento(id: string, chave: string): void;
  espalhar(e: EventoMissoesBaile): void;
  sujar(): void;
}

/** O que vai salvo com o mundo (`extras.baile.m`). */
interface SalvoMissoes {
  pt?: unknown;
  ln?: unknown;
  lc?: unknown;
  hv?: unknown;
  car?: unknown;
  lp?: unknown;
  tf?: unknown;
  tc?: unknown;
}

const obj = (v: unknown): Record<string, unknown> =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
const idOk = (k: string) => k.length > 0 && k.length <= 64;
/** Um mapa salvo de id -> lista de inteiros entre 0 e `max` (sem repetir). */
function listas(v: unknown, max: number): Map<string, number[]> {
  const m = new Map<string, number[]>();
  for (const [k, l] of Object.entries(obj(v)).slice(-MAX_SALVOS)) {
    if (!idOk(k) || !Array.isArray(l)) continue;
    const ok = [...new Set(l.filter((i): i is number => Number.isInteger(i) && i >= 0 && i <= max))];
    m.set(k, ok.slice(0, max + 1));
  }
  return m;
}
/** Põe no mapa limitado (a mais antiga sai). */
function guardar<V>(m: Map<string, V>, k: string, v: V): void {
  m.delete(k);
  m.set(k, v);
  if (m.size > MAX_SALVOS) m.delete(m.keys().next().value as string);
}

export function criarMissoesDoBaile(ctx: CtxMissoesBaile) {
  const p = ctx.plano.pontos;
  const s = obj(obj(ctx.salvo).m) as SalvoMissoes;
  const N_PORTAS = p.portas.length;
  const N_LANTERNAS = p.lanternas.length;

  // ------------------------------------------------------------------ o estado
  /** n1: as portas que já deram doce a cada criança (na ordem em que tocou). */
  const portasDe = listas(s.pt, N_PORTAS - 1);
  /** n1: até quando cada porta fica aberta (relógio do núcleo). */
  const abertaAte = new Array<number>(N_PORTAS).fill(-Infinity);
  /** n1: quem já ganhou a sacola vazia nesta sessão (não volta a cada passo). */
  const sacolaDada = new Set<string>();
  /** n2: as lanternas acesas (do mundo). */
  const acesas: boolean[] = Array.from({ length: N_LANTERNAS }, (_, i) =>
    Array.isArray(s.ln) ? s.ln[i] === true : false,
  );
  /** n2: as lanternas que já contaram para cada criança nesta rodada. */
  const contadas = listas(s.lc, N_LANTERNAS - 1);
  /** n4: a plantinha de cada criança (só na tela dela) e quando regou. */
  const hortas = new Map<string, { f: FaseHorta; t: number }>();
  for (const [k, f] of Object.entries(obj(s.hv)).slice(-MAX_SALVOS))
    // (salvo regada: volta pronta para colher, o tempo de crescer já passou)
    if (idOk(k) && (f === 'broto' || f === 'regada'))
      hortas.set(k, { f, t: f === 'regada' ? -Infinity : 0 });
  /** n4: a carinha que cada criança escolheu. */
  const carinhaDe = new Map<string, number>();
  for (const [k, c] of Object.entries(obj(s.car)).slice(-MAX_SALVOS))
    if (idOk(k) && Number.isInteger(c) && (c as number) >= 0 && (c as number) < CARINHAS.length)
      carinhaDe.set(k, c as number);
  /** n4: o lampião da porta da Vovó (a carinha), ou null. */
  let lampiaoPorta: number | null =
    Number.isInteger(s.lp) && (s.lp as number) >= 0 && (s.lp as number) < CARINHAS.length
      ? (s.lp as number)
      : null;
  /** n5: o Tufinho de verdade (salvo seguindo alguém, volta para a horta). */
  const tf0 = obj(s.tf).o;
  let tufinho: TufinhoVista = { o: tf0 === 'horta' || tf0 === 'segue' ? 'horta' : 'casa' };
  /** n5: a cópia "fugida" de cada criança (salva seguindo, volta para a horta). */
  const copias = new Map<string, 'horta' | 'segue'>();
  for (const [k, c] of Object.entries(obj(s.tc)).slice(-MAX_SALVOS))
    if (idOk(k) && (c === 'horta' || c === 'segue')) copias.set(k, 'horta');

  const passoDe = (j: JogadorMissoesBaile, usos: readonly string[]) =>
    passoEmOrdem(
      usos,
      usos.filter((u) => j.visitou(u)),
    );
  const vovo = p.portas.find((q) => q.vovo) ?? p.portas[p.portas.length - 1];

  // ------------------------------------------------------------------ n1: as portas
  /** A sacola de quem tocou ganha um docinho (a vazia vira a cheia; sem sacola, uma nova). */
  /** O docinho da porta `n` (a 1ª, a 2ª...): o brigadeiro, o beijinho e o cajuzinho, em roda. */
  const DOCES_DA_PORTA = ['brigadeiro', 'beijinho', 'cajuzinho'] as const;
  function porDoceNaSacola(j: JogadorMissoesBaile, n: number): void {
    j.porNaSacola(DOCES_DA_PORTA[(n - 1) % DOCES_DA_PORTA.length]);
  }

  function campainha(j: JogadorMissoesBaile, i: number): void {
    const porta = p.portas[i];
    if (!porta || !pertoNoChao(porta, j.x, j.y, j.z, M.campainha)) return;
    const t = ctx.agora();
    const minhas = portasDe.get(j.id) ?? [];
    const conta = j.aberta(M_DOCES) && !minhas.includes(i) && minhas.length < USOS_DOCES.length;
    // a porta já aberta (e que não conta para quem tocou agora) só fica aberta
    if (!conta && t < abertaAte[i]) return;
    abertaAte[i] = t + M.portaAberta;
    if (!conta) {
      ctx.espalhar({ e: 'bailePorta', i, quem: j.id });
      return;
    }
    const lista = [...minhas, i];
    guardar(portasDe, j.id, lista);
    j.visitar(USOS_DOCES[lista.length - 1]);
    porDoceNaSacola(j, lista.length);
    ctx.espalhar({
      e: 'bailePorta',
      i,
      quem: j.id,
      doce: true,
      ...(lista.length === M.travessura ? { travessura: true as const } : {}),
    });
    ctx.sujar();
  }

  /** A sacola vazia vai para a mão quando a n1 abre (uma vez por sessão, sem nenhuma porta). */
  function darSacolas(): void {
    for (const j of ctx.jogadores()) {
      if (j.morto || sacolaDada.has(j.id) || !j.aberta(M_DOCES)) continue;
      if ((portasDe.get(j.id)?.length ?? 0) > 0 || j.visitou(USOS_DOCES[0])) continue;
      sacolaDada.add(j.id);
      if (sacolaDada.size > 256) sacolaDada.delete(sacolaDada.values().next().value as string);
      if (j.contar(SACOLA_VAZIA) + j.contar(SACOLA_DOCES) > 0) continue;
      j.darNaMao(SACOLA_VAZIA, 1);
    }
  }

  // ------------------------------------------------------------------ n2: as lanternas
  function lanterna(j: JogadorMissoesBaile, i: number): void {
    const l = p.lanternas[i];
    if (!l || !pertoNoChao([l[0], l[1] - 2.6, l[2]], j.x, j.y, j.z, M.lanterna)) return;
    const acendeu = !acesas[i];
    acesas[i] = true;
    let minhas = contadas.get(j.id) ?? [];
    // a rodada de antes já acabou (a n2 voltou no bis): conta de novo
    if (j.aberta(M_LANTERNAS) && minhas.length >= N_LANTERNAS) minhas = [];
    const conta = j.aberta(M_LANTERNAS) && !minhas.includes(i);
    if (conta) guardar(contadas, j.id, [...minhas, i]);
    ctx.espalhar({
      e: 'baileLanterna',
      i,
      quem: j.id,
      ...(acendeu ? { acendeu: true as const } : {}),
      ...(conta ? { conta: true as const } : {}),
    });
    if (conta) ctx.evento(j.id, CHAVE_LANTERNA);
    if (conta || acendeu) ctx.sujar();
  }

  /** A n2 escolhida de novo: a rodada dela recomeça; sem mais ninguém com a n2, tudo se apaga. */
  function prepararLanternas(id: string): void {
    const j = ctx.jogador(id);
    if (!j || !j.aberta(M_LANTERNAS)) return;
    const minhas = contadas.get(id) ?? [];
    // (no meio da rodada, escolher de novo não apaga o que ela já fez)
    if (minhas.length > 0 && minhas.length < N_LANTERNAS) return;
    contadas.delete(id);
    const outros = ctx.jogadores().some((q) => q.id !== id && q.aberta(M_LANTERNAS));
    if (!outros && acesas.some(Boolean)) {
      acesas.fill(false);
      ctx.espalhar({ e: 'baileApagou' });
    }
    ctx.sujar();
  }

  // ------------------------------------------------------------------ n3: a Lulu
  function lulu(j: JogadorMissoesBaile): void {
    if (!j.aberta(M_LULU)) return;
    const k = passoDe(j, USOS_LULU);
    const e = p.esconderijos[k];
    if (!e || !pertoNoChao(e, j.x, j.y, j.z, M.lulu)) return;
    j.visitar(USOS_LULU[k]);
    ctx.espalhar({ e: 'baileLulu', quem: j.id, k });
  }

  // ------------------------------------------------------------------ n4: a abóbora de carinha
  function horta(j: JogadorMissoesBaile): void {
    if (!j.aberta(M_ABOBORA) || passoDe(j, USOS_ABOBORA) !== 0) return;
    if (!pertoNoChao(p.canteiro, j.x, j.y, j.z, M.canteiro)) return;
    const h = hortas.get(j.id) ?? null;
    const t = ctx.agora();
    if (!h) {
      guardar(hortas, j.id, { f: 'broto', t });
      ctx.espalhar({ e: 'baileHorta', quem: j.id, f: 'plantou' });
    } else if (h.f === 'broto') {
      guardar(hortas, j.id, { f: 'regada', t });
      ctx.espalhar({ e: 'baileHorta', quem: j.id, f: 'regou' });
    } else if (prontaParaColher(h.f, t - h.t)) {
      hortas.delete(j.id);
      j.visitar(USOS_ABOBORA[0]);
      if (j.contar(ABOBORA) < 1) j.darNaMao(ABOBORA, 1);
      ctx.espalhar({ e: 'baileHorta', quem: j.id, f: 'colheu' });
    } else return;
    ctx.sujar();
  }

  function carinha(j: JogadorMissoesBaile, c: number): void {
    if (!(c >= 0 && c < CARINHAS.length)) return;
    if (!j.aberta(M_ABOBORA) || passoDe(j, USOS_ABOBORA) !== 1) return;
    if (!pertoNoChao(p.bancada, j.x, j.y, j.z, M.bancada)) return;
    guardar(carinhaDe, j.id, c);
    j.tirar(ABOBORA, 1);
    j.darNaMao(LAMPIOES_CARINHA[c], 1);
    j.visitar(USOS_ABOBORA[1]);
    ctx.espalhar({ e: 'baileCarinha', quem: j.id, c });
    ctx.sujar();
  }

  function lampiao(j: JogadorMissoesBaile): void {
    if (!j.aberta(M_ABOBORA) || passoDe(j, USOS_ABOBORA) !== 2) return;
    if (!pertoNoChao(vovo, j.x, j.y, j.z, M.porta)) return;
    const c = carinhaDe.get(j.id) ?? 0;
    lampiaoPorta = c;
    for (const l of LAMPIOES_CARINHA) if (j.tirar(l, 1) > 0) break;
    j.visitar(USOS_ABOBORA[2]);
    // quem também está no último passo, perto da porta, faz o passo junto
    for (const q of ctx.jogadores())
      if (
        q.id !== j.id &&
        !q.morto &&
        q.aberta(M_ABOBORA) &&
        passoDe(q, USOS_ABOBORA) === 2 &&
        pertoNoChao(vovo, q.x, q.y, q.z, M.portaAmigo)
      )
        q.visitar(USOS_ABOBORA[2]);
    ctx.espalhar({ e: 'baileLampiao', quem: j.id, c });
    ctx.sujar();
  }

  // ------------------------------------------------------------------ n5: o Tufinho
  const naHorta = (j: JogadorMissoesBaile) => pertoNoChao(p.tufinhoHorta, j.x, j.y, j.z, M.tufinho);
  const pertoDaVovo = (j: JogadorMissoesBaile) => pertoNoChao(p.varanda, j.x, j.y, j.z, M.entrega);
  const fezN5 = (j: JogadorMissoesBaile) => passoDe(j, USOS_TUFINHO) >= USOS_TUFINHO.length;

  function tocarTufinho(j: JogadorMissoesBaile): void {
    if (!j.aberta(M_TUFINHO) || fezN5(j)) return;
    const achou = () => {
      if (!j.visitou(USOS_TUFINHO[0])) j.visitar(USOS_TUFINHO[0]);
    };
    const copia = copias.get(j.id);
    if (copia === 'horta' && naHorta(j)) {
      copias.set(j.id, 'segue');
      achou();
      ctx.espalhar({ e: 'baileTufinho', o: 'segue', quem: j.id, copia: true, miou: true });
    } else if (!copia && tufinho.o === 'horta' && naHorta(j)) {
      tufinho = { o: 'segue', q: j.id };
      achou();
      ctx.espalhar({ e: 'baileTufinho', o: 'segue', quem: j.id, miou: true });
    } else if (!copia && tufinho.o === 'segue' && tufinho.q !== j.id) {
      // ele segue um amigo: achou também (vai junto até a Vovó), mas ele continua com o amigo
      const q = ctx.jogador(tufinho.q ?? '');
      if (!q || !pertoNoChao([q.x, q.y, q.z], j.x, j.y, j.z, M.tufinho + 1.5)) return;
      achou();
      ctx.espalhar({ e: 'baileTufinho', o: 'segue', quem: tufinho.q, miou: true });
    } else return;
    ctx.sujar();
  }

  function cuidarDoTufinho(): void {
    const todos = ctx.jogadores();
    let mudou = false;
    // quem segue o Tufinho de verdade e saiu (ou a missão fechou): ele volta para a horta
    if (tufinho.o === 'segue') {
      const q = ctx.jogador(tufinho.q ?? '');
      if (!q || q.morto || !q.aberta(M_TUFINHO)) {
        tufinho = { o: 'horta' };
        ctx.espalhar({ e: 'baileTufinho', o: 'horta' });
        mudou = true;
      } else if (pertoDaVovo(q)) {
        // a entrega: conta para todos com a n5 aberta perto da Vovó
        tufinho = { o: 'casa' };
        for (const j of todos)
          if (!j.morto && j.aberta(M_TUFINHO) && !fezN5(j) && pertoDaVovo(j))
            for (const u of USOS_TUFINHO) if (!j.visitou(u)) j.visitar(u);
        ctx.espalhar({ e: 'baileTufinho', o: 'casa', quem: q.id });
        // quem ficou longe (num passo anterior) ganha a cópia fugida na horta
        for (const j of todos)
          if (!j.morto && j.aberta(M_TUFINHO) && !fezN5(j) && !copias.has(j.id))
            guardar(copias, j.id, 'horta');
        mudou = true;
      }
    }
    // as cópias: a que segue chega na Vovó (só a dona faz o passo); a da criança que saiu some
    for (const [id, c] of [...copias]) {
      const j = ctx.jogador(id);
      if (!j) continue;
      if (!j.aberta(M_TUFINHO) || fezN5(j)) {
        copias.delete(id);
        mudou = true;
      } else if (c === 'segue' && !j.morto && pertoDaVovo(j)) {
        for (const u of USOS_TUFINHO) if (!j.visitou(u)) j.visitar(u);
        copias.delete(id);
        ctx.espalhar({ e: 'baileTufinho', o: 'casa', quem: id, copia: true });
        mudou = true;
      }
    }
    // alguém abriu a n5 com ele em casa (e ninguém com ele): ele foge para a horta
    if (
      tufinho.o === 'casa' &&
      todos.some((j) => !j.morto && j.aberta(M_TUFINHO) && !fezN5(j) && !copias.has(j.id))
    ) {
      tufinho = { o: 'horta' };
      ctx.espalhar({ e: 'baileTufinho', o: 'horta' });
      mudou = true;
    }
    if (mudou) ctx.sujar();
  }

  // ------------------------------------------------------------------ a uva da parreirinha
  function uva(j: JogadorMissoesBaile): void {
    if (!pertoNoChao(p.parreira, j.x, j.y, j.z, M.parreira)) return;
    if (j.contar(UVA) >= M.uvas) return;
    j.darNaMao(UVA, 1);
  }

  // ------------------------------------------------------------------ a vista e o salvamento
  function vistaDe(id: string): BaileVista {
    const t = ctx.agora();
    const h = hortas.get(id);
    const car = carinhaDe.get(id);
    const tc = copias.get(id);
    return {
      t: Math.round(t * 1000) / 1000,
      pt: [...(portasDe.get(id) ?? [])],
      ln: [...acesas],
      lc: [...(contadas.get(id) ?? [])],
      ...(h ? { hv: { f: h.f, r: h.t === -Infinity ? 99 : Math.round((t - h.t) * 100) / 100 } } : {}),
      ...(car !== undefined ? { car } : {}),
      ...(lampiaoPorta !== null ? { lp: lampiaoPorta } : {}),
      tf: { ...tufinho },
      ...(tc ? { tc } : {}),
    };
  }

  return {
    comando(id: string, c: ComandoMissoesBaile): void {
      const j = ctx.jogador(id);
      if (!j || j.morto) return;
      if (c.a === 'campainha') campainha(j, c.i);
      else if (c.a === 'lanterna') lanterna(j, c.i);
      else if (c.a === 'lulu') lulu(j);
      else if (c.a === 'horta') horta(j);
      else if (c.a === 'carinha') carinha(j, c.c);
      else if (c.a === 'lampiao') lampiao(j);
      else if (c.a === 'tufinho') tocarTufinho(j);
      else uva(j);
    },
    /** A cada passo do núcleo (o número do passo). */
    passo(n: number): void {
      if (n % 5 === 2) cuidarDoTufinho();
      if (n % 20 === 7) darSacolas();
    },
    /** A missão foi escolhida (ou escolhida de novo) por `id`: o que é dela volta ao lugar. */
    preparar(id: string, missao: string | null): void {
      if (missao === M_LANTERNAS) prepararLanternas(id);
      else if (missao === M_DOCES) {
        // escolheu a n1: a sacola vazia vai para a mão (se não tem nenhuma)
        const j = ctx.jogador(id);
        if (!j || j.morto || (portasDe.get(id)?.length ?? 0) > 0) return;
        if (j.contar(SACOLA_VAZIA) + j.contar(SACOLA_DOCES) > 0) return;
        sacolaDada.add(id);
        j.darNaMao(SACOLA_VAZIA, 1);
      }
    },
    vistaDe,
    /** Testes: as portas abertas agora (índices). */
    portasAbertas: (): number[] =>
      abertaAte.flatMap((t, i) => (ctx.agora() < t ? [i] : [])),
    /** Testes: o Tufinho de verdade e as cópias. */
    tufinho: () => ({ ...tufinho }),
    copias: () => Object.fromEntries(copias),
    salvar: () => {
      const m: Record<string, unknown> = {};
      if (portasDe.size) m.pt = Object.fromEntries(portasDe);
      if (acesas.some(Boolean)) m.ln = [...acesas];
      if (contadas.size) m.lc = Object.fromEntries(contadas);
      if (hortas.size) m.hv = Object.fromEntries([...hortas].map(([k, h]) => [k, h.f]));
      if (carinhaDe.size) m.car = Object.fromEntries(carinhaDe);
      if (lampiaoPorta !== null) m.lp = lampiaoPorta;
      if (tufinho.o !== 'casa') m.tf = { o: tufinho.o };
      if (copias.size) m.tc = Object.fromEntries(copias);
      return m;
    },
  };
}

export type MissoesDoBaile = ReturnType<typeof criarMissoesDoBaile>;
