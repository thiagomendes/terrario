import { criarCena } from './render/cena';
import { criarHotbar } from './player/hotbar';
import { criarInterface, travarPonteiro } from './ui/interface';
import { modoToque } from './ui/pixicones';
import { armazemIndexedDB } from './jogo/indexeddb';
import { SEMENTE_PADRAO_MUNDO, criarRepositorioMundos, type MetaMundo } from './jogo/mundos';
import { CSS_INVENTARIO, criarInventarioUI } from './ui/inventario';
import { CSS_CRIACAO, criarCriacao } from './ui/criacao';
import { CSS_CONTEINER, criarPainelBau, criarPainelFornalha } from './ui/conteiner';
import { CSS_TROCAS, criarPainelTrocas } from './ui/trocas';
import type { Profissao } from './world/povoado';
import type { ConteinerReplica } from './cliente/replica';
import { registrarCatalogo } from './jogo/catalogo';
import { Bloco } from './world/blocks';
import { criarGerenciadorConfig } from './jogo/config';
import { CSS_STATUS, criarStatus, criarTelaMorte } from './ui/status';
import { notificar } from './ui/interface';
import { CSS_FOTO, criarPainelFoto } from './ui/foto';
import { CSS_MAPA, criarMapas } from './ui/mapa';
import { CSS_DIARIO, criarUiDiario } from './ui/diario';
import {
  CSS_TOQUE,
  criarLegendas,
  criarToque,
  ligarGamepad,
  bloquearZoomDoNavegador,
} from './ui/toque';
import { criarDiario } from './jogo/diario';
import { ativarTema } from './temas/ativar';
import { povoadoDoTema, tema } from './temas/ativo';
import { temaExiste } from './temas';
import { CORES_MARCADOR, type Marcador } from './jogo/mapa';

