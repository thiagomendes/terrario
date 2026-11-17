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

/** O fardo de feno dourado com as duas cintas vermelhas (o mesmo do pastinho). */
const fardo = () => `
    <rect x="8" y="18" width="48" height="38" rx="7" fill="#c9952a"/>
    <rect x="8" y="14" width="48" height="38" rx="7" fill="#f2c94a" ${s()}/>
    <path d="M14 24 h16 M34 30 h16 M14 36 h12 M30 42 h18 M18 46 h10" stroke="#c9952a" stroke-width="2.4" stroke-linecap="round"/>
    <rect x="18" y="13" width="7" height="40" rx="2" fill="#e8302a" ${s(2)}/>
    <rect x="39" y="13" width="7" height="40" rx="2" fill="#e8302a" ${s(2)}/>
    <path d="M10 14 l-4 -6 M16 13 l-1 -7 M50 13 l2 -7 M56 15 l5 -5" stroke="#d9a53a" stroke-width="2.4" stroke-linecap="round"/>`;

// ------------------------------------------------------------------ etapa B: as missões do parque

/** A setinha de "vai para lá" (o contorno marrom e a cor por cima): a haste e a ponta. */
const seta = (haste: string, ponta: string, cor = '#3ccf7a') => `
  <path d="${haste}" fill="none" stroke="${C}" stroke-width="8" stroke-linecap="round"/>
  <path d="${ponta}" fill="none" stroke="${C}" stroke-width="8" ${L}/>
  <path d="${haste}" fill="none" stroke="${cor}" stroke-width="4" stroke-linecap="round"/>
  <path d="${ponta}" fill="none" stroke="${cor}" stroke-width="4" ${L}/>`;

/** O coração (o mesmo da lhama feliz), com o meio em (cx, cy). */
const coracao = (cx: number, cy: number, k = 1) => `
  <path d="M0 9 C-8 3 -10 -3 -6 -7 C-3 -10 0 -9 2 -6 C4 -9 7 -10 10 -7 C14 -3 12 3 4 9 Q2 10.4 0 9 Z" transform="translate(${cx - 2 * k} ${cy}) scale(${k})" fill="#ff5a7a" ${s(2.2)}/>`;

/** A faísca de quatro pontas (o brilhinho de "pronto"). */
const faisca = (cx: number, cy: number, k = 1) => `
  <path d="M0 -6 l1.6 4.4 l4.4 1.6 l-4.4 1.6 l-1.6 4.4 l-1.6 -4.4 l-4.4 -1.6 l4.4 -1.6 Z" transform="translate(${cx} ${cy}) scale(${k})" fill="#ffe66a" ${s(1.2)}/>`;

/** O balão de brinquedo (o meio em cx, cy): o corpo, o nozinho e o risquinho de brilho. */
const balaoSolto = (cx: number, cy: number, k = 1, cor = '#e8302a', sombra = '#b3221c') => `
  <g transform="translate(${cx} ${cy}) scale(${k})">
    <path d="M-4.5 23 L0 16 L4.5 23 Z" fill="${cor}" ${s(2.2)}/>
    <ellipse cx="0" cy="1.5" rx="15.5" ry="18" fill="${sombra}"/>
    <ellipse cx="0" cy="0" rx="15.5" ry="18" fill="${cor}" ${s()}/>
    <path d="M-9 -7 Q-7 -12 -1 -13" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity="0.9"/>
  </g>`;

/** O fio do balão, de (x, y) para baixo, em duas voltinhas. */
const fio = (x: number, y: number, h: number) =>
  `<path d="M${x} ${y} q-5 ${h * 0.25} 0 ${h * 0.5} q5 ${h * 0.25} 0 ${h * 0.5}" fill="none" stroke="${C}" stroke-width="2.2" stroke-linecap="round"/>`;

/** O contorno do bilhete (os dois picotes de lado). */
const BILHETE =
  'M8 16 H56 Q60 16 60 20 V27 A5 5 0 0 0 60 37 V44 Q60 48 56 48 H8 Q4 48 4 44 V37 A5 5 0 0 0 4 27 V20 Q4 16 8 16 Z';
/** As tintas dos três carimbos (roda, cavalinho, carrinho): nunca em ordem de arco-íris. */
const TINTAS = ['#2f7fff', '#e8302a', '#f29a16'] as const;

/** O bilhete do parque: em branco (três lugares de carimbo) ou carimbado, com a faísca. */
const bilhete = (carimbado: boolean) => `
  <g transform="rotate(-8 32 32)">
    <path d="${BILHETE}" fill="#c9952a" transform="translate(0 3)"/>
    <path d="${BILHETE}" fill="#fff1d6" ${s()}/>
    <path d="M17.5 18 V46" stroke="${C}" stroke-width="2" stroke-dasharray="2.6 3.2" stroke-linecap="round"/>
    <polygon points="${estrela5(11.6, 32.6, 3.8)}" fill="#e8302a"/>
    ${[26.5, 39.5, 52]
      .map((x, k) =>
        carimbado
          ? `<circle cx="${x}" cy="32" r="5.6" fill="${TINTAS[k]}" ${s(1.8)}/><circle cx="${x}" cy="32" r="2.2" fill="#fff8ea"/>`
          : `<circle cx="${x}" cy="32" r="5.4" fill="#fffdf6" stroke="#a8804a" stroke-width="2.2" stroke-dasharray="3 2.2"/>`,
      )
      .join('')}
  </g>
  ${carimbado ? faisca(52, 12, 1.25) + faisca(9, 54, 0.8) : ''}`;

