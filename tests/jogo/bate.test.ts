import { describe, expect, it } from 'vitest';
import {
  EMPURRAO_MAX,
  N_CARRINHOS,
  N_MORADORES_BATE,
  PASSO_BATE,
  RAIO_CARRINHO,
  VEL_GUIAR,
  acalmarPiloto,
  carrosDaVista,
  estacionar,
  guiaDaRede,
  guiaDoMorador,
  guiaParaAVaga,
  novoCarrinho,
  novoPiloto,
  passoBate,
  pilotoDoBate,
  vistaDoBate,
  type Batida,
  type Carrinho,
  type Guia,
  type PistaBate,
  type QuemGuia,
} from '../../src/jogo/bate';

/** Spec 026 (parte 2): a conta dos carrinhos do bate-bate de guiar. */
const PISTA: PistaBate = { x0: 0, z0: 0, x1: 24, z1: 13 };
const R = RAIO_CARRINHO;
const dentro = (c: Carrinho) =>
  c.x >= PISTA.x0 + R - 1e-9 &&
  c.x <= PISTA.x1 - R + 1e-9 &&
  c.z >= PISTA.z0 + R - 1e-9 &&
  c.z <= PISTA.z1 - R + 1e-9;
/** Uma sorte de teste, sempre a mesma. */
const sorteDe = (s: number) => () => {
  s = (s * 1664525 + 1013904223) >>> 0;
  return s / 4294967296;
};
const andar = (
  carros: Carrinho[],
  guias: (passo: number) => Guia[],
  segundos: number,
  batidas?: Batida[],
) => {
  const n = Math.round(segundos / PASSO_BATE);
  for (let k = 0; k < n; k++) passoBate(PISTA, carros, guias(k), PASSO_BATE, batidas);
};

describe('o bate-bate: guiar', () => {
  it('o controle aponta e o carrinho vai: vira devagar, acelera em menos de um segundo e não passa da velocidade', () => {
    const c = novoCarrinho(12, 6, 0);
    const carros = [c];
    let maior = 0;
    let chegou = -1;
    for (let k = 0; k < 60; k++) {
      const antes = { x: c.x, z: c.z, yaw: c.yaw };
      passoBate(PISTA, carros, [{ x: 1, z: 0 }]);
      const v = Math.hypot(c.x - antes.x, c.z - antes.z) / PASSO_BATE;
      maior = Math.max(maior, v);
      // virar é macio: nunca mais que um pouquinho por passo
      expect(Math.abs(c.yaw - antes.yaw)).toBeLessThanOrEqual(2.5 * PASSO_BATE + 1e-9);
      if (chegou < 0 && c.v > VEL_GUIAR * 0.9) chegou = k * PASSO_BATE;
    }
    expect(maior).toBeLessThanOrEqual(VEL_GUIAR + 1e-6);
    // sai do lugar na hora e chega perto da velocidade cheia em pouco mais de um segundo
    expect(chegou).toBeGreaterThan(0);
    expect(chegou).toBeLessThan(1.4);
    // foi para onde o controle apontou (o leste), de frente para lá
    expect(c.x).toBeGreaterThan(15);
    expect(Math.abs(c.yaw - Math.PI / 2)).toBeLessThan(0.05);
  });

  it('soltar o controle para o carrinho em pouco tempo; meio controle anda mais devagar', () => {
    const c = novoCarrinho(4, 6, Math.PI / 2);
    andar([c], () => [{ x: 1, z: 0 }], 1.5);
    expect(c.v).toBeGreaterThan(VEL_GUIAR * 0.95);
    andar([c], () => [{ x: 0, z: 0 }], 0.6);
    expect(c.v).toBe(0);
    andar([c], () => [{ x: 0.5, z: 0 }], 2);
    expect(c.v).toBeCloseTo(VEL_GUIAR * 0.5, 3);
  });

  it('com o rumo para trás ele vira quase parado e só então anda (sem ré, sem rodar feito pião)', () => {
    const c = novoCarrinho(12, 6, 0);
    andar([c], () => [{ x: 0, z: 1 }], 1.5);
    const z0 = c.z;
    let giro = 0;
    let antes = c.yaw;
    for (let k = 0; k < 60; k++) {
      passoBate(PISTA, [c], [{ x: 0, z: -1 }]);
      giro += Math.abs(Math.atan2(Math.sin(c.yaw - antes), Math.cos(c.yaw - antes)));
      antes = c.yaw;
    }
    // deu meia-volta (uma só) e está voltando
    expect(giro).toBeGreaterThan(Math.PI - 0.1);
    expect(giro).toBeLessThan(Math.PI + 0.1);
    expect(c.z).toBeLessThan(z0);
  });

  it('o controle da rede: inteiros de -100 a 100, nunca mais que 1 de força, lixo vira parado', () => {
    expect(guiaDaRede(100, 0)).toEqual({ x: 1, z: 0 });
    const g = guiaDaRede(100, 100);
    expect(Math.hypot(g.x, g.z)).toBeCloseTo(1, 9);
    expect(guiaDaRede(9999, -9999).x).toBeCloseTo(Math.SQRT1_2, 9);
    expect(guiaDaRede(NaN, Infinity)).toEqual({ x: 0, z: 0 });
  });
});

