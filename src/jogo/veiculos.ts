/**
 * Carrinhos e ônibus da Cidade Grande (spec 014, T13): o que o núcleo (servidor e modo local)
 * e o cliente fazem igual. A frota, as medidas de cada modelo, as voltas (rotas fechadas do
 * grafo de pistas do planejador, com as curvas em arco dentro do asfalto do cruzamento), a
 * pose de um ponto da volta e o movimento em uma dimensão: cada veículo anda pela distância
 * `s` ao longo da volta, num plano de aceleração constante até uma velocidade final
 * (`PlanoVeiculo`). O núcleo manda um plano novo só quando o veículo muda de jeito (freia,
 * para, sai); o cliente calcula a posição entre um plano e outro com a mesma conta.
 *
 * Eixos do mundo: andando em +z, a direita é +x (mão da direita). A curva à direita é um arco
 * de raio 1 em volta da quina da calçada; a curva à esquerda, um arco de raio 3 que cruza a
 * mão de lá. As duas começam e terminam na borda da caixa de asfalto 4 × 4 do cruzamento.
 */
import {
  LARG_RUA,
  PASSO_AVENIDA,
  PASSO_RUA,
  Solo,
  soloDaCidade,
  soloDePista,
  type PlanoCidade,
  type Retangulo,
} from '../world/cidade';

// ------------------------------------------------------------------ a frota

export type TipoVeiculo = 'taxi' | 'civil' | 'policia' | 'onibusAzul' | 'onibusVerde' | 'sorvete';
export type ModeloVeiculo = 'carro' | 'onibus' | 'sorvete';

export const MODELO_DO_TIPO: Record<TipoVeiculo, ModeloVeiculo> = {
  taxi: 'carro',
  civil: 'carro',
  policia: 'carro',
  onibusAzul: 'onibus',
  onibusVerde: 'onibus',
  sorvete: 'sorvete',
};

/**
 * Medidas de cada modelo já na escala do jogo. O esboço aprovado (versão 3, com carinha) foi
 * feito numa escala só; aqui cada modelo encolhe por igual (`escala`) para a caixa inteira
 * caber na faixa de 2 blocos com um quarto de bloco de folga para o meio-fio (meia largura
 * até 0,75), e as rodas ficam rentes à carroceria.
 */
export interface MedidasVeiculo {
  escala: number;
  /** Meio comprimento e meia largura da caixa (rodas, olhinhos e para-choques dentro). */
  meioComp: number;
  meiaLarg: number;
  /** Altura do teto (até onde o boneco esbarra). */
  altura: number;
  /** As rodas: x de cada eixo, z de cada lado e o raio (já na escala). */
  eixos: number[];
  bitola: number;
  raioRoda: number;
  /**
   * Caixas sólidas para o boneco, no espaço do veículo (x para a frente, z para o lado, y do
   * chão): [x0, x1, meia largura, altura]. A de baixo dá para alcançar no pulo (o capô do
   * carro e do sorvete) e dela se sobe na de cima.
   */
  caixas: [number, number, number, number][];
  /**
   * Meia distância entre os dois pontos do caminho que a carroceria segue (as rodas de trás e
   * da frente; no ônibus, menos que o entre-eixos: a ponta de trás não corta a quina).
   */
  apoio?: number;
}

export const MEDIDAS: Record<ModeloVeiculo, MedidasVeiculo> = {
  // carroceria 2,8 × 1,62 com os olhinhos e as lanternas: x de -1,48 a 1,5; teto 2,04
  carro: {
    escala: 0.9,
    meioComp: 1.36,
    meiaLarg: 0.74,
    altura: 1.84,
    eixos: [-0.81, 0.81],
    bitola: 0.594,
    raioRoda: 0.423,
    caixas: [
      [-1.33, 1.33, 0.72, 1.12],
      [-1.06, 0.6, 0.6, 1.8],
    ],
    // na curva à direita (raio 1) o meio do carro não corta a quina
    apoio: 0.55,
  },
  // 5,4 × 2,0 (rodas em ±0,8): de -2,78 a 2,81; o letreiro em cima a 2,77
  onibus: {
    escala: 0.75,
    meioComp: 2.12,
    meiaLarg: 0.75,
    altura: 2.0,
    eixos: [-1.31, 1.31],
    bitola: 0.6,
    raioRoda: 0.39,
    caixas: [[-2.05, 2.05, 0.73, 1.98]],
    // o ônibus só faz curvas à direita (no arco de raio 1 a traseira comprida não corta a quina)
    apoio: 0.6,
  },
  // 3,4 × 1,7 com o capô na frente: de -1,7 a 1,83; a casquinha em cima a 3,8
  sorvete: {
    escala: 0.86,
    meioComp: 1.53,
    meiaLarg: 0.73,
    altura: 1.8,
    eixos: [-0.9, 0.95],
    bitola: 0.6,
    raioRoda: 0.36,
    caixas: [
      [0.62, 1.5, 0.68, 1.06],
      [-1.46, 0.62, 0.72, 1.62],
    ],
    // na curva à esquerda (raio 3) a traseira não abre por cima da calçada
    apoio: 0.7,
  },
};

