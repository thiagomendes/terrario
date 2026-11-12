import { afterEach, describe, expect, it, vi } from 'vitest';
import { esquecerIndiceSons, lerIndiceSons } from '../../src/audio/indiceSons';
import { CarregadorTrilha, esquecerIndiceTrilha } from '../../src/audio/trilha';
import { criarVozesGravadas } from '../../src/audio/vozesGravadas';
import { criarMotorAudio } from '../../src/audio/motor';

afterEach(() => {
  vi.unstubAllGlobals();
  esquecerIndiceTrilha();
});

describe('índice dos sons, um só para a música e as vozes', () => {
  it('baixa uma vez, com prioridade baixa, e quem pede depois recebe o mesmo', async () => {
    const pedidos: { url: string; prioridade?: string }[] = [];
    vi.stubGlobal('fetch', async (url: string, init?: { priority?: string }) => {
      pedidos.push({ url, prioridade: init?.priority });
      if (url.endsWith('indice.json'))
        return { ok: true, json: async () => ({ temas: {}, comum: {} }) };
      return { ok: true, arrayBuffer: async () => new ArrayBuffer(8) };
    });
    // a música (carregador sem buscar de teste) e as vozes, ao mesmo tempo
    const car = new CarregadorTrilha({ base: '/' });
    const vozes = criarVozesGravadas({
      motor: criarMotorAudio(() => null as never),
      tema: 'rancho-alegre',
      base: '/',
      reserva: { bicho: () => undefined, morador: () => undefined, golpe: () => undefined },
    });
    vozes.carregar();
    await car.baixar('rancho-alegre');
    await vi.waitFor(() => expect(vozes.falhou || vozes.pronto).toBe(true));
    const indices = pedidos.filter((p) => p.url.endsWith('indice.json'));
    expect(indices).toHaveLength(1);
    expect(indices[0].prioridade).toBe('low');
    // o pacote das vozes também baixa sem disputar com o mundo
    expect(
      pedidos.filter((p) => p.url.includes('-vozes.mp3')).every((p) => p.prioridade === 'low'),
    ).toBe(true);
  });

  it('falhou: esquece e tenta de novo na próxima', async () => {
    esquecerIndiceSons();
    let n = 0;
    vi.stubGlobal('fetch', async () => {
      n++;
      if (n === 1) throw new Error('sem rede');
      return { ok: true, json: async () => ({ ok: 1 }) };
    });
    expect(await lerIndiceSons('/sons/indice.json')).toBeNull();
    expect(await lerIndiceSons('/sons/indice.json')).toEqual({ ok: 1 });
    expect(await lerIndiceSons('/sons/indice.json')).toEqual({ ok: 1 });
    expect(n).toBe(2);
  });
});
