import { botaoFechar, icone } from './pixicones';
import { CORES_MARCADOR, anguloRelativo, type Marcador } from '../jogo/mapa';
import { TAM_X } from '../world/chunk';

export const CSS_MAPA = `
.minimapa {
  position: fixed; top: 44px; right: 10px; z-index: 7; width: 156px; height: 156px; border-radius: 50%;
  overflow: hidden; border: 5px solid #fbf7ee;
  /* aro de plástico: borda clara com degrau embaixo e sombra macia */
  box-shadow: 0 3px 0 #d9cfbd, 0 8px 18px rgba(20, 16, 40, 0.35), inset 0 2px 8px rgba(20, 16, 40, 0.35);
  background: #b9c8d8; pointer-events: none;
  transform: scale(var(--escala-ui, 1)); transform-origin: top right;
}
.minimapa canvas { width: 100%; height: 100%; }
.minimapa .norte { position: absolute; top: 3px; left: 50%; transform: translateX(-50%); font: 900 0.62rem var(--jogo); color: #fff; background: #e0484a; border-radius: 8px; padding: 0 5px; line-height: 1.35; box-shadow: 0 1px 0 #a8302f; }
/* bússola: régua creme de cantos redondos, letras de tinta */
.bussola {
  position: fixed; top: 10px; left: 50%; transform: translateX(-50%); z-index: 7; pointer-events: none;
  width: min(420px, 60vw); height: 28px; overflow: hidden; border-radius: 14px;
  background: rgba(255, 250, 240, 0.88); box-shadow: 0 3px 0 rgba(150, 110, 60, 0.35);
  -webkit-mask-image: linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent);
  mask-image: linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent);
  font: 900 0.76rem var(--jogo); color: var(--tinta);
}
.bussola span { position: absolute; top: 5px; transform: translateX(-50%); white-space: nowrap; }
.bussola .marcador { top: 9px; width: 10px; height: 10px; border-radius: 50%; transform: translateX(-50%); box-shadow: 0 1px 0 rgba(60, 35, 10, 0.4); }
.bussola::after { content: ''; position: absolute; left: 50%; top: 3px; bottom: 3px; width: 3px; border-radius: 2px; background: var(--amarela-fundo); transform: translateX(-50%); }
body.modo-foto .bussola { display: none; }
@media (max-width: 560px) {
  .bussola { display: none; }
  .minimapa { width: 104px; height: 104px; top: 40px; }
}
body:has(.entrada:not([hidden])) .minimapa, body:has(.entrada:not([hidden])) .bussola { display: none; }
/* mapa grande: painel creme quase da tela toda, o mapa num poço de cantos redondos */
.mapa-mundo {
  position: fixed; inset: 0; z-index: 32; display: grid; grid-template-rows: auto 1fr; box-sizing: border-box;
  padding: max(12px, env(safe-area-inset-top, 0px)) max(12px, env(safe-area-inset-right, 0px)) max(14px, env(safe-area-inset-bottom, 0px)) max(12px, env(safe-area-inset-left, 0px));
  background: rgba(60, 45, 80, 0.32); backdrop-filter: blur(6px);
  font-family: var(--jogo); color: var(--tinta);
}
.mapa-mundo[hidden] { display: none; }
.mapa-mundo::before {
  content: ''; position: absolute; z-index: -1;
  inset: max(12px, env(safe-area-inset-top, 0px)) max(12px, env(safe-area-inset-right, 0px)) max(14px, env(safe-area-inset-bottom, 0px)) max(12px, env(safe-area-inset-left, 0px));
  border-radius: 24px; background: var(--painel); box-shadow: 0 8px 0 var(--painel-borda), 0 22px 40px rgba(40, 25, 10, 0.35);
}
.mapa-mundo { isolation: isolate; }
.mapa-mundo > .botao-fechar { top: max(22px, calc(env(safe-area-inset-top, 0px) + 10px)); right: max(22px, calc(env(safe-area-inset-right, 0px) + 10px)); }
/* o X fica no canto: o cabeçalho reserva o espaço dele */
.mapa-mundo header { display: flex; align-items: center; gap: 10px 14px; padding: 14px 70px 12px 18px; flex-wrap: wrap; }
.mapa-mundo .area-mapa {
  position: relative; min-height: 0; margin: 0 12px 12px; border-radius: 18px; overflow: hidden;
  background: #a9bbcf; box-shadow: inset 0 3px 0 rgba(60, 40, 20, 0.18);
}
.mapa-mundo .zoom-mapa { position: absolute; right: 12px; bottom: 14px; display: grid; gap: 12px; }
.mapa-mundo .zoom-mapa button, .mapa-mundo .marcar-aqui {
  display: inline-flex; align-items: center; justify-content: center; gap: 6px; min-width: 46px; min-height: 44px;
  padding: 0 12px; border: 0; border-radius: 14px; color: var(--tinta); cursor: pointer;
  background: linear-gradient(to bottom, #fffdf6, var(--creme) 50%, #f6ead2);
  box-shadow: 0 4px 0 var(--creme-fundo), 0 7px 12px rgba(60, 35, 10, 0.22), inset 0 2px 0 rgba(255, 255, 255, 0.8);
  font: 800 0.88rem var(--jogo); touch-action: manipulation; transition: transform 0.08s, box-shadow 0.08s;
}
.mapa-mundo .zoom-mapa button { font-size: 1.2rem; }
.mapa-mundo .zoom-mapa button:hover, .mapa-mundo .marcar-aqui:hover { filter: brightness(1.03); }
.mapa-mundo .zoom-mapa button:focus-visible, .mapa-mundo .marcar-aqui:focus-visible { outline: 3px solid var(--azul); outline-offset: 2px; }
.mapa-mundo .zoom-mapa button:active, .mapa-mundo .marcar-aqui:active { transform: translateY(3px); box-shadow: 0 1px 0 var(--creme-fundo); }
.mapa-mundo .marcar-aqui[hidden] { display: none; }
.mapa-mundo h2 { margin: 0; font: 700 1.4rem/1.1 var(--display); color: var(--titulo); }
.mapa-mundo .dica { color: var(--tinta-suave); font-size: 0.84rem; font-weight: 700; }
.mapa-mundo canvas { display: block; width: 100%; height: 100%; cursor: grab; }
.mapa-mundo .lista-marcadores { display: flex; gap: 8px; flex-wrap: wrap; }
.mapa-mundo .lista-marcadores .btn { font-size: 0.8rem; min-height: 32px; padding: 4px 10px; margin-bottom: 4px; }
.mapa-mundo .lista-marcadores .btn::before {
  content: ''; width: 12px; height: 12px; border-radius: 50%; background: var(--cor-marcador, var(--amarela)); box-shadow: 0 1px 0 rgba(60, 35, 10, 0.4);
}
@media (pointer: coarse) { .mapa-mundo .lista-marcadores .btn { min-height: 44px; } }
/* paisagem baixa no toque: a linha de ícones ocupa o alto à direita; minimapa menor abaixo dela */
@media (orientation: landscape) and (max-height: 500px) {
  .minimapa { width: 96px; height: 96px; top: 40px; }
  body.toque-ativo .minimapa { width: 84px; height: 84px; top: calc(env(safe-area-inset-top, 0px) + 58px); right: max(10px, env(safe-area-inset-right)); }
  .bussola { width: min(300px, 36vw); }
  .mapa-mundo header { padding-top: 8px; padding-bottom: 6px; }
}
`;

