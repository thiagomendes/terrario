/**
 * Spec 030 "Guia da missão", na cena: a trilha de pegadinhas verde-água (sempre nascendo nos
 * pés da criança, com a ondinha que corre para a frente), a placa do alvo com o desenho da
 * missão e a virada macia da câmera (uma vez, quando a trilha acende, só sem dedo na câmera).
 *
 * A trilha vai pelas calçadas na cidade (a rede dos moradores, `caminhoNaCidade`) e pela busca
 * a pé da 021 fora dela (no sítio, alisada e sem pisar na roça). A busca anda em fatias de
 * 4 ms por quadro. Tudo é do aparelho: nada vai pela rede.
 */
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Matrix, Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { Constants } from '@babylonjs/core/Engines/constants';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import '@babylonjs/core/Meshes/thinInstanceMesh';
import type { Scene } from '@babylonjs/core/scene';
import type { Missao } from '../jogo/alma';
import {
  buscarCaminho,
  chaoNaColuna,
  comPecas,
  ehSolido,
  type Caminho,
  type LeitorCaminho,
  type V3,
} from '../jogo/caminho';
import {
  MAX_PEGADAS,
  PASSO_PAR,
  afastarDe,
  alisar,
  comprimento,
  distanciaNaLinha,
  pontoNaLinha,
  posicaoDaPlaca,
  alvoDaMissao,
  chegouAoAlvo,
  custoNoSitio,
  espalharPegadas,
  ondaNaPegada,
  pertoNaLinha,
  reamostrar,
  ruimNoSitio,
  type AlvoGuia,
  type MundoDoGuia,
  type Pegada,
} from '../jogo/guia';
import { caminhoNaCidade } from '../world/ruasCidade';
import { soloDaCidade, soloDePista } from '../world/cidade';
import { arte } from '../ui/alma/arte';
import { desenhoDaObra } from '../ui/alma/figuras';
import { iconeDoItem } from '../ui/icones';

// ------------------------------------------------------------------ cores (nada de arco-íris)
/** Verde-água das pegadinhas: longe do dourado das estrelinhas do amigo (021). */
const MENTA = '#5fe3c4';
const MENTA_BRILHO = '#36d2ae';
const MENTA_ESCURA = '#1fa889';
const CREME = '#fffaf0';

/** Fatia de tempo da busca por quadro (ms), como na 021. */
const FATIA_BUSCA = 4;
/** Quanto dura a virada macia da câmera (s). */
const VIRAR_S = 1.5;
/** A virada deixa a trilha este tanto à direita do meio da tela (rad). */
const DE_LADO = 0.5;
/** Saiu da rota mais que isto (blocos): procura de novo a partir dos pés. */
const LONGE_DA_ROTA = 2.5;
/** O morador (c5) andou mais que isto do fim da trilha: refaz. */
const MORADOR_ANDOU = 4;
/** Tamanho da pegada (o par cabe com um vão entre os pés). */
const TAM_PEGADA = 1.25;

// ------------------------------------------------------------------ desenho das pegadas
/** Os discos de uma pegadinha (pé direito, a ponta em +z): calcanhar, sola e 5 dedinhos. */
const DISCOS: readonly [number, number, number, number][] = [
  [0.0, -0.17, 0.085, 0.1],
  [0.012, 0.03, 0.105, 0.14],
  [-0.07, 0.215, 0.042, 0.048],
  [-0.005, 0.24, 0.032, 0.036],
  [0.048, 0.228, 0.028, 0.032],
  [0.088, 0.2, 0.024, 0.027],
  [0.116, 0.162, 0.02, 0.022],
];

/**
 * A pegada deitada no chão. `camadas`: [escala, altura, cor] de cada camada, de baixo para
 * cima (a borda escura por fora, a clara por dentro). Uma malha só, com a cor nos vértices.
 */
function dadosPegada(camadas: readonly [number, number, Color3][]): VertexData {
  const pos: number[] = [];
  const ind: number[] = [];
  const nor: number[] = [];
  const cor: number[] = [];
  const SEG = 14;
  for (const [esc, y, c] of camadas)
    for (const [cx, cz, rx0, rz0] of DISCOS) {
      // a borda cresce mais nos dedinhos pequenos (o contorno fica do mesmo tamanho)
      const rx = rx0 + (esc - 1) * 0.06;
      const rz = rz0 + (esc - 1) * 0.06;
      const b = pos.length / 3;
      pos.push(cx, y, cz);
      nor.push(0, 1, 0);
      cor.push(c.r, c.g, c.b, 1);
      for (let i = 0; i < SEG; i++) {
        const a = (i / SEG) * Math.PI * 2;
        pos.push(cx + Math.cos(a) * rx, y, cz + Math.sin(a) * rz);
        nor.push(0, 1, 0);
        cor.push(c.r, c.g, c.b, 1);
      }
      for (let i = 0; i < SEG; i++) ind.push(b, b + 1 + ((i + 1) % SEG), b + 1 + i);
    }
  const vd = new VertexData();
  vd.positions = pos;
  vd.indices = ind;
  vd.normals = nor;
  vd.colors = cor;
  return vd;
}

