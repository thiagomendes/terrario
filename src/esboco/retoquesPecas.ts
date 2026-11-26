/**
 * Esboço da spec 038 "Retoques e a moto dourada" (só com `?esboco=retoques`): as peças.
 *
 * - **A moto dourada**, em duas versões, no traço dos brinquedos de andar da 036 (`Pecas` do
 *   `bonecoPremium`, na junta `prancha`, no nó `brinquedo`, com as rodas em nós que giram):
 *   - `motoca` (a recomendada): a motoquinha de criança, gordinha, com rodinhas de apoio, os pés
 *     nos apoios;
 *   - `triciclo`: a motoca de pedal de três rodas, com os pedais na roda da frente.
 * - **Os pés no pedal:** a perna ganha um joelho (a canela e o sapato num nó dentro da perna), e
 *   a bicicletinha e o carrinho de pedal ganham a medida que deixa o pé alcançar o pedal (o
 *   pedal mais perto do quadril e a pedivela mais curta). A conta do joelho fica em `retoques.ts`.
 * - **O tênis de 20 moedinhas** e **a camiseta de aquário**, cada um em duas versões novas.
 *
 * Tudo aqui sai do código quando a spec ficar pronta (a spec leva o escolhido para
 * `brinquedoAndar.ts`, `bonecoPremium.ts` e `premiumLuzes.ts`).
 */
import type { Junta, Peca, PlanoBoneco, SubjuntaPremium } from '../personagem/boneco';
import { Pecas, misturarCor } from '../personagem/bonecoPremium';
import { perfilEstrela, perfilFolha } from '../personagem/bonecoFantasia';
import type { Peixe } from '../render/premiumLuzes';

export type V3 = [number, number, number];

// ------------------------------------------------------------------ o que o esboço mostra
export type IdMoto = 'motoca' | 'triciclo';
export type IdPedal = 'bici' | 'carrinho';
export type IdTenis = 'hoje' | 'violeta' | 'noite';
export type IdCamiseta = 'hoje' | 'bolinhas' | 'cavalinho';

export interface Versao {
  id: string;
  nome: string;
  preco?: number;
  porque: string;
}

export const MOTOS: readonly Versao[] = [
  {
    id: 'motoca',
    nome: 'Motoquinha dourada',
    preco: 140,
    porque:
      'a moto de brinquedo que a criança reconhece de longe (tanque, farol redondo, guidão alto e escapamento), gordinha e baixa, com rodinhas de apoio de criança; os pés descansam nos apoios',
  },
  {
    id: 'triciclo',
    nome: 'Motoca de pedal',
    preco: 120,
    porque:
      'a motoca de três rodas das crianças pequenas, com a frente de moto (farol e carenagem dourada); a criança pedala de verdade na roda da frente',
  },
];

export const TENIS: readonly Versao[] = [
  { id: 'hoje', nome: 'Hoje', porque: 'o cano do violeta ao rosa, a língua amarela, a faixa do ouro ao azul e a cauda amarela e azul: perto de arco-íris' },
  {
    id: 'violeta',
    nome: 'Violeta e ouro',
    porque: 'o mesmo tênis que a criança comprou, só com duas cores: o cano violeta inteiro, e o ouro na faixa, na estrela e na cauda do cometa (sem rosa e sem azul)',
  },
  {
    id: 'noite',
    nome: 'Azul-noite e prata',
    porque: 'o cometa numa noite: o cano azul-noite, a estrela e a cauda de prata e a faixa de pérola (só azul e branco)',
  },
];

export const CAMISETAS: readonly Versao[] = [
  { id: 'hoje', nome: 'Hoje', porque: 'o peixe laranja de listras brancas na frente do peito pode lembrar um personagem de filme conhecido' },
  {
    id: 'bolinhas',
    nome: 'Peixinhos de bolinhas',
    porque: 'o mesmo aquário (água, sol, algas, areia e bolhas); sai o peixe de listras e entra um amarelinho de bolinhas brancas; nenhum peixe tem listra',
  },
  {
    id: 'cavalinho',
    nome: 'Cavalinho-marinho',
    porque: 'o mesmo aquário, com um cavalinho-marinho coral de barriga creme na frente do peito e um cardume de peixinhos redondos em volta',
  },
];

// ------------------------------------------------------------------ peças
const J: Junta = 'prancha';
const sj = (nome: string) => nome as SubjuntaPremium;
/** O nó do brinquedo (o mesmo da 036). */
const NO = { subjunta: { nome: sj('brinquedo'), pivo: [0, 0, 0] as V3 } };
/** Um nó que gira dentro do brinquedo (as rodas, o pedal). */
const giro = (nome: string, pivo: V3) => ({ subjunta: { nome: sj(nome), pivo, pai: sj('brinquedo') } });

/** Um tubo (cilindro) de `a` até `b`, no nó do brinquedo (a mesma conta da 036). */
function tubo(P: Pecas, nome: string, a: V3, b: V3, r: number, cor: string, extra: Partial<Peca> = NO): void {
  const d: V3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const l = Math.hypot(d[0], d[1], d[2]);
  const n: V3 = [d[0] / l, d[1] / l, d[2] / l];
  const rz = -Math.asin(Math.max(-1, Math.min(1, n[0])));
  const rx = Math.atan2(n[2], n[1]);
  P.cone(nome, J, undefined, l, r, r, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2], cor, { rot: [rx, 0, rz], ...extra });
}

/** Um cilindro deitado no eixo x (rodas, eixos, pedais redondos). */
const deitado = { rot: [0, 0, Math.PI / 2] as V3 };

/**
 * Como a criança fica em cada brinquedo do esboço (no espaço da prancha, antes da escala do
 * boneco): a altura do assento, onde as mãos fecham, onde os pés vão e as rodas que giram.
 */
export interface Montagem {
  /** O topo do assento (o fundo do quadril encosta nele). */
  assentoY: number;
  /** O tronco um tico para a frente (rad). */
  troncoX: number;
  maos: { E: V3; D: V3 };
  pes:
    | {
        tipo: 'pedal';
        /** O eixo do pedal (y, z), o raio da pedivela, o x de cada pedal e o raio do pedal redondo. */
        eixo: [number, number];
        raio: number;
        x: number;
        raioPedal: number;
        /** O nó que gira e quanto ele gira por bloco andado (rad). */
        no: string;
        porBloco: number;
      }
    | { tipo: 'apoio'; E: V3; D: V3 };
  rodas: Array<{ no: string; porBloco: number }>;
  /** O raio da sombra no chão e o quanto ela estica para a frente. */
  sombra: [number, number];
}

