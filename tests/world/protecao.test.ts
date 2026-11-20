import { afterAll, describe, expect, it } from 'vitest';
import {
  ALTURA,
  definirEstiloMundo,
  ESTILO_PADRAO,
  estruturaDoChunk,
  gerarChunk,
  indice,
  TAM_X,
  TAM_Z,
  TERRENO_NATURAL,
} from '../../src/world/chunk';
import {
  frenteDaPorta,
  limparPovoados,
  noLote,
  planoDaRegiao,
  portaoDoCercado,
  type PlanoPovoado,
} from '../../src/world/povoado';
import { Bloco } from '../../src/world/blocks';
import { cronometrar, melhorDe } from '../tempo';
import {
  criarProtecaoMundo,
  MARGEM_CHAO,
  naoColoca,
  naoQuebra,
  nomeProtecao,
  Protecao,
  PROFUNDIDADE_CHAO,
  protecaoDoChunk,
  replantioDaLavoura,
  type ProtecaoMundo,
} from '../../src/world/protecao';
import '../../src/temas/todos';
import { obterTema, temasDisponiveis } from '../../src/temas';

const SEMENTE = 1337;

afterAll(() => {
  definirEstiloMundo(ESTILO_PADRAO);
  limparPovoados();
});

/** Blocos que o terreno natural nunca põe: achados num chunk de povoado, são da vila. */
const DA_VILA: ReadonlySet<number> = new Set([
  Bloco.TABUAS,
  Bloco.TABUAS_PINHO,
  Bloco.TIJOLOS,
  Bloco.TIJOLOS_PEDRA,
  Bloco.VIDRO,
  Bloco.LA_BRANCA,
  Bloco.LA_VERMELHA,
  Bloco.LA_AZUL,
  Bloco.CERCA,
  Bloco.PORTEIRA,
  Bloco.CAMA,
  Bloco.BAU,
  Bloco.MESA_TRABALHO,
  Bloco.FORNALHA,
  Bloco.FORNALHA_ACESA,
  Bloco.LANTERNA,
  Bloco.TOCHA,
  Bloco.FENO,
  Bloco.TERRA_ARADA,
  Bloco.PEDRA_LISA,
  Bloco.CASCALHO,
]);
const USAVEIS: ReadonlySet<number> = new Set([
  Bloco.CAMA,
  Bloco.BAU,
  Bloco.MESA_TRABALHO,
  Bloco.FORNALHA,
  Bloco.FORNALHA_ACESA,
  Bloco.PORTEIRA,
]);

function povoados(raio = 3): PlanoPovoado[] {
  const r: PlanoPovoado[] = [];
  for (let rx = -raio; rx <= raio; rx++)
    for (let rz = -raio; rz <= raio; rz++) {
      const p = planoDaRegiao(rx, rz, SEMENTE, TERRENO_NATURAL);
      if (p) r.push(p);
    }
  return r;
}

function chunksDo(p: PlanoPovoado): [number, number][] {
  const out: [number, number][] = [];
  for (let cx = Math.floor(p.minX / TAM_X); cx <= Math.floor(p.maxX / TAM_X); cx++)
    for (let cz = Math.floor(p.minZ / TAM_Z); cz <= Math.floor(p.maxZ / TAM_Z); cz++)
      out.push([cx, cz]);
  return out;
}

