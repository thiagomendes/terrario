import { describe, expect, it } from 'vitest';
import {
  criarNucleo,
  ORCAMENTO_LAVOURA,
  ORCAMENTO_LUZ,
  type Nucleo,
} from '../../src/nucleo/nucleo';
import { cronometrar, melhorDe } from '../tempo';
import '../../src/temas/todos';
import { obterTema } from '../../src/temas';
import {
  encontrarNascimento,
  alturaTerreno,
  definirEstiloMundo,
  ESTILO_PADRAO,
  gerarChunk,
  indice,
  ALTURA,
  TERRENO_NATURAL,
} from '../../src/world/chunk';
import { planoDaRegiao, REGIAO_POVOADO } from '../../src/world/povoado';
import { Bloco } from '../../src/world/blocks';
import { sanear } from '../../src/nucleo/saneamento';
import { criarEdicoes, empacotar } from '../../src/world/edicoes';
import { luzDoBloco } from '../../src/world/blocks';
import { criarAcessoMundo, criarCacheGeracional } from '../../src/nucleo/mundo';
import { idDoBloco } from '../../src/jogo/itens';
import type { Comando, Telemetria } from '../../src/nucleo/protocolo';

/**
 * Spec 013, auditoria independente: cada furo achado vira um teste que prova a correção
 * (todos na nuvem, `confiarNoCliente: false`, com o comando passando pelo saneamento como
 * no servidor).
 */
const SEMENTE = 1337;
const p0 = encontrarNascimento(SEMENTE);
const X = Math.floor(p0.x);
const Z = Math.floor(p0.z);
const Y = alturaTerreno(X, Z, SEMENTE) + 1;

function tel(x: number, z: number, extra: Partial<Telemetria> = {}): Comando {
  const y = alturaTerreno(Math.floor(x), Math.floor(z), SEMENTE) + 1;
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
    ...extra,
  };
}
function nuvem(modo: 'criativo' | 'sobrevivencia' = 'sobrevivencia'): Nucleo {
  const n = criarNucleo({
    semente: SEMENTE,
    modo,
    versaoMundo: 2,
    confiarNoCliente: false,
    depuracao: true,
  });
  n.conectar('ana', { perfil: { apelido: 'Ana', aparencia: {} } });
  n.conectar('bia', { perfil: { apelido: 'Bia', aparencia: {} } });
  n.comando('ana', tel(X + 0.5, Z + 0.5));
  n.comando('bia', tel(X + 2.5, Z + 0.5));
  return n;
}
const inv = (n: Nucleo, id: string) => n.estado.jogadores.get(id)!.inventario;
const bloco = (n: Nucleo, x: number, y: number, z: number) => n.estado.mundo.bloco(x, y, z);
/** O comando passa pelo saneamento (como o servidor faz) e vai ao núcleo. */
function mandar(n: Nucleo, quem: string, c: unknown): boolean {
  const s = sanear(c);
  if (s) n.comando(quem, s);
  return !!s;
}