/** Volta retangular em volta dos quarteirões [bi0..bi1] × [bj0..bj1]. */
export interface Volta {
  bi0: number;
  bj0: number;
  bi1: number;
  bj1: number;
  /**
   * 'horario': só curvas à direita, nas faixas coladas nos quarteirões; 'anti': só curvas à
   * esquerda, nas faixas do outro lado da rua.
   */
  sentido: 'horario' | 'anti';
}

export interface DefVeiculo {
  id: number;
  tipo: TipoVeiculo;
  /** Cor do carro comum (as quatro aprovadas). */
  cor?: string;
  volta: Volta;
  /** Fração da volta onde nasce (o relógio do mundo soma a isto). */
  fase: number;
}

/** As quatro cores aprovadas do carro comum: coral, verde-água, lilás e laranja. */
export const CORES_CIVIL = ['#ff7a6b', '#6fd3b0', '#b79cf2', '#ffa94d'] as const;

/**
 * A frota de cada cidade: 2 táxis, 4 carros comuns (um de cada cor), a polícia, os dois
 * ônibus (cada um na sua volta) e o carrinho de sorvete, que dá a volta do quarteirão da
 * praça e para na vaga da beira do parque. A polícia passa na frente da praça na mão de cá
 * (a da vaga é só do sorvete).
 */
export const FROTA: readonly DefVeiculo[] = [
  { id: 0, tipo: 'sorvete', volta: { bi0: 1, bj0: 1, bi1: 1, bj1: 1, sentido: 'anti' }, fase: 0 },
  {
    id: 1,
    tipo: 'policia',
    volta: { bi0: 1, bj0: 1, bi1: 2, bj1: 1, sentido: 'horario' },
    fase: 0.4,
  },
  {
    id: 2,
    tipo: 'onibusAzul',
    volta: { bi0: 1, bj0: 4, bi1: 1, bj1: 4, sentido: 'horario' },
    fase: 0.1,
  },
  {
    id: 3,
    tipo: 'onibusVerde',
    volta: { bi0: 2, bj0: 4, bi1: 3, bj1: 4, sentido: 'horario' },
    fase: 0.6,
  },
  { id: 4, tipo: 'taxi', volta: { bi0: 0, bj0: 1, bi1: 0, bj1: 2, sentido: 'horario' }, fase: 0.2 },
  { id: 5, tipo: 'taxi', volta: { bi0: 2, bj0: 0, bi1: 3, bj1: 0, sentido: 'anti' }, fase: 0.7 },
  {
    id: 6,
    tipo: 'civil',
    cor: CORES_CIVIL[0],
    volta: { bi0: 3, bj0: 1, bi1: 3, bj1: 2, sentido: 'horario' },
    fase: 0.3,
  },
  {
    id: 7,
    tipo: 'civil',
    cor: CORES_CIVIL[1],
    volta: { bi0: 0, bj0: 3, bi1: 0, bj1: 4, sentido: 'anti' },
    fase: 0.5,
  },
  {
    id: 8,
    tipo: 'civil',
    cor: CORES_CIVIL[2],
    volta: { bi0: 1, bj0: 0, bi1: 2, bj1: 0, sentido: 'horario' },
    fase: 0.8,
  },
  {
    id: 9,
    tipo: 'civil',
    cor: CORES_CIVIL[3],
    volta: { bi0: 2, bj0: 5, bi1: 3, bj1: 5, sentido: 'horario' },
    fase: 0.15,
  },
];

