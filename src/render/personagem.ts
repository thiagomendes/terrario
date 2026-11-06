import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Vector4 } from '@babylonjs/core/Maths/math.vector';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { RawTexture } from '@babylonjs/core/Materials/Textures/rawTexture';
import { Constants } from '@babylonjs/core/Engines/constants';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import type { Scene } from '@babylonjs/core/scene';
import type { Aparencia } from '../personagem/aparencia';
import { montarPartes, type NomeParte } from '../personagem/modelo';
import type { Pose } from '../personagem/poses';
import { ALTURA_TEXTURA, LARGURA_TEXTURA, REGIOES, gerarTextura } from '../personagem/textura';

export const MAXIMO_MALHAS_PERSONAGEM = 12;

export interface Personagem {
  raiz: TransformNode;
  aplicarAparencia(aparencia: Aparencia): void;
  aplicarPose(pose: Pose): void;
  posicionar(x: number, y: number, z: number, yaw: number): void;
  definirVisivel(visivel: boolean): void;
  contarMalhas(): number;
  descartar(): void;
}

interface ParteViva {
  nome: NomeParte;
  no: TransformNode;
  malha: Mesh;
}

export function criarPersonagem(scene: Scene, aparencia: Aparencia): Personagem {
  const raiz = new TransformNode('personagem', scene);
  const corpo = new TransformNode('personagem-corpo', scene);
  corpo.parent = raiz;

  const textura = RawTexture.CreateRGBATexture(
    new Uint8Array(LARGURA_TEXTURA * ALTURA_TEXTURA * 4),
    LARGURA_TEXTURA,
    ALTURA_TEXTURA,
    scene,
    false,
    false,
    Constants.TEXTURE_NEAREST_SAMPLINGMODE,
  );
  textura.wrapU = Texture.CLAMP_ADDRESSMODE;
  textura.wrapV = Texture.CLAMP_ADDRESSMODE;

  const material = new StandardMaterial('personagem-material', scene);
  material.diffuseTexture = textura;
  material.emissiveColor = Color3.Black();
  material.specularColor = Color3.Black();

  let partes: ParteViva[] = [];
  let visivel = true;

  function limparPartes(): void {
    for (const p of partes) {
      p.malha.dispose();
      p.no.dispose();
    }
    partes = [];
  }

  function aplicarAparencia(nova: Aparencia): void {
    limparPartes();
    textura.update(new Uint8Array(gerarTextura(nova)));
    for (const parte of montarPartes(nova)) {
      const r = REGIOES[parte.nome];
      const u0 = r.x / LARGURA_TEXTURA;
      const u1 = (r.x + r.w) / LARGURA_TEXTURA;
      const v0 = 1 - (r.y + r.h) / ALTURA_TEXTURA;
      const v1 = 1 - r.y / ALTURA_TEXTURA;
      const faceUV = Array.from({ length: 6 }, () => new Vector4(u0, v0, u1, v1));
      const malha = MeshBuilder.CreateBox(
        `personagem-${parte.nome}`,
        { width: parte.tamanho[0], height: parte.tamanho[1], depth: parte.tamanho[2], faceUV },
        scene,
      );
      const no = new TransformNode(`personagem-pivo-${parte.nome}`, scene);
      no.parent = corpo;
      no.position.set(parte.pivo[0], parte.pivo[1], parte.pivo[2]);
      malha.parent = no;
      malha.position.set(
        parte.posicao[0] - parte.pivo[0],
        parte.posicao[1] - parte.pivo[1],
        parte.posicao[2] - parte.pivo[2],
      );
      malha.material = material;
      malha.isPickable = false;
      malha.receiveShadows = false;
      malha.renderingGroupId = 0;
      malha.setEnabled(visivel);
      partes.push({ nome: parte.nome, no, malha });
    }
  }

  function aplicarPose(pose: Pose): void {
    corpo.position.y = pose.tronco;
    for (const p of partes) {
      let angulo = 0;
      switch (p.nome) {
        case 'bracoDireito':
          angulo = pose.bracoDireito;
          break;
        case 'bracoEsquerdo':
          angulo = pose.bracoEsquerdo;
          break;
        case 'pernaDireita':
          angulo = pose.pernaDireita;
          break;
        case 'pernaEsquerda':
          angulo = pose.pernaEsquerda;
          break;
        case 'cabeca':
        case 'cabelo':
        case 'acessorio':
          angulo = p.nome === 'acessorio' && isLanterna(p) ? pose.bracoEsquerdo : pose.cabeca;
          break;
        default:
          angulo = 0;
      }
      p.no.rotation.x = angulo;
    }
  }

  function isLanterna(p: ParteViva): boolean {
    return p.no.position.x < 0 && p.no.position.y > 1;
  }

  aplicarAparencia(aparencia);

  return {
    raiz,
    aplicarAparencia,
    aplicarPose,
    posicionar(x, y, z, yaw) {
      raiz.position.set(x, y, z);
      raiz.rotation.y = yaw;
    },
    definirVisivel(v) {
      visivel = v;
      for (const p of partes) p.malha.setEnabled(v);
    },
    contarMalhas: () => partes.length,
    descartar() {
      limparPartes();
      material.dispose();
      textura.dispose();
      corpo.dispose();
      raiz.dispose();
    },
  };
}
