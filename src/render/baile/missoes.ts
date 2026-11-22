/**
 * Spec 027 (T19): os momentos das missões n1 a n5 na tela, no jeito das peças da festa (caixas
 * de quina de brinquedo e bolinhas de poucos gomos, na paleta fixa). O que é só da tela de uma
 * criança (a plantinha dela, a Lulu escondida, a cópia do Tufinho) vem da vista dela; o que é de
 * todos (o lampião da porta, o docinho que voa até a sacola, a travessura) vem do mundo e dos
 * eventos do núcleo.
 *
 * - **n1:** o docinho sai da porta aberta e voa até a mão de quem tocou; na "travessura", um
 *   fantasminha de lençol sorridente aparece na porta, dá tchau, e solta um confete de folhinhas
 *   (laranja, dourado, verde-oliva e cobre) que cai devagar. Nada de susto: ele sobe devagar, sorri
 *   o tempo todo e a risadinha é baixinha.
 * - **n3:** a Lulu escondida (a cópia da tela de quem procura) espia do esconderijo: de longe só a
 *   pontinha do lençol aparece; perto, ela espia mais e a risadinha cresce. Achada, ela pula de
 *   braços para cima e some num brilhinho.
 * - **n4:** a plantinha do canteiro marcado (o broto; regada, a rama cresce e a abóbora incha em
 *   5 s; pronta, ela balança e brilha); as estrelinhas em cima das três carinhas da bancada no
 *   passo de escolher; o lampião de carinha na porta da Vovó (de todos, o último posto).
 * - **n5:** onde o Tufinho fica (o banquinho, a horta brincando, atrás de quem ele segue).
 */