describe('colocar com "outra parte": só a metade de cima da porta', () => {
  it('uma semente não planta três pés (as partes extras são recusadas)', () => {
    const n = nuvem();
    const F = { x: X + 1, y: Y - 1, z: Z + 1 };
    n.estado.edicoes.definir(F.x, F.y, F.z, Bloco.TERRA_ARADA);
    n.estado.edicoes.definir(F.x, F.y + 1, F.z, Bloco.AR);
    inv(n, 'ana').definir(1, { item: 'semente_trigo', qtd: 1 });
    const longe = { x: X + 10000, y: 100, z: Z + 10000 };
    mandar(n, 'ana', {
      t: 'colocar',
      id: 1,
      x: F.x,
      y: F.y + 1,
      z: F.z,
      bloco: Bloco.TRIGO_0,
      meta: 0,
      slot: 1,
      extras: [longe],
    });
    expect(bloco(n, longe.x, longe.y, longe.z)).toBe(Bloco.AR);
    expect(n.estado.lavoura.size).toBe(0);
    // a semente não foi gasta e a tela é corrigida
    expect(inv(n, 'ana').contar('semente_trigo')).toBe(1);
    expect(
      n
        .quadros()
        .get('ana')!
        .eventos?.some((e) => e.e === 'recusa'),
    ).toBe(true);
  });

  it('o saneamento descarta mais de uma parte extra', () => {
    expect(
      sanear({
        t: 'colocar',
        id: 1,
        x: 0,
        y: 70,
        z: 0,
        bloco: Bloco.PORTA,
        meta: 0,
        slot: 0,
        extras: [
          { x: 0, y: 71, z: 0 },
          { x: 0, y: 72, z: 0 },
        ],
      }),
    ).toBeNull();
  });

  it('uma tábua não vira dois blocos (a parte extra só vale para a porta)', () => {
    const n = nuvem();
    inv(n, 'ana').definir(2, { item: idDoBloco(Bloco.TABUAS), qtd: 1 });
    mandar(n, 'ana', {
      t: 'colocar',
      id: 2,
      x: X + 1,
      y: Y + 2,
      z: Z + 1,
      bloco: Bloco.TABUAS,
      meta: 0,
      slot: 2,
      extras: [{ x: X + 1, y: Y + 3, z: Z + 1 }],
    });
    expect(bloco(n, X + 1, Y + 2, Z + 1)).toBe(Bloco.AR);
    expect(bloco(n, X + 1, Y + 3, Z + 1)).toBe(Bloco.AR);
    expect(inv(n, 'ana').contar(idDoBloco(Bloco.TABUAS))).toBe(1);
  });

  it('a porta com a outra metade longe é recusada; com a de cima, entra inteira', () => {
    const n = nuvem();
    inv(n, 'ana').definir(3, { item: idDoBloco(Bloco.PORTA), qtd: 2 });
    mandar(n, 'ana', {
      t: 'colocar',
      id: 3,
      x: X + 2,
      y: Y,
      z: Z + 2,
      bloco: Bloco.PORTA,
      meta: 0,
      slot: 3,
      extras: [{ x: X + 2, y: Y + 4, z: Z + 2 }],
    });
    expect(bloco(n, X + 2, Y, Z + 2)).not.toBe(Bloco.PORTA);
    expect(bloco(n, X + 2, Y + 4, Z + 2)).toBe(Bloco.AR);
    expect(inv(n, 'ana').contar(idDoBloco(Bloco.PORTA))).toBe(2);
    mandar(n, 'ana', {
      t: 'colocar',
      id: 4,
      x: X + 2,
      y: Y,
      z: Z + 2,
      bloco: Bloco.PORTA,
      meta: 0,
      slot: 3,
      extras: [{ x: X + 2, y: Y + 1, z: Z + 2 }],
    });
    expect(bloco(n, X + 2, Y, Z + 2)).toBe(Bloco.PORTA);
    expect(bloco(n, X + 2, Y + 1, Z + 2)).toBe(Bloco.PORTA);
    expect(inv(n, 'ana').contar(idDoBloco(Bloco.PORTA))).toBe(1);
  });
});

/**
 * Spec 016: o baú do mundo não quebra (nem pelo dono do mundo), então o tesouro não se refaz
 * quebrando e recolocando: tenta quebrar três vezes (nada cai, o baú fica) e abre. Devolve o
 * que caiu em cada tentativa e o que tem dentro.
 */
