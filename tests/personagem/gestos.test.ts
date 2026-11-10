import { describe, expect, it } from 'vitest';
import { calcularPose, type Pose } from '../../src/personagem/poses';
import {
  GESTOS,
  IDS_GESTOS,
  aplicarGesto,
  criarTocadorGesto,
  duracaoDoGesto,
  ehGesto,
  estadoParaGesto,
  interrompeGesto,
  pesoDoGesto,
  type EstadoGesto,
} from '../../src/personagem/gestos';
import { ICONES_GESTOS, svgDoBalao } from '../../src/ui/iconesGestos';

const parado = (): Pose =>
  calcularPose({
    andando: false,
    correndo: false,
    noAr: false,
    minerando: false,
    colocando: false,
    tempo: 0.3,
  });
const quieto: EstadoGesto = { andando: false, noAr: false, ocupado: false };
/** Rotação z do braço como o boneco aplica (render/boneco.ts). */
const zDireito = (p: Pose) => -0.06 - (p.bracoDireitoAbre ?? 0);
const zEsquerdo = (p: Pose) => 0.06 + (p.bracoEsquerdoAbre ?? 0);

describe('os 8 gestos do esboço', () => {
  it('ids, nomes, durações e ícones', () => {
    expect(IDS_GESTOS).toEqual([
      'acenar',
      'cumprimentar',
      'chamar',
      'comemorar',
      'aplaudir',
      'dancar',
      'apontar',
      'sentar',
    ]);
    expect(GESTOS.map((g) => g.id)).toEqual([...IDS_GESTOS]);
    expect(GESTOS.map((g) => g.duracao)).toEqual([1.8, 1.4, 1.8, 1.6, 1.8, 3.2, 1.8, Infinity]);
    for (const g of GESTOS) {
      expect(g.nome.length).toBeLessThanOrEqual(12);
      expect(ICONES_GESTOS[g.id]).toContain('<path');
      expect(svgDoBalao(g.id)).toContain('#fff7e8');
    }
    expect(ehGesto('dancar')).toBe(true);
    expect(ehGesto('voar')).toBe(false);
    expect(ehGesto(undefined)).toBe(false);
  });

  it('entra e sai suave: peso 0 no começo e no fim, 1 no meio', () => {
    for (const id of IDS_GESTOS) {
      expect(pesoDoGesto(id, 0)).toBe(0);
      expect(pesoDoGesto(id, 0.5)).toBe(1);
      expect(pesoDoGesto(id, -1)).toBe(0);
      if (Number.isFinite(duracaoDoGesto(id))) {
        expect(pesoDoGesto(id, duracaoDoGesto(id))).toBe(0);
        expect(pesoDoGesto(id, duracaoDoGesto(id) + 0.1)).toBe(0);
      } else expect(pesoDoGesto(id, 600)).toBe(1);
    }
  });

  it('cada pose mexe o que o esboço mexe, e só valores finitos', () => {
    const em = (id: (typeof IDS_GESTOS)[number], f = 0.6) => aplicarGesto(parado(), id, f);
    // acenar: braço direito no alto, para o lado
    expect(zDireito(em('acenar'))).toBeGreaterThan(2);
    // cumprimentar: reverência (tronco e cabeça para a frente)
    const c = em('cumprimentar', 0.35);
    expect(c.troncoX).toBeGreaterThan(0.4);
    expect(c.cabeca).toBeGreaterThan(0.4);
    // chamar: braço à frente
    expect(em('chamar').bracoDireito).toBeLessThan(-1);
    // comemorar: os dois braços no alto
    const co = em('comemorar');
    expect(zDireito(co)).toBeGreaterThan(2.5);
    expect(zEsquerdo(co)).toBeLessThan(-2.5);
    // aplaudir: os dois braços à frente, as mãos se encontram
    const ap = em('aplaudir');
    expect(ap.bracoDireito).toBeLessThan(-1);
    expect(ap.bracoEsquerdo).toBeLessThan(-1);
    // dançar: o tronco gira e balança
    const d = em('dancar', 0.4);
    expect(Math.abs(d.troncoY ?? 0)).toBeGreaterThan(0.2);
    // apontar: braço reto à frente, a cabeça vira um pouco
    const a = em('apontar');
    expect(a.bracoDireito).toBeCloseTo(-1.55, 1);
    expect(a.cabecaGiro).toBeCloseTo(0.2, 1);
    // sentar: pernas para a frente e o corpo desce
    const s = em('sentar', 1);
    expect(s.pernaDireita).toBeCloseTo(-1.45, 2);
    expect(s.pernaEsquerda).toBeCloseTo(-1.45, 2);
    expect(s.corpoY!).toBeLessThan(-0.2);
    for (const id of IDS_GESTOS)
      for (const f of [0, 0.1, 0.5, 1, 2, 3])
        for (const v of Object.values(em(id, f)))
          if (typeof v === 'number') expect(Number.isFinite(v)).toBe(true);
  });

  it('acabou: a pose volta a ser a do animador', () => {
    const base = parado();
    const depois = aplicarGesto(parado(), 'acenar', 5);
    expect(depois).toEqual(base);
  });
});

