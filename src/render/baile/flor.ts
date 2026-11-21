/**
 * Spec 027 (T16): a florzinha da varinha de condão, na tela de todos. O evento `baileFlor` do
 * núcleo (quem, onde) faz: a estrela da varinha brilhar (as estrelinhas douradas saem do ponto),
 * a flor nascer do chão num pulinho (o cabinho, as folhas, as pétalas lilás e o miolo dourado),
 * ficar um pouco e encolher até sumir em `VARINHA.flor` s. Nada fica no mundo: não é bloco nem
 * estado salvo, e cada peça é descartada no fim.
 */
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import type { Scene } from '@babylonjs/core/scene';
import { VARINHA } from '../../jogo/baile';
import { cilindro, criarPlasticos, esfera } from '../formas';
import { aplicarJuntas } from '../../personagem/gestos';
import type { CamadaPose } from '../../personagem/poses';

interface Flor {
  no: TransformNode;
  malhas: Mesh[];
  t: number;
  brilhos: { m: Mesh; vx: number; vy: number; vz: number }[];
}

/** No máximo tantas flores ao mesmo tempo (as mais velhas somem antes). */
const MAX_FLORES = 12;
const NASCE = 0.45;
/** A flor aberta tem uns 0,65 bloco de altura (se vê de longe, na câmera do jogo). */
const ESCALA_FLOR = 1.6;
const ENCOLHE = 0.7;

/** O tamanho da flor no instante `t` (0 a 1, com o pulinho de nascer e o encolher do fim). */
export function tamanhoDaFlor(t: number): number {
  if (t <= 0 || t >= VARINHA.flor) return 0;
  if (t < NASCE) {
    const u = t / NASCE;
    return Math.min(1.12, u * 1.12 + Math.sin(u * Math.PI) * 0.15);
  }
  if (t < NASCE + 0.15) return 1.12 - ((t - NASCE) / 0.15) * 0.12;
  const fim = VARINHA.flor - ENCOLHE;
  if (t < fim) return 1;
  const u = (t - fim) / ENCOLHE;
  return Math.max(0, 1 - u * u * (3 - 2 * u));
}

/**
 * A mão da varinha sobe (a varinha fica na mão esquerda): sobe em 0,15 s, fica e desce até
 * 0,7 s; andar solta na hora.
 */
export function camadaDaVarinha(): CamadaPose {
  let t = 0;
  return (base, info) => {
    t += info.dt > 0 && Number.isFinite(info.dt) ? info.dt : 0;
    if (t > 0.7) return null;
    const p = Math.min(1, t / 0.15) * Math.min(1, (0.7 - t) / 0.25);
    return aplicarJuntas({ ...base }, { beX: -2.5, beZ: -0.15, cabX: -0.12 }, Math.max(0, p));
  };
}

export function criarFloresDaVarinha(scene: Scene, op: { preparar?(m: Mesh): void } = {}) {
  const mats = criarPlasticos(scene, 'flor-varinha');
  let flores: Flor[] = [];
  let n = 0;

  function descartar(f: Flor): void {
    for (const m of f.malhas) m.dispose();
    for (const b of f.brilhos) b.m.dispose();
    f.no.dispose();
  }

  function nova(x: number, y: number, z: number): void {
    if (flores.length >= MAX_FLORES) descartar(flores.shift()!);
    const k = n++;
    const no = new TransformNode(`flor-varinha-${k}`, scene);
    no.position.set(x, y, z);
    no.rotation.y = (k * 1.7) % (Math.PI * 2);
    const malhas: Mesh[] = [];
    const add = (m: Mesh, px: number, py: number, pz: number) => {
      m.position.set(px, py, pz);
      m.parent = no;
      m.isPickable = false;
      op.preparar?.(m);
      malhas.push(m);
      return m;
    };
    add(cilindro(`flor-cabo-${k}`, scene, 0.34, 0.018, 0.022, mats.cor('#5f8a34')), 0, 0.17, 0);
    for (const s of [-1, 1]) {
      const f = add(esfera(`flor-folha-${k}${s}`, scene, 0.06, mats.cor('#6f9a3a'), [1.6, 0.35, 0.8]), s * 0.06, 0.12, 0);
      f.rotation.z = s * -0.5;
    }
    // as cinco pétalas lilás em volta do miolo dourado, viradas para cima
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const p = add(
        esfera(`flor-petala-${k}-${i}`, scene, 0.07, mats.cor(i % 2 ? '#b07ae0' : '#c290ec', 0.4), [1, 0.4, 0.62]),
        Math.cos(a) * 0.075,
        0.36,
        Math.sin(a) * 0.075,
      );
      p.rotation.y = -a;
    }
    add(esfera(`flor-miolo-${k}`, scene, 0.05, mats.cor('#ffd45a', 0.6), [1, 0.7, 1]), 0, 0.38, 0);
    no.scaling.setAll(0.001);
    // as estrelinhas douradas da varinha, saindo do ponto tocado
    const brilhos = Array.from({ length: 7 }, (_, i) => {
      const a = (i / 7) * Math.PI * 2;
      const m = esfera(`flor-brilho-${k}-${i}`, scene, 0.03, mats.cor('#ffe07a', 1), [1, 1, 1]);
      m.position.set(x, y + 0.2, z);
      m.isPickable = false;
      op.preparar?.(m);
      return { m, vx: Math.cos(a) * 0.9, vy: 1.2 + (i % 3) * 0.3, vz: Math.sin(a) * 0.9 };
    });
    flores.push({ no, malhas, t: 0, brilhos });
  }

  return {
    /** A florzinha de alguém (o evento do núcleo). */
    evento(e: { e: 'baileFlor'; x: number; y: number; z: number }): void {
      nova(e.x, e.y, e.z);
    },
    atualizar(dt: number): void {
      const p = dt > 0 && Number.isFinite(dt) ? Math.min(dt, 0.1) : 0;
      const ficam: Flor[] = [];
      for (const f of flores) {
        f.t += p;
        if (f.t >= VARINHA.flor) {
          descartar(f);
          continue;
        }
        f.no.scaling.setAll(Math.max(0.001, tamanhoDaFlor(f.t) * ESCALA_FLOR));
        // (as estrelinhas sobem, abrem e somem em 0,8 s)
        const vida = 1 - f.t / 0.8;
        for (const b of f.brilhos) {
          if (vida <= 0) {
            b.m.setEnabled(false);
            continue;
          }
          b.m.position.x += b.vx * p;
          b.m.position.y += b.vy * p;
          b.m.position.z += b.vz * p;
          b.vy -= 1.6 * p;
          b.m.scaling.setAll(vida);
        }
        ficam.push(f);
      }
      flores = ficam;
    },
    /** Testes: quantas flores e quantas malhas da flor existem agora. */
    estado: () => ({
      flores: flores.length,
      malhas: scene.meshes.filter((m) => m.name.startsWith('flor-')).length,
      tamanhos: flores.map((f) => tamanhoDaFlor(f.t)),
    }),
  };
}

export type FloresDaVarinha = ReturnType<typeof criarFloresDaVarinha>;
