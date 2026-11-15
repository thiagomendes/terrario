/**
 * As peças da Vila Neon na tela (spec 026): tudo o que não é bloco (letreiros, parquinho,
 * carros, fliperama, palco) e os sósias de longe dos marcos.
 *
 * Regra do campo de visão (pedido do dono, 15 nov 2026; a lição dos carrinhos voando da 014):
 * - as peças de um chunk só nascem quando a malha dele está desenhada, e saem com ela; cada
 *   chunk vira poucas malhas (o corpo com a cor nos vértices, as luzes, e um quadro por
 *   letreiro), nascidas no máximo uma por quadro;
 * - os marcos altos (a grade de luzes do palco, a placa do rinque) têm sósia de longe com o
 *   próprio pedaço de chão, que só aparece enquanto nenhum chunk do marco está desenhado.
 *
 * O desenho de cada peça mora em `pecas.ts` e o dos sósias em `sosias.ts`; aqui só a vida das
 * malhas (nascer, sumir, contar).
 */
import type { Scene } from '@babylonjs/core/scene';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { criarPlasticos } from '../formas';
import { Pecas } from '../solidos';
import type { PecaVila, PlanoVila } from '../../world/vilaNeon';
import { desenharPeca, type Desenho, type QuadroDesenhado } from './pecas';
import { criarSosias, type Sosias } from './sosias';

export interface OpcoesRenderVila {
  /** A malha do chunk está desenhada? */
  temMalha(cx: number, cz: number): boolean;
  /** A malha brilha no glow (neon, lâmpadas). */
  brilha?(m: Mesh): void;
  /** A malha não brilha mas tapa o brilho do que fica atrás. */
  tapaOGlow?(m: Mesh): void;
  /** Uma peça por quadro no celular; no computador, até 2. */
  porQuadro?: number;
}

interface ChunkVivo {
  cx: number;
  cz: number;
  malhas: Mesh[];
  texturas: DynamicTexture[];
}

export interface RenderVila {
  /** Uma vez por quadro: nasce ou some o que mudou, e anima. */
  quadro(t: number, x: number, z: number, noite: number): void;
  /** Peças visíveis em chunk sem malha (teste do campo de visão; sempre 0). */
  semChao(): number;
  /** Quantos chunks e malhas vivos (medida). */
  contagem(): { chunks: number; malhas: number; triangulos: number; sosias: number };
  sosias: Sosias;
  descartar(): void;
}

const chave = (cx: number, cz: number) => `${cx},${cz}`;

