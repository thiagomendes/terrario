import { Effect } from '@babylonjs/core/Materials/effect';
import { ShaderMaterial } from '@babylonjs/core/Materials/shaderMaterial';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import type { Scene } from '@babylonjs/core/scene';
import type { EstadoAtmosfera } from './atmosfera';

/** Funções GLSL compartilhadas pelo céu e pela água (reflexo). */
export const GLSL_CEU = /* glsl */ `
uniform vec3 ceuZenite;
uniform vec3 ceuMeio;
uniform vec3 ceuHorizonte;
uniform vec3 paraSol;
uniform vec3 paraLua;
uniform vec3 corSol;
uniform float noite;
uniform float crepusculo;
uniform float cobertura;
uniform float arcoIris;

vec3 corDoCeu(vec3 d) {
  float h = d.y;
  float t = clamp(h, 0.0, 1.0);
  vec3 c = mix(ceuHorizonte, ceuMeio, smoothstep(0.0, 0.28, t));
  c = mix(c, ceuZenite, smoothstep(0.22, 0.85, t));
  if (h < 0.0) c = mix(ceuHorizonte, ceuHorizonte * 0.6, smoothstep(0.0, -0.4, h));
  float s = max(dot(d, paraSol), 0.0);
  // halo do sol, mais largo e quente no nascer e no por
  float halo = pow(s, 6.0) * (0.25 + 0.6 * crepusculo) + pow(s, 48.0) * 0.5;
  c += corSol * halo * (1.0 - noite);
  // faixa alaranjada no horizonte do lado do sol
  float ladoSol = dot(normalize(vec3(d.x, 0.001, d.z)), normalize(vec3(paraSol.x, 0.001, paraSol.z)));
  float faixa = exp(-abs(h) * 9.0) * pow(max(ladoSol * 0.5 + 0.5, 0.0), 3.0);
  c += vec3(1.0, 0.45, 0.2) * faixa * crepusculo * 0.45;
  // arco-iris a 42 graus do ponto oposto ao sol
  if (arcoIris > 0.001 && h > 0.0) {
    float ang = acos(clamp(dot(d, -paraSol), -1.0, 1.0));
    float r = (ang - 0.68) / 0.06;
    if (abs(r) < 1.0) {
      vec3 arco = clamp(vec3(1.5 - abs(r * 3.0 - 2.0), 1.5 - abs(r * 3.0), 1.5 - abs(r * 3.0 + 2.0)), 0.0, 1.0);
      c += arco * 0.22 * arcoIris * (1.0 - abs(r)) * smoothstep(0.0, 0.15, h);
    }
  }
  return c;
}
`;

const VERTICE = /* glsl */ `
precision highp float;
attribute vec3 position;
uniform mat4 worldViewProjection;
varying vec3 vDir;
void main() {
  vDir = position;
  gl_Position = worldViewProjection * vec4(position, 1.0);
}
`;

