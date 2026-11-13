import type { TipoCriatura } from '../../jogo/criaturas';
import type { MovimentoCriatura, PecaCriatura } from '../tipos';
import { bicho, DIAGONAL } from '../rancho-alegre/criaturas';

/**
 * Bichos da Cidade Grande (spec 014, T08), desenhados à mão como brinquedo (o mesmo jeito do
 * Rancho: caixas arredondadas e bolas, olhos de bolinha com brilho e bochechas), com as
 * caixas de colisão do jogo base: o cachorro grande do parque, o pombo da praça, a carpa do
 * lago, o guaxinim travesso da noite (manso: só faz "trrr" e foge) e o gato de rua.
 */

/** Cachorro grande: caramelo-dourado, orelhas caídas, focinho clarinho e coleira vermelha. */
function cachorroGrande(): PecaCriatura[] {
  const corpo = '#e0a85a';
  const claro = '#f6dcae';
  const b = bicho(1.5);
  for (const [x, z] of [
    [-0.14, 0.2],
    [0.14, 0.2],
    [-0.14, -0.2],
    [0.14, -0.2],
  ]) {
    const papel = DIAGONAL[`${Math.sign(x)},${Math.sign(z)}`];
    b.caixa([0.15, 0.26, 0.15], [x, 0.13, z], corpo, 0.07, { papel });
    b.caixa([0.16, 0.05, 0.18], [x, 0.025, z + 0.01], claro, 0.025, { papel });
  }
  b.caixa([0.44, 0.32, 0.66], [0, 0.4, 0], corpo, 0.15);
  // barriga clarinha e o rabo felpudo que abana
  b.bola(0.15, claro, [1.2, 0.6, 1.8], [0, 0.3, 0.02]);
  b.bola(0.07, corpo, [1, 1, 2.6], [0, 0.56, -0.4], { papel: 'cauda', rot: [-0.8, 0, 0] });
  b.bola(0.05, claro, [1, 1, 1.4], [0, 0.66, -0.5], { papel: 'cauda' });
  // coleira vermelha com a plaquinha dourada
  b.caixa([0.4, 0.07, 0.14], [0, 0.54, 0.26], '#d8433a', 0.03);
  b.bola(0.04, '#ffd45a', [1, 1, 0.5], [0, 0.48, 0.33]);
  b.grupo([0, 0.7, 0.36], 'cabeca');
  b.caixa([0.42, 0.38, 0.38], [0, 0, 0], corpo, 0.16);
  b.caixa([0.26, 0.17, 0.2], [0, -0.08, 0.2], claro, 0.08);
  b.bola(0.05, '#2a1f3a', [1.2, 0.9, 1], [0, -0.02, 0.31]);
  // a línguinha de cachorro contente
  b.bola(0.04, '#ff8fa3', [0.9, 0.5, 1.2], [0, -0.17, 0.27]);
  // orelhas caídas, macias, um tom mais escuro
  for (const s of [-1, 1])
    b.caixa([0.11, 0.26, 0.09], [s * 0.22, -0.02, -0.01], '#c88c44', 0.05, {
      rot: [0, 0, s * 0.25],
    });
  b.olhos(0.06, 0.19, 0.1, 0.05);
  return b.fim().pecas;
}

/** Pombo da praça: cinza-azulado, asas mais escuras, pescoço furta-cor e pezinhos rosa. */
function pombo(): PecaCriatura[] {
  const b = bicho(1.2);
  for (const s of [-1, 1]) {
    const papel: PecaCriatura['papel'] = s > 0 ? 'perna0' : 'perna1';
    b.caixa([0.035, 0.11, 0.035], [s * 0.06, 0.055, 0], '#ff9aa8', 0.015, { papel });
    b.caixa([0.08, 0.02, 0.09], [s * 0.06, 0.01, 0.03], '#ff9aa8', 0.01, { papel });
  }
  b.bola(0.17, '#9aa6b8', [1, 0.9, 1.25], [0, 0.24, 0]);
  b.bola(0.13, '#c3cad6', [0.9, 0.7, 1], [0, 0.2, 0.06]);
  // asas cinza-escuras com duas listrinhas (batem quando ele pula ou foge)
  for (const s of [-1, 1]) {
    const papel: PecaCriatura['papel'] = s > 0 ? 'asa0' : 'asa1';
    b.bola(0.1, '#7d889a', [0.35, 0.7, 1.25], [s * 0.15, 0.27, -0.03], { papel });
    b.caixa([0.02, 0.03, 0.12], [s * 0.185, 0.25, -0.06], '#4a5262', 0.01, { papel });
  }
  b.bola(0.09, '#6f7a8c', [0.7, 0.4, 1.1], [0, 0.3, -0.2], { papel: 'cauda', rot: [-0.3, 0, 0] });
  b.grupo([0, 0.38, 0.12], 'cabeca');
  // pescoço furta-cor (verde e lilás)
  b.bola(0.1, '#5fae8e', [1.05, 0.7, 1], [0, -0.04, -0.02]);
  b.bola(0.07, '#a58ccf', [1.1, 0.5, 1], [0, -0.08, 0.02]);
  b.bola(0.1, '#9aa6b8', [1, 1, 1], [0, 0.04, 0]);
  b.bola(0.03, '#3a3a44', [0.8, 0.7, 1.4], [0, 0.02, 0.11]);
  b.bola(0.02, '#ffffff', [1.2, 0.8, 0.8], [0, 0.05, 0.09]);
  b.olhos(0.06, 0.07, 0.055, 0.028, { bochecha: false, cor: '#e8752a' });
  return b.fim().pecas;
}

