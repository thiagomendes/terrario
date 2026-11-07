import type { TipoCriatura } from '../../jogo/criaturas';
import type { PecaCriatura } from '../tipos';

type V3 = [number, number, number];
type Extra = Partial<Omit<PecaCriatura, 't' | 'p' | 'cor'>>;

// atalhos do desenho à mão (spec 012): toda peça diz a forma, o modelo é usado como está
const bola = (t: V3, p: V3, cor: string, extra: Extra = {}): PecaCriatura => ({
  t,
  p,
  cor,
  forma: 'bola',
  ...extra,
});
const capsula = (t: V3, p: V3, cor: string, extra: Extra = {}): PecaCriatura => ({
  t,
  p,
  cor,
  forma: 'capsula',
  ...extra,
});
const caixa = (t: V3, p: V3, cor: string, raio: number, extra: Extra = {}): PecaCriatura => ({
  t,
  p,
  cor,
  forma: 'caixa',
  raio,
  ...extra,
});
/** A mesma peça dos dois lados (x e −x; a inclinação em y e z espelha). */
const par = (
  f: (t: V3, p: V3, cor: string, extra?: Extra) => PecaCriatura,
  t: V3,
  p: V3,
  cor: string,
  extra: Extra = {},
  papeis?: [PecaCriatura['papel'], PecaCriatura['papel']],
): PecaCriatura[] => [
  f(t, p, cor, { ...extra, ...(papeis ? { papel: papeis[0] } : {}) }),
  f(t, [-p[0], p[1], p[2]], cor, {
    ...extra,
    ...(papeis ? { papel: papeis[1] } : {}),
    ...(extra.rot ? { rot: [extra.rot[0], -extra.rot[1], -extra.rot[2]] as V3 } : {}),
  }),
];

const CAB = { papel: 'cabeca' } as const;
const BRANCO = '#ffffff';
const OLHO = '#1c1410';
const BOCHECHA = '#ff8098';

/**
 * Bichos da Mata Encantada como brinquedo (mesmas caixas de colisão): capivara de cabeção
 * quadrado com um bem-te-vi de carona nas costas, sapo-cururu gordinho de olhos dourados,
 * lambari prateado de rabo vermelho, Saci de gorro vermelho num pé só (os braços balançam,
 * e de noite ele brilha como brinquedo fosforescente) e o lobo-guará de orelhonas e meias
 * pretas. Olhos de bolinha com ponto de brilho, bochechas rosadas e cantos bem redondos.
 */
