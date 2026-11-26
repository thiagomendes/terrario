/**
 * Spec 037 (T04): o braço, a mão e o item da primeira pessoa.
 *
 * O braço é o do próprio boneco: um segundo boneco de verdade (`criarBoneco`, a mesma roupa e o
 * mesmo item: `definirNaMao`), do qual só o braço direito aparece, no tamanho dele, sem dobrar e
 * sem esticar. Ele gira num ombro fixo no espaço da câmera, fora da beira direita, no ponto que a
 * conta dá para cada tela (`contaOmbro.ts`: feita fora do quadro e guardada por tela; sem
 * solução, a mão some). Os ângulos de junta vêm da terceira pessoa, em escala; um golpe do braço
 * a cada golpe do jogo e um empurrão a cada colocação (os mesmos eventos que tocam o som). O item
 * fica como a criança seguraria olhando para a frente, encostado na mão.
 *
 * Quem liga: a câmera da primeira pessoa (a T03, `primeiraPessoa.ts`)
 * põe a câmera nos olhos e chama `quadro(dt, entrada)` a cada quadro, depois do boneco, com a
 * fração da entrada (0 em terceira pessoa, 1 dentro). Com 0, nada daqui aparece e o boneco de
 * verdade fica inteiro. A cena repassa a luz (`definirLuz`) e a recusa de colocar (`nao`).
 */
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Matrix, Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Viewport } from '@babylonjs/core/Maths/math.viewport';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { Mesh as MeshClass } from '@babylonjs/core/Meshes/mesh';
import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import type { Scene } from '@babylonjs/core/scene';
import type { Camera } from '@babylonjs/core/Cameras/camera';
import type { GlowLayer } from '@babylonjs/core/Layers/glowLayer';
import type { Personagem } from './personagem';
import { criarBoneco } from './boneco';
import type { Aparencia } from '../personagem/aparencia';
import { curvaGolpe, PERIODO_MINERAR } from '../personagem/poses';
import { obterItem } from '../jogo/itens';
import type { Vista } from '../player/animacao';
import {
  ACENAR,
  BRACO,
  EMPURRAO_COLOCAR,
  ESCALA_BONECO,
  FOV_BRACO,
  GANHO_COMER_X,
  GANHO_COMER_Z,
  GANHO_GOLPE,
  GANHO_PASSO,
  GANHO_PULO,
  MEIA_MANGA,
  TELA_BAIXA,
  criarCacheOmbro,
  direcaoDoBraco,
  type Retangulo,
  type ResultadoOmbro,
} from './contaOmbro';

/** O que a câmera da primeira pessoa passa ao braço a cada quadro. */
export interface EntradaBraco {
  /** 0 em terceira pessoa, 1 dentro da cabeça (a entrada pelo meio). */
  fracao: number;
  /** O olhar (rad; positivo olhando para baixo). */
  pitch: number;
  jogador: { x: number; y: number; z: number; noChao: boolean; voando?: boolean };
  vista: Vista;
  gesto: string | null;
  naMao: { bloco: number | null; item: string | null; qtd?: number };
  aparencia: Aparencia;
}

export interface BracoPrimeiraPessoa {
  quadro(dt: number, entrada: EntradaBraco): void;
  /**
   * A luz do jogador (de noite, na caverna): a mesma do boneco; `noite` (0 de dia, 1 de noite)
   * acende um tico a mão do canto da tela.
   */
  definirLuz(f: number, noite?: number): void;
  /** O "não" curtinho do item na mão (a recusa de colocar). */
  nao(): void;
  /** Peso da mão na tela (0 fora, 1 inteira). */
  peso(): number;
  /** Onde a mão e o ombro caem na tela (px) e o ombro desta tela. */
  tela(): {
    mao: [number, number];
    ombro: [number, number];
    ombroCamera: number[];
    maoPx: number;
    /** A caixa do item da mão na tela (px), ou null. */
    item: [number, number, number, number] | null;
  };
  /** A conferência do ombro (quadros com a mão na tela e a menor folga, px). */
  ponta(): { quadros: number; menorFolgaPx: number };
  zerarPonta(): void;
  /** O ritmo: os golpes e colocações do jogo e os movimentos do braço. */
  ritmo(): { golpes: number; balancos: number; colocacoes: number; empurroes: number };
  zerarRitmo(): void;
  custo(): { malhas: number; triangulos: number };
  /**
   * A varinha de bolhas na mão da frente, à vista (o nó dela tem o mesmo desenho da mão esquerda
   * do boneco: o aro fica no mesmo lugar); null sem ela.
   */
  varinhaDeDentro(): TransformNode | null;
  descartar(): void;
}

export interface OpcoesBraco {
  scene: Scene;
  /** A câmera que desenha a tela (o braço é filho dela). */
  camera: Camera;
  /** O boneco do jogador (a cabeça e os braços somem por dentro). */
  personagem: Personagem;
  /** Quantos golpes e colocações o jogo já teve (os eventos que tocam o som). */
  golpes: () => number;
  colocacoes: () => number;
  /** O bloco numa célula (0 vazio): a sombra procura o chão debaixo dos pés. */
  bloco: (x: number, y: number, z: number) => number;
}

/** O grupo de desenho do braço: por cima do mundo (nunca entra na parede). */
const GRUPO = 2;
/** Olhando mais para baixo que isto, a mão sai de vista (o corpo aparece). */
const PITCH_SEM_MAO = 0.85;
/** O golpe dura um intervalo de golpe do jogo; o empurrão de colocar, 0,3 s. */
const DURACAO_GOLPE = PERIODO_MINERAR;
const DURACAO_EMPURRAO = 0.3;
/** Fora: o braço gira para baixo até a mão sumir pela beira de baixo. */
const FORA_X = 0.2;
/** O "não" curtinho: um balanço rápido do item (s, rad). */
const DURACAO_NAO = 0.32;
const AMPLITUDE_NAO = 0.32;
/**
 * O "não" de dentro (portão da 037: o de 0,32 s quase não se via): a mão e o item balançam de
 * lado a lado três vezes, como quem diz "não" com o dedo, e o item gira junto; some no fim.
 */
