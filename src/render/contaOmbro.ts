/**
 * Spec 037 (T04): a conta do ombro do braço da primeira pessoa. Pura, sem Babylon e sem DOM: a
 * mesma do estudo do braço (`.sdd/specs/037-construir-melhor/referencia/estudo-braco-primeira-pessoa.md`
 * e `conta-braco.mjs`) e do esboço aprovado pelo dono.
 *
 * O braço é o do boneco, rígido, no tamanho dele; ele gira num ombro fixo no espaço da câmera
 * (x direita, y cima, z frente). Para cada tela (largura, altura, o alto dos botões), a conta acha
 * o ombro: a mão de segurar no canto de baixo à direita, com o bloco acima dos botões; o ombro,
 * com a grossura da manga, fora da tela e na frente do plano de corte; e, em todas as ações, a mão
 * inteira na tela. Entre os que servem, o de mão menor; e, dele, a mão um tico maior (mais
 * antebraço), se couber. Sem solução, `null`: a mão some em vez de mostrar a ponta do braço.
 *
 * Desempenho: a busca bruta do esboço (cada distância de 0,006 em 23 × 13 pontos da tela) levava
 * de 10 a 28 ms no computador. Aqui, para cada ponto da tela, a distância anda de 0,03 em 0,03 e
 * só refina (de 0,006 em 0,006) perto das duas pontas do trecho que serve: o mesmo resultado, uma
 * fração das contas. E quem chama faz a conta fora do quadro e guarda por tela (`criarCacheOmbro`).
 */

export type Vec3 = [number, number, number];

/** O braço do boneco, já com a escala 1,15: do ombro à junta da mão e o raio da mão (blocos). */
export const ESCALA_BONECO = 1.15;
export const BRACO = 0.27 * ESCALA_BONECO;
export const RAIO_MAO = 0.085 * ESCALA_BONECO;
/** Meia grossura da manga com a quina (o que tem de ficar fora da tela junto com o ombro). */
export const MEIA_MANGA = 0.11;
/** O ombro nunca chega mais perto da câmera que isto (o plano de corte é 0,1). */
export const PERTO = 0.15;
/** Folga mínima (px) entre o ombro, com a manga, e a beira da tela. */
export const FOLGA_OMBRO_PX = 4;
/** A mão fica 1,2 vez a menor que a conta permite (mais antebraço), sem passar de 22% da largura. */
export const FATOR_MAO = 1.2;
export const MAO_MAX_LARGURA = 0.22;
/** O campo de visão em que o braço é medido (o braço aparece assim em qualquer campo de dentro). */
export const FOV_BRACO = (70 * Math.PI) / 180;

/**
 * Os ângulos de junta do braço (rad, como no boneco: x leva para a frente, z abre para fora;
 * negativo leva para dentro). Segurar é o "comer" da terceira pessoa (x −1,5, z −0,69, medido no
 * jogo) baixado 15°. O aceno sobe o braço para a frente, com o abano do boneco em volta de −1,0.
 */
export const SEGURAR: [number, number] = [-1.24, -0.69];
export const ACENAR: [number, number] = [-2.2, -1.0];
/** O quanto dos movimentos da terceira pessoa entra (passo, pulo, colocar, comer, golpe). */
export const GANHO_PASSO = 0.12;
export const GANHO_PULO = 0.25;
export const EMPURRAO_COLOCAR = -0.32;
export const GANHO_COMER_X = 0.37;
export const GANHO_COMER_Z = 0.3;
export const GANHO_GOLPE = 0.22;

/** As poses que a mão percorre a partir de um segurar (todas cabem na tela com o mesmo ombro). */
export function acoesDe(s: readonly [number, number]): readonly [number, number][] {
  return [
    [s[0], s[1]],
    // o passo (o balanço do boneco em escala)
    [s[0] - 0.06, s[1]],
    [s[0] + 0.06, s[1]],
    // o pulo
    [s[0], s[1] + 0.12],
    // o empurrão de colocar
    [s[0] + EMPURRAO_COLOCAR, s[1]],
    // o aceno, nos dois lados do abano
    [ACENAR[0], ACENAR[1] + 0.35],
    [ACENAR[0], ACENAR[1] - 0.35],
    // o comer
    [s[0] - 1.5 * GANHO_COMER_X, s[1] - 0.78 * GANHO_COMER_Z],
    // o golpe: o preparo (a mão sobe) e a batida (a mão desce)
    [s[0] - 1.1 * GANHO_GOLPE, s[1]],
    [s[0] + 1.5 * GANHO_GOLPE, s[1]],
  ];
}
/** As poses do segurar do esboço aprovado. */
export const ACOES: readonly [number, number][] = acoesDe(SEGURAR);

