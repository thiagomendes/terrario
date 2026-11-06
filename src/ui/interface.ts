import type { Hotbar } from '../player/hotbar';
import { criarBarra } from './barra';
import { textoIndicador } from '../audio/ligador';
import type { EstadoAudio } from '../audio/motor';
import { textoIndicador as textoIndicadorCamera } from '../player/camera';
import { MODELOS, type Aparencia } from '../personagem/aparencia';
import type { Armazenamento } from '../personagem/persistencia';
import { CSS_PAINEL, criarPainelPersonagem, teclaParaPainel } from './personagem';

const CSS = `
.entrada {
  position: fixed;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: clamp(8px, 2vh, 16px);
  padding: 16px;
  box-sizing: border-box;
  text-align: center;
  cursor: pointer;
  color: #f4d9a8;
  font-family: system-ui, 'Segoe UI', sans-serif;
  background: radial-gradient(ellipse at center, rgba(43, 27, 77, 0.78), rgba(18, 10, 36, 0.94));
}
.entrada[hidden] { display: none; }
.entrada h1 {
  margin: 0;
  font-size: clamp(2.5rem, 12vw, 6rem);
  font-weight: 800;
  letter-spacing: 0.08em;
  color: #ffd98f;
  text-shadow: 0 0 24px rgba(255, 170, 80, 0.55), 0 2px 6px #120a24;
}
.entrada .subtitulo {
  margin: 0;
  font-size: clamp(1rem, 3.5vw, 1.5rem);
  color: #d9c4f2;
}
.entrada .instrucao {
  margin-top: clamp(8px, 3vh, 24px);
  padding: 12px clamp(20px, 6vw, 40px);
  border: 2px solid #ffb35c;
  border-radius: 999px;
  background: rgba(255, 179, 92, 0.16);
  color: #fff1d6;
  font-size: clamp(1.1rem, 4vw, 1.5rem);
  font-weight: 700;
}
.entrada ul {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px 16px;
  margin: 8px 0 0;
  padding: 0;
  max-width: 100%;
  list-style: none;
  font-size: clamp(0.85rem, 3vw, 1rem);
  color: #e6d6f7;
}
.entrada kbd {
  padding: 2px 8px;
  border: 1px solid #8a6fb5;
  border-radius: 6px;
  background: #2b1b4d;
  color: #ffd98f;
  font-family: inherit;
  font-weight: 700;
}
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
  background: rgba(18, 10, 36, 0.65);
  color: #ffd98f;
  font: 600 0.9rem system-ui, sans-serif;
}
.hud .som {
  position: absolute;
  top: 8px;
  left: 8px;
  padding: 4px 10px;
  border-radius: 8px;
  background: rgba(18, 10, 36, 0.65);
  color: #e6d6f7;
  font: 600 0.8rem system-ui, sans-serif;
}
.hud .camera-indicador {
  position: absolute;
  top: 40px;
  left: 8px;
  padding: 4px 10px;
  border-radius: 8px;
  background: rgba(18, 10, 36, 0.65);
  color: #e6d6f7;
  font: 600 0.8rem system-ui, sans-serif;
}
`;

const TECLAS: ReadonlyArray<readonly [string, string]> = [
  ['W A S D', 'mover'],
  ['Espaço', 'pular'],
  ['Shift', 'correr'],
  ['Mouse', 'olhar'],
];

export function criarInterface(app: HTMLElement, hotbar?: Hotbar): void {
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
  sub.textContent = 'Explore o crepúsculo eterno e a floresta que brilha na bruma';
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
  entrada.append(titulo, sub, instrucao, lista);
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
  const painel = criarPainelPersonagem(entrada, {
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
}
