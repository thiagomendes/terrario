/**
 * Os blocos fantasmas do canteiro (spec 014, T06): cada célula da planta ainda vazia é um
 * cubo azul translúcido com contorno claro e a cor do bloco bem leve por cima. Tudo em
 * instâncias finas (uma malha de cubo, uma cor por instância): duas malhas para todas as
 * obras perto, a da próxima camada (que pulsa devagar) e a das de cima (mais apagadas).
 * Sem colisão, sem sombra, sem picking: a câmera passa por eles.
 *
 * Também mora aqui o que acompanha os fantasmas: o bloco de verdade, pequeno, girando no
 * fantasma da mira; o tremidinho e o balão com o bloco certo (bloco errado); e a placa
 * "Feita por Ana e Léo" das obras feitas.
 */
import type { Scene } from '@babylonjs/core/scene';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Matrix } from '@babylonjs/core/Maths/math.vector';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import '@babylonjs/core/Meshes/thinInstanceMesh';
import { Bloco } from '../world/blocks';
import { criarPlasticos } from './formas';
import { modeloNaMao } from './itensBrinquedo';

/** Um fantasma: a célula, o bloco que ela pede e se é da camada que pulsa. */
export interface FantasmaVisto {
  x: number;
  y: number;
  z: number;
  bloco: number;
  pulsa: boolean;
}

/** A cor leve de cada bloco das obras (por cima do azul). */
const COR_BLOCO: Record<number, [number, number, number]> = {
  [Bloco.TIJOLOS]: [0.86, 0.32, 0.26],
  [Bloco.TABUAS]: [0.82, 0.62, 0.36],
  [Bloco.TABUAS_BETULA]: [0.95, 0.88, 0.7],
  [Bloco.VIDRO]: [0.75, 0.95, 1],
  [Bloco.LAJE]: [0.75, 0.75, 0.78],
  [Bloco.CERCA]: [0.7, 0.5, 0.3],
  [Bloco.PORTA]: [0.66, 0.44, 0.26],
  [Bloco.ESCADA]: [0.74, 0.52, 0.3],
  [Bloco.TOLDO_VERMELHO]: [0.95, 0.3, 0.3],
  [Bloco.TOLDO_VERDE]: [0.35, 0.8, 0.4],
};
/** A base é branca: o azul vem da textura, e a cor do bloco tinge por cima. */
const AZUL: [number, number, number] = [1, 1, 1];
/** Quanto da cor do bloco vai por cima do azul. */
const MISTURA = 0.42;

export function corDoFantasma(bloco: number): [number, number, number] {
  const c = COR_BLOCO[bloco] ?? [0.8, 0.8, 0.8];
  return [0, 1, 2].map((i) => AZUL[i] * (1 - MISTURA) + c[i] * MISTURA) as [number, number, number];
}

/** A moldura do fantasma (o contorno claro): as 12 arestas do cubo, numa malha só. */
function malhaDaMoldura(scene: Scene, nome: string, lado = 0.95, grossura = 0.07): Mesh {
  const h = lado / 2;
  const barras: Mesh[] = [];
  for (const eixo of [0, 1, 2])
    for (const a of [-h, h])
      for (const b of [-h, h]) {
        const tam = [grossura, grossura, grossura];
        tam[eixo] = lado + grossura;
        const m = MeshBuilder.CreateBox(
          `${nome}-b`,
          { width: tam[0], height: tam[1], depth: tam[2] },
          scene,
        );
        const p = [a, b];
        const outros = [0, 1, 2].filter((k) => k !== eixo);
        const pos = [0, 0, 0];
        pos[outros[0]] = p[0];
        pos[outros[1]] = p[1];
        m.position.set(pos[0], pos[1], pos[2]);
        barras.push(m);
      }
  return Mesh.MergeMeshes(barras, true, true)!;
}