/** A direção do braço (do ombro para a mão) pelos ângulos de junta, como no boneco. */
export function direcaoDoBraco(x: number, z: number): Vec3 {
  return [Math.sin(z), -Math.cos(z) * Math.cos(x), -Math.cos(z) * Math.sin(x)];
}

/** Um retângulo da interface na tela (px CSS): esquerda, cima, direita, baixo. */
export type Retangulo = readonly [number, number, number, number];

export interface Tela {
  /** Largura e altura (px CSS). */
  w: number;
  h: number;
  /** O alto (px) dos botões e da barra na metade direita, embaixo. */
  botoes: number;
  /**
   * Os retângulos de verdade da interface (os botões, a barra, o mapinha). A mão e o item não
   * ficam atrás deles em nenhuma ação, a não ser no aceno, que passa rápido.
   */
  obstaculos?: readonly Retangulo[];
}

/** A folga (px) entre a mão, ou o item, e um retângulo da interface. */
export const FOLGA_INTERFACE_PX = 6;
/**
 * O item na mão, como um círculo acima dela (em raios da mão): o meio, acima do meio da mão, e o
 * raio. O bloco, a comida e o cabo da ferramenta ficam por aí (medido nas fotos da T08).
 */
export const ITEM_ACIMA = 2.3;
export const ITEM_RAIO = 1.5;
/** As ações que podem passar por cima da interface: o aceno (índices em `ACOES`). */
const PASSA_POR_CIMA = new Set([5, 6]);

/** O círculo (x, y, r) encosta no retângulo, com a folga? */
function encosta(x: number, y: number, r: number, q: Retangulo): boolean {
  const cx = Math.max(q[0], Math.min(x, q[2]));
  const cy = Math.max(q[1], Math.min(y, q[3]));
  const d = r + FOLGA_INTERFACE_PX;
  return (x - cx) ** 2 + (y - cy) ** 2 < d * d;
}

export interface ResultadoOmbro {
  ombro: Vec3;
  /** O diâmetro da mão de segurar na tela (px). */
  maoPx: number;
  /** A folga (px) do ombro, com a manga, além da beira da tela. */
  folgaPx: number;
  /** O segurar desta tela (o do esboço, ou o da faixa larga). */
  segurar: readonly [number, number];
}

/** Quanto (px) a bola de raio `r` em `p` fica além da beira da tela (positivo: fora). */
export function foraDaTela(p: Vec3, r: number, tela: Tela, fovV = FOV_BRACO): number {
  const tanV = Math.tan(fovV / 2);
  const tanH = tanV * (tela.w / tela.h);
  const x = (tela.w / 2) * (1 + p[0] / (p[2] * tanH));
  const y = (tela.h / 2) * (1 - p[1] / (p[2] * tanV));
  return Math.max(-x, x - tela.w, -y, y - tela.h) - (r / (p[2] * tanV)) * (tela.h / 2);
}

