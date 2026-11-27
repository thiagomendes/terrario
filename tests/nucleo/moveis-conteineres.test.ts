import { describe, expect, it } from 'vitest';
import { criarNucleo, type Nucleo } from '../../src/nucleo/nucleo';
import { encontrarNascimento, alturaTerreno } from '../../src/world/chunk';
import { Bloco } from '../../src/world/blocks';
import { sanear, sanearExtras } from '../../src/nucleo/saneamento';
import { celulasDoMovel, metaDoMovel } from '../../src/jogo/moveis';
import { TEMPO_FUNDIR } from '../../src/jogo/receitas';
import {
  TAMANHO_GELADEIRA,
  mudancaAceita,
  noFogao,
  passoFogao,
  novoFogao,
} from '../../src/jogo/fogao';
import { ehConteiner } from '../../src/jogo/permissao';
import { criarSincronizadorItens } from '../../src/cliente/replica';
import { criarInventario } from '../../src/jogo/inventario';
import { registrarCatalogo } from '../../src/jogo/catalogo';
import type { DadosMundo } from '../../src/jogo/mundos';
import type { Comando, EventoNucleo, Quadro } from '../../src/nucleo/protocolo';

/**
 * Spec 039b (T01a): a geladeira e o fogão, os contêineres dos móveis, no servidor local e na
 * nuvem (`confiar: false`, tudo pelo saneamento): o contêiner na âncora (de qualquer parte), o
 * filtro de comida, o fogão sem carvão e o XP de cozinheiro, quem abre, quebrar espalha, o
 * salvamento, o alcance e quem cai e volta.
 */
const SEMENTE = 1337;
const p0 = encontrarNascimento(SEMENTE);
const X = Math.floor(p0.x);
const Z = Math.floor(p0.z);
const YP = alturaTerreno(X, Z, SEMENTE) + 24;
const X0 = X - 2;
const Z0 = Z - 2;
/** A geladeira (duas células, para cima) e o fogão, na sala. */
const GEL = { x: X0 + 2, y: YP, z: Z0 + 2 };
const FOG = { x: X0 + 5, y: YP, z: Z0 + 2 };

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

type Modo = 'local' | 'nuvem';
const NOMES = ['ana', 'bia', 'caio'] as const;
type Quem = (typeof NOMES)[number];

function sala(n: Nucleo): void {
  const ed = n.estado.edicoes;
  for (let x = X0 - 1; x <= X0 + 9; x++)
    for (let z = Z0 - 1; z <= Z0 + 9; z++) {
      ed.definir(x, YP - 1, z, Bloco.TABUAS);
      for (let y = YP; y <= YP + 3; y++) ed.definir(x, y, z, Bloco.AR);
    }
}

const lugar = (i: number) => ({ x: X0 + 0.5 + i * 2, y: YP, z: Z0 - 0.5 });

function ir(n: Nucleo, quem: string, x: number, y: number, z: number): void {
  n.estado.jogadores.get(quem)!.saltoPermitido = true;
  n.comando(quem, tel(x, y, z));
}

function abrir(
  modo: Modo,
  o: { jogo?: 'criativo' | 'sobrevivencia'; quantos?: number; dados?: DadosMundo } = {},
): Nucleo {
  const n = criarNucleo({
    semente: SEMENTE,
    modo: o.jogo ?? 'criativo',
    versaoMundo: 2,
    dados: o.dados,
    confiarNoCliente: modo === 'local',
    depuracao: true,
    dono: 'ana',
  });
  const quantos = modo === 'local' ? 1 : (o.quantos ?? 2);
  for (let i = 0; i < quantos; i++) {
    const q = NOMES[i];
    n.conectar(q, { perfil: { apelido: q[0].toUpperCase() + q.slice(1), aparencia: {} } });
  }
  if (!o.dados) sala(n);
  for (let i = 0; i < quantos; i++) {
    const p = lugar(i);
    ir(n, NOMES[i], p.x, p.y, p.z);
  }
  n.passo();
  n.quadros();
  return n;
}

