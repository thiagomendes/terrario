import { afterAll, afterEach, describe, expect, it } from 'vitest';
import '../../src/temas/todos';
import { obterTema } from '../../src/temas';
import { criarNucleo, type Nucleo } from '../../src/nucleo/nucleo';
import { sanear, sanearExtras } from '../../src/nucleo/saneamento';
import {
  cidadeDoMundo,
  definirEstiloMundo,
  encontrarNascimento,
  ESTILO_PADRAO,
} from '../../src/world/chunk';
import { limparCidades } from '../../src/world/cidade';
import { limparPovoados } from '../../src/world/povoado';
import { Bloco } from '../../src/world/blocks';
import { empacotar } from '../../src/world/edicoes';
import { celulasPlanejadas, definirObrasFeitas } from '../../src/world/obras';
import { COLHER_PEDREIRO } from '../../src/jogo/exclusivos';
import { COMPRAS_POR_SESSAO, ESPERA_BANCA, ESPERA_MESMO_BICHO } from '../../src/jogo/alma';
import { PASSO, type Comando, type EventoNucleo } from '../../src/nucleo/protocolo';
import type { EstiloMundo } from '../../src/temas/tipos';

/**
 * Spec 023 (T03): a alma no núcleo. Os ganhos saem do núcleo, só para quem ganhou; a obra dá
 * para todo ajudante (também o que volta depois); colheita, colheita da própria roça, bicho
 * (o mesmo só depois de 1 minuto), pão, troca e lugares; almaFixar; saneamento na nuvem;
 * salvar e reabrir; mundo de outro tema não tem alma; local e nuvem dão os mesmos eventos.
 */
const CIDADE = obterTema('cidade-grande').mundo;
const RANCHO = obterTema('rancho-alegre').mundo;
const SEMENTE = 1337;

function usar(estilo: EstiloMundo): void {
  definirEstiloMundo(estilo);
  limparCidades();
  limparPovoados();
}
afterEach(() => definirObrasFeitas([]));
afterAll(() => usar(ESTILO_PADRAO));

let ids = 5000;
const id = () => ++ids;

function tel(x: number, y: number, z: number): Comando {
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
  };
}

/** Na nuvem, todo comando passa pelo saneamento (como no servidor). */
function mandar(n: Nucleo, quem: string, c: unknown, confiar: boolean): void {
  if (confiar) return n.comando(quem, c as Comando);
  const s = sanear(c);
  expect(s, JSON.stringify(c)).not.toBeNull();
  n.comando(quem, s!);
}

function ir(n: Nucleo, quem: string, x: number, y: number, z: number): void {
  n.estado.jogadores.get(quem)!.saltoPermitido = true;
  n.comando(quem, tel(x, y, z));
}

function abrir(
  estilo: EstiloMundo,
  confiar: boolean,
  quem: string[] = ['ana'],
  dados?: Parameters<typeof criarNucleo>[0]['dados'],
  modo: 'criativo' | 'sobrevivencia' = 'criativo',
) {
  usar(estilo);
  const n = criarNucleo({
    semente: SEMENTE,
    modo,
    versaoMundo: 2,
    confiarNoCliente: confiar,
    depuracao: true,
    dono: quem[0],
    dados,
  });
  for (const q of quem) n.conectar(q, { perfil: { apelido: q, aparencia: {} } });
  return n;
}

/** Um passo e os eventos `alma` de cada um. */
function almas(n: Nucleo): Map<string, Extract<EventoNucleo, { e: 'alma' }>[]> {
  n.passo();
  const r = new Map<string, Extract<EventoNucleo, { e: 'alma' }>[]>();
  for (const [q, f] of n.quadros())
    r.set(
      q,
      (f.eventos ?? []).filter((e): e is Extract<EventoNucleo, { e: 'alma' }> => e.e === 'alma'),
    );
  return r;
}
const ganhoDe = (evs: Extract<EventoNucleo, { e: 'alma' }>[] | undefined) =>
  (evs ?? []).reduce(
    (s, e) => ({
      moedas: s.moedas + e.ganho.moedas,
      xp: Math.round((s.xp + e.ganho.xp) * 100) / 100,
    }),
    { moedas: 0, xp: 0 },
  );
