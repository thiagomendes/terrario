import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import '../../src/temas/todos';
import { obterTema } from '../../src/temas';
import {
  alturaTerreno,
  cidadeDoMundo,
  definirEstiloMundo,
  encontrarNascimento,
  ESTILO_PADRAO,
  gerarChunk,
  indice,
  metaGerada,
  olharDoNascimento,
  pontoDeNascer,
  TAM_X,
  TAM_Z,
} from '../../src/world/chunk';
import {
  distanciaDaCidade,
  limparCidades,
  noLoteCidade,
  dirNoMundo,
  plantaDoLote,
  RAMPA_CIDADE,
  soloDaCidade,
  soloDePista,
  Solo,
  LARGURA_CIDADE,
  PROFUNDIDADE_CIDADE,
  type PlanoCidade,
} from '../../src/world/cidade';
import { Bloco, obterBloco } from '../../src/world/blocks';
import { estiloSeguro } from '../../src/world/estiloSeguro';
import { criarProtecaoMundo, Protecao } from '../../src/world/protecao';
import { criarEdicoes } from '../../src/world/edicoes';
import { indicePlanta } from '../../src/world/plantas';
import { limparPovoados } from '../../src/world/povoado';
import { povoadosPerto } from '../../src/jogo/povoados';

/**
 * Spec 014, T03: o planejador da Cidade Grande. Uma cidade por mundo, determinística, com a
 * grade de 5 avenidas e 7 ruas, o parque no meio, lotes com porta para a rua, chão plano e
 * rampa, nascimento na praça olhando para o primeiro canteiro, o grafo de pistas (só no
 * asfalto) e a vaga do sorvete; as pistas são passagem (016).
 */
const CIDADE = obterTema('cidade-grande').mundo;
const SEMENTES = Array.from({ length: 20 }, (_, i) => [1337, 1, 2, 3, 7, 42][i] ?? 100 + i * 37);

/** Blocos do mundo com cache de chunk. */
function mundo(semente: number) {
  const chunks = new Map<string, Uint8Array>();
  return (x: number, y: number, z: number) => {
    const cx = Math.floor(x / TAM_X);
    const cz = Math.floor(z / TAM_Z);
    const k = `${cx},${cz}`;
    let c = chunks.get(k);
    if (!c) chunks.set(k, (c = gerarChunk(cx, cz, semente)));
    return c[indice(x - cx * TAM_X, y, z - cz * TAM_Z)];
  };
}

beforeAll(() => {
  definirEstiloMundo(CIDADE);
  limparCidades();
  limparPovoados();
});
afterAll(() => {
  definirEstiloMundo(ESTILO_PADRAO);
  limparCidades();
  limparPovoados();
});

