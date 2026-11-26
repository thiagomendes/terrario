/**
 * O boneco de brinquedo em 3D (spec 012): monta as peças do plano (personagem/boneco.ts)
 * presas nas juntas, aplica a pose com os movimentos novos (peso, mola, golpe com preparo,
 * respiração, piscar, topete) e segura o item na mão direita pela ponta do cabo.
 * Mesmo contrato do personagem antigo (render/personagem.ts), para a cena, os amigos e o
 * editor não mudarem.
 */
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { Matrix, Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { CreateCylinderVertexData } from '@babylonjs/core/Meshes/Builders/cylinderBuilder';
import { CreateTorusVertexData } from '@babylonjs/core/Meshes/Builders/torusBuilder';
import type { Scene } from '@babylonjs/core/scene';
import type { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Skeleton } from '@babylonjs/core/Bones/skeleton';
import { Bone } from '@babylonjs/core/Bones/bone';
import type { Aparencia } from '../personagem/aparencia';
import {
  planoBoneco,
  rotacoesDaPose,
  type Junta,
  type Peca,
  type PlanoBoneco,
  type SubjuntaPremium,
  type TexturaPremium,
} from '../personagem/boneco';
import { ALTURA_PRANCHA } from '../personagem/bonecoFantasia';
import {
  GUIDAO,
  avancarAndar,
  bandeiraNoVento,
  boiarNuvem,
  corpoNoAssento,
  estadoAndar,
  ondeOsPes,
  poseNoBrinquedo,
} from '../personagem/brinquedoAndar';
import { SAIA_DA_ROUPA, medidaDaPerna, pernaNoPedal, type MedidaPerna } from '../personagem/joelho';

/**
 * Spec 038 (portão): a saia montada num brinquedo de pedal ou de apoio: inclinada para a frente
 * por cima das coxas (rad), mais curta e sem abrir.
 */
const SAIA_MONTADA = { giro: -0.55, altura: 0.7, largura: 0.96 };
import { luzPremium, texturaAquario } from './premiumLuzes';
import type { Pose } from '../personagem/poses';
import {
  caixaArredondada,
  cilindro,
  corViva,
  criarPlasticos,
  caixaFeita,
  dadosEsfera,
  segmentosDaBolinha,
  segmentosDeLonge,
  dadosAnel,
  dadosPlaca,
  dadosMalhaPano,
  esfera,
  pintarVertices,
  type Plasticos,
} from './formas';
import { docinhosNaSacola, modeloNaMao, type ModeloItem } from './itensBrinquedo';
import { PONTOS_LOJINHA } from '../personagem/bonecoPremiumLojinha';
import type { ExtrasPose, Personagem } from './personagem';

export const MAXIMO_MALHAS_BONECO = 90;

/** Uma peça em 3D a partir do plano. */
export function montarPeca(scene: Scene, mats: Plasticos, p: Peca, prefixo: string): Mesh {
  if (p.luz || p.textura || p.pintar) {
    // spec 023: os premium montam pelos dados (o degradê e o aquário vão nos vértices)
    const m = new Mesh(`${prefixo}-${p.nome}`, scene);
    dadosDaPeca(p, undefined, false).applyToMesh(m);
    m.material = materialDaPeca(scene, mats, p);
    m.isPickable = false;
    m.receiveShadows = false;
    return m;
  }
  // a tinta da fantasia vai nos vértices, num material só por brilho (spec 017)
  const mat = p.viva
    ? mats.tinta(p.brilho ?? 0.28, p.alfa ?? 1)
    : mats.cor(p.cor, p.brilho ?? 0.28, p.alfa ?? 1);
  const nome = `${prefixo}-${p.nome}`;
  let m: Mesh;
  if (p.forma === 'caixa')
    m = caixaArredondada(
      nome,
      scene,
      p.tamanho[0],
      p.tamanho[1],
      p.tamanho[2],
      p.raio ?? 0.05,
      mat,
      3,
    );
  else if (p.forma === 'esfera') {
    const r = Math.max(p.tamanho[0], p.tamanho[1], p.tamanho[2]);
    m = esfera(nome, scene, r, mat, [p.tamanho[0] / r, p.tamanho[1] / r, p.tamanho[2] / r], p.gomos);
  } else if (p.forma === 'cilindro')
    m = cilindro(nome, scene, p.tamanho[0], p.tamanho[1], p.tamanho[2], mat);
  else if (p.forma === 'placa') {
    m = new Mesh(nome, scene);
    dadosPlaca(p.perfil ?? [], p.tamanho[2]).applyToMesh(m);
    m.material = mat;
    m.isPickable = false;
  } else if (p.forma === 'malha') {
    m = new Mesh(nome, scene);
    dadosMalhaPano(p.malha?.pos ?? [], p.malha?.ind ?? [], p.malha?.avessoClaro).applyToMesh(m);
    m.material = mat;
    m.isPickable = false;
  } else if (p.tamanho[2] > 0) {
    // arco de anel (a tiara, spec 017)
    m = new Mesh(nome, scene);
    dadosAnel(p.tamanho[0], p.tamanho[1], p.tamanho[2]).applyToMesh(m);
    m.material = mat;
    m.isPickable = false;
  } else {
    m = MeshBuilder.CreateTorus(
      nome,
      { diameter: p.tamanho[0], thickness: p.tamanho[1], tessellation: 20 },
      scene,
    );
    m.material = mat;
    m.isPickable = false;
  }
  if (p.viva) pintarVertices(m, p.cor);
  m.position.set(p.pos[0], p.pos[1], p.pos[2]);
  if (p.rot) m.rotation.set(p.rot[0], p.rot[1], p.rot[2]);
  m.receiveShadows = false;
  return m;
}

/**
 * Os dados de uma peça já no lugar dela na junta (spec 017, desempenho): a mesma malha que
 * `montarPeca` faz, mas só na memória, sem mandar nada para a placa de vídeo. As peças da
 * mesma junta e do mesmo material são juntadas aqui e sobem uma vez só (o morador que aparece
 * no povoado não trava a tela). A conta da posição e das normais é a mesma do MergeMeshes.
 */
export function dadosDaPeca(
  p: Peca,
  deslocar?: [number, number, number],
  /** Spec 014 (T11): a cor da peça nos vértices, sem a gama da tinta (material `corVertice`). */
  corNoVertice = false,
  /** Spec 026: as bolinhas com os gomos pelo tamanho (os moradores com esqueleto). */
  leve = false,
  /**
   * Spec 027 (T22): o boneco de longe (o morador a mais de 18 blocos da câmera): menos gomos nas
   * bolinhas, quinas e cilindros. O desenho é o mesmo, peça por peça.
   */
  grosso = false,
): VertexData {
  let vd: VertexData;
  let escala: [number, number, number] = [1, 1, 1];
  if (p.forma === 'caixa')
    vd = caixaFeita(p.tamanho[0], p.tamanho[1], p.tamanho[2], p.raio ?? 0.05, grosso ? 2 : 3);
  else if (p.forma === 'esfera') {
    const r = Math.max(p.tamanho[0], p.tamanho[1], p.tamanho[2]);
    // (de longe, as gotas do pelo, que já são de poucos gomos, ficam com o mínimo)
    const gomosLonge = p.gomos ? 3 : segmentosDeLonge(r);
    vd = dadosEsfera(r, grosso ? gomosLonge : (p.gomos ?? (leve ? segmentosDaBolinha(r) : 12)));
    escala = [p.tamanho[0] / r, p.tamanho[1] / r, p.tamanho[2] / r];
  } else if (p.forma === 'cilindro')
    vd = CreateCylinderVertexData({
      height: p.tamanho[0],
      diameterBottom: p.tamanho[1] * 2,
      diameterTop: p.tamanho[2] * 2,
      tessellation: grosso ? Math.min(8, p.lados ?? 8) : (p.lados ?? 14),
    });
  else if (p.forma === 'placa') vd = dadosPlaca(p.perfil ?? [], p.tamanho[2]);
  else if (p.forma === 'malha') vd = dadosMalhaPano(p.malha?.pos ?? [], p.malha?.ind ?? [], p.malha?.avessoClaro);
  else if (p.tamanho[2] > 0) vd = dadosAnel(p.tamanho[0], p.tamanho[1], p.tamanho[2]);
  else
    vd = CreateTorusVertexData({
      diameter: p.tamanho[0],
      thickness: p.tamanho[1],
      // (spec 038: as rodas dos brinquedos de andar com menos gomos)
      tessellation: p.lados ?? 20,
    });
  if ((p.viva || corNoVertice) && !p.pintar) {
    const n = vd.positions!.length / 3;
    const [r, g, b] = corNoVertice ? Color3.FromHexString(p.cor).asArray() : corViva(p.cor);
    const cores = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) cores.set([r, g, b, 1], i * 4);
    vd.colors = cores;
  }
  const rot = p.rot ?? [0, 0, 0];
  const d = deslocar ?? [0, 0, 0];
  const m = Matrix.Compose(
    new Vector3(escala[0], escala[1], escala[2]),
    Quaternion.RotationYawPitchRoll(rot[1], rot[0], rot[2]),
    new Vector3(p.pos[0] + d[0], p.pos[1] + d[1], p.pos[2] + d[2]),
  );
  vd.transform(m);
  ajustarDadosPremium(vd, p);
  return vd;
}

