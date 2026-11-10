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
 * ponto tocado) e o alvo é o primeiro bloco que ele encontra, o mesmo que a criança vê
 * (nada é pulado: tocar numa parede perto mira essa parede, nunca um bloco atrás dela). O
 * alcance é medido a partir dos olhos do boneco, como o núcleo confere: um bloco além dele
 * não vale, mesmo que o raio o encontre. Raio que já nasce dentro de um bloco (sem face)
 * não mira nada.
 */
export function mirarDaCamera(
  camera: Vec3,
  direcao: Vec3,
  olhos: Vec3,
  alcance: number,
  existe: ExisteBloco,
): Alvo | null {
  const t = Math.hypot(direcao.x, direcao.y, direcao.z);
  if (!(t > 0)) return null;
  const d = { x: direcao.x / t, y: direcao.y / t, z: direcao.z / t };
  // além disto, nenhum ponto do raio fica no alcance dos olhos
  const folga = Math.hypot(camera.x - olhos.x, camera.y - olhos.y, camera.z - olhos.z);
  const a = raycastVoxel(camera, d, folga + alcance, existe);
  if (!a) return null;
  if (a.normal.x === 0 && a.normal.y === 0 && a.normal.z === 0) return null;
  const p = {
    x: camera.x + d.x * a.distancia,
    y: camera.y + d.y * a.distancia,
    z: camera.z + d.z * a.distancia,
  };
  if (Math.hypot(p.x - olhos.x, p.y - olhos.y, p.z - olhos.z) > alcance) return null;
  return a;
}
