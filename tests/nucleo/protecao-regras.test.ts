import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { criarNucleo, type Nucleo } from '../../src/nucleo/nucleo';
import { criarEstadoCliente } from '../../src/cliente/estado';
import type { Conexao } from '../../src/cliente/conexao';
import { criarInventario } from '../../src/jogo/inventario';
import { estadoInicial } from '../../src/jogo/sobrevivencia';
import {
  definirEstiloMundo,
  encontrarNascimento,
  ESTILO_PADRAO,
  TERRENO_NATURAL,
} from '../../src/world/chunk';
import {
  frenteDaPorta,
  limparPovoados,
  noLote,
  planoDaRegiao,
  REGIAO_POVOADO,
  type Lote,
  type PlanoPovoado,
} from '../../src/world/povoado';
import { Bloco } from '../../src/world/blocks';
import { criarEdicoes, donoNaCelula, empacotar } from '../../src/world/edicoes';
import { Protecao, criarProtecaoMundo } from '../../src/world/protecao';
import { recusaQuebrar, type MundoDaRegra, type RecusaProtecao } from '../../src/jogo/permissao';
import { sanear } from '../../src/nucleo/saneamento';
import { idDoBloco } from '../../src/jogo/itens';
import {
  ESPERA_VOLTA_CASA,
  type Comando,
  type EventoNucleo,
  type Mensagem,
} from '../../src/nucleo/protocolo';
import '../../src/temas/todos';
import { obterTema } from '../../src/temas';

/**
 * Spec 016, T03: as regras de quem mexe em quê, no núcleo, nos dois modos (servidor local,
 * que confia no cliente, e nuvem, que não confia e passa tudo pelo saneamento). Num povoado
 * de verdade da semente: a casa da vila e o chão não quebram para ninguém (nem para o dono,
 * nem no criativo), a passagem fica livre, enfeitar em volta pode, o bloco de cada um é dele
 * (e o dono do mundo desfaz o do amigo), o baú de alguém só abre para ele e para o dono, e a
 * lavoura do sítio se replanta. Toda recusa diz o porquê e devolve o bloco a quem previu.
 */
const SEMENTE = 1337;

type Celula = { x: number; y: number; z: number };

/** Povoado perto do nascimento (a geração de verdade). */
function povoadoPerto(semente: number): PlanoPovoado {
  const n0 = encontrarNascimento(semente);
  const rx0 = Math.floor(n0.x / REGIAO_POVOADO);
  const rz0 = Math.floor(n0.z / REGIAO_POVOADO);
  for (let r = 0; r <= 3; r++)
    for (let dx = -r; dx <= r; dx++)
      for (let dz = -r; dz <= r; dz++) {
        if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
        const p = planoDaRegiao(rx0 + dx, rz0 + dz, semente, TERRENO_NATURAL);
        if (p) return p;
      }
  throw new Error('sem povoado perto');
}

let ids = 100;
const id = () => ++ids;

