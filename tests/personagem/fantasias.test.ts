import { describe, expect, it } from 'vitest';
import {
  CORPOS,
  aparenciaPadrao,
  aplicarCorpo,
  alternarPecaDaFantasia,
  normalizarAparencia,
  personalizar,
  tirarFantasia,
  trocarCorDaFantasia,
  vestirFantasia,
  type Aparencia,
} from '../../src/personagem/aparencia';
import {
  FANTASIAS,
  GRUPOS_FANTASIA,
  corDaPeca,
  fantasiaDoTema,
  fantasiasDoGrupo,
  pecasVestidas,
  rotuloDaFantasia,
  temasDasFantasias,
} from '../../src/personagem/fantasias';
import {
  carregarAparencia,
  salvarAparencia,
  type Armazenamento,
} from '../../src/personagem/persistencia';
import { sanear, sanearAparencia } from '../../src/nucleo/saneamento';
import { criarNucleo, INTERVALO_APARENCIA } from '../../src/nucleo/nucleo';
import { PASSO } from '../../src/nucleo/protocolo';
import type { IdTema } from '../../src/temas/tipos';

const TEMAS: IdTema[] = [
  'doce-reino',
  'exploracao-lunar',
  'rancho-alegre',
  'cidade-grande',
  'vila-neon',
];

function memoria(): Armazenamento & { dados: Map<string, string> } {
  const dados = new Map<string, string>();
  return { dados, getItem: (k) => dados.get(k) ?? null, setItem: (k, v) => void dados.set(k, v) };
}

