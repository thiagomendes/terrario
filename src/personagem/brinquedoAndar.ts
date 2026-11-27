/**
 * Spec 036: o brinquedo de andar no boneco (o patinete de luz, o carrinho de pedal, a
 * bicicletinha e a nuvem fofa) e a pose de quem está montada. Só dados e contas: o desenho
 * (`render/boneco.ts`) monta as peças uma vez, quando o brinquedo está vestido, num nó próprio
 * (`brinquedo`, na junta `prancha`, debaixo dos pés), e o `montado` só acende esse nó e troca a
 * pose. Montar e descer nunca refazem o boneco (T04).
 *
 * T05: os modelos de verdade, saídos do esboço aprovado (`src/esboco/lojinhaPecas.ts`), no traço
 * das peças do boneco (caixas de canto redondo, bolinhas, cones, anéis e placas), com a correção
 * da spec (a bicicletinha maior), e as animações:
 * - o impulso com o pé no patinete andando e, parado, um pé descansando para trás;
 * - o pedal no carrinho e na bicicletinha, com as pernas acompanhando a volta do pedal;
 * - as rodinhas girando pela velocidade de verdade (o caminho andado sobre o raio da roda);
 * - a nuvem boiando devagar, com a criança junto (um seno só: nada treme).
 *
 * As partes que giram ficam em nós próprios dentro do nó do brinquedo (`andarRodaF`,
 * `andarRodaT`, `andarRodinhaE` com as duas rodinhas de apoio, `andarPedal`); a nuvem boia com o
 * nó do brinquedo inteiro (uma malha só). O estado do andar
 * (`EstadoAndar`) anda a cada quadro em `avancarAndar`, e a pose e os nós leem dele: as pernas e o
 * pedal ficam sempre na mesma volta.
 */
import type { Junta, Peca, RotacoesPose, SubjuntaPremium } from './boneco';
import type { Pose } from './poses';
import { Pecas, misturarCor } from './bonecoPremium';
import { perfilEstrela, perfilFolha } from './bonecoFantasia';

type V3 = [number, number, number];

/** Os brinquedos de andar da 036 e a moto da 038 (os ids do catálogo, categoria `andar`). */
export const IDS_ANDAR = [
  'patinete-luz',
  'carrinho-pedal',
  'bicicletinha',
  'nuvem-fofa',
  'motoquinha-dourada',
] as const;
export type IdAndar = (typeof IDS_ANDAR)[number];

export const ehBrinquedoAndar = (id: unknown): id is IdAndar =>
  typeof id === 'string' && (IDS_ANDAR as readonly string[]).includes(id);

/** Como a criança fica em cada brinquedo (as medidas do esboço aprovado). */
export interface Montaria {
  /** A altura do corpo (o mesmo `corpoY` da pose: 0 é de pé no chão). */
  corpoY: number;
  sentada: boolean;
  /** Os braços para a frente (rad, negativo para a frente) e abertos para fora. */
  bracoX: number;
  bracoAbre: number;
  /** As pernas (rad, negativo para a frente). */
  perna: number;
  /** O vaivém das pernas no pedal (rad; 0 sem pedal). */
  pedal: number;
  troncoX: number;
  /** O raio das rodas (0: não tem roda), para girar com o caminho andado. */
  raioRoda: number;
  /** O balanço de sobe e desce (só a nuvem). */
  flutua?: number;
  /**
   * Spec 038 (T02): o alto do assento (no espaço da prancha). Com ele, a criança senta de verdade
   * em qualquer modelo: o fundo do quadril encosta no assento (`corpoNoAssento`); o `corpoY` fica
   * para quem não sabe o tamanho da perna (o modelo `andarilho`).
   */
  assentoY?: number;
}

/** A bicicletinha maior que no esboço (spec: ela ficava pequena perto do boneco). */
const BICI = 1.2;
/**
 * O meio do guidão da bicicletinha (antes da escala dela). Spec 038 (T02): mais baixo, junto com
 * o selim (antes 0,84 e 0,36).
 */
const GUIDAO_BICI: V3 = [0, 0.74, 0.31];
/** Spec 038 (T02): o alto do selim da bicicletinha (antes da escala; antes 0,5) e do assento do carrinho. */
const SELIM_BICI = 0.425;
const ASSENTO_CARRINHO = 0.255;
/** Spec 038 (T03): o alto do banco da motoquinha, o raio das rodas e o guidão. */
const BANCO_MOTO = 0.52;
const RODA_MOTO = 0.2;
const GUIDAO_MOTO: V3 = [0.2, 0.82, 0.32];
/** Do quadril ao fundo da peça do quadril (onde a criança senta) e a perna do modelo `andarilho`. */
export const FUNDO_DO_QUADRIL = 0.12;
const QUADRIL_ANDARILHO = 0.34;

export const MONTARIA: Readonly<Record<IdAndar, Montaria>> = {
  'patinete-luz': { corpoY: 0.135, sentada: false, bracoX: -1.0, bracoAbre: -0.12, perna: 0, pedal: 0, troncoX: 0.08, raioRoda: 0.075 },
  // (spec 038: os pés nos pedais embaixo do painel, com o joelho dobrado para cima)
  'carrinho-pedal': {
    corpoY: ASSENTO_CARRINHO + FUNDO_DO_QUADRIL - QUADRIL_ANDARILHO,
    sentada: true,
    bracoX: -0.85,
    bracoAbre: -0.16,
    perna: -1.2,
    pedal: 0.1,
    troncoX: 0.04,
    raioRoda: 0.13,
    assentoY: ASSENTO_CARRINHO,
  },
  bicicletinha: {
    corpoY: SELIM_BICI * BICI + FUNDO_DO_QUADRIL - QUADRIL_ANDARILHO,
    sentada: true,
    bracoX: -1.05,
    bracoAbre: -0.05,
    perna: -0.8,
    pedal: 0.3,
    troncoX: 0.34,
    raioRoda: 0.2 * BICI,
    assentoY: SELIM_BICI * BICI,
  },
  'nuvem-fofa': { corpoY: 0.36, sentada: true, bracoX: -0.25, bracoAbre: 0.35, perna: -1.3, pedal: 0, troncoX: 0, raioRoda: 0, flutua: 0.035 },
  // spec 038 (T03): sentada no banco da motoquinha, um tico para a frente, as mãos no guidão alto
  // e os pés nos apoios (o joelho dobra)
  'motoquinha-dourada': {
    corpoY: BANCO_MOTO + FUNDO_DO_QUADRIL - QUADRIL_ANDARILHO,
    sentada: true,
    bracoX: -1.1,
    bracoAbre: -0.1,
    perna: -0.9,
    pedal: 0,
    troncoX: 0.26,
    raioRoda: RODA_MOTO,
    assentoY: BANCO_MOTO,
  },
};

