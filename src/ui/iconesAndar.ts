/**
 * Spec 036 (T04): os ícones da roda para os brinquedos de andar (um por brinquedo comprado) e o
 * "Descer". No padrão dos ícones da roda (viewBox 0 0 32 32, contorno marrom-escuro, cores
 * chapadas), para a criança que não lê achar o brinquedo pelo desenho.
 */
const svg = (miolo: string) =>
  `<svg viewBox="0 0 32 32" aria-hidden="true" focusable="false">${miolo}</svg>`;
const T = '#3b2a1e';

export const ICONES_ANDAR: Readonly<Record<string, string>> = {
  'patinete-luz': svg(
    `<path d="M21 6 L23 24" stroke="${T}" stroke-width="2.4" stroke-linecap="round"/>` +
      `<path d="M17 6 H25" stroke="#7b5cff" stroke-width="3.4" stroke-linecap="round"/>` +
      `<rect x="6" y="21" width="18" height="4" rx="2" fill="#7b5cff" stroke="${T}" stroke-width="1.8"/>` +
      `<circle cx="9" cy="27" r="2.6" fill="#3ee0c8" stroke="${T}" stroke-width="1.6"/>` +
      `<circle cx="23" cy="27" r="2.6" fill="#3ee0c8" stroke="${T}" stroke-width="1.6"/>`,
  ),
  'carrinho-pedal': svg(
    `<path d="M4 22 V16 Q4 13 7 13 H13 L16 9 H20 L22 13 H25 Q28 13 28 16 V22 Z" fill="#ff6b5a" stroke="${T}" stroke-width="2" stroke-linejoin="round"/>` +
      `<path d="M23 9 V4 L28 6 L23 8" fill="#ffcf3a" stroke="${T}" stroke-width="1.4" stroke-linejoin="round"/>` +
      `<circle cx="9.5" cy="23" r="3.4" fill="#3b3650" stroke="${T}" stroke-width="1.6"/>` +
      `<circle cx="22.5" cy="23" r="3.4" fill="#3b3650" stroke="${T}" stroke-width="1.6"/>`,
  ),
  bicicletinha: svg(
    `<circle cx="8" cy="22" r="5" fill="none" stroke="${T}" stroke-width="2.4"/>` +
      `<circle cx="24" cy="22" r="5" fill="none" stroke="${T}" stroke-width="2.4"/>` +
      `<path d="M8 22 L14 13 H21 L24 22 M14 13 L17 22 H8 M21 13 L20 8 H23" fill="none" stroke="#4fb3ff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>` +
      `<path d="M12 11 H16" stroke="${T}" stroke-width="2.6" stroke-linecap="round"/>` +
      `<circle cx="25" cy="10" r="2" fill="#ff8fb3" stroke="${T}" stroke-width="1.2"/>`,
  ),
  // spec 038 (T03): a motoquinha dourada de lado: as duas rodas, o tanque com a estrela, o banco,
  // o farol redondo na frente e o guidão alto
  'motoquinha-dourada': svg(
    `<circle cx="8" cy="23" r="4.6" fill="#3b3650" stroke="${T}" stroke-width="1.8"/>` +
      `<circle cx="8" cy="23" r="2" fill="#ffd97a"/>` +
      `<circle cx="24" cy="23" r="4.6" fill="#3b3650" stroke="${T}" stroke-width="1.8"/>` +
      `<circle cx="24" cy="23" r="2" fill="#ffd97a"/>` +
      `<path d="M7 18 H13 L15 21 H19 L21 15 H14 Q12 13 10 14 Z" fill="#e8b03c" stroke="${T}" stroke-width="1.8" stroke-linejoin="round"/>` +
      `<path d="M15 15 Q15 11 19 11 Q23 11 22 15 Z" fill="#e8b03c" stroke="${T}" stroke-width="1.8" stroke-linejoin="round"/>` +
      `<path d="M18.6 12.4 l0.5 1 1.1 .1 -.8 .7 .3 1.1 -1 -.6 -1 .6 .3 -1.1 -.8 -.7 1.1 -.1 z" fill="#fff3da"/>` +
      `<path d="M21 15 L24 23 M22 9 L22.5 15 M20 8.5 H25" fill="none" stroke="${T}" stroke-width="2" stroke-linecap="round"/>` +
      `<circle cx="25.5" cy="13" r="2.2" fill="#fff4d0" stroke="${T}" stroke-width="1.4"/>`,
  ),
  'nuvem-fofa': svg(
    `<path d="M7 24 Q3 24 3 20 Q3 16 7.5 16 Q8 10 14 10 Q19 9 21 13 Q22 12 24 12 Q29 12 29 18 Q29 24 24 24 Z" fill="#fbfdff" stroke="${T}" stroke-width="2" stroke-linejoin="round"/>` +
      `<path d="M9 27 H13 M18 27 H23" stroke="#a9d8ff" stroke-width="2" stroke-linecap="round"/>`,
  ),
};

/** "Descer": a criança de pé ao lado, com a setinha para baixo (o brinquedo fica). */
export const ICONE_DESCER = svg(
  `<circle cx="11" cy="7" r="3.4" fill="#e8b48a" stroke="${T}" stroke-width="1.8"/>` +
    `<path d="M11 11 V20 M11 20 L8 26 M11 20 L14 26 M7 14 H15" stroke="${T}" stroke-width="2.4" stroke-linecap="round"/>` +
    `<path d="M23 7 V20 M18.5 16 L23 21 L27.5 16" fill="none" stroke="#2fa86a" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<path d="M4 28 H28" stroke="${T}" stroke-width="2" stroke-linecap="round"/>`,
);

/** O nome de cada item da roda (lido só por quem lê; a criança vê o desenho). */
export const NOME_ANDAR: Readonly<Record<string, string>> = {
  'patinete-luz': 'Andar de patinete',
  'carrinho-pedal': 'Andar de carrinho',
  bicicletinha: 'Andar de bicicletinha',
  'nuvem-fofa': 'Andar na nuvem',
  'motoquinha-dourada': 'Andar de motoquinha',
};