export function criarFantasmasObra(scene: Scene, excluirDoGlow: (m: Mesh) => void) {
  const material = (nome: string, alfa: number, cor = new Color3(0.32, 0.6, 1)) => {
    const m = new StandardMaterial(nome, scene);
    m.disableLighting = true;
    m.diffuseColor = Color3.Black();
    m.emissiveColor = cor;
    m.fogEnabled = false;
    m.specularColor = Color3.Black();
    m.alpha = alfa;
    m.backFaceCulling = true;
    // o fantasma não esconde o que está atrás dele (nem os outros fantasmas)
    m.disableDepthWrite = true;
    return m;
  };
  const claro = new Color3(0.9, 0.95, 1);
  const camadas = [
    {
      mat: material('fantasma-pulso', 0.5),
      matMoldura: material('fantasma-pulso-moldura', 0.9, claro),
      malha: null as Mesh | null,
      moldura: null as Mesh | null,
    },
    {
      mat: material('fantasma-cima', 0.32),
      matMoldura: material('fantasma-cima-moldura', 0.55, claro),
      malha: null as Mesh | null,
      moldura: null as Mesh | null,
    },
  ];
  const preparar = (m: Mesh, mat: StandardMaterial) => {
    m.material = mat;
    m.isPickable = false;
    m.receiveShadows = false;
    m.alwaysSelectAsActiveMesh = true;
    m.thinInstanceEnablePicking = false;
    m.alphaIndex = 10;
    m.setEnabled(false);
    excluirDoGlow(m);
    return m;
  };
  for (const [k, c] of camadas.entries()) {
    c.malha = preparar(MeshBuilder.CreateBox(`fantasmas-obra-${k}`, { size: 0.94 }, scene), c.mat);
    c.moldura = preparar(malhaDaMoldura(scene, `fantasmas-moldura-${k}`), c.matMoldura);
    c.moldura.name = `fantasmas-moldura-${k}`;
  }
  /** O que está desenhado agora (para refazer só quando muda). */
  let chave = '';
  let lista: FantasmaVisto[] = [];
  const tremendo = new Map<string, number>();

  function montar(): void {
    for (const [k, c] of camadas.entries()) {
      const deles = lista.filter((f) => (k === 0) === f.pulsa);
      const m = c.malha!;
      const mo = c.moldura!;
      if (!deles.length) {
        for (const x of [m, mo]) {
          x.setEnabled(false);
          x.thinInstanceCount = 0;
        }
        continue;
      }
      const mats = new Float32Array(16 * deles.length);
      const cores = new Float32Array(4 * deles.length);
      deles.forEach((f, i) => {
        Matrix.Translation(f.x + 0.5, f.y + 0.5, f.z + 0.5).copyToArray(mats, i * 16);
        const [r, g, b] = corDoFantasma(f.bloco);
        cores.set([r, g, b, 1], i * 4);
      });
      m.thinInstanceSetBuffer('matrix', mats, 16, false);
      m.thinInstanceSetBuffer('color', cores, 4, true);
      m.setEnabled(true);
      mo.thinInstanceSetBuffer('matrix', mats.slice(), 16, false);
      mo.setEnabled(true);
    }
  }

  // o bloco de verdade, pequeno, girando no fantasma da mira
  const plasticos = criarPlasticos(scene, 'fantasma-mira');
  const modelos = new Map<number, { no: TransformNode; malhas: Mesh[] }>();
  let naMira: { no: TransformNode } | null = null;
  function modeloDe(bloco: number) {
    let m = modelos.get(bloco);
    if (m) return m;
    const mod = modeloNaMao(scene, plasticos, bloco, null, `fantasma-mira-${bloco}`);
    const no = new TransformNode(`fantasma-mira-${bloco}`, scene);
    const malhas: Mesh[] = [];
    if (mod) {
      mod.no.parent = no;
      malhas.push(...mod.malhas);
    }
    for (const x of malhas) {
      x.isPickable = false;
      x.receiveShadows = false;
      excluirDoGlow(x);
    }
    no.setEnabled(false);
    m = { no, malhas };
    modelos.set(bloco, m);
    return m;
  }

  // o balão com o bloco certo (bloco errado): um plano creme virado para a câmera
  const texBalao = new DynamicTexture('balao-obra', { width: 128, height: 128 }, scene, true);
  {
    const g = texBalao.getContext() as unknown as CanvasRenderingContext2D;
    g.clearRect(0, 0, 128, 128);
    g.fillStyle = '#fffaf0';
    g.beginPath();
    g.arc(64, 58, 50, 0, Math.PI * 2);
    g.moveTo(52, 100);
    g.lineTo(64, 124);
    g.lineTo(76, 100);
    g.fill();
    g.strokeStyle = '#e2d6c0';
    g.lineWidth = 4;
    g.beginPath();
    g.arc(64, 58, 50, 0, Math.PI * 2);
    g.stroke();
    texBalao.hasAlpha = true;
    texBalao.update();
  }
  const matBalao = new StandardMaterial('balao-obra', scene);
  matBalao.diffuseTexture = texBalao;
  matBalao.useAlphaFromDiffuseTexture = true;
  matBalao.disableLighting = true;
  matBalao.emissiveColor = new Color3(1, 1, 1);
  matBalao.backFaceCulling = false;
  const balao = MeshBuilder.CreatePlane('balao-obra', { size: 0.9 }, scene);
  balao.material = matBalao;
  balao.billboardMode = Mesh.BILLBOARDMODE_ALL;
  balao.isPickable = false;
  balao.renderingGroupId = 1;
  balao.setEnabled(false);
  excluirDoGlow(balao);
  let balaoAte = 0;
  let balaoBloco: { no: TransformNode } | null = null;

  // placas "Feita por ..." das obras feitas
  const placas = new Map<number, { malha: Mesh; texto: string }>();

  return {
    /** Os fantasmas de agora (refaz as instâncias só quando a lista muda). */
    definir(novos: FantasmaVisto[]): void {
      const k = novos.map((f) => `${f.x},${f.y},${f.z},${f.pulsa ? 1 : 0}`).join(';');
      if (k === chave) return;
      chave = k;
      lista = novos;
      montar();
    },
    get quantos(): number {
      return lista.length;
    },
    /** A cada quadro: o pulso, o tremidinho, o bloco da mira e o balão. */
    quadro(tempo: number, mira: { x: number; y: number; z: number; bloco: number } | null): void {
      const pulso = 0.5 + 0.5 * Math.sin(tempo * 3.2);
      camadas[0].mat.alpha = 0.38 + 0.3 * pulso;
      camadas[0].matMoldura.alpha = 0.7 + 0.3 * pulso;
      if (tremendo.size) {
        let mudou = false;
        for (const [k, ate] of tremendo)
          if (tempo > ate) {
            tremendo.delete(k);
            mudou = true;
          }
        const m = camadas.map((c) => c.malha!);
        const mo = camadas.map((c) => c.moldura!);
        for (let k = 0; k < camadas.length; k++) {
          const deles = lista.filter((f) => (k === 0) === f.pulsa);
          deles.forEach((f, i) => {
            const t = tremendo.has(`${f.x},${f.y},${f.z}`);
            if (!t && !mudou) return;
            const dx = t ? Math.sin(tempo * 48) * 0.07 : 0;
            const mt = Matrix.Translation(f.x + 0.5 + dx, f.y + 0.5, f.z + 0.5);
            m[k].thinInstanceSetMatrixAt(i, mt, i === deles.length - 1);
            mo[k].thinInstanceSetMatrixAt(i, mt, i === deles.length - 1);
          });
        }
      }
      const alvo = mira ? modeloDe(mira.bloco) : null;
      if (naMira && naMira !== alvo) naMira.no.setEnabled(false);
      naMira = alvo;
      if (alvo && mira) {
        alvo.no.setEnabled(true);
        alvo.no.position.set(
          mira.x + 0.5,
          mira.y + 0.45 + Math.sin(tempo * 2.4) * 0.05,
          mira.z + 0.5,
        );
        alvo.no.rotation.y = tempo * 1.8;
        alvo.no.scaling.setAll(0.75);
      }
      if (balao.isEnabled() && tempo > balaoAte) {
        balao.setEnabled(false);
        balaoBloco?.no.setEnabled(false);
        balaoBloco = null;
      }
    },
    /** Bloco errado: o fantasma treme e o balão mostra o bloco certo em cima dele. */
    avisar(x: number, y: number, z: number, certo: number, tempo: number): void {
      tremendo.set(`${x},${y},${z}`, tempo + 0.45);
      balao.position.set(x + 0.5, y + 1.75, z + 0.5);
      balao.setEnabled(true);
      balaoAte = tempo + 2.2;
      balaoBloco?.no.setEnabled(false);
      const m = modeloDe(certo);
      // o bloquinho do balão: outro nó com o mesmo modelo seria outra malha; usa o da mira
      // quando ela não está nele (o balão dura pouco)
      if (naMira !== m) {
        m.no.setEnabled(true);
        m.no.position.set(x + 0.5, y + 1.82, z + 0.5);
        m.no.rotation.y = 0.6;
        m.no.scaling.setAll(0.6);
        balaoBloco = m;
      }
    },
    /** A placa da obra feita, com os nomes de quem fez (até 4). */
    placa(n: number, x: number, y: number, z: number, yaw: number, nomes: readonly string[]): void {
      const texto = nomes.length ? juntarNomes(nomes) : '';
      const ja = placas.get(n);
      if (ja && ja.texto === texto) return;
      ja?.malha.material?.dispose(true, true);
      ja?.malha.dispose();
      placas.delete(n);
      if (!texto) return;
      const t = new DynamicTexture(`placa-feita-${n}`, { width: 512, height: 192 }, scene, true);
      const g = t.getContext() as unknown as CanvasRenderingContext2D;
      g.fillStyle = '#fffaf0';
      g.fillRect(0, 0, 512, 192);
      g.strokeStyle = '#c9a36a';
      g.lineWidth = 10;
      g.strokeRect(5, 5, 502, 182);
      g.fillStyle = '#3b2a1e';
      g.textAlign = 'center';
      g.font = '700 44px sans-serif';
      g.fillText('Feita por', 256, 76);
      let tam = 52;
      g.font = `700 ${tam}px sans-serif`;
      while (g.measureText(texto).width > 480 && tam > 22)
        g.font = `700 ${(tam -= 2)}px sans-serif`;
      g.fillText(texto, 256, 148);
      t.update();
      const mat = new StandardMaterial(`placa-feita-${n}`, scene);
      mat.diffuseTexture = t;
      mat.emissiveColor = new Color3(0.55, 0.55, 0.55);
      mat.specularColor = Color3.Black();
      mat.backFaceCulling = false;
      const malha = MeshBuilder.CreatePlane(`placa-feita-${n}`, { width: 1.6, height: 0.6 }, scene);
      malha.material = mat;
      malha.position.set(x, y, z);
      malha.rotation.y = yaw;
      malha.isPickable = false;
      excluirDoGlow(malha);
      placas.set(n, { malha, texto });
    },
  };
}

/** "Ana", "Ana e Léo", "Ana, Bia e Léo". */
export function juntarNomes(nomes: readonly string[]): string {
  const n = nomes.slice(0, 4);
  if (n.length <= 1) return n[0] ?? '';
  return `${n.slice(0, -1).join(', ')} e ${n[n.length - 1]}`;
}

export type FantasmasObra = ReturnType<typeof criarFantasmasObra>;
