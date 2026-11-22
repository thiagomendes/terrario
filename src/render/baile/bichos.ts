/**
 * Spec 027 (T12): os bichos de enfeite da vila da festa, no padrão dos bichos do jogo (o montador
 * `bicho(k)`, o plástico de sempre, olhos de bolinha com brilho), presos a um lugar do plano:
 * - **o Tufinho**, o gato da Vovó Zuleica, no banquinho da varanda: cor de carvão com o focinho,
 *   o peito e as patinhas claros, o lacinho laranja e os olhões âmbar amigáveis; respira, abana
 *   a pontinha do rabo e vira a cabecinha de vez em quando (a n5, quando ele foge e segue a
 *   criança, vem com as missões);
 * - **a corujinha** do poleiro do bosque: modelo próprio (não a coruja do Rancho repintada),
 *   lilás e creme, redondinha, com o cachecol laranja, que vira a cabeça devagar (enfeite: não é
 *   bicho de papel).
 * Nascem só com a malha do chunk deles desenhada e saem com ela, como as outras peças.
 */
import type { Scene } from '@babylonjs/core/scene';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import type { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { caixaArredondada, esfera } from '../formas';
import { bichoDeBrinquedo } from '../bichoBrinquedo';
import { juntasDoBicho } from '../juntasBicho';
import { bicho } from '../../temas/rancho-alegre/criaturas';
import { COR_BAILE } from '../../temas/noite-das-fantasias/criaturas';
import type { PecaCriatura } from '../../temas/tipos';
import type { PlanoBaile } from '../../world/noiteFantasias';

type V3 = [number, number, number];

/** Tufinho sentado (do esboço aprovado): carvão, focinho, peito e patinhas creme, lacinho laranja. */
export function desenhoTufinho(): PecaCriatura[] {
  const carvao = '#3c3744';
  const claro = '#f1e8dc';
  const b = bicho(1.25);
  b.bola(0.165, carvao, [1, 1.05, 1.12], [0, 0.17, -0.04]);
  b.bola(0.115, claro, [1, 1.25, 0.75], [0, 0.25, 0.075]);
  for (const s of [-1, 1]) {
    b.bola(0.1, carvao, [0.9, 0.9, 1.2], [s * 0.11, 0.09, -0.04]);
    b.bola(0.055, claro, [0.9, 0.45, 1.5], [s * 0.13, 0.02, 0.03]);
    b.caixa([0.07, 0.12, 0.07], [s * 0.06, 0.135, 0.11], carvao, 0.033);
    b.caixa([0.075, 0.09, 0.08], [s * 0.06, 0.045, 0.115], claro, 0.035);
  }
  // o rabo deitado, enrolando para a frente
  b.caixa([0.06, 0.06, 0.26], [0.17, 0.035, -0.1], carvao, 0.03, { papel: 'cauda', rot: [0, -0.35, 0] });
  b.caixa([0.06, 0.06, 0.16], [0.24, 0.035, 0.07], carvao, 0.03, { papel: 'cauda', rot: [0, 0.35, 0] });
  // o lacinho laranja no pescoço
  for (const s of [-1, 1])
    b.bola(0.045, COR_BAILE.laranja, [1.2, 0.85, 0.6], [s * 0.05, 0.335, 0.115], { rot: [0, 0, s * 0.3] });
  b.bola(0.024, COR_BAILE.laranjaEscuro, [1, 1, 1], [0, 0.335, 0.14]);
  b.grupo([0, 0.45, 0.06], 'cabeca');
  b.caixa([0.3, 0.26, 0.26], [0, 0, 0], carvao, 0.11);
  b.bola(0.075, claro, [1.25, 0.75, 0.8], [0, -0.06, 0.115]);
  b.bola(0.024, '#ff9aae', [1.2, 0.85, 0.8], [0, -0.025, 0.17]);
  for (const s of [-1, 1]) {
    b.caixa([0.12, 0.12, 0.045], [s * 0.088, 0.1, -0.01], carvao, 0.018, { rot: [0, 0, Math.PI / 4 + s * 0.1] });
    b.caixa([0.06, 0.06, 0.02], [s * 0.088, 0.115, 0.014], '#ffb3c1', 0.01, { rot: [0, 0, Math.PI / 4 + s * 0.1] });
    b.caixa([0.12, 0.008, 0.008], [s * 0.12, -0.05, 0.15], claro, 0.004, { rot: [0, 0, s * 0.12] });
    // os olhões âmbar com a pupila grande e o pontinho de brilho (amigáveis, nada de bravo)
    b.bola(0.05, '#f4c64e', [0.95, 1.05, 0.45], [s * 0.068, 0.025, 0.124]);
    b.bola(0.033, '#231a28', [0.9, 1.1, 0.45], [s * 0.068, 0.022, 0.138], { brilho: 0.35 });
    b.bola(0.013, '#ffffff', [1, 1, 0.5], [s * 0.068 + 0.012, 0.042, 0.152], { brilho: 0.3 });
    b.bola(0.03, '#ff9aa8', [1.4, 0.75, 0.3], [s * 0.115, -0.045, 0.125]);
  }
  return b.fim().pecas;
}

/**
 * A corujinha do bosque (modelo próprio): redondinha, lilás com a barriga e o rosto creme em
 * dois discos, os olhões escuros de brilho no meio de um aro creme, o biquinho dourado, as
 * pontinhas de orelha redondas, as asinhas dobradas, os pezinhos laranja no poleiro e o cachecol
 * laranja com a ponta caída.
 */
export function desenhoCorujinha(): PecaCriatura[] {
  const lilas = '#a98ad8';
  const escuro = '#8a6cc2';
  const creme = '#fbf3e4';
  const b = bicho(1.2);
  for (const s of [-1, 1]) {
    // os pezinhos agarrados na travessa
    b.bola(0.035, COR_BAILE.laranja, [1.3, 0.6, 1.4], [s * 0.06, 0.02, 0.05]);
    // as asinhas dobradas dos lados, com a pontinha mais escura
    b.bola(0.1, escuro, [0.45, 1.1, 0.95], [s * 0.15, 0.2, -0.01], { rot: [0, 0, s * 0.18] });
  }
  b.bola(0.17, lilas, [1, 1.05, 0.95], [0, 0.19, 0]);
  b.bola(0.12, creme, [1, 1.15, 0.55], [0, 0.17, 0.075]);
  // as pintinhas em V da barriga (lilás claro)
  for (const [x, y] of [
    [-0.04, 0.2],
    [0.04, 0.2],
    [0, 0.14],
  ])
    b.bola(0.016, '#d8c8f0', [1.2, 0.8, 0.5], [x, y, 0.14]);
  // o cachecol laranja: a volta no pescoço e a pontinha caída na frente, de lado
  b.caixa([0.3, 0.06, 0.26], [0, 0.33, 0.005], COR_BAILE.laranja, 0.03);
  b.caixa([0.06, 0.13, 0.03], [0.07, 0.26, 0.125], COR_BAILE.laranja, 0.015, { rot: [0, 0, 0.15] });
  b.caixa([0.065, 0.025, 0.035], [0.08, 0.2, 0.128], COR_BAILE.laranjaEscuro, 0.01, { rot: [0, 0, 0.15] });
  b.grupo([0, 0.46, 0.01], 'cabeca');
  b.bola(0.15, lilas, [1.15, 0.95, 1], [0, 0, 0]);
  for (const s of [-1, 1]) {
    // as orelhinhas redondas (tufinhos de pena, nada pontudo)
    b.bola(0.05, escuro, [0.8, 1.1, 0.6], [s * 0.11, 0.12, -0.01], { rot: [0, 0, -s * 0.35] });
    // o rosto em dois discos creme, os olhões e o brilho
    b.bola(0.07, creme, [1, 1, 0.35], [s * 0.065, 0.005, 0.12]);
    b.bola(0.042, '#2a1f3a', [0.95, 1.05, 0.45], [s * 0.065, 0.008, 0.138], { brilho: 0.35 });
    b.bola(0.014, '#ffffff', [1, 1, 0.5], [s * 0.065 + 0.014, 0.026, 0.152], { brilho: 0.3 });
    b.bola(0.026, '#ffb0c4', [1.4, 0.7, 0.3], [s * 0.115, -0.055, 0.118]);
  }
  b.bola(0.026, COR_BAILE.ouro, [0.9, 1.1, 0.9], [0, -0.04, 0.15]);
  return b.fim().pecas;
}

interface Montado {
  raiz: TransformNode;
  cabeca: TransformNode | null;
  cauda: TransformNode | null;
  malhas: Mesh[];
}

/** Monta o desenho como os bichos do jogo: uma malha por junta, a cor nos vértices. */
function montar(scene: Scene, nome: string, desenho: PecaCriatura[], mat: StandardMaterial): Montado {
  const pecas = bichoDeBrinquedo(desenho);
  const raiz = new TransformNode(`baile-${nome}`, scene);
  const malhas: Mesh[] = [];
  let cabeca: TransformNode | null = null;
  let cauda: TransformNode | null = null;
  let n = 0;
  for (const g of juntasDoBicho(pecas)) {
    const no = new TransformNode(`baile-${nome}-g${n++}`, scene);
    no.parent = raiz;
    no.position.set(g.pivo[0], g.pivo[1], g.pivo[2]);
    if (g.papel === 'cabeca') cabeca = no;
    if (g.papel === 'cauda') cauda = no;
    const lista: Mesh[] = [];
    for (const peca of g.pecas) {
      const [w, h, d] = peca.t;
      const maior = Math.max(w, h, d);
      const nm = `baile-${nome}-p${n++}`;
      const m =
        peca.forma === 'bola'
          ? esfera(nm, scene, maior / 2, mat, [w / maior, h / maior, d / maior])
          : caixaArredondada(nm, scene, w, h, d, peca.raio ?? Math.min(w, h, d) * 0.4, mat, 3);
      m.position.set(peca.p[0] - g.pivo[0], peca.p[1] - g.pivo[1], peca.p[2] - g.pivo[2]);
      if (peca.rot) m.rotation.set(peca.rot[0], peca.rot[1], peca.rot[2]);
      const cor = Color3.FromHexString(peca.cor);
      const nv = m.getTotalVertices();
      const cores = new Float32Array(nv * 4);
      for (let k = 0; k < nv; k++) cores.set([cor.r, cor.g, cor.b, 1], k * 4);
      m.setVerticesData(VertexBuffer.ColorKind, cores);
      lista.push(m);
    }
    const f = lista.length === 1 ? lista[0] : Mesh.MergeMeshes(lista, true, true, undefined, false, false);
    if (!f) continue;
    f.name = `baile-${nome}-malha${n++}`;
    f.parent = no;
    f.material = mat;
    f.isPickable = false;
    malhas.push(f);
  }
  return { raiz, cabeca, cauda, malhas };
}

interface Enfeite {
  nome: 'tufinho' | 'corujinha';
  lugar: V3;
  yaw: number;
  cx: number;
  cz: number;
  vivo: Montado | null;
}

export interface BichosBaile {
  quadro(t: number): void;
  /** Testes e fotos: onde cada um está e se está desenhado. */
  lista(): { nome: string; x: number; y: number; z: number; vivo: boolean }[];
  descartar(): void;
}

export function criarBichosBaile(
  scene: Scene,
  plano: PlanoBaile,
  mat: StandardMaterial,
  temMalha: (cx: number, cz: number) => boolean,
  preparar: (m: Mesh) => void,
  /**
   * T19 (n5): onde o Tufinho está agora, quando não está no banquinho (fugido na horta, ou atrás
   * de quem ele segue); null: no banquinho.
   */
  lugarDoTufinho?: (
    t: number,
    dt: number,
  ) => { x: number; y: number; z: number; yaw: number; anda: number; brinca: boolean } | null,
): BichosBaile {
  let ultimo = -1;
  const enfeites: Enfeite[] = [];
  const banco = plano.pecas.find((p) => p.tipo === 'banquinho');
  if (banco)
    // sentado no assento do banquinho (a almofadinha a 0,475 do chão), virado para a rua
    enfeites.push({
      nome: 'tufinho',
      lugar: [banco.x, banco.y + 0.475, banco.z],
      yaw: (banco.dir & 3) * (Math.PI / 2),
      cx: Math.floor(banco.x / 16),
      cz: Math.floor(banco.z / 16),
      vivo: null,
    });
  const poleiro = plano.pecas.find((p) => p.tipo === 'poleiro');
  if (poleiro)
    // na travessa do poleiro (2,45 do chão), olhando para o caminho do bosque
    enfeites.push({
      nome: 'corujinha',
      lugar: [poleiro.x, poleiro.y + 2.45, poleiro.z],
      yaw: (poleiro.dir & 3) * (Math.PI / 2),
      cx: Math.floor(poleiro.x / 16),
      cz: Math.floor(poleiro.z / 16),
      vivo: null,
    });
  const desenhos = { tufinho: desenhoTufinho(), corujinha: desenhoCorujinha() };

  return {
    quadro(t) {
      const dt = ultimo < 0 ? 0 : Math.min(0.1, Math.max(0, t - ultimo));
      ultimo = t;
      for (const e of enfeites) {
        // T19: o Tufinho fora do banquinho (a horta, ou seguindo alguém)
        const fora = e.nome === 'tufinho' ? (lugarDoTufinho?.(t, dt) ?? null) : null;
        if (e.nome === 'tufinho') {
          if (fora) {
            e.cx = Math.floor(fora.x / 16);
            e.cz = Math.floor(fora.z / 16);
          } else if (banco) {
            e.cx = Math.floor(banco.x / 16);
            e.cz = Math.floor(banco.z / 16);
          }
        }
        const pode = temMalha(e.cx, e.cz);
        if (pode && !e.vivo) {
          e.vivo = montar(scene, e.nome, desenhos[e.nome], mat);
          e.vivo.raiz.position.set(...e.lugar);
          e.vivo.raiz.rotation.y = e.yaw;
          for (const m of e.vivo.malhas) preparar(m);
        } else if (!pode && e.vivo) {
          e.vivo.raiz.dispose();
          e.vivo = null;
        }
        const v = e.vivo;
        if (!v) continue;
        if (e.nome === 'tufinho') {
          // T19: fora do banquinho, no chão (na horta brincando, ou andando atrás de alguém)
          if (fora) {
            v.raiz.position.set(fora.x, fora.y, fora.z);
            v.raiz.rotation.y = fora.yaw;
            // andando, o corpinho inclina para a frente e o rabo balança mais
            v.raiz.rotation.x = Math.min(0.18, fora.anda * 0.04);
            if (v.cauda) v.cauda.rotation.y = Math.sin(t * (fora.anda > 0.5 ? 6 : 3)) * 0.45;
          } else {
            v.raiz.position.set(...e.lugar);
            v.raiz.rotation.y = e.yaw;
            v.raiz.rotation.x = 0;
          }
          // respira, abana a pontinha do rabo e vira a cabecinha de vez em quando
          v.raiz.scaling.set(1, 1 + Math.sin(t * 2.2) * 0.015, 1);
          if (v.cauda && !fora) v.cauda.rotation.y = Math.sin(t * 1.7) * 0.25;
          if (v.cabeca) {
            const olha = Math.sin(t * 0.35) > 0.6 ? Math.sin(t * 0.7) * 0.45 : 0;
            v.cabeca.rotation.y += (olha - v.cabeca.rotation.y) * 0.05;
            v.cabeca.rotation.z = Math.sin(t * 0.5) * 0.06;
          }
        } else if (v.cabeca) {
          // a corujinha vira a cabeça devagar para um lado e para o outro (nunca segue ninguém)
          v.cabeca.rotation.y = Math.sin(t * 0.32) * 0.7;
          v.raiz.scaling.set(1, 1 + Math.sin(t * 1.6) * 0.012, 1);
        }
      }
    },
    lista: () =>
      // (onde ele está desenhado agora: fora do banquinho na n5)
      enfeites.map((e) => {
        const p = e.vivo?.raiz.position;
        return { nome: e.nome, x: p?.x ?? e.lugar[0], y: p?.y ?? e.lugar[1], z: p?.z ?? e.lugar[2], vivo: !!e.vivo };
      }),
    descartar() {
      for (const e of enfeites) e.vivo?.raiz.dispose();
    },
  };
}