export interface FonteMapa {
  posicao(): { x: number; z: number; yaw: number };
  /** Cores 16x16 (RGBA) de um chunk. */
  /** null: chunk ainda não carregado (tenta de novo mais tarde). */
  amostrar(cx: number, cz: number): Uint8ClampedArray | null;
  marcadores(): Marcador[];
  adicionarMarcador(nome: string): void;
  removerMarcador(id: number): void;
  /** Marca a posição atual (mesma ação da tecla K). */
  marcarAqui?(): void;
  /** Amigos no mundo (com amigos): uma bolinha com a inicial de cada um. */
  amigos?(): { id: string; apelido: string; x: number; z: number }[];
}

/** Cor estável de cada amigo (pelo id). */
export function corDoAmigo(id: string): string {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return `hsl(${h % 360}, 80%, 62%)`;
}

export const ZOOM_MIN = 0.5;
export const ZOOM_MAX = 10;
export const limitarZoom = (z: number) => Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, z));
/** Zoom por pinça: escala o zoom do início do gesto pela razão entre as distâncias dos dedos. */
export function zoomPorPinca(zoomInicial: number, dist0: number, dist: number): number {
  if (dist0 <= 0 || dist <= 0) return limitarZoom(zoomInicial);
  return limitarZoom(zoomInicial * (dist / dist0));
}

