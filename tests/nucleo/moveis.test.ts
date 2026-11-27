import { describe, expect, it } from 'vitest';
import { criarNucleo, type Nucleo } from '../../src/nucleo/nucleo';
import { encontrarNascimento, alturaTerreno } from '../../src/world/chunk';
import { Bloco, luzDoBloco } from '../../src/world/blocks';
import { indiceDonoDe } from '../../src/world/edicoes';
import { idDoBloco } from '../../src/jogo/itens';
import { MAX_EXTRAS, sanear, sanearExtras } from '../../src/nucleo/saneamento';
import { celulasDoMovel, metaDoMovel } from '../../src/jogo/moveis';
import { celulasDoTapete } from '../../src/jogo/tapetes';
import type { DadosMundo } from '../../src/jogo/mundos';
import { VERSAO_REDE } from '../../src/rede/protocolo';
import type { Comando, EventoNucleo, Quadro, Telemetria } from '../../src/nucleo/protocolo';

/**
 * Spec 039 (T01): a regra dos móveis de várias células no núcleo, no servidor local e na nuvem
 * (`confiar: false`, tudo pelo saneamento): o `colocar` com a âncora, quebrar o móvel inteiro,
 * a peça solta, o lote do criativo, o abajur aceso, o tapete na camada própria e de 2 a 4
 * jogadores na mesma sala (quem entra no meio, quem cai e volta).
 */
const SEMENTE = 1337;
const p0 = encontrarNascimento(SEMENTE);
const X = Math.floor(p0.x);
const Z = Math.floor(p0.z);
/** A sala: um chão de tábuas no alto, longe das árvores (8 × 8, com o ar livre em cima). */
const YP = alturaTerreno(X, Z, SEMENTE) + 24;
const X0 = X - 2;
const Z0 = Z - 2;

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
const NOMES = ['ana', 'bia', 'caio', 'duda'] as const;
type Quem = (typeof NOMES)[number];

function sala(n: Nucleo): void {
  const ed = n.estado.edicoes;
  for (let x = X0 - 1; x <= X0 + 9; x++)
    for (let z = Z0 - 1; z <= Z0 + 9; z++) {
      ed.definir(x, YP - 1, z, Bloco.TABUAS);
      for (let y = YP; y <= YP + 3; y++) ed.definir(x, y, z, Bloco.AR);
    }
}

/** Onde cada um fica: na beira da sala, um do lado do outro. */
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