/** Confere o povoado inteiro contra a geração de verdade. */
function conferirPovoado(p: PlanoPovoado, prot: ProtecaoMundo): void {
  const nome = (x: number, y: number, z: number) => nomeProtecao(prot.em(x, y, z));
  for (const [cx, cz] of chunksDo(p)) {
    const g = gerarChunk(cx, cz, SEMENTE);
    for (let y = 1; y < ALTURA; y++)
      for (let z = 0; z < TAM_Z; z++)
        for (let x = 0; x < TAM_X; x++) {
          const b = g[indice(x, y, z)];
          if (!DA_VILA.has(b)) continue;
          const wx = cx * TAM_X + x;
          const wz = cz * TAM_Z + z;
          const v = prot.em(wx, y, wz);
          // todo bloco da vila (e o chão de pedra lisa e cascalho da praça e dos caminhos)
          expect(naoQuebra(v), `${p.id} ${wx},${y},${wz} bloco ${b}: ${nome(wx, y, wz)}`).toBe(
            true,
          );
          if (USAVEIS.has(b)) expect(v).toBe(Protecao.USAVEL);
        }
  }
  for (const l of p.lotes) {
    // chão embaixo de cada lote
    for (let k = 1; k <= PROFUNDIDADE_CHAO; k++)
      expect(prot.em(l.x0 + 3, l.h - k, l.z0 + 3)).toBe(Protecao.CHAO);
    expect(prot.em(l.x0 + 3, l.h - PROFUNDIDADE_CHAO - 1, l.z0 + 3)).toBe(Protecao.LIVRE);
    // a frente da porta e o vão da porta ficam livres
    const [fx, fz] = frenteDaPorta(l);
    expect(nome(fx, l.h + 1, fz), `${p.id} frente`).toBe('passagem');
    expect(nome(fx, l.h + 2, fz)).toBe('passagem');
    if (l.uso === 'curral' || l.uso === 'galinheiro') {
      const { portao, fora } = portaoDoCercado(l, p.cz);
      expect(nome(portao[0], l.h + 1, portao[1])).toBe('usavel');
      expect(nome(fora[0], l.h + 1, fora[1])).toBe('passagem');
      const dentro = [2 * portao[0] - fora[0], 2 * portao[1] - fora[1]];
      expect(nome(dentro[0], l.h + 1, dentro[1])).toBe('passagem');
    } else if (l.uso === 'lavoura') {
      const [x, z] = noLote(l, 1, 2);
      expect(nome(x, l.h + 1, z)).toBe('lavoura');
      expect(nome(x, l.h, z)).toBe('estrutura');
      const [tx, tz] = noLote(l, 3, 3);
      expect(nome(tx, l.h + 1, tz)).toBe('passagem');
    } else {
      for (let f = 0; f <= 2; f++) {
        const [x, z] = noLote(l, 3, f);
        expect(nome(x, l.h + 1, z), `${p.id} ${l.uso ?? l.tipo} porta f=${f}`).toBe('passagem');
      }
    }
  }
  // caminhos dos moradores
  for (const [c, h] of p.caminho) {
    const x = Math.floor(c / 65536) - 32768;
    const z = (c % 65536) - 32768;
    expect(naoColoca(prot.em(x, h + 1, z)), `caminho ${x},${z}`).toBe(true);
  }
  // a margem de chão acaba: bem fora do piso, a rampa é terreno livre
  const w = p.maxX - p.minX + 1;
  let livres = 0;
  for (let i = 0; i < p.dist.length; i++) {
    if (p.dist[i] !== MARGEM_CHAO + 1) continue;
    const x = p.minX + (i % w);
    const z = p.minZ + Math.floor(i / w);
    for (let y = 1; y < ALTURA; y++) expect(prot.em(x, y, z), `${x},${y},${z}`).toBe(0);
    if (++livres > 40) break;
  }
  expect(livres).toBeGreaterThan(0);
}

const TEMAS = temasDisponiveis();

describe('proteção do mundo: povoados e sítios em todo tema', () => {
  // a Cidade Grande (spec 014) e a Vila Neon (spec 026) não têm povoado de região: a proteção
  // delas está em cidade.test e vilaNeon.test
  it.each(
    TEMAS.filter((id) => !['cidade', 'bairro'].includes(obterTema(id).mundo.povoado?.planta ?? '')),
  )('%s: blocos, chão, usáveis e passagens', (id) => {
    definirEstiloMundo(obterTema(id).mundo);
    limparPovoados();
    const ps = povoados(2);
    expect(ps.length, id).toBeGreaterThan(0);
    const prot = criarProtecaoMundo(SEMENTE);
    for (const p of ps.slice(0, 2)) conferirPovoado(p, prot);
  });

  it('o sítio do Rancho protege o baú do celeiro e a lavoura replanta o mesmo pé', () => {
    definirEstiloMundo(obterTema('rancho-alegre').mundo);
    limparPovoados();
    const [p] = povoados(2);
    const prot = criarProtecaoMundo(SEMENTE);
    const [x, y, z] = p.bauCeleiro!;
    expect(prot.em(x, y, z)).toBe(Protecao.USAVEL);
    expect(replantioDaLavoura(Bloco.MILHO_3)).toBe(Bloco.MILHO_0);
    expect(replantioDaLavoura(Bloco.TRIGO_2)).toBe(Bloco.TRIGO_0);
    expect(replantioDaLavoura(Bloco.TABUAS)).toBeNull();
  });
});

