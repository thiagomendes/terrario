/**
 * Spec 039 (T05): a pose de quem está sentado num móvel (o sofá, a cadeira) ou deitado na cama,
 * para a criança e para os amigos, nas duas câmeras. Vem depois da pose de sempre
 * (`aplicarPose` e `posicionar`): as pernas, os braços, a altura e o giro do corpo.
 *
 * - **Sentada:** as pernas esticadas para a frente, as mãos no colo, de frente para onde o móvel
 *   olha, o bumbum no assento (0,64: a escala da segunda volta).
 * - **Deitada na cama nova:** de costas, o alto da cabeça na cabeceira, a nuca no travesseiro (sem
 *   afundar) e as costas no colchão. Só na cama, o corpo achata de frente para trás (o boneco de
 *   brinquedo é gordinho: 0,58 de fundo), e o edredom vai do queixo ao pé, 3 cm acima do corpo
 *   (`render/moveis`). De cima, a cara e o corpo ficam do mesmo tamanho.
 * - **Deitada na curtinha:** encolhidinha de lado, os joelhos dobrados, num tamanho que cabe numa
 *   célula, com o edredom.
 *
 * O cálculo das caixas é feito uma vez por assento (e por boneco); a cada quadro só se repõe o
 * que a pose de sempre desfaz.
 */
