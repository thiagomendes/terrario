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
  // chuva de brinquedo (spec 012): gota de desenho, redonda embaixo e pontuda em cima, com
  // um brilhinho; o floco de neve é uma bolinha com brilho
  const gota = textura(scene, 'gota', (ctx) => {
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.beginPath();
    ctx.moveTo(16, 2);
    ctx.bezierCurveTo(19, 11, 25, 16, 25, 22);
    ctx.arc(16, 22, 9, 0, Math.PI, false);
    ctx.bezierCurveTo(7, 16, 13, 11, 16, 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,1)';
    ctx.beginPath();
    ctx.ellipse(13, 21, 2.2, 3.4, -0.3, 0, Math.PI * 2);
    ctx.fill();
  });
  const floco = textura(scene, 'floco', (ctx) => {
    const g = ctx.createRadialGradient(13, 12, 1, 16, 16, 13);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.75, 'rgba(255,255,255,0.95)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(16, 16, 13, 0, Math.PI * 2);
    ctx.fill();
  });

  const chuva = new ParticleSystem('chuva', 2600, scene);
  chuva.particleTexture = gota;
  chuva.emitter = new Vector3();
  chuva.minEmitBox = new Vector3(-18, 10, -18);
  chuva.maxEmitBox = new Vector3(18, 16, 18);
  chuva.direction1 = new Vector3(-0.6, -1, -0.3);
  chuva.direction2 = new Vector3(-0.4, -1, -0.1);
  // gotinhas que se vê cair (mais lentas e curtas que um risco)
  chuva.minEmitPower = 10;
  chuva.maxEmitPower = 12;
  chuva.minLifeTime = 1.3;
  chuva.maxLifeTime = 1.7;
  chuva.minSize = 0.12;
  chuva.maxSize = 0.17;
  chuva.minScaleY = 1.7;
  chuva.maxScaleY = 2.1;
  const tp = tema().particulas;
  // tinta do tema sobre as cores de base (Bruma e Luz: 0.78, 0.84, 0.95)
  const tc = [tp.chuva[0] / 0.78, tp.chuva[1] / 0.84, tp.chuva[2] / 0.95];
  chuva.color1 = new Color4(0.78 * tc[0], 0.84 * tc[1], 0.95 * tc[2], 0.7);
  chuva.color2 = new Color4(0.68 * tc[0], 0.75 * tc[1], 0.88 * tc[2], 0.55);
  chuva.colorDead = new Color4(0.6 * tc[0], 0.68 * tc[1], 0.82 * tc[2], 0);
  chuva.billboardMode = ParticleSystem.BILLBOARDMODE_STRETCHED;
  chuva.blendMode = ParticleSystem.BLENDMODE_STANDARD;
  chuva.emitRate = 0;
  const modoChuva = tema().climaVisual.chuva;
  /** Chuvas extras do granulado (cada uma com um par de cores de confeito). */
  const extras: ParticleSystem[] = [];
  let taxaChuva = 1300;
  if (modoChuva === 'poeira') {
    // poeira fina que desce devagar, quase parada no ar
    chuva.particleTexture = floco;
    chuva.billboardMode = ParticleSystem.BILLBOARDMODE_ALL;
    chuva.direction1 = new Vector3(-0.3, -1, -0.2);
    chuva.direction2 = new Vector3(0.3, -1, 0.2);
    chuva.minEmitPower = 0.5;
    chuva.maxEmitPower = 1.1;
    chuva.minLifeTime = 7;
    chuva.maxLifeTime = 10;
    chuva.minSize = 0.035;
    chuva.maxSize = 0.08;
    chuva.minScaleY = 1;
    chuva.maxScaleY = 1;
    taxaChuva = 240;
  } else if (modoChuva === 'granulado') {
    // granulado colorido: palitinhos curtos, caindo mais devagar que a chuva
    chuva.minEmitPower = 7;
    chuva.maxEmitPower = 9;
    chuva.minLifeTime = 1.8;
    chuva.maxLifeTime = 2.4;
    chuva.minSize = 0.08;
    chuva.maxSize = 0.11;
    chuva.minScaleY = 1.8;
    chuva.maxScaleY = 2.4;
    chuva.color1 = new Color4(1, 0.45, 0.7, 0.95);
    chuva.color2 = new Color4(1, 0.95, 0.98, 0.9);
    chuva.colorDead = new Color4(1, 0.8, 0.9, 0);
    for (const [c1, c2] of [
      [new Color4(1, 0.86, 0.25, 0.95), new Color4(1, 0.55, 0.2, 0.9)],
      [new Color4(0.35, 0.85, 1, 0.95), new Color4(0.45, 0.95, 0.5, 0.9)],
    ]) {
      const e = chuva.clone(`granulado-${extras.length}`, new Vector3());
      e.color1 = c1;
      e.color2 = c2;
      e.colorDead = new Color4(c2.r, c2.g, c2.b, 0);
      e.emitRate = 0;
      extras.push(e);
    }
    taxaChuva = 600;
  }
  chuva.start();
  for (const e of extras) e.start();
  const basesExtras = extras.map((e) => [e.color1.clone(), e.color2.clone()] as const);
  const neveVisivel = tema().climaVisual.neve;

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
  neve.minSize = 0.09;
  neve.maxSize = 0.17;
  // flocos de bolinha balançam: giram um pouco e variam a direção
  neve.minAngularSpeed = -1;
  neve.maxAngularSpeed = 1;
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
      chuva: chuva.getActiveCount() + extras.reduce((n, e) => n + e.getActiveCount(), 0),
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
      extras.forEach((e, i) => {
        e.color1 = basesExtras[i][0].scale(q);
        e.color1.a = basesExtras[i][0].a;
        e.color2 = basesExtras[i][1].scale(q);
        e.color2.a = basesExtras[i][1].a;
      });
    },
    atualizar(posicao: Vector3, intensidade: number, nevando: boolean, coberto: boolean) {
      (chuva.emitter as Vector3).copyFrom(posicao);
      (neve.emitter as Vector3).copyFrom(posicao);
      const i = coberto || modoChuva === 'nenhuma' ? 0 : intensidade;
      // neve desligada no tema: o frio só fica no chão pintado, nada cai
      chuva.emitRate = nevando ? 0 : i * taxaChuva;
      neve.emitRate = nevando && neveVisivel ? i * 260 : 0;
      for (const e of extras) {
        (e.emitter as Vector3).copyFrom(posicao);
        e.emitRate = chuva.emitRate;
      }
    },
  };
}
