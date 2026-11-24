/**
 * Formas de brinquedo (spec 012): caixa de cantos arredondados, esfera e cilindro, e o
 * material de plástico. Usadas pelo personagem, pelos moradores, pelos bichos e pelos
 * itens na mão. A caixa arredondada é feita aqui (o Babylon não tem uma): uma grade em
 * cada face, empurrada para a superfície de uma caixa menor mais um raio.
 */
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer';
import { CreateSphereVertexData } from '@babylonjs/core/Meshes/Builders/sphereBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { MaterialPluginBase } from '@babylonjs/core/Materials/materialPluginBase';
import type { Material } from '@babylonjs/core/Materials/material';
import type { BaseTexture } from '@babylonjs/core/Materials/Textures/baseTexture';
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

/** Triangula um contorno simples (orelhas), devolvendo os índices dos triângulos. */
export function triangular(pts: Array<[number, number]>): number[] {
  const n = pts.length;
  let area = 0;
  for (let i = 0; i < n; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[(i + 1) % n];
    area += x0 * y1 - x1 * y0;
  }
  const idx = Array.from({ length: n }, (_, i) => i);
  if (area < 0) idx.reverse();
  const tri: number[] = [];
  const cruz = (a: number, b: number, c: number) =>
    (pts[b][0] - pts[a][0]) * (pts[c][1] - pts[a][1]) -
    (pts[b][1] - pts[a][1]) * (pts[c][0] - pts[a][0]);
  const dentro = (p: number, a: number, b: number, c: number) =>
    cruz(a, b, p) >= 0 && cruz(b, c, p) >= 0 && cruz(c, a, p) >= 0;
  let guarda = 0;
  while (idx.length > 3 && guarda++ < 2000) {
    let cortou = false;
    for (let i = 0; i < idx.length; i++) {
      const a = idx[(i + idx.length - 1) % idx.length];
      const b = idx[i];
      const c = idx[(i + 1) % idx.length];
      if (cruz(a, b, c) <= 1e-12) continue;
      if (idx.some((q) => q !== a && q !== b && q !== c && dentro(q, a, b, c))) continue;
      tri.push(a, b, c);
      idx.splice(i, 1);
      cortou = true;
      break;
    }
    if (!cortou) break;
  }
  if (idx.length === 3) tri.push(idx[0], idx[1], idx[2]);
  return tri;
}

/**
 * Placa (spec 017): o contorno no plano xy com espessura em z (estrela, raio, coração, folha,
 * concha, a capa). Frente e verso planos e a borda com a normal de cada lado.
 */
/**
 * Spec 027: a malha de pano (a gola curva, a cúpula e o sino do lençol) com as duas faces: cada
 * triângulo sai também virado, com a normal para o outro lado (o lado de dentro do pano tem a
 * mesma luz do de fora, sem material de duas faces).
 */
export function dadosMalhaPano(pos: number[], ind: number[], avessoClaro = false): VertexData {
  const n = pos.length / 3;
  const normais: number[] = [];
  VertexData.ComputeNormals(pos, ind, normais);
  // Spec 036 (o pano do guarda-chuva): com `avessoClaro`, as duas faces usam a luz de cima (a
  // normal virada para o céu), e o lado de baixo fica na cor do pano em vez de cinza-escuro
  if (avessoClaro)
    for (let i = 0; i < normais.length; i += 3)
      if (normais[i + 1] < 0) for (let k = 0; k < 3; k++) normais[i + k] = -normais[i + k];
  const positions = [...pos, ...pos];
  const normals = [...normais, ...normais.map((v) => (avessoClaro ? v : -v))];
  const indices = [...ind];
  for (let i = 0; i < ind.length; i += 3) indices.push(ind[i] + n, ind[i + 2] + n, ind[i + 1] + n);
  const vd = new VertexData();
  vd.positions = positions;
  vd.normals = normals;
  vd.indices = indices;
  // (as outras peças têm uv: sem ele, a malha não junta com elas na mesma junta)
  vd.uvs = new Array((positions.length / 3) * 2).fill(0);
  return vd;
}

