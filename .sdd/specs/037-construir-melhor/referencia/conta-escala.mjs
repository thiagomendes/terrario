// Estudo 037: a escala da primeira pessoa (node .sdd/specs/037-construir-melhor/referencia/conta-escala.mjs)
//
// O tamanho aparente do bloco à frente e o que se vê, para cada altura de olhos e campo de visão,
// na mesma cena da prancha: um bloco de 1×1×1 no chão a 1,5 bloco dos olhos (a face da frente) e
// uma parede de blocos a 3. Blocos; câmera na altura `h` acima do chão, olhando para a frente
// com a inclinação `pitch` (positiva para baixo). Campo de visão vertical (como o Babylon e o
// jogo de blocos de referência: Hor+, o horizontal sai da forma da tela).

import { visao } from './conta-visao.mjs';

const GRAU = Math.PI / 180;
export const TELAS = {
  emPe: { w: 390, h: 844, botoes: 652 },
  deitado: { w: 844, h: 390, botoes: 312 },
  computador: { w: 1280, h: 720, botoes: 640 },
};

/** Onde um ponto (x lado, y altura, z frente; a câmera na origem dos pés) cai na tela, em px. */
function projetar(p, h, pitch, fovV, tela) {
  const tanV = Math.tan((fovV / 2) * GRAU);
  const tanH = tanV * (tela.w / tela.h);
  const d = [p[0], p[1] - h, p[2]];
  const f = [0, -Math.sin(pitch), Math.cos(pitch)];
  const u = [0, Math.cos(pitch), Math.sin(pitch)];
  const z = d[1] * f[1] + d[2] * f[2];
  const yy = d[1] * u[1] + d[2] * u[2];
  return [(tela.w / 2) * (1 + d[0] / (z * tanH)), (tela.h / 2) * (1 - yy / (z * tanV)), z];
}

/** O bloco no chão com a face da frente a `dist` (centrado à frente): altura e largura na tela (% da tela) e onde fica o alto dele. */
export function bloco(dist, h, pitch, fovV, tela) {
  const cantos = [];
  for (const x of [-0.5, 0.5]) for (const y of [0, 1]) for (const z of [dist, dist + 1]) cantos.push(projetar([x, y, z], h, pitch, fovV, tela));
  const xs = cantos.map((c) => c[0]);
  const ys = cantos.map((c) => c[1]);
  return {
    alturaPct: +(((Math.max(...ys) - Math.min(...ys)) / tela.h) * 100).toFixed(1),
    larguraPct: +(((Math.max(...xs) - Math.min(...xs)) / tela.w) * 100).toFixed(1),
    // o alto do bloco: abaixo do horizonte (vê-se o tampo) ou na altura dos olhos
    altoPx: Math.round(Math.min(...ys)),
    tampoAparece: h > 1,
  };
}

/** Quanto a imagem estica na beira (a projeção plana): no alto e embaixo, e dos lados. */
export function deformacao(fovV, tela) {
  const tanV = Math.tan((fovV / 2) * GRAU);
  const fovH = 2 * Math.atan(tanV * (tela.w / tela.h));
  return {
    fovH: +(fovH / GRAU).toFixed(1),
    esticaAltoEmbaixo: +(1 / Math.cos((fovV / 2) * GRAU) ** 2).toFixed(2),
    esticaLados: +(1 / Math.cos(fovH / 2) ** 2).toFixed(2),
  };
}

/** A inclinação de entrada do esboço: o horizonte no terço de cima da tela. */
export const pitchDeEntrada = (fovV) => Math.atan(Math.tan((fovV / 2) * GRAU) / 3);

export function medir(h, fovV, telaNome, pitch = pitchDeEntrada(fovV)) {
  const tela = TELAS[telaNome];
  const v = telaNome === 'emPe' ? visao({ frente: 0, cima: h, pitch, fovV }) : null;
  return {
    altura: h,
    fovV,
    ...deformacao(fovV, tela),
    pitch: +pitch.toFixed(3),
    horizontePx: Math.round((tela.h / 2) * (1 - Math.tan(pitch) / Math.tan((fovV / 2) * GRAU))),
    bloco1: bloco(1, h, pitch, fovV, tela),
    bloco1_5: bloco(1.5, h, pitch, fovV, tela),
    bloco2: bloco(2, h, pitch, fovV, tela),
    bloco3: bloco(3, h, pitch, fovV, tela),
    bloco5: bloco(5, h, pitch, fovV, tela),
    ...(v ? { lajotasAte8: v.lajotasAte8, lajotaMaisPerto: v.lajotaMaisPerto } : {}),
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const fovHoje = (2 * Math.atan(Math.tan(25 * GRAU) / (390 / 844))) / GRAU;
  const saida = {
    hoje: {
      emPe: medir(1.21, +fovHoje.toFixed(1), 'emPe'),
      deitado: medir(1.21, 70, 'deitado'),
      computador: medir(1.21, 70, 'computador'),
    },
    referencia: {
      // o jogo de blocos de referência: olhos a 1,62 num corpo de 1,8, 70° na vertical, olhando reto
      computador: medir(1.62, 70, 'computador', 0),
      emPe: medir(1.62, 70, 'emPe', 0),
    },
    grade: [],
  };
  for (const h of [1.21, 1.45, 1.62]) for (const f of [70, 80, 90]) saida.grade.push(medir(h, f, 'emPe'));
  console.log(JSON.stringify(saida, null, 1));
}