const ESCALA = 1.15;

// ------------------------------------------------------------------ a motoquinha dourada
// (o ouro: um amarelo mais quente e mais fundo que o amarelo de brinquedo, com o reflexo
// lustroso, e o ouro escuro nas partes de baixo; nada acende: é brilho de plástico, contido)
const OURO = '#e8b03c';
const OURO_ESC = '#c4871f';
const OURO_CLARO = '#ffd97a';
const CREME = '#fff3da';
const PNEU = '#3a3644';
const PRATA = '#cfc8bc';
const CORAL = '#ff8a7a';

/** Uma roda gordinha de moto: o pneu, a calota dourada e as marquinhas que mostram o giro. */
function rodaMoto(P: Pecas, nome: string, no: string, c: V3, r: number, largura: number, xs: number[] = [0]): void {
  const g = giro(no, c);
  for (const x of xs) {
    P.cone(`${nome}-pneu${x}`, J, undefined, largura, r, r, [x, 0, 0], PNEU, { ...deitado, ...g });
    P.cone(`${nome}-calota${x}`, J, undefined, largura + 0.008, r * 0.56, r * 0.56, [x, 0, 0], OURO_CLARO, { ...deitado, brilho: 0.8, ...g });
    const fora = largura / 2 + 0.006;
    for (const s of x === 0 ? [-1, 1] : [Math.sign(x)]) {
      P.bola(`${nome}-miolo${x}${s}`, J, undefined, r * 0.2, [x + s * fora, 0, 0], OURO_ESC, [0.45, 1, 1], g);
      P.bola(`${nome}-marca${x}${s}`, J, undefined, r * 0.09, [x + s * fora, r * 0.36, 0], '#ffffff', [0.5, 1, 1], g);
    }
  }
}

function motoca(P: Pecas): Montagem {
  const R = 0.2;
  const tras: V3 = [0, R, -0.4];
  const frente: V3 = [0, R, 0.5];
  // o motor (a barriga da moto) e o quadro que leva até a roda de trás
  P.caixa('moto-motor', J, undefined, [0.2, 0.2, 0.38], [0, 0.32, 0.06], OURO_ESC, 0.08, { brilho: 0.45, ...NO });
  for (const s of [-1, 1]) {
    P.bola(`moto-cilindro${s}`, J, undefined, 0.075, [s * 0.1, 0.3, 0.1], PRATA, [0.6, 1, 1], { brilho: 0.8, ...NO });
    tubo(P, `moto-balanca${s}`, [s * 0.075, 0.3, -0.06], [s * 0.075, R, tras[2]], 0.026, OURO_ESC);
  }
  // o tanque gordinho na frente do banco, com a estrela de cada lado
  P.caixa('moto-tanque', J, undefined, [0.24, 0.17, 0.3], [0, 0.5, 0.27], OURO, 0.08, { brilho: 0.8, rot: [-0.12, 0, 0], ...NO });
  P.caixa('moto-tanque-tampa', J, undefined, [0.07, 0.025, 0.07], [0, 0.6, 0.24], OURO_CLARO, 0.02, { brilho: 0.8, ...NO });
  for (const s of [-1, 1])
    P.placa(`moto-estrela${s}`, J, undefined, perfilEstrela(0.06), 0.012, [s * 0.122, 0.5, 0.28], CREME, { rot: [0, (s * Math.PI) / 2, 0], ...NO });
  // o banco creme comprido e a rabeta dourada com a lanterninha
  P.caixa('moto-banco', J, undefined, [0.24, 0.08, 0.46], [0, 0.48, -0.08], CREME, 0.04, NO);
  P.caixa('moto-rabeta', J, undefined, [0.22, 0.12, 0.2], [0, 0.45, -0.38], OURO, 0.06, { brilho: 0.8, ...NO });
  P.bola('moto-lanterna', J, undefined, 0.04, [0, 0.46, -0.485], CORAL, [1, 0.8, 0.5], NO);
  // os para-lamas
  // (em dois gomos cada, acompanhando a roda: inteiros e retos, pareciam uma tábua espetada)
  for (const [nome, z0, lado] of [
    ['t', -0.4, -1],
    ['f', 0.5, 1],
  ] as const)
    for (const [k, a] of [
      [0, 0.32],
      [1, -0.32],
    ] as const) {
      const ang = a * lado;
      P.caixa(`moto-paralama-${nome}${k}`, J, undefined, [0.16, 0.04, 0.15], [0, R + 0.235 * Math.cos(ang), z0 + 0.235 * Math.sin(ang)], OURO, 0.02, { rot: [ang, 0, 0], brilho: 0.8, ...NO });
    }
  // o garfo, o farol redondo com o aro e o guidão alto com as manoplas creme
  for (const s of [-1, 1]) tubo(P, `moto-garfo${s}`, [s * 0.085, R, frente[2]], [s * 0.07, 0.7, 0.4], 0.028, OURO_ESC, { brilho: 0.8, ...NO });
  P.caixa('moto-mesa', J, undefined, [0.2, 0.08, 0.1], [0, 0.72, 0.4], OURO_ESC, 0.035, NO);
  P.bola('moto-farol', J, undefined, 0.085, [0, 0.66, 0.5], '#fff4d0', [1, 1, 0.55], { luz: 'farol', ...NO });
  P.anel('moto-farol-aro', J, undefined, 0.19, 0.035, [0, 0.66, 0.49], OURO_CLARO, { rot: [Math.PI / 2, 0, 0], brilho: 0.8, ...NO });
  P.caixa('moto-farol-caixa', J, undefined, [0.17, 0.15, 0.1], [0, 0.66, 0.43], OURO, 0.07, { brilho: 0.8, ...NO });
  tubo(P, 'moto-coluna', [0, 0.74, 0.4], [0, 0.82, 0.32], 0.024, PRATA);
  P.cone('moto-guidao', J, undefined, 0.46, 0.024, 0.024, [0, 0.82, 0.32], PRATA, { ...deitado, brilho: 0.8, ...NO });
  for (const s of [-1, 1]) {
    P.cone(`moto-manopla${s}`, J, undefined, 0.11, 0.036, 0.036, [s * 0.2, 0.82, 0.32], CREME, { ...deitado, ...NO });
    P.bola(`moto-manopla-ponta${s}`, J, undefined, 0.038, [s * 0.258, 0.82, 0.32], OURO_ESC, [0.6, 1, 1], NO);
  }
  // (sem espelhinhos: de frente, as bolinhas deles pareciam dragonas nos ombros da criança)
  // o escapamento redondo, curtinho, do lado direito, dourado escuro (claro, parecia um cabo branco)
  P.cone('moto-escape', J, undefined, 0.28, 0.035, 0.042, [0.14, 0.26, -0.24], OURO_ESC, { rot: [Math.PI / 2 + 0.12, 0, 0], brilho: 0.8, ...NO });
  P.bola('moto-escape-ponta', J, undefined, 0.044, [0.14, 0.276, -0.38], '#8c8478', [1, 1, 0.5], NO);
  // os apoios dos pés (onde os sapatos descansam)
  const apoio = (s: number): V3 => [s * 0.17, 0.3, 0.14];
  for (const s of [-1, 1]) {
    const a = apoio(s);
    P.caixa(`moto-apoio${s}`, J, undefined, [0.09, 0.03, 0.1], [a[0], a[1] - 0.015, a[2]], PNEU, 0.012, NO);
    tubo(P, `moto-apoio-haste${s}`, [s * 0.09, 0.3, 0.14], [s * 0.13, 0.29, 0.14], 0.016, PRATA);
  }
  // as rodas (a da frente e a de trás) e as rodinhas de apoio de criança, atrás
  rodaMoto(P, 'moto-rodaT', 'andarRodaT', tras, R, 0.14);
  rodaMoto(P, 'moto-rodaF', 'andarRodaF', frente, R, 0.12);
  const rr = 0.075;
  for (const s of [-1, 1]) tubo(P, `moto-apoio-rodinha${s}`, [s * 0.25, rr, tras[2]], [s * 0.07, 0.3, tras[2] + 0.02], 0.014, PRATA);
  const gr = giro('andarRodinhaE', [0, rr, tras[2]]);
  for (const s of [-1, 1]) {
    P.cone(`moto-rodinha${s}`, J, undefined, 0.045, rr, rr, [s * 0.25, 0, 0], CREME, { ...deitado, ...gr });
    P.bola(`moto-rodinha-marca${s}`, J, undefined, 0.012, [s * 0.275, 0.045, 0], OURO_ESC, [0.6, 1, 1], gr);
  }
  return {
    assentoY: 0.52,
    troncoX: 0.26,
    maos: { E: [-0.2, 0.82, 0.32], D: [0.2, 0.82, 0.32] },
    pes: { tipo: 'apoio', E: apoio(-1), D: apoio(1) },
    rodas: [
      { no: 'andarRodaT', porBloco: 1 / (R * ESCALA) },
      { no: 'andarRodaF', porBloco: 1 / (R * ESCALA) },
      { no: 'andarRodinhaE', porBloco: 1 / (rr * ESCALA) },
    ],
    sombra: [0.72, 1.3],
  };
}

