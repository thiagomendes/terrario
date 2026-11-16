/**
 * O Show da Vila (spec 026): as regras puras do tempo do show, iguais no núcleo (aparelho e
 * nuvem) e na tela. Nada de DOM, Babylon ou áudio.
 *
 * O show de verdade (o dono, 16 nov 2026: "precisa ser mais realista"), uns 6 min, tudo pelo
 * relógio do núcleo (quem chega no meio vê o momento certo):
 *
 * 1. **A abertura** (`INTRO` s): o palco escurece, os holofotes varrem, as caixas pulsam, as
 *    estrelinhas e o neon correm, o raio da logo acende piscando, o som sobe e a contagem de quatro
 *    batidas (`CONTA_INTRO`) leva ao estouro.
 * 2. **A entrada** (`ENTRADA` s): a banda sobe pela escadinha do lado do palco e vai para o lugar;
 *    o vocalista cumprimenta o povo na ponta da passarela; o povo vibra.
 * 3. **As três músicas** (`SETLIST`), cada uma com a contagem das baquetas no andamento dela, com
 *    andamento, tom e balanço próprios, e uma pausa (`PAUSA` s) entre elas: a banda acena e o povo
 *    aplaude.
 * 4. **O chamado e o acorde final:** a última parte da última música chama; o primeiro toque
 *    dispara o acorde final (em até 100 ms); sem toque, ele vem sozinho no fim do chamado. Depois
 *    (`APLAUSO` s): os fogos de estrelinhas, a reverência, o aceno, e a banda sai pela escadinha.
 *
 * - **Nenhum toque perdido:** nas músicas, qualquer toque no palco toca o acorde do compasso em que
 *   cai, encaixado no próximo oitavo de compasso da música, sempre na nota certa.
 * - Depois do show, as três caixas ficam como brinquedo livre (cada toque liga e desliga a camada
 *   dela), sem moedinha.
 */

import { noiteNaHora, normalizarHora } from './tempo';

/** O andamento da primeira música (e do brinquedo livre das caixas, e da batida do rádio). */
export const BPM = 120;
/** Um compasso de 4 tempos da primeira música (s). */
export const COMPASSO = (60 / BPM) * 4;
/** O encaixe do toque na primeira música: um oitavo de compasso (s). */
export const OITAVO = COMPASSO / 8;

/** A sequência de acordes da primeira música (um por compasso, em laço): Mi, Dó, Ré, Mi. */
export const ACORDES_SHOW: readonly (readonly number[])[] = [
  [40, 47, 52, 56, 59, 64],
  [36, 43, 48, 52, 55, 60],
  [38, 45, 50, 54, 57, 62],
  [40, 47, 52, 56, 59, 64],
];
/** O acorde final da primeira versão do show (Mi com a quinta em cima): o brinquedo das caixas. */
export const ACORDE_FINAL: readonly number[] = [28, 40, 47, 52, 59, 64, 71];

// ------------------------------------------------------------------ o roteiro
/** A abertura (s): escuro, luzes, o raio da logo e o som subindo até o estouro. */
export const INTRO = 18;
/** Na abertura (s desde o começo): o escuro, as varreduras, o raio acendendo, as quatro batidas. */
export const ESCURO_INTRO = 2.5;
export const RAIO_ACENDE = 10;
export const CONTA_INTRO: readonly number[] = [14, 15, 16, 17];
/** A entrada da banda (s), depois do estouro da abertura. */
export const ENTRADA = 20;
/** A pausa entre duas músicas (s), antes da contagem da seguinte. */
export const PAUSA = 8;
/** Depois do acorde final (s): fogos, reverência, aceno e a banda sai; então o show acaba. */
export const APLAUSO = 24;

export interface ParteMusica {
  pedaco: string;
  compassos: number;
}
export interface Musica {
  id: string;
  bpm: number;
  /** As partes, em ordem (compassos de 4 tempos). */
  forma: readonly ParteMusica[];
  /** Os acordes do toque no palco (notas MIDI): três por música. */
  acordes: readonly (readonly number[])[];
  /** O acorde do toque em cada compasso (índice em `acordes`), em laço de quatro. */
  giro: readonly number[];
}

const parte = (pedaco: string, compassos: number): ParteMusica => ({ pedaco, compassos });

/**
 * As três músicas do show, todas nossas (partitura em
 * `.sdd/specs/026-mundo-anos-80/referencia/fontes/scripts-pacote/show_compor.py`):
 * - **m1**, o rock de brinquedo galopando em Mi a 120 (a aprovada: verso, refrão, subida), agora
 *   com o solo de guitarra e o fim;
 * - **m2**, o rock reto e rápido em Lá a 140, com o gancho no sintetizador e a ponte;
 * - **m3**, o hino de meio tempo em Ré a 100, com as palmas, o solo e o chamado do fim.
 */
