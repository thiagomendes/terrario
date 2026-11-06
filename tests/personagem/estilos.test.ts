import { describe, expect, it } from 'vitest';
import {
  ACESSORIOS,
  ESTILOS_CABELO,
  ESTILOS_ROUPA,
  SAIAS,
  aparenciaPadrao,
  aplicarCorpo,
  normalizarAparencia,
} from '../../src/personagem/aparencia';
import { montarPartes } from '../../src/personagem/modelo';
import { gerarTexturaParte } from '../../src/personagem/textura';
import { MAXIMO_MALHAS_PERSONAGEM } from '../../src/render/personagem';
import { ABA_DO_CAMPO, CORTES_LONGOS, sortearAparencia } from '../../src/ui/personagem';

const transparentes = (px: Uint8ClampedArray) =>
  px.filter((_, i) => i % 4 === 3 && px[i] === 0).length;

describe('estilos e acessórios do personagem', () => {
  it('todo acessório gera partes dentro do limite e texturas válidas', () => {
    for (const acessorio of ACESSORIOS) {
      const a = { ...aparenciaPadrao(), acessorio };
      const partes = montarPartes(a);
      expect(partes.length, acessorio).toBeLessThanOrEqual(MAXIMO_MALHAS_PERSONAGEM);
      for (const p of partes) {
        const t = gerarTexturaParte(a, p);
        expect(t.pixels.length).toBe(t.largura * t.altura * 4);
      }
    }
  });

  it('óculos, chapéu e capuz têm recortes transparentes', () => {
    for (const acessorio of ['oculos', 'chapeu', 'capuz'] as const) {
      const a = { ...aparenciaPadrao(), acessorio };
      const parte = montarPartes(a).find((p) => p.nome === 'acessorio')!;
      expect(transparentes(gerarTexturaParte(a, parte).pixels), acessorio).toBeGreaterThan(0);
    }
  });

  it('cada corte de cabelo e roupa muda a textura', () => {
    const base = aparenciaPadrao();
    // assinatura do visual: geometria e texturas de todas as partes
    const assinatura = (a: typeof base, _nome: string) =>
      montarPartes(a)
        .map((p) => `${p.nome}${p.tamanho.join()}:${gerarTexturaParte(a, p).pixels.join(',')}`)
        .join('|');
    const cabelos = new Set(
      Array.from({ length: ESTILOS_CABELO }, (_, i) =>
        assinatura({ ...base, cabeloEstilo: i }, 'cabeca'),
      ),
    );
    const roupas = new Set(
      Array.from({ length: ESTILOS_ROUPA }, (_, i) =>
        assinatura({ ...base, roupaEstilo: i }, 'tronco'),
      ),
    );
    expect(cabelos.size).toBe(ESTILOS_CABELO);
    expect(roupas.size).toBe(ESTILOS_ROUPA);
  });

  it('sortear gera aparências válidas e mantém o nome', () => {
    let s = 1;
    const aleatorio = () => (s = (s * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 50; i++) {
      const a = sortearAparencia({ ...aparenciaPadrao(), nome: 'Luzia' }, aleatorio);
      expect(a.nome).toBe('Luzia');
      expect(normalizarAparencia(a)).toEqual(a);
    }
  });

  it('todo campo de aparência tem uma aba', () => {
    for (const c of [
      'modelo',
      'pele',
      'cabeloEstilo',
      'cabeloCor',
      'roupaEstilo',
      'roupaCor',
      'calcaCor',
      'acessorio',
    ]) {
      expect(ABA_DO_CAMPO[c as keyof typeof ABA_DO_CAMPO], c).toBeTruthy();
    }
  });
});

describe('corpo feminino', () => {
  it('tem braços mais finos e tronco mais estreito', () => {
    const f = montarPartes({ ...aparenciaPadrao('andarilho'), corpo: 'feminino' });
    const m = montarPartes({ ...aparenciaPadrao('andarilho'), corpo: 'masculino' });
    const largura = (ps: typeof f, n: string) => ps.find((p) => p.nome === n)!.tamanho[0];
    expect(largura(f, 'bracoDireito')).toBeLessThan(largura(m, 'bracoDireito'));
    expect(largura(f, 'tronco')).toBeLessThanOrEqual(largura(m, 'tronco'));
  });

  it('escolher feminino já traz cabelo comprido, vestido e rosto sem barba', () => {
    const a = aplicarCorpo({ ...aparenciaPadrao('lanterneiro'), rosto: 4 }, 'feminino');
    expect(a.corpo).toBe('feminino');
    expect(CORTES_LONGOS).toContain(a.cabeloEstilo);
    expect(SAIAS[a.roupaEstilo]).toBeDefined();
    expect(a.rosto).toBeLessThan(4);
    const partes = montarPartes(a).map((p) => p.nome);
    expect(partes).toContain('saia');
  });

  it('as predefinições femininas são femininas', () => {
    for (const id of ['herbolaria', 'musgueira', 'exploradora', 'tecela'] as const) {
      expect(aparenciaPadrao(id).corpo, id).toBe('feminino');
    }
  });

  it('o dado nunca sorteia barba ou bigode no corpo feminino', () => {
    let s = 7;
    const aleatorio = () => (s = (s * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 200; i++) {
      const a = sortearAparencia(aparenciaPadrao(), aleatorio);
      if (a.corpo === 'feminino') expect(a.rosto).toBeLessThan(4);
      else expect(SAIAS[a.roupaEstilo]).toBeUndefined();
    }
  });
});
