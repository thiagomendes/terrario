/**
 * Esboço da spec 036 "Lojinha maior" (só com `?esboco=lojinha`). O `main.ts` importa este
 * arquivo sob demanda: vira um pedaço à parte que o jogo nunca baixa.
 *
 * Um palco simples num mundo da Vila Neon, de dia: um gramado aplainado com um caminho em
 * volta, e a criança (o boneco de verdade do jogo, `criarBoneco`) usando cada um dos 16
 * candidatos a item novo da lojinha premium, para o dono escolher 12 com o filho. As peças
 * moram em `lojinhaPecas.ts` (no plano do boneco, com as mesmas formas dos premium de hoje) e os
 * bichinhos em `lojinhaBichos.ts` (no traço e na montagem do `bichoPremium`).
 *
 * O que é de mentirinha: não há compra, roda de gestos nem física; a criança anda num roteiro
 * em volta do gramado (o mesmo a cada foto: o instante pedido é recalculado em passos fixos),
 * e o jogador de verdade fica escondido no meio do palco (os pedaços do mundo chegam por ele).
 */
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import type { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import type { TargetCamera } from '@babylonjs/core/Cameras/targetCamera';
import type { Scene } from '@babylonjs/core/scene';
import { aparenciaPadrao, normalizarAparencia, type Aparencia } from '../personagem/aparencia';
import type { PlanoBoneco } from '../personagem/boneco';
import { aplicarJuntas } from '../personagem/gestos';
import { calcularPose, type Pose } from '../personagem/poses';
import { criarBoneco } from '../render/boneco';
import type { Personagem } from '../render/personagem';
import { Bloco } from '../world/blocks';
import {
  CANDIDATOS,
  CORES_LUZ,
  MONTARIAS,
  candidato,
  medir,
  vestirCandidato,
  type Candidato,
  type IdCandidato,
  type Medidas,
  type V3,
} from './lojinhaPecas';
import {
  animar,
  animarPassarinho,
  colocarBicho,
  montarBicho,
  pousarNoOmbro,
  seguirCrianca,
  zerarBicho,
  type BichoEsboco,
  type IdBichoEsboco,
} from './lojinhaBichos';

/** As duas crianças das fotos (as mesmas das capturas dos premium da 023). */
const QUEM: Record<'menina' | 'menino', Partial<Aparencia>> = {
  menina: { corpo: 'feminino', cabeloEstilo: 5, rosto: 1, cabeloCor: 1, pele: 1, roupaEstilo: 6 },
  menino: { corpo: 'masculino', cabeloEstilo: 0, rosto: 0, cabeloCor: 0, pele: 2, roupaEstilo: 0 },
};

/** Quão depressa a criança vai no roteiro (blocos por segundo), a pé ou no brinquedo. */
const RAPIDEZ: Partial<Record<IdCandidato, number>> = {
  patinete: 3.4,
  carrinho: 3.0,
  bicicleta: 3.2,
  nuvem: 2.4,
};
const A_PE = 2.6;
/** O caminho em volta do gramado (elipse, raios em blocos). */
const OVAL = { a: 8.5, b: 5.5 };
const PASSO_FIXO = 1 / 60;

/** Onde a câmera fica, em volta da criança (ang 0: na frente dela; positivo: do lado direito). */
export interface Enquadre {
  ang: number;
  dist: number;
  /** Altura da câmera acima do alvo. */
  alt: number;
  /** Altura do alvo acima do chão da criança. */
  alvoY: number;
  fov: number;
  /** Desloca o alvo para o lado direito (+) e para a frente (+) da criança. */
  lado?: number;
  frente?: number;
  /** Acompanha a criança quadro a quadro (o roteiro andando). */
  segue?: boolean;
  /** O alvo fica no meio do caminho entre a criança e o bichinho (os dois na foto). */
  entreBicho?: boolean;
}

export interface EsbocoLojinha {
  candidatos: readonly Candidato[];
  /** Aplaina o gramado em volta do jogador e põe a criança no meio. Devolve o meio do palco. */
  montar(): V3;
  vestir(id: IdCandidato | null): void;
  /**
   * O roteiro no instante `t` (s): parada no meio do palco ou andando em volta do caminho
   * (no brinquedo, ou a pé com o bichinho atrás); rodando ou parado nesse instante.
   */
  cena(modo: 'parado' | 'andando', t: number, rodando: boolean): void;
  enquadrar(e: Enquadre | null): void;
  hora(h: number): void;
  esconder(sim: boolean): void;
  /** Para onde a criança olha parada (rad). */
  virar(yaw: number): void;
  /** Diagnóstico (testes): onde a criança e o bicho estão. */
  info(): { crianca: V3; yaw: number; bicho: V3 | null; malhas: number };
}

declare global {
  interface Window {
    __lojinha?: EsbocoLojinha;
  }
}

export function prepararEsbocoLojinha(): void {
  const esperar = () => {
    const e = window.__brumaluz;
    if (e?.ready && e.cenaBabylon) ligar(e.cenaBabylon() as Scene);
    else setTimeout(esperar, 200);
  };
  esperar();
}

/** Gerador com semente (as fotos saem iguais a cada vez). */
function sementeira(s: number) {
  let a = s >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ------------------------------------------------------------------ fumacinhas e bolhas
interface Particula {
  m: Mesh;
  brilho?: Mesh;
  vivo: boolean;
  p: Vector3;
  v: Vector3;
  vida: number;
  dura: number;
  r0: number;
  r1: number;
  fase: number;
}

/**
 * Um punhado de bolinhas que nascem, andam e somem (as nuvenzinhas da nuvem, a fumacinha do
 * foguete e as bolhas de sabão). Sem transparência na fumaça: ela some encolhendo, macia.
 */
function criarParticulas(scene: Scene, nome: string, max: number, tipo: 'fumaca' | 'bolha', cor: string) {
  const mat = new StandardMaterial(`personagem-esboco-fx-${nome}`, scene);
  const c = Color3.FromHexString(cor);
  if (tipo === 'fumaca') {
    mat.diffuseColor = c;
    mat.emissiveColor = c.scale(0.55);
    mat.specularColor = Color3.Black();
  } else {
    // a bolha: quase transparente, com o reflexo do céu e um tico de lilás e azul
    mat.diffuseColor = c;
    mat.emissiveColor = new Color3(0.25, 0.28, 0.36);
    mat.specularColor = new Color3(1, 1, 1);
    mat.specularPower = 48;
    mat.alpha = 0.32;
    mat.backFaceCulling = false;
  }
  const matBrilho = new StandardMaterial(`personagem-esboco-fx-${nome}-brilho`, scene);
  matBrilho.disableLighting = true;
  matBrilho.emissiveColor = new Color3(0.95, 0.97, 1);
  const lista: Particula[] = [];
  for (let i = 0; i < max; i++) {
    const m = MeshBuilder.CreateSphere(`personagem-esboco-fx-${nome}${i}`, { diameter: 2, segments: tipo === 'bolha' ? 12 : 8 }, scene);
    m.material = mat;
    m.isPickable = false;
    m.setEnabled(false);
    let brilho: Mesh | undefined;
    if (tipo === 'bolha') {
      brilho = MeshBuilder.CreateSphere(`personagem-esboco-fx-${nome}${i}-brilho`, { diameter: 2, segments: 6 }, scene);
      brilho.material = matBrilho;
      brilho.isPickable = false;
      brilho.parent = m;
      brilho.position.set(-0.38, 0.42, -0.5);
      brilho.scaling.setAll(0.16);
    }
    lista.push({ m, brilho, vivo: false, p: new Vector3(), v: new Vector3(), vida: 0, dura: 1, r0: 0.05, r1: 0.1, fase: 0 });
  }
  let proxima = 0;
  return {
    soltar(p: Vector3, v: Vector3, r0: number, r1: number, dura: number, fase = 0) {
      let q = lista.find((x) => !x.vivo);
      if (!q) q = lista[proxima++ % lista.length];
      q.vivo = true;
      q.p.copyFrom(p);
      q.v.copyFrom(v);
      q.vida = 0;
      q.dura = dura;
      q.r0 = r0;
      q.r1 = r1;
      q.fase = fase;
      q.m.setEnabled(true);
    },
    passo(dt: number) {
      for (const q of lista) {
        if (!q.vivo) continue;
        q.vida += dt;
        const f = q.vida / q.dura;
        if (f >= 1) {
          q.vivo = false;
          q.m.setEnabled(false);
          continue;
        }
        let r: number;
        if (tipo === 'fumaca') {
          // cresce macio e depois encolhe até sumir; o vento leva devagar e ela sobe (a
          // fumacinha faz uma curva para cima e se espalha, nada de bolo parado no chão)
          q.v.scaleInPlace(Math.exp(-dt * 0.9));
          q.v.y += dt * 0.7;
          const cresce = Math.min(1, f / 0.35);
          r = (q.r0 + (q.r1 - q.r0) * cresce) * (f < 0.6 ? 1 : 1 - (f - 0.6) / 0.4);
        } else {
          // a bolha sobe devagar balançando; no fim estoura (cresce um tico e some)
          q.v.scaleInPlace(Math.exp(-dt * 0.9));
          q.v.y += dt * 0.12;
          q.p.x += Math.sin(q.vida * 2.3 + q.fase) * dt * 0.12;
          q.p.z += Math.cos(q.vida * 1.9 + q.fase) * dt * 0.12;
          const nasce = Math.min(1, f / 0.08);
          r = q.r1 * nasce * (f > 0.96 ? 1.18 : 1);
        }
        q.p.addInPlace(q.v.scale(dt));
        q.m.position.copyFrom(q.p);
        q.m.scaling.setAll(Math.max(0.001, r));
      }
    },
    limpar() {
      for (const q of lista) {
        q.vivo = false;
        q.m.setEnabled(false);
      }
    },
  };
}

// ------------------------------------------------------------------ sombrinha no chão
function criarSombra(scene: Scene) {
  const tex = new DynamicTexture('personagem-esboco-sombra', { width: 64, height: 64 }, scene, false);
  const g = tex.getContext();
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(0,0,0,0.5)');
  gr.addColorStop(0.55, 'rgba(0,0,0,0.3)');
  gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, 64, 64);
  tex.update();
  tex.hasAlpha = true;
  const mat = new StandardMaterial('personagem-esboco-sombra', scene);
  mat.diffuseColor = new Color3(0.1, 0.1, 0.12);
  mat.emissiveColor = new Color3(0.06, 0.07, 0.09);
  mat.specularColor = Color3.Black();
  mat.disableLighting = true;
  mat.opacityTexture = tex;
  mat.zOffset = -2;
  return (nome: string, raio: number) => {
    const m = MeshBuilder.CreateGround(`personagem-esboco-sombra-${nome}`, { width: 2, height: 2 }, scene);
    m.material = mat;
    m.isPickable = false;
    m.scaling.set(raio, 1, raio);
    return m;
  };
}

// ------------------------------------------------------------------ o palco
function ligar(scene: Scene): void {
  const e = window.__brumaluz!;
  const prefixo = 'personagem-esboco';
  let O: V3 = [0, 64, 0];
  let pronto = false;
  let atual: IdCandidato | null = null;
  let medidas: Medidas | null = null;
  let boneco: Personagem | null = null;
  let bicho: BichoEsboco | null = null;
  let juntas: Record<string, TransformNode> = {};
  let yawParado = 0;
  const sombra = criarSombra(scene);
  const sombraCrianca = sombra('crianca', 0.55);
  const sombraBicho = sombra('bicho', 0.38);
  sombraCrianca.setEnabled(false);
  sombraBicho.setEnabled(false);
  const nuvenzinhas = criarParticulas(scene, 'nuvenzinha', 24, 'fumaca', '#ffffff');
  const fumaca = criarParticulas(scene, 'fumaca', 24, 'fumaca', '#f4f2fa');
  const bolhas = criarParticulas(scene, 'bolha', 18, 'bolha', '#e6f4ff');
  let rng = sementeira(36);

  // as luzes do esboço (mansas: fora do mapa do brilho, como tudo que começa com "personagem")
  const luzes = new Map<string, StandardMaterial>();
  const luz = (cor: string) => {
    let m = luzes.get(cor);
    if (m) return m;
    m = new StandardMaterial(`${prefixo}-luz-${cor}`, scene);
    m.disableLighting = true;
    m.diffuseColor = Color3.Black();
    m.specularColor = Color3.Black();
    m.emissiveColor = Color3.FromHexString(CORES_LUZ[cor] ?? '#ffffff').scale(0.8);
    luzes.set(cor, m);
    return m;
  };

  // ---------------------------------------------------------------- a criança
  function aparencia(): Aparencia {
    const c = atual ? candidato(atual) : null;
    return normalizarAparencia({ ...aparenciaPadrao(), ...QUEM[c?.quem ?? 'menino'], nome: 'esboco' });
  }
  function ajustar(pl: PlanoBoneco): PlanoBoneco {
    vestirCandidato(atual, pl);
    medidas = medir(pl);
    return pl;
  }
  function depoisDeMontar(): void {
    if (!boneco) return;
    juntas = {};
    for (const n of boneco.raiz.getChildTransformNodes(false)) {
      const k = /-junta-(\w+)$/.exec(n.name);
      if (k) juntas[k[1]] = n;
    }
    for (const m of boneco.raiz.getChildMeshes(false)) {
      m.isPickable = false;
      const k = /-luz-([a-z]+)-/.exec(m.name);
      if (k) m.material = luz(k[1]);
    }
  }
  function montarCrianca(): void {
    if (boneco) {
      if (bicho?.id === 'passarinho') bicho.b.raiz.parent = null;
      boneco.aplicarAparencia(aparencia());
    } else boneco = criarBoneco(scene, aparencia(), prefixo, ajustar, false);
    depoisDeMontar();
  }

  // ---------------------------------------------------------------- o roteiro
  const est = {
    modo: 'parado' as 'parado' | 'andando',
    t: 0,
    rodando: false,
    th: 0,
    x: 0,
    z: 0,
    yaw: 0,
    roda: 0,
    pedal: 0,
    helice: 0,
    asa: 0,
    soltar: 0,
  };
  const ehBichoNoChao = () => !!bicho && bicho.id !== 'passarinho';

  function pontoDoOval(th: number): { x: number; z: number; yaw: number } {
    const x = O[0] + Math.cos(th) * OVAL.a;
    const z = O[2] + Math.sin(th) * OVAL.b;
    // anda no sentido de th crescente: a tangente
    const dx = -Math.sin(th) * OVAL.a;
    const dz = Math.cos(th) * OVAL.b;
    return { x, z, yaw: Math.atan2(dx, dz) };
  }

  function zerar(): void {
    rng = sementeira(36);
    est.t = 0;
    est.th = -Math.PI / 2;
    est.roda = 0;
    est.pedal = 0;
    est.helice = 0;
    est.asa = 0;
    est.soltar = 0;
    nuvenzinhas.limpar();
    fumaca.limpar();
    bolhas.limpar();
    if (est.modo === 'parado') {
      est.x = O[0];
      est.z = O[2];
      est.yaw = yawParado;
    } else {
      const p = pontoDoOval(est.th);
      est.x = p.x;
      est.z = p.z;
      est.yaw = p.yaw;
    }
    if (bicho) {
      zerarBicho(bicho);
      if (ehBichoNoChao()) {
        if (est.modo === 'parado') {
          // a foto parada: do lado direito e um tico na frente da criança, virado para a câmera
          const lx = 0.85;
          const lz = 0.55;
          const bx = est.x + Math.cos(est.yaw) * lx + Math.sin(est.yaw) * lz;
          const bz = est.z - Math.sin(est.yaw) * lx + Math.cos(est.yaw) * lz;
          colocarBicho(bicho, bx, O[1], bz, est.yaw + 0.6);
          // (o cachorrinho já sentado: está parado há um tempinho; a tartaruguinha acordada, de
          // cabeça para fora)
          const acordado = bicho.id === 'tartaruga';
          bicho.parado = acordado ? 0 : 5;
          bicho.quieto = acordado ? 0 : 1;
        } else {
          // no lugar dele atrás da criança, já andando junto
          const bx = est.x - Math.sin(est.yaw) * 1.1 + Math.cos(est.yaw) * 0.9;
          const bz = est.z - Math.cos(est.yaw) * 1.1 - Math.sin(est.yaw) * 0.9;
          colocarBicho(bicho, bx, O[1], bz, est.yaw);
        }
      }
    }
  }

  function poseAgora(andando: boolean, v: number): Pose {
    const t = est.t;
    const m = atual ? MONTARIAS[atual] : undefined;
    if (m) {
      const pose = calcularPose({ andando: false, correndo: false, noAr: false, minerando: false, colocando: false, tempo: t, cabecaGiro: 0 });
      const ped = m.pedal * Math.sin(est.pedal);
      let pernaE = m.perna - ped;
      let pernaD = m.perna + ped;
      let troncoX = m.troncoX;
      if (atual === 'patinete') {
        // o impulso com o pé esquerdo, a cada 1,3 s (andando)
        const k = andando ? (t % 1.3) / 1.3 : 1;
        const chuta = k < 0.5 ? Math.sin((k / 0.5) * Math.PI) : 0;
        pernaE = 0.62 * chuta;
        pernaD = -0.06 * chuta;
        troncoX += 0.1 * chuta;
      }
      aplicarJuntas(
        pose,
        {
          bdX: m.bracoX,
          beX: m.bracoX,
          bdZ: m.bracoAbre,
          beZ: -m.bracoAbre,
          pernaD,
          pernaE,
          troncoX,
          // a cabeça olha para a frente, com um balanço pequeno
          cabY: andando ? 0 : Math.sin(t * 0.7) * 0.15,
        },
        1,
      );
      pose.corpoY = m.corpoY + (m.flutua !== undefined ? flutuar() : 0) + (atual === 'bicicleta' && andando ? Math.abs(Math.sin(est.pedal)) * 0.01 : 0);
      if (atual === 'nuvem') pose.corpoZ = Math.sin(t * 1.1) * 0.03;
      pose.escala = 1;
      return pose;
    }
    const pose = calcularPose({
      andando,
      correndo: false,
      noAr: false,
      minerando: false,
      colocando: false,
      tempo: t,
      ...(andando ? { passo: { fase: est.t * Math.PI * 2 * (v / 1.55), amplitude: 0.55 } } : {}),
    });
    if (atual === 'bolhas') {
      // a varinha no alto, na frente, balançando devagar (as bolhas saem do balanço)
      // (o braço vai para o lado e para a frente: o aro fica fora do rosto)
      aplicarJuntas(pose, { bdX: -1.75 + Math.sin(t * 2.2) * 0.2, bdZ: 0.75 + Math.sin(t * 1.1) * 0.1, cabX: -0.08, cabY: 0.3 }, 1);
    }
    if (atual === 'foguete' && !andando) {
      // olha para trás por cima do ombro direito, para a fumacinha
      aplicarJuntas(pose, { cabY: 1.1, cabZ: 0.06 }, 1);
    }
    if (atual === 'passarinho' && !andando) {
      // olha para o passarinho no ombro direito
      aplicarJuntas(pose, { cabY: 0.4, cabZ: 0.1, cabX: 0.06 }, 1);
    }
    return pose;
  }

  /** A nuvem e a criança sobem e descem devagar (um só seno: nada de tremor). */
  const flutuar = () => 0.1 + Math.sin(est.t * 1.6) * 0.035;

  function passo(dt: number): void {
    if (!boneco || !pronto) return;
    est.t += dt;
    const andando = est.modo === 'andando';
    const v = andando ? (atual && RAPIDEZ[atual]) || A_PE : 0;
    if (andando) {
      const r = (OVAL.a + OVAL.b) / 2;
      est.th += (v / r) * dt;
      const p = pontoDoOval(est.th);
      est.x = p.x;
      est.z = p.z;
      est.yaw = p.yaw;
    }
    const m = atual ? MONTARIAS[atual] : undefined;
    if (m && m.raioRoda > 0) est.roda += (v / (m.raioRoda * 1.15)) * dt;
    if (atual === 'bicicleta') est.pedal += (v / (0.2 * 1.15)) * dt * 0.55;
    if (atual === 'carrinho') est.pedal += v * dt * 2.2;
    const pose = poseAgora(andando, v);
    // (nas fotos paradas a criança nunca sai de olho fechado)
    pose.piscar = est.rodando && est.t % 3.7 < 0.12;
    boneco.aplicarPose(pose);
    boneco.posicionar(est.x, O[1], est.z, est.yaw);
    // os nós que se mexem sozinhos
    for (const k of ['rodaF', 'rodaT', 'rodinhaE', 'rodinhaD'] as const)
      if (juntas[k]) juntas[k].rotation.x = k.startsWith('rodinha') ? est.roda * 2.5 : est.roda;
    if (juntas.pedal) juntas.pedal.rotation.x = est.pedal;
    if (juntas.prancha && m?.flutua !== undefined) {
      juntas.prancha.position.y = flutuar();
      juntas.prancha.rotation.z = Math.sin(est.t * 1.1) * 0.03;
    }
    if (juntas.helice) {
      est.helice += dt * (andando ? 16 : 4.5);
      juntas.helice.rotation.y = est.helice;
    }
    if (juntas.borbE && juntas.borbD) {
      est.asa += dt * (andando ? 1.5 : 0.6) * Math.PI * 2;
      // abertas para os lados (aparecem dos dois lados da criança, de frente) e fechando
      // devagar para trás
      const a = 0.1 + 0.5 * (0.5 + 0.5 * Math.sin(est.asa));
      juntas.borbE.rotation.y = -a;
      juntas.borbD.rotation.y = a;
      juntas.borbE.rotation.z = -0.08;
      juntas.borbD.rotation.z = 0.08;
    }
    // as luzes: as rodinhas do patinete acendem mais quando rodam; a chaminha tremula
    const menta = luzes.get('menta');
    if (menta) {
      const k = andando ? 0.85 + 0.12 * Math.sin(est.roda * 1.5) : 0.78;
      menta.emissiveColor.copyFrom(Color3.FromHexString(CORES_LUZ.menta)).scaleInPlace(k);
    }
    const chama = luzes.get('chama');
    const malhaChama = chama ? boneco.raiz.getChildMeshes(false).find((q) => q.name.includes('luz-chama')) : undefined;
    if (chama && malhaChama) {
      const k = 0.8 + 0.12 * Math.sin(est.t * 23) + 0.08 * Math.sin(est.t * 37);
      chama.emissiveColor.copyFrom(Color3.FromHexString(CORES_LUZ.chama)).scaleInPlace(k);
      malhaChama.scaling.set(1, 0.85 + 0.3 * (k - 0.8) * 3, 1);
    }
    const frente = new Vector3(Math.sin(est.yaw), 0, Math.cos(est.yaw));
    const direita = new Vector3(Math.cos(est.yaw), 0, -Math.sin(est.yaw));
    // as fumacinhas, as nuvenzinhas e as bolhas
    est.soltar -= dt;
    if (atual === 'nuvem' && andando && est.soltar <= 0) {
      est.soltar = 0.11;
      const lado = (rng() - 0.5) * 0.7;
      const p = new Vector3(est.x, O[1] + 0.32 + rng() * 0.12, est.z)
        .addInPlace(frente.scale(-0.62))
        .addInPlace(direita.scale(lado));
      nuvenzinhas.soltar(p, frente.scale(-0.3).addInPlace(new Vector3(0, 0.08, 0)), 0.06, 0.15 + rng() * 0.05, 1.2);
    }
    if (atual === 'foguete' && est.soltar <= 0) {
      est.soltar = andando ? 0.09 : 0.14;
      const bocal = malhaChama?.getAbsolutePosition() ?? new Vector3(est.x, O[1] + 0.5, est.z);
      const p = bocal.add(new Vector3((rng() - 0.5) * 0.06, -0.06, (rng() - 0.5) * 0.06));
      // fiapos pequenos que descem um tico, vão para trás e sobem devagar (nada de bola no chão)
      const v = new Vector3((rng() - 0.5) * 0.35, -0.55, (rng() - 0.5) * 0.35).addInPlace(frente.scale(-0.5));
      fumaca.soltar(p, v, 0.025, 0.065 + rng() * 0.03, 1.7);
    }
    if (atual === 'bolhas' && est.soltar <= 0) {
      est.soltar = 0.42;
      const aro = boneco.raiz.getChildMeshes(false).find((q) => q.name.endsWith('varinha-aro'));
      if (aro) {
        const p = aro.getAbsolutePosition().clone();
        const vv = frente
          .scale(0.45 + rng() * 0.25)
          .addInPlace(direita.scale((rng() - 0.3) * 0.4))
          .addInPlace(new Vector3(0, 0.15 + rng() * 0.15, 0));
        bolhas.soltar(p, vv, 0, 0.07 + rng() * 0.06, 2.6 + rng() * 1.2, rng() * 6);
      }
    }
    nuvenzinhas.passo(dt);
    fumaca.passo(dt);
    bolhas.passo(dt);
    // o bichinho
    if (bicho) {
      if (bicho.id === 'passarinho') animarPassarinho(bicho, dt, andando);
      else if (andando) seguirCrianca(bicho, { x: est.x, y: O[1], z: est.z, yaw: est.yaw }, O[1], dt);
      // parado na foto: fica no lugar, com a graça de parado
      else animar(bicho, dt, false, 0);
      if (ehBichoNoChao()) {
        sombraBicho.setEnabled(true);
        sombraBicho.position.set(bicho.x, O[1] + 0.015, bicho.z);
      }
    }
    sombraCrianca.setEnabled(true);
    sombraCrianca.position.set(est.x, O[1] + 0.012, est.z);
    const raio = atual === 'carrinho' ? 0.85 : atual === 'bicicleta' ? 0.75 : atual === 'nuvem' ? 0.62 : 0.5;
    sombraCrianca.scaling.set(raio, 1, raio * (atual === 'carrinho' || atual === 'bicicleta' ? 1.25 : 1));
    sombraCrianca.rotation.y = est.yaw;
  }

  function irPara(t: number): void {
    zerar();
    // (um passo zero monta a pose antes do primeiro quadro)
    passo(0);
    let falta = t;
    while (falta > 1e-6) {
      const d = Math.min(PASSO_FIXO, falta);
      passo(d);
      falta -= d;
    }
  }

  scene.onBeforeRenderObservable.add(() => {
    if (!est.rodando) return;
    passo(Math.min(0.05, scene.getEngine().getDeltaTime() / 1000));
  });

  // ---------------------------------------------------------------- câmera
  let enquadre: Enquadre | null = null;
  let fixa: { p: Vector3; a: Vector3; fov: number } | null = null;
  function calcularCamera(): void {
    if (!enquadre) return;
    const q = enquadre;
    const yaw = est.yaw;
    const alvo = new Vector3(
      est.x + Math.cos(yaw) * (q.lado ?? 0) + Math.sin(yaw) * (q.frente ?? 0),
      O[1] + q.alvoY,
      est.z - Math.sin(yaw) * (q.lado ?? 0) + Math.cos(yaw) * (q.frente ?? 0),
    );
    if (q.entreBicho && bicho && bicho.id !== 'passarinho') {
      alvo.x = (est.x + bicho.x) / 2;
      alvo.z = (est.z + bicho.z) / 2;
    }
    const a = yaw + q.ang;
    const p = alvo.add(new Vector3(Math.sin(a) * q.dist, q.alt, Math.cos(a) * q.dist));
    fixa = { p, a: alvo, fov: (q.fov * Math.PI) / 180 };
  }
  scene.onBeforeCameraRenderObservable.add((cam) => {
    if (enquadre?.segue) calcularCamera();
    if (!fixa) return;
    const c = cam as TargetCamera;
    c.fov = fixa.fov;
    c.position.copyFrom(fixa.p);
    c.setTarget(fixa.a);
    c.maxZ = 900;
    c.getViewMatrix(true);
    scene.updateTransformMatrix(true);
  });

  // ---------------------------------------------------------------- esconder o jogo
  let escondido = false;
  scene.onBeforeRenderObservable.add(() => {
    if (!escondido) return;
    for (const m of scene.meshes)
      if ((m.name.startsWith('personagem') && !m.name.startsWith(prefixo)) || m.name.startsWith('braco')) m.isVisible = false;
      else if (m.name.startsWith('vila-sosia') || m.name.startsWith('premium-')) m.isVisible = false;
    for (const n of scene.transformNodes) if (n.name.startsWith('criatura-') && n.isEnabled()) n.setEnabled(false);
  });

  // ---------------------------------------------------------------- montar o gramado
  function montar(): V3 {
    const [px, , pz] = e.posicao!;
    const cx = Math.floor(px);
    const cz = Math.floor(pz);
    const NAO_CHAO = new Set<number>([
      Bloco.FOLHAGEM,
      Bloco.FOLHAS_BETULA,
      Bloco.FOLHAS_PINHO,
      Bloco.FOLHAS_LANTERNA,
      Bloco.FOLHAS_OUTONO,
      Bloco.MADEIRA_RETORCIDA,
      Bloco.TRONCO_BETULA,
      Bloco.TRONCO_PINHO,
      Bloco.TRONCO_LANTERNA,
      Bloco.GRAMA_ALTA,
      Bloco.FLOR,
      Bloco.ARBUSTO_FRUTINHAS,
      Bloco.AGUA,
    ]);
    const alturas: number[] = [];
    for (let dx = -20; dx <= 20; dx += 4)
      for (let dz = -14; dz <= 14; dz += 4)
        for (let y = 120; y > 1; y--) {
          const b = e.bloco!(cx + dx, y, cz + dz);
          if (!b || NAO_CHAO.has(b)) continue;
          alturas.push(y);
          break;
        }
    alturas.sort((a, b) => a - b);
    const gy = alturas[Math.floor(alturas.length / 2)] ?? 64;
    const lote: { x: number; y: number; z: number; v: number }[] = [];
    const R = sementeira(1036);
    const W = 26;
    const D = 19;
    for (let dx = -W; dx <= W; dx++)
      for (let dz = -D; dz <= D; dz++) {
        const x = cx + dx;
        const z = cz + dz;
        for (let y = gy - 3; y < gy; y++) lote.push({ x, y, z, v: Bloco.TERRA });
        // o caminho de pedra em volta (a faixa da elipse), o resto gramado
        const k = Math.hypot(dx / OVAL.a, dz / OVAL.b);
        const largura = 1.1 / ((OVAL.a + OVAL.b) / 2);
        const caminho = Math.abs(k - 1) < largura;
        lote.push({ x, y: gy, z, v: caminho ? Bloco.PEDRA_LISA : Bloco.TERRA_MUSGOSA });
        for (let y = gy + 1; y <= gy + 16; y++) lote.push({ x, y, z, v: Bloco.AR });
        // florzinhas soltas no gramado (longe do meio e do caminho)
        const longe = Math.abs(dx) > 3 || Math.abs(dz) > 3;
        if (!caminho && longe && Math.abs(k - 1) > 0.3 && R() < 0.05) lote.push({ x, y: gy + 1, z, v: Bloco.FLOR });
      }
    e.editarLote!(lote);
    O = [cx + 0.5, gy + 1, cz + 0.5];
    e.teleportar!(O[0], O[2], O[1]);
    pronto = true;
    montarCrianca();
    irPara(0);
    return O;
  }

  // ---------------------------------------------------------------- a API dos testes
  const api: EsbocoLojinha = {
    candidatos: CANDIDATOS,
    montar,
    vestir(id) {
      if (bicho) {
        bicho.b.descartar();
        bicho = null;
      }
      sombraBicho.setEnabled(false);
      atual = id;
      montarCrianca();
      const c = id ? candidato(id) : null;
      if (c?.tipo === 'bicho') {
        bicho = montarBicho(scene, c.id as IdBichoEsboco);
        if (bicho.id === 'passarinho' && juntas.tronco && medidas)
          pousarNoOmbro(bicho, juntas.tronco, 1, medidas.troncoH);
      }
      irPara(0);
    },
    cena(modo, t, rodando) {
      est.modo = modo;
      est.rodando = rodando;
      if (bicho) bicho.piscar = rodando;
      irPara(t);
      calcularCamera();
    },
    enquadrar(q) {
      enquadre = q;
      if (!q) fixa = null;
      else calcularCamera();
    },
    hora(h) {
      e.pausarDia = true;
      e.hora = h;
    },
    esconder(sim) {
      escondido = sim;
    },
    virar(yaw) {
      yawParado = yaw;
    },
    info: () => ({
      crianca: [est.x, O[1], est.z],
      yaw: est.yaw,
      bicho: bicho ? [bicho.x, bicho.y, bicho.z] : null,
      malhas: boneco?.contarMalhas() ?? 0,
    }),
  };
  window.__lojinha = api;
}
