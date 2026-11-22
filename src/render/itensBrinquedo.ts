/**
 * Itens de brinquedo (spec 012): o que fica na mão do boneco, na primeira e na terceira
 * pessoa. A origem de cada modelo é o ponto de pega: nas ferramentas, a ponta do cabo, com
 * o cabo subindo em +y até a cabeça da ferramenta. Blocos são uma peça arredondada na cor
 * do bloco no tema; comidas e materiais têm formas próprias.
 */
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';

import { plantaDeBrinquedo, PLANTAS_BRINQUEDO, type AlvoPlanta } from '../mesh/plantasBrinquedo';
import type { Scene } from '@babylonjs/core/scene';
import { obterItem, todosItens } from '../jogo/itens';
import { coresDoBloco } from '../fx/cores';
import { caixasDaMalha, temFormaParcial, type Caixa } from '../world/formas';
import { Bloco, obterBloco } from '../world/blocks';
import { caixaArredondada, cilindro, esfera, type Plasticos } from './formas';
import { modeloDeBloco } from './blocosBrinquedo';
import { tema } from '../temas/ativo';

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

/**
 * Spec 032: os tufos da nuvem do algodão-doce (x, y, z, raio, cor), na ordem em que somem nas
 * mordidas (os da frente e de cima primeiro; o miolo por último).
 */
