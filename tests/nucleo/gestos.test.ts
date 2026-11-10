import { describe, expect, it } from 'vitest';
import { criarNucleo, type Nucleo } from '../../src/nucleo/nucleo';
import { sanear } from '../../src/nucleo/saneamento';
import { encontrarNascimento } from '../../src/world/chunk';
import { Bloco } from '../../src/world/blocks';
import { empacotar } from '../../src/world/edicoes';
import type { Criatura, TipoSer } from '../../src/jogo/criaturas';
import type { Comando, EventoNucleo, Telemetria } from '../../src/nucleo/protocolo';
import {
  IDS_GESTOS,
  PARA_CHAMADO,
  RAIO_CHAMAR,
  RAIO_RESPOSTA_MORADOR,
  RAIO_VER_GESTO,
} from '../../src/personagem/gestos';

/**
 * Spec 015 (T04): o comando `gesto` no núcleo. Na nuvem (sem confiar no cliente): saneamento,
 * limite de repetição, quem vê, desmaiado não gesticula; o morador perto acena de volta e
 * "chamar" traz a raposa domada e os bichos criados. Numa laje de pedra no alto, cercada.
 */
const SEMENTE = 1337;
const p0 = encontrarNascimento(SEMENTE);
const X = Math.floor(p0.x);
const Z = Math.floor(p0.z);
const Y = 110;
const R = 22;

function tel(x: number, z: number, extra: Partial<Telemetria> = {}): Comando {
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
    ...extra,
  };
}

let ids = 1000;
const id = () => ++ids;

/** Laje de pedra com cerca na borda, feita no criativo e salva como mundo. */
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

