import { Effect } from '@babylonjs/core/Materials/effect';
import { ShaderMaterial } from '@babylonjs/core/Materials/shaderMaterial';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { Vector2, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { tema } from '../temas/ativo';
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
// do tema (constantes por mundo; os padroes reproduzem a base)
uniform float haloSol;
uniform float faixaCrep;
uniform vec3 corCrep;

vec3 corDoCeu(vec3 d) {
  float h = d.y;
  float t = clamp(h, 0.0, 1.0);
  vec3 c = mix(ceuHorizonte, ceuMeio, smoothstep(0.0, 0.28, t));
  c = mix(c, ceuZenite, smoothstep(0.22, 0.85, t));
  if (h < 0.0) c = mix(ceuHorizonte, ceuHorizonte * 0.6, smoothstep(0.0, -0.4, h));
  float s = max(dot(d, paraSol), 0.0);
  // halo do sol, mais largo e quente no nascer e no por
  float halo = pow(s, 6.0) * (0.25 + 0.6 * crepusculo) + pow(s, 48.0) * 0.5;
  c += corSol * halo * (1.0 - noite) * haloSol;
  // faixa alaranjada no horizonte do lado do sol
  float ladoSol = dot(normalize(vec3(d.x, 0.001, d.z)), normalize(vec3(paraSol.x, 0.001, paraSol.z)));
  float faixa = exp(-abs(h) * 9.0) * pow(max(ladoSol * 0.5 + 0.5, 0.0), 3.0);
  c += corCrep * faixa * crepusculo * 0.45 * faixaCrep;
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
uniform float estrelasDia;
uniform vec3 corEstrelas;
uniform float limiarEstrela;
uniform vec3 corSolTema;
uniform vec2 solLimiar;
uniform vec3 corLuaTema;
uniform vec2 luaLimiar;
uniform float luaEscala;
uniform vec3 planetaDir;
uniform float planetaRaio;
uniform vec3 planetaCor;
uniform vec3 planetaCor2;
uniform float planetaMistura;
uniform float planetaNuvens;
uniform vec3 aneisCor;
uniform float aneisInc;
uniform vec3 corNuvens;
uniform float fatorNuvens;
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
  float estrela = step(limiarEstrela, r) * smoothstep(0.45, 0.0, length(fract(sp) - 0.5));
  estrela *= (0.55 + 0.45 * sin(tempo * (1.5 + r * 3.0) + r * 80.0));
  c += corEstrelas * estrela * max(noite, estrelasDia) * smoothstep(0.0, 0.25, h) * 1.6;

  // planeta grande fixo (Terra vista da Lua, gigante gasoso); raio 0 = nenhum
  if (planetaRaio > 0.0) {
    float pd = dot(d, planetaDir);
    float cosR = cos(planetaRaio);
    vec3 pt = normalize(cross(planetaDir, vec3(0.0, 1.0, 0.0)));
    vec3 pb = cross(pt, planetaDir);
    vec2 pq = vec2(dot(d, pt), dot(d, pb)) / sin(planetaRaio);
    // aneis: elipse achatada em volta, atras na metade de cima
    // só do lado do planeta (sem anel fantasma no ponto oposto do céu)
    if (aneisInc > 0.0 && pd > 0.0) {
      vec2 rq = vec2(pq.x, pq.y / aneisInc);
      float rr = length(rq);
      float anel = smoothstep(1.35, 1.42, rr) * (1.0 - smoothstep(2.05, 2.15, rr));
      anel *= 0.55 + 0.45 * sin(rr * 38.0);
      bool atras = pq.y > 0.0 && pd > cosR;
      if (!atras) c = mix(c, aneisCor, anel * 0.85);
    }
    if (pd > cosR) {
      float rho = length(pq);
      vec3 n = normalize(pq.x * pt + pq.y * pb + sqrt(max(0.0, 1.0 - rho * rho)) * planetaDir);
      float faixas = fbm(vec2(pq.x * 3.0 + tempo * 0.002, pq.y * 7.0)) ;
      float massa = fbm(pq * 4.5 + vec2(tempo * 0.003, 0.0));
      vec3 sup = mix(planetaCor, planetaCor2, smoothstep(0.45, 0.6, mix(faixas, massa, planetaMistura)));
      // nuvens brancas por cima (planeta azul) e lado iluminado pelo sol
      sup = mix(sup, vec3(0.95), smoothstep(0.62, 0.75, fbm(pq * 6.0 + 11.0)) * planetaNuvens);
      float luzP = clamp(dot(n, paraSol) * 0.9 + 0.25, 0.06, 1.0);
      vec3 cp = sup * luzP;
      // borda com atmosfera fininha
      cp += planetaCor * pow(rho, 6.0) * 0.35 * planetaNuvens;
      c = mix(c, cp, smoothstep(cosR, cosR + 0.0006, pd));
    }
  }

  // disco do sol
  float s = dot(d, paraSol);
  c = mix(c, vec3(1.25, 1.05, 0.8) * corSolTema, smoothstep(solLimiar.x, solLimiar.y, s));

  // lua com crateras
  float l = dot(d, paraLua);
  float disco = smoothstep(luaLimiar.x, luaLimiar.y, l);
  // as crateras (cinco camadas de ruído) só no disco: antes a conta ia em todo pixel do céu
  if (disco > 0.0) {
    vec3 lt = normalize(cross(paraLua, vec3(0.0, 1.0, 0.0)));
    vec3 lb = cross(lt, paraLua);
    // sem lua no tema (luaEscala 0): evita dividir por zero (o céu inteiro viraria NaN)
    vec2 lp = vec2(dot(d, lt), dot(d, lb)) * 400.0 / max(luaEscala, 0.001);
    float cratera = fbm(lp * 0.6) * 0.5 + 0.6;
    c = mix(c, vec3(0.86, 0.88, 0.95) * corLuaTema * cratera, disco);
  }
  c += vec3(0.5, 0.6, 0.9) * corLuaTema * pow(max(l, 0.0), 300.0) * 0.35 * noite * step(0.001, luaEscala);

  // nuvens de brinquedo (spec 012): fofas e redondas, borda definida, miolo mais claro
  if (h > 0.0 && fatorNuvens > 0.0) {
    vec2 uv = d.xz / (h + 0.12) * 1.6 + vec2(tempo * 0.006, tempo * 0.0025);
    float n = fbm(uv * 1.1) * 0.75 + fbm(uv * 3.1) * 0.25;
    float limiar = 0.55 - cobertura * 0.3;
    float nuvem = smoothstep(limiar, limiar + 0.025, n) * smoothstep(0.02, 0.2, h);
    float miolo = smoothstep(limiar, limiar + 0.16, n);
    float lado = pow(max(dot(d, paraSol), 0.0), 3.0);
    vec3 dia = mix(vec3(1.0, 0.98, 0.96) * corNuvens, corSol * 1.05, crepusculo * 0.75 + lado * 0.3);
    // beirada azulada e miolo branco: volume de algodão
    dia = mix(dia * vec3(0.86, 0.9, 0.98), dia, miolo);
    vec3 cn = mix(dia, ceuMeio * 0.35 + vec3(0.03), noite);
    cn = mix(cn, cn * vec3(0.55, 0.57, 0.62), smoothstep(0.4, 1.0, cobertura));
    c = mix(c, cn, nuvem * 0.92);
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
  'haloSol',
  'faixaCrep',
  'corCrep',
];

/** Uniformes só do domo do céu (astros do tema). */
const UNIFORMES_ASTROS = [
  'estrelasDia',
  'corEstrelas',
  'limiarEstrela',
  'corSolTema',
  'solLimiar',
  'corLuaTema',
  'luaLimiar',
  'luaEscala',
  'planetaDir',
  'planetaRaio',
  'planetaCor',
  'planetaCor2',
  'planetaMistura',
  'planetaNuvens',
  'aneisCor',
  'aneisInc',
  'corNuvens',
  'fatorNuvens',
];

/** Limiares (cosseno) de um disco: o raio angular base vezes a escala do tema. */
function limiarDisco(interno: number, externo: number, escala: number): Vector2 {
  if (escala <= 0) return new Vector2(2, 3); // nunca alcançado: sem disco
  return new Vector2(Math.cos(Math.acos(interno) * escala), Math.cos(Math.acos(externo) * escala));
}

/** Cores e vetores reaproveitados por material (o uniforme guarda a referência). */
const temporarios = new WeakMap<
  ShaderMaterial,
  { z: Color3; m: Color3; h: Color3; sol: Vector3; lua: Vector3; luz: Color3 }
>();

/** Passa o estado da atmosfera aos uniformes de céu de um ShaderMaterial (sem alocar por quadro). */
export function aplicarUniformesCeu(mat: ShaderMaterial, a: EstadoAtmosfera): void {
  let t = temporarios.get(mat);
  if (!t) {
    t = {
      z: new Color3(),
      m: new Color3(),
      h: new Color3(),
      sol: new Vector3(),
      lua: new Vector3(),
      luz: new Color3(),
    };
    temporarios.set(mat, t);
  }
  mat.setColor3('ceuZenite', t.z.set(...a.ceuZenite));
  mat.setColor3('ceuMeio', t.m.set(...a.ceuMeio));
  mat.setColor3('ceuHorizonte', t.h.set(...a.ceuHorizonte));
  mat.setVector3('paraSol', t.sol.set(...a.paraSol));
  mat.setVector3('paraLua', t.lua.set(...a.paraLua));
  mat.setColor3('corSol', t.luz.set(...a.luz));
  mat.setFloat('noite', a.noite);
  mat.setFloat('crepusculo', a.crepusculo);
  mat.setFloat('cobertura', a.cobertura);
  mat.setFloat('arcoIris', a.arco);
  const c = tema().ceu;
  mat.setFloat('haloSol', c.haloSol);
  mat.setFloat('faixaCrep', c.faixaCrepusculo);
  const cc = c.corCrepusculo ?? CREPUSCULO_PADRAO;
  mat.setColor3('corCrep', corCrepusculo.set(cc[0], cc[1], cc[2]));
}

const CREPUSCULO_PADRAO = [1.0, 0.45, 0.2] as const;
const corCrepusculo = new Color3();

/** Astros do tema: constantes do mundo, aplicadas uma vez. */
function aplicarAstros(mat: ShaderMaterial): void {
  const c = tema().ceu;
  const cor = (v: readonly number[]) => new Color3(v[0], v[1], v[2]);
  mat.setFloat('estrelasDia', c.estrelasDia);
  mat.setColor3('corEstrelas', cor(c.corEstrelas));
  // densidade 0.5 = 0.992 (o céu de sempre); 1 = o dobro de estrelas
  mat.setFloat('limiarEstrela', 1 - 0.016 * c.densidadeEstrelas);
  mat.setColor3('corSolTema', cor(c.corSol));
  mat.setVector2('solLimiar', limiarDisco(0.9988, 0.9993, c.tamanhoSol));
  mat.setColor3('corLuaTema', cor(c.corLua));
  mat.setVector2('luaLimiar', limiarDisco(0.9975, 0.998, c.tamanhoLua));
  mat.setFloat('luaEscala', c.tamanhoLua);
  const p = c.planeta;
  if (p) {
    mat.setVector3('planetaDir', new Vector3(...p.direcao).normalize());
    mat.setFloat('planetaRaio', p.raio);
    mat.setColor3('planetaCor', cor(p.cor));
    mat.setColor3('planetaCor2', cor(p.corSecundaria));
    mat.setFloat('planetaMistura', p.mistura ?? 1);
    mat.setFloat('planetaNuvens', p.nuvens ?? 0);
    mat.setColor3('aneisCor', cor(p.aneis?.cor ?? [0, 0, 0]));
    mat.setFloat('aneisInc', p.aneis?.inclinacao ?? 0);
  } else {
    mat.setVector3('planetaDir', new Vector3(0, 1, 0));
    mat.setFloat('planetaRaio', 0);
    mat.setColor3('planetaCor', new Color3());
    mat.setColor3('planetaCor2', new Color3());
    mat.setFloat('planetaMistura', 0);
    mat.setFloat('planetaNuvens', 0);
    mat.setColor3('aneisCor', new Color3());
    mat.setFloat('aneisInc', 0);
  }
  mat.setColor3('corNuvens', cor(c.corNuvens));
  mat.setFloat('fatorNuvens', c.fatorNuvens);
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
      uniforms: ['worldViewProjection', 'tempo', ...UNIFORMES_CEU, ...UNIFORMES_ASTROS],
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
  aplicarAstros(mat);
  return {
    malha: domo,
    atualizar(a, tempo) {
      aplicarUniformesCeu(mat, a);
      mat.setFloat('tempo', tempo);
    },
  };
}
