import { afterAll, describe, expect, it } from 'vitest';
import { criarNucleo } from '../../src/nucleo/nucleo';
import {
  ESTILO_PADRAO,
  TERRENO_NATURAL,
  cidadeDoMundo,
  definirEstiloMundo,
  definirPovoados,
  gerarChunk,
} from '../../src/world/chunk';
import { limparPovoados, planoDaRegiao } from '../../src/world/povoado';
import '../../src/temas/todos';
import { obterTema } from '../../src/temas';
import { Bloco } from '../../src/world/blocks';
import { criarEdicoes } from '../../src/world/edicoes';
import { criarMundoSolido } from '../../src/world/solido';
import type { DadosMundo } from '../../src/jogo/mundos';

/**
 * Spec 039 (T08, pedido da revisão da T03): o custo do `metaGerada` na colisão e na conversão
 * das camas. Só com MEDIR_DESEMPENHO=1 (é medida, não regra). Roda igual na `main` (lá o
 * metadado gerado dos povoados não existe e a conversão também não: a régua).
 *
 * - **A colisão:** `solido.caixas` em todas as células de forma parcial (camas, portas, lajes,
 *   cercas) em volta dos povoados do Doce Reino e da Cidade Grande, com as edições que conhecem a
 *   semente (o `obterMeta` cai no `metaGerada`) contra as que não conhecem (o metadado gerado
 *   fica 0: o custo zero). Em nanossegundos por consulta.
 * - **A conversão:** abrir um mundo salvo com muitas edições (um chão de tábuas e camas de uma
 *   célula) sem `extras.camas` (a conversão roda) e com ele (não roda). Em milissegundos.
 *
 *   MEDIR_DESEMPENHO=1 npx vitest run tests/nucleo/custo-camas.test.ts
 */
declare const process: { env: Record<string, string | undefined> };
const MEDIR = !!process.env.MEDIR_DESEMPENHO;
const SEMENTE = 1337;

afterAll(() => {
  definirEstiloMundo(ESTILO_PADRAO);
  limparPovoados();
});

const mediana = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];

/** As células de forma parcial numa caixa (x0..x1, z0..z1, y0..y1). */
function parciais(x0: number, z0: number, x1: number, z1: number, y0: number, y1: number) {
  const s = criarMundoSolido(SEMENTE, gerarChunk);
  const out: [number, number, number][] = [];
  for (let x = x0; x <= x1; x++)
    for (let z = z0; z <= z1; z++)
      for (let y = y0; y <= y1; y++) {
        // o bloco pela colisão sem edições (a geração): só as de forma parcial
        const caixas = s.caixas?.(x, y, z);
        if (caixas !== null && caixas !== undefined) out.push([x, y, z]);
      }
  return out;
}

/** ns por consulta de `caixas`, com e sem o metadado gerado (mediana de 7 voltas). */
function custoColisao(celulas: [number, number, number][]) {
  const com = criarMundoSolido(SEMENTE, gerarChunk, criarEdicoes(SEMENTE));
  const sem = criarMundoSolido(SEMENTE, gerarChunk, criarEdicoes());
  const voltas = Math.max(1, Math.ceil(200_000 / Math.max(1, celulas.length)));
  const medir = (s: typeof com) => {
    for (const [x, y, z] of celulas) s.caixas!(x, y, z);
    const t0 = performance.now();
    for (let v = 0; v < voltas; v++) for (const [x, y, z] of celulas) s.caixas!(x, y, z);
    return ((performance.now() - t0) * 1e6) / (voltas * celulas.length);
  };
  const a: number[] = [];
  const b: number[] = [];
  for (let i = 0; i < 7; i++) {
    a.push(medir(com));
    b.push(medir(sem));
  }
  return { celulas: celulas.length, comNs: Math.round(mediana(a)), semNs: Math.round(mediana(b)) };
}

