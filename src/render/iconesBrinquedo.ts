/**
 * Ícones de brinquedo (spec 012): cada item é desenhado a partir do mesmo modelo 3D que vai
 * na mão (ferramentas, comidas, materiais), os blocos viram pecinhas de cantos redondos com
 * o topo na cor do topo, e as plantas usam as pecinhas do mundo. Uma cena pequena, só dela,
 * desenha poucos ícones por quadro depois que o jogo abre (sem travar) e some no fim.
 */
import { Engine } from '@babylonjs/core/Engines/engine';
import { antesDeSair, liberarEngine } from '../pagina';
import { Scene } from '@babylonjs/core/scene';
import { FreeCamera } from '@babylonjs/core/Cameras/freeCamera';
import { Camera } from '@babylonjs/core/Cameras/camera';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import type { Atlas } from '../art/atlas';
import { TAM_TILE } from '../art/atlas';
import { obterItem, todosItens } from '../jogo/itens';
import { Bloco, obterBloco } from '../world/blocks';
import { caixasDaMalha } from '../world/formas';
import { corMediaDoBloco } from '../fx/cores';
import { plantaDeBrinquedo, PLANTAS_BRINQUEDO, type AlvoPlanta } from '../mesh/plantasBrinquedo';
import { caixaArredondada, criarPlasticos } from './formas';
import { modeloVidro } from './itensBrinquedo';
import { modeloNaMao } from './itensBrinquedo';
import { modeloDeBloco } from './blocosBrinquedo';

const TAM = 96;

const hex = (c: readonly number[]) =>
  `#${c
    .map((v) =>
      Math.round(Math.max(0, Math.min(255, v)))
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`;

/** Cor média de uma face do bloco no atlas do tema. */
function corDaFace(atlas: Atlas, bloco: number, face: 'topo' | 'lado'): number[] | undefined {
  const uv = atlas.uvDaFace(bloco, face);
  if (!uv) return undefined;
  const ox = Math.round(uv.u0 * atlas.largura);
  const oy = Math.round(uv.v0 * atlas.altura);
  // o lado da grama: a cor de baixo (a terra) é a do corpo; o topo vai na tampa
  const y0 = face === 'lado' ? TAM_TILE / 2 : 0;
  let r = 0;
  let g = 0;
  let b = 0;
  let n = 0;
  for (let y = y0; y < TAM_TILE; y++)
    for (let x = 0; x < TAM_TILE; x++) {
      const i = ((oy + y) * atlas.largura + ox + x) * 4;
      if (atlas.pixels[i + 3] < 128) continue;
      r += atlas.pixels[i];
      g += atlas.pixels[i + 1];
      b += atlas.pixels[i + 2];
      n++;
    }
  return n ? [r / n, g / n, b / n] : undefined;
}

/**
 * Gera os ícones de todos os itens; `pronto` recebe cada lote (id → data URL) assim que sai.
 * Devolve uma função que cancela.
 */
