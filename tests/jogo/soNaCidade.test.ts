import { afterAll, afterEach, describe, expect, it } from 'vitest';
import '../../src/temas/todos';
import { obterTema, temasDisponiveis } from '../../src/temas';
import { lerTexto } from '../audio/arquivos';
import { temaDoSom } from '../../src/audio/somDoTema';
import { criarNucleo } from '../../src/nucleo/nucleo';
import { cidadeDoMundo, definirEstiloMundo, ESTILO_PADRAO } from '../../src/world/chunk';
import { limparCidades } from '../../src/world/cidade';
import { limparPovoados, PROFISSOES } from '../../src/world/povoado';
import { celulasPlanejadas, definirObrasFeitas } from '../../src/world/obras';
import { Bloco } from '../../src/world/blocks';
import { COLHER_PEDREIRO, EXCLUSIVOS_CIDADE, receitaNoMundo } from '../../src/jogo/exclusivos';
import { itensDoCatalogo } from '../../src/jogo/catalogo';
import { idDoBloco } from '../../src/jogo/itens';
import { RECEITAS } from '../../src/jogo/receitas';
import { trocasDoMundo } from '../../src/jogo/trocas';
import { tesouro } from '../../src/jogo/conteineres';
import { dropsDoBloco } from '../../src/jogo/drops';
import { criarGerador } from '../../src/audio/variacao';
import type { Comando } from '../../src/nucleo/protocolo';
import { FROTA } from '../../src/jogo/veiculos';

/**
 * Spec 014, T11 ("Só na Cidade Grande" e "cada mundo é uma história", decisões do dono de
 * 12 nov 2026), as regras que o teste de tela `e2e/cidade-grande.spec.ts` confere no jogo:
 * - nenhum bloco, item, troca, receita, som ou veículo da cidade aparece em outro tema (nem no
 *   tesouro dos baús, nem no que um bloco solta, nem no núcleo e nos quadros);
 * - um mundo de outro tema abre sem nada do que a criança tinha na cidade (inventário e obras
 *   são do mundo); a fantasia ganha na obra é do personagem (o teste de tela confere).
 */
const CIDADE = obterTema('cidade-grande');
const OUTROS = temasDisponiveis()
  .filter((id) => id !== 'cidade-grande')
  .map((id) => obterTema(id));
const DA_CIDADE = new Set([...EXCLUSIVOS_CIDADE.blocos.map(idDoBloco), ...EXCLUSIVOS_CIDADE.itens]);
/**
 * Spec 026: o que é da cidade e não é do tema (a Vila Neon tem os blocos de rua da cidade, com
 * a pintura dela; a placa, o tapume, a escada de grade e a colher continuam só da cidade).
 */
function daCidadeSemSerDe(t: (typeof OUTROS)[number]): ReadonlySet<string> {
  const meus = new Set([
    ...(t.exclusivos?.blocos ?? []).map(idDoBloco),
    ...(t.exclusivos?.itens ?? []),
  ]);
  return new Set([...DA_CIDADE].filter((i) => !meus.has(i)));
}
/**
 * Temas ainda sem o pacote de som gravado (caem na reserva sintetizada, sem erro). Desde a T18
 * da spec 026 nenhum: a Vila Neon tem a trilha do bairro e o pacote do show (as vozes do bairro
 * são as sintetizadas do tema, sem pacote). Spec 027: a Noite das Fantasias até a T21 (a trilha
 * e os sons gravados da festa entram no índice lá; até então, a reserva sintetizada do tema).
 */
const SEM_PACOTE_AINDA: readonly string[] = ['noite-das-fantasias'];
const INDICE = JSON.parse(lerTexto('public/sons/indice.json')) as {
  temas: Record<string, Record<string, unknown>>;
  tamanhos: Record<string, number>;
};

afterEach(() => definirObrasFeitas([]));
afterAll(() => {
  definirObrasFeitas([]);
  definirEstiloMundo(ESTILO_PADRAO);
  limparCidades();
  limparPovoados();
});