// ------------------------------------------------------------------ velocidades

/** Velocidade no reto (blocos/s): a criança anda a 4,3 e corre a 7. */
export const VEL_RETA = 3;
/** Na curva à direita (raio 1), na curva à esquerda (raio 3) e entrando na vaga. */
export const VEL_CURVA_DIREITA = 1.1;
export const VEL_CURVA_ESQUERDA = 1.8;
export const VEL_VAGA = 1.2;
/** Arrancada e freada normais (blocos/s²). */
export const ACELERACAO = 1.2;
export const FREADA = 1.6;

// ------------------------------------------------------------------ as voltas

export type Direcao = 'x+' | 'x-' | 'z+' | 'z-';
const VETOR: Record<Direcao, [number, number]> = {
  'x+': [1, 0],
  'x-': [-1, 0],
  'z+': [0, 1],
  'z-': [0, -1],
};
/** A direita de quem anda na direção (x, z): andando em +z, é +x. */
const direita = (hx: number, hz: number): [number, number] => [hz, -hx];

/**
 * Um pedaço da volta. `reta`: de (x0, z0) na direção (hx, hz); `arco`: em volta de (cx, cz),
 * raio r, começando no ângulo a0 e girando `giro` radianos (positivo = para a direita);
 * `vaga`: a reta da faixa com o desvio para a vaga do sorvete (de lado `desvio(u)`).
 */
export interface Trecho {
  tipo: 'reta' | 'arco' | 'vaga';
  /** Começo na volta e comprimento. */
  s0: number;
  comp: number;
  x0: number;
  z0: number;
  hx: number;
  hz: number;
  cx?: number;
  cz?: number;
  r?: number;
  a0?: number;
  giro?: number;
  /** Faixa do planejador (retas e a vaga) ou cruzamento (o que atravessa a caixa). */
  pista?: number;
  cruzamento?: number;
  /** Faixa de pedestre no começo e no fim da faixa (largura, 1 na avenida e 2 na rua). */
  zebra?: number;
  /** Velocidade máxima no trecho. */
  vmax: number;
}

export interface Parada {
  /** Onde o centro do veículo para. */
  s: number;
  /** O ponto de ônibus da obra 3 (só vale com a obra feita). */
  obra?: number;
  /** A vaga do sorvete. */
  vaga?: boolean;
}

export interface Rota {
  trechos: Trecho[];
  comp: number;
  paradas: Parada[];
  /** Os cruzamentos da volta, na ordem: o trecho que atravessa cada um. */
  cruzamentos: number[];
}

/** Coordenadas da avenida i e da rua j (o começo delas). */
const avX = (p: PlanoCidade, i: number) => p.ox + PASSO_AVENIDA * i;
const ruaZ = (p: PlanoCidade, j: number) => p.oz + PASSO_RUA * j;

/** Ponto e direção de entrada de quem chega à caixa do cruzamento (i, j) vindo na direção d. */
function entradaDaCaixa(p: PlanoCidade, i: number, j: number, d: Direcao): [number, number] {
  const X = avX(p, i);
  const Z = ruaZ(p, j);
  switch (d) {
    case 'z+':
      return [X + 5, Z + 1];
    case 'z-':
      return [X + 3, Z + 5];
    case 'x+':
      return [X + 2, Z + 2];
    case 'x-':
      return [X + 6, Z + 4];
  }
}

/** Uma perna da volta: avenida (eixo z) ou rua (eixo x), de um cruzamento a outro. */
interface Perna {
  d: Direcao;
  /** Avenida (perna em z) ou rua (perna em x) por onde anda. */
  linha: number;
  /** Índices dos cruzamentos de começo e de fim (na outra direção). */
  de: number;
  ate: number;
}

function pernas(v: Volta): Perna[] {
  const { bi0, bj0, bi1, bj1 } = v;
  const I0 = bi0;
  const I1 = bi1 + 1;
  const J0 = bj0;
  const J1 = bj1 + 1;
  return v.sentido === 'horario'
    ? [
        { d: 'z+', linha: I0, de: J0, ate: J1 },
        { d: 'x+', linha: J1, de: I0, ate: I1 },
        { d: 'z-', linha: I1, de: J1, ate: J0 },
        { d: 'x-', linha: J0, de: I1, ate: I0 },
      ]
    : [
        { d: 'z-', linha: I0, de: J1, ate: J0 },
        { d: 'x+', linha: J0, de: I0, ate: I1 },
        { d: 'z+', linha: I1, de: J0, ate: J1 },
        { d: 'x-', linha: J1, de: I1, ate: I0 },
      ];
}

