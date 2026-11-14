import { describe, expect, it } from 'vitest';
import {
  DESBLOQUEIOS,
  MAXIMO_DESBLOQUEIOS,
  aparenciaPadrao,
  aplicarCorpo,
  aplicarModelo,
  desbloquear,
  normalizarAparencia,
  personalizar,
  semDesbloqueios,
  temDesbloqueio,
  tirarFantasia,
  vestirFantasia,
} from '../../src/personagem/aparencia';
import {
  FANTASIAS,
  fantasiaDoTema,
  fantasiaLiberada,
  pecasVestidas,
} from '../../src/personagem/fantasias';
import {
  CHAVE_APARENCIA,
  carregarAparencia,
  salvarAparencia,
  type Armazenamento,
} from '../../src/personagem/persistencia';
import { fantasiaParaSugerir } from '../../src/ui/sugestaoFantasia';
import { sortearAparencia } from '../../src/ui/personagem';

function loja(): Armazenamento & { dados: Map<string, string> } {
  const dados = new Map<string, string>();
  return { dados, getItem: (k) => dados.get(k) ?? null, setItem: (k, v) => void dados.set(k, v) };
}

describe('desbloqueios do canteiro na aparência (spec 014)', () => {
  it('guarda os ids conhecidos e joga fora os outros, sem repetir', () => {
    const a = normalizarAparencia({
      modelo: 'andarilho',
      desbloqueios: ['colete-obra', 'foguete', 7, null, 'colete-obra', 'capacete-obra'],
    });
    expect(a.desbloqueios).toEqual(['colete-obra', 'capacete-obra']);
    expect(DESBLOQUEIOS).toEqual(['capacete-obra', 'colete-obra', 'caipira', 'peao-campeao']);
  });

  it('lista enorme fica no teto e o que não é lista vira nada', () => {
    const muitos = Array.from({ length: 500 }, (_, i) => DESBLOQUEIOS[i % 2]);
    const a = normalizarAparencia({ desbloqueios: muitos });
    expect(a.desbloqueios!.length).toBeLessThanOrEqual(MAXIMO_DESBLOQUEIOS);
    expect(a.desbloqueios).toEqual(['capacete-obra', 'colete-obra']);
    expect('desbloqueios' in normalizarAparencia({ desbloqueios: 'capacete-obra' })).toBe(false);
    expect('desbloqueios' in normalizarAparencia({ desbloqueios: { 0: 'capacete-obra' } })).toBe(
      false,
    );
  });

  it('aparência antiga (sem desbloqueios) sai exatamente igual, sem o campo', () => {
    const antiga = { ...aparenciaPadrao('tecela'), nome: 'Ana' };
    const n = normalizarAparencia(antiga);
    expect(n).toEqual(antiga);
    expect('desbloqueios' in n).toBe(false);
    expect('desbloqueios' in normalizarAparencia({ ...antiga, desbloqueios: [] })).toBe(false);
    expect('desbloqueios' in normalizarAparencia({ ...antiga, desbloqueios: ['x'] })).toBe(false);
  });

  it('desbloquear e temDesbloqueio', () => {
    const a = aparenciaPadrao();
    expect(temDesbloqueio(a, 'capacete-obra')).toBe(false);
    const b = desbloquear(a, 'capacete-obra');
    expect(b).not.toBe(a);
    expect(temDesbloqueio(b, 'capacete-obra')).toBe(true);
    expect(temDesbloqueio(b, 'colete-obra')).toBe(false);
    // repetido ou desconhecido: a mesma aparência
    expect(desbloquear(b, 'capacete-obra')).toBe(b);
    expect(desbloquear(b, 'nada')).toBe(b);
    expect(desbloquear(b, 'colete-obra').desbloqueios).toEqual(['capacete-obra', 'colete-obra']);
    // não veste sozinho
    expect(b.fantasia).toBeUndefined();
  });

  it('o que a criança ganhou fica com ela ao trocar modelo, corpo, peça, fantasia e no dado', () => {
    const a = desbloquear(aparenciaPadrao(), 'capacete-obra');
    const lista = ['capacete-obra'];
    expect(aplicarModelo(a, 'ferreiro').desbloqueios).toEqual(lista);
    expect(aplicarCorpo(a, 'feminino').desbloqueios).toEqual(lista);
    expect(personalizar(a, { roupaCor: 3 }).desbloqueios).toEqual(lista);
    expect(tirarFantasia(vestirFantasia(a, 'capacete-obra')).desbloqueios).toEqual(lista);
    expect(sortearAparencia(a, () => 0.4).desbloqueios).toEqual(lista);
    // sem nada ganho, nada aparece
    expect('desbloqueios' in aplicarModelo(aparenciaPadrao(), 'ferreiro')).toBe(false);
    expect('desbloqueios' in sortearAparencia(aparenciaPadrao(), () => 0.4)).toBe(false);
  });

  it('semDesbloqueios: o que vai pela rede é só o que está vestido', () => {
    const a = vestirFantasia(
      desbloquear(desbloquear(aparenciaPadrao(), 'capacete-obra'), 'colete-obra'),
      'colete-obra',
    );
    const rede = semDesbloqueios(a);
    expect('desbloqueios' in rede).toBe(false);
    expect(rede.fantasia).toEqual(a.fantasia);
    // a original não muda
    expect(a.desbloqueios).toEqual(['capacete-obra', 'colete-obra']);
    // sem o campo, devolve a mesma
    const sem = aparenciaPadrao();
    expect(semDesbloqueios(sem)).toBe(sem);
  });

  it('é do personagem: grava e volta junto da aparência', () => {
    const l = loja();
    salvarAparencia(l, desbloquear(aparenciaPadrao(), 'colete-obra'));
    expect(JSON.parse(l.dados.get(CHAVE_APARENCIA)!).aparencia.desbloqueios).toEqual([
      'colete-obra',
    ]);
    expect(carregarAparencia(l).desbloqueios).toEqual(['colete-obra']);
  });
});

