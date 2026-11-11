import { describe, expect, it } from 'vitest';
import {
  ACESSORIOS,
  CORPOS,
  ESTILOS_CABELO,
  IDS_MODELOS,
  aparenciaPadrao,
  aplicarCorpo,
} from '../../src/personagem/aparencia';
import { planoBoneco, topoBoneco, type PlanoBoneco } from '../../src/personagem/boneco';
import { moradorDeBrinquedo } from '../../src/render/moradorBoneco';
import '../../src/temas/todos';
import { obterTema, temasDisponiveis } from '../../src/temas';
import { generoDoMorador } from '../../src/temas/nomes';
import type { Profissao } from '../../src/world/povoado';
import {
  FOLGA_MAXIMA,
  conferirEncaixe,
  conferirMembros,
  distanciaEntre,
  girosDaPose,
  medirPeca,
  posesDeTeste,
} from './encaixe';

/** Confere os membros de um plano em todas as poses de teste (pior vão de cada problema). */
function membrosSoltos(plano: PlanoBoneco, rotulo: string): string[] {
  const pior = new Map<string, { medida: number; pose: string }>();
  for (const p of posesDeTeste())
    for (const m of conferirMembros(plano, girosDaPose(p))) {
      const k = `${m.tipo} ${m.junta}`;
      if ((pior.get(k)?.medida ?? 0) < m.medida) pior.set(k, { medida: m.medida, pose: p.nome });
    }
  return [...pior].map(([k, v]) => `${rotulo}: ${k} ${v.medida.toFixed(3)} (${v.pose})`);
}

describe('encaixe dos acessórios (spec 017, T01)', () => {
  it('todo enfeite encosta na cabeça ou no corpo, sem tapar o rosto nem ser atravessado', () => {
    const falhas: string[] = [];
    // a cabeça é igual em todo corpo: guarda a conta pela forma das peças
    const ja = new Map<string, string[]>();
    let combinacoes = 0;
    for (const modelo of IDS_MODELOS)
      for (const corpo of CORPOS)
        for (let cabeloEstilo = 0; cabeloEstilo < ESTILOS_CABELO; cabeloEstilo++)
          for (const acessorio of ACESSORIOS) {
            const a = { ...aplicarCorpo(aparenciaPadrao(modelo), corpo), cabeloEstilo, acessorio };
            const plano = planoBoneco(a);
            combinacoes++;
            const chave = JSON.stringify([
              plano.juntas,
              plano.pecas.map((p) => [
                p.nome,
                p.junta,
                p.forma,
                p.tamanho,
                p.raio,
                p.pos,
                p.rot,
                p.apoio,
              ]),
            ]);
            let achados = ja.get(chave);
            if (!achados) {
              achados = conferirEncaixe(plano).map(
                (p) => `${p.tipo} ${p.peca}${p.outra ? `/${p.outra}` : ''} ${p.medida.toFixed(3)}`,
              );
              ja.set(chave, achados);
            }
            for (const f of achados)
              falhas.push(`${modelo} ${corpo} cabelo ${cabeloEstilo} ${acessorio}: ${f}`);
          }
    expect(combinacoes).toBe(IDS_MODELOS.length * 2 * ESTILOS_CABELO * ACESSORIOS.length);
    expect(falhas).toEqual([]);
  });

  it('os acessórios estão marcados com o apoio (cabeça, tronco ou mão)', () => {
    for (const acessorio of ACESSORIOS) {
      const plano = planoBoneco({ ...aparenciaPadrao(), acessorio });
      const enfeites = plano.pecas.filter((p) => p.apoio);
      if (acessorio === 'nenhum') expect(enfeites).toEqual([]);
      else expect(enfeites.length, acessorio).toBeGreaterThan(0);
    }
  });

  it('o chapéu do morador assenta no cabelo do boneco, sem cabelo atravessando', () => {
    const falhas: string[] = [];
    let chapeus = 0;
    for (const id of temasDisponiveis()) {
      const pov = obterTema(id).povoado;
      if (!pov) continue;
      for (const prof of Object.keys(pov.moradores) as Profissao[])
        for (let n = 0; n < 30; n++) {
          const m = moradorDeBrinquedo(
            pov.moradores[prof],
            n,
            generoDoMorador('p', n, prof),
            pov.acessorios?.[prof],
          );
          const plano = m.ajustar(planoBoneco(m.aparencia));
          const rotulo = `${id} ${prof} cabelo ${m.aparencia.cabeloEstilo}`;
          for (const p of conferirEncaixe(plano))
            if (p.tipo === 'cabelo') falhas.push(`${rotulo}: ${p.peca} ${p.medida.toFixed(3)}`);
          const chapeu = plano.pecas.filter((p) => p.nome.startsWith('chapeu-tema'));
          if (!chapeu.length) continue;
          chapeus++;
          // a peça mais perto do cabelo (a aba ou a borda da touca) encosta nele
          const cabeca = plano.pecas
            .filter((p) => !p.apoio && (p.junta === 'cabeca' || p.junta === 'topete'))
            .map((p) => medirPeca(plano, p));
          let folga = Infinity;
          for (const c of chapeu.map((p) => medirPeca(plano, p)))
            for (const s of cabeca) folga = Math.min(folga, distanciaEntre(c, s, folga));
          if (folga > FOLGA_MAXIMA) falhas.push(`${rotulo}: chapéu solto ${folga.toFixed(3)}`);
        }
    }
    expect(chapeus).toBeGreaterThan(0);
    expect(falhas).toEqual([]);
  });

  it('braços, pernas e cabeça ficam presos no tronco em todas as poses e gestos', () => {
    const falhas: string[] = [];
    for (const modelo of IDS_MODELOS)
      for (const corpo of CORPOS) {
        const plano = planoBoneco(aplicarCorpo(aparenciaPadrao(modelo), corpo));
        falhas.push(...membrosSoltos(plano, `${modelo} ${corpo}`));
      }
    expect(falhas).toEqual([]);
  });

  it('os moradores (o mesmo boneco com as peças do tema) também ficam inteiros', () => {
    const falhas: string[] = [];
    for (const id of temasDisponiveis()) {
      const pov = obterTema(id).povoado;
      if (!pov) continue;
      for (const prof of Object.keys(pov.moradores) as Profissao[]) {
        const m = moradorDeBrinquedo(
          pov.moradores[prof],
          1,
          generoDoMorador('p', 1, prof),
          pov.acessorios?.[prof],
        );
        falhas.push(...membrosSoltos(m.ajustar(planoBoneco(m.aparencia)), `${id} ${prof}`));
      }
    }
    expect(falhas).toEqual([]);
  });

  it('a foto do editor enquadra até o alto do chapéu', () => {
    const a = { ...aparenciaPadrao(), acessorio: 'chapeu' as const };
    const semChapeu = topoBoneco({ ...a, acessorio: 'nenhum' });
    expect(topoBoneco(a)).toBeGreaterThan(semChapeu + 0.3);
  });
});
