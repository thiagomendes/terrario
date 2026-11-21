import { beforeEach, describe, expect, it } from 'vitest';
import {
  ajusteDoBaile,
  baileNoChunk,
  blocosDoBaileNoChunk,
  construirBaile,
  limparBailes,
  pisoDoBaile,
  planoDoBaile,
  zonaDoBaile,
  LARGURA_BAILE,
  MARGEM_BAILE,
  PROFUNDIDADE_BAILE,
  type PlanoBaile,
} from '../../src/world/noiteFantasias';
import { Bloco, obterBloco } from '../../src/world/blocks';
import { BLOCOS_SO_DA_VILA, EXCLUSIVOS_CIDADE } from '../../src/jogo/exclusivos';
import {
  ALTURA,
  alturaTerreno,
  baileDoMundo,
  biomaEm,
  definirEstiloMundo,
  encontrarNascimento,
  estiloMundo,
  estruturaDoChunk,
  gerarChunk,
  indice,
  olharDoNascimento,
  TAM_X,
  TAM_Z,
  TERRENO_NATURAL,
} from '../../src/world/chunk';
import { planoDaRegiao, REGIAO_POVOADO } from '../../src/world/povoado';
import { naoQuebra, protecaoDoMundo } from '../../src/world/protecao';
import { obterTema } from '../../src/temas';
import '../../src/temas/todos';

/**
 * Spec 027 (T03): o planejador da Noite das Fantasias, puro. Determinismo, nada fora do lugar,
 * toda entrada de lugar a até 60 blocos de caminho da praça (pelo caminho de pedrinha lilás, não
 * em linha reta) e a criança nascendo de frente para a abóbora gigante.
 */
const PLANO = { altura: () => 70, nivelMar: 62 };
/** Um relevo de morros (para conferir o lugar em terra firme e a rampa em volta). */
const MORROS = {
  altura: (x: number, z: number) => 66 + Math.round(10 * Math.sin(x / 37) * Math.cos(z / 29)),
  nivelMar: 62,
};

/** Todos os blocos da vila (mundo), de todos os chunks da área plana; a última escrita vale. */
function todos(p: PlanoBaile): Map<string, number> {
  const m = new Map<string, number>();
  for (let cx = Math.floor(p.plana.x0 / 16); cx <= Math.floor(p.plana.x1 / 16); cx++)
    for (let cz = Math.floor(p.plana.z0 / 16); cz <= Math.floor(p.plana.z1 / 16); cz++)
      construirBaile(p, cx, cz, (x, y, z, id) => m.set(`${x},${y},${z}`, id));
  return m;
}

/** Caminho a pé (4 vizinhos) pela pedrinha lilás, a partir da praça: a distância de cada célula. */
function distanciasPeloCaminho(p: PlanoBaile): Map<string, number> {
  const d = new Map<string, number>();
  const fila: [number, number][] = [];
  const praca = p.zonas.praca;
  for (let x = praca.x0; x <= praca.x1; x++)
    for (let z = praca.z0; z <= praca.z1; z++)
      if (pisoDoBaile(p, x, z) === Bloco.PEDRINHA_LILAS) {
        d.set(`${x},${z}`, 0);
        fila.push([x, z]);
      }
  for (let i = 0; i < fila.length; i++) {
    const [x, z] = fila[i];
    const n = d.get(`${x},${z}`)!;
    for (const [dx, dz] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const k = `${x + dx},${z + dz}`;
      if (d.has(k) || pisoDoBaile(p, x + dx, z + dz) !== Bloco.PEDRINHA_LILAS) continue;
      d.set(k, n + 1);
      fila.push([x + dx, z + dz]);
    }
  }
  return d;
}