async function iniciar(app: HTMLElement): Promise<void> {
  registrarCatalogo();
  const repo = criarRepositorioMundos(armazemIndexedDB());
  const pedido = new URLSearchParams(location.search).get('mundo');
  let mundo: MetaMundo | null = pedido ? await repo.obter(pedido) : null;
  mundo ??= await repo.ultimo();
  mundo ??= await repo.criar('Meu primeiro mundo', SEMENTE_PADRAO_MUNDO, 'criativo');
  const dados = await repo.carregar(mundo.id);
  // o tema do mundo vale para a página inteira: aparência, nomes e terreno
  // ?tema=<id> mostra o mundo em outro tema sem salvar a troca (prévia e capturas)
  const temaPrevia = new URLSearchParams(location.search).get('tema');
  const emPrevia =
    !!temaPrevia && temaExiste(temaPrevia) && temaPrevia !== (mundo.tema ?? 'bruma-e-luz');
  const temaMundo = ativarTema(emPrevia ? temaPrevia : mundo.tema);
  if (mundo.tema && !temaExiste(mundo.tema))
    setTimeout(() => notificar(`Tema desconhecido: este mundo abriu como ${temaMundo.nome}`), 1500);

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
      // a prévia de tema vale só para esta página
      url.searchParams.delete('tema');
      location.href = url.toString();
    },
  });
  // em prévia de outro tema nada é salvo: o mundo continua sendo do tema dele
  cena = criarCena(canvas, hotbar, {
    mundo: atual,
    dados,
    repo: emPrevia ? undefined : repo,
    config,
  });
  if (emPrevia)
    setTimeout(() => notificar(`Prévia de ${temaMundo.nome}: nada deste passeio é salvo`), 1800);
  panorama(cena);
  ligarInventario(app, canvas, cena, hotbar);
  ligarStatus(app, canvas, cena);
  ligarFoto(app, cena);
  ligarMapas(app, cena);
  ligarDiario(app, cena);
  ligarControles(app, cena, hotbar, config);
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
  estilo.textContent = CSS_INVENTARIO + CSS_CRIACAO + CSS_CONTEINER + CSS_TROCAS;
  document.head.appendChild(estilo);
  const ui = criarInventarioUI(app, {
    inventario: hotbar.inventario,
    criativo: () => cena.estado.modo === 'criativo',
    ativo: () => hotbar.ativo,
    aoSobrar: (p) => {
      const j = cena.controle.jogador;
      cena.estado.soltarItem?.(p.item, p.qtd, j.x, j.y + 1.2, j.z, p.dur);
    },
    aoFechar: () => {
      if (document.querySelector('.entrada:not([hidden])')) return;
      travarPonteiro(canvas);
    },
  });
  const criacao = criarCriacao(ui, hotbar.inventario, {
    criativo: () => cena.estado.modo === 'criativo',
    aoFabricar: (r) => window.dispatchEvent(new CustomEvent('brumaluz:fabricou', { detail: r.id })),
  });
  const painelBau = criarPainelBau(ui, hotbar.inventario);
  const painelFornalha = criarPainelFornalha(ui);
  // trocas: o núcleo confere e faz; a tela mostra o pedido e o inventário novo
  let moradorAtual = 0;
  const painelTrocas = criarPainelTrocas(ui, hotbar.inventario, {
    aviso: (t) => notificar(t),
    fazer: (profissao, t) => cena.trocar(moradorAtual, profissao, t.id),
  });
  window.addEventListener('brumaluz:trocar', (e) => {
    const d = (e as CustomEvent<{ profissao: Profissao; nome: string; criatura: number }>).detail;
    moradorAtual = d.criatura;
    abrirConteiner(() => painelTrocas.abrir(d.profissao, d.nome));
  });
  window.addEventListener('brumaluz:trocaRecusada', (e) => {
    if ((e as CustomEvent<string>).detail === 'faltam') notificar(povoadoDoTema().textos.faltam);
  });
  const fecharOriginal = ui.fechar;
  ui.fechar = () => {
    criacao.devolver();
    painelBau.fechar();
    painelFornalha.fechar();
    painelTrocas.fechar();
    cena.fecharConteiner();
    fecharOriginal();
  };
  const abrir = (lado: 2 | 3) => {
    painelBau.fechar();
    painelFornalha.fechar();
    painelTrocas.fechar();
    criacao.mostrar(true);
    criacao.definirLado(lado);
    ui.abrir();
    criacao.render();
    document.exitPointerLock?.();
  };
  const abrirConteiner = (f: () => void) => {
    // um contêiner por vez: baú, fornalha ou trocas
    painelBau.fechar();
    painelFornalha.fechar();
    painelTrocas.fechar();
    criacao.devolver();
    criacao.mostrar(false);
    f();
    ui.abrir();
    document.exitPointerLock?.();
  };
  window.addEventListener('brumaluz:usar', (e) => {
    const d = (e as CustomEvent<{ bloco: number; x: number; y: number; z: number }>).detail;
    if (d.bloco === Bloco.MESA_TRABALHO) abrir(3);
  });
  // baú e fornalha: o núcleo manda o conteúdo (e as mudanças, como a fornalha fundindo)
  window.addEventListener('brumaluz:conteiner', (e) => {
    const { conteiner: c, novo } = (
      e as CustomEvent<{ conteiner: ConteinerReplica | null; novo: boolean }>
    ).detail;
    if (!c) {
      // quebraram o contêiner aberto
      if (painelBau.aberto || painelFornalha.aberta) ui.fechar();
      return;
    }
    if (novo) {
      if (c.tipo === 'bau' && c.slots) {
        const slots = c.slots;
        abrirConteiner(() => painelBau.abrir(slots));
      } else if (c.fornalha) {
        const f = c.fornalha;
        abrirConteiner(() => painelFornalha.abrir(f));
      }
      return;
    }
    if (c.tipo === 'bau') painelBau.render();
    else if (painelFornalha.aberta) painelFornalha.render();
  });
  // cama: o núcleo põe o ponto de renascer e decide se dá para dormir
  ligarSono();
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
    travarPonteiro(canvas);
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
  // Dica de início: ao travar o ponteiro (desktop) ou ao sair do título (toque, sem pointer lock).
  let avisou = false;
  const avisar = () => {
    if (avisou) return;
    avisou = true;
    const toque = modoToque();
    notificar(tema().textos.boasVindas);
    notificar(
      sobrevivencia
        ? toque
          ? 'Sobrevivência: cuide da vida e da fome. Segure na tela para quebrar e coletar.'
          : 'Sobrevivência: cuide da vida e da fome. Quebre blocos para coletar.'
        : toque
          ? 'Criativo: toque duas vezes em pular para voar · mochila abre o catálogo'
          : 'Criativo: aperte Espaço duas vezes para voar · E abre o catálogo',
    );
  };
  document.addEventListener('pointerlockchange', () => {
    if (document.pointerLockElement) avisar();
  });
  const entrada = document.querySelector<HTMLElement>('.entrada');
  if (entrada) {
    new MutationObserver(() => {
      if (entrada.hidden) avisar();
    }).observe(entrada, { attributes: true, attributeFilter: ['hidden'] });
  }
}

