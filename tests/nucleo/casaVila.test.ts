import { describe, expect, it } from 'vitest';
import '../../src/temas/todos';
import { planoDaVila } from '../../src/world/vilaNeon';
import { criarCasaNucleo, CHAVE_RAMPA, type JogadorCasa } from '../../src/nucleo/casa';
import {
  CANAIS_TV,
  DURA_FILME,
  ESPERA_CANAL,
  ESPERA_DISCO,
  casaDaRede,
  dentroDaCasa,
  naTela,
  proximoDoBau,
} from '../../src/jogo/casa';
import { CUBO_CORES, FITA_VIDEO, IOIO, PIAO } from '../../src/jogo/exclusivos';
import { duracaoDoTrilho, trilhoDaRede } from '../../src/jogo/rampa';

/**
 * Spec 026 (parte 3): a Casa anos 80 e a rampa de skate no núcleo. A TV e o disco da sala são de
 * todos (com a esperinha da sala, e o filme passa até o fim); o baú dá os três brinquedos; o
 * trilho da rampa é do núcleo (só de skate, só do pé de uma curva) e acaba sozinho.
 */
const plano = planoDaVila(77, { altura: () => 70, nivelMar: 62 });
const P = plano.pontos;

function montar() {
  let agora = 10;
  const jogadores = new Map<string, JogadorCasa & { mochila: Map<string, number>; soltou: number }>();
  const eventos: [string, string][] = [];
  let sujou = 0;
  const casa = criarCasaNucleo({
    casa: P.casa,
    skate: P.skate,
    agora: () => agora,
    jogador: (id) => jogadores.get(id),
    evento: (id, chave) => eventos.push([id, chave]),
    sujar: () => sujou++,
  });
  const entrar = (id: string, x: number, y: number, z: number, skate = false) => {
    const mochila = new Map<string, number>();
    const j = {
      id,
      x,
      y,
      z,
      morto: false,
      skate,
      mochila,
      soltou: 0,
      contar: (i: string) => mochila.get(i) ?? 0,
      darNaMao: (i: string, q: number) => mochila.set(i, (mochila.get(i) ?? 0) + q),
      soltar() {
        j.soltou++;
      },
    };
    jogadores.set(id, j);
    return j;
  };
  return {
    casa,
    entrar,
    eventos,
    sujou: () => sujou,
    passar(s: number) {
      agora += s;
    },
    agora: () => agora,
  };
}

describe('a sala da Casa anos 80 é de todos', () => {
  it('o toque na TV troca o canal (em roda), com a esperinha da sala entre dois toques', () => {
    const m = montar();
    const [sx, , sz] = P.casa.sofa.assentos[1] ? [P.casa.sofa.assentos[1].x, 0, P.casa.sofa.assentos[1].z] : [0, 0, 0];
    m.entrar('ana', sx, P.casa.y, sz);
    m.entrar('leo', P.casa.tv[0], P.casa.y, P.casa.tv[2] + 2);
    expect(m.casa.sala().canal).toBe(0);
    m.casa.comando('ana', { a: 'tv' });
    expect(m.casa.sala().canal).toBe(1);
    // o amigo toca logo em seguida: a esperinha segura (ninguém troca por cima do outro)
    m.casa.comando('leo', { a: 'tv' });
    expect(m.casa.sala().canal).toBe(1);
    m.passar(ESPERA_CANAL + 0.01);
    m.casa.comando('leo', { a: 'tv' });
    expect(m.casa.sala().canal).toBe(2);
    for (let i = 0; i < CANAIS_TV; i++) {
      m.passar(ESPERA_CANAL + 0.01);
      m.casa.comando('ana', { a: 'tv' });
    }
    expect(m.casa.sala().canal).toBe(2);
    // o quadro leva o canal para todos
    const vista = casaDaRede(m.casa.vistaCasa());
    expect(vista.canal).toBe(2);
    expect(naTela(vista, m.agora() + 1).o).toBe('canal');
  });

  it('do lado de fora da casa a TV não troca (o toque é de quem está na sala)', () => {
    const m = montar();
    m.entrar('ana', P.casa.porta[0], P.casa.y, P.casa.porta[2] + 4);
    m.casa.comando('ana', { a: 'tv' });
    expect(m.casa.sala().canal).toBe(0);
    expect(dentroDaCasa(P.casa, P.casa.porta[0], P.casa.porta[2] + 4)).toBe(false);
  });

  it('a fita da locadora no videocassete passa o filme até o fim (o canal não troca no meio)', () => {
    const m = montar();
    const ana = m.entrar('ana', P.casa.tv[0], P.casa.y, P.casa.tv[2] + 3);
    m.entrar('leo', P.casa.tv[0] + 1, P.casa.y, P.casa.tv[2] + 3);
    // sem a fita, nada
    m.casa.comando('ana', { a: 'videocassete' });
    expect(m.casa.sala().filme).toBe(0);
    ana.mochila.set(FITA_VIDEO, 1);
    m.casa.comando('ana', { a: 'videocassete' });
    const fim = m.casa.sala().filme;
    expect(fim).toBeCloseTo(m.agora() + DURA_FILME, 6);
    expect(naTela(m.casa.sala(), m.agora() + 5)).toEqual({ o: 'filme', f: 5 });
    // a fita continua com ela (só passou o filme)
    expect(ana.mochila.get(FITA_VIDEO)).toBe(1);
    m.passar(ESPERA_CANAL + 1);
    m.casa.comando('leo', { a: 'tv' });
    expect(m.casa.sala().filme).toBe(fim);
    expect(m.casa.sala().canal).toBe(0);
    // acabou: o canal volta a trocar
    m.passar(DURA_FILME);
    m.casa.comando('leo', { a: 'tv' });
    expect(m.casa.sala().canal).toBe(1);
  });

  it('o toque no toca-discos liga e desliga o disco, com a esperinha', () => {
    const m = montar();
    m.entrar('ana', P.casa.discos[0] + 1.5, P.casa.y, P.casa.discos[2]);
    m.casa.comando('ana', { a: 'disco' });
    const desde = m.casa.sala().disco;
    expect(desde).toBeCloseTo(m.agora(), 6);
    m.casa.comando('ana', { a: 'disco' });
    expect(m.casa.sala().disco).toBe(desde);
    m.passar(ESPERA_DISCO + 0.01);
    m.casa.comando('ana', { a: 'disco' });
    expect(m.casa.sala().disco).toBe(-1);
  });

  it('o baú dá o ioiô, o pião e o cubo de cores, um de cada, só para quem está perto', () => {
    const m = montar();
    const longe = m.entrar('leo', P.casa.tv[0], P.casa.y, P.casa.tv[2] + 2);
    m.casa.comando('leo', { a: 'bau' });
    expect(longe.mochila.size).toBe(0);
    const ana = m.entrar('ana', P.casa.bau[0] - 1.5, P.casa.y, P.casa.bau[2]);
    for (let i = 0; i < 5; i++) m.casa.comando('ana', { a: 'bau' });
    expect(ana.mochila.get(IOIO)).toBe(1);
    expect(ana.mochila.get(PIAO)).toBe(1);
    expect(ana.mochila.get(CUBO_CORES)).toBe(1);
    expect(proximoDoBau((i) => ana.mochila.get(i) ?? 0)).toBeNull();
  });
});

