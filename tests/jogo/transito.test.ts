import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import '../../src/temas/todos';
import { obterTema } from '../../src/temas';
import { cidadeDoMundo, definirEstiloMundo, ESTILO_PADRAO } from '../../src/world/chunk';
import { limparCidades, Solo, soloDaCidade, type PlanoCidade } from '../../src/world/cidade';
import { criarTransito, TEMPO_VAGA, type PessoaNaRua } from '../../src/jogo/transito';
import {
  FROTA,
  noPlano,
  poseDoVeiculo,
  poseNaRota,
  pontoDoCorpo,
  type Pose,
  type MedidasVeiculo,
  type Rota,
} from '../../src/jogo/veiculos';
import { criarGerador } from '../../src/audio/variacao';

/**
 * Spec 014 (T13): o trânsito no núcleo. Uma hora simulada com e sem gente na rua, em várias
 * sementes: ninguém dá nó, ninguém se encosta, todo veículo fica sempre no asfalto, para a
 * 1,5 bloco de quem está na frente (nunca chega a menos de 1), espera a criança na zebra e
 * buzina pouco; o ônibus para nos pontos (o da obra 3 só com ela feita), o sorvete na vaga.
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
const pista = (s: Solo) =>
  s === Solo.ASFALTO || s === Solo.FAIXA || s === Solo.ZEBRA || s === Solo.VAGA;

function distCaixa(p: Pose, m: MedidasVeiculo, x: number, z: number): number {
  const dx = x - p.x;
  const dz = z - p.z;
  const f = dx * p.hx + dz * p.hz;
  const l = -dx * p.hz + dz * p.hx;
  return Math.hypot(Math.max(Math.abs(f) - m.meioComp, 0), Math.max(Math.abs(l) - m.meiaLarg, 0));
}
/** Quanto falta da frente do veículo até a pessoa, se ela está no corredor da frente. */
function folgaNaFrente(p: Pose, m: MedidasVeiculo, x: number, z: number): number | null {
  const dx = x - p.x;
  const dz = z - p.z;
  const f = dx * p.hx + dz * p.hz;
  const l = -dx * p.hz + dz * p.hx;
  if (f < m.meioComp - 0.1 || Math.abs(l) > m.meiaLarg + 0.3) return null;
  return f - m.meioComp - 0.3;
}
/**
 * Quanto falta da frente até a pessoa, medido pelo caminho (que pode fazer curva), se ela
 * está no caminho do veículo (a menos de meia largura e um raio de boneco do meio dele).
 */
function folgaNoCaminho(
  v: { r: Rota; s: number; m: MedidasVeiculo },
  x: number,
  z: number,
): number | null {
  let melhor: number | null = null;
  let dMin = Infinity;
  for (let u = v.s + v.m.meioComp - 0.3; u <= v.s + v.m.meioComp + 3; u += 0.05) {
    const q = poseNaRota(v.r, u);
    const d = Math.hypot(q.x - x, q.z - z);
    if (d < dMin) {
      dMin = d;
      melhor = u;
    }
  }
  if (melhor === null || dMin > v.m.meiaLarg + 0.3) return null;
  return melhor - (v.s + v.m.meioComp) - 0.3;
}
/** Caixas de dois veículos se tocam? (amostras do contorno de um dentro do outro) */
function encostam(a: Pose, ma: MedidasVeiculo, b: Pose, mb: MedidasVeiculo): boolean {
  if (Math.hypot(a.x - b.x, a.z - b.z) > ma.meioComp + mb.meioComp + 2) return false;
  for (let fx = -ma.meioComp; fx <= ma.meioComp + 1e-9; fx += 0.25)
    for (const lz of [-ma.meiaLarg, 0, ma.meiaLarg]) {
      const [x, z] = pontoDoCorpo(a, fx, lz);
      if (distCaixa(b, mb, x, z) < 0.05) return true;
    }
  return false;
}

