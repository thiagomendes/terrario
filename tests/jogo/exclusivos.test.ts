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
  blocoNoMundo,
  BLOCOS_SO_DA_VILA,
  COLHER_PEDREIRO,
  EXCLUSIVOS_CIDADE,
  EXCLUSIVOS_VILA,
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
 * Spec 026: a Vila Neon divide os blocos de rua com a cidade (o mesmo id, cada uma com a sua
 * pintura) e tem os seus (103 em diante); a placa, o tapume, a escada de grade e a colher
 * continuam só da cidade.
 */
const CIDADE = obterTema('cidade-grande');
const VILA = obterTema('vila-neon');
const OUTROS = temasDisponiveis()
  .filter((id) => id !== 'cidade-grande' && id !== 'vila-neon')
  .map((id) => obterTema(id));
/** Tudo o que é exclusivo de algum tema (da cidade ou do bairro). */
const EXCLUSIVOS = new Set([
  ...[...EXCLUSIVOS_CIDADE.blocos, ...EXCLUSIVOS_VILA.blocos].map(idDoBloco),
  ...EXCLUSIVOS_CIDADE.itens,
  ...EXCLUSIVOS_VILA.itens,
]);
const SO_DA_CIDADE = [Bloco.PLACA, Bloco.TAPUME, Bloco.ESCADA_GRADE];
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
  it('o tema da cidade lista os blocos dela (84 a 102) e a colher', () => {
    expect(CIDADE.exclusivos).toBe(EXCLUSIVOS_CIDADE);
    const daCidade = REGISTRO_BLOCOS.filter((b) => b.id >= 84 && b.id <= 102).map((b) => b.id);
    expect([...EXCLUSIVOS_CIDADE.blocos].sort((a, b) => a - b)).toEqual(daCidade);
    expect(EXCLUSIVOS_CIDADE.itens).toContain(COLHER_PEDREIRO);
    for (const t of OUTROS) expect(t.exclusivos, t.id).toBeUndefined();
    for (const b of REGISTRO_BLOCOS) expect(blocoExclusivo(b.id), b.nome).toBe(b.id >= 84);
  });

  it('a Vila Neon lista os blocos de rua da cidade e os dela (103 em diante), sem colher', () => {
    expect(VILA.exclusivos).toBe(EXCLUSIVOS_VILA);
    expect(VILA.mundo.povoado?.planta).toBe('bairro');
    const doBairro = REGISTRO_BLOCOS.filter((b) => b.id >= 103).map((b) => b.id);
    expect(doBairro).toHaveLength(14);
    expect([...BLOCOS_SO_DA_VILA].sort((a, b) => a - b)).toEqual(doBairro);
    const deRua = EXCLUSIVOS_CIDADE.blocos.filter((b) => !SO_DA_CIDADE.includes(b as never));
    expect([...EXCLUSIVOS_VILA.blocos].sort((a, b) => a - b)).toEqual([...deRua, ...doBairro]);
    expect(EXCLUSIVOS_VILA.itens).not.toContain(COLHER_PEDREIRO);
  });

  it('cada mundo vê o que é dele: o bairro, a cidade e o Rancho', () => {
    const rancho = obterTema('rancho-alegre').mundo;
    // o bairro: o asfalto e a pista quadriculada, nunca o tapume (nem a placa, nem a colher)
    expect(blocoNoMundo(Bloco.ASFALTO, VILA.mundo)).toBe(true);
    expect(blocoNoMundo(Bloco.POSTE, VILA.mundo)).toBe(true);
    expect(blocoNoMundo(Bloco.PISTA_NEON, VILA.mundo)).toBe(true);
    expect(blocoNoMundo(Bloco.ALAMBRADO, VILA.mundo)).toBe(true);
    for (const b of SO_DA_CIDADE) expect(blocoNoMundo(b, VILA.mundo), String(b)).toBe(false);
    expect(itemNoMundo(COLHER_PEDREIRO, VILA.mundo)).toBe(false);
    // a cidade: o asfalto e o tapume, nunca a pista quadriculada
    expect(blocoNoMundo(Bloco.ASFALTO, estiloCidade)).toBe(true);
    expect(blocoNoMundo(Bloco.TAPUME, estiloCidade)).toBe(true);
    for (const b of BLOCOS_SO_DA_VILA) expect(blocoNoMundo(b, estiloCidade), String(b)).toBe(false);
    // o Rancho: nada disso
    for (const b of REGISTRO_BLOCOS.filter((d) => d.id >= 84))
      expect(blocoNoMundo(b.id, rancho), b.nome).toBe(false);
    // os blocos de todo tema continuam em todo mundo
    for (const e of [VILA.mundo, estiloCidade, rancho])
      expect(blocoNoMundo(Bloco.TABUAS, e)).toBe(true);
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

  it('Vila Neon: a geração só põe blocos que existem no bairro (nada só da cidade)', () => {
    definirEstiloMundo(VILA.mundo);
    limparPovoados();
    const n = encontrarNascimento(1337);
    const cx0 = Math.floor(n.x / 16);
    const cz0 = Math.floor(n.z / 16);
    for (let cx = cx0 - 3; cx <= cx0 + 3; cx++)
      for (let cz = cz0 - 3; cz <= cz0 + 3; cz++) {
        const c = gerarChunk(cx, cz, 1337);
        for (let i = 0; i < c.length; i++)
          if (c[i] >= 84 && !blocoNoMundo(c[i], VILA.mundo))
            throw new Error(`vila-neon: bloco ${c[i]} em ${cx},${cz}`);
      }
  });

  it('criativo: os outros temas não mostram os itens da cidade nem os do bairro', () => {
    registrarCatalogo();
    const daCidade = new Set([
      ...EXCLUSIVOS_CIDADE.blocos.map(idDoBloco),
      ...EXCLUSIVOS_CIDADE.itens,
    ]);
    const doBairro = new Set([...EXCLUSIVOS_VILA.blocos.map(idDoBloco), ...EXCLUSIVOS_VILA.itens]);
    for (const t of OUTROS) {
      const ids = itensDoCatalogo(t.mundo).map((d) => d.id);
      expect(
        ids.filter((i) => EXCLUSIVOS.has(i)),
        t.id,
      ).toEqual([]);
      expect(ids.length, t.id).toBeGreaterThan(50);
    }
    // a cidade mostra os dela e não os só do bairro; o bairro, o contrário
    const naCidade = new Set(itensDoCatalogo(estiloCidade).map((d) => d.id));
    for (const i of daCidade) expect(naCidade.has(i), i).toBe(true);
    for (const b of BLOCOS_SO_DA_VILA) expect(naCidade.has(idDoBloco(b)), String(b)).toBe(false);
    const naVila = new Set(itensDoCatalogo(VILA.mundo).map((d) => d.id));
    for (const i of doBairro) expect(naVila.has(i), i).toBe(true);
    for (const b of SO_DA_CIDADE) expect(naVila.has(idDoBloco(b)), String(b)).toBe(false);
    expect(naVila.has(COLHER_PEDREIRO)).toBe(false);
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
      // (menos as do pedreiro da cidade, spec 014 T07, que só existem lá)
      for (const p of PROFISSOES)
        expect(trocasDoMundo(p, t.mundo)).toEqual(TROCAS[p].filter((x) => !x.planta));
      for (const r of RECEITAS) expect(receitaNoMundo(r, t.mundo), r.id).toBe(true);
    }
    const receita = {
      id: 'teste',
      ingredientes: [idDoBloco(Bloco.CONCRETO)],
      resultado: { item: idDoBloco(Bloco.PEDREGULHO), qtd: 1 },
    };
    expect(receitaNoMundo(receita as never, ESTILO_PADRAO)).toBe(false);
    expect(receitaNoMundo(receita as never, estiloCidade)).toBe(true);
    // o concreto é bloco de rua: vale no bairro também
    expect(receitaNoMundo(receita as never, VILA.mundo)).toBe(true);
    expect(itemNoMundo(idDoBloco(Bloco.TABUAS), ESTILO_PADRAO)).toBe(true);
    // a colher (só da cidade) não se troca no bairro; a pista (só do bairro), não na cidade
    expect(trocaNoMundo(troca, VILA.mundo)).toBe(false);
    const pista: Troca = { ...troca, receber: { item: idDoBloco(Bloco.PISTA_NEON), qtd: 4 } };
    expect(trocaNoMundo(pista, VILA.mundo)).toBe(true);
    expect(trocaNoMundo(pista, estiloCidade)).toBe(false);
    // no bairro não há roça: as trocas de fora da cidade (curral, feno, cama) também não entram
    for (const p of PROFISSOES)
      expect(trocasDoMundo(p, VILA.mundo)).toEqual(
        TROCAS[p].filter((x) => !x.planta && !x.foraDaCidade),
      );
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
