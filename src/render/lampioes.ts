/**
 * Spec 027 (T06, decisão do orquestrador): o lampião de abóbora posto (o bloco 66, em todo mundo)
 * e o caldeirão posto (o bloco 127, só da Noite das Fantasias) viram a peça arredondada de
 * brinquedo, no lugar do cubo: o lampião da família da abóbora gigante, com o rosto de cada tema
 * (o Rancho Alegre mantém a carinha de festa junina dele; os outros mundos, o sorriso de olhos
 * redondos), e o caldeirão facetado com a poção roxa borbulhando.
 *
 * - **Nada muda no terreno, no salvamento nem na rede:** é o mesmo bloco (a mesma luz, a mesma
 *   colisão); só o desenho. A malha do chunk não desenha o cubo deles (`malha.ts`).
 * - **Instanciados por pedaço:** cada tipo é uma malha só por chunk, desenhada várias vezes
 *   (as instâncias finas da Babylon): cem lampiões e cem caldeirões num pedaço são duas chamadas
 *   de desenho. Fora do glow (o rosto já vem aceso pela cor que brilha).
 * - **O rosto aceso:** uma malha só, um material só: o corpo com a cor nos vértices e o rosto com a
 *   cor que brilha (a textura que brilha de 2 pontos: o corpo apagado, o rosto aceso).
 */
import type { Scene } from '@babylonjs/core/scene';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
// (as instâncias finas: um pedaço do Babylon que só entra importado)
import '@babylonjs/core/Meshes/thinInstanceMesh';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { RawTexture } from '@babylonjs/core/Materials/Textures/rawTexture';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Matrix } from '@babylonjs/core/Maths/math.vector';
import { Bloco } from '../world/blocks';
import { ALTURA, TAM_X, TAM_Z, indice } from '../world/chunk';
import type { IdTema } from '../temas/tipos';
import { Pecas } from './solidos';
import { abobora, CORES, refDaPeca, rostoDaAbobora, type Carinha } from './baile/pecas';
import type { Desenho } from './vila/ref';

/** O rosto do lampião de cada tema (o Rancho mantém a carinha de festa junina). */
export const ROSTO_DO_LAMPIAO: Readonly<Record<IdTema | 'base', Carinha>> = {
  'rancho-alegre': 'junina',
  'vila-neon': 'sorriso',
  'cidade-grande': 'sorriso',
  'doce-reino': 'sorriso',
  'exploracao-lunar': 'sorriso',
  'noite-das-fantasias': 'sorriso',
  base: 'sorriso',
};

/** A cor acesa do rosto (a do lampião do Rancho, a mesma de antes: o tom do rosto do tile). */
export const COR_ROSTO_LAMPIAO = '#ffd060';

/** Os blocos desenhados como peça (a malha do chunk não desenha o cubo deles). */
export const BLOCOS_PECA: ReadonlySet<number> = new Set([Bloco.LAMPIAO_ABOBORA, Bloco.CALDEIRAO]);

const LADO_LAMPIAO = 0.86;

/** Um desenho vazio na origem (a peça montada em volta de 0, 0, 0). */
function desenhoNaOrigem(): Desenho & { dia: Pecas; noite: Pecas } {
  return {
    corpo: new Pecas(),
    luz: new Pecas(),
    noite: new Pecas(),
    dia: new Pecas(),
    vidro: new Pecas(),
    quadros: [],
    ox: 0,
    oz: 0,
    chao: 0,
    recorte: { x0: -1e9, z0: -1e9, x1: 1e9, z1: 1e9 },
  };
}

/** Junta o corpo (UV no ponto apagado) e o que brilha (UV no ponto aceso) numa malha só. */
/** Os pontos da textura que brilha: o corpo apagado, o rosto do lampião e a poção do caldeirão. */
const U_APAGADO = 1 / 6;
const U_ROSTO = 3 / 6;
const U_POCAO = 5 / 6;

function juntarComBrilho(corpo: Pecas, brilho: Pecas, uBrilho: number): VertexData {
  const partes: VertexData[] = [];
  const marcar = (p: Pecas, u: number) => {
    if (!p.partes.length) return;
    const vd = p.juntar();
    const n = (vd.positions as number[]).length / 3;
    vd.uvs = new Array(n * 2).fill(0).map((_, i) => (i % 2 ? 0.5 : u));
    partes.push(vd);
  };
  marcar(corpo, U_APAGADO);
  marcar(brilho, uBrilho);
  const [a, ...resto] = partes;
  if (resto.length) a.merge(resto, true);
  return a;
}

