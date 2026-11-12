/**
 * Planejador da Cidade Grande (spec 014, `EstiloMundo.povoado.planta: 'cidade'`). Uma cidade
 * por mundo, em volta do nascimento, pura e determinística pela semente (o servidor da nuvem
 * e o trabalhador da malha acham a mesma), com sorteios de chaves novas (9200 em diante) que
 * não mexem nos de hoje: os outros sete temas saem iguais bloco por bloco.
 *
 * Malha (coordenadas locais a partir do canto `ox, oz`): 5 avenidas de 8 (calçada 2, asfalto
 * 4 com duas mãos de 2, calçada 2) a cada 40 em x e 7 ruas de 6 (calçada 1, asfalto 4,
 * calçada 1) a cada 24 em z: 4 × 6 quarteirões de 32 × 18, cada um com 8 lotes de 8 × 9
 * (duas fileiras de 4, de costas, com a porta para a rua). O parque ocupa os 2 × 2
 * quarteirões do meio (a avenida e a rua de dentro viram caminhos). Em volta, um anel de
 * grama, uma rampa larga e o terreno natural amaciado.
 *
 * Mão de direção (andando em +z, a direita é +x): na avenida, quem vai para +z usa as
 * colunas 4 e 5 e quem vai para -z as 2 e 3; na rua, quem vai para +x usa as fileiras 1 e
 * 2 e quem vai para -x as 3 e 4.
 */
import { Bloco } from './blocks';
import { hash2 } from './noise';
import {
  casaGeminada,
  NADA,
  SEM_DIR,
  dirDaPlanta,
  indicePlanta,
  type ParametrosPredio,
  type Planta,
} from './plantas';
import { construirModelo, type ModeloPredio } from './plantas/modelos';
import type { Profissao } from './povoado';

export const AVENIDAS = 5;
export const RUAS = 7;
export const LARG_AVENIDA = 8;
export const LARG_RUA = 6;
export const PASSO_AVENIDA = 40;
export const PASSO_RUA = 24;
export const LOTE_X = 8;
export const LOTE_Z = 9;
export const LARGURA_CIDADE = PASSO_AVENIDA * (AVENIDAS - 1) + LARG_AVENIDA; // 168
export const PROFUNDIDADE_CIDADE = PASSO_RUA * (RUAS - 1) + LARG_RUA; // 150
/** Anel de grama em volta da grade (a cidade termina em calçada e gramado). */
export const MARGEM_GRAMA = 4;
/** Rampa até o terreno natural: 1 bloco a cada 3 colunas, até 24 colunas. */
export const RAMPA_CIDADE = 24;
/** Até onde o relevo é amaciado em volta da cidade. */
export const ALCANCE_SUAVE = 96;

/** O chão de cada coluna da cidade. */
export const Solo = {
  NADA: 0,
  ASFALTO: 1,
  FAIXA: 2,
  ZEBRA: 3,
  CALCADA: 4,
  GRAMA: 5,
  CAMINHO: 6,
  LAGO: 7,
  LOTE: 8,
  VAGA: 9,
} as const;
export type Solo = (typeof Solo)[keyof typeof Solo];

/** Solo em que os carros andam (a pista, as faixas e a vaga do sorvete). */
export function soloDePista(s: Solo): boolean {
  return s === Solo.ASFALTO || s === Solo.FAIXA || s === Solo.ZEBRA || s === Solo.VAGA;
}

export interface Retangulo {
  x0: number;
  z0: number;
  x1: number;
  z1: number;
}

export type UsoLoteCidade =
  | 'apartamentos'
  | 'padaria'
  | 'oficina'
  | 'construcao'
  | 'escola'
  | 'sorveteria'
  | 'praca'
  | 'canteiro'
  | 'alto';

export interface LoteCidade {
  i: number;
  /** Canto mínimo (mundo) e tamanho em x (8 ou 16) e z (9). */
  x0: number;
  z0: number;
  largura: number;
  profundidade: number;
  /** Lado da rua: 'n' (frente em -z) ou 's' (frente em +z). */
  porta: 'n' | 's';
  uso: UsoLoteCidade;
  modelo?: ModeloPredio;
  params?: ParametrosPredio;
  /** Número do canteiro (1 a 6, a ordem das obras). */
  canteiro?: number;
  quarteirao: [number, number];
}

export interface Cruzamento {
  id: number;
  avenida: number;
  rua: number;
  /** A caixa de asfalto do meio (4 × 4). */
  caixa: Retangulo;
}

/** Uma faixa de um trecho de avenida ou de rua, entre dois cruzamentos, num sentido só. */
export interface Pista {
  id: number;
  eixo: 'x' | 'z';
  sentido: 1 | -1;
  /** Coordenada do meio da faixa (x nas avenidas, z nas ruas). */
  meio: number;
  /** As células de asfalto da faixa (inclusivo; contam a zebra do começo e do fim). */
  celulas: Retangulo;
  /** Cruzamento de onde sai e para onde vai. */
  de: number;
  para: number;
}

export interface MoradorCidade {
  n: number;
  profissao: Profissao;
  /** Lote do apartamento e o andar. */
  casa: number;
  andar: number;
  /** Lote da loja onde trabalha. */
  oficina: number;
}

