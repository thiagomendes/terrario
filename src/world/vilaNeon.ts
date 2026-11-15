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
  | 'balcao';

/** Nomes dos letreiros (em português, inventados; só no mundo, nunca na interface). */
export const LETREIROS = [
  'VILA NEON',
  'LOCADORA FITA MÁGICA',
  'BANCA DO BAIRRO',
  'LANCHONETE DOIS CANUDOS',
  'FLIPERAMA',
  'RINQUE',
  'FESTIVAL TROVÃO',
] as const;
export const LETREIRO = {
  vila: 0,
  locadora: 1,
  banca: 2,
  lanchonete: 3,
  fliperama: 4,
  rinque: 5,
  festival: 6,
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
  | 'banca';

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
  /** As cinco máquinas do fliperama (a frente de cada uma). */
  maquinas: [number, number, number][];
  /** O rádio gigante e o lápis da fita gigante (brinquedos de tocar). */
  radio: [number, number, number];
  fita: [number, number, number];
  /** Onde cada morador fica. */
  postos: Record<PostoVila, [number, number, number]>;
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
  const arvore = (u: number, v: number, k = 0) => {
    const t = s(u, v, 11 + k);
    const betula = t > 0.78;
    const ipe = !betula && t < 0.3;
    const tronco = (betula ? 5 : 4) + Math.floor(s(u, v, 12) * 2);
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
    Bloco.TELHA_COLONIAL,
    Bloco.LA_AZUL,
    Bloco.TIJOLOS,
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
            id = Bloco.JANELA;
          if ((sx === 0 || sx === w - 1) && (y === 2 || y === 3) && (f - QUINTAL) % 3 === 2)
            id = Bloco.JANELA;
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
    // enfeites do quintal: casinha de cachorro, varal ou piscininha (um por casa)
    const [eu, ev] = q(w - 3, 2);
    const enfeite = k % 3;
    if (enfeite === 0) peca('casinha-cachorro', eu, ev, dir, k);
    else if (enfeite === 1) peca('piscininha', eu, ev, dir, k);
    else peca('varal-roupa', eu, ev, dir, k);
    const [cu, cv] = q(1, -1);
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
          if (andares === 2 && frente && (y === 6 || y === 7) && sx % 3 === 1) id = Bloco.JANELA;
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
    // o toldo de blocos na frente (uma fileira saindo da parede) e a sacada do sobrado
    for (let sx = 1; sx < w - 1; sx++) {
      const [u, v] = q(sx, -1);
      b(u, 4, v, toldo);
      if (andares === 2) b(u, 6, v, sx === 1 || sx === w - 2 ? Bloco.GRADE_FERRO : Bloco.AR);
    }
    // o letreiro em cima do toldo
    const [lu, lv] = q(w >> 1, -1);
    peca('letreiro', lu, lv, dir, letreiro, andares === 2 ? 5 : 5);
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
    poste(u, 59);
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
  canteiro(105, 89, 3, 3);
  canteiro(124, 89, 3, 3);
  arvore(125, 73);
  arvore(125, 84);
  poste(104, 73);
  poste(127, 91);
  peca('banco', 109, 91, DIR.n, 0);
  peca('banco', 113, 91, DIR.n, 1);
  peca('banco', 126, 80, DIR.o, 2);
  peca('lixeira', 104, 80, DIR.l, 0);
  peca('lixeira', 120, 72, DIR.s, 1);
  // o letreiro VILA NEON (arco de dois postes) na beira da avenida, de cara para ela
  peca('letreiro', 112, 72, DIR.n, LETREIRO.vila, 0);
  // o parquinho: areia, gangorra, balanço e escorregador
  encher(115, 84, 123, 91, Bloco.AREIA_BRUMA);
  peca('gangorra', 117, 87, DIR.l);
  peca('balanco', 121, 86, DIR.n);
  peca('escorregador', 117, 90, DIR.l);
  // o mural de recados (o canto das missões): de cara para quem nasce
  peca('mural', 106, 77, DIR.l);
  const mural: [number, number, number] = [X(107) + 0.5, Y, Z(77) + 0.5];
  // onde a criança nasce: no meio da pracinha, olhando para o palco (oeste-sudoeste)
  const nasceX = X(113) + 0.5;
  const nasceZ = Z(79) + 0.5;

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
          b(u, H, v, Bloco.CONCRETO);
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
    // a parede de pôsteres do fundo e as máquinas encostadas nas paredes
    for (let u = u0 + 1; u < u0 + w - 1; u++)
      for (let y = 2; y <= 4; y++) b(u, y, v0 + d - 1, Bloco.PAREDE_POSTER);
    const maquinas: [number, number][] = [
      [u0 + 2, v0 + 9],
      [u0 + 5, v0 + 10],
      [u0 + 8, v0 + 10],
      [u0 + 11, v0 + 10],
      [u0 + 13, v0 + 9],
    ];
    maquinas.forEach(([u, v], i) => peca('maquina', u, v, DIR.n, i));
    peca('letreiro', u0 + 8, v0 - 1, DIR.n, LETREIRO.fliperama, 5);
    peca('lixeira', u0 - 1, v0 - 1, DIR.n, 2);
    peca('bicicleta', u0 + w, v0 - 1, DIR.n, 0);
    peca('bicicleta', u0 + w + 1, v0 - 1, DIR.n, 1);
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
    peca('globo', mu, rinqueV0 + 7, DIR.n, 0, 7);
    // a placa do rinque (alta, vista de longe) e o suporte dos patins na entrada
    peca('letreiro', mu, rinqueV0 - 3, DIR.n, LETREIRO.rinque, 0);
    peca('suporte-patins', rinqueU0 + 6, rinqueV0 - 3, DIR.n);
    peca('banco', rinqueU0 + 2, rinqueV0 - 3, DIR.n, 3);
    peca('banco', rinqueU0 + 14, rinqueV0 - 3, DIR.n, 4);
    // o caminho de calçada da pracinha até a entrada do rinque e do fliperama
    encher(128, 86, 131, 90, Bloco.CALCADA);
    encher(rinqueU0, 86, rinqueU0 + rinqueW, 90, Bloco.CALCADA);
    arvore(150, 88);
    arvore(150, 78);
  }
  const rinque = ret(rinqueU0, rinqueV0, rinqueU0 + rinqueW - 1, rinqueV0 + rinqueD - 1);
  const patins: [number, number, number] = [X(rinqueU0 + 6) + 0.5, Y, Z(rinqueV0 - 2) + 0.5];

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

  // ============================================================== sudeste: o lote da rampa
  // (parte 3) jardim cercado e acabado: gramado, cerca-viva, árvores, canteiros e bancos
  const jardim = (u0: number, v0: number, u1: number, v1: number, k: number) => {
    cercaViva(u0, v0, u1, v0);
    cercaViva(u0, v1, u1, v1);
    cercaViva(u0, v0, u0, v1);
    cercaViva(u1, v0, u1, v1);
    // as entradas no meio de cada lado
    const mu = (u0 + u1) >> 1;
    const mv = (v0 + v1) >> 1;
    for (const [u, v] of [
      [mu, v0],
      [mu + 1, v0],
      [mu, v1],
      [mu + 1, v1],
      [u0, mv],
      [u0, mv + 1],
      [u1, mv],
      [u1, mv + 1],
    ])
      b(u, 1, v, Bloco.AR);
    // a cruz de caminhos de pedra creme
    encher(mu, v0, mu + 1, v1, Bloco.PEDRA_CREME);
    encher(u0, mv, u1, mv + 1, Bloco.PEDRA_CREME);
    // bosques nos quatro quartos e canteiros na volta da cruz
    for (let u = u0 + 4; u < u1 - 2; u += 7)
      for (let v = v0 + 4; v < v1 - 2; v += 7) {
        if (Math.abs(u - mu) < 4 || Math.abs(v - mv) < 4) continue;
        if (s(u, v, 30 + k) < 0.75)
          arvore(u + Math.floor(s(u, v, 31) * 2), v + Math.floor(s(u, v, 32) * 2), k);
      }
    canteiro(mu - 3, mv - 3, 2, 2);
    canteiro(mu + 3, mv - 3, 2, 2);
    canteiro(mu - 3, mv + 3, 2, 2);
    canteiro(mu + 3, mv + 3, 2, 2);
    peca('banco', mu - 2, mv - 5, DIR.s, 10 + k);
    peca('banco', mu + 3, mv + 6, DIR.n, 11 + k);
    poste(mu - 1, mv - 1);
    poste(mu + 2, mv + 2);
  };
  jardim(150, 110, 178, 147, 0);

  // ============================================================== nordeste: casas e o parque
  {
    let k = 3;
    for (let v = 2; v + 10 <= 56; v += 11) casa(104, v, 10, 14, 'o', k++);
  }
  // o lote do parque (parte 2): jardim grande cercado, com laguinho de peixinhos
  jardim(122, 2, 178, 56, 1);
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
    peca('letreiro', u0 + 3, v0 + 4, DIR.s, LETREIRO.banca, 4);
    peca('balcao', u0 + 2, v0 + 2, DIR.s, 0);
    encher(u0 - 2, 50, u0 + 7, 58, Bloco.CALCADA);
  }
  // a locadora (uma loja de um andar)
  loja(26, 47, 13, 11, 's', Bloco.REBOCO_AZUL, Bloco.TOLDO_VERMELHO, LETREIRO.locadora, 1);
  peca('vitrine', 32, 56, DIR.s, 0);
  // a casa da parte 3 (por enquanto fechada: fachada, quintal e muro, como as outras)
  casa(43, 36, 14, 22, 's', 2);
  arvore(60, 44);
  arvore(60, 52);
  // a lanchonete na esquina, com sobrado e sacada
  loja(70, 45, 20, 13, 's', Bloco.REBOCO_ROSA, Bloco.TOLDO_VERMELHO, LETREIRO.lanchonete, 2);
  peca('balcao', 80, 49, DIR.s, 1);
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
  peca('carro', 8, 61, DIR.l, 0);
  peca('carro', 34, 61, DIR.l, 1);
  peca('van', 76, 61, DIR.l, 0);
  peca('carro', 120, 68, DIR.o, 2);
  peca('carro', 160, 68, DIR.o, 3);
  // o varal de lâmpadas atravessando a avenida e a pipa enroscada no fio
  peca('varal-lampadas', 30, 59, DIR.s, 0, 7, [30, 7, 70]);
  peca('varal-lampadas', 52, 59, DIR.s, 1, 7, [52, 7, 70]);
  peca('varal-lampadas', 76, 59, DIR.s, 2, 7, [76, 7, 70]);
  peca('pipa', 45, 64, DIR.s, 0, 7);

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
  for (const u of [portaoU0 - 2, portaoU0 - 1, portaoU1 + 1, portaoU1 + 2])
    for (let y = 1; y <= 7; y++)
      b(u, y, F.v0, (y + (u < portaoU0 ? 0 : 1)) % 2 ? Bloco.LA_AZUL : Bloco.LA_VERMELHA);
  for (let u = portaoU0 - 2; u <= portaoU1 + 2; u++) b(u, 8, F.v0, Bloco.LA_PRETA);
  peca('raio-portao', (portaoU0 + portaoU1 + 1) >> 1, F.v0, DIR.n, 0, 9);
  peca('letreiro', (portaoU0 + portaoU1 + 1) >> 1, F.v0 - 1, DIR.n, LETREIRO.festival, 5);
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
        b(u, y, v, beira ? (y === PH - 1 ? Bloco.LA_VERMELHA : Bloco.LA_PRETA) : Bloco.LA_PRETA);
      }
      b(u, PH, v, Bloco.PISO_PALCO);
    }
  for (let u = MU0; u <= MU1; u++)
    for (let v = MV0; v < PV0; v++) {
      for (let y = 1; y < PH; y++) b(u, y, v, y === PH - 1 ? Bloco.LA_VERMELHA : Bloco.LA_AZUL);
      b(u, PH, v, Bloco.PISO_PALCO);
    }
  // a escadinha (no lado leste do tablado, fora da grade, subindo para o oeste)
  for (let i = 0; i < PH; i++)
    for (const v of [PV0 + 2, PV0 + 3]) {
      b(PU1 + PH - i, 1 + i, v, Bloco.ESCADINHA_PEDRA, DIR.o);
      for (let y = 1; y <= i; y++) b(PU1 + PH - i, y, v, Bloco.LA_PRETA);
    }
  // o fundo do palco: parede grafite alta com o raio de neon da logo no meio
  const FUNDO = 13;
  for (let u = PU0; u <= PU1; u++)
    for (let y = PH + 1; y <= FUNDO; y++) b(u, y, PV1, Bloco.LA_PRETA);
  // o raio da logo em letreiro de neon (desenhado em blocos: um raio gordinho)
  const raio: [number, number][] = [
    [2, 8],
    [3, 8],
    [1, 7],
    [2, 7],
    [0, 6],
    [1, 6],
    [0, 5],
    [1, 5],
    [2, 5],
    [3, 5],
    [2, 4],
    [3, 4],
    [1, 3],
    [2, 3],
    [0, 2],
    [1, 2],
    [0, 1],
  ];
  for (const [du, dy] of raio) b(58 + du * 1 + 1, PH + 2 + dy, PV1 - 1, Bloco.LETREIRO_NEON);
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
  // o praticável vermelho da bateria, no fundo do meio
  for (let u = 57; u <= 64; u++)
    for (let v = PV1 - 3; v <= PV1 - 1; v++) b(u, PH + 1, v, Bloco.LA_VERMELHA);
  peca('bateria', 60, PV1 - 2, DIR.n, 0, PH + 2);
  peca('teclado', 70, PV1 - 5, DIR.n, 0, PH + 1);
  peca('pedestal', 60, MV0 + 1, DIR.n, 0, PH + 1);
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
  }
  // os 8 holofotes pendurados na grade da frente e as flâmulas do raio nas torres
  for (let i = 0; i < 8; i++)
    peca('holofote', PU0 + 2 + Math.round((i * (PU1 - PU0 - 4)) / 7), PV0 - 1, DIR.n, i, TORRE - 1);
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
        b(u, 5, v, Bloco.LA_PRETA);
      }
    for (let u = u0; u < u0 + 5; u++) b(u, 1, v0, Bloco.GRADE_FERRO);
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
    peca('balcao', u0 + 3, v0 + 2, DIR.l, 2 + n);
  };
  barraca(32, 76, Bloco.TOLDO_VERMELHO, 0);
  barraca(32, 84, Bloco.TOLDO_VERDE, 1);
  // o rádio gigante, a fita cassete gigante e a parede de pôsteres
  peca('radio-gigante', 42, 92, DIR.l, 0);
  peca('fita-gigante', 78, 94, DIR.o, 0);
  for (let v = 104; v <= 116; v++) for (let y = 1; y <= 3; y++) b(27, y, v, Bloco.PAREDE_POSTER);
  // o cercadinho das lhamas (na beira do campo, perto da avenida) com feno e o portãozinho
  const CU0 = 76;
  const CU1 = 86;
  const CV0 = 76;
  const CV1 = 84;
  for (let u = CU0; u <= CU1; u++)
    for (let v = CV0; v <= CV1; v++) {
      const borda = u === CU0 || u === CU1 || v === CV0 || v === CV1;
      if (borda)
        b(
          u,
          1,
          v,
          u === 81 && v === CV1 ? Bloco.PORTEIRA_ABERTA : Bloco.CERCA,
          u === 81 && v === CV1 ? DIR.s : 0,
        );
    }
  b(84, 1, 78, Bloco.FENO);
  b(85, 1, 78, Bloco.FENO);
  b(85, 2, 78, Bloco.FENO);
  b(78, 1, 82, Bloco.FENO);
  // árvores, bancos e postes pelo campo (nada no caminho nem na frente do palco)
  for (const [u, v] of [
    [28, 74],
    [28, 140],
    [88, 140],
    [88, 100],
    [28, 96],
    [46, 78],
    [74, 74],
  ])
    arvore(u, v);
  for (const [u, v] of [
    [52, 74],
    [68, 74],
    [40, 98],
    [80, 98],
  ])
    poste(u, v);

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
    portaoCercado: [X(81) + 0.5, Y, Z(CV1) + 0.5],
    patins,
    rinque,
    maquinas: [
      [130 + 2, 73 + 8],
      [130 + 5, 73 + 9],
      [130 + 8, 73 + 9],
      [130 + 11, 73 + 9],
      [130 + 13, 73 + 8],
    ].map(([u, v]) => [X(u) + 0.5, Y, Z(v) + 0.5] as [number, number, number]),
    radio: [X(42) + 0.5, Y, Z(92) + 0.5],
    fita: [X(78) + 0.5, Y, Z(94) + 0.5],
    postos: {
      vocalista: [X(MU0 + 3), h + PH + 1, Z(MV0) + 0.5],
      roadie: [X(PU1 - 3) + 0.5, h + PH + 1, Z(PV0 + 4) + 0.5],
      guitarrista: [X(PU0 + 10) + 0.5, h + PH + 1, Z(PV0 + 4) + 0.5],
      lanche: [X(35) + 0.5, Y, Z(78) + 0.5],
      danca: [X(rinqueU0 + 5) + 0.5, Y, Z(rinqueV0 + 5) + 0.5],
      patinador: [X(rinqueU0 + 13) + 0.5, Y, Z(rinqueV0 + 9) + 0.5],
      lanchonete: [X(80) + 0.5, Y, Z(51) + 0.5],
      banca: [X(19) + 0.5, Y, Z(56) + 0.5],
    },
  };
  // o olhar de quem nasce: para o oeste, com o palco à esquerda e o mural à direita
  const olhar = Math.atan2(X(61) - nasceX, Z(84) - nasceZ);

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
      casa80: ret(43, 36, 56, 57),
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
