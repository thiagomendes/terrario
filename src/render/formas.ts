/**
 * Formas de brinquedo (spec 012): caixa de cantos arredondados, esfera e cilindro, e o
 * material de plástico. Usadas pelo personagem, pelos moradores, pelos bichos e pelos
 * itens na mão. A caixa arredondada é feita aqui (o Babylon não tem uma): uma grade em
 * cada face, empurrada para a superfície de uma caixa menor mais um raio.
 */
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import type { Scene } from '@babylonjs/core/scene';

/** As seis faces: eixo normal (0 x, 1 y, 2 z), sentido e os dois eixos do plano. */
const FACES: Array<{ n: 0 | 1 | 2; s: 1 | -1; u: 0 | 1 | 2; v: 0 | 1 | 2 }> = [
  { n: 0, s: 1, u: 2, v: 1 },
  { n: 0, s: -1, u: 2, v: 1 },
  { n: 1, s: 1, u: 0, v: 2 },
  { n: 1, s: -1, u: 0, v: 2 },
  { n: 2, s: 1, u: 0, v: 1 },
  { n: 2, s: -1, u: 0, v: 1 },
];

/**
 * Vértices de uma caixa w × h × d com cantos de raio r (r é limitado à metade do menor lado).
 * `seg` subdivisões por face: os cantos ficam redondos, o meio das faces fica plano.
 */
export function dadosCaixaArredondada(
  w: number,
  h: number,
  d: number,
  r: number,
  seg = 4,
): VertexData {
  const meio = [w / 2, h / 2, d / 2];
  const raio = Math.max(0, Math.min(r, ...meio));
  const dentro = meio.map((m) => m - raio);
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  // a grade tem mais linhas perto das bordas (onde a curva está); o meio é plano
  const passos: number[] = [];
  for (let i = 0; i <= seg; i++) {
    const t = i / seg;
    passos.push(t < 0.5 ? 0.5 * Math.pow(2 * t, 2) : 1 - 0.5 * Math.pow(2 - 2 * t, 2));
  }
  for (const f of FACES) {
    const base = positions.length / 3;
    for (let j = 0; j <= seg; j++)
      for (let i = 0; i <= seg; i++) {
        const p = [0, 0, 0];
        p[f.n] = f.s * meio[f.n];
        p[f.u] = (passos[i] * 2 - 1) * meio[f.u];
        p[f.v] = (passos[j] * 2 - 1) * meio[f.v];
        const q = p.map((c, k) => Math.max(-dentro[k], Math.min(dentro[k], c)));
        let nx = p[0] - q[0];
        let ny = p[1] - q[1];
        let nz = p[2] - q[2];
        const len = Math.hypot(nx, ny, nz);
        if (len < 1e-9) {
          nx = f.n === 0 ? f.s : 0;
          ny = f.n === 1 ? f.s : 0;
          nz = f.n === 2 ? f.s : 0;
        } else {
          nx /= len;
          ny /= len;
          nz /= len;
        }
        positions.push(q[0] + nx * raio, q[1] + ny * raio, q[2] + nz * raio);
        normals.push(nx, ny, nz);
        uvs.push(passos[i], passos[j]);
      }
    const linha = seg + 1;
    for (let j = 0; j < seg; j++)
      for (let i = 0; i < seg; i++) {
        const a = base + j * linha + i;
        const b = a + 1;
        const c = a + linha;
        const e = c + 1;
        pushTri(positions, normals, indices, a, b, e);
        pushTri(positions, normals, indices, a, e, c);
      }
  }
  const vd = new VertexData();
  vd.positions = positions;
  vd.normals = normals;
  vd.uvs = uvs;
  vd.indices = indices;
  return vd;
}

