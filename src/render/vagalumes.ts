import { ParticleSystem } from '@babylonjs/core/Particles/particleSystem';
import '@babylonjs/core/Particles/particleSystemComponent';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { Color4 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { Scene } from '@babylonjs/core/scene';

export interface Vagalumes {
  /** `ar`: 1 ao ar livre, 0 em caverna ou debaixo d'água (sem vaga-lumes nem pólen). */
  atualizar(posicao: Vector3, noite: number, ar?: number): void;
  definirDensidade(f: number): void;
  readonly particulas: ParticleSystem;
}

/** Vagalumes à noite e pólen dourado de dia, em volta do jogador. */
export function criarVagalumes(scene: Scene): Vagalumes {
  const tex = new DynamicTexture('vagalume-tex', { width: 32, height: 32 }, scene, false);
  const ctx = tex.getContext();
  const g = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.25, 'rgba(255,255,255,0.75)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 32, 32);
  tex.update();
  tex.hasAlpha = true;

  const ps = new ParticleSystem('vagalumes', 260, scene);
  ps.particleTexture = tex;
  ps.emitter = new Vector3(0, 0, 0);
  ps.minEmitBox = new Vector3(-22, -2, -22);
  ps.maxEmitBox = new Vector3(22, 7, 22);
  ps.minLifeTime = 4;
  ps.maxLifeTime = 9;
  ps.minSize = 0.06;
  ps.maxSize = 0.14;
  ps.direction1 = new Vector3(-0.35, -0.15, -0.35);
  ps.direction2 = new Vector3(0.35, 0.3, 0.35);
  ps.minEmitPower = 0.1;
  ps.maxEmitPower = 0.35;
  ps.gravity = new Vector3(0, 0.02, 0);
  ps.blendMode = ParticleSystem.BLENDMODE_ADD;
  ps.updateSpeed = 1 / 60;
  ps.isLocal = false;
  ps.renderingGroupId = 0;
  ps.start();

  function cores(noite: number): void {
    // de noite: verde-limão pulsante; de dia: pólen dourado discreto
    const a = 0.15 + 0.85 * noite;
    const dia = new Color4(1, 0.85, 0.5, 0.35);
    const noiteC = new Color4(0.75, 1, 0.45, 1);
    const c = Color4.Lerp(dia, noiteC, noite);
    ps.removeColorGradient(0);
    ps.removeColorGradient(0.25);
    ps.removeColorGradient(0.45);
    ps.removeColorGradient(0.65);
    ps.removeColorGradient(1);
    ps.addColorGradient(0, new Color4(0, 0, 0, 0));
    ps.addColorGradient(0.25, c.scale(a));
    ps.addColorGradient(0.45, c.scale(a * 0.25));
    ps.addColorGradient(0.65, c.scale(a));
    ps.addColorGradient(1, new Color4(0, 0, 0, 0));
    ps.emitRate = (12 + 30 * noite) * densidade * arLivre;
  }

  let ultimaNoite = -1;
  let densidade = 1;
  let arLivre = 1;
  return {
    particulas: ps,
    definirDensidade(f) {
      densidade = f;
      ultimaNoite = -1;
    },
    atualizar(posicao, noite, ar = 1) {
      (ps.emitter as Vector3).copyFrom(posicao);
      const qa = Math.round(ar * 10) / 10;
      if (qa !== arLivre) {
        arLivre = qa;
        ultimaNoite = -1;
      }
      const q = Math.round(noite * 20) / 20;
      if (q !== ultimaNoite) {
        ultimaNoite = q;
        cores(q);
      }
    },
  };
}
