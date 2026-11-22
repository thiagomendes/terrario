/**
 * Planejador da Noite das Fantasias (spec 027; `EstiloMundo.povoado.planta: 'baile'`). A vila da
 * festa, uma por mundo, em volta do nascimento, pura e determinística pela semente (o servidor da
 * nuvem e o trabalhador da malha acham a mesma), no caminho da Vila Neon (`vilaNeon.ts`): o lugar
 * em terra firme, o chão plano, os morrinhos baixos de grama na beira e a moldura de árvores
 * laranja, douradas e verde-oliva. Os outros temas não passam por aqui.
 *
 * O mapa tem 124 × 112 blocos, com o norte em -z. Coordenadas locais (u, v): u cresce para o leste
 * (+x) e v para o sul (+z), a partir do canto noroeste.
 * - **no meio, a Praça da Abóbora** (u 44 a 86, v 40 a 74), de pedrinha lilás, onde a criança
 *   nasce de frente para a abóbora gigante; o palco no lado norte, as barracas no oeste, as
 *   mesinhas e os bancos no leste e no sul;
 * - **ao norte, a Rua das Casinhas Tortas** (u 48 a 54), saindo do canto noroeste da praça, com
 *   cinco casinhas dos dois lados e a Casa da Vovó Zuleica no fim, de frente para a rua;
 * - **a leste, a Loja de Fantasias**, de frente para a praça;
 * - **ao sul, o gramado da festa**, colado à praça (o lugar do Trem das Risadas: na parte 1, um
 *   gramado acabado com canteiros de abóbora e lanternas);
 * - **a sudoeste, o Bosque das Lanternas**, e no fim do caminho dele o Castelinho do Vampirinho,
 *   cuja torre se vê da praça;
 * - **a sudeste, a Horta do Seu Jerônimo.**
 * Todos os caminhos são de pedrinha lilás (onde a vassoura desliza, na parte 3), e toda entrada de
 * lugar fica a até 60 blocos de caminho da praça (o teste mede pelo caminho).
 *
 * O planejador monta tudo uma vez (os blocos por chunk e o chão de cada coluna) e guarda; a geração
 * de cada chunk só copia. As peças que não são bloco (a abóbora gigante, as barracas, as portas,
 * as lanternas do bosque...) vão numa lista à parte (`pecas`), que a tela desenha quando o chão
 * delas está pronto.
 */
import { Bloco } from './blocks';
import { hash2 } from './noise';
import type { RelevoVila, RetanguloVila } from './vilaNeon';

/** Tamanho da vila da festa (o mapa). */
export const LARGURA_BAILE = 124;
export const PROFUNDIDADE_BAILE = 112;
/** Anel plano em volta do mapa (a moldura de árvores). */
export const MARGEM_BAILE = 10;
/** Rampa até o terreno natural: os morrinhos baixos de grama. */
export const RAMPA_BAILE = 24;
/**
 * Até onde o relevo é achatado em volta da vila: a visão máxima (8 pedaços) a partir da beira e
 * um pouco mais, para nenhum morro alto de fora aparecer de dentro da vila.
 */
export const ACHATADO_BAILE = 140;
/** Até onde o relevo é amaciado (depois do achatado, ele volta devagar ao natural). */
export const ALCANCE_SUAVE_BAILE = 260;

/** Peça da vila que não é bloco (a tela desenha; o núcleo só lê as caixas de colisão). */
export interface PecaBaile {
  tipo: TipoPecaBaile;
  /** Mundo: o meio da peça no chão (y = os pés). */
  x: number;
  y: number;
  z: number;
  /** Para onde a frente olha (0 +z, 1 +x, 2 -z, 3 -x). */
  dir: number;
  /** Variante (a cor, a barraca, o número da lanterna...). */
  n?: number;
  /** Segunda ponta (as bandeirolas). */
  ate?: [number, number, number];
}

export type TipoPecaBaile =
  /** A abóbora gigante sorridente da praça (o meio da base; `n` é o lado em blocos). */
  | 'abobora-gigante'
  /**
   * Uma abóbora de enfeite, o modelo arredondado de brinquedo (nos montinhos do gramado e na
   * horta); `n`: o lado em décimos de bloco.
   */
  | 'abobora'
  /** As barracas da praça: 0 a dos doces (Tia Filó), 1 a das canecas (Seu Olavo). */
  | 'barraca'
  | 'banco'
  | 'mesinha'
  /** O mastro das bandeirolas (`n`: a altura em décimos de bloco). */
  | 'mastro'
  /** As bandeirolas roxas e laranja, de `x,y,z` até `ate`. */
  | 'bandeirolas'
  /** O poste de ferro das lanternas de bloco (a rua, a praça, o gramado). */
  | 'poste-lanterna'
  /** As lanternas do caminho do bosque (n2: acendem com um toque); `n` é a ordem. */
  | 'lanterna-bosque'
  /** A porta fechada de uma casinha (`n`: a cor) e a campainha do lado. */
  | 'porta'
  | 'campainha'
  /** A teia de barbante de quina (`n`: 1 ou -1, o lado). */
  | 'teia'
  /** As folhinhas das janelas (`n`: a cor). */
  | 'janelinha'
  /** A Casa da Vovó: a porta, a janela redonda, a lua com estrelas, o porta-vassouras e o banquinho. */
  | 'porta-vovo'
  | 'janela-redonda'
  | 'lua-estrelas'
  | 'porta-vassouras'
  | 'banquinho'
  /** A Loja de Fantasias: a porta, os cabides e os chapéus da vitrine (`n`: qual). */
  | 'porta-loja'
  | 'vitrine'
  /** O Castelinho do Vampirinho: a porta e as bandeirinhas da torre. */
  | 'porta-castelo'
  | 'bandeirinha'
  /** A Horta do Seu Jerônimo. */
  | 'bancada'
  | 'parreira'
  | 'hortela'
  | 'regador'
  | 'carrinho'
  /** O canteiro marcado da n4 (a plaquinha de abóbora). */
  | 'canteiro-marcado'
  /** O poleiro da corujinha do bosque. */
  | 'poleiro';

/** Postos dos moradores da festa (o núcleo põe cada um no seu; T10). */
export type PostoBaile =
  | 'vovo'
  | 'dudu'
  | 'lulu'
  | 'bento'
  | 'jeronimo'
  | 'filo'
  | 'olavo';

/** Uma porta de casinha (n1): a frente da porta (onde a criança toca a campainha). */
export interface PortaBaile {
  x: number;
  y: number;
  z: number;
  dir: number;
  /** A da Vovó Zuleica (a última da rua). */
  vovo?: boolean;
}

export interface PontosBaile {
  /** A abóbora gigante: o meio da base e o lado (blocos). */
  abobora: { x: number; y: number; z: number; lado: number };
  /** O piso do palco (o retângulo) e a altura do piso. */
  palco: RetanguloVila & { y: number };
  /** O pé da escadinha do palco. */
  escadinha: [number, number, number];
  /** As barracas (o meio do balcão, no chão) e para onde a frente olha. */
  barracas: { x: number; y: number; z: number; dir: number }[];
  /** As portas da rua (a da Vovó por último). */
  portas: PortaBaile[];
  /** As lanternas do caminho do bosque (a célula da luz). */
  lanternas: [number, number, number][];
  /** O caminho do bosque, da praça ao castelinho (o meio do caminho em cada curva, no chão). */
  trilha: [number, number][];
  /** A varanda da Vovó (onde ela fica), o caldeirão, o porta-vassouras e o banquinho do Tufinho. */
  varanda: [number, number, number];
  caldeirao: [number, number, number];
  portaVassouras: [number, number, number];
  banquinho: [number, number, number];
  /** As portas fechadas da Loja e do Castelinho (a frente). */
  loja: [number, number, number];
  castelo: [number, number, number];
  /** O alto da torre do castelinho (o sósia de longe). */
  torre: [number, number, number];
  /** A horta: o portão, a bancada, a parreirinha, o canteiro de hortelã e o canteiro marcado. */
  portaoHorta: [number, number, number];
  bancada: [number, number, number];
  parreira: [number, number, number];
  hortela: [number, number, number];
  canteiro: [number, number, number];
  /** O lugar da estaçãozinha do trem (parte 3), na beira do gramado da festa. */
  estacao: [number, number, number];
  /**
   * T18 (n3): os três esconderijos da Lulu, na ordem da missão (atrás da abóbora gigante, na
   * quina de uma casinha, atrás de uma árvore do bosque): os pés e para onde ela espia.
   */
  esconderijos: { x: number; y: number; z: number; yaw: number; chegar?: [number, number] }[];
  /** T18 (n5): onde o Tufinho brinca na horta quando foge (os pés). */
  tufinhoHorta: [number, number, number];
  /** Onde cada morador fica. */
  postos: Record<PostoBaile, [number, number, number]>;
  /**
   * T10: os vizinhos das casinhas da rua (na ordem das portas, sem a da Vovó): na varandinha do
   * lado da porta, de frente para a rua.
   */
  vizinhos: { x: number; y: number; z: number; yaw: number }[];
}