const concluidas = (evs: Extract<EventoNucleo, { e: 'alma' }>[] | undefined) =>
  (evs ?? []).flatMap((e) => e.missoes.filter((m) => m.concluiu));

// ---------------------------------------------------------------- Rancho: a roça no alto
const p0 = encontrarNascimento(SEMENTE);
const X = Math.floor(p0.x);
const Z = Math.floor(p0.z);
const Y = 110;

/** Plataforma no céu com terra arada e trigo maduro (posto por `quem`, que fica dono). */
function roca(
  n: Nucleo,
  quem: string,
  celulas: number,
  confiar: boolean,
  dz = 0,
): { x: number; z: number }[] {
  ir(n, quem, X + 0.5, Y + 1, Z + 0.5 + dz);
  const lote: { x: number; y: number; z: number; v: number }[] = [];
  const pes: { x: number; z: number }[] = [];
  for (let i = 0; i < celulas; i++) {
    const x = X + 1 + i;
    const z = Z + dz;
    lote.push({ x, y: Y, z, v: empacotar(Bloco.TERRA_ARADA) });
    lote.push({ x, y: Y + 1, z, v: empacotar(Bloco.TRIGO_3) });
    pes.push({ x, z });
  }
  lote.push({ x: X, y: Y, z: Z + dz, v: empacotar(Bloco.PEDRA_LISA) });
  mandar(n, quem, { t: 'editar', id: id(), lote }, confiar);
  return pes;
}
function colher(n: Nucleo, quem: string, pe: { x: number; z: number }, confiar: boolean): void {
  ir(n, quem, pe.x + 0.5, Y + 1, pe.z + 1.5);
  mandar(n, quem, { t: 'quebrar', id: id(), x: pe.x, y: Y + 1, z: pe.z, slot: 0 }, confiar);
}