describe('o bate-bate: bater de verdade', () => {
  it('dois de frente: encostam os para-choques, voltam para trás e seguem (elástico, com teto)', () => {
    const a = novoCarrinho(6, 6, Math.PI / 2);
    const b = novoCarrinho(18, 6, -Math.PI / 2);
    const carros = [a, b];
    const batidas: Batida[] = [];
    let menor = Infinity;
    let voltou = false;
    for (let k = 0; k < 80; k++) {
      const ax = a.x;
      passoBate(PISTA, carros, [{ x: 1, z: 0 }, { x: -1, z: 0 }], PASSO_BATE, batidas);
      menor = Math.min(menor, Math.hypot(b.x - a.x, b.z - a.z));
      if (batidas.length && a.x < ax - 0.02) voltou = true;
      expect(Math.hypot(a.kx, a.kz)).toBeLessThanOrEqual(EMPURRAO_MAX + 1e-9);
    }
    // tocaram de verdade (para-choque no para-choque) e nunca entraram um no outro
    expect(menor).toBeGreaterThanOrEqual(2 * R - 1e-6);
    expect(menor).toBeLessThan(2 * R + 0.02);
    expect(batidas.length).toBeGreaterThanOrEqual(1);
    expect(batidas[0]).toMatchObject({ a: 0, b: 1 });
    // a força é a velocidade de um contra o outro, e o lugar é o meio dos dois
    expect(batidas[0].f).toBeGreaterThan(VEL_GUIAR * 1.6);
    expect(batidas[0].x).toBeCloseTo(12, 0);
    expect(voltou).toBe(true);
  });

  it('quem bate num carrinho parado empurra ele para a frente e perde o embalo', () => {
    const a = novoCarrinho(6, 6, Math.PI / 2);
    const b = novoCarrinho(12, 6, 0);
    const batidas: Batida[] = [];
    let vNaBatida = -1;
    for (let k = 0; k < 60 && vNaBatida < 0; k++) {
      passoBate(PISTA, [a, b], [{ x: 1, z: 0 }, { x: 0, z: 0 }], PASSO_BATE, batidas);
      if (batidas.length) vNaBatida = a.v;
    }
    expect(vNaBatida).toBeGreaterThanOrEqual(0);
    expect(vNaBatida).toBeLessThan(VEL_GUIAR * 0.4);
    expect(b.kx).toBeGreaterThan(1.5);
    const bx = b.x;
    andar([a, b], () => [{ x: 0, z: 0 }, { x: 0, z: 0 }], 1.5);
    // o parado andou um pouco e parou sozinho (o empurrão some), sem virar
    expect(b.x - bx).toBeGreaterThan(0.4);
    expect(b.x - bx).toBeLessThan(2);
    expect(Math.hypot(b.kx, b.kz)).toBeLessThan(0.05);
    expect(b.yaw).toBe(0);
  });

  it('a mureta devolve: bate, volta um pouco e nunca sai da pista', () => {
    const c = novoCarrinho(20, 6, Math.PI / 2);
    const batidas: Batida[] = [];
    let voltou = false;
    for (let k = 0; k < 200; k++) {
      const x = c.x;
      passoBate(PISTA, [c], [{ x: 1, z: 0 }], PASSO_BATE, batidas);
      if (c.x < x - 0.01) voltou = true;
      expect(dentro(c)).toBe(true);
    }
    expect(voltou).toBe(true);
    expect(batidas[0]).toMatchObject({ a: 0, b: -1 });
    expect(batidas[0].x).toBeCloseTo(PISTA.x1, 6);
    // empurrando a mureta por dez segundos não vira uma metralhadora de batidas
    expect(batidas.length).toBeLessThan(12);
  });

  it('encostar devagar não é bater (sem "tum" de mentira)', () => {
    const a = novoCarrinho(10, 6, Math.PI / 2);
    const b = novoCarrinho(10 + 2 * R + 0.05, 6, 0);
    const batidas: Batida[] = [];
    andar([a, b], () => [{ x: 0.15, z: 0 }, { x: 0, z: 0 }], 3, batidas);
    expect(batidas).toEqual([]);
    expect(Math.hypot(b.x - a.x, b.z - a.z)).toBeGreaterThanOrEqual(2 * R - 1e-6);
  });
});

