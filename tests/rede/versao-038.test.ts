import { beforeAll, describe, expect, it, vi } from 'vitest';
import type { Scene } from '@babylonjs/core/scene';
import { VERSAO_REDE } from '../../src/rede/protocolo';
import { sanearAparencia } from '../../src/nucleo/saneamento';
import { criarNucleo } from '../../src/nucleo/nucleo';
import type { Comando } from '../../src/nucleo/protocolo';
import {
  normalizarAparencia,
  semDesbloqueios,
  type Aparencia,
} from '../../src/personagem/aparencia';
import { planoBoneco } from '../../src/personagem/boneco';
import {
  CHAVE_ALMA_COMPRADOS,
  CHAVE_ALMA_CRIANCA,
  carregarPerfilAlma,
  salvarPerfilAlma,
} from '../../src/personagem/almaCrianca';
import {
  PREMIUM,
  comprarPremium,
  normalizarPerfilAlma,
  perfilAlmaVazio,
  premiumPorId,
} from '../../src/jogo/alma';
import {
  IDS_PREMIUM_037,
  carregarPerfilAlma037,
  normalizarAparencia037,
  normalizarPerfilAlma037,
  salvarPerfilAlma037,
  sanearAparencia037,
} from './congelado037';

/**
 * Spec 038 (T01): a motoquinha dourada entra no catálogo sem subir a `VERSAO_REDE`. O servidor e
 * o site de antes (a `main` a217838, em `congelado037.ts`) leem o que a 038 manda e guarda,
 * descartam só a moto e seguem.
 */

// o boneco do amigo é de mentirinha: só guarda com que aparência ele nasceu
const nascidos: { aparencia: Aparencia }[] = [];
vi.mock('../../src/render/personagem', () => ({
  criarPersonagem: (_scene: unknown, aparencia: Aparencia) => {
    nascidos.push({ aparencia });
    return { aplicarAparencia: () => {}, definirMontado: () => {}, descartar: () => {}, raiz: {} };
  },
}));
beforeAll(() => {
  const el = () => ({ className: '', textContent: '', hidden: true, remove() {}, style: {} });
  vi.stubGlobal('document', { createElement: el, head: { append() {} }, body: { append() {} } });
});

const MOTO = 'motoquinha-dourada';
/** A aparência mais cheia da 038: montada na moto, com um premium em cada um dos outros lugares. */
const APARENCIA_038 = {
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
    roupa: 'tenis-cometa',
    costas: 'mochila-foguete',
    bicho: 'passarinho-ombro',
    andar: MOTO,
    chapeu: 'bone-helice',
    mao: 'guarda-chuva-gotinhas',
  },
  montado: true,
  etiqueta: 'estrela',
  balao: 'estrela',
};
/** A mesma aparência sem a moto: o que o servidor e o site de antes devem deixar. */
const semMoto = (a: object) => {
  const { premium, montado: _m, ...resto } = a as { premium?: Record<string, string>; montado?: true };
  const { andar: _a, ...outros } = premium ?? {};
  return Object.keys(outros).length ? { ...resto, premium: outros } : resto;
};

function memoria() {
  const m = new Map<string, string>();
  return {
    m,
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
  };
}

describe('038: a cópia de antes é fiel (a 038 só pôs a moto no catálogo)', () => {
  it('o catálogo de antes é o de agora sem a moto', () => {
    expect([...IDS_PREMIUM_037, MOTO].sort()).toEqual(PREMIUM.map((p) => p.id).sort());
    expect(premiumPorId(MOTO)).toMatchObject({
      categoria: 'andar',
      preco: 140,
      nome: 'Motoquinha dourada',
      desenho: 'premium:motoquinha-dourada',
    });
  });

  it('sem a moto, as regras de antes e as de agora dão o mesmo resultado', () => {
    const amostras: unknown[] = [
      semMoto(APARENCIA_038),
      { ...semMoto(APARENCIA_038), premium: { andar: 'bicicletinha', fantasia: 'dragao', costas: 'capa-estrelas' }, montado: true },
      { premium: { roupa: 'camiseta-arco-iris', andar: 'nuvem-fofa' }, montado: true, patins: true },
      { premium: { andar: 'patinete-luz' }, montado: true, skate: true, desbloqueios: ['caipira', 'x'] },
      { premium: { roupa: 'unicornio', costas: { x: 1 }, andar: 'foguete-do-futuro' }, montado: true },
      { modelo: 'nao-existe', pele: 99, nome: '  Lia  ', etiqueta: 'cor', balao: 'x' },
      {},
    ];
    for (const a of amostras) {
      expect(normalizarAparencia037(a)).toEqual(normalizarAparencia(a));
      expect(sanearAparencia037(a)).toEqual(sanearAparencia(a));
    }
    const perfis: unknown[] = [
      {
        moedas: 300,
        xp: 41.256,
        pontos: { bichos: 3, voar: 2 },
        premium: ['camiseta-arco-iris', 'tenis-cometa', 'dragao', 'capa-estrelas', 'foguete-do-futuro', 'Lixo!', 7],
        depois: ['patinete-luz', 'outro-novo'],
        vestidos: { roupa: 'tenis-cometa', fantasia: 'dragao', costas: 'capa-estrelas', andar: 'patinete-luz' },
        fantasias: ['caipira', 'caipira'],
        ganhou: 10,
        gastou: 5,
      },
      null,
      { premium: 'x', vestidos: [] },
    ];
    for (const p of perfis) expect(normalizarPerfilAlma037(p)).toEqual(normalizarPerfilAlma(p));
  });
});