const DURACAO_NAO_DENTRO = 0.9;
const BALANCOS_NAO_DENTRO = 3;
/** O braço abre e fecha (rad, na junta do ombro) e o item gira na mão (rad). */
const LADO_NAO_DENTRO = 0.5;
const GIRO_NAO_DENTRO = 0.75;
/**
 * De noite, a mão da frente fica no canto da tela, onde a vinheta e a curva das sombras pesam
 * mais que no boneco visto de fora (no meio): ela recebe um tico mais de luz, para a pele ficar
 * na cor do boneco e a comida parecer comida (portão da 037).
 */
const LUZ_NOITE_MAO = 0.55;
/**
 * Com uma ferramenta na mão, quase nada (portão, 3ª rodada: a lâmina clara da colher do pedreiro,
 * no alto da tela em pé, longe da vinheta do canto, ficava branca e acesa de noite).
 */
const LUZ_NOITE_FERRAMENTA = 0.1;

/**
 * Os tesouros da mão, de dentro (portão da 037): a direção do cabo na mão (no espaço da mão; o
 * desenho do tesouro sai da mão para -y) e a escala. A varinha sobe da mão, um tico para a frente e
 * para o meio; a pipa fica no céu, na frente, com o fio subindo da mão até ela.
 */
const TESOURO_DENTRO: Record<string, { dir: [number, number, number]; escala: number; sai: 1 | -1 }> = {
  'varinha-bolhas': { dir: [-0.28, 0.9, 0.34], escala: 1, sai: -1 },
};
/**
 * O guarda-chuva de dentro (estudo dos tesouros, decisão do dono: a opção A): no tamanho de
 * verdade, preso na mão, com o cabo em pé no mundo, 8° para a frente e 8° para fora. O pano fica
 * por cima da cabeça: de dentro, vê-se o cabo subindo da mão e a beira do pano no alto da tela.
 */
const GUARDA_FRENTE = (8 * Math.PI) / 180;
const GUARDA_FORA = (8 * Math.PI) / 180;
/**
 * Na tela deitada e baixa (portão, 3ª rodada: o pano saía do quadro e sobrava a vareta), a mão
 * fica perto dos olhos e o pano, 1,33 acima dela, passa por cima do quadro. Pela conta
 * (`referencia/conta-guarda-deitado.mjs`), para a frente o pano já entra em cima da mira; inclinado
 * 50° para fora e 16° para a frente, ele desce pelo canto de cima à direita, com 3 das 8 pontinhas
 * à vista, longe da mira e da bússola (27% do pano no quadro).
 */
const GUARDA_FRENTE_BAIXA = (16 * Math.PI) / 180;
const GUARDA_FORA_BAIXA = (50 * Math.PI) / 180;
/** A pipa de dentro: onde ela fica na tela (em metades da tela, do meio) e a distância. */
// (portão, 3ª rodada: na altura da copa das árvores ela parecia enroscada; mais alta e mais longe,
// ela fica no céu, abaixo da fileira de botões do alto e longe da mira)
const PIPA_TELA: [number, number] = [-0.15, 0.5];
const PIPA_DISTANCIA = 5;
/** O raio da mão no espaço dela (sem a escala do boneco): o item encosta nele. */
const RAIO_MAO_LOCAL = 0.085;

/**
 * O "não" curtinho do item na mão do boneco de verdade (a terceira pessoa): o mesmo balanço
 * rápido, no nó de pegar da mão. `atualizar` a cada quadro.
 */
export function criarNaoNaMao(no: () => TransformNode | null) {
  let t = -1;
  let alvo: TransformNode | null = null;
  return {
    disparar() {
      alvo = no();
      t = 0;
    },
    atualizar(dt: number) {
      if (t < 0 || !alvo) return;
      t += dt / DURACAO_NAO;
      if (t >= 1) {
        alvo.rotation.z = 0;
        t = -1;
        return;
      }
      alvo.rotation.z = Math.sin(t * Math.PI * 4) * AMPLITUDE_NAO * (1 - t);
    },
  };
}

const suave = (t: number) => {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
};
const aproximar = (a: number, b: number, taxa: number, dt: number) =>
  a + (b - a) * (1 - Math.exp(-taxa * dt));

/**
 * A interface de verdade na tela: o alto dos botões e da barra na metade direita, embaixo (a mão e
 * o bloco ficam acima), e os retângulos dos botões, da barra, do mapinha e do controle de andar
 * (a mão e o item ficam fora deles). Pela área visível, sem olhar o aparelho.
 */
function medirInterface(w: number, h: number): { botoes: number; obstaculos: Retangulo[] } {
  let botoes = h;
  const obstaculos: Retangulo[] = [];
  for (const el of document.querySelectorAll<HTMLElement>('button, .barra, .minimapa, .area-mapa, .joystick')) {
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height || r.right <= 0 || r.bottom <= 0 || r.left >= w || r.top >= h) continue;
    // (uma tela por cima do jogo não é um botão: a mão já não aparece com ela aberta)
    if (r.width * r.height > w * h * 0.2) continue;
    if (getComputedStyle(el).visibility === 'hidden' || el.closest('[hidden]')) continue;
    // (a roleta fechada guarda os botões dela invisíveis por cima da barra; aberta, ela é
    // passageira: a mão não muda de lugar por causa dela)
    if (el.closest('.roleta')) continue;
    obstaculos.push([r.left, r.top, r.right, r.bottom]);
    if (el.matches('button, .barra') && r.top >= h * 0.55 && r.right >= w * 0.5) botoes = Math.min(botoes, r.top);
  }
  return { botoes, obstaculos };
}

