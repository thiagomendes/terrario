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
import type { Vista } from '../player/animacao';

/** Dados extras para suavizar a pose do corpo em terceira pessoa. */
export interface ExtrasPose {
  dt: number;
  /** Pitch da câmera: a cabeça acompanha o olhar. */
  olhar: number;
  vista: Vista;
}
import { gerarTexturaParte } from '../personagem/textura';

export const MAXIMO_MALHAS_PERSONAGEM = 12;

export interface Personagem {
  raiz: TransformNode;
  aplicarAparencia(aparencia: Aparencia): void;
  aplicarPose(pose: Pose, extras?: ExtrasPose): void;
  posicionar(x: number, y: number, z: number, yaw: number): void;
  definirVisivel(visivel: boolean): void;
  definirLuz(f: number): void;
  contarMalhas(): number;
  descartar(): void;
}

interface ParteViva {
  nome: NomeParte;
  no: TransformNode;
  malha: Mesh;
  material: StandardMaterial;
  textura: RawTexture;
}

export function criarPersonagem(scene: Scene, aparencia: Aparencia): Personagem {
  const raiz = new TransformNode('personagem', scene);
  const corpo = new TransformNode('personagem-corpo', scene);
  corpo.parent = raiz;

  let partes: ParteViva[] = [];
  let visivel = true;

  function limparPartes(): void {
    for (const p of partes) {
      p.malha.dispose();
      p.no.dispose();
      p.material.dispose();
      p.textura.dispose();
    }
    partes = [];
  }

  function aplicarAparencia(nova: Aparencia): void {
    limparPartes();
    for (const parte of montarPartes(nova)) {
      const tex = gerarTexturaParte(nova, parte);
      const textura = RawTexture.CreateRGBATexture(
        new Uint8Array(tex.pixels.buffer),
        tex.largura,
        tex.altura,
        scene,
        false,
        false,
        Constants.TEXTURE_NEAREST_SAMPLINGMODE,
      );
      textura.wrapU = Texture.CLAMP_ADDRESSMODE;
      textura.wrapV = Texture.CLAMP_ADDRESSMODE;
      const material = new StandardMaterial(`personagem-material-${parte.nome}`, scene);
      material.diffuseTexture = textura;
      material.emissiveColor = Color3.Black();
      material.specularColor = Color3.Black();
      material.ambientColor = Color3.White();
      const faceUV = tex.faces.map(
        (f) =>
          new Vector4(
            f.x / tex.largura,
            (f.y + f.h) / tex.altura,
            (f.x + f.w) / tex.largura,
            f.y / tex.altura,
          ),
      );
      const malha = MeshBuilder.CreateBox(
        `personagem-${parte.nome}`,
        {
          width: parte.tamanho[0],
          height: parte.tamanho[1],
          depth: parte.tamanho[2],
          faceUV,
          wrap: true,
        },
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
      partes.push({ nome: parte.nome, no, malha, material, textura });
    }
  }

  /** Ângulos atuais por parte, suavizados para não haver saltos entre poses. */
  const angulos = new Map<NomeParte, number>();
  let inclinacao = 0;

  function aplicarPose(pose: Pose, extras?: ExtrasPose): void {
    const dt = extras ? Math.min(Math.max(extras.dt, 0), 0.1) : 1;
    const k = extras ? 1 - Math.exp(-dt * 14) : 1;
    const v = extras?.vista;
    const respira = v ? Math.sin(v.tempo * 1.6) * 0.012 * (1 - Math.min(1, v.passada)) : 0;
    const bob = v
      ? -Math.abs(Math.sin(v.tempo * (v.passada > 1.2 ? 2.4 : 1.6) * Math.PI)) *
        0.04 *
        Math.min(1, v.passada)
      : 0;
    corpo.position.y = pose.tronco + respira + bob;
    // inclina o tronco para a frente ao correr
    const alvoInc = v ? Math.max(0, v.passada - 1) * 0.28 : 0;
    inclinacao += (alvoInc - inclinacao) * k;
    corpo.rotation.x = inclinacao;
    const olhar = extras ? Math.max(-0.9, Math.min(0.9, extras.olhar)) : 0;
    for (const p of partes) {
      let alvo = 0;
      switch (p.nome) {
        case 'bracoDireito':
          alvo = pose.bracoDireito;
          break;
        case 'bracoEsquerdo':
          alvo = pose.bracoEsquerdo + (v ? Math.sin(v.tempo * 1.1) * 0.04 : 0);
          break;
        case 'pernaDireita':
          alvo = pose.pernaDireita;
          break;
        case 'pernaEsquerda':
          alvo = pose.pernaEsquerda;
          break;
        case 'cabeca':
        case 'cabelo':
        case 'acessorio':
          alvo =
            p.nome === 'acessorio' && isLanterna(p)
              ? pose.bracoEsquerdo
              : pose.cabeca + olhar * 0.75 - inclinacao;
          break;
        default:
          alvo = 0;
      }
      const atual = angulos.get(p.nome) ?? alvo;
      const novo = atual + (alvo - atual) * k;
      angulos.set(p.nome, novo);
      p.no.rotation.x = novo;
      // braços abrem levemente para não atravessar o tronco
      if (p.nome === 'bracoDireito') p.no.rotation.z = -0.06;
      if (p.nome === 'bracoEsquerdo') p.no.rotation.z = 0.06;
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
    definirLuz(f) {
      for (const p of partes) p.material.diffuseColor.set(f, f, f);
    },
    definirVisivel(v) {
      visivel = v;
      for (const p of partes) p.malha.setEnabled(v);
    },
    contarMalhas: () => partes.length,
    descartar() {
      limparPartes();
      corpo.dispose();
      raiz.dispose();
    },
  };
}
