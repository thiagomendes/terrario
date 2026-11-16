import { describe, expect, it } from 'vitest';
import {
  criarPasseio,
  DURA_DESCER,
  DURA_SENTAR,
  lugarDoAmigo,
  SEGURAR_PARA_SAIR,
  ZOOM_NA_RODA,
} from '../../src/render/vila/passeio';
import { lugarDaCadeira, type ParqueVila, type ParqueVista } from '../../src/jogo/parque';
import { calcularPose } from '../../src/personagem/poses';

/**
 * Spec 026 (parte 2): o passeio da criança nos brinquedos do parque, no aparelho. O núcleo diz
 * quem está sentado (a vista); aqui o boneco vai com a cadeira, desce onde o núcleo mandou, e a
 * câmera continua da criança.
 */
const P: ParqueVila = {
  roda: { x: 100, y: 80, z: 50, raio: 7.5, eixo: 'x', saida: [100, 70, 55] },
  carrossel: { x: 60, y: 72, z: 60, raio: 3.7, beira: 6.1 },
  bate: { x: 30, y: 70.4, z: 20, meia: 3.2, raio: 2.9, saida: [29, 70, 27] },
};

function montar() {
  const m = {
    vista: null as ParqueVista | null,
    t: 100,
    jogador: { x: 66, y: 70, z: 68 },
    andando: false,
    saiu: 0,
    yaw: 1,
    pitch: 0,
    mexeuEm: -1,
    zoom: 3.8,
    sentou: 0,
    desceu: 0,
  };
  const p = criarPasseio({
    parque: P,
    chao: 70,
    voce: 'ana',
    vista: () => m.vista,
    tempoNucleo: () => m.t,
    jogador: m.jogador,
    andando: () => m.andando,
    sair: () => void m.saiu++,
    camera: {
      yaw: () => m.yaw,
      pitch: () => m.pitch,
      apontar: (y, pi) => {
        m.yaw = y;
        m.pitch = pi;
      },
      mexeuEm: () => m.mexeuEm,
      zoom: () => m.zoom,
      definirZoom: (d) => {
        m.zoom = d;
      },
    },
    aoSentar: () => void m.sentou++,
    aoDescer: () => void m.desceu++,
  });
  /** Anda `seg` segundos em quadros de 50 ms (o relógio da tela e o do mundo juntos). */
  let tela = 10;
  const andar = (seg: number) => {
    for (let k = 0; k < Math.round(seg / 0.05); k++) {
      tela += 0.05;
      m.t += 0.05;
      p.quadro(tela, 0.05);
    }
  };
  return { m, p, andar, tela: () => tela };
}
const sentada = (b: number, i: number, desde: number, fim = 0): ParqueVista => ({
  r: [0, -1e9],
  s: { ana: [b, i, desde, fim] },
});

