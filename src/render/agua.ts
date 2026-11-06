import { Effect } from '@babylonjs/core/Materials/effect';
import { ShaderMaterial } from '@babylonjs/core/Materials/shaderMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import type { Scene } from '@babylonjs/core/scene';
import type { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { EstadoAtmosfera } from './atmosfera';
import { GLSL_CEU, UNIFORMES_CEU, aplicarUniformesCeu } from './ceu';
import { NIVEL_MAR } from '../world/chunk';

/** Superfície do mar (topo da água no nível do mar). */
export const ALTURA_AGUA = NIVEL_MAR + 0.875;

const VERTICE = /* glsl */ `
precision highp float;
attribute vec3 position;
uniform mat4 world;
uniform mat4 viewProjection;
varying vec3 vPos;
void main() {
  vec4 p = world * vec4(position, 1.0);
  vPos = p.xyz;
  gl_Position = viewProjection * p;
}
`;

const FRAGMENTO = /* glsl */ `
precision highp float;
varying vec3 vPos;
uniform vec3 camPos;
uniform float tempo;
uniform vec3 corNevoa;
uniform float densNevoa;
uniform float luzDia;
${GLSL_CEU}

float onda(vec2 p, vec2 dir, float freq, float vel) {
  return sin(dot(p, dir) * freq + tempo * vel);
}

void main() {
  vec2 p = vPos.xz;
  // normal por soma de ondas (derivadas analiticas aproximadas)
  vec2 g = vec2(0.0);
  vec2 dirs[4];
  dirs[0] = normalize(vec2(1.0, 0.3));
  dirs[1] = normalize(vec2(-0.4, 1.0));
  dirs[2] = normalize(vec2(0.7, -0.8));
  dirs[3] = normalize(vec2(-1.0, -0.2));
  float f[4];
  f[0] = 0.9; f[1] = 1.7; f[2] = 3.1; f[3] = 5.3;
  for (int i = 0; i < 4; i++) {
    float a = 0.06 / (1.0 + float(i));
    g += dirs[i] * cos(dot(p, dirs[i]) * f[i] + tempo * (1.2 + float(i) * 0.5)) * f[i] * a;
  }
  vec3 n = normalize(vec3(-g.x, 1.0, -g.y));
  vec3 v = normalize(camPos - vPos);
  float fres = 0.04 + 0.96 * pow(1.0 - max(dot(n, v), 0.0), 5.0);
  vec3 r = reflect(-v, n);
  r.y = abs(r.y);
  vec3 ceu = corDoCeu(r);
  vec3 fundo = mix(vec3(0.015, 0.04, 0.09), vec3(0.03, 0.22, 0.45), luzDia);
  vec3 c = mix(fundo, ceu * vec3(0.7, 0.88, 1.0), clamp(fres * 0.8 + 0.08, 0.0, 0.85));
  float brilho = pow(max(dot(r, paraSol), 0.0), 350.0) * 3.0 * (1.0 - noite);
  brilho += pow(max(dot(r, paraLua), 0.0), 600.0) * 1.2 * noite;
  c += corSol * brilho;
  float alfa = clamp(0.74 + fres * 0.25 + brilho, 0.0, 1.0);
  float dist = length(camPos - vPos);
  float nev = exp(-pow(dist * densNevoa, 2.0));
  c = mix(corNevoa, c, nev);
  gl_FragColor = vec4(c, alfa);
}
`;

let registrado = false;

export interface Agua {
  material: ShaderMaterial;
  atualizar(a: EstadoAtmosfera, tempo: number, cam: Vector3): void;
}

/** Material da água (aplicado às malhas de água dos chunks). */
export function criarAgua(scene: Scene): Agua {
  if (!registrado) {
    Effect.ShadersStore['aguaVertexShader'] = VERTICE;
    Effect.ShadersStore['aguaFragmentShader'] = FRAGMENTO;
    registrado = true;
  }
  const mat = new ShaderMaterial(
    'agua',
    scene,
    { vertex: 'agua', fragment: 'agua' },
    {
      attributes: ['position'],
      uniforms: [
        'world',
        'viewProjection',
        'camPos',
        'tempo',
        'corNevoa',
        'densNevoa',
        'luzDia',
        ...UNIFORMES_CEU,
      ],
      needAlphaBlending: true,
    },
  );
  mat.backFaceCulling = false;
  const cor = new Color3();
  return {
    material: mat,
    atualizar(a, tempo, cam) {
      aplicarUniformesCeu(mat, a);
      mat.setFloat('tempo', tempo);
      mat.setVector3('camPos', cam);
      cor.set(...a.nevoa);
      mat.setColor3('corNevoa', cor);
      mat.setFloat('densNevoa', a.densidadeNevoa);
      mat.setFloat('luzDia', 1 - a.noite);
    },
  };
}
