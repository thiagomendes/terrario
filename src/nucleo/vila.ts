/**
 * A Vila Neon no núcleo (spec 026, parte 1): o que é do bairro e muda com o jogo, igual no
 * aparelho e na nuvem. Puro (sem tela, sem DOM): o núcleo passa o que este módulo precisa.
 *
 * - **Moradores com posto** (o vocalista na ponta da passarela, o roadie, a guitarrista, a
 *   moça do lanche, a dançarina e o patinador no rinque, a moça da lanchonete e o moço da
 *   banca): aparecem quando alguém chega perto, ficam no posto e olham para a criança. Como os
 *   da cidade, não vão salvos.
 * - **O Show da Vila:** os três estojos (f1) no chão de cada zona; os instrumentos aparecem no
 *   palco quando a criança passa por eles; as três caixas do palco (f3); o show no tempo da
 *   música (`src/jogo/show.ts`), o toque no palco, o acorde final (sozinho em 4 s), e depois as
 *   caixas como brinquedo livre.
 * - **As lhamas (f2):** duas no cercadinho da beira do campo; o feno aparece na mão de quem tem
 *   a missão ao chegar perto; a lhama segue o feno (a regra da 013) e, ao chegar à grade da
 *   plateia, fica ali balançando no ritmo.
 * - **O que é de cada missão volta só quando ela é escolhida de novo**, nunca com o tempo.
 * - **Moedinha nenhuma por ação**: o núcleo só conta as chaves (`achou:instrumento`,
 *   `levou:lhama`, `show:caixa`); as moedinhas vêm no fim da missão (alma).
 */
import type { PlanoVila, PostoVila } from '../world/vilaNeon';
import type { Profissao } from '../world/povoado';
import type { Criatura, TipoSer } from '../jogo/criaturas';
import {
  encaixarToque,
  faseDoShow,
  finalSozinho,
  momentoFinalSozinho,
  noiteDeShow,
  TOQUES_POR_SEGUNDO,
  type Show,
} from '../jogo/show';
import {
  caminhoNoFestival,
  lugarDoPublico,
  publicoDaVila,
  PUBLICO_GRADE,
} from '../world/publicoVila';

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
/** O povoado dos moradores do bairro (o nome que vai na criatura). */
export const POVOADO_VILA = 'vila';
/** O vocalista (n = 0): um toque nele dá o pôster da banda, uma vez por mundo a cada criança. */
export const VOCALISTA = 0;

/** Os instrumentos dos estojos (a ordem dos pontos do plano: rua, pista, festival). */
export const INSTRUMENTOS = ['teclado', 'guitarra', 'baquetas'] as const;
/** Chega a tantos blocos do estojo e ele é achado. */
export const PERTO_DO_ESTOJO = 1.6;
/** Perto da caixa do palco (blocos) para o toque valer. */
export const PERTO_DA_CAIXA = 7;
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
}

/** O que vai salvo com o mundo (`extras.vila`). */
interface VilaSalva {
  ins?: unknown;
  cx?: unknown;
  poster?: unknown;
  /** O show desta rodada já tocou até o fim (as caixas acesas são brinquedo livre). */
  tocou?: unknown;
}

/** Um jogador, como o módulo o vê. */
export interface JogadorVila {
  id: string;
  x: number;
  y: number;
  z: number;
  morto: boolean;
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
}

export interface CtxVila {
  plano: PlanoVila;
  salvo: unknown;
  agora(): number;
  /** A hora do dia (0 a 1): o show só começa de noite (`noiteDeShow`). */
  hora(): number;
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
  | { e: 'vilaAcorde'; quando: number; acorde: number; quem: string }
  | { e: 'vilaFinal'; quando: number; quem: string }
  | { e: 'vilaEstojo'; i: number; quem: string }
  | { e: 'vilaCaixa'; i: number; acesa: boolean; quem: string; dia?: true }
  | { e: 'vilaLhama'; criatura: number; quem: string }
  | { e: 'vilaPresente'; quem: string };

export type ComandoVila = { a: 'caixa'; i: number } | { a: 'palco' };

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
  /** Quem acendeu cada caixa nesta rodada (a 3ª bolinha da f3 vem com o acorde final). */
  const acendeu = new Set<string>();
  /** As lhamas do cercadinho e as que chegaram à grade. */
  const lhamas = new Set<number>();
  const naGrade = new Set<number>();
  /** Toques de cada jogador no último segundo (o limite por segundo). */
  const toques = new Map<string, number[]>();

  const cerc = p.cercado;
  const meioCercado: [number, number] = [(cerc.x0 + cerc.x1 + 1) / 2, (cerc.z0 + cerc.z1 + 1) / 2];
  const grade = p.plateia;