export function gerarIconesBrinquedo(
  atlas: Atlas,
  pronto: (lote: Map<string, string>) => void,
): () => void {
  const canvas = document.createElement('canvas');
  canvas.width = TAM;
  canvas.height = TAM;
  let engine: Engine;
  try {
    engine = new Engine(canvas, true, {
      preserveDrawingBuffer: true,
      premultipliedAlpha: false,
      alpha: true,
      stencil: false,
    });
  } catch {
    return () => {};
  }
  const scene = new Scene(engine);
  scene.clearColor = new Color4(0, 0, 0, 0);
  scene.autoClear = true;
  const camera = new FreeCamera('icone-camera', new Vector3(0, 0, -10), scene);
  camera.mode = Camera.ORTHOGRAPHIC_CAMERA;
  camera.setTarget(Vector3.Zero());
  camera.minZ = 0.1;
  camera.maxZ = 40;
  const ceu = new HemisphericLight('icone-ceu', new Vector3(-0.2, 1, -0.4), scene);
  ceu.intensity = 0.55;
  ceu.groundColor = new Color3(0.45, 0.42, 0.5);
  const sol = new DirectionalLight('icone-sol', new Vector3(0.45, -0.8, 0.6), scene);
  sol.intensity = 0.75;
  sol.specular = new Color3(0.6, 0.6, 0.6);
  const mats = criarPlasticos(scene, 'icone', { classico: true });
  const matVertices = new StandardMaterial('icone-vertices', scene);
  matVertices.specularColor = new Color3(0.15, 0.15, 0.15);
  matVertices.emissiveColor = new Color3(0.32, 0.32, 0.32);

  /** Modelo do item, centrado na origem, ou null (fica o ícone de sempre). */
  function montar(id: string): TransformNode | null {
    const def = obterItem(id);
    if (!def) return null;
    const raiz = new TransformNode(`icone-${id}`, scene);
    if (def.bloco === undefined || def.tipo !== 'bloco') {
      const m = modeloNaMao(scene, mats, null, id, `icone-${id}`);
      if (!m) {
        raiz.dispose();
        return null;
      }
      m.no.parent = raiz;
      // ferramentas na diagonal (cabo embaixo à esquerda, cabeça em cima à direita)
      if (m.ferramenta) m.no.rotation.set(0, 0.35, -Math.PI / 4);
      else m.no.rotation.set(-0.55, 0.5, 0);
      return raiz;
    }
    const bloco = def.bloco;
    const b = obterBloco(bloco);
    if (bloco === Bloco.VIDRO) {
      for (const m of modeloVidro(scene, `icone-${id}`, 1)) m.parent = raiz;
      raiz.rotation.set(-0.5, Math.PI / 4, 0);
      return raiz;
    }
    if (b?.forma === 'cama' || b?.forma === 'movel') {
      // a cama do ícone é a mesma da mão (com lençol e travesseiro), maior; spec 039 (T05): os
      // móveis também (o modelo do mundo em miniatura)
      const m = modeloNaMao(scene, mats, bloco, null, `icone-${id}`);
      if (m) {
        m.no.scaling.setAll(4);
        if (bloco === Bloco.CAMA) {
          // a cama, comprida, de lado e vista de cima: ela gira deitada num nó (o comprido de lado,
          // a cabeceira à esquerda) e o conjunto inclina para a câmera. No giro de sempre (inclinar
          // e depois girar) ela tombava no comprido e parecia uma rampa
          const giro = new TransformNode(`icone-${id}-giro`, scene);
          giro.parent = raiz;
          m.no.parent = giro;
          giro.rotation.y = Math.PI / 2 + 0.45;
          raiz.rotation.set(-0.62, 0, 0);
          return raiz;
        }
        m.no.parent = raiz;
        raiz.rotation.set(-0.5, Math.PI / 4, 0);
        return raiz;
      }
    }
    // blocos com modelo próprio (minério, tronco, fornalha, baú...), nas cores do tema
    const proprio = modeloDeBloco(scene, mats, bloco, `icone-${id}`, 1, (bl, face) =>
      corDaFace(atlas, bl, face),
    );
    if (proprio) {
      for (const m of proprio) m.parent = raiz;
      raiz.rotation.set(-0.5, Math.PI / 4, 0);
      // porta e porteira: quase de frente, para ver a janela e a diagonal
      if (bloco === Bloco.PORTEIRA || bloco === Bloco.PORTA) raiz.rotation.set(-0.25, 0.4, 0);
      return raiz;
    }
    if (b?.planta || b?.forma === 'cruz' || b?.forma === 'tocha') {
      if (!PLANTAS_BRINQUEDO.includes(bloco)) {
        raiz.dispose();
        return null;
      }
      const alvo: AlvoPlanta = {
        posicoes: [],
        normais: [],
        uvs: [],
        cores: [],
        luz: [],
        indices: [],
        get vertices() {
          return this.posicoes.length / 3;
        },
      };
      plantaDeBrinquedo(bloco, -0.5, -0.4, -0.5, alvo, [0, 0], [1, 0], () => 0.5, false);
      const malha = new Mesh(`icone-${id}-planta`, scene);
      const dados = new VertexData();
      dados.positions = alvo.posicoes;
      dados.normals = alvo.normais;
      dados.indices = alvo.indices;
      dados.colors = alvo.cores.map((v, i) => (i % 4 === 3 ? 1 : v));
      dados.applyToMesh(malha);
      malha.material = matVertices;
      malha.parent = raiz;
      // maior: a planta inteira cabe no ícone
      raiz.scaling.setAll(1.6);
      raiz.rotation.set(-0.35, 0.6, 0);
      return raiz;
    }
    const lado = corDaFace(atlas, bloco, 'lado') ??
      corMediaDoBloco(bloco, atlas) ?? [170, 170, 180];
    const topo = corDaFace(atlas, bloco, 'topo') ?? lado;
    const caixas = caixasDaMalha(bloco, 0, () => false) ?? [[0, 0, 0, 1, 1, 1]];
    const tampa = Math.hypot(topo[0] - lado[0], topo[1] - lado[1], topo[2] - lado[2]) > 40;
    for (const [i, c] of caixas.entries()) {
      const w = c[3] - c[0];
      const h = c[4] - c[1];
      const d = c[5] - c[2];
      const r = Math.min(0.14, Math.min(w, h, d) * 0.3);
      const cx = (c[0] + c[3]) / 2 - 0.5;
      const cy = (c[1] + c[4]) / 2 - 0.5;
      const cz = (c[2] + c[5]) / 2 - 0.5;
      if (tampa && caixas.length === 1) {
        // grama, neve: corpo na cor do lado e uma tampa na cor do topo
        const corpo = caixaArredondada(
          `icone-${id}-${i}`,
          scene,
          w,
          h * 0.72,
          d,
          r,
          mats.cor(hex(lado)),
          3,
        );
        corpo.position.set(cx, cy - h * 0.14, cz);
        corpo.parent = raiz;
        const cima = caixaArredondada(
          `icone-${id}-${i}-t`,
          scene,
          w * 1.02,
          h * 0.34,
          d * 1.02,
          r,
          mats.cor(hex(topo)),
          3,
        );
        cima.position.set(cx, cy + h * 0.33, cz);
        cima.parent = raiz;
      } else {
        const m = caixaArredondada(`icone-${id}-${i}`, scene, w, h, d, r, mats.cor(hex(lado)), 3);
        m.position.set(cx, cy, cz);
        m.parent = raiz;
      }
    }
    // vista de brinquedo: um pouco de cima, de quina
    raiz.rotation.set(-0.5, Math.PI / 4, 0);
    raiz.rotationQuaternion = null;
    return raiz;
  }

  /** Enquadra o modelo na câmera ortográfica (com folga) e tira a foto. */
  function fotografar(raiz: TransformNode): string {
    raiz.computeWorldMatrix(true);
    for (const m of raiz.getChildMeshes()) m.computeWorldMatrix(true);
    const { min, max } = raiz.getHierarchyBoundingVectors(true);
    const cx = (min.x + max.x) / 2;
    const cy = (min.y + max.y) / 2;
    const meia = Math.max(max.x - min.x, max.y - min.y) / 2 / 0.86;
    camera.position.set(cx, cy, -10);
    camera.setTarget(new Vector3(cx, cy, 0));
    camera.orthoLeft = -meia;
    camera.orthoRight = meia;
    camera.orthoTop = meia;
    camera.orthoBottom = -meia;
    scene.render();
    return canvas.toDataURL('image/png');
  }

  const fila = todosItens().map((d) => d.id);
  let cancelado = false;
  let encerrado = false;
  let quadro = 0;
  /** Modelo montado esperando os shaders ficarem prontos (a 1ª foto sairia vazia). */
  let esperando: { id: string; raiz: TransformNode; tentativas: number } | null = null;
  const passo = () => {
    if (cancelado) return;
    const lote = new Map<string, string>();
    const fim = performance.now() + 6;
    while ((esperando || fila.length) && performance.now() < fim) {
      try {
        if (!esperando) {
          const id = fila.shift()!;
          const raiz = montar(id);
          if (!raiz) continue;
          esperando = { id, raiz, tentativas: 0 };
        }
        const { id, raiz } = esperando;
        const pronta = raiz.getChildMeshes().every((m) => m.isReady(true));
        if (!pronta && esperando.tentativas++ < 120) break; // tenta de novo no próximo quadro
        lote.set(id, fotografar(raiz));
        raiz.dispose(false, false);
        esperando = null;
      } catch {
        // um item que falhe fica com o ícone de sempre
        esperando?.raiz.dispose(false, false);
        esperando = null;
      }
    }
    if (lote.size) pronto(lote);
    if (esperando || fila.length) quadro = requestAnimationFrame(passo);
    else encerrar();
  };
  const encerrar = () => {
    if (encerrado) return;
    encerrado = true;
    cancelado = true;
    soltarAoSair();
    cancelAnimationFrame(quadro);
    mats.descartar();
    scene.dispose();
    liberarEngine(engine);
  };
  // sair da página no meio da geração: solta o contexto junto
  const soltarAoSair = antesDeSair(() => encerrar());
  quadro = requestAnimationFrame(passo);
  return encerrar;
}
