/**
 * Spec 031: os desenhos das missões do Doce Reino (feitos aqui, à mão, no jeito da 023: quadro
 * de 64 × 64, contorno marrom macio de 3, a sombra mais escura embaixo, o risquinho de brilho em
 * cima; nada de arco-íris). O cartão do quadro mostra à esquerda o que fazer e à direita o
 * resultado (o bicho com coração, o bolo com a vela acesa), nunca o mesmo desenho.
 */
const C = '#5a3a22';
const L = 'stroke-linejoin="round" stroke-linecap="round"';
const s = (w = 3) => `stroke="${C}" stroke-width="${w}" ${L}`;
const svg = (corpo: string) =>
  `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${corpo}</svg>`;
const brilho = (d: string, w = 3) =>
  `<path d="${d}" fill="none" stroke="#fff" stroke-width="${w}" stroke-linecap="round" opacity="0.85"/>`;

/** O coraçãozinho (o bicho que comeu). */
const coracao = (
  cx: number,
  cy: number,
  k = 1,
) => `<g transform="translate(${cx} ${cy}) scale(${k})">
    <path d="M0 9 C-10 2 -11 -4 -7.5 -7.5 C-4.5 -10 -1.5 -8.5 0 -5.5 C1.5 -8.5 4.5 -10 7.5 -7.5 C11 -4 10 2 0 9 Z" fill="#ff5a7a" ${s(2.4)}/>
    <path d="M-6 -4.5 Q-5 -6.8 -2.8 -6.8" fill="none" stroke="#ffd0da" stroke-width="2" stroke-linecap="round"/>
  </g>`;

/** A estrelinha de brilho (o resultado bom). */
const faisca = (cx: number, cy: number, r = 4, cor = '#ffe27a') =>
  `<path d="M${cx} ${cy - r} Q${cx + r * 0.22} ${cy - r * 0.22} ${cx + r} ${cy} Q${cx + r * 0.22} ${cy + r * 0.22} ${cx} ${cy + r} Q${cx - r * 0.22} ${cy + r * 0.22} ${cx - r} ${cy} Q${cx - r * 0.22} ${cy - r * 0.22} ${cx} ${cy - r} Z" fill="${cor}" stroke="#e6a21e" stroke-width="1.4" ${L}/>`;

/** A ovelha de marshmallow (corpinho de travesseiro, carinha de morango). */
function ovelha(feliz: boolean): string {
  const olhos = feliz
    ? `<path d="M15.5 31.5 Q18 28.5 20.5 31.5 M23.5 31.5 Q26 28.5 28.5 31.5" fill="none" stroke="${C}" stroke-width="2.4" stroke-linecap="round"/>`
    : `<circle cx="18" cy="31" r="2.6" fill="${C}"/><circle cx="26" cy="31" r="2.6" fill="${C}"/>
       <circle cx="18.8" cy="30.2" r="0.9" fill="#fff"/><circle cx="26.8" cy="30.2" r="0.9" fill="#fff"/>`;
  return `
    <ellipse cx="34" cy="57" rx="24" ry="3.6" fill="#e2c99b"/>
    <rect x="17" y="44" width="7" height="12" rx="3.5" fill="#7a4a2a" ${s(2.4)}/>
    <rect x="40" y="44" width="7" height="12" rx="3.5" fill="#7a4a2a" ${s(2.4)}/>
    <path d="M12 40 Q4 38 6 30 Q4 22 12 20 Q14 12 22 14 Q28 8 36 12 Q44 8 50 14 Q58 14 58 22 Q62 30 56 36 Q58 46 48 46 L16 46 Q8 46 12 40 Z" fill="#fffaf4" ${s()}/>
    <path d="M30 18 Q40 14 50 19" fill="none" stroke="#f3dcc0" stroke-width="4" stroke-linecap="round"/>
    <path d="M36 40 Q46 42 52 36" fill="none" stroke="#f3dcc0" stroke-width="4" stroke-linecap="round"/>
    <ellipse cx="22" cy="33" rx="11" ry="10" fill="#ff8fa8" ${s()}/>
    ${olhos}
    <path d="M19 37 Q22 39.5 25 37" fill="none" stroke="${C}" stroke-width="2" stroke-linecap="round"/>
    <path d="M15 26 l-1 -2 M22 24 v-2.4 M29 26 l1 -2" stroke="#ffe0e8" stroke-width="2" stroke-linecap="round"/>
    ${brilho('M16 20 Q20 15.5 26 15.5', 2.6)}`;
}