export function dadosPlaca(perfil: Array<[number, number]>, espessura: number): VertexData {
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const h = espessura / 2;
  const tri = triangular(perfil);
  for (const s of [1, -1]) {
    const base = positions.length / 3;
    for (const [x, y] of perfil) {
      positions.push(x, y, s * h);
      normals.push(0, 0, s);
      uvs.push(0, 0);
    }
    for (let i = 0; i < tri.length; i += 3)
      pushTri(positions, normals, indices, base + tri[i], base + tri[i + 1], base + tri[i + 2]);
  }
  const n = perfil.length;
  // sentido do contorno: a normal da borda aponta para fora
  let area = 0;
  for (let i = 0; i < n; i++) {
    const [x0, y0] = perfil[i];
    const [x1, y1] = perfil[(i + 1) % n];
    area += x0 * y1 - x1 * y0;
  }
  const sinal = area >= 0 ? 1 : -1;
  for (let i = 0; i < n; i++) {
    const [x0, y0] = perfil[i];
    const [x1, y1] = perfil[(i + 1) % n];
    const l = Math.hypot(x1 - x0, y1 - y0) || 1;
    const nx = ((y1 - y0) / l) * sinal;
    const ny = (-(x1 - x0) / l) * sinal;
    const base = positions.length / 3;
    for (const [x, y, z] of [
      [x0, y0, h],
      [x1, y1, h],
      [x1, y1, -h],
      [x0, y0, -h],
    ]) {
      positions.push(x, y, z);
      normals.push(nx, ny, 0);
      uvs.push(0, 0);
    }
    pushTri(positions, normals, indices, base, base + 1, base + 2);
    pushTri(positions, normals, indices, base, base + 2, base + 3);
  }
  const vd = new VertexData();
  vd.positions = positions;
  vd.normals = normals;
  vd.uvs = uvs;
  vd.indices = indices;
  return vd;
}

/**
 * Anel (toro deitado no plano xz) inteiro ou só um arco (spec 017: a tiara), com o arco
 * centrado em +z. `diametro` passa pelo meio do tubo.
 */
export function dadosAnel(
  diametro: number,
  espessura: number,
  arco = 0,
  lados = 22,
  voltas = 10,
): VertexData {
  const R = diametro / 2;
  const r = espessura / 2;
  const inteiro = !(arco > 0) || arco >= Math.PI * 2 - 1e-6;
  const a0 = inteiro ? 0 : Math.PI / 2 - arco / 2;
  const a1 = inteiro ? Math.PI * 2 : Math.PI / 2 + arco / 2;
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const linhas = inteiro ? lados : Math.max(4, Math.round((lados * (a1 - a0)) / (Math.PI * 2)) + 1);
  for (let i = 0; i <= linhas; i++) {
    const t = a0 + ((a1 - a0) * i) / linhas;
    // ponto do arco: x = R cos t, z = R sin t (no plano xz)
    const cx = Math.cos(t);
    const cz = Math.sin(t);
    for (let j = 0; j <= voltas; j++) {
      const f = (j / voltas) * Math.PI * 2;
      const nx = cx * Math.cos(f);
      const ny = Math.sin(f);
      const nz = cz * Math.cos(f);
      positions.push(R * cx + r * nx, r * ny, R * cz + r * nz);
      normals.push(nx, ny, nz);
      uvs.push(i / linhas, j / voltas);
    }
  }
  const linha = voltas + 1;
  for (let i = 0; i < linhas; i++)
    for (let j = 0; j < voltas; j++) {
      const a = i * linha + j;
      const b = a + linha;
      pushTri(positions, normals, indices, a, b, b + 1);
      pushTri(positions, normals, indices, a, b + 1, a + 1);
    }
  const vd = new VertexData();
  vd.positions = positions;
  vd.normals = normals;
  vd.uvs = uvs;
  vd.indices = indices;
  return vd;
}

/**
 * Luz do plástico (correção da 017, "luz estourando"). O material padrão do Babylon soma
 * luz × difusa + piso (emissiva) + ambiente da cena e corta em 1 por canal. Com o sol do meio
 * do dia (2 de intensidade) e o piso antigo (0,36 + ambiente 0,2 + céu), qualquer lado passava
 * de 0,85: a pele, a camisa branca e o chapéu de palha saíam lisos, sem lado de sombra, e o
 * tonemapping (ACES) ainda espremia tudo no mesmo claro. Agora a luz vem em três partes, como
 * no esboço (luz do céu, sol e brilho de verniz):
 * - um piso baixo (nunca fica preto);
 * - uma luz de estúdio do lado da câmera (`LUZ_FRENTE`, só no plástico): a frente que a gente
 *   vê fica clara e vai escurecendo para as bordas, com o sol na frente ou atrás do boneco;
 * - o sol e o céu, com difusa baixa (o lado do sol fica mais claro e quente);
 * e a soma passa por um ombro suave em vez do corte em 1 (o claro ainda tem forma).
 * O pós-processo (ACES sobre cores em gama) escurece muito o meio-tom e leva o 1 a 0,83: a
 * frente de frente para a câmera fica um pouco acima de 1, para sair na cor do catálogo, e o
 * lado da sombra perto de 0,6 da frente, como no esboço.
 */
