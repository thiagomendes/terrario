/**
 * Fotógrafo do boneco de brinquedo (spec 012, A1): o editor de personagem mostra o boneco B de
 * verdade, desenhado do modelo 3D, no palco e em cada miniatura de opção. Uma cena pequena e
 * separada desenha os pedidos em fila, poucos por quadro (trocar uma opção não trava a tela), e
 * copia cada foto direto no canvas pedido.
 */
import { Engine } from '@babylonjs/core/Engines/engine';
import { Scene } from '@babylonjs/core/scene';
import { FreeCamera } from '@babylonjs/core/Cameras/freeCamera';
import { Camera } from '@babylonjs/core/Cameras/camera';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { aparenciaPadrao, type Aparencia } from '../personagem/aparencia';
import { alturaBoneco } from '../personagem/boneco';
import { criarBoneco } from './boneco';
import type { Personagem } from './personagem';

/** Faixa da altura do boneco que cada recorte mostra (0 = pés, 1 = topo da cabeça). */
export type RecorteBoneco = 'corpo' | 'cabeca' | 'tronco' | 'pernas' | 'busto';
/** Largura sobre altura de cada recorte (o canvas ganha esse formato). */
const FORMATO: Record<RecorteBoneco, number> = {
  corpo: 0.72,
  cabeca: 1,
  tronco: 1.15,
  pernas: 0.85,
  busto: 0.9,
};
const FAIXAS: Record<RecorteBoneco, [number, number]> = {
  corpo: [-0.02, 1.04],
  cabeca: [0.5, 1.04],
  tronco: [0.24, 0.72],
  pernas: [-0.02, 0.5],
  busto: [0.24, 1.05],
};

interface Pedido {
  alvo: HTMLCanvasElement;
  aparencia: Aparencia;
  recorte: RecorteBoneco;
  chave: string;
}

let estudio: {
  canvas: HTMLCanvasElement;
  engine: Engine;
  scene: Scene;
  camera: FreeCamera;
  boneco: Personagem;
} | null = null;
let falhou = false;
const fila: Pedido[] = [];
/** O que cada canvas mostra ou vai mostrar (pedido mais novo vence). */
const ultimoPedido = new WeakMap<HTMLCanvasElement, string>();
let andando = false;

function abrirEstudio(): typeof estudio {
  if (estudio || falhou) return estudio;
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 320;
    const engine = new Engine(canvas, true, {
      preserveDrawingBuffer: true,
      premultipliedAlpha: false,
      alpha: true,
      stencil: false,
    });
    const scene = new Scene(engine);
    scene.clearColor = new Color4(0, 0, 0, 0);
    const camera = new FreeCamera('foto-camera', new Vector3(0, 1, -10), scene);
    camera.mode = Camera.ORTHOGRAPHIC_CAMERA;
    camera.minZ = 0.1;
    camera.maxZ = 40;
    const ceu = new HemisphericLight('foto-ceu', new Vector3(-0.2, 1, -0.5), scene);
    ceu.intensity = 0.6;
    ceu.groundColor = new Color3(0.5, 0.45, 0.55);
    const sol = new DirectionalLight('foto-sol', new Vector3(0.5, -0.7, 0.8), scene);
    sol.intensity = 0.8;
    sol.specular = new Color3(0.5, 0.5, 0.5);
    const boneco = criarBoneco(scene, aparenciaPadrao(), 'foto');
    // de quina, um pouco virado para a direita (como no esboço)
    boneco.posicionar(0, 0, 0, Math.PI + 0.42);
    estudio = { canvas, engine, scene, camera, boneco };
  } catch {
    falhou = true;
  }
  return estudio;
}

