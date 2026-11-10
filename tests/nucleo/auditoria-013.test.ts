import { describe, expect, it } from 'vitest';
import { criarNucleo, type Nucleo } from '../../src/nucleo/nucleo';
import { encontrarNascimento, alturaTerreno } from '../../src/world/chunk';
import { Bloco } from '../../src/world/blocks';
import { sanear } from '../../src/nucleo/saneamento';
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
    expect(n.quadros().get('ana')!.eventos?.some((e) => e.e === 'recusa')).toBe(true);
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
