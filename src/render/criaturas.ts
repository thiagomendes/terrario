import '@babylonjs/core/Rendering/outlineRenderer';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { FresnelParameters } from '@babylonjs/core/Materials/fresnelParameters';
import { Constants } from '@babylonjs/core/Engines/constants';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { Matrix, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer';
import type { Plane } from '@babylonjs/core/Maths/math.plane';
import type { Scene } from '@babylonjs/core/scene';
import type { Criatura } from '../jogo/criaturas';
import type { PecaCriatura } from '../temas/tipos';
import { povoadoDoTema, tema } from '../temas/ativo';
import { caixaArredondada, criarPlasticos, esfera, segmentosDaBolinha, segmentosDeLonge } from './formas';
// spec 026: o teclado de pendurar da tecladista, desenhado com as ferramentas das peças da vila
import { Ref, type Desenho } from './vila/ref';
import { Pecas } from './solidos';
import type { PecaVila } from '../world/vilaNeon';
import { bichoDeBrinquedo, type PecaBicho } from './bichoBrinquedo';
import { encaixarBicho } from './encaixeBicho';
import {
  aberturaDoPasso,
  ergueDaPata,
  alturaDoQuadril,
  juntasDoBicho,
  passoSemDeslizar,
} from './juntasBicho';
import { criarBoneco } from './boneco';
import { planoBoneco, type PlanoBoneco } from '../personagem/boneco';
import { moradorDeBrinquedo } from './moradorBoneco';
import { generoDoMorador } from '../temas/nomes';
import type { Profissao } from '../world/povoado';
import { criarAnimador } from '../player/animacao';
import type { Pose } from '../personagem/poses';
// spec 015 (gestos): o morador acena de volta; o balão fica em cima da cabeça
import { fazerGesto, gestoDoAnimador, type IdGesto } from '../personagem/gestos';
import { criarBalao, type BalaoGesto } from './balaoGesto';
import type { Personagem } from './personagem';

type Peca = PecaBicho;

/**
 * Bicho a mais de tantos blocos da câmera vira uma malha por material (o plástico e o brilho
 * dos olhos), na pose de descanso: corta os desenhos de cada perna, cabeça e cauda. Em
 * terceira pessoa o sítio inteiro entra na vista, por isso começa já a 18 blocos (de lá as
 * pernas mal aparecem). Volta inteiro a LONGE_VOLTA.
 */
export const LONGE_LOD = 18;
export const LONGE_VOLTA = 16;
/** Quantos bichos montam a malha de longe por quadro (sem engasgo quando muitos chegam). */
export const LONGE_POR_QUADRO = 1;
/** Spec 017: bonecos de morador novos por quadro (o povoado aparece sem travar). */
export const MORADORES_POR_QUADRO = 1;
/** Raio da esfera do morador no teste de vista (corpo, braço esticado e o balão do gesto). */
export const RAIO_VISTA_MORADOR = 3;
/**
 * Auditoria 017: um aceno do servidor para um morador ainda na fila de montar espera por ele
 * até aqui (segundos); mais velho que isso, o aceno já passou e é esquecido.
 */
export const VALIDADE_GESTO_PENDENTE = 2;
const MAXIMO_PLANOS = 200;

interface Modelo {
  raiz: TransformNode;
  /** Uma parte por grupo que se mexe junto (corpo, cabeça, cada perna...), já fundida. */
  partes: {
    no: TransformNode;
    malhas: Mesh[];
    papel: Peca['papel'];
    base: Vector3;
    /** Spec 027 (T22): as peças da parte (a malha de longe sai delas, com menos gomos). */
    fontes: { peca: PecaBicho; classe: 'plastico' | 'suave' | 'forte' }[];
  }[];
  /** Material do plástico deste bicho (a luz do lugar escurece só ele). */
  plastico: StandardMaterial;
  /** Materiais próprios (descartados com o bicho). */
  proprios: StandardMaterial[];
  fase: number;
  /** Fase do abano do rabo (acumulada: mudar a rapidez não faz o rabo dar um pulo de fase). */
  faseRabo: number;
  /** Posição no quadro anterior: as pernas seguem o deslocamento real, não o desejado. */
  ultX: number;
  ultZ: number;
  /** Rapidez real suavizada e amplitude atual do balanço das pernas. */
  vel: number;
  amp: number;
  /** Altura do quadril (a perna mais comprida): dá o ritmo do passo sem deslizar (014c). */
  quadril: number;
  /** Rumo no quadro anterior e a rapidez de giro suavizada (rad/s): vira dando passinhos. */
  ultYaw: number;
  giro: number;
  /** Para onde a cabeça olha (rad), suavizado: puxa a curva e olha em volta parado. */
  olhar: number;
  /** Giro das rodas (bicho de rodinha), separado do ritmo das patas. */
  roda: number;
  /** 1 parado, 0 andando (suavizado): a respiração e o olhar em volta só parado. */
  parado: number;
  /** Último quadro em que a criatura estava na lista (para descartar os modelos órfãos). */
  quadro: number;
  /**
   * Longe da câmera (spec 015): o plástico do bicho inteiro numa malha só, parado na pose de
   * descanso (um desenho em vez de um por perna). Feita na primeira vez que ele fica longe.
   */
  longe?: Mesh[] | null;
  emLonge?: boolean;
  /** Materiais que a malha de longe substitui (plástico e brilho dos olhos). */
  substitui: Set<StandardMaterial>;
}

/** Cores reutilizadas: nada de alocar Color3 por parte a cada quadro. */
const COR_FERIDA = new Color3(1, 0.15, 0.1);
const coresBase = new Map<string, Color3>();
function corBase(hex: string): Color3 {
  let c = coresBase.get(hex);
  if (!c) {
    c = Color3.FromHexString(hex);
    coresBase.set(hex, c);
  }
  return c;
}

/**
 * As peças do bicho de brinquedo já encaixadas (014c, o padrão da 017: pata enterrada no
 * corpo, rabo e asas encostados), feitas uma vez por desenho do tema.
 */
const encaixados = new WeakMap<readonly PecaCriatura[], PecaBicho[]>();
const encaixadosNoite = new WeakMap<readonly PecaCriatura[], PecaBicho[]>();
export function pecasEncaixadas(desenho: readonly PecaCriatura[], noite: boolean): PecaBicho[] {
  const guarda = noite ? encaixadosNoite : encaixados;
  let r = guarda.get(desenho);
  if (!r) {
    // a criatura da noite: plástico pastel e cabeção (assusta pouco, é brinquedo)
    const pecas = bichoDeBrinquedo(desenho, noite ? { pastel: 0.32, cabeca: 1.45 } : {});
    r = encaixarBicho(pecas, juntasDoBicho, ergueDaPata);
    guarda.set(desenho, r);
  }
  return r;
}

export function criarRenderCriaturas(
  scene: Scene,
  excluirDoGlow: (m: Mesh) => void,
  incluirNoGlow: (m: Mesh) => void,
  /**
   * Spec 026: a malha não brilha, mas tapa o brilho do que fica atrás dela (o corpo de quem
   * segura uma peça de neon de verdade: a tecladista e o vocalista na frente dela).
   */
  taparOGlow: (m: Mesh) => void = excluirDoGlow,
) {
  const modelos = new Map<number, Modelo>();
  /**
   * Spec 014 (T08): a criatura da noite mansa (o guaxinim da cidade, a coruja do Rancho) é um
   * bicho de brinquedo, não um fantasma: perto da luz ela encolhe e some, mas nunca fica
   * meio transparente (só o espectro que assusta se desfaz em bruma).
   */
  const translucida = (tipo: string) =>
    tipo === 'espectro' && tema().mundo.noite !== 'mansa' && tema().mundo.noite !== 'devagar';
  /** Moradores de brinquedo: o boneco B com as cores e peças do tema (spec 012, A2). */
  const moradores = new Map<
    number,
    {
      boneco: Personagem;
      animador: ReturnType<typeof criarAnimador>;
      /** Spec 015: balão do gesto (criado no primeiro aceno). */
      balao?: BalaoGesto;
      /** Spec 026: o bastão de luz na mão (a turma do show). */
      bastao?: Mesh | null;
      /** Spec 026: o bastão é o microfone do vocalista (sempre na mão). */
      microfone?: boolean;
      /** Spec 026: o teclado de pendurar da tecladista (só aparece quando ela toca nele). */
      keytar?: Mesh[] | null;
      /** Spec 027: o tamanho do boneco (o Bento, o grandão da festa). */
      escala: number;
      ultX: number;
      ultZ: number;
      vel: number;
      quadro: number;
      /** Malhas do boneco (fixas: o morador não troca de roupa nem de item na mão). */
      malhas: Mesh[];
      /** Spec 027 (T22): o boneco de longe já foi montado (as malhas dele entram em `malhas`). */
      longeFeito?: boolean;
      /** O corpo dele tapa o brilho (quem segura o microfone ou o teclado). */
      tapa?: boolean;
      ferido: boolean;
      luz: number;
      /** A opacidade já passada ao que ele leva fora do boneco (o bastão, o teclado, o balão). */
      opacidadeLeva?: number;
    }
  >();
  /**
   * Desempenho (spec 013, sítio com curral e moradores): quem está atrás da câmera e longe
   * não precisa mexer as juntas neste quadro (ninguém vê; a posição continua indo). Uma
   * margem larga em volta do campo de visão e da câmera evita qualquer diferença na tela.
   */
  const frente = new Vector3();
  let camX = 0;
  let camY = 0;
  let camZ = 0;
  function prepararVista(): void {
    const cam = scene.activeCamera;
    if (!cam) return;
    cam.getDirectionToRef(Vector3.Forward(), frente);
    const p = cam.globalPosition;
    camX = p.x;
    camY = p.y;
    camZ = p.z;
  }
  function foraDaVista(x: number, y: number, z: number): boolean {
    if (!scene.activeCamera) return false;
    const dx = x - camX;
    const dy = y - camY;
    const dz = z - camZ;
    const d = Math.hypot(dx, dy, dz);
    // perto (sombra, braço que aparece de lado) e tudo à frente até ~115°: desenha
    return d > 8 && (dx * frente.x + dy * frente.y + dz * frente.z) / d < -0.42;
  }
  /**
   * Ninguém pisca (spec 026, dono, 16 nov 2026: "a turma some na frente da gente"): quem chega
   * entra crescendo e quem sai do mundo de repente (o núcleo tira quando acha que ninguém vê,
   * mas não conhece a câmera) encolhe até sumir, em vez de aparecer e desaparecer de um quadro
   * para o outro. Quem se desfaz do jeito de sempre (o bicho da noite, o fim de uma vida) já
   * chega pequeno e some como antes.
   */
  const ENTRADA_S = 0.3;
  const SAIDA_S = 0.3;
  const nascendo = new Map<number, number>();
  const saindo = new Map<number, { t: number; x: number; y: number; z: number }>();
  /** O tamanho de quem acabou de chegar (de 0,3 a 1, macio); 1 para quem já estava. */
  function crescer(id: number, dt: number): number {
    const t0 = nascendo.get(id);
    if (t0 === undefined) return 1;
    const t = dt > 0 ? t0 + dt / ENTRADA_S : 1;
    if (t >= 1) {
      nascendo.delete(id);
      return 1;
    }
    nascendo.set(id, t);
    return 0.3 + 0.7 * t * (2 - t);
  }
  /** Quem saiu da lista encolhe mais um pouco; devolve se ainda está encolhendo. */
  function encolher(id: number, raiz: TransformNode, dt: number): boolean {
    let g = saindo.get(id);
    if (!g) {
      const s = raiz.scaling;
      // já se desfez (pequeno) ou o relógio está parado: some na hora, como sempre
      if (s.x < 0.35 || dt <= 0) return false;
      g = { t: 0, x: s.x, y: s.y, z: s.z };
      saindo.set(id, g);
    }
    g.t += dt / SAIDA_S;
    if (g.t >= 1) {
      saindo.delete(id);
      return false;
    }
    const f = (1 - g.t) * (1 - g.t);
    raiz.scaling.set(g.x * f, g.y * f, g.z * f);
    return true;
  }
  /**
   * Desempenho (spec 014, T11: a praça da cidade com 12 moradores): o boneco do morador entra
   * ou sai da vista inteiro, por uma esfera em volta dele (com folga para o balão e o braço
   * esticado), no lugar de cada peça passar pelo teste e refazer a caixa a cada quadro.
   * Fora da vista ele não é desenhado; na vista, é igual a antes.
   */
  const centroVista = new Vector3();
  function naVista(planos: readonly Plane[], x: number, y: number, z: number): boolean {
    centroVista.set(x, y, z);
    for (const p of planos) if (p.dotCoordinate(centroVista) <= -RAIO_VISTA_MORADOR) return false;
    return true;
  }
  // logo antes de a cena escolher o que desenha, com a vista que ela vai usar (a da câmera do
  // quadro, mesmo se alguém a mexeu depois da lógica: modo foto, câmeras dos testes)
  scene.onBeforeActiveMeshesEvaluationObservable.add(() => {
    const planos = scene.frustumPlanes;
    if (!planos?.length) return;
    for (const mb of moradores.values()) {
      const r = mb.boneco.raiz;
      const ver = naVista(planos, r.position.x, r.position.y + 1, r.position.z);
      if (r.isEnabled(false) !== ver) r.setEnabled(ver);
    }
  });
  /**
   * Planos de morador já encaixados (spec 017): o mesmo morador (tema, profissão e boneco)
   * encaixa os enfeites uma vez só; quem sai da vista e volta não refaz a conta.
   */
  const planosFeitos = new Map<string, PlanoBoneco>();
  /** Spec 026: a cor do bastão de luz na mão do morador (null: mão vazia). */
  let luzNaMaoDeMorador: ((povoado: string, n: number) => string | null) | null = null;
  /** Spec 026: o bastão aparece agora (a noite do show)? */
  let mostrarLuzNaMao: () => boolean = () => false;
  const matsBastao = new Map<string, { tubo: StandardMaterial; halo: StandardMaterial }>();
  /**
   * O bastão de luz (spec 026): um tubinho de neon preso no ponto de pega da mão direita, ao
   * longo do braço (com o braço para o alto, ele aponta para o céu).
   *
   * A luz dele é uma casquinha em volta do tubo (somada à cena, forte no meio e sumindo na
   * beira), e não o brilho da cena (dono, 16 nov 2026: "o bastão aparece através do corpo"): os
   * bonecos ficam fora do mapa do brilho, então nada ali tapava o bastão, e a luz dele era
   * somada por cima de quem estava na frente. A casquinha é desenhada na cena, com a
   * profundidade de sempre: o corpo (o dele e o dos outros) tapa o bastão e a luz dele.
   */
  function montarBastao(boneco: Personagem, cor: string, id: number): Mesh | null {
    const pega = boneco.raiz.getChildTransformNodes(false).find((n) => n.name.endsWith('-pega'));
    if (!pega) return null;
    let mat = matsBastao.get(cor);
    if (!mat) {
      const neon = Color3.FromHexString(cor);
      // o tubo: a cor puxada para o branco (o miolo quente de uma lâmpada de neon)
      const tubo = new StandardMaterial(`morador-bastao-${cor}`, scene);
      tubo.disableLighting = true;
      tubo.diffuseColor = Color3.Black();
      tubo.specularColor = Color3.Black();
      tubo.emissiveColor = Color3.Lerp(neon, Color3.White(), 0.45);
      // a casquinha de luz: a cor do neon, cheia de frente e nada na beira
      const halo = new StandardMaterial(`morador-bastao-halo-${cor}`, scene);
      halo.disableLighting = true;
      halo.diffuseColor = Color3.Black();
      halo.specularColor = Color3.Black();
      halo.emissiveColor = neon;
      halo.alpha = 0.02;
      halo.alphaMode = Constants.ALPHA_ADD;
      halo.disableDepthWrite = true;
      const beira = new FresnelParameters();
      beira.leftColor = Color3.Black();
      beira.rightColor = new Color3(0.5, 0.5, 0.5);
      beira.bias = 0;
      beira.power = 3;
      halo.opacityFresnelParameters = beira;
      mat = { tubo, halo };
      matsBastao.set(cor, mat);
    }
    const m = MeshBuilder.CreateCylinder(
      `morador-${id}-bastao`,
      { height: 0.42, diameter: 0.075, tessellation: 10 },
      scene,
    );
    m.material = mat.tubo;
    m.parent = pega;
    m.position.set(0, -0.15, 0.05);
    m.rotation.x = 0.35;
    m.isPickable = false;
    excluirDoGlow(m);
    const halo = MeshBuilder.CreateCapsule(
      `morador-${id}-bastao-halo`,
      { height: 0.56, radius: 0.09, tessellation: 12, capSubdivisions: 4 },
      scene,
    );
    halo.material = mat.halo;
    halo.parent = m;
    halo.isPickable = false;
    excluirDoGlow(halo);
    m.setEnabled(false);
    return m;
  }
  /**
   * O microfone do vocalista da Vila Neon (spec 026, o show de verdade): o cabo grafite e a
   * cabeça de cromo na mão direita, sempre na mão (ele canta, cumprimenta e passa o som).
   */
  let matMicro: StandardMaterial | null = null;
  let matMicroCabeca: StandardMaterial | null = null;
  function montarMicrofone(boneco: Personagem, id: number): Mesh | null {
    const pega = boneco.raiz.getChildTransformNodes(false).find((n) => n.name.endsWith('-pega'));
    if (!pega) return null;
    if (!matMicro) {
      matMicro = new StandardMaterial('morador-microfone', scene);
      matMicro.diffuseColor = Color3.FromHexString('#24232a');
      matMicro.specularColor = new Color3(0.25, 0.25, 0.25);
      matMicroCabeca = new StandardMaterial('morador-microfone-cabeca', scene);
      matMicroCabeca.diffuseColor = Color3.FromHexString('#c8ccd6');
      matMicroCabeca.emissiveColor = new Color3(0.18, 0.18, 0.2);
      matMicroCabeca.specularColor = new Color3(0.6, 0.6, 0.6);
    }
    const cabo = MeshBuilder.CreateCylinder(
      `morador-${id}-microfone`,
      { height: 0.26, diameterTop: 0.08, diameterBottom: 0.055, tessellation: 8 },
      scene,
    );
    cabo.material = matMicro;
    cabo.parent = pega;
    cabo.position.set(0, -0.06, 0.04);
    cabo.rotation.x = 0.35;
    const cabeca = MeshBuilder.CreateSphere(
      `morador-${id}-microfone-cabeca`,
      { diameter: 0.13, segments: 6 },
      scene,
    );
    cabeca.material = matMicroCabeca;
    cabeca.parent = cabo;
    cabeca.position.set(0, 0.16, 0);
    for (const m of [cabo, cabeca]) {
      m.isPickable = false;
      excluirDoGlow(m);
    }
    return cabo;
  }
  /**
   * O teclado de pendurar da tecladista da Vila Neon (spec 026, o último refrão da segunda
   * música): desenho nosso, de blocos (nada de silhueta de marca). O corpo verde-água comprido e
   * fino, atravessado na frente do corpo dela (a ponta da direita mais baixa), com as teclas
   * brancas e pretas em cima, a barbatana embaixo da ponta, os botõezinhos e o friso de neon
   * amarelo; o braço grafite subindo para a esquerda (a mão esquerda segura nele), com a tira de
   * tocar e a cabeça verde-água; e a correia grafite que cruza o peito e sobe pelo ombro
   * esquerdo. Preso no tronco (vai junto quando ela balança); as mãos da pose `keytar`
   * (`vila/banda.ts`) caem no braço e nas teclas. Duas malhas (o plástico e o neon).
   */
  let plasticoKeytar: ReturnType<typeof criarPlasticos> | null = null;
  let matNeonKeytar: StandardMaterial | null = null;
  function montarKeytar(boneco: Personagem, id: number): Mesh[] | null {
    const tronco = boneco.raiz
      .getChildTransformNodes(false)
      .find((n) => n.name.endsWith('-junta-tronco'));
    if (!tronco) return null;
    if (!plasticoKeytar) {
      plasticoKeytar = criarPlasticos(scene, 'morador-keytar');
      matNeonKeytar = new StandardMaterial('morador-keytar-neon', scene);
      matNeonKeytar.disableLighting = true;
      matNeonKeytar.diffuseColor = Color3.Black();
      matNeonKeytar.specularColor = Color3.Black();
      matNeonKeytar.emissiveColor = Color3.FromHexString('#ffe14a');
    }
    // o referencial do teclado: x ao longo do corpo (para a direita dela), y para cima dele, z
    // para a frente; o meio do corpo no tronco (medidas do plano do boneco, antes da escala)
    const GIRO = 0.38;
    const MEIO: [number, number, number] = [0.08, 0.15, 0.235];
    const d: Desenho = {
      corpo: new Pecas(),
      luz: new Pecas(),
      noite: new Pecas(),
      vidro: new Pecas(),
      quadros: [],
      ox: 0,
      oz: 0,
      chao: 0,
      recorte: { x0: -Infinity, z0: -Infinity, x1: Infinity, z1: Infinity },
    };
    const r = new Ref(d, { tipo: 'banco', x: 0, y: 0, z: 0, dir: 0 } as PecaVila);
    const VERDE = '#1fbfae';
    const VERDE_FUNDO = '#138a7f';
    const GRAFITE = '#2b2a33';
    // o corpo, a barbatana embaixo da ponta da direita e o friso de neon embaixo da frente
    r.caixa(0.4, 0.13, 0.055, 0, -0.065, 0, VERDE, 0.022);
    r.caixa(0.13, 0.06, 0.05, 0.13, -0.115, 0, VERDE_FUNDO, 0.018);
    r.luz(0.34, 0.018, 0.012, -0.015, -0.058, 0.031, '#ffe14a');
    // as teclas: as brancas (com o risquinho entre elas) e as pretas, na beira de cima da frente
    r.caixa(0.3, 0.05, 0.014, -0.02, 0.004, 0.033, '#f4f4f0', 0.004);
    for (let i = 1; i < 10; i++)
      r.caixa(0.004, 0.05, 0.004, -0.17 + i * 0.03, 0.004, 0.041, '#9aa0ac', 0);
    for (let i = 0; i < 9; i++) {
      if (i % 7 === 2 || i % 7 === 6) continue;
      r.caixa(0.016, 0.026, 0.008, -0.14 + i * 0.03, 0.028, 0.043, GRAFITE, 0.002);
    }
    // os botõezinhos na ponta da direita
    for (let i = 0; i < 3; i++)
      r.caixa(
        0.022,
        0.022,
        0.01,
        0.155 + (i % 2) * 0.028,
        -0.04 + i * 0.028,
        0.031,
        i === 1 ? '#ffe14a' : '#f4f4f0',
        0.004,
      );
    // o braço (sobe para a esquerda), a tira de tocar e a cabeça
    r.caixa(0.27, 0.055, 0.045, -0.33, -0.0275, 0, GRAFITE, 0.015);
    r.caixa(0.17, 0.018, 0.006, -0.34, -0.009, 0.025, '#c8ccd6', 0.002);
    r.caixa(0.07, 0.095, 0.052, -0.495, -0.05, 0, VERDE, 0.018);
    r.caixa(0.03, 0.03, 0.01, -0.495, 0.0, 0.028, '#ffe14a', 0.006);
    // a correia: da ponta da direita, cruzando o peito até o ombro esquerdo, por cima dele e
    // descendo pelas costas (pontos do tronco levados para o referencial do teclado)
    const cg = Math.cos(GIRO);
    const sg = Math.sin(GIRO);
    const local = (x: number, y: number, z: number): [number, number, number] => {
      const dx = x - MEIO[0];
      const dy = y - MEIO[1];
      return [dx * cg - dy * sg, dx * sg + dy * cg, z - MEIO[2]];
    };
    const correia: [number, number, number][] = [
      local(0.27, 0.12, 0.222),
      local(-0.14, 0.43, 0.222),
      local(-0.14, 0.448, 0),
      local(-0.14, 0.43, -0.205),
      local(0.22, 0.06, -0.205),
    ];
    for (let i = 0; i + 1 < correia.length; i++) r.barra(correia[i], correia[i + 1], 0.03, GRAFITE);
    const corpo = new Mesh(`morador-${id}-keytar`, scene);
    d.corpo.juntar().applyToMesh(corpo);
    corpo.material = plasticoKeytar.corVertice(0.35) ?? plasticoKeytar.cor('#ffffff', 0.35);
    const neon = new Mesh(`morador-${id}-keytar-neon`, scene);
    d.luz.juntar().applyToMesh(neon);
    neon.material = matNeonKeytar;
    for (const m of [corpo, neon]) {
      m.parent = tronco;
      m.position.set(MEIO[0], MEIO[1], MEIO[2]);
      m.rotation.z = -GIRO;
      m.isPickable = false;
      m.setEnabled(false);
    }
    // (o corpo do teclado tapa o friso de neon de quem olha por trás)
    taparOGlow(corpo);
    incluirNoGlow(neon);
    return [corpo, neon];
  }
  function prepararMorador(c: Criatura) {
    const prof = c.morador?.profissao ?? 'construtor';
    // spec 026: o morador de posto com roupa própria (o vocalista, a dançarina, o patinador)
    const fixo = c.morador
      ? povoadoDoTema().porMorador?.[`${c.morador.povoado}:${c.morador.n}`]
      : undefined;
    const acessorio = fixo ? fixo.acessorio : povoadoDoTema().acessorios?.[prof];
    const m = moradorDeBrinquedo(
      fixo?.pecas ?? povoadoDoTema().moradores[prof],
      c.id,
      c.morador ? generoDoMorador(c.morador.povoado, c.morador.n, prof) : undefined,
      acessorio,
      fixo ? fixo.fantasia : povoadoDoTema().fantasias?.[prof],
      fixo?.cabelo,
      fixo?.rosto,
    );
    const chave = `${tema().id}|${prof}|${fixo && c.morador ? `${c.morador.povoado}:${c.morador.n}` : ''}|${acessorio ?? ''}|${JSON.stringify(m.aparencia)}`;
    // spec 027: o tamanho do boneco (o Bento, o grandão da festa)
    return { m, chave, escala: fixo?.escala ?? 1 };
  }
  /** O plano encaixado do morador (feito agora, ou o guardado). */
  function planoDoMorador(prep: ReturnType<typeof prepararMorador>, p?: PlanoBoneco) {
    let feito = planosFeitos.get(prep.chave);
    if (!feito) {
      feito = prep.m.ajustar(p ?? planoBoneco(prep.m.aparencia));
      if (planosFeitos.size >= MAXIMO_PLANOS) planosFeitos.clear();
      planosFeitos.set(prep.chave, feito);
    }
    return feito;
  }
  /**
   * O brilho de cada malha do morador: só a lanterna e o que o tema marcou como brilhante entram
   * no brilho; o corpo de quem segura o microfone ou o teclado tapa o brilho (`tapa`).
   */
  function brilhoDoMorador(malha: Mesh, tapa: boolean): void {
    const mat = malha.material as StandardMaterial | null;
    if (mat && mat.emissiveColor.r + mat.emissiveColor.g + mat.emissiveColor.b > 1.6) incluirNoGlow(malha);
    else if (tapa) taparOGlow(malha);
    else excluirDoGlow(malha);
    malha.isPickable = false;
  }

  function montarMorador(c: Criatura, prep = prepararMorador(c)) {
    const m = prep.m;
    const ajustar = (p: PlanoBoneco) => planoDoMorador(prep, p);
    // spec 014 (T11): as peças não passam pelo teste de vista uma por uma (o boneco inteiro
    // passa, em `naVistaDoQuadro`) nem refazem a caixa a cada quadro
    // spec 026: com esqueleto (o público de 40 no show cabe no celular)
    const boneco = criarBoneco(scene, m.aparencia, `morador-${c.id}`, ajustar, true, true, true);
    // spec 026: o bastão de luz na mão de quem da turma do show tem um (só aparece no show)
    const corLuz = c.morador && luzNaMaoDeMorador?.(c.morador.povoado, c.morador.n);
    // a tecladista (o friso de neon do teclado de pendurar brilha de verdade) e o vocalista, que
    // canta na frente dela: o corpo dos dois tapa esse brilho (visto por trás e pela frente)
    // spec 027 (portão da T24): na festa, os lampiões da rua e das paredes acendem atrás dos
    // moradores; fora do mapa do brilho, o halo deles passava por cima da cabeça como um véu
    // branco. Lá o corpo de todo morador tapa o brilho do que fica atrás
    const tapa =
      corLuz === 'microfone' || !!corLuz?.startsWith('keytar') || tema().id === 'noite-das-fantasias';
    for (const malha of boneco.raiz.getChildMeshes()) brilhoDoMorador(malha as Mesh, tapa);
    // ('microfone': o vocalista do show segura o microfone, sempre)
    const microfone = corLuz === 'microfone';
    // ('keytar…': a tecladista tem o teclado de pendurar, que aparece só quando ela toca nele)
    const keytar = corLuz?.startsWith('keytar') ? montarKeytar(boneco, c.id) : null;
    const bastao = microfone
      ? montarMicrofone(boneco, c.id)
      : corLuz && !keytar
        ? montarBastao(boneco, corLuz, c.id)
        : null;
    return {
      boneco,
      bastao,
      microfone,
      keytar,
      escala: prep.escala,
      animador: criarAnimador(),
      ultX: c.x,
      ultZ: c.z,
      vel: 0,
      quadro: 0,
      malhas: boneco.raiz.getChildMeshes() as Mesh[],
      ferido: false,
      luz: -1,
      /** Spec 027 (T22): o boneco de longe já foi montado. */
      longeFeito: false,
      tapa,
    };
  }
  let quadro = 0;
  /** Segundos somados dos quadros (relógio dos acenos pendentes). */
  let relogio = 0;
  /** Auditoria 017: acenos para moradores que ainda não têm boneco (tocam quando ele sai). */
  const gestosPendentes = new Map<number, { g: IdGesto; quando: number }>();

  /**
   * O bicho longe numa malha por material (plástico e brilho dos olhos), na pose de
   * descanso, juntas no espaço da raiz. O que brilha de verdade continua nas partes.
   */
  function montarLonge(m: Modelo): Mesh[] | null {
    const giros = m.partes.map((p) => p.no.rotation.clone());
    const lugares = m.partes.map((p) => p.no.position.clone());
    for (const p of m.partes) {
      p.no.rotation.setAll(0);
      p.no.position.copyFrom(p.base);
    }
    const inversa = Matrix.Invert(m.raiz.computeWorldMatrix(true));
    const porMaterial = new Map<StandardMaterial, Mesh[]>();
    // (spec 027, T22: de longe as bolinhas saem com menos gomos, pelo tamanho; o bicho a mais de
    // 18 blocos tem uns poucos pixels por bolinha, e os bichos da festa somavam 10 a 20 mil
    // triângulos cada um na malha de longe)
    const [plastico, suave] = [...m.substitui];
    for (const p of m.partes) {
      p.no.computeWorldMatrix(true);
      let k = 0;
      for (const { peca, classe } of p.fontes) {
        if (classe === 'forte') continue;
        const mat = classe === 'plastico' ? plastico : suave;
        const [w, h, d] = peca.t;
        const maior = Math.max(w, h, d);
        const nome = `${p.no.name}-longe${k++}`;
        const copia =
          peca.forma === 'bola'
            ? esfera(nome, scene, maior / 2, mat, [w / maior, h / maior, d / maior], segmentosDeLonge(maior / 2))
            : caixaArredondada(nome, scene, w, h, d, peca.raio, mat, 2);
        copia.parent = p.no;
        copia.position.set(peca.p[0] - p.base.x, peca.p[1] - p.base.y, peca.p[2] - p.base.z);
        if (peca.rot) copia.rotation.set(peca.rot[0], peca.rot[1], peca.rot[2]);
        const cor = corBase(peca.cor);
        const nv = copia.getTotalVertices();
        const cores = new Float32Array(nv * 4);
        for (let q = 0; q < nv; q++) cores.set([cor.r, cor.g, cor.b, 1], q * 4);
        copia.setVerticesData(VertexBuffer.ColorKind, cores);
        const mundo = copia.computeWorldMatrix(true).multiply(inversa);
        copia.parent = null;
        copia.position.setAll(0);
        copia.rotation.setAll(0);
        copia.rotationQuaternion = null;
        copia.scaling.setAll(1);
        copia.makeGeometryUnique();
        copia.bakeTransformIntoVertices(mundo);
        let l = porMaterial.get(mat);
        if (!l) porMaterial.set(mat, (l = []));
        l.push(copia);
      }
    }
    m.partes.forEach((p, i) => {
      p.no.rotation.copyFrom(giros[i]);
      p.no.position.copyFrom(lugares[i]);
    });
    const feitas: Mesh[] = [];
    for (const [mat, copias] of porMaterial) {
      const f =
        copias.length === 1
          ? copias[0]
          : Mesh.MergeMeshes(copias, true, true, undefined, false, false);
      if (!f) {
        for (const c of copias) c.dispose();
        for (const c of feitas) c.dispose();
        return null;
      }
      f.name = `${m.raiz.name}-longe`;
      f.material = mat;
      f.parent = m.raiz;
      f.isPickable = false;
      excluirDoGlow(f);
      feitas.push(f);
    }
    return feitas.length ? feitas : null;
  }

  /** Malhas de longe montadas neste quadro (o resto espera o próximo). */
  let montadasNoQuadro = 0;
  /** Bonecos de morador montados neste quadro (spec 017). */
  let moradoresNoQuadro = 0;
  /** Troca entre o bicho inteiro (perto) e as malhas de longe, com folga para não piscar. */
  function escolherLonge(m: Modelo, x: number, y: number, z: number): void {
    const d = Math.hypot(x - camX, y - camY, z - camZ);
    const quer = m.emLonge ? d > LONGE_VOLTA : d > LONGE_LOD;
    if (quer === !!m.emLonge) return;
    if (quer && m.longe === undefined) {
      if (montadasNoQuadro >= LONGE_POR_QUADRO) return;
      montadasNoQuadro++;
      m.longe = montarLonge(m);
    }
    if (quer && !m.longe) return;
    m.emLonge = quer;
    if (m.longe) for (const f of m.longe) f.setEnabled(quer);
    for (const p of m.partes)
      for (const malha of p.malhas)
        if (m.substitui.has(malha.material as StandardMaterial)) malha.setEnabled(!quer);
  }

  function montar(c: Criatura): Modelo {
    const raiz = new TransformNode(`criatura-${c.id}`, scene);
    // bicho de brinquedo: cabeça maior, olhos de bolinha com brilho, patas de cápsula (A3)
    const pecas = pecasEncaixadas(
      c.tipo === 'morador'
        ? povoadoDoTema().moradores[c.morador?.profissao ?? 'construtor']
        : tema().criaturas[c.tipo],
      c.tipo === 'espectro',
    );
    // desempenho (spec 012): as peças que se mexem juntas viram uma malha só, com a cor nos
    // vértices; cada bicho desenhava uma malha por peça (o dobro de chamadas com os bichos novos)
    const plastico = new StandardMaterial(`criatura-${c.id}-plastico`, scene);
    plastico.diffuseColor = new Color3(0.78, 0.78, 0.78);
    plastico.specularColor = new Color3(0.22, 0.22, 0.22);
    plastico.specularPower = 40;
    plastico.ambientColor = Color3.White();
    plastico.emissiveColor = new Color3(0.36, 0.36, 0.36);
    const suave = new StandardMaterial(`criatura-${c.id}-suave`, scene);
    suave.diffuseColor = new Color3(0.78, 0.78, 0.78);
    suave.specularColor = new Color3(0.22, 0.22, 0.22);
    suave.specularPower = 40;
    suave.emissiveColor = new Color3(0.45, 0.45, 0.45);
    const forte = suave.clone(`criatura-${c.id}-forte`);
    forte.emissiveColor = new Color3(0.55, 0.55, 0.55);
    // as juntas: cada pata gira inteira do quadril, o rabo da base, a cabeça do pescoço (014c)
    const grupos = juntasDoBicho(pecas);
    let n = 0;
    const partes = grupos.map((g) => {
      const no = new TransformNode(`criatura-${c.id}-g${n++}`, scene);
      no.parent = raiz;
      no.position.set(g.pivo[0], g.pivo[1], g.pivo[2]);
      const porClasse: Record<'plastico' | 'suave' | 'forte', Mesh[]> = {
        plastico: [],
        suave: [],
        forte: [],
      };
      const fontes: Modelo['partes'][number]['fontes'] = [];
      for (const peca of g.pecas) {
        const [w, h, d] = peca.t;
        const maior = Math.max(w, h, d);
        const nome = `criatura-${c.id}-p${n++}`;
        // (spec 027, T22: os gomos pelo tamanho da bolinha, como nos moradores da 026, mas nunca
        // menos de 7: o bicho de perto continua redondo; os bichos da festa passavam de 20 mil
        // triângulos cada um)
        const malha =
          peca.forma === 'bola'
            ? esfera(nome, scene, maior / 2, plastico, [w / maior, h / maior, d / maior], Math.max(7, segmentosDaBolinha(maior / 2)))
            : caixaArredondada(nome, scene, w, h, d, peca.raio, plastico, 3);
        malha.position.set(peca.p[0] - g.pivo[0], peca.p[1] - g.pivo[1], peca.p[2] - g.pivo[2]);
        if (peca.rot) malha.rotation.set(peca.rot[0], peca.rot[1], peca.rot[2]);
        const cor = corBase(peca.cor);
        const nv = malha.getTotalVertices();
        const cores = new Float32Array(nv * 4);
        for (let k = 0; k < nv; k++) cores.set([cor.r, cor.g, cor.b, 1], k * 4);
        malha.setVerticesData(VertexBuffer.ColorKind, cores);
        const b = peca.brilho ?? 0;
        const classe = b > 0.45 ? 'forte' : b > 0 ? 'suave' : 'plastico';
        porClasse[classe].push(malha);
        fontes.push({ peca, classe });
      }
      const malhas: Mesh[] = [];
      for (const [classe, lista] of Object.entries(porClasse) as [
        'plastico' | 'suave' | 'forte',
        Mesh[],
      ][]) {
        if (!lista.length) continue;
        const fundida =
          lista.length === 1
            ? lista[0]
            : Mesh.MergeMeshes(lista, true, true, undefined, false, false);
        if (!fundida) continue;
        fundida.parent = no;
        fundida.material = classe === 'plastico' ? plastico : classe === 'suave' ? suave : forte;
        fundida.isPickable = false;
        if (classe === 'forte') incluirNoGlow(fundida);
        else excluirDoGlow(fundida);
        malhas.push(fundida);
      }
      return { no, malhas, papel: g.papel, base: no.position.clone(), fontes };
    });
    return {
      raiz,
      partes,
      plastico,
      proprios: [plastico, suave, forte],
      substitui: new Set([plastico, suave]),
      fase: 0,
      faseRabo: c.id,
      ultX: c.x,
      ultZ: c.z,
      vel: 0,
      amp: 0,
      quadro: 0,
      quadril: alturaDoQuadril(grupos),
      ultYaw: c.yaw ?? 0,
      giro: 0,
      olhar: 0,
      roda: 0,
      parado: 1,
    };
  }

  function descartarModelo(m: Modelo): void {
    for (const p of m.partes) {
      for (const malha of p.malhas) malha.dispose();
      p.no.dispose();
    }
    if (m.longe) for (const f of m.longe) f.dispose();
    for (const mat of m.proprios) mat.dispose();
    m.raiz.dispose();
  }

  type BonecoMorador = NonNullable<ReturnType<typeof moradores.get>>;
  function acenar(mb: BonecoMorador, g: IdGesto): void {
    fazerGesto(mb.animador, g);
    // o balão do morador fica atrás das paredes (o de dentro de casa não aparece)
    (mb.balao ??= criarBalao(scene, mb.boneco.raiz, undefined, false)).mostrar(g);
  }

  /** Spec 026: a pose do show por cima da do morador (null fora da Vila Neon). */
  let poseDeMorador:
    | ((povoado: string, n: number, pose: Pose, onde: { x: number; z: number }) => Pose)
    | null = null;
  /** Spec 026: o giro fixo do morador (a banda de frente para a plateia no show), ou null. */
  let giroDeMorador:
    | ((povoado: string, n: number, onde: { x: number; z: number }) => number | null)
    | null = null;
  /** Spec 026 (parte 2): o lugar do morador levado por um brinquedo, ou null. */
  let lugarDeMorador:
    | ((povoado: string, n: number) => { x: number; y: number; z: number; yaw: number } | null)
    | null = null;
  /**
   * Spec 026 (parte 3): a opacidade do morador pelo lugar dele (dentro da Casa anos 80 quem fica
   * colado na câmera, ou entre ela e a criança, some devagar); null: sempre inteiro.
   */
  let opacidadeDeMorador: ((id: number, x: number, y: number, z: number) => number) | null =
    null;
  let proximaEstatua = -1;
  /**
   * Estátuas da vitrine por lugar: a nova no mesmo lugar descarta a de antes (auditoria 017:
   * o boneco do morador parado ficava para sempre na cena).
   */
  const estatuas = new Map<string, () => void>();
  return {
    /** Modelo parado de uma criatura (vitrine dos testes): o mesmo desenho do jogo. */
    estatua(
      tipo: Criatura['tipo'],
      x: number,
      y: number,
      z: number,
      yaw: number,
      /** Morador da vitrine: a profissão e o número dele no povoado (sorteia o boneco). */
      morador?: { profissao: Profissao; n: number },
    ): void {
      const c = {
        id: proximaEstatua--,
        tipo,
        x,
        z,
        ...(morador && { morador: { povoado: 'vitrine', ...morador } }),
      } as Criatura;
      const lugar = `${x},${y},${z}`;
      estatuas.get(lugar)?.();
      if (tipo === 'morador') {
        // o morador é o boneco do jogador com as peças do tema (como no povoado), parado
        const mb = montarMorador(c);
        const pose = mb.animador.atualizar(0, {
          velocidadeHoriz: 0,
          correndo: false,
          noChao: true,
          voando: false,
        });
        mb.boneco.aplicarPose(pose, { dt: 0, olhar: 0, vista: mb.animador.vista() });
        mb.boneco.posicionar(x, y, z, yaw);
        mb.boneco.definirLuz(1);
        estatuas.set(lugar, () => mb.boneco.descartar());
        return;
      }
      const m = montar(c);
      m.raiz.position.set(x, y, z);
      m.raiz.rotation.y = yaw;
      estatuas.set(lugar, () => descartarModelo(m));
    },
    /**
     * Spec 015: o morador acena (o boneco toca o gesto e o balão aparece). O morador que ainda
     * espera na fila de montar acena quando o boneco dele sair (auditoria 017); devolve se
     * acenou agora.
     */
    gesto(id: number, g: IdGesto): boolean {
      const mb = moradores.get(id);
      if (!mb) {
        gestosPendentes.set(id, { g, quando: relogio });
        return false;
      }
      acenar(mb, g);
      return true;
    },
    /**
     * Spec 032: o boneco e o animador de um morador à vista (a vendedora que entrega o lanche:
     * o braço esticado e o lanche na mão); null se ele ainda não tem boneco.
     */
    bonecoDoMorador(id: number): { boneco: Personagem; animador: ReturnType<typeof criarAnimador> } | null {
      const mb = moradores.get(id);
      return mb ? { boneco: mb.boneco, animador: mb.animador } : null;
    },
    /**
     * Spec 027 (T19): uma cópia do boneco de um morador de posto, só desta tela (a Lulu escondida
     * da n3, que só quem procura vê). O dono da cópia posiciona, anima e descarta.
     */
    copiaDoMorador(
      povoado: string,
      n: number,
      profissao: Profissao,
    ): { boneco: Personagem; animador: ReturnType<typeof criarAnimador> } {
      const falsa = { id: 900_000 + n, x: 0, y: 0, z: 0, morador: { povoado, n, profissao } } as unknown as Criatura;
      const mb = montarMorador(falsa);
      return { boneco: mb.boneco, animador: mb.animador };
    },
    /**
     * Spec 026: uma pose por cima da do morador (a banda no Show da Vila); null tira.
     */
    /**
     * Spec 026: quem da turma do show segura um bastão de luz (a cor, ou null) e quando ele
     * aparece (a noite do show).
     */
    definirLuzNaMao(
      cor: (povoado: string, n: number) => string | null,
      mostrar: () => boolean,
    ): void {
      luzNaMaoDeMorador = cor;
      mostrarLuzNaMao = mostrar;
    },
    /** Spec 026 (parte 3): a opacidade do morador pelo lugar dele (null: sempre inteiro). */
    definirOpacidadeDeMorador(
      f: ((id: number, x: number, y: number, z: number) => number) | null,
    ): void {
      opacidadeDeMorador = f;
    },
    definirPoseDeMorador(
      f: ((povoado: string, n: number, pose: Pose, onde: { x: number; z: number }) => Pose) | null,
      giro:
        | ((povoado: string, n: number, onde: { x: number; z: number }) => number | null)
        | null = null,
    ): void {
      poseDeMorador = f;
      giroDeMorador = giro;
    },
    /**
     * Spec 026 (parte 2): onde fica na tela o morador levado por um brinquedo (o piloto do
     * bate-bate no carrinho dele), ou null (o lugar é o da criatura).
     */
    definirLugarDeMorador(
      f:
        | ((povoado: string, n: number) => { x: number; y: number; z: number; yaw: number } | null)
        | null,
    ): void {
      lugarDeMorador = f;
    },
    /** Spec 015: gesto em curso e balão de cada morador desenhado (testes). */
    gestosMoradores(): { id: number; gesto: IdGesto | null; balao: IdGesto | null }[] {
      return [...moradores].map(([id, mb]) => ({
        id,
        gesto: gestoDoAnimador(mb.animador),
        balao: mb.balao?.gesto ?? null,
      }));
    },
    atualizar(
      lista: readonly Criatura[],
      dt: number,
      tempo: number,
      luz: (c: Criatura) => number,
    ): void {
      quadro++;
      relogio += dt;
      montadasNoQuadro = 0;
      moradoresNoQuadro = 0;
      prepararVista();
      for (const c of lista) {
        if (c.tipo === 'morador') {
          let mb = moradores.get(c.id);
          if (!mb) {
            // um boneco novo por quadro: o povoado que aparece não trava a tela (os outros
            // moradores entram nos quadros seguintes, uma fração de segundo depois)
            if (moradoresNoQuadro >= MORADORES_POR_QUADRO) continue;
            moradoresNoQuadro++;
            // primeiro o encaixe dos enfeites (num quadro), depois as malhas (no seguinte)
            const prep = prepararMorador(c);
            if (!planosFeitos.has(prep.chave)) {
              planoDoMorador(prep);
              continue;
            }
            mb = montarMorador(c, prep);
            moradores.set(c.id, mb);
            nascendo.set(c.id, 0);
            const pendente = gestosPendentes.get(c.id);
            if (pendente) {
              gestosPendentes.delete(c.id);
              if (relogio - pendente.quando <= VALIDADE_GESTO_PENDENTE) acenar(mb, pendente.g);
            }
          }
          mb.quadro = quadro;
          const desloc = Math.hypot(c.x - mb.ultX, c.z - mb.ultZ);
          mb.ultX = c.x;
          mb.ultZ = c.z;
          const velReal = dt > 0 && desloc < 2 ? desloc / dt : 0;
          mb.vel += (velReal - mb.vel) * Math.min(1, dt * 10);
          // spec 026 (parte 2): o morador levado por um brinquedo (o piloto do bate-bate) fica
          // onde o carrinho está na tela, sentado (não é andar)
          const levado =
            lugarDeMorador && c.morador ? lugarDeMorador(c.morador.povoado, c.morador.n) : null;
          const poseBase = mb.animador.atualizar(dt, {
            velocidadeHoriz: levado ? 0 : mb.vel,
            correndo: c.estado === 'fugir',
            noChao: c.noChao,
            voando: false,
          });
          // spec 026: a banda da Vila Neon bate cabeça no tempo do show (sem balão de gesto)
          const pose =
            poseDeMorador && c.morador
              ? poseDeMorador(c.morador.povoado, c.morador.n, poseBase, c)
              : poseBase;
          // o animador anda sempre (o passo segue de onde estava); as juntas só na vista
          if (!foraDaVista(c.x, c.y + 1, c.z))
            mb.boneco.aplicarPose(pose, { dt, olhar: 0, vista: mb.animador.vista() });
          // spec 026: no show a banda fica de frente para a plateia
          const giro =
            giroDeMorador && c.morador ? giroDeMorador(c.morador.povoado, c.morador.n, c) : null;
          if (levado) mb.boneco.posicionar(levado.x, levado.y, levado.z, levado.yaw);
          else mb.boneco.posicionar(c.x, c.y, c.z, giro ?? c.yaw);
          // (a conta é de quem pede; o boneco só troca quando o valor muda)
          if (opacidadeDeMorador) {
            const p = levado ?? c;
            mb.boneco.definirOpacidade(opacidadeDeMorador(c.id, p.x, p.y, p.z));
          }
          // spec 027 (T22): de longe, o boneco de longe (as mesmas peças com menos gomos, nos
          // mesmos ossos); montado na primeira vez que ele fica longe, um por quadro
          if (mb.boneco.definirLonge) {
            const p = levado ?? c;
            const longe = !!mb.boneco.deLonge?.();
            const d = Math.hypot(p.x - camX, p.y + 1 - camY, p.z - camZ);
            const quer = longe ? d > LONGE_VOLTA : d > LONGE_LOD;
            if (quer !== longe && (!quer || mb.longeFeito || montadasNoQuadro < LONGE_POR_QUADRO)) {
              if (quer && !mb.longeFeito) {
                montadasNoQuadro++;
                mb.longeFeito = true;
                mb.boneco.definirLonge(true);
                const antes = new Set(mb.malhas);
                mb.malhas = mb.boneco.raiz.getChildMeshes() as Mesh[];
                // (as malhas de longe com o mesmo brilho das de perto: fora do glow, sem desenho a mais)
                for (const f of mb.malhas) if (!antes.has(f)) brilhoDoMorador(f, !!mb.tapa);
              } else mb.boneco.definirLonge(quer);
            }
          }
          if (mb.bastao && !mb.microfone) {
            const ver = mostrarLuzNaMao();
            if (mb.bastao.isEnabled(false) !== ver) mb.bastao.setEnabled(ver);
          }
          // spec 026: o teclado de pendurar aparece quando a tecladista toca nele (a tela do
          // show diz: 'keytar' agora, 'keytar-guardado' no resto do tempo)
          if (mb.keytar && c.morador) {
            const ver = luzNaMaoDeMorador?.(c.morador.povoado, c.morador.n) === 'keytar';
            for (const k of mb.keytar) if (k.isEnabled(false) !== ver) k.setEnabled(ver);
          }
          mb.balao?.atualizar(dt);
          // spec 037 (portão, 5ª rodada): o que ele leva fora do boneco (o bastão, o microfone, o
          // teclado, o balão do gesto) some junto com ele, e volta inteiro com ele
          const op = mb.boneco.opacidade();
          if (op < 1 || (mb.opacidadeLeva ?? 1) < 1) {
            for (const m of mb.boneco.raiz.getChildMeshes(false)) m.visibility = op;
            mb.opacidadeLeva = op;
          }
          const l = luz(c);
          if (Math.abs(l - mb.luz) > 0.002) {
            mb.luz = l;
            mb.boneco.definirLuz(l);
            if (mb.keytar) plasticoKeytar?.definirLuz(l);
          }
          const morrer = c.estado === 'morrendo' ? c.dissolver : 0;
          mb.boneco.raiz.scaling.setAll((1 - morrer * 0.8) * crescer(c.id, dt) * mb.escala);
          const ferido = c.ferida > 0;
          if (ferido !== mb.ferido) {
            mb.ferido = ferido;
            for (const mm of mb.malhas) {
              mm.renderOverlay = ferido;
              if (ferido) {
                mm.overlayColor = COR_FERIDA;
                mm.overlayAlpha = 0.55;
              }
            }
          }
          continue;
        }
        let m = modelos.get(c.id);
        if (!m) {
          m = montar(c);
          modelos.set(c.id, m);
          nascendo.set(c.id, 0);
        }
        m.quadro = quadro;
        // rapidez pelo deslocamento real (parada contra a parede não "anda" no lugar)
        const desloc = Math.hypot(c.x - m.ultX, c.z - m.ultZ);
        m.ultX = c.x;
        m.ultZ = c.z;
        const velReal = dt > 0 && desloc < 2 ? desloc / dt : 0;
        m.vel += (velReal - m.vel) * Math.min(1, dt * 12);
        // o giro (rad/s): virando no lugar, o bicho dá passinhos em vez de rodar parado
        let dYaw = c.yaw - m.ultYaw;
        dYaw = Math.atan2(Math.sin(dYaw), Math.cos(dYaw));
        m.ultYaw = c.yaw;
        const giroReal = dt > 0 && Math.abs(dYaw) < 1.5 ? dYaw / dt : 0;
        m.giro += (giroReal - m.giro) * Math.min(1, dt * 8);
        const rapidez = c.noChao ? Math.max(m.vel, Math.abs(m.giro) * 0.22) : 0;
        // o passo: a abertura pela rapidez e o ritmo pelo comprimento da perna, para o pé no
        // chão acompanhar o chão (014c: os de perna curta deslizavam)
        m.amp += (aberturaDoPasso(rapidez) - m.amp) * Math.min(1, dt * 8);
        const passo = passoSemDeslizar(rapidez, m.quadril, m.amp);
        m.fase += dt * passo.ritmo;
        m.faseRabo += dt * (c.tipo === 'peixe' ? 9 : 4 + Math.min(2.5, m.vel * 1.2));
        m.roda += dt * m.vel * 5.1;
        const abertura = passo.abertura * (m.amp > 0.001 ? 1 : 0);
        const seno = Math.sin(m.fase);
        const cosseno = Math.cos(m.fase);
        const balanco = seno * abertura;
        const mov = tema().movimento[c.tipo];
        const andando = Math.min(1, m.amp * 3);
        m.parado +=
          ((m.vel < 0.15 && Math.abs(m.giro) < 0.6 ? 1 : 0) - m.parado) * Math.min(1, dt * 3);
        const flutua =
          mov.flutua > 0 ? mov.flutua * 1.5 + Math.sin(tempo * 2 + c.id) * mov.flutua : 0;
        const pulinho = mov.saltita * Math.abs(seno) * andando;
        // as patas no chão: girada, a pata sobe um tiquinho; o corpo desce o mesmo tanto para
        // o pé de apoio continuar encostado no chão (e balança duas vezes por passo)
        const apoio = m.quadril > 0 ? m.quadril * (1 - Math.cos(balanco)) : 0;
        m.raiz.position.set(c.x, c.y + flutua + pulinho - apoio, c.z);
        m.raiz.rotation.y = c.yaw;
        escolherLonge(m, c.x, c.y + 0.5, c.z);
        if (c.estado !== 'morrendo') m.raiz.rotation.z = seno * mov.ginga * andando;
        const morrer =
          c.estado === 'morrendo' ? c.dissolver : c.tipo === 'espectro' ? c.dissolver : 0;
        const escala = (1 - morrer * 0.8) * crescer(c.id, dt);
        // parado, respira (o corpo enche e esvazia devagarinho; os pés ficam no chão)
        const respira = 1 + Math.sin(tempo * 2.4 + c.id) * 0.018 * m.parado;
        m.raiz.scaling.set(
          escala,
          (c.estado === 'morrendo' ? Math.max(0.05, 1 - morrer) : escala) * respira,
          escala,
        );
        if (c.estado === 'morrendo') m.raiz.rotation.z = morrer * 1.4;
        const l = luz(c);
        // escurece nas cavernas (luz aproximada): um material por bicho
        {
          const mat = m.plastico;
          mat.diffuseColor.set(l * 0.78, l * 0.78, l * 0.78);
          // criatura da noite: plástico que brilha no escuro (não some no breu, não estoura)
          const e = c.tipo === 'espectro' ? Math.max(l * 0.36, 0.5) : l * 0.36;
          mat.emissiveColor.set(e, e, e);
          mat.specularColor.set(0.22 * l, 0.22 * l, 0.22 * l);
        }
        // a cabeça puxa a curva e, parado, olha em volta de vez em quando
        const olharEmVolta =
          Math.sin(tempo * 0.47 + c.id * 1.7) * Math.max(0, Math.sin(tempo * 0.19 + c.id)) * 0.45;
        const olharAlvo = Math.max(-0.45, Math.min(0.45, m.giro * 0.2)) + olharEmVolta * m.parado;
        m.olhar += (olharAlvo - m.olhar) * Math.min(1, dt * 5);
        // a pata que está no ar (indo para a frente) sobe um pouco
        const ergue = ergueDaPata(m.quadril) * andando;
        // atrás da câmera e longe: as patas e a cabeça ficam como estão neste quadro
        // (de longe também: a pose de descanso já está na malha de longe)
        const animar = !m.emLonge && !foraDaVista(c.x, c.y + 0.5, c.z);
        for (const p of m.partes) {
          if (animar)
            switch (p.papel) {
              case 'perna0':
                p.no.rotation.x = balanco;
                p.no.position.y = p.base.y + ergue * Math.max(0, -cosseno);
                break;
              case 'perna1':
                p.no.rotation.x = -balanco;
                p.no.position.y = p.base.y + ergue * Math.max(0, cosseno);
                break;
              case 'cabeca':
                // acena com o passo (o pombo empurra a cabeça para a frente a cada passo)
                p.no.rotation.x =
                  Math.sin(tempo * 1.3 + c.id) * 0.06 +
                  (c.estado === 'parado' ? 0.25 : 0) * m.parado +
                  Math.sin(m.fase * 2) * 0.05 * andando;
                p.no.rotation.y = m.olhar;
                p.no.position.z =
                  p.base.z + (mov.cabecada ?? 0) * (0.5 - 0.5 * Math.cos(m.fase * 2)) * andando;
                break;
              case 'cauda':
                // abana um pouco mais rápido andando. A fase é acumulada: com sin(tempo · ritmo),
                // cada mudança de rapidez mudava o ritmo de um tempo já grande e o rabo saltava de
                // fase a cada quadro (abanava rapidíssimo andando). Sem a sacudida no passo, que
                // nos de perna curta (ritmo alto) virava um tremido.
                p.no.rotation.y = Math.sin(m.faseRabo) * 0.35;
                break;
              case 'roda':
                p.no.rotation.x = m.roda;
                break;
              case 'asa0':
              case 'asa1': {
                // quem voa bate as asas sempre; quem anda (o pombo) só no ar ou fugindo
                const bate = mov.flutua > 0 || !c.noChao || c.estado === 'fugir';
                const lado = p.papel === 'asa0' ? 1 : -1;
                p.no.rotation.z = bate
                  ? lado * Math.sin(tempo * 9 + c.id) * 0.6
                  : lado * Math.sin(m.fase) * 0.06 * andando;
                break;
              }
              case 'antena':
                p.no.rotation.z = Math.sin(tempo * 2.5 + c.id) * 0.16;
                p.no.rotation.x = Math.sin(tempo * 1.7 + c.id * 2) * 0.1 + balanco * 0.3;
                break;
            }
          for (const malha of p.malhas) {
            malha.renderOverlay = c.ferida > 0;
            if (malha.renderOverlay) {
              malha.overlayColor = COR_FERIDA;
              malha.overlayAlpha = 0.55;
            }
            malha.visibility = translucida(c.tipo) ? 1 - morrer : 1;
          }
        }
        if (m.emLonge && m.longe)
          for (const f of m.longe) {
            f.renderOverlay = c.ferida > 0;
            if (f.renderOverlay) {
              f.overlayColor = COR_FERIDA;
              f.overlayAlpha = 0.55;
            }
            f.visibility = translucida(c.tipo) ? 1 - morrer : 1;
          }
      }
      for (const [id, mb] of moradores) {
        if (mb.quadro === quadro) continue;
        // (saiu do mundo de repente: encolhe até sumir, nunca pisca)
        if (encolher(id, mb.boneco.raiz, dt)) continue;
        mb.balao?.descartar();
        mb.boneco.descartar();
        moradores.delete(id);
        nascendo.delete(id);
      }
      for (const [id, m] of modelos) {
        if (m.quadro === quadro) continue;
        if (encolher(id, m.raiz, dt)) continue;
        descartarModelo(m);
        modelos.delete(id);
        nascendo.delete(id);
      }
      for (const [id, p] of gestosPendentes)
        if (relogio - p.quando > VALIDADE_GESTO_PENDENTE) gestosPendentes.delete(id);
    },
  };
}