describe('alma no núcleo: Rancho', () => {
  it('ao entrar, o quadro de missões vai só para quem entrou', () => {
    const n = abrir(RANCHO, false, ['ana', 'leo']);
    expect(n.estado.mundoAlma).toBe('rancho-alegre');
    const a = almas(n);
    expect(a.get('ana')![0].quadro?.abertas.map((m) => m.id)).toEqual(['r1', 'r2']);
    expect(almas(n).get('ana')).toEqual([]);
  });

  it('colher maduro: r1 com a Caipira, só para quem colheu; a roça própria conta na r7', () => {
    const n = abrir(RANCHO, false, ['ana', 'leo']);
    almas(n);
    // o Léo põe uma roça (é dele); a Ana, dona do mundo, colhe um pé dela: conta como
    // colheita, mas não como "a sua roça" (r7)
    const doLeo = roca(n, 'leo', 1, false, 4);
    almas(n);
    colher(n, 'ana', doLeo[0], false);
    let a = almas(n);
    expect(ganhoDe(a.get('ana')).xp).toBe(2);
    expect(a.get('leo')).toEqual([]);
    expect(n.estado.almas.get('ana')!.progresso).toEqual({ r1: 1 });
    const pes = roca(n, 'ana', 4, false);
    for (const pe of pes.slice(0, 3)) colher(n, 'ana', pe, false);
    a = almas(n);
    expect(n.estado.almas.get('ana')!.progresso).toMatchObject({ r1: 4, r7: 3 });
    // r7 começou (devagar): o quadro muda e ela entra nas abertas
    const quadro = a.get('ana')!.find((e) => e.quadro)!.quadro!;
    expect(quadro.abertas.map((m) => m.id)).toEqual(['r1', 'r2', 'r7']);
    colher(n, 'ana', pes[3], false);
    a = almas(n);
    const c = concluidas(a.get('ana'));
    expect(c).toEqual([{ id: 'r1', feito: 5, meta: 5, concluiu: true, fantasia: 'caipira' }]);
    expect(ganhoDe(a.get('ana')).moedas).toBe(3);
    expect(a.get('leo')).toEqual([]);
    expect(n.estado.almas.get('ana')!.livro.moedas).toBe(3);
    // o Léo colhe o que é dele: conta para ele (e como "a sua roça")
    const outro = roca(n, 'leo', 1, false, 6);
    almas(n);
    colher(n, 'leo', outro[0], false);
    almas(n);
    expect(n.estado.almas.get('leo')!.progresso).toEqual({ r1: 1, r7: 1 });
  });

  it('colher verde não conta; o mesmo bicho só conta de novo depois de 1 minuto', () => {
    const n = abrir(RANCHO, true, ['local']);
    almas(n);
    ir(n, 'local', X + 0.5, Y + 1, Z + 0.5);
    n.comando('local', {
      t: 'editar',
      id: id(),
      lote: [
        { x: X + 1, y: Y, z: Z, v: empacotar(Bloco.TERRA_ARADA) },
        { x: X + 1, y: Y + 1, z: Z, v: empacotar(Bloco.TRIGO_0) },
        { x: X, y: Y, z: Z, v: empacotar(Bloco.PEDRA_LISA) },
        { x: X + 2, y: Y, z: Z, v: empacotar(Bloco.PEDRA_LISA) },
      ],
    });
    n.comando('local', { t: 'quebrar', id: id(), x: X + 1, y: Y + 1, z: Z, slot: 0 });
    expect(n.estado.almas.get('local')!.progresso).toEqual({});
    // a galinha (papel coelho) ao lado, com milho na mão
    n.comando('local', {
      t: 'depurar',
      d: { f: 'invocar', tipo: 'coelho', x: X + 2.5, y: Y + 1, z: Z + 0.5 },
    });
    const g = n.estado.populacao.lista[n.estado.populacao.lista.length - 1];
    expect(g.tipo).toBe('coelho');
    n.estado.jogadores.get('local')!.inventario.definir(0, { item: 'semente_milho', qtd: 64 });
    const dar = () => n.comando('local', { t: 'alimentar', criatura: g.id, slot: 0 });
    const prender = () => {
      g.x = X + 2.5;
      g.z = Z + 0.5;
    };
    dar();
    expect(n.estado.almas.get('local')!.progresso).toEqual({ r2: 1 });
    for (let i = 0; i < 2 / PASSO; i++) n.passo();
    prender();
    dar();
    expect(n.estado.almas.get('local')!.progresso).toEqual({ r2: 1 });
    for (let i = 0; i < ESPERA_MESMO_BICHO / PASSO; i++) {
      n.passo();
      if (i % 100 === 0) prender();
    }
    prender();
    dar();
    const e = n.estado.almas.get('local')!;
    expect(e.feitas).toEqual(['r2']);
  });

  it('o ovo jogado no chão e pego de novo não conta', () => {
    const n = abrir(RANCHO, true, ['local']);
    almas(n);
    roca(n, 'local', 1, true);
    n.comando('local', {
      t: 'depurar',
      d: { f: 'soltarItem', item: 'ovo', qtd: 1, x: X + 0.5, y: Y + 1.2, z: Z + 0.5 },
    });
    for (let i = 0; i < 40; i++) n.passo();
    expect(n.estado.jogadores.get('local')!.inventario.contar('ovo')).toBe(1);
    expect(n.estado.almas.get('local')!.progresso).toEqual({});
  });

  it('pão: conta com a conta dos itens fechando; na nuvem, receita sem ingrediente não conta', () => {
    const n = abrir(RANCHO, false, ['ana'], undefined, 'sobrevivencia');
    almas(n);
    const ana = n.estado.jogadores.get('ana')!;
    ana.inventario.definir(0, { item: 'trigo', qtd: 3 });
    mandar(
      n,
      'ana',
      {
        t: 'transacao',
        id: id(),
        mudancas: [
          { onde: 'inv', i: 0, antes: { item: 'trigo', qtd: 3 }, depois: null },
          { onde: 'inv', i: 1, antes: null, depois: { item: 'pao', qtd: 1 } },
        ],
        fabricou: [{ receita: 'pao', vezes: 1 }],
      },
      false,
    );
    expect(n.estado.almas.get('ana')!.livro.xp).toBe(5);
    // no criativo da nuvem a transação passa, mas pão do nada não conta
    const c = abrir(RANCHO, false, ['ana']);
    almas(c);
    mandar(
      c,
      'ana',
      {
        t: 'transacao',
        id: id(),
        mudancas: [{ onde: 'inv', i: 1, antes: null, depois: { item: 'pao', qtd: 1 } }],
        fabricou: [{ receita: 'pao', vezes: 64 }],
      },
      false,
    );
    expect(c.estado.jogadores.get('ana')!.inventario.obter(1)).toEqual({ item: 'pao', qtd: 1 });
    expect(c.estado.almas.get('ana')!.livro.xp).toBe(0);
  });

  it('almaFixar: só uma aberta; lixo não passa no saneamento; o quadro volta com a fixada', () => {
    const n = abrir(RANCHO, false);
    almas(n);
    mandar(n, 'ana', { t: 'almaFixar', missao: 'r2' }, false);
    expect(almas(n).get('ana')![0].quadro?.fixada).toBe('r2');
    mandar(n, 'ana', { t: 'almaFixar', missao: 'r5' }, false);
    expect(n.estado.almas.get('ana')!.fixada).toBe('r2');
    expect(almas(n).get('ana')).toEqual([]);
    mandar(n, 'ana', { t: 'almaFixar', missao: null }, false);
    expect(n.estado.almas.get('ana')!.fixada).toBeNull();
    expect(sanear({ t: 'almaFixar', missao: 'x'.repeat(40) })).toBeNull();
    expect(sanear({ t: 'almaFixar', missao: 3 })).toBeNull();
    expect(sanear({ t: 'almaFixar' })).toBeNull();
  });

  it('salvar e reabrir: cada jogador com a sua alma; lixo no salvo sai', () => {
    const n = abrir(RANCHO, false, ['ana', 'leo']);
    almas(n);
    const pes = roca(n, 'ana', 5, false);
    for (const pe of pes) colher(n, 'ana', pe, false);
    almas(n);
    const salvo = n.salvar();
    const alma = salvo.extras['alma'] as Record<string, { feitas: string[] }>;
    expect(alma.ana.feitas).toEqual(['r1']);
    expect(alma.leo.feitas).toEqual([]);
    const outra = abrir(RANCHO, false, ['ana'], {
      versao: 1,
      edicoes: salvo.edicoes,
      jogador: null,
      hora: salvo.hora,
      extras: { ...salvo.extras, alma: { ...alma, 'id ruim': {} } },
    });
    expect(outra.estado.almas.get('ana')!.feitas).toEqual(['r1']);
    expect(outra.estado.almas.has('id ruim')).toBe(false);
    expect(almas(outra).get('ana')![0].quadro?.feitas).toEqual(['r1']);
    expect(sanearExtras({ alma: [1, 2] })).toEqual({});
    expect(sanearExtras({ alma: { ana: {} } })).toEqual({ alma: { ana: {} } });
  });

  it('local e nuvem dão os mesmos eventos alma', () => {
    const rodar = (confiar: boolean) => {
      const n = abrir(RANCHO, confiar, ['ana']);
      const todos: unknown[] = [...(almas(n).get('ana') ?? [])];
      const pes = roca(n, 'ana', 6, confiar);
      for (const pe of pes) {
        colher(n, 'ana', pe, confiar);
        todos.push(...(almas(n).get('ana') ?? []));
      }
      mandar(n, 'ana', { t: 'almaFixar', missao: 'r3' }, confiar);
      todos.push(...(almas(n).get('ana') ?? []));
      return todos;
    };
    const local = rodar(true);
    const nuvem = rodar(false);
    expect(local.length).toBeGreaterThan(6);
    expect(nuvem).toEqual(local);
  });
});

