/**
 * Spec 023 (T10 a T13): o que os premium fazem no mundo, uma vez por cena para todos os
 * bonecos (o da criança e os dos amigos, cada aparelho desenha igual):
 *
 * - **Brilhos:** um pool só de estrelinhas e coraçõezinhos (no máximo 80, duas malhas com
 *   instâncias finas: duas chamadas de desenho para todos), virados para a câmera.
 * - **Pegadas de luz** do tênis-cometa (instâncias finas, uma chamada), que somem devagar, e as
 *   estrelinhas a cada passo; o anel de estrelinhas ao cair de um pulo.
 * - **Rastro da capa de estrelas** correndo; brilho das asas do dragão no ar.
 * - **Os bichinhos** (unicórnio e pinguim): seguem, pulam junto, fazem graça e reagem à
 *   criança. Longe da câmera, a versão simples (só segue, sem os detalhes nem brilhos).
 *
 * O movimento sai da posição do boneco quadro a quadro (o mesmo para o jogador e os amigos).
 */
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Matrix, Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { Constants } from '@babylonjs/core/Engines/constants';
import '@babylonjs/core/Meshes/thinInstanceMesh';
import type { Scene } from '@babylonjs/core/scene';
import type { PremiumVestido } from '../personagem/aparencia';
import { ehSolido } from '../jogo/caminho';
import { ARCO_PREMIUM } from './premiumLuzes';
import { montarBichoPremium, type BichoMontado, type IdBichoPremium } from './bichoPremium';

/** Teto do pool de brilhos (spec: no máximo 80 sprites). */
export const MAXIMO_BRILHOS = 80;
const MAX_CORACOES = 16;
const MAX_ESTRELAS = MAXIMO_BRILHOS - MAX_CORACOES;
const MAX_PEGADAS = 16;
/** Passo do tênis (blocos andados entre uma pegada e outra). */
const PASSO_PEGADA = 0.62;
/** Longe assim da câmera, o bicho fica na versão simples. */
const LONGE_SIMPLES = 26;
/**
 * Desempenho (T15: 4 amigos de premium no celular): a partir daqui, os amigos ficam sem as
 * luzinhas miúdas (a faixa do tênis, os frisos de ouro e pérola, as estrelas da capa), que de
 * longe são poucos pixels e custam uma chamada de desenho cada. Volta um pouco mais perto (sem
 * piscar na divisa). O contorno do unicórnio vai até mais longe (ele se reconhece a 12 blocos).
 */
const LONGE_DETALHE = 11;
const PERTO_DETALHE = 9.5;
const LONGE_CONTORNO = 20;

type LerBloco = (x: number, y: number, z: number) => number | undefined;

// ------------------------------------------------------------------ texturas (canvas)
function textura(scene: Scene, nome: string, desenhar: (c: CanvasRenderingContext2D, t: number) => void) {
  const t = new DynamicTexture(nome, { width: 128, height: 128 }, scene, true);
  const c = t.getContext() as unknown as CanvasRenderingContext2D;
  c.clearRect(0, 0, 128, 128);
  desenhar(c, 128);
  t.hasAlpha = true;
  t.update();
  return t;
}

/** Estrelinha de quatro pontas com o halo (a cintilada). */
function estrelaQuatro(c: CanvasRenderingContext2D, t: number): void {
  const m = t / 2;
  const g = c.createRadialGradient(m, m, 0, m, m, m);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.2, 'rgba(255,255,255,0.85)');
  g.addColorStop(0.45, 'rgba(255,255,255,0.16)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = g;
  c.fillRect(0, 0, t, t);
  c.fillStyle = '#fff';
  c.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4 - Math.PI / 2;
    const r = i % 2 ? t * 0.07 : t * 0.48;
    c.lineTo(m + Math.cos(a) * r, m + Math.sin(a) * r);
  }
  c.fill();
}

function coracao(c: CanvasRenderingContext2D, t: number): void {
  const s = t / 64;
  c.fillStyle = '#fff';
  c.shadowColor = 'rgba(255,255,255,0.8)';
  c.shadowBlur = 8 * s;
  c.beginPath();
  c.moveTo(32 * s, 56 * s);
  c.bezierCurveTo(6 * s, 40 * s, 4 * s, 22 * s, 16 * s, 14 * s);
  c.bezierCurveTo(24 * s, 9 * s, 30 * s, 14 * s, 32 * s, 20 * s);
  c.bezierCurveTo(34 * s, 14 * s, 40 * s, 9 * s, 48 * s, 14 * s);
  c.bezierCurveTo(60 * s, 22 * s, 58 * s, 40 * s, 32 * s, 56 * s);
  c.fill();
}

