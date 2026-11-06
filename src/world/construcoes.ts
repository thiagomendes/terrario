/**
 * Construções dos povoados, montadas em coordenadas de mundo e recortadas por chunk.
 * Todas as formas usam a mesma paleta de blocos (tábuas, troncos, tijolos, vidro, lã,
 * pedra lisa) e os mesmos blocos funcionais em mesma quantidade: cama em cada casa,
 * bloco de trabalho em cada oficina, baú no depósito, uma tocha por construção e
 * lanternas na praça. O tema escolhe só a forma.
 */
import { Bloco } from './blocks';
import type { FormaCasa, FormaMarco, FormasPovoado, Lote, PlanoPovoado } from './povoado';

const TAM_LOTE = 7;

/** Escreve um bloco em coordenadas de mundo, se cair no chunk. */
export type Pincel = (wx: number, y: number, wz: number, id: number) => void;

/** Bloco de trabalho de cada oficina (o mesmo em todo tema). */
export const BLOCO_OFICINA = {
  ferreiro: Bloco.FORNALHA,
  cozinheiro: Bloco.FORNALHA_ACESA,
  construtor: Bloco.MESA_TRABALHO,
} as const;

/** Conteúdo funcional de um lote (cama, trabalho, baú e luz). */
function mobilia(l: Lote, em: Pincel): void {
  const y = l.h + 1;
  // fileira interna oposta à porta (as casas têm paredes em 1 e 5; o miolo vai de 2 a 4)
  const fundo = (a: number): [number, number] => {
    switch (l.porta) {
      case 'n':
        return [l.x0 + a, l.z0 + 4];
      case 's':
        return [l.x0 + a, l.z0 + 2];
      case 'l':
        return [l.x0 + 2, l.z0 + a];
      default:
        return [l.x0 + 4, l.z0 + a];
    }
  };
  const [ax, az] = fundo(2);
  const [tx, tz] = fundo(4);
  if (l.tipo === 'casa') em(ax, y, az, Bloco.CAMA);
  else if (l.tipo === 'oficina') em(ax, y, az, BLOCO_OFICINA[l.profissao!]);
  else em(ax, y, az, Bloco.BAU);
  em(tx, y, tz, Bloco.TOCHA);
}

/**
 * Abre a porta: uma passagem de dois blocos de altura do miolo da casa até a borda do
 * lote, no meio do lado voltado para a praça (vale para toda forma, até a cúpula, cuja
 * parede fica mais para fora).
 */
function abrirPorta(l: Lote, em: Pincel): void {
  for (let k = 0; k <= 2; k++) {
    const [x, z] =
      l.porta === 'n'
        ? [l.x0 + 3, l.z0 + k]
        : l.porta === 's'
          ? [l.x0 + 3, l.z0 + 6 - k]
          : l.porta === 'l'
            ? [l.x0 + 6 - k, l.z0 + 3]
            : [l.x0 + k, l.z0 + 3];
    em(x, l.h + 1, z, Bloco.AR);
    em(x, l.h + 2, z, Bloco.AR);
  }
}

/** O telhado de duas águas corre ao longo do eixo da porta. */
function eixoPortaX(l: Lote): boolean {
  return l.porta === 'l' || l.porta === 'o';
}

function casaDuasAguas(l: Lote, em: Pincel): void {
  const h = l.h;
  for (let dx = 1; dx <= 5; dx++)
    for (let dz = 1; dz <= 5; dz++) {
      const borda = dx === 1 || dx === 5 || dz === 1 || dz === 5;
      const canto = (dx === 1 || dx === 5) && (dz === 1 || dz === 5);
      em(l.x0 + dx, h, l.z0 + dz, Bloco.TABUAS);
      for (let y = h + 1; y <= h + 3; y++) {
        if (!borda) continue;
        const janela = !canto && y === h + 2 && (dx === 3 || dz === 3);
        em(
          l.x0 + dx,
          y,
          l.z0 + dz,
          canto ? Bloco.MADEIRA_RETORCIDA : janela ? Bloco.VIDRO : Bloco.TABUAS,
        );
      }
    }
  // telhado de tijolos em degraus, com beiral de um bloco
  const ao = eixoPortaX(l);
  for (let k = 0; k <= 3; k++)
    for (let a = 0; a <= 6; a++)
      for (let b = k; b <= 6 - k; b++) {
        const [dx, dz] = ao ? [a, b] : [b, a];
        const empena = (a === 1 || a === 5) && b > k && b < 6 - k;
        em(
          l.x0 + dx,
          h + 4 + k,
          l.z0 + dz,
          b === k || b === 6 - k || k === 3 ? Bloco.TIJOLOS : empena ? Bloco.TABUAS : Bloco.AR,
        );
      }
}

