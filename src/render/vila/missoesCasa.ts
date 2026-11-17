/**
 * As missões da Casa anos 80 na tela (spec 026, parte 3, etapa B). Peças de brinquedo, quadradas e
 * de quina macia como o resto do bairro, em duas ou três cores cada (nada de arco-íris):
 *
 * - **os brinquedos espalhados (f10):** o ioiô no quintal, o pião na sala e o cubo no canto do
 *   quarto, só para quem tem a missão aberta e ainda não pegou; cada um balança devagar e solta
 *   uma estrelinha de vez em quando (a criança de 3 anos acha de longe);
 * - **o brinquedo que vai para o baú:** sai da mão, faz um arco e cai dentro do baú, com o leque
 *   de estrelinhas;
 * - **a fatia de bolo (f12):** aparece em cima do bolo da mesinha da vovó com um "pop" e voa em
 *   arco até a mão da criança.
 */
import type { Scene } from '@babylonjs/core/scene';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { criarPlasticos } from '../formas';
import { Pecas } from '../solidos';
import type { PecaVila, PlanoVila } from '../../world/vilaNeon';
import { COR, Ref, type Desenho } from './ref';
import type { Faisca } from './parque';
import { CASA } from './pecasCasa';

export interface OpcoesMissoesCasa {
  plano: PlanoVila;
  tapaOGlow?(m: Mesh): void;
  emitir?(lista: Faisca[], tipo: 'confete' | 'gota'): void;
}

export interface QuadroMissoesCasa {
  /** O relógio da tela (s). */
  t: number;
  /** Os brinquedos espalhados que esta criança vê (a f10 aberta, ainda não pegos). */
  espalhados: readonly [boolean, boolean, boolean];
  /** A criança deste aparelho (os pés). */
  eu: { x: number; y: number; z: number } | null;
}

export interface RenderMissoesCasa {
  quadro(q: QuadroMissoesCasa): void;
  /** O brinquedo `i` sai da mão da criança e cai no baú (~0,9 s). */
  guardar(i: number): void;
  /** A fatia de bolo aparece em cima do bolo da mesinha e voa até a mão (~1,3 s). */
  bolo(): void;
  /** Testes: o que está à vista. */
  estado(): { espalhados: number; guardando: boolean; fatia: boolean };
  descartar(): void;
}

/** O brinquedo espalhado: um pouco maior que o de verdade (de cima, a criança de 3 anos acha). */
const ESC_ESPALHADO = 1.35;
/** O voo até o baú e o da fatia (s). */
const VOO_BAU = 0.9;
const FATIA_SURGE = 0.4;
const FATIA_ESPERA = 0.3;
const FATIA_VOA = 0.95;
/** Mais longe que isto (blocos) os espalhados não são desenhados. */
const LONGE = 60;

const desenhoMundo = (): Desenho => ({
  corpo: new Pecas(),
  luz: new Pecas(),
  noite: new Pecas(),
  vidro: new Pecas(),
  quadros: [],
  ox: 0,
  oz: 0,
  chao: 0,
  recorte: { x0: -Infinity, z0: -Infinity, x1: Infinity, z1: Infinity },
});
const NA_ORIGEM = { tipo: 'banco', x: 0, y: 0, z: 0, dir: 0 } as PecaVila;

/** O ioiô de pé, de lado (as duas metades vermelhas, o miolo creme e o fio enrolado no chão). */
function ioio(r: Ref): void {
  for (const x of [-0.055, 0.055]) r.prisma(14, 0.17, 0.08, x, 0.17, 0, COR.vermelho, 'x');
  r.prisma(10, 0.06, 0.04, 0, 0.17, 0, CASA.creme, 'x');
  for (const x of [-0.1, 0.1]) r.prisma(14, 0.12, 0.012, x, 0.17, 0, '#ff6a5a', 'x');
  // o fio solto, deitado no chão em duas voltinhas
  r.barra([0, 0.02, 0.15], [0.05, 0.012, 0.32], 0.018, CASA.creme);
  r.barra([0.05, 0.012, 0.32], [-0.06, 0.012, 0.44], 0.018, CASA.creme);
  r.caixa(0.05, 0.03, 0.05, -0.06, 0, 0.44, CASA.creme, 0.012);
}

/** O pião de listras vermelhas e creme, de pé na ponta de madeira. */
function piao(r: Ref): void {
  r.prisma(8, 0.035, 0.07, 0, 0.035, 0, CASA.madeiraClara, 'y');
  r.prisma(12, 0.1, 0.06, 0, 0.1, 0, COR.vermelho, 'y');
  r.prisma(14, 0.16, 0.05, 0, 0.155, 0, COR.vermelho, 'y');
  r.prisma(16, 0.19, 0.05, 0, 0.2, 0, CASA.creme, 'y');
  r.prisma(14, 0.17, 0.06, 0, 0.255, 0, COR.vermelho, 'y');
  r.prisma(12, 0.11, 0.035, 0, 0.3, 0, COR.vermelho, 'y');
  r.prisma(8, 0.03, 0.09, 0, 0.36, 0, CASA.madeira, 'y');
}

