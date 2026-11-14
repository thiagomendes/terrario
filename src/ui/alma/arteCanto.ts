/**
 * Spec 031: os desenhos das missões da Era dos Dinos e do Doce Reino (feitos aqui, à mão, no
 * jeito da 023: quadro de 64 × 64, contorno marrom macio de 3, a sombra mais escura embaixo, o
 * risquinho de brilho em cima; nada de arco-íris). O cartão do quadro mostra à esquerda o que
 * fazer e à direita o resultado (o ovinho na mochila, o bicho com coração, o osso fora da rocha,
 * o bolo com a vela acesa), nunca o mesmo desenho.
 */
const C = '#5a3a22';
const L = 'stroke-linejoin="round" stroke-linecap="round"';
const s = (w = 3) => `stroke="${C}" stroke-width="${w}" ${L}`;
const svg = (corpo: string) =>
  `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${corpo}</svg>`;
const brilho = (d: string, w = 3) =>
  `<path d="${d}" fill="none" stroke="#fff" stroke-width="${w}" stroke-linecap="round" opacity="0.85"/>`;

/** O ovinho de dino: creme, pintas verdes de dois tons, sombra embaixo e o brilho de cima. */
function ovo(cx: number, cy: number, k = 1, giro = 0): string {
  return `<g transform="translate(${cx} ${cy}) rotate(${giro}) scale(${k})">
    <ellipse cx="0" cy="2.4" rx="11.5" ry="14" fill="#d9c08a"/>
    <path d="M0 -14 C8 -14 11.5 -4 11.5 3 C11.5 10 6.5 14 0 14 C-6.5 14 -11.5 10 -11.5 3 C-11.5 -4 -8 -14 0 -14 Z" fill="#fff4dc" ${s(2.6)}/>
    <ellipse cx="-4.6" cy="-4" rx="2.8" ry="2.4" fill="#7cc35a"/>
    <ellipse cx="4.8" cy="2.5" rx="3.3" ry="2.8" fill="#5aa83f"/>
    <ellipse cx="-3.2" cy="8" rx="2.3" ry="1.9" fill="#7cc35a"/>
    <ellipse cx="4" cy="-8.6" rx="1.8" ry="1.5" fill="#5aa83f"/>
    <ellipse cx="-7.6" cy="3.4" rx="1.4" ry="1.7" fill="#5aa83f"/>
    <path d="M-6 -9 Q-4 -12 -1 -12.6" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/>
  </g>`;
}

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

/** O ninho de gravetos (tigela baixa, trançado em duas voltas). */
function ninho(cx: number, cy: number, larg = 26): string {
  const a = larg;
  // os gravetos trançados na borda (risquinhos cruzados, claro e escuro)
  let tranca = '';
  for (let i = 0; i < 12; i++) {
    const t = (i / 12) * Math.PI * 2;
    const x = cx + Math.cos(t) * (a - 2);
    const y = cy - 4 + Math.sin(t) * 5;
    const d = i % 2 ? 1 : -1;
    tranca += `<path d="M${(x - 4).toFixed(1)} ${(y - d * 1.6).toFixed(1)} L${(x + 4).toFixed(1)} ${(y + d * 1.6).toFixed(1)}" stroke="${i % 2 ? '#e2b06e' : '#7a4a22'}" stroke-width="2.2" stroke-linecap="round"/>`;
  }
  return `
    <ellipse cx="${cx}" cy="${cy + 9}" rx="${a + 2}" ry="5" fill="#7a4a22" opacity="0.3"/>
    <path d="M${cx - a} ${cy - 4} Q${cx - a + 2} ${cy + 10} ${cx} ${cy + 10} Q${cx + a - 2} ${cy + 10} ${cx + a} ${cy - 4} Z" fill="#8c5a2c" ${s()}/>
    <path d="M${cx - a + 4} ${cy + 1} Q${cx - 8} ${cy - 1} ${cx + 4} ${cy + 5} M${cx - 8} ${cy + 7} Q${cx + 6} ${cy + 2} ${cx + a - 4} ${cy + 2} M${cx - a + 7} ${cy + 6} Q${cx - 10} ${cy + 4} ${cx - 3} ${cy + 9}" fill="none" stroke="#5e3618" stroke-width="2.2" stroke-linecap="round"/>
    <path d="M${cx - 2} ${cy + 3} Q${cx + 8} ${cy + 1} ${cx + 14} ${cy + 7}" fill="none" stroke="#c4914f" stroke-width="2.2" stroke-linecap="round"/>
    <ellipse cx="${cx}" cy="${cy - 4}" rx="${a}" ry="6.5" fill="#b07a42" ${s()}/>
    <ellipse cx="${cx}" cy="${cy - 3.6}" rx="${a - 6}" ry="3.4" fill="#e6b04a" stroke="#8c5a2c" stroke-width="1.6"/>
    ${tranca}
    <path d="M${cx - a + 2} ${cy - 6} L${cx - a - 5} ${cy - 11} M${cx + a - 3} ${cy - 7} L${cx + a + 4} ${cy - 12} M${cx + 6} ${cy - 10} L${cx + 9} ${cy - 15}" stroke="${C}" stroke-width="2.4" stroke-linecap="round"/>
    <path d="M${cx - a - 5} ${cy - 11} l-1 -3 M${cx + a + 4} ${cy - 12} l3 -2" stroke="${C}" stroke-width="2" stroke-linecap="round"/>
    <ellipse cx="${cx - a + 6}" cy="${cy - 9}" rx="4.4" ry="1.8" fill="#7cc35a" stroke="${C}" stroke-width="1.6" transform="rotate(-25 ${cx - a + 6} ${cy - 9})"/>`;
}