/**
 * As peças filhas diretas de um nó, juntadas por material numa malha só cada (o tesouro do
 * segundo boneco vem peça por peça: a pipa eram 23 chamadas de desenho). O desenho é o mesmo,
 * no espaço do nó.
 */
function fundirPorMaterial(no: TransformNode): void {
  const grupos = new Map<number, Mesh[]>();
  for (const m of no.getChildMeshes(true)) {
    const malha = m as Mesh;
    if (!malha.material || !malha.getTotalVertices?.()) continue;
    const g = grupos.get(malha.material.uniqueId) ?? [];
    g.push(malha);
    grupos.set(malha.material.uniqueId, g);
  }
  no.computeWorldMatrix(true);
  const inversa = no.getWorldMatrix().clone().invert();
  for (const g of grupos.values()) {
    if (g.length < 2) continue;
    for (const m of g) m.computeWorldMatrix(true);
    const nome = g[0].name;
    const junta = MeshClass.MergeMeshes(g, true, true);
    if (!junta) continue;
    junta.name = nome;
    junta.bakeTransformIntoVertices(inversa);
    junta.parent = no;
  }
}

/** O giro que leva o eixo y (para `sai`) para a direção `d` (normalizada aqui). */
function cabo(d: readonly [number, number, number], sai: 1 | -1): Quaternion {
  const para = new Vector3(d[0], d[1], d[2]).normalize();
  const de = new Vector3(0, sai, 0);
  const eixo = Vector3.Cross(de, para);
  const ang = Math.acos(Math.max(-1, Math.min(1, Vector3.Dot(de, para))));
  return eixo.length() < 1e-6 ? Quaternion.Identity() : Quaternion.RotationAxis(eixo.normalize(), ang);
}