export const DIFUSA_PLASTICO = 0.2;
export const PISO_PLASTICO = 0.32;
/** Luz de estúdio do lado da câmera, em múltiplos da difusa. */
export const LUZ_FRENTE = 0.72 / DIFUSA_PLASTICO;
/** A tinta das fantasias: a cor vai nos vértices e multiplica a luz (mesma luz do plástico). */
export const DIFUSA_VIVA = DIFUSA_PLASTICO;
export const EMISSIVA_VIVA = PISO_PLASTICO;
/** Um pouco mais funda que a cor do catálogo (o pós-processo do jogo clareia no fim). */
export const GAMA_VIVA = 1.15;
/** Reflexo do sol: mais largo e um pouco mais forte que o do bloco (vinil, não espelho). */
export const POTENCIA_REFLEXO = 28;
export const FORCA_REFLEXO = 1.2;
/** A borda de verniz (igual em toda peça: no cabelo brilhante não vira metal). */
export const FORCA_VERNIZ = 0.3;

/**
 * A conta do plástico no pixel (correção da 017), em cima do material padrão: a luz de estúdio
 * do lado da câmera, o ombro suave no lugar do corte em 1 e a borda clara de verniz, azulada
 * como o céu, onde a peça vira de lado (o "látex" do esboço, que usa clearcoat). Tudo segue a
 * difusa e o reflexo do material, que já têm a luz do lugar: some na caverna e à noite.
 * Umas contas a mais por pixel, sem textura nem luz nova.
 */
export class PluginPlastico extends MaterialPluginBase {
  /**
   * Luz do lugar (1 ao ar livre, baixa em cavernas e à noite). Vai num uniforme do plugin, que
   * o Babylon reenvia mesmo com o material congelado: trocar a luz não descongela nada.
   */
  luz = 1;
  constructor(
    material: Material,
    /**
     * Spec 014 (T11, desempenho da cidade): a cor da peça vem dos vértices, e a conta é a mesma
     * de um material daquela cor (a cor entra antes do ombro suave): as peças da mesma junta
     * de um morador viram uma malha só sem mudar nada no desenho.
     */
    readonly corVertice = false,
  ) {
    super(material, 'Plastico', 220, { PLASTICO: false, PLASTICO_CV: false });
    this._enable(true);
  }
  override getClassName(): string {
    return 'PluginPlastico';
  }
  override isCompatible(): boolean {
    return true;
  }
  override prepareDefines(defines: Record<string, unknown>): void {
    defines['PLASTICO'] = true;
    defines['PLASTICO_CV'] = this.corVertice;
  }
  override getUniforms() {
    return {
      ubo: [{ name: 'luzPlastico', size: 1, type: 'float' }],
      fragment: 'uniform float luzPlastico;',
    };
  }
  override bindForSubMesh(uniformBuffer: { updateFloat(nome: string, valor: number): void }): void {
    uniformBuffer.updateFloat('luzPlastico', this.luz);
  }
  override getCustomCode(tipo: string): Record<string, string> | null {
    if (tipo !== 'fragment') return null;
    return {
      CUSTOM_FRAGMENT_BEFORE_FOG: `
        #ifdef PLASTICO
        {
          // estúdio: do lado da câmera, um pouco de cima
          vec3 dirFrente = normalize(viewDirectionW + vec3(0.0, 0.55, 0.0));
          float frente = max(dot(normalW, dirFrente), 0.0);
          #if defined(PLASTICO_CV) && defined(VERTEXCOLOR)
          vec3 corPeca = vColor.rgb;
          #else
          vec3 corPeca = vec3(1.0);
          #endif
          vec3 soma = (diffuseBase * diffuseColor + emissiveColor
            + diffuseColor * (${LUZ_FRENTE.toFixed(4)} * frente)) * corPeca * luzPlastico;
          // ombro suave a partir de 0,9, até 1,12 (o claro não vira uma chapa só e quase não
          // passa do limite do bloom: camisa branca ao sol não brilha)
          vec3 acima = max(soma - 0.9, 0.0) / 0.22;
          vec3 luzFinal = min(soma, 0.9) + 0.22 * acima / (1.0 + acima);
          #if defined(PLASTICO_CV) && defined(VERTEXCOLOR)
          // a cor do vértice já entrou na soma (baseColor é só ela: sem textura)
          color.rgb += luzFinal - finalDiffuse;
          #else
          color.rgb += luzFinal * baseColor.rgb - finalDiffuse;
          #endif
          #ifdef SPECULARTERM
          color.rgb -= finalSpecular * (1.0 - luzPlastico);
          float nv = clamp(dot(normalW, viewDirectionW), 0.0, 1.0);
          float borda = pow(1.0 - nv, 3.0) * (0.55 + 0.45 * clamp(normalW.y + 0.5, 0.0, 1.0));
          color.rgb += vec3(0.86, 0.93, 1.0) * (borda * ${FORCA_VERNIZ.toFixed(3)} * luzPlastico);
          #endif
        }
        #endif
      `,
    };
  }
}

