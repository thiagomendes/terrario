/**
 * Esboço 014d (só com `?esboco=estetica`, na Cidade Grande de verdade): a segunda passada na
 * estética dos veículos. Os três estilos firmes (`render/veiculosMiniatura.ts`: A "Fundido",
 * B "Madeirinha" e C "Miniatura", o escolhido, que já é o do jogo) lado a lado, parados na rua, em
 * fila (a frota inteira de um estilo) e andando na volta deles com o mesmo peso de hoje
 * (suspensão que quica, deita na curva, mergulha ao frear, rodas que esterçam). Os veículos do
 * jogo somem enquanto o esboço está ligado. Nada disto muda o jogo.
 */
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { CreateSphereVertexData } from '@babylonjs/core/Meshes/Builders/sphereBuilder';
import type { Scene } from '@babylonjs/core/scene';
import { criarPlasticos } from '../render/formas';
import type { Luz, Roda } from '../render/veiculosModelos';
import {
  ACELERACAO,
  FREADA,
  FROTA,
  MEDIDAS,
  MODELO_DO_TIPO,
  VEL_RETA,
  poseDoVeiculo,
  rotaDoVeiculo,
  naVolta,
  type Pose,
  type Rota,
  type TipoVeiculo,
} from '../jogo/veiculos';
import { dadosRoda } from '../render/veiculosModelos';
import { ESTILOS, modeloFirme, type IdEstilo, type ModeloMiniatura } from '../render/veiculosMiniatura';

type Versao = IdEstilo;
type Tipo = 'taxi' | 'civil' | 'civilAzul' | 'policia' | 'onibusAzul' | 'sorvete' | 'ambulancia' | 'bombeiros';
type V3 = [number, number, number];

interface Carro {
  tipo: Tipo;
  versao: Versao;
  raiz: TransformNode;
  corpo: Mesh;
  caixa: TransformNode;
  rodas: { esterco: TransformNode; malha: Mesh; r: Roda; frente: boolean }[];
  luzes: { m: Mesh; mat: StandardMaterial; luz: Luz }[];
  entreEixos: number;
  triangulos: number;
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
  /** Parado fora da volta (na fila): não anda pela rota. */
  solto: boolean;
  /** De quem é a volta onde ele está (a vitrine usa duas ruas com vista aberta). */
  rotaDe: Tipo;
}

interface Lugar {
  meio: V3;
  direita: [number, number];
  frente: [number, number];
  comp: number;
}

interface EsbocoEstetica {
  pronto: boolean;
  vitrine(tipo: Tipo, versoes?: Versao[]): Lugar & { centros: V3[] };
  /** A frota inteira de um estilo em fila, numa reta comprida. */
  fila(versao: Versao): Lugar & { pontos: V3[] };
  dirigir(tipo: Tipo, versao: Versao): { parada: V3; curva: V3; frente: [number, number]; direita: [number, number] };
  estado(): { fim: boolean; t: number; s: number; v: number; a: number; fase: string; x: number; z: number };
  noite(ligada: boolean): void;
  esconder(): void;
  custo(): Record<string, Record<string, number>>;
  nomes(): Record<string, string>;
}

declare global {
  interface Window {
    __estetica?: EsbocoEstetica;
  }
}

const ID_DO_TIPO: Record<Tipo, number> = {
  taxi: 4,
  civil: 6,
  civilAzul: 8,
  policia: 1,
  onibusAzul: 2,
  sorvete: 0,
  ambulancia: 7,
  bombeiros: 9,
};
const DO_JOGO: Record<Tipo, TipoVeiculo> = {
  taxi: 'taxi',
  civil: 'civil',
  civilAzul: 'civil',
  policia: 'policia',
  onibusAzul: 'onibusAzul',
  sorvete: 'sorvete',
  ambulancia: 'ambulancia',
  bombeiros: 'bombeiros',
};
const COR: Partial<Record<Tipo, string>> = { civil: '#e8473f', civilAzul: '#3f7fe0' };
const med = (t: Tipo) => MEDIDAS[MODELO_DO_TIPO[DO_JOGO[t]]];
const ORDEM_FILA: Tipo[] = ['bombeiros', 'onibusAzul', 'ambulancia', 'sorvete', 'policia', 'taxi', 'civil', 'civilAzul'];

