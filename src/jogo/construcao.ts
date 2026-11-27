import { Bloco } from '../world/blocks';
import { celulasDoMovel } from './moveis';
import { celulasDoTapete } from './tapetes';

export interface Ponto {
  x: number;
  y: number;
  z: number;
}

export interface Edicao extends Ponto {
  antes: number;
  depois: number;
}

/** Histórico de desfazer/refazer por lotes (uma ação = um lote). */
export function criarHistorico(limite = 100) {
  const desfeitos: Edicao[][] = [];
  let feitos: Edicao[][] = [];
  return {
    registrar(lote: Edicao[]): void {
      const util = lote.filter((e) => e.antes !== e.depois);
      if (util.length === 0) return;
      feitos.push(util);
      if (feitos.length > limite) feitos = feitos.slice(-limite);
      desfeitos.length = 0;
    },
    /** Lote para desfazer (aplicar `antes`), ou null. */
    desfazer(): Edicao[] | null {
      const l = feitos.pop();
      if (!l) return null;
      desfeitos.push(l);
      return l;
    },
    refazer(): Edicao[] | null {
      const l = desfeitos.pop();
      if (!l) return null;
      feitos.push(l);
      return l;
    },
    get tamanho() {
      return feitos.length;
    },
  };
}

export const LIMITE_REGIAO = 32768;

export function caixaEntre(a: Ponto, b: Ponto): { min: Ponto; max: Ponto; volume: number } {
  const min = { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), z: Math.min(a.z, b.z) };
  const max = { x: Math.max(a.x, b.x), y: Math.max(a.y, b.y), z: Math.max(a.z, b.z) };
  return { min, max, volume: (max.x - min.x + 1) * (max.y - min.y + 1) * (max.z - min.z + 1) };
}

export type Ferramenta = 'preencher' | 'parede' | 'linha' | 'esfera' | 'esvaziar';

export const NOMES_FERRAMENTA: Record<Ferramenta, string> = {
  preencher: 'Preencher caixa',
  parede: 'Paredes ocas',
  linha: 'Linha',
  esfera: 'Esfera',
  esvaziar: 'Esvaziar caixa',
};

/** Pontos de uma forma entre A e B (limitada a LIMITE_REGIAO). */
export function pontosDaForma(f: Ferramenta, a: Ponto, b: Ponto): Ponto[] {
  const { min, max, volume } = caixaEntre(a, b);
  if (volume > LIMITE_REGIAO) return [];
  const out: Ponto[] = [];
  if (f === 'linha') {
    const n = Math.max(Math.abs(b.x - a.x), Math.abs(b.y - a.y), Math.abs(b.z - a.z));
    const vistos = new Set<string>();
    for (let i = 0; i <= n; i++) {
      const t = n === 0 ? 0 : i / n;
      const p = {
        x: Math.round(a.x + (b.x - a.x) * t),
        y: Math.round(a.y + (b.y - a.y) * t),
        z: Math.round(a.z + (b.z - a.z) * t),
      };
      const k = `${p.x},${p.y},${p.z}`;
      if (!vistos.has(k)) {
        vistos.add(k);
        out.push(p);
      }
    }
    return out;
  }
  const c = { x: (min.x + max.x) / 2, y: (min.y + max.y) / 2, z: (min.z + max.z) / 2 };
  const r = {
    x: (max.x - min.x) / 2 + 0.5,
    y: (max.y - min.y) / 2 + 0.5,
    z: (max.z - min.z) / 2 + 0.5,
  };
  for (let y = min.y; y <= max.y; y++)
    for (let z = min.z; z <= max.z; z++)
      for (let x = min.x; x <= max.x; x++) {
        if (f === 'parede') {
          const borda = x === min.x || x === max.x || z === min.z || z === max.z;
          if (!borda) continue;
        } else if (f === 'esfera') {
          const d = ((x - c.x) / r.x) ** 2 + ((y - c.y) / r.y) ** 2 + ((z - c.z) / r.z) ** 2;
          if (d > 1) continue;
        }
        out.push({ x, y, z });
      }
  return out;
}

/** Ponto espelhado no plano x = eixo + 0.5 (eixo inteiro). */
export function espelharX(p: Ponto, eixo: number): Ponto {
  return { x: 2 * eixo - p.x, y: p.y, z: p.z };
}

export interface Blueprint {
  nome: string;
  w: number;
  h: number;
  d: number;
  /** Valores empacotados (bloco | meta << 8), em ordem y, z, x. */
  blocos: number[];
  /**
   * Spec 039 (T06): os tapetes inteiros dentro da região (a camada rente ao chão não é de
   * célula): a âncora a partir do canto mínimo e a direção. Ausente nas cópias de antes.
   */
  tapetes?: { x: number; y: number; z: number; d: number }[];
}

/** Um tapete da camada (a âncora e a direção), para copiar e colar. */
export interface TapeteCopiado {
  x: number;
  y: number;
  z: number;
  d: number;
}

