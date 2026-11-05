import { MaterialPluginBase } from '@babylonjs/core/Materials/materialPluginBase';
import type { Material } from '@babylonjs/core/Materials/material';

/** Plugin do material de plantas: balanço por tempo aplicado no vértice. */
export class PluginBalanco extends MaterialPluginBase {
  private tempo = 0;

  constructor(material: Material) {
    super(material, 'Balanco', 200, { BALANCO: false });
    this._enable(true);
  }

  override getClassName(): string {
    return 'PluginBalanco';
  }

  override isCompatible(): boolean {
    return true;
  }

  override prepareDefines(defines: Record<string, unknown>): void {
    defines['BALANCO'] = true;
  }

  atualizar(segundos: number): void {
    this.tempo = segundos;
  }

  override getUniforms() {
    return {
      ubo: [{ name: 'tempoBalanco', size: 1, type: 'float' }],
      vertex: 'uniform float tempoBalanco;',
    };
  }

  override bindForSubMesh(uniformBuffer: { updateFloat(nome: string, valor: number): void }): void {
    uniformBuffer.updateFloat('tempoBalanco', this.tempo);
  }

  override getCustomCode(shaderType: string): Record<string, string> | null {
    if (shaderType !== 'vertex') return null;
    return {
      CUSTOM_VERTEX_UPDATE_POSITION: `
        float fase = tempoBalanco * 1.6 + position.x * 0.8 + position.z * 0.6;
        positionUpdated.x += sin(fase) * 0.06;
        positionUpdated.z += cos(fase * 0.9) * 0.05;
      `,
    };
  }
}
