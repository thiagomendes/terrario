/**
 * A rampa de skate da Vila Neon (spec 026, parte 3): a mini rampa em U, de concreto, e o trilho
 * que leva o skate. Puro: o planejador, o núcleo, a tela e os testes fazem a mesma conta.
 *
 * - **A forma:** o fundo reto no meio (de `-meia` a `meia`, de lado), as duas curvas (um quarto de
 *   círculo de raio `raio`, que sobem até a borda de cromo a `curva` do começo delas) e o deck em
 *   cima de cada uma. A rampa corre ao longo do eixo `z`; as curvas ficam a leste e a oeste.
 * - **O trilho (dono do núcleo, como a cadeira de um brinquedo):** a criança de skate empurra o
 *   controle para uma das curvas; perto do pé dela, o núcleo põe o skate no trilho. Daí em diante
 *   ele sobe a curva sozinho, para lá em cima um instante (a prancha bate na borda: "clac") e vira
 *   de frente, desce, atravessa o fundo e chega ao pé da outra curva, onde o trilho acaba. Sem
 *   manobra, sem tombo: segurando o controle, o trilho seguinte começa dali (vai e vem).
 * - **Onde ela está** é conta do relógio do núcleo a partir do começo (`desde`): ninguém manda a
 *   posição a cada quadro, e os amigos veem igual.
 */

/** A rampa no mundo. */
export interface RampaSkate {
  /** O meio do fundo (mundo); y é o chão (onde os pés pisam). */
  x: number;
  y: number;
  z: number;
  /** Até onde se anda no fundo ao longo da rampa (mundo): o trilho fica dentro disto. */
  z0: number;
  z1: number;
  /** Metade da largura do fundo reto (de lado). */
  meia: number;
  /** O raio da curva e até onde ela vai, de lado, a partir do pé (a borda de cromo). */
  raio: number;
  curva: number;
  /** A largura do deck em cima de cada curva. */
  deck: number;
}

/** A rampa da Vila Neon (a medida; o lugar vem do planejador). */
export const MEDIDA_RAMPA = { meia: 3, raio: 3.5, curva: 2.8, deck: 2 } as const;

/** O skate sobe a curva até aqui (do pé dela, de lado): a prancha encosta na borda e faz "clac". */
export const ALTO_DO_TRILHO = 2.55;
/** A velocidade no fundo (blocos/s): a de quem chega andando, um pouco mais. */
export const VELOCIDADE_TRILHO = 4.6;
/** Quanto o skate fica parado lá em cima (s): ela vira de frente. */
export const PAUSA_NO_ALTO = 0.65;
/** O pé da curva: dali a criança, empurrando para a curva, entra no trilho (blocos, de lado). */
export const PE_DA_CURVA = 1.1;
/** A folga das pontas da rampa (o trilho não passa da beira). */
export const FOLGA_PONTA = 0.7;

/** A altura do deck (a borda de cromo) acima do fundo. */
export function alturaDoDeck(r: Pick<RampaSkate, 'raio' | 'curva'>): number {
  return r.raio - Math.sqrt(r.raio * r.raio - r.curva * r.curva);
}

/** A altura da superfície a `s` blocos do meio, de lado (o fundo, a curva ou o deck). */
export function alturaNaRampa(r: Pick<RampaSkate, 'meia' | 'raio' | 'curva'>, s: number): number {
  const d = Math.abs(s) - r.meia;
  if (d <= 0) return 0;
  if (d >= r.curva) return alturaDoDeck(r);
  return r.raio - Math.sqrt(r.raio * r.raio - d * d);
}

/** A inclinação da superfície a `s` (rad; positiva subindo para +s). */
export function inclinacaoNaRampa(r: Pick<RampaSkate, 'meia' | 'raio' | 'curva'>, s: number): number {
  const d = Math.abs(s) - r.meia;
  if (d <= 0 || d >= r.curva) return 0;
  return Math.sign(s) * Math.asin(Math.min(1, d / r.raio));
}

/** Está em cima do fundo da rampa (de pé, para entrar no trilho)? `s` de lado, `z` ao longo. */
export function noFundo(r: RampaSkate, x: number, z: number): boolean {
  const s = x - r.x;
  return Math.abs(s) <= r.meia + 0.25 && z >= r.z0 + FOLGA_PONTA && z <= r.z1 - FOLGA_PONTA;
}

/** Um trilho: para que lado (+1 a curva do leste, -1 a do oeste), de onde e quando começou. */
export interface Trilho {
  lado: 1 | -1;
  /** De lado (a partir do meio) e ao longo (mundo), onde a criança estava. */
  s0: number;
  z: number;
  desde: number;
}

/** As partes do trilho (s): subir, parar lá em cima, descer a curva, atravessar o fundo. */
export function tempos(r: Pick<RampaSkate, 'meia'>, t: Pick<Trilho, 's0' | 'lado'>) {
  const v = VELOCIDADE_TRILHO;
  const alto = r.meia + ALTO_DO_TRILHO;
  // subir: do pé dela até o alto, freando (começa na velocidade do fundo, chega parada)
  const sobe = Math.max(0.05, alto - t.lado * t.s0);
  const subir = (Math.PI / 2) * (sobe / v);
  // descer a curva: parada lá em cima, acelerando até a velocidade do fundo no pé
  const descer = (Math.PI / 2) * (ALTO_DO_TRILHO / v);
  // atravessar o fundo, na velocidade dele, até o pé da outra curva
  const atravessar = (2 * r.meia) / v;
  return {
    subir,
    pausa: PAUSA_NO_ALTO,
    descer,
    atravessar,
    total: subir + PAUSA_NO_ALTO + descer + atravessar,
  };
}

