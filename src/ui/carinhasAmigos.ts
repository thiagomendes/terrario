/**
 * Spec 021 "Achar o amigo": a camada das carinhas por cima do jogo. A conta de onde cada
 * coisa fica é de `disporCarinhas` (jogo/acharAmigo); aqui só o desenho em HTML (um
 * `transform` por coisa por quadro, e só quando mexe) e os toques:
 *
 * - tocar na carinha (menos de TOQUE_CARINHA s): escolhe o amigo e acende a trilha;
 * - segurar: o anel amarelo começa a encher depois de TOQUE_CARINHA s e fecha em
 *   SEGURAR_PULO s; fechou, pula para perto. Soltar antes cancela sem efeito;
 * - tocar no pontinho escolhe aquele amigo; tocar no montinho abre a bandeja.
 *
 * A foto da cabeça é a do boneco de verdade (`fotografarBoneco`, recorte da cabeça), tirada
 * uma vez por aparência (o estúdio guarda); trocar de fantasia troca a foto.
 * As caixas do HUD (que a carinha nunca tapa) são medidas ao mudar o tamanho da janela, ao
 * abrir a bandeja e de tempos em tempos (o HUD do toque aparece depois), nunca por quadro.
 */
import {
  SEGURAR_PULO,
  TOQUE_CARINHA,
  type Caixa,
  type ItemBorda,
} from '../jogo/acharAmigo';
import { fotografarBoneco } from '../render/fotoBoneco';
import { normalizarAparencia } from '../personagem/aparencia';
import { ICONES_GESTOS } from './iconesGestos';

