import { lerArrayBuffer, lerBytes, lerTexto } from './arquivos';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CarregadorTrilha, esquecerIndiceTrilha } from '../../src/audio/trilha';
import { criarTrilhaMundo, TROCA_EM_CRUZ_S } from '../../src/audio/trilhaMundo';

class Param {
  value = 1;
  setValueAtTime() {}
  linearRampToValueAtTime() {}
  setTargetAtTime() {}
  cancelScheduledValues() {}
}
class No {
  connect() {}
  disconnect() {}
}
const ctx = {
  currentTime: 0,
  createGain: () => Object.assign(new No(), { gain: new Param() }),
  createBiquadFilter: () => Object.assign(new No(), { frequency: new Param(), Q: new Param() }),
  createDelay: () => Object.assign(new No(), { delayTime: new Param() }),
  createBufferSource: () =>
    Object.assign(new No(), { buffer: null, start() {}, stop() {}, onended: null }),
};

function carregador(falhar = false) {
  const buscar = async (url: string) => {
    if (falhar)
      return {
        ok: false,
        status: 404,
        arrayBuffer: async () => new ArrayBuffer(0),
        json: async () => null,
      };
    const caminho = url.replace(/^\//, 'public/');
    return {
      ok: true,
      arrayBuffer: async () => lerArrayBuffer(caminho),
      json: async () => JSON.parse(lerTexto(caminho)),
    };
  };
  const decodificar = async (bytes: ArrayBuffer) =>
    ({ length: bytes.byteLength, numberOfChannels: 1, duration: 1 }) as unknown as AudioBuffer;
  return new CarregadorTrilha({ buscar, decodificar, base: '/' });
}

function ambiente() {
  const sint: [number, number][] = [];
  return {
    sint,
    saidaTrilha: () => ({ contexto: ctx, destino: new No() }),
    definirSintetizada: (v: number, s: number) => sint.push([v, s]),
  };
}

describe('trilha do mundo', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    esquecerIndiceTrilha();
  });
  afterEach(() => vi.useRealTimers());

  it('sem som ligado, só baixa: nada é aberto', async () => {
    const car = carregador();
    const t = criarTrilhaMundo('rancho-alegre', { carregador: car });
    t.baixar();
    await vi.waitFor(() => expect(t.info().fase).toBe('pronta'));
    expect(t.info().medidas.abertos).toBe(0);
    expect(t.info().medidas.bytesBaixados).toBeGreaterThan(0);
  });

  it('com o som ligado: abre a mistura, entra em cruz com a de hoje e solta ao sair', async () => {
    const car = carregador();
    const amb = ambiente();
    const t = criarTrilhaMundo('bruma-e-luz', { carregador: car });
    t.baixar();
    t.ligar(amb);
    for (let i = 0; i < 40 && !t.info().gravada; i++) {
      await vi.advanceTimersByTimeAsync(200);
    }
    expect(t.info().gravada).toBe(true);
    expect(t.info().fase).toBe('tocando');
    expect(amb.sint).toEqual([[0, TROCA_EM_CRUZ_S]]);
    const abertos = t.info().medidas.ids;
    expect(abertos).toContain('base');
    expect(abertos).not.toContain('perigo');
    t.forcar({ hora: 'noite' });
    expect(t.info().estado.hora).toBe('noite');
    t.soltar();
    expect(t.info().medidas).toMatchObject({ abertos: 0, bytesDecodificados: 0, bytesBaixados: 0 });
    expect(t.info().fase).toBe('solta');
  });

  it('o som ligar antes do mundo ficar pronto não baixa nada (o mundo não espera)', async () => {
    const car = carregador();
    const amb = ambiente();
    const t = criarTrilhaMundo('bruma-e-luz', { carregador: car });
    t.ligar(amb);
    await vi.advanceTimersByTimeAsync(2000);
    expect(t.info().fase).toBe('esperando');
    expect(t.info().medidas.bytesBaixados).toBe(0);
    expect(amb.sint).toEqual([]);
    // o mundo ficou pronto: agora baixa e entra
    t.baixar();
    for (let i = 0; i < 40 && !t.info().gravada; i++) await vi.advanceTimersByTimeAsync(200);
    expect(t.info().gravada).toBe(true);
    t.soltar();
  });

  it('sem o pacote: a de hoje segue, sem erro', async () => {
    const amb = ambiente();
    const t = criarTrilhaMundo('bruma-e-luz', { carregador: carregador(true) });
    t.ligar(amb);
    t.baixar();
    await vi.advanceTimersByTimeAsync(1000);
    expect(t.info().fase).toBe('falhou');
    expect(t.info().gravada).toBe(false);
    expect(amb.sint).toEqual([]);
    t.soltar();
  });

  it('a gravada quebrou ao tocar: volta a de hoje e não tenta remontar a cada passo', async () => {
    const car = carregador();
    let montagens = 0;
    const ctxQuebrado = {
      ...ctx,
      createGain: () => {
        montagens++;
        throw new Error('contexto fechado');
      },
    };
    const sint: [number, number][] = [];
    const amb = {
      saidaTrilha: () => ({ contexto: ctxQuebrado, destino: new No() }),
      definirSintetizada: (v: number, s: number) => sint.push([v, s]),
    };
    const t = criarTrilhaMundo('bruma-e-luz', { carregador: car });
    t.ligar(amb);
    t.baixar();
    for (let i = 0; i < 40 && montagens === 0; i++) await vi.advanceTimersByTimeAsync(200);
    expect(montagens).toBe(1);
    expect(t.info().fase).toBe('falhou');
    expect(sint).toEqual([[1, 2]]);
    await vi.advanceTimersByTimeAsync(3000);
    t.forcar({ hora: 'noite' });
    expect(montagens).toBe(1);
    expect(t.info().gravada).toBe(false);
    t.soltar();
  });

  it('com a música calada não baixa nem toca; ao voltar, baixa e entra', async () => {
    const car = carregador();
    const amb = ambiente();
    const t = criarTrilhaMundo('bruma-e-luz', { carregador: car });
    t.definirAudivel(false);
    t.ligar(amb);
    t.baixar();
    await vi.advanceTimersByTimeAsync(2000);
    expect(t.info()).toMatchObject({ fase: 'esperando', gravada: false, audivel: false });
    expect(t.info().medidas.bytesBaixados).toBe(0);
    t.definirAudivel(true);
    for (let i = 0; i < 40 && !t.info().gravada; i++) await vi.advanceTimersByTimeAsync(200);
    expect(t.info().gravada).toBe(true);
    expect(t.info().medidas.abertos).toBeGreaterThan(0);
    // calou de novo (mudo): para e solta as camadas; o pacote fica para voltar logo
    t.definirAudivel(false);
    expect(t.info()).toMatchObject({ fase: 'pronta', gravada: false });
    expect(t.info().medidas.abertos).toBe(0);
    expect(t.info().medidas.bytesBaixados).toBeGreaterThan(0);
    await vi.advanceTimersByTimeAsync(2000);
    expect(t.info().gravada).toBe(false);
    t.definirAudivel(true);
    for (let i = 0; i < 40 && !t.info().gravada; i++) await vi.advanceTimersByTimeAsync(200);
    expect(t.info().gravada).toBe(true);
    t.soltar();
  });
});
