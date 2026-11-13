import { describe, expect, it } from 'vitest';
import {
  MAX_CARINHAS,
  PERTO_AMIGO,
  bateCirculo,
  diametroCarinha,
  disporCarinhas,
  type AmigoNaTela,
  type Caixa,
  type EntradaBorda,
  type ItemBorda,
} from '../../src/jogo/acharAmigo';

/** As caixas do HUD medidas no jogo (aproximadas) em cada tela. */
const HUD: Record<string, { W: number; H: number; celular: boolean; caixas: Caixa[] }> = {
  computador: {
    W: 1280,
    H: 720,
    celular: false,
    caixas: [
      { x: 1114, y: 44, w: 156, h: 156, nome: 'minimapa' },
      { x: 430, y: 10, w: 420, h: 28, nome: 'bussola' },
      { x: 418, y: 640, w: 444, h: 70, nome: 'barra' },
      { x: 1218, y: 222, w: 48, h: 48, nome: 'mochila' },
      { x: 1218, y: 280, w: 48, h: 48, nome: 'bandeja' },
      { x: 1218, y: 338, w: 48, h: 48, nome: 'chamar' },
      { x: 8, y: 8, w: 96, h: 44, nome: 'botoes' },
      { x: 8, y: 60, w: 200, h: 40, nome: 'status' },
    ],
  },
  celularEmPe: {
    W: 390,
    H: 844,
    celular: true,
    caixas: [
      { x: 276, y: 40, w: 104, h: 104, nome: 'minimapa' },
      { x: 330, y: 164, w: 48, h: 48, nome: 'mochila' },
      { x: 330, y: 222, w: 48, h: 48, nome: 'bandeja' },
      { x: 330, y: 280, w: 48, h: 48, nome: 'chamar' },
      { x: 20, y: 640, w: 150, h: 150, nome: 'joystick' },
      { x: 250, y: 620, w: 130, h: 170, nome: 'botoes' },
      { x: 60, y: 790, w: 270, h: 50, nome: 'barra' },
      { x: 8, y: 8, w: 110, h: 44, nome: 'topo' },
    ],
  },
  celularDeitado: {
    W: 844,
    H: 390,
    celular: true,
    caixas: [
      { x: 750, y: 58, w: 84, h: 84, nome: 'minimapa' },
      { x: 784, y: 162, w: 48, h: 48, nome: 'mochila' },
      { x: 20, y: 230, w: 140, h: 140, nome: 'joystick' },
      { x: 690, y: 220, w: 140, h: 160, nome: 'botoes' },
      { x: 250, y: 340, w: 344, h: 48, nome: 'barra' },
      { x: 8, y: 8, w: 110, h: 44, nome: 'topo' },
    ],
  },
};

function entrada(
  tela: keyof typeof HUD,
  amigos: AmigoNaTela[],
  extra: Partial<EntradaBorda> = {},
): EntradaBorda {
  const h = HUD[tela];
  return {
    W: h.W,
    H: h.H,
    celular: h.celular,
    amigos,
    proibidos: h.caixas,
    escolhido: null,
    chamando: null,
    total: amigos.length,
    ...extra,
  };
}

/** Amigo na frente da câmera, caindo em (sx, sy) da tela. */
const naFrente = (id: string, d: number, sx: number, sy: number, tapado = false): AmigoNaTela => ({
  id,
  d,
  sx,
  sy,
  frente: true,
  vx: 0,
  vy: 0,
  vz: 10,
  tapado,
});
/** Amigo atrás da câmera (vx > 0: atrás, à direita). */
const atras = (id: string, d: number, vx: number): AmigoNaTela => ({
  id,
  d,
  sx: 0,
  sy: 0,
  frente: false,
  vx,
  vy: 0,
  vz: -d,
  tapado: false,
});

function semHud(itens: ItemBorda[], tela: keyof typeof HUD) {
  for (const it of itens) {
    const r = it.tipo === 'montinho' ? it.diam / 2 : it.diam / 2;
    if (it.tipo === 'montinho') {
      const x0 = it.x - it.larg! / 2;
      const y0 = it.y - it.diam / 2;
      for (const c of HUD[tela].caixas)
        expect(
          x0 < c.x + c.w && x0 + it.larg! > c.x && y0 < c.y + c.h && y0 + it.diam > c.y,
          `${it.ids} em cima de ${c.nome}`,
        ).toBe(false);
    } else expect(bateCirculo(HUD[tela].caixas, it.x, it.y, r), `${it.ids} no HUD`).toBe(false);
    expect(it.x).toBeGreaterThanOrEqual(0);
    expect(it.y).toBeGreaterThanOrEqual(0);
    expect(it.x).toBeLessThanOrEqual(HUD[tela].W);
    expect(it.y).toBeLessThanOrEqual(HUD[tela].H);
  }
}

