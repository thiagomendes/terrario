/**
 * O bate-bate de guiar (spec 026, parte 2; dono, 16 nov 2026: "aumentar a pista do bate-bate,
 * deixar maior para o usuário poder guiar o carrinho e bater no outro de fato"). Puro: o núcleo
 * simula os carrinhos de verdade, a tela prevê o da criança com a mesma conta, e os testes
 * conferem as duas.
 *
 * - **Guiar é apontar:** o controle diz para onde ir (um rumo no mundo) e o carrinho vira devagar
 *   para lá enquanto anda. Não tem ré nem derrapagem: com o rumo para trás ele gira quase parado
 *   e só então acelera. Uma criança de 3 anos empurra o controle e o carrinho vai.
 * - **Bater é de verdade:** os carrinhos são rodas de borracha (um círculo cada um). Dois que se
 *   encontram se afastam, trocam um empurrão elástico (que some em menos de um segundo) e perdem
 *   o embalo; a mureta devolve do mesmo jeito. O empurrão tem teto: ninguém voa.
 * - **Nunca vira, nunca sai, nunca fica preso:** o carrinho só gira no chão, o lugar dele é sempre
 *   dentro da mureta, e quem empurra o controle sem sair do lugar por mais de um segundo ganha um
 *   empurrãozinho para o meio da pista.
 * - **Os moradores** guiam devagar de um ponto a outro, desviam de criança parada e, depois de
 *   bater numa criança, vão para longe dela por uns segundos (nada de bater de novo e de novo).
 * - **O carrinho sem ninguém** volta sozinho, devagar, para a vaga dele na beira da pista.
 */

/** O passo da conta (s): o do núcleo. */
export const PASSO_BATE = 0.05;
/** Quantos carrinhos: os primeiros são dos moradores, os outros das crianças. */
export const N_CARRINHOS = 8;
export const N_MORADORES_BATE = 4;
/** Os moradores que guiam: o `n` do primeiro (os outros vêm em seguida, um por carrinho). */
export const N0_PILOTOS = 66;
/** O carrinho do morador de número `n` (-1: não é piloto do bate-bate). */
export const pilotoDoBate = (n: number): number =>
  n >= N0_PILOTOS && n < N0_PILOTOS + N_MORADORES_BATE ? n - N0_PILOTOS : -1;
/** O raio do para-choque (blocos). */
export const RAIO_CARRINHO = 0.96;
/** A velocidade com o controle todo empurrado (blocos/s) e quanto o morador empurra (0 a 1). */
export const VEL_GUIAR = 3.4;
export const PE_DO_MORADOR = 0.7;
/** Acelerar e frear (blocos/s²): chega na velocidade em menos de um segundo. */
export const ACELERA = 5.5;
export const FREIA = 7;
/** Virar (rad/s): o teto e o ganho (vira mais devagar quando já está quase no rumo). */
export const VIRA = 2.5;
const GANHO_VIRA = 4.5;
/** Abaixo disto o controle está solto. */
export const CONTROLE_SOLTO = 0.12;
/** O empurrão da batida: o teto (blocos/s), quanto some por segundo e quanto volta (0 a 1). */
export const EMPURRAO_MAX = 3.6;
const AMORTECE = 3.6;
const ELASTICO = 0.62;
/** Mais devagar que isto (blocos/s, um contra o outro) é encostar, não bater. */
export const BATIDA_MINIMA = 1.2;
/** Preso: empurrando o controle e andando menos que isto (blocos/s) por este tempo (s). */
const QUASE_PARADO = 0.35;
export const TEMPO_PRESO = 1.1;
const EMPURRAO_PRESO = 2.8;

export interface Carrinho {
  x: number;
  z: number;
  /** Para onde aponta (frente = seno, cosseno). */
  yaw: number;
  /** O embalo para a frente (blocos/s, nunca negativo: não tem ré). */
  v: number;
  /** O empurrão da última batida (blocos/s; some sozinho). */
  kx: number;
  kz: number;
  /** Há quanto tempo empurra o controle sem sair do lugar (s). */
  p: number;
}

