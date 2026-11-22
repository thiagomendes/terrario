import { describe, expect, it } from 'vitest';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Scene } from '@babylonjs/core/scene';
import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import { criarBoneco } from '../../src/render/boneco';
import { normalizarAparencia } from '../../src/personagem/aparencia';
import { planoBoneco } from '../../src/personagem/boneco';
import { GOMOS_GOTA } from '../../src/personagem/bonecoPeludo';
import '../../src/temas/todos';

/**
 * Spec 027 (T22, desempenho): o boneco de longe dos moradores (as mesmas peças com menos gomos,
 * nos mesmos ossos) e o pelo de tufos com poucos gomos. O monstrinho peludo é o pior caso: o
 * Bento, de perto, passava de 190 mil triângulos.
 */
const triangulos = (ms: Mesh[]) =>
  ms.filter((m) => m.isEnabled(false)).reduce((s, m) => s + (m.getTotalIndices() / 3), 0);

describe('spec 027 (T22): o boneco de longe e o pelo leve', () => {
  const aparencia = normalizarAparencia({ fantasia: { id: 'monstrinho-peludo', cor: 0 } });

  it('as gotas do pelo têm poucos gomos', () => {
    const tufos = planoBoneco(aparencia).pecas.filter((p) => p.nome.startsWith('peludo-tufo'));
    expect(tufos.length).toBeGreaterThan(300);
    for (const p of tufos) expect(GOMOS_GOTA).toContain(p.gomos);
  });

  it('com esqueleto: de longe, as mesmas malhas com menos de 40% dos triângulos, e volta', () => {
    const scene = new Scene(new NullEngine());
    const b = criarBoneco(scene, aparencia, 'm', undefined, true, true, true);
    const malhas = () => b.raiz.getChildMeshes() as Mesh[];
    const perto = triangulos(malhas());
    const nPerto = malhas().filter((m) => m.isEnabled(false)).length;
    expect(b.deLonge?.()).toBe(false);
    expect(b.definirLonge?.(true)).toBe(true);
    expect(b.deLonge?.()).toBe(true);
    const longe = triangulos(malhas());
    expect(longe).toBeGreaterThan(0);
    expect(longe).toBeLessThan(perto * 0.4);
    // a mesma quantidade de malhas acesas (um material por malha, como perto), no mesmo esqueleto
    const acesas = malhas().filter((m) => m.isEnabled(false));
    expect(acesas).toHaveLength(nPerto);
    for (const m of acesas) {
      expect(m.name.endsWith('-fundida-longe')).toBe(true);
      expect(m.skeleton).toBe(malhas().find((q) => q.name.endsWith('-fundida'))!.skeleton);
    }
    // escondido, nada aparece; de volta, só as de perto
    b.definirVisivel(false);
    expect(malhas().filter((m) => m.isEnabled(false))).toHaveLength(0);
    b.definirVisivel(true);
    b.definirLonge?.(false);
    expect(triangulos(malhas())).toBe(perto);
    // trocar de roupa refaz tudo (o de longe sai junto)
    b.aplicarAparencia(normalizarAparencia({}));
    expect(malhas().some((m) => m.name.endsWith('-fundida-longe'))).toBe(false);
    scene.dispose();
  });

  it('sem esqueleto (o boneco da criança) não há boneco de longe', () => {
    const scene = new Scene(new NullEngine());
    const b = criarBoneco(scene, aparencia, 'p', undefined, true, true);
    expect(b.definirLonge?.(true)).toBe(false);
    expect(b.deLonge?.()).toBe(false);
    scene.dispose();
  });
});
