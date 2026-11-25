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
 *   o aceno e o comer são os do boneco de verdade, em escala; um golpe do braço a cada golpe do
 *   jogo e um empurrão a cada colocação (os mesmos eventos que tocam o som);
 * - o item na mão como a criança seguraria olhando para a frente (o bloco de pé, em cima da mão;
 *   a ferramenta de cabo para cima e para a frente, batendo para a frente);
 * - a visão (dono, 25 nov): de dentro, o campo nunca menor que 50° na horizontal, e o olhar vai
 *   para a frente ao entrar (`conta-visao.mjs`);
 * - a mira segue o dedo, como na terceira pessoa (dono, 25 nov): o toque age embaixo do dedo e o
 *   contorno aparece ali enquanto segura e um instante depois; no computador, o clique age onde
 *   está o ponteiro, sem travar o mouse, e o contorno fica embaixo dele;
 * - a mão vazia só entra para agir (a variante A); a câmera solta; a entrada e a saída pela
 *   cabeça com o olhinho.
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
import { curvaGolpe, PERIODO_MINERAR } from '../personagem/poses';
import { obterItem, todosItens } from '../jogo/itens';

interface EsbocoPrimeiraPessoa {
  /** Liga (true) ou desliga a primeira pessoa, com a transição. */
  primeira(sim: boolean): void;
  ligada(): boolean;
  /** 0 em terceira pessoa, 1 dentro da cabeça (a transição no meio). */
  fracao(): number;
  /** Peso da mão na tela (0 fora, 1 inteira). */
  maos(): { direita: number; esquerda: number };
  /** A célula do contorno agora (embaixo do dedo ou do ponteiro; null sem contorno). */
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
  /** O ritmo desde o último zerar: os golpes e colocações do jogo e os movimentos do braço. */
  ritmo(): { golpes: number; balancos: number; colocacoes: number; empurroes: number };
  zerarRitmo(): void;
  /** Os itens que a mão pode segurar (para a folha de itens). */
  itens(): { id: string; tipo: string }[];
  /** Só para o estudo da escala: a altura dos olhos (blocos) e o campo vertical (graus); null volta à regra. */
  ajustarCamera(altura: number | null, fovV: number | null): void;
}

declare global {
  interface Window {
    __primeiraPessoa?: EsbocoPrimeiraPessoa;
  }
}

// ------------------------------------------------------------------ números do esboço
/** A entrada e a saída pela cabeça (s). */
const DURACAO_TRANSICAO = 0.7;
/**
 * Os olhos de verdade do boneco, em relação aos pés (blocos, com a escala 1,15): o ponto entre os
 * olhos, logo atrás do rosto (o plano do boneco: os olhos a 1,207 de altura; a cara a 0,37 à
 * frente do centro do corpo). A câmera sai da posição do corpo no quadro, sem o balanço da cabeça.
 */
const OLHOS_ALTURA = 1.21;
const OLHOS_FRENTE = 0.345;
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
/**
 * O golpe: a mesma curva do golpe da terceira pessoa (`curvaGolpe`: sobe devagar, desce rápido e
 * volta), em escala, uma vez a cada golpe do jogo (o mesmo evento que toca o som).
 */
const GANHO_GOLPE = 0.22;
const DURACAO_GOLPE = PERIODO_MINERAR;
/** O empurrão de colocar: uma vez a cada colocação do jogo (s). */
const DURACAO_EMPURRAO = 0.3;
/** O campo de visão em que o braço foi medido (a conta do ombro e a aparência dele). */
const FOV_BRACO = (70 * Math.PI) / 180;
/**
 * O campo de visão de dentro: o vertical de hoje (70°), mas nunca menos que 50° na horizontal (no
 * celular em pé, 70° na vertical dava só 36° na horizontal: a tela parecia um zoom). A conta e a
 * medida estão em `.sdd/specs/037-construir-melhor/referencia/conta-visao.mjs`.
 */
const FOV_H_MINIMO = (50 * Math.PI) / 180;
const fovDeDentro = (aspecto: number, fovJogo: number) =>
  Math.max(fovJogo, 2 * Math.atan(Math.tan(FOV_H_MINIMO / 2) / aspecto));
