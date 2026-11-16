/**
 * O Parque de diversões da Vila Neon (spec 026, parte 2): o "sentar e ser levado". Puro: o
 * núcleo, a tela e os testes fazem a mesma conta.
 *
 * - **A roda-gigante e o carrossel giram sempre, no relógio do mundo** (o do núcleo): a roda dá
 *   uma volta a cada 25 s e o carrossel a cada 18 s. Onde está cada cadeira deles é uma conta do
 *   tempo: todo mundo vê a mesma coisa, sem mensagem nenhuma por quadro.
 * - **O núcleo é dono das cadeiras:** quem senta, em qual, e quando desce. A criança sentada fica
 *   onde a cadeira está (a física dela descansa).
 * - **Roda-gigante:** senta na cadeirinha de baixo, dá uma volta inteira e desce sozinha. Um toque
 *   na roda dá um empurrãozinho (ela adianta meia cadeira em 2,5 s, para todos) e as lâmpadas piscam.
 * - **Carrossel:** o cavalinho sobe e desce enquanto gira; desce quando a criança escolhe.
 * - **Bate-bate:** a criança guia o carrinho e bate de verdade nos outros (a conta dos carrinhos é
 *   de `src/jogo/bate.ts`, simulada no núcleo): aqui o lugar da cadeira é o do carrinho que o
 *   núcleo (ou a previsão da tela) diz.
 */
import { N_CARRINHOS, N_MORADORES_BATE } from './bate';

export type Brinquedo = 'roda' | 'carrossel' | 'bate';
export const BRINQUEDOS: readonly Brinquedo[] = ['roda', 'carrossel', 'bate'];

/** Quantas cadeiras tem cada brinquedo (cadeirinhas, cavalinhos, carrinhos). */
export const CADEIRAS: Readonly<Record<Brinquedo, number>> = {
  roda: 8,
  carrossel: 8,
  bate: N_CARRINHOS,
};

/** A roda-gigante: uma volta a cada tantos segundos. */
export const VOLTA_RODA = 25;
/** O empurrãozinho do toque: quanto a roda adianta (rad) e em quanto tempo (s). */
export const EMPURRAO_RODA = Math.PI / 8;
export const DURA_EMPURRAO = 2.5;
/** Do eixo da cadeirinha (no aro) até o assento, para baixo (blocos). */
export const PENDURA_RODA = 1.3;
/** O carrossel: uma volta a cada tantos segundos; o cavalinho sobe e desce a cada tantos. */
export const VOLTA_CARROSSEL = 18;
export const SOBE_DESCE = 3.2;
export const ALTURA_SOBE_DESCE = 0.32;
/** O "tum": quanto dura o balanço do carrinho (s). */
export const DURA_TUM = 0.9;

/** Um lugar no mundo com o rumo do corpo (yaw: frente = seno, cosseno). */
export interface Lugar {
  x: number;
  y: number;
  z: number;
  yaw: number;
}

export interface RodaGigante {
  /** O eixo (o meio da roda, no alto). */
  x: number;
  y: number;
  z: number;
  raio: number;
  /** A roda fica de pé no plano deste eixo ('x': gira no plano x-y, de frente para +z). */
  eixo: 'x' | 'z';
  /** Onde a criança desce (no chão, na frente da roda). */
  saida: [number, number, number];
}

export interface Carrossel {
  /** O meio do carrossel; y é o assento do cavalinho embaixo. */
  x: number;
  y: number;
  z: number;
  /** A roda dos cavalinhos e a beira da plataforma (blocos). */
  raio: number;
  beira: number;
}

export interface BateBate {
  /** O meio da pista; y é o assento do carrinho. */
  x: number;
  y: number;
  z: number;
  /** A pista por dentro: as faces da mureta (o para-choque encosta nelas). */
  x0: number;
  z0: number;
  x1: number;
  z1: number;
  /** Onde cada carrinho começa (e, os das crianças, a vaga para onde voltam vazios): x, z, rumo. */
  vagas: [number, number, number][];
  /** O tapete da saída (dentro da pista, na beira): parar nele é descer. */
  tapete: { x0: number; z0: number; x1: number; z1: number };
  /** Onde a criança desce quando para no tapete (fora da cerca, no caminho). */
  saida: [number, number, number];
}

