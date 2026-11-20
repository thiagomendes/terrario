/**
 * Esboço da spec 021 "Achar o amigo" (só com `?esboco=amigos`). O `main.ts` importa este
 * arquivo sob demanda: vira um pedaço à parte que o jogo nunca baixa.
 *
 * Tudo roda no motor de verdade, por cima do jogo de verdade: os amigos são os bonecos de
 * verdade (com fantasia) postos pelo gancho de teste `amigosDeTeste`, as carinhas são fotos
 * do boneco de verdade (`fotografarBoneco`, recorte da cabeça), o caminho das estrelinhas é
 * procurado nos blocos de verdade do mundo, e o "pular para perto" leva o jogador de verdade
 * (com o aceno da 015). O que é de mentirinha: não há rede (os amigos não andam sozinhos e o
 * "Chamar" é simulado chegando de um amigo), e o pulo não passa pelo núcleo.
 *
 * As quatro ideias: 1) carinha na borda da tela; 2) balão sobre a cabeça (para comparar);
 * 3) trilha de estrelinhas; 4) pular para perto (segurar a carinha). Mais o botão "Chamar",
 * e com muitos amigos: no máximo 3 carinhas, as que se encostam viram um montinho com "+N",
 * a bandeja de carinhas ao lado do minimapa e o amigo "escolhido".
 */
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Matrix, Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import '@babylonjs/core/Meshes/thinInstanceMesh';
import type { Scene } from '@babylonjs/core/scene';
import { corDoAmigo } from '../ui/mapa';
import { fotografarBoneco } from '../render/fotoBoneco';
import { normalizarAparencia } from '../personagem/aparencia';
import { ICONES_GESTOS, svgDoIcone } from '../ui/iconesGestos';
import { Bloco, obterBloco } from '../world/blocks';

// ------------------------------------------------------------------ tipos da API dos testes
type V3 = [number, number, number];
export type ModoEsboco = 'carinhas' | 'balao' | 'nada';
interface AmigoEsboco {
  id: string;
  aparencia: Record<string, unknown>;
  x: number;
  z: number;
  y?: number;
  yaw?: number;
}
interface RetanguloInfo {
  id: string;
  x: number;
  y: number;
  r: number;
  tipo: 'carinha' | 'montinho' | 'pontinho';
  /** Na borda (amigo fora da tela) ou em cima dele (à vista, mas tapado). */
  borda?: boolean;
}
interface EsbocoAmigos {
  /** Põe os amigos (bonecos de verdade) no chão de verdade. Devolve a altura de cada um. */
  por(lista: AmigoEsboco[]): Record<string, V3>;
  modo(m: ModoEsboco): void;
  escolher(id: string | null): void;
  bandeja(aberta: boolean): void;
  /** Trilha de estrelinhas até o amigo (null apaga). Devolve quantos passos tem o caminho. */
  trilha(id: string | null): number;
  /** Caminho da trilha atual (pontos no chão). */
  caminho(): V3[];
  /** Quadro parado do segurar (0 a 1) na carinha do amigo; null solta. */
  segurar(id: string | null, fracao?: number): void;
  /** Pulo inteiro: poeira, vai para o lado do amigo, poeira e aceno. fase: até onde ir. */
  pular(id: string, ate?: 'poeira' | 'tudo'): Promise<V3 | null>;
  /** O amigo id chamou (a carinha dele pulsa e o sininho toca). */
  chamado(id: string): void;
  /** O próprio jogador aperta "Chamar" (o boneco faz o gesto e o botão pulsa). */
  chamar(): void;
  /** Caminha pela trilha (controle de verdade, sem teleporte) até a fração do caminho. */
  andarTrilha(ate: number, velocidade?: number): Promise<void>;
  /** Carinhas e montinhos à vista agora (para conferir que não tapam o HUD). */
  vistos(): RetanguloInfo[];
  /** Caixas do HUD que as carinhas evitam. */
  proibidos(): { x: number; y: number; w: number; h: number; nome: string }[];
  /** Lugar livre e seguro ao lado do amigo (o mesmo que o pulo usa). */
  lugarAoLado(id: string): V3 | null;
  /** O amigo está escondido por morro, árvore ou casa (visto da câmera)? */
  tapado(id: string): boolean;
  /** Coluna do chão: a altura em que dá para ficar de pé em (x, z), procurando de y para baixo. */
  chao(x: number, z: number, y?: number): number | null;
  /** Som de mentirinha (o sininho do chamar e o puf do pulo), para ouvir no navegador. */
  som(qual: 'sininho' | 'puf'): void;
  /** Força a carinha sempre do tamanho de quem está perto (para comparar tamanhos). */
  pronto: boolean;
}

declare global {
  interface Window {
    __amigos?: EsbocoAmigos;
  }
}

/** Mais perto que isto, ou à vista, o amigo não tem carinha na borda. */
const PERTO = 12;
/** No máximo tantas carinhas (ou montinhos) na borda sem amigo escolhido. */
const MAX_CARINHAS = 3;
/** Segurar a carinha por isto (s) faz pular. Menos que TOQUE é um toque. */
const SEGURAR = 0.9;
const TOQUE = 0.25;
/** Quanto o "Chamar" deixa a carinha de quem chamou na frente (s). */
const DURA_CHAMADO = 6;
/** Quanto a trilha dura depois de aparecer (s), se a criança não chegar antes. */
const DURA_TRILHA = 14;