export const CSS_CARINHAS = `
.carinhas-amigos { position: fixed; inset: 0; pointer-events: none; z-index: 8; }
body[data-overlay] .carinhas-amigos, body.modo-foto .carinhas-amigos, body.tela-titulo .carinhas-amigos,
body:has(.entrada:not([hidden])) .carinhas-amigos { display: none; }
.carinha-amigo { position: absolute; left: 0; top: 0; width: var(--d); height: var(--d); margin: calc(var(--d) / -2) 0 0 calc(var(--d) / -2);
  pointer-events: auto; touch-action: none; -webkit-touch-callout: none; user-select: none; -webkit-user-select: none; cursor: pointer;
  transition: width 0.25s, height 0.25s, margin 0.25s; will-change: transform; }
.carinha-amigo[hidden] { display: none; }
.carinha-amigo .aro { position: absolute; inset: 0; border-radius: 50%; background: #fbf7ee;
  box-shadow: 0 0 0 4px var(--cor), 0 4px 0 4px rgba(0,0,0,0.12), 0 8px 18px rgba(20, 16, 40, 0.35); overflow: hidden; }
.carinha-amigo .aro canvas { position: absolute; inset: 2px; width: calc(100% - 4px); height: calc(100% - 4px); }
.carinha-amigo .seta { position: absolute; left: 50%; top: 50%; width: 0; height: 0; transform-origin: 0 0; }
.carinha-amigo .seta::before { content: ''; position: absolute; left: calc(var(--d) / 2 + 3px); top: -9px;
  border-top: 9px solid transparent; border-bottom: 9px solid transparent; border-left: 12px solid var(--cor);
  filter: drop-shadow(0 2px 0 rgba(0,0,0,0.15)); }
.carinha-amigo.sem-seta .seta { display: none; }
.carinha-amigo .anel { position: absolute; inset: -9px; width: calc(100% + 18px); height: calc(100% + 18px); pointer-events: none; transform: rotate(-90deg); }
.carinha-amigo .anel circle { fill: none; stroke-width: 6; stroke-linecap: round; }
.carinha-amigo .anel .fundo { stroke: rgba(255, 250, 240, 0.75); }
.carinha-amigo .anel .cheio { stroke: #ffd45a; filter: drop-shadow(0 0 3px #fff6c4); }
/* sem caminho a pé: o anel pisca de leve, "segure para pular" */
.carinha-amigo.sugere-pulo .anel .fundo { stroke-dasharray: 100 0; animation: amg-sugere 1.4s ease-in-out infinite; }
.carinha-amigo.chamando .aro { animation: amg-pulso 0.9s ease-in-out infinite; }
.carinha-amigo.chamando::before, .carinha-amigo.chamando::after { content: ''; position: absolute; inset: -4px; border-radius: 50%;
  border: 4px solid var(--cor); animation: amg-onda 1.4s ease-out infinite; pointer-events: none; }
.carinha-amigo.chamando::after { animation-delay: 0.7s; }
.carinha-amigo .mao { position: absolute; right: -10px; top: -12px; width: 30px; height: 30px; border-radius: 50%; background: #fff6d8;
  box-shadow: 0 2px 0 rgba(150, 110, 60, 0.4); display: none; animation: amg-aceno 0.6s ease-in-out infinite alternate; pointer-events: none; }
.carinha-amigo.chamando .mao { display: block; }
.carinha-amigo .mao svg { width: 30px; height: 30px; }
.carinha-amigo.escolhido .aro { box-shadow: 0 0 0 5px var(--cor), 0 0 0 8px #fff6d8, 0 4px 0 8px rgba(0,0,0,0.12), 0 8px 18px rgba(20, 16, 40, 0.35); }
/* o "não" do pulo sem lugar seguro: balança de um lado para o outro */
.carinha-amigo.nao .aro { animation: amg-nao 0.5s ease-in-out 2; }
/* pontinho do amigo não escolhido: o desenho de 16 px numa área de toque de 40 px */
.carinha-amigo.pontinho .aro { inset: calc(50% - 8px); background: var(--cor); box-shadow: 0 0 0 3px #fbf7ee, 0 2px 4px rgba(20,16,40,0.35); }
.carinha-amigo.pontinho canvas, .carinha-amigo.pontinho .seta, .carinha-amigo.pontinho .anel { display: none; }
@keyframes amg-pulso { 50% { transform: scale(1.12); } }
@keyframes amg-onda { from { transform: scale(1); opacity: 0.9; } to { transform: scale(1.9); opacity: 0; } }
@keyframes amg-aceno { from { transform: rotate(-14deg); } to { transform: rotate(14deg); } }
@keyframes amg-sugere { 50% { stroke: #ffe9a0; } }
@keyframes amg-nao { 25% { transform: translateX(-7px) rotate(-8deg); } 75% { transform: translateX(7px) rotate(8deg); } }
/* montinho: até 3 carinhas encostadas e o "+N" */
.montinho-amigos { position: absolute; left: 0; top: 0; height: var(--d); display: flex; align-items: center; pointer-events: auto; cursor: pointer;
  touch-action: none; user-select: none; -webkit-user-select: none; will-change: transform; }
.montinho-amigos[hidden] { display: none; }
.montinho-amigos .cara { width: var(--d); height: var(--d); border-radius: 50%; background: #fbf7ee; margin-left: calc(var(--d) * -0.42);
  box-shadow: 0 0 0 3px var(--cor), 0 3px 8px rgba(20, 16, 40, 0.35); overflow: hidden; flex: none; }
.montinho-amigos .cara:first-child { margin-left: 0; }
.montinho-amigos .cara canvas { width: 100%; height: 100%; }
.montinho-amigos .mais { margin-left: -6px; padding: 2px 8px; border-radius: 999px; background: #fff6d8; color: #3b2a1e;
  font: 900 0.85rem var(--jogo, system-ui), sans-serif; box-shadow: 0 2px 0 rgba(150, 110, 60, 0.4); z-index: 1; }
.montinho-amigos .seta { position: absolute; width: 0; height: 0; }
.montinho-amigos .seta::before { content: ''; position: absolute; left: var(--alcance); top: -8px;
  border-top: 8px solid transparent; border-bottom: 8px solid transparent; border-left: 11px solid #fbf7ee;
  filter: drop-shadow(0 2px 0 rgba(0,0,0,0.2)); }
/* botões na coluna do minimapa: a bandeja das carinhas e o Chamar */
.botao-chamar.tocando { animation: amg-pulso 0.5s ease-in-out 3; }
.botao-chamar.tocando::after { content: ''; position: absolute; inset: -4px; border-radius: 50%; border: 4px solid #ffb547; animation: amg-onda 1s ease-out 2; pointer-events: none; }
.botao-chamar .ampulheta { display: none; position: absolute; right: -8px; bottom: -8px; width: 26px; height: 26px; padding: 2px; border-radius: 50%; background: #fbf7ee;
  box-shadow: 0 2px 0 rgba(150, 110, 60, 0.4); }
.botao-chamar.dormindo { background: rgba(236, 228, 214, 0.95); cursor: default; }
.botao-chamar.dormindo > svg:first-child { opacity: 0.45; }
.botao-chamar.dormindo .ampulheta { display: block; animation: amg-vira 8s linear forwards; }
@keyframes amg-vira { 0%, 85% { transform: rotate(0deg); } 100% { transform: rotate(180deg); } }

.botao-bandeja, .botao-chamar { position: fixed; z-index: 7; width: 48px; height: 48px; border-radius: 50%; border: 0; padding: 0; display: grid; place-items: center;
  background: rgba(255, 250, 240, 0.95); pointer-events: auto; cursor: pointer; touch-action: none; -webkit-touch-callout: none; user-select: none;
  box-shadow: 0 3px 0 rgba(150, 110, 60, 0.35), 0 6px 12px rgba(40, 25, 10, 0.2), inset 0 2px 0 rgba(255, 255, 255, 0.85); }
.botao-bandeja[hidden], .botao-chamar[hidden] { display: none; }
.botao-bandeja svg, .botao-chamar svg { width: 30px; height: 30px; pointer-events: none; }
.botao-bandeja:active, .botao-chamar:active { transform: translateY(2px); }
.botao-bandeja.ativo { background: #ffe4a8; }
.bandeja-amigos { position: fixed; z-index: 7; display: flex; gap: 10px; padding: 8px 10px; border-radius: 999px;
  background: rgba(255, 250, 240, 0.96); pointer-events: auto;
  box-shadow: 0 3px 0 rgba(150, 110, 60, 0.35), 0 8px 18px rgba(40, 25, 10, 0.25); }
.bandeja-amigos[hidden] { display: none; }
.bandeja-amigos .cara { width: 44px; height: 44px; border-radius: 50%; background: #fbf7ee; overflow: hidden; position: relative; flex: none; padding: 0; border: 0;
  box-shadow: 0 0 0 3px var(--cor), 0 2px 0 4px rgba(0,0,0,0.08); cursor: pointer; }
.bandeja-amigos .cara canvas { width: 100%; height: 100%; display: block; pointer-events: none; }
.bandeja-amigos .cara.escolhido { box-shadow: 0 0 0 4px var(--cor), 0 0 0 7px #ffd45a; }
.bandeja-amigos .cara.perto::after { content: ''; position: absolute; right: 2px; bottom: 2px; width: 10px; height: 10px; border-radius: 50%; background: #5fcf6a;
  box-shadow: 0 0 0 2px #fff; }
body[data-overlay] .botao-bandeja, body.tela-titulo .botao-bandeja, body.modo-foto .botao-bandeja,
body[data-overlay] .botao-chamar, body.tela-titulo .botao-chamar, body.modo-foto .botao-chamar,
body[data-overlay] .bandeja-amigos, body.tela-titulo .bandeja-amigos, body.modo-foto .bandeja-amigos,
body:has(.entrada:not([hidden])) .botao-bandeja, body:has(.entrada:not([hidden])) .botao-chamar { display: none; }
@media (max-width: 560px) {
  .bandeja-amigos { flex-wrap: wrap; justify-content: center; border-radius: 24px; gap: 8px; }
  .bandeja-amigos .cara { width: 40px; height: 40px; }
}
@media (prefers-reduced-motion: reduce) {
  .carinha-amigo.chamando .aro, .carinha-amigo.chamando::before, .carinha-amigo.chamando::after, .carinha-amigo .mao { animation: none; }
}
`;

