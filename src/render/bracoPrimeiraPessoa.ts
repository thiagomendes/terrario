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
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
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
  SEGURAR,
  criarCacheOmbro,
  direcaoDoBraco,
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
  /** A luz do jogador (de noite, na caverna): a mesma do boneco. */
  definirLuz(f: number): void;
  /** O "não" curtinho do item na mão (a recusa de colocar). */
  nao(): void;
  /** Peso da mão na tela (0 fora, 1 inteira). */
  peso(): number;
  /** Onde a mão e o ombro caem na tela (px) e o ombro desta tela. */
  tela(): { mao: [number, number]; ombro: [number, number]; ombroCamera: number[]; maoPx: number };
  /** A conferência do ombro (quadros com a mão na tela e a menor folga, px). */
  ponta(): { quadros: number; menorFolgaPx: number };
  zerarPonta(): void;
  /** O ritmo: os golpes e colocações do jogo e os movimentos do braço. */
  ritmo(): { golpes: number; balancos: number; colocacoes: number; empurroes: number };
  zerarRitmo(): void;
  custo(): { malhas: number; triangulos: number };
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

/** O alto dos botões e da barra na metade direita, embaixo (a mão e o bloco ficam acima). */
function altoDosBotoes(w: number, h: number): number {
  let alto = h;
  for (const el of document.querySelectorAll<HTMLElement>('button, .barra')) {
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height || r.top < h * 0.55 || r.right < w * 0.5) continue;
    alto = Math.min(alto, r.top);
  }
  return alto;
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
  const marcarGrupo = () => {
    for (const m of osso.getChildMeshes(false)) {
      m.renderingGroupId = GRUPO;
      m.isPickable = false;
      m.alwaysSelectAsActiveMesh = true;
      semBrilho(m);
    }
  };
  const montarVista = (a: Aparencia) => {
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
  let botoes = 0;
  let botoesEm = -Infinity;
  const ombroDaTela = (agora: number): ResultadoOmbro | null | undefined => {
    if (!canvas) return null;
    const r = canvas.getBoundingClientRect();
    // os botões só são medidos de vez em quando (a tela gira, a barra muda): nunca a cada quadro
    if (agora - botoesEm > 1) {
      botoes = altoDosBotoes(r.width, r.height);
      botoesEm = agora;
    }
    return cache.obter({ w: r.width, h: r.height, botoes });
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
  const mostrarCorpo = (cabeca: boolean, bracos: boolean, tesouro: boolean) => {
    junta('cabeca')?.setEnabled(cabeca);
    junta('bracoD')?.setEnabled(bracos);
    // o tesouro da mão (a varinha, o guarda-chuva, a pipa) fica na mão esquerda de verdade
    junta('bracoE')?.setEnabled(bracos || tesouro);
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
  const trocarItem = (m: EntradaBraco['naMao']) => {
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
  const apagar = () => {
    osso.setEnabled(false);
    sombra.setEnabled(false);
    peso = 0;
  };

  const quadro = (dt: number, en: EntradaBraco) => {
    const e = suave(en.fracao);
    if (e <= 0) {
      if (corpoMexido) mostrarCorpo(true, true, false);
      corpoMexido = false;
      apagar();
      return;
    }
    if (!vista || en.aparencia !== aparenciaDaVista) montarVista(en.aparencia);
    const agora = performance.now() / 1000;
    // ---------------- o corpo de verdade: a cabeça some quando a câmera passa por ela; os braços
    // do corpo só aparecem olhando para baixo, quando a mão da frente já saiu (nunca dois braços)
    const sumir = suave((en.pitch - PITCH_SEM_MAO) / 0.25);
    mostrarCorpo(en.fracao <= 0.55, sumir > 0.5 || en.fracao < 0.55, !!en.aparencia.premium?.mao && !en.aparencia.montado);
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
    if (naoT >= 0 && (naoT += dt / DURACAO_NAO) >= 1) naoT = -1;
    const agindo = golpeT >= 0 || empurraoT >= 0;
    const comendo = en.vista.comer !== null;
    // (a mão vazia só entra para agir: tocar, colocar, acenar, comer)
    const aparece = (temItem || !!en.gesto || comendo || agindo) && !!achado;
    const quer = aparece ? (1 - sumir) * (troca >= 0 ? Math.abs(Math.cos(Math.PI * troca)) : 1) : 0;
    peso = aproximar(peso, quer * e, troca >= 0 ? 40 : 9, dt);
    if (!achado || peso <= 0.02) {
      // (o osso leva o braço e o item juntos: nada fica preso na tela)
      osso.setEnabled(false);
      return;
    }
    // ---------------- os ângulos de junta: os da terceira pessoa, em escala
    const real = junta('bracoD');
    const rx = real?.rotation.x ?? 0;
    const rz = real?.rotation.z ?? 0.09;
    const descansoX = temItem ? -0.32 : 0;
    let [x, z] = SEGURAR;
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
    // o "não" curtinho: um balanço rápido de lado a lado, que some
    const nao = naoT >= 0 ? Math.sin(naoT * Math.PI * 4) * AMPLITUDE_NAO * (1 - naoT) : 0;
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
    // ---------------- a conferência: o ombro, com a grossura da manga, fora da tela
    maoNaTela = projetar(ombro.add(new Vector3(...direcaoDoBraco(x, z)).scale(BRACO)));
    ombroNaTela = projetar(ombro);
    const r = canvas!.getBoundingClientRect();
    const rp = (MEIA_MANGA / (ombro.z * Math.tan(FOV_BRACO / 2))) * (r.height / 2);
    const folga = Math.max(-ombroNaTela[0], ombroNaTela[0] - r.width, -ombroNaTela[1], ombroNaTela[1] - r.height) - rp;
    vigia.quadros++;
    vigia.menorFolgaPx = Math.min(vigia.menorFolgaPx, folga);
  };

  return {
    quadro,
    definirLuz(f) {
      luz = f;
      vista?.definirLuz(f);
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
    custo() {
      const malhas = [...osso.getChildMeshes(false), sombra].filter((m) => m.isEnabled());
      let tri = 0;
      for (const m of malhas) tri += (m.getTotalIndices?.() ?? 0) / 3;
      return { malhas: malhas.length, triangulos: Math.round(tri) };
    },
    descartar() {
      if (corpoMexido) mostrarCorpo(true, true, false);
      vista?.descartar();
      sombra.dispose();
      matSombra.dispose();
      texSombra.dispose();
      osso.dispose();
      suporte.dispose();
    },
  };
}
