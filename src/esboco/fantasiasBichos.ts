/**
 * Esboço da spec 027 (Noite das Fantasias), parte 2: os bichos fofos, no padrão dos bichos do
 * jogo (`render/bichoBrinquedo.ts`, as peças de `PecaCriatura` desenhadas à mão com o montador
 * `bicho(k)` do Rancho, as juntas de `juntasBicho.ts` e o mesmo plástico de `criaturas.ts`):
 * - Tufinho, o gato da Vovó: carvão, com focinho, peito e patinhas claros, o lacinho laranja e
 *   os olhões amigáveis; sentado no banquinho da varanda.
 * - Morceguinhos roxos de asa redonda e carinha sorrindo: três dormindo de cabeça para baixo
 *   no galho do bosque, dois voando baixinho.
 * - A coruja do Rancho repintada (lilás e creme), em cima do galho.
 * - Fantasminhas pastel sorridentes que brilham de leve, flutuando na rua.
 * - Abóboras saltitantes de perninhas curtas, pulando na horta.
 * A animação é simples (asa batendo, fantasminha subindo e descendo, abóbora pulando) e para
 * num instante bonito para as fotos (`animar(false)`).
 *
 * Tudo PROVISÓRIO (o palco do esboço): na implementação, viram criaturas do tema.
 */
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import type { PecaCriatura } from '../temas/tipos';
import { bicho, CRIATURAS_RANCHO } from '../temas/rancho-alegre/criaturas';
import { bichoDeBrinquedo } from '../render/bichoBrinquedo';
import { juntasDoBicho } from '../render/juntasBicho';
import { caixaArredondada, dadosPlaca, esfera } from '../render/formas';
import { COR, sombrinha, type CtxPalco } from './fantasiasGente';

type V3 = [number, number, number];

// ------------------------------------------------------------------ os desenhos

/** Tufinho sentado: carvão, focinho, peito e patinhas creme, lacinho laranja, olhões âmbar. */
function tufinho(): PecaCriatura[] {
  const carvao = '#3c3744';
  const claro = '#f1e8dc';
  const b = bicho(1.25);
  // o corpo sentado (as ancas atrás, o peito claro na frente)
  b.bola(0.165, carvao, [1, 1.05, 1.12], [0, 0.17, -0.04]);
  b.bola(0.115, claro, [1, 1.25, 0.75], [0, 0.25, 0.075]);
  for (const s of [-1, 1]) {
    // as ancas e a patinha de trás (branca, deitada debaixo da anca)
    b.bola(0.1, carvao, [0.9, 0.9, 1.2], [s * 0.11, 0.09, -0.04]);
    b.bola(0.055, claro, [0.9, 0.45, 1.5], [s * 0.13, 0.02, 0.03]);
    // as pernas da frente em pé, com as "meias" brancas inteiras (a patinha é a meia, sem
    // bolinha solta na frente)
    b.caixa([0.07, 0.12, 0.07], [s * 0.06, 0.135, 0.11], carvao, 0.033);
    b.caixa([0.075, 0.09, 0.08], [s * 0.06, 0.045, 0.115], claro, 0.035);
  }
  // o rabo deitado no chão, enrolando para a frente (todo carvão)
  b.caixa([0.06, 0.06, 0.26], [0.17, 0.035, -0.1], carvao, 0.03, { papel: 'cauda', rot: [0, -0.35, 0] });
  b.caixa([0.06, 0.06, 0.16], [0.24, 0.035, 0.07], carvao, 0.03, { papel: 'cauda', rot: [0, 0.35, 0] });
  // o lacinho laranja no pescoço
  for (const s of [-1, 1])
    b.bola(0.045, COR.laranja, [1.2, 0.85, 0.6], [s * 0.05, 0.335, 0.115], { rot: [0, 0, s * 0.3] });
  b.bola(0.024, COR.laranjaEscuro, [1, 1, 1], [0, 0.335, 0.14]);
  // a cabeça
  b.grupo([0, 0.45, 0.06], 'cabeca');
  b.caixa([0.3, 0.26, 0.26], [0, 0, 0], carvao, 0.11);
  b.bola(0.075, claro, [1.25, 0.75, 0.8], [0, -0.06, 0.115]);
  b.bola(0.024, '#ff9aae', [1.2, 0.85, 0.8], [0, -0.025, 0.17]);
  for (const s of [-1, 1]) {
    // as orelhas: triângulos de ponta redonda (um losango meio enterrado na cabeça)
    // (bem enterrado: só a metade de cima aparece, um triângulo de ponta redonda)
    b.caixa([0.12, 0.12, 0.045], [s * 0.088, 0.1, -0.01], carvao, 0.018, { rot: [0, 0, Math.PI / 4 + s * 0.1] });
    b.caixa([0.06, 0.06, 0.02], [s * 0.088, 0.115, 0.014], '#ffb3c1', 0.01, { rot: [0, 0, Math.PI / 4 + s * 0.1] });
    b.caixa([0.12, 0.008, 0.008], [s * 0.12, -0.05, 0.15], claro, 0.004, { rot: [0, 0, s * 0.12] });
    // os olhões: âmbar com a pupila grande e o pontinho de brilho (amigáveis, nada de bravo)
    b.bola(0.05, '#f4c64e', [0.95, 1.05, 0.45], [s * 0.068, 0.025, 0.124]);
    b.bola(0.033, '#231a28', [0.9, 1.1, 0.45], [s * 0.068, 0.022, 0.138], { brilho: 0.35 });
    b.bola(0.013, '#ffffff', [1, 1, 0.5], [s * 0.068 + 0.012, 0.042, 0.152], { brilho: 0.3 });
    b.bola(0.03, '#ff9aa8', [1.4, 0.75, 0.3], [s * 0.115, -0.045, 0.125]);
  }
  return b.fim().pecas;
}

