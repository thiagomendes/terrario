/**
 * Esboço 014c (só com `?esboco=refino`, na Cidade Grande de verdade): o veículo de hoje ao
 * lado do refinado (táxi, ônibus e sorvete), parados na rua e andando na volta deles: chega,
 * freia na zebra, espera, arranca e faz a curva. O de hoje anda como no jogo (só o balanço de
 * frear e arrancar); o refinado tem peso: suspensão que quica, a carroceria que deita na curva,
 * o nariz que mergulha ao frear e agacha ao arrancar, as rodas da frente que esterçam e as rodas
 * girando na velocidade certa. Os veículos do jogo somem enquanto o esboço está ligado. Nada
 * disto muda o jogo.
 */
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { CreateSphereVertexData } from '@babylonjs/core/Meshes/Builders/sphereBuilder';
import type { Scene } from '@babylonjs/core/scene';
import type { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { criarPlasticos } from '../render/formas';
import { dadosRoda, modeloDoVeiculoAntigo, type Luz, type Roda } from '../render/veiculosModelos';
import {
  ACELERACAO,
  FREADA,
  FROTA,
  MEDIDAS,
  MODELO_DO_TIPO,
  VEL_RETA,
  poseDoVeiculo,
  rotaDoVeiculo,
  trechoEm,
  naVolta,
  type Pose,
  type Rota,
  type TipoVeiculo,
} from '../jogo/veiculos';
import { dadosRodaRefinada, modeloRefinado, type TipoRefinado } from '../render/veiculosRefinados';

type Versao = 'atual' | 'refinado' | 'cara';
type V3 = [number, number, number];

interface Carro {
  tipo: TipoRefinado;
  versao: Versao;
  raiz: TransformNode;
  corpo: Mesh;
  /** Nó da carroceria (balança em volta do meio, na altura dos eixos). */
  caixa: TransformNode;
  rodas: { esterco: TransformNode; malha: Mesh; r: Roda; frente: boolean }[];
  luzes: { m: Mesh; mat: StandardMaterial; luz: Luz }[];
  entreEixos: number;
  triangulos: number;
  rodaTri: number;
  // dinâmica
  s: number;
  v: number;
  a: number;
  pitch: number;
  pitchV: number;
  roll: number;
  rollV: number;
  heave: number;
  heaveV: number;
  esterco: number;
  pose: Pose;
}

interface EsbocoRefino {
  pronto: boolean;
  /** Os dois (hoje e refinado) parados um atrás do outro numa reta da volta do tipo. */
  vitrine(
    tipo: TipoRefinado,
    versoes?: Versao[],
  ): { meio: V3; direita: [number, number]; frente: [number, number]; comp: number };
  /** Anda pela volta: chega, freia na zebra, espera, arranca e faz a curva. */
  dirigir(tipo: TipoRefinado, versao: Versao): { parada: V3; curva: V3; frente: [number, number]; direita: [number, number] };
  estado(): { fim: boolean; t: number; s: number; v: number; a: number; fase: string; x: number; z: number };
  noite(ligada: boolean): void;
  esconder(): void;
  custo(): Record<
    string,
    { atual: number; refinado: number; cara: number; rodaAtual: number; rodaRefinada: number; luzes: number }
  >;
}

declare global {
  interface Window {
    __refino?: EsbocoRefino;
  }
}

/** A volta de cada um (a ambulância e os bombeiros entram nas voltas de dois carros comuns). */
const ID_DO_TIPO: Record<TipoRefinado, number> = {
  taxi: 4,
  civil: 6,
  onibusAzul: 2,
  sorvete: 0,
  ambulancia: 7,
  bombeiros: 9,
};
/** O tipo do jogo de hoje com as mesmas medidas (a ambulância é do tamanho do sorvete; os bombeiros, do ônibus). */
const DO_JOGO: Record<TipoRefinado, TipoVeiculo> = {
  taxi: 'taxi',
  civil: 'civil',
  onibusAzul: 'onibusAzul',
  sorvete: 'sorvete',
  ambulancia: 'sorvete',
  bombeiros: 'onibusAzul',
};
const med = (t: TipoRefinado) => MEDIDAS[MODELO_DO_TIPO[DO_JOGO[t]]];

const COR_LUZ: Record<Luz['tipo'], { dia: Color3; noite: Color3 }> = {
  farol: { dia: Color3.FromHexString('#f4f0e2'), noite: new Color3(1.35, 1.25, 0.9) },
  lanterna: { dia: Color3.FromHexString('#d8443c'), noite: new Color3(1.3, 0.35, 0.28) },
  giroAzul: { dia: Color3.FromHexString('#6fa8ff'), noite: new Color3(0.5, 0.85, 1.5) },
  giroBranco: { dia: Color3.FromHexString('#e9f1ff'), noite: new Color3(1.3, 1.35, 1.45) },
  giroVermelho: { dia: Color3.FromHexString('#ff6a5e'), noite: new Color3(1.45, 0.4, 0.32) },
};

export function prepararEsbocoRefino(): void {
  const esperar = () => {
    const e = window.__brumaluz;
    if (e?.ready && e.cenaBabylon && e.cidade?.()) ligar(e.cenaBabylon() as Scene);
    else setTimeout(esperar, 250);
  };
  esperar();
}

function ligar(scene: Scene): void {
  const e = window.__brumaluz!;
  const plano = e.cidade!()!;
  const chao = plano.h + 1;
  const pl = criarPlasticos(scene, 'refino');
  const mat = pl.corVertice(0.45) ?? pl.cor('#ffffff', 0.45);
  const molde = (vd: VertexData, nome: string) => {
    const m = new Mesh(nome, scene);
    vd.applyToMesh(m);
    m.material = mat;
    m.isPickable = false;
    m.setEnabled(false);
    return m;
  };
  const rodaHoje = molde(dadosRoda(), 'refino-roda-hoje');
  const rodaNova = molde(dadosRodaRefinada(), 'refino-roda-nova');
  let noite = false;
  let piscar = 0;
  const carros = new Map<string, Carro>();

  function montar(tipo: TipoRefinado, versao: Versao): Carro {
    const k = `${tipo}|${versao}`;
    const ja = carros.get(k);
    if (ja) return ja;
    const hoje = modeloDoVeiculoAntigo(DO_JOGO[tipo], tipo === 'civil' ? '#3f7fe0' : undefined);
    const novo = versao === 'atual' ? null : modeloRefinado(tipo, versao === 'cara' ? 'cara' : 'limpa');
    const m = med(tipo);
    const raiz = new TransformNode(`refino-${k}`, scene);
    const caixa = new TransformNode(`refino-${k}-caixa`, scene);
    caixa.parent = raiz;
    const corpo = new Mesh(`refino-${k}-corpo`, scene);
    (novo ? novo.corpo : hoje.corpo).applyToMesh(corpo);
    corpo.material = mat;
    corpo.isPickable = false;
    corpo.parent = caixa;
    const luzes = (novo ? novo.luzes : hoje.luzes).map((luz, i) => {
      const lm = new Mesh(`refino-${k}-luz${i}`, scene);
      CreateSphereVertexData({ diameter: 2, segments: 6 }).applyToMesh(lm);
      const lmat = new StandardMaterial(`refino-${k}-luz${i}`, scene);
      lmat.disableLighting = true;
      lmat.emissiveColor = (noite ? COR_LUZ[luz.tipo].noite : COR_LUZ[luz.tipo].dia).clone();
      lm.material = lmat;
      lm.parent = caixa;
      lm.position.set(...luz.pos);
      lm.scaling.set(...luz.raio);
      lm.isPickable = false;
      return { m: lm, mat: lmat, luz };
    });
    const eixoFrente = Math.max(...(novo ? novo.rodas : hoje.rodas).map((r) => r.x));
    const rodas = (novo ? novo.rodas : hoje.rodas).map((r, i) => {
      const esterco = new TransformNode(`refino-${k}-esterco${i}`, scene);
      esterco.parent = raiz;
      esterco.position.set(r.x, r.raio, r.z);
      const malha = (novo ? rodaNova : rodaHoje).clone(`refino-${k}-roda${i}`, esterco) as Mesh;
      malha.setEnabled(true);
      malha.position.setAll(0);
      malha.scaling.setAll(r.raio);
      return { esterco, malha, r, frente: r.x === eixoFrente };
    });
    const c: Carro = {
      tipo,
      versao,
      raiz,
      corpo,
      caixa,
      rodas,
      luzes,
      entreEixos: novo ? novo.entreEixos : m.eixos[1] - m.eixos[0],
      triangulos: (novo ? novo.corpo : hoje.corpo).indices!.length / 3,
      rodaTri: ((novo ? rodaNova : rodaHoje).getTotalIndices() / 3) | 0,
      s: 0,
      v: 0,
      a: 0,
      pitch: 0,
      pitchV: 0,
      roll: 0,
      rollV: 0,
      heave: 0,
      heaveV: 0,
      esterco: 0,
      pose: { x: 0, z: 0, hx: 1, hz: 0, yaw: 0 },
    };
    carros.set(k, c);
    return c;
  }

  const rotas = new Map<TipoRefinado, Rota>();
  const rota = (tipo: TipoRefinado) => {
    let r = rotas.get(tipo);
    if (!r) rotas.set(tipo, (r = rotaDoVeiculo(plano, FROTA.find((f) => f.id === ID_DO_TIPO[tipo])!)));
    return r;
  };

  const tmpP: Pose = { x: 0, z: 0, hx: 1, hz: 0, yaw: 0 };
  /** Curvatura para a esquerda (1/raio; negativa = curva à direita) em s. */
  function curvaturaEsq(r: Rota, tipo: TipoRefinado, s: number): number {
    const m = med(tipo);
    const d = 0.25;
    const a = poseDoVeiculo(r, m, s - d, { ...tmpP });
    const b = poseDoVeiculo(r, m, s + d, { ...tmpP });
    // derivada do rumo projetada na esquerda (-hz, hx)
    const dhx = (b.hx - a.hx) / (2 * d);
    const dhz = (b.hz - a.hz) / (2 * d);
    const p = poseDoVeiculo(r, m, s, { ...tmpP });
    return dhx * -p.hz + dhz * p.hx;
  }

  /** Põe o carro em s (pose, rodas girando pelo caminho) e aplica a dinâmica. */
  function colocar(c: Carro, dt: number): void {
    const r = rota(c.tipo);
    const m = med(c.tipo);
    poseDoVeiculo(r, m, c.s, c.pose);
    c.raiz.position.set(c.pose.x, chao, c.pose.z);
    c.raiz.rotation.y = c.pose.yaw;
    for (const w of c.rodas) w.malha.rotation.z = -c.s / w.r.raio;
    if (c.versao === 'atual') {
      // o balanço de hoje (render/veiculos.ts): só frear e arrancar, mola até o ângulo
      const alvo = Math.max(-0.06, Math.min(0.05, c.a * 0.028));
      c.pitchV += ((alvo - c.pitch) * 90 - c.pitchV * 12) * dt;
      c.pitch += c.pitchV * dt;
      const eixo = c.pitch < 0 ? m.eixos[1] : m.eixos[0];
      c.corpo.setPivotPoint(new Vector3(eixo, 0.3, 0));
      c.corpo.rotation.z = c.pitch;
      return;
    }
    // refinado: o peso. Aceleração de lado (v²·curvatura) e da frente (a), molas com pouco
    // amortecimento (quica uma vez e assenta), como brinquedo de corda.
    const kEsq = curvaturaEsq(r, c.tipo, c.s);
    const aLado = c.v * c.v * kEsq;
    const w = Math.PI * 2 * 1.7;
    const z = 0.34;
    const mola = (x: number, v: number, alvo: number) => (alvo - x) * w * w - 2 * z * w * v;
    const alvoPitch = Math.max(-0.075, Math.min(0.06, c.a * 0.032));
    // deita para fora da curva (na curva à direita, o lado esquerdo desce)
    const alvoRoll = Math.max(-0.085, Math.min(0.085, -aLado * 0.055));
    const ruido = c.v > 0.05 ? Math.sin(c.s * 2.9) * 0.004 + Math.sin(c.s * 7.3) * 0.002 : 0;
    const alvoHeave = -Math.abs(c.a) * 0.006 - Math.abs(aLado) * 0.004 + ruido;
    const passos = Math.max(1, Math.ceil(dt / 0.008));
    const h = dt / passos;
    for (let i = 0; i < passos; i++) {
      c.pitchV += mola(c.pitch, c.pitchV, alvoPitch) * h;
      c.pitch += c.pitchV * h;
      c.rollV += mola(c.roll, c.rollV, alvoRoll) * h;
      c.roll += c.rollV * h;
      c.heaveV += mola(c.heave, c.heaveV, alvoHeave) * h;
      c.heave += c.heaveV * h;
    }
    const alto = med(c.tipo).raioRoda;
    c.caixa.setPivotPoint(new Vector3(0, alto, 0));
    c.caixa.position.y = c.heave;
    c.caixa.rotation.z = c.pitch;
    c.caixa.rotation.x = c.roll;
    // rodas da frente esterçam para dentro da curva (com teto: brinquedo, não carro de corrida)
    const alvoEst = Math.max(-0.5, Math.min(0.5, -Math.atan(c.entreEixos * kEsq)));
    c.esterco += (alvoEst - c.esterco) * Math.min(1, dt * 10);
    for (const wr of c.rodas) if (wr.frente) wr.esterco.rotation.y = c.esterco;
  }

  // ------------------------------------------------------------------ a volta de teste
  interface Volta {
    c: Carro;
    t: number;
    fase: 'chegando' | 'freando' | 'parado' | 'arrancando' | 'curva' | 'saindo' | 'fim';
    sParada: number;
    sCurva0: number;
    sCurva1: number;
    vCurva: number;
    espera: number;
  }
  let volta: Volta | null = null;

  function trechoComZebraAntesDaCurva(r: Rota) {
    for (let i = 0; i < r.trechos.length; i++) {
      const t = r.trechos[i];
      const prox = r.trechos[(i + 1) % r.trechos.length];
      if (t.tipo === 'reta' && t.zebra && prox.tipo === 'arco' && t.comp >= 14) return { t, prox };
    }
    for (let i = 0; i < r.trechos.length; i++) {
      const t = r.trechos[i];
      const prox = r.trechos[(i + 1) % r.trechos.length];
      if (t.tipo === 'reta' && t.zebra && prox.tipo === 'arco') return { t, prox };
    }
    throw new Error('sem zebra antes de curva');
  }

  scene.onBeforeRenderObservable.add(() => {
    const dt = Math.min(0.05, scene.getEngine().getDeltaTime() / 1000);
    if (volta && volta.fase !== 'fim') {
      const vt = volta;
      const c = vt.c;
      vt.t += dt;
      const frearEm = vt.sParada - (VEL_RETA * VEL_RETA) / (2 * FREADA);
      switch (vt.fase) {
        case 'chegando':
          c.a = 0;
          c.v = VEL_RETA;
          if (c.s >= frearEm) vt.fase = 'freando';
          break;
        case 'freando': {
          // freada que para certinho antes da zebra
          const falta = Math.max(0.001, vt.sParada - c.s);
          c.a = -(c.v * c.v) / (2 * falta);
          if (c.v <= 0.04 || falta < 0.01) {
            c.v = 0;
            c.a = 0;
            c.s = vt.sParada;
            vt.fase = 'parado';
            vt.espera = 1.8;
          }
          break;
        }
        case 'parado':
          c.a = 0;
          c.v = 0;
          vt.espera -= dt;
          if (vt.espera <= 0) vt.fase = 'arrancando';
          break;
        case 'arrancando':
          c.a = c.v < vt.vCurva ? ACELERACAO : 0;
          if (c.v >= vt.vCurva) c.v = vt.vCurva;
          if (c.s >= vt.sCurva1) vt.fase = 'saindo';
          break;
        case 'saindo':
          c.a = c.v < VEL_RETA ? ACELERACAO : 0;
          if (c.v >= VEL_RETA) c.v = VEL_RETA;
          if (c.s >= vt.sCurva1 + 9) vt.fase = 'fim';
          break;
      }
      c.v = Math.max(0, c.v + c.a * dt);
      c.s += c.v * dt;
    }
    for (const c of carros.values()) if (c.raiz.isEnabled()) colocar(c, dt);
    // as luzinhas do teto (ambulância e bombeiros) piscam macio, uma de cada vez
    piscar += dt;
    const fase = 0.5 + 0.5 * Math.sin(piscar * 4.5);
    for (const c of carros.values()) {
      if (!c.raiz.isEnabled() || (c.tipo !== 'ambulancia' && c.tipo !== 'bombeiros')) continue;
      const alto = med(c.tipo).altura * 0.6;
      for (const l of c.luzes) {
        if (l.luz.pos[1] < alto) continue;
        const f = l.luz.tipo === 'giroBranco' ? 1 - fase : fase;
        const cor = COR_LUZ[l.luz.tipo];
        l.mat.emissiveColor.copyFrom(cor.dia).scaleInPlace(0.55 + 0.45 * f);
        if (f > 0.5) l.mat.emissiveColor.addInPlace(cor.noite.scale((f - 0.5) * 0.8));
      }
    }
  });

  function esconderTodos() {
    for (const c of carros.values()) c.raiz.setEnabled(false);
  }
  /** Os veículos do jogo somem (o esboço desenha os seus). */
  function semJogo() {
    for (const m of scene.meshes)
      if (m.name.startsWith('veiculo') && !m.name.startsWith('refino')) m.isVisible = false;
  }

  const api: EsbocoRefino = {
    pronto: true,
    vitrine(tipo, versoes = ['atual', 'refinado']) {
      semJogo();
      esconderTodos();
      volta = null;
      const r = rota(tipo);
      const m = med(tipo);
      const reta = r.trechos
        .filter((t) => t.tipo === 'reta' && t.pista !== undefined)
        .sort((a, b) => b.comp - a.comp)[0];
      const meio = reta.s0 + reta.comp / 2;
      const passo = m.meioComp * 2 + 1.8;
      const lugares: [Versao, number][] = versoes.map((v, i) => [
        v,
        meio + (i - (versoes.length - 1) / 2) * passo,
      ]);
      for (const [v, s] of lugares) {
        const c = montar(tipo, v);
        c.raiz.setEnabled(true);
        c.s = s;
        c.v = 0;
        c.a = 0;
        c.pitch = c.pitchV = c.roll = c.rollV = c.heave = c.heaveV = c.esterco = 0;
        colocar(c, 0);
      }
      const p = poseDoVeiculo(r, m, meio);
      return {
        meio: [p.x, chao, p.z],
        direita: [p.hz, -p.hx],
        frente: [p.hx, p.hz],
        comp: m.meioComp * 2,
      };
    },
    dirigir(tipo, versao) {
      semJogo();
      esconderTodos();
      const r = rota(tipo);
      const m = med(tipo);
      const { t, prox } = trechoComZebraAntesDaCurva(r);
      const sParada = t.s0 + t.comp - (t.zebra ?? 1) - m.meioComp - 0.25;
      const c = montar(tipo, versao);
      c.raiz.setEnabled(true);
      c.s = sParada - 13;
      c.v = VEL_RETA;
      c.a = 0;
      c.pitch = c.pitchV = c.roll = c.rollV = c.heave = c.heaveV = c.esterco = 0;
      volta = {
        c,
        t: 0,
        fase: 'chegando',
        sParada,
        sCurva0: prox.s0,
        sCurva1: prox.s0 + prox.comp,
        vCurva: prox.vmax,
        espera: 0,
      };
      colocar(c, 0);
      const pp = poseDoVeiculo(r, m, sParada);
      const pc = poseDoVeiculo(r, m, naVolta(r, prox.s0 + prox.comp / 2));
      void trechoEm;
      return {
        parada: [pp.x, chao, pp.z],
        curva: [pc.x, chao, pc.z],
        frente: [pp.hx, pp.hz],
        direita: [pp.hz, -pp.hx],
      };
    },
    estado() {
      const vt = volta;
      if (!vt) return { fim: true, t: 0, s: 0, v: 0, a: 0, fase: 'nada', x: 0, z: 0 };
      const c = vt.c;
      return { fim: vt.fase === 'fim', t: vt.t, s: c.s, v: c.v, a: c.a, fase: vt.fase, x: c.pose.x, z: c.pose.z };
    },
    noite(ligada) {
      noite = ligada;
      e.pausarDia = true;
      e.hora = ligada ? 0.96 : 0.42;
      for (const c of carros.values())
        for (const l of c.luzes) {
          const cor = COR_LUZ[l.luz.tipo];
          l.mat.emissiveColor.copyFrom(noite ? cor.noite : cor.dia);
        }
    },
    esconder() {
      esconderTodos();
      volta = null;
    },
    custo() {
      const out: ReturnType<EsbocoRefino['custo']> = {};
      for (const tipo of ['taxi', 'civil', 'onibusAzul', 'sorvete', 'ambulancia', 'bombeiros'] as const) {
        // a ambulância e os bombeiros entram no lugar de um carro comum: o de hoje é ele
        const a = montar(tipo === 'ambulancia' || tipo === 'bombeiros' ? 'civil' : tipo, 'atual');
        const b = montar(tipo, 'refinado');
        const c = montar(tipo, 'cara');
        out[tipo] = {
          atual: a.triangulos,
          refinado: b.triangulos,
          cara: c.triangulos,
          rodaAtual: a.rodaTri,
          rodaRefinada: b.rodaTri,
          luzes: b.luzes.length,
        };
        for (const x of [a, b, c]) x.raiz.setEnabled(false);
      }
      return out;
    },
  };
  window.__refino = api;
}