export function copiar(
  nome: string,
  a: Ponto,
  b: Ponto,
  ler: (x: number, y: number, z: number) => number,
  /** Spec 039: os tapetes da camada; entram os que ficam inteiros dentro da região. */
  tapetes: Iterable<TapeteCopiado> = [],
): Blueprint | null {
  const { min, max, volume } = caixaEntre(a, b);
  if (volume > LIMITE_REGIAO) return null;
  const w = max.x - min.x + 1;
  const h = max.y - min.y + 1;
  const d = max.z - min.z + 1;
  const blocos: number[] = [];
  for (let y = 0; y < h; y++)
    for (let z = 0; z < d; z++)
      for (let x = 0; x < w; x++) blocos.push(ler(min.x + x, min.y + y, min.z + z));
  const dentro = (c: Ponto) =>
    c.x >= min.x && c.x <= max.x && c.y >= min.y && c.y <= max.y && c.z >= min.z && c.z <= max.z;
  const copiados: TapeteCopiado[] = [];
  for (const t of tapetes)
    if (celulasDoTapete(t.x, t.y, t.z, t.d).every(dentro))
      copiados.push({ x: t.x - min.x, y: t.y - min.y, z: t.z - min.z, d: t.d & 3 });
  return { nome, w, h, d, blocos, ...(copiados.length ? { tapetes: copiados } : {}) };
}

/** A célula (x, z) do blueprint depois do giro `g` (0..3), a partir do canto mínimo. */
function girarCelula(bp: Blueprint, x: number, z: number, g: number): [number, number] {
  if (g === 1) return [bp.d - 1 - z, x];
  if (g === 2) return [bp.w - 1 - x, bp.d - 1 - z];
  if (g === 3) return [z, bp.w - 1 - x];
  return [x, z];
}

/**
 * Spec 039 (T06): os tapetes do blueprint colado com o canto mínimo em `origem`, girado como as
 * células: a âncora gira junto e a direção vira `d - giro` (o tapete fica inteiro na região).
 */
export function colarTapetes(bp: Blueprint, origem: Ponto, giro = 0): TapeteCopiado[] {
  const g = ((giro % 4) + 4) % 4;
  return (bp.tapetes ?? []).map((t) => {
    const [px, pz] = girarCelula(bp, t.x, t.z, g);
    return { x: origem.x + px, y: origem.y + t.y, z: origem.z + pz, d: (t.d - g + 4) & 3 };
  });
}

/**
 * Spec 039 (T06): o móvel (ou o tapete) espelhado no plano x = eixo + 0,5: as células espelhadas,
 * a direção que olhava para +x passa a olhar para -x (e o contrário), e a âncora é a célula que
 * dá essas mesmas células, com a cabeceira da cama no lugar da cabeceira. Antes, o espelho
 * repetia a âncora com a mesma direção, e o móvel crescia para o mesmo lado (deslocado).
 */
export function espelharMovel(
  b: number,
  x: number,
  y: number,
  z: number,
  d: number,
  eixo: number,
): TapeteCopiado | null {
  const celulas = (cx: number, cy: number, cz: number, dd: number) =>
    b === Bloco.TAPETE ? celulasDoTapete(cx, cy, cz, dd) : celulasDoMovel(b, cx, cy, cz, dd);
  const alvo = celulas(x, y, z, d).map((c) => ({ ...espelharX(c, eixo), parte: c.parte }));
  if (!alvo.length) return null;
  const d2 = (d & 3) === 1 ? 3 : (d & 3) === 3 ? 1 : d & 3;
  const chaves = new Set(alvo.map((c) => `${c.x},${c.y},${c.z}`));
  // a âncora espelhada primeiro (a cabeceira da cama); senão, qualquer célula que dê as mesmas
  for (const c of alvo) {
    const cs = celulas(c.x, c.y, c.z, d2);
    if (cs.length === chaves.size && cs.every((q) => chaves.has(`${q.x},${q.y},${q.z}`)))
      return { x: c.x, y: c.y, z: c.z, d: d2 };
  }
  return null;
}

/** Edições para colar o blueprint com o canto mínimo em `origem`, girado (0..3) em torno de y. */
export function colar(
  bp: Blueprint,
  origem: Ponto,
  giro = 0,
  pularAr = true,
): { p: Ponto; v: number }[] {
  const out: { p: Ponto; v: number }[] = [];
  const g = ((giro % 4) + 4) % 4;
  for (let y = 0; y < bp.h; y++)
    for (let z = 0; z < bp.d; z++)
      for (let x = 0; x < bp.w; x++) {
        const v = bp.blocos[(y * bp.d + z) * bp.w + x];
        if (pularAr && (v & 255) === 0) continue;
        const [px, pz] = girarCelula(bp, x, z, g);
        // a direção (bits 0 e 1 do metadado: 0 +z, 1 +x, 2 -z, 3 -x) gira junto com as células.
        // Cada giro leva +z para -x (a direção d vira d - 1); o resto do metadado (a parte do
        // móvel, spec 039) fica. Antes, a direção girava para o outro lado: no giro de 90 graus
        // a escada e a porta saíam viradas ao contrário, e o móvel saía da região
        const meta = (v >> 8) & 3;
        const resto = v & ~(3 << 8);
        const giradoMeta = ((meta - g + 4) & 3) << 8;
        out.push({
          p: { x: origem.x + px, y: origem.y + y, z: origem.z + pz },
          v: resto | giradoMeta,
        });
      }
  return out;
}