/** Nuvem com Ana no meio da laje e Bia a 3 blocos. */
function nuvem(): Nucleo {
  const n = criarNucleo({
    semente: SEMENTE,
    modo: 'sobrevivencia',
    versaoMundo: 2,
    confiarNoCliente: false,
    depuracao: true,
    dados: {
      versao: 1,
      edicoes: JSON.parse(JSON.stringify(salvo.edicoes)),
      jogador: null,
      hora: 0.5,
      extras: {},
    },
  });
  n.conectar('ana', { perfil: { apelido: 'Ana', aparencia: {} } });
  n.conectar('bia', { perfil: { apelido: 'Bia', aparencia: {} } });
  n.comando('ana', tel(X + 0.5, Z + 0.5));
  n.comando('bia', tel(X + 3.5, Z + 0.5));
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

/** Avança e junta os eventos de gesto que cada um recebeu. */
function passos(n: Nucleo, segundos: number, cada?: () => void) {
  const vistos: Record<string, Extract<EventoNucleo, { e: 'gesto' }>[]> = { ana: [], bia: [] };
  for (let i = 0; i < Math.round(segundos * 20); i++) {
    cada?.();
    n.passo();
    for (const [quem, q] of n.quadros())
      for (const e of q.eventos ?? []) if (e.e === 'gesto') (vistos[quem] ??= []).push(e);
  }
  return vistos;
}

const gesto = (g: string): Comando => ({ t: 'gesto', id: id(), gesto: g }) as Comando;

describe('comando gesto: saneamento', () => {
  it('aceita os 8 gestos e recusa o resto', () => {
    for (const g of IDS_GESTOS) expect(sanear({ t: 'gesto', id: 1, gesto: g })).not.toBeNull();
    expect(sanear({ t: 'gesto', id: 1, gesto: 'voar' })).toBeNull();
    expect(sanear({ t: 'gesto', id: 1, gesto: 3 })).toBeNull();
    expect(sanear({ t: 'gesto', id: 1.5, gesto: 'acenar' })).toBeNull();
    expect(sanear({ t: 'gesto', gesto: 'acenar' })).toBeNull();
    expect(sanear({ t: 'gesto', id: 1, gesto: 'acenar'.repeat(1000) })).toBeNull();
  });
});

describe('comando gesto na nuvem', () => {
  it('a amiga perto vê o gesto; quem fez não recebe o dele', () => {
    const n = nuvem();
    n.comando('ana', gesto('dancar'));
    const v = passos(n, 0.1);
    expect(v.bia).toEqual([{ e: 'gesto', gesto: 'dancar', jogador: 'ana' }]);
    expect(v.ana).toEqual([]);
  });

  it('gesto inválido não entra e não gasta a vez', () => {
    const n = nuvem();
    n.comando('ana', gesto('voar'));
    n.comando('ana', { t: 'gesto', id: id(), gesto: { x: 1 } } as unknown as Comando);
    n.comando('ana', gesto('aplaudir'));
    const v = passos(n, 0.1);
    expect(v.bia.map((e) => e.gesto)).toEqual(['aplaudir']);
  });

  it('rajada de gestos: um a cada 0,8 s, o resto some sem aviso', () => {
    const n = nuvem();
    // 20 por segundo durante 3 s (um a cada passo)
    const v = passos(n, 3, () => n.comando('ana', gesto('acenar')));
    expect(v.bia.length).toBe(4);
    expect(v.ana).toEqual([]);
  });

  it('o cliente bem-comportado (1,2 s) nunca perde um gesto, mesmo com a rede juntando envios', () => {
    const n = nuvem();
    // gestos a cada 1,2 s; o segundo atrasa 0,35 s na rede e chega 0,85 s antes do terceiro
    const chegadas = new Set([0, 24 + 7, 48, 72]);
    let passo = 0;
    const v = passos(n, 4, () => {
      if (chegadas.has(passo)) n.comando('ana', gesto('acenar'));
      passo++;
    });
    expect(v.bia.length).toBe(4);
  });

  it('longe não vê; desmaiado não gesticula', () => {
    const n = nuvem();
    n.comando('bia', tel(X + 0.5 + RAIO_VER_GESTO + 2, Z + 0.5));
    n.comando('ana', gesto('comemorar'));
    expect(passos(n, 0.1).bia).toEqual([]);
    n.comando('bia', tel(X + 3.5, Z + 0.5));
    n.comando('ana', { t: 'depurar', d: { f: 'dano', qtd: 100, causa: 'outro' } });
    n.passo();
    expect(n.estado.jogadores.get('ana')!.sobrevivencia.estado.morto).toBe(true);
    n.comando('ana', gesto('comemorar'));
    expect(passos(n, 1.2).bia).toEqual([]);
  });

  it('o morador perto vira e acena de volta (todos veem, um diz "oi"); o longe não', () => {
    const n = nuvem();
    const perto = invocar(n, 'morador', 4, 4);
    const longe = invocar(n, 'morador', RAIO_RESPOSTA_MORADOR + 3, -2);
    n.comando('ana', gesto('acenar'));
    const antes = passos(n, 0.3);
    expect(antes.ana).toEqual([]);
    expect(perto.yawAlvo).toBeCloseTo(Math.atan2(-4, -4), 5);
    const v = passos(n, 0.5);
    const resposta = { e: 'gesto', gesto: 'acenar', criatura: perto.id, voz: true };
    expect(v.ana).toEqual([resposta]);
    expect(v.bia).toEqual([resposta]);
    expect([...v.ana, ...v.bia].some((e) => e.criatura === longe.id)).toBe(false);
  });

  it('cumprimentar também; dançar não faz o morador responder', () => {
    const n = nuvem();
    invocar(n, 'morador', 2, 0);
    n.comando('ana', gesto('dancar'));
    expect(passos(n, 1.2).ana).toEqual([]);
    n.comando('ana', gesto('cumprimentar'));
    expect(passos(n, 1).ana.map((e) => e.gesto)).toEqual(['acenar']);
  });

  it('no máximo 3 moradores respondem ao mesmo aceno', () => {
    const n = nuvem();
    for (let i = 0; i < 6; i++) invocar(n, 'morador', 2 + (i % 3), i < 3 ? 2 : -2);
    n.comando('ana', gesto('acenar'));
    const v = passos(n, 1);
    expect(v.ana.length).toBe(3);
    expect(v.ana.filter((e) => e.voz).length).toBe(1);
  });
});

describe('chamar traz os bichos', () => {
  it('a raposa domada e o bicho criado vêm até perto e depois voltam para a casa de sempre', () => {
    const n = nuvem();
    const raposa = invocar(n, 'raposa', -10, 6);
    raposa.domada = true;
    const vaca = invocar(n, 'cervo', 12, -6);
    vaca.criado = true;
    vaca.casa = [vaca.x, vaca.z];
    const casaAntes = [...vaca.casa];
    const longe = invocar(n, 'cervo', RAIO_CHAMAR + 4, 0);
    longe.criado = true;
    longe.casa = [longe.x, longe.z];
    // um bicho de sempre (não criado) não vem
    const solto = invocar(n, 'coelho', 0, 10);
    // Bia sai de perto (a raposa iria até quem está mais perto)
    n.comando('bia', tel(X - 15.5, Z - 15.5));
    passos(n, 0.5);
    const dVaca0 = Math.hypot(vaca.x - (X + 0.5), vaca.z - (Z + 0.5));
    n.comando('ana', gesto('chamar'));
    passos(n, 8);
    const d = (c: Criatura) => Math.hypot(c.x - (X + 0.5), c.z - (Z + 0.5));
    expect(d(vaca)).toBeLessThan(PARA_CHAMADO + 1);
    expect(d(vaca)).toBeLessThan(dVaca0);
    expect(d(raposa)).toBeLessThan(PARA_CHAMADO + 1.5);
    // chamar não muda a casa de ninguém
    expect(vaca.casa).toEqual(casaAntes);
    // o longe ficou em casa; o solto não veio atrás
    expect(longe.casa![0]).toBeCloseTo(X + RAIO_CHAMAR + 4.5, 1);
    expect(longe.chamado).toBeUndefined();
    expect(solto.chamado).toBeUndefined();
    // o chamado acaba e o criado volta para perto da casa de sempre
    passos(n, 40);
    expect(vaca.chamado).toBeUndefined();
    expect(vaca.casa).toEqual(casaAntes);
    expect(Math.hypot(vaca.x - casaAntes[0], vaca.z - casaAntes[1])).toBeLessThan(8);
  });

  it('o mesmo chamado dá o mesmo resultado (sem sorteio novo)', () => {
    const rodar = () => {
      const n = nuvem();
      const vaca = invocar(n, 'cervo', 9, 5);
      vaca.criado = true;
      vaca.casa = [vaca.x, vaca.z];
      n.comando('ana', gesto('chamar'));
      passos(n, 6);
      return [vaca.x, vaca.z, ...vaca.casa!];
    };
    expect(rodar()).toEqual(rodar());
  });
});
