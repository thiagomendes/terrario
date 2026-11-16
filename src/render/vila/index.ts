/**
 * As peças da Vila Neon na tela (spec 026): tudo o que não é bloco (letreiros, parquinho,
 * carros, fliperama, palco) e os sósias de longe dos marcos.
 *
 * Regra do campo de visão (pedido do dono, 15 nov 2026; a lição dos carrinhos voando da 014):
 * - as peças de um chunk só nascem quando a malha dele está desenhada, e saem com ela; cada
 *   chunk vira poucas malhas (o corpo com a cor nos vértices, as luzes, e um quadro por
 *   letreiro), nascidas no máximo uma por quadro;
 * - os marcos altos (a grade de luzes do palco, a placa do rinque) têm sósia de longe com o
 *   próprio pedaço de chão, que só aparece enquanto nenhum chunk do marco está desenhado.
 *
 * O desenho de cada peça mora em `pecas.ts` e o dos sósias em `sosias.ts`; aqui só a vida das
 * malhas (nascer, sumir, contar).
 */
import type { Scene } from '@babylonjs/core/scene';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { criarPlasticos } from '../formas';
import { Pecas } from '../solidos';
import type { PecaVila, PlanoVila } from '../../world/vilaNeon';
import { desenharPeca, type Desenho, type QuadroDesenhado } from './pecas';
import { criarSosias, type Sosias } from './sosias';
import { criarPaletaLuz } from './luzes';
import { Ref } from './ref';
import { carroVila, picapeVila, vanVila } from './carros';

export interface OpcoesRenderVila {
  /** A malha do chunk está desenhada? */
  temMalha(cx: number, cz: number): boolean;
  /** A malha brilha no glow (neon, lâmpadas). */
  brilha?(m: Mesh): void;
  /** A malha não brilha mas tapa o brilho do que fica atrás. */
  tapaOGlow?(m: Mesh): void;
  /** Uma peça por quadro no celular; no computador, até 2. */
  porQuadro?: number;
}

interface ChunkVivo {
  cx: number;
  cz: number;
  malhas: Mesh[];
  texturas: DynamicTexture[];
}

export interface RenderVila {
  /** Uma vez por quadro: nasce ou some o que mudou, e anima. */
  quadro(t: number, x: number, z: number, noite: number, alto?: number): void;
  /** Peças visíveis em chunk sem malha (teste do campo de visão; sempre 0). */
  semChao(): number;
  /** Quantos chunks e malhas vivos (medida). */
  contagem(): { chunks: number; malhas: number; triangulos: number; sosias: number };
  sosias: Sosias;
  /**
   * Spec 026 (o show de verdade): o neon do palco (o raio da logo, os raios das abas e o arco de
   * lâmpadas), de 0 (apagado, a abertura no escuro) a 1 (aceso, como sempre).
   */
  luzDoPalco(nivel: number): void;
  descartar(): void;
}

/** As peças do neon do palco (a abertura do show apaga e acende só elas). */
const NEON_DO_PALCO = new Set(['raio-palco', 'arco-lampadas']);

const chave = (cx: number, cz: number) => `${cx},${cz}`;
/** A partir daqui (blocos) o carro parado troca para a versão de longe. */
const LONGE_CARRO = 24;
const MUITO_LONGE_CARRO = 36;

/**
 * Os chunks de uma peça. Quase todas cabem no chunk onde pisam; as compridas (o varal de
 * lâmpadas, as bandeirolas, o arco de lâmpadas do palco) entram em todos os que atravessam, e
 * cada chunk desenha só o pedaço dele (`Desenho.recorte`): nada passa por cima de chunk sem
 * malha.
 */
function chunksDaPeca(p: PecaVila): string[] {
  let x0 = p.x;
  let x1 = p.x;
  let z0 = p.z;
  let z1 = p.z;
  if (p.ate) {
    x0 = Math.min(p.x, p.ate[0]);
    x1 = Math.max(p.x, p.ate[0]);
    z0 = Math.min(p.z, p.ate[2]);
    z1 = Math.max(p.z, p.ate[2]);
  } else if (p.tipo === 'arco-lampadas') {
    // o arco abre 7,4 para cada lado, ao longo da parede
    const emX = (p.dir & 1) === 0;
    if (emX) [x0, x1] = [p.x - 7.6, p.x + 7.6];
    else [z0, z1] = [p.z - 7.6, p.z + 7.6];
  } else return [chave(Math.floor(p.x / 16), Math.floor(p.z / 16))];
  const out: string[] = [];
  for (let cx = Math.floor(x0 / 16); cx <= Math.floor(x1 / 16); cx++)
    for (let cz = Math.floor(z0 / 16); cz <= Math.floor(z1 / 16); cz++) out.push(chave(cx, cz));
  return out;
}