// ------------------------------------------------------------------ a motoca de pedal
function triciclo(P: Pecas): Montagem {
  const Rf = 0.19;
  const frente: V3 = [0, Rf, 0.22];
  const Rt = 0.14;
  const zT = -0.32;
  const xT = 0.29;
  // o chassi baixo dourado, do banco até a frente, e o eixo de trás
  P.caixa('tri-chassi', J, undefined, [0.26, 0.1, 0.56], [0, 0.19, -0.1], OURO_ESC, 0.045, { brilho: 0.8, ...NO });
  P.caixa('tri-eixo', J, undefined, [xT * 2, 0.05, 0.06], [0, Rt, zT], PRATA, 0.02, { brilho: 0.8, ...NO });
  // o banco baixo com o encosto, e a rabeta dourada larga (o baú da motoca) com as lanterninhas
  P.caixa('tri-banco', J, undefined, [0.32, 0.07, 0.3], [0, 0.225, -0.08], CREME, 0.03, NO);
  P.caixa('tri-encosto', J, undefined, [0.32, 0.24, 0.07], [0, 0.37, -0.24], CREME, 0.03, { rot: [-0.18, 0, 0], ...NO });
  P.caixa('tri-rabeta', J, undefined, [0.44, 0.2, 0.2], [0, 0.3, -0.38], OURO, 0.08, { brilho: 0.8, ...NO });
  P.placa('tri-estrela-t', J, undefined, perfilEstrela(0.06), 0.012, [0, 0.31, -0.484], CREME, { rot: [0, Math.PI, 0], ...NO });
  for (const s of [-1, 1]) {
    P.bola(`tri-lanterna${s}`, J, undefined, 0.035, [s * 0.16, 0.32, -0.48], CORAL, [1, 0.8, 0.5], NO);
    P.caixa(`tri-paralama${s}`, J, undefined, [0.13, 0.045, 0.3], [s * xT, Rt + 0.17, zT], OURO, 0.02, { brilho: 0.8, ...NO });
  }
  // a frente de moto: o garfo, a carenagem dourada grande na frente dos joelhos, o farol redondo,
  // a estrela, o guidão alto e os espelhinhos
  for (const s of [-1, 1]) tubo(P, `tri-garfo${s}`, [s * 0.07, Rf, frente[2]], [s * 0.065, 0.58, 0.34], 0.026, OURO_ESC, { brilho: 0.8, ...NO });
  P.caixa('tri-carenagem', J, undefined, [0.36, 0.3, 0.16], [0, 0.53, 0.39], OURO, 0.09, { brilho: 0.8, rot: [-0.22, 0, 0], ...NO });
  P.bola('tri-farol', J, undefined, 0.085, [0, 0.58, 0.48], '#fff4d0', [1, 1, 0.55], { luz: 'farol', ...NO });
  P.anel('tri-farol-aro', J, undefined, 0.19, 0.034, [0, 0.58, 0.47], OURO_CLARO, { rot: [Math.PI / 2 - 0.22, 0, 0], brilho: 0.8, ...NO });
  P.placa('tri-estrela-f', J, undefined, perfilEstrela(0.05), 0.012, [0, 0.45, 0.5], CREME, { rot: [-0.22, 0, 0], ...NO });
  tubo(P, 'tri-coluna', [0, 0.66, 0.33], [0, 0.73, 0.27], 0.024, PRATA);
  P.cone('tri-guidao', J, undefined, 0.46, 0.024, 0.024, [0, 0.73, 0.27], PRATA, { ...deitado, brilho: 0.8, ...NO });
  for (const s of [-1, 1]) {
    P.cone(`tri-manopla${s}`, J, undefined, 0.11, 0.036, 0.036, [s * 0.2, 0.73, 0.27], CREME, { ...deitado, ...NO });
    P.bola(`tri-manopla-ponta${s}`, J, undefined, 0.038, [s * 0.258, 0.73, 0.27], OURO_ESC, [0.6, 1, 1], NO);
  }
  // as duas rodas de trás e a da frente (com os pedais no miolo dela, que giram juntos)
  rodaMoto(P, 'tri-rodaT', 'andarRodaT', [0, Rt, zT], Rt, 0.09, [-xT, xT]);
  rodaMoto(P, 'tri-rodaF', 'andarRodaF', frente, Rf, 0.1);
  const rp = 0.045;
  const gp = giro('andarPedal', frente);
  for (const s of [-1, 1]) {
    P.caixa(`tri-pedivela${s}`, J, undefined, [0.024, rp + 0.03, 0.03], [s * 0.078, (s * rp) / 2, 0], PRATA, 0.01, gp);
    P.cone(`tri-pedal${s}`, J, undefined, 0.075, 0.026, 0.026, [s * 0.125, s * rp, 0], '#4a4558', { ...deitado, ...gp });
  }
  return {
    assentoY: 0.26,
    troncoX: 0.18,
    maos: { E: [-0.2, 0.73, 0.27], D: [0.2, 0.73, 0.27] },
    // (o pedal gira com a roda da frente: a mesma volta)
    pes: { tipo: 'pedal', eixo: [Rf, frente[2]], raio: rp, x: 0.125, raioPedal: 0.026, no: 'andarPedal', porBloco: 1 / (Rf * ESCALA) },
    rodas: [
      { no: 'andarRodaT', porBloco: 1 / (Rt * ESCALA) },
      { no: 'andarRodaF', porBloco: 1 / (Rf * ESCALA) },
    ],
    sombra: [0.7, 1.15],
  };
}

