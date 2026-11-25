/**
 * Spec 037 (T03): a câmera da primeira pessoa, a mira dela e a escolha guardada no aparelho.
 * Veio do esboço aprovado pelo dono no celular (25 nov, `?esboco=primeira-pessoa`), com as medidas
 * da spec e do estudo da visão (`referencia/estudo-visao-primeira-pessoa.md`):
 * - os olhos a 1,62 dos pés (os do controle, de onde o alcance é medido), com a cabeça escondida
 *   (o braço esconde), sempre dentro da caixa do corpo: no máximo 0,2 à frente do centro, e menos
 *   quando há bloco à frente (encostada na parede, a câmera nunca entra no bloco);
 * - o campo vertical é o maior entre o da configuração e o que dá 42,4° na horizontal (80° no
 *   celular em pé; deitado e no computador, o da configuração);
 * - ao entrar, o olhar vai para a frente (o horizonte no terço de cima); sem balanço de cabeça;
 * - a entrada e a saída pela cabeça em 0,7 s;
 * - a mira: no celular, o contorno fino embaixo do dedo (a mesma conta do toque, `preverToque`);
 *   no computador (o mouse travado) e no controle, a mira do meio, com o pontinho e o contorno;
 * - nos lugares com câmera própria (o modo foto, a Casa anos 80, sentada no parque, montada,
 *   dormindo e desmaiada) ela sai sozinha e volta depois.
 *
 * Quem chama: a cena, a cada quadro, `antesDaMira(dt)` logo depois de a câmera de terceira pessoa
 * andar (o dedo mira da câmera que a criança vê) e `quadro(dt)` depois do boneco (o braço).
 */
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import type { UniversalCamera } from '@babylonjs/core/Cameras/universalCamera';
import type { Scene } from '@babylonjs/core/scene';
import type { BracoPrimeiraPessoa, EntradaBraco } from './bracoPrimeiraPessoa';
import type { Armazenamento } from '../personagem/persistencia';
import { ALTURA_OLHOS } from '../player/fisica';

/** A entrada e a saída pela cabeça (s). */
export const DURACAO_TRANSICAO = 0.7;
/** No máximo, quanto os olhos ficam à frente do centro do corpo (blocos). */
export const OLHOS_FRENTE = 0.2;
/**
 * A folga da câmera até um bloco (blocos): o plano de perto (0,1) com a beira dele deitado
 * (113° na horizontal) chega a ~0,19 do olho. Na vertical, o corpo de 1,8 deixa 0,18 até o teto.
 */
const FOLGA_LADO = 0.2;
const FOLGA_CIMA = 0.12;
/** Olhando bem para baixo, o olhar passa um tico da vertical: aparecem o peito e os sapatos. */
const PITCH_CURVADO = 0.35;
/** Pouso: quanto a câmera abaixa (blocos) por segundo de queda, no máximo POUSO_MAXIMO. */
const POUSO_POR_SEGUNDO = 0.14;
const POUSO_MAXIMO = 0.09;
/** O campo horizontal mínimo de dentro (rad): 80° na vertical no celular em pé. */
const FOV_H_MINIMO = (42.4 * Math.PI) / 180;
/** Depois do toque, o contorno fica na célula por um instante (s). */
const CONTORNO_DEPOIS_DO_TOQUE = 0.6;
/** Segurando parado por mais que isto, o dedo quebra (o contorno passa para o bloco). */
const SEGURAR_QUEBRA = 0.35;
/** A escolha guardada no aparelho. */
export const CHAVE_PRIMEIRA_PESSOA = 'terrario:primeiraPessoa';

/** O campo vertical de dentro: o da configuração, mas nunca menos de 42,4° na horizontal. */
export const fovDeDentro = (aspecto: number, fovJogo: number): number =>
  Math.max(fovJogo, 2 * Math.atan(Math.tan(FOV_H_MINIMO / 2) / aspecto));
