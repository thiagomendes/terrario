import { describe, expect, it } from 'vitest';
import { criarNucleo, INTERVALO_APARENCIA, type Nucleo } from '../../src/nucleo/nucleo';
import { PASSO } from '../../src/nucleo/protocolo';
import { sanear, sanearAparencia } from '../../src/nucleo/saneamento';
import {
  aplicarCorpo,
  aparenciaPadrao,
  desbloquear,
  semDesbloqueios,
  vestirFantasia,
} from '../../src/personagem/aparencia';

/**
 * Auditoria 017: o editor manda a aparência a cada toque. A igual à de agora não sai para
 * ninguém; fora isso, no máximo uma a cada `INTERVALO_APARENCIA` por jogador, e a última que
 * chegou dentro da janela entra quando ela fecha (o visual final sempre chega). Nos dois modos.
 */
const PASSOS_JANELA = Math.round(INTERVALO_APARENCIA / PASSO);

type Modo = 'local' | 'nuvem';

function montar(modo: Modo): { n: Nucleo; quem: string; ve: string } {
  if (modo === 'local') {
    const n = criarNucleo({
      semente: 7,
      modo: 'criativo',
      versaoMundo: 2,
      confiarNoCliente: true,
    });
    n.conectar('local');
    n.passo();
    n.quadros();
    return { n, quem: 'local', ve: 'local' };
  }
  const n = criarNucleo({ semente: 7, modo: 'criativo', versaoMundo: 2, confiarNoCliente: false });
  n.conectar('ana', { perfil: { apelido: 'Ana', aparencia: {} } });
  n.conectar('bia', { perfil: { apelido: 'Bia', aparencia: {} } });
  n.passo();
  n.quadros();
  return { n, quem: 'ana', ve: 'bia' };
}

/** Um passo do núcleo: a aparência de `quem` nos perfis que `ve` recebeu (undefined: sem perfis). */
function passo(n: Nucleo, quem: string, ve: string): Record<string, unknown> | undefined {
  n.passo();
  return n.quadros().get(ve)?.perfis?.[quem]?.aparencia;
}

describe.each<Modo>(['local', 'nuvem'])('aparência no núcleo (%s)', (modo) => {
  it('a primeira mudança sai na hora', () => {
    const { n, quem, ve } = montar(modo);
    n.comando(quem, { t: 'aparencia', aparencia: { modelo: 'andarilho', pele: 2 } });
    expect(passo(n, quem, ve)?.pele).toBe(2);
  });

  it('a igual à de agora não manda os perfis de novo', () => {
    const { n, quem, ve } = montar(modo);
    n.comando(quem, { t: 'aparencia', aparencia: { modelo: 'andarilho', pele: 2 } });
    expect(passo(n, quem, ve)).toBeDefined();
    for (let i = 0; i < PASSOS_JANELA + 2; i++) passo(n, quem, ve);
    // a mesma, com as chaves em outra ordem: nada sai
    n.comando(quem, { t: 'aparencia', aparencia: { pele: 2, modelo: 'andarilho' } });
    for (let i = 0; i < PASSOS_JANELA + 2; i++) expect(passo(n, quem, ve)).toBeUndefined();
  });

  it('toques seguidos: no máximo uma por janela, e a última sempre chega', () => {
    const { n, quem, ve } = montar(modo);
    const saidas: number[] = [];
    // 10 toques por segundo durante 2 segundos (pele 1, 2, 3...)
    let ultima = 0;
    for (let i = 0; i < 2 / PASSO; i++) {
      if (i % 2 === 0) {
        ultima = (ultima % 5) + 1;
        n.comando(quem, { t: 'aparencia', aparencia: { modelo: 'andarilho', pele: ultima } });
      }
      const a = passo(n, quem, ve);
      if (a) saidas.push(i);
    }
    // depois de parar, a última entra quando a janela fecha
    let final: Record<string, unknown> | undefined;
    for (let i = 0; i < PASSOS_JANELA + 2; i++) final = passo(n, quem, ve) ?? final;
    expect(final?.pele ?? lerPele(n, quem)).toBe(ultima);
    // 20 toques em 2 s viraram no máximo 2 por segundo (mais a primeira); entre duas saídas,
    // a janela inteira (menos um passo: a da hora sai no quadro seguinte ao comando)
    expect(saidas.length).toBeLessThanOrEqual(2 / INTERVALO_APARENCIA + 1);
    for (let k = 1; k < saidas.length; k++)
      expect((saidas[k] - saidas[k - 1]) * PASSO).toBeGreaterThanOrEqual(
        INTERVALO_APARENCIA - PASSO - 1e-9,
      );
  });

  it('voltar à de agora dentro da janela cancela a que esperava', () => {
    const { n, quem, ve } = montar(modo);
    n.comando(quem, { t: 'aparencia', aparencia: { modelo: 'andarilho', pele: 4 } });
    expect(passo(n, quem, ve)?.pele).toBe(4);
    n.comando(quem, { t: 'aparencia', aparencia: { modelo: 'andarilho', pele: 3 } });
    n.comando(quem, { t: 'aparencia', aparencia: { modelo: 'andarilho', pele: 4 } });
    for (let i = 0; i < PASSOS_JANELA * 3; i++) expect(passo(n, quem, ve)).toBeUndefined();
  });
});

