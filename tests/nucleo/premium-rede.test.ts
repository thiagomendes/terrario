import { describe, expect, it } from 'vitest';
import { criarNucleo, type Nucleo } from '../../src/nucleo/nucleo';
import { sanear, sanearAparencia } from '../../src/nucleo/saneamento';
import type { Comando } from '../../src/nucleo/protocolo';
import { aparenciaPadrao, normalizarAparencia } from '../../src/personagem/aparencia';

/**
 * Spec 023 (T10): o premium vestido vai pela rede na aparência (como a fantasia): o amigo vê o
 * mesmo. O núcleo só deixa passar ids do catálogo, cada um na sua categoria; na nuvem, o
 * comando passa pelo saneamento (como no servidor) e o lixo sai.
 */
type Modo = 'local' | 'nuvem';

function montar(modo: Modo): { n: Nucleo; quem: string; ve: string; confiar: boolean } {
  const confiar = modo === 'local';
  const n = criarNucleo({ semente: 7, modo: 'criativo', versaoMundo: 2, confiarNoCliente: confiar });
  n.conectar('ana', { perfil: { apelido: 'Ana', aparencia: {} } });
  n.conectar('bia', { perfil: { apelido: 'Bia', aparencia: {} } });
  n.passo();
  n.quadros();
  return { n, quem: 'ana', ve: 'bia', confiar };
}

function mandar(n: Nucleo, quem: string, c: unknown, confiar: boolean): void {
  if (confiar) return n.comando(quem, c as Comando);
  const s = sanear(c);
  if (s) n.comando(quem, s);
}

function vistaPor(n: Nucleo, quem: string, ve: string): Record<string, unknown> | undefined {
  for (let i = 0; i < 40; i++) {
    n.passo();
    const a = n.quadros().get(ve)?.perfis?.[quem]?.aparencia;
    if (a) return a;
  }
  return undefined;
}

describe('premium na aparência (normalizar)', () => {
  it('só ids do catálogo, cada um na categoria dele', () => {
    const a = normalizarAparencia({
      ...aparenciaPadrao(),
      premium: {
        roupa: 'tenis-cometa',
        costas: 'unicornio',
        fantasia: 'dragao',
        bicho: 'unicornio',
        chapeu: 'coroa',
      },
    });
    expect(a.premium).toEqual({ roupa: 'tenis-cometa', fantasia: 'dragao', bicho: 'unicornio' });
  });
  it('sem nenhum premium, o campo não existe (as aparências de antes saem iguais)', () => {
    expect('premium' in normalizarAparencia({ ...aparenciaPadrao(), premium: {} })).toBe(false);
    expect('premium' in normalizarAparencia({ ...aparenciaPadrao(), premium: 'x' })).toBe(false);
    expect('premium' in normalizarAparencia(aparenciaPadrao())).toBe(false);
  });
  it('o dragãozinho não veste pelo campo da fantasia (só pelo premium)', () => {
    const a = normalizarAparencia({ ...aparenciaPadrao(), fantasia: { id: 'dragao', cor: 0 } });
    expect(a.fantasia).toBeUndefined();
  });
  it('o saneamento guarda o premium e continua com o limite de 4096', () => {
    const s = sanearAparencia({ ...aparenciaPadrao(), premium: { bicho: 'pinguim', x: 1 } });
    expect(s?.premium).toEqual({ bicho: 'pinguim' });
    expect(sanearAparencia({ premium: { roupa: 'x'.repeat(5000) } })).toBeNull();
  });
});

describe.each<Modo>(['local', 'nuvem'])('premium pela rede (%s)', (modo) => {
  it('o amigo vê o premium vestido', () => {
    const { n, quem, ve, confiar } = montar(modo);
    const premium = { roupa: 'camiseta-arco-iris', costas: 'capa-estrelas', bicho: 'unicornio' };
    mandar(n, quem, { t: 'aparencia', aparencia: { ...aparenciaPadrao(), premium } }, confiar);
    expect(vistaPor(n, quem, ve)?.premium).toEqual(premium);
  });
  it('o que não é do catálogo não chega ao amigo', () => {
    const { n, quem, ve, confiar } = montar(modo);
    mandar(
      n,
      quem,
      {
        t: 'aparencia',
        aparencia: { ...aparenciaPadrao(), pele: 2, premium: { roupa: 'unicornio', bicho: 'gato' } },
      },
      confiar,
    );
    const a = vistaPor(n, quem, ve);
    expect(a?.pele).toBe(2);
    // na nuvem o saneamento já tira; no aparelho, o amigo desenha a aparência passada a limpo
    if (modo === 'nuvem') expect(a?.premium).toBeUndefined();
    expect(normalizarAparencia(a).premium).toBeUndefined();
  });
  it('tirar o premium chega ao amigo', () => {
    const { n, quem, ve, confiar } = montar(modo);
    mandar(n, quem, { t: 'aparencia', aparencia: { ...aparenciaPadrao(), premium: { fantasia: 'dragao' } } }, confiar);
    expect(vistaPor(n, quem, ve)?.premium).toEqual({ fantasia: 'dragao' });
    for (let i = 0; i < 40; i++) n.passo();
    n.quadros();
    mandar(n, quem, { t: 'aparencia', aparencia: { ...aparenciaPadrao() } }, confiar);
    const a = vistaPor(n, quem, ve);
    expect(a).toBeDefined();
    expect(a?.premium).toBeUndefined();
  });
});
