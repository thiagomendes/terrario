import { tocarSom, desenharVoz, tocarNotas, type NotaCurta } from './sons';
import { ESCALA_OBRA, SINTETIZADOS_OBRA } from './somObra';
import type { MotorAudio } from './motor';
import { povoadoDoTema, tema } from '../temas/ativo';
import type { PioCriatura } from '../temas/tipos';
import type { TipoCriatura } from '../jogo/criaturas';
import {
  TAXA_VOZES,
  ganhoExtra,
  ganhoVozGravada,
  inicioSemAtraso,
  type ClipIndice,
  type GrupoNivelVoz,
  type IndiceSons,
  type MomentoBicho,
  type MomentoMorador,
} from './vozesGravadas';

/**
 * Régua de volume das vozes e dos golpes (spec 019, T05; só para os testes de tela, carregada
 * à parte). No tema ativo, renderiza offline cada som de hoje (a voz sintetizada `PioCriatura`
 * e as amostras de material do golpe e da derrota) e cada fatia gravada do pacote, e mede o
 * volume percebido de cada um: RMS com o filtro K (o da medida de loudness: passa-alta em 38 Hz
 * e +4 dB acima de 1,7 kHz), só nas janelas de 50 ms a menos de 20 dB da mais forte (o tempo em
 * que o som soa, sem o silêncio em volta). Os dois lados vão para o mesmo grupo do motor, então
 * o ganho do grupo não entra na conta.
 *
 * Por grupo (bichos, moradores, baque e derrota), compara a média de hoje com a média gravada,
 * já com o ganho do tema (`NIVEL_VOZES`). `cru` mede com ganho 1 (para recalcular a tabela).
 */

export interface LinhaReguaVozes {
  /** O grupo das vozes, ou `obra.<chave>` e `ambiente.<chave>` (spec 014, os sons extras). */
  grupo: GrupoNivelVoz | string;
  /** Quantos sons de hoje e gravados entraram na média. */
  nHoje: number;
  nGravada: number;
  hojeDb: number;
  /** A gravada com ganho 1. */
  cruaDb: number;
  /** O ganho do tema no grupo (dB; 0 se `cru`). */
  ganhoDb: number;
  gravadaDb: number;
  /** gravada − hoje (dB). */
  diferencaDb: number;
  /** A fatia gravada mais forte, já com o ganho, menos a média de hoje (dB). */
  maisAltaDb: number;
}

export interface ResultadoReguaVozes {
  tema: string;
  linhas: LinhaReguaVozes[];
}

const TAXA = 44100;
const JANELA_S = 0.05;
const PORTA_DB = 20;
const SLOTS: TipoCriatura[] = ['cervo', 'coelho', 'peixe', 'espectro', 'raposa'];
const MOMENTOS_BICHO: MomentoBicho[] = ['chamado', 'susto', 'contente', 'ai'];
const MOMENTOS_MORADOR: MomentoMorador[] = ['cumprimento', 'contente', 'obrigado', 'surpresa'];

/** Volume percebido (dB) do que soa no buffer: RMS das janelas a menos de 20 dB da mais forte. */
export function nivelPercebidoDb(d: Float32Array, taxa: number): number {
  const n = Math.max(1, Math.round(JANELA_S * taxa));
  const energias: number[] = [];
  for (let i = 0; i < d.length; i += n) {
    let s = 0;
    const fim = Math.min(d.length, i + n);
    for (let j = i; j < fim; j++) s += d[j] * d[j];
    energias.push(s / Math.max(1, fim - i));
  }
  const max = Math.max(...energias, 0);
  if (max <= 0) return -Infinity;
  const porta = max * Math.pow(10, -PORTA_DB / 10);
  const dentro = energias.filter((e) => e >= porta);
  const media = dentro.reduce((a, b) => a + b, 0) / dentro.length;
  return 10 * Math.log10(media);
}

/** Renderiza `montar` num contexto offline com o filtro K na saída e mede. */
async function medir(
  segundos: number,
  montar: (oc: OfflineAudioContext, destino: AudioNode) => void,
): Promise<number> {
  const oc = new OfflineAudioContext(1, Math.ceil(TAXA * segundos), TAXA);
  const pa = oc.createBiquadFilter();
  pa.type = 'highpass';
  pa.frequency.value = 38;
  pa.Q.value = 0.5;
  const pr = oc.createBiquadFilter();
  pr.type = 'highshelf';
  pr.frequency.value = 1681;
  pr.gain.value = 4;
  pr.connect(pa);
  pa.connect(oc.destination);
  montar(oc, pr);
  const b = await oc.startRendering();
  return nivelPercebidoDb(b.getChannelData(0), TAXA);
}