function tel(c: { x: number; y: number; z: number }): Comando {
  return {
    t: 'jogador',
    x: c.x,
    y: c.y,
    z: c.z,
    yaw: 0,
    pitch: 0,
    olhos: c.y + 1.62,
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

/** Manda como o servidor manda: pelo saneamento. */
function mandar(n: Nucleo, quem: string, c: unknown): void {
  const s = sanear(c);
  expect(s, JSON.stringify(c)).not.toBeNull();
  n.comando(quem, s!);
}

type Modo = 'local' | 'nuvem';
/** Quem joga em cada modo: no aparelho, a criança sozinha; na nuvem, a Ana (dona), a Bia e o Léo. */
const DONA: Record<Modo, string> = { local: 'local', nuvem: 'ana' };

function abrir(modo: Modo, jogo: 'criativo' | 'sobrevivencia', perto: Celula): Nucleo {
  const n = criarNucleo({
    semente: SEMENTE,
    modo: jogo,
    versaoMundo: 2,
    confiarNoCliente: modo === 'local',
    depuracao: true,
    dono: DONA[modo],
  });
  if (modo === 'local') n.conectar('local');
  else
    for (const [i, a] of ['Ana', 'Bia', 'Léo'].entries())
      n.conectar(['ana', 'bia', 'leo'][i], { perfil: { apelido: a, aparencia: {} } });
  for (const j of n.estado.jogadores.keys()) ir(n, j, perto);
  n.passo();
  n.quadros();
  return n;
}

/** Leva o jogador para perto (a 2,5 blocos: não atrapalha colocar). */
function ir(n: Nucleo, quem: string, c: Celula): void {
  n.estado.jogadores.get(quem)!.saltoPermitido = true;
  n.comando(quem, tel({ x: c.x + 3.5, y: c.y, z: c.z + 0.5 }));
}

const bloco = (n: Nucleo, c: Celula) => n.estado.mundo.bloco(c.x, c.y, c.z);

function quebrar(n: Nucleo, quem: string, c: Celula): number {
  const i = id();
  ir(n, quem, c);
  mandar(n, quem, { t: 'quebrar', id: i, ...c, slot: 0 });
  return i;
}
/**
 * Spec 037: o bloco novo precisa encostar num sólido. Estas regras são testadas no céu (longe
 * de tudo o que a geração põe), então o teste põe embaixo uma pedra solta, como a de um mundo
 * salvo com bloco no ar.
 */
function apoiar(n: Nucleo, c: Celula): void {
  if (n.estado.mundo.bloco(c.x, c.y - 1, c.z) === Bloco.AR)
    n.estado.edicoes.definir(c.x, c.y - 1, c.z, Bloco.PEDRA_LISA);
}
function colocar(n: Nucleo, quem: string, c: Celula, b: number = Bloco.TABUAS, slot = 0): number {
  const i = id();
  ir(n, quem, c);
  apoiar(n, c);
  mandar(n, quem, { t: 'colocar', id: i, ...c, bloco: b, meta: 0, slot });
  return i;
}

/** A recusa que o núcleo mandou para quem tentou (e as células que voltaram na tela dele). */
function recusaDe(n: Nucleo, quem: string, comando: number) {
  n.passo();
  const q = n.quadros().get(quem)!;
  const e = q.eventos?.find(
    (x): x is Extract<EventoNucleo, { e: 'recusa' }> => x.e === 'recusa' && x.comando === comando,
  );
  return { recusa: e, blocos: q.blocos ?? [] };
}

/** Células do povoado, achadas na geração e na proteção (a mesma do núcleo e do cliente). */
interface Lugares {
  plano: PlanoPovoado;
  casa: Lote;
  parede: Celula;
  chao: Celula;
  /** A cama da casa (usável: todo mundo deita, ninguém quebra). */
  cama: Celula;
  passagem: Celula;
  /** Célula livre (de ar, com chão firme) encostada na parede: enfeitar pode. */
  enfeite: Celula;
}

function acharLugares(n: Nucleo): Lugares {
  const plano = povoadoPerto(SEMENTE);
  const prot = n.protecao;
  const g = (x: number, y: number, z: number) => n.estado.mundo.gerado(x, y, z);
  for (const casa of plano.lotes) {
    if (casa.tipo === 'campo') continue;
    const [fx, fz] = frenteDaPorta(casa);
    const passagem = { x: fx, y: casa.h + 1, z: fz };
    const chao = { x: casa.x0 + 3, y: casa.h - 1, z: casa.z0 + 3 };
    let parede: Celula | null = null;
    let enfeite: Celula | null = null;
    let cama: Celula | null = null;
    for (let s = 0; s <= 6; s++)
      for (let f = -2; f <= 7; f++) {
        const [x, z] = noLote(casa, s, f);
        const y = casa.h + 2;
        if (!parede && prot.em(x, y, z) === Protecao.ESTRUTURA && g(x, y, z) !== Bloco.AR)
          parede = { x, y, z };
        if (!cama && g(x, casa.h + 1, z) === Bloco.CAMA) cama = { x, y: casa.h + 1, z };
        const e = { x, y: casa.h + 1, z };
        if (
          !enfeite &&
          prot.em(e.x, e.y, e.z) === Protecao.LIVRE &&
          g(e.x, e.y, e.z) === Bloco.AR &&
          g(e.x, e.y - 1, e.z) !== Bloco.AR &&
          [
            [1, 0],
            [-1, 0],
            [0, 1],
            [0, -1],
          ].some(([dx, dz]) => prot.em(e.x + dx, e.y, e.z + dz) === Protecao.ESTRUTURA)
        )
          enfeite = e;
      }
    if (
      parede &&
      enfeite &&
      cama &&
      prot.em(chao.x, chao.y, chao.z) === Protecao.CHAO &&
      prot.em(passagem.x, passagem.y, passagem.z) === Protecao.PASSAGEM
    )
      return { plano, casa, parede, chao, cama, passagem, enfeite };
  }
  throw new Error('sem casa com parede, cama, chão e enfeite');
}

beforeAll(() => {
  definirEstiloMundo(ESTILO_PADRAO);
  limparPovoados();
});
afterAll(() => {
  definirEstiloMundo(ESTILO_PADRAO);
  limparPovoados();
});

describe.each<Modo>(['local', 'nuvem'])('regra 1: o que o mundo construiu (%s)', (modo) => {
  const dona = DONA[modo];
  const todos = modo === 'local' ? ['local'] : ['ana', 'bia', 'leo'];

  it.each(['criativo', 'sobrevivencia'] as const)(
    'ninguém quebra a parede, a porta nem o chão da casa da vila, nem a dona (%s)',
    (jogo) => {
      const n0 = abrir(modo, jogo, { x: 0, y: 70, z: 0 });
      const L = acharLugares(n0);
      const n = abrir(modo, jogo, L.parede);
      for (const quem of todos)
        for (const c of [L.parede, L.cama, L.chao]) {
          const antes = bloco(n, c);
          const i = quebrar(n, quem, c);
          expect(bloco(n, c), `${quem} ${JSON.stringify(c)}`).toBe(antes);
          const { recusa, blocos } = recusaDe(n, quem, i);
          expect(recusa?.protecao).toEqual({ motivo: 'mundo', lugar: 'vila' });
          // a tela de quem previu volta ao que era (com a célula de cima e a de baixo)
          expect(blocos).toContainEqual({ ...c, v: empacotar(antes) });
        }
      // e nada caiu no chão
      expect(n.estado.mundoItens.itens.length).toBe(0);
      expect(dona).toBeTruthy();
    },
  );

  it('spec 037: com um morador na passagem, a recusa é a da passagem (o cadeado vem antes do corpo)', () => {
    const n0 = abrir(modo, 'criativo', { x: 0, y: 70, z: 0 });
    const L = acharLugares(n0);
    const n = abrir(modo, 'criativo', L.passagem);
    const quem = todos[todos.length - 1];
    n.estado.populacao.adicionar('morador', L.passagem.x + 0.5, L.passagem.y, L.passagem.z + 0.5);
    const i = colocar(n, quem, L.passagem);
    expect(bloco(n, L.passagem)).toBe(Bloco.AR);
    expect(recusaDe(n, quem, i).recusa).toMatchObject({
      motivo: 'colocar',
      protecao: { motivo: 'passagem', lugar: 'vila' },
    });
    // fora da proteção, o mesmo morador segura o bloco pelo corpo (a recusa sem cadeado)
    const livre = L.enfeite;
    expect(n.protecao.em(livre.x, livre.y, livre.z)).not.toBe(Protecao.PASSAGEM);
    n.estado.populacao.adicionar('morador', livre.x + 0.5, livre.y, livre.z + 0.5);
    const k = colocar(n, quem, livre);
    expect(bloco(n, livre)).toBe(Bloco.AR);
    const r = recusaDe(n, quem, k).recusa;
    expect(r).toMatchObject({ motivo: 'colocar' });
    expect(r?.protecao).toBeUndefined();
  });

  it('a passagem fica livre (recusa com o motivo); enfeitar encostado na casa pode', () => {
    const n0 = abrir(modo, 'criativo', { x: 0, y: 70, z: 0 });
    const L = acharLugares(n0);
    const n = abrir(modo, 'criativo', L.passagem);
    for (const quem of todos) {
      const i = colocar(n, quem, L.passagem);
      expect(bloco(n, L.passagem)).toBe(Bloco.AR);
      const { recusa, blocos } = recusaDe(n, quem, i);
      expect(recusa).toMatchObject({
        motivo: 'colocar',
        protecao: { motivo: 'passagem', lugar: 'vila' },
      });
      expect(blocos).toContainEqual({ ...L.passagem, v: Bloco.AR });
    }
    // a flor (ou a mesa) encostada na parede: pode, e é de quem pôs
    colocar(n, todos[todos.length - 1], L.enfeite, Bloco.FLOR);
    expect(bloco(n, L.enfeite)).toBe(Bloco.FLOR);
    expect(n.donoDoBloco(L.enfeite.x, L.enfeite.y, L.enfeite.z)).toBe(todos[todos.length - 1]);
    // e quem pôs tira
    quebrar(n, todos[todos.length - 1], L.enfeite);
    expect(bloco(n, L.enfeite)).toBe(Bloco.AR);
  });

  it('buraco na parede: só o bloco que a geração pôs volta (conserto)', () => {
    const n0 = abrir(modo, 'criativo', { x: 0, y: 70, z: 0 });
    const L = acharLugares(n0);
    const n = abrir(modo, 'criativo', L.parede);
    const gerado = bloco(n, L.parede);
    // um mundo antigo com o buraco (antes da 016)
    n.estado.edicoes.definir(L.parede.x, L.parede.y, L.parede.z, Bloco.AR);
    const outro = gerado === Bloco.PEDREGULHO ? Bloco.TIJOLOS : Bloco.PEDREGULHO;
    const i = colocar(n, todos[todos.length - 1], L.parede, outro);
    expect(bloco(n, L.parede)).toBe(Bloco.AR);
    expect(recusaDe(n, todos[todos.length - 1], i).recusa?.protecao).toEqual({
      motivo: 'mundo',
      lugar: 'vila',
    });
    colocar(n, todos[todos.length - 1], L.parede, gerado);
    expect(bloco(n, L.parede)).toBe(gerado);
    // consertada, volta a ser do mundo: ninguém quebra
    quebrar(n, dona, L.parede);
    expect(bloco(n, L.parede)).toBe(gerado);
  });

  it('arar o chão protegido é recusado; o lote do criativo pula a casa e faz o resto', () => {
    const n0 = abrir(modo, 'criativo', { x: 0, y: 70, z: 0 });
    const L = acharLugares(n0);
    const n = abrir(modo, 'criativo', L.parede);
    const quem = todos[todos.length - 1];
    // arar: o chão da praça e dos lotes não vira terra arada
    const piso = { x: L.passagem.x, y: L.passagem.y - 1, z: L.passagem.z };
    const antes = bloco(n, piso);
    n.estado.jogadores.get(quem)!.inventario.definir(0, { item: 'enxada_madeira', qtd: 1 });
    ir(n, quem, piso);
    mandar(n, quem, { t: 'arar', id: id(), ...piso, slot: 0 });
    expect(bloco(n, piso)).toBe(antes);
    // lote: a parede fica, o bloco no ar ao lado entra
    const solto = { x: L.parede.x, y: L.parede.y + 12, z: L.parede.z };
    const i = id();
    ir(n, quem, L.parede);
    mandar(n, quem, {
      t: 'editar',
      id: i,
      lote: [
        { ...L.parede, v: Bloco.AR },
        { ...solto, v: Bloco.PEDREGULHO },
      ],
    });
    expect(bloco(n, L.parede)).not.toBe(Bloco.AR);
    expect(bloco(n, solto)).toBe(Bloco.PEDREGULHO);
    const { recusa, blocos } = recusaDe(n, quem, i);
    expect(recusa?.protecao).toEqual({ motivo: 'mundo', lugar: 'vila' });
    expect(blocos.some((b) => b.x === L.parede.x && b.y === L.parede.y && b.z === L.parede.z)).toBe(
      true,
    );
  });

  it('terreno natural longe do povoado quebra para todos', () => {
    const n0 = abrir(modo, 'criativo', { x: 0, y: 70, z: 0 });
    const L = acharLugares(n0);
    // bem fora do povoado (a margem do chão acaba em 2 colunas)
    const x = L.plano.maxX + 30;
    const z = L.plano.maxZ + 30;
    const n = abrir(modo, 'criativo', { x, y: 60, z });
    for (const quem of todos) {
      let y = 120;
      while (y > 1 && n.estado.mundo.bloco(x, y, z) === Bloco.AR) y--;
      expect(n.protecao.em(x, y, z)).toBe(Protecao.LIVRE);
      quebrar(n, quem, { x, y, z });
      expect(n.estado.mundo.bloco(x, y, z)).toBe(Bloco.AR);
    }
  });
});

describe('regra 2: o que cada um colocou (nuvem)', () => {
  /** Um bloco no ar, longe do povoado: só a regra do dono conta. */
  const A = { x: 400, y: 95, z: 400 };
  const B = { x: 400, y: 95, z: 406 };
  function sala(): Nucleo {
    return abrir('nuvem', 'criativo', A);
  }

  it('o amigo não quebra a parede do outro; quem pôs e a dona quebram', () => {
    const n = sala();
    colocar(n, 'bia', A);
    expect(n.donoDoBloco(A.x, A.y, A.z)).toBe('bia');
    const i = quebrar(n, 'leo', A);
    expect(bloco(n, A)).toBe(Bloco.TABUAS);
    const { recusa, blocos } = recusaDe(n, 'leo', i);
    expect(recusa?.protecao).toEqual({ motivo: 'amigo', dono: 'Bia' });
    // volta na tela do Léo com o dono certo (nada pisca)
    expect(blocos).toContainEqual({ ...A, v: empacotar(Bloco.TABUAS, 0, 1) });
    quebrar(n, 'bia', A);
    expect(bloco(n, A)).toBe(Bloco.AR);
    colocar(n, 'bia', A);
    quebrar(n, 'ana', A);
    expect(bloco(n, A)).toBe(Bloco.AR);
  });

  it('o que a dona pôs: o amigo não quebra ("é da Ana")', () => {
    const n = sala();
    colocar(n, 'ana', B);
    const i = quebrar(n, 'bia', B);
    expect(bloco(n, B)).toBe(Bloco.TABUAS);
    expect(recusaDe(n, 'bia', i).recusa?.protecao).toEqual({ motivo: 'amigo', dono: 'Ana' });
  });

  it('o bloco do amigo continua dele depois que ele sai', () => {
    const n = sala();
    colocar(n, 'bia', A);
    n.desconectar('bia');
    const i = quebrar(n, 'leo', A);
    expect(bloco(n, A)).toBe(Bloco.TABUAS);
    expect(recusaDe(n, 'leo', i).recusa?.protecao).toEqual({ motivo: 'amigo', dono: 'Bia' });
  });

  it('a flor do amigo não some debaixo do bloco de outro', () => {
    const n = sala();
    n.estado.edicoes.definir(A.x, A.y - 1, A.z, Bloco.TERRA);
    colocar(n, 'bia', A, Bloco.FLOR);
    expect(bloco(n, A)).toBe(Bloco.FLOR);
    const i = colocar(n, 'leo', A, Bloco.PEDREGULHO);
    expect(bloco(n, A)).toBe(Bloco.FLOR);
    expect(recusaDe(n, 'leo', i).recusa?.protecao).toEqual({ motivo: 'amigo', dono: 'Bia' });
  });

  it('o lote do criativo do amigo não apaga a construção do outro', () => {
    const n = sala();
    colocar(n, 'bia', A);
    ir(n, 'leo', A);
    mandar(n, 'leo', { t: 'editar', id: id(), lote: [{ ...A, v: Bloco.AR }] });
    expect(bloco(n, A)).toBe(Bloco.TABUAS);
    ir(n, 'ana', A);
    mandar(n, 'ana', { t: 'editar', id: id(), lote: [{ ...A, v: Bloco.AR }] });
    expect(bloco(n, A)).toBe(Bloco.AR);
  });

  it('a horta é de quem arou: o amigo não colhe nem ara por cima', () => {
    const n = abrir('nuvem', 'sobrevivencia', A);
    n.estado.edicoes.definir(
      A.x,
      A.y - 1,
      A.z,
      Bloco.TERRA_MUSGOSA,
      0,
      n.estado.edicoes.donos.indice('bia', 'Bia'),
    );
    for (const q of ['bia', 'leo'])
      n.estado.jogadores.get(q)!.inventario.definir(0, { item: 'enxada_madeira', qtd: 1, dur: 60 });
    n.estado.jogadores.get('bia')!.inventario.definir(1, { item: 'semente_trigo', qtd: 3 });
    ir(n, 'bia', A);
    mandar(n, 'bia', { t: 'arar', id: id(), x: A.x, y: A.y - 1, z: A.z, slot: 0 });
    colocar(n, 'bia', A, Bloco.TRIGO_0, 1);
    expect(bloco(n, A)).toBe(Bloco.TRIGO_0);
    const i = quebrar(n, 'leo', A);
    expect(bloco(n, A)).toBe(Bloco.TRIGO_0);
    expect(recusaDe(n, 'leo', i).recusa?.protecao).toEqual({ motivo: 'amigo', dono: 'Bia' });
    ir(n, 'leo', A);
    mandar(n, 'leo', { t: 'arar', id: id(), x: A.x, y: A.y - 1, z: A.z, slot: 0 });
    expect(bloco(n, { ...A, y: A.y - 1 })).toBe(Bloco.TERRA_ARADA);
    expect(bloco(n, A)).toBe(Bloco.TRIGO_0);
  });

  it('jogando sozinho a criança é dona de tudo o que põe', () => {
    const n = abrir('local', 'criativo', A);
    colocar(n, 'local', A);
    quebrar(n, 'local', A);
    expect(bloco(n, A)).toBe(Bloco.AR);
  });
});

describe('regra 4: baús (nuvem)', () => {
  const C = { x: 400, y: 95, z: 410 };

  it('o baú da Bia abre só para ela e para a dona; o Léo não abre nem mexe por transação', () => {
    const n = abrir('nuvem', 'sobrevivencia', C);
    const inv = (q: string) => n.estado.jogadores.get(q)!.inventario;
    inv('bia').definir(0, { item: idDoBloco(Bloco.BAU), qtd: 1 });
    inv('bia').definir(1, { item: 'trigo', qtd: 5 });
    colocar(n, 'bia', C, Bloco.BAU);
    expect(bloco(n, C)).toBe(Bloco.BAU);
    // a Bia guarda o trigo
    mandar(n, 'bia', { t: 'usar', id: id(), ...C });
    expect(n.estado.jogadores.get('bia')!.conteiner?.tipo).toBe('bau');
    mandar(n, 'bia', {
      t: 'transacao',
      id: id(),
      mudancas: [
        { onde: 'inv', i: 1, antes: { item: 'trigo', qtd: 5 }, depois: null },
        { onde: 'bau', i: 0, antes: null, depois: { item: 'trigo', qtd: 5 } },
      ],
    });
    expect(n.estado.conteineres.bau(C.x, C.y, C.z, false)[0]).toEqual({ item: 'trigo', qtd: 5 });
    // o Léo tenta abrir: não abre, e o aviso diz de quem é
    ir(n, 'leo', C);
    const i = id();
    mandar(n, 'leo', { t: 'usar', id: i, ...C });
    expect(n.estado.jogadores.get('leo')!.conteiner).toBeNull();
    expect(recusaDe(n, 'leo', i).recusa?.protecao).toEqual({ motivo: 'bau', dono: 'Bia' });
    // e a transação mandada direto não leva nada
    mandar(n, 'leo', {
      t: 'transacao',
      id: id(),
      mudancas: [
        { onde: 'bau', i: 0, antes: { item: 'trigo', qtd: 5 }, depois: null },
        { onde: 'inv', i: 3, antes: null, depois: { item: 'trigo', qtd: 5 } },
      ],
    });
    expect(n.estado.conteineres.bau(C.x, C.y, C.z, false)[0]).toEqual({ item: 'trigo', qtd: 5 });
    expect(inv('leo').contar('trigo')).toBe(0);
    // nem quebra para espalhar
    const q = quebrar(n, 'leo', C);
    expect(bloco(n, C)).toBe(Bloco.BAU);
    expect(recusaDe(n, 'leo', q).recusa?.protecao).toEqual({ motivo: 'bau', dono: 'Bia' });
    // a dona abre
    ir(n, 'ana', C);
    mandar(n, 'ana', { t: 'usar', id: id(), ...C });
    expect(n.estado.jogadores.get('ana')!.conteiner?.tipo).toBe('bau');
  });

  it('o baú que estava aberto quando o dono saiu de perto não vira de outro', () => {
    const n = abrir('nuvem', 'criativo', C);
    colocar(n, 'bia', C, Bloco.BAU);
    // um Léo que finge ter o baú aberto (o núcleo nunca abriu para ele)
    const leo = n.estado.jogadores.get('leo')!;
    leo.conteiner = { tipo: 'bau', abertura: 1, ...C };
    n.estado.conteineres.bau(C.x, C.y, C.z, false)[0] = { item: 'trigo', qtd: 2 };
    n.comando('leo', {
      t: 'transacao',
      id: id(),
      mudancas: [
        { onde: 'bau', i: 0, antes: { item: 'trigo', qtd: 2 }, depois: null },
        { onde: 'inv', i: 3, antes: null, depois: { item: 'trigo', qtd: 2 } },
      ],
    });
    expect(n.estado.conteineres.bau(C.x, C.y, C.z, false)[0]).toEqual({ item: 'trigo', qtd: 2 });
  });
});

/** A fornalha que a vila gerou (usável: de todos). */
function fornalhaDaVila(n: Nucleo): Celula {
  const plano = povoadoPerto(SEMENTE);
  for (const casa of plano.lotes)
    for (let s = -1; s <= 8; s++)
      for (let f = -2; f <= 8; f++)
        for (let y = casa.h; y <= casa.h + 3; y++) {
          const [x, z] = noLote(casa, s, f);
          if (n.estado.mundo.gerado(x, y, z) === Bloco.FORNALHA) return { x, y, z };
        }
  throw new Error('sem fornalha na vila');
}

describe.each<Modo>(['local', 'nuvem'])('regra 4: fornalhas (%s)', (modo) => {
  // decisão do dono (11 nov 2026): a fornalha posta segue o baú; a da vila é de todos
  const C = { x: 400, y: 95, z: 410 };
  /** Na nuvem a Bia põe; no aparelho, a criança (dona) põe e um amigo de teste tenta. */
  const POE: Record<Modo, string> = { local: 'local', nuvem: 'bia' };

  function montar(): Nucleo {
    const n = abrir(modo, 'sobrevivencia', C);
    if (modo === 'local') {
      n.conectar('leo', { perfil: { apelido: 'Léo', aparencia: {} } });
      n.definirPerfil('local', { apelido: 'Ana', aparencia: {} });
    }
    return n;
  }
  const forn = (n: Nucleo) => n.estado.conteineres.fornalha(C.x, C.y, C.z);

  it('a fornalha posta abre só para quem pôs e para a dona; nem a transação nem a quebra passam', () => {
    const n = montar();
    const quem = POE[modo];
    const inv = (q: string) => n.estado.jogadores.get(q)!.inventario;
    inv(quem).definir(0, { item: idDoBloco(Bloco.FORNALHA), qtd: 1 });
    inv(quem).definir(1, { item: 'trigo', qtd: 4 });
    colocar(n, quem, C, Bloco.FORNALHA);
    expect(bloco(n, C)).toBe(Bloco.FORNALHA);
    mandar(n, quem, { t: 'usar', id: id(), ...C });
    expect(n.estado.jogadores.get(quem)!.conteiner?.tipo).toBe('fornalha');
    mandar(n, quem, {
      t: 'transacao',
      id: id(),
      mudancas: [
        { onde: 'inv', i: 1, antes: { item: 'trigo', qtd: 4 }, depois: null },
        { onde: 'forn', i: 2, antes: null, depois: { item: 'trigo', qtd: 4 } },
      ],
    });
    expect(forn(n).saida).toEqual({ item: 'trigo', qtd: 4 });
    // o Léo não abre, e o aviso diz de quem é
    const dono = modo === 'nuvem' ? 'Bia' : 'Ana';
    ir(n, 'leo', C);
    const i = id();
    mandar(n, 'leo', { t: 'usar', id: i, ...C });
    expect(n.estado.jogadores.get('leo')!.conteiner).toBeNull();
    expect(recusaDe(n, 'leo', i).recusa?.protecao).toEqual({ motivo: 'fornalha', dono });
    // tirar a saída por transação mandada direto não leva nada (nem fingindo a fornalha aberta)
    n.estado.jogadores.get('leo')!.conteiner = { tipo: 'fornalha', abertura: 1, ...C };
    mandar(n, 'leo', {
      t: 'transacao',
      id: id(),
      mudancas: [
        { onde: 'forn', i: 2, antes: { item: 'trigo', qtd: 4 }, depois: null },
        { onde: 'inv', i: 3, antes: null, depois: { item: 'trigo', qtd: 4 } },
      ],
    });
    expect(forn(n).saida).toEqual({ item: 'trigo', qtd: 4 });
    expect(inv('leo').contar('trigo')).toBe(0);
    // nem quebra para espalhar
    const q = quebrar(n, 'leo', C);
    expect(bloco(n, C)).toBe(Bloco.FORNALHA);
    expect(recusaDe(n, 'leo', q).recusa?.protecao).toEqual({ motivo: 'fornalha', dono });
    // a dona abre (na nuvem, a fornalha da Bia)
    ir(n, DONA[modo], C);
    mandar(n, DONA[modo], { t: 'usar', id: id(), ...C });
    expect(n.estado.jogadores.get(DONA[modo])!.conteiner?.tipo).toBe('fornalha');
  });

  it('a fornalha da vila é de todos', () => {
    const n = montar();
    const V = fornalhaDaVila(n);
    for (const quem of ['leo', DONA[modo]]) {
      ir(n, quem, V);
      mandar(n, quem, { t: 'usar', id: id(), ...V });
      expect(n.estado.jogadores.get(quem)!.conteiner?.tipo).toBe('fornalha');
    }
  });
});

describe('auditoria da 016: lote do criativo e portas empilhadas (nuvem)', () => {
  const C = { x: 400, y: 95, z: 410 };
  const lote = (n: Nucleo, quem: string, cs: Array<Celula & { v: number }>) => {
    const i = id();
    ir(n, quem, cs[0]);
    mandar(n, quem, { t: 'editar', id: i, lote: cs });
    return i;
  };

  it('o lote igual não toma o bloco do amigo (nem o natural, nem a casa da vila)', () => {
    const n = abrir('nuvem', 'criativo', C);
    lote(n, 'leo', [{ ...C, v: Bloco.TABUAS }]);
    expect(n.donoDoBloco(C.x, C.y, C.z)).toBe('leo');
    // a Bia manda o mesmo bloco: não vira dela, e então não pode apagar
    lote(n, 'bia', [{ ...C, v: Bloco.TABUAS }]);
    expect(n.donoDoBloco(C.x, C.y, C.z)).toBe('leo');
    const r = lote(n, 'bia', [{ ...C, v: Bloco.AR }]);
    expect(bloco(n, C)).toBe(Bloco.TABUAS);
    expect(recusaDe(n, 'bia', r).recusa?.protecao).toEqual({ motivo: 'amigo', dono: 'Léo' });
    // girar o bloco do Léo (mesmo bloco, outro meta) também é mexer nele
    lote(n, 'bia', [{ ...C, v: empacotar(Bloco.TABUAS, 2) }]);
    expect(n.estado.edicoes.obterMeta(C.x, C.y, C.z)).toBe(0);
    // a casa da vila mandada igual não ganha edição (o tesouro e o meta ficam como o mundo fez)
    const L = acharLugares(n);
    const v = n.estado.mundo.bloco(L.parede.x, L.parede.y, L.parede.z);
    lote(n, 'bia', [{ ...L.parede, v }]);
    expect(n.estado.edicoes.obter(L.parede.x, L.parede.y, L.parede.z)).toBeUndefined();
    expect(n.donoDoBloco(L.parede.x, L.parede.y, L.parede.z)).toBeNull();
  });

  it('a porta solta da Bia em cima da do Léo não leva a metade dele ao quebrar', () => {
    const n = abrir('nuvem', 'criativo', C);
    const i = id();
    ir(n, 'leo', C);
    apoiar(n, C);
    mandar(n, 'leo', {
      t: 'colocar',
      id: i,
      ...C,
      bloco: Bloco.PORTA,
      meta: 0,
      slot: 0,
      extras: [{ ...C, y: C.y + 1 }],
    });
    const cima = { ...C, y: C.y + 1 };
    const solta = { ...C, y: C.y + 2 };
    expect([bloco(n, C), bloco(n, cima)]).toEqual([Bloco.PORTA, Bloco.PORTA]);
    colocar(n, 'bia', solta, Bloco.PORTA);
    expect(bloco(n, solta)).toBe(Bloco.PORTA);
    quebrar(n, 'bia', solta);
    expect([bloco(n, C), bloco(n, cima), bloco(n, solta)]).toEqual([
      Bloco.PORTA,
      Bloco.PORTA,
      Bloco.AR,
    ]);
    // o Léo quebra a de baixo: as duas metades dele saem
    quebrar(n, 'leo', C);
    expect([bloco(n, C), bloco(n, cima)]).toEqual([Bloco.AR, Bloco.AR]);
  });
});

describe('auditoria da 016: o vão de ar no chão da ruína (nuvem)', () => {
  it('o bloco posto no vão embaixo da ruína é de quem pôs: ele quebra, o amigo não', () => {
    const n = abrir('nuvem', 'criativo', { x: -300, y: 74, z: 5 });
    // a ruína da semente perto de (-296, 8): uma célula de chão onde a geração deixou ar
    let V: Celula | null = null;
    for (let x = -304; x <= -288 && !V; x++)
      for (let z = 0; z <= 16 && !V; z++)
        for (let y = 60; y <= 80 && !V; y++)
          if (
            n.protecao.em(x, y, z) === Protecao.CHAO &&
            n.estado.mundo.gerado(x, y, z) === Bloco.AR &&
            n.estado.mundo.bloco(x, y, z) === Bloco.AR
          )
            V = { x, y, z };
    expect(V, 'sem vão de ar no chão da ruína').not.toBeNull();
    colocar(n, 'bia', V!, Bloco.TABUAS);
    expect(bloco(n, V!)).toBe(Bloco.TABUAS);
    const r = quebrar(n, 'leo', V!);
    expect(bloco(n, V!)).toBe(Bloco.TABUAS);
    expect(recusaDe(n, 'leo', r).recusa?.protecao).toEqual({ motivo: 'amigo', dono: 'Bia' });
    quebrar(n, 'bia', V!);
    expect(bloco(n, V!)).toBe(Bloco.AR);
  });
});

describe.each<Modo>(['local', 'nuvem'])('voltar para casa (%s)', (modo) => {
  it('cercada pelos blocos do amigo, a criança volta para a cama; com um intervalo curto', () => {
    const C = { x: 400, y: 95, z: 410 };
    const n = abrir(modo, 'sobrevivencia', C);
    const quem = modo === 'local' ? 'local' : 'bia';
    const j = n.estado.jogadores.get(quem)!;
    j.spawn = { x: 100.5, z: 120.5 };
    const teleportes = () => {
      n.passo();
      return (n.quadros().get(quem)!.eventos ?? []).filter((e) => e.e === 'teleporte');
    };
    teleportes();
    mandar(n, quem, { t: 'voltarCasa' });
    expect(teleportes()).toEqual([{ e: 'teleporte', x: 100.5, z: 120.5 }]);
    // a próxima posição (lá na cama) é aceita, mesmo longe
    n.comando(quem, tel({ x: 100.5, y: 90, z: 120.5 }));
    expect(Math.hypot(j.tel.x - 100.5, j.tel.z - 120.5)).toBeLessThan(1);
    // de novo logo em seguida: espera um pouquinho (o aviso, sem levar)
    mandar(n, quem, { t: 'voltarCasa' });
    n.passo();
    const q = n.quadros().get(quem)!.eventos ?? [];
    expect(q.some((e) => e.e === 'teleporte')).toBe(false);
    expect(q).toContainEqual({ e: 'recusa', comando: 0, motivo: 'voltarCasa' });
    // passado o intervalo, volta
    for (let k = 0; k < ESPERA_VOLTA_CASA / 0.05; k++) n.passo();
    n.quadros();
    mandar(n, quem, { t: 'voltarCasa' });
    expect(teleportes()).toHaveLength(1);
  });
});

describe('lavoura do sítio: colhe e se replanta (local e nuvem)', () => {
  const RANCHO = 42;
  afterAll(() => {
    definirEstiloMundo(ESTILO_PADRAO);
    limparPovoados();
  });

  it.each<Modo>(['local', 'nuvem'])('%s: pé maduro dá colheita e volta ao estágio 0', (modo) => {
    definirEstiloMundo(obterTema('rancho-alegre').mundo);
    limparPovoados();
    const plano = povoadoPerto(RANCHO);
    const l = plano.lotes.find((x) => x.uso === 'lavoura')!;
    const [x, z] = noLote(l, 1, 2);
    const pe = { x, y: l.h + 1, z };
    const n = criarNucleo({
      semente: RANCHO,
      modo: 'sobrevivencia',
      versaoMundo: 2,
      confiarNoCliente: modo === 'local',
      depuracao: true,
      dono: DONA[modo],
    });
    const quem = modo === 'local' ? 'local' : 'bia';
    if (modo === 'local') n.conectar('local');
    else {
      n.conectar('ana', { perfil: { apelido: 'Ana', aparencia: {} } });
      n.conectar('bia', { perfil: { apelido: 'Bia', aparencia: {} } });
    }
    expect(n.protecao.em(pe.x, pe.y, pe.z)).toBe(Protecao.LAVOURA);
    expect(n.protecao.lugar(pe.x, pe.z)).toBe('sitio');
    const planta = n.estado.mundo.bloco(pe.x, pe.y, pe.z);
    const milho = planta >= Bloco.MILHO_0 && planta <= Bloco.MILHO_3;
    const madura = milho ? Bloco.MILHO_3 : Bloco.TRIGO_3;
    const zero = milho ? Bloco.MILHO_0 : Bloco.TRIGO_0;
    n.estado.edicoes.definir(pe.x, pe.y, pe.z, madura);
    quebrar(n, quem, pe);
    expect(bloco(n, pe)).toBe(zero);
    expect(n.estado.lavoura.has(`${pe.x},${pe.y},${pe.z}`)).toBe(true);
    expect(n.estado.mundoItens.itens.length).toBeGreaterThan(0);
    // verde: só recomeça, sem dar nada (o sítio não vira fonte de sementes)
    n.estado.edicoes.definir(pe.x, pe.y, pe.z, zero + 1);
    (n.estado.mundoItens.itens as unknown[]).length = 0;
    quebrar(n, quem, pe);
    expect(bloco(n, pe)).toBe(zero);
    expect(n.estado.mundoItens.itens.length).toBe(0);
    // a terra arada embaixo é do sítio: não quebra
    const terra = { ...pe, y: pe.y - 1 };
    quebrar(n, quem, terra);
    expect(bloco(n, terra)).toBe(Bloco.TERRA_ARADA);
    // e cresce de novo
    n.comando(quem, { t: 'depurar', d: { f: 'crescer', segundos: 400 } });
    expect(bloco(n, pe)).toBe(madura);
  });

  it('o lote do criativo só colhe a lavoura do sítio (não apaga nem troca)', () => {
    definirEstiloMundo(obterTema('rancho-alegre').mundo);
    limparPovoados();
    const plano = povoadoPerto(RANCHO);
    const l = plano.lotes.find((x) => x.uso === 'lavoura')!;
    const [x, z] = noLote(l, 1, 2);
    const pe = { x, y: l.h + 1, z };
    const n = criarNucleo({
      semente: RANCHO,
      modo: 'criativo',
      versaoMundo: 2,
      confiarNoCliente: false,
      depuracao: true,
      dono: 'ana',
    });
    n.conectar('ana', { perfil: { apelido: 'Ana', aparencia: {} } });
    n.conectar('bia', { perfil: { apelido: 'Bia', aparencia: {} } });
    const planta = n.estado.mundo.bloco(pe.x, pe.y, pe.z);
    const milho = planta >= Bloco.MILHO_0 && planta <= Bloco.MILHO_3;
    const madura = milho ? Bloco.MILHO_3 : Bloco.TRIGO_3;
    const zero = milho ? Bloco.MILHO_0 : Bloco.TRIGO_0;
    n.estado.edicoes.definir(pe.x, pe.y, pe.z, madura);
    ir(n, 'bia', pe);
    const trocar = id();
    mandar(n, 'bia', { t: 'editar', id: trocar, lote: [{ ...pe, v: Bloco.TABUAS }] });
    expect(bloco(n, pe)).toBe(madura);
    expect(recusaDe(n, 'bia', trocar).recusa?.protecao).toEqual({
      motivo: 'mundo',
      lugar: 'sitio',
    });
    // apagar com o lote é colher: volta o estágio 0, do mundo, e cresce de novo
    mandar(n, 'bia', { t: 'editar', id: id(), lote: [{ ...pe, v: Bloco.AR }] });
    expect(bloco(n, pe)).toBe(zero);
    expect(n.donoDoBloco(pe.x, pe.y, pe.z)).not.toBe('bia');
    expect(n.estado.lavoura.has(`${pe.x},${pe.y},${pe.z}`)).toBe(true);
  });

  it.each<Modo>(['local', 'nuvem'])(
    '%s: a porteira do sítio abre e fecha para todos (visitante também), mas não quebra',
    (modo) => {
      definirEstiloMundo(obterTema('rancho-alegre').mundo);
      limparPovoados();
      const plano = povoadoPerto(RANCHO);
      const n = criarNucleo({
        semente: RANCHO,
        modo: 'criativo',
        versaoMundo: 2,
        confiarNoCliente: modo === 'local',
        depuracao: true,
        dono: DONA[modo],
      });
      const todos = modo === 'local' ? ['local'] : ['ana', 'bia', 'leo'];
      if (modo === 'local') n.conectar('local');
      else
        for (const [i, a] of ['Ana', 'Bia', 'Léo'].entries())
          n.conectar(todos[i], { perfil: { apelido: a, aparencia: {} } });
      // visitante que só passeia (o dono não deixou construir) também abre
      if (modo === 'nuvem') n.definirConstrucao('leo', false);
      let porteira: Celula | null = null;
      for (let x = plano.minX; x <= plano.maxX && !porteira; x++)
        for (let z = plano.minZ; z <= plano.maxZ && !porteira; z++)
          for (let y = plano.h - 2; y < plano.h + 6; y++)
            if (n.estado.mundo.gerado(x, y, z) === Bloco.PORTEIRA) porteira = { x, y, z };
      expect(porteira).not.toBeNull();
      const P = porteira!;
      expect(n.protecao.em(P.x, P.y, P.z)).toBe(Protecao.USAVEL);
      for (const quem of todos) {
        ir(n, quem, P);
        mandar(n, quem, { t: 'usar', id: id(), ...P });
        expect(bloco(n, P)).toBe(Bloco.PORTEIRA_ABERTA);
        mandar(n, quem, { t: 'usar', id: id(), ...P });
        expect(bloco(n, P)).toBe(Bloco.PORTEIRA);
        const i = quebrar(n, quem, P);
        expect(bloco(n, P)).toBe(Bloco.PORTEIRA);
        expect(recusaDe(n, quem, i).recusa).toBeDefined();
      }
      // aberta, continua sem quebrar (e continua do mundo)
      mandar(n, DONA[modo], { t: 'usar', id: id(), ...P });
      quebrar(n, DONA[modo], P);
      expect(bloco(n, P)).toBe(Bloco.PORTEIRA_ABERTA);
    },
  );

  it('a casa do sítio avisa "do sítio"; a dona no criativo também não quebra', () => {
    definirEstiloMundo(obterTema('rancho-alegre').mundo);
    limparPovoados();
    const plano = povoadoPerto(RANCHO);
    const n = criarNucleo({
      semente: RANCHO,
      modo: 'criativo',
      versaoMundo: 2,
      confiarNoCliente: false,
      depuracao: true,
      dono: 'ana',
    });
    n.conectar('ana', { perfil: { apelido: 'Ana', aparencia: {} } });
    const [bx, by, bz] = plano.bauCeleiro!;
    const i = quebrar(n, 'ana', { x: bx, y: by, z: bz });
    expect(bloco(n, { x: bx, y: by, z: bz })).toBe(Bloco.BAU);
    expect(recusaDe(n, 'ana', i).recusa?.protecao).toEqual({ motivo: 'mundo', lugar: 'sitio' });
  });
});

describe('o cliente prevê igual e volta limpo quando o núcleo recusa', () => {
  it('a mesma regra na cópia do cliente; a quebra recusada volta sem sobrar nada', () => {
    const n0 = abrir('nuvem', 'criativo', { x: 0, y: 70, z: 0 });
    const L = acharLugares(n0);
    const n = abrir('nuvem', 'criativo', L.parede);
    const A = { x: L.plano.maxX + 40, y: 95, z: L.plano.maxZ + 40 };
    colocar(n, 'bia', A);
    n.passo();
    n.quadros();
    // a cópia do Léo (como a cena guarda) e a regra feita sobre ela
    const ouvintes: ((m: Mensagem) => void)[] = [];
    const conexao: Conexao = {
      enviar: (c) => n.comando('leo', c),
      aoReceber: (f) => ouvintes.push(f),
      encerrar: () => {},
    };
    const copia = criarEdicoes();
    copia.importar(n.estado.edicoes.exportar());
    copia.donos.importar(n.estado.edicoes.donos.exportar());
    const cliente = criarEstadoCliente({
      conexao,
      inventario: criarInventario(),
      aplicarBloco: (x, y, z, b, meta, dono) => copia.definir(x, y, z, b, meta, dono),
      aoQuadro: (q) => {
        if (q.donos) copia.donos.importar(q.donos);
      },
      hora: 0.3,
      dia: 0,
      clima: { tipo: 'limpo', nuvens: 0, chuva: 0, neblina: 0, raios: 0, arco: 0 } as never,
      sobrevivencia: estadoInicial(),
    });
    const bl = (x: number, y: number, z: number) =>
      copia.obter(x, y, z) ?? n.estado.mundo.gerado(x, y, z);
    const regraCliente: MundoDaRegra = {
      protecao: criarProtecaoMundo(SEMENTE),
      bloco: bl,
      gerado: (x, y, z) => n.estado.mundo.gerado(x, y, z),
      dono: (x, y, z) => donoNaCelula(copia, x, y, z, 'ana'),
      apelido: (i) => copia.donos.apelido(i) ?? (i === 'ana' ? 'Ana' : undefined),
      donoDoMundo: 'ana',
    };
    const regraNucleo: MundoDaRegra = {
      protecao: n.protecao,
      bloco: (x, y, z) => n.estado.mundo.bloco(x, y, z),
      gerado: (x, y, z) => n.estado.mundo.gerado(x, y, z),
      dono: (x, y, z) => n.donoDoBloco(x, y, z),
      apelido: (i) => n.apelidoDoDono(i),
      donoDoMundo: 'ana',
    };
    for (const quem of ['ana', 'bia', 'leo'])
      for (const c of [L.parede, L.cama, L.chao, L.passagem, L.enfeite, A]) {
        const a: RecusaProtecao | null = recusaQuebrar(regraCliente, quem, c.x, c.y, c.z);
        expect(a, `${quem} ${JSON.stringify(c)}`).toEqual(
          recusaQuebrar(regraNucleo, quem, c.x, c.y, c.z),
        );
      }
    // um cliente velho (ou adulterado) que não confere: prevê a quebra e manda
    const entregar = () => {
      n.passo();
      const q = n.quadros().get('leo')!;
      for (const f of ouvintes) f(JSON.parse(JSON.stringify(q)) as Mensagem);
    };
    // a sequência dos quadros do Léo começa aqui (como numa conexão nova)
    n.reiniciarQuadros('leo');
    entregar();
    ir(n, 'leo', A);
    const i = cliente.proximoId();
    cliente.prever(i, A.x, A.y, A.z, Bloco.AR, 0);
    expect(copia.obter(A.x, A.y, A.z)).toBe(Bloco.AR);
    cliente.enviar({ t: 'quebrar', id: i, ...A, slot: 0 });
    entregar();
    // voltou o bloco da Bia, com o dono dela
    expect(copia.obter(A.x, A.y, A.z)).toBe(Bloco.TABUAS);
    expect(donoNaCelula(copia, A.x, A.y, A.z, 'ana')).toBe('bia');
    expect(n.estado.mundo.bloco(A.x, A.y, A.z)).toBe(Bloco.TABUAS);
  });
});
