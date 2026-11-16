/**
 * Spec 026 (parte 2, o bate-bate de guiar): o que o cliente sabe dos carrinhos. O núcleo simula
 * todos e manda onde estão; aqui a tela fica macia e o carrinho da criança responde na hora.
 *
 * - **Quem só olha** vê os carrinhos entre os dois últimos quadros do núcleo, um pouquinho
 *   atrasados (0,15 s): sempre liso, nunca um palpite.
 * - **Quem guia** prevê: a cada passo (20 por segundo) o controle dela vai para o núcleo com um
 *   número e, na mesma hora, anda o carrinho aqui com a mesma conta do núcleo
 *   (`src/jogo/bate.ts`). Os outros carrinhos seguem como vinham (o palpite), então a batida
 *   acontece na tela no instante em que os para-choques se tocam.
 * - **O acerto:** cada quadro do núcleo diz qual foi o último controle que ele já usou. A tela
 *   recomeça do quadro, refaz os controles que ainda não chegaram lá e compara com o que estava
 *   mostrando: a diferença (quase sempre nenhuma) some devagar, em vez de dar um pulo.
 */
import {
  PASSO_BATE,
  carrosDaVista,
  difRumo,
  guiaDaRede,
  passoBate,
  type Batida,
  type BateVista,
  type Carrinho,
  type Guia,
  type PistaBate,
} from '../jogo/bate';

/** Quem só olha vê os carrinhos com este atraso (s). */
export const ATRASO_DE_QUEM_OLHA = 0.15;
/** A diferença entre a previsão e o núcleo some nesta taxa (por segundo). */
const SOME_O_ERRO = 9;
const SOME_NA_TROCA = 3;
/** Mais longe que isto (blocos) não é erro de previsão: o carrinho vai direto para o lugar. */
const ERRO_DEMAIS = 3;
/** Controles sem resposta do núcleo: mais que isto, a rede travou (os mais velhos saem). */
const PENDENTES_MAX = 30;
/** Sem quadro do núcleo há mais que isto (s), os carrinhos não valem mais. */
const SEM_QUADRO = 2;

export interface CarrinhoNaTela {
  x: number;
  z: number;
  yaw: number;
  /** A velocidade de agora (blocos/s), para o som e os testes. */
  vel: number;
}

interface Quadro {
  /** O relógio do núcleo deste quadro (s). */
  t: number;
  carros: Carrinho[];
}

const copia = (l: readonly Carrinho[]): Carrinho[] => l.map((c) => ({ ...c }));

