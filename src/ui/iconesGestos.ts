/**
 * Ícones dos gestos (spec 034, a direção A reforçada que o dono aprovou em 20 nov 2026, na folha
 * `capturas-034/gestos/folha-A2.png`): o mesmo boneco do jogo desenhado em SVG fazendo o gesto,
 * com um objeto forte em cada um para nenhum ficar parecido com outro a 48 px (confete, faíscas,
 * notas, setinha, cadeira, estrela, floreio, ondas de som, a mão do amigo, a guitarra-raio).
 *
 * O boneco tem as medidas do plano do boneco (`personagem/boneco.ts`: cabeça 0,72 × 0,68, tronco
 * 0,46 × 0,42, perna 0,24, braço até a mão 0,27, mão 0,085) e as cores do boneco padrão (pele,
 * cabelo com topete, túnica com cinto e fivela, calça, sapato, bochechas, olhos com brilho).
 *
 * Os ícones são desenhados uma vez, quando o módulo carrega, num viewBox de 64. Os contornos
 * ficam com a mesma grossura na tela em qualquer tamanho (`vector-effect`), como na folha; o
 * balão, que vira uma textura de 256, engrossa os contornos para ler como na folha a 72 px.
 *
 * Onde aparecem: a roleta de Gestos (`render/gestosJogo.ts`, o botão do meio e os vizinhos), a
 * carinha do item "Gestos" e da plaquinha "Voltar" (`ui/menuRoda.ts`), o balão em cima da
 * cabeça (`render/balaoGesto.ts`) e as carinhas dos amigos (`ui/carinhasAmigos.ts`).
 */
import { aparenciaPadrao, PALETAS } from '../personagem/aparencia';
import { misturar } from '../personagem/boneco';
import { IDS_GESTOS, type IdGesto } from '../personagem/gestos';

// ------------------------------------------------------------------ as cores do boneco padrão
const AP = aparenciaPadrao();
const escurecer = (c: string, t: number) => misturar(c, '#000000', t);
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
/** O amigo do aperto de mão: as cores da "Jardineira", outro boneco pronto do jogo. */
const CORES_AMIGO: CoresBoneco = {
  pele: PALETAS.pele[2],
  cabelo: PALETAS.cabelo[3],
  roupa: PALETAS.roupa[2],
  calca: PALETAS.calca[1],
};
let PELE = '';
let CABELO = '';
let ROUPA = '';
let CALCA = '';
let SAPATO = '';
let CINTO = '';
let BOCHECHA = '';
function usarCores(c: CoresBoneco): void {
  PELE = c.pele;
  CABELO = c.cabelo;
  ROUPA = c.roupa;
  CALCA = c.calca;
  SAPATO = escurecer(misturar(CALCA, '#5a3a22', 0.5), 0.25);
  CINTO = escurecer(ROUPA, 0.45);
  BOCHECHA = misturar(PELE, '#ff7a7a', 0.55);
}
usarCores(CORES_PADRAO);
const FIVELA = '#f2d16b';
const OLHO = '#231a28';
const BOCA = '#9a4a3c';
/** O contorno dos ícones do jogo. */
const TINTA = '#3b2a1e';
/** As marquinhas de movimento. */
const MARCA = '#a8610a';
const AMARELO = '#ffd45a';
const ROSA = '#ff8fb3';
const AZUL = '#7cc6ff';
const LARANJA = '#ffa53a';
const MADEIRA = '#d8924c';

// ---------------------------------------------------------------------- a pose desenhada
/**
 * A pose desenhada (ângulos em graus). De frente: os braços abrem para fora (0 = caído, 90 =
 * deitado para o lado, 180 = para o alto; negativo = para dentro, na frente do peito); as
 * pernas abrem para fora. De lado (o boneco olha para a direita): braço e perna para a frente
 * (positivo) ou para trás; o tronco se curva para a frente.
 */
