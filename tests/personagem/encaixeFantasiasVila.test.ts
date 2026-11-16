import { describe, expect, it } from 'vitest';
import {
  CORPOS,
  ESTILOS_CABELO,
  IDS_MODELOS,
  aparenciaPadrao,
  aplicarCorpo,
  vestirFantasia,
} from '../../src/personagem/aparencia';
import { planoBoneco } from '../../src/personagem/boneco';
import { FANTASIAS_DE_MORADOR } from '../../src/personagem/fantasias';
import { conferirEncaixe, conferirMembros, girosDaPose, posesDeTeste } from './encaixe';

/**
 * Spec 026 (a tecladista e o público do show, 16 nov 2026): as roupas dos moradores da Vila Neon
 * que entraram agora encaixam em todo boneco (todo modelo, os dois corpos, todo corte de cabelo),
 * com a mesma régua das fantasias da criança: nada solto, nada tapando o rosto (as lentes dos
 * óculos escuros são de vidro: os olhos aparecem), braços e cabeça presos em todas as poses.
 */
const NOVAS = ['tecladista-vila', 'plateia-viseira', 'plateia-moletom'];

describe('as roupas novas dos moradores da Vila Neon (spec 026)', () => {
  it('existem no catálogo dos moradores', () => {
    for (const id of NOVAS)
      expect(
        FANTASIAS_DE_MORADOR.some((f) => f.id === id),
        id,
      ).toBe(true);
  });

  it('encaixam em todo modelo, corpo e corte de cabelo', () => {
    const falhas: string[] = [];
    const casos: Array<[string, number]> = [
      ...[...Array(ESTILOS_CABELO).keys()].map((c) => ['andarilho', c] as [string, number]),
      ...IDS_MODELOS.filter((m) => m !== 'andarilho').flatMap((m) =>
        [0, 1, 2].map((c) => [m, c] as [string, number]),
      ),
    ];
    for (const id of NOVAS)
      for (const [modelo, cabeloEstilo] of casos)
        for (const corpo of CORPOS) {
          const base = {
            ...aplicarCorpo(aparenciaPadrao(modelo as (typeof IDS_MODELOS)[number]), corpo),
            cabeloEstilo,
          };
          const plano = planoBoneco(vestirFantasia(base, id));
          for (const p of conferirEncaixe(plano))
            falhas.push(
              `${id} ${modelo} ${corpo} cabelo ${cabeloEstilo}: ${p.tipo} ${p.peca}${p.outra ? `/${p.outra}` : ''} ${p.medida.toFixed(3)}`,
            );
        }
    expect(falhas.slice(0, 40)).toEqual([]);
  });

  it('braços, pernas e cabeça continuam presos em todas as poses', () => {
    const poses = posesDeTeste();
    const falhas: string[] = [];
    for (const id of NOVAS)
      for (const corpo of CORPOS) {
        const plano = planoBoneco(vestirFantasia(aplicarCorpo(aparenciaPadrao(), corpo), id));
        for (const p of poses)
          for (const x of conferirMembros(plano, girosDaPose(p)))
            falhas.push(`${id} ${corpo}: ${x.tipo} ${x.junta} ${x.medida.toFixed(3)} (${p.nome})`);
      }
    expect(falhas.slice(0, 20)).toEqual([]);
  });

  it('a tecladista: paletó de ombreiras, mangas arregaçadas, gravata e óculos de lente de vidro', () => {
    const plano = planoBoneco(
      vestirFantasia(aplicarCorpo(aparenciaPadrao(), 'feminino'), 'tecladista-vila'),
    );
    const nomes = new Set(plano.pecas.map((p) => p.nome));
    for (const n of ['paleto', 'bracoD-ombreira', 'bracoE-antebraco', 'gravata', 'oculos-q-ponte'])
      expect(nomes.has(n), n).toBe(true);
    // o punho saiu (a manga está dobrada) e as lentes são de vidro
    expect(nomes.has('bracoD-punho')).toBe(false);
    const lentes = plano.pecas.filter((p) => p.nome.startsWith('oculos-q-lente'));
    expect(lentes).toHaveLength(2);
    for (const l of lentes) expect(l.alfa ?? 1).toBeLessThan(1);
  });
});
