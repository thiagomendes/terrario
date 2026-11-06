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
  /** Estações: 0..1 de outono (folhas alaranjadas) e de inverno (neve nos topos). */
  outono = 0;
  inverno = 0;
  /** Superfícies molhadas pela chuva (mais escuras e brilhantes). */
  molhado = 0;
  /** Força do vento nas folhas (0 desliga; só no material sólido). */
  ventoFolhas = 0;
  tempoMundo = 0;

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
        { name: 'outono', size: 1, type: 'float' },
        { name: 'inverno', size: 1, type: 'float' },
        { name: 'molhado', size: 1, type: 'float' },
        { name: 'ventoFolhas', size: 1, type: 'float' },
        { name: 'tempoMundo', size: 1, type: 'float' },
      ],
      vertex: 'uniform float ventoFolhas;\nuniform float tempoMundo;',
      fragment:
        'uniform vec3 corBruma;\nuniform float forcaBruma;\nuniform float luzBlocos;\nuniform float outono;\nuniform float inverno;\nuniform float molhado;',
    };
  }

  override bindForSubMesh(uniformBuffer: {
    updateFloat(nome: string, valor: number): void;
    updateFloat3(nome: string, x: number, y: number, z: number): void;
  }): void {
    uniformBuffer.updateFloat3('corBruma', ...this.corBruma);
    uniformBuffer.updateFloat('forcaBruma', this.forcaBruma);
    uniformBuffer.updateFloat('luzBlocos', this.luzBlocos);
    uniformBuffer.updateFloat('outono', this.outono);
    uniformBuffer.updateFloat('inverno', this.inverno);
    uniformBuffer.updateFloat('molhado', this.molhado);
    uniformBuffer.updateFloat('ventoFolhas', this.ventoFolhas);
    uniformBuffer.updateFloat('tempoMundo', this.tempoMundo);
  }

  override getCustomCode(shaderType: string): Record<string, string> | null {
    if (shaderType === 'vertex') {
      return {
        CUSTOM_VERTEX_DEFINITIONS:
          'attribute vec2 luz;\nvarying vec2 vLuzMundo;\nvarying vec3 vBlocoMundo;',
        // posição sem o balanço do vento: tom por bloco e neve não "nadam" com as folhas
        CUSTOM_VERTEX_MAIN_END:
          'vLuzMundo = luz;\nvBlocoMundo = (finalWorld * vec4(position, 1.0)).xyz;',
        CUSTOM_VERTEX_UPDATE_POSITION: `
          #ifdef VERTEXCOLOR
          if (ventoFolhas > 0.0 && color.a < 0.99) {
            // fase pela posicao no mundo: folhas de chunks vizinhos balancam juntas
            vec3 pmV = (world * vec4(position, 1.0)).xyz;
            float fase = tempoMundo * 1.3 + pmV.x * 0.45 + pmV.y * 0.3 + pmV.z * 0.37;
            positionUpdated.x += sin(fase) * 0.045 * ventoFolhas;
            positionUpdated.z += cos(fase * 1.21) * 0.04 * ventoFolhas;
            positionUpdated.y += sin(fase * 0.7) * 0.015 * ventoFolhas;
          }
          #endif
        `,
      };
    }
    if (shaderType !== 'fragment') return null;
    return {
      CUSTOM_FRAGMENT_DEFINITIONS: `
        varying vec2 vLuzMundo;
        varying vec3 vBlocoMundo;
        float hashMundo(vec3 p) {
          return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453);
        }
      `,
      CUSTOM_FRAGMENT_UPDATE_DIFFUSE: `
        {
          vec3 blocoM = floor(vBlocoMundo - normalize(vNormalW) * 0.02);
          float hM = hashMundo(blocoM);
          baseColor.rgb *= 0.94 + 0.1 * hM;
          float bioma = sin(vPositionW.x * 0.031 + sin(vPositionW.z * 0.017) * 2.0) * 0.5 + 0.5;
          baseColor.rgb *= mix(vec3(0.97, 1.0, 1.02), vec3(1.05, 1.02, 0.92), bioma);
          // estacoes: o verde vira ocre no outono; neve cobre os topos no inverno
          float verdeM = baseColor.g - max(baseColor.r, baseColor.b);
          if (verdeM > 0.03 && outono > 0.0) {
            float lumM = dot(baseColor.rgb, vec3(0.3, 0.59, 0.11));
            vec3 ocre = mix(vec3(0.85, 0.42, 0.12), vec3(0.95, 0.7, 0.2), hM) * (lumM * 1.6);
            baseColor.rgb = mix(baseColor.rgb, ocre, outono * smoothstep(0.03, 0.12, verdeM) * (0.4 + 0.45 * hM));
          }
          float topoM = step(0.6, normalize(vNormalW).y);
          // neve e chao molhado so a ceu aberto (nao sob teto nem em caverna)
          float aberto = smoothstep(0.9, 1.0, clamp(vLuzMundo.x, 0.0, 1.0));
          if (inverno > 0.0 && topoM > 0.0 && aberto > 0.0) {
            float salpico = step(0.25, fract(sin(dot(floor(vBlocoMundo.xz * 16.0), vec2(12.99, 78.23))) * 437.5));
            baseColor.rgb = mix(baseColor.rgb, vec3(0.92, 0.95, 1.0), inverno * aberto * mix(0.75, 1.0, salpico));
          }
          baseColor.rgb *= 1.0 - molhado * 0.18 * aberto;
        }
      `,
      CUSTOM_FRAGMENT_BEFORE_FOG: `
        {
          // ceu escurece cavernas; luz de blocos (tochas) aquece
          float ceuL = clamp(vLuzMundo.x, 0.0, 1.0);
          float blocoL = clamp(vLuzMundo.y, 0.0, 1.0);
          float fCeu = pow(0.8, (1.0 - ceuL) * 15.0);
          float fBloco = blocoL > 0.001 ? pow(0.86, (1.0 - blocoL) * 15.0) * smoothstep(0.15, 0.55, blocoL) : 0.0;
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