describe('a borda da tela (spec 021, T02)', () => {
  it('prende na borda do lado do amigo, com a seta para ele', () => {
    // à direita, fora da tela
    const [d] = disporCarinhas(entrada('computador', [naFrente('lia', 60, 1700, 400)]));
    expect(d.tipo).toBe('carinha');
    expect(d.borda).toBe(true);
    expect(d.x).toBeCloseTo(1280 - d.diam / 2 - 18, 0);
    expect(Math.abs(d.ang)).toBeLessThan(0.5);
    // à esquerda
    const [e] = disporCarinhas(entrada('computador', [naFrente('lia', 60, -500, 380)]));
    expect(e.x).toBeCloseTo(e.diam / 2 + 18, 0);
    expect(Math.abs(Math.abs(e.ang) - Math.PI)).toBeLessThan(0.5);
  });

  it('atrás da câmera, a carinha vai para baixo, para o lado dele', () => {
    const [d] = disporCarinhas(entrada('computador', [atras('theo', 50, 20)]));
    expect(d.y).toBeGreaterThan(720 / 2);
    expect(d.x).toBeGreaterThan(1280 / 2);
    const [e] = disporCarinhas(entrada('computador', [atras('theo', 50, -20)]));
    expect(e.x).toBeLessThan(1280 / 2);
  });

  it.each(Object.keys(HUD) as (keyof typeof HUD)[])(
    '%s: nunca tapa o HUD, venha o amigo de onde vier',
    (tela) => {
      const { W, H } = HUD[tela];
      for (let a = 0; a < 360; a += 7.5) {
        const r = (a * Math.PI) / 180;
        const fora = naFrente('x', 50, W / 2 + Math.cos(r) * W * 2, H / 2 + Math.sin(r) * H * 2);
        semHud(disporCarinhas(entrada(tela, [fora])), tela);
        semHud(disporCarinhas(entrada(tela, [atras('y', 40, Math.cos(r) * 30)])), tela);
      }
      // escondido pelo morro bem embaixo do minimapa ou em cima do joystick
      for (const c of HUD[tela].caixas) {
        const t = naFrente('z', 30, c.x + c.w / 2, c.y + c.h / 2, true);
        if (t.sx > 30 && t.sx < W - 30 && t.sy > 30 && t.sy < H - 30)
          semHud(disporCarinhas(entrada(tela, [t])), tela);
      }
    },
  );

  it('cresce conforme o amigo chega perto (78 → 48 no computador, 62 → 40 no celular)', () => {
    expect(diametroCarinha(PERTO_AMIGO, false)).toBe(78);
    expect(diametroCarinha(500, false)).toBe(48);
    expect(diametroCarinha(PERTO_AMIGO, true)).toBe(62);
    expect(diametroCarinha(500, true)).toBe(40);
    let antes = Infinity;
    for (let d = 12; d <= 160; d += 4) {
      const v = diametroCarinha(d, false);
      expect(v).toBeLessThanOrEqual(antes);
      antes = v;
    }
  });

  it('somem: perto (< 12) e à vista; tapado à vista fica em cima dele, sem seta', () => {
    expect(disporCarinhas(entrada('computador', [atras('a', PERTO_AMIGO - 1, 5)]))).toEqual([]);
    expect(disporCarinhas(entrada('computador', [naFrente('a', 40, 600, 400)]))).toEqual([]);
    const [t] = disporCarinhas(entrada('computador', [naFrente('a', 40, 600, 400, true)]));
    expect(t.borda).toBe(false);
    expect(t.x).toBe(600);
    expect(t.y).toBeLessThan(400);
  });

  it('poucos amigos (até 3): só carinhas, sem montinho, uma longe da outra', () => {
    const tres = [
      naFrente('a', 30, 1800, 380),
      naFrente('b', 31, 1800, 390),
      naFrente('c', 32, 1800, 400),
    ];
    const itens = disporCarinhas(entrada('computador', tres));
    expect(itens.map((i) => i.tipo)).toEqual(['carinha', 'carinha', 'carinha']);
    for (let i = 0; i < itens.length; i++)
      for (let j = 0; j < i; j++)
        expect(Math.hypot(itens[i].x - itens[j].x, itens[i].y - itens[j].y)).toBeGreaterThan(
          (itens[i].diam + itens[j].diam) / 2,
        );
  });

  it('7 amigos: no máximo 3 coisas na borda, os encostados num montinho com todos', () => {
    const sete = [
      naFrente('a', 20, 1800, 360),
      naFrente('b', 22, 1800, 370),
      naFrente('c', 24, 1800, 380),
      naFrente('d', 26, 1800, 390),
      naFrente('e', 40, -600, 360),
      atras('f', 50, 1),
      naFrente('g', 70, 640, -900),
    ];
    const itens = disporCarinhas(entrada('computador', sete));
    expect(itens.length).toBeLessThanOrEqual(MAX_CARINHAS);
    const m = itens.find((i) => i.tipo === 'montinho')!;
    expect(m.ids).toEqual(['a', 'b', 'c', 'd']);
    expect(m.larg).toBeGreaterThan(m.diam);
    // os mais perto primeiro: o montinho (a mais perto) e a carinha do "e"
    expect(itens[0]).toBe(m);
    expect(itens[1].ids).toEqual(['e']);
    semHud(itens, 'computador');
  });

  it('escolhido: ele grande com o aro, os outros viram pontinhos na beirada', () => {
    const sete = ['a', 'b', 'c', 'd', 'e', 'f', 'g'].map((id, i) =>
      naFrente(id, 20 + i * 10, 1280 / 2 + Math.cos(i) * 2000, 720 / 2 + Math.sin(i) * 2000),
    );
    const itens = disporCarinhas(entrada('computador', sete, { escolhido: 'd' }));
    const grandes = itens.filter((i) => i.tipo === 'carinha');
    expect(grandes.map((i) => i.ids[0])).toEqual(['d']);
    expect(grandes[0].escolhido).toBe(true);
    const pontos = itens.filter((i) => i.tipo === 'pontinho');
    expect(pontos).toHaveLength(6);
    for (const p of pontos) {
      // na beirada, e a área de toque tem 40 px
      const beira = Math.min(p.x, 1280 - p.x, p.y, 720 - p.y);
      expect(beira).toBeLessThanOrEqual(15);
      expect(p.diam).toBe(40);
    }
    // desenhado por último (fica por cima)
    expect(itens[itens.length - 1].ids).toEqual(['d']);
  });

  it('quem chamou vem na frente, sozinho, mesmo perto, à vista ou com outro escolhido', () => {
    const sete = ['a', 'b', 'c', 'd', 'e', 'f'].map((id, i) =>
      naFrente(id, 20 + i, 1800, 360 + i * 4),
    );
    const perto = naFrente('g', 6, 640, 360);
    const lista = [...sete, perto];
    const itens = disporCarinhas(entrada('computador', lista, { chamando: 'g' }));
    expect(itens[0].ids).toEqual(['g']);
    expect(itens[0].chamando).toBe(true);
    expect(itens[0].tipo).toBe('carinha');
    const comEscolhido = disporCarinhas(
      entrada('computador', lista, { chamando: 'g', escolhido: 'a' }),
    );
    const grandes = comEscolhido.filter((i) => i.tipo === 'carinha').map((i) => i.ids[0]);
    expect(grandes.sort()).toEqual(['a', 'g']);
    // com poucos amigos também
    const dois = disporCarinhas(entrada('computador', [perto, sete[0]], { chamando: 'g' }));
    expect(dois[0].ids).toEqual(['g']);
  });
});

describe('pontinhos tocáveis', () => {
  it('os pontinhos do mesmo lado não se encostam (área de toque inteira)', async () => {
    const { disporCarinhas, TOQUE_PONTINHO } = await import('../../src/jogo/acharAmigo');
    const amigos = ['a', 'b', 'c', 'd', 'e'].map((id, i) => ({
      id,
      d: 40 + i * 5,
      sx: -200,
      sy: 360 + i * 4,
      frente: true,
      vx: -1,
      vy: 0,
      vz: 1,
      tapado: false,
    }));
    const itens = disporCarinhas({
      W: 1280,
      H: 720,
      celular: false,
      amigos,
      proibidos: [],
      escolhido: 'a',
      chamando: null,
      total: 5,
    });
    const pts = itens.filter((i) => i.tipo === 'pontinho');
    expect(pts.length).toBe(4);
    for (let i = 0; i < pts.length; i++)
      for (let j = i + 1; j < pts.length; j++)
        expect(Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y)).toBeGreaterThanOrEqual(TOQUE_PONTINHO - 0.5);
  });
});
