import { describe, expect, it } from 'vitest';
import {
  armazemMemoria,
  criarRepositorioMundos,
  FORMATO_MUNDOS,
  limparNomeMundo,
  mundoParaAbrir,
  normalizarDados,
  sementeDeTexto,
  type MetaMundo,
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

  it('todo mundo novo nasce com o tema gravado (sem pedido, a Vila Neon)', async () => {
    // spec 034: nenhum mundo novo fica sem tema
    const { r } = repo();
    expect((await r.criar('Sem pedido', 1, 'criativo')).tema).toBe('vila-neon');
    expect((await r.criar('Vazio', 2, 'criativo', '')).tema).toBe('vila-neon');
    expect((await r.criar('Doce', 3, 'criativo', 'doce-reino')).tema).toBe('doce-reino');
    expect((await r.listar()).every((m) => !!m.tema)).toBe(true);
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

  it('o salvar automático do mundo aberto não apaga o mundo que acabou de ser criado', async () => {
    // spec 034 (T14): num aparelho lento, o salvar lia o índice, demorava e regravava por cima
    // do mundo novo; a página nova não achava o mundo e abria o "Meu primeiro mundo"
    const base = armazemMemoria();
    const lento = {
      ...base,
      obter: async (k: string) => {
        const v = await base.obter(k);
        await new Promise((r) => setTimeout(r, 5));
        return v;
      },
      gravar: async (k: string, v: unknown) => {
        await new Promise((r) => setTimeout(r, 5));
        await base.gravar(k, v);
      },
    };
    let t = 1000;
    const r = criarRepositorioMundos(lento, () => (t += 10));
    const primeiro = await r.criar('Meu primeiro mundo', 1, 'criativo');
    const salvando = [1, 2, 3].map((i) =>
      r.salvar(primeiro.id, { ...normalizarDados({}), relogio: i } as never, `foto${i}`),
    );
    const novo = r.criar('Sítio', 2, 'sobrevivencia', 'rancho-alegre');
    const renomeando = r.renomear(primeiro.id, 'Casa');
    await Promise.all([...salvando, novo, renomeando]);
    const m = await novo;
    expect(await r.obter(m.id)).toMatchObject({ nome: 'Sítio', tema: 'rancho-alegre' });
    expect(await r.obter(primeiro.id)).toMatchObject({ nome: 'Casa', miniatura: 'foto3' });
    expect((await r.listar()).map((x) => x.id).sort()).toEqual([primeiro.id, m.id].sort());
  });

  it('excluir logo depois de um salvar lento não deixa dados sem mundo', async () => {
    const base = armazemMemoria();
    // os dados do mundo demoram mais para gravar que o índice
    const lento = {
      ...base,
      gravar: async (k: string, v: unknown) => {
        await new Promise((r) => setTimeout(r, k.startsWith('mundo:') ? 25 : 5));
        await base.gravar(k, v);
      },
    };
    const r = criarRepositorioMundos(lento);
    const m = await r.criar('Some', 1, 'criativo');
    const salvando = r.salvar(m.id, normalizarDados({}), 'foto');
    const excluindo = r.excluir(m.id);
    await Promise.all([salvando, excluindo]);
    expect(await r.obter(m.id)).toBeNull();
    expect(base.dados.has(`mundo:${m.id}`)).toBe(false);
  });

  it('um erro no meio não trava a fila do índice', async () => {
    const base = armazemMemoria();
    let falhar = true;
    const r = criarRepositorioMundos({
      ...base,
      gravar: async (k: string, v: unknown) => {
        if (falhar && k === 'mundos') {
          falhar = false;
          throw new Error('cheio');
        }
        await base.gravar(k, v);
      },
    });
    await expect(r.criar('Falha', 1, 'criativo')).rejects.toThrow('cheio');
    const ok = await r.criar('Depois', 2, 'criativo');
    expect((await r.listar()).map((x) => x.id)).toEqual([ok.id]);
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

describe('spec 034: os mundos dos quatro temas que saíram', () => {
  const NOVE = [
    'bruma-e-luz',
    'planeta-vivo',
    'mata-encantada',
    'era-dos-dinos',
    'vila-neon',
    'cidade-grande',
    'rancho-alegre',
    'doce-reino',
    'exploracao-lunar',
  ];
  const meta = (id: string, tema: unknown, extra: Partial<MetaMundo> = {}): MetaMundo =>
    ({
      id,
      nome: `Mundo ${id}`,
      semente: 1,
      modo: 'criativo',
      criadoEm: 1,
      jogadoEm: 100 - id.length,
      versao: 2,
      ...(tema === undefined ? {} : { tema }),
      ...extra,
    }) as MetaMundo;

  /** Um aparelho com um mundo de cada um dos nove temas, sem tema, estranho e da nuvem. */
  async function aparelho() {
    const operacoes: string[] = [];
    const base = armazemMemoria();
    const armazem = {
      ...base,
      gravar: async (k: string, v: unknown) => {
        operacoes.push(`gravar ${k}`);
        await base.gravar(k, v);
      },
      remover: async (k: string) => {
        operacoes.push(`remover ${k}`);
        await base.remover(k);
      },
    };
    const lista = [
      ...NOVE.map((t) => meta(t, t)),
      meta('sem-tema', undefined),
      meta('tema-vazio', ''),
      meta('tema-numero', 7),
      meta('estranho', 'tema-que-nao-existe'),
      meta('nuvem-dinos', 'era-dos-dinos', { nuvem: 'ABCD-EFGH-12' }),
      meta('nuvem-doce', 'doce-reino', { nuvem: 'WXYZ-QRST-34' }),
      meta('nuvem-sem-tema', undefined, { nuvem: 'JKLM-NOPQ-56' }),
    ];
    await base.gravar('formato', FORMATO_MUNDOS);
    await base.gravar('mundos', lista);
    for (const m of lista) await base.gravar(`mundo:${m.id}`, { versao: 1, edicoes: {} });
    return { base, operacoes, r: criarRepositorioMundos(armazem, () => 5000) };
  }

  it('saem os quatro, os sem tema e as entradas da nuvem deles; ficam os cinco e o estranho', async () => {
    const { base, operacoes, r } = await aparelho();
    expect(await r.prepararFormato()).toBe(0);
    const saiu = await r.apagarTemasQueSairam();
    expect(saiu.sort()).toEqual(
      [
        'bruma-e-luz',
        'planeta-vivo',
        'mata-encantada',
        'era-dos-dinos',
        'sem-tema',
        'tema-vazio',
        'tema-numero',
        'nuvem-dinos',
        'nuvem-sem-tema',
      ].sort(),
    );
    const ficaram = (await r.listar()).map((m) => m.id).sort();
    expect(ficaram).toEqual(
      [
        'vila-neon',
        'cidade-grande',
        'rancho-alegre',
        'doce-reino',
        'exploracao-lunar',
        'estranho',
        'nuvem-doce',
      ].sort(),
    );
    for (const id of saiu) expect(base.dados.has(`mundo:${id}`), id).toBe(false);
    for (const id of ficaram) expect(base.dados.has(`mundo:${id}`), id).toBe(true);
    // o índice primeiro, depois os dados; o formato não muda (mudar apagaria todos)
    const indice = operacoes.indexOf('gravar mundos');
    expect(indice).toBeGreaterThanOrEqual(0);
    expect(operacoes.slice(0, indice).some((o) => o.startsWith('remover'))).toBe(false);
    expect(operacoes.filter((o) => o.startsWith('remover'))).toHaveLength(saiu.length);
    expect(operacoes).not.toContain('gravar formato');
    expect(await base.obter('formato')).toBe(FORMATO_MUNDOS);
  });

  it('rodar de novo não muda nada', async () => {
    const { operacoes, r } = await aparelho();
    await r.apagarTemasQueSairam();
    const antes = operacoes.length;
    expect(await r.apagarTemasQueSairam()).toEqual([]);
    expect(operacoes).toHaveLength(antes);
  });

  it('o mundo aberto que saiu dá lugar ao próximo, ou ao "Meu primeiro mundo" na Vila Neon', async () => {
    const { r } = await aparelho();
    await r.apagarTemasQueSairam();
    // o pedido (?mundo=bruma-e-luz) não existe mais: abre o mais recente que ficou
    expect(await r.obter('bruma-e-luz')).toBeNull();
    const proximo = await mundoParaAbrir(r);
    expect(proximo.nuvem).toBeUndefined();
    expect(proximo.tema).not.toBe('bruma-e-luz');
    expect((await r.listar()).map((m) => m.id)).toContain(proximo.id);
    // um aparelho só com mundos que saíram fica vazio e ganha o primeiro mundo na Vila Neon
    const so = armazemMemoria();
    await so.gravar('formato', FORMATO_MUNDOS);
    await so.gravar('mundos', [meta('a', 'mata-encantada'), meta('b', undefined)]);
    const r2 = criarRepositorioMundos(so);
    expect((await r2.apagarTemasQueSairam()).sort()).toEqual(['a', 'b']);
    const primeiro = await mundoParaAbrir(r2);
    expect(primeiro).toMatchObject({ nome: 'Meu primeiro mundo', tema: 'vila-neon' });
  });
});
