/**
 * Spec 027 (T17): os desenhos das missões n1 a n5 da Noite das Fantasias, no jeito da 023, da
 * 031 e da Vila: quadro de 64 × 64, contorno marrom macio, a sombra embaixo e o risquinho de
 * brilho. Nada de susto: olhos redondos, carinhas sorrindo. A T19 confere a leitura a 28 px.
 */
const C = '#5a3a22';
const L = 'stroke-linejoin="round" stroke-linecap="round"';
const s = (w = 3) => `stroke="${C}" stroke-width="${w}" ${L}`;
const svg = (corpo: string) =>
  `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${corpo}</svg>`;
/** Um desenho dentro de outro (o coração no colo, o lampião na porta). */
const dentro = (corpo: string, x: number, y: number, t: number) =>
  `<svg x="${x}" y="${y}" width="${t}" height="${t}" viewBox="0 0 64 64">${corpo}</svg>`;
const sombra = (cx = 32, cy = 58, rx = 20) =>
  `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="3.5" fill="#000" opacity="0.14"/>`;

const ROXO = '#8a4fc8';
const ROXO_ESCURO = '#6a3aa0';
const LARANJA = '#ff9a2e';

// ------------------------------------------------------------------ peças
/** A sacola com o que vai dentro dela (os docinhos aparecem saindo pela boca, atrás da beira). */
const sacolaCom = (dentroDela: string) => `
  ${sombra()}
  <path d="M22 22 Q22 10 32 10 Q42 10 42 22" fill="none" stroke="${C}" stroke-width="4" stroke-linecap="round"/>
  <path d="M13 22 H51 L47 56 Q32 59 17 56 Z" fill="${ROXO}" ${s()}/>
  ${dentroDela}
  <rect x="13" y="21" width="38" height="7" rx="3" fill="${LARANJA}" ${s(2.5)}/>
  <circle cx="26" cy="40" r="2.6" fill="${C}"/><circle cx="38" cy="40" r="2.6" fill="${C}"/>
  <path d="M26 47 Q32 51 38 47" fill="none" stroke="${C}" stroke-width="2.5" stroke-linecap="round"/>
  <path d="M18 33 Q19 44 21 52" fill="none" stroke="#b58ae6" stroke-width="3" stroke-linecap="round"/>`;

const docinhos = `
  <circle cx="21" cy="18" r="7.5" fill="#f4a0c0" ${s(2.5)}/>
  <circle cx="43" cy="18" r="7.5" fill="${LARANJA}" ${s(2.5)}/>
  <circle cx="32" cy="14" r="7.5" fill="#7a4a2a" ${s(2.5)}/>
  <path d="M29 11 l1.5 1 M34 10.5 l-1 1.6 M31 15.5 l1.6 -.4 M35.5 14.5 l-.6 1.6" stroke="${LARANJA}" stroke-width="1.8" stroke-linecap="round"/>
  <path d="M18 15 Q21 13 24 15" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"/>
  <path d="M40 15 Q43 13 46 15" fill="none" stroke="#ffd08a" stroke-width="2" stroke-linecap="round"/>`;
const sacola = sacolaCom('');

const lanterna = (acesa: boolean) => `
  ${sombra(32, 59, 14)}
  ${acesa ? `<circle cx="32" cy="36" r="24" fill="#ffd96a" opacity="0.35"/>` : ''}
  <path d="M25 12 Q32 4 39 12" fill="none" stroke="${C}" stroke-width="3.5" stroke-linecap="round"/>
  <rect x="21" y="12" width="22" height="7" rx="3" fill="${ROXO_ESCURO}" ${s(2.5)}/>
  <path d="M19 19 H45 L43 49 H21 Z" fill="${acesa ? '#ffe27a' : '#8b8796'}" ${s()}/>
  ${acesa ? `<ellipse cx="32" cy="35" rx="6" ry="9" fill="#fff6c8"/>` : ''}
  <path d="M32 19 V49 M19.7 34 H44.3" stroke="${ROXO_ESCURO}" stroke-width="2.5"/>
  <rect x="18" y="49" width="28" height="7" rx="3" fill="${ROXO_ESCURO}" ${s(2.5)}/>
  <path d="M24 23 L23.4 31" stroke="#fff" stroke-width="2.5" stroke-linecap="round" opacity="${acesa ? 0.8 : 0.4}"/>`;