function voltasNoBau(
  semente: number,
  bx: number,
  by: number,
  bz: number,
): { caiu: string[][]; dentro: string[] } {
  const n = criarNucleo({
    semente,
    modo: 'sobrevivencia',
    versaoMundo: 2,
    confiarNoCliente: false,
    depuracao: true,
  });
  n.conectar('ana', { perfil: { apelido: 'Ana', aparencia: {} } });
  n.comando('ana', { t: 'depurar', d: { f: 'spawn', x: bx + 2.5, z: bz + 0.5 } });
  n.estado.jogadores.get('ana')!.saltoPermitido = true;
  n.comando('ana', {
    t: 'jogador',
    x: bx + 2.5,
    y: by,
    z: bz + 0.5,
    yaw: 0,
    pitch: 0,
    olhos: by + 1.62,
    noChao: true,
    voando: false,
    vel: 0,
    correndo: false,
    submerso: false,
    quedas: [],
    pulos: 0,
    golpes: 0,
    slot: 0,
  });
  expect(n.estado.mundo.bloco(bx, by, bz)).toBe(Bloco.BAU);
  const caiu: string[][] = [];
  for (let v = 0; v < 3; v++) {
    (n.estado.mundoItens.itens as unknown[]).length = 0;
    mandar(n, 'ana', { t: 'quebrar', id: 10 + v, x: bx, y: by, z: bz, slot: 0 });
    caiu.push(n.estado.mundoItens.itens.map((o) => o.item));
    expect(n.estado.mundo.bloco(bx, by, bz)).toBe(Bloco.BAU);
  }
  mandar(n, 'ana', { t: 'usar', id: 20, x: bx, y: by, z: bz });
  const dentro = n.estado.conteineres
    .bau(bx, by, bz, false)
    .flatMap((p) => (p ? [p.item] : []))
    .sort();
  return { caiu, dentro };
}

describe('o tesouro do baú do mundo sai uma vez só (spec 016: o baú do mundo nem quebra)', () => {
  it('o baú do celeiro do sítio (Rancho, semente 42) não se refaz ao ser recolocado', () => {
    definirEstiloMundo(obterTema('rancho-alegre').mundo);
    try {
      const semente = 42;
      const n0 = encontrarNascimento(semente);
      let bau: [number, number, number] | undefined;
      const rx0 = Math.floor(n0.x / REGIAO_POVOADO);
      const rz0 = Math.floor(n0.z / REGIAO_POVOADO);
      for (let dx = -1; dx <= 1 && !bau; dx++)
        for (let dz = -1; dz <= 1 && !bau; dz++)
          bau = planoDaRegiao(rx0 + dx, rz0 + dz, semente, TERRENO_NATURAL)?.bauCeleiro;
      expect(bau).toBeDefined();
      const { caiu, dentro } = voltasNoBau(semente, ...bau!);
      expect(caiu).toEqual([[], [], []]);
      expect(dentro).toContain('enxada_madeira');
    } finally {
      definirEstiloMundo(ESTILO_PADRAO);
    }
  });

  it('o baú de ruína também não', () => {
    // a ruína mais perto do nascimento (o baú fica no meio do chunk, em 8, h + 1, 8)
    let bau: [number, number, number] | undefined;
    const cx0 = Math.floor(X / 16);
    const cz0 = Math.floor(Z / 16);
    for (let r = 0; r < 40 && !bau; r++)
      for (let dx = -r; dx <= r && !bau; dx++)
        for (let dz = -r; dz <= r && !bau; dz++) {
          if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
          const c = gerarChunk(cx0 + dx, cz0 + dz, SEMENTE);
          for (let y = 1; y < ALTURA && !bau; y++)
            if (c[indice(8, y, 8)] === Bloco.BAU)
              bau = [(cx0 + dx) * 16 + 8, y, (cz0 + dz) * 16 + 8];
        }
    expect(bau).toBeDefined();
    const { caiu, dentro } = voltasNoBau(SEMENTE, ...bau!);
    expect(caiu).toEqual([[], [], []]);
    expect(dentro.length).toBeGreaterThan(0);
  });
});