export const NUVEM_ALGODAO: readonly (readonly [number, number, number, number, string])[] = [
  [0.0, 0.31, 0.045, 0.055, '#ffd2e6'],
  [0.05, 0.29, 0.03, 0.05, '#ffb0d2'],
  [-0.05, 0.29, 0.03, 0.05, '#ffd2e6'],
  [0.0, 0.35, -0.01, 0.052, '#ffe4f0'],
  [0.06, 0.25, -0.02, 0.05, '#ffb0d2'],
  [-0.06, 0.25, -0.02, 0.05, '#ffb0d2'],
  [0.03, 0.24, 0.045, 0.045, '#ffd2e6'],
  [-0.03, 0.24, 0.045, 0.045, '#ffb0d2'],
  [0.0, 0.28, -0.05, 0.058, '#ffc4de'],
  [0.0, 0.28, 0.0, 0.07, '#ffc4de'],
  [0.0, 0.215, 0.0, 0.045, '#ffb0d2'],
];

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
  /** Spec 032: o copo de plástico transparente (a bebida dentro se vê, e desce a cada gole). */
  const vidro = (n: string, h: number, r1: number, r2: number) =>
    cilindro(`${prefixo}-${n}`, scene, h, r1, r2, mats.cor('#eef6ff', 0.7, 0.24));

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
        if (tema().id === 'noite-das-fantasias') {
          // spec 027 (T15): neste mundo o item é a "Uva" da parreirinha do Seu Jerônimo: o
          // cachinho roxo (seis uvas em triângulo, a de baixo some primeiro), o cabinho e a folha
          for (const [x, y, z, cor] of [
            [0, 0.0, 0, '#7a3ea8'],
            [-0.028, 0.045, 0.01, '#8a4ec8'],
            [0.028, 0.045, -0.006, '#6e3498'],
            [-0.05, 0.09, -0.004, '#6e3498'],
            [0, 0.095, 0.012, '#7a3ea8'],
            [0.05, 0.09, 0.004, '#8a4ec8'],
          ] as const)
            add(bo(`fruta${x}${y}`, 0.03, cor, [1, 1.08, 1], 0.6), x, y, z);
          add(ci('cabinho-uva', 0.05, 0.007, 0.009, '#6a4a2a'), 0, 0.14, 0);
          const folha = add(bo('folha-uva', 0.04, '#5f8a34', [1.4, 0.35, 1], 0.3), 0.035, 0.155, 0);
          folha.rotation.z = -0.4;
          break;
        }
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
        if (tema().id === 'doce-reino') {
          // spec 031: o broto-doce do Doce Reino (o mesmo item): um broto de bala cor-de-rosa,
          // duas folhas gordinhas brilhando no alto de um cabinho de menta, num torrão de chocolate
          add(bo('torrao', 0.07, '#7a4424', [1.25, 0.55, 1.1], 0.25), 0, 0.03, 0);
          add(ci('cabinho', 0.15, 0.014, 0.018, '#7fdcb8'), 0, 0.1, 0);
          for (const lado of [-1, 1]) {
            const f = add(
              bo(`folha${lado}`, 0.06, '#ff8fb8', [1.25, 0.5, 0.8], 0.55),
              lado * 0.06,
              0.19,
              0,
            );
            f.rotation.z = lado * -0.55;
            const b = add(
              bo(`brilho${lado}`, 0.018, '#ffe3ef', [1.4, 0.6, 1], 0.8),
              lado * 0.075,
              0.215,
              0.03,
            );
            b.rotation.z = lado * -0.55;
          }
          add(bo('miolo', 0.03, '#ff6fa3', [1, 1.2, 1], 0.6), 0, 0.2, 0);
          for (const [x, z, c] of [
            [-0.045, 0.04, '#fff3c4'],
            [0.05, -0.03, '#bdf0ff'],
            [0.02, 0.055, '#ffd0e4'],
          ] as const)
            add(bo(`granulo${x}`, 0.011, c, [1.6, 0.6, 0.6], 0.4), x, 0.058, z);
          break;
        }
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
      case 'cachorro_quente': {
        // spec 026: o pão comprido aberto, a salsicha e a mostarda em zigue-zague
        add(bo('pao-cq', 0.07, '#e8b067', [2.6, 0.75, 1.05], 0.45), 0, 0.045, 0);
        add(bo('salsicha', 0.045, '#c8452c', [3.6, 0.9, 0.9], 0.6), 0, 0.085, 0);
        for (const x of [-0.08, -0.03, 0.02, 0.07])
          add(bo(`mostarda${x}`, 0.014, '#ffd23d', [1.6, 0.6, 0.6], 0.5), x, 0.122, 0);
        break;
      }
      case 'suco': {
        // spec 026: o copo com o suco de laranja e o canudo vermelho (spec 032: o copo é de
        // plástico transparente, e o suco que desce a cada gole se vê de qualquer lado)
        add(ci('suco', 0.12, 0.054, 0.046, '#ff7a10'), 0, 0.066, 0);
        add(vidro('copo', 0.15, 0.06, 0.05), 0, 0.075, 0);
        const canudo = add(ci('canudo', 0.16, 0.009, 0.009, '#e8302a'), 0.02, 0.16, 0);
        canudo.rotation.z = -0.25;
        break;
      }
      case 'vitamina': {
        // spec 026 (etapa B): o copo alto da lanchonete, de pé cromado, a vitamina rosa, a
        // espuma branca e os dois canudos (um vermelho e um azul). Spec 032: o copo de vidro e a
        // vitamina dentro (desce a cada gole)
        add(ci('pe-v', 0.012, 0.046, 0.042, '#d4d8e2'), 0, 0.006, 0);
        add(ci('haste-v', 0.03, 0.013, 0.013, '#d4d8e2'), 0, 0.026, 0);
        add(ci('vitamina', 0.15, 0.039, 0.054, '#ff9ec4'), 0, 0.117, 0);
        add(vidro('copo-v', 0.17, 0.045, 0.061), 0, 0.125, 0);
        add(bo('espuma', 0.058, '#fff6ee', [1, 0.42, 1], 0.4), 0, 0.196, 0);
        add(bo('espuma2', 0.03, '#fff6ee', [1, 0.7, 1], 0.4), 0.012, 0.214, 0.008);
        const vermelho = add(ci('canudo-r', 0.15, 0.008, 0.008, '#e8302a'), -0.034, 0.27, 0);
        vermelho.rotation.z = 0.3;
        const azul = add(ci('canudo-a', 0.14, 0.008, 0.008, '#2f8cff'), 0.036, 0.266, 0);
        azul.rotation.z = -0.34;
        break;
      }
      case 'brigadeiro':
      case 'beijinho':
      case 'cajuzinho':
      case 'surpresa_uva': {
        // spec 027 (T15): a forminha de papel pregueada com três docinhos (um some a cada
        // mordida): o brigadeiro com o granulado laranja, o beijinho branco com o cravo, o
        // cajuzinho com o amendoim e a surpresa de uva branca com a uva roxa em cima
        add(ci('forminha', 0.034, 0.078, 0.06, '#f6ecdc'), 0, 0.017, 0);
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          const pr = add(cx(`prega${i}`, 0.012, 0.03, 0.006, 0.002, '#e4d2b4'), Math.cos(a) * 0.07, 0.018, Math.sin(a) * 0.07);
          pr.rotation.y = -a;
        }
        const DOCE: Record<string, [string, string]> = {
          brigadeiro: ['#5a3424', '#ff9a3a'],
          beijinho: ['#fbf3e6', '#4a2a18'],
          cajuzinho: ['#e0904a', '#c88a4a'],
          surpresa_uva: ['#fbf3e6', '#7a3ea8'],
        };
        const [corDoce, corTopo] = DOCE[item];
        // (de lado para a boca: o +x é o primeiro que se come)
        for (let k = 0; k < 3; k++) {
          const a = (k / 3) * Math.PI * 2;
          const x = Math.cos(a) * 0.036;
          const z = Math.sin(a) * 0.036;
          add(bo(`docinho${k}`, 0.034, corDoce, [1, 0.92, 1], 0.42), x, 0.058, z);
          if (item === 'brigadeiro')
            for (const [dx, dz] of [
              [-0.012, 0.006],
              [0.01, -0.01],
              [0.004, 0.014],
            ])
              add(cx(`docinho${k}-gr${dx}`, 0.009, 0.006, 0.006, 0.002, corTopo), x + dx, 0.089, z + dz);
          else if (item === 'surpresa_uva') {
            add(bo(`docinho${k}-uva`, 0.017, corTopo, [1, 0.85, 1], 0.5), x, 0.088, z);
            add(cx(`docinho${k}-cabo`, 0.005, 0.014, 0.005, 0.002, '#5f8a34'), x, 0.104, z);
          } else add(bo(`docinho${k}-topo`, 0.011, corTopo, [0.8, 1.2, 0.8], 0.3), x, 0.092, z);
        }
        break;
      }
      case 'sacola_vazia':
      case 'sacola_doces': {
        // spec 027 (T19): a sacola de doces da n1: lilás, a beira laranja, a alça e a abóbora
        // sorridente estampada na frente; a cheia com o brigadeiro, o beijinho e o cajuzinho
        // espiando pela boca (um sai a cada mordida)
        add(cx('sacola', 0.15, 0.15, 0.1, 0.02, '#9a6ad8'), 0, 0.075, 0);
        add(cx('beira', 0.156, 0.024, 0.106, 0.008, '#ff9a3a'), 0, 0.15, 0);
        for (const s of [-1, 1]) add(cx(`alca${s}`, 0.012, 0.07, 0.012, 0.004, '#ff9a3a'), s * 0.045, 0.19, 0);
        add(cx('alca-topo', 0.102, 0.012, 0.012, 0.004, '#ff9a3a'), 0, 0.225, 0);
        add(bo('estampa', 0.03, '#ff9a3a', [1.15, 0.9, 0.3]), 0, 0.075, 0.05);
        add(cx('estampa-cabo', 0.008, 0.014, 0.006, 0.002, '#5f8a34'), 0, 0.106, 0.052);
        for (const s of [-1, 1]) add(bo(`estampa-olho${s}`, 0.006, '#4a2a18', [1, 1, 0.4]), s * 0.012, 0.082, 0.06);
        add(cx('estampa-boca', 0.022, 0.005, 0.004, 0.002, '#4a2a18'), 0, 0.064, 0.061);
        if (item === 'sacola_doces') {
          const DOCES: [string, string][] = [
            ['#5a3424', '#ff9a3a'],
            ['#fbf3e6', '#4a2a18'],
            ['#e0904a', '#c88a4a'],
          ];
          DOCES.forEach(([cor, topo], k) => {
            const a = (k / 3) * Math.PI * 2;
            const x = Math.cos(a) * 0.032;
            const z = Math.sin(a) * 0.026;
            add(bo(`docinho${k}`, 0.03, cor, [1, 0.92, 1], 0.42), x, 0.168, z);
            add(bo(`docinho${k}-topo`, 0.009, topo, [1, 1, 1], 0.3), x, 0.196, z);
          });
        }
        break;
      }
      case 'lampiao_sorriso':
      case 'lampiao_lingua':
      case 'lampiao_piscadinha': {
        // spec 027 (T19): o lampião de carinha da n4 (a abóbora redonda, os olhos redondos acesos)
        add(bo('abobora', 0.085, '#f08a2a', [1.15, 0.85, 1.15], 0.25), 0, 0.075, 0);
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          add(bo(`gomo${i}`, 0.05, '#e07c1e', [0.7, 1.25, 0.7], 0.2), Math.cos(a) * 0.06, 0.075, Math.sin(a) * 0.06);
        }
        add(ci('cabo', 0.04, 0.01, 0.013, '#5f8a34'), 0, 0.165, 0);
        const ACESO = '#ffd84a';
        const pisca = item === 'lampiao_piscadinha';
        add(bo('olho-d', 0.014, ACESO, [1, 1, 0.5], 0.9), 0.03, 0.095, 0.088);
        if (pisca) add(cx('olho-e', 0.03, 0.006, 0.006, 0.002, ACESO, 0.9), -0.03, 0.093, 0.09);
        else add(bo('olho-e', 0.014, ACESO, [1, 1, 0.5], 0.9), -0.03, 0.095, 0.088);
        add(cx('boca', 0.06, 0.012, 0.006, 0.004, ACESO, 0.9), 0, 0.058, 0.092);
        if (item === 'lampiao_lingua') add(bo('lingua', 0.014, '#ff7aa8', [1.2, 1, 0.6]), 0.008, 0.046, 0.094);
        break;
      }
      case 'chocolate_quente': {
        // spec 027 (T15): a caneca laranja de alça, o chocolate dentro (desce a cada gole) e a
        // fumacinha
        add(ci('caneca', 0.11, 0.052, 0.05, '#f2a24a'), 0, 0.055, 0);
        add(ci('chocolate', 0.012, 0.045, 0.045, '#5a3020'), 0, 0.104, 0);
        add(cx('alca', 0.022, 0.07, 0.022, 0.01, '#e8923a'), -0.066, 0.058, 0);
        add(cx('alca-c', 0.03, 0.016, 0.02, 0.008, '#e8923a'), -0.052, 0.088, 0);
        add(cx('alca-b', 0.03, 0.016, 0.02, 0.008, '#e8923a'), -0.052, 0.028, 0);
        add(bo('fumaca', 0.022, '#ffffff', [1, 0.8, 1], 0.6), 0.008, 0.14, 0);
        add(bo('fumaca2', 0.016, '#ffffff', [1, 0.8, 1], 0.6), -0.012, 0.17, 0.006);
        break;
      }
      case 'pocao_uva': {
        // spec 027 (T15): o copinho de poção de uva (o copo transparente, a poção roxa que
        // desce a cada gole e o canudinho laranja)
        add(ci('pocao', 0.12, 0.052, 0.044, '#8a4ec8'), 0, 0.066, 0);
        add(vidro('copo', 0.15, 0.058, 0.048), 0, 0.075, 0);
        add(bo('bolha', 0.012, '#c8a0f0', [1, 1, 1], 0.6), 0.02, 0.12, 0.018);
        const canudo = add(ci('canudo', 0.16, 0.009, 0.009, '#ff9a3a'), 0.02, 0.16, 0);
        canudo.rotation.z = -0.25;
        break;
      }
      case 'algodao_doce': {
        // spec 032: o algodão-doce do parque: o palito de madeira e a nuvem fofa em tufos de dois
        // rosas (nada de várias cores), mais clara em cima
        add(ci('palito', 0.2, 0.011, 0.011, '#c8925a'), 0, 0.1, 0);
        for (const [x, y, z, r, cor] of NUVEM_ALGODAO)
          add(bo(`nuvem${x}${y}${z}`, r, cor, [1, 0.92, 1], 0.32), x, y, z);
        break;
      }
      case 'fita_video': {
        // spec 026 (etapa B): a fita de vídeo da locadora (genérica, sem marca): o corpo grafite,
        // o rótulo creme com um risco vermelho e um azul e a janelinha dos dois carretéis
        add(cx('fita', 0.26, 0.15, 0.042, 0.014, '#2e2d36', 0.35), 0, 0.075, 0);
        add(cx('rotulo', 0.2, 0.046, 0.006, 0.002, '#f4ecdc'), 0, 0.114, 0.021);
        add(cx('risco-r', 0.11, 0.011, 0.004, 0.001, '#e8302a'), -0.035, 0.123, 0.0245);
        add(cx('risco-a', 0.075, 0.011, 0.004, 0.001, '#2f8cff'), -0.0525, 0.106, 0.0245);
        add(cx('janela', 0.17, 0.05, 0.006, 0.002, '#1c1c24'), 0, 0.05, 0.021);
        for (const x of [-0.045, 0.045])
          add(bo(`carretel${x}`, 0.019, '#f4ecdc', [1, 1, 0.22], 0.4), x, 0.05, 0.0245);
        add(cx('rotulo-costas', 0.2, 0.1, 0.006, 0.002, '#f4ecdc'), 0, 0.085, -0.021);
        break;
      }
      case 'ioio': {
        // spec 026 (parte 3): o ioiô do baú: as duas metades vermelhas, o miolo claro e o fio
        for (const z of [-0.024, 0.024]) {
          const m = add(ci(`ioio${z}`, 0.04, 0.075, 0.075, '#e8302a'), 0, 0.085, z);
          m.rotation.x = Math.PI / 2;
        }
        const c = add(ci('ioio-c', 0.012, 0.03, 0.03, '#f6f4ee'), 0, 0.085, 0);
        c.rotation.x = Math.PI / 2;
        add(cx('ioio-fio', 0.008, 0.12, 0.008, 0.002, '#f6f4ee'), 0, 0.2, 0);
        break;
      }
      case 'piao': {
        // o pião de listras vermelhas e creme, a ponta de madeira para baixo
        add(ci('piao-ponta', 0.05, 0.004, 0.022, '#b98250'), 0, 0.025, 0);
        add(ci('piao-baixo', 0.06, 0.03, 0.08, '#e8302a'), 0, 0.08, 0);
        add(ci('piao-faixa', 0.03, 0.08, 0.085, '#f2e2bd'), 0, 0.125, 0);
        add(ci('piao-cima', 0.04, 0.085, 0.05, '#e8302a'), 0, 0.16, 0);
        add(ci('piao-cabo', 0.05, 0.015, 0.015, '#8a5530'), 0, 0.205, 0);
        break;
      }
      case 'cubo_cores': {
        // o cubo de cores 2 × 2 em três cores (amarelo em cima e embaixo, vermelho e azul dos
        // lados); as juntas pretas cruzam as faces
        const L = 0.15;
        const y = L / 2 + 0.005;
        add(cx('cubo', L, L, L, 0.02, '#1c1c24'), 0, y, 0);
        const p = L - 0.016;
        for (const s of [-1, 1]) {
          add(cx(`cubo-y${s}`, p, 0.006, p, 0.004, '#ffd23a'), 0, y + s * (L / 2), 0);
          add(cx(`cubo-x${s}`, 0.006, p, p, 0.004, '#e8302a'), s * (L / 2), y, 0);
          add(cx(`cubo-z${s}`, p, p, 0.006, 0.004, '#2f6fd8'), 0, y, s * (L / 2));
        }
        add(cx('cubo-jx', 0.012, L + 0.016, L + 0.016, 0, '#1c1c24'), 0, y, 0);
        add(cx('cubo-jy', L + 0.016, 0.012, L + 0.016, 0, '#1c1c24'), 0, y, 0);
        add(cx('cubo-jz', L + 0.016, L + 0.016, 0.012, 0, '#1c1c24'), 0, y, 0);
        break;
      }
      case 'pelucia': {
        // spec 026 (etapa B): a lhama de pelúcia (a prenda das barracas): creme, as orelhinhas
        // em pé, o cachecol vermelho e a mantinha azul
        const creme = '#f6ecd8';
        const claro = '#fff7e6';
        for (const z of [-0.06, 0.06])
          add(cx(`patas${z}`, 0.115, 0.06, 0.042, 0.016, '#ecdcc0'), 0, 0.03, z);
        add(cx('corpo-p', 0.13, 0.1, 0.19, 0.042, creme), 0, 0.09, 0);
        add(cx('mantinha', 0.138, 0.075, 0.1, 0.022, '#2f8cff'), 0, 0.112, -0.02);
        add(cx('pescoco', 0.066, 0.13, 0.066, 0.026, creme), 0, 0.175, 0.062);
        add(cx('cachecol', 0.086, 0.03, 0.086, 0.013, '#e8302a'), 0, 0.196, 0.062);
        add(cx('cachecol-ponta', 0.03, 0.062, 0.014, 0.006, '#e8302a'), 0.024, 0.162, 0.103);
        add(cx('cabeca-p', 0.088, 0.074, 0.1, 0.032, creme), 0, 0.25, 0.078);
        add(cx('focinho', 0.056, 0.04, 0.036, 0.015, claro), 0, 0.238, 0.132);
        add(bo('topete', 0.021, claro, [1, 0.7, 1]), 0, 0.288, 0.084);
        for (const x of [-0.026, 0.026]) {
          add(cx(`orelha${x}`, 0.023, 0.052, 0.02, 0.009, creme), x, 0.3, 0.052);
          add(bo(`olho${x}`, 0.009, '#3a2a22'), x * 1.1, 0.262, 0.127);
        }
        break;
      }
      case 'feno': {
        // parte 3B: o fardinho de feno das lhamas (o do cartão): o bloco dourado de quinas macias,
        // as duas cintas vermelhas em volta e uns fiapos de palha soltos em cima
        add(cx('fardo', 0.25, 0.16, 0.17, 0.04, '#f2c94a'), 0, 0.08, 0);
        add(cx('fardo-topo', 0.21, 0.012, 0.13, 0.006, '#f8dc78'), 0, 0.162, 0);
        for (const x of [-0.06, 0.06])
          add(cx(`cinta${x}`, 0.026, 0.168, 0.178, 0.008, '#e8302a'), x, 0.08, 0);
        for (const [x, z, h, a] of [
          [-0.085, 0.03, 0.05, 0.5],
          [0.0, -0.04, 0.06, -0.35],
          [0.095, 0.02, 0.045, -0.6],
          [0.03, 0.05, 0.04, 0.3],
        ] as const) {
          const f = add(cx(`fiapo${x}${z}`, 0.01, h, 0.01, 0.003, '#d9a53a'), x, 0.165 + h / 2, z);
          f.rotation.z = a;
        }
        for (const [x, y] of [
          [-0.1, 0.05],
          [0.03, 0.11],
          [0.1, 0.04],
        ] as const)
          add(cx(`risco${x}`, 0.04, 0.008, 0.004, 0.002, '#c9952a'), x, y, 0.086);
        break;
      }
      case 'fatia_bolo': {
        // parte 3B: a fatia de bolo de fubá da vovó no pratinho: a cunha amarela de miolo (a ponta
        // para a frente), a casquinha dourada em cima e nas costas e o açúcar polvilhado
        add(ci('pratinho', 0.014, 0.12, 0.105, '#f4f8ff'), 0, 0.007, 0);
        const L = 0.2;
        const W = 0.15;
        const H = 0.095;
        const cunha = (n: string, h: number, cor: string) => {
          // (um prisma de três lados: a ponta em +x, as costas em -x, achatado na largura)
          const m = MeshBuilder.CreateCylinder(
            `${prefixo}-${n}`,
            { height: h, diameter: 2, tessellation: 3 },
            scene,
          );
          m.scaling.set(L / 1.5, 1, W / Math.sqrt(3));
          m.convertToFlatShadedMesh();
          m.material = mats.cor(cor);
          m.isPickable = false;
          return m;
        };
        // (o meio da cunha no meio do pratinho: a ponta a 2/3 de L, as costas a 1/3)
        const ox = -L / 6;
        add(cunha('fatia', H, '#ffd866'), ox, 0.014 + H / 2, 0);
        add(cunha('fatia-topo', 0.014, '#d9902e'), ox, 0.014 + H + 0.006, 0);
        add(cx('casca-costas', 0.016, H + 0.012, W + 0.004, 0.006, '#d9902e'), ox - L / 3, 0.014 + (H + 0.012) / 2, 0);
        for (const [x, z] of [
          [-0.05, 0.0],
          [-0.02, -0.035],
          [-0.015, 0.035],
          [0.03, 0.005],
        ] as const)
          add(bo(`acucar${x}${z}`, 0.01, '#fff6e6', [1.4, 0.4, 1.4]), x, 0.014 + H + 0.016, z);
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
      case 'colher_pedreiro': {
        // spec 014: cabo de madeira, a virola de ferro e a lâmina de aço em losango
        add(ci('cabo', 0.2, 0.03, 0.026, CABO), 0, 0.1, 0);
        add(ci('virola', 0.05, 0.022, 0.022, '#6a6e76'), 0, 0.22, 0);
        const l = add(cx('lamina', 0.16, 0.16, 0.012, 0.01, '#d8dce2', 0.5), 0, 0.33, 0);
        l.rotation.z = Math.PI / 4;
        l.scaling.y = 1.35;
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
        : (caixasDaMalha(bloco, 0, (d) => d % 2 === 1) ?? [[0, 0, 0, 1, 1, 1]]);
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