/** Um carrinho do bate-bate, para quem só quer saber onde ele está. */
export interface CarrinhoNoLugar {
  x: number;
  z: number;
  yaw: number;
}
/** Os carrinhos de agora (do núcleo, ou da previsão da tela); sem eles, cada um na vaga. */
export type CarrinhosAgora = readonly CarrinhoNoLugar[] | null | undefined;

/** O carrinho `i` agora (sem a lista: parado na vaga dele). */
export function carrinhoAgora(b: BateBate, i: number, carros?: CarrinhosAgora): CarrinhoNoLugar {
  const c = carros?.[i];
  if (c) return c;
  const v = b.vagas[i] ?? [b.x, b.z, 0];
  return { x: v[0], z: v[1], yaw: v[2] };
}

/** O carrinho está no tapete da saída? */
export function noTapete(b: BateBate, x: number, z: number): boolean {
  const t = b.tapete;
  return x >= t.x0 && x <= t.x1 && z >= t.z0 && z <= t.z1;
}

export interface ParqueVila {
  roda: RodaGigante;
  carrossel: Carrossel;
  bate: BateBate;
}

/** A roda-gigante: o empurrão já assentado (rad) e quando começou o último (s do núcleo). */
export interface ImpulsoRoda {
  d: number;
  ti: number;
}
/** (Nenhum toque ainda: o "último empurrão" de muito antes já assentou, e os dois se anulam.) */
export const SEM_IMPULSO: ImpulsoRoda = { d: -EMPURRAO_RODA, ti: -1e9 };

const DUAS_PI = Math.PI * 2;
const suave = (k: number) => {
  const c = Math.max(0, Math.min(1, k));
  return c * c * (3 - 2 * c);
};

/** O ângulo da roda-gigante no instante `t` (rad, só cresce). */
export function anguloDaRoda(t: number, imp: ImpulsoRoda = SEM_IMPULSO): number {
  return (DUAS_PI * t) / VOLTA_RODA + imp.d + EMPURRAO_RODA * suave((t - imp.ti) / DURA_EMPURRAO);
}

/** O toque na roda: o impulso novo (o de antes, se ainda está empurrando: um por vez). */
export function empurrarRoda(imp: ImpulsoRoda, t: number): ImpulsoRoda {
  if (t - imp.ti < DURA_EMPURRAO) return imp;
  // o de antes já acabou: fica assentado, e o novo começa do zero (o ângulo não dá pulo)
  return { d: imp.d + EMPURRAO_RODA, ti: t };
}

/** O ângulo da cadeirinha `i` (0 é embaixo; cresce com a roda). */
export function anguloDaCadeirinha(i: number, t: number, imp: ImpulsoRoda = SEM_IMPULSO): number {
  return anguloDaRoda(t, imp) + (i * DUAS_PI) / CADEIRAS.roda;
}

/** O eixo da cadeirinha `i` (o ponto do aro onde ela pendura). */
export function eixoDaCadeirinha(
  r: RodaGigante,
  i: number,
  t: number,
  imp: ImpulsoRoda = SEM_IMPULSO,
): [number, number, number] {
  const a = anguloDaCadeirinha(i, t, imp);
  const lado = Math.sin(a) * r.raio;
  const y = r.y - Math.cos(a) * r.raio;
  return r.eixo === 'x' ? [r.x + lado, y, r.z] : [r.x, y, r.z + lado];
}

/** A cadeirinha mais perto de baixo agora (a que a criança pega). */
export function cadeirinhaDeBaixo(t: number, imp: ImpulsoRoda = SEM_IMPULSO): number {
  const n = CADEIRAS.roda;
  const a = anguloDaRoda(t, imp);
  // a cadeirinha i está embaixo quando a + i·2π/n é múltiplo de 2π
  const i = Math.round((-a / DUAS_PI) * n);
  return ((i % n) + n) % n;
}

/**
 * O ângulo em que o passeio de quem sentou na cadeirinha `i` em `t` acaba: a próxima passagem
 * dela por baixo depois de uma volta inteira (entre 0,94 e 1,06 volta).
 */
export function fimDoPasseio(i: number, t: number, imp: ImpulsoRoda = SEM_IMPULSO): number {
  const a = anguloDaCadeirinha(i, t, imp);
  return (Math.round(a / DUAS_PI) + 1) * DUAS_PI;
}

/** Quanto do passeio na roda já foi (0 a 1), para a câmera e os testes. */
export function progressoDoPasseio(
  i: number,
  fim: number,
  t: number,
  imp: ImpulsoRoda = SEM_IMPULSO,
): number {
  return Math.max(0, Math.min(1, 1 - (fim - anguloDaCadeirinha(i, t, imp)) / DUAS_PI));
}

