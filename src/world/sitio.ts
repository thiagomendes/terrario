/**
 * Construções do sítio (spec 013, planejador `planta: 'sitio'`): casa da fazenda com
 * varanda, celeiro vermelho, ferraria, silo, lavoura madura, curral e galinheiro. Mesmos
 * lotes de 7x7 do povoado; cada lote é desenhado nas coordenadas dele (`noLote`), com a
 * frente voltada para a praça.
 */
import { Bloco } from './blocks';
import { hash2 } from './noise';
import { BAU_CELEIRO, noLote, portaoDoCercado, type Lote, type PlanoPovoado } from './povoado';

type Pincel = (wx: number, y: number, wz: number, id: number) => void;

/** Plantas maduras da lavoura (o último estágio de cada uma). */
const MADURAS = [Bloco.TRIGO_3, Bloco.MILHO_3, Bloco.ABOBOREIRA_3] as const;

export function construirLoteDoSitio(p: PlanoPovoado, l: Lote, em: Pincel): void {
  /** Bloco em (s, f) do lote, `y` acima do chão. */
  const q = (s: number, f: number, y: number, id: number) => {
    const [x, z] = noLote(l, s, f);
    em(x, l.h + y, z, id);
  };
  switch (l.uso) {
    case 'fazenda':
      fazenda(q);
      break;
    case 'celeiro':
      celeiro(q);
      break;
    case 'ferraria':
      ferraria(q);
      break;
    case 'silo':
      silo(q);
      break;
    case 'lavoura':
      lavoura(l, q);
      break;
    case 'curral':
    case 'galinheiro':
      cercado(p, l, em, q);
      break;
  }
}

type Q = (s: number, f: number, y: number, id: number) => void;

/** Casa da fazenda: tábuas com quinas de tronco, varanda na frente, fogão e cama. */
function fazenda(q: Q): void {
  for (let s = 1; s <= 5; s++)
    for (let f = 0; f <= 6; f++) {
      q(s, f, 0, Bloco.TABUAS);
      if (f < 2) continue;
      const borda = s === 1 || s === 5 || f === 2 || f === 6;
      if (!borda) continue;
      const quina = (s === 1 || s === 5) && (f === 2 || f === 6);
      for (let y = 1; y <= 3; y++) {
        const janela =
          y === 2 &&
          !quina &&
          ((f === 2 && (s === 2 || s === 4)) ||
            ((s === 1 || s === 5) && f === 4) ||
            (f === 6 && s === 3));
        q(s, f, y, quina ? Bloco.MADEIRA_RETORCIDA : janela ? Bloco.VIDRO : Bloco.TABUAS);
      }
    }
  // varanda: dois esteios, parapeito de cerca dos lados da entrada e lanterna no forro
  for (const s of [1, 5]) {
    for (let y = 1; y <= 3; y++) q(s, 0, y, Bloco.MADEIRA_RETORCIDA);
    q(s, 1, 1, Bloco.CERCA);
  }
  q(2, 0, 1, Bloco.CERCA);
  q(4, 0, 1, Bloco.CERCA);
  q(3, 0, 3, Bloco.LANTERNA);
  // telhado em quatro degraus; o primeiro cobre a varanda
  for (let s = 0; s <= 6; s++) for (let f = 0; f <= 6; f++) q(s, f, 4, Bloco.TABUAS_PINHO);
  for (let k = 1; k <= 3; k++)
    for (let s = k; s <= 6 - k; s++)
      for (let f = 2; f <= 6; f++) q(s, f, 4 + k, Bloco.TABUAS_PINHO);
  // porta e miolo livres (o morador dorme no meio, ao lado da cama)
  for (let f = 0; f <= 2; f++) for (const y of [1, 2]) q(3, f, y, Bloco.AR);
  q(2, 5, 1, Bloco.CAMA);
  q(4, 5, 1, Bloco.FORNALHA_ACESA);
  q(4, 3, 1, Bloco.TOCHA);
  // chaminé do fogão
  for (let y = 4; y <= 8; y++) q(4, 6, y, Bloco.TIJOLOS);
}

/** Celeiro vermelho: quinas e faixa de cima brancas, portão largo, telhado em degraus. */
function celeiro(q: Q): void {
  for (let s = 1; s <= 5; s++)
    for (let f = 1; f <= 6; f++) {
      q(s, f, 0, Bloco.TABUAS);
      const borda = s === 1 || s === 5 || f === 1 || f === 6;
      if (!borda) continue;
      const quina = (s === 1 || s === 5) && (f === 1 || f === 6);
      for (let y = 1; y <= 4; y++) {
        // portão de três de largura e três de altura na frente
        if (f === 1 && s >= 2 && s <= 4 && y <= 3) continue;
        q(s, f, y, quina || y === 4 ? Bloco.LA_BRANCA : Bloco.LA_VERMELHA);
      }
    }
  // folhas do portão de tábuas, abertas para fora, encostadas na parede
  for (const s of [0, 6]) for (let y = 1; y <= 3; y++) q(s, 1, y, Bloco.TABUAS);
  // telhado: degraus vermelhos com a cumeeira branca, empenas fechadas na frente e no fundo
  for (let k = 0; k <= 3; k++)
    for (let s = k; s <= 6 - k; s++)
      for (let f = 0; f <= 6; f++) {
        const y = 5 + k;
        const aba = s === k || s === 6 - k || k === 3;
        if (aba) q(s, f, y, k === 3 ? Bloco.LA_BRANCA : Bloco.TIJOLOS);
        else if (f === 1 || f === 6)
          q(s, f, y, s === 3 && k === 0 && f === 1 ? Bloco.LA_BRANCA : Bloco.LA_VERMELHA);
      }
  // dentro: mesa do carpinteiro e baú com sementes e enxada no fundo, cama, feno e luz
  q(2, 5, 1, Bloco.MESA_TRABALHO);
  q(BAU_CELEIRO[0], BAU_CELEIRO[1], 1, Bloco.BAU);
  q(2, 3, 1, Bloco.CAMA);
  q(2, 4, 1, Bloco.FENO);
  q(2, 4, 2, Bloco.FENO);
  q(4, 3, 1, Bloco.TOCHA);
}

