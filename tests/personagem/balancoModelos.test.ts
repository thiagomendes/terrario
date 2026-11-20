import { describe, expect, it } from 'vitest';
import {
  CORPOS,
  ESTILOS_CABELO,
  IDS_MODELOS,
  aparenciaPadrao,
  aplicarCorpo,
  vestirFantasia,
  type ModeloId,
} from '../../src/personagem/aparencia';
import { planoBoneco } from '../../src/personagem/boneco';
import { FANTASIAS } from '../../src/personagem/fantasias';
import { conferirBalanco, escalasDaPose, girosDaPose, posesDeTeste } from './encaixe';

/**
 * Spec 017 (T03): capa, saia e rabo balançando (andar, correr, pulo, aterrissagem, voo,
 * minerar, comer, sentar e os 8 gestos) sem entrar nas pernas, nos braços, no corpo nem no
 * cabelo. Esta metade: todos os modelos (a outra, balancoCabelos, todos os cabelos).
 */
const comBalanco = FANTASIAS.filter((f) =>
  CORPOS.some((c) =>
    f.visual[c].pecas.some((p) =>
      ['capa', 'capa-curta', 'saia-camadas'].includes(p.tipo),
    ),
  ),
);

function conferirTudo(casos: Array<[ModeloId, number]>, passo: number): string[] {
  const poses = posesDeTeste().filter((_, i) => i % passo === 0 || i < 30);
  const falhas: string[] = [];
  for (const f of comBalanco)
    for (const [modelo, cabeloEstilo] of casos)
      for (const corpo of CORPOS) {
        const plano = planoBoneco(
          vestirFantasia({ ...aplicarCorpo(aparenciaPadrao(modelo), corpo), cabeloEstilo }, f.id),
        );
        if (!plano.pecas.some((p) => ['capa', 'saia', 'rabo'].includes(p.junta))) continue;
        const pior = new Map<string, { medida: number; pose: string }>();
        for (const p of poses)
          for (const x of conferirBalanco(plano, girosDaPose(p), escalasDaPose(p))) {
            const k = `${x.tipo} ${x.peca}/${x.outra}`;
            if ((pior.get(k)?.medida ?? 0) < x.medida)
              pior.set(k, { medida: x.medida, pose: p.nome });
          }
        for (const [k, v] of pior)
          falhas.push(
            `${f.id} ${modelo} ${corpo} cabelo ${cabeloEstilo}: ${k} ${v.medida.toFixed(3)} (${v.pose})`,
          );
      }
  return falhas;
}

describe('capa, saia e rabo balançando (spec 017, T03)', () => {
  it('há fantasias com capa, saia e rabo', () => {
    // spec 034: a capa de folhas (Guardiã da Mata) e o rabo do dino saíram com os temas deles
    expect(comBalanco.length).toBeGreaterThanOrEqual(8);
  });
  it('não atravessam pernas, braços nem corpo, em todo modelo (cabelo comprido)', () => {
    const casos = IDS_MODELOS.map((m) => [m, 2] as [ModeloId, number]);
    expect(conferirTudo(casos, 2).slice(0, 40)).toEqual([]);
  });
});