describe('tocador de gesto', () => {
  it('toca até o fim e para sozinho', () => {
    const t = criarTocadorGesto();
    t.iniciar('aplaudir');
    let p = parado();
    for (let i = 0; i < 30; i++) p = t.aplicar(parado(), 1 / 30, quieto);
    expect(t.atual).toBe('aplaudir');
    expect(p.bracoDireito).toBeLessThan(-1);
    for (let i = 0; i < 40; i++) t.aplicar(parado(), 1 / 30, quieto);
    expect(t.atual).toBeNull();
    expect(t.aplicar(parado(), 1 / 30, quieto)).toEqual(parado());
  });

  it('andar, pular, minerar, colocar e comer interrompem; sentar fica até andar', () => {
    for (const e of [
      { ...quieto, andando: true },
      { ...quieto, noAr: true },
      { ...quieto, ocupado: true },
    ]) {
      expect(interrompeGesto(e)).toBe(true);
      const t = criarTocadorGesto();
      t.iniciar('dancar');
      t.aplicar(parado(), 0.1, quieto);
      t.aplicar(parado(), 0.1, e);
      expect(t.atual).toBeNull();
    }
    const t = criarTocadorGesto();
    t.iniciar('sentar');
    for (let i = 0; i < 600; i++) t.aplicar(parado(), 0.1, quieto);
    expect(t.atual).toBe('sentar');
    t.aplicar(parado(), 0.1, { ...quieto, andando: true });
    expect(t.atual).toBeNull();
  });

  it('outro gesto troca o que estava (recomeça do zero)', () => {
    const t = criarTocadorGesto();
    t.iniciar('acenar');
    t.aplicar(parado(), 1, quieto);
    t.iniciar('comemorar');
    expect(t.atual).toBe('comemorar');
    expect(t.tempo).toBe(0);
  });

  it('o estado vem do mesmo que o animador recebe', () => {
    const nada = { golpe: null, colocar: null, comer: null };
    expect(estadoParaGesto({ velocidadeHoriz: 0, noChao: true }, nada)).toEqual(quieto);
    expect(estadoParaGesto({ velocidadeHoriz: 2, noChao: true }, nada).andando).toBe(true);
    expect(estadoParaGesto({ velocidadeHoriz: 0, noChao: false }, nada).noAr).toBe(true);
    // voando parado no criativo pode gesticular
    expect(estadoParaGesto({ velocidadeHoriz: 0, noChao: false, voando: true }, nada)).toEqual(
      quieto,
    );
    expect(
      estadoParaGesto({ velocidadeHoriz: 0, noChao: true }, { ...nada, golpe: 0.2 }).ocupado,
    ).toBe(true);
  });
});
