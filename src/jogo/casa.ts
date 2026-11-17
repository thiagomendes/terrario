/**
 * A Casa anos 80 por dentro (spec 026, parte 3): as regras puras da sala (o núcleo, a tela e os
 * testes fazem a mesma conta).
 *
 * - **A TV e o toca-discos são da sala, de todos** (o dono: "quem troca o canal troca para todos
 *   que estão na sala"): o núcleo guarda o canal, quando ele mudou, até quando passa o filme da
 *   fita e desde quando o disco toca. Cada aparelho desenha e toca a partir disso, no relógio do
 *   núcleo (todo mundo vê o mesmo desenho no mesmo ponto).
 * - **Justo com os amigos:** trocar o canal e virar o disco têm uma esperinha para a sala inteira
 *   (ninguém troca sem parar por cima do outro), e o filme da fita passa até o fim: durante ele o
 *   canal não troca.
 * - **Os brinquedos do quarto** (o ioiô, o pião, o cubo, o robô, a bola) mexem só na tela de quem
 *   toca; o baú de brinquedos dá o ioiô, o pião e o cubo de cores para levar (um de cada).
 */
import type { PontosCasa } from '../world/vilaCasa';
import type { RetanguloVila } from '../world/vilaNeon';
import { CUBO_CORES, IOIO, PIAO } from './exclusivos';

/** Quantos canais a TV tem (quatro desenhos inventados nossos, em laço). */
export const CANAIS_TV = 4;
/** A esperinha da sala entre duas trocas de canal e entre duas viradas do disco (s). */
export const ESPERA_CANAL = 1.2;
export const ESPERA_DISCO = 1.5;
/** O filme da fita da locadora (s). */
export const DURA_FILME = 20;
/**
 * Até onde (blocos, no chão) a criança alcança a TV (e o videocassete: do sofá também, como
 * quem tem o controle remoto), o toca-discos e o baú.
 */
export const ALCANCE_TV = 9.5;
export const ALCANCE_DISCOS = 5;
export const ALCANCE_BAU = 3.6;
/** O que o baú dá, na ordem (um de cada, para levar e usar neste mundo). */
export const BRINQUEDOS_DO_BAU = [IOIO, PIAO, CUBO_CORES] as const;

/** O estado da sala, no núcleo. */
export interface EstadoCasa {
  canal: number;
  /** Quando o canal mudou pela última vez (s do núcleo). */
  trocou: number;
  /** Até quando passa o filme da fita (s do núcleo; 0 sem filme). */
  filme: number;
  /** Desde quando o disco toca (s do núcleo; -1 parado). */
  disco: number;
  /** Quando o disco foi virado pela última vez (a esperinha). */
  virou: number;
}

export const casaNova = (): EstadoCasa => ({
  canal: 0,
  trocou: -1e9,
  filme: 0,
  disco: -1,
  virou: -1e9,
});

/** O que vai no quadro: [canal, trocou, filme, disco] (os tempos em ms inteiros do núcleo). */
export type CasaNaRede = [number, number, number, number];

export const casaParaARede = (e: EstadoCasa): CasaNaRede => [
  e.canal,
  Math.round(Math.max(-1e6, e.trocou) * 1000) / 1000,
  Math.round(e.filme * 1000) / 1000,
  Math.round(e.disco * 1000) / 1000,
];

export function casaDaRede(q: unknown): EstadoCasa {
  if (!Array.isArray(q) || q.length !== 4 || !q.every((v) => Number.isFinite(v))) return casaNova();
  const [canal, trocou, filme, disco] = q as number[];
  return {
    canal: ((Math.floor(canal) % CANAIS_TV) + CANAIS_TV) % CANAIS_TV,
    trocou,
    filme,
    disco,
    virou: -1e9,
  };
}

const dentro = (r: RetanguloVila, x: number, z: number, folga = 0) =>
  x >= r.x0 - folga && x <= r.x1 + 1 + folga && z >= r.z0 - folga && z <= r.z1 + 1 + folga;

/** A criança está dentro da casa (a sala ou o quarto)? */
export const dentroDaCasa = (c: PontosCasa, x: number, z: number, folga = 0): boolean =>
  dentro(c.dentro, x, z, folga);
/** Está na sala (a TV e o disco são da sala)? */
export const naSala = (c: PontosCasa, x: number, z: number): boolean => dentro(c.sala, x, z, 0.3);

const perto = (p: readonly number[], x: number, z: number, alcance: number) =>
  Math.hypot(p[0] - x, p[2] - z) <= alcance;

/** Alcança a TV (e o videocassete, embaixo dela)? */
export const alcancaATv = (c: PontosCasa, x: number, z: number): boolean =>
  naSala(c, x, z) && perto(c.tv, x, z, ALCANCE_TV);
export const alcancaODisco = (c: PontosCasa, x: number, z: number): boolean =>
  naSala(c, x, z) && perto(c.discos, x, z, ALCANCE_DISCOS);
export const alcancaOBau = (c: PontosCasa, x: number, z: number): boolean =>
  dentroDaCasa(c, x, z) && perto(c.bau, x, z, ALCANCE_BAU);

/** O filme está passando agora? */
export const passaFilme = (e: EstadoCasa, t: number): boolean => e.filme > 0 && t < e.filme;

/** Troca para o próximo canal (null: na esperinha, ou o filme passando). */
export function trocarCanal(e: EstadoCasa, t: number): EstadoCasa | null {
  if (passaFilme(e, t) || t - e.trocou < ESPERA_CANAL) return null;
  return { ...e, canal: (e.canal + 1) % CANAIS_TV, trocou: t, filme: 0 };
}

/** Põe a fita no videocassete: o filme começa (null: já passando, ou na esperinha). */
export function porAFita(e: EstadoCasa, t: number): EstadoCasa | null {
  if (passaFilme(e, t) || t - e.trocou < ESPERA_CANAL) return null;
  return { ...e, trocou: t, filme: t + DURA_FILME };
}

/** Liga ou desliga o disco (null: na esperinha). */
export function virarODisco(e: EstadoCasa, t: number): EstadoCasa | null {
  if (t - e.virou < ESPERA_DISCO) return null;
  return { ...e, disco: e.disco >= 0 ? -1 : t, virou: t };
}

/** O que a TV mostra no instante `t`: o filme (com quanto já passou), o chuvisco da troca ou o canal. */
export type NaTela =
  | { o: 'filme'; f: number }
  | { o: 'chuvisco'; canal: number; f: number }
  | { o: 'canal'; canal: number; f: number };

/** O chuvisco de quando o canal muda (s). */
export const DURA_CHUVISCO = 0.32;

export function naTela(e: EstadoCasa, t: number): NaTela {
  if (passaFilme(e, t)) return { o: 'filme', f: t - (e.filme - DURA_FILME) };
  const desde = t - e.trocou;
  if (desde >= 0 && desde < DURA_CHUVISCO) return { o: 'chuvisco', canal: e.canal, f: desde };
  return { o: 'canal', canal: e.canal, f: t };
}

/** O próximo brinquedo que o baú dá (null: ela já tem os três). */
export function proximoDoBau(tem: (item: string) => number): string | null {
  for (const b of BRINQUEDOS_DO_BAU) if (tem(b) < 1) return b;
  return null;
}
