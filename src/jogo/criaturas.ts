import { colideCorpo, type Solido } from '../player/fisica';
import type { Gerador } from '../audio/variacao';
import type { Drop } from './drops';
import type { Profissao } from '../world/povoado';

/** Os cinco animais (cada tema dá pele, nome e voz a eles). */
export type TipoCriatura = 'cervo' | 'coelho' | 'peixe' | 'espectro' | 'raposa';
export const TIPOS_ANIMAIS: readonly TipoCriatura[] = [
  'cervo',
  'coelho',
  'peixe',
  'espectro',
  'raposa',
];
/** Todo ser que anda pelo mundo: os animais e os moradores dos povoados. */
export type TipoSer = TipoCriatura | 'morador';
export type Comportamento = 'passivo' | 'peixe' | 'hostil' | 'companheiro' | 'morador';

/** Dados de um morador: povoado, profissão e os pontos da rotina (casa, oficina, praça). */
export interface DadosMorador {
  povoado: string;
  n: number;
  profissao: Profissao;
  /** Na frente da porta de casa, dentro de casa, na frente da oficina e na praça. */
  fora: [number, number, number];
  dentro: [number, number, number];
  oficina: [number, number, number];
  praca: [number, number, number];
  /** Caminhos a pé da borda da praça até a porta de casa e até a oficina. */
  rotaCasa: [number, number][];
  rotaOficina: [number, number][];
  /** Centro da praça (o marco fica nele: os caminhos o contornam). */
  centro: [number, number];
}

export interface DefCriatura {
  tipo: TipoSer;
  nome: string;
  comportamento: Comportamento;
  vida: number;
  /** Meia largura e altura da caixa. */
  mw: number;
  alt: number;
  velocidade: number;
  dano?: number;
  /** Itens ao ser derrotada: [item, mín, máx]. */
  drops: [string, number, number][];
}

export const CRIATURAS: Record<TipoSer, DefCriatura> = {
  cervo: {
    tipo: 'cervo',
    nome: 'Cervo-musgo',
    comportamento: 'passivo',
    vida: 10,
    mw: 0.35,
    alt: 1.3,
    velocidade: 2.2,
    drops: [['carne_crua', 1, 3]],
  },
  coelho: {
    tipo: 'coelho',
    nome: 'Coelho-bruma',
    comportamento: 'passivo',
    vida: 4,
    mw: 0.22,
    alt: 0.5,
    velocidade: 3.2,
    drops: [
      ['carne_crua', 0, 1],
      ['fibra', 0, 1],
    ],
  },
  peixe: {
    tipo: 'peixe',
    nome: 'Peixe-lume',
    comportamento: 'peixe',
    vida: 3,
    mw: 0.2,
    alt: 0.3,
    velocidade: 1.8,
    drops: [['peixe_cru', 1, 1]],
  },
  espectro: {
    tipo: 'espectro',
    nome: 'Espectro da bruma',
    comportamento: 'hostil',
    vida: 16,
    mw: 0.3,
    alt: 1.7,
    velocidade: 2.6,
    dano: 3,
    drops: [
      ['luzita', 0, 1],
      ['carvao', 0, 2],
    ],
  },
  raposa: {
    tipo: 'raposa',
    nome: 'Raposa-lume',
    comportamento: 'companheiro',
    vida: 14,
    mw: 0.25,
    alt: 0.6,
    velocidade: 4.2,
    dano: 3,
    drops: [],
  },
  morador: {
    tipo: 'morador',
    nome: 'Morador',
    comportamento: 'morador',
    vida: 20,
    mw: 0.3,
    alt: 1.8,
    velocidade: 1.6,
    drops: [],
  },
};

export interface Criatura {
  id: number;
  tipo: TipoSer;
  /** Só moradores: povoado, profissão e rotina. */
  morador?: DadosMorador;
  /** Tempo andando para um destino sem chegar mais perto (anti-trava do morador). */
  semProgresso?: number;
  menorDistancia?: number;
  /** Quantas vezes o anti-trava precisou pôr o morador no destino (teste de caminho). */
  teleportes?: number;
  /** Destino atual da rotina do morador (depuração). */
  destino?: [number, number, number];
  /** Rota que o morador está seguindo (qual e em que sentido) e o ponto dela que mira. */
  rotaChave?: string;
  rotaIndice?: number;
  /** Fase da rotina (dia ou indo para casa): ao trocar, a rota recomeça. */
  rotaFase?: 'dia' | 'casa';
  /** Canto da praça escolhido para contornar o marco (mantido até chegar nele). */
  canto?: [number, number];
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  /** Direção para onde o corpo aponta (gira suavemente até `yawAlvo`). */
  yaw: number;
  yawAlvo: number;
  vida: number;
  noChao: boolean;
  estado: 'vagar' | 'parado' | 'fugir' | 'perseguir' | 'seguir' | 'morrendo';
  tempoEstado: number;
  alvoX: number;
  alvoZ: number;
  recarga: number;
  /** Tempo restante do flash vermelho de dano. */
  ferida: number;
  domada: boolean;
  /** 0..1 enquanto morre ou se dissolve. */
  dissolver: number;
  idade: number;
  /** Tempo restante atordoada pelo golpe: o empurrão decai sem a IA sobrescrever. */
  atordoada: number;
  /** Tempo tentando andar sem sair do lugar (para desistir do alvo). */
  preso: number;
  /** Tempo restante desviando de um obstáculo na direção `desvioYaw`. */
  desvio: number;
  desvioYaw: number;
  /** Espera até o próximo pulo (coelho). */
  recargaPulo: number;
}