// ------------------------------------------------------------------ a bicicletinha que o pé alcança
/**
 * A bicicletinha da 036 (as mesmas cores e os mesmos detalhes, na escala 1,2), com a medida que
 * deixa o pé alcançar o pedal: o selim mais baixo, o eixo do pedal mais alto e mais perto do
 * quadril, a pedivela mais curta e o pedal redondo (fica igual em qualquer ponto da volta). O
 * guidão desce junto com o selim.
 */
function bicicletaNova(P: Pecas): Montagem {
  const MENTA = '#34c995';
  const MENTA_ESC = '#22a477';
  const PNEU_B = '#3a3644';
  const CARAMELO = '#d8a15a';
  const ROSA = '#ff8fbf';
  const k = 1.2;
  const K = (v: V3): V3 => [v[0] * k, v[1] * k, v[2] * k];
  const R = 0.2 * k;
  const tras = K([0, 0.2, -0.27]);
  const frente = K([0, 0.2, 0.56]);
  // o eixo do pedal: mais alto e mais perto do quadril que na 036 (0,24 e 0,14, em k)
  const pedal = K([0, 0.315, 0.1]);
  const selimY = 0.395; // em k (a 036: 0,47)
  const guidao: V3 = [0, 0.74, 0.31]; // em k (a 036: 0,84 e 0,36)
  tubo(P, 'andar-bici-canote', pedal, K([0, selimY + 0.02, -0.01]), 0.028 * k, MENTA);
  tubo(P, 'andar-bici-baixo-tras', tras, pedal, 0.022 * k, MENTA);
  tubo(P, 'andar-bici-cima-tras', tras, K([0, selimY - 0.02, -0.005]), 0.02 * k, MENTA);
  tubo(P, 'andar-bici-diagonal', pedal, K([0, 0.56, 0.45]), 0.03 * k, MENTA);
  tubo(P, 'andar-bici-cima', K([0, selimY - 0.01, 0]), K([0, 0.6, 0.45]), 0.026 * k, MENTA);
  tubo(P, 'andar-bici-garfo', frente, K([0, 0.78, 0.42]), 0.025 * k, MENTA_ESC);
  P.cone('andar-bici-caixa', J, undefined, 0.16 * k, 0.034 * k, 0.034 * k, K([0, 0.6, 0.47]), MENTA_ESC, { rot: [-0.2, 0, 0], ...NO });
  for (const [nome, c] of [
    ['andarRodaT', tras],
    ['andarRodaF', frente],
  ] as const) {
    const g = giro(nome, c);
    P.anel(`andar-bici-pneu-${nome}`, J, undefined, R * 2 - 0.06 * k, 0.065 * k, [0, 0, 0], PNEU_B, { rot: [0, 0, Math.PI / 2], ...g });
    P.anel(`andar-bici-aro-${nome}`, J, undefined, R * 2 - 0.13 * k, 0.02 * k, [0, 0, 0], CREME, { rot: [0, 0, Math.PI / 2], ...g });
    for (let i = 0; i < 3; i++)
      P.caixa(`andar-bici-raio-${nome}${i}`, J, undefined, [0.014, R * 2 - 0.14 * k, 0.014], [0, 0, 0], CREME, 0.005, { rot: [(i * Math.PI) / 3, 0, 0], ...g });
    P.cone(`andar-bici-cubo-${nome}`, J, undefined, 0.07 * k, 0.035 * k, 0.035 * k, [0, 0, 0], MENTA_ESC, { ...deitado, ...g });
  }
  const [, gy, gz] = guidao;
  tubo(P, 'andar-bici-mesa', K([0, 0.78, 0.42]), K([0, gy, gz]), 0.022 * k, MENTA_ESC);
  P.cone('andar-bici-guidao', J, undefined, 0.5 * k, 0.022 * k, 0.022 * k, K([0, gy, gz]), '#dfe3ee', { ...deitado, brilho: 0.5, ...NO });
  for (const s of [-1, 1]) {
    P.cone(`andar-bici-punho${s}`, J, undefined, 0.12 * k, 0.034 * k, 0.034 * k, K([s * 0.21, gy, gz]), ROSA, { ...deitado, ...NO });
    P.bola(`andar-bici-ponta${s}`, J, undefined, 0.036 * k, K([s * 0.275, gy, gz]), ROSA, [0.6, 1, 1], NO);
  }
  P.bola('andar-bici-campainha', J, undefined, 0.032 * k, K([-0.13, gy + 0.035, gz]), '#ffc93d', [1, 0.6, 1], { brilho: 0.8, ...NO });
  P.caixa('andar-bici-selim', J, undefined, [0.18 * k, 0.06 * k, 0.26 * k], K([0, selimY, -0.01]), CREME, 0.03 * k, NO);
  P.caixa('andar-bici-cesta', J, undefined, [0.3 * k, 0.17 * k, 0.2 * k], K([0, 0.7, 0.6]), CARAMELO, 0.035 * k, NO);
  P.caixa('andar-bici-cesta-borda', J, undefined, [0.32 * k, 0.03 * k, 0.22 * k], K([0, 0.785, 0.6]), misturarCor(CARAMELO, '#7a4e2a', 0.4), 0.015, NO);
  for (const y of [0.66, 0.72])
    P.caixa(`andar-bici-cesta-fio${y}`, J, undefined, [0.305 * k, 0.012, 0.205 * k], K([0, y, 0.6]), misturarCor(CARAMELO, '#ffffff', 0.35), 0.005, NO);
  P.bola('andar-bici-flor', J, undefined, 0.05 * k, K([0.06, 0.81, 0.6]), ROSA, [1, 1, 0.7], NO);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    P.bola(`andar-bici-petala${i}`, J, undefined, 0.032 * k, K([0.06 + Math.cos(a) * 0.045, 0.81 + Math.sin(a) * 0.045, 0.6]), ROSA, [1, 1, 0.5], NO);
  }
  P.bola('andar-bici-miolo', J, undefined, 0.025 * k, K([0.06, 0.81, 0.625]), '#ffd23a', [1, 1, 0.6], NO);
  P.placa('andar-bici-folha', J, undefined, perfilFolha(0.08 * k), 0.012, K([-0.04, 0.8, 0.6]), '#4cc26a', { rot: [0, 0, 0.8], ...NO });
  // o pedal: a coroa, a pedivela mais curta (0,07 em vez de 0,12) e o pedal redondo
  const rp = 0.058 * k;
  const gp = giro('andarPedal', pedal);
  P.cone('andar-bici-coroa', J, undefined, 0.02 * k, 0.06 * k, 0.06 * k, [0.045 * k, 0, 0], MENTA_ESC, { ...deitado, ...gp });
  for (const s of [-1, 1]) {
    P.caixa(`andar-bici-pedivela${s}`, J, undefined, [0.026 * k, rp + 0.03, 0.03 * k], [s * 0.065 * k, (s * rp) / 2, 0], '#dfe3ee', 0.01, gp);
    P.cone(`andar-bici-pedal${s}`, J, undefined, 0.085 * k, 0.024 * k, 0.024 * k, [s * 0.118 * k, s * rp, 0], '#3c3a48', { ...deitado, ...gp });
  }
  const gr = giro('andarRodinhaE', K([0, 0.08, -0.27]));
  for (const s of [-1, 1]) {
    const c = K([s * 0.22, 0.08, -0.27]);
    tubo(P, `andar-bici-apoio${s}`, c, K([s * 0.03, 0.2, -0.27]), 0.014 * k, '#dfe3ee');
    const x = s * 0.22 * k;
    P.cone(`andar-bici-rodinha${s}`, J, undefined, 0.045 * k, 0.08 * k, 0.08 * k, [x, 0, 0], CREME, { ...deitado, ...gr });
    P.cone(`andar-bici-rodinha-cubo${s}`, J, undefined, 0.05 * k, 0.03 * k, 0.03 * k, [x, 0, 0], MENTA, { ...deitado, ...gr });
    P.bola(`andar-bici-rodinha-marca${s}`, J, undefined, 0.012 * k, [x + s * 0.024 * k, 0.05 * k, 0], MENTA_ESC, [0.6, 1, 1], gr);
  }
  return {
    assentoY: (selimY + 0.03) * k,
    troncoX: 0.34,
    maos: { E: K([-0.21, gy, gz]), D: K([0.21, gy, gz]) },
    pes: { tipo: 'pedal', eixo: [pedal[1], pedal[2]], raio: rp, x: 0.118 * k, raioPedal: 0.024 * k, no: 'andarPedal', porBloco: (1 / (R * ESCALA)) * 0.55 },
    rodas: [
      { no: 'andarRodaT', porBloco: 1 / (R * ESCALA) },
      { no: 'andarRodaF', porBloco: 1 / (R * ESCALA) },
      { no: 'andarRodinhaE', porBloco: 2.5 / (R * ESCALA) },
    ],
    sombra: [0.75, 1.25],
  };
}

