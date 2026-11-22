import type { TipoCriatura } from '../../jogo/criaturas';
import type { MovimentoCriatura, PecaCriatura } from '../tipos';
import { bicho } from '../rancho-alegre/criaturas';

/**
 * Os bichos da Noite das Fantasias (spec 027), no padrão dos bichos do jogo (o montador
 * `bicho(k)` do Rancho, caixas arredondadas e bolas, olhos de bolinha com brilho), com as caixas
 * de colisão do jogo base e nenhum repetido de outro mundo:
 * - a abóbora saltitante (no lugar do cervo), de perninhas curtas, pulando na horta;
 * - o morceguinho (no lugar do coelho), lilás de barriga creme e asa redonda, que voa baixinho;
 * - o sapinho de chapeuzinho (no lugar da raposa, o bicho de domar), atrás de quem tem uva;
 * - o peixinho lilás do laguinho do bosque;
 * - o fantasminha de lençol pastel (no lugar do espectro), manso, que brilha de leve e sorri.
 * Tudo sorrindo, nada pontudo de dar medo. A paleta do mundo: roxo, laranja, verde-oliva e
 * dourado (nunca na ordem do arco-íris).
 */
export const COR_BAILE = {
  roxo: '#6a3e9c',
  roxoEscuro: '#46305e',
  lilas: '#b9a0e0',
  laranja: '#ef8a2c',
  laranjaEscuro: '#c8621a',
  oliva: '#5f7d34',
  olivaEscuro: '#4a6326',
  olivaClaro: '#93a85a',
  creme: '#f6efe2',
  ouro: '#ffd45a',
} as const;

/** Abóbora saltitante: a abóbora de brinquedo com perninhas curtas e a carinha sorrindo. */
function aboboraSaltitante(): PecaCriatura[] {
  const b = bicho(1.1);
  for (const s of [-1, 1]) {
    const papel = s > 0 ? 'perna0' : 'perna1';
    b.caixa([0.06, 0.14, 0.06], [s * 0.085, 0.07, 0], COR_BAILE.oliva, 0.03, { papel });
    b.bola(0.045, COR_BAILE.olivaEscuro, [1, 0.65, 1.4], [s * 0.085, 0.02, 0.03], { papel });
  }
  b.bola(0.19, '#e07c1e', [1.15, 0.84, 1.1], [0, 0.3, 0]);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    b.bola(0.135, i % 2 ? '#f28c26' : '#e4801f', [0.62, 0.98, 1], [Math.sin(a) * 0.1, 0.3, Math.cos(a) * 0.1], {
      rot: [0, a, 0],
    });
  }
  // o cabinho e a folhinha balançam com a cabeça (a abóbora inteira é o corpo)
  b.grupo([0, 0.45, 0], 'cabeca');
  b.caixa([0.05, 0.09, 0.05], [0.01, 0.02, 0], '#6b7a2e', 0.02, { rot: [0, 0, -0.25] });
  b.bola(0.06, '#5cbf63', [1.6, 0.25, 1], [-0.06, 0, 0.02], { rot: [0, 0.4, 0.3] });
  b.fim();
  for (const s of [-1, 1]) {
    b.bola(0.036, '#3a1c0c', [0.85, 1.1, 0.45], [s * 0.075, 0.34, 0.215]);
    b.bola(0.012, '#ffffff', [1, 1, 0.5], [s * 0.075 + 0.012, 0.355, 0.23], { brilho: 0.3 });
    b.bola(0.03, '#ff9aa8', [1.4, 0.75, 0.3], [s * 0.14, 0.285, 0.2]);
  }
  // o sorriso de bolinhas (sem dente nenhum)
  for (let i = 0; i <= 4; i++) {
    const u = -1 + i / 2;
    b.bola(0.014, '#3a1c0c', [1.2, 1, 0.5], [u * 0.05, 0.27 - 0.02 * (1 - u * u), 0.225]);
  }
  return b.fim().pecas;
}

/**
 * Morceguinho lilás de barriga creme (de noite não some no céu roxo): asas grandes e redondas,
 * abertas, com a borda lilás clara; os pezinhos no chão quando pousa, e voa baixinho (o jeito de
 * andar flutua).
 */
