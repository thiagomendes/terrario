/**
 * O Parque de diversões no núcleo (spec 026, parte 2): o núcleo é dono das cadeiras. Puro (sem
 * tela): `criarVila` passa o que este módulo precisa, e ele vale igual no aparelho e na nuvem.
 *
 * - **Sentar:** o toque no brinquedo pede uma cadeira; o núcleo confere que a criança alcança o
 *   brinquedo (`alcancaOBrinquedo`, a mesma conta da tela) e dá a cadeira livre (`escolherCadeira`).
 *   Cada cadeira tem um dono só; dois amigos andam juntos, cada um na sua.
 * - **Onde a cadeira está** é conta do relógio do mundo (`src/jogo/parque.ts`): nada vai pela rede
 *   a cada quadro. O quadro leva só quem está sentado onde, e o empurrão da roda.
 * - **Descer:** na roda-gigante, sozinha, quando a cadeirinha volta embaixo depois da volta
 *   inteira; no carrossel e no bate-bate, quando a criança escolhe ("Sair"). Quem some do mundo
 *   (saiu, morreu, pulou para longe) solta a cadeira. O núcleo diz onde ela pisa ao descer.
 * - **O "tum" do bate-bate** balança o carrinho da frente (com amigo ou vazio); **o toque na
 *   roda** dá o empurrãozinho (um por vez, para todos).
 * - **Nada é salvo:** ao abrir o mundo todo mundo está em pé.
 * - **Para as missões da fase seguinte**, o núcleo já conta as chaves `andou:roda` (a volta
 *   inteira), `andou:carrossel` (uma volta) e `andou:bate` (o primeiro "tum" de cada passeio).
 */
import {
  BRINQUEDOS,
  CADEIRAS,
  SEM_IMPULSO,
  VOLTA_CARROSSEL,
  alcancaOBrinquedo,
  anguloDaCadeirinha,
  carrinhoDaFrente,
  distanciaDoBrinquedo,
  empurrarRoda,
  escolherCadeira,
  fimDoPasseio,
  lugarDaCadeira,
  saidaDaCadeira,
  type Brinquedo,
  type ImpulsoRoda,
  type ParqueVila,
  type ParqueVista,
  type Sentado,
} from '../jogo/parque';

export interface JogadorParque {
  id: string;
  x: number;
  y: number;
  z: number;
  morto: boolean;
}

export interface CtxParque {
  parque: ParqueVila;
  /** Os pés no chão do bairro. */
  chao: number;
  agora(): number;
  jogadores(): JogadorParque[];
  jogador(id: string): JogadorParque | undefined;
  /** O próximo lugar que o jogador mandar vale mesmo longe do de antes (ele desceu do brinquedo). */
  soltar(id: string): void;
  evento(id: string, chave: string, qtd?: number): void;
  espalhar(e: EventoParque): void;
  sujar(): void;
}

export type EventoParque =
  /** Alguém sentou (o "puf" e o sininho, para todos). */
  | { e: 'parqueSentou'; quem: string; b: number; i: number }
  /** Alguém desceu: onde pisa (o próprio vai para lá) e se foi o fim da volta da roda. */
  | {
      e: 'parqueDesceu';
      quem: string;
      b: number;
      i: number;
      x: number;
      y: number;
      z: number;
      fim?: true;
    }
  /** O "tum": o carrinho `de` bateu no `alvo` (que balança e solta estrelinhas). */
  | { e: 'parqueTum'; quem: string; de: number; alvo: number }
  /** O empurrãozinho na roda-gigante (as lâmpadas piscam). */
  | { e: 'parqueRoda'; quem: string };

export type ComandoParque =
  | { a: 'sentar'; b: number }
  | { a: 'sair' }
  | { a: 'tum' }
  | { a: 'roda' };

/** Longe da cadeira por mais que isto (blocos), depois da folga, a criança soltou a cadeira. */
export const LONGE_DA_CADEIRA = 6;
export const FOLGA_AO_SENTAR = 2;
/** Até onde (blocos) o toque na roda-gigante dá o empurrãozinho. */
export const ALCANCE_EMPURRAR = 14;