/** O id do cruzamento (avenida i, rua j). */
function idCruzamento(p: PlanoCidade, i: number, j: number): number {
  const c = p.cruzamentos.find((k) => k.avenida === i && k.rua === j);
  if (!c) throw new Error(`sem cruzamento ${i},${j}`);
  return c.id;
}

/** A faixa (pista) que tem esta célula e anda na direção d. */
function pistaEm(p: PlanoCidade, x: number, z: number, d: Direcao): number {
  const [hx, hz] = VETOR[d];
  const eixo = hx !== 0 ? 'x' : 'z';
  const sentido = (hx || hz) as 1 | -1;
  const cx = Math.floor(x);
  const cz = Math.floor(z);
  const pi = p.pistas.find(
    (q) =>
      q.eixo === eixo &&
      q.sentido === sentido &&
      cx >= q.celulas.x0 - (eixo === 'z' ? 1 : 0) &&
      cx <= q.celulas.x1 &&
      cz >= q.celulas.z0 &&
      cz <= q.celulas.z1 + (eixo === 'x' ? 1 : 0),
  );
  if (!pi) throw new Error(`sem pista em ${x},${z} ${d}`);
  return pi.id;
}

/** Desvio de lado da vaga: sobe de 0 a `lado` em `D` blocos (meia volta de cosseno). */
export function desvioVaga(u: number, comp: number, D: number, lado: number): number {
  if (u <= 0 || u >= comp) return 0;
  if (u < D) return (lado * (1 - Math.cos((Math.PI * u) / D))) / 2;
  if (u > comp - D) return (lado * (1 - Math.cos((Math.PI * (comp - u)) / D))) / 2;
  return lado;
}
/** Comprimento da subida para a vaga (de cada lado). */
export const SUBIDA_VAGA = 4.5;

const rotasGuardadas = new WeakMap<PlanoCidade, Map<number, Rota>>();

/** A volta do veículo (sempre a mesma para o mesmo plano). */
export function rotaDoVeiculo(p: PlanoCidade, def: DefVeiculo): Rota {
  let m = rotasGuardadas.get(p);
  if (!m) rotasGuardadas.set(p, (m = new Map()));
  let r = m.get(def.id);
  if (!r) m.set(def.id, (r = montarRota(p, def)));
  return r;
}

