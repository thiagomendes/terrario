/**
 * Planejador da Vila Neon (spec 026, parte 1; `EstiloMundo.povoado.planta: 'bairro'`). Um
 * bairro anos 80 por mundo, em volta do nascimento, puro e determinístico pela semente (o
 * servidor da nuvem e o trabalhador da malha acham o mesmo), no caminho da Cidade Grande
 * (`cidade.ts`): o lugar em terra firme, o chão plano, a rampa até o relevo natural e a
 * moldura de árvores do jogo. Os outros temas não passam por aqui (paridade bloco por bloco).
 *
 * O mapa (`referencia/mapa.svg`) tem 180 × 150 blocos, com o norte em -z. Coordenadas locais
 * (u, v): u cresce para o leste (+x) e v para o sul (+z), a partir do canto noroeste.
 * - a **avenida** corta de oeste a leste (v 59 a 70) e a **rua da pracinha** de norte a sul
 *   (u 92 a 103); a **rua de trás** passa atrás das lojas (v 28 a 33);
 * - **noroeste:** a Rua anos 80 (banca, locadora, a casa da parte 3, a lanchonete na esquina)
 *   e as casas da rua de trás;
 * - **nordeste:** as casas da rua da pracinha e o lote do parque (parte 2), por enquanto um
 *   jardim cercado e acabado, com laguinho;
 * - **sudeste:** a pracinha onde a criança nasce (letreiro, mural, parquinho), o fliperama, o
 *   rinque e o lote da rampa (parte 3), outro jardim acabado;
 * - **sudoeste:** o Festival Trovão, cercado de alambrado, com o portão na avenida, e as casas
 *   do lado de lá.
 *
 * O planejador monta tudo uma vez (blocos por chunk e o chão de cada coluna) e guarda; a
 * geração de cada chunk só copia. As peças que não são bloco (letreiros, brinquedos, carros,
 * luzes) vão numa lista à parte (`pecas`), que a tela desenha quando o chão delas está pronto.
 */
import { Bloco } from './blocks';
import { hash2 } from './noise';
import type { ArcoRinque } from '../jogo/rinque';
import { montarParque, type FerramentasVila, type PontosParque } from './vilaParque';
import { montarCasa80, type PontosCasa } from './vilaCasa';
import { montarPistaDeSkate, type PontosRampa } from './vilaRampa';

/** Tamanho do bairro (o mapa). */
export const LARGURA_VILA = 180;
export const PROFUNDIDADE_VILA = 150;
/** Anel plano em volta do mapa (a moldura de árvores e cerca-viva). */
export const MARGEM_VILA = 8;
/** Rampa até o terreno natural: 1 bloco a cada 3 colunas, até 24 colunas. */
export const RAMPA_VILA = 24;
/** Até onde o relevo é amaciado em volta do bairro. */
export const ALCANCE_SUAVE_VILA = 96;

export interface RetanguloVila {
  x0: number;
  z0: number;
  x1: number;
  z1: number;
}

/** Peça do bairro que não é bloco (a tela desenha; o núcleo ignora). */
export interface PecaVila {
  tipo: TipoPecaVila;
  /** Mundo: o meio da peça no chão (y = os pés). */
  x: number;
  y: number;
  z: number;
  /** Para onde a frente olha (0 +z, 1 +x, 2 -z, 3 -x). */
  dir: number;
  /** Variante (cor, número da máquina, nome do letreiro...). */
  n?: number;
  /** Segunda ponta (varal de lâmpadas, fio da pipa). */
  ate?: [number, number, number];
}

export type TipoPecaVila =
  | 'letreiro'
  | 'mural'
  | 'gangorra'
  | 'balanco'
  | 'escorregador'
  | 'banco'
  | 'lixeira'
  | 'orelhao'
  | 'ponto-onibus'
  | 'bicicleta'
  | 'carro'
  | 'van'
  | 'picape'
  | 'posteres'
  | 'hidrante'
  | 'caixa-correio'
  | 'varal-lampadas'
  | 'pipa'
  | 'maquina'
  | 'globo'
  | 'suporte-patins'
  | 'holofote'
  | 'bateria'
  | 'teclado'
  | 'pedestal'
  | 'radio-gigante'
  | 'fita-gigante'
  | 'mesa-som'
  | 'raio-portao'
  | 'flamula'
  | 'varal-roupa'
  | 'casinha-cachorro'
  | 'piscininha'
  | 'vitrine'
  | 'balcao'
  | 'bandeirolas'
  | 'pipoca'
  | 'mesinha'
  | 'floreira'
  | 'toalha'
  | 'raio-palco'
  | 'arco-lampadas'
  /** Spec 026 (f4): os arcos de neon da pista do rinque (n: qual arco, 0 a 2). */
  | 'arco-rinque'
  /**
   * Spec 026 (parte 2, o parque): o arco de lâmpadas da entrada; o que não gira da roda-gigante
   * (os pés e o eixo), do carrossel e do bate-bate; as prendas das barracas (argola e
   * pescaria); o algodão-doce; o poste dos balões; o cocho da fazendinha.
   */
  | 'arco-parque'
  | 'roda-gigante'
  | 'carrossel'
  | 'bate-bate'
  | 'barraca-argola'
  | 'barraca-pesca'
  | 'algodao'
  | 'baloes'
  | 'cocho'
  /**
   * Spec 026 (parte 3): a sala e o quarto de brinquedos da Casa anos 80 (desenhados por
   * `render/vila/casa.ts`, com a luz de dentro da casa; aqui dão o lugar e a colisão).
   */
  | 'casa-tv'
  | 'casa-fitas'
  | 'casa-planta'
  | 'casa-relogio'
  | 'casa-tapete'
  | 'casa-sofa'
  | 'casa-abajur'
  | 'casa-telefone'
  | 'casa-discos'
  | 'casa-cortina'
  | 'casa-capacho'
  | 'casa-quebra-cabeca'
  | 'casa-ioio'
  | 'casa-piao'
  | 'casa-cubo'
  | 'casa-robo'
  | 'casa-bola'
  | 'casa-bau'
  /** Parte 3B: a mesinha redonda do bolo de fubá, do lado da vovó no sofá (a f12). */
  | 'casa-bolo'
  /** Spec 026 (parte 3): a rampa de skate em U, o suporte dos skates e a BMX de enfeite. */
  | 'rampa-skate'
  | 'suporte-skate'
  | 'bmx';

/** Nomes dos letreiros (em português, inventados; só no mundo, nunca na interface). */
export const LETREIROS = [
  'VILA NEON',
  'LOCADORA FITA MÁGICA',
  'BANCA DO BAIRRO',
  'LANCHONETE DOIS CANUDOS',
  'FLIPERAMA',
  'RINQUE',
  'FESTIVAL TROVÃO',
  'PARQUE ALEGRIA',
] as const;
export const LETREIRO = {
  vila: 0,
  locadora: 1,
  banca: 2,
  lanchonete: 3,
  fliperama: 4,
  rinque: 5,
  festival: 6,
  parque: 7,
} as const;

/** Postos dos moradores do bairro (o núcleo põe cada um no seu; fase 2). */
export type PostoVila =
  | 'vocalista'
  | 'roadie'
  | 'guitarrista'
  | 'lanche'
  | 'danca'
  | 'patinador'
  | 'lanchonete'
  | 'banca'
  /** Spec 026 (parte 2): o pipoqueiro, o moço do bate-bate e a vendedora de balões do parque. */
  | 'pipoqueiro'
  | 'bate'
  | 'baloes'
  /** Spec 026 (parte 2, etapa B; parte 3): a vovó, no sofá da sala da Casa anos 80. */
  | 'avo'
  /** Spec 026 (parte 3): a menina do skate e o menino da BMX, na pista de skate. */
  | 'skatista'
  | 'bmx'
  /** Spec 032: a Dona Cida, pipoqueira da pracinha (atrás do carrinho de pipoca). */
  | 'pracinha';

/** Spec 026 (parte 2, etapa B): o que se toca na Rua anos 80. */
export interface PontosRua {
  /** O orelhão (os pés). */
  orelhao: [number, number, number];
  /** A parede de fitas da locadora (o pé da estante, atrás da vitrine). */
  fitas: [number, number, number];
  /** O balcão da lanchonete (o meio, no chão). */
  balcao: [number, number, number];
  /** O expositor de revistas da banca (o meio, no chão). */
  revistas: [number, number, number];
  /** As bicicletas paradas (a campainha). */
  bicicletas: [number, number, number][];
  /** Os letreiros das lojas da rua que piscam ao toque (o meio de cada um, no alto). */
  letreiros: [number, number, number][];
}

export interface PontosVila {
  /** O mural de recados (o canto das missões): o meio da frente, onde a criança para. */
  mural: [number, number, number];
  /** Os três estojos da f1: rua (teclado), pista (guitarra), festival (baquetas). */
  estojos: [number, number, number][];
  /** As três caixas de som do show (o bloco de baixo de cada pilha). */
  caixas: [number, number, number][];
  /** O piso do palco (o retângulo onde o toque toca um acorde) e a altura do piso. */
  palco: RetanguloVila & { y: number };
  /** O pé da escadinha do palco (alvo do guia na f3). */
  escadinha: [number, number, number];
  /** A ponta da passarela (onde o vocalista canta). */
  passarela: [number, number, number];
  /** A grade da plateia: onde as lhamas param e a plateia pula (retângulo do chão). */
  plateia: RetanguloVila;
  /** O cercadinho das lhamas (miolo) e o portãozinho dele. */
  cercado: RetanguloVila;
  portaoCercado: [number, number, number];
  /** O suporte dos patins (o meio da frente). */
  patins: [number, number, number];
  /** O piso do rinque (onde os patins deslizam). */
  rinque: RetanguloVila;
  /** Os três arcos de neon da pista (a volta no rinque, f4). */
  arcos: ArcoRinque[];
  /** As cinco máquinas do fliperama (a frente de cada uma). */
  maquinas: [number, number, number][];
  /** O rádio gigante e o lápis da fita gigante (brinquedos de tocar). */
  radio: [number, number, number];
  fita: [number, number, number];
  /** Onde cada morador fica. */
  postos: Record<PostoVila, [number, number, number]>;
  /** Spec 026 (parte 2): o Parque de diversões (os brinquedos de sentar e os de tocar). */
  parque: PontosParque;
  /** Spec 026 (parte 2, etapa B): os toques da Rua anos 80. */
  rua: PontosRua;
  /** Spec 026 (parte 3): a Casa anos 80 por dentro. */
  casa: PontosCasa;
  /** Spec 026 (parte 3): a pista de skate (a rampa em U e o suporte dos skates). */
  skate: PontosRampa;
}