/** Pôr o móvel como o aparelho manda: a âncora, a direção e as outras células nos extras. */
function porMovel(n: Nucleo, quem: Quem, b: number, x: number, z: number, d = 0, y = YP) {
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
function porTapete(n: Nucleo, quem: Quem, x: number, z: number, d = 0) {
  const extras = celulasDoTapete(x, YP, z, d)
    .slice(1)
    .map(({ x, y, z }) => ({ x, y, z }));
  return mandar(n, quem, { t: 'colocar', x, y: YP, z, bloco: Bloco.TAPETE, meta: d, slot: 0, extras });
}
const quebrar = (n: Nucleo, quem: Quem, x: number, z: number, y = YP, tapete = false) =>
  mandar(n, quem, { t: 'quebrar', x, y, z, slot: 0, ...(tapete ? { tapete: true } : {}) });
const bloco = (n: Nucleo, x: number, y: number, z: number) => n.estado.mundo.bloco(x, y, z);
const meta = (n: Nucleo, x: number, y: number, z: number) => n.estado.edicoes.obterMeta(x, y, z);

/** Um passo e os quadros de todos. */
function passo(n: Nucleo): Map<string, Quadro> {
  n.passo();
  return n.quadros();
}
const recusasDe = (q: Quadro | undefined) =>
  (q?.eventos ?? []).filter(
    (e): e is Extract<EventoNucleo, { e: 'recusa' }> => e.e === 'recusa',
  );

/** Quantos itens deste tipo existem (no chão e nas mochilas). */
function contar(n: Nucleo, item: string): number {
  let t = 0;
  for (const i of n.estado.mundoItens.itens) if (i.item === item) t += i.qtd;
  for (const j of n.estado.jogadores.values()) t += j.inventario.contar(item);
  return t;
}

const SOFA = { x: X0 + 2, z: Z0 + 2 };

for (const modo of ['local', 'nuvem'] as const)
  describe(`pôr o móvel (${modo})`, () => {
    it('o sofá entra inteiro: as duas células, a parte no metadado e o mesmo dono', () => {
      const n = abrir(modo);
      porMovel(n, 'ana', Bloco.SOFA, SOFA.x, SOFA.z, 0);
      const q = passo(n);
      expect(recusasDe(q.get('ana'))).toEqual([]);
      expect(bloco(n, SOFA.x, YP, SOFA.z)).toBe(Bloco.SOFA);
      expect(bloco(n, SOFA.x + 1, YP, SOFA.z)).toBe(Bloco.SOFA);
      expect(meta(n, SOFA.x, YP, SOFA.z)).toBe(0);
      expect(meta(n, SOFA.x + 1, YP, SOFA.z)).toBe(0b100);
      // o quadro leva as duas células a quem joga
      const blocos = q.get('ana')!.blocos ?? [];
      expect(blocos.filter((b) => (b.v & 255) === Bloco.SOFA)).toHaveLength(2);
    });

    it('o guarda-roupa olhando para +x cresce para -z e para cima; o abajur, para cima', () => {
      const n = abrir(modo);
      porMovel(n, 'ana', Bloco.GUARDA_ROUPA, X0 + 2, Z0 + 4, 1);
      porMovel(n, 'ana', Bloco.ABAJUR, X0 + 5, Z0 + 2, 0);
      expect(recusasDe(passo(n).get('ana'))).toEqual([]);
      for (const [x, y, z, parte] of [
        [X0 + 2, YP, Z0 + 4, 0],
        [X0 + 2, YP, Z0 + 3, 1],
        [X0 + 2, YP + 1, Z0 + 4, 2],
        [X0 + 2, YP + 1, Z0 + 3, 3],
      ]) {
        expect(bloco(n, x, y, z)).toBe(Bloco.GUARDA_ROUPA);
        expect(meta(n, x, y, z)).toBe(metaDoMovel(1, parte));
      }
      expect(bloco(n, X0 + 5, YP + 1, Z0 + 2)).toBe(Bloco.ABAJUR);
    });

    it('a parte diferente de 0, os extras que faltam, sobram ou erram: recusa, e a tela volta toda', () => {
      const pedidos: [string, Record<string, unknown>][] = [
        ['parte 1', { meta: metaDoMovel(0, 1), extras: [{ x: SOFA.x + 1, y: YP, z: SOFA.z }] }],
        ['bit de cima', { meta: 32, extras: [{ x: SOFA.x + 1, y: YP, z: SOFA.z }] }],
        ['sem extras', {}],
        ['a célula errada', { extras: [{ x: SOFA.x - 1, y: YP, z: SOFA.z }] }],
        ['repetida', { extras: [{ x: SOFA.x + 1, y: YP, z: SOFA.z }, { x: SOFA.x + 1, y: YP, z: SOFA.z }] }],
        ['uma a mais', { extras: [{ x: SOFA.x + 1, y: YP, z: SOFA.z }, { x: SOFA.x + 2, y: YP, z: SOFA.z }] }],
      ];
      for (const [nome, extra] of pedidos) {
        const n = abrir(modo);
        const id = mandar(n, 'ana', {
          t: 'colocar',
          x: SOFA.x,
          y: YP,
          z: SOFA.z,
          bloco: Bloco.SOFA,
          meta: 0,
          slot: 0,
          ...extra,
        });
        const q = passo(n).get('ana')!;
        expect(recusasDe(q).map((r) => r.comando), nome).toEqual([id]);
        expect(bloco(n, SOFA.x, YP, SOFA.z), nome).toBe(Bloco.AR);
        expect(bloco(n, SOFA.x + 1, YP, SOFA.z), nome).toBe(Bloco.AR);
        // a correção leva a âncora e a direita do sofá (mesmo sem os extras)
        const voltam = (q.blocos ?? []).map((b) => `${b.x},${b.y},${b.z}`);
        expect(voltam, nome).toContain(`${SOFA.x},${YP},${SOFA.z}`);
        expect(voltam, nome).toContain(`${SOFA.x + 1},${YP},${SOFA.z}`);
      }
    });

    it('a outra célula ocupada, sem chão embaixo ou com uma amiga em cima: não entra', () => {
      // ocupada
      let n = abrir(modo);
      n.estado.edicoes.definir(SOFA.x + 1, YP, SOFA.z, Bloco.PEDRA_LISA);
      porMovel(n, 'ana', Bloco.SOFA, SOFA.x, SOFA.z);
      expect(recusasDe(passo(n).get('ana'))).toHaveLength(1);
      expect(bloco(n, SOFA.x, YP, SOFA.z)).toBe(Bloco.AR);
      // sem chão embaixo da direita
      n = abrir(modo);
      n.estado.edicoes.definir(SOFA.x + 1, YP - 1, SOFA.z, Bloco.AR);
      porMovel(n, 'ana', Bloco.SOFA, SOFA.x, SOFA.z);
      expect(recusasDe(passo(n).get('ana'))).toHaveLength(1);
      expect(bloco(n, SOFA.x, YP, SOFA.z)).toBe(Bloco.AR);
      // a cúpula do abajur passa do teto do mundo
      n = abrir(modo);
      n.estado.edicoes.definir(SOFA.x, 126, SOFA.z, Bloco.TABUAS);
      ir(n, 'ana', SOFA.x + 0.5, 127, SOFA.z - 2.5);
      porMovel(n, 'ana', Bloco.ABAJUR, SOFA.x, SOFA.z, 0, 127);
      expect(recusasDe(passo(n).get('ana'))).toHaveLength(1);
      expect(bloco(n, SOFA.x, 127, SOFA.z)).toBe(Bloco.AR);
      if (modo === 'nuvem') {
        // a Bia parada em cima da célula da direita
        n = abrir(modo);
        ir(n, 'bia', SOFA.x + 1.5, YP, SOFA.z + 0.5);
        porMovel(n, 'ana', Bloco.SOFA, SOFA.x, SOFA.z);
        expect(recusasDe(passo(n).get('ana'))).toHaveLength(1);
        expect(bloco(n, SOFA.x, YP, SOFA.z)).toBe(Bloco.AR);
      }
    });

    it('o aceso não se põe direto (só se acende)', () => {
      const n = abrir(modo);
      porMovel(n, 'ana', Bloco.ABAJUR_ACESO, SOFA.x, SOFA.z);
      expect(recusasDe(passo(n).get('ana'))).toHaveLength(1);
      expect(bloco(n, SOFA.x, YP, SOFA.z)).toBe(Bloco.AR);
    });
  });

describe('o saneamento dos extras', () => {
  it('a rede é a 19 (os móveis mudaram o colocar, o quebrar e o quadro)', () => {
    expect(VERSAO_REDE).toBe(19);
  });

  it('aceita até 5 (o tapete) e recusa 6', () => {
    expect(MAX_EXTRAS).toBe(5);
    const c = (k: number) => ({
      t: 'colocar',
      id: 1,
      x: 0,
      y: 70,
      z: 0,
      bloco: Bloco.TAPETE,
      meta: 0,
      slot: 0,
      extras: Array.from({ length: k }, (_, i) => ({ x: i + 1, y: 70, z: 0 })),
    });
    expect(sanear(c(5))).not.toBeNull();
    expect(sanear(c(6))).toBeNull();
    // o tapete só vai no quebrar, e só como `true`
    expect(sanear({ t: 'quebrar', id: 1, x: 0, y: 70, z: 0, slot: 0, tapete: true })).not.toBeNull();
    expect(sanear({ t: 'quebrar', id: 1, x: 0, y: 70, z: 0, slot: 0, tapete: 1 })).toBeNull();
    expect(sanear({ t: 'arar', id: 1, x: 0, y: 70, z: 0, slot: 0, tapete: true })).toBeNull();
  });

  it('os tapetes salvos passam a limpo (fora do mundo, a direção ou o dono errados saem)', () => {
    const e = sanearExtras({
      donos: [['bia', 'Bia']],
      tapetes: [
        [1, 70, 2, 3, 1],
        [1, 0, 2, 0, 0],
        [1, 70, 2, 4, 0],
        [1.5, 70, 2, 0, 0],
        [1, 70, 2, 0, 9],
        'lixo',
      ],
    });
    // o dono 9 não está na tabela: fica com o dono do mundo
    expect(e.tapetes).toEqual([
      [1, 70, 2, 3, 1],
      [1, 70, 2, 0, 0],
    ]);
  });
});

for (const modo of ['local', 'nuvem'] as const)
  describe(`quebrar o móvel (${modo})`, () => {
    it('quebrar qualquer parte leva o móvel inteiro e devolve um item só', () => {
      for (const parte of [0, 1, 2, 3]) {
        const n = abrir(modo, { jogo: 'sobrevivencia' });
        const ana = n.estado.jogadores.get('ana')!;
        ana.inventario.definir(0, { item: idDoBloco(Bloco.GUARDA_ROUPA), qtd: 1 });
        porMovel(n, 'ana', Bloco.GUARDA_ROUPA, SOFA.x, SOFA.z, 0);
        expect(recusasDe(passo(n).get('ana'))).toEqual([]);
        expect(contar(n, idDoBloco(Bloco.GUARDA_ROUPA))).toBe(0);
        const c = celulasDoMovel(Bloco.GUARDA_ROUPA, SOFA.x, YP, SOFA.z, 0)[parte];
        quebrar(n, 'ana', c.x, c.z, c.y);
        expect(recusasDe(passo(n).get('ana'))).toEqual([]);
        for (const q of celulasDoMovel(Bloco.GUARDA_ROUPA, SOFA.x, YP, SOFA.z, 0))
          expect(bloco(n, q.x, q.y, q.z), `parte ${parte}`).toBe(Bloco.AR);
        expect(contar(n, idDoBloco(Bloco.GUARDA_ROUPA)), `parte ${parte}`).toBe(1);
      }
    });

    it('o abajur aceso quebrado volta apagado', () => {
      const n = abrir(modo, { jogo: 'sobrevivencia' });
      n.estado.jogadores.get('ana')!.inventario.definir(0, { item: idDoBloco(Bloco.ABAJUR), qtd: 1 });
      porMovel(n, 'ana', Bloco.ABAJUR, SOFA.x, SOFA.z);
      passo(n);
      mandar(n, 'ana', { t: 'usar', x: SOFA.x, y: YP + 1, z: SOFA.z });
      passo(n);
      expect(bloco(n, SOFA.x, YP, SOFA.z)).toBe(Bloco.ABAJUR_ACESO);
      quebrar(n, 'ana', SOFA.x, SOFA.z, YP + 1);
      passo(n);
      expect(bloco(n, SOFA.x, YP, SOFA.z)).toBe(Bloco.AR);
      expect(contar(n, idDoBloco(Bloco.ABAJUR))).toBe(1);
    });

    it('a peça solta sai sozinha e não dá item', () => {
      const n = abrir(modo, { jogo: 'sobrevivencia' });
      // a direita de um sofá, sem a âncora (como uma edição antiga deixaria)
      n.estado.edicoes.definir(SOFA.x + 1, YP, SOFA.z, Bloco.SOFA, metaDoMovel(0, 1));
      quebrar(n, 'ana', SOFA.x + 1, SOFA.z);
      expect(recusasDe(passo(n).get('ana'))).toEqual([]);
      expect(bloco(n, SOFA.x + 1, YP, SOFA.z)).toBe(Bloco.AR);
      passo(n);
      expect(contar(n, idDoBloco(Bloco.SOFA))).toBe(0);
    });
  });

describe('a proteção vale para todas as células (nuvem)', () => {
  it('a Bia não quebra o sofá da Ana por nenhuma parte; a Ana, dona do mundo, quebra o da Bia', () => {
    const n = abrir('nuvem');
    porMovel(n, 'ana', Bloco.SOFA, SOFA.x, SOFA.z);
    passo(n);
    for (const dx of [0, 1]) {
      const id = quebrar(n, 'bia', SOFA.x + dx, SOFA.z);
      const q = passo(n).get('bia')!;
      expect(recusasDe(q).find((r) => r.comando === id)?.protecao).toMatchObject({ motivo: 'amigo', dono: 'Ana' });
      expect(bloco(n, SOFA.x, YP, SOFA.z)).toBe(Bloco.SOFA);
      expect(bloco(n, SOFA.x + 1, YP, SOFA.z)).toBe(Bloco.SOFA);
    }
    porMovel(n, 'bia', Bloco.SOFA, SOFA.x, SOFA.z + 2);
    passo(n);
    expect(indiceDonoDe(n.estado.edicoes.obterValor(SOFA.x + 1, YP, SOFA.z + 2)!)).toBe(1);
    quebrar(n, 'ana', SOFA.x + 1, SOFA.z + 2);
    passo(n);
    expect(bloco(n, SOFA.x, YP, SOFA.z + 2)).toBe(Bloco.AR);
  });

  it('a florzinha da Bia não some debaixo do sofá da Caio (a recusa vale para o móvel todo)', () => {
    const n = abrir('nuvem', { quantos: 3 });
    mandar(n, 'bia', { t: 'colocar', x: SOFA.x + 1, y: YP, z: SOFA.z, bloco: Bloco.FLOR, meta: 0, slot: 0 });
    passo(n);
    expect(bloco(n, SOFA.x + 1, YP, SOFA.z)).toBe(Bloco.FLOR);
    const id = porMovel(n, 'caio', Bloco.SOFA, SOFA.x, SOFA.z);
    const q = passo(n).get('caio')!;
    expect(recusasDe(q).find((r) => r.comando === id)?.protecao).toMatchObject({ motivo: 'amigo' });
    expect(bloco(n, SOFA.x, YP, SOFA.z)).toBe(Bloco.AR);
    expect(bloco(n, SOFA.x + 1, YP, SOFA.z)).toBe(Bloco.FLOR);
  });
});

for (const modo of ['local', 'nuvem'] as const)
  describe(`o lote do criativo com os móveis (${modo})`, () => {
    const v = (b: number, d: number, parte: number) => b | (metaDoMovel(d, parte) << 8);

    it('a âncora vira o móvel inteiro; a parte sozinha e o tapete ficam de fora (e voltam)', () => {
      const n = abrir(modo);
      mandar(n, 'ana', {
        t: 'editar',
        lote: [
          { x: SOFA.x, y: YP, z: SOFA.z, v: v(Bloco.SOFA, 0, 0) },
          { x: SOFA.x + 3, y: YP, z: SOFA.z, v: v(Bloco.SOFA, 0, 1) },
          { x: SOFA.x + 5, y: YP, z: SOFA.z, v: Bloco.TAPETE },
        ],
      });
      const q = passo(n).get('ana')!;
      expect(bloco(n, SOFA.x, YP, SOFA.z)).toBe(Bloco.SOFA);
      expect(bloco(n, SOFA.x + 1, YP, SOFA.z)).toBe(Bloco.SOFA);
      expect(meta(n, SOFA.x + 1, YP, SOFA.z)).toBe(metaDoMovel(0, 1));
      expect(bloco(n, SOFA.x + 3, YP, SOFA.z)).toBe(Bloco.AR);
      expect(bloco(n, SOFA.x + 5, YP, SOFA.z)).toBe(Bloco.AR);
      const voltam = (q.blocos ?? []).map((b) => `${b.x},${b.z}`);
      expect(voltam).toContain(`${SOFA.x + 3},${SOFA.z}`);
      expect(voltam).toContain(`${SOFA.x + 5},${SOFA.z}`);
    });

    it('trocar só uma parte leva o móvel inteiro; a âncora que não cabe fica de fora', () => {
      const n = abrir(modo);
      porMovel(n, 'ana', Bloco.SOFA, SOFA.x, SOFA.z);
      passo(n);
      mandar(n, 'ana', { t: 'editar', lote: [{ x: SOFA.x + 1, y: YP, z: SOFA.z, v: Bloco.TABUAS }] });
      passo(n);
      expect(bloco(n, SOFA.x, YP, SOFA.z)).toBe(Bloco.AR);
      expect(bloco(n, SOFA.x + 1, YP, SOFA.z)).toBe(Bloco.TABUAS);
      // agora a tábua está no caminho: o sofá da âncora não cabe
      const id = mandar(n, 'ana', { t: 'editar', lote: [{ x: SOFA.x, y: YP, z: SOFA.z, v: v(Bloco.SOFA, 0, 0) }] });
      const q = passo(n).get('ana')!;
      expect(recusasDe(q).map((r) => r.comando)).toContain(id);
      expect(bloco(n, SOFA.x, YP, SOFA.z)).toBe(Bloco.AR);
    });
  });

for (const modo of ['local', 'nuvem'] as const)
  describe(`a peça solta ao abrir o mundo (${modo})`, () => {
    it('vira ar; o móvel inteiro fica', () => {
      const n = abrir(modo);
      porMovel(n, 'ana', Bloco.SOFA, SOFA.x, SOFA.z);
      porMovel(n, 'ana', Bloco.SOFA, SOFA.x, SOFA.z + 2);
      passo(n);
      // a direita do segundo sumiu por fora (uma edição antiga) e sobrou uma parte perdida
      n.estado.edicoes.definir(SOFA.x + 1, YP, SOFA.z + 2, Bloco.AR);
      n.estado.edicoes.definir(SOFA.x + 4, YP, SOFA.z + 4, Bloco.GUARDA_ROUPA, metaDoMovel(0, 3));
      n.estado.edicoes.definir(SOFA.x + 5, YP, SOFA.z + 5, Bloco.TAPETE);
      const s = n.salvar();
      const dados: DadosMundo = { versao: 1, edicoes: s.edicoes, jogador: null, hora: s.hora, extras: s.extras };
      const m = abrir(modo, { dados });
      expect(bloco(m, SOFA.x, YP, SOFA.z)).toBe(Bloco.SOFA);
      expect(bloco(m, SOFA.x + 1, YP, SOFA.z)).toBe(Bloco.SOFA);
      expect(bloco(m, SOFA.x, YP, SOFA.z + 2)).toBe(Bloco.AR);
      expect(bloco(m, SOFA.x + 4, YP, SOFA.z + 4)).toBe(Bloco.AR);
      expect(bloco(m, SOFA.x + 5, YP, SOFA.z + 5)).toBe(Bloco.AR);
    });
  });

for (const modo of ['local', 'nuvem'] as const)
  describe(`o abajur e o criado-mudo acesos (${modo})`, () => {
    it('o toque na cúpula acende as duas células juntas, com a luz, e o salvamento guarda', () => {
      const n = abrir(modo);
      porMovel(n, 'ana', Bloco.ABAJUR, SOFA.x, SOFA.z, 2);
      porMovel(n, 'ana', Bloco.CRIADO_MUDO, SOFA.x + 2, SOFA.z);
      passo(n);
      const dono = n.estado.edicoes.indiceDono(SOFA.x, YP, SOFA.z);
      const escuro = n.estado.mundo.luzDaCelula(SOFA.x + 1, YP, SOFA.z);
      mandar(n, 'ana', { t: 'usar', x: SOFA.x, y: YP + 1, z: SOFA.z });
      mandar(n, 'ana', { t: 'usar', x: SOFA.x + 2, y: YP, z: SOFA.z });
      passo(n);
      expect(bloco(n, SOFA.x, YP, SOFA.z)).toBe(Bloco.ABAJUR_ACESO);
      expect(bloco(n, SOFA.x, YP + 1, SOFA.z)).toBe(Bloco.ABAJUR_ACESO);
      // a parte e a direção ficam; o dono também
      expect(meta(n, SOFA.x, YP + 1, SOFA.z)).toBe(metaDoMovel(2, 1));
      expect(n.estado.edicoes.indiceDono(SOFA.x, YP + 1, SOFA.z)).toBe(dono);
      expect(bloco(n, SOFA.x + 2, YP, SOFA.z)).toBe(Bloco.CRIADO_MUDO_ACESO);
      expect(n.estado.mundo.luzDaCelula(SOFA.x + 1, YP, SOFA.z)).toBeGreaterThan(escuro);
      expect(luzDoBloco(Bloco.ABAJUR_ACESO)).toBe(12);
      // salvo e aberto de novo: continua aceso
      const s = n.salvar();
      const m = abrir(modo, {
        dados: { versao: 1, edicoes: s.edicoes, jogador: null, hora: s.hora, extras: s.extras },
      });
      expect(bloco(m, SOFA.x, YP + 1, SOFA.z)).toBe(Bloco.ABAJUR_ACESO);
      // o toque no pé apaga as duas
      mandar(m, 'ana', { t: 'usar', x: SOFA.x, y: YP, z: SOFA.z });
      passo(m);
      expect(bloco(m, SOFA.x, YP, SOFA.z)).toBe(Bloco.ABAJUR);
      expect(bloco(m, SOFA.x, YP + 1, SOFA.z)).toBe(Bloco.ABAJUR);
    });

    it('a peça solta não acende', () => {
      const n = abrir(modo);
      n.estado.edicoes.definir(SOFA.x, YP + 1, SOFA.z, Bloco.ABAJUR, metaDoMovel(0, 1));
      mandar(n, 'ana', { t: 'usar', x: SOFA.x, y: YP + 1, z: SOFA.z });
      passo(n);
      expect(bloco(n, SOFA.x, YP + 1, SOFA.z)).toBe(Bloco.ABAJUR);
    });
  });

for (const modo of ['local', 'nuvem'] as const)
  describe(`o tapete na camada própria (${modo})`, () => {
    const T = { x: X0 + 2, z: Z0 + 3 };

    it('entra na camada (não na célula), com o dono e a direção, e é salvo', () => {
      const n = abrir(modo);
      porTapete(n, 'ana', T.x, T.z, 0);
      const q = passo(n).get('ana')!;
      expect(recusasDe(q)).toEqual([]);
      for (const c of celulasDoTapete(T.x, YP, T.z, 0)) {
        expect(n.estado.tapetes.em(c.x, c.y, c.z)).toMatchObject({ x: T.x, y: YP, z: T.z, d: 0 });
        expect(bloco(n, c.x, c.y, c.z)).toBe(Bloco.AR);
      }
      expect(n.estado.tapetes.em(T.x + 3, YP, T.z)).toBeUndefined();
      expect(n.estado.tapetes.em(T.x, YP, T.z + 2)).toBeUndefined();
      const s = n.salvar();
      expect(s.extras['tapetes']).toEqual([[T.x, YP, T.z, 0, 0]]);
      const m = abrir(modo, {
        dados: { versao: 1, edicoes: s.edicoes, jogador: null, hora: s.hora, extras: s.extras },
      });
      expect(m.estado.tapetes.em(T.x + 2, YP, T.z + 1)).toMatchObject({ x: T.x, z: T.z });
      // quem entra recebe a camada inteira no primeiro quadro
      expect(m.quadros().get('ana')?.tapetes).toBeUndefined();
      m.reiniciarQuadros('ana');
      expect(passo(m).get('ana')?.tapetes).toEqual([{ x: T.x, y: YP, z: T.z, d: 0, dono: 0 }]);
    });

    it('o sofá vai por cima; quebrar onde há móvel em cima não tira o tapete; onde não há, tira inteiro', () => {
      const n = abrir(modo, { jogo: 'sobrevivencia' });
      const ana = n.estado.jogadores.get('ana')!;
      ana.inventario.definir(0, { item: idDoBloco(Bloco.TAPETE), qtd: 1 });
      porTapete(n, 'ana', T.x, T.z, 0);
      expect(recusasDe(passo(n).get('ana'))).toEqual([]);
      expect(ana.inventario.contar(idDoBloco(Bloco.TAPETE))).toBe(0);
      ana.inventario.definir(0, { item: idDoBloco(Bloco.SOFA), qtd: 1 });
      porMovel(n, 'ana', Bloco.SOFA, T.x, T.z, 0);
      expect(recusasDe(passo(n).get('ana'))).toEqual([]);
      expect(bloco(n, T.x + 1, YP, T.z)).toBe(Bloco.SOFA);
      // embaixo do sofá: não sai
      const id = quebrar(n, 'ana', T.x + 1, T.z, YP, true);
      expect(recusasDe(passo(n).get('ana')).map((r) => r.comando)).toEqual([id]);
      expect(n.estado.tapetes.tamanho).toBe(1);
      // na parte livre: sai o tapete inteiro, para a mochila, e o sofá fica
      quebrar(n, 'ana', T.x + 2, T.z + 1, YP, true);
      const q = passo(n).get('ana')!;
      expect(recusasDe(q)).toEqual([]);
      expect(n.estado.tapetes.tamanho).toBe(0);
      expect(q.tapetesMudados).toEqual([{ x: T.x, y: YP, z: T.z, fora: true }]);
      expect(ana.inventario.contar(idDoBloco(Bloco.TAPETE))).toBe(1);
      expect(bloco(n, T.x, YP, T.z)).toBe(Bloco.SOFA);
    });

    it('os extras que faltam, sobram, erram ou se repetem, e a parte no metadado: recusa', () => {
      const certas = celulasDoTapete(T.x, YP, T.z, 0)
        .slice(1)
        .map(({ x, y, z }) => ({ x, y, z }));
      const girada = celulasDoTapete(T.x, YP, T.z, 1)
        .slice(1)
        .map(({ x, y, z }) => ({ x, y, z }));
      const pedidos: [string, Record<string, unknown>][] = [
        ['sem extras', {}],
        ['faltando uma', { extras: certas.slice(0, 4) }],
        ['uma errada', { extras: [...certas.slice(0, 4), { x: T.x + 3, y: YP, z: T.z }] }],
        ['repetida', { extras: [...certas.slice(0, 4), certas[0]] }],
        ['girada', { extras: girada }],
        ['parte 1 no metadado', { extras: certas, meta: metaDoMovel(0, 1) }],
      ];
      for (const [nome, extra] of pedidos) {
        const n = abrir(modo);
        const id = mandar(n, 'ana', {
          t: 'colocar',
          x: T.x,
          y: YP,
          z: T.z,
          bloco: Bloco.TAPETE,
          meta: 0,
          slot: 0,
          ...extra,
        });
        const q = passo(n).get('ana')!;
        expect(
          recusasDe(q).map((r) => r.comando),
          nome,
        ).toEqual([id]);
        expect(n.estado.tapetes.tamanho, nome).toBe(0);
        // a tela volta: o tapete previsto sai e as seis células vêm como são
        expect(q.tapetesMudados, nome).toEqual([{ x: T.x, y: YP, z: T.z, fora: true }]);
        const voltam = new Set((q.blocos ?? []).map((b) => `${b.x},${b.y},${b.z}`));
        for (const c of celulasDoTapete(T.x, YP, T.z, 0))
          expect(voltam.has(`${c.x},${c.y},${c.z}`), nome).toBe(true);
      }
      // e o pedido certo entra (a prova de que o de cima recusa pelo motivo certo)
      const n = abrir(modo);
      porTapete(n, 'ana', T.x, T.z, 0);
      expect(recusasDe(passo(n).get('ana'))).toEqual([]);
      expect(n.estado.tapetes.tamanho).toBe(1);
    });

    if (modo === 'nuvem')
      it('a florzinha da amiga embaixo: o tapete não entra (a proteção de colocar)', () => {
        const n = abrir(modo);
        // a flor da Ana (dona do mundo) no meio de onde a Bia quer o tapete
        mandar(n, 'ana', {
          t: 'colocar',
          x: T.x,
          y: YP,
          z: T.z + 3,
          bloco: Bloco.FLOR,
          meta: 0,
          slot: 0,
        });
        // a flor da própria Bia
        mandar(n, 'bia', {
          t: 'colocar',
          x: T.x + 2,
          y: YP,
          z: T.z + 1,
          bloco: Bloco.FLOR,
          meta: 0,
          slot: 0,
        });
        passo(n);
        expect(bloco(n, T.x, YP, T.z + 3)).toBe(Bloco.FLOR);
        expect(bloco(n, T.x + 2, YP, T.z + 1)).toBe(Bloco.FLOR);
        const id = porTapete(n, 'bia', T.x, T.z + 2);
        const q = passo(n).get('bia')!;
        expect(recusasDe(q).find((r) => r.comando === id)?.protecao).toMatchObject({
          motivo: 'amigo',
          dono: 'Ana',
        });
        expect(n.estado.tapetes.tamanho).toBe(0);
        // em cima da flor dela mesma, entra (a flor fica)
        porTapete(n, 'bia', T.x, T.z);
        expect(recusasDe(passo(n).get('bia'))).toEqual([]);
        expect(n.estado.tapetes.em(T.x + 2, YP, T.z + 1)).toMatchObject({ x: T.x, z: T.z });
        expect(bloco(n, T.x + 2, YP, T.z + 1)).toBe(Bloco.FLOR);
      });

    it('o chão embaixo some (quebrado ou pelo lote do criativo): o tapete sai inteiro e volta para o dono', () => {
      // na sobrevivência: a Ana quebra uma tábua do chão embaixo do tapete dela
      const n = abrir(modo, { jogo: 'sobrevivencia' });
      const ana = n.estado.jogadores.get('ana')!;
      const TAPETE = idDoBloco(Bloco.TAPETE);
      ana.inventario.definir(0, { item: TAPETE, qtd: 1 });
      porTapete(n, 'ana', T.x, T.z, 0);
      expect(recusasDe(passo(n).get('ana'))).toEqual([]);
      expect(contar(n, TAPETE)).toBe(0);
      quebrar(n, 'ana', T.x + 1, T.z + 1, YP - 1);
      const q = passo(n).get('ana')!;
      expect(recusasDe(q)).toEqual([]);
      expect(bloco(n, T.x + 1, YP - 1, T.z + 1)).toBe(Bloco.AR);
      expect(n.estado.tapetes.tamanho).toBe(0);
      expect(q.tapetesMudados).toEqual([{ x: T.x, y: YP, z: T.z, fora: true }]);
      // volta para a mochila de quem pôs (um só, e nada no chão)
      expect(ana.inventario.contar(TAPETE)).toBe(1);
      expect(contar(n, TAPETE)).toBe(1);
      // no criativo: o lote que tira o chão leva o tapete junto (sem item)
      const m = abrir(modo);
      porTapete(m, 'ana', T.x, T.z, 0);
      passo(m);
      expect(m.estado.tapetes.tamanho).toBe(1);
      mandar(m, 'ana', { t: 'editar', lote: [{ x: T.x + 2, y: YP - 1, z: T.z, v: Bloco.AR }] });
      const q2 = passo(m).get('ana')!;
      expect(bloco(m, T.x + 2, YP - 1, T.z)).toBe(Bloco.AR);
      expect(m.estado.tapetes.tamanho).toBe(0);
      expect(q2.tapetesMudados).toEqual([{ x: T.x, y: YP, z: T.z, fora: true }]);
      // trocar o chão por outro bloco que apoia não mexe no tapete
      porTapete(m, 'ana', T.x, T.z + 3, 0);
      passo(m);
      mandar(m, 'ana', { t: 'editar', lote: [{ x: T.x, y: YP - 1, z: T.z + 3, v: Bloco.PEDRA_LISA }] });
      passo(m);
      expect(m.estado.tapetes.tamanho).toBe(1);
      if (modo === 'nuvem') {
        // a Bia tira o chão (dela) embaixo do tapete da Ana: ele volta para a mochila da Ana
        const s = abrir(modo, { jogo: 'sobrevivencia' });
        const a = s.estado.jogadores.get('ana')!;
        a.inventario.definir(0, { item: TAPETE, qtd: 1 });
        porTapete(s, 'ana', T.x, T.z, 0);
        passo(s);
        expect(s.estado.tapetes.tamanho).toBe(1);
        s.estado.edicoes.definir(T.x + 1, YP - 1, T.z, Bloco.TABUAS, 0, s.estado.edicoes.donos.indice('bia'));
        quebrar(s, 'bia', T.x + 1, T.z, YP - 1);
        passo(s);
        expect(bloco(s, T.x + 1, YP - 1, T.z)).toBe(Bloco.AR);
        expect(s.estado.tapetes.tamanho).toBe(0);
        expect(a.inventario.contar(TAPETE)).toBe(1);
        expect(s.estado.jogadores.get('bia')!.inventario.contar(TAPETE)).toBe(0);
      }
    });

    it('não entra sem chão, em cima de outro tapete ou na água; ninguém fica preso', () => {
      let n = abrir(modo);
      n.estado.edicoes.definir(T.x + 2, YP - 1, T.z + 1, Bloco.AR);
      const id = porTapete(n, 'ana', T.x, T.z);
      let q = passo(n).get('ana')!;
      expect(recusasDe(q).map((r) => r.comando)).toEqual([id]);
      expect(n.estado.tapetes.tamanho).toBe(0);
      // a tela volta: o tapete previsto sai
      expect(q.tapetesMudados).toEqual([{ x: T.x, y: YP, z: T.z, fora: true }]);
      n = abrir(modo);
      porTapete(n, 'ana', T.x, T.z);
      passo(n);
      porTapete(n, 'ana', T.x + 1, T.z + 1);
      q = passo(n).get('ana')!;
      expect(recusasDe(q)).toHaveLength(1);
      expect(n.estado.tapetes.tamanho).toBe(1);
      // a correção devolve o tapete de verdade que estava por baixo
      expect(q.tapetesMudados).toContainEqual({ x: T.x, y: YP, z: T.z, d: 0, dono: 0 });
      n = abrir(modo);
      n.estado.edicoes.definir(T.x, YP, T.z, Bloco.AGUA);
      porTapete(n, 'ana', T.x, T.z);
      expect(recusasDe(passo(n).get('ana'))).toHaveLength(1);
      if (modo === 'nuvem') {
        // a Bia em pé em cima: o tapete entra (não ocupa espaço)
        n = abrir(modo);
        ir(n, 'bia', T.x + 1.5, YP, T.z + 0.5);
        porTapete(n, 'ana', T.x, T.z);
        expect(recusasDe(passo(n).get('ana'))).toEqual([]);
        expect(n.estado.tapetes.tamanho).toBe(1);
      }
    });
  });

describe('de 2 a 4 jogadores na mesma sala (nuvem)', () => {
  it('todos veem o móvel, a luz e o tapete; quem entra no meio recebe tudo; quem cai e volta também', () => {
    const n = abrir('nuvem', { quantos: 3 });
    porMovel(n, 'ana', Bloco.SOFA, SOFA.x, SOFA.z);
    porMovel(n, 'bia', Bloco.ABAJUR, SOFA.x + 4, SOFA.z);
    porTapete(n, 'caio', X0 + 2, Z0 + 5, 1);
    let q = passo(n);
    for (const quem of ['ana', 'bia', 'caio']) {
      const blocos = q.get(quem)!.blocos ?? [];
      expect(blocos.filter((b) => (b.v & 255) === Bloco.SOFA), quem).toHaveLength(2);
      expect(blocos.filter((b) => (b.v & 255) === Bloco.ABAJUR), quem).toHaveLength(2);
      expect(q.get(quem)!.tapetesMudados, quem).toEqual([
        { x: X0 + 2, y: YP, z: Z0 + 5, d: 1, dono: indiceDono(n, 'caio') },
      ]);
    }
    // a Caio acende o abajur da Bia (a luz é a mesma para todos)
    mandar(n, 'caio', { t: 'usar', x: SOFA.x + 4, y: YP + 1, z: SOFA.z });
    q = passo(n);
    for (const quem of ['ana', 'bia', 'caio'])
      expect(
        (q.get(quem)!.blocos ?? []).filter((b) => (b.v & 255) === Bloco.ABAJUR_ACESO),
        quem,
      ).toHaveLength(2);
    // a Duda entra no meio: o mundo já tem tudo, e a camada dos tapetes vem no primeiro quadro
    n.conectar('duda', { perfil: { apelido: 'Duda', aparencia: {} } });
    ir(n, 'duda', lugar(3).x, YP, lugar(3).z);
    q = passo(n);
    expect(q.get('duda')!.primeiro).toBe(true);
    expect(q.get('duda')!.tapetes).toEqual([{ x: X0 + 2, y: YP, z: Z0 + 5, d: 1, dono: indiceDono(n, 'caio') }]);
    expect(bloco(n, SOFA.x + 4, YP, SOFA.z)).toBe(Bloco.ABAJUR_ACESO);
    // a Bia tira o tapete da Caio? Não: só quem pôs (e a dona do mundo)
    const id = quebrar(n, 'bia', X0 + 2, Z0 + 5, YP, true);
    q = passo(n);
    expect(recusasDe(q.get('bia')).find((r) => r.comando === id)?.protecao).toMatchObject({
      motivo: 'amigo',
      dono: 'Caio',
    });
    expect(n.estado.tapetes.tamanho).toBe(1);
    // a Duda cai e volta: o primeiro quadro de novo, com a camada inteira
    n.reiniciarQuadros('duda');
    q = passo(n);
    expect(q.get('duda')!.primeiro).toBe(true);
    expect(q.get('duda')!.tapetes).toHaveLength(1);
    // a Caio tira o dela; todos recebem a saída
    quebrar(n, 'caio', X0 + 2, Z0 + 5, YP, true);
    q = passo(n);
    for (const quem of NOMES)
      expect(q.get(quem)!.tapetesMudados, quem).toEqual([{ x: X0 + 2, y: YP, z: Z0 + 5, fora: true }]);
    // a Ana quebra o sofá dela; a Duda (que entrou depois) vê as duas células sumirem
    quebrar(n, 'ana', SOFA.x + 1, SOFA.z);
    q = passo(n);
    const sumiram = (q.get('duda')!.blocos ?? []).filter(
      (b) => b.y === YP && b.z === SOFA.z && (b.x === SOFA.x || b.x === SOFA.x + 1),
    );
    expect(sumiram.map((b) => b.v & 255)).toEqual([Bloco.AR, Bloco.AR]);
  });
});

function indiceDono(n: Nucleo, quem: string): number {
  return n.estado.edicoes.donos.procurar(quem);
}
