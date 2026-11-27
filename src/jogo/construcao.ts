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
}

export function copiar(
  nome: string,
  a: Ponto,
  b: Ponto,
  ler: (x: number, y: number, z: number) => number,
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
  return { nome, w, h, d, blocos };
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
        let px = x;
        let pz = z;
        if (g === 1) [px, pz] = [bp.d - 1 - z, x];
        else if (g === 2) [px, pz] = [bp.w - 1 - x, bp.d - 1 - z];
        else if (g === 3) [px, pz] = [z, bp.w - 1 - x];
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