/** Ao entrar, o olhar vai para a frente: o horizonte no terço de cima da tela. */
export const pitchDeEntrada = (fovV: number): number => Math.atan(Math.tan(fovV / 2) / 3);

/** Onde a criança está que tem câmera própria (a primeira pessoa sai), ou null. */
export type LugarCameraPropria = 'foto' | 'casa' | 'parque' | 'montada' | 'dormindo' | 'desmaiada';

export interface SituacaoCamera {
  modoFoto: boolean;
  /** Dentro da Casa anos 80, no sofá ou no trilho da rampa. */
  casa: boolean;
  /** Sentada num brinquedo do parque. */
  sentadaNoParque: boolean;
  /** Montada num brinquedo de andar ou de skate. */
  montada: boolean;
  dormindo: boolean;
  desmaiada: boolean;
}

/** O lugar com câmera própria de agora (o modo foto primeiro: ele tira a câmera na hora). */
export function lugarComCameraPropria(s: SituacaoCamera): LugarCameraPropria | null {
  if (s.modoFoto) return 'foto';
  if (s.desmaiada) return 'desmaiada';
  if (s.dormindo) return 'dormindo';
  if (s.casa) return 'casa';
  if (s.sentadaNoParque) return 'parque';
  if (s.montada) return 'montada';
  return null;
}

/**
 * Quanto os olhos podem ir à frente do centro (de OLHOS_FRENTE a 0) sem a câmera chegar perto
 * de um bloco sólido. `solido` diz se a célula é sólida.
 */
export function frenteLivre(
  x: number,
  y: number,
  z: number,
  yaw: number,
  solido: (x: number, y: number, z: number) => boolean,
): number {
  const sx = Math.sin(yaw);
  const sz = Math.cos(yaw);
  for (let k = 4; k >= 0; k--) {
    const f = (OLHOS_FRENTE * k) / 4;
    if (!caixaBate(x + sx * f, y, z + sz * f, solido)) return f;
  }
  return 0;
}

function caixaBate(
  x: number,
  y: number,
  z: number,
  solido: (x: number, y: number, z: number) => boolean,
): boolean {
  for (let cx = Math.floor(x - FOLGA_LADO); cx <= Math.floor(x + FOLGA_LADO); cx++)
    for (let cy = Math.floor(y - FOLGA_CIMA); cy <= Math.floor(y + FOLGA_CIMA); cy++)
      for (let cz = Math.floor(z - FOLGA_LADO); cz <= Math.floor(z + FOLGA_LADO); cz++)
        if (solido(cx, cy, cz)) return true;
  return false;
}

/** A escolha guardada (false sem armazenamento ou sem escolha). */
export function carregarEscolha(a: Armazenamento | null): boolean {
  try {
    return a?.getItem(CHAVE_PRIMEIRA_PESSOA) === '1';
  } catch {
    return false;
  }
}
export function guardarEscolha(a: Armazenamento | null, sim: boolean): void {
  try {
    a?.setItem(CHAVE_PRIMEIRA_PESSOA, sim ? '1' : '0');
  } catch {
    // sem armazenamento (aba privada): vale só nesta página
  }
}

const suave = (t: number) => {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
};

/** O alvo do toque num ponto da tela (a conta de `preverToque`), ou o do meio (null). */
export type AlvoMira = { x: number; y: number; z: number; normal: { x: number; y: number; z: number } } | null;