/** Carpa do lago: laranja com manchas brancas, barbatanas compridas e bigodinhos. */
function carpa(): PecaCriatura[] {
  const cor = '#ff8a3d';
  const b = bicho(0.85);
  b.grupo([0, 0.24, 0], undefined);
  b.bola(0.22, cor, [0.95, 0.75, 1.45], [0, 0, 0]);
  b.bola(0.15, '#fff3e6', [0.9, 0.5, 1.25], [0, -0.08, 0.03]);
  // manchas brancas nas costas, como as das carpas de lago
  for (const [x, z, r] of [
    [0.06, 0.08, 0.07],
    [-0.05, -0.12, 0.06],
  ])
    b.bola(r, '#fff6ee', [1.6, 0.5, 1.2], [x, 0.12, z]);
  b.caixa([0.04, 0.22, 0.18], [0, 0.03, -0.34], cor, 0.02, { papel: 'cauda', rot: [0.5, 0, 0] });
  b.caixa([0.04, 0.22, 0.18], [0, -0.03, -0.34], cor, 0.02, { papel: 'cauda', rot: [-0.5, 0, 0] });
  b.caixa([0.03, 0.12, 0.18], [0, 0.17, -0.02], '#ffb07a', 0.015);
  for (const s of [-1, 1]) {
    b.bola(0.06, '#ffb07a', [0.3, 0.6, 1.1], [s * 0.19, -0.06, 0.06], { rot: [0, s * 0.5, 0] });
    // bigodinho
    b.caixa([0.015, 0.015, 0.08], [s * 0.04, -0.06, 0.32], '#e8752a', 0.007, {
      rot: [0.4, s * 0.5, 0],
    });
  }
  b.olhos(0.04, 0.18, 0.11, 0.04, { bochecha: false });
  b.bola(0.03, '#d85a2a', [1.2, 0.7, 0.6], [0, -0.03, 0.31]);
  return b.fim().pecas;
}

/**
 * Guaxinim travesso (a criatura da noite, mansa): cinza de barriga clara, a máscara preta em
 * volta dos olhos que brilham macio, focinho branco e o rabo listrado.
 */
function guaxinim(): PecaCriatura[] {
  const cinza = '#8e8a94';
  const escuro = '#3a3640';
  const b = bicho(1.45);
  for (const [x, z] of [
    [-0.1, 0.12],
    [0.1, 0.12],
    [-0.1, -0.12],
    [0.1, -0.12],
  ])
    b.caixa([0.1, 0.13, 0.1], [x, 0.065, z], escuro, 0.045, {
      papel: DIAGONAL[`${Math.sign(x)},${Math.sign(z)}`],
    });
  b.bola(0.2, cinza, [1, 0.85, 1.25], [0, 0.26, -0.02]);
  b.bola(0.13, '#d6d2da', [1, 0.7, 1.2], [0, 0.2, 0.05]);
  // o rabo listrado, felpudo e de pé
  for (let i = 0; i < 4; i++)
    b.bola(
      0.075,
      i % 2 === 0 ? cinza : escuro,
      [1, 1, 1.15],
      [0, 0.32 + i * 0.07, -0.28 - i * 0.05],
      {
        papel: 'cauda',
      },
    );
  b.grupo([0, 0.44, 0.2], 'cabeca');
  b.bola(0.16, cinza, [1.15, 0.95, 1], [0, 0, 0]);
  // orelhinhas redondas de ponta branca
  for (const s of [-1, 1]) {
    b.bola(0.055, cinza, [1, 1, 0.6], [s * 0.12, 0.14, -0.02]);
    b.bola(0.03, '#ffffff', [1, 1, 0.5], [s * 0.12, 0.155, 0.005]);
  }
  // focinho branco com o narizinho preto
  b.bola(0.08, '#f2eef4', [1.1, 0.75, 1], [0, -0.05, 0.11]);
  b.bola(0.03, '#231a28', [1.2, 0.9, 1], [0, -0.03, 0.19]);
  // a máscara: uma faixa escura que passa pelos dois olhos
  b.bola(0.07, escuro, [2.3, 0.75, 0.4], [0, 0.03, 0.12]);
  b.olhos(0.03, 0.15, 0.065, 0.032, { cor: '#ffe9a8', brilho: 0.55 });
  return b.fim().pecas;
}

