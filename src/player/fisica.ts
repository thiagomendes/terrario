export const VEL_ANDAR = 4.3;
export const VEL_CORRER = 7;
export const GRAVIDADE = 25;
export const VEL_PULO = 8.5;
/** Velocidade máxima nadando para cima. */
export const VEL_NADO_MAX = 3.4;
/** Impulso ao sair da água pela borda: da superfície (pés ~0,4 abaixo do nível) até o topo do bloco de cima. */
export const VEL_SAIDA_AGUA = 9.2;
export const VEL_QUEDA_MAX = 40;
export const MEIA_LARGURA = 0.3;
export const ALTURA_JOGADOR = 1.8;
export const ALTURA_OLHOS = 1.62;
export const VEL_VOO = 11;
export const VEL_VOO_RAPIDO = 20;
export const VEL_VOO_VERTICAL = 8;
const FOLGA = 1e-4;
const DEGRAU = 0.51;

export type Solido = ((x: number, y: number, z: number) => boolean) & {
  /** Célula com líquido (água). */
  liquido?: (x: number, y: number, z: number) => boolean;
  /** Caixas de blocos parciais (null = cubo inteiro). */
  caixas?: (
    x: number,
    y: number,
    z: number,
  ) => [number, number, number, number, number, number][] | null;
};

export interface EstadoJogador {
  x: number;
  y: number;
  z: number;
  vy: number;
  noChao: boolean;
  /** Voo do modo criativo. */
  voando?: boolean;
  /** Altura em que a queda atual começou (para dano de queda). */
  topoQueda?: number;
  /** Corpo dentro da água (nadando). */
  naAgua?: boolean;
}

export interface ResultadoFisica {
  /** Encostou no chão neste passo vindo do ar. */
  aterrissou: boolean;
  /** Altura da queda ao aterrissar (0 se não caiu). */
  queda: number;
}

