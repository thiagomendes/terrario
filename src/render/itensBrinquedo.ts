/**
 * Itens de brinquedo (spec 012): o que fica na mão do boneco, na primeira e na terceira
 * pessoa. A origem de cada modelo é o ponto de pega: nas ferramentas, a ponta do cabo, com
 * o cabo subindo em +y até a cabeça da ferramenta. Blocos são uma peça arredondada na cor
 * do bloco no tema; comidas e materiais têm formas próprias.
 */
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { plantaDeBrinquedo, PLANTAS_BRINQUEDO, type AlvoPlanta } from '../mesh/plantasBrinquedo';
import type { Scene } from '@babylonjs/core/scene';
import { obterItem } from '../jogo/itens';
import { coresDoBloco } from '../fx/cores';
import { caixaArredondada, cilindro, esfera, type Plasticos } from './formas';

/** Cor da cabeça da ferramenta por material (as mesmas do catálogo). */
const MATERIAL: Record<string, string> = {
  madeira: '#a07a4c',
  pedra: '#9a9aa2',
  cobre: '#e08a55',
  ferro: '#dcdce2',
  cristal: '#55e6d6',
};
const CABO = '#b07a4f';

export interface ModeloItem {
  no: TransformNode;
  malhas: Mesh[];
  /** Ferramenta (segura pelo cabo, apontando para a frente) ou peça (no apoio da mão). */
  ferramenta: boolean;
  /** Pecinha de planta (flor, cogumelo, tocha): fica de pé, um pouco maior na mão do boneco. */
  planta?: boolean;
}

