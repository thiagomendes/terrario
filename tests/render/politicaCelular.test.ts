import { describe, expect, it } from 'vitest';
import {
  ALIVIO_MAX,
  criarPoliticaCelular,
  degrausCelular,
  ESPERA_PIORA,
} from '../../src/render/resolucao';

/** Lê a mesma taxa várias vezes (uma a cada 2 s); devolve o tempo final. */
function ler(p: ReturnType<typeof criarPoliticaCelular>, fps: number, vezes: number, t0: number) {
  let t = t0;
  for (let k = 0; k < vezes; k++) {
    t += 2;
    p.ler(fps, t);
  }
  return t;
}

describe('degraus do celular (correção de 12 nov)', () => {
  it('vai da densidade 2 ao nível 1 e depois tira efeitos, sem passar de 1', () => {
    const d = degrausCelular(0.5, 1);
    expect(d.map((x) => x.escala)).toEqual([0.5, 0.75, 1, 1, 1, 1]);
    expect(d.map((x) => x.alivio)).toEqual([0, 0, 0, 1, 2, ALIVIO_MAX]);
    expect(Math.max(...d.map((x) => x.escala))).toBe(1);
  });

  it('com qualidade baixa (nível mínimo 2) o teto é o da qualidade', () => {
    const d = degrausCelular(2, 2);
    expect(d.every((x) => x.escala === 2)).toBe(true);
  });
});

describe('política do celular', () => {
  it('teto de 30 quadros (pouca energia): nunca fica borrado', () => {
    const p = criarPoliticaCelular(degrausCelular(0.5, 1), 1);
    let t = 0;
    for (let k = 0; k < 300; k++) {
      t += 2;
      p.ler(29.6, t);
      expect(p.degrau.escala).toBeLessThanOrEqual(1);
    }
    // tentou piorar, viu que não ajudava e voltou: a maior parte do tempo no degrau inicial
    expect(p.degrau.escala).toBeLessThanOrEqual(1);
  });

  it('desfaz a piora que não ajuda e espera antes de tentar de novo', () => {
    const p = criarPoliticaCelular(degrausCelular(0.5, 1), 1);
    let t = ler(p, 40, 2, 0);
    expect(p.degrau.escala).toBe(1);
    // a travada e depois os mesmos 40: não ajudou
    t = ler(p, 40, 2, t);
    expect(p.degrau.escala).toBe(0.75);
    // logo depois não tenta de novo
    t = ler(p, 40, 10, t);
    expect(p.degrau.escala).toBe(0.75);
    // passada a espera, tenta de novo (e desfaz de novo)
    let tentou = false;
    for (let k = 0; k < ESPERA_PIORA / 2; k++) {
      t += 2;
      p.ler(40, t);
      if (p.degrau.escala === 1) tentou = true;
    }
    expect(tentou).toBe(true);
    expect(p.degrau.escala).toBe(0.75);
  });

  it('a piora que ajuda fica', () => {
    const p = criarPoliticaCelular(degrausCelular(0.5, 1), 1);
    let t = ler(p, 38, 2, 0);
    expect(p.degrau.escala).toBe(1);
    t = ler(p, 52, 10, t);
    expect(p.degrau).toEqual({ escala: 1, alivio: 0 });
  });

  it('no nível 1 tira efeitos abaixo de 30, se ajudar', () => {
    const p = criarPoliticaCelular(degrausCelular(0.5, 1), 2);
    let t = ler(p, 22, 2, 0);
    expect(p.degrau).toEqual({ escala: 1, alivio: 1 });
    t = ler(p, 27, 1, t);
    t = ler(p, 27, 1, t);
    expect(p.degrau).toEqual({ escala: 1, alivio: 1 });
  });

  it('melhora com 55 quadros (alcançável a 60 Hz) e fica se se sustenta', () => {
    const p = criarPoliticaCelular(degrausCelular(0.5, 1), 2);
    let t = ler(p, 59, 2, 0);
    expect(p.degrau.escala).toBe(0.75);
    // confere por quatro leituras, depois mais duas para o próximo degrau
    t = ler(p, 57, 4, t);
    expect(p.degrau.escala).toBe(0.75);
    t = ler(p, 57, 2, t);
    expect(p.degrau.escala).toBe(0.5);
  });

  it('melhora que não se sustenta volta, e espera cada vez mais (sem vaivém)', () => {
    const p = criarPoliticaCelular(degrausCelular(0.5, 1), 2);
    let trocas = 0;
    let ultimo = p.indice;
    let t = 0;
    // a 1: 58 quadros; a 0,75: 42 (abaixo dos 50 da nitidez extra)
    for (let k = 0; k < 600; k++) {
      t += 2;
      p.ler(p.degrau.escala < 1 ? 42 : 58, t);
      if (p.indice !== ultimo) {
        trocas++;
        ultimo = p.indice;
      }
    }
    // 20 minutos: poucas tentativas (30, 60, 120, 240, 480 s de espera)
    expect(trocas).toBeLessThanOrEqual(14);
    expect(p.degrau.escala).toBe(1);
  });

  it('girar a tela mantém o degrau mais próximo', () => {
    const p = criarPoliticaCelular(degrausCelular(0.5, 1), 4);
    expect(p.trocarDegraus(degrausCelular(0.75, 1))).toEqual({ escala: 1, alivio: 2 });
  });
});

describe('selinho de quadros e nitidez', () => {
  it('mostra quadros, nitidez, tamanho e efeitos', async () => {
    const { textoNitidez } = await import('../../src/ui/interface');
    expect(
      textoNitidez({ fps: 57.6, escalaResolucao: 0.75, alivioEfeitos: 0 }, 3, [520, 1125]),
    ).toBe('58 FPS · nitidez 1,33 de 3 · 520×1125 · efeitos todos');
    expect(textoNitidez({ fps: 29.4, escalaResolucao: 1, alivioEfeitos: 2 }, 3, null)).toBe(
      '29 FPS · nitidez 1 de 3 · efeitos −2',
    );
  });
});