describe('dar comida na nuvem', () => {
  function cervoPerto(n: Nucleo, x: number, z: number): number {
    n.comando('ana', { t: 'depurar', d: { f: 'invocar', tipo: 'cervo', x, y: Y, z } });
    const l = n.estado.populacao.lista;
    return l[l.length - 1].id;
  }
  function dia(n: Nucleo): void {
    n.comando('ana', { t: 'depurar', d: { f: 'hora', hora: 0.5 } });
    n.comando('ana', { t: 'depurar', d: { f: 'pausarDia', pausar: true } });
  }

  it('a visitante sem permissão de construir não cria bicho (nem enche o limite do mundo)', () => {
    const n = nuvem();
    n.definirConstrucao('bia', false);
    dia(n);
    inv(n, 'bia').definir(0, { item: 'trigo', qtd: 30 });
    for (let i = 0; i < 5; i++)
      mandar(n, 'bia', { t: 'alimentar', criatura: cervoPerto(n, X + 2.5, Z + 2.5), slot: 0 });
    expect(n.estado.populacao.criados).toBe(0);
    // não gastou o trigo e foi avisada
    expect(inv(n, 'bia').contar('trigo')).toBe(30);
    const q = n.quadros().get('bia')!;
    expect(q.eventos?.some((e) => e.e === 'recusa' && e.motivo === 'visitante')).toBe(true);
    expect(q.eventos?.some((e) => e.e === 'alimentou')).toBe(false);
    // a dona cria
    inv(n, 'ana').definir(0, { item: 'trigo', qtd: 1 });
    mandar(n, 'ana', { t: 'alimentar', criatura: cervoPerto(n, X + 1.5, Z + 1.5), slot: 0 });
    expect(n.estado.populacao.criados).toBe(1);
  });

  it('o mesmo bicho criado mostra corações no máximo uma vez por segundo', () => {
    const n = nuvem();
    dia(n);
    inv(n, 'ana').definir(0, { item: 'trigo', qtd: 30 });
    const id = cervoPerto(n, X + 1.5, Z + 1.5);
    const coracoes = () =>
      n
        .quadros()
        .get('bia')!
        .eventos?.filter((e) => e.e === 'alimentou').length ?? 0;
    for (let i = 0; i < 30; i++) mandar(n, 'ana', { t: 'alimentar', criatura: id, slot: 0 });
    expect(n.estado.populacao.criados).toBe(1);
    expect(coracoes()).toBe(1);
    // passado um segundo, ganha comida de novo
    for (let i = 0; i < 21; i++) n.passo();
    n.quadros();
    for (let i = 0; i < 30; i++) mandar(n, 'ana', { t: 'alimentar', criatura: id, slot: 0 });
    expect(coracoes()).toBe(1);
    // a visitante pode dar comida ao bicho que já é criado
    n.definirConstrucao('bia', false);
    inv(n, 'bia').definir(0, { item: 'trigo', qtd: 1 });
    for (let i = 0; i < 21; i++) n.passo();
    n.quadros();
    mandar(n, 'bia', { t: 'alimentar', criatura: id, slot: 0 });
    expect(coracoes()).toBe(1);
  });
});

describe('portas e porteiras na nuvem', () => {
  it('a visitante abre e fecha a porteira e a porta, mas não quebra nenhuma', () => {
    const n = nuvem();
    n.definirConstrucao('bia', false);
    n.estado.edicoes.definir(X + 2, Y, Z + 2, Bloco.PORTEIRA);
    n.estado.edicoes.definir(X + 3, Y, Z + 1, Bloco.PORTA);
    n.estado.edicoes.definir(X + 3, Y + 1, Z + 1, Bloco.PORTA);
    mandar(n, 'bia', { t: 'usar', x: X + 2, y: Y, z: Z + 2 });
    expect(bloco(n, X + 2, Y, Z + 2)).toBe(Bloco.PORTEIRA_ABERTA);
    mandar(n, 'bia', { t: 'usar', x: X + 2, y: Y, z: Z + 2 });
    expect(bloco(n, X + 2, Y, Z + 2)).toBe(Bloco.PORTEIRA);
    mandar(n, 'bia', { t: 'usar', x: X + 3, y: Y, z: Z + 1 });
    expect(bloco(n, X + 3, Y, Z + 1)).toBe(Bloco.PORTA_ABERTA);
    expect(bloco(n, X + 3, Y + 1, Z + 1)).toBe(Bloco.PORTA_ABERTA);
    mandar(n, 'bia', { t: 'quebrar', id: 1, x: X + 2, y: Y, z: Z + 2, slot: 0 });
    mandar(n, 'bia', { t: 'quebrar', id: 2, x: X + 3, y: Y, z: Z + 1, slot: 0 });
    expect(bloco(n, X + 2, Y, Z + 2)).toBe(Bloco.PORTEIRA);
    expect(bloco(n, X + 3, Y, Z + 1)).toBe(Bloco.PORTA_ABERTA);
  });
});