describe('o trilho da rampa de skate é do núcleo', () => {
  const r = P.skate.rampa;

  it('de skate, do pé da curva: o núcleo dá o trilho, que acaba sozinho no pé da outra curva', () => {
    const m = montar();
    const ana = m.entrar('ana', r.x + r.meia - 0.5, r.y, r.z, true);
    m.casa.comando('ana', { a: 'rampa', l: 1 });
    const t = trilhoDaRede(m.casa.vistaRampa()?.ana)!;
    expect(t.lado).toBe(1);
    expect(t.s0).toBeCloseTo(r.meia - 0.5, 2);
    // pedir de novo no meio não começa outro
    m.passar(0.5);
    m.casa.comando('ana', { a: 'rampa', l: 1 });
    expect(trilhoDaRede(m.casa.vistaRampa()?.ana)!.desde).toBe(t.desde);
    m.passar(duracaoDoTrilho(r, t));
    // (a criança vai junto: o aparelho manda onde ela está)
    ana.x = r.x - r.meia;
    m.casa.passo();
    expect(m.casa.vistaRampa()).toBeUndefined();
    expect(m.eventos).toContainEqual(['ana', CHAVE_RAMPA]);
    expect(ana.soltou).toBe(1);
    // e o próximo já vem dali (o vai e vem), para o outro lado
    m.casa.comando('ana', { a: 'rampa', l: -1 });
    expect(trilhoDaRede(m.casa.vistaRampa()?.ana)!.lado).toBe(-1);
  });

  it('sem skate, longe do pé da curva ou de outro lado: nada', () => {
    const m = montar();
    m.entrar('ana', r.x + r.meia - 0.5, r.y, r.z, false);
    m.casa.comando('ana', { a: 'rampa', l: 1 });
    m.entrar('leo', r.x + 30, r.y, r.z, true);
    m.casa.comando('leo', { a: 'rampa', l: 1 });
    m.entrar('bia', r.x + r.meia - 0.5, r.y, r.z, true);
    m.casa.comando('bia', { a: 'rampa', l: -1 });
    expect(m.casa.vistaRampa()).toBeUndefined();
  });

  it('quem vai para longe (pulou para um amigo) solta o trilho', () => {
    const m = montar();
    const ana = m.entrar('ana', r.x + r.meia - 0.5, r.y, r.z, true);
    m.casa.comando('ana', { a: 'rampa', l: 1 });
    m.passar(1.2);
    ana.x += 40;
    m.casa.passo();
    expect(m.casa.vistaRampa()).toBeUndefined();
    expect(m.eventos).toEqual([]);
  });
});

describe('a rede da parte 3', () => {
  it('subiu para 14 e os comandos novos passam a limpo (o resto não passa)', async () => {
    const { VERSAO_REDE } = await import('../../src/rede/protocolo');
    const { sanear } = await import('../../src/nucleo/saneamento');
    // (14 na parte 3; 15 na etapa B, com as missões da casa)
    expect(VERSAO_REDE).toBeGreaterThanOrEqual(14);
    for (const a of ['tv', 'videocassete', 'disco', 'bau'])
      expect(sanear({ t: 'vila', a, lixo: 1 })).toEqual({ t: 'vila', a });
    expect(sanear({ t: 'vila', a: 'rampa', l: 1, x: 9 })).toEqual({ t: 'vila', a: 'rampa', l: 1 });
    expect(sanear({ t: 'vila', a: 'rampa', l: -1 })).toEqual({ t: 'vila', a: 'rampa', l: -1 });
    expect(sanear({ t: 'vila', a: 'rampa', l: 2 })).toBeNull();
    expect(sanear({ t: 'vila', a: 'rampa' })).toBeNull();
    expect(sanear({ t: 'vila', a: 'sofa' })).toBeNull();
  });
});