/**
 * Onde está a cadeira `i` do brinquedo no instante `t` do relógio do mundo: os pés de quem está
 * sentado e para onde o corpo olha. Fora da lista de cadeiras, a cadeira 0. No bate-bate o lugar
 * é o do carrinho (`carros`: os de agora).
 */
export function lugarDaCadeira(
  p: ParqueVila,
  b: Brinquedo,
  i: number,
  t: number,
  imp: ImpulsoRoda = SEM_IMPULSO,
  carros?: CarrinhosAgora,
): Lugar {
  const n = CADEIRAS[b];
  const k = Number.isInteger(i) && i >= 0 && i < n ? i : 0;
  if (b === 'roda') {
    const [x, y, z] = eixoDaCadeirinha(p.roda, k, t, imp);
    // olhando ao longo da roda, para o lado do bairro (o oeste, ou o norte): de trás da
    // cadeirinha, entre os dois aros, a vista fica livre
    return { x, y: y - PENDURA_RODA, z, yaw: p.roda.eixo === 'x' ? -Math.PI / 2 : Math.PI };
  }
  if (b === 'carrossel') {
    const c = p.carrossel;
    const a = (DUAS_PI * t) / VOLTA_CARROSSEL + (k * DUAS_PI) / n;
    // os vizinhos sobem e descem em tempos opostos
    const sobe = (1 + Math.sin((DUAS_PI * t) / SOBE_DESCE + k * Math.PI)) / 2;
    return {
      x: c.x + Math.sin(a) * c.raio,
      y: c.y + sobe * ALTURA_SOBE_DESCE,
      z: c.z + Math.cos(a) * c.raio,
      yaw: a + Math.PI / 2,
    };
  }
  const q = carrinhoAgora(p.bate, k, carros);
  return { x: q.x, y: p.bate.y, z: q.z, yaw: q.yaw };
}

/** Do lado de fora da mureta do bate-bate: o meio da calçadinha (blocos, da face de dentro). */
const FORA_DA_MURETA = 1.5;

/**
 * Onde a criança desce do carrinho que está em (x, z): no tapete da saída, o caminho da frente;
 * no resto da pista, a calçadinha do lado de fora mais perto (um pulinho curto, nunca dentro).
 */
export function saidaDoBate(b: BateBate, x: number, z: number, chao: number): P3 {
  if (noTapete(b, x, z)) return [...b.saida];
  const lados: [number, P3][] = [
    [z - b.z0, [x, chao, b.z0 - FORA_DA_MURETA]],
    [b.z1 - z, [x, chao, b.z1 + FORA_DA_MURETA]],
    [x - b.x0, [b.x0 - FORA_DA_MURETA, chao, z]],
    [b.x1 - x, [b.x1 + FORA_DA_MURETA, chao, z]],
  ];
  lados.sort((p, q) => p[0] - q[0]);
  return lados[0][1];
}
type P3 = [number, number, number];

/** Onde a criança desce da cadeira `i` (no chão, do lado de fora, nunca dentro do brinquedo). */
export function saidaDaCadeira(
  p: ParqueVila,
  b: Brinquedo,
  i: number,
  t: number,
  chao: number,
  carros?: CarrinhosAgora,
): [number, number, number] {
  if (b === 'roda') return [...p.roda.saida];
  if (b === 'bate') {
    const c = carrinhoAgora(p.bate, i, carros);
    return saidaDoBate(p.bate, c.x, c.z, chao);
  }
  // do carrossel: para fora, no rumo do cavalinho
  const c = p.carrossel;
  const l = lugarDaCadeira(p, b, i, t);
  const d = Math.hypot(l.x - c.x, l.z - c.z) || 1;
  const fora = c.beira + 1.1;
  return [c.x + ((l.x - c.x) / d) * fora, chao, c.z + ((l.z - c.z) / d) * fora];
}

/** Até onde (blocos) a criança alcança o brinquedo para sentar. */
export const ALCANCE_SENTAR = 7;

