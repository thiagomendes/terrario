/**
 * Spec 026: os desenhos das missões da Vila Neon (do esboço aprovado, `referencia/imagens/
 * desenhos-folha.jpg`), no jeito da 023 e da 031: quadro de 64 × 64, contorno marrom macio, a
 * sombra embaixo e o risquinho de brilho; nada de arco-íris, o raio é a logo do festival.
 */
const C = '#5a3a22';
const L = 'stroke-linejoin="round" stroke-linecap="round"';
const s = (w = 3) => `stroke="${C}" stroke-width="${w}" ${L}`;
const svg = (corpo: string) =>
  `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${corpo}</svg>`;

/** O raio da logo (o mesmo contorno do raio de neon do palco). */
const raio = (cx: number, cy: number, k: number) =>
  [
    [0.1, 1],
    [0.55, 1],
    [0.25, 0.15],
    [0.6, 0.15],
    [-0.25, -1],
    [0.02, -0.1],
    [-0.32, -0.1],
  ]
    .map(([x, y]) => `${(cx + x * k).toFixed(1)},${(cy - y * k).toFixed(1)}`)
    .join(' ');

const estrela5 = (cx: number, cy: number, r: number, ri = r * 0.48) => {
  const p: string[] = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? ri : r;
    p.push(`${(cx + Math.cos(a) * rr).toFixed(1)},${(cy + Math.sin(a) * rr).toFixed(1)}`);
  }
  return p.join(' ');
};

/** Guitarra em V de brinquedo (corpo rosa-choque, braço comprido, estrelinha no corpo). */
/** Guitarra-raio de brinquedo: corpo em raio gordinho rosa-choque, braço grosso e 3 tarraxas grandes. */
const guitarra = (cx: number, cy: number, k = 1, rot = -24) => `
  <g transform="translate(${cx} ${cy}) rotate(${rot}) scale(${k})">
    <path d="M-6 0 L12 0 L2 9 L15 9 L-9 30 L-3 15 L-15 15 Z" fill="#9a1a14" transform="translate(1 3)"/>
    <path d="M-6 0 L12 0 L2 9 L15 9 L-9 30 L-3 15 L-15 15 Z" fill="#e8302a" ${s(2.6)}/>
    <rect x="-3.5" y="-28" width="7" height="30" rx="2" fill="#f2c27a" ${s(2.2)}/>
    <rect x="-5.5" y="-36" width="11" height="10" rx="3" fill="#3d3c48" ${s(2.2)}/>
    <circle cx="-8" cy="-33" r="2.4" fill="#ffd23d" ${s(1.4)}/><circle cx="8" cy="-33" r="2.4" fill="#ffd23d" ${s(1.4)}/><circle cx="8" cy="-28" r="2.4" fill="#ffd23d" ${s(1.4)}/>
    <polygon points="${estrela5(1.5, 12, 3.4)}" fill="#ffe66a"/>
  </g>`;

/** Teclado de brinquedo: corpo azul forte, 5 teclas brancas gordas e 2 pretas. */
const teclado = (cx: number, cy: number, k = 1, rot = -10) => `
  <g transform="translate(${cx} ${cy}) rotate(${rot}) scale(${k})">
    <rect x="-25" y="-9" width="50" height="22" rx="6" fill="#1c49a8"/>
    <rect x="-25" y="-12" width="50" height="22" rx="6" fill="#2f7fff" ${s(2.6)}/>
    <rect x="-20" y="-6" width="40" height="13" rx="2" fill="#fff" ${s(2)}/>
    <path d="M-12 -6 v13 M-4 -6 v13 M4 -6 v13 M12 -6 v13" stroke="${C}" stroke-width="1.8"/>
    <rect x="-9.5" y="-6" width="5" height="8" rx="1" fill="#3d3c48"/><rect x="6.5" y="-6" width="5" height="8" rx="1" fill="#3d3c48"/>
    <circle cx="-19" cy="-9" r="1.6" fill="#ffe66a"/><circle cx="19" cy="-9" r="1.6" fill="#e8302a"/>
  </g>`;

/** O tambor com as duas baquetas em cima (lê como bateria, não como um X). */
const baquetas = (cx: number, cy: number, k = 1) => `
  <g transform="translate(${cx} ${cy}) scale(${k})">
    <path d="M-20 0 V14 Q0 24 20 14 V0" fill="#b82a20" ${s()}/>
    <ellipse cx="0" cy="0" rx="20" ry="8" fill="#fff6e0" ${s()}/>
    <path d="M-20 6 L-8 18 M20 6 L8 18 M-2 10 L2 21" stroke="#ffe66a" stroke-width="2.4" stroke-linecap="round"/>
    <path d="M-4 -4 L-18 -22 M6 -4 L20 -20" stroke="${C}" stroke-width="6.4" stroke-linecap="round"/>
    <path d="M-4 -4 L-18 -22 M6 -4 L20 -20" stroke="#f2c27a" stroke-width="3.4" stroke-linecap="round"/>
  </g>`;