export interface PlanoVila {
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
    'pracinha' | 'rua' | 'festival' | 'fliperama' | 'rinque' | 'parque' | 'casa80' | 'rampa',
    RetanguloVila
  >;
  /** Onde a criança nasce e para onde olha (yaw: frente = seno, cosseno). */
  nascimento: { x: number; z: number; olhar: number };
  pontos: PontosVila;
  pecas: PecaVila[];
  /** Colunas de lago (o chão desce 2). */
  lago: RetanguloVila;
}

/** O relevo natural (injetado por chunk.ts). */
export interface RelevoVila {
  altura(wx: number, wz: number, semente: number): number;
  nivelMar: number;
}

// ------------------------------------------------------------------------ guardado

interface Montado {
  plano: PlanoVila;
  /** Chão de cada coluna da área plana (id do bloco; 0 = grama). */
  piso: Uint8Array;
  largura: number;
  /** Blocos por chunk: [x, y, z, id | meta << 8] em sequência. */
  porChunk: Map<string, number[]>;
}

const cache = new Map<string, Montado>();
const porPlano = new WeakMap<PlanoVila, Montado>();

/** Esquece os planos (testes que trocam o relevo). */
export function limparVilas(): void {
  cache.clear();
}

/** O plano do bairro do mundo (sempre o mesmo para a mesma semente e o mesmo relevo). */
export function planoDaVila(semente: number, r: RelevoVila, chaveRelevo = ''): PlanoVila {
  const k = `${semente},${chaveRelevo}`;
  let m = cache.get(k);
  if (!m) {
    m = montarVila(semente, r);
    if (cache.size > 8) cache.clear();
    cache.set(k, m);
    porPlano.set(m.plano, m);
  }
  return m.plano;
}

function montado(p: PlanoVila): Montado {
  const m = porPlano.get(p);
  if (!m) throw new Error('plano da vila sem montagem');
  return m;
}

/**
 * Procura, em volta da origem, um lugar onde o bairro inteiro caiba em terra firme (pelo menos
 * 85% das amostras acima do mar). A altura do chão é a mediana do relevo ali.
 */
