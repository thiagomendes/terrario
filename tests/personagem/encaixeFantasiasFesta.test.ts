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
import { definirPeloDeTeste, ESTILOS_PELO } from '../../src/personagem/bonecoPeludo';
import { FANTASIAS_DE_MORADOR } from '../../src/personagem/fantasias';
import { conferirEncaixe, conferirMembros, girosDaPose, posesDeTeste } from './encaixe';

/**
 * Spec 027 (T09): as peças de fantasia da Noite das Fantasias (as novas: o chapéu de bruxa, o
 * lençol de capuz, a gola alta, as orelhinhas de bichinho e o macacão de tufos; e as que já
 * existem, com a cor e o símbolo deste mundo) encaixam em todo boneco (todo modelo, os dois
 * corpos, todo corte de cabelo), com a régua das fantasias da criança (017): nada solto, nada
 * escondido, nada tapando o rosto, nenhum cabelo atravessando o que cobre a cabeça; braços,
 * pernas e cabeça presos em todas as poses.
 */
const NOVAS = [
  'bento-peludo',
  'vovo-bruxa',
  'dudu-vampiro',
  'lulu-fantasma',
  'jeronimo-horta',
  'gatinho-festa',
  'morceguinho-festa',
  // T10: a Vovó Zuleica (o xale, os óculos redondos e as sobrancelhas) e o Conde Dudu (a
  // lanterninha); o Seu Jerônimo (o lenço, o broche e as mechas grisalhas) já está acima
  'vovo-zuleica',
  'conde-dudu',
];

describe('as peças de fantasia da Noite das Fantasias (spec 027, T09)', () => {
  it('existem no catálogo dos moradores, todas do tema', () => {
    for (const id of NOVAS) {
      const f = FANTASIAS_DE_MORADOR.find((x) => x.id === id);
      expect(f, id).toBeDefined();
      expect(f!.tema).toBe('noite-das-fantasias');
    }
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

  it('as três versões do pelo do Bento também encaixam', () => {
    const falhas: string[] = [];
    for (const e of ESTILOS_PELO) {
      definirPeloDeTeste(e);
      for (const corpo of CORPOS)
        for (const cabeloEstilo of [0, 3, 5]) {
          const plano = planoBoneco(
            vestirFantasia({ ...aplicarCorpo(aparenciaPadrao(), corpo), cabeloEstilo }, 'bento-peludo'),
          );
          for (const p of conferirEncaixe(plano))
            falhas.push(`${e} ${corpo} cabelo ${cabeloEstilo}: ${p.tipo} ${p.peca} ${p.medida.toFixed(3)}`);
        }
    }
    definirPeloDeTeste(null);
    expect(falhas.slice(0, 20)).toEqual([]);
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

  it('o lençol tem o furo do rosto (o rosto do boneco à mostra) e guarda o cabelo', () => {
    for (let c = 0; c < ESTILOS_CABELO; c++) {
      const plano = planoBoneco(vestirFantasia({ ...aparenciaPadrao(), cabeloEstilo: c }, 'lulu-fantasma'));
      const nomes = plano.pecas.map((p) => p.nome);
      for (const n of ['lencol-capuz', 'lencol-beira', 'lencol-sino']) expect(nomes, n).toContain(n);
      expect(nomes.filter((n) => /^(cabelo|topete|franja)/.test(n)), `cabelo ${c}`).toEqual([]);
      // nenhum ponto do pano passa na frente dos olhos
      const capuz = plano.pecas.find((p) => p.nome === 'lencol-capuz')!;
      const olhos = plano.pecas.filter((p) => p.junta === 'cabeca' && /^olho/.test(p.nome));
      const P = capuz.malha!.pos;
      for (const o of olhos)
        for (let i = 0; i < P.length; i += 3) {
          const perto = Math.hypot(P[i] - o.pos[0], P[i + 1] - o.pos[1]) < 0.1;
          expect(perto && P[i + 2] > o.pos[2] - 0.02, `pano na frente do olho ${o.nome}`).toBe(false);
        }
    }
  });
});