export function criarReplicaBate(pista: PistaBate) {
  /** Os últimos quadros do núcleo (os mais novos no fim). */
  const quadros: Quadro[] = [];
  let chegouEm = -Infinity;
  // ---- quem guia
  let meu = -1;
  let seq = 0;
  let pendentes: { n: number; x: number; z: number }[] = [];
  let carros: Carrinho[] = [];
  let antes: Carrinho[] = [];
  let acumulado = 0;
  let controle = { x: 0, z: 0 };
  // ---- o que aparece
  let mostrados: CarrinhoNaTela[] = [];
  let erro: { x: number; z: number; yaw: number }[] = [];
  let tNucleo = 0;
  /** O relógio do núcleo menos o da tela (s). */
  let diferenca: number | null = null;
  let refeitos = 0;
  let maiorErro = 0;
  /** O relógio daqui (s) e até quando vale o acerto devagar de quem acabou de sentar ou descer. */
  let relogio = 0;
  let trocouAte = -1;

  /** Onde cada carrinho estaria agora sem o acerto (a previsão, ou os dois últimos quadros). */
  function base(): { x: number; z: number; yaw: number; vel: number }[] {
    if (meu >= 0 && carros.length) {
      const k = Math.min(1, acumulado / PASSO_BATE);
      return carros.map((c, i) => {
        const a = antes[i] ?? c;
        return {
          x: a.x + (c.x - a.x) * k,
          z: a.z + (c.z - a.z) * k,
          yaw: a.yaw + difRumo(c.yaw, a.yaw) * k,
          vel: Math.hypot(c.x - a.x, c.z - a.z) / PASSO_BATE,
        };
      });
    }
    const n = quadros.length;
    if (!n) return [];
    const t = tNucleo - ATRASO_DE_QUEM_OLHA;
    let b = n - 1;
    while (b > 0 && quadros[b - 1].t >= t) b--;
    const qb = quadros[b];
    const qa = quadros[Math.max(0, b - 1)];
    const dt = qb.t - qa.t;
    // (depois do último quadro: segue um pouquinho como vinha, no máximo 0,15 s)
    const k = dt > 1e-6 ? Math.max(0, Math.min(1 + 0.15 / dt, (t - qa.t) / dt)) : 1;
    return qb.carros.map((c, i) => {
      const a = qa.carros[i] ?? c;
      return {
        x: a.x + (c.x - a.x) * k,
        z: a.z + (c.z - a.z) * k,
        yaw: a.yaw + difRumo(c.yaw, a.yaw) * k,
        vel: Math.hypot(Math.sin(c.yaw) * c.v + c.kx, Math.cos(c.yaw) * c.v + c.kz),
      };
    });
  }

  function mostrar(): void {
    const b = base();
    mostrados = b.map((c, i) => {
      const e = erro[i];
      return e ? { x: c.x + e.x, z: c.z + e.z, yaw: c.yaw + e.yaw, vel: c.vel } : c;
    });
  }

  /** A base mudou de uma vez (quadro novo, sentou, desceu): o que aparecia continua de onde estava. */
  function semPulo(antesDaMudanca: readonly CarrinhoNaTela[]): void {
    const b = base();
    erro = b.map((c, i) => {
      const m = antesDaMudanca[i];
      if (!m) return { x: 0, z: 0, yaw: 0 };
      const e = { x: m.x - c.x, z: m.z - c.z, yaw: difRumo(m.yaw, c.yaw) };
      const d = Math.hypot(e.x, e.z);
      if (i === meu && d > maiorErro) maiorErro = d;
      return d > ERRO_DEMAIS ? { x: 0, z: 0, yaw: 0 } : e;
    });
    mostrar();
  }

  /** Recomeça do quadro do núcleo e refaz os controles que ele ainda não usou. */
  function refazer(q: Quadro): void {
    const novo = copia(q.carros);
    // (o "preso" não vem no quadro: fica o da previsão)
    novo.forEach((c, i) => (c.p = carros[i]?.p ?? 0));
    let anterior: Carrinho[] | null = null;
    for (const p of pendentes) {
      anterior = copia(novo);
      const guias: Guia[] = [];
      guias[meu] = guiaDaRede(p.x, p.z);
      passoBate(pista, novo, guias, PASSO_BATE);
      refeitos++;
    }
    // (nenhum controle para refazer: o passo de antes continua sendo o da previsão)
    antes = anterior ?? (antes.length === novo.length ? antes : copia(novo));
    carros = novo;
  }

  return {
    /** Um quadro do núcleo: `t` é o relógio dele (o passo × 0,05 s) e `agora` o da tela (s). */
    receber(v: BateVista, t: number, agora: number): void {
      const r = carrosDaVista(v);
      if (!r) return;
      const ultimo = quadros[quadros.length - 1];
      // (o relógio do núcleo voltou: outro mundo, ou o servidor recomeçou)
      if (ultimo && t < ultimo.t - 1) quadros.length = 0;
      if (ultimo && t <= ultimo.t) return;
      const q = { t, carros: r.carros };
      // o relógio do núcleo visto daqui: vale o quadro que chegou mais depressa (o atraso da
      // rede varia), descendo devagar; um salto grande (a aba dormiu) acerta de uma vez
      const d = t - agora;
      if (diferenca === null || d > diferenca || d < diferenca - 0.5) diferenca = d;
      else diferenca += (d - diferenca) * 0.02;
      quadros.push(q);
      if (quadros.length > 8) quadros.shift();
      chegouEm = agora;
      if (meu < 0) return;
      const mostrava = mostrados;
      pendentes = pendentes.filter((p) => p.n > r.ack);
      refazer(q);
      semPulo(mostrava);
    },
    /** A criança sentou no carrinho `i` (ou desceu: -1). */
    definirMeu(i: number): void {
      if (i === meu) return;
      const mostrava = mostrados;
      meu = i;
      trocouAte = relogio + 0.8;
      seq = 0;
      pendentes = [];
      acumulado = 0;
      controle = { x: 0, z: 0 };
      const q = quadros[quadros.length - 1];
      carros = q && i >= 0 ? copia(q.carros) : [];
      antes = copia(carros);
      // (sentou: os outros carrinhos saem do atraso de quem olha para o agora, sem pulo)
      semPulo(mostrava);
    },
    /** O controle de agora: o rumo no mundo (0 a 1 de força). */
    guiar(x: number, z: number): void {
      controle = { x, z };
    },
    /**
     * Uma vez por quadro da tela. Guiando, a cada 0,05 s manda o controle (`enviar`) e anda a
     * previsão; as batidas do carrinho da criança saem em `aoBater`, na hora.
     */
    quadro(
      dt: number,
      agora: number,
      enviar: (x: number, z: number, n: number) => void,
      aoBater?: (b: Batida) => void,
    ): void {
      tNucleo = agora + (diferenca ?? 0);
      relogio += dt;
      // (logo depois de sentar ou descer a diferença é o atraso de quem olha, bem maior que um
      // erro de previsão: some mais devagar, os outros carrinhos só parecem hesitar um instante)
      const some = Math.exp(-(relogio < trocouAte ? SOME_NA_TROCA : SOME_O_ERRO) * dt);
      for (const e of erro) {
        e.x *= some;
        e.z *= some;
        e.yaw *= some;
      }
      if (meu >= 0 && carros.length) {
        acumulado += Math.min(dt, 0.25);
        while (acumulado >= PASSO_BATE) {
          acumulado -= PASSO_BATE;
          const m = Math.hypot(controle.x, controle.z);
          const f = m > 1 ? 100 / m : 100;
          const x = Math.round(controle.x * f);
          const z = Math.round(controle.z * f);
          seq++;
          pendentes.push({ n: seq, x, z });
          if (pendentes.length > PENDENTES_MAX) pendentes.shift();
          enviar(x, z, seq);
          antes = copia(carros);
          const guias: Guia[] = [];
          guias[meu] = guiaDaRede(x, z);
          const batidas: Batida[] = [];
          passoBate(pista, carros, guias, PASSO_BATE, batidas);
          if (aoBater) for (const b of batidas) if (b.a === meu || b.b === meu) aoBater(b);
        }
      }
      mostrar();
    },
    /** Os carrinhos na tela agora (null: sem quadro do núcleo há tempo, ou nunca). */
    carros(agora: number): readonly CarrinhoNaTela[] | null {
      return mostrados.length && agora - chegouEm < SEM_QUADRO ? mostrados : null;
    },
    /** O carrinho da criança (-1: em pé). */
    get meu(): number {
      return meu;
    },
    /** Testes e medidas: controles esperando o núcleo, passos refeitos e o maior acerto (blocos). */
    info: () => ({ pendentes: pendentes.length, refeitos, maiorErro, quadros: quadros.length, seq }),
  };
}

export type ReplicaBate = ReturnType<typeof criarReplicaBate>;
