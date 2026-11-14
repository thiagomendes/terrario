import { describe, expect, it } from 'vitest';
import {
  cantoDoMundo,
  definirEstiloMundo,
  definirPovoados,
  ESTILO_PADRAO,
  gerarChunk,
  indice,
  pontoDeNascer,
} from '../../src/world/chunk';
import { limparPovoados } from '../../src/world/povoado';
import { Bloco } from '../../src/world/blocks';
import { criarProtecaoMundo, naoQuebra, Protecao } from '../../src/world/protecao';
import '../../src/temas/todos';
import { obterTema } from '../../src/temas';

const bloco = (s: number, x: number, y: number, z: number) => {
  const cx = Math.floor(x / 16);
  const cz = Math.floor(z / 16);
  return gerarChunk(cx, cz, s)[indice(x - cx * 16, y, z - cz * 16)];
};

describe('spec 031: o canto das missões', () => {
  for (const id of ['era-dos-dinos', 'doce-reino'] as const)
    it(`${id}: nasce perto de onde a criança nasce, em toda semente`, () => {
      definirEstiloMundo(obterTema(id).mundo);
      definirPovoados(true);
      limparPovoados();
      for (const s of [1, 2, 3, 4, 5, 6, 7, 8, 42, 1337, 9001, 123456]) {
        const p = cantoDoMundo(s);
        expect(p, `semente ${s}`).not.toBeNull();
        const n = pontoDeNascer(s);
        const d = Math.hypot(p!.x - n.x, p!.z - n.z);
        expect(d).toBeGreaterThanOrEqual(9);
        expect(d).toBeLessThanOrEqual(15);
        if (id === 'era-dos-dinos') {
          expect(p!.ovos).toHaveLength(3);
          expect(p!.fosseis).toHaveLength(3);
          for (const f of p!.fosseis) expect(bloco(s, f[0], f[1], f[2])).toBe(Bloco.MINERIO_FERRO);
          // cada ovinho fica de 8 a 18 blocos do nascer (a trilha é curta)
          for (const o of p!.ovos) {
            const k = Math.hypot(o[0] - n.x, o[2] - n.z);
            expect(k).toBeLessThan(21);
          }
        } else {
          expect(p!.bolo).toHaveLength(9);
          for (const c of p!.bolo) expect(bloco(s, c.x, c.y, c.z)).toBe(Bloco.AR);
          const m = p!.mesa!;
          expect(bloco(s, m.x0, m.y, m.z0)).toBe(Bloco.PEDRA_LISA);
        }
      }
      definirEstiloMundo(ESTILO_PADRAO);
      limparPovoados();
    });

  it('a proteção: o chão das peças não se cava e o bolo aceita só o bloco certo', () => {
    definirEstiloMundo(obterTema('doce-reino').mundo);
    definirPovoados(true);
    const s = 1337;
    const p = cantoDoMundo(s)!;
    const pr = criarProtecaoMundo(s);
    const c = p.bolo[0];
    expect(pr.em(c.x, c.y, c.z)).toBe(Protecao.OBRA);
    expect(pr.planejado(c.x, c.y, c.z)?.bloco).toBe(Bloco.LA_PRETA);
    const m = p.mesa!;
    expect(pr.em(m.x0, m.y, m.z0)).toBe(Protecao.ESTRUTURA);
    expect(naoQuebra(pr.em(m.x0, m.y - 1, m.z0))).toBe(true);
    expect(pr.em(m.x0, m.y + 1, m.z0)).toBe(Protecao.LIVRE);
    definirEstiloMundo(ESTILO_PADRAO);
  });

  it('desligado nos outros temas e sem povoados (a paridade)', () => {
    definirEstiloMundo(ESTILO_PADRAO);
    expect(cantoDoMundo(1337)).toBeNull();
    definirEstiloMundo(obterTema('era-dos-dinos').mundo);
    definirPovoados(false);
    expect(cantoDoMundo(1337)).toBeNull();
    definirPovoados(true);
    definirEstiloMundo(ESTILO_PADRAO);
  });
});