const ICONE_ACENO = `<svg viewBox="0 0 32 32">${ICONES_GESTOS.acenar}</svg>`;
/** Ícone do Chamar: a mão do gesto "chamar" da 015 com ondinhas de som. */
const ICONE_CHAMAR = `<svg viewBox="0 0 32 32">${ICONES_GESTOS.chamar}<path d="M26 6 Q31 16 26 26" stroke="#a8610a" stroke-width="2" fill="none" stroke-linecap="round"/></svg>`;
/** O Chamar dormindo: um relógio de areia desenhado (sem número). */
const AMPULHETA =
  '<svg class="ampulheta" viewBox="0 0 32 32"><path d="M9 4 H23 M9 28 H23" stroke="#7a4826" stroke-width="2.6" stroke-linecap="round"/><path d="M10.5 5 Q10.5 12 16 16 Q21.5 12 21.5 5 Z M10.5 27 Q10.5 20 16 16 Q21.5 20 21.5 27 Z" fill="#fff6d8" stroke="#7a4826" stroke-width="1.8" stroke-linejoin="round"/><path class="areia-cima" d="M12.5 8 Q13 12 16 14.5 Q19 12 19.5 8 Z" fill="#e6b450"/><path class="areia-baixo" d="M12 26 Q13 21.5 16 20 Q19 21.5 20 26 Z" fill="#e6b450"/></svg>';
