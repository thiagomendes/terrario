/**
 * Esboço da spec 037 "Construir melhor" (só com `?esboco=primeira-pessoa`): a câmera em
 * primeira pessoa, num botão com um olhinho. O `main.ts` importa este arquivo sob demanda: vira
 * um pedaço à parte que o jogo nunca baixa.
 *
 * Tudo é o jogo de verdade: a câmera solta de hoje (girar, arrastar, o mesmo controle) continua
 * mandando no olhar; o esboço só leva a câmera que desenha a tela para dentro da cabeça do
 * boneco, esconde a cabeça dele e põe na frente dos olhos o braço de um segundo boneco de
 * verdade, com a mesma roupa e o mesmo item na mão (as peças, a junta e o desenho do item são os
 * do boneco: `criarBoneco` e `definirNaMao`).
 *
 * O dono escolheu a variante A (24 nov): a mão vazia some e só entra para agir (tocar, colocar,
 * acenar, comer); com item, aparece uma mão só. A A2 (cotovelo de dois ossos e a manga esticada)
 * ficou desproporcional; agora ele compara duas opções de braço, os botões "1" e "2":
 * - 1, articulação leve: o braço do boneco, do tamanho dele, é o antebraço; um pedaço da manga
 *   dele, sem esticar, é a parte de cima. O cotovelo dobra pouco e macio (a bolinha do ombro do
 *   boneco cobre a junta) e aparece perto da beira; a parte de cima sai da tela.
 * - 2, sem articulação: só o braço do boneco, inteiro e do tamanho dele, girando do ombro, que
 *   fica fora da tela, à direita.
 * Nas duas: a mão e a manga na mesma proporção do boneco em terceira pessoa (a mesma escala nas
 * três direções, nada esticado), a mola discreta (desce um tico ao começar a andar, sobe no pulo,
 * afunda e volta ao pousar), no passo só um sobe e desce leve (nada de balanço de lado), a mira
 * de colocar, a câmera solta e a entrada e a saída pela cabeça.
 */
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Matrix, Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import type { GlowLayer } from '@babylonjs/core/Layers/glowLayer';
import type { GanchoPrimeiraPessoa } from '../render/cena';
import type { Personagem } from '../render/personagem';
import { criarBoneco } from '../render/boneco';
import type { Aparencia } from '../personagem/aparencia';

export type Opcao = '1' | '2';

interface EsbocoPrimeiraPessoa {
  /** Liga (true) ou desliga a primeira pessoa, com a transição. */
  primeira(sim: boolean): void;
  ligada(): boolean;
  /** 0 em terceira pessoa, 1 dentro da cabeça (a transição no meio). */
  fracao(): number;
  /** A opção de braço: 1 com articulação leve, 2 sem articulação. */
  opcao(o: Opcao): void;
  /** Peso da mão na tela (0 fora, 1 inteira). */
  maos(): { direita: number; esquerda: number };
  /** A célula onde o bloco entra se a criança tocar no meio da tela (null sem mira). */
  mira(): [number, number, number] | null;
  /** Malhas e triângulos do que o esboço soma. */
  custo(): { malhas: number; triangulos: number };
  /** Onde a mão, o cotovelo e o ombro caem na tela (px), para conferir que nada sobra. */
  tela(): Record<string, [number, number]>;
  /** Só para as fotos de ajuste: segura o braço numa pose (null solta). */
  forcar(p: NomePose | null): void;
}
type NomePose = 'FORA' | 'SEGURAR' | 'RELAXADA' | 'ALCANCAR' | 'ACENAR' | 'COMER';

declare global {
  interface Window {
    __primeiraPessoa?: EsbocoPrimeiraPessoa;
  }
}

// ------------------------------------------------------------------ números do esboço
/** A entrada e a saída pela cabeça (s). */
const DURACAO_TRANSICAO = 0.7;
/** A mão vai até o lugar do bloco e volta (s). */
const DURACAO_ALCANCE = 0.45;
/** Os olhos um pouco à frente da cabeça: olhando para baixo, aparece a frente do corpo e os pés. */
const FRENTE_OLHOS = 0.1;
const FRENTE_OLHANDO_BAIXO = 0.32;
/** E descem um pouco (blocos), como quem abaixa a cabeça para se ver. */
const DESCE_OLHANDO_BAIXO = 0.3;
/** Bem no fim do olhar para baixo: a cabeça vai mais à frente e o olhar passa um tico da vertical. */
const FRENTE_CURVADO = 0.3;
const PITCH_CURVADO = 0.55;
/** O sobe e desce do passo (blocos), por passada. Nada de balanço de lado. */
const BALANCO_ALTURA = 0.02;
/** Pouso: quanto a câmera abaixa (blocos) por segundo de queda, no máximo POUSO_MAXIMO. */
const POUSO_POR_SEGUNDO = 0.14;
const POUSO_MAXIMO = 0.09;
/** Olhando mais para baixo que isto, a mão sai de vista (o braço do corpo aparece). */
const PITCH_SEM_MAO = 0.85;
/**
 * O braço da frente é o do boneco, em miniatura e com a mesma escala nas três direções: a mão e
 * a manga ficam na proporção do boneco em terceira pessoa. Desenha por cima do mundo (nunca entra
 * na parede).
 */
