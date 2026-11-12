/**
 * Plantas dos prédios em código (spec 014, T01). Sem MagicaVoxel e sem conversor: cada
 * modelo é escrito como camadas de texto (uma letra por bloco) e montado por funções
 * paramétricas (andares, cores, espelho, caixa d'água, loja). O planejador da cidade sorteia
 * os parâmetros por lote (com `hash2`) e põe a planta no lote, girada para a rua.
 *
 * Coordenadas da planta (as do lote): `s` corre de lado (0 a largura - 1), `f` da frente
 * (0, a linha do lote na calçada) para o fundo, e `y` sobe a partir da primeira célula
 * acima do chão da cidade (y = 0 é o bloco logo em cima da calçada).
 *
 * Direções locais (para escadas, portas e frentes): 0 = para o fundo (+f), 1 = +s,
 * 2 = para a rua (-f), 3 = -s. O planejador converte para as do mundo (0 +z, 1 +x, 2 -z,
 * 3 -x) com a mesma conta do giro do lote.
 */
import { Bloco } from '../blocks';

export type DirLocal = 0 | 1 | 2 | 3;

/** Célula sem nada da planta (o planejador não mexe nela). */
export const NADA = 255;
/** Célula sem direção (bloco sem frente nem degrau). */
export const SEM_DIR = 255;

/** O que cada letra põe: um bloco (0 é o ar pintado: vão livre de dentro) e a direção. */
export interface Peca {
  b: number;
  d?: DirLocal;
}
/** Legenda das camadas. O espaço (' ') nunca está nela: não mexe na célula. */
export type Legenda = Readonly<Record<string, Peca>>;

/** Uma camada: uma linha de texto por fileira `f` (da frente para o fundo), uma letra por `s`. */
export type Camada = readonly string[];

export type CorToldo = 'vermelho' | 'verde';

/** Parâmetros sorteados por lote (o mesmo lote dá sempre a mesma planta). */
export interface ParametrosPredio {
  /** Andares de morar (o térreo conta). */
  andares: number;
  /** 0 a 3: cor da moldura da porta (vermelho, verde, azul, preto). */
  corPorta: number;
  corToldo: CorToldo;
  /** Porta, escada e escada de incêndio do outro lado. */
  espelho: boolean;
  caixaDagua: boolean;
  /** Lojinha no térreo (com toldo e vitrine). */
  loja: boolean;
  /** Semente das janelas acesas (cada janela acende ou não por ela). */
  luzes: number;
  /** O que a loja do térreo vende (a placa e o que tem dentro). */
  vende?: Vende;
}

/** Lojinhas do térreo: o desenho da placa e o que fica dentro (spec 014). */
export type Vende = 'padaria' | 'oficina' | 'construcao' | 'sorveteria';

/** Um apartamento (ou a loja) de um andar: o cômodo de dentro, sem a escada. */
export interface Comodo {
  /** Andar (0 = térreo). */
  andar: number;
  /** Retângulo de dentro (inclusivo), em coordenadas da planta. */
  s0: number;
  f0: number;
  s1: number;
  f1: number;
  /** Altura dos pés no piso (y da primeira célula livre). */
  pes: number;
  /** Onde fica a cama (o morador dorme ali), se houver. */
  cama?: [number, number];
}

export interface Planta {
  modelo: string;
  largura: number;
  profundidade: number;
  altura: number;
  params: ParametrosPredio;
  /** Bloco por célula ((y * profundidade + f) * largura + s); NADA = não mexe. */
  blocos: Uint8Array;
  /** Direção local por célula (SEM_DIR = sem direção). */
  metas: Uint8Array;
  /**
   * Altura (na planta) do bloco do chão da cidade: -1 (o padrão) quando a planta começa em
   * cima da calçada; 0 quando o térreo fica no nível da rua e a planta pinta o piso dele.
   */
  chao: number;
  /** Porta da rua: célula de baixo da porta (s, f, y). */
  porta: [number, number, number];
  /** Altura dos pés no terraço. */
  terraco: number;
  comodos: Comodo[];
}

/** Planta vazia (tudo NADA). */
export function plantaVazia(
  modelo: string,
  largura: number,
  profundidade: number,
  altura: number,
  params: ParametrosPredio,
): Planta {
  const n = largura * profundidade * altura;
  return {
    modelo,
    largura,
    profundidade,
    altura,
    params,
    blocos: new Uint8Array(n).fill(NADA),
    metas: new Uint8Array(n).fill(SEM_DIR),
    chao: -1,
    porta: [0, 0, 0],
    terraco: 0,
    comodos: [],
  };
}

export function indicePlanta(p: Planta, s: number, f: number, y: number): number {
  return (y * p.profundidade + f) * p.largura + s;
}

export function dentro(p: Planta, s: number, f: number, y: number): boolean {
  return s >= 0 && s < p.largura && f >= 0 && f < p.profundidade && y >= 0 && y < p.altura;
}

/**
 * Põe um bloco (com direção local, se tiver; os bits de cima do metadado, como o desenho da
 * placa, vão junto). Fora da planta é erro: nada sai do lote.
 */
export function por(p: Planta, s: number, f: number, y: number, b: number, d?: number): void {
  if (!dentro(p, s, f, y)) throw new Error(`${p.modelo}: bloco fora do lote em ${s},${f},${y}`);
  const i = indicePlanta(p, s, f, y);
  p.blocos[i] = b;
  p.metas[i] = d ?? SEM_DIR;
}