const FRAGMENTO = /* glsl */ `
precision highp float;
varying vec3 vDir;
uniform float tempo;
${GLSL_CEU}

float hash3(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
float hash2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float ruido(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash2(i), hash2(i + vec2(1.0, 0.0)), f.x),
             mix(hash2(i + vec2(0.0, 1.0)), hash2(i + vec2(1.0, 1.0)), f.x), f.y);
}
float fbm(vec2 p) {
  float s = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) { s += a * ruido(p); p = p * 2.03 + 7.1; a *= 0.5; }
  return s;
}

void main() {
  vec3 d = normalize(vDir);
  vec3 c = corDoCeu(d);
  float h = d.y;

  // estrelas
  vec3 sp = d * 220.0;
  vec3 cel = floor(sp);
  float r = hash3(cel);
  float estrela = step(0.992, r) * smoothstep(0.45, 0.0, length(fract(sp) - 0.5));
  estrela *= (0.55 + 0.45 * sin(tempo * (1.5 + r * 3.0) + r * 80.0));
  c += vec3(0.85, 0.88, 1.0) * estrela * noite * smoothstep(0.0, 0.25, h) * 1.6;

  // disco do sol
  float s = dot(d, paraSol);
  c = mix(c, vec3(1.25, 1.05, 0.8), smoothstep(0.9988, 0.9993, s));

  // lua com crateras
  float l = dot(d, paraLua);
  float disco = smoothstep(0.9975, 0.998, l);
  vec3 lt = normalize(cross(paraLua, vec3(0.0, 1.0, 0.0)));
  vec3 lb = cross(lt, paraLua);
  vec2 lp = vec2(dot(d, lt), dot(d, lb)) * 400.0;
  float cratera = fbm(lp * 0.6) * 0.5 + 0.6;
  c = mix(c, vec3(0.86, 0.88, 0.95) * cratera, disco);
  c += vec3(0.5, 0.6, 0.9) * pow(max(l, 0.0), 300.0) * 0.35 * noite;

  // nuvens: plano projetado, em blocos suaves
  if (h > 0.0) {
    vec2 uv = d.xz / (h + 0.12) * 1.6 + vec2(tempo * 0.006, tempo * 0.0025);
    vec2 bloco = floor(uv * 6.0) / 6.0;
    float n = fbm(bloco * 1.3);
    float nuvem = smoothstep(0.52 - cobertura * 0.3, 0.62 - cobertura * 0.25, n) * smoothstep(0.02, 0.2, h);
    float lado = pow(max(dot(d, paraSol), 0.0), 3.0);
    vec3 dia = mix(vec3(1.0, 0.98, 0.96), corSol * 1.05, crepusculo * 0.75 + lado * 0.3);
    vec3 cn = mix(dia, ceuMeio * 0.35 + vec3(0.03), noite);
    cn = mix(cn, cn * vec3(0.55, 0.57, 0.62), smoothstep(0.4, 1.0, cobertura));
    c = mix(c, cn, nuvem * 0.85);
  }

  gl_FragColor = vec4(c, 1.0);
}
`;

let registrado = false;
function registrar(): void {
  if (registrado) return;
  Effect.ShadersStore['ceuVertexShader'] = VERTICE;
  Effect.ShadersStore['ceuFragmentShader'] = FRAGMENTO;
  registrado = true;
}

export const UNIFORMES_CEU = [
  'ceuZenite',
  'ceuMeio',
  'ceuHorizonte',
  'paraSol',
  'paraLua',
  'corSol',
  'noite',
  'crepusculo',
  'cobertura',
  'arcoIris',
];

/** Passa o estado da atmosfera aos uniformes de céu de um ShaderMaterial. */
export function aplicarUniformesCeu(mat: ShaderMaterial, a: EstadoAtmosfera): void {
  mat.setColor3('ceuZenite', new Color3(...a.ceuZenite));
  mat.setColor3('ceuMeio', new Color3(...a.ceuMeio));
  mat.setColor3('ceuHorizonte', new Color3(...a.ceuHorizonte));
  mat.setVector3('paraSol', new Vector3(...a.paraSol));
  mat.setVector3('paraLua', new Vector3(...a.paraLua));
  mat.setColor3('corSol', new Color3(...a.luz));
  mat.setFloat('noite', a.noite);
  mat.setFloat('crepusculo', a.crepusculo);
  mat.setFloat('cobertura', a.cobertura);
  mat.setFloat('arcoIris', a.arco);
}

export interface Ceu {
  malha: import('@babylonjs/core/Meshes/mesh').Mesh;
  atualizar(a: EstadoAtmosfera, tempo: number): void;
}

export function criarCeu(scene: Scene): Ceu {
  registrar();
  const mat = new ShaderMaterial(
    'ceu',
    scene,
    { vertex: 'ceu', fragment: 'ceu' },
    {
      attributes: ['position'],
      uniforms: ['worldViewProjection', 'tempo', ...UNIFORMES_CEU],
    },
  );
  mat.backFaceCulling = false;
  mat.disableDepthWrite = true;
  const domo = MeshBuilder.CreateSphere('ceu', { diameter: 500, segments: 32 }, scene);
  domo.material = mat;
  domo.infiniteDistance = true;
  domo.isPickable = false;
  domo.applyFog = false;
  domo.renderingGroupId = 0;
  domo.alphaIndex = -1;
  return {
    malha: domo,
    atualizar(a, tempo) {
      aplicarUniformesCeu(mat, a);
      mat.setFloat('tempo', tempo);
    },
  };
}
