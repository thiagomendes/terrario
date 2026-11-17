/**
 * A Casa anos 80 por dentro (spec 026, parte 3), no lote da Rua anos 80 entre a locadora e a
 * lanchonete: o que é bloco (o chão de tábua, as paredes de reboco com janelas, a porta aberta, a
 * parede do meio com a passagem larga, o telhado em degraus) e onde fica cada peça da sala e do
 * quarto de brinquedos (desenhadas pela tela em `render/vila/casa.ts`; aqui só o lugar, que também
 * dá a colisão de cada uma). Puro e determinístico, como o resto do planejador.
 *
 * O mapa do lote (u de 43 a 62, v de 36 a 57; a frente da casa olha para o sul, para a calçada):
 * - o **quintal da frente** (v 54 a 57): muro baixo, o portãozinho aberto, o caminho de pedra até
 *   a porta e os canteiros;
 * - a **sala** (u 44 a 54, v 37 a 52): a TV de tubo na parede do fundo, o sofá xadrez de frente
 *   para ela, o tapete no meio, o toca-discos na parede do oeste, a estante de fitas, o abajur, o
 *   telefone de disco, o relógio, a planta e as cortinas;
 * - o **quarto de brinquedos** (u 56 a 61), pela passagem larga da parede do meio (v 43 a 45): o
 *   tapete de quebra-cabeça, o ioiô no suporte, o pião, o cubo de cores 2 × 2, o robô de lata, a
 *   bola e o baú de brinquedos.
 *
 * **A câmera lá dentro** (o risco maior da parte 3): o telhado some (a tela encolhe os blocos dele
 * quando a criança entra) e a câmera sobe por cima das paredes, olhando a casa de cima, como uma
 * casinha de bonecas. Por isso o telhado é baixo e nada mais do bairro passa pela caixa do corte.
 */
import { Bloco } from './blocks';
import type { FerramentasVila } from './vilaParque';
import type { RetanguloVila } from './vilaNeon';

type P3 = [number, number, number];

/** O lote da casa no mapa (o quintal da frente incluído). */
export const LOTE_CASA = { u0: 43, v0: 36, u1: 62, v1: 57 } as const;
/** A frente da casa (a parede da porta) e o fundo. */
const V_FRENTE = 53;
const V_FUNDO = 36;
/** As paredes têm cinco blocos de altura (um teto alto: a câmera sobe por cima delas). */
export const ALTURA_PAREDE_CASA = 5;
/** A parede do meio (sala a oeste, quarto a leste) e a passagem larga nela. */
const U_MEIO = 55;
const PASSAGEM = [43, 45] as const;
/** A porta da frente (dois blocos de largura, três de altura) e o portãozinho do muro. */
const PORTA = [52, 53] as const;

/** Um assento do sofá (mundo): o meio dele, em cima da almofada. */
export interface AssentoSofa {
  x: number;
  y: number;
  z: number;
}

/** Os lugares da casa (mundo). */
export interface PontosCasa {
  /** O lado de fora da porta (no caminho do quintal): a trilha do guia passa por aqui. */
  porta: P3;
  /** Por dentro: a casa inteira, a sala e o quarto (o chão; a parede não entra). */
  dentro: RetanguloVila;
  sala: RetanguloVila;
  quarto: RetanguloVila;
  /** O chão (os pés) e a altura das paredes. */
  y: number;
  /**
   * O corte do telhado: a caixa (com o beiral) e a altura do primeiro bloco que some (mundo).
   * Tudo o que fica ali dentro, desta altura para cima, é do telhado da casa.
   */
  corte: RetanguloVila & { y: number };
  /**
   * As paredes que somem entre a câmera e a criança, lá dentro: a da frente (sul), a do fundo
   * (norte), a do oeste, a do leste e a do meio (as células de cada uma, no chão).
   */
  paredes: [RetanguloVila, RetanguloVila, RetanguloVila, RetanguloVila, RetanguloVila];
  /**
   * Os vãos sem a fileira de pedra (a porta e a passagem do meio): a parede cortada ali deita
   * até o chão, não até a pedra.
   */
  vaos: [RetanguloVila, RetanguloVila];
  /** A TV (o pé do móvel, no chão) e o meio da tela. */
  tv: P3;
  tela: P3;
  /** O toca-discos (o pé do móvel) e o meio do prato. */
  discos: P3;
  prato: P3;
  /** O telefone de disco (o pé da mesinha) e o aparelho em cima dela. */
  telefone: P3;
  fone: P3;
  /** O sofá: o meio, o rumo (yaw: para onde quem senta olha) e os três assentos (0 é da vovó). */
  sofa: { x: number; z: number; yaw: number; assentos: AssentoSofa[] };
  /** Na frente da vovó (o alvo do guia na f8). */
  vovo: P3;
  /** Os brinquedos do quarto (o meio de cada um, no chão onde ele pisa). */
  ioio: P3;
  piao: P3;
  cubo: P3;
  robo: P3;
  bola: P3;
  bau: P3;
  /** O robô anda dois passos para lá e dois para cá: a outra ponta. */
  roboAte: P3;
  /**
   * Parte 3B (f10, arrumar o quarto): onde ficam espalhados o ioiô (no quintal), o pião (na sala,
   * atrás do sofá) e o cubo (no canto do quarto), no chão, na ordem do baú.
   */
  espalhados: [P3, P3, P3];
  /** Parte 3B (f12): a mesinha do bolo de fubá do lado da vovó (o pé, no chão) e o meio do bolo. */
  mesaBolo: P3;
  bolo: P3;
}

