import type { TipoCriatura } from '../../jogo/criaturas';
import type { MovimentoCriatura, PecaCriatura } from '../tipos';
import { bicho, DIAGONAL } from '../rancho-alegre/criaturas';

/**
 * Bichos da Vila Neon (spec 026), desenhados à mão como brinquedo (o jeito do Rancho e da
 * Cidade: caixas arredondadas e bolas, olhos de bolinha com brilho e bochechas), com as caixas
 * de colisão do jogo base: a lhama de franja, o coelhinho de topete, o cachorrinho de bandana,
 * o peixinho-dourado do lago e o ouricinho do moicano da noite (manso: faz "tsc-tsc", enrola
 * e rola para longe). Nada pontudo, nada de dar medo.
 */

/**
 * Lhama de franja: lã creme, pescoço comprido, a franja de cabelão vermelha caindo na testa,
 * orelhas de banana e a mantinha de duas cores (vermelha com a beirada azul-elétrica).
 */
function lhama(): PecaCriatura[] {
  const la = '#f2e6cf';
  const sombra = '#dccbb0';
  const b = bicho(1.4);
  for (const [x, z] of [
    [-0.12, 0.18],
    [0.12, 0.18],
    [-0.12, -0.18],
    [0.12, -0.18],
  ]) {
    const papel = DIAGONAL[`${Math.sign(x)},${Math.sign(z)}`];
    b.caixa([0.13, 0.3, 0.13], [x, 0.15, z], la, 0.06, { papel });
    b.caixa([0.14, 0.05, 0.15], [x, 0.025, z + 0.01], '#6a5444', 0.025, { papel });
  }
  b.caixa([0.4, 0.32, 0.6], [0, 0.44, 0], la, 0.15);
  // a mantinha: vermelha por cima, com a beirada azul-elétrica caindo dos lados
  b.caixa([0.42, 0.05, 0.3], [0, 0.615, -0.02], '#e8302a', 0.02);
  for (const s of [-1, 1]) b.caixa([0.03, 0.14, 0.3], [s * 0.215, 0.55, -0.02], '#2f8cff', 0.012);
  // o pescoço comprido de lã e o rabinho felpudo
  b.caixa([0.18, 0.4, 0.18], [0, 0.76, 0.22], la, 0.08);
  b.bola(0.08, sombra, [1, 1.1, 1], [0, 0.55, -0.32], { papel: 'cauda' });
  b.grupo([0, 1.0, 0.27], 'cabeca');
  b.caixa([0.26, 0.24, 0.28], [0, 0, 0], la, 0.11);
  b.caixa([0.18, 0.13, 0.14], [0, -0.06, 0.16], '#fff6e6', 0.06);
  b.bola(0.03, '#5a4038', [1.3, 0.8, 0.8], [0, -0.03, 0.235]);
  // orelhas de banana, em pé
  for (const s of [-1, 1])
    b.caixa([0.06, 0.18, 0.06], [s * 0.08, 0.17, -0.05], la, 0.03, { rot: [0, 0, s * -0.18] });
  // a franja de cabelão: vermelha, caindo reta na testa (nunca maior que a cabeça)
  b.caixa([0.24, 0.07, 0.16], [0, 0.135, 0.04], '#e8302a', 0.03);
  for (const x of [-0.07, 0, 0.07]) b.bola(0.035, '#e8302a', [1, 1.3, 0.7], [x, 0.09, 0.13]);
  b.olhos(0.03, 0.145, 0.075, 0.035);
  return b.fim().pecas;
}

