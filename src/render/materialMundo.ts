import { MaterialPluginBase } from '@babylonjs/core/Materials/materialPluginBase';
import type { Material } from '@babylonjs/core/Materials/material';

/**
 * Plugin dos materiais do mundo: leve variação de tom por bloco (quebra a
 * repetição dos tiles), tom de bioma em baixa frequência e bruma rente ao chão
 * nos vales, que dá nome ao jogo.
 */
export class PluginMundo extends MaterialPluginBase {
  private corBruma: [number, number, number] = [0.8, 0.8, 0.9];
  private forcaBruma = 0.5;

  constructor(material: Material) {
    super(material, 'Mundo', 210, { MUNDO: false });
    this._enable(true);
  }

  override getClassName(): string {
    return 'PluginMundo';
  }

  override isCompatible(): boolean {
    return true;
  }

  override prepareDefines(defines: Record<string, unknown>): void {
    defines['MUNDO'] = true;
  }

  definirBruma(cor: readonly [number, number, number], forca: number): void {
    this.corBruma = [cor[0], cor[1], cor[2]];
    this.forcaBruma = forca;
  }

  override getUniforms() {
    return {
      ubo: [
        { name: 'corBruma', size: 3, type: 'vec3' },
        { name: 'forcaBruma', size: 1, type: 'float' },
      ],
      fragment: 'uniform vec3 corBruma;\nuniform float forcaBruma;',
    };
  }

  override bindForSubMesh(uniformBuffer: {
    updateFloat(nome: string, valor: number): void;
    updateFloat3(nome: string, x: number, y: number, z: number): void;
  }): void {
    uniformBuffer.updateFloat3('corBruma', ...this.corBruma);
    uniformBuffer.updateFloat('forcaBruma', this.forcaBruma);
  }

  override getCustomCode(shaderType: string): Record<string, string> | null {
    if (shaderType !== 'fragment') return null;
    return {
      CUSTOM_FRAGMENT_DEFINITIONS: `
        float hashMundo(vec3 p) {
          return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453);
        }
      `,
      CUSTOM_FRAGMENT_UPDATE_DIFFUSE: `
        {
          vec3 blocoM = floor(vPositionW - normalize(vNormalW) * 0.02);
          float hM = hashMundo(blocoM);
          baseColor.rgb *= 0.94 + 0.1 * hM;
          float bioma = sin(vPositionW.x * 0.031 + sin(vPositionW.z * 0.017) * 2.0) * 0.5 + 0.5;
          baseColor.rgb *= mix(vec3(0.97, 1.0, 1.02), vec3(1.05, 1.02, 0.92), bioma);
        }
      `,
      CUSTOM_FRAGMENT_BEFORE_FOG: `
        {
          float distM = length(vPositionW - vEyePosition.xyz);
          float alturaM = clamp((27.0 - vPositionW.y) / 9.0, 0.0, 1.0);
          float brumaM = alturaM * alturaM * (1.0 - exp(-distM * 0.035)) * forcaBruma;
          color.rgb = mix(color.rgb, corBruma, brumaM);
        }
      `,
    };
  }
}
