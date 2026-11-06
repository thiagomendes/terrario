import { criarGerador, type Gerador } from './variacao';
import type { GrupoMaterial } from './materiais';

/**
 * Amostras de áudio sintetizadas por código (PCM), modelando o material em vez de
 * tocar notas: grãos de cascalho, estalos de lasca, ressonância de tábua, farfalhar,
 * estilhaços. Cada (evento, material) tem algumas variações sorteadas.
 */

export type EventoMaterial = 'quebra' | 'golpe' | 'passo' | 'colocar' | 'aterrissagem' | 'pulo';
export const EVENTOS_MATERIAL: readonly EventoMaterial[] = [
  'quebra',
  'golpe',
  'passo',
  'colocar',
  'aterrissagem',
  'pulo',
];
export const VARIACOES_AMOSTRA = 4;

/** Duração máxima de cada amostra (s). */
const DURACOES: Record<EventoMaterial, number> = {
  quebra: 0.6,
  golpe: 0.22,
  passo: 0.16,
  colocar: 0.25,
  aterrissagem: 0.3,
  pulo: 0.16,
};

// --- DSP mínimo -------------------------------------------------------------

/** Filtro biquad (RBJ) aplicado no lugar. */
function biquad(
  x: Float32Array,
  taxa: number,
  tipo: 'lp' | 'hp' | 'bp',
  freq: number,
  q: number,
  ini = 0,
  fim = x.length,
): void {
  const w = (2 * Math.PI * Math.min(freq, taxa * 0.45)) / taxa;
  const cw = Math.cos(w);
  const a = Math.sin(w) / (2 * q);
  let b0: number;
  let b1: number;
  let b2: number;
  if (tipo === 'lp') {
    b0 = (1 - cw) / 2;
    b1 = 1 - cw;
    b2 = (1 - cw) / 2;
  } else if (tipo === 'hp') {
    b0 = (1 + cw) / 2;
    b1 = -(1 + cw);
    b2 = (1 + cw) / 2;
  } else {
    b0 = a;
    b1 = 0;
    b2 = -a;
  }
  const a0 = 1 + a;
  const a1 = -2 * cw;
  const a2 = 1 - a;
  let x1 = 0;
  let x2 = 0;
  let y1 = 0;
  let y2 = 0;
  for (let i = ini; i < fim; i++) {
    const xi = x[i];
    const y = (b0 * xi + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0;
    x2 = x1;
    x1 = xi;
    y2 = y1;
    y1 = y;
    x[i] = y;
  }
}

/** Soma um grão de ruído filtrado (envelope rápido) em `saida` a partir de t (s). */
function grao(
  saida: Float32Array,
  taxa: number,
  rng: Gerador,
  t: number,
  dur: number,
  ganho: number,
  tipo: 'lp' | 'hp' | 'bp',
  freq: number,
  q: number,
): void {
  const n = Math.max(8, Math.floor(dur * taxa));
  const ini = Math.floor(t * taxa);
  if (ini >= saida.length) return;
  const g = new Float32Array(n);
  for (let i = 0; i < n; i++) g[i] = rng() * 2 - 1;
  biquad(g, taxa, tipo, freq, q);
  const ataque = Math.max(1, Math.floor(n * 0.08));
  for (let i = 0; i < n && ini + i < saida.length; i++) {
    const env = i < ataque ? i / ataque : Math.exp((-5 * (i - ataque)) / (n - ataque));
    saida[ini + i] += g[i] * env * ganho;
  }
}

/** Modo ressonante amortecido (madeira, cristal): seno com queda exponencial. */
function modo(
  saida: Float32Array,
  taxa: number,
  t: number,
  freq: number,
  queda: number,
  ganho: number,
): void {
  const ini = Math.floor(t * taxa);
  const w = (2 * Math.PI * freq) / taxa;
  const fim = Math.min(saida.length, ini + Math.floor(queda * 6 * taxa));
  for (let i = ini; i < fim; i++) {
    const k = (i - ini) / taxa;
    saida[i] += Math.sin(w * (i - ini)) * Math.exp(-k / queda) * ganho;
  }
}

/** Transiente curto e largo (o "estalo" do impacto). */
function estalo(saida: Float32Array, taxa: number, rng: Gerador, t: number, ganho: number): void {
  const ini = Math.floor(t * taxa);
  const n = Math.floor(0.004 * taxa);
  for (let i = 0; i < n && ini + i < saida.length; i++) {
    saida[ini + i] += (rng() * 2 - 1) * (1 - i / n) * ganho;
  }
}

/** Baque grave: ruído passa-baixa com queda (corpo do impacto). */
function baque(
  saida: Float32Array,
  taxa: number,
  rng: Gerador,
  t: number,
  freq: number,
  dur: number,
  ganho: number,
): void {
  grao(saida, taxa, rng, t, dur, ganho, 'lp', freq, 0.9);
}

/** Cascata de grãos com densidade decrescente (cascalho, torrões, lascas, folhas). */
function cascata(
  saida: Float32Array,
  taxa: number,
  rng: Gerador,
  t0: number,
  dur: number,
  quantidade: number,
  durGrao: [number, number],
  freq: [number, number],
  tipo: 'lp' | 'hp' | 'bp',
  q: number,
  ganho: number,
): void {
  for (let i = 0; i < quantidade; i++) {
    // mais grãos no começo (o material cai e assenta)
    const u = rng();
    const t = t0 + dur * u * u;
    const g = ganho * (1 - (t - t0) / (dur + 0.001)) * (0.4 + rng() * 0.6);
    const d = durGrao[0] + rng() * (durGrao[1] - durGrao[0]);
    const f = freq[0] * Math.pow(freq[1] / freq[0], rng());
    grao(saida, taxa, rng, t, d, g, tipo, f, q);
  }
}

// --- receitas por material ---------------------------------------------------

/** Intensidade do evento: quebra é cheia; passo, sutil. */
const INTENSIDADE: Record<EventoMaterial, number> = {
  quebra: 1,
  golpe: 0.55,
  passo: 0.35,
  colocar: 0.6,
  aterrissagem: 0.7,
  pulo: 0.25,
};

function receita(
  s: Float32Array,
  taxa: number,
  rng: Gerador,
  ev: EventoMaterial,
  grupo: GrupoMaterial,
): void {
  const k = INTENSIDADE[ev];
  const quebra = ev === 'quebra';
  // passos e pulo: só o contato; colocar: assentar com baque; golpe: impacto seco
  const nGraos = (base: number) => Math.round(base * (quebra ? 1 : ev === 'golpe' ? 0.35 : 0.25));
  const durCascata = quebra ? 0.42 : ev === 'aterrissagem' ? 0.18 : 0.09;
  switch (grupo) {
    case 'pedra':
      estalo(s, taxa, rng, 0, 0.9 * k);
      baque(s, taxa, rng, 0, 520 + rng() * 200, quebra ? 0.11 : 0.06, 0.8 * k);
      cascata(
        s,
        taxa,
        rng,
        0.006,
        durCascata,
        nGraos(34),
        [0.004, 0.014],
        [1400, 5200],
        'bp',
        2.5,
        0.75 * k,
      );
      if (quebra) baque(s, taxa, rng, 0.04, 260, 0.16, 0.5);
      break;
    case 'terra':
      baque(s, taxa, rng, 0, 260 + rng() * 120, quebra ? 0.16 : 0.08, 1.0 * k);
      cascata(
        s,
        taxa,
        rng,
        0.01,
        durCascata,
        nGraos(26),
        [0.008, 0.03],
        [350, 1800],
        'lp',
        0.8,
        0.7 * k,
      );
      break;
    case 'areia':
      grao(s, taxa, rng, 0, quebra ? 0.34 : 0.12, 0.45 * k, 'bp', 3200 + rng() * 1200, 0.7);
      cascata(
        s,
        taxa,
        rng,
        0.01,
        durCascata * 1.2,
        nGraos(40),
        [0.003, 0.01],
        [2500, 7500],
        'hp',
        0.8,
        0.35 * k,
      );
      baque(s, taxa, rng, 0, 380, 0.05, 0.35 * k);
      break;
    case 'madeira': {
      // tábua: modos inarmônicos excitados por um estalo seco
      estalo(s, taxa, rng, 0, 0.6 * k);
      const f0 = 170 + rng() * 70;
      const parciais = [1, 2.31, 3.89, 5.7];
      parciais.forEach((m, i) =>
        modo(
          s,
          taxa,
          0,
          f0 * m * (0.97 + rng() * 0.06),
          (quebra ? 0.07 : 0.045) / (1 + i * 0.6),
          (0.55 / (i + 1)) * k,
        ),
      );
      grao(s, taxa, rng, 0, 0.05, 0.5 * k, 'bp', 900 + rng() * 300, 1.4);
      if (quebra || ev === 'golpe') {
        // lascas: estalos agudos espalhados
        cascata(
          s,
          taxa,
          rng,
          0.02,
          quebra ? 0.3 : 0.08,
          nGraos(18),
          [0.002, 0.006],
          [2200, 6500],
          'hp',
          1.2,
          0.5 * k,
        );
      }
      break;
    }
    case 'folhagem':
      cascata(
        s,
        taxa,
        rng,
        0,
        quebra ? 0.38 : 0.13,
        quebra ? 70 : 22,
        [0.004, 0.016],
        [2600, 8500],
        'bp',
        1.1,
        0.42 * k,
      );
      grao(s, taxa, rng, 0, quebra ? 0.26 : 0.1, 0.3 * k, 'bp', 1800, 0.6);
      break;
    case 'cristal': {
      // estilhaço: modos agudos inarmônicos que somem rápido + cacos tilintando
      estalo(s, taxa, rng, 0, 0.8 * k);
      const f0 = 2100 + rng() * 900;
      [1, 1.47, 2.09, 2.83].forEach((m, i) =>
        modo(s, taxa, 0, f0 * m, 0.05 / (1 + i * 0.4), (0.3 / (i + 1)) * k),
      );
      const cacos = quebra ? 16 : ev === 'golpe' ? 4 : 2;
      for (let i = 0; i < cacos; i++) {
        const t = 0.02 + rng() * (quebra ? 0.45 : 0.1);
        modo(
          s,
          taxa,
          t,
          3000 + rng() * 6000,
          0.012 + rng() * 0.03,
          (0.12 + rng() * 0.15) * k * (1 - t),
        );
      }
      cascata(
        s,
        taxa,
        rng,
        0.005,
        durCascata,
        nGraos(14),
        [0.002, 0.005],
        [5000, 10000],
        'hp',
        1,
        0.3 * k,
      );
      break;
    }
  }
  if (ev === 'colocar') {
    // assentar: baque grave por baixo do material
    baque(s, taxa, rng, 0, 180, 0.09, 0.7);
  }
  if (ev === 'aterrissagem') baque(s, taxa, rng, 0, 140, 0.12, 0.6);
}

/** Gera a amostra (PCM mono normalizada) de um evento de material. */
export function sintetizarAmostra(
  ev: EventoMaterial,
  grupo: GrupoMaterial,
  variacao: number,
  taxa = 44100,
): Float32Array {
  const n = Math.floor(DURACOES[ev] * taxa);
  const s = new Float32Array(n);
  const rng = criarGerador(
    1000 +
      EVENTOS_MATERIAL.indexOf(ev) * 97 +
      ['terra', 'pedra', 'areia', 'madeira', 'folhagem', 'cristal'].indexOf(grupo) * 13 +
      variacao * 7919,
  );
  receita(s, taxa, rng, ev, grupo);
  // tira o "DC" e o grave inaudível que só ocupa volume
  biquad(s, taxa, 'hp', 45, 0.7);
  // normaliza o pico e apara o fim com rampa curta (sem clique)
  let pico = 0;
  for (let i = 0; i < n; i++) pico = Math.max(pico, Math.abs(s[i]));
  const alvo = 0.9;
  const fator = pico > 0 ? alvo / pico : 0;
  const rampa = Math.floor(0.01 * taxa);
  for (let i = 0; i < n; i++) {
    const fimEnv = i > n - rampa ? (n - i) / rampa : 1;
    s[i] = s[i] * fator * fimEnv;
  }
  return s;
}
