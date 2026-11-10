import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  gerarChunk,
  definirEstiloMundo,
  ESTILO_PADRAO,
  indice,
  TAM_X,
  TAM_Z,
  ALTURA,
  NIVEL_MAR,
  TERRENO_NATURAL,
  biomaEm,
} from '../../src/world/chunk';
import { planoDaRegiao, limparPovoados, type PlanoPovoado } from '../../src/world/povoado';
import { Bloco, obterBloco } from '../../src/world/blocks';
import { criarMundoSolido } from '../../src/world/solido';
import { criarEdicoes } from '../../src/world/edicoes';
import { registrarCatalogo } from '../../src/jogo/catalogo';
import { criarGerador } from '../../src/audio/variacao';
import { criarPopulacao, BICHOS_POR_CERCADO, type MundoPopulacao } from '../../src/jogo/populacao';
import type { Criatura, Jogador } from '../../src/jogo/criaturas';
import type { EstiloMundo } from '../../src/temas/tipos';
import '../../src/temas/todos';
import { obterTema } from '../../src/temas';

/**
 * Spec 013: os bichos do cercado do sítio e a criação. O bicho do cercado que ganha comida
 * vira criado e continua contando nos 3 do cercado (salvo ou não); levado para fora, deixa
 * de ser do cercado. E ninguém sai pela porteira aberta passeando.
 */
const SEMENTE = 1337;
const COMIDA = { cervo: 'trigo', coelho: 'semente_milho' } as const;
const SITIO: EstiloMundo = { ...obterTema('rancho-alegre').mundo };

beforeAll(() => {
  registrarCatalogo();
  definirEstiloMundo(SITIO);
  limparPovoados();
});
afterAll(() => {
  definirEstiloMundo(ESTILO_PADRAO);
  limparPovoados();
});

function umSitio(): PlanoPovoado {
  for (let rx = -2; rx <= 2; rx++)
    for (let rz = -2; rz <= 2; rz++) {
      const p = planoDaRegiao(rx, rz, SEMENTE, TERRENO_NATURAL);
      if (p?.currais?.length) return p;
    }
  throw new Error('sem sítio');
}

function mundoReal(p: PlanoPovoado, abrirPorteiras = false): MundoPopulacao {
  const cache = new Map<string, Uint8Array>();
  const edicoes = criarEdicoes();
  if (abrirPorteiras)
    for (const c of p.currais!) {
      const y = p.lotes[c.lote].h + 1;
      // a porteira (spec 013): um bloco só, aberta é passagem
      edicoes.definir(c.portao[0], y, c.portao[1], Bloco.PORTEIRA_ABERTA);
    }
  const bloco = (x: number, y: number, z: number): number => {
    if (y < 0 || y >= ALTURA) return Bloco.AR;
    const e = edicoes.obter(x, y, z);
    if (e !== undefined && e !== null) return e;
    const cx = Math.floor(x / TAM_X);
    const cz = Math.floor(z / TAM_Z);
    const k = `${cx},${cz}`;
    let ch = cache.get(k);
    if (!ch) {
      ch = gerarChunk(cx, cz, SEMENTE);
      cache.set(k, ch);
    }
    return ch[indice(x - cx * TAM_X, y, z - cz * TAM_Z)];
  };
  return {
    solido: criarMundoSolido(SEMENTE, gerarChunk, edicoes),
    agua: (x, y, z) => bloco(x, y, z) === Bloco.AGUA,
    luzBloco: () => 12,
    ceuAberto: () => true,
    bioma: (x, z) => biomaEm(x, z, SEMENTE),
    superficie: (x, z) => {
      for (let y = ALTURA - 2; y > 0; y--) if (obterBloco(bloco(x, y, z))?.solido) return y + 1;
      return null;
    },
    nivelMar: NIVEL_MAR,
    povoados: (x, z, r) => (Math.hypot(p.cx - x, p.cz - z) <= r ? [p] : []),
  };
}

const chave = (p: PlanoPovoado, k: number) => `${p.id}:${k}`;
const doCercado = (l: readonly Criatura[], p: PlanoPovoado, k: number) =>
  l.filter((b) => b.curral === chave(p, k) && b.estado !== 'morrendo');
