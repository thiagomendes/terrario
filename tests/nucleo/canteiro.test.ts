import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import '../../src/temas/todos';
import { obterTema } from '../../src/temas';
import { criarNucleo, type Nucleo } from '../../src/nucleo/nucleo';
import { sanear, sanearExtras, sanearObras } from '../../src/nucleo/saneamento';
import { cidadeDoMundo, definirEstiloMundo, ESTILO_PADRAO } from '../../src/world/chunk';
import { limparCidades, type PlanoCidade } from '../../src/world/cidade';
import { limparPovoados } from '../../src/world/povoado';
import { Bloco } from '../../src/world/blocks';
import { Protecao, criarProtecaoMundo } from '../../src/world/protecao';
import { ALCANCE_REGRAS, FOLGA_MOVIMENTO } from '../../src/jogo/alcance';
import { COLHER_PEDREIRO } from '../../src/jogo/exclusivos';
import { idDoBloco } from '../../src/jogo/itens';
import {
  ALTURA_OBRA,
  MIOLO_CANTEIRO,
  OBRAS,
  canteirosAbertos,
  celulasDaObra,
  celulasPlanejadas,
  definirObrasFeitas,
  loteDoCanteiro,
  noLoteObra,
  obrasFeitas,
  situacaoDoCanteiro,
  type CelulaPlanejada,
} from '../../src/world/obras';
import type { Comando, EventoNucleo } from '../../src/nucleo/protocolo';

/**
 * Spec 014, T05: o canteiro de obras no núcleo. As seis plantas cabem no miolo e toda
 * célula fica ao alcance; a célula da obra aberta só aceita o bloco da planta (com a colher
 * não gasta nada; o bloco errado não entra nem é gasto); duas crianças na mesma célula dão
 * um bloco só; a obra feita vira parte da cidade (geração, proteção, edições limpas), o
 * próximo canteiro abre e cada ajudante ganha a peça de fantasia; salvar e reabrir.
 */
const CIDADE = obterTema('cidade-grande').mundo;
const SEMENTE = 1337;

beforeAll(() => {
  definirEstiloMundo(CIDADE);
  limparCidades();
  limparPovoados();
});
afterEach(() => definirObrasFeitas([]));
afterAll(() => {
  definirObrasFeitas([]);
  definirEstiloMundo(ESTILO_PADRAO);
  limparCidades();
  limparPovoados();
});

let ids = 1000;
const id = () => ++ids;

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

/** Manda como o servidor da nuvem manda: pelo saneamento. */
function mandar(n: Nucleo, quem: string, c: unknown): void {
  const s = sanear(c);
  expect(s, JSON.stringify(c)).not.toBeNull();
  n.comando(quem, s!);
}

/** Em pé em cima da célula (o corpo não ocupa a célula: dá para colocar). */
function ir(n: Nucleo, quem: string, c: { x: number; y: number; z: number }): void {
  n.estado.jogadores.get(quem)!.saltoPermitido = true;
  n.comando(quem, tel(c.x + 0.5, c.y + 2, c.z + 0.5));
}

function abrir(
  jogo: 'criativo' | 'sobrevivencia',
  dados?: Parameters<typeof criarNucleo>[0]['dados'],
) {
  const n = criarNucleo({
    semente: SEMENTE,
    modo: jogo,
    versaoMundo: 2,
    confiarNoCliente: false,
    depuracao: true,
    dono: 'ana',
    dados,
  });
  n.conectar('ana', { perfil: { apelido: 'Ana', aparencia: {} } });
  n.conectar('leo', { perfil: { apelido: 'Léo', aparencia: {} } });
  n.passo();
  n.quadros();
  return n;
}

function dar(n: Nucleo, quem: string, slot: number, item: string, qtd = 1): void {
  n.estado.jogadores.get(quem)!.inventario.definir(slot, { item, qtd });
}

function colocar(n: Nucleo, quem: string, c: CelulaPlanejada, bloco = c.bloco, slot = 0): number {
  const i = id();
  ir(n, quem, c);
  mandar(n, quem, { t: 'colocar', id: i, x: c.x, y: c.y, z: c.z, bloco, meta: 0, slot });
  return i;
}

function eventos(n: Nucleo): Map<string, EventoNucleo[]> {
  n.passo();
  const r = new Map<string, EventoNucleo[]>();
  for (const [q, f] of n.quadros()) r.set(q, f.eventos ?? []);
  return r;
}

const cidade = (): PlanoCidade => cidadeDoMundo(SEMENTE)!;