/** Dormir: véu escuro enquanto o núcleo passa a noite. */
function ligarSono(): void {
  let veu: HTMLDivElement | null = null;
  window.addEventListener('brumaluz:sono', (e) => {
    if (!(e as CustomEvent<{ dormiu: boolean }>).detail.dormiu) {
      notificar('Ponto de renascer definido. Só dá para dormir à noite.');
      return;
    }
    veu?.remove();
    const v = document.createElement('div');
    v.style.cssText =
      'position:fixed;inset:0;z-index:45;background:#05060c;opacity:0;transition:opacity 1.2s ease;pointer-events:none;display:flex;align-items:center;justify-content:center;color:#d9d2c4;font:600 1.4rem system-ui,sans-serif';
    v.textContent = 'Zzz…';
    document.body.appendChild(v);
    requestAnimationFrame(() => (v.style.opacity = '1'));
    veu = v;
  });
  window.addEventListener('brumaluz:acordou', () => {
    const v = veu;
    veu = null;
    if (v) {
      v.style.opacity = '0';
      setTimeout(() => v.remove(), 1300);
    }
    notificar('Você dormiu até o amanhecer');
    window.dispatchEvent(new CustomEvent('brumaluz:dormiu'));
  });
}

function ligarFoto(app: HTMLElement, cena: ReturnType<typeof criarCena>): void {
  const estilo = document.createElement('style');
  estilo.textContent = CSS_FOTO;
  document.head.appendChild(estilo);
  const foto = cena.estado.modoFoto!;
  const painel = criarPainelFoto(app, {
    filtro: (f) => foto.filtro(f),
    desfoque: (v) => foto.desfoque(v),
    fov: (g) => foto.fov(g),
    hora: (h) => {
      cena.estado.hora = h;
    },
    capturar: () => {
      foto.capturar();
      notificar('Foto salva', 'foto');
      window.dispatchEvent(new CustomEvent('brumaluz:foto'));
    },
    sair: () => alternar(),
  });
  function alternar(): void {
    const ativo = foto.alternar();
    painel.mostrar(ativo, cena.estado.hora);
    if (ativo) document.body.dataset.overlay = 'foto';
    else if (document.body.dataset.overlay === 'foto') delete document.body.dataset.overlay;
  }
  window.addEventListener('keydown', (e) => {
    if ((e.target as HTMLElement)?.closest?.('input, textarea') || e.repeat) return;
    if (document.querySelector('.entrada:not([hidden])')) return;
    if (e.code === 'KeyP') alternar();
    else if (foto.ativo() && e.code === 'Enter') {
      foto.capturar();
      notificar('Foto salva', 'foto');
    }
  });
}

