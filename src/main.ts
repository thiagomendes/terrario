import { criarCena } from './render/cena';
import { criarHotbar } from './player/hotbar';
import { criarInterface } from './ui/interface';
import { armazemIndexedDB } from './jogo/indexeddb';
import { SEMENTE_PADRAO_MUNDO, criarRepositorioMundos, type MetaMundo } from './jogo/mundos';
import { CSS_INVENTARIO, criarInventarioUI } from './ui/inventario';
import { CSS_CRIACAO, criarCriacao } from './ui/criacao';
import { CSS_CONTEINER, criarPainelBau, criarPainelFornalha } from './ui/conteiner';
import { criarConteineres } from './jogo/conteineres';
import { registrarCatalogo } from './jogo/catalogo';
import { Bloco } from './world/blocks';
import { criarGerenciadorConfig } from './jogo/config';
import { CSS_STATUS, criarStatus, criarTelaMorte } from './ui/status';
import { notificar } from './ui/interface';

async function iniciar(app: HTMLElement): Promise<void> {
  registrarCatalogo();
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
  let armazenamento: Storage | null = null;
  try {
    armazenamento = window.localStorage;
  } catch {
    armazenamento = null;
  }
  const config = criarGerenciadorConfig(armazenamento);
  criarInterface(app, hotbar, {
    repo,
    mundo: atual,
    config,
    salvar: () => cena?.salvar() ?? Promise.resolve(false),
    abrirMundo: async (id) => {
      await cena?.salvar();
      const url = new URL(location.href);
      url.searchParams.set('mundo', id);
      location.href = url.toString();
    },
  });
  cena = criarCena(canvas, hotbar, { mundo: atual, dados, repo, config });
  panorama(cena);
  ligarInventario(app, canvas, cena, hotbar);
  ligarStatus(app, canvas, cena);
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
  estilo.textContent = CSS_INVENTARIO + CSS_CRIACAO + CSS_CONTEINER;
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
  const criacao = criarCriacao(ui, hotbar.inventario, {
    criativo: () => cena.estado.modo === 'criativo',
    aoFabricar: (r) => window.dispatchEvent(new CustomEvent('brumaluz:fabricou', { detail: r.id })),
  });
  const painelBau = criarPainelBau(ui, hotbar.inventario);
  const painelFornalha = criarPainelFornalha(ui);
  const conteineres = criarConteineres(cena.extrasSalvos('conteineres'), cena.semente);
  cena.registrarSalvavel('conteineres', { salvar: () => conteineres.salvar() });
  const fecharOriginal = ui.fechar;
  ui.fechar = () => {
    criacao.devolver();
    painelBau.fechar();
    painelFornalha.fechar();
    fecharOriginal();
  };
  const abrir = (lado: 2 | 3) => {
    painelBau.fechar();
    painelFornalha.fechar();
    criacao.mostrar(true);
    criacao.definirLado(lado);
    ui.abrir();
    criacao.render();
    document.exitPointerLock?.();
  };
  const abrirConteiner = (f: () => void) => {
    criacao.devolver();
    criacao.mostrar(false);
    f();
    ui.abrir();
    document.exitPointerLock?.();
  };
  window.addEventListener('brumaluz:usar', (e) => {
    const d = (e as CustomEvent<{ bloco: number; x: number; y: number; z: number }>).detail;
    if (d.bloco === Bloco.MESA_TRABALHO) abrir(3);
    else if (d.bloco === Bloco.BAU) {
      // baú sem edição no lugar foi gerado pelo mundo (ruína): vem com tesouro
      const gerado = cena.edicoes.obter(d.x, d.y, d.z) === undefined;
      abrirConteiner(() => painelBau.abrir(conteineres.bau(d.x, d.y, d.z, gerado)));
    } else if (d.bloco === Bloco.FORNALHA || d.bloco === Bloco.FORNALHA_ACESA) {
      abrirConteiner(() => painelFornalha.abrir(conteineres.fornalha(d.x, d.y, d.z)));
    } else if (d.bloco === Bloco.CAMA) {
      dormir(cena, d.x, d.z);
    }
  });
  // fornalhas trabalham mesmo com o painel fechado
  let ultimo = performance.now();
  setInterval(() => {
    const agora = performance.now();
    const dt = Math.min(1, (agora - ultimo) / 1000);
    ultimo = agora;
    conteineres.atualizar(
      dt,
      (x, y, z) => cena.blocoEm(x, y, z) === Bloco.FORNALHA_ACESA,
      (x, y, z, acesa) => {
        const meta = cena.estado.meta?.(x, y, z) ?? 0;
        const atual = cena.blocoEm(x, y, z);
        if (atual !== Bloco.FORNALHA && atual !== Bloco.FORNALHA_ACESA) return;
        cena.editarBloco(x, y, z, acesa ? Bloco.FORNALHA_ACESA : Bloco.FORNALHA, meta);
      },
    );
    if (painelFornalha.aberta) painelFornalha.render();
  }, 250);
  // quebrar baú ou fornalha espalha o conteúdo
  cena.barramento.ouvir('quebra', (d) => {
    if (![Bloco.BAU, Bloco.FORNALHA, Bloco.FORNALHA_ACESA].includes(d.bloco as never)) return;
    for (const p of conteineres.remover(d.x, d.y, d.z)) {
      if (p) cena.estado.soltarItem?.(p.item, p.qtd, d.x + 0.5, d.y + 0.5, d.z + 0.5);
    }
  });
  (window as unknown as { __inventarioUI?: unknown }).__inventarioUI = {
    abrir: (lado: 2 | 3 = 2) => abrir(lado),
    fechar: () => ui.fechar(),
  };
  window.addEventListener('keydown', (e) => {
    if ((e.target as HTMLElement)?.closest?.('input, textarea')) return;
    const naEntrada =
      !!document.querySelector('.entrada:not([hidden])') ||
      document.body.dataset.overlay === 'pausa';
    if (e.code === 'KeyE' && !e.repeat && !naEntrada) {
      if (ui.aberto) ui.fechar();
      else abrir(2);
    } else if (e.code === 'Escape' && ui.aberto) {
      ui.fechar();
    }
  });
}