/** A cor da tinta da fantasia, para os vértices. */
export function corViva(hex: string): [number, number, number] {
  const c = Color3.FromHexString(hex);
  return [c.r ** GAMA_VIVA, c.g ** GAMA_VIVA, c.b ** GAMA_VIVA];
}

/** Pinta todos os vértices da malha com a cor da tinta da fantasia. */
export function pintarVertices(m: Mesh, hex: string): void {
  const n = m.getTotalVertices();
  const [r, g, b] = corViva(hex);
  const cores = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) cores.set([r, g, b, 1], i * 4);
  m.setVerticesData(VertexBuffer.ColorKind, cores, false, 4);
}

/** Materiais de plástico de um conjunto (personagem, bicho): todos seguem a luz do lugar. */
export interface Plasticos {
  /**
   * Material da cor (um por cor, reaproveitado). `alfa` < 1: transparente (a bolha do
   * capacete, spec 017). `viva`: tinta das fantasias (spec 017), na cor do esboço aprovado.
   */
  cor(hex: string, brilho?: number, alfa?: number, viva?: boolean): StandardMaterial;
  /**
   * Tinta das fantasias (spec 017) num material só por brilho: a cor vai em cada vértice
   * (`pintarVertices`), e as peças da mesma junta viram uma malha só mesmo com cores
   * diferentes (menos desenhos por amigo fantasiado).
   */
  tinta(brilho?: number, alfa?: number): StandardMaterial;
  /**
   * Spec 014 (T11): material branco por brilho com a cor de cada vértice (`corDoVertice`),
   * desenhado igual ao `cor` daquela cor. Null no perfil clássico (sem a conta do plástico).
   */
  corVertice(brilho?: number): StandardMaterial | null;
  /**
   * Spec 023: plástico com a cor de uma textura que se mexe (o aquário da camiseta).
   * Nunca fica congelado (o deslocamento da textura muda a cada quadro).
   */
  textura(tex: BaseTexture, brilho?: number): StandardMaterial;
  /** Luz do ambiente (1 ao ar livre, baixa em cavernas). */
  definirLuz(f: number): void;
  /**
   * Meio transparente (spec 015): desenha a profundidade antes, para só a casca da frente de
   * cada peça aparecer (sem os olhos vistos por dentro da cabeça). Desligado, custo nenhum.
   */
  definirSoFrente(ligado: boolean): void;
  descartar(): void;
}

interface Plastico {
  m: StandardMaterial;
  base: Color3;
  brilho: number;
  viva: boolean;
  /** A conta do plástico (fora do perfil clássico): a luz do lugar vai nele. */
  plugin: PluginPlastico | null;
  /** Já espera o próximo desenho para congelar. */
  esperando: boolean;
  /** Spec 023: nunca congela (a textura dele anda). */
  solto?: boolean;
}

/**
 * `classico`: a luz de antes (difusa forte e piso alto), para cenas com luz própria e fraca
 * (os ícones dos itens), que não passam do ponto.
 */
