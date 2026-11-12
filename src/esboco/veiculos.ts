/**
 * Esboço dos veículos da spec 014 (só com `?esboco=veiculos`, por cima do palco da cidade de
 * `cidade.ts`). Quatro versões de táxi e ônibus (e um extra) feitas das mesmas peças de
 * plástico de brinquedo dos bonecos e das fantasias (`criarPlasticos`, caixas arredondadas,
 * esferas, anéis), para o dono escolher. Nada disto é o veículo de verdade (T12 a T14).
 */
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import type { Material } from '@babylonjs/core/Materials/material';
import type { Scene } from '@babylonjs/core/scene';
import { caixaFeita, criarPlasticos, dadosAnel, dadosEsfera } from '../render/formas';

type Qual =
  | 'taxi'
  | 'onibus'
  | 'extra'
  | 'policia'
  | 'civil1'
  | 'civil2'
  | 'civil3'
  | 'civil4'
  | 'onibus2';
interface Veiculo {
  qual: Qual;
  raiz: TransformNode;
  /** A carroceria (balança sobre as rodas). */
  corpo: TransformNode;
  pecas: Mesh[];
  farois: Mesh[];
  lanternas: Mesh[];
  /** Giroflex da polícia: pisca macio (acende azul e branco). */
  giro: Mesh[];
  porta: Mesh | null;
  rodas: TransformNode[];
}

interface EsbocoVeiculos {
  mostrar(versao: number): void;
  /** Rodada 2: a família da versão 3 inteira na rua (táxi, polícia, carros, dois ônibus, sorvete). */
  frota(): void;
  /** Giroflex aceso (de dia também, para a foto). */
  giroflex(aceso: boolean): void;
  noite(ligada: boolean): void;
  /** Inclina a carroceria para a frente (radianos) e achata um pouco: o balanço de parar. */
  balanco(angulo: number, achata?: number): void;
  porta(aberta: boolean): void;
  mover(qual: Qual, x: number, z: number, yaw?: number): void;
  balao(qual: Qual, texto: string | null): void;
  custo(): Record<string, { triangulos: number; chamadas: number; pecas: number }>;
  pontos: Partial<Record<Qual, [number, number, number]>>;
}

declare global {
  interface Window {
    __veiculos?: EsbocoVeiculos;
  }
}

export function prepararEsbocoVeiculos(): void {
  const esperar = () => {
    const e = window.__brumaluz;
    if (e?.ready && window.__esboco && e.cenaBabylon) ligar(e.cenaBabylon() as Scene);
    else setTimeout(esperar, 250);
  };
  esperar();
}