describe('spec 026 (parte 2): o passeio no parque, no aparelho', () => {
  it('em pé, a física vale; sentada, o boneco vai com a cadeira depois do pulinho', () => {
    const { m, p, andar } = montar();
    andar(0.2);
    expect(p.lugar()).toBeNull();
    expect(p.sentado()).toBeNull();
    m.vista = sentada(1, 2, m.t);
    andar(0.05);
    expect(m.sentou).toBe(1);
    // o pulinho começa de onde ela estava
    const l0 = p.lugar()!;
    expect(Math.hypot(l0.x - 66, l0.z - 68)).toBeLessThan(1);
    andar(DURA_SENTAR + 0.1);
    const l = p.lugar()!;
    const c = lugarDaCadeira(P, 'carrossel', 2, m.t);
    expect(l.x).toBeCloseTo(c.x, 6);
    expect(l.y).toBeCloseTo(c.y, 6);
    expect(l.z).toBeCloseTo(c.z, 6);
    expect(l.yaw).toBeCloseTo(c.yaw, 6);
    // a pose de sentada entra por cima da do boneco
    const pose = calcularPose({
      andando: false,
      correndo: false,
      noAr: false,
      minerando: false,
      colocando: false,
      tempo: 0,
    });
    const perna = pose.pernaDireita;
    expect(p.pose(pose).pernaDireita).not.toBe(perna);
  });

  it('desce com um pulinho até o lugar que o núcleo deu, e a física volta dali', () => {
    const { m, p, andar } = montar();
    m.vista = sentada(1, 0, m.t);
    andar(1);
    p.desceu(67, 70, 61);
    m.vista = { r: [0, -1e9], s: {} };
    andar(0.05);
    expect(m.desceu).toBe(1);
    expect(p.sentado()).toBeNull();
    // ainda no pulinho: a física não vale
    expect(p.lugar()).not.toBeNull();
    andar(DURA_DESCER + 0.1);
    expect(p.lugar()).toBeNull();
    expect([m.jogador.x, m.jogador.y, m.jogador.z]).toEqual([67, 70, 61]);
  });

  it('empurrar o controle desce do carrossel e do bate-bate (depois de soltar), nunca da roda', () => {
    const { m, p, andar } = montar();
    // sentou com o controle ainda empurrado: não desce por isso
    m.andando = true;
    m.vista = sentada(2, 1, m.t);
    andar(2);
    expect(m.saiu).toBe(0);
    m.andando = false;
    andar(0.2);
    m.andando = true;
    andar(SEGURAR_PARA_SAIR - 0.2);
    expect(m.saiu).toBe(0);
    andar(0.4);
    expect(m.saiu).toBe(1);
    // segurando mais, não pede de novo
    andar(1);
    expect(m.saiu).toBe(1);
    expect(p.sentado()?.b).toBe('bate');

    const r = montar();
    r.m.vista = sentada(0, 0, r.m.t, 99);
    r.andar(1);
    r.m.andando = true;
    r.andar(3);
    expect(r.m.saiu).toBe(0);
  });

  it('na roda-gigante a câmera se afasta e vai para trás da cadeirinha; se a criança mexe, é dela', () => {
    const { m, p, andar, tela } = montar();
    m.vista = sentada(0, 0, m.t, 99);
    andar(0.05);
    expect(m.zoom).toBe(ZOOM_NA_RODA);
    andar(2.5);
    // a cadeirinha olha para o oeste, ao longo da roda
    expect(Math.sin(m.yaw)).toBeCloseTo(-1, 3);
    expect(m.pitch).toBeGreaterThan(0.2);
    // desceu: o zoom de antes volta
    m.vista = { r: [0, -1e9], s: {} };
    andar(0.1);
    expect(m.zoom).toBe(3.8);
    // de novo, mas a criança arrasta o dedo no meio do caminho: a câmera fica onde ela pôs
    andar(1);
    m.yaw = 2;
    m.vista = sentada(0, 0, m.t, 999);
    andar(0.3);
    m.mexeuEm = tela();
    m.yaw = 0.4;
    andar(2);
    expect(m.yaw).toBe(0.4);
    expect(p.progresso()).toBeGreaterThanOrEqual(0);
  });

  it('ir para outro lugar de uma vez larga a cadeira na hora (a física vale já)', () => {
    const { m, p, andar } = montar();
    m.vista = sentada(1, 0, m.t);
    andar(1);
    expect(p.largar()).toBe(true);
    expect(p.lugar()).toBeNull();
    // o núcleo ainda não confirmou: a cadeira não volta a puxar o boneco
    andar(0.5);
    expect(p.lugar()).toBeNull();
    expect(p.sentado()).toBeNull();
    m.vista = { r: [0, -1e9], s: {} };
    andar(0.1);
    // depois, sentar de novo vale
    m.vista = sentada(1, 3, m.t);
    andar(0.1);
    expect(p.sentado()?.i).toBe(3);
    expect(p.largar()).toBe(true);
    expect(montar().p.largar()).toBe(false);
  });

  it('o amigo sentado fica na cadeira dele (a mesma conta)', () => {
    const v: ParqueVista = { r: [0, -1e9], s: { leo: [2, 4, 3, 0] } };
    const l = lugarDoAmigo(P, v, 'leo', 50)!;
    expect(l.b).toBe('bate');
    expect(l.x).toBeCloseTo(lugarDaCadeira(P, 'bate', 4, 50).x, 9);
    expect(lugarDoAmigo(P, v, 'ana', 50)).toBeNull();
  });
});