export interface OpcoesPrimeiraPessoa {
  scene: Scene;
  /** Os olhos (a câmera do controle) e a câmera que desenha a tela. */
  olhos: UniversalCamera;
  visao: UniversalCamera;
  canvas: HTMLCanvasElement;
  armazenamento: Armazenamento | null;
  jogador: () => { x: number; y: number; z: number; noChao: boolean; voando?: boolean };
  solido: (x: number, y: number, z: number) => boolean;
  /** O braço, a mão e o item (criado só na primeira entrada). */
  braco: () => BracoPrimeiraPessoa;
  /** O que o braço precisa a cada quadro, além da fração, do olhar e do jogador. */
  entradaBraco: () => Pick<EntradaBraco, 'vista' | 'gesto' | 'naMao' | 'aparencia'>;
  /** Vira o olhar (o controle). */
  apontar: (yaw: number, pitch: number) => void;
  yawBoneco: () => number;
  /** O corpo travado num rumo (null solta). */
  travarYaw: (y: number | null) => void;
  /** Onde a criança está agora. */
  situacao: () => SituacaoCamera;
  /**
   * O alvo do toque no ponto (px no canvas), ou o da mira do meio sem ponto, e o fantasma da obra
   * que ele encheria (o ímã do dedo).
   */
  alvo: (ponto: { x: number; y: number } | null) => {
    alvo: AlvoMira;
    fantasma: { x: number; y: number; z: number } | null;
  };
  /** O computador está quebrando (o botão segurado). */
  quebrando: () => boolean;
  /** Não entra no brilho da tela (o halo borrava o contorno). */
  semBrilho: (m: Mesh) => void;
}

export interface PrimeiraPessoa {
  /** Liga (true) ou desliga a primeira pessoa (a escolha, guardada no aparelho). */
  ligar(sim: boolean): void;
  /** A escolha da criança (mesmo num lugar com câmera própria). */
  ligada(): boolean;
  /** A primeira pessoa está valendo agora (a escolha, fora dos lugares com câmera própria). */
  valendo(): boolean;
  /** 0 em terceira pessoa, 1 dentro da cabeça (a transição no meio). */
  fracao(): number;
  /** O lugar com câmera própria de agora (a primeira pessoa saiu), ou null. */
  propria(): LugarCameraPropria | null;
  /** A célula do contorno agora (null sem contorno). */
  mira(): [number, number, number] | null;
  /** Os olhos de dentro para um rumo (de onde sai a mira do meio). */
  olhosPara(yaw: number): { x: number; y: number; z: number };
  /** A cada quadro, antes da mira do dedo. */
  antesDaMira(dt: number): void;
  /** A cada quadro, depois do boneco. */
  quadro(dt: number): void;
  /** Malhas e triângulos do contorno aceso. */
  custoMira(): { malhas: number; triangulos: number };
}

/**
 * O que a interface (o olhinho da roda) e os testes veem da primeira pessoa
 * (`window.__brumaluz.primeiraPessoa`).
 */
export interface ApiPrimeiraPessoa
  extends Pick<PrimeiraPessoa, 'ligar' | 'ligada' | 'valendo' | 'fracao' | 'propria' | 'mira'> {
  /** A câmera que desenha em relação aos pés (blocos), o olhar e o campo vertical (graus). */
  camera(): { frente: number; cima: number; lado: number; pitch: number; fovV: number; dentroDeBloco: boolean };
  /** Peso da mão na tela (0 fora, 1 inteira). */
  maos(): { direita: number; esquerda: number };
  tela: BracoPrimeiraPessoa['tela'];
  ponta: BracoPrimeiraPessoa['ponta'];
  zerarPonta(): void;
  ritmo: BracoPrimeiraPessoa['ritmo'];
  zerarRitmo(): void;
  /** Malhas e triângulos do braço, da sombra e do contorno. */
  custo(): { malhas: number; triangulos: number };
  /** Os itens que a mão pode segurar (para a folha de itens). */
  itens(): { id: string; tipo: string }[];
}