function ligarStatus(
  app: HTMLElement,
  canvas: HTMLCanvasElement,
  cena: ReturnType<typeof criarCena>,
): void {
  const estilo = document.createElement('style');
  estilo.textContent = CSS_STATUS;
  document.head.appendChild(estilo);
  const status = criarStatus(app);
  const sobrevivencia = cena.estado.modo === 'sobrevivencia';
  status.mostrar(sobrevivencia);
  const morte = criarTelaMorte(app, () => {
    cena.estado.renascer?.();
    canvas.requestPointerLock?.();
  });
  window.addEventListener('brumaluz:dano', () => status.piscarDano());
  window.addEventListener('brumaluz:morte', (e) => {
    document.exitPointerLock?.();
    morte.mostrar((e as CustomEvent<string>).detail);
  });
  setInterval(() => {
    const s = cena.estado.sobrevivencia;
    if (sobrevivencia && s) status.atualizar(s.estado);
  }, 100);
  let avisou = false;
  document.addEventListener('pointerlockchange', () => {
    if (!document.pointerLockElement || avisou) return;
    avisou = true;
    notificar(
      sobrevivencia
        ? 'Sobrevivência: cuide da vida e da fome. Quebre blocos para coletar.'
        : 'Criativo: toque duas vezes no espaço para voar · E abre o catálogo',
    );
  });
}

function dormir(cena: ReturnType<typeof criarCena>, x: number, z: number): void {
  cena.estado.definirSpawn?.(x + 0.5, z + 0.5);
  const noite = cena.estado.atmosfera?.noite ?? 0;
  if (noite < 0.4) {
    notificar('Ponto de renascer definido. Só dá para dormir à noite.');
    return;
  }
  const veu = document.createElement('div');
  veu.style.cssText =
    'position:fixed;inset:0;z-index:45;background:#05060c;opacity:0;transition:opacity 1.2s ease;pointer-events:none;display:flex;align-items:center;justify-content:center;color:#d9d2c4;font:600 1.4rem system-ui,sans-serif';
  veu.textContent = 'Zzz…';
  document.body.appendChild(veu);
  requestAnimationFrame(() => (veu.style.opacity = '1'));
  setTimeout(() => {
    if (cena.estado.hora !== undefined) cena.estado.hora = 0.265;
    veu.style.opacity = '0';
    notificar('Você dormiu até o amanhecer');
    setTimeout(() => veu.remove(), 1300);
  }, 1500);
}
