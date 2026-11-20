import { afterAll, describe, expect, it } from 'vitest';
import {
  avisoDaRecusa,
  avisoTirouDoAmigo,
  daOuDo,
  podeLevarBicho,
  podeMexer,
  recusaConteiner,
  recusaColocar,
  recusaQuebrar,
  type MundoDaRegra,
} from '../../src/jogo/permissao';
import { criarAvisosProtecao, ESPERA_AVISO, ESPERA_TIROU } from '../../src/player/avisosProtecao';
import { Protecao, criarProtecaoMundo, type LugarProtecao } from '../../src/world/protecao';
import { Bloco } from '../../src/world/blocks';
import {
  definirEstiloMundo,
  encontrarNascimento,
  ESTILO_PADRAO,
  gerarChunk,
  indice,
  TAM_X,
  TAM_Z,
  TERRENO_NATURAL,
} from '../../src/world/chunk';
import { limparPovoados, planoDaRegiao, REGIAO_POVOADO } from '../../src/world/povoado';
import '../../src/temas/todos';
import { obterTema } from '../../src/temas';
import { cronometrar, melhorDe } from '../tempo';

/**
 * Spec 016, T03/T04: a regra de quem mexe em quê (a mesma no núcleo e no cliente), os avisos
 * de criança e o custo de conferir o bloco mirado.
 */
afterAll(() => {
  definirEstiloMundo(ESTILO_PADRAO);
  limparPovoados();
});

/** Mundo de mentira: uma célula de cada tipo de proteção, donos à mão. */
function falso(
  celulas: Record<string, { p?: Protecao; b?: number; g?: number; dono?: string }>,
  lugar: LugarProtecao | null = 'vila',
): MundoDaRegra {
  const em = (x: number, y: number, z: number) => celulas[`${x},${y},${z}`];
  return {
    protecao: { em: (x, y, z) => em(x, y, z)?.p ?? Protecao.LIVRE, lugar: () => lugar },
    bloco: (x, y, z) => em(x, y, z)?.b ?? Bloco.AR,
    gerado: (x, y, z) => em(x, y, z)?.g ?? Bloco.AR,
    dono: (x, y, z) => em(x, y, z)?.dono ?? null,
    apelido: (id) => ({ ana: 'Ana', leo: 'Léo', davi: 'Davi' })[id],
    donoDoMundo: 'ana',
  };
}

