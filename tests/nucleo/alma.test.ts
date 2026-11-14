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
import { ESPERA_MESMO_BICHO } from '../../src/jogo/alma';
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
    (s, e) => ({ moedas: s.moedas + e.ganho.moedas, xp: Math.round((s.xp + e.ganho.xp) * 100) / 100 }),
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
function roca(n: Nucleo, quem: string, celulas: number, confiar: boolean, dz = 0): { x: number; z: number }[] {
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
    n.comando('local', { t: 'depurar', d: { f: 'invocar', tipo: 'coelho', x: X + 2.5, y: Y + 1, z: Z + 0.5 } });
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
    n.comando('local', { t: 'depurar', d: { f: 'soltarItem', item: 'ovo', qtd: 1, x: X + 0.5, y: Y + 1.2, z: Z + 0.5 } });
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
    const outra = abrir(
      RANCHO,
      false,
      ['ana'],
      { versao: 1, edicoes: salvo.edicoes, jogador: null, hora: salvo.hora, extras: { ...salvo.extras, alma: { ...alma, 'id ruim': {} } } },
    );
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
    for (const q of ['ana', 'leo']) n.estado.jogadores.get(q)!.inventario.definir(0, { item: COLHER_PEDREIRO, qtd: 1 });
    const por = (q: string, i: number) => {
      const c = obra[i];
      ir(n, q, c.x + 0.5, c.y + 2, c.z + 0.5);
      mandar(n, q, { t: 'colocar', id: id(), x: c.x, y: c.y, z: c.z, bloco: c.bloco, meta: 0, slot: 0 }, false);
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
      { id: 'c1', feito: obra.length, meta: obra.length, concluiu: true, fantasia: 'capacete-obra' },
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
});

describe('alma no núcleo: os outros mundos', () => {
  it('sem alma por enquanto: nada de evento nem de salvo', () => {
    const n = abrir(ESTILO_PADRAO, true, ['local']);
    expect(n.estado.mundoAlma).toBeNull();
    const pes = roca(n, 'local', 2, true);
    for (const pe of pes) colher(n, 'local', pe, true);
    expect(almas(n).get('local')).toEqual([]);
    expect(n.salvar().extras['alma']).toBeUndefined();
  });
});