export interface CasaMontada {
  pontos: PontosCasa;
  /** A vovó (no assento 0 do sofá). */
  avo: P3;
}

const DIR = { s: 0, l: 1, n: 2, o: 3 } as const;
/** O meio da tela da TV e do prato do toca-discos, no referencial da peça (o desenho usa os mesmos). */
export const TELA_TV = [-0.12, 1.17, 0.46] as const;
export const PRATO = [-0.3, 0.8, 0.02] as const;
/** Um ponto no referencial de uma peça (x para a direita de quem olha a frente, z para a frente). */
function local(p: P3, dir: number, x: number, y: number, z: number): P3 {
  const a = (dir & 3) * (Math.PI / 2);
  const c = Math.round(Math.cos(a));
  const s = Math.round(Math.sin(a));
  return [p[0] + x * c + z * s, p[1] + y, p[2] - x * s + z * c];
}
/** A altura da almofada do sofá (onde se senta). */
export const ALTURA_ASSENTO = 0.5;
/** O sofá: o comprimento e de quanto em quanto ficam os assentos. */
export const SOFA = { largura: 3.3, fundura: 1.0, passo: 1.05 } as const;
/** Parte 3B: onde fica a mesinha do bolo (u do lote) e a que altura fica o meio do bolo. */
const U_MESA_BOLO = 51.36;
export const ALTURA_BOLO = 0.74;