/** Chunks com ruína (ou estrutura do tema) perto da origem. */
function ruinas(n = 4): { cx: number; cz: number; h: number }[] {
  const out: { cx: number; cz: number; h: number }[] = [];
  for (let cx = -40; cx <= 40 && out.length < n; cx++)
    for (let cz = -40; cz <= 40 && out.length < n; cz++) {
      const e = estruturaDoChunk(cx, cz, SEMENTE);
      if (e?.tipo === 'ruina') out.push({ cx, cz, h: e.h });
    }
  return out;
}

describe('proteção do mundo: ruínas e estruturas raras', () => {
  it.each(TEMAS)('%s: baú, piso, paredes, chão e portas', (id) => {
    definirEstiloMundo(obterTema(id).mundo);
    limparPovoados();
    const rs = ruinas();
    expect(rs.length, id).toBeGreaterThan(0);
    const prot = criarProtecaoMundo(SEMENTE);
    const forma = obterTema(id).mundo.estrutura;
    for (const { cx, cz, h } of rs) {
      const x0 = cx * TAM_X;
      const z0 = cz * TAM_Z;
      const g = gerarChunk(cx, cz, SEMENTE);
      expect(g[indice(8, h + 1, 8)]).toBe(Bloco.BAU);
      expect(prot.em(x0 + 8, h + 1, z0 + 8)).toBe(Protecao.USAVEL);
      // piso e o que a geração ergueu em cima dele
      for (let dz = -3; dz <= 3; dz++)
        for (let dx = -3; dx <= 3; dx++) {
          const x = 8 + dx;
          const z = 8 + dz;
          expect(prot.em(x0 + x, h, z0 + z)).toBe(Protecao.ESTRUTURA);
          for (let k = 1; k <= PROFUNDIDADE_CHAO; k++)
            expect(naoQuebra(prot.em(x0 + x, h - k, z0 + z))).toBe(true);
          for (let y = h + 1; y < h + 12; y++) {
            const b = g[indice(x, y, z)];
            if (b === Bloco.AR || b === Bloco.COGUMELO_BRILHANTE || b === Bloco.GRAMA_ALTA)
              continue;
            // acima do vão que a geração limpa (h+4) só vale o que é certo de construção
            // (a copa de uma árvore vizinha pode passar por cima: é natural)
            if (y > h + 4 && !DA_VILA.has(b)) continue;
            if (b >= Bloco.TRIGO_0 && b <= Bloco.ABOBOREIRA_3) {
              expect(prot.em(x0 + x, y, z0 + z)).toBe(Protecao.LAVOURA);
              continue;
            }
            expect(naoQuebra(prot.em(x0 + x, y, z0 + z)), `${id} ${x},${y},${z} ${b}`).toBe(true);
          }
        }
      // os cantos do chunk ficam fora da ruína e da margem
      expect(prot.em(x0, h + 1, z0)).toBe(Protecao.LIVRE);
      expect(prot.em(x0 + 15, h, z0 + 15)).toBe(Protecao.LIVRE);
      if (forma === 'cupula' || forma === 'casinha')
        expect(prot.em(x0 + 8, h + 1, z0 + 10)).toBe(Protecao.PASSAGEM);
    }
  });
});