/** Ícone da bandeja: três carinhas (sem texto). */
const ICONE_BANDEJA =
  '<svg viewBox="0 0 32 32"><circle cx="9" cy="13" r="5.5" fill="#ff9db8" stroke="#3b2a1e" stroke-width="1.6"/><circle cx="23" cy="13" r="5.5" fill="#7cc6ff" stroke="#3b2a1e" stroke-width="1.6"/><circle cx="16" cy="19" r="6.5" fill="#ffd45a" stroke="#3b2a1e" stroke-width="1.8"/><circle cx="13.8" cy="18" r="1" fill="#3b2a1e"/><circle cx="18.2" cy="18" r="1" fill="#3b2a1e"/><path d="M13.5 21.5 Q16 23.8 18.5 21.5" fill="none" stroke="#3b2a1e" stroke-width="1.5" stroke-linecap="round"/></svg>';

/** Os seletores do HUD que a carinha nunca tapa. */
const SELETORES_HUD = [
  '.barra',
  '.minimapa',
  '.bussola',
  '.hud .fps',
  '.hud .nitidez',
  '.hud .chip-hud',
  '.hud .som',
  '.menu-hud',
  '.botao-amigos',
  '.botao-bandeja',
  '.botao-chamar',
  '.bandeja-amigos',
  '.missao-hud',
  '.status .linha-icones',
  '.toque .joystick',
  '.toque .botoes > *',
  '.toque .topo > *',
  '.toque .correr',
].join(', ');

/** As caixas do HUD à vista agora (px CSS). */
export function medirHud(): Caixa[] {
  const W = window.innerWidth;
  const H = window.innerHeight;
  const lista: Caixa[] = [];
  for (const el of Array.from(document.querySelectorAll<HTMLElement>(SELETORES_HUD))) {
    if (el.closest('.carinhas-amigos')) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 4 || r.height < 4 || r.width * r.height > W * H * 0.3) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) < 0.05) continue;
    lista.push({
      x: r.left,
      y: r.top,
      w: r.width,
      h: r.height,
      nome: el.className.toString().slice(0, 40),
    });
  }
  return lista;
}

export interface AmigoDaCarinha {
  id: string;
  cor: string;
  /** A aparência passada a limpo, em texto (a chave da foto). */
  aparencia: string;
}

export interface AcoesCarinhas {
  /** Toque curto na carinha ou no pontinho. */
  tocar(id: string): void;
  /** Segurou até o anel fechar. */
  pular(id: string): void;
  /** Tocou no montinho. */
  montinho(ids: string[]): void;
  /** Tocou numa cara da bandeja (o escolhido de novo desfaz a escolha). */
  escolher(id: string): void;
  /** Apertou o Chamar (acordado). */
  chamar(): void;
}

/** Um amigo na bandeja (do mais perto ao mais longe). */
export interface NaBandeja {
  id: string;
  perto: boolean;
}

/** O que a camada mostrou no último quadro (testes e capturas). */
export interface VistoNaBorda {
  tipo: ItemBorda['tipo'];
  ids: string[];
  x: number;
  y: number;
  r: number;
  borda: boolean;
  escolhido?: boolean;
  chamando?: boolean;
}

interface Carinha {
  el: HTMLDivElement;
  canvas: HTMLCanvasElement;
  cheio: SVGCircleElement;
  fundo: SVGCircleElement;
  aparencia: string;
  cor: string;
  /** O que já está escrito no DOM (só escreve quando muda). */
  tx: number;
  ty: number;
  d: number;
  ang: number;
  classes: string;
  segurando: number;
}

/** Foto da cabeça num canvas (a fila do estúdio guarda: a mesma aparência sai na hora). */
function fotografar(canvas: HTMLCanvasElement, aparencia: string): void {
  let a: unknown = {};
  try {
    a = JSON.parse(aparencia);
  } catch {
    // aparência estragada: o boneco padrão
  }
  fotografarBoneco(canvas, normalizarAparencia(a), 'cabeca', 128);
}

