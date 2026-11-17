/**
 * O Parque de diversões da Vila Neon (spec 026, parte 2), no lote do nordeste do bairro (antes
 * um jardim cercado): o que é bloco (a cerca-viva, os caminhos, a pista coberta do bate-bate, o
 * pedestal do carrossel, o cercado da roda-gigante, as barracas de prendas, a fazendinha) e onde
 * fica cada peça que não é bloco (o arco da entrada, a roda, o carrossel, os carrinhos, a
 * pipoca, o algodão-doce, os balões). Puro e determinístico, como o resto do planejador.
 *
 * O mapa do lote (u de 122 a 178, v de 2 a 56; o norte em -v; a avenida passa ao sul):
 * - a **entrada** com o arco de lâmpadas no sul, a oeste (a 24 blocos de onde a criança nasce),
 *   e uma entradinha de lado, mais a leste;
 * - o **caminho da entrada** sobe até o **passeio** (de oeste a leste), e dele até o **bate-bate**
 *   (a pista coberta de malha, no noroeste);
 * - o **carrossel** a sudoeste do passeio; a **roda-gigante** ao norte dele, a leste, de frente
 *   para o bairro, com o laguinho atrás; as **barracas** (argola e pescaria) ao sul do passeio;
 * - a **fazendinha** no sudeste (cercado de madeira, fardos de feno e o cocho).
 */
import { Bloco } from './blocks';
import type { ParqueVila } from '../jogo/parque';
import type { PecaVila, RetanguloVila, TipoPecaVila } from './vilaNeon';

/** As ferramentas do planejador do bairro (`montarVila`). */
export interface FerramentasVila {
  X(u: number): number;
  Z(v: number): number;
  /** Os pés no chão do bairro. */
  Y: number;
  chao(u: number, v: number, id: number): void;
  b(u: number, y: number, v: number, id: number, meta?: number): void;
  encher(u0: number, v0: number, u1: number, v1: number, id: number): void;
  coluna(u: number, v: number, y0: number, y1: number, id: number): void;
  peca(
    tipo: TipoPecaVila,
    u: number,
    v: number,
    dir: number,
    n?: number,
    y?: number,
    ate?: [number, number, number],
  ): void;
  arvore(u: number, v: number, k?: number, alta?: number): void;
  poste(u: number, v: number): void;
  cercaViva(u0: number, v0: number, u1: number, v1: number): void;
  canteiro(u0: number, v0: number, w: number, d: number): void;
  ret(u0: number, v0: number, u1: number, v1: number): RetanguloVila;
  s(a: number, b: number, k: number): number;
}

/** O lote do parque no mapa. */
export const LOTE_PARQUE = { u0: 122, v0: 2, u1: 178, v1: 56 } as const;
/**
 * A pista do bate-bate no mapa: a mureta (de `u0` a `u1`, de `v0` a `v1`; a pista é o que fica
 * dentro) e onde fica a peça dela (as lâmpadas do teto e a mureta de borracha são desenhadas em
 * volta desse ponto).
 */
export const PISTA_BATE = { u0: 125, u1: 150, v0: 5, v1: 19, pu: 137, pv: 12 } as const;

type P3 = [number, number, number];

/** Os lugares do parque (mundo): os brinquedos de sentar, os de tocar e os da fase seguinte. */
export interface PontosParque extends ParqueVila {
  /** A entrada (o meio do arco, no chão). */
  entrada: P3;
  /** Os brinquedos de tocar: o carrinho de pipoca, o algodão-doce, os balões, as duas barracas. */
  pipoca: P3;
  algodao: P3;
  baloes: P3;
  argola: P3;
  pescaria: P3;
  /** A fazendinha: o miolo do cercado, o fardo de feno e o cocho (alvos das missões da fase B). */
  fazendinha: RetanguloVila;
  fardo: P3;
  cocho: P3;
  /**
   * Etapa B (f6): onde fica o balão fugido preso na árvore (o meio do balão, no vão do canto da
   * copa, do lado do caminho).
   */
  arvoreDoBalao: P3;
}

