/**
 * Spec 039 (T05): os móveis na tela, por pedaço (o chunk), como as peças da Vila Neon.
 *
 * - **Uma malha só por pedaço** para o corpo parado de todos os móveis e tapetes dele (a cor nos
 *   vértices), mais uma de luzes (a cúpula do abajur e a lua do criado-mudo acesos).
 * - **A forma de cada móvel em cada direção é montada uma vez e copiada:** o modelo
 *   (`pecas.ts`) sai uma vez por bloco, e o girado uma vez por direção; o pedaço só copia e
 *   desloca os números.
 * - **O desenho sai junto com a remalha do pedaço:** a cena chama `chunk` quando a malha dele
 *   chega (o que a geração pôs e o que foi editado), e `soltar` quando ela sai. Nunca a colisão
 *   sem o desenho. No máximo um pedaço é montado por quadro.
 * - **Só perto:** os pedaços a mais de uns 32 blocos não são montados (e somem, se já estavam).
 * - **O tapete** vem da camada dele (`jogo/tapetes.ts`), rente ao chão e por baixo dos móveis, na
 *   malha do pedaço da âncora dele.
 * - **O que mexe** só ganha malha própria quando é tocado ou com alguém deitado: as portas do
 *   guarda-roupa (`portas`), a água da pia (`agua`) e o edredom da cama (`deitado`). Nesse tempo,
 *   o pedaço desenha aquele móvel sem as partes paradas dele.
 * - **A peça solta** (a parte sem o móvel inteiro) não é desenhada: só a âncora de um móvel
 *   inteiro (`movelEm`) entra.
 */
import type { Scene } from '@babylonjs/core/scene';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import '@babylonjs/core/Rendering/outlineRenderer';
import { Bloco, obterBloco } from '../../world/blocks';
import { ALTURA, TAM_X, TAM_Z } from '../../world/chunk';
import {
  PARTE_CURTINHA,
  celulasDoMovel,
  ehAncora,
  movelEm,
  parteDoMeta,
  type Celula,
  type LeitorMoveis,
} from '../../jogo/moveis';
import { celulasDoTapete, type CamadaTapetes } from '../../jogo/tapetes';
import { criarPlasticos } from '../formas';
import { criarPaletaLuz } from '../vila/luzes';
import { EDREDOM, almofadaDeitada, montarModeloMovel, type ModeloMovel, type ParteModelo } from './pecas';
import { formaDaCoberta, montarCoberta, type CaixaCorpo } from './coberta';
import { criarLigados } from './ligados';
import type { MovelLigado } from '../../nucleo/protocolo';

/** Até onde os móveis são desenhados (blocos, do meio do pedaço à criança, mais a meia diagonal). */
export const DISTANCIA_MOVEIS = 32;
const ALCANCE = DISTANCIA_MOVEIS + Math.hypot(TAM_X, TAM_Z) / 2;

/** Os blocos que este desenho cobre (a malha do pedaço não desenha nada deles). */
export const BLOCOS_MOVEL: ReadonlySet<number> = new Set([
  Bloco.SOFA,
  Bloco.CADEIRA,
  Bloco.CRIADO_MUDO,
  Bloco.CRIADO_MUDO_ACESO,
  Bloco.ABAJUR,
  Bloco.ABAJUR_ACESO,
  Bloco.PIA,
  Bloco.GUARDA_ROUPA,
  Bloco.CAMA,
  // spec 039b: a parte 2
  Bloco.FOGAO,
  Bloco.GELADEIRA,
  Bloco.MESA,
  Bloco.TV,
  Bloco.SOM,
]);
const EH_MOVEL_T = new Uint8Array(256);
for (const b of BLOCOS_MOVEL) EH_MOVEL_T[b] = 1;

export interface OpcoesMoveis {
  /** O mundo do cliente (o mesmo da previsão). */
  leitor: LeitorMoveis;
  /** A camada dos tapetes do cliente. */
  tapetes(): CamadaTapetes;
  /** Cada malha nova (a cena tira do brilho). */
  aoCriar?(m: Mesh): void;
  /** Spec 039b: os móveis ligados perto, como o núcleo mandou (`estado.ligados` da tela). */
  ligados?(): { lista: readonly MovelLigado[]; relogio: number };
}

