/**
 * Os sons da Noite das Fantasias (spec 027, T21), gravados no pacote de vozes do tema (seções
 * `festa` e `lugar` do `public/sons/indice.json`, síntese nossa; ver
 * `.sdd/specs/027-mundo-halloween/referencia/fontes/scripts-pacote`):
 *
 * - **Os toques da festa** (`tocar`): a campainha das portas, a lanterna acendendo, a risadinha da
 *   Lulu, o confete da travessura, o miado e o ronrono do Tufinho, o abraço do Bento, a varinha, a
 *   abóbora gigante tocada (o coaxinho do sapinho é a voz gravada dele, `vozesGravadas`). Soam
 *   pela distância de onde acontecem (cheio
 *   até 6 blocos, some até 28; o que é da própria criança soa sempre), com um intervalo mínimo por
 *   som (nada vira metralhadora). Sem o pacote, a reserva de antes (o "plim" e o brilho).
 * - **O ambiente por lugar** (`quadro`): a praça tem os sininhos das bandeirolas; a rua, a
 *   campainha e a risadinha ao longe; o bosque, o grilinho (só de noite) e a corujinha; a horta, o
 *   regador e as abóboras. Cada lugar tem um peso que sobe e desce em ~1,5 s quando a criança muda
 *   de lugar, e cada som solto sai de um lugar só, o de maior peso, com o volume do peso: nunca dois
 *   altos ao mesmo tempo. Tudo no grupo do ambiente, com o volume da natureza.
 *
 * Nada assusta: os sons são todos de brinquedo e em escala maior (a régua: nenhum acima de -12
 * LUFS momentâneo no arquivo nem na saída do jogo).
 */
import { volumeNaDistancia } from './somVila';
import type { Gerador } from './variacao';

export type SomFesta =
  | 'campainha'
  | 'lanterna'
  | 'risadinha'
  | 'confete'
  | 'miau'
  | 'ronrono'
  | 'abraco'
  | 'varinha'
  | 'abobora';

export const SONS_FESTA: readonly SomFesta[] = [
  'campainha',
  'lanterna',
  'risadinha',
  'confete',
  'miau',
  'ronrono',
  'abraco',
  'varinha',
  'abobora',
];

/** Intervalo mínimo (ms) entre dois toques do mesmo som. */
export const ESPERA_FESTA: Readonly<Record<SomFesta, number>> = {
  campainha: 350,
  lanterna: 250,
  risadinha: 600,
  confete: 500,
  miau: 700,
  ronrono: 1800,
  abraco: 900,
  varinha: 300,
  abobora: 500,
};

/** Cheio até tantos blocos de onde soa, e some até tantos. */
export const FESTA_CHEIO = 6;
export const FESTA_SOME = 28;

export type LugarFesta = 'praca' | 'rua' | 'bosque' | 'horta';
export const LUGARES_FESTA: readonly LugarFesta[] = ['praca', 'rua', 'bosque', 'horta'];

/** As zonas do plano em cada lugar do ambiente (a loja e o gramado são da festa da praça). */
export const ZONAS_DO_LUGAR: Readonly<Record<LugarFesta, readonly string[]>> = {
  praca: ['praca', 'gramado', 'loja'],
  rua: ['rua', 'vovo'],
  bosque: ['bosque', 'castelo'],
  horta: ['horta'],
};

export interface SomDoLugar {
  /** A chave na seção `lugar`. */
  chave: string;
  /** Só de noite (o grilo), só de dia, ou sempre. */
  quando?: 'noite' | 'dia';
}

/** O que cada lugar toca, e de quanto em quanto tempo (s, sorteado entre os dois). */
export const AMBIENTE_DO_LUGAR: Readonly<
  Record<LugarFesta, { sons: readonly SomDoLugar[]; intervalo: readonly [number, number] }>
> = {
  praca: { sons: [{ chave: 'sininhos' }], intervalo: [5, 10] },
  rua: { sons: [{ chave: 'campainhaLonge' }, { chave: 'risadinhaLonge' }], intervalo: [7, 13] },
  bosque: { sons: [{ chave: 'grilo', quando: 'noite' }, { chave: 'corujinha' }], intervalo: [6, 12] },
  horta: { sons: [{ chave: 'regador' }, { chave: 'abobora' }], intervalo: [7, 13] },
};

/** Quanto tempo (s) o peso de um lugar leva para ir de 0 a 1 (ou de 1 a 0). */
export const CRUZA_S = 1.5;

export interface RetanguloFesta {
  x0: number;
  z0: number;
  x1: number;
  z1: number;
}

/** O lugar do ambiente em (x, z), pelas zonas do plano (null: fora de todos). */
export function lugarDaFesta(zonas: Readonly<Record<string, RetanguloFesta>>, x: number, z: number): LugarFesta | null {
  for (const l of LUGARES_FESTA)
    for (const k of ZONAS_DO_LUGAR[l]) {
      const r = zonas[k];
      if (r && x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1) return l;
    }
  return null;
}