/**
 * Spec 023: o que os premium pedem nos vértices, já no lugar da peça na junta: o degradê
 * (`pintar`, na tinta) e a coordenada da textura que se mexe (`textura`: o aquário).
 */
function ajustarDadosPremium(vd: VertexData, p: Peca): void {
  const pos = vd.positions!;
  const n = pos.length / 3;
  if (p.pintar) {
    const cores = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) {
      const [r, g, b] = corViva(p.pintar(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]));
      cores.set([r, g, b, 1], i * 4);
    }
    vd.colors = cores;
  }
  if (p.textura) mapearTextura(vd, p.textura);
}

/**
 * Spec 023: o caminho em volta de uma caixa (meia largura `a`, meia profundidade `b`) até o
 * ponto (x, z), olhando do eixo dela: 0 no meio da frente, crescendo para +x; uma volta
 * inteira mede 4a + 4b.
 */
export function contornoDaCaixa(x: number, z: number, a: number, b: number): number {
  const ax = Math.abs(x) / a;
  const az = Math.abs(z) / b;
  if (ax < 1e-6 && az < 1e-6) return 0;
  let s: number;
  if (az >= ax) s = z > 0 ? x / az : a + 2 * b + (a - x / az);
  else s = x > 0 ? a + (b - z / ax) : 3 * a + 2 * b + (z / ax + b);
  const volta = 4 * a + 4 * b;
  return ((s % volta) + volta) % volta;
}

/**
 * Spec 023: a coordenada da textura que se mexe (o aquário): a largura dá a volta na peça e a
 * altura sobe por ela. O triângulo que cruza a costura ganha cópias dos vértices do outro
 * lado (senão a textura inteira passaria espremida dentro dele).
 */
function mapearTextura(vd: VertexData, t: TexturaPremium): void {
  const pos = vd.positions!;
  const n = pos.length / 3;
  const volta = 4 * t.a + 4 * t.b;
  const vao = volta / t.volta;
  const uv: number[] = [];
  for (let i = 0; i < n; i++) {
    const s = contornoDaCaixa(pos[i * 3], pos[i * 3 + 2], t.a, t.b);
    const d = (((s - t.costura) % volta) + volta) % volta;
    uv.push(t.u0 + d / t.volta, (pos[i * 3 + 1] - t.y0) / t.altura);
  }
  const ind = vd.indices!;
  const novos = new Map<number, number>();
  const outros: Array<[string, number]> = [];
  const extra: Record<string, number[]> = {};
  for (const [nome, passo] of [
    ['positions', 3],
    ['normals', 3],
    ['colors', 4],
  ] as const) {
    const arr = vd[nome];
    if (arr) {
      outros.push([nome, passo]);
      extra[nome] = Array.from(arr);
    }
  }
  let total = n;
  for (let k = 0; k < ind.length; k += 3) {
    const tri = [ind[k], ind[k + 1], ind[k + 2]];
    const us = tri.map((i) => uv[i * 2]);
    const min = Math.min(...us);
    if (Math.max(...us) - min <= vao / 2) continue;
    tri.forEach((i, j) => {
      if (us[j] >= min + vao / 2) return;
      let novo = novos.get(i);
      if (novo === undefined) {
        novo = total++;
        novos.set(i, novo);
        uv.push(uv[i * 2] + vao, uv[i * 2 + 1]);
        for (const [nome, passo] of outros)
          for (let c = 0; c < passo; c++) extra[nome].push(extra[nome][i * passo + c]);
      }
      ind[k + j] = novo;
    });
  }
  if (total > n)
    for (const [nome] of outros) (vd as unknown as Record<string, unknown>)[nome] = extra[nome];
  vd.uvs = uv;
}

/**
 * Desempenho (spec 023, T15: 4 amigos de dragão, capa e tênis no celular): o brilho de cada
 * peça cai num de três degraus (fosco, acetinado e lustroso). Cada brilho diferente era um
 * material, e cada material uma malha a mais por junta (o dragão ia de 10 para 39 malhas); a
 * diferença de 0,4 para 0,45 não se vê, a de malhas, sim. Só nas tintas das fantasias e nos
 * premium (o boneco de sempre fica igual).
 */
export function degrauDoBrilho(b = 0.28): number {
  return b < 0.34 ? 0.28 : b < 0.64 ? 0.45 : 0.8;
}

/** O brilho do material: em degraus nas tintas das fantasias e nos premium; o resto, igual. */
const brilhoDaPeca = (p: Peca): number =>
  p.viva || p.premium ? degrauDoBrilho(p.brilho) : (p.brilho ?? 0.28);

/** Spec 023: o material da peça (luz própria, aquário, tinta ou cor). */
function materialDaPeca(scene: Scene, mats: Plasticos, p: Peca): StandardMaterial {
  if (p.luz) return luzPremium(scene, p.luz);
  if (p.textura) return mats.textura(texturaAquario(scene), p.brilho ?? 0.28);
  const b = brilhoDaPeca(p);
  return p.viva ? mats.tinta(b, p.alfa ?? 1) : mats.cor(p.cor, b, p.alfa ?? 1);
}

/** As espécies de dados de vértice da peça (só junta malhas com as mesmas). */
function tiposDaPeca(p: Peca, corNoVertice = false): string {
  // todas as formas têm posição, normal e uv; a tinta da fantasia tem cor
  return p.viva || corNoVertice ? 'cor' : '';
}

/** Spec 027 (T22): uma peça fundida e como ela foi montada (para refazer o boneco de longe). */
interface FontePeca {
  p: Peca;
  deslocar?: [number, number, number];
  cv: boolean;
}

/**
 * Spec 036 (portão): o quanto o cabo do guarda-chuva pode tombar para o lado da cabeça (seno):
 * no máximo uns 24 graus; nas cabeças de cabelo bem largo, um tico para fora.
 */
const INCLINA_MAX = 0.4;
const INCLINA_MIN = -0.07;
/** O cabo passa pela beira de fora do punho fechado, e não pelo meio dele. */
const DENTRO_DO_PUNHO = 0.03;
/** A folga entre o cabo e a cabeça: 3 cm, mais a grossura do cabo e o balanço dele. */
const FOLGA_GUARDA = 0.08;
/** A altura de cada fatia do perfil da cabeça. */
const PERFIL_FATIA = 0.04;

/**
 * Spec 036 (portão): a meia largura da cabeça com o cabelo (e o que vai nela) em cada altura, no
 * espaço da cabeça: [y de baixo da fatia, maior |x|]. Feita uma vez por desenho da cabeça (muda
 * quando o boneco é refeito), dos cantos das malhas dela.
 */
const perfisDaCabeca = new WeakMap<TransformNode, { chave: string; perfil: Array<[number, number]> }>();
function perfilDaCabeca(cabeca: TransformNode, paraCabeca: Matrix): Array<[number, number]> {
  const malhas = cabeca.getChildMeshes(false).filter((m) => m.isEnabled() && m.getTotalVertices() > 0);
  const chave = malhas.map((m) => `${m.uniqueId}:${m.getTotalVertices()}`).join(',');
  const ja = perfisDaCabeca.get(cabeca);
  if (ja && ja.chave === chave) return ja.perfil;
  const fatias = new Map<number, number>();
  const p = new Vector3();
  for (const m of malhas) {
    m.computeWorldMatrix(true);
    const mat = m.getWorldMatrix().multiply(paraCabeca);
    const pos = m.getVerticesData('position');
    if (!pos) continue;
    for (let i = 0; i < pos.length; i += 3) {
      Vector3.TransformCoordinatesFromFloatsToRef(pos[i], pos[i + 1], pos[i + 2], mat, p);
      const k = Math.floor(p.y / PERFIL_FATIA);
      fatias.set(k, Math.max(fatias.get(k) ?? 0, Math.abs(p.x)));
    }
  }
  const perfil = [...fatias].map(([k, w]): [number, number] => [k * PERFIL_FATIA, w]);
  perfisDaCabeca.set(cabeca, { chave, perfil });
  return perfil;
}

