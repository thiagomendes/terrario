/**
 * Ícones dos gestos (spec 015): os mesmos desenhos do esboço aprovado, sem texto. A roda usa
 * o ícone no botão; o balão em cima da cabeça usa o mesmo ícone num círculo creme.
 */
import type { IdGesto } from '../personagem/gestos';

/** Miolo do SVG de cada gesto (viewBox 0 0 32 32). */
export const ICONES_GESTOS: Record<IdGesto, string> = {
  acenar:
    '<path d="M10 25 V12 a2 2 0 0 1 4 0 V18 V8 a2 2 0 0 1 4 0 V18 V9 a2 2 0 0 1 4 0 V19 V13 a2 2 0 0 1 4 0 V21 Q26 28 18 28 H16 Q11 28 10 25 Z" fill="#f2c9a0" stroke="#3b2a1e" stroke-width="1.8" stroke-linejoin="round"/><path d="M4 8 Q6 5 8 7 M3 13 Q5 11 7 12" stroke="#a8610a" stroke-width="1.8" fill="none" stroke-linecap="round"/>',
  cumprimentar:
    '<circle cx="10" cy="9" r="4" fill="#f2c9a0" stroke="#3b2a1e" stroke-width="1.8"/><path d="M10 13 Q15 17 14 24 M14 24 L11 29 M14 24 L17 29" stroke="#3b6fb6" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M19 16 Q24 13 27 17 Q24 20 20 19 Z" fill="#ffd45a" stroke="#3b2a1e" stroke-width="1.6"/>',
  chamar:
    '<path d="M7 20 H18 a3 3 0 0 0 0 -6 H15 V11 a2 2 0 0 0 -4 0 V20" fill="#f2c9a0" stroke="#3b2a1e" stroke-width="1.8" stroke-linejoin="round"/><path d="M22 9 Q27 16 22 23" stroke="#a8610a" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M5 20 V26 H18" stroke="#3b2a1e" stroke-width="1.8" fill="none" stroke-linecap="round"/>',
  comemorar:
    '<path d="M16 4 L19 12 L27 12 L21 17 L23 26 L16 21 L9 26 L11 17 L5 12 L13 12 Z" fill="#ffd45a" stroke="#3b2a1e" stroke-width="1.8" stroke-linejoin="round"/>',
  aplaudir:
    '<path d="M9 26 L6 14 a2 2 0 0 1 4 -1 L13 20 L12 9 a2 2 0 0 1 4 0 L17 22" fill="#f2c9a0" stroke="#3b2a1e" stroke-width="1.8" stroke-linejoin="round"/><path d="M23 26 L26 14 a2 2 0 0 0 -4 -1 L19 20" fill="#e8b48a" stroke="#3b2a1e" stroke-width="1.8" stroke-linejoin="round"/><path d="M20 6 L22 3 M25 9 L28 7 M15 4 L15 1" stroke="#a8610a" stroke-width="1.8" stroke-linecap="round"/>',
  dancar:
    '<path d="M12 23 V8 L25 5 V20" fill="none" stroke="#3b2a1e" stroke-width="2.2" stroke-linejoin="round"/><ellipse cx="9" cy="23" rx="4" ry="3" fill="#ff8fb3" stroke="#3b2a1e" stroke-width="1.8"/><ellipse cx="22" cy="20" rx="4" ry="3" fill="#ff8fb3" stroke="#3b2a1e" stroke-width="1.8"/>',
  apontar:
    '<path d="M4 15 H17 V12 L28 16 L17 20 V17 H4 Z" fill="#7cc6ff" stroke="#3b2a1e" stroke-width="1.8" stroke-linejoin="round"/>',
  sentar:
    '<path d="M8 6 V20 H22 V27 M8 20 V27" stroke="#7a4826" stroke-width="2.6" fill="none" stroke-linecap="round"/><path d="M8 15 H22 V20" stroke="#7a4826" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
  // spec 023 (T09): o bonequinho em X pulando com a estrela, e a reverência com o floreio
  'pulo-estrela':
    '<circle cx="16" cy="7" r="3.6" fill="#f2c9a0" stroke="#3b2a1e" stroke-width="1.8"/><path d="M16 11 V19 M16 13 L7 6 M16 13 L25 6 M16 19 L9 28 M16 19 L23 28" stroke="#e8402f" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M27 15 L28.2 18 L31 18.4 L28.8 20.3 L29.5 23.2 L27 21.6 L24.5 23.2 L25.2 20.3 L23 18.4 L25.8 18 Z" fill="#ffd45a" stroke="#3b2a1e" stroke-width="1.2" stroke-linejoin="round"/>',
  reverencia:
    '<circle cx="19" cy="10" r="3.6" fill="#f2c9a0" stroke="#3b2a1e" stroke-width="1.8"/><path d="M17 13 Q12 15 11 21 M11 21 L10 29 M11 21 L15 29" stroke="#8a5ad8" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M14 16 Q19 19 22 17" stroke="#8a5ad8" stroke-width="2.6" fill="none" stroke-linecap="round"/><path d="M4 12 Q6 7 10 9 M5 17 Q3 14 5 11" stroke="#ffb21a" stroke-width="1.8" fill="none" stroke-linecap="round"/>',
};

