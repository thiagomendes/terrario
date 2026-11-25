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
 * As variantes (botões A, B e C no alto):
 * - A: a mão vazia não aparece; entra só para agir (tocar, colocar, acenar, comer) e sai. Com
 *   bloco ou item, a mão aparece segurando, baixa e de lado.
 * - B: igual à A, mas andando de mão vazia ela aparece baixinha e relaxada na beira da tela.
 * - C: as duas mãos: o bloco vem seguro com as duas mãos, embaixo e no meio (como uma criança
 *   segura um brinquedo); para agir de mão vazia, entram as duas.
 * Em todas: o corpo, os pés, a roupa e o brinquedo de andar ao olhar para baixo, a sombra no
 * chão, o balanço suave do passo e a câmera abaixando um pouco ao pousar de um pulo.
 */
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import type { GanchoPrimeiraPessoa } from '../render/cena';
import type { Personagem } from '../render/personagem';
import { criarBoneco } from '../render/boneco';
import type { Aparencia } from '../personagem/aparencia';

export type Variante = 'A' | 'B' | 'C';

interface EsbocoPrimeiraPessoa {
  /** Liga (true) ou desliga a primeira pessoa, com a transição. */
  primeira(sim: boolean): void;
  ligada(): boolean;
  /** 0 em terceira pessoa, 1 dentro da cabeça (a transição no meio). */
  fracao(): number;
  variante(v: Variante): void;
  /** Peso de cada mão na tela (0 fora, 1 inteira). */
  maos(): { direita: number; esquerda: number };
  /** Malhas e triângulos do que o esboço soma. */
  custo(): { malhas: number; triangulos: number };
}

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
/** Balanço do passo: altura (blocos) e lado, por passada. */
const BALANCO_ALTURA = 0.022;
const BALANCO_LADO = 0.012;
/** Pouso: quanto a câmera abaixa (blocos) por segundo de queda, no máximo POUSO_MAXIMO. */
const POUSO_POR_SEGUNDO = 0.14;
const POUSO_MAXIMO = 0.09;
/** Olhando mais para baixo que isto, a mão sai de vista (o braço do corpo aparece). */
const PITCH_SEM_MAO = 0.85;
/**
 * O braço da frente é o do boneco, em miniatura: do tamanho de verdade, a meio palmo dos olhos,
 * ele tapava meia tela do celular em pé. Menor e no mesmo lugar da tela, fica do tamanho de uma
 * mão vista de dentro (e nunca entra na parede: desenha por cima).
 */
const ESCALA_VISTA = 0.26;
/**
 * A manga da frente é mais comprida que a do boneco (só ela; a mão e o item ficam do tamanho
 * certo): assim o ombro fica sempre fora da tela e só o antebraço e a mão aparecem. Com a manga
 * do boneco, a mão do tamanho certo deixava a ponta do ombro no meio da tela.
 */
const ALONGA_MANGA = 3;
/** O item na mão da frente, um pouco menor que o da mão do boneco (não tapa a obra). */
const ESCALA_ITEM = 0.8;
/** Do ombro à junta da mão, nas medidas do boneco (a escala vem da matriz do ombro). */
const BRACO = 0.27;

/**
 * Uma pose da mão na tela: onde a mão fica (x e y de -1 a 1 na tela, `d` à frente dos olhos) e
 * de onde o braço vem (`v`: do ombro para a mão, no espaço da câmera; x para dentro da tela,
 * y para cima, z para a frente). O ombro fica sempre fora da tela, embaixo: só o antebraço e a
 * mão aparecem, nunca o braço inteiro esticado.
 */
