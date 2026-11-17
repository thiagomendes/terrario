/**
 * A Vila Neon no núcleo (spec 026, parte 1): o que é do bairro e muda com o jogo, igual no
 * aparelho e na nuvem. Puro (sem tela, sem DOM): o núcleo passa o que este módulo precisa.
 *
 * - **Moradores com posto** (o vocalista na ponta da passarela, o roadie, a guitarrista, a
 *   moça do lanche, a dançarina e o patinador no rinque, a moça da lanchonete e o moço da
 *   banca): aparecem quando alguém chega perto, ficam no posto e olham para a criança. Como os
 *   da cidade, não vão salvos.
 * - **O Show da Vila é um acontecimento do bairro, sem missão** (o dono, 16 nov 2026): toda noite,
 *   com alguém no festival, as três caixas acendem sozinhas uma a uma e o show começa (uma vez
 *   por noite), no roteiro de `src/jogo/show.ts` (a abertura, a entrada da banda, as três músicas
 *   e o acorde final, que vem sozinho). É só para ver e dançar: nenhum toque muda o show. Fora
 *   dele as três caixas são brinquedo livre (cada toque liga e desliga a camada dela).
 * - **A banda** (o vocalista, a guitarrista, a baixista, o baterista, a tecladista e a roadie) anda
 *   pela coreografia de `src/jogo/coreografia.ts`: o núcleo põe cada um onde ela manda, a cada
 *   passo (todos veem o mesmo). Fora do show nunca fica no palco: de dia de papo na frente da van,
 *   de noite esperando na coxia; quando o show começa, quem estiver longe da coxia aparece nela
 *   (no escuro da abertura), e todos sobem pela escadinha.
 * - **As lhamas (f2):** duas no cercadinho da beira do campo; o feno aparece na mão de quem tem
 *   a missão ao chegar perto; a lhama segue o feno (a regra da 013) e, ao chegar à grade da
 *   plateia, fica ali balançando no ritmo.
 * - **A volta no rinque (f4):** três arcos de neon na pista do rinque; quem passa por dentro de um
 *   deles de patins acende o arco (para ele) e conta a bolinha.
 * - **O que é de cada missão volta só quando ela é escolhida de novo**, nunca com o tempo.
 * - **Moedinha nenhuma por ação**: o núcleo só conta as chaves (`achou:instrumento`,
 *   `levou:lhama`, `rinque:arco`); as moedinhas vêm no fim da missão (alma).
 */
import type { PlanoVila, PostoVila } from '../world/vilaNeon';
import type { Profissao } from '../world/povoado';
import type { Criatura, TipoSer } from '../jogo/criaturas';
import {
  ACENDE_SOZINHA,
  alcancaOPalco,
  faseDoShow,
  finalSozinho,
  idDaNoite,
  momentoFinalSozinho,
  NOITE_ANTES,
  noiteDeShow,
  PERTO_ANTES,
  TOQUES_POR_SEGUNDO,
  CHAMADO,
  ESPERA_FINAL,
  type Show,
} from '../jogo/show';
import {
  doMundo,
  giroDoDescanso,
  lugarDeDescanso,
  paraOMundo,
  posturaNaBanda,
  rota,
  alturaEm,
  BANCO,
  ALTURA_BANCO,
  INICIO_DO_SHOW,
  type PapelBanda,
  type Ponto,
} from '../jogo/coreografia';
import { dentroDoArco, F_RINQUE, CHAVE_ARCO } from '../jogo/rinque';
import {
  alguemVe,
  caminhoDoPublico,
  lugarDoPublico,
  publicoDaVila,
  retoDoPublico,
  PUBLICO_GRADE,
} from '../world/publicoVila';
import type { ParqueVista } from '../jogo/parque';
import { N0_PILOTOS, N_MORADORES_BATE, pilotoDoBate } from '../jogo/bate';
import { criarParqueNucleo, type ComandoParque, type EventoParque } from './parque';
import { criarMissoesDoParque, type ComandoMissoes, type EventoMissoes } from './vilaMissoes';
import { F_BALOES } from '../jogo/missoesParque';

/** Os postos e quem mora em cada um (o número é o `n` do morador). */
export const MORADORES_VILA: readonly { posto: PostoVila; profissao: Profissao }[] = [
  { posto: 'vocalista', profissao: 'ferreiro' },
  { posto: 'roadie', profissao: 'construtor' },
  { posto: 'guitarrista', profissao: 'ferreiro' },
  { posto: 'lanche', profissao: 'cozinheiro' },
  { posto: 'danca', profissao: 'cozinheiro' },
  { posto: 'patinador', profissao: 'construtor' },
  { posto: 'lanchonete', profissao: 'cozinheiro' },
  { posto: 'banca', profissao: 'construtor' },
];
/** A turma da grade (o público do show) vem depois dos de posto: n de N0_PUBLICO em diante. */
export const N0_PUBLICO = MORADORES_VILA.length;
/**
 * O resto da banda (o dono, 16 nov 2026: "a banda entra no palco"; e a tecladista): o baterista,
 * a baixista e a tecladista, com números depois dos da turma (que vai até 8 + 40).
 */
export const BATERISTA = 60;
export const BAIXISTA = 61;
export const TECLADISTA = 62;
/** Quem é da banda (o n do morador e o papel na coreografia). */
export const BANDA: readonly { n: number; papel: PapelBanda; profissao: Profissao }[] = [
  { n: 0, papel: 'vocalista', profissao: 'ferreiro' },
  { n: 1, papel: 'roadie', profissao: 'construtor' },
  { n: 2, papel: 'guitarrista', profissao: 'ferreiro' },
  { n: BATERISTA, papel: 'baterista', profissao: 'ferreiro' },
  { n: BAIXISTA, papel: 'baixista', profissao: 'ferreiro' },
  { n: TECLADISTA, papel: 'tecladista', profissao: 'ferreiro' },
];
/**
 * Os moradores do parque (spec 026, parte 2), com números depois dos da banda: o pipoqueiro
 * (cozinheiro: a pipoca), o moço do bate-bate (construtor) e a vendedora de balões.
 */
export const PIPOQUEIRO = 63;
export const MOCO_DO_BATE = 64;
export const VENDEDORA_DE_BALOES = 65;
export const MORADORES_PARQUE: readonly { n: number; posto: PostoVila; profissao: Profissao }[] = [
  { n: PIPOQUEIRO, posto: 'pipoqueiro', profissao: 'cozinheiro' },
  { n: MOCO_DO_BATE, posto: 'bate', profissao: 'construtor' },
  { n: VENDEDORA_DE_BALOES, posto: 'baloes', profissao: 'cozinheiro' },
];
/**
 * A vovó (spec 026, parte 2, etapa B), com o número depois dos pilotos do bate-bate (66 a 69):
 * espera no portãozinho da Casa anos 80 a prenda da f8. A parte 3 a leva para o sofá da sala.
 */
