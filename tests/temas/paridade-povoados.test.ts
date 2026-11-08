import { describe, expect, it } from 'vitest';
import {
  gerarChunk,
  definirEstiloMundo,
  definirPovoados,
  encontrarNascimento,
  ESTILO_PADRAO,
  TERRENO_NATURAL,
} from '../../src/world/chunk';
import { limparPovoados, planoDaRegiao } from '../../src/world/povoado';
import '../../src/temas/todos';
import { obterTema } from '../../src/temas';

/**
 * Spec 013: o sítio e o espantalho só existem com os campos novos do estilo. Os seis temas
 * de antes geram os mesmos povoados, o mesmo nascimento e os mesmos blocos em volta do
 * primeiro povoado (hashes tirados antes do sítio existir).
 */
async function sha(partes: (Uint8Array | string)[]): Promise<string> {
  const pedacos = partes.map((p) => (typeof p === 'string' ? new TextEncoder().encode(p) : p));
  const total = new Uint8Array(pedacos.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of pedacos) {
    total.set(p, o);
    o += p.length;
  }
  const d = await crypto.subtle.digest('SHA-256', total);
  return [...new Uint8Array(d)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 16);
}

const TEMAS_DE_ANTES = [
  'bruma-e-luz',
  'doce-reino',
  'era-dos-dinos',
  'exploracao-lunar',
  'mata-encantada',
  'planeta-vivo',
] as const;

const ESPERADO: Record<string, string> = {
  'bruma-e-luz': 'aad6e205acaed7be',
  'doce-reino': '13b72d90d8e60adb',
  'era-dos-dinos': 'c344377fab88ceea',
  'exploracao-lunar': '58923160d40db933',
  'mata-encantada': '07c9bdb0ca67e5cd',
  'planeta-vivo': 'db89e0cdf5b30708',
};

describe('os seis temas de antes não mudam com o sítio', () => {
  for (const id of TEMAS_DE_ANTES)
    it(`${id}: povoados, nascimento e blocos do primeiro povoado`, async () => {
      definirEstiloMundo(obterTema(id).mundo);
      definirPovoados(true);
      limparPovoados();
      const partes: (Uint8Array | string)[] = [];
      for (let s = 1; s <= 6; s++) {
        const n = encontrarNascimento(s);
        partes.push(`${n.x},${n.z};`);
      }
      let primeiro: { minX: number; maxX: number; minZ: number; maxZ: number } | null = null;
      for (let rx = -2; rx <= 2; rx++)
        for (let rz = -2; rz <= 2; rz++) {
          const p = planoDaRegiao(rx, rz, 1337, TERRENO_NATURAL);
          if (!p) continue;
          primeiro ??= p;
          partes.push(JSON.stringify({ ...p, caminho: [...p.caminho], dist: 0, piso: 0 }));
          partes.push(p.dist, p.piso);
        }
      const p = primeiro!;
      for (let cx = Math.floor(p.minX / 16); cx <= Math.floor(p.maxX / 16); cx++)
        for (let cz = Math.floor(p.minZ / 16); cz <= Math.floor(p.maxZ / 16); cz++)
          partes.push(gerarChunk(cx, cz, 1337));
      const h = await sha(partes);
      definirEstiloMundo(ESTILO_PADRAO);
      limparPovoados();
      expect(h).toBe(ESPERADO[id]);
    });
});
