/**
 * Conferência das plantas (spec 014): por onde a criança anda dentro e em volta do prédio.
 * Um andador de meio em meio bloco, com as regras do boneco (sobe sozinho meio bloco, desce
 * até 3 sem se machucar, precisa de 1,8 de altura livre), diz o que se alcança a partir da
 * calçada. Os testes de forma usam isto: porta, escada até o terraço e cômodos visitáveis.
 */
import { Bloco, obterBloco } from '../blocks';
import { caixasDoBloco, temFormaParcial } from '../formas';
import { ehPorta } from '../portas';
import { NADA, indicePlanta, type Planta } from './formato';

const ALTURA_BONECO = 1.8;
const QUEDA_MAXIMA = 3;
const EPS = 1e-3;

/** O que um bloco faz no andador: faixa que segura o corpo e onde dá para pisar. */
interface Fisica {
  /** Faixa sólida dentro da célula (de 0 a 1,5), ou null se não segura. */
  solido: [number, number] | null;
  /** Alturas (dentro da célula) onde se pisa. */
  pisos: number[];
}

const MOBILIA: ReadonlySet<number> = new Set([
  Bloco.CAMA,
  Bloco.MESA_TRABALHO,
  Bloco.BAU,
  Bloco.FORNALHA,
  Bloco.FORNALHA_ACESA,
  Bloco.TOCHA,
  Bloco.LANTERNA,
]);

function fisicaDo(b: number, portasFechadas: boolean): Fisica {
  if (b === NADA || b === Bloco.AR) return { solido: null, pisos: [] };
  if (ehPorta(b))
    return portasFechadas ? { solido: [0, 1], pisos: [] } : { solido: null, pisos: [] };
  const def = obterBloco(b);
  if (!def?.solido) return { solido: null, pisos: [] };
  if (def.forma === 'escada') return { solido: [0, 0.5], pisos: [0.5, 1] };
  if (temFormaParcial(b)) {
    const cx = caixasDoBloco(b, 0, () => false) ?? [[0, 0, 0, 1, 1, 1]];
    let topo = 0;
    for (const c of cx) topo = Math.max(topo, c[4]);
    // cerca e grade seguram 1,5 (não se pisa em cima)
    if (def.forma === 'cerca') return { solido: [0, 1.5], pisos: [] };
    // só se pisa em alturas de meio em meio bloco (a cama, de 9/16, não conta)
    return { solido: [0, topo], pisos: Number.isInteger(topo * 2) ? [topo] : [] };
  }
  return { solido: [0, 1], pisos: [1] };
}

export interface OpcoesAndador {
  /** Portas fechadas seguram (para conferir a escada de incêndio por fora). */
  portasFechadas?: boolean;
}

/** Posição do andador: coluna (s, f) e a altura dos pés em meios blocos. */
export type Lugar = [number, number, number];

/**
 * Tudo o que se alcança a pé saindo da calçada da frente (a fileira f = -1, com os pés em
 * y = 0). Fora da planta, só a calçada da frente conta (os lados são os vizinhos).
 */
