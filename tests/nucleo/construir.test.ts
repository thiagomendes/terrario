import { describe, expect, it } from 'vitest';
import { criarNucleo, type Nucleo } from '../../src/nucleo/nucleo';
import { encontrarNascimento, alturaTerreno } from '../../src/world/chunk';
import { Bloco } from '../../src/world/blocks';
import { sanear } from '../../src/nucleo/saneamento';
import type { Comando, EventoNucleo, Telemetria } from '../../src/nucleo/protocolo';

/**
 * Spec 037 (T01): a regra de construir no núcleo, igual no servidor local e na nuvem. Os
 * caminhos são os da investigação (`referencia/investigacao-colocar.md`): o bloco no ar, o
 * apoio que não é sólido, o bicho, o morador e o peixe, o amigo com a posição atrasada, a
 * metade de cima da porta, o lote do criativo e quem entra num lugar já construído.
 */
const SEMENTE = 1337;
const p0 = encontrarNascimento(SEMENTE);
const X = Math.floor(p0.x);
const Z = Math.floor(p0.z);
const Y = alturaTerreno(X, Z, SEMENTE) + 1;
/** Em cima do chão, numa coluna perto do nascimento. */
const chao = (x: number, z: number) => alturaTerreno(x, z, SEMENTE) + 1;