describe('a regra', () => {
  const m = falso({
    '0,0,0': { p: Protecao.ESTRUTURA, b: Bloco.TABUAS, g: Bloco.TABUAS },
    '1,0,0': { p: Protecao.CHAO, b: Bloco.TERRA, g: Bloco.TERRA },
    // chão onde a geração deixou ar, com o bloco do Léo (o vão embaixo da ruína)
    '13,0,0': { p: Protecao.CHAO, b: Bloco.TABUAS, dono: 'leo' },
    '2,0,0': { p: Protecao.USAVEL, b: Bloco.BAU, g: Bloco.BAU },
    '3,0,0': { p: Protecao.LAVOURA, b: Bloco.TRIGO_3, dono: 'ana' },
    '4,0,0': { p: Protecao.PASSAGEM },
    '5,0,0': { b: Bloco.PEDREGULHO, dono: 'leo' },
    '6,0,0': { b: Bloco.BAU, dono: 'leo' },
    '7,0,0': { p: Protecao.ESTRUTURA, g: Bloco.TABUAS },
    '8,0,0': { b: Bloco.FLOR, dono: 'leo' },
    '10,0,0': { p: Protecao.USAVEL, b: Bloco.FORNALHA_ACESA, g: Bloco.FORNALHA },
    '11,0,0': { b: Bloco.FORNALHA, dono: 'leo' },
    '12,0,0': { b: Bloco.FORNALHA_ACESA, dono: 'leo' },
  });

  it('quebrar: o mundo não deixa ninguém; o do amigo, só ele e a dona; a lavoura, todos', () => {
    for (const quem of ['ana', 'leo', 'bia']) {
      expect(recusaQuebrar(m, quem, 0, 0, 0)).toEqual({ motivo: 'mundo', lugar: 'vila' });
      expect(recusaQuebrar(m, quem, 1, 0, 0)).toEqual({ motivo: 'mundo', lugar: 'vila' });
      expect(recusaQuebrar(m, quem, 2, 0, 0)).toEqual({ motivo: 'mundo', lugar: 'vila' });
      expect(recusaQuebrar(m, quem, 3, 0, 0)).toBeNull();
      expect(recusaQuebrar(m, quem, 9, 0, 0)).toBeNull();
    }
    expect(recusaQuebrar(m, 'leo', 5, 0, 0)).toBeNull();
    expect(recusaQuebrar(m, 'ana', 5, 0, 0)).toBeNull();
    expect(recusaQuebrar(m, 'bia', 5, 0, 0)).toEqual({ motivo: 'amigo', dono: 'Léo' });
    expect(recusaQuebrar(m, 'bia', 6, 0, 0)).toEqual({ motivo: 'bau', dono: 'Léo' });
    // o bloco posto no vão de ar do chão é de quem pôs (nunca fica preso)
    expect(recusaQuebrar(m, 'leo', 13, 0, 0)).toBeNull();
    expect(recusaQuebrar(m, 'bia', 13, 0, 0)).toEqual({ motivo: 'amigo', dono: 'Léo' });
  });

  it('colocar: passagem e casa não; o conserto sim; a flor do amigo não some', () => {
    expect(recusaColocar(m, 'ana', 4, 0, 0, Bloco.TABUAS)).toEqual({
      motivo: 'passagem',
      lugar: 'vila',
    });
    // a célula da parede, vazia: só o bloco que a geração pôs
    expect(recusaColocar(m, 'leo', 7, 0, 0, Bloco.PEDREGULHO)).toEqual({
      motivo: 'mundo',
      lugar: 'vila',
    });
    expect(recusaColocar(m, 'leo', 7, 0, 0, Bloco.TABUAS)).toBeNull();
    // passagem nunca tem conserto (o gerado ali é ar)
    expect(recusaColocar(m, 'leo', 4, 0, 0, Bloco.AR)).not.toBeNull();
    expect(recusaColocar(m, 'bia', 8, 0, 0, Bloco.PEDREGULHO)).toEqual({
      motivo: 'amigo',
      dono: 'Léo',
    });
    expect(recusaColocar(m, 'ana', 8, 0, 0, Bloco.PEDREGULHO)).toBeNull();
    // chão e terreno livre: pode
    expect(recusaColocar(m, 'bia', 1, 0, 0, Bloco.TABUAS)).toBeNull();
    expect(recusaColocar(m, 'bia', 20, 0, 0, Bloco.TABUAS)).toBeNull();
  });

  it('baú: o do mundo é de todos; o posto, de quem pôs e da dona', () => {
    expect(recusaConteiner(m, 'bia', 2, 0, 0)).toBeNull();
    expect(recusaConteiner(m, 'bia', 6, 0, 0)).toEqual({ motivo: 'bau', dono: 'Léo' });
    expect(recusaConteiner(m, 'leo', 6, 0, 0)).toBeNull();
    expect(recusaConteiner(m, 'ana', 6, 0, 0)).toBeNull();
    // outro bloco não é contêiner
    expect(recusaConteiner(m, 'bia', 5, 0, 0)).toBeNull();
  });

  it('fornalha: a da vila é de todos; a posta, de quem pôs e da dona (apagada ou acesa)', () => {
    expect(recusaConteiner(m, 'bia', 10, 0, 0)).toBeNull();
    for (const x of [11, 12]) {
      expect(recusaConteiner(m, 'bia', x, 0, 0)).toEqual({ motivo: 'fornalha', dono: 'Léo' });
      expect(recusaConteiner(m, 'leo', x, 0, 0)).toBeNull();
      expect(recusaConteiner(m, 'ana', x, 0, 0)).toBeNull();
    }
    // a transação confere pelo contêiner aberto, mesmo se o bloco já mudou
    expect(recusaConteiner(m, 'bia', 5, 0, 0, 'fornalha')).toEqual({
      motivo: 'fornalha',
      dono: 'Léo',
    });
    expect(recusaQuebrar(m, 'bia', 11, 0, 0)).toEqual({ motivo: 'fornalha', dono: 'Léo' });
    expect(avisoDaRecusa({ motivo: 'fornalha', dono: 'Ana' })).toBe('Essa fornalha é da Ana.');
    expect(avisoDaRecusa({ motivo: 'fornalha' })).toBe('Essa fornalha é de um amigo.');
  });

  it('bicho: o solto é de todos; o criado, de quem criou e do dono do mundo', () => {
    expect(podeLevarBicho('bia', {}, 'ana')).toBe(true);
    expect(podeLevarBicho('bia', { criado: true, dono: 'leo' }, 'ana')).toBe(false);
    expect(podeLevarBicho('leo', { criado: true, dono: 'leo' }, 'ana')).toBe(true);
    expect(podeLevarBicho('ana', { domada: true, dono: 'leo' }, 'ana')).toBe(true);
    // sem dono: é do dono do mundo
    expect(podeLevarBicho('bia', { criado: true }, 'ana')).toBe(false);
    expect(podeLevarBicho('ana', { criado: true }, 'ana')).toBe(true);
    // sem dono do mundo conhecido (mundo de antes): ninguém tem o poder dele
    expect(podeMexer('x', 'y', null)).toBe(false);
    expect(podeMexer('x', null, null)).toBe(true);
  });
});