describe('as plantas das obras', () => {
  it('seis obras, da menor para a maior, todas no miolo do canteiro e de até 5 de altura', () => {
    expect(OBRAS.map((o) => o.n)).toEqual([1, 2, 3, 4, 5, 6]);
    const contas = OBRAS.map((o) => celulasDaObra(o).length);
    // a casinha do cachorro e o ponto de ônibus têm as contas da spec (23 e 20)
    expect(contas[0]).toBe(23);
    expect(contas[1]).toBe(16);
    expect(contas[2]).toBe(20);
    expect(contas[4]).toBeGreaterThanOrEqual(contas[3]);
    for (const o of OBRAS) {
      expect(o.planta.altura).toBeLessThanOrEqual(5);
      const m = MIOLO_CANTEIRO;
      const plano = new Set(celulasDaObra(o).map((c) => `${c.s},${c.f},${c.y}`));
      for (const c of celulasDaObra(o)) {
        expect(c.s >= m.s0 && c.s <= m.s1 && c.f >= m.f0 && c.f <= m.f1, o.id).toBe(true);
        expect(c.y).toBeLessThan(ALTURA_OBRA);
      }
      for (const [s, f, y] of o.andaime) {
        expect(s >= m.s0 && s <= m.s1 && f >= m.f0 && f <= m.f1, `${o.id} andaime`).toBe(true);
        expect(plano.has(`${s},${f},${y}`), `${o.id} andaime em cima da obra`).toBe(false);
      }
    }
  });

  it('toda célula de cada planta fica ao alcance de um lugar em pé (chão ou andaime)', () => {
    const raio = ALCANCE_REGRAS - FOLGA_MOVIMENTO;
    for (const o of OBRAS) {
      const solidas = new Set(celulasDaObra(o).map((c) => `${c.s},${c.f},${c.y}`));
      for (const [s, f, y] of o.andaime) solidas.add(`${s},${f},${y}`);
      // em pé: no chão do miolo, na entrada e na calçada da frente, ou em cima do andaime
      const lugares: [number, number, number][] = [];
      for (let f = -1; f <= MIOLO_CANTEIRO.f1; f++)
        for (let s = 0; s <= 7; s++) {
          const naBorda = f === 0 && s !== 3 && s !== 4;
          if (naBorda || ((s === 0 || s === 7) && f >= 0)) continue;
          if (!solidas.has(`${s},${f},0`) && !solidas.has(`${s},${f},1`)) lugares.push([s, f, 0]);
        }
      for (const [s, f, y, b] of o.andaime)
        if (b === Bloco.TABUAS && !solidas.has(`${s},${f},${y + 1}`)) lugares.push([s, f, y + 1]);
      for (const c of celulasDaObra(o)) {
        const alcanca = lugares.some(
          ([s, f, y]) =>
            Math.hypot(s + 0.5 - (c.s + 0.5), y + 1.62 - (c.y + 0.5), f + 0.5 - (c.f + 0.5)) <=
            raio,
        );
        expect(alcanca, `${o.id}: ${c.s},${c.f},${c.y}`).toBe(true);
      }
    }
  });
});

describe('o canteiro na geração e na proteção', () => {
  it('os dois primeiros abrem (andaime e células de obra); os outros esperam', () => {
    expect(canteirosAbertos()).toEqual([1, 2]);
    expect(situacaoDoCanteiro(3)).toBe('fechada');
    const prot = criarProtecaoMundo(SEMENTE);
    for (const n of [1, 2, 3]) {
      const c = celulasPlanejadas(cidade(), n)[0];
      expect(prot.em(c.x, c.y, c.z), `canteiro ${n}`).toBe(Protecao.OBRA);
      expect(prot.planejado(c.x, c.y, c.z)?.bloco ?? null).toBe(n <= 2 ? c.bloco : null);
    }
  });

  it('o andaime é do mundo enquanto a obra está aberta e some com a obra feita', () => {
    const n = abrir('criativo');
    const l = loteDoCanteiro(cidade(), 1)!;
    const [s, f, y, b] = OBRAS[0].andaime[0];
    const [x, z] = noLoteObra(l, s, f);
    const Y = cidade().h + 1 + y;
    expect(n.estado.mundo.bloco(x, Y, z)).toBe(b);
    expect(n.protecao.em(x, Y, z)).toBe(Protecao.ESTRUTURA);
    for (const c of celulasPlanejadas(cidade(), 1)) colocar(n, 'ana', c);
    eventos(n);
    expect(n.estado.mundo.bloco(x, Y, z)).toBe(Bloco.AR);
  });
});