import type { Scene } from '@babylonjs/core/scene';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import type { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import type { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { Pecas } from '../solidos';
import type { PlanoBaile } from '../../world/noiteFantasias';
import type { PecaVila } from '../../world/vilaNeon';
import { Ref } from '../vila/ref';
import { abobora, bolinha, rostoDaAbobora, type DesenhoBaile } from './pecas';
import {
  CARINHAS,
  M_ABOBORA,
  M_LULU,
  MISSOES_BAILE,
  USOS_ABOBORA,
  passoDaLulu,
  passoEmOrdem,
  pontosDasMissoes,
  prontaParaColher,
  type BaileVista,
} from '../../jogo/baile';
import type { EventoMissoesBaile } from '../../nucleo/baileMissoes';

type V3 = [number, number, number];

/** T21: o raio (blocos) dos três cantinhos em que o Tufinho passeia na horta, em volta do lugar dele. */
export const RODA_NA_HORTA = 0.8;

/** A cópia da Lulu na tela de quem procura (o boneco de verdade dela, de outro dono). */
export interface LuluNaTela {
  posicionar(x: number, y: number, z: number, yaw: number): void;
  /** Achou: pula de braços para cima. */
  comemorar(): void;
  mostrar(sim: boolean): void;
  quadro(dt: number): void;
  descartar(): void;
}

export interface OpcoesMissoesNaTela {
  scene: Scene;
  plano: PlanoBaile;
  /** O plástico das peças (cor nos vértices) e o que brilha (a paleta de luz). */
  mat: StandardMaterial;
  luz: { material: StandardMaterial; aplicar(vd: VertexData): void };
  temMalha(cx: number, cz: number): boolean;
  estado(): BaileVista | null;
  aberta(id: string): boolean;
  usos(id: string): readonly string[];
  /** Quem joga nesta tela, e os pés de qualquer um (a criança daqui ou um amigo). */
  voce(): string;
  pes(id: string): V3 | null;
  /** A cópia da Lulu (criada quando a n3 abre), ou null. */
  criarLulu(): LuluNaTela | null;
  /** O som de um momento (T21: de onde ele soa; sem `onde`, é da própria criança). */
  som?(qual: 'risadinha' | 'plim' | 'confete' | 'brilho', volume: number, onde?: { x: number; z: number }): void;
  tapaOGlow?(m: Mesh): void;
  brilha?(m: Mesh): void;
}

/** Uma peça desenhada na origem (a Ref de uma peça falsa em 0, 0, 0). */
function desenhar(f: (r: Ref, d: DesenhoBaile) => void): DesenhoBaile {
  const d: DesenhoBaile = {
    corpo: new Pecas(),
    luz: new Pecas(),
    noite: new Pecas(),
    dia: new Pecas(),
    vidro: new Pecas(),
    quadros: [],
    ox: 0,
    oz: 0,
    chao: 0,
    recorte: { x0: -1e6, z0: -1e6, x1: 1e6, z1: 1e6 },
  };
  const p = { x: 0, y: 0, z: 0, dir: 0, tipo: 'abobora' } as unknown as PecaVila;
  f(new Ref(d, p), d);
  return d;
}

export function criarMissoesNaTela(op: OpcoesMissoesNaTela) {
  const { scene, plano } = op;
  const pm = pontosDasMissoes(plano);
  const pt = plano.pontos;
  const chao = plano.h + 1;
  const vovo = pt.portas.find((q) => q.vovo) ?? pt.portas[pt.portas.length - 1];

  /** Um desenho na origem vira um nó com o corpo e o que brilha. */
  function montar(nome: string, d: DesenhoBaile, luzTambem: Pecas[] = [], semBrilho = false): TransformNode {
    const raiz = new TransformNode(nome, scene);
    const corpo = d.corpo.partes.length ? d.corpo : null;
    if (corpo) {
      const m = new Mesh(`${nome}-corpo`, scene);
      corpo.juntar().applyToMesh(m);
      m.material = op.mat;
      m.parent = raiz;
      m.isPickable = false;
      op.tapaOGlow?.(m);
    }
    const luzes = [d.luz, ...luzTambem].filter((q) => q.partes.length);
    for (const [k, q] of luzes.entries()) {
      const m = new Mesh(`${nome}-luz${k}`, scene);
      const vd = q.juntar();
      op.luz.aplicar(vd);
      vd.applyToMesh(m);
      m.material = op.luz.material;
      m.parent = raiz;
      m.isPickable = false;
      // (o que é pequeno e perto da câmera não entra no brilho: o halo virava bola de luz)
      if (semBrilho) op.tapaOGlow?.(m);
      else op.brilha?.(m);
    }
    return raiz;
  }
  const temChao = (x: number, z: number) => op.temMalha(Math.floor(x / 16), Math.floor(z / 16));

  // ------------------------------------------------------------------ n4: a plantinha
  const canteiro = plano.pecas.find((q) => q.tipo === 'canteiro-marcado');
  const [px, pz] = canteiro ? [canteiro.x, canteiro.z] : [pt.canteiro[0], pt.canteiro[2] - 2];
  const broto = montar(
    'baile-broto',
    desenhar((r) => {
      r.caixa(0.05, 0.28, 0.05, 0, 0, 0, '#5f8a34', 0.01);
      bolinha(r, -0.09, 0.27, 0, 0.09, '#7fb04a', [1.4, 0.45, 0.9]);
      bolinha(r, 0.09, 0.3, 0, 0.09, '#6f9a3a', [1.4, 0.45, 0.9]);
    }),
  );
  const rama = montar(
    'baile-rama',
    desenhar((r) => {
      // a rama baixinha com as folhas largas em volta (a abóbora nasce no meio dela)
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 + 0.3;
        bolinha(r, Math.cos(a) * 0.42, 0.1, Math.sin(a) * 0.42, 0.2, i % 2 ? '#5f8a34' : '#6f9a3a', [1.3, 0.35, 1.1], undefined, a);
      }
      r.caixa(0.06, 0.18, 0.06, 0.18, 0, -0.12, '#4f7a2a', 0.01);
    }),
  );
  /** A abóbora que cresce (desenhada com o tamanho cheio; a escala faz o crescer). */
  const aboboraHorta = montar(
    'baile-abobora-horta',
    desenhar((r) => abobora(r, 0, 0, 0, 0.82, 8)),
  );
  /** As gotinhas da rega (caem uma vez quando ela rega). */
  const gotas = montar(
    'baile-gotas',
    desenhar((r) => {
      for (let i = 0; i < 7; i++) {
        const a = i * 2.4;
        bolinha(r, Math.cos(a) * 0.25, 0.4 + (i % 3) * 0.25, Math.sin(a) * 0.25, 0.045, '#8fd0ff', [1, 1.4, 1]);
      }
    }),
  );
  for (const n of [broto, rama, aboboraHorta, gotas]) {
    n.position.set(px, chao, pz);
    n.setEnabled(false);
  }
  /** Quando a rega aconteceu nesta tela (as gotinhas caem). */
  let regouEm = -1e9;

  // ------------------------------------------------------------------ n4: as carinhas e o lampião
  const estrelas = pm.carinhas.map((c, i) => {
    const n = montar(
      `baile-estrela-carinha-${i}`,
      desenhar((r) => {
        const d = r.d as DesenhoBaile;
        const luz = new Ref({ ...d, corpo: d.luz }, r.p);
        // a estrelinha dourada (quatro pontas, de bolinhas achatadas)
        bolinha(luz, 0, 0, 0, 0.06, '#ffd56a');
        for (const [dx, dy] of [
          [0.1, 0],
          [-0.1, 0],
          [0, 0.1],
          [0, -0.1],
        ])
          bolinha(luz, dx, dy, 0, 0.035, '#ffe9a0', [1, 1, 0.5]);
      }),
      [],
      true,
    );
    n.position.set(c[0], c[1] + 0.55, c[2]);
    n.setEnabled(false);
    return n;
  });
  let lampiao: { c: number; no: TransformNode } | null = null;
  function lampiaoDaPorta(c: number): TransformNode {
    const d = desenhar((r, dd) => {
      abobora(r, 0, 0, 0, 0.7, 8);
      rostoDaAbobora(r, dd, [0, 0, 0], 0.7, 8, CARINHAS[c], 'sempre');
    });
    const no = montar(`baile-lampiao-porta-${c}`, d, [d.noite]);
    // na quina da porta da Vovó, encostado no batente, virado para a rua (do outro lado fica o
    // banquinho do Tufinho, e o lampião da casa do lado de lá)
    const a = ((vovo.dir & 3) * Math.PI) / 2;
    const lado = 1.05;
    const frente = -0.05;
    no.position.set(vovo.x + Math.cos(a) * lado + Math.sin(a) * frente, chao, vovo.z - Math.sin(a) * lado + Math.cos(a) * frente);
    no.rotation.y = a;
    no.scaling.setAll(1.15);
    return no;
  }

  // ------------------------------------------------------------------ n1: o docinho e a travessura
  const docinho = desenhar((r) => {
    // o brigadeiro na forminha (o mesmo da barraca, um tico maior para se ver voando)
    bolinha(r, 0, 0.1, 0, 0.11, '#5a3424');
    for (let i = 0; i < 6; i++) {
      const a = i * 1.1;
      bolinha(r, Math.cos(a) * 0.08, 0.16 + (i % 2) * 0.04, Math.sin(a) * 0.08, 0.022, '#ff9a3a');
    }
    r.caixa(0.2, 0.08, 0.2, 0, 0, 0, '#f6ecdc', 0.02);
  });
  const fantasma = desenhar((rr) => {
    // o fantasminha de lençol: a cúpula clarinha, a barra em ondinhas, os olhos redondos e o sorriso
    // (no material aceso, sem halo: de noite ele fica clarinho, nunca cinza, e se lê de longe)
    const d = rr.d as DesenhoBaile;
    const r = new Ref({ ...d, corpo: d.luz }, rr.p);
    bolinha(r, 0, 0.55, 0, 0.32, '#f4f0fa', [1, 1.15, 1], undefined, 0, 12);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      bolinha(r, Math.cos(a) * 0.27, 0.2, Math.sin(a) * 0.27, 0.11, '#ece6f6');
    }
    r.caixa(0.5, 0.3, 0.5, 0, 0.18, 0, '#f4f0fa', 0.12);
    for (const s of [-1, 1]) {
      bolinha(r, s * 0.1, 0.62, 0.29, 0.05, '#3a2a4a');
      bolinha(r, s * 0.085, 0.64, 0.33, 0.015, '#ffffff');
      bolinha(r, s * 0.2, 0.52, 0.25, 0.04, '#ffb0c0', [1, 0.6, 0.4]);
    }
    r.caixa(0.12, 0.03, 0.03, 0, 0.5, 0.3, '#3a2a4a', 0.01);
    // as mãozinhas de pano (uma dá tchau)
    bolinha(r, -0.34, 0.45, 0.05, 0.08, '#f4f0fa');
  });
  const maoFantasma = desenhar((rr) => {
    const d = rr.d as DesenhoBaile;
    bolinha(new Ref({ ...d, corpo: d.luz }, rr.p), 0, 0, 0, 0.08, '#f4f0fa');
  });
  // as folhinhas do confete (achatadas, uma malha por cor): laranja, dourado, oliva e cobre
  const CORES_FOLHA = ['#f0862a', '#e8b040', '#7a9a3a', '#c8622a', '#ffb050'];
  // (no material aceso, sem halo: o confete se vê de dia e de noite, colorido, sem virar luz)
  const folhas = CORES_FOLHA.map((c, i) =>
    montar(
      `baile-folha-${i}`,
      desenhar((r) => {
        const d = r.d as DesenhoBaile;
        bolinha(new Ref({ ...d, corpo: d.luz }, r.p), 0, 0, 0, 0.11, c, [1.4, 0.25, 0.85]);
      }),
      [],
      true,
    ),
  );
  for (const f of folhas) f.setEnabled(false);
  interface Voando {
    no: TransformNode;
    t0: number;
    dur: number;
    de: V3;
    para: () => V3;
    fim?: () => void;
  }
  const voando: Voando[] = [];
  interface Travessura {
    t0: number;
    no: TransformNode;
    mao: TransformNode;
    base: V3;
    giro: number;
    confete: { no: TransformNode; v: V3; p: V3; gira: number }[];
    /** T21: o confete já saiu (o "pof" e as folhinhas soam uma vez). */
    estourou: boolean;
  }
  const travessuras: Travessura[] = [];
  /** Onde fica o meio da porta `i` da rua, e para onde ela olha. */
  const daPorta = (i: number) => {
    const q = pt.portas[i];
    const a = ((q.dir & 3) * Math.PI) / 2;
    return { x: q.x, z: q.z, a, f: [Math.sin(a), Math.cos(a)] as const };
  };

  function soltarDocinho(i: number, quem: string, t: number): void {
    const p = daPorta(i);
    // (da mão do morador da porta, que dá o doce: o vizinho do lado dela, ou a Vovó na varanda;
    // sem ele, do vão da porta)
    const q = pt.portas[i];
    const quemDa = q.vovo ? { x: pt.postos.vovo[0], z: pt.postos.vovo[2] } : pt.vizinhos[i];
    const de: V3 = quemDa
      ? [quemDa.x + (p.x - quemDa.x) * 0.25, chao + 1.15, quemDa.z + (p.z - quemDa.z) * 0.25]
      : [p.x - p.f[0] * 0.6, chao + 1.2, p.z - p.f[1] * 0.6];
    const no = montar('baile-docinho', docinho);
    no.position.set(...de);
    voando.push({
      no,
      t0: t + 0.45,
      dur: 0.7,
      de,
      para: () => {
        const pes = op.pes(quem);
        return pes ? [pes[0], pes[1] + 0.95, pes[2]] : de;
      },
      fim: () => op.som?.('plim', quem === op.voce() ? 0.8 : 0.4),
    });
    no.setEnabled(false);
  }

  function travessura(i: number, t: number): void {
    const p = daPorta(i);
    // (na soleira, para fora do vão: ele sai pela porta aberta e flutua na frente dela, na altura da
    // criança, do tamanho dela, bem à vista; nunca no alto da porta, atrás do toldinho)
    // (a frente da porta, `f`, aponta para a rua)
    const base: V3 = [p.x + p.f[0] * 0.65, chao, p.z + p.f[1] * 0.65];
    const no = montar('baile-fantasminha', fantasma, [], true);
    const mao = montar('baile-fantasminha-mao', maoFantasma, [], true);
    mao.parent = no;
    mao.position.set(0.34, 0.55, 0.05);
    no.position.set(...base);
    no.rotation.y = p.a;
    no.scaling.setAll(0.001);
    const confete: Travessura['confete'] = [];
    for (let k = 0; k < 36; k++) {
      const f = folhas[k % folhas.length].clone(`baile-confete-${k}`, null)!;
      f.setEnabled(false);
      const ang = (k / 36) * Math.PI * 2 + Math.sin(k * 7.3) * 0.4;
      const forca = 1.6 + ((k * 37) % 10) / 10;
      confete.push({
        no: f,
        p: [0, 0, 0],
        v: [Math.cos(ang) * forca * 0.6 + p.f[0] * 1.2, 2.6 + ((k * 13) % 7) / 5, Math.sin(ang) * forca * 0.6 + p.f[1] * 1.2],
        gira: ((k % 5) - 2) * 3,
      });
    }
    travessuras.push({ t0: t + 0.3, no, mao, base, giro: p.a, confete, estourou: false });
    op.som?.('risadinha', 0.7, { x: base[0], z: base[2] });
  }

  function cuidarDaTravessura(t: number, dt: number): void {
    for (let k = travessuras.length - 1; k >= 0; k--) {
      const q = travessuras[k];
      const b = t - q.t0;
      if (b > 3.2) {
        for (const c of q.confete) c.no.dispose();
        q.no.dispose();
        travessuras.splice(k, 1);
        continue;
      }
      // ele sobe devagar da porta (nada de pulo de susto), dá tchau e volta para dentro
      const sobe = b < 0 ? 0 : b < 0.6 ? b / 0.6 : b < 2.2 ? 1 : Math.max(0, 1 - (b - 2.2) / 0.6);
      const e = sobe * sobe * (3 - 2 * sobe);
      q.no.scaling.setAll(Math.max(0.001, 1.75 * e));
      q.no.position.set(q.base[0], q.base[1] + 0.12 + 0.3 * e + Math.sin(t * 2.4) * 0.05 * e, q.base[2]);
      q.no.rotation.z = Math.sin(t * 1.8) * 0.06;
      q.mao.position.y = 0.55 + Math.max(0, Math.sin(t * 7)) * 0.18;
      // o confete de folhinhas sai quando ele chega lá em cima, e cai devagar girando
      if (b >= 0.55 && !q.estourou) {
        q.estourou = true;
        op.som?.('confete', 0.9, { x: q.base[0], z: q.base[2] });
      }
      if (b >= 0.55)
        for (const c of q.confete) {
          if (!c.no.isEnabled()) {
            c.no.setEnabled(true);
            c.p = [q.base[0], q.base[1] + 1.4, q.base[2]];
          }
          c.v[1] = Math.max(-0.9, c.v[1] - 6 * dt);
          const ar = Math.pow(0.35, dt);
          c.v[0] *= ar;
          c.v[2] *= ar;
          c.p[0] += c.v[0] * dt;
          c.p[1] = Math.max(chao + 0.02, c.p[1] + c.v[1] * dt);
          c.p[2] += c.v[2] * dt;
          c.no.position.set(c.p[0] + Math.sin(t * 3 + c.gira) * 0.08, c.p[1], c.p[2]);
          c.no.rotation.set(t * c.gira * 0.5, t * c.gira, 0);
          const some = b > 2.6 ? Math.max(0.001, 1 - (b - 2.6) / 0.6) : 1;
          c.no.scaling.setAll(some);
        }
    }
  }

  function cuidarDoQueVoa(t: number): void {
    for (let k = voando.length - 1; k >= 0; k--) {
      const v = voando[k];
      const f = (t - v.t0) / v.dur;
      if (f < 0) continue;
      if (f >= 1) {
        v.fim?.();
        v.no.dispose();
        voando.splice(k, 1);
        continue;
      }
      v.no.setEnabled(true);
      const para = v.para();
      const e = f * f * (3 - 2 * f);
      v.no.position.set(
        v.de[0] + (para[0] - v.de[0]) * e,
        v.de[1] + (para[1] - v.de[1]) * e + Math.sin(f * Math.PI) * 0.9,
        v.de[2] + (para[2] - v.de[2]) * e,
      );
      v.no.rotation.y = t * 6;
      v.no.scaling.setAll(1 - 0.35 * f);
    }
  }

  // ------------------------------------------------------------------ n3: a Lulu escondida
  let lulu: LuluNaTela | null = null;
  /** O esconderijo em que a Lulu desta tela está (e quando ela foi achada lá). */
  let luluEm = -1;
  let achadaEm = -1e9;
  let proximaRisada = 0;
  function cuidarDaLulu(t: number, dt: number): void {
    const usos = op.usos(M_LULU);
    const aberta = op.aberta(M_LULU);
    let k = aberta ? passoDaLulu(usos) : -1;
    // achada agora há pouco: ela fica no esconderijo de antes, pulando
    const comemorando = t - achadaEm < 1.7;
    if (comemorando) k = luluEm;
    const e = pt.esconderijos[k];
    if (!e || !temChao(e.x, e.z)) {
      lulu?.mostrar(false);
      return;
    }
    if (!lulu) lulu = op.criarLulu();
    if (!lulu) return;
    luluEm = k;
    lulu.mostrar(true);
    const pes = op.pes(op.voce());
    const d = pes ? Math.hypot(pes[0] - e.x, pes[2] - e.z) : 99;
    // de longe só a pontinha do lençol; perto, ela espia mais (de lado, para fora do esconderijo)
    const perto = Math.max(0, Math.min(1, 1 - (d - 2) / 6));
    const vai = Math.max(0, Math.sin(t * 1.3)) ** 2;
    const lado = comemorando ? 0.55 : 0.12 + (0.2 + 0.3 * perto) * vai;
    const dx = Math.cos(e.yaw) * lado;
    const dz = -Math.sin(e.yaw) * lado;
    const sobe = comemorando ? Math.abs(Math.sin((t - achadaEm) * Math.PI * 1.6)) * 0.5 : 0;
    lulu.posicionar(e.x + dx, e.y + sobe, e.z + dz, e.yaw);
    lulu.quadro(dt);
    // a risadinha cresce perto do esconderijo (só na tela de quem procura)
    if (!comemorando && d < MISSOES_BAILE.risadinha && t >= proximaRisada) {
      const f = 1 - d / MISSOES_BAILE.risadinha;
      op.som?.('risadinha', 0.2 + 0.6 * f, { x: e.x, z: e.z });
      proximaRisada = t + 3.2 - 1.4 * f;
    }
  }

  // ------------------------------------------------------------------ n5: onde o Tufinho fica
  /** Onde o Tufinho está nesta tela (anda macio até o lugar que a vista pede). */
  let gato: { x: number; z: number; yaw: number; anda: number } | null = null;
  const banco = plano.pecas.find((q) => q.tipo === 'banquinho');
  function lugarDoTufinho(t: number, dt: number): { x: number; y: number; z: number; yaw: number; anda: number; brinca: boolean } | null {
    const v = op.estado();
    // a cópia fugida desta criança manda na tela dela; senão, o Tufinho de verdade
    const modo = v?.tc ?? v?.tf.o ?? 'casa';
    const quem = v?.tc ? op.voce() : v?.tf.q;
    if (modo === 'casa' || !banco) {
      gato = null;
      return null;
    }
    let alvo: [number, number];
    let olha: number | null = null;
    if (modo === 'horta') {
      // T21: na horta ele brinca de verdade: passeia devagar entre três cantinhos em volta do lugar
      // dele (perto o bastante para o dedo achar), para, dá o pulinho de gato e vai de novo
      const k = Math.floor(t / 3.4) % 3;
      const ang = k * 2.1 + 0.4;
      alvo = [pt.tufinhoHorta[0] + Math.cos(ang) * RODA_NA_HORTA, pt.tufinhoHorta[2] + Math.sin(ang) * RODA_NA_HORTA];
    } else {
      const p = quem ? op.pes(quem) : null;
      if (!p) return null;
      // atrás de quem ele segue, um tico de lado (nunca no pé dela)
      const de = gato ?? { x: banco.x, z: banco.z };
      const d = Math.hypot(de.x - p[0], de.z - p[2]) || 1;
      alvo = [p[0] + ((de.x - p[0]) / d) * 1.3, p[2] + ((de.z - p[2]) / d) * 1.3];
      olha = Math.atan2(p[0] - alvo[0], p[2] - alvo[1]);
    }
    // (chegou agora: do banquinho, ou de onde estava)
    if (!gato) gato = { x: modo === 'horta' ? alvo[0] : banco.x, z: modo === 'horta' ? alvo[1] : banco.z, yaw: 0, anda: 0 };
    const dx = alvo[0] - gato.x;
    const dz = alvo[1] - gato.z;
    const d = Math.hypot(dx, dz);
    // longe demais (pulou para perto, a tela ficou para trás): aparece perto, sem atravessar o mundo
    if (d > 24) {
      gato.x = alvo[0] - (dx / d) * 2;
      gato.z = alvo[1] - (dz / d) * 2;
    }
    // (na horta, o passeio é devagar; atrás de quem ele segue, o trote de gato que alcança)
    const passo = Math.min(d, (modo === 'horta' ? 1.3 : d > 3 ? 6.5 : 4.2) * dt);
    if (d > 0.05) {
      gato.x += (dx / d) * passo;
      gato.z += (dz / d) * passo;
      const quer = Math.atan2(dx, dz);
      let gira = quer - gato.yaw;
      gira = Math.atan2(Math.sin(gira), Math.cos(gira));
      gato.yaw += gira * Math.min(1, dt * 8);
    } else if (olha !== null) {
      let gira = olha - gato.yaw;
      gira = Math.atan2(Math.sin(gira), Math.cos(gira));
      gato.yaw += gira * Math.min(1, dt * 4);
    }
    gato.anda += (passo / Math.max(dt, 1e-3) - gato.anda) * Math.min(1, dt * 8);
    // na horta ele brinca: parado no cantinho, um pulinho de gato de vez em quando (andando, quem
    // anda são as patinhas: nada de pular no lugar)
    const brinca = modo === 'horta' && d < 0.3;
    const pulo = brinca ? Math.max(0, Math.sin(t * 2.6)) ** 6 * 0.3 : 0;
    return { x: gato.x, y: chao + pulo, z: gato.z, yaw: gato.yaw, anda: gato.anda, brinca };
  }

  // ------------------------------------------------------------------ o quadro
  let relogio = 0;
  /** Quando o último quadro do núcleo chegou, no relógio da tela (a plantinha conta daqui). */
  let recebidoEm = 0;
  let ultimaVista: BaileVista | null = null;
  return {
    quadro(t: number, dt: number): void {
      relogio = t;
      const v = op.estado();
      // (um quadro novo do núcleo chegou: a plantinha conta o tempo dela daqui)
      if (v !== ultimaVista) {
        ultimaVista = v;
        recebidoEm = t;
      }
      // n4: a plantinha desta criança (no passo de plantar)
      const naHorta = op.aberta(M_ABOBORA) && passoEmOrdem(USOS_ABOBORA, op.usos(M_ABOBORA)) === 0;
      const hv = naHorta && temChao(px, pz) ? (v?.hv ?? null) : null;
      broto.setEnabled(hv?.f === 'broto');
      rama.setEnabled(hv?.f === 'regada');
      aboboraHorta.setEnabled(hv?.f === 'regada');
      if (hv?.f === 'regada') {
        // (a vista chega a cada segundo: o tempo da tela anda entre um quadro e outro)
        const r = Math.min(MISSOES_BAILE.cresce, hv.r + Math.max(0, t - recebidoEm));
        const f = Math.min(1, r / MISSOES_BAILE.cresce);
        const pronta = prontaParaColher(hv.f, r);
        const pulo = pronta ? Math.abs(Math.sin(t * 3)) * 0.06 : 0;
        aboboraHorta.scaling.setAll(0.2 + 0.8 * f);
        aboboraHorta.position.y = chao + pulo;
        rama.scaling.setAll(0.5 + 0.5 * f);
      }
      const g = t - regouEm;
      gotas.setEnabled(g >= 0 && g < 0.9);
      if (gotas.isEnabled()) gotas.position.y = chao + 0.6 - g * 0.8;
      // as estrelinhas das carinhas (no passo de escolher)
      const escolher = op.aberta(M_ABOBORA) && passoEmOrdem(USOS_ABOBORA, op.usos(M_ABOBORA)) === 1;
      estrelas.forEach((n, i) => {
        n.setEnabled(escolher && temChao(pm.carinhas[i][0], pm.carinhas[i][2]));
        if (!n.isEnabled()) return;
        n.position.y = pm.carinhas[i][1] + 0.3 + Math.sin(t * 3 + i * 1.7) * 0.05;
        n.rotation.z = Math.sin(t * 2 + i) * 0.3;
      });
      // o lampião de carinha na porta da Vovó (de todos)
      const lp = v?.lp;
      if (lp === undefined || !temChao(vovo.x, vovo.z)) {
        lampiao?.no.dispose();
        lampiao = null;
      } else if (lampiao?.c !== lp) {
        lampiao?.no.dispose();
        lampiao = { c: lp, no: lampiaoDaPorta(lp) };
      }
      cuidarDoQueVoa(t);
      cuidarDaTravessura(t, dt);
      cuidarDaLulu(t, dt);
    },
    /** n5: onde o Tufinho fica nesta tela (null: no banquinho da varanda). */
    tufinho: lugarDoTufinho,
    evento(e: EventoMissoesBaile): void {
      const t = relogio;
      if (e.e === 'bailePorta' && e.doce) soltarDocinho(e.i, e.quem, t);
      if (e.e === 'bailePorta' && e.travessura) travessura(e.i, t);
      if (e.e === 'baileHorta' && e.quem === op.voce() && e.f === 'regou') regouEm = t;
      if (e.e === 'baileLulu' && e.quem === op.voce()) {
        achadaEm = t;
        luluEm = e.k;
        lulu?.comemorar();
        op.som?.('brilho', 0.7);
        // (achada, ela ri contente, pertinho)
        op.som?.('risadinha', 1);
      }
    },
    /** Testes e fotos. */
    estado: () => ({
      broto: broto.isEnabled(),
      abobora: aboboraHorta.isEnabled() ? aboboraHorta.scaling.x : 0,
      estrelas: estrelas.filter((n) => n.isEnabled()).length,
      lampiao: lampiao?.c ?? null,
      voando: voando.length,
      travessuras: travessuras.length,
      lulu: luluEm,
    }),
    descartar(): void {
      for (const n of [broto, rama, aboboraHorta, gotas, ...estrelas, ...folhas]) n.dispose();
      lampiao?.no.dispose();
      for (const v of voando) v.no.dispose();
      for (const q of travessuras) {
        for (const c of q.confete) c.no.dispose();
        q.no.dispose();
      }
      lulu?.descartar();
    },
  };
}

export type MissoesNaTela = ReturnType<typeof criarMissoesNaTela>;
