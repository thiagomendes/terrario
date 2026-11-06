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
  /** Intensidade da luz de blocos (mais forte à noite, para contrastar). */
  luzBlocos = 1;

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

  override getAttributes(atributos: string[]): void {
    atributos.push('luz');
  }

  override getUniforms() {
    return {
      ubo: [
        { name: 'corBruma', size: 3, type: 'vec3' },
        { name: 'forcaBruma', size: 1, type: 'float' },
        { name: 'luzBlocos', size: 1, type: 'float' },
      ],
      fragment: 'uniform vec3 corBruma;\nuniform float forcaBruma;\nuniform float luzBlocos;',
    };
  }

  override bindForSubMesh(uniformBuffer: {
    updateFloat(nome: string, valor: number): void;
    updateFloat3(nome: string, x: number, y: number, z: number): void;
  }): void {
    uniformBuffer.updateFloat3('corBruma', ...this.corBruma);
    uniformBuffer.updateFloat('forcaBruma', this.forcaBruma);
    uniformBuffer.updateFloat('luzBlocos', this.luzBlocos);
  }

  override getCustomCode(shaderType: string): Record<string, string> | null {
    if (shaderType === 'vertex') {
      return {
        CUSTOM_VERTEX_DEFINITIONS: 'attribute vec2 luz;\nvarying vec2 vLuzMundo;',
        CUSTOM_VERTEX_MAIN_END: 'vLuzMundo = luz;',
      };
    }
    if (shaderType !== 'fragment') return null;
    return {
      CUSTOM_FRAGMENT_DEFINITIONS: `
        varying vec2 vLuzMundo;
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
          // ceu escurece cavernas; luz de blocos (tochas) aquece
          float ceuL = clamp(vLuzMundo.x, 0.0, 1.0);
          float blocoL = clamp(vLuzMundo.y, 0.0, 1.0);
          float fCeu = pow(0.8, (1.0 - ceuL) * 15.0);
          float fBloco = blocoL > 0.001 ? pow(0.86, (1.0 - blocoL) * 15.0) : 0.0;
          vec3 corTocha = vec3(1.0, 0.72, 0.42) * fBloco * 2.4 * luzBlocos;
          color.rgb = color.rgb * fCeu + baseColor.rgb * corTocha * (1.0 - fCeu * 0.6) + baseColor.rgb * 0.03;
          // bruma rente ao chao nos vales, so onde ha ceu
          float distM = length(vPositionW - vEyePosition.xyz);
          float alturaM = clamp((67.0 - vPositionW.y) / 9.0, 0.0, 1.0);
          float brumaM = alturaM * alturaM * (1.0 - exp(-distM * 0.035)) * forcaBruma * fCeu;
          color.rgb = mix(color.rgb, corBruma, brumaM);
        }
      `,
    };
  }
}
