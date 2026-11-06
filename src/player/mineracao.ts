import { Bloco, REGISTRO_BLOCOS } from '../world/blocks';

/** Segundos de mineração contínua por bloco, à mão (vem do registro). */
export const DUREZA: Readonly<Record<number, number>> = Object.fromEntries(
  REGISTRO_BLOCOS.filter((d) => d.id !== Bloco.AR && d.dureza !== undefined).map((d) => [
    d.id,
    d.dureza as number,
  ]),
);

export const DURACAO_MAXIMA = 1.6;
export const INTERVALO_GOLPE = 0.25;
export const TEMPO_DECAIMENTO = 1;
export const INTERVALO_COLOCAR = 0.15;
export const ESTAGIOS_RACHADURA = 5;

export interface AlvoMineracao {
  x: number;
  y: number;
  z: number;
  /** Id do bloco atualmente nesta posição. */
  bloco: number;
}

export interface DanoBloco {
  bloco: number;
  progresso: number;
}

export interface EstadoMineracao {
  danos: ReadonlyMap<string, DanoBloco>;
  /** Chave do bloco sendo minerado agora, ou null. */
  chaveAtual: string | null;
  /** Tempo acumulado desde o último golpe. */
  tempoGolpe: number;
}

export interface EntradaMineracao {
  dt: number;
  segurando: boolean;
  alvo: AlvoMineracao | null;
  /** Multiplicador de velocidade (ferramenta); padrão 1. */
  velocidade?: number;
}

export interface ResultadoMineracao {
  estado: EstadoMineracao;
  quebrou: boolean;
  golpe: boolean;
  /** Progresso (0 a 1) do alvo após o passo. */
  progresso: number;
}

export function chaveBloco(x: number, y: number, z: number): string {
  return `${x},${y},${z}`;
}

export function criarEstadoMineracao(): EstadoMineracao {
  return { danos: new Map(), chaveAtual: null, tempoGolpe: 0 };
}

export function mineravel(id: number): boolean {
  const def = REGISTRO_BLOCOS[id];
  // tochas e portas abertas não são sólidas, mas se quebram (só líquido e ar não)
  return def !== undefined && !def.liquido && id !== 0 && DUREZA[id] !== undefined;
}

export function atualizarMineracao(
  estado: EstadoMineracao,
  entrada: EntradaMineracao,
): ResultadoMineracao {
  const dt = Math.max(0, entrada.dt);
  const alvo = entrada.alvo;
  const chaveAlvo = alvo && mineravel(alvo.bloco) ? chaveBloco(alvo.x, alvo.y, alvo.z) : null;
  const ativo = entrada.segurando && chaveAlvo !== null;
  const danos = new Map<string, DanoBloco>();

  for (const [chave, dano] of estado.danos) {
    if (ativo && chave === chaveAlvo) {
      if (alvo!.bloco === dano.bloco) danos.set(chave, dano);
      continue;
    }
    // Bloco do alvo mudou: dano descartado.
    if (chave === chaveAlvo && alvo!.bloco !== dano.bloco) continue;
    const restante = dano.progresso - dt / TEMPO_DECAIMENTO;
    if (restante > 0) danos.set(chave, { bloco: dano.bloco, progresso: restante });
  }

  if (!ativo || !alvo || chaveAlvo === null) {
    return {
      estado: { danos, chaveAtual: null, tempoGolpe: 0 },
      quebrou: false,
      golpe: false,
      progresso: 0,
    };
  }

  const anterior = estado.danos.get(chaveAlvo);
  const base = anterior && anterior.bloco === alvo.bloco ? anterior.progresso : 0;
  const dureza = DUREZA[alvo.bloco] / Math.max(0.05, entrada.velocidade ?? 1);
  const progresso = dureza <= 0 ? 1 : Math.min(1, base + dt / dureza);
  const continuando = estado.chaveAtual === chaveAlvo;
  let tempoGolpe = (continuando ? estado.tempoGolpe : 0) + dt;
  let golpe = false;
  if (dureza <= 0 || tempoGolpe >= INTERVALO_GOLPE) {
    golpe = true;
    tempoGolpe = dureza <= 0 ? 0 : tempoGolpe - INTERVALO_GOLPE;
  }

  if (progresso >= 1) {
    danos.delete(chaveAlvo);
    return {
      estado: { danos, chaveAtual: null, tempoGolpe: 0 },
      quebrou: true,
      golpe,
      progresso: 1,
    };
  }
  if (progresso > 0) danos.set(chaveAlvo, { bloco: alvo.bloco, progresso });
  return {
    estado: { danos, chaveAtual: chaveAlvo, tempoGolpe },
    quebrou: false,
    golpe,
    progresso,
  };
}

/** 0 sem dano; 1 a 5 conforme o progresso, de forma monotônica. */
export function estagioRachadura(progresso: number): number {
  if (!(progresso > 0)) return 0;
  const p = Math.min(1, progresso);
  return Math.min(ESTAGIOS_RACHADURA, Math.floor(p * ESTAGIOS_RACHADURA) + 1);
}

export function colocacaoPermitida(agora: number, ultima: number | null): boolean {
  return ultima === null || agora - ultima >= INTERVALO_COLOCAR - 1e-9;
}
