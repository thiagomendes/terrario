/**
 * Spec 032: a compra na barraca, na tela (todos veem a mesma entrega). O núcleo manda
 * `vilaCompra` no toque e põe o lanche na barrinha quando ele chega na mão (`CHEGA_NA_MAO`);
 * aqui fica a coreografia, que uma criança de 3 anos lê sem palavras:
 *
 * 1. **A fichinha** (0 a 0,5 s): a criança estica o braço e a fichinha dourada com estrela pula
 *    da mão dela para a mão da vendedora ("tlim").
 * 2. **O preparo** (0,5 a 1,1 s): a barraca do seu jeito (a pipoca estoura, a cuba do
 *    algodão-doce gira, o liquidificador bate; a Bia pega o lanche no balcão) e o lanche aparece
 *    na mão da vendedora.
 * 3. **A entrega** (1,1 a 1,55 s): a vendedora estica o braço, a criança estica o dela, e o lanche
 *    dá um pulinho até a mão da criança.
 * 4. **Chegou:** o núcleo põe o lanche na barrinha (a mão mostra), e a vendedora acena.
 *
 * Com a barrinha cheia, a vendedora mostra as mãos vazias (nada sai da mão de ninguém).
 */
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { Scene } from '@babylonjs/core/scene';
import type { Pose, CamadaPose } from '../../personagem/poses';
import { aplicarJuntas, type Juntas } from '../../personagem/gestos';
import { CHEGA_NA_MAO, type Balcao } from '../../jogo/compra';
import { cilindro, criarPlasticos } from '../formas';
import { modeloNaMao, type ModeloItem } from '../itensBrinquedo';
import { prisma } from '../refeicao';
import type { Personagem } from '../personagem';

/** Quem está na entrega: o boneco e quem põe a camada de pose nele. */
export interface NaEntrega {
  boneco: Pick<Personagem, 'raiz' | 'noDaMao' | 'ocuparMao' | 'definirNaMao'>;
  animador: { definirCamada(c: CamadaPose | null): void };
}

export interface OpcoesCompras {
  balcoes: readonly Balcao[];
  /** Quem comprou (a criança deste aparelho ou um amigo), se está à vista. */
  comprador(id: string): NaEntrega | null;
  /** A vendedora (o morador `n` do bairro), se está à vista. */
  vendedora(n: number): NaEntrega | null;
  /** O preparo da barraca (a pipoca, a cuba, o liquidificador) e o som dele. */
  preparo(b: Balcao, i: number): void;
  /** A vendedora acena (o gesto de sempre, com o balãozinho). */
  aceno(n: number): void;
  /** Os sons da entrega: a fichinha ("tlim") e o lanche que pula ("puf" macio). */
  som(qual: 'fichinha' | 'pulo' | 'vazias', onde: Vector3): void;
  /** Cada malha nova (fora do brilho do mundo). */
  preparar?(m: Mesh): void;
}

/** Os tempos da coreografia (s, do toque). */
const FICHA_SAI = 0.3;
const FICHA_CHEGA = 0.62;
const PEGA_NO_BALCAO = 0.62;
const NA_MAO_DELA = 0.85;
const ESTICA = 1.1;
const PULA = 1.38;
const CHEGA = CHEGA_NA_MAO;
const FIM = 2.0;

const suave = (x: number) => {
  const c = Math.min(1, Math.max(0, x));
  return c * c * (3 - 2 * c);
};
/** Peso que sobe de a até b, fica e desce de c até d. */
const janela = (t: number, a: number, b: number, c: number, d: number) =>
  t < a || t > d ? 0 : t < b ? suave((t - a) / (b - a)) : t <= c ? 1 : 1 - suave((t - c) / (d - c));

/** A criança: estica o braço com a fichinha, recolhe, e estica de novo para pegar o lanche. */
function camadaComprador(): CamadaPose {
  let t = 0;
  return (base: Pose, info) => {
    t += info.dt > 0 && Number.isFinite(info.dt) ? info.dt : 0;
    if (t > FIM) return null;
    const paga = janela(t, 0, 0.18, 0.4, 0.7);
    const pega = janela(t, ESTICA - 0.05, ESTICA + 0.18, CHEGA + 0.05, CHEGA + 0.4);
    const p = Math.max(paga, pega);
    if (p <= 0) return base;
    const j: Juntas = { bdX: -1.32, bdZ: 0.1, cabX: 0.06 };
    return aplicarJuntas({ ...base }, j, p);
  };
}

/** A vendedora: pega a fichinha, se abaixa no balcão, sobe com o lanche e estica o braço. */
function camadaVendedora(): CamadaPose {
  let t = 0;
  return (base: Pose, info) => {
    t += info.dt > 0 && Number.isFinite(info.dt) ? info.dt : 0;
    if (t > FIM) return null;
    // recebe a fichinha (a mão um pouco à frente)
    const recebe = janela(t, 0.15, 0.4, 0.5, 0.62);
    // pega no balcão (inclina e desce o braço)
    const balcao = janela(t, 0.5, PEGA_NO_BALCAO, NA_MAO_DELA - 0.05, NA_MAO_DELA + 0.1);
    // entrega: o braço esticado com o lanche
    const entrega = janela(t, NA_MAO_DELA, ESTICA + 0.05, PULA, PULA + 0.35);
    let pose = { ...base };
    if (recebe > 0) pose = aplicarJuntas(pose, { bdX: -1.0, bdZ: 0.15 }, recebe);
    if (balcao > 0) pose = aplicarJuntas(pose, { bdX: -0.75, troncoX: 0.22, cabX: 0.12 }, balcao);
    if (entrega > 0) pose = aplicarJuntas(pose, { bdX: -1.42, bdZ: 0.08, troncoX: 0.06 }, entrega);
    return pose;
  };
}