// ------------------------------------------------------------------ o carrinho de pedal com os pedais à vista
/**
 * O carrinho de pedal da 036 (as mesmas cores e o mesmo jeito), com os pedais de verdade no
 * vão dos pés: o capô e o painel um tico para a frente, e o eixo do pedal debaixo do painel, à
 * vista de cima. Os joelhos dobram para cima, como criança sentada no carrinho.
 */
function carrinhoNovo(P: Pecas): Montagem {
  const AZUL = '#2fb2ea';
  const AZUL_ESC = '#1f86c6';
  const AMARELO = '#ffd23a';
  const CINZA = '#e6e9f2';
  const LARANJA = '#ff8a3d';
  P.caixa('andar-carrinho-assoalho', J, undefined, [0.7, 0.07, 1.06], [0, 0.16, 0.02], AZUL_ESC, 0.03, NO);
  for (const s of [-1, 1]) {
    P.caixa(`andar-carrinho-lado${s}`, J, undefined, [0.1, 0.27, 0.96], [s * 0.34, 0.29, 0.02], AZUL, 0.05, { brilho: 0.5, ...NO });
    P.caixa(`andar-carrinho-friso${s}`, J, undefined, [0.012, 0.045, 0.74], [s * 0.392, 0.32, 0.02], '#ffffff', 0.008, NO);
  }
  // o capô mais curto (começa em 0,3 em vez de 0,19) e o painel na boca dele
  P.caixa('andar-carrinho-capo', J, undefined, [0.78, 0.3, 0.34], [0, 0.3, 0.46], AZUL, 0.13, { brilho: 0.5, ...NO });
  P.caixa('andar-carrinho-painel', J, undefined, [0.62, 0.1, 0.1], [0, 0.47, 0.31], AZUL_ESC, 0.045, NO);
  P.caixa('andar-carrinho-traseira', J, undefined, [0.78, 0.34, 0.24], [0, 0.3, -0.44], AZUL, 0.11, { brilho: 0.5, ...NO });
  P.caixa('andar-carrinho-parachoque', J, undefined, [0.8, 0.08, 0.08], [0, 0.18, 0.63], CINZA, 0.04, { brilho: 0.5, ...NO });
  P.caixa('andar-carrinho-parachoque2', J, undefined, [0.8, 0.08, 0.08], [0, 0.18, -0.58], CINZA, 0.04, { brilho: 0.5, ...NO });
  for (const s of [-1, 1]) {
    P.bola(`andar-carrinho-farol${s}`, J, undefined, 0.058, [s * 0.22, 0.35, 0.6], '#fff4d0', [1, 1, 0.6], { luz: 'farol', ...NO });
    P.anel(`andar-carrinho-aro${s}`, J, undefined, 0.13, 0.026, [s * 0.22, 0.35, 0.595], CINZA, { rot: [Math.PI / 2, 0, 0], brilho: 0.5, ...NO });
  }
  P.caixa('andar-carrinho-assento', J, undefined, [0.52, 0.07, 0.32], [0, 0.22, -0.16], CREME, 0.03, NO);
  P.caixa('andar-carrinho-encosto', J, undefined, [0.52, 0.28, 0.07], [0, 0.4, -0.33], CREME, 0.03, NO);
  // o volante um tico mais alto e mais para a frente (os joelhos passam por baixo dele)
  tubo(P, 'andar-carrinho-coluna', [0, 0.47, 0.32], [0, 0.6, 0.2], 0.022, CINZA);
  P.anel('andar-carrinho-volante', J, undefined, 0.27, 0.04, [0, 0.61, 0.19], '#3c3a48', { rot: [-0.95, 0, 0], ...NO });
  P.bola('andar-carrinho-buzina', J, undefined, 0.045, [0, 0.615, 0.195], AMARELO, [1, 0.55, 1], { rot: [-0.95, 0, 0], ...NO });
  tubo(P, 'andar-carrinho-mastro', [0.28, 0.44, -0.5], [0.28, 1.05, -0.52], 0.012, CINZA);
  P.placa(
    'andar-carrinho-bandeira',
    J,
    undefined,
    [
      [0, 0.09],
      [0, -0.09],
      [0.2, 0],
    ],
    0.012,
    [0.28, 0.98, -0.52],
    LARANJA,
    { rot: [0, Math.PI / 2, 0], ...NO },
  );
  for (const [nome, z] of [
    ['andarRodaF', 0.38],
    ['andarRodaT', -0.34],
  ] as const) {
    const g = giro(nome, [0, 0.13, z]);
    for (const s of [-1, 1]) {
      P.cone(`andar-carrinho-pneu-${nome}${s}`, J, undefined, 0.1, 0.13, 0.13, [s * 0.4, 0, 0], PNEU, { ...deitado, ...g });
      P.cone(`andar-carrinho-calota-${nome}${s}`, J, undefined, 0.106, 0.065, 0.065, [s * 0.4, 0, 0], AMARELO, { ...deitado, brilho: 0.5, ...g });
      P.bola(`andar-carrinho-parafuso-${nome}${s}`, J, undefined, 0.018, [s * 0.455, 0.035, 0], '#ffffff', [0.6, 1, 1], g);
    }
  }
  // os pedais: o eixo debaixo do painel, as pedivelas e os pedais redondos (giram no nó deles)
  const eixo: V3 = [0, 0.3, 0.24];
  const rp = 0.05;
  for (const s of [-1, 1]) P.caixa(`andar-carrinho-mancal${s}`, J, undefined, [0.04, 0.12, 0.06], [s * 0.21, 0.27, 0.25], AZUL_ESC, 0.015, NO);
  const gp = giro('andarPedal', eixo);
  P.cone('andar-carrinho-eixo', J, undefined, 0.42, 0.014, 0.014, [0, 0, 0], CINZA, { ...deitado, ...gp });
  for (const s of [-1, 1]) {
    P.caixa(`andar-carrinho-pedivela${s}`, J, undefined, [0.022, rp + 0.03, 0.026], [s * 0.07, (s * rp) / 2, 0], CINZA, 0.008, gp);
    P.cone(`andar-carrinho-pedal${s}`, J, undefined, 0.075, 0.025, 0.025, [s * 0.12, s * rp, 0], '#3c3a48', { ...deitado, ...gp });
  }
  return {
    assentoY: 0.255,
    troncoX: 0.04,
    maos: { E: [-0.13, 0.62, 0.2], D: [0.13, 0.62, 0.2] },
    pes: { tipo: 'pedal', eixo: [eixo[1], eixo[2]], raio: rp, x: 0.12, raioPedal: 0.025, no: 'andarPedal', porBloco: 2.2 },
    rodas: [
      { no: 'andarRodaF', porBloco: 1 / (0.13 * ESCALA) },
      { no: 'andarRodaT', porBloco: 1 / (0.13 * ESCALA) },
    ],
    sombra: [0.85, 1.25],
  };
}