describe('proteção do mundo: terreno natural e determinismo', () => {
  it('chunk sem povoado nem ruína é todo livre', () => {
    definirEstiloMundo(ESTILO_PADRAO);
    limparPovoados();
    const prot = criarProtecaoMundo(SEMENTE);
    let achados = 0;
    for (let cx = 0; cx < 40 && achados < 3; cx++) {
      if (estruturaDoChunk(cx, 7, SEMENTE)) continue;
      achados++;
      expect(prot.doChunk(cx, 7)).toBeNull();
      for (let y = 0; y < ALTURA; y += 3) expect(prot.em(cx * 16 + 5, y, 7 * 16 + 9)).toBe(0);
    }
    expect(achados).toBe(3);
  });

  it('mesma semente e estilo dão a mesma máscara (instâncias novas, planos refeitos)', () => {
    for (const id of ['rancho-alegre', 'doce-reino']) {
      definirEstiloMundo(obterTema(id).mundo);
      limparPovoados();
      const [p] = povoados(2);
      const a = chunksDo(p).map(([cx, cz]) => protecaoDoChunk(cx, cz, SEMENTE));
      limparPovoados();
      const prot = criarProtecaoMundo(SEMENTE);
      const b = chunksDo(p).map(([cx, cz]) => prot.doChunk(cx, cz));
      expect(b).toEqual(a);
      // e muda com a semente
      expect(chunksDo(p).map(([cx, cz]) => protecaoDoChunk(cx, cz, SEMENTE + 1))).not.toEqual(a);
    }
  });

  it('trocar o estilo do mundo esquece a memória sozinho', () => {
    definirEstiloMundo(obterTema('rancho-alegre').mundo);
    limparPovoados();
    const prot = criarProtecaoMundo(SEMENTE);
    const [p] = povoados(2);
    const [cx, cz] = chunksDo(p)[Math.floor(chunksDo(p).length / 2)];
    const sitio = prot.doChunk(cx, cz);
    definirEstiloMundo(obterTema('doce-reino').mundo);
    expect(prot.doChunk(cx, cz)).toEqual(protecaoDoChunk(cx, cz, SEMENTE));
    definirEstiloMundo(obterTema('rancho-alegre').mundo);
    expect(prot.doChunk(cx, cz)).toEqual(sitio);
  });
});

describe('proteção do mundo: desempenho', () => {
  it('consulta amortizada bem abaixo de 0,1 ms (mirar e minerar perto do sítio)', () => {
    definirEstiloMundo(obterTema('rancho-alegre').mundo);
    limparPovoados();
    const [p] = povoados(2);
    // planos já feitos (o jogo os faz ao gerar o chunk); a máscara não
    // spec 034 (T14): cada medida é a melhor de 3 rodadas (as do zero com a proteção nova): a
    // máquina ocupada só soma tempo, e uma conta a mais pesa nas três
    const cs = chunksDo(p);
    let prot = criarProtecaoMundo(SEMENTE);
    const frio =
      melhorDe(3, () => {
        prot = criarProtecaoMundo(SEMENTE);
        return cronometrar(() => {
          for (const [cx, cz] of cs) prot.doChunk(cx, cz);
        });
      }) / cs.length;
    // mira andando pelo sítio: células vizinhas, chunk mudando de vez em quando
    let s = 1;
    const rnd = () => (s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
    const N = 200_000;
    let soma = 0;
    const quente =
      melhorDe(3, () =>
        cronometrar(() => {
          for (let i = 0; i < N; i++) {
            const x = p.minX + Math.floor(rnd() * (p.maxX - p.minX + 1));
            const z = p.minZ + Math.floor(rnd() * (p.maxZ - p.minZ + 1));
            soma += prot.em(x, p.h - 4 + Math.floor(rnd() * 16), z);
          }
        }),
      ) / N;
    // do zero (máscara feita na primeira mira de cada chunk), espalhado pelos chunks
    const amortizado =
      melhorDe(3, () => {
        const prot2 = criarProtecaoMundo(SEMENTE);
        return cronometrar(() => {
          for (let i = 0; i < 20_000; i++) {
            const x = p.minX + Math.floor(rnd() * (p.maxX - p.minX + 1));
            const z = p.minZ + Math.floor(rnd() * (p.maxZ - p.minZ + 1));
            prot2.em(x, p.h + 1, z);
          }
        });
      }) / 20_000;
    console.log(
      `[protecao] ${cs.length} chunks: máscara ${frio.toFixed(3)} ms/chunk, consulta ${(quente * 1e3).toFixed(3)} µs, amortizada do zero ${(amortizado * 1e3).toFixed(3)} µs (soma ${soma})`,
    );
    expect(quente).toBeLessThan(0.01);
    expect(amortizado).toBeLessThan(0.1);
    expect(frio).toBeLessThan(20);
  });
});