export interface PlanoBaile {
  semente: number;
  /** Canto noroeste do mapa (u = 0, v = 0). */
  ox: number;
  oz: number;
  /** Altura do chão (o bloco do chão fica em y = h; os pés em h + 1). */
  h: number;
  /** Área plana (o mapa e a margem). */
  plana: RetanguloVila;
  /** Zonas (mundo), para o som, o guia e os testes. */
  zonas: Record<
    'praca' | 'rua' | 'vovo' | 'loja' | 'bosque' | 'castelo' | 'horta' | 'gramado',
    RetanguloVila
  >;
  /**
   * A entrada de cada lugar (mundo, a célula de caminho na frente da porta ou do portão), para a
   * medida "até 60 blocos de caminho da praça".
   */
  entradas: Record<'rua' | 'vovo' | 'loja' | 'bosque' | 'castelo' | 'horta' | 'gramado', [number, number]>;
  /** Onde a criança nasce e para onde olha (yaw: frente = seno, cosseno). */
  nascimento: { x: number; z: number; olhar: number };
  pontos: PontosBaile;
  pecas: PecaBaile[];
  /** Colunas do laguinho do bosque (o chão desce 2). */
  lago: RetanguloVila;
}

// ------------------------------------------------------------------------ guardado

interface Montado {
  plano: PlanoBaile;
  /** Chão de cada coluna da área plana (id do bloco; 0 = grama). */
  piso: Uint8Array;
  largura: number;
  /** Blocos por chunk: [x, y, z, id | meta << 8] em sequência. */
  porChunk: Map<string, number[]>;
}

const cache = new Map<string, Montado>();
const porPlano = new WeakMap<PlanoBaile, Montado>();

/** Esquece os planos (testes que trocam o relevo). */
export function limparBailes(): void {
  cache.clear();
}

/** O plano da vila da festa do mundo (sempre o mesmo para a mesma semente e o mesmo relevo). */
export function planoDoBaile(semente: number, r: RelevoVila, chaveRelevo = ''): PlanoBaile {
  const k = `${semente},${chaveRelevo}`;
  let m = cache.get(k);
  if (!m) {
    m = montarBaile(semente, r);
    if (cache.size > 8) cache.clear();
    cache.set(k, m);
    porPlano.set(m.plano, m);
  }
  return m.plano;
}

function montado(p: PlanoBaile): Montado {
  const m = porPlano.get(p);
  if (!m) throw new Error('plano do baile sem montagem');
  return m;
}

/**
 * Procura, em volta da origem, um lugar onde a vila inteira caiba em terra firme (pelo menos 85%
 * das amostras acima do mar). A altura do chão é a mediana do relevo ali.
 */
function lugarDoBaile(semente: number, r: RelevoVila): { cx: number; cz: number; h: number } {
  const W = LARGURA_BAILE + 2 * MARGEM_BAILE;
  const D = PROFUNDIDADE_BAILE + 2 * MARGEM_BAILE;
  const avaliar = (cx: number, cz: number) => {
    const hs: number[] = [];
    let terra = 0;
    for (let dz = -D / 2; dz <= D / 2; dz += 8)
      for (let dx = -W / 2; dx <= W / 2; dx += 8) {
        const h = r.altura(Math.round(cx + dx), Math.round(cz + dz), semente);
        hs.push(h);
        if (h > r.nivelMar + 1) terra++;
      }
    hs.sort((a, b) => a - b);
    return { terra: terra / hs.length, mediana: hs[hs.length >> 1] };
  };
  for (let anel = 0; anel <= 12; anel++) {
    const passos = anel === 0 ? 1 : anel * 8;
    for (let k = 0; k < passos; k++) {
      const a = (k / passos) * Math.PI * 2 + hash2(anel, 5, semente + 9501) * 0.5;
      const cx = Math.round(8 + Math.cos(a) * anel * 48);
      const cz = Math.round(8 + Math.sin(a) * anel * 48);
      const { terra, mediana } = avaliar(cx, cz);
      if (terra >= 0.85 && mediana < 84)
        return { cx, cz, h: Math.max(r.nivelMar + 3, Math.min(82, mediana)) };
    }
  }
  return { cx: 8, cz: 8, h: r.nivelMar + 4 };
}

// ------------------------------------------------------------------------ o chão

const dentro = (r: RetanguloVila, x: number, z: number, folga = 0) =>
  x >= r.x0 - folga && x <= r.x1 + folga && z >= r.z0 - folga && z <= r.z1 + folga;

/** Distância (Chebyshev) da coluna até a área plana (0 dentro dela). */
export function distanciaDoBaile(p: PlanoBaile, wx: number, wz: number): number {
  const dx = wx < p.plana.x0 ? p.plana.x0 - wx : wx > p.plana.x1 ? wx - p.plana.x1 : 0;
  const dz = wz < p.plana.z0 ? p.plana.z0 - wz : wz > p.plana.z1 ? wz - p.plana.z1 : 0;
  return Math.max(dx, dz);
}

/** O bloco do chão da coluna na vila (grama onde não há outro). */
export function pisoDoBaile(p: PlanoBaile, wx: number, wz: number): number {
  if (!dentro(p.plana, wx, wz)) return Bloco.AR;
  const m = montado(p);
  const id = m.piso[(wz - p.plana.z0) * m.largura + (wx - p.plana.x0)];
  return id || Bloco.TERRA_MUSGOSA;
}

export interface AjusteBaile {
  h: number;
  /** 1: chão da vila (nada nasce); 2: rampa (plantas sim, árvores não); 0: amaciado. */
  ocupada: 0 | 1 | 2;
  piso?: number;
  /** Sem cavernas embaixo (a vila e a rampa). */
  firme: boolean;
}

/**
 * Altura e chão da coluna com a vila. Na área plana, a altura da vila (o laguinho desce 2); em
 * volta, morrinhos baixos de grama: o relevo de fora entra devagar, achatado, até além da visão
 * máxima (nenhum morro alto nem paredão à vista de dentro da vila).
 */
export function ajusteDoBaile(
  p: PlanoBaile,
  wx: number,
  wz: number,
  natural: number,
): AjusteBaile | null {
  const d = distanciaDoBaile(p, wx, wz);
  if (d === 0) {
    const lago = dentro(p.lago, wx, wz) && pisoDoBaile(p, wx, wz) === Bloco.AREIA_BRUMA;
    return { h: lago ? p.h - 2 : p.h, ocupada: 1, piso: pisoDoBaile(p, wx, wz), firme: true };
  }
  if (d > ALCANCE_SUAVE_BAILE) return null;
  // até a visão máxima, o relevo de fora entra achatado (30%); depois volta devagar ao natural
  const t = Math.max(0, (d - ACHATADO_BAILE) / (ALCANCE_SUAVE_BAILE - ACHATADO_BAILE));
  const suave = t * t * (3 - 2 * t);
  // os morrinhos: perto, no máximo 1 bloco a cada 4 colunas; mais longe, 1 a cada 8; e no fim
  // o limite cresce depressa (o relevo natural chega sem degrau)
  const lim =
    d <= RAMPA_BAILE
      ? Math.floor(d / 4)
      : d <= ACHATADO_BAILE
        ? 6 + Math.floor((d - RAMPA_BAILE) / 8)
        : 20 + Math.floor((d - ACHATADO_BAILE) * 0.75);
  const alvo = Math.round((natural - p.h) * (0.3 + 0.7 * suave));
  const h = p.h + Math.max(-lim, Math.min(lim, alvo));
  const perto = d <= RAMPA_BAILE;
  if (!perto && h === natural) return null;
  return { h, ocupada: perto ? 2 : 0, firme: perto };
}

/** A vila alcança o chunk (a área plana)? */
export function baileNoChunk(p: PlanoBaile, cx: number, cz: number): boolean {
  const r = { x0: cx * 16, z0: cz * 16, x1: cx * 16 + 15, z1: cz * 16 + 15 };
  return p.plana.x0 <= r.x1 && p.plana.x1 >= r.x0 && p.plana.z0 <= r.z1 && p.plana.z1 >= r.z0;
}

/** Pincel com metadado (direção nos bits 0 e 1: 0 +z, 1 +x, 2 -z, 3 -x). */
export type PincelBaile = (wx: number, y: number, wz: number, id: number, meta?: number) => void;

/** Monta no chunk (cx, cz) os blocos da vila que caem nele. */
export function construirBaile(p: PlanoBaile, cx: number, cz: number, em: PincelBaile): void {
  const lista = montado(p).porChunk.get(`${cx},${cz}`);
  if (!lista) return;
  for (let i = 0; i < lista.length; i += 4) {
    const v = lista[i + 3];
    const meta = v >> 8;
    em(lista[i], lista[i + 1], lista[i + 2], v & 255, meta || undefined);
  }
}

/** Quantos blocos a vila põe no chunk (testes e medida). */
export function blocosDoBaileNoChunk(p: PlanoBaile, cx: number, cz: number): number {
  return (montado(p).porChunk.get(`${cx},${cz}`)?.length ?? 0) / 4;
}

/** As peças que caem no chunk (a tela cria quando a malha dele fica pronta). */
export function pecasDoBaileNoChunk(p: PlanoBaile, cx: number, cz: number): PecaBaile[] {
  return p.pecas.filter((q) => Math.floor(q.x / 16) === cx && Math.floor(q.z / 16) === cz);
}

/** A zona da coluna (o nome), ou null fora delas. */
export function zonaDoBaile(p: PlanoBaile, wx: number, wz: number): keyof PlanoBaile['zonas'] | null {
  for (const [k, r] of Object.entries(p.zonas))
    if (dentro(r, wx, wz)) return k as keyof PlanoBaile['zonas'];
  return null;
}

