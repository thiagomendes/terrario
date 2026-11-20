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
import { caixaArredondada, esfera } from '../render/formas';
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
    // as ancas e as patinhas de trás
    b.bola(0.1, carvao, [0.9, 0.9, 1.2], [s * 0.11, 0.09, -0.04]);
    b.bola(0.05, claro, [1, 0.6, 1.4], [s * 0.13, 0.025, 0.06]);
    // as pernas da frente em pé, com as patinhas claras
    b.caixa([0.07, 0.19, 0.07], [s * 0.06, 0.1, 0.11], carvao, 0.035);
    b.bola(0.045, claro, [1.05, 0.7, 1.2], [s * 0.06, 0.025, 0.13]);
  }
  // o rabo deitado no chão, enrolando para a frente, com a pontinha clara
  b.caixa([0.06, 0.06, 0.26], [0.17, 0.035, -0.1], carvao, 0.03, { papel: 'cauda', rot: [0, -0.35, 0] });
  b.caixa([0.06, 0.06, 0.16], [0.24, 0.035, 0.07], carvao, 0.03, { papel: 'cauda', rot: [0, 0.35, 0] });
  b.bola(0.035, claro, [1, 1, 1], [0.21, 0.04, 0.15], { papel: 'cauda' });
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
    b.caixa([0.09, 0.1, 0.04], [s * 0.1, 0.16, -0.01], carvao, 0.02, { rot: [0, 0, s * 0.55] });
    b.caixa([0.05, 0.06, 0.02], [s * 0.1, 0.155, 0.012], '#ffb3c1', 0.01, { rot: [0, 0, s * 0.55] });
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
function morcego(dormindo: boolean): PecaCriatura[] {
  const roxo = '#7a55b8';
  const asa = '#5f3f98';
  const b = bicho(1.3);
  b.bola(0.1, roxo, [1, 1.1, 0.9], [0, 0.11, 0]);
  b.bola(0.065, '#c2abe8', [1, 1.15, 0.5], [0, 0.1, 0.06]);
  for (const s of [-1, 1]) b.bola(0.025, asa, [1, 0.8, 1.2], [s * 0.035, 0.01, 0.02]);
  for (const s of [-1, 1]) {
    const papel = s > 0 ? 'asa0' : 'asa1';
    if (dormindo) {
      // as asas fechadas abraçando o corpo, na frente da barriga
      b.bola(0.11, asa, [0.55, 1.05, 0.2], [s * 0.075, 0.11, 0.075], { papel, rot: [0, s * -0.7, 0] });
    } else {
      // a asa aberta, redonda, com três gomos na beira de baixo
      b.bola(0.13, asa, [1, 0.72, 0.16], [s * 0.2, 0.13, -0.01], { papel });
      for (const k of [0, 1, 2])
        b.bola(0.045, asa, [1, 1, 0.5], [s * (0.12 + k * 0.075), 0.055, -0.01], { papel });
    }
  }
  b.grupo([0, 0.25, 0.01], 'cabeca');
  b.bola(0.1, roxo, [1.12, 1, 1], [0, 0, 0]);
  for (const s of [-1, 1]) {
    b.bola(0.045, roxo, [0.8, 1.3, 0.5], [s * 0.075, 0.1, -0.01], { rot: [0, 0, -s * 0.3] });
    b.bola(0.026, '#ffb3c1', [0.8, 1.2, 0.3], [s * 0.075, 0.1, 0.012], { rot: [0, 0, -s * 0.3] });
    b.bola(0.022, '#ff9aa8', [1.4, 0.75, 0.3], [s * 0.065, -0.035, 0.09]);
  }
  if (dormindo)
    for (const s of [-1, 1])
      // os olhinhos fechados: um risquinho curvo (dormindo de bico feliz)
      b.caixa([0.05, 0.014, 0.012], [s * 0.042, 0.005, 0.098], '#231a28', 0.006, { rot: [0, 0, s * -0.25] });
  else b.olhos(0.01, 0.09, 0.042, 0.024, { bochecha: false });
  // o sorrisinho (três bolinhas em arco)
  for (const [x, y] of [
    [-0.022, -0.03],
    [0, -0.04],
    [0.022, -0.03],
  ])
    b.bola(0.011, '#4a2a5a', [1.3, 1, 0.5], [x, y, 0.1]);
  b.bola(0.012, '#fff6f0', [0.8, 1, 0.5], [0.012, -0.045, 0.098]);
  return b.fim().pecas;
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
interface Bicho {
  raiz: TransformNode;
  partes: Parte[];
  materiais: StandardMaterial[];
  /** O pé mais baixo (y local): a raiz desce isso para o pé ficar no chão. */
  base: number;
}

/** Monta o bicho como `criaturas.ts`: uma malha por junta e por material, cor nos vértices. */
function montarBicho(ctx: CtxPalco, nome: string, desenho: PecaCriatura[]): Bicho {
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
    b.raiz.position.set(gx + k * 0.95, gy - 0.005 + b.base, gz + 0.02 * k);
    b.raiz.rotation.y = k * 0.2;
    dormindo.push(b);
  });
  const voando = [
    { b: novo('morcego-voa0', morcego(false)), c: [gx + 2.2, gy + 0.2, gz + 0.5] as V3, r: 0.3, f: 0 },
    { b: novo('morcego-voa1', morcego(false)), c: [gx + 0.5, gy - 1.25, gz + 1.0] as V3, r: 0.3, f: 2.2 },
  ];
  // a coruja no alto do poleiro, ao lado da árvore dos morceguinhos
  const cor = novo('coruja', coruja());
  const pol = pontos.poleiro ?? [gx - 1.9, gy - 0.4, gz + 1.4];
  por(cor, pol[0], pol[1], pol[2], 0.35);

  // as fantasminhas flutuando na rua, juntinhas (na frente das casinhas)
  const fantas = [
    { b: novo('fantasminha0', fantasminha()), x: ox + 22.6, z: oz + 23.0, h: 0.35, f: 0, g: 0.35 },
    { b: novo('fantasminha1', fantasminha()), x: ox + 24.6, z: oz + 24.0, h: 0.7, f: 1.7, g: 0 },
    { b: novo('fantasminha2', fantasminha()), x: ox + 26.6, z: oz + 22.7, h: 0.45, f: 3.1, g: -0.35 },
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
      if (!sim) quadro(0.2);
    },
    tomadas: {},
  };
  api.hora(false);
  // ---------------------------------------------------------------- as tomadas
  const tm = (pos: V3, alvo: V3, fov: number) => ({ pos, alvo, fov });
  api.tomadas.morcegos = {
    deitado: tm([gx - 0.9, gy - 1.5, gz + 4.4], [gx - 0.3, gy - 0.25, gz], 56),
    empe: tm([gx - 1.3, gy - 1.7, gz + 6.2], [gx - 0.9, gy - 0.1, gz], 74),
  };
  api.tomadas.fantasminhas = {
    deitado: tm([ox + 24.6, Y + 1.4, oz + 28.6], [ox + 24.6, Y + 1.0, oz + 23.3], 56),
    empe: tm([ox + 24.6, Y + 1.5, oz + 29.6], [ox + 24.6, Y + 1.1, oz + 23.3], 70),
  };
  api.tomadas.abobrinhas = {
    deitado: tm([bx - 1.6, Y + 0.95, bz + 4.0], [bx - 1.6, Y + 0.35, bz + 1.4], 50),
    empe: tm([bx - 1.6, Y + 1.0, bz + 4.6], [bx - 1.6, Y + 0.45, bz + 1.4], 62),
  };
  // (de lado do banquinho que fica longe da Vovó: ela sai do quadro)
  api.tomadas.tufinho = {
    deitado: tm([banq[0] - 0.6, banq[1] + 0.85, banq[2] + 2.3], [banq[0] + 0.05, banq[1] + 0.68, banq[2]], 44),
    empe: tm([banq[0] - 0.6, banq[1] + 0.9, banq[2] + 2.6], [banq[0] + 0.05, banq[1] + 0.72, banq[2]], 56),
  };
  return api;
}