export function criarRenderVila(
  scene: Scene,
  plano: PlanoVila,
  opcoes: OpcoesRenderVila,
): RenderVila {
  const pl = criarPlasticos(scene, 'vila');
  const matCorpo = pl.corVertice(0.3) ?? pl.cor('#ffffff', 0.3);
  // as luzes (neon, lâmpadas, telas): acesas, a cor na paleta, sem luz de cena
  const paleta = criarPaletaLuz(scene, 'vila-luz');
  const matLuz = paleta.material;
  // o neon do palco num material só dele (o show apaga e acende a logo na abertura)
  const paletaPalco = criarPaletaLuz(scene, 'vila-luz-palco');
  const matLuzPalco = paletaPalco.material;
  let nivelPalco = 1;
  // o vidro dos carros: azulado, meio transparente, com reflexo (o interior aparece)
  const matVidro = pl.cor('#bfe6f6', 0.75, 0.42);
  /** As luzes da noite (faróis, lanternas) estão acesas? Acendem ao escurecer, como os postes. */
  let acesoDeNoite = false;
  /** As peças agrupadas por chunk (fixas: o plano não muda). */
  const porChunk = new Map<string, PecaVila[]>();
  for (const p of plano.pecas)
    for (const k of chunksDaPeca(p)) {
      const l = porChunk.get(k);
      if (l) l.push(p);
      else porChunk.set(k, [p]);
    }
  const vivos = new Map<string, ChunkVivo>();
  const porQuadro = opcoes.porQuadro ?? 1;

  /** Monta o chunk: o corpo, as luzes e os quadros (letreiros). */
  function montar(cx: number, cz: number, lista: readonly PecaVila[]): ChunkVivo {
    const ox = cx * 16;
    const oz = cz * 16;
    const corpo = new Pecas();
    const luz = new Pecas();
    const luzPalco = new Pecas();
    const noite = new Pecas();
    const vidro = new Pecas();
    const quadros: QuadroDesenhado[] = [];
    const recorte = { x0: ox, z0: oz, x1: ox + 16, z1: oz + 16 };
    // os carros vão em malhas à parte, com a versão de longe (a ~24 blocos troca sozinha)
    const carro = { corpo: new Pecas(), noite: new Pecas(), vidro: new Pecas() };
    const carroLonge = { corpo: new Pecas(), noite: new Pecas(), vidro: new Pecas() };
    const carroMuito = { corpo: new Pecas(), noite: new Pecas(), vidro: new Pecas() };
    for (const p of lista) {
      if (p.tipo === 'carro' || p.tipo === 'van' || p.tipo === 'picape') {
        for (const [alvo, deLonge] of [
          [carro, false],
          [carroLonge, true],
          [carroMuito, 2],
        ] as const) {
          const d: Desenho = { ...alvo, luz, quadros, ox, oz, chao: plano.h + 1, recorte };
          const r = new Ref(d, p);
          if (p.tipo === 'carro') carroVila(r, p.n ?? 0, deLonge);
          else if (p.tipo === 'van') vanVila(r, p.n ?? 0, deLonge);
          else picapeVila(r, p.n ?? 0, deLonge);
        }
        continue;
      }
      const d: Desenho = {
        corpo,
        luz: NEON_DO_PALCO.has(p.tipo) ? luzPalco : luz,
        noite,
        vidro,
        quadros,
        ox,
        oz,
        chao: plano.h + 1,
        recorte,
      };
      desenharPeca(p, d);
    }
    const malhas: Mesh[] = [];
    const texturas: DynamicTexture[] = [];
    const fazer = (pecas: Pecas, nome: string, mat: StandardMaterial) => {
      if (!pecas.partes.length) return null;
      const m = new Mesh(nome, scene);
      const vd = pecas.juntar();
      if (mat === matLuz) paleta.aplicar(vd);
      else if (mat === matLuzPalco) paletaPalco.aplicar(vd);
      vd.applyToMesh(m);
      m.material = mat;
      m.position.set(ox, 0, oz);
      m.isPickable = false;
      m.hasVertexAlpha = false;
      m.freezeWorldMatrix();
      malhas.push(m);
      return m;
    };
    const mc = fazer(corpo, `vila-pecas-${cx},${cz}`, matCorpo);
    if (mc) {
      mc.receiveShadows = true;
      opcoes.tapaOGlow?.(mc);
    }
    const ml = fazer(luz, `vila-luzes-${cx},${cz}`, matLuz);
    if (ml) opcoes.brilha?.(ml);
    const mlp = fazer(luzPalco, `vila-luzes-palco-${cx},${cz}`, matLuzPalco);
    if (mlp) opcoes.brilha?.(mlp);
    // os faróis e as lanternas dos carros: a mesma tinta acesa, só de noite
    const mn = fazer(noite, `vila-farois-${cx},${cz}`, matLuz);
    if (mn) {
      opcoes.brilha?.(mn);
      mn.setEnabled(acesoDeNoite);
    }
    // os vidros dos carros (uma malha meio transparente: o interior aparece)
    const mv = fazer(vidro, `vila-vidros-${cx},${cz}`, matVidro);
    if (mv) opcoes.tapaOGlow?.(mv);
    // os carros de perto e de longe (a de longe só desenha passado o LONGE_CARRO)
    const cc = fazer(carro.corpo, `vila-carros-${cx},${cz}`, matCorpo);
    const cl = fazer(carroLonge.corpo, `vila-carros-longe-${cx},${cz}`, matCorpo);
    const cm = fazer(carroMuito.corpo, `vila-carros-longe2-${cx},${cz}`, matCorpo);
    if (cc && cl && cm) {
      cc.receiveShadows = true;
      for (const m of [cc, cl, cm]) opcoes.tapaOGlow?.(m);
      cc.addLODLevel(LONGE_CARRO, cl);
      cc.addLODLevel(MUITO_LONGE_CARRO, cm);
    }
    const cn = fazer(carro.noite, `vila-farois-carros-${cx},${cz}`, matLuz);
    const cnl = fazer(carroLonge.noite, `vila-farois-longe-${cx},${cz}`, matLuz);
    const cnm = fazer(carroMuito.noite, `vila-farois-longe2-${cx},${cz}`, matLuz);
    if (cn && cnl && cnm) {
      for (const m of [cn, cnl, cnm]) {
        opcoes.brilha?.(m);
        m.setEnabled(acesoDeNoite);
      }
      cn.addLODLevel(LONGE_CARRO, cnl);
      cn.addLODLevel(MUITO_LONGE_CARRO, cnm);
    }
    const cv = fazer(carro.vidro, `vila-vidros-carros-${cx},${cz}`, matVidro);
    if (cv) {
      opcoes.tapaOGlow?.(cv);
      cv.addLODLevel(LONGE_CARRO, null);
    }
    for (const q of quadros) {
      // a textura em potência de 2 (com os níveis de longe: o letreiro não cintila); o desenho
      // é feito no tamanho de sempre e esticado na altura
      let alturaTex = 16;
      while (alturaTex < q.altura) alturaTex *= 2;
      const tex = new DynamicTexture(
        `vila-quadro-${cx},${cz}-${malhas.length}`,
        { width: q.largura, height: alturaTex },
        scene,
        true,
      );
      const g = tex.getContext() as unknown as CanvasRenderingContext2D;
      g.save();
      g.scale(1, alturaTex / q.altura);
      q.pintar(g);
      g.restore();
      tex.update(true);
      tex.wrapU = Texture.CLAMP_ADDRESSMODE;
      tex.wrapV = Texture.CLAMP_ADDRESSMODE;
      const mat = new StandardMaterial(`vila-quadro-mat`, scene);
      mat.specularColor = Color3.Black();
      // (o quadro fica colado numa caixa: o verso nunca aparece)
      mat.backFaceCulling = false;
      if (q.aceso) {
        mat.disableLighting = true;
        mat.emissiveTexture = tex;
        mat.diffuseColor = Color3.Black();
      } else {
        mat.diffuseTexture = tex;
        mat.emissiveColor = new Color3(0.34 * luzAtual, 0.34 * luzAtual, 0.34 * luzAtual);
      }
      const m = new Mesh(`vila-quadro-${cx},${cz}`, scene);
      const vd = new VertexData();
      const w = q.w / 2;
      const h = q.h / 2;
      vd.positions = [-w, -h, 0, w, -h, 0, w, h, 0, -w, h, 0];
      vd.normals = [0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1];
      vd.uvs = [0, 0, 1, 0, 1, 1, 0, 1];
      vd.indices = [0, 1, 2, 0, 2, 3];
      vd.applyToMesh(m);
      m.material = mat;
      m.position.set(ox + q.x, q.y, oz + q.z);
      m.rotation.y = q.giro;
      m.isPickable = false;
      m.freezeWorldMatrix();
      if (q.aceso) opcoes.brilha?.(m);
      else opcoes.tapaOGlow?.(m);
      malhas.push(m);
      texturas.push(tex);
    }
    return { cx, cz, malhas, texturas };
  }

  function soltar(v: ChunkVivo): void {
    for (const m of v.malhas) {
      const mat = m.material;
      m.dispose();
      if (mat && mat !== matCorpo && mat !== matLuz && mat !== matVidro) mat.dispose();
    }
    for (const t of v.texturas) t.dispose();
  }

  const sosias = criarSosias(scene, plano, opcoes);
  let semChao = 0;
  let luzAtual = 1;

  return {
    sosias,
    quadro(t, x, z, noite, alto = 0) {
      // some o que perdeu o chão (sempre, no mesmo quadro: nada fica sem chão embaixo)
      for (const [k, v] of vivos)
        if (!opcoes.temMalha(v.cx, v.cz)) {
          soltar(v);
          vivos.delete(k);
        }
      // nasce o que ganhou chão, primeiro o mais perto (no máximo `porQuadro` por quadro)
      const faltam: [number, string, number, number][] = [];
      for (const k of porChunk.keys()) {
        if (vivos.has(k)) continue;
        const [cx, cz] = k.split(',').map(Number);
        if (!opcoes.temMalha(cx, cz)) continue;
        faltam.push([Math.hypot(cx * 16 + 8 - x, cz * 16 + 8 - z), k, cx, cz]);
      }
      faltam.sort((a, b) => a[0] - b[0]);
      for (const [, k, cx, cz] of faltam.slice(0, porQuadro))
        vivos.set(k, montar(cx, cz, porChunk.get(k)!));
      sosias.quadro(t, x, z, noite, alto);
      // de noite o plástico das peças escurece com o chão (a luz fica com o neon e as lâmpadas)
      const luzPecas = 1 - 0.62 * noite;
      if (Math.abs(luzPecas - luzAtual) > 0.01) {
        luzAtual = luzPecas;
        pl.definirLuz(luzPecas);
        for (const v of vivos.values())
          for (const m of v.malhas) {
            const mat = m.material as StandardMaterial | null;
            if (
              mat &&
              mat !== matCorpo &&
              mat !== matLuz &&
              mat !== matVidro &&
              !mat.disableLighting
            )
              mat.emissiveColor.set(0.34 * luzPecas, 0.34 * luzPecas, 0.34 * luzPecas);
          }
      }
      // os faróis e as lanternas acendem ao escurecer e apagam de manhã (com folga: sem pisca)
      const acender = acesoDeNoite ? noite > 0.3 : noite > 0.42;
      if (acender !== acesoDeNoite) {
        acesoDeNoite = acender;
        for (const v of vivos.values())
          for (const m of v.malhas) if (m.name.startsWith('vila-farois-')) m.setEnabled(acender);
      }
      semChao = 0;
      for (const v of vivos.values())
        if (!opcoes.temMalha(v.cx, v.cz)) semChao += v.malhas.filter((m) => m.isEnabled()).length;
    },
    semChao: () => semChao,
    contagem() {
      let malhas = 0;
      let triangulos = 0;
      const cam = scene.activeCamera;
      for (const v of vivos.values())
        for (const m of v.malhas) {
          // os carros contam pela versão que está desenhando agora (a de perto ou a de longe)
          if (m.name.includes('-longe')) continue;
          const sel = cam && m.hasLODLevels ? m.getLOD(cam) : m;
          if (!sel) continue;
          malhas++;
          triangulos += (sel.getTotalIndices() / 3) | 0;
        }
      return { chunks: vivos.size, malhas, triangulos, sosias: sosias.visiveis() };
    },
    luzDoPalco(nivel: number) {
      const n = Math.max(0, Math.min(1, nivel));
      if (Math.abs(n - nivelPalco) < 0.004) return;
      nivelPalco = n;
      const tex = matLuzPalco.emissiveTexture;
      if (tex) tex.level = n;
    },
    descartar() {
      for (const v of vivos.values()) soltar(v);
      vivos.clear();
      sosias.descartar();
      paleta.descartar();
      paletaPalco.descartar();
      pl.descartar();
    },
  };
}
