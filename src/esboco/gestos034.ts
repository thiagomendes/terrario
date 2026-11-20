/**
 * Esboço da spec 034 (T10): os ícones dos gestos para 3 anos (só com `?esboco=gestos034`). O
 * `main.ts` importa este arquivo sob demanda: vira um pedaço à parte que o jogo nunca baixa.
 *
 * Duas direções, para o dono escolher:
 * - **A:** ilustração em SVG do mesmo boneco do jogo (o "andarilho" padrão), desenhada com as
 *   medidas do plano do boneco (`personagem/boneco.ts`: cabeça 0,72 × 0,68, tronco 0,46 × 0,42,
 *   perna 0,24, braço até a mão 0,27, mão 0,085) e as cores dele (pele, cabelo com topete,
 *   túnica azul com cinto e fivela, calça, sapato, bochechas, olhos com brilho), fazendo o gesto
 *   na pose que mais diz o que ele é;
 * - **B:** foto do próprio boneco do jogo fazendo o gesto, tirada aqui num estúdio igual ao do
 *   editor (`render/fotoBoneco.ts`): a mesma luz, o boneco padrão e a pose de verdade
 *   (`aplicarGesto` em cima da pose parada, no instante que mais diz o gesto).
 *
 * Nas duas, a mesma sombrinha no chão e as mesmas marquinhas de movimento (nunca sozinhas: só
 * junto da mão ou da cabeça que se mexe).
 *
 * `?esboco=gestos034` sozinho abre a folha (sem o jogo): cada gesto e a carinha, o ícone de
 * hoje, A e B lado a lado, no botão do meio da roleta (96 px), no vizinho (78 %), a 48 px e no
 * balão. `?esboco=gestos034&direcao=A` (ou B) abre o jogo de verdade com os ícones daquela
 * direção na roleta de Gestos, no balão e nas carinhas.
 *
 * A direção escolhida pelo dono (20 nov 2026) é a **A reforçada** (A2): o mesmo boneco desenhado
 * com um objeto forte em cada gesto. `?esboco=gestos034&folha=A2` abre a folha dela (hoje, a A de
 * antes e a A2) e `?esboco=gestos034&direcao=A2` abre o jogo com ela.
 */
import { Engine } from '@babylonjs/core/Engines/engine';
import { Scene } from '@babylonjs/core/scene';
import { FreeCamera } from '@babylonjs/core/Cameras/freeCamera';
import { Camera } from '@babylonjs/core/Cameras/camera';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { aparenciaPadrao, PALETAS } from '../personagem/aparencia';
import { alturaBoneco, misturar, topoBoneco } from '../personagem/boneco';
import { aplicarGesto, GESTOS, type IdGesto } from '../personagem/gestos';
import { calcularPose } from '../personagem/poses';
import { criarBoneco } from '../render/boneco';
import { ICONES_GESTOS, svgDoBalao, svgDoIcone } from '../ui/iconesGestos';
import { TAM_ROLETA } from '../ui/roleta';

type Direcao = 'A' | 'B' | 'A2';
type IdIcone = IdGesto | 'carinha';

// ------------------------------------------------------------------ as cores do boneco padrão
const AP = aparenciaPadrao();
const escurecer = (c: string, t: number) => misturar(c, '#000000', t);
const clarear = (c: string, t: number) => misturar(c, '#ffffff', t);
/** As cores do boneco que se desenha agora (o padrão; o amigo do aperto de mão troca e volta). */
interface CoresBoneco {
  pele: string;
  cabelo: string;
  roupa: string;
  calca: string;
}
const CORES_PADRAO: CoresBoneco = {
  pele: PALETAS.pele[AP.pele],
  cabelo: PALETAS.cabelo[AP.cabeloCor],
  roupa: PALETAS.roupa[AP.roupaCor],
  calca: PALETAS.calca[AP.calcaCor],
};
let PELE = '';
let CABELO = '';
let ROUPA = '';
let CALCA = '';
let SAPATO = '';
let PUNHO = '';
let CINTO = '';
let BOCHECHA = '';
function usarCores(c: CoresBoneco): void {
  PELE = c.pele;
  CABELO = c.cabelo;
  ROUPA = c.roupa;
  CALCA = c.calca;
  SAPATO = escurecer(misturar(CALCA, '#5a3a22', 0.5), 0.25);
  PUNHO = escurecer(ROUPA, 0.22);
  CINTO = escurecer(ROUPA, 0.45);
  BOCHECHA = misturar(PELE, '#ff7a7a', 0.55);
}
usarCores(CORES_PADRAO);
const FIVELA = '#f2d16b';
const OLHO = '#231a28';
const BOCA = '#9a4a3c';
/** O contorno dos ícones do jogo. */
const TINTA = '#3b2a1e';
/** As marquinhas de movimento (a mesma cor das dos ícones de hoje). */
const MARCA = '#a8610a';

// ---------------------------------------------------------------------- A: o boneco em SVG
/**
 * A pose desenhada (ângulos em graus). De frente: os braços abrem para fora (0 = caído, 90 =
 * deitado para o lado, 180 = para o alto; negativo = para dentro, na frente do peito); as
 * pernas abrem para fora. De lado (o boneco olha para a direita da folha): braço e perna para a
 * frente (positivo) ou para trás; o tronco se curva para a frente.
 */
interface PoseA {
  vista: 'frente' | 'lado';
  /** O corpo inteiro sobe (pulo) ou desce (sentado), em unidades do boneco. */
  sobe?: number;
  /** Inclinação do tronco (de frente: de lado, positivo para a esquerda da folha; de lado: curva para a frente). */
  tronco?: number;
  /** A cabeça em cima do tronco (o mesmo sentido do tronco). */
  cabeca?: number;
  /** De frente: o braço da esquerda e o da direita da folha. De lado: o de perto e o de longe. */
  bracos?: [number, number];
  /** Encurta o braço que vem para a frente (de frente, 1 = inteiro). */
  encurta?: [number, number];
  pernas?: [number, number];
  /** Os olhos olham para um lado (de frente, em unidades). */
  olhar?: number;
  boca?: 'sorriso' | 'aberta';
  /** O braço de longe (de lado) vai na frente do corpo (reverência: o floreio no peito). */
  longeNaFrente?: boolean;
  /** Marquinhas: [x, y, giro] em unidades, junto do que se mexe. */
  marcas?: Array<{
    tipo: 'arco' | 'risco' | 'brilho';
    x: number;
    y: number;
    giro?: number;
    tam?: number;
  }>;
  /**
   * A guitarra-raio da Vila Neon (a mesma da fantasia de roqueiro, `ui/alma/arteVila.ts`) nas
   * mãos: o roqueiro só existe na Vila, e a guitarra de mentirinha sozinha não se lê.
   */
  guitarra?: { x: number; y: number; giro: number; k: number };
  /** A2: o objeto forte do gesto (SVG no espaço do boneco), atrás do boneco e na frente dele. */
  fundo?: string;
  frente?: string;
  /** A2, de frente: o braço (0 ou 1) com a mão aberta do tchau, o giro do pulso (graus) e o tamanho. */
  maoAberta?: [0 | 1, number, number?];
  /** Quadro: o meio (x, y) e a meia altura mostrada, em unidades. */
  quadro: { x: number; y: number; meia: number };
}

const UNID = 'vector-effect="non-scaling-stroke"';
/** Contorno (px do viewBox de 64). */
const CONTORNO = 1.9;
const contorno = `stroke="${TINTA}" stroke-width="${CONTORNO}" stroke-linejoin="round" ${UNID}`;