/** Spec 038 (T02): a altura do corpo que senta a criança no assento, pela perna dela (`quadril`). */
export function corpoNoAssento(id: string, quadril: number): number | null {
  if (!ehBrinquedoAndar(id)) return null;
  const s = MONTARIA[id].assentoY;
  return s === undefined ? null : s + FUNDO_DO_QUADRIL - quadril;
}

/**
 * Spec 038 (T02): onde os pés vão em cada brinquedo de pedal ou de apoio (no espaço da prancha,
 * antes da escala do boneco). As peças e a pose leem daqui.
 * - **pedal:** o eixo (y, z) do nó que gira, o raio da pedivela, o x de cada pedal e o raio do
 *   pedal redondo (o pé pisa no alto dele, que é o mesmo em qualquer ponto da volta);
 * - **apoio:** o alto do apoio de cada pé (parado).
 */
export type Pes =
  | { tipo: 'pedal'; eixo: [number, number]; raio: number; x: number; raioPedal: number }
  | { tipo: 'apoio'; E: V3; D: V3 };

// (os pedais do carrinho bem embaixo dos joelhos, perto do assoalho: a criança sentada com a
// canela quase em pé, como num carrinho de pedal de verdade; mais para a frente, a perna curta
// esticava e a sola virava para a frente)
const PEDAL_CARRINHO: Pes = { tipo: 'pedal', eixo: [0.24, 0.18], raio: 0.035, x: 0.12, raioPedal: 0.022 };
export const PES: Readonly<Partial<Record<IdAndar, Pes>>> = {
  // (o eixo perto do quadril e a pedivela curta: a perna mais curta dos 7 modelos alcança o pedal
  // sem esticar, e a sola não vira demais na volta)
  bicicletinha: { tipo: 'pedal', eixo: [0.32 * BICI, 0.12 * BICI], raio: 0.05 * BICI, x: 0.118 * BICI, raioPedal: 0.024 * BICI },
  'carrinho-pedal': PEDAL_CARRINHO,
  // (T03: os apoios da motoquinha, ao alcance da perna mais curta dos 7 modelos, com o joelho
  // dobrado na mais comprida)
  'motoquinha-dourada': { tipo: 'apoio', E: [-0.17, 0.38, 0.13], D: [0.17, 0.38, 0.13] },
};

/** O brinquedo tem pedal ou apoio (a perna divide no joelho e o pé vai nele). */
export const temPes = (id: unknown): boolean => ehBrinquedoAndar(id) && !!PES[id];

/** O alto do pedal (ou do apoio) de cada pé agora, no espaço da prancha. */
export function ondeOsPes(id: string, e: EstadoAndar): { E: V3; D: V3 } | null {
  const p = ehBrinquedoAndar(id) ? PES[id] : undefined;
  if (!p) return null;
  if (p.tipo === 'apoio') return { E: p.E, D: p.D };
  const [cy, cz] = p.eixo;
  // (o nó do pedal gira em x: o pedal de cada lado fica em s·(0, raio·cos, raio·sen))
  const ponto = (s: number): V3 => [s * p.x, cy + s * p.raio * Math.cos(e.pedal) + p.raioPedal, cz + s * p.raio * Math.sin(e.pedal)];
  return { E: ponto(-1), D: ponto(1) };
}

/**
 * Onde as mãos fecham em cada brinquedo (no espaço da prancha, antes da escala do boneco): os
 * punhos do guidão (o patinete, a bicicletinha), os dois lados do volante (o carrinho) e, na nuvem,
 * a almofada da frente. `folga`: o quanto a mão pode ficar longe do ponto (em blocos).
 */
export const GUIDAO: Readonly<Record<IdAndar, { E: V3; D: V3; folga: number }>> = {
  'patinete-luz': { E: [-0.2, 0.71, 0.27], D: [0.2, 0.71, 0.27], folga: 0.07 },
  // (spec 038: o volante um tico mais alto e mais para a frente)
  'carrinho-pedal': { E: [-0.13, 0.62, 0.2], D: [0.13, 0.62, 0.2], folga: 0.07 },
  bicicletinha: {
    E: [-0.21 * BICI, GUIDAO_BICI[1] * BICI, GUIDAO_BICI[2] * BICI],
    D: [0.21 * BICI, GUIDAO_BICI[1] * BICI, GUIDAO_BICI[2] * BICI],
    folga: 0.07,
  },
  'nuvem-fofa': { E: [-0.37, 0.8, 0.1], D: [0.37, 0.8, 0.1], folga: 0.07 },
  // spec 038 (T01): provisório, igual ao do carrinho; a T03 acerta os punhos do guidão da moto
  // (spec 038, T03: as manoplas creme do guidão alto da motoquinha)
  'motoquinha-dourada': {
    E: [-GUIDAO_MOTO[0], GUIDAO_MOTO[1], GUIDAO_MOTO[2]],
    D: [GUIDAO_MOTO[0], GUIDAO_MOTO[1], GUIDAO_MOTO[2]],
    folga: 0.07,
  },
};

// ------------------------------------------------------------------ o estado do andar
/** O que anda de um quadro para o outro (as fases), um por boneco. */
export interface EstadoAndar {
  t: number;
  /** O giro das rodas (rad) e o do pedal (rad). */
  roda: number;
  pedal: number;
  /** Andando (0 a 1, suavizado) e a velocidade (blocos por segundo, suavizada). */
  andando: number;
  vel: number;
  /** Spec 038 (T02): a força do vento na bandeirinha (0 a 1), mais lenta que a velocidade. */
  vento: number;
}

export const estadoAndar = (): EstadoAndar => ({ t: 0, roda: 0, pedal: 0, andando: 0, vel: 0, vento: 0 });

/** A escala do boneco (o plano é medido antes dela: o chão anda em blocos de verdade). */
const ESCALA = 1.15;

/**
 * Um quadro do andar: `vel` é a velocidade da criança (blocos por segundo). As rodas giram pelo
 * caminho andado sobre o raio (nada de roda patinando), o pedal pela volta da roda (a bicicleta
 * numa marcha leve, o carrinho no ritmo do pé).
 */
export function avancarAndar(e: EstadoAndar, id: string, dt: number, vel: number): void {
  if (!ehBrinquedoAndar(id) || dt <= 0) return;
  const m = MONTARIA[id];
  e.t += dt;
  e.vel += (vel - e.vel) * Math.min(1, dt * 8);
  e.andando += ((e.vel > 0.4 ? 1 : 0) - e.andando) * Math.min(1, dt * 6);
  // (o vento chega e vai embora devagar: a bandeirinha nunca dá tranco ao arrancar ou parar)
  e.vento += Math.max(-dt * VENTO_POR_SEGUNDO, Math.min(dt * VENTO_POR_SEGUNDO, Math.min(1, e.vel / 3.2) - e.vento));
  if (m.raioRoda > 0) e.roda = (e.roda + (e.vel / (m.raioRoda * ESCALA)) * dt) % (Math.PI * 2);
  if (id === 'bicicletinha') e.pedal = (e.pedal + (e.vel / (m.raioRoda * ESCALA)) * dt * 0.55) % (Math.PI * 2);
  if (id === 'carrinho-pedal') e.pedal = (e.pedal + e.vel * dt * 2.2) % (Math.PI * 2);
}

