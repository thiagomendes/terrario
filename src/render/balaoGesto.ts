/**
 * Balão do gesto em cima da cabeça (spec 015): o ícone do gesto num círculo creme, como no
 * esboço. Uma textura por gesto (desenhada uma vez do mesmo SVG da roda, com mipmaps) e um
 * material por gesto, divididos por todos os bonecos da cena; cada boneco tem só um plano
 * virado para a câmera, que troca de material. Nada é criado a cada quadro.
 *
 * Nítido de qualquer distância: de perto tem o tamanho do esboço (0,75 bloco); de longe
 * cresce com a distância e fica sempre com uns 45 px na tela, por cima das paredes.
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
import { svgDoBalao } from '../ui/iconesGestos';

const LADO = 256;
/** Tamanho de perto (blocos) e distância a partir da qual o balão cresce com ela. */
const TAMANHO = 0.75;
const LONGE = 12;

const porCena = new WeakMap<Scene, Record<IdGesto, StandardMaterial>>();

/** Os 8 materiais do balão (um por gesto), criados na primeira vez que a cena precisa. */
export function materiaisDoBalao(scene: Scene): Record<IdGesto, StandardMaterial> {
  const ja = porCena.get(scene);
  if (ja) return ja;
  const mats = {} as Record<IdGesto, StandardMaterial>;
  for (const id of IDS_GESTOS) {
    const tex = new DynamicTexture(`balao-gesto-${id}`, { width: LADO, height: LADO }, scene, true);
    tex.hasAlpha = true;
    const img = new Image();
    img.onload = () => {
      const ctx = tex.getContext();
      ctx.clearRect(0, 0, LADO, LADO);
      ctx.drawImage(img, 0, 0, LADO, LADO);
      tex.update(true, true);
    };
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgDoBalao(id));
    const m = new StandardMaterial(`balao-gesto-${id}`, scene);
    m.diffuseTexture = tex;
    m.useAlphaFromDiffuseTexture = true;
    m.disableLighting = true;
    m.emissiveColor = Color3.Black();
    m.specularColor = Color3.Black();
    m.backFaceCulling = false;
    m.fogEnabled = false;
    // por cima de tudo (o amigo atrás da parede também mostra o gesto)
    m.depthFunction = Constants.ALWAYS;
    m.disableDepthWrite = true;
    mats[id] = m;
  }
  porCena.set(scene, mats);
  return mats;
}

export interface BalaoGesto {
  mostrar(id: IdGesto): void;
  esconder(): void;
  /** Avança o tempo, some depois de 2 s e acerta o tamanho pela distância da câmera. */
  atualizar(dt: number): void;
  readonly visivel: boolean;
  /** Gesto mostrado agora (testes). */
  readonly gesto: IdGesto | null;
  descartar(): void;
}

const tmp = new Vector3();

/** Balão preso a um boneco, `altura` blocos acima dos pés. */
export function criarBalao(scene: Scene, pai: TransformNode, altura = 2.2): BalaoGesto {
  const mats = materiaisDoBalao(scene);
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
    mostrar(id) {
      gesto = id;
      m.material = mats[id];
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
      const d = cam ? Vector3.DistanceSquared(cam.globalPosition, pai.getAbsolutePosition()) : 0;
      // aparece com um pulinho e some encolhendo
      const pop = idade < 0.18 ? 0.6 + 0.4 * Math.sin((idade / 0.18) * Math.PI * 0.5) : 1;
      const sai = resta < 0.15 ? resta / 0.15 : 1;
      const s = TAMANHO * Math.max(1, Math.sqrt(d) / LONGE) * pop * sai;
      // o pai pode estar encolhido (morador sumindo): compensa para o balão não mudar
      const e = pai.scaling.x || 1;
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