/** A pista por dentro: as faces da mureta (o para-choque encosta nelas). */
export interface PistaBate {
  x0: number;
  z0: number;
  x1: number;
  z1: number;
}

/** O controle de um carrinho: o rumo no mundo (0 a 1 de força). `null`: segue como está. */
export type Guia = { x: number; z: number } | null;

/** Uma batida: o carrinho `a` no `b` (-1: na mureta), a força (blocos/s) e onde foi. */
export interface Batida {
  a: number;
  b: number;
  f: number;
  x: number;
  z: number;
}

export const novoCarrinho = (x: number, z: number, yaw = 0): Carrinho => ({
  x,
  z,
  yaw,
  v: 0,
  kx: 0,
  kz: 0,
  p: 0,
});

/** A menor diferença entre dois rumos (-π a π). */
export const difRumo = (a: number, b: number): number =>
  Math.atan2(Math.sin(a - b), Math.cos(a - b));

const limitar = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);

/** O controle que veio da rede (inteiros de -100 a 100) virando um rumo de 0 a 1. */
export function guiaDaRede(x: number, z: number): { x: number; z: number } {
  const gx = limitar(Number.isFinite(x) ? x : 0, -100, 100) / 100;
  const gz = limitar(Number.isFinite(z) ? z : 0, -100, 100) / 100;
  const m = Math.hypot(gx, gz);
  return m > 1 ? { x: gx / m, z: gz / m } : { x: gx, z: gz };
}

/** O teto do empurrão (ninguém voa). */
function comTeto(c: Carrinho): void {
  const m = Math.hypot(c.kx, c.kz);
  if (m > EMPURRAO_MAX) {
    c.kx *= EMPURRAO_MAX / m;
    c.kz *= EMPURRAO_MAX / m;
  }
}

/**
 * Um passo de todos os carrinhos (muda `carros` no lugar). `guias[i]` é o controle do carrinho
 * `i` (`null` ou faltando: ele segue como vinha, o palpite de quem só olha). As batidas do
 * passo entram em `batidas`, se dada.
 */