export function criarBracoPrimeiraPessoa(op: OpcoesBraco): BracoPrimeiraPessoa {
  const { scene, camera, personagem } = op;
  const canvas = scene.getEngine().getRenderingCanvas();
  const glow = scene.effectLayers?.find((l) => l.name === 'glow') as GlowLayer | undefined;
  const semBrilho = (m: AbstractMesh) => glow?.addExcludedMesh(m as Mesh);
  scene.setRenderingAutoClearDepthStencil(GRUPO, true, true, true);
  // o suporte (filho da câmera) e o osso do braço, que gira no ombro
  const suporte = new TransformNode('pp-braco-suporte', scene);
  suporte.parent = camera;
  const osso = new TransformNode('pp-braco-osso', scene);
  osso.parent = suporte;
  osso.rotationQuaternion = Quaternion.Identity();
  osso.setEnabled(false);
  let vista: Personagem | null = null;
  let aparenciaDaVista: Aparencia | null = null;
  let juntaMao: TransformNode | null = null;
  let luz = 1;
  /** A luz do lugar e a noite (da cena), e se a mão leva uma ferramenta (a luz da noite muda). */
  let luzLugar = 1;
  let noiteAgora = 0;
  let comFerramenta = false;
  const aplicarLuz = () => {
    const extra = comFerramenta ? LUZ_NOITE_FERRAMENTA : LUZ_NOITE_MAO;
    const nova = luzLugar * (1 + extra * noiteAgora);
    if (nova === luz) return;
    luz = nova;
    vista?.definirLuz(luz);
  };
  // o tesouro da mão de dentro: as peças do segundo boneco, na mão da frente (a varinha e o
  // guarda-chuva) ou no céu da frente, com o fio (a pipa)
  const noTesouro = new TransformNode('pp-tesouro', scene);
  noTesouro.rotationQuaternion = Quaternion.Identity();
  const noPipa = new TransformNode('pp-pipa', scene);
  noPipa.parent = camera;
  noPipa.setEnabled(false);
  let tesouroId: string | null = null;
  let pipaNo: TransformNode | null = null;
  let raboNo: TransformNode | null = null;
  let tempoPipa = 0;
  const matFio = new StandardMaterial('pp-pipa-fio', scene);
  matFio.diffuseColor = new Color3(0.95, 0.94, 0.9);
  matFio.emissiveColor = new Color3(0.55, 0.55, 0.52);
  matFio.specularColor = Color3.Black();
  // (mais grosso na ponta da pipa, longe: na tela, o fio fica da mesma grossura de ponta a ponta,
  // sem virar um pontilhado lá no alto)
  const fio = MeshBuilder.CreateCylinder('pp-pipa-fio', { height: 1, diameterTop: 1, diameterBottom: 0.25, tessellation: 5 }, scene);
  fio.material = matFio;
  fio.isPickable = false;
  // (o fio e a pipa vão por cima do mundo, como a mão: a mão de dentro pode estar dentro de uma
  // parede encostada, e o fio sumia nela, cortado longe da mão)
  fio.renderingGroupId = GRUPO;
  fio.alwaysSelectAsActiveMesh = true;
  fio.rotationQuaternion = Quaternion.Identity();
  fio.setEnabled(false);
  semBrilho(fio);
  // o guarda-chuva de dentro: no mundo, na escala do boneco, preso na mão a cada quadro
  const noMundo = new TransformNode('pp-tesouro-mundo', scene);
  noMundo.rotationQuaternion = Quaternion.Identity();
  noMundo.scaling.setAll(ESCALA_BONECO);
  noMundo.setEnabled(false);
  const montarTesouro = (a: Aparencia) => {
    tesouroId = a.premium?.mao ?? null;
    pipaNo = raboNo = null;
    noTesouro.parent = juntaMao;
    noTesouro.position.setAll(0);
    const def = tesouroId ? TESOURO_DENTRO[tesouroId] : undefined;
    noTesouro.rotationQuaternion = def ? cabo(def.dir, def.sai) : Quaternion.Identity();
    noTesouro.scaling.setAll(def?.escala ?? 1);
    if (!tesouroId) return;
    const maoE = scene.getTransformNodeByName('pp-braco-junta-maoE');
    if (tesouroId === 'varinha-bolhas' && maoE) {
      for (const m of maoE.getChildMeshes(true)) if (m.name.includes('varinha')) m.parent = noTesouro;
      fundirPorMaterial(noTesouro);
    }
    const guarda = scene.getTransformNodeByName('pp-braco-junta-guarda');
    if (tesouroId === 'guarda-chuva-gotinhas' && guarda) {
      // (no mundo, em pé, no tamanho de verdade: o nó segue a mão a cada quadro)
      guarda.parent = noMundo;
      guarda.position.setAll(0);
      guarda.rotationQuaternion = null;
      guarda.rotation.setAll(0);
      fundirPorMaterial(guarda);
      for (const m of guarda.getChildMeshes(false)) {
        m.renderingGroupId = GRUPO;
        m.isPickable = false;
        m.alwaysSelectAsActiveMesh = true;
        semBrilho(m);
      }
    }
    if (tesouroId === 'pipa-lacinhos') {
      pipaNo = scene.getTransformNodeByName('pp-braco-junta-pipa');
      raboNo = scene.getTransformNodeByName('pp-braco-junta-rabopipa');
      for (const n of [pipaNo, raboNo]) {
        if (!n) continue;
        n.parent = noPipa;
        n.position.setAll(0);
        fundirPorMaterial(n);
        for (const m of n.getChildMeshes(false)) {
          m.renderingGroupId = GRUPO;
          m.isPickable = false;
          m.alwaysSelectAsActiveMesh = true;
          m.setEnabled(true);
          semBrilho(m);
        }
      }
    }
  };
  const marcarGrupo = () => {
    for (const m of osso.getChildMeshes(false)) {
      m.renderingGroupId = GRUPO;
      m.isPickable = false;
      m.alwaysSelectAsActiveMesh = true;
      semBrilho(m);
    }
  };
  const montarVista = (a: Aparencia) => {
    // (o nó do tesouro é daqui: sai da mão antes de o boneco velho ir embora, e as peças
    // juntadas dele, que o boneco não conhece, vão embora junto)
    noTesouro.parent = null;
    for (const m of noTesouro.getChildMeshes(false)) m.dispose();
    vista?.descartar();
    aparenciaDaVista = a;
    // o mesmo boneco do jogador (sem o brinquedo de andar: só o braço aparece)
    const semMontar: Aparencia = { ...a };
    delete semMontar.montado;
    // (sem fundir: a mão fica numa junta própria)
    vista = criarBoneco(scene, semMontar, 'pp-braco', undefined, false, true);
    const braco = scene.getTransformNodeByName('pp-braco-junta-bracoD');
    if (braco) {
      braco.parent = osso;
      braco.position.setAll(0);
      braco.rotation.setAll(0);
    }
    // o braço no tamanho de verdade, a mesma escala nas três direções: nada estica
    osso.scaling.setAll(ESCALA_BONECO);
    juntaMao = scene.getTransformNodeByName('pp-braco-junta-maoD');
    montarTesouro(a);
    // só o braço direito aparece (o resto do segundo boneco fica desligado)
    for (const m of vista.raiz.getChildMeshes(false)) if (!braco || !m.isDescendantOf(braco)) m.setEnabled(false);
    vista.raiz.setEnabled(false);
    vista.definirLuz(luz);
    chaveMao = '';
    marcarGrupo();
  };

  // ---------------------------------------------------------------- o ombro desta tela
  const cache = criarCacheOmbro((f) => setTimeout(f, 0));
  let achado: ResultadoOmbro | null | undefined;
  let interfaceMedida: { botoes: number; obstaculos: Retangulo[] } = { botoes: 0, obstaculos: [] };
  let botoesEm = -Infinity;
  const ombroDaTela = (agora: number): ResultadoOmbro | null | undefined => {
    if (!canvas) return null;
    const r = canvas.getBoundingClientRect();
    // os botões só são medidos de vez em quando (a tela gira, a barra muda): nunca a cada quadro
    if (agora - botoesEm > 1) {
      interfaceMedida = medirInterface(r.width, r.height);
      botoesEm = agora;
    }
    return cache.obter({ w: r.width, h: r.height, ...interfaceMedida });
  };
  addEventListener('resize', () => {
    botoesEm = -Infinity;
  });

  // ---------------------------------------------------------------- a sombra no chão
  const texSombra = new DynamicTexture('pp-braco-sombra', { width: 64, height: 64 }, scene, false);
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
  const matSombra = new StandardMaterial('pp-braco-sombra', scene);
  matSombra.diffuseTexture = texSombra;
  matSombra.useAlphaFromDiffuseTexture = true;
  matSombra.diffuseColor = Color3.Black();
  matSombra.specularColor = Color3.Black();
  matSombra.emissiveColor = Color3.Black();
  matSombra.disableLighting = true;
  matSombra.zOffset = -2;
  const sombra = MeshBuilder.CreateGround('pp-braco-sombra', { width: 0.9, height: 0.9 }, scene);
  sombra.material = matSombra;
  sombra.isPickable = false;
  sombra.setEnabled(false);
  semBrilho(sombra);
  const acharChao = (x: number, y: number, z: number): number | null => {
    for (let k = 0; k < 8; k++) {
      const yy = Math.floor(y + 0.01) - 1 - k;
      if (op.bloco(Math.floor(x), yy, Math.floor(z))) return yy + 1;
    }
    return null;
  };

  // ---------------------------------------------------------------- o corpo de verdade
  // a cabeça e os braços do boneco somem por dentro (a junta inteira, com o que estiver preso
  // nela); o boneco continua inteiro para os amigos
  const junta = (n: string) => scene.getTransformNodeByName(`personagem-junta-${n}`);
  let corpoMexido = false;
  const mostrarCorpo = (cabeca: boolean, bracos: boolean) => {
    junta('cabeca')?.setEnabled(cabeca);
    junta('bracoD')?.setEnabled(bracos);
    // o tesouro da mão (a varinha, o guarda-chuva) vai com o braço esquerdo de verdade; de dentro,
    // ele aparece na mão da frente (portão da 037: o pano do guarda-chuva de verdade ficava solto
    // no céu, por cima da câmera). A pipa de verdade, atrás, também some (a de dentro fica na frente)
    junta('bracoE')?.setEnabled(bracos);
    junta('pipa')?.setEnabled(cabeca);
    junta('rabopipa')?.setEnabled(cabeca);
  };

  // ---------------------------------------------------------------- o item na mão
  let chaveMao = '';
  let troca = -1;
  let pendente: EntradaBraco['naMao'] | null = null;
  /** O item encosta na mão: o nó de pegar desce ou sobe até o item tocar o alto dela. */
  let encosto: [number, number, number] = [0, 0, 0];
  const medirEncosto = () => {
    if (!vista) return;
    const pega = vista.noDaMao();
    pega.position.setAll(0);
    pega.rotation.setAll(0);
    pega.computeWorldMatrix(true);
    const inv = pega.getWorldMatrix().clone().invert();
    let minY = Infinity;
    let minX = Infinity;
    let maxX = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;
    for (const m of pega.getChildMeshes(false)) {
      m.computeWorldMatrix(true);
      const rel = m.getWorldMatrix().multiply(inv);
      const b = m.getBoundingInfo().boundingBox;
      for (const x of [b.minimum.x, b.maximum.x])
        for (const y of [b.minimum.y, b.maximum.y])
          for (const z of [b.minimum.z, b.maximum.z]) {
            const p = Vector3.TransformCoordinates(new Vector3(x, y, z), rel);
            minY = Math.min(minY, p.y);
            minX = Math.min(minX, p.x);
            maxX = Math.max(maxX, p.x);
            minZ = Math.min(minZ, p.z);
            maxZ = Math.max(maxZ, p.z);
          }
    }
    if (!Number.isFinite(minY)) {
      encosto = [0, 0, 0];
      return;
    }
    // o item fica em cima da mão, centrado nela, um tico para o lado da câmera (aparece inteiro)
    encosto = [-(minX + maxX) / 2, RAIO_MAO_LOCAL * 0.85 - minY, -(minZ + maxZ) / 2 - 0.02];
  };
  /** A mão da frente mostra um item da barra (sem ele, o tesouro da mão, se houver). */
  let itemMostrado = false;
  const trocarItem = (m: EntradaBraco['naMao']) => {
    itemMostrado = m.bloco !== null || m.item !== null;
    comFerramenta = !!(m.item && obterItem(m.item)?.ferramenta) || m.item === 'colher_pedreiro';
    aplicarLuz();
    vista!.definirNaMao(m.bloco, m.item, m.qtd);
    marcarGrupo();
    medirEncosto();
  };
  /**
   * O jeito de segurar de dentro, por tipo: o giro da mão no espaço da câmera (guinada,
   * inclinação, rolagem), onde o item fica em relação à mão e o giro dele no próprio cabo.
   */
  const postura = (m: EntradaBraco['naMao'], batida: number) => {
    const def = m.item ? obterItem(m.item) : undefined;
    if (def?.ferramenta)
      // o cabo sobe para a frente (menos alto que no esboço) e um tico para o meio; a mão pega
      // mais acima no cabo; a cabeça gira no cabo para a ponta apontar para a frente, no plano do
      // golpe, que bate para a frente e para baixo
      return { giro: [-0.45, -0.55 + batida * 1.4, 0] as const, pega: [0, 0, -0.12] as const, torce: Math.PI / 2 };
    if (m.bloco !== null) return { giro: [0.45, 0.12, 0] as const, pega: encosto, torce: 0 };
    return { giro: [0.3, 0.08, 0] as const, pega: encosto, torce: 0 };
  };

  // ---------------------------------------------------------------- o estado do quadro
  let peso = 0;
  let golpeT = -1;
  let empurraoT = -1;
  let naoT = -1;
  let golpesVistos = op.golpes();
  let colocacoesVistas = op.colocacoes();
  const ritmo = { golpes: 0, balancos: 0, colocacoes: 0, empurroes: 0 };
  let mola = 0;
  let molaVel = 0;
  let noArDesde = -1;
  let maoNaTela: [number, number] = [0, 0];
  let ombroNaTela: [number, number] = [0, 0];
  const vigia = { quadros: 0, menorFolgaPx: Infinity };
  const matrizDesejada = new Matrix();
  const matrizOsso = new Matrix();
  const projetar = (p: Vector3): [number, number] => {
    const r = canvas!.getBoundingClientRect();
    const tanV = Math.tan(FOV_BRACO / 2);
    const tanH = tanV * (r.width / r.height);
    return [Math.round((r.width / 2) * (1 + p.x / (p.z * tanH))), Math.round((r.height / 2) * (1 - p.y / (p.z * tanV)))];
  };
  const apagarPipa = () => {
    noPipa.setEnabled(false);
    fio.setEnabled(false);
  };
  const apagar = () => {
    noMundo.setEnabled(false);
    osso.setEnabled(false);
    sombra.setEnabled(false);
    apagarPipa();
    peso = 0;
  };
  /**
   * A pipa de dentro: no céu da frente (presa à câmera, num ponto fixo da tela, balançando no
   * vento como a de fora), e o fio da mão até a ponta de baixo dela.
   */
  const fioA = new Vector3();
  const fioB = new Vector3();
  const pipaNoCeu = (dt: number) => {
    if (!pipaNo) return apagarPipa();
    tempoPipa += dt;
    const t = tempoPipa;
    const tanV = Math.tan(camera.fov / 2);
    const r = canvas!.getBoundingClientRect();
    const tanH = tanV * (r.width / r.height);
    noPipa.setEnabled(true);
    noPipa.position.set(
      PIPA_TELA[0] * PIPA_DISTANCIA * tanH + Math.sin(t * 0.7) * 0.08,
      PIPA_TELA[1] * PIPA_DISTANCIA * tanV + Math.sin(t * 1.1) * 0.06,
      PIPA_DISTANCIA,
    );
    pipaNo.rotation.z = Math.sin(t * 1.3) * 0.12;
    pipaNo.rotation.x = Math.sin(t * 0.9) * 0.06;
    if (raboNo) {
      raboNo.rotation.z = Math.sin(t * 1.3 - 0.8) * 0.3;
      raboNo.rotation.x = Math.sin(t * 2.1) * 0.12 - 0.15;
    }
    // o fio: da mão (um tico acima do meio dela) até a ponta de baixo da pipa
    juntaMao!.computeWorldMatrix(true);
    noPipa.computeWorldMatrix(true);
    Vector3.TransformCoordinatesToRef(new Vector3(0, RAIO_MAO_LOCAL * 0.6, 0), juntaMao!.getWorldMatrix(), fioA);
    fioB.copyFrom(noPipa.getAbsolutePosition());
    const d = fioB.subtract(fioA);
    const l = d.length();
    fio.setEnabled(l > 0.05);
    fio.position.copyFrom(fioA).addInPlace(fioB).scaleInPlace(0.5);
    fio.scaling.set(0.03, l, 0.03);
    const eixo = Vector3.Cross(Vector3.Up(), d.normalize());
    const ang = Math.acos(Math.max(-1, Math.min(1, d.y)));
    if (eixo.length() > 1e-6) Quaternion.RotationAxisToRef(eixo.normalize(), ang, fio.rotationQuaternion!);
  };

  const quadro = (dt: number, en: EntradaBraco) => {
    const e = suave(en.fracao);
    if (e <= 0) {
      if (corpoMexido) mostrarCorpo(true, true);
      corpoMexido = false;
      apagar();
      return;
    }
    if (!vista || en.aparencia !== aparenciaDaVista) montarVista(en.aparencia);
    const agora = performance.now() / 1000;
    // ---------------- o corpo de verdade: a cabeça some quando a câmera passa por ela; os braços
    // do corpo só aparecem olhando para baixo, quando a mão da frente já saiu (nunca dois braços)
    const sumir = suave((en.pitch - PITCH_SEM_MAO) / 0.25);
    mostrarCorpo(en.fracao <= 0.55, sumir > 0.5 || en.fracao < 0.55);
    corpoMexido = true;
    personagem.definirOpacidade(1);
    // ---------------- a sombra, debaixo dos pés
    const j = en.jogador;
    const chao = acharChao(j.x, j.y, j.z);
    if (chao !== null) {
      sombra.setEnabled(true);
      const ks = Math.max(0.35, 1 - Math.max(0, j.y - chao) * 0.18);
      sombra.position.set(j.x, chao + 0.015, j.z);
      sombra.scaling.set(ks, 1, ks);
      matSombra.alpha = e * ks;
    } else sombra.setEnabled(false);
    // ---------------- o ombro desta tela (sem conta ainda, ou sem solução: a mão some)
    achado = ombroDaTela(agora);
    // ---------------- o item: trocar desce a mão e sobe com o novo
    const mao = en.naMao;
    const chave = `${mao.bloco ?? ''}|${mao.item ?? ''}`;
    const temItem = mao.bloco !== null || mao.item !== null;
    if (chave !== chaveMao) {
      if (chaveMao === '' && troca < 0) trocarItem(mao);
      else {
        pendente = mao;
        if (troca < 0 || troca > 0.5) troca = troca < 0 ? 0 : 1 - troca;
      }
      chaveMao = chave;
    }
    if (troca >= 0) {
      const antes = troca;
      troca += dt / 0.5;
      if (antes < 0.5 && troca >= 0.5 && pendente) {
        trocarItem(pendente);
        pendente = null;
      }
      if (troca >= 1) troca = -1;
    }
    // ---------------- o ritmo: um golpe por golpe do jogo, um empurrão por colocação
    const g = op.golpes();
    if (g !== golpesVistos) {
      ritmo.golpes += g - golpesVistos;
      golpesVistos = g;
      golpeT = 0;
      ritmo.balancos++;
    }
    const c = op.colocacoes();
    if (c !== colocacoesVistas) {
      ritmo.colocacoes += c - colocacoesVistas;
      colocacoesVistas = c;
      empurraoT = 0;
      ritmo.empurroes++;
    }
    if (golpeT >= 0 && (golpeT += dt / DURACAO_GOLPE) >= 1) golpeT = -1;
    if (empurraoT >= 0 && (empurraoT += dt / DURACAO_EMPURRAO) >= 1) empurraoT = -1;
    if (naoT >= 0 && (naoT += dt / DURACAO_NAO_DENTRO) >= 1) naoT = -1;
    const agindo = golpeT >= 0 || empurraoT >= 0;
    const comendo = en.vista.comer !== null;
    // sem item da barra, o tesouro da mão vestido aparece na mão da frente
    const comTesouro = !temItem && !!tesouroId && !en.aparencia.montado;
    // (a mão vazia só entra para agir: tocar, colocar, acenar, comer)
    const aparece = (temItem || comTesouro || !!en.gesto || comendo || agindo) && !!achado;
    const quer = aparece ? (1 - sumir) * (troca >= 0 ? Math.abs(Math.cos(Math.PI * troca)) : 1) : 0;
    peso = aproximar(peso, quer * e, troca >= 0 ? 40 : 9, dt);
    if (!achado || peso <= 0.02) {
      // (o osso leva o braço e o item juntos: nada fica preso na tela)
      osso.setEnabled(false);
      noMundo.setEnabled(false);
      apagarPipa();
      return;
    }
    const tesouroNaMao = !!tesouroId && !itemMostrado;
    noTesouro.setEnabled(tesouroNaMao);
    // ---------------- os ângulos de junta: os da terceira pessoa, em escala
    const real = junta('bracoD');
    const rx = real?.rotation.x ?? 0;
    const rz = real?.rotation.z ?? 0.09;
    const descansoX = temItem ? -0.32 : 0;
    let [x, z] = achado.segurar;
    const wAceno = en.gesto ? suave((rz - 0.09) / 2.3) : 0;
    const leva = comendo ? Math.max(0, Math.min(1, (descansoX - rx) / 1.5)) : 0;
    if (wAceno > 0) {
      // o aceno: o braço sobe para a frente, no tempo do aceno do boneco, e a mão abana com ele
      x += (ACENAR[0] - x) * wAceno;
      z += (ACENAR[1] - z) * wAceno + (rz - 2.6) * wAceno;
    } else if (comendo) {
      // o comer: a comida sobe para o meio, no tempo da refeição do boneco
      x += (rx - descansoX) * GANHO_COMER_X;
      z += (rz - 0.09) * GANHO_COMER_Z * leva;
    } else {
      // o passo e o pulo vêm do corpo, bem menores: só um sobe e desce, nada de lado
      x += (rx - descansoX) * GANHO_PASSO;
      z += Math.max(0, rz - 0.09) * GANHO_PULO;
    }
    const batida = golpeT >= 0 ? curvaGolpe(golpeT) * GANHO_GOLPE : 0;
    x += batida;
    if (empurraoT >= 0) x += EMPURRAO_COLOCAR * Math.sin(Math.PI * empurraoT);
    // a mola: sobe um tico no ar, afunda e volta ao pousar
    if (j.noChao) {
      if (noArDesde >= 0 && agora - noArDesde > 0.25 && !j.voando) molaVel += Math.min(1.6, (agora - noArDesde) * 2.2);
      noArDesde = -1;
    } else if (noArDesde < 0) noArDesde = agora;
    const alvoMola = j.noChao || j.voando ? 0 : -0.05;
    molaVel += ((alvoMola - mola) * 70 - molaVel * 11) * dt;
    mola += molaVel * dt;
    x += mola;
    // o "não": a mão e o item vão de lado a lado, três vezes, e param (o balanço some no fim)
    // (começa depressa e vai parando; para dentro da tela, a mão nunca sai pela beira)
    const envNao = naoT >= 0 ? Math.min(1, naoT * 6) * (1 - naoT) : 0;
    const balancoNao = naoT >= 0 ? Math.sin(naoT * Math.PI * 2 * BALANCOS_NAO_DENTRO) * envNao : 0;
    z -= (0.5 + 0.5 * Math.sin(naoT * Math.PI * 2 * BALANCOS_NAO_DENTRO)) * envNao * LADO_NAO_DENTRO;
    // entrando e saindo: o braço gira no ombro para baixo (a mão some pela beira de baixo)
    x += (FORA_X - x) * (1 - peso);
    // ---------------- o braço no ombro, como no campo de 70° em qualquer campo de dentro
    const s = Math.tan(camera.fov / 2) / Math.tan(FOV_BRACO / 2);
    suporte.scaling.set(s, s, 1);
    const ombro = new Vector3(achado.ombro[0], achado.ombro[1], achado.ombro[2]);
    osso.setEnabled(true);
    osso.position.copyFrom(ombro);
    Quaternion.RotationYawPitchRollToRef(0, x, z, osso.rotationQuaternion!);
    // ---------------- a mão e o item como a criança seguraria olhando para a frente
    const p = postura(mao, batida);
    // o "não": o item gira na mão junto com o balanço (como um dedo dizendo "não")
    const nao = -balancoNao * GIRO_NAO_DENTRO;
    if (juntaMao) {
      Quaternion.RotationYawPitchRoll(p.giro[0], p.giro[1], p.giro[2] + nao).toRotationMatrix(matrizDesejada);
      osso.rotationQuaternion!.toRotationMatrix(matrizOsso);
      // a mão é filha do braço: local = desejada × inversa do braço (a inversa de um giro é a transposta)
      juntaMao.rotationQuaternion = Quaternion.FromRotationMatrix(matrizDesejada.multiply(matrizOsso.transpose()));
    }
    const pega = vista!.noDaMao();
    pega.scaling.setAll(1);
    pega.position.set(p.pega[0], p.pega[1], p.pega[2]);
    pega.rotation.set(0, 0, p.torce);
    // a comida mordida do boneco de verdade e as migalhas passam logo abaixo dos olhos: de
    // dentro, somem de perto da câmera (a comida da mão da frente fica)
    if (comendo)
      for (const n of [...scene.transformNodes, ...scene.meshes])
        if (
          (n.name.startsWith('refeicao') || n.name.startsWith('migalha-')) &&
          n.isEnabled() &&
          Vector3.Distance(n.getAbsolutePosition(), camera.position) < 1.2
        )
          n.setEnabled(false);
    // ---------------- a pipa no céu da frente, com o fio até a mão
    if (tesouroId === 'pipa-lacinhos' && tesouroNaMao) pipaNoCeu(dt);
    else apagarPipa();
    // ---------------- o guarda-chuva em pé na mão, com o pano por cima da cabeça
    if (tesouroId === 'guarda-chuva-gotinhas' && tesouroNaMao && juntaMao) {
      noMundo.setEnabled(true);
      juntaMao.computeWorldMatrix(true);
      noMundo.position.copyFrom(juntaMao.getAbsolutePosition());
      const f = camera.getDirection(Vector3.Forward());
      const fh = new Vector3(f.x, 0, f.z).normalize();
      const lado = new Vector3(fh.z, 0, -fh.x);
      const tela = canvas!.getBoundingClientRect();
      const baixa = tela.height <= TELA_BAIXA && tela.width > tela.height;
      const frente = baixa ? GUARDA_FRENTE_BAIXA : GUARDA_FRENTE;
      const fora = baixa ? GUARDA_FORA_BAIXA : GUARDA_FORA;
      const eixo = lado
        .scale(Math.sin(fora))
        .add(new Vector3(0, Math.cos(frente) * Math.cos(fora), 0))
        .add(fh.scale(Math.sin(frente)));
      noMundo.rotationQuaternion = cabo([eixo.x, eixo.y, eixo.z], 1);
    } else noMundo.setEnabled(false);
    // ---------------- a conferência: o ombro, com a grossura da manga, fora da tela
    maoNaTela = projetar(ombro.add(new Vector3(...direcaoDoBraco(x, z)).scale(BRACO)));
    ombroNaTela = projetar(ombro);
    const r = canvas!.getBoundingClientRect();
    const rp = (MEIA_MANGA / (ombro.z * Math.tan(FOV_BRACO / 2))) * (r.height / 2);
    const folga = Math.max(-ombroNaTela[0], ombroNaTela[0] - r.width, -ombroNaTela[1], ombroNaTela[1] - r.height) - rp;
    vigia.quadros++;
    vigia.menorFolgaPx = Math.min(vigia.menorFolgaPx, folga);
  };

  /**
   * A caixa do item da mão na tela (px CSS: esquerda, cima, direita, baixo), pelas caixas das
   * peças dele (o item da barra e o tesouro na mão; null sem nada aceso). Para as conferências.
   */
  const caixaDoItem = (): [number, number, number, number] | null => {
    if (!vista || !osso.isEnabled() || !canvas) return null;
    const r = canvas.getBoundingClientRect();
    const t = scene.getTransformMatrix();
    const v = new Viewport(0, 0, r.width, r.height);
    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = -Infinity;
    let y1 = -Infinity;
    const malhas = [...vista.noDaMao().getChildMeshes(false), ...noTesouro.getChildMeshes(false)];
    for (const m of malhas) {
      if (!m.isEnabled()) continue;
      // (as peças do boneco não refazem a caixa a cada quadro: a caixa local, pela matriz de agora)
      const w = m.computeWorldMatrix(true);
      for (const c of m.getBoundingInfo().boundingBox.vectors) {
        const p = Vector3.Project(Vector3.TransformCoordinates(c, w), Matrix.IdentityReadOnly, t, v);
        x0 = Math.min(x0, p.x);
        y0 = Math.min(y0, p.y);
        x1 = Math.max(x1, p.x);
        y1 = Math.max(y1, p.y);
      }
    }
    return Number.isFinite(x0) ? [Math.round(x0), Math.round(y0), Math.round(x1), Math.round(y1)] : null;
  };

  return {
    quadro,
    definirLuz(f, noite = 0) {
      luzLugar = f;
      noiteAgora = Math.max(0, Math.min(1, noite));
      aplicarLuz();
    },
    nao() {
      naoT = 0;
    },
    peso: () => peso,
    tela: () => ({
      mao: maoNaTela,
      ombro: ombroNaTela,
      ombroCamera: achado ? achado.ombro.map((n) => +n.toFixed(3)) : [],
      maoPx: achado?.maoPx ?? 0,
      item: caixaDoItem(),
    }),
    ponta: () => ({ quadros: vigia.quadros, menorFolgaPx: Math.round(vigia.menorFolgaPx) }),
    zerarPonta() {
      vigia.quadros = 0;
      vigia.menorFolgaPx = Infinity;
    },
    ritmo: () => ({ ...ritmo }),
    zerarRitmo() {
      ritmo.golpes = ritmo.balancos = ritmo.colocacoes = ritmo.empurroes = 0;
    },
    varinhaDeDentro: () =>
      tesouroId === 'varinha-bolhas' && peso > 0.5 && osso.isEnabled() && noTesouro.isEnabled() ? noTesouro : null,
    custo() {
      const malhas = [...osso.getChildMeshes(false), ...noPipa.getChildMeshes(false), ...noMundo.getChildMeshes(false), fio, sombra].filter((m) => m.isEnabled());
      let tri = 0;
      for (const m of malhas) tri += (m.getTotalIndices?.() ?? 0) / 3;
      return { malhas: malhas.length, triangulos: Math.round(tri) };
    },
    descartar() {
      if (corpoMexido) mostrarCorpo(true, true);
      noTesouro.parent = null;
      vista?.descartar();
      noTesouro.dispose();
      noMundo.dispose();
      noPipa.dispose();
      fio.dispose();
      matFio.dispose();
      sombra.dispose();
      matSombra.dispose();
      texSombra.dispose();
      osso.dispose();
      suporte.dispose();
    },
  };
}