/** O cubo de cores 2 × 2 (amarelo em cima, vermelho e azul dos lados, as juntas pretas). */
function cubo(r: Ref): void {
  const L = 0.3;
  const p = L - 0.03;
  r.caixa(L, L, L, 0, 0, 0, '#1c1c24', 0.03);
  r.caixa(p, 0.012, p, 0, L - 0.004, 0, '#ffd23a', 0.006);
  for (const s of [-1, 1]) {
    r.caixa(0.012, p, p, s * (L / 2 + 0.002), 0.015, 0, COR.vermelho, 0.006);
    r.caixa(p, p, 0.012, 0, 0.015, s * (L / 2 + 0.002), '#2f6fd8', 0.006);
  }
  // as juntas cruzando as faces
  r.caixa(0.02, L + 0.012, L + 0.012, 0, -0.004, 0, '#1c1c24', 0);
  r.caixa(L + 0.012, L + 0.012, 0.02, 0, -0.004, 0, '#1c1c24', 0);
  r.caixa(L + 0.012, 0.02, L + 0.012, 0, L / 2 - 0.01, 0, '#1c1c24', 0);
}

/** A fatia de bolo de fubá no pratinho (a cunha deitada, a casca dourada e o açúcar). */
function fatia(r: Ref): void {
  r.prisma(14, 0.2, 0.025, 0, 0.0125, 0, '#f4f8ff', 'y');
  // a cunha em degraus de brinquedo: a ponta para +z, as costas (a casca) para -z
  const passos = 5;
  for (let k = 0; k < passos; k++) {
    const z0 = -0.15 + (k * 0.3) / passos;
    const w = 0.24 * (1 - k / passos) + 0.03;
    r.caixa(w, 0.13, 0.3 / passos + 0.002, 0, 0.025, z0 + 0.15 / passos, '#ffd866', 0.01);
    r.caixa(w + 0.004, 0.02, 0.3 / passos + 0.004, 0, 0.15, z0 + 0.15 / passos, '#d9902e', 0.006);
  }
  r.caixa(0.27, 0.15, 0.025, 0, 0.025, -0.155, '#c9802a', 0.01);
  for (const [x, z] of [
    [-0.05, -0.08],
    [0.04, -0.03],
    [0, 0.05],
  ] as const)
    r.caixa(0.03, 0.01, 0.03, x, 0.17, z, '#fff6e6', 0.004);
}

const DESENHOS = [ioio, piao, cubo] as const;

const suave = (u: number) => u * u * (3 - 2 * u);
/** De 0 a 1 passando um pouco de 1 (o "pop" das coisas que aparecem). */
const pulo = (u: number) => {
  const k = Math.max(0, Math.min(1, u)) - 1;
  return 1 + 2.70158 * k * k * k + 1.70158 * k * k;
};
const rgb = (h: string): [number, number, number] => [
  parseInt(h.slice(1, 3), 16) / 255,
  parseInt(h.slice(3, 5), 16) / 255,
  parseInt(h.slice(5, 7), 16) / 255,
];