function motorFalso(oc: OfflineAudioContext, destino: AudioNode): MotorAudio {
  return {
    estado: 'ativo',
    mudo: false,
    contexto: oc,
    tocar: (d: (c: unknown, destino: unknown) => unknown) => {
      d(oc, destino);
      return true;
    },
  } as unknown as MotorAudio;
}

const medirPio = (pio: PioCriatura) =>
  medir(Math.max(1, pio.repeticoes) * (pio.dur + pio.intervalo) + 0.4, (oc, dest) =>
    desenharVoz(pio, 1, 0.5)(oc as never, dest as never),
  );

async function medirAmostra(evento: 'golpe' | 'quebra', grupo: 'terra' | 'folhagem') {
  // as 4 versões da amostra de hoje (o variador troca a cada toque)
  const r: number[] = [];
  for (let i = 0; i < 4; i++)
    r.push(await medir(1, (oc, dest) => void tocarSom(motorFalso(oc, dest), evento, grupo)));
  return r;
}

async function decodificar(bytes: ArrayBuffer): Promise<AudioBuffer> {
  const oc = new OfflineAudioContext(1, 1, TAXA_VOZES);
  return oc.decodeAudioData(bytes);
}

async function medirClip(pacote: ArrayBuffer, clip: ClipIndice): Promise<number> {
  const b = await decodificar(pacote.slice(clip.o[0], clip.o[0] + clip.o[1]));
  const ini = inicioSemAtraso(b.duration, clip.s);
  return medir(b.duration - ini + 0.2, (oc, dest) => {
    const s = oc.createBufferSource();
    s.buffer = b;
    s.connect(dest);
    s.start(0, ini);
  });
}

const media = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
const r2 = (x: number) => Math.round(x * 100) / 100;