interface Pose {
  vista: 'frente' | 'lado';
  /** O corpo inteiro sobe (pulo) ou desce, em unidades do boneco. */
  sobe?: number;
  /** Inclinação do tronco (de frente: positivo para a esquerda; de lado: curva para a frente). */
  tronco?: number;
  /** A cabeça em cima do tronco (o mesmo sentido do tronco). */
  cabeca?: number;
  /** De frente: o braço da esquerda e o da direita. De lado: o de perto e o de longe. */
  bracos?: [number, number];
  /** Encurta (ou estica) o braço (1 = inteiro). */
  encurta?: [number, number];
  pernas?: [number, number];
  /** Os olhos olham para um lado (de frente, em unidades). */
  olhar?: number;
  boca?: 'sorriso' | 'aberta';
  /** Marquinhas: [x, y, giro] em unidades, junto do que se mexe. */
  marcas?: Array<{ tipo: 'arco'; x: number; y: number; giro?: number; tam?: number }>;
  /** A guitarra-raio da Vila Neon (a da fantasia de roqueiro, `ui/alma/arteVila.ts`) nas mãos. */
  guitarra?: { x: number; y: number; giro: number; k: number };
  /** O objeto forte do gesto (SVG no espaço do boneco), atrás do boneco e na frente dele. */
  fundo?: string;
  frente?: string;
  /** De frente: o braço (0 ou 1) com a mão aberta do tchau, o giro do pulso (graus) e o tamanho. */
  maoAberta?: [0 | 1, number, number?];
  /** Quadro: o meio (x, y) e a meia altura mostrada, em unidades. */
  quadro: { x: number; y: number; meia: number };
}

// ---------------------------------------------------------------------- as pecinhas
const UNID = 'vector-effect="non-scaling-stroke"';
/** Contorno (px na tela, como na folha). */
const CONTORNO = 1.9;
const contorno = `stroke="${TINTA}" stroke-width="${CONTORNO}" stroke-linejoin="round" ${UNID}`;
const contornoFino = `stroke="${TINTA}" stroke-width="1.3" stroke-linejoin="round" ${UNID}`;
type Ponto = [number, number];

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
function rot(graus: number, x: number, y: number): string {
  return `rotate(${graus.toFixed(2)} ${x} ${y})`;
}

/** O braço (no ombro, caído para baixo): a manga, o punho e a mão (bolinha ou aberta). */
function braco(longe = false, aberta: number | false = false, kPalma?: number): string {
  const manga = longe ? escurecer(ROUPA, 0.18) : ROUPA;
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
 * A mão aberta do tchau (a palma de frente, os quatro dedos abertos em leque e o polegar), no
 * lugar da bolinha e maior que ela: os vãos entre os dedos dizem "mão" mesmo a 48 px.
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

function rosto(p: Pose): string {
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
function cabeca(p: Pose): string {
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
function guitarra(g: NonNullable<Pose['guitarra']>): string {
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

/** As marquinhas de movimento (no espaço do boneco, y para cima). */
function marcas(p: Pose): string {
  let s = '';
  for (const m of p.marcas ?? []) {
    const t = m.tam ?? 1;
    const g = `transform="translate(${m.x} ${m.y}) rotate(${m.giro ?? 0}) scale(${t})"`;
    const traço = `fill="none" stroke="${MARCA}" stroke-width="2.1" stroke-linecap="round" ${UNID}`;
    s += `<g ${g}><path d="M0 -0.11 Q0.07 0 0 0.11" ${traço}/><path d="M0.08 -0.16 Q0.18 0 0.08 0.16" ${traço}/></g>`;
  }
  return s;
}

/** O boneco inteiro, no espaço dele (pés no chão em y = 0, y para cima). */
function boneco(p: Pose): string {
  const sobe = p.sobe ?? 0;
  const tronco = p.tronco ?? 0;
  const cab = p.cabeca ?? 0;
  const [b0, b1] = p.bracos ?? [6, 6];
  const [k0, k1] = p.encurta ?? [1, 1];
  const [p0, p1] = p.pernas ?? [0, 0];
  // a sombra fica no chão (o pulo se vê pela distância)
  let s = p.fundo ?? '';
  s += `<ellipse cx="0" cy="0" rx="0.36" ry="0.055" fill="${TINTA}" opacity="0.16"/>`;
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
      `<g transform="translate(${lado * 0.28} 0.68) ${`rotate(${(lado * ang).toFixed(2)})`} scale(1 ${k})">${braco(false, p.maoAberta?.[0] === (lado < 0 ? 0 : 1) ? p.maoAberta[1] : false, p.maoAberta?.[2])}</g>`;
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
      `<g transform="translate(0 0.68) rotate(${ang.toFixed(2)}) scale(1 ${k})">${braco(longe)}</g>`;
    s += bracoLado(b1, k1, true);
    s += caixa(-0.155, 0.22, 0.155, 0.38, 0.05, CALCA);
    s += caixa(-0.17, 0.34, 0.17, 0.76, 0.1, ROUPA);
    s += brilho(-0.12, 0.66, 0.1, 0.72, 0.03, 0.22);
    s += caixa(-0.18, 0.31, 0.18, 0.43, 0.04, ROUPA);
    s += caixa(-0.1825, 0.425, 0.1825, 0.475, 0.02, CINTO);
    s += caixa(0.16, 0.42, 0.2, 0.48, 0.012, FIVELA);
    s += `<g transform="${rot(-cab, 0, 0.76)}">${cabeca(p)}</g>`;
    if (p.guitarra) s += guitarra(p.guitarra);
    s += bracoLado(b0, k0, false);
    s += '</g>';
  }
  s += '</g>';
  return s + marcas(p) + (p.frente ?? '');
}

// ------------------------------------------------------------- os objetos fortes dos gestos
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
    traco(
      `M${hx} ${y} L${hx} ${topo} Q${hx + 0.05 * k} ${topo - 0.1 * k} ${hx + 0.15 * k} ${topo - 0.14 * k} Q${hx + 0.19 * k} ${topo - 0.2 * k} ${hx + 0.14 * k} ${topo - 0.26 * k}`,
      TINTA,
      1.6,
    ) +
    `<ellipse cx="0" cy="0" rx="${0.088 * k}" ry="${0.064 * k}" fill="${cor}" ${contorno} transform="translate(${x} ${y}) rotate(22)"/>`
  );
}

/** Duas notas ligadas: as cabeças em (x, y) e um pouco mais acima. */
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
    ) +
    brilho(
      Math.min(X(c + h), X(c)) + 0.02,
      y + 0.005,
      Math.max(X(c + h), X(c)) - 0.02,
      y + t - 0.015,
      0.01,
      0.45,
    )
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
    s += traco(
      `M${x + r * 0.62} ${y + r * ab} Q${x + r * 1.18} ${y} ${x + r * 0.62} ${y - r * ab}`,
      AZUL,
      2.8,
    );
  }
  return s;
}