/** Coelhinho de topete: branquinho, orelhas compridas, o topete loiro armado e o pompom. */
function coelhinho(): PecaCriatura[] {
  const pelo = '#f6f2ee';
  const rosa = '#ffb3c1';
  const b = bicho(1.0);
  for (const [x, z] of [
    [-0.08, 0.1],
    [0.08, 0.1],
    [-0.08, -0.08],
    [0.08, -0.08],
  ]) {
    const papel = DIAGONAL[`${Math.sign(x)},${Math.sign(z)}`];
    b.caixa([0.07, 0.08, z < 0 ? 0.12 : 0.07], [x, 0.04, z], pelo, 0.03, { papel });
  }
  b.bola(0.17, pelo, [1, 0.9, 1.15], [0, 0.2, 0]);
  b.bola(0.1, '#ffffff', [1, 0.8, 1], [0, 0.16, 0.07]);
  b.bola(0.06, '#ffffff', [1, 1, 1], [0, 0.24, -0.2], { papel: 'cauda' });
  b.grupo([0, 0.38, 0.1], 'cabeca');
  b.bola(0.13, pelo, [1.05, 0.95, 1], [0, 0, 0]);
  b.bola(0.025, rosa, [1.2, 0.9, 0.8], [0, -0.02, 0.13]);
  // orelhas compridas com o rosinha de dentro, um pouco abertas
  for (const s of [-1, 1]) {
    b.caixa([0.06, 0.2, 0.04], [s * 0.06, 0.2, -0.03], pelo, 0.025, { rot: [0, 0, s * -0.2] });
    b.caixa([0.03, 0.14, 0.02], [s * 0.06, 0.2, -0.01], rosa, 0.012, { rot: [0, 0, s * -0.2] });
  }
  // o topete armado: três bolinhas loiras, a da frente mais alta (o penteado da época)
  b.bola(0.05, '#ffd45a', [1.3, 1.1, 1.1], [0, 0.13, 0.05]);
  b.bola(0.045, '#ffd45a', [1.2, 1, 1], [0, 0.12, -0.02]);
  b.bola(0.04, '#ffe48a', [1, 1.2, 1], [0, 0.17, 0.08]);
  b.olhos(0.02, 0.11, 0.06, 0.03);
  return b.fim().pecas;
}

/** Cachorrinho de bandana: branquinho de orelhas caramelo e a bandana vermelha de bolinhas. */
function cachorrinho(): PecaCriatura[] {
  const corpo = '#f4eee6';
  const caramelo = '#d8964e';
  const b = bicho(1.1);
  for (const [x, z] of [
    [-0.13, 0.17],
    [0.13, 0.17],
    [-0.13, -0.17],
    [0.13, -0.17],
  ])
    b.caixa([0.14, 0.22, 0.14], [x, 0.11, z], corpo, 0.06, {
      papel: DIAGONAL[`${Math.sign(x)},${Math.sign(z)}`],
    });
  b.caixa([0.4, 0.3, 0.56], [0, 0.34, 0], corpo, 0.14);
  // uma mancha caramelo nas costas
  b.bola(0.12, caramelo, [1.2, 0.4, 1.3], [0.06, 0.48, -0.08]);
  b.bola(0.06, corpo, [1, 1, 2.4], [0, 0.5, -0.33], { papel: 'cauda', rot: [-0.8, 0, 0] });
  // a bandana no pescoço: vermelha, com a ponta caindo no peito e bolinhas brancas
  b.caixa([0.4, 0.07, 0.14], [0, 0.48, 0.22], '#e8302a', 0.03);
  b.caixa([0.16, 0.14, 0.04], [0, 0.4, 0.29], '#e8302a', 0.03, { rot: [0, 0, 0.78] });
  for (const [x, y] of [
    [-0.12, 0.49],
    [0.12, 0.49],
    [0, 0.41],
  ])
    b.bola(0.018, '#ffffff', [1, 1, 0.5], [x, y, 0.3]);
  b.grupo([0, 0.6, 0.3], 'cabeca');
  b.caixa([0.4, 0.36, 0.36], [0, 0, 0], corpo, 0.15);
  b.caixa([0.24, 0.16, 0.18], [0, -0.07, 0.19], '#fffaf2', 0.07);
  b.bola(0.045, '#2a1f3a', [1.2, 0.9, 1], [0, -0.02, 0.29]);
  b.bola(0.035, '#ff8fa3', [0.9, 0.5, 1.2], [0, -0.14, 0.26]);
  for (const s of [-1, 1])
    b.caixa([0.1, 0.22, 0.08], [s * 0.21, 0.02, 0], caramelo, 0.04, { rot: [0, 0, s * 0.35] });
  b.olhos(0.06, 0.18, 0.1, 0.048);
  return b.fim().pecas;
}