const CSS = `
.esb-amigos { position: fixed; inset: 0; pointer-events: none; z-index: 9; }
.esb-carinha { position: absolute; left: 0; top: 0; width: var(--d); height: var(--d); margin: calc(var(--d) / -2) 0 0 calc(var(--d) / -2);
  pointer-events: auto; touch-action: none; -webkit-touch-callout: none; user-select: none; cursor: pointer;
  transition: width 0.25s, height 0.25s, margin 0.25s, opacity 0.25s; will-change: transform; }
.esb-carinha .aro { position: absolute; inset: 0; border-radius: 50%; background: #fbf7ee;
  box-shadow: 0 0 0 4px var(--cor), 0 4px 0 4px rgba(0,0,0,0.12), 0 8px 18px rgba(20, 16, 40, 0.35); overflow: hidden; }
.esb-carinha .aro img { position: absolute; inset: 2px; width: calc(100% - 4px); height: calc(100% - 4px); object-fit: cover; }
.esb-carinha .seta { position: absolute; left: 50%; top: 50%; width: 0; height: 0; transform-origin: 0 0; }
.esb-carinha .seta::before { content: ''; position: absolute; left: calc(var(--d) / 2 + 3px); top: -9px;
  border-top: 9px solid transparent; border-bottom: 9px solid transparent; border-left: 12px solid var(--cor);
  filter: drop-shadow(0 2px 0 rgba(0,0,0,0.15)); }
.esb-carinha.sem-seta .seta { display: none; }
.esb-carinha .anel { position: absolute; inset: -9px; width: calc(100% + 18px); height: calc(100% + 18px); pointer-events: none; transform: rotate(-90deg); }
.esb-carinha .anel circle { fill: none; stroke-width: 6; stroke-linecap: round; }
.esb-carinha .anel .fundo { stroke: rgba(255, 250, 240, 0.7); }
.esb-carinha .anel .cheio { stroke: #ffd45a; filter: drop-shadow(0 0 3px #fff6c4); }
.esb-carinha.chamando .aro { animation: esb-pulso 0.9s ease-in-out infinite; }
.esb-carinha.chamando::before, .esb-carinha.chamando::after { content: ''; position: absolute; inset: -4px; border-radius: 50%;
  border: 4px solid var(--cor); animation: esb-onda 1.4s ease-out infinite; pointer-events: none; }
.esb-carinha.chamando::after { animation-delay: 0.7s; }
.esb-carinha .mao { position: absolute; right: -10px; top: -12px; width: 30px; height: 30px; border-radius: 50%; background: #fff6d8;
  box-shadow: 0 2px 0 rgba(150, 110, 60, 0.4); display: none; animation: esb-aceno 0.6s ease-in-out infinite alternate; }
.esb-carinha.chamando .mao { display: block; }
.esb-carinha .mao svg { width: 30px; height: 30px; }
.esb-carinha.escolhido .aro { box-shadow: 0 0 0 5px var(--cor), 0 0 0 8px #fff6d8, 0 4px 0 8px rgba(0,0,0,0.12), 0 8px 18px rgba(20, 16, 40, 0.35); }
.esb-carinha.pontinho { --d: 16px !important; }
.esb-carinha.pontinho .aro { background: var(--cor); box-shadow: 0 0 0 3px #fbf7ee, 0 2px 4px rgba(20,16,40,0.35); }
.esb-carinha.pontinho img, .esb-carinha.pontinho .seta { display: none; }
@keyframes esb-pulso { 50% { transform: scale(1.12); } }
@keyframes esb-onda { from { transform: scale(1); opacity: 0.9; } to { transform: scale(1.9); opacity: 0; } }
@keyframes esb-aceno { from { transform: rotate(-14deg); } to { transform: rotate(14deg); } }
/* montinho: até 3 carinhas encostadas e o "+N" */
.esb-montinho { position: absolute; left: 0; top: 0; height: var(--d); display: flex; align-items: center; pointer-events: auto; cursor: pointer;
  transform-origin: center; will-change: transform; }
.esb-montinho[hidden] { display: none; }
.esb-montinho .cara { width: var(--d); height: var(--d); border-radius: 50%; background: #fbf7ee; margin-left: calc(var(--d) * -0.42);
  box-shadow: 0 0 0 3px var(--cor), 0 3px 8px rgba(20, 16, 40, 0.35); overflow: hidden; flex: none; }
.esb-montinho .cara:first-child { margin-left: 0; }
.esb-montinho .cara img { width: 100%; height: 100%; object-fit: cover; }
.esb-montinho .mais { margin-left: -6px; padding: 2px 8px; border-radius: 999px; background: #fff6d8; color: #3b2a1e;
  font: 900 0.85rem var(--jogo, system-ui), sans-serif; box-shadow: 0 2px 0 rgba(150, 110, 60, 0.4); z-index: 1; }
.esb-montinho .seta { position: absolute; left: 50%; top: 50%; width: 0; height: 0; }
.esb-montinho .seta::before { content: ''; position: absolute; left: var(--alcance); top: -8px;
  border-top: 8px solid transparent; border-bottom: 8px solid transparent; border-left: 11px solid #fbf7ee;
  filter: drop-shadow(0 2px 0 rgba(0,0,0,0.2)); }
/* botões ao lado do minimapa: a bandeja das carinhas e o Chamar */
.esb-botao { position: fixed; z-index: 9; width: 48px; height: 48px; border-radius: 50%; border: 0; padding: 0; display: grid; place-items: center;
  background: rgba(255, 250, 240, 0.95); pointer-events: auto; cursor: pointer;
  box-shadow: 0 3px 0 rgba(150, 110, 60, 0.35), 0 6px 12px rgba(40, 25, 10, 0.2), inset 0 2px 0 rgba(255, 255, 255, 0.85); }
.esb-botao svg { width: 30px; height: 30px; }
.esb-botao.ativo { background: #ffe4a8; }
.esb-botao.chamar.tocando { animation: esb-pulso 0.5s ease-in-out 3; }
.esb-botao.chamar.tocando::after { content: ''; position: absolute; inset: -4px; border-radius: 50%; border: 4px solid #ffb547; animation: esb-onda 1s ease-out 2; }
.esb-bandeja { position: fixed; z-index: 9; display: flex; gap: 10px; padding: 8px 10px; border-radius: 999px;
  background: rgba(255, 250, 240, 0.95); pointer-events: auto;
  box-shadow: 0 3px 0 rgba(150, 110, 60, 0.35), 0 8px 18px rgba(40, 25, 10, 0.25); }
.esb-bandeja[hidden] { display: none; }
.esb-bandeja .cara { width: 44px; height: 44px; border-radius: 50%; background: #fbf7ee; overflow: hidden; position: relative; flex: none;
  box-shadow: 0 0 0 3px var(--cor), 0 2px 0 4px rgba(0,0,0,0.08); cursor: pointer; }
.esb-bandeja .cara img { width: 100%; height: 100%; object-fit: cover; }
.esb-bandeja .cara.escolhido { box-shadow: 0 0 0 4px var(--cor), 0 0 0 7px #ffd45a; }
.esb-bandeja .cara.perto::after { content: ''; position: absolute; right: 2px; bottom: 2px; width: 10px; height: 10px; border-radius: 50%; background: #5fcf6a;
  box-shadow: 0 0 0 2px #fff; }
@media (max-width: 560px) {
  .esb-bandeja { flex-wrap: wrap; justify-content: center; border-radius: 24px; gap: 8px; }
  .esb-bandeja .cara { width: 40px; height: 40px; }
}
`;

/** Ícone da bandeja: três carinhas (sem texto). */
const ICONE_BANDEJA =
  '<svg viewBox="0 0 32 32"><circle cx="9" cy="13" r="5.5" fill="#ff9db8" stroke="#3b2a1e" stroke-width="1.6"/><circle cx="23" cy="13" r="5.5" fill="#7cc6ff" stroke="#3b2a1e" stroke-width="1.6"/><circle cx="16" cy="19" r="6.5" fill="#ffd45a" stroke="#3b2a1e" stroke-width="1.8"/><circle cx="13.8" cy="18" r="1" fill="#3b2a1e"/><circle cx="18.2" cy="18" r="1" fill="#3b2a1e"/><path d="M13.5 21.5 Q16 23.8 18.5 21.5" fill="none" stroke="#3b2a1e" stroke-width="1.5" stroke-linecap="round"/></svg>';
/** Ícone do Chamar e o aceno: os dos gestos do jogo (spec 034, viewBox de 64). */
const ICONE_CHAMAR = svgDoIcone(ICONES_GESTOS.chamar, '');
const ICONE_ACENO = svgDoIcone(ICONES_GESTOS.acenar, '');

export function prepararEsbocoAmigos(): void {
  const esperar = () => {
    const e = window.__brumaluz;
    if (e?.ready && e.cenaBabylon && e.amigosDeTeste) ligar(e.cenaBabylon() as Scene);
    else setTimeout(esperar, 250);
  };
  esperar();
}

interface Amigo {
  id: string;
  aparencia: Record<string, unknown>;
  cor: string;
  x: number;
  y: number;
  z: number;
  yaw: number;
  /** A foto da cabeça (data URL), quando pronta. */
  foto: string | null;
  canvas: HTMLCanvasElement;
  el: HTMLDivElement;
  img: HTMLImageElement;
  anelCheio: SVGCircleElement;
  balao: TransformNode | null;
  /** Escondido por um morro, árvore ou casa (conferido nos blocos de vez em quando). */
  tapado: boolean;
}