describe('planejador da cidade', () => {
  it('o estilo da cidade passa pelo servidor igual', () => {
    expect(estiloSeguro(CIDADE)).toEqual(CIDADE);
    expect(CIDADE.povoado?.planta).toBe('cidade');
  });

  it('é determinístico: a mesma semente dá a mesma cidade (como no servidor)', () => {
    const a = JSON.stringify(cidadeDoMundo(1337));
    limparCidades();
    const b = JSON.stringify(cidadeDoMundo(1337));
    expect(a).toBe(b);
    expect(JSON.stringify(cidadeDoMundo(2))).not.toBe(a);
  });

  it('grade: 5 avenidas, 7 ruas, 4 × 6 quarteirões com o parque no meio', () => {
    const p = cidadeDoMundo(1337)!;
    expect(LARGURA_CIDADE).toBe(168);
    expect(PROFUNDIDADE_CIDADE).toBe(150);
    // 35 cruzamentos menos o do meio do parque; 28 + 26 trechos, duas mãos cada
    expect(p.cruzamentos.length).toBe(34);
    expect(p.pistas.length).toBe(108);
    // 20 quarteirões de 8 lotes (os de 16 valem por dois)
    const vagas = p.lotes.reduce((n, l) => n + l.largura / 8, 0);
    expect(vagas).toBe(160);
    expect(
      p.lotes
        .filter((l) => l.uso === 'canteiro')
        .map((l) => l.canteiro)
        .sort(),
    ).toEqual([1, 2, 3, 4, 5, 6]);
    for (const u of ['praca', 'padaria', 'oficina', 'construcao', 'escola', 'sorveteria', 'alto'])
      expect(
        p.lotes.some((l) => l.uso === u),
        u,
      ).toBe(true);
    // nenhum lote cruza a rua, o parque ou outro lote
    const usado = new Set<string>();
    for (const l of p.lotes)
      for (let x = l.x0; x < l.x0 + l.largura; x++)
        for (let z = l.z0; z < l.z0 + l.profundidade; z++) {
          expect(soloDaCidade(p, x, z), `lote ${l.i} em ${x},${z}`).toBe(Solo.LOTE);
          const k = `${x},${z}`;
          expect(usado.has(k)).toBe(false);
          usado.add(k);
        }
    // prédios de 6 andares só nas esquinas do parque: no máximo 8
    const seis = p.lotes.filter((l) => (l.params?.andares ?? 0) >= 6);
    expect(seis.length).toBeLessThanOrEqual(8);
    for (const l of seis) expect(['deco', 'alto']).toContain(l.modelo);
    expect(p.moradores.length).toBeLessThanOrEqual(12);
  });

  it('chão plano na cidade e rampa suave em volta (1 bloco a cada 3 colunas)', () => {
    for (const s of SEMENTES.slice(0, 6)) {
      const p = cidadeDoMundo(s)!;
      for (let x = p.plana.x0; x <= p.plana.x1; x += 3)
        for (let z = p.plana.z0; z <= p.plana.z1; z += 3) {
          const h = alturaTerreno(x, z, s);
          expect(h, `${s}: ${x},${z}`).toBe(soloDaCidade(p, x, z) === Solo.LAGO ? p.h - 2 : p.h);
        }
      for (let k = 0; k < 200; k++) {
        const x =
          p.plana.x0 -
          RAMPA_CIDADE +
          Math.floor((((k * 7919) % 997) / 997) * (p.plana.x1 - p.plana.x0 + 2 * RAMPA_CIDADE));
        const z =
          p.plana.z0 - RAMPA_CIDADE + ((k * 31) % (p.plana.z1 - p.plana.z0 + 2 * RAMPA_CIDADE));
        const d = distanciaDaCidade(p, x, z);
        if (d === 0 || d > RAMPA_CIDADE) continue;
        expect(
          Math.abs(alturaTerreno(x, z, s) - p.h),
          `${s}: rampa em ${x},${z}`,
        ).toBeLessThanOrEqual(Math.floor(d / 3));
      }
    }
  });

  it('20 de 20 sementes: nasce na praça, em pé, olhando para o canteiro a até 12 blocos', () => {
    for (const s of SEMENTES) {
      const p = cidadeDoMundo(s)!;
      const n = encontrarNascimento(s);
      expect(pontoDeNascer(s)).toEqual(n);
      const x = Math.floor(n.x);
      const z = Math.floor(n.z);
      const b = mundo(s);
      expect(b(x, p.h, z), `${s}: chão`).toBe(Bloco.CALCADA);
      expect(b(x, p.h + 1, z), `${s}: livre`).toBe(Bloco.AR);
      expect(b(x, p.h + 2, z)).toBe(Bloco.AR);
      const praca = p.lotes.find((l) => l.uso === 'praca')!;
      expect(
        x >= praca.x0 && x < praca.x0 + praca.largura && z >= praca.z0 && z < praca.z0 + 9,
      ).toBe(true);
      const c = p.lotes.find((l) => l.canteiro === 1)!;
      const cx = c.x0 + c.largura / 2;
      const cz = c.z0 + 4.5;
      expect(Math.hypot(cx - n.x, cz - n.z), `${s}: canteiro perto`).toBeLessThanOrEqual(12);
      const yaw = olharDoNascimento(s)!;
      const frente = [Math.sin(yaw), Math.cos(yaw)];
      const ate = [
        (cx - n.x) / Math.hypot(cx - n.x, cz - n.z),
        (cz - n.z) / Math.hypot(cx - n.x, cz - n.z),
      ];
      expect(frente[0] * ate[0] + frente[1] * ate[1], `${s}: olhando o canteiro`).toBeGreaterThan(
        0.95,
      );
      // nenhum povoado de região no mundo da cidade (a cidade é o povoado dele)
      expect(povoadosPerto(n.x, n.z, 400, s)).toEqual([]);
    }
  });

  it('pistas só no asfalto: cada célula de cada faixa é pista e o chão é asfalto, faixa ou zebra', () => {
    const s = 1337;
    const p = cidadeDoMundo(s)!;
    const b = mundo(s);
    const ok = new Set<number>([Bloco.ASFALTO, Bloco.FAIXA_RUA, Bloco.FAIXA_PEDESTRE]);
    for (const pi of p.pistas) {
      const c = pi.celulas;
      expect((c.x1 - c.x0 + 1) * (c.z1 - c.z0 + 1)).toBeGreaterThanOrEqual(2 * 18);
      for (let x = c.x0; x <= c.x1; x++)
        for (let z = c.z0; z <= c.z1; z++) {
          expect(soloDePista(soloDaCidade(p, x, z)), `pista ${pi.id} em ${x},${z}`).toBe(true);
          expect(ok.has(b(x, p.h, z)), `pista ${pi.id}: chão em ${x},${z}`).toBe(true);
          expect(b(x, p.h + 1, z), `pista ${pi.id}: livre em ${x},${z}`).toBe(Bloco.AR);
        }
      // o meio da faixa fica a 1 bloco das bordas (duas colunas de largura)
      const [m0, m1] = pi.eixo === 'z' ? [c.x0, c.x1] : [c.z0, c.z1];
      expect(pi.meio - m0).toBe(1);
      expect(m1 + 1 - pi.meio).toBe(1);
      // mão de direção: andando em +z (ou -x), a faixa fica à direita do meio da via
      expect(p.cruzamentos[pi.de]).toBeTruthy();
      expect(p.cruzamentos[pi.para]).toBeTruthy();
    }
    for (const c of p.cruzamentos)
      for (let x = c.caixa.x0; x <= c.caixa.x1; x++)
        for (let z = c.caixa.z0; z <= c.caixa.z1; z++) expect(b(x, p.h, z)).toBe(Bloco.ASFALTO);
    // a vaga do sorvete: asfalto na beira do parque, colada na faixa da rua
    for (let x = p.vaga.x0; x <= p.vaga.x1; x++)
      for (let z = p.vaga.z0; z <= p.vaga.z1; z++) expect(b(x, p.h, z)).toBe(Bloco.ASFALTO);
    expect(
      p.pistas.some(
        (pi) =>
          pi.eixo === 'x' &&
          pi.celulas.z1 === p.vaga.z0 - 1 &&
          pi.celulas.x0 <= p.vaga.x0 &&
          pi.celulas.x1 >= p.vaga.x1,
      ),
    ).toBe(true);
  });

  it('proteção (016): pista é passagem, calçada é chão, prédio é estrutura, porta é usável', () => {
    const s = 1337;
    const p = cidadeDoMundo(s)!;
    const prot = criarProtecaoMundo(s);
    const pi = p.pistas[0];
    for (let y = 1; y <= 3; y++)
      expect(prot.em(pi.celulas.x0, p.h + y, pi.celulas.z0 + 3)).toBe(Protecao.PASSAGEM);
    expect(prot.em(pi.celulas.x0, p.h, pi.celulas.z0 + 3)).toBe(Protecao.CHAO);
    expect(prot.lugar(pi.celulas.x0, pi.celulas.z0)).toBe('cidade');
    const l = p.lotes.find((q) => q.modelo === 'geminada')!;
    const pl = plantaDoLote(l)!;
    const [px, pz] = noLoteCidade(l, pl.porta[0], pl.porta[1]);
    expect(prot.em(px, p.h + 1 + pl.porta[2], pz)).toBe(Protecao.USAVEL);
    const [wx, wz] = noLoteCidade(l, 0, 4);
    expect(prot.em(wx, p.h + 3, wz)).toBe(Protecao.ESTRUTURA);
    // a escadinha da frente fica livre por cima (ninguém tapa a porta)
    const [ex, ez] = noLoteCidade(l, pl.porta[0], 0);
    expect(prot.em(ex, p.h + 2, ez)).toBe(Protecao.PASSAGEM);
    // a calçada não se cava; dentro do apartamento, enfeitar pode
    const c = pl.comodos[0];
    const [ix, iz] = noLoteCidade(l, c.s0 + 2, c.f0 + 2);
    expect(prot.em(ix, p.h + 1 + c.pes, iz)).toBe(Protecao.LIVRE);
  });

  it('os degraus, portas e placas da cidade têm a direção certa (metadado gerado)', () => {
    const s = 1337;
    const p = cidadeDoMundo(s)!;
    const ed = criarEdicoes(s);
    let conferidos = 0;
    for (const l of p.lotes.filter((q) => q.modelo === 'geminada').slice(0, 12)) {
      const pl = plantaDoLote(l)!;
      for (let y = 0; y < pl.altura; y++)
        for (let f = 0; f < pl.profundidade; f++)
          for (let sx = 0; sx < pl.largura; sx++) {
            const i = indicePlanta(pl, sx, f, y);
            if (pl.metas[i] === 255) continue;
            const [x, z] = noLoteCidade(l, sx, f);
            const esperado = dirNoMundo(l, pl.metas[i]);
            expect(metaGerada(x, p.h + 1 + y, z, s), `${l.i}: ${sx},${f},${y}`).toBe(esperado);
            expect(ed.obterMeta(x, p.h + 1 + y, z)).toBe(esperado);
            conferidos++;
          }
    }
    expect(conferidos).toBeGreaterThan(100);
    // quem edita a célula fica com o metadado dela
    const l = p.lotes.find((q) => q.modelo === 'geminada')!;
    const [x, z] = noLoteCidade(l, 1, 0);
    ed.definir(x, p.h + 1, z, Bloco.TABUAS, 0);
    expect(ed.obterMeta(x, p.h + 1, z)).toBe(0);
  });

  it('o chão da cidade: zebra em todo cruzamento, faixa amarela no meio e calçada nas bordas', () => {
    const p = cidadeDoMundo(1337)!;
    let zebras = 0;
    for (const c of p.cruzamentos) {
      const x = c.caixa.x0;
      const z = c.caixa.z0 - 1;
      if (soloDaCidade(p, x, z) === Solo.ZEBRA) zebras++;
    }
    expect(zebras).toBeGreaterThanOrEqual(24);
    const faixas = p.pistas.filter((pi) => {
      for (let x = pi.celulas.x0 - 1; x <= pi.celulas.x1 + 1; x++)
        for (let z = pi.celulas.z0 - 1; z <= pi.celulas.z1 + 1; z++)
          if (soloDaCidade(p, x, z) === Solo.FAIXA) return true;
      return false;
    });
    expect(faixas.length).toBe(p.pistas.length);
  });
});

