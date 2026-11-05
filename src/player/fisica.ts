export const VEL_ANDAR = 4.3;
export const VEL_CORRER = 7;
export const GRAVIDADE = 25;
export const VEL_PULO = 8.5;
export const VEL_QUEDA_MAX = 40;
export const MEIA_LARGURA = 0.3;
export const ALTURA_JOGADOR = 1.8;
export const ALTURA_OLHOS = 1.62;
const FOLGA = 1e-4;

export type Solido = (x: number, y: number, z: number) => boolean;

export interface EstadoJogador {
  x: number;
  y: number;
  z: number;
  vy: number;
  noChao: boolean;
}

export interface ComandoMovimento {
  frente: number;
  direita: number;
  pular: boolean;
  correr: boolean;
  yaw: number;
}

export function criarJogador(x: number, y: number, z: number): EstadoJogador {
  return { x, y, z, vy: 0, noChao: false };
}

/** Altura (pé) de quem nasce sobre a superfície: topo do terreno + 1. */
export function posicaoInicial(
  x: number,
  z: number,
  alturaTerreno: (wx: number, wz: number) => number,
): EstadoJogador {
  const h = alturaTerreno(Math.floor(x), Math.floor(z));
  return criarJogador(x, h + 1, z);
}

function colide(s: Solido, x: number, y: number, z: number): boolean {
  const x0 = Math.floor(x - MEIA_LARGURA);
  const x1 = Math.floor(x + MEIA_LARGURA);
  const z0 = Math.floor(z - MEIA_LARGURA);
  const z1 = Math.floor(z + MEIA_LARGURA);
  const y0 = Math.floor(y);
  const y1 = Math.floor(y + ALTURA_JOGADOR);
  for (let iy = y0; iy <= y1; iy++) {
    for (let iz = z0; iz <= z1; iz++) {
      for (let ix = x0; ix <= x1; ix++) {
        if (s(ix, iy, iz)) return true;
      }
    }
  }
  return false;
}

function moverHorizontal(e: EstadoJogador, eixo: 'x' | 'z', d: number, s: Solido): void {
  if (d === 0) return;
  const alvo = e[eixo] + d;
  const nx = eixo === 'x' ? alvo : e.x;
  const nz = eixo === 'z' ? alvo : e.z;
  if (!colide(s, nx, e.y, nz)) {
    e[eixo] = alvo;
    return;
  }
  const borda =
    d > 0
      ? Math.floor(alvo + MEIA_LARGURA) - MEIA_LARGURA - FOLGA
      : Math.floor(alvo - MEIA_LARGURA) + 1 + MEIA_LARGURA + FOLGA;
  e[eixo] = borda;
}

export function passoFisica(e: EstadoJogador, cmd: ComandoMovimento, dt: number, s: Solido): void {
  const vel = cmd.correr ? VEL_CORRER : VEL_ANDAR;
  let mx = cmd.direita * Math.cos(cmd.yaw) + cmd.frente * Math.sin(cmd.yaw);
  let mz = -cmd.direita * Math.sin(cmd.yaw) + cmd.frente * Math.cos(cmd.yaw);
  const norma = Math.hypot(mx, mz);
  if (norma > 1) {
    mx /= norma;
    mz /= norma;
  }
  moverHorizontal(e, 'x', mx * vel * dt, s);
  moverHorizontal(e, 'z', mz * vel * dt, s);

  if (cmd.pular && e.noChao) {
    e.vy = VEL_PULO;
    e.noChao = false;
  }
  e.vy = Math.max(e.vy - GRAVIDADE * dt, -VEL_QUEDA_MAX);
  const dy = e.vy * dt;
  const alvo = e.y + dy;
  if (!colide(s, e.x, alvo, e.z)) {
    e.y = alvo;
    e.noChao = false;
    return;
  }
  if (dy < 0) {
    e.y = Math.floor(alvo) + 1;
    e.noChao = true;
  } else {
    e.y = Math.floor(alvo + ALTURA_JOGADOR) - ALTURA_JOGADOR - FOLGA;
    e.noChao = false;
  }
  e.vy = 0;
}