/** Morceguinho roxo de asa redonda: acordado (voando) ou dormindo (asas fechadas na frente). */
/** As cores do morceguinho: lilás claro com a barriga creme (de noite não some no céu roxo). */
const MORCEGO = { corpo: '#9b80d6', barriga: '#f3e8d4', asa: '#8a6dc9', braco: '#6b52a8', escala: 1.3 };

function morcego(dormindo: boolean): PecaCriatura[] {
  const { corpo: roxo, asa } = MORCEGO;
  const b = bicho(MORCEGO.escala);
  b.bola(0.1, roxo, [1, 1.1, 0.9], [0, 0.11, 0]);
  b.bola(0.068, MORCEGO.barriga, [1, 1.15, 0.5], [0, 0.1, 0.06]);
  for (const s of [-1, 1]) b.bola(0.025, asa, [1, 0.8, 1.2], [s * 0.035, 0.01, 0.02]);
  for (const s of [-1, 1]) {
    const papel = s > 0 ? 'asa0' : 'asa1';
    if (dormindo) {
      // as asas dobradas em volta do corpo, como uma capinha fechada na frente (a carinha de fora)
      b.bola(0.12, asa, [0.6, 1.05, 0.95], [s * 0.05, 0.1, 0.0], { papel, rot: [0, s * -0.35, 0] });
      b.bola(0.09, asa, [0.6, 1.0, 0.35], [s * 0.045, 0.09, 0.075], { papel, rot: [0, s * -0.5, 0] });
    } else {
      // só o bracinho fino por cima da asa: a membrana em leque é uma malha própria
      // (`asaDeMorcego`), presa a esta mesma junta
      b.caixa([0.3, 0.022, 0.022], [s * 0.21, 0.225, -0.01], MORCEGO.braco, 0.011, { papel, rot: [0, 0, s * 0.12] });
    }
  }
  b.grupo([0, 0.25, 0.01], 'cabeca');
  b.bola(0.1, roxo, [1.12, 1, 1], [0, 0, 0]);
  for (const s of [-1, 1]) {
    // as orelhinhas pontudas (um losango meio enterrado: só a ponta de cima aparece)
    b.caixa([0.09, 0.09, 0.035], [s * 0.065, 0.075, -0.01], roxo, 0.014, { rot: [0, 0, Math.PI / 4 - s * 0.2] });
    b.caixa([0.045, 0.045, 0.02], [s * 0.065, 0.085, 0.01], '#ffb3c1', 0.008, { rot: [0, 0, Math.PI / 4 - s * 0.2] });
    b.bola(0.022, '#ff9aa8', [1.4, 0.75, 0.3], [s * 0.065, -0.035, 0.09]);
  }
  if (dormindo)
    for (const s of [-1, 1])
      // os olhinhos fechados: um arquinho bem legível (três pontinhos em curva)
      for (const [dx, dy] of [
        [-0.022, 0.006],
        [0, -0.004],
        [0.022, 0.006],
      ])
        b.bola(0.011, '#2a1f3a', [1.4, 1, 0.5], [s * 0.045 + dx, 0.012 + dy, 0.1]);
  else b.olhos(0.01, 0.09, 0.042, 0.026, { bochecha: false });
  // a boquinha sorrindo (três bolinhas em arco), sem dente nenhum
  for (const [x, y] of [
    [-0.022, -0.03],
    [0, -0.04],
    [0.022, -0.03],
  ])
    b.bola(0.011, '#4a2a5a', [1.3, 1, 0.5], [x, y, 0.1]);
  return b.fim().pecas;
}