/** A cabecinha do pescoçudo (o filhote verde de placas laranja), virada para a direita. */
function pescocudo(feliz: boolean): string {
  const olho = feliz
    ? `<path d="M31 13.5 Q34.5 10 38 13.5" fill="none" stroke="${C}" stroke-width="2.8" stroke-linecap="round"/>`
    : `<circle cx="34.5" cy="13.5" r="4.2" fill="${C}"/><circle cx="36" cy="12" r="1.5" fill="#fff"/>`;
  return `
    <path d="M10 62 Q10 42 22 35 Q30 30 30 21" fill="none" stroke="${C}" stroke-width="15.5" stroke-linecap="round"/>
    <path d="M10 62 Q10 42 22 35 Q30 30 30 21" fill="none" stroke="#7cc35a" stroke-width="10" stroke-linecap="round"/>
    <path d="M13 58 Q13 46 20 40" fill="none" stroke="#a6e07e" stroke-width="3" stroke-linecap="round"/>
    <path d="M16 45 l-7 -3 l2 7 Z M22 37 l-5 -6 l-1.5 7.5 Z" fill="#ff9a30" ${s(2)}/>
    <ellipse cx="38" cy="19" rx="17" ry="13" fill="#86cc64" ${s()}/>
    <ellipse cx="47.5" cy="23" rx="9" ry="6.5" fill="#a2dc7e"/>
    ${olho}
    <ellipse cx="33" cy="23" rx="3.6" ry="2.2" fill="#ff9db4"/>
    <path d="M44 26 Q49 28.5 53.5 25" fill="none" stroke="${C}" stroke-width="2.2" stroke-linecap="round"/>
    <circle cx="51" cy="19" r="1.2" fill="#3e7a2e"/>
    <path d="M30 7.5 l3.5 -5 l3.5 5 Z" fill="#ff9a30" ${s(1.8)}/>
    ${brilho('M27 12 Q30 8 35 7.5', 2.4)}`;
}

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

