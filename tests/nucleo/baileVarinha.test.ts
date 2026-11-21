import { afterAll, describe, expect, it } from 'vitest';
import '../../src/temas/todos';
import { obterTema } from '../../src/temas';
import { criarNucleo, type Nucleo } from '../../src/nucleo/nucleo';
import { baileDoMundo, definirEstiloMundo, ESTILO_PADRAO } from '../../src/world/chunk';
import { limparPovoados } from '../../src/world/povoado';
import { sanear } from '../../src/nucleo/saneamento';
import { PASSO, type Comando, type EventoNucleo } from '../../src/nucleo/protocolo';
import { VARINHA } from '../../src/jogo/baile';
import { temVarinha } from '../../src/personagem/fantasias';

/**
 * Spec 027 (T16): a varinha de condão no núcleo. Com a varinha na mão (a fantasia da bruxinha),
 * o toque no chão a até 5 blocos manda a florzinha para todos (o amigo vê); longe, sem a
 * varinha ou rápido demais, nada. Nenhum estado: o mundo não muda. No aparelho e na nuvem.
 */
const BAILE = obterTema('noite-das-fantasias');
const SEMENTE = 1337;
afterAll(() => {
  definirEstiloMundo(ESTILO_PADRAO);
  limparPovoados();
});
const BRUXINHA = { fantasia: { id: 'bruxinha-festa', cor: 0 } };

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
function abrir(confiar: boolean, ana: unknown = BRUXINHA): Nucleo {
  definirEstiloMundo(BAILE.mundo);
  limparPovoados();
  const n = criarNucleo({ semente: SEMENTE, modo: 'criativo', versaoMundo: 2, confiarNoCliente: confiar, depuracao: true, dono: 'ana' });
  n.conectar('ana', { perfil: { apelido: 'ana', aparencia: ana as never } });
  n.conectar('bia', { perfil: { apelido: 'bia', aparencia: {} } });
  return n;
}
function passos(n: Nucleo, k = 1): Map<string, EventoNucleo[]> {
  const r = new Map<string, EventoNucleo[]>();
  for (let i = 0; i < k; i++) {
    n.passo();
    for (const [q, f] of n.quadros()) r.set(q, [...(r.get(q) ?? []), ...(f.eventos ?? [])]);
  }
  return r;
}
const plano = () => baileDoMundo(SEMENTE)!;
function naPraca(n: Nucleo): [number, number, number] {
  const p = plano();
  const pes: [number, number, number] = [p.nascimento.x, p.h + 1, p.nascimento.z];
  for (const q of ['ana', 'bia']) {
    n.estado.jogadores.get(q)!.saltoPermitido = true;
    n.comando(q, tel(pes[0] + (q === 'bia' ? 2 : 0), pes[1], pes[2]));
  }
  passos(n, 2);
  return pes;
}
const varinha = (x: number, y: number, z: number) => ({ t: 'baile', a: 'varinha', x, y, z }) as unknown as Comando;
const flores = (evs: Map<string, EventoNucleo[]>, q: string) => (evs.get(q) ?? []).filter((e) => e.e === 'baileFlor');

describe('spec 027 (T16): a varinha de condão', () => {
  it('o comando passa a limpo; a varinha na mão é a da fantasia (tirada, não vale)', () => {
    expect(sanear({ t: 'baile', a: 'varinha', x: 1.5, y: 70, z: -3.25, lixo: 2 })).toEqual({ t: 'baile', a: 'varinha', x: 1.5, y: 70, z: -3.25 });
    expect(sanear({ t: 'baile', a: 'varinha', x: 'a', y: 70, z: 1 })).toBeNull();
    expect(sanear({ t: 'baile', a: 'varinha', x: Infinity, y: 70, z: 1 })).toBeNull();
    expect(temVarinha(BRUXINHA)).toBe(true);
    expect(temVarinha({ fantasia: { id: 'bruxinha-festa', cor: 0, sem: ['varinha'] } })).toBe(false);
    expect(temVarinha({ fantasia: { id: 'vampirinho-festa', cor: 0 } })).toBe(false);
    expect(temVarinha({})).toBe(false);
  });

  for (const confiar of [true, false])
    it(`perto, a flor vai para todos; longe, rápido demais ou sem varinha, nada (${confiar ? 'aparelho' : 'nuvem'})`, () => {
      const n = abrir(confiar);
      const [x, y, z] = naPraca(n);
      const antes = JSON.stringify(n.estado.baile ? n.estado.baile.lugares() : null);
      n.comando('ana', varinha(x + 3, y, z + 2));
      let evs = passos(n, 1);
      for (const q of ['ana', 'bia'])
        expect(flores(evs, q)).toEqual([{ e: 'baileFlor', quem: 'ana', x: x + 3, y, z: z + 2 }]);
      // rápido demais: a segunda não sai
      n.comando('ana', varinha(x + 1, y, z));
      evs = passos(n, 1);
      expect(flores(evs, 'ana')).toEqual([]);
      passos(n, Math.ceil(VARINHA.espera / PASSO));
      // longe (mais de 5 blocos): nada
      n.comando('ana', varinha(x + 6, y, z));
      evs = passos(n, 1);
      expect(flores(evs, 'bia')).toEqual([]);
      passos(n, Math.ceil(VARINHA.espera / PASSO));
      // a Bia, sem varinha, também não
      n.comando('bia', varinha(x + 2, y, z + 1));
      evs = passos(n, 1);
      expect(flores(evs, 'ana')).toEqual([]);
      // de novo, depois da espera: sai
      n.comando('ana', varinha(x, y, z + 4));
      evs = passos(n, 1);
      expect(flores(evs, 'bia').length).toBe(1);
      // nada fica salvo: o estado do baile é o mesmo (a flor é só evento)
      expect(JSON.stringify(n.estado.baile ? n.estado.baile.lugares() : null)).toBe(antes);
    });

  it('com a varinha tirada da fantasia, nada', () => {
    const n = abrir(true, { fantasia: { id: 'bruxinha-festa', cor: 0, sem: ['varinha'] } });
    const [x, y, z] = naPraca(n);
    n.comando('ana', varinha(x + 2, y, z));
    expect(flores(passos(n, 1), 'bia')).toEqual([]);
  });
});