/** O ombro serve para esta tela (com todas as ações)? */
export function ombroServe(ombro: Vec3, tela: Tela, fovV = FOV_BRACO, acoes: readonly (readonly [number, number])[] = ACOES): boolean {
  const { w, h, botoes } = tela;
  const tanV = Math.tan(fovV / 2);
  const tanH = tanV * (w / h);
  if (ombro[2] < PERTO || foraDaTela(ombro, MEIA_MANGA, tela, fovV) < FOLGA_OMBRO_PX) return false;
  for (let i = 0; i < acoes.length; i++) {
    const d = direcaoDoBraco(acoes[i][0], acoes[i][1]);
    const m: Vec3 = [ombro[0] + d[0] * BRACO, ombro[1] + d[1] * BRACO, ombro[2] + d[2] * BRACO];
    if (m[2] < PERTO) return false;
    const px = (w / 2) * (1 + m[0] / (m[2] * tanH));
    const py = (h / 2) * (1 - m[1] / (m[2] * tanV));
    const r = (RAIO_MAO / (m[2] * tanV)) * (h / 2);
    if (px - r < 0 || px + r > w || py - r < 0 || py + r > h) return false;
    // segurando, o bloco (uma mão abaixo dela) fica acima dos botões
    if (i === 0 && py + 2.2 * r > botoes - 8) return false;
    // a mão e o item fora dos botões, da barra e do mapinha
    if (tela.obstaculos && !PASSA_POR_CIMA.has(i))
      for (const q of tela.obstaculos)
        if (encosta(px, py, r, q) || encosta(px, py - ITEM_ACIMA * r, ITEM_RAIO * r, q)) return false;
  }
  return true;
}

const Z_MAX = 3;
const Z_MIN = 0.2;
const PASSO_Z = 0.006;
const PASSO_Z_GROSSO = 0.03;

/**
 * Acha o ombro para uma tela. O mesmo resultado da busca bruta do esboço (os mesmos pontos da tela
 * e a mesma grade de distâncias), com uma fração das contas.
 */
export function acharOmbro(tela: Tela, fovV = FOV_BRACO): ResultadoOmbro | null {
  // primeiro, os pontos da tela do esboço aprovado; com a interface ocupando todos eles (o celular
  // deitado: a barra embaixo, o mapinha e a mochila à direita), a faixa livre mais embaixo e
  // mais à direita
  return buscarOmbro(tela, fovV, GRADE_ESBOCO) ?? (tela.obstaculos?.length ? buscarOmbro(tela, fovV, GRADE_LARGA) : null);
}

/** Os pontos da tela onde a mão de segurar pode ficar (em metades da tela, a partir do meio). */
interface Grade {
  x: [number, number];
  y: [number, number];
  /** A mão procurada (diâmetro em frações da altura da tela); sem ela, a regra do esboço. */
  alvoAltura?: number;
  segurar: readonly [number, number];
}
/**
 * Na faixa larga, a mão tem até 12% da altura da tela (em pé, 9%; no computador, 14%). No celular
 * deitado, a interface ocupa os dois cantos da direita: a mão que cabe com o item, fora deles e com
 * o ombro fora da tela, é a pequena, no vão entre a mochila e o botão de pular (a mão e o item
 * maiores ficavam atrás do mapinha e da mochila; o braço é rígido, e com o ombro fora da tela a
 * mão maior só cabe mais para o meio, num braço comprido).
 */
export const MAO_FAIXA_LARGA = 0.12;
const GRADE_ESBOCO: Grade = { x: [0.2, 0.751], y: [-0.45, -0.149], segurar: SEGURAR };
const GRADE_LARGA: Grade = { x: [0.2, 0.951], y: [-0.8, -0.149], alvoAltura: MAO_FAIXA_LARGA, segurar: SEGURAR };

