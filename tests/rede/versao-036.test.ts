import { describe, expect, it } from 'vitest';
import { VERSAO_REDE } from '../../src/rede/protocolo';
import { sanearAparencia } from '../../src/nucleo/saneamento';
import { normalizarAparencia, semDesbloqueios } from '../../src/personagem/aparencia';
import {
  CHAVE_ALMA_COMPRADOS,
  CHAVE_ALMA_CRIANCA,
  carregarPerfilAlma,
  salvarPerfilAlma,
} from '../../src/personagem/almaCrianca';
import { comprarPremium, perfilAlmaVazio } from '../../src/jogo/alma';
import {
  normalizarAparencia18,
  normalizarPerfilAlma18,
  sanearAparencia18,
} from './congelado18';

/** A aparência mais cheia que a 036 manda pela rede: um premium em cada um dos 7 lugares. */
const APARENCIA_036 = {
  nome: 'Aventureira Bia',
  modelo: 'herbolaria',
  corpo: 'feminino',
  pele: 2,
  rosto: 1,
  cabeloEstilo: 2,
  cabeloCor: 3,
  roupaEstilo: 6,
  roupaCor: 2,
  calcaCor: 1,
  acessorio: 'lanterna',
  premium: {
    roupa: 'pijama-nuvem',
    costas: 'mochila-foguete',
    bicho: 'passarinho-ombro',
    andar: 'bicicletinha',
    chapeu: 'bone-helice',
    mao: 'guarda-chuva-gotinhas',
  },
  montado: true,
  etiqueta: 'estrela',
  balao: 'estrela',
};

function memoria() {
  const m = new Map<string, string>();
  return {
    m,
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
  };
}

describe('036: a VERSAO_REDE fica em 18 (quem é de antes lê e segue)', () => {
  it('a 036 não subiu a versão (subir abriria a janela em que o site 18 é recusado)', () => {
    // a 036 saiu na 18; quem subiu depois foi a 039 (os móveis, 19), com comandos e campos novos
    expect(VERSAO_REDE).toBeGreaterThanOrEqual(18);
  });

  it('a aparência da 036 passa inteira pelo servidor novo, com o montado', () => {
    const s = sanearAparencia(semDesbloqueios(normalizarAparencia(APARENCIA_036)));
    expect(s?.premium).toEqual(APARENCIA_036.premium);
    expect(s?.montado).toBe(true);
  });

  it('o servidor de antes passa a limpo sem os itens novos e sem o montado, e nada quebra', () => {
    const s = sanearAparencia18(APARENCIA_036);
    expect(s).not.toBeNull();
    expect(s!.premium).toBeUndefined();
    expect('montado' in s!).toBe(false);
    // o resto do look chega igual ao que o servidor de agora manda
    const novo = sanearAparencia(APARENCIA_036)!;
    const { premium: _p, montado: _m, ...resto } = novo;
    expect(s).toEqual(resto);
  });

  it('com premium de antes e de agora, o de antes fica com o que ele conhece', () => {
    const mista = {
      ...APARENCIA_036,
      premium: { roupa: 'tenis-cometa', costas: 'asas-borboleta', bicho: 'unicornio', mao: 'pipa-lacinhos' },
    };
    expect(normalizarAparencia18(mista).premium).toEqual({
      roupa: 'tenis-cometa',
      bicho: 'unicornio',
    });
    // a roupa nova cai sozinha (o lugar fica vazio, sem desenhar outra coisa)
    expect(
      normalizarAparencia18({ premium: { roupa: 'pijama-nuvem', fantasia: 'dragao' } }).premium,
    ).toEqual({ fantasia: 'dragao' });
  });

  it('o navegador de antes vê o amigo a pé, sem o item, e a aparência cabe no teto de 4096', () => {
    const vista = normalizarAparencia18(sanearAparencia(APARENCIA_036));
    expect(vista.premium).toBeUndefined();
    expect('montado' in vista).toBe(false);
    expect(vista.nome).toBe('Aventureira Bia');
    // o teto do saneamento (de antes e de agora) com folga: nenhum jogador entra sem aparência
    expect(JSON.stringify(sanearAparencia(APARENCIA_036)).length).toBeLessThan(2048);
  });
});

describe('036: nada some, nem se o site voltar atrás', () => {
  it('o site de antes joga fora o item novo do perfil, e a chave à parte o devolve', () => {
    const loja = memoria();
    const p = perfilAlmaVazio();
    p.moedas = 200;
    expect(comprarPremium(p, 'patinete-luz')).toEqual({ ok: true });
    expect(comprarPremium(p, 'capa-estrelas')).toEqual({ ok: true });
    salvarPerfilAlma(loja, p);
    // o site volta atrás: lê e grava o perfil com as regras de antes
    const antigo = normalizarPerfilAlma18(JSON.parse(loja.m.get(CHAVE_ALMA_CRIANCA)!));
    expect(antigo.premium).toEqual(['capa-estrelas']);
    loja.m.set(CHAVE_ALMA_CRIANCA, JSON.stringify(antigo));
    // e o site de novo: o patinete continua da criança
    const lido = carregarPerfilAlma(loja);
    expect(lido.premium).toEqual(['capa-estrelas', 'patinete-luz']);
    expect(lido.moedas).toBe(200 - 110 - 30);
    // a chave à parte não é do código de antes: ela só cresce
    expect(JSON.parse(loja.m.get(CHAVE_ALMA_COMPRADOS)!).ids).toEqual([
      'patinete-luz',
      'capa-estrelas',
    ]);
  });

  it('um perfil com id desconhecido sobrevive a carregar e salvar', () => {
    const loja = memoria();
    loja.m.set(
      CHAVE_ALMA_CRIANCA,
      JSON.stringify({
        versao: 1,
        moedas: 9,
        premium: ['camiseta-aquario', 'foguete-do-futuro', 'Lixo Grande!', 42],
        vestidos: { roupa: 'camiseta-aquario', voar: 'foguete-do-futuro' },
      }),
    );
    const p = carregarPerfilAlma(loja);
    expect(p.premium).toEqual(['camiseta-aquario']);
    expect(p.depois).toEqual(['foguete-do-futuro']);
    salvarPerfilAlma(loja, p);
    const guardado = JSON.parse(loja.m.get(CHAVE_ALMA_CRIANCA)!);
    expect(guardado.depois).toEqual(['foguete-do-futuro']);
    expect(JSON.parse(loja.m.get(CHAVE_ALMA_COMPRADOS)!).ids).toContain('foguete-do-futuro');
    // de novo, e de novo: continua lá (e o que não é id bem formado nunca entrou)
    salvarPerfilAlma(loja, carregarPerfilAlma(loja));
    const outra = carregarPerfilAlma(loja);
    expect(outra.depois).toEqual(['foguete-do-futuro']);
    expect(outra.premium).toEqual(['camiseta-aquario']);
    expect(JSON.stringify(outra)).not.toContain('Lixo');
  });
});