export interface Mundo {
  solido: Solido;
  /** Água na célula. */
  agua(x: number, y: number, z: number): boolean;
  /** Luz de fontes perto (0..15), aproximada. */
  luzBloco(x: number, y: number, z: number): number;
  /** Céu aberto acima da posição. */
  ceuAberto(x: number, y: number, z: number): boolean;
}

export interface Jogador {
  x: number;
  y: number;
  z: number;
  vivo: boolean;
  /** Modo criativo: hostis ignoram. */
  criativo: boolean;
}

export interface EventoCriatura {
  tipo: 'ataque' | 'morte' | 'ferida' | 'domada' | 'som';
  criatura: Criatura;
  /** Ataque: em quem (o jogador mais perto da criatura). */
  jogador?: Jogador;
  dano?: number;
  drops?: Drop[];
}

const GRAVIDADE = 22;
const FOLGA = 1e-4;
/** Degrau que a criatura sobe andando (lajes e escadas), como o jogador. */
const DEGRAU = 0.51;
const VEL_PULO = 7.2;
/** Impulso ao sair da água pela margem. */
const VEL_SAIDA_AGUA = 8;
/** Acima disso, na água, o impulso de saída está em andamento (vale a gravidade). */
const VY_NADO_MAX = 2.5;
/** Tempo sem sair do lugar até desistir do caminho. */
const TEMPO_PRESO = 0.5;
const ATORDOAMENTO = 0.3;

export function novaCriatura(id: number, tipo: TipoSer, x: number, y: number, z: number): Criatura {
  return {
    id,
    tipo,
    x,
    y,
    z,
    vx: 0,
    vy: 0,
    vz: 0,
    yaw: 0,
    yawAlvo: 0,
    vida: CRIATURAS[tipo].vida,
    noChao: false,
    estado: 'parado',
    tempoEstado: 0,
    alvoX: x,
    alvoZ: z,
    recarga: 0,
    ferida: 0,
    domada: false,
    dissolver: 0,
    idade: 0,
    atordoada: 0,
    preso: 0,
    desvio: 0,
    desvioYaw: 0,
    recargaPulo: 0,
  };
}

/** Ângulo equivalente em [-π, π]. */
function embrulhar(a: number): number {
  return Math.atan2(Math.sin(a), Math.cos(a));
}

/**
 * Topo do chão sob a criatura ao cair de `atual` para `alvo` (considera lajes, escadas e
 * cercas). Devolve null se não achar um apoio abaixo de `atual`.
 */
function topoChao(
  s: Solido,
  x: number,
  z: number,
  mw: number,
  alvo: number,
  atual: number,
): number | null {
  const x0 = Math.floor(x - mw);
  const x1 = Math.floor(x + mw);
  const z0 = Math.floor(z - mw);
  const z1 = Math.floor(z + mw);
  let maior = -Infinity;
  for (let iy = Math.floor(alvo); iy <= Math.floor(atual); iy++) {
    for (let iz = z0; iz <= z1; iz++) {
      for (let ix = x0; ix <= x1; ix++) {
        if (!s(ix, iy, iz)) continue;
        const cx = s.caixas?.(ix, iy, iz);
        if (!cx) {
          if (iy + 1 <= atual + FOLGA && iy + 1 > maior) maior = iy + 1;
          continue;
        }
        for (const c of cx) {
          const topo = iy + c[4];
          if (
            topo <= atual + FOLGA &&
            topo > maior &&
            x + mw > ix + c[0] &&
            x - mw < ix + c[3] &&
            z + mw > iz + c[2] &&
            z - mw < iz + c[5]
          )
            maior = topo;
        }
      }
    }
  }
  return maior === -Infinity ? null : maior;
}

/**
 * Altura da superfície da água na coluna da criatura (topo da coluna d'água), ou null se o
 * corpo não estiver na água.
 */
function nivelAgua(m: Mundo, c: Criatura): number | null {
  const bx = Math.floor(c.x);
  const bz = Math.floor(c.z);
  let by = Math.floor(c.y + 0.1);
  if (!m.agua(bx, by, bz)) return null;
  for (let n = 0; n < 4 && m.agua(bx, by + 1, bz); n++) by++;
  return by + 1;
}

