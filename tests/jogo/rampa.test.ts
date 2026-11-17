import { describe, expect, it } from 'vitest';
import {
  ALTO_DO_TRILHO,
  MEDIDA_RAMPA,
  VELOCIDADE_TRILHO,
  alturaDoDeck,
  alturaNaRampa,
  duracaoDoTrilho,
  entraNoTrilho,
  inclinacaoNaRampa,
  instanteDoClac,
  lugarNoTrilho,
  podeEntrar,
  tempos,
  trilhoDaRede,
  trilhoParaARede,
  type RampaSkate,
  type Trilho,
} from '../../src/jogo/rampa';

/**
 * Spec 026 (parte 3): a rampa de skate em U e o trilho que leva o skate (puro: o núcleo e a tela
 * fazem a mesma conta). Sobe a curva, para lá em cima com o "clac", vira, desce e atravessa o
 * fundo até o pé da outra curva; sem manobra, sem tombo, sem pulo de lugar.
 */
const R: RampaSkate = { x: 100.5, y: 70, z: 50, z0: 44, z1: 56, ...MEDIDA_RAMPA };

describe('a forma da rampa', () => {
  it('o fundo é reto, a curva sobe lisa até a borda e o deck fica em cima', () => {
    expect(alturaNaRampa(R, 0)).toBe(0);
    expect(alturaNaRampa(R, R.meia)).toBe(0);
    const H = alturaDoDeck(R);
    expect(H).toBeGreaterThan(1.2);
    expect(H).toBeLessThan(1.6);
    // sobe sempre, sem degrau
    let antes = 0;
    for (let s = R.meia; s <= R.meia + R.curva; s += 0.05) {
      const h = alturaNaRampa(R, s);
      expect(h).toBeGreaterThanOrEqual(antes - 1e-9);
      expect(h - antes).toBeLessThan(0.1);
      antes = h;
    }
    expect(alturaNaRampa(R, R.meia + R.curva + 1)).toBeCloseTo(H, 9);
    // simétrica
    expect(alturaNaRampa(R, -4.2)).toBeCloseTo(alturaNaRampa(R, 4.2), 9);
    // a curva fica de pé no máximo uns 55° na borda (uma mini rampa de criança)
    expect(inclinacaoNaRampa(R, R.meia + R.curva - 1e-6)).toBeLessThan((56 * Math.PI) / 180);
  });
});

describe('o trilho do skate', () => {
  const t0: Trilho = { lado: 1, s0: R.meia - 0.6, z: 50, desde: 100 };

  it('sobe a curva, para lá em cima, vira de frente, desce e para no pé da outra curva', () => {
    const T = tempos(R, t0);
    const fases: string[] = [];
    let antes = lugarNoTrilho(R, t0, 100);
    expect(antes.x).toBeCloseTo(R.x + t0.s0, 6);
    expect(antes.y).toBeCloseTo(R.y, 6);
    let maisAlto = antes;
    for (let t = 100; t <= 100 + T.total + 0.2; t += 1 / 60) {
      const l = lugarNoTrilho(R, t0, t);
      if (fases[fases.length - 1] !== l.fase) fases.push(l.fase);
      // nunca pula de lugar (no máximo um passo de velocidade de um quadro, com folga)
      expect(Math.hypot(l.x - antes.x, l.y - antes.y)).toBeLessThan(0.2);
      // sempre em cima da superfície (sem afundar nem voar)
      expect(l.y - R.y).toBeCloseTo(alturaNaRampa(R, l.x - R.x), 6);
      if (l.y > maisAlto.y) maisAlto = l;
      antes = l;
    }
    expect(fases).toEqual(['sobe', 'alto', 'desce', 'fundo', 'fim']);
    // lá em cima: perto da borda, sem passar dela
    expect(maisAlto.s).toBeCloseTo(R.meia + ALTO_DO_TRILHO, 2);
    expect(maisAlto.s).toBeLessThan(R.meia + R.curva);
    // no fim: no pé da outra curva, olhando para ela
    const fim = lugarNoTrilho(R, t0, 100 + T.total + 1);
    expect(fim.s).toBeCloseTo(-R.meia, 6);
    expect(fim.yaw).toBeCloseTo(-Math.PI / 2, 6);
    expect(fim.y).toBeCloseTo(R.y, 6);
  });

  it('no fundo anda na velocidade de quem chega andando; o vai e vem dura uns 3 a 4 s', () => {
    expect(VELOCIDADE_TRILHO).toBeGreaterThan(3.5);
    expect(VELOCIDADE_TRILHO).toBeLessThan(5.5);
    const d = duracaoDoTrilho(R, t0);
    expect(d).toBeGreaterThan(2.8);
    expect(d).toBeLessThan(4.5);
    // o "clac" quando a prancha chega lá em cima
    const c = instanteDoClac(R, t0);
    expect(lugarNoTrilho(R, t0, 100 + c + 0.01).fase).toBe('alto');
  });

  it('a prancha deita com a curva (o bico para cima subindo, para baixo descendo)', () => {
    const T = tempos(R, t0);
    const subindo = lugarNoTrilho(R, t0, 100 + T.subir * 0.8);
    const descendo = lugarNoTrilho(R, t0, 100 + T.subir + T.pausa + T.descer * 0.3);
    expect(subindo.inclina).toBeGreaterThan(0.3);
    expect(descendo.inclina).toBeLessThan(-0.3);
    expect(lugarNoTrilho(R, t0, 100 + T.total - 0.1).inclina).toBeCloseTo(0, 6);
  });

  it('para o outro lado é o espelho', () => {
    const t1: Trilho = { lado: -1, s0: -(R.meia - 0.6), z: 50, desde: 0 };
    const a = lugarNoTrilho(R, t0, 101.1);
    const b = lugarNoTrilho(R, t1, 1.1);
    expect(b.s).toBeCloseTo(-a.s, 6);
    expect(b.y).toBeCloseTo(a.y, 6);
  });

  it('o trilho fica dentro das pontas da rampa', () => {
    const t: Trilho = { ...t0, z: R.z1 + 3 };
    expect(lugarNoTrilho(R, t, 101).z).toBeLessThan(R.z1);
  });
});

