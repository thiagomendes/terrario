/**
 * Spec 039 (portão visual, 2ª volta): a coberta de quem está deitado (o edredom da cama e da
 * curtinha, a mantinha do sofá) é um pano macio que cai por cima do corpo: uma grade de alturas
 * tirada do corpo deitado (as caixas de cada pedaço dele, sem a cabeça), engordada e alisada,
 * com a borda caindo pelos lados, a ponta dos pés enfiada no colchão (ou no assento), a dobra
 * virada no pescoço e os quadradinhos (os retalhos) pintados na grade. Nada do corpo passa da
 * coberta: a altura de cada ponto fica acima do pedaço do corpo que está embaixo dele, e a coberta
 * vai do pescoço até dentro da pezeira (ou do braço do sofá), sem atravessar a madeira.
 *
 * Tudo no referencial do móvel (a origem no meio dele, no chão, a frente em +z), já na escala.
 */
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Bloco } from '../../world/blocks';
import { COR_MOVEL as M } from './pecas';

/** Onde a coberta pode ir em cada móvel de deitar (no referencial dele, na escala). */
export interface FormaCoberta {
  /** O eixo do comprimento (o do corpo deitado). */
  eixo: 'x' | 'z';
  /**
   * Até onde a coberta vai no comprimento (por dentro da cabeceira e da pezeira, ou dos braços do
   * sofá). Ela começa no pescoço (a ponta do corpo do lado da cabeça) e vai até a ponta dos pés.
   */
  a0: number;
  a1: number;
  /** A largura (no outro eixo): de fora a fora do estrado, por cima das laterais. */
  c0: number;
  c1: number;
  /** A superfície de baixo (o alto do colchão ou do assento) e quanto a borda cai abaixo dela. */
  base: number;
  cair: number;
  /** Do lado de +c (a frente do sofá), a borda cai mais. */
  cairFrente?: number;
  cor: string;
  retalho: string;
  corDobra: string;
  /** O sofá: a almofadinha deitada debaixo da cabeça (na cama, o travesseiro já está lá). */
  almofada?: boolean;
}

export const COBERTAS: { cama: FormaCoberta; curtinha: FormaCoberta; sofa: FormaCoberta } = {
  // (a cama: o colchão de -0,9 a 0,9, a pezeira de 0,89 a 0,97, as laterais até 0,48 de lado)
  cama: {
    eixo: 'z',
    a0: -0.84,
    a1: 0.85,
    c0: -0.5,
    c1: 0.5,
    base: 0.44 * 1.25,
    cair: 0.2,
    cor: M.cobertor,
    retalho: M.cobertorEscuro,
    corDobra: '#ffffff',
  },
  // (a curtinha: o colchão de -0,41 a 0,41, a pezeira de 0,40 a 0,48)
  curtinha: {
    eixo: 'z',
    a0: -0.36,
    a1: 0.37,
    c0: -0.5,
    c1: 0.5,
    base: 0.44 * 1.25,
    cair: 0.2,
    cor: M.cobertor,
    retalho: M.cobertorEscuro,
    corDobra: '#ffffff',
  },
  // (o sofá: entre os braços, de ±0,77; do encosto, em -0,08, à frente do assento, em 0,5)
  sofa: {
    eixo: 'x',
    a0: -0.74,
    a1: 0.74,
    c0: -0.07,
    c1: 0.53,
    base: 0.49 * 1.3,
    cair: 0.08,
    cairFrente: 0.3,
    cor: M.manta,
    retalho: M.coral,
    corDobra: M.coral,
    almofada: true,
  },
};

/** A forma da coberta do móvel (null: não é de deitar). */
export function formaDaCoberta(bloco: number, curtinha: boolean): FormaCoberta | null {
  if (bloco === Bloco.SOFA) return COBERTAS.sofa;
  if (bloco === Bloco.CAMA) return curtinha ? COBERTAS.curtinha : COBERTAS.cama;
  return null;
}

/** Uma caixa do corpo, no referencial do móvel: [x0, y0, z0, x1, y1, z1]. */
export type CaixaCorpo = readonly [number, number, number, number, number, number];

/** A folga do pano acima do corpo e o quanto o corpo "engorda" para os lados debaixo dele. */
const FOLGA = 0.035;
const ENGORDA = 0.06;

/**
 * Monta a coberta macia por cima das caixas do corpo deitado (no referencial do móvel); `cabeca`
 * diz de que lado fica a cabeça (a coberta começa no pescoço, do lado dela). As cores vão nos
 * vértices: o pano, os retalhos em xadrez e a dobra.
 */
