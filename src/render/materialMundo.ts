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
  /**
   * Blocos recém-quebrados (até 8: x, y, z e 1 se vale): somem no mesmo quadro do clique, no
   * próprio desenho, enquanto a malha nova do chunk não chega (spec 012, D1).
   */
  readonly ocultos = new Float32Array(32);
  /** Piso da luz do céu (debaixo d'água de brinquedo nunca fica escuro). */
  pisoCeu = 0;
  /**
   * Spec 026 (Vila Neon): quanto o verde apaga de noite (0 = nada, o de sempre nos outros
   * temas). O gramado ficava verde aceso no escuro; com isto ele vira um roxo-escuro e os
   * feixes do palco pousam num chão escuro de verdade.
   */
  verdeNoite = 0;
  /**
   * Spec 026 (parte 3): a Casa anos 80 por dentro. `casaDentro` é a caixa de dentro da casa no
   * chão (x0, z0, x1, z1, mundo): ali a luz do dia entra como lá fora (o telhado é de blocos e
   * escureceria a sala) e, de noite, o abajur deixa a sala morna. `casaCorte` é a caixa do
   * telhado (com o beiral) e `casaY` = (o chão, a altura do primeiro bloco do telhado, quanto do
   * corte já valeu de 0 a 1, a noite de 0 a 1): com a criança lá dentro, o telhado some aos
   * pedacinhos no desenho (a câmera olha a casa de cima, como uma casinha de bonecas).
   */
  readonly casaDentro = new Float32Array([1e9, 1e9, -1e9, -1e9]);
  readonly casaCorte = new Float32Array([1e9, 1e9, -1e9, -1e9]);
  readonly casaY = new Float32Array([1e9, -1e9, 0, 0]);
  /**
   * As paredes da casa que somem entre a câmera e a criança (até 5: as quatro de fora e a do
   * meio), cada uma uma caixa no chão (x0, z0, x1, z1), e quanto cada uma já sumiu (0 a 1). A
   * fileira de pedra de baixo fica (a planta da casa continua desenhada no chão).
   */
  readonly casaParede = new Float32Array(20).fill(0);
  readonly casaParedeK = new Float32Array(8);

  /** Desenha as juntas entre blocos (quina macia e um friso), só no material sólido. */
  private readonly juntas: boolean;

  /** Material de plantas: o dono do vértice é a célula onde ele está (sem normal de face). */
  private readonly plantas: boolean;

  constructor(material: Material, opcoes: { juntas?: boolean; plantas?: boolean } = {}) {
    super(material, 'Mundo', 210, { MUNDO: false, MUNDO_JUNTAS: false, MUNDO_PLANTAS: false });
    this.juntas = !!opcoes.juntas;
    this.plantas = !!opcoes.plantas;
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
    defines['MUNDO_JUNTAS'] = this.juntas;
    defines['MUNDO_PLANTAS'] = this.plantas;
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
        { name: 'pisoCeu', size: 1, type: 'float' },
        { name: 'verdeNoite', size: 1, type: 'float' },
        { name: 'blocosOcultos', size: 4, type: 'vec4', arraySize: 8 },
        { name: 'casaDentro', size: 4, type: 'vec4' },
        { name: 'casaCorte', size: 4, type: 'vec4' },
        { name: 'casaY', size: 4, type: 'vec4' },
        { name: 'casaParede', size: 4, type: 'vec4', arraySize: 5 },
        { name: 'casaParedeK', size: 4, type: 'vec4', arraySize: 2 },
      ],
      vertex:
        'uniform float ventoFolhas;\nuniform float tempoMundo;\nuniform vec4 blocosOcultos[8];',
      fragment:
        'uniform float pisoCeu;\nuniform float verdeNoite;\nuniform vec3 corBruma;\nuniform float forcaBruma;\nuniform float luzBlocos;\nuniform float outono;\nuniform float inverno;\nuniform float molhado;\nuniform vec4 casaDentro;\nuniform vec4 casaY;\nuniform vec4 casaCorte;\nuniform vec4 casaParede[5];\nuniform vec4 casaParedeK[2];',
    };
  }

  override bindForSubMesh(uniformBuffer: {
    updateFloat(nome: string, valor: number): void;
    updateFloatArray(nome: string, valores: Float32Array): void;
    updateFloat3(nome: string, x: number, y: number, z: number): void;
    updateFloat4(nome: string, x: number, y: number, z: number, w: number): void;
  }): void {
    uniformBuffer.updateFloat3('corBruma', ...this.corBruma);
    uniformBuffer.updateFloat('forcaBruma', this.forcaBruma);
    uniformBuffer.updateFloat('luzBlocos', this.luzBlocos);
    uniformBuffer.updateFloat('outono', this.outono);
    uniformBuffer.updateFloat('inverno', this.inverno);
    uniformBuffer.updateFloat('molhado', this.molhado);
    uniformBuffer.updateFloat('ventoFolhas', this.ventoFolhas);
    uniformBuffer.updateFloat('tempoMundo', this.tempoMundo);
    uniformBuffer.updateFloat('pisoCeu', this.pisoCeu);
    uniformBuffer.updateFloat('verdeNoite', this.verdeNoite);
    uniformBuffer.updateFloatArray('blocosOcultos', this.ocultos);
    uniformBuffer.updateFloat4(
      'casaDentro',
      this.casaDentro[0],
      this.casaDentro[1],
      this.casaDentro[2],
      this.casaDentro[3],
    );
    uniformBuffer.updateFloat4(
      'casaCorte',
      this.casaCorte[0],
      this.casaCorte[1],
      this.casaCorte[2],
      this.casaCorte[3],
    );
    uniformBuffer.updateFloat4('casaY', this.casaY[0], this.casaY[1], this.casaY[2], this.casaY[3]);
    uniformBuffer.updateFloatArray('casaParede', this.casaParede);
    uniformBuffer.updateFloatArray('casaParedeK', this.casaParedeK);
  }

  override getCustomCode(shaderType: string): Record<string, string> | null {
    if (shaderType === 'vertex') {
      return {
        CUSTOM_VERTEX_DEFINITIONS:
          'attribute vec2 luz;\nvarying vec2 vLuzMundo;\nvarying vec3 vBlocoMundo;\nvarying float vFolhaMundo;\nvarying float vPortaMundo;',
        // posição sem o balanço do vento: tom por bloco e neve não "nadam" com as folhas
        CUSTOM_VERTEX_MAIN_END:
          // porta de dois blocos (spec 013): alfa 0,996 na metade de cima, 0,993 na de baixo
          'vLuzMundo = luz;\nvBlocoMundo = (finalWorld * vec4(position, 1.0)).xyz;\nvFolhaMundo = 0.0;\nvPortaMundo = 0.0;\n#ifdef VERTEXCOLOR\nvFolhaMundo = color.a < 0.99 ? 1.0 : 0.0;\nif (color.a > 0.99 && color.a < 0.999) vPortaMundo = color.a > 0.9945 ? 1.0 : -1.0;\n#endif',
        CUSTOM_VERTEX_UPDATE_POSITION: `
          {
            // bloco recém-quebrado: todos os vértices dele vão para o centro do próprio bloco (some
            // na hora). Antes iam para a origem do chunk (altura 0): um triângulo com só parte dos
            // vértices do bloco (copa arredondada, vento) virava um risco até o chão.
            vec3 pmO = (world * vec4(position, 1.0)).xyz;
            #ifdef MUNDO_PLANTAS
            vec3 donoO = floor(pmO + vec3(0.0, 0.02, 0.0));
            #else
            vec3 donoO = floor(pmO - normal * 0.45);
            #endif
            for (int iO = 0; iO < 8; iO++) {
              vec4 bO = blocosOcultos[iO];
              if (bO.w > 0.5 && all(equal(donoO, bO.xyz))) positionUpdated = position + (bO.xyz + vec3(0.5) - pmO);
            }
          }
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
        varying float vFolhaMundo;
        varying float vPortaMundo;
        float hashMundo(vec3 p) {
          return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453);
        }
      `,
      CUSTOM_FRAGMENT_UPDATE_DIFFUSE: `
        {
          // spec 026 (parte 3): a Casa anos 80 com a criança lá dentro: o telhado (com as
          // empenas) e as paredes entre a câmera e a criança somem aos pedacinhos (o corte vai de
          // 0 a 1); a fileira de pedra de baixo fica. É aqui, por ponto da tela, e não nos
          // vértices: o vértice na divisa de dois blocos é dos dois, e encolher os blocos
          // entortava a parede em rampa.
          vec3 dC = floor(vBlocoMundo - normalize(vNormalW) * 0.45);
          if (dC.y >= casaY.x + 1.02 && dC.x >= casaCorte.x && dC.x < casaCorte.z && dC.z >= casaCorte.y
              && dC.z < casaCorte.w) {
            float hC = hashMundo(floor(vBlocoMundo * 6.0)) * 0.98 + 0.01;
            float kC = dC.y >= casaY.y ? casaY.z : 0.0;
            if (dC.y < casaY.y) {
              vec4 kA = casaParedeK[0];
              for (int iC = 0; iC < 5; iC++) {
                // (sem índice variável no vec4: no ANGLE isso nem sempre vale)
                float kP = iC == 0 ? kA.x : iC == 1 ? kA.y : iC == 2 ? kA.z : iC == 3 ? kA.w : casaParedeK[1].x;
                vec4 cP = casaParede[iC];
                if (dC.x >= cP.x && dC.x < cP.z && dC.z >= cP.y && dC.z < cP.w) kC = max(kC, kP);
              }
            }
            if (kC > hC) discard;
          }
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
      // juntas aparentes (spec 012): onde dois blocos se encostam a face é reta na malha;
      // aqui a beirada de cada bloco ganha a quina macia (a normal tomba para fora, como
      // nas quinas à mostra) e um friso fino mais escuro, e o bloco vira peça de montar
      CUSTOM_FRAGMENT_BEFORE_LIGHTS: `
        #ifdef MUNDO_JUNTAS
        {
          vec3 nJ = normalize(vNormalW);
          vec3 aJ = abs(nJ);
          float retoJ = smoothstep(0.985, 0.999, max(max(aJ.x, aJ.y), aJ.z));
          // copas de blocos de folha: juntas também, como peças de montar (a pedido do dono)
          if (retoJ > 0.0) {
            vec3 t1J = vec3(1.0, 0.0, 0.0);
            vec3 t2J = vec3(0.0, 0.0, 1.0);
            if (aJ.x > 0.5) { t1J = vec3(0.0, 0.0, 1.0); t2J = vec3(0.0, 1.0, 0.0); }
            else if (aJ.z > 0.5) { t2J = vec3(0.0, 1.0, 0.0); }
            vec2 fJ = vec2(fract(dot(vBlocoMundo, t1J)), fract(dot(vBlocoMundo, t2J)));
            vec2 eJ = min(fJ, 1.0 - fJ);
            vec2 sJ = sign(fJ - 0.5);
            // porta de dois blocos: sem junta onde as metades se encostam (uma peça só)
            if (vPortaMundo != 0.0 && aJ.y < 0.5 && sJ.y * vPortaMundo < 0.0) eJ.y = 0.5;
            vec2 kJ = 1.0 - smoothstep(vec2(0.0), vec2(0.17), eJ);
            kJ *= kJ;
            normalW = normalize(normalW + (t1J * sJ.x * kJ.x + t2J * sJ.y * kJ.y) * 1.6 * retoJ);
            float frisoJ = 1.0 - smoothstep(0.004, 0.03, min(eJ.x, eJ.y));
            baseColor.rgb *= 1.0 - 0.4 * frisoJ * retoJ;
          }
        }
        #endif
      `,
      CUSTOM_FRAGMENT_BEFORE_FOG: `
        {
          // ceu escurece cavernas; luz de blocos (tochas) aquece
          float ceuL = clamp(vLuzMundo.x, 0.0, 1.0);
          float blocoL = clamp(vLuzMundo.y, 0.0, 1.0);
          float fCeu = max(pow(0.8, (1.0 - ceuL) * 15.0), pisoCeu);
          // spec 026 (parte 3): dentro da Casa anos 80 a luz do dia entra como lá fora
          vec3 bcC = vBlocoMundo;
          float naCasa = step(casaDentro.x, bcC.x) * step(bcC.x, casaDentro.z) * step(casaDentro.y, bcC.z)
            * step(bcC.z, casaDentro.w) * step(casaY.x, bcC.y) * step(bcC.y, casaY.y);
          fCeu = mix(fCeu, max(fCeu, 0.9), naCasa);
          float fBloco = blocoL > 0.001 ? pow(0.86, (1.0 - blocoL) * 15.0) * smoothstep(0.15, 0.55, blocoL) : 0.0;
          vec3 corTocha = vec3(1.0, 0.72, 0.42) * fBloco * 2.4 * luzBlocos;
          color.rgb = color.rgb * fCeu + baseColor.rgb * corTocha * (1.0 - fCeu * 0.6) + baseColor.rgb * 0.03;
          // e de noite o abajur deixa a sala morna (nunca o escuro da rua)
          color.rgb += baseColor.rgb * vec3(1.0, 0.8, 0.58) * 0.42 * casaY.w * naCasa;
          // spec 026: de noite o verde apaga (o gramado vira roxo-escuro); onde a lâmpada bate
          // ele fica um pouco, e o neon (claro) não muda
          if (verdeNoite > 0.0) {
            // (o tom vem da cor do bloco, não da já escurecida: no escuro a diferença some)
            float verdeV = clamp(((baseColor.g - max(baseColor.r, baseColor.b)) / max(baseColor.g, 0.02) - 0.06) * 4.0, 0.0, 1.0);
            verdeV *= 1.0 - smoothstep(0.4, 0.62, color.g);
            float lumV = dot(color.rgb, vec3(0.3, 0.59, 0.11));
            color.rgb = mix(color.rgb, lumV * vec3(0.66, 0.52, 0.98), verdeV * verdeNoite * (1.0 - 0.4 * fBloco));
          }
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