/** A vendedora sem lanche para dar (a barrinha da criança está cheia): as mãos vazias. */
function camadaMaosVazias(): CamadaPose {
  let t = 0;
  return (base: Pose, info) => {
    t += info.dt > 0 && Number.isFinite(info.dt) ? info.dt : 0;
    if (t > 1.5) return null;
    const p = janela(t, 0, 0.25, 1.05, 1.5);
    return aplicarJuntas({ ...base }, { bdX: -0.95, beX: -0.95, bdZ: 0.55, beZ: -0.55, cabZ: 0.16 }, p);
  };
}

interface Entrega {
  i: number;
  quem: string;
  t: number;
  b: Balcao;
  ficha: TransformNode | null;
  fichaDe: Vector3;
  lanche: ModeloItem | null;
  lancheDe: Vector3;
  preparou: boolean;
  naMao: boolean;
  pulou: boolean;
  acenou: boolean;
  /** A mão da criança estava ocupada com a fichinha. */
  ocupou: boolean;
}

export interface RenderCompras {
  /** O núcleo avisou uma compra (ou a barrinha cheia). */
  evento(e: { i: number; quem: string; cheia?: true }): void;
  atualizar(dt: number): void;
  /** Testes: as entregas em curso (qual, de quem e em que instante). */
  estado(): { i: number; quem: string; t: number; fase: string }[];
}

