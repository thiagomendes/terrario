/**
 * A Noite das Fantasias no núcleo (spec 027): o que é da vila da festa e muda com o jogo, igual
 * no aparelho e na nuvem. Puro (sem tela, sem DOM): o núcleo passa o que este módulo precisa.
 *
 * - **Moradores com posto** (T10): a Vovó Zuleica na varanda, o Conde Dudu na entrada do bosque,
 *   a Lulu espiando da quina de uma casinha, o Bento no palco, o Seu Jerônimo na horta, a Tia
 *   Filó e o Seu Olavo nas barracas e os cinco vizinhos das casinhas da rua. Aparecem quando
 *   alguém chega perto, ficam no posto e olham para a criança. Como os da Vila Neon, não vão
 *   salvos.
 * - **O abraço do Bento** (T11): um toque nele, de perto, e o núcleo manda o abraço como evento
 *   (quem, com qual morador, onde), para todos: o amigo perto vê os dois abraçados. Um abraço
 *   por vez; outra criança espera o fim (e mais 0,3 s). Nada prende a criança: quem anda mais
 *   que um tico desde o começo solta na hora, e todos recebem o "soltou".
 */
import type { PlanoBaile, PostoBaile } from '../world/noiteFantasias';
import type { Profissao } from '../world/povoado';
import type { Criatura, TipoSer } from '../jogo/criaturas';
import { ABRACO, DURACAO_ABRACO, N_BAILE, POVOADO_BAILE, VARINHA, VIZINHOS_DA_RUA } from '../jogo/baile';
import { temVarinha } from '../personagem/fantasias';
import { balcoesDoBaile } from '../jogo/compra';
import { TOQUES_POR_SEGUNDO } from '../jogo/show';
import { criarComprasDaVila, type EventoCompras, type JogadorCompra } from './vilaCompras';
import {
  criarMissoesDoBaile,
  type ComandoMissoesBaile,
  type EventoMissoesBaile,
  type JogadorMissoesBaile,
} from './baileMissoes';

export { POVOADO_BAILE };

/** Os moradores de posto (o número é o `n` do morador) e a profissão de cada um. */
export const MORADORES_BAILE: readonly { n: number; posto: PostoBaile; profissao: Profissao }[] = [
  { n: N_BAILE.vovo, posto: 'vovo', profissao: 'cozinheiro' },
  { n: N_BAILE.dudu, posto: 'dudu', profissao: 'ferreiro' },
  { n: N_BAILE.lulu, posto: 'lulu', profissao: 'cozinheiro' },
  { n: N_BAILE.bento, posto: 'bento', profissao: 'construtor' },
  { n: N_BAILE.jeronimo, posto: 'jeronimo', profissao: 'construtor' },
  { n: N_BAILE.filo, posto: 'filo', profissao: 'cozinheiro' },
  { n: N_BAILE.olavo, posto: 'olavo', profissao: 'cozinheiro' },
];
/**
 * As profissões dos vizinhos da rua, na ordem das portas: a vizinha de gatinho, o marceneiro, a
 * confeiteira, o vizinho de morceguinho e o lanterneiro (as três profissões têm as trocas).
 */
export const PROFISSOES_DA_RUA: readonly Profissao[] = [
  'cozinheiro',
  'construtor',
  'cozinheiro',
  'construtor',
  'ferreiro',
];
/** Aparece quando alguém está a menos disto do posto (blocos), com o chão carregado. */
export const PERTO_DO_POSTO = 56;

/** Um jogador, como o módulo o vê. */
export interface JogadorBaile {
  id: string;
  x: number;
  y: number;
  z: number;
  morto: boolean;
}

export interface CtxBaile {
  plano: PlanoBaile;
  salvo: unknown;
  agora(): number;
  jogadores(): JogadorBaile[];
  jogador(id: string): JogadorBaile | undefined;
  adicionar(tipo: TipoSer, x: number, y: number, z: number): Criatura;
  criaturas(): readonly Criatura[];
  /** O chão da coluna já está carregado (alguém vê)? */
  carregado(x: number, z: number): boolean;
  /** T14: quem compra (a mochila e a barrinha), ou undefined. */
  comprador?(id: string): JogadorCompra | undefined;
  /** T16: a aparência da criança (o perfil), para saber se a varinha está na mão. */
  aparencia?(id: string): unknown;
  /** T18: as crianças como as missões as veem (a missão aberta, a mochila, os lugares). */
  jogadoresMissoes?(): JogadorMissoesBaile[];
  jogadorMissoes?(id: string): JogadorMissoesBaile | undefined;
  /** T18: o ganho de uma ação (a lanterna da n2). */
  evento?(id: string, chave: string): void;
  /** Evento para todos (o abraço, a compra). */
  espalhar(e: EventoBaile | EventoCompras): void;
  /** O estado mudou: a tela precisa do quadro novo. */
  sujar(): void;
}

