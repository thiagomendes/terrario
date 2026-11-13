/**
 * Spec 021 "Achar o amigo": as estrelinhas do mundo.
 *
 * - A trilha: uma estrela dourada com instâncias finas (uma chamada de desenho, no máximo 300),
 *   nascendo em onda do jogador até o amigo, com um brilho que corre no sentido dele; as que a
 *   criança já passou somem; sem caminho inteiro, a última fica grande e pulsando.
 * - O "puf" do pulo: poeira creme e estrelinhas pulando do meio, peças reaproveitadas.
 */
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Matrix, Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import '@babylonjs/core/Meshes/thinInstanceMesh';
import type { Scene } from '@babylonjs/core/scene';
import type { V3 } from '../jogo/caminho';

/** Estrela de 5 pontas fofinha: frente e costas com o miolo estufado. */
function dadosEstrela(): VertexData {
  const pos: number[] = [];
  const ind: number[] = [];
  const nor: number[] = [];
  const R = 0.27;
  const r = 0.12;
  const fundo = 0.08;
  for (const lado of [1, -1]) {
    const base = pos.length / 3;
    pos.push(0, 0, -fundo * lado);
    for (let i = 0; i < 10; i++) {
      const ang = Math.PI / 2 + (i * Math.PI) / 5;
      const rr = i % 2 ? r : R;
      pos.push(Math.cos(ang) * rr, Math.sin(ang) * rr, 0);
    }
    for (let i = 0; i < 10; i++) {
      const a = base + 1 + i;
      const b = base + 1 + ((i + 1) % 10);
      if (lado > 0) ind.push(base, b, a);
      else ind.push(base, a, b);
    }
  }
  const vd = new VertexData();
  vd.positions = pos;
  vd.indices = ind;
  VertexData.ComputeNormals(pos, ind, nor);
  vd.normals = nor;
  return vd;
}

