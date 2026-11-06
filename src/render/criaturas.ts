import '@babylonjs/core/Rendering/outlineRenderer';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import type { Scene } from '@babylonjs/core/scene';
import type { Criatura } from '../jogo/criaturas';
import type { PecaCriatura } from '../temas/tipos';
import { tema } from '../temas/ativo';

type Peca = PecaCriatura;

interface Modelo {
  raiz: TransformNode;
  partes: { no: TransformNode; malha: Mesh; peca: Peca }[];
  fase: number;
  /** Posição no quadro anterior: as pernas seguem o deslocamento real, não o desejado. */
  ultX: number;
  ultZ: number;
  /** Rapidez real suavizada e amplitude atual do balanço das pernas. */
  vel: number;
  amp: number;
  /** Último quadro em que a criatura estava na lista (para descartar os modelos órfãos). */
  quadro: number;
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
  let quadro = 0;

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
    const partes = tema().criaturas[c.tipo].map((peca, i) => {
      const no = new TransformNode(`criatura-${c.id}-${i}`, scene);
      no.parent = raiz;
      // pivô: pernas no topo, antenas na base, asas na borda de dentro, o resto no centro
      const papel = peca.papel;
      const pivoY = papel?.startsWith('perna')
        ? peca.p[1] + peca.t[1] / 2
        : papel === 'antena'
          ? peca.p[1] - peca.t[1] / 2
          : peca.p[1];
      const pivoX = papel?.startsWith('asa')
        ? peca.p[0] - Math.sign(peca.p[0] || (papel === 'asa0' ? 1 : -1)) * (peca.t[0] / 2)
        : peca.p[0];
      no.position.set(pivoX, pivoY, peca.p[2]);
      const malha = MeshBuilder.CreateBox(
        `criatura-${c.id}-${i}-m`,
        { width: peca.t[0], height: peca.t[1], depth: peca.t[2] },
        scene,
      );
      malha.parent = no;
      malha.position.y = peca.p[1] - pivoY;
      malha.position.x = peca.p[0] - pivoX;
      malha.material = material(peca);
      malha.isPickable = false;
      if ((peca.brilho ?? 0) > 0.6) incluirNoGlow(malha);
      else excluirDoGlow(malha);
      return { no, malha, peca };
    });
    return { raiz, partes, fase: 0, ultX: c.x, ultZ: c.z, vel: 0, amp: 0, quadro: 0 };
  }

  return {
    atualizar(
      lista: readonly Criatura[],
      dt: number,
      tempo: number,
      luz: (c: Criatura) => number,
    ): void {
      quadro++;
      for (const c of lista) {
        let m = modelos.get(c.id);
        if (!m) {
          m = montar(c);
          modelos.set(c.id, m);
        }
        m.quadro = quadro;
        // rapidez pelo deslocamento real (parada contra a parede não "anda" no lugar)
        const desloc = Math.hypot(c.x - m.ultX, c.z - m.ultZ);
        m.ultX = c.x;
        m.ultZ = c.z;
        const velReal = dt > 0 && desloc < 2 ? desloc / dt : 0;
        m.vel += (velReal - m.vel) * Math.min(1, dt * 12);
        m.fase += dt * m.vel * 3.2;
        // no ar as pernas param de balançar
        const ampAlvo = c.noChao ? Math.min(0.7, m.vel * 0.25) : 0;
        m.amp += (ampAlvo - m.amp) * Math.min(1, dt * 10);
        const balanco = Math.sin(m.fase) * m.amp;
        const mov = tema().movimento[c.tipo];
        const andando = Math.min(1, m.amp * 2);
        const flutua =
          mov.flutua > 0 ? mov.flutua * 1.5 + Math.sin(tempo * 2 + c.id) * mov.flutua : 0;
        const pulinho = mov.saltita * Math.abs(Math.sin(m.fase)) * andando;
        m.raiz.position.set(c.x, c.y + flutua + pulinho, c.z);
        m.raiz.rotation.y = c.yaw;
        if (c.estado !== 'morrendo') m.raiz.rotation.z = Math.sin(m.fase) * mov.ginga * andando;
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
            case 'roda':
              p.no.rotation.x = m.fase * 1.6;
              break;
            case 'asa0':
              p.no.rotation.z = Math.sin(tempo * 9 + c.id) * 0.6;
              break;
            case 'asa1':
              p.no.rotation.z = -Math.sin(tempo * 9 + c.id) * 0.6;
              break;
            case 'antena':
              p.no.rotation.z = Math.sin(tempo * 2.5 + c.id) * 0.16;
              p.no.rotation.x = Math.sin(tempo * 1.7 + c.id * 2) * 0.1 + balanco * 0.3;
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
        if (m.quadro === quadro) continue;
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