export interface PlanoCidade {
  semente: number;
  /** Canto da grade (o começo da avenida 0 e da rua 0). */
  ox: number;
  oz: number;
  /** Altura do chão (o bloco da calçada fica em y = h; os pés em h + 1). */
  h: number;
  /** Área plana (a grade e o anel de grama). */
  plana: Retangulo;
  lotes: LoteCidade[];
  parque: Retangulo;
  lago: { cx: number; cz: number; rx: number; rz: number };
  /** Vaga do carrinho de sorvete (reentrância de asfalto na beira do parque). */
  vaga: Retangulo;
  /** Entrada do metrô (só enfeite): o canto da cava. */
  metro: Retangulo;
  cruzamentos: Cruzamento[];
  pistas: Pista[];
  /** Onde a criança nasce e para onde olha (yaw: frente = seno, cosseno). */
  nascimento: { x: number; z: number; olhar: number };
  moradores: MoradorCidade[];
  /** Árvores (parque e calçada): x, z, raio da copa, folha. */
  arvores: [number, number, number, number][];
  /** Postes: x, z (a haste de grade e o globo em cima). */
  postes: [number, number][];
}

/** O relevo natural (injetado por chunk.ts, sem import circular de valores). */
export interface RelevoNatural {
  altura(wx: number, wz: number, semente: number): number;
  /** O bioma natural (a cidade foge do deserto, como o sítio). */
  deserto?(wx: number, wz: number, semente: number, h: number): boolean;
  nivelMar: number;
}

// ------------------------------------------------------------------------ onde fica

const cache = new Map<string, PlanoCidade>();

/** Esquece os planos (testes que trocam o relevo). */
export function limparCidades(): void {
  cache.clear();
}

/** O plano da cidade do mundo (sempre o mesmo para a mesma semente e o mesmo relevo). */
export function planoDaCidade(semente: number, r: RelevoNatural, chaveRelevo = ''): PlanoCidade {
  const k = `${semente},${chaveRelevo}`;
  let p = cache.get(k);
  if (!p) {
    p = planejarCidade(semente, r);
    if (cache.size > 16) cache.clear();
    cache.set(k, p);
  }
  return p;
}

/**
 * Procura, em volta da origem, um lugar onde a cidade inteira caiba em terra firme (pelo
 * menos 80% das amostras acima do mar). A altura do chão é a mediana do relevo ali.
 */
function lugarDaCidade(semente: number, r: RelevoNatural): { cx: number; cz: number; h: number } {
  const W = LARGURA_CIDADE + 2 * MARGEM_GRAMA;
  const D = PROFUNDIDADE_CIDADE + 2 * MARGEM_GRAMA;
  const avaliar = (cx: number, cz: number) => {
    const hs: number[] = [];
    let terra = 0;
    let areia = 0;
    for (let dz = -D / 2; dz <= D / 2; dz += 8)
      for (let dx = -W / 2; dx <= W / 2; dx += 8) {
        const x = Math.round(cx + dx);
        const z = Math.round(cz + dz);
        const h = r.altura(x, z, semente);
        hs.push(h);
        if (h > r.nivelMar + 1) terra++;
        if (r.deserto?.(x, z, semente, h)) areia++;
      }
    hs.sort((a, b) => a - b);
    return { terra: terra / hs.length, mediana: hs[hs.length >> 1], areia: areia / hs.length };
  };
  for (let anel = 0; anel <= 12; anel++) {
    const passos = anel === 0 ? 1 : anel * 8;
    for (let k = 0; k < passos; k++) {
      const a = (k / passos) * Math.PI * 2 + hash2(anel, 3, semente + 9201) * 0.5;
      const cx = Math.round(8 + Math.cos(a) * anel * 48);
      const cz = Math.round(8 + Math.sin(a) * anel * 48);
      const { terra, mediana, areia } = avaliar(cx, cz);
      if (terra >= 0.8 && mediana < 86 && areia < 0.25)
        return { cx, cz, h: Math.max(r.nivelMar + 3, Math.min(84, mediana)) };
    }
  }
  return { cx: 8, cz: 8, h: r.nivelMar + 4 };
}

// ------------------------------------------------------------------------ o plano

const ax = (p: { ox: number }, i: number) => p.ox + PASSO_AVENIDA * i;
const rz = (p: { oz: number }, j: number) => p.oz + PASSO_RUA * j;
/** Quarteirões do parque (os 2 × 2 do meio). */
const noParque = (bi: number, bj: number) => (bi === 1 || bi === 2) && (bj === 2 || bj === 3);
/** O trecho de avenida (i) entre as ruas j e j + 1 existe (não é caminho do parque)? */
export function temTrechoAvenida(i: number, j: number): boolean {
  return i >= 0 && i < AVENIDAS && j >= 0 && j < RUAS - 1 && !(i === 2 && (j === 2 || j === 3));
}
/** O trecho de rua (j) entre as avenidas i e i + 1 existe? */
export function temTrechoRua(j: number, i: number): boolean {
  return j >= 0 && j < RUAS && i >= 0 && i < AVENIDAS - 1 && !(j === 3 && (i === 1 || i === 2));
}
/** O cruzamento da avenida i com a rua j existe (o do meio do parque não)? */
export function temCruzamento(i: number, j: number): boolean {
  return !(i === 2 && j === 3);
}

