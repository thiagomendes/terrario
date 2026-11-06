import '@babylonjs/core/Rendering/outlineRenderer';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import type { Scene } from '@babylonjs/core/scene';
import type { Criatura, TipoCriatura } from '../jogo/criaturas';

interface Peca {
  /** tamanho [w, h, d] e posição do centro [x, y, z] (pés na origem, frente +z) */
  t: [number, number, number];
  p: [number, number, number];
  cor: string;
  brilho?: number;
  alfa?: number;
  /** perna (anima balançando) com fase 0 ou 1; cabeça balança devagar */
  papel?: 'perna0' | 'perna1' | 'cabeca' | 'cauda';
}

const MODELOS: Record<TipoCriatura, Peca[]> = {
  cervo: [
    { t: [0.5, 0.45, 0.95], p: [0, 0.85, 0], cor: '#8a5a3a' },
    { t: [0.42, 0.12, 0.8], p: [0, 1.12, -0.02], cor: '#4f7d36' },
    { t: [0.22, 0.4, 0.22], p: [0, 1.2, 0.48], cor: '#8a5a3a' },
    { t: [0.3, 0.28, 0.4], p: [0, 1.42, 0.62], cor: '#96643f', papel: 'cabeca' },
    { t: [0.06, 0.06, 0.06], p: [0.11, 1.48, 0.8], cor: '#111111', papel: 'cabeca' },
    { t: [0.06, 0.06, 0.06], p: [-0.11, 1.48, 0.8], cor: '#111111', papel: 'cabeca' },
    { t: [0.05, 0.32, 0.05], p: [0.1, 1.7, 0.55], cor: '#d8c9a8', papel: 'cabeca' },
    { t: [0.05, 0.32, 0.05], p: [-0.1, 1.7, 0.55], cor: '#d8c9a8', papel: 'cabeca' },
    { t: [0.08, 0.08, 0.08], p: [0.1, 1.88, 0.55], cor: '#55e6d6', brilho: 0.9, papel: 'cabeca' },
    { t: [0.08, 0.08, 0.08], p: [-0.1, 1.88, 0.55], cor: '#55e6d6', brilho: 0.9, papel: 'cabeca' },
    { t: [0.12, 0.62, 0.12], p: [0.17, 0.31, 0.35], cor: '#5a3a26', papel: 'perna0' },
    { t: [0.12, 0.62, 0.12], p: [-0.17, 0.31, 0.35], cor: '#5a3a26', papel: 'perna1' },
    { t: [0.12, 0.62, 0.12], p: [0.17, 0.31, -0.35], cor: '#5a3a26', papel: 'perna1' },
    { t: [0.12, 0.62, 0.12], p: [-0.17, 0.31, -0.35], cor: '#5a3a26', papel: 'perna0' },
    { t: [0.12, 0.14, 0.1], p: [0, 0.98, -0.52], cor: '#f2ece0', papel: 'cauda' },
  ],
  coelho: [
    { t: [0.3, 0.26, 0.42], p: [0, 0.2, 0], cor: '#b8b0c8' },
    { t: [0.24, 0.22, 0.24], p: [0, 0.38, 0.22], cor: '#c4bcd4', papel: 'cabeca' },
    { t: [0.06, 0.24, 0.04], p: [0.06, 0.6, 0.18], cor: '#c4bcd4', papel: 'cabeca' },
    { t: [0.06, 0.24, 0.04], p: [-0.06, 0.6, 0.18], cor: '#c4bcd4', papel: 'cabeca' },
    { t: [0.04, 0.04, 0.04], p: [0.08, 0.42, 0.35], cor: '#111111', papel: 'cabeca' },
    { t: [0.04, 0.04, 0.04], p: [-0.08, 0.42, 0.35], cor: '#111111', papel: 'cabeca' },
    { t: [0.1, 0.1, 0.08], p: [0, 0.24, -0.24], cor: '#ffffff', papel: 'cauda' },
    { t: [0.08, 0.1, 0.16], p: [0.1, 0.05, -0.08], cor: '#a8a0b8', papel: 'perna0' },
    { t: [0.08, 0.1, 0.16], p: [-0.1, 0.05, -0.08], cor: '#a8a0b8', papel: 'perna1' },
  ],
  peixe: [
    { t: [0.12, 0.2, 0.36], p: [0, 0.15, 0], cor: '#3ad6c4', brilho: 0.55 },
    { t: [0.04, 0.16, 0.14], p: [0, 0.15, -0.24], cor: '#ff7ac8', brilho: 0.7, papel: 'cauda' },
    { t: [0.04, 0.06, 0.12], p: [0, 0.28, 0], cor: '#ff7ac8', brilho: 0.7 },
    { t: [0.13, 0.04, 0.04], p: [0, 0.18, 0.14], cor: '#111111' },
  ],
  espectro: [
    { t: [0.56, 1.1, 0.42], p: [0, 0.75, 0], cor: '#2a2140', brilho: 0.25, alfa: 0.82 },
    {
      t: [0.66, 0.3, 0.5],
      p: [0, 0.24, 0],
      cor: '#3a2d5a',
      brilho: 0.3,
      alfa: 0.6,
      papel: 'cauda',
    },
    {
      t: [0.46, 0.46, 0.46],
      p: [0, 1.48, 0.02],
      cor: '#1d1730',
      brilho: 0.2,
      alfa: 0.9,
      papel: 'cabeca',
    },
    { t: [0.36, 0.3, 0.06], p: [0, 1.45, 0.24], cor: '#05040a', papel: 'cabeca' },
    { t: [0.08, 0.06, 0.03], p: [0.09, 1.48, 0.28], cor: '#7cf2ff', brilho: 1.4, papel: 'cabeca' },
    { t: [0.08, 0.06, 0.03], p: [-0.09, 1.48, 0.28], cor: '#7cf2ff', brilho: 1.4, papel: 'cabeca' },
    {
      t: [0.14, 0.7, 0.14],
      p: [0.36, 0.9, 0.06],
      cor: '#2a2140',
      brilho: 0.25,
      alfa: 0.8,
      papel: 'perna0',
    },
    {
      t: [0.14, 0.7, 0.14],
      p: [-0.36, 0.9, 0.06],
      cor: '#2a2140',
      brilho: 0.25,
      alfa: 0.8,
      papel: 'perna1',
    },
  ],
  raposa: [
    { t: [0.32, 0.3, 0.62], p: [0, 0.42, 0], cor: '#d8662a' },
    { t: [0.26, 0.16, 0.3], p: [0, 0.34, 0.12], cor: '#f4ece0' },
    { t: [0.3, 0.26, 0.28], p: [0, 0.62, 0.38], cor: '#e0702e', papel: 'cabeca' },
    { t: [0.12, 0.1, 0.14], p: [0, 0.56, 0.56], cor: '#f4ece0', papel: 'cabeca' },
    { t: [0.04, 0.04, 0.04], p: [0, 0.6, 0.64], cor: '#111111', papel: 'cabeca' },
    { t: [0.08, 0.14, 0.04], p: [0.09, 0.82, 0.36], cor: '#e0702e', papel: 'cabeca' },
    { t: [0.08, 0.14, 0.04], p: [-0.09, 0.82, 0.36], cor: '#e0702e', papel: 'cabeca' },
    { t: [0.05, 0.05, 0.03], p: [0.08, 0.66, 0.52], cor: '#1a1410', papel: 'cabeca' },
    { t: [0.05, 0.05, 0.03], p: [-0.08, 0.66, 0.52], cor: '#1a1410', papel: 'cabeca' },
    { t: [0.18, 0.18, 0.46], p: [0, 0.5, -0.5], cor: '#d8662a', papel: 'cauda' },
    { t: [0.16, 0.16, 0.16], p: [0, 0.52, -0.78], cor: '#7cf2e6', brilho: 1.1, papel: 'cauda' },
    { t: [0.09, 0.3, 0.09], p: [0.1, 0.15, 0.2], cor: '#2a1c14', papel: 'perna0' },
    { t: [0.09, 0.3, 0.09], p: [-0.1, 0.15, 0.2], cor: '#2a1c14', papel: 'perna1' },
    { t: [0.09, 0.3, 0.09], p: [0.1, 0.15, -0.2], cor: '#2a1c14', papel: 'perna1' },
    { t: [0.09, 0.3, 0.09], p: [-0.1, 0.15, -0.2], cor: '#2a1c14', papel: 'perna0' },
  ],
};

