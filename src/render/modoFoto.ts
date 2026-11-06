/**
 * Modo foto: câmera livre, filtros de cor, desfoque e captura da tela.
 */
import { ColorCurves } from '@babylonjs/core/Materials/colorCurves';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { Scene } from '@babylonjs/core/scene';
import type { UniversalCamera } from '@babylonjs/core/Cameras/universalCamera';
import type { DefaultRenderingPipeline } from '@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/defaultRenderingPipeline';
import type { TeclasAtivas } from '../player/entrada';

export interface OpcoesModoFoto {
  scene: Scene;
  canvas: HTMLCanvasElement;
  camera: UniversalCamera;
  cameraVisao: UniversalCamera;
  pipeline: DefaultRenderingPipeline;
  teclas: TeclasAtivas;
  /** Bloco na mira (foco do desfoque). */
  alvo(): { x: number; y: number; z: number } | null;
  /** Pausa o relógio do dia enquanto fotografa. */
  pausarDia(pausar: boolean): void;
}

export function criarModoFoto(op: OpcoesModoFoto) {
  const { scene, canvas, camera, cameraVisao, pipeline } = op;
  const ip = pipeline.imageProcessing;
  const calcularAlvo = op.alvo;
  let modoFoto = false;
  const fotoPos = new Vector3();
  const curvasBase = ip.colorCurves;
  function definirFiltro(f: string): void {
    const c = new ColorCurves();
    c.globalSaturation = 0;
    switch (f) {
      case 'quente':
        c.globalHue = 30;
        c.globalDensity = 35;
        c.globalSaturation = 15;
        break;
      case 'frio':
        c.globalHue = 210;
        c.globalDensity = 35;
        break;
      case 'pb':
        c.globalSaturation = -100;
        break;
      case 'sepia':
        c.globalSaturation = -100;
        c.globalHue = 35;
        c.globalDensity = 55;
        break;
      case 'sonho':
        c.globalSaturation = 35;
        c.highlightsHue = 300;
        c.highlightsDensity = 30;
        break;
      default:
        ip.colorCurves = curvasBase;
        pipeline.bloomWeight = 0.22;
        return;
    }
    ip.colorCurves = c;
    pipeline.bloomWeight = f === 'sonho' ? 0.6 : 0.22;
  }
  const api = {
    ativo: () => modoFoto,
    alternar: () => {
      modoFoto = !modoFoto;
      if (modoFoto) {
        fotoPos.copyFrom(cameraVisao.position);
        op.pausarDia(true);
      } else {
        op.pausarDia(false);
        pipeline.depthOfFieldEnabled = false;
        definirFiltro('natural');
        cameraVisao.fov = camera.fov;
      }
      return modoFoto;
    },
    filtro: definirFiltro,
    desfoque: (v: number) => {
      pipeline.depthOfFieldEnabled = v > 0.01;
      if (v > 0.01) {
        const a = calcularAlvo();
        const dist = a
          ? Math.hypot(a.x + 0.5 - fotoPos.x, a.y + 0.5 - fotoPos.y, a.z + 0.5 - fotoPos.z)
          : 8;
        pipeline.depthOfField.focusDistance = dist * 1000;
        pipeline.depthOfField.fStop = 1.4 + (1 - v) * 8;
        pipeline.depthOfField.focalLength = 50 + v * 100;
      }
    },
    fov: (g: number) => {
      cameraVisao.fov = (g * Math.PI) / 180;
    },
    capturar: () => {
      scene.render();
      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      const agora = new Date();
      a.download = `terrario-${agora.toISOString().slice(0, 19).replace(/[:T]/g, '-')}.png`;
      a.href = url;
      a.click();
      return url;
    },
  };
  function quadroFoto(dt: number): void {
    if (!modoFoto) return;
    const t = op.teclas;
    const yaw = camera.rotation.y;
    const pitch = camera.rotation.x;
    const v = (t.correr ? 14 : 5) * dt;
    const f = (t.frente ? 1 : 0) - (t.tras ? 1 : 0);
    const d = (t.direita ? 1 : 0) - (t.esquerda ? 1 : 0);
    fotoPos.x += (Math.sin(yaw) * Math.cos(pitch) * f + Math.cos(yaw) * d) * v;
    fotoPos.z += (Math.cos(yaw) * Math.cos(pitch) * f - Math.sin(yaw) * d) * v;
    fotoPos.y += (-Math.sin(pitch) * f + (t.pular ? 1 : 0)) * v;
  }
  return { ...api, quadro: quadroFoto, posicao: () => fotoPos };
}
