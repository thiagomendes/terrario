/**
 * Esboço da spec 037 "Construir melhor" (só com `?esboco=primeira-pessoa`): a câmera em
 * primeira pessoa, num botão com um olhinho. O `main.ts` importa este arquivo sob demanda: vira
 * um pedaço à parte que o jogo nunca baixa.
 *
 * Tudo é o jogo de verdade: a câmera solta de hoje (girar, arrastar, o mesmo controle) continua
 * mandando no olhar. O esboço segue a recomendação do estudo do braço
 * (`.sdd/specs/037-construir-melhor/referencia/estudo-braco-primeira-pessoa.md`), aprovada pelo
 * dono em 25 nov:
 * - a câmera fica nos olhos de verdade do boneco (o ponto entre os olhos, logo atrás do rosto);
 *   a cabeça some e o resto do corpo fica;
 * - o braço da frente é o braço inteiro de um segundo boneco de verdade (`criarBoneco`, a mesma
 *   roupa e o mesmo item: `definirNaMao`), no tamanho dele, sem dobra e sem esticar, girando num
 *   ombro fixo fora da beira direita. O ponto do ombro sai de uma conta para cada tela
 *   (`acharOmbro`, a mesma de `conta-braco.mjs`);
 * - os ângulos de junta vêm da terceira pessoa: segurar é o "comer" baixado 15°; o passo, o pulo,
 *   o aceno e o comer são os do boneco de verdade, em escala;
 * - a mão vazia só entra para agir (a variante A); a mira (o pontinho e o contorno fino); a
 *   câmera solta; a entrada e a saída pela cabeça com o olhinho.
 */
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector';
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

interface EsbocoPrimeiraPessoa {
  /** Liga (true) ou desliga a primeira pessoa, com a transição. */
  primeira(sim: boolean): void;
  ligada(): boolean;
  /** 0 em terceira pessoa, 1 dentro da cabeça (a transição no meio). */
  fracao(): number;
  /** Peso da mão na tela (0 fora, 1 inteira). */
  maos(): { direita: number; esquerda: number };
  /** A célula onde o bloco entra se a criança tocar no meio da tela (null sem mira). */
  mira(): [number, number, number] | null;
  /** Malhas e triângulos do que o esboço soma. */
  custo(): { malhas: number; triangulos: number };
  /** Onde a mão e o ombro caem na tela (px), e o ombro achado para esta tela. */
  tela(): { mao: [number, number]; ombro: [number, number]; ombroCamera: number[]; maoPx: number };
  /**
   * A conferência do ombro desde o último `zerarPonta`: em quantos quadros o braço apareceu e a
   * menor folga (px) entre o ombro, com a grossura da manga, e a beira da tela (positiva: fora).
   */
  ponta(): { quadros: number; menorFolgaPx: number };
  zerarPonta(): void;
}

declare global {
  interface Window {
    __primeiraPessoa?: EsbocoPrimeiraPessoa;
  }
}

// ------------------------------------------------------------------ números do esboço
/** A entrada e a saída pela cabeça (s). */
const DURACAO_TRANSICAO = 0.7;
/** O empurrão de colocar, visto de dentro (s): o do corpo dura 0,2 s, rápido demais. */
const DURACAO_ALCANCE = 0.45;
/**
 * Os olhos, no espaço da cabeça do boneco (sem a escala): o ponto entre os olhos (que ficam a
 * −0,04 e 0,33 à frente do centro), logo atrás do rosto (a cara da cabeça fica a 0,325).
 */
