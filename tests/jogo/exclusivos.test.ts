import { afterAll, describe, expect, it } from 'vitest';
import '../../src/temas/todos';
import { obterTema, temasDisponiveis } from '../../src/temas';
import { Bloco, REGISTRO_BLOCOS } from '../../src/world/blocks';
import {
  alturaTerreno,
  definirEstiloMundo,
  encontrarNascimento,
  ESTILO_PADRAO,
  gerarChunk,
} from '../../src/world/chunk';
import { limparPovoados } from '../../src/world/povoado';
import {
  blocoExclusivo,
  COLHER_PEDREIRO,
  EXCLUSIVOS_CIDADE,
  itemNoMundo,
  receitaNoMundo,
  trocaNoMundo,
} from '../../src/jogo/exclusivos';
import { itensDoCatalogo, registrarCatalogo } from '../../src/jogo/catalogo';
import { idDoBloco } from '../../src/jogo/itens';
import { RECEITAS } from '../../src/jogo/receitas';
import { TROCAS, trocasDoMundo, type Troca } from '../../src/jogo/trocas';
import { PROFISSOES } from '../../src/world/povoado';
import { criarNucleo } from '../../src/nucleo/nucleo';
import { sanear } from '../../src/nucleo/saneamento';
import type { Comando, EventoNucleo } from '../../src/nucleo/protocolo';
import type { EstiloMundo } from '../../src/temas/tipos';

/**
 * Spec 014, "Só na Cidade Grande" (decisão do dono): os blocos 84 em diante e a colher de
 * pedreiro são da cidade. Os outros temas não geram, não trocam, não mostram no criativo nem
 * nas receitas, e o núcleo recusa colocar um bloco da cidade num mundo de outro tema.
 */
const CIDADE = obterTema('cidade-grande');
const OUTROS = temasDisponiveis()
  .filter((id) => id !== 'cidade-grande')
  .map((id) => obterTema(id));
const estiloCidade: EstiloMundo = {
  ...CIDADE.mundo,
  povoado: {
    ...(CIDADE.mundo.povoado ?? {
      casa: 'duas-aguas',
      oficina: 'duas-aguas',
      deposito: 'duas-aguas',
      marco: 'poco',
    }),
    planta: 'cidade',
  },
};

afterAll(() => {
  definirEstiloMundo(ESTILO_PADRAO);
  limparPovoados();
});

