// Estudo 037: a conta da visão à frente (node .sdd/specs/037-construir-melhor/referencia/conta-visao.mjs)
//
// Quanto do chão à frente do boneco a criança vê, na terceira pessoa de hoje e na primeira, no
// celular em pé (390×844, os botões começam a 652 px). As câmeras foram medidas no jogo
// (`ESBOCO_PP=visao` em e2e/esboco-primeira-pessoa.spec.ts): de fora, 4,96 atrás dos pés, 2,28
// acima e 0,45 ao lado; de dentro, nos olhos, 0,35 à frente e 1,22 acima. Blocos; os pés na
// origem, z para a frente.

const GRAU = Math.PI / 180;
const W = 390;
const H = 844;
const BOTOES = 652;

/** O que uma câmera vê do chão à frente, acima dos botões. */
export function visao({ frente, cima, lado = 0, pitch, fovV }) {
  const tanV = Math.tan((fovV / 2) * GRAU);
  const tanH = tanV * (W / H);
  const c = [lado, cima, frente];
  const f = [0, -Math.sin(pitch), Math.cos(pitch)];
  const u = [0, Math.cos(pitch), Math.sin(pitch)];
  const r = [1, 0, 0];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const proj = (p) => {
    const d = [p[0] - c[0], p[1] - c[1], p[2] - c[2]];
    const z = dot(d, f);
    if (z <= 0.05) return null;
    return [(W / 2) * (1 + dot(d, r) / (z * tanH)), (H / 2) * (1 - dot(d, u) / (z * tanV))];
  };
  // o horizonte (px de cima): a direção reta para a frente
  const horizonte = Math.round((H / 2) * (1 - Math.tan(pitch) / tanV));
  // a lajota mais perto à frente que aparece acima dos botões, e quantas lajotas (de 1×1) à frente
  // do boneco, até 8 blocos, aparecem inteiras acima dos botões
  let perto = null;
  let lajotas = 0;
  for (let z = 0; z < 8; z++)
    for (let x = -8; x < 8; x++) {
      const cantos = [
        [x, 0, z],
        [x + 1, 0, z],
        [x, 0, z + 1],
        [x + 1, 0, z + 1],
      ].map(proj);
      if (cantos.some((p) => !p || p[0] < 0 || p[0] > W || p[1] < 0 || p[1] > BOTOES)) continue;
      lajotas++;
      if (x === -1 || x === 0) perto = perto === null ? z : Math.min(perto, z);
    }
  // a largura do chão que aparece a 3 e a 6 blocos à frente do boneco
  const largura = (d) => {
    const z = dot([-c[0], -c[1], d - c[2]], f);
    return +(2 * z * tanH).toFixed(2);
  };
  return {
    fovV,
    fovH: +((2 * Math.atan(tanH)) / GRAU).toFixed(1),
    pitch,
    horizonte,
    lajotaMaisPerto: perto,
    lajotasAte8: lajotas,
    largura3: largura(3),
    largura6: largura(6),
  };
}

/** As câmeras de fora, medidas no jogo em cada inclinação (a órbita sobe quando olha de cima). */
const FORA = {
  0.2: { frente: -4.959, cima: 2.275, lado: 0.45 },
  0.5: { frente: -4.441, cima: 3.696, lado: 0.45 },
};
const DENTRO = { frente: 0.345, cima: 1.222 };

/**
 * O que cada campo de visão e cada inclinação dá de dentro, com o horizonte na tela (olhando para
 * a frente): a tabela da troca. Nenhum chega perto da terceira pessoa (a câmera de fora fica 4 a
 * 5 blocos atrás e 2 a 4 acima: vê o chão em volta do boneco); passar de 100° na vertical deforma
 * muito as beiradas.
 */
export function tabela() {
  const linhas = [];
  for (const fovV of [70, 80, 90.5, 100]) {
    let melhor = null;
    for (let p = 0; p <= 0.45; p += 0.025) {
      const v = visao({ ...DENTRO, pitch: +p.toFixed(3), fovV });
      if (v.horizonte > H / 3 || v.horizonte < 0) continue;
      if (!melhor || v.lajotasAte8 > melhor.lajotasAte8) melhor = v;
    }
    linhas.push(melhor);
  }
  return linhas;
}

/**
 * A regra escolhida (`fovDeDentro` e `pitchDeEntrada` no esboço): o campo vertical de hoje (70°),
 * mas nunca menos que 50° na horizontal (no celular em pé, 90,5° na vertical); e, ao entrar, o
 * olhar para a frente, com o horizonte no terço de cima da tela.
 */
export function comparar() {
  const fovDentro = ((2 * Math.atan(Math.tan((25 * Math.PI) / 180) / (W / H))) * 180) / Math.PI;
  const pitchEntrada = Math.atan(Math.tan(((fovDentro / 2) * Math.PI) / 180) / 3);
  return {
    terceiraPessoa: { pitch02: visao({ ...FORA[0.2], pitch: 0.2, fovV: 70 }), pitch05: visao({ ...FORA[0.5], pitch: 0.5, fovV: 70 }) },
    dentroAntes: { pitch02: visao({ ...DENTRO, pitch: 0.2, fovV: 70 }), pitch05: visao({ ...DENTRO, pitch: 0.5, fovV: 70 }) },
    dentroDepois: visao({ ...DENTRO, pitch: +pitchEntrada.toFixed(3), fovV: +fovDentro.toFixed(1) }),
    tabelaDeDentro: tabela(),
  };
}

if (import.meta.url === `file://${process.argv[1]}`) console.log(JSON.stringify(comparar(), null, 1));
