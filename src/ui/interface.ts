import { fotografarBoneco } from '../render/fotoBoneco';
import { CSS_BRINQUEDO } from './brinquedo';
import { CSS_TEMAS_UI, criarVitrineTitulo } from './temasUi';
import { obterTema } from '../temas';
import { CSS_ATALHOS, criarBarraAtalhos } from './atalhos';
import type { Hotbar } from '../player/hotbar';
import { criarBarra } from './barra';
import { textoIndicador } from '../audio/ligador';
import type { EstadoAudio } from '../audio/motor';
import { textoIndicador as textoIndicadorCamera } from '../player/camera';
import { rotuloDoModelo, type Aparencia } from '../personagem/aparencia';
import type { Armazenamento } from '../personagem/persistencia';
import { CSS_PAINEL, criarPainelPersonagem, teclaParaPainel } from './personagem';
import { CSS_MODAL, criarPainelMundos } from './mundos';
import { CSS_PIXICONES, icone, modoToque, type NomeIcone } from './pixicones';
import { CSS_TITULO, desenharLogo, desenharPrevia } from './titulo';
import { CSS_CONFIG, criarPainelConfig } from './configuracoes';
import { CSS_PAUSA, criarMenuPausa } from './pausa';
import { entrarTelaCheia } from './telaCheia';
import type { GerenciadorConfig } from '../jogo/config';
import type { MetaMundo, RepositorioMundos } from '../jogo/mundos';

