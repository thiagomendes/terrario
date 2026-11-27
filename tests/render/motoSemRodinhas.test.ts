import { describe, expect, it } from 'vitest';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Scene } from '@babylonjs/core/scene';
import { criarBoneco } from '../../src/render/boneco';
import { normalizarAparencia } from '../../src/personagem/aparencia';
import {
  DESCANSO_RECOLHIDO,
  INCLINA_NO_DESCANSO,
  descansoDaMoto,
  estadoAndar,
  vestirBrinquedoAndar,
} from '../../src/personagem/brinquedoAndar';
import '../../src/temas/todos';

/**
 * A motoquinha sem rodinhas de apoio (pedido do filho do dono, 27 nov 2026): as rodinhas e as
 * hastes saem; parada, ela fica em pé no descansinho de ouro escuro, inclinada uns poucos graus
 * para o lado dele (a criança junto); andando, o descanso recolhe e a moto fica reta.
 */
type V3 = [number, number, number];
const girarX = (p: V3, a: number): V3 => [p[0], p[1] * Math.cos(a) - p[2] * Math.sin(a), p[1] * Math.sin(a) + p[2] * Math.cos(a)];
const girarZ = (p: V3, a: number): V3 => [p[0] * Math.cos(a) - p[1] * Math.sin(a), p[0] * Math.sin(a) + p[1] * Math.cos(a), p[2]];

describe('a motoquinha sem rodinhas, com o descansinho', () => {
  const lista: Parameters<typeof vestirBrinquedoAndar>[1] = [];
  vestirBrinquedoAndar('motoquinha-dourada', lista);

  it('as rodinhas e as hastes saem; o descansinho é de ouro escuro, num nó próprio', () => {
    expect(lista.filter((p) => /rodinha/.test(p.nome)).map((p) => p.nome)).toEqual([]);
    const descanso = lista.filter((p) => p.subjunta?.nome === 'andarDescanso');
    expect(descanso.length).toBeGreaterThanOrEqual(2);
    for (const p of descanso) expect(p.cor.toLowerCase()).toBe('#c4871f');
  });

  it('parada, o pé do descanso pisa no chão com a moto inclinada para o lado dele; andando, recolhe e a moto fica reta', () => {
    const pe = lista.find((p) => p.nome === 'andar-moto-descanso-pe')!;
    const pivo = pe.subjunta!.pivo as V3;
    // o fundo do pé, no espaço do descanso, e no do brinquedo com o giro e a inclinação
    const fundo: V3 = [pe.pos[0], pe.pos[1] - pe.tamanho[1] / 2, pe.pos[2]];
    const noChao = (giro: number, inclina: number) => {
      const g = girarX(fundo, giro);
      return girarZ([pivo[0] + g[0], pivo[1] + g[1], pivo[2] + g[2]], inclina);
    };
    const e = estadoAndar();
    const parada = descansoDaMoto(e);
    expect(parada.giro).toBe(0);
    expect(parada.inclina).toBeCloseTo(INCLINA_NO_DESCANSO, 6);
    // uns poucos graus (2 a 5), para o lado do descanso (a esquerda, x negativo)
    expect((parada.inclina * 180) / Math.PI).toBeGreaterThan(2);
    expect((parada.inclina * 180) / Math.PI).toBeLessThan(5);
    expect(pivo[0]).toBeLessThan(0);
    const p = noChao(parada.giro, parada.inclina);
    expect(Math.abs(p[1])).toBeLessThan(0.008);
    // andando: recolhido, longe do chão, e a moto reta
    e.andando = 1;
    const andando = descansoDaMoto(e);
    expect(andando.giro).toBeCloseTo(DESCANSO_RECOLHIDO, 6);
    expect(andando.inclina).toBe(0);
    expect(noChao(andando.giro, andando.inclina)[1]).toBeGreaterThan(0.12);
    // no meio do caminho, sem tranco: tudo anda junto com o "andando" suavizado
    e.andando = 0.5;
    const meio = descansoDaMoto(e);
    expect(meio.giro).toBeCloseTo(DESCANSO_RECOLHIDO / 2, 6);
    expect(meio.inclina).toBeCloseTo(INCLINA_NO_DESCANSO / 2, 6);
  });

  it('o custo: montada, as mesmas malhas de antes (o nó das rodinhas saiu, o do descanso entrou)', () => {
    const scene = new Scene(new NullEngine());
    const acesas = (b: ReturnType<typeof criarBoneco>) => b.raiz.getChildMeshes(false).filter((m) => m.isEnabled());
    const aPe = criarBoneco(scene, normalizarAparencia({}), 'a', undefined, true, true);
    const montada = criarBoneco(scene, normalizarAparencia({ premium: { andar: 'motoquinha-dourada' }, montado: true }), 'm', undefined, true, true);
    const ms = acesas(montada);
    expect(ms.some((m) => m.name.includes('andarRodinha'))).toBe(false);
    expect(ms.filter((m) => m.name.includes('andarDescanso')).length).toBe(1);
    expect(ms.length - acesas(aPe).length).toBeLessThanOrEqual(7);
    scene.dispose();
  });
});
