/**
 * Spec 036 (T03): as peças dos tesouros novos no boneco, saídas do esboço aprovado
 * (`src/esboco/lojinhaPecas.ts` e `lojinhaBichos.ts`), no padrão das peças de hoje
 * (`bonecoPremium.ts`: caixas de canto redondo, bolinhas, cones, anéis e placas, só dados).
 *
 * - **Boné de hélice** (chapéu): a cúpula amarela, a aba vermelha, a estrela azul e a hélice de
 *   duas pás num nó próprio (`helice`), que gira devagar parada e rápido correndo.
 * - **Pijama de nuvem** (roupa): azul-céu com nuvenzinhas brancas, a gola fofa, os botões de
 *   estrelinha e as pantufas de nuvem.
 * - **Asas de borboleta** (costas): lilás e rosa com bolinhas, em dois nós (`borbE`, `borbD`).
 * - **Mochila-foguete** (costas): o foguetinho com a janelinha e a chaminha mansa; a fumacinha é
 *   do `premiumMundo.ts`.
 * - **Na mão esquerda** (a direita segura o item da barra): a varinha de bolhas, o guarda-chuva
 *   (num nó, `guarda`, que fica em pé por cima da cabeça como quer que o braço esteja) e a pipa
 *   (no chão do boneco, `pipa`, atrás, à esquerda e no alto, com o rabo de lacinhos num nó
 *   próprio).
 * - **Passarinho de ombro** (bichinho): preso ao tronco na ponta do ombro direito (`passaro`),
 *   com as asinhas em nós próprios. Não segue pelo chão.
 *
 * As correções da spec sobre o esboço: o guarda-chuva maior e sempre por cima da cabeça, a pipa
 * com os lacinhos maiores e a linha (no `premiumMundo.ts`) por fora do corpo, o passarinho mais
 * para fora e um tico para trás (de três-quartos não passa mais na frente da quina da cabeça).
 * A animação dos nós fica em `render/boneco.ts`; os efeitos, em `render/premiumMundo.ts`.
 */
import type { Junta, Peca, SubjuntaPremium } from './boneco';
import { ajeitarCabeloDebaixo } from './boneco';
import type { MedidasBoneco } from './bonecoFantasia';
import { perfilEstrela, perfilFolha } from './bonecoFantasia';
import { Pecas, misturarCor } from './bonecoPremium';
import type { PremiumVestido } from './aparencia';
import { vestirBrinquedoAndar } from './brinquedoAndar';

type V3 = [number, number, number];
type P2 = [number, number];

const sub = (nome: SubjuntaPremium, pivo: V3, extra: { rot?: V3; pai?: SubjuntaPremium } = {}) => ({
  subjunta: { nome, pivo, ...extra },
});

/** Contorno de nuvenzinha (três bolinhas juntas, a do meio mais alta, a base reta). */
function perfilNuvem(w: number): P2[] {
  const pts: P2[] = [];
  const bolas: Array<[number, number, number]> = [
    [-0.3, -0.05, 0.24],
    [0, 0.06, 0.32],
    [0.3, -0.05, 0.24],
  ];
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * Math.PI * 2;
    let melhor = 0;
    for (const [bx, by, br] of bolas) {
      const pb = bx * Math.cos(a) + by * Math.sin(a);
      const q = pb * pb - (bx * bx + by * by - br * br);
      if (q >= 0) melhor = Math.max(melhor, pb + Math.sqrt(q));
    }
    const y = Math.max(-0.12, Math.sin(a) * melhor);
    pts.push([Math.cos(a) * melhor * w, y * w]);
  }
  return pts;
}

/** Contorno de asa de borboleta: uma elipse puxada para a raiz no (0, 0), como uma gota. */
function perfilGota(c: P2, a: number, b: number, giro: number, k: number): P2[] {
  const pts: P2[] = [];
  const raiz: P2 = [0.02, 0];
  const ux = raiz[0] - c[0];
  const uy = raiz[1] - c[1];
  const ul = Math.hypot(ux, uy);
  for (let i = 0; i < 40; i++) {
    const t = (i / 40) * Math.PI * 2;
    const ex = a * Math.cos(t);
    const ey = b * Math.sin(t);
    let x = c[0] + ex * Math.cos(giro) - ey * Math.sin(giro);
    let y = c[1] + ex * Math.sin(giro) + ey * Math.cos(giro);
    const dl = Math.hypot(x - c[0], y - c[1]) || 1;
    const w = Math.max(0, ((x - c[0]) * ux + (y - c[1]) * uy) / (dl * ul)) ** 3;
    x += (raiz[0] - x) * w * 0.85;
    y += (raiz[1] - y) * w * 0.85;
    pts.push([x * k, y * k]);
  }
  return pts;
}
const perfilAsaCima = (k: number) => perfilGota([0.27, 0.22], 0.26, 0.2, 0.55, k);
const perfilAsaBaixo = (k: number) => perfilGota([0.19, -0.15], 0.17, 0.13, -0.6, k);