describe('entrar no trilho', () => {
  it('de skate no fundo, perto do pé de uma curva e indo para ela', () => {
    expect(entraNoTrilho(R, R.x + R.meia - 0.4, 50, 1, 0)).toBe(1);
    expect(entraNoTrilho(R, R.x - R.meia + 0.4, 50, -1, 0.2)).toBe(-1);
    // no meio do fundo, longe das curvas: ainda não
    expect(entraNoTrilho(R, R.x, 50, 1, 0)).toBe(0);
    // indo ao longo da rampa (para as pontas), ou para longe da curva: não
    expect(entraNoTrilho(R, R.x + R.meia - 0.4, 50, 0, 1)).toBe(0);
    expect(entraNoTrilho(R, R.x + R.meia - 0.4, 50, -1, 0)).toBe(0);
    // parada: não
    expect(entraNoTrilho(R, R.x + R.meia - 0.4, 50, 0, 0)).toBe(0);
    // fora da rampa: não
    expect(entraNoTrilho(R, R.x + R.meia - 0.4, R.z1 + 2, 1, 0)).toBe(0);
  });

  it('o núcleo confere o lugar (com folga) e a altura', () => {
    expect(podeEntrar(R, R.x + R.meia - 0.4, R.y, 50, 1)).toBe(true);
    expect(podeEntrar(R, R.x + R.meia - 0.4, R.y, 50, -1)).toBe(false);
    expect(podeEntrar(R, R.x + R.meia - 0.4, R.y + 3, 50, 1)).toBe(false);
    expect(podeEntrar(R, R.x + 20, R.y, 50, 1)).toBe(false);
    expect(podeEntrar(R, R.x + R.meia - 0.4, R.y, 50, 2)).toBe(false);
    // do fim de um trilho (o pé da outra curva) o próximo já pode vir
    expect(podeEntrar(R, R.x - R.meia, R.y, 50, -1)).toBe(true);
  });
});

describe('o trilho pela rede', () => {
  it('vai e volta (centésimos de bloco, milésimos de segundo) e recusa lixo', () => {
    const t: Trilho = { lado: -1, s0: -2.4567, z: 51.239, desde: 1234.5678 };
    const r = trilhoDaRede(trilhoParaARede(t))!;
    expect(r.lado).toBe(-1);
    expect(r.s0).toBeCloseTo(-2.46, 6);
    expect(r.z).toBeCloseTo(51.24, 6);
    expect(r.desde).toBeCloseTo(1234.568, 6);
    expect(trilhoDaRede([2, 0, 0, 0])).toBeNull();
    expect(trilhoDaRede([1, Number.NaN, 0, 0])).toBeNull();
    expect(trilhoDaRede(null)).toBeNull();
  });
});
