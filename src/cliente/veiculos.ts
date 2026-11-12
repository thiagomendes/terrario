/**
 * Os veículos da cidade no cliente (spec 014, T14): os planos que o núcleo manda e o relógio
 * dos veículos. O cliente desenha um pouco atrás do relógio do núcleo (`ATRASO`), então o
 * plano de cada momento já chegou e o carrinho anda liso, igual para todo mundo; a posição é a
 * mesma conta do núcleo (`noPlano` de `src/jogo/veiculos.ts`).
 */
import type { VeiculosQuadro } from '../nucleo/protocolo';
import { noPlano, type PlanoVeiculo } from '../jogo/veiculos';

/** Quanto o desenho fica atrás do relógio do núcleo (s). */
export const ATRASO_VEICULOS = 0.15;
/** Planos guardados por veículo (o desenho atrasado ainda usa os de antes). */
const HISTORICO = 6;

export interface EstadoVeiculoCliente {
  s: number;
  v: number;
  plano: PlanoVeiculo;
}

export type ReplicaVeiculos = ReturnType<typeof criarReplicaVeiculos>;

export function criarReplicaVeiculos() {
  const planos = new Map<number, PlanoVeiculo[]>();
  /** Relógio do núcleo menos o relógio da página (s); null antes do primeiro quadro. */
  let deslocamento: number | null = null;
  let ultimoAgora = 0;
  return {
    /** Um quadro com veículos chegou (`agora`: relógio da página em segundos). */
    receber(v: VeiculosQuadro, agora: number, primeiro = false): void {
      const est = v.t - agora;
      // o quadro que chegou mais cedo dá o melhor relógio; se o núcleo parou (aba escondida,
      // sala dormiu) ou pulou, acerta de uma vez
      if (deslocamento === null || primeiro || Math.abs(est - deslocamento) > 0.6)
        deslocamento = est;
      else if (est > deslocamento) deslocamento = est;
      else deslocamento -= Math.min(deslocamento - est, 0.02 * Math.max(0, agora - ultimoAgora));
      ultimoAgora = agora;
      if (primeiro) planos.clear();
      for (const p of v.p ?? []) {
        let l = planos.get(p.id);
        if (!l) planos.set(p.id, (l = []));
        l.push(p);
        l.sort((a, b) => a.t0 - b.t0);
        if (l.length > HISTORICO) l.splice(0, l.length - HISTORICO);
      }
    },
    /** O tempo do núcleo que o desenho mostra agora. */
    tempo(agora: number): number {
      return deslocamento === null ? 0 : agora + deslocamento - ATRASO_VEICULOS;
    },
    /** Onde o veículo está no tempo t (do núcleo). */
    em(id: number, t: number): EstadoVeiculoCliente | null {
      const l = planos.get(id);
      if (!l || !l.length) return null;
      let p = l[0];
      for (const q of l) if (q.t0 <= t) p = q;
      const e = noPlano(p, t);
      return { s: e.s, v: e.v, plano: p };
    },
    get ids(): number[] {
      return [...planos.keys()];
    },
    get pronto(): boolean {
      return deslocamento !== null && planos.size > 0;
    },
    limpar(): void {
      planos.clear();
      deslocamento = null;
    },
  };
}