describe('os avisos de criança', () => {
  it('curtos, gentis, com o nome', () => {
    expect(avisoDaRecusa({ motivo: 'mundo', lugar: 'vila' })).toBe(
      'Essa casa é da vila. Que tal construir a sua?',
    );
    expect(avisoDaRecusa({ motivo: 'mundo', lugar: 'sitio' })).toBe(
      'Esse cantinho é do sítio. Que tal construir a sua?',
    );
    expect(avisoDaRecusa({ motivo: 'amigo', dono: 'Ana' })).toBe('Essa parede é da Ana.');
    expect(avisoDaRecusa({ motivo: 'passagem', lugar: 'vila' })).toBe(
      'Aqui é passagem: deixa livre para todo mundo passar.',
    );
    expect(avisoDaRecusa({ motivo: 'bau', dono: 'Léo' })).toBe('Esse baú é do Léo.');
    expect(avisoDaRecusa({ motivo: 'bicho', dono: 'Ana' })).toBe('Esse bichinho é da Ana.');
    expect(avisoDaRecusa({ motivo: 'amigo' })).toBe('Essa parede é de um amigo.');
    expect(avisoTirouDoAmigo('Léo')).toBe('Você tirou um bloco do Léo.');
    expect(daOuDo('Davi')).toBe('de Davi');
    for (const r of [
      { motivo: 'mundo' as const, lugar: 'ruina' as const },
      { motivo: 'mundo' as const, lugar: 'estrutura' as const },
    ])
      expect(avisoDaRecusa(r).length).toBeLessThan(60);
  });

  it('não se repetem a cada clique (por motivo e dono), e o "tirou" é discreto', () => {
    let t = 0;
    const vistos: string[] = [];
    const a = criarAvisosProtecao({ toast: (x) => vistos.push(x), agora: () => t });
    for (let i = 0; i < 30; i++) {
      a.avisar({ motivo: 'amigo', dono: 'Ana' });
      t += 0.05;
    }
    expect(vistos).toEqual(['Essa parede é da Ana.']);
    // outro dono fala na hora
    a.avisar({ motivo: 'amigo', dono: 'Léo' });
    expect(vistos.length).toBe(2);
    t += ESPERA_AVISO;
    a.avisar({ motivo: 'amigo', dono: 'Ana' });
    expect(vistos.length).toBe(3);
    for (let i = 0; i < 10; i++) {
      a.tirouDoAmigo('Léo');
      t += 0.3;
    }
    expect(vistos.filter((v) => v.startsWith('Você tirou')).length).toBe(1);
    t += ESPERA_TIROU;
    a.tirouDoAmigo('Léo');
    expect(vistos.filter((v) => v.startsWith('Você tirou')).length).toBe(2);
  });
});

