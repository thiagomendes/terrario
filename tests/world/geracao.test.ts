import { describe, expect, it } from 'vitest';
import {
  ALTURA,
  NIVEL_MAR,
  TAM_X,
  TAM_Z,
  alturaTerreno,
  biomaEm,
  encontrarNascimento,
  gerarChunk,
  indice,
} from '../../src/world/chunk';
import { Bloco } from '../../src/world/blocks';

describe('geração do mundo', () => {
  const chunks = [] as Uint8Array[];
  for (let cz = -2; cz <= 2; cz++)
    for (let cx = -2; cx <= 2; cx++) chunks.push(gerarChunk(cx * 7, cz * 7, 1337));
  const contar = (id: number) => chunks.reduce((t, c) => t + c.filter((b) => b === id).length, 0);

  it('fundo de rocha-matriz e topo livre', () => {
    for (const c of chunks) {
      for (let z = 0; z < TAM_Z; z++)
        for (let x = 0; x < TAM_X; x++) expect(c[indice(x, 0, z)]).toBe(Bloco.ROCHA_MATRIZ);
      for (let i = indice(0, ALTURA - 2, 0); i < c.length; i++) expect(c[i]).toBe(Bloco.AR);
    }
  });

  it('tem cavernas, minérios de vários tipos e água só até o nível do mar', () => {
    let arSubterraneo = 0;
    for (const c of chunks)
      for (let y = 5; y < 40; y++)
        for (let z = 0; z < TAM_Z; z++)
          for (let x = 0; x < TAM_X; x++) if (c[indice(x, y, z)] === Bloco.AR) arSubterraneo++;
    expect(arSubterraneo).toBeGreaterThan(100);
    for (const m of [Bloco.MINERIO_CARVAO, Bloco.MINERIO_COBRE, Bloco.MINERIO_FERRO])
      expect(contar(m)).toBeGreaterThan(0);
    for (const c of chunks)
      for (let i = indice(0, NIVEL_MAR + 1, 0); i < c.length; i++)
        expect(c[i]).not.toBe(Bloco.AGUA);
  });

  it('vários biomas existem e o nascimento é em terra firme', () => {
    const vistos = new Set<string>();
    for (let z = -1500; z <= 1500; z += 50)
      for (let x = -1500; x <= 1500; x += 50) vistos.add(biomaEm(x, z, 1337));
    for (const b of ['floresta', 'campos', 'deserto', 'taiga', 'oceano', 'pantano', 'montanhas'])
      expect(vistos, b).toContain(b);
    const n = encontrarNascimento(1337);
    expect(alturaTerreno(Math.floor(n.x), Math.floor(n.z), 1337)).toBeGreaterThan(NIVEL_MAR);
  });
});