export type EventoBaile =
  /** T11: o Bento abraçou a criança `quem` (a criatura é o Bento; x, y, z: os pés dela). */
  | { e: 'baileAbraco'; quem: string; criatura: number; x: number; y: number; z: number }
  /** T11: o abraço acabou antes (a criança mexeu no controle ou saiu). */
  | { e: 'baileSolta'; quem: string; criatura: number }
  /** T16: a varinha de `quem` fez nascer uma florzinha no chão em x, y, z (some sozinha). */
  | { e: 'baileFlor'; quem: string; x: number; y: number; z: number }
  /** T18: as missões n1 a n5 (as portas, as lanternas, a Lulu, a horta, o Tufinho). */
  | EventoMissoesBaile;

/**
 * O comando `baile`: comprar o lanche `i` de `balcoesDoBaile` (T14); a varinha no ponto x, y, z
 * do chão tocado (T16); os toques das missões (T18).
 */
export type ComandoBaile =
  | { a: 'comprar'; i: number }
  | { a: 'varinha'; x: number; y: number; z: number }
  | ComandoMissoesBaile;

/** O abraço de agora (um por vez). */
interface AbracoAgora {
  quem: string;
  criatura: number;
  inicio: number;
  x: number;
  z: number;
}

/** Um posto: onde o morador fica e, se tiver, para onde ele olha quando ninguém está perto. */
interface Lugar {
  n: number;
  profissao: Profissao;
  posto: [number, number, number];
  yaw?: number;
}

