import { describe, expect, it } from 'vitest';
import {
  ACOES,
  BRACO,
  FATOR_MAO,
  FOV_BRACO,
  MAO_MAX_LARGURA,
  MEIA_MANGA,
  RAIO_MAO,
  SEGURAR,
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
  it.each(TELAS)('%s: o mesmo ombro da busca bruta do esboço aprovado', (_n, tela) => {
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
        // a mão inteira na tela em todas as ações; segurando, o bloco acima dos botões
        const m = maos(r.ombro, tela);
        for (const q of m) {
          expect(q.x - q.r).toBeGreaterThanOrEqual(0);
          expect(q.x + q.r).toBeLessThanOrEqual(tela.w);
          expect(q.y - q.r).toBeGreaterThanOrEqual(0);
          expect(q.y + q.r).toBeLessThanOrEqual(tela.h);
        }
        expect(m[0].y + 2.2 * m[0].r).toBeLessThanOrEqual(tela.botoes - 8);
      }
    // os celulares (em pé e deitados), os tablets e os computadores têm solução
    expect(comSolucao).toBeGreaterThan(70);
    expect(semSolucao).toBeLessThan(10);
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