export interface RenderMoveis {
  /** A malha do pedaço chegou (`base`: os blocos gerados; `edicoes`: índice → bloco | meta << 8). */
  chunk(cx: number, cz: number, base: Uint8Array, edicoes: ReadonlyArray<readonly [number, number]>): void;
  /** O pedaço saiu da tela. */
  soltar(cx: number, cz: number): void;
  /**
   * Uma vez por quadro: a distância, os tapetes que mudaram, um pedaço montado e o que mexe.
   * `luz`: a do dia no plástico (a mesma conta do boneco: 0,45 + 0,55 × o dia).
   */
  quadro(x: number, z: number, dt: number, luz?: number): void;
  /**
   * O fantasma do móvel `b` na mão, com a âncora em (x, y, z) e a direção `d`: inteiro, e
   * vermelho se não cabe (`null`: some).
   */
  fantasma(b: number | null, x?: number, y?: number, z?: number, d?: number, cabe?: boolean): void;
  /** As portas do guarda-roupa da âncora (x, y, z) abrem (só na tela de quem tocou). */
  portas(x: number, y: number, z: number, abertas: boolean): void;
  /** A água da pia da âncora (x, y, z), ligada ou desligada (só na tela de quem está perto). */
  agua(x: number, y: number, z: number, ligada: boolean): void;
  /**
   * Alguém deitado na cama (ou no sofá) da âncora (x, y, z): a coberta macia aparece por cima do
   * corpo (`corpo`: as caixas de cada pedaço do corpo deitado, no mundo, sem a cabeça, e a da
   * cabeça), e o cobertor esticado sai. `topo` null: ninguém mais deitado ali.
   */
  deitado(
    x: number,
    y: number,
    z: number,
    topo: number | null,
    quem: string,
    corpo?: { pedacos: readonly CaixaCorpo[]; cabeca: CaixaCorpo },
  ): void;
  /** O que mexe agora (testes): a âncora, quem está deitado e as partes acesas. */
  mexendo(): Array<{
    ancora: string;
    deitados: Record<string, number>;
    k: number;
    agua: boolean;
    partes: Record<string, [boolean, number]>;
    /** Quanto o corpo de quem está deitado passa da coberta (pelos lados e pelos pés; 0: nada). */
    fora: number;
    coberta: boolean;
    /** As caixas (no referencial do móvel) da cabeça e do corpo todo de cada um deitado ali. */
    caixas: Array<{ cabeca: number[]; corpo: number[] }>;
  }>;
  /** Quantos pedaços, malhas, triângulos, móveis e tapetes vivos (testes e medida). */
  contagem(): { pedacos: number; malhas: number; triangulos: number; moveis: number; tapetes: number; mexendo: number };
  /** Spec 039b: a comida posta na mesa da âncora (o evento `prato`): os pratinhos com a comida. */
  prato(x: number, y: number, z: number, item: string, quantos: number): void;
  /** Spec 039b (testes e fotos): os móveis ligados desenhados agora. */
  ligados(): Array<{ tipo: string; ancora: string; anima: boolean; k: number; programa?: number }>;
  /**
   * Spec 039b (só as fotos): mostra esta lista de ligados no lugar da do núcleo (null: volta à do
   * núcleo). O relógio é o do núcleo.
   */
  forcarLigados(lista: MovelLigado[] | null): void;
  descartar(): void;
}

interface Girado {
  pos: Float32Array;
  nor: Float32Array;
  cor: Float32Array;
  idx: Uint32Array;
}
interface Instancia {
  bloco: number;
  curtinha: boolean;
  d: number;
  ancora: Celula;
  /** O meio do pé do móvel (mundo). */
  cx: number;
  cy: number;
  cz: number;
  giro: number;
}
interface Pedaco {
  cx: number;
  cz: number;
  base: Uint8Array;
  edicoes: ReadonlyArray<readonly [number, number]>;
  malhas: Mesh[];
  montado: boolean;
  moveis: number;
  tapetes: number;
  /** As âncoras dos tapetes desenhados (para saber se a camada mudou aqui). */
  chaveTapetes: string;
}
interface Mexendo {
  inst: Instancia;
  no: TransformNode;
  malhas: Mesh[];
  partes: Record<string, TransformNode>;
  /** As portas: de 0 (fechadas) a 1 (abertas), e para onde vão. */
  k: number;
  alvo: number;
  agua: boolean;
  /** Quem está deitado e o alto do corpo (o maior). */
  deitados: Map<string, number>;
  /** As caixas do corpo (e a da cabeça) de cada um que está deitado (no referencial do móvel). */
  corpos: Map<string, { pedacos: readonly CaixaCorpo[]; cabeca: CaixaCorpo }>;
  /** A coberta macia por cima de quem está deitado (refeita quando alguém deita ou levanta). */
  coberta: Mesh | null;
}

const chaveC = (cx: number, cz: number) => `${cx},${cz}`;
const chaveA = (x: number, y: number, z: number) => `${x},${y},${z}`;
const VET = [
  [0, 1],
  [1, 0],
  [0, -1],
  [-1, 0],
] as const;

