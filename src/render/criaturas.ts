import '@babylonjs/core/Rendering/outlineRenderer';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { Matrix, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer';
import type { Scene } from '@babylonjs/core/scene';
import type { Criatura } from '../jogo/criaturas';
import type { PecaCriatura } from '../temas/tipos';
import { povoadoDoTema, tema } from '../temas/ativo';
import { caixaArredondada, esfera } from './formas';
import { bichoDeBrinquedo, type PecaBicho } from './bichoBrinquedo';
import { criarBoneco } from './boneco';
import { moradorDeBrinquedo } from './moradorBoneco';
import { generoDoMorador } from '../temas/nomes';
import type { Profissao } from '../world/povoado';
import { criarAnimador } from '../player/animacao';
// spec 015 (gestos): o morador acena de volta; o balão fica em cima da cabeça
import { fazerGesto, gestoDoAnimador, type IdGesto } from '../personagem/gestos';
import { criarBalao, type BalaoGesto } from './balaoGesto';
import type { Personagem } from './personagem';

type Peca = PecaBicho;

/**
 * Bicho a mais de tantos blocos da câmera vira uma malha por material (o plástico e o brilho
 * dos olhos), na pose de descanso: corta os desenhos de cada perna, cabeça e cauda. Em
 * terceira pessoa o sítio inteiro entra na vista, por isso começa já a 18 blocos (de lá as
 * pernas mal aparecem). Volta inteiro a LONGE_VOLTA.
 */
export const LONGE_LOD = 18;
export const LONGE_VOLTA = 16;
/** Quantos bichos montam a malha de longe por quadro (sem engasgo quando muitos chegam). */
export const LONGE_POR_QUADRO = 1;

interface Modelo {
  raiz: TransformNode;
  /** Uma parte por grupo que se mexe junto (corpo, cabeça, cada perna...), já fundida. */
  partes: { no: TransformNode; malhas: Mesh[]; papel: Peca['papel'] }[];
  /** Material do plástico deste bicho (a luz do lugar escurece só ele). */
  plastico: StandardMaterial;
  /** Materiais próprios (descartados com o bicho). */
  proprios: StandardMaterial[];
  fase: number;
  /** Posição no quadro anterior: as pernas seguem o deslocamento real, não o desejado. */
  ultX: number;
  ultZ: number;
  /** Rapidez real suavizada e amplitude atual do balanço das pernas. */
  vel: number;
  amp: number;
  /** Último quadro em que a criatura estava na lista (para descartar os modelos órfãos). */
  quadro: number;
  /**
   * Longe da câmera (spec 015): o plástico do bicho inteiro numa malha só, parado na pose de
   * descanso (um desenho em vez de um por perna). Feita na primeira vez que ele fica longe.
   */
  longe?: Mesh[] | null;
  emLonge?: boolean;
  /** Materiais que a malha de longe substitui (plástico e brilho dos olhos). */
  substitui: Set<StandardMaterial>;
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
  const modelos = new Map<number, Modelo>();
  /** Moradores de brinquedo: o boneco B com as cores e peças do tema (spec 012, A2). */
  const moradores = new Map<
    number,
    {
      boneco: Personagem;
      animador: ReturnType<typeof criarAnimador>;
      /** Spec 015: balão do gesto (criado no primeiro aceno). */
      balao?: BalaoGesto;
      ultX: number;
      ultZ: number;
      vel: number;
      quadro: number;
      /** Malhas do boneco (fixas: o morador não troca de roupa nem de item na mão). */
      malhas: Mesh[];
      ferido: boolean;
      luz: number;
    }
  >();
  /**
   * Desempenho (spec 013, sítio com curral e moradores): quem está atrás da câmera e longe
   * não precisa mexer as juntas neste quadro (ninguém vê; a posição continua indo). Uma
   * margem larga em volta do campo de visão e da câmera evita qualquer diferença na tela.
   */
  const frente = new Vector3();
  let camX = 0;
  let camY = 0;
  let camZ = 0;
  function prepararVista(): void {
    const cam = scene.activeCamera;
    if (!cam) return;
    cam.getDirectionToRef(Vector3.Forward(), frente);
    const p = cam.globalPosition;
    camX = p.x;
    camY = p.y;
    camZ = p.z;
  }
  function foraDaVista(x: number, y: number, z: number): boolean {
    if (!scene.activeCamera) return false;
    const dx = x - camX;
    const dy = y - camY;
    const dz = z - camZ;
    const d = Math.hypot(dx, dy, dz);
    // perto (sombra, braço que aparece de lado) e tudo à frente até ~115°: desenha
    return d > 8 && (dx * frente.x + dy * frente.y + dz * frente.z) / d < -0.42;
  }
  function montarMorador(c: Criatura) {
    const pecas = povoadoDoTema().moradores[c.morador?.profissao ?? 'construtor'];
    const prof = c.morador?.profissao ?? 'construtor';
    const m = moradorDeBrinquedo(
      pecas,
      c.id,
      c.morador ? generoDoMorador(c.morador.povoado, c.morador.n, prof) : undefined,
      povoadoDoTema().acessorios?.[prof],
    );
    const boneco = criarBoneco(scene, m.aparencia, `morador-${c.id}`, m.ajustar, true);
    for (const malha of boneco.raiz.getChildMeshes()) {
      const mat = malha.material as StandardMaterial | null;
      // só a lanterna e o que o tema marcou como brilhante entram no brilho
      if (mat && mat.emissiveColor.r + mat.emissiveColor.g + mat.emissiveColor.b > 1.6)
        incluirNoGlow(malha as Mesh);
      else excluirDoGlow(malha as Mesh);
      malha.isPickable = false;
    }
    return {
      boneco,
      animador: criarAnimador(),
      ultX: c.x,
      ultZ: c.z,
      vel: 0,
      quadro: 0,
      malhas: boneco.raiz.getChildMeshes() as Mesh[],
      ferido: false,
      luz: -1,
    };
  }
  let quadro = 0;

  /**
   * O bicho longe numa malha por material (plástico e brilho dos olhos), na pose de
   * descanso, juntas no espaço da raiz. O que brilha de verdade continua nas partes.
   */
  function montarLonge(m: Modelo): Mesh[] | null {
    const giros = m.partes.map((p) => p.no.rotation.clone());
    for (const p of m.partes) p.no.rotation.setAll(0);
    const inversa = Matrix.Invert(m.raiz.computeWorldMatrix(true));
    const porMaterial = new Map<StandardMaterial, Mesh[]>();
    for (const p of m.partes) {
      p.no.computeWorldMatrix(true);
      for (const malha of p.malhas) {
        const mat = malha.material as StandardMaterial | null;
        if (!mat || !m.substitui.has(mat)) continue;
        const copia = malha.clone(`${malha.name}-longe`, null, true);
        if (!copia) continue;
        copia.parent = null;
        copia.position.setAll(0);
        copia.rotation.setAll(0);
        copia.rotationQuaternion = null;
        copia.scaling.setAll(1);
        copia.makeGeometryUnique();
        copia.bakeTransformIntoVertices(malha.computeWorldMatrix(true).multiply(inversa));
        let l = porMaterial.get(mat);
        if (!l) porMaterial.set(mat, (l = []));
        l.push(copia);
      }
    }
    m.partes.forEach((p, i) => p.no.rotation.copyFrom(giros[i]));
    const feitas: Mesh[] = [];
    for (const [mat, copias] of porMaterial) {
      const f =
        copias.length === 1
          ? copias[0]
          : Mesh.MergeMeshes(copias, true, true, undefined, false, false);
      if (!f) {
        for (const c of copias) c.dispose();
        for (const c of feitas) c.dispose();
        return null;
      }
      f.name = `${m.raiz.name}-longe`;
      f.material = mat;
      f.parent = m.raiz;
      f.isPickable = false;
      excluirDoGlow(f);
      feitas.push(f);
    }
    return feitas.length ? feitas : null;
  }

  /** Malhas de longe montadas neste quadro (o resto espera o próximo). */
  let montadasNoQuadro = 0;
  /** Troca entre o bicho inteiro (perto) e as malhas de longe, com folga para não piscar. */
  function escolherLonge(m: Modelo, x: number, y: number, z: number): void {
    const d = Math.hypot(x - camX, y - camY, z - camZ);
    const quer = m.emLonge ? d > LONGE_VOLTA : d > LONGE_LOD;
    if (quer === !!m.emLonge) return;
    if (quer && m.longe === undefined) {
      if (montadasNoQuadro >= LONGE_POR_QUADRO) return;
      montadasNoQuadro++;
      m.longe = montarLonge(m);
    }
    if (quer && !m.longe) return;
    m.emLonge = quer;
    if (m.longe) for (const f of m.longe) f.setEnabled(quer);
    for (const p of m.partes)
      for (const malha of p.malhas)
        if (m.substitui.has(malha.material as StandardMaterial)) malha.setEnabled(!quer);
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
    // desempenho (spec 012): as peças que se mexem juntas viram uma malha só, com a cor nos
    // vértices; cada bicho desenhava uma malha por peça (o dobro de chamadas com os bichos novos)
    const plastico = new StandardMaterial(`criatura-${c.id}-plastico`, scene);
    plastico.diffuseColor = new Color3(0.78, 0.78, 0.78);
    plastico.specularColor = new Color3(0.22, 0.22, 0.22);
    plastico.specularPower = 40;
    plastico.ambientColor = Color3.White();
    plastico.emissiveColor = new Color3(0.36, 0.36, 0.36);
    const suave = new StandardMaterial(`criatura-${c.id}-suave`, scene);
    suave.diffuseColor = new Color3(0.78, 0.78, 0.78);
    suave.specularColor = new Color3(0.22, 0.22, 0.22);
    suave.specularPower = 40;
    suave.emissiveColor = new Color3(0.45, 0.45, 0.45);
    const forte = suave.clone(`criatura-${c.id}-forte`);
    forte.emissiveColor = new Color3(0.55, 0.55, 0.55);
    const grupos = new Map<
      string,
      { pivo: [number, number, number]; papel: Peca['papel']; pecas: Peca[] }
    >();
    for (const peca of pecas) {
      // pivô: pernas no topo, antenas na base, asas na borda de dentro, cabeça no pescoço
      const papel = peca.papel;
      let pivo: [number, number, number];
      if (!papel) pivo = [0, 0, 0];
      else if (papel === 'cabeca' && pescoco) pivo = pescoco;
      else if (papel.startsWith('perna')) pivo = [0, peca.p[1] + peca.t[1] / 2, peca.p[2]];
      else if (papel === 'antena') pivo = [peca.p[0], peca.p[1] - peca.t[1] / 2, peca.p[2]];
      else if (papel.startsWith('asa'))
        pivo = [
          peca.p[0] - Math.sign(peca.p[0] || (papel === 'asa0' ? 1 : -1)) * (peca.t[0] / 2),
          peca.p[1],
          peca.p[2],
        ];
      else pivo = [peca.p[0], peca.p[1], peca.p[2]];
      // pernas do mesmo lado do passo giram juntas no eixo x: o x do pivô não importa
      const chave = `${papel ?? ''}|${pivo.map((v) => v.toFixed(3)).join(',')}`;
      let g = grupos.get(chave);
      if (!g) {
        g = { pivo, papel, pecas: [] };
        grupos.set(chave, g);
      }
      g.pecas.push(peca);
    }
    let n = 0;
    const partes = [...grupos.values()].map((g) => {
      const no = new TransformNode(`criatura-${c.id}-g${n++}`, scene);
      no.parent = raiz;
      no.position.set(g.pivo[0], g.pivo[1], g.pivo[2]);
      const porClasse: Record<'plastico' | 'suave' | 'forte', Mesh[]> = {
        plastico: [],
        suave: [],
        forte: [],
      };
      for (const peca of g.pecas) {
        const [w, h, d] = peca.t;
        const maior = Math.max(w, h, d);
        const nome = `criatura-${c.id}-p${n++}`;
        const malha =
          peca.forma === 'bola'
            ? esfera(nome, scene, maior / 2, plastico, [w / maior, h / maior, d / maior])
            : caixaArredondada(nome, scene, w, h, d, peca.raio, plastico, 3);
        malha.position.set(peca.p[0] - g.pivo[0], peca.p[1] - g.pivo[1], peca.p[2] - g.pivo[2]);
        if (peca.rot) malha.rotation.set(peca.rot[0], peca.rot[1], peca.rot[2]);
        const cor = corBase(peca.cor);
        const nv = malha.getTotalVertices();
        const cores = new Float32Array(nv * 4);
        for (let k = 0; k < nv; k++) cores.set([cor.r, cor.g, cor.b, 1], k * 4);
        malha.setVerticesData(VertexBuffer.ColorKind, cores);
        const b = peca.brilho ?? 0;
        porClasse[b > 0.45 ? 'forte' : b > 0 ? 'suave' : 'plastico'].push(malha);
      }
      const malhas: Mesh[] = [];
      for (const [classe, lista] of Object.entries(porClasse) as [
        'plastico' | 'suave' | 'forte',
        Mesh[],
      ][]) {
        if (!lista.length) continue;
        const fundida =
          lista.length === 1
            ? lista[0]
            : Mesh.MergeMeshes(lista, true, true, undefined, false, false);
        if (!fundida) continue;
        fundida.parent = no;
        fundida.material = classe === 'plastico' ? plastico : classe === 'suave' ? suave : forte;
        fundida.isPickable = false;
        if (classe === 'forte') incluirNoGlow(fundida);
        else excluirDoGlow(fundida);
        malhas.push(fundida);
      }
      return { no, malhas, papel: g.papel };
    });
    return {
      raiz,
      partes,
      plastico,
      proprios: [plastico, suave, forte],
      substitui: new Set([plastico, suave]),
      fase: 0,
      ultX: c.x,
      ultZ: c.z,
      vel: 0,
      amp: 0,
      quadro: 0,
    };
  }

  let proximaEstatua = -1;
  return {
    /** Modelo parado de uma criatura (vitrine dos testes): o mesmo desenho do jogo. */
    estatua(
      tipo: Criatura['tipo'],
      x: number,
      y: number,
      z: number,
      yaw: number,
      /** Morador da vitrine: a profissão e o número dele no povoado (sorteia o boneco). */
      morador?: { profissao: Profissao; n: number },
    ): void {
      const c = {
        id: proximaEstatua--,
        tipo,
        x,
        z,
        ...(morador && { morador: { povoado: 'vitrine', ...morador } }),
      } as Criatura;
      if (tipo === 'morador') {
        // o morador é o boneco do jogador com as peças do tema (como no povoado), parado
        const mb = montarMorador(c);
        const pose = mb.animador.atualizar(0, {
          velocidadeHoriz: 0,
          correndo: false,
          noChao: true,
          voando: false,
        });
        mb.boneco.aplicarPose(pose, { dt: 0, olhar: 0, vista: mb.animador.vista() });
        mb.boneco.posicionar(x, y, z, yaw);
        mb.boneco.definirLuz(1);
        return;
      }
      const m = montar(c);
      m.raiz.position.set(x, y, z);
      m.raiz.rotation.y = yaw;
    },
    /** Spec 015: o morador acena (o boneco toca o gesto e o balão aparece). */
    gesto(id: number, g: IdGesto): boolean {
      const mb = moradores.get(id);
      if (!mb) return false;
      fazerGesto(mb.animador, g);
      // o balão do morador fica atrás das paredes (o de dentro de casa não aparece)
      (mb.balao ??= criarBalao(scene, mb.boneco.raiz, undefined, false)).mostrar(g);
      return true;
    },
    /** Spec 015: gesto em curso e balão de cada morador desenhado (testes). */
    gestosMoradores(): { id: number; gesto: IdGesto | null; balao: IdGesto | null }[] {
      return [...moradores].map(([id, mb]) => ({
        id,
        gesto: gestoDoAnimador(mb.animador),
        balao: mb.balao?.gesto ?? null,
      }));
    },
    atualizar(
      lista: readonly Criatura[],
      dt: number,
      tempo: number,
      luz: (c: Criatura) => number,
    ): void {
      quadro++;
      montadasNoQuadro = 0;
      prepararVista();
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
          // o animador anda sempre (o passo segue de onde estava); as juntas só na vista
          if (!foraDaVista(c.x, c.y + 1, c.z))
            mb.boneco.aplicarPose(pose, { dt, olhar: 0, vista: mb.animador.vista() });
          mb.boneco.posicionar(c.x, c.y, c.z, c.yaw);
          mb.balao?.atualizar(dt);
          const l = luz(c);
          if (Math.abs(l - mb.luz) > 0.002) {
            mb.luz = l;
            mb.boneco.definirLuz(l);
          }
          const morrer = c.estado === 'morrendo' ? c.dissolver : 0;
          mb.boneco.raiz.scaling.setAll(1 - morrer * 0.8);
          const ferido = c.ferida > 0;
          if (ferido !== mb.ferido) {
            mb.ferido = ferido;
            for (const mm of mb.malhas) {
              mm.renderOverlay = ferido;
              if (ferido) {
                mm.overlayColor = COR_FERIDA;
                mm.overlayAlpha = 0.55;
              }
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
        escolherLonge(m, c.x, c.y + 0.5, c.z);
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
        // escurece nas cavernas (luz aproximada): um material por bicho
        {
          const mat = m.plastico;
          mat.diffuseColor.set(l * 0.78, l * 0.78, l * 0.78);
          // criatura da noite: plástico que brilha no escuro (não some no breu, não estoura)
          const e = c.tipo === 'espectro' ? Math.max(l * 0.36, 0.5) : l * 0.36;
          mat.emissiveColor.set(e, e, e);
          mat.specularColor.set(0.22 * l, 0.22 * l, 0.22 * l);
        }
        // atrás da câmera e longe: as patas e a cabeça ficam como estão neste quadro
        // (de longe também: a pose de descanso já está na malha de longe)
        const animar = !m.emLonge && !foraDaVista(c.x, c.y + 0.5, c.z);
        for (const p of m.partes) {
          if (animar)
            switch (p.papel) {
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
          for (const malha of p.malhas) {
            malha.renderOverlay = c.ferida > 0;
            if (malha.renderOverlay) {
              malha.overlayColor = COR_FERIDA;
              malha.overlayAlpha = 0.55;
            }
            malha.visibility = c.tipo === 'espectro' ? 1 - morrer : 1;
          }
        }
        if (m.emLonge && m.longe)
          for (const f of m.longe) {
            f.renderOverlay = c.ferida > 0;
            if (f.renderOverlay) {
              f.overlayColor = COR_FERIDA;
              f.overlayAlpha = 0.55;
            }
            f.visibility = c.tipo === 'espectro' ? 1 - morrer : 1;
          }
      }
      for (const [id, mb] of moradores) {
        if (mb.quadro === quadro) continue;
        mb.balao?.descartar();
        mb.boneco.descartar();
        moradores.delete(id);
      }
      for (const [id, m] of modelos) {
        if (m.quadro === quadro) continue;
        for (const p of m.partes) {
          for (const malha of p.malhas) malha.dispose();
          p.no.dispose();
        }
        if (m.longe) for (const f of m.longe) f.dispose();
        for (const mat of m.proprios) mat.dispose();
        m.raiz.dispose();
        modelos.delete(id);
      }
    },
  };
}