/** Gato de rua: malhado de laranja (com listras), focinho branco, orelhas em pé e rabo alto. */
function gato(): PecaCriatura[] {
  const laranja = '#f39a3c';
  const listra = '#d4762a';
  const b = bicho(1.25);
  for (const [x, z] of [
    [-0.09, 0.13],
    [0.09, 0.13],
    [-0.09, -0.13],
    [0.09, -0.13],
  ]) {
    const papel = DIAGONAL[`${Math.sign(x)},${Math.sign(z)}`];
    b.caixa([0.09, 0.18, 0.09], [x, 0.09, z], laranja, 0.04, { papel });
    b.caixa([0.1, 0.04, 0.11], [x, 0.02, z + 0.005], '#ffffff', 0.02, { papel });
  }
  b.caixa([0.28, 0.22, 0.44], [0, 0.27, 0], laranja, 0.1);
  for (const z of [-0.1, 0.02, 0.13]) b.caixa([0.29, 0.04, 0.05], [0, 0.34, z], listra, 0.02);
  b.bola(0.1, '#ffffff', [1.2, 0.6, 1.6], [0, 0.2, 0.04]);
  // o rabo bem alto, com a ponta curvada
  b.caixa([0.05, 0.3, 0.05], [0, 0.48, -0.25], laranja, 0.025, {
    papel: 'cauda',
    rot: [-0.25, 0, 0],
  });
  b.bola(0.04, listra, [1, 1, 1], [0, 0.64, -0.28], { papel: 'cauda' });
  b.grupo([0, 0.46, 0.22], 'cabeca');
  b.caixa([0.3, 0.26, 0.26], [0, 0, 0], laranja, 0.11);
  b.caixa([0.31, 0.04, 0.05], [0, 0.1, 0.0], listra, 0.02);
  b.bola(0.08, '#ffffff', [1.2, 0.75, 0.8], [0, -0.06, 0.12]);
  b.bola(0.025, '#ff8fa3', [1.2, 0.9, 0.8], [0, -0.02, 0.17]);
  for (const s of [-1, 1]) {
    // orelhas em pé (triangulinho: caixa girada) com o rosinha de dentro
    b.caixa([0.09, 0.1, 0.04], [s * 0.1, 0.16, -0.01], laranja, 0.02, { rot: [0, 0, s * 0.55] });
    b.caixa([0.05, 0.06, 0.02], [s * 0.1, 0.155, 0.012], '#ffb3c1', 0.01, {
      rot: [0, 0, s * 0.55],
    });
    // bigodes
    b.caixa([0.12, 0.008, 0.008], [s * 0.11, -0.05, 0.15], '#ffffff', 0.004, {
      rot: [0, 0, s * 0.12],
    });
  }
  b.olhos(0.03, 0.135, 0.075, 0.038, { cor: '#3a5a2a' });
  return b.fim().pecas;
}

export const CRIATURAS_CIDADE: Record<TipoCriatura, PecaCriatura[]> = {
  cervo: cachorroGrande(),
  coelho: pombo(),
  peixe: carpa(),
  espectro: guaxinim(),
  raposa: gato(),
};

export const MOVIMENTO_CIDADE: Record<TipoCriatura, MovimentoCriatura> = {
  // o cachorrão trota balançando
  cervo: { saltita: 0.04, flutua: 0, ginga: 0.08 },
  // o pombo anda empurrando a cabeça para a frente a cada passo (pulinhos curtos)
  coelho: { saltita: 0.02, flutua: 0, ginga: 0.12, cabecada: 0.05 },
  peixe: { saltita: 0, flutua: 0, ginga: 0.12 },
  // o guaxinim anda de mansinho, rebolando
  espectro: { saltita: 0.01, flutua: 0, ginga: 0.14 },
  // o gato anda macio
  raposa: { saltita: 0.02, flutua: 0, ginga: 0.05 },
};
