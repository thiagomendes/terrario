import { describe, expect, it } from 'vitest';
import { conferirBicho, encaixarBicho } from '../../src/render/encaixeBicho';
import { ergueDaPata, juntasDoBicho } from '../../src/render/juntasBicho';
import { bichoDeBrinquedo } from '../../src/render/bichoBrinquedo';
import { CRIATURAS_CIDADE } from '../../src/temas/cidade-grande/criaturas';
import '../../src/temas/todos';
import { obterTema, temasDisponiveis } from '../../src/temas/index';

/**
 * 014c, o teste de encaixe dos bichos (o mesmo padrão da spec 017 para os bonecos): em toda
 * pose do passo (parado, passo e galope, para os dois lados), cada pata, a cabeça, o rabo e as
 * asas encostam no corpo, e a boca de cima de cada pata fica dentro do corpo ou da bolinha da
 * junta. Antes do encaixe, os bichos da cidade falham (o dono: "membros descolados").
 */
const pecasDe = (desenho: Parameters<typeof bichoDeBrinquedo>[0], noite: boolean) =>
  bichoDeBrinquedo(desenho, noite ? { pastel: 0.32, cabeca: 1.45 } : {});
const conferir = (pecas: ReturnType<typeof bichoDeBrinquedo>) => {
  const j = juntasDoBicho(pecas);
  return conferirBicho(j, ergueDaPata(j));
};

describe('encaixe dos bichos (014c)', () => {
  it('sem o encaixe, os bichos da cidade tinham membros soltos (o que o dono viu)', () => {
    const soltos = (['cervo', 'raposa', 'espectro'] as const).filter(
      (t) => conferir(pecasDe(CRIATURAS_CIDADE[t], t === 'espectro')).length > 0,
    );
    expect(soltos).toEqual(['cervo', 'raposa', 'espectro']);
  });

  it('pombo, gato, cachorro e guaxinim inteiros em toda pose', () => {
    for (const t of ['coelho', 'raposa', 'cervo', 'espectro'] as const) {
      const p = encaixarBicho(pecasDe(CRIATURAS_CIDADE[t], t === 'espectro'), juntasDoBicho, ergueDaPata);
      expect(conferir(p).map((q) => `${t} ${q.tipo} ${q.junta} ${q.pose} ${q.medida.toFixed(3)}`)).toEqual([]);
    }
  });

  it('todo bicho de todo tema inteiro em toda pose, e o encaixe só acrescenta bolinhas', () => {
    const falhas: string[] = [];
    for (const id of temasDisponiveis())
      for (const [tipo, desenho] of Object.entries(obterTema(id).criaturas)) {
        const base = pecasDe(desenho, tipo === 'espectro');
        const p = encaixarBicho(base, juntasDoBicho, ergueDaPata);
        for (const q of conferir(p)) falhas.push(`${id} ${tipo} ${q.tipo} ${q.junta} ${q.pose}`);
        // as peças de antes continuam (só rabo e asas podem chegar mais perto do corpo)
        expect(p.length).toBeGreaterThanOrEqual(base.length);
        for (const extra of p.slice(base.length)) expect(extra.junta).toBe(true);
        base.forEach((b, i) => {
          if (b.papel === 'cauda' || b.papel?.startsWith('asa')) return;
          expect(p[i].p).toEqual(b.p);
          expect(p[i].t).toEqual(b.t);
        });
      }
    expect(falhas).toEqual([]);
  });
});
