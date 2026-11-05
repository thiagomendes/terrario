import { obterBloco } from '../world/blocks';

export const INTERVALO_PASSO_ANDANDO = 0.5;
export const INTERVALO_PASSO_CORRENDO = 0.33;
export const VELOCIDADE_MINIMA_PASSO = 0.1;
export const TEMPO_MINIMO_NO_AR = 0.1;
const PROFUNDIDADE_BUSCA = 8;

export type EventoMovimento = 'passo' | 'pulo' | 'aterrissagem';

export interface EstadoMovimento {
  noChao: boolean;
  velocidadeHoriz: number;
  correndo: boolean;
}

export interface DetectorMovimento {
  atualizar(dt: number, estado: EstadoMovimento): EventoMovimento[];
}

export function criarDetectorMovimento(): DetectorMovimento {
  let estavaNoChao = true;
  let tempoNoAr = 0;
  let relogioPasso = 0;

  return {
    atualizar(dt, estado) {
      const eventos: EventoMovimento[] = [];
      if (estavaNoChao && !estado.noChao) {
        eventos.push('pulo');
        tempoNoAr = 0;
      }
      if (!estado.noChao) {
        tempoNoAr += dt;
      } else if (!estavaNoChao && tempoNoAr >= TEMPO_MINIMO_NO_AR) {
        eventos.push('aterrissagem');
      }
      estavaNoChao = estado.noChao;

      const andando = estado.noChao && estado.velocidadeHoriz > VELOCIDADE_MINIMA_PASSO;
      if (!andando) {
        relogioPasso = 0;
        return eventos;
      }
      const intervalo = estado.correndo ? INTERVALO_PASSO_CORRENDO : INTERVALO_PASSO_ANDANDO;
      relogioPasso += dt;
      if (relogioPasso >= intervalo) {
        relogioPasso -= intervalo;
        eventos.push('passo');
      }
      return eventos;
    },
  };
}

export function blocoSobPes(
  pes: { x: number; y: number; z: number },
  blocoEm: (x: number, y: number, z: number) => number,
): number {
  const x = Math.floor(pes.x);
  const z = Math.floor(pes.z);
  let y = Math.ceil(pes.y - 1e-6) - 1;
  for (let i = 0; i < PROFUNDIDADE_BUSCA && y >= 0; i++, y--) {
    const id = blocoEm(x, y, z);
    if (obterBloco(id)?.solido) return id;
  }
  return 0;
}