function mover(c: Criatura, def: DefCriatura, dt: number, m: Mundo, agua: number | null): void {
  const s = m.solido;
  const peixe = def.comportamento === 'peixe';
  const livre = (x: number, y: number, z: number) => !colideCorpo(s, x, y, z, def.mw, def.alt);
  // dentro de um bloco (chunk que carregou depois, bloco posto em cima, quadro longo):
  // sobe até o primeiro espaço livre logo acima, em vez de ficar presa
  if (!peixe && !livre(c.x, c.y, c.z)) {
    let solta = false;
    for (let dy = 0.25; dy <= 6 && !solta; dy += 0.25) {
      if (!livre(c.x, c.y + dy, c.z)) continue;
      c.y += dy;
      c.vy = 0;
      solta = true;
    }
    // presa num barranco ou numa árvore: tenta os lados, na altura do chão de lá
    for (const [dx, dz] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
      [1, 1],
      [-1, -1],
      [1, -1],
      [-1, 1],
    ]) {
      if (solta) break;
      for (let dy = 0; dy <= 3; dy += 0.5) {
        if (!livre(c.x + dx, c.y + dy, c.z + dz)) continue;
        c.x += dx;
        c.z += dz;
        c.y += dy;
        c.vy = 0;
        solta = true;
        break;
      }
    }
  }
  const tentar = (eixo: 'x' | 'z', d: number) => {
    if (d === 0) return;
    const nx = eixo === 'x' ? c.x + d : c.x;
    const nz = eixo === 'z' ? c.z + d : c.z;
    if (livre(nx, c.y, nz)) {
      c[eixo] += d;
      return;
    }
    if (!peixe) {
      // sobe sozinha degraus de meio bloco (lajes e escadas)
      if (c.noChao && livre(nx, c.y + DEGRAU, nz) && livre(c.x, c.y + DEGRAU, c.z)) {
        c.y += DEGRAU;
        c[eixo] += d;
        return;
      }
      // pula um bloco: precisa de espaço no destino e acima de onde está (copa, caverna)
      const podePular = livre(nx, c.y + 1.05, nz) && livre(c.x, c.y + 1.05, c.z);
      if (agua !== null) {
        // nadando, encostada na margem: impulso para subir no bloco de cima
        if (podePular && c.vy < VEL_SAIDA_AGUA * 0.5) c.vy = VEL_SAIDA_AGUA;
      } else if (c.noChao && podePular) {
        c.vy = VEL_PULO;
        c.noChao = false;
      }
    }
    c[eixo === 'x' ? 'vx' : 'vz'] = 0;
  };
  tentar('x', c.vx * dt);
  tentar('z', c.vz * dt);
  if (peixe) {
    c.vy *= 0.9;
  } else if (agua !== null && c.vy <= VY_NADO_MAX) {
    // empuxo proporcional à profundidade, com amortecimento: boia sem serrilhar na superfície
    const alvoY = agua - Math.max(0.35, def.alt * 0.5);
    const acel = (alvoY - c.y) * 30 - c.vy * 7;
    c.vy = Math.min(VY_NADO_MAX, Math.max(-3, c.vy + acel * dt));
  } else {
    c.vy = Math.max(c.vy - GRAVIDADE * dt, -30);
  }
  const ny = c.y + c.vy * dt;
  if (livre(c.x, ny, c.z)) {
    c.y = ny;
    c.noChao = false;
    return;
  }
  if (c.vy < 0) {
    // pousa no topo real do apoio (laje, escada, cerca); sem apoio claro, fica onde está
    const topo = topoChao(s, c.x, c.z, def.mw, ny, c.y);
    if (topo !== null && livre(c.x, topo, c.z)) c.y = topo;
    c.noChao = true;
  }
  c.vy = 0;
}

/** Ajusta a velocidade rumo ao ponto; devolve a distância horizontal até ele. */
function andarPara(c: Criatura, def: DefCriatura, tx: number, tz: number, fator = 1): number {
  const dx = tx - c.x;
  const dz = tz - c.z;
  const d = Math.hypot(dx, dz);
  if (d < 0.3) {
    c.vx *= 0.5;
    c.vz *= 0.5;
    return d;
  }
  const v = def.velocidade * fator;
  c.vx = (dx / d) * v;
  c.vz = (dz / d) * v;
  c.yawAlvo = Math.atan2(dx, dz);
  return d;
}

function frear(c: Criatura, k: number): void {
  c.vx *= k;
  c.vz *= k;
}

/** Sorteia um destino de passeio; o peixe só escolhe pontos dentro d'água. */
function sortearAlvo(c: Criatura, m: Mundo, rng: Gerador, raio: number): void {
  const peixe = CRIATURAS[c.tipo].comportamento === 'peixe';
  for (let i = 0; i < 4; i++) {
    const ax = c.x + (rng() - 0.5) * raio;
    const az = c.z + (rng() - 0.5) * raio;
    if (peixe && !m.agua(Math.floor(ax), Math.floor(c.y + 0.15), Math.floor(az))) continue;
    c.alvoX = ax;
    c.alvoZ = az;
    return;
  }
  c.alvoX = c.x;
  c.alvoZ = c.z;
}

/** Sem sair do lugar: vira 90° (ou volta, se já desviava) por um tempo e troca o destino. */
function desistir(c: Criatura, rng: Gerador, direcao: number): void {
  c.desvioYaw = embrulhar(
    c.desvio > 0 ? c.desvioYaw + Math.PI : direcao + (rng() < 0.5 ? 1 : -1) * (Math.PI / 2),
  );
  c.desvio = 0.7 + rng() * 0.6;
  if (c.estado === 'vagar' || c.estado === 'parado' || c.tipo === 'peixe') {
    c.alvoX = c.x + Math.sin(c.desvioYaw) * 6;
    c.alvoZ = c.z + Math.cos(c.desvioYaw) * 6;
    c.tempoEstado = Math.max(c.tempoEstado, 2);
  }
}

/** Posição livre perto do jogador para a raposa domada reaparecer (ou null). */
const VIZINHOS: [number, number][] = [
  [1, 1],
  [-1, 1],
  [1, -1],
  [-1, -1],
  [1.5, 0],
  [-1.5, 0],
  [0, 1.5],
  [0, -1.5],
];
function lugarLivrePerto(m: Mundo, def: DefCriatura, j: Jogador): [number, number, number] | null {
  for (const [ox, oz] of VIZINHOS) {
    for (const oy of [0, 0.5, 1]) {
      const x = j.x + ox;
      const y = j.y + oy;
      const z = j.z + oz;
      if (!colideCorpo(m.solido, x, y, z, def.mw, def.alt)) return [x, y, z];
    }
  }
  return null;
}

/**
 * Fora do raio de simulação: só assenta (cai até o chão ou boia), sem IA. Evita a criatura
 * congelada no ar.
 */
export function assentarCriatura(c: Criatura, dt: number, m: Mundo): void {
  const def = CRIATURAS[c.tipo];
  c.vx = 0;
  c.vz = 0;
  if (def.comportamento === 'peixe' || c.estado === 'morrendo') return;
  const agua = nivelAgua(m, c);
  if (c.noChao && agua === null) return;
  mover(c, def, dt, m, agua);
}

/**
 * Próximo ponto de uma rota a pé (borda da praça → quina → porta). Indo para a porta,
 * avança pelos pontos; voltando para a praça, recua. No fim da rota, o destino final.
 */
