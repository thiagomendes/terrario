import { describe, expect, it } from 'vitest';
import { criarPopulacao, type MundoPopulacao } from '../../src/jogo/populacao';
import { criarGerador } from '../../src/audio/variacao';
import { colideCorpo, type Solido } from '../../src/player/fisica';
import {
  gerarChunk,
  indice,
  TAM_X,
  TAM_Z,
  ALTURA,
  NIVEL_MAR,
  TERRENO_NATURAL,
  biomaEm,
  definirEstiloMundo,
  ESTILO_PADRAO,
} from '../../src/world/chunk';
import { planoDaRegiao, type PlanoPovoado } from '../../src/world/povoado';
import { obterBloco } from '../../src/world/blocks';
import { CRIATURAS } from '../../src/jogo/criaturas';

const SEMENTE = 1337;

function primeiroPovoado(): PlanoPovoado {
  for (let r = 0; r < 6; r++)
    for (let rz = -r; rz <= r; rz++)
      for (let rx = -r; rx <= r; rx++) {
        const p = planoDaRegiao(rx, rz, SEMENTE, TERRENO_NATURAL);
        if (p) return p;
      }
  throw new Error('sem povoado');
}

/** Mundo de verdade (chunks gerados) para a IA dos moradores. */
function mundoReal(): MundoPopulacao {
  const cache = new Map<string, Uint8Array>();
  const bloco = (x: number, y: number, z: number) => {
    if (y < 0 || y >= ALTURA) return 0;
    const cx = Math.floor(x / TAM_X);
    const cz = Math.floor(z / TAM_Z);
    const k = `${cx},${cz}`;
    let c = cache.get(k);
    if (!c) {
      c = gerarChunk(cx, cz, SEMENTE);
      cache.set(k, c);
    }
    return c[indice(x - cx * TAM_X, y, z - cz * TAM_Z)];
  };
  const solido = ((x: number, y: number, z: number) =>
    !!obterBloco(bloco(x, y, z))?.solido) as Solido;
  return {
    solido,
    agua: (x, y, z) => bloco(x, y, z) === 67,
    luzBloco: () => 12,
    ceuAberto: () => true,
    bioma: (x, z) => biomaEm(x, z, SEMENTE),
    superficie: (x, z) => {
      for (let y = ALTURA - 2; y > 0; y--) if (solido(x, y, z)) return y + 1;
      return null;
    },
    nivelMar: NIVEL_MAR,
    povoados: () => [primeiroPovoado()],
  };
}