export function montarCoberta(f: FormaCoberta, corpo: readonly CaixaCorpo[], cabeca?: CaixaCorpo): VertexData {
  const N = 22;
  const K = 12;
  const z = f.eixo === 'z';
  const aMin = (b: CaixaCorpo) => (z ? b[2] : b[0]);
  const aMax = (b: CaixaCorpo) => (z ? b[5] : b[3]);
  const corpoMin = corpo.length ? Math.min(...corpo.map(aMin)) : f.a0;
  const corpoMax = corpo.length ? Math.max(...corpo.map(aMax)) : f.a1;
  // a cabeça do lado de a0 (a cama) ou de a1? Sem ela, do lado de a0
  const cabecaEmA0 = cabeca ? (aMin(cabeca) + aMax(cabeca)) / 2 < (corpoMin + corpoMax) / 2 : true;
  const limita = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
  // do pescoço (um tico antes dos ombros) até a ponta, por dentro da pezeira
  const ini = cabecaEmA0 ? limita(corpoMin - 0.03, f.a0, f.a1 - 0.2) : f.a0;
  const fim = cabecaEmA0 ? f.a1 : limita(corpoMax + 0.03, f.a0 + 0.2, f.a1);
  // a grade: i no comprimento (ini → fim), k na largura (c0 → c1)
  const A = (i: number) => ini + ((fim - ini) * i) / N;
  const C = (k: number) => f.c0 + ((f.c1 - f.c0) * k) / K;
  const naGrade = (a: number, c: number): [number, number] => (z ? [c, a] : [a, c]);
  const h: number[][] = [];
  for (let i = 0; i <= N; i++) {
    h.push([]);
    for (let k = 0; k <= K; k++) {
      const [x, zz] = naGrade(A(i), C(k));
      let y = f.base + 0.05;
      for (const b of corpo)
        if (x >= b[0] - ENGORDA && x <= b[3] + ENGORDA && zz >= b[2] - ENGORDA && zz <= b[5] + ENGORDA) y = Math.max(y, b[4] + FOLGA);
      h[i].push(y);
    }
  }
  // macia: engorda (o maior dos vizinhos) e depois alisa, sem nunca descer do corpo
  const piso = h.map((l) => [...l]);
  const passo = (f2: (v: number[], i: number, k: number) => number) => {
    const novo = h.map((l) => [...l]);
    for (let i = 0; i <= N; i++)
      for (let k = 0; k <= K; k++) {
        const v: number[] = [];
        for (let di = -1; di <= 1; di++)
          for (let dk = -1; dk <= 1; dk++) {
            const ii = Math.min(N, Math.max(0, i + di));
            const kk = Math.min(K, Math.max(0, k + dk));
            v.push(h[ii][kk]);
          }
        novo[i][k] = f2(v, i, k);
      }
    for (let i = 0; i <= N; i++) h[i] = novo[i];
  };
  passo((v) => Math.max(...v));
  for (let r = 0; r < 3; r++) passo((v, i, k) => Math.max(piso[i][k], v.reduce((s, x) => s + x, 0) / v.length));
  // a borda: os lados caem (a frente do sofá cai mais) e a ponta dos pés entra no colchão
  const iPe = cabecaEmA0 ? N : 0;
  const iDobra = cabecaEmA0 ? [0, 1, 2] : [N, N - 1, N - 2];
  for (let i = 0; i <= N; i++)
    for (let k = 0; k <= K; k++) {
      const queda = f.cairFrente !== undefined && k === K ? f.cairFrente : f.cair;
      if (k === 0 || k === K || i === iPe) h[i][k] = f.base - queda;
    }
  // a dobra no pescoço: as duas fileiras da ponta sobem um tico (o lençol virado por cima)
  for (const i of iDobra.slice(0, 2)) for (let k = 1; k < K; k++) h[i][k] = Math.max(h[i][k], h[iDobra[2]][k] + 0.025);

  const pos: number[] = [];
  const cor: number[] = [];
  const idx: number[] = [];
  const c1 = Color3.FromHexString(f.cor);
  const c2 = Color3.FromHexString(f.retalho);
  const c3 = Color3.FromHexString(f.corDobra);
  // a cor de cada ponto: a dobra, os retalhos em xadrez (de uns 0,2 de lado) ou o pano
  const corEm = (i: number, k: number): Color3 => {
    if (iDobra.slice(0, 2).includes(i)) return c3;
    const ti = Math.floor((Math.abs(A(i) - ini) / 0.2) % 2);
    const tk = Math.floor(((C(k) - f.c0) / 0.2) % 2);
    return (ti + tk) % 2 === 0 ? c1 : c2;
  };
  const ponto = (x: number, y: number, zz: number, c: Color3) => {
    pos.push(x, y, zz);
    cor.push(c.r, c.g, c.b, 1);
    return pos.length / 3 - 1;
  };
  const grade: number[][] = [];
  for (let i = 0; i <= N; i++) {
    grade.push([]);
    for (let k = 0; k <= K; k++) {
      const [x, zz] = naGrade(A(i), C(k));
      grade[i].push(ponto(x, h[i][k], zz, corEm(i, k)));
    }
  }
  // (a face de cima, com a ordem que olha para cima: conferida pela normal abaixo)
  const quad = (a: number, b: number, c: number, d: number) => idx.push(a, b, c, a, c, d);
  for (let i = 0; i < N; i++) for (let k = 0; k < K; k++) quad(grade[i][k], grade[i + 1][k], grade[i + 1][k + 1], grade[i][k + 1]);
  // a normal de cada triângulo como o Babylon a calcula ((p1 - p2) × (p3 - p2)): o lado que se vê
  const normal = (t: number): [number, number, number] => {
    const [a, b, c] = [idx[t] * 3, idx[t + 1] * 3, idx[t + 2] * 3];
    const u = [pos[a] - pos[b], pos[a + 1] - pos[b + 1], pos[a + 2] - pos[b + 2]];
    const v = [pos[c] - pos[b], pos[c + 1] - pos[b + 1], pos[c + 2] - pos[b + 2]];
    return [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
  };
  const virar = (de: number, ate: number, quanto: (n: [number, number, number]) => number) => {
    let s = 0;
    for (let t = de; t < ate; t += 3) s += quanto(normal(t));
    if (s < 0) for (let t = de; t < ate; t += 3) [idx[t + 1], idx[t + 2]] = [idx[t + 2], idx[t + 1]];
  };
  virar(0, idx.length, (n) => n[1]);
  // a beirada da dobra (no pescoço) desce até o colchão: sem ela, via-se por baixo do pano
  const iD = iDobra[0];
  const aD = A(iD);
  const fora = cabecaEmA0 ? -1 : 1;
  const desce: number[] = [];
  for (let k = 0; k <= K; k++) {
    const [x, zz] = naGrade(aD + fora * 0.004, C(k));
    desce.push(ponto(x, f.base - 0.02, zz, c3));
  }
  const de = idx.length;
  for (let k = 0; k < K; k++) quad(grade[iD][k], grade[iD][k + 1], desce[k + 1], desce[k]);
  // (a beirada olha para fora, para o lado da cabeça)
  virar(de, idx.length, (n) => (z ? n[2] : n[0]) * fora);
  // as normais macias da grade inteira (o pano liso, sem quinas)
  const nor: number[] = [];
  VertexData.ComputeNormals(pos, idx, nor);
  // os retalhos com a cor chapada de cada quadradinho (sem borrar uma cor na outra): cada
  // triângulo ganha os seus vértices, com a normal macia da grade e a cor da casa dele
  const iBanda = cabecaEmA0 ? 0 : N - 1;
  const corDaCasa = (t: number): Color3 => {
    const casa = Math.floor(t / 6);
    if (t >= de) return c3;
    const i = Math.floor(casa / K);
    const k = casa % K;
    if (i === iBanda) return c3;
    const ti = Math.floor(Math.abs((A(i) + A(i + 1)) / 2 - (cabecaEmA0 ? ini : fim)) / 0.2) % 2;
    const tk = Math.floor(((C(k) + C(k + 1)) / 2 - f.c0) / 0.2) % 2;
    return (ti + tk) % 2 === 0 ? c1 : c2;
  };
  const P2: number[] = [];
  const N2: number[] = [];
  const C2: number[] = [];
  const I2: number[] = [];
  for (let t = 0; t < idx.length; t += 3) {
    const c = corDaCasa(t);
    for (let j = 0; j < 3; j++) {
      const v = idx[t + j];
      P2.push(pos[v * 3], pos[v * 3 + 1], pos[v * 3 + 2]);
      N2.push(nor[v * 3], nor[v * 3 + 1], nor[v * 3 + 2]);
      C2.push(c.r, c.g, c.b, 1);
      I2.push(I2.length);
    }
  }
  void cor;
  const vd = new VertexData();
  vd.positions = P2;
  vd.indices = I2;
  vd.colors = C2;
  vd.normals = N2;
  return vd;
}