/** A lhama de franja (o bicho grande do festival): pescoço comprido, franja de cabelão. */
const lhama = (feliz = false) => `
  <path d="M14 58 L14 40 Q14 32 24 32 L44 32 Q52 32 52 40 L52 58" fill="#f4e6cf" ${s()}/>
  <path d="M18 58 v-8 M28 58 v-8 M40 58 v-8 M48 58 v-8" stroke="${C}" stroke-width="3" stroke-linecap="round"/>
  <path d="M38 34 Q36 22 38 14" fill="none" stroke="${C}" stroke-width="15" stroke-linecap="round"/>
  <path d="M38 34 Q36 22 38 14" fill="none" stroke="#f4e6cf" stroke-width="10" stroke-linecap="round"/>
  <ellipse cx="40" cy="13" rx="11" ry="9" fill="#f4e6cf" ${s()}/>
  <path d="M33 6 l-2 -6 l5 4 Z M45 6 l2 -6 l-5 4 Z" fill="#f4e6cf" ${s(2)}/>
  <path d="M30 9 Q34 2 40 4 Q46 2 50 9 Q46 8 44 11 Q40 7 36 11 Q34 8 30 9 Z" fill="#2a5ad8" ${s(2)}/>
  <ellipse cx="47" cy="16" rx="5" ry="3.6" fill="#ffd9c4"/>
  ${
    feliz
      ? `<path d="M34 12 q2.4 -3 4.8 0" fill="none" stroke="${C}" stroke-width="2.4" stroke-linecap="round"/>`
      : `<circle cx="36" cy="12" r="2.6" fill="${C}"/><circle cx="36.8" cy="11.2" r="0.9" fill="#fff"/>`
  }
  <path d="M45 19 Q48 21 51 18" fill="none" stroke="${C}" stroke-width="2" stroke-linecap="round"/>
  <path d="M16 40 Q30 36 50 40" fill="none" stroke="#2f8cff" stroke-width="5" stroke-linecap="round"/>
  <path d="M16 40 Q30 36 50 40" fill="none" stroke="#e8302a" stroke-width="2" stroke-dasharray="3 4" stroke-linecap="round"/>`;

/** Caixa de som de palco (preta, tela de pano, dois cones). */
const caixaSom = (acesa: boolean) => `
  <rect x="12" y="8" width="40" height="52" rx="5" fill="#24232b"/>
  <rect x="12" y="5" width="40" height="52" rx="5" fill="#3d3c48" ${s()}/>
  <circle cx="32" cy="20" r="9" fill="#24232b" stroke="${acesa ? '#3a9cff' : '#5a5470'}" stroke-width="3"/>
  <circle cx="32" cy="20" r="3.6" fill="${acesa ? '#bfe0ff' : '#3a3450'}"/>
  <circle cx="32" cy="42" r="12" fill="#24232b" stroke="${acesa ? '#e8302a' : '#5a5470'}" stroke-width="3.4"/>
  <circle cx="32" cy="42" r="4.6" fill="${acesa ? '#ffb4ac' : '#3a3450'}"/>
  <circle cx="18" cy="10" r="1.6" fill="#ffd23d"/><circle cx="46" cy="10" r="1.6" fill="#ffd23d"/>
  ${acesa ? `<path d="M4 18 q-3 6 0 12 M60 18 q3 6 0 12 M2 36 q-3 8 0 16 M62 36 q3 8 0 16" fill="none" stroke="#ffe66a" stroke-width="2.6" stroke-linecap="round"/>` : ''}`;