/** Veste o brinquedo do esboço no plano (todo no nó `brinquedo`, debaixo dos pés). */
export function vestirBrinquedoEsboco(id: IdMoto | IdPedal, lista: Peca[]): Montagem {
  const antes = lista.length;
  const P = new Pecas(lista);
  const m = id === 'motoca' ? motoca(P) : id === 'triciclo' ? triciclo(P) : id === 'bici' ? bicicletaNova(P) : carrinhoNovo(P);
  // (como a 036: o brinquedo inteiro num brilho só por nó, menos o ouro, que é lustroso)
  for (let i = antes; i < lista.length; i++) if (!lista[i].luz && (lista[i].brilho ?? 0) < 0.7) lista[i].brilho = 0.45;
  return m;
}

// ------------------------------------------------------------------ o joelho
/** A medida da perna com joelho (no espaço da perna, antes da escala do boneco). */
export interface MedidaPerna {
  /** Do quadril ao joelho (o joelho fica bem embaixo do quadril). */
  coxa: number;
  /** Do quadril à sola. */
  quadril: number;
  /** O ponto da sola que pisa no pedal: um tico para a frente do meio do sapato. */
  pontaZ: number;
  /** Onde o quadril de cada lado fica, no espaço do corpo. */
  xPerna: number;
}