describe('moradores', () => {
  it.each([
    ['duas-aguas', 'poco'],
    ['cupula', 'antena'],
    ['redonda', 'fonte'],
    ['modulo', 'moinho'],
  ] as const)('casas %s e marco %s: um por casa e nunca presos em 10 dias', (casa, marco) => {
    definirEstiloMundo({
      ...ESTILO_PADRAO,
      povoado: { casa, oficina: casa, deposito: casa, marco },
    });
    const p = primeiroPovoado();
    const m = mundoReal();
    const pop = criarPopulacao(criarGerador(5));
    // jogador fora do povoado (os moradores não param para olhar para ele)
    const j = { x: p.cx + 34.5, y: p.h + 1, z: p.cz + 0.5, vivo: true, criativo: true };
    const dt = 0.1;
    // um dia de 20 min no jogo, acelerado: 10 dias com noite e dia alternando
    const DIA = 600;
    const problemas: string[] = [];
    for (let i = 0; i < DIA * 10; i++) {
      const fase = (i % DIA) / DIA;
      const noite = fase > 0.6 ? 1 : 0;
      pop.atualizar(dt, m, j, noite);
      if (i % 50 !== 0) continue;
      const moradores = pop.lista.filter((c) => c.tipo === 'morador');
      if (i > 20) expect(moradores.length).toBe(p.moradores.length);
      for (const c of moradores) {
        const def = CRIATURAS.morador;
        if (colideCorpo(m.solido, c.x, c.y + 0.05, c.z, def.mw, def.alt * 0.9))
          problemas.push(
            `dia ${Math.floor(i / DIA)} ${c.morador!.n} dentro de bloco em ${c.x.toFixed(1)},${c.y.toFixed(1)},${c.z.toFixed(1)}`,
          );
        if (Math.hypot(c.x - p.cx, c.z - p.cz) > 40)
          problemas.push(`${c.morador!.n} longe do povoado`);
      }
      // fim da noite: todos em casa
      if (noite && (i % DIA) / DIA > 0.97) {
        for (const c of moradores) {
          const d = Math.hypot(c.x - c.morador!.dentro[0], c.z - c.morador!.dentro[2]);
          if (d > 1.5)
            problemas.push(
              `dia ${Math.floor(i / DIA)}: ${c.morador!.n} fora de casa à noite (${d.toFixed(1)})`,
            );
        }
      }
    }
    // anda de verdade: o anti-trava é exceção (no máximo 2 vezes em 10 dias)
    for (const c of pop.lista.filter((x) => x.tipo === 'morador'))
      expect(
        c.teleportes ?? 0,
        `morador ${c.morador!.n} teleportado demais (${casa})`,
      ).toBeLessThanOrEqual(2);
    definirEstiloMundo(ESTILO_PADRAO);
    expect(problemas.slice(0, 10)).toEqual([]);
  });

  it('golpe não machuca o morador: ele se assusta e se afasta', () => {
    const p = primeiroPovoado();
    const m = mundoReal();
    const pop = criarPopulacao(criarGerador(5));
    const j = { x: p.cx + 0.5, y: p.h + 1, z: p.cz + 0.5, vivo: true, criativo: true };
    for (let i = 0; i < 30; i++) pop.atualizar(0.1, m, j, 0);
    const c = pop.lista.find((x) => x.tipo === 'morador')!;
    const vida = c.vida;
    const ev = pop.ferir(c, 5, j.x, j.z);
    expect(c.vida).toBe(vida);
    expect(ev[0]?.tipo).toBe('ferida');
    expect(c.estado).toBe('fugir');
  });
});

describe('moradores em povoados de várias sementes', () => {
  it.each([1, 2, 7, 42, 99])(
    'semente %i: andam pelos caminhos sem precisar do anti-trava',
    (semente) => {
      let p: PlanoPovoado | null = null;
      for (let r = 0; r < 6 && !p; r++)
        for (let rz = -r; rz <= r && !p; rz++)
          for (let rx = -r; rx <= r && !p; rx++)
            p = planoDaRegiao(rx, rz, semente, TERRENO_NATURAL);
      expect(p).toBeTruthy();
      const cache = new Map<string, Uint8Array>();
      const bloco = (x: number, y: number, z: number) => {
        if (y < 0 || y >= ALTURA) return 0;
        const cx = Math.floor(x / TAM_X);
        const cz = Math.floor(z / TAM_Z);
        const k = `${cx},${cz}`;
        let c = cache.get(k);
        if (!c) {
          c = gerarChunk(cx, cz, semente);
          cache.set(k, c);
        }
        return c[indice(x - cx * TAM_X, y, z - cz * TAM_Z)];
      };
      const solido = ((x: number, y: number, z: number) =>
        !!obterBloco(bloco(x, y, z))?.solido) as Solido;
      const m: MundoPopulacao = {
        solido,
        agua: () => false,
        luzBloco: () => 12,
        ceuAberto: () => true,
        bioma: (x, z) => biomaEm(x, z, semente),
        superficie: (x, z) => {
          for (let y = ALTURA - 2; y > 0; y--) if (solido(x, y, z)) return y + 1;
          return null;
        },
        nivelMar: NIVEL_MAR,
        povoados: () => [p!],
      };
      const pop = criarPopulacao(criarGerador(5));
      const j = { x: p!.cx + 34.5, y: p!.h + 1, z: p!.cz + 0.5, vivo: true, criativo: true };
      for (let i = 0; i < 6000; i++) pop.atualizar(0.1, m, j, (i % 600) / 600 > 0.6 ? 1 : 0);
      const moradores = pop.lista.filter((c) => c.tipo === 'morador');
      expect(moradores.length).toBe(p!.moradores.length);
      for (const c of moradores)
        expect(c.teleportes ?? 0, `morador ${c.morador!.n}`).toBeLessThanOrEqual(2);
    },
  );
});