/** Lotes especiais: [quarteirão x, quarteirão z, fileira, primeiro lote, uso, lotes]. */
type Especial = [number, number, 'n' | 's', number, UsoLoteCidade, number, number?];
const ESPECIAIS: readonly Especial[] = [
  // em frente ao parque, no norte: a praça do nascimento e os dois primeiros canteiros
  [1, 1, 's', 0, 'apartamentos', 2],
  [1, 1, 's', 2, 'praca', 1],
  [1, 1, 's', 3, 'canteiro', 1, 1],
  [2, 1, 's', 0, 'canteiro', 1, 2],
  [2, 1, 's', 1, 'sorveteria', 1],
  [2, 1, 's', 2, 'alto', 2],
  // no sul do parque, os outros quatro canteiros
  [1, 4, 'n', 0, 'apartamentos', 2],
  [1, 4, 'n', 2, 'canteiro', 1, 3],
  [1, 4, 'n', 3, 'canteiro', 1, 4],
  [2, 4, 'n', 0, 'canteiro', 1, 5],
  [2, 4, 'n', 1, 'canteiro', 1, 6],
  [2, 4, 'n', 2, 'apartamentos', 2],
  // as esquinas na diagonal do parque
  [0, 1, 's', 2, 'apartamentos', 2],
  [3, 1, 's', 0, 'apartamentos', 2],
  [0, 4, 'n', 2, 'apartamentos', 2],
  [3, 4, 'n', 0, 'apartamentos', 2],
  // as lojas atrás da praça (o pedreiro trabalha na loja de construção, perto dos canteiros)
  [1, 1, 'n', 1, 'padaria', 1],
  [2, 1, 'n', 1, 'construcao', 1],
  [2, 1, 'n', 2, 'oficina', 1],
  // a escola numa ponta
  [1, 5, 'n', 1, 'escola', 2],
];

