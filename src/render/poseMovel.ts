/**
 * Spec 039 (T05): a pose de quem está sentado num móvel (o sofá, a cadeira) ou deitado na cama,
 * para a criança e para os amigos, nas duas câmeras. Vem depois da pose de sempre
 * (`aplicarPose` e `posicionar`): as pernas, os braços, a altura e o giro do corpo.
 *
 * - **Sentada:** as pernas esticadas para a frente, as mãos no colo, de frente para onde o móvel
 *   olha, no meio de cada lugar (no sofá, no meio da almofada, sem encostar no braço), afundando
 *   um tico no assento (0,64: a escala da segunda volta).
 * - **Deitada na cama nova:** de costas, o alto da cabeça na cabeceira, a cabeça afundando um tico
 *   no travesseiro e as costas no colchão. Só na cama, o corpo achata de frente para trás (o boneco
 *   de brinquedo é gordinho: 0,58 de fundo), e o edredom vai do peito ao pé, 3 cm acima do corpo
 *   (`render/moveis`). De cima, a cara e o corpo ficam do mesmo tamanho.
 * - **Deitada na curtinha:** encolhidinha (pequena, os joelhos dobrados e as pernas encolhidas
 *   debaixo do edredom), de costas, num tamanho que cabe numa célula: nada do corpo passa do
 *   edredom nem atravessa a cama.
 * - **Deitada no sofá** (de noite, sem cama; decisão do dono, 27 nov): de costas, encolhidinha, o
 *   sofá inteiro, a cabeça na almofadinha do lado da âncora, virada de três-quartos para a frente,
 *   e a mantinha do pescoço aos pés.
 * - **Dormindo** (deitada em qualquer uma): a cara de dormir, os olhos fechados e a boca pequena.
 *
 * O cálculo das caixas é feito uma vez por assento (e por boneco); a cada quadro só se repõe o
 * que a pose de sempre desfaz.
 */
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import type { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { Bloco } from '../world/blocks';
import { PARTE_CURTINHA, movelEm, parteDoMeta, type LeitorMoveis } from '../jogo/moveis';
import type { Personagem } from './personagem';
import type { RenderMoveis } from './moveis';
import { MEDIDA_CAMA } from './moveis/pecas';
import { COBERTAS } from './moveis/coberta';

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
/** Quanto o bumbum afunda na almofada do assento. */
const AFUNDA_ASSENTO = 0.05;
/** Só na cama: quanto o corpo deitado achata de frente para trás. */
export const ACHATA_DEITADA = 0.6;
/** Na curtinha: o tamanho da criança encolhidinha (cabe numa célula). */
const TAMANHO_CURTINHA = 0.55;
/** No sofá (de noite, sem cama): encolhidinha, cabe entre os dois braços. */
const TAMANHO_SOFA = 0.6;
/** Na cama nova: um tico menor (a criança tem o comprido de dentro da cama; os pés ficam cobertos). */
const TAMANHO_CAMA = 0.92;
/** Do meio do sofá ao meio de cada almofada do assento (a escala da segunda volta). */
const MEIO_ALMOFADA = 0.42;

const VET = [
  [0, 1],
  [1, 0],
  [0, -1],
  [-1, 0],
] as const;

type Tipo = 'sentada' | 'deitada' | 'sofa' | 'curtinha';

interface Arrumado {
  chave: string;
  pos: Vector3;
  rot: Vector3;
  esc: Vector3;
  cabeca: Vector3 | null;
  /** O giro da cabeça (de três-quartos, no sofá). */
  giroCabeca: number;
  deitado: { x: number; y: number; z: number } | null;
}
interface Boneco {
  juntas: Record<string, TransformNode>;
  cabecaOriginal: Vector3;
  arrumado: Arrumado | null;
  /** A cara: os olhos e a boca (fecham e diminuem dormindo) e o brilho dos olhos (some). */
  olhos: TransformNode[];
  olhosX: number[];
  brilhos: TransformNode[];
  boca: TransformNode | null;
  bocaX: number;
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
    if (b && b.juntas.cabeca && !b.juntas.cabeca.isDisposed() && !b.boca?.isDisposed()) return b;
    const juntas: Record<string, TransformNode> = {};
    for (const n of p.raiz.getChildTransformNodes(false)) {
      const k = /-junta-(\w+)$/.exec(n.name);
      if (k) juntas[k[1]] = n;
    }
    const nos: TransformNode[] = [...p.raiz.getChildTransformNodes(false), ...p.raiz.getChildMeshes(false)];
    const olhos = nos.filter((n) => /-(olhos|olho)(-|$)/.test(n.name));
    const brilhos = nos.filter((n) => /-(brilhos|brilho)(-|$)/.test(n.name));
    const boca = nos.find((n) => /-boca$/.test(n.name)) ?? null;
    b = {
      juntas,
      cabecaOriginal: juntas.cabeca?.position.clone() ?? Vector3.Zero(),
      arrumado: null,
      olhos,
      olhosX: olhos.map((o) => o.scaling.x),
      brilhos,
      boca,
      bocaX: boca?.scaling.x ?? 1,
    };
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
  function juntas(j: Record<string, TransformNode>, tipo: Tipo | null): void {
    // (na curtinha as pernas encolhem debaixo do edredom: nada passa da pezeira)
    const perna = tipo === 'curtinha' ? 0.55 : 1;
    j.pernaE.scaling.set(1, perna, 1);
    j.pernaD.scaling.set(1, perna, 1);
    if (tipo === null) return;
    if (tipo === 'sofa' || tipo === 'curtinha') {
      // de costas, encolhidinha: os joelhos dobrados para cima, os braços junto do corpo
      j.pernaE.rotation.x = -0.75;
      j.pernaD.rotation.x = -0.75;
      j.bracoE.rotation.set(0, 0, -0.05);
      j.bracoD.rotation.set(0, 0, 0.05);
      j.cabeca.rotation.set(0, 0, 0);
    } else if (tipo === 'sentada') {
      j.pernaE.rotation.x = -1.45;
      j.pernaD.rotation.x = -1.45;
      j.bracoE.rotation.set(-0.35, 0, -0.12);
      j.bracoD.rotation.set(-0.35, 0, 0.12);
    } else {
      // (os pés deitam um tico para a ponta da cama: as pontas dos sapatos não espetam o edredom)
      j.pernaE.rotation.x = 0.3;
      j.pernaD.rotation.x = 0.3;
      j.bracoE.rotation.set(0, 0, -0.05);
      j.bracoD.rotation.set(0, 0, 0.05);
      j.cabeca.rotation.set(0, 0, 0);
    }
  }

  /** A cara de dormir: os olhos fechados e a boca pequena (a pose de sempre refaz a cada quadro). */
  function dormir(b: Boneco, sim: boolean): void {
    if (b.boca) b.boca.scaling.x = b.bocaX * (sim ? 0.55 : 1);
    // os olhos fechados: um traço escuro bem visível (fino demais, sumia e as bochechas viravam
    // os "olhos"), um tico mais largo; o brilhinho branco some
    b.olhos.forEach((o, i) => (o.scaling.x = b.olhosX[i] * (sim ? 1.2 : 1)));
    for (const o of b.brilhos) o.setEnabled(!sim);
    if (!sim) return;
    for (const o of b.olhos) o.scaling.y *= 0.24;
    if (b.boca) b.boca.scaling.y *= 0.3;
  }

  /** Arruma o corpo no móvel uma vez (as caixas no mundo); devolve o que repor a cada quadro. */
  function arrumar(p: Personagem, b: Boneco, a: AssentoNaTela, chave: string, tipo: Tipo): Arrumado {
    const raiz = p.raiz;
    const j = b.juntas;
    const [vx, vz] = VET[a.d & 3];
    j.cabeca.position.copyFrom(b.cabecaOriginal);
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
    const fim = (pos: Vector3, rot: Vector3, esc: Vector3, cabeca: Vector3 | null, giroCabeca: number, deitado: Arrumado['deitado']): Arrumado => {
      raiz.position.copyFrom(pos);
      raiz.rotation.copyFrom(rot);
      raiz.scaling.copyFrom(esc);
      return { chave, pos, rot, esc, cabeca: cabeca ? b.cabecaOriginal.add(paraOPai(cabeca)) : null, giroCabeca, deitado };
    };

    if (tipo === 'sentada') {
      // de frente para quem pôs o móvel (a frente dele), afundando um tico no assento
      const baixo = ok(pernas.min.y) ? pernas.min.y : 0.25;
      let px = a.px;
      let pz = a.pz;
      // no sofá: no meio da almofada do lugar (o meio do lugar fica perto demais do braço)
      const m = leitor.bloco(a.x, a.y, a.z) === Bloco.SOFA ? movelEm(leitor, a.x, a.y, a.z) : null;
      if (m) {
        const [rx, rz] = VET[(m.d + 1) & 3];
        const cx = m.ancora.x + 0.5 + rx * 0.5;
        const cz = m.ancora.z + 0.5 + rz * 0.5;
        const lado = Math.sign((a.px - cx) * rx + (a.pz - cz) * rz) || 1;
        const [fx, fz] = VET[m.d & 3];
        // (e um tico para a frente: as costas na almofada do encosto, sem entrar nela)
        px = cx + rx * lado * MEIO_ALMOFADA - fx * 0.06;
        pz = cz + rz * lado * MEIO_ALMOFADA - fz * 0.06;
      }
      return fim(
        new Vector3(px, a.y + ALTURA_ASSENTO - AFUNDA_ASSENTO - baixo, pz),
        new Vector3(0, Math.atan2(-vx, -vz), 0),
        new Vector3(1, 1, 1),
        null,
        0,
        null,
      );
    }

    /**
     * De costas: o alto do boneco (+y) para `h`, a frente (+z) para cima, achatada de frente para
     * trás, no tamanho `k`; as costas na `superficie`, a nuca no `travesseiro` e o alto da cabeça
     * em `alvoCabeca`.
     */
    const deCostas = (hx: number, hz: number, k: number, alvoCabeca: { x: number; z: number }, superficie: number, travesseiro: number) => {
      const sz = ACHATA_DEITADA * k;
      const esc = new Vector3(k, k, sz);
      const rot = new Vector3(-Math.PI / 2, Math.atan2(-hx, -hz), 0);
      const costas = ok(corpo.min.z) ? corpo.min.z : -0.3;
      const y = superficie - costas * sz;
      const alto = ok(cab.max.y) ? cab.max.y : 1.76;
      const pos = new Vector3(alvoCabeca.x - hx * alto * k, y, alvoCabeca.z - hz * alto * k);
      const nuca = ok(cab.min.z) ? cab.min.z : -0.5;
      const cabeca = new Vector3(0, 0, (travesseiro - (y + nuca * sz)) / sz);
      return { pos, rot, esc, cabeca };
    };

    if (tipo === 'sofa') {
      // no sofá (de noite, sem cama): o sofá inteiro, a cabeça na almofadinha do lado da âncora
      const m = movelEm(leitor, a.x, a.y, a.z);
      const d = m?.d ?? a.d;
      const anc = m?.ancora ?? { x: a.x, y: a.y, z: a.z };
      const [rx, rz] = VET[(d + 1) & 3];
      const [fx, fz] = VET[d & 3];
      // (o meio do assento: entre os braços, e no meio do fundo dele, do encosto à beirada da frente)
      const cx = anc.x + 0.5 + rx * 0.5 - fx * 0.23;
      const cz = anc.z + 0.5 + rz * 0.5 - fz * 0.23;
      const sup = a.y + ALTURA_ASSENTO;
      // a cabeça no canto da almofadinha (em +r): ela sai de pé e deita debaixo da cabeça, e a
      // cabeça afunda um tico nela
      const hx = rx;
      const hz = rz;
      const r = deCostas(hx, hz, TAMANHO_SOFA, { x: cx + hx * 0.72, z: cz + hz * 0.72 }, sup, sup + 0.08);
      // a cara vira de três-quartos para a frente do sofá (o lado da sala). O lado do boneco (+x)
      // fica em (-hz, 0, hx); a cabeça gira para onde ele encontra a frente (-f)
      const ladoX = -hz;
      const ladoZ = hx;
      const lado = ladoX * -fx + ladoZ * -fz;
      // (bem de três-quartos: com pouco giro a cara ficava de lado e os olhos fechados sumiam)
      return fim(r.pos, r.rot, r.esc, r.cabeca, 0.9 * (Math.sign(lado) || 1), { x: anc.x, y: anc.y, z: anc.z });
    }

    // na cama: a cabeça para a cabeceira (contra a frente da cama: h = -v)
    const curtinha = tipo === 'curtinha';
    const hx = -vx;
    const hz = -vz;
    const cabeceira = curtinha ? MEDIDA_CAMA.cabeceiraCurtinha - 0.06 : MEDIDA_CAMA.cabeceira - 0.5;
    const alvo = { x: a.x + 0.5 + hx * cabeceira, z: a.z + 0.5 + hz * cabeceira };
    const colchao = a.y + MEDIDA_CAMA.colchao;
    // (a cabeça afunda um tico no travesseiro)
    const travesseiro = colchao + (curtinha ? 0.14 * 1.25 - 0.03 : MEDIDA_CAMA.travesseiro - 0.04);
    // o tamanho: o de sempre da cama, ou menor se o corpo (do alto da cabeça aos pés, com as
    // pernas da pose) não cabe entre a cabeceira e a ponta do edredom (nada passa da coberta).
    // (o alto da cabeça fica em `cabeceira` do meio da âncora; a ponta do edredom, no referencial
    // do móvel, que na cama nova tem o meio meia célula para os pés)
    const comprido = (ok(cab.max.y) ? cab.max.y : 1.76) - (ok(corpo.min.y) ? corpo.min.y : 0);
    const ponta = curtinha ? COBERTAS.curtinha.a1 : COBERTAS.cama.a1 + 0.5;
    const cabe = (cabeceira + ponta - 0.03) / Math.max(0.5, comprido);
    const r = deCostas(hx, hz, Math.min(curtinha ? TAMANHO_CURTINHA : TAMANHO_CAMA, cabe), alvo, colchao, travesseiro);
    return fim(r.pos, r.rot, r.esc, r.cabeca, 0, { x: a.x, y: a.y, z: a.z });
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
          juntas(b.juntas, null);
          dormir(b, false);
        }
        return;
      }
      const bloco = leitor.bloco(a.x, a.y, a.z);
      const curtinha = !!a.deitado && bloco === Bloco.CAMA && parteDoMeta(leitor.meta(a.x, a.y, a.z)) === PARTE_CURTINHA;
      const tipo: Tipo = !a.deitado ? 'sentada' : bloco === Bloco.SOFA ? 'sofa' : curtinha ? 'curtinha' : 'deitada';
      juntas(b.juntas, tipo);
      const chave = `${a.x},${a.y},${a.z},${a.d},${a.px},${a.pz},${tipo}`;
      if (b.arrumado?.chave !== chave) {
        if (b.arrumado?.deitado) moveis?.deitado(b.arrumado.deitado.x, b.arrumado.deitado.y, b.arrumado.deitado.z, null, quem);
        b.arrumado = arrumar(p, b, a, chave, tipo);
        // (o edredom é de quem deitou: o mesmo `quem` de quando levantar)
        if (b.arrumado.deitado) {
          if (b.arrumado.cabeca) b.juntas.cabeca.position.copyFrom(b.arrumado.cabeca);
          atualizar(p.raiz);
          // o corpo (sem a cabeça e sem o que está na mão), pedaço a pedaço: a coberta cai por cima
          const doCorpo = (m: AbstractMesh) => !daCabeca(m, b.juntas) && !/-mao-|-item/.test(m.name);
          const topo = caixa(p.raiz, doCorpo).max.y;
          const pedacos = p.raiz
            .getChildMeshes(false)
            .filter((m) => m.isEnabled() && doCorpo(m))
            .map((m) => {
              const c = caixa(p.raiz, (x) => x === m);
              return [c.min.x, c.min.y, c.min.z, c.max.x, c.max.y, c.max.z] as const;
            })
            .filter((c) => Number.isFinite(c[0]));
          const cc = caixa(p.raiz, (m) => daCabeca(m, b.juntas));
          const cabeca = [cc.min.x, cc.min.y, cc.min.z, cc.max.x, cc.max.y, cc.max.z] as const;
          moveis?.deitado(b.arrumado.deitado.x, b.arrumado.deitado.y, b.arrumado.deitado.z, topo, quem, { pedacos, cabeca });
        }
      }
      const r = b.arrumado;
      p.raiz.position.copyFrom(r.pos);
      p.raiz.rotation.copyFrom(r.rot);
      p.raiz.scaling.copyFrom(r.esc);
      if (r.cabeca) b.juntas.cabeca.position.copyFrom(r.cabeca);
      if (r.giroCabeca) b.juntas.cabeca.rotation.y = r.giroCabeca;
      dormir(b, !!r.deitado);
    },
  };
}