function caixa(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  r: number,
  cor: string,
  extra = '',
): string {
  return `<rect x="${x0.toFixed(3)}" y="${y0.toFixed(3)}" width="${(x1 - x0).toFixed(3)}" height="${(y1 - y0).toFixed(3)}" rx="${r}" fill="${cor}" ${contorno} ${extra}/>`;
}
function bola(x: number, y: number, r: number, cor: string, comContorno = true): string {
  return `<circle cx="${x.toFixed(3)}" cy="${y.toFixed(3)}" r="${r}" fill="${cor}" ${comContorno ? contorno : ''}/>`;
}
function elipse(x: number, y: number, rx: number, ry: number, cor: string): string {
  return `<ellipse cx="${x.toFixed(3)}" cy="${y.toFixed(3)}" rx="${rx}" ry="${ry}" fill="${cor}"/>`;
}
/** Brilho de plástico: uma faixa clara no alto da peça (sem contorno). */
function brilho(x0: number, y0: number, x1: number, y1: number, r: number, a = 0.35): string {
  return `<rect x="${x0.toFixed(3)}" y="${y0.toFixed(3)}" width="${(x1 - x0).toFixed(3)}" height="${(y1 - y0).toFixed(3)}" rx="${r}" fill="#ffffff" opacity="${a}"/>`;
}

/** O braço (no ombro, caído para baixo; quem chama gira e encurta). */
function braco(
  cor = ROUPA,
  longe = false,
  aberta: number | false = false,
  kPalma?: number,
): string {
  const manga = longe ? escurecer(cor, 0.18) : cor;
  const pele = longe ? escurecer(PELE, 0.12) : PELE;
  const punho = caixa(-0.074, -0.24, 0.074, -0.19, 0.02, escurecer(manga, 0.22));
  return (
    caixa(-0.068, -0.235, 0.068, 0.04, 0.06, manga) +
    (aberta !== false
      ? palma(pele, aberta, kPalma) + punho
      : punho +
        bola(0, -0.275, 0.088, pele) +
        `<circle cx="-0.025" cy="-0.25" r="0.028" fill="#ffffff" opacity="0.45"/>`)
  );
}

/**
 * A2: a mão aberta do tchau (a palma de frente, os quatro dedos abertos em leque e o polegar),
 * no lugar da bolinha e maior que ela: os vãos entre os dedos dizem "mão" mesmo a 48 px.
 */
function palma(pele: string, giro = 0, k = 1.3): string {
  // os dedos (atrás da palma, que cobre a base deles), cada um girando um tiquinho para fora
  let dedos = '';
  for (const [x, comp, giroDedo] of [
    [-0.07, 0.16, -20],
    [-0.024, 0.19, -7],
    [0.024, 0.19, 7],
    [0.07, 0.16, 20],
  ] as const)
    dedos += `<g transform="rotate(${giroDedo} ${x} -0.3)">${caixa(x - 0.023, -0.3 - comp, x + 0.023, -0.28, 0.023, pele)}</g>`;
  return (
    `<g transform="translate(0 -0.2) rotate(${giro}) scale(${k}) translate(0 0.2)">` +
    dedos +
    `<ellipse cx="0" cy="0" rx="0.034" ry="0.078" fill="${pele}" ${contorno} transform="translate(-0.112 -0.255) rotate(42)"/>` +
    caixa(-0.1, -0.335, 0.1, -0.17, 0.05, pele) +
    `<ellipse cx="-0.035" cy="-0.27" rx="0.028" ry="0.045" fill="#ffffff" opacity="0.35"/></g>`
  );
}

function rosto(p: PoseA): string {
  const olhar = p.olhar ?? 0;
  if (p.vista === 'lado') {
    // de lado (olhando para a direita): um olho perto da frente, a bochecha e a boquinha
    return (
      elipse(0.21, 1.05, 0.055, 0.083, OLHO) +
      bola(0.228, 1.085, 0.022, '#ffffff', false) +
      elipse(0.2, 0.94, 0.06, 0.036, BOCHECHA) +
      (p.boca === 'aberta'
        ? `<path d="M0.25 0.935 L0.325 0.935 L0.325 0.86 C0.28 0.855 0.25 0.885 0.25 0.935 Z" fill="${BOCA}"/>`
        : `<path d="M0.26 0.915 Q0.3 0.895 0.325 0.91" fill="none" stroke="${BOCA}" stroke-width="1.6" stroke-linecap="round" ${UNID}/>`)
    );
  }
  let s = '';
  for (const x of [-0.15, 0.15]) {
    s += elipse(x + olhar, 1.05, 0.064, 0.083, OLHO);
    s += bola(x + olhar + 0.025, 1.09, 0.024, '#ffffff', false);
    s += elipse(x * 1.45, 0.94, 0.065, 0.0375, BOCHECHA);
  }
  s +=
    p.boca === 'aberta'
      ? `<path d="M-0.085 0.935 L0.085 0.935 C0.085 0.875 0.05 0.835 0 0.835 C-0.05 0.835 -0.085 0.875 -0.085 0.935 Z" fill="${BOCA}"/><path d="M-0.045 0.86 C-0.03 0.88 0.03 0.88 0.045 0.86 C0.03 0.84 -0.03 0.84 -0.045 0.86 Z" fill="#e9877a"/>`
      : `<path d="M-0.06 0.925 Q0 0.875 0.06 0.925" fill="none" stroke="${BOCA}" stroke-width="1.8" stroke-linecap="round" ${UNID}/>`;
  return s;
}

/** A cabeça inteira (em volta do pescoço em 0,76): cabelo, rosto e topete. */
function cabeca(p: PoseA): string {
  if (p.vista === 'lado')
    return (
      caixa(-0.325, 0.75, 0.325, 1.43, 0.18, PELE) +
      brilho(-0.25, 1.28, 0.2, 1.38, 0.05, 0.25) +
      rosto(p) +
      // a nuca: o cabelo de trás aparece do lado da cabeça
      caixa(-0.355, 0.9, -0.15, 1.32, 0.07, CABELO) +
      caixa(-0.35, 1.2, 0.35, 1.5, 0.14, CABELO) +
      brilho(-0.28, 1.4, 0.22, 1.46, 0.03, 0.18) +
      `<ellipse cx="0.16" cy="1.43" rx="0.16" ry="0.1" fill="${CABELO}" ${contorno}/>` +
      brilho(0.06, 1.47, 0.2, 1.5, 0.02, 0.22)
    );
  return (
    // a nuca aparece um tiquinho dos lados (costeletas)
    caixa(-0.39, 0.92, 0.39, 1.32, 0.07, CABELO) +
    caixa(-0.36, 0.75, 0.36, 1.43, 0.18, PELE) +
    brilho(-0.28, 1.28, 0.22, 1.38, 0.05, 0.25) +
    rosto(p) +
    caixa(-0.385, 1.2, 0.385, 1.5, 0.14, CABELO) +
    brilho(-0.3, 1.4, 0.24, 1.46, 0.03, 0.18) +
    `<ellipse cx="0.1" cy="1.43" rx="0.16" ry="0.1" fill="${CABELO}" ${contorno}/>` +
    brilho(0.0, 1.47, 0.18, 1.5, 0.02, 0.22)
  );
}

/** A guitarra-raio de brinquedo (o desenho de `ui/alma/arteVila.ts`, no espaço do boneco). */
function guitarra(g: NonNullable<PoseA['guitarra']>): string {
  const estrela: string[] = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 ? 1.5 : 3.4;
    estrela.push(`${(1.5 + Math.cos(a) * r).toFixed(1)},${(12 + Math.sin(a) * r).toFixed(1)}`);
  }
  const corpo = 'M-6 0 L12 0 L2 9 L15 9 L-9 30 L-3 15 L-15 15 Z';
  return `<g transform="translate(${g.x} ${g.y}) rotate(${g.giro}) scale(${g.k} ${-g.k})">
    <path d="${corpo}" fill="#9a1a14" transform="translate(1 3)"/>
    <path d="${corpo}" fill="#e8302a" ${contorno}/>
    <rect x="-3.5" y="-28" width="7" height="30" rx="2" fill="#f2c27a" ${contorno}/>
    <rect x="-5.5" y="-36" width="11" height="10" rx="3" fill="#3d3c48" ${contorno}/>
    <circle cx="-8" cy="-33" r="2.4" fill="#ffd23d" ${contorno}/><circle cx="8" cy="-33" r="2.4" fill="#ffd23d" ${contorno}/>
    <polygon points="${estrela.join(' ')}" fill="#ffe66a"/></g>`;
}