function planejarCidade(semente: number, r: RelevoNatural): PlanoCidade {
  const lugar = lugarDaCidade(semente, r);
  const ox = lugar.cx - (LARGURA_CIDADE >> 1);
  const oz = lugar.cz - (PROFUNDIDADE_CIDADE >> 1);
  const h = lugar.h;
  const base = { ox, oz };
  const plana: Retangulo = {
    x0: ox - MARGEM_GRAMA,
    z0: oz - MARGEM_GRAMA,
    x1: ox + LARGURA_CIDADE - 1 + MARGEM_GRAMA,
    z1: oz + PROFUNDIDADE_CIDADE - 1 + MARGEM_GRAMA,
  };
  const parque: Retangulo = { x0: ox + 48, z0: oz + 54, x1: ox + 119, z1: oz + 95 };

  // lotes: os especiais primeiro, o resto por zona
  const lotes: LoteCidade[] = [];
  const ocupado = new Set<string>();
  const sorte = (i: number, k: number) => hash2(i, k, semente + 9210);
  const novoLote = (
    bi: number,
    bj: number,
    fileira: 'n' | 's',
    k: number,
    uso: UsoLoteCidade,
    n: number,
    canteiro?: number,
  ) => {
    const x0 = ax(base, bi) + LARG_AVENIDA + LOTE_X * k;
    const z0 = rz(base, bj) + LARG_RUA + (fileira === 's' ? LOTE_Z : 0);
    for (let q = 0; q < n; q++) ocupado.add(`${bi},${bj},${fileira},${k + q}`);
    const l: LoteCidade = {
      i: lotes.length,
      x0,
      z0,
      largura: LOTE_X * n,
      profundidade: LOTE_Z,
      porta: fileira,
      uso,
      quarteirao: [bi, bj],
      ...(canteiro ? { canteiro } : {}),
    };
    lotes.push(l);
    return l;
  };
  for (const [bi, bj, fileira, k, uso, n, c] of ESPECIAIS) novoLote(bi, bj, fileira, k, uso, n, c);
  for (let bj = 0; bj < RUAS - 1; bj++)
    for (let bi = 0; bi < AVENIDAS - 1; bi++) {
      if (noParque(bi, bj)) continue;
      for (const fileira of ['n', 's'] as const)
        for (let k = 0; k < 4; k++) {
          if (ocupado.has(`${bi},${bj},${fileira},${k}`)) continue;
          novoLote(bi, bj, fileira, k, 'apartamentos', 1);
        }
    }
  // modelos e parâmetros
  let seisAndares = 0;
  for (const l of lotes) {
    const [bi, bj] = l.quarteirao;
    const s = (k: number) => sorte(l.i, k);
    const params: ParametrosPredio = {
      andares: 2,
      corPorta: Math.floor(s(1) * 4),
      corToldo: s(2) < 0.5 ? 'vermelho' : 'verde',
      espelho: s(3) < 0.5,
      caixaDagua: s(4) < 0.55,
      loja: false,
      luzes: Math.floor(s(5) * 1e6),
    };
    const pontas = bj === 0 || bj === RUAS - 2;
    const pertoDoParque = (bj === 1 || bj === 4) && bi >= 0;
    switch (l.uso) {
      case 'alto':
        l.modelo = 'alto';
        params.andares = 6;
        params.caixaDagua = true;
        seisAndares++;
        break;
      case 'escola':
        l.modelo = 'escola';
        params.andares = 2;
        break;
      case 'padaria':
      case 'oficina':
      case 'construcao':
      case 'sorveteria':
        l.modelo = 'tijolo';
        params.andares = l.uso === 'sorveteria' ? 3 : 3 + Math.floor(s(6) * 2);
        params.loja = true;
        break;
      case 'apartamentos':
        if (l.largura === 16) {
          // esquina art déco em volta do parque (5 ou 6 andares; no máximo 8 de 6)
          l.modelo = 'deco';
          params.andares = s(6) < 0.5 && seisAndares < 8 ? 6 : 5;
          if (params.andares === 6) seisAndares++;
        } else if (pontas && s(7) < 0.45) {
          l.modelo = 'tijolo';
          params.andares = 3 + Math.floor(s(6) * 2);
          params.loja = true;
        } else {
          l.modelo = 'geminada';
          params.andares = pertoDoParque ? 3 + Math.floor(s(6) * 2) : 2 + Math.floor(s(6) * 3);
        }
        break;
      default:
        break;
    }
    // as lojas: o que cada uma vende (a placa e o que tem dentro)
    const VENDE = {
      padaria: 'padaria',
      oficina: 'oficina',
      construcao: 'construcao',
      sorveteria: 'sorveteria',
    } as const;
    if (l.uso in VENDE) params.vende = VENDE[l.uso as keyof typeof VENDE];
    else if (params.loja || l.modelo === 'deco')
      params.vende = (['padaria', 'oficina', 'construcao', 'sorveteria'] as const)[
        Math.floor(s(8) * 4)
      ];
    // os prédios largos de esquina viram a fachada do lado (s = 15) para a avenida
    if (l.largura === 16) {
      const k = Math.round((l.x0 - (ax(base, bi) + LARG_AVENIDA)) / LOTE_X);
      const avenidaEmXMenor = k === 0;
      // na fileira 'n' o s cresce com x; na 's', ao contrário
      const ladoS15EmXMaior = l.porta === 'n';
      params.espelho = avenidaEmXMenor === ladoS15EmXMaior;
    }
    if (l.modelo) l.params = params;
  }

  // parque: o lago, a vaga do sorvete na beira dele e a entrada do metrô
  const lago = { cx: ox + 65, cz: oz + 86, rx: 10, rz: 4.5 };
  const vaga: Retangulo = { x0: ox + 62, z0: oz + 53, x1: ox + 67, z1: oz + 54 };
  const metro: Retangulo = { x0: ox + 52, z0: oz + 60, x1: ox + 56, z1: oz + 65 };

  // cruzamentos e pistas
  const cruzamentos: Cruzamento[] = [];
  const idCruz = new Map<string, number>();
  for (let j = 0; j < RUAS; j++)
    for (let i = 0; i < AVENIDAS; i++) {
      if (!temCruzamento(i, j)) continue;
      idCruz.set(`${i},${j}`, cruzamentos.length);
      cruzamentos.push({
        id: cruzamentos.length,
        avenida: i,
        rua: j,
        caixa: {
          x0: ax(base, i) + 2,
          z0: rz(base, j) + 1,
          x1: ax(base, i) + 5,
          z1: rz(base, j) + 4,
        },
      });
    }
  const pistas: Pista[] = [];
  for (let i = 0; i < AVENIDAS; i++)
    for (let j = 0; j < RUAS - 1; j++) {
      if (!temTrechoAvenida(i, j)) continue;
      const a = idCruz.get(`${i},${j}`)!;
      const b = idCruz.get(`${i},${j + 1}`)!;
      const z0 = rz(base, j) + 5;
      const z1 = rz(base, j + 1);
      const x = ax(base, i);
      pistas.push({
        id: pistas.length,
        eixo: 'z',
        sentido: 1,
        meio: x + 5,
        celulas: { x0: x + 4, z0, x1: x + 5, z1 },
        de: a,
        para: b,
      });
      pistas.push({
        id: pistas.length,
        eixo: 'z',
        sentido: -1,
        meio: x + 3,
        celulas: { x0: x + 2, z0, x1: x + 3, z1 },
        de: b,
        para: a,
      });
    }
  for (let j = 0; j < RUAS; j++)
    for (let i = 0; i < AVENIDAS - 1; i++) {
      if (!temTrechoRua(j, i)) continue;
      const a = idCruz.get(`${i},${j}`)!;
      const b = idCruz.get(`${i + 1},${j}`)!;
      const x0 = ax(base, i) + 6;
      const x1 = ax(base, i + 1) + 1;
      const z = rz(base, j);
      pistas.push({
        id: pistas.length,
        eixo: 'x',
        sentido: 1,
        meio: z + 2,
        celulas: { x0, z0: z + 1, x1, z1: z + 2 },
        de: a,
        para: b,
      });
      pistas.push({
        id: pistas.length,
        eixo: 'x',
        sentido: -1,
        meio: z + 4,
        celulas: { x0, z0: z + 3, x1, z1: z + 4 },
        de: b,
        para: a,
      });
    }

  // árvores do parque (fora dos caminhos, do lago e do metrô) e postes
  const plano: PlanoCidade = {
    semente,
    ox,
    oz,
    h,
    plana,
    lotes,
    parque,
    lago,
    vaga,
    metro,
    cruzamentos,
    pistas,
    nascimento: { x: 0, z: 0, olhar: 0 },
    moradores: [],
    arvores: [],
    postes: [],
  };
  for (let x = parque.x0 + 5; x <= parque.x1 - 5; x += 7)
    for (let z = parque.z0 + 5; z <= parque.z1 - 5; z += 6) {
      const jx = x + Math.floor(hash2(x, z, semente + 9220) * 3) - 1;
      const jz = z + Math.floor(hash2(z, x, semente + 9221) * 3) - 1;
      if (hash2(jx, jz, semente + 9222) > 0.55) continue;
      let livre = true;
      for (let dz = -2; dz <= 2 && livre; dz++)
        for (let dx = -2; dx <= 2 && livre; dx++)
          if (soloDaCidade(plano, jx + dx, jz + dz) !== Solo.GRAMA) livre = false;
      if (dentroRet(metro, jx, jz, 3)) livre = false;
      if (!livre) continue;
      const ipe = hash2(jx, jz, semente + 9223) < 0.45;
      plano.arvores.push([jx, jz, 2, ipe ? Bloco.FOLHAS_OUTONO : Bloco.FOLHAGEM]);
    }
  // árvores e postes de rua: na calçada da avenida, junto do meio-fio
  for (let i = 0; i < AVENIDAS; i++)
    for (let j = 0; j < RUAS - 1; j++) {
      if (!temTrechoAvenida(i, j)) continue;
      const x = ax(base, i);
      const z0 = rz(base, j) + LARG_RUA;
      for (const col of [x + 1, x + 6]) {
        plano.postes.push([col, z0 + 3]);
        plano.postes.push([col, z0 + 14]);
        const arvore = hash2(col, z0, semente + 9224) < 0.6;
        if (arvore)
          plano.arvores.push([
            col,
            z0 + 9,
            1,
            hash2(col, j, semente + 9225) < 0.5 ? Bloco.FOLHAS_OUTONO : Bloco.FOLHAGEM,
          ]);
      }
    }

  // nascimento: na praça, junto do primeiro canteiro, olhando para ele
  const praca = lotes.find((l) => l.uso === 'praca')!;
  const can1 = lotes.find((l) => l.canteiro === 1)!;
  const nx = praca.x0 + 6.5;
  const nz = praca.z0 + 4.5;
  const alvoX = can1.x0 + can1.largura / 2;
  const alvoZ = can1.z0 + 4.5;
  plano.nascimento = { x: nx, z: nz, olhar: Math.atan2(alvoX - nx, alvoZ - nz) };

  // moradores (até 12, três profissões em rodízio): moram nos apartamentos mais perto da
  // praça e trabalham nas lojas
  const loja: Record<Profissao, number> = {
    cozinheiro: lotes.find((l) => l.uso === 'padaria')!.i,
    ferreiro: lotes.find((l) => l.uso === 'oficina')!.i,
    construtor: lotes.find((l) => l.uso === 'construcao')!.i,
  };
  const casas = lotes
    .filter((l) => l.uso === 'apartamentos' && l.modelo === 'geminada')
    .sort(
      (a, b) => Math.hypot(a.x0 - nx, a.z0 - nz) - Math.hypot(b.x0 - nx, b.z0 - nz) || a.i - b.i,
    );
  const ordem: Profissao[] = ['construtor', 'cozinheiro', 'ferreiro'];
  for (let n = 0; n < Math.min(12, casas.length); n++) {
    const profissao = ordem[n % 3];
    plano.moradores.push({ n, profissao, casa: casas[n].i, andar: 0, oficina: loja[profissao] });
  }
  return plano;
}