/**
 * A altura do meio da bandeirinha no mastro do carrinho (na 036, 0,98): alta como a bandeirinha
 * de bicicleta de criança, acima das asas de borboleta (o pano parado, para o lado, encostava nelas).
 */
const MASTRO_Y = 1.36;
/**
 * O pé do mastro, na quina de trás do carrinho (na 036, 0,28 e -0,52): um tico mais para o lado e
 * para trás, longe das asas do dragãozinho batendo.
 */
const MASTRO_XZ: [number, number] = [0.32, -0.56];

/** Quanto o vento da bandeirinha muda por segundo (0 a 1): leva ~1,1 s para o pano ir para trás. */
const VENTO_POR_SEGUNDO = 0.9;

/**
 * Spec 038 (T02, acerto do filho do dono: "a bandeira não mexe quando o carro anda"): a
 * bandeirinha do carrinho em volta do mastro (rad; 0 é o pano apontando para trás).
 * - **Parada:** o pano aponta para o lado de fora (-90°) e quase não mexe.
 * - **Andando:** o vento leva o pano para trás e para fora, em diagonal: quanto mais rápido, mais
 *   para trás, até uns 53° para fora do carro (`BANDEIRA_ANDANDO`); por cima, o tremular pequeno
 *   (uns 5°, 2 Hz). Portão: reto para trás, o pano apontava para a câmera da criança (atrás dela)
 *   e sumia atrás da cabeça; em diagonal, ele fica sempre à vista.
 * A força vem da velocidade suavizada e muda devagar (`VENTO_POR_SEGUNDO`): a 20 quadros por
 * segundo, nada salta mais que 0,15 rad de um quadro para o outro.
 */
export const BANDEIRA_ANDANDO = -0.92;
export function bandeiraNoVento(e: EstadoAndar): number {
  const forca = e.vento;
  const rumo = -(Math.PI / 2) + (Math.PI / 2 + BANDEIRA_ANDANDO) * forca;
  const quieta = Math.sin(e.t * Math.PI * 2 * 0.55) * 0.04 * (1 - forca);
  const tremula = Math.sin(e.t * Math.PI * 2 * 2 + 1.3) * 0.08 * forca;
  return rumo + quieta + tremula;
}

/** A nuvem sobe e desce devagar (o nó dela e o corpo da criança, juntos). */
export const boiarNuvem = (e: EstadoAndar): number => Math.sin(e.t * 1.6) * (MONTARIA['nuvem-fofa'].flutua ?? 0);

/** O impulso do patinete (0 a 1): a cada 1,3 s, andando, o pé esquerdo empurra o chão. */
export function impulsoPatinete(e: EstadoAndar): number {
  const k = (e.t % 1.3) / 1.3;
  return (k < 0.5 ? Math.sin((k / 0.5) * Math.PI) : 0) * e.andando;
}

// ------------------------------------------------------------------ as peças
const J: Junta = 'prancha';
/** O nó do brinquedo (o desenho acende e apaga ele inteiro ao montar e descer). */
const NO = { subjunta: { nome: 'brinquedo' as const, pivo: [0, 0, 0] as V3 } };
/** Um nó que gira dentro do brinquedo (as rodas, o pedal, a nuvem que boia). */
const giro = (nome: SubjuntaPremium, pivo: V3) => ({ subjunta: { nome, pivo, pai: 'brinquedo' as const } });

/**
 * Um tubo (cilindro) de `a` até `b`: o meio, o comprimento e o giro que leva o eixo y do cilindro
 * para a direção a→b (o Babylon gira em z, depois em x, depois em y).
 */
function tubo(
  P: Pecas,
  nome: string,
  a: V3,
  b: V3,
  r: number,
  cor: string,
  lados?: number,
  no: { subjunta: { nome: SubjuntaPremium; pivo: V3; pai?: 'brinquedo' } } = NO,
): void {
  const d: V3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const l = Math.hypot(d[0], d[1], d[2]);
  const n: V3 = [d[0] / l, d[1] / l, d[2] / l];
  const rz = -Math.asin(Math.max(-1, Math.min(1, n[0])));
  const rx = Math.atan2(n[2], n[1]);
  P.cone(nome, J, undefined, l, r, r, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2], cor, { rot: [rx, 0, rz], ...(lados ? { lados } : {}), ...no });
}

function patinete(P: Pecas): void {
  const VIOLETA = '#7b5cff';
  const VIOLETA_ESC = '#5b40d8';
  const BRANCO = '#f4f6ff';
  const GRAFITE = '#3b3650';
  // o deque baixinho, com a lixa e duas estrelinhas brancas
  P.caixa('andar-patinete-deque', J, undefined, [0.32, 0.055, 0.74], [0, 0.1, -0.03], VIOLETA, 0.027, { brilho: 0.5, ...NO });
  P.caixa('andar-patinete-lixa', J, undefined, [0.27, 0.01, 0.56], [0, 0.131, -0.06], GRAFITE, 0.004, NO);
  for (const [x, z, g] of [
    [0.075, -0.27, 0.3],
    [-0.08, -0.31, -0.5],
  ])
    P.placa(`andar-patinete-estrela${x}`, J, undefined, perfilEstrela(0.035), 0.008, [x, 0.137, z], BRANCO, { rot: [-Math.PI / 2, 0, g], ...NO });
  // o para-lama de trás e o bloco da frente (onde as duas rodas da frente se prendem)
  P.caixa('andar-patinete-paralama', J, undefined, [0.1, 0.03, 0.17], [0, 0.165, -0.37], VIOLETA, 0.015, { rot: [0.3, 0, 0], ...NO });
  P.caixa('andar-patinete-frente', J, undefined, [0.36, 0.07, 0.14], [0, 0.1, 0.3], VIOLETA_ESC, 0.03, NO);
  // a haste, o colar e o guidão com os punhos
  P.cone('andar-patinete-haste', J, undefined, 0.58, 0.032, 0.03, [0, 0.42, 0.29], BRANCO, { brilho: 0.5, ...NO });
  P.caixa('andar-patinete-colar', J, undefined, [0.09, 0.07, 0.09], [0, 0.17, 0.29], VIOLETA, 0.03, NO);
  P.cone('andar-patinete-guidao', J, undefined, 0.5, 0.026, 0.026, [0, 0.71, 0.27], BRANCO, { rot: [0, 0, Math.PI / 2], brilho: 0.5, ...NO });
  P.bola('andar-patinete-trava', J, undefined, 0.045, [0, 0.71, 0.28], VIOLETA_ESC, [1, 1, 1], NO);
  for (const s of [-1, 1]) {
    P.cone(`andar-patinete-punho${s}`, J, undefined, 0.13, 0.04, 0.04, [s * 0.2, 0.71, 0.27], VIOLETA, { rot: [0, 0, Math.PI / 2], ...NO });
    P.bola(`andar-patinete-ponta${s}`, J, undefined, 0.041, [s * 0.265, 0.71, 0.27], VIOLETA_ESC, [0.6, 1, 1], NO);
  }
  // as rodinhas: duas na frente e uma atrás, de luz verde-água mansa, com o miolo branco e a
  // bolinha que mostra que estão girando
  const rodas: Array<[SubjuntaPremium, V3, number[]]> = [
    ['andarRodaF', [0, 0.075, 0.3], [-0.135, 0.135]],
    ['andarRodaT', [0, 0.075, -0.37], [0]],
  ];
  for (const [nome, pivo, xs] of rodas)
    for (const x of xs) {
      const g = giro(nome, pivo);
      P.cone(`andar-patinete-luz-${nome}${x}`, J, undefined, 0.07, 0.075, 0.075, [x, 0, 0], '#5fe8cf', { rot: [0, 0, Math.PI / 2], luz: 'menta', ...g });
      P.cone(`andar-patinete-cubo-${nome}${x}`, J, undefined, 0.076, 0.036, 0.036, [x, 0, 0], BRANCO, { rot: [0, 0, Math.PI / 2], ...g });
      const fora = x === 0 ? 0.04 : Math.sign(x) * 0.04 + x;
      P.bola(`andar-patinete-marca-${nome}${x}`, J, undefined, 0.016, [fora, 0.047, 0], BRANCO, [0.6, 1, 1], g);
      if (x === 0) P.bola(`andar-patinete-marca2-${nome}`, J, undefined, 0.016, [-0.04, -0.047, 0], BRANCO, [0.6, 1, 1], g);
    }
}

