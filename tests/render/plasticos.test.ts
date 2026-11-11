import { describe, expect, it, vi } from 'vitest';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Scene } from '@babylonjs/core/scene';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import { FreeCamera } from '@babylonjs/core/Cameras/freeCamera';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import {
  criarPlasticos,
  DIFUSA_PLASTICO,
  LUZ_FRENTE,
  PISO_PLASTICO,
} from '../../src/render/formas';

/** Correção da 017: luz do plástico e o congelamento barato dos materiais dos bonecos. */
/**
 * Um quadro: o NullEngine não compila efeitos (nada é desenhado de fato), então o desenho
 * do material é avisado à mão quando a malha está ligada, como o Babylon faz ao desenhar.
 */
function desenhar(scene: Scene, caixa: Mesh) {
  if (caixa.isEnabled()) caixa.material!.onBindObservable.notifyObservers(caixa);
  scene.onAfterRenderObservable.notifyObservers(scene);
}

function cena() {
  const scene = new Scene(new NullEngine());
  new FreeCamera('c', new Vector3(0, 0, -5), scene);
  return scene;
}

describe('plástico dos bonecos', () => {
  it('a frente de frente para o sol não chapa e a borda contra o sol tem sombra', () => {
    const scene = cena();
    const m = criarPlasticos(scene, 't').cor('#f2d6c0');
    const kd = m.diffuseColor.r;
    const ke = m.emissiveColor.r;
    // sol 2 × cos 0,8 + céu 0,5 × ~0,7 (o meio-dia do jogo), o piso e o estúdio de frente
    const cheio = (2 * 0.8 + 0.5 * 0.7) * kd + ke + LUZ_FRENTE * kd;
    // borda de lado, com o sol atrás: só o céu e o piso
    const borda = 0.5 * 0.45 * kd + ke;
    expect(cheio).toBeLessThan(1.4);
    expect(borda / cheio).toBeLessThan(0.35);
    expect(DIFUSA_PLASTICO + PISO_PLASTICO).toBeLessThan(0.6);
    // a luz ambiente da cena (que muda com a hora) não entra: congelado, não seria reenviada
    expect(m.ambientColor.equals(Color3.Black())).toBe(true);
  });

  it('trocar a luz não descongela nem marca a cena; congela só depois de desenhar', () => {
    const scene = cena();
    const mats = criarPlasticos(scene, 't');
    const m = mats.cor('#ff8fc8');
    const caixa = MeshBuilder.CreateBox('b', {}, scene);
    caixa.material = m;
    const sujar = vi.spyOn(m, 'markDirty');
    // escondido (modo foto) desde o começo: não desenha, então não congela
    caixa.setEnabled(false);
    desenhar(scene, caixa);
    expect(m.isFrozen).toBe(false);
    caixa.setEnabled(true);
    desenhar(scene, caixa);
    expect(m.isFrozen).toBe(true);
    const cor = m.diffuseColor.r;
    // a caverna: a luz vai no uniforme do plugin, as cores e o congelamento ficam
    mats.definirLuz(0.5);
    expect(m.isFrozen).toBe(true);
    expect(m.diffuseColor.r).toBe(cor);
    const plugin = m.pluginManager?.getPlugin('Plastico') as unknown as { luz: number };
    expect(plugin.luz).toBe(0.5);
    // meio transparente descongela; voltar ao normal congela de novo depois de desenhar
    mats.definirSoFrente(true);
    expect(m.isFrozen).toBe(false);
    mats.definirSoFrente(false);
    desenhar(scene, caixa);
    expect(m.isFrozen).toBe(true);
    expect(sujar).not.toHaveBeenCalled();
  });

  it('o perfil clássico (ícones) segue com a luz nas cores', () => {
    const scene = cena();
    const mats = criarPlasticos(scene, 'i', { classico: true });
    const m = mats.cor('#ffffff');
    expect(m.diffuseColor.r).toBeCloseTo(0.78, 5);
    mats.definirLuz(0.5);
    expect(m.diffuseColor.r).toBeCloseTo(0.39, 5);
  });
});