/** A Lulu: o lençol de capuz (a cúpula com a abertura oval) e a carinha tímida. */
const lulu = (rindo: boolean) => `
  ${sombra(32, 59, 18)}
  ${
    rindo
      ? `<path d="M16 32 Q8 22 11 12" fill="none" stroke="#f4f0fa" stroke-width="7" stroke-linecap="round"/>
  <path d="M16 32 Q8 22 11 12" fill="none" ${s(2.5)}/>
  <path d="M48 32 Q56 22 53 12" fill="none" stroke="#f4f0fa" stroke-width="7" stroke-linecap="round"/>
  <path d="M48 32 Q56 22 53 12" fill="none" ${s(2.5)}/>`
      : ''
  }
  <path d="M14 56 Q12 30 18 20 Q24 9 32 9 Q40 9 46 20 Q52 30 50 56 Q46 52 42 56 Q37 52 32 56 Q27 52 22 56 Q18 52 14 56 Z" fill="#f4f0fa" ${s()}/>
  <ellipse cx="32" cy="29" rx="11" ry="10" fill="#f6c8a4" ${s(2.5)}/>
  <circle cx="28" cy="28" r="2.2" fill="${C}"/><circle cx="36" cy="28" r="2.2" fill="${C}"/>
  ${
    rindo
      ? `<path d="M27 32 Q32 38 37 32 Z" fill="#c8506a" ${s(2)}/>`
      : `<path d="M29 33 Q32 35 35 33" fill="none" stroke="${C}" stroke-width="2" stroke-linecap="round"/>`
  }
  <circle cx="25" cy="32" r="2" fill="#ff9aa8" opacity="0.7"/><circle cx="39" cy="32" r="2" fill="#ff9aa8" opacity="0.7"/>
  <path d="M19 26 Q20 18 26 14" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/>`;

/** A abóbora de carinha (olhos redondos e o sorriso), o lampião que vai na porta da Vovó. */
const aboboraCarinha = `
  ${sombra(32, 58, 22)}
  <path d="M32 16 Q31 8 36 6" fill="none" stroke="#4f8a3a" stroke-width="4" stroke-linecap="round"/>
  <ellipse cx="20" cy="37" rx="12" ry="19" fill="${LARANJA}" ${s()}/>
  <ellipse cx="44" cy="37" rx="12" ry="19" fill="${LARANJA}" ${s()}/>
  <ellipse cx="32" cy="37" rx="13" ry="20" fill="#ffb04a" ${s()}/>
  <circle cx="25" cy="33" r="4" fill="#ffd94a" ${s(2)}/><circle cx="39" cy="33" r="4" fill="#ffd94a" ${s(2)}/>
  <path d="M22 42 Q32 52 42 42 Q32 46 22 42 Z" fill="#ffd94a" ${s(2)}/>
  <path d="M14 28 Q15 22 19 19" fill="none" stroke="#ffd08a" stroke-width="3" stroke-linecap="round"/>`;

/** O Tufinho: cor de carvão, o focinho clarinho, olhos redondos e o laço roxo. */
const tufinho = `
  ${sombra(32, 58, 18)}
  <path d="M50 46 Q60 40 56 28" fill="none" stroke="#4a4752" stroke-width="6" stroke-linecap="round"/>
  <path d="M14 26 L16 7 L29 18 Z" fill="#4a4752" ${s()}/><path d="M50 26 L48 7 L35 18 Z" fill="#4a4752" ${s()}/>
  <path d="M18 20 L18.5 12 L24 17 Z M46 20 L45.5 12 L40 17 Z" fill="#c98aa0"/>
  <ellipse cx="32" cy="34" rx="20" ry="18" fill="#4a4752" ${s()}/>
  <ellipse cx="32" cy="41" rx="9" ry="6.5" fill="#d9d4de"/>
  <circle cx="24.5" cy="32" r="4.6" fill="#ffe27a"/><circle cx="39.5" cy="32" r="4.6" fill="#ffe27a"/>
  <circle cx="25" cy="32.5" r="2.6" fill="${C}"/><circle cx="40" cy="32.5" r="2.6" fill="${C}"/>
  <circle cx="26" cy="31" r="1.1" fill="#fff"/><circle cx="41" cy="31" r="1.1" fill="#fff"/>
  <path d="M30 38.5 L34 38.5 L32 41 Z" fill="#ff8aa0"/>
  <path d="M32 41 Q30 44 28 43 M32 41 Q34 44 36 43" fill="none" stroke="${C}" stroke-width="1.8" stroke-linecap="round"/>
  <path d="M24 52 L32 49 L40 52 L32 55 Z" fill="${ROXO}" ${s(2)}/>
  <path d="M19 26 Q21 20 26 18" fill="none" stroke="#77737f" stroke-width="2.5" stroke-linecap="round"/>`;