/** As peças da roupa de baixo que saem com uma roupa nova (os enfeites do estilo). */
const ENFEITES_DA_ROUPA = /^(tunica-barra|cinto|fivela|avental|camiseta|gola|listra\d|colete-?1|colete1|bandoleira|bolso|saia)$/;

function pintar(lista: Peca[], re: RegExp, cor: string): void {
  for (const p of lista)
    if (re.test(p.nome)) {
      p.cor = cor;
      p.viva = undefined;
    }
}

// ------------------------------------------------------------------ medidas para os efeitos
/**
 * Onde os efeitos nascem (no espaço da junta, antes da escala do boneco), para o
 * `premiumMundo.ts`: o aro da varinha (na mão esquerda), o bocal do foguete (no tronco) e as
 * pontinhas do guarda-chuva (no nó dele). O tronco tem a mesma altura e o mesmo fundo em todos
 * os corpos (só a largura muda), então o bocal é um ponto só.
 */
export const PONTOS_LOJINHA = {
  aroVarinha: [0, -0.47, 0.02] as V3,
  bocalFoguete: [0, 0.42 * 0.3 - 0.3, -0.34 / 2 - 0.17] as V3,
  // (portão: o pano maior, para cobrir a cabeça com o cabo saindo da mão ao lado dela)
  guarda: { raio: 1.02, base: 1.04, altura: 0.38, gomos: 8 },
} as const;

// ------------------------------------------------------------------ boné de hélice
function boneHelice(P: Pecas, m: MedidasBoneco): void {
  const AZUL = '#2f6fe0';
  const AMARELO = '#ffcf3a';
  const VERMELHO = '#ff5a5a';
  const b = m.baseChapeu;
  // portão (o revisor: a cúpula redonda engolia a cabeça e lia como boina ou cogumelo, a aba era
  // um palito solto e o cabelo varava): um boné de criança em bloco, como os chapéus do jogo. A
  // copa justa por cima da tampa de cabelo (sem descer até os olhos), com os cantos redondos; a
  // aba curta, larga e grossa, colada na beira da frente; a estrela azul na testa da copa; em
  // cima, um domo baixo (sem ele, a copa em caixa lia como uma lata)
  const yCopa = b - 0.13;
  const hCopa = 0.24;
  const dCopa = 0.78;
  P.caixa('bone-copa', 'cabeca', 'cabeca', [0.82, hCopa, dCopa], [0, yCopa + hCopa / 2, -0.01], AMARELO, 0.12, { brilho: 0.4 });
  P.bola('bone-copa-topo', 'cabeca', 'cabeca', 0.4, [0, yCopa + hCopa - 0.03, -0.01], AMARELO, [1, 0.32, 0.96], { brilho: 0.4 });
  P.placa('bone-estrela', 'cabeca', 'cabeca', perfilEstrela(0.075), 0.02, [0, yCopa + hCopa * 0.5, dCopa / 2 - 0.005], AZUL, { brilho: 0.4 });
  P.caixa('bone-aba', 'cabeca', 'cabeca', [0.66, 0.07, 0.26], [0, yCopa + 0.035, dCopa / 2 + 0.1], VERMELHO, 0.03, { rot: [0.1, 0, 0], brilho: 0.4 });
  // o pino e a hélice (gira no nó dela), duas pás em azul e vermelho
  const topoCopa = yCopa + hCopa - 0.03 + 0.4 * 0.32;
  // o cabelo debaixo do boné, como debaixo dos chapéus do jogo (o cacho de cima não passa da
  // tampa, o coque desce para a nuca) e sem o topete, que varava a copa
  ajeitarCabeloDebaixo(P.lista, 'chapeu', m.topoTampa, m.cab);
  P.tirar(/^topete/);
  P.cone('bone-pino', 'cabeca', 'cabeca', 0.12, 0.028, 0.022, [0, topoCopa + 0.05, -0.01], '#e6e9f2', { brilho: 0.4 });
  const pivo: V3 = [0, topoCopa + 0.12, -0.01];
  P.bola('bone-botao', 'cabeca', 'cabeca', 0.04, [0, 0, 0], VERMELHO, [1, 0.8, 1], { brilho: 0.4, ...sub('helice', pivo) });
  for (const [s, cor] of [
    [-1, VERMELHO],
    [1, AZUL],
  ] as const)
    P.placa(`bone-pa${s}`, 'cabeca', 'cabeca', perfilFolha(0.3), 0.018, [s * 0.16, 0, 0], cor, {
      rot: [Math.PI / 2, 0.25 * s, Math.PI / 2],
      brilho: 0.4,
      ...sub('helice', pivo),
    });
}

