import {
  criarPerfilCrianca,
  enfeitesDoNivel,
  nivelDaCrianca,
  type PerfilCrianca,
} from './personagem/almaCrianca';
import { EVENTO_BAU, EVENTO_LOJINHA, EVENTO_MISSOES, ligarAlmaUi } from './ui/alma';
import { ligarGuiaMissao, QUADRO_SVG } from './ui/alma/guia';
import { arte as arteAlma } from './ui/alma/arte';
import { EXTRAS_RODA } from './ui/menuRoda';
import { CATEGORIAS_PREMIUM, ganhoTemAlgo, mundoAlmaDoEstilo, nivelDoXp } from './jogo/alma';
import type { EventoNucleo } from './nucleo/protocolo';
import { medirJanela, tamanhoDoCanvas } from './ui/telaCheia';
import { manterTelaLigada } from './ui/telaLigada';
import { criarCena } from './render/cena';
import { criarHotbar } from './player/hotbar';
import { tocarSomInterface } from './audio/somInterface';
import { criarInterface, travarPonteiro } from './ui/interface';
import { modoToque } from './ui/pixicones';
import { armazemIndexedDB } from './jogo/indexeddb';
import { SEMENTE_PADRAO_MUNDO, criarRepositorioMundos, type MetaMundo } from './jogo/mundos';
import { CSS_INVENTARIO, criarInventarioUI } from './ui/inventario';
import { criarDicaMira } from './ui/dicaMira';
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
import { CSS_FOTO, criarPainelFoto, desenharMoldura } from './ui/foto';
import { CSS_MAPA, criarMapas } from './ui/mapa';
import { CSS_DIARIO, criarUiDiario } from './ui/diario';
import {
  CSS_TOQUE,
  criarLegendas,
  criarToque,
  ligarGamepad,
  bloquearZoomDoNavegador,
} from './ui/toque';
import { criarDiario, temObras } from './jogo/diario';
import { ativarTema } from './temas/ativar';
import { povoadoDoTema, tema } from './temas/ativo';
import { TEMA_PADRAO, temaExiste } from './temas';
import { limparRastrosDosTemas } from './personagem/rastros';
import { CORES_MARCADOR, type Marcador } from './jogo/mapa';
import type { DadosMundo } from './jogo/mundos';
import { normalizarCodigo } from './jogo/codigos';
import { definirEstiloMundo } from './world/chunk';
import type { BemVindo, ConexaoNuvem } from './cliente/conexaoNuvem';
import {
  criarMundoComAmigos,
  dadosDaSala,
  entrarNaSala,
  irParaSala,
  ligarAmigos,
  sugestaoDeApelido,
  levarMundoParaAmigos,
  pararMundoComAmigos,
} from './nuvem';
import {
  antesDeSair,
  falhouAoCarregar,
  liberarEngine,
  ligarSaida,
  navegar,
  tirarCarregando,
} from './pagina';
import { ligarContextoPerdido } from './render/contexto';
import { ehMundoNovo } from './ui/sugestaoFantasia';

/** Spec 016: aviso de uma vez só (os mundos de antes foram apagados), junto da boas-vindas. */
let avisoMundosNovos: string | null = null;