import { Matrix, Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import type { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { Bloco } from '../world/blocks';
import { PARTE_CURTINHA, movelEm, parteDoMeta, type LeitorMoveis } from '../jogo/moveis';
import type { Personagem } from './personagem';
import type { RenderMoveis } from './moveis';
import { MEDIDA_CAMA } from './moveis/pecas';

/**
 * O assento como a tela desenha (o mesmo formato do jogador visto da T04): a célula do assento,
 * a direção do móvel (a de quem o pôs), o ponto do corpo e se é deitado (a cama).
 */
export interface AssentoNaTela {
  x: number;
  y: number;
  z: number;
  d: number;
  px: number;
  pz: number;
  deitado?: boolean;
}

/** A altura do assento do sofá e da cadeira (a escala da segunda volta). */
export const ALTURA_ASSENTO = 0.64;
/** Só na cama: quanto o corpo deitado achata de frente para trás. */
export const ACHATA_DEITADA = 0.6;
/** Na curtinha: o tamanho da criança encolhidinha (cabe numa célula). */
const TAMANHO_CURTINHA = 0.66;
/** No sofá (de noite, sem cama): encolhidinha, cabe entre os dois braços. */
const TAMANHO_SOFA = 0.9;

const VET = [
  [0, 1],
  [1, 0],
  [0, -1],
  [-1, 0],
] as const;

interface Arrumado {
  chave: string;
  pos: Vector3;
  rot: Vector3;
  esc: Vector3;
  cabeca: Vector3 | null;
  deitado: { x: number; y: number; z: number } | null;
}
interface Boneco {
  juntas: Record<string, TransformNode>;
  cabecaOriginal: Vector3;
  arrumado: Arrumado | null;
}

/**
 * A malha é da cabeça? As fundidas da cabeça (o cabelo, o topete) e as soltas (os olhos, o brilho
 * e a boca) nem sempre ficam penduradas na junta dela.
 */
const DA_CABECA = /-(cabeca|topete|cabelo|olhos|brilhos|boca|chapeu|oculos|orelha)/;
function daCabeca(m: AbstractMesh, j: Record<string, TransformNode>): boolean {
  return m.isDescendantOf(j.cabeca) || DA_CABECA.test(m.name);
}

export interface PoseMovel {
  /** Depois da pose de sempre: a pose do móvel (null: em pé, desfaz o que tinha). */
  aplicar(p: Personagem, a: AssentoNaTela | null, quem: string): void;
}

export function criarPoseMovel(leitor: LeitorMoveis, moveis: RenderMoveis | null): PoseMovel {
  const bonecos = new WeakMap<Personagem, Boneco>();
  const canto = new Vector3();
  const mundo = new Vector3();

  function boneco(p: Personagem): Boneco {
    let b = bonecos.get(p);
    // (o boneco troca as peças quando muda de roupa: as juntas são lidas de novo)
    if (b && b.juntas.cabeca && !b.juntas.cabeca.isDisposed()) return b;
    const juntas: Record<string, TransformNode> = {};
    for (const n of p.raiz.getChildTransformNodes(false)) {
      const k = /-junta-(\w+)$/.exec(n.name);
      if (k) juntas[k[1]] = n;
    }
    b = { juntas, cabecaOriginal: juntas.cabeca?.position.clone() ?? Vector3.Zero(), arrumado: null };
    bonecos.set(p, b);
    return b;
  }
  function caixa(raiz: TransformNode, filtro: (m: AbstractMesh) => boolean) {
    const min = new Vector3(Infinity, Infinity, Infinity);
    const max = new Vector3(-Infinity, -Infinity, -Infinity);
    for (const m of raiz.getChildMeshes(false)) {
      // (a visibilidade não conta: o boneco pode estar escondido neste quadro, e a medida é a mesma)
      if (!m.isEnabled() || !filtro(m)) continue;
      // o boneco não sincroniza a caixa a cada quadro (`doNotSyncBoundingInfo`): os 8 cantos da
      // caixa local vão para o mundo pela matriz de agora
      const w = m.computeWorldMatrix(true);
      const bb = m.getBoundingInfo().boundingBox;
      const a = bb.minimum;
      const b = bb.maximum;
      for (let i = 0; i < 8; i++) {
        canto.set(i & 1 ? b.x : a.x, i & 2 ? b.y : a.y, i & 4 ? b.z : a.z);
        Vector3.TransformCoordinatesToRef(canto, w, mundo);
        min.minimizeInPlace(mundo);
        max.maximizeInPlace(mundo);
      }
    }
    return { min, max };
  }
  function atualizar(raiz: TransformNode): void {
    raiz.computeWorldMatrix(true);
    for (const n of raiz.getChildTransformNodes(false)) n.computeWorldMatrix(true);
  }

  /** As pernas, os braços e a cabeça de cada pose (a pose de sempre refaz isso a cada quadro). */
  function juntas(j: Record<string, TransformNode>, tipo: 'sentada' | 'deitada' | 'curtinha'): void {
    if (tipo === 'sentada') {
      j.pernaE.rotation.x = -1.45;
      j.pernaD.rotation.x = -1.45;
      j.bracoE.rotation.set(-0.35, 0, -0.12);
      j.bracoD.rotation.set(-0.35, 0, 0.12);
    } else if (tipo === 'deitada') {
      // (os pés deitam um tico para a ponta da cama: as pontas dos sapatos não espetam o edredom)
      j.pernaE.rotation.x = 0.3;
      j.pernaD.rotation.x = 0.3;
      j.bracoE.rotation.set(0, 0, -0.05);
      j.bracoD.rotation.set(0, 0, 0.05);
      j.cabeca.rotation.set(0, 0, 0);
    } else {
      // encolhidinha: os joelhos para o peito e as mãos juntas na frente
      j.pernaE.rotation.x = -1.3;
      j.pernaD.rotation.x = -1.3;
      j.bracoE.rotation.set(-1.0, 0, -0.1);
      j.bracoD.rotation.set(-1.0, 0, 0.1);
      j.cabeca.rotation.set(0.15, 0, 0);
    }
  }

  /** Arruma o corpo no móvel uma vez (as caixas no mundo); devolve o que repor a cada quadro. */
  function arrumar(p: Personagem, b: Boneco, a: AssentoNaTela, chave: string): Arrumado {
    const raiz = p.raiz;
    const j = b.juntas;
    const [vx, vz] = VET[a.d & 3];
    j.cabeca.position.copyFrom(b.cabecaOriginal);
    const meta = leitor.meta(a.x, a.y, a.z);
    const curtinha = !!a.deitado && leitor.bloco(a.x, a.y, a.z) === Bloco.CAMA && parteDoMeta(meta) === PARTE_CURTINHA;
    // as medidas em pé, com as juntas da pose (o boneco na origem, sem giro nem escala): as caixas
    // no espaço do próprio boneco, sem depender de giro nenhum
    raiz.position.set(0, 0, 0);
    raiz.rotation.set(0, 0, 0);
    raiz.scaling.setAll(1);
    atualizar(raiz);
    const ehCabeca = (m: AbstractMesh) => daCabeca(m, j);
    const corpo = caixa(raiz, (m) => !ehCabeca(m) && !m.name.endsWith('-mao-movel'));
    const cab = caixa(raiz, ehCabeca);
    const pernas = caixa(raiz, (m) => m.isDescendantOf(j.pernaE) || m.isDescendantOf(j.pernaD));
    const ok = (v: number) => Number.isFinite(v);
    // (a cabeça anda no espaço do boneco: do corpo dele para o pai da junta; a conta é feita aqui,
    // com o boneco ainda na origem)
    const paiInv = (j.cabeca.parent as TransformNode | null)?.computeWorldMatrix(true).clone().invert() ?? null;
    const paraOPai = (v: Vector3) => (paiInv ? Vector3.TransformNormal(v, paiInv) : v);
    if (!a.deitado) {
      // sentada, de frente para quem pôs o móvel (a frente dele), o bumbum no assento
      const baixo = ok(pernas.min.y) ? pernas.min.y : 0.25;
      raiz.rotation.set(0, Math.atan2(-vx, -vz), 0);
      raiz.position.set(a.px, a.y + ALTURA_ASSENTO - baixo, a.pz);
      return { chave, pos: raiz.position.clone(), rot: raiz.rotation.clone(), esc: raiz.scaling.clone(), cabeca: null, deitado: null };
    }
    /**
     * De lado (a curtinha e o sofá): o alto do boneco (+y) para `h`, a frente dele (+z) para `f` e
     * o lado (x) em pé, encolhida no tamanho `k`; o lado de baixo na `superficie`, o meio do corpo
     * no `meio` (na direção de `f`) e a cabeça, de lado, no `travesseiro`.
     */
    function deLado(
      e: { hx: number; hz: number; fx: number; fz: number },
      k: number,
      alvoCabeca: { x: number; z: number },
      superficie: number,
      travesseiro: number,
      meio: { x: number; z: number },
    ) {
      const Y = new Vector3(e.hx, 0, e.hz);
      const Z = new Vector3(e.fx, 0, e.fz);
      const X = Vector3.Cross(Y, Z);
      const s = Math.sign(X.y) || 1;
      const M = Matrix.FromValues(X.x, X.y, X.z, 0, Y.x, Y.y, Y.z, 0, Z.x, Z.y, Z.z, 0, 0, 0, 0, 1);
      const rot = Quaternion.FromRotationMatrix(M).toEulerAngles();
      // (o lado em pé achata um tanto: a coberta fica baixa; de frente, a cara continua redonda)
      const esc = new Vector3(k * 0.62, k, k);
      const baixo = s > 0 ? (ok(corpo.min.x) ? corpo.min.x : -0.45) : ok(corpo.max.x) ? corpo.max.x : 0.45;
      const y = superficie - s * baixo * esc.x;
      const alto = ok(cab.max.y) ? cab.max.y : 1.76;
      const zm = ok(corpo.min.z) ? (corpo.min.z + corpo.max.z) / 2 : 0.1;
      // ao longo de h, a cabeça na cabeceira; ao longo de f, o meio do corpo no meio
      const ph = alvoCabeca.x * e.hx + alvoCabeca.z * e.hz - alto * k;
      const pf = meio.x * e.fx + meio.z * e.fz - zm * k;
      const pos = new Vector3(ph * e.hx + pf * e.fx, y, ph * e.hz + pf * e.fz);
      const baixoCabeca = s > 0 ? (ok(cab.min.x) ? cab.min.x : -0.48) : ok(cab.max.x) ? cab.max.x : 0.48;
      const cabeca = new Vector3((s * (travesseiro - (y + s * baixoCabeca * esc.x))) / esc.x, 0, 0);
      return { pos, rot, esc, cabeca };
    }
    // deitada no sofá (de noite, sem cama): encolhidinha de lado, o sofá inteiro, a cabeça no braço
    // do lado da âncora, os joelhos para a frente do sofá
    if (a.deitado && leitor.bloco(a.x, a.y, a.z) === Bloco.SOFA) {
      const m = movelEm(leitor, a.x, a.y, a.z);
      const d = m?.d ?? a.d;
      const anc = m?.ancora ?? { x: a.x, y: a.y, z: a.z };
      const [rx, rz] = VET[(d + 1) & 3];
      const [fx0, fz0] = VET[d & 3];
      const cx = anc.x + 0.5 + rx * 0.5;
      const cz = anc.z + 0.5 + rz * 0.5;
      const sup = a.y + ALTURA_ASSENTO;
      const r = deLado(
        { hx: -rx, hz: -rz, fx: -fx0, fz: -fz0 },
        TAMANHO_SOFA,
        { x: cx - rx * 0.76, z: cz - rz * 0.76 },
        sup,
        sup + 0.04,
        { x: cx - fx0 * 0.05, z: cz - fz0 * 0.05 },
      );
      raiz.position.copyFrom(r.pos);
      raiz.rotation.copyFrom(r.rot);
      raiz.scaling.copyFrom(r.esc);
      return { chave, pos: r.pos, rot: r.rot, esc: r.esc, cabeca: b.cabecaOriginal.add(paraOPai(r.cabeca)), deitado: { x: anc.x, y: anc.y, z: anc.z } };
    }
    // deitada: a cabeça para a cabeceira (contra a frente da cama: h = -v)
    const hx = -vx;
    const hz = -vz;
    const cabeceira = curtinha ? MEDIDA_CAMA.cabeceiraCurtinha : MEDIDA_CAMA.cabeceira - 0.5;
    const alvo = { x: a.x + 0.5 + hx * cabeceira, z: a.z + 0.5 + hz * cabeceira };
    const colchao = a.y + MEDIDA_CAMA.colchao;
    const travesseiro = colchao + (curtinha ? 0.14 * 1.25 : MEDIDA_CAMA.travesseiro);
    const alto = ok(cab.max.y) ? cab.max.y : 1.76;
    let pos: Vector3;
    let rot: Vector3;
    let esc: Vector3;
    /** Quanto a cabeça anda (no boneco) para a nuca encostar no travesseiro. */
    let cabeca: Vector3;
    if (!curtinha) {
      // de costas: o alto do boneco (+y) vai para a cabeceira, a frente (+z) para cima, achatada
      const sz = ACHATA_DEITADA;
      esc = new Vector3(1, 1, sz);
      rot = new Vector3(-Math.PI / 2, Math.atan2(-hx, -hz), 0);
      const costas = ok(corpo.min.z) ? corpo.min.z : -0.3;
      const y = colchao - costas * sz;
      pos = new Vector3(alvo.x - hx * alto, y, alvo.z - hz * alto);
      const nuca = ok(cab.min.z) ? cab.min.z : -0.5;
      cabeca = new Vector3(0, 0, (travesseiro - (y + nuca * sz)) / sz);
    } else {
      // de lado, encolhidinha e pequenininha: o alto (+y) para a cabeceira, os joelhos (+z) para o
      // lado de fora da cama
      const r = deLado({ hx, hz, fx: -hz, fz: hx }, TAMANHO_CURTINHA, alvo, colchao, travesseiro, {
        x: a.x + 0.5,
        z: a.z + 0.5,
      });
      ({ pos, rot, esc, cabeca } = r);
    }
    const delta0 = paraOPai(cabeca);
    raiz.position.copyFrom(pos);
    raiz.rotation.copyFrom(rot);
    raiz.scaling.copyFrom(esc);
    return {
      chave,
      pos,
      rot,
      esc,
      cabeca: b.cabecaOriginal.add(delta0),
      deitado: { x: a.x, y: a.y, z: a.z },
    };
  }

  return {
    aplicar(p, a, quem) {
      const b = boneco(p);
      if (!b.juntas.cabeca || !b.juntas.pernaE) return;
      if (!a) {
        if (b.arrumado) {
          if (b.arrumado.deitado) moveis?.deitado(b.arrumado.deitado.x, b.arrumado.deitado.y, b.arrumado.deitado.z, null, quem);
          b.arrumado = null;
          p.raiz.scaling.setAll(1);
          p.raiz.rotation.z = 0;
          b.juntas.cabeca.position.copyFrom(b.cabecaOriginal);
        }
        return;
      }
      const meta = leitor.meta(a.x, a.y, a.z);
      const curtinha = !!a.deitado && parteDoMeta(meta) === PARTE_CURTINHA;
      const noSofa = !!a.deitado && leitor.bloco(a.x, a.y, a.z) === Bloco.SOFA;
      const tipo = !a.deitado ? 'sentada' : curtinha || noSofa ? 'curtinha' : 'deitada';
      juntas(b.juntas, tipo);
      const chave = `${a.x},${a.y},${a.z},${a.d},${a.px},${a.pz},${tipo}`;
      if (b.arrumado?.chave !== chave) {
        if (b.arrumado?.deitado) moveis?.deitado(b.arrumado.deitado.x, b.arrumado.deitado.y, b.arrumado.deitado.z, null, quem);
        b.arrumado = arrumar(p, b, a, chave);
        // (o edredom é de quem deitou: o mesmo `quem` de quando levantar)
        if (b.arrumado.deitado) {
          if (b.arrumado.cabeca) b.juntas.cabeca.position.copyFrom(b.arrumado.cabeca);
          atualizar(p.raiz);
          const topo = caixa(p.raiz, (m) => !daCabeca(m, b.juntas) && !m.name.endsWith('-mao-movel')).max.y;
          moveis?.deitado(a.x, a.y, a.z, topo, quem);
        }
      }
      const r = b.arrumado;
      p.raiz.position.copyFrom(r.pos);
      p.raiz.rotation.copyFrom(r.rot);
      p.raiz.scaling.copyFrom(r.esc);
      if (r.cabeca) b.juntas.cabeca.position.copyFrom(r.cabeca);
    },
  };
}
