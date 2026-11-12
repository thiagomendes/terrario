import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  ESCALA_OBRA,
  SINTETIZADOS_OBRA,
  acordeDaCamada,
  humDoPedreiro,
  indiceDaNota,
  plimDaObra,
  taDa,
  type TocadorObra,
} from '../../src/audio/somObra';
import { NIVEL_EXTRAS, ganhoExtra } from '../../src/audio/vozesGravadas';
import type { MotorAudio } from '../../src/audio/motor';

/**
 * Spec 014 (T09): os sons do canteiro gravados no pacote da cidade, com a sintetizada de
 * reserva; o plim toca a escala (a fatia da nota certa), e cada som gravado tem o seu ganho
 * medido na régua.
 */
const INDICE = JSON.parse(readFileSync('public/sons/indice.json', 'utf8')) as {
  temas: Record<string, { obra?: Record<string, unknown[]>; ambiente?: Record<string, unknown[]> }>;
};
const motorMudo = { estado: 'suspenso', mudo: true } as unknown as MotorAudio;

describe('sons do canteiro gravados', () => {
  it('o plim de cada bloco pede a fatia da nota que sobe com a obra', () => {
    const pedidos: [string, number | undefined][] = [];
    const g: TocadorObra = (chave, _v, _r, i) => void pedidos.push([chave, i]);
    for (let k = 1; k <= 23; k++) plimDaObra(motorMudo, k, 23, 1, g);
    expect(pedidos[0]).toEqual(['plim', 0]);
    expect(pedidos[22]).toEqual(['plim', ESCALA_OBRA.length - 1]);
    for (let k = 1; k < pedidos.length; k++)
      expect(pedidos[k][1]!).toBeGreaterThanOrEqual(pedidos[k - 1][1]!);
    expect(indiceDaNota(1, 1)).toBe(0);
  });

  it('cada som pede a sua chave; sem o gravado, a reserva sintetizada toca', () => {
    const chaves: string[] = [];
    let reservas = 0;
    const g: TocadorObra = (chave, _v, reserva) => {
      chaves.push(chave);
      reserva();
      reservas++;
    };
    acordeDaCamada(motorMudo, 1, g);
    taDa(motorMudo, false, 1, g);
    taDa(motorMudo, true, 1, g);
    humDoPedreiro(motorMudo, 1, g);
    expect(chaves).toEqual(['acorde', 'tada', 'tadaGrande', 'hum']);
    expect(reservas).toBe(4);
  });

  it('o pacote da cidade tem todos os sons do canteiro e da rua, com ganho medido', () => {
    const t = INDICE.temas['cidade-grande'];
    expect(t.obra!.plim).toHaveLength(ESCALA_OBRA.length);
    for (const chave of Object.keys(SINTETIZADOS_OBRA)) {
      expect(t.obra![chave]?.length, chave).toBeGreaterThan(0);
      expect(NIVEL_EXTRAS['cidade-grande'][`obra.${chave}`], chave).toBeLessThan(0);
    }
    for (const chave of ['pardal', 'buzininha', 'grilo']) {
      expect(t.ambiente![chave]?.length, chave).toBeGreaterThan(0);
      expect(ganhoExtra('cidade-grande', 'ambiente', chave)).toBeLessThan(1);
    }
    // nenhum outro tema ganhou sons da cidade (só na Cidade Grande)
    for (const [id, x] of Object.entries(INDICE.temas))
      if (id !== 'cidade-grande') expect(x.obra ?? x.ambiente, id).toBeUndefined();
  });
});