function dentroRet(r: Retangulo, x: number, z: number, folga = 0): boolean {
  return x >= r.x0 - folga && x <= r.x1 + folga && z >= r.z0 - folga && z <= r.z1 + folga;
}

/** Distância (Chebyshev) da coluna até a área plana (0 dentro dela). */
export function distanciaDaCidade(p: PlanoCidade, wx: number, wz: number): number {
  const dx = wx < p.plana.x0 ? p.plana.x0 - wx : wx > p.plana.x1 ? wx - p.plana.x1 : 0;
  const dz = wz < p.plana.z0 ? p.plana.z0 - wz : wz > p.plana.z1 ? wz - p.plana.z1 : 0;
  return Math.max(dx, dz);
}

// ------------------------------------------------------------------------ o chão

/** O chão da coluna (mundo) na cidade. */
export function soloDaCidade(p: PlanoCidade, wx: number, wz: number): Solo {
  if (!dentroRet(p.plana, wx, wz)) return Solo.NADA;
  const lx = wx - p.ox;
  const lz = wz - p.oz;
  if (lx < 0 || lz < 0 || lx >= LARGURA_CIDADE || lz >= PROFUNDIDADE_CIDADE) return Solo.GRAMA;
  if (dentroRet(p.vaga, wx, wz)) return Solo.VAGA;
  if (dentroRet(p.parque, wx, wz)) return soloDoParque(p, wx, wz);
  const ia = lx % PASSO_AVENIDA;
  const jr = lz % PASSO_RUA;
  const i = Math.floor(lx / PASSO_AVENIDA);
  const j = Math.floor(lz / PASSO_RUA);
  const naAvenida = ia < LARG_AVENIDA;
  const naRua = jr < LARG_RUA;
  const asfaltoAv = ia >= 2 && ia <= 5;
  const asfaltoRua = jr >= 1 && jr <= 4;
  if (naAvenida && naRua) {
    if (asfaltoAv && asfaltoRua) return Solo.ASFALTO;
    if (asfaltoAv) {
      // zebra da avenida: só onde a avenida continua daquele lado da rua
      const trecho = jr === 0 ? j - 1 : j;
      return temTrechoAvenida(i, trecho) ? Solo.ZEBRA : Solo.CALCADA;
    }
    if (asfaltoRua) {
      const trecho = ia <= 1 ? i - 1 : i;
      return temTrechoRua(j, trecho) ? Solo.ZEBRA : Solo.CALCADA;
    }
    return Solo.CALCADA;
  }
  if (naAvenida) {
    if (!asfaltoAv) return Solo.CALCADA;
    // faixa amarela tracejada (2 sim, 2 não) na coluna 3: o traço fica na borda com a 4
    return ia === 3 && (lz >> 1) % 2 === 0 ? Solo.FAIXA : Solo.ASFALTO;
  }
  if (naRua) {
    if (!asfaltoRua) return Solo.CALCADA;
    return jr === 2 && (lx >> 1) % 2 === 0 ? Solo.FAIXA : Solo.ASFALTO;
  }
  return Solo.LOTE;
}