/** O carimbo redondo de tinta (o aro e o desenho do brinquedo na mesma tinta). */
const carimbo = (cor: string, miolo: string) => `
  <circle cx="32" cy="35" r="27" fill="#d9b77a"/>
  <circle cx="32" cy="32" r="27" fill="#fff8ea" ${s()}/>
  <circle cx="32" cy="32" r="21.5" fill="none" stroke="${cor}" stroke-width="3.2"/>
  ${miolo}`;

/** O cocho de madeira, vazio ou com o feno (as pernas em X, as tábuas, o fundo escuro). */
const cocho = (feno: boolean) => `
  <path d="M15 40 L9 59 M23 40 L28 59 M49 40 L55 59 M41 40 L36 59" stroke="${C}" stroke-width="7.5" stroke-linecap="round"/>
  <path d="M15 40 L9 59 M23 40 L28 59 M49 40 L55 59 M41 40 L36 59" stroke="#8a5a30" stroke-width="3.6" stroke-linecap="round"/>
  ${
    feno
      ? `<path d="M10 24 Q12 10 22 13 Q27 4 35 10 Q44 5 47 14 Q56 13 54 24 Z" fill="#f2c94a" ${s()}/>
  <path d="M19 19 l3 -5 M30 17 l1 -6 M41 19 l3 -5 M25 22 h8 M38 22 h7" stroke="#c9952a" stroke-width="2.2" stroke-linecap="round"/>`
      : ''
  }
  <path d="M4 22 H60 L54 44 H10 Z" fill="#8a5a30" transform="translate(0 2.5)"/>
  <path d="M4 22 H60 L54 44 H10 Z" fill="#c98a4a" ${s()}/>
  ${feno ? '' : `<path d="M9 23.5 H55 L53.4 29 H10.6 Z" fill="#6e4424"/>`}
  <path d="M8 32.5 H56" stroke="#8a5a30" stroke-width="2.4" stroke-linecap="round"/>
  <circle cx="13" cy="27" r="1.5" fill="#6e4424"/><circle cx="51" cy="27" r="1.5" fill="#6e4424"/>
  <circle cx="15" cy="38.5" r="1.5" fill="#6e4424"/><circle cx="49" cy="38.5" r="1.5" fill="#6e4424"/>`;

/**
 * A lhama de pelúcia (a prenda): sentadinha, creme, as orelhas em pé, o cachecol vermelho e a
 * mantinha azul; a costura pontilhada diz que é de pano.
 */
const pelucia = () => `
  <path d="M12 60 Q7 45 20 40 H44 Q57 45 52 60 Z" fill="#f4e6cf" ${s()}/>
  <path d="M10.6 50 Q32 44.4 53.4 50 L53.6 57 Q32 51.4 10.4 57 Z" fill="#2f8cff" ${s(2.2)}/>
  <path d="M14.6 53.6 Q32 48.2 49.4 53.6" fill="none" stroke="#fff7e6" stroke-width="1.8" stroke-dasharray="2.6 3" stroke-linecap="round"/>
  <ellipse cx="22" cy="59.6" rx="7" ry="3.6" fill="#fff7e6" ${s(2.4)}/><ellipse cx="42" cy="59.6" rx="7" ry="3.6" fill="#fff7e6" ${s(2.4)}/>
  <rect x="24" y="15" width="16" height="29" rx="7" fill="#f4e6cf" ${s()}/>
  <path d="M36.5 36 L38.6 48.4 L45.8 46.6 L43 35 Z" fill="#e8302a" ${s(2.2)}/>
  <rect x="20.5" y="31.6" width="23" height="7.8" rx="3.9" fill="#e8302a" ${s(2.4)}/>
  <ellipse cx="24.6" cy="6" rx="3" ry="6" transform="rotate(-16 24.6 6)" fill="#f4e6cf" ${s(2.4)}/>
  <ellipse cx="39.4" cy="6" rx="3" ry="6" transform="rotate(16 39.4 6)" fill="#f4e6cf" ${s(2.4)}/>
  <ellipse cx="32" cy="16" rx="12.5" ry="10.5" fill="#f4e6cf" ${s()}/>
  <path d="M26.4 8.4 Q28.6 3.6 32 6 Q35.4 3.6 37.6 8.4 Q34.6 7.6 32 9.8 Q29.4 7.6 26.4 8.4 Z" fill="#fff7e6" ${s(1.8)}/>
  <ellipse cx="32" cy="20.6" rx="5.8" ry="4.2" fill="#fff7e6"/>
  <path d="M30.5 19 h3 l-1.5 1.9 Z" fill="${C}"/>
  <path d="M29.4 22.4 Q32 24.2 34.6 22.4" fill="none" stroke="${C}" stroke-width="1.6" stroke-linecap="round"/>
  <circle cx="25.6" cy="15" r="2.3" fill="${C}"/><circle cx="38.4" cy="15" r="2.3" fill="${C}"/>
  <circle cx="26.3" cy="14.3" r="0.85" fill="#fff"/><circle cx="39.1" cy="14.3" r="0.85" fill="#fff"/>
  <ellipse cx="22.6" cy="19.8" rx="2.5" ry="1.5" fill="#ffb4a8"/><ellipse cx="41.4" cy="19.8" rx="2.5" ry="1.5" fill="#ffb4a8"/>`;

/**
 * A vovó (o rosto do boneco do jogo): o cabelo grisalho de coque, os óculos redondos, as
 * bochechas e o sorriso; a gola do casaquinho lilás. `feliz`: de olhinhos fechados.
 */
