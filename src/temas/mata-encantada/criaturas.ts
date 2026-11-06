import type { TipoCriatura } from '../../jogo/criaturas';
import type { PecaCriatura } from '../tipos';

const PELO_CAPI = '#8a5c3a';
const PELE_SACI = '#6e4a32';
const GUARA = '#d8642a';

/**
 * Bichos da Mata Encantada (mesmas caixas de colisão):
 * capivara com um bem-te-vi nas costas, sapo-cururu de olhos dourados, lambari de
 * rabo vermelho, Saci de gorro vermelho num pé só (os braços balançam) e o lobo-guará
 * de pernas compridas e meias pretas.
 */
export const CRIATURAS_MATA: Record<TipoCriatura, PecaCriatura[]> = {
  cervo: [
    // corpo de barril, baixo e largo
    { t: [0.64, 0.56, 1.06], p: [0, 0.62, 0], cor: PELO_CAPI },
    { t: [0.54, 0.1, 0.84], p: [0, 0.94, -0.04], cor: '#9a6c48' },
    { t: [0.5, 0.12, 0.8], p: [0, 0.34, 0], cor: '#a47a54' },
    // cabeça grande e quadrada
    { t: [0.42, 0.42, 0.5], p: [0, 0.84, 0.7], cor: '#946440', papel: 'cabeca' },
    { t: [0.36, 0.26, 0.16], p: [0, 0.76, 0.99], cor: '#6a4428', papel: 'cabeca' },
    { t: [0.22, 0.05, 0.04], p: [0, 0.84, 1.08], cor: '#1e140e', papel: 'cabeca' },
    { t: [0.06, 0.06, 0.06], p: [0.19, 0.96, 0.82], cor: '#111111', papel: 'cabeca' },
    { t: [0.06, 0.06, 0.06], p: [-0.19, 0.96, 0.82], cor: '#111111', papel: 'cabeca' },
    { t: [0.1, 0.08, 0.07], p: [0.14, 1.09, 0.55], cor: '#5a3a24', papel: 'cabeca' },
    { t: [0.1, 0.08, 0.07], p: [-0.14, 1.09, 0.55], cor: '#5a3a24', papel: 'cabeca' },
    // perninhas curtas
    { t: [0.16, 0.38, 0.16], p: [0.2, 0.19, 0.34], cor: '#5a3a24', papel: 'perna0' },
    { t: [0.16, 0.38, 0.16], p: [-0.2, 0.19, 0.34], cor: '#5a3a24', papel: 'perna1' },
    { t: [0.16, 0.38, 0.16], p: [0.2, 0.19, -0.34], cor: '#5a3a24', papel: 'perna1' },
    { t: [0.16, 0.38, 0.16], p: [-0.2, 0.19, -0.34], cor: '#5a3a24', papel: 'perna0' },
    // bem-te-vi de carona nas costas
    { t: [0.15, 0.13, 0.2], p: [0, 1.06, 0.02], cor: '#f2c230' },
    { t: [0.16, 0.07, 0.16], p: [0, 1.12, 0.0], cor: '#7a5a34' },
    { t: [0.04, 0.03, 0.1], p: [0, 1.08, -0.14], cor: '#5a4026' },
    { t: [0.11, 0.1, 0.1], p: [0, 1.16, 0.14], cor: '#1a1a1a' },
    { t: [0.12, 0.03, 0.07], p: [0, 1.17, 0.15], cor: '#ffffff' },
    { t: [0.04, 0.03, 0.06], p: [0, 1.15, 0.22], cor: '#2a2a2a' },
  ],
  coelho: [
    // sapo-cururu: largo e achatado, de olhos dourados
    { t: [0.4, 0.2, 0.38], p: [0, 0.16, 0], cor: '#7a6a36' },
    { t: [0.3, 0.06, 0.3], p: [0, 0.07, 0.02], cor: '#e8d8a0' },
    { t: [0.08, 0.03, 0.08], p: [0.09, 0.27, -0.06], cor: '#5a4c24' },
    { t: [0.07, 0.03, 0.07], p: [-0.1, 0.27, 0.04], cor: '#5a4c24' },
    { t: [0.34, 0.14, 0.2], p: [0, 0.27, 0.18], cor: '#857440', papel: 'cabeca' },
    { t: [0.18, 0.05, 0.08], p: [0, 0.19, 0.25], cor: '#f0e2b0', papel: 'cabeca' },
    { t: [0.28, 0.02, 0.02], p: [0, 0.23, 0.28], cor: '#3a2e14', papel: 'cabeca' },
    { t: [0.11, 0.11, 0.11], p: [0.11, 0.38, 0.17], cor: '#f2c230', papel: 'cabeca' },
    { t: [0.11, 0.11, 0.11], p: [-0.11, 0.38, 0.17], cor: '#f2c230', papel: 'cabeca' },
    { t: [0.06, 0.07, 0.03], p: [0.11, 0.39, 0.225], cor: '#111111', papel: 'cabeca' },
    { t: [0.06, 0.07, 0.03], p: [-0.11, 0.39, 0.225], cor: '#111111', papel: 'cabeca' },
    // patas de trás dobradas (pulam) e mãozinhas da frente
    { t: [0.13, 0.12, 0.28], p: [0.22, 0.06, -0.08], cor: '#6a5a2c', papel: 'perna0' },
    { t: [0.13, 0.12, 0.28], p: [-0.22, 0.06, -0.08], cor: '#6a5a2c', papel: 'perna1' },
    { t: [0.08, 0.12, 0.08], p: [0.14, 0.06, 0.16], cor: '#6a5a2c' },
    { t: [0.08, 0.12, 0.08], p: [-0.14, 0.06, 0.16], cor: '#6a5a2c' },
  ],
  peixe: [
    // lambari prateado de rabo vermelho
    { t: [0.1, 0.18, 0.38], p: [0, 0.15, 0], cor: '#c8d4da', brilho: 0.25 },
    { t: [0.11, 0.05, 0.34], p: [0, 0.23, 0], cor: '#5a807e' },
    { t: [0.11, 0.04, 0.28], p: [0, 0.08, 0.02], cor: '#f2f6f6' },
    { t: [0.04, 0.18, 0.14], p: [0, 0.15, -0.25], cor: '#e83a24', brilho: 0.35, papel: 'cauda' },
    { t: [0.03, 0.07, 0.1], p: [0, 0.28, -0.02], cor: '#f2a030' },
    { t: [0.115, 0.05, 0.05], p: [0, 0.17, 0.05], cor: '#1a1a1a' },
    { t: [0.12, 0.05, 0.05], p: [0, 0.18, 0.14], cor: '#111111' },
  ],
  espectro: [
    // redemoinho de poeira em volta do pé
    {
      t: [0.56, 0.14, 0.56],
      p: [0, 0.07, 0],
      cor: '#d8c8a8',
      alfa: 0.35,
      brilho: 0.15,
      papel: 'cauda',
    },
    { t: [0.4, 0.12, 0.4], p: [0, 0.22, 0], cor: '#e4d6ba', alfa: 0.25, brilho: 0.15 },
    // uma perna só
    { t: [0.14, 0.5, 0.14], p: [0, 0.27, 0], cor: PELE_SACI },
    { t: [0.18, 0.08, 0.26], p: [0, 0.04, 0.05], cor: '#4a2e20' },
    { t: [0.36, 0.2, 0.26], p: [0, 0.6, 0], cor: '#d0302a', brilho: 0.2 },
    { t: [0.32, 0.36, 0.22], p: [0, 0.88, 0], cor: PELE_SACI },
    // braços (balançam como pernas)
    { t: [0.1, 0.42, 0.1], p: [0.22, 0.84, 0], cor: PELE_SACI, papel: 'perna0' },
    { t: [0.1, 0.42, 0.1], p: [-0.22, 0.84, 0], cor: PELE_SACI, papel: 'perna1' },
    // cabeça de sorriso largo
    { t: [0.36, 0.34, 0.32], p: [0, 1.24, 0.02], cor: '#7a5238', papel: 'cabeca' },
    { t: [0.1, 0.1, 0.03], p: [0.08, 1.29, 0.185], cor: '#ffffff', brilho: 0.5, papel: 'cabeca' },
    { t: [0.1, 0.1, 0.03], p: [-0.08, 1.29, 0.185], cor: '#ffffff', brilho: 0.5, papel: 'cabeca' },
    { t: [0.05, 0.06, 0.02], p: [0.09, 1.28, 0.2], cor: '#111111', papel: 'cabeca' },
    { t: [0.05, 0.06, 0.02], p: [-0.07, 1.28, 0.2], cor: '#111111', papel: 'cabeca' },
    { t: [0.2, 0.05, 0.03], p: [0, 1.16, 0.185], cor: '#ffffff', brilho: 0.3, papel: 'cabeca' },
    { t: [0.04, 0.04, 0.03], p: [0.11, 1.18, 0.18], cor: '#3a1a14', papel: 'cabeca' },
    { t: [0.04, 0.04, 0.03], p: [-0.11, 1.18, 0.18], cor: '#3a1a14', papel: 'cabeca' },
    // gorrinho vermelho pontudo, caído para trás
    { t: [0.4, 0.08, 0.36], p: [0, 1.44, 0], cor: '#d0302a', brilho: 0.35, papel: 'cabeca' },
    { t: [0.3, 0.14, 0.28], p: [0, 1.54, -0.03], cor: '#d83a30', brilho: 0.35, papel: 'cabeca' },
    { t: [0.2, 0.14, 0.2], p: [0, 1.66, -0.09], cor: '#d0302a', brilho: 0.35, papel: 'cabeca' },
    { t: [0.12, 0.12, 0.14], p: [0, 1.76, -0.17], cor: '#d83a30', brilho: 0.35, papel: 'cabeca' },
    { t: [0.08, 0.08, 0.1], p: [0, 1.8, -0.27], cor: '#c02824', brilho: 0.35, papel: 'cabeca' },
  ],
  raposa: [
    // lobo-guará: pernas compridas de meia preta e juba escura
    { t: [0.26, 0.24, 0.56], p: [0, 0.62, 0], cor: GUARA },
    { t: [0.2, 0.06, 0.44], p: [0, 0.49, 0], cor: '#eaa868' },
    { t: [0.12, 0.1, 0.32], p: [0, 0.77, 0.1], cor: '#2a1c14' },
    { t: [0.16, 0.22, 0.16], p: [0, 0.78, 0.3], cor: GUARA },
    { t: [0.17, 0.12, 0.1], p: [0, 0.86, 0.26], cor: '#2a1c14' },
    { t: [0.22, 0.2, 0.24], p: [0, 0.88, 0.42], cor: '#e0702e', papel: 'cabeca' },
    { t: [0.1, 0.09, 0.17], p: [0, 0.84, 0.6], cor: '#4a2a1a', papel: 'cabeca' },
    { t: [0.06, 0.05, 0.03], p: [0, 0.87, 0.69], cor: '#111111', papel: 'cabeca' },
    { t: [0.14, 0.08, 0.06], p: [0, 0.78, 0.52], cor: '#f4ece0', papel: 'cabeca' },
    { t: [0.05, 0.05, 0.03], p: [0.07, 0.92, 0.545], cor: '#1a1410', papel: 'cabeca' },
    { t: [0.05, 0.05, 0.03], p: [-0.07, 0.92, 0.545], cor: '#1a1410', papel: 'cabeca' },
    { t: [0.02, 0.02, 0.01], p: [0.06, 0.935, 0.562], cor: '#ffffff', papel: 'cabeca' },
    { t: [0.02, 0.02, 0.01], p: [-0.08, 0.935, 0.562], cor: '#ffffff', papel: 'cabeca' },
    { t: [0.09, 0.15, 0.04], p: [0.08, 1.04, 0.38], cor: '#e0702e', papel: 'cabeca' },
    { t: [0.09, 0.15, 0.04], p: [-0.08, 1.04, 0.38], cor: '#e0702e', papel: 'cabeca' },
    { t: [0.05, 0.09, 0.02], p: [0.08, 1.03, 0.405], cor: '#f4ece0', papel: 'cabeca' },
    { t: [0.05, 0.09, 0.02], p: [-0.08, 1.03, 0.405], cor: '#f4ece0', papel: 'cabeca' },
    { t: [0.12, 0.12, 0.3], p: [0, 0.62, -0.42], cor: GUARA, papel: 'cauda' },
    { t: [0.1, 0.1, 0.1], p: [0, 0.6, -0.6], cor: '#f4ece0', brilho: 0.2, papel: 'cauda' },
    { t: [0.08, 0.5, 0.08], p: [0.09, 0.25, 0.22], cor: '#1e1814', papel: 'perna0' },
    { t: [0.08, 0.5, 0.08], p: [-0.09, 0.25, 0.22], cor: '#1e1814', papel: 'perna1' },
    { t: [0.08, 0.5, 0.08], p: [0.09, 0.25, -0.22], cor: '#1e1814', papel: 'perna1' },
    { t: [0.08, 0.5, 0.08], p: [-0.09, 0.25, -0.22], cor: '#1e1814', papel: 'perna0' },
  ],
};