function lugarDaVila(semente: number, r: RelevoVila): { cx: number; cz: number; h: number } {
  const W = LARGURA_VILA + 2 * MARGEM_VILA;
  const D = PROFUNDIDADE_VILA + 2 * MARGEM_VILA;
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
      const a = (k / passos) * Math.PI * 2 + hash2(anel, 5, semente + 9401) * 0.5;
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

/** Distância (Chebyshev) da coluna até a área plana (0 dentro dela). */
export function distanciaDaVila(p: PlanoVila, wx: number, wz: number): number {
  const dx = wx < p.plana.x0 ? p.plana.x0 - wx : wx > p.plana.x1 ? wx - p.plana.x1 : 0;
  const dz = wz < p.plana.z0 ? p.plana.z0 - wz : wz > p.plana.z1 ? wz - p.plana.z1 : 0;
  return Math.max(dx, dz);
}

export interface AjusteVila {
  h: number;
  /** 1: chão do bairro (nada nasce); 2: rampa (plantas sim, árvores não); 0: amaciado. */
  ocupada: 0 | 1 | 2;
  piso?: number;
  /** Sem cavernas embaixo (o bairro e a rampa). */
  firme: boolean;
}

const dentro = (r: RetanguloVila, x: number, z: number, folga = 0) =>
  x >= r.x0 - folga && x <= r.x1 + folga && z >= r.z0 - folga && z <= r.z1 + folga;

/** O bloco do chão da coluna no bairro (grama onde não há outro). */
export function pisoDaVila(p: PlanoVila, wx: number, wz: number): number {
  if (!dentro(p.plana, wx, wz)) return Bloco.AR;
  const m = montado(p);
  const id = m.piso[(wz - p.plana.z0) * m.largura + (wx - p.plana.x0)];
  return id || Bloco.TERRA_MUSGOSA;
}

/**
 * Altura e chão da coluna com o bairro. Na área plana, a altura do bairro (o laguinho desce
 * 2); em volta, o relevo amaciado e preso a uma rampa (o mesmo jeito da cidade).
 */
export function ajusteDaVila(
  p: PlanoVila,
  wx: number,
  wz: number,
  natural: number,
): AjusteVila | null {
  const d = distanciaDaVila(p, wx, wz);
  if (d === 0) {
    const lago = dentro(p.lago, wx, wz) && pisoDaVila(p, wx, wz) === Bloco.AREIA_BRUMA;
    return { h: lago ? p.h - 2 : p.h, ocupada: 1, piso: pisoDaVila(p, wx, wz), firme: true };
  }
  if (d > ALCANCE_SUAVE_VILA) return null;
  const t = Math.min(1, d / ALCANCE_SUAVE_VILA);
  const suave = t * t * (3 - 2 * t);
  const lim = d <= RAMPA_VILA ? Math.floor(d / 3) : 8 + (d - RAMPA_VILA);
  const alvo = Math.round((natural - p.h) * suave);
  const h = p.h + Math.max(-lim, Math.min(lim, alvo));
  const perto = d <= RAMPA_VILA;
  if (!perto && h === natural) return null;
  return { h, ocupada: perto ? 2 : 0, firme: perto };
}

/** O bairro alcança o chunk (a área plana)? */
export function vilaNoChunk(p: PlanoVila, cx: number, cz: number): boolean {
  const r = { x0: cx * 16, z0: cz * 16, x1: cx * 16 + 15, z1: cz * 16 + 15 };
  return p.plana.x0 <= r.x1 && p.plana.x1 >= r.x0 && p.plana.z0 <= r.z1 && p.plana.z1 >= r.z0;
}

/** Pincel com metadado (direção nos bits 0 e 1: 0 +z, 1 +x, 2 -z, 3 -x). */
export type PincelVila = (wx: number, y: number, wz: number, id: number, meta?: number) => void;

const tomadas = new WeakMap<PlanoVila, Set<number>>();
/**
 * Spec 026 (o público do show): a coluna (wx, wz) tem bloco do bairro logo acima do chão (no
 * primeiro ou no segundo bloco, onde um boneco esbarra)? Lido do plano, nunca da malha.
 */
export function colunaTomadaNaVila(p: PlanoVila, wx: number, wz: number): boolean {
  if (!dentro(p.plana, wx, wz)) return false;
  let t = tomadas.get(p);
  if (!t) {
    const m = montado(p);
    // vale o último bloco posto em cada célula: o portão aberto de um quintal é uma grade
    // trocada por ar (a coluna fica livre), não uma coluna tomada
    const ultimo = new Map<number, number>();
    for (const l of m.porChunk.values())
      for (let i = 0; i < l.length; i += 4) {
        const y = l[i + 1];
        if (y !== p.h + 1 && y !== p.h + 2) continue;
        const coluna = (l[i + 2] - p.plana.z0) * m.largura + (l[i] - p.plana.x0);
        ultimo.set(coluna * 2 + (y - p.h - 1), l[i + 3] & 255);
      }
    t = new Set<number>();
    for (const [k, id] of ultimo) if (id !== Bloco.AR) t.add(k >> 1);
    tomadas.set(p, t);
  }
  return t.has((wz - p.plana.z0) * montado(p).largura + (wx - p.plana.x0));
}

/** Monta no chunk (cx, cz) os blocos do bairro que caem nele. */
export function construirVila(p: PlanoVila, cx: number, cz: number, em: PincelVila): void {
  const lista = montado(p).porChunk.get(`${cx},${cz}`);
  if (!lista) return;
  for (let i = 0; i < lista.length; i += 4) {
    const v = lista[i + 3];
    const meta = v >> 8;
    em(lista[i], lista[i + 1], lista[i + 2], v & 255, meta || undefined);
  }
}

/** Quantos blocos o bairro põe no chunk (testes e medida). */
export function blocosDaVilaNoChunk(p: PlanoVila, cx: number, cz: number): number {
  return (montado(p).porChunk.get(`${cx},${cz}`)?.length ?? 0) / 4;
}

/** As peças que caem no chunk (a tela cria quando a malha dele fica pronta). */
export function pecasDaVilaNoChunk(p: PlanoVila, cx: number, cz: number): PecaVila[] {
  return p.pecas.filter((q) => Math.floor(q.x / 16) === cx && Math.floor(q.z / 16) === cz);
}

/** A zona da coluna (o nome), ou null fora delas. */
export function zonaDaVila(p: PlanoVila, wx: number, wz: number): keyof PlanoVila['zonas'] | null {
  for (const [k, r] of Object.entries(p.zonas))
    if (dentro(r, wx, wz)) return k as keyof PlanoVila['zonas'];
  return null;
}

// ------------------------------------------------------------------------ a montagem

/** Direção (0 +z, 1 +x, 2 -z, 3 -x) de cada frente. */
type Frente = 'n' | 's' | 'l' | 'o';
const DIR: Record<Frente, number> = { s: 0, l: 1, n: 2, o: 3 };

function montarVila(semente: number, r: RelevoVila): Montado {
  const lugar = lugarDaVila(semente, r);
  const ox = lugar.cx - (LARGURA_VILA >> 1);
  const oz = lugar.cz - (PROFUNDIDADE_VILA >> 1);
  const h = lugar.h;
  const Y = h + 1;
  const plana: RetanguloVila = {
    x0: ox - MARGEM_VILA,
    z0: oz - MARGEM_VILA,
    x1: ox + LARGURA_VILA - 1 + MARGEM_VILA,
    z1: oz + PROFUNDIDADE_VILA - 1 + MARGEM_VILA,
  };
  const largura = plana.x1 - plana.x0 + 1;
  const profundidade = plana.z1 - plana.z0 + 1;
  const piso = new Uint8Array(largura * profundidade);
  const porChunk = new Map<string, number[]>();
  const pecas: PecaVila[] = [];
  const s = (a: number, b: number, k: number) => hash2(a, b, semente + 9400 + k);

  /** Mundo a partir do mapa. */
  const X = (u: number) => ox + u;
  const Z = (v: number) => oz + v;
  /** Chão (y = h) da coluna (u, v). */
  const chao = (u: number, v: number, id: number) => {
    const wx = X(u);
    const wz = Z(v);
    if (!dentro(plana, wx, wz)) return;
    piso[(wz - plana.z0) * largura + (wx - plana.x0)] = id;
  };
  const pisoEm = (u: number, v: number) => {
    const wx = X(u);
    const wz = Z(v);
    if (!dentro(plana, wx, wz)) return 0;
    return piso[(wz - plana.z0) * largura + (wx - plana.x0)];
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
  const peca = (
    tipo: TipoPecaVila,
    u: number,
    v: number,
    dir: number,
    n?: number,
    y = 0,
    ate?: [number, number, number],
  ) => {
    pecas.push({
      tipo,
      x: X(u) + 0.5,
      y: Y + y,
      z: Z(v) + 0.5,
      dir,
      ...(n === undefined ? {} : { n }),
      ...(ate ? { ate: [X(ate[0]) + 0.5, Y + ate[1], Z(ate[2]) + 0.5] } : {}),
    });
  };
  const ret = (u0: number, v0: number, u1: number, v1: number): RetanguloVila => ({
    x0: X(u0),
    z0: Z(v0),
    x1: X(u1),
    z1: Z(v1),
  });
  const encher = (u0: number, v0: number, u1: number, v1: number, id: number) => {
    for (let u = u0; u <= u1; u++) for (let v = v0; v <= v1; v++) chao(u, v, id);
  };
  const coluna = (u: number, v: number, y0: number, y1: number, id: number) => {
    for (let y = y0; y <= y1; y++) b(u, y, v, id);
  };

  // ============================================================== peças pequenas de blocos
  /** Árvore do gerador do jogo (o carvalho e a bétula da geração; verde ou ipê amarelo). */
  const arvore = (u: number, v: number, k = 0, alta = 0) => {
    const t = s(u, v, 11 + k);
    const betula = t > 0.78;
    const ipe = !betula && t < 0.3;
    const tronco = (betula ? 5 : 4) + Math.floor(s(u, v, 12) * 2) + alta;
    const madeira = betula ? Bloco.TRONCO_BETULA : Bloco.MADEIRA_RETORCIDA;
    const folha = betula ? Bloco.FOLHAS_BETULA : ipe ? Bloco.FOLHAS_OUTONO : Bloco.FOLHAGEM;
    for (let y = 1; y <= tronco; y++) b(u, y, v, madeira);
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
  };
  /** Poste de rua (a grade da cidade e a luminária que acende de noite). */
  const poste = (u: number, v: number) => {
    coluna(u, v, 1, 3, Bloco.GRADE_FERRO);
    b(u, 4, v, Bloco.POSTE);
  };
  const cercaViva = (u0: number, v0: number, u1: number, v1: number) => {
    for (let u = Math.min(u0, u1); u <= Math.max(u0, u1); u++)
      for (let v = Math.min(v0, v1); v <= Math.max(v0, v1); v++) b(u, 1, v, Bloco.FOLHAGEM);
  };
  const canteiro = (u0: number, v0: number, w: number, d: number) => {
    for (let u = u0; u < u0 + w; u++)
      for (let v = v0; v < v0 + d; v++) {
        chao(u, v, Bloco.TERRA);
        b(u, 1, v, Bloco.FLOR);
      }
  };
  const alambrado = (u0: number, v0: number, u1: number, v1: number, alt = 3) => {
    for (let u = Math.min(u0, u1); u <= Math.max(u0, u1); u++)
      for (let v = Math.min(v0, v1); v <= Math.max(v0, v1); v++)
        for (let y = 1; y <= alt; y++) b(u, y, v, Bloco.ALAMBRADO);
  };

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

  const REBOCOS = [Bloco.REBOCO_ROSA, Bloco.REBOCO_AZUL, Bloco.REBOCO_AMARELO, Bloco.REBOCO_MENTA];
  const TELHADOS = [
    Bloco.TELHA_COLONIAL,
    Bloco.PEDRA_MARROM,
    Bloco.LA_AZUL,
    Bloco.TELHA_COLONIAL,
    Bloco.CONCRETO,
  ];

  /**
   * Casa térrea do bairro: reboco pastel, janelas, porta, telhado de duas águas em degraus
   * (cumeeira paralela à rua) e, na frente, o quintal com muro baixo e portão de grade.
   * `w` é a largura na rua e `d` a fundura (com o quintal da frente, de 4).
   */
  const casa = (u0: number, v0: number, w: number, d: number, fr: Frente, k: number) => {
    const q = noLote(u0, v0, w, d, fr);
    const dir = DIR[fr];
    const parede = REBOCOS[k % REBOCOS.length];
    const telha = TELHADOS[k % TELHADOS.length];
    const H = 4;
    const QUINTAL = 4;
    const fundo = d - 1;
    // o quintal da frente: grama, caminho até a porta, muro baixo e o portão
    for (let sx = 0; sx < w; sx++)
      for (let f = 0; f < QUINTAL; f++) {
        const [u, v] = q(sx, f);
        const porta = sx === 2 || sx === 3;
        chao(u, v, porta ? Bloco.PEDRA_CREME : Bloco.TERRA_MUSGOSA);
        const muro = f === 0 || sx === 0 || sx === w - 1;
        if (muro && !(f === 0 && porta)) b(u, 1, v, Bloco.PEDRA_CREME);
        if (f === 0 && porta) b(u, 1, v, Bloco.GRADE_FERRO);
      }
    // o portão aberto: a grade some do meio (só o batente fica)
    {
      const [u, v] = q(2, 0);
      const [u2, v2] = q(3, 0);
      b(u, 1, v, Bloco.AR);
      b(u2, 1, v2, Bloco.AR);
    }
    // flores no quintal e uma arvorezinha de canto
    for (let sx = 5; sx < w - 1; sx++) {
      const [u, v] = q(sx, 1);
      chao(u, v, Bloco.TERRA);
      if ((sx + k) % 2) b(u, 1, v, Bloco.FLOR);
    }
    // a casa (de QUINTAL até o fundo)
    for (let sx = 0; sx < w; sx++)
      for (let f = QUINTAL; f <= fundo; f++) {
        const [u, v] = q(sx, f);
        chao(u, v, Bloco.TABUAS);
        const borda = sx === 0 || sx === w - 1 || f === QUINTAL || f === fundo;
        if (!borda) continue;
        for (let y = 1; y <= H; y++) {
          let id: number = y === 1 ? Bloco.TIJOLOS_PEDRA : parede;
          const frente = f === QUINTAL;
          if (frente && (y === 2 || y === 3) && sx >= 5 && sx < w - 1 && sx % 3 !== 1)
            id = (sx + k) % 4 < 2 ? Bloco.JANELA_ACESA : Bloco.JANELA;
          if ((sx === 0 || sx === w - 1) && (y === 2 || y === 3) && (f - QUINTAL) % 3 === 2)
            id = (f + k + sx) % 3 === 0 ? Bloco.JANELA_ACESA : Bloco.JANELA;
          if (frente && y <= 2 && sx === 2) id = Bloco.PORTA;
          if (frente && y === 3 && sx === 2) id = parede;
          b(u, y, v, id, id === Bloco.PORTA ? dir : 0);
        }
      }
    // telhado de duas águas em degraus, a cumeeira ao longo da rua; as empenas de reboco
    const fundura = fundo - QUINTAL + 1;
    const meio = Math.ceil(fundura / 2);
    for (let degrau = 0; degrau <= meio; degrau++)
      for (let sx = -1; sx <= w; sx++) {
        const [u, v] = q(sx, QUINTAL - 1 + degrau);
        const [u2, v2] = q(sx, fundo + 1 - degrau);
        b(u, H + 1 + degrau, v, telha);
        b(u2, H + 1 + degrau, v2, telha);
      }
    for (let f = QUINTAL; f <= fundo; f++)
      for (const sx of [0, w - 1]) {
        const [u, v] = q(sx, f);
        const alt = Math.min(f - QUINTAL + 1, fundo - f + 1);
        for (let y = H + 1; y <= H + alt - 1; y++) b(u, y, v, parede);
      }
    // a chaminé de tijolo num canto do telhado e a cerca-viva baixa de um lado do quintal
    {
      const [u, v] = q(w - 3, fundo - 1);
      for (let y = H + 2; y <= H + meio + 1; y++) b(u, y, v, Bloco.TIJOLOS);
      for (let f = 1; f < QUINTAL; f++) {
        const [hu, hv] = q(w - 2, f);
        if (k % 2) b(hu, 1, hv, Bloco.FOLHAGEM);
      }
    }
    // enfeites do quintal: casinha de cachorro, varal ou piscininha (um por casa)
    const [eu, ev] = q(w - 3, 2);
    const enfeite = k % 3;
    if (enfeite === 0) peca('casinha-cachorro', eu, ev, dir, k);
    else if (enfeite === 1) peca('piscininha', eu, ev, dir, k);
    else peca('varal-roupa', eu, ev, dir, k);
    const [cu, cv] = q(4, -1);
    if (k % 2 === 0) peca('caixa-correio', cu, cv, dir, k);
  };

  /**
   * Loja de rua com sobrado opcional: reboco, vitrine de vidro, porta aberta, toldo de blocos e
   * o letreiro (peça, com o nome). `w` na rua, `d` de fundura.
   */
  const loja = (
    u0: number,
    v0: number,
    w: number,
    d: number,
    fr: Frente,
    parede: number,
    toldo: number,
    letreiro: number,
    andares: 1 | 2,
  ) => {
    const q = noLote(u0, v0, w, d, fr);
    const dir = DIR[fr];
    const H = andares === 2 ? 8 : 5;
    for (let sx = 0; sx < w; sx++)
      for (let f = 0; f < d; f++) {
        const [u, v] = q(sx, f);
        chao(u, v, Bloco.TABUAS_BETULA);
        const borda = sx === 0 || sx === w - 1 || f === 0 || f === d - 1;
        if (!borda) continue;
        for (let y = 1; y <= H; y++) {
          let id: number = parede;
          const frente = f === 0;
          if (y === 1 && !frente) id = Bloco.TIJOLOS_PEDRA;
          if (frente && y <= 3 && sx > 0 && sx < w - 1) {
            const porta = sx === w >> 1 || sx === (w >> 1) - 1;
            id = porta ? Bloco.AR : y === 1 ? Bloco.PEDRA_CREME : Bloco.VIDRO;
          }
          if (frente && y === 4) id = Bloco.FAIXA_NEON;
          if (andares === 2 && frente && (y === 6 || y === 7) && sx % 3 === 1)
            id = sx % 2 ? Bloco.JANELA_ACESA : Bloco.JANELA;
          if (
            andares === 2 &&
            !frente &&
            (y === 6 || y === 7) &&
            f % 3 === 1 &&
            (sx === 0 || sx === w - 1)
          )
            id = Bloco.JANELA;
          if (andares === 2 && y === 5) id = parede;
          b(u, y, v, id);
        }
      }
    // o forro e a laje do sobrado (dentro)
    for (let sx = 1; sx < w - 1; sx++)
      for (let f = 1; f < d - 1; f++) {
        const [u, v] = q(sx, f);
        b(u, H, v, parede);
        if (andares === 2) b(u, 5, v, Bloco.TABUAS_BETULA);
      }
    // a platibanda em cima
    for (let sx = 0; sx < w; sx++)
      for (let f = 0; f < d; f++) {
        if (!(sx === 0 || sx === w - 1 || f === 0 || f === d - 1)) continue;
        const [u, v] = q(sx, f);
        b(u, H + 1, v, f === 0 ? Bloco.FRISO_DOURADO : parede);
      }
    // o toldo de blocos na frente (uma fileira saindo da parede) e a sacada do sobrado (o piso
    // preso na parede, por cima do toldo, e a grade em volta)
    for (let sx = 1; sx < w - 1; sx++) {
      const [u, v] = q(sx, -1);
      b(u, 4, v, toldo);
      if (andares === 2 && sx >= 3 && sx <= w - 4) {
        b(u, 5, v, Bloco.PEDRA_CREME);
        b(u, 6, v, Bloco.GRADE_FERRO);
      }
    }
    // a luz de dentro (a loja acesa de noite ilumina a calçada pela vitrine)
    for (const sx of [3, w - 4]) {
      const [u, v] = q(sx, d >> 1);
      b(u, 4, v, Bloco.LANTERNA);
    }
    // o letreiro: o da loja térrea na fachada, por cima do toldo; o do sobrado no telhado
    if (andares === 2) {
      const [a0, a1] = q(0, 0);
      const [b0, b1] = q(w - 1, 0);
      peca('letreiro', (a0 + b0) / 2, (a1 + b1) / 2, dir, letreiro, H + 1);
    } else {
      const [lu, lv] = q(w >> 1, -1);
      peca('letreiro', lu, lv, dir, letreiro, 4);
    }
    return q;
  };

  // ============================================================== o chão de todo o mapa
  // margem: grama; o mapa todo começa como grama (0)
  // a avenida (oeste-leste): calçada 2, asfalto 8 (tracejado no meio), calçada 2
  for (let u = -MARGEM_VILA; u < LARGURA_VILA + MARGEM_VILA; u++)
    for (let v = 59; v <= 70; v++) {
      const calcada = v <= 60 || v >= 69;
      const traco = v === 64 && ((u >> 1) & 1) === 0;
      chao(u, v, calcada ? Bloco.CALCADA : traco ? Bloco.FAIXA_RUA : Bloco.ASFALTO);
    }
  // a rua da pracinha (norte-sul)
  for (let v = -MARGEM_VILA; v < PROFUNDIDADE_VILA + MARGEM_VILA; v++)
    for (let u = 92; u <= 103; u++) {
      if (v >= 59 && v <= 70) continue;
      const calcada = u <= 93 || u >= 102;
      const traco = u === 97 && ((v >> 1) & 1) === 0;
      chao(u, v, calcada ? Bloco.CALCADA : traco ? Bloco.FAIXA_RUA : Bloco.ASFALTO);
    }
  // o cruzamento: asfalto limpo, com as faixas de pedestre nos quatro braços
  encher(94, 61, 101, 68, Bloco.ASFALTO);
  encher(92, 61, 93, 68, Bloco.FAIXA_PEDESTRE);
  encher(102, 61, 103, 68, Bloco.FAIXA_PEDESTRE);
  encher(94, 59, 101, 60, Bloco.FAIXA_PEDESTRE);
  encher(94, 69, 101, 70, Bloco.FAIXA_PEDESTRE);
  // a faixa de pedestre na frente do portão do festival
  encher(58, 61, 63, 68, Bloco.FAIXA_PEDESTRE);
  // a rua de trás (oeste do cruzamento): calçada 1, asfalto 4, calçada 1
  for (let u = -MARGEM_VILA; u <= 91; u++)
    for (let v = 28; v <= 33; v++) {
      const calcada = v === 28 || v === 33;
      chao(
        u,
        v,
        calcada
          ? Bloco.CALCADA
          : v === 30 && ((u >> 1) & 1) === 0
            ? Bloco.FAIXA_RUA
            : Bloco.ASFALTO,
      );
    }

  // postes e árvores nas calçadas (a cada 10 blocos algo novo para olhar)
  for (let u = 2; u < LARGURA_VILA - 1; u += 12) {
    if (u >= 88 && u <= 106) continue;
    // (a frente do arco do parque fica livre: o poste dali vai para o lado; e a frente do
    // portãozinho da Casa anos 80 também, parte 3)
    poste(u === 134 ? 138 : u === 50 ? 56 : u, 59);
    poste(u + 6, 70);
  }
  for (let v = 2; v < PROFUNDIDADE_VILA - 1; v += 12) {
    if (v >= 54 && v <= 74) continue;
    poste(92, v);
    poste(103, v + 6);
  }

  // ============================================================== sudeste: a pracinha
  // o piso de pedra creme e calçada em quadros (o xadrez manso de praça)
  for (let u = 104; u <= 127; u++)
    for (let v = 71; v <= 92; v++)
      chao(u, v, ((u >> 1) + (v >> 1)) % 2 ? Bloco.CALCADA : Bloco.PEDRA_CREME);
  // canteiros de flor nos cantos, árvores, bancos e postes
  canteiro(105, 89, 2, 3);
  canteiro(124, 89, 3, 3);
  arvore(125, 73, 0, 1);
  arvore(125, 84, 0, 1);
  poste(104, 73);
  poste(127, 91);
  poste(118, 72);
  peca('banco', 111, 91, DIR.n, 0);
  peca('banco', 116, 72, DIR.s, 1);
  peca('banco', 126, 80, DIR.o, 2);
  peca('lixeira', 105, 76, DIR.l, 0);
  peca('lixeira', 123, 72, DIR.s, 1);
  peca('floreira', 111, 72, DIR.s, 0);
  peca('floreira', 120, 72, DIR.s, 1);
  peca('floreira', 126, 77, DIR.o, 2);
  // o portal da pracinha: duas torres de treliça, a travessa e o letreiro VILA NEON pendurado
  // (lido dos dois lados). Fica na frente de quem nasce, no rumo do palco: a criança vê o
  // letreiro em cima e o palco lá longe, por baixo dele
  const PORTAL_U = 107;
  const PORTAL_V0 = 78;
  const PORTAL_V1 = 85;
  for (let y = 1; y <= 8; y++) {
    b(PORTAL_U, y, PORTAL_V0, Bloco.TRELICA);
    b(PORTAL_U, y, PORTAL_V1, Bloco.TRELICA);
  }
  for (let v = PORTAL_V0; v <= PORTAL_V1; v++) b(PORTAL_U, 8, v, Bloco.TRELICA);
  peca('letreiro', PORTAL_U, (PORTAL_V0 + PORTAL_V1) / 2, DIR.l, LETREIRO.vila, 5.4);
  // a cerca-viva baixa dos dois lados do portal, com as flores na frente
  cercaViva(PORTAL_U, 72, PORTAL_U, PORTAL_V0 - 1);
  cercaViva(PORTAL_U, PORTAL_V1 + 1, PORTAL_U + 4, PORTAL_V1 + 1);
  for (let v = 72; v <= PORTAL_V0 - 2; v++) {
    chao(PORTAL_U + 1, v, Bloco.TERRA);
    b(PORTAL_U + 1, 1, v, Bloco.FLOR);
  }
  // o parquinho: areia, gangorra, balanço e escorregador
  encher(115, 85, 123, 91, Bloco.AREIA_BRUMA);
  peca('gangorra', 117, 87, DIR.l);
  peca('balanco', 121, 87, DIR.n);
  peca('escorregador', 118, 90, DIR.l);
  // o carrinho de pipoca e o mural de recados (o canto das missões), ao lado do portal, de
  // cara para quem nasce
  peca('pipoca', 112, 74, DIR.l);
  peca('mural', 112, 83, DIR.n);
  canteiro(111, 84, 3, 1);
  const mural: [number, number, number] = [X(112) + 0.5, Y, Z(82) + 0.5];
  // onde a criança nasce: na pracinha, olhando para o portal e o palco (oeste-sudoeste)
  const nasceX = X(115) + 0.5;
  const nasceZ = Z(76) + 0.5;

  // ============================================================== sudeste: o fliperama
  // caixa grafite com friso vermelho e azul, frente aberta para a avenida
  {
    const u0 = 130;
    const v0 = 73;
    const w = 16;
    const d = 12;
    const H = 6;
    for (let u = u0; u < u0 + w; u++)
      for (let v = v0; v < v0 + d; v++) {
        chao(u, v, Bloco.PISTA_NEON);
        const borda = u === u0 || u === u0 + w - 1 || v === v0 || v === v0 + d - 1;
        if (!borda) {
          // o teto, com duas fileiras de tubo de neon e as claraboias de vidro (de dia o salão
          // fica claro: a luz do céu entra por elas até a parede do fundo)
          const neon = (v - v0 === 3 || v - v0 === 8) && (u - u0) % 4 !== 0;
          const claraboia = [2, 5, 6, 10].includes(v - v0) && (u - u0) % 5 !== 0;
          b(u, H, v, neon ? Bloco.FAIXA_NEON : claraboia ? Bloco.VIDRO : Bloco.CONCRETO);
          continue;
        }
        for (let y = 1; y <= H + 1; y++) {
          let id: number = Bloco.CONCRETO;
          if (y === 4) id = Bloco.LA_VERMELHA;
          if (y === 5) id = Bloco.LA_AZUL;
          if (y === H + 1) id = Bloco.FAIXA_NEON;
          // a frente aberta (colunas a cada 3) para a avenida
          if (v === v0 && y <= 3 && (u - u0) % 5 !== 0) id = Bloco.AR;
          b(u, y, v, id);
        }
      }
    // chão de dentro: pista quadriculada só no miolo; o resto, calçada
    for (let u = u0 + 1; u < u0 + w - 1; u++)
      for (let v = v0 + 1; v < v0 + d - 1; v++)
        chao(u, v, u - u0 > 3 && u - u0 < w - 4 && v - v0 < 7 ? Bloco.PISTA_NEON : Bloco.CALCADA);
    // o painel de pôsteres do fundo (um painel claro com seis cartazes diferentes: nada de
    // ladrilho repetido) e as máquinas encostadas nas paredes
    peca('posteres', u0 + 7.5, v0 + d - 2, DIR.n, 0, 1.3);
    // as luminárias penduradas no teto do salão
    for (const du of [3, 8, 12]) b(u0 + du, H - 1, v0 + 5, Bloco.LANTERNA);
    const maquinas: [number, number][] = [
      [u0 + 2, v0 + 9],
      [u0 + 5, v0 + 10],
      [u0 + 8, v0 + 10],
      [u0 + 11, v0 + 10],
      [u0 + 13, v0 + 9],
    ];
    maquinas.forEach(([u, v], i) => peca('maquina', u, v, DIR.n, i));
    peca('letreiro', u0 + 7.5, v0, DIR.n, LETREIRO.fliperama, H + 1);
    peca('lixeira', u0 - 1, v0 - 1, DIR.n, 2);
    peca('bicicleta', u0 + w + 1, v0 - 1, DIR.n, 0);
    peca('bicicleta', u0 + w + 3, v0 - 1, DIR.n, 1);
    peca('floreira', u0 + 2, v0 - 1, DIR.n, 0);
    peca('floreira', u0 + 13, v0 - 1, DIR.n, 2);
    peca('banco', u0 + 7, v0 - 2, DIR.n, 5);
    // a calçada da frente do fliperama até a avenida
    encher(u0 - 2, 71, u0 + w + 4, v0 - 1, Bloco.CALCADA);
  }

  // ============================================================== sudeste: o rinque
  const rinqueU0 = 129;
  const rinqueV0 = 92;
  const rinqueW = 20;
  const rinqueD = 16;
  {
    // a pista quadriculada que acende, com a mureta de grade em volta e a entrada para o norte
    for (let u = rinqueU0 - 1; u <= rinqueU0 + rinqueW; u++)
      for (let v = rinqueV0 - 1; v <= rinqueV0 + rinqueD; v++) {
        const borda =
          u === rinqueU0 - 1 ||
          u === rinqueU0 + rinqueW ||
          v === rinqueV0 - 1 ||
          v === rinqueV0 + rinqueD;
        if (borda) {
          chao(u, v, Bloco.CALCADA);
          const entrada = v === rinqueV0 - 1 && u >= rinqueU0 + 8 && u <= rinqueU0 + 11;
          if (!entrada) b(u, 1, v, Bloco.GRADE_FERRO);
        } else chao(u, v, Bloco.PISTA_NEON);
      }
    // o arco de treliça do globo de espelhos (por cima do meio da pista)
    const mu = rinqueU0 + (rinqueW >> 1);
    for (let y = 1; y <= 9; y++) {
      b(rinqueU0 + 1, y, rinqueV0 + 7, Bloco.TRELICA);
      b(rinqueU0 + rinqueW - 2, y, rinqueV0 + 7, Bloco.TRELICA);
    }
    for (let u = rinqueU0 + 1; u <= rinqueU0 + rinqueW - 2; u++)
      b(u, 10, rinqueV0 + 7, Bloco.TRELICA);
    peca('globo', mu - 0.5, rinqueV0 + 7, DIR.n, 0, 7);
    // os postes de luz nos quatro cantos da mureta
    for (const u of [rinqueU0 - 1, rinqueU0 + rinqueW])
      for (const v of [rinqueV0 - 1, rinqueV0 + 8, rinqueV0 + rinqueD]) poste(u, v);
    // o pórtico do rinque (alto, visto de longe) na entrada e o suporte dos patins ao lado
    peca('letreiro', mu - 0.5, rinqueV0 - 2, DIR.n, LETREIRO.rinque, 0);
    peca('suporte-patins', rinqueU0 + 5, rinqueV0 - 3, DIR.n);
    // os três arcos de neon da volta no rinque (f4): um em cada pista em volta do globo (a do
    // oeste e a do leste passam-se andando para o sul e para o norte; a do fundo, para o leste)
    peca('arco-rinque', rinqueU0 + 3.5, rinqueV0 + 4, DIR.n, 0);
    peca('arco-rinque', rinqueU0 + 10, rinqueV0 + 12, DIR.l, 1);
    peca('arco-rinque', rinqueU0 + 16.5, rinqueV0 + 4, DIR.n, 2);
    peca('banco', rinqueU0 + 1, rinqueV0 - 3, DIR.n, 3);
    peca('banco', rinqueU0 + 15, rinqueV0 - 3, DIR.n, 4);
    peca('floreira', rinqueU0 + 18, rinqueV0 - 3, DIR.n, 1);
    peca('lixeira', rinqueU0 + 13, rinqueV0 - 3, DIR.n, 5);
    // o caminho de calçada da pracinha até a entrada do rinque e do fliperama
    encher(128, 86, 131, 90, Bloco.CALCADA);
    encher(rinqueU0, 86, rinqueU0 + rinqueW, 90, Bloco.CALCADA);
    arvore(150, 88);
    arvore(150, 78);
  }
  // o jardim do lado do fliperama e do rinque (a leste): cerca-viva, ipês, canteiros e bancos
  {
    const u0 = 153;
    const u1 = 177;
    const v0 = 73;
    const v1 = 106;
    cercaViva(u0, v0, u1, v0);
    cercaViva(u0, v1, u1, v1);
    cercaViva(u1, v0, u1, v1);
    encher(u0, 86, u1 - 1, 90, Bloco.CALCADA);
    for (let u = u0 + 3; u < u1 - 1; u += 6)
      for (let v = v0 + 3; v < v1 - 1; v += 6) {
        if (v >= 84 && v <= 92) continue;
        if (((u - u0) / 6 + (v - v0) / 6) % 2 < 1) arvore(u, v, 7);
        else canteiro(u, v, 2, 2);
      }
    peca('banco', 160, 85, DIR.s, 17);
    peca('banco', 170, 91, DIR.n, 18);
    peca('floreira', 165, 85, DIR.s, 1);
    poste(156, 85);
    poste(174, 91);
    // e a faixa entre a pracinha e o rinque, com canteiros
    for (let u = 106; u <= 124; u += 6) canteiro(u, 94, 2, 1);
  }
  const rinque = ret(rinqueU0, rinqueV0, rinqueU0 + rinqueW - 1, rinqueV0 + rinqueD - 1);
  const patins: [number, number, number] = [X(rinqueU0 + 5) + 0.5, Y, Z(rinqueV0 - 4) + 0.5];
  const arcos: ArcoRinque[] = pecas
    .filter((q) => q.tipo === 'arco-rinque')
    .sort((a, b) => (a.n ?? 0) - (b.n ?? 0))
    .map((q) => ({ x: q.x, y: q.y, z: q.z, eixo: q.dir % 2 === 0 ? 'x' : 'z', meia: 2.5 }));

  // ============================================================== sudeste: casas da rua
  // casas de frente para a rua da pracinha (oeste), do sul da pracinha até o fim
  {
    let k = 0;
    for (let v = 96; v + 10 <= PROFUNDIDADE_VILA - 2; v += 11) {
      casa(104, v, 10, 14, 'o', k++);
    }
    // e as do miolo do quarteirão, de frente para o rinque e para os fundos
    casa(120, 112, 12, 14, 'n', k++);
    casa(133, 112, 12, 14, 'n', k++);
    casa(120, 130, 12, 18, 's', k++);
    casa(133, 130, 12, 18, 's', k++);
  }

  /** As ferramentas do planejador para os lotes de cada parte (o parque, a casa, a pista). */
  const ferramentas: FerramentasVila = {
    X,
    Z,
    Y,
    chao,
    b,
    encher,
    coluna,
    peca,
    arvore,
    poste,
    cercaViva,
    canteiro,
    ret,
    s,
  };

  // ============================================================== sudeste: a pista de skate
  // (parte 3) a rampa em U no lote que nasceu jardim, com o suporte dos skates: `vilaRampa.ts`
  const pista = montarPistaDeSkate(ferramentas);

  // ============================================================== nordeste: casas e o parque
  {
    let k = 3;
    for (let v = 2; v + 10 <= 56; v += 11) casa(104, v, 10, 14, 'o', k++);
  }
  // o Parque de diversões (parte 2), no lote que nasceu como jardim: `vilaParque.ts`
  const parque = montarParque(ferramentas);
  const lago = parque.lago;

  // ============================================================== noroeste: a Rua anos 80
  // a banca de jornal (quiosque verde) na calçada da avenida
  {
    const u0 = 16;
    const v0 = 54;
    for (let u = u0; u < u0 + 6; u++)
      for (let v = v0; v < v0 + 4; v++) {
        chao(u, v, Bloco.CALCADA);
        const borda = u === u0 || u === u0 + 5 || v === v0 || v === v0 + 3;
        for (let y = 1; y <= 3; y++) {
          if (!borda) continue;
          const frente = v === v0 + 3;
          b(u, y, v, frente && y >= 2 && u > u0 && u < u0 + 5 ? Bloco.AR : Bloco.LA_VERDE);
        }
        b(u, 4, v, Bloco.TOLDO_VERDE);
      }
    for (let u = u0 - 1; u <= u0 + 6; u++) b(u, 4, v0 + 4, Bloco.TOLDO_VERDE);
    peca('letreiro', u0 + 2.5, v0 + 3, DIR.s, LETREIRO.banca, 3.5);
    b(u0 + 2, 3, v0 + 1, Bloco.LANTERNA);
    peca('balcao', u0 + 2, v0 + 2, DIR.s, 0);
    encher(u0 - 2, 50, u0 + 7, 58, Bloco.CALCADA);
  }
  // a locadora (uma loja de um andar)
  loja(26, 47, 13, 11, 's', Bloco.REBOCO_AZUL, Bloco.TOLDO_VERMELHO, LETREIRO.locadora, 1);
  peca('vitrine', 32, 56, DIR.s, 0);
  // a Casa anos 80 (parte 3): de porta aberta, com a sala e o quarto de brinquedos por dentro
  // (`vilaCasa.ts`); as árvores do lado dela ficam fora do corte do telhado
  const casa80 = montarCasa80(ferramentas);
  arvore(67, 44);
  arvore(67, 52);
  // a lanchonete na esquina, com sobrado e sacada
  loja(70, 45, 20, 13, 's', Bloco.REBOCO_ROSA, Bloco.TOLDO_VERMELHO, LETREIRO.lanchonete, 2);
  peca('balcao', 79.5, 50, DIR.s, 1);
  peca('mesinha', 81, 59, DIR.s, 0);
  peca('mesinha', 86, 59, DIR.s, 1);
  peca('floreira', 72, 58, DIR.s, 0);
  peca('floreira', 76, 58, DIR.s, 1);
  peca('floreira', 84, 58, DIR.s, 2);
  peca('floreira', 28, 58, DIR.s, 1);
  peca('floreira', 36, 58, DIR.s, 0);
  // a calçada larga da rua (mesas, orelhão, ponto, bicicletas, hidrante, lixeiras)
  encher(0, 57, 91, 58, Bloco.CALCADA);
  peca('orelhao', 24, 59, DIR.s);
  peca('ponto-onibus', 48, 59, DIR.s);
  peca('bicicleta', 41, 58, DIR.s, 2);
  peca('bicicleta', 42, 58, DIR.s, 3);
  peca('hidrante', 66, 59, DIR.s);
  peca('lixeira', 12, 59, DIR.s, 3);
  peca('lixeira', 68, 58, DIR.s, 4);
  peca('caixa-correio', 39, 59, DIR.s, 9);
  // carros parados junto do meio-fio (só cenário)
  // (o carro: par é o hatch em cunha, ímpar o carrinho bolha; a van 0 e 2 são as da rua)
  peca('carro', 8, 61, DIR.l, 0);
  peca('carro', 34, 61, DIR.l, 1);
  peca('van', 76, 61, DIR.l, 0);
  peca('carro', 120, 68, DIR.o, 2);
  peca('picape', 160, 68, DIR.o, 0);
  peca('carro', 20, 29, DIR.l, 3);
  peca('carro', 60, 32, DIR.o, 4);
  peca('picape', 94, 40, DIR.n, 1);
  peca('carro', 101, 122, DIR.s, 5);
  peca('van', 101, 18, DIR.s, 2);
  // bancos, bicicletas e floreiras nas calçadas (a cada ~10 blocos algo novo para olhar)
  peca('banco', 112, 59, DIR.s, 6);
  peca('banco', 142, 59, DIR.s, 7);
  peca('banco', 162, 59, DIR.s, 8);
  peca('floreira', 124, 59, DIR.s, 0);
  peca('floreira', 150, 59, DIR.s, 1);
  peca('bicicleta', 148, 59, DIR.s, 1);
  peca('lixeira', 172, 59, DIR.s, 6);
  peca('banco', 40, 70, DIR.n, 9);
  peca('banco', 72, 70, DIR.n, 10);
  peca('bicicleta', 51, 70, DIR.n, 0);
  peca('bicicleta', 53, 70, DIR.n, 3);
  peca('lixeira', 67, 70, DIR.n, 7);
  peca('floreira', 46, 70, DIR.n, 2);
  peca('floreira', 78, 70, DIR.n, 0);
  peca('hidrante', 108, 70, DIR.n);
  // as árvores de rua (tronco alto) entre os postes, fora das esquinas, do portão e dos fios
  for (let u = 8; u < LARGURA_VILA - 2; u += 12) {
    if (u >= 86 && u <= 108) continue;
    // (e nenhuma árvore em cima do arco do parque)
    if (![20, 32, 56, 80, 128].includes(u)) arvore(u, u < 92 ? 60 : 59, 2, 2);
    const us = u + 6;
    if (us >= 44 && us <= 150) continue;
    arvore(us, 70, 3, 2);
  }
  for (let v = 8; v < PROFUNDIDADE_VILA - 2; v += 12) {
    // (do lado da pracinha a vista do palco fica livre)
    if (v >= 52 && v <= 100) continue;
    arvore(92, v, 4, 2);
    arvore(103, v + 6 > 52 && v + 6 < 100 ? v : v + 6, 5, 2);
  }
  // o varal de lâmpadas atravessando a avenida e a pipa enroscada no fio
  peca('varal-lampadas', 30, 59, DIR.s, 0, 7, [30, 7, 70]);
  peca('varal-lampadas', 52, 59, DIR.s, 1, 7, [52, 7, 70]);
  peca('varal-lampadas', 76, 59, DIR.s, 2, 7, [76, 7, 70]);
  peca('pipa', 52, 64, DIR.l, 0, 6.11);

  // ============================================================== noroeste: casas de trás
  {
    let k = 1;
    for (let u = 2; u + 12 <= 90; u += 13) casa(u, 10, 12, 18, 's', k++);
    // atrás das lojas, de frente para a rua de trás
    casa(2, 34, 12, 16, 'n', 7);
    casa(70, 34, 12, 10, 'n', 8);
  }

  // ============================================================== sudoeste: casas
  {
    let k = 4;
    for (let v = 74; v + 10 <= PROFUNDIDADE_VILA - 2; v += 12) casa(2, v, 11, 18, 'l', k++);
    // a calçada entre as casas e o alambrado do festival
    encher(20, 71, 23, PROFUNDIDADE_VILA - 1, Bloco.CALCADA);
    for (let v = 76; v < PROFUNDIDADE_VILA - 2; v += 12) poste(21, v);
  }

  // ============================================================== sudoeste: o Festival Trovão
  const F = { u0: 25, v0: 72, u1: 90, v1: 148 };
  // o alambrado em volta, com o portão no meio do lado da avenida
  const portaoU0 = 57;
  const portaoU1 = 64;
  for (let u = F.u0; u <= F.u1; u++) {
    if (u < portaoU0 || u > portaoU1) alambrado(u, F.v0, u, F.v0);
    alambrado(u, F.v1, u, F.v1);
  }
  alambrado(F.u0, F.v0, F.u0, F.v1);
  alambrado(F.u1, F.v0, F.u1, F.v1);
  // o portão: duas torres azul-elétrico e vermelho com o raio em cima
  // (a faixa de letreiro de neon em cada torre acende o portão de noite)
  for (const u of [portaoU0 - 2, portaoU0 - 1, portaoU1 + 1, portaoU1 + 2])
    for (let y = 1; y <= 7; y++)
      b(
        u,
        y,
        F.v0,
        y === 6
          ? Bloco.LETREIRO_NEON
          : y === 1 || y === 7
            ? Bloco.CONCRETO
            : y % 2
              ? Bloco.LA_AZUL
              : Bloco.LA_VERMELHA,
      );
  for (let u = portaoU0 - 3; u <= portaoU1 + 3; u++) b(u, 8, F.v0, Bloco.CONCRETO);
  // o raio em cima da travessa e a placa do festival pendurada nela (lida dos dois lados)
  peca('raio-portao', (portaoU0 + portaoU1) / 2, F.v0, DIR.n, 0, 8);
  peca('letreiro', (portaoU0 + portaoU1) / 2, F.v0, DIR.n, LETREIRO.festival, 5.1);
  // as bandeirolas dos dois lados do caminho, do portão até a grade
  {
    const vs = [74, 82.5, 91, 99];
    for (const u of [58, 63])
      for (let i = 0; i < 3; i++)
        peca('bandeirolas', u, vs[i], DIR.s, (i ? 2 : 3) | ((i + (u > 60 ? 2 : 0)) % 4 << 2), 4.4, [
          u,
          4.4,
          vs[i + 1],
        ]);
  }
  canteiro(54, 75, 3, 2);
  canteiro(65, 75, 3, 2);
  // o caminho de cascalho do portão até a grade
  encher(59, F.v0, 62, 100, Bloco.CASCALHO);
  // a calçada da frente do festival (na avenida)
  encher(F.u0, 71, F.u1, 71, Bloco.CALCADA);

  // ---- o palco (tablado 33 × 15 e 3 de altura; a passarela de 6 × 5 entra na plateia)
  const PU0 = 44;
  const PU1 = 76;
  const PV0 = 108;
  const PV1 = 122;
  const PH = 3;
  const MU0 = 58;
  const MU1 = 63;
  const MV0 = 103;
  for (let u = PU0; u <= PU1; u++)
    for (let v = PV0; v <= PV1; v++) {
      for (let y = 1; y < PH; y++) {
        const beira = v === PV0 || u === PU0 || u === PU1;
        let id: number = Bloco.LA_PRETA;
        if (beira && y === PH - 1)
          id = v === PV0 && (u - PU0) % 4 === 2 ? Bloco.LETREIRO_NEON : Bloco.LA_VERMELHA;
        else if (beira) id = v === PV0 && ((u - PU0) >> 1) % 2 ? Bloco.LA_AZUL : Bloco.CONCRETO;
        b(u, y, v, id);
      }
      b(u, PH, v, Bloco.PISO_PALCO);
    }
  for (let u = MU0; u <= MU1; u++)
    for (let v = MV0; v < PV0; v++) {
      for (let y = 1; y < PH; y++) {
        const ponta = v === MV0 && (u === MU0 + 2 || u === MU0 + 3);
        b(
          u,
          y,
          v,
          y === PH - 1
            ? ponta
              ? Bloco.LETREIRO_NEON
              : Bloco.LA_VERMELHA
            : (u + v) % 2
              ? Bloco.LA_AZUL
              : Bloco.CONCRETO,
        );
      }
      b(u, PH, v, Bloco.PISO_PALCO);
    }
  // a escadinha (no lado leste do tablado, fora da grade, subindo para o oeste)
  for (let i = 0; i < PH; i++)
    for (const v of [PV0 + 2, PV0 + 3]) {
      b(PU1 + PH - i, 1 + i, v, Bloco.ESCADINHA_PEDRA, DIR.o);
      for (let y = 1; y <= i; y++) b(PU1 + PH - i, y, v, Bloco.CONCRETO);
    }
  // o fundo do palco: parede grafite alta com a faixa de neon em cima, e as duas abas dos lados
  // (a concha do palco: de lado, cada aba mostra um raio grande)
  const FUNDO = 13;
  for (let u = PU0; u <= PU1; u++)
    for (let y = PH + 1; y <= FUNDO; y++)
      b(u, y, PV1, y === FUNDO ? Bloco.FAIXA_NEON : Bloco.CONCRETO);
  for (const u of [PU0, PU1])
    for (let v = PV1 - 6; v < PV1; v++)
      for (let y = PH + 1; y <= FUNDO; y++)
        b(u, y, v, y === FUNDO ? Bloco.FAIXA_NEON : Bloco.CONCRETO);
  // o raio de neon da logo (cromo, vermelho e amarelo) com o arco de lâmpadas em volta, os
  // raios menores azul e amarelo, e os raios grandes das abas (peças presas na parede)
  const MEIO = (PU0 + PU1) / 2 + 0.5;
  peca('raio-palco', MEIO, PV1 - 1, DIR.n, 0, PH);
  peca('arco-lampadas', MEIO, PV1 - 1, DIR.n, 0, PH);
  peca('raio-palco', PU0 + 8, PV1 - 1, DIR.n, 1, PH + 4);
  peca('raio-palco', PU1 - 8, PV1 - 1, DIR.n, 2, PH + 4);
  peca('raio-palco', PU1 + 1, PV1 - 3.5, DIR.l, 3, PH + 1);
  peca('raio-palco', PU0 - 1, PV1 - 3.5, DIR.o, 4, PH + 1);
  // a parede de amplificadores dos lados, com as pilhas de caixas
  for (const u0 of [PU0 + 1, PU1 - 4])
    for (let u = u0; u < u0 + 4; u++)
      for (let y = PH + 1; y <= PH + 3; y++) b(u, y, PV1 - 1, Bloco.CAIXA_SOM, DIR.n);
  // as três caixas do show (pilhas de 2 na frente do palco, apagadas até a criança tocar)
  const caixas: [number, number, number][] = [];
  for (const u of [PU0 + 6, (PU0 + PU1) >> 1, PU1 - 6]) {
    const v = u === (PU0 + PU1) >> 1 ? PV1 - 4 : PV0 + 2;
    b(u, PH + 1, v, Bloco.CAIXA_SOM, DIR.n);
    b(u, PH + 2, v, Bloco.CAIXA_SOM, DIR.n);
    caixas.push([X(u), h + PH + 1, Z(v)]);
  }
  // as luminárias do palco (a luz de noite vem daqui): em cima dos amplificadores, nos cantos
  // da frente do tablado e no fosso, dos lados da ponta da passarela
  b(PU0 + 2, PH + 4, PV1 - 1, Bloco.LANTERNA);
  b(PU1 - 3, PH + 4, PV1 - 1, Bloco.LANTERNA);
  b(PU0, PH + 1, PV0, Bloco.LANTERNA);
  b(PU1, PH + 1, PV0, Bloco.LANTERNA);
  b(MU0 - 2, 1, MV0, Bloco.LANTERNA);
  b(MU1 + 2, 1, MV0, Bloco.LANTERNA);
  // o praticável vermelho da bateria, no fundo do meio
  for (let u = 57; u <= 64; u++)
    for (let v = PV1 - 3; v <= PV1 - 1; v++) b(u, PH + 1, v, Bloco.LA_VERMELHA);
  peca('bateria', MEIO, PV1 - 2, DIR.n, 0, PH + 1);
  peca('teclado', 70, PV1 - 5, DIR.n, 0, PH);
  peca('pedestal', MEIO, MV0 + 1, DIR.n, 0, PH);
  // as torres de treliça e a grade de luzes por cima
  const TORRE = 17;
  for (const u of [PU0 - 2, PU1 + 2])
    for (const v of [PV0 - 1, PV1]) for (let y = 1; y <= TORRE; y++) b(u, y, v, Bloco.TRELICA);
  for (let u = PU0 - 2; u <= PU1 + 2; u++) {
    b(u, TORRE, PV0 - 1, Bloco.TRELICA);
    b(u, TORRE, PV1, Bloco.TRELICA);
  }
  for (let v = PV0 - 1; v <= PV1; v++) {
    b(PU0 - 2, TORRE, v, Bloco.TRELICA);
    b(PU1 + 2, TORRE, v, Bloco.TRELICA);
    // as travessas da grade de luzes
    for (const u of [PU0 + 8, (PU0 + PU1) >> 1, PU1 - 8]) b(u, TORRE, v, Bloco.TRELICA);
  }
  for (let u = PU0 - 2; u <= PU1 + 2; u++) b(u, TORRE, PV0 + 6, Bloco.TRELICA);
  // os 8 holofotes pendurados na grade da frente e as flâmulas do raio nas torres
  for (let i = 0; i < 8; i++)
    peca('holofote', PU0 + 2 + Math.round((i * (PU1 - PU0 - 4)) / 7), PV0 - 1, DIR.n, i, TORRE - 1);
  // o siga-me: o holofote branco do meio da grade, apontado para a ponta da passarela
  peca('holofote', MEIO, PV0 - 1, DIR.n, 10, TORRE - 1);
  peca('flamula', PU0 - 2, PV0 - 1, DIR.n, 0, TORRE - 4);
  peca('flamula', PU1 + 2, PV0 - 1, DIR.n, 1, TORRE - 4);
  // as caixas de som penduradas (2 × 4 de cada lado), presas na torre da frente
  for (const u0 of [PU0 - 5, PU1 + 3])
    for (let u = u0; u < u0 + 2; u++)
      for (let y = TORRE - 7; y <= TORRE - 4; y++) b(u, y, PV0 - 1, Bloco.CAIXA_SOM, DIR.n);
  for (const u of [PU0 - 3, PU1 + 3]) b(u, TORRE - 3, PV0 - 1, Bloco.TRELICA);
  for (const u of [PU0 - 4, PU1 + 4]) b(u, TORRE - 3, PV0 - 1, Bloco.TRELICA);
  // a van da banda, atrás do palco
  peca('van', 82, 128, DIR.o, 1);

  // ---- a grade da plateia (na frente do palco e da passarela) e o campo
  const GV = 100;
  for (let u = 36; u <= 84; u++) b(u, 1, GV, Bloco.GRADE_PLATEIA);
  for (let v = GV; v < PV0; v++) {
    b(36, 1, v, Bloco.GRADE_PLATEIA);
    b(84, 1, v, Bloco.GRADE_PLATEIA);
  }
  // a mesa de som no meio do campo (a torre de som da época)
  {
    const u0 = 68;
    const v0 = 84;
    for (let u = u0; u < u0 + 5; u++)
      for (let v = v0; v < v0 + 4; v++) {
        const canto = (u === u0 || u === u0 + 4) && (v === v0 || v === v0 + 3);
        if (canto) coluna(u, v, 1, 4, Bloco.TRELICA);
        b(u, 5, v, Bloco.CONCRETO);
      }
    for (let u = u0; u < u0 + 5; u++) b(u, 1, v0, Bloco.GRADE_FERRO);
    b(u0 + 2, 4, v0 + 1, Bloco.LANTERNA);
    peca('mesa-som', u0 + 2, v0 + 2, DIR.s, 0);
  }
  // as barracas do lanche e das camisetas, do lado de dentro do portão
  const barraca = (u0: number, v0: number, toldo: number, n: number) => {
    for (let u = u0; u < u0 + 6; u++)
      for (let v = v0; v < v0 + 4; v++) {
        const borda = u === u0 || u === u0 + 5 || v === v0 || v === v0 + 3;
        chao(u, v, Bloco.TABUAS);
        if (borda && !(v === v0 + 3 && u > u0 && u < u0 + 5)) coluna(u, v, 1, 2, Bloco.TABUAS);
        if (v === v0 + 3 && u > u0 && u < u0 + 5) b(u, 1, v, Bloco.TABUAS);
        b(u, 3, v, toldo);
      }
    // a aba do toldo na frente, a lanterna pendurada e o que se vende em cima do balcão
    for (let u = u0; u < u0 + 6; u++) b(u, 3, v0 + 4, toldo);
    b(u0 + 2, 2, v0 + 1, Bloco.LANTERNA);
    peca('balcao', u0 + 2.5, v0 + 3, DIR.s, 2 + n, 1);
  };
  barraca(32, 76, Bloco.TOLDO_VERMELHO, 0);
  barraca(32, 84, Bloco.TOLDO_VERDE, 1);
  // o rádio gigante, a fita cassete gigante e a parede de pôsteres
  peca('radio-gigante', 42, 92, DIR.l, 0);
  // (a fita fica ao lado da mesa de som: o corredor do cercadinho até a grade fica livre)
  peca('fita-gigante', 65, 86, DIR.n, 0);
  for (let v = 104; v <= 116; v++) for (let y = 1; y <= 3; y++) b(27, y, v, Bloco.PAREDE_POSTER);
  // o cercadinho das lhamas (na beira do campo, perto da avenida): cerca nos três lados de
  // trás e aberto para o sul, de frente para a grade (a lhama segue o feno em linha reta)
  const CU0 = 76;
  const CU1 = 86;
  const CV0 = 76;
  const CV1 = 84;
  for (let u = CU0; u <= CU1; u++)
    for (let v = CV0; v <= CV1; v++) {
      const borda = u === CU0 || u === CU1 || v === CV0;
      if (borda) b(u, 1, v, Bloco.CERCA);
    }
  b(84, 1, 78, Bloco.FENO);
  b(85, 1, 78, Bloco.FENO);
  b(85, 2, 78, Bloco.FENO);
  b(78, 1, 82, Bloco.FENO);
  // árvores, bancos e postes pelo campo (nada no caminho, na frente do palco nem no corredor
  // do cercadinho até a grade; do lado leste do palco tudo baixo, para a vista da pracinha)
  for (const [u, v] of [
    [28, 75],
    [29, 142],
    [86, 142],
    [88, 100],
    [29, 96],
    [46, 78],
    [73, 75],
    [34, 128],
    [44, 138],
    [58, 142],
    [70, 136],
    [33, 120],
    [40, 76],
  ])
    arvore(u, v, 6);
  for (const [u, v] of [
    [52, 74],
    [68, 74],
    [40, 98],
    [87, 98],
    [35, 101],
    [87, 118],
    [30, 126],
    [64, 126],
  ])
    poste(u, v);
  // a cerca-viva por dentro do alambrado (o campo fica com moldura verde)
  for (let u = F.u0 + 1; u < F.u1; u++) {
    if ((u < portaoU0 - 3 || u > portaoU1 + 3) && (u < CU0 - 1 || u > CU1 + 1))
      b(u, 1, F.v0 + 1, Bloco.FOLHAGEM);
    b(u, 1, F.v1 - 1, Bloco.FOLHAGEM);
  }
  for (let v = F.v0 + 2; v < F.v1 - 1; v++) {
    b(F.u0 + 1, 1, v, Bloco.FOLHAGEM);
    if (v > CV1 + 2) b(F.u1 - 1, 1, v, Bloco.FOLHAGEM);
  }
  // os fardos de feno de sentar e as toalhas de piquenique (fora da plateia e do caminho)
  for (const [u, v, y] of [
    [50, 80, 1],
    [51, 80, 1],
    [51, 81, 1],
    [51, 80, 2],
    [66, 78, 1],
    [67, 78, 1],
    [40, 82, 1],
    [41, 82, 1],
    [40, 83, 1],
    [30, 118, 1],
    [31, 118, 1],
    [86, 110, 1],
    [87, 110, 1],
    [87, 111, 1],
    [87, 110, 2],
    [44, 128, 1],
    [45, 128, 1],
  ])
    b(u, y, v, Bloco.FENO);
  peca('toalha', 54, 83, DIR.s, 0);
  peca('toalha', 70, 80, DIR.l, 1);
  peca('toalha', 43, 80, DIR.n, 1);
  peca('toalha', 38, 126, DIR.s, 0);
  peca('banco', 30, 110, DIR.o, 14);
  peca('banco', 47, 74, DIR.s, 15);
  peca('lixeira', 56, 74, DIR.s, 8);
  peca('lixeira', 38, 82, DIR.s, 9);
  // a tenda dos bastidores, atrás do palco: quatro pés de grade e o toldo listrado
  for (let u = 50; u <= 56; u++)
    for (let v = 127; v <= 132; v++) {
      const canto = (u === 50 || u === 56) && (v === 127 || v === 132);
      if (canto) coluna(u, v, 1, 3, Bloco.GRADE_FERRO);
      b(u, 4, v, Bloco.TOLDO_VERMELHO);
    }
  b(53, 3, 129, Bloco.LANTERNA);
  peca('mesinha', 53, 130, DIR.s, 1);
  peca('banco', 52, 128, DIR.s, 16);

  // ============================================================== a moldura de árvores
  // na margem: árvores do jogo, de duas em duas fileiras, e cerca-viva baixa por dentro
  for (let u = -MARGEM_VILA + 2; u < LARGURA_VILA + MARGEM_VILA - 2; u += 4)
    for (const v of [-MARGEM_VILA + 3, PROFUNDIDADE_VILA + MARGEM_VILA - 4]) {
      if (u >= 90 && u <= 105) continue;
      arvore(u + Math.floor(s(u, v, 40) * 2), v);
    }
  for (let v = -MARGEM_VILA + 6; v < PROFUNDIDADE_VILA + MARGEM_VILA - 6; v += 4)
    for (const u of [-MARGEM_VILA + 3, LARGURA_VILA + MARGEM_VILA - 4]) {
      if (v >= 57 && v <= 72) continue;
      arvore(u, v + Math.floor(s(u, v, 41) * 2));
    }

  // ============================================================== pontos de cada coisa
  const pontos: PontosVila = {
    mural,
    estojos: [
      // rua: na calçada da locadora; pista: no canto do rinque; festival: perto do rádio
      [X(36) + 0.5, Y, Z(60) + 0.5],
      [X(rinqueU0 + 16) + 0.5, Y, Z(rinqueV0 + 12) + 0.5],
      [X(46) + 0.5, Y, Z(90) + 0.5],
    ],
    caixas,
    palco: { ...ret(PU0, MV0, PU1, PV1), y: h + PH },
    escadinha: [X(PU1 + PH + 1) + 0.5, Y, Z(PV0 + 3)],
    passarela: [X(MU0 + 3), h + PH + 1, Z(MV0) + 0.5],
    plateia: ret(37, 88, 83, GV - 1),
    cercado: ret(CU0 + 1, CV0 + 1, CU1 - 1, CV1 - 1),
    portaoCercado: [X(81) + 0.5, Y, Z(CV1 + 1) + 0.5],
    patins,
    rinque,
    arcos,
    maquinas: [
      [130 + 2, 73 + 8],
      [130 + 5, 73 + 9],
      [130 + 8, 73 + 9],
      [130 + 11, 73 + 9],
      [130 + 13, 73 + 8],
    ].map(([u, v]) => [X(u) + 0.5, Y, Z(v) + 0.5] as [number, number, number]),
    radio: [X(42) + 0.5, Y, Z(92) + 0.5],
    fita: [X(65) + 0.5, Y, Z(86) + 0.5],
    postos: {
      vocalista: [X(MU0 + 3), h + PH + 1, Z(MV0) + 0.5],
      roadie: [X(PU1 - 3) + 0.5, h + PH + 1, Z(PV0 + 4) + 0.5],
      guitarrista: [X(PU0 + 10) + 0.5, h + PH + 1, Z(PV0 + 4) + 0.5],
      lanche: [X(35) + 0.5, Y, Z(78) + 0.5],
      // (debaixo do globo, no meio da volta: o arco do oeste fica onde ela dançava)
      danca: [X(rinqueU0 + 9) + 0.5, Y, Z(rinqueV0 + 8) + 0.5],
      patinador: [X(rinqueU0 + 13) + 0.5, Y, Z(rinqueV0 + 9) + 0.5],
      lanchonete: [X(80) + 0.5, Y, Z(51) + 0.5],
      banca: [X(19) + 0.5, Y, Z(56) + 0.5],
      ...parque.postos,
      // a vovó mora no sofá da sala da Casa anos 80 (parte 3; na parte 2 ela esperava no
      // portãozinho): o assento do leste, de frente para a TV
      avo: casa80.avo,
      ...pista.postos,
      // spec 032: a Dona Cida atrás do carrinho de pipoca da pracinha (a alça, do lado do
      // portal), de frente para quem nasce
      pracinha: [X(112) + 0.5 - 1.45, Y, Z(74) + 0.5],
    },
    parque: parque.pontos,
    rua: {
      orelhao: [X(24) + 0.5, Y, Z(59) + 0.5],
      fitas: [X(32) + 0.5, Y, Z(56) + 0.5],
      balcao: [X(79.5) + 0.5, Y, Z(50) + 0.5],
      revistas: [X(18) + 0.5, Y, Z(56) + 0.5],
      bicicletas: pecas
        .filter((q) => q.tipo === 'bicicleta')
        .map((q) => [q.x, q.y, q.z] as [number, number, number]),
      letreiros: pecas
        .filter(
          (q) =>
            q.tipo === 'letreiro' &&
            (q.n === LETREIRO.locadora || q.n === LETREIRO.banca || q.n === LETREIRO.lanchonete),
        )
        .map((q) => [q.x, q.y, q.z] as [number, number, number]),
    },
    casa: casa80.pontos,
    skate: pista.pontos,
  };
  // o olhar de quem nasce: para o oeste-sudoeste, no rumo do palco
  // (34° ao sul do oeste: o portal da pracinha na frente, o palco inteiro lá longe por baixo do
  // letreiro e o mural à direita)
  const olhar = Math.atan2(-0.829, 0.559);

  const plano: PlanoVila = {
    semente,
    ox,
    oz,
    h,
    plana,
    zonas: {
      pracinha: ret(104, 71, 127, 92),
      rua: ret(0, 34, 91, 70),
      festival: ret(F.u0, F.v0, F.u1, F.v1),
      fliperama: ret(130, 73, 145, 84),
      rinque: ret(rinqueU0 - 1, rinqueV0 - 4, rinqueU0 + rinqueW, rinqueV0 + rinqueD),
      parque: ret(122, 2, 178, 56),
      casa80: ret(43, 36, 62, 57),
      rampa: ret(150, 110, 178, 147),
    },
    nascimento: { x: nasceX, z: nasceZ, olhar },
    pontos,
    pecas,
    lago,
  };
  void pisoEm;
  return { plano, piso, largura, porChunk };
}
