/**
 * Spec 030 "Guia da missão", a ligação: a missão escolhida (a vista do núcleo) vira a trilha
 * de pegadinhas e a placa (`render/guiaMissao`); o "brincar" do quadro e o toque no selinho
 * acendem de novo (a ondinha forte e a virada macia); sem missão, depois de ~2 min brincando,
 * o selinho vira o convite (o baú com "?").
 */
import type { Scene } from '@babylonjs/core/scene';
import type { EstadoDepuracao } from '../../render/cena';
import { criarGuiaMissao, type ApiGuia, type GuiaMissao } from '../../render/guiaMissao';
import { criarRelogioConvite, CONVITE_S, type MundoDoGuia } from '../../jogo/guia';
import { Bloco } from '../../world/blocks';
import { celulaTomadaPelaVila } from '../../world/vilaSolidos';
import { CANTEIRO_BOLO } from '../../world/protecao';
import type { AlmaUi } from './index';
import { missaoFixada } from './hud';
import { criarMaoObra } from './maoObra';
import { missaoPorId, temMissaoNova } from '../../jogo/alma';
import { pedirSomGuia } from '../../audio/somGuia';
import { medirHud } from '../carinhasAmigos';
import { ligarCantoMissoes } from './canto';
import { ligarVilaNeon } from './vila';
import { ligarDicaComer } from './dicaComer';
import { FENO } from '../../jogo/exclusivos';
import { FENO_ANTIGO } from '../../jogo/missoesParque';

/** O quadro de cortiça com as duas missões (o ícone de "Missões" na roda do menu). */
export const QUADRO_SVG = `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <rect x="3" y="5" width="26" height="22" rx="3" fill="#e6b877" stroke="#5a3a22" stroke-width="2"/>
  <rect x="6" y="8" width="20" height="16" rx="1.5" fill="#f3d9a4"/>
  <rect x="7.5" y="10" width="7.5" height="9" rx="1.2" fill="#fffaf0" stroke="#5a3a22" stroke-width="1.3" transform="rotate(-6 11 14)"/>
  <rect x="17" y="10.5" width="7.5" height="9" rx="1.2" fill="#fffaf0" stroke="#5a3a22" stroke-width="1.3" transform="rotate(5 21 15)"/>
  <path d="M11.2 12.4 l0.9 1.9 2 .2 -1.5 1.3 .5 2 -1.9-1.1 -1.8 1.1 .4-2 -1.5-1.3 2-.2 z" fill="#ffc93d"/>
  <path d="M18.6 16 l2.4-2.2 2.4 2.2 v2.6 h-4.8 z" fill="#5fe3c4" stroke="#5a3a22" stroke-width="1"/>
  <circle cx="11" cy="9.6" r="1.4" fill="#e8402f"/><circle cx="21" cy="10" r="1.4" fill="#e8402f"/>
</svg>`;

const CERTO_SVG = `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <circle cx="32" cy="34" r="27" fill="#3a9a3a"/>
  <circle cx="32" cy="31" r="27" fill="#6fd35a" stroke="#5a3a22" stroke-width="3"/>
  <path d="M18 32 L28 42 L46 22" fill="none" stroke="#fff" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;
const CSS_CERTO = `
.guia-certo { position: fixed; z-index: 8; width: 64px; height: 64px; margin: -32px 0 0 -32px; pointer-events: none;
  filter: drop-shadow(0 6px 10px rgba(20, 40, 10, 0.35)); animation: guia-certo 1.5s ease-out forwards; }
.guia-certo svg { width: 100%; height: 100%; display: block; }
@keyframes guia-certo { 0% { transform: scale(0) rotate(-25deg); } 25% { transform: scale(1.15) rotate(0); }
  35% { transform: scale(1); } 75% { opacity: 1; transform: scale(1) translateY(-10px); } 100% { opacity: 0; transform: scale(0.8) translateY(-30px); } }
