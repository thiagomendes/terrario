import type { Hotbar } from '../player/hotbar';
import { criarBarra } from './barra';
import { textoIndicador } from '../audio/ligador';
import type { EstadoAudio } from '../audio/motor';
import { textoIndicador as textoIndicadorCamera } from '../player/camera';
import { MODELOS, type Aparencia } from '../personagem/aparencia';
import type { Armazenamento } from '../personagem/persistencia';
import { CSS_PAINEL, criarPainelPersonagem, teclaParaPainel } from './personagem';
import { CSS_MODAL, criarPainelMundos } from './mundos';
import type { MetaMundo, RepositorioMundos } from '../jogo/mundos';

const CSS = `
.entrada {
  position: fixed;
  inset: 0;
  z-index: 20;
  overflow-y: auto;
  box-sizing: border-box;
  padding: clamp(16px, 4vh, 48px) 16px;
  cursor: pointer;
  color: #ece6da;
  font-family: system-ui, 'Segoe UI', sans-serif;
  background:
    radial-gradient(ellipse at 30% 40%, rgba(10, 12, 24, 0.15), rgba(8, 10, 18, 0.72) 70%),
    linear-gradient(180deg, rgba(8, 10, 18, 0.1), rgba(8, 10, 18, 0.55));
}
.entrada[hidden] { display: none; }
.entrada-grade {
  min-height: 100%;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  align-items: center;
  justify-items: center;
  gap: clamp(16px, 3vh, 32px);
  max-width: 1280px;
  margin: 0 auto;
}
@media (min-width: 1000px) {
  .entrada-grade { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); justify-items: stretch; }
}
.coluna-titulo {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: clamp(8px, 2vh, 16px);
  text-align: center;
}
.entrada h1 {
  margin: 0;
  font-size: clamp(2.8rem, 11vw, 6.2rem);
  font-weight: 900;
  letter-spacing: 0.06em;
  color: #ffe2a8;
  text-shadow: 0 0 32px rgba(255, 186, 96, 0.55), 0 4px 0 #6b3d14, 0 8px 22px rgba(0, 0, 0, 0.6);
}
.entrada .subtitulo {
  margin: 0;
  font-size: clamp(1rem, 3.2vw, 1.35rem);
  color: #e8e1f4;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.6);
}
.cartao-atual {
  width: min(420px, 100%);
  aspect-ratio: 16 / 7;
  position: relative;
  border-radius: 14px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.18);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.45);
  background: linear-gradient(160deg, #5a8fd6, #f5c28a 70%, #3d7a2c 71%) center / cover;
  text-align: left;
}
.cartao-atual::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, transparent 35%, rgba(0, 0, 0, 0.72));
}
.cartao-atual .info { position: absolute; left: 14px; right: 14px; bottom: 10px; z-index: 1; }
.cartao-atual .rotulo { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.12em; color: #cfc8bb; }
.cartao-atual .nome { font-size: 1.25rem; font-weight: 800; color: #fff; }
.entrada .instrucao {
  margin: 0;
  padding: 14px clamp(28px, 7vw, 56px);
  border: 1px solid #ffc46b;
  border-radius: 999px;
  background: linear-gradient(180deg, #ffcf7a, #f0a94a);
  color: #2a1a08;
  font-size: clamp(1.1rem, 4vw, 1.4rem);
  font-weight: 800;
  box-shadow: 0 8px 24px rgba(240, 169, 74, 0.35);
  animation: pulsar 2.4s ease-in-out infinite;
}
@keyframes pulsar { 50% { box-shadow: 0 8px 36px rgba(255, 196, 107, 0.65); } }
.acoes-entrada { display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; }
.entrada ul {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px 14px;
  margin: 4px 0 0;
  padding: 0;
  max-width: 100%;
  list-style: none;
  font-size: clamp(0.8rem, 2.6vw, 0.92rem);
  color: #d8d2c6;
}
.entrada kbd {
  padding: 2px 8px;
  border: 1px solid rgba(255, 255, 255, 0.25);
  border-bottom-width: 3px;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.35);
  color: #ffe2a8;
  font-family: inherit;
  font-weight: 700;
}
.toast-area {
  position: fixed; top: 12px; left: 50%; transform: translateX(-50%); z-index: 50;
  display: grid; gap: 6px; justify-items: center; pointer-events: none;
}
.toast {
  padding: 8px 14px; border-radius: 10px; background: rgba(12, 14, 22, 0.82);
  border: 1px solid rgba(255, 255, 255, 0.12); color: #ece6da; font: 600 0.88rem system-ui, sans-serif;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35); animation: toast 2.6s ease forwards;
}
@keyframes toast { 0% { opacity: 0; transform: translateY(-6px); } 10%, 80% { opacity: 1; transform: none; } 100% { opacity: 0; } }
.hud { position: fixed; inset: 0; pointer-events: none; overflow: hidden; }
.hud .mira {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 18px;
  height: 18px;
  transform: translate(-50%, -50%);
  pointer-events: none;
}
.hud .mira::before,
.hud .mira::after {
  content: '';
  position: absolute;
  background: #fff1d6;
  box-shadow: 0 0 3px #120a24;
}
.hud .mira::before { top: 8px; left: 0; width: 18px; height: 2px; }
.hud .mira::after { top: 0; left: 8px; width: 2px; height: 18px; }
.hud .fps {
  position: absolute;
  top: 8px;
  right: 8px;
  padding: 4px 10px;
  border-radius: 8px;
  background: rgba(10, 12, 20, 0.5);
  color: #ffd98f;
  font: 600 0.9rem system-ui, sans-serif;
}
.hud .som {
  position: absolute;
  top: 8px;
  left: 8px;
  padding: 4px 10px;
  border-radius: 8px;
  background: rgba(10, 12, 20, 0.5);
  color: #e6d6f7;
  font: 600 0.8rem system-ui, sans-serif;
}
.hud .camera-indicador {
  position: absolute;
  top: 40px;
  left: 8px;
  padding: 4px 10px;
  border-radius: 8px;
  background: rgba(10, 12, 20, 0.5);
  color: #e6d6f7;
  font: 600 0.8rem system-ui, sans-serif;
}
`;