function rot(graus: number, x: number, y: number): string {
  return `rotate(${graus.toFixed(2)} ${x} ${y})`;
}

/** As marquinhas (no espaço do boneco, y para cima). */
function marcas(p: PoseA): string {
  let s = '';
  for (const m of p.marcas ?? []) {
    const t = m.tam ?? 1;
    const g = `transform="translate(${m.x} ${m.y}) rotate(${m.giro ?? 0}) scale(${t})"`;
    const traço = `fill="none" stroke="${MARCA}" stroke-width="2.1" stroke-linecap="round" ${UNID}`;
    if (m.tipo === 'arco')
      s += `<g ${g}><path d="M0 -0.11 Q0.07 0 0 0.11" ${traço}/><path d="M0.08 -0.16 Q0.18 0 0.08 0.16" ${traço}/></g>`;
    else if (m.tipo === 'risco')
      s += `<g ${g}><path d="M0 0 L0.12 0" ${traço}/><path d="M0.02 0.08 L0.12 0.12" ${traço}/><path d="M0.02 -0.08 L0.12 -0.12" ${traço}/></g>`;
    else
      s += `<g ${g}><path d="M0 0.05 L0 0.15 M0.06 0.03 L0.12 0.1 M-0.06 0.03 L-0.12 0.1" ${traço}/></g>`;
  }
  return s;
}

/** O boneco inteiro, no espaço dele (pés no chão em y = 0, y para cima). */
function bonecoA(p: PoseA): string {
  const sobe = p.sobe ?? 0;
  const tronco = p.tronco ?? 0;
  const cab = p.cabeca ?? 0;
  const [b0, b1] = p.bracos ?? [6, 6];
  const [k0, k1] = p.encurta ?? [1, 1];
  const [p0, p1] = p.pernas ?? [0, 0];
  // a sombra fica no chão (o pulo se vê pela distância)
  const sombraL = p.vista === 'lado' && (p.sobe ?? 0) < -0.1 ? 0.5 : 0.36;
  let s = p.fundo ?? '';
  s += `<ellipse cx="${p.vista === 'lado' && sobe < -0.1 ? 0.2 : 0}" cy="0" rx="${sombraL}" ry="0.055" fill="${TINTA}" opacity="0.16"/>`;
  s += `<g transform="translate(0 ${sobe})">`;
  if (p.vista === 'frente') {
    // pernas e sapatos (abrem em volta do quadril)
    for (const [lado, ang] of [
      [-1, p0],
      [1, p1],
    ] as const) {
      const x = lado * 0.11;
      s += `<g transform="${rot(lado * ang, x, 0.34)}">${caixa(x - 0.085, 0.1, x + 0.085, 0.36, 0.035, CALCA)}${caixa(x - 0.11, 0, x + 0.11, 0.135, 0.055, SAPATO)}${brilho(x - 0.08, 0.095, x + 0.06, 0.12, 0.01, 0.2)}</g>`;
    }
    s += `<g transform="${rot(tronco, 0, 0.34)}">`;
    const bracoFrente = (lado: -1 | 1, ang: number, k: number) =>
      `<g transform="translate(${lado * 0.28} 0.68) ${`rotate(${(lado * ang).toFixed(2)})`} scale(1 ${k})">${braco(ROUPA, false, p.maoAberta?.[0] === (lado < 0 ? 0 : 1) ? p.maoAberta[1] : false, p.maoAberta?.[2])}</g>`;
    // os braços para o alto passam atrás da cabeça (no jogo também)
    const atras = (ang: number) => ang > 120;
    if (atras(b0)) s += bracoFrente(-1, b0, k0);
    if (atras(b1)) s += bracoFrente(1, b1, k1);
    s += caixa(-0.22, 0.22, 0.22, 0.38, 0.05, CALCA);
    s += caixa(-0.23, 0.34, 0.23, 0.76, 0.11, ROUPA);
    s += brilho(-0.17, 0.66, 0.14, 0.72, 0.03, 0.22);
    s += caixa(-0.24, 0.31, 0.24, 0.43, 0.04, ROUPA);
    s += caixa(-0.2425, 0.425, 0.2425, 0.475, 0.02, CINTO);
    s += caixa(-0.04, 0.42, 0.04, 0.48, 0.015, FIVELA);
    s += `<g transform="${rot(cab, 0, 0.76)}">${cabeca(p)}</g>`;
    if (!atras(b0)) s += bracoFrente(-1, b0, k0);
    if (!atras(b1)) s += bracoFrente(1, b1, k1);
    s += '</g>';
  } else {
    // de lado, olhando para a direita: a perna de longe mais escura, atrás
    const perna = (ang: number, longe: boolean) => {
      const c = longe ? escurecer(CALCA, 0.2) : CALCA;
      const sp = longe ? escurecer(SAPATO, 0.2) : SAPATO;
      return `<g transform="${rot(ang, 0, 0.34)}">${caixa(-0.09, 0.1, 0.09, 0.36, 0.035, c)}${caixa(-0.11, 0, 0.17, 0.135, 0.055, sp)}</g>`;
    };
    s += perna(p1, true) + perna(p0, false);
    s += `<g transform="${rot(-tronco, 0, 0.34)}">`;
    const bracoLado = (ang: number, k: number, longe: boolean) =>
      `<g transform="translate(0 0.68) rotate(${ang.toFixed(2)}) scale(1 ${k})">${braco(ROUPA, longe)}</g>`;
    if (!p.longeNaFrente) s += bracoLado(b1, k1, true);
    s += caixa(-0.155, 0.22, 0.155, 0.38, 0.05, CALCA);
    s += caixa(-0.17, 0.34, 0.17, 0.76, 0.1, ROUPA);
    s += brilho(-0.12, 0.66, 0.1, 0.72, 0.03, 0.22);
    s += caixa(-0.18, 0.31, 0.18, 0.43, 0.04, ROUPA);
    s += caixa(-0.1825, 0.425, 0.1825, 0.475, 0.02, CINTO);
    s += caixa(0.16, 0.42, 0.2, 0.48, 0.012, FIVELA);
    s += `<g transform="${rot(-cab, 0, 0.76)}">${cabeca(p)}</g>`;
    if (p.longeNaFrente) s += bracoLado(b1, k1, true);
    if (p.guitarra) s += guitarra(p.guitarra);
    s += bracoLado(b0, k0, false);
    s += '</g>';
  }
  s += '</g>';
  return s + marcas(p) + (p.frente ?? '');
}