const CSS = `
.hud, .barra, .nome-item { --escala-ui: 1; }
.hud > * { transform: scale(var(--escala-ui)); transform-origin: top left; }
.hud .fps { transform-origin: top right; }
.hud .mira { transform: translate(-50%, -50%) scale(var(--escala-ui)); }
.barra { transform: translateX(-50%) scale(var(--escala-ui)) !important; transform-origin: bottom center; }
/* debaixo d'água: piscina clara, bolhinhas e faixas de luz */
body.submerso::after {
  content: ''; position: fixed; inset: 0; pointer-events: none; z-index: 3;
  background:
    repeating-linear-gradient(105deg, rgba(255, 255, 255, 0) 0 90px, rgba(255, 255, 255, 0.04) 120px 150px, rgba(255, 255, 255, 0) 180px 260px),
    linear-gradient(180deg, rgba(150, 215, 255, 0.34), rgba(60, 140, 215, 0.3) 60%, rgba(30, 95, 180, 0.4));
  background-size: 400px 100%, 100% 100%;
  animation: luz-agua 7s ease-in-out infinite alternate;
}
@keyframes luz-agua { from { background-position: 0 0, 0 0; } to { background-position: 120px 0, 0 0; } }
.bolhas-agua { position: fixed; inset: 0; pointer-events: none; z-index: 3; overflow: hidden; display: none; }
body.submerso .bolhas-agua { display: block; }
.bolhas-agua i {
  position: absolute; bottom: -24px; width: var(--tam); height: var(--tam); border-radius: 50%;
  border: 1.5px solid rgba(255, 255, 255, 0.75); background: radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.85), rgba(255, 255, 255, 0.08) 45%);
  animation: bolha-sobe linear infinite;
}
@keyframes bolha-sobe {
  0% { transform: translate(0, 0); opacity: 0; }
  10% { opacity: 1; }
  50% { transform: translate(12px, -50vh); }
  100% { transform: translate(-8px, -105vh); opacity: 0.6; }
}
@media (prefers-reduced-motion: reduce) { .bolhas-agua i, body.submerso::after { animation: none; } }
.painel-construcao {
  position: fixed; top: 42px; left: 50%; transform: translateX(-50%); z-index: 8; pointer-events: none;
  display: grid; justify-items: center; gap: 2px; padding: 8px 16px; border-radius: 16px;
  background: rgba(255, 250, 240, 0.92); color: var(--tinta); font: 800 0.9rem var(--jogo); text-align: center;
  box-shadow: 0 3px 0 rgba(150, 110, 60, 0.3);
}
.painel-construcao[hidden] { display: none; }
.painel-construcao small { font-weight: 700; color: var(--tinta-suave); }
.toast-area {
  position: fixed; top: 96px; left: 50%; transform: translateX(-50%); z-index: 50;
  display: grid; gap: 6px; justify-items: center; pointer-events: none;
  width: max-content; max-width: calc(100vw - 24px); text-align: center;
}
/* sem HUD de jogo (título, pausa): os avisos voltam ao alto */
body.tela-titulo .toast-area { top: 12px; }
/* com uma janela aberta, os avisos descem para baixo e não cobrem o título dela */
body[data-overlay] .toast-area { top: auto; bottom: calc(env(safe-area-inset-bottom, 0px) + 14px); z-index: 60; }
/* bússola no alto ao centro; construção logo abaixo; avisos abaixo dela */
@media (max-width: 560px) {
  /* retrato: coluna da esquerda (HUD) e do minimapa ocupam o alto; construção acima dos controles */
  .painel-construcao { top: auto; bottom: calc(env(safe-area-inset-bottom, 0px) + 280px); max-width: calc(100vw - 32px); }
  .toast-area { top: 216px; max-width: calc(100vw - 132px); }
}
@media (orientation: landscape) and (max-height: 500px) {
  .painel-construcao { top: 56px; padding: 4px 12px; font-size: 0.8rem; }
  .toast-area { top: 104px; max-width: 46vw; }
  body.toque-ativo .hud .fps { top: 58px; right: 104px; }
}
.toast {
  padding: 8px 16px; border-radius: 999px; background: rgba(255, 250, 240, 0.95); color: var(--tinta);
  font: 800 0.9rem var(--jogo);
  box-shadow: 0 3px 0 rgba(150, 110, 60, 0.3), 0 8px 18px rgba(40, 25, 10, 0.2); animation: toast 2.6s ease forwards;
}
.toast.conquista { background: #fff3c4; box-shadow: 0 3px 0 var(--amarela-fundo), 0 8px 18px rgba(40, 25, 10, 0.2); }
@keyframes toast { 0% { opacity: 0; transform: translateY(-6px); } 10%, 80% { opacity: 1; transform: none; } 100% { opacity: 0; } }
.hud { position: fixed; inset: 0; pointer-events: none; overflow: hidden; }
/* mira: um anelzinho branco */
.hud .mira { position: absolute; top: 50%; left: 50%; width: 18px; height: 18px; transform: translate(-50%, -50%); pointer-events: none; }
.hud .mira::before {
  content: ''; position: absolute; top: 1px; left: 1px; width: 12px; height: 12px; border-radius: 50%;
  border: 2.5px solid rgba(255, 255, 255, 0.95); box-shadow: 0 0 0 1px rgba(40, 30, 60, 0.25), inset 0 0 0 1px rgba(40, 30, 60, 0.2);
}
/* chips do alto: som, câmera, nome, mundo e quadros por segundo */
.hud .fps, .hud .som, .hud .camera-indicador {
  position: absolute; padding: 4px 11px; border-radius: 999px;
  background: rgba(255, 250, 240, 0.86); color: var(--tinta); font: 800 0.76rem var(--jogo);
  box-shadow: 0 2px 0 rgba(150, 110, 60, 0.35);
}
.hud .fps { top: 8px; right: 8px; }
.hud .som { top: 8px; left: 8px; }
.hud .camera-indicador { top: 40px; left: 8px; }
`;

const TECLAS: ReadonlyArray<readonly [string, string]> = [
  ['W A S D', 'mover'],
  ['Espaço', 'pular'],
  ['Shift', 'correr'],
  ['Mouse', 'olhar'],
  ['E', 'inventário'],
  ['Esc', 'pausa'],
];

/**
 * Pede o pointer lock do canvas do jogo. No toque (celular/tablet) não faz nada:
 * lá não existe pointer lock e a promessa rejeitada só gera erro no console.
 */