@media (prefers-reduced-motion: reduce) { .guia-certo { animation-duration: 2s; } }
`;

declare global {
  interface Window {
    /** Spec 030 (testes de tela): o guia da missão. */
    __guia?: ApiGuia & {
      conviteEm(s: number): void;
      convite(): { mostra: boolean; segundos: number };
      certos(): number;
      mao(): { x: number; y: number } | null;
      fantasmaDaMao(): { x: number; y: number; z: number } | null;
      motivoMao?(): string;
    };
  }
}

/** O jogo à vista (sem painel por cima, sem tela de entrada, sem modo foto)? */
function noJogo(): boolean {
  const b = document.body;
  return (
    !b.dataset.overlay &&
    !b.classList.contains('modo-foto') &&
    !b.classList.contains('tela-titulo') &&
    !document.querySelector('.entrada:not([hidden])')
  );
}

export function ligarGuiaMissao(e: EstadoDepuracao, ui: AlmaUi): GuiaMissao | null {
  const scene = e.cenaBabylon?.() as Scene | undefined;
  if (!scene) return null;
  // spec 032: "Toque para comer" com comida na mão (todos os mundos)
  ligarDicaComer(e, scene);
  const AR = Bloco.AR;
  const st = document.createElement('style');
  st.textContent = CSS_CERTO;
  document.head.appendChild(st);
  /** O aparelho tem a coluna? (o chão de baixo de tudo existe) */
  const temColuna = (x: number, z: number) =>
    (e.bloco?.(Math.floor(x), 0, Math.floor(z)) ?? AR) !== AR;
  /** Os blocos carregados (com as edições); longe, o terreno gerado. */
  const bloco = (x: number, y: number, z: number) =>
    temColuna(x, z) ? e.bloco!(x, y, z) : (e.blocoGerado?.(x, y, z) ?? AR);
  let sitios: { em: number; lista: ReturnType<NonNullable<EstadoDepuracao['sitios']>> } | null =
    null;
  const mundo: MundoDoGuia = {
    get cidade() {
      return e.cidade?.() ?? null;
    },
    get sitios() {
      // a lista dos sítios perto muda devagar: lida de novo a cada 5 s
      const agora = performance.now();
      if (!sitios || agora - sitios.em > 5000) sitios = { em: agora, lista: e.sitios?.() ?? [] };
      return sitios.lista;
    },
    bloco,
    moradores: () => (e.criaturas?.() ?? []).filter((c) => c.profissao),
    // spec 031: o canto das missões, os bichos do pasto e os ovinhos no chão
    canto: e.canto?.() ?? null,
    bichos: () => e.criaturas?.() ?? [],
    ovos: () => (e.itensNoChao?.() ?? []).filter((i) => i.item === 'ovo'),
    // spec 026: a Vila Neon (estojos, lhamas e o palco)
    vila: e.vila?.() ?? null,
    estadoVila: () => e.vilaEstado?.() ?? null,
    comFeno: () => {
      const inv = e.inventario;
      if (!inv) return false;
      // (parte 3B: o feno é item próprio; o trigo de um mundo salvo antes ainda vale)
      for (let i = 0; i < 36; i++) {
        const item = inv.obter(i)?.item;
        if (item === FENO || item === FENO_ANTIGO) return true;
      }
      return false;
    },
    // spec 026 (f4): de patins, o guia leva aos arcos do rinque; sem eles, ao suporte
    comPatins: () => !!e.personagem?.aparencia().patins,
    // parte 3B: o skate da f11, a fita da f9 e a vitamina da f12, o filme e o sofá
    comSkate: () => !!e.personagem?.aparencia().skate,
    tem: (item: string) => {
      const inv = e.inventario;
      if (!inv) return 0;
      let n = 0;
      for (let i = 0; i < 36; i++) {
        const s = inv.obter(i);
        if (s?.item === item) n += s.qtd;
      }
      return n;
    },
    tempoNucleo: () => e.vilaTempo?.() ?? e.vilaEstado?.()?.t ?? 0,
    pes: () => {
      const p = e.jogadorPes?.() ?? [0, 0, 0];
      return [p[0], p[1], p[2]] as const;
    },
  };
  const guia = criarGuiaMissao({
    scene,
    pes: () => {
      const p = e.jogadorPes?.() ?? [0, 0, 0];
      return [p[0], p[1], p[2]];
    },
    bloco,
    // spec 026: os carros, bancos e brinquedos da Vila Neon (a trilha dá a volta)
    peca: (x, y, z) => celulaTomadaPelaVila(mundo.vila ?? null, x, y, z),
    conhecido: () => true,
    mundo: () => mundo,
    tela: (x, y, z) => e.telaDoPonto?.(x, y, z) ?? null,
    caixasHud: () => medirHud(),
    camera: {
      olhar: () => (e.rotacao ? { pitch: e.rotacao[0], yaw: e.rotacao[1] } : null),
      apontar: (yaw, pitch) => (e.camera?.virar ?? e.apontar)?.(yaw, pitch),
      mexendo: () => e.camera?.mexendo?.() ?? false,
    },
    pode: noJogo,
  });

  // ---------------------------------------------------------------- a missão escolhida
  /** O "brincar" pediu a trilha desta missão: acende com a virada quando o núcleo confirmar. */
  let pedida: string | null = null;
  const sincronizar = () => {
    const c = missaoFixada(ui.vista());
    const vistos = new Set(c?.usos ?? []);
    guia.definir(c?.m ?? null, vistos);
    if (c && pedida === c.m.id) {
      pedida = null;
      guia.chamar();
      pedirSomGuia('trilha');
    }
  };
  // ---------------------------------------------------------------- chegar, o ✓ e as moedinhas
  const mao = criarMaoObra(e, scene);
  /** Onde o lugar estava na tela por último (o carimbo e as moedinhas saem dali). */
  let ultimaTela: { x: number; y: number } | null = null;
  /** Onde cada missão acabou (as moedinhas da festa saem dali). */
  const ondeAcabou = new Map<string, { x: number; y: number }>();
  ui.festas.definirOrigemMoedas((id) => ondeAcabou.get(id) ?? null);
  let chegouEm = -Infinity;
  guia.aoChegar((a) => {
    guia.brilhar(a);
    chegouEm = performance.now();
    pedirSomGuia('chegou');
  });
  /** O que andou de cada missão (o núcleo manda o número; o ✓ é quando ele sobe). */
  const feitoAntes = new Map<string, number>();
  ui.aoMudarVista((ev) => {
    const fixada = missaoFixada(ui.vista())?.m.id ?? guia.api.missao();
    for (const mv of ev.missoes ?? []) {
      if (mv.pulou) continue;
      const m = missaoPorId(mv.id);
      const antes = feitoAntes.get(mv.id) ?? mv.feito;
      if (mv.id !== fixada && mv.id !== guia.api.missao()) continue;
      const tela = guia.telaDoAlvo() ?? ultimaTela;
      if (mv.concluiu) {
        ondeAcabou.set(mv.id, tela ?? { x: innerWidth / 2, y: innerHeight * 0.4 });
        // o último lugar também ganha o ✓ (a festa vem logo depois)
        if (m && m.conta.tipo !== 'obra') carimbar(tela);
        continue;
      }
      // a obra tem o plim de cada bloco (014): o ✓ é dos outros
      if (!m || m.conta.tipo === 'obra' || !(mv.feito > antes)) continue;
      carimbar(tela);
    }
    lembrarFeito();
    sincronizar();
  });
  /** O que cada missão aberta já andou (o próximo evento compara com isto). */
  function lembrarFeito(): void {
    for (const a of ui.vista()?.abertas ?? []) feitoAntes.set(a.id, a.feito);
  }
  lembrarFeito();
  ui.aoBrincar((id) => {
    pedida = id;
    // a mesma missão de novo (já era a fixada): o núcleo não manda nada novo
    if (missaoFixada(ui.vista())?.m.id === id) sincronizar();
  });
  ui.aoTocarSelo(() => {
    guia.chamar();
    pedirSomGuia('trilha');
  });
  // o selinho mostra o mesmo desenho da placa (o lugar de agora)
  guia.aoTrocarFigura((fig) => ui.hud.figuraDoSelo(fig));
  sincronizar();

  // ---------------------------------------------------------------- o convite
  let limite = CONVITE_S;
  let relogio = criarRelogioConvite(limite);
  let ultimo = 0;
  let mostra = false;
  scene.onBeforeRenderObservable.add(() => {
    const t = performance.now() / 1000;
    const dt = ultimo ? t - ultimo : 0;
    ultimo = t;
    const v = ui.vista();
    if (!v) return;
    ultimaTela = guia.telaDoAlvo() ?? ultimaTela;
    // a mãozinha só na obra, com a criança dentro do canteiro
    const a = guia.alvo();
    // spec 031: e na mesa do bolo do Doce Reino (os fantasmas do bolo são do mesmo jeito)
    mao.definir(
      a && a.tipo === 'obra' && guia.chegou()
        ? Number(a.chave.slice('canteiro:'.length))
        : a?.chave === 'mesa' && guia.chegou()
          ? CANTEIRO_BOLO
          : null,
    );
    // (só convida para missão que a criança ainda não fez: com tudo feito, não oferece nada)
    const r = relogio.passo(dt, {
      missao: !!missaoFixada(v),
      noJogo: noJogo(),
      nova: temMissaoNova(v),
    });
    if (r.mostra !== mostra || r.acendeu) ui.hud.definirConvite(r.mostra, r.acendeu);
    mostra = r.mostra;
  });

  /** O carimbo verde de "feito" pula no lugar (o ✓ que o núcleo confirmou) e some. */
  function carimbar(tela: { x: number; y: number } | null): void {
    const x = tela?.x ?? innerWidth / 2;
    const y = tela?.y ?? innerHeight * 0.4;
    const el = document.createElement('div');
    el.className = 'guia-certo';
    el.setAttribute('data-guia-certo', '');
    el.innerHTML = CERTO_SVG;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1500);
    certos++;
    // logo depois do "chegou", o tim-tim espera um tiquinho (os dois não se atropelam)
    const espera = Math.max(0, 450 - (performance.now() - chegouEm));
    setTimeout(() => pedirSomGuia('certo'), espera);
  }
  let certos = 0;

  window.__guia = Object.assign(guia.api, {
    certos: () => certos,
    mao: () => mao.tela(),
    fantasmaDaMao: () => mao.fantasma(),
    motivoMao: () => mao.motivo(),
    /** Testes e vídeos: o convite em s segundos (o relógio volta a zero). */
    conviteEm(s: number) {
      limite = s;
      relogio = criarRelogioConvite(limite);
    },
    convite: () => ({ mostra, segundos: relogio.segundos }),
  });
  // spec 031: o canto das missões da Era dos Dinos e do Doce Reino
  ligarCantoMissoes(e, ui, guia, scene);
  // spec 026: as caixas do palco, o toque no show e o feno na mão da Vila Neon
  ligarVilaNeon(e, ui, guia, scene);
  return guia;
}
