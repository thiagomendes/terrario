/**
 * Régua de encaixe dos bichos (014c, o mesmo padrão da spec 017 para os bonecos): pernas,
 * cabeça, rabo e asas presos no corpo em todas as poses do passo, e a boca de cima de cada
 * perna escondida dentro do corpo (nenhuma fresta quando a perna balança). As peças viram
 * distâncias com sinal (caixa arredondada e elipsoide, com o giro de cada uma) e cada junta gira
 * em volta do pivô dela, como no desenho do jogo.
 */
import type { PecaBicho } from './bichoBrinquedo';
import type { Junta } from './juntasBicho';

type V3 = [number, number, number];

/** Giro de Euler do Babylon (YXZ: yaw, pitch, roll), aplicado num ponto. */
function girar(p: V3, rot: V3): V3 {
  const [rx, ry, rz] = rot;
  // Babylon: Quaternion.RotationYawPitchRoll(y, x, z) → aplica z, depois x, depois y
  let [x, y, z] = p;
  // z (roll)
  let c = Math.cos(rz);
  let s = Math.sin(rz);
  [x, y] = [x * c - y * s, x * s + y * c];
  // x (pitch)
  c = Math.cos(rx);
  s = Math.sin(rx);
  [y, z] = [y * c - z * s, y * s + z * c];
  // y (yaw)
  c = Math.cos(ry);
  s = Math.sin(ry);
  [x, z] = [x * c + z * s, -x * s + z * c];
  return [x, y, z];
}
function desgirar(p: V3, rot: V3): V3 {
  const [rx, ry, rz] = rot;
  let [x, y, z] = p;
  let c = Math.cos(-ry);
  let s = Math.sin(-ry);
  [x, z] = [x * c + z * s, -x * s + z * c];
  c = Math.cos(-rx);
  s = Math.sin(-rx);
  [y, z] = [y * c - z * s, y * s + z * c];
  c = Math.cos(-rz);
  s = Math.sin(-rz);
  [x, y] = [x * c - y * s, x * s + y * c];
  return [x, y, z];
}

/** Uma peça no lugar (já com o giro da junta): distância com sinal e pontos da casca. */
export interface PecaPosta {
  peca: PecaBicho;
  /** Do mundo do bicho para o espaço da peça. */
  local(q: V3): V3;
  /** Do espaço da peça para o mundo do bicho. */
  mundo(q: V3): V3;
  distancia(q: V3): number;
}

function sdfPeca(p: PecaBicho, l: V3): number {
  const [w, h, d] = p.t;
  if (p.forma === 'bola') {
    const r: V3 = [w / 2, h / 2, d / 2];
    const k0 = Math.hypot(l[0] / r[0], l[1] / r[1], l[2] / r[2]);
    return (k0 - 1) * Math.min(...r);
  }
  const raio = Math.min(p.raio, w / 2, h / 2, d / 2);
  const q = [Math.abs(l[0]) - (w / 2 - raio), Math.abs(l[1]) - (h / 2 - raio), Math.abs(l[2]) - (d / 2 - raio)];
  const fora = Math.hypot(Math.max(q[0], 0), Math.max(q[1], 0), Math.max(q[2], 0));
  const dentro = Math.min(Math.max(q[0], q[1], q[2]), 0);
  return fora + dentro - raio;
}

/** Põe a peça no bicho: o giro próprio dela e o giro da junta (em volta do pivô). */
export function porPeca(p: PecaBicho, pivo: V3, giroJunta: V3, sobe = 0): PecaPosta {
  const rot: V3 = (p.rot as V3 | undefined) ?? [0, 0, 0];
  const rel: V3 = [p.p[0] - pivo[0], p.p[1] - pivo[1], p.p[2] - pivo[2]];
  const centro = (() => {
    const g = girar(rel, giroJunta);
    return [g[0] + pivo[0], g[1] + pivo[1] + sobe, g[2] + pivo[2]] as V3;
  })();
  const local = (q: V3): V3 => {
    const a = desgirar([q[0] - centro[0], q[1] - centro[1], q[2] - centro[2]], giroJunta);
    return desgirar(a, rot);
  };
  const mundo = (q: V3): V3 => {
    const a = girar(girar(q, rot), giroJunta);
    return [a[0] + centro[0], a[1] + centro[1], a[2] + centro[2]];
  };
  return { peca: p, local, mundo, distancia: (q) => sdfPeca(p, local(q)) };
}

