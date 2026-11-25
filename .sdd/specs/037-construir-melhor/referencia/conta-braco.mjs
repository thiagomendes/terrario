// Estudo 037: a conta do braço na primeira pessoa (node .sdd/specs/037-construir-melhor/referencia/conta-braco.mjs)
//
// Tudo em blocos, com as medidas do boneco de verdade (o plano de `src/personagem/boneco.ts`, já
// com a escala 1,15). A câmera fica na origem, olhando para +z (x direita, y cima). O braço é
// rígido, como na terceira pessoa: do ombro à junta da mão L = 0,31; a mão é uma bola de raio
// 0,098; a manga, com a quina, tem meia grossura de 0,11. A direção do braço vem dos ângulos de
// junta do boneco (x leva para a frente; z abre para fora, negativo fecha para dentro):
// dir = (sen z, -cos z cos x, -cos z sen x), a mesma conta do `maosNoGuidao` do boneco.

const L = 0.31;
const RAIO_MAO = 0.098;
const MEIA_MANGA = 0.11;
const PERTO = 0.15;
const GRAU = Math.PI / 180;
const dir = (x, z) => [Math.sin(z), -Math.cos(z) * Math.cos(x), -Math.cos(z) * Math.sin(x)];

const TELAS = {
  emPe: { w: 390, h: 844, botoes: 652 },
  deitado: { w: 844, h: 390, botoes: 312 },
  computador: { w: 1280, h: 720, botoes: 720 },
};

/** As juntas da recomendação (rad). Os das outras ações vêm da terceira pessoa, no jogo. */
export const JUNTAS = {
  // segurar: o braço de comer (-1,5 para a frente, -0,75 para dentro, medido no jogo) baixado 15°
  segurar: [-1.24, -0.69],
  // o passo: o balanço da terceira pessoa (±0,49) vezes 0,12
  andandoFrente: [-1.24 - 0.06, -0.69],
  andandoTras: [-1.24 + 0.06, -0.69],
  // o pulo: o "abre" da terceira pessoa (+0,46) vezes 0,25
  pulando: [-1.24, -0.69 + 0.12],
  // colocar: o empurrão da terceira pessoa (-0,9) vezes 0,35
  colocando: [-1.24 - 0.32, -0.69],
  // acenar: o braço sobe para a frente e a mão abana com o balanço da terceira pessoa (±0,35)
  acenarA: [-2.2, -1.0 + 0.35],
  acenarB: [-2.2, -1.0 - 0.35],
  // comer: os ângulos de junta da terceira pessoa, medidos no jogo
  comendo: [-1.8, -0.69],
};

function projetar(p, tanV, aspecto, w, h) {
  const tanH = tanV * aspecto;
  return [(w / 2) * (1 + p[0] / (p[2] * tanH)), (h / 2) * (1 - p[1] / (p[2] * tanV))];
}
function foraPx(p, r, tanV, aspecto, w, h) {
  const [x, y] = projetar(p, tanV, aspecto, w, h);
  const rp = (r / (p[2] * tanV)) * (h / 2);
  return Math.max(-x, x - w, -y, y - h) - rp;
}

/**
 * Onde fica o ombro (fixo, no espaço da câmera) para uma tela e um campo de visão: a mão de segurar
 * cai no canto de baixo à direita, com o bloco acima dos botões; o ombro, com a grossura da manga,
 * fica fora da tela e na frente do plano de corte; e em todas as ações a mão inteira fica na tela.
 * Entre os que servem, o de mão menor (o mais longe).
 */
export function acharOmbro(tela, fov = 70) {
  const { w, h, botoes } = TELAS[tela];
  const aspecto = w / h;
  const tanV = Math.tan((fov / 2) * GRAU);
  const tanH = tanV * aspecto;
  const d0 = dir(...JUNTAS.segurar);
  let melhor = null;
  for (let tx = 0.2; tx <= 0.75; tx += 0.025)
    for (let ty = -0.45; ty <= -0.15; ty += 0.025)
      for (let z = 3; z >= 0.2; z -= 0.004) {
        const mao = [tx * z * tanH, ty * z * tanV, z];
        const ombro = mao.map((m, i) => m - d0[i] * L);
        if (ombro[2] < PERTO || foraPx(ombro, MEIA_MANGA, tanV, aspecto, w, h) < 4) continue;
        const maos = {};
        let ok = true;
        for (const [nome, [x, zz]] of Object.entries(JUNTAS)) {
          const d = dir(x, zz);
          const m = ombro.map((s, i) => s + d[i] * L);
          const [px, py] = projetar(m, tanV, aspecto, w, h);
          const r = (RAIO_MAO / (m[2] * tanV)) * (h / 2);
          maos[nome] = [Math.round(px), Math.round(py), Math.round(2 * r)];
          // a mão inteira na tela; segurando, o bloco (uma mão abaixo dela) acima dos botões
          if (m[2] < PERTO || px - r < 0 || px + r > w || py - r < 0 || py + r > h) ok = false;
          if (nome === 'segurar' && py + 2.2 * r > botoes - 8) ok = false;
        }
        if (!ok) continue;
        const diam = Math.round((RAIO_MAO / (z * tanV)) * h);
        if (!melhor || diam < melhor.maoPx)
          melhor = {
            tela,
            fov,
            maoPx: diam,
            ombro: ombro.map((v) => +v.toFixed(3)),
            folgaOmbroPx: Math.round(foraPx(ombro, MEIA_MANGA, tanV, aspecto, w, h)),
            maos,
          };
        break;
      }
  return melhor;
}

/**
 * A tabela da troca: para cada ângulo do braço para dentro (0° = para a frente, longe da câmera),
 * a menor mão possível (diâmetro, px) com o ombro fora da tela e a mão acima dos botões.
 */
export function tabela(tela, fov) {
  const { w, h, botoes } = TELAS[tela];
  const aspecto = w / h;
  const tanV = Math.tan((fov / 2) * GRAU);
  const tanH = tanV * aspecto;
  const linha = {};
  for (const dentro of [0, 10, 20, 30, 40, 50]) {
    let menor = null;
    for (let tx = 0.2; tx <= 0.7; tx += 0.05)
      for (let ty = -0.45; ty <= -0.15; ty += 0.05)
        for (let baixo = 0; baixo <= 30; baixo += 5) {
          const d = [-Math.sin(dentro * GRAU) * Math.cos(baixo * GRAU), -Math.sin(baixo * GRAU), Math.cos(dentro * GRAU) * Math.cos(baixo * GRAU)];
          for (let z = 3; z >= 0.2; z -= 0.004) {
            const mao = [tx * z * tanH, ty * z * tanV, z];
            const ombro = mao.map((m, i) => m - d[i] * L);
            if (ombro[2] < PERTO || foraPx(ombro, MEIA_MANGA, tanV, aspecto, w, h) < 4) continue;
            const r = (RAIO_MAO / (z * tanV)) * (h / 2);
            const py = (h / 2) * (1 - ty);
            if (py + 2.2 * r > botoes - 8 || (w / 2) * (1 + tx) + r > w) break;
            const diam = Math.round(2 * r);
            if (menor === null || diam < menor) menor = diam;
            break;
          }
        }
    linha[`${dentro}°`] = menor;
  }
  return linha;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const saida = {
    tabela: {
      emPe70: tabela('emPe', 70),
      emPe90: tabela('emPe', 90),
      deitado70: tabela('deitado', 70),
    },
    recomendacao: Object.keys(TELAS).map((t) => acharOmbro(t, 70)),
  };
  console.log(JSON.stringify(saida, null, 1));
}