/** Quanto dura o trilho inteiro (s). */
export function duracaoDoTrilho(r: Pick<RampaSkate, 'meia'>, t: Pick<Trilho, 's0' | 'lado'>): number {
  return tempos(r, t).total;
}

/** O lugar no trilho: de lado, a altura, o rumo do corpo, a inclinação e a fase. */
export interface NoTrilho {
  x: number;
  y: number;
  z: number;
  /** Para onde o corpo olha (yaw: frente = seno, cosseno). */
  yaw: number;
  /** A inclinação da prancha (rad, positiva com o bico para cima). */
  inclina: number;
  /** 'sobe', 'alto' (parado lá em cima), 'desce', 'fundo' ou 'fim' (acabou). */
  fase: 'sobe' | 'alto' | 'desce' | 'fundo' | 'fim';
  /** De lado (a partir do meio da rampa). */
  s: number;
}

const suave = (k: number) => {
  const c = Math.max(0, Math.min(1, k));
  return c * c * (3 - 2 * c);
};

/** Onde o skate está no trilho no instante `agora` (do núcleo). */
export function lugarNoTrilho(r: RampaSkate, t: Trilho, agora: number): NoTrilho {
  const T = tempos(r, t);
  const L = t.lado;
  const alto = L * (r.meia + ALTO_DO_TRILHO);
  const pe = -L * r.meia;
  const z = Math.min(r.z1 - FOLGA_PONTA, Math.max(r.z0 + FOLGA_PONTA, t.z));
  // o rumo: indo para a curva de +x, olha para +x (yaw π/2); voltando, para -x
  const ida = L > 0 ? Math.PI / 2 : -Math.PI / 2;
  const volta = L > 0 ? -Math.PI / 2 : Math.PI / 2;
  let f = Math.max(0, agora - t.desde);
  let s: number;
  let yaw = ida;
  let fase: NoTrilho['fase'];
  if (f < T.subir) {
    const u = f / T.subir;
    s = t.s0 + (alto - t.s0) * Math.sin((u * Math.PI) / 2);
    fase = 'sobe';
  } else if ((f -= T.subir) < T.pausa) {
    s = alto;
    // vira de frente devagar, no meio da pausa (o corpo gira; a prancha vai junto)
    const k = suave((f / T.pausa - 0.15) / 0.7);
    yaw = ida + (L > 0 ? -Math.PI : Math.PI) * k;
    fase = 'alto';
  } else if ((f -= T.pausa) < T.descer) {
    const u = f / T.descer;
    const pe0 = L * r.meia;
    s = alto + (pe0 - alto) * (1 - Math.cos((u * Math.PI) / 2));
    yaw = volta;
    fase = 'desce';
  } else if ((f -= T.descer) < T.atravessar) {
    const u = f / T.atravessar;
    s = L * r.meia + (pe - L * r.meia) * u;
    yaw = volta;
    fase = 'fundo';
  } else {
    s = pe;
    yaw = volta;
    fase = 'fim';
  }
  // a prancha segue a curva; voltando, o bico aponta para o outro lado
  // (virando lá em cima, a inclinação passa pelo zero quando a prancha fica de lado na curva)
  const inclina = inclinacaoNaRampa(r, s) * L * Math.cos(yaw - ida);
  return { x: r.x + s, y: r.y + alturaNaRampa(r, s), z, yaw, inclina, fase, s };
}

/** O instante (s desde o começo) em que a prancha bate na borda lá em cima (o "clac"). */
export function instanteDoClac(r: Pick<RampaSkate, 'meia'>, t: Pick<Trilho, 's0' | 'lado'>): number {
  return tempos(r, t).subir;
}

/**
 * A criança de skate, no fundo, empurrando o controle (o rumo no chão, `vx` e `vz`) entra no
 * trilho? Só perto do pé de uma curva e indo para ela: devolve o lado (ou 0).
 */
export function entraNoTrilho(
  r: RampaSkate,
  x: number,
  z: number,
  vx: number,
  vz: number,
): 0 | 1 | -1 {
  if (!noFundo(r, x, z)) return 0;
  const s = x - r.x;
  const lado: 1 | -1 = s >= 0 ? 1 : -1;
  if (Math.abs(s) < r.meia - PE_DA_CURVA) return 0;
  const v = Math.hypot(vx, vz);
  // indo para a curva (o rumo mais de lado do que ao longo)
  if (v < 0.2 || vx * lado < 0.55 * v) return 0;
  return lado;
}

/** O que o núcleo confere ao pôr no trilho: a criança está no fundo, perto do pé da curva. */
export function podeEntrar(r: RampaSkate, x: number, y: number, z: number, lado: number): boolean {
  if (lado !== 1 && lado !== -1) return false;
  if (Math.abs(y - r.y) > 1.2) return false;
  const s = x - r.x;
  // (folga de meio bloco: o aparelho manda um pouco antes de o quadro chegar)
  if (!(Math.abs(s) <= r.meia + 0.6) || z < r.z0 || z > r.z1) return false;
  return s * lado >= r.meia - PE_DA_CURVA - 1.2;
}

/** O trilho do quadro (o que vai pela rede): [lado, s0 × 100, z × 100, desde]. */
export type TrilhoNaRede = [number, number, number, number];

export const trilhoDaRede = (q: TrilhoNaRede | undefined | null): Trilho | null => {
  if (!Array.isArray(q) || q.length !== 4) return null;
  const [l, s, z, d] = q;
  if ((l !== 1 && l !== -1) || ![s, z, d].every(Number.isFinite)) return null;
  return { lado: l, s0: s / 100, z: z / 100, desde: d };
};

export const trilhoParaARede = (t: Trilho): TrilhoNaRede => [
  t.lado,
  Math.round(t.s0 * 100),
  Math.round(t.z * 100),
  Math.round(t.desde * 1000) / 1000,
];