function montarRota(p: PlanoCidade, def: DefVeiculo): Rota {
  const trechos: Trecho[] = [];
  const cruzamentos: number[] = [];
  let s = 0;
  const reta = (
    x0: number,
    z0: number,
    d: Direcao,
    comp: number,
    extra: Partial<Trecho>,
  ): Trecho => {
    const [hx, hz] = VETOR[d];
    const t: Trecho = { tipo: 'reta', s0: s, comp, x0, z0, hx, hz, vmax: VEL_RETA, ...extra };
    trechos.push(t);
    s += comp;
    return t;
  };
  const ps = pernas(def.volta);
  ps.forEach((pe, k) => {
    const [hx, hz] = VETOR[pe.d];
    const passo = Math.sign(pe.ate - pe.de);
    const naAvenida = pe.d[0] === 'z';
    const zebra = naAvenida ? 1 : 2;
    for (let c = pe.de; c !== pe.ate; c += passo) {
      // a faixa entre o cruzamento c e o seguinte: da borda de uma caixa à da outra
      const [ia, ja] = naAvenida ? [pe.linha, c] : [c, pe.linha];
      const [ib, jb] = naAvenida ? [pe.linha, c + passo] : [c + passo, pe.linha];
      const [ex, ez] = entradaDaCaixa(p, ib, jb, pe.d);
      // saída da caixa (ia, ja) nesta direção: a entrada + 4 na direção
      const [sx0, sz0] = entradaDaCaixa(p, ia, ja, pe.d);
      const sx = sx0 + 4 * hx;
      const sz = sz0 + 4 * hz;
      const comp = Math.abs(ex - sx) + Math.abs(ez - sz);
      const pista = pistaEm(p, sx + hx * 0.5, sz + hz * 0.5, pe.d);
      reta(sx, sz, pe.d, comp, { pista, zebra });
      // e a caixa do cruzamento seguinte: reto (no meio da perna) ou a curva (no fim)
      const cruz = idCruzamento(p, ib, jb);
      cruzamentos.push(cruz);
      if (c + passo !== pe.ate) {
        reta(ex, ez, pe.d, 4, { cruzamento: cruz });
        continue;
      }
      const prox = ps[(k + 1) % ps.length];
      const [nx, nz] = VETOR[prox.d];
      const [rx, rz] = direita(hx, hz);
      const paraDireita = rx === nx && rz === nz;
      const R = paraDireita ? 1 : 3;
      const lado = paraDireita ? 1 : -1;
      const cx = ex + rx * R * lado;
      const cz = ez + rz * R * lado;
      const t: Trecho = {
        tipo: 'arco',
        s0: s,
        comp: (Math.PI / 2) * R,
        x0: ex,
        z0: ez,
        hx,
        hz,
        cx,
        cz,
        r: R,
        a0: Math.atan2(ez - cz, ex - cx),
        giro: (lado * Math.PI) / 2,
        cruzamento: cruz,
        vmax: paraDireita ? VEL_CURVA_DIREITA : VEL_CURVA_ESQUERDA,
      };
      trechos.push(t);
      s += t.comp;
    }
  });
  // começa na saída da curva do último canto (a volta fecha nela)
  const rota: Rota = { trechos, comp: s, paradas: [], cruzamentos };
  if (def.tipo === 'sorvete') colocarVaga(p, rota);
  if (def.tipo === 'onibusAzul' || def.tipo === 'onibusVerde') colocarParadas(p, rota, def);
  return rota;
}

/** A vaga do sorvete: a reta da faixa ao lado dela ganha o desvio para dentro e a parada. */
function colocarVaga(p: PlanoCidade, rota: Rota): void {
  const v = p.vaga;
  const k = rota.trechos.findIndex(
    (t) =>
      t.tipo === 'reta' &&
      t.pista !== undefined &&
      t.hx === -1 &&
      t.z0 + 1 === v.z0 &&
      t.x0 >= v.x1 + 1 &&
      t.x0 - t.comp <= v.x0,
  );
  if (k < 0) throw new Error('a volta do sorvete não passa na vaga');
  const t = rota.trechos[k];
  // a reta se divide: até a vaga, o desvio (que entra, fica e sai) e o resto
  const ini = t.x0 - (v.x1 + 1);
  const fim = t.x0 - v.x0;
  const antes: Trecho = { ...t, comp: ini };
  const vaga: Trecho = {
    ...t,
    tipo: 'vaga',
    s0: t.s0 + ini,
    comp: fim - ini,
    x0: t.x0 - ini,
    vmax: VEL_VAGA,
    zebra: undefined,
  };
  const depois: Trecho = { ...t, s0: t.s0 + fim, comp: t.comp - fim, x0: t.x0 - fim };
  rota.trechos.splice(k, 1, antes, vaga, depois);
  rota.paradas.push({ s: vaga.s0 + vaga.comp / 2, vaga: true });
}

/** As 3 paradas do ônibus: no meio de três pernas; a da rua da obra 3 é o ponto dela. */
function colocarParadas(p: PlanoCidade, rota: Rota, def: DefVeiculo): void {
  const retas = rota.trechos.filter((t) => t.tipo === 'reta' && t.pista !== undefined);
  // a obra 3 (ponto de ônibus): o lote dela dá para a rua desta volta?
  const obra3 = def.tipo === 'onibusAzul' ? p.lotes.find((l) => l.canteiro === 3) : undefined;
  const usadas = new Set<Trecho>();
  if (obra3) {
    const meio = obra3.x0 + 3.5;
    const t = retas.find(
      (r) =>
        r.hx === -1 &&
        Math.abs(r.z0 + 2 - obra3.z0) <= 0.01 &&
        r.x0 - r.comp + 3 <= meio &&
        r.x0 - 3 >= meio,
    );
    if (t) {
      rota.paradas.push({ s: t.s0 + (t.x0 - meio), obra: 3 });
      usadas.add(t);
    }
  }
  // as outras no meio das retas mais compridas de pernas diferentes
  const livres = retas
    .filter((t) => !usadas.has(t) && t.comp >= 14)
    .sort((a, b) => b.comp - a.comp || a.s0 - b.s0);
  const direcoes = new Set([...usadas].map((t) => `${t.hx},${t.hz}`));
  for (const t of livres) {
    if (rota.paradas.length >= 3) break;
    const dir = `${t.hx},${t.hz}`;
    if (direcoes.has(dir)) continue;
    direcoes.add(dir);
    rota.paradas.push({ s: t.s0 + t.comp / 2 });
  }
  rota.paradas.sort((a, b) => a.s - b.s);
}