describe('Noite das Fantasias: o planejador da vila da festa (spec 027)', () => {
  beforeEach(() => limparBailes());

  it('é o mesmo para a mesma semente, tem o tamanho do mapa e não depende de memória', () => {
    const a = planoDoBaile(1337, PLANO);
    limparBailes();
    const b = planoDoBaile(1337, PLANO);
    expect(JSON.stringify(b)).toEqual(JSON.stringify(a));
    expect([...todos(b).entries()]).toEqual([...todos(a).entries()]);
    expect(a.plana.x1 - a.plana.x0 + 1).toBe(LARGURA_BAILE + 2 * MARGEM_BAILE);
    expect(a.plana.z1 - a.plana.z0 + 1).toBe(PROFUNDIDADE_BAILE + 2 * MARGEM_BAILE);
    // outra semente: outro lugar sorteado na volta (o mesmo desenho do mapa)
    const c = planoDoBaile(42, MORROS);
    expect(c.pecas.length).toBe(a.pecas.length);
  });

  it('nada fora do lugar: todo bloco e toda peça na área plana, na altura do mundo e do tema', () => {
    for (const [semente, relevo] of [
      [1337, PLANO],
      [42, MORROS],
      [7, MORROS],
    ] as const) {
      const p = planoDoBaile(semente, relevo);
      const blocos = todos(p);
      expect(blocos.size).toBeGreaterThan(3000);
      const daCidadeOuVila = new Set<number>([...EXCLUSIVOS_CIDADE.blocos, ...BLOCOS_SO_DA_VILA]);
      for (const [k, id] of blocos) {
        const [x, y, z] = k.split(',').map(Number);
        expect(x >= p.plana.x0 && x <= p.plana.x1 && z >= p.plana.z0 && z <= p.plana.z1, k).toBe(true);
        expect(y > 0 && y < ALTURA, k).toBe(true);
        expect(obterBloco(id), `${k}: ${id}`).toBeDefined();
        // nunca os blocos de rua da Cidade e da Vila (este mundo tem os dele)
        expect(daCidadeOuVila.has(id), `${k}: ${id}`).toBe(false);
      }
      for (const q of p.pecas) {
        expect(q.x >= p.plana.x0 && q.x <= p.plana.x1 + 1, q.tipo).toBe(true);
        expect(q.z >= p.plana.z0 && q.z <= p.plana.z1 + 1, q.tipo).toBe(true);
        expect(q.y).toBeGreaterThan(p.h);
        if (q.ate) {
          expect(q.ate[0] >= p.plana.x0 && q.ate[0] <= p.plana.x1 + 1).toBe(true);
          expect(q.ate[2] >= p.plana.z0 && q.ate[2] <= p.plana.z1 + 1).toBe(true);
        }
      }
      // os chunks que a vila alcança têm blocos, e os de fora não
      let comBlocos = 0;
      for (let cx = Math.floor(p.plana.x0 / 16) - 1; cx <= Math.floor(p.plana.x1 / 16) + 1; cx++)
        for (let cz = Math.floor(p.plana.z0 / 16) - 1; cz <= Math.floor(p.plana.z1 / 16) + 1; cz++)
          if (blocosDoBaileNoChunk(p, cx, cz) > 0) {
            comBlocos++;
            expect(baileNoChunk(p, cx, cz)).toBe(true);
          }
      expect(comBlocos).toBeGreaterThan(40);
    }
  });

  it('a criança nasce na praça, no chão livre, de frente para a abóbora gigante', () => {
    const p = planoDoBaile(1337, PLANO);
    const { x, z, olhar } = p.nascimento;
    expect(zonaDoBaile(p, Math.floor(x), Math.floor(z))).toBe('praca');
    expect(pisoDoBaile(p, Math.floor(x), Math.floor(z))).toBe(Bloco.PEDRINHA_LILAS);
    const blocos = todos(p);
    for (const y of [p.h + 1, p.h + 2])
      expect(blocos.get(`${Math.floor(x)},${y},${Math.floor(z)}`) ?? Bloco.AR).toBe(Bloco.AR);
    // o olhar aponta para o meio da abóbora (a menos de 3°) e ela está a 12 a 18 blocos
    const a = p.pontos.abobora;
    const rumo = Math.atan2(a.x - x, a.z - z);
    expect(Math.abs(Math.atan2(Math.sin(rumo - olhar), Math.cos(rumo - olhar)))).toBeLessThan(0.05);
    const dist = Math.hypot(a.x - x, a.z - z);
    expect(dist).toBeGreaterThan(12);
    expect(dist).toBeLessThan(18);
    // e uma barraca do lado, a menos de 50° do olhar (à vista ao nascer)
    const desvio = Math.min(
      ...p.pontos.barracas.map((b) => {
        const r = Math.atan2(b.x - x, b.z - z);
        return Math.abs(Math.atan2(Math.sin(r - olhar), Math.cos(r - olhar)));
      }),
    );
    expect(desvio).toBeLessThan((50 * Math.PI) / 180);
  });

  it('toda entrada de lugar fica a até 60 blocos de caminho da praça (pela pedrinha lilás)', () => {
    for (const semente of [1337, 42, 7]) {
      const p = planoDoBaile(semente, semente === 1337 ? PLANO : MORROS);
      const d = distanciasPeloCaminho(p);
      const medidas: Record<string, number> = {};
      for (const [lugar, [x, z]] of Object.entries(p.entradas)) {
        // a entrada é caminho (pedrinha) ligado à praça
        expect(pisoDoBaile(p, x, z), lugar).toBe(Bloco.PEDRINHA_LILAS);
        const n = d.get(`${x},${z}`);
        expect(n, `${lugar} fora do caminho`).toBeDefined();
        medidas[lugar] = n!;
        expect(n!, lugar).toBeLessThanOrEqual(60);
      }
      // as portas das casinhas também (n1): da praça, pelo caminho, até a varandinha da porta
      // (a pedrinha que chega a até 4 blocos dela, mais esses passos)
      for (const porta of p.pontos.portas) {
        const px = Math.floor(porta.x);
        const pz = Math.floor(porta.z);
        let melhor = Infinity;
        for (let dx = -4; dx <= 4; dx++)
          for (let dz = -4; dz <= 4; dz++) {
            const n = d.get(`${px + dx},${pz + dz}`);
            if (n !== undefined) melhor = Math.min(melhor, n + Math.abs(dx) + Math.abs(dz));
          }
        expect(melhor, `porta ${px},${pz}`).toBeLessThanOrEqual(60);
      }
      if (semente === 1337) console.log(`CAMINHO ${JSON.stringify(medidas)}`);
    }
  });

  it('os lugares: a rua com cinco casinhas e a da Vovó no fim, a loja, o castelinho, a horta e o bosque', () => {
    const p = planoDoBaile(1337, PLANO);
    const pt = p.pontos;
    expect(pt.portas).toHaveLength(6);
    expect(pt.portas.filter((q) => q.vovo)).toHaveLength(1);
    // a da Vovó é a mais longe da praça, no fim da rua
    const vovo = pt.portas.find((q) => q.vovo)!;
    for (const q of pt.portas) expect(vovo.z).toBeLessThanOrEqual(q.z);
    expect(zonaDoBaile(p, Math.floor(vovo.x), Math.floor(vovo.z) - 1)).toBe('vovo');
    // cinco lanternas no caminho do bosque (n2)
    expect(pt.lanternas).toHaveLength(5);
    for (const [x, , z] of pt.lanternas) expect(zonaDoBaile(p, Math.floor(x), Math.floor(z))).toBe('bosque');
    // o castelinho tem a torre alta (vê-se da praça)
    expect(pt.torre[1] - p.h).toBeGreaterThanOrEqual(18);
    // a varanda da Vovó com o caldeirão (o bloco 127) na frente
    const blocos = todos(p);
    const [cx, , cz] = pt.caldeirao;
    expect(blocos.get(`${Math.floor(cx)},${p.h + 1},${Math.floor(cz)}`)).toBe(Bloco.CALDEIRAO);
    // a horta tem a parreirinha de uva, as aboboreiras e o canteiro marcado
    const naHorta = (id: number) =>
      [...blocos.entries()].some(([k, v]) => {
        const [x, , z] = k.split(',').map(Number);
        return v === id && zonaDoBaile(p, x, z) === 'horta';
      });
    expect(naHorta(Bloco.ARBUSTO_FRUTINHAS)).toBe(true);
    expect(naHorta(Bloco.ABOBOREIRA_3)).toBe(true);
    expect(p.pecas.some((q) => q.tipo === 'canteiro-marcado')).toBe(true);
    // a abóbora gigante, as duas barracas, o palco e as portas fechadas da loja e do castelinho
    expect(p.pecas.filter((q) => q.tipo === 'abobora-gigante')).toHaveLength(1);
    expect(p.pecas.filter((q) => q.tipo === 'barraca')).toHaveLength(2);
    expect(p.pecas.filter((q) => q.tipo === 'porta-loja')).toHaveLength(1);
    expect(p.pecas.filter((q) => q.tipo === 'porta-castelo')).toHaveLength(1);
    // os blocos da festa aparecem todos (menos a teia, que é peça nas quinas)
    const usados = new Set(blocos.values());
    for (const id of [
      Bloco.TELHA_ROXA,
      Bloco.TIJOLO_TORTO,
      Bloco.FOLHAS_LARANJA,
      Bloco.TABUA_MUSGO,
      Bloco.TABUA_ROXA,
      Bloco.JANELA_TORTA,
      Bloco.JANELA_TORTA_ACESA,
      Bloco.TOLDINHO,
      Bloco.CALDEIRAO,
    ])
      expect(usados.has(id), String(id)).toBe(true);
    // e o chão de pedrinha lilás é o da praça e de todos os caminhos
    const praca = p.zonas.praca;
    let pedrinha = 0;
    for (let x = praca.x0; x <= praca.x1; x++)
      for (let z = praca.z0; z <= praca.z1; z++)
        if (pisoDoBaile(p, x, z) === Bloco.PEDRINHA_LILAS) pedrinha++;
    expect(pedrinha / ((praca.x1 - praca.x0 + 1) * (praca.z1 - praca.z0 + 1))).toBeGreaterThan(0.85);
  });

  it('o relevo em volta: morrinhos baixos, a rampa firme e nada alto a menos de 150 blocos', () => {
    const p = planoDoBaile(42, MORROS);
    // dentro: a altura da vila (o laguinho desce 2)
    const meio = ajusteDoBaile(p, p.nascimento.x | 0, p.nascimento.z | 0, 90)!;
    expect(meio.h).toBe(p.h);
    expect(meio.ocupada).toBe(1);
    // na beira: sobe devagar (no máximo 1 bloco a cada 4 colunas)
    for (let d = 1; d <= 24; d++) {
      const a = ajusteDoBaile(p, p.plana.x1 + d, p.nascimento.z | 0, p.h + 40)!;
      expect(Math.abs(a.h - p.h)).toBeLessThanOrEqual(Math.floor(d / 4));
      expect(a.firme).toBe(true);
    }
    // um morro alto de fora fica achatado até a visão máxima (8 pedaços, 128 blocos)
    for (const d of [40, 80, 128]) {
      const a = ajusteDoBaile(p, p.plana.x1 + d, p.nascimento.z | 0, p.h + 50)!;
      expect(a.h - p.h, `a ${d} blocos`).toBeLessThan(0.5 * 50);
    }
  });
});