let ids = 1;
function mandar(n: Nucleo, quem: string, c: Record<string, unknown>): number {
  const id = ++ids;
  const s = sanear({ ...c, id });
  expect(s, JSON.stringify(c)).not.toBeNull();
  n.comando(quem, s!);
  return id;
}

function porMovel(n: Nucleo, quem: Quem, b: number, x: number, y: number, z: number, d = 0) {
  const extras = celulasDoMovel(b, x, y, z, d)
    .slice(1)
    .map(({ x, y, z }) => ({ x, y, z }));
  return mandar(n, quem, {
    t: 'colocar',
    x,
    y,
    z,
    bloco: b,
    meta: d,
    slot: 0,
    ...(extras.length ? { extras } : {}),
  });
}
const usar = (n: Nucleo, quem: Quem, x: number, y: number, z: number) =>
  mandar(n, quem, { t: 'usar', x, y, z });
const quebrar = (n: Nucleo, quem: Quem, x: number, y: number, z: number) =>
  mandar(n, quem, { t: 'quebrar', x, y, z, slot: 0 });
const bloco = (n: Nucleo, x: number, y: number, z: number) => n.estado.mundo.bloco(x, y, z);
const jog = (n: Nucleo, quem: Quem) => n.estado.jogadores.get(quem)!;

function passo(n: Nucleo): Map<string, Quadro> {
  n.passo();
  return n.quadros();
}
const recusasDe = (q: Quadro | undefined) =>
  (q?.eventos ?? []).filter((e): e is Extract<EventoNucleo, { e: 'recusa' }> => e.e === 'recusa');

function contar(n: Nucleo, item: string): number {
  let t = 0;
  for (const i of n.estado.mundoItens.itens) if (i.item === item) t += i.qtd;
  for (const j of n.estado.jogadores.values()) t += j.inventario.contar(item);
  return t;
}

/** Pôr a geladeira e o fogão (a Ana, na sala). */
function cozinha(n: Nucleo): void {
  porMovel(n, 'ana', Bloco.GELADEIRA, GEL.x, GEL.y, GEL.z);
  porMovel(n, 'ana', Bloco.FOGAO, FOG.x, FOG.y, FOG.z);
  expect(recusasDe(passo(n).get('ana'))).toEqual([]);
  expect(bloco(n, GEL.x, YP, GEL.z)).toBe(Bloco.GELADEIRA);
  expect(bloco(n, GEL.x, YP + 1, GEL.z)).toBe(Bloco.GELADEIRA);
  expect(n.estado.edicoes.obterMeta(GEL.x, YP + 1, GEL.z)).toBe(metaDoMovel(0, 1));
  expect(bloco(n, FOG.x, YP, FOG.z)).toBe(Bloco.FOGAO);
}

/** A transação de pôr `qtd` de `item` do lugar 0 da mochila no lugar `i` de `onde`. */
function guardar(n: Nucleo, quem: Quem, onde: 'gel' | 'fog', i: number, item: string, qtd: number) {
  jog(n, quem).inventario.definir(0, { item, qtd });
  return mandar(n, quem, {
    t: 'transacao',
    mudancas: [
      { onde: 'inv', i: 0, antes: { item, qtd }, depois: null },
      { onde, i, antes: null, depois: { item, qtd } },
    ],
  });
}

