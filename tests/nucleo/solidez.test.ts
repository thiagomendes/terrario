import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import '../../src/temas/todos';
import { obterTema } from '../../src/temas';
import { criarNucleo } from '../../src/nucleo/nucleo';
import { cidadeDoMundo, definirEstiloMundo, ESTILO_PADRAO } from '../../src/world/chunk';
import { limparCidades, Solo, soloDaCidade } from '../../src/world/cidade';
import { limparPovoados } from '../../src/world/povoado';
import { CRIATURAS, type TipoSer } from '../../src/jogo/criaturas';
import { CORPO_NA_RUA } from '../../src/jogo/transito';
import type { Comando } from '../../src/nucleo/protocolo';
import type { MedidasVeiculo, Pose } from '../../src/jogo/veiculos';
import { criarGerador } from '../../src/audio/variacao';

/**
 * 014c, a regra do dono: SOLIDEZ. Nada passa por dentro de nada. A cidade roda minutos com
 * muitas crianças (que andam por tudo, atravessam a rua e param na frente dos carros), os
 * moradores e um monte de bichos; a cada passo do núcleo, nenhuma caixa de veículo encosta em
 * nenhum corpo (criança, morador ou bicho) nem em outro veículo. As crianças andam como o
 * cliente anda: não entram nas caixas dos veículos (os sólidos do cliente).
 */
const SEMENTE = 1337;
beforeAll(() => {
  definirEstiloMundo(obterTema('cidade-grande').mundo);
  limparCidades();
  limparPovoados();
});
afterAll(() => {
  definirEstiloMundo(ESTILO_PADRAO);
  limparCidades();
  limparPovoados();
});

type P2 = [number, number];
function retangulo(x: number, z: number, fx: number, fz: number, mf: number, ml: number): P2[] {
  const lx = -fz;
  const lz = fx;
  return [
    [x - fx * mf - lx * ml, z - fz * mf - lz * ml],
    [x + fx * mf - lx * ml, z + fz * mf - lz * ml],
    [x + fx * mf + lx * ml, z + fz * mf + lz * ml],
    [x - fx * mf + lx * ml, z - fz * mf + lz * ml],
  ];
}
/** Quanto dois retângulos girados se sobrepõem (0: não encostam). Eixos separadores. */
function sobreposicao(a: P2[], b: P2[]): number {
  let menor = Infinity;
  for (const pol of [a, b])
    for (let i = 0; i < 2; i++) {
      const ex = pol[i + 1][0] - pol[i][0];
      const ez = pol[i + 1][1] - pol[i][1];
      const l = Math.hypot(ex, ez) || 1;
      const nx = -ez / l;
      const nz = ex / l;
      const pa = a.map(([x, z]) => x * nx + z * nz);
      const pb = b.map(([x, z]) => x * nx + z * nz);
      const o = Math.min(Math.max(...pa), Math.max(...pb)) - Math.max(Math.min(...pa), Math.min(...pb));
      if (o <= 0) return 0;
      menor = Math.min(menor, o);
    }
  return menor;
}
const caixa = (p: Pose, m: MedidasVeiculo) => retangulo(p.x, p.z, p.hx, p.hz, m.meioComp, m.meiaLarg);

function tel(x: number, y: number, z: number): Comando {
  return {
    t: 'jogador',
    x,
    y,
    z,
    yaw: 0,
    pitch: 0,
    olhos: y + 1.62,
    noChao: true,
    voando: false,
    vel: 0,
    correndo: false,
    submerso: false,
    quedas: [],
    pulos: 0,
    golpes: 0,
    slot: 0,
  };
}

const MEIA_CRIANCA = 0.3;