describe('038: a VERSAO_REDE fica em 18 (quem é de antes lê e segue)', () => {
  it('a 038 não subiu a versão (subir abriria a janela em que o site 18 é recusado)', () => {
    // a 038 saiu na 18; quem subiu depois foi a 039 (os móveis, 19), com comandos e campos novos
    expect(VERSAO_REDE).toBeGreaterThanOrEqual(18);
  });

  it('o servidor de agora passa a moto inteira, com o montado', () => {
    const s = sanearAparencia(semDesbloqueios(normalizarAparencia(APARENCIA_038)));
    expect(s?.premium).toEqual(APARENCIA_038.premium);
    expect(s?.montado).toBe(true);
  });

  it('o servidor de antes tira só a moto (e o montado, que só vale com ela); o resto chega igual', () => {
    const antes = sanearAparencia037(APARENCIA_038);
    expect(antes).not.toBeNull();
    expect(antes!.premium).toEqual({
      roupa: 'tenis-cometa',
      costas: 'mochila-foguete',
      bicho: 'passarinho-ombro',
      chapeu: 'bone-helice',
      mao: 'guarda-chuva-gotinhas',
    });
    // montada num brinquedo que ele não conhece, ninguém fica montado no ar
    expect('montado' in antes!).toBe(false);
    // o resto é o que o servidor de agora manda, sem a moto
    expect(antes).toEqual(semMoto(sanearAparencia(APARENCIA_038)!));
    // e o montado num brinquedo que ele conhece continua passando
    const deBici = { ...APARENCIA_038, premium: { ...APARENCIA_038.premium, andar: 'bicicletinha' } };
    expect(sanearAparencia037(deBici)).toMatchObject({ montado: true, premium: { andar: 'bicicletinha' } });
  });

  it('o site de antes mostra o amigo a pé, com o resto do look, e a aparência cabe no teto', () => {
    // o servidor de agora manda a moto; o navegador de antes passa a limpo com as regras dele
    const vista = normalizarAparencia037(sanearAparencia(APARENCIA_038));
    expect((vista.premium as Record<string, string>).andar).toBeUndefined();
    expect('montado' in vista).toBe(false);
    expect(vista).toEqual(semMoto(normalizarAparencia(APARENCIA_038)));
    // (o boneco de antes só põe brinquedo com `premium.andar`: sem ele, a amiga está a pé)
    expect(JSON.stringify(sanearAparencia(APARENCIA_038)).length).toBeLessThan(2048);
  });
});

