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
import { ABRACO, DURACAO_ABRACO, N_BAILE, POVOADO_BAILE, VIZINHOS_DA_RUA } from '../jogo/baile';

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
  /** Evento para todos (o abraço). */
  espalhar(e: EventoBaile): void;
  /** O estado mudou: a tela precisa do quadro novo. */
  sujar(): void;
}

export type EventoBaile =
  /** T11: o Bento abraçou a criança `quem` (a criatura é o Bento; x, y, z: os pés dela). */
  | { e: 'baileAbraco'; quem: string; criatura: number; x: number; y: number; z: number }
  /** T11: o abraço acabou antes (a criança mexeu no controle ou saiu). */
  | { e: 'baileSolta'; quem: string; criatura: number };

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

  return {
    /** A cada passo (o núcleo chama com o número do passo). */
    passo(n: number): void {
      if (n % 20 === 0) cuidarDosMoradores();
      cuidarDoAbraco();
    },
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
