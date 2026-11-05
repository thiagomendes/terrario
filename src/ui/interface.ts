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
`;

const TECLAS: ReadonlyArray<readonly [string, string]> = [
  ['W A S D', 'mover'],
  ['Espaço', 'pular'],
  ['Shift', 'correr'],
  ['Mouse', 'olhar'],
];

export function criarInterface(app: HTMLElement): void {
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
  hud.append(mira, fps);
  app.appendChild(hud);

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

  entrada.addEventListener('click', () => {
    entrada.hidden = true;
    document.getElementById('cena')?.requestPointerLock?.();
  });
  document.addEventListener('pointerlockchange', () => {
    entrada.hidden = document.pointerLockElement !== null;
  });

  setInterval(() => {
    const valor = window.__brumaluz?.fps ?? 0;
    fps.textContent = `${Math.round(valor)} FPS`;
  }, 500);
}
