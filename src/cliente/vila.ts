/**
 * Spec 026: o que o cliente sabe da Vila Neon (o último estado do núcleo e o relógio dele). O
 * relógio do núcleo vem no quadro; a tela toca o show no mesmo tempo, com o atraso da rede
 * descontado devagar (nunca dá pulo para trás).
 */
import type { VilaVista } from '../nucleo/vila';

export function criarReplicaVila() {
  let vista: VilaVista | null = null;
  /** Relógio do núcleo menos o relógio local (s). */
  let diferenca: number | null = null;
  return {
    receber(v: VilaVista, agoraLocal: number): void {
      vista = v;
      const d = v.t - agoraLocal;
      // o quadro chega atrasado: a menor diferença é a mais certa; sobe devagar
      if (diferenca === null || d > diferenca + 1 || d < diferenca - 1) diferenca = d;
      else if (d > diferenca) diferenca += (d - diferenca) * 0.1;
      else diferenca = d;
    },
    /** O estado do bairro (null antes do primeiro quadro, ou fora da Vila Neon). */
    get estado(): VilaVista | null {
      return vista;
    },
    /** O relógio do núcleo agora (s). */
    tempo(agoraLocal: number): number {
      return agoraLocal + (diferenca ?? 0);
    },
  };
}
export type ReplicaVila = ReturnType<typeof criarReplicaVila>;
