/**
 * Spec 019 (T05): os sons da água do próprio jogador. Cair na água faz "chuá"; nadando, uma
 * braçada macia a cada tanto (mais depressa quando nada rápido). Entrar andando não espirra.
 */
export interface EstadoSomAgua {
  naAgua: boolean;
  /** Segundos desde a última braçada. */
  desde: number;
}

export const SOM_AGUA_INICIAL: Readonly<EstadoSomAgua> = { naAgua: false, desde: 0 };

/** Velocidade de queda (blocos/s, para baixo) a partir da qual entrar na água espirra. */
export const QUEDA_CHUA = 2.5;
/** Abaixo disso (blocos/s), boiando parado: sem braçada. */
export const NADO_MINIMO = 0.8;
export const BRACADA_S = 0.62;
export const BRACADA_RAPIDA_S = 0.45;
const NADO_RAPIDO = 3.5;

export function passoSomAgua(
  e: EstadoSomAgua,
  s: { naAgua: boolean; vy: number; velHoriz: number; dt: number },
): { estado: EstadoSomAgua; sons: ('agua' | 'nado')[] } {
  const sons: ('agua' | 'nado')[] = [];
  if (!s.naAgua) return { estado: { naAgua: false, desde: 0 }, sons };
  if (!e.naAgua) {
    if (s.vy <= -QUEDA_CHUA) sons.push('agua');
    // a primeira braçada espera um pouco (o chuá ou o primeiro passo dentro)
    return { estado: { naAgua: true, desde: 0 }, sons };
  }
  if (s.velHoriz < NADO_MINIMO) return { estado: { naAgua: true, desde: 0 }, sons };
  let desde = e.desde + s.dt;
  const periodo = s.velHoriz > NADO_RAPIDO ? BRACADA_RAPIDA_S : BRACADA_S;
  if (desde >= periodo) {
    sons.push('nado');
    desde = 0;
  }
  return { estado: { naAgua: true, desde }, sons };
}