/** Cor do que ainda não foi visto ou carregado: névoa clara no minimapa, mais funda no grande. */
const NEVOA = '#b9c8d8';
const NEVOA_GRANDE = '#a9bbcf';

export function criarMapas(raiz: HTMLElement, fonte: FonteMapa) {
  const cache = new Map<string, HTMLCanvasElement>();
  const fila: string[] = [];
  function imagem(cx: number, cz: number): HTMLCanvasElement | undefined {
    return cache.get(`${cx},${cz}`);
  }
  const naFila = new Set<string>();
  function pedir(cx: number, cz: number, forcar = false): void {
    const k = `${cx},${cz}`;
    if ((!forcar && cache.has(k)) || naFila.has(k)) return;
    naFila.add(k);
    fila.push(k);
  }
  /** Algum pedaço pedido ainda não tinha chegado: o minimapa tenta de novo sozinho. */
  let faltou = false;
  /** Gera a imagem de até n chunks da fila, os mais perto do jogador primeiro. */
  function processar(n: number): boolean {
    let mudou = false;
    const p = fonte.posicao();
    const pcx = p.x / TAM_X - 0.5;
    const pcz = p.z / TAM_X - 0.5;
    for (let i = 0; i < n && fila.length; i++) {
      let melhor = 0;
      let dMelhor = Infinity;
      for (let j = 0; j < fila.length; j++) {
        const [a, b] = fila[j].split(',').map(Number);
        const d = (a - pcx) ** 2 + (b - pcz) ** 2;
        if (d < dMelhor) {
          dMelhor = d;
          melhor = j;
        }
      }
      const k = fila.splice(melhor, 1)[0];
      naFila.delete(k);
      const [cx, cz] = k.split(',').map(Number);
      const cores = fonte.amostrar(cx, cz);
      if (!cores) {
        // ainda não carregado: pede de novo daqui a pouco, mesmo com o jogador parado
        faltou = true;
        continue;
      }
      const c = cache.get(k) ?? document.createElement('canvas');
      c.width = TAM_X;
      c.height = TAM_X;
      const ctx = c.getContext('2d')!;
      ctx.putImageData(new ImageData(new Uint8ClampedArray(cores), TAM_X, TAM_X), 0, 0);
      cache.set(k, c);
      mudou = true;
    }
    return mudou;
  }

  // minimapa
  const mini = document.createElement('div');
  mini.className = 'minimapa';
  mini.setAttribute('data-minimapa', '');
  const cv = document.createElement('canvas');
  // o dobro da resolução: traço macio também em tela de alta densidade
  cv.width = 312;
  cv.height = 312;
  /** Mosaico dos 7x7 pedaços em volta, um pixel por bloco: suavizado de uma vez, sem emendas. */
  const mosaico = document.createElement('canvas');
  mosaico.width = TAM_X * 7;
  mosaico.height = TAM_X * 7;
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
  h.append(icone('mapa'), ' Mapa do mundo');
  const dica = document.createElement('span');
  dica.className = 'dica';
  dica.textContent = 'Arraste para mover · roda para zoom · K marca um lugar · Tab fecha';
  const lista = document.createElement('div');
  lista.className = 'lista-marcadores';
  const marcar = document.createElement('button');
  marcar.type = 'button';
  marcar.className = 'marcar-aqui';
  marcar.setAttribute('data-marcar-aqui', '');
  marcar.append(icone('marcador'), ' Marcar aqui');
  marcar.hidden = !fonte.marcarAqui;
  marcar.addEventListener('click', () => {
    fonte.marcarAqui?.();
    grandeSujo = true;
  });
  cab.append(h, marcar, dica, lista);
  const cvG = document.createElement('canvas');
  const area = document.createElement('div');
  area.className = 'area-mapa';
  const zoomEl = document.createElement('div');
  zoomEl.className = 'zoom-mapa';
  const botaoZoom = (nome: 'mais' | 'menos', rotulo: string, fator: number) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.appendChild(icone(nome));
    b.setAttribute('aria-label', rotulo);
    b.title = rotulo;
    b.addEventListener('click', () => {
      zoom = limitarZoom(zoom * fator);
      grandeSujo = true;
    });
    return b;
  };
  zoomEl.append(botaoZoom('mais', 'Aproximar', 1.3), botaoZoom('menos', 'Afastar', 1 / 1.3));
  area.append(cvG, zoomEl);
  grande.append(
    cab,
    area,
    botaoFechar(() => fecharGrande?.()),
  );
  grande.addEventListener('click', (e) => e.stopPropagation());
  raiz.append(mini, bussola, grande);

  let fecharGrande: (() => void) | null = null;
  let centro = { x: 0, z: 0 };
  let zoom = 3;
  let grandeSujo = true;
  // um dedo (ou o mouse) arrasta; dois dedos dão zoom por pinça
  let arrastando: { x: number; y: number } | null = null;
  const ponteiros = new Map<number, { x: number; y: number }>();
  let pinca: { d0: number; z0: number } | null = null;
  const distancia = () => {
    const [a, b] = [...ponteiros.values()];
    return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
  };
  cvG.style.touchAction = 'none';
  cvG.addEventListener('pointerdown', (e) => {
    ponteiros.set(e.pointerId, { x: e.clientX, y: e.clientY });
    try {
      cvG.setPointerCapture(e.pointerId);
    } catch {
      // ponteiro já liberado
    }
    if (ponteiros.size >= 2) {
      pinca = { d0: distancia(), z0: zoom };
      arrastando = null;
    } else arrastando = { x: e.clientX, y: e.clientY };
  });
  const soltarPonteiro = (e: PointerEvent) => {
    if (!ponteiros.delete(e.pointerId)) return;
    if (ponteiros.size < 2) pinca = null;
    const resta = [...ponteiros.values()][0];
    arrastando = ponteiros.size === 1 && resta ? { ...resta } : null;
  };
  cvG.addEventListener('pointerup', soltarPonteiro);
  cvG.addEventListener('pointercancel', soltarPonteiro);
  cvG.addEventListener('lostpointercapture', soltarPonteiro);
  cvG.addEventListener('pointermove', (e) => {
    if (!ponteiros.has(e.pointerId)) return;
    ponteiros.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinca) {
      zoom = zoomPorPinca(pinca.z0, pinca.d0, distancia());
      return;
    }
    if (!arrastando) return;
    centro.x -= (e.clientX - arrastando.x) / zoom;
    centro.z -= (e.clientY - arrastando.y) / zoom;
    arrastando = { x: e.clientX, y: e.clientY };
  });
  cvG.addEventListener('wheel', (e) => {
    e.preventDefault();
    zoom = limitarZoom(zoom * (e.deltaY > 0 ? 0.85 : 1.18));
  });

  function desenharMarcadores(
    ctx: CanvasRenderingContext2D,
    para: (x: number, z: number) => [number, number],
  ): void {
    for (const m of fonte.marcadores()) {
      const [px, py] = para(m.x, m.z);
      // alfinete de brinquedo: bolinha da cor com aro branco
      ctx.beginPath();
      ctx.arc(px, py, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = m.cor;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#fff';
      ctx.stroke();
    }
    // amigos: bolinha da cor de cada um com a inicial do apelido
    for (const a of fonte.amigos?.() ?? []) {
      const [px, py] = para(a.x, a.z);
      ctx.beginPath();
      ctx.arc(px, py, 6, 0, Math.PI * 2);
      ctx.fillStyle = corDoAmigo(a.id);
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#fff';
      ctx.stroke();
      ctx.fillStyle = '#14101c';
      ctx.font = '900 8px Nunito, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText((a.apelido[0] ?? '?').toUpperCase(), px, py + 0.5);
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
    // sombrinha embaixo, depois a seta de plástico (branca com aro azul, cantos redondos)
    ctx.beginPath();
    ctx.ellipse(0, 2.5, 7, 3.5, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(20, 16, 40, 0.28)';
    ctx.fill();
    ctx.rotate(yaw);
    ctx.beginPath();
    ctx.moveTo(0, -8.5);
    ctx.lineTo(6.5, 6);
    ctx.quadraticCurveTo(0, 2.5, -6.5, 6);
    ctx.closePath();
    ctx.lineJoin = 'round';
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#2f6fe0';
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.restore();
  }

  function desenharMini(): void {
    const { x, z, yaw } = fonte.posicao();
    const ctx = cv.getContext('2d')!;
    ctx.setTransform(2, 0, 0, 2, 0, 0);
    const escala = 1.6; // pixels por bloco
    const meia = 78;
    const ccx = Math.floor(x / TAM_X);
    const ccz = Math.floor(z / TAM_X);
    // o que ainda não chegou é névoa clara (nada de cantos pretos)
    const m = mosaico.getContext('2d')!;
    m.fillStyle = NEVOA;
    m.fillRect(0, 0, mosaico.width, mosaico.height);
    for (let dz = -3; dz <= 3; dz++)
      for (let dx = -3; dx <= 3; dx++) {
        const img = imagem(ccx + dx, ccz + dz);
        if (!img) {
          // fora do círculo não precisa
          const ox = (ccx + dx + 0.5) * TAM_X - x;
          const oz = (ccz + dz + 0.5) * TAM_X - z;
          if (Math.hypot(ox, oz) * escala < meia + TAM_X * escala * 0.75) {
            pedir(ccx + dx, ccz + dz);
            faltou = true;
          }
          continue;
        }
        m.drawImage(img, (dx + 3) * TAM_X, (dz + 3) * TAM_X);
      }
    // traço de brinquedo: o mosaico inteiro ampliado com suavização (sem pixel por bloco)
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'low';
    const ox = (ccx - 3) * TAM_X;
    const oz = (ccz - 3) * TAM_X;
    ctx.drawImage(
      mosaico,
      meia + (ox - x) * escala,
      meia + (oz - z) * escala,
      mosaico.width * escala,
      mosaico.height * escala,
    );
    // borda do círculo se esfuma, como uma lente
    const borda = ctx.createRadialGradient(meia, meia, meia * 0.72, meia, meia, meia);
    borda.addColorStop(0, 'rgba(185, 200, 216, 0)');
    borda.addColorStop(1, 'rgba(185, 200, 216, 0.55)');
    ctx.fillStyle = borda;
    ctx.fillRect(0, 0, 156, 156);
    desenharMarcadores(ctx, (mx, mz) => [meia + (mx - x) * escala, meia + (mz - z) * escala]);
    // norte para cima: +z do mundo aponta para baixo no mapa, então o yaw é espelhado
    desenharJogador(ctx, meia, meia, Math.PI - yaw);
  }

  const rotulosBussola: HTMLSpanElement[] = [];
  const marcasBussola: HTMLSpanElement[] = [];
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
    // os rótulos são criados uma vez; a cada atualização só mudam de posição
    if (!rotulosBussola.length) {
      for (const [rot] of pontos) {
        const s = document.createElement('span');
        s.textContent = rot;
        s.style.left = '0';
        if (rot.length === 1) s.style.color = rot === 'N' ? '#d0392b' : 'var(--titulo)';
        bussola.appendChild(s);
        rotulosBussola.push(s);
      }
    }
    const posicionar = (ang: number) => {
      const rel = Math.atan2(Math.sin(ang - yaw), Math.cos(ang - yaw));
      if (Math.abs(rel) > Math.PI / 2) return null;
      return w / 2 + (rel / (Math.PI / 2)) * (w / 2);
    };
    pontos.forEach(([, ang], i) => {
      const px = posicionar(ang);
      const s = rotulosBussola[i];
      s.hidden = px === null;
      if (px !== null) s.style.transform = `translateX(${px}px) translateX(-50%)`;
    });
    const marcadores = fonte.marcadores();
    while (marcasBussola.length < marcadores.length) {
      const s = document.createElement('span');
      s.className = 'marcador';
      bussola.appendChild(s);
      marcasBussola.push(s);
    }
    marcasBussola.forEach((s, i) => {
      const m = marcadores[i];
      const rel = m ? anguloRelativo(x, z, yaw, m.x, m.z) : 9;
      s.hidden = Math.abs(rel) > Math.PI / 2;
      if (!m || s.hidden) return;
      s.style.left = `${w / 2 + (rel / (Math.PI / 2)) * (w / 2)}px`;
      s.style.background = m.cor;
      s.title = m.nome;
    });
  }

  function desenharGrande(): void {
    const r = cvG.getBoundingClientRect();
    const lw = Math.max(1, Math.floor(r.width));
    const lh = Math.max(1, Math.floor(r.height));
    if (cvG.width !== lw) cvG.width = lw;
    if (cvG.height !== lh) cvG.height = lh;
    const ctx = cvG.getContext('2d')!;
    ctx.imageSmoothingEnabled = true;
    ctx.fillStyle = NEVOA_GRANDE;
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
      b.append(`${m.nome} `, icone('fechar'));
      // a bolinha da cor do marcador vem antes do nome (CSS)
      b.style.setProperty('--cor-marcador', m.cor);
      b.title = 'Remover marcador';
      b.addEventListener('click', () => {
        fonte.removerMarcador(m.id);
        atualizarLista();
      });
      lista.appendChild(b);
    }
  }

  // Atualização a ~12 Hz e só quando algo mudou (posição, direção, chunks novos ou
  // mapa grande sendo arrastado): o minimapa não disputa o quadro com o jogo.
  let ultimaVez = 0;
  let ultimaReamostra = 0;
  let ultimaFalta = 0;
  let ultimo = { x: NaN, z: NaN, yaw: NaN };
  cvG.addEventListener('pointermove', () => (grandeSujo = true));
  cvG.addEventListener('wheel', () => (grandeSujo = true));
  function quadro(agora: number): void {
    requestAnimationFrame(quadro);
    if (agora - ultimaVez < 80) return;
    ultimaVez = agora;
    const chegaram = processar(grande.hidden ? 3 : 6);
    const p = fonte.posicao();
    const andou =
      Math.abs(p.x - ultimo.x) > 0.25 ||
      Math.abs(p.z - ultimo.z) > 0.25 ||
      Math.abs(p.yaw - ultimo.yaw) > 0.01;
    const foto = document.body.classList.contains('modo-foto');
    // pedaço que faltava: tenta de novo a cada meio segundo, mesmo parado
    const repetir = faltou && fila.length === 0 && agora - ultimaFalta > 500;
    if (repetir) {
      ultimaFalta = agora;
      faltou = false;
    }
    if (!foto && (andou || chegaram || repetir)) {
      desenharMini();
      desenharBussola();
      ultimo = { x: p.x, z: p.z, yaw: p.yaw };
    }
    if (!grande.hidden && (grandeSujo || chegaram || andou)) {
      desenharGrande();
      grandeSujo = false;
    }
    // reamostra o chunk do jogador de tempos em tempos (edições)
    if (agora - ultimaReamostra > 2000) {
      ultimaReamostra = agora;
      pedir(Math.floor(p.x / TAM_X), Math.floor(p.z / TAM_X), true);
    }
  }
  requestAnimationFrame(quadro);

  fecharGrande = () => {
    if (!grande.hidden) api.alternarGrande();
  };
  const api = {
    alternarGrande(): boolean {
      grande.hidden = !grande.hidden;
      if (!grande.hidden) {
        grandeSujo = true;
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
  return api;
}

export { CORES_MARCADOR };