/** Ao entrar, o olhar vai para a frente: o horizonte no terço de cima da tela. */
const pitchDeEntrada = (fovV: number) => Math.atan(Math.tan(fovV / 2) / 3);
/** Depois do toque, o contorno fica na célula por um instante (s). */
const CONTORNO_DEPOIS_DO_TOQUE = 0.6;
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
    // o golpe: o preparo (a mão sobe) e a batida (a mão desce)
    [SEGURAR[0] - 1.1 * GANHO_GOLPE, SEGURAR[1]],
    [SEGURAR[0] + 1.5 * GANHO_GOLPE, SEGURAR[1]],
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
    const chave = `${Math.round(r.width)}x${Math.round(r.height)}`;
    if (chave === chaveTela) return;
    chaveTela = chave;
    // (o braço é medido sempre no campo de 70°: com o campo de dentro mais aberto, o suporte
    // compensa e ele aparece do mesmo tamanho)
    const achado = acharOmbro(r.width, r.height, FOV_BRACO, altoDosBotoes(r.width, r.height));
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
  /** O golpe e o empurrão de colocar em curso (0 a 1; -1 parado), um por evento do jogo. */
  let golpeT = -1;
  let empurraoT = -1;
  let golpesVistos = g.golpes();
  let colocacoesVistas = g.colocacoes();
  /** Para conferir o ritmo: quantos eventos e quantos movimentos do braço desde o último zerar. */
  const ritmo = { golpes: 0, balancos: 0, colocacoes: 0, empurroes: 0 };
  /** A inclinação ao entrar (o olhar vai para a frente durante a entrada). */
  let entrada: { de: number; para: number } | null = null;
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
  // ---------------------------------------------------------------- o dedo (e o ponteiro)
  // a primeira pessoa age onde a criança toca, como a terceira pessoa (o toque, o segurar e o
  // arrastar são os de sempre, de `src/ui/toque.ts`): o esboço só acompanha o dedo para mostrar
  // o contorno embaixo dele enquanto segura e por um instante depois do toque; no computador, o
  // contorno fica embaixo do ponteiro
  const dedo = { ativo: false, mouse: false, x: 0, y: 0, x0: 0, y0: 0, t0: 0, ate: 0, arrastou: false };
  const canvas = scene.getEngine().getRenderingCanvas()!;
  const naTelaDoJogo = (ev: PointerEvent) => {
    const alvo = ev.target as HTMLElement | null;
    return !!alvo && (alvo === canvas || alvo.classList?.contains('olhar'));
  };
  const noCanvas = (ev: PointerEvent): [number, number] => {
    const r = canvas.getBoundingClientRect();
    return [ev.clientX - r.left, ev.clientY - r.top];
  };
  window.addEventListener(
    'pointerdown',
    (ev) => {
      if (!naTelaDoJogo(ev)) return;
      [dedo.x, dedo.y] = noCanvas(ev);
      dedo.x0 = dedo.x;
      dedo.y0 = dedo.y;
      dedo.t0 = performance.now() / 1000;
      dedo.ativo = true;
      dedo.arrastou = false;
      dedo.mouse = ev.pointerType === 'mouse';
    },
    { capture: true, passive: true },
  );
  window.addEventListener(
    'pointermove',
    (ev) => {
      if (ev.pointerType === 'mouse' && !dedo.ativo) {
        // o ponteiro passeando: o contorno vai embaixo dele
        if (!naTelaDoJogo(ev)) return;
        dedo.mouse = true;
        [dedo.x, dedo.y] = noCanvas(ev);
        return;
      }
      if (!dedo.ativo) return;
      [dedo.x, dedo.y] = noCanvas(ev);
      if (Math.hypot(dedo.x - dedo.x0, dedo.y - dedo.y0) > 12) dedo.arrastou = true;
    },
    { capture: true, passive: true },
  );
  const soltarDedo = () => {
    if (!dedo.ativo) return;
    dedo.ativo = false;
    dedo.ate = dedo.arrastou ? 0 : performance.now() / 1000 + CONTORNO_DEPOIS_DO_TOQUE;
    // (o ponteiro do computador volta a passear: o contorno volta para baixo dele)
    if (dedo.mouse) dedo.arrastou = false;
  };
  window.addEventListener('pointerup', soltarDedo, { capture: true, passive: true });
  window.addEventListener('pointercancel', soltarDedo, { capture: true, passive: true });
  /** Onde o contorno vai agora (px no canvas), ou null; e se é para quebrar (segurando). */
  const pontoDoContorno = (): { x: number; y: number; quebrar: boolean } | null => {
    const agora = performance.now() / 1000;
    const segurando = dedo.ativo && !dedo.arrastou;
    if (dedo.mouse) return dedo.arrastou ? null : { x: dedo.x, y: dedo.y, quebrar: segurando && agora - dedo.t0 > 0.35 };
    if (segurando) return { x: dedo.x, y: dedo.y, quebrar: agora - dedo.t0 > 0.35 };
    if (agora < dedo.ate) return { x: dedo.x, y: dedo.y, quebrar: false };
    return null;
  };
  function atualizarMira(ligada: boolean, colocaBloco: boolean): void {
    const e = window.__brumaluz;
    let cel: [number, number, number] | null = null;
    const ponto = ligada ? pontoDoContorno() : null;
    if (ponto && e?.preverToque) {
      const prev = e.preverToque(ponto.x, ponto.y);
      const a = prev.alvo;
      // com bloco na mão e sem segurar, a célula onde ele entra; senão, o bloco que vai quebrar
      if (a) cel = colocaBloco && !ponto.quebrar ? [a.x + a.normal.x, a.y + a.normal.y, a.z + a.normal.z] : [a.x, a.y, a.z];
      // a célula onde a própria criança está não recebe bloco: o contorno não aparece ali
      const j = g.jogador();
      if (
        cel &&
        colocaBloco &&
        !ponto.quebrar &&
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
  const mostrarCorpo = (cabeca: boolean, bracos: boolean, tesouro = false) => {
    junta('cabeca')?.setEnabled(cabeca);
    junta('bracoD')?.setEnabled(bracos);
    // o tesouro da mão (a varinha, o guarda-chuva, a pipa) fica na mão esquerda de verdade, no
    // alto, como na terceira pessoa: aparece de dentro onde os olhos o alcançam
    junta('bracoE')?.setEnabled(bracos || tesouro);
  };
  /** Onde um ponto do braço cai na tela (px): o braço é desenhado como no campo de 70°. */
  const projetar = (p: Vector3): [number, number] => {
    const tanV = Math.tan(FOV_BRACO / 2);
    const r = scene.getEngine().getRenderingCanvas()!.getBoundingClientRect();
    const tanH = tanV * (r.width / r.height);
    return [
      Math.round((r.width / 2) * (1 + p.x / (p.z * tanH))),
      Math.round((r.height / 2) * (1 - p.y / (p.z * tanV))),
    ];
  };

  const matrizDesejada = new Matrix();
  const matrizOsso = new Matrix();
  /**
   * O jeito de segurar de dentro, por tipo de item: o giro da mão no espaço da câmera (guinada,
   * inclinação, rolagem) e onde o item fica em relação à mão (o nó de pegar, no espaço da mão).
   */
  const posturaDoItem = (
    mao: ReturnType<GanchoPrimeiraPessoa['naMao']>,
    batida: number,
  ): { giro: [number, number, number]; pega: [number, number, number]; torce: number } => {
    const def = mao.item ? obterItem(mao.item) : undefined;
    if (def?.ferramenta)
      // o cabo (que sai da mão para a frente) sobe para a frente e um tico para o meio; a cabeça
      // gira no cabo (torce) para a ponta da picareta, a lâmina e a pá apontarem para a frente,
      // no plano do golpe: no golpe, a ferramenta bate para a frente e para baixo
      return { giro: [-0.45, -0.8 + batida * 1.4, 0], pega: [0, 0, 0], torce: Math.PI / 2 };
    if (mao.bloco !== null)
      // de pé, um tico virado (aparecem duas faces) e em cima da mão
      return { giro: [0.45, 0.12, 0], pega: [0, 0.16, -0.08], torce: 0 };
    // comida, semente, sacola, brinquedo: de pé, acima e um tico à frente da mão (os pequenos
    // não somem atrás dela)
    return { giro: [0.3, 0.08, 0], pega: [0, 0.15, -0.08], torce: 0 };
  };
  /** O corpo está com partes escondidas (volta inteiro ao sair). */
  let cheio = false;
  /**
   * A câmera de dentro, antes da mira do dedo (o jogo mira e quebra com a câmera que a criança
   * vê): a entrada pela cabeça, o campo de visão, o olhar para a frente ao entrar, os olhos (da
   * posição do corpo neste quadro, sem esperar o boneco) e o pouso.
   */
  /** Só para o estudo da escala: a altura dos olhos e o campo vertical (rad) da grade. */
  const ajusteCamera: { altura?: number; fovV?: number } = {};
  g.antesDaMira = (dt) => {
    const alvoT = ligado ? 1 : 0;
    t = alvoT > t ? Math.min(1, t + dt / DURACAO_TRANSICAO) : Math.max(0, t - dt / DURACAO_TRANSICAO);
    const e = suave(t);
    if (e <= 0) return;
    const jog = g.jogador();
    const pitch = olhos.rotation.x;
    const yaw = olhos.rotation.y;
    // ---------------- o campo de visão de dentro (mais aberto no celular em pé), entrando junto
    const tela = canvas.getBoundingClientRect();
    const fovJogo = visao.fov;
    const fovDentro = ajusteCamera.fovV ?? fovDeDentro(tela.width / tela.height, fovJogo);
    visao.fov = fovJogo + (fovDentro - fovJogo) * e;
    // o braço aparece como no campo de 70°, qualquer que seja o campo de dentro
    const s = Math.tan(visao.fov / 2) / Math.tan(FOV_BRACO / 2);
    suporte.scaling.set(s, s, 1);
    // ao entrar, o olhar vai para a frente (o horizonte no terço de cima), junto com a entrada
    if (ligado && entrada === null) entrada = { de: pitch, para: pitchDeEntrada(fovDentro) };
    if (entrada && ligado && t < 1) window.__brumaluz?.apontar?.(yaw, entrada.de + (entrada.para - entrada.de) * e);
    // ---------------- o corpo vira junto com o olhar
    const yawCorpo = window.__brumaluz?.yawBoneco?.() ?? yaw;
    g.travarYaw(e >= 1 ? yaw : yawCorpo + ((((yaw - yawCorpo + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI) - Math.PI) * e);
    // ---------------- o pouso: a câmera abaixa um tico e volta macia; o braço afunda junto
    if (jog.noChao) {
      if (noArDesde >= 0) {
        const noAr = performance.now() / 1000 - noArDesde;
        if (noAr > 0.25 && !jog.voando) {
          pousoVel -= Math.min(POUSO_MAXIMO * 9, noAr * POUSO_POR_SEGUNDO * 9);
          molaVel += Math.min(1.6, noAr * 2.2);
        }
      }
      noArDesde = -1;
    } else if (noArDesde < 0) noArDesde = performance.now() / 1000;
    pousoVel += (-pouso * 90 - pousoVel * 12) * dt;
    pouso = Math.max(-POUSO_MAXIMO, Math.min(0.02, pouso + pousoVel * dt));
    // ---------------- os olhos de verdade (a câmera entra pela cabeça, sem corte seco)
    const destino = new Vector3(
      jog.x + Math.sin(yaw) * OLHOS_FRENTE,
      jog.y + (ajusteCamera.altura ?? OLHOS_ALTURA) + pouso,
      jog.z + Math.cos(yaw) * OLHOS_FRENTE,
    );
    visao.position.copyFrom(Vector3.Lerp(visao.position, destino, e));
    // olhando bem para baixo, o olhar passa um tico da vertical: o peito e os sapatos aparecem
    // (o alto da tela continua sendo a frente: nada vira de ponta-cabeça)
    const curva = suave((pitch - 1.0) / 0.45);
    visao.rotation.x = pitch + PITCH_CURVADO * curva * e;
    visao.updateUpVectorFromRotation = curva > 0;
    if (curva <= 0) visao.upVector.set(0, 1, 0);
  };
  g.quadro = (dt) => {
    const e = suave(t);
    const jog = g.jogador();
    const v = g.vista();
    const pitch = olhos.rotation.x;
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
      entrada = null;
      atualizarMira(false, false);
      document.body.classList.remove('esb-pp-dentro');
      return;
    }
    if (!vista || ap !== aparenciaDaVista) montarVista(ap);
    conferirTela();
    g.personagem.definirOpacidade(1);
    // a cabeça some quando a câmera passa por ela; os braços do corpo só aparecem olhando para
    // baixo, quando a mão da frente já saiu (nunca dois braços)
    const verBracos = suave((pitch - PITCH_SEM_MAO) / 0.25) > 0.5 || t < 0.55;
    mostrarCorpo(t <= 0.55, verBracos, !!ap.premium?.mao && !ap.montado);
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
    // um golpe do braço a cada golpe do jogo (o evento que toca o som), e um empurrão a cada
    // colocação: nada de tempo próprio
    const golpesAgora = g.golpes();
    if (golpesAgora !== golpesVistos) {
      ritmo.golpes += golpesAgora - golpesVistos;
      golpesVistos = golpesAgora;
      golpeT = 0;
      ritmo.balancos++;
    }
    const colocacoesAgora = g.colocacoes();
    if (colocacoesAgora !== colocacoesVistas) {
      ritmo.colocacoes += colocacoesAgora - colocacoesVistas;
      colocacoesVistas = colocacoesAgora;
      empurraoT = 0;
      ritmo.empurroes++;
    }
    if (golpeT >= 0) golpeT += dt / DURACAO_GOLPE;
    if (golpeT >= 1) golpeT = -1;
    if (empurraoT >= 0) empurraoT += dt / DURACAO_EMPURRAO;
    if (empurraoT >= 1) empurraoT = -1;
    const agindo = golpeT >= 0 || empurraoT >= 0;
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
    }
    // o golpe: a curva do golpe da terceira pessoa (a mão sobe e desce batendo)
    const batida = golpeT >= 0 ? curvaGolpe(golpeT) * GANHO_GOLPE : 0;
    x += batida;
    if (empurraoT >= 0) x += EMPURRAO_COLOCAR * Math.sin(Math.PI * empurraoT);
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
    // a mão e o item como a criança seguraria olhando para a frente (a partir do jeito de segurar
    // da terceira pessoa, `definirNaMao`): o bloco de pé e de frente, em cima da mão; a ferramenta
    // com o cabo na mão e a cabeça para cima e para a frente, batendo para a frente e para baixo
    const postura = posturaDoItem(mao, batida);
    if (juntaMao) {
      Quaternion.RotationYawPitchRoll(postura.giro[0], postura.giro[1], postura.giro[2]).toRotationMatrix(matrizDesejada);
      osso.rotationQuaternion!.toRotationMatrix(matrizOsso);
      // a mão é filha do braço: local = desejada × inversa do braço (a inversa de um giro é a transposta)
      juntaMao.rotationQuaternion = Quaternion.FromRotationMatrix(matrizDesejada.multiply(matrizOsso.transpose()));
    }
    const pega = vista!.noDaMao();
    pega.scaling.setAll(1);
    pega.position.set(postura.pega[0], postura.pega[1], postura.pega[2]);
    pega.rotation.set(0, 0, postura.torce);
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
      const tanV = Math.tan(FOV_BRACO / 2);
      const rp = (MEIA_MANGA / (ombro.z * tanV)) * (r.height / 2);
      const [sx, sy] = ombroNaTela;
      const folga = Math.max(-sx, sx - r.width, -sy, sy - r.height) - rp;
      vigia.quadros++;
      vigia.menorFolgaPx = Math.min(vigia.menorFolgaPx, folga);
    }
    atualizarMira(e > 0.9, mao.bloco !== null);
    document.body.classList.toggle('esb-pp-dentro', e > 0.5);
  };

  // ---------------------------------------------------------------- o computador
  // de dentro, o clique age onde está o ponteiro (como o dedo): sem travar o mouse, a câmera
  // gira arrastando; clicar põe (ou usa), segurar parado quebra embaixo do ponteiro
  const direto = () => window.__brumaluz?.controleDireto;
  const mouse = { botao: -1, x: 0, y: 0, x0: 0, y0: 0, t0: 0, arrastando: false, quebrando: false, timer: 0 };
  const dentro = () => ligado && t > 0.5;
  // (o clique no canvas pedia o mouse travado: de dentro, não)
  canvas.addEventListener(
    'click',
    (ev) => {
      if (dentro()) ev.stopImmediatePropagation();
    },
    true,
  );
  // (eventos de ponteiro: o motor cancela o pointerdown, e aí o mousedown nem chega)
  canvas.addEventListener('pointerdown', (ev) => {
    if (ev.pointerType !== 'mouse' || !dentro() || document.pointerLockElement === canvas) return;
    const [x, y] = [ev.offsetX, ev.offsetY];
    if (ev.button === 2) {
      direto()?.mirar(x, y);
      direto()?.usar();
      setTimeout(() => direto()?.soltarMira(), 50);
      return;
    }
    if (ev.button !== 0) return;
    Object.assign(mouse, { botao: 0, x, y, x0: x, y0: y, t0: performance.now(), arrastando: false, quebrando: false });
    clearTimeout(mouse.timer);
    mouse.timer = window.setTimeout(() => {
      if (mouse.botao !== 0 || mouse.arrastando) return;
      // segurou parado: quebra embaixo do ponteiro até soltar
      mouse.quebrando = true;
      direto()?.mirar(mouse.x, mouse.y);
      direto()?.quebrar(true);
    }, 350);
  });
  window.addEventListener('pointermove', (ev) => {
    if (ev.pointerType !== 'mouse' || mouse.botao !== 0 || !dentro()) return;
    const r = canvas.getBoundingClientRect();
    const [x, y] = [ev.clientX - r.left, ev.clientY - r.top];
    const [dx, dy] = [x - mouse.x, y - mouse.y];
    mouse.x = x;
    mouse.y = y;
    if (mouse.quebrando) {
      direto()?.mirar(x, y);
      return;
    }
    if (!mouse.arrastando && Math.hypot(x - mouse.x0, y - mouse.y0) > 6) {
      mouse.arrastando = true;
      clearTimeout(mouse.timer);
      direto()?.arrastar(true);
    }
    if (mouse.arrastando) direto()?.olhar(dx * 2.2, dy * 2.2);
  });
  window.addEventListener('pointerup', (ev) => {
    if (ev.pointerType !== 'mouse' || ev.button !== 0 || mouse.botao !== 0) return;
    mouse.botao = -1;
    clearTimeout(mouse.timer);
    const c = direto();
    if (!c) return;
    if (mouse.quebrando) {
      c.quebrar(false);
      c.soltarMira();
    } else if (mouse.arrastando) c.arrastar(false);
    else {
      // um clique: o mesmo toque do dedo, no ponto do ponteiro
      c.mirar(mouse.x, mouse.y);
      c.tocar?.();
      setTimeout(() => c.soltarMira(), 50);
    }
  });

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
    /* de dentro, a mira do meio da tela sai: o toque e o clique agem onde o dedo e o ponteiro estão */
    body.esb-pp-dentro .hud .mira { display: none; }
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
    ritmo: () => ({ ...ritmo }),
    zerarRitmo() {
      ritmo.golpes = ritmo.balancos = ritmo.colocacoes = ritmo.empurroes = 0;
    },
    itens: () => todosItens().map((i) => ({ id: i.id, tipo: i.tipo })),
    ajustarCamera(altura, fovV) {
      if (altura === null) delete ajusteCamera.altura;
      else ajusteCamera.altura = altura;
      if (fovV === null) delete ajusteCamera.fovV;
      else ajusteCamera.fovV = (fovV * Math.PI) / 180;
    },
  };
  window.__primeiraPessoa = api;
}