export function criarRenderMoveis(scene: Scene, op: OpcoesMoveis): RenderMoveis {
  const pl = criarPlasticos(scene, 'moveis');
  const matCorpo = pl.corVertice(0.3) ?? pl.cor('#ffffff', 0.3);
  // (a água meio transparente: cheia, parecia um tubo azul)
  const matAgua = pl.cor('#8fd6ff', 0.6, 0.5);
  const paleta = criarPaletaLuz(scene, 'moveis-luz');
  const modelos = new Map<string, ModeloMovel>();
  const girados = new Map<string, { corpo: Girado | null; luz: Girado | null }>();
  const pedacos = new Map<string, Pedaco>();
  const mexendo = new Map<string, Mexendo>();
  /** Os pedaços para montar (o mais perto primeiro, um por quadro). */
  const fila = new Set<string>();
  let versaoTapetes = -1;
  let forcados: MovelLigado[] | null = null;
  // spec 039b: o que mexe nos móveis ligados (a TV, o som, o fogão e a geladeira) e o prato da mesa
  const lig = criarLigados(scene, {
    movel: (x, y, z) => {
      const i = instanciaEm(x, y, z);
      return i && i.ancora.x === x && i.ancora.y === y && i.ancora.z === z ? i : null;
    },
    modelo: (b) => modelo(b, false),
    material: matCorpo,
    plasticos: pl,
    refazer: (x, y, z) => {
      const i = instanciaEm(x, y, z);
      if (i) refazerPedacoDe(i);
    },
    aoCriar: op.aoCriar,
  });
  let px = 0;
  let pz = 0;
  let luzAgora = 1;

  function modelo(bloco: number, curtinha: boolean): ModeloMovel {
    const k = `${bloco}:${curtinha ? 1 : 0}`;
    let m = modelos.get(k);
    if (!m) {
      m = montarModeloMovel(bloco, curtinha);
      modelos.set(k, m);
    }
    return m;
  }
  function girar(vd: VertexData | null, giro: number): Girado | null {
    if (!vd) return null;
    const P = vd.positions!;
    const N = vd.normals!;
    const C = vd.colors!;
    const c = Math.cos(giro);
    const s = Math.sin(giro);
    const n = P.length / 3;
    const pos = new Float32Array(P.length);
    const nor = new Float32Array(P.length);
    for (let i = 0; i < n; i++) {
      const x = P[i * 3];
      const z = P[i * 3 + 2];
      pos[i * 3] = x * c + z * s;
      pos[i * 3 + 1] = P[i * 3 + 1];
      pos[i * 3 + 2] = -x * s + z * c;
      const nx = N[i * 3];
      const nz = N[i * 3 + 2];
      nor[i * 3] = nx * c + nz * s;
      nor[i * 3 + 1] = N[i * 3 + 1];
      nor[i * 3 + 2] = -nx * s + nz * c;
    }
    return { pos, nor, cor: Float32Array.from(C), idx: Uint32Array.from(vd.indices!) };
  }
  /** O modelo girado (montado uma vez por bloco, direção e se tem as partes paradas). */
  function girado(i: Instancia, semPartes: boolean): { corpo: Girado | null; luz: Girado | null } {
    const k = `${i.bloco}:${i.curtinha ? 1 : 0}:${(i.giro / (Math.PI / 2)) & 3}:${semPartes ? 1 : 0}`;
    let g = girados.get(k);
    if (!g) {
      const m = modelo(i.bloco, i.curtinha);
      g = semPartes
        ? { corpo: girar(m.corpoSemPartes, i.giro), luz: girar(m.luzSemPartes, i.giro) }
        : { corpo: girar(m.corpo, i.giro), luz: girar(m.luz, i.giro) };
      girados.set(k, g);
    }
    return g;
  }

  /** O meio do pé e o giro do desenho: a cama olha para o pé; os outros, para quem os pôs. */
  function instancia(bloco: number, d: number, ancora: Celula, celulas: readonly Celula[], curtinha: boolean): Instancia {
    let sx = 0;
    let sz = 0;
    let n = 0;
    for (const c of celulas)
      if (c.y === ancora.y) {
        sx += c.x + 0.5;
        sz += c.z + 0.5;
        n++;
      }
    const frenteParaPe = bloco === Bloco.CAMA;
    const giro = (((frenteParaPe ? d : d + 2) & 3) * Math.PI) / 2;
    return { bloco, curtinha, d, ancora, cx: sx / n, cy: ancora.y, cz: sz / n, giro };
  }

  /** Os móveis inteiros e os tapetes cuja âncora fica no pedaço. */
  function achar(p: Pedaco): { moveis: Instancia[]; tapetes: Instancia[] } {
    const x0 = p.cx * TAM_X;
    const z0 = p.cz * TAM_Z;
    const camada = TAM_X * TAM_Z;
    const candidatas = new Map<number, number>();
    const base = p.base;
    for (let i = 0; i < base.length; i++) if (EH_MOVEL_T[base[i]]) candidatas.set(i, base[i]);
    for (const [i, v] of p.edicoes) {
      const id = v & 255;
      if (EH_MOVEL_T[id]) candidatas.set(i, id);
      else candidatas.delete(i);
    }
    const moveis: Instancia[] = [];
    for (const i of candidatas.keys()) {
      const y = Math.floor(i / camada);
      if (y < 1 || y >= ALTURA) continue;
      const x = x0 + (i % TAM_X);
      const z = z0 + Math.floor((i % camada) / TAM_X);
      const b = op.leitor.bloco(x, y, z);
      const meta = op.leitor.meta(x, y, z);
      if (!ehAncora(b, meta)) continue;
      const m = movelEm(op.leitor, x, y, z);
      if (!m || m.ancora.x !== x || m.ancora.y !== y || m.ancora.z !== z) continue;
      const curtinha = b === Bloco.CAMA && parteDoMeta(meta) === PARTE_CURTINHA;
      moveis.push(instancia(b, m.d, m.ancora, m.celulas, curtinha));
    }
    const tapetes: Instancia[] = [];
    for (const t of op.tapetes().todos()) {
      if (Math.floor(t.x / TAM_X) !== p.cx || Math.floor(t.z / TAM_Z) !== p.cz) continue;
      const cs = celulasDoTapete(t.x, t.y, t.z, t.d);
      tapetes.push(instancia(Bloco.TAPETE, t.d, { x: t.x, y: t.y, z: t.z }, cs, false));
    }
    return { moveis, tapetes };
  }
  const chaveDosTapetes = (cx: number, cz: number): string =>
    op
      .tapetes()
      .todos()
      .filter((t) => Math.floor(t.x / TAM_X) === cx && Math.floor(t.z / TAM_Z) === cz)
      .map((t) => `${t.x},${t.y},${t.z},${t.d}`)
      .sort()
      .join(';');

  /** Copia os girados para uma malha só, deslocados (no referencial do canto do pedaço). */
  function malhaDe(nome: string, itens: Array<{ g: Girado; x: number; y: number; z: number; f?: number }>, luz: boolean): Mesh | null {
    if (!itens.length) return null;
    let nv = 0;
    let ni = 0;
    for (const { g } of itens) {
      nv += g.pos.length / 3;
      ni += g.idx.length;
    }
    const pos = new Float32Array(nv * 3);
    const nor = new Float32Array(nv * 3);
    const cor = new Float32Array(nv * 4);
    const idx = new Uint32Array(ni);
    let ov = 0;
    let oi = 0;
    for (const { g, x, y, z, f = 1 } of itens) {
      const n = g.pos.length / 3;
      for (let k = 0; k < n; k++) {
        pos[(ov + k) * 3] = g.pos[k * 3] + x;
        pos[(ov + k) * 3 + 1] = g.pos[k * 3 + 1] + y;
        pos[(ov + k) * 3 + 2] = g.pos[k * 3 + 2] + z;
      }
      nor.set(g.nor, ov * 3);
      if (f === 1) cor.set(g.cor, ov * 4);
      else
        for (let k = 0; k < n * 4; k++) cor[ov * 4 + k] = (k & 3) === 3 ? g.cor[k] : g.cor[k] * f;
      for (let k = 0; k < g.idx.length; k++) idx[oi + k] = g.idx[k] + ov;
      ov += n;
      oi += g.idx.length;
    }
    const vd = new VertexData();
    vd.positions = pos;
    vd.normals = nor;
    vd.colors = cor;
    vd.indices = idx;
    if (luz) paleta.aplicar(vd);
    const m = new Mesh(nome, scene);
    vd.applyToMesh(m);
    m.material = luz ? paleta.material : matCorpo;
    m.isPickable = false;
    m.hasVertexAlpha = false;
    m.receiveShadows = true;
    op.aoCriar?.(m);
    return m;
  }

  /**
   * A luz do lugar do móvel, assada na cor (a mesma conta do boneco): debaixo de um teto, como
   * dentro de casa, 0,62; com um abajur ou um criado-mudo aceso a até 6 blocos, quase a do dia.
   */
  function luzDoLugar(i: Instancia, acesos: readonly Instancia[]): number {
    const x = Math.floor(i.cx);
    const z = Math.floor(i.cz);
    let coberto = false;
    for (let y = i.cy + 2; y < Math.min(ALTURA, i.cy + 48) && !coberto; y++)
      if (obterBloco(op.leitor.bloco(x, y, z))?.opaco) coberto = true;
    if (!coberto) return 1;
    const perto = acesos.some((a) => Math.hypot(a.cx - i.cx, a.cz - i.cz) < 6 && Math.abs(a.cy - i.cy) < 3);
    return perto ? 0.9 : 0.62;
  }
  function desmontar(p: Pedaco): void {
    for (const m of p.malhas) m.dispose();
    p.malhas = [];
    p.montado = false;
  }
  function montar(p: Pedaco): void {
    desmontar(p);
    const { moveis, tapetes } = achar(p);
    const ox = p.cx * TAM_X;
    const oz = p.cz * TAM_Z;
    const corpo: Array<{ g: Girado; x: number; y: number; z: number; f: number }> = [];
    const luz: Array<{ g: Girado; x: number; y: number; z: number }> = [];
    const acesos = moveis.filter((i) => i.bloco === Bloco.ABAJUR_ACESO || i.bloco === Bloco.CRIADO_MUDO_ACESO);
    for (const i of [...tapetes, ...moveis]) {
      const mx = mexendo.get(chaveA(i.ancora.x, i.ancora.y, i.ancora.z));
      const g = girado(
        i,
        (!!mx && (mx.k > 0 || mx.alvo > 0 || mx.deitados.size > 0)) || lig.semPartes(i.ancora.x, i.ancora.y, i.ancora.z),
      );
      const em = { x: i.cx - ox, y: i.cy, z: i.cz - oz };
      if (g.corpo) corpo.push({ g: g.corpo, ...em, f: luzDoLugar(i, acesos) });
      if (g.luz) luz.push({ g: g.luz, ...em });
    }
    for (const [nome, lista, ehLuz] of [
      ['moveis', corpo, false],
      ['moveis-luz', luz, true],
    ] as const) {
      const m = malhaDe(`${nome}-${p.cx},${p.cz}`, lista, ehLuz);
      if (m) {
        m.position.set(ox, 0, oz);
        p.malhas.push(m);
      }
    }
    p.moveis = moveis.length;
    p.tapetes = tapetes.length;
    p.chaveTapetes = chaveDosTapetes(p.cx, p.cz);
    p.montado = true;
  }
  const perto = (p: Pedaco) => Math.hypot((p.cx + 0.5) * TAM_X - px, (p.cz + 0.5) * TAM_Z - pz) < ALCANCE;

  // ---------------------------------------------------------------- o que mexe
  function instanciaEm(x: number, y: number, z: number): Instancia | null {
    const m = movelEm(op.leitor, x, y, z);
    if (!m) return null;
    const curtinha = m.bloco === Bloco.CAMA && parteDoMeta(op.leitor.meta(m.ancora.x, m.ancora.y, m.ancora.z)) === PARTE_CURTINHA;
    return instancia(m.bloco, m.d, m.ancora, m.celulas, curtinha);
  }
  function malhaDaParte(nome: string, p: ParteModelo, pai: TransformNode): Mesh[] {
    const out: Mesh[] = [];
    for (const [vd, luz] of [
      [p.corpo, false],
      [p.luz, true],
    ] as const) {
      if (!vd) continue;
      const g = girar(vd, 0)!;
      const v = new VertexData();
      v.positions = g.pos;
      v.normals = g.nor;
      v.colors = g.cor;
      v.indices = g.idx;
      if (luz) paleta.aplicar(v);
      const m = new Mesh(`${nome}${luz ? '-luz' : ''}`, scene);
      v.applyToMesh(m);
      m.material = luz ? paleta.material : p.agua ? matAgua : matCorpo;
      m.isPickable = false;
      m.parent = pai;
      op.aoCriar?.(m);
      out.push(m);
    }
    return out;
  }
  /** O móvel que mexe (as partes dele numa malha própria), criado na primeira vez. */
  function mexer(x: number, y: number, z: number): Mexendo | null {
    const i = instanciaEm(x, y, z);
    if (!i) return null;
    const k = chaveA(i.ancora.x, i.ancora.y, i.ancora.z);
    let mx = mexendo.get(k);
    if (mx) return mx;
    const no = new TransformNode(`moveis-mexe-${k}`, scene);
    no.position.set(i.cx, i.cy, i.cz);
    no.rotation.y = i.giro;
    const partes: Record<string, TransformNode> = {};
    const malhas: Mesh[] = [];
    const m = modelo(i.bloco, i.curtinha);
    for (const [nome, p] of Object.entries(m.partes)) {
      const pn = new TransformNode(`moveis-parte-${nome}-${k}`, scene);
      pn.parent = no;
      pn.position.set(p.pivo[0], p.pivo[1], p.pivo[2]);
      pn.setEnabled(false);
      malhas.push(...malhaDaParte(`moveis-${nome}-${k}`, p, pn));
      partes[nome] = pn;
    }
    mx = { inst: i, no, malhas, partes, k: 0, alvo: 0, agua: false, deitados: new Map(), corpos: new Map(), coberta: null };
    mexendo.set(k, mx);
    return mx;
  }
  function refazerPedacoDe(i: Instancia): void {
    const p = pedacos.get(chaveC(Math.floor(i.ancora.x / TAM_X), Math.floor(i.ancora.z / TAM_Z)));
    if (p && perto(p)) montar(p);
  }
  function largarSeParado(k: string, mx: Mexendo): void {
    if (mx.k > 0 || mx.alvo > 0 || mx.agua || mx.deitados.size > 0) return;
    mx.coberta?.dispose();
    for (const m of mx.malhas) m.dispose();
    for (const n of Object.values(mx.partes)) n.dispose();
    mx.no.dispose();
    mexendo.delete(k);
    refazerPedacoDe(mx.inst);
  }
  function animar(mx: Mexendo, dt: number): void {
    const P = mx.partes;
    // as portas abrem em 0,4 s e fecham em 0,5 s, macias, sem bater
    if (P.portaE && P.portaD) {
      const v = mx.alvo > mx.k ? dt / 0.4 : -dt / 0.5;
      mx.k = Math.max(0, Math.min(1, mx.k + v));
      const s = mx.k * mx.k * (3 - 2 * mx.k);
      P.portaE.setEnabled(true);
      P.portaD.setEnabled(true);
      P.portaE.rotation.y = -s * 1.9;
      P.portaD.rotation.y = s * 1.9;
    }
    if (P.agua) {
      P.agua.setEnabled(mx.agua);
      P.bolhas?.setEnabled(mx.agua);
      if (mx.agua && P.bolhas) P.bolhas.scaling.y = 0.8 + 0.3 * Math.abs(Math.sin(performance.now() / 200));
    }
    if (P.edredom) {
      // a coberta macia (feita do corpo) toma o lugar do edredom de caixa; sem o corpo (um amigo
      // antigo), o de caixa estica até o alto dele
      const deitado = mx.deitados.size > 0;
      P.edredom.setEnabled(deitado && !mx.coberta);
      // (a almofadinha do sofá sai do canto: ela está debaixo da cabeça, junto da coberta)
      P.almofada?.setEnabled(!(deitado && mx.coberta));
      P.cobertor?.setEnabled(false);
      if (deitado && !mx.coberta) {
        const alto = modelo(mx.inst.bloco, mx.inst.curtinha).partes.edredom?.topo ?? (EDREDOM.altura - EDREDOM.beirada) * 1.25;
        const topo = Math.max(...mx.deitados.values());
        const quer = topo + 0.03 - (mx.inst.cy + P.edredom.position.y);
        P.edredom.scaling.y = Math.max(0.4, Math.min(3, quer / alto));
      }
    }
  }

  /** Refaz a coberta macia por cima de todos que estão deitados ali (o corpo de cada um). */
  function refazerCoberta(mx: Mexendo): void {
    mx.coberta?.dispose();
    mx.coberta = null;
    const f = formaDaCoberta(mx.inst.bloco, mx.inst.curtinha);
    const todos = [...mx.corpos.values()];
    const corpos = todos.flatMap((c) => c.pedacos);
    if (!f || !corpos.length || mx.deitados.size === 0) return;
    const cab = todos[0].cabeca;
    const vd = montarCoberta(f, corpos, cab);
    if (f.almofada && Number.isFinite(cab[0])) {
      // a almofadinha deitada debaixo da cabeça: do assento até um tico acima da nuca (a cabeça
      // afunda nela), um pouco maior que a cabeça para os lados
      const alto = Math.max(0.05, cab[1] + 0.025 - f.base);
      const w = f.eixo === 'x' ? Math.min(0.42, cab[3] - cab[0] + 0.04) : cab[3] - cab[0] + 0.12;
      const d = f.eixo === 'x' ? Math.min(f.c1 - f.c0 - 0.06, cab[5] - cab[2] + 0.12) : Math.min(0.42, cab[5] - cab[2] + 0.04);
      const al = almofadaDeitada(w, alto, d);
      const cx = (cab[0] + cab[3]) / 2;
      const cz = f.eixo === 'x' ? Math.min(Math.max((cab[2] + cab[5]) / 2, f.c0 + d / 2), f.c1 - d / 2) : (cab[2] + cab[5]) / 2;
      const P = al.positions as number[];
      for (let i = 0; i < P.length; i += 3) {
        P[i] += cx;
        P[i + 1] += f.base - 0.01;
        P[i + 2] += cz;
      }
      vd.merge(al);
    }
    const m = new Mesh(`moveis-coberta-${mx.inst.ancora.x},${mx.inst.ancora.y},${mx.inst.ancora.z}`, scene);
    vd.applyToMesh(m);
    m.material = matCorpo;
    m.isPickable = false;
    m.parent = mx.no;
    op.aoCriar?.(m);
    mx.coberta = m;
  }
  /** Quanto o corpo passa dos limites da coberta (nos lados e no comprimento; a cabeça não conta). */
  function foraDaCoberta(mx: Mexendo): number {
    const f = formaDaCoberta(mx.inst.bloco, mx.inst.curtinha);
    if (!f) return 0;
    let fora = 0;
    for (const { pedacos } of mx.corpos.values())
      for (const b of pedacos) {
        const [a0, a1, c0, c1] = f.eixo === 'z' ? [b[2], b[5], b[0], b[3]] : [b[0], b[3], b[2], b[5]];
        fora = Math.max(fora, f.a0 - a0, a1 - f.a1, f.c0 - c0, c1 - f.c1);
      }
    return Math.round(fora * 1000) / 1000;
  }
  /** As caixas do corpo (no mundo) para o referencial do móvel (o giro é de quartos de volta). */
  function paraOMovel(i: Instancia, corpo: readonly CaixaCorpo[]): CaixaCorpo[] {
    const c = Math.round(Math.cos(i.giro));
    const s = Math.round(Math.sin(i.giro));
    return corpo.map(([x0, y0, z0, x1, y1, z1]) => {
      // (o mundo para o móvel: desfaz o giro; x' = x c - z s, z' = x s + z c)
      const xs = [x0 - i.cx, x1 - i.cx];
      const zs = [z0 - i.cz, z1 - i.cz];
      const lx: number[] = [];
      const lz: number[] = [];
      for (const x of xs)
        for (const z of zs) {
          lx.push(x * c - z * s);
          lz.push(x * s + z * c);
        }
      return [Math.min(...lx), y0 - i.cy, Math.min(...lz), Math.max(...lx), y1 - i.cy, Math.max(...lz)] as const;
    });
  }

  /**
   * Spec 039 (T06): o fantasma do móvel na mão, inteiro, antes de pôr: o modelo meio
   * transparente, e vermelho quando não cabe. Uma malha só, refeita quando o móvel ou a direção
   * mudam.
   */
  let fant: { malha: Mesh; k: string } | null = null;
  let matFantasma: StandardMaterial | null = null;
  let matNaoCabe: StandardMaterial | null = null;
  function materiaisDoFantasma(): void {
    if (matFantasma) return;
    // (portão visual: "cabe" num tom neutro, branco-azulado como os fantasmas da obra; "não cabe"
    // em vermelho claro com contorno: no sofá coral, os dois se confundiam)
    matFantasma = new StandardMaterial('moveis-fantasma', scene);
    matFantasma.alpha = 0.45;
    matFantasma.specularColor.set(0, 0, 0);
    matFantasma.diffuseColor.set(0.22, 0.26, 0.32);
    matFantasma.emissiveColor.set(0.66, 0.8, 1);
    matFantasma.backFaceCulling = true;
    matNaoCabe = new StandardMaterial('moveis-fantasma-nao', scene);
    matNaoCabe.alpha = 0.5;
    matNaoCabe.diffuseColor.set(0.3, 0.08, 0.06);
    matNaoCabe.emissiveColor.set(1, 0.46, 0.42);
    matNaoCabe.specularColor.set(0, 0, 0);
  }
  function fantasma(b: number | null, x = 0, y = 0, z = 0, d = 0, cabe = true): void {
    if (b === null) {
      fant?.malha.setEnabled(false);
      return;
    }
    const tapete = b === Bloco.TAPETE;
    const k = `${b}:${d & 3}`;
    if (!fant || fant.k !== k) {
      fant?.malha.dispose();
      materiaisDoFantasma();
      const cs = tapete ? celulasDoTapete(0, 0, 0, d) : celulasDoMovel(b, 0, 0, 0, d);
      const i = instancia(b, d & 3, { x: 0, y: 0, z: 0 }, cs, false);
      const g = girado(i, false);
      const malha = new Mesh('moveis-fantasma', scene);
      if (g.corpo) {
        const vd = new VertexData();
        vd.positions = g.corpo.pos;
        vd.normals = g.corpo.nor;
        vd.colors = g.corpo.cor;
        vd.indices = g.corpo.idx;
        vd.applyToMesh(malha);
      }
      malha.isPickable = false;
      // o meio do pé, a partir da âncora (0, 0, 0)
      malha.metadata = { ox: i.cx, oz: i.cz };
      op.aoCriar?.(malha);
      fant = { malha, k };
    }
    const m = fant.malha;
    const { ox, oz } = m.metadata as { ox: number; oz: number };
    m.position.set(x + ox, y + (tapete ? 0.01 : 0), z + oz);
    m.material = cabe ? matFantasma : matNaoCabe;
    m.useVertexColors = false;
    // o contorno: vermelho no "não cabe" e branco-azulado no "cabe" (2ª rodada do portão: o
    // neutro sumia contra o céu claro). O fantasma vai no grupo de cima, desenhado depois do
    // mundo e do boneco: a cabeça da criança não o tapa (é uma prévia, como a caixa de seleção)
    m.renderOutline = true;
    // (o azul do "cabe" é mais forte que o corpo: branco puro sumia contra o céu claro)
    if (cabe) m.outlineColor.set(0.4, 0.68, 1);
    else m.outlineColor.set(0.86, 0.12, 0.1);
    m.outlineWidth = 0.05;
    m.renderingGroupId = 1;
    m.setEnabled(true);
  }

  return {
    fantasma,
    chunk(cx, cz, base, edicoes) {
      const k = chaveC(cx, cz);
      let p = pedacos.get(k);
      if (!p) {
        p = { cx, cz, base, edicoes, malhas: [], montado: false, moveis: 0, tapetes: 0, chaveTapetes: '' };
        pedacos.set(k, p);
      }
      p.base = base;
      p.edicoes = edicoes;
      // a malha do pedaço acabou de chegar: o desenho vem junto, no máximo um pedaço por quadro (o
      // mais perto primeiro; o de antes fica até o novo nascer, sem piscar); longe, fica para depois
      if (perto(p)) fila.add(k);
      else desmontar(p);
    },
    soltar(cx, cz) {
      const k = chaveC(cx, cz);
      const p = pedacos.get(k);
      if (p) desmontar(p);
      pedacos.delete(k);
      fila.delete(k);
    },
    quadro(x, z, dt, luz) {
      px = x;
      pz = z;
      if (luz !== undefined && Math.abs(luz - luzAgora) > 0.005) {
        luzAgora = luz;
        pl.definirLuz(luz);
      }
      // os tapetes que mudaram: os pedaços das âncoras de antes e de agora
      const camada = op.tapetes();
      if (camada.versao !== versaoTapetes) {
        versaoTapetes = camada.versao;
        for (const [k, p] of pedacos) if (p.montado && chaveDosTapetes(p.cx, p.cz) !== p.chaveTapetes) fila.add(k);
        for (const t of camada.todos()) {
          const k = chaveC(Math.floor(t.x / TAM_X), Math.floor(t.z / TAM_Z));
          const p = pedacos.get(k);
          if (p && p.chaveTapetes !== chaveDosTapetes(p.cx, p.cz)) fila.add(k);
        }
      }
      // perto e sem desenho: entra na fila; longe: sai
      for (const [k, p] of pedacos) {
        if (perto(p)) {
          if (!p.montado) fila.add(k);
        } else if (p.montado) desmontar(p);
      }
      // um pedaço por quadro, o mais perto primeiro
      let melhor: string | null = null;
      let dm = Infinity;
      for (const k of fila) {
        const p = pedacos.get(k);
        if (!p) {
          fila.delete(k);
          continue;
        }
        const d = Math.hypot((p.cx + 0.5) * TAM_X - x, (p.cz + 0.5) * TAM_Z - z);
        if (d < dm) {
          dm = d;
          melhor = k;
        }
      }
      if (melhor) {
        fila.delete(melhor);
        const p = pedacos.get(melhor)!;
        if (perto(p)) montar(p);
      }
      for (const [k, mx] of mexendo) {
        animar(mx, dt);
        largarSeParado(k, mx);
      }
      const l = op.ligados?.();
      lig.quadro(forcados ?? l?.lista ?? [], l?.relogio ?? 0, x, z, dt);
    },
    forcarLigados(lista) {
      forcados = lista;
    },
    prato(x, y, z, item, quantos) {
      lig.prato(x, y, z, item, quantos);
    },
    ligados: () => lig.vistos(),
    portas(x, y, z, abertas) {
      const mx = abertas ? mexer(x, y, z) : mexendo.get(chaveA(x, y, z)) ?? null;
      if (!mx || !mx.partes.portaE) return;
      const antes = mx.alvo > 0 || mx.k > 0;
      mx.alvo = abertas ? 1 : 0;
      if (!antes) refazerPedacoDe(mx.inst);
    },
    agua(x, y, z, ligada) {
      const mx = ligada ? mexer(x, y, z) : mexendo.get(chaveA(x, y, z)) ?? null;
      if (!mx || !mx.partes.agua) return;
      mx.agua = ligada;
    },
    deitado(x, y, z, topo, quem, corpo) {
      const i = instanciaEm(x, y, z);
      const k = i ? chaveA(i.ancora.x, i.ancora.y, i.ancora.z) : chaveA(x, y, z);
      // quem deitou em outra cama saiu desta
      for (const [kk, mx] of mexendo)
        if (kk !== k && mx.deitados.delete(quem)) {
          mx.corpos.delete(quem);
          refazerCoberta(mx);
        }
      if (topo === null) {
        const mx = mexendo.get(k);
        if (mx?.deitados.delete(quem)) {
          mx.corpos.delete(quem);
          refazerCoberta(mx);
        }
        return;
      }
      const mx = mexer(x, y, z);
      if (!mx || !mx.partes.edredom) return;
      const antes = mx.deitados.size > 0;
      mx.deitados.set(quem, topo);
      if (corpo) mx.corpos.set(quem, { pedacos: paraOMovel(mx.inst, corpo.pedacos), cabeca: paraOMovel(mx.inst, [corpo.cabeca])[0] });
      refazerCoberta(mx);
      if (!antes) refazerPedacoDe(mx.inst);
    },
    mexendo() {
      return [...mexendo.entries()].map(([k, mx]) => ({
        ancora: k,
        deitados: Object.fromEntries(mx.deitados),
        k: mx.k,
        agua: mx.agua,
        partes: Object.fromEntries(Object.entries(mx.partes).map(([n, p]) => [n, [p.isEnabled(), p.scaling.y] as [boolean, number]])),
        fora: foraDaCoberta(mx),
        coberta: !!mx.coberta,
        caixas: [...mx.corpos.values()].map((c) => ({
          cabeca: c.cabeca.map((v) => Math.round(v * 100) / 100),
          corpo: [0, 1, 2, 3, 4, 5].map((i) => Math.round((i < 3 ? Math.min : Math.max)(...c.pedacos.map((b) => b[i])) * 100) / 100),
        })),
      }));
    },
    contagem() {
      let malhas = 0;
      let triangulos = 0;
      let moveis = 0;
      let tapetes = 0;
      let n = 0;
      for (const p of pedacos.values()) {
        if (!p.montado) continue;
        n++;
        moveis += p.moveis;
        tapetes += p.tapetes;
        for (const m of p.malhas) {
          malhas++;
          triangulos += m.getTotalIndices() / 3;
        }
      }
      for (const mx of mexendo.values())
        for (const m of mx.malhas)
          if (m.isEnabled()) {
            malhas++;
            triangulos += m.getTotalIndices() / 3;
          }
      const cl = lig.contagem();
      return { pedacos: n, malhas: malhas + cl.malhas, triangulos: triangulos + cl.triangulos, moveis, tapetes, mexendo: mexendo.size };
    },
    descartar() {
      lig.descartar();
      for (const p of pedacos.values()) desmontar(p);
      pedacos.clear();
      for (const mx of mexendo.values()) {
        for (const m of mx.malhas) m.dispose();
        mx.no.dispose();
      }
      mexendo.clear();
      fant?.malha.dispose();
      matFantasma?.dispose();
      matNaoCabe?.dispose();
      (matCorpo as StandardMaterial).dispose();
    },
  };
}