function ligarMapas(app: HTMLElement, cena: ReturnType<typeof criarCena>): void {
  const estilo = document.createElement('style');
  estilo.textContent = CSS_MAPA;
  document.head.appendChild(estilo);
  let marcadores: Marcador[] = (cena.extrasSalvos('marcadores') as Marcador[] | undefined) ?? [];
  cena.registrarSalvavel('marcadores', { salvar: () => marcadores });
  let proximo = marcadores.reduce((m, x) => Math.max(m, x.id), 0) + 1;
  const adicionar = (nome: string, x: number, z: number, cor?: string) => {
    marcadores = [
      ...marcadores,
      {
        id: proximo++,
        nome,
        x,
        z,
        cor: cor ?? CORES_MARCADOR[(proximo - 2) % CORES_MARCADOR.length],
      },
    ].slice(-24);
  };
  const mapas = criarMapas(app, {
    posicao: () => {
      const p = cena.estado.posicao ?? [0, 0, 0];
      const r = cena.estado.rotacao ?? [0, 0];
      return { x: p[0], z: p[2], yaw: r[1] };
    },
    amostrar: (cx, cz) => cena.estado.mapaChunk!(cx, cz),
    marcadores: () => marcadores,
    adicionarMarcador: (nome) => {
      const p = cena.estado.posicao ?? [0, 0, 0];
      adicionar(nome, p[0], p[2]);
    },
    removerMarcador: (id) => {
      marcadores = marcadores.filter((m) => m.id !== id);
    },
    marcarAqui: () => marcarAqui(),
  });
  /** Marca a posição atual (tecla K ou botão "Marcar aqui" do mapa). */
  function marcarAqui(): void {
    const p = cena.estado.posicao ?? [0, 0, 0];
    adicionar(`Marco ${proximo}`, p[0], p[2]);
    mapas.atualizarLista();
    window.dispatchEvent(new CustomEvent('brumaluz:marcou'));
    notificar(`Marcador “Marco ${proximo - 1}” criado`);
  }
  window.addEventListener('brumaluz:morte', () => {
    const p = cena.estado.posicao ?? [0, 0, 0];
    marcadores = marcadores.filter((m) => m.nome !== 'Onde desmaiei');
    adicionar('Onde desmaiei', p[0], p[2], '#ff7a8a');
  });
  window.addEventListener('keydown', (e) => {
    if ((e.target as HTMLElement)?.closest?.('input, textarea') || e.repeat) return;
    if (document.querySelector('.entrada:not([hidden])')) return;
    if (e.code === 'Tab') {
      e.preventDefault();
      const aberto = mapas.alternarGrande();
      if (aberto) document.exitPointerLock?.();
    } else if (e.code === 'KeyK') {
      marcarAqui();
    } else if (e.code === 'Escape' && mapas.grandeAberto) {
      mapas.alternarGrande();
    }
  });
}

const TRONCOS = new Set<number>([
  Bloco.MADEIRA_RETORCIDA,
  Bloco.TRONCO_BETULA,
  Bloco.TRONCO_PINHO,
  Bloco.TRONCO_LANTERNA,
]);