export function criarEstrelinhas(scene: Scene) {
  const matEstrela = new StandardMaterial('amigo-estrela', scene);
  matEstrela.diffuseColor = Color3.FromHexString('#ffd45a');
  // brilho forte: a trilha tem que se ver de longe por crianças de 3 e 4 anos
  matEstrela.emissiveColor = Color3.FromHexString('#e0a418');
  matEstrela.specularColor = new Color3(1, 1, 0.85);
  matEstrela.specularPower = 12;
  matEstrela.backFaceCulling = false;

  // ------------------------------------------------------------------ a trilha
  const estrela = new Mesh('amigo-trilha', scene);
  dadosEstrela().applyToMesh(estrela);
  estrela.material = matEstrela;
  estrela.isPickable = false;
  estrela.alwaysSelectAsActiveMesh = true;
  estrela.doNotSyncBoundingInfo = true;
  estrela.thinInstanceSetBuffer('matrix', new Float32Array(16), 16, false);
  estrela.thinInstanceCount = 0;
  estrela.setEnabled(false);
  let matrizes = new Float32Array(0);
  const mTmp = new Matrix();
  const qTmp = new Quaternion();
  const sTmp = new Vector3();
  const pTmp = new Vector3();

  let trilha: { pts: V3[]; nasceu: number; completo: boolean; apagando: number } | null = null;

  /** Quadro da trilha: `perto` é o índice da estrelinha mais perto do jogador. */
  function quadroTrilha(agora: number, perto: number): void {
    if (!trilha) return;
    const cam = scene.activeCamera?.globalPosition ?? Vector3.ZeroReadOnly;
    const t = agora - trilha.nasceu;
    const pts = trilha.pts;
    const n = pts.length;
    const apagar = trilha.apagando ? (agora - trilha.apagando) / 1.2 : 0;
    if (apagar >= 1 || !n) {
      trilha = null;
      estrela.thinInstanceCount = 0;
      estrela.setEnabled(false);
      return;
    }
    if (matrizes.length < n * 16) {
      // espaço para a trilha toda (até 300): o buffer é criado uma vez e só atualizado
      matrizes = new Float32Array(Math.max(n, 300) * 16);
      estrela.thinInstanceSetBuffer('matrix', matrizes, 16, false);
    }
    for (let i = 0; i < n; i++) {
      const [x, y, z] = pts[i];
      // nasce em onda: do jogador até o amigo
      const nascer = Math.min(1, Math.max(0, (t * 60 - i) / 6));
      // as de trás somem (a criança já passou por elas)
      const passou = i < perto - 2 ? Math.max(0, 1 - (perto - 2 - i) / 4) : 1;
      // o brilho que corre para a frente mostra o sentido
      const onda = Math.max(0, Math.cos((i * 0.35 - t * 6) % (Math.PI * 2))) ** 6;
      let s = (1.05 + 0.6 * onda) * nascer * passou * (1 - apagar);
      // a última: maior; sem caminho inteiro, grande e pulsando ("daqui, segure para pular")
      if (i === n - 1) s *= trilha.completo ? 1.6 : 2.4 + 0.5 * Math.sin(t * 5);
      // na tela, nunca do tamanho de uma cabeça: o tamanho tem teto pela distância da câmera,
      // e bem perto dela a estrela some
      const dc = Math.hypot(cam.x - x, cam.y - y - 0.42, cam.z - z);
      s = Math.min(s, dc * 0.16);
      if (dc < 4) s *= Math.max(0, (dc - 1.5) / 2.5);
      sTmp.set(s, s, s);
      // de frente para a câmera, balançando um pouco (nunca de perfil, que some)
      const yaw = Math.atan2(cam.x - x, cam.z - z) + Math.sin(t * 2.2 + i * 0.6) * 0.5;
      Quaternion.RotationYawPitchRollToRef(yaw, 0, 0, qTmp);
      pTmp.set(x, y + 0.42 + Math.sin(t * 3 + i * 0.7) * 0.06, z);
      Matrix.ComposeToRef(sTmp, qTmp, pTmp, mTmp);
      mTmp.copyToArray(matrizes, i * 16);
    }
    estrela.thinInstanceCount = n;
    estrela.thinInstanceBufferUpdated('matrix');
  }

  // ------------------------------------------------------------------ o puf
  const matPoeira = new StandardMaterial('amigo-poeira', scene);
  matPoeira.diffuseColor = Color3.FromHexString('#f6eedc');
  matPoeira.emissiveColor = Color3.FromHexString('#a99d86');
  matPoeira.specularColor = Color3.Black();
  matPoeira.alpha = 0.85;
  interface Peca {
    m: Mesh;
    dir: Vector3;
    base: Vector3;
    tam: number;
  }
  /** Cada puf: 12 nuvenzinhas e 6 estrelinhas (dois conjuntos: o da saída e o da chegada). */
  const conjuntos: { pecas: Peca[]; nasce: number }[] = [];
  function novoConjunto() {
    const pecas: Peca[] = [];
    const bola = MeshBuilder.CreateSphere('amigo-puf', { diameter: 1, segments: 8 }, scene);
    bola.material = matPoeira;
    bola.isPickable = false;
    const est = new Mesh('amigo-puf-estrela', scene);
    dadosEstrela().applyToMesh(est);
    est.material = matEstrela;
    est.isPickable = false;
    for (let i = 0; i < 12; i++) {
      const m = i ? bola.clone('amigo-puf') : bola;
      m.setEnabled(false);
      pecas.push({ m, dir: new Vector3(), base: new Vector3(), tam: 0.3 });
    }
    for (let i = 0; i < 6; i++) {
      const m = i ? est.clone('amigo-puf-estrela') : est;
      m.setEnabled(false);
      pecas.push({ m, dir: new Vector3(), base: new Vector3(), tam: -1 });
    }
    const c = { pecas, nasce: -Infinity };
    conjuntos.push(c);
    return c;
  }
  function puf(x: number, y: number, z: number, agora: number): void {
    const c = conjuntos.find((k) => agora - k.nasce > 0.95) ?? novoConjunto();
    c.nasce = agora;
    c.pecas.forEach((p, i) => {
      p.m.setEnabled(true);
      if (p.tam > 0) {
        const ang = (i / 12) * Math.PI * 2 + Math.random() * 0.4;
        p.tam = 0.3 + Math.random() * 0.25;
        p.base.set(x, y + 0.25 + Math.random() * 0.9, z);
        p.dir.set(Math.cos(ang), 0.15 + Math.random() * 0.25, Math.sin(ang));
      } else {
        const ang = ((i - 12) / 6) * Math.PI * 2;
        p.base.set(x, y + 1, z);
        p.dir.set(Math.cos(ang) * 0.7, 1.1, Math.sin(ang) * 0.7);
      }
      p.m.position.copyFrom(p.base);
    });
  }
  function quadroPuf(agora: number): void {
    for (const c of conjuntos) {
      const t = (agora - c.nasce) / 0.9;
      if (t < 0) continue;
      if (t >= 1) {
        if (c.nasce > -Infinity) {
          for (const p of c.pecas) p.m.setEnabled(false);
          c.nasce = -Infinity;
        }
        continue;
      }
      const ease = 1 - (1 - t) ** 3;
      for (const p of c.pecas) {
        if (p.tam > 0) {
          p.m.position.set(
            p.base.x + p.dir.x * ease * 1.4,
            p.base.y + p.dir.y * ease * 1.4,
            p.base.z + p.dir.z * ease * 1.4,
          );
          const s = p.tam * (0.6 + ease * 0.9) * (1 - t * t);
          p.m.scaling.set(s, s * 0.85, s);
        } else {
          p.m.position.set(
            p.base.x + p.dir.x * ease * 1.6,
            p.base.y + p.dir.y * ease * 1.6 - t * t * 0.8,
            p.base.z + p.dir.z * ease * 1.6,
          );
          const s = 1.3 * (1 - t);
          p.m.scaling.set(s, s, s);
          p.m.rotation.y = t * 8;
        }
      }
    }
  }

  return {
    /** Acende a trilha nestes pontos (as estrelinhas já espalhadas). */
    trilha(pts: V3[], completo: boolean, agora: number): void {
      trilha = { pts, nasceu: agora, completo, apagando: 0 };
      estrela.setEnabled(pts.length > 0);
    },
    /** Troca os pontos sem nascer de novo (o caminho foi procurado outra vez). */
    trocarPontos(pts: V3[], completo: boolean): void {
      if (!trilha) return;
      trilha.pts = pts;
      trilha.completo = completo;
    },
    /** Começa a apagar (chegou, ou o tempo acabou). */
    apagar(agora: number): void {
      if (trilha && !trilha.apagando) trilha.apagando = agora;
    },
    /** Some na hora. */
    tirar(): void {
      trilha = null;
      estrela.thinInstanceCount = 0;
      estrela.setEnabled(false);
    },
    get acesa() {
      return !!trilha;
    },
    get apagando() {
      return !!trilha?.apagando;
    },
    pontos: () => trilha?.pts ?? [],
    puf,
    quadro(agora: number, perto: number): void {
      quadroTrilha(agora, perto);
      quadroPuf(agora);
    },
    /** Quantas estrelinhas e quantas malhas a trilha usa (testes de desempenho). */
    medida: () => ({ estrelas: estrela.thinInstanceCount, malhas: estrela.isEnabled() ? 1 : 0 }),
  };
}

export type Estrelinhas = ReturnType<typeof criarEstrelinhas>;
