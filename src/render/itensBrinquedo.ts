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
import { obterItem, todosItens } from '../jogo/itens';
import { coresDoBloco } from '../fx/cores';
import { caixasDoBloco, temFormaParcial, type Caixa } from '../world/formas';
import { Bloco, obterBloco } from '../world/blocks';
import { caixaArredondada, cilindro, esfera, type Plasticos } from './formas';
import { modeloDeBloco } from './blocosBrinquedo';

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
  // a semente "é" o bloco que ela planta (para colocar), mas na mão é a semente
  if (bloco !== null && !item) {
    const semente = itemQuePlanta(bloco);
    if (semente) {
      item = semente;
      bloco = null;
    }
  }
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
      } else if (tipo === 'enxada') {
        // enxada: o pescoço sai do alto do cabo para o lado e a lâmina larga desce paralela
        // ao cabo, com um vão entre os dois (o que a separa do machado); a lâmina vira um
        // pouco para mostrar a face larga, com o fio claro embaixo
        add(cx('pescoco', 0.23, 0.042, 0.042, 0.018, cor, brilho), 0.105, 0.535, 0);
        for (const [n, w, h, y, c] of [
          ['lamina', 0.03, 0.1, 0.49, cor],
          ['fio', 0.034, 0.03, 0.43, '#f4f4f8'],
        ] as const) {
          const l = add(cx(n, w, h, 0.17, 0.014, c, brilho), 0.215, y, 0);
          l.rotation.y = 0.6;
        }
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
      // ---------- spec 013: plantio ----------
      case 'semente_trigo':
      case 'semente_milho':
      case 'semente_abobora': {
        // pacotinho de sementes com o desenho da planta na frente e grãos espalhados
        const SEMENTE: Record<string, [string, string]> = {
          semente_trigo: ['#d8a84a', '#f2c64a'],
          semente_milho: ['#f0b428', '#ffd23a'],
          semente_abobora: ['#f2e6bc', '#f08a24'],
        };
        const [grao, figura] = SEMENTE[item];
        add(cx('pacote', 0.15, 0.19, 0.035, 0.02, '#f4ead2'), 0, 0.1, 0);
        add(cx('dobra', 0.155, 0.04, 0.04, 0.015, '#c8a26a'), 0, 0.2, 0);
        if (item === 'semente_trigo') {
          add(ci('talo', 0.08, 0.008, 0.008, '#6aa83a'), 0, 0.06, -0.022);
          add(bo('espiga', 0.026, figura, [0.8, 1.7, 0.5], 0.3), 0, 0.12, -0.022);
        } else if (item === 'semente_milho') {
          add(bo('espiga', 0.03, figura, [0.9, 1.7, 0.5], 0.3), 0, 0.1, -0.022);
          add(bo('palha', 0.03, '#6aa83a', [1.1, 0.8, 0.5]), 0, 0.055, -0.022);
        } else {
          add(bo('abobora', 0.042, figura, [1.25, 0.9, 0.5], 0.3), 0, 0.09, -0.022);
          add(ci('cabinho', 0.025, 0.008, 0.008, '#5c7a2a'), 0, 0.135, -0.022);
        }
        for (const [x, z] of [
          [-0.05, -0.06],
          [0.03, -0.075],
          [0.08, -0.04],
        ] as const)
          add(bo(`grao${x}`, 0.022, grao, [1, 0.6, 1.4], 0.4), x, 0.012, z);
        break;
      }
      case 'trigo': {
        // feixe: hastes douradas amarradas com uma fitinha, espigas no alto
        for (let i = 0; i < 5; i++) {
          const a = (i - 2) * 0.12;
          const h = add(ci(`haste${i}`, 0.24, 0.01, 0.01, '#c9a040'), Math.sin(a) * 0.12, 0.12, 0);
          h.rotation.z = -a;
          const e = add(
            bo(`espiga${i}`, 0.028, '#f0c650', [0.85, 1.9, 0.85], 0.4),
            Math.sin(a) * 0.26,
            0.25 - Math.abs(a) * 0.1,
            0,
          );
          e.rotation.z = -a;
        }
        add(ci('fita', 0.03, 0.03, 0.03, '#c0503a'), 0, 0.08, 0);
        break;
      }
      case 'milho': {
        // espiga amarela com grãos e a palha verde abrindo embaixo
        add(bo('espiga', 0.05, '#ffcf3a', [1, 2.2, 1], 0.5), 0, 0.13, 0);
        for (const [x, z, r] of [
          [-0.035, 0, 0.5],
          [0.035, 0, -0.5],
          [0, 0.03, 0],
        ] as const) {
          const p = add(bo(`palha${x}${z}`, 0.04, '#6aa83a', [0.55, 1.8, 0.4]), x, 0.06, z);
          p.rotation.z = r;
        }
        break;
      }
      case 'pao': {
        // pão de forma redonda, dourado, com três cortes claros em cima
        add(bo('pao', 0.1, '#c8843a', [1.45, 0.72, 0.95], 0.35), 0, 0.06, 0);
        for (const x of [-0.06, 0, 0.06]) {
          const c = add(bo(`corte${x}`, 0.02, '#f2cf8a', [0.7, 0.35, 2.6]), x, 0.13, 0);
          c.rotation.y = 0.5;
        }
        break;
      }
      case 'pipoca': {
        // balde listrado de vermelho e branco, cheio de pipoca
        add(ci('balde', 0.13, 0.085, 0.06, '#f6f2ea'), 0, 0.065, 0);
        for (let i = 0; i < 4; i++) {
          const a = (i / 4) * Math.PI * 2;
          const l = add(
            cx(`listra${i}`, 0.035, 0.13, 0.012, 0.006, '#e03a34'),
            Math.cos(a) * 0.073,
            0.065,
            Math.sin(a) * 0.073,
          );
          l.rotation.y = -a + Math.PI / 2;
          l.rotation.x = 0;
          l.rotation.z = 0;
        }
        for (const [x, y, z] of [
          [-0.04, 0.14, 0],
          [0.04, 0.14, 0.01],
          [0, 0.15, -0.04],
          [0, 0.145, 0.04],
          [0, 0.18, 0],
          [-0.03, 0.17, 0.03],
          [0.035, 0.17, -0.03],
        ] as const)
          add(bo(`pipoca${x}${y}${z}`, 0.033, '#fff8e8', [1, 0.9, 1], 0.5), x, y, z);
        break;
      }
      case 'ovo':
        add(bo('ovo', 0.075, '#f4ead6', [0.82, 1.05, 0.82], 0.45), 0, 0.07, 0);
        break;
      case 'ovo_cozido': {
        // ovo cozido cortado: a clara e a gema amarela à mostra
        add(bo('clara', 0.08, '#fbf7ee', [1, 0.55, 1.25], 0.4), 0, 0.03, 0);
        add(bo('gema', 0.045, '#ffc23a', [1, 0.45, 1.2], 0.5), 0, 0.065, 0);
        break;
      }
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
  if (bloco === Bloco.VIDRO) {
    // cada peça já vem no lugar dela (a moldura nas arestas): mantém a posição
    for (const m of modeloVidro(scene, `${prefixo}-mao`, 0.24))
      add(m, m.position.x, m.position.y, m.position.z);
    return { no, malhas, ferramenta: false };
  }
  // porta e porteira têm modelinho próprio (janela e almofadas; mourões e diagonal), mais abaixo
  if (
    bloco !== null &&
    bloco > 0 &&
    temFormaParcial(bloco) &&
    bloco !== Bloco.PORTEIRA &&
    bloco !== Bloco.PORTA
  ) {
    // porta, cerca, laje, escada, cama: o formato de verdade, com as caixas do próprio bloco
    const c = coresDoBloco(bloco);
    const cor = c ? hexDe(c.lado) : '#a9adb8';
    const forma = obterBloco(bloco)?.forma;
    let caixas: Caixa[] =
      forma === 'cama'
        ? [[0, 0, 0, 1, 0.5, 2]]
        : (caixasDoBloco(bloco, 0, (d) => d % 2 === 1) ?? [[0, 0, 0, 1, 1, 1]]);
    // cabe no mesmo espaço do bloco na mão (o maior lado com 0,26)
    let maior = 0;
    for (const [x0, y0, z0, x1, y1, z1] of caixas)
      maior = Math.max(maior, x1, y1, z1, -x0, -y0, -z0);
    const k = 0.26 / maior;
    const cx0 = 0.5;
    const cz0 = forma === 'cama' ? 1 : 0.5;
    caixas.forEach(([x0, y0, z0, x1, y1, z1], i) => {
      const w = (x1 - x0) * k;
      const h = (y1 - y0) * k;
      const d = (z1 - z0) * k;
      add(
        cx(`forma${i}`, w, h, d, Math.min(0.04, Math.min(w, h, d) * 0.35), cor),
        ((x0 + x1) / 2 - cx0) * k,
        ((y0 + y1) / 2) * k - 0.12,
        ((z0 + z1) / 2 - cz0) * k,
      );
    });
    if (forma === 'cama') {
      // lençol claro, cobertor colorido, travesseiro e a cabeceira de madeira
      add(cx('lencol', 0.92 * k, 0.08 * k, 1.4 * k, 0.02, '#f4efe6'), 0, 0.52 * k - 0.12, 0.25 * k);
      add(
        cx('cobertor', 1.02 * k, 0.12 * k, 1.12 * k, 0.03, '#d9504a'),
        0,
        0.55 * k - 0.12,
        0.42 * k,
      );
      add(
        cx('cabeceira', 1.04 * k, 1.0 * k, 0.16 * k, 0.03, '#8a5a34'),
        0,
        0.5 * k - 0.12,
        -0.95 * k,
      );
      add(
        cx('travesseiro', 0.7 * k, 0.12 * k, 0.32 * k, 0.03, '#ffffff'),
        0,
        0.56 * k - 0.12,
        -0.7 * k,
      );
    }
    return { no, malhas, ferramenta: false };
  }
  if (bloco !== null && bloco > 0) {
    // minério, tronco, fornalha, baú...: o modelinho que parece com o bloco
    const proprio = modeloDeBloco(scene, mats, bloco, `${prefixo}-mao`, 0.24);
    if (proprio) {
      // porta e porteira: viradas de frente para quem segura (de lado são só uma tábua)
      const giro = bloco === Bloco.PORTEIRA || bloco === Bloco.PORTA ? -1.2 : 0;
      for (const m of proprio) {
        const { x, y, z } = m.position;
        m.rotation.y += giro;
        add(m, x * Math.cos(giro) + z * Math.sin(giro), y, z * Math.cos(giro) - x * Math.sin(giro));
      }
      return { no, malhas, ferramenta: false };
    }
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

const matsVidro = new WeakMap<Scene, { vidro: StandardMaterial; moldura: StandardMaterial }>();

/**
 * Vidro de brinquedo (pedido do dono): no inventário, na mão e no chão ele precisa parecer
 * vidro, não um bloco sólido. Um cubo azul-clarinho translúcido, uma moldura branca nas
 * arestas e dois riscos de brilho. `lado` é o tamanho do cubo; a origem fica no centro.
 */
export function modeloVidro(scene: Scene, nome: string, lado: number): Mesh[] {
  let m = matsVidro.get(scene);
  if (!m) {
    const vidro = new StandardMaterial('vidro-brinquedo', scene);
    vidro.diffuseColor = new Color3(0.72, 0.9, 1);
    vidro.emissiveColor = new Color3(0.25, 0.36, 0.42);
    vidro.specularColor = new Color3(0.9, 0.95, 1);
    vidro.specularPower = 64;
    vidro.alpha = 0.38;
    vidro.backFaceCulling = false;
    const moldura = new StandardMaterial('vidro-moldura', scene);
    moldura.diffuseColor = new Color3(0.96, 0.98, 1);
    moldura.emissiveColor = new Color3(0.45, 0.48, 0.5);
    moldura.specularColor = new Color3(0.6, 0.6, 0.6);
    m = { vidro, moldura };
    matsVidro.set(scene, m);
  }
  const out: Mesh[] = [];
  const corpo = caixaArredondada(`${nome}-vidro`, scene, lado, lado, lado, lado * 0.12, m.vidro, 3);
  out.push(corpo);
  // moldura: as 12 arestas em peças finas de plástico branco
  const e = lado * 0.13;
  const meio = lado / 2 - e / 2;
  let k = 0;
  for (const eixo of [0, 1, 2])
    for (const a of [-1, 1])
      for (const b of [-1, 1]) {
        const t: [number, number, number] = [e, e, e];
        t[eixo] = lado;
        const aresta = caixaArredondada(
          `${nome}-moldura${k++}`,
          scene,
          t[0],
          t[1],
          t[2],
          e * 0.45,
          m.moldura,
          2,
        );
        const p: [number, number, number] = [0, 0, 0];
        const outros = [0, 1, 2].filter((x) => x !== eixo);
        p[outros[0]] = a * meio;
        p[outros[1]] = b * meio;
        aresta.position.set(p[0], p[1], p[2]);
        out.push(aresta);
      }
  // riscos de brilho na frente, na diagonal (só no ícone: na mão viram um "+" estranho)
  if (lado >= 0.5)
    for (const [i, [dx, dy, w]] of (
      [
        [-0.12, 0.08, 0.34],
        [0.1, -0.12, 0.2],
      ] as const
    ).entries()) {
      const brilho = caixaArredondada(
        `${nome}-brilho${i}`,
        scene,
        w * lado,
        lado * 0.05,
        lado * 0.02,
        lado * 0.02,
        m.moldura,
        2,
      );
      brilho.position.set(dx * lado, dy * lado, -lado / 2 - 0.002);
      brilho.rotation.z = 0.75;
      out.push(brilho);
    }
  return out;
}

/** O item que planta este bloco (as sementes), ou null. */
function itemQuePlanta(bloco: number): string | null {
  for (const d of todosItens()) if (d.tipo !== 'bloco' && d.bloco === bloco) return d.id;
  return null;
}