function criarPegadas(scene: Scene) {
  /** Duas malhas (2 chamadas de desenho): a borda (escura por fora, clara por dentro) e a menta. */
  const criar = (nome: string, camadas: readonly [number, number, Color3][], zOffset: number) => {
    const mat = new StandardMaterial(nome, scene);
    mat.disableLighting = true;
    mat.emissiveColor = Color3.White();
    mat.diffuseColor = Color3.White();
    mat.specularColor = Color3.Black();
    mat.backFaceCulling = false;
    mat.zOffset = zOffset;
    const pe = new Mesh(nome, scene);
    dadosPegada(camadas).applyToMesh(pe);
    pe.useVertexColors = true;
    pe.material = mat;
    pe.isPickable = false;
    pe.alwaysSelectAsActiveMesh = true;
    pe.doNotSyncBoundingInfo = true;
    const buf = new Float32Array(MAX_PEGADAS * 16);
    pe.thinInstanceSetBuffer('matrix', buf, 16, false);
    pe.thinInstanceCount = 0;
    pe.setEnabled(false);
    return { pe, buf };
  };
  const borda = criar(
    'guia-pegadas-borda',
    [
      [1.32, 0, Color3.FromHexString('#0b5a4a')],
      [1.16, 0.002, Color3.FromHexString(CREME)],
    ],
    -2,
  );
  const cima = criar('guia-pegadas', [[1, 0.004, Color3.FromHexString(MENTA)]], -3);
  const m = new Matrix();
  const q = new Quaternion();
  const s = new Vector3();
  const p = new Vector3();
  return {
    desenhar(pts: readonly Pegada[], escala: (i: number) => number, ergue: (i: number) => number) {
      const n = Math.min(MAX_PEGADAS, pts.length);
      let k = 0;
      for (let i = 0; i < n; i++) {
        const e = escala(i);
        if (e <= 0.01) continue;
        const [x, y, z, yaw, lado] = pts[i];
        Quaternion.RotationYawPitchRollToRef(yaw, 0, 0, q);
        s.set(e * TAM_PEGADA * lado, 1, e * TAM_PEGADA);
        p.set(x, y + 0.03 + ergue(i), z);
        Matrix.ComposeToRef(s, q, p, m);
        m.copyToArray(cima.buf, k * 16);
        m.copyToArray(borda.buf, k * 16);
        k++;
      }
      for (const c of [cima, borda]) {
        c.pe.thinInstanceCount = k;
        c.pe.thinInstanceBufferUpdated('matrix');
        c.pe.setEnabled(k > 0);
      }
    },
    tirar() {
      for (const c of [cima, borda]) {
        c.pe.thinInstanceCount = 0;
        c.pe.setEnabled(false);
      }
    },
    get n() {
      return cima.pe.isEnabled() ? cima.pe.thinInstanceCount : 0;
    },
  };
}

