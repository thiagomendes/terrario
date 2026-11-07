export const LIMITE_PARTICULAS = 64;
export const VIDA_PARTICULA = 0.6;
export const GRAVIDADE_PARTICULA = -14;
/** Tipos de partícula (spec 012): pecinha de plástico ou confete. */
export const PECINHA = 0;
export const CONFETE = 1;
/** Gotinha de água (respingo ao entrar na água e da chuva). */
export const GOTA = 2;
/** O confete vive mais, cai devagar e plana (arrasto no ar). */
export const VIDA_CONFETE = 1.3;
const GRAVIDADE_CONFETE = -3.2;
const QUEDA_MAXIMA_CONFETE = -1.4;

/** Quanto vive cada tipo de partícula. */
export function vidaDe(tipo: number): number {
  return tipo === CONFETE ? VIDA_CONFETE : VIDA_PARTICULA;
}

export interface ParametrosParticula {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  cor: [number, number, number];
  /** PECINHA (padrão) ou CONFETE. */
  tipo?: number;
}

export interface PoolParticulas {
  readonly capacidade: number;
  /** Emite até caber; devolve quantas foram emitidas. */
  emitir(lista: ParametrosParticula[]): number;
  /** `solido`: se informado, as partículas quicam no chão e não atravessam paredes. */
  atualizar(dt: number, solido?: (x: number, y: number, z: number) => boolean): void;
  vivas(): number;
  /** Posições (x, y, z) das vivas, compactadas no início do buffer. */
  readonly posicoes: Float32Array;
  readonly cores: Float32Array;
  readonly idades: Float32Array;
  readonly tipos: Uint8Array;
  /** Número fixo de cada partícula (0..1): giro e balanço próprios. */
  readonly sementes: Float32Array;
}

export function criarPoolParticulas(capacidade: number = LIMITE_PARTICULAS): PoolParticulas {
  const posicoes = new Float32Array(capacidade * 3);
  const velocidades = new Float32Array(capacidade * 3);
  const cores = new Float32Array(capacidade * 3);
  const idades = new Float32Array(capacidade);
  const tipos = new Uint8Array(capacidade);
  const sementes = new Float32Array(capacidade);
  let vivas = 0;
  let proxima = 0;

  function copiar(de: number, para: number): void {
    for (let k = 0; k < 3; k++) {
      posicoes[para * 3 + k] = posicoes[de * 3 + k];
      velocidades[para * 3 + k] = velocidades[de * 3 + k];
      cores[para * 3 + k] = cores[de * 3 + k];
    }
    idades[para] = idades[de];
    tipos[para] = tipos[de];
    sementes[para] = sementes[de];
  }

  return {
    capacidade,
    posicoes,
    cores,
    idades,
    tipos,
    sementes,
    vivas: () => vivas,
    emitir(lista) {
      let n = 0;
      for (const p of lista) {
        if (vivas >= capacidade) break;
        const i = vivas++;
        posicoes.set([p.x, p.y, p.z], i * 3);
        velocidades.set([p.vx, p.vy, p.vz], i * 3);
        cores.set(p.cor, i * 3);
        idades[i] = 0;
        tipos[i] = p.tipo ?? PECINHA;
        // sequência de Weyl: sementes bem espalhadas e determinísticas
        proxima = (proxima + 0.618034) % 1;
        sementes[i] = proxima;
        n++;
      }
      return n;
    },
    atualizar(dt, solido) {
      let i = 0;
      while (i < vivas) {
        idades[i] += dt;
        const confete = tipos[i] === CONFETE;
        if (idades[i] >= (confete ? VIDA_CONFETE : VIDA_PARTICULA)) {
          vivas--;
          if (i !== vivas) copiar(vivas, i);
          continue;
        }
        if (confete) {
          // plana: cai devagar, com arrasto, e balança de lado
          velocidades[i * 3 + 1] = Math.max(
            QUEDA_MAXIMA_CONFETE,
            velocidades[i * 3 + 1] + GRAVIDADE_CONFETE * dt,
          );
          const arrasto = Math.exp(-dt * 1.8);
          velocidades[i * 3] *= arrasto;
          velocidades[i * 3 + 2] *= arrasto;
        } else velocidades[i * 3 + 1] += GRAVIDADE_PARTICULA * dt;
        // quem nasce dentro do bloco (lascas do golpe) sai livre; colisão só do lado de fora
        const dentro =
          !!solido &&
          solido(
            Math.floor(posicoes[i * 3]),
            Math.floor(posicoes[i * 3 + 1]),
            Math.floor(posicoes[i * 3 + 2]),
          );
        for (let k = 0; k < 3; k++) {
          const antes = posicoes[i * 3 + k];
          const depois = antes + velocidades[i * 3 + k] * dt;
          posicoes[i * 3 + k] = depois;
          if (
            solido &&
            !dentro &&
            solido(
              Math.floor(posicoes[i * 3]),
              Math.floor(posicoes[i * 3 + 1]),
              Math.floor(posicoes[i * 3 + 2]),
            )
          ) {
            // bateu: volta e para nesse eixo; no chão, arrasta um pouco e assenta
            posicoes[i * 3 + k] = antes;
            if (k === 1 && velocidades[i * 3 + 1] < 0) {
              velocidades[i * 3] *= 0.5;
              velocidades[i * 3 + 2] *= 0.5;
            }
            velocidades[i * 3 + k] = 0;
          }
        }
        i++;
      }
    },
  };
}