const vovo = (feliz = false) => `
  <circle cx="32" cy="9.5" r="8" fill="#d6d3de" ${s(2.6)}/>
  <path d="M27.5 8 Q32 4.6 36.5 8" fill="none" stroke="#f4f2f8" stroke-width="2" stroke-linecap="round"/>
  <path d="M13 62 Q14 52 24 51 H40 Q50 52 51 62 Z" fill="#b9a2e6" ${s()}/>
  <path d="M27 51.5 L32 58 L37 51.5 Z" fill="#fbf3e0" ${s(1.8)}/>
  <rect x="13" y="16" width="38" height="37" rx="11" fill="#f1c9a5" ${s()}/>
  <path d="M13 30 Q11 14 32 14 Q53 14 51 30 Q46 21 32 21 Q18 21 13 30 Z" fill="#d6d3de" ${s(2.6)}/>
  <ellipse cx="18.6" cy="43.6" rx="3.6" ry="2.2" fill="#ff9d94"/><ellipse cx="45.4" cy="43.6" rx="3.6" ry="2.2" fill="#ff9d94"/>
  <circle cx="24" cy="35" r="6.6" fill="#fff" fill-opacity="0.45" ${s(2.2)}/><circle cx="40" cy="35" r="6.6" fill="#fff" fill-opacity="0.45" ${s(2.2)}/>
  <path d="M30.6 34.4 Q32 33 33.4 34.4" fill="none" stroke="${C}" stroke-width="2.2" stroke-linecap="round"/>
  ${
    feliz
      ? `<path d="M21 35.6 q3 -3.4 6 0 M37 35.6 q3 -3.4 6 0" fill="none" stroke="${C}" stroke-width="2.2" stroke-linecap="round"/>`
      : `<circle cx="24" cy="35.2" r="2.3" fill="${C}"/><circle cx="40" cy="35.2" r="2.3" fill="${C}"/>
  <circle cx="24.8" cy="34.4" r="0.8" fill="#fff"/><circle cx="40.8" cy="34.4" r="0.8" fill="#fff"/>`
  }
  <path d="M25.6 45 Q32 50.6 38.4 45" fill="none" stroke="${C}" stroke-width="2.4" stroke-linecap="round"/>`;

/** A argola caída no pino (a base de madeira, o pino amarelo e a argola vermelha em volta). */
const argola = () => `
  <ellipse cx="32" cy="54.5" rx="22" ry="6.5" fill="#8a5a30"/>
  <ellipse cx="32" cy="52" rx="22" ry="6.5" fill="#c98a4a" ${s()}/>
  <ellipse cx="32" cy="41" rx="19" ry="7.5" fill="none" stroke="${C}" stroke-width="9.5"/>
  <ellipse cx="32" cy="41" rx="19" ry="7.5" fill="none" stroke="#e8302a" stroke-width="5"/>
  <rect x="27" y="13" width="10" height="40" rx="5" fill="#ffd23d" ${s()}/>
  <path d="M30 18 V30" stroke="#fff6c8" stroke-width="2.2" stroke-linecap="round"/>
  <path d="M13 41 A19 7.5 0 0 0 51 41" fill="none" stroke="${C}" stroke-width="9.5" stroke-linecap="round"/>
  <path d="M13 41 A19 7.5 0 0 0 51 41" fill="none" stroke="#e8302a" stroke-width="5" stroke-linecap="round"/>
  <path d="M18 44.6 Q24 47.6 30 48" fill="none" stroke="#ffb4ac" stroke-width="1.8" stroke-linecap="round"/>
  <path d="M12 20 l-5 -4 M52 20 l5 -4 M32 7 v-5" stroke="#ffe66a" stroke-width="2.8" stroke-linecap="round"/>`;

/** O peixinho de brinquedo pescado: a linha, o ímã vermelho, a argolinha e as gotinhas. */
const peixinho = () => `
  <path d="M34 1 V11" stroke="${C}" stroke-width="2.4" stroke-linecap="round"/>
  <path d="M27 10 H41 V22 H36.5 V15.5 H31.5 V22 H27 Z" fill="#e8302a" ${s(2.2)}/>
  <path d="M27 19 h4.5 M36.5 19 H41" stroke="#e6e8f0" stroke-width="3"/>
  <circle cx="34" cy="26.5" r="3.6" fill="none" stroke="${C}" stroke-width="4.4"/>
  <circle cx="34" cy="26.5" r="3.6" fill="none" stroke="#d4d8e2" stroke-width="2"/>
  <path d="M19 42 L5 30 Q9 42 5 54 Z" fill="#ffb02a" ${s(2.6)}/>
  <ellipse cx="35" cy="44.5" rx="21" ry="13" fill="#d96a12"/>
  <ellipse cx="35" cy="42" rx="21" ry="13" fill="#ff8a2a" ${s()}/>
  <path d="M26 36 Q33 28.6 42 35" fill="none" stroke="#ffd0a0" stroke-width="2.6" stroke-linecap="round"/>
  <path d="M29 47 q5 5 10 0" fill="#ffb02a" ${s(2)}/>
  <circle cx="46" cy="39.5" r="4.4" fill="#fff" ${s(1.8)}/><circle cx="47" cy="39.8" r="2" fill="${C}"/>
  <path d="M48 47.4 q3 1 5 -1.6" fill="none" stroke="${C}" stroke-width="2" stroke-linecap="round"/>
  <path d="M12 12 q-3.4 5 0 6.6 q3.4 -1.6 0 -6.6 Z M56 20 q-3 4.4 0 5.8 q3 -1.4 0 -5.8 Z" fill="#8fe0f6" ${s(1.4)}/>`;

