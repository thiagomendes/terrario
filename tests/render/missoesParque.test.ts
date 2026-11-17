import { describe, expect, it } from 'vitest';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Scene } from '@babylonjs/core/scene';
import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import '../../src/temas/todos';
import { planoDaVila } from '../../src/world/vilaNeon';
import { lugarDoBalao } from '../../src/jogo/missoesParque';
import { VOLTA_CARROSSEL } from '../../src/jogo/parque';
import { CARROSSEL, RODA } from '../../src/render/vila/pecasParque';
import { criarMissoesParque, type QuadroMissoes } from '../../src/render/vila/missoesParque';
import type { Faisca } from '../../src/render/vila/parque';

const plano = planoDaVila(77, { altura: () => 70, nivelMar: 62 });
const pq = plano.pontos.parque;
const chao = plano.h + 1;

function montar(temMalha = true) {
  const scene = new Scene(new NullEngine());
  const soltas: Faisca[] = [];
  const r = criarMissoesParque(scene, {
    plano,
    temMalha: () => temMalha,
    emitir: (lista) => soltas.push(...lista),
  });
  const base: QuadroMissoes = {
    t: 1,
    tNucleo: 5,
    fugidos: [true, true, true],
    eu: { x: pq.carrossel.x + 8, y: chao, z: pq.carrossel.z, yaw: 0 },
    comBalao: [],
    feno: 0,
  };
  const malha = (nome: string) => scene.getMeshByName(nome) as Mesh;
  return { scene, r, base, soltas, malha };
}

