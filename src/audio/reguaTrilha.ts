import { GANHOS_PADRAO, type MotorAudio } from './motor';
import { GANHO_MAXIMO_AMBIENTE, iniciarAmbiente } from './sons';
import {
  CarregadorTrilha,
  ESTADO_TRILHA_INICIAL,
  GANHO_TRILHA_GRAVADA,
  TrilhaGravada,
  alvoMix,
  clipsDaMistura,
  contextoNivel,
  criarDecodificador,
  nivelTrilha,
  type ContextoNivel,
  type EstadoTrilha,
} from './trilha';

/**
 * Régua de volume da trilha (spec 019, T03; só para os testes de tela, carregada à parte).
 *
 * Renderiza offline, no mesmo tema e no padrão de Configurações (Música 60%), as duas trilhas
 * pela mesma cadeia até a saída do grupo "ambiente":
 * - **hoje:** a trilha sintetizada de `iniciarAmbiente` (acordes, sinos e reverb, busMusica
 *   0,6 × Música × mestre 0,5 × grupo 0,7), com a natureza em 0 (sem vento nem bichos);
 * - **gravada:** o motor novo com as camadas do contexto, busMusica 0,6 × Música ×
 *   `GANHO_TRILHA_GRAVADA` × mestre 0,5 × grupo 0,7.
 * E mede o RMS (dBFS) de cada uma, sem os primeiros segundos (a entrada dos acordes).
 *
 * Contextos (T05): dia, tarde, noite, caverna e perigo. A trilha de hoje não tem entardecer:
 * a "tarde" compara com o dia dela. A gravada passa pelo ajuste do tema (`NIVEL_TRILHA`), a não
 * ser com `semNivel` (para medir quanto falta ajustar).
 */

export interface ResultadoRegua {
  tema: string;
  contexto: ContextoNivel;
  segundos: number;
  hojeDb: number;
  gravadaDb: number;
  /** gravada − hoje (dB): ≤ 0 quer dizer que a gravada não ficou mais alta. */
  diferencaDb: number;
  ganho: number;
  /** O ajuste do tema no contexto (dB; 0 com `semNivel`). */
  nivelDb: number;
  volumeMusica: number;
}

const TAXA = 44100;
const DESCARTAR_S = 6;
const PASSO_S = 0.2;
const VOLUME_PADRAO = 0.6;

function rmsDb(b: AudioBuffer, desde: number): number {
  const d = b.getChannelData(0);
  const i0 = Math.min(d.length, Math.floor(desde * b.sampleRate));
  let s = 0;
  for (let i = i0; i < d.length; i++) s += d[i] * d[i];
  const rms = Math.sqrt(s / Math.max(1, d.length - i0));
  return rms > 0 ? 20 * Math.log10(rms) : -Infinity;
}

/** Roda `passo` a cada PASSO_S do relógio do contexto offline (o "setInterval" dele). */
function emPassos(oc: OfflineAudioContext, segundos: number, passo: () => void): void {
  for (let t = PASSO_S; t < segundos; t += PASSO_S) {
    void oc
      .suspend(Math.round(t * 1000) / 1000)
      .then(() => {
        passo();
        return oc.resume();
      })
      .catch(() => undefined);
  }
}