export function criarParqueNucleo(ctx: CtxParque) {
  const { parque } = ctx;
  const sentados = new Map<string, Sentado>();
  /** Quem já contou a chave do passeio de agora (uma vez por passeio). */
  const contou = new Set<string>();
  let impulso: ImpulsoRoda = SEM_IMPULSO;

  const ocupada = (b: Brinquedo) => (i: number) => {
    for (const s of sentados.values()) if (s.b === b && s.i === i) return true;
    return false;
  };
  const numero = (b: Brinquedo) => BRINQUEDOS.indexOf(b);

  function sentar(j: JogadorParque, nb: number): void {
    const b = BRINQUEDOS[nb];
    if (!b || sentados.has(j.id)) return;
    if (!alcancaOBrinquedo(parque, b, j.x, j.z) || Math.abs(j.y - ctx.chao) > 4) return;
    const t = ctx.agora();
    const i = escolherCadeira(parque, b, j.x, j.z, t, ocupada(b), impulso);
    if (i < 0) return;
    const s: Sentado = { b, i, desde: t };
    if (b === 'roda') s.fim = fimDoPasseio(i, t, impulso);
    sentados.set(j.id, s);
    contou.delete(j.id);
    ctx.espalhar({ e: 'parqueSentou', quem: j.id, b: nb, i });
    ctx.sujar();
  }

  function descer(id: string, fim = false): void {
    const s = sentados.get(id);
    if (!s) return;
    sentados.delete(id);
    contou.delete(id);
    const [x, y, z] = saidaDaCadeira(parque, s.b, s.i, ctx.agora(), ctx.chao);
    ctx.soltar(id);
    ctx.espalhar({
      e: 'parqueDesceu',
      quem: id,
      b: numero(s.b),
      i: s.i,
      x: Math.round(x * 100) / 100,
      y,
      z: Math.round(z * 100) / 100,
      ...(fim ? { fim: true as const } : {}),
    });
    ctx.sujar();
  }

  function tum(j: JogadorParque): void {
    const s = sentados.get(j.id);
    if (!s || s.b !== 'bate') return;
    ctx.espalhar({ e: 'parqueTum', quem: j.id, de: s.i, alvo: carrinhoDaFrente(s.i) });
    if (!contou.has(j.id)) {
      contou.add(j.id);
      ctx.evento(j.id, 'andou:bate');
    }
  }

  function empurrar(j: JogadorParque): void {
    const s = sentados.get(j.id);
    const perto =
      s?.b === 'roda' || distanciaDoBrinquedo(parque, 'roda', j.x, j.z) <= ALCANCE_EMPURRAR;
    if (!perto) return;
    const novo = empurrarRoda(impulso, ctx.agora());
    if (novo === impulso) return;
    impulso = novo;
    ctx.espalhar({ e: 'parqueRoda', quem: j.id });
    ctx.sujar();
  }

  return {
    comando(id: string, c: ComandoParque): void {
      const j = ctx.jogador(id);
      if (!j || j.morto) return;
      if (c.a === 'sentar') sentar(j, c.b);
      else if (c.a === 'sair') descer(id);
      else if (c.a === 'tum') tum(j);
      else if (c.a === 'roda') empurrar(j);
    },
    /** A cada passo do núcleo (umas 4 vezes por segundo basta). */
    passo(): void {
      if (!sentados.size) return;
      const t = ctx.agora();
      for (const [id, s] of [...sentados]) {
        const j = ctx.jogador(id);
        // saiu do mundo ou morreu: a cadeira fica livre (ele não está mais lá para descer)
        if (!j || j.morto) {
          sentados.delete(id);
          contou.delete(id);
          ctx.sujar();
          continue;
        }
        // foi para longe por outro caminho (pulou para um amigo, voltou para casa): soltou
        const l = lugarDaCadeira(parque, s.b, s.i, t, impulso);
        if (
          t - s.desde > FOLGA_AO_SENTAR &&
          Math.hypot(j.x - l.x, j.y - l.y, j.z - l.z) > LONGE_DA_CADEIRA
        ) {
          sentados.delete(id);
          contou.delete(id);
          ctx.sujar();
          continue;
        }
        if (s.b === 'roda' && s.fim !== undefined) {
          // a volta inteira: a cadeirinha chegou embaixo de novo e a criança desce sozinha
          if (anguloDaCadeirinha(s.i, t, impulso) >= s.fim) {
            ctx.evento(id, 'andou:roda');
            descer(id, true);
          }
        } else if (s.b === 'carrossel' && !contou.has(id) && t - s.desde >= VOLTA_CARROSSEL) {
          contou.add(id);
          ctx.evento(id, 'andou:carrossel');
        }
      }
    },
    vista(): ParqueVista {
      const s: ParqueVista['s'] = {};
      for (const [id, q] of sentados)
        s[id] = [numero(q.b), q.i, Math.round(q.desde * 1000) / 1000, q.fim ?? 0];
      return { r: [impulso.d, impulso.ti], s };
    },
    /** Testes: quem está sentado e o empurrão da roda. */
    sentados: () => new Map(sentados),
    impulso: () => impulso,
    cadeiras: CADEIRAS,
  };
}

export type ParqueNucleo = ReturnType<typeof criarParqueNucleo>;