/** Pontos de rua (pista) do plano: onde os bonecos de teste ficam e andam. */
function pontosDeRua(p: PlanoCidade): [number, number][] {
  const r: [number, number][] = [];
  for (const pi of p.pistas)
    for (let x = pi.celulas.x0; x <= pi.celulas.x1; x += 3)
      for (let z = pi.celulas.z0; z <= pi.celulas.z1; z += 3) r.push([x + 0.5, z + 0.5]);
  return r;
}

interface Boneco extends PessoaNaRua {
  alvo: [number, number];
  espera: number;
  /** Segundos sem conseguir dar o passo (um carro no caminho): desiste e vai para outro lado. */
  preso: number;
}

function simular(semente: number, segundos: number, comBonecos: boolean) {
  const p = cidadeDoMundo(semente)!;
  const tr = criarTransito({ plano: p, relogioMundo: semente * 13, obraFeita: (n) => n === 3 });
  const rng = criarGerador(semente);
  const rua = pontosDeRua(p);
  // só onde passa algum veículo (perto da frota), para a conta valer
  const cheios = rua.filter(([x, z]) =>
    tr.veiculos.some((v) => {
      for (let s = 0; s < v.r.comp; s += 4) {
        const q = poseDoVeiculo(v.r, v.m, s);
        if (Math.hypot(q.x - x, q.z - z) < 3) return true;
      }
      return false;
    }),
  );
  const bonecos: Boneco[] = [];
  if (comBonecos)
    for (let i = 0; i < 8; i++) {
      const [x, z] = cheios[Math.floor(rng() * cheios.length)];
      bonecos.push({
        x,
        y: p.h + 1,
        z,
        crianca: i < 5,
        alvo: [x, z],
        espera: rng() * 20,
        preso: 0,
      });
    }
  const voltas0 = tr.veiculos.map((v) => v.s);
  const r = {
    p,
    tr,
    fora: [] as string[],
    encostou: [] as string[],
    perto: [] as string[],
    planos: 0,
    eventos: {} as Record<string, number>,
    buzinas: new Map<number, number[]>(),
    paradoSemNinguem: new Array(FROTA.length).fill(0) as number[],
    maiorParadoSemNinguem: new Array(FROTA.length).fill(0) as number[],
    voltas: [] as number[],
    sopros: 0,
  };
  let antes = tr.veiculos;
  for (let k = 0; k < segundos / DT; k++) {
    // bonecos: param, andam devagar pela rua até outro ponto e nunca entram num carro
    for (const b of bonecos) {
      if (b.espera > 0) {
        b.espera -= DT;
        continue;
      }
      const dx = b.alvo[0] - b.x;
      const dz = b.alvo[1] - b.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.2) {
        b.espera = 5 + rng() * 40;
        b.alvo = cheios[Math.floor(rng() * cheios.length)];
        if (Math.hypot(b.alvo[0] - b.x, b.alvo[1] - b.z) > 30)
          b.alvo = [b.x + (rng() - 0.5) * 16, b.z + (rng() - 0.5) * 16];
        continue;
      }
      const nx = b.x + (dx / d) * 1.3 * DT;
      const nz = b.z + (dz / d) * 1.3 * DT;
      // não entram num carro nem se jogam na frente de um que está andando
      if (
        antes.some((v) => {
          if (distCaixa(v.pose, v.m, nx, nz) < 0.45) return true;
          const f = folgaNaFrente(v.pose, v.m, nx, nz);
          return v.v > 0.1 && f !== null && f < 1.5;
        })
      ) {
        b.preso += DT;
        if (b.preso > 3) {
          b.preso = 0;
          b.alvo = [b.x + (rng() - 0.5) * 12, b.z + (rng() - 0.5) * 12];
        }
        continue;
      }
      b.preso = 0;
      b.x = nx;
      b.z = nz;
    }
    tr.passo(DT, bonecos);
    r.planos += tr.tirarMudados().length;
    for (const e of tr.tirarEventos()) {
      r.eventos[e.o] = (r.eventos[e.o] ?? 0) + 1;
      if (e.o === 'buzina') {
        const l = r.buzinas.get(e.id) ?? [];
        l.push(k * DT);
        r.buzinas.set(e.id, l);
      }
    }
    const agora = tr.veiculos;
    for (let i = 0; i < agora.length; i++) {
      const v = agora[i];
      const a = antes[i];
      const andou = v.s - a.s > 1e-6;
      // no asfalto: as rodas e o contorno
      if (k % 4 === 0)
        for (const fx of [-v.m.meioComp, 0, v.m.meioComp])
          for (const lz of [-v.m.meiaLarg, v.m.meiaLarg]) {
            const [x, z] = pontoDoCorpo(v.pose, fx, lz);
            if (!pista(soloDaCidade(p, Math.floor(x), Math.floor(z))))
              r.fora.push(
                `${v.tipo}#${v.id} t=${(k * DT).toFixed(1)} (${x.toFixed(2)}, ${z.toFixed(2)})`,
              );
          }
      for (let j = i + 1; j < agora.length; j++)
        if (
          encostam(v.pose, v.m, agora[j].pose, agora[j].m) ||
          encostam(agora[j].pose, agora[j].m, v.pose, v.m)
        )
          r.encostou.push(
            `${v.tipo}#${v.id} e ${agora[j].tipo}#${agora[j].id} t=${(k * DT).toFixed(1)}`,
          );
      for (const b of bonecos) {
        if (!andou) continue;
        const dc = distCaixa(v.pose, v.m, b.x, b.z);
        if (dc > 4) continue;
        const f = folgaNoCaminho(v, b.x, b.z);
        if ((f !== null && f < 1 - 0.3) || dc < 0.3)
          r.perto.push(
            `${v.tipo}#${v.id} t=${(k * DT).toFixed(1)} folga ${f?.toFixed(2)} caixa ${dc.toFixed(2)}`,
          );
      }
      // parado sem ninguém por perto (nó de verdade): conta
      const alguem = bonecos.some((b) => Math.hypot(b.x - v.pose.x, b.z - v.pose.z) < 14);
      if (!andou && !v.parada && !alguem) {
        r.paradoSemNinguem[i] += DT;
        r.maiorParadoSemNinguem[i] = Math.max(r.maiorParadoSemNinguem[i], r.paradoSemNinguem[i]);
      } else r.paradoSemNinguem[i] = 0;
    }
    antes = agora;
  }
  r.voltas = tr.veiculos.map((v, i) => (v.s - voltas0[i]) / v.r.comp);
  r.sopros = r.eventos['sopro'] ?? 0;
  return r;
}