describe('salvamento com lixo não trava o núcleo', () => {
  function abrir(extras: Record<string, unknown>, edicoes: Record<string, unknown> = {}) {
    const n = criarNucleo({
      semente: SEMENTE,
      modo: 'sobrevivencia',
      versaoMundo: 2,
      confiarNoCliente: false,
      dados: {
        versao: 1,
        edicoes: edicoes as never,
        jogador: null,
        hora: 0.5,
        extras,
      },
    });
    n.conectar('ana', { perfil: { apelido: 'Ana', aparencia: {} } });
    return n;
  }
  /**
   * Milissegundos por passo (o servidor tem 50 ms por passo): protege que o lixo gravado não
   * faz o passo gerar terreno longe nem andar em volta absurda. Spec 034 (T14): o melhor de 5
   * rodadas de 8 passos, e não a média de 40 (a máquina ocupada só soma tempo; uma conta a
   * mais pesa em todas as rodadas).
   */
  function medir(n: Nucleo): number {
    return (
      melhorDe(5, () =>
        cronometrar(() => {
          for (let i = 0; i < 8; i++) n.passo();
        }),
      ) / 8
    );
  }

  for (const v of [1e9, -1e12, 1e300, -1e300])
    it(`bichos criados em x = ${v} saem ao abrir (e o passo é rápido)`, () => {
      const criados = Array.from({ length: 24 }, () => ({
        tipo: 'cervo',
        x: v,
        y: 70,
        z: v,
        vida: 10,
        casa: [v, v],
      }));
      const n = abrir({ criaturas: { criados, raposas: [{ x: v, y: 70, z: 0, vida: 8 }] } });
      expect(medir(n)).toBeLessThan(20);
      expect(n.estado.populacao.lista.filter((c) => c.criado || c.domada)).toEqual([]);
    });

  it('bicho com y absurdo, casa e cerca absurdas: sai o que não serve, o resto fica', () => {
    const criados = [
      { tipo: 'coelho', x: X + 2, y: -1e300, z: Z + 2, vida: 10, casa: [X, Z], ovo: 1 },
      {
        tipo: 'cervo',
        x: X + 2,
        y: Y,
        z: Z + 2,
        vida: 10,
        casa: [1e300, 0],
        curral: 'x:0',
        cerca: [1e300, 1e300, -1e300, -1e300],
      },
    ];
    const n = abrir({ criaturas: { criados } });
    n.comando('ana', tel(X + 0.5, Z + 0.5));
    expect(medir(n)).toBeLessThan(20);
    const l = n.estado.populacao.lista.filter((c) => c.criado);
    expect(l.map((c) => c.tipo)).toEqual(['cervo']);
    expect(l[0].cerca).toBeUndefined();
    expect(Math.abs(l[0].casa![0] - (X + 2))).toBeLessThan(8);
  });

  it('itens soltos, baús, lavoura e nascimento fora do mundo saem; edição de chunk lixo também', () => {
    const k = `${Math.floor(X / 16)},${Math.floor(Z / 16)}`;
    const n = abrir(
      {
        itensSoltos: [
          { item: 'trigo', qtd: 1, x: 1e300, y: 70, z: 0 },
          { item: 'trigo', qtd: 2, x: X + 0.5, y: Y + 0.5, z: Z + 0.5 },
        ],
        conteineres: { baus: { '1e300,70,0': [], [`${X},${Y},${Z}`]: [] } },
        lavoura: { [`${X},120,${Z}`]: 1e300, __proto__: 5, '9e99,1,1': 3 },
        spawn: { x: 1e300, z: 0 },
      },
      { [k]: [[5, 1]], '1e300,0': [[0, 70]], '9999999999999,0': [[0, 70]], lixo: 3 },
    );
    expect(n.estado.mundoItens.itens.map((i) => i.qtd)).toEqual([2]);
    expect(Math.abs(n.estado.jogadores.get('ana')!.spawn.x)).toBeLessThan(1e8);
    expect(medir(n)).toBeLessThan(20);
    const salvo = n.salvar();
    expect(Object.keys(salvo.edicoes)).toEqual([k]);
    expect(Object.keys((salvo.extras.conteineres as { baus: object }).baus)).toEqual([
      `${X},${Y},${Z}`,
    ]);
  });

  it('o bicho criado longe de todos fica parado (sem IA nem terreno) e é salvo', () => {
    const longe = 2_000_000;
    const criados = [{ tipo: 'cervo', x: longe + 0.5, y: 120, z: 0.5, vida: 10, casa: [longe, 0] }];
    const n = abrir({ criaturas: { criados } });
    n.comando('ana', tel(X + 0.5, Z + 0.5));
    const c = n.estado.populacao.lista.find((b) => b.criado)!;
    expect(c).toBeDefined();
    for (let i = 0; i < 100; i++) n.passo();
    // não caiu (não assenta): ninguém gerou o terreno de lá
    expect(c.y).toBe(120);
    const salvo = n.salvar().extras.criaturas as { criados: { x: number; y: number }[] };
    expect(salvo.criados).toEqual([expect.objectContaining({ x: longe + 0.5, y: 120 })]);
  });
});

