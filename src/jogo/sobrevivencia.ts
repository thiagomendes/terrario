export const VIDA_MAX = 20;
export const FOME_MAX = 20;
export const AR_MAX = 10;
export const ALTURA_QUEDA_SEGURA = 3;
const INTERVALO_REGEN = 3;
const INTERVALO_FOME = 4;
const INTERVALO_AFOGAR = 1;
const LIMITE_EXAUSTAO = 4;

export type CausaDano = 'queda' | 'afogamento' | 'fome' | 'criatura' | 'outro';

export interface EstadoSobrevivencia {
  vida: number;
  fome: number;
  saturacao: number;
  exaustao: number;
  ar: number;
  morto: boolean;
  causa: CausaDano | null;
}

export interface Atividade {
  correndo: boolean;
  andando: boolean;
  submerso: boolean;
  /**
   * Spec 034 (só o atalho de teste da paridade): false tira o cansaço que vem do relógio (0,02
   * por segundo parado, 0,05 andando, 0,25 correndo). Pulos, golpes, danos e a cura continuam
   * cansando. Sem o campo, cansa como sempre.
   */
  relogioCansa?: boolean;
}

export type EventoSobrevivencia =
  | { tipo: 'dano'; qtd: number; causa: CausaDano }
  | { tipo: 'cura'; qtd: number }
  | { tipo: 'morte'; causa: CausaDano }
  | { tipo: 'comer' };

export function estadoInicial(): EstadoSobrevivencia {
  return {
    vida: VIDA_MAX,
    fome: FOME_MAX,
    saturacao: 5,
    exaustao: 0,
    ar: AR_MAX,
    morto: false,
    causa: null,
  };
}

/** Dano de uma queda: 1 meio-coração por bloco além de 3. */
export function danoDeQueda(altura: number): number {
  return Math.max(0, Math.floor(altura - ALTURA_QUEDA_SEGURA));
}

export function criarSobrevivencia(salvo?: unknown) {
  let e = estadoInicial();
  const s = salvo as Partial<EstadoSobrevivencia> | undefined;
  if (s && typeof s === 'object') {
    const n = (v: unknown, max: number, p: number) =>
      typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(0, v)) : p;
    e = {
      vida: n(s.vida, VIDA_MAX, VIDA_MAX),
      fome: n(s.fome, FOME_MAX, FOME_MAX),
      saturacao: n(s.saturacao, FOME_MAX, 5),
      exaustao: n(s.exaustao, LIMITE_EXAUSTAO, 0),
      ar: n(s.ar, AR_MAX, AR_MAX),
      morto: false,
      causa: null,
    };
    if (e.vida <= 0) e.vida = VIDA_MAX;
  }
  let invulneravel = 0;
  let tRegen = 0;
  let tFome = 0;
  let tAfogar = 0;
  const ouvintes = new Set<(ev: EventoSobrevivencia) => void>();
  const emitir = (ev: EventoSobrevivencia) => {
    for (const f of ouvintes) f(ev);
  };

  function cansar(q: number): void {
    e.exaustao += q;
    while (e.exaustao >= LIMITE_EXAUSTAO) {
      e.exaustao -= LIMITE_EXAUSTAO;
      if (e.saturacao > 0) e.saturacao = Math.max(0, e.saturacao - 1);
      else e.fome = Math.max(0, e.fome - 1);
    }
  }

  function dano(qtd: number, causa: CausaDano, ignorarInvulneravel = false): number {
    if (e.morto || qtd <= 0) return 0;
    if (invulneravel > 0 && !ignorarInvulneravel) return 0;
    const aplicado = Math.min(e.vida, qtd);
    e.vida -= aplicado;
    invulneravel = 0.5;
    cansar(0.1);
    emitir({ tipo: 'dano', qtd: aplicado, causa });
    if (e.vida <= 0) {
      e.morto = true;
      e.causa = causa;
      emitir({ tipo: 'morte', causa });
    }
    return aplicado;
  }

  return {
    get estado(): Readonly<EstadoSobrevivencia> {
      return e;
    },
    ouvir(f: (ev: EventoSobrevivencia) => void): () => void {
      ouvintes.add(f);
      return () => ouvintes.delete(f);
    },
    atualizar(dt: number, a: Atividade): void {
      if (e.morto || !(dt > 0)) return;
      invulneravel = Math.max(0, invulneravel - dt);
      if (a.relogioCansa !== false) cansar(dt * (a.correndo ? 0.25 : a.andando ? 0.05 : 0.02));
      // regenera com a barriga cheia
      if (e.fome >= 18 && e.vida < VIDA_MAX) {
        tRegen += dt;
        if (tRegen >= INTERVALO_REGEN) {
          tRegen = 0;
          e.vida = Math.min(VIDA_MAX, e.vida + 1);
          cansar(1.5);
          emitir({ tipo: 'cura', qtd: 1 });
        }
      } else {
        tRegen = 0;
      }
      // fome zerada machuca até sobrar meio coração
      if (e.fome <= 0) {
        tFome += dt;
        if (tFome >= INTERVALO_FOME) {
          tFome = 0;
          if (e.vida > 1) dano(1, 'fome', true);
        }
      } else {
        tFome = 0;
      }
      // ar debaixo d'água
      if (a.submerso) {
        e.ar = Math.max(0, e.ar - dt);
        if (e.ar <= 0) {
          tAfogar += dt;
          if (tAfogar >= INTERVALO_AFOGAR) {
            tAfogar = 0;
            dano(2, 'afogamento', true);
          }
        }
      } else {
        e.ar = Math.min(AR_MAX, e.ar + dt * 4);
        tAfogar = 0;
      }
    },
    dano,
    queda(altura: number): number {
      return dano(danoDeQueda(altura), 'queda', true);
    },
    pulo(correndo: boolean): void {
      cansar(correndo ? 0.8 : 0.2);
    },
    acao(): void {
      cansar(0.025);
    },
    comer(fome: number, saturacao: number): boolean {
      if (e.morto || e.fome >= FOME_MAX) return false;
      e.fome = Math.min(FOME_MAX, e.fome + fome);
      e.saturacao = Math.min(e.fome, e.saturacao + saturacao);
      emitir({ tipo: 'comer' });
      return true;
    },
    curar(qtd: number): void {
      if (e.morto) return;
      e.vida = Math.min(VIDA_MAX, e.vida + qtd);
      emitir({ tipo: 'cura', qtd });
    },
    renascer(): void {
      e = estadoInicial();
      invulneravel = 2;
    },
    salvar(): EstadoSobrevivencia {
      return { ...e };
    },
  };
}
export type Sobrevivencia = ReturnType<typeof criarSobrevivencia>;
