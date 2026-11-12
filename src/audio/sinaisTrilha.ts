import type { BiomaTrilha, EstadoTrilha, HoraTrilha } from './trilha';

/**
 * Os sinais do mundo que a trilha segue (spec 019, T03), tirados do estado de verdade do jogo
 * e segurados um pouco antes de valer: a música nunca troca por um tropeço (parar meio
 * segundo, passar debaixo de uma árvore, uma nuvem que pinga e para).
 *
 * Correções em relação à trilha de hoje (inventário, achados 9 e 10):
 * - **Hora em todo bioma.** A hora (dia, entardecer, noite) e o bioma são sinais separados; o
 *   bioma vira uma cor sobre a hora, e a noite no deserto, na taiga e no pântano é noite.
 * - **Caverna de verdade.** Antes, bastava um bloco opaco acima e y < 55: dentro de casa, na
 *   varanda ou debaixo de um pé de árvore tocava caverna. Agora é preciso estar coberto **e**
 *   abaixo do chão daquela coluna, pela altura do terreno gerado (`alturaTerreno`, que já
 *   conta os povoados aplainados): pelo menos `FUNDO_CAVERNA` blocos abaixo da superfície. A
 *   casa no chão, o telhado e a copa ficam de fora; o túnel dentro da montanha (acima de y 55)
 *   passa a contar.
 */

/** Quantos blocos abaixo da superfície da coluna o olho precisa estar para ser caverna. */
export const FUNDO_CAVERNA = 2;
/** Amigo a menos de tantos blocos conta como "amigo perto". */
export const RAIO_AMIGOS = 16;
/** Velocidade (blocos/s) a partir da qual a criança está andando. */
export const VEL_ANDANDO = 1.2;

export interface EntradaSinais {
  /** 0 de dia, 1 de noite (da atmosfera). */
  noite: number;
  /** Força do crepúsculo (0 a 1). */
  crepusculo: number;
  /** Hora do dia, 0 a 1 (0,5 é meio-dia). */
  hora: number;
  /** Intensidade da chuva (0 a 1). */
  chuva: number;
  /** O tema tem chuva de verdade (a "chuva" da Lua é poeira: sem pingos na trilha). */
  chuvaMolha: boolean;
  /** Há bloco opaco acima do olho. */
  coberto: boolean;
  /** y do bloco do olho. */
  y: number;
  /** y da superfície do terreno naquela coluna. */
  superficie: number;
  /** A regra de hoje: sobrevivência e um bicho da noite perseguindo perto. */
  perigo: boolean;
  velocidade: number;
  correndo: boolean;
  amigosPerto: boolean;
  lavouraPerto: boolean;
  bioma: string;
}

export function horaDaTrilha(noite: number, crepusculo: number, hora: number): HoraTrilha {
  if (noite > 0.6) return 'noite';
  // o entardecer é o crepúsculo da tarde; o da manhã já é dia
  if (crepusculo > 0.3 && hora > 0.5) return 'tarde';
  return 'dia';
}

export function cavernaDeVerdade(coberto: boolean, y: number, superficie: number): boolean {
  return coberto && y < superficie - FUNDO_CAVERNA;
}

export function biomaDaTrilha(b: string): BiomaTrilha {
  return b === 'deserto' || b === 'taiga' || b === 'pantano' ? b : 'normal';
}

/** Chuva em degraus: garoa (0,5) ou chuva (1); abaixo de 0,15 não conta. */
export function chuvaDaTrilha(i: number): number {
  if (!(i > 0.15)) return 0;
  return i < 0.55 ? 0.5 : 1;
}

/** O valor bruto de cada sinal, sem segurar. */
export function estadoBruto(e: EntradaSinais): EstadoTrilha {
  return {
    hora: horaDaTrilha(e.noite, e.crepusculo, e.hora),
    chuva: e.chuvaMolha ? chuvaDaTrilha(e.chuva) : 0,
    caverna: cavernaDeVerdade(e.coberto, e.y, e.superficie),
    perigo: e.perigo,
    amigos: e.amigosPerto,
    lavoura: e.lavouraPerto,
    mov: e.velocidade < VEL_ANDANDO ? 0 : e.correndo ? 2 : 1,
    bioma: biomaDaTrilha(e.bioma),
  };
}

type Chave = keyof EstadoTrilha;

/** Quanto cada sinal precisa durar para valer (s): [para ligar/subir, para desligar/descer]. */
const SEGURAR: Record<Chave, readonly [number, number]> = {
  hora: [2, 2],
  chuva: [3, 4],
  caverna: [1.5, 1.5],
  // o perigo entra na hora e demora a sair (o bicho pode voltar)
  perigo: [0, 4],
  amigos: [2, 4],
  lavoura: [2, 3],
  mov: [0.6, 1.5],
  bioma: [3, 3],
};

const nivel = (v: EstadoTrilha[Chave]): number =>
  typeof v === 'boolean' ? (v ? 1 : 0) : typeof v === 'number' ? v : 0;

/** Segura cada sinal até ele durar o bastante; devolve o estado que vale. */
export class SinaisTrilha {
  private atual: EstadoTrilha | null = null;
  private candidato = new Map<Chave, { v: EstadoTrilha[Chave]; t: number }>();

  atualizar(dt: number, entrada: EntradaSinais): EstadoTrilha {
    const bruto = estadoBruto(entrada);
    if (!this.atual) {
      this.atual = bruto;
      return { ...bruto };
    }
    const atual = this.atual as unknown as Record<Chave, EstadoTrilha[Chave]>;
    for (const k of Object.keys(SEGURAR) as Chave[]) {
      const v = bruto[k];
      if (v === atual[k]) {
        this.candidato.delete(k);
        continue;
      }
      const c = this.candidato.get(k);
      const t = c && c.v === v ? c.t + dt : dt;
      this.candidato.set(k, { v, t });
      const [subir, descer] = SEGURAR[k];
      const precisa = nivel(v) > nivel(atual[k]) ? subir : descer;
      if (t >= precisa) {
        atual[k] = v;
        this.candidato.delete(k);
      }
    }
    return { ...this.atual };
  }
}