function carrinho(P: Pecas): void {
  const AZUL = '#2fb2ea';
  const AZUL_ESC = '#1f86c6';
  const CREME = '#fff3da';
  const AMARELO = '#ffd23a';
  const PNEU = '#35313f';
  const CINZA = '#e6e9f2';
  const LARANJA = '#ff8a3d';
  // o assoalho, as laterais com o friso branco, o capô e a traseira (aberto em cima, sem teto)
  P.caixa('andar-carrinho-assoalho', J, undefined, [0.7, 0.07, 1.06], [0, 0.16, 0.02], AZUL_ESC, 0.03, NO);
  for (const s of [-1, 1]) {
    P.caixa(`andar-carrinho-lado${s}`, J, undefined, [0.1, 0.27, 0.96], [s * 0.34, 0.29, 0.02], AZUL, 0.05, { brilho: 0.5, ...NO });
    P.caixa(`andar-carrinho-friso${s}`, J, undefined, [0.012, 0.045, 0.74], [s * 0.392, 0.32, 0.02], '#ffffff', 0.008, NO);
  }
  // (spec 038: o capô um tico mais curto e o painel na boca dele, para os pés caberem nos pedais
  // embaixo do painel; antes o capô começava em 0,19 e os sapatos saíam por cima dele)
  P.caixa('andar-carrinho-capo', J, undefined, [0.78, 0.3, 0.34], [0, 0.3, 0.46], AZUL, 0.13, { brilho: 0.5, ...NO });
  P.caixa('andar-carrinho-painel', J, undefined, [0.62, 0.1, 0.1], [0, 0.47, 0.31], AZUL_ESC, 0.045, NO);
  P.caixa('andar-carrinho-traseira', J, undefined, [0.78, 0.34, 0.24], [0, 0.3, -0.44], AZUL, 0.11, { brilho: 0.5, ...NO });
  P.caixa('andar-carrinho-parachoque', J, undefined, [0.8, 0.08, 0.08], [0, 0.18, 0.63], CINZA, 0.04, { brilho: 0.5, ...NO });
  P.caixa('andar-carrinho-parachoque2', J, undefined, [0.8, 0.08, 0.08], [0, 0.18, -0.58], CINZA, 0.04, { brilho: 0.5, ...NO });
  // os faróis redondos (luz morna e mansa) com o aro
  for (const s of [-1, 1]) {
    P.bola(`andar-carrinho-farol${s}`, J, undefined, 0.058, [s * 0.22, 0.35, 0.6], '#fff4d0', [1, 1, 0.6], { luz: 'farol', gomos: 10, ...NO });
    P.anel(`andar-carrinho-aro${s}`, J, undefined, 0.13, 0.026, [s * 0.22, 0.35, 0.595], CINZA, { rot: [Math.PI / 2, 0, 0], brilho: 0.5, lados: 14, ...NO });
  }
  // o banco creme com o encosto
  P.caixa('andar-carrinho-assento', J, undefined, [0.52, 0.07, 0.32], [0, 0.22, -0.16], CREME, 0.03, NO);
  P.caixa('andar-carrinho-encosto', J, undefined, [0.52, 0.28, 0.07], [0, 0.4, -0.33], CREME, 0.03, NO);
  // o volante na frente da criança (spec 038: um tico mais alto e mais para a frente, para os
  // joelhos dobrados passarem por baixo dele)
  tubo(P, 'andar-carrinho-coluna', [0, 0.47, 0.32], [0, 0.6, 0.2], 0.022, CINZA, 8);
  P.anel('andar-carrinho-volante', J, undefined, 0.27, 0.04, [0, 0.61, 0.19], '#3c3a48', { rot: [-0.95, 0, 0], lados: 16, ...NO });
  P.bola('andar-carrinho-buzina', J, undefined, 0.045, [0, 0.615, 0.195], AMARELO, [1, 0.55, 1], { rot: [-0.95, 0, 0], gomos: 8, ...NO });
  // a bandeirinha laranja atrás; spec 038 (T02, pedido do filho): num nó próprio no alto do
  // mastro, que vai para trás com o vento do andar (`bandeiraNoVento`). O mastro mais alto:
  // parada, o pano para o lado passa por cima das asas de borboleta
  const [mx, mz] = MASTRO_XZ;
  tubo(P, 'andar-carrinho-mastro', [mx, 0.44, mz], [mx, MASTRO_Y + 0.07, mz], 0.012, CINZA, 6);
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
    [0, 0, 0],
    LARANJA,
    { rot: [0, Math.PI / 2, 0], ...giro('andarBandeira', [mx, MASTRO_Y, mz]) },
  );
  // spec 038 (T02): os pedais de verdade embaixo do painel: o eixo e os mancais, e no nó que gira
  // a pedivela e o pedal redondo de cada lado (os pés giram com eles)
  const pe = PEDAL_CARRINHO as Extract<Pes, { tipo: 'pedal' }>;
  const eixo: V3 = [0, pe.eixo[0], pe.eixo[1]];
  for (const s of [-1, 1]) P.caixa(`andar-carrinho-mancal${s}`, J, undefined, [0.04, 0.12, 0.06], [s * 0.21, 0.27, eixo[2] + 0.01], AZUL_ESC, 0.015, NO);
  const gp = giro('andarPedal', eixo);
  P.cone('andar-carrinho-eixo', J, undefined, 0.42, 0.014, 0.014, [0, 0, 0], CINZA, { rot: [0, 0, Math.PI / 2], lados: 6, ...gp });
  for (const s of [-1, 1]) {
    P.caixa(`andar-carrinho-pedivela${s}`, J, undefined, [0.022, pe.raio + 0.03, 0.026], [s * 0.07, (s * pe.raio) / 2, 0], CINZA, 0.008, gp);
    P.cone(`andar-carrinho-pedal${s}`, J, undefined, 0.075, pe.raioPedal, pe.raioPedal, [s * pe.x, s * pe.raio, 0], '#3c3a48', {
      rot: [0, 0, Math.PI / 2],
      lados: 8,
      ...gp,
    });
  }
  // as quatro rodas (pneu, a calota amarela e o parafuso que mostra o giro)
  for (const [nome, z] of [
    ['andarRodaF', 0.38],
    ['andarRodaT', -0.34],
  ] as const) {
    const g = giro(nome, [0, 0.13, z]);
    for (const s of [-1, 1]) {
      P.cone(`andar-carrinho-pneu-${nome}${s}`, J, undefined, 0.1, 0.13, 0.13, [s * 0.4, 0, 0], PNEU, { rot: [0, 0, Math.PI / 2], lados: 12, ...g });
      P.cone(`andar-carrinho-calota-${nome}${s}`, J, undefined, 0.106, 0.065, 0.065, [s * 0.4, 0, 0], AMARELO, { rot: [0, 0, Math.PI / 2], brilho: 0.5, lados: 10, ...g });
      P.bola(`andar-carrinho-parafuso-${nome}${s}`, J, undefined, 0.018, [s * 0.455, 0.035, 0], '#ffffff', [0.6, 1, 1], { gomos: 6, ...g });
    }
  }
}