/** O amigo: o mesmo boneco com as cores dele, espelhado (olhando para o outro) em x = `dx`. */
function amigo(p: Pose, dx: number): string {
  usarCores(CORES_AMIGO);
  const s = `<g transform="translate(${dx} 0) scale(-1 1)">${boneco({ ...p, fundo: undefined, frente: undefined })}</g>`;
  usarCores(CORES_PADRAO);
  return s;
}

/** Onde fica a mão (o meio da bolinha) do braço `i` da pose, no espaço do boneco. */
function maoDe(p: Pose, i: 0 | 1, ate = 0.275): Ponto {
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

/** Monta a pose e põe os objetos em volta dela (que sabem onde estão as mãos). */
function comObjetos(
  p: Pose,
  objetos: (m: (i: 0 | 1, ate?: number) => Ponto) => { fundo?: string; frente?: string },
): Pose {
  return { ...p, ...objetos((i, ate) => maoDe(p, i, ate)) };
}

// ---------------------------------------------------------------------------- as poses
const POSES: Record<IdGesto, Pose> = {
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
    const base: Pose = {
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
      frente:
        notas2(0.36, 1.32, 1.05, ROSA) + nota(-0.7, 0.62, 1, AZUL) + nota(0.6, 0.42, 0.85, AMARELO),
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
    () => ({
      fundo: estrela(0, 0.86, 0.98, 0.46, AMARELO) + estrela(0, 0.86, 0.78, 0.36, '#ffe58f', 5, true),
    }),
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
  // bater cabeça: a cabeça baixa no tempo, tocando a guitarra-raio da Vila (o roqueiro só
  // existe na Vila)
  roqueiro: {
    vista: 'lado',
    tronco: 10,
    cabeca: 26,
    bracos: [78, 48],
    pernas: [8, -6],
    boca: 'aberta',
    guitarra: { x: 0.2, y: 0.54, giro: -58, k: 0.019 },
    marcas: [
      { tipo: 'arco', x: -0.46, y: 1.3, giro: 150, tam: 1.1 },
      { tipo: 'arco', x: 0.5, y: 1.46, giro: 20, tam: 0.9 },
    ],
    quadro: { x: 0.11, y: 0.8, meia: 0.85 },
  },
};

/** O desenho no quadro da pose, no viewBox 0 0 64 64 (y para baixo). */
function enquadrar(corpo: string, q: Pose['quadro']): string {
  const esc = 32 / q.meia;
  return `<g transform="translate(${32 - q.x * esc} ${32 + q.y * esc}) scale(${esc} ${-esc})">${corpo}</g>`;
}

// ------------------------------------------------------------------------------ os ícones
/** Miolo do SVG de cada gesto (viewBox 0 0 64 64). */
export const ICONES_GESTOS = Object.fromEntries(
  IDS_GESTOS.map((id) => [id, enquadrar(boneco(POSES[id]), POSES[id].quadro)]),
) as Record<IdGesto, string>;

/** A carinha do item "Gestos" (e da plaquinha "Voltar"): a cabeça do boneco, de frente, sorrindo. */
export const ICONE_CARINHA = (() => {
  const p: Pose = { vista: 'frente', boca: 'aberta', quadro: { x: 0, y: 1.11, meia: 0.44 } };
  return enquadrar(cabeca(p), p.quadro);
})();

/** SVG pronto para innerHTML (botões da roleta, a plaquinha "Voltar" e as carinhas dos amigos). */
export function svgDoIcone(miolo: string, classe = 'icone-gesto'): string {
  return `<svg class="${classe}" viewBox="0 0 64 64" aria-hidden="true" focusable="false">${miolo}</svg>`;
}

/**
 * O balão vira uma textura de 256 px e aparece na tela com uns 45 a 80 px: os contornos (de
 * grossura fixa na tela) engrossam na mesma conta, para ler como o balão da folha, a 72 px.
 */
const LADO_BALAO = 256;
const ENGROSSA_BALAO = LADO_BALAO / 72;
function engrossar(miolo: string, k: number): string {
  return miolo.replace(
    /stroke-width="([\d.]+)"([^>]*?vector-effect="non-scaling-stroke")/g,
    (_, w: string, resto: string) => `stroke-width="${(Number(w) * k).toFixed(2)}"${resto}`,
  );
}
const MIOLO_BALAO = {} as Record<IdGesto, string>;
const mioloDoBalao = (id: IdGesto) =>
  (MIOLO_BALAO[id] ??= engrossar(ICONES_GESTOS[id], ENGROSSA_BALAO));

/** O balão de cima da cabeça: círculo creme com a pontinha embaixo e o ícone no meio (viewBox 64). */
export function svgDoBalao(id: IdGesto): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="${LADO_BALAO}" height="${LADO_BALAO}"><circle cx="32" cy="30" r="27" fill="#fff7e8" stroke="#e9d6b2" stroke-width="3"/><path d="M26 55 L32 63 L38 55 Z" fill="#fff7e8"/><g transform="translate(8 6) scale(0.75)">${mioloDoBalao(id)}</g></svg>`;
}

/**
 * Spec 023 (T09): o balão do presente do nível 6: o mesmo balão creme com a borda de ouro e
 * três estrelinhas brilhando em volta.
 */
export function svgDoBalaoEstrela(id: IdGesto): string {
  const estrela = (x: number, y: number, r: number) => {
    const p: string[] = [];
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const rr = i % 2 ? r * 0.45 : r;
      p.push(`${(x + Math.cos(a) * rr).toFixed(1)},${(y + Math.sin(a) * rr).toFixed(1)}`);
    }
    return `<polygon points="${p.join(' ')}" fill="#ffd45a" stroke="#c98a14" stroke-width="1"/>`;
  };
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="${LADO_BALAO}" height="${LADO_BALAO}"><circle cx="32" cy="30" r="26" fill="#fff7e8" stroke="#ffc93d" stroke-width="4"/><circle cx="32" cy="30" r="22.5" fill="none" stroke="#fff1b8" stroke-width="1.2"/><path d="M26 54 L32 62 L38 54 Z" fill="#fff7e8" stroke="#ffc93d" stroke-width="2" stroke-linejoin="round"/><g transform="translate(9 7) scale(0.72)">${mioloDoBalao(id)}</g>${estrela(8, 8, 6.5)}${estrela(57, 12, 5)}${estrela(56, 49, 4)}</svg>`;
}
