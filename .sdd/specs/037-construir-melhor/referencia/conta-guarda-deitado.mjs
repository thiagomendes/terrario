// Estudo 037 (portão, 3ª rodada): o guarda-chuva no celular deitado
// (node .sdd/specs/037-construir-melhor/referencia/conta-guarda-deitado.mjs)
//
// No deitado (844 × 390, campo de 70° na altura), a mão de 76 px fica na altura dos olhos, à
// direita, e o pano, 1,33 acima dela, sai do quadro: sobra o cabo e uma tirinha atrás da bússola.
// A conta procura a inclinação do cabo (para a frente e para dentro ou para fora) em que o pano
// entra no quadro como em pé: as pontinhas da beira à vista, abaixo da bússola, longe da mira.
// As medidas são as de verdade (escala 1,15); o olhar, 0,1 rad para baixo (o das fotos).

const E = 1.15;
const GRAU = Math.PI / 180;
const PITCH = 0.1;
const T = { w: 844, h: 390, fov: 70 * GRAU };
const tanV = Math.tan(T.fov / 2);
const tanH = tanV * (T.w / T.h);
/** A bússola e a casinha (px): o pano não fica atrás delas. */
const BUSSOLA = [270, 0, 574, 72];
/** A mira: o meio da tela, com uma folga de 12% da altura. */
const MIRA = { x: T.w / 2, y: T.h / 2, r: T.h * 0.12 };

const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a) => mul(a, 1 / Math.hypot(...a));
const doMundo = (v) => [v[0], v[1] * Math.cos(PITCH) + v[2] * Math.sin(PITCH), -v[1] * Math.sin(PITCH) + v[2] * Math.cos(PITCH)];
const naTela = (p) => (p[2] <= 0.1 ? null : [(T.w / 2) * (1 + p[0] / (p[2] * tanH)), (T.h / 2) * (1 - p[1] / (p[2] * tanV))]);

/** A mão (câmera) a partir do ponto na tela e do tamanho (px). */
function mao(x, y, px) {
  const z = (0.098 * T.h) / (px * tanV);
  return [(x / (T.w / 2) - 1) * z * tanH, (1 - y / (T.h / 2)) * z * tanV, z];
}

/** As peças do pano na tela: as 8 pontinhas da beira, o topo e um desenho em 24 × 4 pontos. */
function pano(m, frente, fora) {
  const eixo = doMundo([Math.sin(fora * GRAU), Math.cos(frente * GRAU) * Math.cos(fora * GRAU), Math.sin(frente * GRAU)]);
  const a = norm(eixo);
  const u = norm(cross([0, 0, 1], a));
  const w = cross(a, u);
  const R = 1.02 * E;
  const BASE = 1.16 * E;
  const ALT = 0.38 * E;
  const pt = (x, y, z) => add(m, add(add(mul(u, x), mul(a, y)), mul(w, z)));
  const pontas = [];
  const malha = [];
  for (let i = 0; i < 24; i++) {
    const t = (i / 24) * Math.PI * 2;
    for (let k = 1; k <= 4; k++) {
      const f = k / 4;
      malha.push(pt(Math.cos(t) * R * f, BASE + ALT * (1 - f), Math.sin(t) * R * f));
    }
    if (i % 3 === 0) pontas.push(pt(Math.cos(t) * R, BASE, Math.sin(t) * R));
  }
  return { pontas, malha, topo: pt(0, BASE + ALT, 0) };
}

function medir(m, frente, fora) {
  const { pontas, malha } = pano(m, frente, fora);
  const dentro = (q) => q && q[0] >= 0 && q[0] <= T.w && q[1] >= 0 && q[1] <= T.h;
  const naBussola = (q) => q[0] >= BUSSOLA[0] && q[0] <= BUSSOLA[2] && q[1] >= BUSSOLA[1] && q[1] <= BUSSOLA[3];
  const pontasVistas = pontas.map(naTela).filter((q) => dentro(q) && !naBussola(q)).length;
  const pts = malha.map(naTela).filter(dentro);
  const mira = pts.some((q) => Math.hypot(q[0] - MIRA.x, q[1] - MIRA.y) < MIRA.r);
  const bussola = pts.filter(naBussola).length / Math.max(1, pts.length);
  const fracao = pts.length / malha.length;
  const maisBaixo = Math.max(...pts.map((q) => q[1]), 0);
  return { pontasVistas, mira, bussola: +bussola.toFixed(2), fracao: +fracao.toFixed(2), maisBaixo: Math.round(maisBaixo) };
}

// a mão do deitado, como no jogo (t08c): (680, 261), 76 px; e a do em pé, para comparar
const deitado = mao(680, 261, 76);
console.log('deitado hoje (8° para a frente, 8° para fora):', medir(deitado, 8, 8));
// A régua: o pano não toca a mira nem fica atrás da bússola; pelo menos 3 das 8 pontinhas da
// beira à vista (como em pé); o cabo inclinado de um jeito que se segura (até 35° para a frente e
// 50° para fora); o pano acima de 60% da altura. Entre os que servem, o que mostra mais pano.
// (Para a frente, o pano entra no quadro já em cima da mira: a mão do deitado fica perto dos
// olhos, e o pano, de 1,17 de raio, ocupa quase a tela inteira de largura. Para fora, ele desce
// pelo canto de cima à direita, longe da mira e da bússola.)
const achados = [];
for (let frente = -20; frente <= 35; frente += 2)
  for (let fora = -40; fora <= 50; fora += 2) {
    const r = medir(deitado, frente, fora);
    if (r.mira || r.bussola > 0.02 || r.maisBaixo > T.h * 0.6 || r.pontasVistas < 3) continue;
    achados.push({ frente, fora, ...r });
  }
achados.sort((a, b) => b.fracao - a.fracao || a.fora - b.fora);
console.log('os que servem, do que mostra mais pano para o que mostra menos:');
for (const r of achados.slice(0, 10)) console.log(' ', JSON.stringify(r));
const mira0 = { ...medir(deitado, 40, 8), frente: 40, fora: 8 };
console.log('para comparar, 40° para a frente (o pano na mira):', JSON.stringify(mira0));