function pelaRota(
  c: Criatura,
  rota: [number, number][],
  paraPorta: boolean,
  final: [number, number, number],
  nome: string,
): [number, number, number] {
  if (rota.length === 0) return final;
  const ponto = (q: [number, number]): [number, number, number] => [q[0], final[1], q[1]];
  if (rota.length === 1)
    return Math.hypot(c.x - rota[0][0], c.z - rota[0][1]) < 0.5 ? final : ponto(rota[0]);
  // já seguindo esta rota neste sentido: continua do ponto em que estava, só para a
  // frente (sem isso, perto de um ponto o alvo alternava entre ele e o anterior e o
  // morador ficava tremendo no lugar)
  const chave = `${nome}${paraPorta ? '>' : '<'}`;
  const passo = paraPorta ? 1 : -1;
  if (c.rotaChave === chave && c.rotaIndice !== undefined && distRota(c, rota) < 3) {
    let i = c.rotaIndice;
    while (i >= 0 && i < rota.length && Math.hypot(c.x - rota[i][0], c.z - rota[i][1]) < 0.5)
      i += passo;
    c.rotaIndice = i;
    if (i < 0 || i >= rota.length) return final;
    // saiu do caminho (parou para olhar, foi empurrado): volta reto para ele em vez de
    // cortar em diagonal até o próximo ponto (cortar desce a rampa ao lado do caminho)
    const ant = rota[i - passo];
    if (ant) {
      const [ax, az] = ant;
      const [bx, bz] = rota[i];
      const vx = bx - ax;
      const vz = bz - az;
      const comp = Math.hypot(vx, vz) || 1;
      const t = Math.max(0, Math.min(1, ((c.x - ax) * vx + (c.z - az) * vz) / (comp * comp)));
      const px = ax + vx * t;
      const pz = az + vz * t;
      if (Math.hypot(c.x - px, c.z - pz) > 0.8) {
        // um pouco à frente da projeção, no sentido da viagem
        const f = Math.min(1, t + 0.6 / comp);
        return [ax + vx * f, final[1], az + vz * f];
      }
    }
    return ponto(rota[i]);
  }
  // trecho da rota mais perto do morador (distância ao segmento, não ao ponto)
  let melhor = Infinity;
  let k = 0;
  for (let i = 0; i < rota.length - 1; i++) {
    const [ax, az] = rota[i];
    const [bx, bz] = rota[i + 1];
    const vx = bx - ax;
    const vz = bz - az;
    const t = Math.max(
      0,
      Math.min(1, ((c.x - ax) * vx + (c.z - az) * vz) / (vx * vx + vz * vz || 1)),
    );
    const d = Math.hypot(c.x - (ax + vx * t), c.z - (az + vz * t));
    if (d < melhor - 1e-6) {
      melhor = d;
      k = i;
    }
  }
  // longe da rota e indo para a porta: entra nela pelo começo (a borda da praça)
  if (paraPorta && melhor > 3) {
    c.rotaChave = chave;
    c.rotaIndice = 0;
    return ponto(rota[0]);
  }
  // mira o fim do trecho no sentido da viagem; chegando nele, o próximo (ou o destino)
  let alvo = paraPorta ? k + 1 : k;
  while (
    alvo >= 0 &&
    alvo < rota.length &&
    Math.hypot(c.x - rota[alvo][0], c.z - rota[alvo][1]) < 0.5
  )
    alvo += passo;
  c.rotaChave = chave;
  c.rotaIndice = alvo;
  return alvo < 0 || alvo >= rota.length ? final : ponto(rota[alvo]);
}

/** Distância do morador até a rota (o trecho mais perto). */
function distRota(c: Criatura, rota: [number, number][]): number {
  if (rota.length === 0) return Infinity;
  if (rota.length === 1) return Math.hypot(c.x - rota[0][0], c.z - rota[0][1]);
  let d = Infinity;
  for (let i = 0; i < rota.length - 1; i++)
    d = Math.min(d, distSegmento(c.x, c.z, rota[i][0], rota[i][1], rota[i + 1][0], rota[i + 1][1]));
  return d;
}

/**
 * Pela rede de caminhos: estando numa rota que não é a do destino, volta por ela até a
 * praça; na praça, entra na rota do destino (ou vai ao ponto final, se for na praça).
 */
function navegar(
  c: Criatura,
  m: DadosMorador,
  rotaDestino: [number, number][] | null,
  final: [number, number, number],
): [number, number, number] {
  const nome = (r: [number, number][] | null) => (r === m.rotaCasa ? 'casa' : 'oficina');
  const entradaDe = (r: [number, number][] | null): [number, number, number] =>
    r && r.length ? [r[0][0], final[1], r[0][1]] : final;
  // continua na rota em que já está enquanto não se afasta dela (sem isso, perto da
  // praça, a uns 2 blocos de duas rotas, a escolha trocava a cada passo)
  if (c.rotaChave) {
    const naCasa = c.rotaChave.startsWith('casa');
    const r = naCasa ? m.rotaCasa : m.rotaOficina;
    const ida = c.rotaChave.endsWith('>');
    // rota já percorrida até o fim não segura ninguém (é hora de entrar na seguinte)
    const terminou =
      c.rotaIndice !== undefined && (ida ? c.rotaIndice >= r.length : c.rotaIndice < 0);
    if (!terminou && distRota(c, r) < 3) {
      if (r === rotaDestino && ida) return pelaRota(c, r, true, final, nome(r));
      if (r !== rotaDestino && !ida) return pelaRota(c, r, false, entradaDe(rotaDestino), nome(r));
    }
  }
  if (rotaDestino && distRota(c, rotaDestino) <= 2)
    return pelaRota(c, rotaDestino, true, final, nome(rotaDestino));
  const entrada: [number, number, number] =
    rotaDestino && rotaDestino.length ? [rotaDestino[0][0], final[1], rotaDestino[0][1]] : final;
  for (const outra of [m.rotaCasa, m.rotaOficina]) {
    if (outra === rotaDestino) continue;
    if (distRota(c, outra) < 2) return pelaRota(c, outra, false, entrada, nome(outra));
  }
  return rotaDestino ? pelaRota(c, rotaDestino, true, final, nome(rotaDestino)) : final;
}