export function criarMissoesCasa(scene: Scene, op: OpcoesMissoesCasa): RenderMissoesCasa {
  const c = op.plano.pontos.casa;
  const todas: Mesh[] = [];
  const pl = criarPlasticos(scene, 'vila-missoes-casa');
  const matCorpo = pl.corVertice(0.3) ?? pl.cor('#ffffff', 0.3);
  const ligar = (m: Mesh, ver: boolean) => {
    if (m.isEnabled() !== ver) m.setEnabled(ver);
  };
  const malha = (nome: string, desenhar: (r: Ref) => void): Mesh => {
    const d = desenhoMundo();
    desenhar(new Ref(d, NA_ORIGEM));
    const m = new Mesh(nome, scene);
    d.corpo.juntar().applyToMesh(m);
    m.material = matCorpo;
    m.isPickable = false;
    m.setEnabled(false);
    op.tapaOGlow?.(m);
    todas.push(m);
    return m;
  };
  const espalhados = DESENHOS.map((des, i) => {
    const m = malha(`vila-espalhado-${i}`, des);
    m.scaling.setAll(ESC_ESPALHADO);
    return m;
  });
  // (o voo até o baú usa uma cópia de cada um, do tamanho da mão)
  const voando = DESENHOS.map((des, i) => malha(`vila-guardando-${i}`, des));
  const malhaFatia = malha('vila-fatia-bolo', fatia);

  let agora = 0;
  let eu: QuadroMissoesCasa['eu'] = null;
  /** O brinquedo que vai para o baú: qual, desde quando e de onde saiu. */
  let guardando: { i: number; desde: number; de: [number, number, number] } | null = null;
  let fatiaDesde = -Infinity;
  let fatiaVoando = false;
  /** Quando cada espalhado soltou a última estrelinha. */
  const brilhou = [0, 0, 0];
  let vistos = 0;

  const estrelinhas = (x: number, y: number, z: number, n: number, cores: string[]) =>
    op.emitir?.(
      Array.from({ length: n }, (_, k) => {
        const a = (k / n) * Math.PI * 2 + x;
        return {
          x,
          y,
          z,
          vx: Math.cos(a) * 0.9,
          vy: 1.5 + (k % 3) * 0.35,
          vz: Math.sin(a) * 0.9,
          cor: rgb(cores[k % cores.length]),
        };
      }),
      'confete',
    );

  return {
    guardar(i) {
      if (!voando[i]) return;
      const de: [number, number, number] = eu ? [eu.x, eu.y + 0.85, eu.z] : [c.bau[0], c.bau[1] + 1, c.bau[2]];
      guardando = { i, desde: agora, de };
    },
    bolo() {
      fatiaDesde = agora;
      estrelinhas(c.bolo[0], c.bolo[1] + 0.25, c.bolo[2], 6, ['#ffe66a', '#fff6c8']);
    },
    quadro(qd) {
      const t = qd.t;
      agora = t;
      eu = qd.eu;
      // ---- os espalhados: balançam devagar e soltam uma estrelinha de vez em quando
      vistos = 0;
      espalhados.forEach((m, i) => {
        const q = c.espalhados[i];
        const ver =
          qd.espalhados[i] && !!eu && Math.hypot(eu.x - q[0], eu.z - q[2]) < LONGE;
        ligar(m, ver);
        if (!ver) return;
        vistos++;
        const bob = Math.sin(t * 2.2 + i * 1.7) * 0.035;
        m.position.set(q[0], q[1] + 0.02 + Math.max(0, bob), q[2]);
        m.rotation.y = Math.sin(t * 0.7 + i) * 0.5 + i;
        if (t - brilhou[i] > 1.4 + i * 0.2) {
          brilhou[i] = t;
          estrelinhas(q[0], q[1] + 0.55, q[2], 3, ['#ffe66a', '#fff6c8']);
        }
      });
      // ---- o brinquedo que vai para o baú
      voando.forEach((m, i) => {
        const g = guardando && guardando.i === i ? t - guardando.desde : -1;
        const ver = g >= 0 && g < VOO_BAU;
        ligar(m, ver);
        if (!ver || !guardando) return;
        const u = g / VOO_BAU;
        const s = suave(u);
        const [x0, y0, z0] = guardando.de;
        const [x1, y1, z1] = [c.bau[0], c.bau[1] + 0.55, c.bau[2]];
        m.position.set(
          x0 + (x1 - x0) * s,
          y0 + (y1 - y0) * s + Math.sin(u * Math.PI) * 1.1,
          z0 + (z1 - z0) * s,
        );
        m.rotation.set(0, u * Math.PI * 2, 0);
        m.scaling.setAll(Math.max(0.001, 0.9 * (u > 0.75 ? 1 - suave((u - 0.75) / 0.25) : 1)));
      });
      if (guardando && t - guardando.desde >= VOO_BAU) {
        estrelinhas(c.bau[0], c.bau[1] + 0.75, c.bau[2], 8, ['#ffe66a', '#4a8ad8', '#fff6c8']);
        guardando = null;
      }
      // ---- a fatia: aparece em cima do bolo, espera um instante e voa até a mão
      const g = t - fatiaDesde;
      fatiaVoando = g >= 0 && g < FATIA_SURGE + FATIA_ESPERA + FATIA_VOA;
      ligar(malhaFatia, fatiaVoando);
      if (fatiaVoando) {
        const [x0, y0, z0] = [c.bolo[0], c.bolo[1] + 0.12, c.bolo[2]];
        const yaw = eu ? Math.atan2(eu.x - x0, eu.z - z0) : 0;
        if (g < FATIA_SURGE + FATIA_ESPERA) {
          const k = pulo(g / FATIA_SURGE) * 1.2;
          const salto = g < FATIA_SURGE ? Math.sin((g / FATIA_SURGE) * Math.PI) * 0.22 : 0;
          malhaFatia.position.set(x0, y0 + salto, z0);
          malhaFatia.scaling.setAll(Math.max(0.001, k));
          malhaFatia.rotation.set(0, yaw, 0);
        } else {
          const u = (g - FATIA_SURGE - FATIA_ESPERA) / FATIA_VOA;
          const s = suave(u);
          const ate: [number, number, number] = eu ? [eu.x, eu.y + 0.85, eu.z] : [x0, y0, z0];
          malhaFatia.position.set(
            x0 + (ate[0] - x0) * s,
            y0 + (ate[1] - y0) * s + Math.sin(u * Math.PI) * 0.9,
            z0 + (ate[2] - z0) * s,
          );
          malhaFatia.scaling.setAll(1.2 * (u > 0.7 ? 1 - suave((u - 0.7) / 0.3) * 0.85 : 1));
          malhaFatia.rotation.set(0, yaw + s * Math.PI, 0);
        }
      }
    },
    estado: () => ({ espalhados: vistos, guardando: !!guardando, fatia: fatiaVoando }),
    descartar() {
      for (const m of todas) m.dispose();
      pl.descartar();
    },
  };
}