describe('catálogo das fantasias', () => {
  it('ids únicos, grupos conhecidos e abas na ordem fixa', () => {
    expect(new Set(FANTASIAS.map((f) => f.id)).size).toBe(FANTASIAS.length);
    expect(GRUPOS_FANTASIA).toEqual(['realeza', 'herois', 'temas']);
    for (const f of FANTASIAS) expect(GRUPOS_FANTASIA).toContain(f.grupo);
    expect(fantasiasDoGrupo('realeza')).toHaveLength(4);
    expect(fantasiasDoGrupo('herois')).toHaveLength(4);
  });

  it('cada fantasia tem os dois nomes, 3 a 5 cores e peças nos dois corpos', () => {
    for (const f of FANTASIAS) {
      for (const c of CORPOS) {
        expect(f.nomes[c].length, f.id).toBeGreaterThan(0);
        expect(f.visual[c].pecas.length, f.id).toBeGreaterThan(0);
      }
      expect(f.cores.length, f.id).toBeGreaterThanOrEqual(3);
      expect(f.cores.length, f.id).toBeLessThanOrEqual(5);
      for (const cor of [...f.cores, f.corEmblema]) expect(cor).toMatch(/^#[0-9a-f]{6}$/);
      for (const c of CORPOS)
        for (const p of f.visual[c].pecas)
          expect(
            ['principal', 'clara', 'escura', 'emblema'].includes(p.cor) ||
              /^#[0-9a-f]{6}$/.test(p.cor),
          ).toBe(true);
    }
  });

  it('Realeza: princesa só no feminino, príncipe sem saia no masculino', () => {
    for (const f of fantasiasDoGrupo('realeza')) {
      expect(f.nomes.feminino).toMatch(/^Princesa /);
      expect(f.nomes.masculino).toMatch(/^Príncipe /);
      const fem = f.visual.feminino.pecas.map((p) => p.tipo);
      const mas = f.visual.masculino.pecas.map((p) => p.tipo);
      expect(fem).toContain('saia-camadas');
      expect(mas).not.toContain('saia-camadas');
      expect(mas).toEqual(expect.arrayContaining(['casaco-faixa', 'capa-curta', 'coroa']));
    }
    for (const f of FANTASIAS) {
      expect(f.nomes.masculino).not.toMatch(/Princesa|Heroína/);
      expect(f.nomes.feminino).not.toMatch(/Príncipe|Herói /);
    }
  });

  it('nomes pelo corpo, como no esboço', () => {
    expect(rotuloDaFantasia('heroi-relampago', 'feminino')).toBe('Heroína Relâmpago');
    expect(rotuloDaFantasia('heroi-relampago', 'masculino')).toBe('Herói Relâmpago');
    expect(rotuloDaFantasia({ id: 'realeza-estrelas', cor: 0 }, 'masculino')).toBe(
      'Príncipe das Estrelas',
    );
    expect(rotuloDaFantasia('confeiteira', 'masculino')).toBe('Confeiteiro');
    expect(rotuloDaFantasia('nao-existe', 'feminino')).toBe('');
  });

  it('fantasias dos temas: tema real e todos os 5 temas cobertos', () => {
    const temas = fantasiasDoGrupo('temas');
    for (const f of temas) expect(TEMAS).toContain(f.tema);
    for (const f of FANTASIAS.filter((x) => x.grupo !== 'temas')) expect(f.tema).toBeUndefined();
    expect(new Set(temas.map((f) => f.tema))).toEqual(new Set(TEMAS));
    expect(fantasiaDoTema('rancho-alegre')?.id).toBe('fazendeira');
  });

  it('em "Dos temas" o tema do mundo aberto vem primeiro', () => {
    const lista = fantasiasDoGrupo('temas', 'exploracao-lunar');
    expect(lista[0].id).toBe('astronauta');
    expect(lista).toHaveLength(fantasiasDoGrupo('temas').length);
    const rancho = fantasiasDoGrupo('temas', 'rancho-alegre').map((f) => f.id);
    expect(rancho.slice(0, 2)).toEqual(['fazendeira', 'vaqueira']);
    expect(temasDasFantasias('doce-reino')[0]).toBe('doce-reino');
    expect(new Set(temasDasFantasias()).size).toBe(5);
    // as outras abas não mudam de ordem
    expect(fantasiasDoGrupo('herois', 'rancho-alegre')).toEqual(fantasiasDoGrupo('herois'));
  });

  it('cores das peças saem da cor principal escolhida', () => {
    const f = { id: 'heroi-relampago', cor: 1 };
    expect(corDaPeca(f, 'principal')).toBe('#7a3ad8');
    expect(corDaPeca(f, 'emblema')).toBe('#ffd45a');
    expect(corDaPeca(f, '#123456')).toBe('#123456');
    expect(corDaPeca(f, 'clara')).not.toBe(corDaPeca(f, 'escura'));
  });
});

describe('fantasia na aparência', () => {
  const minha: Aparencia = {
    ...aparenciaPadrao('herbolaria'),
    nome: 'Lia',
    roupaEstilo: 8,
    roupaCor: 5,
    calcaCor: 3,
    acessorio: 'coroa-flores',
  };

  it('vestir não troca quem a criança é; tirar volta exatamente ao de antes', () => {
    const vestida = vestirFantasia(minha, 'heroi-estrela');
    expect(vestida.fantasia).toEqual({ id: 'heroi-estrela', cor: 0 });
    const { fantasia, ...resto } = vestida;
    expect(fantasia).toBeDefined();
    expect(resto).toEqual(minha);
    const outra = trocarCorDaFantasia(alternarPecaDaFantasia(vestida, 'capa'), 2);
    expect(tirarFantasia(outra)).toEqual(minha);
    expect('fantasia' in tirarFantasia(outra)).toBe(false);
  });

  it('trocar a cor fica na paleta; id desconhecido tira a fantasia', () => {
    const v = vestirFantasia(minha, 'realeza-neve');
    expect(trocarCorDaFantasia(v, 3).fantasia?.cor).toBe(3);
    expect(trocarCorDaFantasia(v, 9).fantasia?.cor).toBe(0);
    expect(vestirFantasia(v, 'teia').fantasia).toBeUndefined();
  });

  it('tirar e recolocar peças opcionais (as obrigatórias não saem)', () => {
    const v = vestirFantasia(minha, 'heroi-relampago');
    const semCapa = alternarPecaDaFantasia(v, 'capa');
    expect(semCapa.fantasia?.sem).toEqual(['capa']);
    expect(pecasVestidas(semCapa.fantasia!, 'feminino').map((p) => p.tipo)).not.toContain('capa');
    expect(alternarPecaDaFantasia(semCapa, 'capa').fantasia?.sem).toBeUndefined();
    expect(alternarPecaDaFantasia(v, 'emblema').fantasia?.sem).toBeUndefined();
  });

  it('personalizar: cabelo mantém a fantasia; roupa, calça e enfeite tiram', () => {
    const v = vestirFantasia(minha, 'realeza-flores', 2);
    const cabelo = personalizar(v, { cabeloCor: 7 });
    expect(cabelo.fantasia).toEqual(v.fantasia);
    expect(cabelo.cabeloCor).toBe(7);
    for (const m of [
      { roupaCor: 1 },
      { calcaCor: 0 },
      { acessorio: 'chapeu' as const },
      { roupaEstilo: 6 },
    ]) {
      const r = personalizar(v, m);
      expect(r.fantasia).toBeUndefined();
      expect(r).toEqual({ ...minha, ...m });
    }
  });

  it('trocar o corpo mantém a fantasia e o nome acompanha', () => {
    const v = vestirFantasia(minha, 'realeza-mar');
    const m = normalizarAparencia(aplicarCorpo(v, 'masculino'));
    expect(m.fantasia?.id).toBe('realeza-mar');
    expect(rotuloDaFantasia(m.fantasia!, m.corpo)).toBe('Príncipe do Mar');
  });

  it('normalizar: aparência antiga sai igual, sem o campo fantasia', () => {
    const antiga = JSON.parse(JSON.stringify(minha));
    const r = normalizarAparencia(antiga);
    expect(r).toEqual(minha);
    expect('fantasia' in r).toBe(false);
  });

  it('normalizar: id desconhecido, cor fora da paleta e lixo', () => {
    const n = (fantasia: unknown) => normalizarAparencia({ ...minha, fantasia }).fantasia;
    expect(n({ id: 'teia', cor: 0 })).toBeUndefined();
    expect(n('heroi-estrela')).toBeUndefined();
    expect(n(null)).toBeUndefined();
    expect(n([1])).toBeUndefined();
    expect(n({ id: 'heroi-estrela', cor: 99 })).toEqual({ id: 'heroi-estrela', cor: 0 });
    expect(n({ id: 'heroi-estrela', cor: -1 })).toEqual({ id: 'heroi-estrela', cor: 0 });
    expect(n({ id: 'heroi-estrela', cor: 1.5 })).toEqual({ id: 'heroi-estrela', cor: 0 });
    expect(n({ id: 'heroi-estrela', cor: '2' })).toEqual({ id: 'heroi-estrela', cor: 0 });
    expect(n({ id: 'heroi-estrela', cor: 3, sem: ['capa', 'emblema', 'x', 5], extra: 1 })).toEqual({
      id: 'heroi-estrela',
      cor: 3,
      sem: ['capa'],
    });
  });

  it('salva e carrega a fantasia; fechar e abrir e depois tirar volta ao de antes', () => {
    const a = memoria();
    const v = alternarPecaDaFantasia(vestirFantasia(minha, 'astronauta', 1), 'traje-espacial');
    salvarAparencia(a, vestirFantasia(minha, 'astronauta', 1));
    const lida = carregarAparencia(a);
    expect(lida.fantasia).toEqual({ id: 'astronauta', cor: 1 });
    expect(tirarFantasia(lida)).toEqual(minha);
    // o traje do astronauta não é opcional
    expect(v.fantasia?.sem).toBeUndefined();
  });

  it('salvo antigo (sem fantasia) abre igual', () => {
    const a = memoria();
    a.setItem('terrario:aparencia', JSON.stringify({ versao: 1, aparencia: minha }));
    const lida = carregarAparencia(a);
    expect(lida).toEqual(minha);
    expect('fantasia' in lida).toBe(false);
  });
});

describe('fantasia no multijogador', () => {
  it('saneamento do comando aparencia passa a fantasia a limpo', () => {
    const ok = sanear({
      t: 'aparencia',
      aparencia: { ...minhaRede(), fantasia: { id: 'heroi-mata', cor: 2 } },
    });
    expect((ok as unknown as { aparencia: Aparencia }).aparencia.fantasia).toEqual({
      id: 'heroi-mata',
      cor: 2,
    });
    const ruim = sanear({
      t: 'aparencia',
      aparencia: { ...minhaRede(), fantasia: { id: 'morcego', cor: 0 } },
    });
    expect((ruim as unknown as { aparencia: Aparencia }).aparencia.fantasia).toBeUndefined();
    const cor = sanear({ t: 'aparencia', aparencia: { fantasia: { id: 'astronauta', cor: 40 } } });
    expect((cor as unknown as { aparencia: Aparencia }).aparencia.fantasia).toEqual({
      id: 'astronauta',
      cor: 0,
    });
    expect(sanear({ t: 'aparencia', aparencia: [] })).toBeNull();
    expect(sanear({ t: 'aparencia', aparencia: { nome: 'x'.repeat(5000) } })).toBeNull();
    expect(sanearAparencia(undefined)).toBeNull();
  });

  it('na nuvem a fantasia chega ao amigo passada a limpo', () => {
    const n = criarNucleo({
      semente: 7,
      modo: 'criativo',
      versaoMundo: 2,
      confiarNoCliente: false,
      dados: { versao: 1, edicoes: {}, jogador: null, hora: 0.5, extras: {} },
    } as Parameters<typeof criarNucleo>[0]);
    n.conectar('ana', { perfil: { apelido: 'Ana', aparencia: {} } });
    n.conectar('bia', { perfil: { apelido: 'Bia', aparencia: {} } });
    n.comando('ana', {
      t: 'aparencia',
      aparencia: { ...minhaRede(), fantasia: { id: 'realeza-estrelas', cor: 77, sem: ['coroa'] } },
    });
    n.passo();
    const perfil = n.estado.jogadores.get('ana')!.perfil.aparencia as unknown as Aparencia;
    expect(perfil.fantasia).toEqual({ id: 'realeza-estrelas', cor: 0, sem: ['coroa'] });
    n.comando('ana', {
      t: 'aparencia',
      aparencia: { ...minhaRede(), fantasia: { id: 'teia', cor: 0 } },
    });
    // a segunda logo depois espera a janela do limite (auditoria 017) e entra quando ela fecha
    for (let i = 0; i * PASSO < INTERVALO_APARENCIA + PASSO; i++) n.passo();
    const sem = n.estado.jogadores.get('ana')!.perfil.aparencia as unknown as Aparencia;
    expect(sem.fantasia).toBeUndefined();
    expect(sem.nome).toBe('Lia');
  });
});

function minhaRede(): Record<string, unknown> {
  return { ...aparenciaPadrao('herbolaria'), nome: 'Lia' };
}