interface Modelo {
  raiz: TransformNode;
  partes: { no: TransformNode; malha: Mesh; peca: Peca }[];
  fase: number;
}

/** Cores reutilizadas: nada de alocar Color3 por parte a cada quadro. */
const COR_FERIDA = new Color3(1, 0.15, 0.1);
const coresBase = new Map<string, Color3>();
function corBase(hex: string): Color3 {
  let c = coresBase.get(hex);
  if (!c) {
    c = Color3.FromHexString(hex);
    coresBase.set(hex, c);
  }
  return c;
}

export function criarRenderCriaturas(
  scene: Scene,
  excluirDoGlow: (m: Mesh) => void,
  incluirNoGlow: (m: Mesh) => void,
) {
  const materiais = new Map<string, StandardMaterial>();
  const modelos = new Map<number, Modelo>();

  function material(p: Peca): StandardMaterial {
    const k = `${p.cor}|${p.brilho ?? 0}|${p.alfa ?? 1}`;
    let m = materiais.get(k);
    if (!m) {
      m = new StandardMaterial(`criatura-${k}`, scene);
      const c = Color3.FromHexString(p.cor);
      m.diffuseColor = c;
      m.specularColor = Color3.Black();
      m.ambientColor = Color3.White();
      m.emissiveColor = c.scale(p.brilho ?? 0);
      if (p.alfa !== undefined) m.alpha = p.alfa;
      materiais.set(k, m);
    }
    return m;
  }

  function montar(c: Criatura): Modelo {
    const raiz = new TransformNode(`criatura-${c.id}`, scene);
    const partes = MODELOS[c.tipo].map((peca, i) => {
      const no = new TransformNode(`criatura-${c.id}-${i}`, scene);
      no.parent = raiz;
      // pivô: pernas no topo, cabeça na base do pescoço
      const pivoY = peca.papel?.startsWith('perna') ? peca.p[1] + peca.t[1] / 2 : peca.p[1];
      no.position.set(peca.p[0], pivoY, peca.p[2]);
      const malha = MeshBuilder.CreateBox(
        `criatura-${c.id}-${i}-m`,
        { width: peca.t[0], height: peca.t[1], depth: peca.t[2] },
        scene,
      );
      malha.parent = no;
      malha.position.y = peca.p[1] - pivoY;
      malha.material = material(peca);
      malha.isPickable = false;
      if ((peca.brilho ?? 0) > 0.6) incluirNoGlow(malha);
      else excluirDoGlow(malha);
      return { no, malha, peca };
    });
    return { raiz, partes, fase: 0 };
  }

  return {
    atualizar(
      lista: readonly Criatura[],
      dt: number,
      tempo: number,
      luz: (c: Criatura) => number,
    ): void {
      const vivos = new Set<number>();
      for (const c of lista) {
        vivos.add(c.id);
        let m = modelos.get(c.id);
        if (!m) {
          m = montar(c);
          modelos.set(c.id, m);
        }
        const vel = Math.hypot(c.vx, c.vz);
        m.fase += dt * vel * 3.2;
        const balanco = Math.sin(m.fase) * Math.min(0.7, vel * 0.25);
        const flutua = c.tipo === 'espectro' ? 0.12 + Math.sin(tempo * 2 + c.id) * 0.08 : 0;
        m.raiz.position.set(c.x, c.y + flutua, c.z);
        m.raiz.rotation.y = c.yaw;
        const morrer =
          c.estado === 'morrendo' ? c.dissolver : c.tipo === 'espectro' ? c.dissolver : 0;
        const escala = 1 - morrer * 0.8;
        m.raiz.scaling.set(
          escala,
          c.estado === 'morrendo' ? Math.max(0.05, 1 - morrer) : escala,
          escala,
        );
        if (c.estado === 'morrendo') m.raiz.rotation.z = morrer * 1.4;
        const l = luz(c);
        for (const p of m.partes) {
          switch (p.peca.papel) {
            case 'perna0':
              p.no.rotation.x = balanco;
              break;
            case 'perna1':
              p.no.rotation.x = -balanco;
              break;
            case 'cabeca':
              p.no.rotation.x =
                Math.sin(tempo * 1.3 + c.id) * 0.06 + (c.estado === 'parado' ? 0.25 : 0);
              break;
            case 'cauda':
              p.no.rotation.y = Math.sin(tempo * (c.tipo === 'peixe' ? 9 : 4) + c.id) * 0.35;
              break;
          }
          p.malha.renderOverlay = c.ferida > 0;
          if (p.malha.renderOverlay) {
            p.malha.overlayColor = COR_FERIDA;
            p.malha.overlayAlpha = 0.55;
          }
          p.malha.visibility = c.tipo === 'espectro' ? 1 - morrer : 1;
          // escurece nas cavernas (luz aproximada)
          const mat = p.malha.material as StandardMaterial;
          if (!p.peca.brilho) {
            const base = corBase(p.peca.cor);
            mat.diffuseColor.set(base.r * l, base.g * l, base.b * l);
          }
        }
      }
      for (const [id, m] of modelos) {
        if (vivos.has(id)) continue;
        for (const p of m.partes) {
          p.malha.dispose();
          p.no.dispose();
        }
        m.raiz.dispose();
        modelos.delete(id);
      }
    },
  };
}