describe('as regras puras do fogão e da geladeira', () => {
  // as comidas vêm do catálogo (o núcleo e a tela registram ao abrir)
  registrarCatalogo();
  it('o fogão cozinha só a comida da fundição; a geladeira só guarda comida', () => {
    expect(noFogao('carne_crua')).toBe('carne_assada');
    expect(noFogao('peixe_cru')).toBe('peixe_assado');
    expect(noFogao('milho')).toBe('pipoca');
    expect(noFogao('ovo')).toBe('ovo_cozido');
    // os minérios continuam na fornalha
    expect(noFogao('ferro_bruto')).toBeUndefined();
    expect(mudancaAceita('gel', 3, null, { item: 'carne_assada', qtd: 2 })).toBe(true);
    expect(mudancaAceita('gel', 3, null, { item: 'graveto', qtd: 2 })).toBe(false);
    expect(mudancaAceita('fog', 0, null, { item: 'carne_crua', qtd: 2 })).toBe(true);
    expect(mudancaAceita('fog', 0, null, { item: 'ferro_bruto', qtd: 2 })).toBe(false);
    // a saída: tirar pode, pôr não (nem a mesma comida)
    const tres = { item: 'pipoca', qtd: 3 };
    expect(mudancaAceita('fog', 1, tres, { item: 'pipoca', qtd: 1 })).toBe(true);
    expect(mudancaAceita('fog', 1, tres, { item: 'pipoca', qtd: 4 })).toBe(false);
    expect(mudancaAceita('fog', 1, null, { item: 'pipoca', qtd: 1 })).toBe(false);
    expect(mudancaAceita('fog', 1, { item: 'pipoca', qtd: 3 }, null)).toBe(true);
  });

  it('sem carvão: cada comida leva o tempo da fornalha', () => {
    const f = novoFogao();
    f.entrada = { item: 'carne_crua', qtd: 2 };
    let mudou = 0;
    for (let i = 0; i < TEMPO_FUNDIR * 20 * 2 + 2; i++) if (passoFogao(f, 0.05)) mudou++;
    expect(mudou).toBe(2);
    expect(f.entrada).toBeNull();
    expect(f.saida).toEqual({ item: 'carne_assada', qtd: 2 });
    expect(f.progresso).toBe(0);
  });

  it('os blocos novos: a geladeira e o fogão são contêineres; a mesa, a TV e o som não', () => {
    expect(ehConteiner(Bloco.GELADEIRA)).toBe(true);
    expect(ehConteiner(Bloco.FOGAO)).toBe(true);
    for (const b of [Bloco.MESA, Bloco.TV, Bloco.SOM]) expect(ehConteiner(b)).toBe(false);
  });
});

