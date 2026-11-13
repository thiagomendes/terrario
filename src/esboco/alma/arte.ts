/**
 * Esboço da spec 023: os desenhos (SVG feitos aqui, à mão, no jeito de brinquedo da 012).
 * Nada de arte de terceiros. Quadro de 64 × 64, contorno marrom macio, sombra embaixo.
 */
const C = '#5a3a22'; // contorno
const L = 'stroke-linejoin="round" stroke-linecap="round"';
const s = (w = 3) => `stroke="${C}" stroke-width="${w}" ${L}`;

function svg(corpo: string, vb = '0 0 64 64'): string {
  return `<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${corpo}</svg>`;
}

const estrela5 = (cx: number, cy: number, r: number, ri = r * 0.48) => {
  const p: string[] = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? ri : r;
    p.push(`${(cx + Math.cos(a) * rr).toFixed(1)},${(cy + Math.sin(a) * rr).toFixed(1)}`);
  }
  return p.join(' ');
};

export const ARTE: Record<string, string> = {
  moeda: svg(`
    <circle cx="32" cy="35" r="25" fill="#d98a14"/>
    <circle cx="32" cy="31" r="25" fill="#ffc93d" ${s()}/>
    <circle cx="32" cy="31" r="18" fill="#ffd96a" stroke="#e6a21e" stroke-width="3"/>
    <polygon points="${estrela5(32, 32, 12)}" fill="#f0a91c" stroke="#d98a14" stroke-width="2" ${L}/>
    <path d="M17 20 Q22 13 31 12" fill="none" stroke="#fff6c8" stroke-width="3.5" stroke-linecap="round"/>`),
  bau: svg(`
    <rect x="7" y="30" width="50" height="27" rx="4" fill="#b8692c" ${s()}/>
    <path d="M7 31 Q7 13 32 13 Q57 13 57 31 Z" fill="#d9843a" ${s()}/>
    <rect x="7" y="28" width="50" height="7" fill="#ffc93d" ${s(2.5)}/>
    <rect x="15" y="14" width="7" height="43" fill="#ffc93d" ${s(2.5)}/>
    <rect x="42" y="14" width="7" height="43" fill="#ffc93d" ${s(2.5)}/>
    <rect x="27" y="29" width="10" height="13" rx="2" fill="#ffe27a" ${s(2.5)}/>
    <circle cx="32" cy="35" r="1.8" fill="${C}"/>
    <path d="M14 22 Q18 17 26 16" fill="none" stroke="#f5b46e" stroke-width="3" stroke-linecap="round"/>`),
  album: svg(`
    <rect x="10" y="8" width="44" height="50" rx="6" fill="#2f7fe8" ${s()}/>
    <rect x="10" y="8" width="9" height="50" rx="4" fill="#1d58b0" ${s()}/>
    <rect x="25" y="16" width="22" height="22" rx="4" fill="#fff6e4" ${s(2.5)}/>
    <polygon points="${estrela5(36, 27.5, 8)}" fill="#ffc93d" stroke="#d98a14" stroke-width="1.8" ${L}/>
    <rect x="25" y="43" width="22" height="6" rx="3" fill="#8fc2ff"/>`),
  medalha: svg(`
    <path d="M20 4 L30 28 L24 30 L14 8 Z" fill="#e8402f" ${s(2.5)}/>
    <path d="M44 4 L34 28 L40 30 L50 8 Z" fill="#2f7fe8" ${s(2.5)}/>
    <circle cx="32" cy="42" r="17" fill="#ffc93d" ${s()}/>
    <circle cx="32" cy="42" r="11" fill="#ffd96a" stroke="#e6a21e" stroke-width="2.5"/>
    <polygon points="${estrela5(32, 42.5, 8)}" fill="#f0a91c"/>`),
  loja: svg(`
    <rect x="10" y="30" width="44" height="27" rx="3" fill="#fff0d0" ${s()}/>
    <rect x="16" y="38" width="14" height="19" rx="2" fill="#b8692c" ${s(2.5)}/>
    <rect x="35" y="37" width="13" height="10" rx="2" fill="#bfe3ff" ${s(2.5)}/>
    <path d="M6 18 L58 18 L58 28 Q53 34 48 28 Q43 34 38 28 Q33 34 28 28 Q23 34 18 28 Q13 34 6 28 Z" fill="#e8402f" ${s()}/>
    <path d="M16 18 L16 29 M26 18 L26 29 M36 18 L36 29 M46 18 L46 29" stroke="#fff" stroke-width="5"/>
    <path d="M6 18 L58 18 L58 28 Q53 34 48 28 Q43 34 38 28 Q33 34 28 28 Q23 34 18 28 Q13 34 6 28 Z" fill="none" ${s()}/>
    <rect x="9" y="9" width="46" height="10" rx="4" fill="#ffc93d" ${s(2.5)}/>
    <circle cx="32" cy="14" r="3" fill="#d98a14"/>`),
  cadeado: svg(`
    <path d="M21 30 V22 Q21 11 32 11 Q43 11 43 22 V30" fill="none" stroke="${C}" stroke-width="9" stroke-linecap="round"/>
    <path d="M21 30 V22 Q21 11 32 11 Q43 11 43 22 V30" fill="none" stroke="#c9c2b6" stroke-width="4.5" stroke-linecap="round"/>
    <rect x="13" y="28" width="38" height="29" rx="6" fill="#ffc93d" ${s()}/>
    <circle cx="32" cy="40" r="4" fill="${C}"/><rect x="30.5" y="41" width="3" height="8" rx="1.5" fill="${C}"/>`),
  play: svg(`<path d="M22 13 L50 32 L22 51 Z" fill="#fff" stroke="#fff" stroke-width="6" ${L}/>`),
  ok: svg(`<path d="M13 33 L27 47 L52 18" fill="none" stroke="#fff" stroke-width="10" ${L}/>`),
  estrela: svg(`<polygon points="${estrela5(32, 34, 27)}" fill="#ffc93d" ${s()}/>
    <path d="M24 23 L28 19" stroke="#fff6c8" stroke-width="3.5" stroke-linecap="round"/>`),
  estrelaVazia: svg(`<polygon points="${estrela5(32, 34, 27)}" fill="#e9dcc2" stroke="#cdb894" stroke-width="3" ${L}/>`),
  coracao: svg(`<path d="M32 54 C10 40 6 28 12 19 C18 11 28 13 32 21 C36 13 46 11 52 19 C58 28 54 40 32 54 Z" fill="#ff5a7a" ${s()}/>
    <path d="M17 22 Q20 18 25 18" stroke="#ffd0da" stroke-width="3.5" fill="none" stroke-linecap="round"/>`),
  seta: svg(`<path d="M10 32 H46 M34 18 L50 32 L34 46" fill="none" stroke="#c9a77a" stroke-width="8" ${L}/>`),

  // ------------------------------------------------------------ habilidades
  construtor: svg(`
    <rect x="8" y="34" width="22" height="12" rx="2" fill="#c9553a" ${s(2.5)}/>
    <rect x="18" y="46" width="22" height="12" rx="2" fill="#d9663f" ${s(2.5)}/>
    <rect x="30" y="34" width="10" height="12" rx="2" fill="#c9553a" ${s(2.5)}/>
    <path d="M38 30 L54 8 L60 13 L44 34 Z" fill="#c9cdd6" ${s(2.5)}/>
    <path d="M44 34 L38 30 L34 36 Q32 40 36 41 Q40 42 42 38 Z" fill="#b8692c" ${s(2.5)}/>`),
  explorador: svg(`
    <circle cx="20" cy="38" r="14" fill="#3b4a5e" ${s()}/>
    <circle cx="44" cy="38" r="14" fill="#3b4a5e" ${s()}/>
    <circle cx="20" cy="38" r="8" fill="#8fd3ff"/><circle cx="44" cy="38" r="8" fill="#8fd3ff"/>
    <circle cx="17" cy="35" r="3" fill="#fff"/><circle cx="41" cy="35" r="3" fill="#fff"/>
    <rect x="16" y="14" width="10" height="14" rx="3" fill="#56677d" ${s(2.5)}/>
    <rect x="38" y="14" width="10" height="14" rx="3" fill="#56677d" ${s(2.5)}/>
    <rect x="27" y="30" width="10" height="8" rx="2" fill="#56677d" ${s(2.5)}/>`),
  bichos: svg(`
    <ellipse cx="32" cy="42" rx="15" ry="12" fill="#8a5a3a" ${s()}/>
    <ellipse cx="14" cy="27" rx="6" ry="8" fill="#8a5a3a" ${s(2.5)}/>
    <ellipse cx="25" cy="17" rx="6" ry="8" fill="#8a5a3a" ${s(2.5)}/>
    <ellipse cx="39" cy="17" rx="6" ry="8" fill="#8a5a3a" ${s(2.5)}/>
    <ellipse cx="50" cy="27" rx="6" ry="8" fill="#8a5a3a" ${s(2.5)}/>
    <path d="M32 50 C24 44 23 40 26 37 C28 35 31 36 32 38 C33 36 36 35 38 37 C41 40 40 44 32 50 Z" fill="#ff5a7a"/>`),
  fazendeiro: svg(`
    <path d="M6 50 Q32 40 58 50 L58 58 L6 58 Z" fill="#8a5a3a" ${s()}/>
    <path d="M32 48 V26" stroke="#3f9a3a" stroke-width="5" stroke-linecap="round"/>
    <path d="M32 34 Q16 34 12 20 Q28 18 32 32" fill="#7fd06a" ${s(2.5)}/>
    <path d="M32 28 Q46 30 52 14 Q34 12 32 26" fill="#8fdc6f" ${s(2.5)}/>`),
  jardineiro: svg(`
    <path d="M32 58 V34" stroke="#3f9a3a" stroke-width="5" stroke-linecap="round"/>
    <path d="M32 48 Q20 50 16 40 Q28 38 32 46" fill="#7fd06a" ${s(2.5)}/>
    <circle cx="32" cy="14" r="8" fill="#ff7aa8" ${s(2.5)}/><circle cx="20" cy="24" r="8" fill="#ff7aa8" ${s(2.5)}/>
    <circle cx="44" cy="24" r="8" fill="#ff7aa8" ${s(2.5)}/><circle cx="25" cy="36" r="8" fill="#ff7aa8" ${s(2.5)}/>
    <circle cx="39" cy="36" r="8" fill="#ff7aa8" ${s(2.5)}/><circle cx="32" cy="26" r="8" fill="#ffc93d" ${s(2.5)}/>`),
  vizinho: svg(`
    <path d="M6 30 L22 16 L38 30 V56 H6 Z" fill="#fff0d0" ${s()}/>
    <rect x="16" y="40" width="10" height="16" rx="2" fill="#b8692c" ${s(2.5)}/>
    <path d="M3 31 L22 13 L41 31" fill="none" stroke="#e8402f" stroke-width="6" ${L}/>
    <path d="M47 50 C37 43 36 37 39 33 C42 30 46 31 47 35 C48 31 52 30 55 33 C58 37 57 43 47 50 Z" fill="#ff5a7a" ${s(2.5)}/>`),
  cozinheiro: svg(`
    <ellipse cx="30" cy="42" rx="22" ry="13" fill="#3b4a5e" ${s()}/>
    <ellipse cx="30" cy="38" rx="17" ry="7" fill="#6a7a8e"/>
    <rect x="50" y="36" width="12" height="6" rx="3" fill="#b8692c" ${s(2.5)}/>
    <ellipse cx="30" cy="37" rx="10" ry="4" fill="#f2c64a"/>
    <path d="M22 26 Q18 20 22 14 M30 26 Q26 18 30 10 M38 26 Q34 20 38 14" fill="none" stroke="#c9d6e6" stroke-width="3.5" stroke-linecap="round"/>`),

  // ------------------------------------------------------------ bichos e enfeites
  galinha: svg(`
    <path d="M14 30 Q12 54 34 56 Q54 56 54 38 Q54 28 46 26 L40 34 Q30 22 14 30 Z" fill="#fffaf0" ${s()}/>
    <path d="M30 40 Q40 36 46 44 Q38 50 30 40 Z" fill="#efe4cf" ${s(2)}/>
    <circle cx="20" cy="22" r="11" fill="#fffaf0" ${s()}/>
    <path d="M14 13 Q16 6 20 10 Q22 4 26 10 Q30 8 28 14" fill="#e8402f" ${s(2.5)}/>
    <path d="M9 22 L3 25 L9 27 Z" fill="#ffb02e" ${s(2)}/>
    <path d="M12 29 Q12 35 15 33" fill="#e8402f" ${s(2)}/>
    <circle cx="17" cy="20" r="2.2" fill="${C}"/>
    <path d="M30 56 V61 M40 56 V61" stroke="#ffb02e" stroke-width="3" stroke-linecap="round"/>`),
  vaca: svg(`
    <path d="M10 18 Q2 14 4 24 Q8 26 14 24 Z" fill="#fffaf0" ${s(2.5)}/>
    <path d="M54 18 Q62 14 60 24 Q56 26 50 24 Z" fill="#fffaf0" ${s(2.5)}/>
    <path d="M18 8 Q16 2 22 4 M46 8 Q48 2 42 4" fill="none" stroke="#e6d6a8" stroke-width="4" stroke-linecap="round"/>
    <rect x="12" y="8" width="40" height="40" rx="15" fill="#fffaf0" ${s()}/>
    <path d="M14 22 Q22 12 30 18 Q26 28 16 28 Z" fill="#3b2a1e"/>
    <path d="M44 10 Q52 14 50 24 Q42 20 44 10 Z" fill="#3b2a1e"/>
    <circle cx="24" cy="28" r="3" fill="${C}"/><circle cx="40" cy="28" r="3" fill="${C}"/>
    <rect x="14" y="36" width="36" height="22" rx="11" fill="#ffb0c0" ${s()}/>
    <ellipse cx="25" cy="47" rx="3" ry="4" fill="#c96a80"/><ellipse cx="39" cy="47" rx="3" ry="4" fill="#c96a80"/>`),
  gato: svg(`
    <path d="M12 26 L14 6 L28 18 Z" fill="#ff9a3a" ${s()}/><path d="M52 26 L50 6 L36 18 Z" fill="#ff9a3a" ${s()}/>
    <ellipse cx="32" cy="36" rx="22" ry="20" fill="#ff9a3a" ${s()}/>
    <path d="M24 18 L26 26 M32 16 V25 M40 18 L38 26" stroke="#d9732a" stroke-width="3" stroke-linecap="round"/>
    <ellipse cx="24" cy="36" rx="3.5" ry="4.5" fill="${C}"/><ellipse cx="40" cy="36" rx="3.5" ry="4.5" fill="${C}"/>
    <circle cx="25" cy="34.5" r="1.3" fill="#fff"/><circle cx="41" cy="34.5" r="1.3" fill="#fff"/>
    <path d="M29 43 L35 43 L32 46 Z" fill="#ff7a9a"/>
    <path d="M32 46 Q29 50 26 48 M32 46 Q35 50 38 48" fill="none" stroke="${C}" stroke-width="2" stroke-linecap="round"/>
    <path d="M6 40 L18 42 M6 47 L18 45 M58 40 L46 42 M58 47 L46 45" stroke="#fff" stroke-width="2" stroke-linecap="round"/>`),
  cavalo: svg(`
    <path d="M20 58 L22 34 Q14 30 12 22 Q12 12 22 10 L30 4 L32 12 Q46 14 50 30 L52 58 Z" fill="#a86a3a" ${s()}/>
    <path d="M30 6 Q40 6 46 16 Q50 24 50 32 Q44 22 36 18 Q32 12 30 6 Z" fill="#5a3a22"/>
    <ellipse cx="17" cy="25" rx="6" ry="5" fill="#d9a070" ${s(2)}/>
    <circle cx="16" cy="25" r="1.5" fill="${C}"/>
    <circle cx="26" cy="17" r="2.6" fill="${C}"/><circle cx="27" cy="16" r="0.9" fill="#fff"/>
    <path d="M24 44 Q34 42 40 48" fill="none" stroke="#8a5028" stroke-width="2.5" stroke-linecap="round"/>`),
  osso: svg(`
    <g transform="rotate(-30 32 32)">
    <rect x="14" y="26" width="36" height="12" rx="5" fill="#fffaf0" ${s()}/>
    <circle cx="13" cy="25" r="7" fill="#fffaf0" ${s()}/><circle cx="13" cy="39" r="7" fill="#fffaf0" ${s()}/>
    <circle cx="51" cy="25" r="7" fill="#fffaf0" ${s()}/><circle cx="51" cy="39" r="7" fill="#fffaf0" ${s()}/>
    <rect x="15" y="27" width="34" height="10" fill="#fffaf0"/></g>`),
  espantalho: svg(`
    <path d="M32 26 V62" stroke="#8a5a3a" stroke-width="5" stroke-linecap="round"/>
    <path d="M6 32 H58" stroke="#8a5a3a" stroke-width="5" stroke-linecap="round"/>
    <path d="M18 30 L46 30 L42 50 L22 50 Z" fill="#3f6fb8" ${s()}/>
    <path d="M26 36 h6 v6 h-6 z M36 40 h5 v5 h-5 z" fill="#e8402f"/>
    <path d="M4 30 l4 6 M60 30 l-4 6" stroke="#f2c64a" stroke-width="3" stroke-linecap="round"/>
    <circle cx="32" cy="20" r="9" fill="#f5e2b0" ${s()}/>
    <circle cx="29" cy="19" r="1.6" fill="${C}"/><circle cx="35" cy="19" r="1.6" fill="${C}"/>
    <path d="M28 23 Q32 26 36 23" fill="none" stroke="${C}" stroke-width="2" stroke-linecap="round"/>
    <path d="M16 13 Q32 2 48 13 Z" fill="#f2c64a" ${s()}/>`),
  bandeirinhas: svg(`
    <path d="M2 14 Q32 30 62 14" fill="none" stroke="${C}" stroke-width="2.5"/>
    <path d="M6 16 L16 20 L9 32 Z" fill="#e8402f" ${s(2)}/>
    <path d="M19 21 L30 23 L23 36 Z" fill="#ffc93d" ${s(2)}/>
    <path d="M33 23 L44 21 L40 35 Z" fill="#2f7fe8" ${s(2)}/>
    <path d="M47 20 L58 16 L56 30 Z" fill="#5cbf4f" ${s(2)}/>
    <path d="M2 38 Q32 54 62 38" fill="none" stroke="${C}" stroke-width="2.5"/>
    <path d="M12 42 L23 46 L15 57 Z" fill="#ff7aa8" ${s(2)}/>
    <path d="M27 47 L38 47 L33 60 Z" fill="#ff9a3a" ${s(2)}/>
    <path d="M42 46 L52 42 L50 56 Z" fill="#8a5ad8" ${s(2)}/>`),

  // ------------------------------------------------------------ lugares (missão de passeio)
  padaria: svg(`
    <ellipse cx="32" cy="38" rx="25" ry="15" fill="#d9943a" ${s()}/>
    <path d="M18 30 Q22 38 20 46 M30 26 Q34 36 32 50 M42 28 Q46 36 44 48" fill="none" stroke="#f5c77a" stroke-width="4" stroke-linecap="round"/>`),
  escola: svg(`
    <path d="M8 28 L32 10 L56 28 V58 H8 Z" fill="#ffe27a" ${s()}/>
    <path d="M4 30 L32 8 L60 30" fill="none" stroke="#e8402f" stroke-width="6" ${L}/>
    <rect x="25" y="40" width="14" height="18" rx="2" fill="#b8692c" ${s(2.5)}/>
    <path d="M26 30 Q26 20 32 20 Q38 20 38 30 Z" fill="#ffc93d" ${s(2.5)}/>
    <rect x="12" y="38" width="9" height="9" rx="1.5" fill="#bfe3ff" ${s(2)}/><rect x="43" y="38" width="9" height="9" rx="1.5" fill="#bfe3ff" ${s(2)}/>`),
  sorveteria: svg(`
    <path d="M20 32 L32 60 L44 32 Z" fill="#e6a24a" ${s()}/>
    <path d="M24 38 L40 38 M26 44 L38 44" stroke="#c97a2a" stroke-width="2.5"/>
    <circle cx="32" cy="20" r="11" fill="#ff9ab8" ${s()}/>
    <path d="M18 32 Q18 22 26 24 Q32 28 38 24 Q46 22 46 32 Z" fill="#fff6e4" ${s()}/>
    <circle cx="33" cy="9" r="4" fill="#e8402f" ${s(2)}/>`),

  // ------------------------------------------------------------ ações (selinho no canto)
  colher: svg(`
    <path d="M10 30 H54 L48 56 H16 Z" fill="#d9a05a" ${s()}/>
    <path d="M20 30 Q32 6 44 30" fill="none" stroke="${C}" stroke-width="4"/>
    <path d="M14 40 H50 M16 48 H48" stroke="#b8792c" stroke-width="3"/>`),
  plantar: svg(`
    <path d="M6 46 Q32 38 58 46 V58 H6 Z" fill="#8a5a3a" ${s()}/>
    <path d="M32 6 V30 M22 22 L32 32 L42 22" fill="none" stroke="#3f9a3a" stroke-width="7" ${L}/>`),
  fazer: svg(`
    <polygon points="${estrela5(32, 32, 26, 10)}" fill="#ffe27a" ${s()}/>`),
  pegar: svg(`
    <path d="M14 40 V24 Q14 20 18 20 Q22 20 22 24 V34 V14 Q22 10 26 10 Q30 10 30 14 V32 V12 Q30 8 34 8 Q38 8 38 12 V32 V16 Q38 12 42 12 Q46 12 46 16 V40 Q46 58 30 58 Q20 58 14 48 Z" fill="#ffd5a8" ${s()}/>`),
};

export function arte(nome: string): string {
  return ARTE[nome] ?? ARTE.estrela;
}