/** A rocha com o osso dentro (cinza de basalto, o osso creme aparecendo). */
const rocha = (osso: boolean) => `
    <rect x="6" y="16" width="52" height="42" rx="8" fill="#5c5a62"/>
    <rect x="6" y="12" width="52" height="42" rx="8" fill="#8a8890" ${s()}/>
    <path d="M12 20 l6 4 M44 46 l6 -3 M48 18 l4 4 M14 44 l3 5" stroke="#6c6a72" stroke-width="2.6" stroke-linecap="round"/>
    ${brilho('M12 17 Q20 15 28 15.5', 2.4)}
    ${
      osso
        ? `<g transform="rotate(-24 32 33)">
      <rect x="17" y="29" width="30" height="9" rx="4" fill="#fff6e0" ${s(2.4)}/>
      <circle cx="16" cy="28.5" r="5.4" fill="#fff6e0" ${s(2.4)}/><circle cx="16" cy="38.5" r="5.4" fill="#fff6e0" ${s(2.4)}/>
      <circle cx="48" cy="28.5" r="5.4" fill="#fff6e0" ${s(2.4)}/><circle cx="48" cy="38.5" r="5.4" fill="#fff6e0" ${s(2.4)}/>
      <rect x="18" y="30.2" width="28" height="6.6" fill="#fff6e0"/>
    </g>`
        : ''
    }`;

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
    <rect x="12" y="21" width="40" height="16" rx="3" ${f}/>
    <path d="M32 21 V37" stroke="#fff" stroke-width="2.2" stroke-dasharray="4 3"/>
    <rect x="28.5" y="7" width="7" height="14" rx="2.5" ${f}/>
    <rect x="9" y="37" width="46" height="19" rx="3" fill="none" stroke="#3f9ad8" stroke-width="1.4" opacity="0.6"/>
    <rect x="12" y="21" width="40" height="16" rx="3" fill="none" stroke="#3f9ad8" stroke-width="1.4" opacity="0.6"/>`;
  }
  return `
    <ellipse cx="32" cy="58" rx="27" ry="4" fill="#e2c99b"/>
    <rect x="9" y="37" width="46" height="19" rx="4" fill="#8a4a2a" ${s()}/>
    <path d="M9 42 H55" stroke="#6a3418" stroke-width="2.4"/>
    <circle cx="18" cy="49" r="1.8" fill="#ffd9e2"/><circle cx="30" cy="47.5" r="1.8" fill="#fff3c4"/>
    <circle cx="42" cy="50" r="1.8" fill="#ffd9e2"/><circle cx="50" cy="47" r="1.6" fill="#fff3c4"/>
    <rect x="12" y="21" width="40" height="17" rx="4" fill="#fff6f2" ${s()}/>
    <path d="M12 27 Q16 33 20 27 Q24 33 28 27 Q32 33 36 27 Q40 33 44 27 Q48 32 52 27" fill="none" stroke="#ff9db4" stroke-width="3.4" stroke-linecap="round"/>
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

/** O feixe de capim-dourado (o selinho da comida dos pescoçudos). */
const capimDourado = `
    <path d="M32 58 L20 18 M32 58 L28 12 M32 58 L36 12 M32 58 L44 18 M32 58 L14 26 M32 58 L50 26" fill="none" stroke="${C}" stroke-width="6.5" stroke-linecap="round"/>
    <path d="M32 58 L20 18 M32 58 L28 12 M32 58 L36 12 M32 58 L44 18 M32 58 L14 26 M32 58 L50 26" fill="none" stroke="#e8b83a" stroke-width="3" stroke-linecap="round"/>
    <ellipse cx="20" cy="16" rx="3.6" ry="7" fill="#ffd45a" ${s(2.2)} transform="rotate(-18 20 16)"/>
    <ellipse cx="28" cy="10" rx="3.6" ry="7" fill="#ffd45a" ${s(2.2)} transform="rotate(-6 28 10)"/>
    <ellipse cx="36" cy="10" rx="3.6" ry="7" fill="#ffd45a" ${s(2.2)} transform="rotate(6 36 10)"/>
    <ellipse cx="44" cy="16" rx="3.6" ry="7" fill="#ffd45a" ${s(2.2)} transform="rotate(18 44 16)"/>
    <rect x="23" y="38" width="18" height="8" rx="3" fill="#d9553a" ${s(2.4)}/>
    <path d="M26 41 H38" stroke="#ff9a7a" stroke-width="2" stroke-linecap="round"/>`;

/** O pincel de paleontólogo (o selinho de escavar). */
const pincel = `
    <path d="M42 6 L56 20 L30 46 L18 34 Z" fill="#c98a4a" ${s()}/>
    <path d="M45 12 L50 17" stroke="#e8b47a" stroke-width="2.6" stroke-linecap="round"/>
    <path d="M18 34 L30 46 L28 48 L16 36 Z" fill="#c9cdd6" ${s(2.4)}/>
    <path d="M16 36 L28 48 L16 58 Q8 60 6 56 Q4 52 8 48 Z" fill="#f2d27a" ${s()}/>
    <path d="M10 52 L15 47 M12 56 L19 49" stroke="#c9a43a" stroke-width="2" stroke-linecap="round"/>`;