const POSES_A: Record<IdGesto, PoseA> = {
  // o braço lá no alto, a mãozinha balançando
  acenar: {
    vista: 'frente',
    tronco: -4,
    bracos: [162, 8],
    cabeca: -14,
    boca: 'aberta',
    marcas: [
      { tipo: 'arco', x: -0.56, y: 1.02, giro: 180, tam: 1.1 },
      { tipo: 'arco', x: -0.2, y: 1.12, giro: 0, tam: 0.8 },
    ],
    quadro: { x: -0.1, y: 0.76, meia: 0.8 },
  },
  // a reverência de "oi": de lado, o corpo se curva
  cumprimentar: {
    vista: 'lado',
    tronco: 26,
    cabeca: 10,
    bracos: [18, 14],
    pernas: [0, 0],
    quadro: { x: 0.26, y: 0.66, meia: 0.8 },
  },
  // "vem cá": o braço na frente, a mão puxando para perto
  chamar: {
    vista: 'lado',
    cabeca: -6,
    bracos: [118, 10],
    boca: 'aberta',
    marcas: [
      { tipo: 'arco', x: 0.52, y: 1.06, giro: 160, tam: 0.9 },
      { tipo: 'arco', x: 0.64, y: 0.78, giro: 200, tam: 0.9 },
    ],
    quadro: { x: 0.14, y: 0.76, meia: 0.8 },
  },
  // os dois braços para o alto, pulando de alegria
  comemorar: {
    vista: 'frente',
    sobe: 0.12,
    bracos: [140, 140],
    pernas: [6, 6],
    boca: 'aberta',
    quadro: { x: 0, y: 0.8, meia: 0.84 },
  },
  // as mãos batendo na frente do peito
  aplaudir: {
    vista: 'frente',
    bracos: [-76, -76],
    encurta: [0.84, 0.84],
    boca: 'aberta',
    marcas: [
      { tipo: 'brilho', x: -0.1, y: 0.7, giro: 35, tam: 1.15 },
      { tipo: 'brilho', x: 0.1, y: 0.7, giro: -35, tam: 1.15 },
    ],
    quadro: { x: 0, y: 0.76, meia: 0.8 },
  },
  // um braço em cima, o outro embaixo, o corpo de lado
  dancar: {
    vista: 'frente',
    sobe: 0.03,
    tronco: 9,
    cabeca: -12,
    bracos: [140, 45],
    pernas: [14, -4],
    boca: 'aberta',
    marcas: [
      { tipo: 'arco', x: 0.42, y: 0.3, giro: 0, tam: 0.9 },
      { tipo: 'arco', x: -0.42, y: 0.3, giro: 180, tam: 0.9 },
    ],
    quadro: { x: 0, y: 0.78, meia: 0.86 },
  },
  // o braço esticado para um lado, os olhos para lá
  apontar: {
    vista: 'frente',
    bracos: [96, 8],
    olhar: -0.07,
    cabeca: 5,
    quadro: { x: -0.16, y: 0.76, meia: 0.84 },
  },
  // sentado no chão, as pernas para a frente
  sentar: {
    vista: 'lado',
    sobe: -0.215,
    tronco: -8,
    cabeca: -4,
    bracos: [-28, -20],
    pernas: [90, 84],
    quadro: { x: 0.16, y: 0.6, meia: 0.72 },
  },
  // no ar, braços e pernas abertos como uma estrela
  'pulo-estrela': {
    vista: 'frente',
    sobe: 0.18,
    bracos: [128, 128],
    pernas: [24, 24],
    boca: 'aberta',
    quadro: { x: 0, y: 0.84, meia: 0.92 },
  },
  // a reverência de princesa ou príncipe: curvado, um braço no peito e o outro para trás
  reverencia: {
    vista: 'lado',
    tronco: 46,
    cabeca: 8,
    bracos: [-105, 62],
    longeNaFrente: true,
    pernas: [14, -16],
    quadro: { x: 0.3, y: 0.64, meia: 0.8 },
  },
  // bater cabeça: a cabeça baixa no tempo, tocando a guitarra-raio da Vila
  roqueiro: {
    vista: 'lado',
    tronco: 10,
    cabeca: 26,
    bracos: [78, 48],
    pernas: [8, -6],
    boca: 'aberta',
    guitarra: { x: 0.2, y: 0.58, giro: -58, k: 0.0115 },
    marcas: [
      { tipo: 'arco', x: -0.46, y: 1.3, giro: 150, tam: 1.1 },
      { tipo: 'arco', x: 0.5, y: 1.46, giro: 20, tam: 0.9 },
    ],
    quadro: { x: 0.08, y: 0.76, meia: 0.84 },
  },
};