// ------------------------------------------------------------------ pose

export interface Pose {
  x: number;
  z: number;
  /** Direção em que anda (vetor unitário) e o ângulo do Babylon (frente do modelo = +x local). */
  hx: number;
  hz: number;
  yaw: number;
}

/** O trecho em que cai a distância s (já dentro da volta). */
export function trechoEm(r: Rota, s: number): Trecho {
  const ts = r.trechos;
  let lo = 0;
  let hi = ts.length - 1;
  while (lo < hi) {
    const m = (lo + hi + 1) >> 1;
    if (ts[m].s0 <= s) lo = m;
    else hi = m - 1;
  }
  return ts[lo];
}

/** Distância na volta (dá a volta: sempre em [0, comp)). */
export function naVolta(r: Rota, s: number): number {
  const c = r.comp;
  const m = s % c;
  return m < 0 ? m + c : m;
}

/** A pose do centro do veículo na distância s da volta. */
export function poseNaRota(r: Rota, sBruto: number, out?: Pose): Pose {
  const s = naVolta(r, sBruto);
  const t = trechoEm(r, s);
  const u = Math.min(t.comp, Math.max(0, s - t.s0));
  let x: number;
  let z: number;
  let hx: number;
  let hz: number;
  if (t.tipo === 'arco') {
    const a = t.a0! - (Math.sign(t.giro!) * u) / t.r!;
    // o ângulo cresce no sentido anti-horário de (x, z); a curva à direita gira ao contrário
    x = t.cx! + Math.cos(a) * t.r!;
    z = t.cz! + Math.sin(a) * t.r!;
    const g = Math.sign(t.giro!);
    hx = Math.sin(a) * g;
    hz = -Math.cos(a) * g;
  } else if (t.tipo === 'vaga') {
    const [rx, rz] = direita(t.hx, t.hz);
    const lado = 2;
    const d = desvioVaga(u, t.comp, SUBIDA_VAGA, lado);
    x = t.x0 + t.hx * u + rx * d;
    z = t.z0 + t.hz * u + rz * d;
    // inclinação do desvio: a frente aponta para onde o caminho vai
    const e = 1e-3;
    const dd =
      (desvioVaga(u + e, t.comp, SUBIDA_VAGA, lado) -
        desvioVaga(u - e, t.comp, SUBIDA_VAGA, lado)) /
      (2 * e);
    const n = Math.hypot(1, dd);
    hx = (t.hx + rx * dd) / n;
    hz = (t.hz + rz * dd) / n;
  } else {
    x = t.x0 + t.hx * u;
    z = t.z0 + t.hz * u;
    hx = t.hx;
    hz = t.hz;
  }
  const o = out ?? { x: 0, z: 0, hx: 0, hz: 0, yaw: 0 };
  o.x = x;
  o.z = z;
  o.hx = hx;
  o.hz = hz;
  // Babylon: girar y por θ leva o +x local a (cos θ, -sen θ)
  o.yaw = Math.atan2(-hz, hx);
  return o;
}

const poseA: Pose = { x: 0, z: 0, hx: 0, hz: 0, yaw: 0 };
const poseB: Pose = { x: 0, z: 0, hx: 0, hz: 0, yaw: 0 };

/**
 * A pose do veículo com o centro na distância s: as duas rodas (de trás e da frente) ficam
 * no caminho, como um carrinho de verdade, e a carroceria aponta de uma para a outra. Na
 * curva o meio do carro corta um pouco por dentro do arco e as pontas quase não saem dele.
 */