export function travarPonteiro(el: Element | null = document.getElementById('cena')): void {
  if (!el || modoToque()) return;
  try {
    const r = (el as HTMLElement).requestPointerLock?.() as unknown;
    if (r && typeof (r as Promise<void>).catch === 'function') (r as Promise<void>).catch(() => {});
  } catch {
    // navegador recusou (sem gesto do usuário): segue sem travar
  }
}

/** Mostra uma notificação curta no topo da tela. */
export function notificar(
  texto: string,
  nomeIcone?: NomeIcone,
  /** Aviso da própria janela aberta (falta item na troca): aparece mesmo com ela aberta. */
  urgente = false,
): void {
  // com uma janela aberta (inventário, trocas, mapa), o aviso comum espera ela fechar: no
  // celular o painel ocupa quase a tela toda e o aviso cobria o título e os espaços
  if (!urgente && document.body.dataset.overlay) {
    const t0 = performance.now();
    const esperar = () => {
      if (!document.body.dataset.overlay) notificar(texto, nomeIcone);
      else if (performance.now() - t0 < 60_000) setTimeout(esperar, 400);
    };
    setTimeout(esperar, 400);
    return;
  }
  let area = document.querySelector<HTMLElement>('.toast-area');
  if (!area) {
    area = document.createElement('div');
    area.className = 'toast-area';
    area.setAttribute('aria-live', 'polite');
    document.body.appendChild(area);
  }
  const t = document.createElement('div');
  t.className = nomeIcone === 'trofeu' ? 'toast conquista' : 'toast';
  if (nomeIcone) t.append(icone(nomeIcone), ' ');
  t.append(texto);
  area.appendChild(t);
  setTimeout(() => t.remove(), 2700);
  while (area.children.length > 4) area.firstElementChild?.remove();
}

export interface OpcoesInterface {
  repo?: RepositorioMundos;
  mundo?: MetaMundo | null;
  abrirMundo?: (id: string) => void;
  /** Mundo novo já com amigos (spec 011): cria na nuvem e entra com o convite aberto. */
  criarComAmigos?: (meta: MetaMundo, apelido: string) => Promise<void>;
  /** Sugestão para "Seu nome para os amigos" no tema escolhido. */
  sugestaoApelido?: (tema: string) => string;
  config?: GerenciadorConfig;
  salvar?: () => Promise<boolean>;
}

