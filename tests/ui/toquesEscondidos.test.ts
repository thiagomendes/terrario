import { describe, expect, it } from 'vitest';
import {
  contadorDeToques,
  INTERVALO_TOQUES_MS,
  TOQUES_PAINEL_MEDIDA,
} from '../../src/ui/toquesEscondidos';

/** Spec 034 (T01): o gesto escondido que abre o painel de medida da janela. */
describe('toques escondidos', () => {
  it('abre no quinto toque seguido, e não antes', () => {
    const c = contadorDeToques(TOQUES_PAINEL_MEDIDA);
    const r = [0, 200, 400, 600, 800].map((t) => c.tocar(t));
    expect(r).toEqual([false, false, false, false, true]);
  });

  it('uma pausa longa recomeça a contagem', () => {
    const c = contadorDeToques(5);
    for (const t of [0, 200, 400, 600]) expect(c.tocar(t)).toBe(false);
    // o quinto toque veio tarde: vale como o primeiro de uma nova série
    expect(c.tocar(600 + INTERVALO_TOQUES_MS + 1)).toBe(false);
    let t = 600 + INTERVALO_TOQUES_MS + 1;
    for (let i = 0; i < 3; i++) expect(c.tocar((t += 300))).toBe(false);
    expect(c.tocar((t += 300))).toBe(true);
  });

  it('depois de abrir, conta de novo do zero', () => {
    const c = contadorDeToques(5);
    let t = 0;
    for (let i = 0; i < 4; i++) c.tocar((t += 100));
    expect(c.tocar((t += 100))).toBe(true);
    for (let i = 0; i < 4; i++) expect(c.tocar((t += 100))).toBe(false);
    expect(c.tocar((t += 100))).toBe(true);
  });
});
