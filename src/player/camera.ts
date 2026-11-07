/** Primeira pessoa, terceira (por cima do ombro) e de frente (olhando para o jogador). */
export type ModoCamera = 'primeira' | 'terceira' | 'frente';

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
  const ordem: ModoCamera[] = ['primeira', 'terceira', 'frente'];
  return { modo: ordem[(ordem.indexOf(estado.modo) + 1) % ordem.length] };
}

/** Deslocamento para a direita da câmera em terceira pessoa (por cima do ombro, spec 012). */
export const LADO_OMBRO = 0.55;

export function teclaParaCamera(codigo: string): boolean {
  return codigo === 'KeyV';
}

export function visibilidadePorModo(modo: ModoCamera): { braco: boolean; corpo: boolean } {
  return modo === 'primeira' ? { braco: true, corpo: false } : { braco: false, corpo: true };
}

export function textoIndicador(modo: ModoCamera): string {
  if (modo === 'frente') return 'Câmera: de frente (V)';
  return modo === 'primeira' ? 'Câmera: 1ª pessoa (V)' : 'Câmera: 3ª pessoa (V)';
}

/** Convenção do jogo: pitch positivo olha para baixo; frente = (sen yaw, -sen pitch, cos yaw). */
export function posicaoTerceiraPessoa(
  olhos: Vec3,
  yaw: number,
  pitch: number,
  solido: (x: number, y: number, z: number) => boolean,
  opcoes: { lado?: number; frente?: boolean } = {},
): Vec3 {
  const cp = Math.cos(pitch);
  // de frente: a câmera vai para a frente do jogador (e olha de volta para ele)
  const sinal = opcoes.frente ? -1 : 1;
  const dx = -cp * Math.sin(yaw) * sinal;
  const dy = Math.sin(pitch) * sinal;
  const dz = -cp * Math.cos(yaw) * sinal;
  // por cima do ombro: o ponto de partida sai para a direita, se não houver parede ali
  let base = olhos;
  const lado = opcoes.lado ?? 0;
  if (lado !== 0) {
    const ladoP = {
      x: olhos.x + Math.cos(yaw) * lado,
      y: olhos.y,
      z: olhos.z - Math.sin(yaw) * lado,
    };
    if (!solido(Math.floor(ladoP.x), Math.floor(ladoP.y), Math.floor(ladoP.z))) base = ladoP;
  }
  const em = (d: number): Vec3 => ({
    x: base.x + dx * d,
    y: base.y + dy * d,
    z: base.z + dz * d,
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