function casaCupula(l: Lote, em: Pincel): void {
  const h = l.h;
  const cx = l.x0 + 3;
  const cz = l.z0 + 3;
  for (let dx = -3; dx <= 3; dx++)
    for (let dz = -3; dz <= 3; dz++) {
      const r = Math.hypot(dx, dz);
      if (r <= 2.6) em(cx + dx, h, cz + dz, Bloco.TABUAS);
      for (let dy = 1; dy <= 4; dy++) {
        const d = Math.hypot(dx, dz, (dy - 1) * 0.95);
        if (d > 3.2) continue;
        if (d < 2.3) continue;
        const parede = dy <= 2;
        const topo = dy === 4 && dx === 0 && dz === 0;
        em(cx + dx, h + dy, cz + dz, topo ? Bloco.VIDRO : parede ? Bloco.TABUAS : Bloco.TIJOLOS);
      }
    }
}

function casaTenda(l: Lote, em: Pincel): void {
  const h = l.h;
  const ao = eixoPortaX(l);
  for (let a = 1; a <= 5; a++)
    for (let b = 1; b <= 5; b++) {
      const [dx, dz] = ao ? [a, b] : [b, a];
      em(l.x0 + dx, h, l.z0 + dz, Bloco.TABUAS);
    }
  // lona em A: cada andar mais estreito, fundo fechado e frente aberta pela porta
  for (let k = 0; k <= 3; k++)
    for (let a = 1; a <= 5; a++)
      for (let b = 1 + k; b <= 5 - k; b++) {
        const lado = b === 1 + k || b === 5 - k;
        const ponta = a === 1 || a === 5;
        if (!lado && !ponta && k < 3) continue;
        const [dx, dz] = ao ? [a, b] : [b, a];
        em(l.x0 + dx, h + 1 + k, l.z0 + dz, Bloco.LA_BRANCA);
      }
  // mastro só no fundo (o da frente ficaria na passagem da porta)
  for (const a of [l.porta === 'n' || l.porta === 'o' ? 6 : 0]) {
    const [dx, dz] = ao ? [a, 3] : [3, a];
    for (let y = h + 1; y <= h + 4; y++) em(l.x0 + dx, y, l.z0 + dz, Bloco.MADEIRA_RETORCIDA);
  }
}

function casaRedonda(l: Lote, em: Pincel): void {
  const h = l.h;
  const cx = l.x0 + 3;
  const cz = l.z0 + 3;
  for (let dx = -3; dx <= 3; dx++)
    for (let dz = -3; dz <= 3; dz++) {
      const r = Math.hypot(dx, dz);
      if (r <= 2.6) em(cx + dx, h, cz + dz, Bloco.TABUAS);
      if (r > 1.6 && r <= 2.6)
        for (let y = h + 1; y <= h + 3; y++)
          em(
            cx + dx,
            y,
            cz + dz,
            y === h + 2 && (dx === 0 || dz === 0) ? Bloco.VIDRO : Bloco.TABUAS,
          );
      // telhado cônico
      for (let k = 0; k < 3; k++) {
        const rt = 3.3 - k * 1.1;
        if (r <= rt && r > rt - 1.2) em(cx + dx, h + 4 + k, cz + dz, Bloco.TIJOLOS);
      }
    }
  em(cx, h + 6, cz, Bloco.TIJOLOS);
}

function casaModulo(l: Lote, em: Pincel): void {
  const h = l.h;
  for (let dx = 1; dx <= 5; dx++)
    for (let dz = 1; dz <= 5; dz++) {
      const borda = dx === 1 || dx === 5 || dz === 1 || dz === 5;
      em(l.x0 + dx, h, l.z0 + dz, Bloco.TABUAS);
      for (let y = h + 1; y <= h + 3; y++) {
        if (!borda) continue;
        // janela redonda: um vidro no meio de cada lado
        const janela = y === h + 2 && (dx === 3 || dz === 3);
        em(l.x0 + dx, y, l.z0 + dz, janela ? Bloco.VIDRO : Bloco.TABUAS);
      }
      // teto chato de tijolos, com uma borda
      em(l.x0 + dx, h + 4, l.z0 + dz, Bloco.TIJOLOS);
    }
  // antena no teto
  for (let y = h + 5; y <= h + 6; y++) em(l.x0 + 4, y, l.z0 + 4, Bloco.MADEIRA_RETORCIDA);
}

const CASAS: Record<FormaCasa, (l: Lote, em: Pincel) => void> = {
  'duas-aguas': casaDuasAguas,
  cupula: casaCupula,
  tenda: casaTenda,
  redonda: casaRedonda,
  modulo: casaModulo,
};

