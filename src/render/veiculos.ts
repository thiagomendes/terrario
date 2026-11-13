/**
 * Os carrinhos e ônibus da Cidade Grande no cliente (spec 014, T14). Cada veículo é uma
 * carroceria (uma malha, cor nos vértices) num nó que anda; as rodas de todos são instâncias de
 * uma roda só e os faróis, lanternas e giroflex, instâncias de uma esfera só: com a frota inteira
 * à vista, 10 carrocerias + rodas + luzes = 12 chamadas de desenho. Nada projeta sombra.
 *
 * - **Onde:** a mesma conta do núcleo (`poseDoVeiculo` no `s` do plano), no tempo do núcleo um
 *   pouco atrás (`ReplicaVeiculos`).
 * - **Perto e longe:** a até 30 blocos, a carroceria de verdade, as rodas girando (o ângulo é
 *   o caminho andado) e as luzes; mais longe, a versão simples (rodas e olhos nela). Fora da
 *   vista, o veículo inteiro sai das instâncias.
 * - **Jeito:** balança para a frente ao frear e para trás ao arrancar; o ônibus abre a porta no
 *   ponto; o giroflex da polícia pisca macio; de noite os olhinhos acendem; na buzina, um
 *   pulinho e o balão de acenar.
 * - **Sólido:** caixas para o boneco (dá para subir no capô e no teto do carro) e para a câmera.
 */
import type { Scene } from '@babylonjs/core/scene';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Matrix, Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { CreateSphereVertexData } from '@babylonjs/core/Meshes/Builders/sphereBuilder';
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer';
import '@babylonjs/core/Meshes/thinInstanceMesh';
import type { PlanoCidade } from '../world/cidade';
import {
  FROTA,
  MEDIDAS,
  cantosERodas,
  pontoNaPista,
  MODELO_DO_TIPO,
  noPlano,
  poseDoVeiculo,
  rotaDoVeiculo,
  type DefVeiculo,
  type MedidasVeiculo,
  type Pose,
  type Rota,
} from '../jogo/veiculos';
import type { ReplicaVeiculos } from '../cliente/veiculos';
import { criarPlasticos } from './formas';
import { criarBalao, type BalaoGesto } from './balaoGesto';
import { dadosRoda, modeloDoVeiculo, type Luz, type ModeloVeiculo } from './veiculosModelos';

/** Até onde a carroceria de verdade, as rodas e as luzes (mais longe, a versão simples). */
export const PERTO_VEICULO = 30;

/** Caixa sólida no mundo (x0, y0, z0, x1, y1, z1). */
export type CaixaMundo = [number, number, number, number, number, number];

interface VeiculoVisto {
  def: DefVeiculo;
  m: MedidasVeiculo;
  r: Rota;
  modelo: ModeloVeiculo;
  raiz: TransformNode;
  corpo: Mesh;
  simples: Mesh;
  pose: Pose;
  s: number;
  v: number;
  a: number;
  k: string | undefined;
  visivel: boolean;
  perto: boolean;
  /** Balanço da carroceria (rad) e a velocidade dele (mola). */
  inclina: number;
  inclinaV: number;
  /** 014c, o peso: deita na curva (rad), afunda e sobe (blocos), com as velocidades das molas. */
  roll: number;
  rollV: number;
  heave: number;
  heaveV: number;
  /** Esterço das rodas da frente (rad) e o entre-eixos (a conta dele). */
  esterco: number;
  entreEixos: number;
  /** x das rodas da frente (no modelo). */
  eixoFrente: number;
  /** Porta do ônibus: 0 fechada, 1 aberta. */
  porta: number;
  posicoesPorta: Float32Array | null;
  pulo: number;
  surgir: number;
  /** 014c: estava fora do chão desenhado (ao voltar, surge crescendo). */
  foraDoChao: boolean;
  balao: BalaoGesto | null;
}

export interface VeiculoNaTela {
  id: number;
  tipo: DefVeiculo['tipo'];
  x: number;
  z: number;
  yaw: number;
  s: number;
  v: number;
  /** Aceleração de agora (blocos/s²; o motor do som). */
  a: number;
  k?: string;
  /** Está no mundo agora (o plano já chegou). */
  ativo: boolean;
  /** 014c: desenhado agora (em cima de chão desenhado). */
  desenhado: boolean;
  visivel: boolean;
  perto: boolean;
}