/**
 * A perna ganha um joelho: a canela e o sapato (ou o tênis) passam para um nó dentro da perna,
 * no joelho, e a caixa da perna vira duas que se cruzam no joelho (esticada, é a mesma perna de
 * antes; dobrada, o joelho fica redondinho, do mesmo pano).
 */
export function dividirPernas(pl: PlanoBoneco): MedidaPerna {
  const quadril = pl.juntas.pernaE.pos[1];
  const xPerna = Math.abs(pl.juntas.pernaE.pos[0]);
  const perna = pl.pecas.find((p) => p.nome === 'pernaE-perna');
  const pernaH = perna?.tamanho[1] ?? 0.24;
  const coxa = Math.min(0.15, pernaH * 0.6);
  const cruza = 0.05;
  for (const lado of ['pernaE', 'pernaD'] as const) {
    const joelho = { nome: sj(lado === 'pernaE' ? 'joelhoE' : 'joelhoD'), pivo: [0, -coxa, 0] as V3 };
    const novas: Peca[] = [];
    for (const p of pl.pecas) {
      if (p.junta !== lado || p.subjunta) continue;
      if (p.nome === `${lado}-perna` && p.forma === 'caixa') {
        const [w, , d] = p.tamanho;
        // a coxa: do quadril até um tico abaixo do joelho
        const hCoxa = coxa + cruza;
        novas.push({ ...p, nome: `${lado}-canela`, tamanho: [w * 0.98, pernaH - coxa + cruza, d * 0.98], pos: [p.pos[0], -(pernaH - coxa + cruza) / 2 + cruza, p.pos[2]], subjunta: joelho });
        p.tamanho = [w, hCoxa, d];
        p.pos = [p.pos[0], -hCoxa / 2, p.pos[2]];
        continue;
      }
      // o que fica todo abaixo do joelho vai com a canela (o sapato, o tênis)
      if (p.pos[1] < -coxa) {
        p.pos = [p.pos[0], p.pos[1] + coxa, p.pos[2]];
        p.subjunta = joelho;
      }
    }
    pl.pecas.push(...novas);
  }
  return { coxa, quadril, pontaZ: 0.06, xPerna };
}

// ------------------------------------------------------------------ o tênis
/** Pinta o tênis-cometa de hoje com as cores da versão (as mesmas peças, só a cor e a luz). */
export function retocarTenis(pl: PlanoBoneco, v: IdTenis): void {
  if (v === 'hoje') return;
  const violeta = v === 'violeta';
  const cano = violeta ? ['#5b34e0', '#7550f6'] : ['#1f2a6e', '#34479c'];
  const lingua = violeta ? '#ffd65a' : '#f2f4ff';
  const estrela = violeta ? '#ffc93d' : '#eef1fb';
  const cauda = violeta ? ['#ffd23f', '#ffe27a', '#fff0b8'] : ['#f4f6ff', '#d9def0', '#c3cae4'];
  for (const p of pl.pecas) {
    const n = p.nome;
    if (/-tenis-cano$/.test(n)) {
      const [a, b] = cano;
      const y0 = p.pos[1] - 0.08;
      p.cor = a;
      p.pintar = (_x, y) => misturarCor(a, b, (y - y0) / 0.16);
    } else if (/-tenis-lingua$/.test(n)) p.cor = lingua;
    // (a faixa de luz: o ouro que pulsa manso; na versão da noite, a luz creme do farol, porque
    // a pérola puxa para o rosa)
    else if (/-tenis-luz$/.test(n)) p.luz = violeta ? 'ouro' : 'farol';
    else if (/-tenis-calcanhar$/.test(n)) {
      p.cor = estrela;
      p.luz = violeta ? 'ouro' : undefined;
      p.brilho = 0.8;
    }
    else if (/-tenis-cometa-?\d$/.test(n)) {
      p.cor = estrela;
      if (violeta) p.luz = 'ouro';
      else {
        // a estrela de prata: plástico claro lustroso, sem luz
        p.luz = undefined;
        p.brilho = 0.8;
      }
    } else {
      const c = /-tenis-cauda-?\d(\d)$/.exec(n);
      if (c) p.cor = cauda[Number(c[1])];
    }
  }
}

// ------------------------------------------------------------------ a camiseta
/** Os peixinhos da versão "bolinhas": nenhum de listra; o da frente é amarelo de bolinhas. */
export const PEIXES_BOLINHAS: readonly Peixe[] = [
  { x0: 0.45, y: 0.43, tam: 27, vel: 12, corpo: '#ffd23a', borda: '#d18a00', barbatana: '#ff9a3c', pintas: '#ffffff' },
  { x0: 0.6, y: 0.66, tam: 21, vel: -9, corpo: '#ff9e6e', borda: '#cf5a32', barbatana: '#ffd23a', barriga: '#fff3ee' },
  { x0: 0.93, y: 0.4, tam: 24, vel: 14, corpo: '#ff7a86', borda: '#d0475a', barbatana: '#ffd23a', barriga: '#fff3ee' },
  { x0: 0.16, y: 0.6, tam: 24, vel: -11, corpo: '#fffaf2', borda: '#e07a2a', barbatana: '#ff9a3c', pintas: '#ff9a3c' },
  { x0: 0.31, y: 0.72, tam: 14, vel: 17, corpo: '#ffc23a', borda: '#d17a00', barbatana: '#ff8a1f' },
  { x0: 0.74, y: 0.3, tam: 16, vel: -13, corpo: '#ff9e8a', borda: '#d05a48', barbatana: '#ffffff', barriga: '#ffffff' },
];