export const SETLIST: readonly Musica[] = [
  {
    id: 'm1',
    bpm: 120,
    forma: [
      parte('verso', 8),
      parte('refrao', 8),
      parte('verso', 4),
      parte('refrao', 8),
      parte('solo', 8),
      parte('subida', 4),
      parte('refrao', 4),
      parte('fim', 2),
    ],
    acordes: [ACORDES_SHOW[0], ACORDES_SHOW[1], ACORDES_SHOW[2]],
    giro: [0, 1, 2, 0],
  },
  {
    id: 'm2',
    bpm: 140,
    forma: [
      parte('intro', 2),
      parte('verso', 8),
      parte('refrao', 8),
      parte('verso', 8),
      parte('refrao', 8),
      parte('ponte', 8),
      parte('refrao', 8),
      parte('fim', 2),
    ],
    // Lá, Sol, Ré (Lá maior com a sétima abaixada: o rock da estrada)
    acordes: [
      [45, 52, 57, 61, 64, 69],
      [43, 50, 55, 59, 62, 67],
      [38, 45, 50, 54, 57, 62],
    ],
    giro: [0, 1, 2, 0],
  },
  {
    id: 'm3',
    bpm: 100,
    forma: [
      parte('intro', 2),
      parte('verso', 8),
      parte('refrao', 8),
      parte('verso', 4),
      parte('refrao', 8),
      parte('solo', 4),
      parte('chamado', 2),
    ],
    // Ré, Sol, Lá
    acordes: [
      [38, 45, 50, 54, 57, 62],
      [43, 50, 55, 59, 62, 67],
      [45, 52, 57, 61, 64, 69],
    ],
    giro: [0, 1, 0, 2],
  },
];

/** Uma música no roteiro do show (s desde o começo do show). */
export interface MusicaNoShow {
  i: number;
  musica: Musica;
  /** A contagem das baquetas (um compasso da música). */
  contagem: number;
  /** O primeiro tempo. */
  inicio: number;
  /** O fim do último compasso. */
  fim: number;
  /** Um compasso dela (s). */
  compasso: number;
  partes: { pedaco: string; ini: number; compassos: number; c0: number; vez: number }[];
}

function montarRoteiro(): MusicaNoShow[] {
  const out: MusicaNoShow[] = [];
  let t = INTRO + ENTRADA;
  SETLIST.forEach((m, i) => {
    if (i > 0) t += PAUSA;
    const compasso = (60 / m.bpm) * 4;
    const contagem = t;
    const inicio = t + compasso;
    let c = 0;
    const vezes = new Map<string, number>();
    const partes = m.forma.map((p) => {
      const vez = vezes.get(p.pedaco) ?? 0;
      vezes.set(p.pedaco, vez + 1);
      const r = {
        pedaco: p.pedaco,
        ini: inicio + c * compasso,
        compassos: p.compassos,
        c0: c,
        vez,
      };
      c += p.compassos;
      return r;
    });
    const fim = inicio + c * compasso;
    out.push({ i, musica: m, contagem, inicio, fim, compasso, partes });
    t = fim;
  });
  return out;
}
/** O roteiro das músicas (calculado uma vez). */
export const ROTEIRO: readonly MusicaNoShow[] = montarRoteiro();
const ULTIMA = ROTEIRO[ROTEIRO.length - 1];
const PARTE_CHAMADO = ULTIMA.partes[ULTIMA.partes.length - 1];
/** O palco começa a piscar chamando o acorde final (s desde o começo): a última parte. */
export const CHAMADO = PARTE_CHAMADO.ini;
/** Sem toque, o acorde final vem sozinho no fim do chamado (s depois dele). */
export const ESPERA_FINAL = PARTE_CHAMADO.compassos * ULTIMA.compasso;
/** O primeiro tempo da primeira música (s desde o começo; a contagem vem um compasso antes). */
export const CONTAGEM = ROTEIRO[0].inicio;
/** Quanto dura o show inteiro sem toque no chamado (s). */
export const DURACAO_SHOW = CHAMADO + ESPERA_FINAL + APLAUSO;

export type FaseShow =
  | 'intro'
  | 'entrada'
  | 'contagem'
  | 'tocando'
  | 'pausa'
  | 'chamando'
  | 'final'
  | 'acabou';

/** O estado do show no núcleo: quando começou e quando veio o acorde final (tempo do mundo). */
export interface Show {
  inicio: number;
  final: number | null;
  /** Quem disparou o acorde final ('auto' se veio sozinho). */
  quem?: string;
}