/** Spec 036 (T05): a passada 1 é andar (blocos por segundo; a física anda a 4,3). */
const VEL_ANDAR_BONECO = 4.3;

/**
 * Spec 036: o braço esquerdo segurando o tesouro da mão (x, y, z como no Babylon; z negativo
 * abre o braço esquerdo para fora). A varinha balança no alto, na frente; o guarda-chuva vai
 * de lado, com a mão ao lado da cabeça e um pouco acima do ombro (portão: com o braço para o
 * alto, a mão ficava atrás da cabeça e o cabo parecia espetado nela); a pipa vai no alto e para
 * fora, puxando a linha por fora do corpo e da cabeça.
 */
export function bracoDoTesouro(id: string, t: number): [number, number, number] | null {
  if (id === 'varinha-bolhas') return [-2.05 + Math.sin(t * 2.2) * 0.18, 0, -0.42 - Math.sin(t * 1.1) * 0.08];
  if (id === 'guarda-chuva-gotinhas') return [1.3, 0, -1.95];
  if (id === 'pipa-lacinhos') return [-2.3 + Math.sin(t * 1.7) * 0.06, 0, -0.85];
  return null;
}

function naVista(m: Mesh): void {
  m.alwaysSelectAsActiveMesh = true;
  m.doNotSyncBoundingInfo = true;
}

