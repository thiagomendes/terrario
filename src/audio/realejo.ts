/**
 * Os sons do Parque de diversões da Vila Neon (spec 026b), feitos em código: nenhum arquivo novo no
 * pacote de sons. Puro (sem WebAudio): cada função devolve as amostras (mono) na taxa pedida, e
 * `src/audio/somParque.ts` as toca pelo motor do jogo.
 *
 * - **O realejo:** uma valsinha nossa (3/4, Dó maior, 16 compassos, 135 batidas), melodia e o
 *   "pum-pá-pá" (o baixo no 1, o acorde no 2 e no 3), num órgão de brinquedo: tubos com poucos
 *   harmônicos, um segundo tubo um tico desafinado (o "céleste" dos realejos), um tremor leve na
 *   melodia e o soprinho do tubo no começo da nota. O laço fecha sem emenda: o fim das notas do
 *   último compasso cai no começo do buffer, que dura exatamente `REALEJO.duracao`.
 * - **Os toques curtos:** o "tum" do bate-bate, a risadinha, o sininho da pipoca, o estouro da
 *   pipoca, o "fuup" do balão, a argola no pino, o "ploc" da pescaria, a máquina de algodão-doce, o
 *   empurrão da roda-gigante, o zumbido das lâmpadas (laço de 2 s) e o floreio do carrossel.
 * - **A régua (019):** tudo sai em -23 dBFS RMS "enquanto soa" (`rmsSoando`), pico até 0,9, sem
 *   desvio de zero, começo e fim no zero (sem estalo). Assim os ganhos em dB de `GANHO_PARQUE`
 *   valem como os de `GANHO_BRINQUEDO` da Vila.
 */

/** A taxa dos sons do parque (leve: o realejo inteiro cabe em ~1,9 MB). */
export const TAXA_PARQUE = 22050;
/** O nível "enquanto soa" de todos os sons (dBFS RMS), o mesmo dos clipes gravados da 019. */
export const ALVO_RMS_DB = -23;
export const PICO_MAXIMO = 0.9;

const DUAS_PI = Math.PI * 2;
const dbLin = (db: number) => Math.pow(10, db / 20);

// ------------------------------------------------------------------ a medida

/**
 * O RMS "enquanto soa": janelas de 20 ms, só as que ficam a até 20 dB da janela mais forte (o
 * silêncio e o fim da cauda não contam). Linear (0 a 1).
 */
export function rmsSoando(x: Float32Array, taxa: number): number {
  const w = Math.max(1, Math.round(0.02 * taxa));
  const medias: number[] = [];
  for (let i = 0; i < x.length; i += w) {
    const fim = Math.min(x.length, i + w);
    let s = 0;
    for (let j = i; j < fim; j++) s += x[j] * x[j];
    medias.push(s / (fim - i));
  }
  let max = 0;
  for (const m of medias) if (m > max) max = m;
  if (max <= 0) return 0;
  const corte = max * 0.01;
  let soma = 0;
  let n = 0;
  for (const m of medias)
    if (m >= corte) {
      soma += m;
      n++;
    }
  return Math.sqrt(soma / n);
}

export function picoDe(x: Float32Array): number {
  let p = 0;
  for (let i = 0; i < x.length; i++) {
    const a = Math.abs(x[i]);
    if (a > p) p = a;
  }
  return p;
}

/** Linear -> dB. */
export const emDb = (v: number): number => 20 * Math.log10(Math.max(v, 1e-12));

// ------------------------------------------------------------------ o acabamento

function escalar(x: Float32Array, g: number): void {
  for (let i = 0; i < x.length; i++) x[i] *= g;
}

/** Leva ao alvo da régua; se o pico passar de 0,9, arredonda os picos (tanh) e mede de novo. */
function nivelar(x: Float32Array, taxa: number): void {
  const alvo = dbLin(ALVO_RMS_DB);
  for (let volta = 0; volta < 5; volta++) {
    const r = rmsSoando(x, taxa);
    if (r <= 0) return;
    escalar(x, alvo / r);
    if (picoDe(x) <= PICO_MAXIMO) return;
    const L = PICO_MAXIMO * 0.98;
    for (let i = 0; i < x.length; i++) x[i] = L * Math.tanh(x[i] / L);
  }
  const p = picoDe(x);
  if (p > PICO_MAXIMO) escalar(x, PICO_MAXIMO / p);
}