/** A aparência que o núcleo guarda (os perfis vão quando alguém entra de novo). */
function lerPele(n: Nucleo, quem: string): unknown {
  n.reiniciarQuadros(quem);
  n.passo();
  return [...n.quadros().values()][0]?.perfis?.[quem]?.aparencia?.pele;
}

describe('spec 014: o capacete e o colete do canteiro passam no saneamento e no limite', () => {
  // a criança que ganhou as duas e veste o colete (o capacete vem junto)
  const vestida = (corpo: 'feminino' | 'masculino') =>
    vestirFantasia(
      desbloquear(
        desbloquear(
          { ...aplicarCorpo(aparenciaPadrao('ferreiro'), corpo), nome: 'Ana Beatriz Luz' },
          'capacete-obra',
        ),
        'colete-obra',
      ),
      'colete-obra',
      3,
    );

  it.each(['feminino', 'masculino'] as const)('com as duas peças (%s)', (corpo) => {
    const a = semDesbloqueios(vestida(corpo));
    const json = JSON.stringify(a);
    // cabe com folga no limite de 4096 caracteres
    expect(json.length).toBeLessThan(1024);
    const limpa = sanearAparencia(JSON.parse(json));
    expect(limpa).not.toBeNull();
    expect(limpa!.fantasia).toEqual({ id: 'colete-obra', cor: 3 });
    const cmd = sanear({ t: 'aparencia', aparencia: JSON.parse(json) });
    expect(cmd).not.toBeNull();
    // e sem o capacete (peça opcional do colete) também
    const semCapacete = { ...a, fantasia: { id: 'colete-obra', cor: 0, sem: ['capacete-obra'] } };
    expect(sanearAparencia(semCapacete)!.fantasia).toEqual({
      id: 'colete-obra',
      cor: 0,
      sem: ['capacete-obra'],
    });
  });

  it.each<Modo>(['local', 'nuvem'])('os amigos veem o colete (%s)', (modo) => {
    const { n, quem, ve } = montar(modo);
    n.comando(quem, {
      t: 'aparencia',
      aparencia: semDesbloqueios(vestida('feminino')) as Record<string, unknown>,
    });
    const visto = passo(n, quem, ve);
    expect(visto?.fantasia).toEqual({ id: 'colete-obra', cor: 3 });
  });
});

describe.each<Modo>(['local', 'nuvem'])('spec 036 (T04): montar e descer muito seguidos (%s)', (modo) => {
  const aPe = { modelo: 'andarilho', premium: { andar: 'bicicletinha' } };
  const montada = { ...aPe, montado: true };
  /** A aparência que os amigos têm de `quem` depois de a janela fechar. */
  function final(n: Nucleo, quem: string, ve: string): Record<string, unknown> | undefined {
    let a: Record<string, unknown> | undefined;
    for (let i = 0; i < PASSOS_JANELA * 2 + 2; i++) a = passo(n, quem, ve) ?? a;
    return a;
  }

  it('montou e desceu dentro da janela: fica a pé (a última)', () => {
    const { n, quem, ve } = montar(modo);
    n.comando(quem, { t: 'aparencia', aparencia: aPe });
    expect(passo(n, quem, ve)?.montado).toBeUndefined();
    n.comando(quem, { t: 'aparencia', aparencia: montada });
    n.comando(quem, { t: 'aparencia', aparencia: aPe });
    // a de agora já é a pé: nada sai
    for (let i = 0; i < PASSOS_JANELA * 2; i++) expect(passo(n, quem, ve)).toBeUndefined();
  });

  it('montou, desceu e montou de novo: fica montada (a última), uma saída só', () => {
    const { n, quem, ve } = montar(modo);
    n.comando(quem, { t: 'aparencia', aparencia: aPe });
    passo(n, quem, ve);
    let saidas = 0;
    for (const [i, a] of [montada, aPe, montada, aPe, montada].entries()) {
      n.comando(quem, { t: 'aparencia', aparencia: a });
      if (passo(n, quem, ve)) saidas++;
      void i;
    }
    expect(saidas).toBeLessThanOrEqual(1);
    const visto = final(n, quem, ve) ?? lerAparencia(n, quem);
    expect(visto?.montado).toBe(true);
    expect((visto?.premium as Record<string, unknown>)?.andar).toBe('bicicletinha');
  });
});

/** A aparência inteira que o núcleo guarda de `quem`. */
function lerAparencia(n: Nucleo, quem: string): Record<string, unknown> | undefined {
  n.reiniciarQuadros(quem);
  n.passo();
  return [...n.quadros().values()][0]?.perfis?.[quem]?.aparencia;
}