export const AVO = 70;
/** O n é da turma da grade (o público do show)? */
export const daTurma = (n: number) => n >= N0_PUBLICO && n < N0_PUBLICO + PUBLICO_GRADE;
/** O papel na banda de um morador da vila (null: não é da banda). */
export const papelNaBanda = (n: number): PapelBanda | null =>
  BANDA.find((m) => m.n === n)?.papel ?? null;
/** O povoado dos moradores do bairro (o nome que vai na criatura). */
export const POVOADO_VILA = 'vila';
/** O vocalista (n = 0): um toque nele dá o pôster da banda, uma vez por mundo a cada criança. */
export const VOCALISTA = 0;

/** Os instrumentos dos estojos (a ordem dos pontos do plano: rua, pista, festival). */
export const INSTRUMENTOS = ['teclado', 'guitarra', 'baquetas'] as const;
/** Chega a tantos blocos do estojo e ele é achado. */
export const PERTO_DO_ESTOJO = 1.6;
/** Até onde, fora do festival, ainda é "perto do festival" (blocos): o show começa sozinho. */
export const PERTO_DO_FESTIVAL = 6;
/** Perto da lhama (blocos): o feno aparece na mão. */
export const PERTO_DA_LHAMA = 4;
/** O presente do vocalista: a parede de pôster (bloco 108) da banda inventada. */
export const PRESENTE_VOCALISTA = { item: 'bloco:108', qtd: 4 } as const;
/** A comida das lhamas (o papel cervo come trigo em todo tema; aqui o nome é "feno"). */
export const FENO = 'trigo';

/** O que vai para a tela (no quadro, quando muda, e o relógio a cada segundo). */
export interface VilaVista {
  /** O relógio do núcleo (s), para a tela tocar no mesmo tempo. */
  t: number;
  /** Instrumento achado (já no palco), por estojo. */
  ins: [boolean, boolean, boolean];
  /** Caixa acesa, por caixa do palco. */
  cx: [boolean, boolean, boolean];
  show: Show | null;
  /** As lhamas que chegaram à grade (ids das criaturas). */
  lhamas: number[];
  /** Os arcos do rinque que quem recebe o quadro já acendeu (f4), por arco. */
  arcos?: [boolean, boolean, boolean];
  /** Spec 026 (parte 2): o parque (quem está sentado em qual cadeira e o empurrão da roda). */
  parque?: ParqueVista;
  /** Etapa B (f6): os balões fugidos que quem recebe o quadro já pegou nesta rodada. */
  bal?: [boolean, boolean, boolean];
  /** Etapa B (f6): quem, no mundo, leva o balão de presente da Dona Flor (ids dos jogadores). */
  balao?: string[];
}

/** O que vai salvo com o mundo (`extras.vila`). */
interface VilaSalva {
  ins?: unknown;
  cx?: unknown;
  poster?: unknown;
  /** A noite (`idDaNoite`) do último show: uma vez por noite. */
  noite?: unknown;
  /** (de antes do show sozinho: o show da rodada já tinha tocado; agora não vale mais nada) */
  tocou?: unknown;
  /** Etapa B: quem ganhou o balão de presente da Dona Flor. */
  balao?: unknown;
}

/** Um jogador, como o módulo o vê. */
export interface JogadorVila {
  id: string;
  x: number;
  y: number;
  z: number;
  morto: boolean;
  /** Para onde olha (o yaw da câmera dele): ninguém da turma some nem nasce à vista. */
  olhar?: number;
  /** Está de patins (a aparência: só na Vila Neon)? */
  patins: boolean;
  /** A missão do selinho deste jogador neste mundo (ou null). */
  missao: string | null;
  /** A missão está aberta para ele agora (uma das da vez, ou o bis)? */
  aberta(missao: string): boolean;
  /** Quantos deste item ele tem (mochila e mão). */
  contar(item: string): number;
  /** Põe na mão (ou na mochila) e avisa a tela. */
  darNaMao(item: string, qtd: number): void;
  /** Põe na mochila (presente); devolve o que não coube. */
  dar(item: string, qtd: number): number;
  /** Spec 026 (parte 2): o próximo lugar que ele mandar vale (desceu de um brinquedo do parque). */
  soltar?(): void;
  /** Etapa B: tira da mochila (o feno no cocho, a pelúcia para a vovó); devolve quantos tirou. */
  tirar?(item: string, qtd: number): number;
  /** Etapa B: um "lugar" das missões de lugares (o carimbo do bilhete, o passo da prenda). */
  visitar?(uso: string): void;
  visitou?(uso: string): boolean;
}

export interface CtxVila {
  plano: PlanoVila;
  salvo: unknown;
  agora(): number;
  /** A hora do dia (0 a 1): o show só começa de noite (`noiteDeShow`). */
  hora(): number;
  /** O dia do mundo (conta as noites: um show por noite). */
  dia(): number;
  jogadores(): JogadorVila[];
  jogador(id: string): JogadorVila | undefined;
  adicionar(tipo: TipoSer, x: number, y: number, z: number): Criatura;
  criaturas(): readonly Criatura[];
  /** O chão da coluna já está carregado (alguém vê)? */
  carregado(x: number, z: number): boolean;
  /** Conta a chave da alma para o jogador (as missões e o ganho). */
  evento(id: string, chave: string, qtd?: number): void;
  /** Evento para todos (o acorde, o plim). */
  espalhar(e: EventoVila): void;
  /** O estado mudou: a tela precisa do quadro novo (e o salvamento também). */
  sujar(): void;
}

export type EventoVila =
  | { e: 'vilaFinal'; quando: number; quem: string }
  | { e: 'vilaEstojo'; i: number; quem: string }
  | { e: 'vilaCaixa'; i: number; acesa: boolean; quem: string; dia?: true }
  | { e: 'vilaLhama'; criatura: number; quem: string }
  | { e: 'vilaPresente'; quem: string }
  /** Alguém de patins passou por dentro de um arco do rinque (o brilho e o som, para todos). */
  | { e: 'vilaArco'; i: number; quem: string }
  /** Spec 026 (parte 2): o parque (sentou, desceu, o "tum" e o empurrão da roda). */
  | EventoParque
  /** Etapa B: as missões do parque (o balão que desce, a prenda, a vovó, o lanche das lhamas). */
  | EventoMissoes;

/**
 * O toque numa caixa do palco (fora do show: brinquedo livre) e, no parque (parte 2), sentar
 * num brinquedo, sair dele, o "tum" do bate-bate e o empurrãozinho da roda-gigante.
 */
export type ComandoVila = { a: 'caixa'; i: number } | ComandoParque | ComandoMissoes;

const tres = (v: unknown): [boolean, boolean, boolean] =>
  Array.isArray(v) && v.length === 3
    ? [v[0] === true, v[1] === true, v[2] === true]
    : [false, false, false];