const ESCALA_VISTA = 0.19;
/** O item na mão da frente, um pouco menor que o da mão do boneco (não tapa a obra). */
const ESCALA_ITEM = 0.85;
/** Deitado, o braço inteiro um pouco maior (a mão e a manga crescem juntas). */
const ESCALA_DEITADO = 1.37;
/** Do ombro à junta da mão, nas medidas do boneco (a escala vem da matriz). */
const BRACO = 0.27;
/** Na opção 1, a parte de cima (a manga do outro braço, sem esticar) até o cotovelo. */
const BRACO_CIMA = 0.2;

/**
 * Uma pose do braço na tela: onde a mão fica (x e y de -1 a 1 na tela, `d` à frente dos olhos),
 * para onde o braço volta a partir da mão (`u`, no espaço da câmera: x direita, y cima, z frente),
 * quanto o cotovelo dobra (`dobra`, só na opção 1) e para onde a frente da mão aponta (`frente`).
 */
interface PoseMao {
  sx: number;
  sy: number;
  d: number;
  u: [number, number, number];
  dobra: number;
  frente: [number, number, number];
}
const pose = (
  sx: number,
  sy: number,
  d: number,
  u: [number, number, number],
  dobra = 0,
  frente: [number, number, number] = [-0.9, 0.2, -0.45],
): PoseMao => ({ sx, sy, d, u, dobra, frente });

/**
 * As poses de cada opção (no celular em pé; a faixa de baixo é do controle, dos botões e da barra:
 * a mão fica logo acima deles, à direita, e o braço sai pela beira direita, acima dos botões).
 */
const POSES: Record<Opcao, Record<NomePose, PoseMao>> = {
  // 1: o antebraço inteiro na tela, o cotovelo perto da beira, a parte de cima saindo
  '1': {
    FORA: pose(0.55, -1.35, 0.27, [1, -0.7, -0.4], 0.4),
    SEGURAR: pose(0.25, -0.2, 0.28, [1, -0.5, -0.15], 0.4),
    RELAXADA: pose(0.4, -0.45, 0.27, [1, -0.55, -0.2], 0.4),
    ALCANCAR: pose(0.16, -0.1, 0.34, [1, -0.35, -0.05], 0.3),
    ACENAR: pose(0.3, -0.02, 0.27, [0.8, -1, -0.1], 0.45, [-0.1, 0, -1]),
    COMER: pose(0.1, -0.22, 0.23, [1, -0.35, -0.1], 0.4, [-0.5, 0.3, -1]),
  },
  // 2: o braço inteiro, o ombro fora da tela à direita
  '2': {
    FORA: pose(0.7, -1.35, 0.27, [1, -0.7, -0.6]),
    SEGURAR: pose(0.48, -0.25, 0.28, [1, -0.6, -0.8]),
    RELAXADA: pose(0.55, -0.45, 0.27, [1, -0.6, -0.8]),
    ALCANCAR: pose(0.42, -0.18, 0.33, [1, -0.4, -0.15]),
    ACENAR: pose(0.5, -0.08, 0.27, [1, -1.1, -0.1], 0, [-0.1, 0, -1]),
    COMER: pose(0.32, -0.22, 0.23, [1, -0.5, -0.4], 0, [-0.5, 0.3, -1]),
  },
};

const mistura3 = (a: [number, number, number], b: [number, number, number], t: number) =>
  [0, 1, 2].map((i) => a[i] + (b[i] - a[i]) * t) as [number, number, number];
const misturar = (a: PoseMao, b: PoseMao, t: number): PoseMao => ({
  sx: a.sx + (b.sx - a.sx) * t,
  sy: a.sy + (b.sy - a.sy) * t,
  d: a.d + (b.d - a.d) * t,
  u: mistura3(a.u, b.u, t),
  dobra: a.dobra + (b.dobra - a.dobra) * t,
  frente: mistura3(a.frente, b.frente, t),
});
const suave = (t: number) => {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
};
const aproximar = (a: number, b: number, taxa: number, dt: number) =>
  a + (b - a) * (1 - Math.exp(-taxa * dt));
const v3 = (a: [number, number, number]) => new Vector3(a[0], a[1], a[2]);
/** A frente da manga (o +z do boneco) olha para a câmera: o punho e a costura ficam de frente. */
const FRENTE_MANGA = new Vector3(0, 0.2, -1);

export function prepararEsbocoPrimeiraPessoa(): void {
  const esperar = () => {
    const g = window.__brumaluz?.primeiraPessoa;
    if (!g || !window.__brumaluz?.ready) {
      setTimeout(esperar, 300);
      return;
    }
    ligar(g);
  };
  esperar();
}