/** A carinha do botão que abre a roda. */
export const ICONE_CARINHA =
  '<circle cx="16" cy="16" r="12" fill="#ffd45a" stroke="#3b2a1e" stroke-width="2.2"/><circle cx="11.5" cy="13.5" r="1.8" fill="#3b2a1e"/><circle cx="20.5" cy="13.5" r="1.8" fill="#3b2a1e"/><path d="M10.5 18.5 Q16 24 21.5 18.5" fill="none" stroke="#3b2a1e" stroke-width="2.2" stroke-linecap="round"/>';

/** SVG pronto para innerHTML (botões da roda e da carinha). */
export function svgDoIcone(miolo: string, classe = 'icone-gesto'): string {
  return `<svg class="${classe}" viewBox="0 0 32 32" aria-hidden="true" focusable="false">${miolo}</svg>`;
}

/** O balão do esboço: círculo creme com a pontinha embaixo e o ícone no meio (viewBox 64). */
export function svgDoBalao(id: IdGesto): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="256" height="256"><circle cx="32" cy="30" r="27" fill="#fff7e8" stroke="#e9d6b2" stroke-width="3"/><path d="M26 55 L32 63 L38 55 Z" fill="#fff7e8"/><g transform="translate(14 12) scale(1.12)">${ICONES_GESTOS[id]}</g></svg>`;
}

/**
 * Spec 023 (T09): o balão do presente do nível 6: o mesmo balão creme com a borda de ouro e
 * três estrelinhas brilhando em volta.
 */
export function svgDoBalaoEstrela(id: IdGesto): string {
  const estrela = (x: number, y: number, r: number) => {
    const p: string[] = [];
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const rr = i % 2 ? r * 0.45 : r;
      p.push(`${(x + Math.cos(a) * rr).toFixed(1)},${(y + Math.sin(a) * rr).toFixed(1)}`);
    }
    return `<polygon points="${p.join(' ')}" fill="#ffd45a" stroke="#c98a14" stroke-width="1"/>`;
  };
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="256" height="256"><circle cx="32" cy="30" r="26" fill="#fff7e8" stroke="#ffc93d" stroke-width="4"/><circle cx="32" cy="30" r="22.5" fill="none" stroke="#fff1b8" stroke-width="1.2"/><path d="M26 54 L32 62 L38 54 Z" fill="#fff7e8" stroke="#ffc93d" stroke-width="2" stroke-linejoin="round"/><g transform="translate(15 13) scale(1.06)">${ICONES_GESTOS[id]}</g>${estrela(8, 8, 6.5)}${estrela(57, 12, 5)}${estrela(56, 49, 4)}</svg>`;
}