/** A mãozinha fechada que segura (o fio do balão passa por dentro). */
const punho = (cx: number, cy: number, k = 1) => `
  <g transform="translate(${cx} ${cy}) scale(${k})">
    <path d="M-12 14 V-2 Q-12 -9 -5 -9 H8 Q14 -9 14 -3 V6 Q14 14 6 14 Z" fill="#ffd9b8" ${s()}/>
    <path d="M-12 1 Q-18 0 -18 -6 Q-17 -11 -11 -9" fill="#ffd9b8" ${s()}/>
    <path d="M-4 -9 V-1 M3 -9 V-1 M9 -8 V-1" stroke="${C}" stroke-width="2.2" stroke-linecap="round"/>
  </g>`;

/** A fita de vídeo (grafite, o rótulo creme com um risco vermelho e um azul, os dois carretéis). */
const fitaVideo = () => `
  <rect x="3" y="17" width="58" height="36" rx="5" fill="#24232b"/>
  <rect x="3" y="13" width="58" height="36" rx="5" fill="#3d3c48" ${s()}/>
  <rect x="9" y="17.5" width="46" height="11" rx="2" fill="#fff6e0" ${s(2)}/>
  <path d="M13 21.4 h24" stroke="#e8302a" stroke-width="2.6" stroke-linecap="round"/>
  <path d="M13 25.4 h15" stroke="#2f7fff" stroke-width="2.6" stroke-linecap="round"/>
  <rect x="12" y="31.5" width="40" height="13.5" rx="3" fill="#24232b" ${s(2)}/>
  <circle cx="21.5" cy="38.2" r="4.6" fill="#fff6e0"/><circle cx="42.5" cy="38.2" r="4.6" fill="#fff6e0"/>
  <circle cx="21.5" cy="38.2" r="1.6" fill="#3d3c48"/><circle cx="42.5" cy="38.2" r="1.6" fill="#3d3c48"/>
  <rect x="28.5" y="34" width="7" height="8.4" rx="1.4" fill="#8a8ea0"/>
  <path d="M7 16 Q10 14.6 16 14.8" fill="none" stroke="#6a6878" stroke-width="2" stroke-linecap="round"/>`;

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
  a80Feno: svg(fardo()),
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
  /**
   * "Sair do brinquedo" (a roda do menu, só sentado num brinquedo do parque): a cadeirinha
   * vermelha de toldinho creme e a setinha laranja que sai dela.
   */
  a80SairBrinquedo: svg(`
    <path d="M12 18 V30 M36 18 V30" stroke="${C}" stroke-width="3" stroke-linecap="round"/>
    <rect x="6" y="11" width="36" height="9" rx="3" fill="#fff1d6" ${s()}/>
    <rect x="15" y="11" width="9" height="9" fill="#e8302a"/><rect x="33" y="11" width="6" height="9" fill="#e8302a"/>
    <rect x="6" y="11" width="36" height="9" rx="3" fill="none" ${s()}/>
    <path d="M6 30 H42 V50 Q42 56 36 56 H12 Q6 56 6 50 Z" fill="#e8302a" ${s()}/>
    <rect x="6" y="36" width="36" height="6" fill="#fff1d6"/>
    <path d="M6 30 H42 V50 Q42 56 36 56 H12 Q6 56 6 50 Z" fill="none" ${s()}/>
    <path d="M40 27 Q46 14 57 16" fill="none" stroke="${C}" stroke-width="8" stroke-linecap="round"/>
    <path d="M51 8 L60 16.5 L49.5 22" fill="none" stroke="${C}" stroke-width="8" ${L}/>
    <path d="M40 27 Q46 14 57 16" fill="none" stroke="#ff8a2a" stroke-width="4" stroke-linecap="round"/>
    <path d="M51 8 L60 16.5 L49.5 22" fill="none" stroke="#ff8a2a" stroke-width="4" ${L}/>`),
  /**
   * As dicas de toque (o suporte dos patins e os brinquedos do parque): os patins com a setinha
   * verde que entra ("calçar") e a cadeirinha com a setinha verde que entra ("andar").
   */
  a80CalcarPatins: svg(`${patins(27, 40, 0.92, -8)}
    <path d="M56 5 Q44 6 39 21" fill="none" stroke="${C}" stroke-width="8" stroke-linecap="round"/>
    <path d="M33 12 L38.5 22.5 L49 18.5" fill="none" stroke="${C}" stroke-width="8" ${L}/>
    <path d="M56 5 Q44 6 39 21" fill="none" stroke="#3ccf7a" stroke-width="4" stroke-linecap="round"/>
    <path d="M33 12 L38.5 22.5 L49 18.5" fill="none" stroke="#3ccf7a" stroke-width="4" ${L}/>`),
  a80SentarBrinquedo: svg(`
    <path d="M12 22 V32 M36 22 V32" stroke="${C}" stroke-width="3" stroke-linecap="round"/>
    <rect x="6" y="15" width="36" height="9" rx="3" fill="#fff1d6" ${s()}/>
    <rect x="15" y="15" width="9" height="9" fill="#e8302a"/><rect x="33" y="15" width="6" height="9" fill="#e8302a"/>
    <rect x="6" y="15" width="36" height="9" rx="3" fill="none" ${s()}/>
    <path d="M6 32 H42 V52 Q42 58 36 58 H12 Q6 58 6 52 Z" fill="#e8302a" ${s()}/>
    <rect x="6" y="38" width="36" height="6" fill="#fff1d6"/>
    <path d="M6 32 H42 V52 Q42 58 36 58 H12 Q6 58 6 52 Z" fill="none" ${s()}/>
    <path d="M60 8 Q50 9 46 24" fill="none" stroke="${C}" stroke-width="8" stroke-linecap="round"/>
    <path d="M40 15 L45.5 25.5 L56 21.5" fill="none" stroke="${C}" stroke-width="8" ${L}/>
    <path d="M60 8 Q50 9 46 24" fill="none" stroke="#3ccf7a" stroke-width="4" stroke-linecap="round"/>
    <path d="M40 15 L45.5 25.5 L56 21.5" fill="none" stroke="#3ccf7a" stroke-width="4" ${L}/>`),
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
  // ------------------------------------------------------------ f5: o bilhete do parque
  bilhete: svg(bilhete(false)),
  bilheteCarimbado: svg(bilhete(true)),
  /** O carimbo de qualquer brinquedo (a bolinha da missão): a estrela na tinta vermelha. */
  carimbo: svg(
    carimbo(TINTAS[1], `<polygon points="${estrela5(32, 32.6, 12.5)}" fill="${TINTAS[1]}"/>`),
  ),
  carimboRoda: svg(
    carimbo(
      TINTAS[0],
      `<path d="M32 30 L24.5 46.5 M32 30 L39.5 46.5 M21 47 H43" fill="none" stroke="${TINTAS[0]}" stroke-width="3" ${L}/>
    <circle cx="32" cy="29" r="11" fill="none" stroke="${TINTAS[0]}" stroke-width="3"/>
    <path d="M32 18 V40 M21 29 H43" stroke="${TINTAS[0]}" stroke-width="1.8"/>
    <circle cx="43" cy="29" r="2.7" fill="${TINTAS[0]}"/><circle cx="37.5" cy="38.5" r="2.7" fill="${TINTAS[0]}"/>
    <circle cx="26.5" cy="38.5" r="2.7" fill="${TINTAS[0]}"/><circle cx="21" cy="29" r="2.7" fill="${TINTAS[0]}"/>
    <circle cx="26.5" cy="19.5" r="2.7" fill="${TINTAS[0]}"/><circle cx="37.5" cy="19.5" r="2.7" fill="${TINTAS[0]}"/>
    <circle cx="32" cy="29" r="2.6" fill="${TINTAS[0]}"/>`,
    ),
  ),
  carimboCavalinho: svg(
    carimbo(
      TINTAS[1],
      `<path d="M32 15 V50" stroke="${TINTAS[1]}" stroke-width="2.4" stroke-linecap="round"/>
    <circle cx="32" cy="14" r="2.2" fill="${TINTAS[1]}"/>
    <ellipse cx="30.5" cy="34" rx="9.6" ry="5.8" fill="${TINTAS[1]}"/>
    <path d="M35 33 L38.5 22 L46.4 24.6 L45.2 28.8 L41.4 28.4 L41 35.5 Z M38.6 22.6 l0.4 -4.6 l3.6 3.4 Z" fill="${TINTAS[1]}" stroke="${TINTAS[1]}" stroke-width="1.2" ${L}/>
    <path d="M24 37 l-3.6 6.4 M28.6 39 l-1 7 M35 39 l2.6 6.4 M39 36.4 l5 4 M21.6 32.6 q-5 1.6 -3.6 8" fill="none" stroke="${TINTAS[1]}" stroke-width="3" ${L}/>
    <rect x="27.4" y="29.6" width="6.4" height="4" rx="1.4" fill="#fff8ea"/>`,
    ),
  ),
  carimboCarrinho: svg(
    carimbo(
      TINTAS[2],
      `<path d="M41 31 V17" stroke="${TINTAS[2]}" stroke-width="2.6" stroke-linecap="round"/>
    <polygon points="${estrela5(41, 15.6, 4.6)}" fill="${TINTAS[2]}"/>
    <circle cx="29" cy="26.4" r="4.2" fill="${TINTAS[2]}"/>
    <path d="M17 41 Q17 30.5 27 30.5 H39 Q47 30.5 47 41 Z" fill="${TINTAS[2]}"/>
    <rect x="22" y="34.4" width="20" height="2.6" rx="1.3" fill="#fff8ea"/>
    <rect x="13.5" y="41.4" width="37" height="6.6" rx="3.3" fill="${TINTAS[2]}"/>`,
    ),
  ),
  // ------------------------------------------------------------ f6: os balões fugidos
  /** O balão preso na copa da árvore (a árvore de blocos do jogo, o balão enroscado no canto). */
  balaoPreso: svg(`
    <rect x="25" y="46" width="10" height="16" fill="#8a5a3a" ${s()}/>
    <path d="M4 51 V34 H10 V25 H19 V19 H38 V25 H47 V34 H53 V51 Z" fill="#2c7a3c" transform="translate(0 3)"/>
    <path d="M4 51 V34 H10 V25 H19 V19 H38 V25 H47 V34 H53 V51 Z" fill="#46a84e" ${s()}/>
    <path d="M11 31 h7 v6 h-7 Z M19 41 h7 v6 h-7 Z M38 43 h8 v5 h-8 Z" fill="#6cc76a"/>
    ${fio(46, 36, 16)}
    ${balaoSolto(45, 17.5, 0.82)}
    <path d="M30 27 h9 v8 h-9 Z" fill="#46a84e" ${s(2.2)}/>`),
  /**
   * Um balão com o fio (a bolinha e a plaquinha da f6). O nome não é `balao`: esse já é o balão
   * de fala do presente do nível 6 (`arte.ts`), e os desenhos da Vila entram por cima dos outros.
   */
  balaoParque: svg(`${fio(32, 46, 16)}${balaoSolto(32, 22, 1.1)}`),
  /** O balão na mão (o resultado da f6): a mãozinha segura o fio. */
  balaoNaMao: svg(`
    <path d="M33 36 V44" stroke="${C}" stroke-width="2.2" stroke-linecap="round"/>
    ${balaoSolto(33, 17, 0.88)}
    ${punho(34, 50.5, 0.88)}
    ${faisca(54, 38, 1.1)}${faisca(10, 30, 0.8)}`),
  // ------------------------------------------------------------ f7: o lanche das lhamas
  cocho: svg(cocho(false)),
  /** A lhama feliz diante do cocho cheio de feno, com o coraçãozinho (o resultado da f7). */
  lhamaComendo: svg(`
    <g transform="translate(-7 13) scale(0.78)">${lhama(true)}</g>
    <g transform="translate(28 31) scale(0.55)">${cocho(true)}</g>
    ${coracao(51, 14, 1.05)}`),
  // ------------------------------------------------------------ f8: a prenda para a vovó
  pelucia: svg(pelucia()),
  argola: svg(argola()),
  peixinho: svg(peixinho()),
  vovo: svg(vovo()),
  /** A vovó abraçada na lhama de pelúcia, com o coração (o resultado da f8). */
  vovoPresente: svg(`
    <g transform="translate(-3 -2) scale(0.76)">${vovo(true)}</g>
    <g transform="translate(25 27) scale(0.58)">${pelucia()}</g>
    <path d="M9 45 Q13 60 34 58" fill="none" stroke="${C}" stroke-width="11" stroke-linecap="round"/>
    <path d="M9 45 Q13 60 34 58" fill="none" stroke="#b9a2e6" stroke-width="6.4" stroke-linecap="round"/>
    <circle cx="36.5" cy="57.6" r="4.4" fill="#f1c9a5" ${s(2)}/>
    ${coracao(52, 13, 1.1)}`),
  // ------------------------------------------------------------ as dicas de toque da etapa B
  /** "Toque para pegar": o balão, a setinha verde que desce e a mãozinha que espera. */
  dicaPegarBalao: svg(`${fio(23, 42, 16)}${balaoSolto(23, 20, 0.92)}
    ${seta('M49 7 V33', 'M40 27 L49 38 L58 27')}
    ${punho(50, 52, 0.62)}`),
  /** "Toque para pegar": o fardo de feno e a setinha verde até a mão. */
  dicaFeno: svg(`
    <g transform="translate(-2 20) scale(0.64)">${fardo()}</g>
    ${seta('M22 21 Q32 5 47 19', 'M38 17 L48 23.5 L52 12.5')}
    ${punho(49, 46, 0.72)}`),
  /** "Toque para dar": o feno e a setinha verde para dentro do cocho. */
  dicaCocho: svg(`
    <g transform="translate(1 0) scale(0.44)">${fardo()}</g>
    <g transform="translate(17 27) scale(0.6)">${cocho(false)}</g>
    ${seta('M30 12 Q43 12 43 29', 'M34 23.5 L43 34.5 L52 23.5')}`),
  dicaArgola: svg(argola()),
  dicaPescaria: svg(peixinho()),
  /** O fone do orelhão (de brinquedo, azul), o fio enroladinho e os risquinhos de "trim". */
  dicaTelefone: svg(`
    <path d="M13 49 q-7 2 -4 7 q4 5 9 1 q4 -3 8 0 q3 3 7 1" fill="none" stroke="${C}" stroke-width="2.6" stroke-linecap="round"/>
    <g transform="rotate(-38 32 32)">
      <rect x="7" y="22" width="16" height="23" rx="6" fill="#2f8cff" ${s()}/>
      <rect x="41" y="22" width="16" height="23" rx="6" fill="#2f8cff" ${s()}/>
      <rect x="7" y="16" width="50" height="13" rx="6.5" fill="#2f8cff" ${s()}/>
      <rect x="9.6" y="24" width="10.8" height="6" fill="#2f8cff"/><rect x="43.6" y="24" width="10.8" height="6" fill="#2f8cff"/>
      <path d="M13 20.4 H49" stroke="#9cc8ff" stroke-width="2.6" stroke-linecap="round"/>
      <path d="M11.5 38 h7 M11.5 41.4 h7 M45.5 38 h7 M45.5 41.4 h7" stroke="#1c5fc0" stroke-width="1.8" stroke-linecap="round"/>
    </g>
    <path d="M47 7 l2 -5 M55 12 l5 -3 M58 21 l5 1" stroke="#ffe66a" stroke-width="3" stroke-linecap="round"/>`),
  dicaFita: svg(fitaVideo()),
  /** A vitamina da lanchonete: o copo alto, a espuma branca e os dois canudos. */
  dicaVitamina: svg(`
    <ellipse cx="32" cy="59.6" rx="14" ry="3" fill="#d9b77a"/>
    <path d="M27 15 L21 3" stroke="${C}" stroke-width="6.4" stroke-linecap="round"/>
    <path d="M27 15 L21 3" stroke="#e8302a" stroke-width="3.2" stroke-linecap="round"/>
    <path d="M37 15 L45 4" stroke="${C}" stroke-width="6.4" stroke-linecap="round"/>
    <path d="M37 15 L45 4" stroke="#2f7fff" stroke-width="3.2" stroke-linecap="round"/>
    <path d="M19 17 H45 L42 53 Q41.6 58 37 58 H27 Q22.4 58 22 53 Z" fill="#ff9ec4" ${s()}/>
    <path d="M26.4 27 L27.6 48" stroke="#ffd3e6" stroke-width="3.2" stroke-linecap="round"/>
    <path d="M17 14 Q17 9.4 22 10.4 Q26 5.4 32 9.4 Q38 5.4 42 10.4 Q47 9.4 47 14.4 Q47 20.4 42 20.4 H22 Q17 20.4 17 14 Z" fill="#fff6ee" ${s()}/>`),
  /** A revista da banca (inventada, sem letras): a faixa do título, a estrela e as chamadas. */
  dicaRevista: svg(`
    <g transform="rotate(-8 32 32)">
      <rect x="14" y="10" width="40" height="50" rx="3" fill="#d9b77a"/>
      <rect x="11" y="6" width="40" height="50" rx="3" fill="#2f8cff" ${s()}/>
      <path d="M14.6 9 V53" stroke="#1c5fc0" stroke-width="2.6" stroke-linecap="round"/>
      <rect x="18" y="10.5" width="29" height="8" rx="2" fill="#ffe14a" ${s(1.8)}/>
      <polygon points="${estrela5(32.5, 33.5, 10.5)}" fill="#fff6e0" ${s(2)}/>
      <rect x="18" y="47.4" width="12" height="4" rx="2" fill="#e8302a"/><rect x="33" y="47.4" width="14" height="4" rx="2" fill="#fff6e0"/>
    </g>`),
  // ------------------------------------------------------------ as dicas da Casa anos 80 (parte 3)
  /** "Toque para trocar o canal": a TV de madeira com antena, o sol na tela e a setinha que gira. */
  dicaTv: svg(`
    <path d="M26 15 L18 4 M38 15 L46 4" stroke="${C}" stroke-width="2.6" stroke-linecap="round"/>
    <circle cx="18" cy="4" r="2.4" fill="#d4d8e2" ${s(1.6)}/><circle cx="46" cy="4" r="2.4" fill="#d4d8e2" ${s(1.6)}/>
    <rect x="6" y="14" width="52" height="40" rx="6" fill="#8a5530" ${s()}/>
    <rect x="11" y="19" width="33" height="30" rx="5" fill="#5ec8ff" ${s(2.2)}/>
    <circle cx="27.5" cy="31" r="6.5" fill="#ffd23a" ${s(1.8)}/>
    <path d="M11 43 Q20 37 28 42 T44 41 V49 H11 Z" fill="#4cb84a"/>
    <circle cx="51" cy="25" r="3" fill="#d4d8e2" ${s(1.6)}/><circle cx="51" cy="35" r="3" fill="#d4d8e2" ${s(1.6)}/>
    <path d="M48 44 h6 M48 47 h6" stroke="${C}" stroke-width="1.6" stroke-linecap="round"/>
    <rect x="14" y="54" width="6" height="4" fill="#5e3820"/><rect x="44" y="54" width="6" height="4" fill="#5e3820"/>`),
  /** "Toque para pôr a fita": a fita de vídeo e a setinha verde para dentro da boca do aparelho. */
  dicaVideocassete: svg(`
    <g transform="translate(14 -6) scale(0.56)">${fitaVideo()}</g>
    ${seta('M32 26 V40', 'M25 34 L32 42 L39 34')}
    <rect x="6" y="42" width="52" height="16" rx="3" fill="#c9ccd4" ${s()}/>
    <rect x="13" y="47" width="22" height="4" rx="1.5" fill="#24232a"/>
    <rect x="42" y="47" width="9" height="4" rx="1" fill="#5aff8a"/>`),
  /** O disco: o vinil preto de rótulo vermelho e as notinhas. */
  dicaDisco: svg(`
    <circle cx="28" cy="36" r="22" fill="#1c1c22" ${s()}/>
    <circle cx="28" cy="36" r="16" fill="none" stroke="#3a3a44" stroke-width="1.6"/>
    <circle cx="28" cy="36" r="10.5" fill="none" stroke="#3a3a44" stroke-width="1.6"/>
    <circle cx="28" cy="36" r="7" fill="#e8302a" ${s(1.8)}/><circle cx="28" cy="36" r="1.6" fill="#f6f4ee"/>
    <path d="M46 8 V22 M46 8 L56 6 V19" stroke="${C}" stroke-width="2.6" stroke-linecap="round" fill="none"/>
    <ellipse cx="43" cy="22" rx="4" ry="3" fill="#ffd23a" ${s(1.8)}/><ellipse cx="53" cy="19" rx="4" ry="3" fill="#ffd23a" ${s(1.8)}/>`),
  /** "Toque para sentar": o sofá xadrez de três lugares. */
  dicaSofa: svg(`
    <rect x="8" y="16" width="48" height="22" rx="6" fill="#b8562e" ${s()}/>
    <rect x="4" y="30" width="56" height="20" rx="6" fill="#b8562e" ${s()}/>
    <path d="M20 18 V48 M44 18 V48 M8 40 H56" stroke="#6a3a20" stroke-width="3"/>
    <path d="M23 18 V48 M47 18 V48 M8 43.5 H56" stroke="#f2e2bd" stroke-width="1.2"/>
    <rect x="9" y="50" width="5" height="6" fill="#5e3820"/><rect x="50" y="50" width="5" height="6" fill="#5e3820"/>`),
  /** O ioiô vermelho no fio, descendo. */
  dicaIoio: svg(`
    <path d="M32 3 V30" stroke="${C}" stroke-width="2.2" stroke-linecap="round"/>
    <circle cx="32" cy="42" r="15" fill="#e8302a" ${s()}/>
    <circle cx="32" cy="42" r="9" fill="#ff6a5a"/><path d="M17 42 H47" stroke="#f6f4ee" stroke-width="3.2"/>
    <circle cx="32" cy="42" r="3" fill="#f6f4ee" ${s(1.6)}/>
    <path d="M51 30 a10 10 0 0 1 0 22" stroke="#3ccf7a" stroke-width="3" fill="none" stroke-linecap="round"/>`),
  /** O pião de listras, rodando (os risquinhos em volta). */
  dicaPiao: svg(`
    <path d="M32 6 V14" stroke="#8a5530" stroke-width="5" stroke-linecap="round"/>
    <path d="M10 22 Q32 12 54 22 L34 54 Q32 58 30 54 Z" fill="#e8302a" ${s()}/>
    <path d="M14 28 Q32 21 50 28 M19 36 Q32 31 45 36" stroke="#f2e2bd" stroke-width="3.4" fill="none"/>
    <path d="M4 40 q4 -4 8 0 M52 40 q4 -4 8 0" stroke="#3ccf7a" stroke-width="2.6" fill="none" stroke-linecap="round"/>`),
  /** O cubo de cores 2 × 2 (três cores), com a face de cima girando. */
  dicaCubo: svg(`
    <path d="M12 22 L32 12 L52 22 L32 32 Z" fill="#ffd23a" ${s(2.4)}/>
    <path d="M12 22 L32 32 V56 L12 46 Z" fill="#e8302a" ${s(2.4)}/>
    <path d="M52 22 L32 32 V56 L52 46 Z" fill="#2f6fd8" ${s(2.4)}/>
    <path d="M22 17 L42 27 M42 17 L22 27 M22 27 V51 M12 34 L32 44 L52 34 M42 27 V51" stroke="${C}" stroke-width="1.8"/>
    <path d="M6 14 q6 -9 16 -9" stroke="#3ccf7a" stroke-width="3" fill="none" stroke-linecap="round"/>
    <path d="M18 2 L23 5 L18 9" stroke="#3ccf7a" stroke-width="3" fill="none" stroke-linecap="round"/>`),
  /** O robô de lata andando (prateado, o painel vermelho e os olhos amarelos). */
  dicaRobo: svg(`
    <path d="M32 6 V13" stroke="${C}" stroke-width="2.4"/><circle cx="32" cy="5" r="3" fill="#e8302a" ${s(1.6)}/>
    <rect x="20" y="13" width="24" height="17" rx="3" fill="#d4d8e2" ${s()}/>
    <rect x="25" y="18" width="5" height="4" fill="#ffe14a"/><rect x="34" y="18" width="5" height="4" fill="#ffe14a"/>
    <rect x="16" y="30" width="32" height="18" rx="3" fill="#c8ccd6" ${s()}/>
    <rect x="23" y="34" width="18" height="8" rx="2" fill="#e8302a"/>
    <rect x="21" y="48" width="8" height="10" fill="#9aa0ae" ${s(2)}/><rect x="35" y="46" width="8" height="10" fill="#9aa0ae" ${s(2)}/>
    <path d="M8 58 h6 M50 56 h6" stroke="#3ccf7a" stroke-width="3" stroke-linecap="round"/>`),
  /** "Toque para pegar": o baú azul de tampa amarela, com o ioiô e o pião saindo. */
  dicaBau: svg(`
    <circle cx="23" cy="20" r="8" fill="#e8302a" ${s(2.2)}/><path d="M15 20 H31" stroke="#f6f4ee" stroke-width="2"/>
    <path d="M36 12 Q45 8 54 12 L46 28 Z" fill="#ffd23a" ${s(2.2)}/>
    <rect x="8" y="30" width="48" height="26" rx="4" fill="#4a8ad8" ${s()}/>
    <rect x="6" y="25" width="52" height="8" rx="3" fill="#f2c230" ${s()}/>
    <polygon points="${estrela5(32, 44, 7)}" fill="#f2c230" ${s(1.6)}/>`),
  /** "Toque para pegar": o skate turquesa e a setinha verde que sobe para a mão. */
  pegarSkate: svg(`
    <rect x="6" y="38" width="52" height="9" rx="4.5" fill="#22c2b0" ${s()}/>
    <circle cx="16" cy="52" r="4.2" fill="#ffd23a" ${s(2)}/><circle cx="48" cy="52" r="4.2" fill="#ffd23a" ${s(2)}/>
    <path d="M10 40 L6 34 M54 40 L58 34" stroke="${C}" stroke-width="2.6" stroke-linecap="round"/>
    ${seta('M32 32 V10', 'M24 17 L32 7 L40 17')}`),
  /** "Toque para guardar": o skate e a setinha laranja que desce para o suporte. */
  guardarSkate: svg(`
    <rect x="6" y="20" width="52" height="9" rx="4.5" fill="#22c2b0" ${s()}/>
    <circle cx="16" cy="34" r="4.2" fill="#ffd23a" ${s(2)}/><circle cx="48" cy="34" r="4.2" fill="#ffd23a" ${s(2)}/>
    ${seta('M32 40 V58', 'M24 51 L32 60 L40 51', '#ff8a2a')}`),
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
  sairBrinquedo: BASE.a80SairBrinquedo,
  calcarPatins: BASE.a80CalcarPatins,
  sentarBrinquedo: BASE.a80SentarBrinquedo,
  arcoAceso: BASE.a80ArcoAceso,
  patinsArco: BASE.a80PatinsArco,
  /** O mundo no baú (as habilidades que a Vila Neon alimenta): o raio sobre o grafite. */
  mundoVila: svg(`
    <rect x="6" y="6" width="52" height="52" rx="12" fill="#2e2d36" ${s()}/>
    <polygon points="${raio(32, 32, 7.5)}" fill="#ffe14a" stroke="#e8302a" stroke-width="2.4" stroke-linejoin="round"/>`),
};