// ------------------------------------------------------------------ pijama de nuvem
function pijamaNuvem(P: Pecas, m: MedidasBoneco): void {
  const CEU = '#9fd3ff';
  const CEU_ESC = '#7bbcf2';
  const B = '#ffffff';
  const L = P.lista;
  P.tirar(ENFEITES_DA_ROUPA);
  pintar(L, /^(peito|quadril|braco[ED]-(manga|ombro)|perna[ED]-perna)$/, CEU);
  pintar(L, /^braco[ED]-punho$/, B);
  const { larg, troncoH, frente, prof } = m;
  // a gola fofa de nuvem
  for (let i = -2; i <= 2; i++)
    P.bola(`pijama-gola${i}`, 'tronco', 'tronco', 0.06, [i * 0.07, troncoH - 0.02, frente - 0.04 - Math.abs(i) * 0.03], B, [1.1, 0.7, 1]);
  // os botões de estrelinha amarela
  for (const y of [0.3, 0.2, 0.1])
    P.placa(`pijama-botao${y}`, 'tronco', 'tronco', perfilEstrela(0.03), 0.012, [0, troncoH * y * 2.1, frente + 0.006], '#ffd84a', {
      rot: [0, 0, 0.2],
    });
  // as nuvenzinhas brancas: no peito, nas costas e nas mangas (portão: a das pernas ficava
  // espremida entre o calção e a barra, e de frente, à noite, lia como um retângulo cinza)
  const nuvemEm = (nome: string, junta: Junta, pos: V3, w: number, rotY = 0) =>
    P.placa(nome, junta, undefined, perfilNuvem(w), 0.014, pos, B, { rot: [0, rotY, 0] });
  nuvemEm('pijama-nuvem-peito', 'tronco', [larg * 0.23, troncoH * 0.62, frente + 0.004], 0.16);
  nuvemEm('pijama-nuvem-peito2', 'tronco', [-larg * 0.24, troncoH * 0.25, frente + 0.004], 0.12);
  nuvemEm('pijama-nuvem-costas', 'tronco', [0, troncoH * 0.5, -prof / 2 - 0.004], 0.2, Math.PI);
  for (const s of [-1, 1]) {
    const lado = s < 0 ? 'E' : 'D';
    nuvemEm(`pijama-nuvem-manga${lado}`, s < 0 ? 'bracoE' : 'bracoD', [s * 0.068, -0.1, 0], 0.09, (s * Math.PI) / 2);
  }
  // a barra da calça e as pantufas de nuvem (no lugar do sapato)
  P.tirar(/^perna[ED]-sapato$/);
  for (const lado of ['pernaE', 'pernaD'] as const) {
    P.caixa(`${lado}-pijama-barra`, lado, 'perna', [0.19, 0.04, 0.2], [0, -m.quadril + 0.16, 0], CEU_ESC, 0.02);
    P.caixa(`${lado}-sapato`, lado, 'perna', [0.22, 0.12, 0.29], [0, -m.quadril + 0.06, 0.03], B, 0.06, { brilho: 0.2 });
    for (const [x, z, r] of [
      [-0.06, 0.13, 0.065],
      [0.05, 0.15, 0.06],
      [0, 0.06, 0.07],
      [0.07, -0.05, 0.055],
      [-0.07, -0.04, 0.055],
    ])
      P.bola(`${lado}-pantufa${x}${z}`, lado, 'perna', r, [x, -m.quadril + 0.11, z], B, [1, 0.8, 1], { brilho: 0.2 });
  }
}