function bicicleta(P: Pecas): void {
  const MENTA = '#34c995';
  const MENTA_ESC = '#22a477';
  const CREME = '#fff3da';
  const PNEU = '#3a3644';
  const CARAMELO = '#d8a15a';
  const ROSA = '#ff8fbf';
  const PRATA = '#dfe3ee';
  const k = BICI;
  const K = (v: V3): V3 => [v[0] * k, v[1] * k, v[2] * k];
  const R = 0.2 * k;
  // (spec 038, T02: a medida que deixa o pé alcançar o pedal em todos os modelos: o selim mais
  // baixo, o eixo do pedal mais alto e mais perto do quadril, a pedivela mais curta e o pedal
  // redondo; a roda de trás um tico para trás, longe do quadril. As cores e os detalhes são os
  // mesmos da 036)
  const pe = PES.bicicletinha as Extract<Pes, { tipo: 'pedal' }>;
  const tras = K([0, 0.2, -0.27]);
  const frente = K([0, 0.2, 0.56]);
  const pedal: V3 = [0, pe.eixo[0], pe.eixo[1]];
  const selimY = SELIM_BICI - 0.03;
  tubo(P, 'andar-bici-canote', pedal, K([0, selimY + 0.02, -0.01]), 0.028 * k, MENTA, 8);
  tubo(P, 'andar-bici-baixo-tras', tras, pedal, 0.022 * k, MENTA, 8);
  tubo(P, 'andar-bici-cima-tras', tras, K([0, selimY - 0.02, -0.005]), 0.02 * k, MENTA, 8);
  tubo(P, 'andar-bici-diagonal', pedal, K([0, 0.56, 0.45]), 0.03 * k, MENTA, 8);
  tubo(P, 'andar-bici-cima', K([0, selimY - 0.01, 0]), K([0, 0.6, 0.45]), 0.026 * k, MENTA, 8);
  tubo(P, 'andar-bici-garfo', frente, K([0, 0.78, 0.42]), 0.025 * k, MENTA_ESC, 8);
  P.cone('andar-bici-caixa', J, undefined, 0.16 * k, 0.034 * k, 0.034 * k, K([0, 0.6, 0.47]), MENTA_ESC, { rot: [-0.2, 0, 0], lados: 8, ...NO });
  // as rodas: pneu, raios e o miolo (gira inteira no nó dela)
  for (const [nome, c] of [
    ['andarRodaT', tras],
    ['andarRodaF', frente],
  ] as const) {
    const g = giro(nome, c);
    P.anel(`andar-bici-pneu-${nome}`, J, undefined, R * 2 - 0.06 * k, 0.065 * k, [0, 0, 0], PNEU, { rot: [0, 0, Math.PI / 2], lados: 16, ...g });
    P.anel(`andar-bici-aro-${nome}`, J, undefined, R * 2 - 0.13 * k, 0.02 * k, [0, 0, 0], CREME, { rot: [0, 0, Math.PI / 2], lados: 14, ...g });
    for (let i = 0; i < 3; i++)
      P.caixa(`andar-bici-raio-${nome}${i}`, J, undefined, [0.014, R * 2 - 0.14 * k, 0.014], [0, 0, 0], CREME, 0.005, { rot: [(i * Math.PI) / 3, 0, 0], ...g });
    P.cone(`andar-bici-cubo-${nome}`, J, undefined, 0.07 * k, 0.035 * k, 0.035 * k, [0, 0, 0], MENTA_ESC, { rot: [0, 0, Math.PI / 2], lados: 8, ...g });
  }
  // o guidão com os punhos rosa e a campainha
  // (T05, acerto do dono: o guidão um tico para trás e para baixo, com a mesa saindo do garfo, para
  // as mãos da criança alcançarem os punhos; spec 038: mais baixo, junto com o selim)
  const [, gy, gz] = GUIDAO_BICI;
  tubo(P, 'andar-bici-mesa', K([0, 0.78, 0.42]), K([0, gy, gz]), 0.022 * k, MENTA_ESC, 8);
  P.cone('andar-bici-guidao', J, undefined, 0.5 * k, 0.022 * k, 0.022 * k, K([0, gy, gz]), PRATA, { rot: [0, 0, Math.PI / 2], brilho: 0.5, lados: 8, ...NO });
  for (const s of [-1, 1]) {
    P.cone(`andar-bici-punho${s}`, J, undefined, 0.12 * k, 0.034 * k, 0.034 * k, K([s * 0.21, gy, gz]), ROSA, { rot: [0, 0, Math.PI / 2], lados: 10, ...NO });
    P.bola(`andar-bici-ponta${s}`, J, undefined, 0.036 * k, K([s * 0.275, gy, gz]), ROSA, [0.6, 1, 1], { gomos: 8, ...NO });
  }
  P.bola('andar-bici-campainha', J, undefined, 0.032 * k, K([-0.13, gy + 0.035, gz]), '#ffc93d', [1, 0.6, 1], { brilho: 0.8, gomos: 8, ...NO });
  // o selim creme
  P.caixa('andar-bici-selim', J, undefined, [0.18 * k, 0.06 * k, 0.26 * k], K([0, selimY, -0.01]), CREME, 0.03 * k, NO);
  // a cestinha de vime com a flor
  P.caixa('andar-bici-cesta', J, undefined, [0.3 * k, 0.17 * k, 0.2 * k], K([0, 0.7, 0.6]), CARAMELO, 0.035 * k, NO);
  P.caixa('andar-bici-cesta-borda', J, undefined, [0.32 * k, 0.03 * k, 0.22 * k], K([0, 0.785, 0.6]), misturarCor(CARAMELO, '#7a4e2a', 0.4), 0.015, NO);
  for (const y of [0.66, 0.72])
    P.caixa(`andar-bici-cesta-fio${y}`, J, undefined, [0.305 * k, 0.012, 0.205 * k], K([0, y, 0.6]), misturarCor(CARAMELO, '#ffffff', 0.35), 0.005, NO);
  P.bola('andar-bici-flor', J, undefined, 0.05 * k, K([0.06, 0.81, 0.6]), ROSA, [1, 1, 0.7], { gomos: 8, ...NO });
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    P.bola(`andar-bici-petala${i}`, J, undefined, 0.032 * k, K([0.06 + Math.cos(a) * 0.045, 0.81 + Math.sin(a) * 0.045, 0.6]), ROSA, [1, 1, 0.5], { gomos: 8, ...NO });
  }
  P.bola('andar-bici-miolo', J, undefined, 0.025 * k, K([0.06, 0.81, 0.625]), '#ffd23a', [1, 1, 0.6], { gomos: 8, ...NO });
  P.placa('andar-bici-folha', J, undefined, perfilFolha(0.08 * k), 0.012, K([-0.04, 0.8, 0.6]), '#4cc26a', { rot: [0, 0, 0.8], ...NO });
  // o pedal (gira no nó dele): a coroa, a pedivela curta e o pedal redondo
  const gp = giro('andarPedal', pedal);
  P.cone('andar-bici-coroa', J, undefined, 0.02 * k, 0.06 * k, 0.06 * k, [0.045 * k, 0, 0], MENTA_ESC, { rot: [0, 0, Math.PI / 2], lados: 10, ...gp });
  for (const s of [-1, 1]) {
    P.caixa(`andar-bici-pedivela${s}`, J, undefined, [0.026 * k, pe.raio + 0.03, 0.03 * k], [s * 0.065 * k, (s * pe.raio) / 2, 0], PRATA, 0.01, gp);
    P.cone(`andar-bici-pedal${s}`, J, undefined, 0.085 * k, pe.raioPedal, pe.raioPedal, [s * pe.x, s * pe.raio, 0], '#3c3a48', {
      rot: [0, 0, Math.PI / 2],
      lados: 8,
      ...gp,
    });
  }
  // as rodinhas de apoio, atrás (as duas no mesmo eixo: um nó só gira as duas, uma malha a menos)
  const gr = giro('andarRodinhaE', K([0, 0.08, -0.27]));
  for (const s of [-1, 1]) {
    const c = K([s * 0.22, 0.08, -0.27]);
    tubo(P, `andar-bici-apoio${s}`, c, K([s * 0.03, 0.2, -0.27]), 0.014 * k, PRATA, 6);
    const x = s * 0.22 * k;
    P.cone(`andar-bici-rodinha${s}`, J, undefined, 0.045 * k, 0.08 * k, 0.08 * k, [x, 0, 0], CREME, { rot: [0, 0, Math.PI / 2], lados: 10, ...gr });
    P.cone(`andar-bici-rodinha-cubo${s}`, J, undefined, 0.05 * k, 0.03 * k, 0.03 * k, [x, 0, 0], MENTA, { rot: [0, 0, Math.PI / 2], lados: 8, ...gr });
    P.bola(`andar-bici-rodinha-marca${s}`, J, undefined, 0.012 * k, [x + s * 0.024 * k, 0.05 * k, 0], MENTA_ESC, [0.6, 1, 1], { gomos: 6, ...gr });
  }
}

