import { describe, expect, it } from 'vitest';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Scene } from '@babylonjs/core/scene';
import { FreeCamera } from '@babylonjs/core/Cameras/freeCamera';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { criarFloresDaVarinha, tamanhoDaFlor } from '../../src/render/baile/flor';
import { VARINHA } from '../../src/jogo/baile';

/** Spec 027 (T16): a florzinha da varinha nasce num pulinho, fica e some sozinha em ~4 s. */
describe('spec 027 (T16): a florzinha da varinha', () => {
  it('nasce, fica e encolhe até sumir em 4 s', () => {
    expect(VARINHA.flor).toBe(4);
    expect(tamanhoDaFlor(0)).toBe(0);
    expect(tamanhoDaFlor(0.3)).toBeGreaterThan(0.5);
    expect(tamanhoDaFlor(2)).toBe(1);
    expect(tamanhoDaFlor(3.8)).toBeLessThan(0.5);
    expect(tamanhoDaFlor(4)).toBe(0);
  });

  it('nada fica no mundo depois de 4 s (nem a flor, nem as estrelinhas)', () => {
    const scene = new Scene(new NullEngine());
    new FreeCamera('c', new Vector3(0, 0, -5), scene);
    const f = criarFloresDaVarinha(scene);
    const antes = scene.meshes.length;
    f.evento({ e: 'baileFlor', x: 1, y: 70, z: 2 });
    f.evento({ e: 'baileFlor', x: 3, y: 70, z: 2 });
    expect(f.estado().flores).toBe(2);
    expect(scene.meshes.length).toBeGreaterThan(antes);
    for (let t = 0; t < 3.9; t += 0.05) f.atualizar(0.05);
    expect(f.estado().flores).toBe(2);
    for (let t = 0; t < 0.3; t += 0.05) f.atualizar(0.05);
    expect(f.estado()).toEqual({ flores: 0, malhas: 0, tamanhos: [] });
    expect(scene.meshes.length).toBe(antes);
    expect(scene.transformNodes.filter((n) => n.name.startsWith('flor-varinha-')).length).toBe(0);
  });
});
