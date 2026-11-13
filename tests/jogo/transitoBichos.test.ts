import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import '../../src/temas/todos';
import { obterTema } from '../../src/temas';
import { cidadeDoMundo, definirEstiloMundo, ESTILO_PADRAO } from '../../src/world/chunk';
import { limparCidades, Solo, soloDaCidade } from '../../src/world/cidade';
import { CORPO_NA_RUA, corpoNaRua, criarTransito, type PessoaNaRua } from '../../src/jogo/transito';
import { FROTA, poseDoVeiculo, type MedidasVeiculo, type Pose } from '../../src/jogo/veiculos';
import { CRIATURAS_CIDADE } from '../../src/temas/cidade-grande/criaturas';
import type { TipoSer } from '../../src/jogo/criaturas';

/**
 * Spec 014 (ajustes): o cachorro grande passava por dentro do táxi. O desenho dele tem quase
 * 2 blocos do focinho ao rabo, e o veículo olhava só um círculo de 0,3. Agora o núcleo conhece
 * o corpo de cada bicho (o retângulo do desenho, girado): o veículo para antes dele como para a
 * criança, e o bicho atravessado na calçada com o focinho na faixa também segura o carro.
 */
beforeAll(() => {
  definirEstiloMundo(obterTema('cidade-grande').mundo);
  limparCidades();
});
afterAll(() => {
  definirEstiloMundo(ESTILO_PADRAO);
  limparCidades();
});

const DT = 0.05;

/** Os quatro cantos de um retângulo no chão (centro, frente unitária, meias medidas). */
function cantos(x: number, z: number, fx: number, fz: number, mf: number, ml: number) {
  const lx = -fz;
  const lz = fx;
  const r: [number, number][] = [];
  for (const a of [-1, 1])
    for (const b of [-1, 1]) r.push([x + fx * mf * a + lx * ml * b, z + fz * mf * a + lz * ml * b]);
  return r;
}
/** Dois retângulos girados se sobrepõem? (eixos separadores) */
function sobrepoem(a: [number, number][], b: [number, number][]): boolean {
  for (const pol of [a, b])
    for (const [i, j] of [
      [0, 1],
      [0, 2],
    ]) {
      const ex = pol[j][0] - pol[i][0];
      const ez = pol[j][1] - pol[i][1];
      const nx = -ez;
      const nz = ex;
      const pa = a.map(([x, z]) => x * nx + z * nz);
      const pb = b.map(([x, z]) => x * nx + z * nz);
      if (Math.max(...pa) < Math.min(...pb) || Math.max(...pb) < Math.min(...pa)) return false;
    }
  return true;
}
const caixaVeiculo = (p: Pose, m: MedidasVeiculo) =>
  cantos(p.x, p.z, p.hx, p.hz, m.meioComp, m.meiaLarg);
const caixaBicho = (b: PessoaNaRua) =>
  cantos(b.x, b.z, Math.sin(b.corpo!.yaw), Math.cos(b.corpo!.yaw), b.corpo!.frente, b.corpo!.lado);