// ------------------------------------------------------------------ a motoquinha dourada
/**
 * Spec 038 (T03): a motoquinha dourada (pedido do filho do dono), saída do esboço aprovado: a moto
 * de brinquedo de criança, gordinha e baixa, com o tanque e a estrela, o farol redondo, o guidão
 * alto com as manoplas creme, o escapamento curtinho e os para-lamas em dois gomos; sem rodinhas
 * de apoio desde 27 nov (o filho do dono queria sem), com o descansinho de lado. Original, sem cara
 * de marca ou de modelo; sem espelhinhos (de frente pareciam dragonas).
 * O ouro é um amarelo quente e fundo com o ouro escuro embaixo e o reflexo lustroso; só o farol
 * acende, com a luz mansa do farol do carrinho.
 */
function moto(P: Pecas): void {
  const OURO = '#e8b03c';
  const OURO_ESC = '#c4871f';
  const OURO_CLARO = '#ffd97a';
  const CREME = '#fff3da';
  const PNEU = '#3a3644';
  const PRATA = '#cfc8bc';
  const CORAL = '#ff8a7a';
  const R = RODA_MOTO;
  const tras: V3 = [0, R, -0.4];
  const frente: V3 = [0, R, 0.5];
  const deitado: V3 = [0, 0, Math.PI / 2];
  // o motor (a barriga da moto), os cilindros e o quadro até a roda de trás
  P.caixa('andar-moto-motor', J, undefined, [0.2, 0.2, 0.38], [0, 0.32, 0.06], OURO_ESC, 0.08, NO);
  for (const s of [-1, 1]) {
    // (portão: o cilindro claro, logo embaixo do pé, parecia uma rodinha de apoio branca; agora é
    // ouro escuro e menor, colado no motor)
    P.bola(`andar-moto-cilindro${s}`, J, undefined, 0.06, [s * 0.09, 0.27, 0.06], OURO_ESC, [0.6, 1, 1], { gomos: 10, ...NO });
    tubo(P, `andar-moto-balanca${s}`, [s * 0.075, 0.3, -0.06], [s * 0.075, R, tras[2]], 0.026, OURO_ESC, 8);
  }
  // o tanque gordinho na frente do banco, com a estrela creme de cada lado
  P.caixa('andar-moto-tanque', J, undefined, [0.24, 0.17, 0.3], [0, 0.5, 0.27], OURO, 0.08, { rot: [-0.12, 0, 0], ...NO });
  P.caixa('andar-moto-tampa', J, undefined, [0.07, 0.025, 0.07], [0, 0.6, 0.24], OURO_CLARO, 0.02, NO);
  for (const s of [-1, 1])
    P.placa(`andar-moto-estrela${s}`, J, undefined, perfilEstrela(0.06), 0.012, [s * 0.122, 0.5, 0.28], CREME, { rot: [0, (s * Math.PI) / 2, 0], ...NO });
  // o banco creme comprido e a rabeta dourada com a lanterninha
  P.caixa('andar-moto-banco', J, undefined, [0.24, 0.08, 0.46], [0, BANCO_MOTO - 0.04, -0.08], CREME, 0.04, NO);
  P.caixa('andar-moto-rabeta', J, undefined, [0.22, 0.12, 0.2], [0, 0.45, -0.38], OURO, 0.06, NO);
  P.bola('andar-moto-lanterna', J, undefined, 0.04, [0, 0.46, -0.485], CORAL, [1, 0.8, 0.5], { gomos: 8, ...NO });
  // os para-lamas em dois gomos cada, acompanhando a roda (inteiros e retos, pareciam uma tábua)
  for (const [nome, z0] of [
    ['t', tras[2]],
    ['f', frente[2]],
  ] as const)
    for (const ang of [0.32, -0.32])
      P.caixa(`andar-moto-paralama-${nome}${ang}`, J, undefined, [0.16, 0.04, 0.15], [0, R + 0.235 * Math.cos(ang), z0 + 0.235 * Math.sin(ang)], OURO, 0.02, {
        rot: [ang, 0, 0],
        ...NO,
      });
  // o garfo, o farol redondo com o aro e a caixinha, e o guidão alto com as manoplas creme
  for (const s of [-1, 1]) tubo(P, `andar-moto-garfo${s}`, [s * 0.085, R, frente[2]], [s * 0.07, 0.7, 0.4], 0.028, OURO_ESC, 8);
  P.caixa('andar-moto-mesa', J, undefined, [0.2, 0.08, 0.1], [0, 0.72, 0.4], OURO_ESC, 0.035, NO);
  P.bola('andar-moto-farol', J, undefined, 0.085, [0, 0.66, 0.5], '#fff4d0', [1, 1, 0.55], { luz: 'farol', gomos: 12, ...NO });
  P.anel('andar-moto-farol-aro', J, undefined, 0.19, 0.035, [0, 0.66, 0.49], OURO_CLARO, { rot: [Math.PI / 2, 0, 0], lados: 14, ...NO });
  P.caixa('andar-moto-farol-caixa', J, undefined, [0.17, 0.15, 0.1], [0, 0.66, 0.43], OURO, 0.07, NO);
  const [gx, gy, gz] = GUIDAO_MOTO;
  tubo(P, 'andar-moto-coluna', [0, 0.74, 0.4], [0, gy, gz], 0.024, PRATA, 8);
  P.cone('andar-moto-guidao', J, undefined, 0.46, 0.024, 0.024, [0, gy, gz], PRATA, { rot: deitado, lados: 8, ...NO });
  for (const s of [-1, 1]) {
    P.cone(`andar-moto-manopla${s}`, J, undefined, 0.11, 0.036, 0.036, [s * gx, gy, gz], CREME, { rot: deitado, lados: 10, ...NO });
    P.bola(`andar-moto-manopla-ponta${s}`, J, undefined, 0.038, [s * (gx + 0.058), gy, gz], OURO_ESC, [0.6, 1, 1], { gomos: 8, ...NO });
  }
  // o escapamento curtinho, dourado escuro, do lado direito
  P.cone('andar-moto-escape', J, undefined, 0.28, 0.035, 0.042, [0.14, 0.26, -0.24], OURO_ESC, { rot: [Math.PI / 2 + 0.12, 0, 0], lados: 10, ...NO });
  P.bola('andar-moto-escape-ponta', J, undefined, 0.044, [0.14, 0.276, -0.38], '#8c8478', [1, 1, 0.5], { gomos: 8, ...NO });
  // os apoios dos pés (onde os sapatos descansam), no alto deles fica o ponto dos pés
  const apoios = PES['motoquinha-dourada'] as Extract<Pes, { tipo: 'apoio' }>;
  for (const [s, a] of [
    [-1, apoios.E],
    [1, apoios.D],
  ] as const) {
    // (portão: o apoio mais largo e mais grosso, para se ver de lado embaixo do sapato)
    P.caixa(`andar-moto-apoio${s}`, J, undefined, [0.13, 0.05, 0.15], [a[0], a[1] - 0.025, a[2]], PNEU, 0.018, NO);
    tubo(P, `andar-moto-apoio-haste${s}`, [s * 0.09, a[1] - 0.03, a[2]], [a[0] - s * 0.05, a[1] - 0.03, a[2]], 0.022, OURO_ESC, 6);
  }
  // as rodas gordinhas (o pneu, a calota dourada, o miolo e a marquinha que mostra o giro)
  for (const [no, c, largura] of [
    ['andarRodaT', tras, 0.14],
    ['andarRodaF', frente, 0.12],
  ] as const) {
    const g = giro(no, c);
    P.cone(`andar-moto-pneu-${no}`, J, undefined, largura, R, R, [0, 0, 0], PNEU, { rot: deitado, lados: 14, ...g });
    P.cone(`andar-moto-calota-${no}`, J, undefined, largura + 0.008, R * 0.56, R * 0.56, [0, 0, 0], OURO_CLARO, { rot: deitado, lados: 12, ...g });
    const fora = largura / 2 + 0.006;
    for (const s of [-1, 1]) {
      P.bola(`andar-moto-miolo-${no}${s}`, J, undefined, R * 0.2, [s * fora, 0, 0], OURO_ESC, [0.45, 1, 1], { gomos: 8, ...g });
      P.bola(`andar-moto-marca-${no}${s}`, J, undefined, R * 0.09, [s * fora, R * 0.36, 0], '#ffffff', [0.5, 1, 1], { gomos: 6, ...g });
    }
  }
  // sem rodinhas de apoio (pedido do filho do dono, 27 nov): o descansinho de ouro escuro do lado
  // esquerdo, preso embaixo do motor. Parada, ele desce até o chão e a moto inclina um tico para o
  // lado dele; andando, ele gira para trás e fica deitado junto do quadro (`descansoDaMoto`)
  const gd = giro('andarDescanso', DESCANSO_PIVO);
  const pe = DESCANSO_PE;
  tubo(P, 'andar-moto-descanso', [0, 0, 0], pe, 0.02, OURO_ESC, 6, gd);
  P.caixa('andar-moto-descanso-pe', J, undefined, [0.07, 0.025, 0.09], [pe[0], pe[1] + 0.0125, pe[2]], OURO_ESC, 0.01, gd);
}

