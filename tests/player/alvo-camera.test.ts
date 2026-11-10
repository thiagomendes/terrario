import { describe, expect, it } from 'vitest';
import { mirarDaCamera, raycastVoxel } from '../../src/player/alvo';
import {
  ALTURA_PIVO_TOQUE,
  direcaoOlhar,
  distanciaLivre,
  LADO_OMBRO,
  pivoCamera,
  ZOOM_PADRAO,
  ZOOM_PADRAO_TOQUE,
} from '../../src/player/camera';

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
  return mirarDaCamera(camera, d, olhos, alcance, existe);
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
  it('toque num túnel estreito: o alvo é sempre o primeiro bloco que a criança vê', () => {
    // túnel de 1 de largura (x = 0), paredes em x = ±1, teto em y = 3, um degrau em x = -2
    const solido = (x: number, y: number, _z: number) => {
      if (y <= 0) return true;
      if (x === -1 || x === 1) return y <= 3;
      if (x === 0) return y >= 3;
      if (x === -2) return y <= 2;
      return false;
    };
    const eu = { x: 0.5, y: 2.6, z: 0.5 };
    const pivo = pivoCamera(eu, 0, 0, solido, LADO_OMBRO, ALTURA_PIVO_TOQUE);
    const dist = distanciaLivre(pivo, 0, 0, ZOOM_PADRAO_TOQUE, solido);
    const cam = { x: pivo.x, y: pivo.y, z: pivo.z - dist };
    const t = Math.tan(0.6);
    let mirados = 0;
    for (let sy = -1; sy <= 1; sy += 0.05)
      for (let sx = -1; sx <= 1; sx += 0.05) {
        const d0 = { x: sx * t * (16 / 9), y: -sy * t, z: 1 };
        const L = Math.hypot(d0.x, d0.y, d0.z);
        const d = { x: d0.x / L, y: d0.y / L, z: d0.z / L };
        const visto = raycastVoxel(cam, d, 20, solido);
        const a = mirarDaCamera(cam, d, eu, 5, solido);
        if (!a) continue;
        mirados++;
        expect(visto).not.toBeNull();
        expect([a.x, a.y, a.z]).toEqual([visto!.x, visto!.y, visto!.z]);
        expect(a.normal).not.toEqual({ x: 0, y: 0, z: 0 });
      }
    expect(mirados).toBeGreaterThan(100);
    // o exemplo da auditoria: a parede tocada em (0, 2,3, −1,5) é a parede, não o outro lado
    const alvo = { x: 0, y: 2.3, z: -1.5 };
    const d = { x: alvo.x - cam.x, y: alvo.y - cam.y, z: alvo.z - cam.z };
    const a = mirarDaCamera(cam, d, eu, 5, solido);
    if (a) expect([a.x, a.y, a.z]).toEqual([-1, 2, -2]);
  });
  it('raio que nasce dentro de um bloco não mira nada (sem face)', () => {
    expect(
      mirarDaCamera({ x: 5.5, y: 9.5, z: 5.5 }, { x: 0, y: -1, z: 0 }, olhos, 5, chao),
    ).toBeNull();
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
    expect(mirarDaCamera(olhos, { x: 0, y: 0, z: 0 }, olhos, 5, chao)).toBeNull();
  });
});