describe('nada da cidade em outro tema', () => {
  it.each(OUTROS.map((t) => [t.id, t] as const))(
    '%s: sem bloco, item, troca, receita, tesouro nem som da cidade',
    (id, t) => {
      const DA_CIDADE = daCidadeSemSerDe(t);
      // criativo e livro de receitas
      const catalogo = itensDoCatalogo(t.mundo).map((d) => d.id);
      expect(catalogo.filter((i) => DA_CIDADE.has(i))).toEqual([]);
      for (const r of RECEITAS) {
        const usa = [
          ...(r.ingredientes ?? []),
          ...Object.values(r.chaves ?? {}),
          r.resultado.item,
        ].some((i) => DA_CIDADE.has(i));
        // receita com algo da cidade não existe fora dela
        if (usa) expect(receitaNoMundo(r, t.mundo), r.id).toBe(false);
      }
      // trocas de todos os moradores
      for (const p of PROFISSOES)
        for (const tr of trocasDoMundo(p, t.mundo)) {
          expect(DA_CIDADE.has(tr.receber.item), `${p} ${tr.id}`).toBe(false);
          for (const d of tr.dar) expect(DA_CIDADE.has(d.item), `${p} ${tr.id}`).toBe(false);
        }
      // o tesouro dos baús e o que os blocos de todo tema soltam
      definirEstiloMundo(t.mundo);
      for (let k = 0; k < 300; k++)
        for (const s of tesouro(k * 7, 40 + (k % 9), -k * 5, 1337))
          if (s) expect(DA_CIDADE.has(s.item), s.item).toBe(false);
      const rng = criarGerador(7);
      for (let b = 1; b < 84; b++)
        for (const d of dropsDoBloco(b, rng))
          expect(DA_CIDADE.has(d.item), `bloco ${b}`).toBe(false);
      // o planejador da cidade só existe na cidade
      limparCidades();
      expect(cidadeDoMundo(1337)).toBeNull();
      // os carrinhos e ônibus também (T13): o núcleo do outro tema não tem trânsito nenhum
      const n = criarNucleo({
        semente: 1337,
        modo: 'criativo',
        versaoMundo: 2,
        confiarNoCliente: true,
      });
      n.conectar('ana');
      n.passo();
      expect(n.estado.transito).toBeNull();
      expect(n.quadros().get('ana')!.veiculos).toBeUndefined();
      // sons: o pacote é o do próprio tema, sem os do canteiro nem os da rua
      expect(temaDoSom(id)).toBe(id);
      expect(t.natureza.cidade).toBeUndefined();
      if (SEM_PACOTE_AINDA.includes(id)) expect(INDICE.temas[id], id).toBeUndefined();
      else {
        expect(INDICE.temas[id], id).toBeDefined();
        expect(INDICE.temas[id]).not.toHaveProperty('obra');
        expect(INDICE.temas[id]).not.toHaveProperty('ambiente');
      }
    },
  );

  it('a cidade tem o que é dela (o filtro não apaga tudo)', () => {
    const catalogo = new Set(itensDoCatalogo(CIDADE.mundo).map((d) => d.id));
    for (const i of DA_CIDADE) expect(catalogo.has(i), i).toBe(true);
    // as trocas do pedreiro (tijolo, vidro, toldo e colher) só aparecem na cidade
    const daObra = trocasDoMundo('construtor', CIDADE.mundo).filter((t) => t.planta === 'cidade');
    expect(daObra.length).toBeGreaterThan(0);
    expect(daObra.some((t) => t.receber.item === COLHER_PEDREIRO)).toBe(true);
    expect(CIDADE.natureza.cidade?.buzininha).toBeGreaterThan(0);
    // a frota da cidade (T13)
    definirEstiloMundo(CIDADE.mundo);
    limparCidades();
    const n = criarNucleo({
      semente: 1337,
      modo: 'criativo',
      versaoMundo: 2,
      confiarNoCliente: true,
    });
    n.conectar('ana');
    n.passo();
    expect(n.estado.transito?.veiculos.length).toBe(FROTA.length);
    expect(n.quadros().get('ana')!.veiculos?.p?.length).toBe(FROTA.length);
    expect(INDICE.temas['cidade-grande']).toHaveProperty('obra');
    expect(INDICE.temas['cidade-grande']).toHaveProperty('ambiente');
    // os pacotes de som da cidade são só dela (nenhum outro tema baixa esses arquivos)
    const daCidade = Object.keys(INDICE.tamanhos).filter((a) => a.startsWith('cidade-grande-'));
    expect(daCidade.sort()).toEqual([
      'cidade-grande-musica.mp3',
      'cidade-grande-veiculos.mp3',
      'cidade-grande-vozes.mp3',
    ]);
    for (const t of OUTROS) expect(temaDoSom(t.id)).not.toBe('cidade-grande');
  });
});

