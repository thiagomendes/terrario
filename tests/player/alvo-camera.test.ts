import { describe, expect, it } from 'vitest';
import { raycastVoxel } from '../../src/player/alvo';
import {
  criarEstadoCamera,
  definir,
  posicaoTerceiraPessoa,
  type ModoCamera,
} from '../../src/player/camera';
import { Bloco } from '../../src/world/blocks';
import { ALTURA, TAM_X, TAM_Z, alturaTerreno, gerarChunk, indice } from '../../src/world/chunk';

const blocos = gerarChunk(0, 0);
const solido = (x: number, y: number, z: number): boolean => {
  if (x < 0 || z < 0 || x >= TAM_X || z >= TAM_Z || y < 0 || y >= ALTURA) return false;
  return blocos[indice(x, y, z)] !== Bloco.AR;
};

const yaw = 0.7;
const pitch = 0.6;
const chao = alturaTerreno(8, 8, 1337);
const olhos = { x: 8.5, y: chao + 2.6, z: 8.5 };

function direcao() {
  return {
    x: Math.sin(yaw) * Math.cos(pitch),
    y: -Math.sin(pitch),
    z: Math.cos(yaw) * Math.cos(pitch),
  };
}

function posicaoVisao(modo: ModoCamera) {
  const estado = definir(criarEstadoCamera(), modo);
  return estado.modo === 'primeira' ? olhos : posicaoTerceiraPessoa(olhos, yaw, pitch, solido);
}

// O alvo sai sempre dos olhos, qualquer que seja a posição da visão.
function alvoDoModo(modo: ModoCamera) {
  posicaoVisao(modo);
  return raycastVoxel(olhos, direcao(), 8, solido);
}

describe('alvo independe do modo de câmera', () => {
  it('mesmo bloco real nos dois modos, com visão em posições diferentes', () => {
    const primeira = alvoDoModo('primeira');
    const terceira = alvoDoModo('terceira');
    expect(primeira).not.toBeNull();
    expect(solido(primeira!.x, primeira!.y, primeira!.z)).toBe(true);
    expect(terceira).toEqual(primeira);
    const a = posicaoVisao('primeira');
    const b = posicaoVisao('terceira');
    expect(Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z)).toBeGreaterThan(1);
  });

  it('contraste: partir da visão em terceira mudaria distância e alcance', () => {
    const dosOlhos = alvoDoModo('terceira')!;
    const daVisao = raycastVoxel(posicaoVisao('terceira'), direcao(), 12, solido);
    expect(daVisao).not.toBeNull();
    expect(daVisao!.distancia).toBeGreaterThan(dosOlhos.distancia + 1);
    // Com alcance de 3 blocos o alvo dos olhos existe, mas o da visão não.
    expect(raycastVoxel(olhos, direcao(), dosOlhos.distancia + 0.5, solido)).not.toBeNull();
    expect(
      raycastVoxel(posicaoVisao('terceira'), direcao(), dosOlhos.distancia + 0.5, solido),
    ).toBeNull();
  });
});