interface PoseMao {
  sx: number;
  sy: number;
  d: number;
  v: [number, number, number];
}
// (no celular em pé, a faixa de baixo da tela é do controle, dos botões e da barra: a mão fica
// logo acima deles, entre o meio e a beira)
const FORA: PoseMao = { sx: 0.75, sy: -1.6, d: 0.34, v: [-0.2, 0.8, 0.5] };
/** A: o item baixo e de lado, braço relaxado (nunca esticado para a frente). */
const SEGURAR: PoseMao = { sx: 0.45, sy: -0.42, d: 0.36, v: [-0.3, 0.75, 0.55] };
/** B: a mão vazia andando, baixinha na beira (só a mão e o punho aparecem). */
const RELAXADA: PoseMao = { sx: 0.62, sy: -0.62, d: 0.34, v: [-0.2, 0.85, 0.45] };
/** Colocar ou tocar: a mão vai até perto do meio, para a frente, e volta. */
const ALCANCAR: PoseMao = { sx: 0.14, sy: -0.15, d: 0.46, v: [-0.25, 0.45, 0.85] };
/** Acenar: a mão no alto, do lado, abanando. */
const ACENAR: PoseMao = { sx: 0.45, sy: 0.02, d: 0.28, v: [-0.15, 1, 0.45] };
/** Comer: a mão sobe até a boca (embaixo, no meio). */
const COMER: PoseMao = { sx: 0.1, sy: -0.4, d: 0.26, v: [-0.55, 0.75, 0.35] };
/** C: o bloco com as duas mãos, embaixo e no meio. */
const DUAS_SEGURAR: PoseMao = { sx: 0.2, sy: -0.48, d: 0.36, v: [-0.55, 0.65, 0.5] };
const DUAS_ALCANCAR: PoseMao = { sx: 0.14, sy: -0.2, d: 0.46, v: [-0.4, 0.4, 0.82] };