for (const modo of ['local', 'nuvem'] as const)
  describe(`a geladeira e o fogão (${modo})`, () => {
    it('a geladeira abre de qualquer parte na âncora e guarda só comida', () => {
      const n = abrir(modo);
      cozinha(n);
      // o toque na porta de cima abre a mesma geladeira (a da âncora)
      usar(n, 'ana', GEL.x, YP + 1, GEL.z);
      expect(jog(n, 'ana').conteiner).toMatchObject({ tipo: 'geladeira', ...GEL });
      const q = passo(n).get('ana')!;
      expect(q.conteiner).toMatchObject({ tipo: 'geladeira', ...GEL });
      expect(q.conteiner && 'slots' in q.conteiner ? q.conteiner.slots : []).toHaveLength(
        TAMANHO_GELADEIRA,
      );
      guardar(n, 'ana', 'gel', 4, 'carne_assada', 3);
      passo(n);
      expect(n.estado.conteineres.geladeira(GEL.x, GEL.y, GEL.z)[4]).toEqual({
        item: 'carne_assada',
        qtd: 3,
      });
      // o graveto não entra (a transação inteira volta)
      guardar(n, 'ana', 'gel', 5, 'graveto', 2);
      passo(n);
      expect(n.estado.conteineres.geladeira(GEL.x, GEL.y, GEL.z)[5]).toBeNull();
      expect(jog(n, 'ana').inventario.obter(0)).toEqual({ item: 'graveto', qtd: 2 });
    });

    it('o fogão: a entrada só de comida crua, a saída não aceita item posto, cozinha sem carvão', () => {
      const n = abrir(modo);
      cozinha(n);
      usar(n, 'ana', FOG.x, FOG.y, FOG.z);
      expect(jog(n, 'ana').conteiner).toMatchObject({ tipo: 'fogao', ...FOG });
      guardar(n, 'ana', 'fog', 0, 'ferro_bruto', 2);
      passo(n);
      expect(n.estado.conteineres.fogao(FOG.x, FOG.y, FOG.z).entrada).toBeNull();
      // pôr comida já assada na saída: não
      guardar(n, 'ana', 'fog', 1, 'carne_assada', 2);
      passo(n);
      expect(n.estado.conteineres.fogao(FOG.x, FOG.y, FOG.z).saida).toBeNull();
      guardar(n, 'ana', 'fog', 0, 'carne_crua', 2);
      passo(n);
      expect(n.estado.conteineres.fogao(FOG.x, FOG.y, FOG.z).entrada).toEqual({
        item: 'carne_crua',
        qtd: 2,
      });
      // no meio, o quadro leva o progresso a quem está com o fogão aberto
      for (let i = 0; i < TEMPO_FUNDIR * 10; i++) n.passo();
      const visto = passo(n).get('ana')!.conteiner;
      expect(visto?.tipo).toBe('fogao');
      if (visto?.tipo === 'fogao') expect(visto.fogao.progresso).toBeGreaterThan(0.3);
      for (let i = 0; i < TEMPO_FUNDIR * 20 * 2; i++) n.passo();
      expect(n.estado.conteineres.fogao(FOG.x, FOG.y, FOG.z).saida).toEqual({
        item: 'carne_assada',
        qtd: 2,
      });
      // o bloco não troca de id enquanto cozinha
      expect(bloco(n, FOG.x, FOG.y, FOG.z)).toBe(Bloco.FOGAO);
    });

    it('tirar a comida do fogão dá o XP de cozinheiro, como a fornalha', () => {
      const n = abrir(modo);
      cozinha(n);
      usar(n, 'ana', FOG.x, FOG.y, FOG.z);
      guardar(n, 'ana', 'fog', 0, 'carne_crua', 2);
      for (let i = 0; i < TEMPO_FUNDIR * 20 * 2 + 5; i++) n.passo();
      const xp0 = n.estado.almas.get('ana')!.livro.xp;
      mandar(n, 'ana', {
        t: 'transacao',
        mudancas: [
          { onde: 'fog', i: 1, antes: { item: 'carne_assada', qtd: 2 }, depois: null },
          { onde: 'inv', i: 3, antes: null, depois: { item: 'carne_assada', qtd: 2 } },
        ],
      });
      passo(n);
      expect(jog(n, 'ana').inventario.obter(3)).toEqual({ item: 'carne_assada', qtd: 2 });
      // 4 por comida (decisão do dono, 27 nov)
      expect(n.estado.almas.get('ana')!.livro.xp - xp0).toBe(8);
    });

    it('quebrar a geladeira por cima espalha a comida guardada na âncora e fecha o painel', () => {
      const n = abrir(modo);
      cozinha(n);
      usar(n, 'ana', GEL.x, GEL.y, GEL.z);
      guardar(n, 'ana', 'gel', 0, 'carne_assada', 3);
      usar(n, 'ana', FOG.x, FOG.y, FOG.z);
      guardar(n, 'ana', 'fog', 0, 'peixe_cru', 2);
      passo(n);
      usar(n, 'ana', GEL.x, GEL.y, GEL.z);
      if (modo === 'nuvem') usar(n, 'bia', GEL.x, GEL.y + 1, GEL.z);
      passo(n);
      quebrar(n, 'ana', GEL.x, YP + 1, GEL.z);
      passo(n);
      expect(bloco(n, GEL.x, YP, GEL.z)).toBe(Bloco.AR);
      expect(bloco(n, GEL.x, YP + 1, GEL.z)).toBe(Bloco.AR);
      expect(contar(n, 'carne_assada')).toBe(3);
      expect(jog(n, 'ana').conteiner).toBeNull();
      if (modo === 'nuvem') expect(jog(n, 'bia').conteiner).toBeNull();
      // o fogão também
      quebrar(n, 'ana', FOG.x, FOG.y, FOG.z);
      passo(n);
      expect(contar(n, 'peixe_cru')).toBe(2);
      // nada fica guardado sem o móvel
      expect(Object.keys(n.salvar().extras['conteineres'] as object).sort()).toEqual([
        'baus',
        'fornalhas',
      ]);
    });

    it('o mundo sem geladeira nem fogão grava os contêineres igual a antes', () => {
      const n = abrir(modo);
      expect(Object.keys(n.salvar().extras['conteineres'] as object).sort()).toEqual([
        'baus',
        'fornalhas',
      ]);
    });

    it('salvar e abrir: a comida volta; a entrada sem o móvel certo sai; a geladeira volta com 9', () => {
      const n = abrir(modo);
      cozinha(n);
      usar(n, 'ana', GEL.x, GEL.y, GEL.z);
      guardar(n, 'ana', 'gel', 8, 'pipoca', 5);
      usar(n, 'ana', FOG.x, FOG.y, FOG.z);
      guardar(n, 'ana', 'fog', 0, 'milho', 3);
      for (let i = 0; i < TEMPO_FUNDIR * 10; i++) n.passo();
      const s = n.salvar();
      const c = s.extras['conteineres'] as Record<string, Record<string, unknown>>;
      const kG = `${GEL.x},${GEL.y},${GEL.z}`;
      const kF = `${FOG.x},${FOG.y},${FOG.z}`;
      // a geladeira guardada com 4 lugares (um salvamento mexido) e entradas sem móvel
      const extras = sanearExtras({
        ...s.extras,
        conteineres: {
          ...c,
          geladeiras: {
            [kG]: (c.geladeiras[kG] as unknown[]).slice(5),
            [`${GEL.x},${GEL.y + 1},${GEL.z}`]: [{ item: 'pipoca', qtd: 64 }],
            [`${X0 + 7},${YP},${Z0 + 7}`]: [{ item: 'pipoca', qtd: 64 }],
          },
          fogoes: { ...c.fogoes, [kG]: { entrada: { item: 'milho', qtd: 64 } } },
        },
      });
      const m = abrir(modo, {
        dados: { versao: 1, edicoes: s.edicoes, jogador: null, hora: s.hora, extras },
      });
      const g = m.estado.conteineres.geladeira(GEL.x, GEL.y, GEL.z);
      expect(g).toHaveLength(TAMANHO_GELADEIRA);
      expect(g[3]).toEqual({ item: 'pipoca', qtd: 5 });
      const f = m.estado.conteineres.fogao(FOG.x, FOG.y, FOG.z);
      expect(f.entrada?.item).toBe('milho');
      expect(f.progresso).toBeGreaterThan(0);
      const salvo = m.salvar().extras['conteineres'] as Record<string, Record<string, unknown>>;
      expect(Object.keys(salvo.geladeiras)).toEqual([kG]);
      expect(Object.keys(salvo.fogoes)).toEqual([kF]);
      // nada de pipoca a mais: as entradas sem móvel não deram comida
      expect(contar(m, 'pipoca')).toBe(0);
    });

    it('quem cai e volta volta com o contêiner fechado', () => {
      const n = abrir(modo);
      cozinha(n);
      usar(n, 'ana', GEL.x, GEL.y, GEL.z);
      expect(passo(n).get('ana')!.conteiner?.tipo).toBe('geladeira');
      n.reiniciarQuadros('ana');
      expect(jog(n, 'ana').conteiner).toBeNull();
      expect(passo(n).get('ana')!.conteiner).toBeNull();
    });
  });