/** Volta a célula para "não mexe". */
export function limpar(p: Planta, s: number, f: number, y: number): void {
  const i = indicePlanta(p, s, f, y);
  p.blocos[i] = NADA;
  p.metas[i] = SEM_DIR;
}

export function blocoDaPlanta(p: Planta, s: number, f: number, y: number): number {
  return dentro(p, s, f, y) ? p.blocos[indicePlanta(p, s, f, y)] : NADA;
}

export function dirDaPlanta(p: Planta, s: number, f: number, y: number): number {
  return dentro(p, s, f, y) ? p.metas[indicePlanta(p, s, f, y)] : SEM_DIR;
}

/**
 * Pinta camadas de texto a partir da altura `y0` (a primeira camada em y0, a seguinte em
 * y0 + 1...). Cada camada tem `profundidade` linhas (ou menos: as que faltam não mexem) e
 * cada linha até `largura` letras. O espaço não mexe; letra fora da legenda é erro.
 */
export function pintarCamadas(
  p: Planta,
  y0: number,
  camadas: readonly Camada[],
  leg: Legenda,
): void {
  camadas.forEach((camada, k) => {
    camada.forEach((linha, f) => {
      if (linha.length > p.largura)
        throw new Error(`${p.modelo}: linha "${linha}" mais larga que o lote`);
      for (let s = 0; s < linha.length; s++) {
        const c = linha[s];
        if (c === ' ') continue;
        const peca = leg[c];
        if (!peca) throw new Error(`${p.modelo}: letra "${c}" sem legenda`);
        por(p, s, f, y0 + k, peca.b, peca.d);
      }
    });
  });
}

/** Espelha de lado (s vira largura - 1 - s); as direções +s e -s trocam. */
export function espelhar(p: Planta): Planta {
  const q = plantaVazia(p.modelo, p.largura, p.profundidade, p.altura, p.params);
  for (let y = 0; y < p.altura; y++)
    for (let f = 0; f < p.profundidade; f++)
      for (let s = 0; s < p.largura; s++) {
        const i = indicePlanta(p, s, f, y);
        const j = indicePlanta(q, p.largura - 1 - s, f, y);
        q.blocos[j] = p.blocos[i];
        const d = p.metas[i];
        const lado = d & 3;
        q.metas[j] = d === SEM_DIR || (lado !== 1 && lado !== 3) ? d : (d & ~3) | (lado ^ 2);
      }
  q.chao = p.chao;
  q.porta = [p.largura - 1 - p.porta[0], p.porta[1], p.porta[2]];
  q.terraco = p.terraco;
  q.comodos = p.comodos.map((c) => ({
    ...c,
    s0: p.largura - 1 - c.s1,
    s1: p.largura - 1 - c.s0,
    ...(c.cama ? { cama: [p.largura - 1 - c.cama[0], c.cama[1]] as [number, number] } : {}),
  }));
  return q;
}

/** Cores da moldura da porta (o parâmetro `corPorta`). */
export const CORES_PORTA: readonly number[] = [
  Bloco.LA_VERMELHA,
  Bloco.LA_VERDE,
  Bloco.LA_AZUL,
  Bloco.LA_PRETA,
];

/**
 * Janelas acesas (bloco "janela acesa", que brilha sem espalhar luz): cada janela (as
 * células de janela empilhadas na mesma coluna do mesmo andar) acende ou não por um
 * sorteio da semente `luzes`, mais ou menos uma em cada `fracao`.
 */
export function acenderJanelas(
  p: Planta,
  janela: number,
  acesa: number,
  andarDe: (y: number) => number,
  fracao = 0.35,
): void {
  for (let y = 0; y < p.altura; y++)
    for (let f = 0; f < p.profundidade; f++)
      for (let s = 0; s < p.largura; s++) {
        const i = indicePlanta(p, s, f, y);
        if (p.blocos[i] !== janela) continue;
        if (sorteio(p.params.luzes, s, f, andarDe(y)) < fracao) p.blocos[i] = acesa;
      }
}

/** Sorteio puro em [0, 1) (o mesmo em todo lugar). */
export function sorteio(semente: number, a: number, b: number, c: number): number {
  let h = Math.imul(a + 0x9e37, 374761393) ^ Math.imul(b + 0x85eb, 668265263);
  h ^= Math.imul(c + 0xc2b2, 2246822519) ^ Math.imul(semente | 0, 3266489917);
  h = Math.imul(h ^ (h >>> 15), 2246822519);
  h = Math.imul(h ^ (h >>> 13), 3266489917);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/**
 * A planta em texto, camada por camada (de baixo para cima), com uma letra por bloco tirada
 * da legenda inversa: é o retrato que o teste de regressão grava. Direções viram sufixo na
 * legenda (a mesma peça com outra direção tem outra letra).
 */
export function plantaEmTexto(p: Planta, leg: Legenda): string[] {
  const inversa = new Map<string, string>();
  for (const [c, peca] of Object.entries(leg)) {
    const k = `${peca.b}:${peca.d ?? SEM_DIR}`;
    if (!inversa.has(k)) inversa.set(k, c);
  }
  const out: string[] = [];
  for (let y = 0; y < p.altura; y++) {
    out.push(`y=${y}`);
    for (let f = 0; f < p.profundidade; f++) {
      let linha = '';
      for (let s = 0; s < p.largura; s++) {
        const i = indicePlanta(p, s, f, y);
        const b = p.blocos[i];
        if (b === NADA) {
          linha += ' ';
          continue;
        }
        linha += inversa.get(`${b}:${p.metas[i]}`) ?? '?';
      }
      out.push(linha);
    }
  }
  return out;
}