export function criarRenderCompras(scene: Scene, op: OpcoesCompras): RenderCompras {
  const pl = criarPlasticos(scene, 'vila-compras');
  const entregas: Entrega[] = [];
  let n = 0;
  const v = new Vector3();

  /** A fichinha: a moeda dourada de brinquedo com a estrela creme dos dois lados. */
  function fichinha(): TransformNode {
    const no = new TransformNode(`fichinha-${n++}`, scene);
    // (do tamanho de uma moeda grande de brinquedo na mão do boneco: a criança vê de longe)
    no.scaling.setAll(1.5);
    const disco = cilindro(`fichinha-disco-${n}`, scene, 0.022, 0.075, 0.075, pl.cor('#ffcf3a', 0.6));
    disco.parent = no;
    const borda = cilindro(`fichinha-borda-${n}`, scene, 0.026, 0.062, 0.062, pl.cor('#f2b21e', 0.5));
    borda.parent = no;
    const pontas: { x: number; z: number; mordido: boolean }[] = [];
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * Math.PI * 2 + Math.PI / 2;
      const r = k % 2 ? 0.022 : 0.05;
      pontas.push({ x: Math.cos(a) * r, z: Math.sin(a) * r, mordido: false });
    }
    const estrela = prisma(pontas, -0.016, 0.016, '#fff4d0', '#fff4d0');
    const m = cilindro(`fichinha-estrela-${n}`, scene, 0.001, 0.001, 0.001, pl.corVertice(0.5) ?? pl.cor('#fff4d0', 0.5));
    estrela.applyToMesh(m);
    m.parent = no;
    for (const q of [disco, borda, m]) {
      q.isPickable = false;
      q.alwaysSelectAsActiveMesh = true;
      op.preparar?.(q);
    }
    // de pé (a estrela virada para os lados)
    no.rotation.x = Math.PI / 2;
    return no;
  }

  function maoDe(q: NaEntrega | null, ref: Vector3): Vector3 | null {
    if (!q) return null;
    const no = q.boneco.noDaMao();
    no.computeWorldMatrix(true);
    return ref.copyFrom(no.getAbsolutePosition());
  }

  function largar(e: Entrega): void {
    e.ficha?.dispose(false, true);
    e.ficha = null;
    if (e.lanche) {
      for (const m of e.lanche.malhas) m.dispose();
      e.lanche.no.dispose();
      e.lanche = null;
    }
    if (e.ocupou) op.comprador(e.quem)?.boneco.ocuparMao(false);
    e.ocupou = false;
  }

  return {
    evento(ev) {
      const b = op.balcoes[ev.i];
      if (!b) return;
      if (ev.cheia) {
        const vend = op.vendedora(b.vendedora);
        vend?.animador.definirCamada(camadaMaosVazias());
        const onde = vend ? vend.boneco.raiz.getAbsolutePosition() : Vector3.FromArray(b.p);
        op.som('vazias', onde);
        return;
      }
      // (a mesma criança comprando de novo: a entrega de antes acaba aqui)
      for (let k = entregas.length - 1; k >= 0; k--)
        if (entregas[k].quem === ev.quem) {
          largar(entregas[k]);
          entregas.splice(k, 1);
        }
      const comprador = op.comprador(ev.quem);
      comprador?.animador.definirCamada(camadaComprador());
      op.vendedora(b.vendedora)?.animador.definirCamada(camadaVendedora());
      const e: Entrega = {
        i: ev.i,
        quem: ev.quem,
        t: 0,
        b,
        ficha: null,
        fichaDe: new Vector3(),
        lanche: null,
        lancheDe: new Vector3(),
        preparou: false,
        naMao: false,
        pulou: false,
        acenou: false,
        ocupou: false,
      };
      // a fichinha na mão da criança
      if (comprador) {
        comprador.boneco.ocuparMao(true);
        e.ocupou = true;
        e.ficha = fichinha();
        e.ficha.parent = comprador.boneco.noDaMao();
        e.ficha.position.set(0, -0.04, 0.08);
      }
      entregas.push(e);
    },
    atualizar(dt) {
      const passo = Math.min(Math.max(dt, 0), 0.1);
      for (let k = entregas.length - 1; k >= 0; k--) {
        const e = entregas[k];
        e.t += passo;
        const comprador = op.comprador(e.quem);
        const vend = op.vendedora(e.b.vendedora);
        // 1. a fichinha sai da mão da criança e pula até a vendedora
        if (e.ficha && e.t >= FICHA_SAI) {
          if (e.ficha.parent) {
            maoDe(comprador, e.fichaDe) ?? e.fichaDe.copyFrom(e.ficha.getAbsolutePosition());
            e.ficha.parent = null;
            e.ficha.position.copyFrom(e.fichaDe);
            if (e.ocupou) comprador?.boneco.ocuparMao(false);
            e.ocupou = false;
          }
          const ate = maoDe(vend, v) ?? Vector3.FromArray(e.b.p);
          const f = suave((e.t - FICHA_SAI) / (FICHA_CHEGA - FICHA_SAI));
          Vector3.LerpToRef(e.fichaDe, ate, f, e.ficha.position);
          e.ficha.position.y += Math.sin(f * Math.PI) * 0.45;
          e.ficha.rotation.y += passo * 14;
          if (e.t >= FICHA_CHEGA) {
            op.som('fichinha', ate);
            e.ficha.dispose(false, true);
            e.ficha = null;
          }
        }
        // 2. o preparo da barraca
        if (!e.preparou && e.t >= FICHA_CHEGA) {
          e.preparou = true;
          op.preparo(e.b, e.i);
        }
        // o lanche aparece na mão da vendedora, sempre em pé (o copo com o canudo para cima, o
        // palito do algodão para baixo), e acompanha a mão dela até o pulinho
        if (!e.naMao && e.t >= NA_MAO_DELA) {
          e.naMao = true;
          e.lanche = modeloNaMao(scene, pl, null, e.b.item, `vila-compra-${n++}`);
          if (e.lanche)
            for (const m of e.lanche.malhas) {
              m.alwaysSelectAsActiveMesh = true;
              op.preparar?.(m);
            }
        }
        if (e.lanche && !e.pulou) {
          const mao = maoDe(vend, v) ?? Vector3.FromArray(e.b.p);
          // (cresce num "pop" ao aparecer)
          const s = Math.min(1, (e.t - NA_MAO_DELA) / 0.12);
          e.lanche.no.scaling.setAll(Math.max(0.05, s));
          e.lanche.no.position.set(mao.x, mao.y - 0.02, mao.z);
        }
        // 3. o lanche pula da mão dela para a da criança
        if (!e.pulou && e.t >= PULA) {
          e.pulou = true;
          const de = maoDe(vend, e.lancheDe) ?? e.lancheDe.copyFrom(Vector3.FromArray(e.b.p));
          if (e.lanche) e.lanche.no.scaling.setAll(1);
          op.som('pulo', de);
        }
        if (e.lanche && e.pulou) {
          const ate = maoDe(comprador, v);
          const f = suave((e.t - PULA) / (CHEGA - PULA));
          if (ate) {
            Vector3.LerpToRef(e.lancheDe, ate, f, e.lanche.no.position);
            e.lanche.no.position.y += Math.sin(f * Math.PI) * 0.4 - 0.05 * f;
          }
          e.lanche.no.rotation.y = f * Math.PI * 2;
          if (e.t >= CHEGA) {
            for (const m of e.lanche.malhas) m.dispose();
            e.lanche.no.dispose();
            e.lanche = null;
          }
        }
        // 4. chegou: a vendedora acena
        if (!e.acenou && e.t >= CHEGA + 0.12) {
          e.acenou = true;
          op.aceno(e.b.vendedora);
        }
        if (e.t >= FIM) {
          largar(e);
          entregas.splice(k, 1);
        }
      }
    },
    estado: () =>
      entregas.map((e) => ({
        i: e.i,
        quem: e.quem,
        t: e.t,
        fase:
          e.t < FICHA_CHEGA
            ? 'fichinha'
            : e.t < ESTICA
              ? 'preparo'
              : e.t < CHEGA
                ? 'entrega'
                : 'chegou',
      })),
  };
}