// ------------------------------------------------------------------ asas de borboleta
function asasBorboleta(P: Pecas, m: MedidasBoneco): void {
  const { troncoH, prof } = m;
  const LILAS = '#b48cff';
  const ROSA = '#ff9fd2';
  const BORDA = '#7a4fd0';
  const K = 1.25;
  // (T03, pedido do dono: no esboço a asa de cima subia atrás da cabeça e parecia atravessá-la.
  // Agora saem das omoplatas, mais baixas, e ficam atrás da nuca e do cabelo comprido: nenhuma
  // parte encosta na cabeça, de nenhum ângulo nem batendo, `tests/personagem/tesourosNoBoneco`)
  const zAsa = -prof / 2 - ASAS_ATRAS;
  for (const s of [-1, 1]) {
    const nome: SubjuntaPremium = s < 0 ? 'borbE' : 'borbD';
    const pivo: V3 = [s * 0.04, troncoH * 0.5, zAsa];
    // (espelhada, a volta do contorno inverte: a da esquerda volta ao sentido de sempre)
    const espelhar = (pts: P2[]) => {
      const e = pts.map(([x, y]) => [x * s, y] as P2);
      return s < 0 ? e.reverse() : e;
    };
    // a borda (um tico maior, atrás) e a asa em degradê (lilás perto do corpo, rosa na ponta)
    P.placa(`borboleta-borda-cima${s}`, 'tronco', undefined, espelhar(perfilAsaCima(K * 1.07)), 0.014, [0, -0.012, -0.006], BORDA, sub(nome, pivo));
    P.placa(`borboleta-borda-baixo${s}`, 'tronco', undefined, espelhar(perfilAsaBaixo(K * 1.09)), 0.014, [0, 0.006, -0.006], BORDA, sub(nome, pivo));
    // (a asa colorida dos dois lados da borda: por trás também é lilás e rosa)
    for (const [n, perfil] of [
      ['cima', espelhar(perfilAsaCima(K))],
      ['baixo', espelhar(perfilAsaBaixo(K))],
    ] as const)
      for (const z of [0.008, -0.02])
        P.placa(`borboleta-asa-${n}${s}${z > 0 ? 'f' : 't'}`, 'tronco', undefined, perfil, 0.012, [0, 0, z], LILAS, {
          viva: true,
          brilho: 0.45,
          pintar: (x, y) => misturarCor(LILAS, ROSA, Math.min(1, Math.hypot(x, y) / (0.5 * K))),
          ...sub(nome, pivo),
        });
    // as bolinhas brancas e uma lilás-escura em cada asa, dos dois lados
    const bolinhas: Array<[number, number, number, string]> = [
      [0.3, 0.32, 0.045, '#ffffff'],
      [0.18, 0.18, 0.03, '#fff3fb'],
      [0.36, 0.14, 0.025, BORDA],
      [0.16, -0.14, 0.03, '#ffffff'],
    ];
    for (const [bx, by, r, cor] of bolinhas)
      for (const lado of [1, -1])
        P.bola(`borboleta-bolinha${s}${bx}${lado}`, 'tronco', undefined, r * K, [s * bx * K, by * K, lado > 0 ? 0.016 : -0.028], cor, [1, 1, 0.3], sub(nome, pivo));
  }
  // o corpinho da borboleta, onde as asas se prendem, e a hastezinha que o prende às costas
  P.caixa('borboleta-corpo', 'tronco', 'tronco', [0.08, 0.3, 0.08], [0, troncoH * 0.5, zAsa], BORDA, 0.038);
  P.caixa('borboleta-haste', 'tronco', 'tronco', [0.05, 0.05, ASAS_ATRAS], [0, troncoH * 0.55, -prof / 2 - ASAS_ATRAS / 2], BORDA, 0.02);
}
/** O quanto as asas de borboleta ficam atrás das costas (para longe da nuca e do cabelo). */
const ASAS_ATRAS = 0.27;

