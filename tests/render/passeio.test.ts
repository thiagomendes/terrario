import { describe, expect, it } from 'vitest';
import {
  criarPasseio,
  DURA_DESCER,
  DURA_SENTAR,
  lugarDoAmigo,
  ESPERA_SEGUIR,
  PARAR_NO_TAPETE,
  SEGURAR_PARA_SAIR,
  ZOOM_NA_RODA,
  ZOOM_NO_BATE,
} from '../../src/render/vila/passeio';
import {
  lugarDaCadeira,
  type CarrinhoNoLugar,
  type ParqueVila,
  type ParqueVista,
} from '../../src/jogo/parque';
import { calcularPose } from '../../src/personagem/poses';

/**
 * Spec 026 (parte 2): o passeio da criança nos brinquedos do parque, no aparelho. O núcleo diz
 * quem está sentado (a vista); aqui o boneco vai com a cadeira, desce onde o núcleo mandou, e a
 * câmera continua da criança.
 */
const P: ParqueVila = {
  roda: { x: 100, y: 80, z: 50, raio: 7.5, eixo: 'x', saida: [100, 70, 55] },
  carrossel: { x: 60, y: 72, z: 60, raio: 3.7, beira: 6.1 },
  bate: {
    x: 30,
    y: 70.4,
    z: 20,
    x0: 18,
    z0: 13.5,
    x1: 42,
    z1: 26.5,
    vagas: [
      [22, 16, 0],
      [30, 18, 0],
      [36, 16, 0],
      [38, 22, 0],
      [20, 25.4, Math.PI],
      [22.4, 25.4, Math.PI],
      [33, 25.4, Math.PI],
      [35.4, 25.4, Math.PI],
    ],
    tapete: { x0: 26, z0: 24.5, x1: 30, z1: 26.5 },
    saida: [29, 70, 28.5],
  },
};

function montar() {
  const m = {
    carros: null as CarrinhoNoLugar[] | null,
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
    carros: () => m.carros,
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

  it('empurrar o controle desce do carrossel (depois de soltar), nunca da roda', () => {
    const { m, p, andar } = montar();
    // sentou com o controle ainda empurrado: não desce por isso
    m.andando = true;
    m.vista = sentada(1, 1, m.t);
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
    expect(p.sentado()?.b).toBe('carrossel');

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

  it('o amigo sentado fica na cadeira dele: no bate-bate, no carrinho que a tela mostra', () => {
    const v: ParqueVista = { r: [0, -1e9], s: { leo: [2, 4, 3, 0] } };
    const carros = P.bate.vagas.map(([x, z, yaw]) => ({ x, z, yaw }));
    carros[4] = { x: 31, z: 19, yaw: 0.7 };
    const l = lugarDoAmigo(P, v, 'leo', 50, carros)!;
    expect(l.b).toBe('bate');
    expect([l.x, l.y, l.z, l.yaw]).toEqual([31, 70.4, 19, 0.7]);
    // (sem os carrinhos ainda: na vaga dele)
    expect(lugarDoAmigo(P, v, 'leo', 50)!.x).toBe(20);
    expect(lugarDoAmigo(P, v, 'ana', 50)).toBeNull();
  });

  /** Os carrinhos nas vagas, com o da criança (o 5) onde o teste puser. */
  const pista = (x: number, z: number, yaw = Math.PI) => {
    const carros = P.bate.vagas.map(([vx, vz, vy]) => ({ x: vx, z: vz, yaw: vy }));
    carros[5] = { x, z, yaw };
    return carros;
  };

  it('no bate-bate o boneco vai com o carrinho que ela guia, e empurrar o controle nunca desce', () => {
    const { m, p, andar } = montar();
    m.jogador.x = 22;
    m.jogador.z = 28;
    m.carros = pista(22.4, 25.4);
    m.vista = sentada(2, 5, m.t);
    andar(DURA_SENTAR + 0.1);
    expect(p.lugar()).toMatchObject({ x: 22.4, y: 70.4, z: 25.4, yaw: Math.PI });
    // guia pela pista por dez segundos com o controle empurrado: continua no carrinho
    m.andando = true;
    for (let k = 0; k < 200; k++) {
      m.carros = pista(22.4 + k * 0.05, 25.4 - k * 0.04, 2);
      andar(0.05);
    }
    expect(m.saiu).toBe(0);
    expect(p.sentado()?.b).toBe('bate');
    expect(p.lugar()!.x).toBeCloseTo(22.4 + 199 * 0.05, 6);
    // soltar o controle no meio da pista também não desce (só o tapete da saída)
    m.andando = false;
    andar(5);
    expect(m.saiu).toBe(0);
  });

  it('no bate-bate desce quem para o carrinho no tapete verde por um segundo (passar por cima não desce)', () => {
    const { m, andar } = montar();
    m.carros = pista(22.4, 25.4);
    m.vista = sentada(2, 5, m.t);
    andar(1);
    // parada na vaga, sem nunca ter guiado: não é o tapete, não desce
    andar(3);
    expect(m.saiu).toBe(0);
    // guia e passa por cima do tapete sem parar
    m.andando = true;
    for (let k = 0; k < 60; k++) {
      m.carros = pista(24 + k * 0.15, 25.4, Math.PI / 2);
      andar(0.05);
    }
    expect(m.saiu).toBe(0);
    // volta e para em cima dele, o controle solto
    m.carros = pista(28, 25.4, Math.PI / 2);
    andar(0.1);
    m.andando = false;
    andar(PARAR_NO_TAPETE - 0.3);
    expect(m.saiu).toBe(0);
    andar(0.5);
    expect(m.saiu).toBe(1);
    // esperando o núcleo, não pede de novo
    andar(2);
    expect(m.saiu).toBe(1);
  });

  it('no bate-bate a câmera se afasta e vai atrás do carrinho; se a criança arrasta, é dela por uns segundos', () => {
    const { m, andar, tela } = montar();
    m.yaw = 0.2;
    m.carros = pista(22.4, 25.4, Math.PI);
    m.vista = sentada(2, 5, m.t);
    andar(0.05);
    expect(m.zoom).toBe(ZOOM_NO_BATE);
    andar(4);
    // atrás do carrinho (olhando para onde ele vai), um pouco de cima
    expect(Math.cos(m.yaw - Math.PI)).toBeGreaterThan(0.98);
    expect(m.pitch).toBeGreaterThan(0.25);
    // o carrinho vira: a câmera vai atrás devagar (nunca de uma vez)
    m.carros = pista(22.4, 25.4, Math.PI / 2);
    const antes = m.yaw;
    andar(0.05);
    expect(Math.abs(m.yaw - antes)).toBeLessThan(0.15);
    andar(4);
    expect(Math.cos(m.yaw - Math.PI / 2)).toBeGreaterThan(0.98);
    // a criança arrasta a câmera: fica onde ela pôs; depois de uns segundos volta a seguir
    m.mexeuEm = tela();
    m.yaw = -1;
    m.pitch = 0.1;
    andar(ESPERA_SEGUIR - 0.3);
    expect(m.yaw).toBe(-1);
    expect(m.pitch).toBe(0.1);
    andar(4);
    expect(Math.cos(m.yaw - Math.PI / 2)).toBeGreaterThan(0.95);
    // (a altura do olhar, depois de sentar, é sempre dela)
    expect(m.pitch).toBe(0.1);
    // desceu: o zoom de antes volta
    m.vista = { r: [0, -1e9], s: {} };
    andar(0.1);
    expect(m.zoom).toBe(3.8);
  });
});
