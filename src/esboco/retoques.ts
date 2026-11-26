/**
 * Esboço da spec 038 "Retoques e a moto dourada" (só com `?esboco=retoques`). O `main.ts` importa
 * este arquivo sob demanda: vira um pedaço à parte que o jogo nunca baixa.
 *
 * Um gramado aplainado ao sul do bairro da Vila Neon (o mesmo palco do esboço da 036) e a
 * criança, o boneco de verdade do jogo (`criarBoneco`, com as malhas juntas como no jogo):
 * - na moto dourada (duas versões), com as mãos no guidão e os pés nos apoios ou nos pedais;
 * - na bicicletinha e no carrinho de pedal, hoje (o código do jogo, sem mexer) e com os pés no
 *   pedal (a perna com joelho apontada para o pedal a cada quadro, a conta exata);
 * - de tênis e de camiseta de aquário, hoje e nas duas versões novas de cada um.
 *
 * O que é de mentirinha: não há compra, roda nem física; a criança anda num roteiro em volta do
 * gramado (o mesmo a cada foto: o instante pedido é recalculado em passos fixos), e o jogador de
 * verdade fica escondido no meio do palco (os pedaços do mundo chegam por ele).
 */
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Matrix, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import type { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import type { TargetCamera } from '@babylonjs/core/Cameras/targetCamera';
import type { Scene } from '@babylonjs/core/scene';
import { aparenciaPadrao, normalizarAparencia, type Aparencia } from '../personagem/aparencia';
import type { PlanoBoneco } from '../personagem/boneco';
import { calcularPose, type Pose } from '../personagem/poses';
import { criarBoneco } from '../render/boneco';
import type { Personagem } from '../render/personagem';
import { AQUARIO, desenharAquario, texturaAquario } from '../render/premiumLuzes';
import { fovDeDentro } from '../render/primeiraPessoa';
import { Bloco } from '../world/blocks';
import {
  CAMISETAS,
  MOTOS,
  PEIXES_BOLINHAS,
  PEIXES_CARDUME,
  TENIS,
  desenharCavalinho,
  dividirPernas,
  retocarTenis,
  vestirBrinquedoEsboco,
  type IdCamiseta,
  type IdMoto,
  type IdPedal,
  type IdTenis,
  type MedidaPerna,
  type Montagem,
  type V3,
  type Versao,
} from './retoquesPecas';

/** O que está no palco. `antes`: o jogo de hoje (sem o esboço). */
export type Item =
  | { tipo: 'moto'; versao: IdMoto }
  | { tipo: 'pedal'; versao: IdPedal; antes?: boolean }
  | { tipo: 'tenis'; versao: IdTenis }
  | { tipo: 'camiseta'; versao: IdCamiseta };

/** As duas crianças das fotos (as mesmas das capturas da 036). */
const MENINA: Partial<Aparencia> = { corpo: 'feminino', cabeloEstilo: 5, rosto: 1, cabeloCor: 1, pele: 1, roupaEstilo: 6 };
const MENINO: Partial<Aparencia> = { corpo: 'masculino', cabeloEstilo: 0, rosto: 0, cabeloCor: 0, pele: 2, roupaEstilo: 0 };

/** O caminho em volta do gramado (elipse, raios em blocos). */
const OVAL = { a: 8.5, b: 5.5 };
const PASSO_FIXO = 1 / 60;
/** A velocidade no roteiro (blocos por segundo): a pé e no brinquedo (a mesma do jogo, só enfeite). */
const A_PE = 2.6;
const MONTADA = 3.2;
/** A passada do jogo (1 andando: 4,3 blocos por segundo). */
const VEL_PASSADA = 4.3;

/** Onde a câmera fica, em volta da criança (ang 0: na frente dela; positivo: do lado direito). */
export interface Enquadre {
  ang: number;
  dist: number;
  alt: number;
  alvoY: number;
  fov: number;
  lado?: number;
  frente?: number;
  segue?: boolean;
  /** De dentro: a câmera nos olhos da criança (a cabeça some), olhando para baixo `olhar` rad. */
  dentro?: { olhar: number };
  /** Só para mostrar os pés no carrinho: a lataria fica meio transparente (as rodas e o pedal não). */
  raioX?: boolean;
}

/** A medida pé–pedal de uma volta inteira (blocos). */
export interface MedidaPedal {
  item: string;
  amostras: number;
  /** Para cada pé: a menor, a maior e a média da distância da sola ao alto do pedal. */
  E: { min: number; max: number; media: number };
  D: { min: number; max: number; media: number };
  /** A distância a cada amostra (o pé esquerdo e o direito), em ordem na volta. */
  serie: Array<[number, number, number]>;
}

export interface EsbocoRetoques {
  versoes: { motos: readonly Versao[]; tenis: readonly Versao[]; camisetas: readonly Versao[] };
  montar(): V3;
  mostrar(item: Item): void;
  cena(modo: 'parado' | 'andando', t: number, rodando: boolean): void;
  enquadrar(e: Enquadre | null): void;
  hora(h: number): void;
  esconder(sim: boolean): void;
  virar(yaw: number): void;
  /** Uma volta inteira do pedal, em `n` amostras, com a criança andando. */
  medirPedal(n: number): MedidaPedal | null;
  info(): { crianca: V3; yaw: number; malhas: number; nos: string[] };
}

declare global {
  interface Window {
    __retoques?: EsbocoRetoques;
  }
}

export function prepararEsbocoRetoques(): void {
  const esperar = () => {
    const e = window.__brumaluz;
    if (e?.ready && e.cenaBabylon) ligar(e.cenaBabylon() as Scene);
    else setTimeout(esperar, 200);
  };
  esperar();
}

// ------------------------------------------------------------------ a conta do joelho
/**
 * A perna com joelho até um ponto (no espaço do corpo, relativo ao quadril): o giro da perna
 * (x para a frente e para trás, z para o lado) e o do joelho (x, para trás), com o joelho
 * dobrando para a frente, como criança sentada. A conta é exata: a sola cai no ponto sempre que
 * ele está ao alcance (o giro do Babylon é z, depois x).
 */
export function pernaAte(T: V3, m: MedidaPerna): { x: number; z: number; joelho: number } {
  const Lt = m.coxa;
  const a = m.quadril - m.coxa;
  const b = m.pontaZ;
  const Ls = Math.hypot(a, b);
  const dist = Math.hypot(T[0], T[1], T[2]);
  const D = Math.max(Math.abs(Lt - Ls) + 0.02, Math.min(Lt + Ls - 0.0005, dist));
  const q = (D * D - Lt * Lt - Ls * Ls) / (2 * Lt);
  const phi = Math.atan2(b, a);
  const k = phi + Math.acos(Math.max(-1, Math.min(1, q / Ls)));
  const uy = -Lt - a * Math.cos(k) - b * Math.sin(k);
  const uz = -a * Math.sin(k) + b * Math.cos(k);
  const f = D / Math.max(1e-6, dist);
  const sz = Math.max(-1, Math.min(1, (-T[0] * f) / uy));
  const z = Math.asin(sz);
  const bruto = Math.atan2(T[2], T[1]) - Math.atan2(uz, uy * Math.cos(z));
  const x = Math.atan2(Math.sin(bruto), Math.cos(bruto));
  return { x, z, joelho: k };
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

/** A sombrinha redonda no chão (a mesma do esboço da 036). */
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
  const m = MeshBuilder.CreateGround('personagem-esboco-sombra-crianca', { width: 2, height: 2 }, scene);
  m.material = mat;
  m.isPickable = false;
  m.setEnabled(false);
  return m;
}

// ------------------------------------------------------------------ o palco
function ligar(scene: Scene): void {
  const e = window.__brumaluz!;
  const prefixo = 'personagem-esboco';
  let O: V3 = [0, 64, 0];
  let pronto = false;
  let item: Item = { tipo: 'moto', versao: 'motoca' };
  let boneco: Personagem | null = null;
  let juntas: Record<string, TransformNode> = {};
  let montagem: Montagem | null = null;
  let perna: MedidaPerna | null = null;
  let yawParado = 0;
  const sombra = criarSombra(scene);
  const ehMontado = () => item.tipo === 'moto' || item.tipo === 'pedal';
  /** O jogo de hoje (a bicicletinha e o carrinho da 036, sem o esboço). */
  const ehHoje = () => item.tipo === 'pedal' && !!item.antes;

  // ---------------------------------------------------------------- a criança
  function aparencia(): Aparencia {
    const base: Partial<Aparencia> = { ...aparenciaPadrao(), ...(item.tipo === 'camiseta' ? MENINA : MENINO), nome: 'esboco' };
    if (item.tipo === 'tenis') base.premium = { roupa: 'tenis-cometa' };
    if (item.tipo === 'camiseta') base.premium = { roupa: 'camiseta-aquario' };
    if (ehHoje() && item.tipo === 'pedal') {
      base.premium = { andar: item.versao === 'bici' ? 'bicicletinha' : 'carrinho-pedal' };
      base.montado = true;
    }
    return normalizarAparencia(base);
  }
  function ajustar(pl: PlanoBoneco): PlanoBoneco {
    montagem = null;
    perna = null;
    if (item.tipo === 'tenis') retocarTenis(pl, item.versao);
    if (ehMontado() && !ehHoje()) {
      perna = dividirPernas(pl);
      montagem = vestirBrinquedoEsboco(item.versao as IdMoto | IdPedal, pl.pecas);
    }
    if (ehHoje()) {
      // (hoje: a perna sem joelho; a sola é medida no espaço da perna)
      perna = { coxa: 0, quadril: pl.juntas.pernaE.pos[1], pontaZ: 0.06, xPerna: Math.abs(pl.juntas.pernaE.pos[0]) };
    }
    return pl;
  }
  function montarCrianca(): void {
    boneco?.descartar();
    boneco = criarBoneco(scene, aparencia(), prefixo, ajustar, true, false);
    juntas = {};
    for (const n of boneco.raiz.getChildTransformNodes(false)) {
      const k = /-junta-(\w+)$/.exec(n.name);
      if (k) juntas[k[1]] = n;
    }
    for (const m of boneco.raiz.getChildMeshes(false)) m.isPickable = false;
    // o brinquedo do esboço fica sempre aceso (o jogo só acende o dele com a criança montada)
    if (montagem) juntas.brinquedo?.setEnabled(true);
  }

  // ---------------------------------------------------------------- a camiseta nova
  const aquario = texturaAquario(scene) as DynamicTexture;
  scene.onBeforeRenderObservable.add(() => {
    if (item.tipo !== 'camiseta' || item.versao === 'hoje' || !pronto) return;
    const c = aquario.getContext() as unknown as CanvasRenderingContext2D;
    const t = est.t;
    if (item.versao === 'bolinhas') desenharAquario(c, t, PEIXES_BOLINHAS);
    else {
      desenharAquario(c, t, PEIXES_CARDUME);
      // o cavalinho na frente do peito, subindo e descendo devagar (não dá a volta)
      desenharCavalinho(c, AQUARIO.largura * 0.5 + Math.sin(t * 0.5) * 6, AQUARIO.altura * 0.47, AQUARIO.altura * 0.62, t);
    }
    aquario.update();
  });

  // ---------------------------------------------------------------- o roteiro
  const est = { modo: 'parado' as 'parado' | 'andando', t: 0, rodando: false, th: 0, x: 0, z: 0, yaw: 0, andado: 0 };

  function pontoDoOval(th: number): { x: number; z: number; yaw: number } {
    const x = O[0] + Math.cos(th) * OVAL.a;
    const z = O[2] + Math.sin(th) * OVAL.b;
    const dx = -Math.sin(th) * OVAL.a;
    const dz = Math.cos(th) * OVAL.b;
    return { x, z, yaw: Math.atan2(dx, dz) };
  }

  function zerar(): void {
    est.t = 0;
    est.th = -Math.PI / 2;
    est.andado = 0;
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
  }

  const mInv = new Matrix();
  /** Os braços apontam do ombro para o ponto do guidão (a conta do `maosNoGuidao` da 036). */
  function maosNoGuidao(m: Montagem): void {
    const j = juntas;
    for (const n of [boneco!.raiz, j.corpo.parent as TransformNode, j.corpo, j.tronco, j.prancha]) n.computeWorldMatrix(true);
    j.tronco.getWorldMatrix().invertToRef(mInv);
    for (const [lado, braco] of [
      ['E', j.bracoE],
      ['D', j.bracoD],
    ] as const) {
      const alvo = Vector3.TransformCoordinates(
        Vector3.TransformCoordinates(new Vector3(...m.maos[lado]), j.prancha.getWorldMatrix()),
        mInv,
      ).subtractInPlace(braco.position);
      const d = alvo.normalize();
      braco.rotation.set(Math.atan2(-d.z, -d.y), 0, Math.asin(Math.max(-1, Math.min(1, d.x))));
    }
  }

  /** Onde o alto de cada pedal está agora (no espaço da prancha). */
  function pedais(m: Montagem, giro: number): { E: V3; D: V3 } | null {
    const p = m.pes;
    if (p.tipo !== 'pedal') return null;
    const [cy, cz] = p.eixo;
    const ponto = (s: number): V3 => [s * p.x, cy + s * p.raio * Math.cos(giro) + p.raioPedal, cz + s * p.raio * Math.sin(giro)];
    return { E: ponto(-1), D: ponto(1) };
  }

  /** A pose montada do esboço: o corpo no assento, as mãos no guidão e os pés no apoio ou no pedal. */
  function poseMontada(m: Montagem, med: MedidaPerna, andando: boolean): void {
    const j = juntas;
    const corpoY = m.assentoY + 0.12 - med.quadril;
    j.corpo.position.y = corpoY;
    j.corpo.rotation.set(0, 0, 0);
    j.corpo.scaling.setAll(1);
    j.tronco.rotation.set(m.troncoX, 0, 0);
    j.cabeca.rotation.set(-m.troncoX * 0.75 + 0.05, andando ? 0 : Math.sin(est.t * 0.7) * 0.12, 0);
    const giro = (est.andado * (m.pes.tipo === 'pedal' ? m.pes.porBloco : 0)) % (Math.PI * 2);
    const alvos = m.pes.tipo === 'pedal' ? pedais(m, giro)! : { E: m.pes.E, D: m.pes.D };
    for (const [lado, no, joelho] of [
      ['E', j.pernaE, j.joelhoE],
      ['D', j.pernaD, j.joelhoD],
    ] as const) {
      const q = no.position;
      const alvo = alvos[lado];
      const r = pernaAte([alvo[0] - q.x, alvo[1] - corpoY - q.y, alvo[2] - q.z], med);
      no.rotation.set(r.x, 0, r.z);
      if (joelho) joelho.rotation.set(r.joelho, 0, 0);
    }
    maosNoGuidao(m);
    for (const r of m.rodas) if (j[r.no]) j[r.no].rotation.x = (est.andado * r.porBloco) % (Math.PI * 2);
    if (m.pes.tipo === 'pedal' && j[m.pes.no]) j[m.pes.no].rotation.x = giro;
  }

  function passo(dt: number): void {
    if (!boneco || !pronto) return;
    est.t += dt;
    const andando = est.modo === 'andando';
    const v = andando ? (ehMontado() ? MONTADA : A_PE) : 0;
    if (andando) {
      const r = (OVAL.a + OVAL.b) / 2;
      est.th += (v / r) * dt;
      const p = pontoDoOval(est.th);
      est.x = p.x;
      est.z = p.z;
      est.yaw = p.yaw;
      est.andado += v * dt;
    }
    let pose: Pose;
    if (ehMontado()) {
      pose = calcularPose({ andando: false, correndo: false, noAr: false, minerando: false, colocando: false, tempo: est.t, cabecaGiro: 0 });
    } else
      pose = calcularPose({
        andando,
        correndo: false,
        noAr: false,
        minerando: false,
        colocando: false,
        tempo: est.t,
        ...(andando ? { passo: { fase: est.t * Math.PI * 2 * (v / 1.55), amplitude: 0.55 } } : {}),
      });
    pose.tempo = est.t;
    pose.piscar = est.rodando && est.t % 3.7 < 0.12;
    if (ehHoje()) {
      // hoje: o código do jogo, com o andar dele (as rodas, o pedal e as pernas)
      boneco.aplicarPose(pose, {
        dt,
        olhar: 0,
        vista: { tempo: est.t, passada: v / VEL_PASSADA, golpe: null, colocar: null, noAr: 0, comer: null },
      });
    } else {
      boneco.aplicarPose(pose);
      if (montagem && perna) poseMontada(montagem, perna, andando);
    }
    boneco.posicionar(est.x, O[1], est.z, est.yaw);
    sombra.setEnabled(true);
    sombra.position.set(est.x, O[1] + 0.012, est.z);
    const [r, alonga] = montagem?.sombra ?? (ehMontado() ? [0.8, 1.25] : [0.5, 1]);
    sombra.scaling.set(r, 1, r * alonga);
    sombra.rotation.y = est.yaw;
  }

  function irPara(t: number): void {
    zerar();
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

  // ---------------------------------------------------------------- a medida pé–pedal
  /** A sola (o ponto que pisa) de cada pé e o alto do pedal de cada lado, no mundo. */
  function solaEPedal(): { E: [Vector3, Vector3]; D: [Vector3, Vector3] } | null {
    if (!boneco || !perna) return null;
    const j = juntas;
    const res: Partial<Record<'E' | 'D', [Vector3, Vector3]>> = {};
    const escala = (j.corpo.parent as TransformNode).scaling.x;
    for (const lado of ['E', 'D'] as const) {
      const pernaNo = j[`perna${lado}`];
      const joelho = j[`joelho${lado}`];
      atualizarAte(joelho ?? pernaNo);
      const sola = joelho
        ? Vector3.TransformCoordinates(new Vector3(0, -(perna.quadril - perna.coxa), perna.pontaZ), joelho.getWorldMatrix())
        : Vector3.TransformCoordinates(new Vector3(0, -perna.quadril, perna.pontaZ), pernaNo.getWorldMatrix());
      const no = j.andarPedal;
      if (!no) return null;
      atualizarAte(no);
      const s = lado === 'E' ? -1 : 1;
      let local: Vector3;
      let raioPedal: number;
      if (montagem && montagem.pes.tipo === 'pedal') {
        local = new Vector3(s * montagem.pes.x, s * montagem.pes.raio, 0);
        raioPedal = montagem.pes.raioPedal;
      } else {
        // a bicicletinha de hoje: o pedal é uma plaquinha a [s·0,11, s·0,1]·1,2 do eixo
        local = new Vector3(s * 0.11 * 1.2, s * 0.1 * 1.2, 0);
        raioPedal = 0.013 * 1.2;
      }
      const centro = Vector3.TransformCoordinates(local, no.getWorldMatrix());
      res[lado] = [sola, centro.add(new Vector3(0, raioPedal * escala, 0))];
    }
    return res as { E: [Vector3, Vector3]; D: [Vector3, Vector3] };
  }

  function medirPedal(n: number): MedidaPedal | null {
    if (item.tipo !== 'pedal' && !(item.tipo === 'moto' && item.versao === 'triciclo')) return null;
    est.modo = 'andando';
    irPara(1.5);
    // uma volta inteira do pedal, em passos pequenos
    const porBloco = montagem && montagem.pes.tipo === 'pedal' ? montagem.pes.porBloco : item.versao === 'bici' ? (1 / (0.24 * 1.15)) * 0.55 : 2.2;
    const tVolta = (Math.PI * 2) / (porBloco * MONTADA);
    const serie: Array<[number, number, number]> = [];
    const dtA = tVolta / n;
    for (let i = 0; i < n; i++) {
      // (passos de no máximo 1/60 s entre as amostras: o jogo de hoje suaviza as pernas por quadro)
      let falta = dtA;
      while (falta > 1e-6) {
        const d = Math.min(PASSO_FIXO, falta);
        passo(d);
        falta -= d;
      }
      const sp = solaEPedal();
      if (!sp) return null;
      serie.push([i / n, Vector3.Distance(sp.E[0], sp.E[1]), Vector3.Distance(sp.D[0], sp.D[1])]);
    }
    const resumo = (k: 1 | 2) => {
      const v = serie.map((s) => s[k]);
      return { min: Math.min(...v), max: Math.max(...v), media: v.reduce((a, b) => a + b, 0) / v.length };
    };
    return { item: `${item.tipo}:${item.versao}${ehHoje() ? ':hoje' : ''}`, amostras: n, E: resumo(1), D: resumo(2), serie };
  }

  // ---------------------------------------------------------------- câmera
  let enquadre: Enquadre | null = null;
  let fixa: { p: Vector3; a: Vector3; fov: number } | null = null;
  let cabecaEscondida = false;
  function esconderCabeca(sim: boolean): void {
    if (!boneco || cabecaEscondida === sim) return;
    cabecaEscondida = sim;
    const cab = juntas.cabeca;
    if (!cab) return;
    for (const m of boneco.raiz.getChildMeshes(false)) if (m.isDescendantOf(cab)) m.setEnabled(!sim);
  }
  function calcularCamera(cam?: TargetCamera): void {
    if (!enquadre || !boneco) return;
    const q = enquadre;
    const yaw = est.yaw;
    if (q.dentro) {
      // nos olhos: o meio da cabeça um tico à frente, olhando para a frente e para baixo
      const cab = juntas.cabeca;
      atualizarAte(cab);
      const olho = Vector3.TransformCoordinates(new Vector3(0, 0.02, 0.18), cab.getWorldMatrix());
      const dir = new Vector3(Math.sin(yaw) * Math.cos(q.dentro.olhar), -Math.sin(q.dentro.olhar), Math.cos(yaw) * Math.cos(q.dentro.olhar));
      const eng = scene.getEngine();
      const aspecto = eng.getRenderWidth() / Math.max(1, eng.getRenderHeight());
      fixa = { p: olho, a: olho.add(dir), fov: fovDeDentro(aspecto, (q.fov * Math.PI) / 180) };
      if (cam) cam.minZ = 0.05;
      return;
    }
    const alvo = new Vector3(
      est.x + Math.cos(yaw) * (q.lado ?? 0) + Math.sin(yaw) * (q.frente ?? 0),
      O[1] + q.alvoY,
      est.z - Math.sin(yaw) * (q.lado ?? 0) + Math.cos(yaw) * (q.frente ?? 0),
    );
    const a = yaw + q.ang;
    const p = alvo.add(new Vector3(Math.sin(a) * q.dist, q.alt, Math.cos(a) * q.dist));
    fixa = { p, a: alvo, fov: (q.fov * Math.PI) / 180 };
  }
  scene.onBeforeCameraRenderObservable.add((cam) => {
    if (enquadre?.segue || enquadre?.dentro) calcularCamera(cam as TargetCamera);
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
      if ((m.name.startsWith('personagem') && !m.name.startsWith(prefixo)) || m.name.startsWith('braco') || m.name.startsWith('pp-')) m.isVisible = false;
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
    const R = sementeira(1038);
    const W = 26;
    const D = 19;
    for (let dx = -W; dx <= W; dx++)
      for (let dz = -D; dz <= D; dz++) {
        const x = cx + dx;
        const z = cz + dz;
        for (let y = gy - 3; y < gy; y++) lote.push({ x, y, z, v: Bloco.TERRA });
        const k = Math.hypot(dx / OVAL.a, dz / OVAL.b);
        const largura = 1.1 / ((OVAL.a + OVAL.b) / 2);
        const caminho = Math.abs(k - 1) < largura;
        lote.push({ x, y: gy, z, v: caminho ? Bloco.PEDRA_LISA : Bloco.TERRA_MUSGOSA });
        for (let y = gy + 1; y <= gy + 16; y++) lote.push({ x, y, z, v: Bloco.AR });
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
  const api: EsbocoRetoques = {
    versoes: { motos: MOTOS, tenis: TENIS, camisetas: CAMISETAS },
    montar,
    mostrar(novo) {
      item = novo;
      cabecaEscondida = false;
      montarCrianca();
      irPara(0);
    },
    cena(modo, t, rodando) {
      est.modo = modo;
      est.rodando = rodando;
      irPara(t);
      calcularCamera();
    },
    enquadrar(q) {
      enquadre = q;
      esconderCabeca(!!q?.dentro);
      if (boneco && juntas.brinquedo)
        for (const m of boneco.raiz.getChildMeshes(false)) if (m.parent === juntas.brinquedo) m.visibility = q?.raioX ? 0.3 : 1;
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
    medirPedal: (n) => medirPedal(n),
    info: () => ({
      crianca: [est.x, O[1], est.z],
      yaw: est.yaw,
      malhas: boneco?.contarMalhas() ?? 0,
      nos: Object.keys(juntas),
    }),
  };
  window.__retoques = api;
}

/** Refaz a matriz de mundo do nó e de todos acima dele, da raiz para baixo. */
function atualizarAte(no: TransformNode): void {
  const cadeia: TransformNode[] = [];
  for (let n: TransformNode | null = no; n; n = n.parent as TransformNode | null) cadeia.unshift(n);
  for (const n of cadeia) n.computeWorldMatrix(true);
}
