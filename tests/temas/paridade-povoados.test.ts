import { describe, expect, it } from 'vitest';
import {
  gerarChunk,
  definirEstiloMundo,
  definirPovoados,
  encontrarNascimento,
  ESTILO_PADRAO,
  TERRENO_NATURAL,
  metasGeradasDoChunk,
} from '../../src/world/chunk';
import { Bloco } from '../../src/world/blocks';
import { limparPovoados, planoDaRegiao } from '../../src/world/povoado';
import '../../src/temas/todos';
import { obterTema } from '../../src/temas';
import { temaBase } from '../../src/temas/base';

/**
 * Spec 013: o sítio e o espantalho só existem com os campos novos do estilo. Os temas de
 * antes geram os mesmos povoados, o mesmo nascimento e os mesmos blocos em volta do primeiro
 * povoado (hashes tirados antes do sítio existir). Spec 034: dos seis, ficam a base (o estilo
 * do Bruma e Luz, com o mesmo hash), o Doce Reino e a Exploração Lunar.
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

const TEMAS_DE_ANTES = ['base', 'doce-reino', 'exploracao-lunar'] as const;

/**
 * Spec 039 (T03): a cama nova tem duas células, então os blocos do povoado mudaram. `ANTES_DA_039`
 * são os hashes que valiam até a 038: tirando o pé da cama (a célula de parte 1 volta a ser o ar
 * de dentro da casa), o povoado dá exatamente eles.
 */
const ESPERADO: Record<string, string> = {
  base: '34fc94a0ae1a1a21',
  'doce-reino': '0f99cadc4d30cfbe',
  'exploracao-lunar': 'fa4f8c8edc836fef',
};
const ANTES_DA_039: Record<string, string> = {
  // era o 'bruma-e-luz' (o mesmo estilo)
  base: 'aad6e205acaed7be',
  'doce-reino': '13b72d90d8e60adb',
  'exploracao-lunar': '58923160d40db933',
};

/** O pedaço sem o pé da cama nova (o ar de dentro da casa, como a geração era antes). */
function semOPe(cx: number, cz: number): Uint8Array {
  const b = gerarChunk(cx, cz, 1337).slice();
  for (const [i, m] of metasGeradasDoChunk(cx, cz, 1337))
    if (b[i] === Bloco.CAMA && ((m >> 2) & 7) === 1) b[i] = Bloco.AR;
  return b;
}

describe('os temas de antes não mudam com o sítio', () => {
  for (const id of TEMAS_DE_ANTES)
    it(`${id}: povoados, nascimento e blocos do primeiro povoado`, async () => {
      definirEstiloMundo(id === 'base' ? temaBase().mundo : obterTema(id).mundo);
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
      const antes = [...partes];
      for (let cx = Math.floor(p.minX / 16); cx <= Math.floor(p.maxX / 16); cx++)
        for (let cz = Math.floor(p.minZ / 16); cz <= Math.floor(p.maxZ / 16); cz++) {
          partes.push(gerarChunk(cx, cz, 1337));
          antes.push(semOPe(cx, cz));
        }
      const h = await sha(partes);
      const hAntes = await sha(antes);
      definirEstiloMundo(ESTILO_PADRAO);
      limparPovoados();
      expect(h).toBe(ESPERADO[id]);
      expect(hAntes).toBe(ANTES_DA_039[id]);
    });
});
