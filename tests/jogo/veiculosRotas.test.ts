import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import '../../src/temas/todos';
import { obterTema } from '../../src/temas';
import { cidadeDoMundo, definirEstiloMundo, ESTILO_PADRAO } from '../../src/world/chunk';
import { limparCidades, Solo, soloDaCidade, type PlanoCidade } from '../../src/world/cidade';
import {
  FROTA,
  MEDIDAS,
  MODELO_DO_TIPO,
  naVolta,
  poseDoVeiculo,
  pontoDoCorpo,
  rotaDoVeiculo,
  trechoEm,
} from '../../src/jogo/veiculos';

/**
 * Spec 014 (T13): os veículos andam só nas pistas (regra do dono). Cada volta inteira, de
 * 5 em 5 centésimos de bloco: o centro, cada roda e todo o contorno da caixa (os lados de
 * 40 em 40 avos) caem em células de pista (asfalto, faixa amarela, zebra ou a vaga); nas
 * retas, a caixa fica dentro da faixa dela com pelo menos um quarto de bloco até o meio-fio
 * (com a carroceria inteira na reta; nas curvas e na entrada delas, sempre no asfalto).
 */
const SEMENTES = [1337, 42, 7, 2024, 99];
beforeAll(() => {
  definirEstiloMundo(obterTema('cidade-grande').mundo);
  limparCidades();
});
afterAll(() => {
  definirEstiloMundo(ESTILO_PADRAO);
  limparCidades();
});

const pista = (s: Solo) =>
  s === Solo.ASFALTO || s === Solo.FAIXA || s === Solo.ZEBRA || s === Solo.VAGA;

function conferirVolta(p: PlanoCidade, id: number): string[] {
  const def = FROTA[id];
  const m = MEDIDAS[MODELO_DO_TIPO[def.tipo]];
  const r = rotaDoVeiculo(p, def);
  const erros: string[] = [];
  const contorno: [number, number][] = [];
  for (let k = 0; k <= 40; k++)
    for (const lz of [-m.meiaLarg, m.meiaLarg])
      contorno.push([-m.meioComp + (k / 40) * 2 * m.meioComp, lz]);
  for (let lz = -m.meiaLarg; lz <= m.meiaLarg + 1e-9; lz += 0.25)
    for (const fx of [-m.meioComp, m.meioComp]) contorno.push([fx, lz]);
  for (const ex of m.eixos) for (const lz of [-m.bitola, m.bitola]) contorno.push([ex, lz]);
  for (let s = 0; s < r.comp; s += 0.05) {
    const pose = poseDoVeiculo(r, m, s);
    const t = trechoEm(r, s);
    for (const [fx, lz] of [[0, 0] as [number, number], ...contorno]) {
      const [x, z] = pontoDoCorpo(pose, fx, lz);
      const solo = soloDaCidade(p, Math.floor(x), Math.floor(z));
      if (!pista(solo))
        erros.push(
          `${def.tipo}#${id} s=${s.toFixed(2)} ${t.tipo} (${fx},${lz}) em ${x.toFixed(2)},${z.toFixed(2)} solo ${solo}`,
        );
    }
    // com a carroceria inteira na reta (as duas rodas de apoio nela), a caixa fica na faixa
    const apoio = m.apoio ?? (m.eixos[1] - m.eixos[0]) / 2;
    const naReta =
      trechoEm(r, naVolta(r, s - apoio)) === t && trechoEm(r, naVolta(r, s + apoio)) === t;
    if (t.tipo === 'reta' && t.pista !== undefined && naReta) {
      const pi = p.pistas[t.pista];
      const [a, b] =
        pi.eixo === 'z' ? [pi.celulas.x0, pi.celulas.x1 + 1] : [pi.celulas.z0, pi.celulas.z1 + 1];
      for (const lz of [-m.meiaLarg, m.meiaLarg]) {
        const [x, z] = pontoDoCorpo(pose, 0, lz);
        const lat = pi.eixo === 'z' ? x : z;
        if (lat < a + 0.25 - 1e-9 || lat > b - 0.25 + 1e-9)
          erros.push(
            `${def.tipo}#${id} s=${s.toFixed(2)} fora da faixa ${pi.id}: ${lat.toFixed(3)} em [${a}, ${b}]`,
          );
      }
    }
  }
  return erros;
}

describe('veículos só nas pistas', () => {
  for (const semente of SEMENTES)
    it(`semente ${semente}: cada volta inteira fica no asfalto`, () => {
      const p = cidadeDoMundo(semente)!;
      expect(p).toBeTruthy();
      const erros: string[] = [];
      for (const d of FROTA) erros.push(...conferirVolta(p, d.id));
      expect(erros.slice(0, 20)).toEqual([]);
    });
});