describe('alma no núcleo: Cidade', () => {
  it('a obra 1: cada bloco dá XP a quem pôs; feita, todo ajudante ganha c1; quem não ajudou passa', () => {
    const n = abrir(CIDADE, false, ['ana', 'leo', 'bia']);
    expect(n.estado.mundoAlma).toBe('cidade-grande');
    almas(n);
    const plano = cidadeDoMundo(SEMENTE)!;
    const obra = celulasPlanejadas(plano, 1);
    for (const q of ['ana', 'leo'])
      n.estado.jogadores.get(q)!.inventario.definir(0, { item: COLHER_PEDREIRO, qtd: 1 });
    const por = (q: string, i: number) => {
      const c = obra[i];
      ir(n, q, c.x + 0.5, c.y + 2, c.z + 0.5);
      mandar(
        n,
        q,
        { t: 'colocar', id: id(), x: c.x, y: c.y, z: c.z, bloco: c.bloco, meta: 0, slot: 0 },
        false,
      );
    };
    por('leo', 0);
    let a = almas(n);
    // o Léo ganhou o bloco; a Ana e a Bia só veem a bolinha da c1 andar (sem ganho)
    expect(ganhoDe(a.get('leo')).xp).toBe(1.2);
    expect(a.get('ana')![0].missoes).toEqual([{ id: 'c1', feito: 1, meta: obra.length }]);
    expect(ganhoDe(a.get('ana'))).toEqual({ moedas: 0, xp: 0 });
    // o Léo sai antes de terminar (volta depois)
    n.desconectar('leo');
    for (let i = 1; i < obra.length; i++) por('ana', i);
    a = almas(n);
    expect(n.obrasFeitas).toEqual([1]);
    expect(concluidas(a.get('ana'))).toEqual([
      {
        id: 'c1',
        feito: obra.length,
        meta: obra.length,
        concluiu: true,
        fantasia: 'capacete-obra',
      },
    ]);
    expect(ganhoDe(a.get('bia')).moedas).toBe(0);
    expect(n.estado.almas.get('bia')!.puladas).toEqual(['c1']);
    // o Léo volta: ajudou, então ganha a c1 ao entrar
    n.conectar('leo', { perfil: { apelido: 'leo', aparencia: {} } });
    a = almas(n);
    expect(concluidas(a.get('leo'))[0]).toMatchObject({ id: 'c1', fantasia: 'capacete-obra' });
    expect(ganhoDe(a.get('leo')).moedas).toBe(3);
  });

  it('lugares: a padaria conta uma vez, a cada meio segundo de passo', () => {
    const n = abrir(CIDADE, false);
    almas(n);
    const plano = cidadeDoMundo(SEMENTE)!;
    const l = plano.lotes.find((q) => q.uso === 'padaria')!;
    ir(n, 'ana', l.x0 + 2.5, plano.h + 1, l.z0 + 2.5);
    let xp = 0;
    for (let i = 0; i < 30; i++) xp += ganhoDe(almas(n).get('ana')).xp;
    expect(xp).toBe(5);
    expect(n.estado.almas.get('ana')!.lugares).toEqual(['padaria']);
  });

  it('passeio na nuvem e no local: o evento e o quadro dizem quais lugares já foram', () => {
    const eventos = (confiar: boolean) => {
      const n = abrir(CIDADE, confiar);
      almas(n);
      // c1 e c2 já feitas: a c3 (o passeio) está aberta
      const e = n.estado.almas.get('ana')!;
      e.feitas.push('c1', 'c2');
      const plano = cidadeDoMundo(SEMENTE)!;
      const l = plano.lotes.find((q) => q.uso === 'sorveteria')!;
      ir(n, 'ana', l.x0 + 2.5, plano.h + 1, l.z0 + 2.5);
      const evs: Extract<EventoNucleo, { e: 'alma' }>[] = [];
      for (let i = 0; i < 30; i++) evs.push(...(almas(n).get('ana') ?? []));
      mandar(n, 'ana', { t: 'almaFixar', missao: 'c3' }, confiar);
      evs.push(...(almas(n).get('ana') ?? []));
      return evs;
    };
    for (const confiar of [true, false]) {
      const evs = eventos(confiar);
      const andou = evs.flatMap((e) => e.missoes).find((m) => m.id === 'c3');
      expect(andou, `confiar=${confiar}`).toEqual({
        id: 'c3',
        feito: 1,
        meta: 3,
        usos: ['sorveteria'],
      });
      const quadro = evs
        .map((e) => e.quadro)
        .filter(Boolean)
        .pop()!;
      expect(quadro.abertas.find((a) => a.id === 'c3')).toMatchObject({ usos: ['sorveteria'] });
    }
    expect(JSON.stringify(eventos(true))).toBe(JSON.stringify(eventos(false)));
  });
});

