import { tema } from '../temas/ativo';
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
  const tp = tema().particulas;
  // tinta do tema sobre as cores de base (Bruma e Luz: 0.78, 0.84, 0.95)
  const tc = [tp.chuva[0] / 0.78, tp.chuva[1] / 0.84, tp.chuva[2] / 0.95];
  chuva.color1 = new Color4(0.78 * tc[0], 0.84 * tc[1], 0.95 * tc[2], 0.7);
  chuva.color2 = new Color4(0.68 * tc[0], 0.75 * tc[1], 0.88 * tc[2], 0.55);
  chuva.colorDead = new Color4(0.6 * tc[0], 0.68 * tc[1], 0.82 * tc[2], 0);
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
  const tn = tp.neve;
  neve.color1 = new Color4(tn[0], tn[1], tn[2], 0.9);
  neve.color2 = new Color4(0.9 * tn[0], 0.94 * tn[1], tn[2], 0.75);
  neve.colorDead = new Color4(tn[0], tn[1], tn[2], 0);
  neve.blendMode = ParticleSystem.BLENDMODE_STANDARD;
  neve.emitRate = 0;
  neve.start();
  const baseChuva1 = chuva.color1.clone();
  const baseChuva2 = chuva.color2.clone();
  const baseNeve1 = neve.color1.clone();
  const baseNeve2 = neve.color2.clone();
  let luzAtual = 1;

  // folhas caindo das árvores (mais no outono)
  const folhaTex = textura(scene, 'folha', (ctx) => {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(16, 16, 12, 6, Math.PI / 4, 0, Math.PI * 2);
    ctx.fill();
  });
  const folhas = new ParticleSystem('folhas', 160, scene);
  folhas.particleTexture = folhaTex;
  folhas.emitter = new Vector3();
  folhas.minEmitBox = new Vector3(-14, 4, -14);
  folhas.maxEmitBox = new Vector3(14, 9, 14);
  folhas.direction1 = new Vector3(-0.6, -0.4, -0.3);
  folhas.direction2 = new Vector3(0.6, -0.8, 0.3);
  folhas.minEmitPower = 0.6;
  folhas.maxEmitPower = 1.2;
  folhas.minLifeTime = 6;
  folhas.maxLifeTime = 10;
  folhas.minSize = 0.1;
  folhas.maxSize = 0.18;
  folhas.minAngularSpeed = -2;
  folhas.maxAngularSpeed = 2;
  folhas.blendMode = ParticleSystem.BLENDMODE_STANDARD;
  folhas.emitRate = 0;
  folhas.start();
  let outonoFolhas = -1;

  return {
    /** Folhas caindo: intensidade 0..1 e quanto de outono (cor). */
    folhas(posicao: Vector3, intensidade: number, outono: number) {
      (folhas.emitter as Vector3).copyFrom(posicao);
      folhas.emitRate = intensidade * (4 + outono * 14);
      const q = Math.round(outono * 10) / 10;
      if (q !== outonoFolhas) {
        outonoFolhas = q;
        const tf = tema().particulas.folhas;
        const k = [tf[0] / 0.32, tf[1] / 0.58, tf[2] / 0.22];
        const verde = new Color4(tf[0], tf[1], tf[2], 0.95);
        const ocre = new Color4(0.9, 0.5, 0.15, 0.95);
        folhas.color1 = Color4.Lerp(verde, ocre, q);
        folhas.color2 = Color4.Lerp(
          new Color4(
            Math.min(1, 0.4 * k[0]),
            Math.min(1, 0.66 * k[1]),
            Math.min(1, 0.26 * k[2]),
            0.9,
          ),
          new Color4(0.8, 0.32, 0.1, 0.9),
          q,
        );
        folhas.colorDead = new Color4(folhas.color2.r, folhas.color2.g, folhas.color2.b, 0);
      }
    },
    ativas: () => ({
      chuva: chuva.getActiveCount(),
      neve: neve.getActiveCount(),
      taxa: chuva.emitRate,
    }),
    /** Claridade (0..1): chuva e neve escurecem à noite em vez de brilhar no escuro. */
    definirLuz(f: number) {
      const q = Math.round(Math.max(0.15, Math.min(1, f)) * 20) / 20;
      if (q === luzAtual) return;
      luzAtual = q;
      chuva.color1 = baseChuva1.scale(q);
      chuva.color1.a = baseChuva1.a;
      chuva.color2 = baseChuva2.scale(q);
      chuva.color2.a = baseChuva2.a;
      neve.color1 = baseNeve1.scale(q);
      neve.color1.a = baseNeve1.a;
      neve.color2 = baseNeve2.scale(q);
      neve.color2.a = baseNeve2.a;
    },
    atualizar(posicao: Vector3, intensidade: number, nevando: boolean, coberto: boolean) {
      (chuva.emitter as Vector3).copyFrom(posicao);
      (neve.emitter as Vector3).copyFrom(posicao);
      const i = coberto ? 0 : intensidade;
      chuva.emitRate = nevando ? 0 : i * 2200;
      neve.emitRate = nevando ? i * 260 : 0;
    },
  };
}
