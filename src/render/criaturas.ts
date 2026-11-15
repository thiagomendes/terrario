import '@babylonjs/core/Rendering/outlineRenderer';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
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
import { caixaArredondada, esfera } from './formas';
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
  partes: { no: TransformNode; malhas: Mesh[]; papel: Peca['papel']; base: Vector3 }[];
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
) {
  const modelos = new Map<number, Modelo>();
  /**
   * Spec 014 (T08): a criatura da noite mansa (o guaxinim da cidade, a coruja do Rancho) é um
   * bicho de brinquedo, não um fantasma: perto da luz ela encolhe e some, mas nunca fica
   * meio transparente (só o espectro que assusta se desfaz em bruma).
   */
  const translucida = (tipo: string) => tipo === 'espectro' && tema().mundo.noite !== 'mansa';
  /** Moradores de brinquedo: o boneco B com as cores e peças do tema (spec 012, A2). */
  const moradores = new Map<
    number,
    {
      boneco: Personagem;
      animador: ReturnType<typeof criarAnimador>;
      /** Spec 015: balão do gesto (criado no primeiro aceno). */
      balao?: BalaoGesto;
      ultX: number;
      ultZ: number;
      vel: number;
      quadro: number;
      /** Malhas do boneco (fixas: o morador não troca de roupa nem de item na mão). */
      malhas: Mesh[];
      ferido: boolean;
      luz: number;
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
    );
    const chave = `${tema().id}|${prof}|${fixo && c.morador ? `${c.morador.povoado}:${c.morador.n}` : ''}|${acessorio ?? ''}|${JSON.stringify(m.aparencia)}`;
    return { m, chave };
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
  function montarMorador(c: Criatura, prep = prepararMorador(c)) {
    const m = prep.m;
    const ajustar = (p: PlanoBoneco) => planoDoMorador(prep, p);
    // spec 014 (T11): as peças não passam pelo teste de vista uma por uma (o boneco inteiro
    // passa, em `naVistaDoQuadro`) nem refazem a caixa a cada quadro
    const boneco = criarBoneco(scene, m.aparencia, `morador-${c.id}`, ajustar, true, true);
    for (const malha of boneco.raiz.getChildMeshes()) {
      const mat = malha.material as StandardMaterial | null;
      // só a lanterna e o que o tema marcou como brilhante entram no brilho
      if (mat && mat.emissiveColor.r + mat.emissiveColor.g + mat.emissiveColor.b > 1.6)
        incluirNoGlow(malha as Mesh);
      else excluirDoGlow(malha as Mesh);
      malha.isPickable = false;
    }
    return {
      boneco,
      animador: criarAnimador(),
      ultX: c.x,
      ultZ: c.z,
      vel: 0,
      quadro: 0,
      malhas: boneco.raiz.getChildMeshes() as Mesh[],
      ferido: false,
      luz: -1,
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
    for (const p of m.partes) {
      p.no.computeWorldMatrix(true);
      for (const malha of p.malhas) {
        const mat = malha.material as StandardMaterial | null;
        if (!mat || !m.substitui.has(mat)) continue;
        const copia = malha.clone(`${malha.name}-longe`, null, true);
        if (!copia) continue;
        copia.parent = null;
        copia.position.setAll(0);
        copia.rotation.setAll(0);
        copia.rotationQuaternion = null;
        copia.scaling.setAll(1);
        copia.makeGeometryUnique();
        copia.bakeTransformIntoVertices(malha.computeWorldMatrix(true).multiply(inversa));
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
      for (const peca of g.pecas) {
        const [w, h, d] = peca.t;
        const maior = Math.max(w, h, d);
        const nome = `criatura-${c.id}-p${n++}`;
        const malha =
          peca.forma === 'bola'
            ? esfera(nome, scene, maior / 2, plastico, [w / maior, h / maior, d / maior])
            : caixaArredondada(nome, scene, w, h, d, peca.raio, plastico, 3);
        malha.position.set(peca.p[0] - g.pivo[0], peca.p[1] - g.pivo[1], peca.p[2] - g.pivo[2]);
        if (peca.rot) malha.rotation.set(peca.rot[0], peca.rot[1], peca.rot[2]);
        const cor = corBase(peca.cor);
        const nv = malha.getTotalVertices();
        const cores = new Float32Array(nv * 4);
        for (let k = 0; k < nv; k++) cores.set([cor.r, cor.g, cor.b, 1], k * 4);
        malha.setVerticesData(VertexBuffer.ColorKind, cores);
        const b = peca.brilho ?? 0;
        porClasse[b > 0.45 ? 'forte' : b > 0 ? 'suave' : 'plastico'].push(malha);
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
      return { no, malhas, papel: g.papel, base: no.position.clone() };
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
  let poseDeMorador: ((povoado: string, n: number, pose: Pose) => Pose) | null = null;
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
     * Spec 026: uma pose por cima da do morador (a banda no Show da Vila); null tira.
     */
    definirPoseDeMorador(f: ((povoado: string, n: number, pose: Pose) => Pose) | null): void {
      poseDeMorador = f;
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
          const poseBase = mb.animador.atualizar(dt, {
            velocidadeHoriz: mb.vel,
            correndo: c.estado === 'fugir',
            noChao: c.noChao,
            voando: false,
          });
          // spec 026: a banda da Vila Neon bate cabeça no tempo do show (sem balão de gesto)
          const pose =
            poseDeMorador && c.morador
              ? poseDeMorador(c.morador.povoado, c.morador.n, poseBase)
              : poseBase;
          // o animador anda sempre (o passo segue de onde estava); as juntas só na vista
          if (!foraDaVista(c.x, c.y + 1, c.z))
            mb.boneco.aplicarPose(pose, { dt, olhar: 0, vista: mb.animador.vista() });
          mb.boneco.posicionar(c.x, c.y, c.z, c.yaw);
          mb.balao?.atualizar(dt);
          const l = luz(c);
          if (Math.abs(l - mb.luz) > 0.002) {
            mb.luz = l;
            mb.boneco.definirLuz(l);
          }
          const morrer = c.estado === 'morrendo' ? c.dissolver : 0;
          mb.boneco.raiz.scaling.setAll(1 - morrer * 0.8);
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
        const escala = 1 - morrer * 0.8;
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
        mb.balao?.descartar();
        mb.boneco.descartar();
        moradores.delete(id);
      }
      for (const [id, m] of modelos) {
        if (m.quadro === quadro) continue;
        descartarModelo(m);
        modelos.delete(id);
      }
      for (const [id, p] of gestosPendentes)
        if (relogio - p.quando > VALIDADE_GESTO_PENDENTE) gestosPendentes.delete(id);
    },
  };
}