export function poseDoVeiculo(r: Rota, m: MedidasVeiculo, s: number, out?: Pose): Pose {
  const e = m.apoio ?? (m.eixos[1] - m.eixos[0]) / 2;
  const f = poseNaRota(r, s + e, poseA);
  const t = poseNaRota(r, s - e, poseB);
  const o = out ?? { x: 0, z: 0, hx: 0, hz: 0, yaw: 0 };
  let hx = f.x - t.x;
  let hz = f.z - t.z;
  const n = Math.hypot(hx, hz);
  if (n < 1e-9) {
    hx = f.hx;
    hz = f.hz;
  } else {
    hx /= n;
    hz /= n;
  }
  o.x = (f.x + t.x) / 2;
  o.z = (f.z + t.z) / 2;
  o.hx = hx;
  o.hz = hz;
  o.yaw = Math.atan2(-hz, hx);
  return o;
}

/** Ponto do corpo (frente fx, lado lz: positivo para a esquerda do modelo) no mundo. */
export function pontoDoCorpo(p: Pose, fx: number, lz: number): [number, number] {
  // a esquerda de quem anda em (hx, hz) é (-hz, hx)
  return [p.x + p.hx * fx - p.hz * lz, p.z + p.hz * fx + p.hx * lz];
}

// ------------------------------------------------------------------ movimento

/**
 * Plano de movimento: a partir do tempo t0 (s, relógio dos veículos do núcleo), na distância
 * s0 e velocidade v0, acelera com `a` até chegar em `vf` e segue nela. É o que vai na rede
 * (os números já arredondados: o núcleo usa os mesmos que manda).
 */
export interface PlanoVeiculo {
  id: number;
  t0: number;
  s0: number;
  v0: number;
  a: number;
  vf: number;
  /** O que está fazendo (para o cliente: porta aberta, balão, giroflex). */
  k?: EstadoVeiculo;
}

/** Parado no ponto (porta aberta), na vaga (sorvete servindo) ou esperando alguém sair. */
export type EstadoVeiculo = 'ponto' | 'vaga' | 'espera';

/** Tempo até o plano chegar na velocidade final. */
function tempoAteFinal(p: PlanoVeiculo): number {
  if (p.a === 0 || p.v0 === p.vf) return 0;
  const t = (p.vf - p.v0) / p.a;
  return t > 0 ? t : 0;
}

/** Distância (sem dar a volta) e velocidade do plano no tempo t. */
export function noPlano(p: PlanoVeiculo, t: number): { s: number; v: number } {
  const dt = Math.max(0, t - p.t0);
  const tf = tempoAteFinal(p);
  if (dt <= tf) return { s: p.s0 + p.v0 * dt + 0.5 * p.a * dt * dt, v: p.v0 + p.a * dt };
  const sf = p.s0 + p.v0 * tf + 0.5 * p.a * tf * tf;
  return { s: sf + p.vf * (dt - tf), v: p.vf };
}

/** Arredonda como vai na rede (o núcleo e o cliente usam os mesmos números). */
export const arred = (x: number, casas = 3): number => {
  const k = 10 ** casas;
  return Math.round(x * k) / k;
};

// ------------------------------------------------------------------ conferências

/** As células por onde as rodas e a caixa passam são todas de pista? (testes e depuração) */
export function soloDoPonto(p: PlanoCidade, x: number, z: number): Solo {
  return soloDaCidade(p, Math.floor(x), Math.floor(z));
}
export function pontoNaPista(p: PlanoCidade, x: number, z: number): boolean {
  return soloDePista(soloDoPonto(p, x, z));
}

/** Os quatro cantos da caixa (no chão) e as quatro rodas do veículo na pose. */
export function cantosERodas(m: MedidasVeiculo, pose: Pose): [number, number][] {
  const out: [number, number][] = [];
  for (const fx of [-m.meioComp, m.meioComp])
    for (const lz of [-m.meiaLarg, m.meiaLarg]) out.push(pontoDoCorpo(pose, fx, lz));
  for (const ex of m.eixos)
    for (const lz of [-m.bitola, m.bitola]) out.push(pontoDoCorpo(pose, ex, lz));
  return out;
}

/** Retângulo de células (inclusivo) contém o ponto? */
export function noRetangulo(r: Retangulo, x: number, z: number, folga = 0): boolean {
  return x >= r.x0 - folga && x < r.x1 + 1 + folga && z >= r.z0 - folga && z < r.z1 + 1 + folga;
}

export { LARG_RUA };
