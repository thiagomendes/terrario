import { colideCorpo, type Solido } from '../player/fisica';
import type { Gerador } from '../audio/variacao';
import type { Drop } from './drops';

export type TipoCriatura = 'cervo' | 'coelho' | 'peixe' | 'espectro' | 'raposa';
export type Comportamento = 'passivo' | 'peixe' | 'hostil' | 'companheiro';

export interface DefCriatura {
  tipo: TipoCriatura;
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

export const CRIATURAS: Record<TipoCriatura, DefCriatura> = {
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
};

export interface Criatura {
  id: number;
  tipo: TipoCriatura;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  yaw: number;
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
  dano?: number;
  drops?: Drop[];
}

const GRAVIDADE = 22;

export function novaCriatura(
  id: number,
  tipo: TipoCriatura,
  x: number,
  y: number,
  z: number,
): Criatura {
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
  };
}

function mover(c: Criatura, def: DefCriatura, dt: number, m: Mundo, nadando: boolean): void {
  const tentar = (eixo: 'x' | 'z', d: number) => {
    if (d === 0) return;
    const nx = eixo === 'x' ? c.x + d : c.x;
    const nz = eixo === 'z' ? c.z + d : c.z;
    if (!colideCorpo(m.solido, nx, c.y, nz, def.mw, def.alt)) {
      c[eixo] += d;
    } else if (c.noChao && !colideCorpo(m.solido, nx, c.y + 1.05, nz, def.mw, def.alt)) {
      c.vy = 7.2; // pula um bloco
    } else {
      c[eixo === 'x' ? 'vx' : 'vz'] = 0;
    }
  };
  tentar('x', c.vx * dt);
  tentar('z', c.vz * dt);
  if (def.comportamento === 'peixe') {
    c.vy *= 0.9;
  } else if (nadando) {
    c.vy = Math.min(c.vy + 14 * dt, 1.8);
  } else {
    c.vy = Math.max(c.vy - GRAVIDADE * dt, -30);
  }
  const ny = c.y + c.vy * dt;
  if (!colideCorpo(m.solido, c.x, ny, c.z, def.mw, def.alt)) {
    c.y = ny;
    c.noChao = false;
  } else {
    if (c.vy < 0) {
      c.y = Math.floor(ny) + 1;
      c.noChao = true;
    }
    c.vy = 0;
  }
}

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
  c.yaw = Math.atan2(dx, dz);
  return d;
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
  hostisPerto: Criatura[],
  noite: number,
): EventoCriatura[] {
  const def = CRIATURAS[c.tipo];
  const ev: EventoCriatura[] = [];
  c.idade += dt;
  c.tempoEstado -= dt;
  c.recarga = Math.max(0, c.recarga - dt);
  c.ferida = Math.max(0, c.ferida - dt);
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
  const dxj = j.x - c.x;
  const dzj = j.z - c.z;
  const distJ = Math.hypot(dxj, dzj, j.y - c.y);

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
        c.alvoX = c.x + (rng() - 0.5) * 10;
        c.alvoZ = c.z + (rng() - 0.5) * 10;
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
        if (c.tipo === 'coelho' && c.noChao) c.vy = 5;
        break;
      }
      if (c.tempoEstado <= 0) {
        if (rng() < 0.4) {
          c.estado = 'parado';
          c.tempoEstado = 2 + rng() * 4;
        } else {
          c.estado = 'vagar';
          c.tempoEstado = 3 + rng() * 4;
          c.alvoX = c.x + (rng() - 0.5) * 14;
          c.alvoZ = c.z + (rng() - 0.5) * 14;
        }
      }
      if (c.estado === 'vagar') {
        if (andarPara(c, def, c.alvoX, c.alvoZ, 0.6) < 0.4) c.tempoEstado = 0;
        if (c.tipo === 'coelho' && c.noChao && rng() < dt * 2) c.vy = 4.5;
      } else {
        c.vx *= 0.7;
        c.vz *= 0.7;
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
        if (m.luzBloco(proxX, by, proxZ) >= 9) {
          c.vx *= 0.5;
          c.vz *= 0.5;
        } else andarPara(c, def, j.x, j.z, 1);
        if (distJ < 1.4 && c.recarga <= 0) {
          c.recarga = 1.1;
          ev.push({ tipo: 'ataque', criatura: c, dano: def.dano });
        }
      } else {
        if (c.tempoEstado <= 0) {
          c.tempoEstado = 3 + rng() * 3;
          c.alvoX = c.x + (rng() - 0.5) * 12;
          c.alvoZ = c.z + (rng() - 0.5) * 12;
        }
        andarPara(c, def, c.alvoX, c.alvoZ, 0.5);
      }
      if (rng() < dt * 0.15) ev.push({ tipo: 'som', criatura: c });
      break;
    }
    case 'companheiro': {
      if (!c.domada) {
        if (c.tempoEstado <= 0) {
          c.tempoEstado = 2 + rng() * 4;
          c.alvoX = c.x + (rng() - 0.5) * 10;
          c.alvoZ = c.z + (rng() - 0.5) * 10;
        }
        // curiosa: chega perto mas mantém distância
        if (distJ < 6 && distJ > 2.5) andarPara(c, def, j.x, j.z, 0.5);
        else andarPara(c, def, c.alvoX, c.alvoZ, 0.4);
        break;
      }
      const inimigo = hostisPerto
        .filter((h) => h.estado !== 'morrendo')
        .map((h) => ({ h, d: Math.hypot(h.x - c.x, h.z - c.z) }))
        .filter((o) => o.d < 10)
        .sort((a, b) => a.d - b.d)[0];
      if (inimigo) {
        andarPara(c, def, inimigo.h.x, inimigo.h.z, 1.1);
        if (inimigo.d < 1.3 && c.recarga <= 0) {
          c.recarga = 0.8;
          ev.push(...ferir(inimigo.h, def.dano ?? 2, rng, c.x, c.z));
        }
      } else if (distJ > 3.5) {
        c.estado = 'seguir';
        andarPara(c, def, j.x, j.z, distJ > 8 ? 1.3 : 0.9);
        if (distJ > 24) {
          c.x = j.x + 1;
          c.y = j.y + 0.5;
          c.z = j.z + 1;
        }
      } else {
        c.estado = 'parado';
        c.vx *= 0.6;
        c.vz *= 0.6;
        c.yaw = Math.atan2(dxj, dzj);
      }
      break;
    }
  }
  mover(c, def, dt, m, nadando && def.comportamento !== 'peixe');
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
  c.vida -= dano;
  c.ferida = 0.4;
  if (deX !== undefined && deZ !== undefined) {
    const dx = c.x - deX;
    const dz = c.z - deZ;
    const d = Math.hypot(dx, dz) || 1;
    c.vx = (dx / d) * 6;
    c.vz = (dz / d) * 6;
    c.vy = 4.5;
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
export function criaturaNaMira(
  lista: readonly Criatura[],
  o: { x: number; y: number; z: number },
  d: { x: number; y: number; z: number },
  alcance: number,
): { criatura: Criatura; distancia: number } | null {
  let melhor: { criatura: Criatura; distancia: number } | null = null;
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
