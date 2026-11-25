// Estudo 037: a mão do celular deitado no mesmo tamanho das outras telas
// (node .sdd/specs/037-construir-melhor/referencia/conta-deitado.mjs)
//
// A régua: a mão em pé tem 76 px CSS; no mesmo celular, deitado, ela fica com os mesmos 76 px (o
// mesmo tamanho na mão da criança). A conta procura, com a interface de verdade (os retângulos
// medidos no jogo, T08b), onde a mão e o item cabem nesse tamanho, com o ombro fora da tela, para
// cada jeito de segurar (os ângulos de junta do braço). O braço pode passar atrás dos botões (a
// manga some atrás deles); a mão e o item, não. O aceno pode sair pela beira e o comer (0,7 s)
// pode passar atrás da interface.

import { ombroServe, acoesDe, direcaoDoBraco, BRACO, RAIO_MAO, SEGURAR, FOV_BRACO } from '../../../../src/render/contaOmbro.ts';

const W = 844;
const H = 390;
const tanV = Math.tan(FOV_BRACO / 2);
const tanH = tanV * (W / H);
const grau = (fov, h, px) => (2 * Math.atan(px / 2 / (h / 2 / Math.tan(((fov / 2) * Math.PI) / 180))) * 180) / Math.PI;

console.log('O tamanho da mão (diâmetro):');
for (const [nome, fov, h, px] of [
  ['em pé (aprovado)', 80, 844, 76],
  ['computador (aprovado)', 70, 720, 103],
  ['deitado hoje (t08b)', 70, 390, 24],
  ['deitado antes (t08)', 70, 390, 59],
  ['deitado com os 76 px do em pé', 70, 390, 76],
])
  console.log(`  ${nome}: ${px} px = ${grau(fov, h, px).toFixed(1)}° da visão = ${((100 * px) / h).toFixed(1)}% da altura`);

const HOJE = [[157, 312, 687, 378], [8, 8, 52, 52], [740, 58, 834, 152], [14, 268, 126, 380], [714, 324, 770, 380], [778, 324, 834, 380], [60, 8, 104, 52], [782, 162, 830, 210], [112, 8, 156, 52], [270, 10, 570, 38]];
// a opção A: a barra no alto, a bússola logo abaixo, o mapinha e a mochila na esquerda
const BARRA_NO_ALTO = [[165, 6, 695, 72], [8, 8, 52, 52], [60, 8, 104, 52], [112, 8, 156, 52], [8, 58, 102, 152], [110, 104, 158, 152], [14, 268, 126, 380], [714, 324, 770, 380], [778, 324, 834, 380], [280, 80, 580, 104]];

/** Os lugares (px) onde a mão de `px` cabe, com um segurar, numa interface. */
function lugares(px, seg, obstaculos, { soMao = false, botoes = 324 } = {}) {
  const z = (RAIO_MAO / (tanV * px)) * H;
  const d0 = direcaoDoBraco(seg[0], seg[1]);
  const acoes = acoesDe(seg).filter((_, i) => i !== 5 && i !== 6 && i !== 7);
  const T = { w: W, h: H, botoes, obstaculos, soMao };
  const achados = [];
  for (let x = 300; x <= 840; x += 4)
    for (let y = 60; y <= 380; y += 4) {
      const o = [(x / (W / 2) - 1) * z * tanH - d0[0] * BRACO, (1 - y / (H / 2)) * z * tanV - d0[1] * BRACO, z - d0[2] * BRACO];
      // (o ombro fica abaixo dos olhos, como no boneco: nada de braço pendurado do alto da tela)
      if (o[1] > 0) continue;
      // (sem interface, o bloco ainda fica acima da faixa dos botões de baixo, como em pé)
      if (!obstaculos.length ? ombroServe(o, { w: W, h: H, botoes }, FOV_BRACO, acoes) : ombroServeCom(o, T, acoes)) achados.push([x, y]);
    }
  return achados;
}
/** O `ombroServe` com o item ignorado (soMao), como o do ramo do estudo. */
function ombroServeCom(o, T, acoes) {
  if (!T.soMao) return ombroServe(o, T, FOV_BRACO, acoes);
  if (!ombroServe(o, { w: T.w, h: T.h, botoes: T.botoes }, FOV_BRACO, acoes)) return false;
  for (const [x, z] of acoes) {
    const d = direcaoDoBraco(x, z);
    const m = [o[0] + d[0] * BRACO, o[1] + d[1] * BRACO, o[2] + d[2] * BRACO];
    const px = (W / 2) * (1 + m[0] / (m[2] * tanH));
    const py = (H / 2) * (1 - m[1] / (m[2] * tanV));
    const r = (RAIO_MAO / (m[2] * tanV)) * (H / 2);
    for (const q of T.obstaculos) {
      const cx = Math.max(q[0], Math.min(px, q[2]));
      const cy = Math.max(q[1], Math.min(py, q[3]));
      if (Math.hypot(px - cx, py - cy) < r + 6) return false;
    }
  }
  return true;
}

// 1. sem interface nenhuma, com qualquer jeito de segurar: até onde a mão de 76 px chega para o meio
let maisAEsquerda = Infinity;
for (let sx = -2.3; sx <= -0.6; sx += 0.1)
  for (let sz = -1.3; sz <= 0.4; sz += 0.1) {
    const l = lugares(76, [sx, sz], []);
    // (a mão na parte de baixo da tela, como nas outras telas)
    for (const [x, y] of l) if (y >= 150) maisAEsquerda = Math.min(maisAEsquerda, x);
  }
console.log(`\n1. Sem interface, com qualquer jeito de segurar, a mão de 76 px (na parte de baixo) não chega à esquerda de x = ${maisAEsquerda} px`);
console.log('   (o braço é rígido e curto, 1,6 mão: com o ombro fora da tela, a mão fica a no máximo uns 2 diâmetros da beira)');

// 2. com a interface de hoje
const hoje = lugares(76, SEGURAR, HOJE);
const hojeSoMao = lugares(76, SEGURAR, HOJE, { soMao: true });
console.log(`\n2. Interface de hoje: ${hoje.length} lugares com a mão e o item fora dela; ${hojeSoMao.length} só com a mão fora (o item passa atrás da mochila)`);
if (hoje.length) console.log('   com o item fora, o mais baixo:', hoje.sort((a, b) => b[1] - a[1])[0], '(no alto da tela, colado na bússola)');
if (hojeSoMao.length) console.log('   o mais baixo e à direita:', hojeSoMao.sort((a, b) => b[1] - a[1] || b[0] - a[0])[0]);

// 3. com a barra no alto
const alto = lugares(76, SEGURAR, BARRA_NO_ALTO);
console.log(`\n3. Barra no alto: ${alto.length} lugares com a mão e o item fora da interface`);
if (alto.length) console.log('   o mais baixo e à direita:', alto.sort((a, b) => b[1] - a[1] || b[0] - a[0])[0]);
