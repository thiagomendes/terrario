import { criarCena } from './render/cena';
import { criarHotbar } from './player/hotbar';
import { criarInterface } from './ui/interface';
import { armazemIndexedDB } from './jogo/indexeddb';
import { SEMENTE_PADRAO_MUNDO, criarRepositorioMundos, type MetaMundo } from './jogo/mundos';
import { CSS_INVENTARIO, criarInventarioUI } from './ui/inventario';

async function iniciar(app: HTMLElement): Promise<void> {
  const repo = criarRepositorioMundos(armazemIndexedDB());
  const pedido = new URLSearchParams(location.search).get('mundo');
  let mundo: MetaMundo | null = pedido ? await repo.obter(pedido) : null;
  mundo ??= await repo.ultimo();
  mundo ??= await repo.criar('Meu primeiro mundo', SEMENTE_PADRAO_MUNDO, 'criativo');
  const dados = await repo.carregar(mundo.id);

  const canvas = document.createElement('canvas');
  canvas.id = 'cena';
  canvas.style.width = '100vw';
  canvas.style.height = '100vh';
  canvas.style.display = 'block';
  canvas.style.outline = 'none';
  app.appendChild(canvas);
  const hotbar = criarHotbar();
  const atual = mundo;
  let cena: ReturnType<typeof criarCena> | null = null;
  criarInterface(app, hotbar, {
    repo,
    mundo: atual,
    abrirMundo: async (id) => {
      await cena?.salvar();
      const url = new URL(location.href);
      url.searchParams.set('mundo', id);
      location.href = url.toString();
    },
  });
  cena = criarCena(canvas, hotbar, { mundo: atual, dados, repo });
  panorama(cena);
  ligarInventario(app, canvas, cena, hotbar);
}

/** Na tela de título, a câmera gira devagar mostrando o mundo; ao jogar, volta à mira salva. */
function panorama(cena: ReturnType<typeof criarCena>): void {
  const yaw0 = cena.camera.rotation.y;
  const pitch0 = cena.camera.rotation.x;
  let yaw = yaw0;
  let ativo = true;
  let ultimo = performance.now();
  const entrada = () => document.querySelector<HTMLElement>('.entrada');
  const parar = () => {
    if (!ativo) return;
    ativo = false;
    cena.controle.apontar(yaw0, pitch0);
  };
  document.addEventListener('pointerlockchange', () => {
    if (document.pointerLockElement) parar();
  });
  // um teste ou script que aponta a câmera também encerra o panorama
  const apontarOriginal = cena.estado.apontar;
  cena.estado.apontar = (y, p) => {
    ativo = false;
    apontarOriginal?.(y, p);
  };
  const girar = (agora: number) => {
    const dt = Math.min(0.1, (agora - ultimo) / 1000);
    ultimo = agora;
    const e = entrada();
    if (!ativo || !e || e.hidden) {
      if (ativo && e?.hidden) parar();
      return;
    }
    yaw += dt * 0.05;
    cena.controle.apontar(yaw, 0.08);
    requestAnimationFrame(girar);
  };
  requestAnimationFrame(girar);
}

const app = document.getElementById('app');
if (app) void iniciar(app);

function ligarInventario(
  app: HTMLElement,
  canvas: HTMLCanvasElement,
  cena: ReturnType<typeof criarCena>,
  hotbar: ReturnType<typeof criarHotbar>,
): void {
  const estilo = document.createElement('style');
  estilo.textContent = CSS_INVENTARIO;
  document.head.appendChild(estilo);
  const ui = criarInventarioUI(app, {
    inventario: hotbar.inventario,
    criativo: () => cena.estado.modo === 'criativo',
    ativo: () => hotbar.ativo,
    aoSobrar: (p) => {
      const j = cena.controle.jogador;
      cena.estado.soltarItem?.(p.item, p.qtd, j.x, j.y + 1.2, j.z);
    },
    aoFechar: () => {
      if (document.querySelector('.entrada:not([hidden])')) return;
      canvas.requestPointerLock?.();
    },
  });
  (window as unknown as { __inventarioUI?: typeof ui }).__inventarioUI = ui;
  window.addEventListener('keydown', (e) => {
    if ((e.target as HTMLElement)?.closest?.('input, textarea')) return;
    const naEntrada = !!document.querySelector('.entrada:not([hidden])');
    if (e.code === 'KeyE' && !e.repeat && !naEntrada) {
      if (ui.aberto) ui.fechar();
      else {
        ui.abrir();
        document.exitPointerLock?.();
      }
    } else if (e.code === 'Escape' && ui.aberto) {
      ui.fechar();
    }
  });
}