// ------------------------------------------------------------------ mochila-foguete
function mochilaFoguete(P: Pecas, m: MedidasBoneco): void {
  const { troncoH, prof, larg } = m;
  const BRANCO = '#f6f7ff';
  const CORAL = '#ff6b5e';
  const AZUL = '#7fd4ff';
  const z = -prof / 2 - 0.17;
  // (baixo nas costas: o bico não entra na nuca da cabeça grande)
  const y = troncoH * 0.3;
  // o corpo do foguete, o bico e o anel coral, a janelinha (virada para trás) e as aletas
  P.cone('foguete-corpo', 'tronco', 'tronco', 0.32, 0.125, 0.135, [0, y, z], BRANCO, { brilho: 0.45 });
  P.cone('foguete-bico', 'tronco', 'tronco', 0.15, 0.13, 0.012, [0, y + 0.235, z], CORAL, { brilho: 0.45 });
  P.cone('foguete-anel', 'tronco', 'tronco', 0.05, 0.138, 0.138, [0, y + 0.12, z], CORAL, { brilho: 0.45 });
  P.anel('foguete-aro', 'tronco', 'tronco', 0.13, 0.03, [0, y + 0.02, z - 0.13], '#c9cfe0', { rot: [Math.PI / 2, 0, 0], brilho: 0.45 });
  P.bola('foguete-janela', 'tronco', 'tronco', 0.055, [0, y + 0.02, z - 0.125], AZUL, [1, 1, 0.4], { brilho: 0.8 });
  P.bola('foguete-reflexo', 'tronco', 'tronco', 0.016, [-0.018, y + 0.04, z - 0.147], '#ffffff', [1, 1, 0.4], { brilho: 0.8 });
  // (T03, pedido do dono: a aleta do meio, logo abaixo da janelinha, lia como nariz ou língua e o
  // foguete virava um rosto. Ficaram duas, dos lados e um tico para trás)
  for (const a of [-Math.PI / 2 - 0.45, Math.PI / 2 + 0.45]) {
    const x = Math.sin(a) * 0.14;
    const zz = z + Math.cos(a) * 0.14;
    P.placa(
      `foguete-aleta${a.toFixed(1)}`,
      'tronco',
      'tronco',
      [
        [0, 0.1],
        [0, -0.08],
        [0.11, -0.12],
        [0.09, -0.02],
      ],
      0.022,
      [x, y - 0.1, zz],
      CORAL,
      { rot: [0, a - Math.PI / 2, 0], brilho: 0.45 },
    );
  }
  // o bocal e a chaminha mansa (luz morna, pequena, abaixo do brilho que borra)
  P.cone('foguete-bocal', 'tronco', 'tronco', 0.06, 0.07, 0.1, [0, y - 0.19, z], '#5a5870', { brilho: 0.45 });
  P.cone('foguete-chama', 'tronco', 'tronco', 0.12, 0.05, 0.008, [0, y - 0.28, z], '#ffd27a', { rot: [Math.PI, 0, 0], luz: 'chama' });
  // as alças pelos ombros
  for (const s of [-1, 1]) {
    P.caixa(`foguete-alca${s}`, 'tronco', 'tronco', [0.06, 0.035, prof + 0.06], [s * larg * 0.27, troncoH + 0.005, 0], CORAL, 0.014);
    P.caixa(`foguete-alca-frente${s}`, 'tronco', 'tronco', [0.06, troncoH * 0.55, 0.03], [s * larg * 0.28, troncoH * 0.72, m.frente + 0.006], CORAL, 0.014);
  }
}

// ------------------------------------------------------------------ na mão esquerda
function varinhaBolhas(P: Pecas): void {
  const TURQUESA = '#2fc7d8';
  const LILAS = '#b48cff';
  // o cabo sai da mão para a frente e para cima (o braço levantado leva a varinha ao alto)
  P.cone('varinha-cabo', 'maoE', 'mao', 0.36, 0.026, 0.022, [0, -0.2, 0.02], TURQUESA, { brilho: 0.45 });
  for (let i = 0; i < 3; i++)
    P.cone(`varinha-listra${i}`, 'maoE', 'mao', 0.025, 0.028, 0.028, [0, -0.1 - i * 0.09, 0.02], '#ffffff', { brilho: 0.45 });
  P.bola('varinha-pomo', 'maoE', 'mao', 0.04, [0, 0.03, 0.02], LILAS, [1, 1, 1], { brilho: 0.45 });
  // o aro das bolhas, na ponta, com a película de sabão
  const [ax, ay, az] = PONTOS_LOJINHA.aroVarinha;
  P.anel('varinha-aro', 'maoE', 'mao', 0.2, 0.03, [ax, ay, az], LILAS, { rot: [0, 0, Math.PI / 2], brilho: 0.45 });
  P.cone('varinha-pelicula', 'maoE', 'mao', 0.006, 0.09, 0.09, [ax, ay, az], '#dff4ff', {
    rot: [0, 0, Math.PI / 2],
    alfa: 0.35,
    brilho: 0.8,
  });
}