describe('lavoura grande não pesa no servidor', () => {
  it('editar em lote não põe planta sem terra arada (e a tela é corrigida)', () => {
    const n = nuvem('criativo');
    const lote = [];
    for (let i = 0; i < 64; i++)
      lote.push({ x: X - 32 + i, y: 120, z: Z, v: empacotar(Bloco.TRIGO_0) });
    // terra arada e planta no mesmo lote (a planta vem antes no lote): entra
    lote.push({ x: X, y: 110, z: Z + 3, v: empacotar(Bloco.TRIGO_1) });
    lote.push({ x: X, y: 109, z: Z + 3, v: empacotar(Bloco.TERRA_ARADA) });
    expect(mandar(n, 'ana', { t: 'editar', id: 5, lote })).toBe(true);
    expect(n.estado.lavoura.size).toBe(1);
    expect(bloco(n, X, 110, Z + 3)).toBe(Bloco.TRIGO_1);
    expect(bloco(n, X - 32, 120, Z)).toBe(Bloco.AR);
    const q = n.quadros().get('ana')!;
    expect(q.blocos?.filter((b) => b.y === 120 && b.v === Bloco.AR).length).toBe(64);
  });

  // Protege: a lavoura enorme não pesa no passo do servidor (antes da correção da 013, cada
  // passo recalculava a luz de todo pé: 282 ms). Spec 034 (T14): o teste conta o trabalho de
  // cada passo (pés que crescem e células de luz calculadas), que não depende da máquina; os
  // milissegundos só vão para o log.
  it('40.960 pés de lavoura (10 andares, à noite, sem céu): o passo tem teto de trabalho e a luz fica guardada', () => {
    const n = nuvem('criativo');
    for (let k = 0; k < 10; k++) {
      const terra = [];
      const pes = [];
      for (let i = 0; i < 4096; i++) {
        const x = X - 32 + (i % 64);
        const z = Z - 32 + Math.floor(i / 64);
        terra.push({ x, y: 100 + 2 * k, z, v: empacotar(Bloco.TERRA_ARADA) });
        pes.push({ x, y: 101 + 2 * k, z, v: empacotar(Bloco.TRIGO_0) });
      }
      mandar(n, 'ana', { t: 'editar', id: 100 + 2 * k, lote: terra });
      mandar(n, 'ana', { t: 'editar', id: 101 + 2 * k, lote: pes });
    }
    // uma tocha no meio da lavoura (a luz conta) e a noite fechada
    n.estado.edicoes.definir(X, 112, Z, Bloco.TOCHA);
    n.comando('ana', { t: 'depurar', d: { f: 'hora', hora: 0 } });
    n.comando('ana', { t: 'depurar', d: { f: 'pausarDia', pausar: true } });
    expect(n.estado.lavoura.size).toBe(40960);
    // 30 s de jogo: nos primeiros segundos a luz de cada célula é calculada aos poucos
    // (com teto por passo); depois fica guardada
    const passos = 600;
    const tempos: number[] = [];
    const pes: number[] = [];
    const luzes: number[] = [];
    for (let i = 0; i < passos; i++) {
      const a = performance.now();
      n.passo();
      n.quadros();
      tempos.push(performance.now() - a);
      pes.push(n.estado.trabalhoLavoura.pes);
      luzes.push(n.estado.trabalhoLavoura.luzes);
      if (process.env.DETALHE) console.log(i, tempos[i].toFixed(1), pes[i], luzes[i]);
    }
    const media = (de: number) => tempos.slice(de).reduce((a, b) => a + b, 0) / (passos - de);
    const soma = (l: number[]) => l.reduce((a, b) => a + b, 0);
    console.log(
      `lavoura de 40960 pés: ${media(0).toFixed(2)} ms por passo em 30 s ` +
        `(${media(400).toFixed(2)} ms depois de aquecer); ${soma(luzes)} células de luz, ` +
        `${soma(pes)} pés crescidos`,
    );
    // cada passo: no máximo ORCAMENTO_LAVOURA pés e ORCAMENTO_LUZ células de luz (cada uma
    // lê 2025 blocos), e a volta pela lavoura anda o tempo todo
    expect(Math.max(...pes)).toBeLessThanOrEqual(ORCAMENTO_LAVOURA);
    expect(Math.max(...luzes)).toBeLessThanOrEqual(ORCAMENTO_LUZ);
    expect(Math.min(...pes.slice(1))).toBeGreaterThan(0);
    // a luz é calculada uma vez por célula 2x2x2 e fica guardada: depois de aquecer, nenhuma
    // célula é calculada de novo (a luz guardada vale 60 s, mais que os 30 s do teste)
    const celulas = new Set(
      [...n.estado.lavoura.values()].map((c) => `${c.x >> 1},${c.y >> 1},${c.z >> 1}`),
    );
    expect(soma(luzes)).toBeLessThanOrEqual(celulas.size);
    expect(soma(luzes.slice(400))).toBe(0);
    // cresceu o tempo todo: 30 s à noite (metade) = uns 15 s de progresso em cada pé, e
    // perto da tocha como de dia (30 s)
    const ps = [...n.estado.lavoura.values()].map((c) => c.p);
    expect(Math.min(...ps)).toBeGreaterThan(12);
    expect(Math.max(...ps)).toBeLessThan(31);
  }, 120_000);
});

