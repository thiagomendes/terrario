import { describe, expect, it } from 'vitest';
import { mirarDaCamera, raycastVoxel } from '../../src/player/alvo';
import { direcaoOlhar, pivoCamera, ZOOM_PADRAO } from '../../src/player/camera';

/** Chão em y <= 9; o jogador em pé em (5.5, 10, 5.5), olhos a 1,62. */
const chao = (_x: number, y: number, _z: number) => y <= 9;
const olhos = { x: 5.5, y: 11.62, z: 5.5 };

function daCamera(yaw: number, pitch: number, existe = chao, alcance = 5) {
  const pivo = pivoCamera(olhos, yaw, pitch, () => false);
  const d = direcaoOlhar(yaw, pitch);
  const camera = {
    x: pivo.x - d.x * ZOOM_PADRAO,
    y: pivo.y - d.y * ZOOM_PADRAO,
    z: pivo.z - d.z * ZOOM_PADRAO,
  };
  return mirarDaCamera(camera, d, ZOOM_PADRAO, olhos, alcance, existe);
}

describe('mira da terceira pessoa', () => {
  it('acerta o bloco que está no centro da tela (raio pela câmera e pelo pivô)', () => {
    const a = daCamera(0, 0.7)!;
    expect(a).not.toBeNull();
    // o mesmo bloco que o raio do pivô na direção do olhar encontra
    const pivo = pivoCamera(olhos, 0, 0.7, () => false);
    const b = raycastVoxel(pivo, direcaoOlhar(0, 0.7), 10, chao)!;
    expect([a.x, a.y, a.z]).toEqual([b.x, b.y, b.z]);
    expect(a.y).toBe(9);
    expect(a.normal).toEqual({ x: 0, y: 1, z: 0 });
  });
  it('ignora o que está entre a câmera e o boneco (o raio começa depois dele)', () => {
    // um bloco atrás do boneco, no caminho da câmera até ele
    const comPoste = (x: number, y: number, z: number) =>
      chao(x, y, z) || (x === 5 && z === 3 && y === 12);
    // contraste: o raio saindo da própria câmera bate no poste
    const pivo = pivoCamera(olhos, 0, 0.3, () => false);
    const d = direcaoOlhar(0, 0.3);
    const cam = {
      x: pivo.x - d.x * ZOOM_PADRAO,
      y: pivo.y - d.y * ZOOM_PADRAO,
      z: pivo.z - d.z * ZOOM_PADRAO,
    };
    expect(raycastVoxel(cam, d, 10, comPoste)).toMatchObject({ x: 5, y: 12, z: 3 });
    const a = daCamera(0, 0.3, comPoste);
    expect(a === null || a.z !== 3).toBe(true);
  });
  it('alcance medido dos olhos: bloco longe dos olhos não vale, mesmo no raio', () => {
    // olhando quase reto: o chão só aparece longe
    expect(daCamera(0, 0.2)).toBeNull();
    const perto = daCamera(0, 0.7)!;
    const p = { x: perto.x + 0.5, y: perto.y + 1, z: perto.z + 0.5 };
    expect(Math.hypot(p.x - olhos.x, p.y - olhos.y, p.z - olhos.z)).toBeLessThan(5.6);
  });
  it('olhando reto para baixo, mira o bloco debaixo dos pés', () => {
    const a = daCamera(0, 1.45)!;
    expect([a.x, a.y, a.z]).toEqual([5, 9, 5]);
  });
  it('direção nula não mira nada', () => {
    expect(mirarDaCamera(olhos, { x: 0, y: 0, z: 0 }, 0, olhos, 5, chao)).toBeNull();
  });
});