/** Pontos na casca da peça (no espaço dela), numa grade em cada face. */
export function casca(p: PecaBicho, n = 5): V3[] {
  const [w, h, d] = p.t;
  const out: V3[] = [];
  if (p.forma === 'bola') {
    for (let i = 0; i <= n * 2; i++)
      for (let j = 0; j <= n; j++) {
        const a = (i / (n * 2)) * Math.PI * 2;
        const b = (j / n) * Math.PI - Math.PI / 2;
        out.push([(Math.cos(a) * Math.cos(b) * w) / 2, (Math.sin(b) * h) / 2, (Math.sin(a) * Math.cos(b) * d) / 2]);
      }
    return out;
  }
  for (let i = 0; i <= n; i++)
    for (let j = 0; j <= n; j++) {
      const u = i / n - 0.5;
      const v = j / n - 0.5;
      out.push([u * w, v * h, d / 2], [u * w, v * h, -d / 2]);
      out.push([w / 2, u * h, v * d], [-w / 2, u * h, v * d]);
      out.push([u * w, h / 2, v * d], [u * w, -h / 2, v * d]);
    }
  return out;
}

export interface Pose {
  nome: string;
  /** Giro das patas (rad), da cabeça (x, y), do rabo (y) e das asas (z). */
  perna: number;
  ergue: number;
  cabeca: [number, number];
  rabo: number;
  asa: number;
}

/** As poses do passo e do parado (os extremos que o jogo usa). */
export const POSES_BICHO: Pose[] = [
  { nome: 'parado', perna: 0, ergue: 0, cabeca: [0.25, 0], rabo: 0, asa: 0 },
  { nome: 'passo+', perna: 0.62, ergue: 0, cabeca: [0.11, 0.45], rabo: 0.35, asa: 0.6 },
  { nome: 'passo-', perna: -0.62, ergue: 0, cabeca: [-0.11, -0.45], rabo: -0.35, asa: -0.6 },
  { nome: 'galope+', perna: 0.8, ergue: 0, cabeca: [0.31, 0.45], rabo: 0.35, asa: 0.6 },
  { nome: 'galope-', perna: -0.8, ergue: 0, cabeca: [-0.11, -0.45], rabo: -0.35, asa: -0.6 },
];

export interface ProblemaBicho {
  tipo: 'solto' | 'quadril';
  junta: string;
  pose: string;
  medida: number;
}

type Giro = { giro: V3; sobe: number };
function giroDaPose(papel: string, pose: Pose, ergueMax: number): Giro {
  if (papel === 'perna0' || papel === 'perna1') {
    const s = papel === 'perna0' ? 1 : -1;
    return { giro: [pose.perna * s, 0, 0], sobe: pose.perna * s < 0 ? ergueMax * pose.ergue : 0 };
  }
  if (papel === 'cabeca') return { giro: [pose.cabeca[0], pose.cabeca[1], 0], sobe: 0 };
  if (papel === 'cauda') return { giro: [0, pose.rabo, 0], sobe: 0 };
  if (papel === 'asa0') return { giro: [0, 0, pose.asa], sobe: 0 };
  if (papel === 'asa1') return { giro: [0, 0, -pose.asa], sobe: 0 };
  return { giro: [0, 0, 0], sobe: 0 };
}

/** O corpo do bicho (as peças sem papel) como distância com sinal. */
function medirCorpo(juntas: Junta<PecaBicho>[]): ((q: V3) => number) | null {
  const corpoJ = juntas.find((j) => !j.papel);
  if (!corpoJ) return null;
  const corpo = corpoJ.pecas.map((p) => porPeca(p, corpoJ.pivo, [0, 0, 0]));
  return (q) => {
    let d = Infinity;
    for (const c of corpo) d = Math.min(d, c.distancia(q));
    return d;
  };
}

/** O pior vão da junta até o corpo e o pior ponto da boca da pata fora (corpo ou bolinha). */
function medirJunta(
  j: Junta<PecaBicho>,
  dCorpo: (q: V3) => number,
  pose: Pose,
  ergueMax: number,
): { vao: number; boca: number } {
  const { giro, sobe } = giroDaPose(j.papel!, pose, ergueMax);
  const postas = j.pecas.map((p) => porPeca(p, j.pivo, giro, sobe));
  let vao = Infinity;
  for (const pp of postas)
    for (const q of casca(pp.peca, 6)) {
      vao = Math.min(vao, dCorpo(pp.mundo(q)));
      if (vao <= 0) break;
    }
  if (!j.papel!.startsWith('perna')) return { vao, boca: 0 };
  // a boca de cima da peça mais alta da pata (sem as bolinhas da junta)
  const pernas = postas.filter((pp) => !pp.peca.junta);
  const bolinhas = postas.filter((pp) => pp.peca.junta);
  const alta = pernas.reduce((a, b) =>
    b.peca.p[1] + b.peca.t[1] / 2 > a.peca.p[1] + a.peca.t[1] / 2 ? b : a,
  );
  const [w, h, d] = alta.peca.t;
  const r = alta.peca.forma === 'bola' ? 0 : Math.min(alta.peca.raio, w / 2, d / 2);
  let boca = 0;
  for (let a = 0; a <= 4; a++)
    for (let b = 0; b <= 4; b++) {
      const q = alta.mundo([(a / 4 - 0.5) * (w - r), h / 2, (b / 4 - 0.5) * (d - r)]);
      let dd = dCorpo(q);
      for (const bo of bolinhas) dd = Math.min(dd, bo.distancia(q));
      boca = Math.max(boca, dd);
    }
  return { vao, boca };
}