/** O modelo do lampião (a base no chão da célula, o rosto para +z). */
export function modeloLampiao(rosto: Carinha): VertexData {
  const d = desenhoNaOrigem();
  const r = refDaPeca(d, { tipo: 'banco', x: 0, y: 0, z: 0, dir: 0 });
  // (um tico acima do chão: o fundo da bola não afunda no bloco de baixo)
  abobora(r, 0, 0.03, 0, LADO_LAMPIAO, 8);
  rostoDaAbobora(r, d, [0, 0.03, 0], LADO_LAMPIAO, 8, rosto, 'sempre');
  return juntarComBrilho(d.corpo, d.luz, U_ROSTO);
}

/** O modelo do caldeirão de brinquedo: facetado, a poção roxa e as bolhas lilás. */
export function modeloCaldeirao(): VertexData {
  const d = desenhoNaOrigem();
  const r = refDaPeca(d, { tipo: 'banco', x: 0, y: 0, z: 0, dir: 0 }, 0.84);
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * Math.PI * 2 + 0.5;
    r.caixa(0.16, 0.18, 0.16, Math.cos(a) * 0.42, 0, Math.sin(a) * 0.42, '#2e2a36', 0.03);
  }
  r.prisma(10, 0.42, 0.14, 0, 0.16, 0, '#3e3652', 'y');
  r.prisma(10, 0.56, 0.36, 0, 0.4, 0, '#4a4060', 'y');
  r.prisma(10, 0.5, 0.16, 0, 0.66, 0, '#443a5a', 'y');
  r.prisma(10, 0.56, 0.1, 0, 0.78, 0, '#5c5274', 'y');
  // a poção acesa de leve (a cor que brilha) e as bolhas lilás de plástico, baixinhas (acesas,
  // de noite elas pareciam dois olhos no escuro)
  const brilho = refDaPeca({ ...d, corpo: d.luz }, { tipo: 'banco', x: 0, y: 0, z: 0, dir: 0 }, 0.84);
  brilho.prisma(10, 0.48, 0.06, 0, 0.84, 0, '#9a5ad6', 'y');
  for (const [x, z, t] of [
    [0.16, 0.06, 0.12],
    [-0.18, -0.12, 0.1],
    [0.02, -0.24, 0.08],
    [-0.08, 0.2, 0.09],
    [0.24, -0.16, 0.07],
  ] as const)
    r.caixa(t, t * 0.6, t, x, 0.88, z, '#c8a4f0', t / 2.2);
  r.barra([0.24, 0.8, 0.14], [0.5, 1.3, 0.34], 0.06, CORES.madeira);
  return juntarComBrilho(d.corpo, d.luz, U_POCAO);
}

export interface Lampioes {
  /**
   * Refaz as instâncias do chunk (depois que a malha dele mudou): `base` são os blocos gerados
   * do chunk e `edicoes` as edições dele (índice local → valor empacotado: bloco | meta << 8).
   */
  chunk(cx: number, cz: number, base: Uint8Array, edicoes: ReadonlyArray<readonly [number, number]>): void;
  /** O chunk saiu da tela. */
  soltar(cx: number, cz: number): void;
  /** Quantas instâncias e malhas vivas (testes e medida). */
  contagem(): { malhas: number; lampioes: number; caldeiroes: number };
  descartar(): void;
}

/**
 * As peças arredondadas dos blocos postos, por chunk. `metaGerada` dá a direção que a geração pôs
 * (os lampiões das portas da vila); `rosto` é o do tema do mundo.
 */