describe('cada mundo é uma história', () => {
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

  function abrir(estilo: typeof ESTILO_PADRAO, dados?: Parameters<typeof criarNucleo>[0]['dados']) {
    definirEstiloMundo(estilo);
    limparCidades();
    limparPovoados();
    const n = criarNucleo({
      semente: 1337,
      modo: 'sobrevivencia',
      versaoMundo: 2,
      confiarNoCliente: true,
      depuracao: true,
      dados,
    });
    // como o servidor local do aparelho: o jogador do mundo salvo
    n.conectar('ana');
    n.passo();
    n.quadros();
    return n;
  }

  it('o que a criança tinha na cidade fica na cidade; o outro mundo abre sem nada dela', () => {
    const cidade = abrir(CIDADE.mundo);
    const ana = cidade.estado.jogadores.get('ana')!;
    // nasce ao lado do primeiro canteiro: a colher já chega
    expect(ana.inventario.contar(COLHER_PEDREIRO)).toBe(1);
    ana.inventario.definir(1, { item: idDoBloco(Bloco.TIJOLOS), qtd: 12 });
    ana.inventario.definir(2, { item: idDoBloco(Bloco.CONCRETO), qtd: 8 });
    ana.inventario.definir(3, { item: idDoBloco(Bloco.ASFALTO), qtd: 4 });
    const slot = ana.inventario.slots.findIndex((p) => p?.item === COLHER_PEDREIRO);
    for (const c of celulasPlanejadas(cidadeDoMundo(1337)!, 1)) {
      ana.saltoPermitido = true;
      cidade.comando('ana', tel(c.x + 0.5, c.y + 2, c.z + 0.5));
      cidade.comando('ana', {
        t: 'colocar',
        id: c.x * 1000 + c.y * 31 + c.z,
        x: c.x,
        y: c.y,
        z: c.z,
        bloco: c.bloco,
        meta: 0,
        slot,
      } as Comando);
    }
    cidade.passo();
    cidade.quadros();
    expect(cidade.obrasFeitas).toEqual([1]);
    const salvo = cidade.salvar();
    expect(JSON.stringify(salvo.extras['inventario'])).toContain(COLHER_PEDREIRO);

    // um mundo novo de outro tema (cada tema, um por um): nada da cidade
    for (const t of OUTROS) {
      const outro = abrir(t.mundo);
      const j = outro.estado.jogadores.get('ana')!;
      const daCidade = daCidadeSemSerDe(t);
      const tem = j.inventario.slots.filter((p) => p && daCidade.has(p.item));
      expect(tem, t.id).toEqual([]);
      expect(j.inventario.contar(idDoBloco(Bloco.TIJOLOS)), t.id).toBe(0);
      expect(outro.obrasFeitas, t.id).toEqual([]);
      expect('obras' in outro.salvar().extras, t.id).toBe(false);
      // passos depois, o pedreiro não aparece com a colher nesse mundo
      for (let k = 0; k < 40; k++) {
        outro.passo();
        outro.quadros();
      }
      expect(j.inventario.contar(COLHER_PEDREIRO), t.id).toBe(0);
    }

    // de volta à cidade (o mundo salvo dela): tudo como estava
    const volta = abrir(CIDADE.mundo, {
      versao: 1,
      edicoes: salvo.edicoes,
      jogador: null,
      hora: salvo.hora,
      extras: salvo.extras,
    } as never);
    expect(volta.obrasFeitas).toEqual([1]);
    const de = volta.estado.jogadores.get('ana')!.inventario;
    expect(de.contar(COLHER_PEDREIRO)).toBe(1);
    expect(de.contar(idDoBloco(Bloco.TIJOLOS))).toBe(12);
    expect(de.contar(idDoBloco(Bloco.CONCRETO))).toBe(8);
  });
});