export function criarBaile(ctx: CtxBaile) {
  const p = ctx.plano.pontos;

  /** Todos os moradores com o lugar de cada um. */
  const lugares: Lugar[] = [
    ...MORADORES_BAILE.map((m) => ({ n: m.n, profissao: m.profissao, posto: p.postos[m.posto] })),
    ...p.vizinhos.slice(0, VIZINHOS_DA_RUA).map((v, i) => ({
      n: N_BAILE.rua + i,
      profissao: PROFISSOES_DA_RUA[i],
      posto: [v.x, v.y, v.z] as [number, number, number],
      yaw: v.yaw,
    })),
  ];

  // ------------------------------------------------------------------ moradores
  function cuidarDosMoradores(): void {
    const vivos = new Set<number>();
    for (const c of ctx.criaturas())
      if (c.morador?.povoado === POVOADO_BAILE && c.estado !== 'morrendo') vivos.add(c.morador.n);
    const jogadores = ctx.jogadores();
    for (const m of lugares) {
      if (vivos.has(m.n)) continue;
      const posto = m.posto;
      const perto = jogadores.some(
        (j) => Math.hypot(j.x - posto[0], j.z - posto[2]) < PERTO_DO_POSTO,
      );
      if (!perto || !ctx.carregado(posto[0], posto[2])) continue;
      const c = ctx.adicionar('morador', posto[0], posto[1], posto[2]);
      if (m.yaw !== undefined) c.yaw = c.yawAlvo = m.yaw;
      c.morador = {
        povoado: POVOADO_BAILE,
        n: m.n,
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
    }
  }

  // ------------------------------------------------------------------ o abraço do Bento
  let abraco: AbracoAgora | null = null;
  /** Quando o último abraço acabou (a próxima criança espera `ABRACO.espera` depois dele). */
  let fimDoUltimo = -Infinity;

  function abracar(id: string, c: Criatura): void {
    const j = ctx.jogador(id);
    if (!j || j.morto) return;
    const agora = ctx.agora();
    if (abraco || agora < fimDoUltimo + ABRACO.espera) return;
    // de perto, no mesmo chão (no palco com ele)
    if (Math.hypot(j.x - c.x, j.z - c.z) > ABRACO.alcance || Math.abs(j.y - c.y) > 0.5) return;
    abraco = { quem: id, criatura: c.id, inicio: agora, x: j.x, z: j.z };
    // ele olha para ela
    c.yaw = c.yawAlvo = Math.atan2(j.x - c.x, j.z - c.z);
    ctx.espalhar({
      e: 'baileAbraco',
      quem: id,
      criatura: c.id,
      x: Math.round(j.x * 100) / 100,
      y: Math.round(j.y * 100) / 100,
      z: Math.round(j.z * 100) / 100,
    });
  }

  function cuidarDoAbraco(): void {
    if (!abraco) return;
    const a = abraco;
    const agora = ctx.agora();
    const j = ctx.jogador(a.quem);
    const bento = ctx.criaturas().find((c) => c.id === a.criatura && c.estado !== 'morrendo');
    if (agora - a.inicio >= DURACAO_ABRACO) {
      abraco = null;
      fimDoUltimo = agora;
      return;
    }
    // mexeu no controle (ou saiu, ou o Bento sumiu): solta na hora, para todos
    if (!j || j.morto || !bento || Math.hypot(j.x - a.x, j.z - a.z) > ABRACO.solta) {
      abraco = null;
      fimDoUltimo = agora;
      ctx.espalhar({ e: 'baileSolta', quem: a.quem, criatura: a.criatura });
    }
  }

  // ------------------------------------------------------------------ comprar (T14)
  // o mesmo módulo da Vila Neon (spec 032), com os balcões da festa: a fichinha, a entrega, uma
  // compra por vez, 3 de cada e a barrinha cheia sem perder nada
  const compras = criarComprasDaVila({
    balcoes: balcoesDoBaile(ctx.plano),
    agora: ctx.agora,
    jogador: (id) => ctx.comprador?.(id),
    espalhar: ctx.espalhar,
  });
  // ------------------------------------------------------------------ a varinha (T16)
  /** Quando cada criança fez a última florzinha. */
  const ultimaFlor = new Map<string, number>();
  function varinha(j: JogadorBaile, c: { x: number; y: number; z: number }): void {
    if (!temVarinha(ctx.aparencia?.(j.id))) return;
    // o chão tocado a até 5 blocos (dos pés, no chão; um tico de folga em altura)
    if (Math.hypot(c.x - j.x, c.z - j.z) > VARINHA.alcance || Math.abs(c.y - j.y) > 3) return;
    const t = ctx.agora();
    if (t - (ultimaFlor.get(j.id) ?? -Infinity) < VARINHA.espera) return;
    ultimaFlor.set(j.id, t);
    if (ultimaFlor.size > 256) ultimaFlor.delete(ultimaFlor.keys().next().value as string);
    const r = (v: number) => Math.round(v * 100) / 100;
    ctx.espalhar({ e: 'baileFlor', quem: j.id, x: r(c.x), y: r(c.y), z: r(c.z) });
  }

  // ------------------------------------------------------------------ as missões n1 a n5 (T18)
  const missoes = criarMissoesDoBaile({
    plano: ctx.plano,
    salvo: ctx.salvo,
    agora: ctx.agora,
    jogadores: () => ctx.jogadoresMissoes?.() ?? [],
    jogador: (id) => ctx.jogadorMissoes?.(id),
    evento: (id, chave) => ctx.evento?.(id, chave),
    espalhar: ctx.espalhar,
    sujar: ctx.sujar,
  });

  const toques = new Map<string, number[]>();
  function podeTocar(id: string): boolean {
    const t = ctx.agora();
    const l = (toques.get(id) ?? []).filter((x) => t - x < 1);
    if (l.length >= TOQUES_POR_SEGUNDO) {
      toques.set(id, l);
      return false;
    }
    l.push(t);
    toques.set(id, l);
    if (toques.size > 256) toques.delete(toques.keys().next().value as string);
    return true;
  }

  return {
    /** A cada passo (o núcleo chama com o número do passo). */
    passo(n: number): void {
      if (n % 20 === 0) cuidarDosMoradores();
      cuidarDoAbraco();
      compras.passo();
      missoes.passo(n);
    },
    /** O comando `baile` (já saneado): comprar numa barraca da festa; a varinha; as missões. */
    comando(id: string, c: ComandoBaile): void {
      const j = ctx.jogador(id);
      if (!j || j.morto || !podeTocar(id)) return;
      if (c.a === 'comprar') compras.comando(id, c);
      else if (c.a === 'varinha') varinha(j, c);
      else missoes.comando(id, c);
    },
    /** T18: a missão foi escolhida (ou escolhida de novo): o que é dela volta ao lugar. */
    preparar: (id: string, missao: string | null) => missoes.preparar(id, missao),
    /** T18: o que a tela desta criança sabe da festa (o quadro). */
    vistaDe: (id: string) => missoes.vistaDe(id),
    /** T18: o que vai salvo com o mundo (`extras.baile`). */
    salvar: () => {
      const m = missoes.salvar();
      return Object.keys(m).length ? { m } : {};
    },
    /** Testes: as compras (os lanches a caminho). */
    compras,
    /** Testes: as missões (as portas abertas, o Tufinho e as cópias). */
    missoes,
    /** Um toque num morador (o núcleo chama no "falar"): no Bento, o abraço. */
    falou(id: string, c: Criatura): void {
      if (c.morador?.povoado === POVOADO_BAILE && c.morador.n === N_BAILE.bento) abracar(id, c);
    },
    /** Testes: o abraço de agora (quem, com qual morador, desde quando), ou null. */
    abraco: (): Readonly<AbracoAgora> | null => abraco,
    /** Testes: os moradores da festa à vista no núcleo. */
    moradores: () =>
      ctx
        .criaturas()
        .filter((c) => c.morador?.povoado === POVOADO_BAILE && c.estado !== 'morrendo'),
    /** Testes: onde fica cada morador. */
    lugares: (): readonly Lugar[] => lugares,
  };
}

export type BaileNucleo = ReturnType<typeof criarBaile>;