export function criarLampioes(
  scene: Scene,
  rosto: Carinha,
  metaGerada: (x: number, y: number, z: number) => number,
  aoCriar?: (m: Mesh) => void,
): Lampioes {
  // o corpo de plástico com a cor nos vértices; o rosto (amarelo de vela) e a poção (roxa, de
  // leve) acesos pela textura de três pontos
  const tex = RawTexture.CreateRGBTexture(
    new Uint8Array([0, 0, 0, 255, 208, 96, 110, 50, 170]),
    3,
    1,
    scene,
    false,
    false,
    Texture.NEAREST_SAMPLINGMODE,
  );
  const mat = new StandardMaterial('lampioes', scene);
  mat.diffuseColor = new Color3(0.86, 0.86, 0.86);
  mat.specularColor = new Color3(0.16, 0.16, 0.16);
  // o piso de luz do plástico das peças (sem ele, o corpo ficava escuro no entardecer); o rosto
  // soma a cor que brilha da textura
  mat.emissiveColor = new Color3(0.32, 0.32, 0.32);
  mat.emissiveTexture = tex;
  const modelos: Record<number, VertexData> = {
    [Bloco.LAMPIAO_ABOBORA]: modeloLampiao(rosto),
    [Bloco.CALDEIRAO]: modeloCaldeirao(),
  };
  const vivos = new Map<string, Mesh[]>();
  const contas = new Map<string, [number, number]>();
  const chave = (cx: number, cz: number) => `${cx},${cz}`;

  function soltar(cx: number, cz: number) {
    const k = chave(cx, cz);
    vivos.get(k)?.forEach((m) => m.dispose());
    vivos.delete(k);
    contas.delete(k);
  }

  return {
    chunk(cx, cz, base, edicoes) {
      soltar(cx, cz);
      const achados: Record<number, number[]> = { [Bloco.LAMPIAO_ABOBORA]: [], [Bloco.CALDEIRAO]: [] };
      const x0 = cx * TAM_X;
      const z0 = cz * TAM_Z;
      const camada = TAM_X * TAM_Z;
      // o que a geração pôs (com a direção da geração) e, por cima, o que foi editado
      const celulas = new Map<number, [number, number]>();
      for (let i = 0; i < base.length; i++) {
        const id = base[i];
        if (id !== Bloco.LAMPIAO_ABOBORA && id !== Bloco.CALDEIRAO) continue;
        const y = Math.floor(i / camada);
        const z = Math.floor((i % camada) / TAM_X);
        const x = i % TAM_X;
        celulas.set(i, [id, metaGerada(x0 + x, y, z0 + z)]);
      }
      for (const [i, v] of edicoes) {
        const id = v & 255;
        if (id === Bloco.LAMPIAO_ABOBORA || id === Bloco.CALDEIRAO) celulas.set(i, [id, (v >> 8) & 255]);
        else celulas.delete(i);
      }
      for (const [i, [id, meta]] of celulas) {
        const y = Math.floor(i / camada);
        const z = Math.floor((i % camada) / TAM_X);
        const x = i % TAM_X;
        if (y < 1 || y >= ALTURA || indice(x, y, z) !== i) continue;
        // o rosto para a direção do bloco (0 +z, 1 +x, 2 -z, 3 -x)
        const m = Matrix.RotationY(((meta & 3) * Math.PI) / 2).multiply(
          Matrix.Translation(x0 + x + 0.5, y, z0 + z + 0.5),
        );
        achados[id].push(...m.toArray());
      }
      const malhas: Mesh[] = [];
      for (const id of [Bloco.LAMPIAO_ABOBORA, Bloco.CALDEIRAO]) {
        const lista = achados[id];
        if (!lista.length) continue;
        const malha = new Mesh(`lampioes-${id}-${cx},${cz}`, scene);
        modelos[id].applyToMesh(malha);
        malha.material = mat;
        malha.isPickable = false;
        malha.thinInstanceSetBuffer('matrix', new Float32Array(lista), 16, true);
        malha.receiveShadows = true;
        aoCriar?.(malha);
        malhas.push(malha);
      }
      const k = chave(cx, cz);
      if (malhas.length) vivos.set(k, malhas);
      contas.set(k, [achados[Bloco.LAMPIAO_ABOBORA].length / 16, achados[Bloco.CALDEIRAO].length / 16]);
    },
    soltar,
    contagem() {
      let malhas = 0;
      let lampioes = 0;
      let caldeiroes = 0;
      for (const l of vivos.values()) malhas += l.length;
      for (const [a, b] of contas.values()) {
        lampioes += a;
        caldeiroes += b;
      }
      return { malhas, lampioes, caldeiroes };
    },
    descartar() {
      for (const l of vivos.values()) l.forEach((m) => m.dispose());
      vivos.clear();
      mat.dispose();
      tex.dispose();
    },
  };
}