describe('encher a obra (nuvem: tudo pelo saneamento)', () => {
  it('com a colher, o bloco da planta entra e nada é gasto (sobrevivência)', () => {
    const n = abrir('sobrevivencia');
    dar(n, 'ana', 0, COLHER_PEDREIRO);
    const c = celulasPlanejadas(cidade(), 1)[0];
    colocar(n, 'ana', c);
    const ev = eventos(n).get('ana')!;
    expect(n.estado.mundo.bloco(c.x, c.y, c.z)).toBe(c.bloco);
    expect(n.estado.jogadores.get('ana')!.inventario.obter(0)).toEqual({
      item: COLHER_PEDREIRO,
      qtd: 1,
    });
    const obra = ev.find((e) => e.e === 'obra');
    expect(obra).toMatchObject({ e: 'obra', canteiro: 1, cheias: 1, meu: true });
    // o bloco posto já é da cidade: ninguém tira, nem quem pôs
    const i = id();
    mandar(n, 'ana', { t: 'quebrar', id: i, x: c.x, y: c.y, z: c.z, slot: 0 });
    const r = eventos(n)
      .get('ana')!
      .find((e) => e.e === 'recusa');
    expect(r).toMatchObject({ protecao: { motivo: 'obra' } });
    expect(n.estado.mundo.bloco(c.x, c.y, c.z)).toBe(c.bloco);
  });

  it('com o bloco certo na mão também enche (e gasta); a colher fora da obra não põe nada', () => {
    const n = abrir('sobrevivencia');
    const c = celulasPlanejadas(cidade(), 1).find((q) => q.bloco === Bloco.TABUAS)!;
    dar(n, 'ana', 0, idDoBloco(Bloco.TABUAS), 5);
    colocar(n, 'ana', c);
    eventos(n);
    expect(n.estado.mundo.bloco(c.x, c.y, c.z)).toBe(Bloco.TABUAS);
    expect(n.estado.jogadores.get('ana')!.inventario.obter(0)?.qtd).toBe(4);
    // colher num lugar que não é da obra: nada
    dar(n, 'ana', 1, COLHER_PEDREIRO);
    const fora = { ...c, x: c.x, y: c.y + 10, z: c.z };
    colocar(n, 'ana', fora, Bloco.TABUAS, 1);
    eventos(n);
    expect(n.estado.mundo.bloco(fora.x, fora.y, fora.z)).toBe(Bloco.AR);
  });

  it('o bloco errado não entra nem é gasto, e o aviso diz o bloco certo', () => {
    const n = abrir('sobrevivencia');
    const c = celulasPlanejadas(cidade(), 1).find((q) => q.bloco === Bloco.TABUAS)!;
    dar(n, 'ana', 0, idDoBloco(Bloco.PEDREGULHO), 3);
    const i = colocar(n, 'ana', c, Bloco.PEDREGULHO);
    const ev = eventos(n).get('ana')!;
    expect(n.estado.mundo.bloco(c.x, c.y, c.z)).toBe(Bloco.AR);
    expect(n.estado.jogadores.get('ana')!.inventario.obter(0)?.qtd).toBe(3);
    expect(ev.find((e) => e.e === 'recusa' && e.comando === i)).toMatchObject({
      protecao: { motivo: 'obra', certo: Bloco.TABUAS },
    });
  });

  it('o canteiro que espera a vez não aceita nada', () => {
    const n = abrir('criativo');
    const c = celulasPlanejadas(cidade(), 3)[0];
    const i = colocar(n, 'ana', c);
    const ev = eventos(n).get('ana')!;
    expect(n.estado.mundo.bloco(c.x, c.y, c.z)).toBe(Bloco.AR);
    expect(ev.find((e) => e.e === 'recusa' && e.comando === i)).toMatchObject({
      protecao: { motivo: 'obra' },
    });
  });

  it('duas crianças na mesma célula: um bloco só, e quem chegou depois não perde nada', () => {
    const n = abrir('sobrevivencia');
    const c = celulasPlanejadas(cidade(), 1).find((q) => q.bloco === Bloco.TABUAS)!;
    dar(n, 'ana', 0, COLHER_PEDREIRO);
    dar(n, 'leo', 0, idDoBloco(Bloco.TABUAS), 2);
    colocar(n, 'ana', c);
    colocar(n, 'leo', c);
    const f = (() => {
      n.passo();
      return n.quadros();
    })();
    expect(n.estado.mundo.bloco(c.x, c.y, c.z)).toBe(Bloco.TABUAS);
    expect(n.estado.jogadores.get('leo')!.inventario.obter(0)?.qtd).toBe(2);
    // a célula do Léo volta com o mesmo bloco (nada pisca)
    const corr = f.get('leo')!.blocos!.filter((b) => b.x === c.x && b.y === c.y && b.z === c.z);
    expect(corr.every((b) => (b.v & 255) === Bloco.TABUAS)).toBe(true);
  });

  it('a obra feita vira parte da cidade, abre a próxima e dá a peça a cada ajudante', () => {
    const n = abrir('criativo');
    const celulas = celulasPlanejadas(cidade(), 1);
    celulas.forEach((c, k) => colocar(n, k % 2 ? 'leo' : 'ana', c));
    const ev = eventos(n);
    expect(obrasFeitas()).toEqual([1]);
    expect(canteirosAbertos()).toEqual([2, 3]);
    for (const q of ['ana', 'leo']) {
      const fim = ev.get(q)!.find((e) => e.e === 'obra' && e.feita);
      expect(fim, q).toMatchObject({
        canteiro: 1,
        ajudou: true,
        recompensa: ['capacete-obra'],
        nomes: ['Ana', 'Léo'],
      });
    }
    // a geração pinta a obra (as edições saem) e ela é estrutura do mundo
    for (const c of celulas) {
      expect(n.estado.edicoes.obter(c.x, c.y, c.z)).toBeUndefined();
      expect(n.estado.mundo.bloco(c.x, c.y, c.z)).toBe(c.bloco);
      expect(n.protecao.em(c.x, c.y, c.z)).toBe(Protecao.ESTRUTURA);
    }
    // o canteiro 3 abriu: a célula dele já pede o bloco da planta
    const c3 = celulasPlanejadas(cidade(), 3)[0];
    expect(n.protecao.planejado(c3.x, c3.y, c3.z)?.bloco).toBe(c3.bloco);

    // salvar e reabrir: continua feita (a geração lê a lista), com os ajudantes guardados
    const salvo = n.salvar();
    const obras = sanearObras(salvo.extras['obras']);
    expect(obras['1']).toMatchObject({
      feita: true,
      ajudantes: [
        ['ana', 'Ana'],
        ['leo', 'Léo'],
      ],
    });
    definirObrasFeitas([]);
    const m = abrir('criativo', {
      versao: 1,
      edicoes: salvo.edicoes,
      jogador: null,
      hora: salvo.hora,
      extras: salvo.extras,
    } as never);
    expect(m.obrasFeitas).toEqual([1]);
    for (const c of celulas) expect(m.estado.mundo.bloco(c.x, c.y, c.z)).toBe(c.bloco);
  });

  it('as seis feitas: quem ajudou na última ganha também o colete', () => {
    const n = abrir('criativo');
    let ultima: EventoNucleo[] = [];
    for (let k = 1; k <= 6; k++) {
      for (const c of celulasPlanejadas(cidade(), k)) colocar(n, 'ana', c);
      ultima = eventos(n).get('ana')!;
    }
    expect(obrasFeitas()).toEqual([1, 2, 3, 4, 5, 6]);
    expect(ultima.find((e) => e.e === 'obra' && e.feita)).toMatchObject({
      canteiro: 6,
      recompensa: ['capacete-obra', 'colete-obra'],
    });
  });
});

