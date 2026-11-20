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
import { CRIATURAS_BASE } from '../../src/temas/base/criaturas';
import { definirTemaAtivo } from '../../src/temas/ativo';
import { temaBase } from '../../src/temas/base';
import { REGISTRO_BLOCOS } from '../../src/world/blocks';
import { blocoExclusivo } from '../../src/jogo/exclusivos';

/** Tiles dos blocos de antes da cidade (os que a cidade só reaproveita não saem da conta). */
const NOMES_ANTIGOS = new Set(
  REGISTRO_BLOCOS.filter((b) => !blocoExclusivo(b.id)).flatMap((b) => [
    b.tiles.lado,
    b.tiles.topo,
    b.tiles.base,
    b.tiles.frente,
  ]),
);

/**
 * Paridade da base (era a do Bruma e Luz até a spec 034, com os mesmos hashes): a base
 * reproduz exatamente o jogo de antes dos temas.
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

/**
 * Tiles do plantio (spec 013), acrescentados depois da paridade, e a porta, repintada de
 * propósito na 013 como uma peça só de dois blocos (a metade de cima ganhou tile próprio).
 * Os acrescentados ocupam células antes vazias (zeradas, o hash não muda); a porta não.
 */
const TILES_013 = [
  'terra_arada',
  'trigo',
  'milho',
  'aboboreira',
  'feno_lado',
  'feno_topo',
  'porta',
  'porta_cima',
];

/**
 * Tiles da Cidade Grande (spec 014): só os blocos da cidade usam, e entram em células antes
 * vazias. Ficam de fora da comparação, como os do plantio.
 */
const TILES_014 = [
  ...new Set(
    REGISTRO_BLOCOS.filter((b) => blocoExclusivo(b.id)).flatMap((b) =>
      [b.tiles.lado, b.tiles.topo, b.tiles.base, b.tiles.frente, ...(b.tiles.frentes ?? [])].filter(
        (n): n is string => !!n && !NOMES_ANTIGOS.has(n),
      ),
    ),
  ),
];

describe('a base é idêntica ao jogo antes dos temas', () => {
  it('atlas: os mesmos pixels e os mesmos tiles brilhantes', async () => {
    definirTemaAtivo(temaBase());
    // a pintura de cada tile (antes das cores limpas de brinquedo da spec 012)
    const a = gerarAtlas(1337, { brinquedo: false });
    expect([a.largura, a.altura]).toEqual([512, 256]);
    // os tiles das peças de brinquedo (spec 012) e os do plantio (spec 013) são novos: ficam
    // de fora da comparação
    const px = new Uint8Array(a.pixels.slice().buffer);
    for (const nome of [...TILES_PECAS, ...TILES_013, ...TILES_014]) {
      const cel = a.uvDoTile(nome)!;
      const bx = Math.round(cel.u0 * a.largura) - PADDING;
      const by = Math.round(cel.v0 * a.altura) - PADDING;
      for (let y = by; y < by + CELULA; y++)
        px.fill(0, (y * a.largura + bx) * 4, (y * a.largura + bx + CELULA) * 4);
    }
    // hash refeito na 013 só porque a célula da porta (repintada de propósito) agora vai
    // zerada; antes era 3aed3d5a8a609f6fe704538a62a5d75f4a87a7a43372b8ac899913165bca488c
    expect(await sha(px)).toBe('51f279ca21dcf184e765ff7d308d21c5bdc6995eff9b0639f3091fdd071ab84c');
    const em = a.tiles
      .filter(
        (t) =>
          t.emissivo &&
          !TILES_PECAS.includes(t.nome) &&
          !TILES_013.includes(t.nome) &&
          !TILES_014.includes(t.nome),
      )
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
    // spec 034: os movimentos, as vozes e o povoado de reserva da base, como eram no Bruma
    // e Luz (hashes tirados antes da 034 mexer em qualquer coisa deles)
    const b = temaBase();
    expect((await sha(JSON.stringify(b.movimento))).slice(0, 16)).toBe('c2a11518abdef42f');
    expect((await sha(JSON.stringify(b.vozes))).slice(0, 16)).toBe('8cb799d557101b61');
    expect((await sha(JSON.stringify(b.povoado))).slice(0, 16)).toBe('adf571325e7a48d5');
    expect((await sha(JSON.stringify(b.mundo))).slice(0, 16)).toBe('49185d58faa4e098');
    expect(await sha(JSON.stringify(CRIATURAS_BASE))).toBe(
      'd83dea56608f1b5614365d6c6908c0143ff0dcc2578a543302d99c50692d5a59',
    );
  });
});