function ligar(scene: Scene): void {
  const e = window.__brumaluz!;
  const st = document.createElement('style');
  st.textContent = CSS;
  document.head.append(st);
  const camada = document.createElement('div');
  camada.className = 'esb-amigos';
  document.body.append(camada);

  const amigos = new Map<string, Amigo>();
  let modo: ModoEsboco = 'carinhas';
  let escolhido: string | null = null;
  let chamadoDe: { id: string; ate: number } | null = null;
  const montinhos: HTMLDivElement[] = [];

  // --------------------------------------------------------------- blocos do mundo
  const solido = (x: number, y: number, z: number) => {
    const b = e.bloco!(Math.floor(x), Math.floor(y), Math.floor(z));
    return b !== Bloco.AR && b !== Bloco.AGUA && !!obterBloco(b)?.solido;
  };
  const agua = (x: number, y: number, z: number) =>
    e.bloco!(Math.floor(x), Math.floor(y), Math.floor(z)) === Bloco.AGUA;
  const FOLHAS = new Set<number>([Bloco.FOLHAGEM, Bloco.FOLHAS_BETULA, Bloco.FOLHAS_PINHO, Bloco.FOLHAS_LANTERNA, Bloco.FOLHAS_OUTONO]);
  const folha = (x: number, y: number, z: number) => FOLHAS.has(e.bloco!(Math.floor(x), Math.floor(y), Math.floor(z)));
  /** Dá para ficar de pé em (x, y, z)? Chão firme embaixo (não copa de árvore), duas células livres. */
  const dePe = (x: number, y: number, z: number) =>
    solido(x, y - 1, z) && !folha(x, y - 1, z) && !solido(x, y, z) && !solido(x, y + 1, z) && !agua(x, y, z) && !agua(x, y - 1, z);
  function chao(x: number, z: number, y0 = 120): number | null {
    for (let y = Math.floor(y0); y > 2; y--) if (dePe(x, y, z)) return y;
    return null;
  }

  // --------------------------------------------------------------- amigos de verdade
  function enviarAmigos() {
    e.amigosDeTeste!(
      [...amigos.values()].map((a) => ({
        id: a.id,
        aparencia: a.aparencia,
        x: a.x,
        y: a.y,
        z: a.z,
        yaw: a.yaw,
      })),
    );
  }
  setInterval(() => amigos.size && enviarAmigos(), 500);

  function criarCarinha(a: Omit<Amigo, 'el' | 'img' | 'anelCheio'>) {
    const el = document.createElement('div');
    el.className = 'esb-carinha';
    el.style.setProperty('--cor', a.cor);
    el.dataset.id = a.id;
    el.innerHTML = `<div class="aro"><img alt=""></div><div class="seta"></div>
      <svg class="anel" viewBox="0 0 100 100"><circle class="fundo" cx="50" cy="50" r="46" pathLength="100" stroke-dasharray="0 100"/>
      <circle class="cheio" cx="50" cy="50" r="46" pathLength="100" stroke-dasharray="0 100"/></svg>
      <div class="mao">${ICONE_ACENO}</div>`;
    el.hidden = true;
    camada.append(el);
    // toque: escolhe e desenha a trilha; segurar: pula para perto (o anel enche)
    let inicio = 0;
    let timer = 0;
    const anel = () => el.querySelector<SVGCircleElement>('.cheio')!;
    const fundo = () => el.querySelector<SVGCircleElement>('.fundo')!;
    const soltar = () => {
      cancelAnimationFrame(timer);
      timer = 0;
      anel().setAttribute('stroke-dasharray', '0 100');
      fundo().setAttribute('stroke-dasharray', '0 100');
    };
    el.addEventListener('pointerdown', (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      inicio = performance.now();
      fundo().setAttribute('stroke-dasharray', '100 0');
      const passo = () => {
        const f = (performance.now() - inicio) / 1000 / SEGURAR;
        anel().setAttribute('stroke-dasharray', `${Math.min(100, f * 100)} 100`);
        if (f >= 1) {
          soltar();
          inicio = 0;
          void api.pular(a.id);
          return;
        }
        timer = requestAnimationFrame(passo);
      };
      timer = requestAnimationFrame(passo);
    });
    const fim = (ev: Event) => {
      ev.stopPropagation();
      if (!inicio) return;
      const t = (performance.now() - inicio) / 1000;
      inicio = 0;
      soltar();
      if (t < TOQUE) {
        escolhido = a.id;
        api.trilha(a.id);
      }
    };
    el.addEventListener('pointerup', fim);
    el.addEventListener('pointercancel', () => {
      inicio = 0;
      soltar();
    });
    return {
      el,
      img: el.querySelector('img')!,
      anelCheio: el.querySelector<SVGCircleElement>('.cheio')!,
    };
  }

  function tirarFoto(a: Amigo) {
    fotografarBoneco(a.canvas, normalizarAparencia(a.aparencia), 'cabeca', 160);
    const tentar = (n: number) => {
      // a foto chega em poucos quadros: confere se o canvas já tem tinta
      const ctx = a.canvas.getContext('2d');
      let cheio = false;
      if (ctx && a.canvas.width) {
        const px = ctx.getImageData(a.canvas.width / 2, a.canvas.height / 2, 1, 1).data;
        cheio = px[3] > 0;
      }
      if (cheio) {
        a.foto = a.canvas.toDataURL('image/png');
        a.img.src = a.foto;
        desenharBandeja();
        if (a.balao) pintarRostoDoBalao(a);
      } else if (n < 80) setTimeout(() => tentar(n + 1), 150);
    };
    setTimeout(() => tentar(0), 200);
  }

  // --------------------------------------------------------------- ideia 2: balão
  const matCorda = new StandardMaterial('esb-corda', scene);
  matCorda.diffuseColor = Color3.FromHexString('#f4ecd8');
  matCorda.emissiveColor = new Color3(0.5, 0.48, 0.44);
  matCorda.specularColor = Color3.Black();
  // o balão desenha por cima de tudo (grupo 2 com a profundidade limpa): aparece atrás do morro
  scene.setRenderingAutoClearDepthStencil(2, true, true, true);
  function hslHex(cor: string): Color3 {
    const m = /hsl\((\d+), (\d+)%, (\d+)%\)/.exec(cor);
    if (!m) return Color3.FromHexString(cor);
    const [h, s, l] = [Number(m[1]) / 360, Number(m[2]) / 100, Number(m[3]) / 100];
    const f = (n: number) => {
      const k = (n + h * 12) % 12;
      const a = s * Math.min(l, 1 - l);
      return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    };
    return new Color3(f(0), f(8), f(4));
  }
  function criarBalao(a: Amigo) {
    const raiz = new TransformNode(`esb-balao-${a.id}`, scene);
    const mat = new StandardMaterial(`esb-balao-${a.id}`, scene);
    const c = hslHex(a.cor);
    mat.diffuseColor = c;
    mat.emissiveColor = c.scale(0.45);
    mat.specularColor = new Color3(0.6, 0.6, 0.6);
    mat.specularPower = 24;
    const bola = MeshBuilder.CreateSphere('esb-balao', { diameter: 1.6, segments: 16 }, scene);
    bola.scaling.set(1, 1.18, 1);
    bola.material = mat;
    bola.parent = raiz;
    const no = MeshBuilder.CreateCylinder('esb-balao-no', { height: 0.22, diameterTop: 0.08, diameterBottom: 0.3, tessellation: 10 }, scene);
    no.material = mat;
    no.parent = raiz;
    no.position.y = -0.98;
    const corda = MeshBuilder.CreateCylinder('esb-balao-corda', { height: 2.2, diameter: 0.04, tessellation: 6 }, scene);
    corda.material = matCorda;
    corda.parent = raiz;
    corda.position.y = -2.15;
    // a carinha do amigo na frente do balão (sempre virada para a câmera)
    const rosto = MeshBuilder.CreateDisc('esb-balao-rosto', { radius: 0.56, tessellation: 28 }, scene);
    rosto.parent = raiz;
    rosto.position.y = 0.05;
    rosto.billboardMode = Mesh.BILLBOARDMODE_ALL;
    const tex = new DynamicTexture(`esb-rosto-${a.id}`, { width: 128, height: 128 }, scene, true);
    tex.hasAlpha = true;
    const mr = new StandardMaterial(`esb-rosto-${a.id}`, scene);
    mr.diffuseTexture = tex;
    mr.emissiveColor = new Color3(0.75, 0.75, 0.75);
    mr.useAlphaFromDiffuseTexture = true;
    mr.specularColor = Color3.Black();
    mr.backFaceCulling = false;
    rosto.material = mr;
    for (const m of [bola, no, corda, rosto]) {
      m.renderingGroupId = 2;
      m.isPickable = false;
    }
    raiz.metadata = { tex, rosto };
    a.balao = raiz;
    pintarRostoDoBalao(a);
  }
  function pintarRostoDoBalao(a: Amigo) {
    const meta = a.balao?.metadata as { tex: DynamicTexture } | undefined;
    if (!meta || !a.foto) return;
    const img = new Image();
    img.onload = () => {
      const ctx = meta.tex.getContext() as CanvasRenderingContext2D;
      ctx.clearRect(0, 0, 128, 128);
      ctx.save();
      ctx.beginPath();
      ctx.arc(64, 64, 60, 0, Math.PI * 2);
      ctx.fillStyle = '#fbf7ee';
      ctx.fill();
      ctx.clip();
      ctx.drawImage(img, 6, 6, 116, 116);
      ctx.restore();
      ctx.lineWidth = 6;
      ctx.strokeStyle = '#fff';
      ctx.beginPath();
      ctx.arc(64, 64, 60, 0, Math.PI * 2);
      ctx.stroke();
      meta.tex.update();
    };
    img.src = a.foto;
  }

  // --------------------------------------------------------------- ideia 3: estrelinhas
  function dadosEstrela(): VertexData {
    // estrela de 5 pontas fofinha: frente e costas com o miolo estufado
    const pos: number[] = [];
    const ind: number[] = [];
    const nor: number[] = [];
    const R = 0.27;
    const r = 0.12;
    const fundo = 0.08;
    for (const lado of [1, -1]) {
      const base = pos.length / 3;
      pos.push(0, 0, -fundo * lado);
      for (let i = 0; i < 10; i++) {
        const ang = Math.PI / 2 + (i * Math.PI) / 5;
        const rr = i % 2 ? r : R;
        pos.push(Math.cos(ang) * rr, Math.sin(ang) * rr, 0);
      }
      for (let i = 0; i < 10; i++) {
        const a = base + 1 + i;
        const b = base + 1 + ((i + 1) % 10);
        if (lado > 0) ind.push(base, b, a);
        else ind.push(base, a, b);
      }
    }
    const vd = new VertexData();
    vd.positions = pos;
    vd.indices = ind;
    VertexData.ComputeNormals(pos, ind, nor);
    vd.normals = nor;
    return vd;
  }
  const estrela = new Mesh('esb-estrela', scene);
  dadosEstrela().applyToMesh(estrela);
  const matEstrela = new StandardMaterial('esb-estrela', scene);
  matEstrela.diffuseColor = Color3.FromHexString('#ffd45a');
  matEstrela.emissiveColor = Color3.FromHexString('#c88f10');
  matEstrela.specularColor = new Color3(1, 1, 0.85);
  matEstrela.specularPower = 12;
  matEstrela.backFaceCulling = false;
  estrela.material = matEstrela;
  estrela.isPickable = false;
  estrela.alwaysSelectAsActiveMesh = true;
  estrela.thinInstanceSetBuffer('matrix', new Float32Array(16), 16, false);
  estrela.thinInstanceCount = 0;
  let trilha: { pts: V3[]; nasceu: number; alvo: string; chegou: number } | null = null;
  let matrizes = new Float32Array(0);
  const mTmp = new Matrix();
  const qTmp = new Quaternion();
  const sTmp = new Vector3();
  const pTmp = new Vector3();

  /** Caminho a pé nos blocos (A* em colunas: sobe 1, desce até 3, contorna paredes e buracos). */
  function procurarCaminho(de: V3, ate: V3): V3[] {
    const x0 = Math.floor(de[0]);
    const z0 = Math.floor(de[2]);
    const x1 = Math.floor(ate[0]);
    const z1 = Math.floor(ate[2]);
    const folga = 24;
    const minX = Math.min(x0, x1) - folga;
    const minZ = Math.min(z0, z1) - folga;
    const W = Math.max(x0, x1) + folga - minX + 1;
    const H = Math.max(z0, z1) + folga - minZ + 1;
    if (W * H > 90_000) return [];
    const N = W * H;
    const g = new Float32Array(N).fill(Infinity);
    const alt = new Int16Array(N).fill(-1);
    const veio = new Int32Array(N).fill(-1);
    const fechado = new Uint8Array(N);
    const id = (x: number, z: number) => (z - minZ) * W + (x - minX);
    const yIni = chao(x0 + 0.5, z0 + 0.5, de[1] + 2) ?? Math.floor(de[1]);
    const ini = id(x0, z0);
    g[ini] = 0;
    alt[ini] = yIni;
    // fila de prioridade simples (pilha binária)
    const heap: number[] = [];
    const f = new Float32Array(N).fill(Infinity);
    const h = (x: number, z: number) => {
      const dx = Math.abs(x - x1);
      const dz = Math.abs(z - z1);
      return dx + dz + (Math.SQRT2 - 2) * Math.min(dx, dz);
    };
    const push = (i: number) => {
      heap.push(i);
      let k = heap.length - 1;
      while (k > 0) {
        const p = (k - 1) >> 1;
        if (f[heap[p]] <= f[heap[k]]) break;
        [heap[p], heap[k]] = [heap[k], heap[p]];
        k = p;
      }
    };
    const pop = () => {
      const top = heap[0];
      const last = heap.pop()!;
      if (heap.length) {
        heap[0] = last;
        let k = 0;
        for (;;) {
          const l = 2 * k + 1;
          const r = l + 1;
          let m = k;
          if (l < heap.length && f[heap[l]] < f[heap[m]]) m = l;
          if (r < heap.length && f[heap[r]] < f[heap[m]]) m = r;
          if (m === k) break;
          [heap[m], heap[k]] = [heap[k], heap[m]];
          k = m;
        }
      }
      return top;
    };
    f[ini] = h(x0, z0);
    push(ini);
    const passoY = (x: number, z: number, y: number): number | null => {
      // sobe no máximo 1, desce no máximo 3 (mais que isso é buraco)
      for (let yy = y + 1; yy >= y - 3; yy--) if (dePe(x + 0.5, yy, z + 0.5)) return yy;
      return null;
    };
    const fim = id(x1, z1);
    let achou = -1;
    let melhor = ini;
    let passos = 0;
    while (heap.length && passos++ < 60_000) {
      const i = pop();
      if (fechado[i]) continue;
      fechado[i] = 1;
      const x = (i % W) + minX;
      const z = Math.floor(i / W) + minZ;
      if (f[i] - g[i] < f[melhor] - g[melhor]) melhor = i;
      if (i === fim || (Math.abs(x - x1) <= 1 && Math.abs(z - z1) <= 1 && Math.abs(alt[i] - ate[1]) < 3)) {
        achou = i;
        break;
      }
      const y = alt[i];
      for (let dx = -1; dx <= 1; dx++)
        for (let dz = -1; dz <= 1; dz++) {
          if (!dx && !dz) continue;
          const nx = x + dx;
          const nz = z + dz;
          if (nx < minX || nz < minZ || nx >= minX + W || nz >= minZ + H) continue;
          const j = id(nx, nz);
          if (fechado[j]) continue;
          const ny = passoY(nx, nz, y);
          if (ny === null) continue;
          // na diagonal, as duas laterais também têm que dar passagem (sem cortar quina)
          if (dx && dz && (passoY(x + dx, z, y) === null || passoY(x, z + dz, y) === null)) continue;
          const custo = (dx && dz ? Math.SQRT2 : 1) + (ny > y ? 0.6 : ny < y ? 0.2 : 0);
          const ng = g[i] + custo;
          if (ng < g[j]) {
            g[j] = ng;
            alt[j] = ny;
            veio[j] = i;
            f[j] = ng + h(nx, nz) * 1.05;
            push(j);
          }
        }
    }
    // sem caminho inteiro (morro alto demais, água): vai até onde dá chegar mais perto
    if (achou < 0) achou = melhor;
    if (achou === ini) return [];
    const pts: V3[] = [];
    for (let i = achou; i >= 0; i = veio[i]) pts.push([(i % W) + minX + 0.5, alt[i], Math.floor(i / W) + minZ + 0.5]);
    return pts.reverse();
  }

  /** Estrelinhas a cada 0,8 bloco ao longo do caminho. */
  function espalhar(pts: V3[]): V3[] {
    const out: V3[] = [];
    let sobra = 0.6;
    for (let i = 1; i < pts.length; i++) {
      const [ax, ay, az] = pts[i - 1];
      const [bx, by, bz] = pts[i];
      const d = Math.hypot(bx - ax, bz - az);
      let t = sobra;
      while (t < d) {
        const k = t / d;
        out.push([ax + (bx - ax) * k, ay + (by - ay) * k, az + (bz - az) * k]);
        t += 0.8;
      }
      sobra = t - d;
    }
    return out;
  }

  function posJogador(): V3 {
    const p = e.posicao!;
    // a posição de depuração é a dos olhos: os pés ficam 1,62 abaixo
    return [p[0], p[1] - 1.62, p[2]];
  }

  function animarTrilha(agora: number) {
    if (!trilha) {
      estrela.thinInstanceCount = 0;
      return;
    }
    const t = agora - trilha.nasceu;
    const pts = trilha.pts;
    const n = pts.length;
    if (matrizes.length < n * 16) matrizes = new Float32Array(n * 16);
    const [px, , pz] = posJogador();
    // chegou perto do amigo: a trilha se apaga do começo para o fim
    const a = amigos.get(trilha.alvo);
    if (a && !trilha.chegou && Math.hypot(a.x - px, a.z - pz) < 3) trilha.chegou = agora;
    const apagar = trilha.chegou ? (agora - trilha.chegou) / 1.2 : t > DURA_TRILHA ? (t - DURA_TRILHA) / 1.5 : 0;
    if (apagar >= 1) {
      trilha = null;
      estrela.thinInstanceCount = 0;
      return;
    }
    // o ponto mais perto do jogador: as de trás somem (já passou por elas)
    let maisPerto = 0;
    let dmin = Infinity;
    for (let i = 0; i < n; i++) {
      const d = Math.hypot(pts[i][0] - px, pts[i][2] - pz);
      if (d < dmin) {
        dmin = d;
        maisPerto = i;
      }
    }
    for (let i = 0; i < n; i++) {
      const [x, y, z] = pts[i];
      // nasce em onda: do jogador até o amigo em ~1,2 s
      const nascer = Math.min(1, Math.max(0, (t * 60 - i) / 6));
      const passou = i < maisPerto - 2 ? Math.max(0, 1 - (maisPerto - 2 - i) / 4) : 1;
      // brilho que corre para a frente (mostra o sentido)
      const onda = Math.max(0, Math.cos((i * 0.35 - t * 6) % (Math.PI * 2))) ** 6;
      let s = (0.75 + 0.55 * onda) * nascer * passou * (1 - apagar);
      if (i === n - 1) s *= 1.6;
      sTmp.set(s, s, s);
      Quaternion.RotationYawPitchRollToRef(t * 2.2 + i * 0.6, 0, 0, qTmp);
      pTmp.set(x, y + 0.42 + Math.sin(t * 3 + i * 0.7) * 0.06, z);
      Matrix.ComposeToRef(sTmp, qTmp, pTmp, mTmp);
      mTmp.copyToArray(matrizes, i * 16);
    }
    estrela.thinInstanceSetBuffer('matrix', matrizes, 16, false);
    estrela.thinInstanceCount = n;
  }

  // --------------------------------------------------------------- ideia 4: poeira do pulo
  const matPoeira = new StandardMaterial('esb-poeira', scene);
  matPoeira.diffuseColor = Color3.FromHexString('#f6eedc');
  matPoeira.emissiveColor = Color3.FromHexString('#a99d86');
  matPoeira.specularColor = Color3.Black();
  matPoeira.alpha = 0.85;
  const nuvens: { m: Mesh; nasce: number; dir: Vector3; base: Vector3; tam: number }[] = [];
  function poeira(x: number, y: number, z: number, agora: number) {
    for (let i = 0; i < 12; i++) {
      const ang = (i / 12) * Math.PI * 2 + Math.random() * 0.4;
      const m = MeshBuilder.CreateSphere('esb-puf', { diameter: 1, segments: 8 }, scene);
      m.material = matPoeira;
      m.isPickable = false;
      const tam = 0.3 + Math.random() * 0.25;
      const base = new Vector3(x, y + 0.25 + Math.random() * 0.9, z);
      m.position.copyFrom(base);
      nuvens.push({ m, nasce: agora, dir: new Vector3(Math.cos(ang), 0.15 + Math.random() * 0.25, Math.sin(ang)), base, tam });
    }
    // estrelinhas que pulam do meio da poeira
    for (let i = 0; i < 6; i++) {
      const m = new Mesh('esb-puf-estrela', scene);
      dadosEstrela().applyToMesh(m);
      m.material = matEstrela;
      m.isPickable = false;
      const ang = (i / 6) * Math.PI * 2;
      const base = new Vector3(x, y + 1, z);
      m.position.copyFrom(base);
      nuvens.push({ m, nasce: agora, dir: new Vector3(Math.cos(ang) * 0.7, 1.1, Math.sin(ang) * 0.7), base, tam: -1 });
    }
  }
  function animarPoeira(agora: number) {
    for (let i = nuvens.length - 1; i >= 0; i--) {
      const p = nuvens[i];
      const t = (agora - p.nasce) / 0.9;
      if (t >= 1) {
        p.m.dispose();
        nuvens.splice(i, 1);
        continue;
      }
      const ease = 1 - (1 - t) ** 3;
      if (p.tam > 0) {
        p.m.position.set(p.base.x + p.dir.x * ease * 1.4, p.base.y + p.dir.y * ease * 1.4, p.base.z + p.dir.z * ease * 1.4);
        const s = p.tam * (0.6 + ease * 0.9) * (1 - t * t);
        p.m.scaling.set(s, s * 0.85, s);
      } else {
        p.m.position.set(p.base.x + p.dir.x * ease * 1.6, p.base.y + p.dir.y * ease * 1.6 - t * t * 0.8, p.base.z + p.dir.z * ease * 1.6);
        const s = 1.3 * (1 - t);
        p.m.scaling.set(s, s, s);
        p.m.rotation.y = t * 8;
      }
    }
  }

  /** Lugar livre ao lado do amigo: de pé, sem água, sem buraco, fora do que é protegido. */
  function lugarAoLado(id: string): V3 | null {
    const a = amigos.get(id);
    if (!a) return null;
    const [px, , pz] = posJogador();
    const vindo = Math.atan2(px - a.x, pz - a.z);
    const lados = [0, 0.6, -0.6, 1.2, -1.2, 1.9, -1.9, Math.PI];
    for (const raio of [2, 2.6, 3.2])
      for (const da of lados) {
        const ang = vindo + da;
        const x = Math.floor(a.x + Math.sin(ang) * raio) + 0.5;
        const z = Math.floor(a.z + Math.cos(ang) * raio) + 0.5;
        const y = chao(x, z, a.y + 3);
        if (y === null || Math.abs(y - a.y) > 1) continue;
        // sem buraco em volta (o chão das 8 vizinhas no máximo 1 abaixo)
        let buraco = false;
        for (let dx = -1; dx <= 1 && !buraco; dx++)
          for (let dz = -1; dz <= 1 && !buraco; dz++)
            if (!solido(x + dx, y - 1, z + dz) && !solido(x + dx, y - 2, z + dz)) buraco = true;
        if (buraco) continue;
        // a regra da 016: nada de cair dentro do que o mundo ou alguém construiu
        const prot = e.protecao?.(Math.floor(x), y, Math.floor(z));
        const protChao = e.protecao?.(Math.floor(x), y - 1, Math.floor(z));
        if ((prot && prot !== 'livre') || (protChao && protChao !== 'livre')) continue;
        const dono = e.donoDoBloco?.(Math.floor(x), y - 1, Math.floor(z));
        if (dono && dono !== e.voce) continue;
        return [x, y, z];
      }
    return null;
  }

  // --------------------------------------------------------------- sons de mentirinha
  let audio: AudioContext | null = null;
  function som(qual: 'sininho' | 'puf') {
    try {
      audio ??= new AudioContext();
      const ac = audio;
      const t0 = ac.currentTime + 0.02;
      const saida = ac.createGain();
      saida.gain.value = 0.5;
      saida.connect(ac.destination);
      if (qual === 'sininho') {
        // dois toquinhos de sino (sol e ré, uma quinta acima), macios
        for (const [f, at] of [
          [784, 0],
          [1175, 0.18],
        ] as const) {
          for (const [mult, vol] of [
            [1, 0.5],
            [2.76, 0.12],
            [5.4, 0.04],
          ] as const) {
            const o = ac.createOscillator();
            o.frequency.value = f * mult;
            const g = ac.createGain();
            g.gain.setValueAtTime(0, t0 + at);
            g.gain.linearRampToValueAtTime(vol, t0 + at + 0.008);
            g.gain.exponentialRampToValueAtTime(0.0005, t0 + at + 1.1 / mult ** 0.3);
            o.connect(g).connect(saida);
            o.start(t0 + at);
            o.stop(t0 + at + 1.3);
          }
        }
      } else {
        // puf: sopro de ruído com filtro descendo e um "pop" grave
        const dur = 0.45;
        const buf = ac.createBuffer(1, Math.floor(ac.sampleRate * dur), ac.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length) ** 2;
        const r = ac.createBufferSource();
        r.buffer = buf;
        const fil = ac.createBiquadFilter();
        fil.type = 'lowpass';
        fil.frequency.setValueAtTime(2400, t0);
        fil.frequency.exponentialRampToValueAtTime(300, t0 + dur);
        const g = ac.createGain();
        g.gain.setValueAtTime(0.7, t0);
        r.connect(fil).connect(g).connect(saida);
        r.start(t0);
        const o = ac.createOscillator();
        o.frequency.setValueAtTime(420, t0);
        o.frequency.exponentialRampToValueAtTime(140, t0 + 0.16);
        const go = ac.createGain();
        go.gain.setValueAtTime(0.4, t0);
        go.gain.exponentialRampToValueAtTime(0.001, t0 + 0.2);
        o.connect(go).connect(saida);
        o.start(t0);
        o.stop(t0 + 0.25);
      }
    } catch {
      // sem áudio: só a imagem
    }
  }

  // --------------------------------------------------------------- HUD que não pode ser tapado
  let proibidos: { x: number; y: number; w: number; h: number; nome: string }[] = [];
  function medirHud() {
    const W = window.innerWidth;
    const H = window.innerHeight;
    const lista: typeof proibidos = [];
    const seletores =
      '.barra, .minimapa, .bussola, .hud .fps, .hud .nitidez, .menu-hud, .botao-amigos, .esb-botao, .esb-bandeja, .missao-hud, .status .linha-icones, .toque .joystick, .toque .botoes > *, .toque .topo > *, .toque .correr, .hud .chip-hud, .hud .som';
    for (const el of Array.from(document.querySelectorAll<HTMLElement>(seletores))) {
      if (el.closest('.esb-amigos')) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 4 || r.height < 4 || r.width * r.height > W * H * 0.3) continue;
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) < 0.05) continue;
      lista.push({ x: r.left, y: r.top, w: r.width, h: r.height, nome: el.className.toString().slice(0, 40) });
    }
    proibidos = lista;
  }
  setInterval(medirHud, 700);

  // --------------------------------------------------------------- botões: bandeja e Chamar
  const bBandeja = document.createElement('button');
  bBandeja.className = 'esb-botao bandeja';
  bBandeja.innerHTML = ICONE_BANDEJA;
  bBandeja.setAttribute('aria-label', 'Amigos');
  const bChamar = document.createElement('button');
  bChamar.className = 'esb-botao chamar';
  bChamar.innerHTML = ICONE_CHAMAR;
  bChamar.setAttribute('aria-label', 'Chamar');
  const bandejaEl = document.createElement('div');
  bandejaEl.className = 'esb-bandeja';
  bandejaEl.hidden = true;
  document.body.append(bBandeja, bChamar, bandejaEl);
  bBandeja.addEventListener('click', () => api.bandeja(bandejaEl.hidden));
  bChamar.addEventListener('click', () => api.chamar());
  function posicionarBotoes() {
    const fel = (s: string) => document.querySelector<HTMLElement>(s);
    const mini = fel('.minimapa')?.getBoundingClientRect();
    const fundo = Math.max(
      mini?.bottom ?? 200,
      ...['.menu-hud.mochila', '.botao-amigos']
        .map((s) => fel(s))
        .filter((x) => x && x.offsetParent !== null)
        .map((x) => x!.getBoundingClientRect().bottom),
    );
    const direita = mini ? window.innerWidth - mini.right : 10;
    const estreito = window.innerWidth <= 560;
    // na coluna do minimapa, logo abaixo da mochila (e dos amigos, se houver)
    const x = window.innerWidth - direita - 48 + (estreito ? 0 : -2);
    bBandeja.style.left = `${x}px`;
    bBandeja.style.top = `${fundo + 10}px`;
    bChamar.style.left = `${x}px`;
    bChamar.style.top = `${fundo + 68}px`;
    // a bandeja abre para a esquerda do botão (no celular, embaixo dele, quebrando a linha)
    if (estreito) {
      bandejaEl.style.right = `${direita}px`;
      bandejaEl.style.left = 'auto';
      bandejaEl.style.top = `${fundo + 10}px`;
      bandejaEl.style.maxWidth = `${window.innerWidth - direita - 66}px`;
      bandejaEl.style.marginRight = '58px';
    } else {
      bandejaEl.style.right = `${direita + 58}px`;
      bandejaEl.style.top = `${fundo + 10 - 6}px`;
    }
  }
  setInterval(posicionarBotoes, 500);
  posicionarBotoes();

  function distancia(a: Amigo) {
    const [px, , pz] = posJogador();
    return Math.hypot(a.x - px, a.z - pz);
  }
  function desenharBandeja() {
    bandejaEl.innerHTML = '';
    const lista = [...amigos.values()].sort((a, b) => distancia(a) - distancia(b));
    for (const a of lista) {
      const c = document.createElement('div');
      c.className = 'cara';
      if (a.id === escolhido) c.classList.add('escolhido');
      if (distancia(a) < PERTO) c.classList.add('perto');
      c.style.setProperty('--cor', a.cor);
      c.dataset.id = a.id;
      c.innerHTML = a.foto ? `<img alt="" src="${a.foto}">` : '';
      c.addEventListener('click', () => {
        api.escolher(escolhido === a.id ? null : a.id);
        api.bandeja(false);
      });
      bandejaEl.append(c);
    }
  }

  // --------------------------------------------------------------- borda da tela
  /** Retângulo onde os centros das carinhas andam (a borda menos a margem). */
  function perimetro(m: number) {
    const W = window.innerWidth;
    const H = window.innerHeight;
    const l = m;
    const t = m;
    const r = W - m;
    const b = H - m;
    const w = r - l;
    const h = b - t;
    return {
      l,
      t,
      r,
      b,
      P: 2 * (w + h),
      ponto(s: number): [number, number] {
        const P = 2 * (w + h);
        s = ((s % P) + P) % P;
        if (s < w) return [l + s, t];
        if (s < w + h) return [r, t + (s - w)];
        if (s < 2 * w + h) return [r - (s - w - h), b];
        return [l, b - (s - 2 * w - h)];
      },
      param(x: number, y: number): number {
        if (Math.abs(y - t) < 0.5) return x - l;
        if (Math.abs(x - r) < 0.5) return w + (y - t);
        if (Math.abs(y - b) < 0.5) return w + h + (r - x);
        return 2 * w + h + (b - y);
      },
    };
  }
  function bate(x: number, y: number, raio: number) {
    for (const p of proibidos) {
      const cx = Math.max(p.x, Math.min(x, p.x + p.w));
      const cy = Math.max(p.y, Math.min(y, p.y + p.h));
      if (Math.hypot(x - cx, y - cy) < raio) return true;
    }
    return false;
  }

  const vTmp = new Vector3();
  const projTmp = new Vector3();
  let ultimoTapado = 0;
  function conferirTapados(agora: number) {
    if (agora - ultimoTapado < 0.3) return;
    ultimoTapado = agora;
    const cam = scene.activeCamera;
    if (!cam) return;
    const o = cam.globalPosition;
    for (const a of amigos.values()) {
      const alvo = [a.x, a.y + 1.4, a.z];
      const d = Math.hypot(alvo[0] - o.x, alvo[1] - o.y, alvo[2] - o.z);
      let tapado = false;
      for (let s = 1.5; s < d - 1; s += 0.5) {
        const k = s / d;
        if (solido(o.x + (alvo[0] - o.x) * k, o.y + (alvo[1] - o.y) * k, o.z + (alvo[2] - o.z) * k)) {
          tapado = true;
          break;
        }
      }
      a.tapado = tapado;
    }
  }

  interface Candidato {
    a: Amigo;
    d: number;
    /** Na borda (com seta) ou à vista mas tapado (sem seta, em cima de onde ele está). */
    borda: boolean;
    x: number;
    y: number;
    ang: number;
    diam: number;
    s: number;
  }
  function diametro(d: number, celular: boolean) {
    const k = Math.max(0, Math.min(1, (d - PERTO) / (140 - PERTO)));
    const [perto, longe] = celular ? [62, 40] : [78, 48];
    return Math.round(perto + (longe - perto) * Math.sqrt(k));
  }

  const vistosAgora: RetanguloInfo[] = [];
  function atualizarCarinhas(agora: number) {
    vistosAgora.length = 0;
    const cam = scene.activeCamera;
    const W = window.innerWidth;
    const H = window.innerHeight;
    const celular = W <= 560;
    for (const m of montinhos) m.hidden = true;
    if (!cam || modo !== 'carinhas' || document.body.classList.contains('modo-foto')) {
      for (const a of amigos.values()) a.el.hidden = true;
      return;
    }
    if (chamadoDe && agora > chamadoDe.ate) chamadoDe = null;
    const motor = scene.getEngine();
    const larg = motor.getRenderWidth();
    const alt = motor.getRenderHeight();
    const vista = cam.viewport.toGlobal(larg, alt);
    const view = cam.getViewMatrix();
    const transf = scene.getTransformMatrix();
    const cx = W / 2;
    const cy = H / 2;
    const cands: Candidato[] = [];
    for (const a of amigos.values()) {
      const d = distancia(a);
      vTmp.set(a.x, a.y + 1.5, a.z);
      const pv = Vector3.TransformCoordinates(vTmp, view);
      Vector3.ProjectToRef(vTmp, Matrix.IdentityReadOnly, transf, vista, projTmp);
      const sx = (projTmp.x / larg) * W;
      const sy = (projTmp.y / alt) * H;
      const naTela = pv.z > 0.3 && sx > 30 && sx < W - 30 && sy > 30 && sy < H - 30;
      const chamando = chamadoDe?.id === a.id;
      if (!chamando && (d < PERTO || (naTela && !a.tapado))) {
        a.el.hidden = true;
        continue;
      }
      let dx: number;
      let dy: number;
      if (pv.z > 0.3) {
        dx = sx - cx;
        dy = sy - cy;
      } else {
        // atrás da câmera: para baixo e para o lado dele ("vira para trás")
        dx = pv.x;
        dy = Math.abs(pv.z) * 0.9 - pv.y * 0.3;
      }
      const diam = diametro(d, celular) * (chamando ? 1.15 : 1);
      if (naTela && !chamando) {
        // à vista mas tapado pelo morro ou pela árvore: a carinha fica em cima dele, sem seta
        let ty = sy - diam * 0.7;
        for (let k = 0; k < 40 && bate(sx, ty, diam * 0.45 + 10); k++) ty -= 8;
        cands.push({ a, d, borda: false, x: sx, y: ty, ang: Math.PI / 2, diam: diam * 0.85, s: 0 });
        continue;
      }
      const ang = Math.atan2(dy, dx);
      const per = perimetro(diam / 2 + 18);
      const hw = (per.r - per.l) / 2;
      const hh = (per.b - per.t) / 2;
      const k = Math.min(hw / Math.max(1e-6, Math.abs(dx)), hh / Math.max(1e-6, Math.abs(dy)));
      const bx = Math.max(per.l, Math.min(per.r, cx + dx * k));
      const by = Math.max(per.t, Math.min(per.b, cy + dy * k));
      let s = per.param(bx, by);
      // desliza pela borda até sair de cima do HUD (o lado mais perto)
      const raio = diam / 2 + 16;
      let livre = s;
      for (let passo = 0; passo < per.P / 2; passo += 6) {
        const [x1, y1] = per.ponto(s + passo);
        if (!bate(x1, y1, raio)) {
          livre = s + passo;
          break;
        }
        const [x2, y2] = per.ponto(s - passo);
        if (!bate(x2, y2, raio)) {
          livre = s - passo;
          break;
        }
      }
      s = livre;
      const [x, y] = per.ponto(s);
      cands.push({ a, d, borda: true, x, y, ang: Math.atan2(sy - y, sx - x), diam, s });
      // a seta aponta de verdade para o amigo (pela direção que saiu do centro)
      cands[cands.length - 1].ang = pv.z > 0.3 ? Math.atan2(sy - y, sx - x) : ang;
    }
    // sem escolhido: as que se encostam viram montinho; no máximo 3 coisas na borda
    const mostrar = new Set<string>();
    const pontinhos = new Set<string>();
    const grupos: Candidato[][] = [];
    const ordem = [...cands].sort((p, q) => p.d - q.d);
    const chamando = chamadoDe ? ordem.find((c) => c.a.id === chamadoDe!.id) : undefined;
    if (escolhido) {
      for (const c of ordem) {
        if (c.a.id === escolhido || c === chamando) mostrar.add(c.a.id);
        else if (c.borda) pontinhos.add(c.a.id);
      }
    } else {
      for (const c of ordem) {
        const g = grupos.find((gr) => gr.some((o) => Math.hypot(o.x - c.x, o.y - c.y) < (o.diam + c.diam) / 2 + 6));
        if (g) g.push(c);
        else grupos.push([c]);
      }
      // quem chamou vai na frente, sozinho
      if (chamando) {
        for (const g of grupos) {
          const i = g.indexOf(chamando);
          if (i >= 0) g.splice(i, 1);
        }
        grupos.unshift([chamando]);
      }
      let usados = 0;
      for (const g of grupos) {
        if (!g.length) continue;
        if (usados >= MAX_CARINHAS) break;
        usados++;
        if (g.length === 1) mostrar.add(g[0].a.id);
        else desenharMontinho(g, montinhos[usados - 1] ?? novoMontinho(), celular);
      }
    }
    for (const c of cands) {
      const el = c.a.el;
      const pontinho = pontinhos.has(c.a.id);
      if (!mostrar.has(c.a.id) && !pontinho) {
        el.hidden = true;
        continue;
      }
      el.hidden = false;
      el.classList.toggle('pontinho', pontinho);
      el.classList.toggle('sem-seta', !c.borda);
      el.classList.toggle('escolhido', c.a.id === escolhido);
      el.classList.toggle('chamando', chamadoDe?.id === c.a.id);
      el.style.zIndex = chamadoDe?.id === c.a.id ? '3' : c.a.id === escolhido ? '2' : '1';
      let x = c.x;
      let y = c.y;
      if (pontinho) {
        // pontinho bem na borda, no mesmo lado em que a carinha estaria
        const dentro = perimetro(c.diam / 2 + 18);
        const fora = perimetro(14);
        if (c.x <= dentro.l + 1) x = fora.l;
        if (c.x >= dentro.r - 1) x = fora.r;
        if (c.y <= dentro.t + 1) y = fora.t;
        if (c.y >= dentro.b - 1) y = fora.b;
      }
      el.style.setProperty('--d', `${c.diam}px`);
      el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
      (el.querySelector('.seta') as HTMLElement).style.transform = `rotate(${c.ang}rad)`;
      vistosAgora.push({ id: c.a.id, x, y, r: pontinho ? 8 : c.diam / 2, tipo: pontinho ? 'pontinho' : 'carinha', borda: c.borda });
    }
  }
  function novoMontinho() {
    const m = document.createElement('div');
    m.className = 'esb-montinho';
    m.hidden = true;
    camada.append(m);
    montinhos.push(m);
    m.addEventListener('click', () => api.bandeja(true));
    return m;
  }
  function desenharMontinho(g: Candidato[], m: HTMLDivElement, celular: boolean) {
    const d = Math.round((celular ? 40 : 50) * 1);
    const caras = g.slice(0, 3);
    const chave = g.map((c) => c.a.id).join(',') + (caras.every((c) => c.a.foto) ? '' : '?');
    if (m.dataset.chave !== chave) {
      m.dataset.chave = chave;
      m.innerHTML =
        caras.map((c) => `<div class="cara" style="--cor:${c.a.cor}">${c.a.foto ? `<img alt="" src="${c.a.foto}">` : ''}</div>`).join('') +
        (g.length > 3 ? `<div class="mais">+${g.length - 3}</div>` : '') +
        '<div class="seta"></div>';
    }
    m.hidden = false;
    m.style.setProperty('--d', `${d}px`);
    // o montinho fica onde estava a carinha mais perto, puxado para dentro da borda
    const larg = d + (caras.length - 1) * d * 0.58 + (g.length > 3 ? 30 : 0);
    const c0 = g[0];
    const W = window.innerWidth;
    const H = window.innerHeight;
    let x = Math.max(14, Math.min(W - larg - 14, c0.x - larg / 2));
    let y = Math.max(14, Math.min(H - d - 14, c0.y - d / 2));
    // não em cima do HUD
    for (let tent = 0; tent < 40 && bateRet(x, y, larg, d); tent++) {
      if (c0.x < W / 2) y += 8;
      else y += 8;
      if (y > H - d - 14) {
        y = 14;
        x += c0.x < W / 2 ? 8 : -8;
      }
    }
    m.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
    // a seta do montinho sai do lado de fora, na direção média
    let sx = 0;
    let sy = 0;
    for (const c of g) {
      sx += Math.cos(c.ang);
      sy += Math.sin(c.ang);
    }
    const ang = Math.atan2(sy, sx);
    const seta = m.querySelector<HTMLElement>('.seta')!;
    seta.style.left = `${larg / 2}px`;
    seta.style.top = `${d / 2}px`;
    seta.style.setProperty('--alcance', `${Math.abs(Math.cos(ang)) * larg / 2 + Math.abs(Math.sin(ang)) * d / 2 + 2}px`);
    seta.style.transform = `rotate(${ang}rad)`;
    vistosAgora.push({ id: g.map((c) => c.a.id).join('+'), x: x + larg / 2, y: y + d / 2, r: larg / 2, tipo: 'montinho' });
  }
  function bateRet(x: number, y: number, w: number, h: number) {
    for (const p of proibidos)
      if (x < p.x + p.w + 6 && x + w + 6 > p.x && y < p.y + p.h + 6 && y + h + 6 > p.y) return true;
    return false;
  }

  function atualizarBaloes() {
    const cam = scene.activeCamera;
    for (const a of amigos.values()) {
      if (!a.balao) continue;
      const ligado = modo === 'balao';
      a.balao.setEnabled(ligado);
      if (!ligado || !cam) continue;
      const d = Vector3.Distance(cam.globalPosition, new Vector3(a.x, a.y, a.z));
      // perto: tamanho de brinquedo; longe: cresce para continuar à vista
      const s = Math.max(1, d / 22);
      a.balao.scaling.set(s, s, s);
      const bob = Math.sin(performance.now() / 600 + a.x) * 0.15;
      a.balao.position.set(a.x, a.y + 2.4 + 3.2 * s + bob, a.z);
      // a carinha fica na frente do balão, do lado da câmera
      const rosto = (a.balao.metadata as { rosto: Mesh }).rosto;
      const dir = cam.globalPosition.subtract(a.balao.position);
      dir.y = 0;
      dir.normalize().scaleInPlace(0.84);
      rosto.position.set(dir.x, 0.05, dir.z);
    }
  }

  scene.onBeforeRenderObservable.add(() => {
    const agora = performance.now() / 1000;
    conferirTapados(agora);
    atualizarCarinhas(agora);
    atualizarBaloes();
    animarTrilha(agora);
    animarPoeira(agora);
  });

  // --------------------------------------------------------------- API (testes e capturas)
  const api: EsbocoAmigos = {
    pronto: true,
    por(lista) {
      const out: Record<string, V3> = {};
      const vivos = new Set(lista.map((l) => l.id));
      for (const [id, a] of amigos)
        if (!vivos.has(id)) {
          a.el.remove();
          a.balao?.dispose(false, true);
          amigos.delete(id);
        }
      for (const l of lista) {
        const y = l.y ?? chao(l.x, l.z) ?? 70;
        let a = amigos.get(l.id);
        if (!a) {
          const base = {
            id: l.id,
            aparencia: l.aparencia,
            cor: corDoAmigo(l.id),
            x: l.x,
            y,
            z: l.z,
            yaw: l.yaw ?? 0,
            foto: null,
            canvas: document.createElement('canvas'),
            balao: null,
            tapado: false,
          };
          a = { ...base, ...criarCarinha(base) };
          amigos.set(l.id, a);
          tirarFoto(a);
          criarBalao(a);
        } else {
          a.x = l.x;
          a.y = y;
          a.z = l.z;
          a.yaw = l.yaw ?? a.yaw;
        }
        out[l.id] = [l.x, y, l.z];
      }
      enviarAmigos();
      desenharBandeja();
      return out;
    },
    modo(m) {
      modo = m;
    },
    escolher(id) {
      escolhido = id;
      desenharBandeja();
    },
    bandeja(aberta) {
      if (aberta) desenharBandeja();
      bandejaEl.hidden = !aberta;
      bBandeja.classList.toggle('ativo', aberta);
    },
    trilha(id) {
      if (!id) {
        trilha = null;
        return 0;
      }
      const a = amigos.get(id);
      if (!a) return 0;
      const pts = procurarCaminho(posJogador(), [a.x, a.y, a.z]);
      if (!pts.length) return 0;
      trilha = { pts: espalhar(pts), nasceu: performance.now() / 1000, alvo: id, chegou: 0 };
      (trilha as unknown as { brutos: V3[] }).brutos = pts;
      return pts.length;
    },
    caminho() {
      return (trilha as unknown as { brutos?: V3[] } | null)?.brutos ?? [];
    },
    segurar(id, fracao = 0) {
      for (const a of amigos.values()) {
        const f = a.id === id ? Math.round(fracao * 100) : 0;
        a.el.querySelector('.fundo')!.setAttribute('stroke-dasharray', a.id === id ? '100 0' : '0 100');
        a.anelCheio.setAttribute('stroke-dasharray', `${f} 100`);
      }
    },
    async pular(id, ate = 'tudo') {
      const lugar = lugarAoLado(id);
      const a = amigos.get(id);
      if (!lugar || !a) return null;
      api.segurar(null);
      const agora = () => performance.now() / 1000;
      const [px, py, pz] = posJogador();
      poeira(px, py, pz, agora());
      som('puf');
      if (ate === 'poeira') return lugar;
      await new Promise((r) => setTimeout(r, 260));
      e.teleportar!(lugar[0], lugar[2], lugar[1]);
      const yaw = Math.atan2(a.x - lugar[0], a.z - lugar[2]);
      // a câmera de lado: os dois bonecos à vista (o jogador acena virado para o amigo)
      e.apontar!(yaw + 0.75, 0.2);
      poeira(lugar[0], lugar[1], lugar[2], agora());
      trilha = null;
      await new Promise((r) => setTimeout(r, 450));
      e.gestos?.fazer('acenar');
      return lugar;
    },
    chamado(id) {
      chamadoDe = { id, ate: performance.now() / 1000 + DURA_CHAMADO };
      som('sininho');
    },
    chamar() {
      e.gestos?.fazer('chamar');
      bChamar.classList.remove('tocando');
      void bChamar.offsetWidth;
      bChamar.classList.add('tocando');
      som('sininho');
    },
    async andarTrilha(ate, velocidade = 1) {
      const pts = api.caminho();
      if (!pts.length) return;
      const alvo = Math.floor((pts.length - 1) * ate);
      const ctl = e.controleDireto!;
      const ini = performance.now();
      ctl.tecla('rapido', false);
      for (;;) {
        const [px, py, pz] = posJogador();
        let i = 0;
        let dmin = Infinity;
        for (let k = 0; k < pts.length; k++) {
          const d = Math.hypot(pts[k][0] - px, pts[k][2] - pz);
          if (d < dmin) {
            dmin = d;
            i = k;
          }
        }
        if (i >= alvo || performance.now() - ini > 40_000) break;
        const prox = pts[Math.min(pts.length - 1, i + 3)];
        const yaw = Math.atan2(prox[0] - px, prox[2] - pz);
        e.apontar!(yaw, 0.4);
        ctl.mover(velocidade, 0);
        const sobe = pts[Math.min(pts.length - 1, i + 1)][1] > py + 0.4;
        ctl.tecla('pular', sobe);
        await new Promise((r) => setTimeout(r, 60));
      }
      ctl.mover(0, 0);
      ctl.tecla('pular', false);
    },
    vistos: () => vistosAgora.map((v) => ({ ...v })),
    proibidos: () => {
      medirHud();
      return proibidos;
    },
    lugarAoLado,
    tapado: (id) => !!amigos.get(id)?.tapado,
    chao: (x, z, y) => chao(x, z, y),
    som,
  };
  window.__amigos = api;
  console.log('esboco amigos pronto');
}
