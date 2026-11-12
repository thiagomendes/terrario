import { describe, expect, it } from 'vitest';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Scene } from '@babylonjs/core/scene';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import { criarBoneco } from '../../src/render/boneco';
import { moradorDeBrinquedo } from '../../src/render/moradorBoneco';
import { generoDoMorador } from '../../src/temas/nomes';
import '../../src/temas/todos';
import { obterTema, temasDisponiveis } from '../../src/temas';
import type { Profissao } from '../../src/world/povoado';

/** Caixa de cada material (em coordenadas do boneco) e o total de vértices. */
function retrato(fundir: boolean, tema: string, prof: Profissao, n: number) {
  const scene = new Scene(new NullEngine());
  const t = obterTema(tema);
  const pov = t.povoado ?? obterTema('bruma-e-luz').povoado!;
  const m = moradorDeBrinquedo(
    pov.moradores[prof],
    n,
    generoDoMorador('p', n, prof),
    pov.acessorios?.[prof],
  );
  const b = criarBoneco(scene, m.aparencia, 'm', m.ajustar, fundir);
  const porMat = new Map<string, { min: Vector3; max: Vector3; v: number }>();
  for (const malha of b.raiz.getChildMeshes() as Mesh[]) {
    const w = malha.computeWorldMatrix(true);
    const nome = (malha.material?.name ?? '-').toLowerCase();
    // spec 014 (T11): no material de cor nos vértices, cada vértice conta na cor dele
    const cores = nome.endsWith('-plastico-cv') ? malha.getVerticesData('color') : null;
    // a caixa dos vértices de verdade (no lugar do boneco parado)
    const pos = malha.getVerticesData('position') ?? [];
    const p = new Vector3();
    for (let i = 0; i < pos.length; i += 3) {
      const k = cores
        ? `m-plastico-${new Color3(cores[(i / 3) * 4], cores[(i / 3) * 4 + 1], cores[(i / 3) * 4 + 2]).toHexString().toLowerCase()}`
        : nome;
      let e = porMat.get(k);
      if (!e)
        porMat.set(
          k,
          (e = {
            min: new Vector3(Infinity, Infinity, Infinity),
            max: new Vector3(-Infinity, -Infinity, -Infinity),
            v: 0,
          }),
        );
      Vector3.TransformCoordinatesFromFloatsToRef(pos[i], pos[i + 1], pos[i + 2], w, p);
      e.min.minimizeInPlace(p);
      e.max.maximizeInPlace(p);
      e.v++;
    }
  }
  const r: Record<string, number[]> = {};
  for (const [k, e] of [...porMat].sort()) r[k] = [e.v, ...e.min.asArray(), ...e.max.asArray()];
  return { r, malhas: b.contarMalhas() };
}

describe('morador com as peças fundidas (desempenho, spec 013)', () => {
  it('tem as mesmas peças no mesmo lugar, com menos malhas, em todo tema', () => {
    let maximo = 0;
    for (const tema of temasDisponiveis())
      for (const prof of ['cozinheiro', 'construtor', 'ferreiro'] as Profissao[])
        for (const n of [0, 1, 2, 3]) {
          const soltas = retrato(false, tema, prof, n);
          const fundidas = retrato(true, tema, prof, n);
          // mesmos materiais, mesmo número de vértices e a mesma caixa dos vértices
          const k = `${tema} ${prof} ${n}`;
          expect(Object.keys(fundidas.r), k).toEqual(Object.keys(soltas.r));
          for (const [mat, [v, ...caixa]] of Object.entries(soltas.r)) {
            expect(fundidas.r[mat][0], `${k} ${mat}`).toBe(v);
            caixa.forEach((c, i) => expect(fundidas.r[mat][i + 1]).toBeCloseTo(c, 4));
          }
          expect(fundidas.malhas).toBeLessThan(soltas.malhas);
          // spec 014 (T11): no máximo 14 malhas por morador (13 com a bolha do capacete da Lua) (eram ~22 antes da cor no vértice)
          expect(fundidas.malhas, k).toBeLessThanOrEqual(14);
          maximo = Math.max(maximo, fundidas.malhas);
        }
    console.log(`malhas por morador fundido: no máximo ${maximo}`);
  });
});