/** A árvore do balão fugido (entre o carrossel, as barracas e o caminho da fazendinha). */
const ARVORE_DO_BALAO = [152, 42] as const;

export interface ParqueMontado {
  pontos: PontosParque;
  postos: { pipoqueiro: P3; bate: P3; baloes: P3 };
  /** O laguinho (o chão desce 2). */
  lago: RetanguloVila;
}

const DIR = { s: 0, l: 1, n: 2, o: 3 } as const;

export function montarParque(f: FerramentasVila): ParqueMontado {
  const { X, Z, Y, chao, b, encher, coluna, peca, arvore, cercaViva, canteiro, ret, s } = f;
  const { u0: U0, v0: V0, u1: U1, v1: V1 } = LOTE_PARQUE;
  const C = Bloco.PEDRA_CREME;

  // ============================================================== a cerca-viva e as entradas
  cercaViva(U0, V0, U1, V0);
  cercaViva(U0, V1, U1, V1);
  cercaViva(U0, V0, U0, V1);
  cercaViva(U1, V0, U1, V1);
  // a entrada do arco (os dois postes dele ficam no lugar da cerca-viva) e a entradinha de lado
  for (let u = 130; u <= 135; u++) b(u, 1, V1, Bloco.AR);
  for (const u of [156, 157]) b(u, 1, V1, Bloco.AR);
  peca('arco-parque', 132.5, V1, DIR.s, 0);

  // ============================================================== os caminhos
  encher(131, 34, 134, 58, C);
  encher(156, 34, 157, 58, C);
  encher(125, 30, 173, 33, C);
  encher(131, 21, 134, 29, C);

  // ============================================================== o bate-bate (noroeste)
  // a pista escura cercada de grade, as colunas e o teto de malha com a barra de duas cores
  // (dono, 16 nov 2026: "aumentar a pista do bate-bate, deixar maior para o usuário poder guiar o
  // carrinho e bater no outro de fato": 24 por 13 blocos por dentro, do canto do lote até perto
  // do laguinho; a beira do sul fica onde estava, na ponta do caminho)
  const { u0: BU0, u1: BU1, v0: BV0, v1: BV1 } = PISTA_BATE;
  for (let u = BU0; u <= BU1; u++)
    for (let v = BV0; v <= BV1; v++) {
      chao(u, v, Bloco.PISO_PALCO);
      const beira = u === BU0 || u === BU1 || v === BV0 || v === BV1;
      if (beira) b(u, 1, v, Bloco.GRADE_FERRO);
    }
  // o tapete verde da saída, por dentro, na ponta do caminho (parar nele é descer)
  const TU0 = 131;
  const TU1 = 134;
  for (let u = TU0; u <= TU1; u++) for (let v = BV1 - 2; v < BV1; v++) chao(u, v, Bloco.LA_VERDE);
  // as colunas: os cantos, uma a cada cinco blocos nas beiras compridas e uma no meio das curtas
  for (let u = BU0; u <= BU1; u += 5) for (const v of [BV0, BV1]) coluna(u, v, 2, 5, Bloco.GRADE_FERRO);
  for (const u of [BU0, BU1]) coluna(u, (BV0 + BV1) >> 1, 2, 5, Bloco.GRADE_FERRO);
  for (let u = BU0 - 1; u <= BU1 + 1; u++)
    for (let v = BV0 - 1; v <= BV1 + 1; v++) {
      const beira = u === BU0 - 1 || u === BU1 + 1 || v === BV0 - 1 || v === BV1 + 1;
      // a barra do toldo em gomos de dois blocos, azul e branco (duas cores)
      const gomo = ((u === BU0 - 1 || u === BU1 + 1 ? v : u) >> 1) & 1;
      b(u, 6, v, beira ? (gomo ? Bloco.LA_AZUL : Bloco.LA_BRANCA) : Bloco.ALAMBRADO);
    }
  // a calçadinha em volta da pista
  for (let u = BU0 - 1; u <= BU1 + 1; u++) {
    chao(u, BV0 - 1, C);
    chao(u, BV1 + 1, C);
  }
  for (let v = BV0 - 1; v <= BV1 + 1; v++) {
    chao(BU0 - 1, v, C);
    chao(BU1 + 1, v, C);
  }
  peca('bate-bate', PISTA_BATE.pu, PISTA_BATE.pv, DIR.s, 0);
  // os carrinhos: os dos moradores espalhados pela pista; os das crianças estacionados na beira
  // do sul, dois de cada lado do tapete da saída, de frente para a pista
  const NA_BEIRA = Z(BV1) - 1.12;
  const bate: ParqueVila['bate'] = {
    x: (X(BU0 + 1) + X(BU1)) / 2,
    y: Y + 0.42,
    z: (Z(BV0 + 1) + Z(BV1)) / 2,
    x0: X(BU0 + 1),
    z0: Z(BV0 + 1),
    x1: X(BU1),
    z1: Z(BV1),
    vagas: [
      [X(130), Z(9), 1.2],
      [X(139), Z(12) + 0.5, -2.2],
      [X(145) + 0.5, Z(8) + 0.5, 2.6],
      [X(144), Z(15), -0.6],
      // (entre as colunas da beira, nunca atrás de uma: a câmera fica atrás do carrinho)
      [X(127) + 0.2, NA_BEIRA, Math.PI],
      [X(129) + 0.3, NA_BEIRA, Math.PI],
      [X(136) + 0.8, NA_BEIRA, Math.PI],
      [X(138) + 0.9, NA_BEIRA, Math.PI],
    ],
    tapete: { x0: X(TU0), z0: Z(BV1 - 2), x1: X(TU1 + 1), z1: Z(BV1) },
    saida: [X(133), Y, Z(21) + 0.5],
  };

  // ============================================================== a roda-gigante (leste)
  // o piso de pedra creme cercado de grade, aberto na frente (onde a cadeirinha passa embaixo)
  const RU = 160;
  const RV = 26;
  encher(151, 23, 169, 29, C);
  for (let u = 151; u <= 169; u++)
    for (let v = 23; v <= 29; v++) {
      const beira = u === 151 || u === 169 || v === 23 || v === 29;
      const vao = v === 29 && u >= 158 && u <= 162;
      if (beira && !vao) b(u, 1, v, Bloco.GRADE_FERRO);
    }
  peca('roda-gigante', RU, RV, DIR.s, 0);
  const roda: ParqueVila['roda'] = {
    x: X(RU) + 0.5,
    y: Y + 9.55,
    z: Z(RV) + 0.5,
    raio: 7.5,
    eixo: 'x',
    saida: [X(RU) + 0.5, Y, Z(31)],
  };

  // ============================================================== o carrossel (sudoeste)
  // o pedestal de blocos (o aro vermelho) e o calçamento em volta; o resto gira (a tela)
  const CU = 142;
  const CV = 43;
  for (let u = CU - 9; u <= CU + 9; u++)
    for (let v = CV - 9; v <= CV + 9; v++) {
      const d = Math.hypot(u - CU, v - CV);
      if (d <= 8.3) chao(u, v, C);
      if (d <= 5.6) b(u, 1, v, d > 4.6 ? Bloco.LA_VERMELHA : Bloco.CONCRETO);
    }
  encher(141, 34, 143, 35, C);
  peca('carrossel', CU, CV, DIR.s, 0);
  const carrossel: ParqueVila['carrossel'] = {
    x: X(CU) + 0.5,
    y: Y + 2.3,
    z: Z(CV) + 0.5,
    raio: 3.7,
    beira: 6.1,
  };

  // ============================================================== a pipoca e o algodão-doce
  // (ao norte do passeio, de frente para ele)
  peca('pipoca', 138, 28, DIR.s);
  peca('algodao', 144, 28, DIR.s, 0);
  chao(138, 29, C);
  chao(144, 29, C);

  // ============================================================== as barracas de prendas
  // (ao sul do passeio, o balcão de frente para ele): de tábuas, com o toldo de duas cores
  const barraca = (bu: number, bv: number, toldo: number, tipo: TipoPecaVila) => {
    for (let u = bu; u < bu + 6; u++)
      for (let v = bv; v < bv + 4; v++) {
        const borda = u === bu || u === bu + 5 || v === bv || v === bv + 3;
        const frente = v === bv && u > bu && u < bu + 5;
        chao(u, v, Bloco.TABUAS);
        if (borda && !frente) coluna(u, v, 1, 3, Bloco.TABUAS);
        if (frente) b(u, 1, v, Bloco.TABUAS);
        b(u, 4, v, (u - bu) & 1 ? Bloco.LA_BRANCA : toldo);
      }
    // a aba do toldo na frente
    for (let u = bu; u < bu + 6; u++) b(u, 4, bv - 1, (u - bu) & 1 ? Bloco.LA_BRANCA : toldo);
    peca(tipo, bu + 2.5, bv + 1.5, DIR.n, 0);
  };
  barraca(149, 35, Bloco.LA_VERMELHA, 'barraca-argola');
  barraca(159, 35, Bloco.LA_AZUL, 'barraca-pesca');
  encher(149, 34, 154, 34, C);
  encher(159, 34, 164, 34, C);

  // ============================================================== a vendedora de balões
  peca('baloes', 137, 52, DIR.o, 0);
  chao(136, 52, C);
  chao(135, 52, C);
  chao(137, 52, C);

  // ============================================================== a fazendinha (sudeste)
  // o cercado de madeira com a porteira, o chão de terra batida num canto, os fardos e o cocho
  const FU0 = 165;
  const FU1 = 176;
  const FV0 = 42;
  const FV1 = 53;
  for (let u = FU0; u <= FU1; u++)
    for (let v = FV0; v <= FV1; v++) {
      const beira = u === FU0 || u === FU1 || v === FV0 || v === FV1;
      // (a entrada aberta no fim do caminho: as lhamas moram ali e não saem)
      const entrada = u === FU0 && (v === 47 || v === 48);
      if (beira && !entrada) b(u, 1, v, Bloco.CERCA);
      else if (!beira && s(u, v, 61) < 0.22) chao(u, v, Bloco.TERRA);
    }
  encher(158, 47, 165, 48, C);
  // os fardos de feno: um monte no canto e a pilha do lado de fora, na beira do caminho (o alvo
  // "feno para o cocho" da fase seguinte)
  for (const [u, y, v] of [
    [174, 1, 51],
    [175, 1, 51],
    [175, 1, 52],
    [175, 2, 51],
    [163, 1, 45],
    [163, 1, 44],
    [162, 1, 45],
    [163, 2, 45],
  ])
    b(u, y, v, Bloco.FENO);
  peca('cocho', 167, 51, DIR.n, 0);
  // o abrigo das lhamas: quatro esteios e o telhadinho de telha
  for (const [u, v] of [
    [172, 44],
    [175, 44],
    [172, 46],
    [175, 46],
  ])
    coluna(u, v, 1, 2, Bloco.CERCA);
  for (let u = 171; u <= 176; u++) for (let v = 43; v <= 47; v++) b(u, 3, v, Bloco.TELHA_COLONIAL);

  // ============================================================== o laguinho (atrás da roda)
  const lago = ret(156, 12, 168, 20);
  for (let u = 156; u <= 168; u++)
    for (let v = 12; v <= 20; v++) {
      const dx = (u - 162) / 6.5;
      const dz = (v - 16) / 4.5;
      if (dx * dx + dz * dz <= 1) {
        chao(u, v, Bloco.AREIA_BRUMA);
        b(u, -1, v, Bloco.AGUA);
        b(u, 0, v, Bloco.AGUA);
      } else if (dx * dx + dz * dz <= 1.45) chao(u, v, Bloco.PEDRA_LISA);
    }

  // ============================================================== bancos, lixeiras e flores
  peca('banco', 128, 29, DIR.s, 30);
  peca('banco', 148, 29, DIR.s, 31);
  peca('banco', 146, 34, DIR.n, 32);
  peca('banco', 171, 34, DIR.n, 33);
  peca('banco', 130, 44, DIR.l, 34);
  peca('banco', 162, 50, DIR.l, 35);
  peca('banco', 136, 22, DIR.o, 36);
  peca('lixeira', 135, 34, DIR.n, 20);
  peca('lixeira', 155, 34, DIR.n, 21);
  peca('lixeira', 136, 29, DIR.s, 22);
  canteiro(128, 34, 2, 1);
  canteiro(136, 54, 3, 1);
  canteiro(126, 54, 3, 1);
  canteiro(153, 54, 2, 1);
  canteiro(159, 54, 3, 1);
  canteiro(125, 28, 2, 1);
  canteiro(170, 36, 3, 1);
  canteiro(166, 34, 3, 1);
  // (fora da calçadinha da pista: é nela que a criança pisa ao descer do carrinho)
  canteiro(136, 21, 1, 1);
  canteiro(129, 21, 1, 1);
  // os postes de luz do passeio e do caminho da entrada
  for (const [u, v] of [
    [130, 46],
    [134, 38],
    [130, 34],
    [137, 34],
    [150, 29],
    [158, 34],
    [172, 29],
    [130, 24],
    [135, 24],
    [155, 50],
    [163, 46],
  ])
    f.poste(u, v);
  // os varais de lâmpadas por cima do caminho da entrada (de poste alto a poste alto)
  for (const [v, n] of [
    [53, 0],
    [49, 1],
  ] as const) {
    coluna(130, v, 1, 5, Bloco.GRADE_FERRO);
    coluna(135, v, 1, 5, Bloco.GRADE_FERRO);
    peca('varal-lampadas', 130, v, DIR.l, n, 5, [135, 5, v]);
  }

  // ============================================================== as árvores do jogo
  // nos gramados (longe dos caminhos, dos brinquedos e da frente da roda: a vista do bairro)
  // (o canto do noroeste é todo da pista do bate-bate)
  for (const [u, v, alta] of [
    [154, 5, 0],
    [158, 6, 1],
    [166, 6, 0],
    [172, 8, 1],
    [175, 15, 0],
    [174, 22, 0],
    [175, 30, 1],
    [175, 37, 0],
    [149, 24, 0],
    [145, 24, 0],
    [124, 24, 0],
    [125, 37, 0],
    [126, 44, 1],
    [125, 50, 0],
    [142, 53, 0],
    [148, 53, 1],
    [151, 49, 0],
    [160, 53, 0],
    [152, 42, 0],
    [169, 38, 0],
  ])
    arvore(u, v, 1, alta);

  const p3 = (u: number, v: number, y = 0): P3 => [X(u) + 0.5, Y + y, Z(v) + 0.5];
  return {
    pontos: {
      roda,
      carrossel,
      bate,
      entrada: [X(132.5) + 0.5, Y, Z(V1) + 0.5],
      pipoca: p3(138, 28),
      algodao: p3(144, 28),
      baloes: p3(137, 52),
      argola: [X(151.5) + 0.5, Y, Z(36.5) + 0.5],
      pescaria: [X(161.5) + 0.5, Y, Z(36.5) + 0.5],
      fazendinha: ret(FU0 + 1, FV0 + 1, FU1 - 1, FV1 - 1),
      fardo: p3(163, 45, 2),
      cocho: p3(167, 51),
      // (a mesma conta do tronco de `arvore` com k = 1: o balão fica no vão do canto de baixo da
      // copa, do lado do caminho)
      arvoreDoBalao: (() => {
        const [u, v] = ARVORE_DO_BALAO;
        const tronco = (s(u, v, 12) > 0.78 ? 5 : 4) + Math.floor(s(u, v, 12) * 2);
        return [X(u) + 0.5 + 2.1, Y + tronco - 1.2, Z(v) + 0.5 + 2.1] as P3;
      })(),
    },
    postos: {
      pipoqueiro: p3(141, 28),
      bate: p3(130, 21),
      baloes: p3(136, 51),
    },
    lago,
  };
}
