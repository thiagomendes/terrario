/**
 * Spec 032: comprar na barraca (por enquanto, só na Vila Neon). Puro (sem tela): o núcleo e a
 * tela fazem a mesma conta (onde fica cada lanche, de onde a criança alcança, quem entrega, se
 * cabe na barrinha).
 *
 * - **A compra é uma entrega de verdade:** a fichinha, o preparo, a vendedora estica o braço e o
 *   lanche pula até a mão da criança. O núcleo põe o lanche na mão quando ele chega
 *   (`CHEGA_NA_MAO` depois do toque), e não aceita outra compra da mesma criança antes de
 *   `ESPERA_COMPRA`.
 * - **O pagamento é um passo só** (`PAGAMENTO`, `pagar`): hoje a fichinha de mentirinha, de graça
 *   (as moedinhas são da progressão e não escorrem). Trocar é mudar só aqui.
 * - **Sem falha:** com a barrinha cheia a compra não acontece (nada sai da mão); com 3 do mesmo
 *   lanche a vendedora só acena.
 */
import type { PlanoVila, PecaVila } from '../world/vilaNeon';
import { ALGODAO_DOCE, CACHORRO_QUENTE, SUCO, VITAMINA } from './exclusivos';
import { TAMANHO_BARRA, type Slot } from './inventario';

type P3 = [number, number, number];

/** O que se compra. */
export type Lanche = 'pipoca' | 'cachorro' | 'suco' | 'vitamina' | 'algodao';

/** O item de cada lanche. */
export const ITEM_DO_LANCHE: Readonly<Record<Lanche, string>> = {
  pipoca: 'pipoca',
  cachorro: CACHORRO_QUENTE,
  suco: SUCO,
  vitamina: VITAMINA,
  algodao: ALGODAO_DOCE,
};

/** As barracas (cada uma com o seu preparo na tela). */
export type Barraca = 'lanche' | 'lanchonete' | 'pipocaParque' | 'algodao' | 'pipocaPracinha';

/**
 * Quem entrega (o `n` do morador da vila): a Bia do lanche (o posto 3), a Tati da lanchonete
 * (6), o Seu Chico do parque (63) e a Dona Cida da pracinha (73). Os números são os de
 * `src/nucleo/vila.ts` (o teste confere).
 */
export const VENDEDORA: Readonly<Record<Barraca, number>> = {
  lanche: 3,
  lanchonete: 6,
  pipocaParque: 63,
  algodao: 63,
  pipocaPracinha: 73,
};

/** Um lugar de comprar: um lanche numa barraca. */
export interface Balcao {
  /** O nome do toque (a dica e os testes). */
  chave: string;
  barraca: Barraca;
  lanche: Lanche;
  item: string;
  /** Onde o lanche está (mundo): o dedo pega ali, e o lanche sai dali. */
  p: P3;
  /** Até onde (blocos, no chão, do ponto) a criança alcança. */
  alcance: number;
  /** Quem entrega (o `n` do morador). */
  vendedora: number;
}

/** Quanto tempo do toque até o lanche chegar na mão (s). */
export const CHEGA_NA_MAO = 1.55;
/** Uma compra por vez: a próxima só depois deste tanto (s, do toque). */
export const ESPERA_COMPRA = 2.2;
/** No máximo tantos de cada lanche com a criança (a mochila não enche de pipoca). */
export const MAX_POR_LANCHE = 3;
/** Até onde (blocos) a criança alcança cada barraca. */
const ALCANCE_BALCAO = 5.5;
const ALCANCE_CARRINHO = 5;

/**
 * Como se paga. Hoje: a fichinha de mentirinha, de graça (a criança entrega uma fichinha dourada
 * com estrela; nada sai da carteira). Dúvida para o dono na spec 032.
 */
export const PAGAMENTO = { tipo: 'fichinha', preco: 0 } as const;

/** O passo de pagar (o núcleo chama antes de entregar). A fichinha é de graça: sempre paga. */
export function pagar(_quem: string, _lanche: Lanche): boolean {
  return PAGAMENTO.preco === 0;
}

/** Um ponto no espaço da peça (x para o lado, y para cima, z para a frente) no mundo. */
export function noMundo(q: Pick<PecaVila, 'x' | 'y' | 'z' | 'dir'>, lx: number, ly: number, lz: number): P3 {
  const a = (q.dir * Math.PI) / 2;
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [q.x + lx * c + lz * s, q.y + ly, q.z - lx * s + lz * c];
}