const OLHOS_NA_CABECA = new Vector3(0, -0.04, 0.3);
/** Olhando bem para baixo, o olhar passa um tico da vertical: aparecem o peito e os sapatos. */
const PITCH_CURVADO = 0.35;
/** Pouso: quanto a câmera abaixa (blocos) por segundo de queda, no máximo POUSO_MAXIMO. */
const POUSO_POR_SEGUNDO = 0.14;
const POUSO_MAXIMO = 0.09;
/** Olhando mais para baixo que isto, a mão sai de vista (o corpo aparece). */
const PITCH_SEM_MAO = 0.85;
/** O braço do boneco, já com a escala 1,15: do ombro à junta da mão e o raio da mão (blocos). */
const ESCALA_BONECO = 1.15;
const BRACO = 0.27 * ESCALA_BONECO;
const RAIO_MAO = 0.085 * ESCALA_BONECO;
/** Meia grossura da manga com a quina (o que tem de ficar fora da tela junto com o ombro). */
const MEIA_MANGA = 0.11;
/** O ombro nunca chega mais perto da câmera que isto (o plano de corte é 0,1). */
const PERTO = 0.15;
/** A mão fica 1,2 vez a menor que a conta permite (mais antebraço), sem passar de 22% da largura. */
const FATOR_MAO = 1.2;
const MAO_MAX_LARGURA = 0.22;

/**
 * Os ângulos de junta do braço (rad, como no boneco: x leva para a frente, z abre para fora;
 * negativo leva para dentro). Segurar é o "comer" da terceira pessoa (x −1,5, z −0,69, medido
 * no jogo) baixado 15°. O aceno sobe o braço para a frente, com o abano do boneco em volta de
 * −1,0 (para a mão não sair pela direita).
 */
const SEGURAR: [number, number] = [-1.24, -0.69];
const ACENAR: [number, number] = [-2.2, -1.0];
/** O quanto dos movimentos da terceira pessoa entra (passo, pulo, colocar, comer). */
const GANHO_PASSO = 0.12;
const GANHO_PULO = 0.25;
const EMPURRAO_COLOCAR = -0.32;
const GANHO_COMER_X = 0.37;
const GANHO_COMER_Z = 0.3;
/** Fora: o braço gira para baixo até a mão sumir pela beira de baixo. */
const FORA_X = 0.2;

/** A direção do braço (do ombro para a mão) pelos ângulos de junta, como no boneco. */
const direcao = (x: number, z: number) =>
  new Vector3(Math.sin(z), -Math.cos(z) * Math.cos(x), -Math.cos(z) * Math.sin(x));

/**
 * O ombro fixo (no espaço da câmera: x direita, y cima, z frente) para uma tela: a mão de segurar
 * no canto de baixo à direita, com o bloco acima dos botões; o ombro, com a grossura da manga,
 * fora da tela e na frente do plano de corte; e, nas outras ações, a mão inteira na tela. Acha o
 * de mão menor e aproxima o braço até a mão ficar FATOR_MAO maior, se ainda couber.
 * (A mesma conta de `.sdd/specs/037-construir-melhor/referencia/conta-braco.mjs`.)
 */