function guardaChuva(P: Pecas): void {
  const LILAS = '#b48cff';
  const BRANCO = '#fbf7ff';
  const j: Junta = 'maoE';
  // o guarda-chuva inteiro num nó na mão que a animação mantém em pé (portão: a mão ao lado da
  // cabeça e o cabo subindo dela quase reto, um tico inclinado para a cabeça, com o pano por
  // cima) e gira devagar em volta do cabo, como quer que o braço esteja
  const g = sub('guarda', [0, 0, 0]);
  const { raio: R, base: BASE, altura: ALTURA, gomos: n } = PONTOS_LOJINHA.guarda;
  P.cone('guardachuva-cabo', j, 'mao', BASE + ALTURA + 0.06, 0.02, 0.02, [0, (BASE + ALTURA) / 2 - 0.02, 0], '#e6e9f2', { brilho: 0.45, ...g });
  // (o punho rente à mão: mais abaixo, encostava no cabelo comprido, na altura do ombro)
  P.bola('guardachuva-punho', j, 'mao', 0.036, [0, -0.04, 0], LILAS, [1, 1.2, 1], { brilho: 0.45, ...g });
  // a cúpula em oito gomos (lilás e branco), com a beirada em ondinhas
  for (let k = 0; k < n; k++) {
    const a0 = (k / n) * Math.PI * 2;
    const a1 = ((k + 1) / n) * Math.PI * 2;
    const am = (a0 + a1) / 2;
    const topo = [0, BASE + ALTURA, 0];
    const b = [Math.cos(a0) * R, BASE, Math.sin(a0) * R];
    const c = [Math.cos(a1) * R, BASE, Math.sin(a1) * R];
    const meio = [Math.cos(am) * R * 0.92, BASE - 0.07, Math.sin(am) * R * 0.92];
    P.por({
      nome: `guardachuva-gomo${k}`,
      junta: j,
      apoio: 'mao',
      forma: 'malha',
      tamanho: [R, ALTURA, R],
      // (o lado de baixo com a luz de cima: na cor do pano, sem o cinza-escuro de sujo)
      malha: { pos: [...topo, ...b, ...meio, ...c], ind: [0, 1, 2, 0, 2, 3], avessoClaro: true },
      pos: [0, 0, 0],
      cor: k % 2 ? LILAS : BRANCO,
      brilho: 0.45,
      ...g,
    });
    P.bola(`guardachuva-pontinha${k}`, j, 'mao', 0.03, [b[0], b[1] - 0.01, b[2]], LILAS, [1, 1, 1], { brilho: 0.45, ...g });
  }
  P.bola('guardachuva-ponta', j, 'mao', 0.04, [0, BASE + ALTURA + 0.03, 0], LILAS, [1, 1.4, 1], { brilho: 0.45, ...g });
}

/** A pipa voa atrás, à esquerda e no alto (o nó dela fica na ponta de baixo, onde a linha prende). */
export const PIVO_PIPA: V3 = [-0.95, 2.45, -1.35];

