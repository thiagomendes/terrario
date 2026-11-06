export type ModoCamera = 'primeira' | 'terceira';

export interface EstadoCamera {
  modo: ModoCamera;
}

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export const DISTANCIA_TERCEIRA = 3.5;
export const DISTANCIA_MINIMA = 0.6;
export const PASSO_COLISAO = 0.1;

export function criarEstadoCamera(): EstadoCamera {
  return { modo: 'primeira' };
}

export function definir(estado: EstadoCamera, modo: ModoCamera): EstadoCamera {
  if (estado.modo === modo) return estado;
  return { modo };
}

export function alternar(estado: EstadoCamera): EstadoCamera {
  return { modo: estado.modo === 'primeira' ? 'terceira' : 'primeira' };
}

export function teclaParaCamera(codigo: string): boolean {
  return codigo === 'KeyV';
}

export function visibilidadePorModo(modo: ModoCamera): { braco: boolean; corpo: boolean } {
  return modo === 'primeira' ? { braco: true, corpo: false } : { braco: false, corpo: true };
}

export function textoIndicador(modo: ModoCamera): string {
  return modo === 'primeira' ? 'Câmera: 1ª pessoa (V)' : 'Câmera: 3ª pessoa (V)';
}

/** Convenção do jogo: pitch positivo olha para baixo; frente = (sen yaw, -sen pitch, cos yaw). */
export function posicaoTerceiraPessoa(
  olhos: Vec3,
  yaw: number,
  pitch: number,
  solido: (x: number, y: number, z: number) => boolean,
): Vec3 {
  const cp = Math.cos(pitch);
  const dx = -cp * Math.sin(yaw);
  const dy = Math.sin(pitch);
  const dz = -cp * Math.cos(yaw);
  const em = (d: number): Vec3 => ({
    x: olhos.x + dx * d,
    y: olhos.y + dy * d,
    z: olhos.z + dz * d,
  });
  const bate = (d: number): boolean => {
    const p = em(d);
    return solido(Math.floor(p.x), Math.floor(p.y), Math.floor(p.z));
  };
  // Se já a 0,6 há bloco sólido, não há posição válida com a distância mínima:
  // a câmera fica nos olhos, para nunca ficar dentro de um bloco criado pelo obstáculo.
  if (bate(DISTANCIA_MINIMA)) return em(0);
  const passos = Math.round((DISTANCIA_TERCEIRA - DISTANCIA_MINIMA) / PASSO_COLISAO);
  let melhor = DISTANCIA_MINIMA;
  for (let i = 1; i <= passos; i++) {
    const d = DISTANCIA_MINIMA + i * PASSO_COLISAO;
    if (bate(d)) break;
    melhor = d;
  }
  return em(Math.min(melhor, DISTANCIA_TERCEIRA));
}
