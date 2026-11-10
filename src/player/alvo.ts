import { ALTURA_JOGADOR, MEIA_LARGURA } from './fisica';

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface Alvo {
  x: number;
  y: number;
  z: number;
  distancia: number;
  normal: Vec3;
}

export type ExisteBloco = (x: number, y: number, z: number) => boolean;

export function raycastVoxel(
  origem: Vec3,
  direcao: Vec3,
  alcance: number,
  existe: ExisteBloco,
): Alvo | null {
  const tamanho = Math.hypot(direcao.x, direcao.y, direcao.z);
  if (tamanho === 0) return null;
  const d = [direcao.x / tamanho, direcao.y / tamanho, direcao.z / tamanho];
  const o = [origem.x, origem.y, origem.z];
  const celula = o.map((v) => Math.floor(v));
  const passo = d.map((v) => (v > 0 ? 1 : v < 0 ? -1 : 0));
  const delta = d.map((v) => (v === 0 ? Infinity : Math.abs(1 / v)));
  const proximo = d.map((v, i) => {
    if (v === 0) return Infinity;
    const borda = v > 0 ? celula[i] + 1 - o[i] : o[i] - celula[i];
    return borda * delta[i];
  });
  const normal = [0, 0, 0];
  let distancia = 0;

  if (existe(celula[0], celula[1], celula[2])) {
    return { x: celula[0], y: celula[1], z: celula[2], distancia: 0, normal: { x: 0, y: 0, z: 0 } };
  }
  for (;;) {
    let eixo = 0;
    if (proximo[1] < proximo[eixo]) eixo = 1;
    if (proximo[2] < proximo[eixo]) eixo = 2;
    distancia = proximo[eixo];
    if (!(distancia <= alcance)) return null;
    celula[eixo] += passo[eixo];
    proximo[eixo] += delta[eixo];
    normal[0] = normal[1] = normal[2] = 0;
    normal[eixo] = -passo[eixo];
    if (existe(celula[0], celula[1], celula[2])) {
      return {
        x: celula[0],
        y: celula[1],
        z: celula[2],
        distancia,
        normal: { x: normal[0], y: normal[1], z: normal[2] },
      };
    }
  }
}

export function posicaoColocacao(alvo: { x: number; y: number; z: number; normal: Vec3 }): Vec3 {
  return {
    x: alvo.x + alvo.normal.x,
    y: alvo.y + alvo.normal.y,
    z: alvo.z + alvo.normal.z,
  };
}

/** `jogador` são os pés (x, y, z), como em EstadoJogador. */
export function colocacaoBloqueada(posicao: Vec3, jogador: Vec3): boolean {
  return (
    posicao.x < jogador.x + MEIA_LARGURA &&
    posicao.x + 1 > jogador.x - MEIA_LARGURA &&
    posicao.y < jogador.y + ALTURA_JOGADOR &&
    posicao.y + 1 > jogador.y &&
    posicao.z < jogador.z + MEIA_LARGURA &&
    posicao.z + 1 > jogador.z - MEIA_LARGURA
  );
}

/**
 * Mira em terceira pessoa (spec 015): o raio sai da câmera pelo centro da tela (ou pelo
 * ponto tocado), mas só começa depois do boneco (`inicio`, a distância da câmera até o
 * pivô), para nunca mirar o que está entre a câmera e o boneco. O alcance é medido a
 * partir dos olhos do boneco, como o núcleo confere: um bloco além dele não vale, mesmo
 * que o raio o encontre.
 */
export function mirarDaCamera(
  camera: Vec3,
  direcao: Vec3,
  inicio: number,
  olhos: Vec3,
  alcance: number,
  existe: ExisteBloco,
): Alvo | null {
  const t = Math.hypot(direcao.x, direcao.y, direcao.z);
  if (!(t > 0)) return null;
  const d = { x: direcao.x / t, y: direcao.y / t, z: direcao.z / t };
  const ini = Math.max(0, inicio);
  const origem = { x: camera.x + d.x * ini, y: camera.y + d.y * ini, z: camera.z + d.z * ini };
  // além disto, nenhum ponto do raio fica no alcance dos olhos
  const folga = Math.hypot(origem.x - olhos.x, origem.y - olhos.y, origem.z - olhos.z);
  const a = raycastVoxel(origem, d, folga + alcance, existe);
  if (!a) return null;
  const p = {
    x: origem.x + d.x * a.distancia,
    y: origem.y + d.y * a.distancia,
    z: origem.z + d.z * a.distancia,
  };
  if (Math.hypot(p.x - olhos.x, p.y - olhos.y, p.z - olhos.z) > alcance) return null;
  return { ...a, distancia: a.distancia + ini };
}