describe('custo de conferir o bloco mirado', () => {
  it('bem abaixo de 0,1 ms por bloco (mirando e minerando no sítio do Rancho)', () => {
    definirEstiloMundo(obterTema('rancho-alegre').mundo);
    limparPovoados();
    const semente = 42;
    const n0 = encontrarNascimento(semente);
    let plano = null;
    for (let dx = -1; dx <= 1 && !plano; dx++)
      for (let dz = -1; dz <= 1 && !plano; dz++)
        plano = planoDaRegiao(
          Math.floor(n0.x / REGIAO_POVOADO) + dx,
          Math.floor(n0.z / REGIAO_POVOADO) + dz,
          semente,
          TERRENO_NATURAL,
        );
    expect(plano).not.toBeNull();
    const chunks = new Map<string, Uint8Array>();
    const gerado = (x: number, y: number, z: number) => {
      const cx = Math.floor(x / TAM_X);
      const cz = Math.floor(z / TAM_Z);
      const k = `${cx},${cz}`;
      let c = chunks.get(k);
      if (!c) chunks.set(k, (c = gerarChunk(cx, cz, semente)));
      return c[indice(x - cx * TAM_X, y, z - cz * TAM_Z)];
    };
    // medido do zero (a máscara de cada chunk nasce na primeira mira dele)
    const mundoDaRegra = (): MundoDaRegra => ({
      protecao: criarProtecaoMundo(semente),
      bloco: gerado,
      gerado,
      dono: () => null,
      apelido: () => undefined,
      donoDoMundo: 'ana',
    });
    let m = mundoDaRegra();
    for (let x = plano!.minX; x <= plano!.maxX; x += 16)
      for (let z = plano!.minZ; z <= plano!.maxZ; z += 16) gerado(x, 60, z);
    const alvos: [number, number, number][] = [];
    for (let i = 0; i < 20000; i++) {
      const x = plano!.minX + ((i * 7) % (plano!.maxX - plano!.minX + 1));
      const z = plano!.minZ + ((i * 13) % (plano!.maxZ - plano!.minZ + 1));
      alvos.push([x, plano!.h + (i % 4), z]);
    }
    // spec 034 (T14): o melhor de 3 rodadas (cada uma do zero, com a proteção nova), e não uma
    // rodada só: a máquina ocupada só soma tempo, e uma conta a mais pesa nas três
    let protegidos = 0;
    const ms =
      melhorDe(3, () => {
        m = mundoDaRegra();
        return cronometrar(() => {
          protegidos = 0;
          for (const [x, y, z] of alvos) if (recusaQuebrar(m, 'bia', x, y, z)) protegidos++;
        });
      }) / alvos.length;
    // a mira de verdade confere uma vez por bloco novo mirado (parada, nada)
    const quente =
      melhorDe(3, () =>
        cronometrar(() => {
          for (const [x, y, z] of alvos) recusaQuebrar(m, 'bia', x, y, z);
        }),
      ) / alvos.length;
    console.log(
      `[016 custo] ${alvos.length} blocos no sítio: ${(ms * 1000).toFixed(2)} µs do zero, ` +
        `${(quente * 1000).toFixed(2)} µs com a máscara pronta; ${protegidos} protegidos`,
    );
    expect(protegidos).toBeGreaterThan(100);
    expect(ms).toBeLessThan(0.1);
    expect(quente).toBeLessThan(0.01);
  });
});
