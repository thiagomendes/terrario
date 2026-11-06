export const LIMITE_PITCH = (89 * Math.PI) / 180;
export const SENSIBILIDADE = 0.0022;

export type Acao = 'frente' | 'tras' | 'esquerda' | 'direita' | 'pular' | 'correr' | 'rapido';

const TECLAS: Record<string, Acao> = {
  KeyW: 'frente',
  KeyS: 'tras',
  KeyA: 'esquerda',
  KeyD: 'direita',
  Space: 'pular',
  ShiftLeft: 'correr',
  ShiftRight: 'correr',
  ControlLeft: 'rapido',
};

export function acaoDaTecla(code: string): Acao | null {
  return TECLAS[code] ?? null;
}

export type TeclasAtivas = Partial<Record<Acao, boolean>>;

export function eixos(t: TeclasAtivas): { frente: number; direita: number } {
  return {
    frente: (t.frente ? 1 : 0) - (t.tras ? 1 : 0),
    direita: (t.direita ? 1 : 0) - (t.esquerda ? 1 : 0),
  };
}

export function aplicarMouse(
  yaw: number,
  pitch: number,
  dx: number,
  dy: number,
  sens = SENSIBILIDADE,
): { yaw: number; pitch: number } {
  const p = pitch + dy * sens;
  return {
    yaw: yaw + dx * sens,
    pitch: Math.max(-LIMITE_PITCH, Math.min(LIMITE_PITCH, p)),
  };
}