describe('alma no núcleo: os outros mundos (o nível sobe em todo mundo)', () => {
  // spec 031: o Doce Reino ganhou missões; a Mata Encantada continua sem
  const DOCE = obterTema('mata-encantada').mundo;
  /** Uma tarde num mundo sem missões: põe bloco, planta, colhe, dá comida e faz receitas. */
  function tarde(estilo: EstiloMundo, confiar: boolean) {
    const n = abrir(estilo, confiar, ['ana']);
    const evs: Extract<EventoNucleo, { e: 'alma' }>[] = [...(almas(n).get('ana') ?? [])];
    const ana = n.estado.jogadores.get('ana')!;
    // a roça pronta (2 pés maduros), um bloco posto à mão ('colocou') e as 2 colheitas
    const pes = roca(n, 'ana', 2, confiar);
    mandar(
      n,
      'ana',
      { t: 'colocar', id: id(), x: X - 1, y: Y, z: Z, bloco: Bloco.PEDRA_LISA, meta: 0, slot: 0 },
      confiar,
    );
    for (const pe of pes) {
      colher(n, 'ana', pe, confiar);
      evs.push(...(almas(n).get('ana') ?? []));
    }
    // pão (comida: 'cozinhou') e um graveto (não é comida: 'fabricou')
    ana.inventario.definir(0, { item: 'trigo', qtd: 3 });
    mandar(
      n,
      'ana',
      {
        t: 'transacao',
        id: id(),
        mudancas: [
          { onde: 'inv', i: 0, antes: { item: 'trigo', qtd: 3 }, depois: null },
          { onde: 'inv', i: 5, antes: null, depois: { item: 'pao', qtd: 1 } },
        ],
        fabricou: [{ receita: 'pao', vezes: 1 }],
      },
      confiar,
    );
    evs.push(...(almas(n).get('ana') ?? []));
    // dar comida a um bicho do tema (a família 'criou:' vale para qualquer bicho)
    n.comando('ana', {
      t: 'depurar',
      d: { f: 'invocar', tipo: 'coelho', x: X + 3.5, y: Y + 1, z: Z + 0.5 },
    });
    const g = n.estado.populacao.lista[n.estado.populacao.lista.length - 1];
    ana.inventario.definir(1, { item: 'semente_milho', qtd: 8 });
    ir(n, 'ana', X + 2.5, Y + 1, Z + 0.5);
    mandar(n, 'ana', { t: 'alimentar', criatura: g.id, slot: 1 }, confiar);
    evs.push(...(almas(n).get('ana') ?? []));
    return { n, evs };
  }

  it('sem missões nem quadro, mas o XP e as habilidades das ações soltas, com os mesmos valores', () => {
    for (const estilo of [ESTILO_PADRAO, DOCE]) {
      const { n, evs } = tarde(estilo, true);
      expect(n.estado.mundoAlma).toBeNull();
      // nada de missão nem de quadro (o cartão do HUD não aparece nesses mundos)
      expect(evs.every((e) => !e.quadro && e.missoes.length === 0)).toBe(true);
      const livro = n.estado.almas.get('ana')!.livro;
      expect(livro.moedas).toBe(0);
      // 1 bloco (0,2) + 2 colhidos (4) + pão (5) + dar comida (4)
      expect(livro.pontos.fazendeiro).toBe(1);
      expect(livro.pontos.cozinheiro).toBe(1);
      expect(livro.pontos.bichos).toBe(1);
      expect(livro.pontos.construtor).toBe(0.1);
      expect(livro.xp).toBe(13.2);
      expect(ganhoDe(evs).xp).toBe(livro.xp);
      // salva e reabre com a alma do jogador (o livro-razão do mundo)
      const salvo = n.salvar().extras;
      expect((salvo['alma'] as Record<string, { livro: { xp: number } }>).ana.livro.xp).toBe(
        livro.xp,
      );
    }
  });

  it('local e nuvem dão os mesmos eventos; a banca não abre fora da Cidade e do Rancho', () => {
    const local = tarde(DOCE, true).evs;
    const nuvem = tarde(DOCE, false).evs;
    expect(local.length).toBeGreaterThan(3);
    expect(nuvem).toEqual(local);
    const n = abrir(DOCE, false, ['ana']);
    expect(comprar(n, 'flores', 99).filter((e) => e.e === 'almaCompraRecusada')).toEqual([
      { e: 'almaCompraRecusada', item: 'flores', motivo: 'tema' },
    ]);
  });

  it('receita que não é comida dá pouco (1 XP); comida da fornalha conta como a pipoca', () => {
    const n = abrir(DOCE, true, ['ana'], undefined, 'sobrevivencia');
    almas(n);
    n.comando('ana', {
      t: 'transacao',
      id: id(),
      mudancas: [{ onde: 'inv', i: 1, antes: null, depois: { item: 'graveto', qtd: 4 } }],
      fabricou: [{ receita: 'graveto', vezes: 1 }],
    });
    expect(n.estado.almas.get('ana')!.livro.xp).toBe(1);
    expect(n.estado.almas.get('ana')!.livro.pontos.cozinheiro).toBe(0.25);
  });
});