/** A distância (no chão) da criança até o brinquedo: 0 dentro da pegada dele. */
export function distanciaDoBrinquedo(p: ParqueVila, b: Brinquedo, x: number, z: number): number {
  if (b === 'roda') {
    const r = p.roda;
    const ao = r.eixo === 'x' ? x - r.x : z - r.z;
    const fora = r.eixo === 'x' ? z - r.z : x - r.x;
    return Math.hypot(Math.max(0, Math.abs(ao) - r.raio), Math.max(0, Math.abs(fora) - 1.5));
  }
  if (b === 'carrossel') {
    const c = p.carrossel;
    return Math.max(0, Math.hypot(x - c.x, z - c.z) - c.beira);
  }
  // (a pista com a mureta em volta)
  const q = p.bate;
  return Math.hypot(
    Math.max(0, q.x0 - 1 - x, x - q.x1 - 1),
    Math.max(0, q.z0 - 1 - z, z - q.z1 - 1),
  );
}

/** Até onde (blocos) a criança alcança um carrinho livre do bate-bate para subir nele. */
export const ALCANCE_CARRINHO = 8;

/**
 * O carrinho livre do bate-bate que a criança em (x, z) pega: o das crianças mais perto dela, se
 * ela o alcança. -1: nenhum (todos com gente, ou longe).
 */
export function carrinhoLivrePerto(
  b: BateBate,
  x: number,
  z: number,
  ocupada: (i: number) => boolean,
  carros?: CarrinhosAgora,
): number {
  let melhor = -1;
  let dist = ALCANCE_CARRINHO;
  for (let i = N_MORADORES_BATE; i < N_CARRINHOS; i++) {
    if (ocupada(i)) continue;
    const c = carrinhoAgora(b, i, carros);
    const d = Math.hypot(c.x - x, c.z - z);
    if (d <= dist) {
      dist = d;
      melhor = i;
    }
  }
  return melhor;
}

/** A criança em (x, z) alcança o brinquedo para sentar? (A mesma conta na tela e no núcleo.) */
export function alcancaOBrinquedo(p: ParqueVila, b: Brinquedo, x: number, z: number): boolean {
  return distanciaDoBrinquedo(p, b, x, z) <= ALCANCE_SENTAR;
}

/**
 * A cadeira livre que a criança pega: na roda, a de baixo (ou a vizinha que vem chegando); no
 * carrossel e no bate-bate, a livre mais perto dela. -1: nenhuma livre.
 */
export function escolherCadeira(
  p: ParqueVila,
  b: Brinquedo,
  x: number,
  z: number,
  t: number,
  ocupada: (i: number) => boolean,
  imp: ImpulsoRoda = SEM_IMPULSO,
  carros?: CarrinhosAgora,
): number {
  const n = CADEIRAS[b];
  if (b === 'bate') return carrinhoLivrePerto(p.bate, x, z, ocupada, carros);
  if (b === 'roda') {
    const baixo = cadeirinhaDeBaixo(t, imp);
    // a de baixo; ocupada, a que vem chegando atrás dela; depois a que acabou de passar
    for (const d of [0, n - 1, 1]) {
      const i = (baixo + d) % n;
      if (!ocupada(i)) return i;
    }
    return -1;
  }
  let melhor = -1;
  let dist = Infinity;
  for (let i = 0; i < n; i++) {
    if (ocupada(i)) continue;
    const l = lugarDaCadeira(p, b, i, t, imp);
    const d = Math.hypot(l.x - x, l.z - z);
    if (d < dist) {
      dist = d;
      melhor = i;
    }
  }
  return melhor;
}

/** Quem está sentado: o brinquedo, a cadeira e desde quando (s do núcleo). */
export interface Sentado {
  b: Brinquedo;
  i: number;
  desde: number;
  /** Na roda-gigante: o ângulo da cadeirinha em que o passeio acaba. */
  fim?: number;
}

/** O que vai para a tela (dentro do quadro da vila). */
export interface ParqueVista {
  /** O empurrão da roda-gigante: [assentado, começo do último]. */
  r: [number, number];
  /** Quem está sentado: id do jogador → [brinquedo (0 a 2), cadeira, desde, fim da roda]. */
  s: Record<string, [number, number, number, number]>;
}

export const impulsoDaVista = (v: ParqueVista | null | undefined): ImpulsoRoda =>
  v ? { d: v.r[0], ti: v.r[1] } : SEM_IMPULSO;

/** O assento de um jogador na vista (null: em pé). */
export function sentadoNaVista(v: ParqueVista | null | undefined, id: string): Sentado | null {
  const s = v?.s[id];
  if (!s) return null;
  const b = BRINQUEDOS[s[0]];
  if (!b) return null;
  return { b, i: s[1], desde: s[2], ...(b === 'roda' ? { fim: s[3] } : {}) };
}
