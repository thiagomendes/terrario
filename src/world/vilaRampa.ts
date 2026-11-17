/**
 * A pista de skate da Vila Neon (spec 026, parte 3), no lote do sudeste ao lado do rinque (antes
 * um jardim acabado): o gramado com a cerca-viva, o caminho da entrada, o piso de concreto em
 * volta da rampa, os bancos, as árvores, os canteiros e o lugar de cada peça que não é bloco (a
 * rampa em U, o suporte dos skates e a BMX de enfeite). Puro e determinístico, como o resto do
 * planejador.
 *
 * O mapa do lote (u de 150 a 178, v de 110 a 147; o norte em -v):
 * - a **entrada** no meio do norte (o caminho desce do jardim do rinque), e uma de lado, no oeste;
 * - a **rampa em U** no meio, correndo de norte a sul: as curvas ficam a leste e a oeste, e as
 *   pontas abertas olham para os bancos;
 * - o **suporte dos skates** na entrada, de frente para o caminho;
 * - a **menina do skate** perto do suporte e o **menino da BMX** com a bicicleta no sul.
 */
import { Bloco } from './blocks';
import type { FerramentasVila } from './vilaParque';
import type { RetanguloVila } from './vilaNeon';
import { MEDIDA_RAMPA, type RampaSkate } from '../jogo/rampa';

type P3 = [number, number, number];

/** O lote da pista no mapa. */
export const LOTE_RAMPA = { u0: 150, v0: 110, u1: 178, v1: 147 } as const;
/** A rampa no mapa: o meio do fundo (u), e de onde até onde ela corre (v). */
export const RAMPA_NO_MAPA = { u: 164, v0: 118, v1: 129 } as const;
/** O comprimento da rampa ao longo do fundo (blocos). */
export const COMPRIMENTO_RAMPA = RAMPA_NO_MAPA.v1 - RAMPA_NO_MAPA.v0 + 1;

/** Os lugares da pista (mundo). */
export interface PontosRampa {
  rampa: RampaSkate;
  /** O suporte dos skates (o meio da frente, no chão). */
  suporte: P3;
  /** A área toda (o lote), para o som e os testes. */
  lote: RetanguloVila;
}

export interface RampaMontada {
  pontos: PontosRampa;
  postos: { skatista: P3; bmx: P3 };
}

const DIR = { s: 0, l: 1, n: 2, o: 3 } as const;

export function montarPistaDeSkate(f: FerramentasVila): RampaMontada {
  const { X, Z, Y, chao, b, encher, peca, arvore, poste, cercaViva, canteiro, ret } = f;
  const { u0: U0, v0: V0, u1: U1, v1: V1 } = LOTE_RAMPA;
  const C = Bloco.PEDRA_CREME;
  const { u: RU, v0: RV0, v1: RV1 } = RAMPA_NO_MAPA;

  // ============================================================== a cerca-viva e as entradas
  cercaViva(U0, V0, U1, V0);
  cercaViva(U0, V1, U1, V1);
  cercaViva(U0, V0, U0, V1);
  cercaViva(U1, V0, U1, V1);
  for (let u = 162; u <= 167; u++) b(u, 1, V0, Bloco.AR);
  for (let v = 127; v <= 130; v++) b(U0, 1, v, Bloco.AR);

  // ============================================================== os caminhos
  // do jardim do rinque (a calçada de lá) até a entrada do norte: a cerca-viva do jardim abre
  encher(163, 91, 166, V0 + 5, C);
  // (a passagem fica livre até acima da cabeça: as folhas baixas das árvores do jardim saem)
  for (let u = 163; u <= 166; u++) for (let v = 91; v < V0; v++) for (let y = 1; y <= 3; y++) b(u, y, v, Bloco.AR);
  // da entrada do oeste até o piso da rampa
  encher(U0, 127, 157, 130, C);

  // ============================================================== o piso de concreto da rampa
  // (o fundo da rampa é o próprio chão: as curvas, os decks e a borda são a peça)
  encher(RU - 8, RV0 - 3, RU + 9, RV1 + 4, Bloco.CONCRETO);
  peca('rampa-skate', RU, (RV0 + RV1) / 2, DIR.s);

  // ============================================================== o suporte, os bancos, a BMX
  peca('suporte-skate', 160.2, 114.2, DIR.l);
  peca('banco', 158.5, 116.6, DIR.s, 21);
  peca('banco', 170.5, 116.6, DIR.s, 22);
  peca('banco', 159.5, 132.6, DIR.n, 23);
  peca('banco', 169.5, 132.6, DIR.n, 24);
  peca('bmx', 172.6, 134.4, DIR.o, 0);
  peca('lixeira', 167.8, 114.6, DIR.s, 10);
  peca('floreira', 156.4, 116.6, DIR.s, 2);
  peca('floreira', 172.6, 116.6, DIR.s, 0);
  poste(161, 112);
  poste(168, 112);
  poste(156, 135);
  poste(173, 135);

  // ============================================================== árvores e canteiros
  for (const [u, v, k] of [
    [154, 113, 0],
    [175, 113, 1],
    [153, 121, 2],
    [176, 122, 0],
    [154, 142, 1],
    [175, 143, 2],
    [164, 143, 0],
    [153, 136, 1],
  ] as const)
    arvore(u, v, k);
  for (const [u, v, w, d] of [
    [151, 111, 3, 1],
    [175, 111, 2, 1],
    [151, 145, 2, 1],
    [176, 145, 1, 1],
    [158, 140, 2, 2],
    [169, 139, 2, 2],
    [176, 128, 1, 3],
    [151, 116, 1, 3],
  ] as const)
    canteiro(u, v, w, d);

  // ============================================================== os pontos
  const rampa: RampaSkate = {
    x: X(RU) + 0.5,
    y: Y,
    z: Z((RV0 + RV1) / 2) + 0.5,
    z0: Z(RV0),
    z1: Z(RV1) + 1,
    ...MEDIDA_RAMPA,
  };
  return {
    pontos: {
      rampa,
      suporte: [X(160.2) + 0.5, Y, Z(114.2) + 0.5],
      lote: ret(U0, V0, U1, V1),
    },
    postos: {
      skatista: [X(162.1) + 0.5, Y, Z(115.4) + 0.5],
      bmx: [X(171.4) + 0.5, Y, Z(135.7) + 0.5],
    },
  };
}
