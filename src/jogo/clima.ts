import type { Gerador } from '../audio/variacao';

export type TipoClima = 'limpo' | 'nublado' | 'chuva' | 'tempestade' | 'neblina';
export type Estacao = 'primavera' | 'verao' | 'outono' | 'inverno';

export const NOMES_CLIMA: Record<TipoClima, string> = {
  limpo: 'Céu limpo',
  nublado: 'Nublado',
  chuva: 'Chuva',
  tempestade: 'Tempestade',
  neblina: 'Neblina',
};

export const NOMES_ESTACAO: Record<Estacao, string> = {
  primavera: 'Primavera',
  verao: 'Verão',
  outono: 'Outono',
  inverno: 'Inverno',
};

export const DIAS_POR_ESTACAO = 3;
const ORDEM: Estacao[] = ['primavera', 'verao', 'outono', 'inverno'];

export function estacaoDoDia(dia: number): Estacao {
  return ORDEM[Math.floor(Math.max(0, dia) / DIAS_POR_ESTACAO) % 4];
}

/** Intensidades alvo de cada clima. */
const ALVOS: Record<TipoClima, { nuvens: number; chuva: number; neblina: number; raios: number }> =
  {
    limpo: { nuvens: 0.15, chuva: 0, neblina: 0, raios: 0 },
    nublado: { nuvens: 0.65, chuva: 0, neblina: 0.1, raios: 0 },
    chuva: { nuvens: 0.85, chuva: 0.7, neblina: 0.25, raios: 0 },
    tempestade: { nuvens: 1, chuva: 1, neblina: 0.35, raios: 1 },
    neblina: { nuvens: 0.4, chuva: 0, neblina: 1, raios: 0 },
  };

/** Próximo clima a partir do atual (cadeia simples, com estação). */
function sortear(atual: TipoClima, est: Estacao, rng: Gerador): TipoClima {
  const r = rng();
  const chuvoso = est === 'primavera' || est === 'outono' ? 0.12 : 0;
  switch (atual) {
    case 'limpo':
      return r < 0.45 ? 'limpo' : r < 0.75 + chuvoso ? 'nublado' : 'neblina';
    case 'nublado':
      return r < 0.3 ? 'limpo' : r < 0.75 - chuvoso ? 'chuva' : r < 0.9 ? 'tempestade' : 'nublado';
    case 'chuva':
      return r < 0.45 ? 'nublado' : r < 0.6 ? 'tempestade' : r < 0.85 ? 'limpo' : 'chuva';
    case 'tempestade':
      return r < 0.6 ? 'chuva' : 'nublado';
    default:
      return r < 0.7 ? 'limpo' : 'nublado';
  }
}

export interface EstadoClima {
  tipo: TipoClima;
  /** 0..1 suavizados. */
  nuvens: number;
  chuva: number;
  neblina: number;
  raios: number;
  /** 0..1: arco-íris depois da chuva. */
  arco: number;
  restante: number;
}

export interface Relampago {
  /** Atraso do trovão (s), pela distância. */
  atrasoTrovao: number;
}

export function criarClima(rng: Gerador, salvo?: unknown) {
  const s = salvo as Partial<EstadoClima> | undefined;
  const tipo: TipoClima = s?.tipo && s.tipo in ALVOS ? s.tipo : 'limpo';
  const e: EstadoClima = {
    tipo,
    nuvens: ALVOS[tipo].nuvens,
    chuva: ALVOS[tipo].chuva,
    neblina: ALVOS[tipo].neblina,
    raios: ALVOS[tipo].raios,
    arco: 0,
    restante: typeof s?.restante === 'number' ? s.restante : 240,
  };
  let proximoRaio = 6;
  return {
    get estado(): Readonly<EstadoClima> {
      return e;
    },
    /** Força um clima (comandos, testes). */
    definir(t: TipoClima, duracao = 240): void {
      e.tipo = t;
      e.restante = duracao;
    },
    /** Avança; devolve um relâmpago quando cai um. */
    atualizar(dt: number, est: Estacao, dia: boolean): Relampago | null {
      e.restante -= dt;
      if (e.restante <= 0) {
        const antes = e.tipo;
        e.tipo = sortear(e.tipo, est, rng);
        e.restante = 150 + rng() * 240;
        if (
          (antes === 'chuva' || antes === 'tempestade') &&
          (e.tipo === 'limpo' || e.tipo === 'nublado')
        ) {
          e.arco = dia ? 1 : 0;
        }
      }
      const a = ALVOS[e.tipo];
      const k = 1 - Math.exp(-dt / 12);
      e.nuvens += (a.nuvens - e.nuvens) * k;
      e.chuva += (a.chuva - e.chuva) * k;
      e.neblina += (a.neblina - e.neblina) * k;
      e.raios += (a.raios - e.raios) * k;
      e.arco = Math.max(0, e.arco - dt / 90);
      if (e.raios > 0.6) {
        proximoRaio -= dt;
        if (proximoRaio <= 0) {
          proximoRaio = 4 + rng() * 10;
          return { atrasoTrovao: 0.3 + rng() * 2.5 };
        }
      }
      return null;
    },
    salvar(): EstadoClima {
      return { ...e };
    },
  };
}
export type Clima = ReturnType<typeof criarClima>;