describe('o corpo dos bichos na rua', () => {
  it('cobre o desenho de cada bicho da cidade (do focinho ao rabo, de orelha a orelha)', () => {
    for (const [tipo, pecas] of Object.entries(CRIATURAS_CIDADE)) {
      const [frente, lado] = CORPO_NA_RUA[tipo as TipoSer];
      for (const p of pecas) {
        // a peça, sem o giro: meia medida em cada eixo
        expect(Math.abs(p.p[2]) + p.t[2] / 2, `${tipo} comprimento`).toBeLessThanOrEqual(frente);
        expect(Math.abs(p.p[0]) + p.t[0] / 2, `${tipo} largura`).toBeLessThanOrEqual(lado);
      }
    }
  });

  /** Um táxi só e o meio da próxima reta comprida da volta dele (longe das zebras). */
  function taxiEDog() {
    const p = cidadeDoMundo(1337)!;
    const tr = criarTransito({ plano: p, relogioMundo: 0, frota: [FROTA[4]] });
    const v0 = tr.veiculos[0];
    const reta = v0.r.trechos.find(
      (t) => t.tipo === 'reta' && t.pista !== undefined && t.comp > 16 && t.s0 > v0.s + 4,
    )!;
    const sCao = reta.s0 + reta.comp / 2;
    const q = poseDoVeiculo(v0.r, { ...v0.m, apoio: 0 }, sCao);
    // a direita de quem anda em (hx, hz) é (hz, -hx): a calçada da faixa colada no quarteirão
    const rx = q.hz;
    const rz = -q.hx;
    return { p, tr, q, rx, rz, sCao };
  }

  it('cachorro atravessado na calçada com o focinho na faixa: o táxi para antes, sem tocar', () => {
    const { p, tr, q, rx, rz } = taxiEDog();
    // o centro do cachorro na calçada, a 1,6 do meio da faixa (a faixa tem 2 de largura)
    const x = q.x + rx * 1.6;
    const z = q.z + rz * 1.6;
    expect(soloDaCidade(p, Math.floor(x), Math.floor(z))).toBe(Solo.CALCADA);
    // olhando para a rua: o focinho entra meio bloco na faixa
    const yaw = Math.atan2(-rx, -rz);
    const cao: PessoaNaRua = { x, y: p.h + 1, z, crianca: false, corpo: corpoNaRua('cervo', yaw) };
    let menor = Infinity;
    for (let k = 0; k < 40 / DT; k++) {
      tr.passo(DT, [cao]);
      const v = tr.veiculos[0];
      if (sobrepoem(caixaVeiculo(v.pose, v.m), caixaBicho(cao))) menor = -1;
      else menor = Math.min(menor, Math.hypot(v.pose.x - x, v.pose.z - z));
    }
    const v = tr.veiculos[0];
    expect(menor).toBeGreaterThan(0);
    expect(v.v).toBe(0);
    expect(v.motivo).toBe('gente');
  });

  it('cachorro de lado na calçada (o focinho fora da faixa): o táxi passa', () => {
    const { p, tr, q, rx, rz, sCao } = taxiEDog();
    const x = q.x + rx * 1.6;
    const z = q.z + rz * 1.6;
    // andando junto da rua (para onde o táxi vai)
    const yaw = Math.atan2(q.hx, q.hz);
    const cao: PessoaNaRua = { x, y: p.h + 1, z, crianca: false, corpo: corpoNaRua('cervo', yaw) };
    for (let k = 0; k < 40 / DT; k++) {
      tr.passo(DT, [cao]);
      const v = tr.veiculos[0];
      expect(sobrepoem(caixaVeiculo(v.pose, v.m), caixaBicho(cao))).toBe(false);
    }
    expect(
      tr.veiculos[0].s,
      `${tr.veiculos[0].motivo} v=${tr.veiculos[0].v} cao=${sCao}`,
    ).toBeGreaterThan(sCao + 6);
  });

  it('cachorro no meio da faixa, de lado para o táxi: ele para a 1,5 bloco do corpo, não do centro', () => {
    const { p, tr, q } = taxiEDog();
    // atravessado na faixa (o comprimento todo na frente do carro)
    const yaw = Math.atan2(q.hz, -q.hx);
    const cao: PessoaNaRua = {
      x: q.x,
      y: p.h + 1,
      z: q.z,
      crianca: false,
      corpo: corpoNaRua('cervo', yaw),
    };
    for (let k = 0; k < 40 / DT; k++) tr.passo(DT, [cao]);
    const v = tr.veiculos[0];
    expect(v.v).toBe(0);
    // da frente do táxi até o lado do cachorro (meio lado 0,44)
    const f = (cao.x - v.pose.x) * v.pose.hx + (cao.z - v.pose.z) * v.pose.hz;
    const vao = f - v.m.meioComp - CORPO_NA_RUA.cervo[1];
    expect(vao).toBeGreaterThan(1.3);
    expect(vao).toBeLessThan(2.2);
  });

  it('a folga de um bicho até o veículo: negativa encostado, positiva longe, nada acima do teto', () => {
    const { p, tr } = taxiEDog();
    const v = tr.veiculos[0];
    const lado = (d: number, yaw: number): PessoaNaRua => ({
      x: v.pose.x - v.pose.hz * d,
      y: p.h + 1,
      z: v.pose.z + v.pose.hx * d,
      crianca: false,
      corpo: corpoNaRua('cervo', yaw),
    });
    const paralelo = Math.atan2(v.pose.hx, v.pose.hz);
    const deFrente = Math.atan2(-v.pose.hz, v.pose.hx);
    // de lado, colado: 0,74 do carro + 0,44 do cachorro
    expect(tr.folga(lado(v.m.meiaLarg + 0.44 + 0.3, paralelo))).toBeCloseTo(0.3, 5);
    expect(tr.folga(lado(v.m.meiaLarg + 0.44 + 0.3, deFrente))).toBeLessThan(0);
    expect(tr.folga({ ...lado(0, paralelo), y: p.h + 1 + 3 })).toBe(Infinity);
  });
});