function soloDoParque(p: PlanoCidade, wx: number, wz: number): Solo {
  const lx = wx - p.ox;
  const lz = wz - p.oz;
  // calçada em volta da vaga do sorvete
  if (lz === 55 && lx >= p.vaga.x0 - p.ox - 1 && lx <= p.vaga.x1 - p.ox + 1) return Solo.CALCADA;
  const { cx, cz, rx, rz: rz0 } = p.lago;
  if (((wx - cx) / rx) ** 2 + ((wz - cz) / rz0) ** 2 <= 1) return Solo.LAGO;
  // a cruz de caminhos (onde eram a avenida e a rua) e o caminho em volta
  if ((lx >= 82 && lx <= 85) || (lz >= 73 && lz <= 76)) return Solo.CAMINHO;
  const anelX = lx === 50 || lx === 51 || lx === 116 || lx === 117;
  const anelZ = lz === 56 || lz === 57 || lz === 92 || lz === 93;
  if ((anelX && lz >= 56 && lz <= 93) || (anelZ && lx >= 50 && lx <= 117)) return Solo.CAMINHO;
  return Solo.GRAMA;
}

/** Bloco do chão para cada solo. */
const PISO: Record<Solo, number> = {
  [Solo.NADA]: Bloco.AR,
  [Solo.ASFALTO]: Bloco.ASFALTO,
  [Solo.FAIXA]: Bloco.FAIXA_RUA,
  [Solo.ZEBRA]: Bloco.FAIXA_PEDESTRE,
  [Solo.CALCADA]: Bloco.CALCADA,
  [Solo.GRAMA]: Bloco.TERRA_MUSGOSA,
  [Solo.CAMINHO]: Bloco.CALCADA,
  [Solo.LAGO]: Bloco.AREIA_BRUMA,
  [Solo.LOTE]: Bloco.CALCADA,
  [Solo.VAGA]: Bloco.ASFALTO,
};

export interface AjusteCidade {
  h: number;
  /** 1: chão da cidade (nada nasce); 2: rampa (plantas sim, árvores não); 0: amaciado. */
  ocupada: 0 | 1 | 2;
  piso?: number;
  /** Sem cavernas embaixo (a cidade e a rampa). */
  firme: boolean;
}

/**
 * Altura e chão da coluna com a cidade. Na área plana, a altura da cidade (o lago desce 2);
 * em volta, o relevo amaciado e preso a uma rampa de 1 bloco a cada 3 colunas (até 24
 * colunas; depois a rampa fica de 1 por coluna até alcançar o natural).
 */
export function ajusteDaCidade(
  p: PlanoCidade,
  wx: number,
  wz: number,
  natural: number,
): AjusteCidade | null {
  const d = distanciaDaCidade(p, wx, wz);
  if (d === 0) {
    const s = soloDaCidade(p, wx, wz);
    return { h: s === Solo.LAGO ? p.h - 2 : p.h, ocupada: 1, piso: PISO[s], firme: true };
  }
  if (d > ALCANCE_SUAVE) return null;
  const t = Math.min(1, d / ALCANCE_SUAVE);
  const suave = t * t * (3 - 2 * t);
  const lim = d <= RAMPA_CIDADE ? Math.floor(d / 3) : 8 + (d - RAMPA_CIDADE);
  const alvo = Math.round((natural - p.h) * suave);
  const h = p.h + Math.max(-lim, Math.min(lim, alvo));
  const perto = d <= RAMPA_CIDADE;
  if (!perto && h === natural) return null;
  return { h, ocupada: perto ? 2 : 0, firme: perto };
}

// ------------------------------------------------------------------------ as construções

/** Pincel com direção do mundo (0 +z, 1 +x, 2 -z, 3 -x) para os blocos que têm frente. */
export type PincelCidade = (wx: number, y: number, wz: number, id: number, meta?: number) => void;

/** Planta do lote (guardada: o mesmo lote dá sempre a mesma). */
const plantas = new WeakMap<LoteCidade, Planta | null>();
export function plantaDoLote(l: LoteCidade): Planta | null {
  if (plantas.has(l)) return plantas.get(l)!;
  const p = l.modelo && l.params ? construirModelo(l.modelo, l.params) : null;
  plantas.set(l, p);
  return p;
}

/** Célula (s, f) do lote no mundo: a frente (f = 0) na rua. */
export function noLoteCidade(l: LoteCidade, s: number, f: number): [number, number] {
  return l.porta === 'n'
    ? [l.x0 + s, l.z0 + f]
    : [l.x0 + l.largura - 1 - s, l.z0 + l.profundidade - 1 - f];
}

/** Direção local da planta para a do mundo. */
export function dirNoMundo(l: LoteCidade, d: number): number {
  // os bits de cima (o desenho da placa) passam iguais
  return l.porta === 'n' ? d : (d & ~3) | ((d + 2) & 3);
}

/** O lote, a praça ou o canteiro alcança o retângulo? */
function tocaLote(l: LoteCidade, r: Retangulo): boolean {
  return (
    l.x0 <= r.x1 &&
    l.x0 + l.largura - 1 >= r.x0 &&
    l.z0 <= r.z1 &&
    l.z0 + l.profundidade - 1 >= r.z0
  );
}

/** A cidade alcança o chunk (a área plana)? */
export function cidadeNoChunk(p: PlanoCidade, cx: number, cz: number): boolean {
  const r = { x0: cx * 16, z0: cz * 16, x1: cx * 16 + 15, z1: cz * 16 + 15 };
  return p.plana.x0 <= r.x1 && p.plana.x1 >= r.x0 && p.plana.z0 <= r.z1 && p.plana.z1 >= r.z0;
}

