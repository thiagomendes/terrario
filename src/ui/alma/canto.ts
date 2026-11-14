/**
 * Spec 031: o canto das missões no aparelho (Era dos Dinos e Doce Reino). O núcleo decide tudo
 * (os ovinhos, os bichos do pasto, as rochas de osso, o bolo); aqui fica o que a criança vê e
 * toca: o ninho de gravetos.
 */
import type { Scene } from '@babylonjs/core/scene';
import type { EstadoDepuracao } from '../../render/cena';
import type { GuiaMissao } from '../../render/guiaMissao';
import type { AlmaUi } from './index';
import { criarNinho } from '../../render/ninhoCanto';
import { missaoFixada } from './hud';

export function ligarCantoMissoes(
  e: EstadoDepuracao,
  ui: AlmaUi,
  _guia: GuiaMissao,
  scene: Scene,
): void {
  const p = e.canto?.();
  if (!p) return;
  if (p.ninho) criarNinho(scene, p.ninho[0], p.ninho[1], p.ninho[2]);
  // os fantasmas do bolo aceitam o toque de quem tem a missão do bolo no selinho
  scene.onBeforeRenderObservable.add(() => {
    e.boloLiberado = missaoFixada(ui.vista())?.m.id === 'e1';
  });
}