/** O SVG da direção A (viewBox 0 0 64 64; o boneco no espaço dele, y para cima). */
export function svgA(id: IdIcone, lado = 64): string {
  let corpo: string;
  let q: PoseA['quadro'];
  if (id === 'carinha') {
    // só a cabeça, de frente, sorrindo
    const p: PoseA = { vista: 'frente', boca: 'aberta', quadro: { x: 0, y: 1.11, meia: 0.44 } };
    corpo = cabeca(p);
    q = p.quadro;
  } else {
    const p = POSES_A[id];
    corpo = bonecoA(p);
    q = p.quadro;
  }
  const esc = 32 / q.meia;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="${lado}" height="${lado}"><g transform="translate(${32 - q.x * esc} ${32 + q.y * esc}) scale(${esc} ${-esc})">${corpo}</g></svg>`;
}

// ------------------------------------------------- A2: o boneco com o objeto forte do gesto
/*
 * A direção A reforçada (decisão do dono, 20 nov 2026): o mesmo boneco desenhado, e junto dele
 * um objeto grande que só aquele gesto tem (confete, faíscas, notas, setinha, cadeira, estrela,
 * floreio, ondas de som, a mão do amigo), para nenhum ícone ficar parecido com outro a 48 px.
 * Os objetos ficam no espaço do boneco (y para cima), com o mesmo contorno dos ícones do jogo.
 */
const AMARELO = '#ffd45a';
const ROSA = '#ff8fb3';
const AZUL = '#7cc6ff';
const LARANJA = '#ffa53a';
const MADEIRA = '#d8924c';
/** O amigo do aperto de mão: as cores da "Jardineira", outro boneco pronto do jogo. */
const CORES_AMIGO: CoresBoneco = {
  pele: PALETAS.pele[2],
  cabelo: PALETAS.cabelo[3],
  roupa: PALETAS.roupa[2],
  calca: PALETAS.calca[1],
};
const contornoFino = `stroke="${TINTA}" stroke-width="1.3" stroke-linejoin="round" ${UNID}`;
type Ponto = [number, number];

function poli(pts: Ponto[], cor: string, fino = false): string {
  const d = pts.map(([x, y]) => `${x.toFixed(3)},${y.toFixed(3)}`).join(' ');
  return `<polygon points="${d}" fill="${cor}" ${fino ? contornoFino : contorno}/>`;
}

/** Estrela de `n` pontas (a primeira para cima). */
function estrela(x: number, y: number, r: number, ri: number, cor: string, n = 5, fino = false) {
  const pts: Ponto[] = [];
  for (let i = 0; i < n * 2; i++) {
    const a = Math.PI / 2 + (i * Math.PI) / n;
    const rr = i % 2 ? ri : r;
    pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]);
  }
  return poli(pts, cor, fino);
}

/** Faísca de quatro pontas, com o brilhinho no meio. */
function faisca(x: number, y: number, r: number, cor = AMARELO): string {
  return estrela(x, y, r, r * 0.4, cor, 4, true) + bola(x, y, r * 0.16, '#ffffff', false);
}

/** Traço duplo (o contorno escuro por baixo e a cor por cima), para linhas que precisam ler. */
function traco(d: string, cor: string, larg = 2.6): string {
  const base = `fill="none" stroke-linecap="round" stroke-linejoin="round" ${UNID}`;
  return `<path d="${d}" stroke="${TINTA}" stroke-width="${larg + 2.2}" ${base}/><path d="${d}" stroke="${cor}" stroke-width="${larg}" ${base}/>`;
}

/** Um pedacinho de confete: tirinha girada ou bolinha. */
function confete(x: number, y: number, giro: number, cor: string, bolinha = false): string {
  if (bolinha) return `<circle cx="${x}" cy="${y}" r="0.076" fill="${cor}" ${contornoFino}/>`;
  return `<rect x="-0.125" y="-0.058" width="0.25" height="0.116" rx="0.024" fill="${cor}" ${contornoFino} transform="translate(${x} ${y}) rotate(${giro})"/>`;
}

/** Nota musical (colcheia): a cabeça em (x, y), a haste para cima. */
function nota(x: number, y: number, k: number, cor: string): string {
  const hx = x + 0.075 * k;
  const topo = y + 0.34 * k;
  return (
    traco(`M${hx} ${y} L${hx} ${topo} Q${hx + 0.05 * k} ${topo - 0.1 * k} ${hx + 0.15 * k} ${topo - 0.14 * k} Q${hx + 0.19 * k} ${topo - 0.2 * k} ${hx + 0.14 * k} ${topo - 0.26 * k}`, TINTA, 1.6) +
    `<ellipse cx="0" cy="0" rx="${0.088 * k}" ry="${0.064 * k}" fill="${cor}" ${contorno} transform="translate(${x} ${y}) rotate(22)"/>`
  );
}

/** Duas notas ligadas (semicolcheias de desenho): as cabeças em (x, y) e um pouco mais acima. */
function notas2(x: number, y: number, k: number, cor: string): string {
  const d = 0.26 * k;
  const sobe = 0.07 * k;
  const h = 0.34 * k;
  const a = x + 0.075 * k;
  const b = a + d;
  return (
    traco(`M${a} ${y} L${a} ${y + h} M${b} ${y + sobe} L${b} ${y + sobe + h}`, TINTA, 1.6) +
    poli(
      [
        [a - 0.012, y + h - 0.075 * k],
        [b + 0.012, y + sobe + h - 0.075 * k],
        [b + 0.012, y + sobe + h + 0.012],
        [a - 0.012, y + h + 0.012],
      ],
      TINTA,
      true,
    ) +
    `<ellipse cx="0" cy="0" rx="${0.088 * k}" ry="${0.064 * k}" fill="${cor}" ${contorno} transform="translate(${x} ${y}) rotate(22)"/>` +
    `<ellipse cx="0" cy="0" rx="${0.088 * k}" ry="${0.064 * k}" fill="${cor}" ${contorno} transform="translate(${x + d} ${y + sobe}) rotate(22)"/>`
  );
}

/** A setinha: a ponta em (x, y), apontando para o lado `dir` (-1 esquerda, 1 direita). */
function seta(x: number, y: number, dir: -1 | 1, k = 1): string {
  const c = 0.2 * k; // comprimento da cabeça
  const a = 0.15 * k; // meia altura da cabeça
  const t = 0.065 * k; // meia grossura da haste
  const h = 0.26 * k; // comprimento da haste
  const X = (v: number) => x - dir * v;
  return (
    poli(
      [
        [x, y],
        [X(c), y + a],
        [X(c), y + t],
        [X(c + h), y + t],
        [X(c + h), y - t],
        [X(c), y - t],
        [X(c), y - a],
      ],
      AZUL,
    ) + brilho(Math.min(X(c + h), X(c)) + 0.02, y + 0.005, Math.max(X(c + h), X(c)) - 0.02, y + t - 0.015, 0.01, 0.45)
  );
}

/** A cadeira de madeira de lado (o encosto à esquerda): o assento em cima em `s`. */
function cadeira(s: number): string {
  const esc = escurecer(MADEIRA, 0.25);
  const tampo = 0.095;
  return (
    // as pernas de longe, mais escuras, um tiquinho para trás
    caixa(-0.26, 0, -0.16, s - tampo + 0.01, 0.025, esc) +
    caixa(0.2, 0, 0.3, s - tampo + 0.01, 0.025, esc) +
    // o encosto (o pé que sobe e a travessa larga)
    caixa(-0.42, 0, -0.31, s + 0.6, 0.035, MADEIRA) +
    caixa(-0.45, s + 0.34, -0.28, s + 0.64, 0.05, MADEIRA) +
    brilho(-0.43, s + 0.55, -0.3, s + 0.61, 0.02, 0.35) +
    // o assento e a perna da frente
    caixa(0.1, 0, 0.21, s - tampo + 0.01, 0.025, MADEIRA) +
    caixa(-0.44, s - tampo, 0.28, s, 0.035, MADEIRA) +
    brilho(-0.4, s - 0.035, 0.23, s - 0.015, 0.01, 0.4)
  );
}

/** O floreio dourado que sai da mão (x, y), para trás e enrolando. */
function floreio(x: number, y: number): string {
  return (
    traco(
      `M${x} ${y} C${x - 0.12} ${y + 0.1} ${x - 0.3} ${y + 0.12} ${x - 0.38} ${y + 0.02} C${x - 0.46} ${y - 0.08} ${x - 0.38} ${y - 0.2} ${x - 0.28} ${y - 0.17} C${x - 0.2} ${y - 0.14} ${x - 0.21} ${y - 0.05} ${x - 0.28} ${y - 0.06}`,
      '#ffc93d',
      2.2,
    ) +
    faisca(x - 0.08, y + 0.24, 0.085) +
    faisca(x - 0.5, y + 0.2, 0.06)
  );
}

/** As ondas de som saindo da boca (x, y) para a direita: três arcos crescendo. */
function ondasSom(x: number, y: number): string {
  let s = '';
  for (const [i, r] of [0.13, 0.25, 0.37].entries()) {
    const ab = 0.55 + i * 0.05;
    s += traco(`M${x + r * 0.62} ${y + r * ab} Q${x + r * 1.18} ${y} ${x + r * 0.62} ${y - r * ab}`, AZUL, 2.8);
  }
  return s;
}

/** O amigo: o mesmo boneco com as cores dele, espelhado (olhando para o outro) em x = `dx`. */
function amigo(p: PoseA, dx: number): string {
  usarCores(CORES_AMIGO);
  const s = `<g transform="translate(${dx} 0) scale(-1 1)">${bonecoA({ ...p, fundo: undefined, frente: undefined })}</g>`;
  usarCores(CORES_PADRAO);
  return s;
}

/** Onde fica a mão (o meio da bolinha) do braço `i` da pose, no espaço do boneco. */
function maoDe(p: PoseA, i: 0 | 1, ate = 0.275): Ponto {
  const sobe = p.sobe ?? 0;
  const tronco = p.tronco ?? 0;
  const ang = (p.bracos ?? [6, 6])[i];
  const k = (p.encurta ?? [1, 1])[i];
  const L = ate * k;
  let ox: number;
  let th: number;
  let rt: number;
  if (p.vista === 'frente') {
    const lado = i === 0 ? -1 : 1;
    ox = lado * 0.28;
    th = (lado * ang * Math.PI) / 180;
    rt = (tronco * Math.PI) / 180;
  } else {
    ox = 0;
    th = (ang * Math.PI) / 180;
    rt = (-tronco * Math.PI) / 180;
  }
  const x = ox + L * Math.sin(th);
  const y = 0.68 - L * Math.cos(th) - 0.34;
  return [x * Math.cos(rt) - y * Math.sin(rt), 0.34 + x * Math.sin(rt) + y * Math.cos(rt) + sobe];
}

/** Monta a pose A2 e põe os objetos em volta dela (que sabem onde estão as mãos). */
function comObjetos(
  p: PoseA,
  objetos: (m: (i: 0 | 1, ate?: number) => Ponto) => { fundo?: string; frente?: string },
): PoseA {
  return { ...p, ...objetos((i, ate) => maoDe(p, i, ate)) };
}

const POSES_A2: Record<IdGesto, PoseA> = {
  // a mão bem no alto e as marquinhas do tchau dos dois lados dela
  acenar: comObjetos(
    {
      vista: 'frente',
      // o corpo se afasta da mão, para a palma ficar solta no céu e não colar no rosto
      tronco: -12,
      bracos: [98, 10],
      cabeca: -16,
      boca: 'aberta',
      maoAberta: [0, -66, 1.45],
      quadro: { x: -0.2, y: 0.84, meia: 0.9 },
    },
    (m) => {
      // o pulso, e a palma em pé em cima dele
      const [px, py] = m(0, 0.2);
      const x = px - 0.02;
      const y = py + 0.24;
      // as marquinhas do tchau: dois risquinhos curvos por fora da palma, finos e sem contorno
      // (com contorno, a 48 px eles grudavam na palma e viravam uma corneta)
      const arco = (dx: number, r: number) =>
        `<path d="M${x + dx} ${y + r} Q${x + dx + Math.sign(dx) * r * 0.6} ${y} ${x + dx} ${y - r}" fill="none" stroke="${MARCA}" stroke-width="2.3" stroke-linecap="round" ${UNID}/>`;
      return { frente: arco(-0.3, 0.13) + arco(-0.42, 0.2) };
    },
  ),
  // em pé, a mão estendida para a frente apertando a mão do amigo, que balança
  cumprimentar: (() => {
    const base: PoseA = {
      vista: 'frente',
      tronco: -3,
      cabeca: -5,
      bracos: [8, 88],
      olhar: 0.06,
      boca: 'aberta',
      quadro: { x: 0, y: 0, meia: 1 },
    };
    const [hx, hy] = maoDe(base, 1);
    // o amigo espelhado do outro lado, as duas mãos uma por cima da outra no meio
    const D = 2 * hx + 0.09;
    const x = D / 2;
    return {
      ...base,
      quadro: { x, y: 0.76, meia: 1.04 },
      frente:
        amigo(base, D) +
        traco(`M${x - 0.1} ${hy + 0.18} Q${x} ${hy + 0.25} ${x + 0.1} ${hy + 0.18}`, LARANJA, 2.2) +
        traco(`M${x - 0.1} ${hy - 0.18} Q${x} ${hy - 0.25} ${x + 0.1} ${hy - 0.18}`, LARANJA, 2.2),
    };
  })(),
  // a mão do lado da boca e as ondas do grito saindo para a frente
  chamar: comObjetos(
    {
      vista: 'lado',
      cabeca: -16,
      bracos: [134, 8],
      encurta: [1.1, 1],
      boca: 'aberta',
      quadro: { x: 0.1, y: 0.77, meia: 0.84 },
    },
    () => ({ frente: ondasSom(0.4, 0.99) }),
  ),
  // pulando de alegria, os braços para o alto e o confete caindo em volta
  comemorar: comObjetos(
    {
      vista: 'frente',
      sobe: 0.1,
      bracos: [152, 152],
      pernas: [4, 4],
      boca: 'aberta',
      quadro: { x: 0, y: 0.88, meia: 0.92 },
    },
    () => ({
      fundo:
        confete(-0.6, 1.5, 30, ROSA) +
        confete(-0.24, 1.72, -20, AZUL) +
        confete(0.2, 1.74, 15, AMARELO, true) +
        confete(0.62, 1.5, -35, AMARELO) +
        confete(-0.74, 1.04, 70, AMARELO, true) +
        confete(0.76, 1.04, 20, ROSA) +
        confete(-0.64, 0.58, -30, AZUL) +
        confete(0.64, 0.58, 60, AZUL, true) +
        confete(-0.5, 0.2, 10, ROSA, true) +
        confete(0.52, 0.2, -15, AMARELO),
    }),
  ),
  // as mãos batendo na frente do peito e as faíscas da palma
  aplaudir: comObjetos(
    {
      vista: 'frente',
      bracos: [-70, -70],
      encurta: [0.92, 0.92],
      boca: 'aberta',
      quadro: { x: 0, y: 0.78, meia: 0.84 },
    },
    (m) => {
      const [, y] = m(0);
      return {
        frente:
          faisca(-0.48, y + 0.24, 0.23) +
          faisca(0.48, y + 0.24, 0.23) +
          faisca(-0.55, y - 0.2, 0.15) +
          faisca(0.55, y - 0.2, 0.15),
      };
    },
  ),
  // o requebrado: um braço em cima, o outro na cintura, a perna para o lado e as notas
  dancar: comObjetos(
    {
      vista: 'frente',
      sobe: 0.04,
      tronco: 10,
      cabeca: -12,
      bracos: [145, 40],
      pernas: [22, -4],
      boca: 'aberta',
      quadro: { x: 0.03, y: 0.86, meia: 0.9 },
    },
    () => ({
      frente: notas2(0.36, 1.32, 1.05, ROSA) + nota(-0.7, 0.62, 1, AZUL) + nota(0.6, 0.42, 0.85, AMARELO),
    }),
  ),
  // o braço esticado para o lado, os olhos para lá e a setinha na ponta do dedo
  apontar: comObjetos(
    {
      vista: 'frente',
      bracos: [92, 8],
      olhar: -0.07,
      cabeca: 4,
      quadro: { x: -0.36, y: 0.76, meia: 0.86 },
    },
    (m) => {
      const [x, y] = m(0);
      return { frente: seta(x - 0.58, y, -1) };
    },
  ),
  // sentado na cadeira, as mãos nos joelhos
  sentar: comObjetos(
    {
      vista: 'lado',
      sobe: 0.08,
      tronco: -4,
      bracos: [34, 26],
      pernas: [84, 80],
      quadro: { x: 0.0, y: 0.79, meia: 0.86 },
    },
    () => ({ fundo: cadeira(0.3) }),
  ),
  // no ar, braços e pernas abertos como as pontas da estrela atrás dele
  'pulo-estrela': comObjetos(
    {
      vista: 'frente',
      sobe: 0.14,
      bracos: [112, 112],
      pernas: [30, 30],
      boca: 'aberta',
      quadro: { x: 0, y: 0.85, meia: 0.98 },
    },
    () => ({ fundo: estrela(0, 0.86, 0.98, 0.46, AMARELO) + estrela(0, 0.86, 0.78, 0.36, '#ffe58f', 5, true) }),
  ),
  // a curva funda: um braço no peito, o outro para trás com o floreio, a perna para trás
  reverencia: comObjetos(
    {
      vista: 'lado',
      tronco: 48,
      cabeca: 6,
      bracos: [40, -72],
      pernas: [6, -22],
      quadro: { x: 0.3, y: 0.66, meia: 0.93 },
    },
    (m) => {
      const [x, y] = m(1);
      return { frente: floreio(x - 0.04, y + 0.02) };
    },
  ),
  // bater cabeça com a guitarra-raio da Vila (a da direção A, um pouco maior)
  roqueiro: {
    ...POSES_A.roqueiro,
    guitarra: { x: 0.2, y: 0.54, giro: -58, k: 0.019 },
    quadro: { x: 0.11, y: 0.8, meia: 0.85 },
  },
};

/** O SVG da direção A reforçada (viewBox 0 0 64 64). */
export function svgA2(id: IdIcone, lado = 64): string {
  if (id === 'carinha') return svgA(id, lado);
  const p = POSES_A2[id];
  const esc = 32 / p.quadro.meia;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="${lado}" height="${lado}"><g transform="translate(${32 - p.quadro.x * esc} ${32 + p.quadro.y * esc}) scale(${esc} ${-esc})">${bonecoA(p)}</g></svg>`;
}

