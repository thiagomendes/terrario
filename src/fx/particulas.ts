export const LIMITE_PARTICULAS = 64;
export const VIDA_PARTICULA = 0.6;
export const GRAVIDADE_PARTICULA = -14;

export interface ParametrosParticula {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  cor: [number, number, number];
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
}

export function criarPoolParticulas(capacidade: number = LIMITE_PARTICULAS): PoolParticulas {
  const posicoes = new Float32Array(capacidade * 3);
  const velocidades = new Float32Array(capacidade * 3);
  const cores = new Float32Array(capacidade * 3);
  const idades = new Float32Array(capacidade);
  let vivas = 0;

  function copiar(de: number, para: number): void {
    for (let k = 0; k < 3; k++) {
      posicoes[para * 3 + k] = posicoes[de * 3 + k];
      velocidades[para * 3 + k] = velocidades[de * 3 + k];
      cores[para * 3 + k] = cores[de * 3 + k];
    }
    idades[para] = idades[de];
  }

  return {
    capacidade,
    posicoes,
    cores,
    idades,
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
        n++;
      }
      return n;
    },
    atualizar(dt, solido) {
      let i = 0;
      while (i < vivas) {
        idades[i] += dt;
        if (idades[i] >= VIDA_PARTICULA) {
          vivas--;
          if (i !== vivas) copiar(vivas, i);
          continue;
        }
        velocidades[i * 3 + 1] += GRAVIDADE_PARTICULA * dt;
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