describe('o que é só da cidade', () => {
  it('o tema da cidade lista os blocos novos (84 em diante) e a colher', () => {
    expect(CIDADE.exclusivos).toBe(EXCLUSIVOS_CIDADE);
    const novos = REGISTRO_BLOCOS.filter((b) => b.id >= 84).map((b) => b.id);
    expect([...EXCLUSIVOS_CIDADE.blocos].sort((a, b) => a - b)).toEqual(novos);
    expect(EXCLUSIVOS_CIDADE.itens).toContain(COLHER_PEDREIRO);
    for (const t of OUTROS) expect(t.exclusivos, t.id).toBeUndefined();
    for (const b of REGISTRO_BLOCOS) expect(blocoExclusivo(b.id), b.nome).toBe(b.id >= 84);
  });

  it.each(OUTROS.map((t) => [t.id, t] as const))(
    '%s: a geração nunca põe um bloco da cidade',
    (_id, t) => {
      definirEstiloMundo(t.mundo);
      limparPovoados();
      const n = encontrarNascimento(1337);
      const cx0 = Math.floor(n.x / 16);
      const cz0 = Math.floor(n.z / 16);
      for (let cx = cx0 - 3; cx <= cx0 + 3; cx++)
        for (let cz = cz0 - 3; cz <= cz0 + 3; cz++) {
          const c = gerarChunk(cx, cz, 1337);
          for (let i = 0; i < c.length; i++)
            if (c[i] >= 84) throw new Error(`${t.id}: bloco ${c[i]} em ${cx},${cz}`);
        }
    },
  );

  it('criativo: os outros temas não mostram os itens da cidade; a cidade mostra', () => {
    registrarCatalogo();
    const daCidade = new Set([
      ...EXCLUSIVOS_CIDADE.blocos.map(idDoBloco),
      ...EXCLUSIVOS_CIDADE.itens,
    ]);
    for (const t of OUTROS) {
      const ids = itensDoCatalogo(t.mundo).map((d) => d.id);
      expect(
        ids.filter((i) => daCidade.has(i)),
        t.id,
      ).toEqual([]);
      expect(ids.length, t.id).toBeGreaterThan(50);
    }
    const naCidade = new Set(itensDoCatalogo(estiloCidade).map((d) => d.id));
    for (const i of daCidade) expect(naCidade.has(i), i).toBe(true);
  });

  it('trocas e receitas com algo da cidade só existem na cidade', () => {
    const troca: Troca = {
      id: 'teste',
      dar: [{ item: idDoBloco(Bloco.PEDREGULHO), qtd: 2 }],
      receber: { item: COLHER_PEDREIRO, qtd: 1 },
    };
    expect(trocaNoMundo(troca, estiloCidade)).toBe(true);
    for (const t of OUTROS) {
      expect(trocaNoMundo(troca, t.mundo), t.id).toBe(false);
      // as trocas de sempre continuam todas
      for (const p of PROFISSOES) expect(trocasDoMundo(p, t.mundo)).toEqual(TROCAS[p]);
      for (const r of RECEITAS) expect(receitaNoMundo(r, t.mundo), r.id).toBe(true);
    }
    const receita = {
      id: 'teste',
      ingredientes: [idDoBloco(Bloco.CONCRETO)],
      resultado: { item: idDoBloco(Bloco.PEDREGULHO), qtd: 1 },
    };
    expect(receitaNoMundo(receita as never, ESTILO_PADRAO)).toBe(false);
    expect(receitaNoMundo(receita as never, estiloCidade)).toBe(true);
    expect(itemNoMundo(idDoBloco(Bloco.TABUAS), ESTILO_PADRAO)).toBe(true);
  });

  it.each(['local', 'nuvem'] as const)(
    'núcleo (%s): colocar um bloco da cidade num mundo de outro tema é recusado',
    (modo) => {
      definirEstiloMundo(ESTILO_PADRAO);
      limparPovoados();
      const semente = 1337;
      const n = criarNucleo({
        semente,
        modo: 'criativo',
        versaoMundo: 2,
        confiarNoCliente: modo === 'local',
        depuracao: true,
      });
      n.conectar('ana', { perfil: { apelido: 'Ana', aparencia: {} } });
      const p = encontrarNascimento(semente);
      const x = Math.floor(p.x) + 2;
      const z = Math.floor(p.z);
      const y = alturaTerreno(x, z, semente) + 1;
      const tel: Comando = {
        t: 'jogador',
        x: x + 1.5,
        y,
        z: z + 0.5,
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
      n.comando('ana', tel);
      n.passo();
      n.quadros();
      const pedir = (bloco: number, id: number) =>
        n.comando('ana', sanear({ t: 'colocar', id, x, y, z, bloco, meta: 0, slot: 0 })!);
      pedir(Bloco.CONCRETO, 1);
      n.passo();
      const ev = n.quadros().get('ana')!.eventos ?? [];
      expect(
        ev.some((e: EventoNucleo) => e.e === 'recusa' && e.comando === 1),
        'recusou o concreto',
      ).toBe(true);
      expect(n.estado.mundo.bloco(x, y, z)).not.toBe(Bloco.CONCRETO);
      // um bloco de todo tema entra no mesmo lugar
      pedir(Bloco.TABUAS, 2);
      n.passo();
      expect(n.estado.mundo.bloco(x, y, z)).toBe(Bloco.TABUAS);
    },
  );
});
