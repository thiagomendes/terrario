import { CORES_MARCADOR, anguloRelativo, type Marcador } from '../jogo/mapa';
import { TAM_X } from '../world/chunk';

export const CSS_MAPA = `
.minimapa {
  position: fixed; top: 44px; right: 10px; z-index: 7; width: 156px; height: 156px; border-radius: 50%;
  overflow: hidden; border: 2px solid rgba(255,255,255,0.35); box-shadow: 0 6px 18px rgba(0,0,0,0.45);
  background: #0c0f18; pointer-events: none;
  transform: scale(var(--escala-ui, 1)); transform-origin: top right;
}
.minimapa canvas { width: 100%; height: 100%; image-rendering: pixelated; }
.minimapa .norte { position: absolute; top: 2px; left: 50%; transform: translateX(-50%); font: 800 0.7rem system-ui; color: #ffd98f; text-shadow: 0 1px 2px #000; }
.bussola {
  position: fixed; top: 10px; left: 50%; transform: translateX(-50%); z-index: 7; pointer-events: none;
  width: min(420px, 60vw); height: 26px; overflow: hidden; border-radius: 13px;
  background: linear-gradient(90deg, transparent, rgba(10,12,20,0.55) 15%, rgba(10,12,20,0.55) 85%, transparent);
  font: 800 0.75rem system-ui, sans-serif; color: #ece6da;
}
.bussola span { position: absolute; top: 5px; transform: translateX(-50%); white-space: nowrap; text-shadow: 0 1px 2px #000; }
.bussola .marcador { top: 8px; width: 9px; height: 9px; transform: translateX(-50%) rotate(45deg); border: 1px solid rgba(0,0,0,0.5); }
.bussola::after { content: ''; position: absolute; left: 50%; top: 0; bottom: 0; width: 2px; background: #ffd98f; transform: translateX(-50%); opacity: 0.8; }
body.modo-foto .bussola { display: none; }
body:has(.entrada:not([hidden])) .minimapa, body:has(.entrada:not([hidden])) .bussola { display: none; }
.mapa-mundo { position: fixed; inset: 0; z-index: 32; background: rgba(6,8,14,0.9); display: grid; grid-template-rows: auto 1fr; font-family: system-ui, sans-serif; color: #ece6da; }
.mapa-mundo[hidden] { display: none; }
.mapa-mundo header { display: flex; align-items: center; gap: 12px; padding: 12px 16px; flex-wrap: wrap; }
.mapa-mundo h2 { margin: 0; font-size: 1.1rem; color: #ffd98f; }
.mapa-mundo .dica { color: #a59f93; font-size: 0.82rem; }
.mapa-mundo canvas { width: 100%; height: 100%; cursor: grab; image-rendering: pixelated; }
.mapa-mundo .lista-marcadores { display: flex; gap: 6px; flex-wrap: wrap; }
.mapa-mundo .lista-marcadores button { font-size: 0.78rem; min-height: 30px; padding: 4px 10px; }
`;

export interface FonteMapa {
  posicao(): { x: number; z: number; yaw: number };
  /** Cores 16x16 (RGBA) de um chunk. */
  amostrar(cx: number, cz: number): Uint8ClampedArray;
  marcadores(): Marcador[];
  adicionarMarcador(nome: string): void;
  removerMarcador(id: number): void;
}