/** Distância do ponto (px, pz) ao segmento a-b. */
function distSegmento(
  px: number,
  pz: number,
  ax: number,
  az: number,
  bx: number,
  bz: number,
): number {
  const vx = bx - ax;
  const vz = bz - az;
  const t = Math.max(0, Math.min(1, ((px - ax) * vx + (pz - az) * vz) / (vx * vx + vz * vz || 1)));
  return Math.hypot(px - (ax + vx * t), pz - (az + vz * t));
}

/**
 * Se a reta até o destino passa pelo marco da praça, vai antes por um canto livre dela.
 * Contorna canto a canto: escolhe o canto alcançável que mais aproxima do destino (sem
 * exigir que dele já se chegue direto), e assim dá a volta no marco sem empacar.
 */
function contornarMarco(
  c: Criatura,
  alvo: [number, number, number],
  centro: [number, number],
): [number, number, number] {
  /** A reta até o destino passa perto do marco? */
  const R = 2.7;
  /** Folga mínima de um trecho: o marco tem até 1,5 do centro, mais o corpo. */
  const LIVRE = 2.2;
  if (
    distSegmento(centro[0], centro[1], c.x, c.z, alvo[0], alvo[2]) >= R ||
    Math.hypot(alvo[0] - centro[0], alvo[2] - centro[1]) < R
  ) {
    c.canto = undefined;
    return alvo;
  }
  // canto já escolhido: segue nele até chegar (trocar no caminho dava vaivém)
  if (c.canto) {
    const [qx, qz] = c.canto;
    if (
      Math.hypot(c.x - qx, c.z - qz) >= 0.6 &&
      distSegmento(centro[0], centro[1], c.x, c.z, qx, qz) >= LIVRE
    )
      return [qx, alvo[1], qz];
    c.canto = undefined;
  }
  const dc = Math.hypot(c.x - centro[0], c.z - centro[1]);
  // encostado no marco: primeiro se afasta dele
  if (dc < LIVRE) {
    const ux = dc > 0.01 ? (c.x - centro[0]) / dc : 1;
    const uz = dc > 0.01 ? (c.z - centro[1]) / dc : 0;
    return [centro[0] + ux * (R + 0.3), alvo[1], centro[1] + uz * (R + 0.3)];
  }
  let melhor: [number, number, number] = alvo;
  let custo = Infinity;
  for (const [dx, dz] of [
    [3, 3],
    [-3, 3],
    [3, -3],
    [-3, -3],
  ]) {
    const qx = centro[0] + dx;
    const qz = centro[1] + dz;
    // o canto em que já está não conta; o trecho até o canto não pode raspar no marco
    if (Math.hypot(c.x - qx, c.z - qz) < 0.6) continue;
    if (distSegmento(centro[0], centro[1], c.x, c.z, qx, qz) < LIVRE) continue;
    const k = Math.hypot(c.x - qx, c.z - qz) + Math.hypot(alvo[0] - qx, alvo[2] - qz);
    if (k < custo) {
      custo = k;
      melhor = [qx, alvo[1], qz];
    }
  }
  if (melhor !== alvo) c.canto = [melhor[0], melhor[2]];
  return melhor;
}

/**
 * Rotina do morador: de dia passeia entre a praça e a oficina e para um pouco em cada
 * lugar; ao entardecer vai para a frente da porta e entra; à noite fica em casa. Se
 * passar muito tempo sem chegar mais perto do destino, aparece nele (nunca fica preso).
 */