export function criarInterface(
  app: HTMLElement,
  hotbar?: Hotbar,
  opMundo: OpcoesInterface = {},
): {
  entrada: HTMLElement;
  acoes: HTMLElement;
  comecarSemTitulo(): void;
  entrarNoJogo(): void;
} {
  // base de brinquedo (spec 012) primeiro: cores, letras e peças que cada módulo refina
  const estiloBrinquedo = document.createElement('style');
  estiloBrinquedo.textContent = CSS_BRINQUEDO;
  document.head.appendChild(estiloBrinquedo);
  const estilo = document.createElement('style');
  estilo.textContent = CSS + CSS_PIXICONES;
  document.head.appendChild(estilo);

  const hud = document.createElement('div');
  hud.className = 'hud';
  const mira = document.createElement('div');
  mira.className = 'mira';
  const fps = document.createElement('div');
  fps.className = 'fps';
  fps.textContent = '0 FPS';
  const somInd = document.createElement('div');
  somInd.className = 'som';
  somInd.setAttribute('data-audio-indicador', '');
  somInd.textContent = textoIndicador('inativo', false);
  const camInd = document.createElement('div');
  camInd.className = 'camera-indicador';
  camInd.setAttribute('data-camera-indicador', '');
  camInd.textContent = textoIndicadorCamera('primeira');
  hud.append(mira, fps, somInd, camInd);
  // debaixo d'água (spec 012): bolhinhas subindo e faixas de luz, só com body.submerso
  const bolhas = document.createElement('div');
  bolhas.className = 'bolhas-agua';
  bolhas.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < 14; i++) {
    const b = document.createElement('i');
    b.style.left = `${(i * 37) % 100}%`;
    b.style.animationDelay = `${(i * 0.53) % 4}s`;
    b.style.animationDuration = `${3 + ((i * 7) % 5) * 0.6}s`;
    b.style.setProperty('--tam', `${6 + ((i * 5) % 4) * 4}px`);
    bolhas.appendChild(b);
  }
  app.appendChild(bolhas);
  app.appendChild(hud);
  criarBarra(app, hotbar);

  const estiloTitulo = document.createElement('style');
  estiloTitulo.textContent = CSS_TITULO + CSS_TEMAS_UI;
  document.head.appendChild(estiloTitulo);

  // Tela de título: logo em letras gordinhas sobre o panorama do mundo, menu de peças.
  const entrada = document.createElement('div');
  entrada.className = 'entrada';
  const menu = document.createElement('div');
  menu.className = 'titulo-menu';
  const titulo = document.createElement('h1');
  titulo.className = 'titulo-oculto';
  titulo.textContent = 'Terrário';
  const logo = document.createElement('canvas');
  logo.className = 'logo-titulo';
  logo.setAttribute('role', 'img');
  logo.setAttribute('aria-label', 'Terrário');
  desenharLogo(logo, 'TERRÁRIO');
  const sub = document.createElement('p');
  sub.className = 'lema';
  sub.textContent = 'Explore, construa e descubra mundos';
  const botaoJogo = (rotulo: string, nomeIcone: NomeIcone, attr: string, classe = '') => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `botao-jogo ${classe}`.trim();
    b.setAttribute(attr, '');
    const linha = document.createElement('span');
    linha.className = 'linha';
    const ic = icone(nomeIcone);
    ic.classList.add('icone');
    linha.append(ic, rotulo);
    b.appendChild(linha);
    return b;
  };
  const jogar = botaoJogo('Jogar', 'jogar', 'data-jogar-titulo', 'primario');
  const subJogar = document.createElement('span');
  subJogar.className = 'sub';
  subJogar.setAttribute('data-mundo-atual', '');
  jogar.appendChild(subJogar);
  const atualizarCartao = (m: MetaMundo | null | undefined) => {
    const modo = m ? (m.modo === 'criativo' ? 'Criativo' : 'Sobrevivência') : '';
    // mundo da nuvem: deixa claro que é o mundo com os amigos
    subJogar.textContent = m
      ? m.nuvem
        ? `${m.nome} · com amigos · ${modo}`
        : `${m.nome} · ${modo} · ${obterTema(m.tema).nome}`
      : 'Mundo de passagem';
  };
  atualizarCartao(opMundo.mundo);
  const menuBotoes = document.createElement('div');
  menuBotoes.className = 'menu-titulo';
  const dupla = document.createElement('div');
  dupla.className = 'dupla';
  menuBotoes.append(jogar, dupla);
  const acoes = menuBotoes;
  acoes.addEventListener('click', (e) => {
    if (e.target instanceof Element && e.target.closest('[data-jogar-titulo]')) return;
    e.stopPropagation();
  });
  const estiloModal = document.createElement('style');
  estiloModal.textContent = CSS_MODAL + CSS_CONFIG + CSS_PAUSA;
  document.head.appendChild(estiloModal);
  let abrirMundos: (() => void) | null = null;
  let vitrine: ReturnType<typeof criarVitrineTitulo> | null = null;
  if (opMundo.repo) {
    const painelMundos = criarPainelMundos(app, {
      repo: opMundo.repo,
      atual: opMundo.mundo ?? null,
      abrir: (id) => opMundo.abrirMundo?.(id),
      criarComAmigos: opMundo.criarComAmigos,
      sugestaoApelido: opMundo.sugestaoApelido,
    });
    const bMundos = botaoJogo('Mundos', 'globo', 'data-abrir-mundos');
    abrirMundos = () => void painelMundos.abrir();
    bMundos.addEventListener('click', abrirMundos);
    dupla.appendChild(bMundos);
    vitrine = criarVitrineTitulo((id) => void painelMundos.criarComTema(id));
    window.addEventListener('brumaluz:salvo', async () => {
      if (opMundo.mundo) atualizarCartao(await opMundo.repo!.obter(opMundo.mundo.id));
    });
  }
  // entrar no mundo de um amigo pelo código que ele mandou
  const bCodigo = botaoJogo('Entrar com código', 'globo', 'data-entrar-com-codigo');
  bCodigo.addEventListener('click', () =>
    window.dispatchEvent(new CustomEvent('brumaluz:entrarCodigo')),
  );
  const bPersonagem = botaoJogo('Personagem', 'pessoa', 'data-abrir-personagem');
  dupla.appendChild(bPersonagem);
  const painelConfig = opMundo.config ? criarPainelConfig(app, opMundo.config) : null;
  if (painelConfig) {
    const bConfig = botaoJogo('Configurações', 'engrenagem', 'data-abrir-config');
    bConfig.addEventListener('click', () => painelConfig.abrir());
    menuBotoes.appendChild(bConfig);
  }
  menuBotoes.appendChild(bCodigo);
  menu.append(titulo, logo, sub, menuBotoes);
  if (vitrine) menu.appendChild(vitrine.elemento);
  const rodape = document.createElement('div');
  rodape.className = 'rodape-titulo';
  const versao = document.createElement('span');
  versao.textContent = 'Terrário · arte, música e sons gerados por código';
  const lista = document.createElement('ul');
  for (const [tecla, acao] of TECLAS) {
    const item = document.createElement('li');
    const k = document.createElement('kbd');
    k.textContent = tecla;
    item.append(k, ` ${acao}`);
    lista.appendChild(item);
  }
  rodape.append(versao, lista);
  menu.appendChild(rodape);

  // Tela do personagem: prévia em pixel-art à esquerda, opções à direita.
  const telaPersonagem = document.createElement('div');
  telaPersonagem.className = 'tela-personagem';
  telaPersonagem.hidden = true;
  const palco = document.createElement('div');
  palco.className = 'palco-personagem';
  const voltar = botaoJogo('Voltar', 'voltar', 'data-voltar-titulo', 'voltar-titulo');
  const pedestal = document.createElement('div');
  pedestal.className = 'pedestal';
  const previa = document.createElement('canvas');
  previa.setAttribute('data-previa-personagem', '');
  previa.setAttribute('role', 'img');
  previa.setAttribute('aria-label', 'Prévia do personagem');
  pedestal.appendChild(previa);
  const nomePrevia = document.createElement('div');
  nomePrevia.className = 'nome-previa';
  palco.append(voltar, pedestal, nomePrevia);
  telaPersonagem.appendChild(palco);
  telaPersonagem.addEventListener('click', (e) => e.stopPropagation());
  entrada.append(menu, telaPersonagem);
  app.appendChild(entrada);

  function mostrarTela(qual: 'menu' | 'personagem'): void {
    menu.hidden = qual !== 'menu';
    telaPersonagem.hidden = qual !== 'personagem';
  }
  bPersonagem.addEventListener('click', () => mostrarTela('personagem'));
  voltar.addEventListener('click', () => mostrarTela('menu'));
  // Sem HUD por cima do título; volta ao menu quando o título fecha.
  const sincronizarTitulo = () => {
    document.body.classList.toggle('tela-titulo', !entrada.hidden);
    if (entrada.hidden) mostrarTela('menu');
  };
  new MutationObserver(sincronizarTitulo).observe(entrada, {
    attributes: true,
    attributeFilter: ['hidden'],
  });
  sincronizarTitulo();

  /** Tela cheia (se ligada nas configurações). Chamar dentro do clique: precisa do gesto. */
  const telaCheiaAoJogar = () => {
    if (opMundo.config?.atual.telaCheia ?? true) entrarTelaCheia();
  };
  function entrarNoJogo(): void {
    telaCheiaAoJogar();
    entrada.hidden = true;
    travarPonteiro();
  }
  function rotuloNome(a: Aparencia): string {
    return a.nome || rotuloDoModelo(a);
  }
  function armazenamento(): Armazenamento | null {
    try {
      return window.localStorage;
    } catch {
      return null;
    }
  }
  const estiloPainel = document.createElement('style');
  estiloPainel.textContent = CSS_PAINEL;
  document.head.appendChild(estiloPainel);
  const nomeHud = document.createElement('div');
  nomeHud.className = 'camera-indicador';
  nomeHud.style.top = '72px';
  nomeHud.setAttribute('data-nome-jogador', '');
  hud.appendChild(nomeHud);
  const infoMundo = document.createElement('div');
  infoMundo.className = 'camera-indicador';
  infoMundo.style.top = '104px';
  infoMundo.setAttribute('data-info-mundo', '');
  hud.appendChild(infoMundo);
  setInterval(() => {
    const t = window.__brumaluz?.infoMundo ?? '';
    if (infoMundo.textContent !== t) infoMundo.textContent = t;
    if (infoMundo.hidden !== !t) infoMundo.hidden = !t;
  }, 1000);
  const painel = criarPainelPersonagem(telaPersonagem, {
    armazenamento: armazenamento(),
    aoMudar: (a) => {
      nomeHud.textContent = rotuloNome(a);
      nomePrevia.textContent = rotuloNome(a);
      fotografarBoneco(previa, a, 'corpo', 520);
      window.__brumaluz?.personagem?.definir(a);
    },
    aoJogar: entrarNoJogo,
  });
  nomeHud.textContent = rotuloNome(painel.aparencia());
  nomePrevia.textContent = rotuloNome(painel.aparencia());
  fotografarBoneco(previa, painel.aparencia(), 'corpo', 520);

  entrada.addEventListener('click', (e) => {
    if (!telaPersonagem.hidden) return;
    // no toque, rolar o título ou tocar no fundo não entra no jogo: só o botão Jogar
    if (modoToque() && !(e.target instanceof Element && e.target.closest('[data-jogar-titulo]')))
      return;
    entrarNoJogo();
  });
  window.addEventListener('keydown', (e) => {
    if (!teclaParaPainel(e.code) || e.repeat) return;
    if (e.target instanceof HTMLInputElement) return;
    entrada.hidden = false;
    mostrarTela('personagem');
    document.exitPointerLock?.();
  });
  // Pausa: perder o ponteiro durante o jogo abre o menu de pausa (não a tela de título).
  let jogoIniciado = false;
  const canvasJogo = () => document.getElementById('cena');
  const pausa = criarMenuPausa(app, opMundo.mundo?.nome ?? 'Mundo', {
    continuar: () => {
      telaCheiaAoJogar();
      pausa.fechar();
      travarPonteiro(canvasJogo());
    },
    configuracoes: () => painelConfig?.abrir(),
    mundos: () => abrirMundos?.(),
    salvar: async () => {
      const ok = await opMundo.salvar?.();
      notificar(ok ? 'Mundo salvo' : 'Não foi possível salvar agora', ok ? 'ok' : undefined);
    },
    telaInicial: () => {
      pausa.fechar();
      void opMundo.salvar?.();
      entrada.hidden = false;
    },
    amigos: () => {
      pausa.fechar();
      window.dispatchEvent(new CustomEvent('brumaluz:amigos'));
    },
    // botões grandes da pausa: abrem a função como se a tecla fosse apertada
    abrirFuncao: (codigo) => {
      pausa.fechar();
      window.dispatchEvent(new KeyboardEvent('keydown', { code: codigo }));
      // a câmera só alterna: volta direto ao jogo
      if (codigo === 'KeyV') travarPonteiro(canvasJogo());
    },
  });
  // barra de atalhos do HUD (desktop): ícone e tecla de cada função
  const estiloAtalhos = document.createElement('style');
  estiloAtalhos.textContent = CSS_ATALHOS;
  document.head.appendChild(estiloAtalhos);
  const barraAtalhos = criarBarraAtalhos(app, (codigo) => {
    if (codigo === 'Pausa') {
      document.exitPointerLock?.();
      window.dispatchEvent(new CustomEvent('brumaluz:pausar'));
      return;
    }
    window.dispatchEvent(new KeyboardEvent('keydown', { code: codigo }));
  });
  opMundo.config?.ouvir((c) => barraAtalhos.definir(c.mostrarAtalhos));
  window.addEventListener('brumaluz:pausar', () => {
    if (!entrada.hidden || pausa.aberto) return;
    jogoIniciado = true;
    pausa.abrir();
  });
  document.addEventListener('pointerlockchange', () => {
    if (document.pointerLockElement !== null) {
      jogoIniciado = true;
      entrada.hidden = true;
      pausa.fechar();
    } else if (!document.body.dataset.overlay) {
      if (jogoIniciado && entrada.hidden) pausa.abrir();
      else entrada.hidden = false;
    }
  });
  // Esc no jogo com o mouse preso na câmera: solta o mouse (e a pausa abre). Com o Esc travado
  // em tela cheia o navegador não solta sozinho, então o jogo solta.
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Escape' && document.pointerLockElement && !document.body.dataset.overlay)
      document.exitPointerLock?.();
  });
  window.addEventListener('keydown', (e) => {
    if (e.code !== 'Escape' || !pausa.aberto) return;
    if (document.querySelector('.modal-fundo:not([hidden])')) return;
    pausa.fechar();
    travarPonteiro(canvasJogo());
  });
  opMundo.config?.ouvir((c) => {
    fps.hidden = !c.mostrarFps;
    document.documentElement.style.setProperty('--escala-ui', String(c.escalaInterface));
    for (const el of document.querySelectorAll<HTMLElement>('.hud, .barra, .nome-item')) {
      el.style.setProperty('--escala-ui', String(c.escalaInterface));
    }
  });
  window.addEventListener('brumaluz:toast', (e) => notificar((e as CustomEvent<string>).detail));
  const painelConstrucao = document.createElement('div');
  painelConstrucao.className = 'painel-construcao';
  painelConstrucao.hidden = true;
  painelConstrucao.setAttribute('data-painel-construcao', '');
  app.appendChild(painelConstrucao);
  window.addEventListener('brumaluz:construcao', (e) => {
    const d = (e as CustomEvent<{ ferramenta: string | null; detalhe: string; espelho: boolean }>)
      .detail;
    painelConstrucao.hidden = !d.ferramenta && !d.espelho;
    painelConstrucao.replaceChildren();
    painelConstrucao.append(
      icone('martelo'),
      ` ${d.ferramenta ?? 'Construção livre'}${d.espelho ? ' · espelho' : ''}`,
    );
    const s = document.createElement('small');
    // no toque não há teclado: só o detalhe da ferramenta
    if (modoToque()) s.textContent = d.ferramenta ? d.detalhe : 'Espelho ligado';
    else
      s.textContent = d.ferramenta
        ? `${d.detalhe} · B troca · Ctrl+Z desfaz`
        : 'N desliga o espelho';
    painelConstrucao.appendChild(s);
  });

  // só escreve no DOM quando o texto muda (evita layout a cada tique)
  const escrever = (el: HTMLElement, t: string) => {
    if (el.textContent !== t) el.textContent = t;
  };
  setInterval(() => {
    if (fps.hidden) return;
    escrever(fps, `${Math.round(window.__brumaluz?.fps ?? 0)} FPS`);
  }, 500);
  setInterval(() => {
    const a = window.__brumaluz?.audio;
    escrever(somInd, textoIndicador((a?.estado ?? 'inativo') as EstadoAudio, a?.mudo ?? false));
    escrever(camInd, textoIndicadorCamera(window.__brumaluz?.camera?.modo() ?? 'primeira'));
  }, 200);
  return {
    entrada,
    acoes,
    /**
     * Mundo com amigos (spec 011): a criança já escolheu entrar, então o jogo começa sem a
     * tela de título nem um segundo "Jogar". O mouse prende no primeiro clique no mundo.
     */
    comecarSemTitulo() {
      jogoIniciado = true;
      entrada.hidden = true;
    },
    /** Dentro de um toque (o "Começar a jogar" do convite): tela cheia e mouse preso. */
    entrarNoJogo() {
      jogoIniciado = true;
      entrarNoJogo();
    },
  };
}