export function montarCasa80(f: FerramentasVila): CasaMontada {
  const { X, Z, Y, chao, b, peca, ret } = f;
  const { u0: U0, u1: U1, v1: V1 }: Record<'u0' | 'u1' | 'v1', number> = LOTE_CASA;
  const H = ALTURA_PAREDE_CASA;
  const PAREDE = Bloco.REBOCO_AMARELO;
  const MEIO = Bloco.REBOCO_MENTA;

  // ============================================================== o quintal da frente
  for (let u = U0; u <= U1; u++)
    for (let v = V_FRENTE + 1; v <= V1; v++) {
      const caminho = u === PORTA[0] || u === PORTA[1];
      chao(u, v, caminho ? Bloco.PEDRA_CREME : Bloco.TERRA_MUSGOSA);
      const muro = v === V1 || u === U0 || u === U1;
      if (muro && !(v === V1 && caminho)) b(u, 1, v, Bloco.PEDRA_CREME);
    }
  // os canteiros de flor ao longo do muro e da parede (fora do caminho)
  for (let u = U0 + 1; u < U1; u++) {
    if (u >= PORTA[0] - 1 && u <= PORTA[1] + 1) continue;
    chao(u, V1 - 1, Bloco.TERRA);
    if ((u + 1) % 2) b(u, 1, V1 - 1, Bloco.FLOR);
  }
  for (const u of [U0 + 1, U0 + 2, U1 - 2, U1 - 1]) {
    chao(u, V_FRENTE + 1, Bloco.TERRA);
    b(u, 1, V_FRENTE + 1, Bloco.FLOR);
  }
  // a cerca-viva baixa de um lado do quintal
  for (let v = V_FRENTE + 1; v < V1 - 1; v++) b(U1 - 1, 1, v, Bloco.FOLHAGEM);
  peca('caixa-correio', PORTA[1] + 1.4, V1 + 0.6, DIR.s, 2);
  peca('casinha-cachorro', U0 + 3, V_FRENTE + 2.4, DIR.l, 2);

  // ============================================================== a casa
  const naParede = (u: number, v: number) =>
    u === U0 || u === U1 || v === V_FRENTE || v === V_FUNDO;
  // as janelas: [u, v] de cada coluna de vidro (duas de largura, nas alturas 2 e 3)
  const janelas = new Set<string>(
    [
      // a frente: duas na sala, uma no quarto
      [45, V_FRENTE],
      [46, V_FRENTE],
      [48, V_FRENTE],
      [49, V_FRENTE],
      [58, V_FRENTE],
      [59, V_FRENTE],
      // o oeste (a sala) e o leste (o quarto)
      [U0, 39],
      [U0, 40],
      [U0, 47],
      [U0, 48],
      [U1, 40],
      [U1, 41],
      [U1, 48],
      [U1, 49],
      // o fundo, só no quarto (na sala a TV fica nessa parede)
      [58, V_FUNDO],
      [59, V_FUNDO],
    ].map(([u, v]) => `${u},${v}`),
  );
  for (let u = U0; u <= U1; u++)
    for (let v = V_FUNDO; v <= V_FRENTE; v++) {
      // o chão de tábua (a clara de bétula ficava cinza na luz de dentro)
      chao(u, v, Bloco.TABUAS);
      if (naParede(u, v)) {
        const porta = v === V_FRENTE && (u === PORTA[0] || u === PORTA[1]);
        for (let y = 1; y <= H; y++) {
          let id: number = y === 1 ? Bloco.TIJOLOS_PEDRA : PAREDE;
          if ((y === 2 || y === 3) && janelas.has(`${u},${v}`)) id = Bloco.JANELA;
          if (porta && y <= 3) id = Bloco.AR;
          if (id !== Bloco.AR) b(u, y, v, id);
        }
      } else if (u === U_MEIO) {
        // a parede do meio, com a passagem larga (quatro de altura)
        const passa = v >= PASSAGEM[0] && v <= PASSAGEM[1];
        // (a fileira de baixo de pedra, como a das paredes de fora: lá dentro a de cima some e
        // a de pedra fica, a mesma "parede cortada" em toda a casa)
        for (let y = passa ? 5 : 1; y <= H; y++) b(u, y, v, y === 1 ? Bloco.TIJOLOS_PEDRA : MEIO);
      }
    }
  // o telhado de duas águas em degraus (um degrau a cada dois blocos: baixo, para o corte)
  // a cumeeira ao longo da rua; as empenas de reboco nos lados
  const fundo = V_FRENTE - V_FUNDO + 1;
  const meio = Math.ceil(fundo / 2);
  const TELHA = Bloco.TELHA_COLONIAL;
  for (let k = 0; k <= meio; k++) {
    const y = H + 1 + (k >> 1);
    for (let u = U0 - 1; u <= U1 + 1; u++) {
      b(u, y, V_FRENTE + 1 - k, TELHA);
      b(u, y, V_FUNDO - 1 + k, TELHA);
    }
  }
  for (let v = V_FUNDO; v <= V_FRENTE; v++)
    for (const u of [U0, U1]) {
      const k = Math.min(v - V_FUNDO + 1, V_FRENTE - v + 1);
      for (let y = H + 1; y < H + 1 + (k >> 1); y++) b(u, y, v, PAREDE);
    }
  const topoTelhado = H + 1 + (meio >> 1);

  // ============================================================== a sala (as peças)
  // (a tela desenha cada uma; aqui o lugar e o rumo, que também dão a colisão)
  const SX = 49; // o meio da sala de oeste a leste, para a TV, o tapete e o sofá
  const vSofa = 45;
  peca('casa-tv', SX, 36.82, DIR.s);
  peca('casa-fitas', 53.4, 36.75, DIR.s);
  peca('casa-planta', 44.1, 37.1, DIR.s);
  peca('casa-relogio', 46.5, 36.55, DIR.s, 0, 2.75);
  peca('casa-tapete', SX, 41.2, DIR.s);
  peca('casa-sofa', SX, vSofa, DIR.n);
  peca('casa-abajur', 46.6, vSofa, DIR.n);
  peca('casa-telefone', 52.35, vSofa, DIR.n);
  peca('casa-discos', 43.85, 41.2, DIR.l);
  // parte 3B: a mesinha redonda do bolo de fubá, entre o braço do sofá do lado da vovó e a
  // mesinha do telefone (a f12: ela dá uma fatia dali)
  peca('casa-bolo', U_MESA_BOLO, vSofa - 0.1, DIR.n);
  // as cortinas das janelas da frente da sala (por dentro) e a do oeste
  peca('casa-cortina', 45.5, 52.5, DIR.n, 0, 0);
  peca('casa-cortina', 48.5, 52.5, DIR.n, 1, 0);
  peca('casa-cortina', 43.5, 47.5, DIR.l, 2, 0);
  // o capacho na porta, do lado de dentro
  peca('casa-capacho', 52.5, 51.6, DIR.n);

  // ============================================================== o quarto de brinquedos
  peca('casa-quebra-cabeca', 58.5, 41.5, DIR.o);
  peca('casa-ioio', 60.55, 38.1, DIR.o);
  peca('casa-piao', 57.9, 41.0, DIR.o);
  peca('casa-cubo', 59.35, 42.35, DIR.o);
  peca('casa-robo', 59.6, 47.2, DIR.o);
  peca('casa-bola', 57.2, 49.6, DIR.o);
  peca('casa-bau', 61.25, 45.0, DIR.o);
  peca('casa-cortina', 58.5, 52.5, DIR.n, 3, 0);

  // ============================================================== os pontos
  const P = (u: number, v: number, y = 0): P3 => [X(u) + 0.5, Y + y, Z(v) + 0.5];
  const sx = X(SX) + 0.5;
  const sz = Z(vSofa) + 0.5;
  // o sofá olha para o norte (a TV): os assentos de leste a oeste (o 0, da vovó, no leste)
  const assentos: AssentoSofa[] = [1, 0, -1].map((k) => ({
    x: sx + k * SOFA.passo,
    y: Y + ALTURA_ASSENTO,
    // (para a frente do meio: as costas e as almofadas do encosto ficam atrás)
    z: sz - 0.2,
  }));
  const tv = P(SX, 36.82);
  const discos = P(43.85, 41.2);
  const telefone = P(52.35, vSofa);
  const robo = P(59.6, 47.2);
  const avo: P3 = [assentos[0].x, assentos[0].y, assentos[0].z];
  const pontos: PontosCasa = {
    porta: P(PORTA[0] + 0.5, V_FRENTE + 2),
    dentro: ret(U0 + 1, V_FUNDO + 1, U1 - 1, V_FRENTE - 1),
    sala: ret(U0 + 1, V_FUNDO + 1, U_MEIO - 1, V_FRENTE - 1),
    quarto: ret(U_MEIO + 1, V_FUNDO + 1, U1 - 1, V_FRENTE - 1),
    y: Y,
    corte: { ...ret(U0 - 1, V_FUNDO - 1, U1 + 1, V_FRENTE + 1), y: Y + H },
    paredes: [
      ret(U0, V_FRENTE, U1, V_FRENTE),
      ret(U0, V_FUNDO, U1, V_FUNDO),
      ret(U0, V_FUNDO, U0, V_FRENTE),
      ret(U1, V_FUNDO, U1, V_FRENTE),
      ret(U_MEIO, V_FUNDO + 1, U_MEIO, V_FRENTE - 1),
    ],
    vaos: [ret(PORTA[0], V_FRENTE, PORTA[1], V_FRENTE), ret(U_MEIO, PASSAGEM[0], U_MEIO, PASSAGEM[1])],
    tv,
    // (a tela da TV: no alto do móvel, na frente da caixa de madeira; o mesmo desenho da tela)
    tela: local(tv, DIR.s, TELA_TV[0], TELA_TV[1], TELA_TV[2]),
    discos,
    prato: local(discos, DIR.l, PRATO[0], PRATO[1], PRATO[2]),
    telefone,
    fone: local(telefone, DIR.n, 0, 0.72, 0),
    sofa: { x: sx, z: sz, yaw: Math.PI, assentos },
    vovo: [assentos[0].x, Y, assentos[0].z - 1.5],
    ioio: P(60.55, 38.1),
    piao: P(57.9, 41.0),
    cubo: P(59.35, 42.35),
    robo,
    roboAte: [robo[0] - 1.3, robo[1], robo[2]],
    bola: P(57.2, 49.6),
    bau: P(61.25, 45.0),
    espalhados: [P(57.5, 55.3), P(48.6, 48.9), P(57.7, 51.1)],
    mesaBolo: P(U_MESA_BOLO, vSofa - 0.1),
    bolo: P(U_MESA_BOLO, vSofa - 0.1, ALTURA_BOLO),
  };
  void topoTelhado;
  return { pontos, avo };
}