describe('moradores andam de verdade (sem tremer no lugar)', () => {
  // o defeito: perto de um ponto do caminho o alvo alternava entre ele e o anterior;
  // o morador ficava indo e voltando sem sair do lugar, mas "progredia" o bastante
  // para o anti-trava nunca agir (o teste de 10 dias não via)
  it.each([
    [1337, 1 / 60, 'praca'],
    [1337, 0.05, 'longe'],
    [42, 1 / 60, 'praca'],
    [7, 0.05, 'praca'],
  ] as const)('semente %i, passo %f, jogador %s', (semente, dt, onde) => {
    let p: PlanoPovoado | null = null;
    for (let r = 0; r < 6 && !p; r++)
      for (let rz = -r; rz <= r && !p; rz++)
        for (let rx = -r; rx <= r && !p; rx++) p = planoDaRegiao(rx, rz, semente, TERRENO_NATURAL);
    const cache = new Map<string, Uint8Array>();
    const bloco = (x: number, y: number, z: number) => {
      if (y < 0 || y >= ALTURA) return 0;
      const cx = Math.floor(x / TAM_X);
      const cz = Math.floor(z / TAM_Z);
      const k = `${cx},${cz}`;
      let c = cache.get(k);
      if (!c) {
        c = gerarChunk(cx, cz, semente);
        cache.set(k, c);
      }
      return c[indice(x - cx * TAM_X, y, z - cz * TAM_Z)];
    };
    const solido = ((x: number, y: number, z: number) =>
      !!obterBloco(bloco(x, y, z))?.solido) as Solido;
    const m: MundoPopulacao = {
      solido,
      agua: () => false,
      luzBloco: () => 12,
      ceuAberto: () => true,
      bioma: (x, z) => biomaEm(x, z, semente),
      superficie: (x, z) => {
        for (let y = ALTURA - 2; y > 0; y--) if (solido(x, y, z)) return y + 1;
        return null;
      },
      nivelMar: NIVEL_MAR,
      povoados: () => [p!],
    };
    const pop = criarPopulacao(criarGerador(5));
    const j =
      onde === 'praca'
        ? { x: p!.cx + 2.5, y: p!.h + 1, z: p!.cz + 2.5, vivo: true, criativo: true }
        : { x: p!.cx + 34.5, y: p!.h + 1, z: p!.cz + 0.5, vivo: true, criativo: true };
    const porSegundo = Math.round(1 / dt);
    const ultimo = new Map<number, { x: number; z: number }>();
    const seguindo = new Map<number, number>();
    const parado = new Map<number, number>();
    // 2 minutos de dia
    for (let i = 0; i < porSegundo * 120; i++) {
      pop.atualizar(dt, m, j, 0);
      if (i % porSegundo !== 0) continue;
      for (const c of pop.lista) {
        if (c.tipo !== 'morador') continue;
        const a = ultimo.get(c.id);
        ultimo.set(c.id, { x: c.x, z: c.z });
        if (!a || c.estado !== 'seguir') continue;
        seguindo.set(c.id, (seguindo.get(c.id) ?? 0) + 1);
        if (Math.hypot(c.x - a.x, c.z - a.z) < 0.25) parado.set(c.id, (parado.get(c.id) ?? 0) + 1);
      }
    }
    for (const [id, s] of seguindo) {
      const presos = parado.get(id) ?? 0;
      expect(presos, `morador ${id}: ${presos} de ${s} s sem sair do lugar`).toBeLessThanOrEqual(
        Math.max(3, s * 0.1),
      );
    }
  });
});