describe('o bate-bate: nunca preso, nunca fora, sempre igual', () => {
  it('no canto, cercada por três carrinhos parados, a criança sai sozinha empurrando o controle', () => {
    const eu = novoCarrinho(R, R, Math.PI);
    const carros = [
      eu,
      novoCarrinho(3 * R + 0.01, R, 0),
      novoCarrinho(R, 3 * R + 0.01, 0),
      novoCarrinho(3 * R, 3 * R, 0),
    ];
    const parado = { x: 0, z: 0 };
    // empurra para o meio da pista
    andar(carros, () => [{ x: 0.7, z: 0.7 }, parado, parado, parado], 8);
    expect(Math.hypot(eu.x - R, eu.z - R)).toBeGreaterThan(4);
    for (const c of carros) expect(dentro(c)).toBe(true);
  });

  it('empurrando o controle contra o canto, ela ganha um empurrãozinho para o meio (não fica colada)', () => {
    const eu = novoCarrinho(R + 0.5, R + 0.5, 0);
    let maisLonge = 0;
    for (let k = 0; k < 120; k++) {
      passoBate(PISTA, [eu], [{ x: -0.7, z: -0.7 }]);
      maisLonge = Math.max(maisLonge, Math.hypot(eu.x - R, eu.z - R));
    }
    expect(maisLonge).toBeGreaterThan(0.45);
    expect(dentro(eu)).toBe(true);
  });

  it('oito carrinhos com o controle maluco por dois minutos: todos dentro, nenhum em cima do outro, ninguém voa', () => {
    const sorte = sorteDe(42);
    const carros = Array.from({ length: N_CARRINHOS }, (_, i) =>
      novoCarrinho(2 + (i % 4) * 6, 3 + Math.floor(i / 4) * 6, i),
    );
    let guias: Guia[] = carros.map(() => ({ x: 0, z: 0 }));
    const batidas: Batida[] = [];
    for (let k = 0; k < 2400; k++) {
      if (k % 7 === 0)
        guias = carros.map(() => {
          const a = sorte() * Math.PI * 2;
          const f = sorte() < 0.15 ? 0 : sorte();
          return { x: Math.sin(a) * f, z: Math.cos(a) * f };
        });
      const antes = carros.map((c) => [c.x, c.z]);
      passoBate(PISTA, carros, guias, PASSO_BATE, batidas);
      carros.forEach((c, i) => {
        expect(dentro(c)).toBe(true);
        expect(Number.isFinite(c.yaw + c.v + c.kx + c.kz)).toBe(true);
        expect(Math.hypot(c.kx, c.kz)).toBeLessThanOrEqual(EMPURRAO_MAX + 1e-9);
        // nenhum pulo: o que anda num passo é a velocidade mais o empurrão (e o desencostar)
        const d = Math.hypot(c.x - antes[i][0], c.z - antes[i][1]);
        expect(d).toBeLessThan((VEL_GUIAR + EMPURRAO_MAX) * PASSO_BATE + 0.6);
        for (let j = i + 1; j < carros.length; j++) {
          const o = carros[j];
          expect(Math.hypot(o.x - c.x, o.z - c.z)).toBeGreaterThan(2 * R - 0.3);
        }
      });
    }
    // bateram bastante (é um bate-bate), e toda batida tem força de verdade
    expect(batidas.length).toBeGreaterThan(40);
    for (const b of batidas) expect(b.f).toBeGreaterThanOrEqual(0.7);
  });

  it('a mesma conta dá sempre o mesmo resultado (o núcleo e a previsão da tela concordam)', () => {
    const rodar = () => {
      const sorte = sorteDe(7);
      const carros = Array.from({ length: 6 }, (_, i) => novoCarrinho(3 + i * 3.5, 4 + (i % 2) * 5, i));
      for (let k = 0; k < 600; k++) {
        const guias = carros.map(() => ({ x: sorte() * 2 - 1, z: sorte() * 2 - 1 }));
        passoBate(PISTA, carros, guias);
      }
      return JSON.stringify(carros);
    };
    expect(rodar()).toBe(rodar());
  });

  it('um carrinho que não é número volta para o meio da pista (nenhuma conta estranha o tira dela)', () => {
    const c = novoCarrinho(NaN, 3, 0);
    passoBate(PISTA, [c], [{ x: 1, z: 0 }]);
    expect(dentro(c)).toBe(true);
    const d = novoCarrinho(500, -500, 0);
    d.kx = 1e6;
    passoBate(PISTA, [d], []);
    expect(dentro(d)).toBe(true);
  });
});