  const vista = (): VilaVista => ({
    t: Math.round(ctx.agora() * 1000) / 1000,
    ins: [...ins] as VilaVista['ins'],
    cx: [...caixas] as VilaVista['cx'],
    show: show ? { ...show } : null,
    lhamas: [...naGrade],
  });

  // ------------------------------------------------------------------ moradores
  function cuidarDosMoradores(): void {
    const vivos = new Set<number>();
    for (const c of ctx.criaturas())
      if (c.morador?.povoado === POVOADO_VILA && c.estado !== 'morrendo') vivos.add(c.morador.n);
    MORADORES_VILA.forEach((m, n) => {
      if (vivos.has(n)) return;
      const posto = p.postos[m.posto];
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

  const pertoDoPalco = (j: JogadorVila) => {
    const r = p.palco;
    return j.x >= r.x0 - 8 && j.x <= r.x1 + 9 && j.z >= r.z0 - 16 && j.z <= r.z1 + 4;
  };

  function tocarCaixa(j: JogadorVila, i: number): void {
    const c = p.caixas[i];
    if (!c || Math.hypot(j.x - (c[0] + 0.5), j.z - (c[2] + 0.5)) > PERTO_DA_CAIXA) return;
    const fase = show ? faseDoShow(show, ctx.agora()) : null;
    if (fase === 'tocando' || fase === 'chamando' || fase === 'final') {
      // no meio do show a caixa é palco: o toque toca um acorde
      tocarPalco(j);
      return;
    }
    const noite = noiteDeShow(ctx.hora());
    if (noite && rodadaNova) {
      // de noite, antes do show desta rodada: a caixa acende (e a acesa fica acesa: nada de
      // apagar sem querer); o toque conta para a f3, e com as três acesas o show começa
      caixas[i] = true;
      ctx.espalhar({ e: 'vilaCaixa', i, acesa: true, quem: j.id });
      if (j.aberta('f3') && !acendeu.has(`${j.id}:${i}`)) {
        acendeu.add(`${j.id}:${i}`);
        const minhas = [0, 1, 2].filter((k) => acendeu.has(`${j.id}:${k}`)).length;
        // as duas primeiras bolinhas agora; a terceira com o acorde final (a festa vem depois)
        if (minhas <= 2) ctx.evento(j.id, 'show:caixa');
      }
      if (caixas.every(Boolean) && !show) {
        show = { inicio: ctx.agora(), final: null };
        rodadaNova = false;
      }
      ctx.sujar();
      return;
    }
    // de dia (a passagem de som) e depois do show: cada toque liga e desliga a camada dela
    // (brinquedo livre, sem moedinha, sem show: o show é só de noite, decisão do dono)
    const acesa = !caixas[i];
    caixas[i] = acesa;
    ctx.espalhar({ e: 'vilaCaixa', i, acesa, quem: j.id, ...(noite ? {} : { dia: true as const }) });
    // apagou as três: a próxima vez que acenderem (de noite), o show começa de novo
    if (caixas.every((x) => !x)) rodadaNova = true;
    ctx.sujar();
  }
  /**
   * O show desta rodada ainda não tocou (ele começa com as três acesas, de noite). Volta a valer
   * quando as caixas se apagam ou a f3 é escolhida de novo. Um mundo salvo no meio do show (ou de
   * antes desta regra) volta com a rodada aberta: ninguém fica preso sem show.
   */
  let rodadaNova = salvo.tocou !== true || !caixas.every(Boolean);

  function tocarPalco(j: JogadorVila): void {
    if (!show || !pertoDoPalco(j)) return;
    const t = ctx.agora();
    const fase = faseDoShow(show, t);
    if (fase === 'tocando') {
      const { quando, acorde } = encaixarToque(show, t);
      ctx.espalhar({ e: 'vilaAcorde', quando, acorde, quem: j.id });
    } else if (fase === 'chamando') fecharShow(t, j.id);
  }

  function fecharShow(t: number, quem: string): void {
    if (!show || show.final !== null) return;
    show.final = t;
    show.quem = quem;
    ctx.espalhar({ e: 'vilaFinal', quando: t, quem });
    // a terceira bolinha da f3 (e a festa) para quem acendeu caixa nesta rodada
    for (const j of ctx.jogadores()) {
      if (!j.aberta('f3')) continue;
      const minhas = [0, 1, 2].filter((k) => acendeu.has(`${j.id}:${k}`)).length;
      if (minhas > 0 || pertoDoPalco(j)) ctx.evento(j.id, 'show:caixa', 3 - Math.min(2, minhas));
    }
    ctx.sujar();
  }

  function cuidarDoShow(): void {
    if (!show) return;
    const t = ctx.agora();
    if (finalSozinho(show, t)) fecharShow(momentoFinalSozinho(show), 'auto');
    if (show && faseDoShow(show, t) === 'acabou') {
      show = null;
      ctx.sujar();
    }
  }

  // ------------------------------------------------------------------ o público do show
  /**
   * A turma da grade (12 moradores de verdade, corpo macio): no show, na grade de frente para o
   * palco; de noite sem show, de papo em quatro rodinhas que mudam de lugar; de dia só quatro
   * ficam, e quem não fica sai pelo portão do festival e some lá. Vem quando alguém chega perto
   * do festival (nunca do nascer), aparece no portão se alguém está vendo o lugar dela, e anda
   * pelo campo por um caminho que dá a volta nas peças (o corredor das lhamas e o caminho de
   * cascalho ficam livres). Como os outros moradores, não vai salva.
   */
  const pub = publicoDaVila(plano);
  function cuidarDoPublico(): void {
    const t = ctx.agora();
    const noite = noiteDeShow(ctx.hora());
    const tocando = !!show && faseDoShow(show, t) !== 'acabou';
    const js = ctx.jogadores().filter((j) => !j.morto);
    const perto = js.some((j) => Math.hypot(j.x - pub.meio[0], j.z - pub.meio[1]) < 52);
    const vivos = new Map<number, Criatura>();
    for (const c of ctx.criaturas())
      if (c.morador?.povoado === POVOADO_VILA && c.morador.n >= N0_PUBLICO && c.estado !== 'morrendo')
        vivos.set(c.morador.n - N0_PUBLICO, c);
    for (let k = 0; k < PUBLICO_GRADE; k++) {
      const l = lugarDoPublico(pub, k, { noite, show: tocando, t });
      let c = vivos.get(k);
      if (!c) {
        if (!l.alvo || !perto || !ctx.carregado(l.alvo[0], l.alvo[2])) continue;
        // ninguém aparece do nada na frente da criança: quem está vendo o lugar vê a pessoa
        // chegar pelo portão
        const vendo = js.some((j) => Math.hypot(j.x - l.alvo![0], j.z - l.alvo![2]) < 24);
        const q = vendo ? pub.portao : l.alvo;
        if (!ctx.carregado(q[0], q[2])) continue;
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
      const alvo = l.alvo ?? pub.portao;
      if (!l.alvo && (!perto || Math.hypot(c.x - alvo[0], c.z - alvo[2]) < 1.6)) {
        // saiu pelo portão: some lá (ou de vez, se ninguém está perto do festival)
        c.estado = 'morrendo';
        c.dissolver = 1;
        continue;
      }
      const posto = m.posto!;
      if (Math.hypot(posto[0] - alvo[0], posto[2] - alvo[2]) > 0.25) {
        m.posto = [alvo[0], alvo[1], alvo[2]];
        m.caminho = caminhoNoFestival(pub, [c.x, c.z], [alvo[0], alvo[2]]);
        c.menorDistancia = undefined;
        c.semProgresso = 0;
      } else if (l.olhar && !m.caminho?.length && Math.hypot(c.x - alvo[0], c.z - alvo[2]) < 0.7)
        // chegou: olha para o palco (na grade) ou para o meio da rodinha (de papo)
        c.yawAlvo = Math.atan2(l.olhar[0] - c.x, l.olhar[1] - c.z);
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
    } else if (missao === 'f3' && !show) {
      caixas.fill(false);
      for (const k of [...acendeu]) acendeu.delete(k);
      rodadaNova = true;
      ctx.sujar();
    }
  }

  return {
    /** A cada passo (o núcleo chama com o número do passo). */
    passo(n: number): void {
      if (n % 5 === 0) {
        cuidarDosEstojos();
        cuidarDoShow();
      }
      if (n % 10 === 0) cuidarDasLhamas();
      if (n % 20 === 0) cuidarDosMoradores();
      if (n % 5 === 2) cuidarDoPublico();
    },
    comando(id: string, c: ComandoVila): void {
      const j = ctx.jogador(id);
      if (!j || j.morto || !podeTocar(id)) return;
      if (c.a === 'caixa') tocarCaixa(j, c.i);
      else tocarPalco(j);
    },
    falou,
    preparar,
    vista,
    salvar: () => ({
      ins: [...ins],
      cx: [...caixas],
      poster: [...poster],
      ...(!rodadaNova && !show ? { tocou: true } : {}),
    }),
    /** Testes: a turma da grade (o público do show) à vista no núcleo. */
    publico: () =>
      ctx
        .criaturas()
        .filter(
          (c) =>
            c.morador?.povoado === POVOADO_VILA &&
            c.morador.n >= N0_PUBLICO &&
            c.estado !== 'morrendo',
        ),
    /** Testes: as lhamas da vila e as que estão na grade. */
    lhamas: () => ({ todas: [...lhamas], naGrade: [...naGrade] }),
  };
}

export type VilaNucleo = ReturnType<typeof criarVila>;