export function passoBate(
  pista: PistaBate,
  carros: Carrinho[],
  guias: readonly Guia[],
  dt: number = PASSO_BATE,
  batidas?: Batida[],
): void {
  const R = RAIO_CARRINHO;
  const n = carros.length;
  const mx = (pista.x0 + pista.x1) / 2;
  const mz = (pista.z0 + pista.z1) / 2;
  const some = Math.exp(-AMORTECE * dt);
  const antes: number[] = [];
  for (let i = 0; i < n; i++) {
    const c = carros[i];
    antes.push(c.x, c.z);
    const g = guias[i] ?? null;
    if (g) {
      const m = Math.min(1, Math.hypot(g.x, g.z));
      let alvo = 0;
      if (m > CONTROLE_SOLTO) {
        const d = difRumo(Math.atan2(g.x, g.z), c.yaw);
        const giro = limitar(d * GANHO_VIRA, -VIRA, VIRA) * dt;
        // (nunca passa do rumo: sem ficar balançando de um lado para o outro)
        c.yaw += Math.abs(giro) > Math.abs(d) ? d : giro;
        // de frente para o rumo anda; de lado ou de costas, primeiro vira
        alvo = VEL_GUIAR * m * Math.max(0, Math.cos(d));
      }
      c.v += limitar(alvo - c.v, -FREIA * dt, ACELERA * dt);
      if (c.v < 0) c.v = 0;
    }
    c.kx *= some;
    c.kz *= some;
    c.x += (Math.sin(c.yaw) * c.v + c.kx) * dt;
    c.z += (Math.cos(c.yaw) * c.v + c.kz) * dt;
  }
  // os encontros: duas voltas (três carrinhos juntos num canto se acertam)
  for (let volta = 0; volta < 2; volta++) {
    for (let i = 0; i < n; i++) {
      const a = carros[i];
      for (let j = i + 1; j < n; j++) {
        const b = carros[j];
        let dx = b.x - a.x;
        let dz = b.z - a.z;
        let d = Math.hypot(dx, dz);
        if (d >= 2 * R) continue;
        if (d < 1e-6) {
          // um em cima do outro (não acontece andando): cada um para um lado, sempre o mesmo
          dx = 1;
          dz = 0;
          d = 1;
          a.x -= 1e-3;
          b.x += 1e-3;
        }
        const nx = dx / d;
        const nz = dz / d;
        const sobra = (2 * R - Math.hypot(b.x - a.x, b.z - a.z)) / 2;
        a.x -= nx * sobra;
        a.z -= nz * sobra;
        b.x += nx * sobra;
        b.z += nz * sobra;
        // quanto vinham um contra o outro
        const va = (Math.sin(a.yaw) * a.v + a.kx) * nx + (Math.cos(a.yaw) * a.v + a.kz) * nz;
        const vb = (Math.sin(b.yaw) * b.v + b.kx) * nx + (Math.cos(b.yaw) * b.v + b.kz) * nz;
        const vr = va - vb;
        if (vr <= 0) continue;
        if (vr >= BATIDA_MINIMA) {
          const imp = (vr * (1 + ELASTICO)) / 2;
          a.kx -= nx * imp;
          a.kz -= nz * imp;
          b.kx += nx * imp;
          b.kz += nz * imp;
          comTeto(a);
          comTeto(b);
          // quem vinha de frente perde o embalo (o motor não empurra o outro pela pista)
          const fa = Math.sin(a.yaw) * nx + Math.cos(a.yaw) * nz;
          const fb = -(Math.sin(b.yaw) * nx + Math.cos(b.yaw) * nz);
          if (fa > 0) a.v *= 1 - 0.75 * fa;
          if (fb > 0) b.v *= 1 - 0.75 * fb;
          batidas?.push({ a: i, b: j, f: vr, x: a.x + nx * R, z: a.z + nz * R });
        } else {
          // encostados: o empurrão de um contra o outro acaba (sem tremer) e quem empurra vai
          // devagarinho (leva o outro pela pista sem ficar batendo de pouquinho)
          const fa = Math.sin(a.yaw) * nx + Math.cos(a.yaw) * nz;
          const fb = -(Math.sin(b.yaw) * nx + Math.cos(b.yaw) * nz);
          if (fa > 0) a.v *= 1 - 0.35 * fa;
          if (fb > 0) b.v *= 1 - 0.35 * fb;
          const ka = a.kx * nx + a.kz * nz;
          if (ka > 0) {
            a.kx -= nx * ka;
            a.kz -= nz * ka;
          }
          const kb = b.kx * nx + b.kz * nz;
          if (kb < 0) {
            b.kx -= nx * kb;
            b.kz -= nz * kb;
          }
        }
      }
    }
    // a mureta: o lugar do carrinho é sempre dentro dela
    for (let i = 0; i < n; i++) {
      const c = carros[i];
      for (const eixo of ['x', 'z'] as const) {
        const lo = (eixo === 'x' ? pista.x0 : pista.z0) + R;
        const hi = (eixo === 'x' ? pista.x1 : pista.z1) - R;
        const pos = c[eixo];
        if (pos >= lo && pos <= hi) continue;
        // (para fora: -1 na mureta de baixo, +1 na de cima)
        const s = pos < lo ? -1 : 1;
        c[eixo] = s < 0 ? lo : hi;
        const frente = eixo === 'x' ? Math.sin(c.yaw) : Math.cos(c.yaw);
        const k = eixo === 'x' ? c.kx : c.kz;
        const contra = (frente * c.v + k) * s;
        if (contra <= 0) continue;
        if (contra >= BATIDA_MINIMA) {
          const devolve = -s * Math.min(EMPURRAO_MAX, contra * ELASTICO);
          if (eixo === 'x') c.kx = devolve;
          else c.kz = devolve;
          if (frente * s > 0) c.v *= 1 - 0.75 * frente * s;
          batidas?.push({
            a: i,
            b: -1,
            f: contra,
            x: eixo === 'x' ? c.x + s * R : c.x,
            z: eixo === 'z' ? c.z + s * R : c.z,
          });
        } else {
          // encostado na mureta: o embalo contra ela acaba (sem ficar batendo de pouquinho)
          if (k * s > 0) {
            if (eixo === 'x') c.kx = 0;
            else c.kz = 0;
          }
          if (frente * s > 0) c.v *= 1 - frente * s;
        }
      }
    }
  }
  for (let i = 0; i < n; i++) {
    const c = carros[i];
    // (nenhuma conta estranha tira o carrinho da pista)
    if (!Number.isFinite(c.x + c.z + c.yaw + c.v + c.kx + c.kz)) {
      c.x = mx;
      c.z = mz;
      c.yaw = 0;
      c.v = c.kx = c.kz = 0;
    }
    c.x = limitar(c.x, pista.x0 + R, pista.x1 - R);
    c.z = limitar(c.z, pista.z0 + R, pista.z1 - R);
    if (c.yaw > Math.PI || c.yaw < -Math.PI) c.yaw = difRumo(c.yaw, 0);
    // preso: empurra o controle e não sai do lugar → um empurrãozinho para o meio da pista
    const g = guias[i] ?? null;
    const andou = Math.hypot(c.x - antes[i * 2], c.z - antes[i * 2 + 1]) / dt;
    if (g && Math.hypot(g.x, g.z) > 0.3 && andou < QUASE_PARADO) c.p += dt;
    else c.p = 0;
    if (c.p >= TEMPO_PRESO) {
      c.p = 0;
      const d = Math.hypot(mx - c.x, mz - c.z) || 1;
      c.kx += ((mx - c.x) / d) * EMPURRAO_PRESO;
      c.kz += ((mz - c.z) / d) * EMPURRAO_PRESO;
      comTeto(c);
    }
  }
}