function rotinaMorador(
  c: Criatura,
  def: DefCriatura,
  dt: number,
  rng: Gerador,
  noite: number,
  distJ: number,
  dxj: number,
  dzj: number,
  mundo: Mundo,
): void {
  const m = c.morador;
  if (!m) return;
  if (c.estado === 'fugir' && c.tempoEstado > 0) {
    andarPara(c, def, c.alvoX, c.alvoZ, 1.6);
    return;
  }
  const emCasa = noite > 0.35;
  const fase = emCasa ? 'casa' : 'dia';
  if (c.rotaFase !== fase) {
    c.rotaFase = fase;
    c.rotaChave = undefined;
  }
  let alvo: [number, number, number];
  let parar = false;
  const dDentro = Math.hypot(c.x - m.dentro[0], c.z - m.dentro[2]);
  const dFora = Math.hypot(c.x - m.fora[0], c.z - m.fora[2]);
  // a porta tem um bloco de largura: atravessa pelo eixo dela, da frente (t = 0) ao
  // miolo da casa (t = 1); estando no eixo e entre os dois, segue até o fim
  const ax = m.dentro[0] - m.fora[0];
  const az = m.dentro[2] - m.fora[2];
  const comp2 = ax * ax + az * az || 1;
  const t = ((c.x - m.fora[0]) * ax + (c.z - m.fora[2]) * az) / comp2;
  const lado = Math.abs((c.x - m.fora[0]) * az - (c.z - m.fora[2]) * ax) / Math.sqrt(comp2);
  const noEixo = lado < 0.3;
  const naPassagem = noEixo && t > -0.12 && t < 1.12;
  const emCasaJa = dDentro < 2.6 && t > 0.4;
  if (emCasa) {
    if (naPassagem || emCasaJa) alvo = m.dentro;
    else alvo = dFora < 2 ? m.fora : navegar(c, m, m.rotaCasa, m.fora);
    parar = dDentro < 0.6;
  } else if (naPassagem || emCasaJa) {
    // de manhã: volta ao eixo da porta (miolo da casa) e sai por ela até a frente
    // no eixo, mira um pouco além da frente da porta (assim sai da passagem e segue o dia)
    alvo = noEixo ? [m.fora[0] - ax * 0.4, m.fora[1], m.fora[2] - az * 0.4] : m.dentro;
  } else {
    if (c.tempoEstado <= 0) {
      // escolhe o próximo lugar: praça ou oficina, com uma pausa em cada
      const base = rng() < 0.55 ? m.praca : m.oficina;
      // destino no centro exato de uma célula livre (o corpo cabe sem raspar em nada)
      c.alvoX = base[0];
      c.alvoZ = base[2];
      c.tempoEstado = 12 + rng() * 14;
      c.menorDistancia = undefined;
      // viagem nova: a rota recomeça do ponto mais perto
      c.rotaChave = undefined;
    }
    const final: [number, number, number] = [c.alvoX, m.praca[1], c.alvoZ];
    const vaiOficina = Math.hypot(c.alvoX - m.oficina[0], c.alvoZ - m.oficina[2]) < 0.5;
    // pelos caminhos: até a oficina segue a rota dela; até a praça, volta pela rota em que estiver
    alvo = navegar(c, m, vaiOficina ? m.rotaOficina : null, final);
    parar = Math.hypot(c.x - c.alvoX, c.z - c.alvoZ) < 0.8;
  }
  // perto do jogador: para e olha para ele (ele pode querer trocar)
  if (distJ < 3) {
    frear(c, 0.5);
    c.estado = 'parado';
    c.yawAlvo = Math.atan2(dxj, dzj);
    return;
  }
  if (parar) {
    c.estado = 'parado';
    frear(c, 0.6);
    c.semProgresso = 0;
    return;
  }
  // o marco no meio da praça: quem passaria por cima dele contorna por um canto
  alvo = contornarMarco(c, alvo, m.centro);
  c.estado = 'seguir';
  // destino novo: o anti-trava recomeça a contar (o novo pode estar mais longe)
  if (!c.destino || Math.hypot(c.destino[0] - alvo[0], c.destino[2] - alvo[2]) > 0.5) {
    c.menorDistancia = undefined;
    c.semProgresso = 0;
  }
  c.destino = alvo;
  const d = andarPara(c, def, alvo[0], alvo[2], emCasa ? 1.25 : 1);
  // anti-trava: se em 10 s não chegou mais perto, aparece no destino
  if (c.menorDistancia === undefined || d < c.menorDistancia - 0.3) {
    c.menorDistancia = d;
    c.semProgresso = 0;
  } else c.semProgresso = (c.semProgresso ?? 0) + dt;
  if ((c.semProgresso ?? 0) > 10) {
    c.semProgresso = 0;
    c.menorDistancia = undefined;
    // só aparece onde o corpo cabe (o destino ou um vizinho livre); senão troca o destino
    for (const [ox, oz] of [[0, 0], ...VIZINHOS]) {
      const x = alvo[0] + ox;
      const z = alvo[2] + oz;
      if (colideCorpo(mundo.solido, x, alvo[1], z, def.mw, def.alt)) continue;
      c.x = x;
      c.y = alvo[1];
      c.z = z;
      c.vx = 0;
      c.vy = 0;
      c.vz = 0;
      c.teleportes = (c.teleportes ?? 0) + 1;
      return;
    }
    c.tempoEstado = 0;
  }
}

/**
 * Avança uma criatura. Devolve eventos (ataque ao jogador, morte com drops).
 */
