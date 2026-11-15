import { describe, expect, it, beforeEach } from 'vitest';
import {
  ajusteDaVila,
  blocosDaVilaNoChunk,
  construirVila,
  distanciaDaVila,
  limparVilas,
  pisoDaVila,
  planoDaVila,
  vilaNoChunk,
  zonaDaVila,
  LARGURA_VILA,
  PROFUNDIDADE_VILA,
  type PlanoVila,
} from '../../src/world/vilaNeon';
import { Bloco, obterBloco } from '../../src/world/blocks';
import {
  alturaTerreno,
  definirEstiloMundo,
  encontrarNascimento,
  estiloMundo,
  gerarChunk,
  indice,
  olharDoNascimento,
  vilaDoMundo,
  ALTURA,
  TAM_X,
  TAM_Z,
} from '../../src/world/chunk';
import { obterTema } from '../../src/temas';
import '../../src/temas/todos';

const PLANO = { altura: () => 70, nivelMar: 62 };

/** Todos os blocos do bairro (mundo), de todos os chunks da área plana. */
function todos(p: PlanoVila): Map<string, number> {
  const m = new Map<string, number>();
  for (let cx = Math.floor(p.plana.x0 / 16); cx <= Math.floor(p.plana.x1 / 16); cx++)
    for (let cz = Math.floor(p.plana.z0 / 16); cz <= Math.floor(p.plana.z1 / 16); cz++)
      construirVila(p, cx, cz, (x, y, z, id) => m.set(`${x},${y},${z}`, id));
  return m;
}