/** A mochila (a do jogo) com os 3 ovinhos aparecendo em cima: "estão comigo". */
const mochilaOvos = `
    <ellipse cx="32" cy="59" rx="22" ry="3.6" fill="#e2c99b"/>
    ${ovo(20, 20, 0.62, -16)}${ovo(44, 20, 0.62, 16)}${ovo(32, 16, 0.7, 0)}
    <path d="M22 26 Q22 20 32 20 Q42 20 42 26" fill="none" stroke="${C}" stroke-width="4"/>
    <rect x="11" y="25" width="42" height="33" rx="10" fill="#e8a23a" ${s()}/>
    <path d="M11 33 Q32 38 53 33" fill="none" stroke="#c9852a" stroke-width="3"/>
    <rect x="19" y="40" width="26" height="13" rx="5" fill="#c9852a" ${s(2.5)}/>
    <circle cx="32" cy="46" r="2.2" fill="#ffd96a" stroke="${C}" stroke-width="1.6"/>
    ${brilho('M15 30 Q20 27.5 26 27.5', 2.4)}
    ${faisca(54, 13, 5)}${faisca(9, 15, 3.4)}`;

/** O osso que saiu da rocha (a rocha partida embaixo, o osso no alto, brilhando). */
const ossoAchado = `
    <path d="M6 58 L8 44 L18 40 L24 46 L22 58 Z" fill="#8a8890" ${s()}/>
    <path d="M58 58 L56 44 L46 40 L40 46 L42 58 Z" fill="#8a8890" ${s()}/>
    <path d="M24 58 L26 50 L32 53 L38 50 L40 58 Z" fill="#6c6a72" ${s(2.4)}/>
    <path d="M12 47 l4 2 M50 47 l-4 2" stroke="#6c6a72" stroke-width="2.2" stroke-linecap="round"/>
    <g transform="rotate(-20 32 24)">
      <rect x="15" y="19" width="34" height="11" rx="5" fill="#fff6e0" ${s(2.6)}/>
      <circle cx="14" cy="18.5" r="6.2" fill="#fff6e0" ${s(2.6)}/><circle cx="14" cy="30.5" r="6.2" fill="#fff6e0" ${s(2.6)}/>
      <circle cx="50" cy="18.5" r="6.2" fill="#fff6e0" ${s(2.6)}/><circle cx="50" cy="30.5" r="6.2" fill="#fff6e0" ${s(2.6)}/>
      <rect x="16" y="20.6" width="32" height="7.8" fill="#fff6e0"/>
      <path d="M20 23 Q30 21.5 42 23" fill="none" stroke="#e8d6a8" stroke-width="2.2" stroke-linecap="round"/>
    </g>
    ${faisca(54, 8, 4.6)}${faisca(8, 10, 3.6)}${faisca(32, 44, 3)}`;

export const ARTE_CANTO: Record<string, string> = {
  // ------------------------------------------------------------ Era dos Dinos
  ovoDino: svg(ovo(32, 32, 1.75)),
  // d1, o que fazer: o ninho de gravetos com os 3 ovinhos em volta, no chão
  ninhoOvos: svg(
    `${ninho(32, 30, 21)}${ovo(11, 48, 0.6, -14)}${ovo(32, 52, 0.62, 0)}${ovo(53, 48, 0.6, 14)}`,
  ),
  mochilaOvos: svg(mochilaOvos),
  pescocudo: svg(pescocudo(false)),
  pescocudoCoracao: svg(`${pescocudo(true)}${coracao(13, 13, 1.05)}${faisca(55, 6, 3.4)}`),
  capimDourado: svg(capimDourado),
  rochaOsso: svg(rocha(true)),
  pincel: svg(pincel),
  ossoAchado: svg(ossoAchado),
  // ------------------------------------------------------------ Doce Reino
  boloFantasma: svg(bolo(true)),
  boloAceso: svg(`${bolo(false)}${vela(true)}${faisca(52, 10, 4)}${faisca(12, 12, 3.2)}`),
  ovelha: svg(ovelha(false)),
  ovelhaCoracao: svg(`${ovelha(true)}${coracao(50, 9, 1.05)}${faisca(8, 10, 3.2)}`),
  brotoDoce: svg(brotoDoce),
};