export function criarCarinhas(acoes: AcoesCarinhas) {
  if (!document.getElementById('css-carinhas-amigos')) {
    const st = document.createElement('style');
    st.id = 'css-carinhas-amigos';
    st.textContent = CSS_CARINHAS;
    document.head.append(st);
  }
  const camada = document.createElement('div');
  camada.className = 'carinhas-amigos';
  camada.setAttribute('aria-hidden', 'true');
  document.body.append(camada);
  const carinhas = new Map<string, Carinha>();
  const montinhos: HTMLDivElement[] = [];

  // a bandeja (só com mais de 3 amigos): o botão de três carinhas e a fileira de caras
  const bBandeja = document.createElement('button');
  bBandeja.className = 'botao-bandeja';
  bBandeja.innerHTML = ICONE_BANDEJA;
  bBandeja.setAttribute('aria-label', 'Amigos');
  bBandeja.hidden = true;
  const fileira = document.createElement('div');
  fileira.className = 'bandeja-amigos';
  fileira.hidden = true;
  document.body.append(bBandeja, fileira);
  const parar = (ev: Event) => ev.stopPropagation();
  for (const el of [bBandeja, fileira]) {
    el.addEventListener('pointerdown', parar);
    el.addEventListener('pointerup', parar);
  }
  bBandeja.addEventListener('click', (ev) => {
    ev.stopPropagation();
    abrirBandeja(fileira.hidden);
  });
  let chaveFileira = '';
  let naBandeja: readonly NaBandeja[] = [];
  let escolhidoAgora: string | null = null;
  let amigosAgora: ReadonlyMap<string, AmigoDaCarinha> = new Map();
  function desenharFileira(): void {
    const chave = naBandeja.map((b) => `${b.id}:${b.perto ? 1 : 0}:${amigosAgora.get(b.id)?.aparencia}`).join('|') + '#' + escolhidoAgora;
    if (chave === chaveFileira) return;
    chaveFileira = chave;
    fileira.innerHTML = '';
    for (const b of naBandeja) {
      const a = amigosAgora.get(b.id);
      if (!a) continue;
      const c = document.createElement('button');
      c.className = 'cara' + (b.id === escolhidoAgora ? ' escolhido' : '') + (b.perto ? ' perto' : '');
      c.style.setProperty('--cor', a.cor);
      c.dataset.amigo = b.id;
      const cv = document.createElement('canvas');
      c.append(cv);
      fotografar(cv, a.aparencia);
      c.addEventListener('click', (ev) => {
        ev.stopPropagation();
        acoes.escolher(b.id);
        abrirBandeja(false);
      });
      fileira.append(c);
    }
  }
  function abrirBandeja(aberta: boolean): void {
    if (aberta && bBandeja.hidden) return;
    if (aberta) {
      chaveFileira = '';
      desenharFileira();
    }
    fileira.hidden = !aberta;
    bBandeja.classList.toggle('ativo', aberta);
    medidoEm = -Infinity;
  }
  // o Chamar (com 1 amigo ou mais): a mão do gesto e ondinhas; depois de apertar, dorme
  const bChamar = document.createElement('button');
  bChamar.className = 'botao-chamar';
  bChamar.innerHTML = ICONE_CHAMAR + AMPULHETA;
  bChamar.setAttribute('aria-label', 'Chamar');
  bChamar.hidden = true;
  document.body.append(bChamar);
  bChamar.addEventListener('pointerdown', parar);
  bChamar.addEventListener('pointerup', parar);
  bChamar.addEventListener('click', (ev) => {
    ev.stopPropagation();
    if (bChamar.classList.contains('dormindo')) return;
    acoes.chamar();
  });
  let acordaEm = 0;
  /** Os botões ficam na coluna do minimapa, logo abaixo da mochila (e dos amigos). */
  const botoesDaColuna: HTMLElement[] = [bChamar, bBandeja];
  function posicionarBotoes(): void {
    const fel = (sel: string) => document.querySelector<HTMLElement>(sel);
    const mini = fel('.minimapa')?.getBoundingClientRect();
    const W = window.innerWidth;
    const embaixo = ['.menu-hud.mochila', '.botao-amigos']
      .map((sel) => fel(sel))
      .filter((x): x is HTMLElement => !!x)
      .map((x) => x.getBoundingClientRect())
      // só o que está à vista, na coluna da direita (fixo não tem offsetParent)
      .filter((r) => r.width > 0 && r.right > W - 140);
    const fundo = Math.max(mini?.bottom ?? 200, ...embaixo.map((r) => r.bottom));
    const direita = mini && mini.width ? W - mini.right : 14;
    const x = W - direita - 48;
    let y = fundo + 10;
    for (const b of botoesDaColuna) {
      if (b.hidden) continue;
      b.style.left = `${x}px`;
      b.style.top = `${y}px`;
      y += 58;
    }
    // a bandeja abre para a esquerda do botão (no celular em pé, quebrando a linha)
    const topo = parseFloat(bBandeja.style.top) || fundo + 10;
    if (W <= 560) {
      fileira.style.right = `${direita + 58}px`;
      fileira.style.left = 'auto';
      fileira.style.top = `${topo}px`;
      fileira.style.maxWidth = `${W - direita - 74}px`;
    } else {
      fileira.style.right = `${direita + 58}px`;
      fileira.style.left = 'auto';
      fileira.style.top = `${topo - 6}px`;
      fileira.style.maxWidth = `${W - direita - 74}px`;
    }
  }
  const vistos: VistoNaBorda[] = [];

  let proibidos: Caixa[] = [];
  let medidoEm = -Infinity;
  const remedir = () => {
    posicionarBotoes();
    proibidos = medirHud();
    medidoEm = performance.now();
  };
  window.addEventListener('resize', () => {
    medidoEm = -Infinity;
  });

  function criarCarinha(a: AmigoDaCarinha): Carinha {
    const el = document.createElement('div');
    el.className = 'carinha-amigo';
    el.dataset.amigo = a.id;
    el.style.setProperty('--cor', a.cor);
    el.innerHTML = `<div class="aro"><canvas></canvas></div><div class="seta"></div>
      <svg class="anel" viewBox="0 0 100 100"><circle class="fundo" cx="50" cy="50" r="46" pathLength="100" stroke-dasharray="0 100"/>
      <circle class="cheio" cx="50" cy="50" r="46" pathLength="100" stroke-dasharray="0 100"/></svg>
      <div class="mao">${ICONE_ACENO}</div>`;
    el.hidden = true;
    camada.append(el);
    const c: Carinha = {
      el,
      canvas: el.querySelector('canvas')!,
      cheio: el.querySelector<SVGCircleElement>('.cheio')!,
      fundo: el.querySelector<SVGCircleElement>('.fundo')!,
      aparencia: a.aparencia,
      cor: a.cor,
      tx: NaN,
      ty: NaN,
      d: 0,
      ang: NaN,
      classes: '',
      segurando: 0,
    };
    fotografar(c.canvas, a.aparencia);
    // toque curto: escolhe e acende a trilha; segurar: o anel enche e pula
    let inicio = 0;
    let timer = 0;
    const soltar = () => {
      cancelAnimationFrame(timer);
      timer = 0;
      c.segurando = 0;
      anel(c, 0, false);
    };
    el.addEventListener('pointerdown', (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      inicio = performance.now();
      if (el.classList.contains('pontinho')) return;
      el.setPointerCapture?.(ev.pointerId);
      const passo = () => {
        const t = (performance.now() - inicio) / 1000;
        // o anel só começa depois do tempo de um toque (um toque curto nunca vira pulo)
        const f = Math.max(0, (t - TOQUE_CARINHA) / (SEGURAR_PULO - TOQUE_CARINHA));
        c.segurando = Math.min(1, f);
        anel(c, c.segurando, t >= TOQUE_CARINHA);
        if (f >= 1) {
          soltar();
          inicio = 0;
          acoes.pular(a.id);
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
      if (t < TOQUE_CARINHA || el.classList.contains('pontinho')) acoes.tocar(a.id);
    };
    el.addEventListener('pointerup', fim);
    el.addEventListener('pointercancel', () => {
      inicio = 0;
      soltar();
    });
    // nada de menu do botão direito nem de clique passando para o jogo
    el.addEventListener('contextmenu', (ev) => ev.preventDefault());
    el.addEventListener('click', (ev) => ev.stopPropagation());
    return c;
  }

  function anel(c: Carinha, f: number, fundo: boolean): void {
    c.cheio.setAttribute('stroke-dasharray', `${Math.round(f * 100)} 100`);
    c.fundo.setAttribute('stroke-dasharray', fundo ? '100 0' : '0 100');
  }

  function novoMontinho(): HTMLDivElement {
    const m = document.createElement('div');
    m.className = 'montinho-amigos';
    m.hidden = true;
    camada.append(m);
    montinhos.push(m);
    m.addEventListener('pointerdown', (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
    });
    m.addEventListener('pointerup', (ev) => {
      ev.stopPropagation();
      acoes.montinho((m.dataset.ids ?? '').split(',').filter(Boolean));
    });
    return m;
  }

  function desenharMontinho(
    m: HTMLDivElement,
    item: ItemBorda,
    amigos: ReadonlyMap<string, AmigoDaCarinha>,
  ): void {
    const d = item.diam;
    const larg = item.larg ?? d;
    const caras = item.ids.slice(0, 3);
    const chave = item.ids.join(',') + '|' + caras.map((id) => amigos.get(id)?.aparencia).join('|');
    if (m.dataset.chave !== chave) {
      m.dataset.chave = chave;
      m.dataset.ids = item.ids.join(',');
      m.innerHTML = '';
      for (const id of caras) {
        const a = amigos.get(id);
        const cara = document.createElement('div');
        cara.className = 'cara';
        cara.style.setProperty('--cor', a?.cor ?? '#fff');
        const cv = document.createElement('canvas');
        cara.append(cv);
        m.append(cara);
        if (a) fotografar(cv, a.aparencia);
      }
      if (item.ids.length > 3) {
        const mais = document.createElement('div');
        mais.className = 'mais';
        mais.textContent = `+${item.ids.length - 3}`;
        m.append(mais);
      }
      const seta = document.createElement('div');
      seta.className = 'seta';
      m.append(seta);
    }
    m.hidden = false;
    m.style.setProperty('--d', `${d}px`);
    m.style.transform = `translate(${(item.x - larg / 2).toFixed(1)}px, ${(item.y - d / 2).toFixed(1)}px)`;
    const seta = m.querySelector<HTMLElement>('.seta');
    if (seta) {
      seta.style.left = `${larg / 2}px`;
      seta.style.top = `${d / 2}px`;
      const alc = (Math.abs(Math.cos(item.ang)) * larg) / 2 + (Math.abs(Math.sin(item.ang)) * d) / 2 + 2;
      seta.style.setProperty('--alcance', `${alc.toFixed(0)}px`);
      seta.style.transform = `rotate(${item.ang.toFixed(3)}rad)`;
    }
    vistos.push({ tipo: 'montinho', ids: item.ids, x: item.x, y: item.y, r: larg / 2, borda: true });
  }

  return {
    camada,
    /** As caixas do HUD (mede de novo a cada 2 s, ao mudar a janela ou quando pedido). */
    proibidos(forcar = false): readonly Caixa[] {
      if (forcar || performance.now() - medidoEm > 2000) remedir();
      return proibidos;
    },
    /** Desenha o quadro: `amigos` são todos os da sala; `itens`, o que vai na borda. */
    desenhar(itens: readonly ItemBorda[], amigos: ReadonlyMap<string, AmigoDaCarinha>): void {
      vistos.length = 0;
      // quem saiu da sala
      for (const [id, c] of carinhas)
        if (!amigos.has(id)) {
          c.el.remove();
          carinhas.delete(id);
        }
      const usados = new Set<string>();
      let nMontinho = 0;
      for (const item of itens) {
        if (item.tipo === 'montinho') {
          desenharMontinho(montinhos[nMontinho] ?? novoMontinho(), item, amigos);
          nMontinho++;
          continue;
        }
        const id = item.ids[0];
        const a = amigos.get(id);
        if (!a) continue;
        let c = carinhas.get(id);
        if (!c) {
          c = criarCarinha(a);
          carinhas.set(id, c);
        }
        if (c.aparencia !== a.aparencia) {
          // trocou de fantasia: foto nova
          c.aparencia = a.aparencia;
          fotografar(c.canvas, a.aparencia);
        }
        if (c.cor !== a.cor) {
          c.cor = a.cor;
          c.el.style.setProperty('--cor', a.cor);
        }
        usados.add(id);
        const pontinho = item.tipo === 'pontinho';
        const classes =
          'carinha-amigo' +
          (pontinho ? ' pontinho' : '') +
          (item.borda ? '' : ' sem-seta') +
          (item.escolhido ? ' escolhido' : '') +
          (item.chamando ? ' chamando' : '') +
          (c.el.classList.contains('nao') ? ' nao' : '') +
          (c.el.classList.contains('sugere-pulo') ? ' sugere-pulo' : '');
        if (classes !== c.classes) {
          c.classes = classes;
          c.el.className = classes;
          c.el.style.zIndex = item.chamando ? '3' : item.escolhido ? '2' : '1';
        }
        if (c.el.hidden) c.el.hidden = false;
        if (!(Math.abs(item.x - c.tx) <= 0.4 && Math.abs(item.y - c.ty) <= 0.4)) {
          c.tx = item.x;
          c.ty = item.y;
          c.el.style.transform = `translate(${item.x.toFixed(1)}px, ${item.y.toFixed(1)}px)`;
        }
        if (item.diam !== c.d) {
          c.d = item.diam;
          c.el.style.setProperty('--d', `${item.diam}px`);
        }
        if (!(Math.abs(item.ang - c.ang) <= 0.01)) {
          c.ang = item.ang;
          (c.el.children[1] as HTMLElement).style.transform = `rotate(${item.ang.toFixed(3)}rad)`;
        }
        vistos.push({
          tipo: item.tipo,
          ids: item.ids,
          x: item.x,
          y: item.y,
          r: pontinho ? 8 : item.diam / 2,
          borda: item.borda,
          ...(item.escolhido ? { escolhido: true } : {}),
          ...(item.chamando ? { chamando: true } : {}),
        });
      }
      for (const [id, c] of carinhas) if (!usados.has(id) && !c.el.hidden && !c.segurando) c.el.hidden = true;
      for (let i = nMontinho; i < montinhos.length; i++) montinhos[i].hidden = true;
    },
    /**
     * Os botões da coluna: a bandeja aparece com mais de 3 amigos; aberta, a fileira acompanha
     * quem está perto e quem está escolhido.
     */
    botoes(lista: readonly NaBandeja[], escolhido: string | null, muitos: boolean, amigos: ReadonlyMap<string, AmigoDaCarinha>): void {
      naBandeja = lista;
      escolhidoAgora = escolhido;
      amigosAgora = amigos;
      if (bBandeja.hidden === muitos) {
        bBandeja.hidden = !muitos;
        if (!muitos) abrirBandeja(false);
        medidoEm = -Infinity;
      }
      if (!fileira.hidden) desenharFileira();
      const comAmigos = amigos.size > 0;
      if (bChamar.hidden === comAmigos) {
        bChamar.hidden = !comAmigos;
        medidoEm = -Infinity;
      }
      if (acordaEm && performance.now() > acordaEm) {
        acordaEm = 0;
        bChamar.classList.remove('dormindo');
      }
    },
    /** O Chamar foi: pulsa e dorme por `segundos` (o relógio de areia vira). */
    chamou(segundos: number): void {
      bChamar.classList.remove('tocando', 'dormindo');
      void bChamar.offsetWidth;
      bChamar.classList.add('tocando', 'dormindo');
      acordaEm = performance.now() + segundos * 1000;
      setTimeout(() => bChamar.classList.remove('tocando'), 1600);
    },
    abrirBandeja,
    bandejaAberta: () => !fileira.hidden,
    botoesDaColuna,
    /** A carinha balança "não" (o pulo não achou lugar seguro) e o anel esvazia. */
    nao(id: string): void {
      const c = carinhas.get(id);
      if (!c) return;
      anel(c, 0, false);
      c.el.classList.remove('nao');
      void c.el.offsetWidth;
      c.el.classList.add('nao');
      c.classes = '';
      setTimeout(() => {
        c.el.classList.remove('nao');
        c.classes = '';
      }, 1100);
    },
    /** Sem caminho a pé até ele: o anel pisca, sugerindo segurar para pular. */
    sugerirPulo(id: string | null): void {
      for (const [k, c] of carinhas) {
        const quer = k === id;
        if (c.el.classList.contains('sugere-pulo') !== quer) {
          c.el.classList.toggle('sugere-pulo', quer);
          c.classes = '';
        }
      }
    },
    /** Quadro parado do segurar (testes e capturas): fração 0 a 1, null solta. */
    segurar(id: string | null, fracao = 0): void {
      for (const [k, c] of carinhas) {
        c.segurando = k === id ? Math.max(0.001, fracao) : 0;
        anel(c, k === id ? fracao : 0, k === id);
      }
    },
    vistos: (): VistoNaBorda[] => vistos.map((v) => ({ ...v })),
    /** O canvas da foto de um amigo (a bandeja copia dele). */
    foto: (id: string) => carinhas.get(id)?.canvas ?? null,
  };
}

export type Carinhas = ReturnType<typeof criarCarinhas>;
