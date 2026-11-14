/**
 * Balão do gesto em cima da cabeça (spec 015): o ícone do gesto num círculo creme, como no
 * esboço. Uma textura por gesto (desenhada uma vez do mesmo SVG da roda, com mipmaps) e um
 * material por gesto, divididos por todos os bonecos da cena; cada boneco tem só um plano
 * virado para a câmera, que troca de material. Nada é criado a cada quadro.
 *
 * Nítido de qualquer distância: de perto tem o tamanho do esboço (0,75 bloco); de longe
 * cresce com a distância e fica sempre com uns 45 px na tela, por cima das paredes.
 *
 * Nunca enorme: mais perto da câmera que a aproximação máxima, o balão encolhe junto e fica
 * na tela do tamanho que teria ali; colado na câmera ou atrás dela (o morador ao lado da
 * câmera, o do jogador dentro da casinha) some, em vez de cobrir um pedaço da tela.
 */
import type { Scene } from '@babylonjs/core/scene';
import { Constants } from '@babylonjs/core/Engines/constants';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import type { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { DURACAO_BALAO, IDS_GESTOS, type IdGesto } from '../personagem/gestos';
import { svgDoBalao, svgDoBalaoEstrela } from '../ui/iconesGestos';

const LADO = 256;
/** Tamanho de perto (blocos) e distância a partir da qual o balão cresce com ela. */
const TAMANHO = 0.75;
const LONGE = 12;
/**
 * Mais perto que isto da câmera (blocos), o balão encolhe na mesma proporção: na tela, nunca
 * fica maior que com a câmera na aproximação máxima (o do jogador, na distância de sempre,
 * fica como era).
 */
export const PERTO_MAXIMO = 2.5;
/** O balão some entre estas distâncias da câmera (blocos). */
export const SOME_FIM = 0.8;
export const SOME_INICIO = 1.5;

/**
 * Tamanho (blocos) e opacidade do balão a `distancia` da câmera, com `frente` blocos na
 * direção do olhar (negativo: atrás da câmera). Colado na câmera (de qualquer um, também o
 * do jogador dentro da casinha) ele some, em vez de cobrir um pedaço da tela.
 */
export function medidaBalao(
  distancia: number,
  frente: number,
): { tamanho: number; opacidade: number } {
  const d = Number.isFinite(distancia) ? Math.max(0, distancia) : LONGE;
  const tamanho = TAMANHO * Math.max(1, d / LONGE) * Math.min(1, d / PERTO_MAXIMO);
  if (frente < 0.3) return { tamanho, opacidade: 0 };
  const t = (d - SOME_FIM) / (SOME_INICIO - SOME_FIM);
  return { tamanho, opacidade: Math.min(1, Math.max(0, t)) };
}

const porCena = new WeakMap<Scene, Record<IdGesto, StandardMaterial>>();
const porCenaComParede = new WeakMap<Scene, Record<IdGesto, StandardMaterial>>();
/** Spec 023 (T09): o balão com estrelinha (presente do nível 6), só para os jogadores. */
const porCenaEstrela = new WeakMap<Scene, Record<IdGesto, StandardMaterial>>();

/**
 * Os 8 materiais do balão (um por gesto), criados na primeira vez que a cena precisa.
 * `atravessa`: por cima de tudo (o amigo atrás da parede também mostra o gesto); sem isso,
 * a parede esconde o balão (o morador dentro de casa).
 */
export function materiaisDoBalao(
  scene: Scene,
  atravessa = true,
  estrela = false,
): Record<IdGesto, StandardMaterial> {
  const cache = estrela ? porCenaEstrela : atravessa ? porCena : porCenaComParede;
  const ja = cache.get(scene);
  if (ja) return ja;
  const sufixo = estrela ? '-estrela' : atravessa ? '' : '-parede';
  const mats = {} as Record<IdGesto, StandardMaterial>;
  for (const id of IDS_GESTOS) {
    const tex = new DynamicTexture(
      `balao-gesto-${id}${sufixo}`,
      { width: LADO, height: LADO },
      scene,
      true,
    );
    tex.hasAlpha = true;
    const img = new Image();
    img.onload = () => {
      const ctx = tex.getContext();
      ctx.clearRect(0, 0, LADO, LADO);
      ctx.drawImage(img, 0, 0, LADO, LADO);
      tex.update(true, true);
    };
    img.src =
      'data:image/svg+xml;charset=utf-8,' +
      encodeURIComponent(estrela ? svgDoBalaoEstrela(id) : svgDoBalao(id));
    const m = new StandardMaterial(`balao-gesto-${id}${sufixo}`, scene);
    // a cor vem toda do emissivo (sem luz nem sombra: o mesmo creme de dia, à noite e na
    // caverna); o difuso só dá o recorte (alfa)
    m.diffuseTexture = tex;
    m.emissiveTexture = tex;
    m.useAlphaFromDiffuseTexture = true;
    m.disableLighting = true;
    m.diffuseColor = Color3.Black();
    m.emissiveColor = Color3.White();
    m.specularColor = Color3.Black();
    m.ambientColor = Color3.Black();
    m.backFaceCulling = false;
    m.fogEnabled = false;
    // por cima de tudo (o amigo atrás da parede também mostra o gesto)
    if (atravessa) m.depthFunction = Constants.ALWAYS;
    m.disableDepthWrite = true;
    mats[id] = m;
  }
  cache.set(scene, mats);
  return mats;
}

export interface BalaoGesto {
  /** `estrela`: o balão com a borda de ouro e as estrelinhas (presente do nível 6). */
  mostrar(id: IdGesto, estrela?: boolean): void;
  esconder(): void;
  /** Avança o tempo, some depois de 2 s e acerta o tamanho pela distância da câmera. */
  atualizar(dt: number): void;
  readonly visivel: boolean;
  /** Gesto mostrado agora (testes). */
  readonly gesto: IdGesto | null;
  descartar(): void;
}

const tmp = new Vector3();
const frenteCam = new Vector3();
const FRENTE = Vector3.Forward();

/**
 * Balão preso a um boneco, `altura` blocos acima dos pés. `atravessaParede`: aparece por
 * cima das paredes (jogadores); o dos moradores fica atrás delas.
 */
export function criarBalao(
  scene: Scene,
  pai: TransformNode,
  altura = 2.1,
  atravessaParede = true,
): BalaoGesto {
  const mats = materiaisDoBalao(scene, atravessaParede);
  let matsEstrela: Record<IdGesto, StandardMaterial> | null = null;
  // "personagem-": o brilho da cena não pega (como o boneco)
  const m = MeshBuilder.CreatePlane('personagem-balao-gesto', { size: 1 }, scene);
  m.parent = pai;
  m.position.set(0, altura, 0);
  m.billboardMode = Mesh.BILLBOARDMODE_ALL;
  m.isPickable = false;
  m.receiveShadows = false;
  m.alphaIndex = 1000;
  m.setEnabled(false);
  let resta = 0;
  let idade = 0;
  let gesto: IdGesto | null = null;
  return {
    mostrar(id, estrela = false) {
      gesto = id;
      if (estrela) matsEstrela ??= materiaisDoBalao(scene, true, true);
      m.material = estrela && matsEstrela ? matsEstrela[id] : mats[id];
      resta = DURACAO_BALAO;
      idade = 0;
      m.setEnabled(true);
    },
    esconder() {
      resta = 0;
      gesto = null;
      m.setEnabled(false);
    },
    atualizar(dt) {
      if (resta <= 0) return;
      resta -= dt;
      idade += dt;
      if (resta <= 0) {
        gesto = null;
        m.setEnabled(false);
        return;
      }
      const cam = scene.activeCamera;
      // a distância é até o balão (não até os pés): é ele que pode encostar na câmera
      // o pai pode estar encolhido (morador sumindo): compensa para o balão não mudar
      const e = pai.scaling.x || 1;
      const p = pai.getAbsolutePosition();
      let medida = { tamanho: TAMANHO, opacidade: 1 };
      if (cam) {
        const c = cam.globalPosition;
        const dx = p.x - c.x;
        const dy = p.y + altura * e - c.y;
        const dz = p.z - c.z;
        cam.getDirectionToRef(FRENTE, frenteCam);
        medida = medidaBalao(
          Math.hypot(dx, dy, dz),
          dx * frenteCam.x + dy * frenteCam.y + dz * frenteCam.z,
        );
      }
      m.visibility = medida.opacidade;
      m.isVisible = medida.opacidade > 0.01;
      // aparece com um pulinho e some encolhendo
      const pop = idade < 0.18 ? 0.6 + 0.4 * Math.sin((idade / 0.18) * Math.PI * 0.5) : 1;
      const sai = resta < 0.15 ? resta / 0.15 : 1;
      const s = medida.tamanho * pop * sai;
      tmp.set(s / e, s / e, s / e);
      m.scaling.copyFrom(tmp);
    },
    get visivel() {
      return resta > 0;
    },
    get gesto() {
      return gesto;
    },
    descartar() {
      m.dispose();
    },
  };
}