/** Ferraria: pedra com quinas de tronco, telhado de tijolos e chaminé sobre a fornalha. */
function ferraria(q: Q): void {
  for (let s = 1; s <= 5; s++)
    for (let f = 2; f <= 6; f++) {
      q(s, f, 0, Bloco.PEDRA_LISA);
      const borda = s === 1 || s === 5 || f === 2 || f === 6;
      if (!borda) continue;
      const quina = (s === 1 || s === 5) && (f === 2 || f === 6);
      for (let y = 1; y <= 3; y++) {
        const janela = y === 2 && !quina && (s === 1 || s === 5) && f === 4;
        q(s, f, y, quina ? Bloco.MADEIRA_RETORCIDA : janela ? Bloco.VIDRO : Bloco.TIJOLOS_PEDRA);
      }
    }
  for (let s = 0; s <= 6; s++) for (let f = 1; f <= 6; f++) q(s, f, 4, Bloco.TIJOLOS);
  for (let s = 1; s <= 5; s++) for (let f = 3; f <= 6; f++) q(s, f, 5, Bloco.TIJOLOS);
  for (let f = 0; f <= 2; f++) for (const y of [1, 2]) q(3, f, y, Bloco.AR);
  q(2, 5, 1, Bloco.FORNALHA);
  q(4, 5, 1, Bloco.CAMA);
  q(4, 3, 1, Bloco.TOCHA);
  for (let y = 4; y <= 8; y++) q(2, 6, y, Bloco.TIJOLOS_PEDRA);
}

/** Silo redondo de pedra com faixas, cúpula e um baú dentro. */
function silo(q: Q): void {
  for (let s = 0; s <= 6; s++)
    for (let f = 0; f <= 6; f++) {
      const r = Math.hypot(s - 3, f - 3);
      if (r <= 2.6) q(s, f, 0, Bloco.PEDRA_LISA);
      if (r > 1.6 && r <= 2.6)
        for (let y = 1; y <= 8; y++)
          q(s, f, y, y % 3 === 0 ? Bloco.TIJOLOS_PEDRA : Bloco.PEDRA_LISA);
      if (r <= 2.3) q(s, f, 9, Bloco.LA_BRANCA);
      if (r <= 1.2) q(s, f, 10, Bloco.LA_BRANCA);
    }
  for (let f = 0; f <= 2; f++) for (const y of [1, 2]) q(3, f, y, Bloco.AR);
  q(3, 4, 1, Bloco.BAU);
  q(2, 4, 1, Bloco.TOCHA);
}

/** Lavoura madura: dois canteiros de terra arada com uma trilha no meio. */
function lavoura(l: Lote, q: Q): void {
  const r = hash2(l.x0, l.z0, 7120);
  const a = MADURAS[Math.floor(r * 3)];
  const b = MADURAS[(Math.floor(r * 3) + 1 + Math.floor(hash2(l.z0, l.x0, 7121) * 2)) % 3];
  for (let f = 1; f <= 5; f++)
    for (const s of [1, 2, 4, 5]) {
      q(s, f, 0, Bloco.TERRA_ARADA);
      q(s, f, 1, s < 3 ? a : b);
    }
  // fardos de feno no canto do fundo
  q(6, 6, 1, Bloco.FENO);
  q(5, 6, 1, Bloco.FENO);
}

/** Curral e galinheiro: cerca em volta do lote, porteira e (no galinheiro) um abrigo. */
function cercado(p: PlanoPovoado, l: Lote, em: Pincel, q: Q): void {
  for (let s = 0; s <= 6; s++)
    for (let f = 0; f <= 6; f++)
      if (s === 0 || s === 6 || f === 0 || f === 6) q(s, f, 1, Bloco.CERCA);
  // porteira: porta de dois blocos na cerca (o jogador abre e fecha)
  const { portao } = portaoDoCercado(l, p.cz);
  em(portao[0], l.h + 1, portao[1], Bloco.PORTA);
  em(portao[0], l.h + 2, portao[1], Bloco.PORTA);
  // luz no alto dos mourões da frente
  q(0, 0, 2, Bloco.TOCHA);
  q(6, 0, 2, Bloco.TOCHA);
  if (l.uso === 'curral') {
    // bebedouro e fardo de feno no fundo
    q(1, 5, 0, Bloco.AGUA);
    q(2, 5, 0, Bloco.AGUA);
    q(5, 5, 1, Bloco.FENO);
    return;
  }
  // galinheiro: abrigo de tábuas no fundo, com ninhos de feno e telhado vermelho
  for (let s = 1; s <= 5; s++) q(s, 5, 1, s === 2 || s === 4 ? Bloco.FENO : Bloco.TABUAS);
  for (let s = 1; s <= 5; s++) q(s, 5, 2, Bloco.TABUAS);
  for (const s of [1, 5]) for (const y of [1, 2]) q(s, 4, y, Bloco.TABUAS);
  for (let s = 0; s <= 6; s++) for (let f = 3; f <= 6; f++) q(s, f, 3, Bloco.LA_VERMELHA);
}