export function criarRenderVila(
  scene: Scene,
  plano: PlanoVila,
  opcoes: OpcoesRenderVila,
): RenderVila {
  const pl = criarPlasticos(scene, 'vila');
  const matCorpo = pl.corVertice(0.3) ?? pl.cor('#ffffff', 0.3);
  // as luzes (neon, lâmpadas, telas): acesas, a cor no vértice, sem luz de cena
  const matLuz = new StandardMaterial('vila-luz', scene);
  matLuz.disableLighting = true;
  matLuz.emissiveColor = Color3.White();
  matLuz.diffuseColor = Color3.Black();
  matLuz.specularColor = Color3.Black();
  /** As peças agrupadas por chunk (fixas: o plano não muda). */
  const porChunk = new Map<string, PecaVila[]>();
  for (const p of plano.pecas) {
    const k = chave(Math.floor(p.x / 16), Math.floor(p.z / 16));
    const l = porChunk.get(k);
    if (l) l.push(p);
    else porChunk.set(k, [p]);
  }
  const vivos = new Map<string, ChunkVivo>();
  const porQuadro = opcoes.porQuadro ?? 1;

  /** Monta o chunk: o corpo, as luzes e os quadros (letreiros). */
  function montar(cx: number, cz: number, lista: readonly PecaVila[]): ChunkVivo {
    const ox = cx * 16;
    const oz = cz * 16;
    const corpo = new Pecas();
    const luz = new Pecas();
    const quadros: QuadroDesenhado[] = [];
    for (const p of lista) {
      const d: Desenho = { corpo, luz, quadros, ox, oz };
      desenharPeca(p, d);
    }
    const malhas: Mesh[] = [];
    const texturas: DynamicTexture[] = [];
    const fazer = (pecas: Pecas, nome: string, mat: StandardMaterial) => {
      if (!pecas.partes.length) return null;
      const m = new Mesh(nome, scene);
      pecas.juntar().applyToMesh(m);
      m.material = mat;
      m.position.set(ox, 0, oz);
      m.isPickable = false;
      m.hasVertexAlpha = false;
      m.freezeWorldMatrix();
      malhas.push(m);
      return m;
    };
    const mc = fazer(corpo, `vila-pecas-${cx},${cz}`, matCorpo);
    if (mc) {
      mc.receiveShadows = true;
      opcoes.tapaOGlow?.(mc);
    }
    const ml = fazer(luz, `vila-luzes-${cx},${cz}`, matLuz);
    if (ml) opcoes.brilha?.(ml);
    for (const q of quadros) {
      const tex = new DynamicTexture(
        `vila-quadro-${cx},${cz}-${malhas.length}`,
        { width: q.largura, height: q.altura },
        scene,
        true,
      );
      const g = tex.getContext() as unknown as CanvasRenderingContext2D;
      q.pintar(g);
      tex.update(true);
      tex.wrapU = Texture.CLAMP_ADDRESSMODE;
      tex.wrapV = Texture.CLAMP_ADDRESSMODE;
      const mat = new StandardMaterial(`vila-quadro-mat`, scene);
      mat.specularColor = Color3.Black();
      if (q.aceso) {
        mat.disableLighting = true;
        mat.emissiveTexture = tex;
        mat.diffuseColor = Color3.Black();
      } else {
        mat.diffuseTexture = tex;
        mat.emissiveColor = new Color3(0.32, 0.32, 0.32);
      }
      const m = new Mesh(`vila-quadro-${cx},${cz}`, scene);
      const vd = new VertexData();
      const w = q.w / 2;
      const h = q.h / 2;
      vd.positions = [-w, -h, 0, w, -h, 0, w, h, 0, -w, h, 0];
      vd.normals = [0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1];
      vd.uvs = [0, 0, 1, 0, 1, 1, 0, 1];
      vd.indices = [0, 2, 1, 0, 3, 2];
      vd.applyToMesh(m);
      m.material = mat;
      m.position.set(q.x, q.y, q.z);
      m.rotation.y = q.giro;
      m.isPickable = false;
      m.freezeWorldMatrix();
      if (q.aceso) opcoes.brilha?.(m);
      malhas.push(m);
      texturas.push(tex);
    }
    return { cx, cz, malhas, texturas };
  }

  function soltar(v: ChunkVivo): void {
    for (const m of v.malhas) {
      const mat = m.material;
      m.dispose();
      if (mat && mat !== matCorpo && mat !== matLuz) mat.dispose();
    }
    for (const t of v.texturas) t.dispose();
  }

  const sosias = criarSosias(scene, plano, opcoes);
  let semChao = 0;

  return {
    sosias,
    quadro(t, x, z, noite) {
      // some o que perdeu o chão (sempre, no mesmo quadro: nada fica sem chão embaixo)
      for (const [k, v] of vivos)
        if (!opcoes.temMalha(v.cx, v.cz)) {
          soltar(v);
          vivos.delete(k);
        }
      // nasce o que ganhou chão, primeiro o mais perto (no máximo `porQuadro` por quadro)
      const faltam: [number, string, number, number][] = [];
      for (const k of porChunk.keys()) {
        if (vivos.has(k)) continue;
        const [cx, cz] = k.split(',').map(Number);
        if (!opcoes.temMalha(cx, cz)) continue;
        faltam.push([Math.hypot(cx * 16 + 8 - x, cz * 16 + 8 - z), k, cx, cz]);
      }
      faltam.sort((a, b) => a[0] - b[0]);
      for (const [, k, cx, cz] of faltam.slice(0, porQuadro))
        vivos.set(k, montar(cx, cz, porChunk.get(k)!));
      sosias.quadro(t, x, z, noite);
      semChao = 0;
      for (const v of vivos.values())
        if (!opcoes.temMalha(v.cx, v.cz)) semChao += v.malhas.filter((m) => m.isEnabled()).length;
    },
    semChao: () => semChao,
    contagem() {
      let malhas = 0;
      let triangulos = 0;
      for (const v of vivos.values())
        for (const m of v.malhas) {
          malhas++;
          triangulos += (m.getTotalIndices() / 3) | 0;
        }
      return { chunks: vivos.size, malhas, triangulos, sosias: sosias.visiveis() };
    },
    descartar() {
      for (const v of vivos.values()) soltar(v);
      vivos.clear();
      sosias.descartar();
      matLuz.dispose();
      pl.descartar();
    },
  };
}