/**
 * A asa aberta do morceguinho: uma membrana fina em leque, no plano da asa, com três pontas
 * redondas embaixo e a beira recortada em ondas entre elas; o bracinho fica por cima (peça do
 * desenho). Coordenadas do bicho (antes da escala do desenho), o ombro em x = 0,06.
 */
function perfilAsa(s: 1 | -1): Array<[number, number]> {
  const pts: Array<[number, number]> = [];
  // a beira de baixo, de dentro para fora: ondas descendo até cada ponta redonda
  const pontas: Array<[number, number]> = [
    [0.13, 0.035],
    [0.24, 0.02],
    [0.35, 0.06],
  ];
  let ant: [number, number] = [0.06, 0.09];
  pts.push(ant);
  for (const [px, py] of pontas) {
    // a onda: sobe um tico no meio e desce até a ponta, redondinha
    for (let i = 1; i <= 5; i++) {
      const t = i / 5;
      const x = ant[0] + (px - ant[0]) * t;
      const y = ant[1] + (py - ant[1]) * t + 0.035 * Math.sin(Math.PI * t);
      pts.push([x, y]);
    }
    ant = [px, py];
  }
  // a ponta de fora e a beira de cima (o bracinho), voltando ao ombro
  pts.push([0.375, 0.12], [0.36, 0.2], [0.3, 0.235], [0.2, 0.235], [0.1, 0.205], [0.06, 0.18]);
  const k = MORCEGO.escala;
  const out = pts.map(([x, y]) => [s * x * k, y * k] as [number, number]);
  return s > 0 ? out : out.reverse();
}

/** A coruja do Rancho (`rancho-alegre/criaturas.ts`), repintada de lilás e creme. */
function coruja(): PecaCriatura[] {
  const troca: Record<string, string> = {
    '#b88a5a': '#c6b2ec',
    '#f4e0b8': '#fbf3e4',
    '#9a6a44': '#a68ed8',
    '#c9a274': '#d8c8f0',
  };
  return CRIATURAS_RANCHO.espectro.map((p) => {
    const q = { ...p, p: [...p.p] as V3, cor: troca[p.cor] ?? p.cor };
    // a barriga creme e as pintinhas um tico para a frente: aparecem na frente do corpo
    if (p.cor === '#f4e0b8' || p.cor === '#c9a274') q.p[2] += 0.05;
    // os olhões: o aro amarelo sem acender (de noite brilhava demais) e a pupila no meio do
    // olho, um tico maior (de perto parecia vesga)
    if (p.cor === '#ffe27a') q.brilho = 0.2;
    if (p.cor === '#2a1f3a') {
      q.p[0] = Math.sign(p.p[0]) * Math.abs(p.p[0]) * 1.04;
      q.t = [p.t[0] * 1.12, p.t[1] * 1.12, p.t[2]];
    }
    return q;
  });
}