function ligar(scene: Scene): void {
  const pl = criarPlasticos(scene, 'veiculos');
  const veiculos = new Map<Qual, Veiculo>();
  const baloes = new Map<Qual, Mesh>();
  let noite = false;
  const pontos: Partial<Record<Qual, [number, number, number]>> = {
    taxi: [0, 0, 0],
    onibus: [0, 0, 0],
    extra: [0, 0, 0],
  };

  // ------------------------------------------------------------------ peças
  const mat = (cor: string, brilho = 0.35) => pl.cor(cor, brilho);
  const malha = (nome: string, pai: TransformNode, m: Material, v: Mesh) => {
    v.name = nome;
    v.material = m;
    v.parent = pai;
    v.isPickable = false;
    v.receiveShadows = true;
    return v;
  };
  function caixa(
    ve: Veiculo,
    w: number,
    h: number,
    d: number,
    r: number,
    cor: string,
    x: number,
    y: number,
    z: number,
    brilho = 0.35,
    pai?: TransformNode,
  ) {
    const m = new Mesh('peca', scene);
    caixaFeita(w, h, d, Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001), 4).applyToMesh(m);
    malha('peca', pai ?? ve.corpo, mat(cor, brilho), m);
    m.position.set(x, y, z);
    ve.pecas.push(m);
    return m;
  }
  function bola(
    ve: Veiculo,
    r: number,
    cor: string,
    x: number,
    y: number,
    z: number,
    esc: [number, number, number] = [1, 1, 1],
    brilho = 0.45,
    pai?: TransformNode,
  ) {
    const m = new Mesh('peca', scene);
    dadosEsfera(r).applyToMesh(m);
    malha('peca', pai ?? ve.corpo, mat(cor, brilho), m);
    m.position.set(x, y, z);
    m.scaling.set(...esc);
    ve.pecas.push(m);
    return m;
  }
  function cilindro(
    ve: Veiculo,
    h: number,
    r: number,
    cor: string,
    x: number,
    y: number,
    z: number,
    brilho = 0.4,
    pai?: TransformNode,
  ) {
    const m = MeshBuilder.CreateCylinder(
      'peca',
      { height: h, diameter: r * 2, tessellation: 16 },
      scene,
    );
    malha('peca', pai ?? ve.corpo, mat(cor, brilho), m);
    m.position.set(x, y, z);
    ve.pecas.push(m);
    return m;
  }
  /** Roda: pneu redondo (anel gordo), miolo e calota. `estilo` muda a calota. */
  function roda(
    ve: Veiculo,
    x: number,
    z: number,
    raio: number,
    estilo: 'calota' | 'faixa-branca' | 'bloco' | 'estrela',
  ) {
    const no = new TransformNode('roda', scene);
    no.parent = ve.raiz;
    no.position.set(x, raio, z);
    ve.rodas.push(no);
    const esp = raio * 0.62;
    const pneu = new Mesh('pneu', scene);
    dadosAnel(raio * 2 - esp, esp, 0, 20, 10).applyToMesh(pneu);
    malha('pneu', no, mat('#24252c', 0.18), pneu);
    pneu.rotation.x = Math.PI / 2;
    pneu.scaling.y = estilo === 'bloco' ? 1.25 : 1.1;
    ve.pecas.push(pneu);
    const lado = Math.sign(z) || 1;
    const miolo = MeshBuilder.CreateCylinder(
      'miolo',
      { height: esp * 0.9, diameter: (raio * 2 - esp) * 1.02, tessellation: 18 },
      scene,
    );
    malha('miolo', no, mat('#2f3038', 0.2), miolo);
    miolo.rotation.x = Math.PI / 2;
    ve.pecas.push(miolo);
    const corCalota =
      estilo === 'faixa-branca' ? '#f4f1e8' : estilo === 'bloco' ? '#ffffff' : '#d9dde3';
    const calota = new Mesh('calota', scene);
    dadosEsfera(raio * 0.42).applyToMesh(calota);
    malha('calota', no, mat(corCalota, 0.9), calota);
    calota.scaling.set(1, 1, 0.45);
    calota.position.z = lado * esp * 0.45;
    ve.pecas.push(calota);
    if (estilo === 'faixa-branca') {
      const faixa = new Mesh('faixa', scene);
      dadosAnel(raio * 1.18, raio * 0.16, 0, 20, 6).applyToMesh(faixa);
      malha('faixa', no, mat('#f7f4ec', 0.5), faixa);
      faixa.rotation.x = Math.PI / 2;
      faixa.position.z = lado * esp * 0.42;
      ve.pecas.push(faixa);
    }
    if (estilo === 'estrela')
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * Math.PI * 2;
        const p = new Mesh('raio', scene);
        dadosEsfera(raio * 0.1).applyToMesh(p);
        malha('raio', no, mat('#ff6fa8', 0.6), p);
        p.position.set(Math.cos(a) * raio * 0.3, Math.sin(a) * raio * 0.3, lado * esp * 0.62);
        ve.pecas.push(p);
      }
  }
  /** Janelas numa cúpula de elipsoide (centro cx, cy; semieixos e): laterais, para-brisa e traseira. */
  function janelasDeCupula(ve: Veiculo, cx: number, cy: number, e: [number, number, number]) {
    const [a, b, c] = e;
    const y = cy + b * 0.32;
    // ponto da casca na altura y (fração do semieixo)
    const f = Math.sqrt(1 - 0.32 * 0.32);
    for (const lado of [-1, 1])
      bola(
        ve,
        1,
        '#a6dcf3',
        cx - a * 0.08,
        y,
        lado * c * f * 0.97,
        [a * 0.36, b * 0.3, 0.05],
        0.85,
      );
    const para = bola(ve, 1, '#a6dcf3', cx + a * f * 0.95, y, 0, [0.05, b * 0.32, c * 0.55], 0.85);
    para.rotation.z = -0.55;
    const tras = bola(ve, 1, '#a6dcf3', cx - a * f * 0.95, y, 0, [0.05, b * 0.28, c * 0.45], 0.85);
    tras.rotation.z = 0.55;
  }
  const farol = (ve: Veiculo, m: Mesh) => (ve.farois.push(m), m);
  const lanterna = (ve: Veiculo, m: Mesh) => (ve.lanternas.push(m), m);
  /** Sorriso: um tubinho em arco na frente (versão com carinha). */
  function sorriso(ve: Veiculo, x: number, y: number, larg: number, cor: string) {
    const path: Vector3[] = [];
    for (let i = 0; i <= 10; i++) {
      const t = -1 + (2 * i) / 10;
      path.push(new Vector3(x, y - (1 - t * t) * larg * 0.28, t * larg * 0.5));
    }
    const m = MeshBuilder.CreateTube(
      'sorriso',
      { path, radius: 0.045, tessellation: 8, cap: Mesh.CAP_ALL },
      scene,
    );
    malha('sorriso', ve.corpo, mat(cor, 0.9), m);
    ve.pecas.push(m);
  }
  /** Olho: farol branco com pupila e brilho (versão com carinha). */
  function olho(ve: Veiculo, x: number, y: number, z: number, r: number) {
    farol(ve, bola(ve, r, '#fffbe8', x, y, z, [0.6, 1, 1], 0.7));
    bola(ve, r * 0.45, '#2a2a3a', x + r * 0.42, y - r * 0.05, z, [0.5, 1, 1], 0.9);
    bola(ve, r * 0.16, '#ffffff', x + r * 0.55, y + r * 0.22, z + r * 0.12, [0.5, 1, 1], 1);
  }

  function novo(qual: Qual): Veiculo {
    const raiz = new TransformNode(`veiculo-${qual}`, scene);
    const corpo = new TransformNode(`veiculo-${qual}-corpo`, scene);
    corpo.parent = raiz;
    return {
      qual,
      raiz,
      corpo,
      pecas: [],
      farois: [],
      lanternas: [],
      giro: [],
      porta: null,
      rodas: [],
    };
  }

  // ------------------------------------------------------------------ as quatro versões
  // eixo local: x para a frente, y para cima, z para o lado; o chão em y = 0
  /** V1 · Brinquedo de corda: rodas grandes, entre-eixos curto, cabine bolha, para-choque cromado. */
  function v1Taxi(ve: Veiculo) {
    const R = 0.46;
    caixa(ve, 3.0, 0.8, 1.62, 0.36, '#ffc21a', 0, 0.82, 0, 0.45);
    caixa(ve, 1.75, 0.82, 1.44, 0.4, '#ffc21a', -0.2, 1.52, 0, 0.45);
    caixa(ve, 1.8, 0.48, 1.48, 0.22, '#a6dcf3', -0.2, 1.52, 0, 0.8);
    caixa(ve, 0.14, 0.52, 1.5, 0.06, '#ffc21a', -0.2, 1.52, 0, 0.45);
    caixa(ve, 0.6, 0.26, 0.34, 0.12, '#fff7d6', -0.2, 2.02, 0, 0.6);
    for (const lado of [-1, 1])
      for (let k = 0; k < 8; k++)
        caixa(
          ve,
          0.2,
          0.13,
          0.05,
          0.03,
          k % 2 ? '#1f2026' : '#f6f4ee',
          -0.85 + k * 0.24,
          0.98,
          lado * 0.82,
          0.5,
        );
    for (const sx of [-1, 1])
      caixa(ve, 0.26, 0.24, 1.56, 0.11, '#dfe3ea', sx * 1.55, 0.55, 0, 0.95);
    for (const z of [-0.5, 0.5]) {
      farol(ve, bola(ve, 0.17, '#fff3c4', 1.5, 0.9, z, [0.6, 1, 1], 0.8));
      bola(ve, 0.2, '#dfe3ea', 1.47, 0.9, z, [0.45, 1.05, 1.05], 0.95);
      lanterna(ve, bola(ve, 0.11, '#e8473f', -1.53, 0.9, z, [0.5, 1, 1], 0.7));
    }
    // chave de corda nas costas (o "brinquedo de corda")
    cilindro(ve, 0.35, 0.05, '#dfe3ea', -1.75, 1.1, 0, 0.9).rotation.z = Math.PI / 2;
    const borb = caixa(ve, 0.08, 0.36, 0.5, 0.06, '#dfe3ea', -1.95, 1.1, 0, 0.95);
    borb.rotation.x = 0.3;
    for (const x of [-0.98, 0.98]) for (const z of [-0.8, 0.8]) roda(ve, x, z, R, 'calota');
    ve.corpo.position.y = 0;
  }
  function v1Onibus(ve: Veiculo) {
    caixa(ve, 5.4, 0.92, 1.95, 0.42, '#2f7fd8', 0, 0.9, 0, 0.45);
    caixa(ve, 5.3, 1.0, 1.82, 0.44, '#f7f5ef', 0, 1.82, 0, 0.45);
    for (let k = 0; k < 4; k++)
      caixa(ve, 0.86, 0.58, 1.98, 0.2, '#a6dcf3', -1.95 + k * 1.05, 1.86, 0, 0.8);
    caixa(ve, 0.22, 0.66, 1.56, 0.12, '#a6dcf3', 2.6, 1.84, 0, 0.8);
    caixa(ve, 4.9, 0.26, 1.7, 0.13, '#f7f5ef', 0, 2.42, 0, 0.45);
    caixa(ve, 1.4, 0.3, 0.6, 0.15, '#ffcc33', 0.6, 2.62, 0, 0.5);
    ve.porta = caixa(ve, 0.72, 1.32, 0.06, 0.05, '#cfe8f5', 1.7, 1.25, 0.98, 0.8);
    for (const sx of [-1, 1]) caixa(ve, 0.26, 0.26, 1.9, 0.12, '#dfe3ea', sx * 2.73, 0.55, 0, 0.95);
    for (const z of [-0.62, 0.62]) {
      farol(ve, bola(ve, 0.19, '#fff3c4', 2.7, 0.98, z, [0.6, 1, 1], 0.8));
      lanterna(ve, bola(ve, 0.12, '#e8473f', -2.72, 0.98, z, [0.5, 1, 1], 0.7));
    }
    for (const x of [-1.75, 1.75]) for (const z of [-0.92, 0.92]) roda(ve, x, z, 0.52, 'calota');
  }
  /** V2 · Bloquinhos: carroceria de tijolinhos arredondados (as peças dos blocos do jogo). */
  function v2(
    ve: Veiculo,
    comp: number,
    larg: number,
    camadas: (string[] & { cor?: string })[],
    R: number,
  ) {
    const u = 0.5;
    camadas.forEach((linha, y) =>
      linha.forEach((cor, i) => {
        if (!cor) return;
        // cada camada é uma fileira de comp células; a cor vale para a fileira inteira de largura
        for (let k = 0; k < larg; k++) {
          const x = (i - (comp - 1) / 2) * u;
          const z = (k - (larg - 1) / 2) * u;
          const vidro = cor === 'V' && (k === 0 || k === larg - 1);
          const c = cor === 'V' ? (vidro ? '#a6dcf3' : (linha.cor ?? '#ffc21a')) : cor;
          caixa(
            ve,
            u * 0.96,
            u * 0.96,
            u * 0.96,
            0.14,
            c,
            x,
            0.55 + R * 0.5 + y * u,
            z,
            vidro ? 0.8 : 0.4,
          );
        }
      }),
    );
    void R;
  }
  function v2Taxi(ve: Veiculo) {
    const Y = '#ffc21a';
    const base = [Y, Y, Y, Y, Y, Y] as string[] & { cor?: string };
    const cab = ['', 'V', 'V', 'V', 'V', ''] as string[] & { cor?: string };
    cab.cor = Y;
    const teto = ['', Y, Y, Y, Y, ''] as string[] & { cor?: string };
    v2(ve, 6, 3, [base, cab, teto], 0.44);
    caixa(ve, 0.45, 0.28, 0.45, 0.13, '#fff7d6', -0.25, 2.12, 0, 0.6);
    for (const z of [-0.5, 0.5]) {
      farol(ve, caixa(ve, 0.08, 0.3, 0.3, 0.07, '#fff3c4', 1.52, 0.92, z, 0.8));
      lanterna(ve, caixa(ve, 0.08, 0.24, 0.24, 0.06, '#e8473f', -1.52, 0.92, z, 0.7));
    }
    for (const x of [-0.95, 0.95]) for (const z of [-0.8, 0.8]) roda(ve, x, z, 0.44, 'bloco');
  }
  function v2Onibus(ve: Veiculo) {
    const B = '#2f7fd8',
      W = '#f7f5ef';
    const base = Array(11).fill(B) as string[] & { cor?: string };
    const jan = Array(11).fill('V') as string[] & { cor?: string };
    jan.cor = W;
    const jan2 = Array(11).fill('V') as string[] & { cor?: string };
    jan2.cor = W;
    const teto = Array(11).fill(W) as string[] & { cor?: string };
    v2(ve, 11, 4, [base, jan, jan2, teto], 0.5);
    ve.porta = caixa(ve, 0.9, 0.95, 0.06, 0.05, '#cfe8f5', 1.75, 1.35, 1.01, 0.8);
    for (const z of [-0.6, 0.6]) {
      farol(ve, caixa(ve, 0.08, 0.32, 0.32, 0.07, '#fff3c4', 2.78, 0.95, z, 0.8));
      lanterna(ve, caixa(ve, 0.08, 0.26, 0.26, 0.06, '#e8473f', -2.78, 0.95, z, 0.7));
    }
    for (const x of [-1.75, 1.75]) for (const z of [-1.02, 1.02]) roda(ve, x, z, 0.5, 'bloco');
  }
  /** V3 · Com carinha: a V1 mais fofa, faróis-olhos, sorriso no para-choque. */
  function v3Taxi(ve: Veiculo) {
    caixa(ve, 2.8, 0.86, 1.62, 0.42, '#ffc21a', 0, 0.84, 0, 0.5);
    bola(ve, 1.0, '#ffc21a', -0.25, 1.42, 0, [0.95, 0.62, 0.75], 0.5);
    janelasDeCupula(ve, -0.25, 1.42, [0.95, 0.62, 0.75]);
    caixa(ve, 0.55, 0.24, 0.32, 0.12, '#fff7d6', -0.25, 2.02, 0, 0.6);
    for (const z of [-0.45, 0.45]) olho(ve, 1.38, 1.02, z, 0.2);
    sorriso(ve, 1.42, 0.66, 0.9, '#dfe3ea');
    for (const z of [-0.62, 0.62])
      bola(ve, 0.12, '#ff9aa8', 1.32, 0.78, z * 1.18, [0.4, 0.7, 1], 0.4);
    for (const z of [-0.5, 0.5])
      lanterna(ve, bola(ve, 0.11, '#e8473f', -1.42, 0.92, z, [0.5, 1, 1], 0.7));
    for (const lado of [-1, 1])
      for (let k = 0; k < 6; k++)
        caixa(
          ve,
          0.2,
          0.13,
          0.05,
          0.03,
          k % 2 ? '#1f2026' : '#f6f4ee',
          -0.6 + k * 0.24,
          1.02,
          lado * 0.82,
          0.5,
        );
    for (const x of [-0.9, 0.9]) for (const z of [-0.8, 0.8]) roda(ve, x, z, 0.47, 'calota');
  }
  function v3Onibus(ve: Veiculo) {
    caixa(ve, 5.2, 0.95, 1.95, 0.46, '#45b56b', 0, 0.92, 0, 0.5);
    caixa(ve, 5.1, 1.05, 1.88, 0.5, '#f7f5ef', 0, 1.85, 0, 0.5);
    for (let k = 0; k < 4; k++)
      caixa(ve, 0.82, 0.6, 1.98, 0.28, '#a6dcf3', -1.85 + k * 1.0, 1.9, 0, 0.85);
    bola(ve, 0.55, '#a6dcf3', 2.35, 1.92, 0, [0.4, 0.7, 1.45], 0.85);
    for (const z of [-0.6, 0.6]) olho(ve, 2.58, 1.05, z, 0.22);
    sorriso(ve, 2.62, 0.68, 1.1, '#dfe3ea');
    ve.porta = caixa(ve, 0.72, 1.3, 0.06, 0.05, '#cfe8f5', 1.55, 1.26, 0.98, 0.8);
    for (const z of [-0.6, 0.6])
      lanterna(ve, bola(ve, 0.12, '#e8473f', -2.6, 1.0, z, [0.5, 1, 1], 0.7));
    for (const x of [-1.7, 1.7]) for (const z of [-0.92, 0.92]) roda(ve, x, z, 0.52, 'calota');
  }
  // ------------------------------------------------------------------ rodada 2: a família da versão 3
  /** Carro da família (mesma carroceria): táxi, polícia ou carro comum de uma cor. */
  function carro(ve: Veiculo, tipo: 'taxi' | 'policia' | 'civil', cor = '#ffc21a') {
    const corpo = tipo === 'taxi' ? '#ffc21a' : tipo === 'policia' ? '#f7f8fb' : cor;
    caixa(ve, 2.8, 0.86, 1.62, 0.42, corpo, 0, 0.84, 0, 0.5);
    bola(ve, 1.0, corpo, -0.25, 1.42, 0, [0.95, 0.62, 0.75], 0.5);
    janelasDeCupula(ve, -0.25, 1.42, [0.95, 0.62, 0.75]);
    for (const z of [-0.45, 0.45]) olho(ve, 1.38, 1.02, z, 0.2);
    sorriso(ve, 1.42, 0.66, 0.9, '#dfe3ea');
    for (const z of [-0.62, 0.62])
      bola(ve, 0.12, '#ff9aa8', 1.32, 0.78, z * 1.18, [0.4, 0.7, 1], 0.4);
    for (const z of [-0.5, 0.5])
      lanterna(ve, bola(ve, 0.11, '#e8473f', -1.42, 0.92, z, [0.5, 1, 1], 0.7));
    if (tipo === 'taxi') {
      caixa(ve, 0.55, 0.24, 0.32, 0.12, '#fff7d6', -0.25, 2.02, 0, 0.6);
      for (const lado of [-1, 1])
        for (let k = 0; k < 6; k++)
          caixa(
            ve,
            0.2,
            0.13,
            0.05,
            0.03,
            k % 2 ? '#1f2026' : '#f6f4ee',
            -0.6 + k * 0.24,
            1.02,
            lado * 0.82,
            0.5,
          );
    }
    if (tipo === 'policia') {
      // faixa azul embaixo, estrelinha amarela na porta e giroflex macio (sem nada de bravo)
      caixa(ve, 2.84, 0.34, 1.66, 0.16, '#2f6fd8', 0, 0.62, 0, 0.5);
      for (const lado of [-1, 1])
        bola(ve, 0.17, '#ffd23f', -0.15, 1.0, lado * 0.82, [1, 1, 0.25], 0.8);
      caixa(ve, 0.8, 0.12, 0.42, 0.06, '#f7f8fb', -0.25, 2.03, 0, 0.6);
      const azul = caixa(ve, 0.3, 0.2, 0.36, 0.1, '#7fb2ff', -0.42, 2.16, 0, 0.7);
      const branca = caixa(ve, 0.3, 0.2, 0.36, 0.1, '#e9f1ff', -0.08, 2.16, 0, 0.7);
      ve.giro.push(azul, branca);
    }
    for (const x of [-0.9, 0.9]) for (const z of [-0.8, 0.8]) roda(ve, x, z, 0.47, 'calota');
  }
  /** Ônibus azul e branco (da versão 1, faixa longa de janelas) com a carinha da versão 3. */
  function onibusAzul(ve: Veiculo) {
    caixa(ve, 5.4, 0.92, 1.95, 0.42, '#2f7fd8', 0, 0.9, 0, 0.5);
    caixa(ve, 5.3, 1.0, 1.82, 0.44, '#f7f5ef', 0, 1.82, 0, 0.5);
    caixa(ve, 4.3, 0.56, 1.98, 0.22, '#a6dcf3', -0.35, 1.86, 0, 0.85);
    for (let k = 0; k < 3; k++)
      caixa(ve, 0.12, 0.6, 2.0, 0.05, '#f7f5ef', -1.4 + k * 1.05, 1.86, 0, 0.5);
    caixa(ve, 0.22, 0.6, 1.5, 0.12, '#a6dcf3', 2.6, 1.9, 0, 0.85);
    caixa(ve, 4.9, 0.26, 1.7, 0.13, '#f7f5ef', 0, 2.42, 0, 0.5);
    ve.porta = caixa(ve, 0.72, 1.32, 0.06, 0.05, '#cfe8f5', 1.7, 1.25, 0.98, 0.8);
    for (const z of [-0.58, 0.58]) olho(ve, 2.68, 1.08, z, 0.22);
    sorriso(ve, 2.73, 0.66, 1.1, '#dfe3ea');
    for (const z of [-0.85, 0.85]) bola(ve, 0.13, '#ff9aa8', 2.62, 0.82, z, [0.4, 0.7, 1], 0.4);
    for (const z of [-0.62, 0.62])
      lanterna(ve, bola(ve, 0.12, '#e8473f', -2.72, 0.98, z, [0.5, 1, 1], 0.7));
    for (const x of [-1.75, 1.75]) for (const z of [-0.92, 0.92]) roda(ve, x, z, 0.52, 'calota');
  }
  /** Extra da V3: o carrinho de sorvete. */
  function v3Sorvete(ve: Veiculo) {
    caixa(ve, 3.4, 1.5, 1.7, 0.5, '#ffd1e0', 0, 1.15, 0, 0.5);
    caixa(ve, 1.0, 0.8, 1.6, 0.38, '#ffffff', 1.25, 0.85, 0, 0.5);
    caixa(ve, 0.5, 0.5, 1.5, 0.22, '#a6dcf3', 1.45, 1.42, 0, 0.85);
    caixa(ve, 1.5, 0.7, 0.06, 0.1, '#fff6e0', -0.3, 1.35, 0.86, 0.6);
    for (let k = 0; k < 6; k++)
      caixa(
        ve,
        0.3,
        0.2,
        1.8,
        0.08,
        k % 2 ? '#ffffff' : '#ff6fa8',
        -1.2 + k * 0.32,
        2.0,
        0,
        0.5,
      ).rotation.z = 0.1;
    const cone = MeshBuilder.CreateCylinder(
      'casquinha',
      { height: 0.9, diameterTop: 0.62, diameterBottom: 0.06, tessellation: 14 },
      scene,
    );
    malha('casquinha', ve.corpo, mat('#e0a75e', 0.3), cone);
    cone.position.set(-0.4, 2.5, 0);
    ve.pecas.push(cone);
    bola(ve, 0.34, '#ff9ec4', -0.4, 3.05, 0, [1, 0.9, 1], 0.6);
    bola(ve, 0.27, '#fff2c2', -0.4, 3.42, 0, [1, 0.9, 1], 0.6);
    bola(ve, 0.08, '#e8473f', -0.4, 3.72, 0, [1, 1, 1], 0.9);
    for (const z of [-0.45, 0.45]) olho(ve, 1.73, 1.0, z, 0.17);
    sorriso(ve, 1.77, 0.65, 0.7, '#dfe3ea');
    for (const x of [-1.05, 1.1]) for (const z of [-0.78, 0.78]) roda(ve, x, z, 0.42, 'estrela');
  }
  /** V4 · Vinil retrô: carroceria de cápsula, para-lamas redondos, pneus de faixa branca. */
  function v4Taxi(ve: Veiculo) {
    caixa(ve, 3.2, 0.82, 1.5, 0.41, '#ffb703', 0, 0.86, 0, 0.75);
    for (const x of [-1.0, 1.0])
      for (const z of [-0.66, 0.66])
        bola(ve, 0.56, '#ffb703', x, 0.78, z, [1.05, 0.72, 0.42], 0.75);
    bola(ve, 1.0, '#fff1d0', -0.2, 1.38, 0, [0.95, 0.5, 0.66], 0.75);
    janelasDeCupula(ve, -0.2, 1.38, [0.95, 0.5, 0.66]);
    caixa(ve, 3.24, 0.07, 1.54, 0.03, '#e9edf2', 0, 0.95, 0, 1);
    caixa(ve, 0.5, 0.2, 0.3, 0.1, '#fff7d6', -0.2, 1.92, 0, 0.6);
    for (const sx of [-1, 1]) caixa(ve, 0.22, 0.22, 1.5, 0.11, '#e9edf2', sx * 1.66, 0.6, 0, 1);
    for (const z of [-0.48, 0.48]) {
      farol(ve, bola(ve, 0.16, '#fff3c4', 1.58, 0.95, z, [0.55, 1, 1], 0.8));
      const aro = new Mesh('aro', scene);
      dadosAnel(0.34, 0.06, 0, 16, 6).applyToMesh(aro);
      malha('aro', ve.corpo, mat('#e9edf2', 1), aro);
      aro.rotation.z = Math.PI / 2;
      aro.position.set(1.6, 0.95, z);
      ve.pecas.push(aro);
      lanterna(ve, bola(ve, 0.1, '#e8473f', -1.62, 0.95, z, [0.5, 1, 1], 0.7));
    }
    for (const x of [-1.0, 1.0]) for (const z of [-0.74, 0.74]) roda(ve, x, z, 0.4, 'faixa-branca');
  }
  function v4Onibus(ve: Veiculo) {
    caixa(ve, 5.6, 1.0, 1.9, 0.5, '#7fd1c1', 0, 0.95, 0, 0.75);
    caixa(ve, 5.5, 1.05, 1.86, 0.52, '#fff1d0', 0, 1.9, 0, 0.75);
    caixa(ve, 5.62, 0.08, 1.94, 0.04, '#e9edf2', 0, 1.42, 0, 1);
    for (let k = 0; k < 5; k++)
      caixa(ve, 0.78, 0.55, 1.98, 0.27, '#a6dcf3', -2.05 + k * 0.92, 1.95, 0, 0.9);
    bola(ve, 0.6, '#a6dcf3', 2.45, 1.95, 0, [0.35, 0.62, 1.4], 0.9);
    ve.porta = caixa(ve, 0.7, 1.3, 0.06, 0.05, '#cfe8f5', 1.7, 1.3, 0.96, 0.85);
    for (const x of [-1.8, 1.8])
      for (const z of [-0.8, 0.8]) bola(ve, 0.62, '#7fd1c1', x, 0.85, z, [1.05, 0.75, 0.4], 0.75);
    for (const z of [-0.62, 0.62]) {
      farol(ve, bola(ve, 0.2, '#fff3c4', 2.8, 1.0, z, [0.55, 1, 1], 0.8));
      lanterna(ve, bola(ve, 0.12, '#e8473f', -2.82, 1.0, z, [0.5, 1, 1], 0.7));
    }
    for (const sx of [-1, 1]) caixa(ve, 0.24, 0.24, 1.86, 0.12, '#e9edf2', sx * 2.86, 0.6, 0, 1);
    for (const x of [-1.8, 1.8])
      for (const z of [-0.88, 0.88]) roda(ve, x, z, 0.46, 'faixa-branca');
  }

  const VERSOES: Record<
    number,
    { taxi: (v: Veiculo) => void; onibus: (v: Veiculo) => void; extra?: (v: Veiculo) => void }
  > = {
    1: { taxi: v1Taxi, onibus: v1Onibus },
    2: { taxi: v2Taxi, onibus: v2Onibus },
    3: { taxi: v3Taxi, onibus: v3Onibus, extra: v3Sorvete },
    4: { taxi: v4Taxi, onibus: v4Onibus },
  };

  // ------------------------------------------------------------------ faróis de noite
  let matAceso: StandardMaterial | null = null;
  let matLanterna: StandardMaterial | null = null;
  let texLuz: DynamicTexture | null = null;
  const poças: Mesh[] = [];
  function acesos() {
    if (!matAceso) {
      matAceso = new StandardMaterial('farol-aceso', scene);
      matAceso.disableLighting = true;
      matAceso.emissiveColor = Color3.FromHexString('#fff1b8');
      matLanterna = new StandardMaterial('lanterna-acesa', scene);
      matLanterna.disableLighting = true;
      matLanterna.emissiveColor = Color3.FromHexString('#ff5a4a');
      texLuz = new DynamicTexture('poça-de-luz', { width: 128, height: 128 }, scene, false);
      const g = texLuz.getContext() as unknown as CanvasRenderingContext2D;
      const gr = g.createRadialGradient(64, 64, 4, 64, 64, 64);
      gr.addColorStop(0, 'rgba(255,240,180,0.85)');
      gr.addColorStop(1, 'rgba(255,240,180,0)');
      g.fillStyle = gr;
      g.fillRect(0, 0, 128, 128);
      texLuz.hasAlpha = true;
      texLuz.update();
    }
    return { farol: matAceso, lanterna: matLanterna! };
  }
  const corOriginal = new Map<Mesh, Material | null>();
  function aplicarNoite() {
    for (const p of poças) p.dispose();
    poças.length = 0;
    for (const ve of veiculos.values()) {
      for (const m of [...ve.farois, ...ve.lanternas]) {
        if (!corOriginal.has(m)) corOriginal.set(m, m.material);
        m.material = noite
          ? ve.farois.includes(m)
            ? acesos().farol
            : acesos().lanterna
          : corOriginal.get(m)!;
      }
      if (noite) {
        const p = MeshBuilder.CreateGround('poça', { width: 4, height: 2.6 }, scene);
        const mp = new StandardMaterial('poça', scene);
        mp.diffuseTexture = texLuz;
        mp.useAlphaFromDiffuseTexture = true;
        mp.disableLighting = true;
        mp.emissiveColor = Color3.FromHexString('#fff1b8');
        mp.alpha = 0.55;
        p.material = mp;
        p.parent = ve.raiz;
        const frente = Math.max(...ve.farois.map((f) => f.position.x));
        p.position.set(frente + 1.9, 0.03, 0);
        poças.push(p);
      }
    }
  }

  // ------------------------------------------------------------------ montar
  function tirarVeiculosDoPalco() {
    const velhos =
      /^(taxi|taxi-cabine|taxi-teto|taxi-luz|taxi-xadrez|farol|roda|calota|onibus|onibus-vidros|coluna|onibus-teto|porta-onibus)$/;
    for (const m of scene.meshes.slice()) if (velhos.test(m.name) && !m.parent) m.dispose();
  }
  function limpar() {
    tirarVeiculosDoPalco();
    for (const ve of veiculos.values()) {
      for (const m of ve.pecas) m.dispose();
      ve.raiz.dispose();
    }
    veiculos.clear();
    corOriginal.clear();
    for (const b of baloes.values()) b.dispose();
    baloes.clear();
  }
  function colocar(
    qual: Qual,
    f: (v: Veiculo) => void,
    x: number,
    y: number,
    z: number,
    yaw: number,
  ) {
    const ve = novo(qual);
    f(ve);
    ve.raiz.position.set(x, y, z);
    ve.raiz.rotation.y = yaw;
    pontos[qual] = [x, y, z];
    veiculos.set(qual, ve);
  }
  /** Rodada 2: a frota na avenida em frente ao parque (o sorvete parado na beira da praça). */
  function frota() {
    limpar();
    const [ox, oy, oz] = window.__esboco!.pontos.origem;
    const Y = oy + 1;
    const L = oz + 34.9; // mão para o leste
    const O = oz + 33.0; // mão para o oeste, encostada no parque
    colocar('civil1', (v) => carro(v, 'civil', '#ff7a6b'), ox + 70, Y, L, 0);
    colocar('taxi', (v) => carro(v, 'taxi'), ox + 78, Y, L, 0);
    colocar('policia', (v) => carro(v, 'policia'), ox + 90, Y, L, 0);
    colocar('onibus', onibusAzul, ox + 86, Y, O, Math.PI);
    colocar('civil2', (v) => carro(v, 'civil', '#6fd3b0'), ox + 95, Y, O, Math.PI);
    colocar('extra', v3Sorvete, ox + 72, Y, O, Math.PI);
    colocar('onibus2', v3Onibus, ox + 78.5, Y, O, Math.PI);
    // as outras cores do carro comum ficam lá no começo da avenida (para a foto das cores)
    colocar('civil3', (v) => carro(v, 'civil', '#b79cf2'), ox + 8, Y, L, 0);
    colocar('civil4', (v) => carro(v, 'civil', '#ffa94d'), ox + 12, Y, L, 0);
    aplicarNoite();
  }
  function mostrar(versao: number) {
    limpar();
    const [ox, oy, oz] = window.__esboco!.pontos.origem;
    const Y = oy + 1;
    const v = VERSOES[versao];
    const lugar: Record<'taxi' | 'onibus' | 'extra', [number, number, number, number]> = {
      taxi: [ox + 34, Y, oz + 34.9, 0],
      onibus: [ox + 23, Y, oz + 33.0, Math.PI],
      extra: [ox + 44, Y, oz + 34.9, 0],
    };
    for (const qual of ['taxi', 'onibus', 'extra'] as const) {
      const f = qual === 'extra' ? v.extra : v[qual];
      if (!f) continue;
      const ve = novo(qual);
      f(ve);
      const [x, y, z, yaw] = lugar[qual];
      ve.raiz.position.set(x, y, z);
      ve.raiz.rotation.y = yaw;
      pontos[qual] = [x, y, z];
      veiculos.set(qual, ve);
    }
    aplicarNoite();
  }

  let matGiroAzul: StandardMaterial | null = null;
  let matGiroBranco: StandardMaterial | null = null;
  function giroflex(aceso: boolean) {
    if (!matGiroAzul) {
      matGiroAzul = new StandardMaterial('giro-azul', scene);
      matGiroAzul.disableLighting = true;
      matGiroAzul.emissiveColor = Color3.FromHexString('#6fa8ff');
      matGiroBranco = new StandardMaterial('giro-branco', scene);
      matGiroBranco.disableLighting = true;
      matGiroBranco.emissiveColor = Color3.FromHexString('#f2f6ff');
    }
    for (const ve of veiculos.values())
      ve.giro.forEach((m, i) => {
        if (!corOriginal.has(m)) corOriginal.set(m, m.material);
        m.material = aceso ? (i === 0 ? matGiroAzul! : matGiroBranco!) : corOriginal.get(m)!;
      });
  }
  const api: EsbocoVeiculos = {
    mostrar,
    frota,
    giroflex,
    pontos,
    noite(ligada) {
      noite = ligada;
      window.__esboco!.noite(ligada);
      aplicarNoite();
      giroflex(ligada);
    },
    balanco(angulo, achata = 0) {
      for (const ve of veiculos.values()) {
        // a carroceria gira em volta do eixo da frente (mergulha ao frear) e achata um tiquinho
        const frente = ve.qual === 'onibus' ? 1.75 : 0.95;
        ve.corpo.setPivotPoint(new Vector3(frente, 0.4, 0));
        ve.corpo.rotation.z = -angulo;
        ve.corpo.scaling.y = 1 - achata;
      }
    },
    porta(aberta) {
      const ve = veiculos.get('onibus');
      if (!ve?.porta) return;
      const p = ve.porta;
      p.metadata ??= p.position.x;
      p.position.x = (p.metadata as number) - (aberta ? 0.62 : 0);
      p.position.z = aberta ? 1.04 : 0.98;
    },
    mover(qual, x, z, yaw) {
      const ve = veiculos.get(qual);
      if (!ve) return;
      ve.raiz.position.x = x;
      ve.raiz.position.z = z;
      if (yaw !== undefined) ve.raiz.rotation.y = yaw;
      pontos[qual] = [x, ve.raiz.position.y, z];
    },
    balao(qual, texto) {
      baloes.get(qual)?.dispose();
      baloes.delete(qual);
      const ve = veiculos.get(qual);
      if (!ve || !texto) return;
      const tex = new DynamicTexture('balao', { width: 256, height: 128 }, scene, true);
      const g = tex.getContext() as unknown as CanvasRenderingContext2D;
      g.fillStyle = 'rgba(0,0,0,0)';
      g.clearRect(0, 0, 256, 128);
      g.fillStyle = '#ffffff';
      g.beginPath();
      g.roundRect(8, 8, 240, 84, 36);
      g.moveTo(110, 90);
      g.lineTo(128, 122);
      g.lineTo(146, 90);
      g.fill();
      g.fillStyle = '#3b2a1e';
      g.font = '700 46px sans-serif';
      g.textAlign = 'center';
      g.fillText(texto, 128, 66);
      tex.hasAlpha = true;
      tex.update();
      const m = new StandardMaterial('balao', scene);
      m.diffuseTexture = tex;
      m.useAlphaFromDiffuseTexture = true;
      m.disableLighting = true;
      m.emissiveColor = Color3.White();
      m.backFaceCulling = false;
      const pl2 = MeshBuilder.CreatePlane('balao', { width: 1.6, height: 0.8 }, scene);
      pl2.material = m;
      pl2.billboardMode = Mesh.BILLBOARDMODE_ALL;
      pl2.position
        .copyFrom(ve.raiz.position)
        .addInPlace(new Vector3(0, ve.qual === 'onibus' ? 3.4 : 2.7, 0));
      baloes.set(qual, pl2);
    },
    custo() {
      const r: Record<string, { triangulos: number; chamadas: number; pecas: number }> = {};
      for (const [qual, ve] of veiculos) {
        const mats = new Set<Material>();
        let tri = 0;
        for (const m of ve.pecas) {
          tri += m.getTotalIndices() / 3;
          if (m.material) mats.add(m.material);
        }
        r[qual] = { triangulos: Math.round(tri), chamadas: mats.size, pecas: ve.pecas.length };
      }
      return r;
    },
  };
  window.__veiculos = api;
}
