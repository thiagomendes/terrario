import { CABELOS_LONGOS, PALETAS, SAIAS, type Aparencia } from './aparencia';
import type { NomeParte, Parte } from './modelo';
import { hash2 } from '../world/noise';

/** Densidade de pixels: 40 pixels por bloco (cabeça de 16x16, pixels quadrados). */
export const PX_POR_BLOCO = 40;

/** Cor saturada da lanterna, com luminância abaixo do teto emissivo (0.45). */
export const COR_LANTERNA = '#a85a00';
export const COR_CAPUZ_SOMBRA = '#2a2433';

/** Ordem das faces de uma caixa no Babylon: +z, -z, +x, -x, +y, -y. */
export type FaceCaixa = 'frente' | 'tras' | 'direita' | 'esquerda' | 'topo' | 'base';
export const ORDEM_FACES: readonly FaceCaixa[] = [
  'frente',
  'tras',
  'direita',
  'esquerda',
  'topo',
  'base',
];

export interface Regiao {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface TexturaParte {
  largura: number;
  altura: number;
  pixels: Uint8ClampedArray;
  /** Retângulo de cada face, na ordem de ORDEM_FACES (y = 0 no topo da imagem). */
  faces: Regiao[];
}

type Rgb = [number, number, number];

function hex(cor: string): Rgb {
  const n = parseInt(cor.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function tom(c: Rgb, f: number): Rgb {
  return [c[0] * f, c[1] * f, c[2] * f];
}

function mistura(a: Rgb, b: Rgb, t: number): Rgb {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

interface Cores {
  pele: Rgb;
  cabelo: Rgb;
  roupa: Rgb;
  calca: Rgb;
  bota: Rgb;
  cinto: Rgb;
  olho: Rgb;
}

function coresDe(a: Aparencia): Cores {
  const cabelo = hex(PALETAS.cabelo[a.cabeloCor] ?? PALETAS.cabelo[0]);
  return {
    pele: hex(PALETAS.pele[a.pele] ?? PALETAS.pele[0]),
    cabelo,
    roupa: hex(PALETAS.roupa[a.roupaCor] ?? PALETAS.roupa[0]),
    calca: hex(PALETAS.calca[a.calcaCor] ?? PALETAS.calca[0]),
    bota: [62, 42, 32],
    cinto: [88, 58, 36],
    olho: [44, 70, 110],
  };
}

/** Ruído de tecido: leve variação por pixel, determinística. */
function grao(c: Rgb, x: number, y: number, s: number, forca = 0.07): Rgb {
  return tom(c, 1 + (hash2(x, y, s) - 0.5) * 2 * forca);
}

/** Cor do pixel; null = transparente (recortes de capuz, óculos, chapéu, franja). */
type Pintor = (face: FaceCaixa, x: number, y: number, w: number, h: number) => Rgb | null;

/** Quanto do cabelo cobre cada lado da cabeça, por estilo. */
interface Corte {
  /** Linhas de franja na frente (em pixels a partir do topo). */
  franja: (x: number, w: number) => number;
  /** Fração da altura coberta atrás. */
  costas: number;
  /** Mechas nas laterais do rosto. */
  laterais: boolean;
}

function corteDe(estilo: number): Corte {
  switch (estilo) {
    case 1: // franja de lado
      return {
        franja: (x, w) => 3 + (x < w * 0.4 ? 2 : x < w * 0.6 ? 1 : 0),
        costas: 0.7,
        laterais: true,
      };
    case 2: // longo
      return { franja: (x) => 3 + (x % 4 === 1 ? 1 : 0), costas: 1, laterais: true };
    case 3: // raspado
      return { franja: () => 1, costas: 0.45, laterais: false };
    case 4: // cacheado
      return {
        franja: (x) => 3 + ((x * 5) % 3 === 0 ? 1 : 0) + (x % 5 === 2 ? 1 : 0),
        costas: 0.85,
        laterais: true,
      };
    case 5: // rabo de cavalo: puxado para trás
    case 6: // coque
      return { franja: (x) => 2 + (x % 6 === 0 ? 1 : 0), costas: 1, laterais: false };
    case 7: // tranças: risca no meio
      return {
        franja: (x, w) => (Math.abs(x - (w - 1) / 2) < 1 ? 1 : 3),
        costas: 1,
        laterais: true,
      };
    case 8: // chanel: franja reta
      return { franja: () => 4, costas: 1, laterais: true };
    default: // curto
      return { franja: (x) => 3 + (x % 4 === 1 ? 1 : 0), costas: 0.7, laterais: true };
  }
}

function texturaCabelo(c: Cores, estilo: number, x: number, y: number): Rgb {
  if (estilo === 4) {
    // cachos: bolinhas claras e escuras
    const k = (x + (y % 2) * 2) % 4;
    return grao(tom(c.cabelo, k === 0 ? 1.18 : k === 2 ? 0.82 : 1), x, y, 13, 0.08);
  }
  if (estilo === 3) return grao(mistura(c.cabelo, c.pele, 0.18), x, y, 13, 0.16);
  return grao(c.cabelo, x, y, 13, 0.1);
}

function pintorCabeca(a: Aparencia, c: Cores): Pintor {
  const corte = corteDe(a.cabeloEstilo);
  return (face, x, y, w, h) => {
    const pele = grao(c.pele, x, y, 11, 0.03);
    const cab = texturaCabelo(c, a.cabeloEstilo, x, y);
    if (face === 'topo') return cab;
    if (face === 'base') return tom(c.pele, 0.8);
    if (face === 'tras') {
      // rabo de cavalo: laço escuro no meio
      if (a.cabeloEstilo === 5 && y === Math.round(h * 0.55) && Math.abs(x - w / 2) < 2)
        return tom(c.roupa, 0.8);
      return y < h * corte.costas ? cab : pele;
    }
    if (face === 'direita' || face === 'esquerda') {
      const franja = y < Math.min(corte.franja(x, w), 4) + (x % 3 === 0 ? 1 : 0);
      const costas = face === 'direita' ? x < w * 0.45 : x >= w * 0.55;
      if (franja || (costas && y < h * corte.costas)) return cab;
      const orelha = y >= 7 && y <= 9 && Math.abs(x - w / 2) < 1.2;
      return orelha ? tom(c.pele, 0.85) : pele;
    }
    // frente: rosto
    if (y < corte.franja(x, w)) return cab;
    if (corte.laterais && (x === 0 || x === w - 1) && y < (a.cabeloEstilo === 2 ? h - 2 : 9))
      return cab;
    const ex = x === 3 || x === 4 ? 0 : x === w - 5 || x === w - 4 ? 1 : -1;
    const r = a.rosto;
    const feminino = a.corpo === 'feminino';
    // rosto feminino: cílios, sobrancelha fina, nariz discreto, lábios e blush
    const cilios = feminino || r === 1 || r === 3;
    const sardas = r === 2 || r === 3;
    // barba curta: contorno do queixo e laterais, deixando a boca à mostra
    if (r === 4) {
      const boca = y === 12 && x >= 6 && x <= 9;
      if (
        !boca &&
        (y >= 13 || (y >= 11 && (x <= 3 || x >= w - 4)) || (y >= 9 && (x <= 1 || x >= w - 2)))
      ) {
        return grao(mistura(c.cabelo, c.pele, 0.2), x, y, 73, 0.14);
      }
    }
    if (r === 5 && y === 11 && x >= 5 && x <= w - 6) return tom(c.cabelo, 0.95);
    if (y === 6 && ex >= 0) {
      if (feminino)
        return x === 3 || x === w - 4 ? mistura(c.cabelo, c.pele, 0.45) : tom(c.cabelo, 0.75);
      return tom(c.cabelo, cilios ? 0.7 : 0.8);
    }
    if (feminino && y === 6 && (x === 5 || x === w - 6)) return mistura(c.cabelo, c.pele, 0.55);
    // cílios: linha escura sobre o olho e um traço no canto externo
    if (cilios && y === 7 && ex >= 0) return tom(c.cabelo, 0.45);
    if (cilios && y === 8 && (x === 2 || x === w - 3)) return tom(c.cabelo, 0.45);
    if (sardas && (y === 10 || y === 11) && (x * 7 + y * 3) % 5 === 0 && (x <= 5 || x >= w - 6)) {
      return tom(mistura(c.pele, [150, 80, 50], 0.35), 0.92);
    }
    if (cilios && y === 12 && x >= 6 && x <= 9) return mistura(c.pele, [196, 70, 96], 0.5);
    if (cilios && y === 13 && (x === 7 || x === 8)) return mistura(c.pele, [210, 110, 130], 0.35);
    if ((y === 8 || y === 9) && ex >= 0) {
      const interno = ex === 0 ? x === 4 : x === w - 5;
      if (y === 8 && !interno) return [236, 236, 240];
      return interno ? c.olho : [236, 236, 240];
    }
    if (feminino && y === 11 && (x === 2 || x === 3 || x === w - 3 || x === w - 4)) {
      return mistura(c.pele, [236, 120, 140], 0.32);
    }
    if (y === 10 && (x === 7 || x === 8))
      return feminino && x === 7 ? pele : tom(c.pele, feminino ? 0.9 : 0.85);
    if (y === 12 && x >= 6 && x <= 9) return mistura(c.pele, [120, 50, 50], 0.45);
    if (y === 11 && (x === 2 || x === w - 3)) return mistura(c.pele, [230, 120, 120], 0.25);
    return pele;
  };
}

/** Volume de cabelo sobre a cabeça: a frente é recortada para não cobrir o rosto. */
function pintorCabelo(a: Aparencia, c: Cores): Pintor {
  const corte = corteDe(a.cabeloEstilo);
  const longo = CABELOS_LONGOS[a.cabeloEstilo] !== undefined;
  return (face, x, y, w, h) => {
    const base = texturaCabelo(c, a.cabeloEstilo, x, y + 3);
    if (face === 'topo') return x % 3 === 0 ? tom(base, 1.08) : base;
    if (face === 'base') return null;
    if (!longo) {
      if (face === 'frente') {
        // só a parte de cima do volume aparece na frente; abaixo, a franja fica na cabeça
        const limite = Math.max(1, Math.min(h, corte.franja(x, w) - 1));
        return y < limite ? base : null;
      }
      return y === h - 1 ? tom(base, 0.82) : base;
    }
    // Casca longa: 2 px acima da cabeça, a cabeça ocupa 16 px, o resto cai pelos ombros.
    const topoCabeca = 2;
    const fimCabeca = topoCabeca + 16;
    const ponta = y >= h - 2 ? tom(base, 0.8) : base;
    if (face === 'tras') return ponta;
    if (face === 'direita' || face === 'esquerda') return ponta;
    // frente: franja, mechas emoldurando o rosto e o que cai sobre o peito
    if (y < topoCabeca + corte.franja(x, w)) return base;
    const mecha = a.cabeloEstilo === 4 ? 3 : 2;
    if (y < fimCabeca) return x < mecha || x >= w - mecha ? base : null;
    if (a.cabeloEstilo === 7) {
      // tranças: duas colunas trançadas com laço na ponta
      const col = x >= 1 && x <= 3 ? 2 : x >= w - 4 && x <= w - 2 ? w - 3 : -1;
      if (col < 0) return null;
      if (y >= h - 4 && y < h - 2) return tom(c.roupa, 1.1);
      const trama = (y + (x === col ? 0 : 1)) % 3 === 0;
      return trama ? tom(base, 0.78) : base;
    }
    return x < mecha + 1 || x >= w - mecha - 1 ? ponta : null;
  };
}

/** Rabo de cavalo (alto e comprido) ou coque. */
function pintorPenteado(a: Aparencia, c: Cores): Pintor {
  return (face, x, y, w, h) => {
    const base = texturaCabelo(c, a.cabeloEstilo, x, y);
    if (a.cabeloEstilo === 5) {
      if (y >= 1 && y <= 2) return tom(c.roupa, 1.1); // elástico
      return y >= h - 2 ? tom(base, 0.8) : (x + y) % 5 === 0 ? tom(base, 0.88) : base;
    }
    // coque: espiral leve
    if (face === 'topo')
      return Math.abs(x - w / 2) + Math.abs(y - h / 2) < 2 ? tom(base, 0.8) : base;
    return (x + y * 2) % 5 === 0 ? tom(base, 0.85) : base;
  };
}

/** Saia: plissada, barra mais escura; na blusa com saia usa a cor da calça. */
function pintorSaia(a: Aparencia, c: Cores): Pintor {
  const cor = a.roupaEstilo === 7 ? c.calca : c.roupa;
  return (face, x, y, _w, h) => {
    if (face === 'base') return tom(cor, 0.55);
    if (face === 'topo') return tom(cor, 0.85);
    let r = grao(cor, x, y, 79, 0.06);
    if (x % 4 === 0) r = tom(r, 0.86); // pregas
    if (y === 0) r = tom(r, 0.8);
    if (y >= h - 2) r = tom(r, 0.72); // barra
    return r;
  };
}

function pintorTronco(a: Aparencia, c: Cores): Pintor {
  const clara = mistura(c.roupa, [235, 225, 205], 0.6);
  return (face, x, y, w, h) => {
    let r = grao(c.roupa, x, y, 19);
    if (face === 'topo' || face === 'base') return tom(r, 0.9);
    const cintoY = h - 5;
    const meio = (w - 1) / 2;
    // alças da mochila e cachecol aparecem na frente
    if (
      a.acessorio === 'mochila' &&
      face === 'frente' &&
      y < cintoY &&
      (Math.abs(x - 2) < 1 || Math.abs(x - (w - 3)) < 1)
    ) {
      return grao([92, 62, 38], x, y, 53);
    }
    if (y >= cintoY && y < cintoY + 2) {
      // vestidos: faixa clara na cintura; demais: cinto de couro
      if (SAIAS[a.roupaEstilo] !== undefined)
        return a.roupaEstilo === 7 ? tom(c.calca, 0.85) : clara;
      if (face === 'frente' && Math.abs(x - meio) < 1.5) return [196, 160, 80];
      return grao(c.cinto, x, y, 23);
    }
    if (y >= cintoY + 2) r = tom(r, 0.92);
    switch (a.roupaEstilo) {
      case 3: // listrada
        if (y < cintoY && y % 4 < 2) r = grao(clara, x, y, 19);
        break;
      case 7: // blusa clara (a saia leva a cor da calça)
        if (y < cintoY) r = grao(clara, x, y, 19);
        break;
      case 4: // colete sobre camisa clara
        if (face === 'frente' && Math.abs(x - meio) < 2.5 && y < cintoY)
          return grao(clara, x, y, 19);
        if (face === 'direita' || face === 'esquerda') r = tom(r, 0.9);
        break;
      default:
        break;
    }
    if (face === 'frente' && a.corpo === 'feminino') {
      // decote arredondado e leve sombra no busto
      if (y < 3 && Math.abs(x - meio) < 3.6 - y * 0.6) return c.pele;
      if (
        y === Math.round(h * 0.38) &&
        Math.abs(x - meio) > 0.8 &&
        Math.abs(x - meio) < meio - 0.8
      ) {
        return tom(r, 0.86);
      }
    }
    if (face === 'frente' && a.corpo !== 'feminino') {
      // gola em V
      if (y < 4 && Math.abs(x - meio) < 3 - y * 0.7) return c.pele;
      if (y < 5 && Math.abs(x - meio) < 4 - y * 0.6) return tom(c.roupa, 0.75);
    }
    if (face === 'frente') {
      if (a.roupaEstilo === 1 && Math.abs(x - meio) < 2.5 && y < cintoY) return clara;
      if (a.roupaEstilo === 2) {
        if (Math.abs(x - meio) < 0.6) return tom(c.roupa, 0.7);
        if (Math.abs(x - meio - 1.5) < 0.6 && y % 5 === 2 && y < cintoY) return [210, 190, 140];
      }
      if (a.roupaEstilo === 5) {
        // bandoleira: faixa de couro na diagonal
        const d = x - (y * w) / cintoY;
        if (Math.abs(d) < 1.3 && y < cintoY) return grao([110, 72, 40], x, y, 59);
      }
    }
    if (a.roupaEstilo === 2 && (x === 0 || x === w - 1)) return tom(r, 0.85);
    return r;
  };
}

function pintorBraco(a: Aparencia, c: Cores): Pintor {
  const clara = mistura(c.roupa, [235, 225, 205], 0.6);
  // colete: mangas da camisa clara; listrada: mangas listradas
  const manga = (x: number, y: number): Rgb =>
    a.roupaEstilo === 4
      ? grao(clara, x, y, 29)
      : (a.roupaEstilo === 3 && y % 4 < 2) || a.roupaEstilo === 7
        ? grao(clara, x, y, 29)
        : grao(c.roupa, x, y, 29);
  return (face, x, y, _w, h) => {
    if (face === 'topo') return manga(x, y);
    if (face === 'base') return tom(c.pele, 0.9);
    // vestidos e blusa: mangas curtas
    const fim = Math.floor(h * (SAIAS[a.roupaEstilo] !== undefined ? 0.32 : 0.62));
    if (y < fim) return manga(x, y);
    if (y === fim) return tom(c.roupa, 0.72);
    const pele = grao(c.pele, x, y, 31, 0.03);
    return y >= h - 2 ? tom(pele, 0.92) : pele;
  };
}

function pintorPerna(a: Aparencia, c: Cores): Pintor {
  // com saia, pernas à mostra abaixo da barra (pele) e botas
  const comSaia = SAIAS[a.roupaEstilo] !== undefined;
  return (face, x, y, _w, h) => {
    if (comSaia && face !== 'base' && y < h - 7) return grao(c.pele, x, y, 41, 0.03);
    if (face === 'topo') return tom(c.calca, 0.9);
    if (face === 'base') return tom(c.bota, 0.8);
    const bota = h - 7;
    if (y >= bota) {
      if (y === bota) return tom(c.bota, 1.25);
      return y >= h - 2 ? tom(c.bota, 0.7) : grao(c.bota, x, y, 37);
    }
    const r = grao(c.calca, x, y, 41);
    return x === 0 ? tom(r, 0.85) : r;
  };
}

function pintorAcessorio(a: Aparencia, c: Cores): Pintor {
  switch (a.acessorio) {
    case 'lanterna': {
      const ambar = hex(COR_LANTERNA);
      return (face, x, y, w, h) => {
        const moldura = x === 0 || x === w - 1 || y === 0 || y === h - 1 || y === 1;
        if (face === 'topo' || face === 'base' || moldura) return [52, 40, 36];
        return grao(ambar, x, y, 43, 0.08);
      };
    }
    case 'chapeu': {
      const feltro = mistura(c.roupa, [70, 52, 40], 0.55);
      return (face, x, y, _w, h) => {
        // aba: caixa fina
        if (h <= 2) return grao(tom(feltro, face === 'base' ? 0.6 : 0.85), x, y, 61, 0.06);
        if (face === 'base') return null;
        if (face === 'topo') return grao(feltro, x, y, 61, 0.08);
        // fita na base da copa
        if (y >= h - 2) return tom(c.roupa, 1.15);
        return grao(feltro, x, y, 61, 0.08);
      };
    }
    case 'oculos': {
      const aro: Rgb = [92, 64, 40];
      const lente: Rgb = [150, 196, 220];
      return (face, x, y, w) => {
        if (face === 'topo' || face === 'base' || face === 'tras') return null;
        if (face !== 'frente') return y === 1 ? aro : null; // hastes
        const l1 = x >= 2 && x <= 6;
        const l2 = x >= w - 7 && x <= w - 3;
        if (!l1 && !l2) return y === 1 && x > 6 && x < w - 7 ? aro : null; // ponte
        const borda = y === 0 || y === 2 || x === 2 || x === 6 || x === w - 7 || x === w - 3;
        return borda ? aro : mistura(lente, [255, 255, 255], x % 3 === 0 ? 0.3 : 0);
      };
    }
    case 'cachecol': {
      const la = mistura(c.roupa, [200, 60, 50], 0.6);
      return (face, x, y) => {
        if (face === 'base') return null;
        return grao((x + y) % 4 < 2 ? la : tom(la, 0.8), x, y, 67, 0.06);
      };
    }
    case 'mochila': {
      const couro: Rgb = [120, 82, 48];
      return (face, x, y, w, h) => {
        if (face === 'tras' && y > h * 0.35 && y < h * 0.4) return tom(couro, 0.7); // aba
        if (face === 'tras' && Math.abs(x - w / 2) < 1 && y > h * 0.4 && y < h * 0.5)
          return [196, 160, 80];
        return grao(couro, x, y, 71, 0.1);
      };
    }
    case 'capacete': {
      const casca: Rgb = [236, 238, 242];
      const aro: Rgb = [150, 160, 176];
      const visor: Rgb = [120, 190, 235];
      return (face, x, y, w, h) => {
        if (face === 'base') return null;
        // visor aberto: o rosto aparece, com moldura azulada
        if (face === 'frente') {
          const dentro = x >= 2 && x <= w - 3 && y >= 3 && y <= h - 4;
          const borda = dentro && (x === 2 || x === w - 3 || y === 3 || y === h - 4);
          if (borda) return mistura(visor, [255, 255, 255], y === 3 ? 0.4 : 0);
          if (dentro) return null;
        }
        // anel do pescoço e uma faixa colorida da roupa no lado
        if (face !== 'topo' && y >= h - 2) return tom(aro, y === h - 1 ? 0.8 : 1);
        if (face !== 'topo' && face !== 'frente' && y === Math.floor(h * 0.45))
          return tom(c.roupa, 1.1);
        // quinas mais escuras: a casca parece arredondada
        const quina =
          x === 0 || x === w - 1 || (face === 'topo' ? y === 0 || y === h - 1 : y === 0);
        return grao(tom(casca, quina ? 0.84 : 1), x, y, 73, 0.03);
      };
    }
    case 'chapeu-explorador': {
      const caqui: Rgb = [196, 170, 116];
      return (face, x, y, _w, h) => {
        if (h <= 2) return grao(tom(caqui, face === 'base' ? 0.65 : 0.92), x, y, 79, 0.05);
        if (face === 'base') return null;
        if (face === 'topo') return grao(tom(caqui, 1.05), x, y, 79, 0.06);
        if (y >= h - 3) return y === h - 3 ? [92, 64, 40] : [110, 78, 48];
        return grao(caqui, x, y, 79, 0.06);
      };
    }
    case 'touca-chef': {
      const branco: Rgb = [246, 244, 240];
      return (face, x, y, _w, h) => {
        if (face === 'base') return null;
        if (face === 'topo') return grao(branco, x, y, 83, 0.04);
        // pregas verticais no gomo de cima e faixa lisa embaixo
        if (y >= h - 4) return tom(branco, y === h - 4 ? 0.85 : 0.97);
        return x % 3 === 0 ? tom(branco, 0.86) : grao(branco, x, y, 83, 0.03);
      };
    }
    case 'coroa-flores': {
      const folha: Rgb = [84, 150, 70];
      const petalas: Rgb[] = [
        [255, 170, 200],
        [255, 230, 120],
        [190, 160, 255],
        [255, 255, 255],
      ];
      return (face, x, y, w) => {
        if (face === 'base') return null;
        // por cima só o anel (o cabelo aparece no meio)
        if (face === 'topo' && x > 0 && x < w - 1 && y > 0 && y < w - 1) return null;
        if ((x + y * 3) % 4 === 1) return petalas[(x * 7 + y) % petalas.length];
        return grao(folha, x, y, 89, 0.12);
      };
    }
    case 'avental': {
      const pano: Rgb = [250, 246, 240];
      const debrum = mistura(c.roupa, [240, 120, 150], 0.5);
      return (face, x, y, w, h) => {
        if (face !== 'frente') return tom(debrum, 0.9);
        if (x === 0 || x === w - 1 || y === 0) return debrum;
        // bolso na barriga: um retângulo um pouco mais escuro com costura em cima
        const y0 = Math.round(h * 0.56);
        const bolso =
          y >= y0 && y < Math.round(h * 0.8) && x >= Math.round(w * 0.3) && x < Math.round(w * 0.7);
        if (bolso) return y === y0 ? debrum : grao(tom(pano, 0.9), x, y, 97, 0.03);
        return grao(pano, x, y, 97, 0.03);
      };
    }
    default: {
      // capuz: abertura do rosto transparente
      const capuz = hex(COR_CAPUZ_SOMBRA);
      return (face, x, y, w, h) => {
        if (face === 'frente' && x > 2 && x < w - 3 && y > 3) return null;
        if (face === 'base') return null;
        const borda = face !== 'topo' && y >= h - 2;
        return borda ? tom(capuz, 1.35) : grao(capuz, x, y, 47, 0.1);
      };
    }
  }
}

function pintorDe(nome: NomeParte, a: Aparencia, c: Cores): Pintor {
  switch (nome) {
    case 'cabeca':
      return pintorCabeca(a, c);
    case 'cabelo':
      return pintorCabelo(a, c);
    case 'tronco':
      return pintorTronco(a, c);
    case 'bracoEsquerdo':
    case 'bracoDireito':
      return pintorBraco(a, c);
    case 'pernaEsquerda':
    case 'pernaDireita':
      return pintorPerna(a, c);
    case 'penteado':
      return pintorPenteado(a, c);
    case 'saia':
      return pintorSaia(a, c);
    default:
      return pintorAcessorio(a, c);
  }
}

function px(v: number): number {
  return Math.max(2, Math.round(v * PX_POR_BLOCO));
}

/** Dimensões (w, h) de cada face, em pixels, na ordem de ORDEM_FACES. */
export function dimensoesFaces(tamanho: readonly [number, number, number]): [number, number][] {
  const [sx, sy, sz] = tamanho.map(px);
  return [
    [sx, sy],
    [sx, sy],
    [sz, sy],
    [sz, sy],
    [sx, sz],
    [sx, sz],
  ];
}

/** Textura de uma parte do corpo, com as 6 faces lado a lado. */
export function gerarTexturaParte(
  aparencia: Aparencia,
  parte: Pick<Parte, 'nome' | 'tamanho'>,
): TexturaParte {
  const dims = dimensoesFaces(parte.tamanho);
  const largura = dims.reduce((s, d) => s + d[0], 0);
  const altura = Math.max(...dims.map((d) => d[1]));
  const pixels = new Uint8ClampedArray(largura * altura * 4);
  const pinta = pintorDe(parte.nome, aparencia, coresDe(aparencia));
  const faces: Regiao[] = [];
  let ox = 0;
  dims.forEach(([w, h], i) => {
    const face = ORDEM_FACES[i];
    faces.push({ x: ox, y: 0, w, h });
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const c = pinta(face, x, y, w, h);
        const k = (y * largura + ox + x) * 4;
        if (!c) continue; // transparente (alfa 0)
        pixels[k] = Math.max(0, Math.min(255, Math.round(c[0])));
        pixels[k + 1] = Math.max(0, Math.min(255, Math.round(c[1])));
        pixels[k + 2] = Math.max(0, Math.min(255, Math.round(c[2])));
        pixels[k + 3] = 255;
      }
    }
    ox += w;
  });
  return { largura, altura, pixels, faces };
}