/** Fantasminha pastel sorridente (brilha de leve), de barra ondulada e bracinhos. */
function fantasminha(): PecaCriatura[] {
  const corpo = '#f4f0ff';
  const barra = '#e4dafa';
  const b = bicho(1);
  b.bola(0.3, corpo, [1, 1.02, 0.95], [0, 0.58, 0], { brilho: 0.3 });
  b.bola(0.27, corpo, [1, 0.9, 0.92], [0, 0.38, 0], { brilho: 0.3 });
  for (let i = 0; i < 6; i++) {
    const t = (i / 6) * Math.PI * 2 + 0.3;
    b.bola(0.1, barra, [1, 0.9, 1], [Math.sin(t) * 0.19, 0.17, Math.cos(t) * 0.18], { brilho: 0.3 });
  }
  for (const s of [-1, 1])
    b.bola(0.075, corpo, [0.8, 1.25, 0.8], [s * 0.29, 0.43, 0.05], { brilho: 0.3, rot: [0, 0, s * 0.6] });
  b.grupo([0, 0, 0], 'cabeca');
  for (const s of [-1, 1]) {
    b.bola(0.05, '#2a2240', [0.85, 1.1, 0.45], [s * 0.1, 0.62, 0.27]);
    b.bola(0.017, '#ffffff', [1, 1, 0.5], [s * 0.1 + 0.016, 0.645, 0.29], { brilho: 0.3 });
    b.bola(0.04, '#ffb0c4', [1.4, 0.75, 0.3], [s * 0.19, 0.53, 0.25]);
  }
  for (let i = 0; i <= 4; i++) {
    const u = -1 + i / 2;
    b.bola(0.016, '#5a3a7a', [1.2, 1, 0.5], [u * 0.06, 0.52 - 0.022 * (1 - u * u), 0.285]);
  }
  return b.fim().pecas;
}

/** Abóbora saltitante: a abóbora de brinquedo com perninhas curtas e carinha sorrindo. */
function aboboraSaltitante(): PecaCriatura[] {
  const b = bicho(1.1);
  for (const s of [-1, 1]) {
    const papel = s > 0 ? 'perna0' : 'perna1';
    b.caixa([0.06, 0.14, 0.06], [s * 0.085, 0.08, 0], COR.musgo, 0.03, { papel });
    b.bola(0.045, COR.musgoEscuro, [1, 0.65, 1.4], [s * 0.085, 0.025, 0.03], { papel });
  }
  b.bola(0.19, '#e07c1e', [1.15, 0.84, 1.1], [0, 0.3, 0]);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    b.bola(0.135, i % 2 ? '#f28c26' : '#e4801f', [0.62, 0.98, 1], [Math.sin(a) * 0.1, 0.3, Math.cos(a) * 0.1], {
      rot: [0, a, 0],
    });
  }
  b.caixa([0.05, 0.09, 0.05], [0.01, 0.47, 0], '#6b7a2e', 0.02, { rot: [0, 0, -0.25] });
  b.bola(0.06, '#5cbf63', [1.6, 0.25, 1], [-0.06, 0.45, 0.02], { rot: [0, 0.4, 0.3] });
  for (const s of [-1, 1]) {
    b.bola(0.036, '#3a1c0c', [0.85, 1.1, 0.45], [s * 0.075, 0.34, 0.215]);
    b.bola(0.012, '#ffffff', [1, 1, 0.5], [s * 0.075 + 0.012, 0.355, 0.23], { brilho: 0.3 });
    b.bola(0.03, '#ff9aa8', [1.4, 0.75, 0.3], [s * 0.14, 0.285, 0.2]);
  }
  for (let i = 0; i <= 4; i++) {
    const u = -1 + i / 2;
    b.bola(0.014, '#3a1c0c', [1.2, 1, 0.5], [u * 0.05, 0.27 - 0.02 * (1 - u * u), 0.225]);
  }
  return b.fim().pecas;
}

// ------------------------------------------------------------------ o montador

interface Parte {
  no: TransformNode;
  papel: PecaCriatura['papel'];
}
export interface Bicho {
  raiz: TransformNode;
  partes: Parte[];
  materiais: StandardMaterial[];
  /** O pé mais baixo (y local): a raiz desce isso para o pé ficar no chão. */
  base: number;
}