function pipaLacinhos(P: Pecas): void {
  const AMARELO = '#ffcf3a';
  const AZUL = '#5cb8ff';
  const CARAMELO = '#c98a4a';
  const LACO = '#ff7a8a';
  const j: Junta = 'prancha';
  const T: P2 = [0, 0.82];
  const E: P2 = [-0.3, 0.55];
  const D: P2 = [0.3, 0.55];
  const B: P2 = [0, 0];
  const C: P2 = [0, 0.55];
  // o desenho da pipa fica virado para trás e um tico para baixo (para a câmera do jogo, atrás
  // da criança), com o alto inclinado para longe dela: o plano da pipa gira INC em x e meia
  // volta em y, e a frente (o lado da estrela) olha para -z
  const INC = 0.3;
  const rot: V3 = [INC, Math.PI, 0];
  const c = Math.cos(INC);
  const s = Math.sin(INC);
  /** Um ponto (x, y) do plano da pipa, `d` para fora do lado da frente (negativo: do lado da criança). */
  const noPlano = (x: number, y: number, d: number): V3 => [-x, y * c - d * s, -y * s - d * c];
  const tri = (nome: string, pts: P2[], cor: string) =>
    P.placa(nome, j, undefined, pts, 0.02, [0, 0, 0], cor, { brilho: 0.45, rot, ...sub('pipa', PIVO_PIPA) });
  tri('pipa-a', [T, E, C], AMARELO);
  tri('pipa-b', [T, C, D], AZUL);
  tri('pipa-c', [E, B, C], AZUL);
  tri('pipa-d', [C, B, D], AMARELO);
  // as varetas em cruz (do lado da criança) e a estrelinha branca no meio (do lado da frente)
  const vareta = (nome: string, a: P2, b: P2) => {
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
    P.caixa(nome, j, undefined, [l, 0.022, 0.022], noPlano((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, -0.022), CARAMELO, 0.008, {
      rot: [INC, Math.PI, ang],
      ...sub('pipa', PIVO_PIPA),
    });
  };
  vareta('pipa-vareta1', T, B);
  vareta('pipa-vareta2', E, D);
  P.placa('pipa-estrela', j, undefined, perfilEstrela(0.075), 0.012, noPlano(0, 0.55, 0.016), '#ffffff', {
    rot,
    brilho: 0.45,
    ...sub('pipa', PIVO_PIPA),
  });
  // o rabo: a cordinha e os lacinhos (maiores que no esboço), num nó que balança atrasado
  const lacos = 4;
  for (let i = 0; i < lacos; i++) {
    const y = -0.22 - i * 0.24;
    const x = Math.sin(i * 1.3) * 0.06;
    P.caixa(`pipa-cordinha${i}`, j, undefined, [0.014, 0.24, 0.014], [x, y + 0.12, 0], '#f4f0e6', 0.005, sub('rabopipa', PIVO_PIPA));
    for (const s of [-1, 1])
      P.placa(
        `pipa-laco${i}${s}`,
        j,
        undefined,
        [
          [0, 0],
          [s * 0.13, 0.065],
          [s * 0.13, -0.065],
        ],
        0.02,
        [x, y, 0],
        i % 2 ? LACO : AZUL,
        { brilho: 0.45, ...sub('rabopipa', PIVO_PIPA) },
      );
    P.bola(`pipa-no${i}`, j, undefined, 0.024, [x, y, 0], i % 2 ? LACO : AZUL, [1, 1, 1], { brilho: 0.45, ...sub('rabopipa', PIVO_PIPA) });
  }
}

// ------------------------------------------------------------------ passarinho de ombro
/**
 * Onde o passarinho voa (decisão do dono, 24 nov: "não consegue chegar no ombro por causa da
 * cabeça; faz ele voando mesmo, próximo"): pertinho do ombro direito, um pouco acima e para fora,
 * um tico para trás (de frente e de lado não tapa o rosto), virado para a frente e para fora e com
 * o corpinho inclinado de quem voa. Preso ao tronco: anda, pula e vira junto com a criança.
 */
export const OMBRO_PASSARINHO = { pivo: (troncoH: number): V3 => [0.55, troncoH + 0.1, -0.1], rot: [0.18, 0.4, -0.12] as V3 };

function passarinho(P: Pecas, m: MedidasBoneco): void {
  const AZUL = '#5cb8ff';
  const AZUL_ESC = '#3a86e0';
  const CREME = '#fff6e0';
  const LARANJA = '#ffa53a';
  // o desenho do esboço (no traço dos bichinhos da lojinha), na escala dele já aplicada
  const k = 0.72;
  const j: Junta = 'tronco';
  const corpo = sub('passaro', OMBRO_PASSARINHO.pivo(m.troncoH), { rot: OMBRO_PASSARINHO.rot });
  const V = (x: number, y: number, z: number): V3 => [x * k, y * k, z * k];
  const bola = (nome: string, r: number, pos: V3, cor: string, esc: V3 = [1, 1, 1], extra: Partial<Peca> = {}) =>
    P.bola(`passaro-${nome}`, j, undefined, r * k, pos, cor, esc, { brilho: 0.45, ...corpo, ...extra });
  bola('corpo', 0.155, V(0, 0.14, 0), AZUL, [1, 1.05, 1.1]);
  bola('barriga', 0.115, V(0, 0.12, 0.065), CREME, [1, 1.1, 0.7]);
  const cab = (x: number, y: number, z: number) => V(x, 0.25 + y, 0.03 + z);
  bola('cabeca', 0.13, cab(0, 0, 0), AZUL);
  // os olhos de bolinha com o brilho (como os bichinhos da 023)
  for (const s of [-1, 1]) {
    const o = cab(s * 0.055, 0.02, 0.105);
    const r = 0.034;
    bola(`olho${s}`, r, o, '#1d1430', [0.82, 1, 0.36]);
    bola(`olho-brilho${s}`, r * 0.3, [o[0] + s * r * 0.2 * k, o[1] + r * 0.38 * k, o[2] + r * 0.3 * k], '#ffffff', [1, 1, 0.45]);
    bola(`bochecha${s}`, 0.025, cab(s * 0.08, -0.03, 0.095), '#ff9cc4', [1, 0.62, 0.3]);
  }
  P.cone('passaro-bico', j, undefined, 0.065 * k, 0.034 * k, 0.004, cab(0, -0.025, 0.135), LARANJA, { rot: [Math.PI / 2, 0, 0], brilho: 0.45, ...corpo });
  // o topetinho de duas penas
  P.placa('passaro-pena1', j, undefined, perfilFolha(0.1 * k), 0.012, cab(0.01, 0.15, -0.01), AZUL_ESC, { rot: [-0.3, 0, -0.35], brilho: 0.45, ...corpo });
  P.placa('passaro-pena2', j, undefined, perfilFolha(0.08 * k), 0.012, cab(-0.025, 0.14, -0.02), AZUL_ESC, { rot: [-0.3, 0, 0.35], brilho: 0.45, ...corpo });
  bola('rabo', 0.08, V(0, 0.1, -0.18), AZUL_ESC, [0.75, 0.25, 1.4], { rot: [0.45, 0, 0] });
  // (voando, os pezinhos recolhidos para trás)
  for (const s of [-1, 1]) bola(`pe${s}`, 0.022, V(s * 0.045, 0.02, -0.03), LARANJA, [1, 0.5, 1.4], { rot: [0.6, 0, 0] });
  // as asinhas, as duas num nó só (desempenho: uma malha a menos por boneco), abertas para os
  // lados e inclinadas para fora; batem pelo vaivém do nó (a animação em render/boneco.ts)
  for (const s of [-1, 1])
    // (a asa na abertura do meio do bater, 1,05 rad para fora, como girava no nó dela antes)
    P.bola(`passaro-asa${s}`, j, undefined, 0.12 * k, V(s * 0.186, -0.026, -0.02), AZUL_ESC, [0.3, 0.9, 1.1], {
      brilho: 0.45,
      rot: [0, 0, s * 1.05],
      ...sub('passaroAsaE', V(0, 0.18, -0.01), { pai: 'passaro' }),
    });
}

// ------------------------------------------------------------------ vestir
/** Os tesouros novos da 036 no plano (os de andar, provisórios, em `brinquedoAndar.ts`). */
export function vestirPremiumLojinha(premium: PremiumVestido, lista: Peca[], m: MedidasBoneco): void {
  const antes = new Set(lista);
  vestirTesouros(premium, lista, m);
  for (const p of lista) {
    if (antes.has(p)) continue;
    // desempenho (T03, medido na placa): as bolinhas novas com os gomos pelo tamanho, como as dos
    // moradores (o padrão de 12 gomos levava o passarinho, as pantufas e as bolinhas das asas a
    // mais de 10 mil triângulos cada); de perto continuam redondinhas
    if (p.forma === 'esfera' && p.gomos === undefined) p.gomos = Math.max(6, segmentosDaBolinha(Math.max(...p.tamanho)));
    juntarMalhas(p);
  }
}

/**
 * Desempenho (T08: com 4 amigos, os itens novos somavam de +39 a +47 chamadas de desenho; a meta
 * é +20). O desenho junta numa malha as peças do mesmo nó e do mesmo material, e cada degrau de
 * brilho é um material. Então:
 * - a peça presa ao corpo (o boné, a mochila-foguete, a varinha, o pijama) fica no brilho do
 *   corpo (o fosco), e entra na malha que a junta já tem;
 * - num nó próprio (a hélice, as asas, o guarda-chuva, a pipa, o passarinho), todas as peças no
 *   mesmo degrau (o acetinado), uma malha por nó; nas asas de borboleta, a borda e as bolinhas
 *   vão na mesma tinta do degradê;
 * - a luz própria, a película transparente e o brinquedo de andar (já juntado em
 *   `brinquedoAndar.ts`) ficam como estão.
 */
function juntarMalhas(p: Peca): void {
  if (p.luz || (p.alfa ?? 1) < 1 || p.textura || p.nome.startsWith('andar-')) return;
  const no = p.subjunta?.nome;
  if (!no) {
    if (!p.viva) p.brilho = 0.28;
    return;
  }
  p.brilho = 0.45;
  if (no === 'borbE' || no === 'borbD') p.viva = true;
}

/** Bolinha de raio r: os gomos (o mesmo degrau de `render/formas.ts`, sem puxar o desenho). */
function segmentosDaBolinha(r: number): number {
  return r < 0.035 ? 4 : r < 0.06 ? 5 : r < 0.075 ? 7 : r < 0.12 ? 8 : r < 0.25 ? 10 : 12;
}

function vestirTesouros(premium: PremiumVestido, lista: Peca[], m: MedidasBoneco): void {
  const P = new Pecas(lista);
  if (premium.roupa === 'pijama-nuvem') pijamaNuvem(P, m);
  if (premium.costas === 'asas-borboleta') asasBorboleta(P, m);
  if (premium.costas === 'mochila-foguete') mochilaFoguete(P, m);
  if (premium.chapeu === 'bone-helice') boneHelice(P, m);
  if (premium.mao === 'varinha-bolhas') varinhaBolhas(P);
  if (premium.mao === 'guarda-chuva-gotinhas') guardaChuva(P);
  if (premium.mao === 'pipa-lacinhos') pipaLacinhos(P);
  if (premium.bicho === 'passarinho-ombro') passarinho(P, m);
  // T04: o brinquedo de andar (provisório; os modelos de verdade são da T05, no mesmo lugar)
  if (premium.andar) vestirBrinquedoAndar(premium.andar, lista);
}