const COR_LUZ: Record<Luz['tipo'], { dia: Color3; noite: Color3 }> = {
  farol: { dia: Color3.FromHexString('#f4f0e2'), noite: new Color3(1.35, 1.25, 0.9) },
  lanterna: { dia: Color3.FromHexString('#d8443c'), noite: new Color3(1.3, 0.35, 0.28) },
  giroAzul: { dia: Color3.FromHexString('#6fa8ff'), noite: new Color3(0.5, 0.85, 1.5) },
  giroBranco: { dia: Color3.FromHexString('#e9f1ff'), noite: new Color3(1.3, 1.35, 1.45) },
  giroVermelho: { dia: Color3.FromHexString('#ff6a5e'), noite: new Color3(1.45, 0.4, 0.32) },
};

function modelo(tipo: Tipo, versao: Versao): ModeloMiniatura {
  return modeloFirme(DO_JOGO[tipo], versao, COR[tipo] ?? '#3f7fe0');
}

export function prepararEsbocoEstetica(): void {
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
  const pl = criarPlasticos(scene, 'estetica');
  // o mesmo plástico de vinil dos veículos do jogo
  const mat = pl.corVertice(0.45) ?? pl.cor('#ffffff', 0.45);
  const roda = new Mesh('estetica-roda', scene);
  dadosRoda().applyToMesh(roda);
  roda.material = mat;
  roda.isPickable = false;
  roda.setEnabled(false);
  const rodaTri = (roda.getTotalIndices() / 3) | 0;
  let noite = false;
  let piscar = 0;
  const carros = new Map<string, Carro>();

  function montar(tipo: Tipo, versao: Versao, extra = ''): Carro {
    const k = `${tipo}|${versao}${extra}`;
    const ja = carros.get(k);
    if (ja) return ja;
    const md = modelo(tipo, versao);
    const raiz = new TransformNode(`estetica-${k}`, scene);
    const caixa = new TransformNode(`estetica-${k}-caixa`, scene);
    caixa.parent = raiz;
    const corpo = new Mesh(`estetica-${k}-corpo`, scene);
    md.corpo.applyToMesh(corpo);
    corpo.material = mat;
    corpo.isPickable = false;
    corpo.parent = caixa;
    const luzes = md.luzes.map((luz, i) => {
      const lm = new Mesh(`estetica-${k}-luz${i}`, scene);
      CreateSphereVertexData({ diameter: 2, segments: 6 }).applyToMesh(lm);
      const lmat = new StandardMaterial(`estetica-${k}-luz${i}`, scene);
      lmat.disableLighting = true;
      lmat.emissiveColor = (noite ? COR_LUZ[luz.tipo].noite : COR_LUZ[luz.tipo].dia).clone();
      lm.material = lmat;
      lm.parent = caixa;
      lm.position.set(...luz.pos);
      lm.scaling.set(...luz.raio);
      lm.isPickable = false;
      return { m: lm, mat: lmat, luz };
    });
    const eixoFrente = Math.max(...md.rodas.map((r) => r.x));
    const rodas = md.rodas.map((r, i) => {
      const esterco = new TransformNode(`estetica-${k}-esterco${i}`, scene);
      esterco.parent = raiz;
      esterco.position.set(r.x, r.raio, r.z);
      const malha = roda.clone(`estetica-${k}-roda${i}`, esterco) as Mesh;
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
      entreEixos: md.entreEixos,
      triangulos: md.triangulos,
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
      solto: false,
      rotaDe: tipo,
    };
    carros.set(k, c);
    return c;
  }

  const rotas = new Map<Tipo, Rota>();
  const rota = (tipo: Tipo) => {
    let r = rotas.get(tipo);
    if (!r) rotas.set(tipo, (r = rotaDoVeiculo(plano, FROTA.find((f) => f.id === ID_DO_TIPO[tipo])!)));
    return r;
  };

  const tmpP: Pose = { x: 0, z: 0, hx: 1, hz: 0, yaw: 0 };
  function curvaturaEsq(r: Rota, tipo: Tipo, s: number): number {
    const m = med(tipo);
    const d = 0.25;
    const a = poseDoVeiculo(r, m, s - d, { ...tmpP });
    const b = poseDoVeiculo(r, m, s + d, { ...tmpP });
    const dhx = (b.hx - a.hx) / (2 * d);
    const dhz = (b.hz - a.hz) / (2 * d);
    const p = poseDoVeiculo(r, m, s, { ...tmpP });
    return dhx * -p.hz + dhz * p.hx;
  }

  /**
   * Põe o carro em s e aplica o peso, igual ao jogo de hoje (render/veiculos.ts, aprovado no
   * 014c): molas com pouco amortecimento, deita na curva, mergulha ao frear, as rodas da frente
   * esterçam e as rodas giram na velocidade certa.
   */
  function colocar(c: Carro, dt: number): void {
    if (c.solto) return;
    const r = rota(c.rotaDe);
    const m = med(c.tipo);
    poseDoVeiculo(r, m, c.s, c.pose);
    c.raiz.position.set(c.pose.x, chao, c.pose.z);
    c.raiz.rotation.y = c.pose.yaw;
    for (const w of c.rodas) w.malha.rotation.z = -c.s / w.r.raio;
    const kEsq = curvaturaEsq(r, c.tipo, c.s);
    const aLado = c.v * c.v * kEsq;
    const w = Math.PI * 2 * 1.7;
    const z = 0.34;
    const mola = (x: number, v: number, alvo: number) => (alvo - x) * w * w - 2 * z * w * v;
    const alvoPitch = Math.max(-0.075, Math.min(0.06, c.a * 0.032));
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
    c.caixa.setPivotPoint(new Vector3(0, m.raioRoda, 0));
    c.caixa.position.y = c.heave;
    c.caixa.rotation.z = c.pitch;
    c.caixa.rotation.x = c.roll;
    const alvoEst = Math.max(-0.5, Math.min(0.5, -Math.atan(c.entreEixos * kEsq)));
    c.esterco += (alvoEst - c.esterco) * Math.min(1, dt * 10);
    for (const wr of c.rodas) if (wr.frente) wr.esterco.rotation.y = c.esterco;
  }

  interface Volta {
    c: Carro;
    t: number;
    fase: 'chegando' | 'freando' | 'parado' | 'arrancando' | 'saindo' | 'fim';
    sParada: number;
    sCurva1: number;
    vCurva: number;
    espera: number;
  }
  let volta: Volta | null = null;

  function trechoComZebraAntesDaCurva(r: Rota) {
    for (const minimo of [14, 0])
      for (let i = 0; i < r.trechos.length; i++) {
        const t = r.trechos[i];
        const prox = r.trechos[(i + 1) % r.trechos.length];
        if (t.tipo === 'reta' && t.zebra && prox.tipo === 'arco' && t.comp >= minimo) return { t, prox };
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
          const falta = Math.max(0.001, vt.sParada - c.s);
          c.a = -(c.v * c.v) / (2 * falta);
          if (c.v <= 0.04 || falta < 0.01) {
            c.v = 0;
            c.a = 0;
            c.s = vt.sParada;
            vt.fase = 'parado';
            vt.espera = 1.4;
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
          if (c.s >= vt.sCurva1 + 8) vt.fase = 'fim';
          break;
      }
      c.v = Math.max(0, c.v + c.a * dt);
      c.s += c.v * dt;
    }
    for (const c of carros.values()) if (c.raiz.isEnabled()) colocar(c, dt);
    piscar += dt;
    const fase = 0.5 + 0.5 * Math.sin(piscar * 4.5);
    for (const c of carros.values()) {
      if (!c.raiz.isEnabled()) continue;
      for (const l of c.luzes) {
        if (!l.luz.tipo.startsWith('giro')) continue;
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
  function semJogo() {
    for (const m of scene.meshes)
      if (m.name.startsWith('veiculo') && !m.name.startsWith('estetica')) m.isVisible = false;
  }
  const zerar = (c: Carro) => {
    c.v = 0;
    c.a = 0;
    c.pitch = c.pitchV = c.roll = c.rollV = c.heave = c.heaveV = c.esterco = 0;
    for (const w of c.rodas) w.esterco.rotation.y = 0;
    c.caixa.position.y = 0;
    c.caixa.rotation.set(0, 0, 0);
  };

  const api: EsbocoEstetica = {
    pronto: true,
    vitrine(tipo, versoes = ['A', 'B', 'C']) {
      semJogo();
      esconderTodos();
      volta = null;
      // a vitrine: a reta comprida da polícia (os pequenos) ou dos bombeiros (os grandes), que
      // têm a praça do outro lado (a câmera cabe sem entrar nos prédios)
      const g = tipo === 'onibusAzul' || tipo === 'bombeiros';
      const base: Tipo = g ? 'bombeiros' : 'policia';
      const r = rota(base);
      const m = med(tipo);
      const reta = r.trechos
        .filter((t) => t.tipo === 'reta' && t.pista !== undefined)
        .sort((a, b) => b.comp - a.comp)[0];
      const meio = reta.s0 + reta.comp / 2;
      const passo = m.meioComp * 2 + 1.5;
      const centros: V3[] = [];
      versoes.forEach((v, i) => {
        const c = montar(tipo, v);
        c.raiz.setEnabled(true);
        c.solto = false;
        c.rotaDe = base;
        // o primeiro da lista fica na frente (A, depois B e C para trás)
        c.s = meio + ((versoes.length - 1) / 2 - i) * passo;
        zerar(c);
        colocar(c, 0);
        centros.push([c.pose.x, chao, c.pose.z]);
      });
      const p = poseDoVeiculo(r, m, meio);
      return { meio: [p.x, chao, p.z], direita: [p.hz, -p.hx], frente: [p.hx, p.hz], comp: passo * versoes.length, centros };
    },
    fila(versao) {
      semJogo();
      esconderTodos();
      volta = null;
      // a reta mais comprida das voltas de todos
      let melhor: { r: Rota; s0: number; comp: number; tipo: Tipo } | null = null;
      for (const t of ORDEM_FILA) {
        const r = rota(t);
        for (const tr of r.trechos)
          if (tr.tipo === 'reta' && tr.pista !== undefined && (!melhor || tr.comp > melhor.comp))
            melhor = { r, s0: tr.s0, comp: tr.comp, tipo: t };
      }
      const b = melhor!;
      const p0 = poseDoVeiculo(b.r, med(b.tipo), b.s0 + b.comp / 2);
      const hx = p0.hx;
      const hz = p0.hz;
      const comps = ORDEM_FILA.map((t) => med(t).meioComp * 2);
      const folga = 1.1;
      const total = comps.reduce((a, c) => a + c, 0) + folga * (comps.length - 1);
      // do mais à frente para trás, centrado no meio da reta
      let d = total / 2;
      const pontos: V3[] = [];
      ORDEM_FILA.forEach((t, i) => {
        const c = montar(t, versao, '|fila');
        c.raiz.setEnabled(true);
        c.solto = true;
        zerar(c);
        const centro = d - comps[i] / 2;
        d -= comps[i] + folga;
        const x = p0.x + hx * centro;
        const z = p0.z + hz * centro;
        c.raiz.position.set(x, chao, z);
        c.raiz.rotation.y = p0.yaw;
        for (const w of c.rodas) w.malha.rotation.z = 0;
        pontos.push([x, chao, z]);
      });
      return { meio: [p0.x, chao, p0.z], direita: [hz, -hx], frente: [hx, hz], comp: total, pontos };
    },
    dirigir(tipo, versao) {
      semJogo();
      esconderTodos();
      const r = rota(tipo);
      const m = med(tipo);
      const { t, prox } = trechoComZebraAntesDaCurva(r);
      const sParada = t.s0 + t.comp - (t.zebra ?? 1) - m.meioComp - 0.25;
      const c = montar(tipo, versao, '|anda');
      c.raiz.setEnabled(true);
      c.solto = false;
      c.rotaDe = tipo;
      zerar(c);
      c.s = sParada - 11;
      c.v = VEL_RETA;
      volta = { c, t: 0, fase: 'chegando', sParada, sCurva1: prox.s0 + prox.comp, vCurva: prox.vmax, espera: 0 };
      colocar(c, 0);
      const pp = poseDoVeiculo(r, m, sParada);
      const pc = poseDoVeiculo(r, m, naVolta(r, prox.s0 + prox.comp / 2));
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
        for (const l of c.luzes) l.mat.emissiveColor.copyFrom(noite ? COR_LUZ[l.luz.tipo].noite : COR_LUZ[l.luz.tipo].dia);
    },
    esconder() {
      esconderTodos();
      volta = null;
    },
    custo() {
      const out: Record<string, Record<string, number>> = {};
      for (const tipo of ORDEM_FILA) {
        const linha: Record<string, number> = { roda: rodaTri, rodas: 0, luzes: 0 };
        for (const v of ['A', 'B', 'C'] as Versao[]) {
          const md = modelo(tipo, v);
          linha[v] = md.triangulos;
          linha[`luzes${v}`] = md.luzes.length;
          linha.rodas = md.rodas.length;
        }
        out[tipo] = linha;
      }
      return out;
    },
    nomes() {
      return { A: ESTILOS.A.nome, B: ESTILOS.B.nome, C: ESTILOS.C.nome };
    },
  };
  window.__estetica = api;
}