// ---------------------------------------------------------------- banca (T04)
type Ev = EventoNucleo;
function passar(n: Nucleo, segundos: number): Ev[] {
  const evs: Ev[] = [];
  for (let i = 0; i < Math.round(segundos / PASSO); i++) {
    n.passo();
    evs.push(...(n.quadros().get('ana')?.eventos ?? []));
  }
  return evs;
}
function comprar(n: Nucleo, item: string, saldo: number, confiar = false): Ev[] {
  mandar(n, 'ana', { t: 'comprarBanca', item, saldo }, confiar);
  return passar(n, PASSO);
}
const daBanca = (evs: Ev[]) =>
  evs.filter((e) => e.e === 'almaCompra' || e.e === 'almaCompraRecusada');

describe('banca do mundo no núcleo (T04)', () => {
  it('só itens do tema; sem saldo não vende; entrega de verdade na mochila; livro-razão', () => {
    const n = abrir(CIDADE, false);
    passar(n, PASSO);
    expect(daBanca(comprar(n, 'feno', 99))).toEqual([
      { e: 'almaCompraRecusada', item: 'feno', motivo: 'tema' },
    ]);
    expect(daBanca(comprar(n, 'galinha', 99))).toEqual([
      { e: 'almaCompraRecusada', item: 'galinha', motivo: 'tema' },
    ]);
    expect(daBanca(comprar(n, 'flores', 2))).toEqual([
      { e: 'almaCompraRecusada', item: 'flores', motivo: 'saldo' },
    ]);
    expect(n.estado.jogadores.get('ana')!.inventario.contar('bloco:9')).toBe(0);
    expect(daBanca(comprar(n, 'flores', 3))).toEqual([
      { e: 'almaCompra', item: 'flores', preco: 3 },
    ]);
    expect(n.estado.jogadores.get('ana')!.inventario.contar('bloco:9')).toBe(6);
    const e = n.estado.almas.get('ana')!;
    expect(e.livro.gasto).toBe(3);
    expect(e.livro.compras).toEqual({ flores: 1 });
    // salvo com o mundo
    expect(
      (n.salvar().extras['alma'] as Record<string, { livro: { gasto: number } }>).ana.livro.gasto,
    ).toBe(3);
  });

  it('1 compra a cada 2 s e 30 por sessão da sala', () => {
    const n = abrir(CIDADE, false);
    passar(n, PASSO);
    expect(daBanca(comprar(n, 'poste', 99))[0].e).toBe('almaCompra');
    expect(daBanca(comprar(n, 'poste', 99))).toEqual([
      { e: 'almaCompraRecusada', item: 'poste', motivo: 'espera' },
    ]);
    for (let i = 1; i < COMPRAS_POR_SESSAO; i++) {
      passar(n, ESPERA_BANCA);
      // a mochila esvazia entre uma e outra (o teste é do limite, não da mochila)
      n.estado.jogadores.get('ana')!.inventario.carregar(null);
      expect(daBanca(comprar(n, 'poste', 99))[0].e, `compra ${i + 1}`).toBe('almaCompra');
    }
    passar(n, ESPERA_BANCA);
    expect(daBanca(comprar(n, 'poste', 99))).toEqual([
      { e: 'almaCompraRecusada', item: 'poste', motivo: 'limite' },
    ]);
  });

  it('mochila cheia: o que não cabe espera no baú da banca e entra sozinho quando couber', () => {
    const n = abrir(CIDADE, false);
    passar(n, PASSO);
    const inv = n.estado.jogadores.get('ana')!.inventario;
    for (let i = 0; i < inv.slots.length; i++) inv.definir(i, { item: 'bloco:3', qtd: 64 });
    expect(daBanca(comprar(n, 'janela-acesa', 5))).toEqual([
      { e: 'almaCompra', item: 'janela-acesa', preco: 5, guardado: 6 },
    ]);
    passar(n, ESPERA_BANCA);
    comprar(n, 'janela-acesa', 5);
    expect(n.estado.almas.get('ana')!.bau).toEqual([{ item: 'bloco:94', qtd: 12 }]);
    // o baú vai no quadro de missões (para o baú da tela mostrar)
    inv.definir(7, null);
    const evs = passar(n, 1.1);
    expect(inv.contar('bloco:94')).toBe(12);
    expect(n.estado.almas.get('ana')!.bau).toEqual([]);
    expect(evs).toContainEqual({ e: 'coletou', item: 'bloco:94', qtd: 12 });
    const q = evs.filter((e) => e.e === 'alma' && e.quadro).pop();
    expect(q).toMatchObject({ quadro: { bau: [] } });
  });

  it('a galinha nasce criada, da criança, no galinheiro mais perto (ou ao lado dela)', () => {
    const n = abrir(RANCHO, false, ['ana', 'leo']);
    passar(n, PASSO);
    // o Léo compra (não é o dono do mundo): a galinha é dele
    const antes = n.estado.populacao.lista.length;
    mandar(n, 'leo', { t: 'comprarBanca', item: 'galinha', saldo: 6 }, false);
    n.passo();
    const ev = n.quadros().get('leo')!.eventos ?? [];
    expect(daBanca(ev)).toEqual([{ e: 'almaCompra', item: 'galinha', preco: 6 }]);
    const g = n.estado.populacao.lista[n.estado.populacao.lista.length - 1];
    expect(n.estado.populacao.lista.length).toBe(antes + 1);
    expect(g).toMatchObject({ tipo: 'coelho', criado: true, dono: 'leo' });
    const leo = n.estado.jogadores.get('leo')!.tel;
    // no galinheiro a até 48 blocos, ou do lado da criança
    expect(Math.hypot(g.x - leo.x, g.z - leo.z)).toBeLessThanOrEqual(50);
  });

  it('saneamento na nuvem: saldo e item fora do formato não passam', () => {
    expect(sanear({ t: 'comprarBanca', item: 'flores', saldo: -1 })).toBeNull();
    expect(sanear({ t: 'comprarBanca', item: 'flores', saldo: 1.5 })).toBeNull();
    expect(sanear({ t: 'comprarBanca', item: 'flores', saldo: 1e9 })).toBeNull();
    expect(sanear({ t: 'comprarBanca', item: 'x'.repeat(40), saldo: 3 })).toBeNull();
    expect(sanear({ t: 'comprarBanca', item: 'flores' })).toBeNull();
    expect(sanear({ t: 'comprarBanca', item: 'flores', saldo: 3 })).not.toBeNull();
  });

  it('local e nuvem: a mesma banca, os mesmos eventos', () => {
    const rodar = (confiar: boolean) => {
      const n = abrir(RANCHO, confiar, ['ana']);
      passar(n, PASSO);
      const evs: Ev[] = [];
      for (const [item, saldo] of [
        ['feno', 3],
        ['feno', 3],
        ['poste', 9],
        ['cerca', 1],
        ['lampiao', 4],
      ] as const) {
        evs.push(...daBanca(comprar(n, item, saldo, confiar)));
        passar(n, 1);
      }
      return {
        evs,
        inv: n.estado.jogadores.get('ana')!.inventario.salvar(),
        livro: n.estado.almas.get('ana')!.livro,
      };
    };
    const local = rodar(true);
    expect(local.evs.map((e) => e.e)).toEqual([
      'almaCompra',
      'almaCompraRecusada',
      'almaCompraRecusada',
      'almaCompraRecusada',
      'almaCompra',
    ]);
    expect(rodar(false)).toEqual(local);
  });
});