async function iniciar(app: HTMLElement): Promise<void> {
  registrarCatalogo();
  // spec 029: a página escondida de medida do WebGPU (só com ?medir=webgpu), pedaço à parte
  if (new URLSearchParams(location.search).get('medir') === 'webgpu')
    return (await import('./medida/webgpu')).medirWebGPU(app);
  const repo = criarRepositorioMundos(armazemIndexedDB());
  // spec 016 (decisão do dono, 11 nov 2026): os mundos de antes não abrem mais; apagados uma
  // vez só (o personagem e as preferências ficam). Falhando, o jogo segue com o que tiver.
  const apagados = await repo.prepararFormato().catch(() => 0);
  if (apagados > 0) avisoMundosNovos = 'Os mundos começaram de novo! Bora construir?';
  // spec 034: sem rastro do que saiu com os quatro temas (fantasias e lembranças do aparelho)
  try {
    limparRastrosDosTemas(window.localStorage, window.sessionStorage);
  } catch {
    // sem armazenamento: nada guardado para limpar
  }
  const params = new URLSearchParams(location.search);
  // mundo com amigos: ?sala=CÓDIGO (link, QR Code ou "Entrar com código")
  const sala = params.get('sala');
  let nuvem: { conexao: ConexaoNuvem; bv: BemVindo; novo: boolean } | undefined;
  let fecharTela: (() => void) | undefined;
  let mundo: MetaMundo | null = null;
  let dados: DadosMundo;
  if (sala) {
    const pedido = entrarNaSala(
      app,
      normalizarCodigo(sala) ?? sala,
      params.get('direto') === '1',
      repo,
    );
    // a tela da sala (cartão, apelido ou progresso) já está na frente: ela assume daqui
    tirarCarregando();
    const r = await pedido;
    if (!r) return;
    const d = dadosDaSala(r.bv);
    mundo = d.mundo;
    dados = d.dados;
    nuvem = { conexao: r.conexao, bv: r.bv, novo: params.get('novo') === '1' };
    fecharTela = r.fecharTela;
  } else {
    const pedido = params.get('mundo');
    mundo = pedido ? await repo.obter(pedido) : null;
    // um mundo que foi para a nuvem abre lá (sem internet, fica um do aparelho)
    // (é o mundo desta criança: entra direto, sem a prévia do link)
    if (mundo?.nuvem && navigator.onLine) return irParaSala(mundo.nuvem, false, true);
    if (!mundo) {
      const lista = await repo.listar();
      mundo =
        lista.find((m) => !m.nuvem) ??
        (await repo.criar('Meu primeiro mundo', SEMENTE_PADRAO_MUNDO, 'criativo', TEMA_PADRAO));
    }
    dados = await repo.carregar(mundo.id);
  }
  // o tema do mundo vale para a página inteira: aparência, nomes e terreno
  // ?tema=<id> mostra o mundo em outro tema sem salvar a troca (prévia e capturas)
  const temaPrevia = params.get('tema');
  const emPrevia =
    !nuvem &&
    !!temaPrevia &&
    temaExiste(temaPrevia) &&
    temaPrevia !== (mundo.tema ?? TEMA_PADRAO);
  const temaMundo = ativarTema(emPrevia ? temaPrevia : mundo.tema);
  // na nuvem o terreno segue o estilo gravado com o mundo (igual ao do servidor)
  if (nuvem) definirEstiloMundo(nuvem.bv.mundo.estilo);
  if (mundo.tema && !temaExiste(mundo.tema))
    setTimeout(() => notificar(`Tema desconhecido: este mundo abriu como ${temaMundo.nome}`), 1500);

  const canvas = document.createElement('canvas');
  canvas.id = 'cena';
  // fixo no canto e do tamanho da janela (como app no iPhone, da tela toda: sem a faixa azul
  // embaixo; ver tamanhoDoCanvas)
  canvas.style.position = 'fixed';
  canvas.style.left = '0';
  canvas.style.top = '0';
  canvas.style.width = '100vw';
  canvas.style.height = '100vh';
  canvas.style.display = 'block';
  canvas.style.outline = 'none';
  const ajustarCanvas = () => {
    const { largura, altura } = tamanhoDoCanvas(medirJanela());
    canvas.style.width = `${largura}px`;
    canvas.style.height = `${altura}px`;
  };
  ajustarCanvas();
  // antes do resize do motor (ouvido depois, na cena): ele lê o tamanho novo do canvas
  window.addEventListener('resize', ajustarCanvas);
  // o iPhone às vezes só acerta o tamanho um pouco depois de girar
  window.addEventListener('orientationchange', () =>
    setTimeout(() => window.dispatchEvent(new Event('resize')), 300),
  );
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
  // spec 017: mundo recém-criado aqui (no aparelho ou na nuvem) sugere a fantasia do tema
  let mundoNovo: { id: string } | undefined;
  if (!nuvem) {
    if (ehMundoNovo(armazenamento, atual.id)) mundoNovo = { id: atual.id };
  } else if (nuvem.novo) {
    const codigo = normalizarCodigo(nuvem.bv.sala.codigo);
    const local = (await repo.listar()).find(
      (m) => m.nuvem && normalizarCodigo(m.nuvem) === codigo,
    );
    if (local && ehMundoNovo(armazenamento, local.id)) mundoNovo = { id: local.id };
  }
  const ui = criarInterface(app, hotbar, {
    repo,
    mundo: atual,
    mundoNovo,
    config,
    salvar: () => cena?.salvar() ?? Promise.resolve(false),
    criarComAmigos: async (meta, apelido) => {
      await cena?.salvar();
      await criarMundoComAmigos(repo, meta, apelido);
    },
    sugestaoApelido: (tema) => sugestaoDeApelido(tema),
    levarParaAmigos: async (meta) => {
      // o mundo aberto agora: grava o que está na tela antes de levar
      if (meta.id === atual.id) await cena?.salvar();
      await levarMundoParaAmigos(repo, meta);
    },
    pararComAmigos: (meta) => pararMundoComAmigos(repo, meta),
    abrirMundo: async (id) => {
      await cena?.salvar();
      const url = new URL(location.href);
      url.searchParams.set('mundo', id);
      // a prévia de tema vale só para esta página
      url.searchParams.delete('tema');
      navegar(url.toString());
    },
  });
  criarDicaMira();
  // esboços da spec 014 (só com ?esboco=cidade ou ?esboco=veiculos): pedaços à parte, o jogo
  // nunca os carrega
  const esboco = params.get('esboco');
  if (esboco === 'cidade' || esboco === 'veiculos') {
    (await import('./esboco/cidade')).prepararEsbocoCidade();
    if (esboco === 'veiculos') (await import('./esboco/veiculos')).prepararEsbocoVeiculos();
  }
  // esboço da spec 021 (só com ?esboco=amigos): pedaço à parte, o jogo nunca o carrega
  if (esboco === 'amigos') (await import('./esboco/amigos')).prepararEsbocoAmigos();
  // esboço 014d (só com ?esboco=estetica): a estética firme dos veículos ao lado da de hoje
  if (esboco === 'estetica') (await import('./esboco/veiculosEstetica')).prepararEsbocoEstetica();
  // spec 023 (T14): a lojinha premium na roda do menu, de qualquer mundo (a roda é montada
  // com a cena; a alma, que abre a lojinha, vem depois e ouve o pedido)
  // spec 030: o quadro de missões (só onde há missões) e o baú moram na roda do menu
  if (mundoAlmaDoEstilo(temaMundo.mundo) && !EXTRAS_RODA.some((x) => x.id === 'missoes'))
    EXTRAS_RODA.push({
      id: 'missoes',
      nome: 'Missões',
      icone: QUADRO_SVG,
      aoEscolher: () => window.dispatchEvent(new CustomEvent(EVENTO_MISSOES)),
    });
  if (!EXTRAS_RODA.some((x) => x.id === 'bau'))
    EXTRAS_RODA.push({
      id: 'bau',
      nome: 'Baú',
      icone: arteAlma('bau'),
      aoEscolher: () => window.dispatchEvent(new CustomEvent(EVENTO_BAU)),
    });
  if (!EXTRAS_RODA.some((x) => x.id === 'lojinha'))
    EXTRAS_RODA.push({
      id: 'lojinha',
      nome: 'Lojinha',
      icone: arteAlma('vitrine'),
      aoEscolher: () => window.dispatchEvent(new CustomEvent(EVENTO_LOJINHA)),
    });
  // spec 026 (dono, 16 nov 2026): "Tirar patins" na roda, só enquanto a criança está de patins
  // (longe do suporte do rinque ela tira aqui; calçar é só no suporte)
  if (temaMundo.id === 'vila-neon' && !EXTRAS_RODA.some((x) => x.id === 'tirar-patins'))
    EXTRAS_RODA.push({
      id: 'tirar-patins',
      nome: 'Tirar patins',
      icone: arteAlma('tirarPatins'),
      visivel: () => !!window.__brumaluz?.personagem?.aparencia().patins,
      semTela: true,
      aoEscolher: () => window.__brumaluz?.vilaPatins?.(false),
    });
  // spec 026 (parte 3): "Guardar skate" na roda, só enquanto a criança está de skate (como os
  // patins: longe do suporte da pista ela guarda aqui; pegar é só no suporte)
  if (temaMundo.id === 'vila-neon' && !EXTRAS_RODA.some((x) => x.id === 'guardar-skate'))
    EXTRAS_RODA.push({
      id: 'guardar-skate',
      nome: 'Guardar skate',
      icone: arteAlma('guardarSkate'),
      visivel: () => !!window.__brumaluz?.personagem?.aparencia().skate,
      semTela: true,
      aoEscolher: () => window.__brumaluz?.vilaSkate?.(false),
    });
  // spec 026 (parte 2): "Sair do brinquedo" na roda, só enquanto a criança está sentada num
  // brinquedo do parque (a mesma regra dos patins: o item só aparece quando serve)
  if (temaMundo.id === 'vila-neon' && !EXTRAS_RODA.some((x) => x.id === 'sair-brinquedo'))
    EXTRAS_RODA.push({
      id: 'sair-brinquedo',
      nome: 'Sair do brinquedo',
      icone: arteAlma('sairBrinquedo'),
      visivel: () => !!window.__brumaluz?.vilaParque?.sentado(),
      semTela: true,
      aoEscolher: () => window.__brumaluz?.vilaParque?.sair(),
    });
  // em prévia de outro tema nada é salvo: o mundo continua sendo do tema dele
  cena = criarCena(canvas, hotbar, {
    mundo: atual,
    dados,
    // na nuvem quem salva é o servidor; em prévia de outro tema, ninguém
    repo: emPrevia || nuvem ? undefined : repo,
    config,
    conexao: nuvem?.conexao,
    identidade: nuvem ? { voce: nuvem.bv.voce, donoDoMundo: nuvem.bv.sala.dono } : undefined,
  });
  // sair da página solta a placa de vídeo antes (no iPhone a página nova pode não ter memória)
  const engine = cena.engine;
  antesDeSair(() => liberarEngine(engine));
  // dentro do mundo a tela do celular não apaga sozinha (o aparelho não bloqueia no meio)
  antesDeSair(manterTelaLigada());
  ligarSaida();
  const cenaPronta = cena;
  ligarContextoPerdido(canvas, () => cenaPronta.salvar());
  ligarAmigos(app, cena, {
    repo,
    mundo: nuvem ? undefined : atual,
    nuvem,
    comecar: () => ui.entrarNoJogo(),
  });
  // mundo com amigos: quem entrou já tocou em "Entrar" (ou acabou de criar): sem tela de título
  if (nuvem) ui.comecarSemTitulo();
  if (fecharTela) {
    const pronto = cena;
    const esperar = () => (pronto.estado.ready ? fecharTela!() : setTimeout(esperar, 200));
    esperar();
  }
  if (emPrevia)
    setTimeout(() => notificar(`Prévia de ${temaMundo.nome}: nada deste passeio é salvo`), 1800);
  panorama(cena);
  ligarInventario(app, canvas, cena, hotbar);
  ligarStatus(app, canvas, cena);
  ligarFoto(app, cena);
  ligarMapas(app, cena);
  ligarDiario(app, cena);
  // spec 023: o perfil da criança soma o que o núcleo manda e o HUD mostra (na prévia de
  // outro tema o perfil vive só na página: nada é guardado)
  ligarAlma(emPrevia ? null : armazenamento, cena);
  ligarControles(app, cena, hotbar, config);
  // a tela de título (ou a da sala) já está montada: o "Carregando" do index.html some
  tirarCarregando();
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
if (app)
  iniciar(app).catch((e: unknown) => {
    console.error(e);
    // nunca a tela azul vazia: o "Carregando" vira o botão "Tentar de novo"
    falhouAoCarregar('Algo travou ao abrir o mundo. Toque no botão para tentar de novo.');
  });

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
    aoJogar: (p) => cena.estado.jogarItem?.(p.item, p.qtd, p.dur),
    aoFechar: () => {
      if (document.querySelector('.entrada:not([hidden])')) return;
      travarPonteiro(canvas);
    },
  });
  const criacao = criarCriacao(ui, hotbar.inventario, {
    criativo: () => cena.estado.modo === 'criativo',
    aoSobrar: (p) => {
      const j = cena.controle.jogador;
      cena.estado.soltarItem?.(p.item, p.qtd, j.x, j.y + 1.2, j.z, p.dur);
    },
    aoFabricar: (r) => {
      // a receita vai na mesma transação dos slots (a nuvem confere a conta dos itens)
      cena.registrarFabricacao(r.id);
      tocarSomInterface('criar');
      // o aviso sai depois que o resultado chega à mão: quem ouve não pega a tela no meio
      queueMicrotask(() =>
        window.dispatchEvent(new CustomEvent('brumaluz:fabricou', { detail: r.id })),
      );
    },
  });
  // cursor (0) e grade (1..9) entram nas transações: nada duplica nem some numa recusa
  cena.definirTransito({
    tamanho: 10,
    ler: (i) => (i === 0 ? ui.cursor : criacao.lerGrade(i - 1)),
    gravar: (i, p) => {
      if (i === 0) ui.cursor = p;
      else criacao.gravarGrade(i - 1, p);
    },
  });
  const painelBau = criarPainelBau(ui, hotbar.inventario);
  const painelFornalha = criarPainelFornalha(ui);
  // trocas: o núcleo confere e faz; a tela mostra o pedido e o inventário novo
  let moradorAtual = 0;
  const painelTrocas = criarPainelTrocas(ui, hotbar.inventario, {
    aviso: (t) => notificar(t, undefined, true),
    fazer: (profissao, t) => cena.trocar(moradorAtual, profissao, t.id),
  });
  window.addEventListener('brumaluz:trocar', (e) => {
    const d = (
      e as CustomEvent<{ profissao: Profissao; nome: string; criatura: number; titulo?: string }>
    ).detail;
    moradorAtual = d.criatura;
    abrirConteiner(() => painelTrocas.abrir(d.profissao, d.nome, d.titulo));
  });
  window.addEventListener('brumaluz:trocaRecusada', (e) => {
    if ((e as CustomEvent<string>).detail === 'faltam')
      notificar(povoadoDoTema().textos.faltam, undefined, true);
  });
  // por qualquer caminho (E, Esc, o X, tocar fora): a grade volta e o baú fecha
  ui.antesDeFechar(() => {
    criacao.devolver();
    painelBau.fechar();
    painelFornalha.fechar();
    painelTrocas.fechar();
    cena.fecharConteiner();
  });
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
    // o evento também serve a testes e atalhos: baú, fornalha e cama vão ao núcleo
    else cena.usarBloco(d.x, d.y, d.z);
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
    } else if (e.code === 'KeyQ' && !naEntrada && !document.body.dataset.overlay) {
      // Q joga um do item na mão; Ctrl+Q, a pilha toda (dar a um amigo, como no Minecraft)
      e.preventDefault();
      jogarDaBarra(hotbar.ativo, e.ctrlKey || e.metaKey ? Infinity : 1);
    }
  });
  // toque: segurar um espaço da barra joga um
  window.addEventListener('brumaluz:jogarDaBarra', (e) => {
    const d = (e as CustomEvent<{ slot: number; qtd: number }>).detail;
    if (!ui.aberto && !document.body.dataset.overlay) jogarDaBarra(d.slot, d.qtd);
  });
  /** Tira da barra e joga no chão, para a frente do boneco. */
  function jogarDaBarra(slot: number, quantos: number): void {
    const inv = hotbar.inventario;
    const p = inv.obter(slot);
    if (!p || cena.estado.sobrevivencia?.estado.morto) return;
    const qtd = Math.min(p.qtd, quantos);
    inv.definir(slot, p.qtd > qtd ? { ...p, qtd: p.qtd - qtd } : null);
    cena.estado.jogarItem?.(p.item, qtd, p.dur, slot);
  }
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
    if (avisoMundosNovos) notificar(avisoMundosNovos);
    avisoMundosNovos = null;
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
    capturar: (moldura) => {
      foto.capturar(moldura ? desenharMoldura : undefined);
      notificar('Foto salva', 'foto');
      window.dispatchEvent(new CustomEvent('brumaluz:foto'));
    },
    selfie: () => {
      foto.selfie();
    },
    // spec 023 (T09): a moldura de flores é o presente do nível 5
    temMoldura: () => nivelDaCrianca() >= 5,
    sair: () => alternar(),
  });
  // o painel e o HUD seguem o modo foto, ligado por onde for (tecla, botão ou depuração)
  foto.aoMudar((ativo) => {
    painel.mostrar(ativo, cena.estado.hora);
    if (ativo) document.body.dataset.overlay = 'foto';
    else if (document.body.dataset.overlay === 'foto') delete document.body.dataset.overlay;
  });
  function alternar(): void {
    foto.alternar();
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
    amigos: () => cena.estado.outrosJogadores?.() ?? [],
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

/**
 * Spec 023 (T02/T03): o perfil da criança no aparelho recebe só o que o núcleo mandou: o
 * ganho do evento `alma` (os presentes de nível saem do XP pela regra pura) e as fantasias de
 * prêmio (pelo mesmo caminho do prêmio do canteiro da 014). O HUD e as festas (fases
 * seguintes) ouvem `brumaluz:almaPerfil` ou `window.__almaCrianca.ouvir`.
 */
function ligarAlma(armazenamento: Storage | null, cena: ReturnType<typeof criarCena>): void {
  const perfil = criarPerfilCrianca(armazenamento);
  (window as unknown as { __almaCrianca?: PerfilCrianca }).__almaCrianca = perfil;
  // o HUD ouve o núcleo antes do perfil somar (a festa sabe qual missão acabou)
  const almaUi = ligarAlmaUi({
    perfil,
    // no corpo, como os botões da roda e da mochila (o .hud não recebe toque)
    raiz: document.body,
    fixar: (m) => cena.estado.alma?.fixar(m),
    comprarBanca: (item, saldo) => cena.estado.alma?.comprarBanca(item, saldo),
    aoFechar: () => {
      if (document.querySelector('.entrada:not([hidden])') || document.body.dataset.overlay) return;
      travarPonteiro();
    },
  });
  // spec 030: a trilha de pegadinhas até o lugar da missão, a placa e o convite
  const guiar = () =>
    cena.estado.ready && cena.estado.cenaBabylon
      ? ligarGuiaMissao(cena.estado, almaUi)
      : setTimeout(guiar, 300);
  guiar();
  // spec 023 (T10): o que a criança veste da lojinha vai na aparência (e pela rede, como a
  // fantasia: os amigos veem). Ao vestir, o puf de brilho. Ouve antes do aviso ao editor: o
  // editor tira a fantasia que brigaria com o tesouro e manda a aparência inteira depois.
  const vestirPremiumNoBoneco = (festa: boolean) => {
    const ps = cena.estado.personagem;
    if (!ps) return;
    const v = perfil.perfil.vestidos;
    const atual = ps.aparencia().premium ?? {};
    const igual = CATEGORIAS_PREMIUM.every((c) => v[c] === atual[c]);
    if (igual) return;
    ps.definir({ premium: Object.keys(v).length ? { ...v } : undefined });
    if (festa) ps.festaPremium?.();
  };
  vestirPremiumNoBoneco(false);
  perfil.ouvir((_p, aviso) => {
    if (aviso.tipo === 'premium') vestirPremiumNoBoneco(true);
  });
  perfil.ouvir((p, aviso) =>
    window.dispatchEvent(new CustomEvent('brumaluz:almaPerfil', { detail: { perfil: p, aviso } })),
  );
  // spec 023 (T09): os presentes de nível de verdade. A etiqueta e o balão vão na aparência
  // (os amigos veem); a roda de gestos, as tintas, a moldura e o troféu ouvem o nível.
  let nivelAntes = 0;
  const sincronizarNivel = () => {
    const nivel = nivelDoXp(perfil.perfil.xp).nivel;
    if (nivel === nivelAntes) return;
    nivelAntes = nivel;
    const enf = enfeitesDoNivel(nivel);
    const ps = cena.estado.personagem;
    const a = ps?.aparencia();
    if (ps && a && (a.etiqueta !== enf.etiqueta || a.balao !== enf.balao))
      ps.definir({ etiqueta: enf.etiqueta, balao: enf.balao });
    window.dispatchEvent(new CustomEvent('brumaluz:almaNivel', { detail: { nivel } }));
  };
  sincronizarNivel();
  perfil.ouvir(() => sincronizarNivel());
  window.addEventListener('brumaluz:alma', (ev) => {
    const e = (ev as CustomEvent<Extract<EventoNucleo, { e: 'alma' }>>).detail;
    if (!e || typeof e !== 'object') return;
    const fantasias = (e.missoes ?? []).flatMap((m) =>
      m.concluiu && m.fantasia ? [m.fantasia] : [],
    );
    if (e.ganho && (ganhoTemAlgo(e.ganho) || fantasias.length))
      perfil.aplicarGanho(e.ganho, fantasias);
    for (const id of fantasias)
      window.dispatchEvent(
        new CustomEvent('brumaluz:desbloqueio', { detail: { id, festa: true } }),
      );
  });
  // a banca: o aparelho só desconta depois que o núcleo entregou
  window.addEventListener('brumaluz:almaCompra', (ev) => {
    const e = (ev as CustomEvent<Extract<EventoNucleo, { e: 'almaCompra' }>>).detail;
    if (e && typeof e.preco === 'number') perfil.descontarBanca(e.item, e.preco);
  });
}

function ligarDiario(app: HTMLElement, cena: ReturnType<typeof criarCena>): void {
  const estilo = document.createElement('style');
  estilo.textContent = CSS_DIARIO;
  document.head.appendChild(estilo);
  const diario = criarDiario(cena.extrasSalvos('diario'), {
    primeiroCapitulo: tema().primeiroCapitulo,
    // spec 014: "Obras da cidade" só nos mundos da Cidade Grande
    obras: temObras(tema()),
  });
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
      tocarSomInterface('conquista');
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
  // roça (spec 013): contam quando o núcleo confirma
  ouvir('arou', () => reg('arou'));
  ouvir('plantou', () => reg('plantou'));
  ouvir('colheu', (d) => {
    if ((d as { madura: boolean }).madura) reg('colheu');
  });
  // criação (spec 013): deu comida e o bicho virou criado
  ouvir('criou', () => reg('criou'));
  // spec 014: obra do canteiro terminada. A obra é da cidade: quem estava perto festeja e
  // ganha a figurinha, tenha posto bloco ou não (o prêmio de ajudante vem em 'desbloqueio')
  ouvir('obra', (d) => {
    const o = d as { canteiro?: unknown; feita?: unknown };
    if (o?.feita === true && typeof o.canteiro === 'number') reg(`obra:${o.canteiro}`);
  });
  // a criatura da noite mansa (a coruja do Rancho) fugiu de perto: espantar conta como a
  // missão da criatura da noite (lá ela não se derrota, se espanta)
  ouvir('espantou', (t) => {
    reg(`espantou:${t}`);
    if (t === 'espectro') reg('derrotou:espectro');
  });
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