export async function medirReguaVozes(
  temaId: string,
  base = '/',
  cru = false,
): Promise<ResultadoReguaVozes> {
  const baixar = async (u: string) => {
    const r = await fetch(`${base}${u}`);
    if (!r.ok) throw new Error(`${u}: HTTP ${r.status}`);
    return r;
  };
  const indice = (await (await baixar('sons/indice.json')).json()) as IndiceSons;
  const pTema = await (await baixar(`sons/pacotes/${temaId}-vozes.mp3`)).arrayBuffer();
  const pComum = await (await baixar('sons/pacotes/comum-vozes.mp3')).arrayBuffer();
  const vozes = indice.temas[temaId]?.vozes;
  if (!vozes) throw new Error('tema sem vozes no índice');
  const t = tema();
  const pov = povoadoDoTema().vozes;

  const hoje: Record<GrupoNivelVoz, number[]> = {
    bichos: [],
    moradores: [],
    baque: [],
    derrota: [],
  };
  const grav: Record<GrupoNivelVoz, number[]> = {
    bichos: [],
    moradores: [],
    baque: [],
    derrota: [],
  };
  const baques = new Set<string>();
  const derrotas = new Set<string>();
  for (const slot of SLOTS) {
    const c = vozes.criaturas.find((x) => x.slot === slot);
    if (!c) continue;
    baques.add(c.baque);
    derrotas.add(c.derrota);
    for (const m of MOMENTOS_BICHO) {
      const pio = t.vozes[slot]?.[m === 'ai' ? 'susto' : m];
      if (pio) hoje.bichos.push(await medirPio(pio));
      for (const clip of c.momentos[m] ?? []) grav.bichos.push(await medirClip(pTema, clip));
    }
  }
  for (const m of MOMENTOS_MORADOR) {
    const pio = m === 'cumprimento' ? pov.contente : m === 'surpresa' ? pov.susto : pov[m];
    if (pio) hoje.moradores.push(await medirPio(pio));
    for (const g of ['feminino', 'masculino'] as const)
      for (const clip of vozes.moradores[g]?.[m] ?? [])
        grav.moradores.push(await medirClip(pTema, clip));
  }
  hoje.baque.push(...(await medirAmostra('golpe', 'terra')));
  hoje.derrota.push(...(await medirAmostra('quebra', 'folhagem')));
  for (const k of baques)
    for (const clip of indice.comum.baque[k] ?? []) grav.baque.push(await medirClip(pComum, clip));
  for (const k of derrotas)
    for (const clip of indice.comum.derrota[k] ?? [])
      grav.derrota.push(await medirClip(pComum, clip));

  // spec 014 (T09): os sons extras gravados (canteiro e rua) contra os de antes
  const extras: { grupo: string; hoje: number[]; grav: number[]; ganhoDb: number }[] = [];
  const doTema = indice.temas[temaId];
  for (const [chave, clips] of Object.entries(doTema?.obra ?? {})) {
    const sint = SINTETIZADOS_OBRA[chave];
    if (!sint) continue;
    const hj: number[] = [];
    const n = chave === 'plim' ? ESCALA_OBRA.length : 1;
    for (let i = 0; i < n; i++)
      hj.push(await medir(3.5, (oc, dest) => void sint(motorFalso(oc, dest), i)));
    const gv: number[] = [];
    for (const clip of clips) gv.push(await medirClip(pTema, clip));
    extras.push({
      grupo: `obra.${chave}`,
      hoje: hj,
      grav: gv,
      ganhoDb: ganhoExtra(temaId, 'obra', chave),
    });
  }
  for (const [chave, clips] of Object.entries(doTema?.ambiente ?? {})) {
    const notas = AMBIENTE_HOJE[chave];
    if (!notas) continue;
    const hj = [await medir(2, (oc, dest) => void tocarNotas(motorFalso(oc, dest), notas, 0.4))];
    const gv: number[] = [];
    for (const clip of clips) gv.push(await medirClip(pTema, clip));
    extras.push({
      grupo: `ambiente.${chave}`,
      hoje: hj,
      grav: gv,
      ganhoDb: ganhoExtra(temaId, 'ambiente', chave),
    });
  }

  const linhas: LinhaReguaVozes[] = (['bichos', 'moradores', 'baque', 'derrota'] as const).map(
    (grupo) => {
      const h = media(hoje[grupo]);
      const c = media(grav[grupo]);
      const ganhoDb = cru ? 0 : 20 * Math.log10(ganhoVozGravada(temaId, grupo));
      return {
        grupo,
        nHoje: hoje[grupo].length,
        nGravada: grav[grupo].length,
        hojeDb: r2(h),
        cruaDb: r2(c),
        ganhoDb: r2(ganhoDb),
        gravadaDb: r2(c + ganhoDb),
        diferencaDb: r2(c + ganhoDb - h),
        maisAltaDb: r2(Math.max(...grav[grupo]) + ganhoDb - h),
      };
    },
  );
  for (const x of extras) {
    const h = media(x.hoje);
    const c = media(x.grav);
    const ganhoDb = cru ? 0 : 20 * Math.log10(x.ganhoDb);
    linhas.push({
      grupo: x.grupo,
      nHoje: x.hoje.length,
      nGravada: x.grav.length,
      hojeDb: r2(h),
      cruaDb: r2(c),
      ganhoDb: r2(ganhoDb),
      gravadaDb: r2(c + ganhoDb),
      diferencaDb: r2(c + ganhoDb - h),
      maisAltaDb: r2(Math.max(...x.grav) + ganhoDb - h),
    });
  }
  return { tema: temaId, linhas };
}

/**
 * O ambiente de hoje para comparar com o gravado da rua (spec 014): o passarinho e o grilo
 * sintetizados de `iniciarAmbiente` e a buzininha de reserva, com o barramento da natureza
 * (0,8) e o mestre do ambiente (0,5) da cadeia de lá.
 */
const AMBIENTE_HOJE: Record<string, NotaCurta[]> = {
  pardal: [0, 0.14, 0.27].map((t, i) => ({
    t,
    f: i % 2 ? 3600 : 2600,
    f1: i % 2 ? 2700 : 3500,
    pico: 0.11,
    queda: 0.07,
  })),
  grilo: [0, 0.055, 0.11, 0.165].map((t) => ({ t, f: 4500, pico: 0.035, queda: 0.03 })),
  buzininha: [
    { t: 0, f: 330, f1: 322, tipo: 'square', pico: 0.008, queda: 0.12 },
    { t: 0.18, f: 392, f1: 384, tipo: 'square', pico: 0.008, queda: 0.16 },
  ],
};