/** Os peixinhos redondos do cardume da versão "cavalinho" (pequenos, creme e pêssego). */
export const PEIXES_CARDUME: readonly Peixe[] = [
  { x0: 0.6, y: 0.3, tam: 12, vel: 15, corpo: '#fff3e0', borda: '#e0883a', barbatana: '#ffb36b' },
  { x0: 0.635, y: 0.42, tam: 11, vel: 15, corpo: '#ffd9a8', borda: '#d9793a', barbatana: '#ffb36b' },
  { x0: 0.67, y: 0.27, tam: 10, vel: 15, corpo: '#fff3e0', borda: '#e0883a', barbatana: '#ffb36b' },
  { x0: 0.7, y: 0.38, tam: 12, vel: 15, corpo: '#ffd9a8', borda: '#d9793a', barbatana: '#ffb36b' },
  { x0: 0.12, y: 0.62, tam: 22, vel: -10, corpo: '#ffd23a', borda: '#d18a00', barbatana: '#ff9a3c', barriga: '#fff6d8' },
  { x0: 0.88, y: 0.66, tam: 20, vel: 12, corpo: '#ff9e8a', borda: '#d05a48', barbatana: '#ffffff', barriga: '#ffffff' },
];

/**
 * O cavalinho-marinho (versão "cavalinho"), virado para a direita, com o centro em (x, y) e a
 * altura `h` (px da textura): a cabeça com o focinho de canudinho, a barriga creme em gomos, o
 * rabo enroladinho, a barbatana das costas abanando e o olho grande com brilho.
 */
export function desenharCavalinho(c: CanvasRenderingContext2D, x: number, y: number, h: number, t: number): void {
  const corpo = '#ff8f7a';
  const borda = '#c9503f';
  const barriga = '#fff1dc';
  const s = h / 2;
  c.save();
  c.translate(x, y + Math.sin(t * 1.6) * 2.5);
  c.lineJoin = 'round';
  c.lineCap = 'round';
  // o rabo enroladinho embaixo
  c.strokeStyle = borda;
  c.lineWidth = s * 0.3;
  c.beginPath();
  c.moveTo(-s * 0.05, s * 0.45);
  c.quadraticCurveTo(-s * 0.18, s * 0.95, s * 0.12, s * 0.98);
  c.arc(s * 0.12, s * 0.8, s * 0.18, Math.PI / 2, Math.PI * 2.1, false);
  c.stroke();
  c.strokeStyle = corpo;
  c.lineWidth = s * 0.2;
  c.stroke();
  // a barbatana das costas, abanando
  c.fillStyle = '#ffd0a6';
  c.strokeStyle = borda;
  c.lineWidth = Math.max(1.2, s * 0.06);
  const abana = Math.sin(t * 7) * s * 0.05;
  c.beginPath();
  c.moveTo(-s * 0.28, -s * 0.1);
  c.quadraticCurveTo(-s * 0.62 + abana, s * 0.05, -s * 0.3, s * 0.32);
  c.closePath();
  c.fill();
  c.stroke();
  // o corpo (a barriga para a frente) e a barriga creme em gomos
  c.fillStyle = corpo;
  c.beginPath();
  c.ellipse(0, s * 0.08, s * 0.32, s * 0.48, 0.12, 0, Math.PI * 2);
  c.fill();
  c.save();
  c.clip();
  c.fillStyle = barriga;
  c.beginPath();
  c.ellipse(s * 0.2, s * 0.12, s * 0.18, s * 0.42, 0.12, 0, Math.PI * 2);
  c.fill();
  c.strokeStyle = 'rgba(201,80,63,0.45)';
  c.lineWidth = Math.max(1, s * 0.04);
  for (let i = 0; i < 4; i++) {
    const yy = -s * 0.15 + i * s * 0.17;
    c.beginPath();
    c.moveTo(s * 0.05, yy);
    c.lineTo(s * 0.36, yy + s * 0.04);
    c.stroke();
  }
  c.restore();
  c.strokeStyle = borda;
  c.lineWidth = Math.max(1.2, s * 0.07);
  c.beginPath();
  c.ellipse(0, s * 0.08, s * 0.32, s * 0.48, 0.12, 0, Math.PI * 2);
  c.stroke();
  // a cabeça com o focinho de canudinho e a coroinha de três pontas redondas
  c.fillStyle = corpo;
  c.beginPath();
  c.ellipse(s * 0.02, -s * 0.52, s * 0.27, s * 0.22, -0.2, 0, Math.PI * 2);
  c.fill();
  c.stroke();
  c.beginPath();
  c.moveTo(s * 0.2, -s * 0.56);
  c.lineTo(s * 0.55, -s * 0.5);
  c.lineTo(s * 0.55, -s * 0.38);
  c.lineTo(s * 0.18, -s * 0.42);
  c.closePath();
  c.fill();
  c.stroke();
  c.fillStyle = '#ffd0a6';
  for (const [dx, dy] of [
    [-s * 0.14, -s * 0.74],
    [-s * 0.02, -s * 0.78],
    [s * 0.1, -s * 0.74],
  ]) {
    c.beginPath();
    c.arc(dx, dy, s * 0.07, 0, Math.PI * 2);
    c.fill();
    c.stroke();
  }
  // o olho grande com brilho e a bochecha
  c.fillStyle = '#ffffff';
  c.beginPath();
  c.arc(s * 0.06, -s * 0.55, s * 0.12, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = '#1d1430';
  c.beginPath();
  c.arc(s * 0.08, -s * 0.54, s * 0.075, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = '#ffffff';
  c.beginPath();
  c.arc(s * 0.105, -s * 0.57, s * 0.03, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = 'rgba(255,110,150,0.5)';
  c.beginPath();
  c.ellipse(s * 0.04, -s * 0.4, s * 0.07, s * 0.04, 0, 0, Math.PI * 2);
  c.fill();
  c.restore();
}