/**
 * Confere um bicho: cada junta (pata, cabeça, rabo, asa) encosta no corpo em toda pose
 * (vão ≤ folga), e a boca de cima de cada pata fica dentro do corpo ou da bolinha da junta
 * (nenhuma fresta quando a perna balança).
 */
export function conferirBicho(
  juntas: Junta<PecaBicho>[],
  ergueMax: number,
  folga = 0.01,
): ProblemaBicho[] {
  const dCorpo = medirCorpo(juntas);
  if (!dCorpo) return [];
  const problemas: ProblemaBicho[] = [];
  for (const pose of POSES_BICHO)
    juntas.forEach((j, i) => {
      if (!j.papel || j.papel === 'roda' || j.papel === 'antena') return;
      const m = medirJunta(j, dCorpo, pose, ergueMax);
      if (m.vao > folga)
        problemas.push({ tipo: 'solto', junta: `${j.papel}#${i}`, pose: pose.nome, medida: m.vao });
      if (m.boca > folga)
        problemas.push({ tipo: 'quadril', junta: `${j.papel}#${i}`, pose: pose.nome, medida: m.boca });
    });
  return problemas;
}

const MAX_PUXA = 0.25;

/**
 * O encaixe (014c, o padrão da 017 para os bonecos): devolve as peças com
 * - cada pata cuja boca de cima aparece no passo com uma bolinha de junta no quadril (da cor da
 *   perna, no pivô: gira no lugar, como a junta de um boneco articulado);
 * - o rabo e as asas puxados para o corpo até encostarem nele em toda pose.
 */
export function encaixarBicho(
  pecas: readonly PecaBicho[],
  juntasDe: (p: PecaBicho[]) => Junta<PecaBicho>[],
  ergueDe: (j: Junta<PecaBicho>[]) => number,
  folga = 0.01,
): PecaBicho[] {
  const out: PecaBicho[] = pecas.map((p) => ({ ...p, t: [...p.t] as V3, p: [...p.p] as V3 }));
  let j = juntasDe(out);
  const dCorpo = medirCorpo(j);
  if (!dCorpo) return out;
  const ergue = ergueDe(j);
  const ruim = (jj: Junta<PecaBicho>, qual: 'vao' | 'boca') =>
    POSES_BICHO.some((pose) => medirJunta(jj, dCorpo, pose, ergue)[qual] > folga);
  // patas: a bolinha da junta no quadril, do tamanho que cobre a boca
  for (const junta of j) {
    if (!junta.papel?.startsWith('perna') || !ruim(junta, 'boca')) continue;
    const alta = junta.pecas.reduce((a, b) => (b.p[1] + b.t[1] / 2 > a.p[1] + a.t[1] / 2 ? b : a));
    const [w, , d] = alta.t;
    for (let f = 0.62; f <= 1.2; f += 0.04) {
      const r = Math.max(w, d) * f;
      const bolinha: PecaBicho = {
        t: [r * 2, r * 2, r * 2],
        p: [alta.p[0], junta.pivo[1], alta.p[2]],
        cor: alta.cor,
        papel: junta.papel,
        forma: 'bola',
        raio: 0,
        junta: true,
      };
      const teste: Junta<PecaBicho> = { ...junta, pecas: [...junta.pecas, bolinha] };
      if (!ruim(teste, 'boca') || f + 0.04 > 1.2) {
        out.push(bolinha);
        break;
      }
    }
  }
  j = juntasDe(out);
  // rabo e asas soltos: a junta inteira vem para o corpo, de meio em meio cm
  const corpo = out
    .filter((p) => !p.papel)
    .sort((a, b) => b.t[0] * b.t[1] * b.t[2] - a.t[0] * a.t[1] * a.t[2])[0];
  if (corpo)
    for (const papel of ['cauda', 'asa0', 'asa1'] as const) {
      const minhas = out.filter((p) => p.papel === papel);
      if (!minhas.length) continue;
      const solto = () => {
        const jj = juntasDe(out).find((q) => q.papel === papel);
        return !!jj && ruim(jj, 'vao');
      };
      if (!solto()) continue;
      const cx = minhas.reduce((s2, p) => s2 + p.p[0], 0) / minhas.length;
      const cy = minhas.reduce((s2, p) => s2 + p.p[1], 0) / minhas.length;
      const cz = minhas.reduce((s2, p) => s2 + p.p[2], 0) / minhas.length;
      const dir: V3 = [corpo.p[0] - cx, corpo.p[1] - cy, corpo.p[2] - cz];
      const n = Math.hypot(...dir) || 1;
      for (let a = 0.005; a <= MAX_PUXA + 1e-9; a += 0.005) {
        for (const p of minhas) for (let k = 0; k < 3; k++) p.p[k] += (dir[k] / n) * 0.005;
        if (!solto()) break;
      }
    }
  return out;
}
