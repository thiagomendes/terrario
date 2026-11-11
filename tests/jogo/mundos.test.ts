import { describe, expect, it } from 'vitest';
import {
  armazemMemoria,
  criarRepositorioMundos,
  limparNomeMundo,
  normalizarDados,
  sementeDeTexto,
} from '../../src/jogo/mundos';

function repo() {
  let t = 1000;
  const armazem = armazemMemoria();
  return { armazem, r: criarRepositorioMundos(armazem, () => (t += 10)) };
}

describe('repositório de mundos', () => {
  it('cria, lista do mais recente ao mais antigo e carrega dados vazios', async () => {
    const { r } = repo();
    const a = await r.criar('Vale', 42, 'criativo');
    const b = await r.criar('  Serra   alta ', 7, 'sobrevivencia');
    expect(b.nome).toBe('Serra alta');
    expect(a.id).not.toBe(b.id);
    expect((await r.listar()).map((m) => m.id)).toEqual([b.id, a.id]);
    const d = await r.carregar(a.id);
    expect(d.edicoes).toEqual({});
    expect(d.jogador).toBeNull();
  });

  it('salvar grava os dados, atualiza a data e o último mundo', async () => {
    const { r } = repo();
    const a = await r.criar('A', 1, 'criativo');
    await r.criar('B', 2, 'criativo');
    const dados = {
      versao: 1 as const,
      edicoes: { '0,0': [[1, 2, 3, 4]] } as never,
      jogador: { x: 1, y: 30, z: 2, yaw: 0.5, pitch: 0.1 },
      hora: 0.4,
      extras: { vida: 7 },
    };
    await r.salvar(a.id, dados, 'data:image/jpeg;base64,xx');
    expect((await r.ultimo())!.id).toBe(a.id);
    expect((await r.obter(a.id))!.miniatura).toContain('jpeg');
    expect(await r.carregar(a.id)).toEqual(dados);
  });

  it('renomeia, exclui e ignora ids desconhecidos', async () => {
    const { r, armazem } = repo();
    const a = await r.criar('A', 1, 'criativo');
    await r.renomear(a.id, '   ');
    expect((await r.obter(a.id))!.nome).toBe('A');
    await r.renomear(a.id, 'Ilha');
    expect((await r.obter(a.id))!.nome).toBe('Ilha');
    await r.renomear('nao-existe', 'x');
    await r.excluir(a.id);
    expect(await r.listar()).toEqual([]);
    expect(armazem.dados.has(`mundo:${a.id}`)).toBe(false);
  });
});

describe('dados e nomes', () => {
  it('normaliza lixo e jogador incompleto', () => {
    expect(normalizarDados(null).hora).toBe(-1);
    expect(normalizarDados({ jogador: { x: 1 } }).jogador).toBeNull();
    expect(normalizarDados({ hora: 0.3, extras: 5 })).toMatchObject({ hora: 0.3, extras: {} });
  });

  it('semente: inteiro literal, texto por hash estável e vazio pela reserva', () => {
    expect(sementeDeTexto('123', () => 0)).toBe(123);
    expect(sementeDeTexto('bruma', () => 0)).toBe(sementeDeTexto('bruma', () => 0.9));
    expect(sementeDeTexto('bruma', () => 0)).not.toBe(sementeDeTexto('luz', () => 0));
    expect(sementeDeTexto('', () => 0.5)).toBe(Math.floor(0.5 * 2147483647));
  });

  it('limita o nome do mundo', () => {
    expect(limparNomeMundo('x'.repeat(50))).toHaveLength(32);
    expect(limparNomeMundo(3)).toBe('Novo mundo');
  });
});

/** Spec 016 (decisão do dono, 11 nov 2026): os mundos de antes são apagados uma vez. */
describe('formato dos mundos do aparelho', () => {
  it('aparelho com mundos de antes: só os mundos saem (uma vez); o resto fica', async () => {
    const { armazem, r } = repo();
    // como o jogo de antes gravava: índice e dados, sem marca de formato
    await armazem.gravar('mundos', [
      { id: 'a', nome: 'Velho', semente: 1, modo: 'criativo', criadoEm: 1, jogadoEm: 1 },
      {
        id: 'b',
        nome: 'Outro',
        semente: 2,
        modo: 'criativo',
        criadoEm: 1,
        jogadoEm: 2,
        nuvem: 'X',
      },
      null,
    ]);
    await armazem.gravar('mundo:a', { versao: 1, edicoes: { '0,0': [[1, 7]] } });
    await armazem.gravar('mundo:b', { versao: 1, edicoes: {} });
    await armazem.gravar('outra-coisa', { fica: true });
    expect(await r.prepararFormato()).toBe(2);
    expect(await r.listar()).toEqual([]);
    expect(armazem.dados.has('mundo:a')).toBe(false);
    expect(armazem.dados.has('mundo:b')).toBe(false);
    expect(await armazem.obter('outra-coisa')).toEqual({ fica: true });
    // o mundo novo fica, e a limpeza não acontece de novo
    const novo = await r.criar('Novo', 3, 'criativo');
    expect(await r.prepararFormato()).toBe(0);
    expect((await r.listar()).map((m) => m.id)).toEqual([novo.id]);
  });

  it('aparelho novo: nada a apagar, sem aviso', async () => {
    const { r } = repo();
    expect(await r.prepararFormato()).toBe(0);
    const m = await r.criar('Primeiro', 1, 'criativo');
    expect(await r.prepararFormato()).toBe(0);
    expect((await r.listar()).map((x) => x.id)).toEqual([m.id]);
  });

  it('índice com lixo não trava a limpeza', async () => {
    const { armazem, r } = repo();
    await armazem.gravar('mundos', 'lixo');
    expect(await r.prepararFormato()).toBe(0);
    expect(await r.listar()).toEqual([]);
  });
});
