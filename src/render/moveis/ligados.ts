/**
 * Spec 039b (T03): o que mexe nos móveis ligados, lendo o `moveisLigados` do núcleo (a lista que
 * a tela guarda em `estado.ligados`): a porta da geladeira abrindo, com a luz de dentro e a
 * comidinha; o anel laranja manso e o vapor de cubinhos do fogão cozinhando; os alto-falantes
 * pulando e as notinhas do som; e o desenho da TV. Mais o prato que aparece na mesa no evento
 * `prato`.
 *
 * Cada móvel ligado é uma malha só (as partes dele juntas, com as posições refeitas a cada quadro),
 * e a TV ligada é só o retângulo da tela: ligados os quatro, são 4 chamadas a mais. Desligado,
 * nada (o móvel parado está na malha do pedaço). Só as duas TVs e os dois sons mais perto da
 * criança animam; os outros ficam na imagem parada.
 */
import type { Scene } from '@babylonjs/core/scene';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer';
import { Matrix, Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import type { Material } from '@babylonjs/core/Materials/material';
import type { MovelLigado } from '../../nucleo/protocolo';
import { Bloco } from '../../world/blocks';
import type { Plasticos } from '../formas';
import { modeloNaMao, type ModeloItem } from '../itensBrinquedo';
import { TELA_TV, VAPORES, pratinho, type ModeloMovel } from './pecas';
import { pintarDesenho } from './desenhosTv';

/** O móvel inteiro na âncora: o bloco, o meio do pé (mundo) e o giro do desenho. */
export interface MovelNaTela {
  bloco: number;
  cx: number;
  cy: number;
  cz: number;
  giro: number;
}

export interface OpcoesLigados {
  /** O móvel cuja âncora é (x, y, z), ou null. */
  movel(x: number, y: number, z: number): MovelNaTela | null;
  /** O bloco do mundo (os assentos em volta da mesa). */
  bloco(x: number, y: number, z: number): number;
  modelo(bloco: number): ModeloMovel;
  material: Material;
  plasticos: Plasticos;
  /** O pedaço do móvel precisa ser refeito (as partes paradas entram ou saem do corpo). */
  refazer(x: number, y: number, z: number): void;
  aoCriar?(m: Mesh): void;
}

export interface Ligados {
  /** Uma vez por quadro: a lista do núcleo, o relógio dele, onde está a criança e o tempo. */
  quadro(lista: readonly MovelLigado[], relogio: number, px: number, pz: number, dt: number): void;
  /** O móvel da âncora está com as partes paradas fora do corpo (a porta, os cones)? */
  semPartes(x: number, y: number, z: number): boolean;
  /**
   * A comida posta na mesa da âncora: os pratinhos (até 4) com a comida, por uns segundos, na beira
   * da mesa na frente de quem come (`quem`: onde está cada um, no mundo; sem ela, na frente dos
   * assentos em volta).
   */
  prato(x: number, y: number, z: number, item: string, quantos: number, quem?: ReadonlyArray<{ x: number; z: number }>): void;
  /** O que está ligado agora (testes e fotos). */
  vistos(): Array<{ tipo: string; ancora: string; anima: boolean; k: number; programa?: number }>;
  /** Quantas malhas e triângulos (a medida). */
  contagem(): { malhas: number; triangulos: number };
  descartar(): void;
}

/** As partes de cada móvel que entram na malha do ligado. */
const PARTES: Record<string, readonly string[]> = {
  geladeira: ['porta', 'luzDentro', 'comidinha'],
  fogao: ['anel', ...Array.from({ length: VAPORES }, (_, i) => `vapor${i}`)],
  som: ['cone0', 'cone1', 'luzSom', 'nota0', 'nota1', 'nota2'],
  tv: [],
};
/** As partes que acendem e quanto (o anel um tico só: mais, o laranja virava amarelo-claro). */
const BRILHA = new Map([
  ['luzDentro', 2.1],
  ['anel', 1.3],
  ['luzSom', 1.8],
]);
/** As partes paradas que saem do corpo enquanto o móvel está ligado (elas mexem na malha dele). */
const SEM_PARTES = new Set(['geladeira', 'som']);
const BLOCO_DO_TIPO: Record<string, number> = { tv: Bloco.TV, som: Bloco.SOM, fogao: Bloco.FOGAO, geladeira: Bloco.GELADEIRA };
/** Só os mais perto animam (as TVs e os sons). */
const ANIMAM = 2;
const TELA_W = 128;
const TELA_H = 80;

interface Parte {
  nome: string;
  pivo: Vector3;
  de: number;
  n: number;
  pos: Float32Array;
  nor: Float32Array;
}
interface Ativo {
  tipo: MovelLigado['tipo'];
  chave: string;
  x: number;
  y: number;
  z: number;
  movel: MovelNaTela;
  no: TransformNode;
  /** Está na lista agora (a geladeira fecha devagar depois de sair dela). */
  ligado: boolean;
  /** Há quanto tempo saiu da lista (desliga só depois de um tico: um quadro sem ela não apaga). */
  fora: number;
  /** A porta (0 fechada, 1 aberta) e o aparecer das outras partes. */
  k: number;
  t: number;
  anima: boolean;
  malha: Mesh | null;
  partes: Parte[];
  pos: Float32Array;
  nor: Float32Array;
  tela: { malha: Mesh; tex: DynamicTexture; mat: StandardMaterial; programa: number; desde: number; ultimo: number } | null;
}

export function criarLigados(scene: Scene, op: OpcoesLigados): Ligados {
  const ativos = new Map<string, Ativo>();
  const pratos: Array<{ no: TransformNode; malhas: Mesh[]; itens: ModeloItem[]; vida: number }> = [];
  const m4 = new Matrix();
  const q = new Quaternion();
  const v = new Vector3();
  const um = new Vector3(1, 1, 1);
  const esc = new Vector3();
  const tra = new Vector3();

  function montarMalha(a: Ativo): void {
    const nomes = PARTES[a.tipo];
    if (!nomes.length) return;
    const modelo = op.modelo(a.movel.bloco);
    const partes: Parte[] = [];
    const pos: number[] = [];
    const nor: number[] = [];
    const cor: number[] = [];
    const idx: number[] = [];
    for (const nome of nomes) {
      const p = modelo.partes[nome];
      if (!p?.corpo) continue;
      const P = p.corpo.positions!;
      const N = p.corpo.normals!;
      const C = p.corpo.colors!;
      const I = p.corpo.indices!;
      const de = pos.length / 3;
      for (let i = 0; i < P.length; i++) {
        pos.push(P[i]);
        nor.push(N[i]);
      }
      // o que acende (a luz de dentro da geladeira, o anel do fogão, a luzinha do som) leva a cor
      // acima de 1: o plástico de noite escurece, e ela continua acesa (sem malha a mais)
      const k = BRILHA.get(nome) ?? 1;
      for (let i = 0; i < C.length; i++) cor.push(i % 4 === 3 ? C[i] : C[i] * k);
      for (let i = 0; i < I.length; i++) idx.push(I[i] + de);
      partes.push({
        nome,
        pivo: new Vector3(...p.pivo),
        de,
        n: P.length / 3,
        pos: Float32Array.from(P),
        nor: Float32Array.from(N),
      });
    }
    if (!partes.length) return;
    const vd = new VertexData();
    vd.positions = pos;
    vd.normals = nor;
    vd.colors = cor;
    vd.indices = idx;
    const m = new Mesh(`moveis-ligado-${a.tipo}-${a.chave}`, scene);
    vd.applyToMesh(m, true);
    m.material = op.material;
    m.isPickable = false;
    m.hasVertexAlpha = false;
    m.parent = a.no;
    m.alwaysSelectAsActiveMesh = true;
    op.aoCriar?.(m);
    a.malha = m;
    a.partes = partes;
    a.pos = new Float32Array(pos.length);
    a.nor = new Float32Array(nor.length);
  }

  function montarTela(a: Ativo, programa: number, desde: number): void {
    // (sem mipmaps, com a amostra bilinear: de longe a tela continua com o desenho; com a
    // trilinear sem mipmaps ela saía chapada)
    const tex = new DynamicTexture(`moveis-tv-${a.chave}`, { width: TELA_W, height: TELA_H }, scene, false, Texture.BILINEAR_SAMPLINGMODE);
    tex.wrapU = Texture.CLAMP_ADDRESSMODE;
    tex.wrapV = Texture.CLAMP_ADDRESSMODE;
    const mat = new StandardMaterial(`moveis-tv-mat-${a.chave}`, scene);
    mat.disableLighting = true;
    mat.emissiveTexture = tex;
    // (brilho contido: a tela acende sem estourar; a cor emissiva soma com a textura e lavava o
    // desenho de branco, por isso fica preta e a força vai no `level`)
    tex.level = 0.92;
    mat.emissiveColor = Color3.Black();
    mat.diffuseColor = Color3.Black();
    mat.specularColor = Color3.Black();
    mat.backFaceCulling = false;
    const malha = new Mesh(`moveis-tv-tela-${a.chave}`, scene);
    const vd = new VertexData();
    const w = TELA_TV.w / 2;
    const h = TELA_TV.h / 2;
    const [x, y, z] = TELA_TV.meio;
    vd.positions = [x - w, y - h, z, x + w, y - h, z, x + w, y + h, z, x - w, y + h, z];
    vd.normals = [0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1];
    // (a linha de cima do canvas em cima: com o v ao contrário, os desenhos ficavam de cabeça para
    // baixo)
    vd.uvs = [1, 1, 0, 1, 0, 0, 1, 0];
    vd.indices = [0, 2, 1, 0, 3, 2];
    vd.applyToMesh(malha);
    malha.material = mat;
    malha.isPickable = false;
    malha.parent = a.no;
    op.aoCriar?.(malha);
    a.tela = { malha, tex, mat, programa, desde, ultimo: -1 };
  }

  function pintarTela(a: Ativo): void {
    const tl = a.tela!;
    const g = tl.tex.getContext() as unknown as CanvasRenderingContext2D;
    pintarDesenho(g, TELA_W, TELA_H, tl.programa, a.t);
    tl.tex.update(false);
  }

  function criar(e: MovelLigado, relogio: number): Ativo | null {
    const movel = op.movel(e.x, e.y, e.z);
    if (!movel || movel.bloco !== BLOCO_DO_TIPO[e.tipo]) return null;
    const chave = `${e.x},${e.y},${e.z}`;
    const no = new TransformNode(`moveis-ligado-${chave}`, scene);
    no.position.set(movel.cx, movel.cy, movel.cz);
    no.rotation.y = movel.giro;
    const a: Ativo = {
      tipo: e.tipo,
      chave,
      x: e.x,
      y: e.y,
      z: e.z,
      movel,
      no,
      ligado: true,
      fora: 0,
      k: 0,
      t: 0,
      anima: true,
      malha: null,
      partes: [],
      pos: new Float32Array(0),
      nor: new Float32Array(0),
      tela: null,
    };
    montarMalha(a);
    // (entra na lista antes de refazer o pedaço: o pedaço refeito já sai sem a porta e os cones)
    ativos.set(chave, a);
    if (e.tipo === 'tv' || e.tipo === 'som') a.t = Math.max(0, relogio - e.desde);
    if (e.tipo === 'tv') {
      montarTela(a, e.programa, e.desde);
      pintarTela(a);
    }
    if (SEM_PARTES.has(e.tipo)) op.refazer(e.x, e.y, e.z);
    return a;
  }

  function soltar(a: Ativo): void {
    a.malha?.dispose();
    if (a.tela) {
      a.tela.malha.dispose();
      a.tela.mat.dispose();
      a.tela.tex.dispose();
    }
    a.no.dispose();
    ativos.delete(a.chave);
    if (SEM_PARTES.has(a.tipo)) op.refazer(a.x, a.y, a.z);
  }

  /** A pose de cada parte agora (a escala, o giro em y e o deslocamento a partir do pivô). */
  function pose(a: Ativo, nome: string, i: number): { s: number; sy?: number; giro: number; dx: number; dy: number; dz: number } {
    const t = a.t;
    const s = a.k * a.k * (3 - 2 * a.k);
    switch (a.tipo) {
      case 'geladeira':
        if (nome === 'porta') return { s: 1, giro: s * 1.9, dx: 0, dy: 0, dz: 0 };
        return { s: a.k > 0.05 ? 1 : 0, giro: 0, dx: 0, dy: 0, dz: 0 };
      case 'fogao': {
        if (nome === 'anel') return { s: s * (1 + 0.04 * Math.sin(t * 3)), sy: s, giro: 0, dx: 0, dy: 0, dz: 0 };
        // o vapor: cada cubinho sobe, balança e some, um depois do outro
        // (já sai da tampa do tamanho de ver, sobe e some lá em cima)
        const k = Number(nome.slice(-1));
        const u = (t * 0.4 + k / VAPORES) % 1;
        return {
          s: s * (u < 0.7 ? 0.8 + 0.2 * Math.sin(u * 4) : ((1 - u) / 0.3) * 0.8),
          giro: u * 1.2,
          dx: Math.sin(t * 2 + k * 1.7) * 0.05,
          dy: u * 0.6,
          dz: u * 0.12,
        };
      }
      case 'som': {
        // a batida mansa: os cones pulam juntos; a luzinha pisca; as notinhas sobem dançando
        const batida = Math.abs(Math.sin(t * 6.3));
        if (nome.startsWith('cone')) return { s: 1, sy: 1 + 0.1 * batida, giro: 0, dx: 0, dy: 0, dz: 0.02 * batida };
        if (nome === 'luzSom') return { s: (t * 2) % 1 < 0.6 ? 1 : 0.2, giro: 0, dx: 0, dy: 0, dz: 0 };
        // (a notinha `nota0` a `nota2`: cada uma na sua coluna, com a folga de uma nota entre elas,
        // subindo e balançando um tico; uma nunca atravessa a outra)
        const n = Number(nome.slice(-1));
        const u = (t * 0.38 + n / 3) % 1;
        return {
          s: s * Math.min(1, Math.sin(u * Math.PI) * 1.6),
          giro: Math.sin(t * 2 + n) * 0.12,
          dx: (n - 1) * 0.32 + Math.sin(u * 5 + n) * 0.025,
          dy: u * 0.45,
          dz: 0,
        };
      }
      default:
        return { s: 1, giro: 0, dx: 0, dy: 0, dz: 0 };
    }
  }

  function atualizarMalha(a: Ativo): void {
    if (!a.malha) return;
    let i = 0;
    for (const p of a.partes) {
      const ps = pose(a, p.nome, i++);
      esc.set(ps.s, ps.sy ?? ps.s, ps.s);
      if (ps.s <= 0.001) esc.setAll(0);
      Quaternion.RotationYawPitchRollToRef(ps.giro, 0, 0, q);
      tra.set(p.pivo.x + ps.dx, p.pivo.y + ps.dy, p.pivo.z + ps.dz);
      Matrix.ComposeToRef(esc.lengthSquared() > 0 ? esc : um.scale(0), q, tra, m4);
      for (let k = 0; k < p.n; k++) {
        Vector3.TransformCoordinatesFromFloatsToRef(p.pos[k * 3], p.pos[k * 3 + 1], p.pos[k * 3 + 2], m4, v);
        a.pos[(p.de + k) * 3] = v.x;
        a.pos[(p.de + k) * 3 + 1] = v.y;
        a.pos[(p.de + k) * 3 + 2] = v.z;
        Vector3.TransformNormalFromFloatsToRef(p.nor[k * 3], p.nor[k * 3 + 1], p.nor[k * 3 + 2], m4, v);
        const l = v.length() || 1;
        a.nor[(p.de + k) * 3] = v.x / l;
        a.nor[(p.de + k) * 3 + 1] = v.y / l;
        a.nor[(p.de + k) * 3 + 2] = v.z / l;
      }
    }
    a.malha.updateVerticesData(VertexBuffer.PositionKind, a.pos);
    a.malha.updateVerticesData(VertexBuffer.NormalKind, a.nor);
  }

  return {
    quadro(lista, relogio, px, pz, dt) {
      const agora = new Set<string>();
      for (const e of lista) {
        const chave = `${e.x},${e.y},${e.z}`;
        agora.add(chave);
        let a = ativos.get(chave);
        // outro móvel na mesma âncora (quebrou e puseram outro): começa de novo
        if (a && a.tipo !== e.tipo) {
          soltar(a);
          a = undefined;
        }
        if (!a) {
          const novo = criar(e, relogio);
          if (!novo) continue;
          a = novo;
        }
        a.ligado = true;
        a.fora = 0;
        // a TV trocou de desenho: começa o novo do começo
        if (e.tipo === 'tv' && a.tela && (a.tela.programa !== e.programa || a.tela.desde !== e.desde)) {
          a.tela.programa = e.programa;
          a.tela.desde = e.desde;
          a.t = Math.max(0, relogio - e.desde);
          a.tela.ultimo = -1;
        }
      }
      for (const a of ativos.values())
        if (!agora.has(a.chave)) {
          a.fora += dt;
          a.ligado = a.fora < 0.4;
        }
      // só as duas TVs e os dois sons mais perto animam
      for (const tipo of ['tv', 'som'] as const) {
        const deles = [...ativos.values()].filter((a) => a.tipo === tipo);
        deles.sort((a, b) => Math.hypot(a.movel.cx - px, a.movel.cz - pz) - Math.hypot(b.movel.cx - px, b.movel.cz - pz));
        deles.forEach((a, i) => (a.anima = i < ANIMAM));
      }
      for (const a of [...ativos.values()]) {
        // a geladeira abre em 0,4 s e fecha em 0,5 s; os outros aparecem em 0,3 s
        // (ligado, sobe até 1 e fica; desligado, desce até 0. Com "alvo > k", no 1 ele descia: o
        // fogão sumia de vez num quadro e voltava apagado)
        const vel = a.tipo === 'geladeira' ? (a.ligado ? dt / 0.4 : -dt / 0.5) : a.ligado ? dt / 0.3 : -dt / 0.2;
        a.k = Math.max(0, Math.min(1, a.k + vel));
        if (!a.ligado && a.k <= 0) {
          soltar(a);
          continue;
        }
        if (a.anima) a.t += dt;
        if (a.anima || a.tipo === 'geladeira') atualizarMalha(a);
        else if (a.k < 1) atualizarMalha(a);
        if (a.tela && a.anima) {
          // ~12 quadros por segundo; e acerta o passo com o relógio do núcleo se escorregou
          const certo = Math.max(0, relogio - a.tela.desde);
          if (Math.abs(certo - a.t) > 1) a.t = certo;
          const f = Math.floor(a.t * 12);
          if (f !== a.tela.ultimo) {
            a.tela.ultimo = f;
            pintarTela(a);
          }
        }
      }
      // os pratos: aparecem com um pulinho e somem sozinhos
      for (let i = pratos.length - 1; i >= 0; i--) {
        const p = pratos[i];
        p.vida -= dt;
        const s = Math.min(1, Math.min(p.vida, 8 - p.vida) / 0.3);
        p.no.scaling.setAll(Math.max(0.001, s));
        if (p.vida <= 0) {
          for (const m of p.malhas) m.dispose();
          for (const it of p.itens) {
            for (const m of it.malhas) m.dispose();
            it.no.dispose();
          }
          p.no.dispose();
          pratos.splice(i, 1);
        }
      }
    },
    semPartes(x, y, z) {
      const a = ativos.get(`${x},${y},${z}`);
      return !!a && SEM_PARTES.has(a.tipo);
    },
    prato(x, y, z, item, quantos, quem) {
      const movel = op.movel(x, y, z);
      if (!movel || movel.bloco !== Bloco.MESA) return;
      const no = new TransformNode(`moveis-prato-${x},${y},${z}`, scene);
      no.position.set(movel.cx, movel.cy, movel.cz);
      const topo = 0.792 * 1.12;
      const n = Math.max(1, Math.min(4, quantos));
      // o tampo no mundo (a mesa tem 2 de comprido no eixo para onde cresceu) e os assentos em volta
      // (a cadeira ou o sofá encostados, na ordem fixa do núcleo: x, depois z): cada pratinho vai na
      // beira da mesa na frente de um assento; sem assento (quem come em pé), os lugares de sempre
      const c = Math.cos(movel.giro);
      const s = Math.sin(movel.giro);
      const longoX = Math.abs(c) > 0.5;
      const mx = longoX ? 1 : 0.5;
      const mz = longoX ? 0.5 : 1;
      const assentos: Array<[number, number]> = [];
      for (let ax = Math.floor(movel.cx - mx) - 1; ax <= Math.floor(movel.cx + mx); ax++)
        for (let az = Math.floor(movel.cz - mz) - 1; az <= Math.floor(movel.cz + mz); az++) {
          const dx = ax + 0.5 - movel.cx;
          const dz = az + 0.5 - movel.cz;
          const dentro = Math.abs(dx) < mx && Math.abs(dz) < mz;
          const encosta = Math.abs(dx) < mx + 1 && Math.abs(dz) < mz + 1 && (Math.abs(dx) < mx || Math.abs(dz) < mz);
          const b = op.bloco(ax, movel.cy, az);
          if (!dentro && encosta && (b === Bloco.CADEIRA || b === Bloco.SOFA)) assentos.push([dx, dz]);
        }
      // (em cima da toalha, ao alcance das mãos de quem come: o meio do prato fica a 0,15 da beira
      // dela no lado de quem come, e na direção dele no comprido da mesa)
      const naBeira = ([dx, dz]: [number, number]): [number, number] => {
        const bx = longoX ? 0.32 : 0.35;
        const bz = longoX ? 0.35 : 0.32;
        return [Math.max(-mx + bx, Math.min(mx - bx, dx)), Math.max(-mz + bz, Math.min(mz - bz, dz))];
      };
      const deQuem: Array<[number, number]> = (quem ?? []).map((q) => [q.x - movel.cx, q.z - movel.cz]);
      const lugares: Array<[number, number]> = (deQuem.length ? deQuem : assentos).slice(0, n).map(naBeira);
      const padrao: Array<[number, number]> = [
        [-0.45, 0.2],
        [0.45, 0.2],
        [-0.45, -0.2],
        [0.45, -0.2],
      ];
      for (const [px, pz] of padrao) if (lugares.length < n) lugares.push([px * c + pz * s, -px * s + pz * c]);
      const vd = new VertexData();
      const base = pratinho();
      const juntos: VertexData[] = [];
      for (let i = 0; i < n; i++) {
        const c = new VertexData();
        c.positions = (base.positions as number[]).map((val, k) =>
          k % 3 === 0 ? val + lugares[i][0] : k % 3 === 1 ? val + topo : val + lugares[i][1] * (i < 2 ? 1 : 1),
        );
        c.normals = Array.from(base.normals!);
        c.colors = Array.from(base.colors!);
        c.indices = Array.from(base.indices!);
        juntos.push(c);
      }
      vd.positions = juntos[0].positions;
      vd.normals = juntos[0].normals;
      vd.colors = juntos[0].colors;
      vd.indices = juntos[0].indices;
      if (juntos.length > 1) vd.merge(juntos.slice(1), true);
      const m = new Mesh(`moveis-pratos-${x},${y},${z}`, scene);
      vd.applyToMesh(m);
      m.material = op.material;
      m.isPickable = false;
      m.parent = no;
      op.aoCriar?.(m);
      // a comida de verdade (o mesmo modelo da mão) em cada pratinho
      const itens: ModeloItem[] = [];
      for (let i = 0; i < n; i++) {
        const it = modeloNaMao(scene, op.plasticos, null, item, `moveis-prato-${x},${y},${z}-${i}`);
        if (!it) continue;
        it.no.parent = no;
        it.no.position.set(lugares[i][0], topo + 0.08, lugares[i][1]);
        // (maior: no tamanho da mão, a comida no prato era só uma bolinha marrom)
        it.no.scaling.setAll(1.3);
        for (const mm of it.malhas) {
          mm.isPickable = false;
          op.aoCriar?.(mm);
        }
        itens.push(it);
      }
      no.scaling.setAll(0.001);
      pratos.push({ no, malhas: [m], itens, vida: 8 });
    },
    vistos() {
      return [...ativos.values()].map((a) => ({
        tipo: a.tipo,
        ancora: a.chave,
        anima: a.anima,
        k: Math.round(a.k * 100) / 100,
        ...(a.tela ? { programa: a.tela.programa } : {}),
      }));
    },
    contagem() {
      let malhas = 0;
      let triangulos = 0;
      for (const a of ativos.values())
        for (const m of [a.malha, a.tela?.malha])
          if (m) {
            malhas++;
            triangulos += m.getTotalIndices() / 3;
          }
      return { malhas, triangulos };
    },
    descartar() {
      for (const a of [...ativos.values()]) soltar(a);
      for (const p of pratos) {
        for (const m of p.malhas) m.dispose();
        for (const it of p.itens) {
          for (const m of it.malhas) m.dispose();
          it.no.dispose();
        }
        p.no.dispose();
      }
      pratos.length = 0;
    },
  };
}