/** O palco visto de frente (fundo roxo, torres, holofotes), com ou sem a festa. */
const palco = (show: boolean) => `
  <rect x="4" y="40" width="56" height="18" rx="3" fill="#2b2a33" ${s()}/>
  <rect x="4" y="40" width="56" height="5" fill="#e8302a"/>
  <rect x="8" y="12" width="48" height="29" fill="#2b2a33" ${s()}/>
  <path d="M4 8 v34 M60 8 v34 M4 8 h56" stroke="${C}" stroke-width="6" stroke-linecap="round"/>
  <path d="M4 8 v34 M60 8 v34 M4 8 h56" stroke="#b8bcc8" stroke-width="3" stroke-linecap="round"/>
  <polygon points="${raio(31, 26, show ? 12 : 10)}" fill="${show ? '#ffe66a' : '#4a4956'}" stroke="${show ? '#e8302a' : '#3d3c48'}" stroke-width="2.4" ${L}/>
  ${
    show
      ? `<path d="M14 10 L6 40 L22 40 Z" fill="#3a9cff" opacity="0.35"/><path d="M50 10 L42 40 L58 40 Z" fill="#e8302a" opacity="0.35"/>
  <circle cx="14" cy="10" r="3.4" fill="#bfe0ff" ${s(1.8)}/><circle cx="50" cy="10" r="3.4" fill="#ffb4ac" ${s(1.8)}/>
  <rect x="10" y="16" width="4" height="4" fill="#ffe66a" transform="rotate(20 12 18)"/><rect x="48" y="20" width="4" height="4" fill="#2f8cff" transform="rotate(-25 50 22)"/>
  <rect x="22" y="34" width="3.6" height="3.6" fill="#e8302a" transform="rotate(40 24 36)"/><rect x="40" y="14" width="3.6" height="3.6" fill="#2f7fff" transform="rotate(10 42 16)"/>
  <path d="M27 6 l1.6 -4 l1.6 4 l4 1.6 l-4 1.6 l-1.6 4 l-1.6 -4 l-4 -1.6 Z" fill="#fff6c8"/>`
      : `<circle cx="14" cy="10" r="3" fill="#5a5470" ${s(1.8)}/><circle cx="50" cy="10" r="3" fill="#5a5470" ${s(1.8)}/>`
  }`;

/**
 * A lua da noite do show (decisão do dono: o show é só de noite). O céu roxo da Vila Neon, a
 * lua crescente gorda e dormindo, duas estrelinhas: lê como "de noite" a 28 px, sem texto.
 */
const lua = () => `
  <circle cx="32" cy="35" r="27" fill="#241a4a"/>
  <circle cx="32" cy="32" r="27" fill="#4a3c98" ${s()}/>
  <path d="M13 24 Q16 14 25 9.5" fill="none" stroke="#7d6fdc" stroke-width="3" stroke-linecap="round"/>
  <path d="M28.7 17 A17 17 0 1 0 45.15 39.32 A14 14 0 0 1 28.7 17 Z" fill="#ffe28a" ${s(2.8)}/>
  <path d="M19.5 35.5 q3 3 6.2 0" fill="none" stroke="${C}" stroke-width="2.4" stroke-linecap="round"/>
  <ellipse cx="21.5" cy="41.5" rx="3" ry="1.8" fill="#ffab7a"/>
  <polygon points="${estrela5(46, 17, 5.4)}" fill="#fff6c8" ${s(1.6)}/>
  <circle cx="51" cy="30" r="2" fill="#fff6c8"/><circle cx="40" cy="50" r="1.6" fill="#fff6c8"/>`;

/**
 * O patins de quatro rodas (o do suporte do rinque): a bota branca de cano alto com a faixa
 * azul, o freio grafite na ponta e as quatro rodas rosa da pista.
 */
const patins = (cx: number, cy: number, k = 1, rot = -8) => `
  <g transform="translate(${cx} ${cy}) rotate(${rot}) scale(${k})">
    <path d="M-14 -24 H2 V-2 Q14 -2 20 4 Q24 8 22 12 H-16 Q-18 12 -18 8 V-20 Q-18 -24 -14 -24 Z" fill="#dcd8e4" transform="translate(1.5 2.5)"/>
    <path d="M-14 -24 H2 V-2 Q14 -2 20 4 Q24 8 22 12 H-16 Q-18 12 -18 8 V-20 Q-18 -24 -14 -24 Z" fill="#fbfaf6" ${s(2.6)}/>
    <path d="M-18 -16 H2" stroke="#2f8cff" stroke-width="4.4"/>
    <path d="M-6 -2 l4 4 M-1 -2 l4 4" stroke="${C}" stroke-width="1.8" stroke-linecap="round"/>
    <rect x="-20" y="11" width="44" height="5" rx="2.5" fill="#b8bcc8" ${s(2)}/>
    <path d="M22 8 q5 1 5 6 q-3 2 -6 0 Z" fill="#3d3c48" ${s(1.8)}/>
    <circle cx="-13" cy="20" r="5.2" fill="#ff6fb4" ${s(2.2)}/><circle cx="-13" cy="20" r="1.6" fill="#fff"/>
    <circle cx="15" cy="20" r="5.2" fill="#ff6fb4" ${s(2.2)}/><circle cx="15" cy="20" r="1.6" fill="#fff"/>
  </g>`;