function morceguinho(): PecaCriatura[] {
  const corpo = '#9b80d6';
  const asa = '#8a6dc9';
  // T12: a borda das asas bem clara (de longe, de noite, o contorno do morceguinho se lê no céu
  // roxo e no chão: antes ele virava uma mancha roxa)
  const borda = '#ece2ff';
  // (do tamanho do esboço: a régua da largura do papel coelho não deixa crescer mais)
  const b = bicho(1.3);
  for (const s of [-1, 1]) b.bola(0.025, '#6b52a8', [1, 0.8, 1.2], [s * 0.035, 0.02, 0.02]);
  b.bola(0.1, corpo, [1, 1.1, 0.9], [0, 0.13, 0]);
  b.bola(0.075, COR_BAILE.creme, [1, 1.2, 0.55], [0, 0.12, 0.06]);
  for (const s of [-1, 1]) {
    const papel = s > 0 ? 'asa0' : 'asa1';
    // T12: a asa maior e mais aberta, em leque: a membrana redonda, a borda clara que sobra em
    // volta dela (por baixo e pela ponta) e o bracinho por cima
    b.bola(0.215, borda, [1.06, 0.64, 0.12], [s * 0.27, 0.15, -0.014], { papel });
    b.bola(0.19, asa, [1, 0.6, 0.14], [s * 0.26, 0.175, -0.01], { papel });
    b.caixa([0.42, 0.026, 0.026], [s * 0.26, 0.27, 0], '#6b52a8', 0.013, { papel, rot: [0, 0, s * 0.12] });
  }
  b.grupo([0, 0.27, 0.01], 'cabeca');
  b.bola(0.1, corpo, [1.12, 1, 1], [0, 0, 0]);
  for (const s of [-1, 1]) {
    // as orelhinhas de ponta redonda (um losango meio enterrado: só a ponta de cima aparece)
    b.caixa([0.09, 0.09, 0.035], [s * 0.065, 0.075, -0.01], corpo, 0.014, { rot: [0, 0, Math.PI / 4 - s * 0.2] });
    b.caixa([0.045, 0.045, 0.02], [s * 0.065, 0.085, 0.01], '#ffb3c1', 0.008, { rot: [0, 0, Math.PI / 4 - s * 0.2] });
  }
  // T12: os olhinhos claros (o disco creme atrás da bolinha escura: de longe, dois pontinhos de
  // luz na carinha)
  for (const s of [-1, 1]) b.bola(0.034, COR_BAILE.creme, [1, 1.05, 0.35], [s * 0.042, 0.012, 0.088]);
  b.olhos(0.01, 0.09, 0.042, 0.026);
  for (const [x, y] of [
    [-0.022, -0.03],
    [0, -0.04],
    [0.022, -0.03],
  ])
    b.bola(0.011, '#4a2a5a', [1.3, 1, 0.5], [x, y, 0.1]);
  return b.fim().pecas;
}

/**
 * Sapinho de chapeuzinho: verde-oliva de olhões grandes no alto da cabeça, a barriga creme, as
 * perninhas dobradas e o chapeuzinho pontudo roxo (de festa, com a fita laranja).
 */
function sapinho(): PecaCriatura[] {
  const verde = '#6f9a3a';
  const escuro = '#55782c';
  const b = bicho(1.15);
  for (const [x, z, papel] of [
    [0.12, 0.08, 'perna0'],
    [-0.12, 0.08, 'perna1'],
    [0.14, -0.08, 'perna1'],
    [-0.14, -0.08, 'perna0'],
  ] as const) {
    b.bola(0.06, escuro, [1, 0.7, 1.3], [x, 0.04, z], { papel });
    b.bola(0.045, verde, [1.4, 0.5, 1.2], [x * 1.05, 0.02, z + 0.04], { papel });
  }
  b.bola(0.17, verde, [1.1, 0.8, 1.1], [0, 0.15, -0.02]);
  b.bola(0.12, COR_BAILE.creme, [1.05, 0.75, 0.6], [0, 0.12, 0.08]);
  b.grupo([0, 0.27, 0.04], 'cabeca');
  b.bola(0.14, verde, [1.15, 0.78, 1], [0, 0, 0]);
  for (const s of [-1, 1]) {
    // os olhões em cima da cabeça, amigáveis, olhando de frente para quem chega (portão da T24:
    // a pupila no meio do olho e um pouco para dentro, com o brilho grande; de lado, os olhos
    // saltados com a boca reta lembravam a adultos o sapo de um meme)
    b.bola(0.06, verde, [1, 1, 1], [s * 0.075, 0.08, 0.04]);
    b.bola(0.048, '#ffffff', [1, 1, 0.6], [s * 0.075, 0.085, 0.077]);
    b.bola(0.03, '#231a28', [1, 1.1, 0.5], [s * 0.068, 0.083, 0.102], { brilho: 0.35 });
    b.bola(0.013, '#ffffff', [1, 1, 0.5], [s * 0.068 + 0.011, 0.097, 0.116], { brilho: 0.4 });
    b.bola(0.006, '#ffffff', [1, 1, 0.5], [s * 0.068 - 0.009, 0.072, 0.116], { brilho: 0.4 });
    b.bola(0.03, '#ff9aa8', [1.4, 0.75, 0.3], [s * 0.1, -0.02, 0.1]);
  }
  // o sorriso de sapo: curto e bem curvo, os cantos para cima
  for (let i = 0; i <= 6; i++) {
    const u = -1 + i / 3;
    b.bola(0.012, '#3a4a1c', [1.2, 1, 0.5], [u * 0.055, -0.022 - 0.035 * (1 - u * u), 0.121 + 0.008 * u * u]);
  }
  // o chapeuzinho pontudo: a aba, o cone em degraus redondos e a fita laranja
  b.bola(0.08, COR_BAILE.roxo, [1, 0.18, 1], [-0.01, 0.1, -0.02]);
  b.caixa([0.1, 0.07, 0.1], [-0.01, 0.14, -0.02], COR_BAILE.roxo, 0.04);
  b.caixa([0.105, 0.025, 0.105], [-0.01, 0.12, -0.02], COR_BAILE.laranja, 0.012);
  b.caixa([0.07, 0.06, 0.07], [-0.015, 0.19, -0.025], COR_BAILE.roxo, 0.03, { rot: [0, 0, 0.12] });
  b.caixa([0.04, 0.05, 0.04], [-0.025, 0.235, -0.03], COR_BAILE.roxo, 0.02, { rot: [0, 0, 0.25] });
  b.bola(0.022, COR_BAILE.ouro, [1, 1, 1], [-0.035, 0.27, -0.03], { brilho: 0.2 });
  return b.fim().pecas;
}