describe('o pedreiro e o mundo salvo', () => {
  it('o pedreiro aparece no canteiro aberto, acena e dá a colher a quem chega', () => {
    // a criança nasce na praça, ao lado do primeiro canteiro: a colher já chega no começo
    const n = abrir('sobrevivencia');
    const ped = n.estado.populacao.lista.find(
      (q) => q.morador?.povoado === 'cidade' && q.morador.n === 0,
    );
    expect(ped?.morador?.profissao).toBe('construtor');
    const ana = n.estado.jogadores.get('ana')!;
    expect(ana.inventario.contar(COLHER_PEDREIRO)).toBe(1);
    // quem perdeu a colher ganha outra, e ela fica na mão (o evento diz o slot)
    const slot = ana.inventario.slots.findIndex((p) => p?.item === COLHER_PEDREIRO);
    ana.inventario.definir(slot, null);
    let colher: EventoNucleo | undefined;
    for (let i = 0; i < 200 && !colher; i++)
      colher = eventos(n)
        .get('ana')!
        .find((e) => e.e === 'colher');
    expect(colher).toMatchObject({ e: 'colher' });
    expect(ana.inventario.contar(COLHER_PEDREIRO)).toBe(1);
  });

  it('extras.obras passa a limpo e mundo sem obra salva igual a antes', () => {
    expect(
      sanearExtras({
        obras: {
          '1': {
            cheias: [0, 1, 1, -3, 'x'],
            ajudantes: [['ana', 'Ana'], ['ana', 'x'], [3]],
            feita: true,
          },
          '9': { cheias: [] },
          lixo: 2,
        },
      }).obras,
    ).toEqual({ '1': { cheias: [0, 1], ajudantes: [['ana', 'Ana']], feita: true } });
    const n = abrir('criativo');
    expect('obras' in n.salvar().extras).toBe(false);
  });
});
