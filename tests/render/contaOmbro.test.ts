import { describe, expect, it } from 'vitest';
import {
  ACOES,
  BRACO,
  FATOR_MAO,
  FOLGA_INTERFACE_PX,
  FOV_BRACO,
  ITEM_ACIMA,
  ITEM_RAIO,
  MAO_MAX_LARGURA,
  MEIA_MANGA,
  RAIO_MAO,
  SEGURAR,
  TELA_BAIXA,
  acharOmbro,
  criarCacheOmbro,
  direcaoDoBraco,
  foraDaTela,
  ombroServe,
  type Tela,
  type Vec3,
} from '../../src/render/contaOmbro';

/** A busca bruta do esboço aprovado (cada distância de 0,006), para comparar. */
function acharOmbroBruto(tela: Tela) {
  const { w, h } = tela;
  const tanV = Math.tan(FOV_BRACO / 2);
  const tanH = tanV * (w / h);
  const d0 = direcaoDoBraco(SEGURAR[0], SEGURAR[1]);
  const servem: { o: Vec3; px: number }[] = [];
  for (let tx = 0.2; tx <= 0.751; tx += 0.025)
    for (let ty = -0.45; ty <= -0.149; ty += 0.025)
      for (let k = 0; 3 - k * 0.006 >= 0.2 - 1e-9; k++) {
        const z = 3 - k * 0.006;
        const o: Vec3 = [tx * z * tanH - d0[0] * BRACO, ty * z * tanV - d0[1] * BRACO, z - d0[2] * BRACO];
        if (ombroServe(o, tela)) servem.push({ o, px: (RAIO_MAO / (z * tanV)) * h });
      }
  if (!servem.length) return null;
  const menor = Math.min(...servem.map((s) => s.px));
  const alvo = Math.min(menor * FATOR_MAO, w * MAO_MAX_LARGURA);
  let melhor = servem[0];
  for (const s of servem) if (s.px <= alvo && (melhor.px > alvo || s.px > melhor.px)) melhor = s;
  return { ombro: melhor.o, maoPx: Math.round(melhor.px) };
}

/** A mão em cada ação, na tela (px), e o raio. */
function maos(ombro: Vec3, tela: Tela) {
  const tanV = Math.tan(FOV_BRACO / 2);
  const tanH = tanV * (tela.w / tela.h);
  return ACOES.map(([x, z]) => {
    const d = direcaoDoBraco(x, z);
    const m = [ombro[0] + d[0] * BRACO, ombro[1] + d[1] * BRACO, ombro[2] + d[2] * BRACO];
    return {
      x: (tela.w / 2) * (1 + m[0] / (m[2] * tanH)),
      y: (tela.h / 2) * (1 - m[1] / (m[2] * tanV)),
      r: (RAIO_MAO / (m[2] * tanV)) * (tela.h / 2),
    };
  });
}

const TELAS: [string, Tela][] = [
  ['celular em pé', { w: 390, h: 844, botoes: 652 }],
  ['celular deitado', { w: 844, h: 390, botoes: 312 }],
  ['computador', { w: 1280, h: 720, botoes: 640 }],
];

