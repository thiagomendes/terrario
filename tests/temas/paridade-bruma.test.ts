import { TILES_PECAS } from '../../src/art/tiles';
import { CELULA, PADDING } from '../../src/art/atlas';
import { describe, expect, it } from 'vitest';
import { gerarAtlas } from '../../src/art/atlas';
import {
  gerarChunk,
  definirEstiloMundo,
  definirPovoados,
  ESTILO_PADRAO,
} from '../../src/world/chunk';
import { CRIATURAS_BRUMA } from '../../src/temas/bruma-e-luz/criaturas';
import { definirTemaAtivo } from '../../src/temas/ativo';
import { obterTema } from '../../src/temas';

/**
 * Paridade do Bruma e Luz: o tema extraído reproduz exatamente o jogo de antes.
 * Os hashes foram tirados do commit 4aaa257 (antes de existir temas).
 */
async function sha(...partes: (Uint8Array | string)[]): Promise<string> {
  const pedacos = partes.map((p) => (typeof p === 'string' ? new TextEncoder().encode(p) : p));
  const total = new Uint8Array(pedacos.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of pedacos) {
    total.set(p, o);
    o += p.length;
  }
  const d = await crypto.subtle.digest('SHA-256', total);
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

describe('Bruma e Luz é idêntico ao jogo antes dos temas', () => {
  it('atlas: os mesmos pixels e os mesmos tiles brilhantes', async () => {
    definirTemaAtivo(obterTema('bruma-e-luz'));
    // a pintura de cada tile (antes das cores limpas de brinquedo da spec 012)
    const a = gerarAtlas(1337, { brinquedo: false });
    expect([a.largura, a.altura]).toEqual([512, 256]);
    // os tiles das peças de brinquedo (spec 012) são novos: fica de fora da comparação
    const px = new Uint8Array(a.pixels.slice().buffer);
    for (const nome of TILES_PECAS) {
      const cel = a.uvDoTile(nome)!;
      const bx = Math.round(cel.u0 * a.largura) - PADDING;
      const by = Math.round(cel.v0 * a.altura) - PADDING;
      for (let y = by; y < by + CELULA; y++)
        px.fill(0, (y * a.largura + bx) * 4, (y * a.largura + bx + CELULA) * 4);
    }
    expect(await sha(px)).toBe('3aed3d5a8a609f6fe704538a62a5d75f4a87a7a43372b8ac899913165bca488c');
    const em = a.tiles
      .filter((t) => t.emissivo && !TILES_PECAS.includes(t.nome))
      .map((t) => t.nome)
      .join(',');
    expect((await sha(em)).slice(0, 16)).toBe('be72a6aafb557d1a');
  });

  it('terreno: os mesmos blocos em 169 chunks', async () => {
    definirEstiloMundo(ESTILO_PADRAO);
    // o jogo antigo não tinha povoados: a paridade é do terreno sem eles
    definirPovoados(false);
    const chunks: Uint8Array[] = [];
    for (let cx = -6; cx <= 6; cx++)
      for (let cz = -6; cz <= 6; cz++) chunks.push(gerarChunk(cx, cz, 1337));
    definirPovoados(true);
    expect(await sha(...chunks)).toBe(
      '90735f31ef35ab9c4ea948e80b75cdf4d38a57a2ce60ccfa50af0c0e8c51eff4',
    );
  });

  it('criaturas: os mesmos modelos', async () => {
    expect(await sha(JSON.stringify(CRIATURAS_BRUMA))).toBe(
      '7dff411a36fdcadd5b9f3a31f63f35a0efb58a19b9bbbab2a6c8a29683f8b7f3',
    );
  });
});