describe.skipIf(!MEDIR)('spec 039: o custo do metadado gerado', () => {
  it('na colisão, em volta dos povoados do Doce Reino', () => {
    definirEstiloMundo(obterTema('doce-reino').mundo);
    definirPovoados(true);
    limparPovoados();
    const celulas: [number, number, number][] = [];
    let povoados = 0;
    for (let rx = -2; rx <= 2; rx++)
      for (let rz = -2; rz <= 2; rz++) {
        const p = planoDaRegiao(rx, rz, SEMENTE, TERRENO_NATURAL);
        if (!p) continue;
        povoados++;
        for (const l of p.lotes) celulas.push(...parciais(l.x0, l.z0, l.x0 + 7, l.z0 + 7, l.h - 1, l.h + 8));
      }
    expect(celulas.length).toBeGreaterThan(0);
    const r = custoColisao(celulas);
    console.log(`CUSTO-039 colisao doce-reino ${JSON.stringify({ povoados, ...r })}`);
  });

  it('na colisão, no meio da Cidade Grande', () => {
    definirEstiloMundo(obterTema('cidade-grande').mundo);
    definirPovoados(true);
    limparPovoados();
    const c = cidadeDoMundo(SEMENTE)!;
    expect(c).not.toBeNull();
    // os prédios: os lotes com planta
    const celulas: [number, number, number][] = [];
    const predios = c.lotes.filter((l) => l.modelo);
    for (const l of predios)
      celulas.push(...parciais(l.x0, l.z0, l.x0 + l.largura - 1, l.z0 + l.profundidade - 1, c.h, c.h + 40));
    expect(celulas.length).toBeGreaterThan(0);
    const r = custoColisao(celulas);
    console.log(`CUSTO-039 colisao cidade-grande ${JSON.stringify({ predios: predios.length, ...r })}`);
  });

  it('na conversão: abrir um mundo com muitas edições', () => {
    definirEstiloMundo(obterTema('doce-reino').mundo);
    definirPovoados(true);
    limparPovoados();
    // o mundo de antes: um chão de tábuas de 160 x 160 no alto e uma cama de uma célula a cada
    // 4 x 4 (a frente livre), mais o ar em cima (as edições de quem construiu muito)
    const base = criarNucleo({ semente: SEMENTE, modo: 'criativo', versaoMundo: 2, dono: 'ana' });
    const ed = base.estado.edicoes;
    const Y = 100;
    let camas = 0;
    for (let x = -80; x < 80; x++)
      for (let z = -80; z < 80; z++) {
        ed.definir(x, Y - 1, z, Bloco.TABUAS);
        const cama = ((x % 4) + 4) % 4 === 0 && ((z % 4) + 4) % 4 === 0;
        ed.definir(x, Y, z, cama ? Bloco.CAMA : Bloco.AR, cama ? (x + z) & 3 : 0);
        if (cama) camas++;
      }
    const s = base.salvar();
    const edicoes = Object.values(s.edicoes as Record<string, unknown[]>).reduce((n, l) => n + l.length, 0);
    const abrir = (convertida: boolean) => {
      const extras: Record<string, unknown> = { ...s.extras };
      if (convertida) extras['camas'] = 2;
      else delete extras['camas'];
      const dados: DadosMundo = { versao: 1, edicoes: s.edicoes, jogador: null, hora: s.hora, extras };
      const t0 = performance.now();
      const n = criarNucleo({ semente: SEMENTE, modo: 'criativo', versaoMundo: 2, dados, dono: 'ana' });
      const ms = performance.now() - t0;
      return { ms, n };
    };
    const comConversao: number[] = [];
    const semConversao: number[] = [];
    let convertidas = 0;
    for (let i = 0; i < 5; i++) {
      semConversao.push(abrir(true).ms);
      const r = abrir(false);
      comConversao.push(r.ms);
      // as camas viraram a nova (o pé na frente) no ramo; na main ficam de uma célula
      let pes = 0;
      const m = r.n.estado.edicoes;
      for (let x = -80; x < 80; x++)
        for (let z = -80; z < 80; z++) if (m.obterValor(x, Y, z) !== undefined && r.n.estado.mundo.bloco(x, Y, z) === Bloco.CAMA) pes++;
      convertidas = pes - camas;
    }
    console.log(
      `CUSTO-039 conversao ${JSON.stringify({
        edicoes,
        camas,
        pesNovos: convertidas,
        abrirComConversaoMs: Math.round(mediana(comConversao)),
        abrirSemConversaoMs: Math.round(mediana(semConversao)),
      })}`,
    );
  });
});