const patinha = (cx: number, cy: number, k: number, cor = '#4a4752') => `
  <ellipse cx="${cx}" cy="${cy + 3 * k}" rx="${5 * k}" ry="${4.2 * k}" fill="${cor}"/>
  <circle cx="${cx - 5 * k}" cy="${cy - 3 * k}" r="${2 * k}" fill="${cor}"/>
  <circle cx="${cx - 1.8 * k}" cy="${cy - 5.8 * k}" r="${2 * k}" fill="${cor}"/>
  <circle cx="${cx + 1.8 * k}" cy="${cy - 5.8 * k}" r="${2 * k}" fill="${cor}"/>
  <circle cx="${cx + 5 * k}" cy="${cy - 3 * k}" r="${2 * k}" fill="${cor}"/>`;

const coracao = `<path d="M32 54 Q8 38 12 22 Q16 10 28 14 Q32 16 32 20 Q32 16 36 14 Q48 10 52 22 Q56 38 32 54 Z" fill="#ff6a8a" ${s()}/>`;

const porta = `
  ${sombra(32, 59, 22)}
  <path d="M14 58 V24 Q14 8 32 8 Q50 8 50 24 V58 Z" fill="#7a4a8a" ${s()}/>
  <path d="M20 58 V26 Q20 14 32 14 Q44 14 44 26 V58" fill="none" stroke="#5e3670" stroke-width="2.5"/>
  <circle cx="42" cy="38" r="2.4" fill="#ffc93d" ${s(1.8)}/>`;

// ------------------------------------------------------------------ os nomes das missões
export const ARTE_FESTA: Record<string, string> = {
  /** n1: a sacola vazia (o que fazer), a sacola cheia de doces (como fica). */
  sacolaVazia: svg(sacola),
  sacolaCheia: svg(sacolaCom(docinhos)),
  /** n1: a campainha da porta (o botão dourado na plaquinha roxa) com a mãozinha tocando. */
  campainha: svg(`
    ${sombra(32, 59, 16)}
    <rect x="14" y="8" width="36" height="48" rx="10" fill="${ROXO}" ${s()}/>
    <circle cx="32" cy="27" r="11" fill="#ffc93d" ${s()}/>
    <circle cx="32" cy="27" r="5.5" fill="#ffe27a"/>
    <path d="M22 42 Q32 47 42 42" fill="none" stroke="#c9a2f0" stroke-width="3" stroke-linecap="round"/>
    <path d="M50 16 Q55 20 55 26 M53 10 Q60 16 60 26" fill="none" stroke="${LARANJA}" stroke-width="3" stroke-linecap="round"/>`),
  /** n2: a lanterna apagada, a acesa e o caminho do bosque aceso (três lanternas). */
  lanternaApagada: svg(lanterna(false)),
  lanternaAcesa: svg(lanterna(true)),
  bosqueAceso: svg(`
    <path d="M4 60 Q32 44 60 60 Z" fill="#b89ad8"/>
    ${dentro(lanterna(true), 0, 14, 30)}
    ${dentro(lanterna(true), 34, 14, 30)}
    ${dentro(lanterna(true), 15, 0, 34)}`),
  /** n3: a Lulu tímida (o que achar) e a Lulu achada, rindo de braços para cima. */
  lulu: svg(lulu(false)),
  luluAchada: svg(lulu(true)),
  /** n4: a abóbora de carinha, e o lampião na porta da Vovó. */
  aboboraCarinha: svg(aboboraCarinha),
  portaLampiao: svg(`${porta}${dentro(aboboraCarinha, 2, 34, 28)}`),
  /** n5: o Tufinho, as patinhas dele e o Tufinho com o coração (no colo da Vovó). */
  tufinho: svg(tufinho),
  patinhas: svg(`${patinha(20, 46, 1.4)}${patinha(44, 22, 1.4)}`),
  tufinhoColo: svg(`${tufinho}${dentro(coracao, 40, 0, 24)}`),
  /** O mundo no baú (as habilidades que a festa alimenta): a abóbora de carinha no roxo. */
  mundoFesta: svg(`
    <rect x="6" y="6" width="52" height="52" rx="12" fill="${ROXO_ESCURO}" ${s()}/>
    ${dentro(aboboraCarinha, 10, 10, 44)}
    <circle cx="48" cy="15" r="4" fill="#fff6c8"/>`),
};