export type RenderVeiculos = ReturnType<typeof criarRenderVeiculos>;

const COR_LUZ: Record<Luz['tipo'], { dia: Color3; noite: Color3 }> = {
  farol: { dia: Color3.FromHexString('#f4f0e2'), noite: new Color3(1.35, 1.25, 0.9) },
  lanterna: { dia: Color3.FromHexString('#d8443c'), noite: new Color3(1.3, 0.35, 0.28) },
  giroAzul: { dia: Color3.FromHexString('#6fa8ff'), noite: new Color3(0.5, 0.85, 1.5) },
  giroBranco: { dia: Color3.FromHexString('#e9f1ff'), noite: new Color3(1.3, 1.35, 1.45) },
  giroVermelho: { dia: Color3.FromHexString('#ff6a5e'), noite: new Color3(1.45, 0.4, 0.32) },
};

export function criarRenderVeiculos(
  scene: Scene,
  plano: PlanoCidade,
  replica: ReplicaVeiculos,
  /** 014d: a malha não brilha e tapa o brilho do que fica atrás (as luzes de trás, a barra). */
  tapaOGlow: (m: Mesh) => void,
  /**
   * 014c: o chão em (x, z) já está desenhado? O veículo só aparece em cima de chão desenhado
   * (antes vinha do nada, "voando" do horizonte até achar a rua) e surge crescendo ao entrar.
   */
  chaoDesenhado: (x: number, z: number) => boolean = () => true,
) {
  const pl = criarPlasticos(scene, 'veiculos');
  const matCorpo = pl.corVertice(0.45) ?? pl.cor('#ffffff', 0.45);
  const chao = plano.h + 1;

  // rodas: uma malha, instâncias
  const rodas = new Mesh('veiculos-rodas', scene);
  dadosRoda().applyToMesh(rodas);
  rodas.material = pl.corVertice(0.2) ?? matCorpo;
  rodas.hasVertexAlpha = false;
  rodas.isPickable = false;
  rodas.alwaysSelectAsActiveMesh = true;
  rodas.thinInstanceEnablePicking = false;
  tapaOGlow(rodas);
  const MAX_RODAS = FROTA.length * 4;
  const matRodas = new Float32Array(MAX_RODAS * 16);
  rodas.thinInstanceSetBuffer('matrix', matRodas, 16, false);
  rodas.thinInstanceCount = 0;

  // luzes: uma esfera, instâncias com a cor de cada uma (acesas, sem sombra de luz)
  const luzes = new Mesh('veiculos-luzes', scene);
  CreateSphereVertexData({ diameter: 2, segments: 3 }).applyToMesh(luzes);
  const matLuz = new StandardMaterial('veiculos-luzes', scene);
  matLuz.disableLighting = true;
  matLuz.emissiveColor = Color3.White();
  matLuz.diffuseColor = Color3.Black();
  matLuz.specularColor = Color3.Black();
  luzes.material = matLuz;
  luzes.isPickable = false;
  luzes.alwaysSelectAsActiveMesh = true;
  luzes.thinInstanceEnablePicking = false;
  const MAX_LUZES = FROTA.length * 6;
  const matLuzes = new Float32Array(MAX_LUZES * 16);
  const corLuzes = new Float32Array(MAX_LUZES * 4);
  luzes.thinInstanceSetBuffer('matrix', matLuzes, 16, false);
  luzes.thinInstanceSetBuffer('color', corLuzes, 4, false);
  luzes.thinInstanceCount = 0;

  const veiculos: VeiculoVisto[] = FROTA.map((def) => {
    const m = MEDIDAS[MODELO_DO_TIPO[def.tipo]];
    const modelo = modeloDoVeiculo(def.tipo, def.cor);
    const raiz = new TransformNode(`veiculo-${def.id}`, scene);
    const corpo = new Mesh(`veiculo-${def.id}-corpo`, scene);
    const vd = modelo.corpo;
    vd.applyToMesh(corpo, !!modelo.porta);
    corpo.material = matCorpo;
    corpo.hasVertexAlpha = false;
    corpo.isPickable = false;
    corpo.receiveShadows = false;
    corpo.parent = raiz;
    corpo.rotationQuaternion = null;
    tapaOGlow(corpo);
    const simples = new Mesh(`veiculo-${def.id}-longe`, scene);
    modelo.simples.applyToMesh(simples);
    simples.material = matCorpo;
    simples.hasVertexAlpha = false;
    simples.isPickable = false;
    simples.parent = raiz;
    simples.setEnabled(false);
    tapaOGlow(simples);
    const posicoesPorta = modelo.porta
      ? Float32Array.from(corpo.getVerticesData(VertexBuffer.PositionKind)!)
      : null;
    raiz.setEnabled(false);
    return {
      def,
      m,
      r: rotaDoVeiculo(plano, def),
      modelo,
      raiz,
      corpo,
      simples,
      pose: { x: 0, z: 0, hx: 1, hz: 0, yaw: 0 },
      s: 0,
      v: 0,
      a: 0,
      k: undefined,
      visivel: false,
      perto: false,
      inclina: 0,
      inclinaV: 0,
      roll: 0,
      rollV: 0,
      heave: 0,
      heaveV: 0,
      esterco: 0,
      entreEixos: modelo.entreEixos,
      eixoFrente: Math.max(...modelo.rodas.map((r) => r.x)),
      porta: 0,
      posicoesPorta,
      pulo: 0,
      surgir: 0,
      foraDoChao: false,
      balao: null,
    };
  });

  let noite = 0;
  let tempo = 0;
  const tmpM = new Matrix();
  const tmpM2 = new Matrix();
  const tmpQ = new Quaternion();
  const tmpV = new Vector3();
  const tmpS = new Vector3();
  const semGiro = Quaternion.Identity();
  const poseA: Pose = { x: 0, z: 0, hx: 1, hz: 0, yaw: 0 };
  const poseB: Pose = { x: 0, z: 0, hx: 1, hz: 0, yaw: 0 };

  /** Porta do ônibus: desliza para trás (e um tico para fora) conforme `f`. */
  function moverPorta(ve: VeiculoVisto, f: number): void {
    const p = ve.modelo.porta;
    if (!p || !ve.posicoesPorta) return;
    const pos = ve.posicoesPorta.slice();
    const e = ve.m.escala;
    for (let i = p.ini; i < p.fim; i++) {
      pos[i * 3] -= 0.62 * e * f;
      pos[i * 3 + 2] -= 0.05 * e * f;
    }
    ve.corpo.updateVerticesData(VertexBuffer.PositionKind, pos);
  }

  /** Avança o desenho: pose, balanço, porta, perto/longe. */
  function quadro(dt: number, agora: number): void {
    tempo += dt;
    if (!replica.pronto) {
      for (const ve of veiculos) ve.raiz.setEnabled(false);
      return;
    }
    const t = replica.tempo(agora);
    const cam = scene.activeCamera;
    for (const ve of veiculos) {
      const e = replica.em(ve.def.id, t);
      if (!e) {
        ve.raiz.setEnabled(false);
        continue;
      }
      ve.s = e.s;
      ve.v = e.v;
      const pl0 = e.plano;
      // acelerando ou freando agora? (a parte do plano antes de chegar na velocidade final)
      const fim = pl0.a !== 0 ? (pl0.vf - pl0.v0) / pl0.a : 0;
      ve.a = t - pl0.t0 < fim ? pl0.a : 0;
      ve.k = pl0.k;
      poseDoVeiculo(ve.r, ve.m, e.s, ve.pose);
      // só em cima de chão desenhado (as duas pontas); entrando, surge crescendo
      const mc = ve.m.meioComp;
      const noChao =
        chaoDesenhado(ve.pose.x + ve.pose.hx * mc, ve.pose.z + ve.pose.hz * mc) &&
        chaoDesenhado(ve.pose.x - ve.pose.hx * mc, ve.pose.z - ve.pose.hz * mc);
      if (!noChao) {
        ve.foraDoChao = true;
        ve.raiz.setEnabled(false);
        continue;
      }
      if (ve.foraDoChao) {
        ve.foraDoChao = false;
        ve.surgir = 1;
      }
      ve.raiz.setEnabled(true);
      ve.raiz.position.set(ve.pose.x, chao + ve.pulo * 0.12, ve.pose.z);
      ve.raiz.rotation.y = ve.pose.yaw;
      const sx = ve.surgir > 0 ? 1 - ve.surgir : 1;
      ve.raiz.scaling.set(sx, sx, sx);
      if (ve.surgir > 0) ve.surgir = Math.max(0, ve.surgir - dt * 2.5);
      if (ve.pulo > 0) ve.pulo = Math.max(0, ve.pulo - dt * 3.5);
      // 014c, o peso (aprovado no esboço): molas com pouco amortecimento (quica uma vez e
      // assenta). Freando, o nariz mergulha; arrancando, agacha; na curva deita para fora; a
      // suspensão sobe e desce de leve na rua; as rodas da frente esterçam para a curva.
      poseDoVeiculo(ve.r, ve.m, e.s - 0.25, poseA);
      poseDoVeiculo(ve.r, ve.m, e.s + 0.25, poseB);
      const kEsq = ((poseB.hx - poseA.hx) * -ve.pose.hz + (poseB.hz - poseA.hz) * ve.pose.hx) / 0.5;
      const aLado = ve.v * ve.v * kEsq;
      const w = Math.PI * 2 * 1.7;
      const amort = 2 * 0.34 * w;
      const alvoPitch = Math.max(-0.075, Math.min(0.06, ve.a * 0.032));
      const alvoRoll = Math.max(-0.085, Math.min(0.085, -aLado * 0.055));
      const ruido = ve.v > 0.05 ? Math.sin(e.s * 2.9) * 0.004 + Math.sin(e.s * 7.3) * 0.002 : 0;
      const alvoHeave = -Math.abs(ve.a) * 0.006 - Math.abs(aLado) * 0.004 + ruido;
      const passos = Math.max(1, Math.ceil(dt / 0.01));
      const h = dt / passos;
      for (let i = 0; i < passos; i++) {
        ve.inclinaV += ((alvoPitch - ve.inclina) * w * w - amort * ve.inclinaV) * h;
        ve.inclina += ve.inclinaV * h;
        ve.rollV += ((alvoRoll - ve.roll) * w * w - amort * ve.rollV) * h;
        ve.roll += ve.rollV * h;
        ve.heaveV += ((alvoHeave - ve.heave) * w * w - amort * ve.heaveV) * h;
        ve.heave += ve.heaveV * h;
      }
      ve.corpo.setPivotPoint(tmpV.set(0, ve.m.raioRoda, 0));
      ve.corpo.position.y = ve.heave;
      ve.corpo.rotation.z = ve.inclina;
      ve.corpo.rotation.x = ve.roll;
      const alvoEst = Math.max(-0.5, Math.min(0.5, -Math.atan(ve.entreEixos * kEsq)));
      ve.esterco += (alvoEst - ve.esterco) * Math.min(1, dt * 10);
      // porta do ônibus aberta no ponto
      if (ve.modelo.porta) {
        const quer = ve.k === 'ponto' ? 1 : 0;
        if (quer !== ve.porta) {
          ve.porta =
            quer > ve.porta ? Math.min(1, ve.porta + dt * 2.5) : Math.max(0, ve.porta - dt * 2.5);
          moverPorta(ve, ve.porta * ve.porta * (3 - 2 * ve.porta));
        }
      }
      // perto ou longe da câmera
      const d = cam
        ? Math.hypot(cam.globalPosition.x - ve.pose.x, cam.globalPosition.z - ve.pose.z)
        : 0;
      ve.perto = d < PERTO_VEICULO;
      ve.corpo.setEnabled(ve.perto);
      ve.simples.setEnabled(!ve.perto);
      ve.balao?.atualizar(dt);
    }
  }

  /**
   * Depois do recorte da cena (com a câmera que vai desenhar, inclusive a fixa das capturas):
   * as instâncias de rodas e luzes só dos veículos à vista e perto.
   */
  const observador = scene.onAfterActiveMeshesEvaluationObservable.add(() => {
    let nr = 0;
    let nl = 0;
    const planos = scene.frustumPlanes;
    const giro = 0.5 + 0.5 * Math.sin(tempo * 5);
    for (const ve of veiculos) {
      ve.visivel =
        ve.raiz.isEnabled() && !!planos && (ve.perto ? ve.corpo : ve.simples).isInFrustum(planos);
      if (!ve.visivel || !ve.perto) continue;
      const w = ve.corpo.computeWorldMatrix(true);
      const raizM = ve.raiz.getWorldMatrix();
      for (const rd of ve.modelo.rodas) {
        if (nr >= MAX_RODAS) break;
        // o ângulo da roda é o caminho andado (anda para a frente = gira para trás em z)
        const ang = -ve.s / rd.raio;
        // as da frente esterçam (giro em y por cima do giro da roda)
        Quaternion.RotationYawPitchRollToRef(rd.x === ve.eixoFrente ? ve.esterco : 0, 0, ang, tmpQ);
        tmpS.set(rd.raio, rd.raio, rd.raio);
        Matrix.ComposeToRef(tmpS, tmpQ, tmpV.set(rd.x, rd.raio, rd.z), tmpM);
        tmpM.multiplyToRef(raizM, tmpM2);
        tmpM2.copyToArray(matRodas, nr * 16);
        nr++;
      }
      for (const lz of ve.modelo.luzes) {
        if (nl >= MAX_LUZES) break;
        tmpS.set(lz.raio[0], lz.raio[1], lz.raio[2]);
        Matrix.ComposeToRef(tmpS, semGiro, tmpV.set(lz.pos[0], lz.pos[1], lz.pos[2]), tmpM);
        tmpM.multiplyToRef(w, tmpM2);
        tmpM2.copyToArray(matLuzes, nl * 16);
        const c = COR_LUZ[lz.tipo];
        let f = noite;
        if (lz.tipo === 'giroAzul') f = Math.max(0.15, giro);
        if (lz.tipo === 'giroBranco') f = Math.max(0.15, 1 - giro);
        if (lz.tipo === 'giroVermelho') f = Math.max(0.15, giro);
        corLuzes[nl * 4] = c.dia.r + (c.noite.r - c.dia.r) * f;
        corLuzes[nl * 4 + 1] = c.dia.g + (c.noite.g - c.dia.g) * f;
        corLuzes[nl * 4 + 2] = c.dia.b + (c.noite.b - c.dia.b) * f;
        corLuzes[nl * 4 + 3] = 1;
        nl++;
      }
    }
    rodas.thinInstanceCount = nr;
    rodas.thinInstanceBufferUpdated('matrix');
    luzes.thinInstanceCount = nl;
    luzes.thinInstanceBufferUpdated('matrix');
    luzes.thinInstanceBufferUpdated('color');
    // sempre ligadas (com zero instâncias não desenham nada): ligar aqui, depois do recorte,
    // deixava o quadro seguinte sem rodas e sem olhinhos (a malha já tinha ficado de fora da lista)
  });

  /** Caixas sólidas dos veículos perto de (x, z), já no mundo (pedaços do retângulo girado). */
  function caixasPerto(x: number, z: number, raio = 8): CaixaMundo[] {
    const out: CaixaMundo[] = [];
    for (const ve of veiculos) {
      if (!ve.raiz.isEnabled()) continue;
      const p = ve.pose;
      if (Math.abs(p.x - x) > raio + 3 || Math.abs(p.z - z) > raio + 3) continue;
      for (const [x0, x1, hw, h] of ve.m.caixas) {
        // retângulo girado em pedaços de no máximo o quadrado da largura: a caixa de cada
        // pedaço (alinhada aos eixos) quase não sobra fora dele nas curvas
        const comp = x1 - x0;
        const n = Math.max(1, Math.ceil(comp / (2 * hw)));
        const hl = comp / n / 2;
        const ex = Math.abs(p.hx) * hl + Math.abs(p.hz) * hw;
        const ez = Math.abs(p.hz) * hl + Math.abs(p.hx) * hw;
        for (let i = 0; i < n; i++) {
          const fx = x0 + hl * (2 * i + 1);
          const cx = p.x + p.hx * fx;
          const cz = p.z + p.hz * fx;
          out.push([cx - ex, chao, cz - ez, cx + ex, chao + h, cz + ez]);
        }
      }
    }
    return out;
  }

  /**
   * O veículo em que o corpo do boneco (pés em y, meia largura `mw`, altura `h`) encosta de lado
   * (não em cima): o "toc" do esbarrão.
   */
  function encostado(
    x: number,
    y: number,
    z: number,
    mw = 0.3,
    h = 1.8,
    folga = 0.08,
  ): number | null {
    for (const ve of veiculos) {
      if (!ve.raiz.isEnabled()) continue;
      const p = ve.pose;
      if (Math.abs(p.x - x) > 8 || Math.abs(p.z - z) > 8) continue;
      for (const [x0, x1, hw, hc] of ve.m.caixas) {
        if (y >= chao + hc - 0.15 || y + h <= chao) continue;
        // o centro do boneco no jeito do veículo (frente e lado) contra o retângulo da caixa
        const dx = x - p.x;
        const dz = z - p.z;
        const f = dx * p.hx + dz * p.hz;
        const l = -dx * p.hz + dz * p.hx;
        if (f > x0 - mw - folga && f < x1 + mw + folga && Math.abs(l) < hw + mw + folga)
          return ve.def.id;
      }
    }
    return null;
  }

  return {
    quadro,
    caixasPerto,
    encostado,
    /** Um evento do núcleo chegou (buzina: pulinho e balão; sopro: some e surge). */
    evento(id: number, o: string): void {
      const ve = veiculos[id];
      if (!ve) return;
      if (o === 'buzina') {
        ve.pulo = 1;
        ve.balao ??= criarBalao(scene, ve.raiz, ve.m.altura + 0.9, false);
        ve.balao.mostrar('acenar');
      }
      if (o === 'sopro') ve.surgir = 1;
    },
    definirNoite(n: number): void {
      noite = Math.max(0, Math.min(1, n));
    },
    definirLuz(f: number): void {
      pl.definirLuz(f);
    },
    /** Testes e capturas: onde cada veículo está desenhado. */
    lista(): VeiculoNaTela[] {
      return veiculos.map((ve) => ({
        id: ve.def.id,
        tipo: ve.def.tipo,
        x: ve.pose.x,
        z: ve.pose.z,
        yaw: ve.pose.yaw,
        s: ve.s,
        v: ve.v,
        a: ve.a,
        k: ve.k,
        ativo: ve.foraDoChao || ve.raiz.isEnabled(),
        desenhado: ve.raiz.isEnabled(),
        visivel: ve.visivel,
        perto: ve.perto,
      }));
    },
    /**
     * Testes de tela: os veículos desenhados agora com um canto da caixa ou uma roda fora das
     * células de pista (asfalto, faixa, zebra ou a vaga). Vazio: todos na rua.
     */
    foraDaPista(): string[] {
      const out: string[] = [];
      for (const ve of veiculos) {
        if (!ve.raiz.isEnabled()) continue;
        for (const [x, z] of cantosERodas(ve.m, ve.pose))
          if (!pontoNaPista(plano, x, z)) {
            out.push(
              `${ve.def.tipo}#${ve.def.id} s=${ve.s.toFixed(2)} (${x.toFixed(2)}, ${z.toFixed(2)})`,
            );
            break;
          }
      }
      return out;
    },
    /** Testes: a pose de um ponto da volta (a mesma conta do núcleo). */
    poseEm(id: number, s: number): Pose {
      const ve = veiculos[id];
      return poseDoVeiculo(ve.r, ve.m, s);
    },
    /** Desenho: triângulos e chamadas de cada modelo e da cena. */
    custo() {
      const porModelo: Record<string, { triangulos: number; longe: number }> = {};
      for (const ve of veiculos)
        porModelo[ve.def.tipo] = {
          triangulos: ve.corpo.getTotalIndices() / 3,
          longe: ve.simples.getTotalIndices() / 3,
        };
      return {
        porModelo,
        roda: rodas.getTotalIndices() / 3,
        luz: luzes.getTotalIndices() / 3,
        rodasNaTela: rodas.thinInstanceCount,
        luzesNaTela: luzes.thinInstanceCount,
        corposNaTela: veiculos.filter((v) => v.visivel).length,
      };
    },
    descartar(): void {
      scene.onAfterActiveMeshesEvaluationObservable.remove(observador);
      for (const ve of veiculos) {
        ve.balao?.descartar();
        ve.raiz.dispose();
      }
      rodas.dispose();
      luzes.dispose();
      matLuz.dispose();
      pl.descartar();
    },
  };
}

/** Plano de agora de um veículo (testes). */
export { noPlano };
