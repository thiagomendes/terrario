import '@babylonjs/core/Rendering/outlineRenderer';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import type { Scene } from '@babylonjs/core/scene';
import type { Criatura } from '../jogo/criaturas';
import type { PecaCriatura } from '../temas/tipos';
import { povoadoDoTema, tema } from '../temas/ativo';
import { caixaArredondada, esfera } from './formas';
import { bichoDeBrinquedo, type PecaBicho } from './bichoBrinquedo';
import { criarBoneco } from './boneco';
import { moradorDeBrinquedo } from './moradorBoneco';
import { generoDoMorador } from '../temas/nomes';
import { criarAnimador } from '../player/animacao';
import type { Personagem } from './personagem';

type Peca = PecaBicho;

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
  /** Moradores de brinquedo: o boneco B com as cores e peças do tema (spec 012, A2). */
  const moradores = new Map<
    number,
    {
      boneco: Personagem;
      animador: ReturnType<typeof criarAnimador>;
      ultX: number;
      ultZ: number;
      vel: number;
      quadro: number;
    }
  >();
  function montarMorador(c: Criatura) {
    const pecas = povoadoDoTema().moradores[c.morador?.profissao ?? 'construtor'];
    const prof = c.morador?.profissao ?? 'construtor';
    const m = moradorDeBrinquedo(
      pecas,
      c.id,
      c.morador ? generoDoMorador(c.morador.povoado, c.morador.n, prof) : undefined,
    );
    const boneco = criarBoneco(scene, m.aparencia, `morador-${c.id}`, m.ajustar);
    for (const malha of boneco.raiz.getChildMeshes()) {
      const mat = malha.material as StandardMaterial | null;
      // só a lanterna e o que o tema marcou como brilhante entram no brilho
      if (mat && mat.emissiveColor.r + mat.emissiveColor.g + mat.emissiveColor.b > 1.6)
        incluirNoGlow(malha as Mesh);
      else excluirDoGlow(malha as Mesh);
      malha.isPickable = false;
    }
    return { boneco, animador: criarAnimador(), ultX: c.x, ultZ: c.z, vel: 0, quadro: 0 };
  }
  let quadro = 0;

  function material(p: Peca): StandardMaterial {
    const k = `${p.cor}|${p.brilho ?? 0}|${p.alfa ?? 1}`;
    let m = materiais.get(k);
    if (!m) {
      m = new StandardMaterial(`criatura-${k}`, scene);
      const c = Color3.FromHexString(p.cor);
      // plástico de brinquedo (spec 012): mesmo piso de luz do boneco e um brilho suave
      m.diffuseColor = c.scale(0.78);
      m.specularColor = new Color3(0.22, 0.22, 0.22);
      m.specularPower = 40;
      m.ambientColor = Color3.White();
      m.emissiveColor = c.scale(Math.max(0.36, p.brilho ?? 0));
      if (p.alfa !== undefined) m.alpha = p.alfa;
      materiais.set(k, m);
    }
    return m;
  }

  function montar(c: Criatura): Modelo {
    const raiz = new TransformNode(`criatura-${c.id}`, scene);
    // bicho de brinquedo: cabeça maior, olhos de bolinha com brilho, patas de cápsula (A3)
    const pecas = bichoDeBrinquedo(
      c.tipo === 'morador'
        ? povoadoDoTema().moradores[c.morador?.profissao ?? 'construtor']
        : tema().criaturas[c.tipo],
      // a criatura da noite: plástico pastel e cabeção (assusta pouco, é brinquedo)
      c.tipo === 'espectro' ? { pastel: 0.32, cabeca: 1.45 } : {},
    );
    // a cabeça acena inteira: olhos, orelhas e chifres giram juntos em volta do pescoço (a
    // base da maior peça de cabeça), senão cada peça girava no lugar e descolava
    const vol = (q: (typeof pecas)[number]) => q.t[0] * q.t[1] * q.t[2];
    const cabecaMaior = pecas
      .filter((q) => q.papel === 'cabeca')
      .sort((a, b) => vol(b) - vol(a))[0];
    const pescoco: [number, number, number] | null = cabecaMaior
      ? [cabecaMaior.p[0], cabecaMaior.p[1] - cabecaMaior.t[1] * 0.4, cabecaMaior.p[2]]
      : null;
    const partes = pecas.map((peca, i) => {
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
      const naCabeca = papel === 'cabeca' && pescoco;
      const px = naCabeca ? pescoco[0] : pivoX;
      const py = naCabeca ? pescoco[1] : pivoY;
      const pz = naCabeca ? pescoco[2] : peca.p[2];
      no.position.set(px, py, pz);
      const [w, h, d] = peca.t;
      const maior = Math.max(w, h, d);
      const nome = `criatura-${c.id}-${i}-m`;
      const malha =
        peca.forma === 'bola'
          ? esfera(nome, scene, maior / 2, material(peca), [w / maior, h / maior, d / maior])
          : caixaArredondada(nome, scene, w, h, d, peca.raio, material(peca), 3);
      malha.parent = no;
      malha.position.set(peca.p[0] - px, peca.p[1] - py, peca.p[2] - pz);
      if (peca.rot) malha.rotation.set(peca.rot[0], peca.rot[1], peca.rot[2]);
      malha.material = material(peca);
      malha.isPickable = false;
      if ((peca.brilho ?? 0) > 0.45) incluirNoGlow(malha);
      else excluirDoGlow(malha);
      return { no, malha, peca };
    });
    return { raiz, partes, fase: 0, ultX: c.x, ultZ: c.z, vel: 0, amp: 0, quadro: 0 };
  }

  let proximaEstatua = -1;
  return {
    /** Modelo parado de uma criatura (vitrine dos testes): o mesmo desenho do jogo. */
    estatua(tipo: Criatura['tipo'], x: number, y: number, z: number, yaw: number): void {
      const m = montar({ id: proximaEstatua--, tipo, x, z } as Criatura);
      m.raiz.position.set(x, y, z);
      m.raiz.rotation.y = yaw;
    },
    atualizar(
      lista: readonly Criatura[],
      dt: number,
      tempo: number,
      luz: (c: Criatura) => number,
    ): void {
      quadro++;
      for (const c of lista) {
        if (c.tipo === 'morador') {
          let mb = moradores.get(c.id);
          if (!mb) {
            mb = montarMorador(c);
            moradores.set(c.id, mb);
          }
          mb.quadro = quadro;
          const desloc = Math.hypot(c.x - mb.ultX, c.z - mb.ultZ);
          mb.ultX = c.x;
          mb.ultZ = c.z;
          const velReal = dt > 0 && desloc < 2 ? desloc / dt : 0;
          mb.vel += (velReal - mb.vel) * Math.min(1, dt * 10);
          const pose = mb.animador.atualizar(dt, {
            velocidadeHoriz: mb.vel,
            correndo: c.estado === 'fugir',
            noChao: c.noChao,
            voando: false,
          });
          mb.boneco.aplicarPose(pose, { dt, olhar: 0, vista: mb.animador.vista() });
          mb.boneco.posicionar(c.x, c.y, c.z, c.yaw);
          mb.boneco.definirLuz(luz(c));
          const morrer = c.estado === 'morrendo' ? c.dissolver : 0;
          mb.boneco.raiz.scaling.setAll(1 - morrer * 0.8);
          for (const malha of mb.boneco.raiz.getChildMeshes()) {
            const mm = malha as Mesh;
            mm.renderOverlay = c.ferida > 0;
            if (mm.renderOverlay) {
              mm.overlayColor = COR_FERIDA;
              mm.overlayAlpha = 0.55;
            }
          }
          continue;
        }
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
            mat.diffuseColor.set(base.r * l * 0.78, base.g * l * 0.78, base.b * l * 0.78);
            // criatura da noite: plástico que brilha no escuro (não some no breu, não estoura)
            const e = c.tipo === 'espectro' ? Math.max(l * 0.36, 0.5) : l * 0.36;
            mat.emissiveColor.set(base.r * e, base.g * e, base.b * e);
            mat.specularColor.set(0.22 * l, 0.22 * l, 0.22 * l);
          }
        }
      }
      for (const [id, mb] of moradores) {
        if (mb.quadro === quadro) continue;
        mb.boneco.descartar();
        moradores.delete(id);
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
