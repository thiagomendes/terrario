import { describe, expect, it } from 'vitest';
import { criarNucleo, type Nucleo } from '../../src/nucleo/nucleo';
import { sanear } from '../../src/nucleo/saneamento';
import { encontrarNascimento } from '../../src/world/chunk';
import { Bloco } from '../../src/world/blocks';
import { empacotar } from '../../src/world/edicoes';
import type { Criatura, TipoSer } from '../../src/jogo/criaturas';
import type { Comando, EventoNucleo, Telemetria } from '../../src/nucleo/protocolo';
import { INTERVALO_GESTO_NUCLEO } from '../../src/personagem/gestos';

/**
 * Spec 016, T03 (regra 4): o bicho criado (ou a raposa domada) é de quem criou. Só ele e o
 * dono do mundo chamam com o gesto e levam com a comida; o bicho do amigo fica onde está, e
 * o amigo ainda dá carinho (corações). Numa laje de pedra no alto, cercada (como os testes
 * dos gestos), na nuvem e no aparelho.
 */
const SEMENTE = 1337;
const p0 = encontrarNascimento(SEMENTE);
const X = Math.floor(p0.x);
const Z = Math.floor(p0.z);
const Y = 110;
const R = 22;

function tel(x: number, z: number): Comando {
  return {
    t: 'jogador',
    x,
    y: Y + 1,
    z,
    yaw: 0,
    pitch: 0,
    olhos: Y + 2.62,
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

let ids = 1000;
const id = () => ++ids;

function laje(): ReturnType<Nucleo['salvar']> {
  const n = criarNucleo({
    semente: SEMENTE,
    modo: 'criativo',
    versaoMundo: 2,
    confiarNoCliente: true,
  });
  n.conectar('local');
  n.comando('local', tel(X + 0.5, Z + 0.5));
  const lote = [];
  for (let dx = -R; dx <= R; dx++)
    for (let dz = -R; dz <= R; dz++) {
      lote.push({ x: X + dx, y: Y, z: Z + dz, v: empacotar(Bloco.PEDRA_LISA) });
      if (Math.max(Math.abs(dx), Math.abs(dz)) === R)
        lote.push({ x: X + dx, y: Y + 1, z: Z + dz, v: empacotar(Bloco.CERCA) });
    }
  n.comando('local', { t: 'editar', id: id(), lote });
  return n.salvar();
}
const salvo = laje();

function mandar(n: Nucleo, quem: string, c: unknown): void {
  const s = sanear(c);
  expect(s, JSON.stringify(c)).not.toBeNull();
  n.comando(quem, s!);
}

/** Nuvem: a Ana é a dona; a Bia e o Léo são amigos. Sobrevivência (a comida gasta). */
function nuvem(extras: Record<string, unknown> = {}): Nucleo {
  const n = criarNucleo({
    semente: SEMENTE,
    modo: 'sobrevivencia',
    versaoMundo: 2,
    confiarNoCliente: false,
    depuracao: true,
    dono: 'ana',
    dados: {
      versao: 1,
      edicoes: JSON.parse(JSON.stringify(salvo.edicoes)),
      jogador: null,
      hora: 0.5,
      extras,
    },
  });
  for (const [i, a] of ['Ana', 'Bia', 'Léo'].entries())
    n.conectar(['ana', 'bia', 'leo'][i], { perfil: { apelido: a, aparencia: {} } });
  n.comando('ana', tel(X - 12.5, Z - 12.5));
  n.comando('bia', tel(X + 0.5, Z + 0.5));
  n.comando('leo', tel(X + 3.5, Z + 0.5));
  n.comando('ana', { t: 'depurar', d: { f: 'hora', hora: 0.5 } });
  n.comando('ana', { t: 'depurar', d: { f: 'pausarDia', pausar: true } });
  n.comando('ana', { t: 'depurar', d: { f: 'clima', tipo: 'limpo' } });
  n.passo();
  n.quadros();
  return n;
}

function invocar(n: Nucleo, tipo: TipoSer, dx: number, dz: number): Criatura {
  n.comando('ana', {
    t: 'depurar',
    d: { f: 'invocar', tipo, x: X + dx + 0.5, y: Y + 1, z: Z + dz + 0.5 },
  });
  const l = n.estado.populacao.lista;
  return l[l.length - 1];
}

/** Avança e junta as recusas que cada um recebeu. */
function passos(n: Nucleo, segundos: number, cada?: () => void) {
  const recusas: Record<string, Extract<EventoNucleo, { e: 'recusa' }>[]> = {};
  for (let i = 0; i < Math.round(segundos * 20); i++) {
    cada?.();
    n.passo();
    for (const [quem, q] of n.quadros())
      for (const e of q.eventos ?? []) if (e.e === 'recusa') (recusas[quem] ??= []).push(e);
  }
  return recusas;
}

const inv = (n: Nucleo, q: string) => n.estado.jogadores.get(q)!.inventario;
const gesto = (g: string) => ({ t: 'gesto', id: id(), gesto: g });

/** A Bia cria uma vaca (cervo) dando trigo. */
function vacaDaBia(n: Nucleo, dx = 2, dz = 3): Criatura {
  const vaca = invocar(n, 'cervo', dx, dz);
  inv(n, 'bia').definir(0, { item: 'trigo', qtd: 3 });
  mandar(n, 'bia', { t: 'alimentar', criatura: vaca.id, slot: 0 });
  expect(vaca.criado).toBe(true);
  expect(vaca.dono).toBe('bia');
  return vaca;
}

describe('bicho criado tem dono (nuvem)', () => {
  it('o Léo chama e o bicho da Bia fica; o aviso diz de quem é. A Bia e a dona chamam', () => {
    const n = nuvem();
    const vaca = vacaDaBia(n);
    passos(n, 0.5);
    mandar(n, 'leo', gesto('chamar'));
    expect(vaca.chamado).toBeUndefined();
    const r = passos(n, 0.2);
    expect(r['leo']).toContainEqual({
      e: 'recusa',
      comando: 0,
      motivo: 'chamar',
      protecao: { motivo: 'bicho', dono: 'Bia' },
    });
    // a Bia chama: vem
    mandar(n, 'bia', gesto('chamar'));
    expect(vaca.chamado).toBeDefined();
    passos(n, INTERVALO_GESTO_NUCLEO + 0.5);
    vaca.chamado = undefined;
    // a dona chega perto e chama: vem também
    n.comando('ana', tel(X + 6.5, Z + 6.5));
    passos(n, 0.2);
    mandar(n, 'ana', gesto('chamar'));
    expect(vaca.chamado).toBeDefined();
  });

  it('o Léo dá comida: corações sim, mas a vaca continua morando onde mora', () => {
    const n = nuvem();
    const vaca = vacaDaBia(n);
    const casa = [...vaca.casa!];
    passos(n, 1.2);
    inv(n, 'leo').definir(0, { item: 'trigo', qtd: 3 });
    // longe da casa (empurrada) e alimentada pelo Léo: a casa não muda
    vaca.x += 2;
    mandar(n, 'leo', { t: 'alimentar', criatura: vaca.id, slot: 0 });
    n.passo();
    const q = n.quadros();
    expect(q.get('leo')!.eventos).toContainEqual(
      expect.objectContaining({ e: 'alimentou', id: vaca.id, meu: true, novo: false }),
    );
    expect(q.get('leo')!.eventos).toContainEqual(
      expect.objectContaining({ e: 'recusa', protecao: { motivo: 'bicho', dono: 'Bia' } }),
    );
    expect(vaca.casa).toEqual(casa);
    expect(vaca.dono).toBe('bia');
    // a comida do Léo não gastou (o bicho já era criado)
    expect(inv(n, 'leo').contar('trigo')).toBe(3);
  });

  it('com trigo na mão, o Léo não leva a vaca da Bia; a Bia leva', () => {
    const n = nuvem();
    const vaca = vacaDaBia(n, 0, 6);
    // só o Léo perto, com trigo na mão, andando para longe
    n.comando('bia', tel(X - 15.5, Z + 15.5));
    inv(n, 'leo').definir(0, { item: 'trigo', qtd: 3 });
    const v0 = [vaca.x, vaca.z];
    let lx = X + 0.5;
    passos(n, 6, () => {
      lx = Math.min(lx + 0.1, X + 12.5);
      n.comando('leo', tel(lx, Z + 4.5));
    });
    expect(vaca.estado).not.toBe('seguir');
    // seguiu? então teria ido para perto do Léo (a 2 blocos dele)
    const dLeo = Math.hypot(vaca.x - lx, vaca.z - (Z + 4.5));
    expect(dLeo).toBeGreaterThan(4);
    expect(Math.hypot(vaca.x - v0[0], vaca.z - v0[1])).toBeLessThan(8);
    // a Bia com trigo na mão: segue
    n.comando('leo', tel(X - 15.5, Z - 15.5));
    inv(n, 'leo').definir(0, null);
    inv(n, 'bia').definir(0, { item: 'trigo', qtd: 3 });
    n.comando('bia', tel(vaca.x + 3, vaca.z));
    passos(n, 2);
    expect(vaca.estado).toBe('seguir');
  });

  it('a raposa domada é de quem domou e não acompanha o amigo', () => {
    const n = nuvem();
    const raposa = invocar(n, 'raposa', 1, 4);
    inv(n, 'bia').definir(0, { item: 'frutinhas', qtd: 64 });
    for (let i = 0; i < 40 && !raposa.domada; i++)
      mandar(n, 'bia', { t: 'domar', criatura: raposa.id, slot: 0 });
    expect(raposa.domada).toBe(true);
    expect(raposa.dono).toBe('bia');
    // a Bia e a dona saem; o Léo anda pela laje: a raposa fica onde está
    n.desconectar('bia');
    n.desconectar('ana');
    const r0 = [raposa.x, raposa.z];
    let lx = X + 0.5;
    passos(n, 6, () => {
      lx = Math.min(lx + 0.12, X + 14.5);
      n.comando('leo', tel(lx, Z - 8.5));
    });
    expect(Math.hypot(raposa.x - r0[0], raposa.z - r0[1])).toBeLessThan(3);
    expect(Math.hypot(raposa.x - lx, raposa.z - (Z - 8.5))).toBeGreaterThan(6);
  });

  it('o dono do bicho vai no salvamento e volta ao abrir', () => {
    const n = nuvem();
    const vaca = vacaDaBia(n);
    expect(vaca.dono).toBe('bia');
    const s = n.salvar();
    const criados = (s.extras['criaturas'] as { criados: { dono?: string }[] }).criados;
    expect(criados[0].dono).toBe('bia');
    const m = nuvem(s.extras);
    const de = m.estado.populacao.lista.find((c) => c.criado)!;
    expect(de.dono).toBe('bia');
    // a dona cria uma: fica sem o campo (sem dono é do dono do mundo)
    const outra = invocar(m, 'cervo', -3, -3);
    m.comando('ana', tel(X - 4.5, Z - 3.5));
    inv(m, 'ana').definir(0, { item: 'trigo', qtd: 3 });
    mandar(m, 'ana', { t: 'alimentar', criatura: outra.id, slot: 0 });
    expect(outra.criado).toBe(true);
    expect(outra.dono).toBeUndefined();
    // e a Bia não chama a da dona ("é da Ana")
    m.comando('bia', tel(X - 2.5, Z - 2.5));
    passos(m, 0.3);
    mandar(m, 'bia', gesto('chamar'));
    expect(outra.chamado).toBeUndefined();
  });
});

describe('jogando sozinho, os bichos são da criança', () => {
  it('cria, chama e leva como antes', () => {
    const n = criarNucleo({
      semente: SEMENTE,
      modo: 'sobrevivencia',
      versaoMundo: 2,
      confiarNoCliente: true,
      depuracao: true,
      dono: 'local',
      dados: {
        versao: 1,
        edicoes: JSON.parse(JSON.stringify(salvo.edicoes)),
        jogador: null,
        hora: 0.5,
        extras: {},
      },
    });
    n.conectar('local');
    n.comando('local', tel(X + 0.5, Z + 0.5));
    n.comando('local', {
      t: 'depurar',
      d: { f: 'invocar', tipo: 'cervo', x: X + 3.5, y: Y + 1, z: Z + 3.5 },
    });
    const vaca = n.estado.populacao.lista[n.estado.populacao.lista.length - 1];
    n.estado.jogadores.get('local')!.inventario.definir(0, { item: 'trigo', qtd: 3 });
    n.comando('local', { t: 'alimentar', criatura: vaca.id, slot: 0 });
    expect(vaca.criado).toBe(true);
    expect(vaca.dono).toBeUndefined();
    n.passo();
    n.comando('local', { t: 'gesto', id: id(), gesto: 'chamar' });
    expect(vaca.chamado).toBeDefined();
  });
});