export function criarMapas(raiz: HTMLElement, fonte: FonteMapa) {
  const cache = new Map<string, HTMLCanvasElement>();
  const fila: string[] = [];
  function imagem(cx: number, cz: number): HTMLCanvasElement | undefined {
    return cache.get(`${cx},${cz}`);
  }
  function pedir(cx: number, cz: number, forcar = false): void {
    const k = `${cx},${cz}`;
    if ((!forcar && cache.has(k)) || fila.includes(k)) return;
    fila.push(k);
  }
  function processar(n: number): void {
    for (let i = 0; i < n && fila.length; i++) {
      const k = fila.shift()!;
      const [cx, cz] = k.split(',').map(Number);
      const c = cache.get(k) ?? document.createElement('canvas');
      c.width = TAM_X;
      c.height = TAM_X;
      const ctx = c.getContext('2d')!;
      ctx.putImageData(
        new ImageData(new Uint8ClampedArray(fonte.amostrar(cx, cz)), TAM_X, TAM_X),
        0,
        0,
      );
      cache.set(k, c);
    }
  }

  // minimapa
  const mini = document.createElement('div');
  mini.className = 'minimapa';
  mini.setAttribute('data-minimapa', '');
  const cv = document.createElement('canvas');
  cv.width = 156;
  cv.height = 156;
  const n = document.createElement('span');
  n.className = 'norte';
  n.textContent = 'N';
  mini.append(cv, n);
  // bússola
  const bussola = document.createElement('div');
  bussola.className = 'bussola';
  bussola.setAttribute('data-bussola', '');
  // mapa grande
  const grande = document.createElement('div');
  grande.className = 'mapa-mundo';
  grande.hidden = true;
  grande.setAttribute('data-mapa-mundo', '');
  const cab = document.createElement('header');
  const h = document.createElement('h2');
  h.textContent = '🗺 Mapa do mundo';
  const dica = document.createElement('span');
  dica.className = 'dica';
  dica.textContent = 'Arraste para mover · roda para zoom · K marca um lugar · M fecha';
  const lista = document.createElement('div');
  lista.className = 'lista-marcadores';
  cab.append(h, dica, lista);
  const cvG = document.createElement('canvas');
  grande.append(cab, cvG);
  grande.addEventListener('click', (e) => e.stopPropagation());
  raiz.append(mini, bussola, grande);

  let centro = { x: 0, z: 0 };
  let zoom = 3;
  let arrastando: { x: number; y: number } | null = null;
  cvG.addEventListener('mousedown', (e) => (arrastando = { x: e.clientX, y: e.clientY }));
  window.addEventListener('mouseup', () => (arrastando = null));
  cvG.addEventListener('mousemove', (e) => {
    if (!arrastando) return;
    centro.x -= (e.clientX - arrastando.x) / zoom;
    centro.z -= (e.clientY - arrastando.y) / zoom;
    arrastando = { x: e.clientX, y: e.clientY };
  });
  cvG.addEventListener('wheel', (e) => {
    e.preventDefault();
    zoom = Math.max(0.5, Math.min(10, zoom * (e.deltaY > 0 ? 0.85 : 1.18)));
  });

  function desenharMarcadores(
    ctx: CanvasRenderingContext2D,
    para: (x: number, z: number) => [number, number],
  ): void {
    for (const m of fonte.marcadores()) {
      const [px, py] = para(m.x, m.z);
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = m.cor;
      ctx.strokeStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(-4, -4, 8, 8);
      ctx.strokeRect(-4, -4, 8, 8);
      ctx.restore();
    }
  }
  function desenharJogador(
    ctx: CanvasRenderingContext2D,
    px: number,
    py: number,
    yaw: number,
  ): void {
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(yaw);
    ctx.beginPath();
    ctx.moveTo(0, -8);
    ctx.lineTo(5.5, 6);
    ctx.lineTo(0, 3);
    ctx.lineTo(-5.5, 6);
    ctx.closePath();
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1.5;
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  function desenharMini(): void {
    const { x, z, yaw } = fonte.posicao();
    const ctx = cv.getContext('2d')!;
    const escala = 1.6; // pixels por bloco
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#0c0f18';
    ctx.fillRect(0, 0, cv.width, cv.height);
    const meia = cv.width / 2;
    const ccx = Math.floor(x / TAM_X);
    const ccz = Math.floor(z / TAM_X);
    for (let dz = -3; dz <= 3; dz++)
      for (let dx = -3; dx <= 3; dx++) {
        const img = imagem(ccx + dx, ccz + dz);
        if (!img) {
          pedir(ccx + dx, ccz + dz);
          continue;
        }
        const wx = (ccx + dx) * TAM_X;
        const wz = (ccz + dz) * TAM_X;
        ctx.drawImage(
          img,
          meia + (wx - x) * escala,
          meia + (wz - z) * escala,
          TAM_X * escala,
          TAM_X * escala,
        );
      }
    desenharMarcadores(ctx, (mx, mz) => [meia + (mx - x) * escala, meia + (mz - z) * escala]);
    // norte para cima: +z do mundo aponta para baixo no mapa, então o yaw é espelhado
    desenharJogador(ctx, meia, meia, Math.PI - yaw);
  }

  function desenharBussola(): void {
    const { x, z, yaw } = fonte.posicao();
    const w = bussola.clientWidth || 360;
    const pontos: [string, number][] = [
      ['N', Math.PI],
      ['NE', (3 * Math.PI) / 4],
      ['L', Math.PI / 2],
      ['SE', Math.PI / 4],
      ['S', 0],
      ['SO', -Math.PI / 4],
      ['O', -Math.PI / 2],
      ['NO', (-3 * Math.PI) / 4],
    ];
    bussola.replaceChildren();
    const posicionar = (ang: number) => {
      const rel = Math.atan2(Math.sin(ang - yaw), Math.cos(ang - yaw));
      if (Math.abs(rel) > Math.PI / 2) return null;
      return w / 2 + (rel / (Math.PI / 2)) * (w / 2);
    };
    for (const [rot, ang] of pontos) {
      const px = posicionar(ang);
      if (px === null) continue;
      const s = document.createElement('span');
      s.textContent = rot;
      s.style.left = `${px}px`;
      if (rot.length === 1) s.style.color = rot === 'N' ? '#ff8a7a' : '#ffd98f';
      bussola.appendChild(s);
    }
    for (const m of fonte.marcadores()) {
      const rel = anguloRelativo(x, z, yaw, m.x, m.z);
      if (Math.abs(rel) > Math.PI / 2) continue;
      const s = document.createElement('span');
      s.className = 'marcador';
      s.style.left = `${w / 2 + (rel / (Math.PI / 2)) * (w / 2)}px`;
      s.style.background = m.cor;
      s.title = m.nome;
      bussola.appendChild(s);
    }
  }

  function desenharGrande(): void {
    const r = cvG.getBoundingClientRect();
    cvG.width = Math.max(1, Math.floor(r.width));
    cvG.height = Math.max(1, Math.floor(r.height));
    const ctx = cvG.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#080a12';
    ctx.fillRect(0, 0, cvG.width, cvG.height);
    const para = (wx: number, wz: number): [number, number] => [
      cvG.width / 2 + (wx - centro.x) * zoom,
      cvG.height / 2 + (wz - centro.z) * zoom,
    ];
    for (const [k, img] of cache) {
      const [cx, cz] = k.split(',').map(Number);
      const [px, py] = para(cx * TAM_X, cz * TAM_X);
      if (px > cvG.width || py > cvG.height || px < -TAM_X * zoom || py < -TAM_X * zoom) continue;
      ctx.drawImage(img, px, py, TAM_X * zoom + 0.5, TAM_X * zoom + 0.5);
    }
    desenharMarcadores(ctx, para);
    const p = fonte.posicao();
    const [jx, jy] = para(p.x, p.z);
    desenharJogador(ctx, jx, jy, Math.PI - p.yaw);
  }

  function atualizarLista(): void {
    lista.replaceChildren();
    for (const m of fonte.marcadores()) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'btn';
      b.textContent = `◆ ${m.nome} ✕`;
      b.style.borderColor = m.cor;
      b.title = 'Remover marcador';
      b.addEventListener('click', () => {
        fonte.removerMarcador(m.id);
        atualizarLista();
      });
      lista.appendChild(b);
    }
  }

  let contador = 0;
  function quadro(): void {
    contador++;
    processar(grande.hidden ? 2 : 6);
    if (!document.body.classList.contains('modo-foto')) {
      desenharMini();
      if (contador % 3 === 0) desenharBussola();
    }
    if (!grande.hidden) desenharGrande();
    // reamostra o chunk do jogador de tempos em tempos (edições)
    if (contador % 120 === 0) {
      const { x, z } = fonte.posicao();
      pedir(Math.floor(x / TAM_X), Math.floor(z / TAM_X), true);
    }
    requestAnimationFrame(quadro);
  }
  requestAnimationFrame(quadro);

  return {
    alternarGrande(): boolean {
      grande.hidden = !grande.hidden;
      if (!grande.hidden) {
        const p = fonte.posicao();
        centro = { x: p.x, z: p.z };
        atualizarLista();
        document.body.dataset.overlay = 'mapa';
      } else if (document.body.dataset.overlay === 'mapa') delete document.body.dataset.overlay;
      return !grande.hidden;
    },
    get grandeAberto() {
      return !grande.hidden;
    },
    atualizarLista,
    marcarExplorado(cx: number, cz: number) {
      pedir(cx, cz);
    },
  };
}

export { CORES_MARCADOR };