// ------------------------------------------------------------------------ a montagem

type Frente = 'n' | 's' | 'l' | 'o';
const DIR: Record<Frente, number> = { s: 0, l: 1, n: 2, o: 3 };

/** As medidas do mapa (locais), as mesmas que os testes e o guia leem pelo plano. */
const PRACA = { u0: 44, v0: 40, u1: 86, v1: 74 } as const;
const RUA = { u0: 48, u1: 54, v0: 10 } as const;
const PALCO = { u0: 60, v0: 40, u1: 76, v1: 45 } as const;
const ABOBORA = { u: 68, v: 57, lado: 12 } as const;
const NASCE = { u: 68.5, v: 71.5 } as const;
/** T18: o rumo da quina de trás da abóbora gigante (o esconderijo da Lulu), para o nordeste. */
const ATRAS_ABOBORA = [0.72, -0.694] as const;
const LOJA = { u0: 90, v0: 50, u1: 104, v1: 64 } as const;
const HORTA = { u0: 92, v0: 78, u1: 120, v1: 104 } as const;
const GRAMADO = { u0: 48, v0: 77, u1: 86, v1: 108 } as const;
const CASTELO = { u0: 5, v0: 89, u1: 25, v1: 107 } as const;
/** O caminho do bosque, da praça ao castelinho (pontos em u, v). */
const TRILHA_BOSQUE: [number, number][] = [
  [44, 67],
  [37, 68],
  [30, 71],
  [24, 76],
  [19, 82],
  [14, 90],
];
const LAGO = { u0: 24, v0: 52, u1: 34, v1: 61 } as const;
/** As lanternas de poste da rua, alternando os lados (u, v). */
const POSTES_RUA: readonly [number, number][] = [
  [47, 37],
  [55, 31],
  [47, 21],
  [55, 13],
];

