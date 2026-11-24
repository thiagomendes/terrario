import { describe, expect, it } from 'vitest';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Scene } from '@babylonjs/core/scene';
import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import { criarBoneco } from '../../src/render/boneco';
import { normalizarAparencia } from '../../src/personagem/aparencia';
import '../../src/temas/todos';

/**
 * Spec 036 (desempenho, depois da T08): quantas malhas (cada uma, uma chamada de desenho) cada
 * tesouro novo soma ao boneco do jogo. As peças do mesmo nó e do mesmo material vão numa malha
 * só: presas ao corpo, no brilho do corpo; num nó próprio, uma malha por nó. O teto de cada um é
 * o mínimo que ele pede: um nó que gira ou bate, a luz própria e a película transparente.
 */
const TETO: Array<[string, Record<string, string>, number]> = [
  ['boné de hélice', { chapeu: 'bone-helice' }, 1], // a hélice
  ['pijama de nuvem', { roupa: 'pijama-nuvem' }, 0],
  ['asas de borboleta', { costas: 'asas-borboleta' }, 2], // uma por asa
  ['mochila-foguete', { costas: 'mochila-foguete' }, 1], // a chaminha (luz)
  ['varinha de bolhas', { mao: 'varinha-bolhas' }, 1], // a película de sabão (transparente)
  ['guarda-chuva', { mao: 'guarda-chuva-gotinhas' }, 1], // o nó que fica em pé
  ['pipa de lacinhos', { mao: 'pipa-lacinhos' }, 2], // a pipa e o rabo
  ['passarinho de ombro', { bicho: 'passarinho-ombro' }, 2], // o passarinho e as asinhas
];

const malhas = (scene: Scene, premium: Record<string, string>, corpo: 'feminino' | 'masculino') => {
  const b = criarBoneco(scene, normalizarAparencia({ corpo, premium }), 'b', undefined, true, true);
  const n = (b.raiz.getChildMeshes() as Mesh[]).length;
  b.descartar();
  return n;
};

describe('036: as malhas que cada tesouro novo soma ao boneco', () => {
  for (const corpo of ['feminino', 'masculino'] as const)
    it.each(TETO)(`${corpo}: %s soma no máximo o mínimo que pede`, (_nome, premium, teto) => {
      const scene = new Scene(new NullEngine());
      const base = malhas(scene, {}, corpo);
      expect(malhas(scene, premium, corpo) - base).toBeLessThanOrEqual(teto);
      scene.dispose();
    });
});