describe('038: nada some, nem se o site voltar atrás', () => {
  it('um perfil com a moto, no site de antes, vai para a lista de "depois" e volta', () => {
    const loja = memoria();
    const p = perfilAlmaVazio();
    p.moedas = 200;
    expect(comprarPremium(p, MOTO)).toEqual({ ok: true });
    expect(comprarPremium(p, 'capa-estrelas')).toEqual({ ok: true });
    expect(p.vestidos).toEqual({ andar: MOTO, costas: 'capa-estrelas' });
    salvarPerfilAlma(loja, p);

    // o site volta atrás: carrega, a criança joga, e ele grava com as regras de antes
    const antigo = carregarPerfilAlma037(loja);
    expect(antigo.premium).toEqual(['capa-estrelas']);
    expect(antigo.depois).toEqual([MOTO]);
    // (o vestido de um id que ele não conhece não fica: a moto volta comprada, não vestida)
    expect(antigo.vestidos).toEqual({ costas: 'capa-estrelas' });
    salvarPerfilAlma037(loja, antigo);
    expect(JSON.parse(loja.m.get(CHAVE_ALMA_CRIANCA)!).depois).toEqual([MOTO]);

    // e o site de novo: a moto continua da criança, e as moedinhas são as mesmas
    const lido = carregarPerfilAlma(loja);
    expect(lido.premium).toEqual(['capa-estrelas', MOTO]);
    expect(lido.depois).toEqual([]);
    expect(lido.moedas).toBe(200 - 140 - 30);
    expect(lido.vestidos).toEqual({ costas: 'capa-estrelas' });
    // a lista de "depois" sozinha já basta (sem a chave à parte, que só o site de agora relê)
    loja.m.delete(CHAVE_ALMA_COMPRADOS);
    expect(carregarPerfilAlma(loja).premium).toEqual(['capa-estrelas', MOTO]);
  });

  it('a camiseta de aquário e o tênis-cometa sobrevivem a carregar e salvar com o mesmo id', () => {
    const loja = memoria();
    // guardado de antes: a camiseta com o nome antigo, o tênis vestido
    loja.m.set(
      CHAVE_ALMA_CRIANCA,
      JSON.stringify({
        versao: 1,
        moedas: 5,
        premium: ['camiseta-arco-iris', 'tenis-cometa'],
        vestidos: { roupa: 'tenis-cometa' },
      }),
    );
    const ida = carregarPerfilAlma(loja);
    expect(ida.premium).toEqual(['camiseta-aquario', 'tenis-cometa']);
    expect(ida.vestidos).toEqual({ roupa: 'tenis-cometa' });
    salvarPerfilAlma(loja, ida);
    // e de novo, e de novo: os mesmos ids, no perfil e na chave à parte
    salvarPerfilAlma(loja, carregarPerfilAlma(loja));
    const volta = carregarPerfilAlma(loja);
    expect(volta.premium).toEqual(['camiseta-aquario', 'tenis-cometa']);
    expect(volta.vestidos).toEqual({ roupa: 'tenis-cometa' });
    expect(volta.moedas).toBe(5);
    expect(JSON.parse(loja.m.get(CHAVE_ALMA_COMPRADOS)!).ids).toEqual([
      'camiseta-aquario',
      'tenis-cometa',
    ]);
    // o site de antes e o de agora leem os dois com o mesmo id
    expect(carregarPerfilAlma037(loja).premium).toEqual(['camiseta-aquario', 'tenis-cometa']);
    // vestida, a camiseta vai pela rede com o mesmo id e o amigo de antes ou de agora a vê
    const comCamiseta = normalizarAparencia({ premium: { roupa: 'camiseta-aquario' } });
    expect(sanearAparencia(comCamiseta)?.premium).toEqual({ roupa: 'camiseta-aquario' });
    expect(sanearAparencia037(comCamiseta)?.premium).toEqual({ roupa: 'camiseta-aquario' });
    expect(normalizarPerfilAlma(volta)).toEqual(volta);
  });
});

describe('038: a própria criança, numa sala com o servidor de antes, vê a própria moto', () => {
  it('o servidor de antes guarda a cópia dela sem a moto, mas ela nunca se desenha pela cópia', async () => {
    // a criança: montada na moto, no aparelho dela (a aparência é a do perfil, com as regras novas)
    const minha = normalizarAparencia(APARENCIA_038);
    expect(minha.premium?.andar).toBe(MOTO);
    expect(minha.montado).toBe(true);
    expect(planoBoneco(minha).pecas.some((p) => p.subjunta?.nome === 'brinquedo')).toBe(true);

    // a sala na nuvem com o servidor de antes: a entrada e o comando passam pelo saneamento de
    // antes (o núcleo da a217838 é este: a 038 não muda o núcleo)
    const n = criarNucleo({ semente: 7, modo: 'criativo', versaoMundo: 2, confiarNoCliente: false });
    // (ela entra a pé, sem nada vestido, e monta na moto já na sala)
    n.conectar('bia', { perfil: { apelido: 'Bia', aparencia: sanearAparencia037({ modelo: 'herbolaria' }) ?? {} } });
    n.conectar('ana', { perfil: { apelido: 'Ana', aparencia: { modelo: 'andarilho' } } });
    n.passo();
    n.quadros();
    const s = sanearAparencia037(semDesbloqueios({ ...minha }));
    n.comando('bia', { t: 'aparencia', aparencia: s! } as Comando);
    let q = n.quadros().get('bia');
    for (let i = 0; i < 40 && !q?.perfis; i++) {
      n.passo();
      q = n.quadros().get('bia');
    }
    // a cópia dela no servidor de antes está a pé (é o que os amigos de antes veem)
    expect(q?.perfis?.bia?.aparencia).toEqual(semMoto(sanearAparencia(minha)!));
    // mas o quadro dela não a traz como amiga: o aparelho dela não a desenha pela cópia
    expect(q?.jogadores?.map((j) => j.id)).toEqual(['ana']);

    // o aparelho dela recebe o quadro: só a amiga ganha boneco, e o dela fica o do perfil
    const { criarOutrosJogadores } = await import('../../src/render/outrosJogadores');
    const outros = criarOutrosJogadores({} as Scene);
    nascidos.length = 0;
    outros.definirPerfis(q!.perfis!);
    outros.receber(q!.jogadores!);
    outros.definirPerfis(q!.perfis!);
    expect(outros.lista.map((o) => o.id)).toEqual(['ana']);
    expect(nascidos.map((b) => b.aparencia.nome)).toEqual(['']);
    expect(nascidos.some((b) => b.aparencia.nome === 'Aventureira Bia')).toBe(false);
    expect(minha.premium?.andar).toBe(MOTO);
  });
});