export const CRIATURAS_MATA: Record<TipoCriatura, PecaCriatura[]> = {
  cervo: [
    // capivara: corpo de barril gordinho, barriga mais clara
    bola([0.68, 0.54, 0.9], [0, 0.56, -0.12], '#b0602a'),
    bola([0.52, 0.2, 0.66], [0, 0.36, -0.08], '#d8884a'),
    // cabeção quadrado de cantos redondos, focinho largo e narizinho
    caixa([0.54, 0.44, 0.62], [0, 0.8, 0.5], '#a65a2a', 0.18, CAB),
    caixa([0.46, 0.26, 0.2], [0, 0.7, 0.83], '#7a3e1e', 0.1, CAB),
    bola([0.22, 0.08, 0.06], [0, 0.78, 0.93], '#3a2216', CAB),
    // olhos de bolinha com ponto de brilho, bochechas e orelhinhas redondas
    ...par(bola, [0.13, 0.14, 0.08], [0.16, 0.92, 0.79], OLHO, CAB),
    ...par(bola, [0.05, 0.05, 0.03], [0.14, 0.96, 0.83], BRANCO, { ...CAB, brilho: 0.5 }),
    ...par(bola, [0.13, 0.08, 0.05], [0.22, 0.8, 0.8], BOCHECHA, CAB),
    ...par(bola, [0.1, 0.09, 0.07], [0.18, 1.0, 0.3], '#7a3e1e', CAB),
    // perninhas de cápsula curtas e grossas (diagonais alternam)
    ...par(capsula, [0.18, 0.4, 0.18], [0.17, 0.2, 0.12], '#7a3e1e', {}, ['perna0', 'perna1']),
    ...par(capsula, [0.18, 0.4, 0.18], [0.17, 0.2, -0.34], '#7a3e1e', {}, ['perna1', 'perna0']),
    // bem-te-vi de carona nas costas: peito amarelo, capuz preto e listra branca
    bola([0.2, 0.17, 0.23], [0, 0.87, -0.14], '#ffd21a'),
    bola([0.21, 0.09, 0.19], [0, 0.94, -0.19], '#7a5630'),
    capsula([0.07, 0.04, 0.14], [0, 0.91, -0.3], '#6a4a2a', { rot: [-0.4, 0, 0] }),
    bola([0.16, 0.15, 0.15], [0, 1.0, -0.04], '#22201e'),
    caixa([0.17, 0.035, 0.09], [0, 1.03, -0.02], BRANCO, 0.014),
    bola([0.05, 0.035, 0.08], [0, 0.98, 0.06], '#3a3230'),
  ],
  coelho: [
    // sapo-cururu: gordinho e achatado, barriga creme e verruguinhas
    bola([0.46, 0.26, 0.42], [0, 0.15, -0.04], '#6e8a1e'),
    bola([0.34, 0.12, 0.3], [0, 0.09, 0.05], '#f2e2a4'),
    ...par(bola, [0.07, 0.04, 0.07], [0.1, 0.27, -0.1], '#4a5a14'),
    // cabeça larga com olhos dourados saltados no alto
    bola([0.42, 0.24, 0.3], [0, 0.25, 0.12], '#7c9626', CAB),
    ...par(bola, [0.16, 0.16, 0.15], [0.11, 0.36, 0.14], '#ffb81c', CAB),
    ...par(bola, [0.11, 0.12, 0.06], [0.11, 0.37, 0.2], OLHO, CAB),
    ...par(bola, [0.04, 0.04, 0.03], [0.09, 0.4, 0.225], BRANCO, { ...CAB, brilho: 0.5 }),
    // bocão sorridente e bochechas
    capsula([0.28, 0.025, 0.03], [0, 0.21, 0.262], '#4a3a14', CAB),
    ...par(bola, [0.08, 0.05, 0.03], [0.15, 0.24, 0.245], BOCHECHA, CAB),
    // patas de trás dobradas (pulam) e mãozinhas da frente
    ...par(bola, [0.15, 0.13, 0.28], [0.18, 0.07, -0.08], '#62781a', {}, ['perna0', 'perna1']),
    ...par(capsula, [0.09, 0.2, 0.09], [0.13, 0.1, 0.17], '#62781a'),
  ],
  peixe: [
    // lambari prateado gordinho: costas verde-azuladas, barriga branca
    bola([0.15, 0.2, 0.34], [0, 0.15, 0], '#cfdde4'),
    bola([0.11, 0.07, 0.26], [0, 0.215, -0.02], '#5f9a98'),
    bola([0.12, 0.09, 0.24], [0, 0.1, 0.03], '#f6fafa'),
    // rabo vermelho em duas pontas (abana), mancha vermelha na base
    caixa([0.03, 0.12, 0.12], [0, 0.2, -0.22], '#f0402a', 0.014, {
      papel: 'cauda',
      rot: [0.55, 0, 0],
    }),
    caixa([0.03, 0.12, 0.12], [0, 0.1, -0.22], '#f0402a', 0.014, {
      papel: 'cauda',
      rot: [-0.55, 0, 0],
    }),
    bola([0.08, 0.08, 0.08], [0, 0.15, -0.16], '#e83a24'),
    // barbatanas: de cima laranja e dos lados
    caixa([0.025, 0.08, 0.11], [0, 0.265, -0.03], '#ffa030', 0.012, { rot: [-0.35, 0, 0] }),
    ...par(bola, [0.02, 0.05, 0.08], [0.075, 0.11, 0.03], '#ffb050', { rot: [0, 0.4, 0.5] }),
    // olhos de bolinha com brilho, bochechas e boquinha
    ...par(bola, [0.045, 0.09, 0.09], [0.062, 0.175, 0.09], OLHO),
    ...par(bola, [0.02, 0.03, 0.03], [0.083, 0.195, 0.11], BRANCO, { brilho: 0.5 }),
    ...par(bola, [0.015, 0.03, 0.04], [0.065, 0.125, 0.115], BOCHECHA),
    bola([0.05, 0.035, 0.03], [0, 0.14, 0.172], '#e87888'),
  ],
  espectro: [
    // redemoinho de poeira fosforescente em volta do pé (opaco, pastel)
    bola([0.54, 0.06, 0.54], [0, 0.03, 0], '#e6dcff', { brilho: 0.3, papel: 'cauda' }),
    bola([0.11, 0.11, 0.11], [0.24, 0.12, 0.08], '#d8f6ec', { brilho: 0.4 }),
    bola([0.09, 0.09, 0.09], [-0.2, 0.22, -0.12], '#fff0c8', { brilho: 0.4 }),
    bola([0.07, 0.07, 0.07], [0.12, 0.3, -0.22], '#e6dcff', { brilho: 0.4 }),
    // uma perna só, pezinho redondo
    capsula([0.16, 0.38, 0.16], [0, 0.22, 0], '#d08858'),
    bola([0.2, 0.1, 0.27], [0, 0.05, 0.05], '#b87a54'),
    // calção coral e tronquinho
    bola([0.4, 0.22, 0.32], [0, 0.46, 0], '#ff8a74'),
    bola([0.36, 0.34, 0.28], [0, 0.66, 0], '#d08858'),
    // braços (balançam como pernas)
    ...par(capsula, [0.11, 0.34, 0.11], [0.21, 0.6, 0], '#d08858', { rot: [0, 0, 0.18] }, [
      'perna0',
      'perna1',
    ]),
    // cabeção redondo de sorriso largo e olhinhos que brilham no escuro
    bola([0.62, 0.56, 0.54], [0, 1.07, 0.02], '#d89464', CAB),
    ...par(bola, [0.17, 0.18, 0.07], [0.13, 1.1, 0.27], '#fff6dc', { ...CAB, brilho: 0.5 }),
    ...par(bola, [0.1, 0.12, 0.05], [0.13, 1.09, 0.3], OLHO, CAB),
    ...par(bola, [0.04, 0.04, 0.03], [0.11, 1.13, 0.325], BRANCO, { ...CAB, brilho: 0.55 }),
    bola([0.07, 0.06, 0.05], [0, 1.0, 0.3], '#c07a58', CAB),
    capsula([0.22, 0.05, 0.04], [0, 0.92, 0.26], BRANCO, { ...CAB, brilho: 0.4 }),
    ...par(bola, [0.11, 0.07, 0.04], [0.21, 0.98, 0.24], BOCHECHA, CAB),
    // gorrinho vermelho pontudo, caído para trás, com a pontinha acesa
    bola([0.6, 0.36, 0.54], [0, 1.34, -0.01], '#f04438', CAB),
    capsula([0.62, 0.1, 0.56], [0, 1.24, 0.01], '#e8443c', CAB),
    capsula([0.3, 0.36, 0.3], [0, 1.55, -0.1], '#f44e40', { ...CAB, rot: [-0.6, 0, 0] }),
    capsula([0.17, 0.26, 0.17], [0, 1.68, -0.26], '#f44e40', { ...CAB, rot: [-1.1, 0, 0] }),
    bola([0.13, 0.13, 0.13], [0, 1.72, -0.38], '#ffc4b8', { ...CAB, brilho: 0.45 }),
  ],
  raposa: [
    // lobo-guará: pernas de meia preta, corpo laranja e juba escura na nuca
    ...par(capsula, [0.12, 0.5, 0.12], [0.08, 0.25, 0.12], '#2a1e18', {}, ['perna0', 'perna1']),
    ...par(capsula, [0.12, 0.5, 0.12], [0.08, 0.25, -0.2], '#2a1e18', {}, ['perna1', 'perna0']),
    bola([0.34, 0.32, 0.62], [0, 0.56, -0.04], '#ee6a1c'),
    bola([0.24, 0.12, 0.44], [0, 0.44, -0.02], '#ffc890'),
    capsula([0.2, 0.32, 0.2], [0, 0.72, 0.24], '#ee6a1c', { rot: [0.5, 0, 0] }),
    capsula([0.12, 0.1, 0.34], [0, 0.79, 0.14], '#2e2018', { rot: [-0.55, 0, 0] }),
    // cabeção com focinho de ponta preta e babador branco
    bola([0.4, 0.36, 0.38], [0, 0.86, 0.36], '#f27424', CAB),
    bola([0.18, 0.14, 0.2], [0, 0.8, 0.56], '#ffb070', CAB),
    bola([0.08, 0.06, 0.05], [0, 0.835, 0.66], OLHO, CAB),
    bola([0.18, 0.1, 0.1], [0, 0.72, 0.47], '#fff4e6', CAB),
    // olhos de bolinha com brilho e bochechas
    ...par(bola, [0.09, 0.1, 0.06], [0.1, 0.92, 0.52], OLHO, CAB),
    ...par(bola, [0.03, 0.03, 0.02], [0.085, 0.945, 0.548], BRANCO, { ...CAB, brilho: 0.5 }),
    ...par(bola, [0.09, 0.06, 0.03], [0.15, 0.83, 0.5], BOCHECHA, CAB),
    // orelhonas de guará, por dentro creme
    ...par(capsula, [0.17, 0.22, 0.07], [0.12, 1.0, 0.32], '#f27424', {
      ...CAB,
      rot: [0, 0, -0.35],
    }),
    ...par(capsula, [0.09, 0.13, 0.02], [0.12, 0.995, 0.365], '#ffcfa0', {
      ...CAB,
      rot: [0, 0, -0.35],
    }),
    // rabo fofo de ponta branca
    capsula([0.14, 0.14, 0.32], [0, 0.56, -0.44], '#ee6a1c', { papel: 'cauda', rot: [-0.5, 0, 0] }),
    bola([0.14, 0.14, 0.15], [0, 0.47, -0.6], '#fff4e6', { papel: 'cauda' }),
  ],
};