function tel(x: number, y: number, z: number, extra: Partial<Telemetria> = {}): Comando {
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

type Modo = 'local' | 'nuvem';

/** A Ana no nascimento e a Bia longe; na nuvem, tudo pelo saneamento. */
function abrir(modo: Modo, jogo: 'criativo' | 'sobrevivencia' = 'criativo'): Nucleo {
  const n = criarNucleo({
    semente: SEMENTE,
    modo: jogo,
    versaoMundo: 2,
    confiarNoCliente: modo === 'local',
    depuracao: true,
    dono: 'ana',
  });
  n.conectar('ana', { perfil: { apelido: 'Ana', aparencia: {} } });
  n.conectar('bia', { perfil: { apelido: 'Bia', aparencia: {} } });
  ir(n, 'ana', X + 0.5, Y, Z + 0.5);
  ir(n, 'bia', X + 0.5, chao(X, Z + 6), Z + 6.5);
  n.passo();
  n.quadros();
  return n;
}

function ir(n: Nucleo, quem: string, x: number, y: number, z: number, extra?: Partial<Telemetria>) {
  n.estado.jogadores.get(quem)!.saltoPermitido = true;
  n.comando(quem, tel(x, y, z, extra));
}

let ids = 1;
function mandar(n: Nucleo, quem: string, c: Record<string, unknown>): number {
  const id = ++ids;
  const s = sanear({ ...c, id });
  expect(s, JSON.stringify(c)).not.toBeNull();
  n.comando(quem, s!);
  return id;
}
const por = (n: Nucleo, x: number, y: number, z: number, bloco: number = Bloco.TABUAS) =>
  mandar(n, 'ana', { t: 'colocar', x, y, z, bloco, meta: 0, slot: 0 });
const bloco = (n: Nucleo, x: number, y: number, z: number) => n.estado.mundo.bloco(x, y, z);

/** Os eventos de recusa da Ana neste passo. */
function recusas(n: Nucleo): Extract<EventoNucleo, { e: 'recusa' }>[] {
  n.passo();
  return (n.quadros().get('ana')!.eventos ?? []).filter(
    (e): e is Extract<EventoNucleo, { e: 'recusa' }> => e.e === 'recusa',
  );
}

/** Uma coluna de ar livre ao lado do nascimento (sem planta, sem árvore). */
const COL = { x: X + 2, z: Z };

for (const modo of ['local', 'nuvem'] as const)
  describe(`o apoio (${modo})`, () => {
    it('bloco no ar, sem nada encostado, é recusado (e a tela volta)', () => {
      const n = abrir(modo);
      const y = chao(COL.x, COL.z) + 3;
      const i = por(n, COL.x, y, COL.z);
      const r = recusas(n);
      expect(bloco(n, COL.x, y, COL.z)).toBe(Bloco.AR);
      expect(r.find((e) => e.comando === i)).toMatchObject({ motivo: 'colocar' });
    });

    it('encostado no chão, embaixo, do lado e em cima de um bloco: entra', () => {
      const n = abrir(modo);
      const y = chao(COL.x, COL.z);
      // no chão, e uma torre de 3 (cada um em cima do outro)
      for (const dy of [0, 1, 2]) por(n, COL.x, y + dy, COL.z);
      // do lado do de cima (ponte), e pendurado embaixo da ponte
      por(n, COL.x, y + 2, COL.z + 1);
      por(n, COL.x, y + 1, COL.z + 1);
      expect(recusas(n)).toEqual([]);
      for (const [dy, dz] of [
        [0, 0],
        [1, 0],
        [2, 0],
        [2, 1],
        [1, 1],
      ])
        expect(bloco(n, COL.x, y + dy, COL.z + dz), `${dy},${dz}`).toBe(Bloco.TABUAS);
    });

    it('em cima da tocha não entra (a tocha não é apoio)', () => {
      const n = abrir(modo);
      const y = chao(COL.x, COL.z);
      por(n, COL.x, y, COL.z, Bloco.TOCHA);
      expect(recusas(n)).toEqual([]);
      expect(bloco(n, COL.x, y, COL.z)).toBe(Bloco.TOCHA);
      por(n, COL.x, y + 1, COL.z);
      expect(recusas(n)).toHaveLength(1);
      expect(bloco(n, COL.x, y + 1, COL.z)).toBe(Bloco.AR);
    });

    it('quebrar o apoio deixa o bloco onde está (decisão do dono)', () => {
      const n = abrir(modo);
      const y = chao(COL.x, COL.z);
      por(n, COL.x, y, COL.z);
      por(n, COL.x, y + 1, COL.z);
      mandar(n, 'ana', { t: 'quebrar', x: COL.x, y, z: COL.z, slot: 0 });
      n.passo();
      expect(bloco(n, COL.x, y, COL.z)).toBe(Bloco.AR);
      expect(bloco(n, COL.x, y + 1, COL.z)).toBe(Bloco.TABUAS);
    });

    it('a porta pede chão embaixo: encostada só na parede, não entra', () => {
      const n = abrir(modo);
      const y = chao(COL.x, COL.z);
      // a parede de 3 em pé, e a porta pendurada do lado dela, um acima do chão
      for (const dy of [0, 1, 2]) por(n, COL.x, y + dy, COL.z);
      recusas(n);
      const porta = (yy: number) =>
        mandar(n, 'ana', {
          t: 'colocar',
          x: COL.x,
          y: yy,
          z: COL.z + 1,
          bloco: Bloco.PORTA,
          meta: 0,
          slot: 0,
          extras: [{ x: COL.x, y: yy + 1, z: COL.z + 1 }],
        });
      const chaoDoLado = chao(COL.x, COL.z + 1);
      porta(chaoDoLado + 1);
      expect(recusas(n)).toHaveLength(1);
      expect(bloco(n, COL.x, chaoDoLado + 1, COL.z + 1)).toBe(Bloco.AR);
      porta(chaoDoLado);
      expect(recusas(n)).toEqual([]);
      expect(bloco(n, COL.x, chaoDoLado, COL.z + 1)).toBe(Bloco.PORTA);
      expect(bloco(n, COL.x, chaoDoLado + 1, COL.z + 1)).toBe(Bloco.PORTA);
    });

    it('o lote do criativo não tem a regra de apoio (colar, espelho)', () => {
      const n = abrir(modo);
      const y = chao(COL.x, COL.z) + 4;
      mandar(n, 'ana', { t: 'editar', lote: [{ x: COL.x, y, z: COL.z, v: Bloco.TABUAS }] });
      n.passo();
      expect(bloco(n, COL.x, y, COL.z)).toBe(Bloco.TABUAS);
    });
  });

for (const modo of ['local', 'nuvem'] as const)
  describe(`o corpo (${modo})`, () => {
    it('em cima de bicho, de morador e de peixe não entra; a flor (que não prende) entra', () => {
      for (const tipo of ['cervo', 'coelho', 'raposa', 'morador'] as const) {
        const n = abrir(modo);
        const y = chao(COL.x, COL.z);
        n.estado.populacao.adicionar(tipo, COL.x + 0.5, y, COL.z + 0.5);
        por(n, COL.x, y, COL.z);
        expect(recusas(n), tipo).toHaveLength(1);
        expect(bloco(n, COL.x, y, COL.z), tipo).toBe(Bloco.AR);
      }
      const n = abrir(modo);
      const y = chao(COL.x, COL.z);
      n.estado.populacao.adicionar('cervo', COL.x + 0.5, y, COL.z + 0.5);
      por(n, COL.x, y, COL.z, Bloco.FLOR);
      expect(recusas(n)).toEqual([]);
      expect(bloco(n, COL.x, y, COL.z)).toBe(Bloco.FLOR);
    });

    it('o peixe na água: o bloco não entra e ele não morre', () => {
      const n = abrir(modo);
      const y = chao(COL.x, COL.z);
      // um poço de um bloco de água (no aparelho, como a criança faria com o balde)
      n.estado.edicoes.definir(COL.x, y, COL.z, Bloco.AGUA);
      const peixe = n.estado.populacao.adicionar('peixe', COL.x + 0.5, y + 0.3, COL.z + 0.5);
      por(n, COL.x, y, COL.z);
      expect(recusas(n)).toHaveLength(1);
      expect(bloco(n, COL.x, y, COL.z)).toBe(Bloco.AGUA);
      for (let i = 0; i < 20; i++) n.passo();
      expect(peixe.estado).not.toBe('morrendo');
    });

    it('o bicho que está morrendo não segura o bloco', () => {
      const n = abrir(modo);
      const y = chao(COL.x, COL.z);
      const c = n.estado.populacao.adicionar('cervo', COL.x + 0.5, y, COL.z + 0.5);
      c.estado = 'morrendo';
      por(n, COL.x, y, COL.z);
      expect(recusas(n)).toEqual([]);
    });

    it('o amigo parado: dá para fazer a parede colada nele; andando, a célula dele está ocupada', () => {
      const n = abrir(modo);
      const y = chao(COL.x, COL.z);
      // a Bia parada no meio da célula do lado (o corpo dela encosta a 0,2 da parede)
      ir(n, 'bia', COL.x + 1.5, chao(COL.x + 1, COL.z), COL.z + 0.5);
      n.passo();
      por(n, COL.x, y, COL.z);
      expect(recusas(n)).toEqual([]);
      expect(bloco(n, COL.x, y, COL.z)).toBe(Bloco.TABUAS);
      // a Bia andando para a parede: a posição dela chega atrasada, a folga cobre
      ir(n, 'bia', COL.x + 1.5, chao(COL.x + 1, COL.z), COL.z + 0.5, { vel: 4.3 });
      n.passo();
      por(n, COL.x, y + 1, COL.z);
      expect(recusas(n)).toHaveLength(1);
      expect(bloco(n, COL.x, y + 1, COL.z)).toBe(Bloco.AR);
    });

    it('o amigo que vinha andando, visto 0,95 bloco antes da célula: o bloco não entra', () => {
      const n = abrir(modo);
      const y = chao(COL.x, COL.z);
      ir(n, 'bia', COL.x + 1.45, y, COL.z + 0.5, { vel: 4.3 });
      n.passo();
      por(n, COL.x, y, COL.z);
      expect(recusas(n)).toHaveLength(1);
    });

    it('quem coloca vai com a caixa do corpo (sem folga): o bloco do lado entra correndo', () => {
      const n = abrir(modo);
      ir(n, 'ana', COL.x - 0.5, chao(COL.x - 1, COL.z), COL.z + 0.5, { vel: 7 });
      n.passo();
      por(n, COL.x, chao(COL.x, COL.z), COL.z);
      expect(recusas(n)).toEqual([]);
      // e na célula do corpo dela, não
      por(n, COL.x - 1, chao(COL.x - 1, COL.z), COL.z);
      expect(recusas(n)).toHaveLength(1);
    });

    it('a metade de cima da porta não prende quem pula por cima', () => {
      const n = abrir(modo);
      const y = chao(COL.x, COL.z);
      ir(n, 'bia', COL.x + 0.5, y + 1.2, COL.z + 0.5, { noChao: false });
      n.passo();
      mandar(n, 'ana', {
        t: 'colocar',
        x: COL.x,
        y,
        z: COL.z,
        bloco: Bloco.PORTA,
        meta: 0,
        slot: 0,
        extras: [{ x: COL.x, y: y + 1, z: COL.z }],
      });
      expect(recusas(n)).toHaveLength(1);
      expect([bloco(n, COL.x, y, COL.z), bloco(n, COL.x, y + 1, COL.z)]).toEqual([
        Bloco.AR,
        Bloco.AR,
      ]);
    });

    it('o lote do criativo pula o amigo e o bicho (e corrige a tela); o corpo de quem manda, não', () => {
      const n = abrir(modo);
      const y = chao(COL.x, COL.z);
      const zb = COL.z + 3;
      ir(n, 'bia', COL.x + 0.5, chao(COL.x, zb), zb + 0.5);
      n.estado.populacao.adicionar('coelho', COL.x + 0.5, chao(COL.x, COL.z + 5), COL.z + 5.5);
      n.passo();
      n.quadros();
      const lote = [
        { x: COL.x, y, z: COL.z, v: Bloco.TABUAS },
        { x: COL.x, y: chao(COL.x, zb), z: zb, v: Bloco.TABUAS },
        { x: COL.x, y: chao(COL.x, COL.z + 5), z: COL.z + 5, v: Bloco.TABUAS },
        // a célula dos pés da Ana: quem manda o lote é quem decide (ferramenta e ganchos de teste)
        { x: X, y: Y, z: Z, v: Bloco.TABUAS },
      ];
      const i = mandar(n, 'ana', { t: 'editar', lote });
      n.passo();
      const q = n.quadros().get('ana')!;
      expect(bloco(n, COL.x, y, COL.z)).toBe(Bloco.TABUAS);
      expect(bloco(n, COL.x, chao(COL.x, zb), zb)).toBe(Bloco.AR);
      expect(bloco(n, COL.x, chao(COL.x, COL.z + 5), COL.z + 5)).toBe(Bloco.AR);
      expect(bloco(n, X, Y, Z)).toBe(Bloco.TABUAS);
      const recusa = q.eventos?.find((e) => e.e === 'recusa');
      expect(recusa).toMatchObject({ comando: i, motivo: 'editar' });
      // a tela da Ana volta nas duas células recusadas
      for (const z of [zb, COL.z + 5])
        expect(q.blocos?.some((b) => b.x === COL.x && b.z === z && b.v === Bloco.AR)).toBe(true);
    });
  });

for (const modo of ['local', 'nuvem'] as const)
  describe(`fechar a porta e a porteira (${modo}, T02)`, () => {
    /** Uma porta aberta posta no chão do lado (e as duas metades, abertas). */
    function portaAberta(n: Nucleo, bloco: number = Bloco.PORTA) {
      const y = chao(COL.x, COL.z);
      const extras = bloco === Bloco.PORTA ? [{ x: COL.x, y: y + 1, z: COL.z }] : undefined;
      mandar(n, 'ana', { t: 'colocar', x: COL.x, y, z: COL.z, bloco, meta: 0, slot: 0, extras });
      mandar(n, 'ana', { t: 'usar', x: COL.x, y, z: COL.z });
      expect(recusas(n)).toEqual([]);
      return y;
    }

    it('fecha com a passagem livre; com um amigo ou um bicho na passagem, fica aberta', () => {
      const n = abrir(modo);
      const y = portaAberta(n);
      expect(bloco(n, COL.x, y, COL.z)).toBe(Bloco.PORTA_ABERTA);
      // a Bia parada na passagem
      ir(n, 'bia', COL.x + 0.5, y, COL.z + 0.5);
      n.passo();
      const i = mandar(n, 'ana', { t: 'usar', x: COL.x, y: y + 1, z: COL.z });
      expect(recusas(n).find((e) => e.comando === i)).toMatchObject({ motivo: 'usar' });
      expect([bloco(n, COL.x, y, COL.z), bloco(n, COL.x, y + 1, COL.z)]).toEqual([
        Bloco.PORTA_ABERTA,
        Bloco.PORTA_ABERTA,
      ]);
      // ela sai; um coelho entra na passagem
      ir(n, 'bia', COL.x + 0.5, chao(COL.x, COL.z + 6), COL.z + 6.5);
      const coelho = n.estado.populacao.adicionar('coelho', COL.x + 0.5, y, COL.z + 0.5);
      mandar(n, 'ana', { t: 'usar', x: COL.x, y, z: COL.z });
      expect(recusas(n)).toHaveLength(1);
      expect(bloco(n, COL.x, y, COL.z)).toBe(Bloco.PORTA_ABERTA);
      // o coelho sai: fecha
      coelho.x += 5;
      mandar(n, 'ana', { t: 'usar', x: COL.x, y, z: COL.z });
      expect(recusas(n)).toEqual([]);
      expect([bloco(n, COL.x, y, COL.z), bloco(n, COL.x, y + 1, COL.z)]).toEqual([
        Bloco.PORTA,
        Bloco.PORTA,
      ]);
      // e abrir nunca é recusado (abre em cima de quem estiver ali)
      ir(n, 'bia', COL.x + 0.5, y, COL.z + 0.5);
      n.passo();
      mandar(n, 'ana', { t: 'usar', x: COL.x, y, z: COL.z });
      expect(recusas(n)).toEqual([]);
      expect(bloco(n, COL.x, y, COL.z)).toBe(Bloco.PORTA_ABERTA);
    });

    it('a porteira do curral também: o bicho na passagem a deixa aberta', () => {
      const n = abrir(modo);
      const y = portaAberta(n, Bloco.PORTEIRA);
      expect(bloco(n, COL.x, y, COL.z)).toBe(Bloco.PORTEIRA_ABERTA);
      n.estado.populacao.adicionar('cervo', COL.x + 0.5, y, COL.z + 0.5);
      mandar(n, 'ana', { t: 'usar', x: COL.x, y, z: COL.z });
      expect(recusas(n)).toHaveLength(1);
      expect(bloco(n, COL.x, y, COL.z)).toBe(Bloco.PORTEIRA_ABERTA);
    });
  });

describe('quem entra num lugar já construído (nuvem)', () => {
  it('quem chega pela primeira vez no nascimento construído nasce em cima da construção', () => {
    const n = abrir('nuvem');
    // o nascimento de quem chega pela primeira vez (o da Ana, que chegou assim)
    const s = n.estado.jogadores.get('ana')!.spawn;
    const nx = Math.floor(s.x);
    const nz = Math.floor(s.z);
    const ny = chao(nx, nz);
    // a Ana constrói uma torre de 3 no nascimento (pelo lote, que não confere o corpo dela)
    mandar(n, 'ana', {
      t: 'editar',
      lote: [0, 1, 2].map((d) => ({ x: nx, y: ny + d, z: nz, v: Bloco.TABUAS })),
    });
    n.passo();
    n.conectar('caio', { perfil: { apelido: 'Caio', aparencia: {} } });
    const t = n.estado.jogadores.get('caio')!.tel;
    expect(t.y).toBe(ny + 3);
    expect(t.olhos).toBeCloseTo(ny + 3 + 1.62, 6);
  });

  it('quem volta para onde construíram enquanto estava fora sai em cima; no lugar livre, igual', () => {
    const n = abrir('nuvem');
    const x = COL.x;
    const z = COL.z + 6;
    const y = chao(x, z);
    ir(n, 'bia', x + 0.5, y, z + 0.5);
    n.passo();
    const d = n.desconectar('bia')!;
    n.conectar('bia', { salvo: d, perfil: { apelido: 'Bia', aparencia: {} } });
    expect(n.estado.jogadores.get('bia')!.tel.y).toBe(y);
    const d2 = n.desconectar('bia')!;
    ir(n, 'ana', x + 0.5, y, z - 1.5);
    mandar(n, 'ana', {
      t: 'editar',
      lote: [0, 1].map((dy) => ({ x, y: y + dy, z, v: Bloco.TABUAS })),
    });
    n.passo();
    expect(bloco(n, x, y + 1, z)).toBe(Bloco.TABUAS);
    n.conectar('bia', { salvo: d2, perfil: { apelido: 'Bia', aparencia: {} } });
    const t = n.estado.jogadores.get('bia')!.tel;
    expect(t.x).toBeCloseTo(x + 0.5, 6);
    expect(t.y).toBe(y + 2);
  });
});
