import { Bloco } from './blocks';
import { fbm2, hash2 } from './noise';

export const TAM_X = 16;
export const TAM_Z = 16;
export const ALTURA = 64;
export const SEMENTE_PADRAO = 1337;
export const NIVEL_LAGO = 22;

export function indice(x: number, y: number, z: number): number {
  return (y * TAM_Z + z) * TAM_X + x;
}

export function alturaTerreno(wx: number, wz: number, semente: number): number {
  const colinas = fbm2(wx / 40, wz / 40, semente, 4);
  const detalhe = fbm2(wx / 9, wz / 9, semente + 7, 2);
  return Math.floor(14 + colinas * 20 + detalhe * 3);
}

export function gerarChunk(cx: number, cz: number, semente: number = SEMENTE_PADRAO): Uint8Array {
  const blocos = new Uint8Array(TAM_X * ALTURA * TAM_Z);
  const alturas = new Int32Array(TAM_X * TAM_Z);

  for (let z = 0; z < TAM_Z; z++) {
    for (let x = 0; x < TAM_X; x++) {
      const wx = cx * TAM_X + x;
      const wz = cz * TAM_Z + z;
      const h = Math.min(alturaTerreno(wx, wz, semente), ALTURA - 12);
      alturas[z * TAM_X + x] = h;
      const praia = h <= NIVEL_LAGO;
      for (let y = 0; y <= h; y++) {
        let b: number = Bloco.PEDRA_RACHADA;
        if (praia) {
          if (y >= h - 3) b = Bloco.AREIA_BRUMA;
        } else if (y === h) {
          b = Bloco.TERRA_MUSGOSA;
        } else if (y >= h - 3) {
          b = Bloco.TERRA;
        }
        blocos[indice(x, y, z)] = b;
      }
    }
  }

  for (let z = 0; z < TAM_Z; z++) {
    for (let x = 0; x < TAM_X; x++) {
      const wx = cx * TAM_X + x;
      const wz = cz * TAM_Z + z;
      const h = alturas[z * TAM_X + x];
      if (h <= NIVEL_LAGO) continue;
      const r = hash2(wx, wz, semente + 5);
      const topo = h + 1;
      const margem = x >= 2 && x < TAM_X - 2 && z >= 2 && z < TAM_Z - 2;
      if (margem && r < 0.012) {
        plantarArvore(blocos, x, h, z, hash2(wx, wz, semente + 9));
      } else if (r < 0.2) {
        blocos[indice(x, topo, z)] = Bloco.GRAMA_ALTA;
      } else if (r < 0.24) {
        blocos[indice(x, topo, z)] = Bloco.FLOR;
      } else if (r < 0.26) {
        blocos[indice(x, topo, z)] = Bloco.COGUMELO_BRILHANTE;
      } else if (r > 0.9975) {
        blocos[indice(x, topo, z)] = Bloco.CRISTAL_LUZ;
      }
    }
  }
  return blocos;
}

function plantarArvore(blocos: Uint8Array, x: number, h: number, z: number, r: number): void {
  const tronco = 4 + Math.floor(r * 3);
  for (let i = 1; i <= tronco; i++) blocos[indice(x, h + i, z)] = Bloco.MADEIRA_RETORCIDA;
  const topo = h + tronco;
  for (let dy = -1; dy <= 1; dy++) {
    const raio = dy === 1 ? 1 : 2;
    for (let dz = -raio; dz <= raio; dz++) {
      for (let dx = -raio; dx <= raio; dx++) {
        if (Math.abs(dx) === raio && Math.abs(dz) === raio && raio === 2) continue;
        const i = indice(x + dx, topo + dy, z + dz);
        if (blocos[i] === Bloco.AR) blocos[i] = Bloco.FOLHAGEM;
      }
    }
  }
}
