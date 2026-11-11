import { describe, expect, it } from 'vitest';
import {
  ALCANCE_MIRA,
  ALCANCE_REGRAS,
  ALCANCE_TOQUE,
  FOLGA_MOVIMENTO,
  MEIA_DIAGONAL,
  alcancaDosOlhos,
  clienteAlcanca,
} from '../../src/jogo/alcance';
import { mirarDaCamera } from '../../src/player/alvo';

const olhos = { x: 0.5, y: 11.62, z: 0.5 };

describe('alcance das mãos (uma regra só para prever e conferir)', () => {
  it('o toque é mais generoso que a mira do centro, sem passar do que o núcleo aceita', () => {
    expect(ALCANCE_TOQUE).toBeGreaterThan(ALCANCE_MIRA);
    // o ponto atingido fica a no máximo meia diagonal do centro do bloco
    expect(ALCANCE_TOQUE + MEIA_DIAGONAL).toBeLessThanOrEqual(ALCANCE_REGRAS - FOLGA_MOVIMENTO);
  });

  it('conta dos olhos ao centro do bloco, como o núcleo', () => {
    expect(alcancaDosOlhos(olhos, 0, 11, 7)).toBe(true); // centro a 7,0
    expect(alcancaDosOlhos(olhos, 0, 11, 8)).toBe(false); // centro a 8,0 (mais a altura)
    expect(alcancaDosOlhos(olhos, 0, 11, 7, 6.9)).toBe(false);
  });

  it('o cliente só prevê com folga dentro do alcance das regras', () => {
    expect(clienteAlcanca(olhos, 0, 11, 7)).toBe(true);
    expect(clienteAlcanca(olhos, 0, 11, 8)).toBe(false);
    expect(clienteAlcanca(olhos, 0, 11, 7.6)).toBe(false);
  });

  it('todo bloco que a mira do dedo pega, o núcleo aceita (raios de uma câmera atrás)', () => {
    // chão em y <= 9 e uma parede em z = 6; câmera 4,4 atrás e acima dos olhos
    const existe = (_x: number, y: number, z: number) => y <= 9 || z === 6;
    const camera = { x: 0.9, y: 13.4, z: -3.6 };
    let pegou = 0;
    for (let yaw = -1.2; yaw <= 1.2; yaw += 0.05)
      for (let pitch = -0.4; pitch <= 1.2; pitch += 0.05) {
        const d = {
          x: Math.sin(yaw) * Math.cos(pitch),
          y: -Math.sin(pitch),
          z: Math.cos(yaw) * Math.cos(pitch),
        };
        const a = mirarDaCamera(camera, d, olhos, ALCANCE_TOQUE, existe);
        if (!a) continue;
        pegou++;
        expect(alcancaDosOlhos(olhos, a.x, a.y, a.z, ALCANCE_REGRAS - FOLGA_MOVIMENTO)).toBe(true);
      }
    expect(pegou).toBeGreaterThan(100);
  });
});