describe('solidez na cidade (014c)', () => {
  it('minutos de cidade cheia: nenhum veículo encosta em ninguém, nem em outro veículo', () => {
    const n = criarNucleo({
      semente: SEMENTE,
      modo: 'criativo',
      versaoMundo: 2,
      confiarNoCliente: true,
      depuracao: true,
      dono: 'c0',
      dados: { versao: 1, edicoes: [], jogador: null, hora: 0.45, extras: {} } as never,
    });
    const p = cidadeDoMundo(SEMENTE)!;
    const y = p.h + 1;
    const rng = criarGerador(14);
    const naCidade = (x: number, z: number) => {
      const s = soloDaCidade(p, Math.floor(x), Math.floor(z));
      return s !== Solo.NADA && s !== Solo.LOTE && s !== Solo.LAGO;
    };
    // as crianças: começam espalhadas pelas ruas e calçadas e andam para pontos sorteados
    const CRIANCAS = 8;
    const kids = Array.from({ length: CRIANCAS }, (_, i) => {
      let x = 0;
      let z = 0;
      do {
        x = p.plana.x0 + 8 + rng() * (p.plana.x1 - p.plana.x0 - 16);
        z = p.plana.z0 + 8 + rng() * (p.plana.z1 - p.plana.z0 - 16);
      } while (!naCidade(x, z));
      return { id: `c${i}`, x, z, ax: x, az: z };
    });
    for (const k of kids) n.conectar(k.id);
    n.passo();
    // um monte de bichos nas calçadas e nas ruas
    const tipos: TipoSer[] = ['coelho', 'raposa', 'cervo', 'coelho', 'raposa'];
    for (let i = 0; i < 30; i++) {
      const k = kids[i % kids.length];
      const x = k.x + (rng() - 0.5) * 16;
      const z = k.z + (rng() - 0.5) * 16;
      if (naCidade(x, z)) n.estado.populacao.adicionar(tipos[i % tipos.length], x, y, z);
    }
    const tr = n.estado.transito!;
    const PASSOS = 20 * 60 * 4; // 4 minutos
    let pior = 0;
    const falhas: string[] = [];
    let perto = 0;
    let moradores = 0;
    for (let i = 0; i < PASSOS; i++) {
      const vs = tr.veiculos;
      const caixas = vs.map((v) => ({ v, c: caixa(v.pose, v.m) }));
      // as crianças andam como o cliente: um passo para o alvo, se não entrar num veículo
      for (const k of kids) {
        if (Math.hypot(k.ax - k.x, k.az - k.z) < 0.5 || rng() < 0.002) {
          // alvo: às vezes do outro lado da rua, às vezes no meio da faixa (brincando)
          for (let t = 0; t < 20; t++) {
            const ax = k.x + (rng() - 0.5) * 30;
            const az = k.z + (rng() - 0.5) * 30;
            if (naCidade(ax, az)) {
              k.ax = ax;
              k.az = az;
              break;
            }
          }
        }
        const d = Math.hypot(k.ax - k.x, k.az - k.z) || 1;
        const nx = k.x + ((k.ax - k.x) / d) * 0.215;
        const nz = k.z + ((k.az - k.z) / d) * 0.215;
        const corpo = retangulo(nx, nz, 1, 0, MEIA_CRIANCA, MEIA_CRIANCA);
        if (!caixas.some((c) => sobreposicao(c.c, corpo) > 0) && naCidade(nx, nz)) {
          k.x = nx;
          k.z = nz;
        }
        n.comando(k.id, tel(k.x, y, k.z));
      }
      n.passo();
      n.quadros();
      // confere: cada veículo contra crianças, criaturas e os outros veículos
      const depois = tr.veiculos.map((v) => ({ v, c: caixa(v.pose, v.m) }));
      const corpos: { nome: string; c: P2[] }[] = kids.map((k) => ({
        nome: k.id,
        c: retangulo(k.x, k.z, 1, 0, MEIA_CRIANCA, MEIA_CRIANCA),
      }));
      moradores = 0;
      for (const c of n.estado.populacao.lista) {
        if (c.tipo === 'peixe' || c.estado === 'morrendo' || Math.abs(c.y - y) > 1.5) continue;
        if (c.tipo === 'morador') moradores++;
        const corpo = c.tipo === 'morador' ? undefined : CORPO_NA_RUA[c.tipo];
        const mw = CRIATURAS[c.tipo].mw;
        corpos.push({
          nome: `${c.tipo}#${c.id}`,
          c: corpo
            ? retangulo(c.x, c.z, Math.sin(c.yaw), Math.cos(c.yaw), corpo[0], corpo[1])
            : retangulo(c.x, c.z, 1, 0, mw, mw),
        });
      }
      for (const a of depois) {
        for (const b of corpos) {
          const o = sobreposicao(a.c, b.c);
          if (o > 0.001) {
            pior = Math.max(pior, o);
            if (falhas.length < 12) falhas.push(`passo ${i}: ${a.v.tipo}#${a.v.id} em ${b.nome} (${o.toFixed(3)})`);
          } else if (o === 0 && sobreposicao(a.c, b.c.map(([x, z]) => [x, z] as P2)) === 0) {
            // perto (a menos de 1 bloco) conta como "o carro esperou"
          }
        }
        for (const b of depois) {
          if (b.v.id <= a.v.id) continue;
          const o = sobreposicao(a.c, b.c);
          if (o > 0.001 && falhas.length < 12)
            falhas.push(`passo ${i}: ${a.v.tipo}#${a.v.id} em ${b.v.tipo}#${b.v.id} (${o.toFixed(3)})`);
        }
      }
      if (depois.some((a) => corpos.some((b) => sobreposicao(a.c, retangulo((b.c[0][0] + b.c[2][0]) / 2, (b.c[0][1] + b.c[2][1]) / 2, 1, 0, 1.2, 1.2)) > 0)))
        perto++;
    }
    console.log(`solidez: ${PASSOS} passos, ${perto} passos com alguém a menos de 1 bloco de um veículo, ${moradores} moradores no fim, pior sobreposição ${pior.toFixed(3)}`);
    // a cidade foi posta à prova (gente perto dos veículos de verdade)
    expect(perto).toBeGreaterThan(200);
    expect(falhas).toEqual([]);
  }, 600_000);
});
