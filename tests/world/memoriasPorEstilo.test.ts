import { describe, expect, it, vi } from 'vitest';

/**
 * Spec 034 (T08, a investigação): o servidor abre mundos de temas diferentes no mesmo
 * processo, e as memórias da geração (o nascimento e os planos dos povoados) eram chaveadas
 * só pela semente. Dois mundos com a mesma semente e relevo diferente (a Lua tem crateras)
 * trocavam de nascimento e de plano: o segundo usava o do primeiro. Aqui, cada estilo tem que
 * dar o mesmo que daria num processo só dele (como a página do jogo, que tem um tema só).
 */
type Retrato = { nascer: { x: number; z: number }; planos: string };

async function retrato(
  ordem: readonly ('exploracao-lunar' | 'doce-reino' | 'rancho-alegre')[],
): Promise<Record<string, Retrato>> {
  vi.resetModules();
  await import('../../src/temas/todos');
  const { obterTema } = await import('../../src/temas');
  const chunk = await import('../../src/world/chunk');
  const povoado = await import('../../src/world/povoado');
  chunk.definirPovoados(true);
  const out: Record<string, Retrato> = {};
  for (const id of ordem) {
    // como o servidor faz a cada sala: só troca o estilo
    chunk.definirEstiloMundo(obterTema(id).mundo);
    const nascer = chunk.encontrarNascimento(1337);
    const planos: string[] = [];
    for (let rx = -2; rx <= 2; rx++)
      for (let rz = -2; rz <= 2; rz++) {
        const p = povoado.planoDaRegiao(rx, rz, 1337, chunk.TERRENO_NATURAL);
        planos.push(p ? `${p.id}:${p.cx},${p.cz},${p.h}` : '-');
      }
    out[id] = { nascer: { ...nascer }, planos: planos.join(' ') };
  }
  return out;
}

describe('spec 034: as memórias da geração não misturam mundos de temas diferentes', () => {
  it('a mesma semente na Lua e no Doce, em qualquer ordem, dá o que cada um dá sozinho', async () => {
    const lua = (await retrato(['exploracao-lunar']))['exploracao-lunar'];
    const doce = (await retrato(['doce-reino']))['doce-reino'];
    const rancho = (await retrato(['rancho-alegre']))['rancho-alegre'];
    // os relevos são diferentes de verdade (senão o teste não prova nada)
    expect(lua).not.toEqual(doce);
    const juntos = await retrato(['doce-reino', 'exploracao-lunar', 'rancho-alegre', 'doce-reino']);
    expect(juntos['exploracao-lunar']).toEqual(lua);
    expect(juntos['doce-reino']).toEqual(doce);
    expect(juntos['rancho-alegre']).toEqual(rancho);
    const outra = await retrato(['exploracao-lunar', 'doce-reino']);
    expect(outra['doce-reino']).toEqual(doce);
    expect(outra['exploracao-lunar']).toEqual(lua);
  }, 120_000);
});