/**
 * O arco de neon do rinque (do jeito dos blocos do jogo: dois pilares quadrados grafite e a trave
 * em cima, o tubo de neon azul por dentro e a estrela na trave). Aceso, o neon fica branco-azul,
 * brilha em volta e a estrela acende.
 */
const arcoNeon = (aceso: boolean) => `
  <path d="M4 60 H60" stroke="${C}" stroke-width="3" stroke-linecap="round"/>
  <path d="M8 58 h6 M20 58 h6 M32 58 h6 M44 58 h6" stroke="#ff6fb4" stroke-width="3"/>
  ${aceso ? `<path d="M15 56 V24 Q15 18 21 18 H43 Q49 18 49 24 V56" fill="none" stroke="#8fd0ff" stroke-width="13" opacity="0.38" stroke-linejoin="round"/>` : ''}
  <rect x="7" y="16" width="9" height="42" fill="#3d3c48" ${s(2.6)}/>
  <rect x="48" y="16" width="9" height="42" fill="#3d3c48" ${s(2.6)}/>
  <rect x="5" y="9" width="54" height="10" rx="1.5" fill="#3d3c48" ${s(2.6)}/>
  <path d="M8.5 22 v4 M8.5 32 v4 M8.5 42 v4 M55.5 22 v4 M55.5 32 v4 M55.5 42 v4" stroke="#24232b" stroke-width="1.6"/>
  <path d="M18 56 V24 Q18 21 21 21 H43 Q46 21 46 24 V56" fill="none" stroke="${C}" stroke-width="5.6" stroke-linejoin="round"/>
  <path d="M18 56 V24 Q18 21 21 21 H43 Q46 21 46 24 V56" fill="none" stroke="${aceso ? '#e8f6ff' : '#4a6a9a'}" stroke-width="3" stroke-linejoin="round"/>
  ${aceso ? `<path d="M18 56 V24 Q18 21 21 21 H43 Q46 21 46 24 V56" fill="none" stroke="#3aa8ff" stroke-width="1.2" stroke-linejoin="round"/>` : ''}
  <polygon points="${estrela5(32, 9, 7.6)}" fill="${aceso ? '#ffe14a' : '#6a6878'}" ${s(2)}/>
  ${
    aceso
      ? `<path d="M10 4 l1.2 -3 l1.2 3 l3 1.2 l-3 1.2 l-1.2 3 l-1.2 -3 l-3 -1.2 Z" fill="#fff6c8" ${s(1)}/>
  <path d="M52 3 l1 -2.6 l1 2.6 l2.6 1 l-2.6 1 l-1 2.6 l-1 -2.6 l-2.6 -1 Z" fill="#fff6c8" ${s(1)}/>
  <path d="M2 30 h3 M59 30 h3 M2 42 h3 M59 42 h3" stroke="#8fd0ff" stroke-width="2.4" stroke-linecap="round"/>`
      : ''
  }`;