/**
 * Monta no chunk (cx, cz) o que a cidade tem nele: os prédios (pelas plantas), a praça, os
 * canteiros com tapume, o parque (lago, árvores, metrô), os postes e as árvores de rua.
 * `em` recorta o chunk.
 */
export function construirCidade(p: PlanoCidade, cx: number, cz: number, em: PincelCidade): void {
  const r: Retangulo = { x0: cx * 16 - 3, z0: cz * 16 - 3, x1: cx * 16 + 18, z1: cz * 16 + 18 };
  const Y = p.h + 1;
  for (const l of p.lotes) {
    if (!tocaLote(l, r)) continue;
    const pl = l.uso === 'praca' || l.uso === 'canteiro' ? null : plantaDoLote(l);
    // a planta começa em cima da calçada (chao = -1) ou no nível dela (chao = 0)
    const y0 = Y - 1 - (pl?.chao ?? -1);
    const q = (s: number, f: number, y: number, id: number, d?: number) => {
      const [x, z] = noLoteCidade(l, s, f);
      em(x, y0 + y, z, id, d === undefined ? undefined : dirNoMundo(l, d));
    };
    if (l.uso === 'praca') praca(l, q);
    else if (l.uso === 'canteiro') canteiro(l, q);
    else if (pl) pintarPlanta(l, pl, q);
  }
  // parque: a água do lago (o chão já desceu 2) e a entrada do metrô
  const { lago } = p;
  if (
    dentroRet(
      {
        x0: lago.cx - lago.rx,
        z0: lago.cz - lago.rz,
        x1: lago.cx + lago.rx,
        z1: lago.cz + lago.rz,
      },
      cx * 16 + 8,
      cz * 16 + 8,
      24,
    )
  )
    for (let x = Math.floor(lago.cx - lago.rx); x <= lago.cx + lago.rx; x++)
      for (let z = Math.floor(lago.cz - lago.rz); z <= lago.cz + lago.rz; z++)
        if (soloDaCidade(p, x, z) === Solo.LAGO) {
          em(x, p.h - 1, z, Bloco.AGUA);
          em(x, p.h, z, Bloco.AGUA);
        }
  if (dentroRet(p.metro, cx * 16 + 8, cz * 16 + 8, 16)) metro(p, em);
  for (const [x, z, raio, folha] of p.arvores)
    if (dentroRet(r, x, z, 3)) arvore(x, Y, z, raio, folha, em);
  for (const [x, z] of p.postes) if (dentroRet(r, x, z)) poste(x, Y, z, em);
}

type Q = (s: number, f: number, y: number, id: number, d?: number) => void;

/** Pinta a planta no lote (o que é NADA não mexe). */
function pintarPlanta(l: LoteCidade, pl: Planta, q: Q): void {
  for (let y = 0; y < pl.altura; y++)
    for (let f = 0; f < pl.profundidade; f++)
      for (let s = 0; s < pl.largura; s++) {
        const b = pl.blocos[indicePlanta(pl, s, f, y)];
        if (b === NADA) continue;
        const d = dirDaPlanta(pl, s, f, y);
        q(s, f, y, b, d === SEM_DIR ? undefined : d);
      }
  void l;
}

/** Praça pequena: fonte no meio, bancos de frente para ela e dois postes. */
function praca(l: LoteCidade, q: Q): void {
  // fonte: borda de pedra lisa com água e um repuxo de pedra no meio
  for (let s = 2; s <= 5; s++)
    for (let f = 2; f <= 5; f++) {
      const borda = s === 2 || s === 5 || f === 2 || f === 5;
      q(s, f, 0, borda ? Bloco.PEDRA_LISA : Bloco.AGUA);
    }
  q(3, 3, 0, Bloco.PEDRA_LISA);
  q(3, 3, 1, Bloco.PEDRA_LISA);
  // bancos (degrau de escada, encosto do lado de fora)
  for (const s of [3, 4]) {
    q(s, 7, 0, Bloco.ESCADA, 0);
    q(s, 0, 0, Bloco.ESCADA, 2);
  }
  // canteirinhos de flor nos cantos
  for (const [s, f] of [
    [0, 0],
    [7, 8],
    [0, 8],
  ]) {
    q(s, f, -1, Bloco.TERRA_MUSGOSA);
    q(s, f, 0, Bloco.FLOR);
  }
}

/**
 * Lote do canteiro (spec 014): o tapume laranja e branco em volta, com a entrada aberta na
 * frente, e a placa com o desenho da obra. A obra (fantasmas, andaime) vem na T05.
 */
function canteiro(l: LoteCidade, q: Q): void {
  const W = l.largura;
  const D = l.profundidade;
  for (let s = 0; s < W; s++)
    for (let f = 0; f < D; f++) {
      const borda = s === 0 || s === W - 1 || f === 0 || f === D - 1;
      if (!borda) continue;
      if (f === 0 && (s === 3 || s === 4)) continue;
      q(s, f, 0, Bloco.TAPUME);
    }
  // placa da obra (desenho do tijolo) num poste de grade junto da entrada, de frente para a rua
  q(5, 0, 1, Bloco.PLACA, 2 | (3 << 2));
}