/** Tudo o que a tela e o som precisam saber do show num instante. */
export interface MomentoShow {
  fase: FaseShow;
  /** s desde o começo do show. */
  d: number;
  /** A música (índice no `ROTEIRO`): a da contagem ou tocando, ou a que acabou (na pausa); -1 antes. */
  musica: number;
  /** s desde o primeiro tempo da música (negativo na contagem). */
  dm: number;
  /** Uma batida da música (s) e as batidas desde o primeiro tempo dela. */
  segBatida: number;
  batida: number;
  /** O compasso da música (pode ser negativo na contagem). */
  compasso: number;
  /** A parte tocando (null fora das músicas), quantas vezes ela já veio antes, e o compasso nela. */
  pedaco: string | null;
  vez: number;
  noPedaco: number;
  /** s desde o acorde final (Infinity sem ele). */
  idadeFinal: number;
}

/** O momento do show no tempo `t` (mesmo relógio de `inicio`). */
export function momentoDoShow(s: Show, t: number): MomentoShow {
  const d = t - s.inicio;
  const idadeFinal = s.final !== null ? t - s.final : Infinity;
  const base = {
    d,
    musica: -1,
    dm: 0,
    segBatida: 60 / BPM,
    batida: 0,
    compasso: 0,
    pedaco: null as string | null,
    vez: 0,
    noPedaco: 0,
    idadeFinal,
  };
  let fase: FaseShow;
  if (s.final !== null && idadeFinal >= 0) fase = idadeFinal >= APLAUSO ? 'acabou' : 'final';
  else if (d < INTRO) fase = 'intro';
  else if (d < ROTEIRO[0].contagem) fase = 'entrada';
  else fase = 'tocando';
  if (fase === 'intro' || fase === 'entrada') return { ...base, fase };
  // a música do momento (no final, a última; as contas seguem para a dança do fim)
  let k = 0;
  while (k + 1 < ROTEIRO.length && d >= ROTEIRO[k + 1].contagem) k++;
  const r = ROTEIRO[k];
  const segBatida = 60 / r.musica.bpm;
  const dm = d - r.inicio;
  const batida = dm / segBatida;
  const compasso = Math.floor(dm / r.compasso + 1e-9);
  let pedaco: string | null = null;
  let vez = 0;
  let noPedaco = 0;
  for (const p of r.partes)
    if (d >= p.ini - 1e-9 && d < p.ini + p.compassos * r.compasso - 1e-9) {
      pedaco = p.pedaco;
      vez = p.vez;
      noPedaco = Math.floor((d - p.ini) / r.compasso + 1e-9);
    }
  if (fase === 'tocando') {
    if (d < r.inicio) fase = 'contagem';
    else if (d >= r.fim) fase = k + 1 < ROTEIRO.length ? 'pausa' : 'chamando';
    else if (d >= CHAMADO) fase = 'chamando';
  }
  return { ...base, fase, musica: k, dm, segBatida, batida, compasso, pedaco, vez, noPedaco };
}

/** A fase do show no tempo `t` (mesmo relógio de `inicio`). */
export function faseDoShow(s: Show, t: number): FaseShow {
  return momentoDoShow(s, t).fase;
}

/** A música toca agora (a contagem, as partes ou o chamado): o toque no palco toca um acorde. */
export function faseComMusica(f: FaseShow | null): boolean {
  return f === 'contagem' || f === 'tocando' || f === 'chamando';
}

/** O acorde final veio sozinho? (o chamado esperou ESPERA_FINAL sem toque) */
export function finalSozinho(s: Show, t: number): boolean {
  return s.final === null && t - s.inicio >= CHAMADO + ESPERA_FINAL;
}

/** O momento do acorde final se ele vier sozinho (para a tela e o som). */
export function momentoFinalSozinho(s: Show): number {
  return s.inicio + CHAMADO + ESPERA_FINAL;
}

/** O acorde de um toque: a música e o acorde dela (o índice que vai no evento: 3 por música). */
export const ACORDES_POR_MUSICA = 3;
export function acordeDoToque(indice: number): { musica: number; acorde: number } {
  const k = Math.max(0, Math.floor(indice));
  return {
    musica: Math.floor(k / ACORDES_POR_MUSICA) % SETLIST.length,
    acorde: k % ACORDES_POR_MUSICA,
  };
}

/**
 * O toque no palco no tempo `t`: quando o acorde soa (o próximo oitavo da música, no máximo um
 * oitavo de compasso depois) e qual acorde (o do compasso em que ele soa, na música de agora:
 * `musica * 3 + acorde`). Na contagem, o toque cai no primeiro tempo. Fora das músicas: null.
 */
export function encaixarToque(s: Show, t: number): { quando: number; acorde: number } | null {
  const m = momentoDoShow(s, t);
  if (!faseComMusica(m.fase) || m.musica < 0) return null;
  const r = ROTEIRO[m.musica];
  const oitavo = r.compasso / 8;
  const d = Math.max(0, m.dm);
  const k = Math.ceil(d / oitavo - 1e-9);
  const quando = s.inicio + r.inicio + k * oitavo;
  const compasso = Math.min(
    Math.floor((k * oitavo) / r.compasso + 1e-9),
    Math.round((r.fim - r.inicio) / r.compasso) - 1,
  );
  const g = r.musica.giro;
  return { quando, acorde: m.musica * ACORDES_POR_MUSICA + g[compasso % g.length] };
}