/** Acrescenta o triângulo virado para fora (no Babylon, a frente tem cross·normal < 0). */
function pushTri(p: number[], n: number[], ix: number[], a: number, b: number, c: number): void {
  const ux = p[b * 3] - p[a * 3];
  const uy = p[b * 3 + 1] - p[a * 3 + 1];
  const uz = p[b * 3 + 2] - p[a * 3 + 2];
  const vx = p[c * 3] - p[a * 3];
  const vy = p[c * 3 + 1] - p[a * 3 + 1];
  const vz = p[c * 3 + 2] - p[a * 3 + 2];
  const cx = uy * vz - uz * vy;
  const cy = uz * vx - ux * vz;
  const cz = ux * vy - uy * vx;
  const nx = n[a * 3] + n[b * 3] + n[c * 3];
  const ny = n[a * 3 + 1] + n[b * 3 + 1] + n[c * 3 + 1];
  const nz = n[a * 3 + 2] + n[b * 3 + 2] + n[c * 3 + 2];
  if (cx * nx + cy * ny + cz * nz < 0) ix.push(a, b, c);
  else ix.push(a, c, b);
}

/** Materiais de plástico de um conjunto (personagem, bicho): todos seguem a luz do lugar. */
export interface Plasticos {
  /** Material da cor (um por cor, reaproveitado). */
  cor(hex: string, brilho?: number): StandardMaterial;
  /** Luz do ambiente (1 ao ar livre, baixa em cavernas). */
  definirLuz(f: number): void;
  descartar(): void;
}

export function criarPlasticos(scene: Scene, prefixo: string): Plasticos {
  const mats = new Map<string, { m: StandardMaterial; base: Color3; brilho: number }>();
  let luz = 1;
  const aplicar = (e: { m: StandardMaterial; base: Color3; brilho: number }) => {
    // mesmo piso de luz do personagem de hoje: nunca fica preto contra o sol
    e.m.diffuseColor.copyFrom(e.base).scaleInPlace(0.78 * luz);
    e.m.emissiveColor.copyFrom(e.base).scaleInPlace(0.36 * luz);
    e.m.specularColor.set(e.brilho * luz, e.brilho * luz, e.brilho * luz);
  };
  return {
    cor(hex, brilho = 0.28) {
      const chave = `${hex}|${brilho}`;
      const ja = mats.get(chave);
      if (ja) return ja.m;
      const m = new StandardMaterial(`${prefixo}-plastico-${hex}`, scene);
      m.specularPower = 42;
      m.ambientColor = Color3.White();
      const e = { m, base: Color3.FromHexString(hex).toLinearSpace(), brilho };
      // as cores do esboço são em sRGB; o Babylon desenha em espaço "gama" direto
      e.base = Color3.FromHexString(hex);
      aplicar(e);
      mats.set(chave, e);
      return m;
    },
    definirLuz(f) {
      luz = f;
      for (const e of mats.values()) aplicar(e);
    },
    descartar() {
      for (const e of mats.values()) e.m.dispose();
      mats.clear();
    },
  };
}

/** Caixa arredondada pronta, com material. */
export function caixaArredondada(
  nome: string,
  scene: Scene,
  w: number,
  h: number,
  d: number,
  r: number,
  material: StandardMaterial,
  seg = 4,
): Mesh {
  const m = new Mesh(nome, scene);
  dadosCaixaArredondada(w, h, d, r, seg).applyToMesh(m);
  m.material = material;
  m.isPickable = false;
  return m;
}

export function esfera(
  nome: string,
  scene: Scene,
  raio: number,
  material: StandardMaterial,
  escala: [number, number, number] = [1, 1, 1],
): Mesh {
  const m = MeshBuilder.CreateSphere(nome, { diameter: raio * 2, segments: 12 }, scene);
  m.scaling.set(escala[0], escala[1], escala[2]);
  m.material = material;
  m.isPickable = false;
  return m;
}

export function cilindro(
  nome: string,
  scene: Scene,
  altura: number,
  raioBaixo: number,
  raioCima: number,
  material: StandardMaterial,
): Mesh {
  const m = MeshBuilder.CreateCylinder(
    nome,
    { height: altura, diameterBottom: raioBaixo * 2, diameterTop: raioCima * 2, tessellation: 14 },
    scene,
  );
  m.material = material;
  m.isPickable = false;
  return m;
}