async function hoje(contexto: ContextoNivel, segundos: number): Promise<AudioBuffer> {
  const oc = new OfflineAudioContext(1, Math.ceil(TAXA * segundos), TAXA);
  const grupo = oc.createGain();
  grupo.gain.value = GANHOS_PADRAO.ambiente;
  grupo.connect(oc.destination);
  const motor = {
    estado: 'ativo',
    mudo: false,
    tocar: (d: (c: unknown, destino: unknown) => unknown) => {
      d(oc, grupo);
      return true;
    },
  } as unknown as MotorAudio;
  let agendar: (() => void) | null = null;
  const amb = iniciarAmbiente(motor, {
    setInterval: (f) => {
      agendar = f;
      return 1;
    },
    clearInterval: () => undefined,
  });
  amb.definirVolumes(VOLUME_PADRAO, 0);
  const noite = contexto === 'noite' || contexto === 'perigo';
  amb.definirNoite(noite ? 1 : 0);
  amb.definirHora(noite ? 0.95 : contexto === 'tarde' ? 0.7 : 0.5);
  amb.definirContexto(contexto === 'tarde' ? 'dia' : contexto);
  emPassos(oc, segundos, () => agendar?.());
  (agendar as (() => void) | null)?.();
  const b = await oc.startRendering();
  amb.parar();
  return b;
}

async function gravada(
  temaId: string,
  contexto: ContextoNivel,
  segundos: number,
  semNivel: boolean,
): Promise<AudioBuffer> {
  const car = new CarregadorTrilha({ decodificar: criarDecodificador(() => null) });
  if (!(await car.baixar(temaId)) || !car.tema) throw new Error('sem a trilha do tema');
  const tema = car.tema;
  const temPerigo = tema.clips.some((c) => c.id === 'perigo');
  const rancho = temaId === 'rancho-alegre';
  const e: EstadoTrilha = {
    ...ESTADO_TRILHA_INICIAL,
    hora: contexto === 'perigo' ? 'noite' : contexto === 'caverna' ? 'dia' : contexto,
    caverna: contexto === 'caverna',
    perigo: contexto === 'perigo',
  };
  for (const id of clipsDaMistura(tema, alvoMix(e, temPerigo, rancho).g)) await car.abrir(id);
  const oc = new OfflineAudioContext(1, Math.ceil(TAXA * segundos), TAXA);
  const grupo = oc.createGain();
  grupo.gain.value = GANHOS_PADRAO.ambiente;
  grupo.connect(oc.destination);
  const mestre = oc.createGain();
  mestre.gain.value = GANHO_MAXIMO_AMBIENTE;
  mestre.connect(grupo);
  const bus = oc.createGain();
  bus.gain.value = 0.6 * VOLUME_PADRAO * GANHO_TRILHA_GRAVADA;
  bus.connect(mestre);
  const m = new TrilhaGravada(oc, bus, tema, car, { temPerigo, rancho, entrada: 0.01, semNivel });
  m.iniciar(e, 0.05);
  emPassos(oc, segundos, () => m.agendar());
  const b = await oc.startRendering();
  car.soltarTudo();
  return b;
}

export async function medirRegua(
  temaId: string,
  contexto: ContextoNivel,
  segundos = 40,
  semNivel = false,
): Promise<ResultadoRegua> {
  const h = await hoje(contexto, segundos);
  const g = await gravada(temaId, contexto, segundos, semNivel);
  const hojeDb = rmsDb(h, DESCARTAR_S);
  const gravadaDb = rmsDb(g, DESCARTAR_S);
  const r2 = (x: number) => Math.round(x * 100) / 100;
  return {
    tema: temaId,
    contexto,
    segundos,
    hojeDb: r2(hojeDb),
    gravadaDb: r2(gravadaDb),
    diferencaDb: r2(gravadaDb - hojeDb),
    ganho: GANHO_TRILHA_GRAVADA,
    nivelDb: semNivel ? 0 : r2(20 * Math.log10(nivelDoContexto(temaId, contexto))),
    volumeMusica: VOLUME_PADRAO,
  };
}

function nivelDoContexto(temaId: string, c: ContextoNivel): number {
  const e: EstadoTrilha = {
    ...ESTADO_TRILHA_INICIAL,
    hora: c === 'perigo' ? 'noite' : c === 'caverna' ? 'dia' : c,
    caverna: c === 'caverna',
    perigo: c === 'perigo',
  };
  return nivelTrilha(temaId, contextoNivel(e, temaId !== 'rancho-alegre'));
}
