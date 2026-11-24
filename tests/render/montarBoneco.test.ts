import { describe, expect, it } from 'vitest';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Scene } from '@babylonjs/core/scene';
import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import { criarBoneco } from '../../src/render/boneco';
import { normalizarAparencia } from '../../src/personagem/aparencia';
import '../../src/temas/todos';

/**
 * Spec 036 (T04): montar e descer não refazem o boneco. O brinquedo de andar é montado uma vez
 * (quando vestido), escondido; o `definirMontado` só acende o nó dele e troca a pose: as malhas
 * são as mesmas, antes e depois.
 */
const acesas = (ms: Mesh[]) => ms.filter((m) => m.isEnabled());
const doBrinquedo = (ms: Mesh[]) => ms.filter((m) => /andar|brinquedo/.test(m.name) || m.parent?.name.endsWith('-junta-brinquedo'));

describe('spec 036 (T04): montar no boneco', () => {
  it.each([
    ['o boneco do jogo (fundido)', true],
    ['o boneco solto (peça por peça)', false],
  ] as const)('%s: o brinquedo só aparece montada, sem malha nova', (_n, fundir) => {
    const scene = new Scene(new NullEngine());
    const a = normalizarAparencia({ premium: { andar: 'carrinho-pedal' } });
    const b = criarBoneco(scene, a, 'p', undefined, fundir, true);
    const malhas = () => b.raiz.getChildMeshes() as Mesh[];
    const antes = malhas();
    expect(doBrinquedo(antes).length).toBeGreaterThan(0);
    expect(acesas(doBrinquedo(antes))).toHaveLength(0);
    expect(b.montado?.()).toBe(false);
    b.definirMontado?.(true);
    expect(b.montado?.()).toBe(true);
    // as mesmas malhas (nenhuma criada nem jogada fora), agora com o brinquedo aceso
    expect(malhas()).toEqual(antes);
    expect(acesas(doBrinquedo(malhas())).length).toBe(doBrinquedo(antes).length);
    // a pose sobe o corpo para o carrinho e senta
    b.aplicarPose({ tronco: 0, cabeca: 0, bracoDireito: 0, bracoEsquerdo: 0, pernaDireita: 0, pernaEsquerda: 0, tempo: 0 });
    const perna = scene.getTransformNodeByName('p-junta-pernaD');
    expect(perna?.rotation.x).toBeLessThan(-1);
    b.definirMontado?.(false);
    expect(malhas()).toEqual(antes);
    expect(acesas(doBrinquedo(malhas()))).toHaveLength(0);
    scene.dispose();
  });

  it('a aparência que já chega montada mostra o brinquedo; sem brinquedo, montar não faz nada', () => {
    const scene = new Scene(new NullEngine());
    const b = criarBoneco(scene, normalizarAparencia({ premium: { andar: 'nuvem-fofa' }, montado: true }), 'q', undefined, true, true);
    const ms = b.raiz.getChildMeshes() as Mesh[];
    expect(acesas(doBrinquedo(ms)).length).toBeGreaterThan(0);
    const c = criarBoneco(scene, normalizarAparencia({}), 'r', undefined, true, true);
    c.definirMontado?.(true);
    expect(c.montado?.()).toBe(false);
    scene.dispose();
  });
});