/** O pivô do descansinho (no espaço do brinquedo) e o pé dele, a partir do pivô, descido. */
const DESCANSO_PIVO: V3 = [-0.1, 0.24, -0.1];
const DESCANSO_PE: V3 = [-0.13, -0.24 + 0.012, -0.09];
/** Recolhido, o giro dele (rad, para trás) e, parada, a moto inclinada para o lado dele (rad). */
export const DESCANSO_RECOLHIDO = 1.35;
export const INCLINA_NO_DESCANSO = 0.06;

/**
 * O descansinho da motoquinha e a inclinação dela (0 andando; parada, a moto e a criança em cima
 * inclinam juntas para a esquerda), pelo "andando" suavizado: sem tranco ao arrancar e ao parar.
 */
export function descansoDaMoto(e: EstadoAndar): { giro: number; inclina: number } {
  const a = Math.max(0, Math.min(1, e.andando));
  return { giro: DESCANSO_RECOLHIDO * a, inclina: INCLINA_NO_DESCANSO * (1 - a) };
}

function nuvem(P: Pecas): void {
  const B = '#ffffff';
  const B2 = '#f1f4ff';
  const B3 = '#dfe6ff';
  // a almofada de nuvem: bolinhas fofas juntas, o fundo um tico azulado, o encosto atrás e as
  // duas bochechas na frente onde as pernas descansam (tudo no nó do brinquedo, que boia inteiro:
  // uma malha só)
  const bolas: Array<[number, number, number, number, string]> = [
    [0, 0.36, 0, 0.34, B],
    [-0.31, 0.35, 0.06, 0.25, B],
    [0.31, 0.35, 0.06, 0.25, B],
    [0, 0.34, 0.38, 0.26, B],
    [-0.27, 0.33, 0.38, 0.19, B2],
    [0.27, 0.33, 0.38, 0.19, B2],
    [0, 0.35, -0.36, 0.27, B],
    [-0.28, 0.34, -0.3, 0.21, B2],
    [0.28, 0.34, -0.3, 0.21, B2],
    [-0.17, 0.52, -0.33, 0.19, B],
    [0.17, 0.52, -0.33, 0.19, B],
    [0, 0.58, -0.4, 0.2, B],
    // (T05: os dois bracinhos da poltrona de nuvem, onde as mãos descansam)
    [-0.37, 0.66, 0.1, 0.16, B],
    [0.37, 0.66, 0.1, 0.16, B],
    [-0.15, 0.47, 0.47, 0.15, B],
    [0.15, 0.47, 0.47, 0.15, B],
    [0, 0.21, 0.02, 0.29, B3],
    [-0.26, 0.23, 0.14, 0.18, B3],
    [0.26, 0.23, 0.14, 0.18, B3],
    [0, 0.22, -0.3, 0.2, B3],
  ];
  bolas.forEach(([x, y, z, r, cor], i) => P.bola(`andar-nuvem-fofo${i}`, J, undefined, r, [x, y, z], cor, [1, 0.78, 1], { brilho: 0.15, ...NO }));
}

