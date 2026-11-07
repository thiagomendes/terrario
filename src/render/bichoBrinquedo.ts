/**
 * Bichos de brinquedo (spec 012, A3): passa qualquer bicho de peças dos temas (cervo, raposa,
 * coelho, dinossauro, robô-cão, espectro...) para o traço de brinquedo sem perder a cara do
 * tema. A cabeça cresce em volta do próprio centro (proporção de brinquedo), os olhos viram
 * bolinhas maiores com um ponto de brilho, ganham bochechas, as patas e rabos viram cápsulas e
 * o corpo fica bem arredondado. Nada fica translúcido e o brilho tem teto (só olhos e luzes).
 */
import type { PecaCriatura } from '../temas/tipos';

export type FormaBicho = 'caixa' | 'capsula' | 'bola';
export interface PecaBicho extends PecaCriatura {
  forma: FormaBicho;
  /** Raio dos cantos (caixa). */
  raio: number;
}

/** Quanto a cabeça cresce (proporção de brinquedo). */
export const CABECA_MAIOR = 1.3;
/** Teto do brilho: só olhos e luzinhas, sem estourar no brilho noturno. */
export const BRILHO_MAXIMO = 0.55;

const lum = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return (((n >> 16) & 255) * 0.3 + ((n >> 8) & 255) * 0.59 + (n & 255) * 0.11) / 255;
};

/** As peças do bicho em formas de brinquedo, com olhos de bolinha, brilhos e bochechas. */
const pastel = (hex: string, t: number) => {
  if (t <= 0) return hex;
  const n = parseInt(hex.slice(1), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(v + (255 - v) * t));
  return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
};

export interface OpcoesBicho {
  /** Clareia as cores (criaturas da noite: plástico pastel em vez de vulto escuro). */
  pastel?: number;
  /** Quanto a cabeça cresce (padrão CABECA_MAIOR). */
  cabeca?: number;
}

export function bichoDeBrinquedo(
  pecas: readonly PecaCriatura[],
  opcoes: OpcoesBicho = {},
): PecaBicho[] {
  const tom = opcoes.pastel ?? 0;
  const volume = (p: PecaCriatura) => p.t[0] * p.t[1] * p.t[2];
  const cabecas = pecas.filter((p) => p.papel === 'cabeca');
  const cabeca = [...cabecas].sort((a, b) => volume(b) - volume(a))[0];
  const centro = cabeca?.p ?? [0, 0, 0];
  const k = cabeca ? (opcoes.cabeca ?? CABECA_MAIOR) : 1;
  // a cabeça maior sobe um pouco para não afundar no corpo
  const subir = cabeca ? cabeca.t[1] * (k - 1) * 0.35 : 0;
  const out: PecaBicho[] = [];
  for (const p of pecas) {
    const naCabeca = p.papel === 'cabeca' && !!cabeca;
    const t: [number, number, number] = naCabeca
      ? [p.t[0] * k, p.t[1] * k, p.t[2] * k]
      : [p.t[0], p.t[1], p.t[2]];
    const pos: [number, number, number] = naCabeca
      ? [
          centro[0] + (p.p[0] - centro[0]) * k,
          centro[1] + (p.p[1] - centro[1]) * k + subir,
          centro[2] + (p.p[2] - centro[2]) * k,
        ]
      : [p.p[0], p.p[1], p.p[2]];
    const maior = Math.max(...t);
    const menor = Math.min(...t);
    const brilho = p.brilho !== undefined ? Math.min(BRILHO_MAXIMO, p.brilho) : undefined;
    const olho = naCabeca && p !== cabeca && maior <= 0.1 && lum(p.cor) < 0.35;
    if (olho) {
      // olho de bolinha, maior, com um ponto de brilho em cima e uma bochecha embaixo
      const r = Math.max(maior * 0.75, 0.045 * k);
      out.push({
        ...p,
        t: [r * 2, r * 2.2, r * 1.4],
        p: pos,
        forma: 'bola',
        raio: 0,
        alfa: undefined,
        brilho,
      });
      out.push({
        t: [r * 0.7, r * 0.7, r * 0.5],
        p: [
          pos[0] + r * 0.35 * Math.sign(pos[0] || 1) * -1,
          pos[1] + r * 0.45,
          pos[2] + r * 0.5 * Math.sign(pos[2] || 1),
        ],
        cor: '#ffffff',
        papel: 'cabeca',
        forma: 'bola',
        raio: 0,
        brilho: 0.4,
      });
      out.push({
        t: [r * 1.6, r * 0.9, r * 0.5],
        p: [pos[0] + Math.sign(pos[0] || 1) * r * 0.9, pos[1] - r * 1.5, pos[2]],
        cor: '#ff9aa8',
        papel: 'cabeca',
        forma: 'bola',
        raio: 0,
      });
      continue;
    }
    const perna = p.papel === 'perna0' || p.papel === 'perna1';
    const fina = menor < maior * 0.5;
    const forma: FormaBicho =
      maior <= 0.1
        ? 'bola'
        : perna || p.papel === 'cauda' || p.papel === 'antena' || (fina && !naCabeca)
          ? 'capsula'
          : 'caixa';
    // cantos: cápsula bem redonda; cabeça e corpo, bem arredondados
    const raio =
      forma === 'capsula'
        ? menor * 0.49
        : Math.min(naCabeca ? 0.24 : 0.2, menor * (naCabeca ? 0.45 : 0.42));
    // os olhos e luzinhas mantêm a cor; o resto clareia (pastel) quando pedido
    const cor = (p.brilho ?? 0) > 0.3 ? p.cor : pastel(p.cor, tom);
    out.push({ ...p, t, p: pos, cor, forma, raio, alfa: undefined, brilho });
  }
  return out;
}
