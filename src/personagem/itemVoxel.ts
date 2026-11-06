import { DESENHOS } from '../art/itens';
import type { DefItem } from '../jogo/itens';

/** Grade 16x16 de cores RGB (0..1) do desenho do item; null = transparente. */
export type GradeItem = Array<Array<[number, number, number] | null>>;

export const LADO_GRADE = 16;

function corHex(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const n = h.length === 3 ? [...h].map((c) => c + c).join('') : h.slice(0, 6);
  const v = parseInt(n, 16);
  return [((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255];
}

/** Lê o desenho pixel-art do item (o mesmo do ícone) como grade de cores. */
export function gradeDoItem(def: DefItem, opcoes: { suavizarContorno?: boolean } = {}): GradeItem {
  const desenho = DESENHOS[def.id] ?? DESENHOS[`tipo:${def.tipo}`];
  const grade: GradeItem = Array.from({ length: LADO_GRADE }, () =>
    Array.from({ length: LADO_GRADE }, () => null),
  );
  if (!desenho) {
    const c = corHex(def.cor ?? '#c9c2b6');
    for (let y = 4; y < 12; y++) for (let x = 4; x < 12; x++) grade[y][x] = c;
    return grade;
  }
  const paleta: Record<string, string> = {
    ...desenho.paleta,
    '*': def.cor ?? desenho.paleta['*'] ?? '#ffffff',
  };
  const contorno: Array<[number, number]> = [];
  desenho.linhas.forEach((linha, y) => {
    [...linha].forEach((ch, x) => {
      const cor = paleta[ch];
      if (!cor || y >= LADO_GRADE || x >= LADO_GRADE) return;
      if (ch === 'k' && opcoes.suavizarContorno) contorno.push([x, y]);
      else grade[y][x] = corHex(cor);
    });
  });
  // Em 3D o contorno preto do ícone pesa: vira um tom escuro do pixel vizinho.
  const vizinhos: Array<[number, number, [number, number, number]]> = [];
  for (const [x, y] of contorno) {
    const viz = [grade[y - 1]?.[x], grade[y + 1]?.[x], grade[y]?.[x - 1], grade[y]?.[x + 1]].find(
      (c) => !!c,
    );
    if (viz) vizinhos.push([x, y, [viz[0] * 0.58, viz[1] * 0.58, viz[2] * 0.58]]);
  }
  for (const [x, y, c] of vizinhos) grade[y][x] = c;
  return grade;
}

export interface MalhaVoxel {
  posicoes: number[];
  normais: number[];
  cores: number[];
  indices: number[];
}

/**
 * Extruda a grade em pixels 3D (frente, verso e as bordas expostas), como um item
 * de pixel-art com espessura. Origem no centro da grade; x para a direita, y para cima,
 * frente voltada para -z. O sombreamento por face já vem nas cores.
 */
export function extrudarGrade(grade: GradeItem, pixel: number, espessura: number): MalhaVoxel {
  const m: MalhaVoxel = { posicoes: [], normais: [], cores: [], indices: [] };
  const n = grade.length;
  const meio = n / 2;
  const cheio = (x: number, y: number) => x >= 0 && y >= 0 && x < n && y < n && !!grade[y][x];
  const ez = espessura / 2;
  const quad = (
    v: Array<[number, number, number]>,
    normal: [number, number, number],
    cor: [number, number, number],
    sombra: number,
  ) => {
    const base = m.posicoes.length / 3;
    for (const p of v) {
      m.posicoes.push(...p);
      m.normais.push(...normal);
      m.cores.push(cor[0] * sombra, cor[1] * sombra, cor[2] * sombra, 1);
    }
    m.indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  };
  for (let gy = 0; gy < n; gy++) {
    for (let gx = 0; gx < n; gx++) {
      const cor = grade[gy][gx];
      if (!cor) continue;
      const x0 = (gx - meio) * pixel;
      const x1 = x0 + pixel;
      const y1 = (meio - gy) * pixel;
      const y0 = y1 - pixel;
      // frente (-z) e verso (+z)
      quad(
        [
          [x0, y0, -ez],
          [x0, y1, -ez],
          [x1, y1, -ez],
          [x1, y0, -ez],
        ],
        [0, 0, -1],
        cor,
        1,
      );
      quad(
        [
          [x1, y0, ez],
          [x1, y1, ez],
          [x0, y1, ez],
          [x0, y0, ez],
        ],
        [0, 0, 1],
        cor,
        0.82,
      );
      if (!cheio(gx, gy - 1))
        quad(
          [
            [x0, y1, -ez],
            [x0, y1, ez],
            [x1, y1, ez],
            [x1, y1, -ez],
          ],
          [0, 1, 0],
          cor,
          0.95,
        );
      if (!cheio(gx, gy + 1))
        quad(
          [
            [x1, y0, -ez],
            [x1, y0, ez],
            [x0, y0, ez],
            [x0, y0, -ez],
          ],
          [0, -1, 0],
          cor,
          0.55,
        );
      if (!cheio(gx - 1, gy))
        quad(
          [
            [x0, y0, ez],
            [x0, y1, ez],
            [x0, y1, -ez],
            [x0, y0, -ez],
          ],
          [-1, 0, 0],
          cor,
          0.7,
        );
      if (!cheio(gx + 1, gy))
        quad(
          [
            [x1, y0, -ez],
            [x1, y1, -ez],
            [x1, y1, ez],
            [x1, y0, ez],
          ],
          [1, 0, 0],
          cor,
          0.7,
        );
    }
  }
  return m;
}