export function criarPrimeiraPessoa(op: OpcoesPrimeiraPessoa): PrimeiraPessoa {
  const { scene, visao, olhos, canvas } = op;
  let escolha = carregarEscolha(op.armazenamento);
  let lugar: LugarCameraPropria | null = null;
  let t = 0;
  /** A fração do quadro anterior (o braço só roda dentro e no quadro de sair). */
  let tAnterior = 0;
  let frente = OLHOS_FRENTE;
  let noArDesde = -1;
  let pouso = 0;
  let pousoVel = 0;
  /** A inclinação ao entrar (o olhar vai para a frente durante a entrada). */
  let entrada: { de: number; para: number } | null = null;
  const valendo = () => escolha && lugar === null;

  // ---------------------------------------------------------------- o contorno da mira
  // onde o bloco vai entrar: gomos finos e claros na célula, com o miolo bem de leve. A grossura
  // do gomo acompanha a distância: de perto fica fino e, fora do brilho, não borra.
  const matMira = new StandardMaterial('pp-mira', scene);
  matMira.diffuseColor = Color3.Black();
  matMira.emissiveColor = new Color3(0.96, 0.96, 0.92);
  matMira.specularColor = Color3.Black();
  matMira.disableLighting = true;
  matMira.alpha = 0.85;
  const matMiolo = new StandardMaterial('pp-mira-miolo', scene);
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
          const bar = MeshBuilder.CreateBox('pp-mira-barra', { width: tam[0], height: tam[1], depth: tam[2] }, scene);
          const pos = [a - 0.5, b - 0.5];
          const p3 = eixo === 0 ? [0, pos[0], pos[1]] : eixo === 1 ? [pos[0], 0, pos[1]] : [pos[0], pos[1], 0];
          bar.position.set(p3[0], p3[1], p3[2]);
          barras.push(bar);
        }
    c = Mesh.MergeMeshes(barras, true)!;
    c.name = 'pp-mira';
    c.material = matMira;
    c.isPickable = false;
    c.setEnabled(false);
    op.semBrilho(c);
    contornos.set(nivel, c);
    return c;
  };
  let contorno: Mesh | null = null;
  let miolo: Mesh | null = null;
  const pegarMiolo = (): Mesh => {
    if (miolo) return miolo;
    miolo = MeshBuilder.CreateBox('pp-mira-miolo', { size: 0.98 }, scene);
    miolo.material = matMiolo;
    miolo.isPickable = false;
    miolo.setEnabled(false);
    op.semBrilho(miolo);
    return miolo;
  };
  let celulaMira: [number, number, number] | null = null;

  // ---------------------------------------------------------------- o dedo
  // no celular a primeira pessoa age onde a criança toca, como a terceira pessoa (o toque, o
  // segurar e o arrastar são os de sempre, de `src/ui/toque.ts`): aqui só se acompanha o dedo
  // para mostrar o contorno embaixo dele enquanto segura e por um instante depois do toque
  const dedo = { ativo: false, x: 0, y: 0, x0: 0, y0: 0, t0: 0, ate: 0, arrastou: false };
  const naTelaDoJogo = (ev: PointerEvent) => {
    const alvo = ev.target as HTMLElement | null;
    return !!alvo && (alvo === canvas || !!alvo.classList?.contains('olhar'));
  };
  const noCanvas = (ev: PointerEvent): [number, number] => {
    const r = canvas.getBoundingClientRect();
    return [ev.clientX - r.left, ev.clientY - r.top];
  };
  const agoraS = () => performance.now() / 1000;
  window.addEventListener(
    'pointerdown',
    (ev) => {
      if (ev.pointerType === 'mouse' || !naTelaDoJogo(ev)) return;
      [dedo.x, dedo.y] = noCanvas(ev);
      dedo.x0 = dedo.x;
      dedo.y0 = dedo.y;
      dedo.t0 = agoraS();
      dedo.ativo = true;
      dedo.arrastou = false;
    },
    { capture: true, passive: true },
  );
  window.addEventListener(
    'pointermove',
    (ev) => {
      if (ev.pointerType === 'mouse' || !dedo.ativo) return;
      [dedo.x, dedo.y] = noCanvas(ev);
      if (Math.hypot(dedo.x - dedo.x0, dedo.y - dedo.y0) > 12) dedo.arrastou = true;
    },
    { capture: true, passive: true },
  );
  const soltarDedo = (ev: PointerEvent) => {
    if (ev.pointerType === 'mouse' || !dedo.ativo) return;
    dedo.ativo = false;
    dedo.ate = dedo.arrastou ? 0 : agoraS() + CONTORNO_DEPOIS_DO_TOQUE;
  };
  window.addEventListener('pointerup', soltarDedo, { capture: true, passive: true });
  window.addEventListener('pointercancel', soltarDedo, { capture: true, passive: true });

  /** Onde o contorno vai agora: o ponto do dedo, o meio da tela (null) ou nada (undefined). */
  function pontoDoContorno(): { ponto: { x: number; y: number } | null; quebrar: boolean } | undefined {
    const agora = agoraS();
    if (document.body.classList.contains('toque-ativo')) {
      const segurando = dedo.ativo && !dedo.arrastou;
      if (segurando) return { ponto: { x: dedo.x, y: dedo.y }, quebrar: agora - dedo.t0 > SEGURAR_QUEBRA };
      if (agora < dedo.ate) return { ponto: { x: dedo.x, y: dedo.y }, quebrar: false };
      return undefined;
    }
    // o computador (o mouse travado) e o controle: a mira do meio
    return { ponto: null, quebrar: op.quebrando() };
  }

  function atualizarMira(acesa: boolean, colocaBloco: boolean): void {
    let cel: [number, number, number] | null = null;
    const p = acesa ? pontoDoContorno() : undefined;
    if (p) {
      const { alvo: a, fantasma: f } = op.alvo(p.ponto);
      // com bloco na mão e sem segurar, a célula onde ele entra (na obra, o fantasma que o dedo
      // enche); senão, o bloco que vai quebrar
      if (f && !p.quebrar) cel = [f.x, f.y, f.z];
      else if (a) cel = colocaBloco && !p.quebrar ? [a.x + a.normal.x, a.y + a.normal.y, a.z + a.normal.z] : [a.x, a.y, a.z];
      // a célula onde a própria criança está não recebe bloco: o contorno não aparece ali
      const j = op.jogador();
      if (
        cel &&
        colocaBloco &&
        !p.quebrar &&
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
      miolo?.setEnabled(false);
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
    const m = pegarMiolo();
    m.setEnabled(true);
    m.position.copyFrom(centro);
    // de perto o miolo some (não vela a tela)
    matMiolo.alpha = 0.12 * suave((dist - 1.6) / 1.4);
    // respira bem devagar (nada de piscar)
    matMira.alpha = 0.78 + Math.sin(agoraS() * 2.4) * 0.12;
  }

  const olhosPara = (yaw: number) => {
    const j = op.jogador();
    return {
      x: j.x + Math.sin(yaw) * frente,
      y: j.y + ALTURA_OLHOS + pouso,
      z: j.z + Math.cos(yaw) * frente,
    };
  };

  return {
    ligar(sim) {
      escolha = sim;
      guardarEscolha(op.armazenamento, sim);
    },
    ligada: () => escolha,
    valendo,
    fracao: () => t,
    propria: () => lugar,
    mira: () => celulaMira,
    olhosPara,
    custoMira() {
      const c = { malhas: 0, triangulos: 0 };
      if (contorno?.isEnabled())
        for (const m of [contorno, miolo!]) {
          c.malhas++;
          c.triangulos += Math.round(m.getTotalIndices() / 3);
        }
      return c;
    },
    antesDaMira(dt) {
      const s = op.situacao();
      lugar = lugarComCameraPropria(s);
      const alvoT = valendo() ? 1 : 0;
      // o modo foto tem a câmera dele: a primeira pessoa sai na hora (nada de briga de câmeras)
      if (lugar === 'foto') t = 0;
      else t = alvoT === 1 ? Math.min(1, t + dt / DURACAO_TRANSICAO) : Math.max(0, t - dt / DURACAO_TRANSICAO);
      const e = suave(t);
      if (e <= 0) return;
      const jog = op.jogador();
      const pitch = olhos.rotation.x;
      const yaw = olhos.rotation.y;
      // ---------------- o campo de visão de dentro (mais aberto no celular em pé), entrando junto
      const tela = canvas.getBoundingClientRect();
      const fovJogo = visao.fov;
      const fovDentro = fovDeDentro(tela.width / Math.max(1, tela.height), fovJogo);
      visao.fov = fovJogo + (fovDentro - fovJogo) * e;
      // ao entrar, o olhar vai para a frente (o horizonte no terço de cima), junto com a entrada
      if (alvoT === 1 && entrada === null) entrada = { de: pitch, para: pitchDeEntrada(fovDentro) };
      if (entrada && alvoT === 1 && t < 1) op.apontar(yaw, entrada.de + (entrada.para - entrada.de) * e);
      // ---------------- o corpo vira junto com o olhar
      const yawCorpo = op.yawBoneco();
      const giro = ((((yaw - yawCorpo + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) - Math.PI;
      op.travarYaw(e >= 1 ? yaw : yawCorpo + giro * e);
      // ---------------- o pouso: a câmera abaixa um tico e volta macia
      if (jog.noChao) {
        if (noArDesde >= 0) {
          const noAr = agoraS() - noArDesde;
          if (noAr > 0.25 && !jog.voando) pousoVel -= Math.min(POUSO_MAXIMO * 9, noAr * POUSO_POR_SEGUNDO * 9);
        }
        noArDesde = -1;
      } else if (noArDesde < 0) noArDesde = agoraS();
      pousoVel += (-pouso * 90 - pousoVel * 12) * dt;
      pouso = Math.max(-POUSO_MAXIMO, Math.min(0.02, pouso + pousoVel * dt));
      // ---------------- os olhos dentro do corpo: recua na hora quando há bloco à frente, e
      // volta macio (nunca entra no bloco)
      const yOlhos = jog.y + ALTURA_OLHOS + pouso;
      const livre = frenteLivre(jog.x, yOlhos, jog.z, yaw, op.solido);
      frente = livre < frente ? livre : Math.min(livre, frente + dt * 0.8);
      const destino = olhosPara(yaw);
      visao.position.copyFrom(Vector3.Lerp(visao.position, new Vector3(destino.x, destino.y, destino.z), e));
      // olhando bem para baixo, o olhar passa um tico da vertical: o peito e os sapatos aparecem
      // (o alto da tela continua sendo a frente: nada vira de ponta-cabeça)
      const curva = suave((pitch - 1.0) / 0.45);
      visao.rotation.x = pitch + PITCH_CURVADO * curva * e;
      visao.updateUpVectorFromRotation = curva > 0;
      if (curva <= 0) visao.upVector.set(0, 1, 0);
    },
    quadro(dt) {
      const e = suave(t);
      const b = op.entradaBraco();
      // o braço nasce na primeira entrada; fora, um quadro com 0 devolve o corpo inteiro
      if (t > 0 || tAnterior > 0)
        op.braco().quadro(dt, {
          fracao: t,
          pitch: olhos.rotation.x,
          jogador: op.jogador(),
          ...b,
        });
      tAnterior = t;
      if (e <= 0) {
        if (visao.updateUpVectorFromRotation) {
          visao.updateUpVectorFromRotation = false;
          visao.upVector.set(0, 1, 0);
        }
        op.travarYaw(null);
        entrada = null;
        if (celulaMira || contorno?.isEnabled()) atualizarMira(false, false);
        document.body.classList.remove('primeira-pessoa');
        return;
      }
      atualizarMira(e > 0.9, b.naMao.bloco !== null);
      document.body.classList.toggle('primeira-pessoa', e > 0.5);
    },
  };
}