// ------------------------------------------------------------------ B: a foto do boneco
/** O instante (s) de cada gesto que mais diz o que ele é, e de que lado a foto vê o boneco. */
interface Quadro {
  f: number;
  /** Giro do boneco (rad): 0 de frente, positivo vira para a esquerda da foto. */
  giro: number;
}

const QUADROS: Record<IdGesto, Quadro> = {
  acenar: { f: 1.01, giro: -0.3 },
  cumprimentar: { f: 0.35, giro: 1.15 },
  chamar: { f: 0.47, giro: 0.85 },
  comemorar: { f: 0.21, giro: 0.15 },
  aplaudir: { f: 0.88, giro: 0.35 },
  dancar: { f: 0.26, giro: 0.2 },
  apontar: { f: 0.9, giro: 0.75 },
  sentar: { f: 1, giro: 0.6 },
  'pulo-estrela': { f: 0.264, giro: 0.1 },
  reverencia: { f: 1.3, giro: 1.05 },
  roqueiro: { f: 0.125, giro: 0.7 },
};

/** Uma foto B: a imagem quadrada e onde fica o chão (0 em cima, 1 embaixo). */
export interface FotoB {
  url: string;
  chao: number;
}

/** Fotos B (PNG com fundo transparente, quadradas; o boneco padrão e a carinha). */
export async function fotografarGestos(lado = 384): Promise<Record<IdIcone, FotoB>> {
  const canvas = document.createElement('canvas');
  canvas.width = lado;
  canvas.height = lado;
  const engine = new Engine(canvas, true, {
    preserveDrawingBuffer: true,
    premultipliedAlpha: false,
    alpha: true,
    stencil: false,
    antialias: true,
  });
  const scene = new Scene(engine);
  scene.clearColor = new Color4(0, 0, 0, 0);
  const camera = new FreeCamera('g034-camera', new Vector3(0, 1, -10), scene);
  camera.mode = Camera.ORTHOGRAPHIC_CAMERA;
  camera.minZ = 0.1;
  camera.maxZ = 40;
  // a mesma luz do estúdio do editor (render/fotoBoneco.ts)
  const ceu = new HemisphericLight('g034-ceu', new Vector3(-0.2, 1, -0.5), scene);
  ceu.intensity = 0.62;
  ceu.diffuse = new Color3(0.72, 0.8, 1);
  ceu.groundColor = new Color3(0.42, 0.38, 0.46);
  ceu.specular = new Color3(0.18, 0.18, 0.2);
  const sol = new DirectionalLight('g034-sol', new Vector3(0.5, -0.7, 0.8), scene);
  sol.intensity = 1.6;
  sol.diffuse = new Color3(1, 0.97, 0.9);
  sol.specular = new Color3(0.32, 0.31, 0.3);
  const boneco = criarBoneco(scene, AP, 'g034');
  // a pose parada num instante sem piscar (no tempo 0 o boneco está de olho fechado)
  const parado = () =>
    calcularPose({
      andando: false,
      correndo: false,
      noAr: false,
      minerando: false,
      colocando: false,
      tempo: 1,
    });
  for (let i = 0; i < 240 && !scene.meshes.every((m) => m.isReady(true)); i++)
    await new Promise((r) => requestAnimationFrame(r));
  const fotos = {} as Record<IdIcone, FotoB>;
  const tirar = (cx: number, cy: number, meia: number): FotoB => {
    camera.position.set(cx, cy, -10);
    camera.setTarget(new Vector3(cx, cy, 0));
    camera.orthoTop = meia;
    camera.orthoBottom = -meia;
    camera.orthoLeft = -meia;
    camera.orthoRight = meia;
    scene.render();
    return { url: canvas.toDataURL('image/png'), chao: 0.5 + cy / (2 * meia) };
  };
  for (const g of GESTOS) {
    const q = QUADROS[g.id];
    boneco.aplicarPose(aplicarGesto(parado(), g.id, q.f));
    boneco.posicionar(0, 0, 0, Math.PI + q.giro);
    boneco.raiz.computeWorldMatrix(true);
    for (const m of boneco.raiz.getChildMeshes()) m.computeWorldMatrix(true);
    const { min, max } = boneco.raiz.getHierarchyBoundingVectors(true, (m) => m.isEnabled());
    // o chão (y = 0) sempre no quadro: a sombrinha mostra o pulo
    const y0 = Math.min(min.y, 0);
    const cx = (min.x + max.x) / 2;
    const cy = (y0 + max.y) / 2;
    const meia = Math.max(max.x - min.x, max.y - y0) / 2 / 0.96;
    fotos[g.id] = tirar(cx, cy, meia);
  }
  // a carinha: só a cabeça, de frente
  boneco.aplicarPose(parado());
  boneco.posicionar(0, 0, 0, Math.PI);
  const h = alturaBoneco(AP);
  const topo = topoBoneco(AP);
  const baixo = h * 0.555;
  fotos.carinha = tirar(0, (baixo + topo) / 2, (topo - baixo) / 2 / 0.86);
  engine.dispose();
  return fotos;
}

