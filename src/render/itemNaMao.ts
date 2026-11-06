import { Color3, Color4 } from '@babylonjs/core/Maths/math.color';
import { Vector4 } from '@babylonjs/core/Maths/math.vector';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { RawTexture } from '@babylonjs/core/Materials/Textures/rawTexture';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import type { Scene } from '@babylonjs/core/scene';
import { gerarAtlas, type Atlas, type FaceBloco } from '../art/atlas';
import { obterItem } from '../jogo/itens';
import { extrudarGrade, gradeDoItem } from '../personagem/itemVoxel';

type V3 = [number, number, number];

export interface OpcoesItemNaMao {
  /** Prefixo dos nomes das malhas (o glow ignora 'braco-'). */
  nome: string;
  tamanhoBloco: number;
  /** Tamanho de um pixel do item em pixels 3D. */
  pixel: number;
  /** true: usa as luzes da cena; false: tons fixos, brilho por definirLuz. */
  iluminado: boolean;
  grupo: number;
  posBloco: V3;
  rotBloco: V3;
  posItem: V3;
  rotItem: V3;
}

export interface ItemNaMao {
  definir(bloco: number | null, item: string | null): void;
  /** Há algo na mão (bloco ou item)? */
  segurando(): boolean;
  definirVisivel(v: boolean): void;
  definirLuz(f: number): void;
  contarMalhas(): number;
  descartar(): void;
}

/** Tons por face da caixa (frente, trás, direita, esquerda, topo, base). */
export const tonsFaces = (v: number[]) => v.map((t) => new Color4(t, t * 0.98, t * 0.96, 1));

let atlasCache: Atlas | null = null;
function atlas(): Atlas {
  atlasCache ??= gerarAtlas();
  return atlasCache;
}

/** Bloco ou item (ferramenta, comida) em pixels 3D, preso a um nó "mão". */
export function criarItemNaMao(scene: Scene, mao: TransformNode, o: OpcoesItemNaMao): ItemNaMao {
  const a = atlas();
  const texAtlas = RawTexture.CreateRGBATexture(
    new Uint8Array(a.pixels.buffer),
    a.largura,
    a.altura,
    scene,
    false,
    false,
    Texture.NEAREST_SAMPLINGMODE,
  );
  const material = (nome: string) => {
    const m = new StandardMaterial(nome, scene);
    m.specularColor = Color3.Black();
    if (o.iluminado) {
      m.ambientColor = Color3.White();
      m.emissiveColor = new Color3(0.1, 0.1, 0.1);
    } else {
      m.disableLighting = true;
      m.emissiveColor = new Color3(1, 1, 1);
    }
    return m;
  };
  const matBloco = material(`${o.nome}-bloco-material`);
  matBloco.diffuseTexture = texAtlas;
  const matItem = material(`${o.nome}-item-material`);
  matItem.backFaceCulling = false;

  const preparar = (m: Mesh) => {
    m.isPickable = false;
    m.receiveShadows = false;
    m.renderingGroupId = o.grupo;
    m.alwaysSelectAsActiveMesh = !o.iluminado;
  };
  const bloco = MeshBuilder.CreateBox(
    `${o.nome}-bloco`,
    // iluminado: a luz da cena sombreia; sem luz: tons fixos por face
    {
      size: o.tamanhoBloco,
      faceColors: tonsFaces(o.iluminado ? [1, 1, 1, 1, 1, 1] : [0.8, 0.8, 0.64, 0.64, 1, 0.5]),
    },
    scene,
  );
  bloco.parent = mao;
  bloco.position.set(...o.posBloco);
  bloco.rotation.set(...o.rotBloco);
  bloco.material = matBloco;
  preparar(bloco);

  const itemNo = new TransformNode(`${o.nome}-item-no`, scene);
  itemNo.parent = mao;
  itemNo.position.set(...o.posItem);
  itemNo.rotation.set(...o.rotItem);
  const malhas = new Map<string, Mesh>();

  let visivel = true;
  let temBloco = false;
  let itemAtual: string | null = null;

  function malhaDoItem(id: string): Mesh | null {
    const pronta = malhas.get(id);
    if (pronta) return pronta;
    const def = obterItem(id);
    if (!def) return null;
    // ferramentas no tamanho cheio; comidas e materiais menores, na palma
    const px = def.tipo === 'ferramenta' ? o.pixel : o.pixel * 0.72;
    const v = extrudarGrade(gradeDoItem(def, { suavizarContorno: true }), px, px * 1.1);
    const m = new Mesh(`${o.nome}-item-${id}`, scene);
    const dados = new VertexData();
    dados.positions = v.posicoes;
    dados.normals = v.normais;
    dados.colors = v.cores;
    dados.indices = v.indices;
    dados.applyToMesh(m);
    m.material = matItem;
    m.parent = itemNo;
    // ferramenta: o cabo atravessa o punho (pixel (5, 10) do desenho no centro da mão)
    if (def.tipo === 'ferramenta') m.position.set(-(5 - 8) * px, -(8 - 10) * px, 0);
    else m.position.set(0, px * 3, 0);
    preparar(m);
    malhas.set(id, m);
    return m;
  }

  function aplicarFaces(b: number): void {
    const faces: FaceBloco[] = ['frente', 'lado', 'lado', 'lado', 'topo', 'base'];
    const faceUV = faces.map((f) => {
      const uv = a.uvDaFace(b, f) ?? a.uvDoBloco(b);
      return uv ? new Vector4(uv.u0, uv.v1, uv.u1, uv.v0) : new Vector4(0, 0, 1, 1);
    });
    const novo = MeshBuilder.CreateBox(`${o.nome}-tmp`, { size: o.tamanhoBloco, faceUV }, scene);
    const dados = novo.getVerticesData('uv');
    if (dados) bloco.setVerticesData('uv', dados, true);
    novo.dispose();
  }

  function atualizar(): void {
    bloco.setEnabled(visivel && temBloco);
    for (const [id, m] of malhas) m.setEnabled(visivel && !temBloco && id === itemAtual);
  }

  return {
    definir(b, item) {
      temBloco = b !== null && b !== 0;
      if (temBloco) aplicarFaces(b!);
      itemAtual = !temBloco && item && malhaDoItem(item) ? item : null;
      atualizar();
    },
    segurando: () => temBloco || itemAtual !== null,
    definirVisivel(v) {
      visivel = v;
      atualizar();
    },
    definirLuz(f) {
      if (o.iluminado) {
        // mesmo piso de luz do corpo que o segura
        for (const m of [matBloco, matItem]) {
          m.diffuseColor.set(0.78 * f, 0.78 * f, 0.78 * f);
          m.emissiveColor.set(0.36 * f, 0.35 * f, 0.34 * f);
        }
      } else {
        const v = Math.max(0.08, Math.min(1.1, f));
        for (const m of [matBloco, matItem]) m.emissiveColor.set(v, v * 0.97, v * 0.95);
      }
    },
    contarMalhas: () => (temBloco || itemAtual ? 1 : 0),
    descartar() {
      bloco.dispose();
      for (const m of malhas.values()) m.dispose();
      itemNo.dispose();
      matBloco.dispose();
      matItem.dispose();
      texAtlas.dispose();
    },
  };
}