/** Monta o bicho como `criaturas.ts`: uma malha por junta e por material, cor nos vértices. */
export function montarBicho(ctx: CtxPalco, nome: string, desenho: PecaCriatura[]): Bicho {
  const { scene } = ctx;
  const pecas = bichoDeBrinquedo(desenho);
  const raiz = new TransformNode(`esboco-bicho-${nome}`, scene);
  const plastico = new StandardMaterial(`esboco-bicho-${nome}-plastico`, scene);
  plastico.diffuseColor = new Color3(0.78, 0.78, 0.78);
  plastico.specularColor = new Color3(0.22, 0.22, 0.22);
  plastico.specularPower = 40;
  plastico.emissiveColor = new Color3(0.36, 0.36, 0.36);
  const suave = plastico.clone(`esboco-bicho-${nome}-suave`);
  suave.emissiveColor = new Color3(0.45, 0.45, 0.45);
  const forte = plastico.clone(`esboco-bicho-${nome}-forte`);
  forte.emissiveColor = new Color3(0.55, 0.55, 0.55);
  const grupos = juntasDoBicho(pecas);
  let n = 0;
  let base = Infinity;
  for (const p of pecas) base = Math.min(base, p.p[1] - p.t[1] / 2);
  const partes = grupos.map((g) => {
    const no = new TransformNode(`esboco-bicho-${nome}-g${n++}`, scene);
    no.parent = raiz;
    no.position.set(g.pivo[0], g.pivo[1], g.pivo[2]);
    const porClasse: Record<'plastico' | 'suave' | 'forte', Mesh[]> = { plastico: [], suave: [], forte: [] };
    for (const peca of g.pecas) {
      const [w, h, d] = peca.t;
      const maior = Math.max(w, h, d);
      const nm = `esboco-bicho-${nome}-p${n++}`;
      const malha =
        peca.forma === 'bola'
          ? esfera(nm, scene, maior / 2, plastico, [w / maior, h / maior, d / maior])
          : caixaArredondada(nm, scene, w, h, d, peca.raio, plastico, 3);
      malha.position.set(peca.p[0] - g.pivo[0], peca.p[1] - g.pivo[1], peca.p[2] - g.pivo[2]);
      if (peca.rot) malha.rotation.set(peca.rot[0], peca.rot[1], peca.rot[2]);
      const cor = Color3.FromHexString(peca.cor);
      const nv = malha.getTotalVertices();
      const cores = new Float32Array(nv * 4);
      for (let k = 0; k < nv; k++) cores.set([cor.r, cor.g, cor.b, 1], k * 4);
      malha.setVerticesData(VertexBuffer.ColorKind, cores);
      const bb = peca.brilho ?? 0;
      porClasse[bb > 0.45 ? 'forte' : bb > 0.25 ? 'suave' : 'plastico'].push(malha);
    }
    for (const [classe, lista] of Object.entries(porClasse) as ['plastico' | 'suave' | 'forte', Mesh[]][]) {
      if (!lista.length) continue;
      const f = lista.length === 1 ? lista[0] : Mesh.MergeMeshes(lista, true, true, undefined, false, false);
      if (!f) continue;
      f.parent = no;
      f.material = classe === 'plastico' ? plastico : classe === 'suave' ? suave : forte;
      f.isPickable = false;
      if (classe !== 'forte') ctx.semBrilho(f);
    }
    return { no, papel: g.papel };
  });
  return { raiz, partes, materiais: [plastico, suave, forte], base };
}

// ------------------------------------------------------------------ os bichos no palco

export interface Bichos {
  hora(noite: boolean): void;
  /** Liga ou para a animação (parada: o instante bonito das fotos). */
  animar(sim: boolean): void;
  tomadas: Record<string, Record<'deitado' | 'empe', { pos: V3; alvo: V3; fov: number }>>;
}