describe('Vila Neon: o planejador do bairro (spec 026)', () => {
  beforeEach(() => limparVilas());

  it('é o mesmo para a mesma semente e tem o tamanho do mapa', () => {
    const a = planoDaVila(7, PLANO);
    limparVilas();
    const b = planoDaVila(7, PLANO);
    expect(a.ox).toBe(b.ox);
    expect(a.nascimento).toEqual(b.nascimento);
    expect(todos(a)).toEqual(todos(b));
    expect(a.plana.x1 - a.plana.x0 + 1).toBeGreaterThanOrEqual(LARGURA_VILA);
    expect(a.plana.z1 - a.plana.z0 + 1).toBeGreaterThanOrEqual(PROFUNDIDADE_VILA);
  });

  it('nenhum bloco sai da área plana nem da altura do mundo', () => {
    const p = planoDaVila(11, PLANO);
    for (const k of todos(p).keys()) {
      const [x, y, z] = k.split(',').map(Number);
      expect(distanciaDaVila(p, x, z)).toBe(0);
      expect(y).toBeGreaterThanOrEqual(1);
      expect(y).toBeLessThan(ALTURA);
    }
  });

  it('a criança nasce na pracinha, no chão livre, olhando para o palco', () => {
    const p = planoDaVila(3, PLANO);
    const { x, z, olhar } = p.nascimento;
    expect(zonaDaVila(p, Math.floor(x), Math.floor(z))).toBe('pracinha');
    const b = todos(p);
    for (const y of [p.h + 1, p.h + 2])
      expect(b.get(`${Math.floor(x)},${y},${Math.floor(z)}`) ?? Bloco.AR).toBe(Bloco.AR);
    // a frente (seno, cosseno) deixa a passarela e o mural dentro da vista (±35°)
    for (const [px, , pz] of [p.pontos.passarela, p.pontos.mural]) {
      let d = Math.atan2(px - x, pz - z) - olhar;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      expect(Math.abs(d)).toBeLessThan((35 * Math.PI) / 180);
    }
  });

  it('as distâncias da spec: mural perto, as zonas a até ~15 s andando', () => {
    const p = planoDaVila(5, PLANO);
    const { x, z } = p.nascimento;
    const dist = (q: readonly number[]) => Math.hypot(q[0] - x, q[2] - z);
    expect(dist(p.pontos.mural)).toBeLessThan(8);
    // a pé (~4 blocos por segundo), em linha reta mais as voltas: até ~15 s até cada zona
    const zonas = ['fliperama', 'rinque', 'festival', 'rua'] as const;
    for (const k of zonas) {
      const r = p.zonas[k];
      const cx = Math.max(r.x0, Math.min(r.x1, x));
      const cz = Math.max(r.z0, Math.min(r.z1, z));
      expect(Math.hypot(cx - x, cz - z), k).toBeLessThan(60);
    }
    // a ponta da passarela a até ~20 s
    expect(dist(p.pontos.passarela)).toBeLessThan(80);
  });

  it('o chão: avenida, rua da pracinha, faixas, pista quadriculada e piso do palco', () => {
    const p = planoDaVila(9, PLANO);
    const pisos = new Set<number>();
    for (let x = p.plana.x0; x <= p.plana.x1; x++)
      for (let z = p.plana.z0; z <= p.plana.z1; z++) pisos.add(pisoDaVila(p, x, z));
    for (const id of [
      Bloco.ASFALTO,
      Bloco.FAIXA_RUA,
      Bloco.FAIXA_PEDESTRE,
      Bloco.CALCADA,
      Bloco.TERRA_MUSGOSA,
      Bloco.PISTA_NEON,
      Bloco.CASCALHO,
    ])
      expect(pisos.has(id), obterBloco(id)?.nome).toBe(true);
    const blocos = new Set(todos(p).values());
    for (const id of [
      Bloco.PISO_PALCO,
      Bloco.CAIXA_SOM,
      Bloco.TRELICA,
      Bloco.ALAMBRADO,
      Bloco.GRADE_PLATEIA,
      Bloco.LETREIRO_NEON,
      Bloco.TELHA_COLONIAL,
      Bloco.POSTE,
      Bloco.ESCADINHA_PEDRA,
      Bloco.FENO,
    ])
      expect(blocos.has(id), obterBloco(id)?.nome).toBe(true);
  });

  it('o palco: as três caixas no piso, a escadinha sobe até o tablado', () => {
    const p = planoDaVila(13, PLANO);
    const b = todos(p);
    expect(p.pontos.caixas).toHaveLength(3);
    for (const [x, y, z] of p.pontos.caixas) {
      expect(b.get(`${x},${y},${z}`)).toBe(Bloco.CAIXA_SOM);
      expect(b.get(`${x},${y - 1},${z}`)).toBe(Bloco.PISO_PALCO);
    }
    // o pé da escadinha está livre e o primeiro degrau fica do lado
    const [ex, ey, ez] = p.pontos.escadinha.map(Math.floor);
    expect(b.get(`${ex},${ey},${ez}`) ?? Bloco.AR).toBe(Bloco.AR);
    expect(b.get(`${ex - 1},${ey},${ez}`)).toBe(Bloco.ESCADINHA_PEDRA);
    expect(b.get(`${ex - 3},${ey + 2},${ez}`)).toBe(Bloco.ESCADINHA_PEDRA);
    expect(b.get(`${ex - 4},${ey + 2},${ez}`)).toBe(Bloco.PISO_PALCO);
  });

  it('o rinque é pista quadriculada e os estojos ficam no chão livre, um por zona', () => {
    const p = planoDaVila(17, PLANO);
    const r = p.pontos.rinque;
    for (let x = r.x0; x <= r.x1; x++)
      for (let z = r.z0; z <= r.z1; z++) expect(pisoDaVila(p, x, z)).toBe(Bloco.PISTA_NEON);
    const b = todos(p);
    const zonas = p.pontos.estojos.map(([x, y, z]) => {
      expect(b.get(`${Math.floor(x)},${y},${Math.floor(z)}`) ?? Bloco.AR).toBe(Bloco.AR);
      return zonaDaVila(p, Math.floor(x), Math.floor(z));
    });
    expect(zonas).toEqual(['rua', 'rinque', 'festival']);
  });

  it('as lhamas: do cercadinho até a grade em até 25 blocos', () => {
    const p = planoDaVila(19, PLANO);
    const c = p.pontos.cercado;
    const g = p.pontos.plateia;
    const cx = (c.x0 + c.x1) / 2;
    const cz = (c.z0 + c.z1) / 2;
    const gx = Math.max(g.x0, Math.min(g.x1, cx));
    const gz = Math.max(g.z0, Math.min(g.z1, cz));
    expect(Math.hypot(gx - cx, gz - cz)).toBeLessThanOrEqual(25);
    expect(zonaDaVila(p, Math.floor(cx), Math.floor(cz))).toBe('festival');
  });

  it('o relevo em volta vira rampa e o chão do bairro é firme', () => {
    const p = planoDaVila(23, { altura: (x) => 70 + Math.floor(x / 40), nivelMar: 62 });
    const a = ajusteDaVila(p, p.plana.x0 + 3, p.plana.z0 + 3, 99);
    expect(a?.h).toBe(p.h);
    expect(a?.firme).toBe(true);
    const fora = ajusteDaVila(p, p.plana.x1 + 6, p.plana.z0 + 10, p.h + 30);
    expect(fora!.h - p.h).toBeLessThanOrEqual(2);
    expect(vilaNoChunk(p, Math.floor(p.ox / 16), Math.floor(p.oz / 16))).toBe(true);
    const [kx, , kz] = p.pontos.caixas[0];
    expect(blocosDaVilaNoChunk(p, Math.floor(kx / 16), Math.floor(kz / 16))).toBeGreaterThan(100);
  });
});

describe('Vila Neon na geração (chunk.ts)', () => {
  it('só com o tema: nasce na pracinha, o chunk tem o chão do bairro, e os outros temas não mudam', () => {
    const antes = estiloMundo();
    try {
      definirEstiloMundo(obterTema('rancho-alegre').mundo);
      expect(vilaDoMundo(42)).toBeNull();
      definirEstiloMundo(obterTema('vila-neon').mundo);
      const p = vilaDoMundo(42)!;
      expect(p).not.toBeNull();
      const n = encontrarNascimento(42);
      expect(n).toEqual({ x: p.nascimento.x, z: p.nascimento.z });
      expect(olharDoNascimento(42)).toBe(p.nascimento.olhar);
      const cx = Math.floor(n.x / TAM_X);
      const cz = Math.floor(n.z / TAM_Z);
      const blocos = gerarChunk(cx, cz, 42);
      const lx = Math.floor(n.x) - cx * TAM_X;
      const lz = Math.floor(n.z) - cz * TAM_Z;
      expect(alturaTerreno(Math.floor(n.x), Math.floor(n.z), 42)).toBe(p.h);
      expect(blocos[indice(lx, p.h, lz)]).toBe(pisoDaVila(p, Math.floor(n.x), Math.floor(n.z)));
      expect(blocos[indice(lx, p.h + 1, lz)]).toBe(Bloco.AR);
    } finally {
      definirEstiloMundo(antes);
    }
  });
});