function buscarOmbro(tela: Tela, fovV: number, grade: Grade): ResultadoOmbro | null {
  const { w, h } = tela;
  const tanV = Math.tan(fovV / 2);
  const tanH = tanV * (w / h);
  const d0 = direcaoDoBraco(grade.segurar[0], grade.segurar[1]);
  const acoes = grade.segurar === SEGURAR ? ACOES : acoesDe(grade.segurar);
  const px = (z: number) => (RAIO_MAO / (z * tanV)) * h;
  // a grade de distâncias do esboço: z = Z_MAX − k × PASSO_Z
  const kMax = Math.floor((Z_MAX - Z_MIN) / PASSO_Z + 1e-9);
  const zDe = (k: number) => Z_MAX - k * PASSO_Z;
  const ombroEm = (tx: number, ty: number, z: number): Vec3 => [
    tx * z * tanH - d0[0] * BRACO,
    ty * z * tanV - d0[1] * BRACO,
    z - d0[2] * BRACO,
  ];
  // para cada ponto da tela, o trecho de distâncias que serve (kIni: a mais longe; kFim: a mais perto)
  const trechos: { tx: number; ty: number; kIni: number; kFim: number }[] = [];
  const passoGrosso = Math.round(PASSO_Z_GROSSO / PASSO_Z);
  for (let tx = grade.x[0]; tx <= grade.x[1]; tx += 0.025)
    for (let ty = grade.y[0]; ty <= grade.y[1]; ty += 0.025) {
      const serve = (k: number) => ombroServe(ombroEm(tx, ty, zDe(k)), tela, fovV, acoes);
      let kIni = -1;
      for (let k = 0; k <= kMax; k += passoGrosso)
        if (serve(k)) {
          // refina para trás (a mais longe que serve)
          kIni = k;
          while (kIni - 1 >= 0 && kIni - 1 > k - passoGrosso && serve(kIni - 1)) kIni--;
          break;
        }
      // (um trecho mais curto que o passo grosso, de 0,03, fica de fora: a mão ali nem cabe direito)
      if (kIni < 0) continue;
      let kFim = kIni;
      while (kFim + passoGrosso <= kMax && serve(kFim + passoGrosso)) kFim += passoGrosso;
      while (kFim + 1 <= kMax && serve(kFim + 1)) kFim++;
      trechos.push({ tx, ty, kIni, kFim });
    }
  if (!trechos.length) return null;
  // a menor mão que serve; e, dela, a maior que não passa de FATOR_MAO vezes nem de
  // MAO_MAX_LARGURA da largura (a primeira na ordem da busca, como no esboço). Na faixa larga, a
  // menor mão que serve é um pontinho longe, no fim de um braço comprido: lá vale a maior mão que
  // serve até MAO_FAIXA_LARGA da altura
  const menor = Math.min(...trechos.map((t) => px(zDe(t.kIni))));
  const alvo = grade.alvoAltura
    ? Math.min(h * grade.alvoAltura, w * MAO_MAX_LARGURA)
    : Math.min(menor * FATOR_MAO, w * MAO_MAX_LARGURA);
  let melhor: { tx: number; ty: number; z: number; px: number } | null = null;
  for (const t of trechos) {
    // a distância mais perto (mão maior) do trecho com a mão ainda ≤ alvo
    let k = t.kFim;
    while (k > t.kIni && px(zDe(k)) > alvo) k--;
    const z = zDe(k);
    const p = px(z);
    if (p > alvo) continue;
    if (!melhor || p > melhor.px) melhor = { tx: t.tx, ty: t.ty, z, px: p };
  }
  if (!melhor) return null;
  const ombro = ombroEm(melhor.tx, melhor.ty, melhor.z);
  return {
    ombro,
    maoPx: Math.round(melhor.px),
    folgaPx: Math.round(foraDaTela(ombro, MEIA_MANGA, tela, fovV)),
    segurar: grade.segurar,
  };
}

/**
 * Guarda a conta por tela e a faz fora do quadro: `obter` devolve o ombro já achado (ou null
 * enquanto a conta não saiu, e aí a mão fica escondida) e agenda a conta de uma tela nova para
 * depois do quadro. `agendar` é o adiamento (no jogo, um `setTimeout`).
 */
export function criarCacheOmbro(agendar: (f: () => void) => void, fovV = FOV_BRACO) {
  const guardados = new Map<string, ResultadoOmbro | null>();
  const pedidos = new Set<string>();
  const chave = (t: Tela) =>
    `${Math.round(t.w)}x${Math.round(t.h)}|${Math.round(t.botoes)}|${(t.obstaculos ?? []).map((q) => q.map(Math.round).join(',')).join(';')}`;
  return {
    obter(tela: Tela): ResultadoOmbro | null | undefined {
      const k = chave(tela);
      if (guardados.has(k)) return guardados.get(k);
      if (!pedidos.has(k)) {
        pedidos.add(k);
        const t = { ...tela };
        agendar(() => {
          guardados.set(k, acharOmbro(t, fovV));
          pedidos.delete(k);
        });
      }
      return undefined;
    },
    tamanho: () => guardados.size,
  };
}