const dentro = (p: PlanoPovoado, k: number, b: Criatura) => {
  const l = p.lotes[p.currais![k].lote];
  return b.x > l.x0 && b.x < l.x0 + 7 && b.z > l.z0 && b.z < l.z0 + 7;
};

describe('cercado do sítio e criação', () => {
  let p: PlanoPovoado;
  let c0: NonNullable<PlanoPovoado['currais']>[number];
  let perto: Jogador;
  let longe: Jogador;
  beforeAll(() => {
    p = umSitio();
    c0 = p.currais![0];
    perto = { x: c0.fora[0] + 0.5, y: p.h + 1, z: c0.fora[1] + 0.5, vivo: true, criativo: true };
    longe = { ...perto, x: perto.x + 300 };
  });

  it('o bicho do cercado que ganha comida conta nos 3, salvo e reaberto, sem duplicar', () => {
    const m = mundoReal(p);
    const pop = criarPopulacao(criarGerador(5));
    for (let i = 0; i < 20; i++) pop.atualizar(0.1, m, perto, 0);
    expect(doCercado(pop.lista, p, 0)).toHaveLength(BICHOS_POR_CERCADO);
    const b = doCercado(pop.lista, p, 0)[0];
    expect(pop.criar(b)).toBe('novo');
    expect(b.cerca).toBeDefined();
    // vai longe e volta: os outros dois somem e voltam; o criado ficou: 3, nunca 4
    for (let i = 0; i < 30; i++) pop.atualizar(0.1, m, longe, 0);
    expect(doCercado(pop.lista, p, 0).map((x) => x.id)).toEqual([b.id]);
    for (let i = 0; i < 30; i++) pop.atualizar(0.1, m, perto, 0);
    expect(doCercado(pop.lista, p, 0)).toHaveLength(BICHOS_POR_CERCADO);
    // salva e reabre: o criado volta do cercado, e o sítio só chama os que faltam
    const salvo = JSON.parse(JSON.stringify(pop.salvar()));
    expect(salvo.criados[0]).toMatchObject({ curral: chave(p, 0), cerca: b.cerca });
    const pop2 = criarPopulacao(criarGerador(5), salvo);
    for (let i = 0; i < 30; i++) pop2.atualizar(0.1, m, perto, 0);
    const l2 = doCercado(pop2.lista, p, 0);
    expect(l2).toHaveLength(BICHOS_POR_CERCADO);
    expect(l2.filter((x) => x.criado)).toHaveLength(1);
    // e depois de mais uma ida e volta, continua 3
    for (let i = 0; i < 30; i++) pop2.atualizar(0.1, m, longe, 0);
    for (let i = 0; i < 30; i++) pop2.atualizar(0.1, m, perto, 0);
    expect(doCercado(pop2.lista, p, 0)).toHaveLength(BICHOS_POR_CERCADO);
  });

  it('levado para fora do cercado com a comida, deixa de ser do cercado', () => {
    const m = mundoReal(p, true);
    const pop = criarPopulacao(criarGerador(7));
    for (let i = 0; i < 20; i++) pop.atualizar(0.1, m, perto, 0);
    const b = doCercado(pop.lista, p, 0)[0];
    pop.criar(b);
    // fora do curral, longe dele: a casa muda para onde ele parou
    b.x = perto.x + (perto.x - (c0.x0 + c0.x1) / 2) * 2;
    b.z = perto.z + (perto.z - (c0.z0 + c0.z1) / 2) * 2;
    b.estado = 'seguir';
    pop.atualizar(0.1, m, { ...perto, x: b.x + 1, z: b.z, mao: null }, 0);
    expect(b.curral).toBeUndefined();
    expect(b.cerca).toBeUndefined();
    expect(Math.hypot(b.casa![0] - b.x, b.casa![1] - b.z)).toBeLessThan(0.5);
  });

  it('com as porteiras abertas, os bichos do cercado não saem passeando (5 minutos)', () => {
    const m = mundoReal(p, true);
    const pop = criarPopulacao(criarGerador(11));
    // o jogador longe da porteira (do outro lado da praça), mas perto o bastante para simular
    const j: Jogador = { x: p.cx + 0.5, y: p.h + 1, z: p.cz + 0.5, vivo: true, criativo: true };
    for (let i = 0; i < 3000; i++) {
      pop.atualizar(0.1, m, j, 0);
      if (i % 50 !== 49) continue;
      p.currais!.forEach((_, k) => {
        const l = doCercado(pop.lista, p, k);
        expect(l).toHaveLength(BICHOS_POR_CERCADO);
        for (const b of l)
          expect(dentro(p, k, b), `${b.tipo} ${b.x},${b.z} min ${i / 600}`).toBe(true);
      });
    }
  });
  it('porteira fechada segura: com a comida do lado de fora da porteira, ninguém sai', () => {
    const m = mundoReal(p);
    const pop = criarPopulacao(criarGerador(13));
    for (let i = 0; i < 20; i++) pop.atualizar(0.1, m, perto, 0);
    p.currais!.forEach((c, k) => {
      const jk: Jogador = {
        ...perto,
        x: c.fora[0] + 0.5,
        z: c.fora[1] + 0.5,
        mao: COMIDA[c.bicho],
      };
      for (let i = 0; i < 600; i++) {
        pop.atualizar(0.1, m, jk, 0);
        if (i % 20 === 19)
          for (const b of doCercado(pop.lista, p, k)) expect(dentro(p, k, b)).toBe(true);
      }
      // quem viu a comida veio até a cerca
      expect(doCercado(pop.lista, p, k).some((b) => b.estado === 'seguir')).toBe(true);
    });
  });

  it('porteira aberta e a comida na mão: o bicho sai atrás, e deixa de ser do cercado', () => {
    const m = mundoReal(p, true);
    const pop = criarPopulacao(criarGerador(17));
    for (let i = 0; i < 20; i++) pop.atualizar(0.1, m, perto, 0);
    const l = p.lotes[c0.lote];
    const ux = Math.sign(c0.fora[0] - c0.portao[0]);
    const uz = Math.sign(c0.fora[1] - c0.portao[1]);
    const j: Jogador = { ...perto, mao: COMIDA[c0.bicho] };
    let saiu: Criatura | undefined;
    for (let i = 0; i < 900 && !saiu; i++) {
      const passo = Math.min(4, i / 100);
      j.x = c0.fora[0] + 0.5 + ux * passo;
      j.z = c0.fora[1] + 0.5 + uz * passo;
      pop.atualizar(0.1, m, j, 0);
      saiu = pop.lista.find(
        (b) =>
          b.tipo === c0.bicho &&
          !(b.x > l.x0 && b.x < l.x0 + 7 && b.z > l.z0 && b.z < l.z0 + 7) &&
          Math.hypot(b.x - j.x, b.z - j.z) < 4,
      );
    }
    expect(saiu, 'nenhum bicho saiu atrás da comida').toBeDefined();
    pop.criar(saiu!);
    // soltou a comida lá fora: mora ali, não é mais do cercado, e o cercado nunca passa de 3
    j.mao = null;
    for (let i = 0; i < 5; i++) pop.atualizar(0.1, m, j, 0);
    expect(saiu!.curral).toBeUndefined();
    expect(saiu!.cerca).toBeUndefined();
    expect(doCercado(pop.lista, p, 0).length).toBeLessThanOrEqual(BICHOS_POR_CERCADO);
    for (let i = 0; i < 30; i++) pop.atualizar(0.1, m, longe, 0);
    for (let i = 0; i < 30; i++) pop.atualizar(0.1, m, perto, 0);
    expect(doCercado(pop.lista, p, 0)).toHaveLength(BICHOS_POR_CERCADO);
    expect(pop.lista).toContain(saiu);
    const salvo = JSON.parse(JSON.stringify(pop.salvar()));
    expect(salvo.criados).toHaveLength(1);
    expect(salvo.criados[0].curral).toBeUndefined();
  });
});
