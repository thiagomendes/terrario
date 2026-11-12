/**
 * Horizonte da Cidade Grande na cena (spec 014, T10): o anel de torres de
 * `src/world/horizonte.ts` numa malha só (1 chamada de desenho, ~1.500 triângulos), com a
 * textura pequena das janelas e cor por vértice. Nada de CPU por quadro além de uns
 * uniformes: o centro do anel (que se afasta junto de quem anda para fora), a névoa, a luz
 * do dia e a noite (as janelas acesas).
 *
 * As torres ficam de verdade a 260–320 blocos (mudam um pouco de lugar quando a criança anda,
 * o que dá profundidade), mas o vértice é desenhado no máximo a 230 blocos da câmera, na mesma
 * direção (a imagem é a mesma; só a profundidade encolhe): assim cabe antes do fim da câmera e
 * na frente do domo do céu. A névoa usa a distância de verdade, mais fraca que a do mundo
 * (senão o anel sumia de dia), e as janelas acesas atravessam ainda mais a névoa de noite.
 */
import type { Scene } from '@babylonjs/core/scene';
import { Effect } from '@babylonjs/core/Materials/effect';
import { ShaderMaterial } from '@babylonjs/core/Materials/shaderMaterial';
import { RawTexture } from '@babylonjs/core/Materials/Textures/rawTexture';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { Constants } from '@babylonjs/core/Engines/constants';
import type { Color3 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import {
  ALTURA_JANELAS,
  LARGURA_JANELAS,
  centroDoAnel,
  geometriaDoHorizonte,
  presencaDoHorizonte,
  texturaDeJanelas,
} from '../world/horizonte';

const VERTICE = /* glsl */ `
precision highp float;
attribute vec3 position;
attribute vec4 color;
attribute vec2 uv;
uniform mat4 viewProjection;
uniform vec3 camPos;
uniform vec3 centro;
varying vec4 vCor;
varying vec2 vUV;
varying float vDist;
void main(void) {
  vec3 p = position + centro;
  vec3 d = p - camPos;
  float dist = length(d);
  vDist = dist;
  vCor = color;
  vUV = uv;
  // mesma direção, profundidade de no máximo 230 (antes do fim da câmera e do domo do céu)
  vec3 q = camPos + d * min(1.0, 230.0 / max(dist, 1.0));
  gl_Position = viewProjection * vec4(q, 1.0);
}
`;

const FRAGMENTO = /* glsl */ `
precision highp float;
varying vec4 vCor;
varying vec2 vUV;
varying float vDist;
uniform sampler2D janelas;
uniform vec3 corNevoa;
uniform float densidade;
uniform float luz;
uniform float noite;
uniform float presenca;
void main(void) {
  vec4 t = texture2D(janelas, vUV);
  vec3 parede = vCor.rgb * luz;
  // de dia o vidro é só um pouco mais escuro e azulado que a parede
  vec3 cor = mix(parede, parede * 0.72 + vec3(0.04, 0.06, 0.1) * luz, t.r);
  float f = exp(-pow(vDist * densidade * 0.8, 2.0)) * presenca;
  cor = mix(corNevoa, cor, f);
  // de noite: as janelas acesas (quentinhas ou brancas) brilham através da névoa
  vec3 acesa = mix(vec3(1.0, 0.78, 0.45), vec3(1.0, 0.95, 0.82), t.b);
  float fj = exp(-pow(vDist * densidade * 0.4, 2.0)) * presenca;
  cor += acesa * t.r * t.g * noite * 0.85 * fj;
  gl_FragColor = vec4(cor, 1.0);
}
`;

let registrado = false;
function registrar(): void {
  if (registrado) return;
  Effect.ShadersStore['horizonteVertexShader'] = VERTICE;
  Effect.ShadersStore['horizonteFragmentShader'] = FRAGMENTO;
  registrado = true;
}

export interface Horizonte {
  malha: Mesh;
  triangulos: number;
  /** A cada quadro: onde está a câmera e o jogador, a névoa, a luz do dia e a noite. */
  atualizar(
    camera: Vector3,
    jogador: { x: number; z: number },
    nevoa: Color3,
    densidade: number,
    luz: number,
    noite: number,
  ): void;
}

/** O horizonte de torres em volta da cidade (cx, cz) com o chão em `chao`. */
export function criarHorizonte(
  scene: Scene,
  semente: number,
  cx: number,
  cz: number,
  chao: number,
): Horizonte {
  registrar();
  const g = geometriaDoHorizonte(semente);
  const malha = new Mesh('horizonte-cidade', scene);
  const vd = new VertexData();
  vd.positions = g.posicoes;
  vd.colors = g.cores;
  vd.uvs = g.uvs;
  vd.indices = g.indices;
  vd.applyToMesh(malha, false);
  const tex = RawTexture.CreateRGBATexture(
    texturaDeJanelas(semente),
    LARGURA_JANELAS,
    ALTURA_JANELAS,
    scene,
    true,
    false,
    Texture.TRILINEAR_SAMPLINGMODE,
    Constants.TEXTURETYPE_UNSIGNED_BYTE,
  );
  tex.wrapU = Texture.WRAP_ADDRESSMODE;
  tex.wrapV = Texture.WRAP_ADDRESSMODE;
  const mat = new ShaderMaterial(
    'horizonte',
    scene,
    { vertex: 'horizonte', fragment: 'horizonte' },
    {
      attributes: ['position', 'color', 'uv'],
      uniforms: [
        'viewProjection',
        'camPos',
        'centro',
        'corNevoa',
        'densidade',
        'luz',
        'noite',
        'presenca',
      ],
      samplers: ['janelas'],
    },
  );
  mat.setTexture('janelas', tex);
  mat.backFaceCulling = false;
  malha.material = mat;
  malha.isPickable = false;
  malha.applyFog = false;
  malha.receiveShadows = false;
  // o anel inteiro fica sempre na tela (a caixa de recorte não vale: o vértice se move)
  malha.alwaysSelectAsActiveMesh = true;
  malha.doNotSyncBoundingInfo = true;
  const anel: [number, number] = [cx, cz];
  const centro = new Vector3(cx, chao, cz);
  return {
    malha,
    triangulos: g.triangulos,
    atualizar(camera, jogador, nevoa, densidade, luz, noite) {
      const presenca = presencaDoHorizonte(Math.hypot(jogador.x - cx, jogador.z - cz));
      malha.setEnabled(presenca > 0.01);
      if (presenca <= 0.01) return;
      centroDoAnel(cx, cz, jogador.x, jogador.z, anel);
      mat.setVector3('camPos', camera);
      mat.setVector3('centro', centro.set(anel[0], chao, anel[1]));
      mat.setColor3('corNevoa', nevoa);
      mat.setFloat('densidade', densidade);
      mat.setFloat('luz', luz);
      mat.setFloat('noite', noite);
      mat.setFloat('presenca', presenca);
    },
  };
}