describe('a conta do ombro da primeira pessoa (spec 037)', () => {
  // (o celular deitado e baixo tem a regra dele desde a decisão do dono no estudo da 037: a mão do
  // tamanho do em pé; ele é conferido no teste do deitado, mais abaixo)
  it.each(TELAS.filter(([, t]) => t.h > TELA_BAIXA))('%s: o mesmo ombro da busca bruta do esboço aprovado', (_n, tela) => {
    const rapido = acharOmbro(tela);
    const bruto = acharOmbroBruto(tela);
    expect(rapido).not.toBeNull();
    expect(bruto).not.toBeNull();
    // a mesma mão; o ombro pode cair noutro ponto que dá a mesma mão (a busca rápida pula os
    // trechos de distância mais curtos que 0,03), sempre servindo e bem perto
    expect(rapido!.maoPx).toBe(bruto!.maoPx);
    expect(ombroServe(rapido!.ombro, tela)).toBe(true);
    for (let i = 0; i < 3; i++) expect(Math.abs(rapido!.ombro[i] - bruto!.ombro[i])).toBeLessThan(0.05);
  });

  it('o celular em pé dá a mão do esboço aprovado (76 px, o ombro fora pela direita)', () => {
    const r = acharOmbro({ w: 390, h: 844, botoes: 652 })!;
    expect(r.maoPx).toBe(76);
    expect(r.ombro[0]).toBeCloseTo(0.548, 2);
    expect(r.ombro[2]).toBeCloseTo(1.322, 2);
  });

  it('numa faixa de proporções de tela, o ombro nunca aparece e a mão fica inteira na tela, acima dos botões', () => {
    let comSolucao = 0;
    let semSolucao = 0;
    for (let aspecto = 0.4; aspecto <= 2.45; aspecto += 0.05)
      for (const lado of [360, 720]) {
        const tela: Tela = aspecto < 1
          ? { w: Math.round(lado), h: Math.round(lado / aspecto), botoes: Math.round((lado / aspecto) * 0.77) }
          : { w: Math.round(lado * aspecto), h: lado, botoes: Math.round(lado * 0.8) };
        const r = acharOmbro(tela);
        if (!r) {
          semSolucao++;
          continue;
        }
        comSolucao++;
        // o ombro, com a grossura da manga, fora da tela
        expect(foraDaTela(r.ombro, MEIA_MANGA, tela)).toBeGreaterThanOrEqual(4);
        // a mão inteira na tela em todas as ações; segurando, o bloco acima dos botões. Na tela
        // deitada e baixa (decisão do dono, 037), o aceno pode sair pela beira de cima, e o item
        // fica inteiro dentro da tela (os botões de baixo são guardados pelos retângulos de verdade)
        const baixa = tela.h <= TELA_BAIXA && tela.w > tela.h;
        const m = maos(r.ombro, tela);
        m.forEach((q, i) => {
          if (baixa && (i === 5 || i === 6)) return;
          expect(q.x - q.r).toBeGreaterThanOrEqual(0);
          expect(q.x + q.r).toBeLessThanOrEqual(tela.w);
          expect(q.y - q.r).toBeGreaterThanOrEqual(0);
          expect(q.y + q.r).toBeLessThanOrEqual(tela.h);
          if (baixa) {
            expect(q.x + 1.9 * q.r).toBeLessThanOrEqual(tela.w);
            expect(q.y - (ITEM_ACIMA + ITEM_RAIO) * q.r).toBeGreaterThanOrEqual(0);
          }
        });
        if (!baixa) expect(m[0].y + 2.2 * m[0].r).toBeLessThanOrEqual(tela.botoes - 8);
      }
    // os celulares (em pé e deitados), os tablets e os computadores têm solução
    expect(comSolucao).toBeGreaterThan(70);
    expect(semSolucao).toBeLessThan(10);
  });

  // os retângulos de verdade da interface (medidos nas fotos da T08: os botões, a barra, o
  // mapinha, a mochila e o controle de andar)
  const INTERFACE: Record<string, Tela> = {
    empe: {
      w: 390,
      h: 844,
      botoes: 652,
      obstaculos: [[266, 40, 380, 157], [328, 164, 376, 212], [230, 652, 298, 720], [308, 652, 376, 720], [18, 588, 146, 712], [8, 781, 382, 832], [8, 8, 52, 52], [60, 8, 104, 52], [112, 8, 230, 52]],
    },
    // (deitado, desde a decisão do dono no estudo da 037: o mapinha, a mochila e os amigos na
    // esquerda; a direita fica só com correr e pular)
    deitado: {
      w: 844,
      h: 390,
      botoes: 312,
      obstaculos: [[10, 58, 94, 142], [116, 104, 164, 152], [118, 160, 162, 204], [157, 312, 687, 378], [714, 324, 770, 380], [778, 324, 834, 380], [14, 268, 126, 380], [8, 8, 52, 52], [60, 8, 104, 52], [112, 8, 156, 52], [270, 10, 570, 38]],
    },
    pc: {
      w: 1280,
      h: 720,
      botoes: 640,
      obstaculos: [[1105, 45, 1268, 210], [1218, 222, 1266, 268], [375, 640, 905, 707], [8, 8, 52, 52], [60, 8, 104, 52], [112, 8, 156, 52]],
    },
  };

  it('em pé e no computador, a interface não muda o ombro aprovado pelo dono', () => {
    for (const k of ['empe', 'pc']) {
      const t = INTERFACE[k];
      const sem = acharOmbro({ w: t.w, h: t.h, botoes: t.botoes })!;
      const com = acharOmbro(t)!;
      expect(com.maoPx).toBe(sem.maoPx);
      for (let i = 0; i < 3; i++) expect(com.ombro[i]).toBeCloseTo(sem.ombro[i], 6);
    }
  });

  it('deitado, a mão do tamanho do em pé (76 px), com a mão e o item fora da interface e o item inteiro na tela', () => {
    const t = INTERFACE.deitado;
    const encosta = (x: number, y: number, r: number) =>
      t.obstaculos!.some((q) => {
        const cx = Math.max(q[0], Math.min(x, q[2]));
        const cy = Math.max(q[1], Math.min(y, q[3]));
        return Math.hypot(x - cx, y - cy) < r + FOLGA_INTERFACE_PX;
      });
    const r = acharOmbro(t)!;
    expect(r).not.toBeNull();
    // o mesmo tamanho da mão em pé, no mesmo celular
    expect(r.maoPx).toBe(acharOmbro(INTERFACE.empe)!.maoPx);
    expect(foraDaTela(r.ombro, MEIA_MANGA, t)).toBeGreaterThanOrEqual(4);
    const m = maos(r.ombro, t);
    m.forEach((q, i) => {
      // (o aceno passa rápido; o comer, 0,7 s, pode passar atrás da interface)
      if (i === 5 || i === 6) return;
      expect(q.x + 1.9 * q.r).toBeLessThanOrEqual(t.w);
      if (i === 7) return;
      expect(encosta(q.x, q.y, q.r)).toBe(false);
      expect(encosta(q.x, q.y - ITEM_ACIMA * q.r, ITEM_RAIO * q.r)).toBe(false);
    });
    // a mão no canto de baixo à direita, como em pé
    expect(m[0].y).toBeGreaterThan(t.h * 0.55);
    expect(m[0].x).toBeGreaterThan(t.w * 0.8);
  });

  it('sem solução (uma tela onde a mão não cabe acima dos botões), devolve null: a mão some', () => {
    expect(acharOmbro({ w: 390, h: 844, botoes: 200 })).toBeNull();
  });

  it('é rápida: bem menos que a busca bruta (que levava de 10 a 28 ms no computador)', () => {
    // (aquece as duas antes de medir)
    for (const [, tela] of TELAS) {
      acharOmbro(tela);
      acharOmbroBruto(tela);
    }
    const t0 = performance.now();
    for (const [, tela] of TELAS) acharOmbro(tela);
    const rapido = (performance.now() - t0) / TELAS.length;
    const t1 = performance.now();
    for (const [, tela] of TELAS) acharOmbroBruto(tela);
    const bruto = (performance.now() - t1) / TELAS.length;
    expect(rapido).toBeLessThan(bruto / 2);
  });

  it('guarda por tela e faz a conta fora do quadro', () => {
    const fila: (() => void)[] = [];
    const cache = criarCacheOmbro((f) => fila.push(f));
    const tela = { w: 390, h: 844, botoes: 652 };
    // no quadro: ainda não há conta (a mão fica escondida) e a conta foi agendada uma vez só
    expect(cache.obter(tela)).toBeUndefined();
    expect(cache.obter(tela)).toBeUndefined();
    expect(fila.length).toBe(1);
    fila.shift()!();
    expect(cache.obter(tela)?.maoPx).toBe(76);
    // a tela girou: outra conta, a primeira continua guardada
    expect(cache.obter({ w: 844, h: 390, botoes: 312 })).toBeUndefined();
    fila.shift()!();
    expect(cache.tamanho()).toBe(2);
  });
});