// ---------------------------------------------------------------------------------------
// quem guia sem criança: os moradores e o carrinho que volta para a vaga
// ---------------------------------------------------------------------------------------

/** A cabeça de um morador que guia: para onde vai, até quando, e de quem desvia. */
export interface Piloto {
  ax: number;
  az: number;
  /** Quando escolhe outro ponto (s). */
  ate: number;
  /** Depois de bater numa criança: foge dela (`evita`) até `calma` (s). */
  evita: number;
  calma: number;
  /** A semente da sorte dele. */
  s: number;
}

export const novoPiloto = (semente: number): Piloto => ({
  ax: 0,
  az: 0,
  ate: -1,
  evita: -1,
  calma: -1,
  s: semente >>> 0 || 1,
});

/** A sorte do piloto (0 a 1), sempre a mesma para a mesma semente. */
function sorte(p: Piloto): number {
  p.s = (p.s + 0x6d2b79f5) >>> 0;
  let t = p.s;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** De quem o morador desvia: até onde (blocos) e com que força. */
const DESVIA_DE_CRIANCA = 3.8;
const DESVIA_DE_VAZIO = 2.7;
const DESVIA_DE_MORADOR = 3.2;
/** Com alguém na frente a menos que isto (blocos), o morador tira o pé até este tanto. */
const FREIA_A = 3.4;
const PE_PERTO_DE_PARADO = 0.3;
const PE_ENTRE_MORADORES = 0.55;
/** Depois de bater numa criança, quanto tempo o morador fica longe dela (s). */
export const CALMA_DO_MORADOR = 4.5;

/** O que o morador sabe de cada carrinho da pista. */
export type QuemGuia = 'morador' | 'crianca' | 'vazio';

/**
 * O controle do morador do carrinho `i` neste passo (muda `p`: o ponto e a sorte). Ele vai de um
 * ponto a outro da pista; de vez em quando escolhe ir atrás de uma criança que está andando (para
 * ela ter com quem bater); desvia de criança parada, de carrinho vazio e, um pouco, dos outros
 * moradores.
 */
export function guiaDoMorador(
  pista: PistaBate,
  carros: readonly Carrinho[],
  i: number,
  p: Piloto,
  t: number,
  quem: (j: number) => QuemGuia,
): { x: number; z: number } {
  const c = carros[i];
  const borda = RAIO_CARRINHO + 1.2;
  const sortear = () => {
    p.ax = pista.x0 + borda + sorte(p) * (pista.x1 - pista.x0 - 2 * borda);
    p.az = pista.z0 + borda + sorte(p) * (pista.z1 - pista.z0 - 2 * borda);
    p.ate = t + 3 + sorte(p) * 4;
  };
  const fugindo = t < p.calma && p.evita >= 0;
  if (t >= p.ate || Math.hypot(p.ax - c.x, p.az - c.z) < 1.3) {
    sortear();
    // uma vez em três: vai brincar com uma criança que está andando
    if (!fugindo && sorte(p) < 0.36) {
      const andando: number[] = [];
      for (let j = 0; j < carros.length; j++)
        if (quem(j) === 'crianca' && carros[j].v > 1.2) andando.push(j);
      if (andando.length) {
        const a = carros[andando[Math.floor(sorte(p) * andando.length) % andando.length]];
        p.ax = a.x;
        p.az = a.z;
      }
    }
  }
  let gx = p.ax - c.x;
  let gz = p.az - c.z;
  const m = Math.hypot(gx, gz) || 1;
  gx /= m;
  gz /= m;
  let pe = 1;
  for (let j = 0; j < carros.length; j++) {
    if (j === i) continue;
    const o = carros[j];
    const q = quem(j);
    const parada = q === 'crianca' && o.v < 0.7;
    const raio =
      (fugindo && j === p.evita) || parada
        ? DESVIA_DE_CRIANCA
        : q === 'vazio'
          ? DESVIA_DE_VAZIO
          : q === 'morador'
            ? DESVIA_DE_MORADOR
            : 0;
    if (!raio) continue;
    const dx = c.x - o.x;
    const dz = c.z - o.z;
    const d = Math.hypot(dx, dz) || 1e-3;
    if (d >= raio) continue;
    const f = ((raio - d) / raio) * (q === 'morador' ? 1.6 : 3.2);
    // para longe dele e um pouco de lado (contorna em vez de frear de frente)
    gx += (dx / d) * f + (-dz / d) * f * 0.45;
    gz += (dz / d) * f + (dx / d) * f * 0.45;
    // o ponto dele ficou em cima de quem está parado: escolhe outro
    if (q !== 'morador' && Math.hypot(p.ax - o.x, p.az - o.z) < raio) p.ate = t;
    // bem na frente do nariz: tira o pé (chega devagar, encosta em vez de bater). Com outro
    // morador tira só um pouco: de vez em quando os dois batem, que é a graça do brinquedo
    const naFrente = -(dx * Math.sin(c.yaw) + dz * Math.cos(c.yaw)) / d;
    if (naFrente > 0.45 && d < FREIA_A) {
      const perto = limitar((d - 2 * RAIO_CARRINHO) / (FREIA_A - 2 * RAIO_CARRINHO), 0, 1);
      const minimo = q === 'morador' ? PE_ENTRE_MORADORES : PE_PERTO_DE_PARADO;
      pe = Math.min(pe, minimo + (1 - minimo) * perto);
    }
  }
  const g = Math.hypot(gx, gz) || 1;
  return { x: (gx / g) * PE_DO_MORADOR * pe, z: (gz / g) * PE_DO_MORADOR * pe };
}

/** O morador bateu numa criança (ou ela nele): vai para o outro lado da pista por uns segundos. */
export function acalmarPiloto(
  pista: PistaBate,
  p: Piloto,
  eu: Carrinho,
  crianca: number,
  dela: Carrinho,
  t: number,
): void {
  p.evita = crianca;
  p.calma = t + CALMA_DO_MORADOR;
  const borda = RAIO_CARRINHO + 1.2;
  const dx = eu.x - dela.x;
  const dz = eu.z - dela.z;
  const d = Math.hypot(dx, dz) || 1;
  p.ax = limitar(eu.x + (dx / d) * 7, pista.x0 + borda, pista.x1 - borda);
  p.az = limitar(eu.z + (dz / d) * 7, pista.z0 + borda, pista.z1 - borda);
  p.ate = t + 3.5;
}

/** A vaga do carrinho vazio: perto dela ele está estacionado. */
export const NA_VAGA = 0.4;

/**
 * O controle do carrinho sem ninguém: volta devagar para a vaga (`null` na vaga: o núcleo o
 * deixa parado, de frente para a pista).
 */
export function guiaParaAVaga(c: Carrinho, vaga: readonly [number, number]): Guia {
  const dx = vaga[0] - c.x;
  const dz = vaga[1] - c.z;
  const d = Math.hypot(dx, dz);
  if (d < NA_VAGA) return null;
  const f = Math.min(0.5, 0.2 + d / 8);
  return { x: (dx / d) * f, z: (dz / d) * f };
}

/** O carrinho na vaga: para e vira devagar para a pista (o rumo `yaw` da vaga). */
export function estacionar(c: Carrinho, vaga: readonly [number, number], yaw: number, dt: number) {
  c.v = Math.max(0, c.v - FREIA * dt);
  const k = Math.min(1, dt * 3);
  if (Math.hypot(c.kx, c.kz) < 0.3) {
    c.x += (vaga[0] - c.x) * k;
    c.z += (vaga[1] - c.z) * k;
  }
  const d = difRumo(yaw, c.yaw);
  c.yaw += limitar(d, -1.6 * dt, 1.6 * dt);
}

// ---------------------------------------------------------------------------------------
// o que vai pela rede
// ---------------------------------------------------------------------------------------

/**
 * Os carrinhos no quadro: o último controle da criança que o núcleo já usou (`ack`; 0 para quem
 * só olha) e, de cada carrinho, x, z, rumo, embalo e empurrão.
 */
export type BateVista = number[];
const POR_CARRINHO = 6;
const r3 = (v: number) => Math.round(v * 1000) / 1000;

export function vistaDoBate(carros: readonly Carrinho[], ack: number): BateVista {
  const v: number[] = [ack];
  for (const c of carros) v.push(r3(c.x), r3(c.z), r3(c.yaw), r3(c.v), r3(c.kx), r3(c.kz));
  return v;
}

/** Os carrinhos de um quadro (`null`: o quadro não presta). `p` vem de `antes`, se houver. */
export function carrosDaVista(
  v: BateVista | null | undefined,
  antes?: readonly Carrinho[],
): { ack: number; carros: Carrinho[] } | null {
  if (!Array.isArray(v) || (v.length - 1) % POR_CARRINHO !== 0) return null;
  for (const q of v) if (typeof q !== 'number' || !Number.isFinite(q)) return null;
  const carros: Carrinho[] = [];
  for (let i = 1; i < v.length; i += POR_CARRINHO)
    carros.push({
      x: v[i],
      z: v[i + 1],
      yaw: v[i + 2],
      v: v[i + 3],
      kx: v[i + 4],
      kz: v[i + 5],
      p: antes?.[carros.length]?.p ?? 0,
    });
  return { ack: v[0], carros };
}