describe('luz e caches do mundo do núcleo', () => {
  it('a luz da célula lida direto dos chunks é a mesma da conta bloco a bloco', () => {
    const ed = criarEdicoes();
    const m = criarAcessoMundo(SEMENTE, ed);
    // tochas e lanternas espalhadas, inclusive na beirada dos chunks
    const fontes: [number, number, number, number][] = [
      [X, Y + 1, Z, Bloco.TOCHA],
      [X + 15 - (X & 15), Y + 3, Z, Bloco.LANTERNA],
      [X - 9, Y, Z + 7, Bloco.TOCHA],
      [X + 4, Y - 3, Z - 6, Bloco.LANTERNA],
    ];
    for (const [x, y, z, b] of fontes) ed.definir(x, y, z, b);
    const conta = (xr: number, yr: number, zr: number) => {
      const x = xr & ~1;
      const y = yr & ~1;
      const z = zr & ~1;
      let melhor = 0;
      for (let dy = -4; dy <= 4; dy++)
        for (let dz = -7; dz <= 7; dz++)
          for (let dx = -7; dx <= 7; dx++) {
            const l = luzDoBloco(m.bloco(x + dx, y + dy, z + dz));
            if (l > 0) melhor = Math.max(melhor, l - Math.abs(dx) - Math.abs(dy) - Math.abs(dz));
          }
      return melhor;
    };
    let acesas = 0;
    for (let dx = -12; dx <= 12; dx += 3)
      for (let dz = -12; dz <= 12; dz += 3)
        for (const dy of [-5, 0, 2, 5]) {
          const v = m.luzDaCelula(X + dx, Y + dy, Z + dz);
          expect(v).toBe(conta(X + dx, Y + dy, Z + dz));
          if (v > 0) acesas++;
        }
    expect(acesas).toBeGreaterThan(20);
    // no fundo e no topo do mundo também
    expect(m.luzDaCelula(X, 1, Z)).toBe(conta(X, 1, Z));
    expect(m.luzDaCelula(X, 127, Z)).toBe(conta(X, 127, Z));
  });

  it('o cache esquece aos poucos (nunca apaga tudo de uma vez)', () => {
    const c = criarCacheGeracional<number>(100);
    for (let i = 0; i < 150; i++) c.guardar(`k${i}`, i);
    // o que foi guardado há pouco continua lá, e o lido da geração velha volta para a nova
    expect(c.obter('k149')).toBe(149);
    expect(c.obter('k10')).toBe(10);
    for (let i = 150; i < 260; i++) c.guardar(`k${i}`, i);
    expect(c.obter('k259')).toBe(259);
    expect(c.tamanho).toBeLessThanOrEqual(200);
    expect(c.tamanho).toBeGreaterThan(100);
  });
});