/** O bolo (2 × 2 de chocolate e de chantilly) visto um pouco de cima; `fantasma`: em azul. */
function bolo(fantasma: boolean): string {
  if (fantasma) {
    // os blocos azuis da obra (os fantasmas de verdade do jogo): contorno claro e tracejado
    const f =
      'fill="#8fd8ff" fill-opacity="0.55" stroke="#ffffff" stroke-width="2.6" stroke-dasharray="5 3.4" stroke-linejoin="round"';
    return `
    <ellipse cx="32" cy="58" rx="26" ry="4" fill="#e2c99b"/>
    <rect x="9" y="37" width="46" height="19" rx="3" ${f}/>
    <path d="M32 37 V56" stroke="#fff" stroke-width="2.2" stroke-dasharray="4 3"/>
    <rect x="9" y="21" width="46" height="16" rx="3" ${f}/>
    <path d="M32 21 V37" stroke="#fff" stroke-width="2.2" stroke-dasharray="4 3"/>
    <rect x="28.5" y="7" width="7" height="14" rx="2.5" ${f}/>
    <rect x="9" y="37" width="46" height="19" rx="3" fill="none" stroke="#3f9ad8" stroke-width="1.4" opacity="0.6"/>
    <rect x="9" y="21" width="46" height="16" rx="3" fill="none" stroke="#3f9ad8" stroke-width="1.4" opacity="0.6"/>`;
  }
  return `
    <ellipse cx="32" cy="58" rx="27" ry="4" fill="#e2c99b"/>
    <rect x="9" y="37" width="46" height="19" rx="4" fill="#8a4a2a" ${s()}/>
    <path d="M9 42 H55" stroke="#6a3418" stroke-width="2.4"/>
    <circle cx="18" cy="49" r="1.8" fill="#ffd9e2"/><circle cx="30" cy="47.5" r="1.8" fill="#fff3c4"/>
    <circle cx="42" cy="50" r="1.8" fill="#ffd9e2"/><circle cx="50" cy="47" r="1.6" fill="#fff3c4"/>
    <rect x="9" y="21" width="46" height="17" rx="4" fill="#fff6f2" ${s()}/>
    <path d="M9 27 Q13.5 33 18 27 Q22.5 33 27 27 Q31.5 33 36 27 Q40.5 33 45 27 Q50 33 55 27" fill="none" stroke="#ff9db4" stroke-width="3.4" stroke-linecap="round"/>
    ${brilho('M16 24.5 Q22 23 28 23.5', 2.4)}`;
}

/** A vela de aniversário (com a chama acesa e o halo). */
const vela = (acesa: boolean) => `
    <rect x="28.5" y="11" width="7" height="11" rx="2.5" fill="#ff8fa8" ${s(2.2)}/>
    <path d="M28.5 15 L35.5 13 M28.5 19.5 L35.5 17.5" stroke="#fff" stroke-width="1.8"/>
    ${
      acesa
        ? `<circle cx="32" cy="6.5" r="6.2" fill="#ffe27a" opacity="0.45"/>
    <path d="M32 1.5 Q36.2 6 32 10.2 Q27.8 6 32 1.5 Z" fill="#ffc93d" stroke="#e8902a" stroke-width="1.6"/>
    <path d="M32 4.8 Q33.5 6.8 32 8.6 Q30.5 6.8 32 4.8 Z" fill="#fff6c8"/>`
        : ''
    }`;

/** O saco de confeitar (o selinho de montar o bolo): cone de pano, bico e o chantilly saindo. */
const sacoConfeitar = `
    <g transform="rotate(38 32 32)">
      <path d="M18 6 Q32 2 46 6 L35 44 Q32 47 29 44 Z" fill="#ff9db4" ${s()}/>
      <path d="M17 6 Q32 0 47 6 Q48 11 46 12 Q32 8 18 12 Q16 11 17 6 Z" fill="#fff6f2" ${s(2.6)}/>
      <path d="M22 16 Q26 30 30 40" fill="none" stroke="#ffd0da" stroke-width="3" stroke-linecap="round"/>
      <path d="M29 44 L35 44 L34 51 L30 51 Z" fill="#c9cdd6" ${s(2.4)}/>
    </g>
    <path d="M8 60 Q6 55 11 54 Q10 49 16 50 Q21 48 22 53 Q27 53 25 60 Z" fill="#fff6f2" ${s(2.4)}/>
    <path d="M12 56 Q16 54 20 56" fill="none" stroke="#ff9db4" stroke-width="2" stroke-linecap="round"/>`;

