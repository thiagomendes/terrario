import { ParticleSystem } from '@babylonjs/core/Particles/particleSystem';
import '@babylonjs/core/Particles/particleSystemComponent';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { Color4 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { Scene } from '@babylonjs/core/scene';

function textura(scene: Scene, nome: string, desenhar: (ctx: CanvasRenderingContext2D) => void) {
  const t = new DynamicTexture(nome, { width: 32, height: 32 }, scene, false);
  const ctx = t.getContext() as unknown as CanvasRenderingContext2D;
  ctx.clearRect(0, 0, 32, 32);
  desenhar(ctx);
  t.update();
  t.hasAlpha = true;
  return t;
}

/** Chuva (gotas esticadas) e neve (flocos) em volta da câmera. */
export function criarPrecipitacao(scene: Scene) {
  const gota = textura(scene, 'gota', (ctx) => {
    const g = ctx.createLinearGradient(16, 0, 16, 32);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(1, 'rgba(255,255,255,1)');
    ctx.fillStyle = g;
    ctx.fillRect(12, 0, 8, 32);
  });
  const floco = textura(scene, 'floco', (ctx) => {
    const g = ctx.createRadialGradient(16, 16, 0, 16, 16, 14);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 32, 32);
  });

  const chuva = new ParticleSystem('chuva', 2600, scene);
  chuva.particleTexture = gota;
  chuva.emitter = new Vector3();
  chuva.minEmitBox = new Vector3(-18, 10, -18);
  chuva.maxEmitBox = new Vector3(18, 16, 18);
  chuva.direction1 = new Vector3(-0.6, -1, -0.3);
  chuva.direction2 = new Vector3(-0.4, -1, -0.1);
  chuva.minEmitPower = 16;
  chuva.maxEmitPower = 20;
  chuva.minLifeTime = 0.9;
  chuva.maxLifeTime = 1.2;
  chuva.minSize = 0.09;
  chuva.maxSize = 0.13;
  chuva.minScaleY = 6;
  chuva.maxScaleY = 8;
  chuva.color1 = new Color4(0.78, 0.84, 0.95, 0.7);
  chuva.color2 = new Color4(0.68, 0.75, 0.88, 0.55);
  chuva.colorDead = new Color4(0.6, 0.68, 0.82, 0);
  chuva.billboardMode = ParticleSystem.BILLBOARDMODE_STRETCHED;
  chuva.blendMode = ParticleSystem.BLENDMODE_STANDARD;
  chuva.emitRate = 0;
  chuva.start();

  const neve = new ParticleSystem('neve', 1800, scene);
  neve.particleTexture = floco;
  neve.emitter = new Vector3();
  neve.minEmitBox = new Vector3(-18, 8, -18);
  neve.maxEmitBox = new Vector3(18, 14, 18);
  neve.direction1 = new Vector3(-0.4, -1, -0.4);
  neve.direction2 = new Vector3(0.4, -1, 0.4);
  neve.minEmitPower = 1.2;
  neve.maxEmitPower = 2;
  neve.minLifeTime = 6;
  neve.maxLifeTime = 9;
  neve.minSize = 0.06;
  neve.maxSize = 0.13;
  neve.color1 = new Color4(1, 1, 1, 0.9);
  neve.color2 = new Color4(0.9, 0.94, 1, 0.75);
  neve.colorDead = new Color4(1, 1, 1, 0);
  neve.blendMode = ParticleSystem.BLENDMODE_STANDARD;
  neve.emitRate = 0;
  neve.start();

  return {
    ativas: () => ({
      chuva: chuva.getActiveCount(),
      neve: neve.getActiveCount(),
      taxa: chuva.emitRate,
    }),
    atualizar(posicao: Vector3, intensidade: number, nevando: boolean, coberto: boolean) {
      (chuva.emitter as Vector3).copyFrom(posicao);
      (neve.emitter as Vector3).copyFrom(posicao);
      const i = coberto ? 0 : intensidade;
      chuva.emitRate = nevando ? 0 : i * 2200;
      neve.emitRate = nevando ? i * 260 : 0;
    },
  };
}