/** Um toque curto pronto: sem desvio de zero (filtro de 20 Hz), bordas no zero, na régua. */
function acabar(x: Float32Array, taxa: number): Float32Array {
  const a = Math.exp((-DUAS_PI * 20) / taxa);
  let xa = 0;
  let ya = 0;
  for (let i = 0; i < x.length; i++) {
    const y = x[i] - xa + a * ya;
    xa = x[i];
    ya = y;
    x[i] = y;
  }
  const ini = Math.max(1, Math.round(0.002 * taxa));
  const fim = Math.max(1, Math.round(0.012 * taxa));
  for (let i = 0; i < ini && i < x.length; i++) x[i] *= i / ini;
  for (let i = 0; i < fim && i < x.length; i++) x[x.length - 1 - i] *= i / fim;
  nivelar(x, taxa);
  return x;
}

/** O laço pronto: tira a média (o laço segue sem emenda) e põe na régua. */
function acabarLaco(x: Float32Array, taxa: number): Float32Array {
  let m = 0;
  for (let i = 0; i < x.length; i++) m += x[i];
  m /= x.length || 1;
  for (let i = 0; i < x.length; i++) x[i] -= m;
  nivelar(x, taxa);
  return x;
}

/** Sorteio com semente (mulberry32): o mesmo som toda vez. */
function sorteio(semente: number): () => number {
  let a = semente >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const vazio = (seg: number, taxa: number) => new Float32Array(Math.max(1, Math.round(seg * taxa)));

// ------------------------------------------------------------------ o órgão

export type VozRealejo = 'melodia' | 'baixo' | 'acorde';

export interface NotaRealejo {
  /** Começo (batidas, do começo da música). */
  t: number;
  /** Duração (batidas). */
  d: number;
  /** Altura (MIDI: 60 = Dó central). */
  p: number;
  voz: VozRealejo;
}

interface Timbre {
  harm: readonly number[];
  amp: number;
  /** Quanto da batida a nota segura (o resto é silêncio entre as notas). */
  legato: number;
  /** O segundo tubo: a desafinação (razão) e quanto dele. */
  celeste: number;
  segundo: number;
  tremor: number;
  sopro: number;
}

/** Tubos de brinquedo: a melodia mais brilhante, o baixo tapado (harmônicos ímpares), o acorde doce. */
const TIMBRES: Record<VozRealejo, Timbre> = {
  melodia: {
    harm: [1, 0.6, 0.45, 0.25, 0.18, 0.1, 0.07, 0.04],
    amp: 1,
    legato: 0.9,
    celeste: 1.004,
    segundo: 0.45,
    tremor: 0.1,
    sopro: 0.07,
  },
  baixo: {
    harm: [1, 0.1, 0.45, 0.05, 0.2, 0.03, 0.1],
    amp: 0.8,
    legato: 0.75,
    celeste: 1.002,
    segundo: 0.3,
    tremor: 0,
    sopro: 0.05,
  },
  acorde: {
    harm: [1, 0.35, 0.2, 0.08],
    amp: 0.24,
    legato: 0.5,
    celeste: 1.002,
    segundo: 0.3,
    tremor: 0,
    sopro: 0,
  },
};

const TAM_TABELA = 2048;
const tabelas = new Map<string, Float32Array>();

/** Um ciclo do tubo, só com os harmônicos abaixo de 0,45 da taxa (nada de serrilhado). */
function tabelaDo(voz: VozRealejo, f: number, taxa: number): Float32Array {
  const harm = TIMBRES[voz].harm;
  let k = harm.length;
  while (k > 1 && k * f * 1.005 > 0.45 * taxa) k--;
  const chave = `${voz}:${k}`;
  const pronta = tabelas.get(chave);
  if (pronta) return pronta;
  const t = new Float32Array(TAM_TABELA + 1);
  let max = 0;
  for (let i = 0; i <= TAM_TABELA; i++) {
    let s = 0;
    for (let h = 0; h < k; h++) s += harm[h] * Math.sin((DUAS_PI * (h + 1) * i) / TAM_TABELA);
    t[i] = s;
    if (i < TAM_TABELA) max = Math.max(max, Math.abs(s));
  }
  for (let i = 0; i <= TAM_TABELA; i++) t[i] /= max;
  tabelas.set(chave, t);
  return t;
}

const ler = (t: Float32Array, fase: number) => {
  const i = fase | 0;
  const r = fase - i;
  return t[i] + (t[i + 1] - t[i]) * r;
};

const hz = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

export const ATAQUE = 0.015;
export const SOLTURA = 0.04;

/**
 * Soma uma nota do órgão em `out`, de `ini` (s). `laco`: o que passa do fim volta no começo (o
 * realejo); sem laço, o que passa do fim fica de fora.
 */
function somarNota(
  out: Float32Array,
  nota: NotaRealejo,
  batida: number,
  taxa: number,
  laco: boolean,
  rnd: () => number,
): void {
  const tb = TIMBRES[nota.voz];
  const f = hz(nota.p);
  const tab = tabelaDo(nota.voz, f, taxa);
  const ini = nota.t * batida;
  const solta = nota.d * batida * tb.legato;
  const n = Math.ceil((solta + SOLTURA) * taxa);
  const i0 = Math.round(ini * taxa);
  const da = (f * TAM_TABELA) / taxa;
  const db = da * tb.celeste;
  let fa = 0;
  let fb = TAM_TABELA * 0.25;
  // o soprinho do tubo: um ruído baixinho, abafado, nos primeiros 25 ms
  let ruido = 0;
  const aRuido = Math.exp((-DUAS_PI * 2500) / taxa);
  const N = out.length;
  for (let j = 0; j < n; j++) {
    const t = j / taxa;
    let env = t < ATAQUE ? 0.5 - 0.5 * Math.cos((Math.PI * t) / ATAQUE) : 1;
    if (t > solta) env *= 0.5 + 0.5 * Math.cos(Math.PI * Math.min(1, (t - solta) / SOLTURA));
    const trem = tb.tremor ? 1 + tb.tremor * Math.sin(DUAS_PI * 6 * t) : 1;
    let v = (ler(tab, fa) + tb.segundo * ler(tab, fb)) * trem;
    if (tb.sopro && t < 0.025) {
      ruido = ruido * aRuido + (rnd() * 2 - 1) * (1 - aRuido);
      v += ruido * tb.sopro * 6 * (1 - t / 0.025);
    }
    fa += da;
    if (fa >= TAM_TABELA) fa -= TAM_TABELA;
    fb += db;
    if (fb >= TAM_TABELA) fb -= TAM_TABELA;
    let k = i0 + j;
    if (k >= N) {
      if (!laco) break;
      k %= N;
    }
    out[k] += v * env * tb.amp;
  }
}

// ------------------------------------------------------------------ a partitura

type Acorde = 'C' | 'G7' | 'G' | 'F' | 'Am';
/** O baixo (no 1) e o acorde (no 2 e no 3) de cada harmonia. */
const ACORDES: Record<Acorde, { baixo: number; notas: number[] }> = {
  C: { baixo: 48, notas: [60, 64, 67] },
  G7: { baixo: 43, notas: [59, 62, 65] },
  G: { baixo: 43, notas: [59, 62, 67] },
  F: { baixo: 41, notas: [60, 65, 69] },
  Am: { baixo: 45, notas: [60, 64, 69] },
};

/** A harmonia dos 16 compassos: frase A (1 a 8) e frase B (9 a 16), que volta no Dó do começo. */
// prettier-ignore
const HARMONIA: Acorde[] = [
  'C', 'C', 'G7', 'C', 'F', 'C', 'G7', 'C',
  'Am', 'F', 'C', 'G', 'F', 'C', 'G7', 'G7',
];

/** A melodia (nossa), compasso a compasso: [altura MIDI, batidas]. Cada compasso soma 3. */
const MELODIA: [number, number][][] = [
  [
    [76, 1],
    [79, 1],
    [84, 1],
  ],
  [
    [83, 2],
    [81, 1],
  ],
  [
    [79, 2],
    [77, 1],
  ],
  [[76, 3]],
  [
    [77, 1],
    [81, 1],
    [84, 1],
  ],
  [
    [84, 0.5],
    [83, 0.5],
    [84, 1],
    [79, 1],
  ],
  [
    [77, 1],
    [76, 1],
    [74, 1],
  ],
  [
    [72, 2],
    [79, 1],
  ],
  [
    [81, 1],
    [84, 1],
    [88, 1],
  ],
  [
    [84, 2],
    [81, 1],
  ],
  [
    [79, 0.5],
    [81, 0.5],
    [79, 1],
    [76, 1],
  ],
  [
    [74, 2],
    [71, 1],
  ],
  [
    [72, 1],
    [77, 1],
    [81, 1],
  ],
  [
    [79, 1],
    [84, 1],
    [76, 1],
  ],
  [
    [77, 1],
    [74, 1],
    [71, 1],
  ],
  // o Fá desce para o Mi do primeiro compasso: o laço volta sem tropeço
  [
    [79, 2],
    [77, 1],
  ],
];

function montarPartitura(mel: [number, number][][], harm: Acorde[]): NotaRealejo[] {
  const notas: NotaRealejo[] = [];
  mel.forEach((comp, c) => {
    let t = c * 3;
    for (const [p, d] of comp) {
      notas.push({ t, d, p, voz: 'melodia' });
      t += d;
    }
  });
  harm.forEach((h, c) => {
    const a = ACORDES[h];
    notas.push({ t: c * 3, d: 1, p: a.baixo, voz: 'baixo' });
    for (const b of [1, 2])
      for (const p of a.notas) notas.push({ t: c * 3 + b, d: 1, p, voz: 'acorde' });
  });
  return notas.sort((a, b) => a.t - b.t || a.p - b.p);
}

const BPM_REALEJO = 135;
const COMPASSOS_REALEJO = 16;

/** A valsinha do realejo: 16 compassos de 3/4 a 135 batidas (21,33 s), em laço. */
export const REALEJO = {
  bpm: BPM_REALEJO,
  compassos: COMPASSOS_REALEJO,
  /** s */
  duracao: (COMPASSOS_REALEJO * 3 * 60) / BPM_REALEJO,
  notas: montarPartitura(MELODIA, HARMONIA),
} as const;

/** O floreio do carrossel (2 compassos, o mesmo tom e andamento): um arpejo que sobe e pousa. */
export const FLOREIO = {
  compassos: 2,
  notas: [
    ...[72, 76, 79, 84, 88, 91].map(
      (p, i): NotaRealejo => ({ t: i * 0.5, d: 0.5, p, voz: 'melodia' }),
    ),
    { t: 3, d: 0.5, p: 88, voz: 'melodia' },
    { t: 3.5, d: 0.5, p: 86, voz: 'melodia' },
    { t: 4, d: 2, p: 84, voz: 'melodia' },
    { t: 0, d: 1, p: 48, voz: 'baixo' },
    { t: 3, d: 1, p: 43, voz: 'baixo' },
    ...[1, 2].flatMap((b) =>
      [60, 64, 67].map((p): NotaRealejo => ({ t: b, d: 1, p, voz: 'acorde' })),
    ),
    ...[60, 64, 67].map((p): NotaRealejo => ({ t: 4, d: 2, p, voz: 'acorde' })),
  ] as NotaRealejo[],
};

/**
 * O realejo aos poucos: cada `next()` soma umas notas (ou faz uma passada do acabamento), para a
 * tela nunca engasgar; o valor final é o laço pronto (`REALEJO.duracao` s).
 */
export function* renderizarRealejoAosPoucos(
  taxa = TAXA_PARQUE,
  notasPorPasso = 6,
): Generator<void, Float32Array, void> {
  const out = vazio(REALEJO.duracao, taxa);
  const batida = 60 / REALEJO.bpm;
  const rnd = sorteio(135);
  let k = 0;
  for (const nota of REALEJO.notas) {
    somarNota(out, nota, batida, taxa, true, rnd);
    if (++k % notasPorPasso === 0) yield;
  }
  yield;
  return acabarLaco(out, taxa);
}

export function renderizarRealejo(taxa = TAXA_PARQUE): Float32Array {
  const g = renderizarRealejoAosPoucos(taxa);
  for (;;) {
    const r = g.next();
    if (r.done) return r.value;
  }
}

// ------------------------------------------------------------------ os toques curtos

/** O "tum" do bate-bate: borracha macia, grave, que cai de altura (nunca áspero). */
export function tum(taxa = TAXA_PARQUE): Float32Array {
  const x = vazio(0.25, taxa);
  const rnd = sorteio(7);
  let f1 = 0;
  let f2 = 0;
  let r = 0;
  const aR = Math.exp((-DUAS_PI * 300) / taxa);
  for (let i = 0; i < x.length; i++) {
    const t = i / taxa;
    const ataque = Math.min(1, t / 0.005);
    f1 += (DUAS_PI * (58 + 52 * Math.exp(-t / 0.04))) / taxa;
    f2 += (DUAS_PI * (125 + 70 * Math.exp(-t / 0.03))) / taxa;
    r = r * aR + (rnd() * 2 - 1) * (1 - aR);
    // a borracha balança um tiquinho (o "boing" bem curto)
    const bal = 1 + 0.15 * Math.sin(DUAS_PI * 18 * t) * Math.exp(-t / 0.08);
    x[i] =
      ataque *
      (Math.sin(f1) * Math.exp(-t / 0.075) * bal +
        0.55 * Math.sin(f2) * Math.exp(-t / 0.05) +
        2.5 * r * Math.exp(-t / 0.015));
  }
  return acabar(x, taxa);
}

/**
 * A risadinha de brinquedo: "hi-hi-hi" (4 ou 5 bipes curtos, de 500 a 900 Hz, cada um sobe e
 * desce um pouco), com o "h" de sopro no começo de cada bipe e o brilho do "i" perto de 3 kHz.
 */
export function risada(n: 0 | 1 = 0, taxa = TAXA_PARQUE): Float32Array {
  const alturas = n === 0 ? [880, 820, 760, 690] : [780, 860, 800, 720, 600];
  const x = vazio(0.62, taxa);
  const rnd = sorteio(31 + n);
  const passo = n === 0 ? 0.135 : 0.11;
  alturas.forEach((f0, b) => {
    const ultimo = b === alturas.length - 1;
    const dur = ultimo ? 0.12 : 0.075;
    const i0 = Math.round((0.01 + b * passo) * taxa);
    const m = Math.round(dur * taxa);
    const amp = 1 - 0.1 * b;
    let fase = 0;
    let h = 0;
    for (let j = 0; j < m && i0 + j < x.length; j++) {
      const u = j / m;
      const t = j / taxa;
      const f = f0 * (1 + 0.1 * Math.sin(Math.PI * u) - (ultimo ? 0.12 * u : 0));
      fase += (DUAS_PI * f) / taxa;
      let s = 0;
      for (let k = 1; k <= 6; k++) {
        if (k * f > 0.45 * taxa) break;
        const brilho = 1 + 2.2 * Math.exp(-(((k * f - 3000) / 700) ** 2));
        s += (brilho / k) * Math.sin(k * fase);
      }
      h = h * 0.6 + (rnd() * 2 - 1) * 0.4;
      const sopro = t < 0.018 ? 0.35 * h * (1 - t / 0.018) : 0;
      const env = Math.pow(Math.sin(Math.PI * u), 0.7);
      x[i0 + j] += amp * env * (s * 0.6 + sopro);
    }
  });
  return acabar(x, taxa);
}

/** O sininho do carrinho de pipoca: "dim-dim", claro. */
export function sininho(taxa = TAXA_PARQUE): Float32Array {
  const x = vazio(0.5, taxa);
  const parciais: [number, number, number][] = [
    [1, 1, 0.16],
    [2.76, 0.4, 0.07],
    [5.4, 0.15, 0.035],
  ];
  for (const [ini, amp] of [
    [0, 1],
    [0.17, 0.85],
  ] as const) {
    const i0 = Math.round(ini * taxa);
    for (let j = 0; i0 + j < x.length; j++) {
      const t = j / taxa;
      const a = Math.min(1, t / 0.002);
      let s = 0;
      for (const [r, g, tau] of parciais) {
        const f = 1400 * r;
        if (f > 0.45 * taxa) continue;
        s += g * Math.sin(DUAS_PI * f * t) * Math.exp(-t / tau);
      }
      x[i0 + j] += amp * a * s;
    }
  }
  return acabar(x, taxa);
}

/** A pipoca estourando: 6 a 9 estalinhos em ~0,7 s, sempre os mesmos para a mesma semente. */
export function estouro(semente = 0, taxa = TAXA_PARQUE): Float32Array {
  const x = vazio(0.7, taxa);
  const rnd = sorteio(1000 + semente);
  const quantos = 6 + Math.floor(rnd() * 4);
  const aBaixa = Math.exp((-DUAS_PI * 3500) / taxa);
  const aAlta = Math.exp((-DUAS_PI * 700) / taxa);
  for (let p = 0; p < quantos; p++) {
    const ini = 0.01 + rnd() * 0.6;
    const amp = 0.5 + rnd() * 0.5;
    const fPok = 500 + rnd() * 400;
    const i0 = Math.round(ini * taxa);
    let lp = 0;
    let hpX = 0;
    let hpY = 0;
    for (let j = 0; j < Math.round(0.035 * taxa) && i0 + j < x.length; j++) {
      const t = j / taxa;
      const a = Math.min(1, t / 0.0008);
      lp = lp * aBaixa + (rnd() * 2 - 1) * (1 - aBaixa);
      const hp = aAlta * (hpY + lp - hpX);
      hpX = lp;
      hpY = hp;
      x[i0 + j] +=
        amp *
        a *
        (3 * hp * Math.exp(-t / 0.005) + 0.6 * Math.sin(DUAS_PI * fPok * t) * Math.exp(-t / 0.012));
    }
  }
  return acabar(x, taxa);
}

/** O balão: um "fuup" que sobe, macio (o sopro primeiro, o assobio depois). */
export function balao(taxa = TAXA_PARQUE): Float32Array {
  const x = vazio(0.35, taxa);
  const rnd = sorteio(55);
  let fase = 0;
  let r = 0;
  const aR = Math.exp((-DUAS_PI * 1800) / taxa);
  for (let i = 0; i < x.length; i++) {
    const t = i / taxa;
    const u = t / 0.35;
    const f = 500 * Math.pow(2.2, Math.pow(u, 0.8));
    fase += (DUAS_PI * f) / taxa;
    r = r * aR + (rnd() * 2 - 1) * (1 - aR);
    const env = Math.pow(Math.sin(Math.PI * u), 0.6);
    const tom = Math.min(1, t / 0.05);
    x[i] = env * (tom * (Math.sin(fase) + 0.15 * Math.sin(2 * fase)) + r * (3 - 2 * tom));
  }
  return acabar(x, taxa);
}

/** A argola no pino: o "toc" de madeira e logo o "plim". */
export function argola(taxa = TAXA_PARQUE): Float32Array {
  const x = vazio(0.4, taxa);
  const rnd = sorteio(77);
  for (let i = 0; i < x.length; i++) {
    const t = i / taxa;
    const a = Math.min(1, t / 0.001);
    let s =
      Math.sin(DUAS_PI * 820 * t) * Math.exp(-t / 0.025) +
      0.5 * Math.sin(DUAS_PI * 1340 * t) * Math.exp(-t / 0.015) +
      0.5 * (rnd() * 2 - 1) * Math.exp(-t / 0.003);
    const tp = t - 0.07;
    if (tp > 0) {
      const ap = Math.min(1, tp / 0.002);
      let p = 0;
      for (const [r, g, tau] of [
        [1, 1, 0.14],
        [2, 0.25, 0.08],
        [3, 0.1, 0.05],
      ] as const) {
        const f = 2093 * r;
        if (f > 0.45 * taxa) continue;
        p += g * Math.sin(DUAS_PI * f * tp) * Math.exp(-tp / tau);
      }
      s += 0.7 * ap * p;
    }
    x[i] = a * s;
  }
  return acabar(x, taxa);
}

/** O "ploc" da pescaria: a gotinha que sobe de altura, e outra menorzinha. */
export function agua(taxa = TAXA_PARQUE): Float32Array {
  const x = vazio(0.25, taxa);
  for (const [ini, amp, f0, f1] of [
    [0, 1, 400, 1300],
    [0.11, 0.4, 600, 1600],
  ] as const) {
    const i0 = Math.round(ini * taxa);
    let fase = 0;
    for (let j = 0; i0 + j < x.length; j++) {
      const t = j / taxa;
      const f = f0 + (f1 - f0) * (1 - Math.exp(-t / 0.03));
      fase += (DUAS_PI * f) / taxa;
      x[i0 + j] += amp * Math.min(1, t / 0.002) * Math.sin(fase) * Math.exp(-t / 0.045);
    }
  }
  return acabar(x, taxa);
}

/** Um zumbido de motorzinho que acelera e freia (a máquina do algodão-doce, a roda). */
function giro(
  x: Float32Array,
  taxa: number,
  dur: number,
  fMin: number,
  fMax: number,
  amp: number,
  semente: number,
): void {
  const rnd = sorteio(semente);
  let fase = 0;
  let r = 0;
  let r2 = 0;
  const aR = Math.exp((-DUAS_PI * 900) / taxa);
  const n = Math.min(x.length, Math.round(dur * taxa));
  for (let i = 0; i < n; i++) {
    const u = i / n;
    const vel = Math.pow(Math.sin(Math.PI * u), 0.8);
    const f = fMin + (fMax - fMin) * vel;
    fase += (DUAS_PI * f) / taxa;
    let s = 0;
    for (let k = 1; k <= 6; k++) s += Math.sin(k * fase) / Math.pow(k, 1.3);
    r = r * aR + (rnd() * 2 - 1) * (1 - aR);
    r2 = r2 * aR + r * (1 - aR);
    x[i] += amp * vel * (s * 0.6 + r2 * 12 * (0.6 + 0.4 * Math.sin(fase)));
  }
}

/** A máquina do algodão-doce: o giro que sobe e desce, macio (~1,2 s). */
export function algodao(taxa = TAXA_PARQUE): Float32Array {
  const x = vazio(1.2, taxa);
  giro(x, taxa, 1.2, 40, 150, 1, 91);
  return acabar(x, taxa);
}

/** O empurrão da roda-gigante: o motor que gira e dois "clec" da catraca (~0,9 s). */
export function roda(taxa = TAXA_PARQUE): Float32Array {
  const x = vazio(0.9, taxa);
  giro(x, taxa, 0.9, 30, 80, 0.5, 93);
  const rnd = sorteio(94);
  for (const [ini, amp] of [
    [0.3, 1],
    [0.55, 0.8],
  ] as const) {
    const i0 = Math.round(ini * taxa);
    for (let j = 0; j < Math.round(0.12 * taxa) && i0 + j < x.length; j++) {
      const t = j / taxa;
      const a = Math.min(1, t / 0.0008);
      x[i0 + j] +=
        amp *
        a *
        (Math.sin(DUAS_PI * 1100 * t) * Math.exp(-t / 0.01) +
          0.5 * Math.sin(DUAS_PI * 1700 * t) * Math.exp(-t / 0.006) +
          0.7 * Math.sin(DUAS_PI * 300 * t) * Math.exp(-t / 0.02) +
          0.6 * (rnd() * 2 - 1) * Math.exp(-t / 0.003));
    }
  }
  return acabar(x, taxa);
}

/**
 * O zumbido das lâmpadas de noite: 120 Hz (a rede do Brasil) e harmônicos, um chiadinho no pico de
 * cada ciclo e uma respiração lenta. Laço de 2 s sem emenda: tudo cabe em ciclos inteiros.
 */
export function zumbido(taxa = TAXA_PARQUE): Float32Array {
  const x = vazio(2, taxa);
  const N = x.length;
  const rnd = sorteio(120);
  for (let i = 0; i < N; i++) {
    // o tempo em ciclos inteiros do laço (a taxa pode não dividir certinho)
    const t = (i / N) * 2;
    const c = Math.sin(DUAS_PI * 120 * t);
    const chiado = Math.pow(Math.abs(c), 6) * (rnd() * 2 - 1);
    x[i] =
      (1 + 0.15 * Math.sin(DUAS_PI * 0.5 * t)) *
      (c +
        0.5 * Math.sin(DUAS_PI * 240 * t) +
        0.25 * Math.sin(DUAS_PI * 360 * t + 1) +
        0.12 * Math.tanh(4 * c) +
        0.08 * chiado);
  }
  return acabarLaco(x, taxa);
}

/** O floreio do carrossel: 2 compassos do realejo, mais a cauda das notas. */
export function floreio(taxa = TAXA_PARQUE): Float32Array {
  const batida = 60 / REALEJO.bpm;
  const x = vazio(FLOREIO.compassos * 3 * batida + 0.15, taxa);
  const rnd = sorteio(136);
  for (const nota of FLOREIO.notas) somarNota(x, nota, batida, taxa, false, rnd);
  return acabar(x, taxa);
}