describe('as missões do parque na tela (spec 026, parte 2, etapa B)', () => {
  it('os três balões fugidos aparecem só com o chão desenhado e com a missão aberta', () => {
    const a = montar();
    a.r.quadro(a.base);
    expect(a.r.estado()).toMatchObject({ fugidos: 3, descendo: 0, naMao: 0, feno: 0 });
    a.r.quadro({ ...a.base, t: 1.1, fugidos: [true, false, true] });
    expect(a.r.estado().fugidos).toBe(2);
    const b = montar(false);
    b.r.quadro(b.base);
    expect(b.r.estado().fugidos).toBe(0);
  });

  it('os balões ficam encostados na peça de verdade e a até uns 5 blocos do chão', () => {
    // no pé da roda: logo abaixo da perna inclinada do cavalete da frente, no vão da grade
    const b0 = lugarDoBalao(pq, chao, 0, 0);
    const dx = b0.x - pq.roda.x;
    const alturaDaPerna = 0.3 + (RODA.eixo - 0.3) * (1 - dx / RODA.pe);
    // (a distância do meio do balão ao meio da perna, medida de través: a perna tem 0,23 de
    // meia grossura e o balão 0,44 de raio)
    const deTraves =
      ((alturaDaPerna - (b0.y - chao)) * RODA.pe) / Math.hypot(RODA.pe, RODA.eixo - 0.3);
    expect(deTraves).toBeGreaterThan(0.6);
    expect(deTraves).toBeLessThan(0.76);
    expect(Math.abs(dx)).toBeLessThan(2.4);
    // no carrossel: embaixo da barra do toldo (que começa a 0,42 abaixo dele), girando com ele
    const barra = chao + 1 + CARROSSEL.toldo - 0.42;
    for (const t of [0, 7, 19]) {
      const b = lugarDoBalao(pq, chao, 2, t);
      const raio = Math.hypot(b.x - pq.carrossel.x, b.z - pq.carrossel.z);
      expect(raio).toBeGreaterThan(5.45);
      expect(raio).toBeLessThan(5.75);
      expect(barra - b.y).toBeGreaterThan(0.45);
      expect(barra - b.y).toBeLessThan(0.65);
    }
    // (a conta do giro é a da malha: um ponto em (0, 0, r) girado em y por 2π·t/volta)
    const g = (Math.PI * 2 * 3) / VOLTA_CARROSSEL;
    const b3 = lugarDoBalao(pq, chao, 2, 3);
    const b0c = lugarDoBalao(pq, chao, 2, 0);
    const [x0, z0] = [b0c.x - pq.carrossel.x, b0c.z - pq.carrossel.z];
    expect(b3.x - pq.carrossel.x).toBeCloseTo(x0 * Math.cos(g) + z0 * Math.sin(g), 5);
    expect(b3.z - pq.carrossel.z).toBeCloseTo(-x0 * Math.sin(g) + z0 * Math.cos(g), 5);
    for (let i = 0; i < 3; i++)
      expect(lugarDoBalao(pq, chao, i, 0).y - chao).toBeLessThanOrEqual(5);
  });

  it('o toque: o balão desce até a mão, fica com a criança e sobe embora com brilho', () => {
    const a = montar();
    a.r.quadro(a.base);
    a.r.pegar(2, false);
    const m = a.malha('vila-balao-fugido-2');
    const y0 = m.position.y;
    a.r.quadro({ ...a.base, t: 1.6, fugidos: [true, true, false] });
    expect(a.r.estado()).toMatchObject({ fugidos: 2, descendo: 1 });
    expect(m.position.y).toBeLessThan(y0);
    // na mão: do lado direito do corpo, o fio na altura da mão
    a.r.quadro({ ...a.base, t: 2.6, fugidos: [true, true, false] });
    expect(m.position.x).toBeCloseTo(a.base.eu!.x + 0.42, 2);
    expect(m.position.y - chao).toBeGreaterThan(2);
    expect(m.position.y - chao).toBeLessThan(3);
    // sobe embora, e depois some
    a.r.quadro({ ...a.base, t: 4.9, fugidos: [true, true, false] });
    expect(m.position.y - chao).toBeGreaterThan(4);
    expect(a.soltas.length).toBeGreaterThan(0);
    a.r.quadro({ ...a.base, t: 5.6, fugidos: [true, true, false] });
    expect(a.r.estado().descendo).toBe(0);
    expect(m.isEnabled()).toBe(false);
  });

  it('o balão de presente: uma cópia por criança, em duas malhas no máximo', () => {
    const a = montar();
    const eu = a.base.eu!;
    const turma = Array.from({ length: 8 }, (_, k) => ({
      id: `crianca-${k}`,
      x: eu.x + k,
      y: chao,
      z: eu.z + 2,
      yaw: k,
    }));
    a.r.quadro({ ...a.base, fugidos: [false, false, false], comBalao: turma });
    a.r.quadro({ ...a.base, t: 2, fugidos: [false, false, false], comBalao: turma });
    expect(a.r.estado().naMao).toBe(8);
    const malhas = [0, 1].map((v) => a.malha(`vila-balao-presente-${v}`));
    expect(malhas.reduce((n, m) => n + (m.isEnabled() ? m.thinInstanceCount : 0), 0)).toBe(8);
    expect(a.scene.meshes.filter((m) => m.isEnabled()).length).toBeLessThanOrEqual(2);
    // quem anda leva o balão atrás (o fio inclina para onde ela estava), sem passar de meio bloco
    const so = (x: number) => [{ id: 'crianca-0', x, y: chao, z: eu.z + 2, yaw: 0 }];
    for (let k = 0; k < 20; k++)
      a.r.quadro({ ...a.base, t: 2.05 + k * 0.05, comBalao: so(eu.x + k * 0.3) });
    const cheia = malhas.find((m) => m.isEnabled())!;
    const mat = cheia.thinInstanceGetWorldMatrices()[0].m;
    expect(mat[4]).toBeLessThan(-0.2);
    expect(mat[5]).toBeGreaterThan(0.8);
    expect(mat[13] - chao).toBeCloseTo(0.8, 1);
    a.r.quadro({ ...a.base, t: 3.1, fugidos: [false, false, false] });
    expect(a.r.estado().naMao).toBe(0);
    expect(a.scene.meshes.filter((m) => m.isEnabled()).length).toBe(0);
  });

  it('o feno no cocho, a pelúcia da barraca e a festa da vovó', () => {
    const a = montar();
    a.r.quadro({ ...a.base, fugidos: [false, false, false], feno: 1 });
    expect(a.r.estado().feno).toBe(1);
    a.r.lanche();
    expect(a.soltas.length).toBe(12);
    a.r.quadro({ ...a.base, t: 2, fugidos: [false, false, false], feno: 2 });
    expect(a.r.estado().feno).toBe(2);
    a.r.pelucia([pq.cocho[0], chao + 1, pq.cocho[2]]);
    a.r.quadro({ ...a.base, t: 2.5, fugidos: [false, false, false], feno: 2 });
    expect(a.r.estado().pelucia).toBe(true);
    a.r.quadro({ ...a.base, t: 4.2, fugidos: [false, false, false], feno: 0 });
    expect(a.r.estado()).toMatchObject({ pelucia: false, feno: 0 });
    a.r.vovo(10, chao, 10);
    a.r.quadro({ ...a.base, t: 4.5, fugidos: [false, false, false] });
    expect(a.malha('vila-missoes-coracoes').isEnabled()).toBe(true);
    expect(a.malha('vila-missoes-estrelinhas').isEnabled()).toBe(true);
    a.r.quadro({ ...a.base, t: 9, fugidos: [false, false, false] });
    expect(a.scene.meshes.filter((m) => m.isEnabled()).length).toBe(0);
    a.r.descartar();
    expect(a.scene.meshes.length).toBe(0);
  });
});