/** Peixinho-dourado do lago: laranja-dourado, a cauda de véu grande e a barriga clarinha. */
function peixinhoDourado(): PecaCriatura[] {
  const cor = '#ff9a1f';
  const veu = '#ffc04a';
  const b = bicho(0.8);
  b.grupo([0, 0.24, 0], undefined);
  b.bola(0.2, cor, [0.95, 0.85, 1.25], [0, 0, 0]);
  b.bola(0.14, '#ffe0a8', [0.9, 0.55, 1.1], [0, -0.08, 0.04]);
  // a cauda de véu, larga e macia, em duas folhas
  b.caixa([0.03, 0.26, 0.22], [0, 0.05, -0.32], veu, 0.03, { papel: 'cauda', rot: [0.55, 0, 0] });
  b.caixa([0.03, 0.26, 0.22], [0, -0.05, -0.32], veu, 0.03, { papel: 'cauda', rot: [-0.55, 0, 0] });
  b.caixa([0.03, 0.12, 0.16], [0, 0.17, -0.02], veu, 0.015);
  for (const s of [-1, 1])
    b.bola(0.05, veu, [0.3, 0.6, 1.1], [s * 0.18, -0.06, 0.06], { rot: [0, s * 0.5, 0] });
  b.olhos(0.04, 0.17, 0.1, 0.042, { bochecha: false });
  b.bola(0.03, '#e8602a', [1.2, 0.8, 0.6], [0, -0.03, 0.26]);
  return b.fim().pecas;
}

/**
 * Ouricinho do moicano (a criatura da noite, mansa): uma bolinha de pelúcia marrom-clara com
 * carocinhos redondos (nada de espinho), carinha creme, bochechas rosadas, pezinhos e o moicano
 * de barbatanas redondas azuis, que brilha de leve no escuro.
 */
function ouricinho(): PecaCriatura[] {
  const pelucia = '#b08a68';
  const caroco = '#9a7656';
  const azul = '#2f8cff';
  const b = bicho(1.4);
  for (const [x, z] of [
    [-0.08, 0.08],
    [0.08, 0.08],
    [-0.08, -0.08],
    [0.08, -0.08],
  ])
    b.caixa([0.07, 0.06, 0.08], [x, 0.03, z], '#e8c8a8', 0.03, {
      papel: DIAGONAL[`${Math.sign(x)},${Math.sign(z)}`],
    });
  b.bola(0.19, pelucia, [1.05, 0.9, 1.1], [0, 0.2, -0.02]);
  // carocinhos redondos de pelúcia nas costas
  for (const [x, y, z] of [
    [0.1, 0.3, -0.1],
    [-0.1, 0.3, -0.1],
    [0, 0.26, -0.19],
    [0.14, 0.2, -0.13],
    [-0.14, 0.2, -0.13],
  ])
    b.bola(0.035, caroco, [1, 1, 1], [x, y, z]);
  b.grupo([0, 0.2, 0.13], 'cabeca');
  b.bola(0.12, '#f2dcc0', [1.1, 1, 0.8], [0, 0, 0]);
  b.bola(0.035, '#3a2a30', [1.2, 1, 1], [0, -0.02, 0.1]);
  // o moicano: barbatanas redondas azuis em fila, da testa para trás (nada pontudo)
  for (const [y, z, r] of [
    [0.13, 0.0, 0.05],
    [0.16, -0.08, 0.06],
    [0.15, -0.17, 0.055],
    [0.11, -0.25, 0.045],
  ])
    b.bola(r, azul, [0.45, 1.1, 1], [0, y, z], { brilho: 0.4 });
  b.olhos(0.03, 0.08, 0.055, 0.028);
  return b.fim().pecas;
}

export const CRIATURAS_VILA: Record<TipoCriatura, PecaCriatura[]> = {
  cervo: lhama(),
  coelho: coelhinho(),
  peixe: peixinhoDourado(),
  espectro: ouricinho(),
  raposa: cachorrinho(),
};

export const MOVIMENTO_VILA: Record<TipoCriatura, MovimentoCriatura> = {
  // a lhama anda empinada, balançando o pescoço
  cervo: { saltita: 0.02, flutua: 0, ginga: 0.08, cabecada: 0.03 },
  // o coelhinho dá pulinhos
  coelho: { saltita: 0.09, flutua: 0, ginga: 0.14 },
  peixe: { saltita: 0, flutua: 0, ginga: 0.12 },
  // o ouricinho anda de mansinho, rebolando
  espectro: { saltita: 0.01, flutua: 0, ginga: 0.12 },
  // o cachorrinho trota contente
  raposa: { saltita: 0.04, flutua: 0, ginga: 0.06 },
};