const hexDe = (rgb: [number, number, number]) =>
  `#${rgb.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;

/**
 * Monta o modelo do item na mão. `tamanho` é a escala geral (1 = medidas do boneco).
 * Devolve null para mão vazia.
 */
export function modeloNaMao(
  scene: Scene,
  mats: Plasticos,
  bloco: number | null,
  item: string | null,
  prefixo: string,
): ModeloItem | null {
  const no = new TransformNode(`${prefixo}-item`, scene);
  const malhas: Mesh[] = [];
  const add = (m: Mesh, x = 0, y = 0, z = 0) => {
    m.position.set(x, y, z);
    m.parent = no;
    malhas.push(m);
    return m;
  };
  const cx = (
    n: string,
    w: number,
    h: number,
    d: number,
    r: number,
    cor: string,
    brilho?: number,
  ) => caixaArredondada(`${prefixo}-${n}`, scene, w, h, d, r, mats.cor(cor, brilho), 3);
  const bo = (
    n: string,
    r: number,
    cor: string,
    esc: [number, number, number] = [1, 1, 1],
    brilho?: number,
  ) => esfera(`${prefixo}-${n}`, scene, r, mats.cor(cor, brilho), esc);
  const ci = (n: string, h: number, r1: number, r2: number, cor: string) =>
    cilindro(`${prefixo}-${n}`, scene, h, r1, r2, mats.cor(cor));

  const def = item ? obterItem(item) : undefined;
  if (def?.ferramenta) {
    const tier = item!.split('_').slice(1).join('_');
    const cor = MATERIAL[tier] ?? '#a9adb8';
    const brilho = tier === 'cristal' || tier === 'ferro' ? 0.5 : 0.3;
    const tipo = def.ferramenta.tipo;
    if (tipo === 'espada') {
      add(ci('cabo', 0.14, 0.032, 0.03, CABO), 0, 0.05, 0);
      add(cx('guarda', 0.2, 0.045, 0.06, 0.02, '#7a5a32'), 0, 0.13, 0);
      add(cx('lamina', 0.075, 0.44, 0.028, 0.025, cor, brilho), 0, 0.37, 0);
      const ponta = add(cx('ponta', 0.053, 0.053, 0.028, 0.012, cor, brilho), 0, 0.59, 0);
      ponta.rotation.z = Math.PI / 4;
    } else {
      add(ci('cabo', 0.55, 0.032, 0.03, CABO), 0, 0.255, 0);
      if (tipo === 'picareta') {
        for (const s of [-1, 1]) {
          const p = add(cx(`ponta${s}`, 0.2, 0.07, 0.07, 0.03, cor, brilho), s * 0.1, 0.52, 0);
          p.rotation.z = s * -0.25;
        }
      } else if (tipo === 'machado') {
        add(cx('lamina', 0.17, 0.2, 0.05, 0.04, cor, brilho), 0.1, 0.46, 0);
        add(cx('nuca', 0.07, 0.08, 0.06, 0.025, cor, brilho), -0.04, 0.48, 0);
      } else {
        // pá
        add(bo('lamina', 0.11, cor, [0.85, 1.05, 0.3], brilho), 0, 0.6, 0);
      }
    }
    return { no, malhas, ferramenta: true };
  }
  if (item) {
    switch (item) {
      case 'maca': {
        add(bo('maca', 0.09, '#e84a4a', [1, 1, 1], 0.6));
        add(bo('folha', 0.03, '#5cbf63', [1.5, 0.6, 1]), 0.02, 0.09, 0);
        break;
      }
      case 'frutinhas':
        for (const [x, y, z] of [
          [-0.04, 0, 0],
          [0.04, 0, 0.01],
          [0, 0.06, -0.01],
        ] as const)
          add(bo(`fruta${x}${y}`, 0.045, '#d8346a', [1, 1, 1], 0.6), x, y, z);
        break;
      case 'carne_crua':
      case 'carne_assada': {
        const cor = item === 'carne_crua' ? '#e57a7a' : '#a0582e';
        add(bo('carne', 0.09, cor, [1.2, 0.9, 1], 0.4));
        const osso = add(ci('osso', 0.14, 0.022, 0.022, '#f6efe0'), 0.1, 0.02, 0);
        osso.rotation.z = Math.PI / 2;
        break;
      }
      case 'peixe_cru':
      case 'peixe_assado': {
        const cor = item === 'peixe_cru' ? '#7ab8e0' : '#d9904a';
        add(bo('peixe', 0.08, cor, [1.6, 0.85, 0.6], 0.5));
        const cauda = add(cx('cauda', 0.06, 0.1, 0.025, 0.02, cor), -0.15, 0, 0);
        cauda.rotation.z = 0.2;
        break;
      }
      case 'ensopado':
        add(ci('tigela', 0.08, 0.06, 0.1, '#b07a4f'), 0, 0.04, 0);
        add(ci('sopa', 0.02, 0.09, 0.09, '#e0a84a'), 0, 0.075, 0);
        break;
      case 'torta_abobora':
        add(ci('torta', 0.07, 0.11, 0.11, '#e0a865'), 0, 0.035, 0);
        add(ci('recheio', 0.015, 0.09, 0.09, '#f08a2a'), 0, 0.075, 0);
        break;
      case 'graveto': {
        const g = add(ci('graveto', 0.32, 0.018, 0.015, CABO), 0, 0.14, 0);
        g.rotation.z = 0.2;
        break;
      }
      case 'carvao':
        add(bo('carvao', 0.08, '#2c2c34', [1.1, 0.8, 1], 0.15));
        break;
      case 'luzita':
        add(bo('luzita', 0.08, '#ffe066', [0.8, 1.3, 0.8], 0.8));
        break;
      case 'tijolo':
        add(cx('tijolo', 0.18, 0.08, 0.09, 0.025, '#c8603e'));
        break;
      case 'fibra':
        for (let i = 0; i < 3; i++) {
          const f = add(ci(`fibra${i}`, 0.24, 0.012, 0.008, '#c9b46a'), (i - 1) * 0.025, 0.1, 0);
          f.rotation.z = (i - 1) * 0.25;
        }
        break;
      default:
        if (item.startsWith('lingote_')) {
          const cor = MATERIAL[item.slice(8)] ?? (item.endsWith('ouro') ? '#efc33a' : '#dcdce2');
          add(cx('lingote', 0.18, 0.07, 0.09, 0.025, cor, 0.6));
        } else if (item.endsWith('_bruto')) {
          const cor = item.startsWith('ouro')
            ? '#efc33a'
            : item.startsWith('cobre')
              ? '#e08a55'
              : '#cfab90';
          add(bo('bruto', 0.075, '#8a8a90', [1.1, 0.9, 1]));
          add(bo('pepita', 0.035, cor, [1, 1, 1], 0.6), 0.04, 0.04, 0.05);
        } else {
          add(bo('item', 0.08, '#c9a36a'));
        }
    }
    return { no, malhas, ferramenta: false };
  }
  if (bloco !== null && PLANTAS_BRINQUEDO.includes(bloco)) {
    // flor, matinho, cogumelo, tocha: a mesma pecinha que vai no chão, não um bloco
    add(malhaDePlanta(scene, bloco, `${prefixo}-planta`), 0, -0.04, 0);
    return { no, malhas, ferramenta: false, planta: true };
  }
  if (bloco !== null && bloco > 0) {
    const c = coresDoBloco(bloco);
    const lado = c ? hexDe(c.lado) : '#a9adb8';
    const topo = c ? hexDe(c.topo) : lado;
    if (c && Math.hypot(c.topo[0] - c.lado[0], c.topo[1] - c.lado[1], c.topo[2] - c.lado[2]) > 40) {
      // grama, neve: corpo na cor de baixo e uma tampa na cor do topo
      add(cx('bloco', 0.24, 0.17, 0.24, 0.05, lado), 0, -0.035, 0);
      add(cx('tampa', 0.245, 0.085, 0.245, 0.04, topo), 0, 0.08, 0);
    } else add(cx('bloco', 0.24, 0.24, 0.24, 0.05, lado));
    return { no, malhas, ferramenta: false };
  }
  no.dispose();
  return null;
}

/** Tamanho da pecinha de planta na mão (o bloco de planta tem 1 de altura). */
const ESCALA_PLANTA = 0.52;
const matsPlanta = new WeakMap<Scene, StandardMaterial>();

/** A pecinha 3D da planta (as cores vão nos vértices), com a base na origem. */
function malhaDePlanta(scene: Scene, bloco: number, nome: string): Mesh {
  const alvo: AlvoPlanta = {
    posicoes: [],
    normais: [],
    uvs: [],
    cores: [],
    luz: [],
    indices: [],
    get vertices() {
      return this.posicoes.length / 3;
    },
  };
  plantaDeBrinquedo(bloco, -0.5, 0, -0.5, alvo, [0, 0], [1, 0], () => 0.5, false);
  const m = new Mesh(nome, scene);
  const dados = new VertexData();
  dados.positions = alvo.posicoes.map((v) => v * ESCALA_PLANTA);
  dados.normals = alvo.normais;
  dados.indices = alvo.indices;
  dados.colors = alvo.cores.map((v, i) => (i % 4 === 3 ? 1 : v));
  dados.applyToMesh(m);
  let mat = matsPlanta.get(scene);
  if (!mat) {
    mat = new StandardMaterial('planta-na-mao', scene);
    mat.specularColor = new Color3(0.15, 0.15, 0.15);
    mat.emissiveColor = new Color3(0.3, 0.3, 0.3);
    mat.backFaceCulling = false;
    matsPlanta.set(scene, mat);
  }
  m.material = mat;
  return m;
}