export function criarPlasticos(
  scene: Scene,
  prefixo: string,
  opcoes: { classico?: boolean } = {},
): Plasticos {
  const classico = !!opcoes.classico;
  const mats = new Map<string, Plastico>();
  let luz = 1;
  let soFrente = false;
  /**
   * Desempenho (spec 017, 4 amigos fantasiados no celular): o material fica congelado (o
   * Babylon pula a conferência e o reenvio das cores a cada desenho). Correção da 017:
   * - a luz do lugar vai no uniforme do plugin (reenviado mesmo congelado): entrar na caverna,
   *   anoitecer e o morador entrando em casa não descongelam nada;
   * - descongelar e congelar (criar a peça, a transparência, o perfil clássico) é só a chave
   *   `checkReadyOnlyOnce` (é o que o `isFrozen` lê): `freeze()` e `unfreeze()` marcavam todas
   *   as malhas da cena a cada troca;
   * - congela só depois de o material ser desenhado (um boneco escondido, como no modo foto,
   *   fica descongelado até aparecer, senão a cor nova nunca chegaria à placa de vídeo);
   * - a luz ambiente da cena (que muda com a hora) não entra no plástico (`ambientColor`
   *   preto): um material congelado não a reenviaria. O piso de luz faz esse papel.
   */
  const congelarDepoisDeDesenhar = (e: Plastico) => {
    e.m.checkReadyOnlyOnce = false;
    if (soFrente || e.esperando || e.solto) return;
    e.esperando = true;
    e.m.onBindObservable.addOnce(() => {
      scene.onAfterRenderObservable.addOnce(() => {
        e.esperando = false;
        if (!soFrente) e.m.checkReadyOnlyOnce = true;
      });
    });
  };
  const aplicar = (e: Plastico) => {
    // com o plugin a luz do lugar fica fora das cores (vai no uniforme)
    const l = e.plugin ? 1 : luz;
    const kd = classico ? (e.viva ? 0.55 : 0.78) : e.viva ? DIFUSA_VIVA : DIFUSA_PLASTICO;
    const ke = classico ? (e.viva ? 0.42 : 0.36) : e.viva ? EMISSIVA_VIVA : PISO_PLASTICO;
    e.m.diffuseColor.copyFrom(e.base).scaleInPlace(kd * l);
    e.m.emissiveColor.copyFrom(e.base).scaleInPlace(ke * l);
    const r = e.brilho * (classico ? 1 : FORCA_REFLEXO) * l;
    e.m.specularColor.set(r, r, r);
    if (e.plugin) e.plugin.luz = luz;
    congelarDepoisDeDesenhar(e);
  };
  return {
    cor(hex, brilho = 0.28, alfa = 1, viva = false) {
      const chave = `${hex}|${brilho}|${alfa}|${viva ? 'v' : ''}`;
      const ja = mats.get(chave);
      if (ja) return ja.m;
      const m = new StandardMaterial(`${prefixo}-plastico-${hex}`, scene);
      if (alfa < 1) {
        m.alpha = alfa;
        // vidro: só a casca de fora, sem gravar profundidade (o cabelo e o rosto aparecem)
        m.backFaceCulling = true;
        m.disableDepthWrite = true;
      }
      m.specularPower = classico ? 42 : POTENCIA_REFLEXO;
      m.ambientColor = classico ? Color3.White() : Color3.Black();
      const plugin = classico ? null : new PluginPlastico(m);
      // a tinta das fantasias (`viva`) usa este material em branco: a cor vem dos vértices
      const c = Color3.FromHexString(hex);
      const e: Plastico = {
        m,
        base: viva ? new Color3(c.r ** GAMA_VIVA, c.g ** GAMA_VIVA, c.b ** GAMA_VIVA) : c,
        brilho,
        viva,
        plugin,
        esperando: false,
      };
      mats.set(chave, e);
      m.needDepthPrePass = soFrente;
      aplicar(e);
      return m;
    },
    tinta(brilho = 0.28, alfa = 1) {
      return this.cor('#ffffff', brilho, alfa, true);
    },
    corVertice(brilho = 0.28) {
      if (classico) return null;
      const chave = `cv|${brilho}`;
      const ja = mats.get(chave);
      if (ja) return ja.m;
      const m = new StandardMaterial(`${prefixo}-plastico-cv`, scene);
      m.specularPower = POTENCIA_REFLEXO;
      m.ambientColor = Color3.Black();
      const e: Plastico = {
        m,
        base: Color3.White(),
        brilho,
        viva: false,
        plugin: new PluginPlastico(m, true),
        esperando: false,
      };
      mats.set(chave, e);
      m.needDepthPrePass = soFrente;
      aplicar(e);
      return m;
    },
    textura(tex, brilho = 0.28) {
      const chave = `tx|${tex.uniqueId}|${brilho}`;
      const ja = mats.get(chave);
      if (ja) return ja.m;
      const m = new StandardMaterial(`${prefixo}-plastico-tx`, scene);
      m.specularPower = classico ? 42 : POTENCIA_REFLEXO;
      m.ambientColor = classico ? Color3.White() : Color3.Black();
      m.diffuseTexture = tex;
      const e: Plastico = {
        m,
        base: Color3.White(),
        brilho,
        viva: true,
        plugin: classico ? null : new PluginPlastico(m),
        esperando: false,
        solto: true,
      };
      mats.set(chave, e);
      m.needDepthPrePass = soFrente;
      aplicar(e);
      return m;
    },
    definirLuz(f) {
      luz = f;
      for (const e of mats.values()) {
        if (e.plugin) e.plugin.luz = f;
        else aplicar(e);
      }
    },
    definirSoFrente(ligado) {
      if (ligado === soFrente) return;
      soFrente = ligado;
      // meio transparente: cada peça tem a sua visibilidade (o material não fica congelado)
      for (const e of mats.values()) {
        e.m.checkReadyOnlyOnce = false;
        e.m.needDepthPrePass = ligado;
        if (!ligado) congelarDepoisDeDesenhar(e);
      }
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
  caixaFeita(w, h, d, r, seg).applyToMesh(m);
  m.material = material;
  m.isPickable = false;
  return m;
}

/**
 * Desempenho (spec 017, moradores aparecendo no povoado): a esfera e as caixas são feitas uma
 * vez e copiadas
 * (cada peça recebe os próprios números; fundir as malhas muda os dados).
 */
let esferaFeita: VertexData | null = null;

function copiaDe(vd: VertexData, escala = 1): VertexData {
  const c = new VertexData();
  const pos = vd.positions!;
  if (escala === 1) c.positions = pos.slice();
  else {
    const p = new Float32Array(pos.length);
    for (let i = 0; i < pos.length; i++) p[i] = pos[i] * escala;
    c.positions = p;
  }
  c.normals = vd.normals!.slice();
  if (vd.uvs) c.uvs = vd.uvs.slice();
  c.indices = vd.indices!.slice();
  return c;
}

/** A caixa arredondada de cada medida, feita uma vez e copiada. */
const caixasFeitas = new Map<string, VertexData>();
export function caixaFeita(w: number, h: number, d: number, r: number, seg: number): VertexData {
  const chave = `${w}|${h}|${d}|${r}|${seg}`;
  let vd = caixasFeitas.get(chave);
  if (!vd) {
    vd = dadosCaixaArredondada(w, h, d, r, seg);
    if (caixasFeitas.size >= 800) caixasFeitas.clear();
    caixasFeitas.set(chave, vd);
  }
  return copiaDe(vd);
}

/** A mesma esfera do MeshBuilder (12 segmentos), feita uma vez e copiada no tamanho. */
export function dadosEsfera(raio: number, segmentos = 12): VertexData {
  if (segmentos === 12) {
    esferaFeita ??= CreateSphereVertexData({ diameter: 2, segments: 12 });
    return copiaDe(esferaFeita, raio);
  }
  let vd = esferasFeitas.get(segmentos);
  if (!vd)
    esferasFeitas.set(
      segmentos,
      (vd = CreateSphereVertexData({ diameter: 2, segments: segmentos })),
    );
  return copiaDe(vd, raio);
}
const esferasFeitas = new Map<number, VertexData>();
/**
 * Spec 026 (o público de 40 no show): os gomos da bolinha pelo tamanho dela, nos moradores. A
 * bolinha pequena (o brilho do olho, a boca, o botão do boné) não precisa de 784 triângulos:
 * de perto ela continua redonda (a luz é macia), e o boneco cai para menos da metade.
 */
/**
 * Spec 027 (T22): os gomos de cada bolinha de longe (o bicho e o morador a mais de 18 blocos da
 * câmera), pelo raio: de lá a bolinha tem uns poucos pixels e a silhueta é a mesma.
 */
export function segmentosDeLonge(raio: number): number {
  return raio < 0.06 ? 3 : raio < 0.15 ? 4 : raio < 0.3 ? 5 : 6;
}

export function segmentosDaBolinha(raio: number): number {
  return raio < 0.035
    ? 4
    : raio < 0.06
      ? 5
      : raio < 0.075
        ? 7
        : raio < 0.12
          ? 8
          : raio < 0.25
            ? 10
            : 12;
}

export function esfera(
  nome: string,
  scene: Scene,
  raio: number,
  material: StandardMaterial,
  escala: [number, number, number] = [1, 1, 1],
  /** Os gomos (sem nada, 12; spec 027, T22: menos nas peças pequenas e nos bichos de longe). */
  segmentos = 12,
): Mesh {
  const m = new Mesh(nome, scene);
  dadosEsfera(raio, segmentos).applyToMesh(m);
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