const misturar = (a: PoseMao, b: PoseMao, t: number): PoseMao => ({
  sx: a.sx + (b.sx - a.sx) * t,
  sy: a.sy + (b.sy - a.sy) * t,
  d: a.d + (b.d - a.d) * t,
  v: [0, 1, 2].map((i) => a.v[i] + (b.v[i] - a.v[i]) * t) as [number, number, number],
});
const suave = (t: number) => {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
};
const aproximar = (a: number, b: number, taxa: number, dt: number) =>
  a + (b - a) * (1 - Math.exp(-taxa * dt));

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
  let variante: Variante = 'A';
  let ligado = false;
  let t = 0;
  // ---------------------------------------------------------------- o braço na frente dos olhos
  // a mão desenha por cima do mundo (nunca entra na parede): um grupo de desenho próprio
  const GRUPO = 2;
  scene.setRenderingAutoClearDepthStencil(GRUPO, true, true, true);
  const suporte = new TransformNode('esb-pp-suporte', scene);
  suporte.parent = visao;
  let vista: Personagem | null = null;
  let aparenciaDaVista: Aparencia | null = null;
  const ombros: Record<'D' | 'E', TransformNode> = {
    D: new TransformNode('esb-pp-ombroD', scene),
    E: new TransformNode('esb-pp-ombroE', scene),
  };
  ombros.D.parent = suporte;
  ombros.E.parent = suporte;
  let malhasBraco: Record<'D' | 'E', AbstractMesh[]> = { D: [], E: [] };
  /** Do ombro à junta da mão (medidas do boneco, antes de esticar a manga). */
  const comprimento = { D: BRACO, E: BRACO };
  const montarVista = (a: Aparencia) => {
    vista?.descartar();
    aparenciaDaVista = a;
    // o mesmo boneco do jogador (sem o brinquedo de andar: só o braço aparece)
    const semMontar: Aparencia = { ...a };
    delete semMontar.montado;
    // (sem fundir: a mão fica numa junta própria e não estica com a manga)
    vista = criarBoneco(scene, semMontar, 'esb-pp', undefined, false, true);
    const todas = vista.raiz.getChildMeshes(false);
    const escala = scene.getTransformNodeByName('esb-pp-escala')?.scaling.x ?? 1.15;
    malhasBraco = { D: [], E: [] };
    for (const lado of ['D', 'E'] as const) {
      const braco = scene.getTransformNodeByName(`esb-pp-junta-braco${lado}`);
      if (!braco) continue;
      braco.parent = ombros[lado];
      braco.position.setAll(0);
      braco.rotation.setAll(0);
      const k = escala * ESCALA_VISTA;
      ombros[lado].scaling.set(k, k * ALONGA_MANGA, k);
      const mao = scene.getTransformNodeByName(`esb-pp-junta-mao${lado}`);
      if (mao) {
        mao.scaling.set(1, 1 / ALONGA_MANGA, 1);
        mao.rotation.setAll(0);
        // a manga estica, o vão entre a ponta da manga e a mão não: a mão continua encostada
        let ponta = 0;
        for (const m of braco.getChildMeshes(true)) {
          const b = m.getBoundingInfo().boundingBox;
          ponta = Math.min(ponta, m.position.y + b.minimum.y * m.scaling.y);
        }
        ponta = Math.max(ponta, mao.position.y);
        const yMao = ponta + (mao.position.y - ponta) / ALONGA_MANGA;
        mao.position.y = yMao;
        comprimento[lado] = -yMao;
      }
    }
    vista.noDaMao().scaling.setAll(ESCALA_ITEM);
    for (const m of todas) {
      const lado = (['D', 'E'] as const).find((l) => {
        const b = scene.getTransformNodeByName(`esb-pp-junta-braco${l}`);
        return b && m.isDescendantOf(b);
      });
      if (!lado) m.setEnabled(false);
      else malhasBraco[lado].push(m);
    }
    marcarGrupo();
  };
  const marcarGrupo = () => {
    for (const lado of ['D', 'E'] as const)
      for (const m of ombros[lado].getChildMeshes(false)) {
        m.renderingGroupId = GRUPO;
        m.isPickable = false;
        m.alwaysSelectAsActiveMesh = true;
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
  const peso = { D: 0, E: 0 };
  let chaveMao = '';
  /** Trocar de item: 0 parado; sobe de 0 a 1 (desce até 0,5, troca, sobe de volta). */
  let troca = -1;
  let pendente: ReturnType<GanchoPrimeiraPessoa['naMao']> | null = null;
  let golpeAntes = 0;
  /** O impulso de tocar ou colocar (0 a 1; -1 parado). */
  let alcance = -1;
  // a cabeça e os braços do boneco de verdade: some a junta inteira (com o que estiver preso
  // nela, como a comida mordida), e o boneco continua inteiro para os amigos
  const junta = (n: string) => scene.getTransformNodeByName(`personagem-junta-${n}`);
  const mostrarCorpo = (cabeca: boolean, bracos: boolean) => {
    junta('cabeca')?.setEnabled(cabeca);
    junta('bracoD')?.setEnabled(bracos);
    junta('bracoE')?.setEnabled(bracos);
  };

  const posicionarMao = (lado: 'D' | 'E', p: PoseMao, balancoX: number, balancoY: number) => {
    const o = ombros[lado];
    const tanV = Math.tan(visao.fov / 2);
    const aspecto = scene.getEngine().getAspectRatio(visao);
    // (deitado, a tela é larga: a mão não vai para a ponta, fica na mesma distância do meio que
    // no celular em pé, mais ou menos)
    const tanH = tanV * Math.min(aspecto, 0.8);
    const s = lado === 'D' ? 1 : -1;
    // a mão no lugar da tela; o braço vem do ombro (fora da tela, embaixo) até ela
    const mao = new Vector3(s * (p.sx + balancoX) * p.d * tanH, (p.sy + balancoY) * p.d * tanV, p.d);
    const dir = new Vector3(s * p.v[0], p.v[1], p.v[2]).normalize();
    // o braço do boneco pende para baixo (-y): gira -y até a direção do ombro para a mão
    const de = new Vector3(0, -1, 0);
    const eixo = Vector3.Cross(de, dir);
    const angulo = Math.acos(Math.min(1, Math.max(-1, Vector3.Dot(de, dir))));
    if (eixo.lengthSquared() < 1e-8) o.rotationQuaternion = Quaternion.Identity();
    else o.rotationQuaternion = Quaternion.RotationAxis(eixo.normalize(), angulo);
    o.position.copyFrom(mao.subtract(dir.scale(comprimento[lado] * o.scaling.y)));
  };

  /** O corpo está com partes escondidas (volta inteiro ao sair). */
  let cheio = false;
  g.quadro = (dt) => {
    const alvo = ligado ? 1 : 0;
    const passo = dt / DURACAO_TRANSICAO;
    t = alvo > t ? Math.min(1, t + passo) : Math.max(0, t - passo);
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
      g.travarYaw(null);
      sombra.setEnabled(false);
      for (const lado of ['D', 'E'] as const) for (const m of malhasBraco[lado]) m.setEnabled(false);
      peso.D = peso.E = 0;
      return;
    }
    if (!vista || ap !== aparenciaDaVista) montarVista(ap);
    // ---------------- a câmera entra pela cabeça (sem corte seco) e balança no passo
    if (jog.noChao) {
      if (noArDesde >= 0) {
        const noAr = performance.now() / 1000 - noArDesde;
        if (noAr > 0.25 && !jog.voando) pousoVel -= Math.min(POUSO_MAXIMO * 9, noAr * POUSO_POR_SEGUNDO * 9);
      }
      noArDesde = -1;
    } else if (noArDesde < 0) noArDesde = performance.now() / 1000;
    // mola do pouso: abaixa rápido e volta macia
    pousoVel += (-pouso * 90 - pousoVel * 12) * dt;
    pouso = Math.max(-POUSO_MAXIMO, Math.min(0.02, pouso + pousoVel * dt));
    const passada = Math.min(1.4, v.passada) * (jog.noChao ? 1 : 0);
    fase += dt * (4.2 + vel * 0.9) * (passada > 0.05 ? 1 : 0);
    const bobY = Math.sin(fase * 2) * BALANCO_ALTURA * passada;
    const bobX = Math.cos(fase) * BALANCO_LADO * passada;
    // olhando para baixo, os olhos vão um pouco para a frente e descem: o peito largo do boneco
    // não tapa a barriga, os pés e o brinquedo de andar (como quem se inclina para se ver)
    const baixo = suave((pitch - 0.45) / 0.95);
    const frente = FRENTE_OLHOS + FRENTE_OLHANDO_BAIXO * baixo;
    const destino = new Vector3(
      olhos.position.x + Math.sin(yaw) * frente + Math.cos(yaw) * bobX,
      olhos.position.y + bobY + pouso - DESCE_OLHANDO_BAIXO * baixo,
      olhos.position.z + Math.cos(yaw) * frente - Math.sin(yaw) * bobX,
    );
    visao.position.copyFrom(Vector3.Lerp(visao.position, destino, e));
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
      const k = Math.max(0.35, 1 - altura * 0.18);
      sombra.position.set(jog.x, chao + 0.015, jog.z);
      sombra.scaling.set(k, 1, k);
      matSombra.alpha = e * k;
    } else sombra.setEnabled(false);
    // ---------------- a mão: o que ela faz agora
    const mao = g.naMao();
    const chave = `${mao.bloco ?? ''}|${mao.item ?? ''}`;
    const temItem = mao.bloco !== null || mao.item !== null;
    if (chave !== chaveMao) {
      if (chaveMao === '' && troca < 0) {
        vista!.definirNaMao(mao.bloco, mao.item, mao.qtd);
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
    const duas = variante === 'C';
    let base: PoseMao | null = null;
    let baseE: PoseMao | null = null;
    if (gesto) base = ACENAR;
    else if (v.comer !== null) base = COMER;
    else if (agindo) {
      const f = Math.sin(Math.PI * Math.min(1, alcance));
      const segurar = duas ? DUAS_SEGURAR : SEGURAR;
      const alcancar = duas ? DUAS_ALCANCAR : ALCANCAR;
      base = misturar(temItem ? segurar : RELAXADA, alcancar, f);
      if (duas) baseE = misturar(DUAS_SEGURAR, DUAS_ALCANCAR, f);
    } else if (temItem) {
      base = duas ? DUAS_SEGURAR : SEGURAR;
      if (duas && mao.bloco !== null) baseE = DUAS_SEGURAR;
    } else if (variante === 'B' && passada > 0.3) base = RELAXADA;
    // olhando bem para baixo, a mão sai (o braço do próprio corpo aparece)
    const sumir = suave((pitch - PITCH_SEM_MAO) / 0.25);
    const querD = base ? (1 - sumir) * (troca >= 0 ? Math.abs(Math.cos(Math.PI * troca)) : 1) : 0;
    const querE = baseE ? (1 - sumir) * (troca >= 0 ? Math.abs(Math.cos(Math.PI * troca)) : 1) : 0;
    peso.D = aproximar(peso.D, querD * e, troca >= 0 ? 40 : 9, dt);
    peso.E = aproximar(peso.E, querE * e, 9, dt);
    const balX = Math.cos(fase) * 0.05 * passada;
    const balY = Math.abs(Math.sin(fase)) * 0.06 * passada;
    let poseD = misturar(FORA, base ?? SEGURAR, peso.D);
    if (gesto) {
      // abanando: a mão vai de um lado para o outro, presa no ombro (o antebraço balança)
      const abana = Math.sin((performance.now() / 1000) * 9) * peso.D;
      poseD = {
        ...poseD,
        sx: poseD.sx + abana * 0.1,
        v: [poseD.v[0] - abana * 0.45, poseD.v[1], poseD.v[2]],
      };
    }
    posicionarMao('D', poseD, balX, -balY);
    posicionarMao('E', misturar(FORA, baseE ?? DUAS_SEGURAR, peso.E), -balX, -balY);
    for (const m of malhasBraco.D) m.setEnabled(peso.D > 0.02);
    for (const m of malhasBraco.E) m.setEnabled(peso.E > 0.02);
  };

  function acharChao(x: number, y: number, z: number): number | null {
    const bloco = window.__brumaluz?.bloco;
    if (!bloco) return null;
    for (let k = 0; k < 8; k++) {
      const yy = Math.floor(y + 0.01) - 1 - k;
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
    .esb-pp-variantes { position: fixed; left: calc(12px + env(safe-area-inset-left));
      top: calc(118px + env(safe-area-inset-top)); display: flex; gap: 6px; z-index: 50;
      background: rgba(255,255,255,0.85); padding: 4px 8px; border-radius: 14px;
      font: 600 13px system-ui, sans-serif; color: #334; align-items: center; }
    .esb-pp-variantes button { width: 34px; height: 30px; border-radius: 10px; border: 2px solid #889;
      background: #fff; font: 700 15px system-ui, sans-serif; color: #334; padding: 0; }
    .esb-pp-variantes button.ativa { background: #4a7de8; border-color: #4a7de8; color: #fff; }
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
  const barra = document.createElement('div');
  barra.className = 'esb-pp-variantes';
  barra.innerHTML = '<span>Esboço</span>';
  const botoes: Record<Variante, HTMLButtonElement> = {} as Record<Variante, HTMLButtonElement>;
  for (const vv of ['A', 'B', 'C'] as const) {
    const b = document.createElement('button');
    b.textContent = vv;
    b.addEventListener('pointerdown', (ev) => ev.stopPropagation());
    b.addEventListener('click', (ev) => {
      ev.stopPropagation();
      api.variante(vv);
    });
    botoes[vv] = b;
    barra.appendChild(b);
  }
  document.body.appendChild(barra);

  const api: EsbocoPrimeiraPessoa = {
    primeira(sim) {
      ligado = sim;
      olho.classList.toggle('ligado', sim);
    },
    ligada: () => ligado,
    fracao: () => t,
    variante(vv) {
      variante = vv;
      for (const k of Object.keys(botoes) as Variante[]) botoes[k].classList.toggle('ativa', k === vv);
      try {
        localStorage.setItem('terrario:esboco-pp', vv);
      } catch {
        // sem armazenamento: começa na A
      }
    },
    maos: () => ({ direita: peso.D, esquerda: peso.E }),
    custo: () => {
      const malhas = [...malhasBraco.D, ...malhasBraco.E, sombra].filter((m) => m.isEnabled());
      const extra = vista ? vista.contarMalhasMao() : 0;
      let tri = 0;
      for (const m of malhas) tri += (m.getTotalIndices?.() ?? 0) / 3;
      return { malhas: malhas.length + extra, triangulos: Math.round(tri) };
    },
  };
  let salva: Variante = 'A';
  try {
    const s = localStorage.getItem('terrario:esboco-pp');
    if (s === 'A' || s === 'B' || s === 'C') salva = s;
  } catch {
    // sem armazenamento
  }
  api.variante(salva);
  window.__primeiraPessoa = api;
}