function marco(p: PlanoPovoado, forma: FormaMarco, em: Pincel): void {
  const { cx, cz, h } = p;
  switch (forma) {
    case 'poco':
      for (let dx = -1; dx <= 1; dx++)
        for (let dz = -1; dz <= 1; dz++)
          if (dx || dz) em(cx + dx, h + 1, cz + dz, Bloco.PEDRA_LISA);
      em(cx, h, cz, Bloco.AGUA);
      for (const dx of [-1, 1])
        for (let y = h + 2; y <= h + 3; y++) em(cx + dx, y, cz, Bloco.MADEIRA_RETORCIDA);
      for (let dx = -1; dx <= 1; dx++) em(cx + dx, h + 4, cz, Bloco.TABUAS);
      em(cx, h + 3, cz, Bloco.LANTERNA);
      break;
    case 'fonte':
      for (let dx = -2; dx <= 2; dx++)
        for (let dz = -2; dz <= 2; dz++) {
          const borda = Math.abs(dx) === 2 || Math.abs(dz) === 2;
          if (borda) em(cx + dx, h + 1, cz + dz, Bloco.PEDRA_LISA);
          else if (dx || dz) em(cx + dx, h + 1, cz + dz, Bloco.AGUA);
        }
      for (let y = h + 1; y <= h + 3; y++) em(cx, y, cz, Bloco.PEDRA_LISA);
      em(cx, h + 4, cz, Bloco.LANTERNA);
      break;
    case 'antena':
      for (let dx = -1; dx <= 1; dx++)
        for (let dz = -1; dz <= 1; dz++) em(cx + dx, h + 1, cz + dz, Bloco.PEDRA_LISA);
      for (let y = h + 2; y <= h + 7; y++) em(cx, y, cz, Bloco.MADEIRA_RETORCIDA);
      for (const dx of [-1, 1]) em(cx + dx, h + 6, cz, Bloco.TABUAS);
      for (const dz of [-1, 1]) em(cx, h + 5, cz + dz, Bloco.TABUAS);
      em(cx, h + 8, cz, Bloco.LANTERNA);
      break;
    case 'totem':
      for (let y = h + 1; y <= h + 5; y++)
        em(cx, y, cz, y % 2 ? Bloco.MADEIRA_RETORCIDA : Bloco.TABUAS);
      for (const [dx, dz] of [
        [1, 0],
        [-1, 0],
      ])
        em(cx + dx, h + 4, cz + dz, Bloco.TABUAS);
      em(cx, h + 6, cz, Bloco.LANTERNA);
      break;
    case 'esqueleto':
      // coluna e costelas claras (lã branca: cor de osso em todo tema), crânio na ponta
      for (let dx = -3; dx <= 2; dx++) em(cx + dx, h + 3, cz, Bloco.LA_BRANCA);
      for (const dx of [-2, 0, 2])
        for (const dz of [-1, 1]) {
          em(cx + dx, h + 3, cz + dz, Bloco.LA_BRANCA);
          em(cx + dx, h + 2, cz + dz * 2, Bloco.LA_BRANCA);
          em(cx + dx, h + 1, cz + dz * 2, Bloco.LA_BRANCA);
        }
      for (let y = h + 2; y <= h + 3; y++)
        for (const dz of [0, 1]) em(cx + 3, y, cz + dz, Bloco.LA_BRANCA);
      em(cx - 3, h + 1, cz, Bloco.LANTERNA);
      break;
  }
}

/** Monta no chunk a parte do povoado que cai nele. */
export function construirPovoado(p: PlanoPovoado, formas: FormasPovoado, em: Pincel): void {
  // espaço livre acima dos lotes e da praça (árvores vizinhas, relevo)
  for (const l of p.lotes)
    for (let dx = 0; dx < TAM_LOTE; dx++)
      for (let dz = 0; dz < TAM_LOTE; dz++)
        for (let y = l.h + 1; y <= l.h + 9; y++) em(l.x0 + dx, y, l.z0 + dz, Bloco.AR);
  for (const l of p.lotes) {
    const forma =
      l.tipo === 'casa' ? formas.casa : l.tipo === 'oficina' ? formas.oficina : formas.deposito;
    CASAS[forma](l, em);
    abrirPorta(l, em);
    mobilia(l, em);
  }
  // praça: marco no centro e um poste de lanterna em cada canto
  marco(p, formas.marco, em);
  for (const [dx, dz] of [
    [-4, -4],
    [4, -4],
    [-4, 4],
    [4, 4],
  ]) {
    em(p.cx + dx, p.h + 1, p.cz + dz, Bloco.MADEIRA_RETORCIDA);
    em(p.cx + dx, p.h + 2, p.cz + dz, Bloco.MADEIRA_RETORCIDA);
    em(p.cx + dx, p.h + 3, p.cz + dz, Bloco.LANTERNA);
  }
}