describe('capacete e colete no catálogo da 017 (spec 014)', () => {
  const capacete = FANTASIAS.find((f) => f.id === 'capacete-obra')!;
  const colete = FANTASIAS.find((f) => f.id === 'colete-obra')!;

  it('são fantasias da Cidade Grande, trancadas até ganhar', () => {
    for (const f of [capacete, colete]) {
      expect(f.grupo).toBe('temas');
      expect(f.tema).toBe('cidade-grande');
      expect(DESBLOQUEIOS).toContain(f.desbloqueio);
      expect(fantasiaLiberada(f)).toBe(false);
      expect(fantasiaLiberada(f, [f.desbloqueio!])).toBe(true);
    }
    expect(capacete.desbloqueio).toBe('capacete-obra');
    expect(colete.desbloqueio).toBe('colete-obra');
    // as outras são livres
    for (const f of FANTASIAS.filter((x) => !x.desbloqueio)) expect(fantasiaLiberada(f)).toBe(true);
    expect(FANTASIAS.filter((x) => x.desbloqueio).map((x) => x.id)).toEqual([
      'capacete-obra',
      'colete-obra',
      'caipira',
      'peao-campeao',
    ]);
  });

  it('o colete vem com as duas peças (capacete e colete laranja)', () => {
    const tipos = pecasVestidas({ id: 'colete-obra', cor: 0 }, 'feminino').map((p) => p.tipo);
    expect(tipos).toEqual(expect.arrayContaining(['capacete-obra', 'colete-obra']));
    const doCapacete = pecasVestidas({ id: 'capacete-obra', cor: 0 }, 'masculino').map(
      (p) => p.tipo,
    );
    expect(doCapacete).toContain('capacete-obra');
    expect(doCapacete).not.toContain('colete-obra');
  });

  it('a sugestão do tema nunca oferece fantasia trancada', () => {
    expect(fantasiaDoTema('cidade-grande')).toBeUndefined();
    expect(fantasiaDoTema('cidade-grande', ['colete-obra'])?.id).toBe('colete-obra');
    expect(fantasiaDoTema('cidade-grande', ['capacete-obra', 'colete-obra'])?.id).toBe(
      'capacete-obra',
    );
    const l = loja();
    const a = aparenciaPadrao();
    expect(fantasiaParaSugerir(l, 'm1', true, 'cidade-grande', a)).toBeUndefined();
    // os outros temas continuam iguais
    expect(fantasiaDoTema('rancho-alegre')?.id).toBe('fazendeira');
    expect(fantasiaParaSugerir(l, 'm1', true, 'bruma-e-luz', a)?.id).toBe('lanterneira');
  });
});

describe('os prêmios do Rancho no catálogo da 017 (spec 023, T05)', () => {
  it('a Caipira da festa e o Peão campeão são do Rancho, trancados até a missão', () => {
    for (const id of ['caipira', 'peao-campeao'] as const) {
      const f = FANTASIAS.find((x) => x.id === id)!;
      expect(f.tema).toBe('rancho-alegre');
      expect(f.desbloqueio).toBe(id);
      expect(fantasiaLiberada(f)).toBe(false);
      expect(fantasiaLiberada(f, [id])).toBe(true);
    }
    // o acabamento: a camisa bordada, o chapéu da festa e a estrela do peão
    const caipira = pecasVestidas({ id: 'caipira', cor: 0 }, 'feminino').map((p) => p.tipo);
    expect(caipira).toEqual(expect.arrayContaining(['camisa-festa', 'chapeu-festa', 'remendos']));
    const peao = pecasVestidas({ id: 'peao-campeao', cor: 0 }, 'masculino').map((p) => p.tipo);
    expect(peao).toEqual(expect.arrayContaining(['estrela-peao', 'chapeu-peao', 'fivela-campeao']));
    // a sugestão do Rancho continua a fazendeira (livre), nunca um prêmio trancado
    expect(fantasiaDoTema('rancho-alegre')?.id).toBe('fazendeira');
  });

  it('cabem todos os prêmios (teto 32) e a aparência guarda os do Rancho', () => {
    expect(MAXIMO_DESBLOQUEIOS).toBe(32);
    const a = desbloquear(desbloquear(aparenciaPadrao(), 'caipira'), 'peao-campeao');
    expect(temDesbloqueio(a, 'caipira')).toBe(true);
    expect(normalizarAparencia(a).desbloqueios).toEqual(['caipira', 'peao-campeao']);
  });
});
