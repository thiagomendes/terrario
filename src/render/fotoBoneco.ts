/**
 * Fotógrafo do boneco de brinquedo (spec 012, A1): o editor de personagem mostra o boneco B de
 * verdade, desenhado do modelo 3D, no palco e em cada miniatura de opção. Uma cena pequena e
 * separada desenha os pedidos em fila, poucos por quadro (trocar uma opção não trava a tela), e
 * copia cada foto direto no canvas pedido.
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
import { aparenciaPadrao, type Aparencia } from '../personagem/aparencia';
import { alturaBoneco, topoBoneco } from '../personagem/boneco';
import { criarBoneco } from './boneco';
import type { Personagem } from './personagem';
import { montarBichoPremium, type BichoMontado, type IdBichoPremium } from './bichoPremium';
import { calcularPose } from '../personagem/poses';

/** Spec 036: a pose parada das fotos com o tesouro da mão (o braço segura no alto). */
const POSE_PARADA = {
  ...calcularPose({
    andando: false,
    correndo: false,
    noAr: false,
    minerando: false,
    colocando: false,
    tempo: 0,
  }),
  // (nada de foto de olho fechado)
  piscar: false,
};

/** Faixa da altura do boneco que cada recorte mostra (0 = pés, 1 = topo da cabeça). */
export type RecorteBoneco = 'corpo' | 'cabeca' | 'tronco' | 'pernas' | 'busto' | 'pes';
/** Largura sobre altura de cada recorte (o canvas ganha esse formato). */
const FORMATO: Record<RecorteBoneco, number> = {
  corpo: 0.72,
  cabeca: 1,
  tronco: 1.15,
  pernas: 0.85,
  busto: 0.9,
  pes: 1.5,
};
const FAIXAS: Record<RecorteBoneco, [number, number]> = {
  corpo: [-0.02, 1.04],
  cabeca: [0.5, 1.04],
  tronco: [0.24, 0.72],
  pernas: [-0.02, 0.5],
  busto: [0.24, 1.05],
  pes: [-0.03, 0.155],
};

interface Pedido {
  alvo: HTMLCanvasElement;
  aparencia: Aparencia;
  recorte: RecorteBoneco;
  chave: string;
  /** Para onde o boneco olha (rad; padrão: de quina, um pouco para a direita). */
  giro?: number;
  /** Spec 023: só o bichinho premium (a vitrine da lojinha), sem o boneco. */
  bicho?: IdBichoPremium;
  /** Spec 036: o quadro pega o boneco inteiro com o que ele leva fora do corpo. */
  tudo?: boolean;
}

/** O giro padrão do boneco no estúdio: de quina, um pouco virado para a direita. */
const GIRO_PADRAO = 0.42;

