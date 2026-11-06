import { describe, expect, it } from 'vitest';
import { Bloco, REGISTRO_BLOCOS } from '../../src/world/blocks';
import {
  DUREZA,
  INTERVALO_COLOCAR,
  atualizarMineracao,
  colocacaoPermitida,
  criarEstadoMineracao,
  estagioRachadura,
  type AlvoMineracao,
  type EstadoMineracao,
} from '../../src/player/mineracao';

const pedra: AlvoMineracao = { x: 1, y: 5, z: 1, bloco: Bloco.PEDRA_RACHADA };
const terra: AlvoMineracao = { x: 2, y: 5, z: 1, bloco: Bloco.TERRA_MUSGOSA };

function passo(e: EstadoMineracao, dt: number, segurando: boolean, alvo: AlvoMineracao | null) {
  return atualizarMineracao(e, { dt, segurando, alvo });
}

describe('dureza', () => {
  it('cobre todo bloco sólido ou planta (menos a rocha-matriz), até 3 s', () => {
    for (const d of REGISTRO_BLOCOS) {
      if ((d.solido || d.planta) && d.id !== Bloco.ROCHA_MATRIZ) {
        expect(DUREZA[d.id], d.nome).toBeTypeOf('number');
        expect(DUREZA[d.id]).toBeLessThanOrEqual(3);
      }
    }
    expect(DUREZA[Bloco.ROCHA_MATRIZ]).toBeUndefined();
    expect(DUREZA[Bloco.PEDRA_RACHADA]).toBe(1.6);
    expect(DUREZA[Bloco.FOLHAGEM]).toBe(0.3);
    expect(DUREZA[Bloco.CRISTAL_LUZ]).toBe(1.4);
    expect(DUREZA[Bloco.AR]).toBeUndefined();
  });
});

describe('atualizarMineracao', () => {
  it('só quebra ao chegar a 1', () => {
    let r = passo(criarEstadoMineracao(), 0.8, true, pedra);
    expect(r.quebrou).toBe(false);
    expect(r.progresso).toBeCloseTo(0.5);
    r = passo(r.estado, 0.8, true, pedra);
    expect(r.quebrou).toBe(true);
  });

  it('após quebrar, não guarda dano e novo bloco igual recomeça em 0', () => {
    let r = passo(criarEstadoMineracao(), 0.8, true, pedra);
    r = passo(r.estado, 0.8, true, pedra);
    expect(r.quebrou).toBe(true);
    expect(r.estado.danos.size).toBe(0);
    expect(r.estado.danos.has('1,5,1')).toBe(false);
    const novo = passo(r.estado, 0.16, true, pedra);
    expect(novo.progresso).toBeCloseTo(0.1);
  });

  it('planta quebra no primeiro passo', () => {
    const r = passo(criarEstadoMineracao(), 0.016, true, { ...pedra, bloco: Bloco.FLOR });
    expect(r.quebrou).toBe(true);
    expect(r.golpe).toBe(true);
  });

  it('ar não é minerável', () => {
    const r = passo(criarEstadoMineracao(), 5, true, { ...pedra, bloco: Bloco.AR });
    expect(r.quebrou).toBe(false);
    expect(r.estado.danos.size).toBe(0);
  });

  it('decai linearmente ao soltar, sem ficar negativo, e retoma do valor decaído', () => {
    let r = passo(criarEstadoMineracao(), 0.8, true, pedra);
    r = passo(r.estado, 0.25, false, pedra);
    expect(r.estado.danos.get('1,5,1')?.progresso).toBeCloseTo(0.25);
    r = passo(r.estado, 0.16, true, pedra);
    expect(r.progresso).toBeCloseTo(0.35);
    r = passo(r.estado, 5, false, null);
    expect(r.estado.danos.size).toBe(0);
  });

  it('mirar outro bloco deixa o anterior decaindo', () => {
    let r = passo(criarEstadoMineracao(), 0.8, true, pedra);
    r = passo(r.estado, 0.25, true, terra);
    expect(r.estado.danos.get('1,5,1')?.progresso).toBeCloseTo(0.25);
    expect(r.estado.danos.get('2,5,1')?.progresso).toBeCloseTo(0.5);
  });

  it('descarta dano de bloco cujo id mudou', () => {
    let r = passo(criarEstadoMineracao(), 0.8, true, pedra);
    r = passo(r.estado, 0.01, false, { ...pedra, bloco: Bloco.TABUAS });
    expect(r.estado.danos.size).toBe(0);
    r = passo(r.estado, 0.45, true, { ...pedra, bloco: Bloco.TABUAS });
    expect(r.progresso).toBeCloseTo(0.5);
  });

  it('emite golpes a cada 0,25 s segurando', () => {
    let e = criarEstadoMineracao();
    let golpes = 0;
    for (let i = 0; i < 8; i++) {
      const r = passo(e, 0.125, true, pedra);
      e = r.estado;
      if (r.golpe) golpes++;
    }
    expect(golpes).toBe(4);
  });
});

describe('estagioRachadura', () => {
  it('0 sem dano e 1 a 5 monotônico', () => {
    expect(estagioRachadura(0)).toBe(0);
    let ant = 0;
    for (let p = 0.01; p <= 1; p += 0.01) {
      const s = estagioRachadura(p);
      expect(s).toBeGreaterThanOrEqual(ant);
      expect(s).toBeGreaterThanOrEqual(1);
      expect(s).toBeLessThanOrEqual(5);
      ant = s;
    }
    expect(estagioRachadura(1)).toBe(5);
  });
});

describe('colocação', () => {
  it('respeita o intervalo de 0,15 s', () => {
    expect(INTERVALO_COLOCAR).toBe(0.15);
    expect(colocacaoPermitida(1, null)).toBe(true);
    expect(colocacaoPermitida(1.1, 1)).toBe(false);
    expect(colocacaoPermitida(1.15, 1)).toBe(true);
  });
});