/** Desenha (assim que der) o boneco com esta aparência no canvas, no recorte pedido. */
export function fotografarBoneco(
  alvo: HTMLCanvasElement,
  aparencia: Aparencia,
  recorte: RecorteBoneco = 'corpo',
  /** Altura da foto em pixels (o palco usa uma maior que as miniaturas). */
  altura = 200,
): void {
  // o canvas ganha o formato do recorte (o CSS cuida do tamanho na tela)
  const larg = Math.round(altura * FORMATO[recorte]);
  if (alvo.width !== larg || alvo.height !== altura) {
    alvo.width = larg;
    alvo.height = altura;
    ultimoPedido.delete(alvo);
  }
  const chave = `${JSON.stringify(aparencia)}|${recorte}|${alvo.width}x${alvo.height}`;
  if (ultimoPedido.get(alvo) === chave) return;
  ultimoPedido.set(alvo, chave);
  // um canvas só precisa da foto mais nova
  for (let i = fila.length - 1; i >= 0; i--) if (fila[i].alvo === alvo) fila.splice(i, 1);
  fila.push({ alvo, aparencia, recorte, chave });
  if (!andando) {
    andando = true;
    requestAnimationFrame(passo);
  }
}

/** Fotos já tiradas (aparência + recorte + tamanho): trocar de volta é instantâneo. */
const cache = new Map<string, HTMLCanvasElement>();

function copiar(de: CanvasImageSource, alvo: HTMLCanvasElement): void {
  const ctx = alvo.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, alvo.width, alvo.height);
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(de, 0, 0, alvo.width, alvo.height);
}

let esperando: { pedido: Pedido; tentativas: number } | null = null;
function passo(): void {
  const e = abrirEstudio();
  if (!e) {
    fila.length = 0;
    andando = false;
    return;
  }
  const fim = performance.now() + 8;
  while ((esperando || fila.length) && performance.now() < fim) {
    if (!esperando) {
      const p = fila.shift()!;
      if (ultimoPedido.get(p.alvo) !== p.chave) continue;
      const pronta = cache.get(p.chave);
      if (pronta) {
        copiar(pronta, p.alvo);
        continue;
      }
      e.boneco.aplicarAparencia(p.aparencia);
      esperando = { pedido: p, tentativas: 0 };
    }
    const { pedido } = esperando;
    const malhas = e.scene.meshes;
    if (!malhas.every((m) => m.isReady(true)) && esperando.tentativas++ < 120) break;
    // enquadra a faixa pedida da altura do boneco, na proporção do canvas
    const larg = Math.max(16, Math.min(512, pedido.alvo.width));
    const alt = Math.max(16, Math.min(640, pedido.alvo.height));
    if (e.canvas.width !== larg || e.canvas.height !== alt) {
      e.canvas.width = larg;
      e.canvas.height = alt;
      e.engine.resize();
    }
    const h = alturaBoneco(pedido.aparencia);
    const [f0, f1] = FAIXAS[pedido.recorte];
    const y0 = h * f0;
    const y1 = h * f1;
    const meiaAlt = (y1 - y0) / 2 / 0.92;
    const meiaLarg = meiaAlt * (larg / alt);
    const cy = (y0 + y1) / 2;
    e.camera.position.set(0, cy + 0.6, -10);
    e.camera.setTarget(new Vector3(0, cy, 0));
    e.camera.orthoTop = meiaAlt;
    e.camera.orthoBottom = -meiaAlt;
    e.camera.orthoLeft = -meiaLarg;
    e.camera.orthoRight = meiaLarg;
    e.scene.render();
    const foto = document.createElement('canvas');
    foto.width = larg;
    foto.height = alt;
    foto.getContext('2d')?.drawImage(e.canvas, 0, 0);
    if (cache.size > 160) cache.delete(cache.keys().next().value as string);
    cache.set(pedido.chave, foto);
    if (ultimoPedido.get(pedido.alvo) === pedido.chave) copiar(foto, pedido.alvo);
    esperando = null;
  }
  if (esperando || fila.length) requestAnimationFrame(passo);
  else andando = false;
}
