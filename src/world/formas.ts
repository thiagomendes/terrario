import { Bloco, obterBloco } from './blocks';

/** Caixa em coordenadas locais do bloco: [x0, y0, z0, x1, y1, z1], de 0 a 1. */
export type Caixa = [number, number, number, number, number, number];

/** Direção da frente (bits 0-1 do metadado): 0 +z, 1 +x, 2 -z, 3 -x. */
export function direcaoDoMeta(meta: number): number {
  return meta & 3;
}

/** Direção para onde o jogador olha (yaw), arredondada aos 4 eixos. */
export function direcaoDoYaw(yaw: number): number {
  const sx = Math.sin(yaw);
  const sz = Math.cos(yaw);
  if (Math.abs(sz) >= Math.abs(sx)) return sz >= 0 ? 0 : 2;
  return sx >= 0 ? 1 : 3;
}

/** Vetor (dx, dz) de uma direção. */
export function vetorDirecao(d: number): [number, number] {
  return (
    [
      [0, 1],
      [1, 0],
      [0, -1],
      [-1, 0],
    ] as const
  )[d & 3] as [number, number];
}

function girar(c: Caixa, d: number): Caixa {
  const pts = [
    [c[0], c[2]],
    [c[3], c[5]],
  ].map(([x, z]) => {
    switch (d & 3) {
      case 1:
        return [z, 1 - x];
      case 2:
        return [1 - x, 1 - z];
      case 3:
        return [1 - z, x];
      default:
        return [x, z];
    }
  });
  return [
    Math.min(pts[0][0], pts[1][0]),
    c[1],
    Math.min(pts[0][1], pts[1][1]),
    Math.max(pts[0][0], pts[1][0]),
    c[4],
    Math.max(pts[0][1], pts[1][1]),
  ];
}

const P = 1 / 16;

/**
 * Caixas que formam o bloco (malha e colisão). `conecta(d)` diz se a cerca
 * liga na direção d. Devolve null para cubo inteiro.
 */
export function caixasDoBloco(
  id: number,
  meta: number,
  conecta?: (d: number) => boolean,
): Caixa[] | null {
  const forma = obterBloco(id)?.forma;
  const d = direcaoDoMeta(meta);
  switch (forma) {
    case 'laje':
      return [[0, 0, 0, 1, 0.5, 1]];
    case 'escada':
      // degrau de cima fica do lado para onde se sobe (direção d)
      return [[0, 0, 0, 1, 0.5, 1], girar([0, 0.5, 0.5, 1, 1, 1], d)];
    case 'cama':
      return [[0, 0, 0, 1, 9 * P, 1]];
    case 'tocha':
      // o poste da cidade (spec 014) é o globo em cima da haste de grade: a peça inteira
      if (id === Bloco.POSTE) return [[4 * P, 0, 4 * P, 12 * P, 14 * P, 12 * P]];
      return [[7 * P, 0, 7 * P, 9 * P, 10 * P, 9 * P]];
    case 'placa':
      // tábua fina encostada no lado de trás (oposto à frente), o desenho virado para a frente
      return [girar([P, 2 * P, 0, 15 * P, 14 * P, 2 * P], d)];
    case 'porta': {
      // fechada: painel no lado de trás (oposto à frente); aberta: gira 90 graus
      const aberta = id === Bloco.PORTA_ABERTA;
      const base: Caixa = [0, 0, 0, 1, 1, 3 * P];
      return [girar(base, aberta ? d + 1 : d)];
    }
    case 'cerca': {
      const cx: Caixa[] = [[6 * P, 0, 6 * P, 10 * P, 1, 10 * P]];
      for (let k = 0; k < 4; k++) {
        if (!conecta?.(k)) continue;
        cx.push(girar([7 * P, 6 * P, 10 * P, 9 * P, 9 * P, 1], k));
        cx.push(girar([7 * P, 12 * P, 10 * P, 9 * P, 15 * P, 1], k));
      }
      return cx;
    }
    case 'porteira': {
      // fechada: atravessa a célula no eixo x (frente em +z, como a porta); aberta: gira
      // 90 graus na dobradiça (lado x = 0) e fica encostada nesse lado
      const aberta = id === Bloco.PORTEIRA_ABERTA;
      return PORTEIRA_FECHADA.map((c) =>
        girar(aberta ? [c[2] - 6 * P, c[1], 1 - c[3], c[5] - 6 * P, c[4], 1 - c[0]] : c, d),
      );
    }
    default:
      return null;
  }
}

/**
 * Porteira de brinquedo fechada (frente em +z): dois montantes nas pontas, três travessas e
 * a mão-francesa em diagonal (degraus finos). Os mourões são as cercas vizinhas.
 */
const PORTEIRA_FECHADA: Caixa[] = (() => {
  const z0 = 7 * P;
  const z1 = 9 * P;
  const cx: Caixa[] = [
    [0, P, z0, 2 * P, 15 * P, z1],
    [14 * P, P, z0, 1, 15 * P, z1],
    [2 * P, 2 * P, z0, 14 * P, 4 * P, z1],
    [2 * P, 7 * P, z0, 14 * P, 9 * P, z1],
    [2 * P, 12 * P, z0, 14 * P, 14.5 * P, z1],
  ];
  // mão-francesa: diagonal pregada na frente, da dobradiça embaixo à ponta de cima
  const passos = 12;
  for (let i = 0; i < passos; i++) {
    const x = 2 * P + i * P;
    const y = 3 * P + (i * 9 * P) / (passos - 1);
    cx.push([x, y, 6 * P, x + P, y + 2 * P, z0]);
  }
  return cx;
})();

/** Caixa de colisão da porteira fechada: segura como a cerca (inteira, sem vãos). */
export function colisaoPorteira(meta: number): Caixa {
  return girar([0, 0, 6 * P, 1, 1.5, 10 * P], direcaoDoMeta(meta));
}

/**
 * A cerca liga a outra cerca (de pau, a grade de ferro e o tapume da cidade, spec 014), à
 * porteira ou a um bloco opaco.
 */
export function cercaConecta(vizinho: number): boolean {
  if (vizinho === Bloco.PORTEIRA || vizinho === Bloco.PORTEIRA_ABERTA) return true;
  const def = obterBloco(vizinho);
  return def?.forma === 'cerca' || !!def?.opaco;
}

/** Bloco com forma parcial (não é cubo nem cruz). */
export function temFormaParcial(id: number): boolean {
  const f = obterBloco(id)?.forma;
  return (
    f === 'laje' ||
    f === 'escada' ||
    f === 'cama' ||
    f === 'tocha' ||
    f === 'porta' ||
    f === 'cerca' ||
    f === 'porteira' ||
    f === 'placa'
  );
}