describe('o bate-bate: os moradores e o carrinho vazio', () => {
  /** A pista do jogo: quatro moradores e quatro carrinhos de criança na beira. */
  const mundo = () => {
    const carros = [
      novoCarrinho(5, 4, 1.2),
      novoCarrinho(14, 7, -2.2),
      novoCarrinho(20, 3, 2.6),
      novoCarrinho(19, 10, -0.6),
      novoCarrinho(2.3, 11.9, Math.PI),
      novoCarrinho(4.7, 11.9, Math.PI),
      novoCarrinho(11.3, 11.9, Math.PI),
      novoCarrinho(13.7, 11.9, Math.PI),
    ];
    const pilotos = Array.from({ length: N_MORADORES_BATE }, (_, i) => novoPiloto(7919 * (i + 1)));
    return { carros, pilotos };
  };
  const rodar = (
    segundos: number,
    crianca: (t: number, eu: Carrinho, carros: Carrinho[]) => Guia,
    comCrianca = true,
  ) => {
    const { carros, pilotos } = mundo();
    const EU = 6;
    if (comCrianca) {
      carros[EU].x = 12;
      carros[EU].z = 6.5;
    }
    const quem = (j: number): QuemGuia =>
      j < N_MORADORES_BATE ? 'morador' : comCrianca && j === EU ? 'crianca' : 'vazio';
    const batidas: (Batida & { t: number })[] = [];
    let andado = 0;
    for (let k = 0; k < segundos / PASSO_BATE; k++) {
      const t = k * PASSO_BATE;
      const guias: Guia[] = carros.map((c, i) =>
        i < N_MORADORES_BATE
          ? guiaDoMorador(PISTA, carros, i, pilotos[i], t, quem)
          : comCrianca && i === EU
            ? crianca(t, c, carros)
            : { x: 0, z: 0 },
      );
      const novas: Batida[] = [];
      const x0 = carros[0].x;
      const z0 = carros[0].z;
      passoBate(PISTA, carros, guias, PASSO_BATE, novas);
      andado += Math.hypot(carros[0].x - x0, carros[0].z - z0);
      for (const b of novas) {
        batidas.push({ ...b, t });
        if (b.b < 0) continue;
        if (b.a < N_MORADORES_BATE && quem(b.b) === 'crianca')
          acalmarPiloto(PISTA, pilotos[b.a], carros[b.a], b.b, carros[b.b], t);
        if (b.b < N_MORADORES_BATE && quem(b.a) === 'crianca')
          acalmarPiloto(PISTA, pilotos[b.b], carros[b.b], b.a, carros[b.a], t);
      }
      for (const c of carros) expect(dentro(c)).toBe(true);
    }
    return { carros, batidas, andado, EU };
  };

  it('os moradores passeiam pela pista toda, devagar, sem parar', () => {
    const r = rodar(120, () => ({ x: 0, z: 0 }), false);
    // o primeiro andou bastante em dois minutos (mais de um bloco por segundo, em média)
    expect(r.andado).toBeGreaterThan(130);
    expect(r.andado).toBeLessThan(VEL_GUIAR * 0.75 * 120);
  });

  it('a criança parada no meio da pista quase não leva batida (eles desviam dela)', () => {
    const r = rodar(180, () => ({ x: 0, z: 0 }));
    const nela = r.batidas.filter((b) => b.a === r.EU || b.b === r.EU);
    expect(nela.length).toBeLessThanOrEqual(2);
  });

  it('a criança que guia sempre tem com quem bater (e os moradores não ficam batendo sem parar nela)', () => {
    // ela vai atrás do morador mais perto, como quem brinca
    const r = rodar(120, (_t, eu, carros) => {
      let alvo = carros[0];
      for (let i = 1; i < N_MORADORES_BATE; i++)
        if (Math.hypot(carros[i].x - eu.x, carros[i].z - eu.z) < Math.hypot(alvo.x - eu.x, alvo.z - eu.z))
          alvo = carros[i];
      const dx = alvo.x - eu.x;
      const dz = alvo.z - eu.z;
      const d = Math.hypot(dx, dz) || 1;
      return { x: dx / d, z: dz / d };
    });
    const nela = r.batidas.filter((b) => b.b >= 0 && (b.a === r.EU || b.b === r.EU));
    // (pelo menos uma batida a cada quinze segundos, e nunca uma por segundo)
    expect(nela.length).toBeGreaterThanOrEqual(8);
    expect(nela.length).toBeLessThan(110);
  });

  it('o carrinho vazio volta para a vaga, para e fica de frente para a pista', () => {
    const c = novoCarrinho(18, 4, 0.3);
    const vaga: [number, number] = [11.3, 11.9];
    for (let k = 0; k < 400; k++) {
      const g = guiaParaAVaga(c, vaga);
      if (!g) estacionar(c, vaga, Math.PI, PASSO_BATE);
      passoBate(PISTA, [c], [g ?? { x: 0, z: 0 }]);
    }
    expect(Math.hypot(c.x - vaga[0], c.z - vaga[1])).toBeLessThan(0.1);
    expect(c.v).toBe(0);
    expect(Math.abs(Math.atan2(Math.sin(c.yaw - Math.PI), Math.cos(c.yaw - Math.PI)))).toBeLessThan(0.05);
  });

  it('quem é piloto: os moradores 66 a 69, um por carrinho', () => {
    expect([65, 66, 67, 68, 69, 70].map(pilotoDoBate)).toEqual([-1, 0, 1, 2, 3, -1]);
  });
});

describe('o bate-bate: o que vai pela rede', () => {
  it('os carrinhos vão e voltam do quadro com três casas', () => {
    const carros = [novoCarrinho(1.23456, 2.5, 0.7), novoCarrinho(9, 8, -3)];
    carros[0].v = 2.22222;
    carros[1].kx = -1.5;
    const v = vistaDoBate(carros, 17);
    expect(v.length).toBe(1 + 2 * 6);
    const r = carrosDaVista(v)!;
    expect(r.ack).toBe(17);
    expect(r.carros[0]).toMatchObject({ x: 1.235, z: 2.5, yaw: 0.7, v: 2.222, kx: 0, kz: 0 });
    expect(r.carros[1].kx).toBe(-1.5);
  });

  it('quadro torto não vale', () => {
    expect(carrosDaVista(null)).toBeNull();
    expect(carrosDaVista([1, 2, 3])).toBeNull();
    expect(carrosDaVista([0, 1, 2, 3, 4, 5, NaN])).toBeNull();
    expect(carrosDaVista([0, 1, 2, 3, 4, 5, 'x' as unknown as number])).toBeNull();
  });
});