describe('trânsito: uma hora simulada', () => {
  for (const semente of [1337, 42, 7])
    it(`semente ${semente}: sem gente, todos andam, sem nó e sem encostar`, () => {
      const r = simular(semente, 3600, false);
      expect(r.fora.slice(0, 5)).toEqual([]);
      expect(r.encostou.slice(0, 5)).toEqual([]);
      for (let i = 0; i < FROTA.length; i++) {
        expect(r.voltas[i], FROTA[i].tipo).toBeGreaterThan(FROTA[i].tipo === 'sorvete' ? 10 : 25);
        expect(r.maiorParadoSemNinguem[i], FROTA[i].tipo).toBeLessThan(20);
      }
      expect(r.sopros).toBe(0);
      // poucos planos: alguns por minuto por veículo
      expect(r.planos / 60 / FROTA.length).toBeLessThan(15);
    });

  for (const semente of [1337, 2024])
    it(`semente ${semente}: com crianças e bichos na rua, ninguém é tocado e ninguém fica preso`, () => {
      const r = simular(semente, 3600, true);
      expect(r.fora.slice(0, 5)).toEqual([]);
      expect(r.encostou.slice(0, 5)).toEqual([]);
      expect(r.perto.slice(0, 5)).toEqual([]);
      for (let i = 0; i < FROTA.length; i++) {
        // criança parada na frente pode segurar um carro o tempo que quiser; ninguém fica parado
        expect(r.voltas[i], FROTA[i].tipo).toBeGreaterThan(1);
        expect(r.maiorParadoSemNinguem[i], FROTA[i].tipo).toBeLessThan(60);
      }
      // buzina: no máximo uma a cada 8 s por veículo
      for (const [, l] of r.buzinas)
        for (let i = 1; i < l.length; i++) expect(l[i] - l[i - 1]).toBeGreaterThanOrEqual(7.99);
    });
});