/**
 * Spec 027 (T04): a vila da festa na geração (chunk.ts), na proteção e no estilo: só com o tema,
 * a criança nasce na praça; o chunk tem o chão da vila; nenhum povoado de região nem estrutura
 * rara por perto; em volta, até além da visão máxima, só o bosque e o campinho do tema.
 */
describe('Noite das Fantasias na geração (chunk.ts e proteção)', () => {
  const BAILE = obterTema('noite-das-fantasias').mundo;

  it('só com o tema: nasce na praça, de frente para a abóbora, e o chunk tem o chão da vila', () => {
    const antes = estiloMundo();
    try {
      definirEstiloMundo(obterTema('vila-neon').mundo);
      expect(baileDoMundo(42)).toBeNull();
      definirEstiloMundo(BAILE);
      for (const semente of [1337, 42, 7]) {
        const p = baileDoMundo(semente)!;
        expect(p).not.toBeNull();
        const n = encontrarNascimento(semente);
        expect(n).toEqual({ x: p.nascimento.x, z: p.nascimento.z });
        expect(olharDoNascimento(semente)).toBe(p.nascimento.olhar);
        const cx = Math.floor(n.x / TAM_X);
        const cz = Math.floor(n.z / TAM_Z);
        const blocos = gerarChunk(cx, cz, semente);
        const lx = Math.floor(n.x) - cx * TAM_X;
        const lz = Math.floor(n.z) - cz * TAM_Z;
        expect(alturaTerreno(Math.floor(n.x), Math.floor(n.z), semente)).toBe(p.h);
        expect(blocos[indice(lx, p.h, lz)]).toBe(Bloco.PEDRINHA_LILAS);
        expect(blocos[indice(lx, p.h + 1, lz)]).toBe(Bloco.AR);
        expect(blocos[indice(lx, p.h + 2, lz)]).toBe(Bloco.AR);
        // o chunk da abóbora gigante é da vila (a estrutura dele é a festa)
        const a = p.pontos.abobora;
        expect(estruturaDoChunk(Math.floor(a.x / 16), Math.floor(a.z / 16), semente)?.tipo).toBe('baile');
      }
    } finally {
      definirEstiloMundo(antes);
    }
  });

  it('nenhum povoado de região, e em volta só o bosque e o campinho até além da visão máxima', () => {
    const antes = estiloMundo();
    try {
      definirEstiloMundo(BAILE);
      for (const semente of [1337, 42, 7]) {
        const p = baileDoMundo(semente)!;
        const rx = Math.floor(p.nascimento.x / REGIAO_POVOADO);
        const rz = Math.floor(p.nascimento.z / REGIAO_POVOADO);
        for (let i = rx - 3; i <= rx + 3; i++)
          for (let k = rz - 3; k <= rz + 3; k++)
            expect(planoDaRegiao(i, k, semente, TERRENO_NATURAL)).toBeNull();
        // da beira da vila até 140 blocos para fora (a visão máxima, 8 pedaços), nos quatro rumos
        const vistos = new Set<string>();
        for (let d = 0; d <= 140; d += 7)
          for (let t = -60; t <= 60; t += 20) {
            const cxm = (p.plana.x0 + p.plana.x1) >> 1;
            const czm = (p.plana.z0 + p.plana.z1) >> 1;
            for (const [x, z] of [
              [p.plana.x1 + d, czm + t],
              [p.plana.x0 - d, czm + t],
              [cxm + t, p.plana.z1 + d],
              [cxm + t, p.plana.z0 - d],
            ])
              vistos.add(biomaEm(x, z, semente));
          }
        for (const b of vistos) expect(['floresta', 'campos', 'oceano'], b).toContain(b);
      }
    } finally {
      definirEstiloMundo(antes);
    }
  });

  it('a vila é do mundo: o chão da praça e as paredes das casinhas não se quebram', () => {
    const antes = estiloMundo();
    try {
      definirEstiloMundo(BAILE);
      const p = baileDoMundo(1337)!;
      const n = p.nascimento;
      expect(naoQuebra(protecaoDoMundo(Math.floor(n.x), p.h, Math.floor(n.z), 1337))).toBe(true);
      const porta = p.pontos.portas[0];
      // a parede do lado da porta (a célula atrás da frente da porta, um bloco acima do chão)
      const d = [
        [0, 1],
        [1, 0],
        [0, -1],
        [-1, 0],
      ][porta.dir];
      const px = Math.floor(porta.x) - d[0];
      const pz = Math.floor(porta.z) - d[1];
      const lado = [
        [1, 0],
        [0, 1],
      ][porta.dir & 1];
      expect(
        naoQuebra(protecaoDoMundo(px + lado[0] * 2, p.h + 1, pz + lado[1] * 2, 1337)),
      ).toBe(true);
    } finally {
      definirEstiloMundo(antes);
    }
  });
});