describe('a geladeira e o fogão dos outros (nuvem)', () => {
  it('o visitante não abre; outra criança não abre a da Bia; a dona do mundo abre', () => {
    const n = abrir('nuvem', { quantos: 3 });
    // a Bia põe (a dona do mundo é a Ana)
    porMovel(n, 'bia', Bloco.GELADEIRA, GEL.x, GEL.y, GEL.z);
    porMovel(n, 'bia', Bloco.FOGAO, FOG.x, FOG.y, FOG.z);
    expect(recusasDe(passo(n).get('bia'))).toEqual([]);
    // o Caio só passeia
    n.definirConstrucao('caio', false);
    const v = usar(n, 'caio', GEL.x, GEL.y + 1, GEL.z);
    let q = passo(n).get('caio');
    expect(recusasDe(q).find((r) => r.comando === v)?.motivo).toBe('visitante');
    expect(jog(n, 'caio').conteiner).toBeNull();
    // o Caio constrói, mas a geladeira e o fogão são da Bia
    n.definirConstrucao('caio', true);
    const g = usar(n, 'caio', GEL.x, GEL.y + 1, GEL.z);
    const f = usar(n, 'caio', FOG.x, FOG.y, FOG.z);
    q = passo(n).get('caio');
    const rs = recusasDe(q);
    expect(rs.find((r) => r.comando === g)?.protecao).toEqual({ motivo: 'geladeira', dono: 'Bia' });
    expect(rs.find((r) => r.comando === f)?.protecao).toEqual({ motivo: 'fogao', dono: 'Bia' });
    expect(jog(n, 'caio').conteiner).toBeNull();
    // nem fingindo a geladeira aberta
    jog(n, 'caio').conteiner = { tipo: 'geladeira', abertura: 1, ...GEL };
    guardar(n, 'caio', 'gel', 0, 'pipoca', 2);
    passo(n);
    expect(n.estado.conteineres.geladeira(GEL.x, GEL.y, GEL.z)[0]).toBeNull();
    expect(jog(n, 'caio').inventario.obter(0)).toEqual({ item: 'pipoca', qtd: 2 });
    // a Ana, dona do mundo, abre; e a Bia vê o que ela guardou
    usar(n, 'bia', GEL.x, GEL.y, GEL.z);
    usar(n, 'ana', GEL.x, GEL.y, GEL.z);
    passo(n);
    expect(jog(n, 'ana').conteiner?.tipo).toBe('geladeira');
    guardar(n, 'ana', 'gel', 2, 'pipoca', 4);
    const vistoBia = passo(n).get('bia')!.conteiner;
    expect(vistoBia?.tipo === 'geladeira' ? vistoBia.slots[2] : null).toEqual({
      item: 'pipoca',
      qtd: 4,
    });
  });

  it('o painel fecha quando a criança sai de perto (conferido uma vez por segundo)', () => {
    const n = abrir('nuvem');
    cozinha(n);
    usar(n, 'ana', GEL.x, GEL.y, GEL.z);
    passo(n);
    expect(jog(n, 'ana').conteiner?.tipo).toBe('geladeira');
    // longe da geladeira (o chão da sala continua embaixo)
    ir(n, 'ana', GEL.x + 0.5, YP + 40, GEL.z + 0.5);
    for (let i = 0; i < 21; i++) n.passo();
    expect(jog(n, 'ana').conteiner).toBeNull();
    expect(passo(n).get('ana')!.conteiner).toBeNull();
  });
});