const TECLAS: ReadonlyArray<readonly [string, string]> = [
  ['W A S D', 'mover'],
  ['Espaço', 'pular'],
  ['Shift', 'correr'],
  ['Mouse', 'olhar'],
  ['E', 'inventário'],
  ['Esc', 'pausa'],
];

/** Mostra uma notificação curta no topo da tela. */
export function notificar(texto: string): void {
  let area = document.querySelector<HTMLElement>('.toast-area');
  if (!area) {
    area = document.createElement('div');
    area.className = 'toast-area';
    area.setAttribute('aria-live', 'polite');
    document.body.appendChild(area);
  }
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = texto;
  area.appendChild(t);
  setTimeout(() => t.remove(), 2700);
  while (area.children.length > 4) area.firstElementChild?.remove();
}

export interface OpcoesInterface {
  repo?: RepositorioMundos;
  mundo?: MetaMundo | null;
  abrirMundo?: (id: string) => void;
}

export function criarInterface(
  app: HTMLElement,
  hotbar?: Hotbar,
  opMundo: OpcoesInterface = {},
): { entrada: HTMLElement; acoes: HTMLElement } {
  const estilo = document.createElement('style');
  estilo.textContent = CSS;
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
  app.appendChild(hud);
  criarBarra(app, hotbar);

  const entrada = document.createElement('div');
  entrada.className = 'entrada';
  const titulo = document.createElement('h1');
  titulo.textContent = 'Brumaluz';
  const sub = document.createElement('p');
  sub.className = 'subtitulo';
  sub.textContent = 'Explore, construa e sobreviva num mundo de bruma e luz';
  const instrucao = document.createElement('p');
  instrucao.className = 'instrucao';
  instrucao.textContent = 'Clique para jogar';
  const lista = document.createElement('ul');
  for (const [tecla, acao] of TECLAS) {
    const item = document.createElement('li');
    const k = document.createElement('kbd');
    k.textContent = tecla;
    item.append(k, ` ${acao}`);
    lista.appendChild(item);
  }
  const grade = document.createElement('div');
  grade.className = 'entrada-grade';
  const coluna = document.createElement('div');
  coluna.className = 'coluna-titulo';
  const cartao = document.createElement('div');
  cartao.className = 'cartao-atual';
  cartao.setAttribute('data-mundo-atual', '');
  const info = document.createElement('div');
  info.className = 'info';
  const rot = document.createElement('div');
  rot.className = 'rotulo';
  const nomeMundo = document.createElement('div');
  nomeMundo.className = 'nome';
  info.append(rot, nomeMundo);
  cartao.appendChild(info);
  const atualizarCartao = (m: MetaMundo | null | undefined) => {
    rot.textContent = m
      ? `${m.modo === 'criativo' ? 'Criativo' : 'Sobrevivência'} · semente ${m.semente}`
      : 'Mundo';
    nomeMundo.textContent = m?.nome ?? 'Mundo de passagem';
    if (m?.miniatura) cartao.style.backgroundImage = `url(${m.miniatura})`;
  };
  atualizarCartao(opMundo.mundo);
  const acoes = document.createElement('div');
  acoes.className = 'acoes-entrada';
  acoes.addEventListener('click', (e) => e.stopPropagation());
  if (opMundo.repo) {
    const estiloModal = document.createElement('style');
    estiloModal.textContent = CSS_MODAL;
    document.head.appendChild(estiloModal);
    const painelMundos = criarPainelMundos(app, {
      repo: opMundo.repo,
      atual: opMundo.mundo ?? null,
      abrir: (id) => opMundo.abrirMundo?.(id),
    });
    const bMundos = document.createElement('button');
    bMundos.type = 'button';
    bMundos.className = 'btn';
    bMundos.setAttribute('data-abrir-mundos', '');
    bMundos.textContent = '🌍 Mundos';
    bMundos.addEventListener('click', () => void painelMundos.abrir());
    acoes.appendChild(bMundos);
    window.addEventListener('brumaluz:salvo', async () => {
      if (opMundo.mundo) atualizarCartao(await opMundo.repo!.obter(opMundo.mundo.id));
    });
  }
  coluna.append(titulo, sub, cartao, instrucao, acoes, lista);
  grade.appendChild(coluna);
  entrada.appendChild(grade);
  app.appendChild(entrada);

  function entrarNoJogo(): void {
    entrada.hidden = true;
    document.getElementById('cena')?.requestPointerLock?.();
  }
  function rotuloNome(a: Aparencia): string {
    return a.nome || MODELOS[a.modelo].rotulo;
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
  const painel = criarPainelPersonagem(grade, {
    armazenamento: armazenamento(),
    aoMudar: (a) => {
      nomeHud.textContent = rotuloNome(a);
      window.__brumaluz?.personagem?.definir(a);
    },
    aoJogar: entrarNoJogo,
  });
  nomeHud.textContent = rotuloNome(painel.aparencia());

  entrada.addEventListener('click', entrarNoJogo);
  window.addEventListener('keydown', (e) => {
    if (!teclaParaPainel(e.code) || e.repeat) return;
    entrada.hidden = false;
    document.exitPointerLock?.();
  });
  document.addEventListener('pointerlockchange', () => {
    entrada.hidden = document.pointerLockElement !== null;
  });

  setInterval(() => {
    const valor = window.__brumaluz?.fps ?? 0;
    fps.textContent = `${Math.round(valor)} FPS`;
  }, 500);
  setInterval(() => {
    const a = window.__brumaluz?.audio;
    somInd.textContent = textoIndicador((a?.estado ?? 'inativo') as EstadoAudio, a?.mudo ?? false);
    camInd.textContent = textoIndicadorCamera(window.__brumaluz?.camera?.modo() ?? 'primeira');
  }, 200);
  return { entrada, acoes };
}