describe('trânsito: gente na rua', () => {
  /** Um veículo só (os outros longe), andando até o cruzamento do fim da primeira reta. */
  function soUm(id: number) {
    const p = cidadeDoMundo(1337)!;
    const tr = criarTransito({ plano: p, relogioMundo: 0, frota: [FROTA[id]] });
    return { p, tr };
  }

  it('para antes da zebra com a criança nela, espera, buzina pouco e segue quando ela sai', () => {
    const { p, tr } = soUm(4);
    const v0 = tr.veiculos[0];
    // a zebra do fim da reta onde ele está: o ponto do meio da faixa na borda do cruzamento
    const t = v0.r.trechos.find((q) => q.cruzamento !== undefined && q.s0 > v0.s)!;
    const borda = poseDoVeiculo(v0.r, { ...v0.m, apoio: 0 }, t.s0);
    const zebra = t.hx !== 0 ? 2 : 1;
    // a criança na zebra, na faixa do outro lado da rua (não no caminho dele): ele para igual
    const lado: [number, number] = [-t.hz, t.hx];
    const cx = borda.x - t.hx * (zebra / 2) + lado[0] * 2;
    const cz = borda.z - t.hz * (zebra / 2) + lado[1] * 2;
    expect(soloDaCidade(p, Math.floor(cx), Math.floor(cz))).toBe(Solo.ZEBRA);
    const crianca: PessoaNaRua = { x: cx, y: p.h + 1, z: cz, crianca: true };
    const buzinas: number[] = [];
    let t0 = 0;
    for (let k = 0; k < 60 / DT; k++) {
      tr.passo(DT, [crianca]);
      for (const e of tr.tirarEventos()) if (e.o === 'buzina') buzinas.push(k * DT);
      tr.tirarMudados();
      if (k * DT > 50 && !t0) t0 = k * DT;
    }
    const v = tr.veiculos[0];
    expect(v.v).toBe(0);
    // a frente parou antes da zebra
    const frente = v.s + v.m.meioComp;
    expect(frente).toBeLessThanOrEqual(t.s0 - zebra + 1e-6);
    expect(frente).toBeGreaterThan(t.s0 - zebra - 2);
    // fom-fom: no máximo três por espera, um a cada 8 s
    expect(buzinas.length).toBeGreaterThan(0);
    expect(buzinas.length).toBeLessThanOrEqual(3);
    // a criança sai: ele segue e passa pelo cruzamento
    for (let k = 0; k < 15 / DT; k++) tr.passo(DT, []);
    expect(tr.veiculos[0].s).toBeGreaterThan(t.s0 + t.comp);
  });

  it('criança parada na frente: freia devagar e para a 1,5 bloco, sem tocar', () => {
    const { p, tr } = soUm(4);
    const v0 = tr.veiculos[0];
    // 18 blocos à frente, no meio da faixa
    const q = poseDoVeiculo(v0.r, { ...v0.m, apoio: 0 }, v0.s + 18);
    const crianca: PessoaNaRua = { x: q.x, y: p.h + 1, z: q.z, crianca: true };
    let maiorFreada = 0;
    for (let k = 0; k < 20 / DT; k++) {
      tr.passo(DT, [crianca]);
      for (const pl of tr.tirarMudados()) maiorFreada = Math.max(maiorFreada, -pl.a);
      tr.tirarEventos();
    }
    const v = tr.veiculos[0];
    expect(v.v).toBe(0);
    const folga = folgaNaFrente(v.pose, v.m, crianca.x, crianca.z)! + 0.3;
    expect(folga).toBeGreaterThan(1.4);
    expect(folga).toBeLessThan(2.2);
    // devagar: nada de freada brusca vindo de longe
    expect(maiorFreada).toBeLessThan(2.5);
  });

  it('com alguém em cima ou encostado, não anda', () => {
    const { p, tr } = soUm(4);
    for (let k = 0; k < 20; k++) tr.passo(DT, []);
    const v0 = tr.veiculos[0];
    const emCima: PessoaNaRua = { x: v0.pose.x, y: p.h + 1 + 1.12, z: v0.pose.z, crianca: true };
    for (let k = 0; k < 10 / DT; k++) {
      // ele vai parar: a criança fica junto (em cima do carro parado)
      const v = tr.veiculos[0];
      emCima.x = v.pose.x;
      emCima.z = v.pose.z;
      tr.passo(DT, [emCima]);
    }
    const s = tr.veiculos[0].s;
    for (let k = 0; k < 10 / DT; k++) tr.passo(DT, [emCima]);
    expect(tr.veiculos[0].s).toBeCloseTo(s, 6);
    for (let k = 0; k < 5 / DT; k++) tr.passo(DT, []);
    expect(tr.veiculos[0].s).toBeGreaterThan(s + 1);
  });

  it('encalhado sem criança perto some num sopro e volta no começo de uma faixa', () => {
    const { p, tr } = soUm(4);
    // um bicho parado no meio do caminho para sempre (não é criança: ele some depois de 60 s)
    const v0 = tr.veiculos[0];
    const q = poseDoVeiculo(v0.r, { ...v0.m, apoio: 0 }, v0.s + 8);
    const bicho: PessoaNaRua = { x: q.x, y: p.h + 1, z: q.z, crianca: false };
    let sopro = false;
    for (let k = 0; k < 70 / DT && !sopro; k++) {
      tr.passo(DT, [bicho]);
      tr.tirarMudados();
      if (tr.tirarEventos().some((e) => e.o === 'sopro')) sopro = true;
    }
    expect(sopro).toBe(true);
    const v = tr.veiculos[0];
    expect(Math.hypot(v.pose.x - bicho.x, v.pose.z - bicho.z)).toBeGreaterThan(10);
  });
});