const BASE: Record<string, string> = {
  // ------------------------------------------------------------ a1: os instrumentos
  a80Guitarra: svg(guitarra(33, 37, 0.92)),
  a80Teclado: svg(teclado(32, 34, 1.1)),
  a80Baquetas: svg(baquetas(32, 38, 1.15)),
  /** O estojo de instrumento (o que fica no chão, brilhando). */
  a80Estojo: svg(`
    <rect x="8" y="22" width="48" height="32" rx="8" fill="#24232b"/>
    <rect x="8" y="18" width="48" height="32" rx="8" fill="#3d3c48" ${s()}/>
    <path d="M24 18 v-6 h16 v6" fill="none" ${s(4)}/>
    <rect x="12" y="31" width="40" height="5" rx="2" fill="#ffd23d" ${s(2)}/>
    <polygon points="${raio(32, 26, 4.5)}" fill="#e8302a"/>
    <path d="M14 22 Q18 20 24 20" stroke="#5a5480" stroke-width="2.6" fill="none" stroke-linecap="round"/>`),
  /** O dedinho que toca (o selo de "tocar"). */
  a80Pegar: svg(`
    <circle cx="30" cy="16" r="11" fill="none" stroke="#ffe66a" stroke-width="3.4" stroke-dasharray="4 4"/>
    <path d="M24 58 Q14 50 15 40 L17 34 Q19 30 23 32 L25 36 L25 16 Q25 11 30 11 Q35 11 35 16 L35 30 Q38 27 42 29 Q45 26 49 29 Q53 28 54 33 L53 44 Q52 52 46 58 Z" fill="#ffd9b8" ${s()}/>
    <path d="M35 30 V38 M43 30 V38" stroke="${C}" stroke-width="2.2" stroke-linecap="round"/>`),
  /** A lupa (achar). */
  a80Lupa: svg(`
    <path d="M40 40 L56 56" stroke="${C}" stroke-width="11" stroke-linecap="round"/>
    <path d="M40 40 L56 56" stroke="#e8302a" stroke-width="6" stroke-linecap="round"/>
    <circle cx="27" cy="27" r="19" fill="#bfeeff" ${s(3.4)}/>
    <circle cx="27" cy="27" r="13" fill="none" stroke="#fff" stroke-width="3" stroke-dasharray="10 40"/>
    <polygon points="${estrela5(27, 28, 8)}" fill="#ffd23d" ${s(1.6)}/>`),
  /** O resultado: a banda pronta no palco (os três instrumentos em cima). */
  a80BandaPronta: svg(`
    <rect x="3" y="44" width="58" height="14" rx="3" fill="#2b2a33" ${s()}/>
    <rect x="3" y="44" width="58" height="4" fill="#e8302a"/>
    ${guitarra(13, 26, 0.55, -10)}
    ${baquetas(32, 34, 0.55)}
    ${teclado(50, 36, 0.4, 0)}
    <path d="M30 6 l1.6 -4 l1.6 4 l4 1.6 l-4 1.6 l-1.6 4 l-1.6 -4 l-4 -1.6 Z" fill="#ffe66a" ${s(1.2)}/>`),
  // ------------------------------------------------------------ a2: capim para as lhamas
  a80Lhama: svg(lhama(false)),
  /** A lhama na grade do show, balançando com as notinhas (o resultado da f2). */
  a80LhamaShow: svg(`
    <g transform="translate(4 2) scale(0.9)">${lhama(true)}</g>
    <path d="M2 60 H62 M6 50 V62 M18 50 V62 M30 50 V62 M42 50 V62 M54 50 V62 M2 52 H62" stroke="${C}" stroke-width="2.6" stroke-linecap="round"/>
    <path d="M10 22 V8 L20 5 V19" fill="none" stroke="#2f8cff" stroke-width="2.6" ${L}/>
    <ellipse cx="7.5" cy="22" rx="3.4" ry="2.6" fill="#2f8cff"/><ellipse cx="17.5" cy="19" rx="3.4" ry="2.6" fill="#2f8cff"/>
    <path d="M56 4 V16" stroke="#e8302a" stroke-width="2.6" stroke-linecap="round"/><ellipse cx="53.5" cy="16.5" rx="3.4" ry="2.6" fill="#e8302a"/>`),
  a80LhamaCoracao: svg(`${lhama(true)}
    <path d="M14 22 C6 16 4 10 8 6 C11 3 14 4 16 7 C18 4 21 3 24 6 C28 10 26 16 18 22 Z" transform="translate(-2 -2)" fill="#ff5a7a" ${s(2.2)}/>`),
  /** O fardo de feno dourado com duas cintas rosa (o mesmo do pastinho). */
  a80Feno: svg(`
    <rect x="8" y="18" width="48" height="38" rx="7" fill="#c9952a"/>
    <rect x="8" y="14" width="48" height="38" rx="7" fill="#f2c94a" ${s()}/>
    <path d="M14 24 h16 M34 30 h16 M14 36 h12 M30 42 h18 M18 46 h10" stroke="#c9952a" stroke-width="2.4" stroke-linecap="round"/>
    <rect x="18" y="13" width="7" height="40" rx="2" fill="#e8302a" ${s(2)}/>
    <rect x="39" y="13" width="7" height="40" rx="2" fill="#e8302a" ${s(2)}/>
    <path d="M10 14 l-4 -6 M16 13 l-1 -7 M50 13 l2 -7 M56 15 l5 -5" stroke="#d9a53a" stroke-width="2.4" stroke-linecap="round"/>`),
  // ------------------------------------------------------------ a3: o grande show
  a80CaixaSom: svg(caixaSom(false)),
  a80CaixaSomAcesa: svg(caixaSom(true)),
  a80Microfone: svg(`
    <path d="M32 40 V58 M22 58 H42" stroke="${C}" stroke-width="6" stroke-linecap="round"/>
    <path d="M32 40 V58 M22 58 H42" stroke="#b8bcc8" stroke-width="3" stroke-linecap="round"/>
    <rect x="25" y="30" width="14" height="14" rx="4" fill="#3d3c48" ${s(2.6)}/>
    <circle cx="32" cy="20" r="13" fill="#c9cdd6" ${s()}/>
    <path d="M23 16 h18 M21 21 h22 M23 26 h18" stroke="#8a8ea0" stroke-width="2"/>
    <path d="M24 13 Q27 9 32 9" stroke="#fff" stroke-width="2.6" fill="none" stroke-linecap="round"/>`),
  a80Palco: svg(palco(false)),
  a80Lua: svg(lua()),
  a80Show: svg(palco(true)),
  // ------------------------------------------------------------ f4: a volta no rinque
  a80PatinsRinque: svg(patins(31, 34, 1.15)),
  /** "Tirar patins" (a roda do menu, só de patins): o patins e a setinha laranja que sai dele. */
  a80TirarPatins: svg(`${patins(27, 40, 0.92, -8)}
    <path d="M36 21 Q40 8 53 9" fill="none" stroke="${C}" stroke-width="8" stroke-linecap="round"/>
    <path d="M47 2 L57 9.5 L46.5 15.5" fill="none" stroke="${C}" stroke-width="8" ${L}/>
    <path d="M36 21 Q40 8 53 9" fill="none" stroke="#ff8a2a" stroke-width="4" stroke-linecap="round"/>
    <path d="M47 2 L57 9.5 L46.5 15.5" fill="none" stroke="#ff8a2a" stroke-width="4" ${L}/>`),
  a80ArcoNeon: svg(arcoNeon(false)),
  a80ArcoAceso: svg(arcoNeon(true)),
  /** O resultado da f4: o patins passando por dentro do arco aceso, com o rastro de vento. */
  a80PatinsArco: svg(`${arcoNeon(true)}
    <path d="M4 40 h10 M2 47 h9 M5 33 h7" stroke="#8fd0ff" stroke-width="2.6" stroke-linecap="round"/>
    ${patins(34, 40, 0.62, -4)}`),
  // ------------------------------------------------------------ banca do festival
  a80Globo: svg(`
    <path d="M32 2 V12" stroke="${C}" stroke-width="3"/>
    <circle cx="32" cy="36" r="23" fill="#9aa2b8" ${s()}/>
    <path d="M10 30 H54 M10 42 H54 M16 20 H48 M16 52 H48 M32 13 V59 M22 15 Q18 36 22 57 M42 15 Q46 36 42 57" stroke="#6a7088" stroke-width="1.6" fill="none"/>
    <rect x="22" y="22" width="8" height="7" fill="#eef2ff"/><rect x="36" y="32" width="6" height="8" fill="#fff"/>
    <rect x="18" y="44" width="6" height="6" fill="#ffb4ac"/><rect x="38" y="46" width="6" height="5" fill="#bfe0ff"/>
    <path d="M52 10 l1.2 -3 l1.2 3 l3 1.2 l-3 1.2 l-1.2 3 l-1.2 -3 l-3 -1.2 Z" fill="#ffe66a"/>`),
  a80Cassete: svg(`
    <rect x="4" y="16" width="56" height="38" rx="5" fill="#24232b"/>
    <rect x="4" y="12" width="56" height="38" rx="5" fill="#e8302a" ${s()}/>
    <rect x="10" y="17" width="44" height="12" rx="2" fill="#fff6e0" ${s(2)}/>
    <path d="M13 23 h22" stroke="#2f7fff" stroke-width="2.4" stroke-linecap="round"/>
    <rect x="16" y="31" width="32" height="12" rx="6" fill="#3d3c48" ${s(2)}/>
    <circle cx="23" cy="37" r="4" fill="#fff6e0"/><circle cx="41" cy="37" r="4" fill="#fff6e0"/>
    <path d="M14 50 L18 44 H46 L50 50" fill="#b8241e" ${s(2)}/>`),
  /** A fita com o lápis no buraquinho (rebobinar com o lápis: o detalhe dos pais). */
  a80CasseteLapis: svg(`
    <rect x="4" y="22" width="44" height="30" rx="4" fill="#24232b"/>
    <rect x="4" y="19" width="44" height="30" rx="4" fill="#e8302a" ${s()}/>
    <rect x="9" y="23" width="34" height="9" rx="2" fill="#fff6e0" ${s(1.8)}/>
    <rect x="12" y="34" width="28" height="10" rx="5" fill="#3d3c48" ${s(1.8)}/>
    <circle cx="18" cy="39" r="3.2" fill="#fff6e0"/><circle cx="34" cy="39" r="3.2" fill="#fff6e0"/>
    <g transform="rotate(-50 34 39)"><rect x="32" y="8" width="5" height="34" rx="1" fill="#ffd23d" ${s(2)}/>
    <path d="M32 8 L34.5 1 L37 8 Z" fill="#f2c27a" ${s(1.6)}/><rect x="32" y="40" width="5" height="4" fill="#ff8fb8" ${s(1.6)}/></g>`),
  a80Radio: svg(`
    <path d="M18 18 V10 Q18 6 22 6 H42 Q46 6 46 10 V18" fill="none" ${s(4)}/>
    <rect x="4" y="18" width="56" height="36" rx="5" fill="#2b2a33"/>
    <rect x="4" y="15" width="56" height="36" rx="5" fill="#c9cdd6" ${s()}/>
    <circle cx="16" cy="36" r="9" fill="#3d3c48" ${s(2)}/><circle cx="48" cy="36" r="9" fill="#3d3c48" ${s(2)}/>
    <circle cx="16" cy="36" r="3.4" fill="#e8302a"/><circle cx="48" cy="36" r="3.4" fill="#e8302a"/>
    <rect x="25" y="28" width="14" height="10" rx="2" fill="#3d3c48" ${s(1.8)}/>
    <circle cx="29" cy="33" r="2" fill="#fff6e0"/><circle cx="35" cy="33" r="2" fill="#fff6e0"/>
    <rect x="10" y="20" width="44" height="4" rx="2" fill="#2f8cff"/>
    <path d="M25 44 h3 M30 44 h3 M35 44 h3" stroke="${C}" stroke-width="2.4" stroke-linecap="round"/>`),
  a80Letreiro: svg(`
    <rect x="6" y="8" width="52" height="48" rx="8" fill="#24232b" ${s()}/>
    <polygon points="${raio(32, 32, 19)}" fill="none" stroke="#e8302a" stroke-width="5" ${L}/>
    <polygon points="${raio(32, 32, 19)}" fill="none" stroke="#ffd0cc" stroke-width="1.6" ${L}/>
    <circle cx="14" cy="16" r="3" fill="#3a9cff"/><circle cx="50" cy="48" r="3" fill="#3a9cff"/>`),
  a80Xadrez: svg(`
    <rect x="6" y="10" width="52" height="48" rx="4" fill="#141018"/>
    <rect x="6" y="6" width="52" height="48" rx="4" fill="#ff6fc4" ${s()}/>
    <path d="M6 6 h13 v12 h-13 Z M32 6 h13 v12 h-13 Z M19 18 h13 v12 h-13 Z M45 18 h13 v12 h-13 Z M6 30 h13 v12 h-13 Z M32 30 h13 v12 h-13 Z M19 42 h13 v12 h-13 Z M45 42 h13 v12 h-13 Z" fill="#2a2440"/>
    <rect x="6" y="6" width="52" height="48" rx="4" fill="none" ${s()}/>`),
  a80Holofote: svg(`
    <path d="M30 26 L60 8 L60 40 Z" fill="#ffe66a" opacity="0.55"/>
    <path d="M10 60 L22 40 L34 60" fill="none" ${s(4)}/>
    <g transform="rotate(-30 22 30)">
      <rect x="6" y="20" width="26" height="22" rx="5" fill="#3d3c48" ${s()}/>
      <ellipse cx="32" cy="31" rx="4.5" ry="11" fill="#fff8c8" ${s(2.4)}/>
    </g>`),
  // ------------------------------------------------------------ fantasias (cartões)
  a80Roqueiro: svg(`
    <path d="M14 30 Q8 46 12 60 L52 60 Q56 46 50 30 Z" fill="#6a3a1a" ${s()}/>
    <rect x="20" y="34" width="24" height="26" rx="4" fill="#2b2a33" ${s()}/>
    <path d="M32 36 L28 46 H34 L30 56" fill="none" stroke="#3a9cff" stroke-width="3" ${L}/>
    <circle cx="22" cy="38" r="1.6" fill="#e6e8f0"/><circle cx="42" cy="38" r="1.6" fill="#e6e8f0"/>
    <rect x="18" y="8" width="28" height="26" rx="7" fill="#f1c9a5" ${s()}/>
    <rect x="16" y="11" width="32" height="5" rx="2" fill="#e8402f" ${s(2)}/>
    <circle cx="26" cy="23" r="2.4" fill="${C}"/><circle cx="38" cy="23" r="2.4" fill="${C}"/>
    <path d="M27 29 Q32 33 37 29" fill="#9a4a3c" ${s(1.8)}/>`),
  a80Dancarina: svg(`
    <rect x="18" y="34" width="28" height="22" rx="5" fill="#ff3fae" ${s()}/>
    <rect x="20" y="50" width="10" height="10" rx="3" fill="#00c2b0" ${s(2)}/><rect x="34" y="50" width="10" height="10" rx="3" fill="#00c2b0" ${s(2)}/>
    <rect x="18" y="8" width="28" height="26" rx="7" fill="#d9a679" ${s()}/>
    <rect x="16" y="13" width="32" height="5" rx="2" fill="#ffe66a" ${s(2)}/>
    <circle cx="26" cy="24" r="2.4" fill="${C}"/><circle cx="38" cy="24" r="2.4" fill="${C}"/>
    <path d="M27 29 Q32 32 37 29" fill="none" stroke="${C}" stroke-width="2" stroke-linecap="round"/>`),
  a80Patins: svg(`
    <path d="M14 10 H36 V34 Q48 34 52 42 V46 H12 Z" fill="#fff6e0" ${s()}/>
    <path d="M14 18 H34 M14 24 H34" stroke="#2f7fff" stroke-width="3"/>
    <rect x="10" y="44" width="44" height="6" rx="2" fill="#3d3c48" ${s(2)}/>
    <circle cx="18" cy="54" r="5.6" fill="#e8302a" ${s(2.4)}/><circle cx="46" cy="54" r="5.6" fill="#e8302a" ${s(2.4)}/>
    <circle cx="18" cy="54" r="1.8" fill="#fff"/><circle cx="46" cy="54" r="1.8" fill="#fff"/>
    <path d="M52 44 l6 4 l-2 4" fill="#ff8a1e" ${s(2)}/>`),
  /** O ouricinho do moicano (o bicho da noite: nunca ataca, o moicano brilha). */
  a80Ourico: svg(`
    <ellipse cx="32" cy="42" rx="22" ry="15" fill="#8a6a52" ${s()}/>
    <path d="M14 34 l-4 -6 l8 2 M20 28 l-2 -8 l7 5 M44 28 l2 -8 l-7 5 M50 34 l4 -6 l-8 2" fill="#6a4a3a" ${s(2)}/>
    <path d="M22 28 Q24 10 32 6 Q40 10 42 28 Z" fill="#e8302a" ${s(2.4)}/>
    <path d="M27 24 Q29 13 32 10 Q35 13 37 24" fill="none" stroke="#ffd0cc" stroke-width="2.4" stroke-linecap="round"/>
    <ellipse cx="32" cy="46" rx="12" ry="8" fill="#f4dcc4"/>
    <circle cx="25" cy="40" r="2.8" fill="${C}"/><circle cx="39" cy="40" r="2.8" fill="${C}"/>
    <circle cx="25.8" cy="39.2" r="1" fill="#fff"/><circle cx="39.8" cy="39.2" r="1" fill="#fff"/>
    <ellipse cx="32" cy="46" rx="3.2" ry="2.4" fill="${C}"/>
    <ellipse cx="20" cy="47" rx="3.6" ry="2" fill="#ff9db4"/><ellipse cx="44" cy="47" rx="3.6" ry="2" fill="#ff9db4"/>`),
};