function montarBaile(semente: number, r: RelevoVila): Montado {
  const lugar = lugarDoBaile(semente, r);
  const ox = lugar.cx - (LARGURA_BAILE >> 1);
  const oz = lugar.cz - (PROFUNDIDADE_BAILE >> 1);
  const h = lugar.h;
  const Y = h + 1;
  const plana: RetanguloVila = {
    x0: ox - MARGEM_BAILE,
    z0: oz - MARGEM_BAILE,
    x1: ox + LARGURA_BAILE - 1 + MARGEM_BAILE,
    z1: oz + PROFUNDIDADE_BAILE - 1 + MARGEM_BAILE,
  };
  const largura = plana.x1 - plana.x0 + 1;
  const profundidade = plana.z1 - plana.z0 + 1;
  const piso = new Uint8Array(largura * profundidade);
  /** O que já está tomado (lotes, caminhos, peças): as árvores de enfeite não entram. */
  const tomado = new Uint8Array(largura * profundidade);
  const porChunk = new Map<string, number[]>();
  const pecas: PecaBaile[] = [];
  /** Os troncos das árvores (u, v e a altura), para o esconderijo da Lulu no bosque (T18). */
  const troncos: [number, number, number][] = [];
  const s = (a: number, b: number, k: number) => hash2(a, b, semente + 9500 + k);

  const X = (u: number) => ox + u;
  const Z = (v: number) => oz + v;
  const idx = (u: number, v: number) => {
    const wx = X(u);
    const wz = Z(v);
    if (!dentro(plana, wx, wz)) return -1;
    return (wz - plana.z0) * largura + (wx - plana.x0);
  };
  /** Chão (y = h) da coluna (u, v). */
  const chao = (u: number, v: number, id: number) => {
    const i = idx(u, v);
    if (i < 0) return;
    piso[i] = id;
    tomado[i] = 1;
  };
  const tomar = (u0: number, v0: number, u1: number, v1: number) => {
    for (let u = Math.min(u0, u1); u <= Math.max(u0, u1); u++)
      for (let v = Math.min(v0, v1); v <= Math.max(v0, v1); v++) {
        const i = idx(u, v);
        if (i >= 0) tomado[i] = 1;
      }
  };
  const livre = (u: number, v: number, r = 0) => {
    for (let du = -r; du <= r; du++)
      for (let dv = -r; dv <= r; dv++) {
        const i = idx(u + du, v + dv);
        if (i < 0 || tomado[i]) return false;
      }
    return true;
  };
  /** Bloco em (u, y, v), com y = 1 o primeiro acima do chão (y = 0 é o próprio chão). */
  const b = (u: number, y: number, v: number, id: number, meta = 0) => {
    const wx = X(u);
    const wz = Z(v);
    const k = `${Math.floor(wx / 16)},${Math.floor(wz / 16)}`;
    let l = porChunk.get(k);
    if (!l) porChunk.set(k, (l = []));
    l.push(wx, h + y, wz, id | (meta << 8));
  };
  const coluna = (u: number, v: number, y0: number, y1: number, id: number) => {
    for (let y = y0; y <= y1; y++) b(u, y, v, id);
  };
  const peca = (
    tipo: TipoPecaBaile,
    u: number,
    v: number,
    dir: number,
    n?: number,
    y = 0,
    ate?: [number, number, number],
  ) => {
    pecas.push({
      tipo,
      x: X(u),
      y: Y + y,
      z: Z(v),
      dir,
      ...(n === undefined ? {} : { n }),
      ...(ate ? { ate: [X(ate[0]), Y + ate[1], Z(ate[2])] } : {}),
    });
  };
  const ret = (u0: number, v0: number, u1: number, v1: number): RetanguloVila => ({
    x0: X(u0),
    z0: Z(v0),
    x1: X(u1),
    z1: Z(v1),
  });
  const p3 = (u: number, y: number, v: number): [number, number, number] => [X(u), Y + y, Z(v)];
  const encher = (u0: number, v0: number, u1: number, v1: number, id: number) => {
    for (let u = u0; u <= u1; u++) for (let v = v0; v <= v1; v++) chao(u, v, id);
  };
  /** Caminho de pedrinha lilás pelos pontos, com a largura dada (a beira em zigue-zague). */
  const caminho = (pts: [number, number][], larg: number) => {
    const r = (larg - 1) / 2;
    for (let i = 1; i < pts.length; i++) {
      const [a, c] = [pts[i - 1], pts[i]];
      const n = Math.ceil(Math.hypot(c[0] - a[0], c[1] - a[1]) * 2);
      for (let k = 0; k <= n; k++) {
        const u = a[0] + ((c[0] - a[0]) * k) / n;
        const v = a[1] + ((c[1] - a[1]) * k) / n;
        for (let du = -Math.ceil(r); du <= Math.ceil(r); du++)
          for (let dv = -Math.ceil(r); dv <= Math.ceil(r); dv++) {
            const uu = Math.round(u + du);
            const vv = Math.round(v + dv);
            const beira = Math.abs(du) > r - 0.5 || Math.abs(dv) > r - 0.5;
            if (beira && Math.hypot(du, dv) > r + 0.3 && s(uu, vv, 17) < 0.5) continue;
            chao(uu, vv, Bloco.PEDRINHA_LILAS);
          }
      }
    }
  };

  // ============================================================== peças pequenas de blocos
  /**
   * Árvore do jogo (o carvalho de copa redonda, de blocos), com as folhas do tema: laranja,
   * douradas, verde-oliva ou cor de cobre. O tronco de madeira marrom (nunca cinza).
   */
  const arvore = (u: number, v: number, folha: number, alta = 0) => {
    const tronco = 4 + Math.floor(s(u, v, 12) * 2) + alta;
    troncos.push([u, v, tronco]);
    for (let y = 1; y <= tronco; y++) b(u, y, v, Bloco.MADEIRA_RETORCIDA);
    for (let dy = -2; dy <= 1; dy++) {
      const raio = dy >= 0 ? 1 : 2;
      for (let dz = -raio; dz <= raio; dz++)
        for (let dx = -raio; dx <= raio; dx++) {
          const canto = Math.abs(dx) === raio && Math.abs(dz) === raio;
          if (canto && (raio === 2 || dy === 1)) continue;
          if (dx === 0 && dz === 0 && dy < 1) continue;
          b(u + dx, tronco + dy, v + dz, folha);
        }
    }
    b(u, tronco + 2, v, folha);
    tomar(u - 1, v - 1, u + 1, v + 1);
  };
  /** As folhas sorteadas do bosque (laranja na maioria, douradas, cobre e um pouco de oliva). */
  const folhaDoBosque = (u: number, v: number) => {
    const t = s(u, v, 21);
    return t < 0.5
      ? Bloco.FOLHAS_LARANJA
      : t < 0.75
        ? Bloco.FOLHAS_BETULA
        : t < 0.9
          ? Bloco.FOLHAS_OUTONO
          : Bloco.FOLHAGEM;
  };
  /** Poste de lanterna de bloco (a lanterna em cima de um poste de ferro de brinquedo). */
  const posteLanterna = (u: number, v: number) => {
    b(u, 3, v, Bloco.LANTERNA);
    peca('poste-lanterna', u + 0.5, v + 0.5, 0);
    tomar(u, v, u, v);
  };
  /** Lampião de abóbora de bloco (o rosto para `fr`). */
  const lampiao = (u: number, v: number, fr: Frente, y = 1) => b(u, y, v, Bloco.LAMPIAO_ABOBORA, DIR[fr]);

  /** Mapeia (s, f) de um lote para (u, v): a frente (f = 0) na rua. */
  const noLote = (u0: number, v0: number, w: number, d: number, fr: Frente) => {
    return (sx: number, f: number): [number, number] => {
      switch (fr) {
        case 'n':
          return [u0 + sx, v0 + f];
        case 's':
          return [u0 + w - 1 - sx, v0 + d - 1 - f];
        case 'o':
          return [u0 + f, v0 + w - 1 - sx];
        case 'l':
          return [u0 + d - 1 - f, v0 + sx];
      }
    };
  };
  // ============================================================== as casinhas tortas
  interface Casinha {
    /** Largura na rua (`w`), fundura (`d`) e altura do térreo. */
    w: number;
    d: number;
    H: number;
    andar?: { desl: 1 | -1; H: number };
    parede: number;
    /** A cumeeira paralela à rua ('rua') ou o oitão de frente para a rua ('oitao'). */
    cumeeira: 'rua' | 'oitao';
    passo: [number, number];
    chamine: 1 | -1;
    folhas: number;
    porta: number;
    vovo?: boolean;
  }
  const portas: PortaBaile[] = [];
  const vizinhos: PontosBaile['vizinhos'] = [];
  let varanda: [number, number, number] = [0, 0, 0];
  let caldeirao: [number, number, number] = [0, 0, 0];
  let portaVassouras: [number, number, number] = [0, 0, 0];
  let banquinho: [number, number, number] = [0, 0, 0];
  /** O caminho de pedrinha na frente da varanda da Vovó (a entrada dela). */
  let entradaVovo: [number, number] = [0, 0];
  /**
   * Uma casinha torta no lote (u0, v0) de frente `fr` para a rua: o quintal da frente (f 0 e 1,
   * com a varandinha), as paredes de tijolo torto ou de tábua verde-oliva com as quinas de tábua
   * escura, as janelas tortas acesas em alturas diferentes, o telhado roxo em degraus (cada lado
   * sobe num passo: torto), a chaminé de tijolo inclinada, a porta com o toldinho e o lampião.
   */
  function casinha(u0: number, v0: number, fr: Frente, c: Casinha) {
    const VARANDA = c.vovo ? 4 : 2;
    const D = c.d + VARANDA;
    const q = noLote(u0, v0, c.w, D, fr);
    const dir = DIR[fr];
    // na frente o lote é "f = 0" (a rua); a casa começa em f = VARANDA
    const f0 = VARANDA;
    const f1 = D - 1;
    const meio = Math.floor(c.w / 2);
    for (let sx = 0; sx < c.w; sx++)
      for (let f = 0; f < D; f++) {
        const [u, v] = q(sx, f);
        if (f >= f0) chao(u, v, Bloco.TABUAS);
        else tomar(u, v, u, v);
      }
    // o caminho de pedrinha até a porta
    for (let f = 0; f < f0; f++) {
      const [u, v] = q(meio, f);
      chao(u, v, Bloco.PEDRINHA_LILAS);
      if (!c.vovo) {
        const [u2, v2] = q(meio - 1, f);
        chao(u2, v2, Bloco.PEDRINHA_LILAS);
      }
    }
    const quina = Bloco.TABUAS_PINHO;
    const paredes = (a: number, z: number, y0: number, y1: number, cinta: boolean) => {
      for (let sx = a; sx <= z; sx++)
        for (let f = f0; f <= f1; f++) {
          const borda = sx === a || sx === z || f === f0 || f === f1;
          if (!borda) continue;
          const [u, v] = q(sx, f);
          const ehQuina = (sx === a || sx === z) && (f === f0 || f === f1);
          for (let y = y0; y <= y1; y++)
            b(u, y, v, ehQuina || (cinta && y === y0) ? quina : c.parede);
        }
    };
    paredes(0, c.w - 1, 1, c.H, false);
    const t0 = c.andar?.desl === 1 ? 1 : c.andar?.desl === -1 ? -1 : 0;
    const topo = c.H + (c.andar?.H ?? 0);
    if (c.andar) paredes(t0, t0 + c.w - 1, c.H + 1, topo, true);
    // a porta: o vão de 2 (3 na da Vovó) e a peça da porta na frente
    const largPorta = c.vovo ? 1 : 0;
    for (let sx = meio - largPorta; sx <= meio + largPorta; sx++)
      for (let y = 1; y <= (c.vovo ? 3 : 2); y++) {
        const [u, v] = q(sx, f0);
        b(u, y, v, Bloco.AR);
      }
    const [pu, pv] = q(meio, f0);
    const [fu, fv] = q(meio, f0 - 1);
    // a peça mora na beira de fora da parede (o meio da célula da porta, meio bloco para fora)
    const px = (pu + fu) / 2 + 0.5;
    const pz = (pv + fv) / 2 + 0.5;
    peca(c.vovo ? 'porta-vovo' : 'porta', px, pz, dir, c.porta);
    portas.push({ x: X(fu) + 0.5, y: Y, z: Z(fv) + 0.5, dir, ...(c.vovo ? { vovo: true } : {}) });
    if (!c.vovo) {
      // T10: o vizinho da casinha, no quintalzinho da frente do lado do caminho da porta (do
      // outro lado da campainha, longe das folhinhas das janelas), de frente para a rua
      // (fora da célula de um poste de lanterna da rua)
      const sx = [meio - 2, meio - 3].find((k) => {
        const [u, v] = q(k, 0);
        return !POSTES_RUA.some(([pu, pv]) => pu === u && pv === v);
      })!;
      const [mu, mv] = q(sx, 0);
      const [ru, rv] = q(sx, -1);
      const [x, y, z] = p3(mu + 0.5, 0, mv + 0.5);
      vizinhos.push({ x, y, z, yaw: Math.atan2(ru - mu, rv - mv) });
    }
    // a campainha do lado da porta, e o toldinho por cima
    const [cu, cv] = q(meio + (c.vovo ? 2 : 1), f0);
    const [cfu, cfv] = q(meio + (c.vovo ? 2 : 1), f0 - 1);
    peca('campainha', (cu + cfu) / 2 + 0.5, (cv + cfv) / 2 + 0.5, dir, 0, 0.75);
    if (!c.vovo)
      for (let sx = meio - 1; sx <= meio + 1; sx++) {
        const [u, v] = q(sx, f0 - 1);
        b(u, 3, v, Bloco.TOLDINHO);
      }
    // as janelas tortas em alturas diferentes (casa torta não tem janela em fila)
    const janela = (sx: number, f: number, y: number, acesa: boolean) => {
      const [u, v] = q(sx, f);
      b(u, y, v, acesa ? Bloco.JANELA_TORTA_ACESA : Bloco.JANELA_TORTA);
      if (f === f0) {
        const [fu2, fv2] = q(sx, f0 - 1);
        peca('janelinha', (u + fu2) / 2 + 0.5, (v + fv2) / 2 + 0.5, dir, c.folhas, y - 1);
      }
    };
    const lados = [1, c.w - 2].filter((sx) => Math.abs(sx - meio) > 1 + largPorta);
    lados.forEach((sx, i) => janela(sx, f0, 2 + (c.H >= 4 && i === 1 ? 1 : 0), true));
    if (c.andar)
      [t0 + 1, t0 + c.w - 2].forEach((sx, i) => janela(sx, f0, c.H + (i === 0 ? 3 : 2), i === 0));
    for (const f of [f0 + 2, f1 - 2]) {
      janela(0, f, 2, true);
      janela(c.w - 1, f, 2, f === f1 - 2);
    }
    // o telhado roxo em degraus
    const aoLongo = c.cumeeira === 'rua';
    // a = o eixo que sobe e desce (o perfil do telhado), b = o eixo da cumeeira
    const a0 = aoLongo ? f0 - 1 : t0 - 1;
    const a1 = aoLongo ? f1 + 1 : t0 + c.w;
    const b0 = aoLongo ? t0 - 1 : f0 - 1;
    const b1 = aoLongo ? t0 + c.w : f1 + 1;
    const alt: number[] = [];
    for (let a = a0; a <= a1; a++) alt.push(Math.min((a - a0) * c.passo[0], (a1 - a) * c.passo[1]));
    const cel = (a: number, bb: number) => (aoLongo ? q(bb, a) : q(a, bb));
    for (let bb = b0; bb <= b1; bb++)
      for (let i = 0; i < alt.length; i++) {
        const a = a0 + i;
        const viz = Math.min(alt[i - 1] ?? -1, alt[i + 1] ?? -1);
        const base = Math.max(0, Math.min(alt[i], viz + 1));
        const [u, v] = cel(a, bb);
        for (let k = base; k <= alt[i]; k++) b(u, topo + 1 + k, v, Bloco.TELHA_ROXA);
        // o oitão (a parede em triângulo) nas pontas da cumeeira
        const ponta = aoLongo ? bb === t0 || bb === t0 + c.w - 1 : bb === f0 || bb === f1;
        if (ponta && a > a0 && a < a1)
          for (let k = 0; k < base; k++) b(u, topo + 1 + k, v, c.parede);
      }
    const iMax = alt.indexOf(Math.max(...alt));
    if (c.vovo) {
      // o chapéu de bruxa: a ponta sobe mais e entorta para o lado
      const am = a0 + iMax;
      for (let bb = b0 + 1; bb <= b1 - 1; bb++) {
        for (const [da, dy] of [
          [0, 2],
          [1, 2],
          [1, 3],
          [2, 3],
          [2, 4],
        ] as const) {
          const [u, v] = cel(am + da, bb);
          b(u, topo + dy + alt[iMax], v, Bloco.TELHA_ROXA);
        }
      }
      // a janela redonda acesa no alto da frente, em cima da porta
      peca('janela-redonda', px, pz, dir, 0, topo + 1);
    }
    // a chaminé de tijolo, inclinada em degraus (o degrau sempre encostado no de baixo)
    const chS = c.chamine === 1 ? t0 + c.w - 2 : t0 + 1;
    const chF = f1 - 1;
    const hCh = aoLongo ? alt[chF - a0] : alt[chS - a0];
    for (let k = 0; k < 4; k++) {
      const sx = chS + c.chamine * Math.floor(k / 2);
      const [u, v] = q(sx, chF);
      b(u, topo + 1 + hCh + k, v, Bloco.TIJOLOS);
      if (k > 0 && k % 2 === 0) {
        const [u2, v2] = q(sx - c.chamine, chF);
        b(u2, topo + 1 + hCh + k, v2, Bloco.TIJOLOS);
      }
    }
    // a teia de barbante na quina de cima da frente
    const [tu, tv] = q(c.vovo ? c.w - 1 : 0, f0 - 1);
    peca('teia', tu + 0.5, tv + 0.5, dir, c.vovo ? -1 : 1, topo - 0.05);
    if (!c.vovo) {
      // o lampião de abóbora do lado da porta, virado para a rua
      const [lu, lv] = q(meio + 2, f0 - 1);
      lampiao(lu, lv, fr);
      return;
    }
    // a Vovó Zuleica: a varanda coberta (o toldinho listrado), as cercas dos lados, o caldeirão
    // na frente (à vista de quem passa), o porta-vassouras, o banquinho do Tufinho e a lua
    for (let sx = 0; sx < c.w; sx++)
      for (let f = 1; f < f0; f++) {
        const [u, v] = q(sx, f);
        chao(u, v, Bloco.TABUAS);
        b(u, 4, v, Bloco.TOLDINHO);
      }
    for (const sx of [0, c.w - 1]) {
      const [u, v] = q(sx, 1);
      coluna(u, v, 1, 3, Bloco.CERCA);
    }
    const [vu, vv] = q(meio, 2);
    varanda = p3(vu + 0.5, 0, vv + 0.5);
    const [eu, ev] = q(meio, 0);
    entradaVovo = [X(eu), Z(ev)];
    const [ku, kv] = q(2, 0);
    b(ku, 1, kv, Bloco.CALDEIRAO);
    caldeirao = p3(ku + 0.5, 0, kv + 0.5);
    const [bu, bv] = q(1, 2);
    peca('porta-vassouras', bu + 0.5, bv + 0.5, dir);
    portaVassouras = p3(bu + 0.5, 0, bv + 0.5);
    const [nu, nv] = q(c.w - 3, 2);
    peca('banquinho', nu + 0.5, nv + 0.5, dir);
    banquinho = p3(nu + 0.5, 0, nv + 0.5);
    const [lu, lv] = q(meio + 2, 1);
    lampiao(lu, lv, fr);
    peca('lua-estrelas', px, pz, dir, 0, 4.75);
  }

  // ============================================================== a praça da abóbora
  encher(PRACA.u0, PRACA.v0, PRACA.u1, PRACA.v1, Bloco.PEDRINHA_LILAS);
  // os cantos arredondados da praça (grama)
  for (const [cu, cv] of [
    [PRACA.u0, PRACA.v0],
    [PRACA.u1, PRACA.v0],
    [PRACA.u0, PRACA.v1],
    [PRACA.u1, PRACA.v1],
  ])
    chao(cu, cv, Bloco.TERRA_MUSGOSA);
  // o palco de tábua roxa (a frente para o sul), a parede do fundo, a escadinha e as bandeirolas
  for (let u = PALCO.u0; u <= PALCO.u1; u++)
    for (let v = PALCO.v0; v <= PALCO.v1; v++) b(u, 1, v, Bloco.TABUA_ROXA);
  for (let u = PALCO.u0; u <= PALCO.u1; u++)
    for (let y = 2; y <= 6; y++) {
      const moldura = u === PALCO.u0 || u === PALCO.u1 || y === 6;
      b(u, y, PALCO.v0, moldura ? Bloco.TABUAS_PINHO : Bloco.TABUA_ROXA);
    }
  for (let u = PALCO.u0 + 1; u < PALCO.u1; u++) b(u, 7, PALCO.v0, Bloco.TABUAS_PINHO);
  for (let u = PALCO.u0 + 4; u <= PALCO.u1 - 4; u++) b(u, 8, PALCO.v0, Bloco.TELHA_ROXA);
  for (let u = PALCO.u0 + 6; u <= PALCO.u1 - 6; u++) b(u, 9, PALCO.v0, Bloco.TELHA_ROXA);
  const meioPalco = (PALCO.u0 + PALCO.u1) >> 1;
  for (let u = meioPalco - 2; u <= meioPalco + 2; u++) b(u, 1, PALCO.v1 + 1, Bloco.ESCADA, DIR.n);
  for (const u of [PALCO.u0, PALCO.u1]) coluna(u, PALCO.v1, 2, 5, Bloco.CERCA);
  lampiao(PALCO.u0 + 1, PALCO.v1, 's', 2);
  lampiao(PALCO.u1 - 1, PALCO.v1, 's', 2);
  tomar(PALCO.u0, PALCO.v0, PALCO.u1, PALCO.v1 + 1);
  peca(
    'bandeirolas',
    PALCO.u0 + 0.5,
    PALCO.v1 + 0.5,
    0,
    0,
    5,
    [PALCO.u1 + 0.5, 5, PALCO.v1 + 0.5],
  );
  // a abóbora gigante no meio (de frente para quem nasce)
  peca('abobora-gigante', ABOBORA.u + 0.5, ABOBORA.v + 0.5, 0, ABOBORA.lado);
  tomar(
    ABOBORA.u - ABOBORA.lado / 2,
    ABOBORA.v - ABOBORA.lado / 2,
    ABOBORA.u + ABOBORA.lado / 2,
    ABOBORA.v + ABOBORA.lado / 2,
  );
  // as barracas no lado oeste, de frente para o meio da praça (o chão de tábuas embaixo)
  const barracas: PontosBaile['barracas'] = [];
  for (const [n, v] of [
    [0, 51],
    [1, 61],
  ] as const) {
    encher(48, v - 2, 51, v + 2, Bloco.TABUAS);
    peca('barraca', 50, v + 0.5, DIR.l, n);
    barracas.push({ x: X(52) + 0.5, y: Y, z: Z(v) + 0.5, dir: DIR.l });
    lampiao(52, v + 3, 'l');
  }
  // mesinhas e bancos (sem exagero), as lanternas de poste e as abóboras acesas da beira
  for (const [u, v] of [
    [80, 50],
    [80, 62],
  ])
    peca('mesinha', u + 0.5, v + 0.5, 0);
  peca('banco', 84.5, 56.5, DIR.o);
  peca('banco', 58.5, 72.5, DIR.n);
  peca('banco', 78.5, 72.5, DIR.n);
  for (const [u, v] of [
    [45, 42],
    [85, 42],
    [45, 73],
    [85, 73],
    [85, 61],
  ])
    posteLanterna(u, v);
  for (const u of [50, 56, 62, 74, 80]) lampiao(u, PRACA.v1, 's');
  for (const [u, v, a] of [
    [47, 47, 52],
    [56, 47, 40],
    [80, 47, 40],
    [84, 49, 52],
  ] as const)
    peca('mastro', u + 0.5, v + 0.5, 0, a);
  peca('bandeirolas', 47.5, 47.5, 0, 1, 5.2, [56.5, 4, 47.5]);
  peca('bandeirolas', 80.5, 47.5, 0, 1, 4, [84.5, 5.2, 49.5]);

  // ============================================================== a rua das casinhas tortas
  caminho(
    [
      [(RUA.u0 + RUA.u1) / 2, PRACA.v0],
      [(RUA.u0 + RUA.u1) / 2, RUA.v0],
    ],
    RUA.u1 - RUA.u0 + 1,
  );
  const PAREDES = [Bloco.TIJOLO_TORTO, Bloco.TABUA_MUSGO];
  const casas: [number, number, Frente, Casinha][] = [
    // o lado oeste (a frente para o leste, na rua): três casinhas
    [36, 13, 'l', { w: 8, d: 7, H: 4, parede: PAREDES[0], cumeeira: 'oitao', passo: [1, 2], chamine: -1, folhas: 0, porta: 0 }],
    [36, 23, 'l', { w: 8, d: 7, H: 3, andar: { desl: 1, H: 3 }, parede: PAREDES[1], cumeeira: 'rua', passo: [1, 2], chamine: 1, folhas: 1, porta: 1 }],
    [36, 33, 'l', { w: 7, d: 7, H: 4, parede: PAREDES[0], cumeeira: 'oitao', passo: [2, 1], chamine: 1, folhas: 2, porta: 2 }],
    // o lado leste (a frente para o oeste): duas casinhas
    [55, 15, 'o', { w: 8, d: 7, H: 3, parede: PAREDES[1], cumeeira: 'oitao', passo: [2, 1], chamine: 1, folhas: 2, porta: 1 }],
    [55, 26, 'o', { w: 8, d: 7, H: 4, andar: { desl: -1, H: 3 }, parede: PAREDES[0], cumeeira: 'rua', passo: [1, 2], chamine: -1, folhas: 0, porta: 0 }],
  ];
  for (const [u0, v0, fr, c] of casas) {
    // o lote: w na rua; a fundura com a varandinha (2)
    const D = c.d + 2;
    const [lu0, lv0] = fr === 'l' || fr === 'o' ? [fr === 'l' ? RUA.u0 - D : RUA.u1 + 1, v0] : [u0, v0];
    casinha(lu0, lv0, fr, c);
  }
  // a Casa da Vovó Zuleica no fim da rua, de frente para o sul (para a rua)
  casinha(44, 0, 's', {
    w: 11,
    d: 7,
    H: 4,
    parede: Bloco.TIJOLO_TORTO,
    cumeeira: 'rua',
    passo: [2, 2],
    chamine: -1,
    folhas: 1,
    porta: 3,
    vovo: true,
  });
  // as lanternas de poste da rua, alternando os lados
  for (const [u, v] of POSTES_RUA) posteLanterna(u, v);

  // ============================================================== a loja de fantasias
  {
    const { u0, v0, u1, v1 } = LOJA;
    encher(u0, v0, u1, v1, Bloco.TABUAS);
    const H = 5;
    for (let u = u0; u <= u1; u++)
      for (let v = v0; v <= v1; v++) {
        const borda = u === u0 || u === u1 || v === v0 || v === v1;
        if (!borda) continue;
        const quina = (u === u0 || u === u1) && (v === v0 || v === v1);
        for (let y = 1; y <= H; y++) b(u, y, v, quina || y === H ? Bloco.TABUAS_PINHO : Bloco.TABUA_MUSGO);
      }
    // o telhado roxo em degraus (a cumeeira de norte a sul)
    for (let k = 0; k <= 4; k++)
      for (let v = v0 - 1; v <= v1 + 1; v++)
        for (const u of [u0 - 1 + k, u1 + 1 - k]) b(u, H + 1 + k, v, Bloco.TELHA_ROXA);
    for (let v = v0 - 1; v <= v1 + 1; v++)
      for (let u = u0 + 4; u <= u1 - 4; u++) b(u, H + 5, v, Bloco.TELHA_ROXA);
    // a fachada da praça (oeste): a porta no meio, as duas vitrines de vidro e os toldinhos
    const meio = (v0 + v1) >> 1;
    for (let y = 1; y <= 3; y++) for (let v = meio - 1; v <= meio + 1; v++) b(u0, y, v, Bloco.AR);
    peca('porta-loja', u0, meio + 0.5, DIR.o);
    for (const [va, vb, n] of [
      [v0 + 2, meio - 3, 0],
      [meio + 3, v1 - 2, 1],
    ] as const) {
      for (let v = va; v <= vb; v++) {
        for (let y = 1; y <= 3; y++) b(u0, y, v, Bloco.VIDRO);
        b(u0 - 1, 4, v, Bloco.TOLDINHO);
      }
      peca('vitrine', u0 + 1.5, (va + vb) / 2 + 0.5, DIR.o, n);
    }
    lampiao(u0 - 1, meio - 2, 'o');
    lampiao(u0 - 1, meio + 2, 'o');
    // as luzes de dentro da loja (a vitrine fica acesa de noite: por trás do vidro, nada de breu)
    for (const v of [v0 + 4, v1 - 4]) b(u0 + 3, 4, v, Bloco.LANTERNA);
    peca('teia', u0 - 0.5, v0 + 0.5, DIR.o, 1, H - 0.05);
    // o caminho da praça até a porta
    encher(PRACA.u1 + 1, meio - 2, u0 - 1, meio + 2, Bloco.PEDRINHA_LILAS);
    tomar(u0 - 1, v0 - 1, u1 + 1, v1 + 1);
  }

  // ============================================================== o gramado da festa
  {
    const { u0, v0, u1, v1 } = GRAMADO;
    // o caminho da praça até a estaçãozinha (a parte 3 põe o trem em volta do gramado)
    caminho(
      [
        [68, PRACA.v1],
        [68, v0 + 3],
      ],
      5,
    );
    encher(64, v0 + 2, 72, v0 + 5, Bloco.PEDRINHA_LILAS);
    peca('banco', 66.5, v0 + 3.5, DIR.n);
    peca('banco', 70.5, v0 + 3.5, DIR.n);
    // os canteiros de abóbora e de flor em roda, com as lanternas e os lampiões
    const cu = (u0 + u1) / 2;
    const cv = (v0 + v1) / 2 + 3;
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * Math.PI * 2;
      const u = Math.round(cu + Math.cos(a) * 11);
      const v = Math.round(cv + Math.sin(a) * 9);
      if (k % 2 === 0) {
        // o montinho de abóboras de brinquedo (redondas, nunca de cubo) com o lampião
        for (const [du, dv, t] of [
          [0, 0, 9],
          [1, 0, 7],
          [0, 1, 6],
        ])
          peca('abobora', u + du + 0.5, v + dv + 0.5, (k + du) & 3, t);
        lampiao(u + 1, v + 1, 'n');
      } else
        for (let du = -1; du <= 1; du++)
          for (let dv = -1; dv <= 1; dv++) {
            chao(u + du, v + dv, Bloco.TERRA);
            b(u + du, 1, v + dv, Bloco.FLOR);
          }
      tomar(u - 1, v - 1, u + 1, v + 1);
    }
    // a roda de dentro: montinhos de abóbora e lampiões, e as mesinhas do piquenique
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + 0.5;
      const u = Math.round(cu + Math.cos(a) * 5.5);
      const v = Math.round(cv + Math.sin(a) * 4.5);
      if (k % 2 === 0) {
        peca('abobora', u + 0.5, v + 0.5, k & 3, 8);
        lampiao(u + 1, v, 'n');
      } else peca('mesinha', u + 0.5, v + 0.5, 0);
      tomar(u - 1, v - 1, u + 1, v + 1);
    }
    for (const [u, v] of [
      [u0 + 3, v0 + 6],
      [u1 - 3, v0 + 6],
      [u0 + 4, v1 - 4],
      [u1 - 4, v1 - 4],
      [Math.round(cu), Math.round(cv)],
    ])
      posteLanterna(u, v);
    // as árvores da beira do gramado (fora da volta do trem da parte 3)
    for (const [u, v] of [
      [u0 + 1, v0 + 14],
      [u1 - 1, v0 + 16],
      [u0 + 2, v1 - 1],
      [u1 - 2, v1 - 1],
      [(u0 + u1) >> 1, v1],
    ])
      arvore(u, v, folhaDoBosque(u, v));
    tomar(u0, v0, u1, v0 + 5);
  }

  // ============================================================== o bosque das lanternas
  caminho(TRILHA_BOSQUE, 3);
  const lanternas: [number, number, number][] = [];
  // o lote do castelinho fica reservado (as árvores do bosque não entram nele)
  tomar(CASTELO.u0 - 1, CASTELO.v0 - 3, CASTELO.u1 + 1, CASTELO.v1);
  {
    // as cinco lanternas do caminho (n2), uma de cada lado, da praça ao castelinho
    const nos: [number, number][] = [];
    for (let i = 1; i < TRILHA_BOSQUE.length; i++) {
      const [a, c] = [TRILHA_BOSQUE[i - 1], TRILHA_BOSQUE[i]];
      const t = 0.55;
      const u = a[0] + (c[0] - a[0]) * t;
      const v = a[1] + (c[1] - a[1]) * t;
      // de lado: perpendicular ao caminho, a 3 blocos
      const dx = c[0] - a[0];
      const dz = c[1] - a[1];
      const l = Math.hypot(dx, dz) || 1;
      const lado = i % 2 ? 1 : -1;
      nos.push([Math.round(u + (-dz / l) * 3 * lado), Math.round(v + (dx / l) * 3 * lado)]);
    }
    nos.forEach(([u, v], i) => {
      peca('lanterna-bosque', u + 0.5, v + 0.5, 0, i);
      lanternas.push(p3(u + 0.5, 2.6, v + 0.5));
      // (com folga: a copa de uma árvore do corredor engolia a caixinha da lanterna)
      tomar(u - 2, v - 2, u + 2, v + 2);
    });
    // o laguinho do peixinho lilás
    for (let u = LAGO.u0; u <= LAGO.u1; u++)
      for (let v = LAGO.v0; v <= LAGO.v1; v++) {
        const dx = (u - (LAGO.u0 + LAGO.u1) / 2) / ((LAGO.u1 - LAGO.u0) / 2);
        const dz = (v - (LAGO.v0 + LAGO.v1) / 2) / ((LAGO.v1 - LAGO.v0) / 2);
        const d2 = dx * dx + dz * dz;
        if (d2 <= 0.8) {
          chao(u, v, Bloco.AREIA_BRUMA);
          b(u, -1, v, Bloco.AGUA);
          b(u, 0, v, Bloco.AGUA);
        } else if (d2 <= 1.2) chao(u, v, Bloco.PEDREGULHO);
      }
    tomar(LAGO.u0 - 1, LAGO.v0 - 1, LAGO.u1 + 1, LAGO.v1 + 1);
    // a árvore do galho dos morceguinhos, com o galho por cima do caminho
    const [gu, gv] = [27, 77];
    arvore(gu, gv, Bloco.FOLHAS_LARANJA, 1);
    for (let k = 1; k <= 3; k++) b(gu - k, 5, gv - k + 1, Bloco.MADEIRA_RETORCIDA);
    peca('poleiro', gu + 3.5, gv - 1.5, DIR.n);
    tomar(gu + 2, gv - 3, gu + 4, gv - 1);
    // o bosque fechado dos dois lados do caminho (laranja, douradas e cobre)
    // o corredor de árvores dos dois lados do caminho, a cada ~4 blocos (o túnel de folhas
    // laranja do esboço: as copas quase se encontram por cima de quem anda)
    for (let i = 1; i < TRILHA_BOSQUE.length; i++) {
      const [a, c] = [TRILHA_BOSQUE[i - 1], TRILHA_BOSQUE[i]];
      const dx = c[0] - a[0];
      const dz = c[1] - a[1];
      const l = Math.hypot(dx, dz) || 1;
      for (let t = 0.15; t < 1; t += 4 / l)
        for (const lado of [-1, 1]) {
          const u = Math.round(a[0] + dx * t + (-dz / l) * 4.5 * lado);
          const v = Math.round(a[1] + dz * t + (dx / l) * 4.5 * lado);
          if (livre(u, v, 1)) arvore(u, v, folhaDoBosque(u, v), s(u, v, 35) < 0.4 ? 1 : 0);
        }
    }
    // (de perto do caminho: as copas fazem o túnel de folhas laranja do esboço)
    for (let v = 45; v <= 98; v += 3)
      for (let u = 1; u <= 42; u += 3) {
        const lu = u + Math.floor(s(u, v, 31) * 2);
        const lv = v + Math.floor(s(u, v, 32) * 2);
        if (s(u, v, 33) > 0.8 || !livre(lu, lv, 2)) continue;
        arvore(lu, lv, folhaDoBosque(lu, lv), s(u, v, 34) < 0.3 ? 1 : 0);
      }
  }

  // ============================================================== o castelinho do vampirinho
  let torre: [number, number, number] = [0, 0, 0];
  let castelo: [number, number, number] = [0, 0, 0];
  {
    const { u0, v0, u1, v1 } = CASTELO;
    // o corpo de tijolo torto, com a cinta e as ameias de tábua roxa (a frente para o norte)
    const cu0 = u0 + 3;
    const cu1 = u1 - 5;
    const cv0 = v0 + 2;
    const cv1 = v1 - 3;
    encher(cu0, cv0, cu1, cv1, Bloco.TABUA_ROXA);
    const H = 6;
    for (let u = cu0; u <= cu1; u++)
      for (let v = cv0; v <= cv1; v++) {
        const borda = u === cu0 || u === cu1 || v === cv0 || v === cv1;
        if (!borda) continue;
        for (let y = 1; y <= H; y++) b(u, y, v, y === 1 || y === H ? Bloco.TABUA_ROXA : Bloco.TIJOLO_TORTO);
        if ((u + v) % 2 === 0) b(u, H + 1, v, Bloco.TABUA_ROXA);
      }
    // o teto
    for (let u = cu0 + 1; u < cu1; u++) for (let v = cv0 + 1; v < cv1; v++) b(u, H, v, Bloco.TABUA_ROXA);
    // a porta grande (fechada) no meio da frente, as janelas acesas
    const meio = (cu0 + cu1) >> 1;
    for (let y = 1; y <= 3; y++) for (let u = meio - 1; u <= meio + 1; u++) b(u, y, cv0, Bloco.AR);
    peca('porta-castelo', meio + 0.5, cv0, DIR.n);
    castelo = p3(meio + 0.5, 0, cv0 - 0.5);
    for (const u of [cu0 + 2, cu1 - 2]) b(u, 3, cv0, Bloco.JANELA_TORTA_ACESA);
    lampiao(meio - 2, cv0 - 1, 'n');
    lampiao(meio + 2, cv0 - 1, 'n');
    // a torre redonda de brinquedo no canto (5 × 5, alta), o chapéu pontudo e as bandeirinhas
    const tu0 = cu1 - 1;
    const tv0 = cv0 - 1;
    const TH = 13;
    for (let u = tu0; u <= tu0 + 4; u++)
      for (let v = tv0; v <= tv0 + 4; v++) {
        const canto = (u === tu0 || u === tu0 + 4) && (v === tv0 || v === tv0 + 4);
        if (canto) continue;
        const borda = u === tu0 || u === tu0 + 4 || v === tv0 || v === tv0 + 4;
        for (let y = 1; y <= TH; y++)
          if (borda || y === 1) b(u, y, v, y % 4 === 0 ? Bloco.TABUA_ROXA : Bloco.TIJOLO_TORTO);
      }
    for (const y of [5, 9]) b(tu0 + 2, y, tv0, Bloco.JANELA_TORTA_ACESA);
    // o chapéu: degraus que afinam até a ponta
    for (let k = 0; k <= 3; k++)
      for (let u = tu0 - 1 + k; u <= tu0 + 5 - k; u++)
        for (let v = tv0 - 1 + k; v <= tv0 + 5 - k; v++) {
          const canto = (u === tu0 - 1 + k || u === tu0 + 5 - k) && (v === tv0 - 1 + k || v === tv0 + 5 - k);
          if (canto && k < 3) continue;
          b(u, TH + 1 + k, v, Bloco.TELHA_ROXA);
        }
    b(tu0 + 2, TH + 5, tv0 + 2, Bloco.TELHA_ROXA);
    torre = p3(tu0 + 2.5, TH + 6, tv0 + 2.5);
    peca('bandeirinha', tu0 + 2.5, tv0 + 2.5, 0, 0, TH + 6);
    for (const [u, v] of [
      [cu0, cv0],
      [cu0, cv1],
      [cu1, cv1],
    ])
      peca('bandeirinha', u + 0.5, v + 0.5, 0, 1, H + 1);
    tomar(u0, v0, u1, v1);
  }

  // ============================================================== a horta do seu jerônimo
  let portaoHorta: [number, number, number] = [0, 0, 0];
  let bancada: [number, number, number] = [0, 0, 0];
  let parreira: [number, number, number] = [0, 0, 0];
  let hortela: [number, number, number] = [0, 0, 0];
  let canteiro: [number, number, number] = [0, 0, 0];
  {
    const { u0, v0, u1, v1 } = HORTA;
    // o caminho da praça até o portão
    caminho(
      [
        [PRACA.u1 - 2, PRACA.v1],
        [90, 76],
        [96, v0 - 1],
      ],
      3,
    );
    // a cerca em volta, com o portão no canto noroeste
    for (let u = u0; u <= u1; u++)
      for (const v of [v0, v1]) if (!(v === v0 && u >= 95 && u <= 97)) b(u, 1, v, Bloco.CERCA);
    for (let v = v0; v <= v1; v++) for (const u of [u0, u1]) b(u, 1, v, Bloco.CERCA);
    b(96, 1, v0, Bloco.PORTEIRA, DIR.n);
    portaoHorta = p3(96.5, 0, v0 - 0.5);
    // os caminhos de dentro (terra batida) e os canteiros de abóbora em leiras
    encher(u0 + 1, v0 + 1, u1 - 1, v1 - 1, Bloco.TERRA);
    const leira = (ua: number, ub: number, v: number) => {
      for (let u = ua; u <= ub; u++) {
        chao(u, v, Bloco.TERRA_ARADA);
        if ((u + v) % 3 === 0) b(u, 1, v, Bloco.ABOBOREIRA_3);
        else if ((u + v) % 5 === 1) peca('abobora', u + 0.5, v + 0.5, (u + v) & 3, 6 + ((u * 7 + v) % 3));
        else if ((u + v) % 7 === 2) b(u, 1, v, Bloco.ABOBOREIRA_2);
      }
    };
    for (let v = v0 + 3; v <= v1 - 9; v += 3) leira(u0 + 3, u0 + 16, v);
    for (let v = v0 + 15; v <= v1 - 6; v += 3) leira(u0 + 20, u1 - 3, v);
    // a parreirinha de uva (os pés de uva debaixo da latada) e o canteiro de hortelã
    for (let u = u0 + 19; u <= u1 - 3; u++) b(u, 1, v0 + 4, Bloco.ARBUSTO_FRUTINHAS);
    peca('parreira', (u0 + 19 + u1 - 3) / 2 + 0.5, v0 + 4.5, DIR.s);
    parreira = p3((u0 + 19 + u1 - 3) / 2 + 0.5, 0, v0 + 6);
    encher(u0 + 19, v0 + 9, u0 + 24, v0 + 11, Bloco.TERRA_ARADA);
    peca('hortela', u0 + 22, v0 + 10.5, DIR.n);
    hortela = p3(u0 + 22, 0, v0 + 12.5);
    // o canteiro marcado da n4 (a plaquinha de abóbora), a bancada das carinhas e o regador
    encher(u0 + 4, v1 - 6, u0 + 7, v1 - 4, Bloco.TERRA_ARADA);
    peca('canteiro-marcado', u0 + 6, v1 - 5, DIR.n);
    canteiro = p3(u0 + 6, 0, v1 - 7);
    peca('bancada', u0 + 14.5, v1 - 4.5, DIR.n);
    bancada = p3(u0 + 14.5, 0, v1 - 6.5);
    peca('regador', u0 + 10.5, v1 - 3.5, DIR.n);
    peca('carrinho', u1 - 4.5, v1 - 5.5, DIR.o);
    posteLanterna(u0 + 1, v0 + 1);
    posteLanterna(u1 - 1, v1 - 1);
    tomar(u0, v0 - 1, u1, v1);
  }

  // ============================================================== a moldura e as árvores
  // a macieira do quintal da Vovó (n6) e as árvores do arvoredo (laranja, douradas, oliva)
  arvore(42, 4, Bloco.FOLHAGEM, 1);
  for (let v = 2; v < PROFUNDIDADE_BAILE + 2 * MARGEM_BAILE; v += 4)
    for (let u = 2; u < LARGURA_BAILE + 2 * MARGEM_BAILE; u += 4) {
      const lu = u - MARGEM_BAILE + Math.floor(s(u, v, 3) * 3) - 1;
      const lv = v - MARGEM_BAILE + Math.floor(s(u, v, 4) * 3) - 1;
      const naBeira =
        lu < 2 || lv < 2 || lu > LARGURA_BAILE - 3 || lv > PROFUNDIDADE_BAILE - 3;
      // dentro do mapa: só nos vazios (o bosque, o arvoredo do nordeste e as beiras)
      const chance = naBeira ? 0.9 : 0.62;
      if (s(u, v, 5) > chance) continue;
      if (!livre(lu, lv, 2)) continue;
      // nada colado nos caminhos (a copa não tapa quem anda)
      if (!livre(lu, lv, 3) && !naBeira) continue;
      arvore(lu, lv, naBeira && s(u, v, 6) < 0.35 ? Bloco.FOLHAGEM : folhaDoBosque(lu, lv));
    }

  // ============================================================== pontos de cada coisa
  const nasceX = X(NASCE.u);
  const nasceZ = Z(NASCE.v);
  const abobora = { x: X(ABOBORA.u) + 0.5, y: Y, z: Z(ABOBORA.v) + 0.5, lado: ABOBORA.lado };
  // o olhar de quem nasce: de frente para a abóbora gigante (norte)
  const olhar = Math.atan2(abobora.x - nasceX, abobora.z - nasceZ);
  // T18 (n3): os três esconderijos da Lulu, um de cada vez
  const esconde = (u: number, v: number, yaw: number) => {
    const [x, y, z] = p3(u, 0, v);
    return { x, y, z, yaw };
  };
  // (o do bosque: atrás de uma árvore do corredor, do lado de lá do caminho, perto do meio dele)
  const naTrilha = (u: number, v: number): [number, number] => {
    let melhor: [number, number] = TRILHA_BOSQUE[0];
    let d = Infinity;
    for (let i = 1; i < TRILHA_BOSQUE.length; i++) {
      const [a, c] = [TRILHA_BOSQUE[i - 1], TRILHA_BOSQUE[i]];
      for (let k = 0; k <= 20; k++) {
        const pu = a[0] + ((c[0] - a[0]) * k) / 20;
        const pv = a[1] + ((c[1] - a[1]) * k) / 20;
        const dd = Math.hypot(u - pu, v - pv);
        if (dd < d) [d, melhor] = [dd, [pu, pv]];
      }
    }
    return melhor;
  };
  const alvoBosque = TRILHA_BOSQUE[3];
  let arvoreLulu: [number, number] | null = null;
  let dArvore = Infinity;
  for (const [u, v, alto] of troncos) {
    if (alto < 5) continue;
    const [pu, pv] = naTrilha(u, v);
    const dt = Math.hypot(u - pu, v - pv);
    if (dt < 3 || dt > 6 || Math.hypot(LAGO.u0 + 5 - u, LAGO.v0 + 4.5 - v) < 9) continue;
    const d = Math.hypot(u - alvoBosque[0], v - alvoBosque[1]);
    if (d < dArvore) [dArvore, arvoreLulu] = [d, [u, v]];
  }
  const [au, av] = arvoreLulu ?? [alvoBosque[0] + 4, alvoBosque[1]];
  const [tu, tv] = naTrilha(au, av);
  const dl = Math.hypot(au - tu, av - tv) || 1;
  const esconderijos: PontosBaile['esconderijos'] = [
    // atrás da abóbora gigante (na quina de trás, do lado da loja), encostada na casca: de quem
    // vem da praça, a curva da abóbora tapa a Lulu, e ela espia de lado
    esconde(
      // (fora das caixas que seguram a abóbora: o octógono vai a 0,56 do lado no meio de cada face)
      ABOBORA.u + 0.5 + ATRAS_ABOBORA[0] * ABOBORA.lado * 0.67,
      ABOBORA.v + 0.5 + ATRAS_ABOBORA[1] * ABOBORA.lado * 0.67,
      Math.atan2(ATRAS_ABOBORA[0], ATRAS_ABOBORA[1]),
    ),
    // na quina entre as duas casinhas do leste, espiando para a rua
    esconde(57.5, 24.5, -Math.PI / 2),
    // atrás do tronco, do lado de lá do caminho, espiando para ele (quem procura chega pela
    // frente da árvore, de lado: o tronco fica entre as duas, e a Lulu espia por ele)
    {
      ...esconde(au + 0.5 + ((au - tu) / dl) * 1.1, av + 0.5 + ((av - tv) / dl) * 1.1, Math.atan2(tu - au, tv - av)),
      chegar: [
        X(au) + 0.5 + ((tu - au) / dl) * 1.1 + ((av - tv) / dl) * 1.1,
        Z(av) + 0.5 + ((tv - av) / dl) * 1.1 - ((au - tu) / dl) * 1.1,
      ] as [number, number],
    },
  ];
  const pontos: PontosBaile = {
    abobora,
    palco: { ...ret(PALCO.u0, PALCO.v0 + 1, PALCO.u1, PALCO.v1), y: h + 1 },
    escadinha: p3(meioPalco + 0.5, 0, PALCO.v1 + 2.5),
    barracas,
    portas,
    lanternas,
    trilha: TRILHA_BOSQUE.map(([u, v]) => [X(u) + 0.5, Z(v) + 0.5] as [number, number]),
    varanda,
    caldeirao,
    portaVassouras,
    banquinho,
    loja: p3(LOJA.u0 - 0.5, 0, ((LOJA.v0 + LOJA.v1) >> 1) + 0.5),
    castelo,
    torre,
    portaoHorta,
    bancada,
    parreira,
    hortela,
    canteiro,
    estacao: p3(68.5, 0, GRAMADO.v0 + 3.5),
    esconderijos,
    // (no caminho de terra entre as leiras, perto do portão: as abóboras saltitantes da horta)
    tufinhoHorta: p3(HORTA.u0 + 9.5, 0, HORTA.v0 + 7.5),
    postos: {
      vovo: varanda,
      dudu: p3(TRILHA_BOSQUE[0][0] - 2.5, 0, TRILHA_BOSQUE[0][1] - 2.5),
      lulu: p3(RUA.u0 - 1.5, 0, 22.5),
      bento: p3(meioPalco + 0.5, 1, PALCO.v0 + 3.5),
      jeronimo: p3(HORTA.u0 + 12.5, 0, HORTA.v1 - 6.5),
      filo: p3(49.5, 0, 51.5),
      olavo: p3(49.5, 0, 61.5),
    },
    vizinhos,
  };
  const entradas: PlanoBaile['entradas'] = {
    rua: [X((RUA.u0 + RUA.u1) >> 1), Z(PRACA.v0 - 1)],
    vovo: entradaVovo,
    loja: [X(LOJA.u0 - 1), Z((LOJA.v0 + LOJA.v1) >> 1)],
    bosque: [X(TRILHA_BOSQUE[0][0] - 1), Z(TRILHA_BOSQUE[0][1])],
    castelo: [Math.floor(castelo[0]), Math.floor(castelo[2])],
    horta: [X(96), Z(HORTA.v0 - 1)],
    gramado: [X(68), Z(GRAMADO.v0 + 3)],
  };

  const plano: PlanoBaile = {
    semente,
    ox,
    oz,
    h,
    plana,
    zonas: {
      praca: ret(PRACA.u0, PRACA.v0, PRACA.u1, PRACA.v1),
      rua: ret(34, 10, 66, 39),
      vovo: ret(42, 0, 58, 12),
      loja: ret(LOJA.u0 - 1, LOJA.v0, LOJA.u1, LOJA.v1),
      bosque: ret(0, 44, 43, 88),
      castelo: ret(CASTELO.u0, CASTELO.v0, CASTELO.u1, CASTELO.v1),
      horta: ret(HORTA.u0, HORTA.v0, HORTA.u1, HORTA.v1),
      gramado: ret(GRAMADO.u0, GRAMADO.v0, GRAMADO.u1, GRAMADO.v1),
    },
    entradas,
    nascimento: { x: nasceX, z: nasceZ, olhar },
    pontos,
    pecas,
    lago: ret(LAGO.u0, LAGO.v0, LAGO.u1, LAGO.v1),
  };
  return { plano, piso, largura, porChunk };
}