/**
 * Os lugares de comprar da Vila Neon, sempre na mesma ordem (o índice é o do comando
 * `comprar`): os três lanches do balcão da Bia (as pipocas à esquerda, os cachorros-quentes no
 * meio, o suco à direita), a vitamina da lanchonete, a pipoca do parque, o algodão-doce e a
 * pipoca da pracinha.
 */
export function balcoesDaVila(plano: PlanoVila): Balcao[] {
  const r: Balcao[] = [];
  const add = (b: Omit<Balcao, 'item' | 'vendedora'>) =>
    r.push({ ...b, item: ITEM_DO_LANCHE[b.lanche], vendedora: VENDEDORA[b.barraca] });
  // (o balcão da barraca do lanche é a peça 2 do balcão: os lanches ficam em cima dele)
  const lanche = plano.pecas.find((q) => q.tipo === 'balcao' && q.n === 2);
  if (lanche) {
    add({ chave: 'compra-pipoca', barraca: 'lanche', lanche: 'pipoca', p: noMundo(lanche, -0.9, 0.3, 0), alcance: ALCANCE_BALCAO });
    add({ chave: 'compra-cachorro', barraca: 'lanche', lanche: 'cachorro', p: noMundo(lanche, 0.6, 0.12, 0.05), alcance: ALCANCE_BALCAO });
    add({ chave: 'compra-suco', barraca: 'lanche', lanche: 'suco', p: noMundo(lanche, 1.5, 0.2, 0), alcance: ALCANCE_BALCAO });
  }
  const b = plano.pontos.rua.balcao;
  add({ chave: 'compra-vitamina', barraca: 'lanchonete', lanche: 'vitamina', p: [b[0], b[1] + 1.2, b[2]], alcance: 6.5 });
  const pq = plano.pontos.parque;
  const pipocas = plano.pecas.filter((q) => q.tipo === 'pipoca');
  const doParque = pipocas.reduce<PecaVila | null>(
    (m, q) =>
      !m || Math.hypot(q.x - pq.algodao[0], q.z - pq.algodao[2]) < Math.hypot(m.x - pq.algodao[0], m.z - pq.algodao[2])
        ? q
        : m,
    null,
  );
  if (doParque)
    add({ chave: 'compra-pipoca-parque', barraca: 'pipocaParque', lanche: 'pipoca', p: noMundo(doParque, 0, 1.35, 0), alcance: ALCANCE_CARRINHO });
  add({ chave: 'compra-algodao', barraca: 'algodao', lanche: 'algodao', p: [pq.algodao[0], pq.algodao[1] + 1.4, pq.algodao[2]], alcance: ALCANCE_CARRINHO });
  const daPracinha = pipocas.find((q) => q !== doParque);
  if (daPracinha)
    add({ chave: 'compra-pipoca-pracinha', barraca: 'pipocaPracinha', lanche: 'pipoca', p: noMundo(daPracinha, 0, 1.35, 0), alcance: ALCANCE_CARRINHO });
  return r;
}

/** A criança (os pés em x, z) alcança este lugar de comprar? */
export function alcancaOBalcao(b: Balcao, x: number, z: number): boolean {
  return Math.hypot(b.p[0] - x, b.p[2] - z) <= b.alcance;
}

/**
 * Onde o lanche entra na barrinha (0 a 8), ou -1 com ela cheia: a pilha do mesmo lanche que
 * ainda cabe (a da mão primeiro), a mão vazia, ou o primeiro espaço vazio.
 */
export function lugarNaBarra(
  slots: readonly Slot[],
  item: string,
  ativo: number,
  pilha = 16,
): number {
  const cabe = (i: number) => {
    const s = slots[i];
    return !!s && s.item === item && s.dur === undefined && s.qtd < pilha;
  };
  if (ativo >= 0 && ativo < TAMANHO_BARRA && cabe(ativo)) return ativo;
  for (let i = 0; i < TAMANHO_BARRA; i++) if (cabe(i)) return i;
  if (ativo >= 0 && ativo < TAMANHO_BARRA && !slots[ativo]) return ativo;
  for (let i = 0; i < TAMANHO_BARRA; i++) if (!slots[i]) return i;
  return -1;
}