/** Quanto falta para o acorde final vir sozinho (0 a ESPERA_FINAL; null fora do chamado). */
export function faltaParaOFinal(s: Show, t: number): number | null {
  if (faseDoShow(s, t) !== 'chamando') return null;
  return Math.max(0, s.inicio + CHAMADO + ESPERA_FINAL - t);
}

// ------------------------------------------------------------------ o palco e as caixas

/** As três caixas do show: cada uma soma uma camada (bateria, baixo e guitarra, teclado). */
export const CAMADAS_CAIXAS = ['bateria', 'guitarra', 'teclado'] as const;
export type CamadaCaixa = (typeof CAMADAS_CAIXAS)[number];

/** Toques por segundo que o núcleo aceita de um jogador no palco (o resto é ignorado). */
export const TOQUES_POR_SEGUNDO = 6;

// ------------------------------------------------------------------ o show é de noite
/**
 * O show só começa de noite (decisão do dono, 15 nov 2026: "o show acontece só na noite do
 * jogo", em vez de o show trazer a noite). A janela abre um tico antes de escurecer de vez (o
 * entardecer roxo já vale) e fecha um tico antes de clarear, para o show que começa no fim da
 * noite ainda acabar no escuro. O show que já começou nunca é cortado: termina mesmo que o dia
 * chegue no meio. De dia a banda faz a passagem de som e as caixas são brinquedo livre.
 *
 * Conta em cima de `noiteNaHora` adiantada de `ANTECIPA_SHOW` (fração do dia): com o dia de
 * 20 min, abre perto de 0,734 (uns 30 s antes da noite começar a cair) e fecha perto de 0,216.
 */
export const ANTECIPA_SHOW = 0.025;
/** O quanto de noite (adiantada) que já vale como "noite de show". */
export const NOITE_DO_SHOW = 0.15;

/** Esta hora (0 a 1) é noite de show? */
export function noiteDeShow(hora: number): boolean {
  return noiteNaHora(normalizarHora(hora + ANTECIPA_SHOW)) > NOITE_DO_SHOW;
}

/**
 * A noite de cada show (decisão do dono, 15 nov 2026: "o show acontece só à noite", e toda noite):
 * o número da noite que começa no fim do dia `dia` (a madrugada ainda é da noite de antes).
 */
export function idDaNoite(dia: number, hora: number): number {
  return normalizarHora(hora) >= 0.5 ? dia : dia - 1;
}

/**
 * O show começa sozinho (decisão do dono, 15 nov 2026): de noite, com alguém no festival, as
 * caixas acendem uma a uma e a banda toca, uma vez por noite. Tocar nas caixas antes acende
 * mais cedo (e é assim que a f3 conta). As esperas (s):
 * - `NOITE_ANTES`: a noite de show já aberta há tanto tempo (a noite chegando com a criança lá);
 * - `PERTO_ANTES`: alguém no festival há tanto tempo (quem chega de noite vê começar logo);
 * - `PERTO_ANTES_F3`: com a f3 aberta para alguém perto, a criança tem tempo de acender as caixas
 *   ela mesma (sem pressa nenhuma: se não der, elas acendem sozinhas e a f3 fecha igual no show);
 * - `ACENDE_SOZINHA`: entre uma caixa e a outra (e da última até a contagem das baquetas).
 */
export const NOITE_ANTES = 20;
export const PERTO_ANTES = 6;
export const PERTO_ANTES_F3 = 35;
export const ACENDE_SOZINHA = 1.2;

/**
 * Onde a criança alcança as caixas e o palco: no palco, no pé dele e na plateia inteira (a
 * criança na grade vê as caixas e toca nelas de lá; a caixa do fundo fica a uns 20 blocos).
 */
export function alcancaOPalco(
  palco: { x0: number; z0: number; x1: number; z1: number },
  x: number,
  z: number,
): boolean {
  return x >= palco.x0 - 8 && x <= palco.x1 + 9 && z >= palco.z0 - 16 && z <= palco.z1 + 4;
}

/**
 * A missão espera a noite (a f3 da Vila Neon, de dia, sem show tocando): o quadro e o guia
 * mostram a lua e a trilha não chama; quando a noite chega, a trilha acende sozinha.
 */
export function missaoEsperaNoite(
  mundo: string | null | undefined,
  id: string,
  hora: number,
  showTocando = false,
): boolean {
  return mundo === 'vila-neon' && id === 'f3' && !showTocando && !noiteDeShow(hora);
}