/** Entrada do metrô (só enfeite): escada que desce até um portão de grade fechado. */
function metro(p: PlanoCidade, em: PincelCidade): void {
  const { x0, z0, x1, z1 } = p.metro;
  const H = p.h;
  for (let x = x0; x <= x1; x++)
    for (let z = z0; z <= z1; z++) {
      const lado = x === x0 || x === x1;
      const fundo = z === z1;
      // paredes de concreto da cava
      if (lado || fundo) {
        for (let y = H - 4; y <= H; y++) em(x, y, z, Bloco.CONCRETO);
        em(x, H + 1, z, Bloco.GRADE_FERRO);
        continue;
      }
      // degraus (sobem para -z, para a entrada) e o patamar lá embaixo
      const k = z - z0;
      for (let y = H - 4; y <= H; y++) em(x, y, z, Bloco.AR);
      if (k <= 2) {
        em(x, H - k, z, Bloco.ESCADINHA_PEDRA, 2);
        for (let y = H - 4; y < H - k; y++) em(x, y, z, Bloco.CONCRETO);
      } else {
        em(x, H - 4, z, Bloco.CONCRETO);
        // o portão fechado, de grade, no fundo do patamar
        if (z === z1 - 1) for (let y = H - 3; y <= H - 2; y++) em(x, y, z, Bloco.GRADE_FERRO);
      }
    }
  // dois postes de globo na entrada
  for (const x of [x0, x1]) poste(x, H + 1, z0 - 1, em);
}

function poste(x: number, Y: number, z: number, em: PincelCidade): void {
  for (let y = 0; y < 3; y++) em(x, Y + y, z, Bloco.GRADE_FERRO);
  em(x, Y + 3, z, Bloco.POSTE);
}

/** Árvore redondinha (ipê ou sibipiruna): tronco e copa de raio 1 (rua) ou 2 (parque). */
function arvore(
  x: number,
  Y: number,
  z: number,
  raio: number,
  folha: number,
  em: PincelCidade,
): void {
  const tronco = raio === 1 ? 3 : 4;
  for (let y = 0; y < tronco; y++) em(x, Y + y, z, Bloco.MADEIRA_RETORCIDA);
  const cy = Y + tronco + (raio === 1 ? 0 : 1);
  for (let dy = -raio; dy <= raio; dy++)
    for (let dz = -raio; dz <= raio; dz++)
      for (let dx = -raio; dx <= raio; dx++) {
        if (dx * dx + dy * dy + dz * dz > raio * raio + raio) continue;
        if (dx === 0 && dz === 0 && dy < 0) continue;
        em(x + dx, cy + dy, z + dz, folha);
      }
}

// ------------------------------------------------------------------------ proteção

/**
 * Passagens da cidade no chunk (o que fica sempre livre): o ar em cima das pistas (3 de
 * altura: ninguém põe bloco, os carrinhos nunca encalham) e, nos prédios, a frente e o
 * vão da porta e o ar em cima de cada degrau (escadinha, escada de dentro e de incêndio).
 */
export function passagensDaCidade(
  p: PlanoCidade,
  cx: number,
  cz: number,
  passagem: (wx: number, y: number, wz: number) => void,
): void {
  const Y = p.h + 1;
  for (let z = cz * 16; z < cz * 16 + 16; z++)
    for (let x = cx * 16; x < cx * 16 + 16; x++)
      if (soloDePista(soloDaCidade(p, x, z))) for (let y = 0; y < 3; y++) passagem(x, Y + y, z);
  const r: Retangulo = { x0: cx * 16, z0: cz * 16, x1: cx * 16 + 15, z1: cz * 16 + 15 };
  for (const l of p.lotes) {
    if (!tocaLote(l, r)) continue;
    if (l.uso === 'canteiro') {
      for (const s of [3, 4]) {
        const [x, z] = noLoteCidade(l, s, 0);
        for (let y = 0; y < 2; y++) passagem(x, Y + y, z);
      }
      continue;
    }
    const pl = plantaDoLote(l);
    if (!pl) continue;
    const y0 = Y - 1 - pl.chao;
    for (const [s, f, y] of passagensDaPlanta(pl)) {
      if (f < 0) continue;
      const [x, z] = noLoteCidade(l, s, f);
      passagem(x, y0 + y, z);
    }
  }
}

/** Células da planta que ficam livres: acima dos degraus e na frente e atrás da porta. */
export function passagensDaPlanta(pl: Planta): [number, number, number][] {
  const r: [number, number, number][] = [];
  const degrau = new Set<number>([
    Bloco.ESCADA,
    Bloco.ESCADINHA_PEDRA,
    Bloco.ESCADA_GRADE,
    Bloco.LAJE_GRADE,
  ]);
  for (let y = 0; y < pl.altura; y++)
    for (let f = 0; f < pl.profundidade; f++)
      for (let s = 0; s < pl.largura; s++) {
        const b = pl.blocos[indicePlanta(pl, s, f, y)];
        if (degrau.has(b)) for (const dy of [1, 2]) if (y + dy < pl.altura) r.push([s, f, y + dy]);
        if (
          b === Bloco.PORTA &&
          pl.blocos[indicePlanta(pl, s, f, Math.max(0, y - 1))] !== Bloco.PORTA
        ) {
          for (const df of [-1, 1]) for (const dy of [0, 1]) r.push([s, f + df, y + dy]);
        }
      }
  return r;
}

/** Retângulos dos lotes de prédio (para o teste e para os moradores). */
export function caixaDoLote(l: LoteCidade): Retangulo {
  return { x0: l.x0, z0: l.z0, x1: l.x0 + l.largura - 1, z1: l.z0 + l.profundidade - 1 };
}

export { casaGeminada };