/** Peixinho lilás do laguinho do bosque: lilás com a barriga creme e a cauda de véu dourada. */
function peixinhoLilas(): PecaCriatura[] {
  const cor = '#a987e0';
  const veu = '#ffcf6a';
  const b = bicho(0.8);
  b.grupo([0, 0.24, 0], undefined);
  b.bola(0.2, cor, [0.95, 0.85, 1.25], [0, 0, 0]);
  b.bola(0.14, COR_BAILE.creme, [0.9, 0.55, 1.1], [0, -0.08, 0.04]);
  b.caixa([0.03, 0.26, 0.22], [0, 0.05, -0.32], veu, 0.03, { papel: 'cauda', rot: [0.55, 0, 0] });
  b.caixa([0.03, 0.26, 0.22], [0, -0.05, -0.32], veu, 0.03, { papel: 'cauda', rot: [-0.55, 0, 0] });
  b.caixa([0.03, 0.12, 0.16], [0, 0.17, -0.02], veu, 0.015);
  for (const s of [-1, 1])
    b.bola(0.05, veu, [0.3, 0.6, 1.1], [s * 0.18, -0.06, 0.06], { rot: [0, s * 0.5, 0] });
  b.olhos(0.04, 0.17, 0.1, 0.042, { bochecha: false });
  b.bola(0.03, '#e07a9a', [1.2, 0.8, 0.6], [0, -0.03, 0.26]);
  return b.fim().pecas;
}

/**
 * Fantasminha de lençol pastel: sorridente, de barra ondulada e bracinhos, brilha de leve e
 * flutua (manso: nunca ataca, nunca dá susto). Bem diferente do fantasminha de bala do Doce Reino.
 */
function fantasminha(): PecaCriatura[] {
  const corpo = '#f4f0ff';
  const barra = '#e4dafa';
  const b = bicho(1);
  b.bola(0.3, corpo, [1, 1.02, 0.95], [0, 0.78, 0], { brilho: 0.3 });
  b.bola(0.27, corpo, [1, 0.9, 0.92], [0, 0.58, 0], { brilho: 0.3 });
  for (let i = 0; i < 6; i++) {
    const t = (i / 6) * Math.PI * 2 + 0.3;
    const papel = i % 2 ? 'perna0' : 'perna1';
    b.bola(0.1, barra, [1, 0.9, 1], [Math.sin(t) * 0.19, 0.37, Math.cos(t) * 0.18], { brilho: 0.3, papel });
  }
  for (const s of [-1, 1])
    b.bola(0.075, corpo, [0.8, 1.25, 0.8], [s * 0.29, 0.63, 0.05], { brilho: 0.3, rot: [0, 0, s * 0.6] });
  b.grupo([0, 0, 0], 'cabeca');
  for (const s of [-1, 1]) {
    b.bola(0.05, '#2a2240', [0.85, 1.1, 0.45], [s * 0.1, 0.82, 0.27]);
    b.bola(0.017, '#ffffff', [1, 1, 0.5], [s * 0.1 + 0.016, 0.845, 0.29], { brilho: 0.3 });
    b.bola(0.04, '#ffb0c4', [1.4, 0.75, 0.3], [s * 0.19, 0.73, 0.25]);
  }
  for (let i = 0; i <= 4; i++) {
    const u = -1 + i / 2;
    b.bola(0.016, '#5a3a7a', [1.2, 1, 0.5], [u * 0.06, 0.72 - 0.022 * (1 - u * u), 0.285]);
  }
  return b.fim().pecas;
}

export const CRIATURAS_FANTASIAS: Record<TipoCriatura, PecaCriatura[]> = {
  cervo: aboboraSaltitante(),
  coelho: morceguinho(),
  peixe: peixinhoLilas(),
  espectro: fantasminha(),
  raposa: sapinho(),
};

export const MOVIMENTO_FANTASIAS: Record<TipoCriatura, MovimentoCriatura> = {
  // a abóbora vai aos pulinhos, gingando
  cervo: { saltita: 0.16, flutua: 0, ginga: 0.16 },
  // o morceguinho voa baixinho, batendo as asas
  coelho: { saltita: 0.05, flutua: 0.2, ginga: 0.1 },
  peixe: { saltita: 0, flutua: 0, ginga: 0.12 },
  // o fantasminha flutua devagarinho
  espectro: { saltita: 0, flutua: 0.1, ginga: 0.06 },
  // o sapinho pula
  raposa: { saltita: 0.14, flutua: 0, ginga: 0.08 },
};