export function criarBoneco(
  scene: Scene,
  aparencia: Aparencia,
  prefixo = 'personagem',
  /** Ajusta o plano antes de montar (moradores: cores e peças do tema). */
  ajustarPlano?: (p: PlanoBoneco) => PlanoBoneco,
  /**
   * Desempenho (spec 013): funde as peças da mesma junta e do mesmo material numa malha só
   * (o desenho é o mesmo; olhos, brilho dos olhos e boca ficam soltos, porque piscam e
   * falam). Para os moradores, que não trocam de aparência.
   */
  fundir = false,
  /**
   * Desempenho (spec 015): o boneco do jogador está sempre na frente da câmera de terceira
   * pessoa; as peças não passam pelo teste de vista nem refazem a caixa envolvente a cada
   * quadro (não projetam sombra e não são clicáveis).
   */
  sempreNaVista = false,
  /**
   * Desempenho (spec 026, o público de 40 no show): as peças do mesmo material, de todas as
   * juntas, viram uma malha só com esqueleto (cada vértice preso à junta dele, como os bichos
   * da lojinha da 023): a placa de vídeo dobra a malha e o boneco sai em 2 ou 3 chamadas de
   * desenho em vez de ~14. O desenho é o mesmo, peça por peça (olhos, brilho e boca ganham um
   * nó próprio para piscar e falar). Só com `fundir`.
   */
  comEsqueleto = false,
): Personagem {
  const raiz = new TransformNode(prefixo, scene);
  const escalar = new TransformNode(`${prefixo}-escala`, scene);
  escalar.parent = raiz;
  const mats = criarPlasticos(scene, prefixo);
  let juntas = {} as Record<Junta, TransformNode>;
  /** Spec 026 (parte 3): de skate (o corpo sobe em cima da prancha e fica de pé nela). */
  let deSkate = !!aparencia.skate;
  /**
   * Spec 036 (T04): o brinquedo de andar vestido (o nó dele já está montado) e se a criança está
   * montada nele agora. Montar e descer só acendem o nó e trocam a pose (`definirMontado`).
   */
  let andarVestido: string | null = null;
  let montado = false;
  /**
   * Spec 038 (T02): a perna com joelho (só com brinquedo de pedal ou de apoio vestido), a altura
   * do quadril do plano (para sentar no assento) e o peso dos pés no pedal (0 a pé, 1 montada,
   * suave ao montar e ao descer).
   */
  let medidaPerna: MedidaPerna | null = null;
  /** Spec 038 (portão): a saia da roupa passou do tronco para a junta da saia. */
  let saiaDaRoupa = false;
  let quadrilDoPlano = 0.34;
  let pesoPes = 0;
  /** Spec 023: os nós próprios dos premium (as asas do dragão). */
  let subjuntas: Partial<Record<SubjuntaPremium, TransformNode>> = {};
  /** Spec 036: o giro de repouso de cada nó próprio (a animação soma em cima). */
  const repousoSub = new Map<SubjuntaPremium, Vector3>();
  /** Spec 036: o tesouro da mão esquerda (o braço segura em cima). */
  let maoPremium: string | undefined;
  /** Spec 036: as fases das peças que se mexem sozinhas. */
  const fase036 = { helice: 0, borboleta: 0, guarda: 0, passaro: 1.2, batendo: 0, t: 0, tomba: null as number | null };
  let malhas: Mesh[] = [];
  /** Spec 027 (T22): monta o boneco de longe (só com esqueleto; null sem ele). */
  let montarDeLonge: (() => Mesh[]) | null = null;
  /** O boneco de longe, quando já montado, e se é ele que aparece agora. */
  let malhasLonge: Mesh[] | null = null;
  let emLonge = false;
  /** Spec 026: o esqueleto do boneco fundido e os nós próprios (olhos, brilho, boca). */
  let esqueleto: Skeleton | null = null;
  let nosProprios: TransformNode[] = [];
  let visivel = true;
  let luz = 1;
  /** Meio transparente quando a câmera chega perto demais (spec 015); 1 = normal. */
  let opacidade = 1;
  /** Posição de repouso de cada junta (a pose soma em cima). */
  let repouso = {} as Record<Junta, [number, number, number]>;
  // a mão direita segura pela ponta do cabo: o nó "pega" fica no centro da mão
  const pega = new TransformNode(`${prefixo}-pega`, scene);
  // o item de brinquedo na mão, preso pelo ponto de pega (ponta do cabo nas ferramentas)
  let modelo: ModeloItem | null = null;
  let chaveMao = '';
  /** Spec 032: a mão segura outra coisa por um tempo (a comida mordida, o lanche da entrega). */
  let maoOcupada = false;
  /** Spec 032: a boca no espaço da cabeça (a frente do rosto é +z). */
  let bocaNaCabeca: [number, number, number] = [0, -0.18, 0.3];
  const naMao = {
    definir(bloco: number | null, item: string | null, qtd?: number) {
      // (spec 027: a sacola de doces mostra quantos docinhos restam; as outras não mudam com a pilha)
      const n = item === 'sacola_doces' ? docinhosNaSacola(qtd) : undefined;
      const chave = `${bloco ?? ''}|${item ?? ''}|${n ?? ''}`;
      if (chave === chaveMao) return;
      chaveMao = chave;
      if (modelo) {
        for (const m of modelo.malhas) m.dispose();
        modelo.no.dispose();
      }
      modelo = modeloNaMao(scene, mats, bloco, item, `${prefixo}-mao`, n);
      if (!modelo) return;
      modelo.no.parent = pega;
      for (const m of modelo.malhas) {
        m.visibility = opacidade;
        if (sempreNaVista) naVista(m);
      }
      // ferramenta: o cabo sai da mão para a frente com o braço abaixado; peças ficam
      // apoiadas na palma, um pouco à frente
      if (modelo.ferramenta) modelo.no.rotation.set(Math.PI / 2, 0, 0);
      else if (modelo.planta) {
        // a flor sai da mão para cima, do tamanho de uma flor de verdade na mão do boneco
        modelo.no.position.set(0, -0.02, 0.1);
        modelo.no.scaling.setAll(1.6);
      } else modelo.no.position.set(0, -0.05, 0.09);
      for (const m of modelo.malhas) m.setEnabled(visivel && !maoOcupada);
    },
    segurando: () => modelo !== null || maoOcupada,
    definirLuz(_f: number) {
      // os materiais são os mesmos do boneco (seguem a mesma luz)
    },
    definirVisivel(v: boolean) {
      if (modelo) for (const m of modelo.malhas) m.setEnabled(v && !maoOcupada);
    },
    ocupar(o: boolean) {
      maoOcupada = o;
      if (modelo) for (const m of modelo.malhas) m.setEnabled(visivel && !o);
    },
    descartar() {
      if (modelo) {
        for (const m of modelo.malhas) m.dispose();
        modelo.no.dispose();
      }
      modelo = null;
    },
  };

  function limpar(): void {
    pega.parent = null;
    for (const m of malhas) m.dispose();
    for (const m of malhasLonge ?? []) m.dispose();
    malhasLonge = null;
    montarDeLonge = null;
    emLonge = false;
    for (const n of nosProprios) n.dispose();
    nosProprios = [];
    esqueleto?.dispose();
    esqueleto = null;
    for (const j of Object.values(subjuntas)) j.dispose();
    for (const j of Object.values(juntas)) j.dispose();
    subjuntas = {};
    repousoSub.clear();
    malhas = [];
    juntas = {} as Record<Junta, TransformNode>;
  }

  function aplicarAparencia(a: Aparencia): void {
    limpar();
    deSkate = !!a.skate && !a.patins;
    maoPremium = a.premium?.mao;
    andarVestido = a.premium?.andar && !a.patins && !a.skate ? a.premium.andar : null;
    montado = !!a.montado && !!andarVestido;
    const plano = ajustarPlano ? ajustarPlano(planoBoneco(a)) : planoBoneco(a);
    escalar.scaling.setAll(plano.escala);
    // spec 032: onde fica a boca (na cabeça), para a comida parar na frente dela
    const b = plano.pecas.find((p) => p.nome === 'boca' && p.junta === 'cabeca');
    if (b) bocaNaCabeca = [b.pos[0], b.pos[1], b.pos[2]];
    for (const [nome, j] of Object.entries(plano.juntas) as Array<
      [Junta, (typeof plano.juntas)[Junta]]
    >) {
      const no = new TransformNode(`${prefixo}-junta-${nome}`, scene);
      no.position.set(j.pos[0], j.pos[1], j.pos[2]);
      juntas[nome] = no;
      repouso[nome] = [...j.pos];
    }
    for (const [nome, j] of Object.entries(plano.juntas) as Array<
      [Junta, (typeof plano.juntas)[Junta]]
    >)
      juntas[nome].parent = j.pai ? juntas[j.pai] : escalar;
    // fundir: as peças da mesma junta e do mesmo material são juntadas na memória e sobem
    // para a placa de vídeo uma vez só, numa malha (spec 013; spec 017 sem malhas de passagem)
    const paraFundir = new Map<
      string,
      {
        junta: Junta;
        material: StandardMaterial;
        dados: VertexData[];
        nome: string;
        pivo?: [number, number, number];
        n: number;
        /** Spec 023: o nó próprio (as asas), quando não é a junta. */
        no?: TransformNode;
        /** Spec 027 (T22): as peças do grupo, para o boneco de longe (com esqueleto). */
        fontes: FontePeca[];
      }
    >();
    const materialDe = (p: Peca) => materialDaPeca(scene, mats, p);
    /**
     * Spec 014 (T11, desempenho da cidade: 12 moradores à vista na praça): a peça opaca de cor
     * lisa vai com a cor nos vértices num material por brilho, desenhado igual ao da cor; as
     * peças da mesma junta viram uma malha só (de ~22 para ~9 malhas por morador).
     */
    const corVertice = (p: Peca) =>
      !p.viva && !p.luz && !p.textura && (p.alfa ?? 1) >= 1
        ? mats.corVertice(brilhoDaPeca(p))
        : null;
    // spec 023: os nós próprios dos premium (as asas), dentro da junta deles
    const noDaPeca = (p: Peca): TransformNode => {
      const sj = p.subjunta;
      if (!sj) return juntas[p.junta];
      let no = subjuntas[sj.nome];
      if (!no) {
        no = new TransformNode(`${prefixo}-junta-${sj.nome}`, scene);
        // spec 036: dentro de outro nó próprio (as asinhas no passarinho), com o giro de repouso
        no.parent = (sj.pai && subjuntas[sj.pai]) || juntas[p.junta];
        no.position.set(sj.pivo[0], sj.pivo[1], sj.pivo[2]);
        if (sj.rot) no.rotation.set(sj.rot[0], sj.rot[1], sj.rot[2]);
        repousoSub.set(sj.nome, no.rotation.clone());
        subjuntas[sj.nome] = no;
      }
      return no;
    };
    /** Spec 026: a boca do boneco com esqueleto (vai na malha fundida, num nó próprio). */
    const bocas: Peca[] = [];
    for (const p of plano.pecas) {
      // os dois olhos (e os dois brilhos) piscam juntos e ficam na mesma altura: viram uma
      // malha só, que pisca em volta do meio deles
      const par = /^(olho|brilho)-?\d/.exec(p.nome)?.[1];
      if (fundir && (par || !/^(olho|brilho|boca)/.test(p.nome))) {
        const cv = corVertice(p);
        const material = cv ?? materialDe(p);
        // a mão não gira sozinha: as peças dela vão para a junta do braço (menos malhas)
        let junta = p.junta;
        let deslocar: [number, number, number] | undefined;
        // (spec 036: a peça num nó próprio dentro da mão, como o guarda-chuva, fica no nó dela)
        if (!par && !p.subjunta && (junta === 'maoE' || junta === 'maoD')) {
          deslocar = plano.juntas[junta].pos;
          junta = junta === 'maoE' ? 'bracoE' : 'bracoD';
        }
        const sub = p.subjunta?.nome ?? '';
        const k = `${par ?? ''}|${junta}|${sub}|${material.uniqueId}|${tiposDaPeca(p, !!cv)}`;
        let g = paraFundir.get(k);
        if (!g)
          paraFundir.set(
            k,
            (g = par
              ? { junta, material, dados: [], nome: `${par}s`, pivo: [0, 0, 0], n: 0, fontes: [] }
              : {
                  junta,
                  material,
                  dados: [],
                  nome: sub || junta,
                  n: 0,
                  // a mão já foi para a junta do braço (deslocada): o nó próprio é só das asas
                  no: p.subjunta ? noDaPeca(p) : undefined,
                  fontes: [],
                }),
          );
        g.dados.push(dadosDaPeca(p, deslocar, !!cv, comEsqueleto));
        if (comEsqueleto) g.fontes.push({ p, deslocar, cv: !!cv });
        if (g.pivo) {
          g.pivo[0] += p.pos[0];
          g.pivo[1] += p.pos[1];
          g.pivo[2] += p.pos[2];
        }
        g.n++;
        continue;
      }
      if (comEsqueleto && fundir && p.nome === 'boca' && !p.subjunta) {
        bocas.push(p);
        continue;
      }
      const m = montarPeca(scene, mats, p, prefixo);
      m.parent = noDaPeca(p);
      m.setEnabled(visivel);
      m.visibility = opacidade;
      malhas.push(m);
    }
    const esq = comEsqueleto && fundir && Object.keys(subjuntas).length === 0;
    /** Os nós que piscam e falam (com esqueleto: nós próprios; sem ele: as malhas). */
    let olhosNos: TransformNode[] = [];
    let bocaNo: TransformNode | null = null;
    if (esq) {
      const r = montarComEsqueleto(paraFundir.values(), bocas);
      olhosNos = r.olhos;
      bocaNo = r.boca;
    } else
      for (const { junta, material, dados, nome, pivo, n, no } of paraFundir.values()) {
        const vd = dados.length === 1 ? dados[0] : dados[0].merge(dados.slice(1), true);
        const f = new Mesh(`${prefixo}-${nome}-fundida`, scene);
        vd.applyToMesh(f);
        // pisca em volta do meio dos olhos (não do meio da cabeça)
        if (pivo) f.setPivotPoint(new Vector3(pivo[0] / n, pivo[1] / n, pivo[2] / n));
        f.material = material;
        // a cor nos vértices é opaca (o alfa do vértice não vale nada)
        f.hasVertexAlpha = false;
        f.isPickable = false;
        f.receiveShadows = false;
        f.parent = no ?? juntas[junta];
        f.setEnabled(visivel);
        f.visibility = opacidade;
        malhas.push(f);
      }
    pega.parent = juntas.maoD;
    pega.position.set(0, 0, 0);
    if (sempreNaVista) for (const m of malhas) naVista(m);
    olhos = esq ? olhosNos : malhas.filter((m) => /-(olho|brilho)/.test(m.name));
    boca = esq ? bocaNo : (malhas.find((m) => m.name.endsWith('-boca')) ?? null);
    // a escala é a forma oval de cada peça: o piscar e a boca multiplicam sobre ela
    baseY.clear();
    for (const m of [...olhos, ...(boca ? [boca] : [])]) baseY.set(m, m.scaling.y);
    mats.definirLuz(luz);
    // spec 036 (T04): o brinquedo de andar só aparece com a criança montada
    subjuntas.brinquedo?.setEnabled(montado);
    // spec 038 (T02): a perna com joelho e o quadril do plano
    quadrilDoPlano = plano.juntas.pernaE.pos[1];
    medidaPerna = subjuntas.joelhoE && subjuntas.joelhoD ? medidaDaPerna(plano) : null;
    saiaDaRoupa = plano.pecas.some((p) => p.nome === SAIA_DA_ROUPA);
    pesoPes = montado && medidaPerna ? 1 : 0;
  }

  /** Spec 036 (T04): montar e descer sem refazer o boneco (só o nó do brinquedo e a pose). */
  function definirMontado(m: boolean): void {
    const agora = m && !!andarVestido;
    if (agora === montado) return;
    montado = agora;
    subjuntas.brinquedo?.setEnabled(montado);
  }
  let olhos: TransformNode[] = [];
  let boca: TransformNode | null = null;
  let faseAsa = 0;
  const baseY = new Map<TransformNode, number>();

  /**
   * Spec 026: monta as malhas fundidas por material com o esqueleto. Cada junta (e o nó dos
   * olhos, do brilho e da boca) vira um osso ligado ao nó dela: a pose gira os nós como sempre e
   * a placa de vídeo dobra a malha. Os vértices vão para o espaço do boneco no repouso (as juntas
   * do repouso só têm posição).
   */
  function montarComEsqueleto(
    grupos: Iterable<{
      junta: Junta;
      material: StandardMaterial;
      dados: VertexData[];
      nome: string;
      pivo?: [number, number, number];
      n: number;
      no?: TransformNode;
      fontes: FontePeca[];
    }>,
    bocas: Peca[],
  ): { olhos: TransformNode[]; boca: TransformNode | null } {
    const sk = new Skeleton(`${raiz.name}-esqueleto`, `${raiz.name}-esqueleto`, scene);
    esqueleto = sk;
    const ossos: Bone[] = [];
    const indice = new Map<TransformNode, number>();
    const osso = (no: TransformNode): number => {
      const ja = indice.get(no);
      if (ja !== undefined) return ja;
      const pai =
        no.parent instanceof TransformNode && no.parent !== escalar ? osso(no.parent) : -1;
      const b = new Bone(
        no.name,
        sk,
        pai >= 0 ? ossos[pai] : null,
        Matrix.Translation(no.position.x, no.position.y, no.position.z),
      );
      b.linkTransformNode(no);
      const i = ossos.length;
      ossos.push(b);
      indice.set(no, i);
      return i;
    };
    /** A posição do nó no repouso, no espaço do boneco (a soma das posições até a escala). */
    const absoluta = (no: TransformNode): [number, number, number] => {
      let x = 0;
      let y = 0;
      let z = 0;
      for (let q: unknown = no; q instanceof TransformNode && q !== escalar; q = q.parent) {
        x += q.position.x;
        y += q.position.y;
        z += q.position.z;
      }
      return [x, y, z];
    };
    const noProprio = (nome: string, pai: TransformNode, pos: [number, number, number]) => {
      const t = new TransformNode(`${prefixo}-${nome}`, scene);
      t.parent = pai;
      t.position.set(pos[0], pos[1], pos[2]);
      nosProprios.push(t);
      return t;
    };
    type PorMaterial = Map<string, { material: StandardMaterial; dados: VertexData[] }>;
    const porMaterial: PorMaterial = new Map();
    /** Onde cada grupo foi parar (o nó, o material e o desconto), para o boneco de longe. */
    const alvos: { no: TransformNode; material: StandardMaterial; fontes: FontePeca[]; menos?: number[] }[] = [];
    const juntar = (
      no: TransformNode,
      material: StandardMaterial,
      vds: VertexData[],
      menos?: number[],
      destino: PorMaterial = porMaterial,
    ) => {
      const i = osso(no);
      const [ax, ay, az] = absoluta(no);
      for (const vd of vds) {
        const P = vd.positions as number[] | Float32Array;
        const n = P.length / 3;
        for (let k = 0; k < n; k++) {
          P[k * 3] += ax - (menos?.[0] ?? 0);
          P[k * 3 + 1] += ay - (menos?.[1] ?? 0);
          P[k * 3 + 2] += az - (menos?.[2] ?? 0);
        }
        const idx = new Float32Array(n * 4);
        const pes = new Float32Array(n * 4);
        for (let k = 0; k < n; k++) {
          idx[k * 4] = i;
          pes[k * 4] = 1;
        }
        vd.matricesIndices = idx;
        vd.matricesWeights = pes;
        const chave = `${material.uniqueId}|${vd.colors ? 'cor' : ''}|${vd.uvs ? 'uv' : ''}`;
        let g = destino.get(chave);
        if (!g) destino.set(chave, (g = { material, dados: [] }));
        g.dados.push(vd);
      }
    };
    const olhosNos: TransformNode[] = [];
    for (const g of grupos) {
      const dono = g.no ?? juntas[g.junta];
      if (g.pivo) {
        // os olhos (ou o brilho) num nó no meio deles: pisca em volta dali
        const c: [number, number, number] = [g.pivo[0] / g.n, g.pivo[1] / g.n, g.pivo[2] / g.n];
        const t = noProprio(g.nome, dono, c);
        olhosNos.push(t);
        juntar(t, g.material, g.dados, c);
        alvos.push({ no: t, material: g.material, fontes: g.fontes, menos: c });
      } else {
        juntar(dono, g.material, g.dados);
        alvos.push({ no: dono, material: g.material, fontes: g.fontes });
      }
    }
    let bocaNo: TransformNode | null = null;
    for (const p of bocas) {
      const cv =
        !p.viva && !p.luz && !p.textura && (p.alfa ?? 1) >= 1
          ? mats.corVertice(brilhoDaPeca(p))
          : null;
      const material = cv ?? materialDaPeca(scene, mats, p);
      const t = noProprio('boca', juntas[p.junta], [p.pos[0], p.pos[1], p.pos[2]]);
      bocaNo = t;
      juntar(t, material, [dadosDaPeca(p, undefined, !!cv, true)], p.pos);
      alvos.push({ no: t, material, fontes: [{ p, cv: !!cv }], menos: p.pos });
    }
    const subir = (mapa: PorMaterial, nome: string, lista: Mesh[], ligada: boolean) => {
      for (const { material, dados } of mapa.values()) {
        const vd = dados.length === 1 ? dados[0] : dados[0].merge(dados.slice(1), true);
        const f = new Mesh(nome, scene);
        vd.applyToMesh(f);
        f.material = material;
        f.skeleton = sk;
        f.numBoneInfluencers = 1;
        f.hasVertexAlpha = false;
        f.isPickable = false;
        f.receiveShadows = false;
        f.parent = escalar;
        f.setEnabled(ligada);
        f.visibility = opacidade;
        if (sempreNaVista) naVista(f);
        lista.push(f);
      }
    };
    subir(porMaterial, `${prefixo}-fundida`, malhas, visivel);
    // spec 027 (T22): o boneco de longe, montado só na primeira vez que ele fica longe: as
    // mesmas peças com menos gomos, nos mesmos ossos (a pose, o piscar e a boca valem igual)
    montarDeLonge = () => {
      const mapa: PorMaterial = new Map();
      for (const a of alvos) {
        const fontes = a.fontes.filter((f) => !f.p.soPerto);
        if (!fontes.length) continue;
        juntar(
          a.no,
          a.material,
          fontes.map((f) => dadosDaPeca(f.p, f.deslocar, f.cv, true, true)),
          a.menos,
          mapa,
        );
      }
      const lista: Mesh[] = [];
      subir(mapa, `${prefixo}-fundida-longe`, lista, false);
      return lista;
    };
    return { olhos: olhosNos, boca: bocaNo };
  }

  /** Valores suavizados entre quadros (nada salta de uma pose para outra). */
  const atual = new Map<string, number>();
  const suave = (chave: string, alvo: number, k: number) => {
    const v = atual.get(chave) ?? alvo;
    const n = v + (alvo - v) * k;
    atual.set(chave, n);
    return n;
  };

  /** Sobe na hora até o alvo e desce suave (a capa levanta com a perna e cai devagar). */
  const subirJunto = (chave: string, alvo: number, k: number) => {
    const v = atual.get(chave) ?? alvo;
    const n = alvo >= v ? alvo : v + (alvo - v) * k;
    atual.set(chave, n);
    return n;
  };

  /**
   * Spec 036: as peças dos tesouros que se mexem sozinhas. A hélice gira devagar parada e rápido
   * correndo; as asas de borboleta batem (mais rápido correndo); o guarda-chuva fica centrado por
   * cima da cabeça, como quer que o braço esteja, girando devagar; a pipa balança no vento, com o
   * rabo atrasado; o passarinho voa pertinho do ombro, batendo as asinhas. Tudo por
   * senos e fases que andam com o tempo: mudar o ritmo não dá tranco, nada treme.
   */
  const mGuarda = new Matrix();
  const mMao = new Matrix();
  const mRaiz = new Matrix();
  const qAux = new Quaternion();
  /** Spec 036: a posição de repouso dos nós que boiam (o passarinho voando). */
  const posRepouso = new WeakMap<TransformNode, Vector3>();
  function animarTesouros(dt: number, vista?: ExtrasPose['vista']): void {
    const s = subjuntas;
    if (!s.helice && !s.borbE && !s.guarda && !s.pipa && !s.passaro) return;
    const corre = Math.min(1, (vista?.passada ?? 0) / 1.5);
    const anda = Math.min(1, vista?.passada ?? 0);
    const f = fase036;
    f.t += dt;
    const t = f.t;
    if (s.helice) {
      f.helice += dt * (4.5 + 11.5 * corre);
      s.helice.rotation.y = f.helice % (Math.PI * 2);
    }
    if (s.borbE && s.borbD) {
      f.borboleta += dt * (0.6 + 0.9 * corre) * Math.PI * 2;
      // abertas para os lados (aparecem dos dois lados da criança, de frente) e fechando devagar
      // para trás
      const a = 0.1 + 0.5 * (0.5 + 0.5 * Math.sin(f.borboleta));
      s.borbE.rotation.set(0, -a, -0.08);
      s.borbD.rotation.set(0, a, 0.08);
    }
    if (s.guarda && juntas.maoE && juntas.cabeca) {
      f.guarda += dt * (1.2 + 1.2 * anda);
      // o giro que o guarda-chuva quer no espaço do boneco, desfeito do giro da mão: o cabo sobe da
      // mão (ao lado da cabeça) quase em pé, um tico inclinado para o lado da cabeça, e gira devagar
      // em volta dele. Portão: inclinar o cabo até o pano ficar centrado na cabeça fazia o cabo
      // passar atrás dela e parecer espetado no alto do cabelo; agora o pano, maior, fica um pouco
      // para o lado da mão, como a criança segura de verdade
      for (const no of [juntas.maoE, juntas.cabeca]) {
        const cadeia: TransformNode[] = [];
        for (let n: TransformNode | null = no; n; n = n.parent as TransformNode | null) cadeia.unshift(n);
        for (const n of cadeia) n.computeWorldMatrix(true);
      }
      // (o "em pé" é o da cabeça: correndo, o corpo inclina e o cabo vai junto, sem chegar nela)
      const inv = juntas.cabeca.getWorldMatrix().clone().invert();
      const mao = Vector3.TransformCoordinates(juntas.maoE.getAbsolutePosition(), inv);
      const hh = Math.hypot(mao.x, mao.z) || 1;
      // portão (o orquestrador: o pano todo de lado parecia guarda-sol de praia): o cabo tomba
      // para dentro o quanto a cabeça deixa. A largura da cabeça com o cabelo em cada altura (o
      // perfil, no espaço da cabeça) diz até onde ele pode ir sem encostar nela, do punho até o
      // alto do cabelo; daí para cima segue reto, e o pano chega mais perto do meio da cabeça
      const perfil = perfilDaCabeca(juntas.cabeca, inv);
      const xCabo = hh + DENTRO_DO_PUNHO;
      let tomba = INCLINA_MAX;
      for (const [y, w] of perfil) {
        const dy = y + PERFIL_FATIA - mao.y;
        if (dy > 0.02) tomba = Math.min(tomba, (xCabo - w - FOLGA_GUARDA) / dy);
      }
      tomba = Math.max(INCLINA_MIN, tomba);
      f.tomba = f.tomba === null ? tomba : f.tomba + (tomba - f.tomba) * Math.min(1, dt * 5);
      const dx = (-mao.x / hh) * f.tomba + Math.sin(t * 1.3) * 0.012;
      const dz = (-mao.z / hh) * f.tomba + Math.sin(t * 0.9) * 0.012;
      const dir = new Vector3(dx, Math.sqrt(Math.max(0, 1 - dx * dx - dz * dz)), dz);
      const eixo = Vector3.Cross(Vector3.Up(), dir);
      const alinhar =
        eixo.length() > 1e-6 ? Matrix.RotationAxis(eixo.normalize(), Math.acos(Math.min(1, dir.y))) : Matrix.Identity();
      juntas.cabeca.getWorldMatrix().decompose(undefined, qAux);
      Matrix.FromQuaternionToRef(qAux, mRaiz);
      juntas.maoE.getWorldMatrix().decompose(undefined, qAux);
      Matrix.FromQuaternionToRef(qAux, mMao);
      mMao.invert();
      Matrix.RotationY(f.guarda % (Math.PI * 2))
        .multiply(alinhar)
        .multiply(mRaiz)
        .multiplyToRef(mMao, mGuarda);
      const q = s.guarda.rotationQuaternion ?? new Quaternion();
      mGuarda.decompose(undefined, q);
      s.guarda.rotationQuaternion = q;
      // o cabo passa pela beira de fora do punho fechado (o lado longe da cabeça), e não pelo meio
      const fora = Vector3.TransformNormal(
        new Vector3((mao.x / hh) * DENTRO_DO_PUNHO, 0, (mao.z / hh) * DENTRO_DO_PUNHO),
        juntas.cabeca.getWorldMatrix(),
      );
      s.guarda.position.copyFrom(Vector3.TransformNormal(fora, juntas.maoE.getWorldMatrix().clone().invert()));
    }
    if (s.pipa) {
      s.pipa.rotation.z = Math.sin(t * 1.3) * 0.12;
      s.pipa.rotation.x = Math.sin(t * 0.9) * 0.06 - corre * 0.12;
      if (s.rabopipa) {
        s.rabopipa.rotation.z = Math.sin(t * 1.3 - 0.8) * 0.3;
        // correndo, o rabo voa mais para trás
        s.rabopipa.rotation.x = Math.sin(t * 2.1) * 0.12 - 0.15 - corre * 0.35;
      }
    }
    if (s.passaro) {
      // T03 (decisão do dono): o passarinho voa pertinho do ombro, batendo as asinhas sem parar,
      // com um sobe e desce lento de voo; andando, inclina mais para a frente. Tudo por senos que
      // andam com o tempo (preso ao tronco: segue a criança sem procurar chão e sem tremer)
      // (as duas asinhas num nó só: batem pelo vaivém dele, abrindo para os lados e subindo, e
      // fechando para baixo; desempenho, uma malha a menos por boneco)
      const bate = Math.sin(t * 15);
      if (s.passaroAsaE) s.passaroAsaE.scaling.set(1 + bate * 0.28, 1 - bate * 0.4, 1);
      const r = repousoSub.get('passaro');
      let p0 = posRepouso.get(s.passaro);
      if (!p0) posRepouso.set(s.passaro, (p0 = s.passaro.position.clone()));
      s.passaro.position.set(p0.x + Math.sin(t * 1.1) * 0.015, p0.y + Math.sin(t * 2.3) * 0.035, p0.z + Math.sin(t * 0.8) * 0.015);
      if (r) s.passaro.rotation.set(r.x + 0.15 * anda + Math.sin(t * 2.3 + 1) * 0.06, r.y, r.z + Math.sin(t * 1.7) * 0.05);
    }
  }

  /**
   * Spec 036 (T05): os nós do brinquedo de andar que se mexem com o andar: as rodas e as rodinhas
   * giram pelo caminho andado, o pedal pela volta dele (as pernas, na pose, acompanham a mesma
   * volta) e a nuvem boia junto com a criança. O estado anda em `aplicarPose`, antes da pose.
   */
  const andar = estadoAndar();
  const mInv = new Matrix();
  /**
   * Spec 036 (T05, acerto do dono): os braços apontam do ombro para o ponto do guidão (o punho, o
   * lado do volante), no espaço do tronco deste quadro: a mão fecha nele, parada ou andando, no
   * impulso e no pedal. O braço gira em z e depois em x (o jeito do Babylon): a direção
   * (sen z, −cos z·cos x, −cos z·sen x) leva o braço, que pende para baixo, até o ponto.
   */
  function maosNoGuidao(id: string, w: number): void {
    const g = GUIDAO[id as keyof typeof GUIDAO];
    if (!g || w <= 0 || !juntas.prancha || !juntas.tronco) return;
    for (const n of [raiz, escalar, juntas.corpo, juntas.tronco, juntas.prancha]) n.computeWorldMatrix(true);
    juntas.tronco.getWorldMatrix().invertToRef(mInv);
    for (const [lado, braco] of [
      ['E', juntas.bracoE],
      ['D', juntas.bracoD],
    ] as const) {
      const alvo = Vector3.TransformCoordinates(
        Vector3.TransformCoordinates(new Vector3(...g[lado]), juntas.prancha.getWorldMatrix()),
        mInv,
      ).subtractInPlace(braco.position);
      const d = alvo.normalize();
      const rz = Math.asin(Math.max(-1, Math.min(1, d.x)));
      const rx = Math.atan2(-d.z, -d.y);
      braco.rotation.x += (rx - braco.rotation.x) * w;
      braco.rotation.z += (rz - braco.rotation.z) * w;
      braco.rotation.y *= 1 - w;
    }
  }
  /**
   * Spec 038 (T02): montada num brinquedo de pedal ou de apoio, a perna e o joelho saem da conta
   * (`pernaNoPedal`) a cada quadro, com o quadril de verdade deste quadro (depois de o corpo ser
   * suavizado): a sola pisa no alto do pedal em toda a volta. A conta não passa pelo `suave`; ao
   * montar e ao descer, o peso leva da pose a pé para a conta, sem salto. A pé, o joelho e o
   * giro para o lado ficam em 0.
   */
  const mCorpoInv = new Matrix();
  const vAlvo = new Vector3();
  function pesNoPedal(k: number): void {
    const j = juntas;
    const med = medidaPerna;
    const alvos = med && andarVestido ? ondeOsPes(andarVestido, andar) : null;
    if (!med || !alvos || !j.prancha) return;
    pesoPes += ((montado ? 1 : 0) - pesoPes) * k;
    if (!montado && pesoPes < 0.002) pesoPes = 0;
    const w = pesoPes;
    const jE = subjuntas.joelhoE;
    const jD = subjuntas.joelhoD;
    if (w <= 0) {
      if (jE) jE.rotation.x = 0;
      if (jD) jD.rotation.x = 0;
      j.pernaE.rotation.z = 0;
      j.pernaD.rotation.z = 0;
      return;
    }
    for (const n of [raiz, escalar, j.corpo, j.prancha]) n.computeWorldMatrix(true);
    j.corpo.getWorldMatrix().invertToRef(mCorpoInv);
    for (const [lado, perna, joelho] of [
      ['E', j.pernaE, jE],
      ['D', j.pernaD, jD],
    ] as const) {
      const p = alvos[lado];
      vAlvo.set(p[0], p[1], p[2]);
      Vector3.TransformCoordinatesToRef(vAlvo, j.prancha.getWorldMatrix(), vAlvo);
      Vector3.TransformCoordinatesToRef(vAlvo, mCorpoInv, vAlvo);
      const r = pernaNoPedal([vAlvo.x - perna.position.x, vAlvo.y - perna.position.y, vAlvo.z - perna.position.z], med);
      perna.rotation.x += (r.x - perna.rotation.x) * w;
      perna.rotation.y *= 1 - w;
      perna.rotation.z = r.z * w;
      if (joelho) joelho.rotation.x = r.joelho * w;
    }
  }

  /**
   * Spec 038 (portão visual): com brinquedo de pedal ou de apoio vestido, a saia e o vestido.
   * - A saia da roupa passou do tronco para a junta da saia (`dividirPernas`): a pé, ela segue o
   *   tronco como antes (o mesmo giro, sem abrir).
   * - Montada, a saia (a da roupa e a das fantasias) inclina para a frente por cima das coxas
   *   dobradas e encurta, sem abrir: as coxas não furam o pano, e o vestido não fica aberto como
   *   um abajur por cima do selim nem passa pela roda de trás.
   */
  function ajustarSaia(): void {
    const j = juntas;
    if (!medidaPerna || !j.saia) return;
    if (saiaDaRoupa) {
      j.saia.rotation.set(j.tronco.rotation.x, j.tronco.rotation.y, j.tronco.rotation.z);
      j.saia.scaling.setAll(1);
    }
    const w = pesoPes;
    if (w <= 0) return;
    const mistura = (a: number, b: number) => a + (b - a) * w;
    j.saia.rotation.x = mistura(j.saia.rotation.x, SAIA_MONTADA.giro);
    j.saia.rotation.y = mistura(j.saia.rotation.y, 0);
    j.saia.rotation.z = mistura(j.saia.rotation.z, 0);
    j.saia.scaling.set(
      mistura(j.saia.scaling.x, SAIA_MONTADA.largura),
      mistura(j.saia.scaling.y, SAIA_MONTADA.altura),
      mistura(j.saia.scaling.z, SAIA_MONTADA.largura),
    );
  }

  function animarBrinquedo(): void {
    const s = subjuntas;
    // spec 038 (T02): a bandeirinha tremula em volta do mastro com o vento do andar
    if (s.andarBandeira) s.andarBandeira.rotation.y = bandeiraNoVento(andar);
    for (const r of [s.andarRodaF, s.andarRodaT]) if (r) r.rotation.x = andar.roda;
    // (as rodinhas de apoio são menores: giram mais depressa no mesmo chão)
    if (s.andarRodinhaE) s.andarRodinhaE.rotation.x = (andar.roda * 2.5) % (Math.PI * 2);
    if (s.andarPedal) s.andarPedal.rotation.x = andar.pedal;
    // a nuvem boia inteira (o nó do brinquedo), junto com o corpo da criança
    if (andarVestido === 'nuvem-fofa' && s.brinquedo) {
      s.brinquedo.position.y = boiarNuvem(andar);
      s.brinquedo.rotation.z = Math.sin(andar.t * 1.1) * 0.03;
    }
  }

  function aplicarPose(pose: Pose, extras?: ExtrasPose): void {
    if (!juntas.corpo) return;
    const dt = extras ? Math.min(Math.max(extras.dt, 0), 0.1) : 1;
    const k = extras ? 1 - Math.exp(-dt * 16) : 1;
    const kLento = extras ? 1 - Math.exp(-dt * 6) : 1;
    // para onde cada junta vai nesta pose (a mesma conta do teste de encaixe)
    const alvo = rotacoesDaPose(pose, extras ? extras.olhar : 0, naMao.segurando());
    // spec 026 (parte 3): de skate, o corpo fica de pé em cima da prancha, as pernas firmes e um
    // pouco abertas (nada de passada: quem anda é o skate) e os braços um tico para fora. Sentado
    // (o gesto, um brinquedo do parque), a pose é a de sentar
    if (deSkate && Math.min(alvo.pernaD[0], alvo.pernaE[0]) > -0.9) {
      alvo.corpoY += ALTURA_PRANCHA;
      alvo.pernaD = [0.05, 0, 0];
      alvo.pernaE = [-0.05, 0, 0];
      if ((pose.pesoGesto ?? 0) < 0.3) {
        alvo.bracoD = [alvo.bracoD[0] * 0.3 - 0.1, alvo.bracoD[1], alvo.bracoD[2] + 0.28];
        alvo.bracoE = [alvo.bracoE[0] * 0.3 - 0.1, alvo.bracoE[1], alvo.bracoE[2] - 0.28];
      }
    }
    // spec 036: montada no brinquedo de andar, a altura dele, as mãos no guidão, o impulso do
    // patinete e o pedal (T05: o andar anda antes, pela passada: 1 andando, 1,5 correndo)
    if (montado && andarVestido) {
      if (extras) avancarAndar(andar, andarVestido, dt, (extras.vista?.passada ?? 0) * VEL_ANDAR_BONECO);
      poseNoBrinquedo(andarVestido, alvo, pose, andar);
      // spec 038 (T02): sentada de verdade no assento, pela perna deste modelo
      const sentar = corpoNoAssento(andarVestido, quadrilDoPlano);
      if (sentar !== null) alvo.corpoY = sentar;
    }
    // spec 036: o tesouro da mão esquerda (a varinha, o guarda-chuva, a pipa): o braço segura no
    // alto, menos durante um gesto (o gesto manda no braço)
    const segura = maoPremium ? bracoDoTesouro(maoPremium, pose.tempo ?? 0) : null;
    if (segura) {
      const w = 1 - Math.min(1, Math.max(0, pose.pesoGesto ?? 0));
      alvo.bracoE = [
        alvo.bracoE[0] + (segura[0] - alvo.bracoE[0]) * w,
        alvo.bracoE[1] + (segura[1] - alvo.bracoE[1]) * w,
        alvo.bracoE[2] + (segura[2] - alvo.bracoE[2]) * w,
      ];
    }
    const j = juntas;
    j.corpo.position.y = suave('corpoY', alvo.corpoY, k);
    // movimento com vida: o corpo inteiro inclina para a frente e para dentro da curva
    // (os valores já chegam suavizados do corpo vivo; os gestos também usam)
    j.corpo.rotation.x = suave('corpoX', alvo.corpo[0], k);
    j.corpo.rotation.z = suave('corpoZ', alvo.corpo[2], k);
    const esc = suave('escala', alvo.escala, k);
    j.corpo.scaling.set(1 / Math.sqrt(esc), esc, 1 / Math.sqrt(esc));
    j.tronco.rotation.x = suave('troncoX', alvo.tronco[0], kLento);
    j.tronco.rotation.y = suave('troncoY', alvo.tronco[1], k);
    j.tronco.rotation.z = suave('troncoZ', alvo.tronco[2], k);
    j.pernaD.rotation.x = suave('pernaD', alvo.pernaD[0], k);
    j.pernaE.rotation.x = suave('pernaE', alvo.pernaE[0], k);
    j.bracoD.rotation.x = suave('bracoD', alvo.bracoD[0], k);
    j.bracoE.rotation.x = suave('bracoE', alvo.bracoE[0], k);
    j.bracoD.rotation.z = suave('bracoDZ', alvo.bracoD[2], k);
    j.bracoE.rotation.z = suave('bracoEZ', alvo.bracoE[2], k);
    j.bracoD.rotation.y = suave('bracoDY', alvo.bracoD[1], k);
    j.bracoE.rotation.y = suave('bracoEY', alvo.bracoE[1], k);
    // spec 036 (T05, acerto do dono): montada, as mãos fecham no guidão e no volante de verdade,
    // como quer que o tronco esteja (fora de um gesto, que manda nos braços)
    if (montado && andarVestido) maosNoGuidao(andarVestido, 1 - Math.min(1, Math.max(0, (pose.pesoGesto ?? 0) / 0.3)));
    // spec 038 (T02): os pés no pedal (ou no apoio), depois da suavização, a cada quadro
    pesNoPedal(k);
    j.cabeca.rotation.x = suave('cabecaX', alvo.cabeca[0], k);
    j.cabeca.rotation.y = suave('cabecaY', alvo.cabeca[1], k);
    j.cabeca.rotation.z = suave('cabecaZ', alvo.cabeca[2], k);
    j.topete.rotation.x = suave('topete', alvo.topete[0], kLento);
    // spec 017: capa, saia e rabo sobem junto com o movimento (nunca ficam para trás das
    // pernas e dos braços) e descem devagar, como pano
    j.capa.rotation.x = subirJunto('capaX', alvo.capa[0], kLento);
    j.capa.rotation.z = suave('capaZ', alvo.capa[2], kLento);
    j.saia.rotation.x = suave('saiaX', alvo.saia[0], k);
    j.saia.rotation.z = suave('saiaZ', alvo.saia[2], kLento);
    const abre = subirJunto('saiaAbre', alvo.saiaEscala[0], kLento);
    j.saia.scaling.set(abre, suave('saiaY', alvo.saiaEscala[1], k), abre);
    // spec 038 (portão): com brinquedo de pedal ou de apoio vestido, a saia e o vestido
    ajustarSaia();
    j.rabo.rotation.x = subirJunto('raboX', alvo.rabo[0], kLento);
    j.rabo.rotation.y = suave('raboY', alvo.rabo[1], k);
    // spec 023: as asas do dragão batem: devagar parado (mas sempre se vê), rápido correndo e
    // forte no ar; a fase anda com o tempo (mudar o ritmo não dá tranco)
    if (subjuntas.asaE || subjuntas.asaD) {
      const v = extras?.vista;
      const forte = Math.max(v?.noAr ?? 0, Math.min(1, (v?.passada ?? 0) / 1.5));
      faseAsa += dt * (1.15 + forte * 2.9) * Math.PI * 2;
      const amp = 0.34 + forte * 0.5;
      // parado, a batida sobe menos do que desce: de frente, as pontas não espetam acima do
      // capuz (o vaivém continua bem maior que 15°)
      const sobe = 0.55 + forte * 0.45;
      const bate = Math.sin(faseAsa);
      for (const [no, s] of [
        [subjuntas.asaE, -1],
        [subjuntas.asaD, 1],
      ] as const) {
        if (!no) continue;
        no.rotation.y = s * (0.42 + Math.sin(faseAsa + 0.9) * amp * 0.45);
        no.rotation.z = s * (-0.06 + forte * 0.2 + (bate > 0 ? bate * sobe : bate) * amp);
        no.rotation.x = -0.12;
      }
    }
    animarTesouros(dt, extras?.vista);
    if (montado) animarBrinquedo();
    // spec 032: a carinha feliz depois de comer (os olhos fecham sorrindo)
    const pisca = pose.piscar ? 0.1 : 1 - (pose.feliz ?? 0) * 0.78;
    for (const o of olhos) o.scaling.y = (baseY.get(o) ?? 1) * pisca;
    if (boca) boca.scaling.y = (baseY.get(boca) ?? 1) * (1 + (pose.boca ?? 0) * 1.1);
  }

  aplicarAparencia(aparencia);

  return {
    raiz,
    aplicarAparencia,
    definirMontado,
    montado: () => montado,
    aplicarPose,
    posicionar(x, y, z, yaw) {
      raiz.position.set(x, y, z);
      raiz.rotation.y = yaw;
    },
    definirLuz(f) {
      // os amigos e moradores recebem a luz a cada quadro: só repinta quando ela muda
      if (Math.abs(f - luz) < 0.002) return;
      luz = f;
      mats.definirLuz(f);
      naMao.definirLuz(f);
    },
    definirNaMao(bloco, item, qtd) {
      naMao.definir(bloco, item, qtd);
    },
    noDaMao: () => pega,
    boca: () => ({ no: juntas.cabeca, pos: bocaNaCabeca }),
    ocuparMao: (o) => naMao.ocupar(o),
    plasticos: () => mats,
    definirVisivel(v) {
      visivel = v;
      for (const m of malhas) m.setEnabled(v && !emLonge);
      for (const m of malhasLonge ?? []) m.setEnabled(v && emLonge);
      naMao.definirVisivel(v);
    },
    definirLonge(sim) {
      if (sim && !malhasLonge) {
        if (!montarDeLonge) return false;
        malhasLonge = montarDeLonge();
      }
      if (sim === emLonge) return true;
      emLonge = sim;
      for (const m of malhas) m.setEnabled(visivel && !emLonge);
      for (const m of malhasLonge ?? []) m.setEnabled(visivel && emLonge);
      return true;
    },
    deLonge: () => emLonge,
    definirOpacidade(a) {
      const n = Math.min(1, Math.max(0, a));
      if (n === opacidade) return;
      opacidade = n;
      mats.definirSoFrente(n < 1);
      for (const m of [...malhas, ...(malhasLonge ?? [])]) {
        m.visibility = n;
        // meio transparente, a ordem de desenho das peças usa a caixa de cada uma
        if (sempreNaVista) m.doNotSyncBoundingInfo = n >= 1;
      }
      if (modelo) for (const m of modelo.malhas) m.visibility = n;
    },
    opacidade: () => opacidade,
    contarMalhas: () => malhas.length,
    contarMalhasMao: () => (modelo ? modelo.malhas.length : 0),
    descartar() {
      limpar();
      naMao.descartar();
      pega.dispose();
      mats.descartar();
      escalar.dispose();
      raiz.dispose();
    },
  };
}