/** Os pesos andam para o lugar de agora: o dele sobe, os outros descem, em `CRUZA_S`. */
export function andarPesos(pesos: Record<LugarFesta, number>, lugar: LugarFesta | null, dt: number): void {
  const passo = Math.max(0, dt) / CRUZA_S;
  for (const l of LUGARES_FESTA) {
    const alvo = l === lugar ? 1 : 0;
    const v = pesos[l];
    pesos[l] = v < alvo ? Math.min(alvo, v + passo) : Math.max(alvo, v - passo);
  }
}

/** O lugar que toca agora (o de maior peso) e o volume dele. */
export function lugarQueToca(pesos: Readonly<Record<LugarFesta, number>>): { lugar: LugarFesta; peso: number } | null {
  let melhor: LugarFesta | null = null;
  for (const l of LUGARES_FESTA) if (pesos[l] > 0.02 && (!melhor || pesos[l] > pesos[melhor])) melhor = l;
  return melhor ? { lugar: melhor, peso: pesos[melhor] } : null;
}

export interface OpcoesSomBaile {
  zonas: Readonly<Record<string, RetanguloFesta>>;
  /** Toca um som do pacote do tema; false se não deu (pacote longe, sem a chave). */
  extra(secao: 'festa' | 'lugar', chave: string, volume: number, grupo: 'efeitos' | 'ambiente'): boolean;
  /** Sem o pacote: o som de antes (o "plim" ou o brilho). */
  reserva?(som: SomFesta, volume: number): void;
  /** Volume da natureza (0 a 1), o do ambiente nas configurações. */
  natureza(): number;
  rng: Gerador;
  /** Relógio (ms). */
  agora?(): number;
  /** Testes de tela: o que tocou. */
  aoTocar?(id: string): void;
}

export interface OuvinteFesta {
  x: number;
  z: number;
}

export function criarSomBaile(op: OpcoesSomBaile) {
  const agora = op.agora ?? (() => (typeof performance !== 'undefined' ? performance.now() : Date.now()));
  const ultimo = new Map<SomFesta, number>();
  const pesos: Record<LugarFesta, number> = { praca: 0, rua: 0, bosque: 0, horta: 0 };
  let lugar: LugarFesta | null = null;
  /** Quando (s) sai o próximo som solto do ambiente. */
  let proximo = -1;
  let relogio = 0;
  let tocados = 0;
  const ultimoDoLugar = new Map<LugarFesta, number>();
  const sorteio = (a: number, b: number) => a + (b - a) * op.rng();

  return {
    /**
     * Um toque da festa em `onde` (null: da própria criança, sem distância), ouvido de `ouvinte`.
     * `volume` (0 a 1) multiplica o da distância. Devolve se tocou.
     */
    tocar(som: SomFesta, onde: OuvinteFesta | null, ouvinte: OuvinteFesta | null, volume = 1): boolean {
      const d = onde && ouvinte ? Math.hypot(onde.x - ouvinte.x, onde.z - ouvinte.z) : 0;
      const v = Math.max(0, Math.min(1, volume)) * volumeNaDistancia(d, FESTA_CHEIO, FESTA_SOME);
      if (v <= 0.02) return false;
      const t = agora();
      if (t - (ultimo.get(som) ?? -Infinity) < ESPERA_FESTA[som]) return false;
      ultimo.set(som, t);
      if (op.extra('festa', som, v, 'efeitos')) {
        op.aoTocar?.(`festa:${som}`);
        return true;
      }
      op.reserva?.(som, v);
      op.aoTocar?.(`reserva:${som}`);
      return false;
    },
    /** Uma vez por quadro: o lugar de agora, os pesos e o som solto do ambiente, quando é a hora. */
    quadro(dt: number, ouvinte: OuvinteFesta, noite: number): void {
      relogio += Math.max(0, dt);
      lugar = lugarDaFesta(op.zonas, ouvinte.x, ouvinte.z);
      andarPesos(pesos, lugar, dt);
      const vez = lugarQueToca(pesos);
      if (!vez) {
        proximo = -1;
        return;
      }
      const cfg = AMBIENTE_DO_LUGAR[vez.lugar];
      // (chegou num lugar: o primeiro som vem logo, uns 2 a 4 s depois)
      if (proximo < 0) proximo = relogio + sorteio(2, 4);
      if (relogio < proximo) return;
      proximo = relogio + sorteio(cfg.intervalo[0], cfg.intervalo[1]);
      const sons = cfg.sons.filter((s) => !s.quando || (s.quando === 'noite') === noite > 0.5);
      if (!sons.length) return;
      // (sem repetir o último do lugar, quando há mais de um)
      let i = Math.floor(op.rng() * sons.length);
      if (sons.length > 1 && i === ultimoDoLugar.get(vez.lugar)) i = (i + 1) % sons.length;
      ultimoDoLugar.set(vez.lugar, i);
      const v = vez.peso * Math.max(0, Math.min(1, op.natureza()));
      if (v <= 0.02) return;
      if (op.extra('lugar', sons[i].chave, v, 'ambiente')) {
        tocados++;
        op.aoTocar?.(`ambiente:${vez.lugar}:${sons[i].chave}`);
      }
    },
    info: () => ({ lugar, pesos: { ...pesos }, tocados, proximo, relogio }),
  };
}

export type SomBaile = ReturnType<typeof criarSomBaile>;