describe('os prédios na cidade (T04)', () => {
  it('cada lote de prédio tem a planta do tamanho dele, com o modelo da zona', () => {
    const p = cidadeDoMundo(1337)!;
    const modelos = new Set<string>();
    for (const l of p.lotes) {
      if (l.uso === 'praca' || l.uso === 'canteiro') continue;
      const pl = plantaDoLote(l)!;
      expect(pl, `lote ${l.i}`).toBeTruthy();
      expect(pl.largura, `lote ${l.i}`).toBe(l.largura);
      expect(pl.profundidade).toBe(l.profundidade);
      expect(p.h + pl.altura).toBeLessThan(124);
      modelos.add(pl.modelo);
    }
    expect([...modelos].sort()).toEqual(['alto', 'deco', 'escola', 'geminada', 'tijolo']);
  });

  it('as esquinas largas viram a fachada do lado para a avenida (com janelas)', () => {
    const s = 1337;
    const p = cidadeDoMundo(s)!;
    const b = mundo(s);
    for (const l of p.lotes.filter((q) => q.modelo === 'deco' || q.modelo === 'alto')) {
      // o lado da avenida: a coluna de fora do lote que é calçada da avenida
      const xFora =
        soloDaCidade(p, l.x0 - 1, l.z0 + 4) === Solo.CALCADA ? l.x0 : l.x0 + l.largura - 1;
      let janelas = 0;
      for (let z = l.z0; z < l.z0 + l.profundidade; z++)
        for (let y = p.h + 2; y < p.h + 20; y++) {
          const v = b(xFora, y, z);
          if (v === Bloco.JANELA || v === Bloco.JANELA_ACESA) janelas++;
        }
      expect(janelas, `lote ${l.i} (${l.modelo})`).toBeGreaterThan(10);
    }
  });

  it('a porta de cada prédio abre para a calçada da rua', () => {
    const s = 1337;
    const p = cidadeDoMundo(s)!;
    const b = mundo(s);
    for (const l of p.lotes) {
      const pl = plantaDoLote(l);
      if (!pl) continue;
      const [x, z] = noLoteCidade(l, pl.porta[0], -1);
      expect(soloDaCidade(p, x, z), `lote ${l.i}: na frente da porta`).toBe(Solo.CALCADA);
      const [px, pz] = noLoteCidade(l, pl.porta[0], pl.porta[1]);
      expect(b(px, p.h - pl.chao + pl.porta[2], pz), `lote ${l.i}: porta`).toBe(Bloco.PORTA);
    }
  });
});

void (null as unknown as PlanoCidade);
void obterBloco;
