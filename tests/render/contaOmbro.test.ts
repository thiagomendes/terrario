import { describe, expect, it } from 'vitest';
import {
  ACOES,
  BOCA_NA_TELA,
  BRACO,
  MAO_NA_BOCA_MAX,
  bracoDeDentro,
  comerDeAntes,
  maoNaTela,
  poseDaBoca,
  FATOR_MAO,
  FOLGA_INTERFACE_PX,
  FOV_BRACO,
  ITEM_ACIMA,
  ITEM_CAIXA_BAIXA,
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
import { DURACAO_REFEICAO, MORDIDAS } from '../../src/jogo/refeicao';

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
        const baixa = tela.h <= TELA_BAIXA && tela.w > tela.h && !!r.baixa;
        const m = maos(r.ombro, tela);
        m.forEach((q, i) => {
          if (baixa && (i === 5 || i === 6)) return;
          expect(q.x - q.r).toBeGreaterThanOrEqual(0);
          expect(q.x + q.r).toBeLessThanOrEqual(tela.w);
          expect(q.y - q.r).toBeGreaterThanOrEqual(0);
          expect(q.y + q.r).toBeLessThanOrEqual(tela.h);
          if (baixa && (i === 0 || i === 7)) {
            expect(q.x + ITEM_CAIXA_BAIXA.direita * q.r).toBeLessThanOrEqual(tela.w);
            expect(q.y - ITEM_CAIXA_BAIXA.cima * q.r).toBeGreaterThanOrEqual(0);
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
      // (o aceno passa rápido; o comer, 0,7 s, e o golpe, um quarto de segundo, podem passar
      // atrás da interface)
      if (i === 5 || i === 6) return;
      if (i === 0 || i === 7) {
        // segurando e comendo, a caixa do item (9 em cada 10 itens da folha) inteira na tela
        expect(q.x + ITEM_CAIXA_BAIXA.direita * q.r).toBeLessThanOrEqual(t.w - 4);
        expect(q.y - ITEM_CAIXA_BAIXA.cima * q.r).toBeGreaterThanOrEqual(4);
        // o balde de pipoca medido no jogo, comendo (2,71 raios para a direita, 3,55 para cima)
        expect(q.x + 2.71 * q.r).toBeLessThanOrEqual(t.w - 4);
        expect(q.y - 3.55 * q.r).toBeGreaterThanOrEqual(4);
      }
      if (i >= 7) return;
      expect(encosta(q.x, q.y, q.r)).toBe(false);
      expect(encosta(q.x, q.y - ITEM_ACIMA * q.r, ITEM_RAIO * q.r)).toBe(false);
    });
    // a mão na metade de baixo, do lado direito, como em pé
    expect(m[0].y).toBeGreaterThan(t.h * 0.55);
    expect(m[0].x).toBeGreaterThan(t.w * 0.75);
  });

  it('comendo de dentro, a comida vai até a boca (embaixo, no meio), com a mão inteira na tela e fora da interface', () => {
    for (const k of ['empe', 'deitado', 'pc']) {
      const t = INTERFACE[k];
      const r = acharOmbro(t)!;
      const tela: Tela = r.baixa ? { ...t, baixa: true } : t;
      const boca = poseDaBoca(r.ombro, tela, r.segurar)!;
      expect(boca, k).not.toBeNull();
      const segura = maoNaTela(r.ombro, r.segurar[0], r.segurar[1], tela)!;
      const antes = maoNaTela(r.ombro, ...comerDeAntes(r.segurar), tela)!;
      const q = maoNaTela(boca.ombro, boca.pose[0], boca.pose[1], tela)!;
      const alvo = [BOCA_NA_TELA.x * t.w, BOCA_NA_TELA.y * t.h];
      const longe = (m: { x: number; y: number; r: number }) => Math.hypot(m.x - alvo[0], m.y - ITEM_ACIMA * m.r - alvo[1]);
      console.log(k, JSON.stringify({ segura, antes, boca: q, ombro: boca.ombro, longeAntes: longe(antes), longe: longe(q) }));
      // a comida sai do canto e vem para o meio da tela (no máximo um décimo da tela para a
      // direita, quando a interface ocupa o meio de baixo), da altura dos olhos para baixo, e
      // chega perto do rosto (a mão bem maior); o comer de antes só balançava no canto
      expect(q.x - t.w / 2, k).toBeGreaterThanOrEqual(-1);
      expect(q.x - t.w / 2, k).toBeLessThanOrEqual(t.w * (t.w > t.h ? 0.25 : 0.1) + 1);
      expect(q.y - ITEM_ACIMA * q.r, k).toBeGreaterThanOrEqual(t.h * 0.4 - 1);
      expect(segura.x - q.x, k).toBeGreaterThan(t.w * 0.14);
      expect(q.r / segura.r, k).toBeGreaterThan(1.3);
      expect(Math.abs(antes.x - segura.x), k).toBeLessThan(t.w * 0.1);
      // o ombro, com a manga, continua fora da tela (e o caminho reto até ele também: fora da
      // beira direita é um semiespaço)
      expect(foraDaTela(boca.ombro, MEIA_MANGA, tela)).toBeGreaterThanOrEqual(4);
      for (let f = 0; f <= 1; f += 0.1) {
        const o: Vec3 = [0, 1, 2].map((i) => r.ombro[i] + (boca.ombro[i] - r.ombro[i]) * f) as Vec3;
        expect(foraDaTela(o, MEIA_MANGA, tela), `${k} ${f}`).toBeGreaterThanOrEqual(4);
      }
      // a mão inteira na tela, não muito maior que segurando
      expect(q.x - q.r).toBeGreaterThanOrEqual(0);
      expect(q.x + q.r).toBeLessThanOrEqual(t.w);
      expect(q.y + q.r).toBeLessThanOrEqual(t.h);
      expect(q.r).toBeLessThanOrEqual(MAO_NA_BOCA_MAX * segura.r + 1e-9);
      // a mão e a comida fora da interface (na tela baixa, a comida inteira na tela)
      if (r.baixa) {
        expect(q.x + ITEM_CAIXA_BAIXA.direita * q.r).toBeLessThanOrEqual(t.w - 4);
        expect(q.y - ITEM_CAIXA_BAIXA.cima * q.r).toBeGreaterThanOrEqual(4);
      } else
        for (const o of t.obstaculos!) {
          const fora = (x: number, y: number, rr: number) => {
            const cx = Math.max(o[0], Math.min(x, o[2]));
            const cy = Math.max(o[1], Math.min(y, o[3]));
            return Math.hypot(x - cx, y - cy) >= rr + FOLGA_INTERFACE_PX;
          };
          expect(fora(q.x, q.y, q.r), `${k} mão`).toBe(true);
          expect(fora(q.x, q.y - ITEM_ACIMA * q.r, ITEM_RAIO * q.r), `${k} comida`).toBe(true);
        }
    }
  });

  it('comendo de dentro, a mão vai à boca em cada mordida, volta um tico entre elas e desce no fim', () => {
    // na hora de cada mordida (o "nhac" e o som), a comida está na boca
    for (const m of MORDIDAS) expect(bracoDeDentro(m)).toBeGreaterThan(0.97);
    // entre uma e outra, ela sai da boca e volta (o movimento de comer, três vezes)
    for (let k = 0; k < 2; k++) {
      const meio = (MORDIDAS[k] + MORDIDAS[k + 1]) / 2;
      expect(bracoDeDentro(meio)).toBeLessThan(0.6);
      expect(bracoDeDentro(meio)).toBeGreaterThan(0.3);
    }
    // antes de comer e no fim, segurando
    expect(bracoDeDentro(0)).toBe(0);
    expect(bracoDeDentro(DURACAO_REFEICAO + 0.1)).toBe(0);
    // sem tranco: de quadro em quadro (1/60 s), a mão anda pouco
    let antes = 0;
    for (let t = 0; t <= DURACAO_REFEICAO + 0.2; t += 1 / 60) {
      const v = bracoDeDentro(t);
      expect(Math.abs(v - antes), `t ${t.toFixed(2)}`).toBeLessThan(0.15);
      antes = v;
    }
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