export function acharOmbro(
  w: number,
  h: number,
  fovV: number,
  botoes: number,
): { ombro: Vector3; maoPx: number } | null {
  const aspecto = w / h;
  const tanV = Math.tan(fovV / 2);
  const tanH = tanV * aspecto;
  const proj = (p: Vector3) => [(w / 2) * (1 + p.x / (p.z * tanH)), (h / 2) * (1 - p.y / (p.z * tanV))];
  const fora = (p: Vector3, r: number) => {
    const [x, y] = proj(p);
    return Math.max(-x, x - w, -y, y - h) - (r / (p.z * tanV)) * (h / 2);
  };
  const d0 = direcao(SEGURAR[0], SEGURAR[1]);
  const acoes: [number, number][] = [
    SEGURAR,
    [SEGURAR[0] - 0.06, SEGURAR[1]],
    [SEGURAR[0] + 0.06, SEGURAR[1]],
    [SEGURAR[0], SEGURAR[1] + 0.12],
    [SEGURAR[0] + EMPURRAO_COLOCAR, SEGURAR[1]],
    [ACENAR[0], ACENAR[1] + 0.35],
    [ACENAR[0], ACENAR[1] - 0.35],
    [SEGURAR[0] - 1.5 * GANHO_COMER_X, SEGURAR[1] - 0.78 * GANHO_COMER_Z],
  ];
  const serve = (ombro: Vector3) => {
    if (ombro.z < PERTO || fora(ombro, MEIA_MANGA) < 4) return false;
    for (let i = 0; i < acoes.length; i++) {
      const m = ombro.add(direcao(acoes[i][0], acoes[i][1]).scale(BRACO));
      const [px, py] = proj(m);
      const r = (RAIO_MAO / (m.z * tanV)) * (h / 2);
      if (m.z < PERTO || px - r < 0 || px + r > w || py - r < 0 || py + r > h) return false;
      // segurando, o bloco (uma mão abaixo dela) fica acima dos botões
      if (i === 0 && py + 2.2 * r > botoes - 8) return false;
    }
    return true;
  };
  // todas as posições que servem (a mão no canto, em cada distância)
  const servem: { tx: number; ty: number; z: number; px: number }[] = [];
  for (let tx = 0.2; tx <= 0.751; tx += 0.025)
    for (let ty = -0.45; ty <= -0.149; ty += 0.025)
      for (let z = 3; z >= 0.2; z -= 0.006) {
        const mao = new Vector3(tx * z * tanH, ty * z * tanV, z);
        if (serve(mao.subtract(d0.scale(BRACO)))) servem.push({ tx, ty, z, px: (RAIO_MAO / (z * tanV)) * h });
      }
  if (!servem.length) return null;
  // a menor mão que serve; e, dela, a maior que não passa de FATOR_MAO vezes (mais antebraço na
  // tela) nem de MAO_MAX_LARGURA da largura
  const menor = Math.min(...servem.map((s) => s.px));
  const alvo = Math.min(menor * FATOR_MAO, w * MAO_MAX_LARGURA);
  let melhor = servem[0];
  for (const s of servem) if (s.px <= alvo && (melhor.px > alvo || s.px > melhor.px)) melhor = s;
  const mao = new Vector3(melhor.tx * melhor.z * tanH, melhor.ty * melhor.z * tanV, melhor.z);
  return { ombro: mao.subtract(d0.scale(BRACO)), maoPx: Math.round(melhor.px) };
}

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
  /** O braço da frente: gira no ombro fixo (no espaço da câmera). */
  const osso = new TransformNode('esb-pp-ossoD', scene);
  osso.parent = suporte;
  osso.rotationQuaternion = Quaternion.Identity();
  let vista: Personagem | null = null;
  let aparenciaDaVista: Aparencia | null = null;
  let malhasBraco: AbstractMesh[] = [];
  /** A junta da mão da frente: fica de pé na tela (o item não deita com o braço). */
  let juntaMao: TransformNode | null = null;
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
    const braco = scene.getTransformNodeByName('esb-pp-junta-bracoD');
    malhasBraco = [];
    if (braco) {
      braco.parent = osso;
      braco.position.setAll(0);
      braco.rotation.setAll(0);
    }
    // o braço no tamanho de verdade, a mesma escala nas três direções: nada estica
    osso.scaling.setAll(ESCALA_BONECO);
    juntaMao = scene.getTransformNodeByName('esb-pp-junta-maoD');
    for (const m of todas) {
      // só o braço direito; a bolinha do ombro fica fora da tela de qualquer jeito
      if (braco && m.isDescendantOf(braco)) malhasBraco.push(m);
      else m.setEnabled(false);
      semBrilho(m);
    }
    vista.definirLuz(luz);
    marcarGrupo();
  };
  const marcarGrupo = () => {
    for (const m of osso.getChildMeshes(false)) {
      m.renderingGroupId = GRUPO;
      m.isPickable = false;
      m.alwaysSelectAsActiveMesh = true;
      semBrilho(m);
    }
  };

  // ---------------------------------------------------------------- o ombro desta tela
  let ombro = new Vector3(0.594, -0.307, 1.466);
  let maoPx = 0;
  let chaveTela = '';
  /** O alto dos botões e da barra na metade direita, embaixo (a mão e o bloco ficam acima). */
  const altoDosBotoes = (w: number, h: number) => {
    let alto = h;
    for (const el of document.querySelectorAll<HTMLElement>('button, .barra')) {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height || r.top < h * 0.55 || r.right < w * 0.5) continue;
      alto = Math.min(alto, r.top);
    }
    return alto;
  };
  const conferirTela = () => {
    const r = scene.getEngine().getRenderingCanvas()!.getBoundingClientRect();
    const chave = `${Math.round(r.width)}x${Math.round(r.height)}|${visao.fov.toFixed(3)}`;
    if (chave === chaveTela) return;
    chaveTela = chave;
    const achado = acharOmbro(r.width, r.height, visao.fov, altoDosBotoes(r.width, r.height));
    if (achado) {
      ombro = achado.ombro;
      maoPx = achado.maoPx;
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
  let noArDesde = -1;
  let pouso = 0;
  let pousoVel = 0;
  let peso = 0;
  let chaveMao = '';
  /** Trocar de item: 0 parado; sobe de 0 a 1 (desce até 0,5, troca, sobe de volta). */
  let troca = -1;
  let pendente: ReturnType<GanchoPrimeiraPessoa['naMao']> | null = null;
  let golpeAntes = 0;
  /** O empurrão de tocar ou colocar (0 a 1; -1 parado). */
  let alcance = -1;
  /** A mola do braço (rad): sobe um tico no pulo, afunda e volta ao pousar. */
  let mola = 0;
  let molaVel = 0;
  let maoNaTela: [number, number] = [0, 0];
  let ombroNaTela: [number, number] = [0, 0];
  const vigia = { quadros: 0, menorFolgaPx: Infinity };

  // ---------------------------------------------------------------- a mira de colocar
  // onde o bloco vai entrar se a criança tocar no meio da tela: um contorno de gomos finos e
  // claros na célula, com o miolo bem de leve (a mesma conta do toque: `preverToque`, com o raio
  // saindo da câmera que desenha a tela). A grossura do gomo acompanha a distância: de perto fica
  // fino (não toma meia tela) e, fora do brilho da tela, não borra.
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
   * Os olhos do boneco de verdade, no mundo: o ponto da cabeça (o pescoço anda com o corpo: o
   * passo, o pulo, o pouso), com o rumo do corpo e sem o balanço da cabeça (a cabeça acenando
   * com o olhar balançaria a câmera).
   */
  const olhosDoBoneco = (yaw: number): Vector3 | null => {
    const cab = junta('cabeca');
    if (!cab) return null;
    cab.computeWorldMatrix(true);
    const p = cab.getAbsolutePosition();
    const o = OLHOS_NA_CABECA.scale(ESCALA_BONECO);
    return new Vector3(
      p.x + Math.sin(yaw) * o.z,
      p.y + o.y,
      p.z + Math.cos(yaw) * o.z,
    );
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

  /** O corpo está com partes escondidas (volta inteiro ao sair). */
  let cheio = false;
  g.quadro = (dt) => {
    const alvoT = ligado ? 1 : 0;
    const passo = dt / DURACAO_TRANSICAO;
    t = alvoT > t ? Math.min(1, t + passo) : Math.max(0, t - passo);
    const e = suave(t);
    const jog = g.jogador();
    const v = g.vista();
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
      for (const m of malhasBraco) m.setEnabled(false);
      peso = 0;
      atualizarMira(false);
      return;
    }
    if (!vista || ap !== aparenciaDaVista) montarVista(ap);
    conferirTela();
    // ---------------- o corpo vira junto com o olhar
    const yawCorpo = window.__brumaluz?.yawBoneco?.() ?? yaw;
    g.travarYaw(e >= 1 ? yaw : yawCorpo + ((((yaw - yawCorpo + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI) - Math.PI) * e);
    g.personagem.definirOpacidade(1);
    // ---------------- a câmera entra pela cabeça (sem corte seco) até os olhos de verdade
    if (jog.noChao) {
      if (noArDesde >= 0) {
        const noAr = performance.now() / 1000 - noArDesde;
        if (noAr > 0.25 && !jog.voando) {
          pousoVel -= Math.min(POUSO_MAXIMO * 9, noAr * POUSO_POR_SEGUNDO * 9);
          // o braço afunda junto e volta na mola
          molaVel += Math.min(1.6, noAr * 2.2);
        }
      }
      noArDesde = -1;
    } else if (noArDesde < 0) noArDesde = performance.now() / 1000;
    // mola do pouso: abaixa rápido e volta macia
    pousoVel += (-pouso * 90 - pousoVel * 12) * dt;
    pouso = Math.max(-POUSO_MAXIMO, Math.min(0.02, pouso + pousoVel * dt));
    const destino = olhosDoBoneco(yaw) ?? olhos.position.clone();
    destino.y += pouso;
    visao.position.copyFrom(Vector3.Lerp(visao.position, destino, e));
    // olhando bem para baixo, o olhar passa um tico da vertical: o peito e os sapatos aparecem
    // (o alto da tela continua sendo a frente: nada vira de ponta-cabeça)
    const curva = suave((pitch - 1.0) / 0.45);
    visao.rotation.x = pitch + PITCH_CURVADO * curva * e;
    visao.updateUpVectorFromRotation = curva > 0;
    if (curva <= 0) visao.upVector.set(0, 1, 0);
    // a cabeça some quando a câmera passa por ela; os braços do corpo só aparecem olhando para
    // baixo, quando a mão da frente já saiu (nunca dois braços)
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
    // ---------------- a mão: o que ela segura
    const mao = g.naMao();
    const chave = `${mao.bloco ?? ''}|${mao.item ?? ''}`;
    const temItem = mao.bloco !== null || mao.item !== null;
    if (chave !== chaveMao) {
      if (chaveMao === '' && troca < 0) {
        vista!.definirNaMao(mao.bloco, mao.item, mao.qtd);
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
    // ---------------- o que a mão faz: os ângulos de junta da terceira pessoa, em escala
    const gesto = g.gesto();
    const golpe = v.golpe ?? v.colocar;
    if (golpe !== null && !golpeAntes) alcance = 0;
    golpeAntes = golpe !== null ? 1 : 0;
    if (alcance >= 0) alcance += dt / DURACAO_ALCANCE;
    if (alcance >= 1) alcance = -1;
    const agindo = alcance >= 0;
    const comendo = v.comer !== null;
    // (a variante A: a mão vazia some; entra para tocar, colocar, acenar e comer)
    const aparece = temItem || !!gesto || comendo || agindo;
    const sumir = suave((pitch - PITCH_SEM_MAO) / 0.25);
    const quer = aparece ? (1 - sumir) * (troca >= 0 ? Math.abs(Math.cos(Math.PI * troca)) : 1) : 0;
    peso = aproximar(peso, quer * e, troca >= 0 ? 40 : 9, dt);
    // o braço de verdade do boneco (escondido, mas animado como sempre)
    const real = junta('bracoD');
    const rx = real?.rotation.x ?? 0;
    const rz = real?.rotation.z ?? 0.09;
    const descansoX = temItem ? -0.32 : 0;
    let [x, z] = SEGURAR;
    // o aceno: o braço sobe para a frente, no tempo do aceno do boneco, e a mão abana com ele
    const wAceno = gesto ? suave((rz - 0.09) / 2.3) : 0;
    // o comer: a comida sobe para o meio, no tempo da refeição do boneco (leva, mordidas, desce)
    const leva = comendo ? Math.max(0, Math.min(1, (descansoX - rx) / 1.5)) : 0;
    if (wAceno > 0) {
      x += (ACENAR[0] - x) * wAceno;
      z += (ACENAR[1] - z) * wAceno + (rz - 2.6) * wAceno;
    } else if (comendo) {
      x += (rx - descansoX) * GANHO_COMER_X;
      z += (rz - 0.09) * GANHO_COMER_Z * leva;
    } else {
      // o passo e o pulo vêm do corpo, bem menores: só um sobe e desce, nada de lado
      x += (rx - descansoX) * GANHO_PASSO;
      z += Math.max(0, rz - 0.09) * GANHO_PULO;
      if (agindo) x += EMPURRAO_COLOCAR * Math.sin(Math.PI * Math.min(1, alcance));
    }
    // a mola: sobe um tico no ar, afunda e volta ao pousar
    const alvoMola = jog.noChao || jog.voando ? 0 : -0.05;
    molaVel += ((alvoMola - mola) * 70 - molaVel * 11) * dt;
    mola += molaVel * dt;
    x += mola;
    // entrando e saindo: o braço gira no ombro para baixo (a mão some pela beira de baixo)
    x += (FORA_X - x) * (1 - peso);
    osso.position.copyFrom(ombro);
    osso.scaling.setAll(ESCALA_BONECO);
    Quaternion.RotationYawPitchRollToRef(0, x, z, osso.rotationQuaternion!);
    // a mão e o item de pé (como na terceira pessoa, o bloco à frente da mão)
    if (juntaMao) juntaMao.rotationQuaternion = Quaternion.Inverse(osso.rotationQuaternion!);
    vista!.noDaMao().scaling.setAll(1);
    const ver = peso > 0.02;
    for (const m of malhasBraco) m.setEnabled(ver);
    // a comida mordida do boneco de verdade vai até a boca, logo abaixo dos olhos: de dentro, ela
    // tapava a beira de baixo, e as migalhas passavam grandes na frente dos olhos. Somem de perto
    // da câmera (a maçã da mão da frente fica)
    if (comendo)
      for (const n of [...scene.transformNodes, ...scene.meshes])
        if (
          (n.name.startsWith('refeicao') || n.name.startsWith('migalha-')) &&
          n.isEnabled() &&
          Vector3.Distance(n.getAbsolutePosition(), visao.position) < 1.2
        )
          n.setEnabled(false);
    maoNaTela = projetar(ombro.add(direcao(x, z).scale(BRACO)));
    ombroNaTela = projetar(ombro);
    if (ver) {
      // a conferência: o ombro, com a grossura da manga, fora da tela
      const r = scene.getEngine().getRenderingCanvas()!.getBoundingClientRect();
      const tanV = Math.tan(visao.fov / 2);
      const rp = (MEIA_MANGA / (ombro.z * tanV)) * (r.height / 2);
      const [sx, sy] = ombroNaTela;
      const folga = Math.max(-sx, sx - r.width, -sy, sy - r.height) - rp;
      vigia.quadros++;
      vigia.menorFolgaPx = Math.min(vigia.menorFolgaPx, folga);
    }
    atualizarMira(temItem && mao.bloco !== null && e > 0.9);
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

  // ---------------------------------------------------------------- o olhinho
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

  const api: EsbocoPrimeiraPessoa = {
    primeira(sim) {
      ligado = sim;
      olho.classList.toggle('ligado', sim);
    },
    ligada: () => ligado,
    fracao: () => t,
    mira: () => celulaMira,
    maos: () => ({ direita: peso, esquerda: 0 }),
    custo: () => {
      const malhas = [...malhasBraco, sombra].filter((m) => m.isEnabled());
      if (contorno?.isEnabled()) malhas.push(contorno, miolo);
      const extra = vista ? vista.contarMalhasMao() : 0;
      let tri = 0;
      for (const m of malhas) tri += (m.getTotalIndices?.() ?? 0) / 3;
      return { malhas: malhas.length + extra, triangulos: Math.round(tri) };
    },
    tela: () => ({
      mao: maoNaTela,
      ombro: ombroNaTela,
      ombroCamera: [ombro.x, ombro.y, ombro.z].map((n) => +n.toFixed(3)),
      maoPx,
    }),
    ponta: () => ({ quadros: vigia.quadros, menorFolgaPx: Math.round(vigia.menorFolgaPx) }),
    zerarPonta() {
      vigia.quadros = 0;
      vigia.menorFolgaPx = Infinity;
    },
  };
  window.__primeiraPessoa = api;
}