describe('a cópia do cliente', () => {
  it('a geladeira e o fogão abertos viram lugares de transação, como o baú', () => {
    const enviados: Comando[] = [];
    let id = 100;
    const inv = criarInventario();
    const s = criarSincronizadorItens(
      inv,
      (c) => enviados.push(c),
      () => ++id,
    );
    const slots = Array.from({ length: TAMANHO_GELADEIRA }, () => null);
    const c = s.conteiner({ tipo: 'geladeira', abertura: 7, ...GEL, slots }, 0);
    expect(c?.tipo).toBe('geladeira');
    c!.slots![1] = { item: 'pipoca', qtd: 1 };
    s.verificar();
    const t = enviados.find((e) => e.t === 'transacao');
    expect(t && t.t === 'transacao' ? t.mudancas : []).toEqual([
      { onde: 'gel', i: 1, antes: null, depois: { item: 'pipoca', qtd: 1 } },
    ]);
    const f = s.conteiner(
      { tipo: 'fogao', abertura: 8, ...FOG, fogao: { entrada: null, saida: null, progresso: 0.5 } },
      0,
    );
    expect(f?.tipo).toBe('fogao');
    expect(f?.fogao?.progresso).toBe(0.5);
    f!.fogao!.entrada = { item: 'milho', qtd: 2 };
    s.verificar();
    const t2 = enviados.filter((e) => e.t === 'transacao').at(-1);
    expect(t2 && t2.t === 'transacao' ? t2.mudancas : []).toEqual([
      { onde: 'fog', i: 0, antes: null, depois: { item: 'milho', qtd: 2 } },
    ]);
  });
});