describe('arar tira a planta baixa de cima e solta o que ela soltaria', () => {
  it('a flor em cima da grama arada cai como item (sobrevivência)', () => {
    const n = nuvem();
    const F = { x: X + 1, y: Y - 1, z: Z + 1 };
    n.estado.edicoes.definir(F.x, F.y, F.z, Bloco.TERRA_MUSGOSA);
    n.estado.edicoes.definir(F.x, F.y + 1, F.z, Bloco.FLOR);
    inv(n, 'ana').definir(0, { item: 'enxada_madeira', qtd: 1, dur: 60 });
    mandar(n, 'ana', { t: 'arar', id: 1, ...F, slot: 0 });
    expect(bloco(n, F.x, F.y, F.z)).toBe(Bloco.TERRA_ARADA);
    expect(bloco(n, F.x, F.y + 1, F.z)).toBe(Bloco.AR);
    expect(n.estado.mundoItens.itens.map((i) => i.item)).toEqual([idDoBloco(Bloco.FLOR)]);
  });

  it('no criativo nada cai', () => {
    const n = nuvem('criativo');
    const F = { x: X + 1, y: Y - 1, z: Z + 1 };
    n.estado.edicoes.definir(F.x, F.y, F.z, Bloco.TERRA_MUSGOSA);
    n.estado.edicoes.definir(F.x, F.y + 1, F.z, Bloco.FLOR);
    inv(n, 'ana').definir(0, { item: 'enxada_madeira', qtd: 1, dur: 60 });
    mandar(n, 'ana', { t: 'arar', id: 1, ...F, slot: 0 });
    expect(bloco(n, F.x, F.y + 1, F.z)).toBe(Bloco.AR);
    expect(n.estado.mundoItens.itens).toEqual([]);
  });
});