export function passoCriatura(
  c: Criatura,
  dt: number,
  m: Mundo,
  j: Jogador,
  rng: Gerador,
  hostisPerto: readonly Criatura[],
  noite: number,
): EventoCriatura[] {
  const def = CRIATURAS[c.tipo];
  const ev: EventoCriatura[] = [];
  c.idade += dt;
  c.tempoEstado -= dt;
  c.recarga = Math.max(0, c.recarga - dt);
  c.ferida = Math.max(0, c.ferida - dt);
  c.recargaPulo = Math.max(0, c.recargaPulo - dt);
  if (c.estado === 'morrendo') {
    c.dissolver = Math.min(1, c.dissolver + dt * 1.5);
    c.vx *= 0.9;
    c.vz *= 0.9;
    return ev;
  }
  const bx = Math.floor(c.x);
  const by = Math.floor(c.y + 0.3);
  const bz = Math.floor(c.z);
  const nadando = m.agua(bx, by, bz);
  const agua = def.comportamento === 'peixe' ? null : nivelAgua(m, c);
  const dxj = j.x - c.x;
  const dzj = j.z - c.z;
  const distJ = Math.hypot(dxj, dzj, j.y - c.y);

  if (c.atordoada > 0) {
    // golpeada: o empurrão decai sozinho antes de a IA voltar a mandar
    c.atordoada -= dt;
    frear(c, Math.exp(-dt * 5));
  } else
    switch (def.comportamento) {
      case 'peixe': {
        if (!nadando) {
          // fora d'água: se debate e perde vida
          c.vy = Math.max(c.vy - GRAVIDADE * dt, -20);
          if (c.tempoEstado <= 0) {
            c.tempoEstado = 0.6;
            ev.push(...ferir(c, 1, rng));
          }
          break;
        }
        if (c.tempoEstado <= 0) {
          c.tempoEstado = 2 + rng() * 3;
          sortearAlvo(c, m, rng, 10);
          c.vy = (rng() - 0.5) * 1.2;
        }
        if (distJ < 3) andarPara(c, def, c.x - dxj, c.z - dzj, 1.6);
        else andarPara(c, def, c.alvoX, c.alvoZ);
        if (!m.agua(bx, Math.floor(c.y + c.vy * 0.3 + 0.15), bz)) c.vy = -Math.abs(c.vy) * 0.5;
        break;
      }
      case 'passivo': {
        if (c.estado === 'fugir' && c.tempoEstado > 0) {
          andarPara(c, def, c.x - dxj * 4, c.z - dzj * 4, 1.7);
          if (c.tipo === 'coelho' && c.noChao && c.recargaPulo <= 0) {
            c.vy = 5;
            c.noChao = false;
            c.recargaPulo = 0.35 + rng() * 0.25;
          }
          break;
        }
        if (c.tempoEstado <= 0) {
          if (rng() < 0.4) {
            c.estado = 'parado';
            c.tempoEstado = 2 + rng() * 4;
          } else {
            c.estado = 'vagar';
            c.tempoEstado = 3 + rng() * 4;
            sortearAlvo(c, m, rng, 14);
          }
        }
        if (c.estado === 'vagar') {
          if (andarPara(c, def, c.alvoX, c.alvoZ, 0.6) < 0.4) c.tempoEstado = 0;
          if (c.tipo === 'coelho' && c.noChao && c.recargaPulo <= 0 && rng() < dt * 2) {
            c.vy = 4.5;
            c.noChao = false;
            c.recargaPulo = 0.4;
          }
        } else {
          c.estado = 'parado';
          frear(c, 0.7);
        }
        break;
      }
      case 'hostil': {
        const luz = m.luzBloco(bx, by, bz);
        const sol = m.ceuAberto(bx, by + 1, bz) && noite < 0.3;
        if (sol || c.idade > 600) {
          // a luz do dia dissolve o espectro
          c.dissolver = Math.min(1, c.dissolver + dt * 0.5);
          if (c.dissolver >= 1) {
            c.estado = 'morrendo';
            ev.push({ tipo: 'morte', criatura: c, drops: [] });
          }
        }
        if (luz >= 9) {
          c.estado = 'fugir';
          c.tempoEstado = 2;
        }
        if (c.estado === 'fugir' && c.tempoEstado > 0) {
          andarPara(c, def, c.x - dxj * 4, c.z - dzj * 4, 1.2);
          break;
        }
        if (j.vivo && !j.criativo && distJ < 18) {
          c.estado = 'perseguir';
          // não entra em áreas iluminadas
          const proxX = Math.floor(c.x + Math.sign(dxj));
          const proxZ = Math.floor(c.z + Math.sign(dzj));
          if (m.luzBloco(proxX, by, proxZ) >= 9) frear(c, 0.5);
          else if (Math.hypot(dxj, dzj) > 1) andarPara(c, def, j.x, j.z, 1);
          else {
            // colado no jogador: para a ~1 bloco em vez de empurrá-lo
            frear(c, 0.5);
            c.yawAlvo = Math.atan2(dxj, dzj);
          }
          if (distJ < 1.4 && c.recarga <= 0) {
            c.recarga = 1.1;
            ev.push({ tipo: 'ataque', criatura: c, dano: def.dano });
          }
        } else {
          if (c.estado !== 'vagar') {
            // a perseguição (ou a fuga) acabou: volta a vagar
            c.estado = 'vagar';
            c.tempoEstado = 0;
          }
          if (c.tempoEstado <= 0) {
            c.tempoEstado = 3 + rng() * 3;
            sortearAlvo(c, m, rng, 12);
          }
          andarPara(c, def, c.alvoX, c.alvoZ, 0.5);
        }
        if (rng() < dt * 0.15) ev.push({ tipo: 'som', criatura: c });
        break;
      }
      case 'morador':
        rotinaMorador(c, def, dt, rng, noite, distJ, dxj, dzj, m);
        break;
      case 'companheiro': {
        if (!c.domada) {
          // curiosa: chega perto mas mantém distância (com histerese para não oscilar)
          const curiosa = c.estado === 'seguir' ? distJ < 7 : distJ < 5.5;
          if (curiosa) {
            c.estado = 'seguir';
            const dh = Math.hypot(dxj, dzj) || 1;
            // vai até ~2,75 blocos do jogador; a folga de andarPara evita o vaivém
            if (andarPara(c, def, j.x - (dxj / dh) * 2.75, j.z - (dzj / dh) * 2.75, 0.5) < 0.3)
              c.yawAlvo = Math.atan2(dxj, dzj);
            break;
          }
          if (c.estado !== 'vagar') {
            c.estado = 'vagar';
            c.tempoEstado = 0;
          }
          if (c.tempoEstado <= 0) {
            c.tempoEstado = 2 + rng() * 4;
            sortearAlvo(c, m, rng, 10);
          }
          andarPara(c, def, c.alvoX, c.alvoZ, 0.4);
          break;
        }
        let inimigo: Criatura | null = null;
        let dInimigo = 10;
        for (const h of hostisPerto) {
          if (h.estado === 'morrendo') continue;
          const d = Math.hypot(h.x - c.x, h.z - c.z);
          if (d < dInimigo) {
            dInimigo = d;
            inimigo = h;
          }
        }
        if (inimigo) {
          c.estado = 'perseguir';
          andarPara(c, def, inimigo.x, inimigo.z, 1.1);
          if (dInimigo < 1.3 && c.recarga <= 0) {
            c.recarga = 0.8;
            ev.push(...ferir(inimigo, def.dano ?? 2, rng, c.x, c.z));
          }
        } else if (c.estado === 'seguir' ? distJ > 2.5 : distJ > 4) {
          // histerese: começa a seguir acima de 4 e só para abaixo de 2,5
          c.estado = 'seguir';
          andarPara(c, def, j.x, j.z, distJ > 8 ? 1.3 : 0.9);
          if (distJ > 24) {
            const p = lugarLivrePerto(m, def, j);
            if (p) {
              [c.x, c.y, c.z] = p;
              c.vy = 0;
              c.preso = 0;
              c.desvio = 0;
            }
          }
        } else {
          c.estado = 'parado';
          frear(c, 0.6);
          c.yawAlvo = Math.atan2(dxj, dzj);
        }
        break;
      }
    }

  // desviando de um obstáculo: mantém a rapidez, troca a direção
  if (c.desvio > 0 && c.atordoada <= 0) {
    c.desvio -= dt;
    const v = Math.hypot(c.vx, c.vz);
    if (v > 0.1) {
      c.vx = Math.sin(c.desvioYaw) * v;
      c.vz = Math.cos(c.desvioYaw) * v;
      c.yawAlvo = c.desvioYaw;
    }
  }

  const x0 = c.x;
  const z0 = c.z;
  const vxDesejado = c.vx;
  const vzDesejado = c.vz;
  const desejada = Math.hypot(vxDesejado, vzDesejado);
  mover(c, def, dt, m, agua);

  // alvo inalcançável: mede o deslocamento real e desiste se não sai do lugar
  if (dt > 0 && c.atordoada <= 0 && desejada > 0.4) {
    const real = Math.hypot(c.x - x0, c.z - z0) / dt;
    if (real < desejada * 0.2) c.preso += dt;
    else if (real > desejada * 0.5) c.preso = 0;
    if (c.preso > TEMPO_PRESO) {
      c.preso = 0;
      desistir(c, rng, Math.atan2(vxDesejado, vzDesejado));
    }
  } else c.preso = Math.max(0, c.preso - dt);

  // gira o corpo aos poucos (pelo menor arco)
  c.yaw = embrulhar(c.yaw + embrulhar(c.yawAlvo - c.yaw) * Math.min(1, dt * 8));

  if (c.y < -10) {
    c.estado = 'morrendo';
    ev.push({ tipo: 'morte', criatura: c, drops: [] });
  }
  return ev;
}