/** As camadas do bolo (as bolinhas do progresso da e1): chocolate, chantilly, a vela. */
const camadaChocolate = `
    <rect x="8" y="22" width="48" height="24" rx="5" fill="#8a4a2a" ${s()}/>
    <path d="M8 29 H56" stroke="#6a3418" stroke-width="2.6"/>
    <circle cx="20" cy="38" r="2.4" fill="#ffd9e2"/><circle cx="34" cy="37" r="2.4" fill="#fff3c4"/><circle cx="46" cy="39" r="2.4" fill="#ffd9e2"/>`;
const camadaChantilly = `
    <rect x="8" y="22" width="48" height="24" rx="5" fill="#fff6f2" ${s()}/>
    <path d="M8 30 Q14 38 20 30 Q26 38 32 30 Q38 38 44 30 Q50 37 56 30" fill="none" stroke="#ff9db4" stroke-width="4" stroke-linecap="round"/>`;
const velaSo = `
    <circle cx="32" cy="14" r="9" fill="#ffe27a" opacity="0.5"/>
    <path d="M32 6 Q38.5 13 32 19 Q25.5 13 32 6 Z" fill="#ffc93d" stroke="#e8902a" stroke-width="2"/>
    <rect x="26" y="22" width="12" height="32" rx="4" fill="#ff8fa8" ${s()}/>
    <path d="M26 30 L38 26 M26 40 L38 36 M26 50 L38 46" stroke="#fff" stroke-width="2.6"/>`;

/** O broto-doce: duas folhinhas cor-de-rosa brilhando num cabinho de menta (não é o capim). */
const brotoDoce = `
    <ellipse cx="32" cy="57" rx="18" ry="3.6" fill="#e2c99b"/>
    <path d="M14 56 Q16 44 32 44 Q48 44 50 56 Z" fill="#7a4424" ${s()}/>
    <circle cx="24" cy="51" r="1.6" fill="#fff3c4"/><circle cx="38" cy="50" r="1.6" fill="#bdf0ff"/><circle cx="31" cy="53" r="1.4" fill="#ffd0e4"/>
    <path d="M32 45 Q31 34 32 26" fill="none" stroke="${C}" stroke-width="7.5" stroke-linecap="round"/>
    <path d="M32 45 Q31 34 32 26" fill="none" stroke="#7fdcb8" stroke-width="3.6" stroke-linecap="round"/>
    <path d="M32 28 Q20 30 12 20 Q14 8 24 10 Q32 13 32 28 Z" fill="#ff8fb8" ${s()}/>
    <path d="M32 28 Q44 30 52 20 Q50 8 40 10 Q32 13 32 28 Z" fill="#ff8fb8" ${s()}/>
    <path d="M30 26 Q22 22 17 15 M34 26 Q42 22 47 15" fill="none" stroke="#ff6fa3" stroke-width="2.2" stroke-linecap="round"/>
    ${brilho('M16 15 Q19 11 24 12', 2.6)}${brilho('M43 12 Q47 11 49 14', 2.4)}`;

export const ARTE_CANTO: Record<string, string> = {
  boloFantasma: svg(bolo(true)),
  boloAceso: svg(`${bolo(false)}${vela(true)}${faisca(52, 10, 4)}${faisca(12, 12, 3.2)}`),
  ovelha: svg(ovelha(false)),
  ovelhaCoracao: svg(`${ovelha(true)}${coracao(50, 9, 1.05)}${faisca(8, 10, 3.2)}`),
  brotoDoce: svg(brotoDoce),
  sacoConfeitar: svg(sacoConfeitar),
  camadaChocolate: svg(camadaChocolate),
  camadaChantilly: svg(camadaChantilly),
  velaAcesa: svg(velaSo),
};
