import { afterAll, describe, expect, it } from 'vitest';
import {
  ALTURA,
  alturaTerreno,
  definirEstiloMundo,
  encontrarNascimento,
  ESTILO_PADRAO,
  gerarChunk,
  indice,
  pontoDeNascer,
  TAM_X,
  TAM_Z,
} from '../../src/world/chunk';
import { limparPovoados } from '../../src/world/povoado';
import { obterBloco } from '../../src/world/blocks';
import { raycastVoxel } from '../../src/player/alvo';
import { ALTURA_OLHOS } from '../../src/player/fisica';
import '../../src/temas/todos';
import { obterTema } from '../../src/temas';
import { IDS_TEMAS } from '../../e2e/temas';

afterAll(() => {
  definirEstiloMundo(ESTILO_PADRAO);
  limparPovoados();
});

/** Bloco do mundo gerado (com cache de chunks por tema e semente). */
function mundo(semente: number) {
  const chunks = new Map<string, Uint8Array>();
  return (x: number, y: number, z: number): number => {
    if (y < 0 || y >= ALTURA) return 0;
    const cx = Math.floor(x / TAM_X);
    const cz = Math.floor(z / TAM_Z);
    const k = `${cx},${cz}`;
    let c = chunks.get(k);
    if (!c) chunks.set(k, (c = gerarChunk(cx, cz, semente)));
    return c[indice(x - cx * TAM_X, y, z - cz * TAM_Z)];
  };
}

const solido = (id: number) => !!obterBloco(id)?.solido;

/**
 * Onde o jogo põe quem chega: no ponto de nascer, em cima do terreno, subindo enquanto
 * houver bloco sólido (como o teleporte da cena). Diz quantos blocos subiu.
 */
function chegada(semente: number, bloco: (x: number, y: number, z: number) => number) {
  const p = pontoDeNascer(semente);
  const x = Math.floor(p.x);
  const z = Math.floor(p.z);
  const h = alturaTerreno(x, z, semente);
  let y = h + 1;
  while (y < ALTURA - 2 && (solido(bloco(x, y, z)) || solido(bloco(x, y + 1, z)))) y++;
  return { p, x, z, h, y, subiu: y - (h + 1) };
}

const TEMAS = IDS_TEMAS;

describe('ponto de nascer (nunca em cima de uma árvore)', () => {
  it('a semente do teste da Lua nascia no alto de uma ponta de cristal e agora pisa no chão', () => {
    definirEstiloMundo(obterTema('exploracao-lunar').mundo);
    limparPovoados();
    const s = 1834589600;
    const bloco = mundo(s);
    // antes: o nascimento de geração fica no pé de um cristal (o jogador subia até o topo)
    const n = encontrarNascimento(s);
    const h0 = alturaTerreno(Math.floor(n.x), Math.floor(n.z), s);
    expect(solido(bloco(Math.floor(n.x), h0 + 1, Math.floor(n.z)))).toBe(true);
    // agora: em cima do chão, sem nada sólido acima, e a mira (olhando para baixo) acha bloco
    const c = chegada(s, bloco);
    expect(c.subiu).toBe(0);
    const olhos = { x: c.p.x, y: c.y + ALTURA_OLHOS, z: c.p.z };
    const alvo = raycastVoxel(olhos, { x: 0, y: -Math.sin(1.2), z: Math.cos(1.2) }, 5, (x, y, z) =>
      solido(bloco(x, y, z)),
    );
    expect(alvo).not.toBeNull();
  });

  for (const tema of TEMAS)
    it(`${tema}: várias sementes, quem chega pisa no chão, sem copa em cima`, () => {
      definirEstiloMundo(obterTema(tema).mundo);
      limparPovoados();
      const ruins: string[] = [];
      // sementes próprias de cada tema (o nascimento de geração guarda cache por semente)
      const base = 7000 + TEMAS.indexOf(tema) * 1000;
      for (let i = 0; i < 40; i++) {
        const s = base + i * 37;
        const bloco = mundo(s);
        const c = chegada(s, bloco);
        if (c.subiu > 0) ruins.push(`${s}: subiu ${c.subiu} em (${c.x}, ${c.z})`);
        // nada sólido acima da cabeça (copa de uma árvore vizinha)
        for (let y = c.y; y < c.y + 12; y++)
          if (solido(bloco(c.x, y, c.z))) ruins.push(`${s}: bloco ${bloco(c.x, y, c.z)} em cima`);
        // e o ponto fica perto do nascimento de geração
        const n = encontrarNascimento(s);
        expect(Math.max(Math.abs(c.p.x - n.x), Math.abs(c.p.z - n.z))).toBeLessThanOrEqual(16);
      }
      expect(ruins).toEqual([]);
    });
});