// ------------------------------------------------------------------ a placa do alvo
/** O desenho (nome da arte, 'item:<id>' ou 'obra:<n>') como imagem. */
export function imagemDaFigura(nome: string): Promise<HTMLImageElement> {
  return new Promise((ok) => {
    const img = new Image();
    img.onload = () => ok(img);
    img.onerror = () => ok(img);
    if (nome.startsWith('obra:')) img.src = desenhoDaObra(Number(nome.slice(5)));
    else if (nome.startsWith('item:')) img.src = iconeDoItem(nome.slice(5));
    else {
      let s = arte(nome);
      if (!s.includes('xmlns')) s = s.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
      img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(s)}`;
    }
  });
}

/** O anel no chão do lugar (o brilho de chegar). */
function criarAnel(scene: Scene) {
  const matAnel = new StandardMaterial('guia-anel', scene);
  matAnel.diffuseColor = Color3.FromHexString(MENTA);
  matAnel.emissiveColor = Color3.FromHexString(MENTA_BRILHO);
  matAnel.specularColor = Color3.Black();
  matAnel.disableLighting = true;
  const anel = MeshBuilder.CreateTorus(
    'guia-anel',
    { diameter: 2, thickness: 0.16, tessellation: 40 },
    scene,
  );
  anel.material = matAnel;
  anel.isPickable = false;
  anel.setEnabled(false);
  return {
    /** k de 0 a 1: o anel abre e some. */
    brilho(x: number, y: number, z: number, k: number) {
      anel.setEnabled(k > 0 && k < 1);
      const ra = 1 + k * 1.6;
      anel.scaling.set(ra, 1, ra);
      anel.position.set(x, y + 0.06, z);
      matAnel.alpha = Math.max(0, 1 - k);
    },
  };
}

/** A placa do alvo na tela (HTML): o desenho num balão com rabinho, no máximo 64 px. */
export const TAM_PLACA = 60;
const CSS_PLACA = `
.guia-placa { position: fixed; left: 0; top: 0; z-index: 6; width: ${TAM_PLACA}px; height: ${TAM_PLACA * 1.2}px; pointer-events: none;
  display: none; will-change: transform; filter: drop-shadow(0 3px 4px rgba(20, 30, 25, 0.35)); }
.guia-placa.mostra { display: block; }
.guia-placa .bola { position: absolute; left: 0; top: 0; width: ${TAM_PLACA}px; height: ${TAM_PLACA}px; border-radius: 50%; box-sizing: border-box;
  background: ${CREME}; border: 5px solid ${MENTA_ESCURA}; box-shadow: 0 0 0 2px ${CREME}; display: grid; place-items: center; }
.guia-placa .bola img { width: 70%; height: 70%; object-fit: contain; }
.guia-placa .rabo { position: absolute; left: 50%; top: ${TAM_PLACA - 4}px; margin-left: -9px; width: 0; height: 0;
  border-left: 9px solid transparent; border-right: 9px solid transparent; border-top: 13px solid ${MENTA_ESCURA}; }
.guia-placa.nasce .bola { animation: guia-placa-nasce 0.5s cubic-bezier(.3,1.5,.5,1); }
@keyframes guia-placa-nasce { from { transform: scale(0.2); } }
@media (prefers-reduced-motion: reduce) { .guia-placa.nasce .bola { animation: none; } }
`;
function criarPlaca() {
  const st = document.createElement('style');
  st.textContent = CSS_PLACA;
  document.head.appendChild(st);
  const el = document.createElement('div');
  el.className = 'guia-placa';
  el.setAttribute('data-guia-placa', '');
  el.setAttribute('aria-hidden', 'true');
  const bola = document.createElement('span');
  bola.className = 'bola';
  const img = document.createElement('img');
  img.alt = '';
  bola.appendChild(img);
  const rabo = document.createElement('span');
  rabo.className = 'rabo';
  el.append(bola, rabo);
  document.body.appendChild(el);
  let figura = '';
  return {
    pintar(nome: string) {
      if (nome === figura) return;
      figura = nome;
      void imagemDaFigura(nome).then((i) => {
        if (figura === nome) img.src = i.src;
      });
      el.classList.remove('nasce');
      void el.offsetWidth;
      el.classList.add('nasce');
    },
    /** Põe a placa no canto de cima (px) ou esconde (null). */
    mostrar(pos: { x: number; y: number } | null) {
      el.classList.toggle('mostra', !!pos);
      if (pos) el.style.transform = `translate(${Math.round(pos.x)}px, ${Math.round(pos.y)}px)`;
    },
    caixa(): { x: number; y: number; w: number; h: number } | null {
      if (!el.classList.contains('mostra')) return null;
      const r = el.getBoundingClientRect();
      return { x: r.left, y: r.top, w: r.width, h: r.height };
    },
    get visivel() {
      return el.classList.contains('mostra');
    },
  };
}

/**
 * As luzinhas de pé: pontinhos verde-água virados para a câmera, a cada 2 blocos nos primeiros
 * ~12 blocos da trilha (leem de longe, quando as pegadas deitadas somem). Atrás de um muro, ou
 * do boneco, elas ficam fraquinhas (35%) em vez de sumir. Duas chamadas de desenho.
 */
export const MAX_LUZES = 7;
function criarLuzes(scene: Scene) {
  const tex = new DynamicTexture('guia-luz', { width: 64, height: 64 }, scene, true);
  tex.hasAlpha = true;
  const g2 = tex.getContext() as CanvasRenderingContext2D;
  const g = g2.createRadialGradient(32, 32, 1, 32, 32, 31);
  g.addColorStop(0, 'rgba(255, 255, 250, 1)');
  g.addColorStop(0.35, 'rgba(150, 245, 220, 1)');
  g.addColorStop(0.62, 'rgba(60, 215, 180, 0.85)');
  g.addColorStop(1, 'rgba(40, 200, 170, 0)');
  g2.fillStyle = g;
  g2.fillRect(0, 0, 64, 64);
  tex.update();
  const criar = (nome: string, oculto: boolean) => {
    const mat = new StandardMaterial(nome, scene);
    mat.diffuseTexture = tex;
    mat.emissiveTexture = tex;
    mat.useAlphaFromDiffuseTexture = true;
    mat.disableLighting = true;
    mat.backFaceCulling = false;
    mat.fogEnabled = false;
    mat.disableDepthWrite = true;
    if (oculto) {
      mat.alpha = 0.35;
      mat.depthFunction = Constants.ALWAYS;
    }
    const q = MeshBuilder.CreatePlane(nome, { size: 1 }, scene);
    q.material = mat;
    q.isPickable = false;
    q.alwaysSelectAsActiveMesh = true;
    q.doNotSyncBoundingInfo = true;
    // o fraquinho primeiro; o de verdade por cima
    q.alphaIndex = oculto ? 1000 : 1001;
    const buf = new Float32Array(MAX_LUZES * 16);
    q.thinInstanceSetBuffer('matrix', buf, 16, false);
    q.thinInstanceCount = 0;
    q.setEnabled(false);
    return { q, buf };
  };
  const fraca = criar('guia-luz-atras', true);
  const forte = criar('guia-luz', false);
  const m = new Matrix();
  const rot = new Quaternion();
  const esc = new Vector3();
  const pos = new Vector3();
  const lixo = new Vector3();
  return {
    /** pts: [x, y (chão), z, escala]. */
    desenhar(pts: readonly [number, number, number, number][]) {
      const cam = scene.activeCamera;
      const n = Math.min(MAX_LUZES, pts.length);
      if (!cam || !n) return this.tirar();
      cam.getWorldMatrix().decompose(lixo, rot, lixo);
      for (let i = 0; i < n; i++) {
        const [x, y, z, e] = pts[i];
        esc.setAll(0.3 * e);
        pos.set(x, y + 0.6, z);
        Matrix.ComposeToRef(esc, rot, pos, m);
        m.copyToArray(forte.buf, i * 16);
        m.copyToArray(fraca.buf, i * 16);
      }
      for (const c of [fraca, forte]) {
        c.q.thinInstanceCount = n;
        c.q.thinInstanceBufferUpdated('matrix');
        c.q.setEnabled(true);
      }
    },
    tirar() {
      for (const c of [fraca, forte]) {
        c.q.thinInstanceCount = 0;
        c.q.setEnabled(false);
      }
    },
    get n() {
      return forte.q.isEnabled() ? forte.q.thinInstanceCount : 0;
    },
  };
}

// ------------------------------------------------------------------ o guia
/** Spec 031: a placa some a esta distância do alvo (blocos): a mãozinha assume. */
export const PLACA_SOME = 4;
/** A trilha à vista começa este tanto adiante do boneco (as de baixo dele, ele tapa). */
export const ADIANTE_DOS_PES = 1.5;
/** As luzinhas: a cada 2 blocos, nos primeiros ~12 da trilha. */
const PASSO_LUZ = 2;
const TRECHO_LUZ = 12;
/** Pegadas por bloco (para a ondinha passar pelas luzinhas no mesmo ritmo). */
const PEGADAS_POR_BLOCO = 2 / PASSO_PAR;

export interface FonteGuia {
  scene: Scene;
  /** Os pés do jogador. */
  pes(): V3;
  bloco(x: number, y: number, z: number): number;
  /**
   * Spec 026: a célula tomada por uma peça que não é bloco (os carros e o rádio da Vila Neon):
   * a trilha dá a volta e nenhuma pegada fica em cima dela.
   */
  peca?(x: number, y: number, z: number): boolean;
  /** O aparelho tem os blocos desta coluna? */
  conhecido(x: number, z: number): boolean;
  /** O mundo para o resolvedor (a cidade, os sítios, os moradores). */
  mundo(): MundoDoGuia;
  /** Onde o ponto do mundo cai na tela (px CSS), ou null (atrás da câmera). */
  tela(x: number, y: number, z: number): { x: number; y: number } | null;
  /** As caixas do HUD à vista (a placa nunca fica em cima delas). */
  caixasHud(): readonly { x: number; y: number; w: number; h: number }[];
  /** A câmera: o olhar de agora, virar sozinha e se a criança está mexendo nela. */
  camera: {
    /** O olhar de agora (yaw e pitch do controle). */
    olhar(): { yaw: number; pitch: number } | null;
    apontar(yaw: number, pitch: number): void;
    mexendo(): boolean;
  };
  /** O guia pode aparecer agora (sem painel por cima, sem modo foto)? */
  pode(): boolean;
}

export interface ApiGuia {
  /** A missão guiada agora (null: nenhuma). */
  missao(): string | null;
  alvo(): { chave: string; x: number; y: number; z: number; figura: string } | null;
  /** A rota inteira (pontos). */
  caminho(): V3[];
  /** As pegadas e as luzinhas à vista. */
  pegadas(): number;
  luzes(): number;
  /** As pegadas à vista agora (x, y, z), para os testes medirem. */
  vistas(): [number, number, number][];
  /** A primeira pegada à vista (para medir a distância dos pés). */
  primeira(): [number, number, number] | null;
  procurando(): boolean;
  /** A criança está no alvo de agora? */
  chegou(): boolean;
  placa(): boolean;
  /** A caixa da placa na tela (px CSS). */
  caixaPlaca(): { x: number; y: number; w: number; h: number } | null;
  /** Quantas vezes a câmera virou sozinha (a medida do "uma vez só"). */
  viradas(): number;
  /** Liga ou desliga a virada (testes que andam pelo controle). */
  virar: boolean;
}

export interface GuiaMissao {
  /** A missão do selinho e os lugares do passeio já vistos (a vista do núcleo). */
  definir(m: Missao | null, vistos: ReadonlySet<string>): void;
  /** Acende de novo: a ondinha forte e a virada macia (o "brincar" e o toque no selinho). */
  chamar(): void;
  /** O alvo de agora e se a criança está nele. */
  alvo(): AlvoGuia | null;
  chegou(): boolean;
  /** Ouve a chegada ao alvo (uma vez por alvo) e a troca do desenho do alvo. */
  aoChegar(f: (a: AlvoGuia) => void): void;
  aoTrocarFigura(f: (figura: string | null) => void): void;
  /** O brilho de chegar no lugar. */
  brilhar(a: AlvoGuia): void;
  /** Onde a placa está na tela (o carimbo e as moedinhas saem dali). */
  telaDoAlvo(): { x: number; y: number } | null;
  api: ApiGuia;
}

export function criarGuiaMissao(f: FonteGuia): GuiaMissao {
  const { scene } = f;
  const pegadas = criarPegadas(scene);
  const luzes = criarLuzes(scene);
  const placa = criarPlaca();
  const anel = criarAnel(scene);

  /** Os blocos para andar: com as peças da Vila Neon (o caminho dá a volta nelas). */
  const bloco = comPecas(
    (x, y, z) => f.bloco(x, y, z),
    f.peca ? (x, y, z) => f.peca!(x, y, z) : null,
  );
  const leitor = (custo?: (x: number, y: number, z: number) => number): LeitorCaminho => ({
    bloco,
    conhecido: (x, z) => f.conhecido(x, z),
    custo,
  });
  const pisa = (x: number, z: number, y: number) => chaoNaColuna(bloco, x, z, y + 1, y - 3);
  /** Na cidade: o que tem do lado (o canteiro de flor, o banco, o poste) custa e é evitado. */
  const temObstaculoDoLado = (x: number, y: number, z: number): boolean => {
    for (const [dx, dz] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ])
      if (ehSolido(bloco(x + dx, y, z + dz))) return true;
    return false;
  };

  let missao: Missao | null = null;
  let vistos: ReadonlySet<string> = new Set();
  let alvo: AlvoGuia | null = null;
  /** A rota inteira (do ponto de onde a busca partiu até o alvo). */
  let rota: V3[] = [];
  /** As pegadas da rota (fixas no mundo) e a distância de cada uma ao longo dela. */
  let marcas: Pegada[] = [];
  let distMarcas: number[] = [];
  let ligacao: { de: V3; marcas: Pegada[]; ate: number } | null = null;
  let vistasAgora: Pegada[] = [];
  let nasceu = 0;
  let forteDesde = -Infinity;
  let busca: { it: Generator<void, Caminho, void>; virar: boolean } | null = null;
  let ultimaBusca = -Infinity;
  let ultimoAlvo = -Infinity;
  let virar: { de: number; para: number; pitch: number; ate: number } | null = null;
  let viradas = 0;
  /** Chegou ao alvo de agora (a trilha some); volta quando ela sai de perto. */
  let chegouLa = false;
  let foraDesde = 0;
  let brilho: { x: number; y: number; z: number; t: number } | null = null;
  let caixas: {
    em: number;
    lista: readonly { x: number; y: number; w: number; h: number }[];
  } | null = null;
  let telaPlaca: { x: number; y: number } | null = null;
  const ouvintes: ((a: AlvoGuia) => void)[] = [];
  const ouvintesFigura: ((fig: string | null) => void)[] = [];
  const agoraS = () => performance.now() / 1000;

  // ---------------------------------------------------------------- a busca
  /** Quem fica parado na rota (o pedreiro na calçada): a trilha passa a 1 bloco dele. */
  function parados(): { x: number; z: number }[] {
    return f
      .mundo()
      .moradores()
      .filter((m) => m.id !== alvo?.morador)
      .map((m) => ({ x: m.x, z: m.z }));
  }
  function longeDeQuem(pts: readonly V3[]): V3[] {
    const quem = parados();
    if (!quem.length) return [...pts];
    return afastarDe(pts, quem, 1.1, (x, z) => {
      const y = Math.floor(pts[0]?.[1] ?? 0);
      return pisa(Math.floor(x), Math.floor(z), y) !== null;
    });
  }
  /** Na cidade: até a calçada pelos blocos e daí pelas calçadas, atravessando na faixa. */
  function* buscaNaCidade(a: AlvoGuia, de: V3): Generator<void, Caminho, void> {
    const p = f.mundo().cidade!;
    const lugar = a.lugar ?? { frente: [a.x, a.z] as [number, number], passos: [] };
    const r = caminhoNaCidade(p, null, [de[0], de[2]], lugar).map((q) => [...q] as V3);
    const custo = (x: number, y: number, z: number) => (temObstaculoDoLado(x, y, z) ? 1.5 : 0);
    if (!r.length) {
      const c = yield* buscarCaminho(leitor(custo), de, [a.x, a.y, a.z]);
      return {
        pts: longeDeQuem(assentar(alisar(c.pts, pisa, temObstaculoDoLado))),
        completo: c.completo,
      };
    }
    let antes: V3[] = [[de[0], de[1], de[2]]];
    if (Math.hypot(r[0][0] - de[0], r[0][2] - de[2]) > LONGE_DA_ROTA) {
      const c = yield* buscarCaminho(leitor(custo), de, r[0]);
      antes = assentar(alisar(c.pts, pisa, temObstaculoDoLado));
    }
    // o começo alisado junto (sem a volta para trás até a calçada), sem pisar no asfalto
    const tudo = [...antes, ...reamostrar(r)];
    const N = Math.min(tudo.length, antes.length + 12);
    const ruim = (x: number, y: number, z: number) =>
      temObstaculoDoLado(x, y, z) || soloDePista(soloDaCidade(p, x + 0.5, z + 0.5));
    const comeco = alisar(tudo.slice(0, N), pisa, ruim);
    return { pts: longeDeQuem([...assentar(comeco), ...tudo.slice(N)]), completo: true };
  }
  /** No sítio: a busca da 021 com a roça e a cerca custando mais, depois alisada. */
  function* buscaNoSitio(a: AlvoGuia, de: V3): Generator<void, Caminho, void> {
    const c = yield* buscarCaminho(leitor(custoNoSitio(bloco)), de, [a.x, a.y, a.z]);
    return {
      pts: longeDeQuem(assentar(alisar(c.pts, pisa, ruimNoSitio(bloco)))),
      completo: c.completo,
    };
  }
  /** Um ponto por bloco e cada um no chão de verdade (as pegadas nunca no ar nem enterradas). */
  function assentar(pts: readonly V3[]): V3[] {
    const r = reamostrar(pts);
    let y = r[0]?.[1] ?? 0;
    for (const q of r) {
      const yy = f.conhecido(q[0], q[2]) ? pisa(Math.floor(q[0]), Math.floor(q[2]), y) : null;
      if (yy !== null) y = yy;
      q[1] = yy ?? q[1];
    }
    return r;
  }

  function comecarBusca(virarAoNascer: boolean): void {
    if (!alvo) return;
    const pes = f.pes();
    const de: V3 = [pes[0], pes[1], pes[2]];
    const naCidade = !!f.mundo().cidade && (!!alvo.lugar || alvo.morador !== undefined);
    busca = {
      it: naCidade ? buscaNaCidade(alvo, de) : buscaNoSitio(alvo, de),
      virar: virarAoNascer,
    };
    ultimaBusca = agoraS();
  }

  function andarBusca(): void {
    if (!busca) return;
    const t0 = performance.now();
    let r: IteratorResult<void, Caminho>;
    do r = busca.it.next();
    while (!r.done && performance.now() - t0 < FATIA_BUSCA);
    if (!r.done) return;
    const virarAgora = busca.virar;
    busca = null;
    rota = r.value.pts;
    marcas = espalharPegadas(rota);
    distMarcas = marcas.map((q) => distanciaNaLinha(rota, q[0], q[2]));
    ligacao = null;
    if (virarAgora) {
      nasceu = agoraS();
      forteDesde = nasceu;
      comecarVirada();
    }
  }

  // ---------------------------------------------------------------- a virada macia
  /** Vira de lado para a trilha uns 6 blocos à frente (só o rumo); nunca com dedo na câmera. */
  function comecarVirada(): void {
    if (!api.virar || f.camera.mexendo() || rota.length < 2) return;
    const cam = f.camera.olhar();
    if (!cam) return;
    const p = f.pes();
    const d0 = distanciaNaLinha(rota, p[0], p[2]);
    const alvoVista = pontoNaLinha(rota, d0 + 6);
    // um pouco de lado (como o pulo da 021): a trilha corre à direita do boneco, que não a tapa
    const para = Math.atan2(alvoVista[0] - p[0], alvoVista[2] - p[2]) - DE_LADO;
    let d = para - cam.yaw;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    // já está olhando para lá: nada de mexer
    if (Math.abs(d) < 0.12) return;
    virar = { de: cam.yaw, para: cam.yaw + d, pitch: cam.pitch, ate: agoraS() + VIRAR_S };
    viradas++;
  }
  function passoVirada(agora: number): void {
    if (!virar) return;
    // a criança pegou a câmera: ela manda
    if (f.camera.mexendo() || agora >= virar.ate) {
      virar = null;
      return;
    }
    const k = 1 - (virar.ate - agora) / VIRAR_S;
    const q = k * k * (3 - 2 * k);
    f.camera.apontar(virar.de + (virar.para - virar.de) * q, virar.pitch);
  }

  // ---------------------------------------------------------------- o alvo
  function resolver(manter: boolean): AlvoGuia | null {
    if (!missao) return null;
    const p = f.pes();
    return alvoDaMissao(
      missao,
      f.mundo(),
      vistos,
      { x: p[0], z: p[2] },
      manter ? (alvo?.chave ?? null) : null,
    );
  }
  function trocarAlvo(novo: AlvoGuia | null, virarAoNascer: boolean): void {
    const figuraAntes = alvo?.figura ?? null;
    alvo = novo;
    rota = [];
    marcas = [];
    distMarcas = [];
    ligacao = null;
    busca = null;
    chegouLa = false;
    pegadas.tirar();
    luzes.tirar();
    placa.mostrar(null);
    if ((novo?.figura ?? null) !== figuraAntes)
      for (const o of ouvintesFigura) o(novo?.figura ?? null);
    if (!novo) return;
    placa.pintar(novo.figura);
    nasceu = agoraS();
    comecarBusca(virarAoNascer);
    andarBusca();
  }

  // ---------------------------------------------------------------- a placa na tela
  function posicionarPlaca(agora: number): void {
    if (!alvo) return placa.mostrar(null);
    // spec 031 (todas as missões): perto do alvo a placa sai e a mãozinha assume (a placa
    // tapava o bolo, a vela e o bicho bem na hora de tocar)
    const pes = f.pes();
    if (Math.hypot(alvo.x - pes[0], alvo.z - pes[2]) < PLACA_SOME || chegouLa) {
      telaPlaca = null;
      return placa.mostrar(null);
    }
    if (!caixas || agora - caixas.em > 0.5) caixas = { em: agora, lista: f.caixasHud() };
    const [x, y, z] = alvo.placa;
    const sobe = alvo.morador !== undefined ? 0.5 : 2.2;
    const t = f.tela(x, y + sobe + Math.sin(agora * 2.4) * 0.12, z);
    telaPlaca = posicaoDaPlaca(t, TAM_PLACA, caixas.lista, innerWidth, innerHeight);
    placa.mostrar(telaPlaca);
  }

  // ---------------------------------------------------------------- a cada quadro
  /** O caminho que a criança vê agora: dos pés (ou da ligação) pela rota até o fim. */
  function desenharTrilha(agora: number, pes: V3): void {
    const perto = pertoNaLinha(rota, pes[0], pes[2]);
    const dPes = distanciaNaLinha(rota, pes[0], pes[2]);
    // fora da rota: um trechinho reto liga os pés à rota, uns 2 blocos adiante
    let ini = dPes + ADIANTE_DOS_PES;
    let comLigacao: Pegada[] = [];
    let linhaLig: V3[] | null = null;
    if (perto.d > 0.6) {
      const ate = Math.min(dPes + 2, comprimento(rota));
      if (!ligacao || Math.hypot(ligacao.de[0] - pes[0], ligacao.de[2] - pes[2]) > 0.3) {
        const j = pontoNaLinha(rota, ate);
        const de: V3 = [pes[0], pes[1], pes[2]];
        linhaLig = [de, j];
        ligacao = { de, marcas: espalharPegadas(linhaLig, ADIANTE_DOS_PES), ate };
      }
      const lig = ligacao;
      const comp = Math.hypot(
        pontoNaLinha(rota, lig.ate)[0] - lig.de[0],
        pontoNaLinha(rota, lig.ate)[2] - lig.de[2],
      );
      comLigacao = lig.marcas;
      ini = lig.ate + Math.max(0, ADIANTE_DOS_PES - comp);
    } else ligacao = null;
    const daRota: Pegada[] = [];
    for (let i = 0; i < marcas.length; i++) if (distMarcas[i] >= ini - 0.05) daRota.push(marcas[i]);
    vistasAgora = [...comLigacao, ...daRota];
    const t = agora - nasceu;
    pegadas.desenhar(
      vistasAgora,
      (i) => {
        const nascer = Math.min(1, Math.max(0, (t * 45 - i) / 4));
        return (1 + 0.35 * ondaNaPegada(i, agora, forteDesde)) * nascer;
      },
      (i) => ondaNaPegada(i, agora, forteDesde) * 0.08,
    );
    // as luzinhas, a cada 2 blocos dos primeiros ~12 (pela ligação e pela rota)
    const pts: [number, number, number, number][] = [];
    const lig = ligacao;
    const ligPts: V3[] | null = lig ? [lig.de, pontoNaLinha(rota, lig.ate)] : null;
    const compLig = ligPts ? comprimento(ligPts) : 0;
    for (
      let sAdiante = ADIANTE_DOS_PES;
      sAdiante <= ADIANTE_DOS_PES + TRECHO_LUZ;
      sAdiante += PASSO_LUZ
    ) {
      let q: V3;
      if (ligPts && sAdiante < compLig) q = pontoNaLinha(ligPts, sAdiante);
      else {
        const u = (lig ? lig.ate - compLig : dPes) + sAdiante;
        if (u > comprimento(rota)) break;
        q = pontoNaLinha(rota, u);
      }
      const i = (sAdiante - ADIANTE_DOS_PES) * PEGADAS_POR_BLOCO;
      const nascer = Math.min(1, Math.max(0, (t * 45 - i) / 4));
      pts.push([q[0], q[1], q[2], (1 + 0.6 * ondaNaPegada(i, agora, forteDesde)) * nascer]);
    }
    luzes.desenhar(pts);
  }

  scene.onBeforeRenderObservable.add(() => {
    const agora = agoraS();
    andarBusca();
    passoVirada(agora);
    if (brilho) {
      const k = (agora - brilho.t) / 1.2;
      anel.brilho(brilho.x, brilho.y, brilho.z, k);
      if (k >= 1) brilho = null;
    }
    if (!missao || !f.pode()) {
      pegadas.tirar();
      luzes.tirar();
      placa.mostrar(null);
      return;
    }
    // o alvo pode mudar sozinho (a lavoura acabou, a padeira andou): confere a cada 1,5 s
    if (agora - ultimoAlvo > 1.5) {
      ultimoAlvo = agora;
      const novo = resolver(true);
      if (!novo || !alvo || novo.chave !== alvo.chave) trocarAlvo(novo, false);
      else if (novo.figura !== alvo.figura) {
        // o mesmo lugar com outro desenho (o milho maduro acabou, sobrou a abóbora)
        alvo.figura = novo.figura;
        placa.pintar(novo.figura);
        for (const o of ouvintesFigura) o(novo.figura);
      } else if (novo.morador !== undefined) {
        // o alvo que anda: a placa vai junto; a trilha refaz depois que ela andou uns metros
        const fim = rota[rota.length - 1];
        alvo = novo;
        if (fim && Math.hypot(fim[0] - novo.x, fim[2] - novo.z) > MORADOR_ANDOU && !busca)
          comecarBusca(false);
      }
    }
    if (!alvo) return;
    const pes = f.pes();
    // chegou: a trilha some (e volta se ela sair de perto)
    const la = chegouAoAlvo(alvo, pes[0], pes[2]);
    if (la && !chegouLa) {
      chegouLa = true;
      for (const o of ouvintes) o(alvo);
    } else if (!la && chegouLa) {
      if (!foraDesde) foraDesde = agora;
      if (agora - foraDesde > 2.5) {
        chegouLa = false;
        foraDesde = 0;
        comecarBusca(false);
      }
    } else foraDesde = 0;
    if (alvo.morador !== undefined) {
      const m = f
        .mundo()
        .moradores()
        .find((q) => q.id === alvo!.morador);
      if (m) alvo.placa = [m.x, m.y + 1.6, m.z];
    }
    posicionarPlaca(agora);
    if (chegouLa || !rota.length) {
      pegadas.tirar();
      luzes.tirar();
      vistasAgora = [];
      return;
    }
    // longe da rota: procura de novo a partir dos pés
    const perto = pertoNaLinha(rota, pes[0], pes[2]);
    if (!busca && perto.d > LONGE_DA_ROTA && agora - ultimaBusca > 0.6) comecarBusca(false);
    desenharTrilha(agora, pes);
  });

  const api: ApiGuia = {
    virar: true,
    missao: () => missao?.id ?? null,
    alvo: () =>
      alvo ? { chave: alvo.chave, x: alvo.x, y: alvo.y, z: alvo.z, figura: alvo.figura } : null,
    caminho: () => rota.map((p) => [...p] as V3),
    pegadas: () => pegadas.n,
    luzes: () => luzes.n,
    vistas: () => vistasAgora.map((q) => [q[0], q[1], q[2]]),
    primeira: () =>
      vistasAgora[0] ? [vistasAgora[0][0], vistasAgora[0][1], vistasAgora[0][2]] : null,
    procurando: () => !!busca,
    chegou: () => chegouLa,
    placa: () => placa.visivel,
    caixaPlaca: () => placa.caixa(),
    viradas: () => viradas,
  };

  return {
    definir(m, v) {
      const mudouMissao = (m?.id ?? null) !== (missao?.id ?? null);
      const mudouVistos = [...v].join() !== [...vistos].join();
      missao = m;
      vistos = new Set(v);
      if (mudouMissao) {
        trocarAlvo(m ? resolver(false) : null, false);
        return;
      }
      // o passeio: um lugar foi visto, a trilha pula para o próximo (sem virar a câmera)
      if (mudouVistos && m) {
        const novo = resolver(false);
        if (!novo || novo.chave !== alvo?.chave) trocarAlvo(novo, false);
      }
    },
    chamar() {
      if (!missao) return;
      if (!alvo) trocarAlvo(resolver(false), true);
      else if (busca) busca.virar = true;
      else if (!rota.length || chegouLa) {
        chegouLa = false;
        comecarBusca(true);
        andarBusca();
      } else {
        forteDesde = agoraS();
        comecarVirada();
      }
    },
    alvo: () => alvo,
    chegou: () => chegouLa,
    aoChegar: (fn) => void ouvintes.push(fn),
    aoTrocarFigura: (fn) => void ouvintesFigura.push(fn),
    brilhar(a) {
      brilho = { x: a.x, y: a.y, z: a.z, t: agoraS() };
    },
    telaDoAlvo: () => {
      if (telaPlaca) return { x: telaPlaca.x + TAM_PLACA / 2, y: telaPlaca.y + TAM_PLACA / 2 };
      // a placa saiu (perto do alvo): o ✓ e as moedinhas saem do próprio lugar
      if (!alvo) return null;
      const [x, y, z] = alvo.placa;
      return f.tela(x, y + (alvo.morador !== undefined ? 0 : 1.2), z);
    },
    api,
  };
}