function ligarDiario(app: HTMLElement, cena: ReturnType<typeof criarCena>): void {
  const estilo = document.createElement('style');
  estilo.textContent = CSS_DIARIO;
  document.head.appendChild(estilo);
  const diario = criarDiario(cena.extrasSalvos('diario'));
  cena.registrarSalvavel('diario', { salvar: () => diario.salvar() });
  const hud = document.querySelector<HTMLElement>('.hud') ?? app;
  const ui = criarUiDiario(app, hud, diario, {
    aoFechar: () => {
      if (document.querySelector('.entrada:not([hidden])') || document.body.dataset.overlay) return;
      travarPonteiro();
    },
  });
  const reg = (chave: string, qtd = 1) => {
    for (const m of diario.registrar(chave, qtd)) {
      notificar(`Conquista: ${m.titulo}`, 'trofeu');
    }
    ui.renderHud();
  };
  (window as unknown as { __diario?: unknown }).__diario = {
    registrar: reg,
    alternar: () => ui.alternar(),
  };
  cena.barramento.ouvir('quebra', (d) => {
    if (TRONCOS.has(d.bloco)) reg('quebrou:tronco');
    else if (d.bloco === Bloco.PEDRA_RACHADA) reg('quebrou:pedra');
  });
  cena.barramento.ouvir('colocacao', (d) => {
    reg('colocou');
    if (d.bloco === Bloco.TOCHA) reg('colocou:tocha');
  });
  const ouvir = (nome: string, f: (d: unknown) => void) =>
    window.addEventListener(`brumaluz:${nome}`, (e) => f((e as CustomEvent).detail));
  ouvir('fabricou', (id) => reg(`fabricou:${id}`));
  ouvir('fundiu', (p) => reg(`fundiu:${(p as { item: string }).item}`, (p as { qtd: number }).qtd));
  ouvir('coletou', (p) =>
    reg(`coletou:${(p as { item: string }).item}`, (p as { qtd: number }).qtd),
  );
  ouvir('comeu', () => reg('comeu'));
  ouvir('derrotou', (t) => reg(`derrotou:${t}`));
  ouvir('domou', () => reg('domou'));
  ouvir('mergulhou', () => reg('mergulhou'));
  ouvir('dormiu', () => reg('dormiu'));
  ouvir('marcou', () => reg('marcou'));
  ouvir('foto', () => reg('foto'));
  ouvir('trocou', (d) => {
    reg('trocou');
    reg(`trocou:${(d as { profissao: string }).profissao}`);
  });
  ouvir('povoado', () => reg('visitou:povoado'));
  let ultimoBioma = '';
  setInterval(() => {
    const b = cena.estado.biomaAtual;
    if (b && b !== ultimoBioma) {
      ultimoBioma = b;
      reg(`bioma:${b}`);
    }
  }, 2000);
  window.addEventListener('keydown', (e) => {
    if ((e.target as HTMLElement)?.closest?.('input, textarea') || e.repeat) return;
    if (document.querySelector('.entrada:not([hidden])')) return;
    if (e.code === 'KeyJ') {
      if (ui.alternar()) document.exitPointerLock?.();
    }
  });
}

function ligarControles(
  app: HTMLElement,
  cena: ReturnType<typeof criarCena>,
  hotbar: ReturnType<typeof criarHotbar>,
  config: ReturnType<typeof criarGerenciadorConfig>,
): void {
  const estilo = document.createElement('style');
  estilo.textContent = CSS_TOQUE;
  document.head.appendChild(estilo);
  const d = cena.estado.controleDireto!;
  const teclaDom = (code: string) => {
    if (code === 'Pausa') window.dispatchEvent(new CustomEvent('brumaluz:pausar'));
    else window.dispatchEvent(new KeyboardEvent('keydown', { code }));
  };
  const c = { ...d, teclaDom };
  bloquearZoomDoNavegador();
  const toque = criarToque(app, c);
  const ehToque = window.matchMedia?.('(pointer: coarse)').matches ?? false;
  let usouToque = false;
  const atualizarToque = () => {
    const naEntrada = !!document.querySelector('.entrada:not([hidden])');
    const modo = ehToque || usouToque;
    toque.mostrar(modo && !naEntrada && !document.body.dataset.overlay, modo);
  };
  window.addEventListener(
    'touchstart',
    () => {
      usouToque = true;
      atualizarToque();
    },
    { passive: true },
  );
  // reage a painéis (data-overlay) e à tela de título, sem polling
  new MutationObserver(atualizarToque).observe(document.body, {
    attributes: true,
    attributeFilter: ['data-overlay'],
  });
  const entrada = document.querySelector('.entrada');
  if (entrada) {
    new MutationObserver(atualizarToque).observe(entrada, {
      attributes: true,
      attributeFilter: ['hidden'],
    });
  }
  atualizarToque();
  ligarGamepad(c, (passo) => {
    if (passo > 0) hotbar.proximo();
    else hotbar.anterior();
    window.dispatchEvent(new CustomEvent('brumaluz:slot'));
  });
  window.addEventListener('gamepadconnected', () => notificar('Controle conectado', 'controle'));
  const legendas = criarLegendas(app);
  config.ouvir((cfg) => legendas.definir(cfg.legendas));
  window.addEventListener('brumaluz:legenda', (e) =>
    legendas.mostrar((e as CustomEvent<string>).detail),
  );
}
