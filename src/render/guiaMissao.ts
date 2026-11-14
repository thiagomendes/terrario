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
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import '@babylonjs/core/Meshes/thinInstanceMesh';
import type { Scene } from '@babylonjs/core/scene';
import type { Missao } from '../jogo/alma';
import {
  buscarCaminho,
  chaoNaColuna,
  type Caminho,
  type LeitorCaminho,
  type V3,
} from '../jogo/caminho';
import {
  MAX_PEGADAS,
  PASSO_PEGADA,
  alisar,
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
/** Saiu da rota mais que isto (blocos): procura de novo a partir dos pés. */
const LONGE_DA_ROTA = 2.5;
/** O morador (c5) andou mais que isto do fim da trilha: refaz. */
const MORADOR_ANDOU = 4;
/** Tamanho da pegada. */
const TAM_PEGADA = 1.8;

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
      [1.75, 0, Color3.FromHexString('#0b5a4a')],
      [1.42, 0.002, Color3.FromHexString(CREME)],
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

/** A placa do alvo (o desenho da missão num balão) e o anel no chão (o brilho de chegar). */
function criarPlaca(scene: Scene) {
  const tex = new DynamicTexture('guia-placa', { width: 256, height: 320 }, scene, true);
  tex.hasAlpha = true;
  const mat = new StandardMaterial('guia-placa', scene);
  mat.diffuseTexture = tex;
  mat.emissiveTexture = tex;
  mat.useAlphaFromDiffuseTexture = true;
  mat.disableLighting = true;
  mat.backFaceCulling = false;
  // a névoa da distância apagava a placa: ela tem que ser viva de longe
  mat.fogEnabled = false;
  const placa = MeshBuilder.CreatePlane('guia-placa', { width: 1, height: 1.25 }, scene);
  placa.material = mat;
  placa.billboardMode = Mesh.BILLBOARDMODE_ALL;
  placa.isPickable = false;
  // por cima de tudo: vista atrás dos prédios também
  placa.renderingGroupId = 1;
  placa.setEnabled(false);

  const matAnel = new StandardMaterial('guia-anel', scene);
  matAnel.diffuseColor = Color3.FromHexString(MENTA);
  matAnel.emissiveColor = Color3.FromHexString(MENTA_BRILHO);
  matAnel.specularColor = Color3.Black();
  matAnel.disableLighting = true;
  const anel = MeshBuilder.CreateTorus('guia-anel', { diameter: 2, thickness: 0.16, tessellation: 40 }, scene);
  anel.material = matAnel;
  anel.isPickable = false;
  anel.setEnabled(false);

  let figura = '';
  let pronta = false;
  async function pintar(nome: string) {
    if (nome === figura) return;
    figura = nome;
    pronta = false;
    const img = await imagemDaFigura(nome);
    if (figura !== nome) return;
    const c = tex.getContext() as CanvasRenderingContext2D;
    c.clearRect(0, 0, 256, 320);
    // o rabinho para baixo ("é aqui")
    c.beginPath();
    c.moveTo(98, 226);
    c.lineTo(128, 300);
    c.lineTo(158, 226);
    c.closePath();
    c.fillStyle = MENTA_ESCURA;
    c.fill();
    c.beginPath();
    c.arc(128, 128, 118, 0, Math.PI * 2);
    c.fillStyle = MENTA_ESCURA;
    c.fill();
    c.beginPath();
    c.arc(128, 128, 104, 0, Math.PI * 2);
    c.fillStyle = CREME;
    c.fill();
    const lado = 150;
    const r = Math.min(lado / (img.width || 1), lado / (img.height || 1));
    const w = (img.width || 1) * r;
    const h = (img.height || 1) * r;
    try {
      c.drawImage(img, 128 - w / 2, 128 - h / 2, w, h);
    } catch {
      // imagem estragada: a placa fica só com o balão
    }
    tex.update();
    pronta = true;
  }
  return {
    pintar,
    mostrar(x: number, y: number, z: number, agora: number, cam: Vector3, nasceu: number, apagar: number) {
      const d = Math.hypot(cam.x - x, cam.y - y, cam.z - z);
      // nunca pequena demais de longe, nem enorme de perto
      const base = Math.min(16, Math.max(1.8, d * 0.2));
      const nasce = Math.min(1, (agora - nasceu) / 0.5);
      const pop = nasce < 1 ? 1 + Math.sin(nasce * Math.PI) * 0.25 : 1;
      const s = base * pop * (1 - apagar);
      placa.setEnabled(pronta && s > 0.02);
      placa.scaling.set(s, s, s);
      placa.position.set(x, y + 2.6 + s * 0.6 + Math.sin(agora * 2.4) * 0.18, z);
    },
    /** O brilho de chegar: o anel abre no chão do lugar (k de 0 a 1). */
    brilho(x: number, y: number, z: number, k: number) {
      anel.setEnabled(k > 0 && k < 1);
      const ra = 1 + k * 1.6;
      anel.scaling.set(ra, 1, ra);
      anel.position.set(x, y + 0.06, z);
      matAnel.alpha = Math.max(0, 1 - k);
    },
    tirar() {
      placa.setEnabled(false);
      anel.setEnabled(false);
    },
    get visivel() {
      return placa.isEnabled();
    },
  };
}

// ------------------------------------------------------------------ o guia
export interface FonteGuia {
  scene: Scene;
  /** Os pés do jogador. */
  pes(): V3;
  bloco(x: number, y: number, z: number): number;
  /** O aparelho tem os blocos desta coluna? */
  conhecido(x: number, z: number): boolean;
  /** O mundo para o resolvedor (a cidade, os sítios, os moradores). */
  mundo(): MundoDoGuia;
  /** A câmera: posição, pivô, apontar e se a criança está mexendo nela agora. */
  camera: {
    /** O olhar de agora (yaw e pitch do controle; pitch positivo olha para baixo). */
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
  /** A rota inteira (pontos) e as pegadas à vista. */
  caminho(): V3[];
  pegadas(): number;
  /** A primeira pegada à vista (para medir a distância dos pés). */
  primeira(): [number, number, number] | null;
  procurando(): boolean;
  placa(): boolean;
  /** Quantas vezes a câmera virou sozinha (a medida do "uma vez só"). */
  viradas(): number;
  /** Quando a trilha nasceu (performance.now, ms) e quando foi pedida. */
  tempos(): { pedida: number; nasceu: number };
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
  /** Ouve a chegada ao alvo (uma vez por alvo). */
  aoChegar(f: (a: AlvoGuia) => void): void;
  /** O brilho de chegar no lugar. */
  brilhar(a: AlvoGuia): void;
  api: ApiGuia;
}

export function criarGuiaMissao(f: FonteGuia): GuiaMissao {
  const { scene } = f;
  const pegadas = criarPegadas(scene);
  const placa = criarPlaca(scene);

  const leitor = (custo?: (x: number, y: number, z: number) => number): LeitorCaminho => ({
    bloco: (x, y, z) => f.bloco(x, y, z),
    conhecido: (x, z) => f.conhecido(x, z),
    custo,
  });

  let missao: Missao | null = null;
  let vistos: ReadonlySet<string> = new Set();
  let alvo: AlvoGuia | null = null;
  /** A rota inteira (do ponto de onde a busca partiu até o alvo). */
  let rota: V3[] = [];
  /** As pegadas da rota (fixas no mundo) e as do trechinho de ligação até os pés. */
  let marcas: Pegada[] = [];
  let ligacao: Pegada[] = [];
  let ligacaoDe: V3 | null = null;
  let nasceu = 0;
  let forteDesde = -Infinity;
  let busca: { it: Generator<void, Caminho, void>; virar: boolean } | null = null;
  let ultimaBusca = -Infinity;
  let ultimoAlvo = -Infinity;
  let virar: { de: number; para: number; pDe: number; ate: number } | null = null;
  let viradas = 0;
  let pedida = 0;
  let nasceuMs = 0;
  /** Chegou ao alvo de agora (o rastro some); volta quando ela sai de perto. */
  let chegouLa = false;
  let foraDesde = 0;
  let brilho: { x: number; y: number; z: number; t: number } | null = null;
  const ouvintes: ((a: AlvoGuia) => void)[] = [];
  const agoraS = () => performance.now() / 1000;

  // ---------------------------------------------------------------- a busca
  /** Na cidade: até a calçada pelos blocos e daí pelas calçadas, atravessando na faixa. */
  function* buscaNaCidade(a: AlvoGuia, de: V3): Generator<void, Caminho, void> {
    const p = f.mundo().cidade!;
    const lugar = a.lugar ?? { frente: [a.x, a.z] as [number, number], passos: [] };
    const r = caminhoNaCidade(p, null, [de[0], de[2]], lugar).map((q) => [...q] as V3);
    if (!r.length) return yield* buscarCaminho(leitor(), de, [a.x, a.y, a.z]);
    let antes: V3[] = [[de[0], de[1], de[2]]];
    if (Math.hypot(r[0][0] - de[0], r[0][2] - de[2]) > LONGE_DA_ROTA) {
      const c = yield* buscarCaminho(leitor(), de, r[0]);
      antes = alisarNaCidade(c.pts);
    }
    return { pts: [...antes, ...reamostrar(r)], completo: true };
  }
  /** Na cidade, o trecho até a calçada pelos blocos: alisado do mesmo jeito (sem escada). */
  function alisarNaCidade(pts: readonly V3[]): V3[] {
    const pisa = (x: number, z: number, y: number) => chaoNaColuna(f.bloco, x, z, y + 1, y - 3);
    return assentar(alisar(pts, pisa, () => false));
  }
  /** No sítio: a busca da 021 com a roça e a cerca custando mais, depois alisada. */
  function* buscaNoSitio(a: AlvoGuia, de: V3): Generator<void, Caminho, void> {
    const c = yield* buscarCaminho(leitor(custoNoSitio(f.bloco)), de, [a.x, a.y, a.z]);
    const pisa = (x: number, z: number, y: number) => chaoNaColuna(f.bloco, x, z, y + 1, y - 3);
    return { pts: assentar(alisar(c.pts, pisa, ruimNoSitio(f.bloco))), completo: c.completo };
  }
  /** Um ponto por bloco e cada um no chão de verdade (as pegadas nunca no ar nem enterradas). */
  function assentar(pts: readonly V3[]): V3[] {
    const r = reamostrar(pts);
    let y = r[0]?.[1] ?? 0;
    for (const q of r) {
      const yy = f.conhecido(q[0], q[2])
        ? chaoNaColuna(f.bloco, Math.floor(q[0]), Math.floor(q[2]), y + 1, y - 3)
        : null;
      if (yy !== null) y = yy;
      q[1] = yy ?? q[1];
    }
    return r;
  }

  function comecarBusca(virarAoNascer: boolean): void {
    if (!alvo) return;
    const pes = f.pes();
    const de: V3 = [pes[0], pes[1], pes[2]];
    const naCidade = !!f.mundo().cidade && (alvo.lugar || alvo.morador !== undefined);
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
    ligacao = [];
    ligacaoDe = null;
    if (!nasceuMs) nasceuMs = performance.now();
    if (virarAgora) {
      nasceu = agoraS();
      forteDesde = nasceu;
      comecarVirada();
    }
  }

  // ---------------------------------------------------------------- a virada macia
  /** Vira para as pegadas uns 6 blocos à frente; nunca com a criança mexendo na câmera. */
  function comecarVirada(): void {
    if (!api.virar || f.camera.mexendo() || marcas.length < 5) return;
    const cam = f.camera.olhar();
    if (!cam) return;
    const p = f.pes();
    const alvoVista = marcas[Math.min(marcas.length - 1, 8)];
    const para = Math.atan2(alvoVista[0] - p[0], alvoVista[2] - p[2]);
    let d = para - cam.yaw;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    // já está olhando para lá: nada de mexer
    if (Math.abs(d) < 0.25) return;
    virar = { de: cam.yaw, para: cam.yaw + d, pDe: cam.pitch, ate: agoraS() + VIRAR_S };
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
    // o olhar desce de leve para as pegadas aparecerem na frente do boneco (nunca de cima)
    const pitch = virar.pDe + (Math.max(0.45, Math.min(0.6, virar.pDe)) - virar.pDe) * q;
    f.camera.apontar(virar.de + (virar.para - virar.de) * q, pitch);
  }

  // ---------------------------------------------------------------- o alvo
  function resolver(manter: boolean): AlvoGuia | null {
    if (!missao) return null;
    const p = f.pes();
    return alvoDaMissao(missao, f.mundo(), vistos, { x: p[0], z: p[2] }, manter ? (alvo?.chave ?? null) : null);
  }
  function trocarAlvo(novo: AlvoGuia | null, virarAoNascer: boolean): void {
    alvo = novo;
    rota = [];
    marcas = [];
    ligacao = [];
    busca = null;
    chegouLa = false;
    pegadas.tirar();
    placa.tirar();
    if (!novo) return;
    void placa.pintar(novo.figura);
    nasceu = agoraS();
    comecarBusca(virarAoNascer);
    andarBusca();
  }

  // ---------------------------------------------------------------- a cada quadro
  scene.onBeforeRenderObservable.add(() => {
    const agora = agoraS();
    andarBusca();
    passoVirada(agora);
    if (brilho) {
      const k = (agora - brilho.t) / 1.2;
      placa.brilho(brilho.x, brilho.y, brilho.z, k);
      if (k >= 1) brilho = null;
    }
    if (!missao || !f.pode()) {
      pegadas.tirar();
      placa.tirar();
      return;
    }
    // o alvo pode mudar sozinho (a lavoura acabou, a padeira andou): confere a cada 1,5 s
    if (agora - ultimoAlvo > 1.5) {
      ultimoAlvo = agora;
      const novo = resolver(true);
      if (!novo || !alvo || novo.chave !== alvo.chave) trocarAlvo(novo, false);
      else if (novo.morador !== undefined) {
        // o alvo que anda: a placa vai junto; a trilha refaz depois que ela andou uns metros
        const fim = rota[rota.length - 1];
        alvo = novo;
        if (fim && Math.hypot(fim[0] - novo.x, fim[2] - novo.z) > MORADOR_ANDOU && !busca) comecarBusca(false);
      }
    }
    if (!alvo) return;
    const pes = f.pes();
    // chegou: o rastro some (e volta se ela sair de perto)
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
    const cam = scene.activeCamera?.globalPosition ?? Vector3.ZeroReadOnly;
    if (alvo.morador !== undefined) {
      const m = f.mundo().moradores().find((q) => q.id === alvo!.morador);
      if (m) alvo.placa = [m.x, m.y + 1.6, m.z];
    }
    placa.mostrar(alvo.placa[0], alvo.placa[1], alvo.placa[2], agora, cam as Vector3, nasceu, 0);
    if (chegouLa || !marcas.length) {
      pegadas.tirar();
      return;
    }
    // onde ela está na rota; longe dela, procura de novo (a trilha sempre nasce nos pés)
    const perto = pertoNaLinha(rota, pes[0], pes[2]);
    if (!busca && perto.d > LONGE_DA_ROTA && agora - ultimaBusca > 0.6) comecarBusca(false);
    // a primeira pegada da rota que está adiante dela
    let i0 = 0;
    {
      let d = 0;
      for (let k = 1; k <= perto.i && k < rota.length; k++)
        d += Math.hypot(rota[k][0] - rota[k - 1][0], rota[k][2] - rota[k - 1][2]);
      const b = rota[Math.min(rota.length - 1, perto.i + 1)];
      d += Math.hypot(b[0] - rota[perto.i][0], b[2] - rota[perto.i][2]) * perto.k;
      // as pegadas da rota a cada PASSO_PEGADA, a primeira em 0,45: a primeira adiante dela
      i0 = Math.max(0, Math.ceil((d - 0.45) / PASSO_PEGADA));
    }
    // o trechinho de ligação (fora da rota): refeito só quando ela se mexe
    if (perto.d > 0.6) {
      if (!ligacaoDe || Math.hypot(ligacaoDe[0] - pes[0], ligacaoDe[2] - pes[2]) > 0.3) {
        ligacaoDe = [pes[0], pes[1], pes[2]];
        const alvoL = marcas[Math.min(marcas.length - 1, i0)];
        ligacao = espalharPegadas([ligacaoDe, [alvoL[0], alvoL[1], alvoL[2]]], 0.4).slice(0, -1);
      }
    } else {
      ligacao = [];
      ligacaoDe = null;
    }
    const vistas = [...ligacao, ...marcas.slice(i0)];
    const t = agora - nasceu;
    pegadas.desenhar(
      vistas,
      (i) => {
        // nascem dos pés para a frente
        const nascer = Math.min(1, Math.max(0, (t * 45 - i) / 4));
        return (1 + 0.4 * ondaNaPegada(i, agora, forteDesde)) * nascer;
      },
      (i) => ondaNaPegada(i, agora, forteDesde) * 0.1,
    );
    primeira = vistas[0] ? [vistas[0][0], vistas[0][1], vistas[0][2]] : null;
  });
  let primeira: [number, number, number] | null = null;

  const api: ApiGuia = {
    virar: true,
    missao: () => missao?.id ?? null,
    alvo: () => (alvo ? { chave: alvo.chave, x: alvo.x, y: alvo.y, z: alvo.z, figura: alvo.figura } : null),
    caminho: () => rota.map((p) => [...p] as V3),
    pegadas: () => pegadas.n,
    primeira: () => primeira,
    procurando: () => !!busca,
    placa: () => placa.visivel,
    viradas: () => viradas,
    tempos: () => ({ pedida, nasceu: nasceuMs }),
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
      pedida = performance.now();
      nasceuMs = 0;
      if (!missao) return;
      if (!alvo) trocarAlvo(resolver(false), true);
      else if (busca) busca.virar = true;
      else if (!marcas.length || chegouLa) {
        chegouLa = false;
        comecarBusca(true);
        andarBusca();
      } else {
        nasceuMs = performance.now();
        forteDesde = agoraS();
        comecarVirada();
      }
    },
    alvo: () => alvo,
    chegou: () => chegouLa,
    aoChegar: (fn) => void ouvintes.push(fn),
    brilhar(a) {
      brilho = { x: a.x, y: a.y, z: a.z, t: agoraS() };
    },
    api,
  };
}