/** O ícone B: a foto com a sombrinha no chão e as mesmas marquinhas da A (viewBox 64). */
export function svgB(id: IdIcone, foto: FotoB, lado = 64): string {
  const sombra =
    id === 'carinha'
      ? ''
      : `<ellipse cx="32" cy="${(foto.chao * 64 - 1).toFixed(1)}" rx="13" ry="2.2" fill="${TINTA}" opacity="0.16"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 64 64" width="${lado}" height="${lado}">${sombra}<image href="${foto.url}" x="0" y="0" width="64" height="64"/></svg>`;
}

// ------------------------------------------------------------------------------ a folha
const CSS_FOLHA = `
html, body { height: auto !important; overflow: auto !important; position: static !important; }
body { margin: 0; background: #efe5d2 !important; color: #3b2a1e; font: 600 15px/1.3 system-ui, sans-serif; }
.folha { padding: 18px 22px 26px; width: max-content; }
.folha h1 { margin: 0 0 4px; font-size: 24px; }
.folha p.sub { margin: 0 0 14px; font-weight: 500; }
.folha table { border-collapse: separate; border-spacing: 0; }
.folha th { font-size: 14px; padding: 6px 8px; text-align: center; }
.folha th.dir { font-size: 18px; }
.folha td { padding: 6px 8px; vertical-align: middle; text-align: center; border-top: 1px solid #ddcfb4; }
.folha td.nome { text-align: left; font-size: 16px; min-width: 120px; }
.folha td.sep, .folha th.sep { border-left: 3px solid #c9b48c; padding-left: 14px; }
.folha th.nova { color: #a8610a; }
.palco { display: inline-grid; place-items: center; width: 116px; height: 116px; border-radius: 18px;
  background: linear-gradient(#8fc7f0, #b8dcf3 55%, #7cb45a 56%, #6ea24e); }
.botao { display: grid; place-items: center; border-radius: 999px; background: #fff7e8;
  box-shadow: 0 4px 0 #e9d6b2, 0 8px 14px rgba(60, 35, 10, 0.22), inset 0 2px 0 rgba(255, 255, 255, 0.85); }
.botao.meio { background: #ffe4a8; box-shadow: 0 0 0 4px #f5b52e, 0 5px 0 #d99a1f, 0 10px 18px rgba(60, 35, 10, 0.28), inset 0 2px 0 rgba(255, 255, 255, 0.85); }
.botao > svg { width: var(--icone, 56%); height: var(--icone, 56%); }
.peq { display: inline-grid; place-items: center; width: 48px; height: 48px; }
.peq > svg { width: 48px; height: 48px; }
.balao { display: inline-block; width: 72px; height: 72px; }
.balao > img { width: 72px; height: 72px; }
`;

function botao(svg: string, tam: number, meio: boolean, icone = '76%'): string {
  return `<div class="botao${meio ? ' meio' : ''}" style="width:${tam}px;height:${tam}px;--icone:${icone}">${svg}</div>`;
}

/** O balão creme de cima da cabeça (o mesmo de `svgDoBalao`), com um desenho de 64. */
export function svgDoBalao64(miolo64: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="256" height="256"><circle cx="32" cy="30" r="27" fill="#fff7e8" stroke="#e9d6b2" stroke-width="3"/><path d="M26 55 L32 63 L38 55 Z" fill="#fff7e8"/><g transform="translate(8 6) scale(0.75)">${miolo64}</g></svg>`;
}

const imgSvg = (svg: string) =>
  `<img alt="" src="data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}">`;

declare global {
  interface Window {
    __esbocoGestos?: {
      pronto: boolean;
      /** As variantes soltas (SVG pronto), por direção e ícone. */
      variantes?: Record<string, string>;
    };
  }
}

const NOMES: Record<IdIcone, string> = {
  ...(Object.fromEntries(GESTOS.map((g) => [g.id, g.nome])) as Record<IdGesto, string>),
  carinha: 'Carinha do botão',
};

/** Hoje: o ícone do jogo, em 64 (para a folha comparar). */
function svgHoje(id: IdIcone): string {
  if (id === 'carinha')
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="64" height="64"><circle cx="16" cy="16" r="11" fill="#ffd45a" stroke="#3b2a1e" stroke-width="2.2"/><circle cx="12" cy="14" r="1.7" fill="#3b2a1e"/><circle cx="20" cy="14" r="1.7" fill="#3b2a1e"/><path d="M11 18.5 Q16 23.5 21 18.5" fill="none" stroke="#3b2a1e" stroke-width="2.2" stroke-linecap="round"/></svg>`;
  return svgDoIcone(ICONES_GESTOS[id]).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ');
}