/** Aplica dano com empurrão; pode matar e soltar drops. */
export function ferir(
  c: Criatura,
  dano: number,
  rng: Gerador,
  deX?: number,
  deZ?: number,
): EventoCriatura[] {
  if (c.estado === 'morrendo' || c.ferida > 0.25) return [];
  const def = CRIATURAS[c.tipo];
  if (def.comportamento === 'morador') {
    // morador não se machuca: leva um susto e se afasta um pouco
    c.ferida = 0.3;
    c.estado = 'fugir';
    c.tempoEstado = 1.6;
    if (deX !== undefined && deZ !== undefined) {
      c.alvoX = c.x + (c.x - deX) * 3;
      c.alvoZ = c.z + (c.z - deZ) * 3;
    }
    return [{ tipo: 'ferida', criatura: c, dano: 0 }];
  }
  c.vida -= dano;
  c.ferida = 0.4;
  if (deX !== undefined && deZ !== undefined) {
    const dx = c.x - deX;
    const dz = c.z - deZ;
    const d = Math.hypot(dx, dz) || 1;
    c.vx = (dx / d) * 6;
    c.vz = (dz / d) * 6;
    c.vy = 4.5;
    c.noChao = false;
    // o empurrão vale por um instante antes de a IA retomar
    c.atordoada = ATORDOAMENTO;
  }
  if (def.comportamento === 'passivo') {
    c.estado = 'fugir';
    c.tempoEstado = 5;
  }
  if (c.vida <= 0) {
    c.estado = 'morrendo';
    const drops: Drop[] = [];
    for (const [item, min, max] of def.drops) {
      const q = min + Math.floor(rng() * (max - min + 1));
      if (q > 0) drops.push({ item, qtd: q });
    }
    return [{ tipo: 'morte', criatura: c, drops }];
  }
  return [{ tipo: 'ferida', criatura: c, dano }];
}

/** Raio contra caixas de criaturas: a mais próxima até `alcance`. */
export function criaturaNaMira<C extends Pick<Criatura, 'x' | 'y' | 'z' | 'tipo' | 'estado'>>(
  lista: readonly C[],
  o: { x: number; y: number; z: number },
  d: { x: number; y: number; z: number },
  alcance: number,
): { criatura: C; distancia: number } | null {
  let melhor: { criatura: C; distancia: number } | null = null;
  for (const c of lista) {
    if (c.estado === 'morrendo') continue;
    const def = CRIATURAS[c.tipo];
    const min = [c.x - def.mw, c.y, c.z - def.mw];
    const max = [c.x + def.mw, c.y + def.alt, c.z + def.mw];
    let t0 = 0;
    let t1 = alcance;
    const oo = [o.x, o.y, o.z];
    const dd = [d.x, d.y, d.z];
    let ok = true;
    for (let k = 0; k < 3 && ok; k++) {
      if (Math.abs(dd[k]) < 1e-9) {
        if (oo[k] < min[k] || oo[k] > max[k]) ok = false;
        continue;
      }
      let a = (min[k] - oo[k]) / dd[k];
      let b = (max[k] - oo[k]) / dd[k];
      if (a > b) [a, b] = [b, a];
      t0 = Math.max(t0, a);
      t1 = Math.min(t1, b);
      if (t0 > t1) ok = false;
    }
    if (ok && (!melhor || t0 < melhor.distancia)) melhor = { criatura: c, distancia: t0 };
  }
  return melhor;
}