/** A sola do tênis vista de cima, com o halo (a pegada de luz). */
function pegada(c: CanvasRenderingContext2D, t: number): void {
  const g = c.createRadialGradient(t / 2, t / 2, 4, t / 2, t / 2, t / 2);
  g.addColorStop(0, 'rgba(255,255,255,0.5)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = g;
  c.fillRect(0, 0, t, t);
  c.fillStyle = '#fff';
  c.beginPath();
  c.ellipse(t / 2, t * 0.35, t * 0.17, t * 0.21, 0, 0, Math.PI * 2);
  c.fill();
  c.beginPath();
  c.ellipse(t / 2, t * 0.71, t * 0.13, t * 0.14, 0, 0, Math.PI * 2);
  c.fill();
}

// ------------------------------------------------------------------ brilhos (pool)
interface Brilho {
  vivo: boolean;
  p: Vector3;
  v: Vector3;
  vida: number;
  dura: number;
  tam: number;
  giro: number;
  ang: number;
  gravidade: number;
  cor: Color3;
}

export interface OpcoesBrilho {
  cor?: string;
  v?: Vector3;
  tam?: number;
  dura?: number;
  gravidade?: number;
}

function criarPoolBrilhos(scene: Scene) {
  const mat = (nome: string, tex: DynamicTexture, somar: boolean) => {
    const m = new StandardMaterial(nome, scene);
    m.disableLighting = true;
    m.diffuseColor = Color3.Black();
    m.specularColor = Color3.Black();
    m.emissiveColor = Color3.White();
    m.diffuseTexture = tex;
    m.useAlphaFromDiffuseTexture = true;
    m.backFaceCulling = false;
    m.disableDepthWrite = true;
    if (somar) m.alphaMode = Constants.ALPHA_ADD;
    return m;
  };
  const grupo = (nome: string, tex: DynamicTexture, max: number, somar = false) => {
    const m = MeshBuilder.CreatePlane(nome, { size: 1 }, scene);
    m.material = mat(`${nome}-mat`, tex, somar);
    m.isPickable = false;
    m.alwaysSelectAsActiveMesh = true;
    m.renderingGroupId = 0;
    const matrizes = new Float32Array(max * 16);
    const cores = new Float32Array(max * 4);
    m.thinInstanceSetBuffer('matrix', matrizes, 16, false);
    m.thinInstanceSetBuffer('color', cores, 4, false);
    m.thinInstanceCount = 0;
    const lista: Brilho[] = Array.from({ length: max }, () => ({
      vivo: false,
      p: new Vector3(),
      v: new Vector3(),
      vida: 0,
      dura: 1,
      tam: 0.2,
      giro: 0,
      ang: 0,
      gravidade: 0,
      cor: new Color3(1, 1, 1),
    }));
    return { m, matrizes, cores, lista, proximo: 0 };
  };
  const estrelas = grupo('premium-estrelinhas', textura(scene, 'premium-tex-estrela', estrelaQuatro), MAX_ESTRELAS);
  const coracoes = grupo('premium-coracoes', textura(scene, 'premium-tex-coracao', coracao), MAX_CORACOES);
  const giro = new Quaternion();
  const q = new Quaternion();
  const escala = new Vector3();
  const mat4 = new Matrix();
  const cam = new Matrix();
  const eixoZ = new Vector3(0, 0, 1);

  function soltarEm(g: ReturnType<typeof grupo>, p: Vector3, op: OpcoesBrilho) {
    // o mais antigo dá lugar ao novo quando o pool enche
    let b = g.lista.find((x) => !x.vivo);
    if (!b) {
      b = g.lista[g.proximo % g.lista.length];
      g.proximo++;
    }
    b.vivo = true;
    b.p.copyFrom(p);
    if (op.v) b.v.copyFrom(op.v);
    else b.v.set((Math.random() - 0.5) * 0.6, 0.6 + Math.random() * 0.6, (Math.random() - 0.5) * 0.6);
    b.tam = op.tam ?? 0.16 + Math.random() * 0.1;
    b.dura = op.dura ?? 0.9 + Math.random() * 0.5;
    b.vida = 0;
    b.giro = (Math.random() - 0.5) * 6;
    b.ang = Math.random() * Math.PI;
    b.gravidade = op.gravidade ?? -0.8;
    Color3.FromHexString(op.cor ?? ARCO_PREMIUM[Math.floor(Math.random() * ARCO_PREMIUM.length)]).toLinearSpaceToRef(b.cor);
    b.cor.set(Math.sqrt(b.cor.r), Math.sqrt(b.cor.g), Math.sqrt(b.cor.b));
  }

  function quadroGrupo(g: ReturnType<typeof grupo>, dt: number, rotCam: Quaternion) {
    let n = 0;
    for (const b of g.lista) {
      if (!b.vivo) continue;
      b.vida += dt;
      const f = b.vida / b.dura;
      if (f >= 1) {
        b.vivo = false;
        continue;
      }
      b.v.y += b.gravidade * dt;
      b.p.addInPlace(b.v.scale(dt));
      b.ang += b.giro * dt;
      // nasce crescendo, cintila e some
      const k = (f < 0.15 ? f / 0.15 : 1 - (f - 0.15) / 0.85) * (0.85 + 0.15 * Math.sin(b.vida * 30));
      const s = Math.max(0.001, b.tam * k);
      escala.set(s, s, s);
      Quaternion.RotationAxisToRef(eixoZ, b.ang, giro);
      rotCam.multiplyToRef(giro, q);
      Matrix.ComposeToRef(escala, q, b.p, mat4);
      mat4.copyToArray(g.matrizes, n * 16);
      g.cores[n * 4] = b.cor.r;
      g.cores[n * 4 + 1] = b.cor.g;
      g.cores[n * 4 + 2] = b.cor.b;
      g.cores[n * 4 + 3] = 1;
      n++;
    }
    g.m.thinInstanceCount = n;
    if (n) {
      g.m.thinInstanceBufferUpdated('matrix');
      g.m.thinInstanceBufferUpdated('color');
    }
    g.m.setEnabled(n > 0);
  }

  const rotCam = new Quaternion();
  return {
    soltar: (p: Vector3, op: OpcoesBrilho = {}) => soltarEm(estrelas, p, op),
    coracao: (p: Vector3, op: OpcoesBrilho = {}) => soltarEm(coracoes, p, op),
    quadro(dt: number) {
      const c = scene.activeCamera;
      if (c) {
        cam.copyFrom(c.getViewMatrix()).invert();
        cam.decompose(undefined, rotCam, undefined);
      }
      quadroGrupo(estrelas, dt, rotCam);
      quadroGrupo(coracoes, dt, rotCam);
    },
    vivos: () =>
      estrelas.lista.filter((b) => b.vivo).length + coracoes.lista.filter((b) => b.vivo).length,
    malhas: [estrelas.m, coracoes.m],
  };
}

// ------------------------------------------------------------------ pegadas de luz
function criarPegadas(scene: Scene) {
  const m = MeshBuilder.CreatePlane('premium-pegadas', { size: 1 }, scene);
  const mat = new StandardMaterial('premium-pegadas-mat', scene);
  mat.disableLighting = true;
  mat.diffuseColor = Color3.Black();
  mat.specularColor = Color3.Black();
  mat.emissiveColor = Color3.White();
  const tex = textura(scene, 'premium-tex-pegada', pegada);
  mat.diffuseTexture = tex;
  mat.useAlphaFromDiffuseTexture = true;
  mat.alphaMode = Constants.ALPHA_ADD;
  mat.disableDepthWrite = true;
  mat.zOffset = -2;
  mat.backFaceCulling = false;
  m.material = mat;
  m.isPickable = false;
  m.alwaysSelectAsActiveMesh = true;
  const matrizes = new Float32Array(MAX_PEGADAS * 16);
  const cores = new Float32Array(MAX_PEGADAS * 4);
  m.thinInstanceSetBuffer('matrix', matrizes, 16, false);
  m.thinInstanceSetBuffer('color', cores, 4, false);
  m.thinInstanceCount = 0;
  const DURA = 2.4;
  const lista = Array.from({ length: MAX_PEGADAS }, () => ({
    vida: 99,
    x: 0,
    y: 0,
    z: 0,
    yaw: 0,
    cor: new Color3(),
  }));
  let k = 0;
  let corN = 0;
  const q = new Quaternion();
  const esc = new Vector3(0.34, 0.5, 1);
  const pos = new Vector3();
  const mat4 = new Matrix();
  return {
    marcar(x: number, y: number, z: number, yaw: number) {
      const p = lista[k++ % lista.length];
      p.x = x;
      p.y = y + 0.025;
      p.z = z;
      p.yaw = yaw;
      p.vida = 0;
      Color3.FromHexString(ARCO_PREMIUM[corN++ % ARCO_PREMIUM.length]).toLinearSpaceToRef(p.cor);
      p.cor.set(Math.sqrt(p.cor.r), Math.sqrt(p.cor.g), Math.sqrt(p.cor.b));
    },
    quadro(dt: number) {
      let n = 0;
      for (const p of lista) {
        if (p.vida > DURA) continue;
        p.vida += dt;
        const f = Math.max(0, 1 - p.vida / DURA);
        Quaternion.RotationYawPitchRollToRef(p.yaw, Math.PI / 2, 0, q);
        pos.set(p.x, p.y, p.z);
        Matrix.ComposeToRef(esc, q, pos, mat4);
        mat4.copyToArray(matrizes, n * 16);
        // some devagar (na soma, apagar é ir para o preto)
        const a = f * f * 0.95;
        cores[n * 4] = p.cor.r * a;
        cores[n * 4 + 1] = p.cor.g * a;
        cores[n * 4 + 2] = p.cor.b * a;
        cores[n * 4 + 3] = 1;
        n++;
      }
      m.thinInstanceCount = n;
      if (n) {
        m.thinInstanceBufferUpdated('matrix');
        m.thinInstanceBufferUpdated('color');
      }
      m.setEnabled(n > 0);
      return n;
    },
    malha: m,
  };
}

// ------------------------------------------------------------------ os bonecos com premium
interface Bicho {
  b: BichoMontado;
  x: number;
  y: number;
  z: number;
  yaw: number;
  vy: number;
  noAr: boolean;
  fase: number;
  graca: number;
  coracaoFeito: boolean;
  /** Pinguim: escorregando de barriga (0..1, suavizado). */
  barriga: number;
  /** Pinguim: bate as asinhas (segundos que faltam). */
  bate: number;
  t: number;
}

interface Usuario {
  raiz: TransformNode;
  /** As malhas de luz própria do boneco (somem de longe); null: procurar de novo. */
  luzes: Mesh[] | null;
  detalhes: boolean;
  contorno: boolean;
  premium: PremiumVestido;
  nos: Record<string, TransformNode | undefined>;
  anterior: Vector3;
  temAnterior: boolean;
  vel: number;
  vy: number;
  andado: number;
  pe: number;
  noAr: boolean;
  parado: number;
  rastro: number;
  bicho: Bicho | null;
  visivel: boolean;
  luz: number;
  comemorando: number;
  /** Vitrine (lojinha, provador, capturas): o bicho fica no lugar da raiz, virado como ela. */
  vitrine?: boolean;
}

export interface RegistroPremium {
  vestir(p: PremiumVestido | undefined): void;
  definirLuz(f: number): void;
  definirVisivel(v: boolean): void;
  /** Um puf de brilho no boneco (vestiu, comprou). */
  festa(): void;
  soltar(): void;
  /** Testes: o bicho que segue (posição e o que está fazendo). */
  bicho(): { id: IdBichoPremium; x: number; y: number; z: number; barriga: number; chamadas: number } | null;
}

export interface EfeitosPremium {
  registrar(
    raiz: TransformNode,
    premium: PremiumVestido | undefined,
    /** Vitrine: o bicho fica parado no lugar da raiz (lojinha, provador, capturas). */
    vitrine?: boolean,
  ): RegistroPremium;
  definirChao(ler: LerBloco): void;
  /** Testes e diagnóstico. */
  contar(): { brilhos: number; pegadas: number; bichos: number; usuarios: number };
}

const porCena = new WeakMap<Scene, EfeitosPremium>();

/** O gerente dos efeitos dos premium desta cena (um só, criado na primeira vez). */
export function efeitosPremium(scene: Scene): EfeitosPremium {
  const ja = porCena.get(scene);
  if (ja) return ja;
  const usuarios = new Set<Usuario>();
  let brilhos: ReturnType<typeof criarPoolBrilhos> | null = null;
  let pegadas: ReturnType<typeof criarPegadas> | null = null;
  let ler: LerBloco | null = null;
  let nPegadas = 0;
  const aux = new Vector3();

  const pool = () => (brilhos ??= criarPoolBrilhos(scene));
  const marcas = () => (pegadas ??= criarPegadas(scene));

  function chao(x: number, y: number, z: number): number {
    if (!ler) return y;
    for (let yy = Math.floor(y + 1.5); yy > y - 8; yy--) {
      const b = ler(Math.floor(x), yy, Math.floor(z));
      if (b === undefined) return y;
      if (ehSolido(b)) return yy + 1;
    }
    return y;
  }

  function acharNos(u: Usuario): void {
    u.nos = {};
    for (const n of u.raiz.getDescendants(false)) {
      const m = /-junta-(\w+)$/.exec(n.name);
      if (m) u.nos[m[1]] = n as TransformNode;
    }
  }

  function arrumarBicho(u: Usuario): void {
    const id = u.premium.bicho as IdBichoPremium | undefined;
    if (u.bicho && u.bicho.b.id !== id) {
      u.bicho.b.descartar();
      u.bicho = null;
    }
    if (!id || u.bicho) return;
    const b = montarBichoPremium(scene, id);
    u.contorno = true;
    const r = u.raiz.position;
    const yaw = u.raiz.rotation.y;
    // nasce do lado, um pouco atrás, já num puf de brilho
    const x = r.x - Math.sin(yaw) * 1.3 + Math.cos(yaw) * 1.1;
    const z = r.z - Math.cos(yaw) * 1.3 - Math.sin(yaw) * 1.1;
    u.bicho = {
      b,
      x,
      y: r.y,
      z,
      yaw,
      vy: 0,
      noAr: false,
      fase: 0,
      graca: 3 + Math.random() * 2,
      coracaoFeito: true,
      barriga: 0,
      bate: 0,
      t: Math.random() * 10,
    };
    b.raiz.position.set(x, r.y, z);
    b.definirLuz(u.luz);
    b.raiz.setEnabled(u.visivel);
  }

  function detalhesDeLonge(u: Usuario, d: number): void {
    const quer = d < (u.detalhes ? LONGE_DETALHE : PERTO_DETALHE);
    if (u.luzes === null) {
      u.luzes = u.raiz
        .getChildMeshes(false)
        .filter((m): m is Mesh => m instanceof Mesh && !!m.material?.name.startsWith('premium-luz-'));
      for (const m of u.luzes) m.isVisible = quer;
      u.detalhes = quer;
    } else if (quer !== u.detalhes) {
      u.detalhes = quer;
      for (const m of u.luzes) if (!m.isDisposed()) m.isVisible = quer;
    }
    const contorno = d < LONGE_CONTORNO;
    if (u.bicho && contorno !== u.contorno) {
      u.contorno = contorno;
      for (const m of u.bicho.b.malhas) if (m.metadata?.contorno) m.renderOutline = contorno;
    }
  }

  function quadroUsuario(u: Usuario, dt: number, camPos: Vector3 | null): void {
    const r = u.raiz.position;
    if (u.vitrine) {
      if (u.bicho) quadroBicho(u, u.bicho, dt, true);
      return;
    }
    if (!u.temAnterior) {
      u.anterior.copyFrom(r);
      u.temAnterior = true;
    }
    const dx = r.x - u.anterior.x;
    const dz = r.z - u.anterior.z;
    const dy = r.y - u.anterior.y;
    u.anterior.copyFrom(r);
    if (dt <= 0) return;
    const passo = Math.hypot(dx, dz);
    if (passo / dt > 30) {
      // teleporte: o bicho vem junto num puf
      if (u.bicho) aparecerPerto(u);
      return;
    }
    u.vel += (passo / dt - u.vel) * Math.min(1, dt * 8);
    u.vy = dy / dt;
    const yaw = u.raiz.rotation.y;
    const piso = chao(r.x, r.y + 0.5, r.z);
    const noAr = r.y - piso > 0.25;
    const pousou = u.noAr && !noAr;
    u.noAr = noAr;
    u.parado = u.vel < 0.3 ? u.parado + dt : 0;
    const dCam = camPos ? Vector3.Distance(camPos, r) : 0;
    const perto = dCam < LONGE_SIMPLES;
    detalhesDeLonge(u, dCam);
    if (!u.nos.pernaE || u.nos.pernaE.isDisposed()) acharNos(u);
    // os braços para o alto: a criança está comemorando (o pinguim bate as asinhas)
    const bE = u.nos.bracoE?.rotation.z ?? 0;
    const bD = u.nos.bracoD?.rotation.z ?? 0;
    u.comemorando = bE < -2 && bD > 2 ? u.comemorando + dt : 0;

    // ---------------------------------------------------- tênis-cometa
    if (u.premium.roupa === 'tenis-cometa' && u.visivel && perto) {
      u.andado += passo;
      if (!noAr && u.andado > PASSO_PEGADA) {
        u.andado = 0;
        u.pe = 1 - u.pe;
        const no = u.pe ? u.nos.pernaD : u.nos.pernaE;
        const p = no ? no.getAbsolutePosition() : r;
        marcas().marcar(p.x, piso, p.z, yaw);
        nPegadas++;
        for (let i = 0; i < 3; i++)
          pool().soltar(aux.set(p.x, piso + 0.12, p.z), { tam: 0.19 + Math.random() * 0.1, dura: 0.85 });
      }
      if (pousou)
        for (let i = 0; i < 14; i++) {
          const a = (i / 14) * Math.PI * 2;
          pool().soltar(aux.set(r.x, piso + 0.08, r.z), {
            v: new Vector3(Math.cos(a) * 1.7, 0.6, Math.sin(a) * 1.7),
            dura: 0.7,
            tam: 0.19,
          });
        }
    }

    // ---------------------------------------------------- capa de estrelas: o rastro correndo
    if (u.premium.costas === 'capa-estrelas' && u.visivel && perto && u.vel > 2.6 && !u.premium.fantasia) {
      u.rastro -= dt;
      if (u.rastro <= 0) {
        u.rastro = 0.07;
        const capa = u.nos.capa;
        const p = capa ? capa.getAbsolutePosition() : r;
        const lado = (Math.random() - 0.5) * 0.5;
        pool().soltar(
          aux.set(
            p.x - Math.sin(yaw) * 0.25 + Math.cos(yaw) * lado,
            p.y - 0.45 - Math.random() * 0.3,
            p.z - Math.cos(yaw) * 0.25 - Math.sin(yaw) * lado,
          ),
          {
            cor: Math.random() < 0.6 ? '#ffe27a' : '#ffffff',
            v: new Vector3(0, 0.25, 0),
            gravidade: 0,
            dura: 0.75,
            tam: 0.17 + Math.random() * 0.1,
          },
        );
      }
    }

    // ---------------------------------------------------- dragãozinho no ar
    if (u.premium.fantasia === 'dragao' && u.visivel && perto && noAr && Math.random() < dt * 5)
      pool().soltar(aux.set(r.x, r.y + 0.9, r.z), {
        cor: ARCO_PREMIUM[(Math.random() * 3 + 3) | 0],
        v: new Vector3(0, -0.6, 0),
        tam: 0.12,
      });

    if (u.bicho) quadroBicho(u, u.bicho, dt, perto);
  }

  function aparecerPerto(u: Usuario): void {
    const b = u.bicho!;
    const r = u.raiz.position;
    const yaw = u.raiz.rotation.y;
    b.x = r.x - Math.sin(yaw) * 1.4 + Math.cos(yaw) * 1.1;
    b.z = r.z - Math.cos(yaw) * 1.4 - Math.sin(yaw) * 1.1;
    b.y = chao(b.x, r.y + 0.5, b.z);
    b.vy = 0;
    b.noAr = false;
    if (u.visivel) for (let i = 0; i < 16; i++) pool().soltar(aux.set(b.x, b.y + 0.6, b.z), { tam: 0.2 });
  }

  function quadroBicho(u: Usuario, pet: Bicho, dt: number, perto: boolean): void {
    const r = u.raiz.position;
    const yaw = u.raiz.rotation.y;
    const uni = pet.b.id === 'unicornio';
    pet.t += dt;
    const t = pet.t;
    if (u.vitrine) {
      // na vitrine: parado no pedestal, virado como a raiz, só a graça de bicho parado
      pet.x = r.x;
      pet.y = r.y;
      pet.z = r.z;
      pet.yaw = yaw;
      pet.b.raiz.position.set(r.x, r.y, r.z);
      pet.b.raiz.rotation.y = yaw;
      if (uni) animarUnicornio(u, pet, dt, t, false, 0, 99, true);
      else animarPinguim(u, pet, dt, t, false, 0, false, true);
      return;
    }
    // o lugar dele: atrás e ao lado da criança
    const atras = uni ? 1.5 : 1.15;
    const lado = uni ? 1.15 : 0.95;
    const lx = r.x - Math.sin(yaw) * atras + Math.cos(yaw) * lado;
    const lz = r.z - Math.cos(yaw) * atras - Math.sin(yaw) * lado;
    let ddx = lx - pet.x;
    let ddz = lz - pet.z;
    const dist = Math.hypot(ddx, ddz);
    if (dist > 14 || Math.abs(r.y - pet.y) > 8) {
      aparecerPerto(u);
      ddx = ddz = 0;
    }
    const rapidez = uni ? 6.5 : 5;
    const quer = dist > 0.4 ? Math.min(rapidez, dist * 2.2) : 0;
    const vx = dist > 0.01 ? (ddx / Math.max(dist, 0.01)) * quer : 0;
    const vz = dist > 0.01 ? (ddz / Math.max(dist, 0.01)) * quer : 0;
    pet.x += vx * dt;
    pet.z += vz * dt;
    const andando = quer > 0.35;
    // vira para onde anda; parado, olha para a criança
    const alvoYaw = andando ? Math.atan2(vx, vz) : Math.atan2(r.x - pet.x, r.z - pet.z);
    let d = alvoYaw - pet.yaw;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    pet.yaw += d * Math.min(1, dt * 6);
    // o chão: pula junto quando a criança pula e sobe o degrau com um pulinho
    const piso = chao(pet.x, Math.max(pet.y, r.y) + 0.5, pet.z);
    const pular = (vy: number) => {
      pet.vy = vy;
      pet.noAr = true;
      if (u.visivel && perto)
        for (let i = 0; i < 6; i++) pool().soltar(aux.set(pet.x, pet.y + 0.2, pet.z), { tam: 0.15 });
    };
    if (!pet.noAr && u.vy > 3 && dist < 6) pular(uni ? 4.8 : 4.2);
    else if (!pet.noAr && piso > pet.y + 0.4) pular(5.2);
    const desceu = piso < pet.y - 0.3;
    if (pet.noAr || pet.y > piso + 0.01) {
      pet.vy -= 14 * dt;
      pet.y += pet.vy * dt;
      if (pet.y <= piso) {
        pet.y = piso;
        pet.vy = 0;
        pet.noAr = false;
      }
    } else pet.y += (piso - pet.y) * Math.min(1, dt * 10);
    const raiz = pet.b.raiz;
    raiz.position.set(pet.x, pet.y, pet.z);
    raiz.rotation.y = pet.yaw;
    if (uni) animarUnicornio(u, pet, dt, t, andando, quer, dist, perto);
    else animarPinguim(u, pet, dt, t, andando, quer, desceu, perto);
  }

  function animarUnicornio(
    u: Usuario,
    pet: Bicho,
    dt: number,
    t: number,
    andando: boolean,
    quer: number,
    dist: number,
    perto: boolean,
  ): void {
    const n = pet.b.nos;
    pet.fase += dt * (andando ? 1.9 + quer * 0.55 : 0);
    const ciclo = pet.fase * Math.PI * 2;
    const passo = andando ? Math.sin(ciclo) : 0;
    // trote: as pernas em diagonal juntas, o corpo sobe e desce
    n.pernaFE.rotation.x = passo * 0.7;
    n.pernaTD.rotation.x = passo * 0.7;
    n.pernaFD.rotation.x = -passo * 0.7;
    n.pernaTE.rotation.x = -passo * 0.7;
    n.corpo.position.y = andando ? Math.abs(Math.sin(ciclo)) * 0.06 : 0;
    n.corpo.rotation.x = pet.noAr ? -Math.max(-0.3, Math.min(0.3, pet.vy * 0.06)) : 0;
    const resp = 1 + Math.sin(t * 2.6) * 0.018;
    n.corpo.scaling.set(resp, 1 / resp, resp);
    // a cabeça balança no trote; parada, olha em volta e faz charme
    n.pescoco.rotation.x = andando ? Math.sin(ciclo * 2) * 0.08 : Math.sin(t * 1.3) * 0.05;
    n.cabeca.rotation.z = andando ? 0 : Math.sin(t * 0.9) * 0.12;
    n.cabeca.rotation.x = 0;
    if (!perto) return;
    n.rabo1.rotation.x = 0.35 + (andando ? 0.5 : 0.1);
    n.rabo1.rotation.y = Math.sin(t * (andando ? 7 : 3)) * 0.25;
    n.rabo2.rotation.y = Math.sin(t * (andando ? 7 : 3) - 0.6) * 0.33;
    n.rabo3.rotation.y = Math.sin(t * (andando ? 7 : 3) - 1.2) * 0.41;
    n.rabo2.rotation.x = 0.15;
    n.rabo3.rotation.x = 0.15;
    n.orelhaE.rotation.x = Math.max(0, Math.sin(t * 1.7) - 0.85) * 3;
    n.orelhaD.rotation.x = Math.max(0, Math.sin(t * 1.7 + 2) - 0.85) * 3;
    n.olhos.scaling.y = t % 3.4 < 0.12 ? 0.12 : 1;
    // o chifre solta uma estrelinha de vez em quando, andando ou parado (lê de longe)
    pet.bate -= dt;
    if (pet.bate <= 0 && u.visivel) {
      pet.bate = 0.9 + Math.random() * 0.8;
      const c = n.cabeca.getAbsolutePosition();
      pool().soltar(
        c.add(new Vector3(Math.sin(pet.yaw) * 0.2, 0.62, Math.cos(pet.yaw) * 0.2)),
        { cor: '#fff3b0', v: new Vector3(0, 0.5, 0), gravidade: 0, dura: 0.8, tam: 0.16 },
      );
    }
    // charme de tempos em tempos: joga a cabeça e o chifre solta brilho
    pet.graca -= dt;
    if (pet.graca <= 0 && !andando) {
      pet.graca = 5 + Math.random() * 3;
      const c = n.cabeca.getAbsolutePosition();
      if (u.visivel)
        for (let i = 0; i < 10; i++)
          pool().soltar(c.add(new Vector3(0, 0.55, 0.1)), {
            v: new Vector3((Math.random() - 0.5) * 0.9, 1, (Math.random() - 0.5) * 0.9),
            tam: 0.14,
          });
    }
    if (pet.graca > 4.4 && !andando) n.cabeca.rotation.x = -Math.sin((5.6 - pet.graca) * 4) * 0.25;
    // a criança parou pertinho: ele olha e solta coraçõezinhos (uma vez a cada parada)
    if (u.parado > 0.6 && dist < 3 && !pet.coracaoFeito) {
      pet.coracaoFeito = true;
      const c = n.cabeca.getAbsolutePosition();
      if (u.visivel)
        for (let i = 0; i < 5; i++)
          setTimeout(
            () =>
              pool().coracao(c.add(new Vector3(0, 0.45, 0)), {
                cor: i % 2 ? '#ff7ab8' : '#ff4f8b',
                v: new Vector3((Math.random() - 0.5) * 0.4, 0.75, (Math.random() - 0.5) * 0.4),
                gravidade: 0,
                dura: 1.5,
                tam: 0.24,
              }),
            i * 150,
          );
    }
    if (u.parado === 0) pet.coracaoFeito = false;
  }

  function animarPinguim(
    u: Usuario,
    pet: Bicho,
    dt: number,
    t: number,
    andando: boolean,
    quer: number,
    desceu: boolean,
    perto: boolean,
  ): void {
    const n = pet.b.nos;
    // escorrega de barriga nas descidas (e quando corre muito atrás da criança)
    const quer_barriga = andando && (desceu || pet.vy < -1.5 || quer > 4.6) ? 1 : 0;
    pet.barriga += (quer_barriga - pet.barriga) * Math.min(1, dt * (quer_barriga ? 8 : 3));
    const b = pet.barriga;
    pet.fase += dt * (andando ? 2.4 + quer * 0.4 : 0) * (1 - b);
    const ciclo = pet.fase * Math.PI * 2;
    // a ginga: balança de um lado para o outro, um pezinho de cada vez
    const ginga = andando ? Math.sin(ciclo) : Math.sin(t * 1.4) * 0.15;
    n.tronco.rotation.z = ginga * 0.2 * (1 - b);
    n.tronco.rotation.x = b * 1.35;
    n.tronco.position.y = 0.06 + (1 - b) * (andando ? Math.abs(Math.sin(ciclo)) * 0.035 : 0) - b * 0.02;
    n.cabeca.rotation.x = -b * 1.1;
    n.peE.position.y = 0.03 + (andando ? Math.max(0, Math.sin(ciclo)) * 0.05 : 0) * (1 - b);
    n.peD.position.y = 0.03 + (andando ? Math.max(0, -Math.sin(ciclo)) * 0.05 : 0) * (1 - b);
    const resp = 1 + Math.sin(t * 3) * 0.02;
    n.corpo.scaling.set(resp, 1 / resp, resp);
    if (!perto) return;
    // bate as asinhas quando a criança comemora (e um pouquinho para equilibrar andando)
    if (u.comemorando > 0.05 && pet.bate <= 0) pet.bate = 1.6;
    pet.bate = Math.max(0, pet.bate - dt);
    const bate = pet.bate > 0 ? Math.sin(t * 22) * 0.6 + 0.9 : 0;
    const asa = b > 0.5 ? -0.25 : (andando ? 0.25 + ginga * 0.15 : 0.1) + bate;
    n.asaE.rotation.z = -asa;
    n.asaD.rotation.z = asa;
    n.asaE.rotation.x = b * 0.9;
    n.asaD.rotation.x = b * 0.9;
    n.ponta.rotation.z = Math.sin(t * (andando ? 9 : 2.5)) * 0.25;
    n.ponta.rotation.x = andando ? -0.4 - b * 0.4 : 0;
    n.olhos.scaling.y = (t + 1.3) % 3.8 < 0.12 ? 0.12 : 1;
    if (pet.bate > 0 && pet.bate < 1.55 && Math.random() < dt * 6 && u.visivel)
      pool().soltar(n.cabeca.getAbsolutePosition().add(new Vector3(0, 0.3, 0)), {
        cor: '#bfefff',
        tam: 0.13,
      });
    if (b > 0.6 && Math.random() < dt * 14 && u.visivel)
      pool().soltar(aux.set(pet.x, pet.y + 0.08, pet.z), {
        cor: Math.random() < 0.5 ? '#bfefff' : '#ffffff',
        v: new Vector3((Math.random() - 0.5) * 0.8, 0.5, (Math.random() - 0.5) * 0.8),
        dura: 0.6,
        tam: 0.12,
      });
  }

  const obs = scene.onBeforeRenderObservable.add(() => {
    if (!usuarios.size && !brilhos && !pegadas) return;
    const dt = Math.min(0.05, scene.getEngine().getDeltaTime() / 1000);
    const camPos = scene.activeCamera?.globalPosition ?? null;
    for (const u of usuarios) {
      if (u.raiz.isDisposed()) {
        u.bicho?.b.descartar();
        usuarios.delete(u);
        continue;
      }
      quadroUsuario(u, dt, camPos);
    }
    brilhos?.quadro(dt);
    pegadas?.quadro(dt);
  });
  scene.onDisposeObservable.addOnce(() => {
    scene.onBeforeRenderObservable.remove(obs);
    porCena.delete(scene);
  });

  const efeitos: EfeitosPremium = {
    registrar(raiz, premium, vitrine) {
      const u: Usuario = {
        vitrine,
        raiz,
        premium: { ...(premium ?? {}) },
        nos: {},
        luzes: null,
        detalhes: true,
        contorno: true,
        anterior: new Vector3(),
        temAnterior: false,
        vel: 0,
        vy: 0,
        andado: 0,
        pe: 0,
        noAr: false,
        parado: 0,
        rastro: 0,
        bicho: null,
        visivel: true,
        luz: 1,
        comemorando: 0,
      };
      usuarios.add(u);
      arrumarBicho(u);
      return {
        vestir(p) {
          u.premium = { ...(p ?? {}) };
          u.nos = {};
          u.luzes = null;
          u.contorno = true;
          arrumarBicho(u);
        },
        definirLuz(f) {
          u.luz = f;
          u.bicho?.b.definirLuz(f);
        },
        definirVisivel(v) {
          u.visivel = v;
          u.bicho?.b.raiz.setEnabled(v);
        },
        festa() {
          const p = raiz.position;
          for (let i = 0; i < 22; i++)
            pool().soltar(aux.set(p.x, p.y + 0.9, p.z), {
              v: new Vector3((Math.random() - 0.5) * 3, Math.random() * 2.2, (Math.random() - 0.5) * 3),
              tam: 0.2,
            });
        },
        soltar() {
          u.bicho?.b.descartar();
          u.bicho = null;
          usuarios.delete(u);
        },
        bicho() {
          const b = u.bicho;
          if (!b) return null;
          return {
            id: b.b.id,
            x: b.x,
            y: b.y,
            z: b.z,
            barriga: b.barriga,
            chamadas: b.b.malhas.reduce((s, m) => s + 1 + (m.renderOutline ? 1 : 0), 0),
          };
        },
      };
    },
    definirChao(f) {
      ler = f;
    },
    contar: () => ({
      brilhos: brilhos?.vivos() ?? 0,
      pegadas: nPegadas,
      bichos: [...usuarios].filter((u) => u.bicho).length,
      usuarios: usuarios.size,
    }),
  };
  porCena.set(scene, efeitos);
  return efeitos;
}