export function montarBichos(ctx: CtxPalco): Bichos {
  const { scene, O, pontos } = ctx;
  const { ox, oz } = O;
  const Y = O.y + 1;
  const todos: Bicho[] = [];
  const novo = (nome: string, d: PecaCriatura[]) => {
    const b = montarBicho(ctx, nome, d);
    todos.push(b);
    return b;
  };
  /** Põe o bicho com o pé em y (e a sombrinha no chão, quando dada). */
  const por = (b: Bicho, x: number, y: number, z: number, giro: number) => {
    b.raiz.position.set(x, y - b.base, z);
    b.raiz.rotation.y = giro;
  };
  const sombra = (nome: string, x: number, z: number, r: number, y = Y) => {
    const m = sombrinha(ctx, `esboco-bicho-${nome}-sombra`, r);
    m.position.set(x, y + 0.025, z);
    return m;
  };

  // o Tufinho no banquinho da varanda da Vovó (o assento a 0,42 do chão)
  const [vx, , vz] = pontos.vovo;
  const banq = pontos.banquinho ?? [vx + 1.5, Y, vz + 1.3];
  const tuf = novo('tufinho', tufinho());
  por(tuf, banq[0], banq[1] + 0.5, banq[2] + 0.02, -0.35);

  // os morceguinhos: três dormindo de cabeça para baixo debaixo do galho, dois voando
  const [gx, gy, gz] = pontos.galho;
  const dormindo: Bicho[] = [];
  [-1, 0, 1].forEach((k) => {
    const b = novo(`morcego-dorme${k}`, morcego(true));
    // de cabeça para baixo: o pezinho no galho (a parte de baixo do bloco)
    b.raiz.rotation.z = Math.PI;
    // (o giro em z vira de ponta-cabeça e deixa a carinha para +z)
    // (um tico para o lado do tronco: de frente, nenhum fica em cima do lampião do caminho)
    b.raiz.position.set(gx - 0.2 + k * 0.9, gy - 0.005 + b.base, gz + 0.02 * k);
    b.raiz.rotation.y = k * 0.2;
    dormindo.push(b);
  });
  // (um só voando, no vão debaixo do galho, longe do tronco e da cabeça dos postes: o que voava
  // colado no tronco parecia esquilo)
  const voando = [{ b: novo('morcego-voa1', morcego(false)), c: [gx + 1.45, gy - 0.65, gz + 1.6] as V3, r: 0.22, f: 2.2 }];
  // a asa em leque de cada um que voa: a membrana fina presa à junta da asa (bate junto)
  for (const v of voando)
    for (const parte of v.b.partes) {
      if (parte.papel !== 'asa0' && parte.papel !== 'asa1') continue;
      const s = parte.papel === 'asa0' ? 1 : -1;
      const vd = dadosPlaca(perfilAsa(s), 0.014 * MORCEGO.escala);
      const P = vd.positions as number[];
      const piv = parte.no.position;
      for (let i = 0; i < P.length; i += 3) {
        P[i] -= piv.x;
        P[i + 1] -= piv.y;
        P[i + 2] += -0.012 * MORCEGO.escala - piv.z;
      }
      const c = Color3.FromHexString(MORCEGO.asa);
      const n = P.length / 3;
      const cores = new Float32Array(n * 4);
      for (let i = 0; i < n; i++) cores.set([c.r, c.g, c.b, 1], i * 4);
      vd.colors = cores;
      vd.uvs = null;
      const m = new Mesh(`esboco-bicho-asa-${s}`, scene);
      vd.applyToMesh(m);
      m.material = v.b.materiais[0];
      m.parent = parte.no;
      m.isPickable = false;
      ctx.semBrilho(m);
    }
  // a coruja no alto do poleiro, ao lado da árvore dos morceguinhos (menor: na foto dos
  // morcegos, quem aparece são eles)
  const cor = novo('coruja', coruja());
  const pol = pontos.poleiro ?? [gx - 1.9, gy - 0.4, gz + 1.4];
  cor.raiz.scaling.setAll(0.7);
  cor.raiz.position.set(pol[0], pol[1] - cor.base * 0.7, pol[2]);
  cor.raiz.rotation.y = 0.35;

  // as fantasminhas flutuando na rua, juntinhas (na frente das casinhas)
  const fantas = [
    { b: novo('fantasminha0', fantasminha()), x: ox + 22.1, z: oz + 23.0, h: 0.35, f: 0, g: 0.35 },
    { b: novo('fantasminha1', fantasminha()), x: ox + 23.8, z: oz + 24.0, h: 0.7, f: 1.7, g: 0 },
    { b: novo('fantasminha2', fantasminha()), x: ox + 25.5, z: oz + 22.7, h: 0.45, f: 3.1, g: -0.35 },
  ];
  for (const q of fantas) {
    q.b.raiz.scaling.setAll(q.f === 0 ? 0.85 : 1);
    sombra(`f${q.f}`, q.x, q.z, 0.38);
  }
  // as abóboras saltitantes na horta (na frente do canteiro, perto da bancada)
  const [bx, , bz] = pontos.bancada;
  const pulos = [
    { b: novo('abobora0', aboboraSaltitante()), x: bx - 2.3, z: bz + 1.0, f: 0, g: 0.35 },
    { b: novo('abobora1', aboboraSaltitante()), x: bx - 1.0, z: bz + 1.9, f: 1.2, g: 0.1 },
  ];
  const sombrasPulo = pulos.map((q, i) => sombra(`pulo${i}`, q.x, q.z, 0.3));
  for (const q of pulos) por(q.b, q.x, Y, q.z, q.g);

  // halos suaves das fantasminhas (só de noite)
  const tex = new DynamicTexture('esboco-fantasminha-halo', { width: 64, height: 64 }, scene, false);
  const g = tex.getContext();
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(220,210,255,0.5)');
  gr.addColorStop(0.45, 'rgba(200,180,255,0.18)');
  gr.addColorStop(1, 'rgba(180,160,255,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, 64, 64);
  tex.update();
  tex.hasAlpha = true;
  const mh = new StandardMaterial('esboco-fantasminha-halo', scene);
  mh.disableLighting = true;
  mh.emissiveTexture = tex;
  mh.opacityTexture = tex;
  mh.diffuseColor = Color3.Black();
  mh.specularColor = Color3.Black();
  mh.alphaMode = 1;
  mh.backFaceCulling = false;
  const halos = fantas.map((q, i) => {
    const m = MeshBuilder.CreatePlane(`esboco-fantasminha-halo${i}`, { size: 1.6 }, scene);
    m.material = mh;
    m.billboardMode = Mesh.BILLBOARDMODE_ALL;
    m.parent = q.b.raiz;
    m.position.set(0, 0.45, -0.1);
    m.isPickable = false;
    ctx.foraDoBrilho(m);
    return m;
  });
  // o brilhinho de contorno dos morceguinhos de noite (um halo lilás bem fraco atrás de cada um:
  // no céu roxo, eles não somem)
  for (const [i, b] of [...dormindo, ...voando.map((v) => v.b)].entries()) {
    const m = MeshBuilder.CreatePlane(`esboco-morcego-halo${i}`, { size: 0.9 }, scene);
    m.material = mh;
    m.billboardMode = Mesh.BILLBOARDMODE_ALL;
    m.parent = b.raiz;
    m.position.set(0, 0.22, -0.12);
    m.isPickable = false;
    ctx.foraDoBrilho(m);
    halos.push(m);
  }

  let animando = true;
  let t = 0;
  /** O instante de tudo: `t` em segundos (parado: o instante das fotos). */
  const quadro = (tt: number) => {
    // asas dos que voam batendo, e uma voltinha devagar
    for (const v of voando) {
      const a = tt * 0.6 + v.f;
      v.b.raiz.position.set(v.c[0] + Math.cos(a) * v.r, v.c[1] + Math.sin(tt * 2.1 + v.f) * 0.12 - v.b.base, v.c[2] + Math.sin(a) * v.r * 0.6);
      v.b.raiz.rotation.y = -a + Math.PI * 0.9;
      const bate = Math.sin(tt * 11 + v.f);
      for (const p of v.b.partes) {
        if (p.papel === 'asa0') p.no.rotation.z = 0.15 + bate * 0.55;
        if (p.papel === 'asa1') p.no.rotation.z = -0.15 - bate * 0.55;
      }
    }
    // os que dormem respiram devagarinho (balançam um tico)
    dormindo.forEach((b, i) => (b.raiz.rotation.x = Math.sin(tt * 0.9 + i) * 0.04));
    // fantasminhas sobem e descem
    for (const q of fantas) {
      const y = Y + q.h + Math.sin(tt * 1.6 + q.f) * 0.1;
      por(q.b, q.x, y, q.z, q.g + Math.sin(tt * 0.7 + q.f) * 0.15);
    }
    // abóboras pulando (agacham, sobem, caem); a sombrinha encolhe no alto
    pulos.forEach((q, i) => {
      const c = ((tt * 1.3 + q.f) % 1 + 1) % 1;
      const alto = Math.max(0, Math.sin(c * Math.PI * 2));
      const agacha = Math.max(0, -Math.sin(c * Math.PI * 2));
      por(q.b, q.x, Y + alto * 0.32, q.z, q.g);
      q.b.raiz.scaling.set(1 + agacha * 0.1, 1 - agacha * 0.14 + alto * 0.05, 1 + agacha * 0.1);
      for (const p of q.b.partes)
        if (p.papel === 'perna0' || p.papel === 'perna1') p.no.rotation.x = -alto * 0.5;
      sombrasPulo[i].scaling.setAll(1 - alto * 0.35);
    });
    // o Tufinho abana a pontinha do rabo
    for (const p of tuf.partes) if (p.papel === 'cauda') p.no.rotation.y = Math.sin(tt * 1.4) * 0.12;
  };
  scene.onBeforeRenderObservable.add(() => {
    if (!animando) return;
    t += scene.getEngine().getDeltaTime() / 1000;
    quadro(t);
  });
  quadro(0.15);

  const api: Bichos = {
    hora(noite) {
      const l = noite ? 0.8 : 1;
      for (const b of todos) {
        const [pl, su, fo] = b.materiais;
        pl.diffuseColor.set(l * 0.78, l * 0.78, l * 0.78);
        pl.emissiveColor.set(l * 0.36, l * 0.36, l * 0.36);
        su.diffuseColor.set(l * 0.78, l * 0.78, l * 0.78);
        fo.diffuseColor.set(l * 0.78, l * 0.78, l * 0.78);
      }
      for (const h of halos) h.setEnabled(noite);
    },
    animar(sim) {
      animando = sim;
      // parado: um instante bonito (uma abóbora no alto do pulo, a outra agachada; as asas
      // abertas; as fantasminhas em alturas diferentes)
      if (!sim) {
        quadro(0.2);
        // (os que voam de frente para a foto: de costas, o morceguinho parecia aranha)
        voando.forEach((v) => (v.b.raiz.rotation.y = 0.12));
      }
    },
    tomadas: {},
  };
  api.hora(false);
  // ---------------------------------------------------------------- as tomadas
  const tm = (pos: V3, alvo: V3, fov: number) => ({ pos, alvo, fov });
  api.tomadas.morcegos = {
    // (de mais perto: os morceguinhos grandes no quadro, a coruja no canto)
    deitado: tm([gx - 0.45, gy - 1.25, gz + 3.4], [gx - 0.3, gy - 0.45, gz + 0.3], 54),
    empe: tm([gx - 0.5, gy - 1.35, gz + 4.3], [gx - 0.35, gy - 0.3, gz + 0.3], 70),
  };
  api.tomadas.fantasminhas = {
    deitado: tm([ox + 23.8, Y + 1.4, oz + 28.6], [ox + 23.8, Y + 1.0, oz + 23.3], 56),
    empe: tm([ox + 23.8, Y + 1.25, oz + 31.4], [ox + 23.8, Y + 1.9, oz + 23.3], 74),
  };
  api.tomadas.abobrinhas = {
    deitado: tm([bx - 2.0, Y + 0.95, bz + 4.8], [bx - 1.6, Y + 0.4, bz + 1.4], 50),
    empe: tm([bx - 1.65, Y + 0.9, bz + 5.6], [bx - 1.65, Y + 0.9, bz + 1.4], 66),
  };
  // (um tico do lado de fora do banquinho: a Vovó sai do quadro e a campainha da porta fica de
  // lado, longe das costas dele)
  api.tomadas.tufinho = {
    deitado: tm([banq[0] + 0.35, banq[1] + 0.8, banq[2] + 2.4], [banq[0] + 0.02, banq[1] + 0.66, banq[2]], 38),
    empe: tm([banq[0] + 0.3, banq[1] + 0.8, banq[2] + 2.8], [banq[0] + 0.02, banq[1] + 0.95, banq[2]], 50),
  };
  return api;
}