/**
 * A folha da direção A reforçada (`?esboco=gestos034&folha=A2`): hoje, a A de antes e a A
 * reforçada, cada uma no meio da roleta, no vizinho, a 48 px e no balão. Sem fotos (sem o 3D).
 */
async function montarFolhaA2(app: HTMLElement): Promise<void> {
  const ids: IdIcone[] = [...GESTOS.map((g) => g.id), 'carinha'];
  const variantes: Record<string, string> = {};
  const viz = Math.round(TAM_ROLETA * 0.78);
  const celulas = (svg: string, balao: string, icone = '76%') =>
    `<td class="sep"><span class="palco">${botao(svg, TAM_ROLETA, true, icone)}</span></td>` +
    `<td>${botao(svg, viz, false, icone)}</td><td><span class="peq">${svg}</span></td>` +
    `<td><span class="balao">${balao}</span></td>`;
  let linhas = '';
  for (const id of ids) {
    const a = svgA(id);
    const a2 = svgA2(id);
    variantes[`A2-${id}`] = a2;
    const hoje = svgHoje(id);
    const carinha = id === 'carinha';
    linhas +=
      `<tr><td class="nome">${NOMES[id]}</td>` +
      celulas(hoje, carinha ? '' : imgSvg(svgDoBalao(id)), '56%') +
      celulas(a, carinha ? '' : imgSvg(svgDoBalao64(a))) +
      celulas(a2, carinha ? '' : imgSvg(svgDoBalao64(a2))) +
      '</tr>';
  }
  const cab = (t: string) =>
    `<th class="sep">${t}meio 96 px</th><th>vizinho ${viz} px</th><th>48 px</th><th>balão</th>`;
  app.innerHTML = `<div class="folha"><h1>Ícones dos gestos: a direção A reforçada</h1>
<p class="sub">O mesmo boneco do jogo desenhado, agora com um objeto forte em cada gesto. Hoje, a A de antes e a A reforçada, no tamanho real da roleta e do balão.</p>
<table><thead><tr><th></th><th class="sep dir" colspan="4">Hoje</th><th class="sep dir" colspan="4">A (anterior)</th><th class="sep dir nova" colspan="4">A reforçada</th></tr>
<tr><th></th>${cab('')}${cab('')}${cab('')}</tr></thead><tbody>${linhas}</tbody></table></div>`;
  await Promise.all(
    [...app.querySelectorAll('img')].map((i) =>
      i.complete ? null : new Promise((r) => i.addEventListener('load', r, { once: true })),
    ),
  );
  await new Promise((r) => setTimeout(r, 300));
  window.__esbocoGestos = { pronto: true, variantes };
}

/** A folha (sem o jogo): a de A e B, ou a da A reforçada com `&folha=A2`. */
export async function montarFolhaGestos(app: HTMLElement): Promise<void> {
  window.__esbocoGestos = { pronto: false };
  const st0 = document.createElement('style');
  st0.textContent = CSS_FOLHA;
  document.head.append(st0);
  document.getElementById('carregando')?.remove();
  if (new URLSearchParams(location.search).get('folha') === 'A2') return montarFolhaA2(app);
  const fotos = await fotografarGestos();
  const ids: IdIcone[] = [...GESTOS.map((g) => g.id), 'carinha'];
  const variantes: Record<string, string> = {};
  const viz = Math.round(TAM_ROLETA * 0.78);
  let linhas = '';
  for (const id of ids) {
    const a = svgA(id);
    const b = svgB(id, fotos[id]);
    variantes[`A-${id}`] = a;
    variantes[`B-${id}`] = b;
    const hoje = svgHoje(id);
    const balaoHoje = id === 'carinha' ? '' : imgSvg(svgDoBalao(id));
    const celulas = (svg: string, balao: string, primeira: boolean) =>
      `<td class="${primeira ? 'sep' : ''}"><span class="palco">${botao(svg, TAM_ROLETA, true)}</span></td>` +
      `<td>${botao(svg, viz, false)}</td><td><span class="peq">${svg}</span></td>` +
      `<td><span class="balao">${balao}</span></td>`;
    linhas +=
      `<tr><td class="nome">${NOMES[id]}</td>` +
      `<td><span class="palco">${botao(hoje, TAM_ROLETA, true, '56%')}</span></td><td><span class="balao">${balaoHoje}</span></td>` +
      celulas(a, id === 'carinha' ? '' : imgSvg(svgDoBalao64(a)), true) +
      celulas(b, id === 'carinha' ? '' : imgSvg(svgDoBalao64(b)), true) +
      '</tr>';
  }
  const cab = (t: string) =>
    `<th class="sep">${t}: meio 96 px</th><th>vizinho ${viz} px</th><th>48 px</th><th>balão</th>`;
  app.innerHTML = `<div class="folha"><h1>Ícones dos gestos: direção A e direção B</h1>
<p class="sub">A: o boneco do jogo desenhado (SVG). B: foto do boneco do jogo fazendo o gesto. Os dois com o boneco padrão.</p>
<table><thead><tr><th></th><th colspan="2">Hoje</th><th class="sep dir" colspan="4">A: desenho</th><th class="sep dir" colspan="4">B: foto</th></tr>
<tr><th></th><th>meio 96 px</th><th>balão</th>${cab('A')}${cab('B')}</tr></thead><tbody>${linhas}</tbody></table></div>`;
  // as imagens dentro dos SVG carregam antes da foto da folha
  await Promise.all(
    [...app.querySelectorAll('img')].map((i) =>
      i.complete ? null : new Promise((r) => i.addEventListener('load', r, { once: true })),
    ),
  );
  await new Promise((r) => setTimeout(r, 300));
  window.__esbocoGestos = { pronto: true, variantes };
}

// ------------------------------------------------------------- o jogo com uma das direções
/**
 * Põe os ícones da direção pedida no jogo (antes da cena montar a roleta): o desenho de 64 vai
 * dentro do miolo de 32 dos ícones, um pouco maior que o de hoje (o boneco precisa de espaço),
 * e a carinha do item "Gestos" e da plaquinha "Voltar" troca quando a roleta abre.
 */
export async function prepararEsbocoGestos(direcao: string | null): Promise<void> {
  const d: Direcao = direcao === 'B' || direcao === 'A2' ? direcao : 'A';
  const fotos = d === 'B' ? await fotografarGestos(256) : null;
  const svgDe = (id: IdIcone) => (fotos ? svgB(id, fotos[id]) : d === 'A2' ? svgA2(id) : svgA(id));
  const miolo = (id: IdIcone) =>
    svgDe(id).replace(
      /^<svg[^>]*>/,
      '<svg x="-5" y="-5" width="42" height="42" viewBox="0 0 64 64">',
    );
  for (const g of GESTOS) ICONES_GESTOS[g.id] = miolo(g.id);
  const carinha = `<svg viewBox="0 0 32 32" aria-hidden="true" focusable="false">${miolo('carinha')}</svg>`;
  const st = document.createElement('style');
  st.textContent = `.roleta svg, .carinhas-amigos svg { overflow: visible; }`;
  document.head.append(st);
  const trocar = () => {
    for (const el of document.querySelectorAll<HTMLElement>(
      '.roleta .item[data-item="gestos"] .desenho, .roleta .voltar .pai',
    )) {
      if (!el.firstElementChild || el.dataset.g034 === el.innerHTML.length.toString()) continue;
      const kbd = el.querySelector('kbd')?.outerHTML ?? '';
      el.innerHTML = carinha + kbd;
      el.dataset.g034 = el.innerHTML.length.toString();
    }
  };
  new MutationObserver(trocar).observe(document.body, { childList: true, subtree: true });
}