/**
 * As peças do brinquedo de andar vestido, todas na junta `prancha`: no nó `brinquedo` (que só
 * aparece com a criança montada) ou num nó que gira dentro dele.
 */
export function vestirBrinquedoAndar(id: string, lista: Peca[]): void {
  if (!ehBrinquedoAndar(id)) return;
  const antes = lista.length;
  const P = new Pecas(lista);
  if (id === 'patinete-luz') patinete(P);
  else if (id === 'carrinho-pedal') carrinho(P);
  else if (id === 'bicicletinha') bicicleta(P);
  else if (id === 'motoquinha-dourada') moto(P);
  else nuvem(P);
  // desempenho (T05, a meta da spec: no máximo +20 chamadas de desenho com 4 amigos montados):
  // cada nó leva uma malha por brilho; o brinquedo inteiro num brilho só (o acetinado, o mesmo
  // degrau dos tesouros) deixa uma malha por nó, e a luz das rodinhas e dos faróis à parte.
  // (spec 038: a motoquinha inteira no lustroso, o reflexo do ouro; a nuvem fosca)
  const brilho = id === 'nuvem-fofa' ? 0.15 : id === 'motoquinha-dourada' ? 0.8 : 0.45;
  for (let i = antes; i < lista.length; i++) if (!lista[i].luz) lista[i].brilho = brilho;
}

/** Os nós que giram dentro do brinquedo (o desenho gira; os testes conferem). */
export const NOS_DO_ANDAR: readonly SubjuntaPremium[] = ['andarRodaF', 'andarRodaT', 'andarRodinhaE', 'andarPedal', 'andarBandeira', 'andarDescanso'];

/**
 * A pose de quem está montada: o corpo na altura do brinquedo, as pernas (de pé no deque com o
 * impulso, ou sentada no pedal) e as mãos no guidão. Durante um gesto, o gesto manda nos braços
 * (montada, a criança faz tudo). Muda `alvo` no lugar. Sem `e` (o estado do andar), parada.
 */
export function poseNoBrinquedo(id: string, alvo: RotacoesPose, pose: Pose, e?: EstadoAndar): void {
  if (!ehBrinquedoAndar(id)) return;
  const m = MONTARIA[id];
  alvo.corpoY = m.corpoY + (m.flutua && e ? boiarNuvem(e) : 0);
  alvo.escala = 1;
  const ped = e ? m.pedal * Math.sin(e.pedal) : 0;
  let pernaE = m.perna - ped;
  let pernaD = m.perna + ped;
  let troncoX = m.troncoX;
  if (id === 'patinete-luz' && e) {
    // andando, o impulso com o pé esquerdo; parado, o pé esquerdo descansa um tico para trás
    const chuta = impulsoPatinete(e);
    pernaE = 0.62 * chuta + 0.28 * (1 - e.andando);
    pernaD = -0.06 * chuta;
    troncoX += 0.1 * chuta;
  }
  alvo.pernaD = [pernaD, 0, 0];
  alvo.pernaE = [pernaE, 0, 0];
  // (T05, acerto do dono: o volante parecia mexer a cada passo. Era o corpo de quem anda a pé:
  // o tronco torcendo para um lado e para o outro a cada passo e o corpo inclinando na corrida,
  // levando os braços junto. Montada, quem anda é o brinquedo: o tronco e o corpo ficam firmes)
  alvo.tronco = [troncoX, 0, 0];
  alvo.corpo = [0, 0, 0];
  const w = 1 - Math.min(1, Math.max(0, (pose.pesoGesto ?? 0) / 0.3));
  if (w <= 0) return;
  const mistura = (a: V3, b: V3): V3 => [a[0] + (b[0] - a[0]) * w, a[1] + (b[1] - a[1]) * w, a[2] + (b[2] - a[2]) * w];
  alvo.bracoD = mistura(alvo.bracoD, [m.bracoX, 0, 0.06 + m.bracoAbre]);
  alvo.bracoE = mistura(alvo.bracoE, [m.bracoX, 0, -0.06 - m.bracoAbre]);
}

/** O raio de cada roda no mundo (a roda anda o caminho sem patinar). */
export const raioDaRoda = (id: IdAndar): number => MONTARIA[id].raioRoda * ESCALA;
