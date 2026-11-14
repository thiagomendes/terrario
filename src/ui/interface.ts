import { fotografarBoneco } from '../render/fotoBoneco';
import { CSS_BRINQUEDO } from './brinquedo';
import { CSS_TEMAS_UI, criarVitrineTitulo } from './temasUi';
import { obterTema } from '../temas';
import { CSS_ATALHOS } from './atalhos';
import type { Hotbar } from '../player/hotbar';
import { criarBarra } from './barra';
import { textoIndicador } from '../audio/ligador';
import type { EstadoAudio } from '../audio/motor';
import { rotuloDoModelo, type Aparencia } from '../personagem/aparencia';
import { rotuloDaFantasia } from '../personagem/fantasias';
import { festejarNoPalco, podeVestirFantasia } from './abaFantasias';
import { tocarSomInterface } from '../audio/somInterface';
import { perguntar } from './dialogo';
import {
  CHAVE_TESTAR,
  fantasiaParaSugerir,
  marcarSugerida,
  perguntaDaSugestao,
} from './sugestaoFantasia';
import type { Armazenamento } from '../personagem/persistencia';
import { CSS_PAINEL, criarPainelPersonagem, teclaParaPainel } from './personagem';
import type { FonteTesouros } from './meusTesouros';
import { criarPerfilCrianca, type PerfilCrianca } from '../personagem/almaCrianca';
import { EVENTO_LOJINHA } from './alma';
import { CSS_MODAL, criarPainelMundos } from './mundos';
import { CSS_PIXICONES, icone, modoToque, type NomeIcone } from './pixicones';
import { CSS_TITULO, desenharLogo, desenharPrevia } from './titulo';
import { CSS_CONFIG, criarPainelConfig } from './configuracoes';
import { CSS_PAUSA, criarMenuPausa } from './pausa';
import { entrarTelaCheia, telaCheiaNoPrimeiroToque } from './telaCheia';
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
  /* avisos no alto, embaixo dos botões e ao lado do minimapa (antes no meio da tela, onde
     tapavam o jogo); letra menor e no máximo dois à vista */
  .toast-area {
    top: calc(env(safe-area-inset-top, 0px) + 62px); left: 8px; right: 142px; transform: none;
    width: auto; max-width: none;
  }
  .toast-area > .toast { padding: 6px 12px; font-size: 0.8rem; }
  .toast-area > :nth-last-child(n + 3) { display: none; }
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
.coleta-area {
  position: fixed; top: 44px; left: 50%; transform: translateX(-50%); z-index: 50;
  display: grid; gap: 4px; justify-items: center; pointer-events: none;
  width: max-content; max-width: min(420px, calc(100vw - 24px));
}
/* o que a criança pegou: pílulas pequenas no alto (antes era no meio da tela e pulava na frente) */
.toast.coleta {
  padding: 3px 12px; font-size: 0.78rem; background: rgba(255, 250, 240, 0.86);
  box-shadow: 0 2px 0 rgba(150, 110, 60, 0.25); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%;
}
body[data-overlay] .coleta-area, body.tela-titulo .coleta-area { display: none; }
/* no computador e no celular deitado, duas à vista (logo abaixo ficam os outros avisos) */
.coleta-area > :nth-last-child(n + 3) { display: none; }
@media (max-width: 560px) {
  /* retrato: no alto, entre os botões da esquerda e o minimapa */
  .coleta-area { top: calc(env(safe-area-inset-top, 0px) + 12px); max-width: calc(100vw - 250px); }
  .coleta-area > :nth-last-child(n + 3) { display: block; }
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
/* chips do alto: som, nome, mundo e quadros por segundo */
.hud .fps, .hud .som, .hud .chip-hud {
  position: absolute; padding: 4px 11px; border-radius: 999px;
  background: rgba(255, 250, 240, 0.86); color: var(--tinta); font: 800 0.76rem var(--jogo);
  box-shadow: 0 2px 0 rgba(150, 110, 60, 0.35);
}
.hud .fps { top: 8px; right: 8px; }
/* correção de 12 nov: quadros e nitidez, no alto e no meio (à vista também no celular).
 * No computador fica logo abaixo da bússola (alto 10px + 28px), que senão o cobria;
 * no celular estreito a bússola some e ele volta para o alto. */
.hud .nitidez {
  position: absolute; top: calc(env(safe-area-inset-top, 0px) + 44px); left: 50%; transform: translateX(-50%);
  padding: 2px 9px; border-radius: 999px; background: rgba(20, 16, 40, 0.72); color: #fff;
  font: 700 0.7rem ui-monospace, SFMono-Regular, Menlo, monospace; white-space: nowrap; z-index: 2;
}
@media (max-width: 560px) { .hud .nitidez { top: calc(env(safe-area-inset-top, 0px) + 4px); } }
.hud .som { top: 8px; left: 8px; }
.hud .chip-hud { top: 40px; left: 8px; }
`;

/**
 * O selinho de quadros e nitidez (correção de 12 nov): "58 FPS · nitidez 1,33 de 3 ·
 * 520×1126 · efeitos −1". A nitidez é quantos pixels o jogo desenha por pixel de CSS (1 é o
 * de antes da 017; a tela do iPhone tem 3); "efeitos −n", quantos efeitos o celular tirou.
 */
export function textoNitidez(
  e: { fps?: number; escalaResolucao?: number; alivioEfeitos?: number } | undefined,
  densidadeTela: number,
  tamanho: [number, number] | null,
): string {
  const num = (v: number) => (Math.round(v * 100) / 100).toString().replace('.', ',');
  const partes = [`${Math.round(e?.fps ?? 0)} FPS`];
  const escala = e?.escalaResolucao ?? 1;
  partes.push(`nitidez ${num(1 / escala)} de ${num(densidadeTela)}`);
  if (tamanho) partes.push(`${tamanho[0]}×${tamanho[1]}`);
  const alivio = e?.alivioEfeitos ?? 0;
  partes.push(alivio > 0 ? `efeitos −${alivio}` : 'efeitos todos');
  return partes.join(' · ');
}

const TECLAS: ReadonlyArray<readonly [string, string]> = [
  ['W A S D', 'mover'],
  ['Espaço', 'pular'],
  ['Shift', 'correr'],
  ['Mouse', 'olhar'],
  ['E', 'inventário'],
  ['O', 'menu'],
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
  // o mesmo aviso já à vista (a criança tentou de novo): fica mais um pouco, sem repetir
  const igual = [...area.children].find((c) => (c as HTMLElement).dataset.texto === texto) as
    | HTMLElement
    | undefined;
  if (igual) {
    const d = duracaoDoAviso(texto);
    igual.style.animation = 'none';
    void igual.offsetWidth;
    igual.style.animation = '';
    igual.style.animationDuration = `${d}s`;
    clearTimeout(Number(igual.dataset.timer ?? 0));
    igual.dataset.timer = String(window.setTimeout(() => igual.remove(), d * 1000 + 100));
    return;
  }
  const t = document.createElement('div');
  t.dataset.texto = texto;
  t.className = nomeIcone === 'trofeu' ? 'toast conquista' : 'toast';
  if (nomeIcone) t.append(icone(nomeIcone), ' ');
  t.append(texto);
  // tempo para uma criança ler: frase curta 2,6 s, frase longa até 6 s
  const duracao = duracaoDoAviso(texto);
  t.style.animationDuration = `${duracao}s`;
  area.appendChild(t);
  t.dataset.timer = String(window.setTimeout(() => t.remove(), duracao * 1000 + 100));
  while (area.children.length > 4) area.firstElementChild?.remove();
}

/** Um aviso de coleta ("+2 Grão de milho")? Esses vão para o alto, pequenos. */
export function ehAvisoDeColeta(texto: string): boolean {
  return /^\+\d+ \S/.test(texto);
}

/**
 * Mostra o que a criança pegou no alto da tela, numa pílula pequena. Pegar de novo o mesmo item
 * soma na pílula que já está lá (em vez de empilhar outra), e no máximo 3 ficam à vista.
 */
export function notificarColeta(texto: string): void {
  const m = /^\+(\d+) (.+)$/.exec(texto);
  if (!m) return notificar(texto);
  const qtd = Number(m[1]);
  const nome = m[2];
  let area = document.querySelector<HTMLElement>('.coleta-area');
  if (!area) {
    area = document.createElement('div');
    area.className = 'coleta-area';
    area.setAttribute('aria-live', 'polite');
    document.body.appendChild(area);
  }
  const ja = [...area.children].find((c) => (c as HTMLElement).dataset.nome === nome) as
    | HTMLElement
    | undefined;
  const t = ja ?? document.createElement('div');
  const total = (ja ? Number(t.dataset.qtd) : 0) + qtd;
  t.className = 'toast coleta';
  t.dataset.nome = nome;
  t.dataset.qtd = String(total);
  t.textContent = `+${total} ${nome}`;
  const duracao = 2.6;
  // reinicia a animação (somou de novo: fica mais um pouco)
  t.style.animation = 'none';
  void t.offsetWidth;
  t.style.animation = '';
  t.style.animationDuration = `${duracao}s`;
  if (!ja) area.appendChild(t);
  clearTimeout(Number(t.dataset.timer ?? 0));
  t.dataset.timer = String(window.setTimeout(() => t.remove(), duracao * 1000 + 100));
  while (area.children.length > 3) area.firstElementChild?.remove();
}

export interface OpcoesInterface {
  repo?: RepositorioMundos;
  mundo?: MetaMundo | null;
  abrirMundo?: (id: string) => void;
  /** Mundo novo já com amigos (spec 011): cria na nuvem e entra com o convite aberto. */
  criarComAmigos?: (meta: MetaMundo, apelido: string) => Promise<void>;
  /** Sugestão para "Seu nome para os amigos" no tema escolhido. */
  sugestaoApelido?: (tema: string) => string;
  levarParaAmigos?: (meta: MetaMundo) => Promise<void>;
  pararComAmigos?: (meta: MetaMundo) => Promise<void>;
  config?: GerenciadorConfig;
  salvar?: () => Promise<boolean>;
  /**
   * Spec 017: a criança acabou de criar este mundo (a sugestão de fantasia aparece uma vez).
   * `id` é o mundo do aparelho onde a sugestão fica lembrada.
   */
  mundoNovo?: { id: string };
}

/**
 * Celular em pé (spec 011, T08): o canto esquerdo de cima vira um botão redondo. As pílulas
 * (som, câmera, nome, dia e clima) e a missão só aparecem quando a criança toca nele.
 */
const CSS_HUD_COMPACTO = `
.hud-info { display: none; }
body.hud-compacto .hud-info, body.hud-botao-info .hud-info {
  display: grid; place-items: center; position: fixed; z-index: 7; top: calc(8px + env(safe-area-inset-top)); left: calc(8px + env(safe-area-inset-left));
  width: 44px; height: 44px; padding: 0; border: 0; border-radius: 50%; cursor: pointer;
  background: rgba(255, 250, 240, 0.95); box-shadow: 0 3px 0 rgba(150, 110, 60, 0.35), 0 6px 12px rgba(40, 25, 10, 0.2);
}
body.hud-compacto .hud-info svg, body.hud-botao-info .hud-info svg { width: 30px; height: 30px; }
body.hud-compacto .hud-info:focus-visible, body.hud-botao-info .hud-info:focus-visible { outline: 3px solid var(--azul); outline-offset: 2px; }
body.hud-compacto:not(.hud-aberto) .hud .som,
body.hud-compacto:not(.hud-aberto) .hud .chip-hud,
body.hud-compacto:not(.hud-aberto) .missao-hud { display: none; }
/* spec 015: computador e tablet também têm o botão (ao lado, o da roda); ele guarda só as
   pílulas, e o cartão da missão fica sempre à vista, logo abaixo dos botões */
body.hud-botao-info:not(.hud-aberto) .hud .som,
body.hud-botao-info:not(.hud-aberto) .hud .chip-hud { display: none; }
body.hud-botao-info:not(.hud-compacto):not(.hud-aberto) .missao-hud { top: 60px; }
body.hud-botao-info.hud-aberto .hud .som { top: 58px; }
body.hud-botao-info.hud-aberto .hud [data-nome-jogador] { top: 90px !important; }
body.hud-botao-info.hud-aberto .hud [data-info-mundo] { top: 122px !important; }
body.hud-botao-info.hud-aberto .missao-hud { top: 156px; }
/* aberto: as pílulas descem logo abaixo do botão */
body.hud-compacto.hud-aberto .hud .som { top: 58px; }
body.hud-compacto.hud-aberto .hud [data-nome-jogador] { top: 90px !important; }
body.hud-compacto.hud-aberto .hud [data-info-mundo] { top: 122px !important; }
body.hud-compacto.hud-aberto .missao-hud { top: 156px; }
/* informações abertas: os avisos descem para baixo do cartão da missão (não o cobrem) */
body.hud-compacto.hud-aberto:not([data-overlay]) .toast-area { top: 272px; }
body[data-overlay] .hud-info, body.tela-titulo .hud-info, body.modo-foto .hud-info { display: none !important; }
`;

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
  const nitidez = document.createElement('div');
  nitidez.className = 'nitidez';
  nitidez.setAttribute('data-nitidez', '');
  nitidez.hidden = true;
  hud.append(mira, fps, somInd, nitidez);
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
      levarParaAmigos: opMundo.levarParaAmigos,
      pararComAmigos: opMundo.pararComAmigos,
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
  // spec 019: a música e as vozes agora são gravadas (créditos em Configurações → Áudio)
  versao.textContent =
    'Terrário · arte e efeitos por código, música e vozes gravadas (créditos em Configurações → Áudio)';
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
    // spec 023: o que ela veste pode ter mudado com o editor fechado (e a prateleira só tira
    // as fotos à vista)
    if (qual === 'personagem') aoAbrirEditor?.();
  }
  let aoAbrirEditor: (() => void) | undefined;
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
    // sem nome escrito, a fantasia vestida dá o nome ("Princesa das Flores")
    return a.nome || (a.fantasia && rotuloDaFantasia(a.fantasia, a.corpo)) || rotuloDoModelo(a);
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
  nomeHud.className = 'chip-hud';
  nomeHud.style.top = '40px';
  nomeHud.setAttribute('data-nome-jogador', '');
  hud.appendChild(nomeHud);
  const infoMundo = document.createElement('div');
  infoMundo.className = 'chip-hud';
  infoMundo.style.top = '72px';
  infoMundo.setAttribute('data-info-mundo', '');
  hud.appendChild(infoMundo);
  setInterval(() => {
    const t = window.__brumaluz?.infoMundo ?? '';
    if (infoMundo.textContent !== t) infoMundo.textContent = t;
    if (infoMundo.hidden !== !t) infoMundo.hidden = !t;
  }, 1000);
  // celular em pé (spec 011, T08): as informações da esquerda recolhem num botão redondo;
  // um toque mostra tudo (som, câmera, nome, dia e clima, missão) e fecha sozinho depois
  const estiloCompacto = document.createElement('style');
  estiloCompacto.textContent = CSS_HUD_COMPACTO;
  document.head.appendChild(estiloCompacto);
  const botaoInfo = document.createElement('button');
  botaoInfo.type = 'button';
  botaoInfo.className = 'hud-info';
  botaoInfo.setAttribute('data-hud-info', '');
  botaoInfo.setAttribute('aria-label', 'Mostrar as informações do jogo');
  botaoInfo.setAttribute('aria-expanded', 'false');
  botaoInfo.innerHTML =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="#ffd45a"/><circle cx="12" cy="7.2" r="1.7" fill="#5a3a12"/><rect x="10.4" y="10.2" width="3.2" height="8" rx="1.6" fill="#5a3a12"/></svg>';
  app.appendChild(botaoInfo);
  let fecharInfo: ReturnType<typeof setTimeout> | undefined;
  const mostrarInfo = (v: boolean) => {
    document.body.classList.toggle('hud-aberto', v);
    botaoInfo.setAttribute('aria-expanded', String(v));
    botaoInfo.setAttribute(
      'aria-label',
      v ? 'Esconder as informações do jogo' : 'Mostrar as informações do jogo',
    );
    clearTimeout(fecharInfo);
    if (v) fecharInfo = setTimeout(() => mostrarInfo(false), 6000);
  };
  botaoInfo.addEventListener('click', (e) => {
    e.stopPropagation();
    mostrarInfo(!document.body.classList.contains('hud-aberto'));
  });
  // compacto no celular em pé (tela mais alta que larga e estreita): pílulas e missão no
  // botão. Spec 015 (opção C do menu): nos outros aparelhos o botão também existe (ao lado
  // fica o da roda), mas guarda só as pílulas; a missão fica sempre à vista
  document.body.classList.add('hud-botao-info');
  const emPe = window.matchMedia('(orientation: portrait) and (max-width: 700px)');
  let eraCompacto: boolean | null = null;
  const ajustarCompacto = () => {
    const compacto = emPe.matches && document.body.classList.contains('toque-ativo');
    if (compacto === eraCompacto) return;
    eraCompacto = compacto;
    document.body.classList.toggle('hud-compacto', compacto);
    mostrarInfo(false);
  };
  emPe.addEventListener?.('change', ajustarCompacto);
  new MutationObserver(ajustarCompacto).observe(document.body, {
    attributes: true,
    attributeFilter: ['class'],
  });
  ajustarCompacto();
  /**
   * Auditoria 017: cada `definir` refaz o boneco e manda a aparência aos amigos. Um toque vai
   * na hora; digitando o nome, espera a criança parar (`ESPERA_NOME` ms) e manda só o último.
   */
  const ESPERA_NOME = 300;
  let vestida: Aparencia | null = null;
  let esperaNome: ReturnType<typeof setTimeout> | undefined;
  const vestir = (a: Aparencia) => {
    vestida = a;
    // `definir` junta com a aparência de antes: sem fantasia tem que ir explícito
    // idem para os tesouros da lojinha: `a` já vem com os que ela veste agora (o perfil)
    window.__brumaluz?.personagem?.definir({ ...a, fantasia: a.fantasia, premium: a.premium });
  };
  function vestirNoJogo(a: Aparencia): void {
    clearTimeout(esperaNome);
    esperaNome = undefined;
    const soNome =
      vestida !== null &&
      vestida.nome !== a.nome &&
      JSON.stringify({ ...vestida, nome: '' }) === JSON.stringify({ ...a, nome: '' });
    if (soNome) esperaNome = setTimeout(() => vestir(a), ESPERA_NOME);
    else vestir(a);
  }
  /**
   * Spec 023: os tesouros da lojinha moram no perfil da criança (o do jogo, quando o mundo já
   * abriu; antes, um que lê o mesmo guardado). Vestir aqui é o mesmo caminho da lojinha: o
   * perfil avisa, o boneco do jogo veste com o puf e os amigos recebem a aparência.
   */
  let perfilLocal: PerfilCrianca | null = null;
  const perfilAlma = (): PerfilCrianca =>
    (window as unknown as { __almaCrianca?: PerfilCrianca }).__almaCrianca ??
    (perfilLocal ??= criarPerfilCrianca(armazenamento()));
  const tesouros: FonteTesouros = {
    perfil: () => perfilAlma().perfil,
    vestir: (id, vestir) => {
      perfilAlma().vestirPremium(id, vestir);
      painel.atualizarTesouros();
    },
    temLojinha: () => !!(window as unknown as { __almaUi?: unknown }).__almaUi,
    abrirLojinha: () => {
      // a lojinha abre por cima do jogo: o editor sai da frente (sem prender o mouse)
      telaCheiaAoJogar();
      entrada.hidden = true;
      window.dispatchEvent(new CustomEvent(EVENTO_LOJINHA));
    },
  };
  const mostrarPrevia = (a: Aparencia) => {
    nomeHud.textContent = rotuloNome(a);
    nomePrevia.textContent = rotuloNome(a);
    fotografarBoneco(previa, a, 'corpo', 520);
  };
  const painel = criarPainelPersonagem(telaPersonagem, {
    armazenamento: armazenamento(),
    temaDoMundo: opMundo.mundo ? (opMundo.mundo.tema ?? 'bruma-e-luz') : undefined,
    aoFestejar: () => festejarNoPalco(pedestal),
    aoMudar: (a) => {
      mostrarPrevia(a);
      vestirNoJogo(a);
    },
    aoVer: mostrarPrevia,
    tesouros,
    aoJogar: entrarNoJogo,
  });
  mostrarPrevia(painel.aparenciaVista());
  aoAbrirEditor = () => painel.atualizarTesouros();
  // comprou, vestiu ou tirou na lojinha (ou o perfil do jogo chegou): o editor mostra igual
  window.addEventListener('brumaluz:almaPerfil', (e) => {
    const tipo = (e as CustomEvent<{ aviso?: { tipo?: string } }>).detail?.aviso?.tipo;
    if (tipo === 'premium') painel.atualizarTesouros();
  });

  // Spec 014: prêmio do canteiro da cidade (o núcleo decidiu; a cena avisa). Grava com o
  // personagem, faz a festa da 017 e não veste sozinho: a criança escolhe na aba Fantasias.
  const GANHOU: Record<string, string> = {
    'capacete-obra': 'Ganhou o capacete de obra!',
    'colete-obra': 'Ganhou o colete laranja!',
    // spec 023: os prêmios das missões do Rancho Alegre
    caipira: 'Ganhou a roupa caipira da festa!',
    'peao-campeao': 'Ganhou a roupa de peão campeão!',
  };
  window.addEventListener('brumaluz:desbloqueio', (e) => {
    const d = (e as CustomEvent<{ id?: unknown; festa?: unknown }>).detail;
    const id = d?.id;
    if (typeof id !== 'string' || !GANHOU[id]) return;
    if (!painel.desbloquear(id)) return;
    festejarNoPalco(pedestal);
    // spec 023: o prêmio da missão já tem a festa da alma (com a fantasia no boneco)
    if (d.festa === true) return;
    notificar(GANHOU[id], 'trofeu');
    tocarSomInterface('conquista');
  });
  // spec 023: "vestir agora" na festa da missão (só a que já foi ganha; grava com a aparência)
  window.addEventListener('brumaluz:vestirFantasia', (e) => {
    const id = (e as CustomEvent<{ id?: unknown }>).detail?.id;
    if (typeof id !== 'string' || !podeVestirFantasia(id, painel.aparencia())) return;
    painel.vestir(id);
  });
  (window as unknown as { __desbloqueios?: () => string[] }).__desbloqueios = () => [
    ...(painel.aparencia().desbloqueios ?? []),
  ];

  /** Abre o editor na aba Fantasias (de dentro do jogo também: como a tecla C). */
  function abrirEditorNasFantasias(): void {
    entrada.hidden = false;
    mostrarTela('personagem');
    document.exitPointerLock?.();
    painel.abrirFantasias('temas');
  }
  // Spec 017 (T05): mundo recém-criado sugere uma vez a fantasia do tema dele
  if (opMundo.mundo && opMundo.mundoNovo) {
    const loja = armazenamento();
    const idSugestao = opMundo.mundoNovo.id;
    const tema = opMundo.mundo.tema;
    // nos testes de tela a sugestão só aparece quando o teste pede (os outros fluxos seguem)
    let testando = false;
    try {
      testando = navigator.webdriver && loja?.getItem(CHAVE_TESTAR) !== '1';
    } catch {
      testando = navigator.webdriver;
    }
    const def = testando
      ? undefined
      : fantasiaParaSugerir(loja, idSugestao, true, tema, painel.aparencia());
    if (!def && !testando) marcarSugerida(loja, idSugestao);
    // spec 023: o quadro de missões (primeira visita) espera a sugestão passar
    if (def) document.body.dataset.sugestaoPendente = '1';
    // espera o mundo aberto e jogável: pronto, sem título, editor, carregamento, pausa ou
    // outro diálogo por cima (o convite só aparece com a criança já dentro do mundo)
    const livre = () =>
      window.__brumaluz?.ready === true &&
      entrada.hidden &&
      telaPersonagem.hidden &&
      !pausa.aberto &&
      !document.body.dataset.overlay &&
      !document.querySelector('[data-dialogo], .modal-fundo:not([hidden])');
    /** Desde quando está livre (o convite espera um instante, não pula no clique de Jogar). */
    let livreDesde = 0;
    const ESPERA_NO_MUNDO_MS = 1200;
    const sugerir = async () => {
      if (!def) return;
      if (!livre()) {
        livreDesde = 0;
        setTimeout(() => void sugerir(), 300);
        return;
      }
      if (!livreDesde) livreDesde = performance.now();
      if (performance.now() - livreDesde < ESPERA_NO_MUNDO_MS) {
        setTimeout(() => void sugerir(), 300);
        return;
      }
      marcarSugerida(loja, idSugestao);
      // no computador o mouse está preso na câmera: solta sem abrir a pausa (o diálogo é a
      // camada por cima) e prende de novo no "Agora não"
      const estavaPreso = !!document.pointerLockElement;
      document.body.dataset.overlay = 'sugestao-fantasia';
      if (estavaPreso) document.exitPointerLock?.();
      // o boneco da criança já vestido com a fantasia, na foto do diálogo
      const foto = document.createElement('canvas');
      foto.className = 'foto-sugestao';
      foto.style.height = '150px';
      foto.setAttribute('aria-hidden', 'true');
      const a = painel.aparencia();
      fotografarBoneco(foto, { ...a, fantasia: { id: def.id, cor: 0 } }, 'corpo', 300);
      const sim = await perguntar({
        titulo: perguntaDaSugestao(tema),
        texto: `${rotuloDaFantasia(def, a.corpo)}. Dá para tirar quando quiser.`,
        confirmar: 'Sim',
        cancelar: 'Agora não',
        figura: foto,
        marca: 'sugestao-fantasia',
      });
      if (document.body.dataset.overlay === 'sugestao-fantasia')
        delete document.body.dataset.overlay;
      delete document.body.dataset.sugestaoPendente;
      if (sim !== true) {
        // dentro do clique do botão: volta a jogar com o mouse preso, como estava
        if (estavaPreso) {
          travarPonteiro(canvasJogo());
          // fechou pelo Esc (sem clique, o navegador não prende de novo): a pausa aparece,
          // como quando o mouse solta no meio do jogo
          setTimeout(() => {
            if (!document.pointerLockElement && !document.body.dataset.overlay && entrada.hidden)
              window.dispatchEvent(new CustomEvent('brumaluz:pausar'));
          }, 400);
        }
        return;
      }
      abrirEditorNasFantasias();
      painel.vestir(def.id);
    };
    // começa depois de montar a interface inteira (a pausa vem logo abaixo)
    setTimeout(() => void sugerir(), 0);
  }

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
    // spec 016: a saída de quem ficou cercado (o núcleo leva para a cama ou o nascer)
    voltarCasa: () => {
      telaCheiaAoJogar();
      pausa.fechar();
      travarPonteiro(canvasJogo());
      window.dispatchEvent(new CustomEvent('brumaluz:voltarCasa'));
    },
    // botões grandes da pausa: abrem a função como se a tecla fosse apertada
    abrirFuncao: (codigo) => {
      pausa.fechar();
      window.dispatchEvent(new KeyboardEvent('keydown', { code: codigo }));
    },
  });
  // spec 015 (opção C do menu, em todo aparelho): a barra de atalhos de baixo saiu; o menu
  // fica na roda do botão de cima e a mochila embaixo do minimapa (src/ui/menuRoda.ts)
  const estiloAtalhos = document.createElement('style');
  estiloAtalhos.textContent = CSS_ATALHOS;
  document.head.appendChild(estiloAtalhos);
  // a opção de antes ("barra de atalhos") passa a ligar os selinhos de tecla
  opMundo.config?.ouvir((c) => document.body.classList.toggle('sem-teclas', !c.mostrarAtalhos));
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
    } else if (!document.body.dataset.overlay && !document.body.dataset.solto) {
      // (`data-solto`: a roda do menu aberta pelo O soltou o mouse; fechar prende de novo)
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
    nitidez.hidden = !c.mostrarNitidez;
    document.documentElement.style.setProperty('--escala-ui', String(c.escalaInterface));
    for (const el of document.querySelectorAll<HTMLElement>('.hud, .barra, .nome-item')) {
      el.style.setProperty('--escala-ui', String(c.escalaInterface));
    }
  });
  window.addEventListener('brumaluz:toast', (e) => {
    const texto = (e as CustomEvent<string>).detail;
    if (ehAvisoDeColeta(texto)) notificarColeta(texto);
    else notificar(texto);
  });
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
    if (nitidez.hidden) return;
    const c = document.getElementById('cena') as HTMLCanvasElement | null;
    escrever(
      nitidez,
      textoNitidez(window.__brumaluz, window.devicePixelRatio || 1, c ? [c.width, c.height] : null),
    );
  }, 500);
  setInterval(() => {
    const a = window.__brumaluz?.audio;
    escrever(somInd, textoIndicador((a?.estado ?? 'inativo') as EstadoAudio, a?.mudo ?? false));
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
      // sem toque não dá para pedir tela cheia: ela entra no primeiro toque no jogo
      telaCheiaNoPrimeiroToque(() => opMundo.config?.atual.telaCheia ?? true);
    },
    /** Dentro de um toque (o "Começar a jogar" do convite): tela cheia e mouse preso. */
    entrarNoJogo() {
      jogoIniciado = true;
      entrarNoJogo();
    },
  };
}

/** Segundos que um aviso fica na tela: cresce com o tamanho da frase (crianças leem devagar). */
export function duracaoDoAviso(texto: string): number {
  return Math.min(6, Math.max(2.6, 1.2 + texto.length * 0.07));
}