function ligar(g: GanchoPrimeiraPessoa): void {
  const { scene, visao, olhos } = g;
  let opcao: Opcao = '1';
  let ligado = false;
  let t = 0;
  // nada do esboço entra no brilho da tela (o halo borrava a mão e o contorno da mira)
  const glow = scene.effectLayers?.find((l) => l.name === 'glow') as GlowLayer | undefined;
  const semBrilho = (m: AbstractMesh) => {
    if (m.name.startsWith('esb-pp')) glow?.addExcludedMesh(m as Mesh);
  };
  scene.onNewMeshAddedObservable.add(semBrilho);
  // ---------------------------------------------------------------- o braço na frente dos olhos
  // a mão desenha por cima do mundo (nunca entra na parede): um grupo de desenho próprio
  const GRUPO = 2;
  scene.setRenderingAutoClearDepthStencil(GRUPO, true, true, true);
  const suporte = new TransformNode('esb-pp-suporte', scene);
  suporte.parent = visao;
  let vista: Personagem | null = null;
  let aparenciaDaVista: Aparencia | null = null;
  // D: o braço do boneco (na opção 2 é o braço inteiro; na 1, o antebraço). E: na opção 1, a
  // parte de cima (a manga do outro braço, sem a mão e sem o punho)
  const ossos: Record<'D' | 'E', TransformNode> = {
    D: new TransformNode('esb-pp-ossoD', scene),
    E: new TransformNode('esb-pp-ossoE', scene),
  };
  ossos.D.parent = suporte;
  ossos.E.parent = suporte;
  let malhasBraco: Record<'D' | 'E', AbstractMesh[]> = { D: [], E: [] };
  /** Do ombro à junta da mão (medidas do boneco). */
  let comprimento = BRACO;
  let k = 0.2;
  /** A junta da mão da frente: fica sempre de pé na tela (o item não deita com o braço). */
  let juntaMao: TransformNode | null = null;
  const matrizOsso = new Matrix();
  const matrizMao = new Matrix();
  /**
   * A mão e o item de pé na tela, com a frente da mão (+z do boneco, onde o item fica) para o
   * lado de `frente`: o braço gira, a mão não deita junto.
   */
  const orientarMao = (frente: Vector3) => {
    if (!juntaMao || !ossos.D.rotationQuaternion) return;
    const z = frente.normalizeToNew();
    const cima = new Vector3(0, 1, 0);
    const y = cima.subtract(z.scale(Vector3.Dot(cima, z))).normalize();
    const x = Vector3.Cross(y, z).normalize();
    Quaternion.RotationQuaternionFromAxis(x, y, z).toRotationMatrix(matrizMao);
    ossos.D.rotationQuaternion.toRotationMatrix(matrizOsso);
    // a mão é filha do osso: local = desejada × inversa do osso (a inversa de giro é a transposta)
    const local = matrizMao.multiply(matrizOsso.transpose());
    juntaMao.rotationQuaternion = Quaternion.FromRotationMatrix(local);
  };
  // a luz do jogador (de noite, na caverna) vale também para o braço da frente: o jogo passa a
  // luz ao boneco a cada quadro, e o esboço repassa a mesma ao braço
  let luz = 1;
  const definirLuzJogo = g.personagem.definirLuz.bind(g.personagem);
  g.personagem.definirLuz = (f: number) => {
    luz = f;
    definirLuzJogo(f);
    vista?.definirLuz(f);
  };
  const montarVista = (a: Aparencia) => {
    vista?.descartar();
    aparenciaDaVista = a;
    // o mesmo boneco do jogador (sem o brinquedo de andar: só o braço aparece)
    const semMontar: Aparencia = { ...a };
    delete semMontar.montado;
    // (sem fundir: a mão fica numa junta própria)
    vista = criarBoneco(scene, semMontar, 'esb-pp', undefined, false, true);
    const todas = vista.raiz.getChildMeshes(false);
    const escala = scene.getTransformNodeByName('esb-pp-escala')?.scaling.x ?? 1.15;
    k = escala * ESCALA_VISTA;
    malhasBraco = { D: [], E: [] };
    for (const lado of ['D', 'E'] as const) {
      const braco = scene.getTransformNodeByName(`esb-pp-junta-braco${lado}`);
      if (!braco) continue;
      braco.parent = ossos[lado];
      braco.position.setAll(0);
      braco.rotation.setAll(0);
      // a mesma escala nas três direções: nada estica
      ossos[lado].scaling.setAll(k);
      const mao = scene.getTransformNodeByName(`esb-pp-junta-mao${lado}`);
      if (lado === 'D') {
        juntaMao = mao;
        comprimento = mao ? -mao.position.y : BRACO;
      } else mao?.setEnabled(false);
    }
    vista.noDaMao().scaling.setAll(ESCALA_ITEM);
    for (const m of todas) {
      const lado = (['D', 'E'] as const).find((l) => {
        const b = scene.getTransformNodeByName(`esb-pp-junta-braco${l}`);
        return b && m.isDescendantOf(b);
      });
      // na parte de cima, o punho sai (no cotovelo não há punho: a junta fica lisa)
      if (!lado || (lado === 'E' && /punho|mao/.test(m.name))) m.setEnabled(false);
      else malhasBraco[lado].push(m);
    }
    for (const m of todas) semBrilho(m);
    vista.definirLuz(luz);
    marcarGrupo();
  };
  const marcarGrupo = () => {
    for (const lado of ['D', 'E'] as const)
      for (const m of ossos[lado].getChildMeshes(false)) {
        m.renderingGroupId = GRUPO;
        m.isPickable = false;
        m.alwaysSelectAsActiveMesh = true;
        semBrilho(m);
      }
  };

  // ---------------------------------------------------------------- a sombra no chão
  const texSombra = new DynamicTexture('esb-pp-sombra', { width: 64, height: 64 }, scene, false);
  {
    const c = texSombra.getContext() as CanvasRenderingContext2D;
    const grad = c.createRadialGradient(32, 32, 2, 32, 32, 31);
    grad.addColorStop(0, 'rgba(0,0,0,0.55)');
    grad.addColorStop(0.6, 'rgba(0,0,0,0.3)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    c.clearRect(0, 0, 64, 64);
    c.fillStyle = grad;
    c.fillRect(0, 0, 64, 64);
    texSombra.hasAlpha = true;
    texSombra.update();
  }
  const matSombra = new StandardMaterial('esb-pp-sombra', scene);
  matSombra.diffuseTexture = texSombra;
  matSombra.useAlphaFromDiffuseTexture = true;
  matSombra.diffuseColor = Color3.Black();
  matSombra.specularColor = Color3.Black();
  matSombra.emissiveColor = Color3.Black();
  matSombra.disableLighting = true;
  matSombra.zOffset = -2;
  const sombra = MeshBuilder.CreateGround('esb-pp-sombra', { width: 0.9, height: 0.9 }, scene);
  sombra.material = matSombra;
  sombra.isPickable = false;
  sombra.setEnabled(false);

  // ---------------------------------------------------------------- estado do quadro
  let fase = 0;
  let noArDesde = -1;
  let pouso = 0;
  let pousoVel = 0;
  let peso = 0;
  let chaveMao = '';
  /** Trocar de item: 0 parado; sobe de 0 a 1 (desce até 0,5, troca, sobe de volta). */
  let troca = -1;
  let pendente: ReturnType<GanchoPrimeiraPessoa['naMao']> | null = null;
  let golpeAntes = 0;
  /** O impulso de tocar ou colocar (0 a 1; -1 parado). */
  let alcance = -1;
  /** A mola do braço (na tela, de -1 a 1) e o passo suavizado (o atraso ao começar a andar). */
  let mola = 0;
  let molaVel = 0;
  let passadaLenta = 0;
  /** Onde as peças caíram na tela no último quadro (px). */
  const naTela: Record<string, [number, number]> = {};
  let forcada: NomePose | null = null;

  // ---------------------------------------------------------------- a mira de colocar
  // onde o bloco vai entrar se a criança tocar no meio da tela: um contorno de gomos finos e
  // claros na célula, com o miolo bem de leve (a mesma conta do toque: `preverToque`). A
  // grossura do gomo acompanha a distância: de perto fica fino (não toma meia tela) e, fora do
  // brilho da tela, não borra.
  const matMira = new StandardMaterial('esb-pp-mira', scene);
  matMira.diffuseColor = Color3.Black();
  matMira.emissiveColor = new Color3(0.96, 0.96, 0.92);
  matMira.specularColor = Color3.Black();
  matMira.disableLighting = true;
  matMira.alpha = 0.85;
  const matMiolo = new StandardMaterial('esb-pp-mira-miolo', scene);
  matMiolo.emissiveColor = new Color3(1, 1, 0.92);
  matMiolo.diffuseColor = Color3.Black();
  matMiolo.specularColor = Color3.Black();
  matMiolo.disableLighting = true;
  matMiolo.alpha = 0.12;
  const contornos = new Map<number, Mesh>();
  const contornoDe = (nivel: number): Mesh => {
    let c = contornos.get(nivel);
    if (c) return c;
    const G = nivel * 0.004;
    const barras: Mesh[] = [];
    for (const eixo of [0, 1, 2])
      for (const a of [0, 1])
        for (const b of [0, 1]) {
          const tam = [G, G, G];
          tam[eixo] = 1 + G;
          const bar = MeshBuilder.CreateBox('esb-pp-mira-barra', { width: tam[0], height: tam[1], depth: tam[2] }, scene);
          const pos = [a - 0.5, b - 0.5, 0];
          const p3 = eixo === 0 ? [0, pos[0], pos[1]] : eixo === 1 ? [pos[0], 0, pos[1]] : [pos[0], pos[1], 0];
          bar.position.set(p3[0], p3[1], p3[2]);
          barras.push(bar);
        }
    c = Mesh.MergeMeshes(barras, true)!;
    c.name = 'esb-pp-mira';
    c.material = matMira;
    c.isPickable = false;
    c.setEnabled(false);
    semBrilho(c);
    contornos.set(nivel, c);
    return c;
  };
  let contorno: Mesh | null = null;
  const miolo = MeshBuilder.CreateBox('esb-pp-mira-miolo', { size: 0.98 }, scene);
  miolo.material = matMiolo;
  miolo.isPickable = false;
  miolo.setEnabled(false);
  let celulaMira: [number, number, number] | null = null;
  const pontoMira = document.createElement('div');
  pontoMira.className = 'esb-pp-ponto';
  pontoMira.hidden = true;
  document.body.appendChild(pontoMira);
  function atualizarMira(ligada: boolean): void {
    const e = window.__brumaluz;
    let cel: [number, number, number] | null = null;
    if (ligada && e?.preverToque) {
      const r = scene.getEngine().getRenderingCanvas()!.getBoundingClientRect();
      const prev = e.preverToque(r.width / 2, r.height / 2);
      const a = prev.alvo;
      if (a) cel = [a.x + a.normal.x, a.y + a.normal.y, a.z + a.normal.z];
      // a célula onde a própria criança está não recebe bloco: o contorno não aparece ali
      const j = g.jogador();
      if (
        cel &&
        cel[0] < j.x + 0.3 &&
        cel[0] + 1 > j.x - 0.3 &&
        cel[2] < j.z + 0.3 &&
        cel[2] + 1 > j.z - 0.3 &&
        cel[1] < j.y + 1.8 &&
        cel[1] + 1 > j.y
      )
        cel = null;
    }
    celulaMira = cel;
    pontoMira.hidden = !ligada;
    if (!cel) {
      contorno?.setEnabled(false);
      miolo.setEnabled(false);
      return;
    }
    const centro = new Vector3(cel[0] + 0.5, cel[1] + 0.5, cel[2] + 0.5);
    const dist = Vector3.Distance(centro, visao.position);
    // ~2 px de gomo no celular, de perto ou de longe (de 0,012 a 0,04 bloco)
    const nivel = Math.round(Math.min(10, Math.max(3, dist * 1.4)));
    const c = contornoDe(nivel);
    if (c !== contorno) {
      contorno?.setEnabled(false);
      contorno = c;
    }
    c.setEnabled(true);
    c.position.copyFrom(centro);
    miolo.setEnabled(true);
    miolo.position.copyFrom(centro);
    // de perto o miolo some (não vela a tela)
    matMiolo.alpha = 0.12 * suave((dist - 1.6) / 1.4);
    // respira bem devagar (nada de piscar)
    const tt = performance.now() / 1000;
    matMira.alpha = 0.78 + Math.sin(tt * 2.4) * 0.12;
  }
  // a cabeça e os braços do boneco de verdade: some a junta inteira (com o que estiver preso
  // nela, como a comida mordida), e o boneco continua inteiro para os amigos
  const junta = (n: string) => scene.getTransformNodeByName(`personagem-junta-${n}`);
  const mostrarCorpo = (cabeca: boolean, bracos: boolean) => {
    junta('cabeca')?.setEnabled(cabeca);
    junta('bracoD')?.setEnabled(bracos);
    junta('bracoE')?.setEnabled(bracos);
  };

  /**
   * Gira o osso (que pende para -y) para apontar de `de` até `ate`, com a frente (+z do boneco)
   * para o lado de `frente`, e o põe em `de`.
   */
  const apontarOsso = (o: TransformNode, de: Vector3, ate: Vector3, frente: Vector3) => {
    const y = de.subtract(ate).normalize();
    let z = frente.subtract(y.scale(Vector3.Dot(frente, y)));
    if (z.lengthSquared() < 1e-8) z = new Vector3(0, 0, -1);
    z.normalize();
    const x = Vector3.Cross(y, z).normalize();
    o.rotationQuaternion = Quaternion.RotationQuaternionFromAxis(x, y, z);
    o.position.copyFrom(de);
  };
  const projetar = (p: Vector3): [number, number] => {
    const tanV = Math.tan(visao.fov / 2);
    const r = scene.getEngine().getRenderingCanvas()!.getBoundingClientRect();
    const tanH = tanV * (r.width / r.height);
    return [
      Math.round((r.width / 2) * (1 + p.x / (p.z * tanH))),
      Math.round((r.height / 2) * (1 - p.y / (p.z * tanV))),
    ];
  };
  /**
   * Põe o braço na pose `p`, com a mão deslocada `sobe` e `abana` (na tela) pela mola, pelo passo
   * e pelo aceno. O movimento vem do ombro: o ombro fica onde a pose o põe e o braço gira nele
   * até a mão; na opção 1 o cotovelo dobra um tico a mais ou a menos (nada estica).
   */
  const posicionarBraco = (p: PoseMao, sobe: number, abana: number) => {
    const tanV = Math.tan(visao.fov / 2);
    const aspecto = scene.getEngine().getAspectRatio(visao);
    // deitado, a tela é baixa e larga: a beira de baixo é dos botões e da barra, e a direita fica
    // longe. A mão vai mais para a direita (acima dos botões) e o braço, um pouco maior (na mesma
    // proporção), sai pela beira direita como em pé
    const deitado = aspecto > 1;
    const tanH = tanV * Math.min(aspecto, 0.8);
    const kk = k * (deitado ? ESCALA_DEITADO : 1);
    ossos.D.scaling.setAll(kk);
    ossos.E.scaling.setAll(kk);
    const sx = deitado ? (0.45 + p.sx * 0.55) * (tanV * aspecto) / tanH : p.sx;
    const mao = new Vector3(sx * p.d * tanH, p.sy * p.d * tanV, p.d);
    const u = v3(p.u).normalize();
    const frente = v3(p.frente);
    const l2 = comprimento * kk;
    const alvo = mao.add(new Vector3(abana * p.d * tanH, sobe * p.d * tanV, 0));
    if (opcao === '2') {
      // o braço inteiro, de uma peça: o ombro fica parado e o braço gira nele até a mão
      const ombro = mao.add(u.scale(l2));
      const dir = ombro.subtract(alvo).normalize();
      const fim = ombro.subtract(dir.scale(l2));
      apontarOsso(ossos.D, ombro, fim, FRENTE_MANGA);
      orientarMao(frente);
      naTela.mao = projetar(fim);
      naTela.ombro = projetar(ombro);
      delete naTela.cotovelo;
      return;
    }
    // opção 1: o antebraço (o braço do boneco) e a parte de cima (a manga, sem esticar), com o
    // cotovelo dobrado pouco; o ombro fica onde a pose o põe e a mão vai até o alvo
    const l1 = BRACO_CIMA * kk;
    const cotovelo0 = mao.add(u.scale(l2));
    const baixo = new Vector3(0, -0.6, -0.8);
    const n = baixo.subtract(u.scale(Vector3.Dot(baixo, u))).normalize();
    const w = u.scale(Math.cos(p.dobra)).add(n.scale(Math.sin(p.dobra))).normalize();
    const ombro = cotovelo0.add(w.scale(l1));
    // o lado para onde o cotovelo aponta (o da pose)
    const meio = ombro.add(mao.subtract(ombro).scale(l1 / (l1 + l2)));
    const dica = cotovelo0.subtract(meio);
    let r = alvo.subtract(ombro);
    let dist = r.length();
    const max = (l1 + l2) * 0.995;
    let fim = alvo;
    if (dist > max) {
      r = r.scale(max / dist);
      dist = max;
      fim = ombro.add(r);
    }
    const dir = r.scale(1 / dist);
    const a = (l1 * l1 - l2 * l2 + dist * dist) / (2 * dist);
    const h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
    const perp = dica.subtract(dir.scale(Vector3.Dot(dica, dir)));
    if (perp.lengthSquared() < 1e-10) perp.set(0, -1, 0);
    const cotovelo = ombro.add(dir.scale(a)).add(perp.normalize().scale(h));
    apontarOsso(ossos.E, ombro, cotovelo, FRENTE_MANGA);
    apontarOsso(ossos.D, cotovelo, fim, FRENTE_MANGA);
    orientarMao(frente);
    naTela.mao = projetar(fim);
    naTela.cotovelo = projetar(cotovelo);
    naTela.ombro = projetar(ombro);
  };

  /** O corpo está com partes escondidas (volta inteiro ao sair). */
  let cheio = false;
  g.quadro = (dt) => {
    const alvoT = ligado ? 1 : 0;
    const passo = dt / DURACAO_TRANSICAO;
    t = alvoT > t ? Math.min(1, t + passo) : Math.max(0, t - passo);
    const e = suave(t);
    const jog = g.jogador();
    const v = g.vista();
    const vel = g.velocidade();
    const pitch = olhos.rotation.x;
    const yaw = olhos.rotation.y;
    const ap = g.aparencia();
    if (e <= 0) {
      if (cheio) mostrarCorpo(true, true);
      cheio = false;
      visao.updateUpVectorFromRotation = false;
      visao.upVector.set(0, 1, 0);
      g.travarYaw(null);
      sombra.setEnabled(false);
      for (const lado of ['D', 'E'] as const) for (const m of malhasBraco[lado]) m.setEnabled(false);
      peso = 0;
      atualizarMira(false);
      return;
    }
    if (!vista || ap !== aparenciaDaVista) montarVista(ap);
    // ---------------- a câmera entra pela cabeça (sem corte seco) e sobe e desce no passo
    if (jog.noChao) {
      if (noArDesde >= 0) {
        const noAr = performance.now() / 1000 - noArDesde;
        if (noAr > 0.25 && !jog.voando) {
          pousoVel -= Math.min(POUSO_MAXIMO * 9, noAr * POUSO_POR_SEGUNDO * 9);
          // o braço afunda junto e volta na mola
          molaVel -= Math.min(2.2, noAr * 3);
        }
      }
      noArDesde = -1;
    } else if (noArDesde < 0) noArDesde = performance.now() / 1000;
    // mola do pouso: abaixa rápido e volta macia
    pousoVel += (-pouso * 90 - pousoVel * 12) * dt;
    pouso = Math.max(-POUSO_MAXIMO, Math.min(0.02, pouso + pousoVel * dt));
    const passada = Math.min(1.4, v.passada) * (jog.noChao ? 1 : 0);
    fase += dt * (4.2 + vel * 0.9) * (passada > 0.05 ? 1 : 0);
    const bobY = Math.sin(fase * 2) * BALANCO_ALTURA * passada;
    // olhando para baixo, os olhos vão um pouco para a frente e descem: o peito largo do boneco
    // não tapa a barriga, os pés e o brinquedo de andar (como quem se inclina para se ver)
    const baixo = suave((pitch - 0.45) / 0.95);
    // e, no fim do olhar para baixo, a cabeça se curva para a frente e olha para trás, para os
    // pés: a roupa, as pernas e os sapatos sobem para o meio da tela, acima do controle
    const curva = suave((pitch - 1.0) / 0.45);
    const frente = FRENTE_OLHOS + FRENTE_OLHANDO_BAIXO * baixo + FRENTE_CURVADO * curva;
    const destino = new Vector3(
      olhos.position.x + Math.sin(yaw) * frente,
      olhos.position.y + bobY + pouso - DESCE_OLHANDO_BAIXO * baixo,
      olhos.position.z + Math.cos(yaw) * frente,
    );
    visao.position.copyFrom(Vector3.Lerp(visao.position, destino, e));
    visao.rotation.x = pitch + PITCH_CURVADO * curva * e;
    // (passando da vertical, o alto da tela continua sendo a frente: nada de virar de ponta-cabeça)
    visao.updateUpVectorFromRotation = curva > 0;
    if (curva <= 0) visao.upVector.set(0, 1, 0);
    // o corpo debaixo dos olhos: vira junto com o olhar
    const yawCorpo = window.__brumaluz?.yawBoneco?.() ?? yaw;
    g.travarYaw(e >= 1 ? yaw : yawCorpo + ((((yaw - yawCorpo + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI) - Math.PI) * e);
    g.personagem.definirOpacidade(1);
    // a cabeça some quando a câmera passa por ela
    // (os braços do corpo só aparecem olhando para baixo, quando a mão da frente já saiu: nunca
    // dois braços, e o ombro nunca entra na frente da câmera)
    const verBracos = suave((pitch - PITCH_SEM_MAO) / 0.25) > 0.5 || t < 0.55;
    mostrarCorpo(t <= 0.55, verBracos);
    cheio = true;
    // ---------------- a sombra no chão, debaixo dos pés
    const chao = acharChao(jog.x, jog.y, jog.z);
    if (chao !== null) {
      sombra.setEnabled(true);
      const altura = Math.max(0, jog.y - chao);
      const ks = Math.max(0.35, 1 - altura * 0.18);
      sombra.position.set(jog.x, chao + 0.015, jog.z);
      sombra.scaling.set(ks, 1, ks);
      matSombra.alpha = e * ks;
    } else sombra.setEnabled(false);
    // ---------------- a mão: o que ela faz agora
    const mao = g.naMao();
    const chave = `${mao.bloco ?? ''}|${mao.item ?? ''}`;
    const temItem = mao.bloco !== null || mao.item !== null;
    if (chave !== chaveMao) {
      if (chaveMao === '' && troca < 0) {
        vista!.definirNaMao(mao.bloco, mao.item, mao.qtd);
        // (o item também desenha por cima do mundo, junto com a mão)
        marcarGrupo();
        chaveMao = chave;
      } else {
        pendente = mao;
        if (troca < 0 || troca > 0.5) troca = troca < 0 ? 0 : 1 - troca;
        chaveMao = chave;
      }
    }
    if (troca >= 0) {
      const antes = troca;
      troca += dt / 0.5;
      if (antes < 0.5 && troca >= 0.5 && pendente) {
        vista!.definirNaMao(pendente.bloco, pendente.item, pendente.qtd);
        marcarGrupo();
        pendente = null;
      }
      if (troca >= 1) troca = -1;
    }
    const gesto = g.gesto();
    // tocar ou colocar: a mão vai até o lugar e volta num impulso próprio (o do corpo dura 0,2 s,
    // rápido demais para se ver de dentro)
    const golpe = v.golpe ?? v.colocar;
    if (golpe !== null && !golpeAntes) alcance = 0;
    golpeAntes = golpe !== null ? 1 : 0;
    if (alcance >= 0) alcance += dt / DURACAO_ALCANCE;
    if (alcance >= 1) alcance = -1;
    const agindo = alcance >= 0;
    const P = POSES[opcao];
    let base: PoseMao | null = null;
    if (gesto) base = P.ACENAR;
    else if (v.comer !== null) base = P.COMER;
    else if (agindo) {
      const f = Math.sin(Math.PI * Math.min(1, alcance));
      base = misturar(temItem ? P.SEGURAR : P.RELAXADA, P.ALCANCAR, f);
    } else if (temItem) base = P.SEGURAR;
    if (forcada) base = P[forcada];
    // olhando bem para baixo, a mão sai (o braço do próprio corpo aparece)
    const sumir = suave((pitch - PITCH_SEM_MAO) / 0.25);
    const quer = base ? (1 - sumir) * (troca >= 0 ? Math.abs(Math.cos(Math.PI * troca)) : 1) : 0;
    peso = aproximar(peso, quer * e, troca >= 0 ? 40 : 9, dt);
    // o braço acompanha o corpo com mola: um tico atrasado ao começar a andar (desce um pouco),
    // sobe um tico no pulo, afunda e volta ao pousar; no passo, só um sobe e desce bem leve
    // (nada de balançar de um lado para o outro)
    passadaLenta = aproximar(passadaLenta, passada, 2.5, dt);
    const alvoMola = (jog.noChao ? 0 : 0.07) - (passada - passadaLenta) * 0.06;
    molaVel += ((alvoMola - mola) * 70 - molaVel * 11) * dt;
    mola += molaVel * dt;
    const passoMao = -Math.abs(Math.sin(fase)) * 0.02 * passada;
    let abana = 0;
    if (gesto) abana = Math.sin((performance.now() / 1000) * 9) * 0.1 * peso;
    posicionarBraco(misturar(P.FORA, base ?? P.SEGURAR, peso), mola + passoMao, abana);
    const ver = peso > 0.02;
    for (const m of malhasBraco.D) m.setEnabled(ver);
    for (const m of malhasBraco.E) m.setEnabled(ver && opcao === '1');
    atualizarMira(temItem && mao.bloco !== null && e > 0.9);
  };

  function acharChao(x: number, y: number, z: number): number | null {
    const bloco = window.__brumaluz?.bloco;
    if (!bloco) return null;
    for (let kk = 0; kk < 8; kk++) {
      const yy = Math.floor(y + 0.01) - 1 - kk;
      if (bloco(Math.floor(x), yy, Math.floor(z))) return yy + 1;
    }
    return null;
  }

  // ---------------------------------------------------------------- os botões
  const estilo = document.createElement('style');
  estilo.textContent = `
    .esb-pp-olho { position: fixed; right: calc(14px + env(safe-area-inset-right)); top: 38%;
      width: 60px; height: 60px; border-radius: 50%; border: 3px solid #fff;
      background: rgba(40, 52, 78, 0.55); display: grid; place-items: center; z-index: 50;
      box-shadow: 0 3px 8px rgba(0,0,0,0.25); touch-action: manipulation; padding: 0; }
    .esb-pp-olho.ligado { background: #ffd34d; border-color: #fff; }
    .esb-pp-olho svg { width: 40px; height: 40px; }
    .esb-pp-ponto { position: fixed; left: 50%; top: 50%; width: 10px; height: 10px;
      margin: -5px 0 0 -5px; border-radius: 50%; background: #fff; z-index: 40;
      box-shadow: 0 0 0 2px rgba(36, 49, 77, 0.55); pointer-events: none; }
    .esb-pp-opcoes { position: fixed; left: calc(12px + env(safe-area-inset-left)); top: 118px;
      display: flex; gap: 8px; align-items: center; z-index: 50; padding: 6px 8px;
      border-radius: 14px; background: rgba(255, 255, 255, 0.85); font: 600 15px system-ui, sans-serif;
      color: #24314d; }
    .esb-pp-opcoes button { width: 40px; height: 40px; border-radius: 12px; border: 2px solid #8a93a6;
      background: #fff; font: 700 19px system-ui, sans-serif; color: #24314d; padding: 0; }
    .esb-pp-opcoes button.ativo { background: #3f7be0; border-color: #3f7be0; color: #fff; }
  `;
  document.head.appendChild(estilo);
  const olho = document.createElement('button');
  olho.className = 'esb-pp-olho';
  olho.setAttribute('aria-label', 'Ver de dentro');
  olho.dataset.esbOlho = '';
  // o olhinho: o branco do olho, a íris, a pupila e o brilho (o mesmo traço grosso dos ícones)
  olho.innerHTML = `<svg viewBox="0 0 40 40" aria-hidden="true">
    <path d="M3 20 Q20 4 37 20 Q20 36 3 20 Z" fill="#fff" stroke="#24314d" stroke-width="3" stroke-linejoin="round"/>
    <circle cx="20" cy="20" r="7.5" fill="#3f8be0" stroke="#24314d" stroke-width="2"/>
    <circle cx="20" cy="20" r="3.6" fill="#24314d"/>
    <circle cx="22.6" cy="17.4" r="1.8" fill="#fff"/>
  </svg>`;
  olho.addEventListener('pointerdown', (ev) => ev.stopPropagation());
  olho.addEventListener('click', (ev) => {
    ev.stopPropagation();
    api.primeira(!ligado);
  });
  document.body.appendChild(olho);
  // as duas opções de braço, só no esboço (para o dono comparar)
  const grupo = document.createElement('div');
  grupo.className = 'esb-pp-opcoes';
  grupo.innerHTML = '<span>Braço</span>';
  const botoes: Record<Opcao, HTMLButtonElement> = { '1': document.createElement('button'), '2': document.createElement('button') };
  for (const o of ['1', '2'] as const) {
    const b = botoes[o];
    b.textContent = o;
    b.dataset.esbOpcao = o;
    b.addEventListener('pointerdown', (ev) => ev.stopPropagation());
    b.addEventListener('click', (ev) => {
      ev.stopPropagation();
      api.opcao(o);
    });
    grupo.appendChild(b);
  }
  document.body.appendChild(grupo);

  const api: EsbocoPrimeiraPessoa = {
    primeira(sim) {
      ligado = sim;
      olho.classList.toggle('ligado', sim);
    },
    ligada: () => ligado,
    fracao: () => t,
    opcao(o) {
      opcao = o;
      for (const x of ['1', '2'] as const) botoes[x].classList.toggle('ativo', x === o);
    },
    mira: () => celulaMira,
    maos: () => ({ direita: peso, esquerda: 0 }),
    custo: () => {
      const malhas = [...malhasBraco.D, ...malhasBraco.E, sombra].filter((m) => m.isEnabled());
      if (contorno?.isEnabled()) malhas.push(contorno, miolo);
      const extra = vista ? vista.contarMalhasMao() : 0;
      let tri = 0;
      for (const m of malhas) tri += (m.getTotalIndices?.() ?? 0) / 3;
      return { malhas: malhas.length + extra, triangulos: Math.round(tri) };
    },
    tela: () => ({ ...naTela }),
    forcar(p) {
      forcada = p;
    },
  };
  api.opcao('1');
  window.__primeiraPessoa = api;
}