export function criarVila(ctx: CtxVila) {
  const { plano } = ctx;
  const p = plano.pontos;
  const salvo = (ctx.salvo && typeof ctx.salvo === 'object' ? ctx.salvo : {}) as VilaSalva;
  const ins = tres(salvo.ins);
  const caixas = tres(salvo.cx);
  /** Quem já ganhou o pôster do vocalista neste mundo. */
  const poster = new Set<string>(
    Array.isArray(salvo.poster)
      ? salvo.poster.filter((s): s is string => typeof s === 'string').slice(0, 64)
      : [],
  );
  let show: Show | null = null;
  /** Os arcos do rinque que cada jogador já acendeu nesta volta (f4): `${id}:${arco}`. */
  const arcos = new Set<string>();
  /** As lhamas do cercadinho e as que chegaram à grade. */
  const lhamas = new Set<number>();
  const naGrade = new Set<number>();
  /** Toques de cada jogador no último segundo (o limite por segundo). */
  const toques = new Map<string, number[]>();

  const cerc = p.cercado;
  const meioCercado: [number, number] = [(cerc.x0 + cerc.x1 + 1) / 2, (cerc.z0 + cerc.z1 + 1) / 2];
  const grade = p.plateia;

  // o parque (parte 2): o núcleo é dono das cadeiras dos brinquedos
  const parque = criarParqueNucleo({
    parque: p.parque,
    chao: plano.h + 1,
    agora: ctx.agora,
    jogadores: ctx.jogadores,
    jogador: ctx.jogador,
    soltar: (id) => ctx.jogador(id)?.soltar?.(),
    // (o passeio inteiro também carimba o bilhete de quem tem a f5 aberta)
    evento: (id, chave, qtd) => {
      ctx.evento(id, chave, qtd);
      missoes.passeio(id, chave);
    },
    espalhar: ctx.espalhar,
    sujar: ctx.sujar,
  });

  /** As duas lhamas da fazendinha do parque (ids das criaturas). */
  const daFazendinha = new Set<number>();
  // as missões do parque e os toques da rua (etapa B)
  const missoes = criarMissoesDoParque({
    parque: p.parque,
    rua: p.rua,
    avo: p.postos.avo,
    chao: plano.h + 1,
    salvo: salvo.balao,
    agora: ctx.agora,
    jogadores: ctx.jogadores,
    jogador: ctx.jogador,
    criaturas: ctx.criaturas,
    lhamas: () => [...daFazendinha],
    evento: ctx.evento,
    espalhar: ctx.espalhar,
    sujar: ctx.sujar,
  });

  const vista = (): VilaVista => {
    const balao = missoes.comBalao();
    return {
      t: Math.round(ctx.agora() * 1000) / 1000,
      ins: [...ins] as VilaVista['ins'],
      cx: [...caixas] as VilaVista['cx'],
      show: show ? { ...show } : null,
      lhamas: [...naGrade],
      parque: parque.vista(),
      ...(balao.length ? { balao } : {}),
    };
  };
  /** Os arcos que este jogador já acendeu. */
  const arcosDe = (id: string): [boolean, boolean, boolean] => [
    arcos.has(`${id}:0`),
    arcos.has(`${id}:1`),
    arcos.has(`${id}:2`),
  ];

  // ------------------------------------------------------------------ moradores
  function cuidarDosMoradores(): void {
    const vivos = new Set<number>();
    for (const c of ctx.criaturas())
      if (c.morador?.povoado === POVOADO_VILA && c.estado !== 'morrendo') vivos.add(c.morador.n);
    const lista: { n: number; profissao: Profissao; posto: [number, number, number] }[] = [
      ...MORADORES_VILA.map((m, n) => ({ n, profissao: m.profissao, posto: p.postos[m.posto] })),
      ...BANDA.filter((b) => b.n >= N0_PUBLICO).map((b) => ({
        n: b.n,
        profissao: b.profissao,
        posto: ondeDescansa(b.papel),
      })),
      ...MORADORES_PARQUE.map((m) => ({
        n: m.n,
        profissao: m.profissao,
        posto: p.postos[m.posto],
      })),
      // a vovó, no portãozinho da Casa anos 80
      { n: AVO, profissao: 'cozinheiro' as Profissao, posto: p.postos.avo },
      // quem guia os carrinhos do bate-bate: cada um no carrinho dele
      ...parque.carros().slice(0, N_MORADORES_BATE).map((c, i) => ({
        n: N0_PILOTOS + i,
        profissao: 'construtor' as Profissao,
        posto: [c.x, p.parque.bate.y, c.z] as [number, number, number],
      })),
    ];
    // quem é da banda aparece onde a coreografia (ou o descanso, fora do palco) o põe agora
    for (const m of lista) {
      const papel = papelNaBanda(m.n);
      if (papel) m.posto = ondeDescansa(papel);
    }
    lista.forEach((m) => {
      const n = m.n;
      if (vivos.has(n)) return;
      const posto = m.posto;
      const perto = ctx.jogadores().some((j) => Math.hypot(j.x - posto[0], j.z - posto[2]) < 56);
      if (!perto || !ctx.carregado(posto[0], posto[2])) return;
      const c = ctx.adicionar('morador', posto[0], posto[1], posto[2]);
      c.morador = {
        povoado: POVOADO_VILA,
        n,
        profissao: m.profissao,
        fora: posto,
        dentro: posto,
        oficina: posto,
        praca: posto,
        rotaCasa: [],
        rotaOficina: [],
        centro: [posto[0] + 1000, posto[2]],
        posto,
      };
    });
  }

  /**
   * Os moradores que guiam os carrinhos do bate-bate (parte 2): a cada passo, cada um fica no
   * carrinho dele (o lugar e o rumo são os do carrinho que o núcleo simula).
   */
  function cuidarDosPilotos(): void {
    const carros = parque.carros();
    for (const c of ctx.criaturas()) {
      if (c.morador?.povoado !== POVOADO_VILA || c.estado === 'morrendo') continue;
      const carro = carros[pilotoDoBate(c.morador.n)];
      if (carro) porNoLugar(c, carro.x, p.parque.bate.y, carro.z, carro.yaw);
    }
  }

  /** Um toque no vocalista: o pôster da banda, uma vez por mundo para cada criança. */
  function falou(id: string, c: Criatura): void {
    if (c.morador?.povoado !== POVOADO_VILA || c.morador.n !== VOCALISTA || poster.has(id)) return;
    const j = ctx.jogador(id);
    if (!j || j.morto) return;
    if (j.dar(PRESENTE_VOCALISTA.item, PRESENTE_VOCALISTA.qtd) >= PRESENTE_VOCALISTA.qtd) return;
    poster.add(id);
    ctx.espalhar({ e: 'vilaPresente', quem: id });
    ctx.sujar();
  }

  // ------------------------------------------------------------------ a banda
  const palcoP = p.palco;
  const mundoDe = (q: Ponto, altura: number) => paraOMundo(palcoP, q[0], q[1], altura);
  /** O descanso da banda fora do show (nunca no palco): de dia a van, de noite a coxia. */
  const deDia = () => !noiteDeShow(ctx.hora());
  const descanso = (papel: PapelBanda): Ponto => lugarDeDescanso(papel, deDia());
  const alturaDoDescanso = (papel: PapelBanda, q: Ponto) =>
    papel === 'baterista' && Math.hypot(q[0] - BANCO[0], q[1] - BANCO[1]) < 0.3
      ? ALTURA_BANCO
      : alturaEm(q[0], q[1]);
  /** Onde o músico deve estar agora (no mundo): o lugar da coreografia, ou o do descanso. */
  function ondeDescansa(papel: PapelBanda): [number, number, number] {
    if (show && faseDoShow(show, ctx.agora()) !== 'acabou') {
      const q = posturaNaBanda(papel, show, ctx.agora());
      return mundoDe([q.a, q.b], q.altura);
    }
    const q = descanso(papel);
    return mundoDe(q, alturaDoDescanso(papel, q));
  }
  /** Quem da banda ainda está indo para o lugar da coreografia (chegou atrasado ao show). */
  const atrasados = new Set<number>();
  /** O relógio do show pulou (o atalho dos testes): a banda vai direto para o lugar. */
  let saltou = false;
  /** Velocidade de quem anda fora da coreografia (para o descanso, ou alcançando o show). */
  const VEL_DESCANSO = 1.9;
  const VEL_ALCANCAR = 3.2;
  /** Mais longe que isto da coxia quando o show começa, o músico aparece nela (blocos). */
  const LONGE_DA_COXIA = 4;

  /**
   * O caminho de quem anda fora da coreografia (atrasado, ou indo descansar): os pontos de
   * passagem que faltam e o alvo para onde ele foi feito. Feito uma vez e seguido até o fim (refeito
   * só quando o alvo muda de lugar de verdade): refazer a cada passo podia pôr um ponto de
   * passagem para trás e deixar o músico indo e voltando no mesmo lugar (o dono, 16 nov 2026:
   * "desceu para subir de novo e ficou presa").
   */
  const trilhas = new Map<number, { alvo: Ponto; pts: Ponto[] }>();
  /** O alvo andou mais que isto desde que a trilha foi feita: refaz (blocos). */
  const REFAZ_TRILHA = 3;

  /** Anda um passo pelo caminho até `para` (no palco): devolve onde chegou e para onde olha. */
  function andarAte(
    id: number,
    de: Ponto,
    para: Ponto,
    dist: number,
  ): { q: Ponto; dir: number | null } {
    let tr = trilhas.get(id);
    if (!tr || Math.hypot(tr.alvo[0] - para[0], tr.alvo[1] - para[1]) > REFAZ_TRILHA) {
      tr = { alvo: para, pts: rota(de, para).slice(0, -1) };
      trilhas.set(id, tr);
    }
    let atual = de;
    let resta = dist;
    let dir: number | null = null;
    while (resta > 1e-9) {
      const alvo = tr.pts[0] ?? para;
      const d = Math.hypot(alvo[0] - atual[0], alvo[1] - atual[1]);
      if (d > 1e-6) dir = Math.atan2(alvo[0] - atual[0], alvo[1] - atual[1]);
      if (d > resta) {
        const k = resta / d;
        return {
          q: [atual[0] + (alvo[0] - atual[0]) * k, atual[1] + (alvo[1] - atual[1]) * k],
          dir,
        };
      }
      resta -= d;
      atual = alvo;
      if (!tr.pts.length) break;
      tr.pts.shift();
    }
    trilhas.delete(id);
    return { q: para, dir: null };
  }

  /** Põe o músico no lugar (e deixa a rotina dele parada ali). */
  function porNoLugar(c: Criatura, x: number, y: number, z: number, giro: number | null): void {
    c.x = x;
    c.y = y;
    c.z = z;
    c.vx = 0;
    c.vy = 0;
    c.vz = 0;
    c.noChao = true;
    if (giro !== null) c.yaw = c.yawAlvo = giro;
    const m = c.morador!;
    m.posto = [x, y, z];
    m.caminho = undefined;
    m.ir = undefined;
  }

  /**
   * O show começou: quem da banda não está perto da coxia (onde a coreografia começa) aparece
   * nela, no escuro da abertura. A banda já espera ali de noite; isto é só para quem ficou num
   * lugar estranho (empurrado, nascido longe, a noite chegando com ele no caminho): nada de ficar
   * preso nem de cortar caminho pelo palco.
   */
  function aCoxiaNoComeco(): void {
    for (const c of ctx.criaturas()) {
      const n = c.morador?.povoado === POVOADO_VILA ? c.morador.n : -1;
      const papel = n >= 0 ? papelNaBanda(n) : null;
      if (!papel || c.estado === 'morrendo') continue;
      const ini = INICIO_DO_SHOW[papel];
      const aqui = doMundo(palcoP, c.x, c.z);
      if (Math.hypot(ini[0] - aqui[0], ini[1] - aqui[1]) <= LONGE_DA_COXIA) continue;
      const [x, y, z] = mundoDe(ini, alturaEm(ini[0], ini[1]));
      porNoLugar(c, x, y, z, giroDoDescanso(papel, false));
      atrasados.delete(c.id);
      trilhas.delete(c.id);
    }
  }

  /**
   * A banda, a cada passo: no show, onde a coreografia manda (quem chegou atrasado anda até lá);
   * fora dele, vai a pé até o lugar de descanso (de dia a van, de noite a coxia: nunca o palco) e
   * fica lá de papo (de dia, virado para a roda) ou olhando para o palco (de noite).
   */
  function cuidarDaBanda(dt: number): void {
    const t = ctx.agora();
    const noShow = !!show && faseDoShow(show, t) !== 'acabou';
    for (const c of ctx.criaturas()) {
      const n = c.morador?.povoado === POVOADO_VILA ? c.morador.n : -1;
      const papel = n >= 0 ? papelNaBanda(n) : null;
      if (!papel || c.estado === 'morrendo') continue;
      const aqui = doMundo(palcoP, c.x, c.z);
      if (noShow && show) {
        const q = posturaNaBanda(papel, show, t);
        const longe = Math.hypot(q.a - aqui[0], q.b - aqui[1]);
        if (saltou) atrasados.delete(c.id);
        else if (longe > 1.2) atrasados.add(c.id);
        if (atrasados.has(c.id)) {
          // chegou atrasado ao show: vai a pé até o lugar (a rota sobe e desce pela escadinha)
          const r = andarAte(c.id, aqui, [q.a, q.b], VEL_ALCANCAR * dt);
          if (Math.hypot(q.a - r.q[0], q.b - r.q[1]) < 0.15 || longe < 0.15) {
            atrasados.delete(c.id);
            trilhas.delete(c.id);
          }
          const [x, y, z] = mundoDe(r.q, alturaEm(r.q[0], r.q[1]));
          porNoLugar(c, x, y, z, r.dir);
          continue;
        }
        trilhas.delete(c.id);
        const [x, y, z] = mundoDe([q.a, q.b], q.altura);
        porNoLugar(c, x, y, z, q.giro);
        continue;
      }
      if (atrasados.delete(c.id)) trilhas.delete(c.id);
      const dia = deDia();
      const alvo = descanso(papel);
      const longe = Math.hypot(alvo[0] - aqui[0], alvo[1] - aqui[1]);
      if (longe < 0.05) {
        trilhas.delete(c.id);
        // no lugar: parado, de papo na roda (de dia) ou olhando para o palco (de noite); a
        // roadie, de olho em quem chega (a rotina do posto: é com ela que se troca)
        const [x, y, z] = mundoDe(alvo, alturaDoDescanso(papel, alvo));
        porNoLugar(c, x, y, z, papel === 'roadie' ? null : giroDoDescanso(papel, dia));
        continue;
      }
      if (longe > 60) {
        trilhas.delete(c.id);
        // nasceu longe do lugar (o núcleo acabou de criar): aparece nele
        const [x, y, z] = mundoDe(alvo, alturaDoDescanso(papel, alvo));
        porNoLugar(c, x, y, z, giroDoDescanso(papel, dia));
        continue;
      }
      const r = andarAte(c.id, aqui, alvo, VEL_DESCANSO * dt);
      const [x, y, z] = mundoDe(r.q, alturaEm(r.q[0], r.q[1]));
      porNoLugar(c, x, y, z, r.dir);
    }
    saltou = false;
  }

  // ------------------------------------------------------------------ f4: a volta no rinque
  /** Quem está dentro de cada arco agora (o arco brilha e soa só na entrada). */
  const dentroAgora = new Set<string>();
  /**
   * Quem está de patins e entra no vão de um arco do rinque: o arco brilha e soa (para todos).
   * Com a f4 aberta, o arco fica aceso para ele e conta uma bolinha (uma vez por arco em cada
   * volta); passando de novo por um arco com os três já acesos, começa uma volta nova (o bis).
   * Sem a missão é só brinquedo: brilha e soa, sem ficar aceso. A volta também recomeça quando
   * a missão é escolhida de novo.
   */
  function cuidarDosArcos(): void {
    for (const j of ctx.jogadores()) {
      plano.pontos.arcos.forEach((a, i) => {
        const k = `${j.id}:${i}`;
        const dentro = !j.morto && j.patins && dentroDoArco(a, j.x, j.y, j.z);
        if (!dentro) {
          dentroAgora.delete(k);
          return;
        }
        if (dentroAgora.has(k)) return;
        dentroAgora.add(k);
        ctx.espalhar({ e: 'vilaArco', i, quem: j.id });
        if (!j.aberta(F_RINQUE)) return;
        if (arcos.has(k)) {
          if ([0, 1, 2].some((q) => !arcos.has(`${j.id}:${q}`))) return;
          // os três já acesos e a missão aberta de novo: uma volta nova
          prepararArcos(j.id);
        }
        arcos.add(k);
        ctx.evento(j.id, CHAVE_ARCO);
        ctx.sujar();
      });
    }
  }

  // ------------------------------------------------------------------ f1: os estojos
  function cuidarDosEstojos(): void {
    for (const j of ctx.jogadores()) {
      if (j.morto) continue;
      p.estojos.forEach(([x, y, z], i) => {
        if (ins[i]) return;
        if (Math.hypot(j.x - x, j.z - z) > PERTO_DO_ESTOJO || Math.abs(j.y - y) > 2.5) return;
        ins[i] = true;
        ctx.espalhar({ e: 'vilaEstojo', i, quem: j.id });
        // conta para quem achou (e para quem estava junto, a até 6 blocos, com a missão)
        for (const o of ctx.jogadores())
          if (o.id === j.id || (o.aberta('f1') && Math.hypot(o.x - x, o.z - z) < 6))
            ctx.evento(o.id, 'achou:instrumento');
        ctx.sujar();
      });
    }
  }

  // ------------------------------------------------------------------ f2: as lhamas
  const dentroDaGrade = (x: number, z: number) =>
    x >= grade.x0 - 1 && x <= grade.x1 + 2 && z >= grade.z0 - 1 && z <= grade.z1 + 2;

  function cuidarDasLhamas(): void {
    const vivas = new Map<number, Criatura>();
    for (const c of ctx.criaturas())
      if (lhamas.has(c.id) && c.estado !== 'morrendo') vivas.set(c.id, c);
    for (const id of [...lhamas])
      if (!vivas.has(id)) {
        lhamas.delete(id);
        naGrade.delete(id);
      }
    // duas lhamas moram no cercadinho (nascem quando alguém chega perto e o chão carregou)
    if (lhamas.size < 2) {
      const perto = ctx
        .jogadores()
        .some((j) => Math.hypot(j.x - meioCercado[0], j.z - meioCercado[1]) < 48);
      if (perto && ctx.carregado(meioCercado[0], meioCercado[1]))
        for (let k = lhamas.size; k < 2; k++) {
          const c = ctx.adicionar(
            'cervo',
            meioCercado[0] + (k ? 1.5 : -1.5),
            plano.h + 1.2,
            meioCercado[1],
          );
          c.casa = [meioCercado[0], meioCercado[1]];
          lhamas.add(c.id);
          vivas.set(c.id, c);
        }
    }
    // a lhama que chegou à grade fica ali (não segue mais o feno) e conta para quem a levou
    for (const c of vivas.values()) {
      if (naGrade.has(c.id)) {
        c.satisfeito = 1e9;
        continue;
      }
      if (!dentroDaGrade(c.x, c.z)) continue;
      naGrade.add(c.id);
      const x = Math.min(Math.max(c.x, grade.x0 + 1), grade.x1);
      c.casa = [x, grade.z1 - 0.5];
      c.cerca = [Math.floor(x) - 1, grade.z1 - 2, Math.floor(x) + 1, grade.z1];
      c.satisfeito = 1e9;
      const quem = ctx
        .jogadores()
        .filter((j) => !j.morto && j.aberta('f2') && Math.hypot(j.x - c.x, j.z - c.z) < 14);
      for (const j of quem) ctx.evento(j.id, 'levou:lhama');
      ctx.espalhar({ e: 'vilaLhama', criatura: c.id, quem: quem[0]?.id ?? '' });
      ctx.sujar();
    }
    // o feno na mão de quem tem a f2 no selinho, perto de uma lhama ainda no cercadinho
    for (const j of ctx.jogadores()) {
      if (j.morto || j.missao !== 'f2' || j.contar(FENO) > 0) continue;
      const perto = [...vivas.values()].some(
        (c) => !naGrade.has(c.id) && Math.hypot(c.x - j.x, c.z - j.z) <= PERTO_DA_LHAMA,
      );
      if (perto) j.darNaMao(FENO, 2);
    }
  }

  // ------------------------------------------------------------------ a fazendinha do parque
  /**
   * As duas lhamas da fazendinha do parque (parte 2): moram no cercado de madeira e não saem
   * dele (a entrada é aberta para a criança entrar). As da f2 continuam no cercadinho da beira
   * do campo do festival, de frente para a grade: a missão não mudou de lugar.
   */
  function cuidarDaFazendinha(): void {
    const f = p.parque.fazendinha;
    const meio: [number, number] = [(f.x0 + f.x1 + 1) / 2, (f.z0 + f.z1 + 1) / 2];
    for (const id of [...daFazendinha])
      if (!ctx.criaturas().some((c) => c.id === id && c.estado !== 'morrendo'))
        daFazendinha.delete(id);
    if (daFazendinha.size >= 2) return;
    const perto = ctx.jogadores().some((j) => Math.hypot(j.x - meio[0], j.z - meio[1]) < 48);
    if (!perto || !ctx.carregado(meio[0], meio[1])) return;
    for (let k = daFazendinha.size; k < 2; k++) {
      const c = ctx.adicionar(
        'cervo',
        meio[0] + (k ? 2 : -2),
        plano.h + 1.2,
        meio[1] + (k ? 1 : -1),
      );
      c.casa = [meio[0], meio[1]];
      c.cerca = [f.x0, f.z0, f.x1, f.z1];
      daFazendinha.add(c.id);
    }
  }

  // ------------------------------------------------------------------ f3 e o show
  function podeTocar(id: string): boolean {
    const t = ctx.agora();
    const l = (toques.get(id) ?? []).filter((x) => t - x < 1);
    if (l.length >= TOQUES_POR_SEGUNDO) {
      toques.set(id, l);
      return false;
    }
    l.push(t);
    toques.set(id, l);
    return true;
  }

  const pertoDoPalco = (j: JogadorVila) => alcancaOPalco(p.palco, j.x, j.z);
  const fest = plano.zonas.festival;
  const noFestival = (j: JogadorVila) =>
    !j.morto &&
    j.x >= fest.x0 - PERTO_DO_FESTIVAL &&
    j.x <= fest.x1 + 1 + PERTO_DO_FESTIVAL &&
    j.z >= fest.z0 - PERTO_DO_FESTIVAL &&
    j.z <= fest.z1 + 1 + PERTO_DO_FESTIVAL;

  // ------------------------------------------------------------------ uma vez por noite
  /** A noite (`idDaNoite`) em que o último show começou (null: nenhum ainda). */
  let showDaNoite: number | null = typeof salvo.noite === 'number' ? salvo.noite : null;
  const noiteAgora = () => idDaNoite(ctx.dia(), ctx.hora());
  /** A noite de agora ainda não teve show (e nenhum toca agora). */
  const rodadaAberta = () => !show && noiteDeShow(ctx.hora()) && showDaNoite !== noiteAgora();
  /** A hora era de show no último olhar (para ver a noite chegar). */
  let eraNoite = noiteDeShow(ctx.hora());
  /** Quando a noite de show abriu e quando alguém chegou ao festival. */
  let noiteDesde: number | null = null;
  let pertoDesde: number | null = null;
  /** As caixas acendendo sozinhas: quando acende a próxima (null: parado). */
  let sozinha: number | null = null;

  /**
   * A noite chegou com a rodada aberta: as caixas acesas na passagem de som (ou no brinquedo
   * livre do show de ontem) se apagam, para acender de novo uma a uma (pela criança ou sozinhas).
   */
  function verNoite(): void {
    const noite = noiteDeShow(ctx.hora());
    if (noite && !eraNoite && rodadaAberta() && caixas.some(Boolean)) {
      caixas.fill(false);
      ctx.sujar();
    }
    eraNoite = noite;
  }

  /** A noite do show de antes deste (o que vai salvo enquanto este toca). */
  let noiteAntesDoShow: number | null = showDaNoite;
  function comecarShow(): void {
    show = { inicio: ctx.agora(), final: null };
    noiteAntesDoShow = showDaNoite;
    showDaNoite = noiteAgora();
    sozinha = null;
    acendendo = -1;
    aCoxiaNoComeco();
    ctx.sujar();
  }

  /**
   * Um toque numa caixa (de quem está perto do palco): fora do show e antes de as caixas
   * acenderem sozinhas, liga e desliga a camada dela (brinquedo livre, sem moedinha). O toque não
   * começa nem adianta o show (o dono, 16 nov 2026: o show é do bairro, sozinho, toda noite); no
   * show e enquanto as caixas acendem sozinhas, o toque não faz nada.
   */
  function tocarCaixa(j: JogadorVila, i: number): void {
    const c = p.caixas[i];
    if (!c || !pertoDoPalco(j)) return;
    if (show && faseDoShow(show, ctx.agora()) !== 'acabou') return;
    if (acendendo >= 0) return;
    verNoite();
    const noite = noiteDeShow(ctx.hora());
    const acesa = !caixas[i];
    caixas[i] = acesa;
    ctx.espalhar({
      e: 'vilaCaixa',
      i,
      acesa,
      quem: j.id,
      ...(noite ? {} : { dia: true as const }),
    });
    ctx.sujar();
  }

  /** As caixas acendendo sozinhas antes do show: a próxima a acender (-1: parado). */
  let acendendo = -1;
  /**
   * O show sozinho: de noite, com alguém no festival, depois das esperas (`NOITE_ANTES` e
   * `PERTO_ANTES`), as três caixas se apagam e acendem uma a uma (com o "tum" e o acorde de cada
   * uma), e o show começa. Uma vez por noite.
   */
  function showSozinho(): void {
    const t = ctx.agora();
    verNoite();
    if (!noiteDeShow(ctx.hora())) {
      noiteDesde = pertoDesde = sozinha = null;
      acendendo = -1;
      return;
    }
    noiteDesde ??= t;
    if (!rodadaAberta()) {
      sozinha = null;
      acendendo = -1;
      return;
    }
    const perto = ctx.jogadores().filter(noFestival);
    pertoDesde = perto.length ? (pertoDesde ?? t) : null;
    if (sozinha === null) {
      if (pertoDesde === null || t - noiteDesde < NOITE_ANTES || t - pertoDesde < PERTO_ANTES)
        return;
      sozinha = t;
      acendendo = 0;
      // as acesas pelo brinquedo se apagam: as três acendem em ordem, sempre no mesmo tempo
      if (caixas.some(Boolean)) caixas.fill(false);
    }
    if (t < sozinha) return;
    if (acendendo >= caixas.length) {
      comecarShow();
      return;
    }
    const k = acendendo++;
    caixas[k] = true;
    ctx.espalhar({ e: 'vilaCaixa', i: k, acesa: true, quem: 'auto' });
    sozinha = t + ACENDE_SOZINHA;
    ctx.sujar();
  }

  function fecharShow(t: number, quem: string): void {
    if (!show || show.final !== null) return;
    show.final = t;
    show.quem = quem;
    ctx.espalhar({ e: 'vilaFinal', quando: t, quem });
    ctx.sujar();
  }

  function cuidarDoShow(): void {
    showSozinho();
    if (!show) return;
    const t = ctx.agora();
    // o acorde final vem sozinho, no fim do último compasso (nenhum toque muda o show)
    if (finalSozinho(show, t)) fecharShow(momentoFinalSozinho(show), 'auto');
    if (show && faseDoShow(show, t) === 'acabou') {
      show = null;
      ctx.sujar();
    }
  }

  // ------------------------------------------------------------------ o público do show
  /**
   * A turma da grade (40 moradores de verdade, corpo macio): no show, na grade de frente para o
   * palco; de noite sem show, de papo em rodinhas que mudam de lugar; de dia só quatro ficam.
   *
   * Ninguém some nem aparece à vista (dono, 16 nov 2026): quem não fica vai embora a pé, pelo
   * portão, pela calçada da avenida e pela calçada das casas, até o quintal de casa, e só sai do
   * mundo quando ninguém pode estar vendo (`alguemVe`: longe de todos ou bem atrás de quem está
   * perto), já em casa ou longe de todo mundo. Quem chega nasce onde ninguém vê (no lugar dele,
   * ou numa parada do caminho de casa) e vem andando. Vem quando alguém chega perto do festival
   * (nunca do nascer) e anda por um caminho que dá a volta nas peças (o corredor das lhamas e o
   * caminho de cascalho ficam livres). Como os outros moradores, não vai salva.
   */
  /** Quem vai embora e já está a tantos blocos de todo mundo pode sair do mundo sem chegar em casa. */
  const LONGE_DA_TURMA = 44;
  /** Entre um e outro que nasce numa parada do caminho (s): chegam em fila. */
  const ENTRE_CHEGADAS = 0.5;
  let chegouEm = -1e9;
  /** Quem já refez o caminho nesta trava (fora da vista, a segunda vez é do anti-trava). */
  const refez = new Set<number>();
  const pub = publicoDaVila(plano);
  /**
   * A criança parada bem no caminho de alguém da turma (no meio do portão, por exemplo): em vez
   * de ficar encostado nela esperando, ele dá a volta, um passo e meio para o lado em que já
   * está. Devolve se pôs o desvio no caminho.
   */
  function desviarDaCrianca(
    c: Criatura,
    m: NonNullable<Criatura['morador']>,
    alvo: readonly [number, number, number],
    js: readonly JogadorVila[],
  ): boolean {
    if ((c.semProgresso ?? 0) < 1.2) return false;
    const j = js.find((q) => Math.hypot(q.x - c.x, q.z - c.z) < 1.6);
    if (!j) return false;
    const [px, pz] = m.caminho?.[0] ?? [alvo[0], alvo[2]];
    const d = Math.hypot(px - c.x, pz - c.z);
    if (d < 0.3) return false;
    const fx = (px - c.x) / d;
    const fz = (pz - c.z) / d;
    // (só se ela está na frente, no rumo do ponto seguinte)
    if ((j.x - c.x) * fx + (j.z - c.z) * fz <= 0) return false;
    const lado = (c.x - j.x) * -fz + (c.z - j.z) * fx >= 0 ? 1 : -1;
    for (const s of [lado, -lado]) {
      const q: [number, number] = [j.x - fz * s * 1.7 + fx * 0.5, j.z + fx * s * 1.7 + fz * 0.5];
      if (!retoDoPublico(pub, [c.x, c.z], q)) continue;
      m.caminho = [q, ...(m.caminho ?? [])];
      c.menorDistancia = undefined;
      c.semProgresso = 0;
      return true;
    }
    return false;
  }
  function cuidarDoPublico(): void {
    const t = ctx.agora();
    const noite = noiteDeShow(ctx.hora());
    const tocando = !!show && faseDoShow(show, t) !== 'acabou';
    const js = ctx.jogadores().filter((j) => !j.morto);
    const perto = js.some((j) => Math.hypot(j.x - pub.meio[0], j.z - pub.meio[1]) < 52);
    const vivos = new Map<number, Criatura>();
    for (const c of ctx.criaturas())
      if (c.morador?.povoado === POVOADO_VILA && daTurma(c.morador.n) && c.estado !== 'morrendo')
        vivos.set(c.morador.n - N0_PUBLICO, c);
    const vendo = (x: number, z: number) => alguemVe(js, x, z);
    if (refez.size > 200) refez.clear();
    for (let k = 0; k < PUBLICO_GRADE; k++) {
      const l = lugarDoPublico(pub, k, { noite, show: tocando, t });
      let c = vivos.get(k);
      if (!c) {
        if (!l.alvo || !perto || !ctx.carregado(l.alvo[0], l.alvo[2])) continue;
        // ninguém aparece do nada na frente da criança: a pessoa nasce no lugar dela se ninguém
        // está vendo; senão, na parada do caminho de casa mais perto do festival que ninguém vê
        // (fora do portão, na calçada da avenida, no quintal de casa) e vem andando. Com todas
        // à vista, espera (ninguém nasce à vista)
        const q = [l.alvo, ...pub.paradas(k)].find(
          (r) => ctx.carregado(r[0], r[2]) && !vendo(r[0], r[2]),
        );
        if (!q) continue;
        // (numa parada, um de cada vez: a turma chega em fila, não num monte)
        if (q !== l.alvo) {
          if (t - chegouEm < ENTRE_CHEGADAS) continue;
          chegouEm = t;
        }
        c = ctx.adicionar('morador', q[0], q[1], q[2]);
        const posto: [number, number, number] = [q[0], q[1], q[2]];
        c.morador = {
          povoado: POVOADO_VILA,
          n: N0_PUBLICO + k,
          profissao: 'cozinheiro',
          fora: posto,
          dentro: posto,
          oficina: posto,
          praca: posto,
          rotaCasa: [],
          rotaOficina: [],
          centro: [posto[0] + 1000, posto[2]],
          posto,
        };
      }
      const m = c.morador!;
      // quem não fica vai para casa: sai pelo portão, pega a calçada da avenida e a das casas e
      // entra no quintal (dono, 16 nov 2026: "a turma some no portão, na frente da gente")
      const alvo = l.alvo ?? pub.casa(k);
      const olhar = l.alvo ? l.olhar : pub.olharEmCasa(k);
      if (!l.alvo) {
        // só some quem ninguém pode estar vendo, e já em casa ou longe de todo mundo; quem está
        // à vista continua andando, e em casa fica de papo no quintal até ninguém olhar
        const emCasa = Math.hypot(c.x - alvo[0], c.z - alvo[2]) < 1.2;
        const longe = js.every((j) => Math.hypot(j.x - c.x, j.z - c.z) > LONGE_DA_TURMA);
        if ((emCasa || longe) && !vendo(c.x, c.z)) {
          c.estado = 'morrendo';
          c.dissolver = 1;
          continue;
        }
      }
      const posto = m.posto!;
      if (Math.hypot(posto[0] - alvo[0], posto[2] - alvo[2]) > 0.25) {
        m.posto = [alvo[0], alvo[1], alvo[2]];
        m.caminho = caminhoDoPublico(pub, [c.x, c.z], [alvo[0], alvo[2]]);
        c.menorDistancia = undefined;
        c.semProgresso = 0;
      } else if (desviarDaCrianca(c, m, alvo, js)) {
        // (a criança parada bem no caminho: dá a volta nela)
      } else if (m.caminho?.length) {
        const [px, pz] = m.caminho[0];
        const seguinte = m.caminho[1] ?? [alvo[0], alvo[2]];
        if (
          Math.hypot(c.x - px, c.z - pz) < 3 &&
          retoDoPublico(pub, [c.x, c.z], [seguinte[0], seguinte[1]])
        ) {
          // a turma anda junta: quem já vê o ponto seguinte em linha reta corta para ele
          // (ninguém fica brigando para pisar no mesmo ponto da esquina)
          m.caminho.shift();
          c.menorDistancia = undefined;
          c.semProgresso = 0;
        } else if ((c.semProgresso ?? 0) > 6 && !refez.has(c.id)) {
          // travado (empurrado para o lado errado de uma cerca, alguém parado na frente): refaz
          // o caminho de onde está. À vista, espera e tenta de novo quantas vezes for preciso; o
          // anti-trava de sempre (aparecer no ponto seguinte) só vale onde ninguém vê
          m.caminho = caminhoDoPublico(pub, [c.x, c.z], [alvo[0], alvo[2]]);
          c.menorDistancia = undefined;
          if (vendo(c.x, c.z)) c.semProgresso = 0;
          else refez.add(c.id);
        } else if ((c.semProgresso ?? 0) < 1) refez.delete(c.id);
      } else if (olhar && Math.hypot(c.x - alvo[0], c.z - alvo[2]) < 0.7)
        // chegou: olha para o palco (na grade) ou para o meio da rodinha (de papo, em casa)
        c.yawAlvo = Math.atan2(olhar[0] - c.x, olhar[1] - c.z);
      else if (!l.alvo && (c.semProgresso ?? 0) > 6 && vendo(c.x, c.z)) c.semProgresso = 0;
    }
  }

  // ------------------------------------------------------------------ o que volta
  /** A missão foi escolhida (ou escolhida de novo): o que é dela volta ao lugar. */
  function preparar(missao: string | null): void {
    if (missao === 'f1' && ins.every(Boolean) && !show) {
      ins.fill(false);
      ctx.sujar();
    } else if (missao === 'f2' && naGrade.size >= 2) {
      for (const c of ctx.criaturas())
        if (naGrade.has(c.id)) {
          c.x = meioCercado[0];
          c.z = meioCercado[1];
          c.y = plano.h + 1.2;
          c.vx = 0;
          c.vz = 0;
          c.casa = [meioCercado[0], meioCercado[1]];
          c.cerca = undefined;
          c.satisfeito = undefined;
        }
      naGrade.clear();
      ctx.sujar();
    }
  }
  /** A f4 foi escolhida (ou escolhida de novo) por alguém: os arcos dele apagam (volta nova). */
  function prepararArcos(id: string): void {
    let mudou = false;
    for (let i = 0; i < 3; i++) mudou = arcos.delete(`${id}:${i}`) || mudou;
    if (mudou) ctx.sujar();
  }

  return {
    /** A cada passo (o núcleo chama com o número do passo). */
    passo(n: number, dt = 0.05): void {
      if (n % 5 === 0) {
        cuidarDosEstojos();
        cuidarDoShow();
      }
      cuidarDosArcos();
      cuidarDaBanda(dt);
      if (n % 10 === 0) cuidarDasLhamas();
      if (n % 20 === 0) cuidarDosMoradores();
      if (n % 5 === 2) cuidarDoPublico();
      if (n % 5 === 3) parque.passo();
      // o bate-bate anda a cada passo (com gente perto), e os moradores que guiam vão juntos
      parque.passoDoBate();
      cuidarDosPilotos();
      if (n % 20 === 7) cuidarDaFazendinha();
      missoes.passo(n);
    },
    comando(id: string, c: ComandoVila): void {
      const j = ctx.jogador(id);
      if (!j || j.morto) return;
      // o controle do carrinho vem a cada passo: fora do limite de toques, com o limite dele
      if (c.a === 'guiar') return parque.guiar(id, c);
      if (!podeTocar(id)) return;
      if (c.a === 'caixa') tocarCaixa(j, c.i);
      else if (c.a === 'sentar' || c.a === 'sair' || c.a === 'roda') parque.comando(id, c);
      else missoes.comando(id, c);
    },
    /** Etapa B: as missões do parque (testes). */
    missoes,
    /** Spec 026 (parte 2): as cadeiras do parque (testes). */
    parque,
    /** Spec 026 (parte 2): os carrinhos do bate-bate para o quadro deste jogador (ou null). */
    bateDe: (id: string, n: number) => parque.bateDe(id, n),
    falou,
    /** A missão foi escolhida (ou escolhida de novo) por `id`: o que é dela volta ao lugar. */
    preparar(missao: string | null, id?: string): void {
      if (missao === F_RINQUE && id !== undefined) prepararArcos(id);
      else if (missao === F_BALOES && id !== undefined) missoes.preparar(id);
      else preparar(missao);
    },
    vista,
    /** O quadro da vila para um jogador (com os arcos que ele acendeu e os balões que pegou). */
    vistaDe: (id: string, v: VilaVista = vista()): VilaVista => ({
      ...v,
      arcos: arcosDe(id),
      bal: missoes.pegosDe(id),
    }),
    /**
     * Testes e vídeos: o show tocando pula para `s` s desde o começo (antes do acorde final; a
     * banda vai junto, pela coreografia).
     */
    pularShow(s: number): void {
      if (!show || show.final !== null || !(s >= 0)) return;
      show.inicio = ctx.agora() - Math.min(s, CHAMADO + ESPERA_FINAL - 0.05);
      // o pulo é do relógio: a banda vai junto (direto para o lugar, sem andar até lá)
      saltou = true;
      ctx.sujar();
    },
    salvar: () => ({
      ins: [...ins],
      cx: [...caixas],
      poster: [...poster],
      ...(missoes.salvar().length ? { balao: missoes.salvar() } : {}),
      // salvo no meio do show (que não vai salvo), a noite fica aberta: ele toca de novo
      ...((show ? noiteAntesDoShow : showDaNoite) !== null
        ? { noite: show ? noiteAntesDoShow : showDaNoite }
        : {}),
    }),
    /** Testes: a turma da grade (o público do show) à vista no núcleo. */
    publico: () =>
      ctx
        .criaturas()
        .filter(
          (c) =>
            c.morador?.povoado === POVOADO_VILA && daTurma(c.morador.n) && c.estado !== 'morrendo',
        ),
    /** Testes: as lhamas da vila e as que estão na grade. */
    lhamas: () => ({ todas: [...lhamas], naGrade: [...naGrade], fazendinha: [...daFazendinha] }),
  };
}

export type VilaNucleo = ReturnType<typeof criarVila>;