let estudio: {
  canvas: HTMLCanvasElement;
  engine: Engine;
  scene: Scene;
  camera: FreeCamera;
  boneco: Personagem;
  bichos: Partial<Record<IdBichoPremium, BichoMontado>>;
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
    // a luz do meio-dia do jogo (sol forte e céu azulado): o boneco do editor é o do mundo
    // (correção da 017: o plástico tem difusa baixa e não estoura sob o sol de 2)
    const ceu = new HemisphericLight('foto-ceu', new Vector3(-0.2, 1, -0.5), scene);
    ceu.intensity = 0.62;
    ceu.diffuse = new Color3(0.72, 0.8, 1);
    ceu.groundColor = new Color3(0.42, 0.38, 0.46);
    // sem tonemapping aqui: o reflexo do céu e o do sol mais fracos que no mundo (o cabelo
    // e a roupa não ficam metálicos)
    ceu.specular = new Color3(0.18, 0.18, 0.2);
    const sol = new DirectionalLight('foto-sol', new Vector3(0.5, -0.7, 0.8), scene);
    sol.intensity = 1.6;
    sol.diffuse = new Color3(1, 0.97, 0.9);
    sol.specular = new Color3(0.32, 0.31, 0.3);
    const boneco = criarBoneco(scene, aparenciaPadrao(), 'foto');
    // de quina, um pouco virado para a direita (como no esboço)
    boneco.posicionar(0, 0, 0, Math.PI + GIRO_PADRAO);
    estudio = { canvas, engine, scene, camera, boneco, bichos: {} };
    // sair da página solta também o contexto do estúdio (no iPhone cada contexto pesa)
    antesDeSair(() => {
      liberarEngine(engine);
      estudio = null;
      falhou = true;
    });
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
  /**
   * Spec 023: o giro do boneco (a capa se vê de costas) ou só o bichinho premium. Spec 036:
   * `tudo` enquadra o boneco com o que ele leva fora do corpo (o guarda-chuva, a pipa no alto).
   */
  extra: { giro?: number; bicho?: IdBichoPremium; tudo?: boolean } = {},
): void {
  // o canvas ganha o formato do recorte (o CSS cuida do tamanho na tela)
  // o bichinho é mais comprido que alto: quadro mais largo
  const larg = Math.round(altura * (extra.bicho ? 1.2 : extra.tudo ? 0.9 : FORMATO[recorte]));
  if (alvo.width !== larg || alvo.height !== altura) {
    alvo.width = larg;
    alvo.height = altura;
    ultimoPedido.delete(alvo);
  }
  const chave = extra.bicho
    ? `bicho:${extra.bicho}|${extra.giro ?? GIRO_PADRAO}|${alvo.width}x${alvo.height}`
    : `${JSON.stringify(aparencia)}|${recorte}${extra.tudo ? '|tudo' : ''}|${extra.giro ?? GIRO_PADRAO}|${alvo.width}x${alvo.height}`;
  if (ultimoPedido.get(alvo) === chave) return;
  ultimoPedido.set(alvo, chave);
  // um canvas só precisa da foto mais nova
  for (let i = fila.length - 1; i >= 0; i--) if (fila[i].alvo === alvo) fila.splice(i, 1);
  fila.push({ alvo, aparencia, recorte, chave, giro: extra.giro, bicho: extra.bicho, tudo: extra.tudo });
  if (!andando) {
    andando = true;
    // fila parada: tira a foto logo depois do toque, sem esperar o próximo quadro (spec 017:
    // vestir aparece na hora); o resto da fila segue quadro a quadro
    queueMicrotask(passo);
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
      const giro = p.giro ?? GIRO_PADRAO;
      for (const b of Object.values(e.bichos)) b?.raiz.setEnabled(false);
      if (p.bicho) {
        e.boneco.definirVisivel(false);
        const b = (e.bichos[p.bicho] ??= montarBichoPremium(e.scene, p.bicho));
        b.raiz.setEnabled(true);
        b.raiz.position.set(0, 0, 0);
        b.raiz.rotation.y = Math.PI + giro;
      } else {
        e.boneco.definirVisivel(true);
        e.boneco.aplicarAparencia(p.aparencia);
        e.boneco.posicionar(0, 0, 0, Math.PI + giro);
        // spec 036: com o tesouro da mão, o braço segura no alto (o guarda-chuva por cima da
        // cabeça, a varinha na frente, a pipa puxando)
        if (p.aparencia.premium?.mao) e.boneco.aplicarPose(POSE_PARADA);
      }
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
    let y0: number;
    let y1: number;
    let cx = 0;
    let meiaAlt: number;
    let meiaLarg: number;
    const bicho = pedido.bicho ? e.bichos[pedido.bicho] : undefined;
    if (bicho) {
      // o bichinho inteiro no quadro (chifre, crina e rabo), visto um pouco de cima
      bicho.raiz.computeWorldMatrix(true);
      for (const m of bicho.malhas) m.computeWorldMatrix(true);
      const { min, max } = bicho.raiz.getHierarchyBoundingVectors(true);
      y0 = min.y;
      y1 = max.y;
      cx = (min.x + max.x) / 2;
      const meiaL = (max.x - min.x) / 2;
      meiaAlt = Math.max((y1 - y0) / 2, meiaL * (alt / larg)) / 0.86;
      meiaLarg = meiaAlt * (larg / alt);
    } else if (pedido.tudo) {
      // spec 036: o boneco e o que ele leva (o guarda-chuva, a pipa), um tico de folga em volta
      e.boneco.raiz.computeWorldMatrix(true);
      for (const m of e.boneco.raiz.getChildMeshes(false)) m.computeWorldMatrix(true);
      const { min, max } = e.boneco.raiz.getHierarchyBoundingVectors(true, (m) => m.isEnabled());
      y0 = Math.min(0, min.y);
      y1 = max.y;
      cx = (min.x + max.x) / 2;
      const meiaL = (max.x - min.x) / 2;
      meiaAlt = Math.max((y1 - y0) / 2, meiaL * (alt / larg)) / 0.9;
      meiaLarg = meiaAlt * (larg / alt);
    } else {
      const h = alturaBoneco(pedido.aparencia);
      const [f0, f1] = FAIXAS[pedido.recorte];
      y0 = h * f0;
      // a faixa vai até o alto do chapéu ou do penteado (a copa não sai cortada)
      y1 = f1 >= 1 ? Math.max(h * f1, topoBoneco(pedido.aparencia) + h * (f1 - 1)) : h * f1;
      meiaAlt = (y1 - y0) / 2 / 0.92;
      meiaLarg = meiaAlt * (larg / alt);
    }
    const cy = (y0 + y1) / 2;
    e.camera.position.set(cx, cy + 0.6, -10);
    e.camera.setTarget(new Vector3(cx, cy, 0));
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