export function alcancaveis(p: Planta, op: OpcoesAndador = {}): Set<string> {
  const fechadas = !!op.portasFechadas;
  const fis = (s: number, f: number, y: number): Fisica => {
    if (y === -1) return { solido: [0, 1], pisos: [1] };
    if (y < -1) return { solido: [0, 1], pisos: [] };
    if (f < 0) return { solido: null, pisos: [] };
    if (y >= p.altura) return { solido: null, pisos: [] };
    return fisicaDo(p.blocos[indicePlanta(p, s, f, y)], fechadas);
  };
  const naPlanta = (s: number, f: number) =>
    s >= 0 && s < p.largura && f >= -1 && f < p.profundidade;
  /** A coluna está livre de (a, b)? */
  const livre = (s: number, f: number, a: number, b: number) => {
    for (let y = Math.floor(a) - 1; y <= Math.ceil(b); y++) {
      const sol = fis(s, f, y).solido;
      if (!sol) continue;
      if (y + sol[1] > a + EPS && y + sol[0] < b - EPS) return false;
    }
    return true;
  };
  /** Pisos da coluna (alturas absolutas), do mais alto ao mais baixo. */
  const pisos = (s: number, f: number): number[] => {
    const r: number[] = [];
    for (let y = p.altura - 1; y >= -1; y--) for (const t of fis(s, f, y).pisos) r.push(y + t);
    return r.sort((a, b) => b - a);
  };
  const cachePisos = new Map<string, number[]>();
  const pisosDe = (s: number, f: number) => {
    const k = `${s},${f}`;
    let v = cachePisos.get(k);
    if (!v) cachePisos.set(k, (v = pisos(s, f)));
    return v;
  };
  const vistos = new Set<string>();
  const fila: Lugar[] = [];
  const chave = (s: number, f: number, h2: number) => `${s},${f},${h2}`;
  const entrar = (s: number, f: number, h: number) => {
    const k = chave(s, f, Math.round(h * 2));
    if (vistos.has(k)) return;
    vistos.add(k);
    fila.push([s, f, Math.round(h * 2)]);
  };
  for (let s = 0; s < p.largura; s++) entrar(s, -1, 0);
  while (fila.length) {
    const [s, f, h2] = fila.pop()!;
    const h = h2 / 2;
    // subir meio bloco na mesma coluna (o degrau de cima da escada)
    for (const t of pisosDe(s, f))
      if (t > h && t <= h + 0.5 + EPS && livre(s, f, t, t + ALTURA_BONECO)) entrar(s, f, t);
    for (const [ds, df] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const ns = s + ds;
      const nf = f + df;
      if (!naPlanta(ns, nf)) continue;
      for (const t of pisosDe(ns, nf)) {
        if (t > h + 0.5 + EPS) continue;
        if (t < h - QUEDA_MAXIMA - EPS) break;
        const topo = Math.max(t, h) + ALTURA_BONECO;
        if (livre(ns, nf, t, topo) && livre(s, f, h, topo)) {
          entrar(ns, nf, t);
          break;
        }
      }
    }
  }
  return vistos;
}

/** Algum lugar alcançado com os pés em `pes`, no retângulo (inclusivo)? */
export function alcancaRetangulo(
  vistos: Set<string>,
  s0: number,
  f0: number,
  s1: number,
  f1: number,
  pes: number,
): boolean {
  for (let s = s0; s <= s1; s++)
    for (let f = f0; f <= f1; f++) if (vistos.has(`${s},${f},${Math.round(pes * 2)}`)) return true;
  return false;
}

/** Chega ao terraço (os pés na altura do terraço, em cima do prédio)? */
export function chegaAoTerraco(p: Planta, op: OpcoesAndador = {}): boolean {
  return alcancaRetangulo(alcancaveis(p, op), 0, 1, p.largura - 1, p.profundidade - 1, p.terraco);
}

/**
 * O cômodo tem piso em todo o retângulo e 3 blocos livres em cima (mobília conta como livre:
 * cama, mesa, baú, fornalha e lampião ficam encostados), sem degrau de escada dentro.
 */
export function comodoLivre(
  p: Planta,
  c: { s0: number; f0: number; s1: number; f1: number; pes: number },
): boolean {
  for (let s = c.s0; s <= c.s1; s++)
    for (let f = c.f0; f <= c.f1; f++) {
      const piso = p.blocos[indicePlanta(p, s, f, c.pes - 1)];
      if (!obterBloco(piso)?.solido || obterBloco(piso)?.forma === 'escada') return false;
      for (let y = c.pes; y < c.pes + 3; y++) {
        const b = p.blocos[indicePlanta(p, s, f, y)];
        if (b === NADA || b === Bloco.AR || MOBILIA.has(b)) continue;
        return false;
      }
    }
  return true;
}