export interface ComandoMovimento {
  frente: number;
  direita: number;
  pular: boolean;
  correr: boolean;
  yaw: number;
  /** Descer no voo. */
  descer?: boolean;
  /** Pulo automático: andando contra um degrau de um bloco, pula sozinho. */
  puloAutomatico?: boolean;
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

/** Colisão de uma caixa (meia largura mw, altura alt) com o mundo. */
export function colideCorpo(
  s: Solido,
  x: number,
  y: number,
  z: number,
  mw: number,
  alt: number,
): boolean {
  const x0 = Math.floor(x - mw);
  const x1 = Math.floor(x + mw);
  const z0 = Math.floor(z - mw);
  const z1 = Math.floor(z + mw);
  const y0 = Math.floor(y);
  const y1 = Math.floor(y + alt);
  // a linha de baixo entra só por caixas mais altas que 1 bloco (cerca)
  for (let iy = y0 - 1; iy <= y1; iy++) {
    for (let iz = z0; iz <= z1; iz++) {
      for (let ix = x0; ix <= x1; ix++) {
        if (!s(ix, iy, iz)) continue;
        const cx = s.caixas?.(ix, iy, iz);
        if (iy < y0 && !cx) continue;
        if (!cx) return true;
        for (const c of cx) {
          if (
            x + mw > ix + c[0] &&
            x - mw < ix + c[3] &&
            y + alt > iy + c[1] &&
            y < iy + c[4] &&
            z + mw > iz + c[2] &&
            z - mw < iz + c[5]
          )
            return true;
        }
      }
    }
  }
  return false;
}

function colide(s: Solido, x: number, y: number, z: number): boolean {
  return colideCorpo(s, x, y, z, MEIA_LARGURA, ALTURA_JOGADOR);
}

/** Altura do chão sob o jogador ao cair (considera blocos parciais). */
function topoAbaixo(s: Solido, x: number, alvo: number, z: number, atual: number): number {
  let topo = Math.floor(alvo) + 1;
  const iy = Math.floor(alvo);
  const x0 = Math.floor(x - MEIA_LARGURA);
  const x1 = Math.floor(x + MEIA_LARGURA);
  const z0 = Math.floor(z - MEIA_LARGURA);
  const z1 = Math.floor(z + MEIA_LARGURA);
  let achou = false;
  let maior = -Infinity;
  for (let iz = z0; iz <= z1; iz++)
    for (let ix = x0; ix <= x1; ix++) {
      if (!s(ix, iy, iz)) continue;
      const cx = s.caixas?.(ix, iy, iz);
      if (!cx) {
        maior = Math.max(maior, iy + 1);
        achou = true;
        continue;
      }
      for (const c of cx) {
        if (
          x + MEIA_LARGURA > ix + c[0] &&
          x - MEIA_LARGURA < ix + c[3] &&
          z + MEIA_LARGURA > iz + c[2] &&
          z - MEIA_LARGURA < iz + c[5]
        ) {
          maior = Math.max(maior, iy + c[4]);
          achou = true;
        }
      }
    }
  if (achou && maior <= atual + FOLGA) topo = maior;
  return topo;
}

function moverHorizontal(e: EstadoJogador, eixo: 'x' | 'z', d: number, s: Solido): boolean {
  if (d === 0) return false;
  const alvo = e[eixo] + d;
  const nx = eixo === 'x' ? alvo : e.x;
  const nz = eixo === 'z' ? alvo : e.z;
  if (!colide(s, nx, e.y, nz)) {
    e[eixo] = alvo;
    return false;
  }
  // sobe sozinho degraus de até meio bloco (lajes e escadas)
  if (e.noChao && !colide(s, nx, e.y + DEGRAU, nz) && !colide(s, e.x, e.y + DEGRAU, e.z)) {
    e.y += DEGRAU;
    e[eixo] = alvo;
    return false;
  }
  // encosta na borda da célula (blocos cheios); se a borda não serve (blocos parciais
  // como cerca e porta), procura o maior avanço livre — sem trancos para trás
  const borda =
    d > 0
      ? Math.floor(alvo + MEIA_LARGURA) - MEIA_LARGURA - FOLGA
      : Math.floor(alvo - MEIA_LARGURA) + 1 + MEIA_LARGURA + FOLGA;
  const naDirecao = d > 0 ? borda >= e[eixo] && borda <= alvo : borda <= e[eixo] && borda >= alvo;
  const em = (v: number) => colide(s, eixo === 'x' ? v : e.x, e.y, eixo === 'z' ? v : e.z);
  if (naDirecao && !em(borda)) e[eixo] = borda;
  else {
    const inicio = e[eixo];
    const t = avancoLivre((f) => em(inicio + d * f));
    e[eixo] = inicio + d * t;
  }
  return true;
}

/**
 * Há um degrau de um bloco na direção do movimento? O pé bate logo à frente, mas o
 * corpo cabe um bloco acima, e sobre o jogador também há espaço para o pulo.
 * Paredes de dois blocos e cercas (1,5) não contam.
 */
function temDegrau(e: EstadoJogador, mx: number, mz: number, s: Solido): boolean {
  const n = Math.hypot(mx, mz);
  if (n < 0.1) return false;
  const passo = MEIA_LARGURA + 0.25;
  const ax = e.x + (mx / n) * passo;
  const az = e.z + (mz / n) * passo;
  if (!colide(s, ax, e.y + 0.05, az)) return false;
  const cima = Math.floor(e.y) + 1 + FOLGA;
  return !colide(s, ax, cima, az) && !colide(s, e.x, cima, e.z);
}

/** Maior fração em [0,1] sem colisão (bisseção; 0 é livre por hipótese). */
function avancoLivre(colideEm: (f: number) => boolean): number {
  let livre = 0;
  let bate = 1;
  for (let i = 0; i < 12; i++) {
    const m = (livre + bate) / 2;
    if (colideEm(m)) bate = m;
    else livre = m;
  }
  return livre;
}

export function passoFisica(
  e: EstadoJogador,
  cmd: ComandoMovimento,
  dt: number,
  s: Solido,
): ResultadoFisica {
  const estavaNoChao = e.noChao;
  const agua = !e.voando && !!s.liquido?.(Math.floor(e.x), Math.floor(e.y + 0.4), Math.floor(e.z));
  e.naAgua = agua;
  let vel = e.voando
    ? cmd.correr
      ? VEL_VOO_RAPIDO
      : VEL_VOO
    : cmd.correr
      ? VEL_CORRER
      : VEL_ANDAR;
  if (agua) vel *= 0.55;
  let mx = cmd.direita * Math.cos(cmd.yaw) + cmd.frente * Math.sin(cmd.yaw);
  let mz = -cmd.direita * Math.sin(cmd.yaw) + cmd.frente * Math.cos(cmd.yaw);
  const norma = Math.hypot(mx, mz);
  if (norma > 1) {
    mx /= norma;
    mz /= norma;
  }
  const bateuX = moverHorizontal(e, 'x', mx * vel * dt, s);
  const bateuZ = moverHorizontal(e, 'z', mz * vel * dt, s);
  /** Encostado numa parede tentando andar (para sair da água pela borda). */
  const encostado = (bateuX && Math.abs(mx) > 0.1) || (bateuZ && Math.abs(mz) > 0.1);
  // pulo automático: no chão, empurrando contra um degrau de UM bloco com espaço em
  // cima (o corpo inteiro cabe sobre ele e a cabeça não bate), pula sozinho
  const degrauAFrente =
    !!cmd.puloAutomatico && !e.voando && !agua && e.noChao && encostado && temDegrau(e, mx, mz, s);

  if (e.voando) {
    const sobe = (cmd.pular ? 1 : 0) - (cmd.descer ? 1 : 0);
    e.vy = sobe * VEL_VOO_VERTICAL;
    e.topoQueda = undefined;
  } else if (agua) {
    // empuxo: afunda devagar; espaço nada para cima
    if (cmd.pular && encostado && e.vy < VEL_SAIDA_AGUA) {
      // na borda: impulso para subir no bloco de cima, como um pulo
      e.vy = VEL_SAIDA_AGUA;
    } else if (e.vy > VEL_NADO_MAX) {
      // impulso em andamento: a gravidade freia em vez do limite de nado
      e.vy -= GRAVIDADE * dt;
    } else {
      e.vy = cmd.pular ? Math.min(e.vy + 22 * dt, VEL_NADO_MAX) : Math.max(e.vy - 7 * dt, -2.2);
    }
    e.topoQueda = undefined;
  } else {
    if ((cmd.pular || degrauAFrente) && e.noChao) {
      e.vy = VEL_PULO;
      e.noChao = false;
    }
    e.vy = Math.max(e.vy - GRAVIDADE * dt, -VEL_QUEDA_MAX);
  }
  const dy = e.vy * dt;
  // passos verticais curtos: com FPS baixo a queda não atravessa nem entra no bloco
  let alvo = e.y;
  let restante = dy;
  let bateu = false;
  while (restante !== 0) {
    const passo = Math.max(-0.45, Math.min(0.45, restante));
    restante -= passo;
    if (Math.abs(restante) < 1e-9) restante = 0;
    alvo = e.y + passo;
    if (colide(s, e.x, alvo, e.z)) {
      bateu = true;
      break;
    }
    e.y = alvo;
  }
  if (!bateu) {
    e.noChao = false;
    if (!e.voando && !agua) e.topoQueda = Math.max(e.topoQueda ?? e.y, e.y);
    return { aterrissou: false, queda: 0 };
  }
  let resultado: ResultadoFisica = { aterrissou: false, queda: 0 };
  if (dy < 0) {
    const inicio = e.y;
    const topo = topoAbaixo(s, e.x, alvo, e.z, e.y);
    e.y =
      topo <= inicio + FOLGA && !colide(s, e.x, topo, e.z)
        ? topo
        : inicio +
          (alvo - inicio) * avancoLivre((f) => colide(s, e.x, inicio + (alvo - inicio) * f, e.z));
    e.noChao = true;
    if (!estavaNoChao) {
      resultado = { aterrissou: true, queda: Math.max(0, (e.topoQueda ?? e.y) - e.y) };
    }
    e.topoQueda = undefined;
    // pousar no chão encerra o voo
    if (e.voando && cmd.descer) e.voando = false;
  } else {
    const inicio = e.y;
    const teto = Math.floor(alvo + ALTURA_JOGADOR) - ALTURA_JOGADOR - FOLGA;
    e.y =
      teto >= inicio && !colide(s, e.x, teto, e.z)
        ? teto
        : inicio +
          (alvo - inicio) * avancoLivre((f) => colide(s, e.x, inicio + (alvo - inicio) * f, e.z));
    e.noChao = false;
  }
  e.vy = 0;
  return resultado;
}