/** Os 3 da festa de cada missão (o trio de instrumentos da a1, na ordem das bolinhas). */

/** Os nomes que as missões usam (`src/jogo/alma.ts`, f1, f2 e f4) e os do esboço. */
export const ARTE_VILA: Record<string, string> = {
  ...BASE,
  estojoRaio: BASE.a80Estojo,
  lupa: BASE.a80Lupa,
  palcoInstrumentos: BASE.a80BandaPronta,
  teclado: BASE.a80Teclado,
  guitarraRaio: BASE.a80Guitarra,
  baquetas: BASE.a80Baquetas,
  lhama: BASE.a80Lhama,
  feno: BASE.a80Feno,
  lhamaNotinhas: BASE.a80LhamaShow,
  /** A f4, a volta no rinque: o arco apagado, os patins, o arco aceso e os patins passando nele. */
  arcoNeon: BASE.a80ArcoNeon,
  patins: BASE.a80PatinsRinque,
  tirarPatins: BASE.a80TirarPatins,
  arcoAceso: BASE.a80ArcoAceso,
  patinsArco: BASE.a80PatinsArco,
  /** O mundo no baú (as habilidades que a Vila Neon alimenta): o raio sobre o grafite. */
  mundoVila: svg(`
    <rect x="6" y="6" width="52" height="52" rx="12" fill="#2e2d36" ${s()}/>
    <polygon points="${raio(32, 32, 7.5)}" fill="#ffe14a" stroke="#e8302a" stroke-width="2.4" stroke-linejoin="round"/>`),
};
