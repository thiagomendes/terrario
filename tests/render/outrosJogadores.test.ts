import { beforeAll, describe, expect, it, vi } from 'vitest';
import type { Scene } from '@babylonjs/core/scene';
import type { JogadorVisto, PerfilJogador } from '../../src/nucleo/protocolo';

/**
 * Auditoria 017: os perfis chegam todos juntos sempre que alguém muda de visual. Só o boneco
 * de quem mudou é refeito; apelido novo só troca o texto da plaquinha.
 */
const aplicar = vi.fn();
const montar = vi.fn();
vi.mock('../../src/render/personagem', () => ({
  criarPersonagem: () => ({ aplicarAparencia: aplicar, definirMontado: montar, descartar: () => {}, raiz: {} }),
}));

/** Página de mentirinha: as plaquinhas são só objetos com texto. */
beforeAll(() => {
  const el = () => ({ className: '', textContent: '', hidden: true, remove() {}, style: {} });
  vi.stubGlobal('document', {
    createElement: el,
    head: { append() {} },
    body: { append() {} },
  });
});

const visto = (id: string): JogadorVisto => ({
  id,
  x: 0,
  y: 0,
  z: 0,
  yaw: 0,
  pitch: 0,
  vel: 0,
  voando: false,
  noChao: true,
  correndo: false,
  mao: null,
});

describe('outros jogadores: perfis', () => {
  it('só refaz o boneco de quem mudou de visual; apelido novo não refaz nada', async () => {
    const { criarOutrosJogadores } = await import('../../src/render/outrosJogadores');
    const o = criarOutrosJogadores({} as Scene);
    const perfis: Record<string, PerfilJogador> = {
      ana: { apelido: 'Ana', aparencia: { modelo: 'andarilho', pele: 2 } },
      bia: { apelido: 'Bia', aparencia: { modelo: 'andarilho', pele: 3 } },
    };
    o.definirPerfis(perfis);
    o.receber([visto('ana'), visto('bia')]);
    aplicar.mockClear();

    // os mesmos perfis de novo (alguém de fora mudou): ninguém é refeito
    o.definirPerfis(structuredClone(perfis));
    expect(aplicar).not.toHaveBeenCalled();

    // a mesma aparência com as chaves em outra ordem também não
    o.definirPerfis({
      ...perfis,
      ana: { apelido: 'Ana', aparencia: { pele: 2, modelo: 'andarilho' } },
    });
    expect(aplicar).not.toHaveBeenCalled();

    // só o apelido: troca a plaquinha, sem refazer o boneco
    o.definirPerfis({ ...perfis, ana: { ...perfis.ana, apelido: 'Aninha' } });
    expect(aplicar).not.toHaveBeenCalled();
    expect(o.lista.find((j) => j.id === 'ana')?.apelido).toBe('Aninha');

    // a Bia trocou a pele: só ela é refeita, uma vez
    o.definirPerfis({
      ana: { ...perfis.ana, apelido: 'Aninha' },
      bia: { apelido: 'Bia', aparencia: { modelo: 'andarilho', pele: 4 } },
    });
    expect(aplicar).toHaveBeenCalledTimes(1);
    expect(aplicar.mock.calls[0][0]).toMatchObject({ pele: 4 });
  });

  it('spec 036 (T04): o amigo que monta e desce não tem o boneco refeito (só o brinquedo acende)', async () => {
    const { criarOutrosJogadores } = await import('../../src/render/outrosJogadores');
    const o = criarOutrosJogadores({} as Scene);
    const pufs: boolean[] = [];
    o.definirAoMontar((_x, _y, _z, montou) => pufs.push(montou));
    const aPe = { modelo: 'andarilho', pele: 2, premium: { andar: 'patinete-luz' } };
    o.definirPerfis({ ana: { apelido: 'Ana', aparencia: aPe } });
    o.receber([visto('ana')]);
    aplicar.mockClear();
    montar.mockClear();
    o.definirPerfis({ ana: { apelido: 'Ana', aparencia: { ...aPe, montado: true } } });
    o.definirPerfis({ ana: { apelido: 'Ana', aparencia: { ...aPe, montado: true } } });
    expect(aplicar).not.toHaveBeenCalled();
    expect(montar.mock.calls).toEqual([[true]]);
    const ana = () => o.lista.find((j) => j.id === 'ana')!;
    expect(ana().montado).toBe(true);
    expect(ana().refeitos).toBe(0);
    // quem lê a aparência do amigo (o abraço) vê o montado
    expect(o.amigo('ana')?.aparencia.montado).toBe(true);
    o.definirPerfis({ ana: { apelido: 'Ana', aparencia: aPe } });
    expect(aplicar).not.toHaveBeenCalled();
    expect(montar.mock.calls).toEqual([[true], [false]]);
    expect(pufs).toEqual([true, false]);
    // trocar de brinquedo é outra aparência: aí sim o boneco é refeito
    o.definirPerfis({ ana: { apelido: 'Ana', aparencia: { ...aPe, premium: { andar: 'nuvem-fofa' } } } });
    expect(aplicar).toHaveBeenCalledTimes(1);
    expect(ana().refeitos).toBe(1);
  });
});