describe('trânsito: paradas', () => {
  it('o sorvete fica na vaga da rua (inteiro dentro dela), toca ao chegar e dá a volta', () => {
    const p = cidadeDoMundo(1337)!;
    const tr = criarTransito({ plano: p, relogioMundo: 0, frota: [FROTA[0]] });
    const v0 = tr.veiculos[0];
    expect(v0.parada).toBe('vaga');
    const dentroDaVaga = () => {
      const v = tr.veiculos[0];
      for (const fx of [-v.m.meioComp, v.m.meioComp])
        for (const lz of [-v.m.meiaLarg, v.m.meiaLarg]) {
          const [x, z] = pontoDoCorpo(v.pose, fx, lz);
          if (soloDaCidade(p, Math.floor(x), Math.floor(z)) !== Solo.VAGA) return false;
        }
      return true;
    };
    expect(dentroDaVaga()).toBe(true);
    const chegadas: number[] = [];
    let saiu = -1;
    for (let k = 0; k < (TEMPO_VAGA * 2 + 120) / DT; k++) {
      tr.passo(DT, []);
      tr.tirarMudados();
      for (const e of tr.tirarEventos()) if (e.o === 'chegou') chegadas.push(k * DT);
      if (saiu < 0 && tr.veiculos[0].parada === null) saiu = k * DT;
    }
    expect(saiu).toBeGreaterThan(TEMPO_VAGA - 1);
    expect(saiu).toBeLessThan(TEMPO_VAGA + 1);
    expect(chegadas.length).toBeGreaterThanOrEqual(1);
    // chegou de novo depois de uma volta (uns 45 a 80 s)
    expect(chegadas[0] - saiu).toBeGreaterThan(30);
    expect(chegadas[0] - saiu).toBeLessThan(100);
    expect(dentroDaVaga()).toBe(true);
  });

  it('o ônibus azul só para no ponto da obra 3 com a obra feita', () => {
    const p = cidadeDoMundo(1337)!;
    const lote = p.lotes.find((l) => l.canteiro === 3)!;
    for (const feita of [false, true]) {
      const tr = criarTransito({
        plano: p,
        relogioMundo: 0,
        frota: [FROTA[2]],
        obraFeita: () => feita,
      });
      const pontos: [number, number][] = [];
      for (let k = 0; k < 200 / DT; k++) {
        tr.passo(DT, []);
        tr.tirarMudados();
        for (const e of tr.tirarEventos()) if (e.o === 'ponto') pontos.push([e.x, e.z]);
      }
      const naObra = pontos.some(
        ([x, z]) => Math.abs(x - (lote.x0 + 3.5)) < 1 && Math.abs(z - lote.z0) < 4,
      );
      expect(naObra, `obra feita: ${feita}`).toBe(feita);
      expect(pontos.length).toBeGreaterThanOrEqual(feita ? 4 : 2);
    }
  });

  it('a polícia faz "uí-uí" na frente da praça, raro, só com criança perto', () => {
    const p = cidadeDoMundo(1337)!;
    const tr = criarTransito({ plano: p, relogioMundo: 0, frota: [FROTA[1]] });
    const praca = p.lotes.find((l) => l.uso === 'praca')!;
    const crianca: PessoaNaRua = { x: praca.x0 + 4, y: p.h + 1, z: praca.z0 + 4, crianca: true };
    const uis: number[] = [];
    for (let k = 0; k < 600 / DT; k++) {
      tr.passo(DT, [crianca]);
      tr.tirarMudados();
      for (const e of tr.tirarEventos()) if (e.o === 'uiui') uis.push(k * DT);
    }
    expect(uis.length).toBeGreaterThanOrEqual(2);
    expect(uis.length).toBeLessThanOrEqual(5);
    for (let i = 1; i < uis.length; i++) expect(uis[i] - uis[i - 1]).toBeGreaterThanOrEqual(150);
    // sem criança: nada
    const tr2 = criarTransito({ plano: p, relogioMundo: 0, frota: [FROTA[1]] });
    let algum = false;
    for (let k = 0; k < 300 / DT; k++) {
      tr2.passo(DT, []);
      if (tr2.tirarEventos().some((e) => e.o === 'uiui')) algum = true;
    }
    expect(algum).toBe(false);
  });
});

describe('trânsito: igual em todo lugar', () => {
  it('o mesmo relógio do mundo dá o mesmo começo e os mesmos planos (servidor e modo local)', () => {
    const p = cidadeDoMundo(42)!;
    const a = criarTransito({ plano: p, relogioMundo: 9876 });
    const b = criarTransito({ plano: p, relogioMundo: 9876 });
    for (let k = 0; k < 400; k++) {
      a.passo(DT, []);
      b.passo(DT, []);
    }
    expect(JSON.stringify(a.planos())).toBe(JSON.stringify(b.planos()));
    // e a conta do plano reproduz a posição do núcleo
    for (const v of a.veiculos) expect(noPlano(v.plano, a.relogio).s).toBeCloseTo(v.s, 9);
  });
});
